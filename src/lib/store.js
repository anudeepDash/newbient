import { create } from 'zustand';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';

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

                // Sort by 'order' field if available (ascending)
                if (colName === 'portfolio') {
                    data.sort((a, b) => (a.order || 0) - (b.order || 0));
                }

                console.log(`Updated ${stateKey}:`, data.length);
                set({ [stateKey]: data });

                // Specific fix for loading state: 
                // We consider the app "loaded" once the critical data (invoices) arrives.
                if (stateKey === 'invoices') {
                    set({ loading: false });
                }
            }, (error) => {
                console.error(`Error fetching ${stateKey}:`, error);
                // Even on error, stop loading so we don't hang
                if (stateKey === 'invoices') set({ loading: false });
            });
        };

        const unsub1 = sub('announcements', 'announcements');
        const unsub2 = sub('concerts', 'concerts');
        const unsub3 = sub('portfolio', 'portfolio');
        const unsub4 = sub('invoices', 'invoices');
        const unsub5 = sub('forms', 'forms');
        const unsub6 = sub('gallery', 'galleryImages');

        // Site details is a single doc usually, but for simplicity treating as collection or skipping for now.
        // For this version, let's keep siteDetails local or fetch if needed. 


        return () => {
            unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6();
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
        // Assign a default order if not present (put at end)
        const currentItems = get().portfolio;
        const maxOrder = currentItems.reduce((max, i) => Math.max(max, i.order || 0), 0);
        await addDoc(collection(db, 'portfolio'), { ...item, order: maxOrder + 1 });
    },
    updatePortfolioItem: async (id, updates) => {
        await updateDoc(doc(db, 'portfolio', id), updates);
    },
    deletePortfolioItem: async (id) => {
        await deleteDoc(doc(db, 'portfolio', id));
    },
    updatePortfolioOrder: async (items) => {
        // Batch update is ideal, but for simplicity/now just parallel updates
        // In a clearer implementation, we'd use a WriteBatch
        const updates = items.map((item, index) =>
            updateDoc(doc(db, 'portfolio', item.id), { order: index })
        );
        await Promise.all(updates);
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

    // Gallery (Moved to DB)
    addGalleryImage: async (image) => {
        await addDoc(collection(db, 'gallery'), image);
    },
    deleteGalleryImage: async (id) => {
        await deleteDoc(doc(db, 'gallery', id));
    },
    // Retired local actions (kept for API surface compatibility if needed, but implementation changed to warn or no-op if necessary, 
    // actually better to remove 'removeGalleryImage' to force usage of 'deleteGalleryImage' with ID)

    // Auth & Roles
    user: null, // { email, uid, role }

    checkUserRole: async (user) => {
        if (!user) {
            set({ user: null });
            return;
        }

        // Default role is 'viewer' until fetched
        let role = 'viewer';
        try {
            // Check 'admins' collection for this email
            // Doc ID should be the email for easy lookup, or query by field
            // Let's try direct doc lookup by email first (standardize lowercase)
            // If we used UID as doc ID, that's better, but email is easier for manual bootstrapping

            // Query by email field to be safe if Doc ID isn't strict
            const q = query(collection(db, 'admins'), where('email', '==', user.email));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const adminDoc = snapshot.docs[0].data();
                role = adminDoc.role || 'viewer';
            } else {
                console.warn("User logged in but not found in admins collection.");
            }
        } catch (error) {
            console.error("Error fetching role:", error);
        }

        set({
            user: {
                email: user.email,
                uid: user.uid,
                role: role
            }
        });
    },

    logout: async () => {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        await auth.signOut();
        set({ user: null });
    },

    // Local-only
    updateSiteDetails: (details) => set((state) => ({
        siteDetails: { ...state.siteDetails, ...details }
    })),
}));
