import { Business } from "@/src/types";
import { geoapifyService } from "./geoapifyService";
import { reviewService } from "./reviewService";
import { mapGeoapifyToBusiness } from "@/src/utils/businessMapper";
import { queryOptions } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore";

const mapAppCategoriesToGeoapify = (categories: string[]): string[] => {
  if (categories.length === 0) {
    return ["catering.restaurant", "catering.cafe", "catering.fast_food"];
  }

  return categories
    .map((category) => {
      switch (category) {
        case "restaurants":
          return "catering.restaurant";
        case "cafes":
          return "catering.cafe";
        case "fast_food":
          return "catering.fast_food";
        default:
          return null;
      }
    })
    .filter(Boolean) as string[];
};

const NEARBY_CACHE_PREFIX = "nearbyBusinesses_v1";
const NEARBY_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

const buildNearbyCacheKey = (
  lat: number,
  lng: number,
  radius: number,
  categories: string[]
) => {
  const cats = [...categories].sort().join(",");
  return `${NEARBY_CACHE_PREFIX}:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}:${cats}`;
};

interface NearbyCachePayload {
  businesses: Business[];
  updatedAt: number;
}

const db = getFirestore();

const buildAreaKey = (city?: string | null, country?: string | null) => {
  if (!city || !country) return null;
  return `${city.trim().toLowerCase()}::${country.trim().toLowerCase()}`;
};

export const businessQueryKeys = {
  all: ["businesses"] as const,
  lists: () => [...businessQueryKeys.all, "list"] as const,
  list: (filters: any) => [...businessQueryKeys.lists(), filters] as const,
  details: () => [...businessQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...businessQueryKeys.details(), id] as const,
};

