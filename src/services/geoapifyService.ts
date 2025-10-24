// /src/services/geoapifyService.ts
import { GeoapifyPlace } from "@/src/types";

const GEOAPIFY_API_KEY = "62f8635ddced4b519caa9d2f13edfc43";
const BASE_URL = "https://api.geoapify.com/v2";

class GeoapifyService {
  private cache: Map<string, { data: GeoapifyPlace[]; timestamp: number }> =
    new Map();
  private pendingRequests: Map<string, Promise<GeoapifyPlace[]>> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // ✅ 15 minutes

  async searchNearbyPlaces(
    lat: number,
    lon: number,
    radius: number = 5000,
    categories: string[] = [
      "catering.restaurant",
      "catering.fast_food",
      "catering.cafe",
    ],
    limit: number = 20,
    forceRefresh: boolean = false
  ): Promise<GeoapifyPlace[]> {
    const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}_${categories.join(",")}`;

    // ✅ Avoid duplicate API requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // ✅ Use cache if valid (unless forced refresh)
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log("📦 Using cached results");
        return cached.data;
      }
    }

    // ✅ Trigger fetch and store the pending promise
    const requestPromise = this.executeSearchRequest(
      lat, lon, radius, categories, limit, cacheKey
    );
    this.pendingRequests.set(cacheKey, requestPromise);

    // ✅ Clean up after completion
    requestPromise.finally(() => {
      this.pendingRequests.delete(cacheKey);
    });

    return requestPromise;
  }

  private async executeSearchRequest(
    lat: number,
    lon: number,
    radius: number,
    categories: string[],
    limit: number,
    cacheKey: string
  ): Promise<GeoapifyPlace[]> {
    const categoryString = categories.join(",");
    const url = `${BASE_URL}/places?categories=${categoryString}&filter=circle:${lon},${lat},${radius}&limit=${limit}&apiKey=${GEOAPIFY_API_KEY}`;

    try {
      console.log("📍 Fetching places from Geoapify (NEW REQUEST)");
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Geoapify API error:", response.status, errorText);
        throw new Error(`Geoapify API error: ${response.status}`);
      }

      const data = await response.json();
      const places = this.transformApiResponse(data);

      // ✅ Cache results
      this.cache.set(cacheKey, {
        data: places,
        timestamp: Date.now(),
      });

      return places;
    } catch (error) {
      console.error("❌ Geoapify search error:", error);

      // ✅ Fallback to stale cache if available
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log("🔄 Using stale cache due to error");
        return cached.data;
      }

      throw new Error("Failed to fetch places from Geoapify");
    }
  }

  // ✅ Cleaner response transformation method
  private transformApiResponse(data: any): GeoapifyPlace[] {
    if (!data.features) {
      console.log("ℹ️ No features found");
      return [];
    }

    return data.features.map((feature: any) => {
      const props = feature.properties;
      const geometry = feature.geometry;

      return {
        place_id: props.place_id,
        name: props.name || "Unnamed Place",
        formatted: props.formatted || "Address not available",
        lat: geometry?.coordinates[1] || props.lat,
        lon: geometry?.coordinates[0] || props.lon,
        categories: props.categories || [],
        address: {
          street: props.street,
          city: props.city,
          state: props.state,
          postcode: props.postcode,
          country: props.country,
        },
        details: {
          cuisine: props.cuisine?.[0] || props.raw?.cuisine,
          brand: props.brand || props.raw?.brand,
          takeaway:
            props.takeaway ||
            props.raw?.takeaway === "yes" ||
            props.raw?.takeaway === "only",
        },
        distance: props.distance,
      } as GeoapifyPlace;
    });
  }

  // ✅ Optional utility methods kept from your version
  clearCache() {
    this.cache.clear();
    console.log("🗑️ Cache cleared");
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // ✅ Alternative API endpoint kept intact
  async searchNearbyPlacesAlternative(
    lat: number,
    lon: number,
    radius: number = 5000,
    categories: string[] = ["catering.restaurant"],
    limit: number = 50
  ): Promise<GeoapifyPlace[]> {
    const categoryString = categories.join(",");
    const url = `${BASE_URL}/places?categories=${categoryString}&bias=proximity:${lon},${lat}&limit=${limit}&apiKey=${GEOAPIFY_API_KEY}`;

    console.log("📍 Fetching places from Geoapify (alternative):", url);

    const response = await fetch(url);
    const data = await response.json();
    return this.transformApiResponse(data);
  }

  async getPlaceDetails(placeId: string): Promise<GeoapifyPlace> {
    const url = `${BASE_URL}/place-details?id=${placeId}&apiKey=${GEOAPIFY_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.features?.length) throw new Error("Place not found");
    return this.transformApiResponse({ features: [data.features[0]] })[0];
  }

  async testApi(lat: number, lon: number) {
    const url = `${BASE_URL}/places?categories=catering.restaurant&bias=proximity:${lon},${lat}&limit=5&apiKey=${GEOAPIFY_API_KEY}`;
    console.log("🧪 Testing API with:", url);

    const response = await fetch(url);
    const data = await response.json();
    return data;
  }
}

export const geoapifyService = new GeoapifyService();
