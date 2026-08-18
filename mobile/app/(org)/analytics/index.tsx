// Org Admin — Analytics (org-scoped, mirrors /org/analytics on web)
// 4 dashboard tabs:
//   1. Care Outcomes: goal completion rate, episode close rate, patient satisfaction scores
//   2. Service Utilisation: sessions delivered vs booked, service type breakdown, no-show rate
//   3. Staff Performance: avg sessions per staff, check-in compliance %, late arrivals
//   4. Financial: revenue this month, outstanding invoices, avg invoice value
// Date range picker: This week | This month | Last 3 months | Custom
// All data scoped to organizationId of logged-in org admin
// API: GET /api/org/analytics/:tab?organizationId=:myOrgId&from=:date&to=:date
// Charts: react-native-chart-kit or Victory Native (horizontal bar + line charts)
import { View } from 'react-native';

export default function OrgAnalyticsScreen() {
  return <View />;
}
