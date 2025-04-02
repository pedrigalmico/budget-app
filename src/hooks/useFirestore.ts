import { useEffect, useState } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { AppState } from '../types';

export function useFirestore() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<AppState | null>(null);

  // Load initial data when user logs in
  useEffect(() => {
    if (!currentUser) return;

    const userDoc = doc(db, 'users', currentUser.uid);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(userDoc, (doc) => {
      if (doc.exists()) {
        console.log('Loading user data from Firestore');
        const userData = doc.data() as AppState;
        setData(userData);
      } else {
        console.log('No existing data found, initializing with default state');
        const defaultState: AppState = {
          expenses: [],
          goals: [],
          investments: [],
          incomes: [],
          settings: {
            monthlyIncome: 0,
            currency: 'SAR',
            darkMode: false,
            customCategories: []
          }
        };
        setDoc(userDoc, defaultState);
        setData(defaultState);
      }
    }, (error) => {
      console.error('Error loading user data:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const updateData = async (newData: AppState) => {
    if (!currentUser) return;

    try {
      const userDoc = doc(db, 'users', currentUser.uid);
      await setDoc(userDoc, newData);
      console.log('Data saved to Firestore');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  return { data, updateData };
} 