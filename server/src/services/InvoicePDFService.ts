import PDFDocument from 'pdfkit';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  assertPhiS3UploadConfigured,
  createPhiS3Client,
  phiPutObjectInput,
} from '../utils/phiS3';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  serviceType?: string;
}

export class InvoicePDFService {
  /** Build PDF bytes without uploading (local / fallback). */
  static async generatePdfBuffer(invoiceId: string): Promise<Buffer> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: { select: { name: true, email: true } } },
    });
    if (!invoice) throw new AppError('Invoice not found.', 404);
    return InvoicePDFService.buildPDF(invoice);
  }

  static async generateAndUpload(invoiceId: string): Promise<string> {
    assertPhiS3UploadConfigured('PDF storage');

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: { select: { name: true, email: true } } },
    });
    if (!invoice) throw new AppError('Invoice not found.', 404);

    const pdfBuffer = await InvoicePDFService.buildPDF(invoice);

    const key = `invoices/${invoiceId}-${uuidv4()}.pdf`;
    const s3 = createPhiS3Client();
    await s3.send(
      new PutObjectCommand(
        phiPutObjectInput('invoice_pdf', {
          key,
          body: pdfBuffer,
          contentType: 'application/pdf',
        }),
      ),
    );

    const url = `https://${env.AWS_BUCKET}.s3.${env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;
    await prisma.invoice.update({ where: { id: invoiceId }, data: { pdfUrl: url } });

    return url;
  }

  private static buildPDF(invoice: {
    invoiceNumber: string;
    type: string;
    currency: string;
    subtotal: unknown;
    taxRate: unknown;
    taxAmount: unknown;
    total: unknown;
    notes: string | null;
    dueDate: Date | null;
    lineItems: unknown;
    createdAt: Date;
    client: { name: string; email: string };
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const teal = '#0d9488';
      const gray = '#6b7280';

      // ── Header ─────────────────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 90).fill(teal);
      doc.fillColor('white').fontSize(26).font('Helvetica-Bold').text('RIAYAH PLUS', 50, 28);
      doc.fontSize(11).font('Helvetica').text('Healthcare Operating System', 50, 58);
      doc.fillColor('#000').moveDown(2);

      // ── Invoice title & number ─────────────────────────────────────────────
      const title = invoice.type === 'quotation' ? 'QUOTATION' : 'INVOICE';
      doc.fontSize(20).font('Helvetica-Bold').text(title, 50, 110);
      doc.fontSize(11).font('Helvetica').fillColor(gray)
        .text(`${title} #: ${invoice.invoiceNumber}`, 50, 140)
        .text(`Date: ${invoice.createdAt.toLocaleDateString('en-QA')}`, 50, 158);

      if (invoice.dueDate) {
        doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString('en-QA')}`, 50, 176);
      }

      // ── Bill to ────────────────────────────────────────────────────────────
      doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('BILL TO', 350, 110);
      doc.fontSize(11).font('Helvetica').fillColor(gray)
        .text(invoice.client.name, 350, 130)
        .text(invoice.client.email, 350, 148);

      // ── Line items table ───────────────────────────────────────────────────
      const tableLeft = 50;
      const tableWidth = doc.page.width - 100;
      const colDescX = 58;
      const colDescWidth = 248;
      const colQtyX = 318;
      const colUnitX = 368;
      const colTotalX = 455;
      const rowPad = 8;
      const minRowHeight = 22;
      const footerReserve = 140;

      const drawTableHeader = (top: number) => {
        doc.fillColor(teal).rect(tableLeft, top, tableWidth, 24).fill();
        doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
          .text('Description', colDescX, top + 7, { width: colDescWidth })
          .text('Qty', colQtyX, top + 7, { width: 40, align: 'right' })
          .text('Unit Price', colUnitX, top + 7, { width: 80, align: 'right' })
          .text('Total', colTotalX, top + 7, { width: 80, align: 'right' });
        return top + 34;
      };

      let y = drawTableHeader(220);

      const lineItems = invoice.lineItems as LineItem[];

      lineItems.forEach((item, idx) => {
        const lineTotal = item.quantity * item.unitPrice;
        doc.fontSize(10).font('Helvetica');
        const descHeight = doc.heightOfString(item.description, {
          width: colDescWidth,
          lineGap: 2,
        });
        const rowHeight = Math.max(descHeight + rowPad, minRowHeight);

        if (y + rowHeight > doc.page.height - footerReserve) {
          doc.addPage();
          y = drawTableHeader(50);
        }

        const rowColor = idx % 2 === 0 ? '#f9fafb' : 'white';
        doc.fillColor(rowColor).rect(tableLeft, y, tableWidth, rowHeight).fill();

        doc.fillColor('#111').fontSize(10).font('Helvetica')
          .text(item.description, colDescX, y + 4, { width: colDescWidth, lineGap: 2 });

        const valueY = y + 4;
        doc.text(item.quantity.toString(), colQtyX, valueY, { width: 40, align: 'right' });
        doc.text(`${invoice.currency} ${item.unitPrice.toFixed(2)}`, colUnitX, valueY, {
          width: 80,
          align: 'right',
        });
        doc.text(`${invoice.currency} ${lineTotal.toFixed(2)}`, colTotalX, valueY, {
          width: 80,
          align: 'right',
        });

        y += rowHeight;
      });

      // ── Totals ─────────────────────────────────────────────────────────────
      y += 12;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke('#e5e7eb');
      y += 10;

      const subtotal = Number(invoice.subtotal);
      const taxRate = Number(invoice.taxRate);
      const taxAmount = Number(invoice.taxAmount);
      const total = Number(invoice.total);

      doc.fontSize(10).fillColor(gray)
        .text('Subtotal:', 370, y)
        .text(`${invoice.currency} ${subtotal.toFixed(2)}`, 460, y);
      y += 16;
      doc.text(`Tax (${(taxRate * 100).toFixed(0)}%):`, 370, y)
        .text(`${invoice.currency} ${taxAmount.toFixed(2)}`, 460, y);
      y += 16;

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000')
        .text('TOTAL:', 370, y)
        .text(`${invoice.currency} ${total.toFixed(2)}`, 460, y);

      // ── Notes ──────────────────────────────────────────────────────────────
      if (invoice.notes) {
        y += 40;
        doc.fontSize(10).font('Helvetica').fillColor(gray).text('Notes:', 50, y);
        doc.text(invoice.notes, 50, y + 16, { width: 460 });
      }

      // ── Footer ─────────────────────────────────────────────────────────────
      const footerY = doc.page.height - 60;
      doc.rect(0, footerY, doc.page.width, 60).fill(teal);
      doc.fillColor('white').fontSize(9)
        .text('Thank you for choosing Riayah Plus HealthOS', 50, footerY + 22, { align: 'center', width: doc.page.width - 100 })
        .text('support@riayahplus.com | www.riayahplus.com', 50, footerY + 38, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    });
  }
}
