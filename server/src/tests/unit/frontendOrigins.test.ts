import { isAllowedFrontendOrigin } from '../../utils/frontendOrigins';

describe('isAllowedFrontendOrigin', () => {
  it('accepts https localhost vite', () => {
    expect(isAllowedFrontendOrigin('https://localhost:5173/family/billing/abc')).toBe(true);
  });

  it('accepts LAN vite origin in development', () => {
    expect(isAllowedFrontendOrigin('https://192.168.18.150:5173/family/billing/abc')).toBe(true);
  });
});
