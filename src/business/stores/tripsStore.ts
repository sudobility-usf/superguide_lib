import { create } from 'zustand';
import type {
  ItinDay,
  TripGenerateRequest,
} from '@sudobility/superguide_types';

/**
 * Default cache expiration time in milliseconds (30 minutes).
 */
export const DEFAULT_TRIP_CACHE_EXPIRATION_MS = 30 * 60 * 1000;

/**
 * A cached generated itinerary plus the request that produced it.
 */
export interface TripCacheEntry {
  request: TripGenerateRequest;
  itin: ItinDay[];
  cachedAt: number;
}

export interface TripsStoreState {
  /** Most recently generated itinerary, or undefined if none. */
  lastTrip?: TripCacheEntry;

  /** Replaces the last generated trip. */
  setLastTrip: (request: TripGenerateRequest, itin: ItinDay[]) => void;

  /** Returns the last trip if still fresh; otherwise undefined. */
  getLastTrip: (maxAge?: number) => TripCacheEntry | undefined;

  /** Clears the stored itinerary. */
  clear: () => void;
}

const isExpired = (entry: TripCacheEntry, maxAge: number): boolean =>
  Date.now() - entry.cachedAt > maxAge;

/**
 * Zustand store that holds the last generated trip itinerary.
 * In-memory only; no persistence.
 */
export const useTripsStore = create<TripsStoreState>((set, get) => ({
  lastTrip: undefined,

  setLastTrip: (request, itin) =>
    set({
      lastTrip: {
        request,
        itin,
        cachedAt: Date.now(),
      },
    }),

  getLastTrip: (maxAge: number = DEFAULT_TRIP_CACHE_EXPIRATION_MS) => {
    const entry = get().lastTrip;
    if (!entry) return undefined;
    if (isExpired(entry, maxAge)) return undefined;
    return entry;
  },

  clear: () => set({ lastTrip: undefined }),
}));
