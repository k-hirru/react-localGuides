import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuthContext } from "@/src/context/AuthContext";
import { useNotifications } from "@/src/hooks/useNotification";
import { NotificationData } from "@/src/services/notificationService";
import { OfflineBanner } from "@/src/components/OfflineBanner";
import { LoadingScreen } from "@/src/components/LoadingScreen";

import TabNavigator from "./TabNavigator";
import BusinessDetailsScreen from "../screens/business/BusinessDetailsScreen";
import AddReviewScreen from "../screens/business/AddReviewScreen";
import LoginScreen from "../screens/entry/LoginScreen";
import SignUpScreen from "../screens/entry/SignUpScreen";
import BusinessMapScreen from "../screens/business/BusinessMapScreen";

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();

function AuthNavigator() {
  const { user, loading } = useAuthContext();
  const navigationRef = useNavigationContainerRef();

  const handleNotificationPress = (data: NotificationData) => {
    console.log("Notification pressed with data:", data);
    if (data.reviewId && data.businessId) {
      (navigationRef.current as any)?.navigate("BusinessDetails", {
        id: data.businessId,
        highlightReviewId: data.reviewId,
      });
    }
  };

  useNotifications(handleNotificationPress);

  if (loading) {
    return <LoadingScreen />; // Use the new loading screen
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
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <OfflineBanner />
            <AuthNavigator />
          </GestureHandlerRootView>
        </NavigationContainer>
      </QueryClientProvider>
    </AuthProvider>
  );
}