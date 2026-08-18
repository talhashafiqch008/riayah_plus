// TODO: Message thread — see M5_MOBILE_DESIGN_SPEC.md § 5.2 Messages
// Bubble layout: outgoing right (stone-100), incoming left (teal-600 white text)
// Input bar at bottom + send + attach (expo-image-picker)
// Polling every 10s or WebSocket if available
// API: GET /api/conversations/:id/messages
//      POST /api/conversations/:id/messages { content, attachmentId? }
import { View } from 'react-native';

export default function MessageThreadScreen() {
  return <View />;
}
