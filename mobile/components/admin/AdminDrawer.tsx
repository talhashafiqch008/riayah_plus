import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ADMIN_ACCOUNT_LINKS,
  ADMIN_NAVIGATION,
} from '../../lib/adminNav';
import { useAdminDrawer } from '../../stores/adminDrawerStore';
import { useAuthStore } from '../../stores/authStore';

function pathMatches(pathname: string, href: string): boolean {
  const normalized = href.replace('/(admin)', '') || '/';
  if (normalized === '/' || normalized === '') {
    return pathname === '/' || pathname.endsWith('/(admin)') || pathname.endsWith('/(admin)/');
  }
  return pathname.includes(normalized);
}

/**
 * Single admin sidebar. Mount only from (admin)/_layout — not from screen headers.
 * Multiple Modal instances (one per stacked screen) caused open lag after navigation.
 */
export function AdminDrawer() {
  const open = useAdminDrawer((s) => s.open);
  const closeDrawer = useAdminDrawer((s) => s.closeDrawer);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(320, width * 0.86);

  const [expanded, setExpanded] = useState<string[]>(
    () => ADMIN_NAVIGATION.map((g) => g.title.toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const activeGroup = ADMIN_NAVIGATION.find((g) =>
      g.items.some((item) => pathMatches(pathname, item.href)),
    );
    if (!activeGroup) return;
    const key = activeGroup.title.toLowerCase();
    setExpanded((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, [open, pathname]);

  const toggleGroup = (title: string) => {
    const key = title.toLowerCase();
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
    );
  };

  const go = (href: string) => {
    closeDrawer();
    // Defer navigation until Modal begins closing — avoids janky double work
    requestAnimationFrame(() => {
      router.push(href as never);
    });
  };

  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent
      onRequestClose={closeDrawer}
      statusBarTranslucent
    >
      <View className="flex-1 flex-row">
        <View
          style={{ width: drawerWidth }}
          className="h-full border-r border-stone-200 bg-white"
        >
          <SafeAreaView edges={['top', 'bottom']} className="flex-1">
            <View className="flex-row items-center justify-between border-b border-stone-100 px-4 py-3">
              <View className="flex-1 pr-2">
                <Text className="text-lg font-bold text-stone-900">Admin</Text>
                <Text className="text-xs text-stone-500" numberOfLines={1}>
                  {user?.email ?? 'Platform console'}
                </Text>
              </View>
              <Pressable onPress={closeDrawer} hitSlop={12}>
                <Ionicons name="close" size={24} color="#57534E" />
              </Pressable>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
              {ADMIN_NAVIGATION.map((group) => {
                const key = group.title.toLowerCase();
                const isOpen = expanded.includes(key);
                return (
                  <View key={group.title} className="mt-2">
                    <Pressable
                      onPress={() => toggleGroup(group.title)}
                      className="flex-row items-center justify-between px-4 py-2"
                    >
                      <Text className="text-xs font-bold uppercase tracking-wider text-stone-400">
                        {group.title}
                      </Text>
                      <Ionicons
                        name={isOpen ? 'chevron-down' : 'chevron-forward'}
                        size={16}
                        color="#A8A29E"
                      />
                    </Pressable>
                    {isOpen
                      ? group.items.map((item) => {
                          const active = pathMatches(pathname, item.href);
                          return (
                            <Pressable
                              key={item.href}
                              onPress={() => go(item.href)}
                              className={`mx-2 flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                                active ? 'bg-teal-50' : ''
                              }`}
                            >
                              <Ionicons
                                name={item.icon}
                                size={20}
                                color={active ? '#0D9488' : '#78716C'}
                              />
                              <Text
                                className={`flex-1 text-sm font-medium ${
                                  active ? 'text-teal-800' : 'text-stone-700'
                                }`}
                              >
                                {item.name}
                              </Text>
                            </Pressable>
                          );
                        })
                      : null}
                  </View>
                );
              })}

              <View className="mt-4 border-t border-stone-100 pt-2">
                <Text className="mb-1 px-4 text-xs font-bold uppercase tracking-wider text-stone-400">
                  Account
                </Text>
                {ADMIN_ACCOUNT_LINKS.map((item) => (
                  <Pressable
                    key={item.href}
                    onPress={() => go(item.href)}
                    className="mx-2 flex-row items-center gap-3 rounded-xl px-3 py-2.5"
                  >
                    <Ionicons name={item.icon} size={20} color="#78716C" />
                    <Text className="text-sm font-medium text-stone-700">{item.name}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={async () => {
                    closeDrawer();
                    await logout();
                    router.replace('/(auth)/login');
                  }}
                  className="mx-2 mt-1 flex-row items-center gap-3 rounded-xl px-3 py-2.5"
                >
                  <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                  <Text className="text-sm font-medium text-red-600">Sign out</Text>
                </Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
        <Pressable className="flex-1 bg-black/40" onPress={closeDrawer} />
      </View>
    </Modal>
  );
}
