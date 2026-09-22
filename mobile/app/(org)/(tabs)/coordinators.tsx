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
import { ToastProvider, useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, EmptyState, Input, ScreenHeader } from '../../../components/ui';
import {
  createOrgCoordinator,
  listOrgCoordinators,
  resendOrgCoordinatorInvite,
  updateOrgCoordinator,
  type OrgCoordinator,
} from '../../../lib/api/org';
import { apiErrorMessage } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

function InviteCoordinatorForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation('org');
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: () => createOrgCoordinator({ name: name.trim(), email: email.trim() }),
    onSuccess: () => {
      setFormError(null);
      toast.show(t('coordinators.invitedToast'), { type: 'success', duration: 4000 });
      setName('');
      setEmail('');
      onCreated();
      onClose();
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, t('coordinators.inviteFailed'));
      setFormError(msg);
      toast.show(msg, { type: 'danger', duration: 5000 });
    },
  });

  const submit = () => {
    setFormError(null);
    if (name.trim().length < 2) {
      const msg = t('mobile.coordinators.nameRequired');
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
      return;
    }
    if (!email.trim()) {
      const msg = t('mobile.coordinators.emailRequired');
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
      return;
    }
    inviteMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-stone-100 px-4 py-3">
        <Text className="text-lg font-semibold text-stone-900">{t('coordinators.inviteTitle')}</Text>
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
              label={t('coordinators.fullName')}
              value={name}
              onChangeText={setName}
              placeholder={t('coordinators.fullName')}
            />
            <Input
              label={t('coordinators.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('coordinators.email')}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button isLoading={inviteMutation.isPending} onPress={submit}>
              {t('coordinators.sendInvite')}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function OrgCoordinatorsScreen() {
  const { t } = useTranslation('org');
  const toast = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['org-coordinators'],
    queryFn: listOrgCoordinators,
  });

  const rows = query.data ?? [];

  const resend = async (id: string) => {
    setActionId(id);
    try {
      await resendOrgCoordinatorInvite(id);
      toast.show(t('coordinators.resentToast'), { type: 'success' });
    } catch (e) {
      toastError(toast, e, t('coordinators.resendFailed'));
    } finally {
      setActionId(null);
    }
  };

  const toggleActive = async (c: OrgCoordinator) => {
    setActionId(c.id);
    try {
      await updateOrgCoordinator(c.id, { isActive: !c.isActive });
      toast.show(
        c.isActive
          ? t('mobile.coordinators.deactivatedToast')
          : t('mobile.coordinators.activatedToast'),
        { type: 'success' },
      );
      await qc.invalidateQueries({ queryKey: ['org-coordinators'] });
      await qc.invalidateQueries({ queryKey: ['org-dashboard'] });
    } catch (e) {
      toastError(toast, e, t('coordinators.updateFailed'));
    } finally {
      setActionId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title={t('coordinators.title')}
        subtitle={t('mobile.coordinators.subtitle')}
        showBack={false}
        rightAction={{ icon: 'person-add-outline', onPress: () => setModalOpen(true) }}
      />

      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('mobile.coordinators.loadError')}
          subtitle={apiErrorMessage(query.error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
          ListHeaderComponent={
            <View className="mb-4">
              <Text className="text-sm text-stone-500">{t('coordinators.description')}</Text>
              <Button className="mt-3" onPress={() => setModalOpen(true)}>
                {t('coordinators.inviteTitle')}
              </Button>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="person-add-outline"
              title={t('mobile.coordinators.emptyTitle')}
              subtitle={t('mobile.coordinators.emptyHint')}
            />
          }
          renderItem={({ item }) => (
            <Card
              className="mb-3"
              shadow
              onPress={() => router.push(`/(org)/coordinators/${item.id}`)}
            >
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="font-semibold text-stone-900">{item.name}</Text>
                  <Text className="mt-0.5 text-sm text-stone-500">{item.email}</Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    <Chip
                      label={item.isActive ? t('common.active') : t('common.inactive')}
                      tone={item.isActive ? 'green' : 'stone'}
                    />
                    {item.mustSetPassword ? (
                      <Chip label={t('coordinators.awaitingPassword')} tone="amber" />
                    ) : null}
                  </View>
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
                      {t('coordinators.resendInvite')}
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
                    {item.isActive ? t('coordinators.deactivate') : t('coordinators.activate')}
                  </Button>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <ToastProvider>
          <InviteCoordinatorForm
            onClose={() => setModalOpen(false)}
            onCreated={() => {
              void qc.invalidateQueries({ queryKey: ['org-coordinators'] });
              void qc.invalidateQueries({ queryKey: ['org-dashboard'] });
            }}
          />
        </ToastProvider>
      </Modal>
    </SafeAreaView>
  );
}
