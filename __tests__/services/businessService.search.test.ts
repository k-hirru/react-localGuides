import { businessService } from '@/src/services/businessService';
import { geoapifyService } from '@/src/services/geoapifyService';
import { reviewService } from '@/src/services/reviewService';
import type { Mocked } from 'jest-mock';

jest.mock('@/src/services/geoapifyService');
jest.mock('@/src/services/reviewService');
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
    placeId: place.place_id,
  }),
}));

const mockedGeo = geoapifyService as Mocked<typeof geoapifyService>;
const mockedReviews = reviewService as Mocked<typeof reviewService>;

const lat = 14.5995;
const lng = 120.9842;

describe('businessService.searchBusinessesWithQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns mapped businesses when Geoapify geocoding yields results', async () => {
    mockedGeo.searchPlacesByName.mockResolvedValueOnce([
      {
        place_id: 'place-1',
        name: 'Search Place',
        formatted: '123 Street',
        lat,
        lon: lng,
        categories: ['catering.restaurant'],
        address: { city: 'Manila', country: 'Philippines' },
      } as any,
    ]);

    mockedReviews.getBusinessesWithReviews.mockResolvedValueOnce(
      new Map([['place-1', { rating: 4.5, reviewCount: 3 }]]),
    );

    const results = await businessService.searchBusinessesWithQuery(
      'cafe',
      lat,
      lng,
      5000,
      [],
      false,
    );

    expect(mockedGeo.searchPlacesByName).toHaveBeenCalledWith(
      'cafe',
      lat,
      lng,
      5000,
      ['catering.restaurant', 'catering.cafe', 'catering.fast_food'],
      40,
      false,
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 'place-1', name: 'Search Place', rating: 4.5 });
  });

  it('returns an empty array when Geoapify returns no places', async () => {
    mockedGeo.searchPlacesByName.mockResolvedValueOnce([]);

    const results = await businessService.searchBusinessesWithQuery(
      'nothing',
      lat,
      lng,
      5000,
      [],
      false,
    );

    expect(results).toEqual([]);
  });

  it('returns an empty array on error without throwing', async () => {
    mockedGeo.searchPlacesByName.mockRejectedValueOnce(new Error('network error'));

    const results = await businessService.searchBusinessesWithQuery(
      'error',
      lat,
      lng,
      5000,
      [],
      false,
    );

    expect(results).toEqual([]);
  });
});
