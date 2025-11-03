import { useState, useEffect, useRef, useCallback } from "react";
import { reviewService } from "@/src/services/reviewService";
import { businessService } from "@/src/services/businessService";
import { favoriteService } from "@/src/services/favoriteService";
import { useAuth } from "./useAuth";
import { useLocation } from "./useLocation";
import { Review, Business, SearchFilters } from "@/src/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Global refs to track loading state across all hook instances
const globalRefs = {
  hasLoadedBusinesses: false,
  isLoadingBusinesses: false,
  locationDebounce: null as ReturnType<typeof setTimeout> | null,
};

// ✅ Storage keys
const STORAGE_KEYS = {
  FAVORITES: 'favorites',
};

export const useAppStore = () => {
  const { user: authUser } = useAuth();
  const { userLocation, refreshLocation } = useLocation();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // ✅ Load favorites from storage on mount
  // ✅ Load favorites from Firebase when user logs in
  useEffect(() => {
    if (!authUser) {
      console.log("👤 No user logged in, clearing favorites");
      setFavorites([]);
      return;
    }

    console.log("👤 User logged in, loading favorites for:", authUser.uid);
    
    // Load initial favorites
    loadFavoritesFromFirebase();

    // Subscribe to real-time updates
    const unsubscribe = favoriteService.subscribeToFavorites(
      authUser.uid, 
      (firebaseFavorites) => {
        console.log("❤️ Real-time favorites update:", firebaseFavorites.length, "favorites");
        setFavorites(firebaseFavorites);
      }
    );

    return () => {
      console.log("🧹 Cleaning up favorites subscription");
      unsubscribe();
    };
  }, [authUser?.uid]); // Only depend on authUser.uid

    useEffect(() => {
    const updateFavoriteBusinesses = async () => {
      if (!authUser || favorites.length === 0) {
        setFavoriteBusinesses([]);
        return;
      }

      console.log("🔄 Updating favorite businesses");
      console.log("   - Favorites:", favorites.length);
      console.log("   - Local businesses:", businesses.length);

      // Find favorites that are in local businesses
      const localFavorites = businesses.filter(business => 
        favorites.includes(business.id)
      );

      console.log("   - Found in local:", localFavorites.length);

      // Find favorites that are NOT in local businesses
      const missingIds = favorites.filter(id => 
        !businesses.some(business => business.id === id)
      );

      console.log("   - Missing from local:", missingIds.length);

      if (missingIds.length === 0) {
        setFavoriteBusinesses(localFavorites);
        return;
      }

      // Fetch missing businesses
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

        const allFavorites = [...localFavorites, ...fetchedBusinesses];
        console.log("✅ Final favorite businesses:", allFavorites.length);
        setFavoriteBusinesses(allFavorites);
      } catch (error) {
        console.error("Error updating favorite businesses:", error);
        setFavoriteBusinesses(localFavorites);
      }
    };

    updateFavoriteBusinesses();
  }, [favorites, businesses, authUser]);


  // ✅ Load favorites from Firebase
  const loadFavoritesFromFirebase = async () => {
    if (!authUser) return;
    
    try {
      console.log("📥 Loading favorites from Firebase for user:", authUser.uid);
      const firebaseFavorites = await favoriteService.getUserFavorites(authUser.uid);
      console.log("✅ Loaded favorites from Firebase:", firebaseFavorites.length, "favorites");
      setFavorites(firebaseFavorites);
    } catch (error) {
      console.error("❌ Error loading favorites from Firebase:", error);
      // Fallback to local storage if Firebase fails
      await loadFavoritesFromStorage();
    }
  };

  // ✅ Keep local storage as fallback
  const loadFavoritesFromStorage = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (storedFavorites) {
        const parsedFavorites = JSON.parse(storedFavorites);
        console.log("📥 Loaded favorites from storage (fallback):", parsedFavorites.length);
        setFavorites(parsedFavorites);
      }
    } catch (error) {
      console.error("Error loading favorites from storage:", error);
    }
  };

  // ✅ Save to local storage as backup (optional)
  const saveFavoritesToStorage = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch (error) {
      console.error("Error saving favorites to storage:", error);
    }
  };

  // ✅ Load businesses when location changes - WITH GLOBAL STATE
  useEffect(() => {
    if (
      !userLocation ||
      globalRefs.isLoadingBusinesses ||
      globalRefs.hasLoadedBusinesses
    )
      return;

    if (globalRefs.locationDebounce) {
      clearTimeout(globalRefs.locationDebounce);
    }

    globalRefs.locationDebounce = setTimeout(async () => {
      console.log("🔄 GLOBAL - Loading businesses once for all components");
      globalRefs.isLoadingBusinesses = true;

      try {
        await loadNearbyBusinesses([], false);
        globalRefs.hasLoadedBusinesses = true;
      } catch (error) {
        console.error("Failed to load businesses:", error);
      } finally {
        globalRefs.isLoadingBusinesses = false;
      }
    }, 400);

    return () => {
      if (globalRefs.locationDebounce) {
        clearTimeout(globalRefs.locationDebounce);
      }
    };
  }, [userLocation?.latitude, userLocation?.longitude]);

  const loadNearbyBusinesses = async (
    categories: string[] = [],
    forceRefresh = false
  ) => {
    if (!userLocation || globalRefs.isLoadingBusinesses) return;

    try {
      globalRefs.isLoadingBusinesses = true;
      setBusinessesLoading(true);

      console.log("🔄 APP STORE - Starting business load...");

      const nearbyBusinesses = await businessService.getNearbyBusinesses(
        userLocation.latitude,
        userLocation.longitude,
        5000,
        categories,
        forceRefresh
      );

      console.log("✅ APP STORE - Businesses loaded:", nearbyBusinesses.length);

      // ✅ Use functional update and wrap in setTimeout to ensure React processes it
      setTimeout(() => {
        setBusinesses(nearbyBusinesses);
        console.log(
          "🎯 APP STORE - State updated with businesses:",
          nearbyBusinesses.length
        );
      }, 0);

      globalRefs.hasLoadedBusinesses = true;
    } catch (error) {
      console.error("Failed to load businesses:", error);
    } finally {
      // ✅ Delay loading state change to ensure UI updates
      setTimeout(() => {
        globalRefs.isLoadingBusinesses = false;
        setBusinessesLoading(false);
        console.log("🏁 APP STORE - Loading complete");
      }, 100);
    }
  };

  /** Load all reviews by logged-in user */
  const loadAllReviews = useCallback(async () => {
    if (!authUser) {
      setReviews([]);
      return;
    }

    try {
      setLoading(true);
      const userReviews = await reviewService.getUserReviews(authUser.uid);
      setReviews(userReviews);
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadAllReviews();
  }, [loadAllReviews]);

  /** Helpers */
  const getBusinessById = (id: string) => businesses.find((b) => b.id === id);

  const fetchBusinessById = async (id: string) => {
    try {
      return await businessService.getBusinessById(id);
    } catch (error) {
      console.error("Error fetching business:", error);
      return null;
    }
  };

  const getReviewsForBusiness = async (businessId: string) => {
    try {
      return await reviewService.getReviewsForBusiness(businessId);
    } catch (error) {
      console.error("Error getting business reviews:", error);
      return [];
    }
  };

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

      let searchResults = await businessService.searchBusinessesWithQuery(
        query,
        userLocation.latitude,
        userLocation.longitude,
        5000,
        categories,
        forceRefresh
      );

      // If geocoding returns no results, fall back to local search
      if (searchResults.length === 0) {
        console.log(
          "🔄 Geocoding returned no results, falling back to local search"
        );
        searchResults = searchBusinesses(query, {
          category: categories[0] || "all",
        });
      }

      setSearchResults(searchResults);
      return searchResults;
    } catch (error) {
      console.error("Search failed:", error);
      // Fallback to local search on error
      const localResults = searchBusinesses(query, {
        category: categories[0] || "all",
      });
      setSearchResults(localResults);
      return localResults;
    } finally {
      setSearchLoading(false);
    }
  };

  /** Clear search results */
  const clearSearchResults = () => {
    setSearchResults([]);
    setLastSearchQuery("");
  };

  /** Reviews */
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

      await loadAllReviews();
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
    } catch (error) {
      console.error("Error updating review:", error);
      throw error;
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await reviewService.deleteReview(reviewId);
      await loadAllReviews();
    } catch (error) {
      console.error("Error deleting review:", error);
      throw error;
    }
  };

  /** Favorites */
  const toggleFavorite = async (businessId: string) => {
    if (!authUser) {
      console.log("❌ Cannot toggle favorite - no user logged in");
      alert("Please sign in to save favorites");
      return;
    }

    try {
      const currentlyFavorite = favorites.includes(businessId);
      console.log("❤️ Toggling favorite:", businessId, "Currently favorite:", currentlyFavorite);

      // Optimistic update
      setFavorites(prev => {
        const newFavorites = currentlyFavorite
          ? prev.filter(id => id !== businessId)
          : [...prev, businessId];
        return newFavorites;
      });

      // Update Firebase
      await favoriteService.toggleFavorite(authUser.uid, businessId, currentlyFavorite);
      console.log("✅ Favorite successfully updated in Firebase");

    } catch (error) {
      console.error("❌ Error toggling favorite in Firebase:", error);
      
      // Revert optimistic update on error
      setFavorites(prev => {
        const newFavorites = favorites.includes(businessId)
          ? [...prev, businessId]
          : prev.filter(id => id !== businessId);
        return newFavorites;
      });
      
      alert("Failed to update favorite. Please try again.");
    }
  };

  // ✅ SIMPLIFIED - Now just returns the state
  const getFavoriteBusinesses = () => {
    console.log("📋 getFavoriteBusinesses returning:", favoriteBusinesses.length, "businesses");
    return favoriteBusinesses;
  };

  // ✅ Check if business is favorite
  const isFavorite = (businessId: string) => {
    if (!authUser) return false;
    return favorites.includes(businessId);
  };

  /** Search and Filter (local only) */
  const searchBusinesses = (
    query: string,
    filters?: Partial<SearchFilters>
  ) => {
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
      const minRating = filters.rating;
      filtered = filtered.filter((b) => b.rating >= minRating);
    }

    if (filters?.sortBy) {
      filtered = filtered.sort((a, b) => {
        if (filters.sortBy === "rating") return b.rating - a.rating;
        if (filters.sortBy === "reviewCount")
          return b.reviewCount - a.reviewCount;
        return 0;
      });
    }

    return filtered;
  };

  /** Force refetch */
  const refreshBusinesses = async (
    categories: string[] = [],
    forceRefresh: boolean = true
  ) => {
    try {
      // ✅ Reset global flags for force refresh
      if (forceRefresh) {
        globalRefs.hasLoadedBusinesses = false;
      }

      await refreshLocation(true);
      await loadNearbyBusinesses(categories, forceRefresh);
    } catch (error) {
      console.error("Refresh failed:", error);
    }
  };

  /** User state formatting */
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
    loading: loading || businessesLoading,
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
    searchLoading: searchLoading || loading,
    lastSearchQuery,
    searchBusinessesWithAPI,
    clearSearchResults,
  };
};