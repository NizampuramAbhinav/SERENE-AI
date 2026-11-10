// frontend/src/config/firebase.js
// Firebase Web SDK v9 modular initialisation with graceful fallback.
// All config values are read from Vite environment variables (VITE_* prefix).

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

export const isFirebaseConfigured = Boolean(
  apiKey &&
  apiKey !== 'your-firebase-web-api-key' &&
  !apiKey.startsWith('your-')
);

const firebaseConfig = {
  apiKey: isFirebaseConfigured ? apiKey : 'AIzaSyDummyKeyForDevelopmentMode12345',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'serene-ai-demo.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://serene-ai-demo-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'serene-ai-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'serene-ai-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
};

let app = null;
let auth = null;
let db = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getDatabase(app);
} catch (err) {
  console.warn('[Firebase Client] Initialized in fallback mode:', err.message);
}

export { auth, db };
export default app;
