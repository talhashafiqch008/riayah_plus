// TODO: Task list — see M5_MOBILE_DESIGN_SPEC.md § 5.3 Tasks
// Filter chips: All | Pending | Completed
// Each row: status circle, title, client name, due date
// Tap → @gorhom/bottom-sheet with full task detail + complete form
// Complete: requires evidence note; support workers may attach photo
// API: GET /api/tasks?assignee=me   PATCH /api/tasks/:id/status { status: 'completed', completionNote }
import { View } from 'react-native';

export default function StaffTasksScreen() {
  return <View />;
}
