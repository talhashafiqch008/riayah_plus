/**
 * JWT previous-secret verify (zero-downtime rotation).
 * Runs in isolation by setting env before importing auth helpers.
 */
describe('JWT secret rotation window', () => {
  const OLD_ACCESS = 'old-access-secret-at-least-32-chars-long!!';
  const NEW_ACCESS = 'new-access-secret-at-least-32-chars-long!!';
  const OLD_REFRESH = 'old-refresh-secret-at-least-32-chars-lon';
  const NEW_REFRESH = 'new-refresh-secret-at-least-32-chars-lon';

  const prevEnv = { ...process.env };

  beforeAll(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
    process.env.JWT_ACCESS_SECRET = NEW_ACCESS;
    process.env.JWT_REFRESH_SECRET = NEW_REFRESH;
    process.env.JWT_ACCESS_SECRET_PREVIOUS = OLD_ACCESS;
    process.env.JWT_REFRESH_SECRET_PREVIOUS = OLD_REFRESH;
    process.env.JWT_ISSUER = 'riayah-plus';
    process.env.JWT_AUDIENCE = 'riayah-plus-api';
  });

  afterAll(() => {
    process.env = { ...prevEnv };
    jest.resetModules();
  });

  it('signs with current and verifies tokens signed with previous', async () => {
    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = OLD_ACCESS;
    process.env.JWT_REFRESH_SECRET = OLD_REFRESH;
    process.env.JWT_ACCESS_SECRET_PREVIOUS = '';
    process.env.JWT_REFRESH_SECRET_PREVIOUS = '';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let auth = require('../../middleware/auth') as typeof import('../../middleware/auth');
    const access = auth.generateAccessToken({
      userId: 'u1',
      role: 'family',
      email: 'a@b.com',
    });
    const refresh = auth.generateRefreshToken({ userId: 'u1' });

    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = NEW_ACCESS;
    process.env.JWT_REFRESH_SECRET = NEW_REFRESH;
    process.env.JWT_ACCESS_SECRET_PREVIOUS = OLD_ACCESS;
    process.env.JWT_REFRESH_SECRET_PREVIOUS = OLD_REFRESH;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    auth = require('../../middleware/auth') as typeof import('../../middleware/auth');

    expect(auth.verifyAccessToken(access).userId).toBe('u1');
    expect(auth.verifyRefreshToken(refresh).userId).toBe('u1');

    const nextAccess = auth.generateAccessToken({
      userId: 'u2',
      role: 'family',
      email: 'c@d.com',
    });
    expect(auth.verifyAccessToken(nextAccess).userId).toBe('u2');
  });
});
