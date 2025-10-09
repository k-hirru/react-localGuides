import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { UserPlus, Mail, Lock, Apple, Smartphone, User } from 'lucide-react-native';

// Import the reusable components
import { StyledInput } from '@/src/components/StyledInput';
import { SocialButton } from '@/src/components/SocialButton';
import { KeyboardAvoidingScrollView } from '@/src/components/KeyboardAvoidingScrollView';
import Colors from '@/src/constants/colors';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = () => {
    // Implement sign-up logic here
    console.log('Attempting sign up with:', fullName, email, password);
    
    // Navigate to the main app area on successful sign-up
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Tabs' }],
      })
    );
  };

  const handleLoginPress = () => {
    navigation.dispatch(
        CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login'}],
        })
    );
  };

  const handleSocialSignUp = (platform: 'Apple' | 'Phone') => {
    console.log(`Attempting social sign up via ${platform}`);
  };

  return (
    <KeyboardAvoidingScrollView contentContainerStyle={styles.mainContent}>
      {/* Application Header/Logo */}
      <View style={styles.headerContainer}>
        <UserPlus size={48} color={Colors.light.primary} strokeWidth={2.5} />
        <Text style={[styles.title, { color: Colors.light.text }]}>
          Join Yelpify
        </Text>
        <Text style={styles.subtitle}>
          Create an account and start sharing your local gems.
        </Text>
      </View>

      {/* Sign Up Form */}
      <View style={styles.formContainer}>
        {/* Full Name Input */}
        <StyledInput
          Icon={User}
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
          keyboardType="default"
          autoCapitalize="words" // Better for names
        />
        
        {/* Email Input */}
        <StyledInput
          Icon={Mail}
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        
        {/* Password Input */}
        <StyledInput
          Icon={Lock}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          isPassword
        />

        {/* Main Sign Up Button */}
        <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
          <Text style={styles.signUpButtonText}>
            Create Account
          </Text>
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
          Already have an account? 
        </Text>
        <TouchableOpacity onPress={(handleLoginPress)}>
          <Text style={[styles.loginText, styles.linkText]}>
            Log In
          </Text>
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
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signUpButtonText: {
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
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },
  loginText: {
    fontSize: 16,
    color: Colors.light.gray[500],
  },
  linkText: {
    color: Colors.light.primary,
    fontWeight: '500',
  },
});