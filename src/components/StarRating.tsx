// src/components/StarRating.tsx (only the star JSX part shown)
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Star } from 'lucide-react-native';

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  size = 16,
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const renderStar = (index: number) => {
    const filled = index < Math.floor(rating);
    const halfFilled = index < rating && index >= Math.floor(rating);

    const StarComponent = interactive ? TouchableOpacity : View;

    const testID = filled ? 'star-filled' : halfFilled ? 'star-half' : 'star-empty';

    return (
      <StarComponent
        key={index}
        onPress={interactive ? () => onRatingChange?.(index + 1) : undefined}
        style={interactive ? styles.interactiveStar : undefined}
      >
        <Star
          testID={testID}
          size={size}
          fill={filled || halfFilled ? '#FFD700' : 'transparent'}
          color={filled || halfFilled ? '#FFD700' : '#E0E0E0'}
        />
      </StarComponent>
    );
  };

  return <View style={styles.container}>{[0, 1, 2, 3, 4].map(renderStar)}</View>;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  interactiveStar: { padding: 2 },
});
