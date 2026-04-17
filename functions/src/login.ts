import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import corsLib from 'cors';

admin.initializeApp();
const db = admin.firestore();
const cors = corsLib({ origin: true }); // allow all origins or specify

export const checkAdmin = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        const token = req.headers.authorization?.split('Bearer ')[1];

        if (!token) {
            return res.status(403).send('Unauthorized');
        }

        try {
            const decoded = await admin.auth().verifyIdToken(token);
            const email = decoded.email;

            // 🔍 Check if email exists in 'admin' collection
            const adminSnap = await db
                .collection('admin')
                .where('email', '==', email)
                .get();

            const isAdmin = !adminSnap.empty;

            // ✅ SEND RESPONSE WITH STATUS
            return res.status(200).json({ isAdmin });
        } catch (error) {
            console.error(error);
            return res.status(403).send('Invalid token');
        }
    });
});
