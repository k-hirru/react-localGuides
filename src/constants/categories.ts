export const CATEGORIES = [
  { id: 'all', name: 'All', icon: '🏪' },
  { id: 'restaurants', name: 'Restaurants', icon: '🍽️' },
  { id: 'cafes', name: 'Cafes', icon: '☕' },
  { id: 'fast_food', name: 'Fast Food', icon: '🍔' }, // Changed from 'bars'
];

// Geoapify category mapping
export const GEOAPIFY_CATEGORIES = {
  restaurants: ['catering.restaurant'],
  cafes: ['catering.cafe'],
  fast_food: ['catering.fast_food']
};

export const PRICE_LEVELS = [
  { level: 1, symbol: '$', label: 'Inexpensive' },
  { level: 2, symbol: '$$', label: 'Moderate' },
  { level: 3, symbol: '$$$', label: 'Expensive' },
  { level: 4, symbol: '$$$$', label: 'Very Expensive' },
];