import { useMemo, useState } from 'react';
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
import { ToastProvider, useToast } from 'react-native-toast-notifications';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, EmptyState, Input, ScreenHeader } from '../../../components/ui';
import {
  createOrgStaff,
  listOrgStaff,
  ORG_STAFF_ROLE_OPTIONS,
  resendOrgStaffInvite,
  updateOrgStaff,
  type OrgStaff,
  type OrgStaffRole,
} from '../../../lib/api/org';
import { apiErrorMessage, formatDate } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

const ROLE_FILTERS = ['ALL', ...ORG_STAFF_ROLE_OPTIONS.map((r) => r.value.toUpperCase())] as const;

function splitName(name?: string): { firstName: string; lastName: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

function roleDisplay(role: string) {
  return role.replace(/_/g, ' ');
}

function InviteStaffForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<OrgStaffRole>('clinical_staff');
  const [formError, setFormError] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: () =>
      createOrgStaff({
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
      }),
    onSuccess: () => {
      setFormError(null);
      toast.show('Staff invited. Magic link email sent.', { type: 'success', duration: 4000 });
      onCreated();
      onClose();
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Failed to create staff member');
      setFormError(msg);
      toast.show(msg, { type: 'danger', duration: 5000 });
    },
  });

  const submit = () => {
    setFormError(null);
    if (!firstName.trim()) {
      const msg = 'First name is required';
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
      return;
    }
    if (!lastName.trim()) {
      const msg = 'Last name is required';
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
      return;
    }
    if (!email.trim()) {
      const msg = 'Email is required';
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
      return;
    }
    inviteMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-stone-100 px-4 py-3">
        <Text className="text-lg font-semibold text-stone-900">Add staff</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={24} color="#57534E" />
        </Pressable>
      </View>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {formError ? (
            <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <Text className="text-sm text-red-700">{formError}</Text>
            </View>
          ) : null}
          <View className="gap-3">
            <Input
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
            />
            <Input
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input
              label="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Text className="text-sm text-stone-700">Role</Text>
            <View className="flex-row flex-wrap gap-2">
              {ORG_STAFF_ROLE_OPTIONS.map((opt) => {
                const selected = role === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRole(opt.value)}
                    className={`rounded-xl border px-3 py-2 ${
                      selected ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        selected ? 'font-medium text-teal-700' : 'text-stone-600'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Button isLoading={inviteMutation.isPending} onPress={submit}>
              Send invite
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function OrgStaffScreen() {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['org-staff'],
    queryFn: listOrgStaff,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (query.data ?? []).filter((member) => {
      const { firstName: fn, lastName: ln } = splitName(member.name);
      const matchesSearch =
        !q ||
        fn.toLowerCase().includes(q) ||
        ln.toLowerCase().includes(q) ||
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || member.role.toUpperCase() === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [query.data, search, roleFilter]);

  const resend = async (id: string) => {
    setActionId(id);
    try {
      await resendOrgStaffInvite(id);
      toast.show('Invite resent', { type: 'success' });
    } catch (e) {
      toastError(toast, e, 'Resend failed');
    } finally {
      setActionId(null);
    }
  };

  const toggleActive = async (member: OrgStaff) => {
    setActionId(member.id);
    try {
      await updateOrgStaff(member.id, { isActive: !member.isActive });
      toast.show(member.isActive ? 'Staff deactivated' : 'Staff activated', { type: 'success' });
      await qc.invalidateQueries({ queryKey: ['org-staff'] });
    } catch (e) {
      toastError(toast, e, 'Update failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Staff"
        rightAction={
          <Pressable onPress={() => setModalOpen(true)} hitSlop={12} accessibilityRole="button">
            <Ionicons name="add" size={24} color="#0D9488" />
          </Pressable>
        }
      />

      <View className="border-b border-stone-100 bg-white px-4 pb-3">
        <Text className="mb-3 mt-3 text-sm text-stone-500">
          Manage clinical and support staff for your organization.
        </Text>
        <Input
          placeholder="Search staff…"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          leftIcon={<Ionicons name="search-outline" size={18} color="#A8A29E" />}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}
        >
          {ROLE_FILTERS.map((filter) => {
            const active = roleFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setRoleFilter(filter)}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                }`}
              >
                <Text
                  className={`text-sm capitalize ${
                    active ? 'font-medium text-teal-700' : 'text-stone-600'
                  }`}
                >
                  {filter === 'ALL' ? 'All' : roleDisplay(filter.toLowerCase())}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load staff"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No staff found"
              subtitle="Try adjusting your search or filters"
            />
          }
          renderItem={({ item }) => (
            <Card className="mb-3" shadow onPress={() => router.push(`/(org)/staff/${item.id}`)}>
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="font-semibold text-stone-900">
                    {item.name || item.email}
                  </Text>
                  <Text className="mt-0.5 text-sm text-stone-500">{item.email}</Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    <Chip label={roleDisplay(item.role)} tone="sky" />
                    <Chip
                      label={item.isActive ? 'Active' : 'Inactive'}
                      tone={item.isActive ? 'green' : 'stone'}
                    />
                    {item.mustSetPassword ? (
                      <Chip label="Awaiting password setup" tone="amber" />
                    ) : null}
                  </View>
                  {item.createdAt ? (
                    <Text className="mt-1 text-xs text-stone-400">
                      Joined {formatDate(item.createdAt)}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D6D3D1" />
              </View>
              <View className="mt-3 flex-row gap-2">
                {item.mustSetPassword ? (
                  <View className="flex-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actionId === item.id}
                      isLoading={actionId === item.id}
                      onPress={() => void resend(item.id)}
                    >
                      Resend invite
                    </Button>
                  </View>
                ) : null}
                <View className="flex-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionId === item.id}
                    isLoading={actionId === item.id}
                    onPress={() => void toggleActive(item)}
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <ToastProvider>
          <InviteStaffForm
            onClose={() => setModalOpen(false)}
            onCreated={() => void qc.invalidateQueries({ queryKey: ['org-staff'] })}
          />
        </ToastProvider>
      </Modal>
    </SafeAreaView>
  );
}
