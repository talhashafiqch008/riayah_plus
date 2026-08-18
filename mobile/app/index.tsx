import { Redirect } from 'expo-router';
import {
  useAuthStore,
  FAMILY_ROLES,
  ORG_ADMIN_ROLES,
  PLATFORM_ADMIN_ROLES,
  COORDINATOR_ROLES,
  CLINICAL_ROLES,
  SUPPORT_ROLES,
} from '../stores/authStore';

export default function Index() {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Redirect href="/(auth)/login" />;

  const { role, careUnitId } = user;

  if (FAMILY_ROLES.includes(role)) {
    return (
      <Redirect href={careUnitId ? '/(family)' : '/(onboarding)/step-1-care-unit'} />
    );
  }
  if (PLATFORM_ADMIN_ROLES.includes(role)) {
    return <Redirect href="/(admin)" />;
  }
  if (ORG_ADMIN_ROLES.includes(role)) {
    return <Redirect href="/(org)" />;
  }
  if (COORDINATOR_ROLES.includes(role)) {
    return <Redirect href="/(coordinator)" />;
  }
  if (CLINICAL_ROLES.includes(role)) {
    return <Redirect href="/(clinical)" />;
  }
  if (SUPPORT_ROLES.includes(role)) {
    return <Redirect href="/(support)" />;
  }
  return <Redirect href="/(staff)" />;
}
