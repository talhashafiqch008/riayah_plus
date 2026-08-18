import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast, ToastProvider } from 'react-native-toast-notifications';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, EmptyState, Input } from '../../../components/ui';
import { AdminScreenHeader } from '../../../components/admin/AdminScreenHeader';
import {
  createAdminClinic,
  createAdminDepartment,
  fetchAdminOrganization,
  updateAdminOrganization,
} from '../../../lib/api/admin';
import { apiErrorMessage, normalizeEmail } from '../../../lib/format';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="mb-3">
      <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">{label}</Text>
      <Text className="mt-0.5 text-sm text-stone-800">{value?.trim() || '—'}</Text>
    </View>
  );
}

type Department = { id: string; name?: string; isActive?: boolean };
type Clinic = {
  id: string;
  name?: string;
  address?: string | null;
  phone?: string | null;
  _count?: { users?: number; departments?: number };
  departments?: Department[];
};

type Org = {
  id?: string;
  name?: string;
  slug?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string | null;
  isActive?: boolean;
  _count?: { clinics?: number; users?: number };
  clinics?: Clinic[];
};

type ModalState =
  | { type: 'org-edit' }
  | { type: 'clinic' }
  | { type: 'department'; clinicId: string; clinicName?: string }
  | null;

function SheetChrome({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between border-b border-stone-100 px-4 py-3">
          <Text className="text-lg font-semibold text-stone-900">{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color="#57534E" />
          </Pressable>
        </View>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ToastProvider>
  );
}

export default function AdminOrganizationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState<ModalState>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const query = useQuery({
    queryKey: ['admin-organization', id],
    queryFn: () => fetchAdminOrganization(id!),
    enabled: Boolean(id),
  });

  const org = (query.data ?? {}) as Org;

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['admin-organization', id] });
    await qc.invalidateQueries({ queryKey: ['admin-organizations'] });
  };

  const updateOrg = useMutation({
    mutationFn: () =>
      updateAdminOrganization(id!, {
        name: name.trim(),
        email: email.trim() ? normalizeEmail(email) : null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        website: website.trim() || null,
      }),
    onSuccess: async () => {
      setFormError(null);
      toast.show('Organization updated', { type: 'success' });
      setModal(null);
      await invalidate();
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Could not update organization');
      setFormError(msg);
      toast.show(msg, { type: 'danger', duration: 5000 });
    },
  });

  const createClinic = useMutation({
    mutationFn: () =>
      createAdminClinic(id!, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      }),
    onSuccess: async () => {
      setFormError(null);
      toast.show('Clinic created', { type: 'success' });
      setModal(null);
      await invalidate();
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Could not create clinic');
      setFormError(msg);
      toast.show(msg, { type: 'danger', duration: 5000 });
    },
  });

  const createDept = useMutation({
    mutationFn: (clinicId: string) =>
      createAdminDepartment(clinicId, { name: name.trim() }),
    onSuccess: async () => {
      setFormError(null);
      toast.show('Department created', { type: 'success' });
      setModal(null);
      await invalidate();
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Could not create department');
      setFormError(msg);
      toast.show(msg, { type: 'danger', duration: 5000 });
    },
  });

  const openOrgEdit = () => {
    setName(org.name ?? '');
    setEmail(org.email ?? '');
    setPhone(org.phone ?? '');
    setAddress(org.address ?? '');
    setWebsite(org.website ?? '');
    setFormError(null);
    setModal({ type: 'org-edit' });
  };

  const openClinic = () => {
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setWebsite('');
    setFormError(null);
    setModal({ type: 'clinic' });
  };

  const openDept = (clinic: Clinic) => {
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setWebsite('');
    setFormError(null);
    setModal({ type: 'department', clinicId: clinic.id, clinicName: clinic.name });
  };

  const saving = updateOrg.isPending || createClinic.isPending || createDept.isPending;

  const submit = () => {
    setFormError(null);
    if (!name.trim()) {
      const msg = 'Name is required';
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
      return;
    }
    if (modal?.type === 'org-edit') {
      updateOrg.mutate();
      return;
    }
    if (modal?.type === 'clinic') createClinic.mutate();
    if (modal?.type === 'department') createDept.mutate(modal.clinicId);
  };

  const clinics = useMemo(() => org.clinics ?? [], [org.clinics]);

  const sheetTitle =
    modal?.type === 'org-edit'
      ? 'Edit organization'
      : modal?.type === 'clinic'
        ? 'Add clinic'
        : 'Add department';

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader
        title={org.name || 'Organization'}
        subtitle="Tenant detail"
        showBack
        rightAction={{ icon: 'create-outline', onPress: openOrgEdit }}
      />
      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load organization"
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
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-stone-900">Details</Text>
              <Pressable onPress={openOrgEdit} className="flex-row items-center gap-1">
                <Ionicons name="pencil" size={16} color="#0D9488" />
                <Text className="text-sm font-semibold text-teal-700">Edit</Text>
              </Pressable>
            </View>
            <Field label="Name" value={org.name} />
            <Field label="Slug" value={org.slug} />
            <Field label="Email" value={org.email} />
            <Field label="Phone" value={org.phone} />
            <Field label="Address" value={org.address} />
            <Field label="Website" value={org.website} />
            <Field label="Status" value={org.isActive === false ? 'Inactive' : 'Active'} />
            <Field
              label="Totals"
              value={`${org._count?.clinics ?? clinics.length} clinics · ${org._count?.users ?? 0} users`}
            />
          </Card>

          <View className="mb-2 mt-5 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-stone-900">Clinics / Branches</Text>
            <Pressable onPress={openClinic} className="flex-row items-center gap-1">
              <Ionicons name="add" size={18} color="#0D9488" />
              <Text className="text-sm font-semibold text-teal-700">Add Clinic</Text>
            </Pressable>
          </View>

          {clinics.length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">
                No clinics yet. Add a branch to this organization.
              </Text>
            </Card>
          ) : (
            clinics.map((c) => {
              const isOpen = expanded[c.id] ?? true;
              return (
                <Card key={c.id} className="mb-2" shadow={false}>
                  <Pressable
                    onPress={() =>
                      setExpanded((prev) => ({ ...prev, [c.id]: !(prev[c.id] ?? true) }))
                    }
                    className="flex-row items-start justify-between gap-2"
                  >
                    <View className="flex-1">
                      <Text className="font-semibold text-stone-900">{c.name || 'Clinic'}</Text>
                      {c.address ? (
                        <Text className="mt-0.5 text-sm text-stone-500">{c.address}</Text>
                      ) : null}
                      <Text className="mt-1 text-xs text-stone-400">
                        {c._count?.departments ?? c.departments?.length ?? 0} departments ·{' '}
                        {c._count?.users ?? 0} users
                      </Text>
                    </View>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#A8A29E"
                    />
                  </Pressable>

                  {isOpen ? (
                    <View className="mt-3 border-t border-stone-100 pt-3">
                      <View className="mb-2 flex-row items-center justify-between">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                          Departments
                        </Text>
                        <Pressable
                          onPress={() => openDept(c)}
                          className="flex-row items-center gap-1"
                        >
                          <Ionicons name="add" size={16} color="#0D9488" />
                          <Text className="text-xs font-semibold text-teal-700">
                            Add Department
                          </Text>
                        </Pressable>
                      </View>
                      {(c.departments ?? []).length === 0 ? (
                        <Text className="text-sm text-stone-500">No departments.</Text>
                      ) : (
                        (c.departments ?? []).map((d) => (
                          <View
                            key={d.id}
                            className="mb-1 flex-row items-center justify-between rounded-lg bg-stone-50 px-3 py-2"
                          >
                            <Text className="text-sm text-stone-800">{d.name || 'Department'}</Text>
                            {d.isActive === false ? (
                              <Text className="text-xs text-stone-400">Inactive</Text>
                            ) : null}
                          </View>
                        ))
                      )}
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal
        visible={Boolean(modal)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModal(null)}
      >
        <SheetChrome title={sheetTitle} onClose={() => setModal(null)}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {modal?.type === 'department' ? (
              <Text className="mb-3 text-sm text-stone-500">
                Adding to {modal.clinicName || 'clinic'}
              </Text>
            ) : null}
            {formError ? (
              <View className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
                <Text className="text-sm font-medium text-red-700">{formError}</Text>
              </View>
            ) : null}
            <View className="gap-3">
              <Input
                label="Name"
                value={name}
                onChangeText={(v) => {
                  setFormError(null);
                  setName(v);
                }}
                placeholder={
                  modal?.type === 'clinic'
                    ? 'Main campus'
                    : modal?.type === 'department'
                      ? 'Physiotherapy'
                      : 'Organization name'
                }
              />
              {modal?.type === 'org-edit' ? (
                <>
                  <Input
                    label="Email"
                    value={email}
                    onChangeText={(v) => {
                      setFormError(null);
                      setEmail(v.toLowerCase());
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                  <Input
                    label="Phone (optional)"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                  <Input
                    label="Address (optional)"
                    value={address}
                    onChangeText={setAddress}
                  />
                  <Input
                    label="Website (optional)"
                    value={website}
                    onChangeText={setWebsite}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </>
              ) : null}
              {modal?.type === 'clinic' ? (
                <>
                  <Input
                    label="Phone (optional)"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                  <Input
                    label="Address (optional)"
                    value={address}
                    onChangeText={setAddress}
                  />
                </>
              ) : null}
            </View>
            <Button className="mt-6" isLoading={saving} onPress={submit}>
              {modal?.type === 'org-edit'
                ? 'Save changes'
                : modal?.type === 'clinic'
                  ? 'Create clinic'
                  : 'Create department'}
            </Button>
          </ScrollView>
        </SheetChrome>
      </Modal>
    </SafeAreaView>
  );
}
