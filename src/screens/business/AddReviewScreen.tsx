import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, ScrollView, ActionSheetIOS } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../../hooks/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import { Business, Review } from '../../types';
import StarRating from '../../components/StarRating';
import { KeyboardAvoidingScrollView } from '@/src/components/KeyboardAvoidingScrollView';
import { Camera, X } from 'lucide-react-native';
import { imageService } from '../../services/imageService';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export default function AddReviewScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id, review: existingReview, business: routeBusiness } = route.params as { 
    id: string; 
    review?: Review;
    business?: Business;
  };
  
  const { getBusinessById, addReview, updateReview, fetchBusinessById } = useAppStore();
  const { user: authUser } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(existingReview?.text || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);

  const isEditMode = !!existingReview;
  
  // ✅ Load business data properly
  useEffect(() => {
    const loadBusiness = async () => {
      console.log('🔄 Loading business data...');
      console.log('   - Route business:', routeBusiness ? 'Provided' : 'Not provided');
      console.log('   - Business ID:', id);
      console.log('   - Edit mode:', isEditMode);

      // If business is passed via route, use it (this should happen in edit mode)
      if (routeBusiness) {
        console.log('✅ Using business from route');
        setBusiness(routeBusiness);
        return;
      }

      // If we have an ID, try to get business from local store first
      if (id) {
        console.log('🔍 Looking for business in local store:', id);
        const localBusiness = getBusinessById(id);
        if (localBusiness) {
          console.log('✅ Found business in local store');
          setBusiness(localBusiness);
          return;
        }

        // If not in local store, fetch from API
        console.log('📥 Business not in local store, fetching from API...');
        setLoadingBusiness(true);
        try {
          const fetchedBusiness = await fetchBusinessById(id);
          if (fetchedBusiness) {
            console.log('✅ Successfully fetched business from API');
            setBusiness(fetchedBusiness);
          } else {
            console.log('❌ Business not found in API');
          }
        } catch (error) {
          console.error('❌ Failed to fetch business:', error);
        } finally {
          setLoadingBusiness(false);
        }
      }
    };

    loadBusiness();
  }, [id, routeBusiness, isEditMode, getBusinessById, fetchBusinessById]);

  useEffect(() => {
    if (isEditMode && existingReview?.images) {
      setSelectedImages(existingReview.images);
    }
  }, [isEditMode, existingReview]);

  useEffect(() => {
    if (isEditMode) {
      navigation.setOptions({ title: 'Edit Review' });
    } else {
      navigation.setOptions({ title: 'Add Review' });
    }
  }, [isEditMode, navigation]);

  // ✅ Real photo picker
  const showImagePicker = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Take Photo', 'Choose from Library'],
        cancelButtonIndex: 0,
      },
      async (buttonIndex) => {
        if (buttonIndex === 1) {
          await takePhoto();
        } else if (buttonIndex === 2) {
          await pickFromLibrary();
        }
      }
    );
  };

  // ✅ Real camera
  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
        includeBase64: true,
      });

      if (result.assets?.[0]?.base64) {
        setUploadingImages(true);
        try {
          console.log('📸 Uploading photo from camera...');
          const imageUrl = await imageService.uploadImage(result.assets[0].base64);
          console.log('✅ Photo uploaded:', imageUrl);
          setSelectedImages(prev => [...prev, imageUrl]);
        } catch (error) {
          console.error('❌ Photo upload failed:', error);
          Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
        } finally {
          setUploadingImages(false);
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Camera Error', 'Unable to access camera. Please check permissions.');
    }
  };

  // ✅ Real photo library
  const pickFromLibrary = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
        includeBase64: true,
      });

      if (result.assets?.[0]?.base64) {
        setUploadingImages(true);
        try {
          console.log('🖼️ Uploading photo from library...');
          const imageUrl = await imageService.uploadImage(result.assets[0].base64);
          console.log('✅ Photo uploaded:', imageUrl);
          setSelectedImages(prev => [...prev, imageUrl]);
        } catch (error) {
          console.error('❌ Photo upload failed:', error);
          Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
        } finally {
          setUploadingImages(false);
        }
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Gallery Error', 'Unable to access photo library.');
    }
  };

  // ✅ Remove image
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    if (reviewText.trim().length < 10) {
      Alert.alert('Review Too Short', 'Please write at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrls = selectedImages;

      if (isEditMode && existingReview) {
        console.log('✏️ Updating review:', existingReview.id);
        await updateReview(existingReview.id, {
          rating,
          text: reviewText.trim(),
          images: imageUrls,
        });
        
        Alert.alert(
          'Review Updated!',
          'Your review has been updated successfully.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        if (!authUser) {
          throw new Error('User must be logged in to add a review');
        }

        console.log('📝 Adding new review for business:', id);
        await addReview({
          businessId: id!,
          userId: authUser.uid,
          userName: authUser.displayName || 'Anonymous User',
          userAvatar: authUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
          rating,
          text: reviewText.trim(),
          images: imageUrls,
          helpful: 0,
        });

        Alert.alert(
          'Review Added!',
          'Thank you for your review. It helps other users discover great places.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('❌ Review submission error:', error);
      Alert.alert('Error', error.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingBusiness) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Loading business...</Text>
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Business not found</Text>
        <Text style={styles.errorSubtext}>
          {isEditMode 
            ? 'Unable to load business data for editing.' 
            : 'Unable to find the business to review.'
          }
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!authUser && !isEditMode) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please log in to add a review</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.businessInfo}>
          <Text style={styles.businessName}>{business.name}</Text>
          <Text style={styles.businessAddress}>{business.address}</Text>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>How was your experience?</Text>
          <View style={styles.ratingContainer}>
            <StarRating
              rating={rating}
              size={32}
              interactive={true}
              onRatingChange={setRating}
            />
            <Text style={styles.ratingText}>
              {rating === 0 ? 'Tap to rate' : `${rating} star${rating !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>

        {/* Photo Section */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Add Photos (Optional)</Text>
          <Text style={styles.photoSubtitle}>Share photos of your experience</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            <View style={styles.photoContainer}>
              {selectedImages.map((imageUrl, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri: imageUrl }} style={styles.photo} />
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={() => removeImage(index)}
                  >
                    <X size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {selectedImages.length < 3 && (
                <TouchableOpacity 
                  style={styles.addPhotoButton} 
                  onPress={showImagePicker}
                  disabled={uploadingImages}
                >
                  {uploadingImages ? (
                    <View style={styles.uploadingContainer}>
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  ) : (
                    <View style={styles.addPhotoContent}>
                      <Camera size={24} color="#666" />
                      <Text style={styles.addPhotoText}>Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>
            {isEditMode ? 'Edit your review' : 'Write your review'}
          </Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your experience with others..."
            multiline
            numberOfLines={6}
            value={reviewText}
            onChangeText={setReviewText}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>
            {reviewText.length} characters (minimum 10)
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (rating === 0 || reviewText.trim().length < 10 || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={rating === 0 || reviewText.trim().length < 10 || isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 
             isEditMode ? 'Update Review' : 'Submit Review'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  businessInfo: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 14,
    color: '#666',
  },
  ratingSection: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  photoSection: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  photoSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  photoScroll: {
    marginHorizontal: -5,
  },
  photoContainer: {
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addPhotoContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  uploadingText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  reviewSection: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});