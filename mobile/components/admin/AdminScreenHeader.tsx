import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AdminHero, AdminHeroIconButton } from './AdminChrome';

type Props = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  showBack?: boolean;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
};

/** Shared admin chrome: teal hero with menu (or back) and notifications. */
export function AdminScreenHeader({ title, subtitle, showBack, rightAction }: Props) {
  return (
    <AdminHero
      title={title}
      subtitle={subtitle}
      showBack={showBack}
      right={
        <AdminHeroIconButton
          icon={rightAction?.icon ?? 'notifications-outline'}
          accessibilityLabel={rightAction ? 'Action' : 'Notifications'}
          onPress={rightAction?.onPress ?? (() => router.push('/(admin)/notifications'))}
        />
      }
    />
  );
}
