import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BusinessCard from '@/src/components/BusinessCard';
import { Business } from '@/src/types';

jest.mock('@/src/hooks/useAppStore', () => ({
  useAppStore: () => ({
    toggleFavorite: jest.fn(),
    isFavorite: jest.fn().mockReturnValue(false),
  }),
}));

const baseBusiness: Business = {
  id: 'b1',
  name: 'Test Cafe',
  category: 'restaurants',
  rating: 4.5,
  reviewCount: 10,
  priceLevel: 2,
  imageUrl: 'https://example.com/image.jpg',
  address: '123 Street',
  phone: '123-456',
  website: 'https://example.com',
  hours: {},
  coordinates: { latitude: 0, longitude: 0 },
  photos: [],
  description: 'Nice place',
  features: [],
  placeId: 'b1',
  source: 'geoapify',
};

describe('BusinessCard', () => {
  it('calls onPress when the card body is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<BusinessCard business={baseBusiness} onPress={onPress} />);

    const card = getByTestId('business-card-root');
    fireEvent.press(card);

    expect(onPress).toHaveBeenCalledWith('b1');
  });

  it('does not call onPress when only the heart is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<BusinessCard business={baseBusiness} onPress={onPress} />);

    const heartButton = getByTestId('business-card-heart');
    fireEvent.press(heartButton);

    expect(onPress).not.toHaveBeenCalled();
  });
});
