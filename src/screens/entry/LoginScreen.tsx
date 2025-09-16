import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LogIn, Mail, Lock, Apple, Smartphone } from "lucide-react-native";

import { StyledInput } from "@/src/components/StyledInput";
import { SocialButton } from "@/src/components/SocialButton";
import { KeyboardAvoidingScrollView } from "@/src/components/KeyboardAvoidingScrollView";
import { useAuth } from "@/src/hooks/useAuth";
import Colors from "@/src/constants/colors";

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    try {
      await login(email, password);
      // Navigation is handled automatically by the auth state change in AppNavigator
    } catch (error: any) {
      Alert.alert("Login Error", error.message);
    }
  };

  const handleSocialLogin = (platform: "Apple" | "Phone") => {
    console.log(`Attempting social login via ${platform}`);
    Alert.alert("Coming Soon", `${platform} login will be available soon!`);
  };

  const handleForgotPassword = () => {
    if (!email) {
      Alert.alert("Email Required", "Please enter your email address first");
      return;
    }

    Alert.alert("Reset Password", `Send password reset email to ${email}?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Send",
        onPress: async () => {
          try {
            // This would be implemented when we add resetPassword to useAuth
            Alert.alert("Check Your Email", "Password reset email sent!");
          } catch (error) {
            Alert.alert(
              "Error",
              "Failed to send reset email. Please try again."
            );
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingScrollView contentContainerStyle={styles.mainContent}>
      {/* Application Header/Logo */}
      <View style={styles.headerContainer}>
        <LogIn size={48} color={Colors.light.primary} strokeWidth={2.5} />
        <Text style={[styles.title, { color: Colors.light.text }]}>
          Yelpify
        </Text>
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
        <StyledInput
          Icon={Lock}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          isPassword
        />

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={handleForgotPassword}
        >
          <Text style={styles.linkText}>Forgot Password?</Text>
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
          onPress={() => handleSocialLogin("Apple")}
        />
        <SocialButton
          Icon={Smartphone}
          text="Continue with Phone Number"
          onPress={() => handleSocialLogin("Phone")}
        />
      </View>

      {/* Sign Up Link */}
      <View style={styles.signUpContainer}>
        <Text style={styles.signUpText}>{`Don't have an account? `}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("SignUp" as never)}
        >
          <Text style={[styles.signUpText, styles.linkText]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingScrollView>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    justifyContent: "center",
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 48,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 18,
    color: Colors.light.gray[500],
    marginTop: 8,
  },
  formContainer: {
    marginBottom: 32,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginBottom: 24,
  },
  linkText: {
    color: Colors.light.primary,
    fontWeight: "500",
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "700",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "500",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
    paddingBottom: 16,
  },
  signUpText: {
    fontSize: 16,
    color: Colors.light.gray[500],
  },
});
