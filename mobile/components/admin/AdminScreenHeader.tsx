import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../ui';
import { useAdminDrawer } from '../../stores/adminDrawerStore';

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

/** Shared admin chrome: hamburger opens the single layout-level drawer. */
export function AdminScreenHeader({ title, subtitle, showBack, rightAction }: Props) {
  const openDrawer = useAdminDrawer((s) => s.openDrawer);

  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      showBack={showBack}
      leftAction={showBack ? undefined : { icon: 'menu', onPress: openDrawer }}
      rightAction={
        rightAction ?? {
          icon: 'notifications-outline',
          onPress: () => router.push('/(admin)/notifications'),
        }
      }
    />
  );
}

/** Compact menu button for screens that already use a custom header. */
export function AdminMenuButton() {
  const openDrawer = useAdminDrawer((s) => s.openDrawer);
  return (
    <Pressable onPress={openDrawer} hitSlop={12} className="p-1">
      <Ionicons name="menu" size={24} color="#57534E" />
    </Pressable>
  );
}

export function AdminChrome({ children }: { children: ReactNode }) {
  return <View className="flex-1">{children}</View>;
}
