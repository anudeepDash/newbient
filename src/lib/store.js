import { create } from 'zustand';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs, where, setDoc, getDoc, increment } from 'firebase/firestore';
import { sendBookingConfirmation } from './email';

export const useStore = create((set, get) => ({
    // ... existing state ...
    
    // Centralized Cloudinary Upload Utility
    uploadToCloudinary: async (file) => {
        if (!file) return null;
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "maw1e4ud");
        data.append("cloud_name", "dgtalrz4n");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dgtalrz4n/image/upload", { 
                method: "POST", 
                body: data 
            });
            if (!res.ok) throw new Error("Upload failed");
            const uploadedImage = await res.json();
            return uploadedImage.secure_url;
        } catch (error) {
            console.error("Cloudinary Upload Error:", error);
            throw new Error("Asset uplink failed. Please check connection.");
        }
    },
    announcements: [],
    concerts: [],
    portfolio: [],
    invoices: [],
    forms: [], // Forms config
    upcomingEvents: [],
    messages: [], // New state
    guestlists: [], // New state
    volunteerGigs: [], // New state
    ticketOrders: [], // New state
    proposals: [], // New Proposal Generator state
    creators: [], // Influencer Marketing
    campaigns: [], // Influencer Marketing
    ticketVault: [], // Bulk ticket storage
    giveaways: [], // Giveaway Campaigns
    giveawayEntries: [], // Giveaway Entries
    posts: [], // Blog Posts
    subscribers: [], // Newsletter Subscribers
    allUsers: [], // All Registered Users (Admin only context)
    artists: [], // Artist Onboarding state
    admins: [], // All Administrators
    notifications: [], // Notifications System
    unreadNotificationsCount: 0,
    fcmToken: null,
    paymentDetails: { upiId: '', qrCodeUrl: '' }, // New state
    portfolioCategories: [], // Dynamic categories
    maintenanceState: {
        global: false,
        pages: {}, // e.g., gallery, concerts
        features: {}, // e.g., invoices, announcements
        sections: {}, // e.g., home_upcoming, home_portfolio
        cards: {}, // e.g., invoices, proposals, tickets (admin dashboard cards)
    },
    siteSettings: { showUpcomingEvents: true, hideMaintenancePages: false },
    siteDetails: { instagram: '#', linkedin: '#', whatsappCommunity: '', phone: '', address: '', email: '' },
    loading: true,
    authInitialized: false,

    // Real-time Subscription Init
    subscribeToData: () => {
        console.log("Initializing Firebase Subscriptions...");
        
        // Safety timeout to prevent stuck loading screen
        const loadingTimeout = setTimeout(() => {
            if (get().loading) {
                console.log("[Auto-Recovery] Forcing loading to false after timeout.");
                set({ loading: false });
            }
        }, 2500);

        // Helper for collections
        const sub = (colName, stateKey) => {
            const q = query(collection(db, colName));
            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => {
                    const d = doc.data();
                    return { ...d, id: doc.id };
                });

                // Sort by 'isPinned' (descending) first, then by 'order' or 'createdAt'
                if (colName === 'portfolio' || colName === 'upcoming_events' || colName === 'announcements' || colName === 'volunteer_gigs' || colName === 'guestlists' || colName === 'forms') {
                    data.sort((a, b) => {
                        if (a.isPinned !== b.isPinned) {
                            return b.isPinned ? -1 : 1;
                        }
                        if (colName === 'portfolio' || colName === 'upcoming_events' || colName === 'announcements' || colName === 'volunteer_gigs') {
                            return (a.order || 0) - (b.order || 0);
                        }
                        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                    });
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

                // Sort proposals by createdAt (descending)
                if (colName === 'proposals') {
                    data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                }

                console.log(`Updated ${stateKey}:`, data.length);
                set({ [stateKey]: data });

                // Set loading false once core public data is ready
                const criticalKeys = ['announcements', 'upcomingEvents', 'siteSettings', 'invoices'];
                if (criticalKeys.includes(stateKey)) {
                    set({ loading: false });
                }
            }, (error) => {
                console.error(`Error fetching ${stateKey}:`, error);
                // Fail-safe: if a critical sub fails, don't let it block the app
                const criticalKeys = ['announcements', 'upcomingEvents', 'siteSettings', 'invoices'];
                if (criticalKeys.includes(stateKey)) set({ loading: false });
            });
        };

        const unsub1 = sub('announcements', 'announcements');
        const unsub2 = sub('concerts', 'concerts');
        const unsub3 = sub('portfolio', 'portfolio');
        const unsub4 = sub('invoices', 'invoices');
        const unsub5 = sub('forms', 'forms');

        const unsub7 = sub('volunteer_gigs', 'volunteerGigs');
        const unsub8 = sub('upcoming_events', 'upcomingEvents');
        const unsubCategory = sub('portfolio_categories', 'portfolioCategories');
        const unsubGuestlist = sub('guestlists', 'guestlists'); // New sub
        const unsubMessages = sub('messages', 'messages');
        const unsubTicketOrders = sub('ticket_orders', 'ticketOrders'); // New sub
        const unsubCreators = sub('creators', 'creators');
        const unsubCampaigns = sub('campaigns', 'campaigns');
        const unsubProposals = sub('proposals', 'proposals');
        const unsubTicketVault = sub('ticket_vault', 'ticketVault');
        const unsubGiveaways = sub('giveaways', 'giveaways');
        const unsubGiveawayEntries = sub('giveaway_entries', 'giveawayEntries');
        const unsubPosts = sub('posts', 'posts');
        const unsubSubscribers = sub('subscribers', 'subscribers');
        const unsubAllUsers = sub('users', 'allUsers');
        const unsubArtists = sub('artists', 'artists');
        const unsubAdmins = sub('admins', 'admins');

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
                        sections: data.sections ?? {},
                        cards: data.cards ?? {},
                    }
                });
            } else {
                // If doc doesn't exist, use defaults but don't force write yet
                set({
                    maintenanceState: {
                        global: false,
                        pages: {},
                        features: {},
                        sections: {},
                        cards: {},
                    }
                });
            }
        }, (error) => console.error(`Error fetching maintenance state (${maintenanceDocId}):`, error));


        return () => {
            clearTimeout(loadingTimeout);
            unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub7(); unsub8(); unsub9(); unsub10(); unsub11(); unsub12(); unsubCategory(); unsubGuestlist(); unsubMessages(); unsubTicketOrders(); unsubCreators(); unsubCampaigns(); unsubProposals(); unsubTicketVault(); unsubGiveaways(); unsubGiveawayEntries();
            unsubPosts(); unsubSubscribers(); unsubAllUsers(); unsubAdmins(); unsubArtists();
        };
    },

    // Notifications Subscription
    subscribeToNotifications: () => {
        const user = get().user;
        const q = query(
            collection(db, 'notifications'), 
            orderBy('createdAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            
            // Filter: Target UID, or global (userId: null)
            const filtered = data.filter(n => !n.userId || n.userId === user?.uid);
            const unreadCount = filtered.filter(n => !n.isRead).length;
            
            set({ notifications: filtered, unreadNotificationsCount: unreadCount });
        }, (error) => console.error("Error fetching notifications:", error));
    },

    // --- Actions (Write to DB) ---

    // Upcoming Events
    addUpcomingEvent: async (event, alsoAddToAnnouncements = false) => {
        // Assign a default order if not present (put at end)
        const currentItems = get().upcomingEvents;
        const maxOrder = currentItems.reduce((max, i) => Math.max(max, i.order || 0), 0);

        const cleanedEvent = Object.entries({
            ...event,
            category: event.category || '', // Added category
            order: maxOrder + 1
        }).reduce((acc, [k, v]) => {
            if (v !== undefined) acc[k] = v;
            return acc;
        }, {});

        // Safely remove id if it exists
        delete cleanedEvent.id;

        const docRef = await addDoc(collection(db, 'upcoming_events'), cleanedEvent);

        if (alsoAddToAnnouncements) {
             const announcementData = {
                title: event.title || 'New Upcoming Event',
                content: event.description || `Check out our regular event on ${event.date}!`,
                date: event.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                image: event.image || '',
                isPinned: false,
                linkedEventId: docRef.id
            };
            const cleanedAnnouncement = Object.entries(announcementData).reduce((acc, [k, v]) => {
                if (v !== undefined) acc[k] = v;
                return acc;
            }, {});
            await addDoc(collection(db, 'announcements'), cleanedAnnouncement);
        }

        return docRef.id;
    },
    updateUpcomingEvent: async (id, updates) => {
        // Remove undefined values to prevent Firestore errors
        const cleanedUpdates = Object.entries({
            ...updates,
            category: updates.category || '' // Ensure category is updated
        }).reduce((acc, [k, v]) => {
            if (v !== undefined) acc[k] = v;
            return acc;
        }, {});

        // Safely remove id if it exists in updates to avoid rewriting document id
        delete cleanedUpdates.id;

        await updateDoc(doc(db, 'upcoming_events', id), cleanedUpdates);

        // Sync mirrored Announcement
        const announcementQ = query(collection(db, 'announcements'), where('linkedEventId', '==', id));
        const announcementSnap = await getDocs(announcementQ);
        announcementSnap.forEach(async (d) => {
            const announcementUpdates = {
                title: updates.title,
                content: updates.description,
                image: updates.image,
                date: updates.date?.split('T')[0] || ''
            };
            const cleanedAnnouncements = Object.entries(announcementUpdates).reduce((acc, [k, v]) => {
                if (v !== undefined) acc[k] = v;
                return acc;
            }, {});
            await updateDoc(doc(db, 'announcements', d.id), cleanedAnnouncements);
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
        const { upcomingEvents, volunteerGigs, guestlists, forms, addPortfolioItem, deleteUpcomingEvent, deleteVolunteerGig, deleteGuestlist, deleteForm, portfolioCategories } = get();
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
                highlightUrl: '', // Do not carry over link automatically
                date: event.date // Preserve date if useful
            });

            // 2. Remove from Upcoming
            await deleteUpcomingEvent(event.id);
            console.log(`[Auto-Archive] Moved "${event.title}" to Past Events.`);
        }

        // --- Archive Community Features (Gigs, Guestlists, Forms) ---

        // 1. Volunteer Gigs
        const gigsToArchive = volunteerGigs.filter(gig => {
            if (gig.status && gig.status.toLowerCase() === 'closed') return true;
            if (gig.date) {
                const gigDate = new Date(gig.date);
                if (gigDate < today) return true;
            }
            // Check dates array if applicable
            if (gig.dates && gig.dates.length > 0) {
                // Sort dates and check the last one
                const sortedDates = [...gig.dates].sort((a, b) => new Date(b) - new Date(a));
                if (new Date(sortedDates[0]) < today) return true;
            }
            return false;
        });

        for (const gig of gigsToArchive) {
            await addPortfolioItem({
                title: gig.title,
                image: gig.image || '', // include custom image if provided
                category: defaultCategory,
                highlightUrl: '',
                date: gig.date || (gig.dates && gig.dates.length > 0 ? gig.dates[0] : null)
            });
            await deleteVolunteerGig(gig.id);
            console.log(`[Auto-Archive] Moved Volunteer Gig "${gig.title}" to Past Events.`);
        }

        // 2. Guestlists
        const guestlistsToArchive = guestlists.filter(gl => {
            if (gl.status && gl.status.toLowerCase() === 'closed') return true;
            if (gl.date) {
                const glDate = new Date(gl.date);
                return glDate < today;
            }
            return false;
        });

        for (const gl of guestlistsToArchive) {
            await addPortfolioItem({
                title: gl.title,
                image: gl.image || '',
                category: defaultCategory,
                highlightUrl: '',
                date: gl.date
            });
            await deleteGuestlist(gl.id);
            console.log(`[Auto-Archive] Moved Guestlist "${gl.title}" to Past Events.`);
        }

        // 3. Forms
        const formsToArchive = forms.filter(form => {
            if (form.status && form.status.toLowerCase() === 'closed') return true;
            return false;
        });

        for (const form of formsToArchive) {
            await addPortfolioItem({
                title: form.title,
                image: form.image || '',
                category: defaultCategory,
                highlightUrl: '',
                date: null // Forms usually don't have event dates
            });
            await deleteForm(form.id);
            console.log(`[Auto-Archive] Moved Form "${form.title}" to Past Events.`);
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
    updateGeneralSettings: async (settings) => {
        await setDoc(doc(db, 'site_settings', 'general'), settings, { merge: true });
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
    updateAnnouncement: async (id, updates) => {
        await updateDoc(doc(db, 'announcements', id), updates);
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

    // Proposals
    addProposal: async (proposal) => {
        return await addDoc(collection(db, 'proposals'), proposal);
    },
    updateProposal: async (id, updates) => {
        await updateDoc(doc(db, 'proposals', id), updates);
    },
    updateProposalStatus: async (id, status) => {
        await updateDoc(doc(db, 'proposals', id), { status });
    },
    deleteProposal: async (id) => {
        await deleteDoc(doc(db, 'proposals', id));
    },
    duplicateProposal: async (id) => {
        const { proposals, addProposal } = get();
        const original = proposals.find(p => p.id === id);
        if (!original) throw new Error("Proposal not found");

        const { id: _, createdAt: __, accessLogs: ___, approvalMetadata: ____, rejectionMetadata: _____, ...duplicateData } = original;
        return await addProposal({
            ...duplicateData,
            clientName: `${original.clientName} (REVISED)`,
            status: 'Draft',
            createdAt: new Date().toISOString()
        });
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
        const docRef = await addDoc(collection(db, 'guestlists'), { ...guestlist, createdAt: new Date().toISOString() });
        return docRef.id;
    },
    duplicateGuestlist: async (id) => {
        const { guestlists, addGuestlist } = get();
        const original = guestlists.find(gl => gl.id === id);
        if (!original) throw new Error("Guestlist not found");

        const { id: _, createdAt: __, ...duplicateData } = original;
        return await addGuestlist({
            ...duplicateData,
            title: `${original.title} (COPY)`,
            status: 'Open'
        });
    },
    demoteToGuestlist: async (upcomingEventId) => {
        const { upcomingEvents, deleteUpcomingEvent, updateGuestlist } = get();
        const event = upcomingEvents.find(e => e.id === upcomingEventId);
        if (!event) throw new Error("Event not found");

        // If it was linked to a guestlist, we might want to ensure that guestlist is 'Open' again
        if (event.linkedGuestlistId) {
            await updateGuestlist(event.linkedGuestlistId, { status: 'Open' });
        }

        await deleteUpcomingEvent(upcomingEventId);
    },
    updateGuestlist: async (id, updates) => {
        const docRef = doc(db, 'guestlists', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await updateDoc(docRef, updates);
        } else {
            console.warn(`[Store] Attempted to update non-existent guestlist: ${id}`);
        }
    },
    deleteGuestlist: async (id) => {
        await deleteDoc(doc(db, 'guestlists', id));
    },

    addGuestlistEntry: async (id, entry) => {
        const docRef = doc(db, 'guestlists', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            console.error(`[Store] Guestlist ${id} does not exist. Aborting entry.`);
            throw new Error("Guestlist no longer active.");
        }

        // 1. Add the entry to sub-collection
        await addDoc(collection(db, 'guestlists', id, 'entries'), {
            ...entry,
            createdAt: new Date().toISOString()
        });

        // 2. Increment currentSpots on the parent document
        await updateDoc(docRef, {
            currentSpots: increment(entry.guestsCount || 1)
        });
    },
    markGuestlistAttendance: async (id, entryId, attended) => {
        await updateDoc(doc(db, 'guestlists', id, 'entries', entryId), {
            attended,
            attendedAt: attended ? new Date().toISOString() : null
        });
    },

    // Messages
    markMessageRead: async (id, status = 'read') => {
        await updateDoc(doc(db, 'messages', id), { status });
    },
    deleteMessage: async (id) => {
        await deleteDoc(doc(db, 'messages', id));
    },

    // Creators / Influencers
    addCreator: async (creator) => {
        await setDoc(doc(db, 'creators', creator.uid), { ...creator, createdAt: new Date().toISOString() });
    },
    updateCreator: async (uid, updates) => {
        await updateDoc(doc(db, 'creators', uid), updates);
    },
    deleteCreator: async (uid) => {
        await deleteDoc(doc(db, 'creators', uid));
    },

    // Artists Management
    addArtist: async (artist) => {
        const id = artist.uid || Math.random().toString(36).substring(2, 10).toUpperCase();
        await setDoc(doc(db, 'artists', id), { 
            ...artist, 
            id,
            createdAt: new Date().toISOString(),
            profileStatus: artist.profileStatus || 'pending'
        });
        return id;
    },
    updateArtist: async (id, updates) => {
        await updateDoc(doc(db, 'artists', id), updates);
    },
    deleteArtist: async (id) => {
        await deleteDoc(doc(db, 'artists', id));
    },

    castArtistToGig: async (artistId, gigId, status = 'shortlisted') => {
        const artistRef = doc(db, 'artists', artistId);
        const artistSnap = await getDoc(artistRef);
        if (artistSnap.exists()) {
            const data = artistSnap.data();
            const gigCasting = data.gigCasting || {};
            gigCasting[gigId] = {
                status,
                assignedAt: new Date().toISOString()
            };
            await updateDoc(artistRef, { gigCasting });
        }
    },

    applyArtistToGig: async (artistId, gigId) => {
        const artistRef = doc(db, 'artists', artistId);
        const artistSnap = await getDoc(artistRef);
        if (artistSnap.exists()) {
            const data = artistSnap.data();
            const gigCasting = data.gigCasting || {};
            
            // Only apply if not already cast or applied
            if (!gigCasting[gigId]) {
                gigCasting[gigId] = {
                    status: 'applied',
                    appliedAt: new Date().toISOString()
                };
                await updateDoc(artistRef, { gigCasting });
            }
        }
    },

    applyToCampaign: async (uid, campaignId) => {
        const creatorRef = doc(db, 'creators', uid);
        const snap = await getDoc(creatorRef);
        if (snap.exists()) {
            const data = snap.data();
            const joined = data.joinedCampaigns || [];
            if (!joined.includes(campaignId)) {
                await updateDoc(creatorRef, {
                    joinedCampaigns: [...joined, campaignId]
                });
            }
        }
    },

    // Campaigns / Gigs
    addCampaign: async (campaign) => {
        await addDoc(collection(db, 'campaigns'), {
            ...campaign,
            minInstagramFollowers: campaign.minInstagramFollowers || 0,
            thumbnail: campaign.thumbnail || '',
            tasks: campaign.tasks || [], // Store tasks directly in campaign structure for now
            createdAt: new Date().toISOString()
        });
    },
    updateCampaign: async (id, updates) => {
        await updateDoc(doc(db, 'campaigns', id), updates);
    },
    deleteCampaign: async (id) => {
        await deleteDoc(doc(db, 'campaigns', id));
    },

    // Task Submission & Review (Dynamic Task System)
    submitTaskProof: async (campaignId, taskId, creatorUid, { contentLink, proofUrl }) => {
        const { campaigns } = get();
        const campaign = campaigns.find(c => c.id === campaignId);
        if (!campaign) throw new Error("Campaign not found");

        const updatedTasks = campaign.tasks.map(t => {
            if (t.id === taskId) {
                const submissions = t.submissions || {};
                submissions[creatorUid] = {
                    status: 'submitted',
                    contentLink: contentLink || '',
                    proofUrl: proofUrl || '',
                    submittedAt: new Date().toISOString(),
                    reviewedAt: null,
                    rejectionReason: ''
                };
                // Also add to legacy completedBy for backward compat
                const completedBy = t.completedBy || [];
                if (!completedBy.includes(creatorUid)) {
                    return { ...t, submissions, completedBy: [...completedBy, creatorUid] };
                }
                return { ...t, submissions };
            }
            return t;
        });
        await updateDoc(doc(db, 'campaigns', campaignId), { tasks: updatedTasks });
    },

    reviewTaskSubmission: async (campaignId, taskId, creatorUid, status, rejectionReason = '') => {
        const { campaigns } = get();
        const campaign = campaigns.find(c => c.id === campaignId);
        if (!campaign) throw new Error("Campaign not found");

        const updatedTasks = campaign.tasks.map(t => {
            if (t.id === taskId) {
                const submissions = t.submissions || {};
                if (submissions[creatorUid]) {
                    submissions[creatorUid] = {
                        ...submissions[creatorUid],
                        status,
                        rejectionReason: status === 'rejected' ? rejectionReason : '',
                        reviewedAt: new Date().toISOString()
                    };
                }
                // Sync with legacy arrays
                const verifiedBy = t.verifiedBy || [];
                if (status === 'approved' && !verifiedBy.includes(creatorUid)) {
                    return { ...t, submissions, verifiedBy: [...verifiedBy, creatorUid] };
                } else if (status === 'rejected') {
                    return { ...t, submissions, verifiedBy: verifiedBy.filter(uid => uid !== creatorUid) };
                }
                return { ...t, submissions };
            }
            return t;
        });
        await updateDoc(doc(db, 'campaigns', campaignId), { tasks: updatedTasks });
    },

    // Giveaways
    addGiveaway: async (giveaway) => {
        const giveawayData = {
            ...giveaway,
            createdAt: new Date().toISOString(),
            status: giveaway.status || 'Open'
        };

        const docRef = await addDoc(collection(db, 'giveaways'), giveawayData);

        // 1. Also Post to Upcoming Events (Home Card)
        if (giveaway.alsoPostToUpcomingEvents) {
            const eventData = {
                title: giveaway.name,
                date: giveaway.endDate + (giveaway.endTime ? `T${giveaway.endTime}` : ''),
                category: 'giveaway',
                description: giveaway.description,
                location: giveaway.location || 'Online',
                buttonText: giveaway.buttonText || 'PARTICIPATE NOW',
                image: giveaway.posterUrl || '',
                link: `/giveaway/${giveaway.slug}`,
                isTicketed: giveaway.isTicketed || false,
                ticketPrice: giveaway.ticketCategories?.[0]?.price || 0,
                ticketCategories: giveaway.ticketCategories || [],
                venueLayout: giveaway.venueLayout || '',
                isGiveaway: true,
                giveawayId: docRef.id,
                giveawaySlug: giveaway.slug
            };

            const currentEvents = get().upcomingEvents;
            const maxOrder = currentEvents.reduce((max, i) => Math.max(max, i.order || 0), 0);
            
            await addDoc(collection(db, 'upcoming_events'), {
                ...eventData,
                order: maxOrder + 1
            });
        }

        // 2. Also Post to Announcements
        if (giveaway.alsoPostToAnnouncements) {
            const currentAnnouncements = get().announcements;
            const minOrder = currentAnnouncements.reduce((min, i) => Math.min(min, i.order || 0), 0);
            
            await addDoc(collection(db, 'announcements'), {
                title: `NEW GIVEAWAY: ${giveaway.name}`,
                content: giveaway.description,
                date: new Date().toISOString().split('T')[0],
                image: giveaway.posterUrl || '',
                isPinned: false,
                order: minOrder - 1,
                linkedGiveawayId: docRef.id,
                link: `/giveaway/${giveaway.slug}`
            });
        }

        return docRef;
    },
    updateGiveaway: async (id, updates) => {
        await updateDoc(doc(db, 'giveaways', id), updates);

        // Sync mirrored Upcoming Event
        const eventQ = query(collection(db, 'upcoming_events'), where('giveawayId', '==', id));
        const eventSnap = await getDocs(eventQ);
        eventSnap.forEach(async (d) => {
            await updateDoc(doc(db, 'upcoming_events', d.id), {
                title: updates.name,
                date: updates.endDate + (updates.endTime ? `T${updates.endTime}` : ''),
                description: updates.description,
                location: updates.location,
                buttonText: updates.buttonText,
                image: updates.posterUrl,
                link: `/giveaway/${updates.slug}`,
                isTicketed: updates.isTicketed,
                ticketPrice: updates.ticketCategories?.[0]?.price || 0,
                ticketCategories: updates.ticketCategories || [],
                venueLayout: updates.venueLayout
            });
        });

        // Sync mirrored Announcement
        const announcementQ = query(collection(db, 'announcements'), where('linkedGiveawayId', '==', id));
        const announcementSnap = await getDocs(announcementQ);
        announcementSnap.forEach(async (d) => {
            await updateDoc(doc(db, 'announcements', d.id), {
                title: `NEW GIVEAWAY: ${updates.name}`,
                content: updates.description,
                image: updates.posterUrl,
                link: `/giveaway/${updates.slug}`,
                date: updates.endDate || ''
            });
        });
    },
    deleteGiveaway: async (id) => {
        await deleteDoc(doc(db, 'giveaways', id));
    },
    enterGiveaway: async (campaignId, userData) => {
        const { user } = get();
        if (!user) throw new Error("Authentication required");

        // Check if user already entered
        const q = query(
            collection(db, 'giveaway_entries'), 
            where('campaignId', '==', campaignId),
            where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) throw new Error("Already participated in this giveaway");

        await addDoc(collection(db, 'giveaway_entries'), {
            campaignId,
            userId: user.uid,
            email: user.email,
            ...userData,
            entryScore: 1, // Initial entry
            completedTasks: {}, 
            hasFollowedInsta: false,
            referralCount: 0,
            hasSpunWheel: false,
            referralCode: user.uid.substring(0, 8),
            referredBy: userData.referredBy || null,
            createdAt: new Date().toISOString()
        });

        // If referred by someone, increment their score
        if (userData.referredBy) {
            const refQ = query(
                collection(db, 'giveaway_entries'),
                where('campaignId', '==', campaignId),
                where('referralCode', '==', userData.referredBy)
            );
            const refSnapshot = await getDocs(refQ);
            if (!refSnapshot.empty) {
                const refDoc = refSnapshot.docs[0];
                const currentData = refDoc.data();
                await updateDoc(doc(db, 'giveaway_entries', refDoc.id), {
                    referralCount: (currentData.referralCount || 0) + 1,
                    entryScore: (currentData.entryScore || 0) + 3
                });
            }
        }
    },
    updateGiveawayEntry: async (id, updates) => {
        await updateDoc(doc(db, 'giveaway_entries', id), updates);
    },
    deleteGiveawayEntry: async (id) => {
        await deleteDoc(doc(db, 'giveaway_entries', id));
    },

    // Bulk Shortlist Helpers
    bulkUpdateCreatorStatus: async (uidArray, status) => {
        const updatePromises = uidArray.map(uid => updateDoc(doc(db, 'creators', uid), { profileStatus: status }));
        await Promise.all(updatePromises);
    },

    bulkShortlistCreators: async (campaignId, uidArray, shouldShortlist = true) => {
        const { creators } = get();
        const updatePromises = uidArray.map(async (uid) => {
            const creator = creators.find(c => c.uid === uid);
            if (!creator) return;

            const shortlisted = creator.shortlistedCampaigns || [];
            if (shouldShortlist) {
                if (!shortlisted.includes(campaignId)) {
                    await updateDoc(doc(db, 'creators', uid), { 
                        shortlistedCampaigns: [...shortlisted, campaignId] 
                    });
                }
            } else {
                await updateDoc(doc(db, 'creators', uid), { 
                    shortlistedCampaigns: shortlisted.filter(id => id !== campaignId) 
                });
            }
        });
        await Promise.all(updatePromises);
    },

    toggleShortlistStatus: async (campaignId, creatorUid) => {
        const { creators } = get();
        const creator = creators.find(c => c.uid === creatorUid);
        if (!creator) return;

        const shortlisted = creator.shortlistedCampaigns || [];
        const isCurrentlyShortlisted = shortlisted.includes(campaignId);

        if (isCurrentlyShortlisted) {
            await updateDoc(doc(db, 'creators', creatorUid), {
                shortlistedCampaigns: shortlisted.filter(id => id !== campaignId)
            });
        } else {
            await updateDoc(doc(db, 'creators', creatorUid), {
                shortlistedCampaigns: [...shortlisted, campaignId]
            });
        }
    },

    verifyInstagramFollowers: async (uid, accessToken) => {
        try {
            const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,accounts{instagram_business_account{id,username,name,followers_count}}&access_token=${accessToken}`);
            const data = await res.json();
            
            if (!data.accounts?.data?.[0]?.instagram_business_account) {
                throw new Error("No Instagram Business Account linked to this Facebook page.");
            }

            const insta = data.accounts.data[0].instagram_business_account;
            const followerCount = insta.followers_count;

            await updateDoc(doc(db, 'creators', uid), {
                instagramFollowers: followerCount.toString(),
                profileStatus: 'approved',
                instagramVerified: true,
                socialVerifiedAt: new Date().toISOString(),
                metaVerifiedName: insta.name || insta.username
            });

            return { success: true, followers: followerCount };
        } catch (error) {
            console.error("Meta Verification Error:", error);
            throw error;
        }
    },

    // Ticket Orders (Offline System)
    addTicketOrder: async (order) => {
        await addDoc(collection(db, 'ticket_orders'), {
            createdAt: new Date().toISOString(),
            ...order,
            status: order.status || 'pending',
            fulfillmentStatus: 'pending_verification' // new state
        });
    },
    updateTicketOrder: async (id, updates) => {
        await updateDoc(doc(db, 'ticket_orders', id), updates);
    },
    approveTicketOrder: async (id) => {
        const state = get();
        const order = state.ticketOrders.find(o => o.id === id);
        if (!order) return;

        // Generate Unique Booking ID: NB-YYYY-XXXX (4 random chars)
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const bookingRef = order.bookingRef || `NB-${year}-${random}`; // Keep existing if retry

        const assignedTickets = [];
        const ticketsToDelete = [];
        let allItemsFulfilled = true;

        // For each item in the order, find tickets from the vault
        if (order.items && order.items.length > 0) {
            let vaultCopy = [...state.ticketVault];
            
            for (const item of order.items) {
                const countNeeded = item.count || 1;
                // Find tickets matching eventId and category (case insensitive comparison)
                // Defaulting standard fallback if no category id matches exactly
                const matchCategory = item.name?.toUpperCase() || 'STANDARD TICKET';

                const matchingTickets = vaultCopy.filter(t => 
                    t.eventId === order.eventId && 
                    (t.category?.toUpperCase() === matchCategory)
                ).slice(0, countNeeded);

                if (matchingTickets.length === countNeeded) {
                    assignedTickets.push(...matchingTickets.map(t => t.url));
                    ticketsToDelete.push(...matchingTickets.map(t => t.id));
                    
                    const matchingIds = matchingTickets.map(t => t.id);
                    vaultCopy = vaultCopy.filter(t => !matchingIds.includes(t.id));
                } else {
                    allItemsFulfilled = false;
                    break; // If we can't fulfill this item completely, abort fulfilling the whole order
                }
            }
        }

        if (allItemsFulfilled && assignedTickets.length > 0) {
            // Update Order as Fulfilled
            await updateDoc(doc(db, 'ticket_orders', id), {
                status: 'approved',
                fulfillmentStatus: 'fulfilled',
                bookingRef: bookingRef,
                ticketUrls: assignedTickets,
                ticketUrl: assignedTickets[0] || '', // Fallback
                approvedAt: new Date().toISOString()
            });

            // Cleanup Vault
            for (const ticketId of ticketsToDelete) {
                await deleteDoc(doc(db, 'ticket_vault', ticketId));
            }
        } else {
            // Not enough tickets, put On Hold
            await updateDoc(doc(db, 'ticket_orders', id), {
                status: 'approved',
                fulfillmentStatus: 'on_hold',
                bookingRef: bookingRef,
                approvedAt: new Date().toISOString()
            });
        }

        // --- AUTOMATED EMAIL DISPATCH ---
        try {
            const orderData = {
                to_name: order.customerName,
                to_email: order.customerEmail,
                event_name: order.eventTitle,
                booking_ref: bookingRef,
                total_amount: order.totalAmount,
                payment_ref: order.paymentRef,
                ticket_url: assignedTickets,
                tickets_html: order.items?.map(item => `${item.count}x ${item.name}`).join(', ') || 'Standard Entry'
            };
            await sendBookingConfirmation(orderData);
            console.log(`[Automation] Verification email triggered for ${order.customerEmail}`);
        } catch (emailError) {
            console.error("[Automation] Failed to send verification email:", emailError);
        }

        return bookingRef;
    },
    rejectTicketOrder: async (id) => {
        await updateDoc(doc(db, 'ticket_orders', id), {
            status: 'rejected',
            rejectedAt: new Date().toISOString()
        });
    },

    // Ticket Vault (Bulk Assets)
    addTicketToVault: async (ticket) => {
        await addDoc(collection(db, 'ticket_vault'), {
            ...ticket,
            createdAt: new Date().toISOString(),
            status: 'available'
        });
    },
    attemptAutoFulfill: async () => {
        // Find all orders that are approved but on_hold
        const { ticketOrders, approveTicketOrder } = get();
        const onHoldOrders = ticketOrders.filter(o => o.status === 'approved' && o.fulfillmentStatus === 'on_hold')
                                         .sort((a, b) => new Date(a.approvedAt || 0) - new Date(b.approvedAt || 0)); // Oldest first (FIFO)
        
        for (const order of onHoldOrders) {
            // Re-attempt approval process to pull from vault
            await approveTicketOrder(order.id);
        }
    },
    updateTicketInVault: async (id, updates) => {
        await updateDoc(doc(db, 'ticket_vault', id), updates);
    },
    deleteTicketFromVault: async (id) => {
        await deleteDoc(doc(db, 'ticket_vault', id));
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

    resetPassword: async (email) => {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        const { auth } = await import('./firebase');
        await sendPasswordResetEmail(auth, email);
    },

    updateDisplayName: async (displayName) => {
        const { updateProfile } = await import('firebase/auth');
        const { auth } = await import('./firebase');
        if (!auth.currentUser) throw new Error("No authenticated user");
        
        await updateProfile(auth.currentUser, { displayName });
        
        // Update in Firestore users collection
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, { displayName }, { merge: true });

        // Update local state
        const { user } = get();
        set({ user: { ...user, displayName } });
    },

    checkUserRole: async (firebaseUser) => {
        if (!firebaseUser) {
            set({ user: null, authInitialized: true });
            return;
        }

        let role = 'unauthorized';
        let hasJoinedTribe = false;
        let hasJoinedWhatsapp = false;
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

                // CHECK BLOCK STATUS
                if (userData.isBlocked) {
                    console.warn("User is blocked. Denying access.");
                    set({ user: null, authInitialized: true });
                    // Force logout if currently signed in
                    const { getAuth } = await import('firebase/auth');
                    const auth = getAuth();
                    await auth.signOut();
                    alert("Your account has been suspended. Please contact support.");
                    return;
                }

                hasJoinedTribe = userData.hasJoinedTribe || false;
                hasJoinedWhatsapp = userData.hasJoinedWhatsapp || false;
                displayName = userData.displayName || displayName;

                // Update Last Active Timestamp (Fire and forget)
                setDoc(userRef, { lastActive: new Date().toISOString() }, { merge: true });

            } else if (firebaseUser.providerData[0]?.providerId === 'google.com') {
                // Auto-create profile for Google users if missing
                await setDoc(userRef, {
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    hasJoinedTribe: false,
                    createdAt: new Date().toISOString(),
                    lastActive: new Date().toISOString()
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
                hasJoinedTribe: hasJoinedTribe,
                hasJoinedWhatsapp: hasJoinedWhatsapp
            },
            authInitialized: true
        });
    },

    // User Management Actions
    blockUser: async (uid) => {
        await updateDoc(doc(db, 'users', uid), { isBlocked: true });
    },
    unblockUser: async (uid) => {
        await updateDoc(doc(db, 'users', uid), { isBlocked: false });
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

    markWhatsappJoined: async () => {
        const { user } = get();
        if (!user) {
            console.warn("[markWhatsappJoined] No user found in store.");
            throw new Error("You must be signed in to confirm.");
        }

        try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                hasJoinedWhatsapp: true,
                whatsappJoinedAt: new Date().toISOString()
            }, { merge: true });

            // Optimistic update
            set({ user: { ...user, hasJoinedWhatsapp: true } });
        } catch (error) {
            console.error("[markWhatsappJoined] Firestore error:", error);
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

    requestAdminAccess: async () => {
        const { user } = get();
        if (!user) throw new Error("Authentication required");

        // Check if a request already exists
        const adminQ = query(collection(db, 'admins'), where('email', '==', user.email));
        const adminSnapshot = await getDocs(adminQ);

        if (!adminSnapshot.empty) {
            throw new Error("A request for this account already exists or is being processed.");
        }

        await addDoc(collection(db, 'admins'), {
            email: user.email,
            uid: user.uid,
            role: 'pending',
            displayName: user.displayName,
            createdAt: new Date().toISOString(),
            requestedBy: user.email
        });

        // Update local state role to show 'pending' immediately
        set({ user: { ...user, role: 'pending' } });
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

    markAttendance: async (id) => {
        try {
            await updateDoc(doc(db, 'ticket_orders', id), {
                attendedAt: new Date().toISOString(),
                status: 'attended'
            });
        } catch (error) {
            console.error("Error marking attendance:", error);
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

    // --- BLOG & NEWSLETTER ACTIONS ---
    addPost: async (post) => {
        const postData = {
            ...post,
            createdAt: new Date().toISOString(),
            viewCount: 0,
            shareCount: 0,
            featured: post.featured || false
        };
        return await addDoc(collection(db, 'posts'), postData);
    },
    updatePost: async (id, updates) => {
        await updateDoc(doc(db, 'posts', id), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    },
    deletePost: async (id) => {
        await deleteDoc(doc(db, 'posts', id));
    },
    subscribeUser: async (email, name = '') => {
        // Check if already subscribed
        const q = query(collection(db, 'subscribers'), where('email', '==', email.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return { success: true, message: 'Already subscribed!' };

        await addDoc(collection(db, 'subscribers'), {
            email: email.toLowerCase(),
            name,
            createdAt: new Date().toISOString()
        });
        return { success: true, message: 'Successfully subscribed!' };
    },

    // --- NOTIFICATION ACTIONS ---
    addNotification: async (notification) => {
        const nData = {
            ...notification,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        return await addDoc(collection(db, 'notifications'), nData);
    },
    markNotificationRead: async (id) => {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
    },
    deleteNotification: async (id) => {
        await deleteDoc(doc(db, 'notifications', id));
    },
    clearAllNotifications: async () => {
        const { notifications } = get();
        const unread = notifications.filter(n => !n.isRead);
        const updates = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }));
        await Promise.all(updates);
    },
    saveFcmToken: async (token) => {
        const { user } = get();
        if (user) {
            await setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true });
        }
        set({ fcmToken: token });
    },
}));
