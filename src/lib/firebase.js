import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Validated Config from User
const firebaseConfig = {
    apiKey: "AIzaSyBnl7hSfXXUj4khyV3yrhT5oUtMQfdoH_A",
    authDomain: "newbi-ent-v2.firebaseapp.com",
    projectId: "newbi-ent-v2",
    storageBucket: "newbi-ent-v2.firebasestorage.app",
    messagingSenderId: "860370467784",
    appId: "1:860370467784:web:d7b4dfc66336f6da50defd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export { db, storage, auth, googleProvider };
