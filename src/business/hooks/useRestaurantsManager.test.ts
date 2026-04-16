import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Restaurant } from '@sudobility/superguide_types';
import { useRestaurantsStore } from '../stores/restaurantsStore';
import type { UseRestaurantsManagerConfig } from './useRestaurantsManager';

// --- Mocks ---

const mockRefetch = vi.fn();

let mockSearchReturn = {
  restaurants: [] as Restaurant[],
  isLoading: false,
  error: null as string | null,
  refetch: mockRefetch,
};

vi.mock('@sudobility/superguide_client', () => ({
  useRestaurantSearch: () => mockSearchReturn,
}));

const { useRestaurantsManager } = await import('./useRestaurantsManager');

// --- Helpers ---

const rest = (overrides: Partial<Restaurant> = {}): Restaurant => ({
  restaurantname: 'Joes',
  address: '1 Main St',
  ...overrides,
});

const defaultConfig: UseRestaurantsManagerConfig = {
  baseUrl: 'https://api.example.com',
  networkClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  dish: 'pizza',
  location: 'NYC',
};

describe('useRestaurantsManager', () => {
  beforeEach(() => {
    useRestaurantsStore.getState().clearAll();
    mockRefetch.mockReset();
    mockSearchReturn = {
      restaurants: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty when neither server nor cache has data', () => {
    const { result } = renderHook(() => useRestaurantsManager(defaultConfig));
    expect(result.current.restaurants).toEqual([]);
    expect(result.current.isCached).toBe(false);
    expect(result.current.cachedAt).toBeNull();
  });

  it('returns server data when present', () => {
    mockSearchReturn.restaurants = [rest(), rest({ restaurantname: 'Ann' })];
    const { result } = renderHook(() => useRestaurantsManager(defaultConfig));
    expect(result.current.restaurants).toHaveLength(2);
    expect(result.current.isCached).toBe(false);
  });

  it('falls back to the cache when server is empty', () => {
    useRestaurantsStore.getState().setRestaurants('pizza', 'NYC', [rest()]);
    const { result } = renderHook(() => useRestaurantsManager(defaultConfig));
    expect(result.current.restaurants).toHaveLength(1);
    expect(result.current.isCached).toBe(true);
    expect(result.current.cachedAt).toBeGreaterThan(0);
  });

  it('prefers server data over cache', () => {
    useRestaurantsStore
      .getState()
      .setRestaurants('pizza', 'NYC', [rest({ restaurantname: 'Old' })]);
    mockSearchReturn.restaurants = [rest({ restaurantname: 'New' })];

    const { result } = renderHook(() => useRestaurantsManager(defaultConfig));
    expect(result.current.restaurants[0].restaurantname).toBe('New');
    expect(result.current.isCached).toBe(false);
  });

  it('writes server data into the cache', () => {
    mockSearchReturn.restaurants = [rest({ restaurantname: 'Sync' })];
    renderHook(() => useRestaurantsManager(defaultConfig));
    const cached = useRestaurantsStore
      .getState()
      .getRestaurants('pizza', 'NYC');
    expect(cached).toEqual([rest({ restaurantname: 'Sync' })]);
  });

  it('surfaces loading and error from the underlying query', () => {
    mockSearchReturn.isLoading = true;
    mockSearchReturn.error = 'nope';
    const { result } = renderHook(() => useRestaurantsManager(defaultConfig));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('nope');
  });

  it('exposes refetch as refresh', () => {
    const { result } = renderHook(() => useRestaurantsManager(defaultConfig));
    result.current.refresh();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
