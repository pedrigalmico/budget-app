import { useEffect, useState, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { AppState } from '../types';

export function useFirestore() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastUpdate = useRef<string>('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load initial data and subscribe to updates
  useEffect(() => {
    if (!currentUser) {
      console.log('No current user, skipping Firestore initialization');
      return;
    }

    const userDoc = doc(db, 'users', currentUser.uid);
    
    // Subscribe to real-time updates with optimized handling
    const unsubscribe = onSnapshot(
      userDoc,
      { includeMetadataChanges: false }, // Only listen for remote changes
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data() as AppState;
          const dataString = JSON.stringify(userData);
          
          // Only update if data has actually changed
          if (dataString !== lastUpdate.current) {
            console.log('Received new data from Firestore');
            setData(userData);
            lastUpdate.current = dataString;
          }
        } else {
          console.log('Initializing with default state');
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
              setData(defaultState);
              lastUpdate.current = JSON.stringify(defaultState);
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
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      unsubscribe();
    };
  }, [currentUser]);

  const cleanUndefinedValues = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(cleanUndefinedValues).filter(item => item !== undefined);
    }

    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = cleanUndefinedValues(obj[key]);
        if (value !== undefined) {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  };

  const updateData = async (newData: AppState) => {
    if (!currentUser) {
      console.log('No current user, skipping Firestore update');
      return;
    }

    const cleanedData = cleanUndefinedValues(newData);
    const dataString = JSON.stringify(cleanedData);
    
    // Only update if data has actually changed
    if (dataString === lastUpdate.current) {
      console.log('Data unchanged, skipping Firestore update');
      return;
    }

    // Clear any existing timeout
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the write operation
    debounceTimer.current = setTimeout(async () => {
      try {
        const userDoc = doc(db, 'users', currentUser.uid);
        await setDoc(userDoc, cleanedData);
        lastUpdate.current = dataString;
        console.log('Data saved to Firestore');
        setError(null);
      } catch (error) {
        console.error('Error saving data:', error);
        setError('Failed to save data');
        throw error;
      }
    }, 2000); // Debounce for 2 seconds
  };

  return { data, updateData, error };
} 