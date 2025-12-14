import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Validated Config from User
const firebaseConfig = {
    apiKey: "AIzaSyCkUE7AGHTTxLZfNexcUN8mLG48y2ZVauY",
    authDomain: "newbi-ent.firebaseapp.com",
    projectId: "newbi-ent",
    storageBucket: "newbi-ent.firebasestorage.app",
    messagingSenderId: "598546904200",
    appId: "1:598546904200:web:3db054f2b539d1adc5db3d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
