import React, {
  useState,
  useLayoutEffect,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import {
  Heart,
  Phone,
  Globe,
  Clock,
  MapPin,
  MessageSquare,
  Share,
} from "lucide-react-native";
import { useAppStore } from "@/src/hooks/useAppStore";
import { Business, Review } from "@/src/types";
import { reviewService } from "@/src/services/reviewService";
import StarRating from "@/src/components/StarRating";
import ReviewCard from "@/src/components/ReviewCard";
import { PRICE_LEVELS } from "@/src/constants/categories";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function BusinessDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id, highlightReviewId } = route.params as {
    id: string;
    highlightReviewId?: string;
  };

  const {
    getBusinessById,
    fetchBusinessById,
    toggleFavorite,
    deleteReview,
    isFavorite,
  } = useAppStore();

  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const reviewRefs = useRef<{ [key: string]: View | null }>({});

  // ✅ Calculate rating from reviews
  const calculateRatingFromReviews = useCallback((reviewList: Review[]) => {
    if (reviewList.length === 0) return 0;
    const sum = reviewList.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviewList.length;
  }, []);

  const loadBusinessData = async () => {
    try {
      const localBusiness = getBusinessById(id);
      if (localBusiness) return localBusiness;
      return await fetchBusinessById(id);
    } catch (error) {
      console.error("Error loading business:", error);
      return null;
    }
  };

  const loadBusinessReviews = async () => {
    try {
      return await reviewService.getReviewsForBusiness(id);
    } catch (error) {
      console.error("Error loading business reviews:", error);
      return [];
    }
  };

  // ✅ FIXED: Refresh business data when reviews change
  const refreshBusinessData = useCallback(async () => {
    console.log("🔄 Refreshing business data...");
    
    const businessData = await loadBusinessData();
    const businessReviews = await loadBusinessReviews();
    
    if (businessData && businessReviews) {
      // Update rating based on current reviews
      const updatedRating = calculateRatingFromReviews(businessReviews);
      const updatedBusiness = {
        ...businessData,
        rating: updatedRating,
        reviewCount: businessReviews.length,
      };
      
      setBusiness(updatedBusiness);
      setReviews(businessReviews);
      console.log("✅ Business data refreshed:", {
        rating: updatedRating,
        reviewCount: businessReviews.length
      });
    }
  }, [id, calculateRatingFromReviews]);

  // ✅ Initial load
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      console.log("🚀 Loading business details for ID:", id);
      setLoading(true);
      setReviewsLoading(true);

      try {
        const businessData = await loadBusinessData();
        const businessReviews = await loadBusinessReviews();

        if (isMounted) {
          if (businessData) {
            // Update with fresh review stats
            const updatedRating = calculateRatingFromReviews(businessReviews);
            setBusiness({
              ...businessData,
              rating: updatedRating,
              reviewCount: businessReviews.length,
            });
          }
          if (businessReviews) setReviews(businessReviews);
          setLoading(false);
          setReviewsLoading(false);
        }
      } catch (error) {
        console.error("💥 Error in loadData:", error);
        if (isMounted) {
          setLoading(false);
          setReviewsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // ✅ Scroll to highlighted review
  useEffect(() => {
    if (highlightReviewId && reviews.length > 0) {
      const timer = setTimeout(() => {
        const reviewElement = reviewRefs.current[highlightReviewId];
        if (reviewElement && scrollViewRef.current) {
          try {
            (reviewElement as any).measureLayout(
              (scrollViewRef.current as any).getInnerViewNode(),
              (x: number, y: number) => {
                (scrollViewRef.current as any)?.scrollTo({
                  y: y - 100,
                  animated: true,
                });
                console.log("Scrolling to highlighted review:", highlightReviewId);
              },
              (err: any) => {
                console.log("Error measuring review layout", err);
              }
            );
          } catch (e) {
            console.log("Error trying to measure/scroll to review:", e);
          }
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [highlightReviewId, reviews]);

  // ✅ FIXED: Refresh when screen comes back into focus (after adding review)
  useFocusEffect(
    useCallback(() => {
      console.log("🎯 Screen focused, refreshing business data");
      refreshBusinessData();
    }, [refreshBusinessData])
  );

  const handleEdit = (review: Review) => {
    (navigation as any).navigate("AddReview", {
      id: id,
      review: review,
      business: business,
    });
  };

  const handleDelete = async (reviewId: string) => {
    Alert.alert(
      "Delete Review",
      "Are you sure you want to delete this review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReview(reviewId);
              // Refresh data after deletion
              await refreshBusinessData();
            } catch (error) {
              console.error("Error deleting review:", error);
              Alert.alert(
                "Error",
                "Failed to delete review. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  useLayoutEffect(() => {
    if (business) {
      navigation.setOptions({
        title: business.name,
        headerRight: () => (
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <Share size={20} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleFavorite(business.id)}
              style={styles.headerButton}
            >
              <Heart
                size={20}
                color={isFavorite(business.id) ? "#FF6B6B" : "#ada9a9ff"}
                fill={isFavorite(business.id) ? "#FF6B6B" : "transparent"}
              />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [navigation, business, isFavorite]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading business details...</Text>
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Business not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBusinessData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const priceSymbol =
    PRICE_LEVELS.find((p) => p.level === business.priceLevel)?.symbol || "$";

  // ✅ FIXED: Ensure photos array exists and has items
  const businessPhotos = business.photos && business.photos.length > 0 
    ? business.photos 
    : [business.imageUrl]; // Fallback to single imageUrl

  const handleCall = () => {
    if (business.phone) {
      Linking.openURL(`tel:${business.phone}`);
    } else {
      Alert.alert("No Phone", "Phone number not available for this business.");
    }
  };

  const handleWebsite = () => {
    if (business.website) {
      Linking.openURL(business.website);
    } else {
      Alert.alert("No Website", "Website not available for this business.");
    }
  };

  const handleDirections = () => {
    (navigation as any).navigate("BusinessMap", {
      id: id,
      business: business,
    });
  };

  const handleShare = () => {
    Alert.alert("Share", `Share ${business.name} with friends`);
  };

  const handleAddReview = () => {
    if (!business) return;
    (navigation as any).navigate("AddReview", {
      id: id,
      business: business,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      ref={scrollViewRef}
    >
      {/* ✅ FIXED: Photo Gallery with proper image handling */}
      <View style={styles.photoContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / SCREEN_WIDTH
            );
            setSelectedPhotoIndex(index);
          }}
        >
          {businessPhotos.map((photo, index) => (
            <Image 
              key={index} 
              source={{ uri: photo }} 
              style={styles.photo}
              defaultSource={require('@/src/assets/images/icon.png')}
            />
          ))}
        </ScrollView>

        {businessPhotos.length > 1 && (
          <View style={styles.photoIndicator}>
            <Text style={styles.photoIndicatorText}>
              {selectedPhotoIndex + 1} / {businessPhotos.length}
            </Text>
          </View>
        )}
      </View>

      {/* Business Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.businessName}>{business.name}</Text>

        <View style={styles.ratingRow}>
          <StarRating rating={business.rating} size={16} />
          <Text style={styles.ratingText}>{business.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>
            ({business.reviewCount} reviews)
          </Text>
          <Text style={styles.price}>{priceSymbol}</Text>
        </View>

        <Text style={styles.description}>{business.description}</Text>

        {/* Features */}
        {business.features.length > 0 && (
          <View style={styles.featuresContainer}>
            {business.features.map((feature, index) => (
              <View key={index} style={styles.featureTag}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <Phone size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDirections}
        >
          <MapPin size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Directions</Text>
        </TouchableOpacity>

        {business.website && (
          <TouchableOpacity style={styles.actionButton} onPress={handleWebsite}>
            <Globe size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Website</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contact Info */}
      <View style={styles.contactContainer}>
        <View style={styles.contactItem}>
          <MapPin size={16} color="#666" />
          <Text style={styles.contactText}>{business.address}</Text>
        </View>

        {business.phone && (
          <View style={styles.contactItem}>
            <Phone size={16} color="#666" />
            <Text style={styles.contactText}>{business.phone}</Text>
          </View>
        )}

        <View style={styles.contactItem}>
          <Clock size={16} color="#666" />
          <View style={styles.hoursContainer}>
            {Object.entries(business.hours).map(([day, hours]) => (
              <View key={day} style={styles.hoursRow}>
                <Text style={styles.dayText}>{day}</Text>
                <Text style={styles.hoursText}>{hours}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Reviews Section */}
      <View style={styles.reviewsContainer}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>
            Reviews ({reviewsLoading ? "..." : reviews.length})
          </Text>
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={handleAddReview}
          >
            <MessageSquare size={16} color="#FFF" />
            <Text style={styles.addReviewText}>Add Review</Text>
          </TouchableOpacity>
        </View>

        {reviewsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text>Loading reviews...</Text>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.noReviewsContainer}>
            <Text style={styles.noReviewsText}>
              No reviews yet. Be the first to review!
            </Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View
              key={review.id}
              ref={(ref) => {
                if (ref) reviewRefs.current[review.id] = ref;
              }}
            >
              <ReviewCard
                review={review}
                business={business}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  headerButtons: {
    flexDirection: "row",
  },
  headerButton: {
    marginLeft: 16,
  },
  photoContainer: {
    height: 250,
    position: "relative",
    backgroundColor: "#E5E7EB",
  },
  photo: {
    width: SCREEN_WIDTH,
    height: 250,
    resizeMode: "cover",
  },
  photoIndicator: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoIndicatorText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "500",
  },
  infoContainer: {
    backgroundColor: "#FFF",
    padding: 20,
    marginBottom: 12,
  },
  businessName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  price: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: "auto",
  },
  description: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 16,
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  featureTag: {
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    justifyContent: "space-around",
  },
  actionButton: {
    alignItems: "center",
    flex: 1,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 4,
    fontWeight: "500",
  },
  contactContainer: {
    backgroundColor: "#FFF",
    padding: 20,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  contactText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    flex: 1,
  },
  hoursContainer: {
    marginLeft: 12,
    flex: 1,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dayText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  hoursText: {
    fontSize: 14,
    color: "#666",
  },
  reviewsContainer: {
    marginBottom: 20,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    marginBottom: 8,
  },
  reviewsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addReviewText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  noReviewsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noReviewsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});