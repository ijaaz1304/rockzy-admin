import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';

const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
] as const;

function getMissingVars(): string[] {
  return requiredEnvVars.filter((name) => !process.env[name]);
}

function getAdminConfig() {
  const missingVars = getMissingVars();
  if (missingVars.length > 0) {
    throw new Error(
      `Missing Firebase Admin environment variables: ${missingVars.join(', ')}`
    );
  }

  return {
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // App Hosting stores multiline secrets as escaped newlines.
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID!,
  };
}

let adminApp: App;

try {
  adminApp = getApps().length ? getApps()[0]! : initializeApp(getAdminConfig());
} catch (error) {
  console.error(
    'Firebase Admin initialization failed. Verify FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set correctly.',
    error
  );
  throw error;
}

export { adminApp };
