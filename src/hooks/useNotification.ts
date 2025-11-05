import { useEffect, useRef } from 'react';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import { notificationService, NotificationData } from '@/src/services/notificationService';
import { useAuth } from './useAuth';

export const useNotifications = (onNotificationPress: (data: NotificationData) => void) => {
  const { user } = useAuth();
  const appState = useRef(AppState.currentState);

  // Request Android notification permission
  const requestAndroidPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // Android 13+ uses new permission system
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true; // Android 12 and below don't require this permission
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  // Request notification permissions and setup FCM
  const setupNotifications = async () => {
    try {
      // Request Android permissions if needed
      if (Platform.OS === 'android') {
        await requestAndroidPermission();
      }

      // Initialize notification channels
      await notificationService.initializeNotificationChannels();
      
      // Get FCM token and store it for the current user
      if (user) {
        const token = await notificationService.requestPermissionAndGetToken();
        if (token) {
          console.log('FCM Token for user:', token);
        }
      }

      console.log('Notification setup complete');
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  useEffect(() => {
    setupNotifications();

    // Setup foreground message handler
    const unsubscribeForeground = notificationService.setupForegroundHandler(onNotificationPress);

    // Setup background/quit state handler
    notificationService.setupNotificationHandler(onNotificationPress);

    // Handle app state changes
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        user
      ) {
        // Refresh token when app comes to foreground
        const token = await notificationService.requestPermissionAndGetToken();
        console.log('Refreshed FCM token:', token);
      }
      appState.current = nextAppState;
    });

    return () => {
      unsubscribeForeground();
      subscription.remove();
    };
  }, [user, onNotificationPress]);
};