// lib/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredClientFirebaseConfigEntries: Array<[string, string | undefined]> = [
  ['NEXT_PUBLIC_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['NEXT_PUBLIC_FIREBASE_APP_ID', firebaseConfig.appId],
];

const missingClientFirebaseEnvVars = requiredClientFirebaseConfigEntries
  .filter(([, value]) => !value)
  .map(([name]) => name);

const isBrowser = typeof window !== 'undefined';
const hasClientFirebaseConfig = missingClientFirebaseEnvVars.length === 0;

// Avoid initializing Firebase client SDK when env vars are missing.
const app = isBrowser && hasClientFirebaseConfig
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : (null as any);

const auth = app ? getAuth(app) : (null as any);

export { app, auth };
export { hasClientFirebaseConfig, missingClientFirebaseEnvVars };
