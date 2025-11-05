import { mapGeoapifyToBusiness } from '@/src/utils/businessMapper';
import { GeoapifyPlace } from '@/src/types';

// Mock the categories constant
jest.mock('@/src/constants/categories', () => ({
  GEOAPIFY_CATEGORIES: {
    restaurants: ['catering.restaurant', 'catering.fine_dining'],
    cafes: ['catering.cafe', 'catering.coffee_shop'],
    fast_food: ['catering.fast_food', 'catering.burger_joint'],
  },
}));

describe('businessMapper', () => {
  const mockGeoapifyPlace: GeoapifyPlace = {
    place_id: 'place123',
    name: 'Test Restaurant',
    formatted: '123 Test St, Test City',
    lat: 40.7128,
    lon: -74.0060,
    categories: ['catering.restaurant', 'commercial.food_and_drink'],
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postcode: '12345',
      country: 'US',
    },
    details: {
      cuisine: 'Italian',
      brand: 'Test Brand',
      takeaway: true,
    },
    distance: 1.5,
  };

  it('maps basic Geoapify place to Business', () => {
    const result = mapGeoapifyToBusiness(mockGeoapifyPlace);

    expect(result.id).toBe('place123');
    expect(result.placeId).toBe('place123');
    expect(result.name).toBe('Test Restaurant');
    expect(result.address).toBe('123 Test St, Test City');
    expect(result.coordinates.latitude).toBe(40.7128);
    expect(result.coordinates.longitude).toBe(-74.0060);
    expect(result.source).toBe('geoapify');
  });

  it('determines correct category from Geoapify categories', () => {
    const restaurantPlace = { ...mockGeoapifyPlace, categories: ['catering.restaurant'] };
    const cafePlace = { ...mockGeoapifyPlace, categories: ['catering.cafe'] };
    const fastFoodPlace = { ...mockGeoapifyPlace, categories: ['catering.fast_food'] };

    expect(mapGeoapifyToBusiness(restaurantPlace).category).toBe('restaurants');
    expect(mapGeoapifyToBusiness(cafePlace).category).toBe('cafes');
    expect(mapGeoapifyToBusiness(fastFoodPlace).category).toBe('fast_food');
  });

  it('estimates price level correctly', () => {
    const fastFoodPlace = { ...mockGeoapifyPlace, categories: ['catering.fast_food'] };
    const cafePlace = { ...mockGeoapifyPlace, categories: ['catering.cafe'] };
    const fineDiningPlace = { 
      ...mockGeoapifyPlace, 
      categories: ['catering.restaurant'],
      details: { cuisine: 'fine_dining' }
    };

    expect(mapGeoapifyToBusiness(fastFoodPlace).priceLevel).toBe(1);
    expect(mapGeoapifyToBusiness(cafePlace).priceLevel).toBe(2);
    expect(mapGeoapifyToBusiness(fineDiningPlace).priceLevel).toBe(3);
  });

  it('handles review stats correctly', () => {
    const reviewStats = { rating: 4.5, reviewCount: 42 };
    const result = mapGeoapifyToBusiness(mockGeoapifyPlace, reviewStats);

    expect(result.rating).toBe(4.5);
    expect(result.reviewCount).toBe(42);
  });

  it('generates placeholder description based on category', () => {
    const restaurantPlace = { ...mockGeoapifyPlace, categories: ['catering.restaurant'] };
    const cafePlace = { ...mockGeoapifyPlace, categories: ['catering.cafe'] };

    const restaurantResult = mapGeoapifyToBusiness(restaurantPlace);
    const cafeResult = mapGeoapifyToBusiness(cafePlace);

    expect(restaurantResult.description).toContain('restaurant');
    expect(cafeResult.description).toContain('cafe');
  });

  it('determines features from place details', () => {
    const result = mapGeoapifyToBusiness(mockGeoapifyPlace);

    expect(result.features).toContain('Takeaway');
    expect(result.features).toContain('Italian Cuisine');
    expect(result.features).toContain('Test Brand');
  });
});