// TODO: Invoice detail + payment — see M5_MOBILE_DESIGN_SPEC.md § 5.2 Invoice Detail
// Shows: invoice lines (service, qty, rate, total), tax, grand total in QAR
// Status badge; if status=sent → show [Pay Now] button
// Pay Now: opens expo-web-browser with payment gateway URL from API
// API: GET /api/invoices/:id
//      POST /api/invoices/:id/pay → returns { paymentUrl }
//      Open paymentUrl with WebBrowser.openBrowserAsync()
import { View } from 'react-native';

export default function InvoiceDetailScreen() {
  return <View />;
}
