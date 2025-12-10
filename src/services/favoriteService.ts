import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from '@react-native-firebase/firestore';

// Get Firestore instance
const db = getFirestore();

/**
 * favoriteService
 *
 * Thin Firestore wrapper around the `userFavorites` collection:
 * - Stores an array of `favoriteBusinessIds` per user.
 * - Exposes helpers to add/remove/toggle a business as a favorite.
 * - Provides a realtime `subscribeToFavorites` API so hooks like
 *   `useAppStore` can react to updates.
 *
 * Together with `useAppStore` and `useInternetConnectivity`, this also
 * participates in a lightweight offline strategy: favorite toggles can be
 * queued locally when offline and replayed as `toggleFavorite` calls when
 * connectivity is restored.
 *
 * This keeps favorites persistence concerns out of components and
 * normalizes how favorite state is stored and retrieved.
 */

export const favoriteService = {
  // Get user's favorites
  async getUserFavorites(userId: string): Promise<string[]> {
    try {
      const userDoc = await getDoc(doc(db, 'userFavorites', userId));

      if (userDoc.exists()) {
        return userDoc.data()?.favoriteBusinessIds || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting user favorites:', error);
      return [];
    }
  },

  // Add a business to favorites
  async addToFavorites(userId: string, businessId: string): Promise<void> {
    try {
      await setDoc(
        doc(db, 'userFavorites', userId),
        {
          favoriteBusinessIds: arrayUnion(businessId),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  },

  // Remove a business from favorites
  async removeFromFavorites(userId: string, businessId: string): Promise<void> {
    try {
      await setDoc(
        doc(db, 'userFavorites', userId),
        {
          favoriteBusinessIds: arrayRemove(businessId),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  },

  // Toggle favorite status
  async toggleFavorite(
    userId: string,
    businessId: string,
    isCurrentlyFavorite: boolean,
  ): Promise<void> {
    if (isCurrentlyFavorite) {
      await this.removeFromFavorites(userId, businessId);
    } else {
      await this.addToFavorites(userId, businessId);
    }
  },

  // Real-time listener for favorites changes
  subscribeToFavorites(userId: string, callback: (favorites: string[]) => void): () => void {
    const userRef = doc(db, 'userFavorites', userId);

    const unsubscribe = onSnapshot(
      userRef,
      (documentSnapshot) => {
        if (documentSnapshot.exists()) {
          const favorites = documentSnapshot.data()?.favoriteBusinessIds || [];
          callback(favorites);
        } else {
          callback([]);
        }
      },
      (error: any) => {
        // Gracefully handle permission issues (e.g. user logged out or rules updated)
        if (error?.code === 'firestore/permission-denied') {
          console.warn('Favorites subscription permission denied, clearing favorites.');
          callback([]);
          return;
        }

        console.error('Error in favorites subscription:', error);
      },
    );

    return unsubscribe;
  },
};
