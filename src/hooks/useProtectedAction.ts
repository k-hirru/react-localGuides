import { useCallback } from 'react';
import { useInternetConnectivity } from './useInternetConnectivity';
import { Alert } from 'react-native';

export const useProtectedAction = () => {
  const { isConnected, checkConnectivity, showOfflineAlert } = useInternetConnectivity();

  const protectedAction = useCallback(async <T>(
    action: () => Promise<T> | T,
    options: {
      actionName?: string;
      showAlert?: boolean;
      retry?: boolean;
    } = {}
  ): Promise<T | false> => {
    const { actionName = 'This action', showAlert = true, retry = true } = options;

    // Check connectivity first
    const connected = await checkConnectivity();
    
    if (!connected) {
      if (showAlert) {
        Alert.alert(
          'No Internet Connection',
          `${actionName} requires an internet connection. Please check your connection and try again.`,
          retry ? [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Retry', 
              onPress: () => protectedAction(action, options) 
            }
          ] : [{ text: 'OK' }]
        );
      }
      return false;
    }

    try {
      const result = await action();
      return result;
    } catch (error) {
      console.error(`Protected action failed:`, error);
      throw error;
    }
  }, [checkConnectivity]);

  return {
    isConnected,
    protectedAction,
    showOfflineAlert,
  };
};