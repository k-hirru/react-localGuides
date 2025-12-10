import React from 'react';
import { KeyboardAvoidingView, ScrollView, Platform, StyleSheet, ViewStyle } from 'react-native';
import Colors from '@/src/constants/colors';

interface KeyboardAvoidingScrollViewProps {
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
}

export const KeyboardAvoidingScrollView: React.FC<KeyboardAvoidingScrollViewProps> = ({
  children,
  contentContainerStyle,
  style,
}) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Start with 0, adjust if needed
    >
      <ScrollView
        contentContainerStyle={[styles.scrollViewContent, contentContainerStyle]}
        style={[styles.scrollView, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false} // Prevents weird bouncing that can break keyboard avoidance
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20, // Add some vertical padding
  },
  scrollView: {
    paddingHorizontal: 24,
  },
});
