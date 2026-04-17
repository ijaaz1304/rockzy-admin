// lib/serverFirestore.ts
import { adminApp } from './firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

export const serverDb = getFirestore(adminApp);
