import { useState, useEffect, useCallback } from 'react';
import { Location, locationService } from '@/src/services/locationService';

  // Default fallback location (Manila center)
  const defaultLocation: Location = {
    latitude: 14.5995,
    longitude: 120.9842
  };

export const useLocation = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLocation = useCallback(async (force: boolean = false): Promise<Location> => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    // Don't refresh if we have a recent location and not forced
    if (!force && userLocation && (now - lastUpdated) < fiveMinutes) {
      return userLocation;
    }

    setLoading(true);
    setError(null);

    try {
      const newLocation = await locationService.getLocation();
      
      if (newLocation) {
        setUserLocation(newLocation);
        setLastUpdated(now);
        return newLocation;
      } else {
        throw new Error('Could not get location');
      }
    } catch (error) {
      console.error('Location refresh failed:', error);
      const errorMsg = 'Failed to get your location. Using default area.';
      setError(errorMsg);
      
      // Fallback to last known location or default
      const fallbackLocation = userLocation || defaultLocation;
      setUserLocation(fallbackLocation);
      return fallbackLocation;
    } finally {
      setLoading(false);
    }
  }, [userLocation, lastUpdated]);

  // Get initial location on mount
  useEffect(() => {
    refreshLocation();
  }, []);

  return { 
    userLocation, 
    loading, 
    error, 
    refreshLocation,
    defaultLocation 
  };
};