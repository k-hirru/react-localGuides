import React, { memo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Colors from '@/src/constants/colors';

interface StyledInputProps {
  Icon: React.ComponentType<any>;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  isPassword?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const StyledInput: React.FC<StyledInputProps> = ({
  Icon,
  placeholder,
  value,
  onChangeText,
  isPassword = false,
  keyboardType = 'default',
  autoCapitalize = 'none'
}) => {
  return (
    <View style={styles.inputContainer}>
      <Icon size={20} color={Colors.light.gray[500]} style={styles.iconSpacing} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.gray[400]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isPassword}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoCorrect={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.gray[300],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: Colors.light.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  iconSpacing: {
    marginRight: 12,
  },
});