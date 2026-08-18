import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ScreenHeader } from '../../components/ui';
import { getOrgDashboard } from '../../lib/api/org';
import { apiErrorMessage } from '../../lib/format';

const NEXT_STEPS = [
  'Assign coordinators to new families',
  'Invite clinical and support staff',
  'Route pending care requests',
];

const QUICK_LINKS = [
  {
    name: 'Pending requests',
    href: '/(org)/requests',
    hint: 'Route unassigned care requests',
    icon: 'file-tray-outline' as const,
  },
  {
    name: 'Families',
    href: '/(org)/families',
    hint: 'Assign a primary coordinator',
    icon: 'people-outline' as const,
  },
  {
    name: 'Coordinators',
    href: '/(org)/coordinators',
    hint: 'Invite and activate coordinators',
    icon: 'person-add-outline' as const,
  },
  {
    name: 'Staff',
    href: '/(org)/staff',
    hint: 'Invite clinical and support staff',
    icon: 'briefcase-outline' as const,
  },
] as const;

export default function OrgHomeScreen() {
  const query = useQuery({
    queryKey: ['org-dashboard'],
    queryFn: getOrgDashboard,
  });

  const stats = [
    { label: 'Families', value: query.data?.stats.families },
    { label: 'Coordinators', value: query.data?.stats.coordinators },
    { label: 'Pending requests', value: query.data?.stats.pendingIntakes },
  ];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Organization"
        showBack={false}
        rightAction={
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => router.push('/(org)/notifications')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color="#1C1917" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(org)/more')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="More"
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#1C1917" />
            </Pressable>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
            tintColor="#0D9488"
          />
        }
      >
        <View className="px-4 pt-2">
          <Text className="text-2xl font-semibold text-stone-900">Organization Dashboard</Text>
          <Text className="mt-2 text-stone-600">
            Manage families linked to your organization, invite coordinators and clinical staff, and
            route care requests.
          </Text>
        </View>

        <View className="mt-6 flex-row gap-3 px-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="flex-1 p-4">
              <Text className="text-xs text-stone-500">{stat.label}</Text>
              <Text className="mt-1 text-2xl font-semibold text-stone-900">
                {query.isLoading && query.data == null ? '…' : String(stat.value ?? '—')}
              </Text>
            </Card>
          ))}
        </View>

        {query.isError ? (
          <View className="mt-4 items-center px-4">
            <Text className="mb-2 text-center text-sm text-stone-500">
              {apiErrorMessage(query.error, 'Could not refresh stats')}
            </Text>
            <Button size="sm" variant="secondary" onPress={() => void query.refetch()}>
              Try again
            </Button>
          </View>
        ) : null}

        <View className="mt-8 px-4">
          <Card className="p-5">
            <Text className="mb-4 font-semibold text-stone-900">Suggested next steps</Text>
            <View className="gap-3">
              {NEXT_STEPS.map((step) => (
                <View key={step} className="flex-row items-start gap-2">
                  <Ionicons name="arrow-forward" size={16} color="#0D9488" />
                  <Text className="flex-1 text-sm text-stone-600">{step}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        <View className="mt-6 px-4">
          <Card className="p-5">
            <Text className="mb-4 font-semibold text-stone-900">Quick links</Text>
            <View className="gap-2">
              {QUICK_LINKS.map((link) => (
                <Pressable
                  key={link.href}
                  onPress={() => router.push(link.href as never)}
                  className="flex-row items-center justify-between rounded-xl border border-stone-100 px-4 py-3"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <Ionicons name={link.icon} size={20} color="#0D9488" />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-stone-800">{link.name}</Text>
                      <Text className="text-xs text-stone-500">{link.hint}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#0D9488" />
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        {query.isLoading && query.data == null ? (
          <ActivityIndicator size="large" color="#0D9488" className="mt-8" />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
