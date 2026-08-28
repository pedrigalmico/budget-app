import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  UserCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  linkGoogle: () => Promise<UserCredential>;
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
      return await createUserWithEmailAndPassword(auth, email, password);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<UserCredential> {
    try {
      setLoading(true);
      return await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Sign in with Google. Only safe once the Google credential has been LINKED
   * to the existing account — a cold Google sign-in mints a new UID, and every
   * document is keyed by UID.
   */
  async function loginWithGoogle(): Promise<UserCredential> {
    try {
      setLoading(true);
      return await signInWithPopup(auth, new GoogleAuthProvider());
    } finally {
      setLoading(false);
    }
  }

  /**
   * Attach a Google credential to the account that is ALREADY signed in. This
   * cannot change the UID, because it adds a provider to the current user
   * rather than creating an account.
   */
  async function linkGoogle(): Promise<UserCredential> {
    if (!auth.currentUser) throw new Error('Must be signed in to link an account');
    return await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
  }

  async function logout(): Promise<void> {
    try {
      setLoading(true);
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  }

  const value = {
    currentUser,
    loading,
    signup,
    login,
    loginWithGoogle,
    linkGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
