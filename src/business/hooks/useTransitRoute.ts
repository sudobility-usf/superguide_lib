import { useEffect, useRef, useState } from 'react';
import { type RouteInfo, resolveTransitRoute } from '../utils/geo';

/**
 * Return type for the {@link useTransitRoute} hook.
 */
export interface UseTransitRouteReturn {
  /** The resolved route info, or null if not yet loaded / failed. */
  routeInfo: RouteInfo | null;
  /** Whether the route is currently being resolved. */
  loading: boolean;
  /** Whether route resolution failed. */
  error: boolean;
}

/**
 * Hook that resolves a transit route between two named locations.
 *
 * Geocodes both locations, fetches walking and driving routes,
 * and returns the best option. Prefers walking if under 30 minutes.
 *
 * @param fromName - Origin place name
 * @param toName - Destination place name
 * @returns Route info, loading state, and error flag
 */
export const useTransitRoute = (
  fromName: string,
  toName: string,
): UseTransitRouteReturn => {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    setError(false);
    setRouteInfo(null);

    resolveTransitRoute(fromName, toName).then(result => {
      if (cancelledRef.current) return;
      if (result) {
        setRouteInfo(result);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      cancelledRef.current = true;
    };
  }, [fromName, toName]);

  return { routeInfo, loading, error };
};
