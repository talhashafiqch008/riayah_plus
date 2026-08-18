// TODO: Clinical staff patient list — clinical roles only (doctor, nurse, clinical_staff, etc.)
// Shows patients assigned to this clinician via EpisodeStaffAssignment
// Each row: patient avatar, name, age, active episode status, latest assessment date
// Tap → patients/[id].tsx
// API: GET /api/patients?assignedTo=me
import { View } from 'react-native';

export default function PatientListScreen() {
  return <View />;
}
