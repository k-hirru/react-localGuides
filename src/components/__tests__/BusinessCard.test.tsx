import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BusinessCard from '@/src/components/BusinessCard';
import { Business } from '@/src/types';

// Mock dependencies
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Heart: ({ fill, color, size, testID }: any) => (
      <View testID={testID} fill={fill} color={color} size={size} />
    ),
    MapPin: ({ size, color, testID }: any) => (
      <View testID={testID} size={size} color={color} />
    ),
  };
});

jest.mock('@/src/hooks/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('../StarRating', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ rating, size }: any) => (
    <View testID="star-rating" rating={rating} size={size} />
  );
});

jest.mock('@/src/constants/categories', () => ({
  PRICE_LEVELS: [
    { level: 1, symbol: '$' },
    { level: 2, symbol: '$$' },
    { level: 3, symbol: '$$$' },
  ],
}));

const mockBusiness: Business = {
  id: 'business1',
  name: 'Test Restaurant',
  address: '123 Test St, Test City',
  rating: 4.5,
  reviewCount: 42,
  category: 'restaurant',
  priceLevel: 2,
  imageUrl: 'https://example.com/image.jpg',
  coordinates: { latitude: 40.7128, longitude: -74.0060 },
  phone: '+1234567890',
  hours: {},
  photos: [],
  description: 'Test description',
  features: [],
  placeId: 'business1',
  source: 'geoapify',
  website: 'https://example.com'
};

describe('BusinessCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require('@/src/hooks/useAppStore').useAppStore.mockReturnValue({
      toggleFavorite: jest.fn(),
      isFavorite: jest.fn().mockReturnValue(false),
    });
  });

  it('renders business information correctly', () => {
    const { getByText, getByTestId } = render(
      <BusinessCard business={mockBusiness} onPress={() => {}} />
    );

    expect(getByText('Test Restaurant')).toBeTruthy();
    expect(getByText('123 Test St, Test City')).toBeTruthy();
    expect(getByText('(42)')).toBeTruthy();
    expect(getByText('$$')).toBeTruthy();
    expect(getByTestId('business-image')).toBeTruthy();
    expect(getByTestId('star-rating')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <BusinessCard business={mockBusiness} onPress={mockOnPress} />
    );

    fireEvent.press(getByTestId('business-card'));
    expect(mockOnPress).toHaveBeenCalledWith('business1');
  });

  it('calls toggleFavorite when heart is pressed without custom action', () => {
    const mockToggleFavorite = jest.fn();
    require('@/src/hooks/useAppStore').useAppStore.mockReturnValue({
      toggleFavorite: mockToggleFavorite,
      isFavorite: jest.fn().mockReturnValue(false),
    });

    const { getByTestId } = render(
      <BusinessCard business={mockBusiness} onPress={() => {}} />
    );

    fireEvent.press(getByTestId('favorite-button'));
    expect(mockToggleFavorite).toHaveBeenCalledWith('business1');
  });

  it('calls customHeartAction when provided and heart is pressed', () => {
    const mockCustomAction = jest.fn();
    const { getByTestId } = render(
      <BusinessCard 
        business={mockBusiness} 
        onPress={() => {}} 
        customHeartAction={mockCustomAction}
      />
    );

    fireEvent.press(getByTestId('favorite-button'));
    expect(mockCustomAction).toHaveBeenCalled();
  });

  it('shows filled heart when business is favorite', () => {
    require('@/src/hooks/useAppStore').useAppStore.mockReturnValue({
      toggleFavorite: jest.fn(),
      isFavorite: jest.fn().mockReturnValue(true),
    });

    const { getByTestId } = render(
      <BusinessCard business={mockBusiness} onPress={() => {}} />
    );

    const heartIcon = getByTestId('heart-icon');
    expect(heartIcon.props.fill).toBe('#FF6B6B');
    expect(heartIcon.props.color).toBe('#FF6B6B');
  });
});