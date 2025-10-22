import { GeoapifyPlace } from '@/src/types';

const GEOAPIFY_API_KEY = 'fc934ca7146b47d4b172372c1aebaf80'; // You'll get this from Geoapify dashboard
const BASE_URL = 'https://api.geoapify.com/v1';

class GeoapifyService {
  private cachedResults: Map<string, GeoapifyPlace[]> = new Map();

  async searchNearbyPlaces(
    lat: number,
    lon: number, 
    radius: number = 5000,
    categories: string[] = ['catering.restaurant', 'catering.fast_food', 'catering.cafe'],
    limit: number = 50
  ): Promise<GeoapifyPlace[]> {
    const categoryString = categories.join(',');
    const url = `${BASE_URL}/places?filter=circle:${lon},${lat},${radius}&categories=${categoryString}&limit=${limit}&apiKey=${GEOAPIFY_API_KEY}`;
    
    try {
      console.log('Fetching places from Geoapify:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Geoapify API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.features) {
        return [];
      }
      
      const places = data.features.map((feature: any) => {
        const props = feature.properties;
        return {
          place_id: props.place_id,
          name: props.name || 'Unnamed Place',
          formatted: props.formatted || 'Address not available',
          lat: props.lat,
          lon: props.lon,
          categories: props.categories || [],
          address: {
            street: props.street,
            city: props.city,
            state: props.state,
            postcode: props.postcode,
            country: props.country
          },
          details: {
            cuisine: props.raw?.cuisine,
            brand: props.raw?.brand,
            takeaway: props.raw?.takeaway === 'yes' || props.raw?.takeaway === 'only'
          },
          distance: props.distance
        } as GeoapifyPlace;
      });

      console.log(`Found ${places.length} places from Geoapify`);
      return places;
      
    } catch (error) {
      console.error('Geoapify search error:', error);
      throw new Error('Failed to fetch places from Geoapify');
    }
  }

  async getPlaceDetails(placeId: string): Promise<GeoapifyPlace> {
    const url = `${BASE_URL}/places?ids=${placeId}&apiKey=${GEOAPIFY_API_KEY}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Geoapify API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('Place not found');
      }
      
      const feature = data.features[0];
      const props = feature.properties;
      
      return {
        place_id: props.place_id,
        name: props.name || 'Unnamed Place',
        formatted: props.formatted || 'Address not available',
        lat: props.lat,
        lon: props.lon,
        categories: props.categories || [],
        address: {
          street: props.street,
          city: props.city,
          state: props.state,
          postcode: props.postcode,
          country: props.country
        },
        details: {
          cuisine: props.raw?.cuisine,
          brand: props.raw?.brand,
          takeaway: props.raw?.takeaway === 'yes' || props.raw?.takeaway === 'only'
        },
        distance: props.distance
      };
    } catch (error) {
      console.error('Geoapify details error:', error);
      throw new Error('Failed to fetch place details');
    }
  }

  // Clear cache (useful when location changes significantly)
  clearCache() {
    this.cachedResults.clear();
  }
}

export const geoapifyService = new GeoapifyService();