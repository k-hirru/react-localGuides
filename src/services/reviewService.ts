import firestore from "@react-native-firebase/firestore";
import { Review } from "@/src/types";

export const reviewService = {
  // Add a new review
  async addReview(
    review: Omit<Review, "id" | "date" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const reviewData = {
        ...review,
        date: firestore.FieldValue.serverTimestamp(),
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const reviewRef = await firestore().collection("reviews").add(reviewData);

      return reviewRef.id;
    } catch (error) {
      console.error("Error adding review:", error);
      throw new Error("Failed to add review");
    }
  },

  async getBusinessesWithReviews(businessIds: string[]): Promise<Map<string, { rating: number; reviewCount: number }>> {
    if (businessIds.length === 0) return new Map();
    
    const result = new Map();
    
    // Initialize with zero values
    businessIds.forEach(id => {
      result.set(id, { rating: 0, reviewCount: 0, totalScore: 0 });
    });
    
    // Firestore can only handle 10 'in' queries, so we batch
    for (let i = 0; i < businessIds.length; i += 10) {
      const batchIds = businessIds.slice(i, i + 10);
      
      try {
        const snapshot = await firestore()
          .collection('reviews')
          .where('businessId', 'in', batchIds)
          .get();
        
        // Aggregate review data
        snapshot.docs.forEach(doc => {
          const review = doc.data();
          const businessData = result.get(review.businessId);
          if (businessData) {
            businessData.totalScore += review.rating;
            businessData.reviewCount += 1;
          }
        });
      } catch (error) {
        console.error('Error fetching batch reviews:', error);
        // Continue with other batches
      }
    }
    
    // Calculate averages
    const finalResult = new Map();
    result.forEach((data, businessId) => {
      finalResult.set(businessId, {
        rating: data.reviewCount > 0 ? data.totalScore / data.reviewCount : 0,
        reviewCount: data.reviewCount
      });
    });
    
    return finalResult;
  },

  // Get reviews for a business
  async getReviewsForBusiness(businessId: string): Promise<Review[]> {
    try {
      const snapshot = await firestore()
        .collection("reviews")
        .where("businessId", "==", businessId)
        .orderBy("date", "desc")
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          businessId: data.businessId,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          rating: data.rating,
          text: data.text,
          helpful: data.helpful || 0,
          date:
            data.date?.toDate().toISOString().split("T")[0] ||
            new Date().toISOString().split("T")[0],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      throw new Error("Failed to fetch reviews");
    }
  },

  // Get reviews by a user
  async getUserReviews(userId: string): Promise<Review[]> {
    try {
      const snapshot = await firestore()
        .collection("reviews")
        .where("userId", "==", userId)
        .orderBy("date", "desc")
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          businessId: data.businessId,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          rating: data.rating,
          text: data.text,
          helpful: data.helpful || 0,
          date:
            data.date?.toDate().toISOString().split("T")[0] ||
            new Date().toISOString().split("T")[0],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });
    } catch (error) {
      console.error("Error fetching user reviews:", error);
      throw new Error("Failed to fetch user reviews");
    }
  },

  // Update a review
  async updateReview(
    reviewId: string,
    updates: { rating?: number; text?: string }
  ): Promise<void> {
    try {
      await firestore()
        .collection("reviews")
        .doc(reviewId)
        .update({
          ...updates,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error("Error updating review:", error);
      throw new Error("Failed to update review");
    }
  },

  // Delete a review
  async deleteReview(reviewId: string): Promise<void> {
    try {
      await firestore().collection("reviews").doc(reviewId).delete();
    } catch (error) {
      console.error("Error deleting review:", error);
      throw new Error("Failed to delete review");
    }
  },

  // Check if user has already reviewed a business
  async getUserReviewForBusiness(
    userId: string,
    businessId: string
  ): Promise<Review | null> {
    try {
      const snapshot = await firestore()
        .collection("reviews")
        .where("userId", "==", userId)
        .where("businessId", "==", businessId)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        businessId: data.businessId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        rating: data.rating,
        text: data.text,
        helpful: data.helpful || 0,
        date:
          data.date?.toDate().toISOString().split("T")[0] ||
          new Date().toISOString().split("T")[0],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error("Error checking user review:", error);
      return null;
    }
  },
};
