import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";

const { width, height } = Dimensions.get("window");

export function LoadingScreen() {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spinning animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in animation
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.gradientCircle1} />
      <View style={styles.gradientCircle2} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeValue,
          },
        ]}
      >
        {/* Spinning outer ring */}
        <Animated.View
          style={[
            styles.outerRing,
            {
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <View style={styles.ringSegment1} />
          <View style={styles.ringSegment2} />
        </Animated.View>

        {/* Pulsing center circle */}
        <Animated.View
          style={[
            styles.centerCircle,
            {
              transform: [{ scale: pulseValue }],
            },
          ]}
        >
          {/* Icon/Logo placeholder - you can replace with your logo */}
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>📍</Text>
          </View>
        </Animated.View>

        {/* App name */}
        <Animated.Text
          style={[
            styles.appName,
            {
              opacity: fadeValue,
            },
          ]}
        >
          LocalGuide
        </Animated.Text>

        {/* Loading text */}
        <Animated.Text
          style={[
            styles.loadingText,
            {
              opacity: fadeValue,
            },
          ]}
        >
          Loading your experience...
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  gradientCircle1: {
    position: "absolute",
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: (width * 1.5) / 2,
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    top: -width * 0.5,
    left: -width * 0.25,
  },
  gradientCircle2: {
    position: "absolute",
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    backgroundColor: "rgba(147, 51, 234, 0.05)",
    bottom: -width * 0.4,
    right: -width * 0.3,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    width: 120,
    height: 120,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  ringSegment1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "transparent",
    borderTopColor: "#3B82F6",
    borderRightColor: "#3B82F6",
  },
  ringSegment2: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "transparent",
    borderBottomColor: "#9333EA",
    borderLeftColor: "#9333EA",
  },
  centerCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 32,
  },
  appName: {
    marginTop: 40,
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: 0.5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "400",
  },
});