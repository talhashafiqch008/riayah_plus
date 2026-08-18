import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
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
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import { listAssessments, type Assessment } from '../../../lib/api/care';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import {
  FAMILY_ASSESSMENT_STATUS_FILTERS,
  familyAssessmentStatusLabel,
} from '../../../lib/familyLanguage';

function findingsEntries(findings: Assessment['findings']) {
  if (!findings) return [];
  return Object.entries(findings).filter(
    ([, value]) => value != null && String(value).trim() !== '',
  );
}

export default function FamilyBookingsScreen() {
  const [status, setStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['family-assessments', status],
    queryFn: () => listAssessments({ status: status || undefined, limit: 50 }),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? rows.length;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Appointments" showBack={false} />

      <View className="border-b border-stone-100 bg-white pb-3">
        <Text className="px-4 pt-3 text-sm text-stone-500">
          Consultations booked for your care journeys.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {FAMILY_ASSESSMENT_STATUS_FILTERS.map((filter) => {
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
                  className={`text-sm ${
                    active ? 'font-medium text-teal-700' : 'text-stone-600'
                  }`}
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
          title="Could not load appointments"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
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
            rows.length > 0 ? (
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {total} appointment{total === 1 ? '' : 's'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No appointments yet"
              subtitle="Book a consultation from your care journey."
              action={{
                label: 'Open care journey',
                onPress: () => router.push('/(family)/episodes'),
              }}
            />
          }
          renderItem={({ item }) => {
            const expanded = expandedId === item.id;
            const findings = findingsEntries(item.findings);
            return (
              <Card
                className="mb-3"
                onPress={() => setExpandedId(expanded ? null : item.id)}
                shadow
              >
                <View className="flex-row items-start gap-3">
                  <View className="mt-0.5 rounded-xl bg-teal-50 p-2.5">
                    <Ionicons name="calendar-outline" size={18} color="#0F766E" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="font-semibold capitalize text-stone-900">
                        {(item.type ?? 'consultation').replace(/_/g, ' ')}
                      </Text>
                      <StatusBadge
                        status={item.status}
                        label={familyAssessmentStatusLabel(item.status)}
                      />
                    </View>
                    <Text className="mt-0.5 text-sm text-stone-500" numberOfLines={1}>
                      {item.episode?.title || 'Care journey'}
                    </Text>
                    <Text className="mt-0.5 text-xs text-stone-400">
                      {formatDateTime(item.scheduledAt)}
                      {item.assessor?.name ? ` · ${item.assessor.name}` : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#D6D3D1"
                  />
                </View>

                {expanded ? (
                  <View className="mt-4 gap-3 border-t border-stone-100 pt-4">
                    <DetailRow label="Care journey" value={item.episode?.title} />
                    <DetailRow label="Scheduled" value={formatDateTime(item.scheduledAt)} />
                    <DetailRow label="Clinician" value={item.assessor?.name} />
                    {findings.length > 0 ? (
                      <View>
                        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                          Visit notes
                        </Text>
                        {findings.map(([key, value]) => (
                          <Text key={key} className="text-sm text-stone-700">
                            <Text className="capitalize text-stone-500">
                              {key.replace(/_/g, ' ')}:{' '}
                            </Text>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {item.recommendations ? (
                      <DetailRow label="Recommendations" value={item.recommendations} />
                    ) : null}
                    {item.reportUrl ? (
                      <Pressable
                        onPress={() => void Linking.openURL(item.reportUrl!)}
                        accessibilityRole="link"
                      >
                        <Text className="text-sm font-semibold text-teal-700">
                          Open visit summary
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </Text>
      <Text className="mt-0.5 text-sm text-stone-900">{value || '—'}</Text>
    </View>
  );
}
