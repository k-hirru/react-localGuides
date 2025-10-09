import React from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  ViewStyle
} from 'react-native';
import Colors from '@/src/constants/colors';

interface KeyboardAvoidingScrollViewProps {
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
}

export const KeyboardAvoidingScrollView: React.FC<KeyboardAvoidingScrollViewProps> = ({
  children,
  contentContainerStyle
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollViewContent, contentContainerStyle]}
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollView: {
    paddingHorizontal: 24,
  },
});