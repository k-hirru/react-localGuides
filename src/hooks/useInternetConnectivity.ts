import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

export const useInternetConnectivity = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isChecking, setIsChecking] = useState(false);

  // Check connectivity status
  const checkConnectivity = useCallback(async () => {
    setIsChecking(true);
    try {
      const state = await NetInfo.fetch();
      setIsConnected(state.isConnected);
      return state.isConnected;
    } catch (error) {
      console.error('Error checking connectivity:', error);
      setIsConnected(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Show offline alert
  const showOfflineAlert = useCallback(() => {

  }, []);

  // Show online alert
  const showOnlineAlert = useCallback(() => {
    Alert.alert(
      'Connection Restored',
      'Your internet connection has been restored.',
      [{ text: 'OK' }]
    );
  }, []);

  // Listen to connectivity changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = isConnected;
      const nowConnected = state.isConnected;
      
      setIsConnected(nowConnected);

      // Show alerts on connectivity changes
      if (wasConnected && !nowConnected) {
        showOfflineAlert();
      } else if (!wasConnected && nowConnected) {
        showOnlineAlert();
      }
    });

    // Initial check
    checkConnectivity();

    return unsubscribe;
  }, [checkConnectivity, showOfflineAlert, showOnlineAlert]);

  return {
    isConnected: isConnected === true,
    isChecking,
    checkConnectivity,
    showOfflineAlert,
  };
};