import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA5lK4G2ECJBGvz-2AouChWWtLV0CUM25w",
  authDomain: "budgeting-app-221d6.firebaseapp.com",
  projectId: "budgeting-app-221d6",
  storageBucket: "budgeting-app-221d6.appspot.com",
  messagingSenderId: "945907506906",
  appId: "1:945907506906:web:c8e8db1f1e7af8c817cfe3",
  measurementId: "G-J20ZY6D5BF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persistent IndexedDB cache rather than the default memory-only cache, so the
// app keeps a real local copy and genuinely works offline. With memory-only
// caching every reload started empty, which is what let an offline load look
// like "this user has no data".
let firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (err) {
  // Private windows and restricted profiles can block IndexedDB. Fall back to
  // the default in-memory cache rather than failing to start.
  console.warn('[firebase] persistent cache unavailable, using memory cache', err);
  firestore = getFirestore(app);
}
export const db = firestore;

// Development builds talk to the local emulators and CANNOT reach production
// data. Set VITE_USE_EMULATORS=false in .env.local to override deliberately.
export const usingEmulators =
  import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS !== 'false';

if (usingEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.info('[firebase] local emulators — production data is NOT reachable');
}

let analytics = null;
if (typeof window !== 'undefined' && !usingEmulators) {
  analytics = getAnalytics(app);
}

export { analytics };
