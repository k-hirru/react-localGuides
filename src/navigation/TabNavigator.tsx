import { Home, Search, Heart, User } from 'lucide-react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import Colors from '../constants/colors';
import AnimatedTabLabel from '../components/AnimatedTabBarLabel';

import HomeScreen from '../screens/home/index';
import ExploreScreen from '../screens/explore/explore';
import FavoritesScreen from '../screens/favorites/favorites';
import ProfileScreen from '../screens/profile/profile';

const Tab = createBottomTabNavigator();

export default function TabLayout() {
  return (
    <Tab.Navigator
      screenOptions={{
        animation: 'fade',
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: '#A0A0A0',
        headerShown: true,
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: '#cac8c8ff',
          height: 80,
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarItemStyle: {
          // Slightly reduce the visual touch area so the feedback circle
          // fits nicely within the tab bar height.
          marginVertical: 4,
        },
        tabBarLabelStyle: {
          display: 'none',
        },
        tabBarButton: ({
          children,
          onPress,
          accessibilityState,
          style,
        }: BottomTabBarButtonProps) => (
          <TouchableOpacity
            onPress={onPress}
            accessibilityState={accessibilityState}
            activeOpacity={0.8}
            style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, style]}
          >
            {children}
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home', // This is still used by screen reader/fallback
          headerShown: false,
          // Keep the icon static and simple
          tabBarIcon: ({ color, size }) => <Home color={color} size={size * 0.9} />,
          // 💡 Use the custom Animated Label component here
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel label="Home" color={color} focused={focused} />
          ),
        }}
      />
      {/* Apply the same tabBarIcon and tabBarLabel logic to other screens */}
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: 'Explore',
          headerTitle: 'Explore Places',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size * 0.9} />,
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel label="Explore" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favorites',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size * 0.9} />,
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel label="Favorites" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <User color={color} size={size * 0.9} />,
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel label="Profile" color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
