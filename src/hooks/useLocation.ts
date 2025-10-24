import { useState, useEffect, useCallback } from "react";
import { Location, locationService } from "@/src/services/locationService";

const defaultLocation: Location = {
  latitude: 14.5995,
  longitude: 120.9842,
};

// ✅ Global refs for location
const locationGlobalRefs = {
  requestInProgress: false,
  initialLoadDone: false,
};

export const useLocation = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLocation = useCallback(
    async (force: boolean = false): Promise<Location> => {
      if (locationGlobalRefs.requestInProgress) {
        return userLocation || defaultLocation;
      }

      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (!force && userLocation && now - lastUpdated < fiveMinutes) {
        return userLocation;
      }

      locationGlobalRefs.requestInProgress = true;
      setLoading(true);
      setError(null);

      try {
        const newLocation = await locationService.getLocation();

        if (newLocation) {
          setUserLocation(newLocation);
          setLastUpdated(now);
          return newLocation;
        }

        throw new Error("No location");
      } catch (err) {
        console.error("📍 Location fallback due to error:", err);

        const fallbackLocation = userLocation || defaultLocation;
        setUserLocation(fallbackLocation);
        setError("Failed to get your location. Using default area.");
        return fallbackLocation;
      } finally {
        locationGlobalRefs.requestInProgress = false;
        setLoading(false);
      }
    },
    [userLocation, lastUpdated]
  );

  // ✅ Only run once globally
  useEffect(() => {
    if (!locationGlobalRefs.initialLoadDone) {
      locationGlobalRefs.initialLoadDone = true;
      refreshLocation();
    }
  }, []);

  return {
    userLocation,
    loading,
    error,
    refreshLocation,
    defaultLocation,
  };
};