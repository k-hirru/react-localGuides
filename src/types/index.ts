export interface Business {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  priceLevel: number; // 1-4 ($, $$, $$$, $$$$)
  imageUrl: string;
  address: string;
  phone: string;
  website?: string;
  hours: {
    [key: string]: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  photos: string[];
  description: string;
  features: string[];
}

export const generateBusinessId = (lat: number, lng: number): string => {
  return `${lat.toFixed(6)}_${lng.toFixed(6)}`;
};

export interface Review {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  text: string;
  date: string;
  createdAt: Date;
  updatedAt: Date;
  helpful: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  reviewCount: number;
  favoriteBusinesses: string[];
}

export interface SearchFilters {
  category: string;
  priceLevel: number[];
  rating: number;
  distance: number;
  sortBy: 'rating' | 'distance' | 'reviewCount';
}