import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { RoleHeroIconButton, RoleTabHero } from '../shell/RoleChrome';

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: Action;
  rightAction?: Action | ReactNode;
  showBack?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
  showBack,
}: ScreenHeaderProps) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const shouldBack = showBack ?? canGoBack;

  const left = leftAction ?? (shouldBack
    ? { icon: 'chevron-back' as const, onPress: () => router.back() }
    : undefined);

  const rightNode =
    rightAction && typeof rightAction === 'object' && 'icon' in rightAction ? (
      <RoleHeroIconButton
        icon={rightAction.icon}
        onPress={rightAction.onPress}
        accessibilityLabel="Action"
      />
    ) : (
      ((rightAction as ReactNode) ?? undefined)
    );

  return (
    <RoleTabHero
      title={title}
      subtitle={subtitle}
      left={
        left ? (
          <RoleHeroIconButton
            icon={left.icon}
            onPress={left.onPress}
            accessibilityLabel={shouldBack ? 'Back' : 'Action'}
          />
        ) : undefined
      }
      right={rightNode}
    />
  );
}
