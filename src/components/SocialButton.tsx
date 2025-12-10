import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Colors from '@/src/constants/colors';

interface SocialButtonProps {
  Icon: React.ComponentType<any>;
  text: string;
  onPress: () => void;
  variant?: 'default' | 'outline';
}

export const SocialButton: React.FC<SocialButtonProps> = ({
  Icon,
  text,
  onPress,
  variant = 'default',
}) => {
  return (
    <TouchableOpacity
      style={[styles.socialButton, variant === 'outline' && styles.socialButtonOutline]}
      onPress={onPress}
    >
      <Icon size={20} color={Colors.light.gray[700]} style={styles.iconSpacing} />
      <Text style={styles.socialButtonText}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.gray[200],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: Colors.light.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonOutline: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
  },
  socialButtonText: {
    fontSize: 16,
    color: Colors.light.gray[700],
    fontWeight: '500',
  },
  iconSpacing: {
    marginRight: 12,
  },
});
