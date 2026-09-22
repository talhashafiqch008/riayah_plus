import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Input } from './ui';

export type SelectOption = {
  id: string;
  label: string;
  searchText?: string;
};

export function SelectDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  searchable = true,
  emptyText,
}: {
  label: string;
  placeholder?: string;
  options: SelectOption[];
  value: string;
  onChange: (id: string) => void;
  searchable?: boolean;
  emptyText?: string;
}) {
  const { t } = useTranslation('common');
  const resolvedPlaceholder = placeholder ?? t('select.placeholder');
  const resolvedEmptyText = emptyText ?? t('select.empty');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      (o.searchText ?? o.label).toLowerCase().includes(q),
    );
  }, [options, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <View>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5"
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text
          className={`flex-1 pr-2 text-sm ${selected ? 'text-stone-800' : 'text-stone-400'}`}
          numberOfLines={2}
        >
          {selected ? selected.label : resolvedPlaceholder}
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
              <Text className="text-base font-semibold text-stone-900">{label}</Text>
              <Pressable onPress={close} hitSlop={12}>
                <Ionicons name="close" size={22} color="#57534E" />
              </Pressable>
            </View>
            {searchable ? (
              <View className="px-4 pt-3">
                <Input
                  placeholder={t('select.search')}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="search-outline" size={18} color="#A8A29E" />}
                />
              </View>
            ) : null}
            <FlatList
              data={filtered}
              keyExtractor={(o) => o.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
              ListEmptyComponent={
                <Text className="p-4 text-sm text-stone-500">{resolvedEmptyText}</Text>
              }
              renderItem={({ item: o }) => {
                const isSelected = value === o.id;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(o.id);
                      close();
                    }}
                    className={`mb-1 flex-row items-center justify-between rounded-xl px-3 py-3 ${
                      isSelected ? 'bg-teal-50' : ''
                    }`}
                  >
                    <Text
                      className={`flex-1 pr-3 text-sm font-medium ${
                        isSelected ? 'text-teal-800' : 'text-stone-800'
                      }`}
                    >
                      {o.label}
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
