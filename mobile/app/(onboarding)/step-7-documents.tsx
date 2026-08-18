import { Redirect } from 'expo-router';

/** Documents step removed from family care-request flow (matches web). */
export default function Step7Redirect() {
  return <Redirect href="/(onboarding)/step-5-medical" />;
}
