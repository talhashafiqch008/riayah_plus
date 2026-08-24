import { paytabsQueryUrl } from '../../services/QatariPaymentService';

describe('paytabsQueryUrl', () => {
  it('maps the hosted-request URL to the query endpoint', () => {
    expect(paytabsQueryUrl('https://secure-doha.paytabs.com/payment/request')).toBe(
      'https://secure-doha.paytabs.com/payment/query',
    );
  });
});
