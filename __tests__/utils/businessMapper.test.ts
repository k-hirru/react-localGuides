import { mapGeoapifyToBusiness } from '@/src/utils/businessMapper';
import { GEOAPIFY_CATEGORIES } from '@/src/constants/categories';
import { GeoapifyPlace } from '@/src/types';

const basePlace: GeoapifyPlace = {
  place_id: 'place-1',
  name: 'Test Place',
  formatted: '123 Test St, City',
  lat: 14.5,
  lon: 121.0,
  categories: ['catering.restaurant'],
  address: {
    street: '123 Test St',
    city: 'City',
    state: 'State',
    postcode: '12345',
    country: 'PH',
  },
  details: {
    cuisine: 'filipino',
    brand: 'Local Brand',
    takeaway: true,
  },
  distance: 100,
};

describe('mapGeoapifyToBusiness', () => {
  it('maps basic fields and review stats correctly', () => {
    const business = mapGeoapifyToBusiness(basePlace, {
      rating: 4.2,
      reviewCount: 10,
    });

    expect(business.id).toBe('place-1');
    expect(business.placeId).toBe('place-1');
    expect(business.name).toBe('Test Place');
    expect(business.address).toBe('123 Test St, City');
    expect(business.coordinates).toEqual({ latitude: 14.5, longitude: 121.0 });
    expect(business.rating).toBe(4.2);
    expect(business.reviewCount).toBe(10);
    expect(business.source).toBe('geoapify');
  });

  it('determines category based on Geoapify categories', () => {
    const cafePlace = { ...basePlace, categories: GEOAPIFY_CATEGORIES.cafes };
    const fastFoodPlace = {
      ...basePlace,
      categories: GEOAPIFY_CATEGORIES.fast_food,
    };

    const cafeBusiness = mapGeoapifyToBusiness(cafePlace);
    const fastFoodBusiness = mapGeoapifyToBusiness(fastFoodPlace);

    expect(cafeBusiness.category).toBe('cafes');
    expect(fastFoodBusiness.category).toBe('fast_food');
  });

  it('estimates price level based on categories and cuisine', () => {
    const cheapPlace: GeoapifyPlace = {
      ...basePlace,
      categories: ['catering.fast_food'],
    };

    const cafePlace: GeoapifyPlace = {
      ...basePlace,
      categories: ['catering.cafe'],
    };

    const premiumRestaurant: GeoapifyPlace = {
      ...basePlace,
      categories: ['catering.restaurant'],
      details: { ...basePlace.details, cuisine: 'fine_dining' },
    };

    expect(mapGeoapifyToBusiness(cheapPlace).priceLevel).toBe(1);
    expect(mapGeoapifyToBusiness(cafePlace).priceLevel).toBe(2);
    expect(mapGeoapifyToBusiness(premiumRestaurant).priceLevel).toBe(3);
  });

  it('generates features from details and categories', () => {
    const cafePlace: GeoapifyPlace = {
      ...basePlace,
      categories: ['catering.cafe'],
      details: {
        cuisine: 'filipino',
        brand: 'Cafe Brand',
        takeaway: true,
      },
    };

    const business = mapGeoapifyToBusiness(cafePlace);

    expect(business.features).toEqual(
      expect.arrayContaining(['Takeaway', 'filipino Cuisine', 'Cafe Brand', 'Coffee']),
    );
  });

  it('falls back to default features when none detected', () => {
    const noFeaturePlace: GeoapifyPlace = {
      ...basePlace,
      categories: [],
      details: {
        cuisine: undefined as any,
        brand: undefined as any,
        takeaway: false,
      },
    };

    const business = mapGeoapifyToBusiness(noFeaturePlace);

    expect(business.features).toEqual(expect.arrayContaining(['Local Favorite', 'Great Service']));
  });
});
