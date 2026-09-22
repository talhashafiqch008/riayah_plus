import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  type UserRole,
  useAuthStore,
} from '../../stores/authStore';

type Props = {
  children: ReactNode;
  /** If set, user must hold one of these roles; otherwise redirect to login. */
  roles?: UserRole[];
};

/**
 * Group-level auth/role gate for deep-link and direct navigation (MOB-12).
 * Backend still re-authorizes every request; this prevents privileged UI shells
 * from mounting while unauthenticated or role-mismatched.
 */
export function RequireAuth({ children, roles }: Props) {
  const isLoading = useAuthStore((s) => s.isLoading);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  if (!token || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Redirect href="/(auth)/login" />;
  }

  return <>{children}</>;
}
