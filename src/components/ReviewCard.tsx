import React, { useState, memo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { useAuthContext } from "@/src/context/AuthContext";
import StarRating from "./StarRating";
import { Review, Business } from "@/src/types";
import {
  MoreVertical,
  Edit,
  Trash2,
  UserCircle,
  ThumbsUp,
  Image as ImageIcon,
} from "lucide-react-native";
import { reviewService } from "@/src/services/reviewService";
import auth from "@react-native-firebase/auth"; // ADD THIS

interface ReviewCardProps {
  review: Review;
  business: Business;
  onEdit?: (review: Review, business: Business) => void;
  onDelete?: (reviewId: string) => void;
  isUsersReview?: boolean;
}

const ReviewCard = memo(
  ({
    review,
    business,
    onEdit,
    onDelete,
    isUsersReview = false,
  }: ReviewCardProps) => {
    const { user: authUser } = useAuthContext();
    const [currentUser, setCurrentUser] = useState(auth().currentUser); // ADD THIS
    const [showMenu, setShowMenu] = useState(false);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isHelpful, setIsHelpful] = useState(false);
    const [helpfulCount, setHelpfulCount] = useState(review.helpful || 0);

    // ADD THIS: Direct Firebase auth listener as backup
    useEffect(() => {
      const unsubscribe = auth().onAuthStateChanged((user) => {
        setCurrentUser(user);
      });
      return unsubscribe;
    }, []);

    const isOwnReview = authUser?.uid === review.userId;
    const hasImages = review.images && review.images.length > 0;

    // UPDATE THIS: Use direct Firebase user first, then fall back to context
    const getAvatarUrl = () => {
      // Use direct Firebase user first (more up-to-date), then fall back to context
      const user = currentUser || authUser;
      if (user?.uid === review.userId && user?.photoURL) {
        return user.photoURL;
      }
      return review.userAvatar;
    };

    const avatarUrl = getAvatarUrl();

    useEffect(() => {
      const checkExistingVote = async () => {
        if (authUser && !isOwnReview) {
          const hasVoted = await reviewService.hasUserVoted(
            review.id,
            authUser.uid
          );
          setIsHelpful(hasVoted);
        }
      };

      checkExistingVote();
    }, [authUser, review.id, isOwnReview]);

    const handleEdit = () => {
      setShowMenu(false);
      onEdit?.(review, business);
    };

    const handleDelete = () => {
      setShowMenu(false);
      Alert.alert(
        "Delete Review",
        "Are you sure you want to delete this review?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => onDelete?.(review.id),
          },
        ]
      );
    };

    const handleHelpfulPress = async () => {
      if (!authUser) {
        Alert.alert(
          "Sign In Required",
          "Please sign in to mark reviews as helpful."
        );
        return;
      }

      if (isOwnReview) {
        Alert.alert(
          "Not Allowed",
          "You cannot mark your own review as helpful."
        );
        return;
      }

      try {
        if (isHelpful) {
          await reviewService.removeHelpfulVote(review.id, authUser.uid);
          setHelpfulCount((prev) => prev - 1);
          setIsHelpful(false);
          await reviewService.updateReviewHelpfulCount(review.id, -1);
        } else {
          await reviewService.addHelpfulVote({
            reviewId: review.id,
            reviewOwnerId: review.userId,
            taggedBy: authUser.uid,
            businessId: business.id,
          });
          setHelpfulCount((prev) => prev + 1);
          setIsHelpful(true);
          await reviewService.updateReviewHelpfulCount(review.id, 1);
        }
      } catch (error) {
        console.error("Error with helpful vote:", error);
        Alert.alert(
          "Error",
          "Failed to update helpful vote. Please try again."
        );
      }
    };

    const openImage = (index: number) => {
      setSelectedImageIndex(index);
      setImageModalVisible(true);
    };

    const getUserInitials = () => {
      if (review.userName) {
        const names = review.userName.split(" ");
        if (names.length >= 2) {
          return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return review.userName.charAt(0).toUpperCase();
      }
      return "U";
    };

    return (
      <View
        style={[styles.container, isUsersReview && styles.usersReviewContainer]}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {/* ✅ UPDATED: Use userAvatar from review data directly */}
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                onError={() => console.log("Failed to load profile image")}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {getUserInitials()}
                </Text>
              </View>
            )}

            <View style={styles.userDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{review.userName}</Text>
                {/* ✅ MOVED: Your Review badge to the left side */}
                {isUsersReview && (
                  <View style={styles.yourReviewBadge}>
                    <Text style={styles.yourReviewText}>Your Review</Text>
                  </View>
                )}
              </View>
              <Text style={styles.date}>{review.date}</Text>
            </View>
          </View>

          {/* ✅ KEEP: Menu button on the right side */}
          {isOwnReview && (
            <TouchableOpacity
              onPress={() => setShowMenu(!showMenu)}
              style={styles.menuButton}
            >
              <MoreVertical size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* ✅ KEEP: Dropdown menu */}
        {showMenu && (
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEdit}
              testID="edit-menu-item" // ← ADD THIS
            >
              <Edit size={16} color="#666" />
              <Text style={styles.menuText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDelete}
              testID="delete-menu-item" // ← ADD THIS
            >
              <Trash2 size={16} color="#FF6B6B" />
              <Text style={[styles.menuText, { color: "#FF6B6B" }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.ratingContainer}>
          <StarRating rating={review.rating} size={16} />
        </View>

        <Text style={styles.reviewText}>{review.text}</Text>

        {hasImages && (
          <View style={styles.imagesSection}>
            <Text style={styles.imagesTitle}>
              <ImageIcon size={14} color="#666" /> Photos (
              {review.images!.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScroll}
              contentContainerStyle={styles.imagesContainer}
            >
              {review.images!.map((imageUrl, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.imageWrapper}
                  onPress={() => openImage(index)}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.reviewImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.helpfulContainer}>
          <TouchableOpacity
            style={[
              styles.helpfulButton,
              isHelpful && styles.helpfulButtonActive,
            ]}
            onPress={handleHelpfulPress}
            disabled={isOwnReview}
          >
            <ThumbsUp
              size={14}
              color={isHelpful ? "#007AFF" : "#666"}
              fill={isHelpful ? "#007AFF" : "transparent"}
            />
            <Text
              style={[
                styles.helpfulText,
                isHelpful && styles.helpfulTextActive,
              ]}
            >
              Helpful ({helpfulCount})
            </Text>
          </TouchableOpacity>
        </View>

        {imageModalVisible && (
          <TouchableOpacity
            style={styles.imageModal}
            onPress={() => setImageModalVisible(false)}
            activeOpacity={1}
          >
            <View style={styles.imageModalContent}>
              <Image
                source={{ uri: review.images![selectedImageIndex] }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <Text style={styles.imageCounter}>
                {selectedImageIndex + 1} / {review.images!.length}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

ReviewCard.displayName = "ReviewCard";

export default ReviewCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  usersReviewContainer: {
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
    backgroundColor: "#F8F9FA",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    position: "relative",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#E5E7EB",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarPlaceholderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  // ✅ UPDATED: Your Review badge styles
  yourReviewBadge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  yourReviewText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFF",
  },
  date: {
    fontSize: 12,
    color: "#666",
  },
  menuButton: {
    padding: 4, // Add padding for better touch area
  },
  menu: {
    position: "absolute",
    top: 30,
    right: 0,
    backgroundColor: "#FFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    minWidth: 120,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  ratingContainer: {
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 12,
  },
  imagesSection: {
    marginBottom: 12,
  },
  imagesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  imagesScroll: {
    marginHorizontal: -4,
  },
  imagesContainer: {
    paddingHorizontal: 4,
  },
  imageWrapper: {
    marginRight: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  reviewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  imageModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  imageModalContent: {
    width: "90%",
    height: "70%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  imageCounter: {
    position: "absolute",
    top: 20,
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  helpfulContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  helpfulButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  helpfulButtonActive: {
    backgroundColor: "#F0F8FF",
  },
  helpfulText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  helpfulTextActive: {
    color: "#007AFF",
    fontWeight: "500",
  },
});
