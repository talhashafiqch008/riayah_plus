import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StaffCardLike } from '../lib/api/care';
import { Input } from './ui';

export function clinicianLabel(c: StaffCardLike): string {
  const extras = [
    c.languages?.length ? c.languages.slice(0, 2).join(', ') : null,
    c.role ? c.role.replace(/_/g, ' ') : null,
  ].filter(Boolean);
  return extras.length ? `${c.name} · ${extras.join(' · ')}` : c.name;
}

export function ClinicianDropdown({
  clinicians,
  value,
  onChange,
}: {
  clinicians: StaffCardLike[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = clinicians.find((c) => c.id === value);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clinicians;
    return clinicians.filter((c) => clinicianLabel(c).toLowerCase().includes(q));
  }, [clinicians, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <View>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
        Clinician
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5"
        accessibilityRole="button"
        accessibilityLabel="Select clinician"
      >
        <Text
          className={`flex-1 text-sm ${selected ? 'text-stone-800' : 'text-stone-400'}`}
          numberOfLines={1}
        >
          {selected ? clinicianLabel(selected) : 'Select clinician…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#A8A29E" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={close}>
          <Pressable
            className="max-h-[70%] rounded-t-3xl bg-white"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b border-stone-100 px-4 py-3">
              <Text className="text-base font-semibold text-stone-900">Select clinician</Text>
              <Pressable onPress={close} hitSlop={12}>
                <Ionicons name="close" size={22} color="#57534E" />
              </Pressable>
            </View>
            <View className="px-4 pt-3">
              <Input
                placeholder="Search clinicians…"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
                leftIcon={<Ionicons name="search-outline" size={18} color="#A8A29E" />}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
              ListEmptyComponent={
                <Text className="p-4 text-sm text-stone-500">No clinicians match that search.</Text>
              }
              renderItem={({ item: c }) => {
                const isSelected = value === c.id;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(c.id);
                      close();
                    }}
                    className={`mb-1 flex-row items-center justify-between rounded-xl px-3 py-3 ${
                      isSelected ? 'bg-teal-50' : ''
                    }`}
                  >
                    <Text
                      className={`flex-1 pr-3 text-sm font-medium capitalize ${
                        isSelected ? 'text-teal-800' : 'text-stone-800'
                      }`}
                    >
                      {clinicianLabel(c)}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color="#0D9488" />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
