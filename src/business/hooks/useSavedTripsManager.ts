import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  NetworkClient,
  Optional,
  Trip,
  TripCreateRequest,
} from '@sudobility/superguide_types';
import type { FirebaseIdToken } from '@sudobility/superguide_client';
import { useSavedTrips } from '@sudobility/superguide_client';

/**
 * Configuration for {@link useSavedTripsManager}.
 *
 * Shape mirrors {@link useHistoriesManager} so both frontends consume the
 * manager identically.
 */
export interface UseSavedTripsManagerConfig {
  baseUrl: string;
  networkClient: NetworkClient;
  userId: Optional<string>;
  token: Optional<FirebaseIdToken>;
  /** Auto-fetch on mount when userId + token are present. Defaults to true. */
  autoFetch?: boolean;
}

export interface UseSavedTripsManagerReturn {
  trips: Trip[];
  isLoading: boolean;
  error: Optional<string>;
  /** Persist a trip; returns the saved Trip on success, throws on failure. */
  saveTrip: (data: TripCreateRequest) => Promise<Trip>;
  /** Delete a trip by id; throws on failure. */
  deleteTrip: (tripId: string) => Promise<void>;
  /** Trigger a list refetch. */
  refresh: () => void;
}

/**
 * Unified saved-trips manager. Lists, saves, and deletes trips for the
 * authenticated user via {@link useSavedTrips}. No Zustand cache — the
 * TanStack Query cache is already per-user and refreshes on mutation.
 */
export const useSavedTripsManager = ({
  baseUrl,
  networkClient,
  userId,
  token,
  autoFetch = true,
}: UseSavedTripsManagerConfig): UseSavedTripsManagerReturn => {
  const {
    trips,
    isLoading,
    error,
    update,
    createTrip: clientCreate,
    deleteTrip: clientDelete,
  } = useSavedTrips(
    networkClient,
    baseUrl,
    userId ?? null,
    token ?? null
  );

  const saveTrip = useCallback(
    async (data: TripCreateRequest): Promise<Trip> => {
      const response = await clientCreate(data);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to save trip');
      }
      return response.data;
    },
    [clientCreate]
  );

  const deleteTrip = useCallback(
    async (tripId: string): Promise<void> => {
      const response = await clientDelete(tripId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete trip');
      }
    },
    [clientDelete]
  );

  const hasAttemptedFetchRef = useRef(false);

  useEffect(() => {
    if (
      autoFetch &&
      token &&
      userId &&
      trips.length === 0 &&
      !hasAttemptedFetchRef.current
    ) {
      hasAttemptedFetchRef.current = true;
      update();
    }
  }, [autoFetch, token, userId, trips.length, update]);

  useEffect(() => {
    hasAttemptedFetchRef.current = false;
  }, [token]);

  return useMemo(
    () => ({
      trips,
      isLoading,
      error,
      saveTrip,
      deleteTrip,
      refresh: update,
    }),
    [trips, isLoading, error, saveTrip, deleteTrip, update]
  );
};
