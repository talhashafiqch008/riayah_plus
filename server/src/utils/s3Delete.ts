import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { createPhiS3Client, isPhiS3Configured } from './phiS3';

/**
 * Best-effort S3 object delete for retention / account deletion (TM-012).
 * Logs failures; does not throw — caller decides whether to proceed with DB cleanup.
 */
export async function deleteS3ObjectBestEffort(
  key: string | null | undefined,
  context: Record<string, unknown>,
): Promise<boolean> {
  const objectKey = key?.trim();
  if (!objectKey || !env.AWS_BUCKET || !isPhiS3Configured()) return false;
  try {
    const s3 = createPhiS3Client();
    await s3.send(new DeleteObjectCommand({ Bucket: env.AWS_BUCKET, Key: objectKey }));
    return true;
  } catch (err) {
    logger.error('S3 DeleteObject failed', {
      ...context,
      key: objectKey,
      detail: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
