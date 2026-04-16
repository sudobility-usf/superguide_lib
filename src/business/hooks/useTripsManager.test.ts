import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type {
  ItinDay,
  TripGenerateResponse,
  BaseResponse,
} from '@sudobility/superguide_types';
import { useTripsStore } from '../stores/tripsStore';
import type { UseTripsManagerConfig } from './useTripsManager';

// --- Mocks ---

const mockGenerateTrip = vi.fn();
const mockReset = vi.fn();

let mockGenerateReturn = {
  generateTrip: mockGenerateTrip,
  isGenerating: false,
  error: null as string | null,
  data: null as TripGenerateResponse | null,
  reset: mockReset,
};

vi.mock('@sudobility/superguide_client', () => ({
  useGenerateTrip: () => mockGenerateReturn,
}));

const { useTripsManager } = await import('./useTripsManager');

// --- Helpers ---

const day = (n: number): ItinDay => ({
  day: n,
  date: `2024-01-0${n}`,
  schedule: [],
});

const defaultConfig: UseTripsManagerConfig = {
  baseUrl: 'https://api.example.com',
  networkClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
};

describe('useTripsManager', () => {
  beforeEach(() => {
    useTripsStore.getState().clear();
    mockGenerateTrip.mockReset();
    mockReset.mockReset();
    mockGenerateReturn = {
      generateTrip: mockGenerateTrip,
      isGenerating: false,
      error: null,
      data: null,
      reset: mockReset,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic data flow', () => {
    it('returns null itinerary when nothing has been generated or cached', () => {
      const { result } = renderHook(() => useTripsManager(defaultConfig));
      expect(result.current.itinerary).toBeNull();
      expect(result.current.isCached).toBe(false);
      expect(result.current.cachedAt).toBeNull();
    });

    it('returns the client itinerary when present', () => {
      mockGenerateReturn.data = { itin: [day(1), day(2)] };
      const { result } = renderHook(() => useTripsManager(defaultConfig));
      expect(result.current.itinerary).toHaveLength(2);
      expect(result.current.isCached).toBe(false);
    });
  });

  describe('cache fallback', () => {
    it('falls back to the stored itinerary when the client has none', () => {
      useTripsStore
        .getState()
        .setLastTrip(
          { location: 'NYC', start_date: '2024-01-01', end_date: '2024-01-02' },
          [day(1)]
        );

      const { result } = renderHook(() => useTripsManager(defaultConfig));
      expect(result.current.itinerary).toHaveLength(1);
      expect(result.current.isCached).toBe(true);
      expect(result.current.cachedAt).toBeGreaterThan(0);
      expect(result.current.lastRequest?.location).toBe('NYC');
    });

    it('prefers client data over cache', () => {
      useTripsStore
        .getState()
        .setLastTrip(
          { location: 'OLD', start_date: '2024-01-01', end_date: '2024-01-02' },
          [day(1)]
        );
      mockGenerateReturn.data = { itin: [day(2), day(3)] };

      const { result } = renderHook(() => useTripsManager(defaultConfig));
      expect(result.current.itinerary).toHaveLength(2);
      expect(result.current.itinerary?.[0].day).toBe(2);
      expect(result.current.isCached).toBe(false);
      expect(result.current.lastRequest).toBeNull();
    });
  });

  describe('loading and error', () => {
    it('surfaces isGenerating', () => {
      mockGenerateReturn.isGenerating = true;
      const { result } = renderHook(() => useTripsManager(defaultConfig));
      expect(result.current.isGenerating).toBe(true);
    });

    it('surfaces the client error', () => {
      mockGenerateReturn.error = 'boom';
      const { result } = renderHook(() => useTripsManager(defaultConfig));
      expect(result.current.error).toBe('boom');
    });
  });

  describe('generateTrip', () => {
    it('persists the itinerary to the store on success', async () => {
      const response: BaseResponse<TripGenerateResponse> = {
        success: true,
        data: { itin: [day(1)] },
      };
      mockGenerateTrip.mockResolvedValue(response);

      const { result } = renderHook(() => useTripsManager(defaultConfig));

      await act(async () => {
        await result.current.generateTrip({
          location: 'Paris',
          start_date: '2024-05-01',
          end_date: '2024-05-05',
        });
      });

      const stored = useTripsStore.getState().getLastTrip();
      expect(stored?.itin).toHaveLength(1);
      expect(stored?.request.location).toBe('Paris');
    });

    it('throws on failure response', async () => {
      mockGenerateTrip.mockResolvedValue({
        success: false,
        error: 'bad date range',
      });

      const { result } = renderHook(() => useTripsManager(defaultConfig));

      await expect(
        act(async () => {
          await result.current.generateTrip({
            location: 'X',
            start_date: 'a',
            end_date: 'b',
          });
        })
      ).rejects.toThrow('bad date range');
    });

    it('throws a default message when no error text is provided', async () => {
      mockGenerateTrip.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useTripsManager(defaultConfig));

      await expect(
        act(async () => {
          await result.current.generateTrip({
            location: 'X',
            start_date: 'a',
            end_date: 'b',
          });
        })
      ).rejects.toThrow('Failed to generate trip');
    });
  });

  describe('reset', () => {
    it('clears the cached itinerary', () => {
      useTripsStore
        .getState()
        .setLastTrip(
          { location: 'X', start_date: 'a', end_date: 'b' },
          [day(1)]
        );

      const { result } = renderHook(() => useTripsManager(defaultConfig));
      expect(result.current.itinerary).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(useTripsStore.getState().lastTrip).toBeUndefined();
    });
  });
});
