import AsyncStorage from '@react-native-async-storage/async-storage';
import { businessService } from '@/src/services/businessService';
import { geoapifyService } from '@/src/services/geoapifyService';
import { reviewService } from '@/src/services/reviewService';
import { Business } from '@/src/types';
import type { Mocked } from 'jest-mock';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/src/services/reviewService');
// Simplify behavior of the business mapper so mapping cannot throw during tests
jest.mock('@/src/utils/businessMapper', () => ({
  mapGeoapifyToBusiness: (place: any, stats: { rating: number; reviewCount: number }) => ({
    id: place.place_id,
    name: place.name,
    address: place.formatted || 'Address',
    category: 'restaurants',
    coordinates: { latitude: place.lat, longitude: place.lon },
    features: [],
    rating: stats.rating,
    reviewCount: stats.reviewCount,
    priceLevel: 2,
    source: 'geoapify',
    city: place.address?.city,
    country: place.address?.country,
  }),
}));

const mockedAsyncStorage = AsyncStorage as Mocked<typeof AsyncStorage>;
const mockedReviews = reviewService as Mocked<typeof reviewService>;

const baseLat = 14.5995;
const baseLng = 120.9842;

const sampleBusinesses: Business[] = [
  {
    id: 'place-1',
    name: 'Test Place',
    address: '123 Street',
    category: 'restaurants',
    coordinates: { latitude: baseLat, longitude: baseLng },
    features: [],
    rating: 4,
    reviewCount: 2,
    priceLevel: 2,
    source: 'geoapify',
    city: 'Manila',
    country: 'Philippines',
  } as any,
];

describe('businessService.getNearbyBusinesses AsyncStorage caching', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
    jest.restoreAllMocks();
  });

  it('fetches from Geoapify and writes fresh cache when no existing cache', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null);
    const searchSpy = jest
      .spyOn(geoapifyService, 'searchNearbyPlaces')
      .mockResolvedValueOnce([
      {
        place_id: 'place-1',
        name: 'Test Place',
        formatted: '123 Street',
        lat: baseLat,
        lon: baseLng,
        categories: ['catering.restaurant'],
        address: { city: 'Manila', country: 'Philippines' },
      } as any,
    ]);
    mockedReviews.getBusinessesWithReviews.mockResolvedValueOnce(
      new Map([['place-1', { rating: 4, reviewCount: 2 }]])
    );

    const result = await businessService.getNearbyBusinesses(baseLat, baseLng, 5000, [], false);

    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(1);
    const [key, payload] = (mockedAsyncStorage.setItem as any).mock.calls[0];
    expect(key).toContain('nearbyBusinesses_v1');
    const parsed = JSON.parse(payload);
    expect(parsed).toHaveProperty('businesses');
    expect(parsed).toHaveProperty('updatedAt');
  });

  it('returns fresh cached businesses when cache age is below max age', async () => {
    const cachedPayload = {
      businesses: sampleBusinesses,
      updatedAt: Date.now(),
    };
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cachedPayload));

    const result = await businessService.getNearbyBusinesses(baseLat, baseLng, 5000, [], false);

    // We should get back the cached businesses
    expect(result).toEqual(sampleBusinesses);
  });

  it('ignores stale cache and refetches, then updates cache', async () => {
    const stalePayload = {
      businesses: sampleBusinesses,
      // 7 hours ago (stale vs 6h max)
      updatedAt: Date.now() - 7 * 60 * 60 * 1000,
    };
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(stalePayload));

    const searchSpy = jest
      .spyOn(geoapifyService, 'searchNearbyPlaces')
      .mockResolvedValueOnce([
      {
        place_id: 'place-1',
        name: 'Fresh Place',
        formatted: '456 Street',
        lat: baseLat,
        lon: baseLng,
        categories: ['catering.restaurant'],
        address: { city: 'Manila', country: 'Philippines' },
      } as any,
    ]);
    mockedReviews.getBusinessesWithReviews.mockResolvedValueOnce(
      new Map([['place-1', { rating: 5, reviewCount: 10 }]])
    );

    const result = await businessService.getNearbyBusinesses(baseLat, baseLng, 5000, [], false);

    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalled();
    expect(result[0].name).toBe('Fresh Place');
  });

  it('bypasses cache when forceRefresh is true', async () => {
    const cachedPayload = {
      businesses: sampleBusinesses,
      updatedAt: Date.now(),
    };
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cachedPayload));

    const searchSpy = jest
      .spyOn(geoapifyService, 'searchNearbyPlaces')
      .mockResolvedValueOnce([
      {
        place_id: 'place-1',
        name: 'Forced Fresh Place',
        formatted: '789 Street',
        lat: baseLat,
        lon: baseLng,
        categories: ['catering.restaurant'],
        address: { city: 'Manila', country: 'Philippines' },
      } as any,
    ]);
    mockedReviews.getBusinessesWithReviews.mockResolvedValueOnce(
      new Map([['place-1', { rating: 3, reviewCount: 1 }]])
    );

    const result = await businessService.getNearbyBusinesses(baseLat, baseLng, 5000, [], true);

    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(result[0].name).toBe('Forced Fresh Place');
  });
});
