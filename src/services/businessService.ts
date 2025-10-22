import firestore from '@react-native-firebase/firestore';
import { Business, generateBusinessId } from '@/src/types';

export const businessService = {
  // Get or create business by coordinates
  async getOrCreateBusiness(businessData: Omit<Business, 'id'>): Promise<string> {
    const businessId = generateBusinessId(
      businessData.coordinates.latitude,
      businessData.coordinates.longitude
    );

    const businessRef = firestore().collection('businesses').doc(businessId);
    
    const doc = await businessRef.get();
    
    if (!doc.exists) {
      // Create new business
      await businessRef.set({
        ...businessData,
        id: businessId,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Update existing business (if needed)
      await businessRef.update({
        ...businessData,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }
    
    return businessId;
  },

  // Get business by coordinates
  async getBusinessByCoordinates(lat: number, lng: number): Promise<Business | null> {
    const businessId = generateBusinessId(lat, lng);
    
    const doc = await firestore()
      .collection('businesses')
      .doc(businessId)
      .get();

    if (!doc.exists) return null;

    const data = doc.data();
    return {
      id: businessId,
      ...data,
      coordinates: data?.coordinates,
    } as Business;
  },

  // Search businesses by location radius
  async searchBusinessesNearby(lat: number, lng: number, radiusKm: number = 5): Promise<Business[]> {
    // This would integrate with Geoapify later
    // For now, we'll use a simple coordinate-based approach
    
    const snapshot = await firestore()
      .collection('businesses')
      .get();

    return snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          coordinates: data.coordinates,
        } as Business;
      })
      .filter(business => {
        // Simple distance calculation (for demo - use proper geoqueries in production)
        const distance = calculateDistance(
          lat, lng,
          business.coordinates.latitude,
          business.coordinates.longitude
        );
        return distance <= radiusKm;
      });
  },
};

// Helper function to calculate distance between coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}