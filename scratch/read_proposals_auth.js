import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBnl7hSfXXUj4khyV3yrhT5oUtMQfdoH_A",
    authDomain: "newbi-ent-v2.firebaseapp.com",
    projectId: "newbi-ent-v2",
    storageBucket: "newbi-ent-v2.firebasestorage.app",
    messagingSenderId: "860370467784",
    appId: "1:860370467784:web:d7b4dfc66336f6da50defd"
};

async function run() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    try {
        console.log("Signing in as admin@newbi.live...");
        const userCredential = await signInWithEmailAndPassword(auth, "admin@newbi.live", "[REDACTED_PASSWORD]");
        console.log("Logged in successfully! User UID:", userCredential.user.uid);

        // Fetch proposals
        console.log("\nFetching proposals collection...");
        const proposalsSnap = await getDocs(collection(db, "proposals"));
        console.log("Proposals count in DB:", proposalsSnap.size);
        proposalsSnap.docs.forEach((doc, idx) => {
            const data = doc.data();
            console.log(`[Proposal ${idx+1}] ID: ${doc.id}`);
            console.log(`- clientName: ${data.clientName}`);
            console.log(`- proposalNumber: ${data.proposalNumber}`);
            console.log(`- createdBy: ${data.createdBy}`);
            console.log(`- status: ${data.status}`);
        });

        // Fetch agreements
        console.log("\nFetching agreements (contracts) collection...");
        const agreementsSnap = await getDocs(collection(db, "agreements"));
        console.log("Agreements count in DB:", agreementsSnap.size);
        agreementsSnap.docs.forEach((doc, idx) => {
            const data = doc.data();
            console.log(`[Agreement ${idx+1}] ID: ${doc.id}`);
            console.log(`- secondParty: ${data.parties?.secondParty?.name}`);
            console.log(`- projectName: ${data.details?.projectName}`);
            console.log(`- createdBy: ${data.createdBy}`);
            console.log(`- status: ${data.status}`);
        });

    } catch (e) {
        console.error("Error occurred:", e);
    }
    process.exit(0);
}

run();
