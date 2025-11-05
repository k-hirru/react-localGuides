import firestore from "@react-native-firebase/firestore";
import { Review } from "@/src/types";

const db = firestore();

export interface HelpfulVote {
  reviewId: string;
  reviewOwnerId: string;
  taggedBy: string;
  businessId: string;
  createdAt: any;
}

export const reviewService = {
  // Add a new review
  async addReview(
    reviewData: Omit<Review, "id" | "date" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const reviewWithTimestamps = {
        ...reviewData,
        date: firestore.FieldValue.serverTimestamp(),
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("reviews").add(reviewWithTimestamps);
      return docRef.id;
    } catch (error) {
      console.error("Error adding review:", error);
      throw new Error("Failed to add review");
    }
  },

  async getBusinessesWithReviews(
    businessIds: string[]
  ): Promise<Map<string, { rating: number; reviewCount: number }>> {
    if (businessIds.length === 0) return new Map();

    const result = new Map();

    businessIds.forEach((id) => {
      result.set(id, { rating: 0, reviewCount: 0, totalScore: 0 });
    });

    for (let i = 0; i < businessIds.length; i += 10) {
      const batchIds = businessIds.slice(i, i + 10);

      try {
        const querySnapshot = await db
          .collection("reviews")
          .where("businessId", "in", batchIds)
          .get();

        querySnapshot.forEach((doc) => {
          const review = doc.data();
          const businessData = result.get(review.businessId);
          if (businessData) {
            businessData.totalScore += review.rating;
            businessData.reviewCount += 1;
          }
        });
      } catch (error) {
        console.error("Error fetching batch reviews:", error);
      }
    }

    const finalResult = new Map();
    result.forEach((data, businessId) => {
      finalResult.set(businessId, {
        rating: data.reviewCount > 0 ? data.totalScore / data.reviewCount : 0,
        reviewCount: data.reviewCount,
      });
    });

    return finalResult;
  },

  // Get reviews for a business
  async getReviewsForBusiness(businessId: string): Promise<Review[]> {
    try {
      console.log("🔍 Fetching reviews for business:", businessId);

      const querySnapshot = await db
        .collection("reviews")
        .where("businessId", "==", businessId)
        .orderBy("date", "desc")
        .get();

      console.log("✅ Reviews query successful, found:", querySnapshot.size, "reviews");

      const reviews: Review[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reviews.push({
          id: doc.id,
          businessId: data.businessId,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          rating: data.rating,
          text: data.text,
          images: data.images || [],
          helpful: data.helpful || 0,
          date:
            data.date?.toDate().toISOString().split("T")[0] ||
            new Date().toISOString().split("T")[0],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      return reviews;
    } catch (error: unknown) {
      console.error("❌ Error fetching reviews:", error);
      throw new Error("Failed to fetch reviews");
    }
  },

  // Get reviews by a user
  async getUserReviews(userId: string): Promise<Review[]> {
    try {
      const querySnapshot = await db
        .collection("reviews")
        .where("userId", "==", userId)
        .orderBy("date", "desc")
        .get();

      const reviews: Review[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reviews.push({
          id: doc.id,
          businessId: data.businessId,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          rating: data.rating,
          text: data.text,
          images: data.images || [],
          helpful: data.helpful || 0,
          date:
            data.date?.toDate().toISOString().split("T")[0] ||
            new Date().toISOString().split("T")[0],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      return reviews;
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
      await db
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
      await db.collection("reviews").doc(reviewId).delete();
    } catch (error) {
      console.error("Error deleting review:", error);
      throw new Error("Failed to delete review");
    }
  },

  // ✅ NEW: Update helpful count (for manual increment/decrement)
  async updateReviewHelpfulCount(reviewId: string, delta: number): Promise<void> {
    try {
      const reviewRef = db.collection("reviews").doc(reviewId);
      await reviewRef.update({
        helpful: firestore.FieldValue.increment(delta),
      });
      console.log(`✅ Updated helpful count for review ${reviewId} by ${delta}`);
    } catch (error) {
      console.error("Error updating helpful count:", error);
      throw error;
    }
  },

  async addHelpfulVote(voteData: Omit<HelpfulVote, 'createdAt'>): Promise<void> {
    try {
      const helpfulRef = firestore().collection('helpfuls').doc();
      
      await helpfulRef.set({
        ...voteData,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      console.log('Helpful vote added:', voteData.reviewId);
    } catch (error) {
      console.error('Error adding helpful vote:', error);
      throw error;
    }
  },

  async removeHelpfulVote(reviewId: string, userId: string): Promise<void> {
    try {
      const helpfulQuery = await firestore()
        .collection('helpfuls')
        .where('reviewId', '==', reviewId)
        .where('taggedBy', '==', userId)
        .get();

      if (!helpfulQuery.empty) {
        const batch = firestore().batch();
        helpfulQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
    } catch (error) {
      console.error('Error removing helpful vote:', error);
      throw error;
    }
  },

  async hasUserVoted(reviewId: string, userId: string): Promise<boolean> {
    try {
      const voteQuery = await firestore()
        .collection('helpfuls')
        .where('reviewId', '==', reviewId)
        .where('taggedBy', '==', userId)
        .get();

      return !voteQuery.empty;
    } catch (error) {
      console.error('Error checking user vote:', error);
      return false;
    }
  },

  async getUserReviewForBusiness(
    userId: string,
    businessId: string
  ): Promise<Review | null> {
    try {
      const querySnapshot = await db
        .collection("reviews")
        .where("userId", "==", userId)
        .where("businessId", "==", businessId)
        .limit(1)
        .get();

      if (querySnapshot.empty) return null;

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        businessId: data.businessId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        rating: data.rating,
        text: data.text,
        images: data.images || [],
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