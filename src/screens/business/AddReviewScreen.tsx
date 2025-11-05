import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Image, 
  ScrollView, 
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../../hooks/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import { Business, Review } from '../../types';
import StarRating from '../../components/StarRating';
import { KeyboardAvoidingScrollView } from '@/src/components/KeyboardAvoidingScrollView';
import { Camera, X, Image as ImageIcon } from 'lucide-react-native';
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
  const [showImagePicker, setShowImagePicker] = useState(false);

  const isEditMode = !!existingReview;
  
  // ✅ Load business data
  useEffect(() => {
    const loadBusiness = async () => {
      if (routeBusiness) {
        setBusiness(routeBusiness);
        return;
      }

      if (id) {
        const localBusiness = getBusinessById(id);
        if (localBusiness) {
          setBusiness(localBusiness);
          return;
        }

        setLoadingBusiness(true);
        try {
          const fetchedBusiness = await fetchBusinessById(id);
          if (fetchedBusiness) {
            setBusiness(fetchedBusiness);
          }
        } catch (error) {
          console.error('Failed to fetch business:', error);
        } finally {
          setLoadingBusiness(false);
        }
      }
    };

    loadBusiness();
  }, [id, routeBusiness, getBusinessById, fetchBusinessById]);

  useEffect(() => {
    if (isEditMode && existingReview?.images) {
      setSelectedImages(existingReview.images);
    }
  }, [isEditMode, existingReview]);

  useEffect(() => {
    navigation.setOptions({ 
      title: isEditMode ? 'Edit Review' : 'Add Review' 
    });
  }, [isEditMode, navigation]);

  // ✅ CROSS-PLATFORM: Show image picker options
  const handleShowImagePicker = () => {
    if (Platform.OS === 'ios') {
      // iOS: Use native Alert
      Alert.alert(
        'Add Photo',
        'Choose a photo source',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickFromLibrary },
        ],
        { cancelable: true }
      );
    } else {
      // Android: Use custom modal
      setShowImagePicker(true);
    }
  };

  // ✅ Take photo with camera
  const takePhoto = async () => {
    setShowImagePicker(false);
    
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        includeBase64: true,
        saveToPhotos: false,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        console.error('Camera error:', result.errorMessage);
        Alert.alert('Camera Error', 'Unable to access camera. Please check permissions.');
        return;
      }

      if (result.assets?.[0]?.base64) {
        await uploadImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Camera launch error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  // ✅ Pick from photo library
  const pickFromLibrary = async () => {
    setShowImagePicker(false);
    
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        includeBase64: true,
        selectionLimit: 1,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        console.error('Gallery error:', result.errorMessage);
        Alert.alert('Gallery Error', 'Unable to access photo library.');
        return;
      }

      if (result.assets?.[0]?.base64) {
        await uploadImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Gallery launch error:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    }
  };

  // ✅ Upload image helper
  const uploadImage = async (base64: string) => {
    setUploadingImages(true);
    try {
      console.log('📤 Uploading photo...');
      const imageUrl = await imageService.uploadImage(base64);
      console.log('✅ Photo uploaded:', imageUrl);
      setSelectedImages(prev => [...prev, imageUrl]);
    } catch (error) {
      console.error('❌ Photo upload failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  // ✅ Remove image
  const removeImage = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setSelectedImages(prev => prev.filter((_, i) => i !== index));
          }
        },
      ]
    );
  };

  // ✅ Submit review
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
      if (isEditMode && existingReview) {
        console.log('✏️ Updating review:', existingReview.id);
        await updateReview(existingReview.id, {
          rating,
          text: reviewText.trim(),
          images: selectedImages,
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
          images: selectedImages,
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading business...</Text>
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
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Business Info */}
          <View style={styles.businessInfo}>
            <Image 
              source={{ uri: business.imageUrl }} 
              style={styles.businessImage}
            />
            <View style={styles.businessTextInfo}>
              <Text style={styles.businessName} numberOfLines={1}>
                {business.name}
              </Text>
              <Text style={styles.businessAddress} numberOfLines={2}>
                {business.address}
              </Text>
            </View>
          </View>

          {/* Rating Section */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>How was your experience?</Text>
            <View style={styles.ratingContainer}>
              <StarRating
                rating={rating}
                size={36}
                interactive={true}
                onRatingChange={setRating}
              />
              <Text style={styles.ratingText}>
                {rating === 0 ? 'Tap a star to rate' : `${rating} star${rating !== 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>

          {/* Photo Section */}
          <View style={styles.photoSection}>
            <Text style={styles.sectionTitle}>Add Photos (Optional)</Text>
            <Text style={styles.photoSubtitle}>
              Photos help others learn about your experience
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.photoScroll}
              contentContainerStyle={styles.photoScrollContent}
            >
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
              
              {selectedImages.length < 5 && (
                <TouchableOpacity 
                  style={styles.addPhotoButton} 
                  onPress={handleShowImagePicker}
                  disabled={uploadingImages}
                >
                  {uploadingImages ? (
                    <View style={styles.uploadingContainer}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  ) : (
                    <View style={styles.addPhotoContent}>
                      <Camera size={28} color="#007AFF" />
                      <Text style={styles.addPhotoText}>Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>

            {selectedImages.length > 0 && (
              <Text style={styles.photoCount}>
                {selectedImages.length} of 5 photos
              </Text>
            )}
          </View>

          {/* Review Text Section */}
          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>
              {isEditMode ? 'Edit your review' : 'Write your review'}
            </Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share details about your experience, the food, service, and atmosphere..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={8}
              value={reviewText}
              onChangeText={setReviewText}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[
              styles.characterCount,
              reviewText.length < 10 && styles.characterCountWarning
            ]}>
              {reviewText.length}/500 characters {reviewText.length < 10 ? '(minimum 10)' : ''}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || reviewText.trim().length < 10 || isSubmitting) && 
              styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || reviewText.trim().length < 10 || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditMode ? 'Update Review' : 'Submit Review'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingScrollView>

      {/* ✅ ANDROID: Custom Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Photo</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={takePhoto}
            >
              <Camera size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={pickFromLibrary}
            >
              <ImageIcon size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>Choose from Library</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
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
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  businessImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  businessTextInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  ratingSection: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
  },
  photoSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  photoSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  photoScroll: {
    marginHorizontal: -4,
  },
  photoScrollContent: {
    paddingHorizontal: 4,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
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
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
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
    color: '#007AFF',
    marginTop: 6,
    fontWeight: '500',
  },
  uploadingText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 6,
  },
  photoCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  reviewSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    minHeight: 140,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  characterCountWarning: {
    color: '#FF6B6B',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  // ✅ Modal Styles for Android
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'android' ? 20 : 34,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  modalCancelButton: {
    padding: 20,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});