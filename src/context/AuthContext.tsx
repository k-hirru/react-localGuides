import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<FirebaseAuthTypes.User>;
  signup: (email: string, password: string, fullName: string) => Promise<FirebaseAuthTypes.User>;
  logout: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  role: 'user' | 'admin';
  isAdmin: boolean;
  profileName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
