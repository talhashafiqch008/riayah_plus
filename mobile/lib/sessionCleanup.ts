import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { queryClient, QUERY_CACHE_STORAGE_KEY } from './query/client';
import { releaseRealtimeSocket } from './realtime';
import { teardownTelehealthSession } from './telehealthSession';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useShiftStore } from '../stores/shiftStore';
import { useAdminDrawer } from '../stores/adminDrawerStore';

/**
 * Full local-session destruction for logout / account-switch / hard 401.
 * Clears caches, drafts, sockets, telehealth, and PHI temp files (MOB-01/02/03/08/16).
 */
export async function purgeLocalSession(): Promise<void> {
  try {
    await queryClient.cancelQueries();
  } catch {
    /* ignore */
  }
  queryClient.clear();

  try {
    await AsyncStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
  } catch {
    /* ignore */
  }

  try {
    await useOnboardingStore.getState().clearDraft();
    useOnboardingStore.getState().reset();
  } catch {
    /* ignore */
  }

  try {
    useShiftStore.getState().endShift();
  } catch {
    /* ignore */
  }

  try {
    useAdminDrawer.getState().closeDrawer();
  } catch {
    /* ignore */
  }

  releaseRealtimeSocket();
  teardownTelehealthSession();

  await clearPhiCacheFiles();
}

/** Best-effort delete of PHI media left in the app cache directory (MOB-08). */
export async function clearPhiCacheFiles(): Promise<void> {
  const dir = FileSystem.cacheDirectory;
  if (!dir) return;
  try {
    const entries = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(
      entries.map(async (name) => {
        const lower = name.toLowerCase();
        const looksPhi =
          lower.endsWith('.pdf') ||
          lower.endsWith('.m4a') ||
          lower.endsWith('.caf') ||
          lower.endsWith('.mp3') ||
          lower.endsWith('.wav') ||
          lower.endsWith('.3gp') ||
          lower.endsWith('.aac') ||
          lower.startsWith('voice-') ||
          lower.includes('invoice') ||
          lower.includes('attachment');
        if (!looksPhi) return;
        try {
          await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true });
        } catch {
          /* ignore */
        }
      }),
    );
  } catch {
    /* ignore */
  }
}

/** Delete a single temp file after upload/view/share (MOB-08). */
export async function deleteTempFile(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}
