// lib/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const requiredClientFirebaseEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

const missingClientFirebaseEnvVars = requiredClientFirebaseEnvVars.filter(
  (key) => !process.env[key]
);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const isBrowser = typeof window !== 'undefined';
const hasClientFirebaseConfig = missingClientFirebaseEnvVars.length === 0;

// Avoid initializing Firebase client SDK when env vars are missing.
const app = isBrowser && hasClientFirebaseConfig
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : (null as any);

// Avoid initializing browser SDK services during SSR/build-time evaluation.
const db = app ? getFirestore(app) : (null as any);
const auth = app ? getAuth(app) : (null as any);
const functions = app ? getFunctions(app, 'asia-east1') : (null as any);
const storage = app ? getStorage(app) : (null as any);

export { app, db, auth, functions, storage }; // ✅ named exports
export { hasClientFirebaseConfig, missingClientFirebaseEnvVars };
export default db; // ✅ default export for dynamic import
