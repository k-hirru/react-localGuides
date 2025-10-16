import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useAuth } from '@/src/hooks/useAuth';
import StarRating from './StarRating';
import { Review } from '@/src/types';
import { MoreVertical, Edit, Trash2, UserCircle, ThumbsUp } from 'lucide-react-native';

interface ReviewCardProps {
  review: Review;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
}

export default function ReviewCard({ review, onEdit, onDelete }: ReviewCardProps) {
  const { user: authUser } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const isOwnReview = authUser?.uid === review.userId;

  const handleEdit = () => {
    setShowMenu(false);
    onEdit?.(review);
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDelete?.(review.id)
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {review.userAvatar ? (
            <Image 
              source={{ uri: review.userAvatar }} 
              style={styles.avatar} 
            />
          ) : (
            <UserCircle size={40} color="#666" />
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{review.userName}</Text>
            <Text style={styles.date}>{review.date}</Text>
          </View>
        </View>
        
        {isOwnReview && (
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
            <MoreVertical size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {showMenu && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
            <Edit size={16} color="#666" />
            <Text style={styles.menuText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
            <Trash2 size={16} color="#FF6B6B" />
            <Text style={[styles.menuText, { color: '#FF6B6B' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.ratingContainer}>
        <StarRating rating={review.rating} size={16} />
      </View>

      <Text style={styles.reviewText}>{review.text}</Text>

      <View style={styles.helpfulContainer}>
        <TouchableOpacity style={styles.helpfulButton}>
          <ThumbsUp size={14} color="#666" />
          <Text style={styles.helpfulText}>Helpful ({review.helpful})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    position: 'relative',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  menu: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    minWidth: 120,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  ratingContainer: {
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  helpfulContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  helpfulText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
});