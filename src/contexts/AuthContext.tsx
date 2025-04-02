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
    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, user => {
      console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'No user');
      setCurrentUser(user);
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  async function signup(email: string, password: string): Promise<UserCredential> {
    console.log('Attempting to sign up user:', email);
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Sign up successful:', userCredential.user.email);
      return userCredential;
    } catch (error: any) {
      console.error('Sign up error in AuthContext:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<UserCredential> {
    console.log('Attempting to log in user:', email);
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', userCredential.user.email);
      return userCredential;
    } catch (error: any) {
      console.error('Login error in AuthContext:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    console.log('Attempting to log out user');
    try {
      setLoading(true);
      await signOut(auth);
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Logout error in AuthContext:', error);
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

  console.log('AuthContext current state:', { currentUser: currentUser?.email, loading });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 