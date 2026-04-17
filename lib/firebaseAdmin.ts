// lib/firebaseAdmin.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';

const adminApp = !getApps().length
    ? initializeApp(
        process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
            ? {
                  credential: cert({
                      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                  }),
              }
            : {
                  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
              }
    )
    : getApps()[0];

export { adminApp };
