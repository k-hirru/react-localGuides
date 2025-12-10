import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';

const FindingPlacesLoader = () => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulse }] }]}>
        <MapPin color="#007AFF" size={54} />
      </Animated.View>
      <Text style={styles.text}>Finding nearby places…</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80, // small vertical adjustment if needed
  },
  iconContainer: {
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: '#444',
    fontWeight: '500',
  },
});

export default FindingPlacesLoader;
