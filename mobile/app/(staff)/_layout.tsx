import { Redirect } from 'expo-router';
import { CLINICAL_ROLES, SUPPORT_ROLES, useAuthStore } from '../../stores/authStore';

/** Old staff group — send clinical/support to their dedicated shells. */
export default function StaffRedirectLayout() {
  const user = useAuthStore((s) => s.user);
  if (user && CLINICAL_ROLES.includes(user.role)) {
    return <Redirect href="/(clinical)" />;
  }
  if (user && SUPPORT_ROLES.includes(user.role)) {
    return <Redirect href="/(support)" />;
  }
  return <Redirect href="/(auth)/login" />;
}
