import { phiPutObjectInput } from '../../utils/phiS3';

jest.mock('../../config/env', () => ({
  env: {
    AWS_BUCKET: 'test-bucket',
    AWS_KMS_KEY_ID: '',
    TELEHEALTH_RECORDING_KMS_KEY: 'arn:aws:kms:me-south-1:111:key/telehealth',
    CHAT_ATTACHMENT_KMS_KEY: 'arn:aws:kms:me-south-1:111:key/chat',
    INVOICE_PDF_KMS_KEY: 'arn:aws:kms:me-south-1:111:key/invoice',
  },
}));

describe('phiPutObjectInput', () => {
  it('sets KMS SSE, private ACL, and purpose-specific key', () => {
    const input = phiPutObjectInput('chat_attachment', {
      key: 'chat/c1/file.pdf',
      body: Buffer.from('x'),
      contentType: 'application/pdf',
      contentDisposition: 'attachment',
    });

    expect(input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'chat/c1/file.pdf',
      ACL: 'private',
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: 'arn:aws:kms:me-south-1:111:key/chat',
      ContentDisposition: 'attachment',
    });
  });

  it('falls back to AWS_KMS_KEY_ID when purpose key is unset', () => {
    jest.resetModules();
    jest.doMock('../../config/env', () => ({
      env: {
        AWS_BUCKET: 'b',
        AWS_KMS_KEY_ID: 'arn:aws:kms:default',
        TELEHEALTH_RECORDING_KMS_KEY: '',
        CHAT_ATTACHMENT_KMS_KEY: '',
        INVOICE_PDF_KMS_KEY: '',
      },
    }));
    const { phiPutObjectInput: build } = require('../../utils/phiS3');
    const input = build('invoice_pdf', {
      key: 'invoices/x.pdf',
      body: Buffer.from(''),
      contentType: 'application/pdf',
    });
    expect(input.SSEKMSKeyId).toBe('arn:aws:kms:default');
  });
});
