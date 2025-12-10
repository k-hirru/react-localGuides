import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useInternetConnectivity } from '@/src/hooks/useInternetConnectivity';

export const OfflineBanner: React.FC = () => {
  const { isConnected } = useInternetConnectivity();

  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <WifiOff size={16} color="#FFF" />
      <Text style={styles.bannerText}>No internet connection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF3B30',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
