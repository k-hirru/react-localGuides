import firestore from '@react-native-firebase/firestore';

// Get Firestore instance
const db = firestore();

export const favoriteService = {
  // Get user's favorites
  async getUserFavorites(userId: string): Promise<string[]> {
    try {
      const userDoc = await db.collection('userFavorites').doc(userId).get();
      
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
      await db.collection('userFavorites').doc(userId).set({
        favoriteBusinessIds: firestore.FieldValue.arrayUnion(businessId),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  },

  // Remove a business from favorites
  async removeFromFavorites(userId: string, businessId: string): Promise<void> {
    try {
      await db.collection('userFavorites').doc(userId).set({
        favoriteBusinessIds: firestore.FieldValue.arrayRemove(businessId),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  },

  // Toggle favorite status
  async toggleFavorite(userId: string, businessId: string, isCurrentlyFavorite: boolean): Promise<void> {
    if (isCurrentlyFavorite) {
      await this.removeFromFavorites(userId, businessId);
    } else {
      await this.addToFavorites(userId, businessId);
    }
  },

  // Real-time listener for favorites changes
  subscribeToFavorites(userId: string, callback: (favorites: string[]) => void): () => void {
    const userRef = db.collection('userFavorites').doc(userId);
    
    const unsubscribe = userRef.onSnapshot(
      (documentSnapshot) => {
        if (documentSnapshot.exists()) {
          const favorites = documentSnapshot.data()?.favoriteBusinessIds || [];
          callback(favorites);
        } else {
          callback([]);
        }
      },
      (error) => {
        console.error('Error in favorites subscription:', error);
      }
    );

    return unsubscribe;
  }
};