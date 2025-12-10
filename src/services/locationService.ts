import { Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS, check } from 'react-native-permissions';
import Geolocation from '@react-native-community/geolocation';

export interface Location {
  latitude: number;
  longitude: number;
}

const MANILA_FALLBACK: Location = {
  latitude: 14.5995,
  longitude: 120.9842,
};

class LocationService {
  private cachedLocation: Location | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private pendingRequest: Promise<Location> | null = null;
  private hasPermission: boolean | null = null;

  async requestPermissions(): Promise<boolean> {
    // Return cached permission result if available
    if (this.hasPermission !== null) {
      return this.hasPermission;
    }

    try {
      console.log('📍 Requesting location permissions...');

      const permission = Platform.select({
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        default: null,
      });

      if (!permission) {
        console.log('❌ Platform not supported');
        this.hasPermission = false;
        return false;
      }

      const currentStatus = await check(permission);

      if (currentStatus === RESULTS.GRANTED) {
        this.hasPermission = true;
        return true;
      }

      if (currentStatus === RESULTS.DENIED) {
        const result = await request(permission);
        this.hasPermission = result === RESULTS.GRANTED;
        return this.hasPermission;
      }

      this.hasPermission = false;
      return false;
    } catch (error) {
      console.error('❌ Permission error:', error);
      this.hasPermission = false;
      return false;
    }
  }

  private async getCurrentPositionInternal(): Promise<Location> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Location request timeout'));
      }, 10000); // 10 second timeout

      Geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          console.log('✅ Location received:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error('❌ Geolocation error:', error.message);
          reject(error);
        },
        {
          enableHighAccuracy: false, // ✅ Use lower accuracy for faster results
          timeout: 8000, // 8 seconds
          maximumAge: 60000, // Accept 1 minute old locations
        },
      );
    });
  }

  async getLocation(forceRefresh: boolean = false): Promise<Location> {
    const now = Date.now();

    // ✅ Return cached location if valid
    if (!forceRefresh && this.cachedLocation && now - this.cacheTimestamp < this.CACHE_DURATION) {
      console.log('📦 Using cached location');
      return this.cachedLocation;
    }

    // ✅ Deduplicate concurrent requests
    if (this.pendingRequest) {
      console.log('⏳ Waiting for pending location request...');
      return this.pendingRequest;
    }

    // ✅ Create new request
    this.pendingRequest = (async () => {
      try {
        const hasPermission = await this.requestPermissions();

        if (!hasPermission) {
          console.log('📍 No permission, using fallback');
          this.cachedLocation = MANILA_FALLBACK;
          this.cacheTimestamp = now;
          return MANILA_FALLBACK;
        }

        const location = await this.getCurrentPositionInternal();

        // ✅ Cache the result
        this.cachedLocation = location;
        this.cacheTimestamp = now;

        return location;
      } catch (error) {
        console.error('❌ Location fetch failed:', error);

        // ✅ Use stale cache if available
        if (this.cachedLocation) {
          console.log('🔄 Using stale cached location');
          return this.cachedLocation;
        }

        // ✅ Final fallback
        console.log('📍 Using Manila fallback');
        this.cachedLocation = MANILA_FALLBACK;
        this.cacheTimestamp = now;
        return MANILA_FALLBACK;
      } finally {
        this.pendingRequest = null;
      }
    })();

    return this.pendingRequest;
  }

  // ✅ Clear cache when needed
  clearCache() {
    this.cachedLocation = null;
    this.cacheTimestamp = 0;
    this.hasPermission = null;
    console.log('🗑️ Location cache cleared');
  }
}

export const locationService = new LocationService();
