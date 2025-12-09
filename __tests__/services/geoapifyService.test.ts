import { geoapifyService } from '@/src/services/geoapifyService';
import { GeoapifyPlace } from '@/src/types';

// Helper to mock global fetch
const mockFetch = (response: Partial<Response> & { jsonData?: any }) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    text: jest.fn().mockResolvedValue(response.text ?? ''),
    json: jest.fn().mockResolvedValue(response.jsonData ?? {}),
  } as any);
};

describe('geoapifyService.executeSearchRequest via searchNearbyPlaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (geoapifyService as any).clearCache();
  });

  it('builds the correct URL and transforms features', async () => {
    const mockPlaces: GeoapifyPlace[] = [
      {
        place_id: 'p1',
        name: 'Place One',
        formatted: 'Addr 1',
        lat: 14.5,
        lon: 121.0,
        categories: ['catering.restaurant'],
        address: {
          street: 'S',
          city: 'C',
          state: 'St',
          postcode: '123',
          country: 'PH',
        },
        details: {
          cuisine: 'filipino',
          brand: 'Brand',
          takeaway: true,
        },
        distance: 100,
      },
    ];

    mockFetch({
      ok: true,
      jsonData: {
        features: [
          {
            properties: {
              place_id: 'p1',
              name: 'Place One',
              formatted: 'Addr 1',
              lat: 14.5,
              lon: 121.0,
              categories: ['catering.restaurant'],
              street: 'S',
              city: 'C',
              state: 'St',
              postcode: '123',
              country: 'PH',
              cuisine: ['filipino'],
              brand: 'Brand',
              takeaway: true,
              distance: 100,
            },
            geometry: {
              type: 'Point',
              coordinates: [121.0, 14.5],
            },
          },
        ],
      },
    });

    const result = await geoapifyService.searchNearbyPlaces(14.5, 121.0, 5000);

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/v2/places');
    // Categories are joined with commas; we don't assert on URL encoding here
    expect(url).toContain('categories=catering.restaurant,catering.fast_food,catering.cafe');
    expect(url).toContain('filter=circle:121,14.5,5000');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      place_id: 'p1',
      name: 'Place One',
      formatted: 'Addr 1',
      lat: 14.5,
      lon: 121.0,
      categories: ['catering.restaurant'],
    });
  });

  it('uses cache on repeated calls without forceRefresh', async () => {
    mockFetch({
      ok: true,
      jsonData: {
        features: [],
      },
    });

    const first = await geoapifyService.searchNearbyPlaces(14.5, 121.0, 5000);
    const second = await geoapifyService.searchNearbyPlaces(14.5, 121.0, 5000);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(first).toBe(second); // same array instance from cache
  });

  it('falls back to stale cache when request fails', async () => {
    // Seed cache via a successful request
    mockFetch({ ok: true, jsonData: { features: [] } });
    await geoapifyService.searchNearbyPlaces(14.5, 121.0, 5000);

    // Now make fetch fail
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('server error'),
    } as any);

    const result = await geoapifyService.searchNearbyPlaces(14.5, 121.0, 5000);

    // Should not throw, should use stale cache (empty array)
    expect(Array.isArray(result)).toBe(true);
  });
});
