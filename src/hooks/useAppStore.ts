import { useState, useEffect } from 'react';
import { reviewService } from '@/src/services/reviewService';
import { useAuth } from './useAuth';
import { mockBusinesses } from '@/src/data/mockData';
import { Review, Business, SearchFilters } from '@/src/types';

export const useAppStore = () => {
  const { user: authUser } = useAuth();
  const [businesses] = useState<Business[]>(mockBusinesses);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load persisted data
  useEffect(() => {
    loadAllReviews();
  }, [authUser]);

 const loadAllReviews = async () => {
    if (!authUser) {
      setReviews([]);
      return;
    }

    try {
      setLoading(true);
      // You might want to load all reviews or just user's reviews
      const userReviews = await reviewService.getUserReviews(authUser.uid);
      setReviews(userReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBusinessById = (id: string) => {
    return businesses.find(business => business.id === id);
  };

  const getReviewsForBusiness = async (businessId: string): Promise<Review[]> => {
    try {
      return await reviewService.getReviewsForBusiness(businessId);
    } catch (error) {
      console.error('Error getting business reviews:', error);
      return [];
    }
  };

  const addReview = async (reviewData: Omit<Review, 'id' | 'date' | 'createdAt' | 'updatedAt'>) => {
  if (!authUser) throw new Error('User must be logged in');

  try {
    // Check if user already reviewed this business
    const existingReview = await reviewService.getUserReviewForBusiness(authUser.uid, reviewData.businessId);
    
    if (existingReview) {
      throw new Error('You have already reviewed this business');
    }

    const reviewId = await reviewService.addReview({
      ...reviewData,
      userId: authUser.uid,
      userName: authUser.displayName || 'Anonymous User',
      userAvatar: authUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
    });

    // Reload reviews to include the new one
    await loadAllReviews();
    
    return reviewId;
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
};


  const updateReview = async (reviewId: string, updates: { rating?: number; text?: string }) => {
    try {
      await reviewService.updateReview(reviewId, updates);
      await loadAllReviews(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await reviewService.deleteReview(reviewId);
      await loadAllReviews(); // Reload to remove deleted review
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  };

  const toggleFavorite = (businessId: string) => {
    setFavorites(prev => 
      prev.includes(businessId) 
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    );
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

   const user = authUser ? {
    id: authUser.uid,
    name: authUser.displayName || 'User',
    email: authUser.email || '',
    avatar: authUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
    reviewCount: reviews.filter(review => review.userId === authUser.uid).length,
    favoriteBusinesses: favorites,
  } : null;

  return {
    user,
    businesses,
    reviews,
    favorites,
    loading,
    getBusinessById,
    getReviewsForBusiness,
    addReview,
    updateReview,
    deleteReview,
    toggleFavorite,
    searchBusinesses,
  };

};
