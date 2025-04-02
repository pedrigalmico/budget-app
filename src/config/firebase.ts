import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA5lK4G2ECJBGvz-2AouChWWtLV0CUM25w",
  authDomain: "budgeting-app-221d6.firebaseapp.com",
  projectId: "budgeting-app-221d6",
  storageBucket: "budgeting-app-221d6.appspot.com",
  messagingSenderId: "945907506906",
  appId: "1:945907506906:web:c8e8db1f1e7af8c817cfe3",
  measurementId: "G-J20ZY6D5BF"
};

console.log('Initializing Firebase with config:', firebaseConfig);
const app = initializeApp(firebaseConfig);
console.log('Firebase initialized successfully');

export const auth = getAuth(app);
console.log('Firebase Auth initialized');

export const db = getFirestore(app);
console.log('Firestore initialized');

let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
  console.log('Firebase Analytics initialized');
}

export { analytics };