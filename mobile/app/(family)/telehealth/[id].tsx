// TODO: Family telehealth join — see M5_MOBILE_DESIGN_SPEC.md § 5.2 Telehealth
// Show waiting room UI while status=waiting
// On admit: join Daily.co room using room URL from API
// Daily.co React Native SDK: import { DailyProvider, useDaily } from '@daily-co/react-native-daily-js'
// Controls: mute mic, disable camera, leave call
// API: GET /api/sessions/:id/telehealth-token → { roomUrl, token }
import { View } from 'react-native';

export default function FamilyTelehealthScreen() {
  return <View />;
}
