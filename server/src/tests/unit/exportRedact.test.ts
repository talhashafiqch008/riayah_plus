import { hashForeignUserId, redactBookingRows, redactMessageRows } from '../../utils/exportRedact';

describe('exportRedact', () => {
  const subject = 'user-subject';
  const requestId = 'export-req-1';

  it('hashes foreign user ids deterministically per export', () => {
    const a = hashForeignUserId('foreign-abc', requestId);
    const b = hashForeignUserId('foreign-abc', requestId);
    const c = hashForeignUserId('foreign-abc', 'other-export');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(16);
  });

  it('redacts booking party ids except the subject', () => {
    const rows = redactBookingRows(
      [{ clientId: subject, providerId: 'provider-99' }],
      subject,
      requestId,
    );
    expect(rows[0].clientId).toBe(subject);
    expect(rows[0].providerId).toMatch(/^user_[a-f0-9]{16}$/);
  });

  it('redacts message receiver ids except the subject', () => {
    const rows = redactMessageRows(
      [{ receiverId: 'peer-1' }, { receiverId: subject }],
      subject,
      requestId,
    );
    expect(rows[0].receiverId).toMatch(/^user_[a-f0-9]{16}$/);
    expect(rows[1].receiverId).toBe(subject);
  });
});
