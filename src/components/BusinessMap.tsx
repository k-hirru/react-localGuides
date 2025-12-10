import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapLibreGL, { MapViewRef, CameraRef } from '@maplibre/maplibre-react-native';
import { Business } from '@/src/types';
import 'react-native-url-polyfill/auto';

interface BusinessMapProps {
  business: Business;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  onMapReady?: (recenterFunction: () => void) => void;
}

const getCoordNumber = (coord: number | any): number => {
  if (typeof coord === 'number') return coord;
  if (Array.isArray(coord) && typeof coord[0] === 'number') {
    return coord[0];
  }
  if (typeof coord === 'string') {
    const num = parseFloat(coord);
    if (!isNaN(num)) return num;
  }
  console.error('CRITICAL ERROR: Invalid coordinate data received:', coord);
  return 0;
};

const BusinessMap: React.FC<BusinessMapProps> = ({ business, userLocation, onMapReady }) => {
  const businessLat = getCoordNumber(business.coordinates.latitude);
  const businessLon = getCoordNumber(business.coordinates.longitude);

  const cameraRef = useRef<CameraRef>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const recenterCounterRef = useRef(0);

  const recenterToUser = useCallback(() => {
    if (!cameraRef.current || !userLocation) return;

    recenterCounterRef.current += 1;
    const slightVariation = recenterCounterRef.current * 0.000001;

    cameraRef.current.setCamera({
      centerCoordinate: [
        userLocation.longitude + slightVariation,
        userLocation.latitude + slightVariation,
      ],
      zoomLevel: 16,
      animationDuration: 1500,
    });
  }, [userLocation]);

  useEffect(() => {
    if (!isMapReady || !cameraRef.current) return;

    if (userLocation) {
      const minLat = Math.min(userLocation.latitude, businessLat);
      const maxLat = Math.max(userLocation.latitude, businessLat);
      const minLon = Math.min(userLocation.longitude, businessLon);
      const maxLon = Math.max(userLocation.longitude, businessLon);

      cameraRef.current.setCamera({
        bounds: {
          sw: [minLon, minLat],
          ne: [maxLon, maxLat],
        },
        padding: { paddingTop: 50, paddingBottom: 50, paddingLeft: 50, paddingRight: 50 },
        animationDuration: 1000,
      });
    } else {
      cameraRef.current.setCamera({
        centerCoordinate: [businessLon, businessLat],
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }

    if (onMapReady) {
      onMapReady(recenterToUser);
    }
  }, [isMapReady, userLocation, businessLat, businessLon, onMapReady, recenterToUser]);

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        logoEnabled={false}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
        mapStyle="https://api.maptiler.com/maps/streets-v4/style.json?key=Qnrtv7pdcyJenDtkkeTS"
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [businessLon, businessLat],
            zoomLevel: 14,
          }}
        />

        {/* User Location Marker */}
        {userLocation && (
          <MapLibreGL.PointAnnotation
            id="user-location"
            coordinate={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={styles.userMarkerContainer}>
              <View style={[styles.marker, styles.userMarker]}>
                <View style={styles.userMarkerPulse} />
              </View>
            </View>
          </MapLibreGL.PointAnnotation>
        )}

        {/* Business Location Marker */}
        <MapLibreGL.PointAnnotation id="business-location" coordinate={[businessLon, businessLat]}>
          <View style={[styles.marker, styles.businessMarker]}>
            <View style={styles.businessIcon}>
              <Text style={styles.businessIconText}>📍</Text>
            </View>
          </View>
        </MapLibreGL.PointAnnotation>
      </MapLibreGL.MapView>

      {/* You are here overlay
      {userLocation && (
        <View style={styles.youAreHereOverlay} pointerEvents="none">
          <View style={styles.youAreHereCard}>
            <View style={styles.locationDot} />
            <Text style={styles.youAreHereText}>You</Text>
          </View>
        </View>
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  // User Marker with pulse effect
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userMarker: {
    backgroundColor: '#007AFF',
  },
  userMarkerPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'black',
  },
  // Business Marker
  businessMarker: {
    backgroundColor: '#FF3B30',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  businessIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessIconText: {
    fontSize: 14,
  },
  // You are here overlay
  youAreHereOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'flex-start',
  },
  youAreHereCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'black',
    marginRight: 8,
  },
  youAreHereText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default BusinessMap;
