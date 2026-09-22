import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

/**
 * Memory-conscious defaults for ~4GB devices:
 * - Short in-memory GC so unused query data is released
 * - Persist only allowlisted keys (not the whole cache)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 15,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Storage key for the TanStack AsyncStorage persister (cleared on logout — MOB-02). */
export const QUERY_CACHE_STORAGE_KEY = 'RAIYAH_QUERY_CACHE_V1';

/**
 * Persist only non-PHI shell metadata. Never dehydrate care-plan / session / task
 * payloads to plaintext AsyncStorage (MOB-01).
 */
export const PERSISTED_QUERY_KEYS = [] as const;

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_STORAGE_KEY,
  throttleTime: 2000,
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 12,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const key = query.queryKey[0];
      return (
        typeof key === 'string' &&
        (PERSISTED_QUERY_KEYS as readonly string[]).includes(key)
      );
    },
  },
};
