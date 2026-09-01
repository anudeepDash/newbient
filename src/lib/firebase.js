import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

// Validated Config from Environment
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app = null;
try {
    app = initializeApp(firebaseConfig);
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

// Initialize Cloud Firestore and get a reference to the service
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;
const auth = app ? getAuth(app) : null;

const googleProvider = new GoogleAuthProvider();

// Safely obtain messaging instance without crashing on Safari/WebKit/Private Browsing
let messaging = null;

if (typeof window !== 'undefined' && app) {
    try {
        isSupported().then(supported => {
            if (supported && app) {
                try {
                    messaging = getMessaging(app);
                } catch (e) {
                    console.warn("[Firebase] Messaging get error:", e);
                }
            }
        }).catch(err => {
            console.warn("[Firebase] Messaging not supported on this browser:", err);
        });
    } catch (e) {
        console.warn("[Firebase] Messaging initialization error:", e);
    }
}

export const getMessagingSafe = async () => {
    if (typeof window === 'undefined' || !app) return null;
    try {
        const supported = await isSupported().catch(() => false);
        if (!supported) return null;
        if (!messaging) {
            messaging = getMessaging(app);
        }
        return messaging;
    } catch (e) {
        console.warn("[Firebase] Messaging unavailable:", e);
        return null;
    }
};

export { app, db, storage, auth, googleProvider, messaging };

