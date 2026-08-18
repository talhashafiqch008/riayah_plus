import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Avatar, Button, Card, Input, ScreenHeader, StatusBadge } from './ui';
import { apiClient } from '../lib/api/client';
import { apiErrorMessage } from '../lib/format';
import { useAuthStore } from '../stores/authStore';

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Profile" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-stone-400">Not signed in.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const save = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert('Invalid name', 'Please enter at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/api/user/profile', { name: trimmed });
      useAuthStore.getState().setUser({ ...user, name: trimmed });
      setName(trimmed);
      setEditing(false);
    } catch (e) {
      Alert.alert('Could not save', apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Profile"
        rightAction={
          editing
            ? { icon: 'checkmark', onPress: () => void save() }
            : { icon: 'create-outline', onPress: () => setEditing(true) }
        }
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="items-center py-6">
          <Avatar uri={user.avatarUrl} name={user.name} size="xl" />
          <Text className="mt-3 text-xl font-bold text-stone-900">{user.name}</Text>
          <View className="mt-2">
            <StatusBadge status={user.role.replace(/_/g, ' ')} size="md" />
          </View>
        </View>

        <View className="gap-3 px-4">
          <Card shadow={false}>
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Role" value={user.role.replace(/_/g, ' ')} />
            {user.organizationId ? (
              <InfoRow label="Organization" value={user.organizationId} />
            ) : null}
          </Card>

          {editing ? (
            <Input
              label="Display name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!saving}
            />
          ) : null}

          <Button variant="ghost" onPress={() => router.push('/(auth)/forgot-password')}>
            Change Password
          </Button>

          <Button variant="destructive" onPress={confirmLogout} disabled={saving}>
            Sign Out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-stone-100 py-2">
      <Text className="text-sm text-stone-400">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-medium capitalize text-stone-900" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
