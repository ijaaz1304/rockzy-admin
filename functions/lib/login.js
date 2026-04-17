"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAdmin = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
admin.initializeApp();
const db = admin.firestore();
const cors = (0, cors_1.default)({ origin: true }); // allow all origins or specify
exports.checkAdmin = functions.https.onRequest((req, res) => {
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
        }
        catch (error) {
            console.error(error);
            return res.status(403).send('Invalid token');
        }
    });
});
