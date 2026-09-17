import PDFDocument from 'pdfkit';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  assertPhiS3UploadConfigured,
  createPhiS3Client,
  phiPutObjectInput,
} from '../utils/phiS3';

const SIGNED_URL_TTL_SECONDS = 300;

/** Extract S3 object key from a stored key or legacy public URL. */
export function careSummaryObjectKey(stored: string): string | null {
  const trimmed = stored.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('care-summaries/')) return trimmed;
  try {
    const url = new URL(trimmed);
    const path = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (path.startsWith('care-summaries/')) return path;
  } catch {
    // not a URL
  }
  return null;
}

export class CareSummaryPDFService {
  /** Upload privately via phiS3; persist the S3 key (never a public URL). */
  static async generateForEpisode(episodeId: string): Promise<string> {
    assertPhiS3UploadConfigured('Care summary PDF storage');

    const episode = await prisma.careEpisode.findUnique({
      where: { id: episodeId },
      include: {
        patient: { select: { name: true, email: true } },
        carePlans: { include: { goals: { select: { title: true, status: true } } }, orderBy: { version: 'asc' } },
        assessments: { orderBy: { createdAt: 'asc' } },
        coordinator: { select: { name: true, email: true } },
      },
    });
    if (!episode) throw new AppError('Care episode not found.', 404);

    const pdfBuffer = await CareSummaryPDFService.buildPDF(episode);

    const key = `care-summaries/${episodeId}-${uuidv4()}.pdf`;
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

    // AUTHZ-01: store key only — never a permanent public object URL
    await prisma.careEpisode.update({
      where: { id: episodeId },
      data: { summaryPdfUrl: key },
    });

    return key;
  }

  /** Return a short-lived signed GET URL for an existing care-summary object. */
  static async getSignedDownloadUrl(stored: string): Promise<string> {
    const key = careSummaryObjectKey(stored);
    if (!key) {
      throw new AppError('Care summary PDF is unavailable. Please regenerate.', 404);
    }
    assertPhiS3UploadConfigured('Care summary PDF storage');
    const s3 = createPhiS3Client();
    return getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
  }

  private static buildPDF(episode: {
    id: string;
    status: string;
    intakeSummary: Prisma.JsonValue | null;
    createdAt: Date;
    patient: { name: string; email: string };
    coordinator: { name: string; email: string } | null;
    carePlans: { id: string; title: string; goals: { title: string; status: string }[]; version: number; status: string }[];
    assessments: { id: string; type: string; notes: string | null; createdAt: Date }[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const teal = '#0d9488';

      // Header
      doc.rect(0, 0, doc.page.width, 80).fill(teal);
      doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('CARE EPISODE SUMMARY', 50, 24);
      doc.fontSize(10).font('Helvetica').text('Riayah Plus HealthOS', 50, 52);
      doc.fillColor('#000').moveDown(2);

      // Patient info
      const safeName = String(episode.patient.name || '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .slice(0, 120);
      const safeEmail = String(episode.patient.email || '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .slice(0, 160);
      doc.fontSize(14).font('Helvetica-Bold').text('Patient Information', 50, 100);
      doc.fontSize(11).font('Helvetica')
        .text(`Name: ${safeName}`, 50, 122)
        .text(`Email: ${safeEmail}`, 50, 140)
        .text(`Episode Status: ${episode.status}`, 50, 158)
        .text(`Created: ${episode.createdAt.toLocaleDateString('en-QA')}`, 50, 176);

      if (episode.coordinator) {
        doc.text(`Care Coordinator: ${episode.coordinator.name}`, 50, 194);
      }

      // Intake summary
      if (episode.intakeSummary) {
        doc.moveDown(1.5);
        doc.fontSize(14).font('Helvetica-Bold').text('Intake Summary');
        const summaryText = typeof episode.intakeSummary === 'string'
          ? episode.intakeSummary
          : JSON.stringify(episode.intakeSummary, null, 2);
        doc.fontSize(10).font('Helvetica').text(summaryText, { width: 500 });
      }

      // Assessments
      if (episode.assessments.length > 0) {
        doc.moveDown(1.5);
        doc.fontSize(14).font('Helvetica-Bold').text('Assessments');
        episode.assessments.forEach(a => {
          doc.fontSize(11).font('Helvetica-Bold').text(`• ${a.type}`, { continued: true });
          doc.font('Helvetica').text(` — ${a.createdAt.toLocaleDateString('en-QA')}`);
          if (a.notes) doc.fontSize(10).text(`  ${a.notes}`, { indent: 20 });
        });
      }

      // Care plans
      if (episode.carePlans.length > 0) {
        doc.moveDown(1.5);
        doc.fontSize(14).font('Helvetica-Bold').text('Care Plans');
        episode.carePlans.forEach(cp => {
          doc.fontSize(11).font('Helvetica-Bold').text(`v${cp.version}: ${cp.title ?? 'Care Plan'} (${cp.status})`);
          cp.goals.forEach(g => {
            doc.fontSize(10).font('Helvetica').text(`  ✓ ${g.title} — ${g.status}`, { indent: 20 });
          });
        });
      }

      // Footer
      const footerY = doc.page.height - 50;
      doc.rect(0, footerY, doc.page.width, 50).fill(teal);
      doc.fillColor('white').fontSize(9)
        .text(`Riayah Plus HealthOS | Confidential Care Document | Generated ${new Date().toLocaleDateString('en-QA')}`, 50, footerY + 18, {
          align: 'center', width: doc.page.width - 100,
        });

      doc.end();
    });
  }
}
