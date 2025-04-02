import { useEffect, useState } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { AppState } from '../types';

export function useFirestore() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial data when user logs in
  useEffect(() => {
    if (!currentUser) {
      console.log('No current user, skipping Firestore initialization');
      return;
    }

    const userDoc = doc(db, 'users', currentUser.uid);
    console.log('Setting up Firestore listener for user:', currentUser.uid);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(userDoc, 
      (doc) => {
        if (doc.exists()) {
          console.log('Loading user data from Firestore:', doc.data());
          const userData = doc.data() as AppState;
          setData(userData);
          setError(null);
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
          setDoc(userDoc, defaultState)
            .then(() => {
              console.log('Default state initialized in Firestore');
              setData(defaultState);
              setError(null);
            })
            .catch((error) => {
              console.error('Error initializing default state:', error);
              setError('Failed to initialize data');
            });
        }
      },
      (error) => {
        console.error('Error loading user data:', error);
        setError('Failed to load data');
      }
    );

    return () => {
      console.log('Cleaning up Firestore listener');
      unsubscribe();
    };
  }, [currentUser]);

  const updateData = async (newData: AppState) => {
    if (!currentUser) {
      console.log('No current user, skipping Firestore update');
      return;
    }

    try {
      console.log('Attempting to save data to Firestore:', newData);
      const userDoc = doc(db, 'users', currentUser.uid);
      await setDoc(userDoc, newData);
      console.log('Data successfully saved to Firestore');
      setError(null);
    } catch (error) {
      console.error('Error saving data to Firestore:', error);
      setError('Failed to save data');
      throw error; // Re-throw to allow components to handle the error
    }
  };

  return { data, updateData, error };
} 