import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface Location {
  latitude: number;
  longitude: number;
}

class LocationService {
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // For iOS, we need to use a different approach since requestAuthorization doesn't return a promise
        return new Promise((resolve) => {
          Geolocation.requestAuthorization(
            () => resolve(true), // Success callback
            () => resolve(false) // Error callback
          );
        });
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to show nearby places.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      return false;
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  async getCurrentPosition(): Promise<Location> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location error:', error);
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 10000 
        }
      );
    });
  }

  async getLocation(): Promise<Location | null> {
    try {
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      return await this.getCurrentPosition();
    } catch (error) {
      console.error('Failed to get location:', error);
      return null;
    }
  }
}

export const locationService = new LocationService();