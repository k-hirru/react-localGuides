// /src/services/businessService.ts
import { Business } from '@/src/types';
import { geoapifyService } from './geoapifyService';
import { reviewService } from './reviewService';
import { mapGeoapifyToBusiness } from '@/src/utils/businessMapper';
import { GEOAPIFY_CATEGORIES } from '@/src/constants/categories';

// Helper to map app categories to Geoapify categories (moved outside class)
const mapAppCategoriesToGeoapify = (categories: string[]): string[] => {
  if (categories.length === 0) {
    // Return all food-related categories
    return [
      ...GEOAPIFY_CATEGORIES.restaurants,
      ...GEOAPIFY_CATEGORIES.cafes,
      ...GEOAPIFY_CATEGORIES.fast_food
    ];
  }
  
  const geoapifyCategories: string[] = [];
  
  categories.forEach(category => {
    switch (category) {
      case 'restaurants':
        geoapifyCategories.push(...GEOAPIFY_CATEGORIES.restaurants);
        break;
      case 'cafes':
        geoapifyCategories.push(...GEOAPIFY_CATEGORIES.cafes);
        break;
      case 'fast_food':
        geoapifyCategories.push(...GEOAPIFY_CATEGORIES.fast_food);
        break;
    }
  });
  
  return geoapifyCategories;
};

export const businessService = {
  async getNearbyBusinesses(
    lat: number,
    lng: number,
    radius: number = 5000,
    categories: string[] = []
  ): Promise<Business[]> {
    try {
      // Convert app categories to Geoapify categories
      const geoapifyCategories = mapAppCategoriesToGeoapify(categories);
      
      const places = await geoapifyService.searchNearbyPlaces(
        lat,
        lng,
        radius,
        geoapifyCategories
      );
      
      // Get review stats for all businesses
      const placeIds = places.map(place => place.place_id);
      const reviewsMap = await reviewService.getBusinessesWithReviews(placeIds);
      
      // Map to Business objects with review data
      return places.map(place => {
        const reviewStats = reviewsMap.get(place.place_id) || { rating: 0, reviewCount: 0 };
        return mapGeoapifyToBusiness(place, reviewStats);
      });
      
    } catch (error) {
      console.error('Error fetching nearby businesses:', error);
      throw new Error('Failed to load nearby businesses');
    }
  },

  async searchBusinesses(
    query: string,
    lat: number,
    lng: number,
    radius: number = 5000
  ): Promise<Business[]> {
    // For now, filter from nearby results since we don't have text search in Geoapify yet
    const nearbyBusinesses = await this.getNearbyBusinesses(lat, lng, radius);
    
    return nearbyBusinesses.filter(business =>
      business.name.toLowerCase().includes(query.toLowerCase()) ||
      business.address.toLowerCase().includes(query.toLowerCase()) ||
      business.features.some(feature => 
        feature.toLowerCase().includes(query.toLowerCase())
      )
    );
  },

  async getBusinessById(placeId: string): Promise<Business | null> {
    try {
      const place = await geoapifyService.getPlaceDetails(placeId);
      const reviews = await reviewService.getReviewsForBusiness(placeId);
      
      const reviewStats = {
        rating: reviews.length > 0 
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
          : 0,
        reviewCount: reviews.length
      };
      
      return mapGeoapifyToBusiness(place, reviewStats);
    } catch (error) {
      console.error('Error fetching business details:', error);
      return null;
    }
  },
};