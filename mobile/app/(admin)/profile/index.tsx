import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreen } from '../../../components/ProfileScreen';
import { useAdminDrawer } from '../../../stores/adminDrawerStore';

export default function AdminProfileScreen() {
  const openDrawer = useAdminDrawer((s) => s.openDrawer);
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <View className="absolute left-3 top-14 z-10">
        <Pressable onPress={openDrawer} hitSlop={12} className="rounded-full bg-white p-2">
          <Ionicons name="menu" size={22} color="#57534E" />
        </Pressable>
      </View>
      <ProfileScreen />
    </SafeAreaView>
  );
}
