import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, Input } from '../ui';
import { AdminScreenHeader } from './AdminScreenHeader';
import { apiErrorMessage } from '../../lib/format';

type Props<T> = {
  title: string;
  subtitle?: string;
  queryKey: unknown[];
  queryFn: () => Promise<T[]>;
  searchPlaceholder?: string;
  filterItem?: (item: T, q: string) => boolean;
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  emptyTitle?: string;
};

export function AdminListScreen<T>({
  title,
  subtitle,
  queryKey,
  queryFn,
  searchPlaceholder,
  filterItem,
  keyExtractor,
  renderItem,
  emptyTitle = 'No results',
}: Props<T>) {
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey, queryFn });

  const rows = (query.data ?? []).filter((item) =>
    search.trim() && filterItem ? filterItem(item, search.trim().toLowerCase()) : true,
  );

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader title={title} subtitle={subtitle} />
      {searchPlaceholder ? (
        <View className="border-b border-stone-100 bg-white px-4 py-2">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ) : null}

      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
          ListEmptyComponent={
            <EmptyState icon="file-tray-outline" title={emptyTitle} subtitle="Pull to refresh" />
          }
          renderItem={({ item }) => <View className="mb-2">{renderItem(item)}</View>}
        />
      )}
    </SafeAreaView>
  );
}

export function AdminListRow({
  title,
  subtitle,
  meta,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
}) {
  return (
    <Card shadow={false} onPress={onPress}>
      <Text className="font-semibold text-stone-900">{title}</Text>
      {subtitle ? <Text className="mt-0.5 text-sm text-stone-500">{subtitle}</Text> : null}
      {meta ? <Text className="mt-1 text-xs text-stone-400">{meta}</Text> : null}
    </Card>
  );
}
