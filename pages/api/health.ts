import type { NextApiRequest, NextApiResponse } from 'next';
import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '../../lib/firebaseAdmin';

type HealthResponse = {
  ok: boolean;
  adminInitialized: boolean;
  firestoreReachable: boolean;
  projectId: string | null;
  timestamp: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      adminInitialized: getApps().length > 0,
      firestoreReachable: false,
      projectId: process.env.FIREBASE_PROJECT_ID ?? null,
      timestamp: new Date().toISOString(),
      error: 'Method not allowed',
    });
  }

  try {
    const db = getFirestore(adminApp);
    await db.collection('_health').doc('ping').get();

    return res.status(200).json({
      ok: true,
      adminInitialized: getApps().length > 0,
      firestoreReachable: true,
      projectId: process.env.FIREBASE_PROJECT_ID ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed while validating Firebase Admin.', error);

    return res.status(500).json({
      ok: false,
      adminInitialized: getApps().length > 0,
      firestoreReachable: false,
      projectId: process.env.FIREBASE_PROJECT_ID ?? null,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown health-check error',
    });
  }
}
