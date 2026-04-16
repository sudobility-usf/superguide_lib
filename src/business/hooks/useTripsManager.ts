import { useCallback, useMemo } from 'react';
import type {
  ItinDay,
  NetworkClient,
  Optional,
  TripGenerateRequest,
} from '@sudobility/superguide_types';
import { useGenerateTrip } from '@sudobility/superguide_client';
import { useTripsStore } from '../stores/tripsStore';

/**
 * Configuration for {@link useTripsManager}.
 *
 * The config mirrors {@link UseHistoriesManagerConfig} so both frontends
 * can inject a shared `{ baseUrl, networkClient }` pair. `token` and `userId`
 * are accepted for API parity even though trip generation is a public endpoint
 * today — keeping them here means future auth gating is a backend-only change.
 */
export interface UseTripsManagerConfig {
  baseUrl: string;
  networkClient: NetworkClient;
  /** Currently unused; reserved for future auth gating. */
  token?: Optional<string>;
  /** Currently unused; reserved for future per-user history. */
  userId?: Optional<string>;
}

export interface UseTripsManagerReturn {
  /** The most recently generated itinerary (server or cache), or `null`. */
  itinerary: Optional<ItinDay[]>;
  /** The request that produced {@link itinerary}, or `null`. */
  lastRequest: Optional<TripGenerateRequest>;
  /** `true` while a generate request is in flight. */
  isGenerating: boolean;
  /** Most recent error message, or `null`. */
  error: Optional<string>;
  /** Whether the current itinerary came from the Zustand cache. */
  isCached: boolean;
  /** Timestamp (ms) when the cached itinerary was saved, or `null`. */
  cachedAt: Optional<number>;
  /**
   * Generate a new itinerary and persist it to the store.
   * @throws Error if the API call fails or returns `success: false`.
   */
  generateTrip: (data: TripGenerateRequest) => Promise<ItinDay[]>;
  /** Clears the stored itinerary. */
  reset: () => void;
}

/**
 * Unified trip-generation hook that wraps {@link useGenerateTrip} with
 * Zustand-backed persistence of the last itinerary.
 *
 * Shape mirrors {@link useHistoriesManager} so both frontends (web and RN)
 * consume the same manager.
 */
export const useTripsManager = ({
  baseUrl,
  networkClient,
}: UseTripsManagerConfig): UseTripsManagerReturn => {
  const {
    generateTrip: clientGenerate,
    isGenerating,
    error: clientError,
    data: clientData,
  } = useGenerateTrip(networkClient, baseUrl);

  const lastTrip = useTripsStore(state => state.lastTrip);
  const setLastTrip = useTripsStore(state => state.setLastTrip);
  const clear = useTripsStore(state => state.clear);

  const itinerary = useMemo<Optional<ItinDay[]>>(() => {
    if (clientData?.itin) return clientData.itin;
    return lastTrip?.itin ?? null;
  }, [clientData, lastTrip]);

  const isCached = !clientData && !!lastTrip;

  const generateTrip = useCallback(
    async (data: TripGenerateRequest): Promise<ItinDay[]> => {
      const response = await clientGenerate(data);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate trip');
      }
      setLastTrip(data, response.data.itin);
      return response.data.itin;
    },
    [clientGenerate, setLastTrip]
  );

  return useMemo(
    () => ({
      itinerary,
      lastRequest: clientData ? null : (lastTrip?.request ?? null),
      isGenerating,
      error: clientError ?? null,
      isCached,
      cachedAt: lastTrip?.cachedAt ?? null,
      generateTrip,
      reset: clear,
    }),
    [
      itinerary,
      clientData,
      lastTrip,
      isGenerating,
      clientError,
      isCached,
      generateTrip,
      clear,
    ]
  );
};
