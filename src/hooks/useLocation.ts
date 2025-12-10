import { useState, useEffect, useCallback, useRef } from 'react';
import { Location, locationService } from '@/src/services/locationService';

const DEFAULT_LOCATION: Location = {
  latitude: 14.5995,
  longitude: 120.9842,
};

// ✅ Global singleton state to prevent duplicate fetches
let globalLocation: Location | null = null;
let globalLoading = false;
let globalListeners: Array<(location: Location | null) => void> = [];

export const useLocation = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(globalLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // ✅ Subscribe to global location updates
  useEffect(() => {
    const listener = (location: Location | null) => {
      if (isMounted.current) {
        setUserLocation(location);
        setLoading(false);
      }
    };

    globalListeners.push(listener);

    return () => {
      isMounted.current = false;
      globalListeners = globalListeners.filter((l) => l !== listener);
    };
  }, []);

  // ✅ Notify all listeners of location change
  const notifyListeners = useCallback((location: Location | null) => {
    globalLocation = location;
    globalListeners.forEach((listener) => listener(location));
  }, []);

  // ✅ Single shared location fetch
  const refreshLocation = useCallback(
    async (force: boolean = false): Promise<Location> => {
      // Return cached location if available and not forcing refresh
      if (!force && globalLocation) {
        console.log('📦 Using global cached location');
        return globalLocation;
      }

      // Prevent duplicate concurrent requests
      if (globalLoading) {
        console.log('⏳ Location fetch already in progress');
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!globalLoading && globalLocation) {
              clearInterval(checkInterval);
              resolve(globalLocation);
            }
          }, 100);
        });
      }

      globalLoading = true;
      setLoading(true);
      setError(null);

      try {
        console.log('📍 Fetching location...');
        const location = await locationService.getLocation(force);

        notifyListeners(location);
        console.log('✅ Location updated:', location);

        return location;
      } catch (err) {
        console.error('❌ Location fetch failed:', err);
        const fallback = globalLocation || DEFAULT_LOCATION;

        notifyListeners(fallback);
        setError('Using default location');

        return fallback;
      } finally {
        globalLoading = false;
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [notifyListeners],
  );

  // ✅ Initial location fetch - only once globally
  useEffect(() => {
    if (!globalLocation && !globalLoading) {
      refreshLocation(true);
    } else if (globalLocation) {
      setUserLocation(globalLocation);
    }
  }, []);

  return {
    userLocation,
    loading,
    error,
    refreshLocation,
    defaultLocation: DEFAULT_LOCATION,
  };
};
