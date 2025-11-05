import notifee, {
  AndroidStyle,
  AndroidImportance,
  EventType,
} from '@notifee/react-native';
import messaging, { 
  FirebaseMessagingTypes,
  getIsHeadless 
} from '@react-native-firebase/messaging';

export interface NotificationData {
  reviewId: string;
  businessId: string;
  type: 'helpful_review';
}

class NotificationService {
  private isInitialized = false;
  private tokenRequestInProgress = false;
  private cachedToken: string | null = null;
  private lastTokenRequestTime = 0;
  private readonly TOKEN_REQUEST_COOLDOWN = 30000; // 30 seconds

  // Request permission and get FCM token with debouncing
  async requestPermissionAndGetToken(): Promise<string | null> {
    // Prevent duplicate simultaneous requests
    if (this.tokenRequestInProgress) {
      console.log('⏳ FCM token request already in progress, returning cached token');
      return this.cachedToken;
    }

    // Rate limiting - don't request token more than once every 30 seconds
    const now = Date.now();
    if (now - this.lastTokenRequestTime < this.TOKEN_REQUEST_COOLDOWN && this.cachedToken) {
      console.log('⏳ Using cached FCM token (rate limited)');
      return this.cachedToken;
    }

    this.tokenRequestInProgress = true;
    this.lastTokenRequestTime = now;

    try {
      console.log('🔐 Requesting FCM permission...');
      
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('FCM Authorization status:', authStatus);

      if (enabled) {
        const token = await messaging().getToken();
        console.log('✅ FCM Token received:', token);
        this.cachedToken = token;
        return token;
      } else {
        console.log('❌ FCM Permission denied');
        this.cachedToken = null;
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      this.cachedToken = null;
      return null;
    } finally {
      this.tokenRequestInProgress = false;
    }
  }

  // Clear cached token (useful on logout)
  clearCachedToken(): void {
    this.cachedToken = null;
    this.lastTokenRequestTime = 0;
    console.log('🗑️ Cleared cached FCM token');
  }

  // Get current token without requesting new one
  getCurrentToken(): string | null {
    return this.cachedToken;
  }

  // Initialize notification channels (Android)
  async initializeNotificationChannels() {
    if (this.isInitialized) {
      console.log('📱 Notification channels already initialized');
      return;
    }

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
      console.log('✅ Notification channels initialized');
    } catch (error) {
      console.error('❌ Error initializing notification channels:', error);
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
      
      console.log('📲 Notification displayed:', title);
    } catch (error) {
      console.error('❌ Error displaying notification:', error);
    }
  }

  // Handle notification when app is in foreground
  setupForegroundHandler(
    onNotificationPress: (data: NotificationData) => void
  ) {
    return messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('📨 FCM Message received in foreground:', remoteMessage);

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
          '👆 Notification pressed in background:',
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