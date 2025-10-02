import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '@/src/hooks/useAppStore';
import StarRating from '@/src/components/StarRating';

export default function AddReviewScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params as { id: string };
  const { getBusinessById, addReview, user } = useAppStore();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const business = getBusinessById(id!);

  if (!business || !user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to add review</Text>
      </View>
    );
  }

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
      await addReview({
        businessId: id!,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        rating,
        text: reviewText.trim(),
        helpful: 0,
      });

      Alert.alert(
        'Review Added!',
        'Thank you for your review. It helps other users discover great places.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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

          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>Write your review</Text>
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
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
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