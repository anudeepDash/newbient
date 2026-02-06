import { create } from 'zustand';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';

export const useStore = create((set, get) => ({
    announcements: [],
    concerts: [],
    portfolio: [],
    invoices: [],
    forms: [], // Forms config
    upcomingEvents: [],
    siteSettings: { showUpcomingEvents: true },
    siteDetails: { instagram: '#', linkedin: '#', whatsappCommunity: '', phone: '' },
    loading: true,

    // Real-time Subscription Init
    subscribeToData: () => {
        console.log("Initializing Firebase Subscriptions...");

        // Helper for collections
        const sub = (colName, stateKey) => {
            const q = query(collection(db, colName));
            return onSnapshot(q, (snapshot) => {
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

                if (stateKey === 'invoices') {
                    set({ loading: false });
                }
            }, (error) => {
                console.error(`Error fetching ${stateKey}:`, error);
                if (stateKey === 'invoices') set({ loading: false });
            });
        };

        const unsub1 = sub('announcements', 'announcements');
        const unsub2 = sub('concerts', 'concerts');
        const unsub3 = sub('portfolio', 'portfolio');
        const unsub4 = sub('invoices', 'invoices');
        const unsub5 = sub('forms', 'forms');
        const unsub6 = sub('gallery', 'galleryImages');
        const unsub7 = sub('volunteer_gigs', 'volunteerGigs');
        const unsub8 = sub('upcoming_events', 'upcomingEvents');

        // Site Settings Subscription (Single Doc)
        const unsub9 = onSnapshot(doc(db, 'site_settings', 'general'), (docSnap) => {
            if (docSnap.exists()) {
                set({ siteSettings: docSnap.data() });
            } else {
                // Initialize if missing
                console.log("Initializing site_settings/general");
                const initialSettings = { showUpcomingEvents: true };
                set({ siteSettings: initialSettings });
                // Create it strictly speaking we should setDoc here but let's avoid side effect in sub if possible, 
                // but for now relying on default state is fine, or we can lazy create on toggle.
            }
        }, (error) => console.error("Error fetching site settings:", error));


        return () => {
            unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); unsub9();
        };
    },

    // --- Actions (Write to DB) ---

    // Upcoming Events
    addUpcomingEvent: async (event, alsoAddToAnnouncements = false) => {
        const docRef = await addDoc(collection(db, 'upcoming_events'), event);

        if (alsoAddToAnnouncements) {
            await addDoc(collection(db, 'announcements'), {
                title: event.title || 'New Upcoming Event',
                content: event.description || `Check out our regular event on ${event.date}!`,
                date: event.date || new Date().toISOString().split('T')[0],
                image: event.image || '',
                isPinned: false,
                linkedEventId: docRef.id
            });
        }
    },
    updateUpcomingEvent: async (id, updates) => {
        await updateDoc(doc(db, 'upcoming_events', id), updates);
    },
    deleteUpcomingEvent: async (id) => {
        await deleteDoc(doc(db, 'upcoming_events', id));
    },

    // Site Settings
    toggleUpcomingSectionVisibility: async (currentValue) => {
        // Create if doesn't exist using setDoc with merge would be safer but updateDoc works if it exists.
        // Let's safe-guard with setDoc to ensure 'general' doc exists.
        const { setDoc } = await import('firebase/firestore'); // dynamic import or add to top imports
        await setDoc(doc(db, 'site_settings', 'general'), { showUpcomingEvents: !currentValue }, { merge: true });
    },

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

    // Volunteer Gigs
    addVolunteerGig: async (gig) => {
        await addDoc(collection(db, 'volunteer_gigs'), { ...gig, createdAt: new Date().toISOString() });
    },
    updateVolunteerGig: async (id, updates) => {
        await updateDoc(doc(db, 'volunteer_gigs', id), updates);
    },
    deleteVolunteerGig: async (id) => {
        await deleteDoc(doc(db, 'volunteer_gigs', id));
    },

    // Auth & Roles
    user: null, // { email, uid, role }

    checkUserRole: async (user) => {
        if (!user) {
            set({ user: null });
            return;
        }

        // Default role is 'unauthorized' until fetched
        let role = 'unauthorized';
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
                role = adminDoc.role || 'unauthorized';
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
