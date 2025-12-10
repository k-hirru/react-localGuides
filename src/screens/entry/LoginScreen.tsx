import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LogIn, Mail, Lock, Apple, Smartphone, Eye, EyeOff } from 'lucide-react-native';

import { StyledInput } from '@/src/components/StyledInput';
import { SocialButton } from '@/src/components/SocialButton';
import { KeyboardAvoidingScrollView } from '@/src/components/KeyboardAvoidingScrollView';
import { useAuth } from '@/src/hooks/useAuth';
import Colors from '@/src/constants/colors';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password should be at least 6 characters long'),
});

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login, loading, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async () => {
    try {
      const parsed = loginSchema.parse({ email: email.trim(), password });

      await login(parsed.email, parsed.password);
    } catch (error: any) {
      if (error?.issues?.length) {
        Alert.alert('Invalid Credentials', error.issues[0].message);
      } else {
        Alert.alert('Login Error', error.message || 'Failed to sign in. Please try again.');
      }
    }
  };

  const handleSocialLogin = (platform: 'Apple' | 'Phone') => {
    Alert.alert('Coming Soon', `${platform} login will be available soon!`);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first');
      return;
    }

    Alert.alert('Reset Password', `Send password reset email to ${email}?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Send',
        onPress: async () => {
          try {
            setResetLoading(true);
            await resetPassword(email);
            Alert.alert(
              'Check Your Email',
              'Password reset email sent! Please check your inbox/spam and follow the instructions.',
            );
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send reset email. Please try again.');
          } finally {
            setResetLoading(false);
          }
        },
      },
    ]);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <KeyboardAvoidingScrollView contentContainerStyle={styles.mainContent}>
      {/* Application Header/Logo */}
      <View style={styles.headerContainer}>
        <Image
          source={require('@/src/assets/images/BiteSpotLogotransparent.png')}
          style={styles.logo}
          resizeMode="contain" // keeps aspect ratio
        />
        <Text style={[styles.title, { color: Colors.light.text }]}>BiteSpot</Text>
        <Text style={styles.subtitle}>Discover local. Log in to guide.</Text>
      </View>

      {/* Login Form */}
      <View style={styles.formContainer}>
        <StyledInput
          Icon={Mail}
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* ✅ FIXED: Password Input with Visibility Toggle */}
        <View style={styles.passwordContainer}>
          <StyledInput
            Icon={Lock}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            isPassword={!showPassword} // ✅ Use isPassword instead of secureTextEntry
          />
          <TouchableOpacity style={styles.visibilityToggle} onPress={togglePasswordVisibility}>
            {showPassword ? (
              <EyeOff size={20} color={Colors.light.gray[500]} />
            ) : (
              <Eye size={20} color={Colors.light.gray[500]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={handleForgotPassword}
          disabled={resetLoading}
        >
          {resetLoading ? (
            <ActivityIndicator size="small" color={Colors.light.primary} />
          ) : (
            <Text style={styles.linkText}>Forgot Password?</Text>
          )}
        </TouchableOpacity>

        {/* Main Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading || !email || !password}
        >
          {loading ? (
            <ActivityIndicator color={Colors.light.background} size="small" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

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
          onPress={() => handleSocialLogin('Apple')}
        />
        <SocialButton
          Icon={Smartphone}
          text="Continue with Phone Number"
          onPress={() => handleSocialLogin('Phone')}
        />
      </View>

      {/* Sign Up Link */}
      <View style={styles.signUpContainer}>
        <Text style={styles.signUpText}>{`Don't have an account? `}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp' as never)}>
          <Text style={[styles.signUpText, styles.linkText]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingScrollView>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 18,
    color: Colors.light.gray[500],
    marginTop: 8,
  },
  formContainer: {
    marginBottom: 32,
  },
  passwordContainer: {
    position: 'relative',
  },
  visibilityToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
    padding: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 24,
    height: 20,
    justifyContent: 'center',
  },
  linkText: {
    color: Colors.light.primary,
    fontWeight: '500',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    padding: 20,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 20,
    color: Colors.light.background,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },
  signUpText: {
    fontSize: 16,
    color: Colors.light.gray[500],
  },
  logo: {
    width: 60,
    height: 60,
  },
});
