import { Redirect } from 'expo-router';

/** Superseded by the appointments list at /(family)/bookings. */
export default function LegacyBookScreen() {
  return <Redirect href="/(family)/bookings" />;
}
