import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as qLimit,
  serverTimestamp,
  increment,
  writeBatch,
} from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Review } from '@/src/types';
import { imageService } from './imageService';

const db = getFirestore();

/**
 * reviewService
 *
 * Encapsulates all Firestore access and domain logic for reviews and
 * helpful votes:
 * - `addReview`, `updateReview`, `deleteReview` work with the `reviews`
 *   collection and ensure timestamps are managed consistently.
 * - `getReviewsForBusiness`, `getUserReviews`, and `getBusinessesWithReviews`
 *   provide both raw lists and aggregated rating/review-count data per
 *   business.
 * - Integrates with `imageService` to delete associated review images from
 *   Storage when a review is removed.
 *
 * UI and hooks rely on this service instead of talking to Firestore
 * collections directly, which keeps persistence concerns out of
 * presentation code.
 */

export interface HelpfulVote {
  reviewId: string;
  reviewOwnerId: string;
  taggedBy: string;
  businessId: string;
  createdAt: any;
}

// Helpers
const toISODate = (ts?: FirebaseFirestoreTypes.Timestamp) =>
  (ts?.toDate() ?? new Date()).toISOString().split('T')[0];

const toJSDate = (ts?: FirebaseFirestoreTypes.Timestamp) => ts?.toDate() ?? new Date();

export const reviewService = {
  // Add a new review
  async addReview(
    reviewData: Omit<Review, 'id' | 'date' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    try {
      const reviewWithTimestamps = {
        ...reviewData,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, 'reviews'), reviewWithTimestamps);
      return ref.id;
    } catch (error) {
      console.error('Error adding review:', error);
      throw new Error('Failed to add review');
    }
  },

  async getBusinessesWithReviews(
    businessIds: string[],
  ): Promise<Map<string, { rating: number; reviewCount: number }>> {
    if (businessIds.length === 0) return new Map();

    const totals = new Map<string, { totalScore: number; reviewCount: number }>();
    businessIds.forEach((id) => totals.set(id, { totalScore: 0, reviewCount: 0 }));

    // Firestore "in" supports up to 10 values
    for (let i = 0; i < businessIds.length; i += 10) {
      const batchIds = businessIds.slice(i, i + 10);

      try {
        const q = query(collection(db, 'reviews'), where('businessId', 'in', batchIds));
        const snap = await getDocs(q);

        snap.forEach((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = d.data() as any;
          const agg = totals.get(data.businessId);
          if (agg) {
            agg.totalScore += data.rating || 0;
            agg.reviewCount += 1;
          }
        });
      } catch (error) {
        console.error('Error fetching batch reviews:', error);
      }
    }

    const result = new Map<string, { rating: number; reviewCount: number }>();
    totals.forEach((v, id) => {
      result.set(id, {
        rating: v.reviewCount > 0 ? v.totalScore / v.reviewCount : 0,
        reviewCount: v.reviewCount,
      });
    });

    return result;
  },

  // Get reviews for a business
  async getReviewsForBusiness(businessId: string): Promise<Review[]> {
    try {
      console.log('🔍 Fetching reviews for business:', businessId);

      const q = query(
        collection(db, 'reviews'),
        where('businessId', '==', businessId),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);

      console.log('✅ Reviews query successful, found:', snap.size, 'reviews');

      const reviews: Review[] = [];
      snap.forEach((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        const data = d.data() as any;
        reviews.push({
          id: d.id,
          businessId: data.businessId,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          rating: data.rating,
          text: data.text,
          images: (data.images as string[]) || [],
          helpful: data.helpful || 0,
          date: toISODate(data.date),
          createdAt: toJSDate(data.createdAt),
          updatedAt: toJSDate(data.updatedAt),
        });
      });

      return reviews;
    } catch (error: unknown) {
      console.error('❌ Error fetching reviews:', error);
      throw new Error('Failed to fetch reviews');
    }
  },

  // Get reviews by a user
  async getUserReviews(userId: string): Promise<Review[]> {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);

      const reviews: Review[] = [];
      snap.forEach((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        const data = d.data() as any;
        reviews.push({
          id: d.id,
          businessId: data.businessId,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          rating: data.rating,
          text: data.text,
          images: (data.images as string[]) || [],
          helpful: data.helpful || 0,
          date: toISODate(data.date),
          createdAt: toJSDate(data.createdAt),
          updatedAt: toJSDate(data.updatedAt),
        });
      });

      return reviews;
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      throw new Error('Failed to fetch user reviews');
    }
  },

  // Update a review
  async updateReview(
    reviewId: string,
    updates: { rating?: number; text?: string; images?: string[] },
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating review:', error);
      throw new Error('Failed to update review');
    }
  },

  // Delete a review and its images
  async deleteReview(reviewId: string): Promise<void> {
    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      const reviewSnap = await getDoc(reviewRef);

      // RNFirebase typings vary by version: some expose `exists()` (method), others `exists` (boolean)
      const exists =
        typeof (reviewSnap as any).exists === 'function'
          ? (reviewSnap as any).exists()
          : !!(reviewSnap as any).exists;

      if (exists) {
        const data = reviewSnap.data() as any;
        const images: string[] = (data?.images as string[]) || [];
        if (images.length > 0) {
          console.log('🗑️ Deleting review images from Firebase Storage:', images.length);
          await imageService.deleteImages(images);
        }
      }

      await deleteDoc(reviewRef);
      console.log('✅ Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      throw new Error('Failed to delete review');
    }
  },

  // Update helpful count (increment/decrement)
  async updateReviewHelpfulCount(reviewId: string, delta: number): Promise<void> {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        helpful: increment(delta),
      });
      console.log(`✅ Updated helpful count for review ${reviewId} by ${delta}`);
    } catch (error) {
      console.error('Error updating helpful count:', error);
      throw error;
    }
  },

  async addHelpfulVote(voteData: Omit<HelpfulVote, 'createdAt'>): Promise<void> {
    try {
      const helpfulRef = doc(collection(db, 'helpfuls')); // auto-id
      await setDoc(helpfulRef, {
        ...voteData,
        createdAt: serverTimestamp(),
      });
      console.log('Helpful vote added:', voteData.reviewId);
    } catch (error) {
      console.error('Error adding helpful vote:', error);
      throw error;
    }
  },

  async removeHelpfulVote(reviewId: string, userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'helpfuls'),
        where('reviewId', '==', reviewId),
        where('taggedBy', '==', userId),
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          batch.delete(d.ref);
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
      const q = query(
        collection(db, 'helpfuls'),
        where('reviewId', '==', reviewId),
        where('taggedBy', '==', userId),
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (error) {
      console.error('Error checking user vote:', error);
      return false;
    }
  },

  async getUserReviewForBusiness(userId: string, businessId: string): Promise<Review | null> {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('userId', '==', userId),
        where('businessId', '==', businessId),
        qLimit(1),
      );
      const snap = await getDocs(q);

      if (snap.empty) return null;

      const d = snap.docs[0];
      const data = d.data() as any;

      return {
        id: d.id,
        businessId: data.businessId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        rating: data.rating,
        text: data.text,
        images: (data.images as string[]) || [],
        helpful: data.helpful || 0,
        date: toISODate(data.date),
        createdAt: toJSDate(data.createdAt),
        updatedAt: toJSDate(data.updatedAt),
      };
    } catch (error) {
      console.error('Error checking user review:', error);
      return null;
    }
  },
};
