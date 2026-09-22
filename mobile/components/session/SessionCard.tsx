import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, StatusBadge } from '../ui';
import { formatTime } from '../../lib/format';

export interface SessionCardSession {
  id: string;
  scheduledAt: string;
  status: string;
  type?: string;
  serviceType?: string;
  providerName?: string;
  clientName?: string;
  provider?: { name?: string; avatar?: string };
  client?: { name?: string };
  notes?: string;
}

interface SessionCardProps {
  session: SessionCardSession;
  onPress?: () => void;
  variant?: 'family' | 'staff';
}

export function SessionCard({ session, onPress, variant = 'family' }: SessionCardProps) {
  const { t } = useTranslation('common');

  const displayName =
    variant === 'staff'
      ? session.clientName ?? session.client?.name ?? t('sessionCard.client')
      : session.providerName ?? session.provider?.name ?? t('sessionCard.provider');

  const rawType = session.serviceType ?? session.type;
  const typeLabel = rawType
    ? t(`sessionType.${rawType}`, { defaultValue: rawType.replace(/_/g, ' ') })
    : t('sessionCard.session');

  const statusLabel = t(`sessionStatus.${session.status}`, {
    defaultValue: session.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  });

  return (
    <Card onPress={onPress} className="mb-2 mx-4" shadow>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wider text-teal-600">
            {formatTime(session.scheduledAt)}
          </Text>
          <Text className="mt-1 text-base font-semibold text-stone-900" numberOfLines={1}>
            {displayName}
          </Text>
          <Text className="mt-0.5 text-sm capitalize text-stone-400" numberOfLines={1}>
            {typeLabel}
          </Text>
          {session.notes ? (
            <Text className="mt-1 text-xs text-stone-300" numberOfLines={2}>
              {session.notes}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={session.status} label={statusLabel} />
      </View>
    </Card>
  );
}
