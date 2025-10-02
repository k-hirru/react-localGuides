import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native'; 
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/src/hooks/useAppStore";

import TabNavigator from './TabNavigator';
import BusinessDetailsScreen from '../screens/business/BusinessDetailsScreen';
import AddReviewScreen from '../screens/business/AddReviewScreen';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();

function RootLayoutNav() {
  return (
    <Stack.Navigator screenOptions={{ headerBackTitle: "Back" }}>
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
          title: 'Add Review',
          headerShown: true, 
          headerBackTitle: 'Back',
          presentation: "modal"
        }} 
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() { 
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <NavigationContainer> 
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </AppProvider>
      </QueryClientProvider>
    </NavigationContainer>
  );
}