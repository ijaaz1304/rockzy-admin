import type { NextApiRequest } from 'next';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { adminApp } from './firebaseAdmin';

type AdminContext = {
  db: Firestore;
  uid: string;
  email: string;
};

type AdminFailure = {
  status: number;
  error: string;
};

export async function requireAdmin(
  req: NextApiRequest
): Promise<AdminContext | AdminFailure> {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return { status: 401, error: 'Missing token' };
  }

  const decoded = await getAuth(adminApp).verifyIdToken(token);
  if (!decoded.email) {
    return { status: 401, error: 'Invalid token' };
  }

  const db = getFirestore(adminApp);
  const adminSnap = await db.collection('admin').where('email', '==', decoded.email).get();
  if (adminSnap.empty) {
    return { status: 403, error: 'Not an admin' };
  }

  return { db, uid: decoded.uid, email: decoded.email };
}

export function isAdminFailure(
  result: AdminContext | AdminFailure
): result is AdminFailure {
  return 'status' in result;
}
