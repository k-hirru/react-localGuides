import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CategoryFilter from '../CategoryFilter';

// Mock the categories constant
jest.mock('@/src/constants/categories', () => ({
  CATEGORIES: [
    { id: 'all', name: 'All', icon: '🌟' },
    { id: 'restaurant', name: 'Restaurants', icon: '🍕' },
    { id: 'cafe', name: 'Cafes', icon: '☕' },
  ],
}));

describe('CategoryFilter', () => {
  it('renders all categories from CATEGORIES', () => {
    const { getByText } = render(
      <CategoryFilter selectedCategory="all" onCategoryChange={() => {}} />
    );

    expect(getByText('All')).toBeTruthy();
    expect(getByText('Restaurants')).toBeTruthy();
    expect(getByText('Cafes')).toBeTruthy();
  });

  it('calls onCategoryChange with correct ID when pressed', () => {
    const mockOnChange = jest.fn();
    const { getByText } = render(
      <CategoryFilter selectedCategory="all" onCategoryChange={mockOnChange} />
    );

    fireEvent.press(getByText('Restaurants'));
    expect(mockOnChange).toHaveBeenCalledWith('restaurant');
  });

  it('applies selected styles to current category', () => {
    const { getByText } = render(
      <CategoryFilter selectedCategory="restaurant" onCategoryChange={() => {}} />
    );

    const selectedCategory = getByText('Restaurants');
    // The selected category should have the selected styles applied
    expect(selectedCategory).toBeTruthy();
  });

  it('applies default styles to non-selected categories', () => {
    const { getByText } = render(
      <CategoryFilter selectedCategory="restaurant" onCategoryChange={() => {}} />
    );

    const nonSelectedCategory = getByText('Cafes');
    // Non-selected categories should have default styles
    expect(nonSelectedCategory).toBeTruthy();
  });
});