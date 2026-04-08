/**
 * Geographic coordinates.
 */
export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Route information between two points.
 */
export interface RouteInfo {
  mode: 'walking' | 'driving';
  duration: number;
  distance: number;
  coords: [number, number][];
}

/**
 * Geocodes a place name to coordinates using Nominatim.
 *
 * @param query - Place name or address to geocode
 * @returns Coordinates or null if not found
 */
export async function geocode(query: string): Promise<Coords | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    );
    const data: Array<{ lat: string; lon: string }> = await res.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Fetches a route between two points using OSRM.
 *
 * @param from - Origin coordinates
 * @param to - Destination coordinates
 * @param profile - Routing profile ('foot' or 'car')
 * @returns Route duration, distance, and polyline coords, or null on failure
 */
export async function fetchRoute(
  from: Coords,
  to: Coords,
  profile: 'foot' | 'car',
): Promise<{ duration: number; distance: number; coords: [number, number][] } | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`,
    );
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    const route = data.routes[0];
    const coords = (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );
    return { duration: route.duration, distance: route.distance, coords };
  } catch {
    return null;
  }
}

/**
 * Resolves the best transit route between two named locations.
 *
 * Prefers walking if the walk route is under 30 minutes, otherwise drives.
 *
 * @param fromName - Origin place name
 * @param toName - Destination place name
 * @returns The best route info or null if geocoding/routing fails
 */
export async function resolveTransitRoute(
  fromName: string,
  toName: string,
): Promise<RouteInfo | null> {
  const [fromCoords, toCoords] = await Promise.all([geocode(fromName), geocode(toName)]);
  if (!fromCoords || !toCoords) return null;

  const walkRoute = await fetchRoute(fromCoords, toCoords, 'foot');

  if (walkRoute && walkRoute.duration <= 1800) {
    return { mode: 'walking', ...walkRoute };
  }

  const driveRoute = await fetchRoute(fromCoords, toCoords, 'car');
  if (driveRoute) return { mode: 'driving', ...driveRoute };
  if (walkRoute) return { mode: 'walking', ...walkRoute };

  return null;
}
