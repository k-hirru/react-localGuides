import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FavoritesScreen from '@/src/screens/favorites/favorites';

// Mock auth to control logged-in vs logged-out state
jest.mock('@/src/context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'user-1', name: 'Test User' },
  }),
}));

// Mock favorites hook to return a simple list
const mockToggleFavorite = jest.fn();

jest.mock('@/src/hooks/useFavoriteBusinesses', () => ({
  useFavoriteBusinesses: () => ({
    favoriteBusinesses: [
      {
        id: 'fav-1',
        name: 'Fav Cafe',
        address: 'Favorite Street',
        category: 'cafes',
        rating: 4.5,
        reviewCount: 3,
        features: ['WiFi'],
      },
    ],
    toggleFavorite: mockToggleFavorite,
  }),
}));

// Mock BusinessCard to keep tree light
jest.mock('@/src/components/BusinessCard', () => {
  const React = require('react');
  const { Text, View, TouchableOpacity } = require('react-native');
  return function MockBusinessCard({
    business,
    onPress,
    customHeartAction,
  }: {
    business: { name: string };
    onPress: () => void;
    customHeartAction?: () => void;
  }) {
    return (
      <View>
        <Text>{business.name}</Text>
        <TouchableOpacity onPress={onPress}>
          <Text>Open</Text>
        </TouchableOpacity>
        {customHeartAction && (
          <TouchableOpacity onPress={customHeartAction}>
            <Text>Heart</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
});

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('FavoritesScreen', () => {
  it('renders user favorites list', async () => {
    render(<FavoritesScreen />);

    expect(await screen.findByText('Your Favorites')).toBeTruthy();
    expect(await screen.findByText('Fav Cafe')).toBeTruthy();
  });

  it('calls custom heart action to remove favorite', async () => {
    render(<FavoritesScreen />);

    const heartButton = await screen.findByText('Heart');
    fireEvent.press(heartButton);

    expect(mockToggleFavorite).toHaveBeenCalledWith('fav-1');
  });
});
