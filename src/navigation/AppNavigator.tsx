import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuth } from "@/src/hooks/useAuth";

import TabNavigator from "./TabNavigator";
import BusinessDetailsScreen from "../screens/business/BusinessDetailsScreen";
import AddReviewScreen from "../screens/business/AddReviewScreen";
import LoginScreen from "../screens/entry/LoginScreen";
import SignUpScreen from "../screens/entry/SignUpScreen";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();

function AuthNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null; // Show nothing while checking auth state
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: "Back",
        animation: 'slide_from_right',
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
            options={{ headerShown: true }}
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
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthNavigator />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </NavigationContainer>
  );
}
