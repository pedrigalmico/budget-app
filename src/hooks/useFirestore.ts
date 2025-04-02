import { useEffect } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAppState } from './useAppState';
import type { AppState } from '../types';

export function useFirestore() {
  const { currentUser } = useAuth();
  const { state, setState } = useAppState();

  // Load initial data when user logs in
  useEffect(() => {
    if (!currentUser) return;

    const userDoc = doc(db, 'users', currentUser.uid);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(userDoc, (doc) => {
      if (doc.exists()) {
        console.log('Loading user data from Firestore');
        const data = doc.data() as AppState;
        setState(data);
      } else {
        console.log('No existing data found, initializing with current state');
        // Initialize with current state if no data exists
        setDoc(userDoc, state);
      }
    }, (error) => {
      console.error('Error loading user data:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Save data whenever state changes
  useEffect(() => {
    if (!currentUser) return;

    const saveData = async () => {
      try {
        const userDoc = doc(db, 'users', currentUser.uid);
        await setDoc(userDoc, state);
        console.log('Data saved to Firestore');
      } catch (error) {
        console.error('Error saving data:', error);
      }
    };

    saveData();
  }, [state, currentUser]);

  return null;
} 