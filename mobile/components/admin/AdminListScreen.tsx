import { useEffect, useState, type ReactNode } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, Input } from '../ui';
import { AdminScreenHeader } from './AdminScreenHeader';
import {
  ADMIN,
  AdminPressableCard,
  adminCardStyle,
} from './AdminChrome';
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

function SkeletonRow() {
  const shimmer = useSharedValue(0.4);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 750, easing: Easing.ease }),
        withTiming(0.4, { duration: 750, easing: Easing.ease }),
      ),
      -1,
      false,
    );
  }, [shimmer]);
  const style = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  return (
    <Animated.View
      style={[
        { height: 88, marginBottom: 12, ...adminCardStyle, backgroundColor: ADMIN.stone200 },
        style,
      ]}
    />
  );
}

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
        <View
          className="px-4 py-3"
          style={{ borderBottomWidth: 1, borderBottomColor: ADMIN.stone200, backgroundColor: ADMIN.white }}
        >
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Ionicons name="search-outline" size={18} color={ADMIN.stone400} />}
          />
        </View>
      ) : null}

      {query.isLoading ? (
        <View className="p-4">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
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
              tintColor={ADMIN.teal}
            />
          }
          ListHeaderComponent={
            rows.length > 0 ? (
              <Text
                className="mb-3 text-[10px] font-bold uppercase tracking-[2.5px] text-stone-400"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {rows.length} result{rows.length === 1 ? '' : 's'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState icon="file-tray-outline" title={emptyTitle} subtitle="Pull to refresh" />
          }
          renderItem={({ item }) => <View className="mb-3">{renderItem(item)}</View>}
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
  icon = 'document-outline',
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <AdminPressableCard onPress={onPress} style={{ padding: 16 }}>
      <View className="flex-row items-start gap-3">
        <View
          className="mt-0.5 h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: ADMIN.teal50 }}
        >
          <Ionicons name={icon} size={18} color={ADMIN.teal} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-stone-900" style={{ letterSpacing: -0.2 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-0.5 text-sm text-stone-500" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {meta ? <Text className="mt-1 text-xs text-stone-400">{meta}</Text> : null}
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={16} color="#D6D3D1" /> : null}
      </View>
    </AdminPressableCard>
  );
}
