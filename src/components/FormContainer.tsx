import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '@/src/constants/colors';

interface FormContainerProps {
  children: React.ReactNode;
  style?: any;
}

export const FormContainer: React.FC<FormContainerProps> = ({ children, style }) => {
  return <View style={[styles.formContainer, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  formContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.light.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
});
