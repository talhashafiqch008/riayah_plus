import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RoleHeroIconButton, RoleTabHero } from '../shell/RoleChrome';
import { navBackIcon } from '../../lib/rtlIcons';

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
  const { t } = useTranslation('common');
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const shouldBack = showBack ?? canGoBack;

  const left = leftAction ?? (shouldBack
    ? { icon: navBackIcon(), onPress: () => router.back() }
    : undefined);

  const rightNode =
    rightAction && typeof rightAction === 'object' && 'icon' in rightAction ? (
      <RoleHeroIconButton
        icon={rightAction.icon}
        onPress={rightAction.onPress}
        accessibilityLabel={t('a11y.action')}
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
            accessibilityLabel={shouldBack ? t('a11y.back') : t('a11y.action')}
          />
        ) : undefined
      }
      right={rightNode}
    />
  );
}
