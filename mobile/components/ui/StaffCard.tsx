import { Pressable, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { StatusBadge } from './StatusBadge';

interface StaffCardProps {
  name: string;
  role: string;
  avatarUrl?: string | null;
  status?: string;
  specialization?: string;
  onPress?: () => void;
}

export function StaffCard({
  name,
  role,
  avatarUrl,
  status,
  specialization,
  onPress,
}: StaffCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3"
    >
      <Avatar uri={avatarUrl} name={name} size="md" />
      <View className="flex-1">
        <Text className="font-medium text-stone-900" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-sm text-stone-400" numberOfLines={1}>
          {role}
          {specialization ? ` · ${specialization}` : ''}
        </Text>
      </View>
      {status ? <StatusBadge status={status} /> : null}
    </Pressable>
  );
}
