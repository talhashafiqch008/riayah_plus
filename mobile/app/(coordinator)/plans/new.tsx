import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, EmptyState, Input, ScreenHeader } from '../../../components/ui';
import {
  approveAiIntakeSummary,
  createCarePlan,
  getAiIntakeSummary,
  getEpisode,
  listCarePlans,
  listEpisodes,
  triggerAiCarePlanDraft,
  type GoalInput,
  type ItemInput,
} from '../../../lib/api/care';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

const emptyGoal = (): GoalInput => ({ title: '', description: '', measurement: '' });
const emptyItem = (): ItemInput => ({ serviceType: '', frequency: '', duration: '' });

export default function CoordinatorNewCarePlanScreen() {
  const { episodeId: episodeIdParam } = useLocalSearchParams<{ episodeId?: string }>();
  const episodeId = Array.isArray(episodeIdParam) ? episodeIdParam[0] : episodeIdParam;
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [goals, setGoals] = useState<GoalInput[]>([emptyGoal()]);
  const [items, setItems] = useState<ItemInput[]>([emptyItem()]);
  const [formError, setFormError] = useState<string | null>(null);

  const episodeQuery = useQuery({
    queryKey: ['coordinator-episode', episodeId],
    enabled: Boolean(episodeId),
    queryFn: () => getEpisode(episodeId!),
  });

  const summaryQuery = useQuery({
    queryKey: ['ai-intake-summary', episodeId],
    enabled: Boolean(episodeId),
    retry: false,
    queryFn: () => getAiIntakeSummary(episodeId!),
  });

  const episodesQuery = useQuery({
    queryKey: ['coordinator-episodes', ''],
    enabled: !episodeId,
    queryFn: () => listEpisodes({ limit: 50 }),
  });

  useEffect(() => {
    const ep = episodeQuery.data;
    if (ep && !title) {
      setTitle(ep.title ? `Care plan — ${ep.title}` : 'Care plan');
    }
  }, [episodeQuery.data, title]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!episodeId) throw new Error('Pick an episode');
      if (!title.trim()) throw new Error('Title is required');
      return createCarePlan({
        episodeId,
        title: title.trim(),
        notes: notes.trim() || undefined,
        goals: goals.filter((g) => g.title.trim()),
        items: items.filter((i) => i.serviceType.trim()),
      });
    },
    onSuccess: (plan) => {
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['coordinator-care-plans'] });
      toast.show('Care plan created', { type: 'success' });
      router.replace(`/(coordinator)/plans/${plan.id}`);
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Failed to create plan');
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
    },
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      if (!episodeId) throw new Error('Pick an episode');
      await triggerAiCarePlanDraft(episodeId);
      const plans = await listCarePlans({ episodeId });
      return plans.find((p) => p.status === 'draft' && p.isCurrentVersion !== false) ?? null;
    },
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-care-plans'] });
      if (draft) {
        toast.show('AI draft ready', { type: 'success' });
        router.replace(`/(coordinator)/plans/${draft.id}`);
      } else {
        toast.show('Draft may still be processing — check Care Plans list', { type: 'normal' });
      }
    },
    onError: (e) => toastError(toast, e, 'AI draft failed'),
  });

  const approveSummaryMutation = useMutation({
    mutationFn: () => {
      if (!episodeId) throw new Error('Missing episode');
      return approveAiIntakeSummary(episodeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-intake-summary', episodeId] });
      toast.show('AI intake summary approved', { type: 'success' });
    },
    onError: (e) => toastError(toast, e, 'Approve failed'),
  });

  if (!episodeId) {
    const episodes = episodesQuery.data?.data ?? [];
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="New care plan" showBack />
        {episodesQuery.isLoading ? (
          <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text className="mb-3 text-sm text-stone-500">Choose an episode to build a plan</Text>
            {episodes.length === 0 ? (
              <EmptyState icon="heart-outline" title="No episodes found" />
            ) : (
              episodes.map((ep) => (
                <Card
                  key={ep.id}
                  className="mb-2"
                  onPress={() =>
                    router.replace(`/(coordinator)/plans/new?episodeId=${ep.id}`)
                  }
                  shadow={false}
                >
                  <Text className="font-medium text-stone-900">{ep.title ?? 'Episode'}</Text>
                  <Text className="mt-0.5 text-xs capitalize text-stone-500">
                    {(ep.status ?? '').replace(/_/g, ' ')}
                  </Text>
                </Card>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  const summary = summaryQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="New care plan"
        subtitle={episodeQuery.data?.title ?? 'Episode'}
        showBack
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {formError ? (
            <View className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <Text className="text-sm text-red-700">{formError}</Text>
            </View>
          ) : null}

          {summary ? (
            <Card className="mb-4 border border-teal-100 bg-teal-50/50" shadow={false}>
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-stone-900">AI intake summary</Text>
                <Text className="text-xs font-semibold uppercase text-teal-800">
                  {summary.status}
                </Text>
              </View>
              {summary.clinicalImpressions ? (
                <Text className="mt-2 text-sm text-stone-700">{summary.clinicalImpressions}</Text>
              ) : null}
              {(summary.keyConcerns?.length ?? 0) > 0 ? (
                <View className="mt-2">
                  {summary.keyConcerns!.map((c) => (
                    <Text key={c} className="text-sm text-stone-600">
                      • {c}
                    </Text>
                  ))}
                </View>
              ) : null}
              {summary.status === 'draft' ? (
                <View className="mt-3">
                  <Button
                    size="sm"
                    isLoading={approveSummaryMutation.isPending}
                    onPress={() => approveSummaryMutation.mutate()}
                  >
                    Approve summary
                  </Button>
                </View>
              ) : null}
            </Card>
          ) : null}

          <Card shadow>
            <Input label="Title" value={title} onChangeText={setTitle} />
            <View className="mt-3">
              <Text className="mb-1 text-sm text-stone-700">Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="min-h-[88px] rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900"
                placeholderTextColor="#A8A29E"
              />
            </View>

            <View className="mt-5 flex-row items-center justify-between">
              <Text className="font-semibold text-stone-900">Goals</Text>
              <Pressable onPress={() => setGoals((g) => [...g, emptyGoal()])}>
                <Text className="text-sm font-semibold text-teal-700">Add</Text>
              </Pressable>
            </View>
            {goals.map((g, i) => (
              <View key={i} className="mt-2 rounded-xl border border-stone-100 p-3">
                <Input
                  placeholder="Goal title"
                  value={g.title}
                  onChangeText={(v) =>
                    setGoals((rows) => rows.map((r, j) => (j === i ? { ...r, title: v } : r)))
                  }
                />
                <View className="mt-2">
                  <Input
                    placeholder="Measurement"
                    value={g.measurement ?? ''}
                    onChangeText={(v) =>
                      setGoals((rows) =>
                        rows.map((r, j) => (j === i ? { ...r, measurement: v } : r)),
                      )
                    }
                  />
                </View>
                <View className="mt-2">
                  <Input
                    placeholder="Description"
                    value={g.description ?? ''}
                    onChangeText={(v) =>
                      setGoals((rows) =>
                        rows.map((r, j) => (j === i ? { ...r, description: v } : r)),
                      )
                    }
                  />
                </View>
                <Pressable
                  className="mt-2 self-end"
                  onPress={() => setGoals((rows) => rows.filter((_, j) => j !== i))}
                >
                  <Ionicons name="trash-outline" size={18} color="#E11D48" />
                </Pressable>
              </View>
            ))}

            <View className="mt-5 flex-row items-center justify-between">
              <Text className="font-semibold text-stone-900">Services</Text>
              <Pressable onPress={() => setItems((rows) => [...rows, emptyItem()])}>
                <Text className="text-sm font-semibold text-teal-700">Add</Text>
              </Pressable>
            </View>
            {items.map((item, i) => (
              <View key={i} className="mt-2 rounded-xl border border-stone-100 p-3">
                <Input
                  placeholder="Service type"
                  value={item.serviceType}
                  onChangeText={(v) =>
                    setItems((rows) =>
                      rows.map((r, j) => (j === i ? { ...r, serviceType: v } : r)),
                    )
                  }
                />
                <View className="mt-2">
                  <Input
                    placeholder="Frequency"
                    value={item.frequency ?? ''}
                    onChangeText={(v) =>
                      setItems((rows) =>
                        rows.map((r, j) => (j === i ? { ...r, frequency: v } : r)),
                      )
                    }
                  />
                </View>
                <View className="mt-2">
                  <Input
                    placeholder="Duration"
                    value={item.duration ?? ''}
                    onChangeText={(v) =>
                      setItems((rows) =>
                        rows.map((r, j) => (j === i ? { ...r, duration: v } : r)),
                      )
                    }
                  />
                </View>
                <View className="mt-2">
                  <Input
                    placeholder="Unit cost"
                    value={item.unitCost != null ? String(item.unitCost) : ''}
                    keyboardType="decimal-pad"
                    onChangeText={(v) =>
                      setItems((rows) =>
                        rows.map((r, j) =>
                          j === i ? { ...r, unitCost: v ? Number(v) : undefined } : r,
                        ),
                      )
                    }
                  />
                </View>
                <Pressable
                  className="mt-2 self-end"
                  onPress={() => setItems((rows) => rows.filter((_, j) => j !== i))}
                >
                  <Ionicons name="trash-outline" size={18} color="#E11D48" />
                </Pressable>
              </View>
            ))}

            <View className="mt-5 gap-2">
              <Button
                isLoading={createMutation.isPending}
                onPress={() => {
                  if (!title.trim()) {
                    const msg = 'Title is required';
                    setFormError(msg);
                    toast.show(msg, { type: 'danger' });
                    return;
                  }
                  createMutation.mutate();
                }}
              >
                Create draft
              </Button>
              <Button
                variant="secondary"
                isLoading={aiMutation.isPending}
                onPress={() => aiMutation.mutate()}
              >
                Generate AI Draft
              </Button>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
