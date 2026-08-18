// TODO: Assessment detail — clinical staff
// Shows: patient info, assessment date, structured metrics (to be defined per assessment type)
// Actions: Start Assessment (status → in_progress), Complete (status → completed), Submit Report
// Clinical notes entry (type: therapy_note, clinical_note, etc.)
// Evidence/report upload via expo-image-picker
// API: GET /api/assessments/:id
//      PATCH /api/assessments/:id { status }
//      POST /api/notes { assessmentId, type, content }
import { View } from 'react-native';

export default function AssessmentDetailScreen() {
  return <View />;
}
