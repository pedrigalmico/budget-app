import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  UserCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function signup(email: string, password: string): Promise<UserCredential> {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<UserCredential> {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    try {
      setLoading(true);
      await signOut(auth);
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
