import { hashRefreshToken, isLegacyPlainRefreshToken } from '../../utils/refreshTokenHash';

describe('refreshTokenHash', () => {
  const sampleJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1MSIsImp0aSI6ImFiYyJ9.sig';

  it('produces a 64-char hex digest', () => {
    const hash = hashRefreshToken(sampleJwt);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain('.');
  });

  it('is deterministic for the same input', () => {
    expect(hashRefreshToken(sampleJwt)).toBe(hashRefreshToken(sampleJwt));
  });

  it('differs for different tokens', () => {
    expect(hashRefreshToken(sampleJwt)).not.toBe(hashRefreshToken(`${sampleJwt}x`));
  });

  it('detects legacy plain JWT rows', () => {
    expect(isLegacyPlainRefreshToken(sampleJwt)).toBe(true);
    expect(isLegacyPlainRefreshToken(hashRefreshToken(sampleJwt))).toBe(false);
  });
});
