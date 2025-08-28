import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { mockBusinesses, mockReviews, mockUser } from '@/data/mockData';
import { Business, Review, User, SearchFilters } from '@/types';

const STORAGE_KEYS = {
  FAVORITES: 'favorites',
  REVIEWS: 'reviews',
  USER: 'user',
};

export const [AppProvider, useAppStore] = createContextHook(() => {
  const [businesses] = useState<Business[]>(mockBusinesses);
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted data
  useEffect(() => {
    loadPersistedData();
  }, []);

  const loadPersistedData = async () => {
    try {
      const [storedFavorites, storedReviews, storedUser] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
        AsyncStorage.getItem(STORAGE_KEYS.REVIEWS),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
      if (storedReviews) {
        setReviews(JSON.parse(storedReviews));
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        // Set mock user for demo
        setUser(mockUser);
        setFavorites(mockUser.favoriteBusinesses);
      }
    } catch (error) {
      console.error('Error loading persisted data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (businessId: string) => {
    const newFavorites = favorites.includes(businessId)
      ? favorites.filter(id => id !== businessId)
      : [...favorites, businessId];
    
    setFavorites(newFavorites);
    
    if (user) {
      const updatedUser = { ...user, favoriteBusinesses: newFavorites };
      setUser(updatedUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(newFavorites));
  };

  const addReview = async (review: Omit<Review, 'id' | 'date'>) => {
    const newReview: Review = {
      ...review,
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
    };

    const updatedReviews = [...reviews, newReview];
    setReviews(updatedReviews);
    await AsyncStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(updatedReviews));

    if (user) {
      const updatedUser = { ...user, reviewCount: user.reviewCount + 1 };
      setUser(updatedUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
  };

  const getBusinessById = (id: string): Business | undefined => {
    return businesses.find(business => business.id === id);
  };

  const getReviewsForBusiness = (businessId: string): Review[] => {
    return reviews.filter(review => review.businessId === businessId);
  };

  const getFavoriteBusinesses = (): Business[] => {
    return businesses.filter(business => favorites.includes(business.id));
  };

  const searchBusinesses = (query: string, filters?: Partial<SearchFilters>): Business[] => {
    let filtered = businesses;

    // Text search
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(business =>
        business.name.toLowerCase().includes(searchTerm) ||
        business.category.toLowerCase().includes(searchTerm) ||
        business.description.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    if (filters?.category && filters.category !== 'all') {
      filtered = filtered.filter(business => business.category === filters.category);
    }

    // Price level filter
    if (filters?.priceLevel && filters.priceLevel.length > 0) {
      filtered = filtered.filter(business => filters.priceLevel!.includes(business.priceLevel));
    }

    // Rating filter
    if (filters?.rating) {
      filtered = filtered.filter(business => business.rating >= filters.rating!);
    }

    // Sort
    if (filters?.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'rating':
            return b.rating - a.rating;
          case 'reviewCount':
            return b.reviewCount - a.reviewCount;
          default:
            return 0;
        }
      });
    }

    return filtered;
  };

  return {
    businesses,
    reviews,
    user,
    favorites,
    isLoading,
    toggleFavorite,
    addReview,
    getBusinessById,
    getReviewsForBusiness,
    getFavoriteBusinesses,
    searchBusinesses,
  };
});