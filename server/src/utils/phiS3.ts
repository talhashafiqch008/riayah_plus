import { PutObjectCommand, type PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export type PhiS3Purpose = 'telehealth_recording' | 'chat_attachment' | 'invoice_pdf';

/** KMS key id/arn for PHI uploads; purpose-specific env with AWS_KMS_KEY_ID fallback. */
export function kmsKeyForPurpose(purpose: PhiS3Purpose): string {
  switch (purpose) {
    case 'telehealth_recording':
      return env.TELEHEALTH_RECORDING_KMS_KEY || env.AWS_KMS_KEY_ID;
    case 'chat_attachment':
      return env.CHAT_ATTACHMENT_KMS_KEY || env.AWS_KMS_KEY_ID;
    case 'invoice_pdf':
      return env.INVOICE_PDF_KMS_KEY || env.AWS_KMS_KEY_ID;
  }
}

export function isPhiS3Configured(): boolean {
  return Boolean(
    env.AWS_BUCKET?.trim() &&
      env.AWS_ACCESS_KEY_ID?.trim() &&
      env.AWS_SECRET_ACCESS_KEY?.trim(),
  );
}

export function isPhiKmsConfigured(): boolean {
  return Boolean(
    kmsKeyForPurpose('telehealth_recording').trim() &&
      kmsKeyForPurpose('chat_attachment').trim(),
  );
}

export function assertPhiS3UploadConfigured(context = 'PHI file storage'): void {
  if (!isPhiS3Configured()) {
    throw new AppError(`${context} is not configured (AWS credentials / bucket).`, 503);
  }
}

export function createPhiS3Client(): S3Client {
  return new S3Client({
    region: env.AWS_DEFAULT_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/** PutObject input with KMS SSE and private ACL for PHI-bearing objects. */
export function phiPutObjectInput(
  purpose: PhiS3Purpose,
  params: {
    key: string;
    body: PutObjectCommandInput['Body'];
    contentType: string;
    contentDisposition?: string;
  },
): PutObjectCommandInput {
  const kmsKey = kmsKeyForPurpose(purpose).trim();
  const input: PutObjectCommandInput = {
    Bucket: env.AWS_BUCKET,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    ACL: 'private',
    ServerSideEncryption: 'aws:kms',
  };
  if (params.contentDisposition) {
    input.ContentDisposition = params.contentDisposition;
  }
  if (kmsKey) {
    input.SSEKMSKeyId = kmsKey;
  }
  return input;
}

export async function putPhiObject(
  purpose: PhiS3Purpose,
  params: {
    key: string;
    body: PutObjectCommandInput['Body'];
    contentType: string;
    contentDisposition?: string;
  },
): Promise<void> {
  assertPhiS3UploadConfigured();
  const client = createPhiS3Client();
  await client.send(new PutObjectCommand(phiPutObjectInput(purpose, params)));
}
