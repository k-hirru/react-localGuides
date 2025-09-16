import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Mail, Lock, Apple, Smartphone, User } from 'lucide-react-native';

import { StyledInput } from '@/src/components/StyledInput';
import { SocialButton } from '@/src/components/SocialButton';
import { KeyboardAvoidingScrollView } from '@/src/components/KeyboardAvoidingScrollView';
import { FormContainer } from '@/src/components/FormContainer';
import { useAuth } from '@/src/hooks/useAuth';
import Colors from '@/src/constants/colors';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const { signup, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters');
      return;
    }

    try {
      await signup(email, password, fullName);
      Alert.alert('Welcome!', 'Your account has been created successfully!');
    } catch (error: any) {
      Alert.alert('Sign Up Error', error.message);
    }
  };

  const handleSocialSignUp = (platform: 'Apple' | 'Phone') => {
    console.log(`Attempting social sign up via ${platform}`);
    Alert.alert('Coming Soon', `${platform} sign up will be available soon!`);
  };

  const isButtonDisabled = loading || !fullName || !email || !password || !confirmPassword || password !== confirmPassword || password.length < 6;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingScrollView 
        contentContainerStyle={styles.mainContent}
        style={styles.scrollView}
      >
        {/* Application Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: Colors.light.text }]}>
            Join Yelpify
          </Text>
          <Text style={styles.subtitle}>
            Create an account and start sharing your local gems.
          </Text>
        </View>

        {/* Sign Up Form */}
        <FormContainer>
          <StyledInput
            Icon={User}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            keyboardType="default"
            autoCapitalize="words"
          />
          
          <StyledInput
            Icon={Mail}
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <StyledInput
            Icon={Lock}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          <StyledInput
            Icon={Lock}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword           
          />

          {/* Main Sign Up Button */}
          <TouchableOpacity 
            style={[
              styles.signUpButton, 
              isButtonDisabled && styles.signUpButtonDisabled
            ]} 
            onPress={handleSignUp}
            disabled={isButtonDisabled}
          >
            {loading ? (
              <ActivityIndicator color={Colors.light.background} size="small" />
            ) : (
              <Text style={styles.signUpButtonText}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>
        </FormContainer>

        {/* Divider and Social Logins */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONNECT WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        <View>
          <SocialButton 
            Icon={Apple} 
            text="Continue with Apple" 
            onPress={() => handleSocialSignUp('Apple')} 
          />
          <SocialButton 
            Icon={Smartphone} 
            text="Continue with Phone Number" 
            onPress={() => handleSocialSignUp('Phone')} 
          />
        </View>

        {/* Login Link */}
        <View style={styles.loginLinkContainer}>
          <Text style={styles.loginText}>
            Already a local guide? 
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.loginText, styles.linkText]}>
              Log In
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  mainContent: {
    flexGrow: 1, 
    justifyContent: 'center',
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    textAlign: 'center',
    marginTop: 0, 
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.gray[500],
    marginTop: 4,
    textAlign: 'center',
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    padding: 18,
    marginTop: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    fontSize: 18,
    color: Colors.light.background,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 6, 
    paddingHorizontal: 8, 
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.gray[300],
  },
  dividerText: {
    fontSize: 12,
    color: Colors.light.gray[500],
    marginHorizontal: 16,
    fontWeight: '500',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 'auto',
  },
  loginText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  linkText: {
    color: Colors.light.primary,
    fontWeight: '700', 
    marginLeft: 4,
  },
});