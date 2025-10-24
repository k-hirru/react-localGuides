import { Business, GeoapifyPlace } from '@/src/types';
import { GEOAPIFY_CATEGORIES } from '@/src/constants/categories';
import MapLibreGL from "@maplibre/maplibre-react-native";

// Unsplash image URLs for placeholders
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', // Restaurant
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800', // Cafe
  'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800', // Fast Food
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', // Generic food
];

export const mapGeoapifyToBusiness = (
  place: GeoapifyPlace, 
  reviewStats: { rating: number; reviewCount: number } = { rating: 0, reviewCount: 0 }
): Business => {
  const category = determineCategory(place.categories);
  const priceLevel = estimatePriceLevel(place);
  
  return {
    id: place.place_id, // Using Geoapify's place_id as primary ID
    placeId: place.place_id,
    name: place.name,
    category,
    rating: reviewStats.rating,
    reviewCount: reviewStats.reviewCount,
    priceLevel,
    imageUrl: getPlaceholderImage(category, place.name),
    address: place.formatted,
    phone: '', // Will be user-provided
    website: '', // Will be user-provided
    hours: generatePlaceholderHours(),
    coordinates: {
      latitude: place.lat,
      longitude: place.lon
    },
    photos: [getPlaceholderImage(category, place.name)], // Single photo for now
    description: generatePlaceholderDescription(place, category),
    features: determineFeatures(place),
    source: 'geoapify'
  };
};

// Helper functions
const determineCategory = (categories: string[]): string => {
  if (categories.some(cat => GEOAPIFY_CATEGORIES.restaurants.includes(cat))) return 'restaurants';
  if (categories.some(cat => GEOAPIFY_CATEGORIES.cafes.includes(cat))) return 'cafes';
  if (categories.some(cat => GEOAPIFY_CATEGORIES.fast_food.includes(cat))) return 'fast_food';
  return 'restaurants'; // Default fallback
};

const estimatePriceLevel = (place: GeoapifyPlace): number => {
  // Simple estimation based on categories and brand
  const { categories, details } = place;
  
  if (categories.includes('catering.fast_food')) return 1;
  if (categories.includes('catering.cafe')) return 2;
  if (categories.includes('catering.restaurant')) {
    // Premium brands or cuisines might indicate higher price
    const premiumCuisines = ['fine_dining', 'steak_house', 'seafood'];
    const isPremium = premiumCuisines.some(cuisine => 
      details.cuisine?.toLowerCase().includes(cuisine)
    );
    return isPremium ? 3 : 2;
  }
  
  return 2; // Default moderate
};

const getPlaceholderImage = (category: string, name: string): string => {
  const index = name.length % PLACEHOLDER_IMAGES.length;
  return PLACEHOLDER_IMAGES[index];
};

const generatePlaceholderHours = () => ({
  'Monday': '9:00 AM - 9:00 PM',
  'Tuesday': '9:00 AM - 9:00 PM',
  'Wednesday': '9:00 AM - 9:00 PM',
  'Thursday': '9:00 AM - 9:00 PM',
  'Friday': '9:00 AM - 10:00 PM',
  'Saturday': '10:00 AM - 10:00 PM',
  'Sunday': '10:00 AM - 8:00 PM'
});

const generatePlaceholderDescription = (place: GeoapifyPlace, category: string): string => {
  const { details, name } = place;
  const cuisine = details.cuisine ? ` serving ${details.cuisine} cuisine` : '';
  
  const descriptions = {
    restaurants: `${name} is a local restaurant${cuisine} offering delicious meals in a welcoming atmosphere.`,
    cafes: `${name} is a cozy cafe perfect for coffee, pastries, and casual meetings.`,
    fast_food: `${name} offers quick and tasty meals for those on the go.`
  };
  
  return descriptions[category as keyof typeof descriptions] || descriptions.restaurants;
};

const determineFeatures = (place: GeoapifyPlace): string[] => {
  const features: string[] = [];
  const { details } = place;
  
  if (details.takeaway) features.push('Takeaway');
  if (details.cuisine) features.push(`${details.cuisine} Cuisine`);
  if (details.brand) features.push(details.brand);
  
  // Add some generic features based on category
  if (place.categories.includes('catering.cafe')) {
    features.push('Coffee', 'Pastries');
  }
  
  return features.length > 0 ? features : ['Local Favorite', 'Great Service'];
};