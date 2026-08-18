import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { Button, Card, Chip, EmptyState, Input, ScreenHeader } from '../../../components/ui';
import { listOrgStaff, updateOrgStaff } from '../../../lib/api/org';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDate } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

export default function OrgStaffDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['org-staff'],
    queryFn: listOrgStaff,
  });

  const member = (query.data ?? []).find((s) => s.id === id);

  useEffect(() => {
    if (member) {
      setName(member.name ?? '');
      setPhone(member.phone ?? '');
    }
  }, [member]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('Missing staff member');
      if (!name.trim()) throw new Error('Name is required');
      return updateOrgStaff(id, {
        name: name.trim(),
        phone: phone.trim() || null,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['org-staff'] });
      toast.show('Staff updated', { type: 'success' });
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Update failed');
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
    },
  });

  const activeMutation = useMutation({
    mutationFn: () => {
      if (!id || !member) throw new Error('Missing staff member');
      return updateOrgStaff(id, { isActive: !member.isActive });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['org-staff'] });
      toast.show(member?.isActive ? 'Deactivated' : 'Activated', { type: 'success' });
    },
    onError: (e) => toastError(toast, e, 'Update failed'),
  });

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Staff" showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (!member) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Staff" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Staff member not found"
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={member.name || 'Staff'} showBack />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
        >
          <View className="mb-3 flex-row flex-wrap gap-2">
            <Chip label={member.role.replace(/_/g, ' ')} tone="sky" />
            <Chip
              label={member.isActive ? 'Active' : 'Inactive'}
              tone={member.isActive ? 'green' : 'stone'}
            />
            {member.mustSetPassword ? (
              <Chip label="Awaiting password setup" tone="amber" />
            ) : null}
          </View>
          {member.createdAt ? (
            <Text className="mb-4 text-sm text-stone-500">Joined {formatDate(member.createdAt)}</Text>
          ) : null}

          <Card className="p-5" shadow>
            <Text className="mb-3 text-sm font-semibold text-stone-900">Profile</Text>
            {formError ? (
              <View className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                <Text className="text-sm text-red-700">{formError}</Text>
              </View>
            ) : null}
            <View className="gap-3">
              <Input label="Name" value={name} onChangeText={setName} />
              <Input label="Email" value={member.email} editable={false} />
              <Input
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Button isLoading={saveMutation.isPending} onPress={() => saveMutation.mutate()}>
                Save
              </Button>
              <Button
                variant="secondary"
                isLoading={activeMutation.isPending}
                onPress={() => activeMutation.mutate()}
              >
                {member.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
