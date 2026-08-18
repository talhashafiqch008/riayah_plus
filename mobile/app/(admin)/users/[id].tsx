import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState } from '../../../components/ui';
import { AdminScreenHeader } from '../../../components/admin/AdminScreenHeader';
import { fetchAdminUser } from '../../../lib/api/admin';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="mb-3">
      <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">{label}</Text>
      <Text className="mt-0.5 text-sm text-stone-800">{value?.trim() || '—'}</Text>
    </View>
  );
}

export default function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => fetchAdminUser(id!),
    enabled: Boolean(id),
  });

  const u = (query.data ?? {}) as {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    isActive?: boolean;
    createdAt?: string;
    organizationId?: string | null;
    providerProfile?: { bio?: string; specialties?: string[] } | null;
    clientProfile?: { address?: string } | null;
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader title={u.name || 'User'} subtitle="Account detail" showBack />
      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load user"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
        >
          <Card>
            <Field label="Name" value={u.name} />
            <Field label="Email" value={u.email} />
            <Field label="Phone" value={u.phone} />
            <Field label="Role" value={u.role} />
            <Field label="Status" value={u.isActive === false ? 'Inactive' : 'Active'} />
            <Field
              label="Created"
              value={u.createdAt ? formatDateTime(u.createdAt) : null}
            />
            <Field label="Organization ID" value={u.organizationId} />
          </Card>

          {u.providerProfile ? (
            <Card className="mt-3">
              <Text className="mb-2 text-sm font-semibold text-stone-900">Provider profile</Text>
              <Field label="Bio" value={u.providerProfile.bio} />
              <Field
                label="Specialties"
                value={u.providerProfile.specialties?.join(', ')}
              />
            </Card>
          ) : null}

          {u.clientProfile ? (
            <Card className="mt-3">
              <Text className="mb-2 text-sm font-semibold text-stone-900">Client profile</Text>
              <Field label="Address" value={u.clientProfile.address} />
            </Card>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
