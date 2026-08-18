import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

interface OfflineState {
  isOnline: boolean;
  startListening: () => () => void;
}

export const useOfflineStore = create<OfflineState>()((set) => ({
  isOnline: true,

  startListening: () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      set({ isOnline: state.isConnected ?? true });
    });
    return unsubscribe;
  },
}));
