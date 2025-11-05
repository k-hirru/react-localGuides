import { useState, useEffect, useCallback } from "react";
import { reviewService } from "@/src/services/reviewService";
import { businessService } from "@/src/services/businessService";
import { favoriteService } from "@/src/services/favoriteService";
import { useAuth } from "./useAuth";
import { useLocation } from "./useLocation";
import { Review, Business, SearchFilters } from "@/src/types";

// ✅ Global state for business loading coordination
const globalState = {
  businesses: [] as Business[],
  isLoading: false,
  hasLoaded: false,
  listeners: new Set<(businesses: Business[]) => void>(),
};

export const useAppStore = () => {
  const { user: authUser } = useAuth();
  const { userLocation, refreshLocation } = useLocation();

  const [businesses, setBusinesses] = useState<Business[]>(globalState.businesses);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(globalState.isLoading);
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ✅ Subscribe to global business updates
  useEffect(() => {
    const listener = (newBusinesses: Business[]) => {
      setBusinesses(newBusinesses);
      setLoading(false);
    };

    globalState.listeners.add(listener);

    // Initial sync
    if (globalState.businesses.length > 0) {
      setBusinesses(globalState.businesses);
    }

    return () => {
      globalState.listeners.delete(listener);
    };
  }, []);

  // ✅ Notify all listeners
  const notifyBusinessUpdate = useCallback((newBusinesses: Business[]) => {
    globalState.businesses = newBusinesses;
    globalState.listeners.forEach(listener => listener(newBusinesses));
  }, []);

  // ✅ Load favorites from Firebase
  useEffect(() => {
    if (!authUser) {
      setFavorites([]);
      return;
    }

    const unsubscribe = favoriteService.subscribeToFavorites(
      authUser.uid,
      (firebaseFavorites) => {
        setFavorites(firebaseFavorites);
      }
    );

    return unsubscribe;
  }, [authUser?.uid]);

  // ✅ Update favorite businesses
  useEffect(() => {
    const updateFavoriteBusinesses = async () => {
      if (!authUser || favorites.length === 0) {
        setFavoriteBusinesses([]);
        return;
      }

      const localFavorites = businesses.filter(business =>
        favorites.includes(business.id)
      );

      const missingIds = favorites.filter(id =>
        !businesses.some(business => business.id === id)
      );

      if (missingIds.length === 0) {
        setFavoriteBusinesses(localFavorites);
        return;
      }

      try {
        const fetchedBusinesses: Business[] = [];

        for (const placeId of missingIds) {
          try {
            const business = await businessService.getBusinessById(placeId);
            if (business) {
              fetchedBusinesses.push(business);
            }
          } catch (error) {
            console.error("Failed to fetch business:", placeId, error);
          }
        }

        setFavoriteBusinesses([...localFavorites, ...fetchedBusinesses]);
      } catch (error) {
        console.error("Error updating favorite businesses:", error);
        setFavoriteBusinesses(localFavorites);
      }
    };

    updateFavoriteBusinesses();
  }, [favorites, businesses, authUser]);

  // ✅ FIXED: Auto-load businesses when location is available
  useEffect(() => {
    if (!userLocation || globalState.hasLoaded || globalState.isLoading) {
      return;
    }

    console.log("🔄 APP STORE - Auto-loading businesses with location");
    loadNearbyBusinesses([], false);
  }, [userLocation?.latitude, userLocation?.longitude]);

  // ✅ FIXED: Improved business loading with proper state management
  const loadNearbyBusinesses = async (
    categories: string[] = [],
    forceRefresh = false
  ) => {
    // Skip if already loading
    if (globalState.isLoading && !forceRefresh) {
      console.log("⏳ Already loading businesses, skipping...");
      return;
    }

    // Use cached data if available and not forcing refresh
    if (globalState.hasLoaded && !forceRefresh && globalState.businesses.length > 0) {
      console.log("📦 Using cached businesses");
      return;
    }

    if (!userLocation) {
      console.log("❌ No location available");
      return;
    }

    try {
      globalState.isLoading = true;
      setLoading(true);
      console.log("🔄 Loading businesses...");

      const nearbyBusinesses = await businessService.getNearbyBusinesses(
        userLocation.latitude,
        userLocation.longitude,
        5000,
        categories,
        forceRefresh
      );

      console.log("✅ Loaded businesses:", nearbyBusinesses.length);

      globalState.hasLoaded = true;
      notifyBusinessUpdate(nearbyBusinesses);

    } catch (error) {
      console.error("❌ Failed to load businesses:", error);
    } finally {
      globalState.isLoading = false;
      setLoading(false);
    }
  };

  // ✅ Load user reviews
  const loadAllReviews = useCallback(async () => {
    if (!authUser) {
      setReviews([]);
      return;
    }

    try {
      const userReviews = await reviewService.getUserReviews(authUser.uid);
      setReviews(userReviews);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  }, [authUser]);

  useEffect(() => {
    loadAllReviews();
  }, [loadAllReviews]);

  // ✅ Business helpers
  const getBusinessById = useCallback(
    (id: string) => businesses.find((b) => b.id === id),
    [businesses]
  );

  const fetchBusinessById = useCallback(async (id: string) => {
    try {
      return await businessService.getBusinessById(id);
    } catch (error) {
      console.error("Error fetching business:", error);
      return null;
    }
  }, []);

  const getReviewsForBusiness = useCallback(async (businessId: string) => {
    try {
      return await reviewService.getReviewsForBusiness(businessId);
    } catch (error) {
      console.error("Error getting business reviews:", error);
      return [];
    }
  }, []);

  // ✅ Search with API
  const searchBusinessesWithAPI = async (
    query: string,
    categories: string[] = [],
    forceRefresh: boolean = false
  ) => {
    if (!userLocation || !query.trim()) {
      return searchBusinesses(query, { category: categories[0] || "all" });
    }

    try {
      setSearchLoading(true);

      let results = await businessService.searchBusinessesWithQuery(
        query,
        userLocation.latitude,
        userLocation.longitude,
        5000,
        categories,
        forceRefresh
      );

      if (results.length === 0) {
        results = searchBusinesses(query, {
          category: categories[0] || "all",
        });
      }

      setSearchResults(results);
      return results;
    } catch (error) {
      console.error("Search failed:", error);
      const localResults = searchBusinesses(query, {
        category: categories[0] || "all",
      });
      setSearchResults(localResults);
      return localResults;
    } finally {
      setSearchLoading(false);
    }
  };

  // ✅ Clear search
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  // ✅ Update business ratings after review changes
  const updateBusinessRatings = useCallback(async (businessId: string) => {
    try {
      const reviews = await reviewService.getReviewsForBusiness(businessId);
      const rating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Update the business in the global state
      const updatedBusinesses = globalState.businesses.map(b =>
        b.id === businessId
          ? { ...b, rating, reviewCount: reviews.length }
          : b
      );

      notifyBusinessUpdate(updatedBusinesses);
      console.log("✅ Updated business ratings:", { businessId, rating, reviewCount: reviews.length });
    } catch (error) {
      console.error("Error updating business ratings:", error);
    }
  }, [notifyBusinessUpdate]);

  // ✅ Review management with auto-refresh
  const addReview = async (
    reviewData: Omit<Review, "id" | "date" | "createdAt" | "updatedAt">
  ) => {
    if (!authUser) throw new Error("User must be logged in");

    try {
      const existing = await reviewService.getUserReviewForBusiness(
        authUser.uid,
        reviewData.businessId
      );
      if (existing) throw new Error("You have already reviewed this business");

      const reviewId = await reviewService.addReview({
        ...reviewData,
        userId: authUser.uid,
        userName: authUser.displayName || "Anonymous User",
        userAvatar:
          authUser.photoURL ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
      });

      // Refresh user reviews and business ratings
      await loadAllReviews();
      await updateBusinessRatings(reviewData.businessId);
      
      return reviewId;
    } catch (error) {
      console.error("Error adding review:", error);
      throw error;
    }
  };

  const updateReview = async (reviewId: string, updates: Partial<Review>) => {
    try {
      await reviewService.updateReview(reviewId, updates);
      await loadAllReviews();
      
      // Find which business this review belongs to and update ratings
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        await updateBusinessRatings(review.businessId);
      }
    } catch (error) {
      console.error("Error updating review:", error);
      throw error;
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      // Get business ID before deleting
      const review = reviews.find(r => r.id === reviewId);
      
      await reviewService.deleteReview(reviewId);
      await loadAllReviews();
      
      // Update business ratings
      if (review) {
        await updateBusinessRatings(review.businessId);
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      throw error;
    }
  };

  // ✅ Favorite management
  const toggleFavorite = async (businessId: string) => {
    if (!authUser) {
      alert("Please sign in to save favorites");
      return;
    }

    try {
      const currentlyFavorite = favorites.includes(businessId);

      setFavorites(prev =>
        currentlyFavorite
          ? prev.filter(id => id !== businessId)
          : [...prev, businessId]
      );

      await favoriteService.toggleFavorite(authUser.uid, businessId, currentlyFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);

      setFavorites(prev =>
        favorites.includes(businessId)
          ? [...prev, businessId]
          : prev.filter(id => id !== businessId)
      );

      alert("Failed to update favorite. Please try again.");
    }
  };

  const getFavoriteBusinesses = useCallback(() => {
    return favoriteBusinesses;
  }, [favoriteBusinesses]);

  const isFavorite = useCallback(
    (businessId: string) => {
      if (!authUser) return false;
      return favorites.includes(businessId);
    },
    [authUser, favorites]
  );

  // ✅ Local search and filter
  const searchBusinesses = useCallback(
    (query: string, filters?: Partial<SearchFilters>) => {
      let filtered = businesses;

      if (query.trim()) {
        const q = query.toLowerCase();
        filtered = filtered.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.address.toLowerCase().includes(q) ||
            b.features.some((f) => f.toLowerCase().includes(q))
        );
      }

      if (filters?.category && filters.category !== "all") {
        filtered = filtered.filter((b) => b.category === filters.category);
      }

      if (filters?.priceLevel?.length) {
        filtered = filtered.filter((b) =>
          filters.priceLevel!.includes(b.priceLevel)
        );
      }

      if (filters?.rating !== undefined) {
        filtered = filtered.filter((b) => b.rating >= filters.rating!);
      }

      if (filters?.sortBy) {
        filtered = [...filtered].sort((a, b) => {
          if (filters.sortBy === "rating") return b.rating - a.rating;
          if (filters.sortBy === "reviewCount")
            return b.reviewCount - a.reviewCount;
          return 0;
        });
      }

      return filtered;
    },
    [businesses]
  );

  // ✅ Force refresh
  const refreshBusinesses = async (
    categories: string[] = [],
    forceRefresh: boolean = true
  ) => {
    try {
      if (forceRefresh) {
        globalState.hasLoaded = false;
      }

      await refreshLocation(true);
      await loadNearbyBusinesses(categories, forceRefresh);
    } catch (error) {
      console.error("Refresh failed:", error);
    }
  };

  // ✅ User state
  const user = authUser
    ? {
        id: authUser.uid,
        name: authUser.displayName || "User",
        email: authUser.email || "",
        avatar:
          authUser.photoURL ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
        reviewCount: reviews.filter((r) => r.userId === authUser.uid).length,
        favoriteBusinesses: favorites,
      }
    : null;

  return {
    user,
    businesses,
    reviews,
    favorites,
    loading,
    getBusinessById,
    fetchBusinessById,
    getReviewsForBusiness,
    addReview,
    updateReview,
    deleteReview,
    toggleFavorite,
    getFavoriteBusinesses,
    isFavorite,
    searchBusinesses,
    refreshBusinesses,
    loadNearbyBusinesses,
    loadAllReviews,
    searchResults,
    searchLoading,
    searchBusinessesWithAPI,
    clearSearchResults,
  };
};