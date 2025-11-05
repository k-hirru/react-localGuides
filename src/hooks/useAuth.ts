import { useState, useEffect } from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { notificationService } from "@/src/services/notificationService";

interface UserDocument {
  name: string;
  email: string;
  fcmTokens?: string[];
  createdAt: FirebaseFirestoreTypes.FieldValue;
  updatedAt: FirebaseFirestoreTypes.FieldValue;
}

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const updateUserFcmToken = async (
    user: FirebaseAuthTypes.User,
    token: string | null
  ) => {
    if (!token) return;

    try {
      const userRef = firestore().collection("users").doc(user.uid);
      const userDoc = await userRef.get();

      const userData: Partial<UserDocument> = {
        name: user.displayName || "",
        email: user.email || "",
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (userDoc.exists()) {
        // Update existing user, add token if not present
        await userRef.update({
          ...userData,
          fcmTokens: firestore.FieldValue.arrayUnion(token),
        });
      } else {
        // Create new user document
        await userRef.set({
          ...userData,
          fcmTokens: [token],
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      console.log("FCM token stored for user:", user.uid);
    } catch (error) {
      console.error("Error storing FCM token:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      setUser(user);

      if (user) {
        // Get FCM token and store it for the user
        const token = await notificationService.requestPermissionAndGetToken();
        await updateUserFcmToken(user, token);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        password
      );
      
      const token = await notificationService.requestPermissionAndGetToken();
      await updateUserFcmToken(userCredential.user, token);

      return userCredential.user;
    } catch (error: any) {
      let errorMessage = "Login failed. Please try again.";

      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled.";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    try {
      setError(null);
      setLoading(true);
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password
      );

      // Update profile with display name
      await userCredential.user.updateProfile({
        displayName: fullName,
      });

      // Store FCM token for new user
      const token = await notificationService.requestPermissionAndGetToken();
      await updateUserFcmToken(userCredential.user, token);

      return userCredential.user;
    } catch (error: any) {
      let errorMessage = "Sign up failed. Please try again.";

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "An account with this email already exists.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Email/password accounts are not enabled.";
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak.";
          break;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logoutAndCleanup = async () => {
    try {
      await auth().signOut();
      return true;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout: logoutAndCleanup,
    resetPassword,
  };
};
