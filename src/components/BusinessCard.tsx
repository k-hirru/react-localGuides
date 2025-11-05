import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Heart, MapPin } from "lucide-react-native";
import { Business } from "../types";
import { useAppStore } from "../hooks/useAppStore";
import StarRating from "./StarRating";
import { PRICE_LEVELS } from "../constants/categories";

interface BusinessCardProps {
  business: Business;
  onPress: (businessId: string) => void;
  customHeartAction?: () => void;
}

const BusinessCard = memo(({ business, onPress, customHeartAction }: BusinessCardProps) => {
  const { toggleFavorite, isFavorite } = useAppStore();
  
  const favorite = isFavorite(business.id);
  const priceSymbol =
    PRICE_LEVELS.find((p) => p.level === business.priceLevel)?.symbol || "$";

  const handlePress = () => {
    console.log('🟢 BusinessCard - Pressed business ID:', business.id);
    onPress(business.id);
  };

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
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress}
      testID="business-card" // ✅ ADDED
    >
      <Image
        source={{ uri: business.imageUrl }}
        style={styles.image}
        resizeMode="cover"
        fadeDuration={300}
        testID="business-image" // ✅ ADDED
      />

      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={handleFavoritePress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        testID="favorite-button" // ✅ ADDED
      >
        <Heart
          size={20}
          fill={favorite ? "#FF6B6B" : "transparent"}
          color={favorite ? "#FF6B6B" : "#FFF"}
          testID="heart-icon" // ✅ ADDED
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1} testID="business-name">
          {business.name}
        </Text>

        <View style={styles.ratingRow} testID="rating-row">
          <StarRating rating={business.rating} size={14} />
          <Text style={styles.reviewCount} testID="review-count">
            ({business.reviewCount})
          </Text>
          <Text style={styles.price} testID="price-level">
            {priceSymbol}
          </Text>
        </View>

        <View style={styles.locationRow} testID="location-row">
          <MapPin size={12} color="#666" testID="map-pin-icon" />
          <Text style={styles.address} numberOfLines={1} testID="business-address">
            {business.address}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

BusinessCard.displayName = "BusinessCard";

export default BusinessCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 20,
    padding: 8,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  price: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: "auto",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  address: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    flex: 1,
  },
});