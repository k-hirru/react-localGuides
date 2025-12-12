import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuthContext } from '@/src/context/AuthContext';
import { useNotifications } from '@/src/hooks/useNotification';
import { NotificationData } from '@/src/services/notificationService';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { AppErrorBoundary } from '@/src/components/AppErrorBoundary';
import { crashReporter } from '@/src/services/crashReporter';
import { useInternetConnectivity } from '@/src/hooks/useInternetConnectivity';
import { favoriteService } from '@/src/services/favoriteService';
import { offlineQueueService } from '@/src/services/offlineQueueService';
import { reviewService } from '@/src/services/reviewService';

import TabNavigator from './TabNavigator';
import BusinessDetailsScreen from '../screens/business/BusinessDetailsScreen';
import AddReviewScreen from '../screens/business/AddReviewScreen';
import LoginScreen from '../screens/entry/LoginScreen';
import SignUpScreen from '../screens/entry/SignUpScreen';
import BusinessMapScreen from '../screens/business/BusinessMapScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

SplashScreen.preventAutoHideAsync();

crashReporter.init();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Explicit exponential backoff and smarter retry rules so
      // network behavior is predictable and easy to explain.
      retry: (failureCount, error: any) => {
        const status = (error as any)?.response?.status ?? (error as any)?.status;
        if (status && status >= 400 && status < 500) {
          return false; // don't retry obvious client errors
        }
        return failureCount < 3; // up to 3 attempts
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // cap at 30s
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'react-query',
  throttleTime: 1000,
});

const Stack = createNativeStackNavigator();

function AuthNavigator() {
  const { user, loading } = useAuthContext(); // ← USE CONTEXT INSTEAD
  const navigationRef = useNavigationContainerRef();
  const { isConnected } = useInternetConnectivity();

  // Flush any queued offline favorite toggles and review/helpful mutations
  // once we have both a user and a confirmed network connection.
  useEffect(() => {
    const flushQueues = async () => {
      if (!user || !isConnected) return;

      // 1) Favorites queue (legacy key)
      try {
        const raw = await AsyncStorage.getItem('favoritesOfflineQueue_v1');
        if (raw) {
          const queue: { businessId: string; isCurrentlyFavorite: boolean }[] = JSON.parse(raw);
          if (Array.isArray(queue) && queue.length > 0) {
            for (const item of queue) {
              try {
                await favoriteService.toggleFavorite(
                  user.uid,
                  item.businessId,
                  item.isCurrentlyFavorite,
                );
              } catch (error) {
                console.warn('⚠️ Failed to replay offline favorite toggle:', {
                  businessId: item.businessId,
                  isCurrentlyFavorite: item.isCurrentlyFavorite,
                  error,
                });
              }
            }
          }

          await AsyncStorage.removeItem('favoritesOfflineQueue_v1');
        }
      } catch (error) {
        console.error('Failed to flush offline favorites queue:', error);
      }

      // 2) Generic offline mutation queue (reviews + helpful votes)
      try {
        const allMutations = await offlineQueueService.getAll();
        if (!allMutations.length) return;

        // Only attempt to replay mutations that belong to the currently
        // authenticated user. This avoids leaking actions across accounts
        // if someone signs out/in while offline.
        const mutations = allMutations.filter((m) => {
          if (m.type === 'review:add') return m.payload.userId === user.uid;
          if (m.type === 'review:delete') return true; // review doc itself encodes user
          if (m.type === 'review:helpful') return m.taggedBy === user.uid;
          return false;
        });

        const remaining: typeof allMutations = [];

        for (const m of mutations) {
          try {
            if (m.type === 'review:add') {
              // Skip if a review already exists for this user+business
              const existing = await reviewService.getUserReviewForBusiness(
                m.payload.userId,
                m.payload.businessId,
              );
              if (!existing) {
                await reviewService.addReview({
                  businessId: m.payload.businessId,
                  userId: m.payload.userId,
                  userName: m.payload.userName,
                  userAvatar: m.payload.userAvatar,
                  rating: m.payload.rating,
                  text: m.payload.text,
                  images: m.payload.images,
                  helpful: 0,
                } as any);
              }
            } else if (m.type === 'review:delete') {
              await reviewService.deleteReview(m.reviewId);
            } else if (m.type === 'review:helpful') {
              if (m.delta === 1) {
                await reviewService.addHelpfulVote({
                  reviewId: m.reviewId,
                  reviewOwnerId: m.reviewOwnerId,
                  taggedBy: m.taggedBy,
                  businessId: m.businessId,
                });
                await reviewService.updateReviewHelpfulCount(m.reviewId, 1);
              } else {
                await reviewService.removeHelpfulVote(m.reviewId, m.taggedBy);
                await reviewService.updateReviewHelpfulCount(m.reviewId, -1);
              }
            }
          } catch (error) {
            console.warn('⚠️ Failed to replay offline mutation, keeping in queue:', {
              mutationId: m.id,
              type: m.type,
              error,
            });
            remaining.push(m);
          }
        }

        // Keep any unprocessed mutations (including those for other users)
        // so they can be retried on a future session.
        await offlineQueueService.replaceAll(
          remaining.concat(allMutations.filter((m) => !mutations.includes(m))),
        );
      } catch (error) {
        console.error('Failed to flush offline mutation queue:', error);
      }
    };

    flushQueues();
  }, [user?.uid, isConnected]);

  // Handle notification press - navigate to business details with review highlight
  const handleNotificationPress = (data: NotificationData) => {
    console.log('Notification pressed with data:', data);
    if (data.reviewId && data.businessId) {
      // Navigate to BusinessDetailsScreen with the reviewId to highlight
      (navigationRef.current as any)?.navigate('BusinessDetails', {
        id: data.businessId,
        highlightReviewId: data.reviewId,
      });
    }
  };

  // Setup notifications
  useNotifications(handleNotificationPress);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8F9FA',
        }}
      >
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: 'Back',
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      {!user ? (
        // Auth screens - user not logged in
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
        </>
      ) : (
        // Main app - user logged in
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen
            name="BusinessDetails"
            component={BusinessDetailsScreen}
            options={({ route }: any) => ({
              title: 'Business Details',
              headerShown: true,
            })}
          />
          <Stack.Screen
            name="AddReview"
            component={AddReviewScreen}
            options={{
              title: 'Add Review',
              headerShown: true,
              headerBackTitle: 'Back',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="BusinessMap"
            component={BusinessMapScreen}
            options={{
              title: 'Location',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{
              title: 'Admin Dashboard',
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <AuthProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: 6 * 60 * 60 * 1000, // 6 hours, aligned with nearby cache TTL
        }}
      >
        <NavigationContainer>
          <AppErrorBoundary>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <OfflineBanner />
              <AuthNavigator />
            </GestureHandlerRootView>
          </AppErrorBoundary>
        </NavigationContainer>
      </PersistQueryClientProvider>
    </AuthProvider>
  );
}
