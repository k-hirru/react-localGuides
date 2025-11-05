import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import { notificationService, NotificationData } from '@/src/services/notificationService';
import { useAuthContext } from '@/src/context/AuthContext';

export const useNotifications = (onNotificationPress: (data: NotificationData) => void) => {
  const { user } = useAuthContext();
  const appState = useRef(AppState.currentState);

  // ✅ Memoize the permission request function
  const requestAndroidPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // ✅ Memoize the setup function
  const setupNotifications = useCallback(async () => {
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
  }, [user, requestAndroidPermission]);

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
  }, [setupNotifications, onNotificationPress, user]); // ✅ Proper dependencies
};