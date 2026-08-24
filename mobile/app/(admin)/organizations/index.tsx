import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast, ToastProvider } from 'react-native-toast-notifications';
import { Ionicons } from '@expo/vector-icons';
import { AdminListRow } from '../../../components/admin/AdminListScreen';
import { AdminScreenHeader } from '../../../components/admin/AdminScreenHeader';
import { Button, EmptyState, Input } from '../../../components/ui';
import {
  createAdminOrganization,
  fetchAdminOrganizations,
} from '../../../lib/api/admin';
import { apiErrorMessage } from '../../../lib/format';

type OrgRow = {
  id: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  _count?: { clinics?: number; users?: number };
};

function unwrap(payload: unknown): OrgRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const raw = p.data ?? p.organizations ?? p;
  return Array.isArray(raw) ? (raw as OrgRow[]) : [];
}

const emptyForm = {
  name: '',
  adminName: '',
  email: '',
  phone: '',
  address: '',
};

/** Must render under ToastProvider inside the Modal (root toasts sit behind Modals). */
function CreateOrgForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminOrganization({
        name: form.name.trim(),
        email: form.email.trim(),
        adminName: form.adminName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      }),
    onSuccess: () => {
      setFormError(null);
      toast.show('Organization created. Invite email sent to the org admin.', {
        type: 'success',
        duration: 4000,
      });
      setForm(emptyForm);
      onCreated();
      onClose();
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Could not create organization');
      setFormError(msg);
      toast.show(msg, { type: 'danger', duration: 5000 });
    },
  });

  const submitCreate = () => {
    setFormError(null);
    if (!form.name.trim()) {
      const msg = 'Name is required';
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
      return;
    }
    if (!form.email.trim()) {
      const msg = 'Admin email is required to invite the organization admin';
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
      return;
    }
    createMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-stone-100 px-4 py-3">
        <Text className="text-lg font-semibold text-stone-900">New organization</Text>
        <Pressable
          onPress={() => {
            setFormError(null);
            onClose();
          }}
          hitSlop={12}
        >
          <Ionicons name="close" size={24} color="#57534E" />
        </Pressable>
      </View>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-4 text-sm text-stone-500">
            Creates the org and invites an org admin by email (same as web admin).
          </Text>

          {formError ? (
            <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
              <Text className="text-sm font-medium text-red-700">{formError}</Text>
            </View>
          ) : null}

          <View className="gap-3">
            <Input
              label="Organization name"
              value={form.name}
              onChangeText={(name) => {
                setFormError(null);
                setForm((f) => ({ ...f, name }));
              }}
              placeholder="e.g. The General Hospital"
            />
            <Input
              label="Admin email"
              value={form.email}
              onChangeText={(email) => {
                setFormError(null);
                setForm((f) => ({ ...f, email: email.toLowerCase() }));
              }}
              placeholder="org-admin@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <Input
              label="Admin name (optional)"
              value={form.adminName}
              onChangeText={(adminName) => setForm((f) => ({ ...f, adminName }))}
              placeholder="Defaults to org name + Admin"
            />
            <Input
              label="Phone (optional)"
              value={form.phone}
              onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
              keyboardType="phone-pad"
            />
            <Input
              label="Address (optional)"
              value={form.address}
              onChangeText={(address) => setForm((f) => ({ ...f, address }))}
            />
          </View>
          <Button className="mt-6" isLoading={createMutation.isPending} onPress={submitCreate}>
            Create organization
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CreateOrgSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ToastProvider>
        <CreateOrgForm onClose={onClose} onCreated={onCreated} />
      </ToastProvider>
    </Modal>
  );
}

export default function AdminOrganizationsScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const query = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => unwrap(await fetchAdminOrganizations()),
  });

  const rows = (query.data ?? []).filter((o) =>
    search.trim()
      ? String(o.name ?? '').toLowerCase().includes(search.trim().toLowerCase())
      : true,
  );

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader
        title="Organizations"
        subtitle="Tenants & clinics"
        rightAction={{
          icon: 'add-circle-outline',
          onPress: () => setCreateOpen(true),
        }}
      />

      <View className="border-b border-stone-100 bg-white px-4 py-2">
        <Input
          placeholder="Search organizations…"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => setCreateOpen(true)}
          className="mt-2 flex-row items-center gap-2 py-1"
        >
          <Ionicons name="add" size={18} color="#0D9488" />
          <Text className="text-sm font-semibold text-teal-700">Add organization</Text>
        </Pressable>
      </View>

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
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title="No organizations"
              subtitle="Create one to get started"
            />
          }
          renderItem={({ item: o }) => (
            <View className="mb-2">
              <AdminListRow
                icon="business-outline"
                title={o.name || 'Organization'}
                subtitle={o.isActive === false ? 'Inactive' : 'Active'}
                meta={`${o._count?.clinics ?? 0} clinics · ${o._count?.users ?? 0} users`}
                onPress={() => router.push(`/(admin)/organizations/${o.id}`)}
              />
            </View>
          )}
        />
      )}

      <CreateOrgSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void qc.invalidateQueries({ queryKey: ['admin-organizations'] });
        }}
      />
    </SafeAreaView>
  );
}
