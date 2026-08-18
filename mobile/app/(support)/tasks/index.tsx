import { useMemo, useState } from 'react';
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import {
  Button,
  Card,
  EmptyState,
  Input,
  ScreenHeader,
  StatusBadge,
} from '../../../components/ui';
import { completeTask, listMyTasks, type Task } from '../../../lib/api/shifts';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
] as const;

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function taskContext(task: Task) {
  const ep = task.careEpisode;
  if (!ep) return null;
  return {
    who: ep.careRecipient?.name || ep.patient?.name,
    episodeTitle: ep.title,
    coordinator: ep.coordinator?.name,
    assigner: task.assigner?.name,
    dueAt: task.dueAt,
  };
}

export default function SupportTasksScreen() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [evidenceById, setEvidenceById] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['support-tasks', status],
    queryFn: () => listMyTasks({ status: status || undefined }),
  });

  const completeMutation = useMutation({
    mutationFn: async (task: Task) => {
      const text = evidenceById[task.id]?.trim();
      if (text && isHttpUrl(text)) {
        return completeTask(task.id, { completionEvidence: text });
      }
      return completeTask(task.id, { notes: text || 'Completed on shift' });
    },
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['support-tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['support-shell-stats'] });
      toast.show('Task completed', { type: 'success' });
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Complete failed');
      setFormError(msg);
      toastError(toast, e, 'Complete failed');
    },
  });

  const tasks = query.data?.data ?? [];
  const filtered = useMemo(() => {
    if (!status) return tasks;
    return tasks.filter((t) => t.status === status);
  }, [tasks, status]);

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Tasks"
        showBack={false}
        rightAction={{
          icon: 'time-outline',
          onPress: () => router.push('/(support)/shifts'),
        }}
      />

      <View className="border-b border-stone-100 bg-white pb-3">
        <Text className="px-4 pt-3 text-sm text-stone-500">
          Complete assigned care tasks. Add optional notes, or paste an evidence URL.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {STATUS_FILTERS.map((filter) => {
            const active = status === filter.value;
            return (
              <Pressable
                key={filter.value || 'all'}
                onPress={() => setStatus(filter.value)}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                }`}
              >
                <Text
                  className={`text-sm ${active ? 'font-medium text-teal-700' : 'text-stone-600'}`}
                >
                  {filter.label}
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
          title="Could not load tasks"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {formError ? (
            <View className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
              <Text className="text-sm text-red-700">{formError}</Text>
            </View>
          ) : null}

          {filtered.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="No tasks assigned to you yet"
              subtitle="Ask your coordinator to assign episode tasks or book a session with task assignment."
            />
          ) : (
            filtered.map((task) => {
              const ctx = taskContext(task);
              const completing =
                completeMutation.isPending && completeMutation.variables?.id === task.id;
              return (
                <Card key={task.id} className="mb-3" shadow>
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1">
                      <Text className="font-semibold text-stone-900">{task.title}</Text>
                      {ctx ? (
                        <Text className="mt-1 text-sm text-stone-500">
                          {ctx.who ? `${ctx.who} · ` : ''}
                          {ctx.episodeTitle}
                        </Text>
                      ) : null}
                      {ctx?.assigner || ctx?.coordinator ? (
                        <Text className="mt-0.5 text-xs text-stone-500">
                          Assigned by {ctx.assigner || ctx.coordinator}
                          {ctx.dueAt ? ` · Due ${formatDateTime(ctx.dueAt)}` : ''}
                        </Text>
                      ) : null}
                      {task.description ? (
                        <Text className="mt-2 text-sm text-stone-600">{task.description}</Text>
                      ) : null}
                    </View>
                    <StatusBadge status={task.status} label={task.status.replace(/_/g, ' ')} />
                  </View>

                  {task.status !== 'completed' ? (
                    <View className="mt-3 gap-2">
                      <Input
                        value={evidenceById[task.id] ?? ''}
                        onChangeText={(v) => setEvidenceById((m) => ({ ...m, [task.id]: v }))}
                        placeholder="Notes or evidence URL (optional)"
                      />
                      <Button
                        isLoading={completing}
                        onPress={() => {
                          setFormError(null);
                          completeMutation.mutate(task);
                        }}
                      >
                        Complete
                      </Button>
                    </View>
                  ) : null}

                  {task.completionEvidence ? (
                    <Text className="mt-2 text-xs text-stone-500">
                      Evidence: {task.completionEvidence}
                    </Text>
                  ) : null}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
