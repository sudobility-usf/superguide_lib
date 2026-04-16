import { create } from 'zustand';
import type { Restaurant } from '@sudobility/superguide_types';

/**
 * Default cache expiration time in milliseconds (15 minutes).
 */
export const DEFAULT_RESTAURANT_CACHE_EXPIRATION_MS = 15 * 60 * 1000;

export interface RestaurantsCacheEntry {
  restaurants: Restaurant[];
  cachedAt: number;
}

/**
 * Builds a composite cache key from a (dish, location) pair.
 * Normalized to lowercase + trimmed for stable lookups.
 */
export const restaurantCacheKey = (dish: string, location: string): string =>
  `${dish.trim().toLowerCase()}::${location.trim().toLowerCase()}`;

export interface RestaurantsStoreState {
  /** Cache map keyed by `restaurantCacheKey(dish, location)`. */
  cache: Record<string, RestaurantsCacheEntry>;

  setRestaurants: (
    dish: string,
    location: string,
    restaurants: Restaurant[]
  ) => void;

  getRestaurants: (
    dish: string,
    location: string,
    maxAge?: number
  ) => Restaurant[] | undefined;

  getCacheEntry: (
    dish: string,
    location: string,
    maxAge?: number
  ) => RestaurantsCacheEntry | undefined;

  purgeExpired: (maxAge?: number) => void;
  clearAll: () => void;
}

const isExpired = (entry: RestaurantsCacheEntry, maxAge: number): boolean =>
  Date.now() - entry.cachedAt > maxAge;

/**
 * Zustand store providing a (dish, location)-keyed restaurant search cache.
 * In-memory only; no persistence.
 */
export const useRestaurantsStore = create<RestaurantsStoreState>(
  (set, get) => ({
    cache: {},

    setRestaurants: (dish, location, restaurants) =>
      set(state => ({
        cache: {
          ...state.cache,
          [restaurantCacheKey(dish, location)]: {
            restaurants,
            cachedAt: Date.now(),
          },
        },
      })),

    getRestaurants: (
      dish,
      location,
      maxAge: number = DEFAULT_RESTAURANT_CACHE_EXPIRATION_MS
    ) => {
      const entry = get().cache[restaurantCacheKey(dish, location)];
      if (!entry) return undefined;
      if (isExpired(entry, maxAge)) return undefined;
      return entry.restaurants;
    },

    getCacheEntry: (
      dish,
      location,
      maxAge: number = DEFAULT_RESTAURANT_CACHE_EXPIRATION_MS
    ) => {
      const entry = get().cache[restaurantCacheKey(dish, location)];
      if (!entry) return undefined;
      if (isExpired(entry, maxAge)) return undefined;
      return entry;
    },

    purgeExpired: (maxAge: number = DEFAULT_RESTAURANT_CACHE_EXPIRATION_MS) =>
      set(state => {
        const now = Date.now();
        const next: Record<string, RestaurantsCacheEntry> = {};
        for (const [key, entry] of Object.entries(state.cache)) {
          if (now - entry.cachedAt <= maxAge) next[key] = entry;
        }
        return { cache: next };
      }),

    clearAll: () => set({ cache: {} }),
  })
);
