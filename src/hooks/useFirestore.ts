import { useEffect, useState, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { AppState } from '../types';

/**
 * Migrate legacy flat Investment records to the new InvestmentLot format.
 * Detects old format by checking for 'amount' without 'positionKey'.
 * One-time, non-destructive — old data is converted, not deleted.
 */
function migrateInvestments(data: any): any {
  if (!data.investments || data.investments.length === 0) return data;

  // Check if any investment needs migration (legacy or partially migrated)
  const needsMigration = data.investments.some(
    (inv: any) =>
      (inv.positionKey === undefined && inv.amount !== undefined) ||
      (inv.quantity === undefined || inv.pricePerUnit === undefined)
  );

  if (!needsMigration) return data;

  const migratedInvestments = data.investments.map((inv: any) => {
    // Fully migrated lot — has all required numeric fields
    if (
      inv.positionKey !== undefined &&
      typeof inv.quantity === 'number' && !isNaN(inv.quantity) &&
      typeof inv.pricePerUnit === 'number' && !isNaN(inv.pricePerUnit)
    ) {
      return inv;
    }

    // Legacy or partially migrated — fill in missing fields
    return {
      id: inv.id,
      positionKey: inv.positionKey || (inv.name || inv.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: inv.name || 'Unknown Investment',
      ticker: inv.ticker,
      category: inv.category || 'Other',
      quantity: Number(inv.quantity) || 1,
      pricePerUnit: Number(inv.pricePerUnit) || Number(inv.amount) || 0,
      unitType: inv.unitType || 'units',
      date: inv.date || new Date().toISOString(),
      notes: inv.notes,
      manualCurrentValue: inv.manualCurrentValue ?? inv.currentValue,
      useManualValuation: (inv.manualCurrentValue ?? inv.currentValue) !== undefined ? true : undefined,
    };
  });

  return {
    ...data,
    investments: migratedInvestments,
  };
}

export function useFirestore() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastUpdate = useRef<string>('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load initial data and subscribe to updates
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const userDoc = doc(db, 'users', currentUser.uid);

    // Subscribe to real-time updates with optimized handling
    const unsubscribe = onSnapshot(
      userDoc,
      { includeMetadataChanges: false }, // Only listen for remote changes
      (doc) => {
        if (doc.exists()) {
          const rawData = doc.data();
          // Run migration on load to convert legacy investments
          const userData = migrateInvestments(rawData) as AppState;
          const dataString = JSON.stringify(userData);

          // Only update if data has actually changed
          if (dataString !== lastUpdate.current) {
            setData(userData);
            lastUpdate.current = dataString;
          }
        } else {
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
      return;
    }

    const cleanedData = cleanUndefinedValues(newData);
    const dataString = JSON.stringify(cleanedData);

    // Only update if data has actually changed
    if (dataString === lastUpdate.current) {
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
