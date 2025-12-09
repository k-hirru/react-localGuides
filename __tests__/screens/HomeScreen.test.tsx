import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeScreen from '@/src/screens/home';
import { AuthProvider } from '@/src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';

// Mock location hook so HomeScreen thinks it has a location
jest.mock('@/src/hooks/useLocation', () => ({
  useLocation: () => ({ userLocation: { latitude: 14.5995, longitude: 120.9842 } }),
}));

// Mock connectivity hook
jest.mock('@/src/hooks/useInternetConnectivity', () => ({
  useInternetConnectivity: () => ({
    isConnected: true,
    checkConnectivity: jest.fn().mockResolvedValue(true),
    showOfflineAlert: jest.fn(),
  }),
}));

// Mock infinite nearby businesses query used by HomeScreen
jest.mock('@/src/hooks/queries/useNearbyBusinessesQuery', () => ({
  useInfiniteNearbyBusinessesQuery: () => ({
    data: {
      pages: [
        [
          {
            id: 'place-1',
            name: 'Test Cafe',
            address: '123 Street',
            category: 'cafes',
            rating: 4.5,
            reviewCount: 10,
            features: ['WiFi'],
          },
        ],
      ],
    },
    isLoading: false,
    isFetching: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    dataUpdatedAt: Date.now(),
  }),
}));

// Mock BusinessCard to a lightweight component to avoid heavy tree and extra hooks
jest.mock('@/src/components/BusinessCard', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return function MockBusinessCard({ business }: { business: { name: string } }) {
    return (
      <View>
        <Text>{business.name}</Text>
      </View>
    );
  };
});

const createTestWrapper = (children: React.ReactNode) => {
  const queryClient = new QueryClient();
  return (
    <NavigationContainer>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AuthProvider>
    </NavigationContainer>
  );
};

describe('HomeScreen', () => {
  it('renders a list of nearby businesses', async () => {
    render(createTestWrapper(<HomeScreen />));

    // Basic smoke assertion: the mocked business name appears at least once
    const businessTitles = await screen.findAllByText('Test Cafe');
    expect(businessTitles.length).toBeGreaterThan(0);
  });
});
