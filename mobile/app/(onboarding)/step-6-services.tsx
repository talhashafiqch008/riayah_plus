import { Redirect } from 'expo-router';

/** Legacy clinical step — consent is now step-5. */
export default function Step6Redirect() {
  return <Redirect href="/(onboarding)/step-5-medical" />;
}
