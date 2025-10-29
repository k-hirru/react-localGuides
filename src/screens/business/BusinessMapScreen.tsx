import React, { useState, useCallback } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ChevronLeft, MapPin, LocateFixed } from "lucide-react-native";
import { useAppStore } from "@/src/hooks/useAppStore";
import { useLocation } from "@/src/hooks/useLocation";
import BusinessMap from "@/src/components/BusinessMap";
import { Business } from "../../types";

type RecenterFunction = () => void;

const BusinessMapScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const { id, business: passedBusiness } = route.params as {
    id: string;
    business?: Business;
  };

  const { getBusinessById } = useAppStore();
  const { userLocation } = useLocation();
  console.log("📍 MAP SCREEN RENDER - userLocation:", userLocation);

  // State to hold the recenter function from the map component
  const [recenterMap, setRecenterMap] = useState<RecenterFunction>(() => () => {
    console.log("📍 MAP SCREEN - Recentering function called before map was ready.");
  });

  // Callback to receive the recenter function when the map is ready
  const handleMapReady = useCallback((recenterFunction: RecenterFunction) => {
    // We set the function itself into state
    setRecenterMap(() => recenterFunction);
    console.log("📍 MAP SCREEN - Recenter function is set.");
  }, []);

  const business = passedBusiness || getBusinessById(id);

  if (!business) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Business not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color="#007AFF" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.businessName} numberOfLines={1}>
            {business.name}
          </Text>
          <Text style={styles.businessAddress} numberOfLines={1}>
            {business.address}
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <MapPin size={20} color="#666" />
        </View>
      </View>

      {/* Map */}
      <BusinessMap
        business={business}
        userLocation={userLocation || undefined}
        onMapReady={handleMapReady} // Pass the callback to receive the recenter function
      />

      {/* Show My Location Button */}
      {/* Only show the button if we have a user location and the recenter function is available */}
      {userLocation && (
        <TouchableOpacity
          style={styles.myLocationButton}
          onPress={recenterMap} // Call the set function directly
        >
          <LocateFixed size={24} color="#333" />
        </TouchableOpacity>
      )}

      {/* Info Panel
      <View style={styles.infoPanel}>
        <View style={styles.locationInfo}>
          <MapPin size={16} color="#666" />
          <Text style={styles.locationText}>{business.address}</Text>
        </View>
        {userLocation && (
          <Text style={styles.distanceText}>
            {calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              business.coordinates.latitude,
              business.coordinates.longitude
            )}{" "}
            away
          </Text>
        )}
      </View> */}
    </View>
  );
};

// Helper function to calculate distance
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`; // Meters
  }
  return `${distance.toFixed(1)}km`; // Kilometers
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  businessAddress: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  headerIcon: {
    padding: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 16,
  },
  infoPanel: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    flex: 1,
  },
  distanceText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  myLocationButton: {
    position: "absolute",
    bottom: 60,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10, // Ensure it floats above the map
  },
});

export default BusinessMapScreen;