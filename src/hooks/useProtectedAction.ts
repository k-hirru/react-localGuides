import { useCallback } from 'react';
import { useInternetConnectivity } from './useInternetConnectivity';
import { Alert } from 'react-native';

/**
 * Wraps async actions with connectivity checks and optional retry/alerts.
 *
 * - Calls `useInternetConnectivity().checkConnectivity()` before running
 *   the provided action.
 * - Presents a user-facing alert with optional "Retry" when offline.
 * - Returns `false` instead of throwing when the action is blocked by
 *   offline state, making it easy for callers to bail out gracefully.
 *
 * This hook sits between UI/feature hooks (e.g. `useHomeBusinesses`,
 * `useAppStore`) and the services layer, so network guarding logic is
 * defined once and reused consistently.
 */

export const useProtectedAction = () => {
  const { isConnected, checkConnectivity, showOfflineAlert } = useInternetConnectivity();

  const protectedAction = useCallback(
    async <T>(
      action: () => Promise<T> | T,
      options: {
        actionName?: string;
        showAlert?: boolean;
        retry?: boolean;
      } = {},
    ): Promise<T | false> => {
      const { actionName = 'This action', showAlert = true, retry = true } = options;

      // Check connectivity first
      const connected = await checkConnectivity();

      if (!connected) {
        if (showAlert) {
          const message = `${actionName} requires an internet connection.`;
          if (retry) {
            Alert.alert('No Internet Connection', message, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Retry',
                onPress: () => protectedAction(action, options),
              },
            ]);
          } else {
            Alert.alert('No Internet Connection', message, [{ text: 'OK' }]);
          }
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
    },
    [checkConnectivity],
  );

  return {
    isConnected,
    protectedAction,
    showOfflineAlert,
  };
};
