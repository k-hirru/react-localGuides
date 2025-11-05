import { businessService } from '@/src/services/businessService';
import { Business } from '@/src/types';

// Mock dependencies
jest.mock('@/src/services/geoapifyService', () => ({
  geoapifyService: {
    searchNearbyPlaces: jest.fn(),
    getPlaceDetails: jest.fn(),
    searchPlacesByName: jest.fn(),
  },
}));

jest.mock('@/src/services/reviewService', () => ({
  reviewService: {
    getBusinessesWithReviews: jest.fn(),
    getReviewsForBusiness: jest.fn(),
  },
}));

jest.mock('@/src/utils/businessMapper', () => ({
  mapGeoapifyToBusiness: jest.fn(),
}));

describe('businessService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getNearbyBusinesses integrates geoapify and review services', async () => {
    const mockGeoapify = require('@/src/services/geoapifyService').geoapifyService;
    const mockReview = require('@/src/services/reviewService').reviewService;
    const mockMapper = require('@/src/utils/businessMapper').mapGeoapifyToBusiness;

    const mockPlaces = [
      { place_id: '1', name: 'Place 1' },
      { place_id: '2', name: 'Place 2' },
    ];
    const mockReviews = new Map([
      ['1', { rating: 4.5, reviewCount: 10 }],
      ['2', { rating: 3.8, reviewCount: 5 }],
    ]);
    const mockBusinesses = [
      { id: '1', name: 'Business 1' },
      { id: '2', name: 'Business 2' },
    ];

    mockGeoapify.searchNearbyPlaces.mockResolvedValue(mockPlaces);
    mockReview.getBusinessesWithReviews.mockResolvedValue(mockReviews);
    mockMapper
      .mockReturnValueOnce(mockBusinesses[0])
      .mockReturnValueOnce(mockBusinesses[1]);

    const result = await businessService.getNearbyBusinesses(40.7128, -74.0060);

    expect(mockGeoapify.searchNearbyPlaces).toHaveBeenCalledWith(40.7128, -74.0060, 5000, ['catering.restaurant', 'catering.cafe', 'catering.fast_food'], 20, false);
    expect(mockReview.getBusinessesWithReviews).toHaveBeenCalledWith(['1', '2']);
    expect(result).toEqual(mockBusinesses);
  });

  it('getBusinessById fetches place details and reviews', async () => {
    const mockGeoapify = require('@/src/services/geoapifyService').geoapifyService;
    const mockReview = require('@/src/services/reviewService').reviewService;
    const mockMapper = require('@/src/utils/businessMapper').mapGeoapifyToBusiness;

    const mockPlace = { place_id: '123', name: 'Test Place' };
    const mockReviews = [
      { rating: 5 }, { rating: 4 }, { rating: 3 }
    ];
    const mockBusiness = { id: '123', name: 'Test Business' };

    mockGeoapify.getPlaceDetails.mockResolvedValue(mockPlace);
    mockReview.getReviewsForBusiness.mockResolvedValue(mockReviews);
    mockMapper.mockReturnValue(mockBusiness);

    const result = await businessService.getBusinessById('123');

    expect(mockGeoapify.getPlaceDetails).toHaveBeenCalledWith('123');
    expect(mockReview.getReviewsForBusiness).toHaveBeenCalledWith('123');
    expect(mockMapper).toHaveBeenCalledWith(mockPlace, {
      rating: 4, // (5+4+3)/3 = 4
      reviewCount: 3,
    });
    expect(result).toEqual(mockBusiness);
  });

  it('searchBusinessesWithQuery uses geocoding search', async () => {
    const mockGeoapify = require('@/src/services/geoapifyService').geoapifyService;
    const mockReview = require('@/src/services/reviewService').reviewService;
    const mockMapper = require('@/src/utils/businessMapper').mapGeoapifyToBusiness;

    const mockPlaces = [{ place_id: '1', name: 'Pizza Place' }];
    const mockReviews = new Map([['1', { rating: 4.2, reviewCount: 8 }]]);
    const mockBusiness = { id: '1', name: 'Pizza Business' };

    mockGeoapify.searchPlacesByName.mockResolvedValue(mockPlaces);
    mockReview.getBusinessesWithReviews.mockResolvedValue(mockReviews);
    mockMapper.mockReturnValue(mockBusiness);

    const result = await businessService.searchBusinessesWithQuery(
      'pizza',
      40.7128,
      -74.0060
    );

    expect(mockGeoapify.searchPlacesByName).toHaveBeenCalledWith(
      'pizza',
      40.7128,
      -74.0060,
      5000,
      ['catering.restaurant', 'catering.cafe', 'catering.fast_food'],
      20,
      false
    );
    expect(result).toEqual([mockBusiness]);
  });

  it('searchBusinesses filters nearby businesses by query', async () => {
    const mockBusinesses = [
      { id: '1', name: 'Pizza Place', address: '123 St', features: ['Italian'] },
      { id: '2', name: 'Burger Joint', address: '456 Ave', features: ['Fast Food'] },
    ];

    // Mock getNearbyBusinesses to return our test data
    const originalGetNearby = businessService.getNearbyBusinesses;
    businessService.getNearbyBusinesses = jest.fn().mockResolvedValue(mockBusinesses);

    const result = await businessService.searchBusinesses('pizza', 40.7128, -74.0060);

    expect(result).toEqual([mockBusinesses[0]]);
    
    // Restore original method
    businessService.getNearbyBusinesses = originalGetNearby;
  });

  it('mapAppCategoriesToGeoapify maps categories correctly', () => {
    // Test the internal function by calling the service method that uses it
    const mockGeoapify = require('@/src/services/geoapifyService').geoapifyService;
    mockGeoapify.searchNearbyPlaces.mockResolvedValue([]);
    
    businessService.getNearbyBusinesses(40.7128, -74.0060, 5000, ['restaurants', 'cafes']);
    
    expect(mockGeoapify.searchNearbyPlaces).toHaveBeenCalledWith(
      40.7128, -74.0060, 5000, 
      ['catering.restaurant', 'catering.cafe'], // Mapped categories
      20, false
    );
  });
});