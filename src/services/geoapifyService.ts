// /src/services/geoapifyService.ts
import { GeoapifyPlace } from '@/src/types';
import Constants from 'expo-constants';

/**
 * GeoapifyService
 *
 * Network performance responsibilities:
 * - Maintains a 15-minute in-memory cache of successful responses so
 *   repeated queries avoid new HTTP requests.
 * - Deduplicates concurrent requests via `pendingRequests`, ensuring only
 *   one HTTP call is made per unique cache key and all callers share the
 *   same promise.
 * - Falls back to stale cached data on errors where possible so users see
 *   something instead of a hard failure.
 *
 * This sits underneath `businessService`, which maps raw places into
 * `Business` models and adds its own AsyncStorage-based TTL cache.
 */

const GEOAPIFY_API_KEY =
  Constants.expoConfig?.extra?.GEOAPIFY_API_KEY ?? Constants.manifest?.extra?.GEOAPIFY_API_KEY;

if (!GEOAPIFY_API_KEY) {
  console.warn('⚠️ GEOAPIFY_API_KEY is not set in app config extra.');
}

const BASE_URL = 'https://api.geoapify.com/v2';
const URL_SEARCH = ' ';

class GeoapifyService {
  private cache: Map<string, { data: GeoapifyPlace[]; timestamp: number }> = new Map();
  private pendingRequests: Map<string, Promise<GeoapifyPlace[]>> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // ✅ 15 minutes

