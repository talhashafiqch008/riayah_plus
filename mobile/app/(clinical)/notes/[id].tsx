import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, EmptyState, Input, ScreenHeader } from '../../../components/ui';
import { getEpisode } from '../../../lib/api/care';
import { createClinicalNote, listClinicalNotes } from '../../../lib/api/clinicalNotes';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

export default function ClinicalEpisodeNotesScreen() {
  const { t } = useTranslation('clinical');
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const episodeQuery = useQuery({
    queryKey: ['clinical-episode', id],
    enabled: Boolean(id),
    queryFn: () => getEpisode(id!),
  });

  const notesQuery = useQuery({
    queryKey: ['clinical-notes', id],
    enabled: Boolean(id),
    queryFn: () => listClinicalNotes({ episodeId: id! }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing episode');
      if (!content.trim()) throw new Error(t('notes.contentRequired'));
      return createClinicalNote({
        episodeId: id,
        content: content.trim(),
        noteType: 'session_note',
        isPrivate,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setContent('');
      await queryClient.invalidateQueries({ queryKey: ['clinical-notes', id] });
      toast.show(t('notes.saved'), { type: 'success' });
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, t('notes.createFailed'));
      setFormError(msg);
      toastError(toast, e, t('notes.createFailed'));
    },
  });

  const notes = notesQuery.data ?? [];
  const episodeTitle = episodeQuery.data?.title ?? t('notes.episodeTitle');

  if (notesQuery.isLoading && episodeQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('notes.episodeTitle')} showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (notesQuery.isError) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('notes.episodeTitle')} showBack />
        <EmptyState
          icon="alert-circle-outline"
          title={t('notes.notesLoadError')}
          subtitle={apiErrorMessage(notesQuery.error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void notesQuery.refetch() }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={t('notes.episodeTitle')} subtitle={episodeTitle} showBack />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={notesQuery.isFetching && !notesQuery.isLoading}
              onRefresh={() => {
                void notesQuery.refetch();
                void episodeQuery.refetch();
              }}
              tintColor="#0D9488"
            />
          }
        >
          <Card className="mb-4" shadow>
            <Text className="text-sm font-semibold text-stone-900">
              {t('mobile.detail.addImmutableNote')}
            </Text>
            {formError ? (
              <View className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                <Text className="text-sm text-red-700">{formError}</Text>
              </View>
            ) : null}
            <View className="mt-3 gap-3">
              <Input
                value={content}
                onChangeText={setContent}
                placeholder={t('notes.placeholder')}
                multiline
              />
              <Pressable
                onPress={() => setIsPrivate((v) => !v)}
                className="flex-row items-center gap-2"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isPrivate }}
              >
                <Ionicons
                  name={isPrivate ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isPrivate ? '#0D9488' : '#A8A29E'}
                />
                <Text className="text-sm text-stone-700">{t('notes.private')}</Text>
              </Pressable>
              <Button
                isLoading={createMutation.isPending}
                onPress={() => {
                  setFormError(null);
                  createMutation.mutate();
                }}
              >
                {t('notes.save')}
              </Button>
            </View>
          </Card>

          {notes.length === 0 ? (
            <Text className="py-6 text-center text-sm text-stone-500">{t('notes.emptyNotes')}</Text>
          ) : (
            notes.map((n) => (
              <Card key={n.id} className="mb-3" shadow={false}>
                <View className="flex-row flex-wrap items-start justify-between gap-2">
                  <Text className="text-xs text-stone-500">
                    {n.author?.name ?? t('notes.author')}
                    {n.isPrivate ? ` · ${t('notes.privateTag')}` : ''}
                  </Text>
                  <Text className="text-xs text-stone-500">{formatDateTime(n.createdAt)}</Text>
                </View>
                <Text className="mt-2 text-sm text-stone-800">{n.content}</Text>
              </Card>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
