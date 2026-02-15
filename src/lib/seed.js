import { db } from './firebase';
import { collection, addDoc, writeBatch, doc, setDoc } from 'firebase/firestore';

const initialConcerts = [
    {
        id: "1",
        name: "Electric Dreams",
        date: "2025-04-10",
        venue: "Cyber Arena",
        price: 150,
        image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=2070&auto=format&fit=crop",
        category: "Electronic"
    },
    {
        id: "2",
        name: "Rock Revolution",
        date: "2025-05-20",
        venue: "The Stadium",
        price: 120,
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=2070&auto=format&fit=crop",
        category: "Rock"
    },
    {
        id: "3",
        name: "Jazz & Juice",
        date: "2025-04-25",
        venue: "Blue Note Hall",
        price: 80,
        image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=2070&auto=format&fit=crop",
        category: "Jazz"
    },
    {
        id: "4",
        name: "Pop Explosion",
        date: "2025-07-15",
        venue: "City Park",
        price: 100,
        image: "https://images.unsplash.com/photo-1459749411177-287ce5dec183?q=80&w=2070&auto=format&fit=crop",
        category: "Pop"
    }
];

const initialPortfolio = [
    { id: 'm1', category: 'music', title: "Arijit Singh", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14" },
    { id: 'm2', category: 'music', title: "Marshmello", image: "https://images.unsplash.com/photo-1506157786151-b8491531f063" },
    { id: 'f1', category: 'fests', title: "Kingfisher OctoBeerfest", image: "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9" },
    { id: 'c1', category: 'comedy', title: "Anubhav Singh Bassi", image: "https://images.unsplash.com/photo-1585672629633-84f55dbd7c0f" }
];

const initialCategories = [
    { id: 'music', label: 'Music Concerts', order: 1 },
    { id: 'fests', label: 'Fests & IPs', order: 2 },
    { id: 'comedy', label: 'Stand-Up Shows', order: 3 }
];

const initialInvoices = [
    {
        clientName: "Acme Corp",
        email: "client@example.com",
        currency: "USD",
        amount: 5000,
        status: "Pending",
        dueDate: "2025-12-01",
        items: [
            { description: "Event Planning Services", quantity: 1, price: 2000 },
            { description: "Venue Rental", quantity: 1, price: 3000 }
        ]
    }
];

export const seedDatabase = async () => {
    try {
        console.log("Seeding started...");

        // Use batch not supported for auto-ids in simple way without refs, 
        // so we'll just loop await for simplicity.

        for (const item of initialConcerts) {
            await addDoc(collection(db, 'concerts'), item);
        }

        for (const item of initialPortfolio) {
            await addDoc(collection(db, 'portfolio'), item);
        }

        for (const item of initialInvoices) {
            await addDoc(collection(db, 'invoices'), item);
        }

        for (const item of initialCategories) {
            await setDoc(doc(db, 'portfolio_categories', item.id), item);
        }

        console.log("Seeding complete!");
        alert("Database populated with default data!");
    } catch (error) {
        console.error("Error seeding database:", error);
        alert("Error seeding data. Check console.");
    }
};
