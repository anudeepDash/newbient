import { create } from 'zustand';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

export const useStore = create((set, get) => ({
    announcements: [],
    concerts: [],
    portfolio: [],
    invoices: [],
    forms: [], // Forms config
    galleryImages: [],
    siteDetails: {
        phone: '+91 93043 72773',
        email: 'partnership@newbi.live',
        instagram: 'https://www.instagram.com/newbi_ent',
        linkedin: 'https://www.linkedin.com/company/newbi-ent/',
        whatsapp: 'https://wa.me/919304372773',
        description: "India's premier entertainment company."
    },
    loading: true,

    // Real-time Subscription Init
    subscribeToData: () => {
        console.log("Initializing Firebase Subscriptions...");

        // Helper for collections
        const sub = (colName, stateKey) => {
            const q = query(collection(db, colName));
            return onSnapshot(q, (snapshot) => {
                // Fix: Ensure Firestore Document ID overwrites any "id" field inside the data
                const data = snapshot.docs.map(doc => {
                    const d = doc.data();
                    return { ...d, id: doc.id };
                });
                console.log(`Updated ${stateKey}:`, data.length);
                set({ [stateKey]: data });
            }, (error) => {
                console.error(`Error fetching ${stateKey}:`, error);
            });
        };

        const unsub1 = sub('announcements', 'announcements');
        const unsub2 = sub('concerts', 'concerts');
        const unsub3 = sub('portfolio', 'portfolio');
        const unsub4 = sub('invoices', 'invoices');
        const unsub5 = sub('forms', 'forms');

        // Site details is a single doc usually, but for simplicity treating as collection or skipping for now.
        // For this version, let's keep siteDetails local or fetch if needed. 
        // We'll mark loading false after listeners attach
        set({ loading: false });

        return () => {
            unsub1(); unsub2(); unsub3(); unsub4(); unsub5();
        };
    },

    // --- Actions (Write to DB) ---

    // Announcements
    addAnnouncement: async (announcement) => {
        await addDoc(collection(db, 'announcements'), announcement);
    },
    togglePinAnnouncement: async (id) => {
        const item = get().announcements.find(a => a.id === id);
        if (item) await updateDoc(doc(db, 'announcements', id), { isPinned: !item.isPinned });
    },
    deleteAnnouncement: async (id) => {
        await deleteDoc(doc(db, 'announcements', id));
    },

    // Concerts
    addConcert: async (concert) => {
        await addDoc(collection(db, 'concerts'), concert);
    },
    updateConcert: async (id, updates) => {
        await updateDoc(doc(db, 'concerts', id), updates);
    },
    deleteConcert: async (id) => {
        await deleteDoc(doc(db, 'concerts', id));
    },

    // Portfolio
    addPortfolioItem: async (item) => {
        await addDoc(collection(db, 'portfolio'), item);
    },
    updatePortfolioItem: async (id, updates) => {
        await updateDoc(doc(db, 'portfolio', id), updates);
    },
    deletePortfolioItem: async (id) => {
        await deleteDoc(doc(db, 'portfolio', id));
    },

    // Invoices
    addInvoice: async (invoice) => {
        return await addDoc(collection(db, 'invoices'), invoice);
    },
    updateInvoiceStatus: async (id, status) => {
        await updateDoc(doc(db, 'invoices', id), { status });
    },
    deleteInvoice: async (id) => {
        await deleteDoc(doc(db, 'invoices', id));
    },

    // Forms
    addForm: async (form) => {
        await addDoc(collection(db, 'forms'), form);
    },
    updateForm: async (id, updates) => {
        await updateDoc(doc(db, 'forms', id), updates);
    },
    deleteForm: async (id) => {
        await deleteDoc(doc(db, 'forms', id));
    },

    // Local-only for now (or move to DB later)
    updateSiteDetails: (details) => set((state) => ({
        siteDetails: { ...state.siteDetails, ...details }
    })),
    addGalleryImage: (image) => set((state) => ({
        galleryImages: [image, ...state.galleryImages]
    })),
    removeGalleryImage: (index) => set((state) => ({
        galleryImages: state.galleryImages.filter((_, i) => i !== index)
    })),
}));
