// pages/api/check-admin.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '../../lib/firebaseAdmin'; // ✅ Make sure this path is correct

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const authHeader = req.headers.authorization;
        const token = authHeader?.split('Bearer ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Missing token' });
        }

        const decodedToken = await getAuth(adminApp).verifyIdToken(token);
        const email = decodedToken.email;

        if (!email) {
            return res.status(400).json({ error: 'Invalid token — no email' });
        }

        const db = getFirestore(adminApp);
        const adminSnap = await db.collection('admin').where('email', '==', email).get();

        return res.status(200).json({ isAdmin: !adminSnap.empty });
    } catch (err: any) {

        console.error('🔥 Error in check-admin API:', JSON.stringify(err, null, 2));

        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
}
