import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  NetworkClient,
  Optional,
  Restaurant,
} from '@sudobility/superguide_types';
import { useRestaurantSearch } from '@sudobility/superguide_client';
import { useRestaurantsStore } from '../stores/restaurantsStore';

/**
 * Configuration for {@link useRestaurantsManager}.
 *
 * Accepts `token`/`userId` for parity with other managers even though the
 * restaurant search endpoint is currently public.
 */
export interface UseRestaurantsManagerConfig {
  baseUrl: string;
  networkClient: NetworkClient;
  /** The dish to search for (pass undefined to disable fetching). */
  dish?: string;
  /** The location to search in (pass undefined to disable fetching). */
  location?: string;
  /** Currently unused; reserved for future auth gating. */
  token?: Optional<string>;
  /** Currently unused; reserved for future per-user history. */
  userId?: Optional<string>;
  /** Whether to auto-fetch when dish and location are set. Defaults to true. */
  enabled?: boolean;
}

export interface UseRestaurantsManagerReturn {
  /** Server results or cache fallback (empty array when neither exists). */
  restaurants: Restaurant[];
  /** `true` while the underlying query is loading. */
  isLoading: boolean;
  /** Most recent error message, or `null`. */
  error: Optional<string>;
  /** Whether the displayed restaurants come from cache, not the server. */
  isCached: boolean;
  /** Timestamp (ms) when the cache entry for (dish, location) was saved. */
  cachedAt: Optional<number>;
  /** Manually triggers a refetch. */
  refresh: () => void;
}

/**
 * Unified restaurant-search hook that wraps {@link useRestaurantSearch}
 * with a Zustand-backed per-(dish, location) cache fallback.
 *
 * Shape mirrors {@link useHistoriesManager}.
 */
export const useRestaurantsManager = ({
  baseUrl,
  networkClient,
  dish,
  location,
  enabled = true,
}: UseRestaurantsManagerConfig): UseRestaurantsManagerReturn => {
  const {
    restaurants: clientRestaurants,
    isLoading,
    error,
    refetch,
  } = useRestaurantSearch(networkClient, baseUrl, dish, location, { enabled });

  const cacheEntry = useRestaurantsStore(
    useCallback(
      state =>
        dish && location
          ? state.cache[
              `${dish.trim().toLowerCase()}::${location.trim().toLowerCase()}`
            ]
          : undefined,
      [dish, location]
    )
  );
  const setRestaurants = useRestaurantsStore(state => state.setRestaurants);

  const cachedRestaurants = cacheEntry?.restaurants;
  const cachedAt = cacheEntry?.cachedAt;

  const restaurants = useMemo<Restaurant[]>(
    () =>
      clientRestaurants.length > 0
        ? clientRestaurants
        : (cachedRestaurants ?? []),
    [clientRestaurants, cachedRestaurants]
  );

  const isCached =
    clientRestaurants.length === 0 && (cachedRestaurants?.length ?? 0) > 0;

  // Mirror server results into the cache when fresh data arrives.
  const prevClientRef = useRef<Restaurant[]>(clientRestaurants);
  useEffect(() => {
    if (
      clientRestaurants.length > 0 &&
      dish &&
      location &&
      clientRestaurants !== prevClientRef.current
    ) {
      prevClientRef.current = clientRestaurants;
      setRestaurants(dish, location, clientRestaurants);
    }
  }, [clientRestaurants, dish, location, setRestaurants]);

  return useMemo(
    () => ({
      restaurants,
      isLoading,
      error: error ?? null,
      isCached,
      cachedAt: cachedAt ?? null,
      refresh: refetch,
    }),
    [restaurants, isLoading, error, isCached, cachedAt, refetch]
  );
};
