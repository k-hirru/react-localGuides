import { Business } from "@/src/types";
import { geoapifyService } from "./geoapifyService";
import { reviewService } from "./reviewService";
import { mapGeoapifyToBusiness } from "@/src/utils/businessMapper";
import { queryOptions } from "@tanstack/react-query";

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

      const places = await geoapifyService.searchNearbyPlaces(
        lat,
        lng,
        radius,
        geoapifyCategories,
        20,
        forceRefresh
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
      
      return businesses;
    } catch {
      console.error("❌ BUSINESS SERVICE - Error:", Error);
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

      return mapGeoapifyToBusiness(place, {
        rating,
        reviewCount: reviews.length,
      });
    } catch {
      return null;
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
