import React, { useState, useLayoutEffect, useEffect, useCallback, useRef } from 'react';
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
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Heart, Phone, Globe, Clock, MapPin, MessageSquare, Share } from 'lucide-react-native';
import { useAppStore } from '@/src/hooks/useAppStore';
import { Business, Review } from '@/src/types';
import StarRating from '@/src/components/StarRating';
import ReviewCard from '@/src/components/ReviewCard';
import { PRICE_LEVELS } from '@/src/constants/categories';
import { useAuth } from '@/src/hooks/useAuth';
import { useBusinessDetailsQuery } from '@/src/hooks/queries/useBusinessDetailsQuery';
import { useBusinessReviewsQuery } from '@/src/hooks/queries/useBusinessReviewsQuery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BusinessDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user: authUser } = useAuth();
  const { id } = route.params as { id: string };

  const { getBusinessById, toggleFavorite, deleteReview, isFavorite } = useAppStore();

  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const scrollViewRef = useRef<ScrollView | null>(null);

  const {
    data: businessData,
    isLoading: isBusinessLoading,
    refetch: refetchBusiness,
  } = useBusinessDetailsQuery(id);

  // Seed local business state from any cached/global data while details are loading
  useEffect(() => {
    if (!business) {
      const local = getBusinessById(id);
      if (local) {
        setBusiness(local);
      }
    }
  }, [business, getBusinessById, id]);

  const {
    data: businessReviews = [],
    isLoading: isReviewsLoading,
    isFetching: isReviewsFetching,
    refetch: refetchReviews,
  } = useBusinessReviewsQuery(id);

  const calculateRatingFromReviews = useCallback((reviewList: Review[]) => {
    if (reviewList.length === 0) return 0;
    const sum = reviewList.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviewList.length;
  }, []);

  const checkUserReview = useCallback(
    (reviewsList: Review[]) => {
      if (!authUser) return null;
      const userReview = reviewsList.find((review) => review.userId === authUser.uid);
      return userReview || null;
    },
    [authUser],
  );

  // Sync local state from React Query data
  useEffect(() => {
    if (!businessData) return;

    const updatedRating = calculateRatingFromReviews(businessReviews);
    const foundUserReview = checkUserReview(businessReviews);

    setUserReview(foundUserReview);
    setBusiness({
      ...businessData,
      rating: updatedRating,
      reviewCount: businessReviews.length,
    });
    setReviews(businessReviews);

    console.log('✅ Business data synced from React Query:', {
      rating: updatedRating,
      reviewCount: businessReviews.length,
      userReview: foundUserReview ? 'exists' : 'none',
      userId: authUser?.uid,
    });
  }, [businessData, businessReviews, calculateRatingFromReviews, checkUserReview, authUser?.uid]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered for business details');
      await Promise.all([refetchBusiness(), refetchReviews()]);
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      Alert.alert('Refresh Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [refetchBusiness, refetchReviews]);

  const handleEdit = (review: Review) => {
    (navigation as any).navigate('AddReview', {
      id: id,
      review: review,
      business: business,
    });
  };

  const handleDelete = async (reviewId: string) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReview(reviewId);
            await Promise.all([refetchBusiness(), refetchReviews()]);
          } catch (error) {
            console.error('Error deleting review:', error);
            Alert.alert('Error', 'Failed to delete review. Please try again.');
          }
        },
      },
    ]);
  };

  const handleShare = useCallback(() => {
    if (!business) return;
    Alert.alert('Share', `Share ${business.name} with friends`);
  }, [business]);

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
                color={isFavorite(business.id) ? '#FF6B6B' : '#ada9a9ff'}
                fill={isFavorite(business.id) ? '#FF6B6B' : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [navigation, business, isFavorite, toggleFavorite, handleShare]);

  // While details are loading and we don't have any business yet, show spinner
  if (isBusinessLoading && !business) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading business details...</Text>
      </View>
    );
  }

  // If loading has finished and we still have no business (no cached/global or remote data),
  // show an error state.
  if (!business && !isBusinessLoading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Business not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!business) {
    // Fallback: should be unreachable, but keep a safe spinner just in case.
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading business details...</Text>
      </View>
    );
  }

  const priceSymbol = PRICE_LEVELS.find((p) => p.level === business.priceLevel)?.symbol || '$';

  const businessPhotos =
    business.photos && business.photos.length > 0 ? business.photos : [business.imageUrl];

  const handleCall = () => {
    if (business.phone) {
      Linking.openURL(`tel:${business.phone}`);
    } else {
      Alert.alert('No Phone', 'Phone number not available for this business.');
    }
  };

  const handleWebsite = () => {
    if (business.website) {
      Linking.openURL(business.website);
    } else {
      Alert.alert('No Website', 'Website not available for this business.');
    }
  };

  const handleDirections = () => {
    (navigation as any).navigate('BusinessMap', { id: id, business: business });
  };

  const handleAddOrEditReview = () => {
    if (!business) return;

    if (userReview) {
      (navigation as any).navigate('AddReview', {
        id: id,
        review: userReview,
        business: business,
      });
    } else {
      (navigation as any).navigate('AddReview', { id: id, business: business });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      ref={scrollViewRef}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#007AFF']}
          tintColor="#007AFF"
        />
      }
    >
      <View style={styles.photoContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
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

      <View style={styles.infoContainer}>
        <Text style={styles.businessName}>{business.name}</Text>

        <View style={styles.ratingRow}>
          <StarRating rating={business.rating} size={16} />
          <Text style={styles.ratingText}>{business.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({business.reviewCount} reviews)</Text>
          <Text style={styles.price}>{priceSymbol}</Text>
        </View>

        <Text style={styles.description}>{business.description}</Text>

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

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <Phone size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
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

      <View style={styles.reviewsContainer}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>
            Reviews ({isReviewsLoading || isReviewsFetching ? '...' : reviews.length})
          </Text>
          <TouchableOpacity
            style={[
              styles.reviewButton,
              userReview ? styles.editReviewButton : styles.addReviewButton,
            ]}
            onPress={handleAddOrEditReview}
          >
            <MessageSquare size={16} color="#FFF" />
            <Text style={styles.reviewButtonText}>{userReview ? 'Edit Review' : 'Add Review'}</Text>
          </TouchableOpacity>
        </View>

        {isReviewsLoading || isReviewsFetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text>Loading reviews...</Text>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.noReviewsContainer}>
            <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
          </View>
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              business={business}
              onEdit={handleEdit}
              onDelete={handleDelete}
              // 🔧 FIX: determine ownership by userId, not by matching the one cached userReview
              isUsersReview={review.userId === authUser?.uid}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, color: '#666', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  headerButtons: { flexDirection: 'row' },
  headerButton: { marginLeft: 16 },
  photoContainer: { height: 250, position: 'relative', backgroundColor: '#E5E7EB' },
  photo: { width: SCREEN_WIDTH, height: 250, resizeMode: 'cover' },
  photoIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoIndicatorText: { color: '#FFF', fontSize: 12, fontWeight: '500' },
  infoContainer: { backgroundColor: '#FFF', padding: 20, marginBottom: 12 },
  businessName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ratingText: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 },
  reviewCount: { fontSize: 14, color: '#666', marginLeft: 8 },
  price: { fontSize: 16, color: '#4CAF50', fontWeight: '600', marginLeft: 'auto' },
  description: { fontSize: 16, color: '#333', lineHeight: 24, marginBottom: 16 },
  featuresContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  featureTag: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  featureText: { fontSize: 12, color: '#007AFF', fontWeight: '500' },
  actionButtons: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    justifyContent: 'space-around',
  },
  actionButton: { alignItems: 'center', flex: 1 },
  actionButtonText: { fontSize: 12, color: '#007AFF', marginTop: 4, fontWeight: '500' },
  contactContainer: { backgroundColor: '#FFF', padding: 20, marginBottom: 12 },
  contactItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  contactText: { fontSize: 16, color: '#333', marginLeft: 12, flex: 1 },
  hoursContainer: { marginLeft: 12, flex: 1 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dayText: { fontSize: 14, color: '#333', fontWeight: '500' },
  hoursText: { fontSize: 14, color: '#666' },
  reviewsContainer: { marginBottom: 20 },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  reviewsTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addReviewButton: { backgroundColor: '#007AFF' },
  editReviewButton: { backgroundColor: '#FFA500' },
  reviewButtonText: { color: '#FFF', fontSize: 14, fontWeight: '500', marginLeft: 6 },
  noReviewsContainer: { padding: 20, alignItems: 'center' },
  noReviewsText: { fontSize: 16, color: '#666', textAlign: 'center' },
});
