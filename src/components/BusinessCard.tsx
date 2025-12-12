import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart, MapPin } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  TapGestureHandler,
  State as GestureState,
  TapGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { Business } from '../types';
import { useAppStore } from '../hooks/useAppStore';
import StarRating from './StarRating';
import { PRICE_LEVELS } from '../constants/categories';

interface BusinessCardProps {
  business: Business;
  onPress: (businessId: string) => void;
  customHeartAction?: () => void; // ✅ NEW: Optional custom heart action
}

const BusinessCard = memo(({ business, onPress, customHeartAction }: BusinessCardProps) => {
  const { toggleFavorite, isFavorite } = useAppStore();

  // ✅ Use the isFavorite function instead of checking favorites array directly
  const favorite = isFavorite(business.id);
  const priceSymbol = PRICE_LEVELS.find((p) => p.level === business.priceLevel)?.symbol || '$';

  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = pressed.value ? 0.9 : 1;
    const backgroundColor = pressed.value ? 'rgba(207, 208, 209, 1)' : '#FFF'; // subtle gray overlay

    return {
      transform: [{ scale: scale.value }],
      opacity,
      backgroundColor,
    };
  });

  const handleStateChange = (event: TapGestureHandlerStateChangeEvent) => {
    const { state } = event.nativeEvent;

    if (state === GestureState.BEGAN) {
      // Press in: subtle shrink + dim overlay
      pressed.value = 1;
      scale.value = withTiming(0.98, {
        duration: 90,
        easing: Easing.out(Easing.ease),
      });
    }

    if (
      state === GestureState.END ||
      state === GestureState.CANCELLED ||
      state === GestureState.FAILED
    ) {
      // Finger lifted or gesture cancelled: reset visuals
      pressed.value = 0;
      scale.value = withTiming(1, {
        duration: 140,
        easing: Easing.out(Easing.ease),
      });

      if (state === GestureState.END) {
        console.log('🟢 BusinessCard - Pressed business ID:', business.id);
        onPress(business.id);
      }
    }
  };

  // ✅ Handle heart press - use custom action if provided, otherwise default
  const handleFavoritePress = () => {
    if (customHeartAction) {
      console.log('❤️ Using custom heart action');
      customHeartAction();
    } else {
      console.log('❤️ BusinessCard - Toggling favorite for:', business.id);
      toggleFavorite(business.id);
    }
  };

  return (
    <TapGestureHandler onHandlerStateChange={handleStateChange}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Image
          source={{ uri: business.imageUrl }}
          style={styles.image}
          resizeMode="cover"
          fadeDuration={300}
        />

        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Heart
            size={20}
            fill={favorite ? '#FF6B6B' : 'transparent'}
            color={favorite ? '#FF6B6B' : '#FFF'}
          />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {business.name}
          </Text>

          <View style={styles.ratingRow}>
            <StarRating rating={business.rating} size={14} />
            <Text style={styles.reviewCount}>({business.reviewCount})</Text>
            <Text style={styles.price}>{priceSymbol}</Text>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={12} color="#666" />
            <Text style={styles.address} numberOfLines={1}>
              {business.address}
            </Text>
          </View>
        </View>
      </Animated.View>
    </TapGestureHandler>
  );
});

BusinessCard.displayName = 'BusinessCard';

export default BusinessCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  price: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 'auto',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
});