  async searchNearbyPlaces(
    lat: number,
    lon: number,
    radius: number = 5000,
    categories: string[] = ['catering.restaurant', 'catering.fast_food', 'catering.cafe'],
    limit: number = 20,
    forceRefresh: boolean = false,
    offset: number = 0,
  ): Promise<GeoapifyPlace[]> {
    const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}_${categories.join(',')}_${limit}_${offset}`;

    // ✅ Avoid duplicate API requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // ✅ Use cache if valid (unless forced refresh)
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📦 Using cached results');
        return cached.data;
      }
    }

    // ✅ Trigger fetch and store the pending promise
    const requestPromise = this.executeSearchRequest(
      lat,
      lon,
      radius,
      categories,
      limit,
      offset,
      cacheKey,
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
    offset: number,
    cacheKey: string,
  ): Promise<GeoapifyPlace[]> {
    const categoryString = categories.join(',');
    const url = `${BASE_URL}/places?categories=${categoryString}&filter=circle:${lon},${lat},${radius}&limit=${limit}&offset=${offset}&apiKey=${GEOAPIFY_API_KEY}`;

    try {
      console.log('📍 Fetching places from Geoapify (NEW REQUEST)');
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Geoapify API error:', response.status, errorText);
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
      console.error('❌ Geoapify search error:', error);

      // ✅ Fallback to stale cache if available
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cache due to error');
        return cached.data;
      }

      throw new Error('Failed to fetch places from Geoapify');
    }
  }

  // ✅ Cleaner response transformation method
  private transformApiResponse(data: any): GeoapifyPlace[] {
    if (!data.features) {
      console.log('ℹ️ No features found');
      return [];
    }

    return data.features.map((feature: any) => {
      const props = feature.properties;
      const geometry = feature.geometry;

      let lat: number = props.lat;
      let lon: number = props.lon;

      // COORDINATE EXTRACTION
      if (geometry && geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
        // Geoapify Point is [lon, lat]
        lon = geometry.coordinates[0];
        lat = geometry.coordinates[1];
      } else if (geometry && geometry.type !== 'Point') {
        // If it's a complex geometry (Polygon, etc.), rely on the simpler properties.lat/lon
        // If we tried to access geometry.coordinates here, it would be an array of arrays (the polygon points)
        // The error you saw happens when geometry.coordinates is an array of arrays, and you try to assign it to a single number
        console.warn(`Complex geometry type found (${geometry.type}). Using properties.lat/lon.`);
      }

      // If props.lat or props.lon were undefined, the mapper would fail later.
      // We rely on Geoapify to provide props.lat/lon for a center point.
      if (!lat || !lon) {
        console.error('Missing valid coordinates for place:', props.name);
        // Optional: throw error or skip item if coordinates are essential
      }

      return {
        place_id: props.place_id,
        name: props.name || 'Unnamed Place',
        formatted: props.formatted || 'Address not available',

        // ❌ Remove the old problematic line: lat: geometry?.coordinates[1] || props.lat,
        // ❌ Remove the old problematic line: lon: geometry?.coordinates[0] || props.lon,

        // ✅ Use the cleaned variables
        lat: lat,
        lon: lon,
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
            props.takeaway || props.raw?.takeaway === 'yes' || props.raw?.takeaway === 'only',
        },
        distance: props.distance,
      } as GeoapifyPlace;
    });
  }

  // ✅ Optional utility methods kept from your version
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
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
    categories: string[] = ['catering.restaurant'],
    limit: number = 50,
  ): Promise<GeoapifyPlace[]> {
    const categoryString = categories.join(',');
    const url = `${BASE_URL}/places?categories=${categoryString}&bias=proximity:${lon},${lat}&limit=${limit}&apiKey=${GEOAPIFY_API_KEY}`;

    console.log('📍 Fetching places from Geoapify (alternative):', url);

    const response = await fetch(url);
    const data = await response.json();
    return this.transformApiResponse(data);
  }

  async getPlaceDetails(placeId: string): Promise<GeoapifyPlace> {
    const url = `${BASE_URL}/place-details?id=${placeId}&apiKey=${GEOAPIFY_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.features?.length) throw new Error('Place not found');
    return this.transformApiResponse({ features: [data.features[0]] })[0];
  }

  async testApi(lat: number, lon: number) {
    const url = `${BASE_URL}/places?categories=catering.restaurant&bias=proximity:${lon},${lat}&limit=5&apiKey=${GEOAPIFY_API_KEY}`;
    console.log('🧪 Testing API with:', url);

    const response = await fetch(url);
    const data = await response.json();
    return data;
  }

  // async searchPlacesWithGeocoding(
  //   query: string,
  //   lat: number,
  //   lon: number,
  //   radius: number = 5000,
  //   categories: string[] = [
  //     "catering.restaurant",
  //     "catering.fast_food",
  //     "catering.cafe"
  //   ],
  //   limit: number = 20,
  //   forceRefresh: boolean = false
  // ): Promise<GeoapifyPlace[]> {
  //   const cacheKey = `geocode_${query.toLowerCase()}_${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}`;

  //   // ✅ Avoid duplicate API requests
  //   if (this.pendingRequests.has(cacheKey)) {
  //     return this.pendingRequests.get(cacheKey)!;
  //   }

  //   // ✅ Use cache if valid (unless forced refresh)
  //   if (!forceRefresh) {
  //     const cached = this.cache.get(cacheKey);
  //     if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
  //       console.log("📦 Using cached geocoding results");
  //       return cached.data;
  //     }
  //   }

  //   // ✅ Trigger fetch and store the pending promise
  //   const requestPromise = this.executeGeocodingSearch(
  //     query, lat, lon, radius, categories, limit, cacheKey
  //   );
  //   this.pendingRequests.set(cacheKey, requestPromise);

  //   // ✅ Clean up after completion
  //   requestPromise.finally(() => {
  //     this.pendingRequests.delete(cacheKey);
  //   });

  //   return requestPromise;
  // }

  // private async executeGeocodingSearch(
  //   query: string,
  //   lat: number,
  //   lon: number,
  //   radius: number,
  //   categories: string[],
  //   limit: number,
  //   cacheKey: string
  // ): Promise<GeoapifyPlace[]> {
  //   // Use Geoapify's Geocoding API with proximity bias and category filter
  //   const categoryString = categories.join(",");
  //   const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&bias=proximity:${lon},${lat}&categories=${categoryString}&limit=${limit}&format=json&apiKey=${GEOAPIFY_API_KEY}`;

  //   try {
  //     console.log("🔍 Geocoding search:", query);
  //     console.log("📍 URL:", url);

  //     const response = await fetch(url);

  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       console.error("❌ Geoapify Geocoding API error:", response.status, errorText);
  //       throw new Error(`Geoapify Geocoding API error: ${response.status}`);
  //     }

  //     const data = await response.json();
  //     const places = this.transformGeocodingResponse(data);

  //     // ✅ Cache results
  //     this.cache.set(cacheKey, {
  //       data: places,
  //       timestamp: Date.now(),
  //     });

  //     console.log("✅ Geocoding found places:", places.length);
  //     return places;
  //   } catch (error) {
  //     console.error("❌ Geoapify geocoding error:", error);

  //     // ✅ Fallback to stale cache if available
  //     const cached = this.cache.get(cacheKey);
  //     if (cached) {
  //       console.log("🔄 Using stale cache due to error");
  //       return cached.data;
  //     }

  //     throw new Error("Failed to search places with geocoding");
  //   }
  // }

  // private transformGeocodingResponse(data: any): GeoapifyPlace[] {
  //   if (!data.results) {
  //     console.log("ℹ️ No results found in geocoding response");
  //     return [];
  //   }

  //   return data.results
  //     .filter((result: any) => result.category === 'catering') // Filter for catering places
  //     .map((result: any) => {
  //       return {
  //         place_id: result.place_id,
  //         name: result.name || result.address_line1 || "Unnamed Place",
  //         formatted: result.formatted || "Address not available",
  //         lat: result.lat,
  //         lon: result.lon,
  //         categories: [result.category], // Use the main category
  //         address: {
  //           street: result.street || result.address_line1,
  //           city: result.city,
  //           state: result.state,
  //           postcode: result.postcode,
  //           country: result.country,
  //         },
  //         details: {
  //           cuisine: result.cuisine?.[0],
  //           brand: result.brand,
  //           takeaway: result.takeaway === "yes" || result.takeaway === "only",
  //         },
  //         distance: result.distance,
  //         // Add additional fields from geocoding response
  //         datasource: result.datasource,
  //         rank: result.rank,
  //       } as GeoapifyPlace;
  //     })
  //     .filter((place: GeoapifyPlace) => place.name !== "Unnamed Place"); // Filter out unnamed places
  // }

  async searchPlacesByName(
    query: string,
    lat: number,
    lon: number,
    radius: number = 5000,
    categories: string[] = ['catering.restaurant', 'catering.fast_food', 'catering.cafe'],
    limit: number = 20,
    forceRefresh: boolean = false,
  ): Promise<GeoapifyPlace[]> {
    const cacheKey = `name_search_${query.toLowerCase()}_${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}_${categories.join(',')}`;

    // Standard caching logic (use existing caching implementation)
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📦 Using cached name search results');
        return cached.data;
      }
    }

    const requestPromise = this.executePlacesNameSearch(
      query,
      lat,
      lon,
      radius,
      categories,
      limit,
      cacheKey,
    );
    this.pendingRequests.set(cacheKey, requestPromise);
    requestPromise.finally(() => {
      this.pendingRequests.delete(cacheKey);
    });

    return requestPromise;
  }

  private async executePlacesNameSearch(
    query: string,
    lat: number,
    lon: number,
    radius: number,
    categories: string[],
    limit: number,
    cacheKey: string,
  ): Promise<GeoapifyPlace[]> {
    const categoryString = categories.join(',');

    // 💡 THE FIX: Use /v2/places, apply the search query with &name=,
    // and use filter=circle to constrain the search area by radius.
    const url = `${BASE_URL}/places?name=${encodeURIComponent(query)}&categories=${categoryString}&filter=circle:${lon},${lat},${radius}&limit=${limit}&apiKey=${GEOAPIFY_API_KEY}`;

    try {
      console.log('🔍 Places API Name search:', query);
      console.log('📍 URL:', url);

      const response = await fetch(url);

      if (!response.ok) {
        // ... (Error handling as before)
        const errorText = await response.text();
        console.error('❌ Geoapify Places Name API error:', response.status, errorText);
        throw new Error(`Geoapify Places Name API error: ${response.status}`);
      }

      const data = await response.json();
      const places = this.transformApiResponse(data); // Re-use the existing transformApiResponse

      // ... (Caching and return as before)
      this.cache.set(cacheKey, { data: places, timestamp: Date.now() });
      console.log('✅ Places API found places:', places.length);
      return places;
    } catch (error) {
      // ... (Error handling/fallback as before)
      console.error('❌ Geoapify name search error:', error);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cache due to error');
        return cached.data;
      }
      throw new Error('Failed to search places by name from Geoapify');
    }
  }
}

export const geoapifyService = new GeoapifyService();
