import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  RefreshControl,
} from "react-native";
import {
  Star,
  Heart,
  MessageSquare,
  Phone,
  DoorOpen,
  Camera,
  Image as ImageIcon,
} from "lucide-react-native";
import { useAppStore } from "@/src/hooks/useAppStore";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/src/hooks/useAuth";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { imageService } from "@/src/services/imageService";
import auth from "@react-native-firebase/auth";
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from "react-native-permissions";
import { reviewService } from "@/src/services/reviewService";

export default function ProfileScreen() {
  const { favorites, reviews, getBusinessById, refreshReviews } = useAppStore();
  const { user: authUser, logout } = useAuth();
  const navigation = useNavigation();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string>("");

  // Guard against re-entrant refreshes that cause infinite loops
  const inFlightRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setRefreshing(true);
    try {
      console.log("🔄 Refreshing profile reviews...");
      await refreshReviews();
      console.log("✅ Profile reviews refreshed successfully");
    } catch (error) {
      console.error("❌ Failed to refresh profile data:", error);
    } finally {
      setRefreshing(false);
      inFlightRef.current = false;
    }
  }, [refreshReviews]);

  // Refresh when screen comes into focus (no setTimeout; stable deps)
  useFocusEffect(
    useCallback(() => {
      console.log("🎯 Profile screen focused, refreshing data...");
      handleRefresh();
      return undefined;
    }, [handleRefresh])
  );

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            console.log("✅ User logged out successfully");
          } catch (error) {
            console.error("❌ Logout failed:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
          }
        },
      },
    ]);
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const permission =
        Platform.OS === "ios"
          ? PERMISSIONS.IOS.CAMERA
          : PERMISSIONS.ANDROID.CAMERA;

      const result = await check(permission);

      if (result === RESULTS.GRANTED) return true;

      if (result === RESULTS.DENIED) {
        const requestResult = await request(permission);
        return requestResult === RESULTS.GRANTED;
      }

      if (result === RESULTS.BLOCKED) {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => openSettings() },
          ]
        );
        return false;
      }

      return false;
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      return false;
    }
  };

  const handleShowImagePicker = () => {
    if (Platform.OS === "ios") {
      Alert.alert(
        "Update Profile Picture",
        "Choose a photo source",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Take Photo", onPress: takePhoto },
          { text: "Choose from Library", onPress: pickFromLibrary },
        ],
        { cancelable: true }
      );
    } else {
      setShowImagePicker(true);
    }
  };

  const takePhoto = async () => {
    setShowImagePicker(false);

    setTimeout(async () => {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      try {
        const result = await launchCamera({
          mediaType: "photo",
          quality: 0.8,
          maxWidth: 800,
          maxHeight: 800,
          includeBase64: true,
          saveToPhotos: false,
        });

        if (result.didCancel) return;

        if (result.errorCode) {
          console.error("Camera error:", result.errorCode);
          Alert.alert("Camera Error", "Unable to access camera.");
          return;
        }

        if (result.assets?.[0]?.base64) {
          await uploadProfilePicture(result.assets[0].base64);
        }
      } catch (error) {
        console.error("Camera launch error:", error);
        Alert.alert("Error", "Failed to open camera.");
      }
    }, 100);
  };

  const pickFromLibrary = async () => {
    setShowImagePicker(false);

    setTimeout(async () => {
      try {
        const result = await launchImageLibrary({
          mediaType: "photo",
          quality: 0.8,
          maxWidth: 800,
          maxHeight: 800,
          includeBase64: true,
          selectionLimit: 1,
        });

        if (result.didCancel) return;

        if (result.errorCode) {
          console.error("Gallery error:", result.errorCode);
          Alert.alert("Gallery Error", "Unable to access photo library.");
          return;
        }

        if (result.assets?.[0]?.base64) {
          await uploadProfilePicture(result.assets[0].base64);
        }
      } catch (error) {
        console.error("Gallery launch error:", error);
        Alert.alert("Error", "Failed to open photo library.");
      }
    }, 100);
  };

  const uploadProfilePicture = async (base64: string) => {
    if (!authUser) return;

    setUploadingAvatar(true);
    try {
      console.log("📤 Uploading profile picture...");

      const base64WithPrefix = base64.startsWith("data:")
        ? base64
        : `data:image/jpeg;base64,${base64}`;

      // Upload new photo
      const imageUrl = await imageService.uploadImage(
        base64WithPrefix,
        "profile"
      );
      console.log("✅ Profile picture uploaded:", imageUrl);

      // Update local state immediately
      setLocalAvatarUrl(imageUrl);

      // Update Firebase profile
      await auth().currentUser?.updateProfile({ photoURL: imageUrl });

      // ✅ CRITICAL: Force immediate reload and get updated user
      await auth().currentUser?.reload();

      // ✅ Get the freshly updated user object
      const updatedUser = auth().currentUser;
      console.log("🔄 Fresh user photoURL:", updatedUser?.photoURL);

      // ✅ Update all existing reviews with new avatar
      try {
        await reviewService.updateUserAvatarInReviews(authUser.uid, imageUrl);
        console.log("✅ Updated avatar in all existing reviews");
      } catch (updateError) {
        console.warn("⚠️ Could not update reviews:", updateError);
      }

      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (error: any) {
      console.error("❌ Profile picture upload failed:", error);
      Alert.alert(
        "Upload Failed",
        error.message || "Failed to update profile picture."
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleNavigateToFavorites = () => {
    (navigation as any).navigate("Favorites");
  };

  const handleNavigateToReview = (reviewId: string, businessId: string) => {
    const business = getBusinessById(businessId);
    if (business) {
      (navigation as any).navigate("BusinessDetails", { id: businessId });
    }
  };

  if (!authUser) {
    return (
      <View style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <Text style={styles.notLoggedInText}>
            Please log in to view your profile
          </Text>
        </View>
      </View>
    );
  }

  const userReviews = reviews.filter(
    (review) => review.userId === authUser.uid
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#007AFF"]}
            tintColor="#007AFF"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {localAvatarUrl || authUser.photoURL ? (
              <Image
                source={{
                  uri: (localAvatarUrl || authUser.photoURL) as string,
                }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {authUser.displayName?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            )}

            {uploadingAvatar && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#FFF" />
              </View>
            )}
          </View>

          <Text style={styles.name}>{authUser.displayName || "User"}</Text>
          <Text style={styles.email}>{authUser.email}</Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleShowImagePicker}
            disabled={uploadingAvatar}
          >
            <Camera size={16} color="#007AFF" />
            <Text style={styles.editButtonText}>
              {uploadingAvatar ? "Uploading..." : "Upload Profile Picture"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MessageSquare size={24} color="#007AFF" />
            <Text style={styles.statNumber}>{userReviews.length}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statItem}>
            <Heart size={24} color="#FF6B6B" />
            <Text style={styles.statNumber}>{favorites.length}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleNavigateToFavorites}
          >
            <Heart size={20} color="#666" />
            <Text style={styles.menuText}>Favorite Places</Text>
            <Text style={styles.menuBadge}>{favorites.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Phone size={20} color="#666" />
            <Text style={styles.menuText}>Help & Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <DoorOpen size={20} color="#FF3B30" />
            <Text style={styles.menuTextLogout}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {userReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageSquare size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>No reviews yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start exploring and share your experiences!
              </Text>
            </View>
          ) : (
            userReviews.slice(0, 5).map((review) => {
              const business = getBusinessById(review.businessId);
              return (
                <TouchableOpacity
                  key={review.id}
                  style={styles.activityItem}
                  onPress={() =>
                    handleNavigateToReview(review.id, review.businessId)
                  }
                >
                  <MessageSquare size={16} color="#007AFF" />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>
                      {business?.name || "Unknown Business"}
                    </Text>
                    <Text style={styles.activityDate}>
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={styles.activityRating}>
                    <Star size={12} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.activityRatingText}>
                      {review.rating}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

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
              <Text style={styles.modalTitle}>Update Profile Picture</Text>
            </View>

            <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
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
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  notLoggedInText: { fontSize: 18, color: "#666", textAlign: "center" },
  header: {
    backgroundColor: "#FFF",
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  avatarContainer: { position: "relative", marginBottom: 16 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E7EB",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: { fontSize: 40, fontWeight: "600", color: "#FFF" },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 24, fontWeight: "bold", color: "#333", marginBottom: 4 },
  email: { fontSize: 16, color: "#666", marginBottom: 20 },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    color: "#007AFF",
    marginLeft: 6,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingVertical: 20,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: { fontSize: 14, color: "#666" },
  menuContainer: {
    backgroundColor: "#FFF",
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuText: { fontSize: 16, color: "#333", marginLeft: 16, flex: 1 },
  menuTextLogout: { fontSize: 16, color: "#FF3B30", marginLeft: 16, flex: 1 },
  menuBadge: {
    backgroundColor: "#007AFF",
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 20,
    textAlign: "center",
  },
  activityContainer: {
    backgroundColor: "#FFF",
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: { fontSize: 14, color: "#999", textAlign: "center" },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  activityContent: { flex: 1, marginLeft: 12 },
  activityText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  activityDate: { fontSize: 12, color: "#666" },
  activityRating: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activityRatingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "android" ? 20 : 34,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionText: { fontSize: 16, color: "#333", marginLeft: 16 },
  modalCancelButton: { padding: 20, alignItems: "center" },
  modalCancelText: { fontSize: 16, color: "#FF6B6B", fontWeight: "600" },
});
