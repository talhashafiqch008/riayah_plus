import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ label, tags, onChange, placeholder = 'Add item' }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v || tags.includes(v)) return;
    onChange([...tags, v]);
    setDraft('');
  };

  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm text-stone-700">{label}</Text>
      <View className="flex-row items-center gap-2">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder={placeholder}
          placeholderTextColor="#A8A29E"
          className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
          returnKeyType="done"
        />
        <Pressable
          onPress={add}
          className="h-11 w-11 items-center justify-center rounded-xl bg-teal-600"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {tags.map((t) => (
          <Pressable
            key={t}
            onPress={() => onChange(tags.filter((x) => x !== t))}
            className="flex-row items-center gap-1 rounded-full bg-teal-50 px-3 py-1"
          >
            <Text className="text-sm text-teal-700">{t}</Text>
            <Ionicons name="close" size={14} color="#0F766E" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
