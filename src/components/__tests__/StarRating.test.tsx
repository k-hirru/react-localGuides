import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StarRating from '@/src/components/StarRating';

// Mock lucide-react-native so Jest can find <Star /> and return Views with testIDs
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  // forward testID prop to View for queries
  return {
    Star: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

describe('StarRating', () => {
  it('renders exactly 5 stars', () => {
    const { getAllByTestId } = render(<StarRating rating={2.5} />);
    const filled = getAllByTestId('star-filled');
    const half = getAllByTestId('star-half');
    const empty = getAllByTestId('star-empty');

    expect(filled.length + half.length + empty.length).toBe(5);
  });

  it('renders correct counts for 3.5 rating', () => {
    const { getAllByTestId } = render(<StarRating rating={3.5} />);
    expect(getAllByTestId('star-filled').length).toBe(3);
    expect(getAllByTestId('star-half').length).toBe(1);
    expect(getAllByTestId('star-empty').length).toBe(1);
  });

  it('calls onRatingChange when interactive and pressed', () => {
    const mockChange = jest.fn();
    const { getAllByTestId } = render(
      <StarRating rating={0} interactive onRatingChange={mockChange} />
    );
    const empties = getAllByTestId('star-empty');
    // press the 3rd star (index 2) -> should call with 3
    fireEvent.press(empties[2]);
    expect(mockChange).toHaveBeenCalledWith(3);
  });

  it('does not call onRatingChange when not interactive', () => {
    const mockChange = jest.fn();
    const { getAllByTestId } = render(
      <StarRating rating={0} interactive={false} onRatingChange={mockChange} />
    );
    const empties = getAllByTestId('star-empty');
    fireEvent.press(empties[2]);
    expect(mockChange).not.toHaveBeenCalled();
  });
});