import { useEffect, useState, useRef } from 'react';
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { AppState, InvestmentLot, LegacyInvestment } from '../types';

// Stored records may be legacy, partially migrated, or fully migrated
type StoredInvestment = Partial<InvestmentLot> & Partial<LegacyInvestment> & { id: string };

/**
 * Migrate legacy flat Investment records to the new InvestmentLot format.
 * Detects old format by checking for 'amount' without 'positionKey'.
 * One-time, non-destructive — old data is converted, not deleted.
 */
function migrateInvestments(data: DocumentData): DocumentData {
  const investments = (data.investments ?? []) as StoredInvestment[];
  if (investments.length === 0) return data;

  // Check if any investment needs migration (legacy or partially migrated)
  const needsMigration = investments.some(
    (inv) =>
      (inv.positionKey === undefined && inv.amount !== undefined) ||
      (inv.quantity === undefined || inv.pricePerUnit === undefined)
  );

  if (!needsMigration) return data;

  const migratedInvestments = investments.map((inv) => {
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
    } satisfies InvestmentLot;
  });

  return {
    ...data,
    investments: migratedInvestments,
  };
}

const MAX_BACKUPS = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const countRecords = (d: AppState) =>
  (d.expenses?.length || 0) +
  (d.incomes?.length || 0) +
  (d.investments?.length || 0) +
  (d.goals?.length || 0);

export function useFirestore() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastUpdate = useRef<string>('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  // True only once the SERVER (not the local cache) has told us what exists.
  const hasServerData = useRef(false);
  // Last state the server confirmed — what is worth snapshotting before we
  // replace it.
  const lastServerState = useRef<AppState | null>(null);
  const lastBackupAt = useRef(0);

  // Load initial data and subscribe to updates
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    hasServerData.current = false;
    const userDoc = doc(db, 'users', currentUser.uid);

    // Subscribe to real-time updates with optimized handling
    const unsubscribe = onSnapshot(
      userDoc,
      { includeMetadataChanges: true }, // needed to tell cache from server
      (snap) => {
        // Firestore answers listeners from the local cache first. A cache that
        // has not seen this document yet reports exists() === false even though
        // it exists on the server — true on a fresh browser, a cleared profile,
        // or any offline first load. Treating that as "new user" and writing
        // defaults wipes live data once the queued write flushes. Only ever act
        // on snapshots the server actually confirmed.
        if (snap.metadata.fromCache) return;

        if (snap.exists()) {
          const rawData = snap.data();
          // Run migration on load to convert legacy investments
          const userData = migrateInvestments(rawData) as AppState;
          const dataString = JSON.stringify(userData);
          hasServerData.current = true;
          lastServerState.current = userData;

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
              hasServerData.current = true;
              lastServerState.current = defaultState;
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

  const cleanUndefinedValues = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(cleanUndefinedValues).filter(item => item !== undefined);
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanUndefinedValues(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  };

  /**
   * Snapshot the last server-confirmed state into users/{uid}/backups before it
   * gets replaced. Keeps the most recent MAX_BACKUPS and prunes the rest.
   */
  const writeBackup = async (uid: string, state: AppState, reason: string) => {
    try {
      const id = new Date().toISOString().replace(/[:.]/g, '-');
      await setDoc(doc(db, 'users', uid, 'backups', id), {
        savedAt: new Date().toISOString(),
        reason,
        records: countRecords(state),
        data: state,
      });
      lastBackupAt.current = Date.now();

      const existing = await getDocs(
        query(collection(db, 'users', uid, 'backups'), orderBy('savedAt', 'desc'))
      );
      await Promise.all(existing.docs.slice(MAX_BACKUPS).map((d) => deleteDoc(d.ref)));
    } catch (err) {
      console.error('[useFirestore] backup failed', err);
    }
  };

  const updateData = async (newData: AppState) => {
    if (!currentUser) {
      return;
    }

    // Never write over a document we have not read from the server yet.
    if (!hasServerData.current) {
      console.warn('[useFirestore] write blocked: server data not loaded yet');
      return;
    }

    const cleanedData = cleanUndefinedValues(newData) as AppState;
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
        if (!hasServerData.current) {
          console.warn('[useFirestore] flush blocked: server data not loaded');
          return;
        }

        const prev = lastServerState.current;
        if (prev) {
          const before = countRecords(prev);
          const after = countRecords(cleanedData);
          const destructive = before > 0 && after < before * 0.8;
          const stale = Date.now() - lastBackupAt.current > DAY_MS;
          if (destructive) {
            console.warn(`[useFirestore] large drop: ${before} -> ${after} records`);
          }
          if (destructive || stale) {
            await writeBackup(
              currentUser.uid,
              prev,
              destructive ? `pre-destructive-write (${before} -> ${after})` : 'daily'
            );
          }
        }

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
