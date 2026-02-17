import { create } from 'zustand';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs, where, setDoc, getDoc } from 'firebase/firestore';

export const useStore = create((set, get) => ({
    announcements: [],
    concerts: [],
    portfolio: [],
    invoices: [],
    forms: [], // Forms config
    upcomingEvents: [],
    messages: [], // New state
    guestlists: [], // New state
    ticketOrders: [], // New state
    paymentDetails: { upiId: '', qrCodeUrl: '' }, // New state
    portfolioCategories: [], // Dynamic categories
    maintenanceState: {
        global: false,
        pages: {}, // e.g., gallery, concerts
        features: {}, // e.g., invoices, announcements
        sections: {}, // e.g., home_upcoming, home_portfolio
    },
    siteSettings: { showUpcomingEvents: true },
    siteDetails: { instagram: '#', linkedin: '#', whatsappCommunity: '', phone: '', address: '', email: '' },
    loading: true,
    authInitialized: false,

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
                if (colName === 'portfolio' || colName === 'upcoming_events' || colName === 'announcements' || colName === 'volunteer_gigs') {
                    data.sort((a, b) => (a.order || 0) - (b.order || 0));
                }

                // Sort invoices by createdAt (descending) - Newest First
                if (colName === 'invoices') {
                    data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                }

                // Sort messages by createdAt (descending)
                if (colName === 'messages') {
                    data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                }

                // Sort ticket orders by createdAt (descending)
                if (colName === 'ticket_orders') {
                    data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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
        const unsubCategory = sub('portfolio_categories', 'portfolioCategories');
        const unsubGuestlist = sub('guestlists', 'guestlists'); // New sub
        const unsubMessages = sub('messages', 'messages');
        const unsubTicketOrders = sub('ticket_orders', 'ticketOrders'); // New sub

        // Site Settings Subscription (Single Doc)
        const unsub9 = onSnapshot(doc(db, 'site_settings', 'general'), (docSnap) => {
            if (docSnap.exists()) {
                set({ siteSettings: docSnap.data() });
            } else {
                console.log("Initializing site_settings/general");
                const initialSettings = { showUpcomingEvents: true };
                set({ siteSettings: initialSettings });
            }
        }, (error) => console.error("Error fetching site settings:", error));

        // Site Details (Contact Info) Subscription
        const unsub10 = onSnapshot(doc(db, 'site_settings', 'contact_info'), (docSnap) => {
            if (docSnap.exists()) {
                set({ siteDetails: docSnap.data() });
            }
        }, (error) => console.error("Error fetching site details:", error));

        // Payment Info Subscription
        const unsub12 = onSnapshot(doc(db, 'site_settings', 'payment_info'), (docSnap) => {
            if (docSnap.exists()) {
                set({ paymentDetails: docSnap.data() });
            }
        }, (error) => console.error("Error fetching payment details:", error));


        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const maintenanceDocId = isLocal ? 'maintenance_local' : 'maintenance';

        const unsub11 = onSnapshot(doc(db, 'app_state', maintenanceDocId), (docSnap) => {
            if (docSnap.exists()) {
                // Merge with initial structure to ensure all keys exist
                const data = docSnap.data();
                set({
                    maintenanceState: {
                        global: data.global ?? false,
                        pages: data.pages ?? {},
                        features: data.features ?? {},
                        sections: data.sections ?? {}
                    }
                });
            } else {
                // If doc doesn't exist, use defaults but don't force write yet
                set({
                    maintenanceState: {
                        global: false,
                        pages: {},
                        features: {},
                        sections: {}
                    }
                });
            }
        }, (error) => console.error(`Error fetching maintenance state (${maintenanceDocId}):`, error));


        return () => {
            unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); unsub9(); unsub10(); unsub11(); unsub12(); unsubCategory(); unsubGuestlist(); unsubMessages(); unsubTicketOrders();
        };
    },

    // --- Actions (Write to DB) ---

    // Upcoming Events
    addUpcomingEvent: async (event, alsoAddToAnnouncements = false) => {
        // Assign a default order if not present (put at end)
        const currentItems = get().upcomingEvents;
        const maxOrder = currentItems.reduce((max, i) => Math.max(max, i.order || 0), 0);

        const docRef = await addDoc(collection(db, 'upcoming_events'), {
            ...event,
            category: event.category || '', // Added category
            order: maxOrder + 1
        });

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
        await updateDoc(doc(db, 'upcoming_events', id), {
            ...updates,
            category: updates.category || '' // Ensure category is updated
        });
    },
    deleteUpcomingEvent: async (id) => {
        await deleteDoc(doc(db, 'upcoming_events', id));
    },
    updateUpcomingEventOrder: async (items) => {
        const updates = items.map((item, index) =>
            updateDoc(doc(db, 'upcoming_events', item.id), { order: index })
        );
        await Promise.all(updates);
    },

    // Auto-Archive Logic
    archivePastEvents: async () => {
        const { upcomingEvents, addPortfolioItem, deleteUpcomingEvent, portfolioCategories } = get();
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Compare dates only

        const eventsToArchive = upcomingEvents.filter(event => {
            if (!event.date) return false; // Keep events without dates
            const eventDate = new Date(event.date);
            return eventDate < today;
        });

        if (eventsToArchive.length === 0) return;

        console.log(`[Auto-Archive] Found ${eventsToArchive.length} expired events.`);

        // Default category is the first one, or 'music' if none exists
        const defaultCategory = portfolioCategories.length > 0 ? portfolioCategories[0].id : 'music';

        for (const event of eventsToArchive) {
            // 1. Add to Portfolio
            await addPortfolioItem({
                title: event.title,
                image: event.image,
                category: event.category || defaultCategory, // Use event's category if present
                highlightUrl: event.link || '', // Map link to highlight if present
                date: event.date // Preserve date if useful
            });

            // 2. Remove from Upcoming
            await deleteUpcomingEvent(event.id);
            console.log(`[Auto-Archive] Moved "${event.title}" to Past Events.`);
        }
    },

    // Portfolio Categories
    addCategory: async (label) => {
        // ID is lowercase label with dashes
        const id = label.toLowerCase().replace(/[^a-z0-9]/g, '-');
        await setDoc(doc(db, 'portfolio_categories', id), { id, label, order: Date.now() });
    },
    deleteCategory: async (id) => {
        await deleteDoc(doc(db, 'portfolio_categories', id));
    },

    // Site Settings
    toggleUpcomingSectionVisibility: async (currentValue) => {
        await setDoc(doc(db, 'site_settings', 'general'), { showUpcomingEvents: !currentValue }, { merge: true });
    },

    // Announcements
    addAnnouncement: async (announcement) => {
        // Assign a default order (put at top -> minOrder - 1)
        const currentItems = get().announcements;
        const minOrder = currentItems.reduce((min, i) => Math.min(min, i.order || 0), 0);

        await addDoc(collection(db, 'announcements'), {
            ...announcement,
            order: minOrder - 1
        });
    },
    reorderAnnouncements: async (items) => {
        const updates = items.map((item, index) =>
            updateDoc(doc(db, 'announcements', item.id), { order: index })
        );
        await Promise.all(updates);
    },
    cleanupExpiredAnnouncements: async () => {
        // This is called from the component or a dedicated effect, not essentially here in the store definition
        // But we can expose it as an action
        const { announcements, deleteAnnouncement } = get();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expired = announcements.filter(a => {
            if (!a.date) return false;
            const itemDate = new Date(a.date);
            // Check if date is strictly BEFORE today (yesterday or earlier)
            // If date is today, we keep it until tomorrow
            return itemDate < today;
        });

        if (expired.length > 0) {
            console.log(`[Cleanup] Found ${expired.length} expired announcements.`);
            for (const item of expired) {
                await deleteAnnouncement(item.id);
                console.log(`[Cleanup] Deleted expired announcement: ${item.title}`);
            }
        }
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
    updateInvoice: async (id, updates) => {
        await updateDoc(doc(db, 'invoices', id), updates);
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
        const currentItems = get().volunteerGigs;
        const maxOrder = currentItems.reduce((max, i) => Math.max(max, i.order || 0), 0);
        await addDoc(collection(db, 'volunteer_gigs'), { ...gig, order: maxOrder + 1, createdAt: new Date().toISOString() });
    },
    reorderVolunteerGigs: async (items) => {
        const updates = items.map((item, index) =>
            updateDoc(doc(db, 'volunteer_gigs', item.id), { order: index })
        );
        await Promise.all(updates);
    },
    updateVolunteerGig: async (id, updates) => {
        await updateDoc(doc(db, 'volunteer_gigs', id), updates);
    },
    deleteVolunteerGig: async (id) => {
        await deleteDoc(doc(db, 'volunteer_gigs', id));
    },

    // Guestlists
    addGuestlist: async (guestlist) => {
        await addDoc(collection(db, 'guestlists'), { ...guestlist, createdAt: new Date().toISOString() });
    },
    updateGuestlist: async (id, updates) => {
        await updateDoc(doc(db, 'guestlists', id), updates);
    },
    deleteGuestlist: async (id) => {
        await deleteDoc(doc(db, 'guestlists', id));
    },

    // Messages
    markMessageRead: async (id, status = 'read') => {
        await updateDoc(doc(db, 'messages', id), { status });
    },
    deleteMessage: async (id) => {
        await deleteDoc(doc(db, 'messages', id));
    },

    deleteMessage: async (id) => {
        await deleteDoc(doc(db, 'messages', id));
    },

    // Ticket Orders (Offline System)
    addTicketOrder: async (order) => {
        await addDoc(collection(db, 'ticket_orders'), {
            ...order,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    },
    updateTicketOrder: async (id, updates) => {
        await updateDoc(doc(db, 'ticket_orders', id), updates);
    },
    approveTicketOrder: async (id) => {
        // Generate Unique Booking ID: NB-YYYY-XXXX (4 random chars)
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const bookingRef = `NB-${year}-${random}`;

        await updateDoc(doc(db, 'ticket_orders', id), {
            status: 'approved',
            bookingRef,
            approvedAt: new Date().toISOString()
        });
        return bookingRef;
    },
    rejectTicketOrder: async (id) => {
        await updateDoc(doc(db, 'ticket_orders', id), {
            status: 'rejected',
            rejectedAt: new Date().toISOString()
        });
    },

    // Payment Settings
    updatePaymentDetails: async (details) => {
        await setDoc(doc(db, 'site_settings', 'payment_info'), details, { merge: true });
    },

    // Auth & Roles
    user: null, // { email, uid, role, displayName, hasJoinedTribe }
    isAuthOpen: false,
    setAuthModal: (open) => set({ isAuthOpen: open }),

    loginWithGoogle: async () => {
        const { signInWithPopup } = await import('firebase/auth');
        const { auth, googleProvider } = await import('./firebase');
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    },

    signUpWithEmail: async (email, password, displayName) => {
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const { auth } = await import('./firebase');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });

        // Create initial user doc in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email,
            displayName,
            hasJoinedTribe: false,
            createdAt: new Date().toISOString()
        });

        return userCredential.user;
    },

    signInWithEmail: async (email, password) => {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const { auth } = await import('./firebase');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    },

    checkUserRole: async (firebaseUser) => {
        if (!firebaseUser) {
            set({ user: null, authInitialized: true });
            return;
        }

        let role = 'unauthorized';
        let hasJoinedTribe = false;
        let displayName = firebaseUser.displayName || '';

        try {
            // 1. Check if Admin (still by email as admins are added by email)
            const adminQ = query(collection(db, 'admins'), where('email', '==', firebaseUser.email));
            const adminSnapshot = await getDocs(adminQ);

            if (!adminSnapshot.empty) {
                const adminData = adminSnapshot.docs[0].data();
                role = adminData.role || 'unauthorized';
                displayName = adminData.displayName || displayName;
            }

            // 2. Load User Profile by UID (Direct lookup is much more efficient and reliable)
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                hasJoinedTribe = userData.hasJoinedTribe || false;
                displayName = userData.displayName || displayName;
            } else if (firebaseUser.providerData[0]?.providerId === 'google.com') {
                // Auto-create profile for Google users if missing
                await setDoc(userRef, {
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    hasJoinedTribe: false,
                    createdAt: new Date().toISOString()
                }, { merge: true });
            }
        } catch (error) {
            console.error("Error fetching role/profile:", error);
        }

        set({
            user: {
                email: firebaseUser.email,
                uid: firebaseUser.uid,
                role: role,
                displayName: displayName,
                hasJoinedTribe: hasJoinedTribe
            },
            authInitialized: true
        });
    },

    markFormAsSubmitted: async () => {
        const { user } = get();
        if (!user) {
            console.warn("[markFormAsSubmitted] No user found in store.");
            throw new Error("You must be signed in to confirm.");
        }

        console.log("[markFormAsSubmitted] Marking user as joined:", user.uid);

        try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                email: user.email, // Ensure email is saved so lookups by email also work
                displayName: user.displayName,
                hasJoinedTribe: true,
                joinedAt: new Date().toISOString()
            }, { merge: true });

            console.log("[markFormAsSubmitted] Successfully updated Firestore.");

            // Optimistic update
            set({ user: { ...user, hasJoinedTribe: true } });
        } catch (error) {
            console.error("[markFormAsSubmitted] Firestore error:", error);
            throw new Error(`Failed to save: ${error.message || 'Unknown error'}`);
        }
    },

    updateAdminProfile: async (targetUid, targetEmail, newData) => {
        const { user } = get();
        if (!user) return;

        try {
            // 1. Update in admins collection (always by email)
            const q = query(collection(db, 'admins'), where('email', '==', targetEmail));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const adminDocRef = doc(db, 'admins', snapshot.docs[0].id);
                await updateDoc(adminDocRef, newData);
            }

            // 2. Update in users collection (if UID provided or found)
            let uidToUpdate = targetUid;

            if (!uidToUpdate) {
                const userQ = query(collection(db, 'users'), where('email', '==', targetEmail));
                const userSnap = await getDocs(userQ);
                if (!userSnap.empty) {
                    uidToUpdate = userSnap.docs[0].id;
                }
            }

            if (uidToUpdate) {
                const userRef = doc(db, 'users', uidToUpdate);
                await setDoc(userRef, newData, { merge: true });
            }

            // 3. Update local state if it's the current user
            if (user.email === targetEmail) {
                set({ user: { ...user, ...newData } });
            }
        } catch (error) {
            console.error("Error updating admin profile:", error);
            throw error;
        }
    },

    logout: async () => {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        await auth.signOut();
        set({ user: null });
    },

    // Maintenance Actions
    toggleMaintenanceFeature: async (category, key) => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const maintenanceDocId = isLocal ? 'maintenance_local' : 'maintenance';

        console.log(`[Maintenance] Toggling ${category}.${key} in ${maintenanceDocId}`);

        try {
            const current = get().maintenanceState;
            const newState = {
                ...current,
                [category]: {
                    ...current[category],
                    [key]: !current[category]?.[key]
                }
            };

            await setDoc(doc(db, 'app_state', maintenanceDocId), newState);
            set({ maintenanceState: newState });
        } catch (error) {
            console.error("Error toggling maintenance:", error);
            throw error;
        }
    },

    // Ticket Orders
    updateTicketOrder: async (id, data) => {
        try {
            await updateDoc(doc(db, 'ticket_orders', id), data);
        } catch (error) {
            console.error("Error updating ticket order:", error);
            throw error;
        }
    },

    deleteTicketOrder: async (id) => {
        try {
            await deleteDoc(doc(db, 'ticket_orders', id));
        } catch (error) {
            console.error("Error deleting ticket order:", error);
            throw error;
        }
    },


    toggleGlobalMaintenance: async () => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const maintenanceDocId = isLocal ? 'maintenance_local' : 'maintenance';

        console.log(`[Maintenance] Toggling GLOBAL in ${maintenanceDocId}`);

        try {
            const current = get().maintenanceState;
            const newState = { global: !current.global };
            console.log(`[Maintenance] New Global State:`, newState);
            await setDoc(doc(db, 'app_state', maintenanceDocId), newState, { merge: true });
        } catch (error) {
            console.error(`[Maintenance] Failed to update global in ${maintenanceDocId}:`, error);
            alert(`Firestore Global Update Failed: ${error.message}`);
        }
    },

    // Actions
    updateSiteDetails: async (details) => {
        // Persist to Firebase
        await setDoc(doc(db, 'site_settings', 'contact_info'), details, { merge: true });
        // State update handled by subscription 'unsub10'
    },
}));
