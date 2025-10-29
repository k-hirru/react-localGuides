// /src/services/locationService.ts
import { Platform } from "react-native";
import {
  request,
  PERMISSIONS,
  RESULTS,
  check,
} from "react-native-permissions";
import Geolocation from '@react-native-community/geolocation';

export interface Location {
  latitude: number;
  longitude: number;
}

class LocationService {
  async requestPermissions(): Promise<boolean> {
    try {
      console.log("📍 LOCATION SERVICE - Starting permission request...");

      let permission;
      
      if (Platform.OS === "ios") {
        permission = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
      } else if (Platform.OS === "android") {
        permission = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      } else {
        console.log("📍 LOCATION SERVICE - Platform not supported");
        return false;
      }

      // Check current status first
      const currentStatus = await check(permission);
      console.log("📍 LOCATION SERVICE - Current permission status:", currentStatus);

      // Request permission if not determined
      if (currentStatus === RESULTS.DENIED) {
        console.log("📍 LOCATION SERVICE - Requesting permission...");
        const result = await request(permission);
        console.log("📍 LOCATION SERVICE - Permission request result:", result);
        return result === RESULTS.GRANTED;
      }

      console.log("📍 LOCATION SERVICE - Final permission status:", currentStatus);
      return currentStatus === RESULTS.GRANTED;
      
    } catch (error) {
      console.error("📍 LOCATION SERVICE - Permission error:", error);
      return false;
    }
  }

  async getCurrentPosition(): Promise<Location> {
    return new Promise((resolve, reject) => {
      console.log("📍 LOCATION SERVICE - Starting getCurrentPosition...");

      Geolocation.getCurrentPosition(
        (position) => {
          console.log("📍 LOCATION SERVICE - Position received:", {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("📍 LOCATION SERVICE - Geolocation error:", {
            code: error.code,
            message: error.message,
          });
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }

  async getLocation(): Promise<Location | null> {
    try {
      console.log("📍 LOCATION SERVICE - getLocation() started");

      const hasPermission = await this.requestPermissions();
      console.log("📍 LOCATION SERVICE - Permission result:", hasPermission);

      if (!hasPermission) {
        console.log("❌ LOCATION SERVICE - Permission denied");
        // Fallback to Manila for development
        console.log("📍 Using Manila fallback coordinates");
        return {
          latitude: 14.5995,
          longitude: 120.9842
        };
      }

      console.log("📍 LOCATION SERVICE - Calling getCurrentPosition...");
      const location = await this.getCurrentPosition();
      console.log("📍 LOCATION SERVICE - Location received:", location);
      return location;
      
    } catch (error) {
      console.error("❌ LOCATION SERVICE - getLocation failed:", error);
      // Fallback to Manila for development
      console.log("📍 Using Manila fallback coordinates due to error");
      return {
        latitude: 14.5995,
        longitude: 120.9842
      };
    }
  }
}

export const locationService = new LocationService();