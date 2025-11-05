import notifee, {
  AndroidStyle,
  AndroidImportance,
  EventType,
} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';

export interface NotificationData {
  reviewId: string;
  businessId: string;
  type: 'helpful_review';
}

class NotificationService {
  private isInitialized = false;

  // Request permission and get FCM token
  async requestPermissionAndGetToken(): Promise<string | null> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('FCM Authorization status:', authStatus);
        const token = await messaging().getToken();
        console.log('FCM Token:', token);
        return token;
      } else {
        console.log('FCM Permission denied');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Initialize notification channels (Android)
  async initializeNotificationChannels() {
    if (this.isInitialized) return;

    try {
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });

      await notifee.createChannel({
        id: 'reviews',
        name: 'Review Notifications',
        importance: AndroidImportance.HIGH,
      });

      this.isInitialized = true;
      console.log('Notification channels initialized');
    } catch (error) {
      console.error('Error initializing notification channels:', error);
    }
  }

  // Display local notification
  async displayNotification(
    title: string,
    body: string,
    data: NotificationData
  ) {
    try {
      await this.initializeNotificationChannels();

      await notifee.displayNotification({
        title,
        body,
        // Cast data to Record<string, string> to satisfy Notifee types
        data: data as unknown as Record<string, string>,
        android: {
          channelId: 'reviews',
          pressAction: {
            id: 'default',
          },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: body,
          },
        },
      });
    } catch (error) {
      console.error('Error displaying notification:', error);
    }
  }

  // Handle notification when app is in foreground
  setupForegroundHandler(
    onNotificationPress: (data: NotificationData) => void
  ) {
    return messaging().onMessage(async (remoteMessage) => {
      console.log('FCM Message received in foreground:', remoteMessage);

      const { notification, data } = remoteMessage;

      if (notification && data) {
        await this.displayNotification(
          notification.title || 'New Notification',
          notification.body || '',
          data as unknown as NotificationData
        );
      }
    });
  }

  // Handle notification taps
  setupNotificationHandler(
    onNotificationPress: (data: NotificationData) => void
  ) {
    // Handle taps while app is backgrounded/quitted
    return notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log(
          'Notification pressed in background:',
          detail.notification?.data
        );
        const data = detail.notification?.data as
          | (unknown & NotificationData)
          | undefined;
        if (data) {
          onNotificationPress(data);
        }
      }
    });
  }
}

export const notificationService = new NotificationService();
