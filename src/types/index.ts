export interface GeoapifyPlace {
  place_id: string;
  name: string;
  formatted: string;
  lat: number;
  lon: number;
  categories: string[];
  address: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  details: {
    cuisine?: string;
    brand?: string;
    takeaway?: boolean;
  };
  distance?: number;
}

export interface Business {
  id: string; // Now using Geoapify's place_id
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  priceLevel: number;
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
  // New fields for Geoapify integration
  placeId: string; // Duplicate of id for clarity
  source: 'geoapify' | 'user'; // Track data source
}

export interface Review {
  id: string;
  businessId: string; // Now references Geoapify place_id
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