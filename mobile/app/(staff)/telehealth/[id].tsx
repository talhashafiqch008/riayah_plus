// TODO: Clinical staff telehealth — see M5_MOBILE_DESIGN_SPEC.md § 5.3 Telehealth
// Waiting room: list of waiting patients, Admit button per patient
// On admit: join Daily.co room
// Side panel (bottom sheet): patient's active care plan summary + prior session notes
// Session notes entry available during/after call
// Controls: mute, disable camera, leave call
// API: GET /api/sessions/:id/telehealth-token → { roomUrl, token }
//      POST /api/sessions/:id/admit { participantId }
import { View } from 'react-native';

export default function StaffTelehealthScreen() {
  return <View />;
}
