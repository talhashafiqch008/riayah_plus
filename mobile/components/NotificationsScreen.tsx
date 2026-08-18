import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { EmptyState, ScreenHeader } from './ui';
import { apiClient } from '../lib/api/client';
import { formatDate } from '../lib/format';
import { queryClient } from '../lib/query/client';

interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  message?: string | null;
  readAt?: string | null;
  createdAt: string;
}

function normalizeNotifications(payload: unknown): NotificationItem[] {
  if (Array.isArray(payload)) return payload as NotificationItem[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { notifications?: NotificationItem[]; data?: NotificationItem[] };
    if (Array.isArray(obj.notifications)) return obj.notifications;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

export function NotificationsScreen() {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/api/notifications');
      return normalizeNotifications(res.data.notifications ?? res.data);
    },
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Notifications" showBack={false} />
      {isLoading && items.length === 0 ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load"
          subtitle={(error as Error)?.message ?? 'Something went wrong'}
          action={{ label: 'Try again', onPress: () => void refetch() }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor="#0D9488"
            />
          }
          renderItem={({ item }) => {
            const unread = !item.readAt;
            const body = item.body ?? item.message ?? '';
            return (
              <Pressable
                onPress={() => {
                  if (unread) readMutation.mutate(item.id);
                }}
                className={`mx-4 mb-2 rounded-xl p-4 ${unread ? 'bg-teal-50' : 'bg-white'}`}
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className="mt-1 h-2 w-2 rounded-full"
                    style={{ backgroundColor: unread ? '#0D9488' : 'transparent' }}
                  />
                  <View className="flex-1">
                    <Text className="font-medium text-stone-900">{item.title}</Text>
                    {body ? (
                      <Text className="mt-0.5 text-sm text-stone-500">{body}</Text>
                    ) : null}
                    <Text className="mt-1 text-xs text-stone-300">
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title="All caught up"
              subtitle="No notifications yet."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
