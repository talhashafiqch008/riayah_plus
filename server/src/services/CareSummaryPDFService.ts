import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const s3 = new S3Client({ region: env.AWS_DEFAULT_REGION });

export class CareSummaryPDFService {
  static async generateForEpisode(episodeId: string): Promise<string> {
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
    await s3.send(new PutObjectCommand({
      Bucket: env.AWS_BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    }));

    const url = `https://${env.AWS_BUCKET}.s3.${env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;
    await prisma.careEpisode.update({ where: { id: episodeId }, data: { summaryPdfUrl: url } });

    return url;
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
      doc.fontSize(14).font('Helvetica-Bold').text('Patient Information', 50, 100);
      doc.fontSize(11).font('Helvetica')
        .text(`Name: ${episode.patient.name}`, 50, 122)
        .text(`Email: ${episode.patient.email}`, 50, 140)
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
