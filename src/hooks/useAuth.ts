import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  updateProfile,
  FirebaseAuthTypes
} from "@react-native-firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  arrayUnion,
  FieldValue
} from "@react-native-firebase/firestore";
import { notificationService } from "@/src/services/notificationService";

type User = FirebaseAuthTypes.User;

interface UserDocument {
  name: string;
  email: string;
  fcmTokens?: string[];
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

// Global refs to prevent multiple initializations
let globalAuthInitialized = false;
let initialUser: User | null = null;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();
  const firestore = getFirestore();

  const updateUserFcmToken = useCallback(async (user: User, token: string | null) => {
    if (!token) return;

    try {
      const userRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userRef);

      const userData: Partial<UserDocument> = {
        name: user.displayName || "",
        email: user.email || "",
        updatedAt: serverTimestamp(),
      };

      if (userDoc.exists()) {
        const existingData = userDoc.data() as UserDocument;
        const existingTokens = existingData.fcmTokens || [];
        
        if (!existingTokens.includes(token)) {
          await updateDoc(userRef, {
            ...userData,
            fcmTokens: arrayUnion(token),
          });
        }
      } else {
        await setDoc(userRef, {
          ...userData,
          fcmTokens: [token],
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error storing FCM token:", error);
    }
  }, [firestore]);

  useEffect(() => {
    if (globalAuthInitialized) {
      setLoading(false);
      return;
    }

    globalAuthInitialized = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      initialUser = user;
      setUser(user);
      
      if (user) {
        const token = await notificationService.requestPermissionAndGetToken();
        await updateUserFcmToken(user, token);
      } else {
        notificationService.clearCachedToken();
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [auth, updateUserFcmToken]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const existingToken = notificationService.getCurrentToken();
      const token = existingToken || await notificationService.requestPermissionAndGetToken();
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
  }, [auth, updateUserFcmToken]);

  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      setError(null);
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, {
        displayName: fullName,
      });

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
  }, [auth, updateUserFcmToken]);

  const logoutAndCleanup = useCallback(async () => {
    try {
      notificationService.clearCachedToken();
      await signOut(auth);
      return true;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, [auth]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, [auth]);

  const authValue = useMemo(() => ({
    user,
    loading,
    error,
    login,
    signup,
    logout: logoutAndCleanup,
    resetPassword,
  }), [user, loading, error, login, signup, logoutAndCleanup, resetPassword]);

  return authValue;
};
