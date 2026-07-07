import { redis } from '../config/redis';
import { logger } from '../config/logger';

export class CacheInvalidationService {
  // ── Key patterns ──────────────────────────────────────────────────────────

  static keys = {
    userProfile: (userId: string) => `user:profile:${userId}`,
    providerList: (filters?: string) => `providers:list:${filters ?? 'all'}`,
    providerProfile: (userId: string) => `provider:profile:${userId}`,
    dashboardAdmin: () => 'dashboard:admin',
    dashboardProvider: (userId: string) => `dashboard:provider:${userId}`,
    dashboardClient: (userId: string) => `dashboard:client:${userId}`,
    walletBalance: (userId: string) => `wallet:balance:${userId}`,
    notifications: (userId: string) => `notifications:${userId}`,
    bookingList: (userId: string) => `bookings:${userId}`,
    careEpisodes: (userId: string) => `episodes:${userId}`,
    settings: () => 'settings:all',
  };

  // ── Set with TTL ──────────────────────────────────────────────────────────

  static async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  static async get<T>(key: string): Promise<T | null> {
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  // ── Invalidation ──────────────────────────────────────────────────────────

  static async invalidate(...keys: string[]): Promise<void> {
    if (!keys.length) return;
    try {
      await redis.del(...keys);
    } catch (err) {
      logger.warn('Cache invalidation failed', { keys, err });
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys);
    } catch (err) {
      logger.warn('Cache pattern invalidation failed', { pattern, err });
    }
  }

  // ── Domain-specific invalidators ─────────────────────────────────────────

  static async onUserUpdated(userId: string): Promise<void> {
    await this.invalidate(
      this.keys.userProfile(userId),
      this.keys.providerProfile(userId),
      this.keys.dashboardClient(userId),
      this.keys.dashboardProvider(userId)
    );
  }

  static async onBookingUpdated(clientId: string, providerId: string): Promise<void> {
    await this.invalidate(
      this.keys.bookingList(clientId),
      this.keys.bookingList(providerId),
      this.keys.dashboardClient(clientId),
      this.keys.dashboardProvider(providerId),
      this.keys.dashboardAdmin()
    );
  }

  static async onWalletUpdated(userId: string): Promise<void> {
    await this.invalidate(this.keys.walletBalance(userId));
  }

  static async onSettingsUpdated(): Promise<void> {
    await this.invalidate(this.keys.settings());
  }

  static async onEpisodeUpdated(patientId: string, coordinatorId: string): Promise<void> {
    await this.invalidate(
      this.keys.careEpisodes(patientId),
      this.keys.careEpisodes(coordinatorId),
      this.keys.dashboardAdmin()
    );
  }
}
