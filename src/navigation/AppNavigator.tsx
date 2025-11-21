import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuthContext } from "@/src/context/AuthContext"; // ← CHANGE THIS
import { useNotifications } from "@/src/hooks/useNotification";
import { NotificationData } from "@/src/services/notificationService";
import { OfflineBanner } from "@/src/components/OfflineBanner";

import TabNavigator from "./TabNavigator";
import BusinessDetailsScreen from "../screens/business/BusinessDetailsScreen";
import AddReviewScreen from "../screens/business/AddReviewScreen";
import LoginScreen from "../screens/entry/LoginScreen";
import SignUpScreen from "../screens/entry/SignUpScreen";
import BusinessMapScreen from "../screens/business/BusinessMapScreen";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "react-query",
  throttleTime: 1000,
});

const Stack = createNativeStackNavigator();

function AuthNavigator() {
  const { user, loading } = useAuthContext(); // ← USE CONTEXT INSTEAD
  const navigationRef = useNavigationContainerRef();

  // Handle notification press - navigate to business details with review highlight
  const handleNotificationPress = (data: NotificationData) => {
    console.log("Notification pressed with data:", data);
    if (data.reviewId && data.businessId) {
      // Navigate to BusinessDetailsScreen with the reviewId to highlight
      (navigationRef.current as any)?.navigate("BusinessDetails", {
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
    return null;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: "Back",
        animation: "slide_from_right",
        animationDuration: 200,
      }}
    >
      {!user ? (
        // Auth screens - user not logged in
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        // Main app - user logged in
        <>
          <Stack.Screen
            name="Tabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BusinessDetails"
            component={BusinessDetailsScreen}
            options={({ route }: any) => ({
              title: "Business Details",
              headerShown: true,
            })}
          />
          <Stack.Screen
            name="AddReview"
            component={AddReviewScreen}
            options={{
              title: "Add Review",
              headerShown: true,
              headerBackTitle: "Back",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="BusinessMap"
            component={BusinessMapScreen}
            options={{
              title: "Location",
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
          <GestureHandlerRootView style={{ flex: 1 }}>
            <OfflineBanner />
            <AuthNavigator />
          </GestureHandlerRootView>
        </NavigationContainer>
      </PersistQueryClientProvider>
    </AuthProvider>
  );
}