export const businessService = {
  async getNearbyBusinesses(
    lat: number,
    lng: number,
    radius: number = 5000,
    categories: string[] = [],
    forceRefresh: boolean = false
  ): Promise<Business[]> {
    try {
      console.log("🔍 BUSINESS SERVICE - Starting getNearbyBusinesses");
      console.log("📍 Coordinates:", lat, lng);
      const geoapifyCategories = mapAppCategoriesToGeoapify(categories);
      console.log("🎯 Categories:", geoapifyCategories);

      const cacheKey = buildNearbyCacheKey(lat, lng, radius, geoapifyCategories);

      // Try to use persisted cache if not forcing refresh
      if (!forceRefresh) {
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached) as NearbyCachePayload;
            const age = Date.now() - parsed.updatedAt;

            if (age < NEARBY_CACHE_MAX_AGE_MS) {
              console.log("📦 Using fresh enough persisted nearby businesses cache");
              return parsed.businesses;
            }

            console.log("⏰ Nearby businesses cache is stale, fetching fresh data");
            // Optional: clean up stale cache entry
            try {
              await AsyncStorage.removeItem(cacheKey);
            } catch (cleanupErr) {
              console.warn("⚠️ Failed to remove stale nearby cache:", cleanupErr);
            }
          }
        } catch (err) {
          console.warn("⚠️ Failed to read nearby businesses cache:", err);
        }
      }

      const places = await geoapifyService.searchNearbyPlaces(
        lat,
        lng,
        radius,
        geoapifyCategories,
        60,
        forceRefresh,
        0
      );

      console.log("📊 Geoapify returned places:", places.length);
      if (!places.length) {
        console.log("❌ No places found from Geoapify");
        return [];
      }

      const placeIds = places.map((p) => p.place_id);
      console.log("🆔 Place IDs:", placeIds);
      const reviewsMap = await reviewService.getBusinessesWithReviews(placeIds);

      const businesses = places.map((place) =>
        mapGeoapifyToBusiness(
          place,
          reviewsMap.get(place.place_id) || { rating: 0, reviewCount: 0 }
        )
      );
      console.log("🏪 Final businesses:", businesses.length);
      console.log("📝 Sample business:", businesses[0]?.name);

      // Persist to AsyncStorage for cross-session caching
      try {
        const payload: NearbyCachePayload = {
          businesses,
          updatedAt: Date.now(),
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
        console.log("💾 Nearby businesses cache saved");
      } catch (err) {
        console.warn("⚠️ Failed to persist nearby businesses cache:", err);
      }
      
      return businesses;
    } catch {
      console.error("❌ BUSINESS SERVICE - Error:", Error);
      return [];
    }
  },

  async getNearbyBusinessesPage(
    lat: number,
    lng: number,
    options?: {
      radius?: number;
      categories?: string[];
      page?: number;
      pageSize?: number;
      forceRefresh?: boolean;
    }
  ): Promise<Business[]> {
    const {
      radius = 5000,
      categories = [],
      page = 1,
      pageSize = 20,
      forceRefresh = false,
    } = options || {};

    try {
      console.log("🔍 BUSINESS SERVICE - getNearbyBusinessesPage", {
        lat,
        lng,
        radius,
        categories,
        page,
        pageSize,
      });

      const geoapifyCategories = mapAppCategoriesToGeoapify(categories);
      const offset = (page - 1) * pageSize;

      const places = await geoapifyService.searchNearbyPlaces(
        lat,
        lng,
        radius,
        geoapifyCategories,
        pageSize,
        forceRefresh,
        offset
      );

      if (!places.length) {
        console.log("❌ No places found for page", page);
        return [];
      }

      const placeIds = places.map((p) => p.place_id);
      const reviewsMap = await reviewService.getBusinessesWithReviews(placeIds);

      const businesses = places.map((place) =>
        mapGeoapifyToBusiness(
          place,
          reviewsMap.get(place.place_id) || { rating: 0, reviewCount: 0 }
        )
      );

      console.log(
        "🏪 Page businesses:",
        page,
        "count:",
        businesses.length
      );

      return businesses;
    } catch (error) {
      console.error("❌ BUSINESS SERVICE - getNearbyBusinessesPage error:", error);
      return [];
    }
  },

  async getBusinessById(placeId: string): Promise<Business | null> {
    try {
      const place = await geoapifyService.getPlaceDetails(placeId);
      const reviews = await reviewService.getReviewsForBusiness(placeId);

      const rating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      const business = mapGeoapifyToBusiness(place, {
        rating,
        reviewCount: reviews.length,
      });

      // Upsert canonical Firestore business document for analytics/admin
      try {
        const businessRef = doc(db, "businesses", business.id);
        const existing = await getDoc(businessRef);

        const city = place.address?.city ?? null;
        const country = place.address?.country ?? null;
        const areaKey = buildAreaKey(city, country);

        const basePayload: any = {
          id: business.id,
          name: business.name,
          address: business.address,
          category: business.category,
          coordinates: {
            lat: business.coordinates.latitude,
            lng: business.coordinates.longitude,
          },
          features: business.features,
          source: business.source,
          updatedAt: serverTimestamp(),
        };

        if (city) {
          basePayload.city = city;
        }
        if (country) {
          basePayload.country = country;
        }
        if (areaKey) {
          basePayload.areaKey = areaKey;
        }

        if (existing.exists()) {
          await updateDoc(businessRef, {
            ...basePayload,
            reviewCount: reviews.length,
            avgRating: rating,
            lastReviewAt: reviews.length
              ? reviews
                  .map((r) => r.createdAt)
                  .sort((a, b) => b.getTime() - a.getTime())[0]
              : null,
          });
        } else {
          await setDoc(businessRef, {
            ...basePayload,
            reviewCount: reviews.length,
            avgRating: rating,
            lastReviewAt: reviews.length
              ? reviews
                  .map((r) => r.createdAt)
                  .sort((a, b) => b.getTime() - a.getTime())[0]
              : null,
            createdAt: serverTimestamp(),
          });
        }
      } catch (firestoreError) {
        console.warn(
          "⚠️ Failed to upsert Firestore business doc for",
          placeId,
          firestoreError
        );
      }

      return business;
    } catch {
      return null;
    }
  },

  async updateBusinessStats(
    businessId: string,
    stats: { reviewCount: number; avgRating: number; lastReviewAt?: Date | null }
  ): Promise<void> {
    try {
      const businessRef = doc(db, "businesses", businessId);
      const payload: any = {
        reviewCount: stats.reviewCount,
        avgRating: stats.avgRating,
        updatedAt: serverTimestamp(),
      };
      if (stats.lastReviewAt !== undefined) {
        payload.lastReviewAt = stats.lastReviewAt;
      }
      await setDoc(businessRef, payload, { merge: true });
    } catch (error) {
      console.warn("⚠️ Failed to update business stats in Firestore:", error);
    }
  },

  async searchBusinessesWithQuery(
    query: string,
    lat: number,
    lng: number,
    radius: number = 5000,
    categories: string[] = [],
    forceRefresh: boolean = false
  ): Promise<Business[]> {
    try {
      console.log("🔍 BUSINESS SERVICE - Starting geocoding search for:", query);
      console.log("📍 Coordinates:", lat, lng);
      
      const geoapifyCategories = mapAppCategoriesToGeoapify(categories);
      console.log("🎯 Categories:", geoapifyCategories);

      // Use geocoding API instead of places API
      const places = await geoapifyService.searchPlacesByName( 
        query,
        lat,
        lng,
        radius,
        geoapifyCategories,
        40,
        forceRefresh
      );

      console.log("📊 Geocoding search returned places:", places.length);
      
      if (!places.length) {
        console.log("❌ No places found from geocoding search");
        return [];
      }

      const placeIds = places.map((p) => p.place_id);
      console.log("🆔 Place IDs from geocoding:", placeIds);
      
      const reviewsMap = await reviewService.getBusinessesWithReviews(placeIds);

      const businesses = places.map((place) =>
        mapGeoapifyToBusiness(
          place,
          reviewsMap.get(place.place_id) || { rating: 0, reviewCount: 0 }
        )
      );
      
      console.log("🏪 Final search businesses:", businesses.length);
      if (businesses.length > 0) {
        console.log("📝 Sample search business:", businesses[0]?.name);
      }
      
      return businesses;
    } catch (error) {
      console.error("❌ BUSINESS SERVICE - Places API name search error:", error);
      return [];
    }
  },

  searchBusinesses(
    query: string,
    lat: number,
    lng: number,
    radius: number = 5000
  ): Promise<Business[]> {
    return this.getNearbyBusinesses(lat, lng, radius).then((biz) =>
      biz.filter(
        (b) =>
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.address.toLowerCase().includes(query.toLowerCase()) ||
          b.features.some((f) => f.toLowerCase().includes(query.toLowerCase()))
      )
    );
  },

  // ✅ React Query support wrapper
  getNearbyBusinessesQuery: (
    lat: number,
    lng: number,
    categories: string[] = []
  ) =>
    queryOptions({
      queryKey: businessQueryKeys.list({ lat, lng, categories }),
      queryFn: () =>
        businessService.getNearbyBusinesses(lat, lng, 5000, categories),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }),
};
