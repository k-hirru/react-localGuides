// src/hooks/useLocation.ts
import { useState, useEffect, useCallback } from "react";
import { Location, locationService } from "@/src/services/locationService";

const defaultLocation: Location = {
  latitude: 14.5995,
  longitude: 120.9842,
};

export const useLocation = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLocation = useCallback(
    async (force: boolean = false): Promise<Location> => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      // Check cache first
      if (!force && userLocation && now - lastUpdated < fiveMinutes) {
        return userLocation;
      }

      setLoading(true);
      setError(null);

      try {
        const newLocation = await locationService.getLocation();
        if (!newLocation) throw new Error("No location received from service.");
        
        const stableLocation: Location = {
          latitude: newLocation.latitude, 
          longitude: newLocation.longitude 
        };
        
        setUserLocation(stableLocation);
        setLastUpdated(Date.now());
        
        console.log(`✅ LOCATION HOOK - Location fetched and state set: ${stableLocation.latitude}`);
        return stableLocation;
        
      } catch (err) {
        console.error("📍 Location fallback due to error:", err);
        const fallbackLocation = userLocation || defaultLocation;
        
        setUserLocation(fallbackLocation); 
        setError("Failed to get your location. Using default area.");
        return fallbackLocation;
        
      } finally {
        setLoading(false);
      }
    },
    [userLocation, lastUpdated]
  );

  // Initial load - simplified
  useEffect(() => {
    let mounted = true;
    
    const initLocation = async () => {
      try {
        await refreshLocation(true);
      } catch (error) {
        console.error("Failed to initialize location:", error);
      }
    };

    if (mounted) {
      initLocation();
    }

    return () => {
      mounted = false;
    };
  }, []);

  return {
    userLocation,
    loading,
    error,
    refreshLocation,
    defaultLocation,
  };
};