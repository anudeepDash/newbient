import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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

// Messaging is loaded on demand (only when notifications are used), keeping it off first load.
let messaging = null;

export const getMessagingSafe = async () => {
    if (typeof window === 'undefined' || !app) return null;
    try {
        const { getMessaging, isSupported } = await import('firebase/messaging');
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

export { app, db, storage, auth, googleProvider };

