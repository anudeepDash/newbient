import { create } from 'zustand';
import { db, storage } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs, where, setDoc, getDoc, increment, arrayUnion, collectionGroup, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendBookingConfirmation, sendCreatorWelcomeEmail, sendNewCampaignNotificationEmail, sendCreatorApprovedEmail } from './email';

const AUTH_CACHE_KEY = 'nb_auth_session';
const getCachedSession = () => {
    try {
        const session = localStorage.getItem(AUTH_CACHE_KEY);
        if (!session) return null;
        const parsed = JSON.parse(session);
        // Expire cache after 7 days
        const isExpired = Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000;
        return isExpired ? null : parsed.user;
    } catch (e) {
        return null;
    }
};

const getSessionTimestamp = () => {
    try {
        const session = localStorage.getItem(AUTH_CACHE_KEY);
        if (!session) return Date.now();
        const parsed = JSON.parse(session);
        return parsed?.timestamp || Date.now();
    } catch (e) {
        return Date.now();
    }
};

const uploadBase64ToStorage = async (base64String, path) => {
    if (!base64String || typeof base64String !== 'string' || !base64String.startsWith('data:') || !base64String.includes(';base64,')) {
        return base64String;
    }
    
    let blob = null;
    let mimeType = 'image/png';
    let extension = 'png';
    try {
        const response = await fetch(base64String);
        blob = await response.blob();
        mimeType = blob.type || 'image/png';
        extension = mimeType.split('/')[1] || 'png';
    } catch (e) {
        console.error("Failed to parse base64 data URL to Blob:", e);
        throw new Error(`Invalid base64 payload: ${e.message}`);
    }

    try {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    } catch (e) {
        console.warn("Failed to upload base64 file to Firebase Storage, trying Cloudinary fallback...", e);
        try {
            const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "maw1e4ud";
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgtalrz4n";
            const data = new FormData();
            data.append("file", blob, `asset.${extension}`);
            data.append("upload_preset", preset);
            data.append("cloud_name", cloudName);

            let resourceType = "image";
            if (mimeType.startsWith("video/")) resourceType = "video";
            else if (mimeType.startsWith("audio/")) resourceType = "video";
            else if (!mimeType.startsWith("image/")) resourceType = "raw";

            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { 
                method: "POST", 
                body: data 
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || "Cloudinary upload failed");
            }
            const uploadedFile = await res.json();
            return uploadedFile.secure_url;
        } catch (cloudinaryError) {
            console.error("Cloudinary fallback also failed:", cloudinaryError);
            throw new Error(`Upload failed for file asset. Original storage error: ${e.message}. Cloudinary fallback error: ${cloudinaryError.message}`);
        }
    }
};

const processAndUploadBase64Fields = async (obj, pathPrefix) => {
    if (typeof obj === 'string' && obj.startsWith('data:') && obj.includes(';base64,')) {
        const uniqueId = Math.random().toString(36).substring(2, 9);
        const mimeType = obj.match(/data:([a-zA-Z0-9.+\-_/]+);base64/)?.[1] || 'image/png';
        const extension = mimeType.split('/')[1] || 'png';
        const storagePath = `${pathPrefix}_file_${uniqueId}.${extension}`;
        return await uploadBase64ToStorage(obj, storagePath);
    }

    if (typeof obj === 'string' && obj.includes(';base64,')) {
        const regex = /(data:[a-zA-Z0-9.+\-_/]+;base64,[^"'\s\)\\\&<>]+)/g;
        let match;
        let newStr = obj;
        const uploads = [];
        while ((match = regex.exec(obj)) !== null) {
            const base64Str = match[1];
            if (!uploads.includes(base64Str)) {
                uploads.push(base64Str);
            }
        }

        for (const base64Str of uploads) {
            const uniqueId = Math.random().toString(36).substring(2, 9);
            const mimeType = base64Str.match(/data:([a-zA-Z0-9.+\-_/]+);base64/)?.[1] || 'image/png';
            const extension = mimeType.split('/')[1] || 'png';
            const storagePath = `${pathPrefix}_embedded_${uniqueId}.${extension}`;
            try {
                const url = await uploadBase64ToStorage(base64Str, storagePath);
                newStr = newStr.replaceAll(base64Str, url);
            } catch (e) {
                console.error("Failed to upload embedded base64:", e);
                throw e; // Propagate error so that save fails with explanation instead of silent write failure
            }
        }
        return newStr;
    }

    if (Array.isArray(obj)) {
        const newArr = [];
        for (let i = 0; i < obj.length; i++) {
            newArr.push(await processAndUploadBase64Fields(obj[i], `${pathPrefix}_arr${i}`));
        }
        return newArr;
    }

    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
            newObj[key] = await processAndUploadBase64Fields(value, `${pathPrefix}_${key}`);
        }
        return newObj;
    }

    return obj;
};

const notifyMatchingCreatorsOfCampaign = async (campaignData, creatorsList) => {
    try {
        let allCreators = creatorsList || [];
        if (allCreators.length === 0) {
            const snapshot = await getDocs(collection(db, 'creators'));
            allCreators = snapshot.docs.map(d => ({ ...d.data(), uid: d.id }));
        }

        const targetCity = (campaignData.targetCity || 'Any').trim().toLowerCase();
        const matchingCreators = allCreators.filter(creator => {
            if (!creator.email) return false;
            if (targetCity === 'any' || targetCity === 'all' || targetCity === 'universal') return true;
            return (creator.city || '').trim().toLowerCase() === targetCity;
        });

        if (matchingCreators.length > 0) {
            const emails = matchingCreators.map(c => c.email);
            await sendNewCampaignNotificationEmail(emails, campaignData);
        }
    } catch (err) {
        console.error("Error notifying creators of campaign:", err);
    }
};

const initialUser = getCachedSession();

export const useStore = create((set, get) => ({
    // ... existing state ...
    
    // Centralized Cloudinary Upload Utility
    uploadToCloudinary: async (file) => {
        if (!file) return null;

        // Try Firebase Storage first for PDF files to render inline correctly without Cloudinary security blocks
        if (file.type === "application/pdf") {
            try {
                const uniqueId = Math.random().toString(36).substring(2, 9);
                const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const storagePath = `uploads/pdf_${uniqueId}_${cleanName}`;
                const storageRef = ref(storage, storagePath);
                await uploadBytes(storageRef, file);
                return await getDownloadURL(storageRef);
            } catch (firebaseError) {
                console.warn("Firebase Storage PDF upload failed, falling back to Cloudinary raw upload:", firebaseError);
            }
        }

        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "maw1e4ud");
        data.append("cloud_name", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgtalrz4n");

        // Auto-detect resource type from file MIME & extension
        const extension = file.name?.split('.').pop()?.toLowerCase();
        const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'];

        let resourceType = "image";
        if (file.type?.startsWith("video/") || videoExtensions.includes(extension)) {
            resourceType = "video";
        } else if (file.type === "application/pdf" || file.type?.startsWith("application/") || (extension && !imageExtensions.includes(extension))) {
            resourceType = "raw";
        }

        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgtalrz4n";

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { 
                method: "POST", 
                body: data 
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                console.error("Cloudinary Response Error:", errorData);
                throw new Error(errorData.error?.message || "Upload failed");
            }
            
            const uploadedFile = await res.json();
            return uploadedFile.secure_url;
        } catch (error) {
            console.error("Cloudinary Upload Error Details:", error);
            // Re-throw with more context if it's a generic connection/unknown error
            const message = (!error.message || error.message.includes("failed") || error.message.includes("Failed"))
                ? "Couldn't upload your file. Please check your internet connection or try a smaller file." 
                : error.message;
            throw new Error(message);
        }
    },

    // Centralized Document Upload Utility (tries Firebase Storage first, falls back to Cloudinary raw upload)
    uploadDocumentFile: async (file) => {
        if (!file) return null;
        
        const uniqueId = Math.random().toString(36).substring(2, 9);
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const storagePath = `documents/${uniqueId}_${cleanName}`;
        
        // Try Firebase Storage first
        try {
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            return { url, storagePath };
        } catch (firebaseError) {
            console.warn("Firebase Storage upload failed, falling back to Cloudinary raw upload:", firebaseError);
            
            // Cloudinary fallback
            const data = new FormData();
            data.append("file", file);
            data.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "maw1e4ud");
            data.append("cloud_name", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgtalrz4n");

            // Auto-detect resource type from extension/MIME
            const extension = file.name?.split('.').pop()?.toLowerCase();
            const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'];
            
            let resourceType = "raw";
            if (file.type?.startsWith("video/") || videoExtensions.includes(extension)) {
                resourceType = "video";
            } else if (file.type?.startsWith("image/") || imageExtensions.includes(extension)) {
                resourceType = "image";
            }

            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgtalrz4n";

            try {
                const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { 
                    method: "POST", 
                    body: data 
                });
                
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error?.message || "Upload failed");
                }
                
                const uploadedFile = await res.json();
                return { url: uploadedFile.secure_url, storagePath: "" };
            } catch (cloudinaryError) {
                console.error("Cloudinary fallback upload failed:", cloudinaryError);
                throw new Error(cloudinaryError.message || "Upload failed. Please check your network or file size.");
            }
        }
    },
    announcements: [],
    concerts: [],
    portfolio: [],
    invoices: [],
    spends: [],
    otherIncomes: [],
    financePayees: [], // Registered Payees
    forms: [], // Forms config
    upcomingEvents: [],
    ticketOrders: [], // Ticket Purchases and Offline Reconciliations
    messages: [], // New state
    guestlists: [], // New state
    volunteerGigs: [], // New state
    proposals: [], // New Proposal Generator state
    agreements: [], // New Agreement Generator state
    genDocuments: [], // Generated Document PDFs state
    creators: [], // Influencer Marketing
    campusProfiles: [], // Role-based campus hub
    campusActivations: [], // Gamified events
    campusActivationEntries: [],
    campusWallPosts: [], // Spotted & Gigs micro-bulletin feed
    campusGuestlistPasses: [], // Dynamic QR guestlist passes
    campaigns: [], // Influencer Marketing
    giveaways: [], // Giveaway Campaigns
    giveawayEntries: [], // Giveaway Entries
    posts: [], // Blog Posts
    subscribers: [], // Newsletter Subscribers
    allUsers: [], // All Registered Users (Admin only context)
    artists: [], // Artist Onboarding state
    admins: [], // All Administrators
    clientRequests: [], // Artistant Client Onboarding
    notifications: [], // Notifications System
    unreadNotificationsCount: 0,
    fcmToken: null,
    paymentDetails: { upiId: '', qrCodeUrl: '' }, // New state
    coupons: [], // Coupon Code System
    documents: [], // Document Hub
    portfolioCategories: [], // Dynamic categories
    toasts: [], // Ephemeral UI notifications
    aiConfig: { geminiKey: '', defaultModel: 'gemini-3.5-flash' }, // Global AI Config
    activeModel: 'Gemini 3.5 Flash',
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
    authInitialized: initialUser !== null,
    user: initialUser,
    userListenerUnsubscribe: null,

    // Real-time Subscription Init
    subscribeToData: (isAdmin) => {
        console.log(`Initializing Firebase Subscriptions (Admin mode: ${!!isAdmin})...`);
        
        // Safety timeout to prevent stuck loading screen
        const loadingTimeout = setTimeout(() => {
            if (get().loading) {
                console.log("[Auto-Recovery] Forcing loading to false after timeout.");
                set({ loading: false });
            }
        }, 2500);

        const loadedKeys = new Set();
        const criticalKeys = ['announcements', 'upcomingEvents', 'siteSettings'];

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
                if (colName === 'invoices' || colName === 'spends' || colName === 'other_incomes' || colName === 'finance_payees') {
                    data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                }

                // Sort messages by createdAt (descending)
                if (colName === 'messages') {
                    data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                }

                // Sort proposals by createdAt (descending)
                if (colName === 'proposals' || colName === 'agreements') {
                    data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                }

                console.log(`Updated ${stateKey}:`, data.length);
                set({ [stateKey]: data });

                // Set loading false once ALL core public data is ready
                if (criticalKeys.includes(stateKey)) {
                    loadedKeys.add(stateKey);
                    if (criticalKeys.every(key => loadedKeys.has(key))) {
                        set({ loading: false });
                    }
                }
            }, (error) => {
                console.error(`Error fetching ${stateKey}:`, error);
                if (criticalKeys.includes(stateKey)) {
                    loadedKeys.add(stateKey);
                    if (criticalKeys.every(key => loadedKeys.has(key))) set({ loading: false });
                }
            });
        };

        // Always Subscribed (Public Data)
        const unsub1 = sub('announcements', 'announcements');
        const unsub2 = sub('concerts', 'concerts');
        const unsub3 = sub('portfolio', 'portfolio');
        const unsub5 = sub('forms', 'forms');
        const unsub7 = sub('volunteer_gigs', 'volunteerGigs');
        const unsub8 = sub('upcoming_events', 'upcomingEvents');
        const unsubCategory = sub('portfolio_categories', 'portfolioCategories');
        const unsubGuestlist = sub('guestlists', 'guestlists');
        const unsubGiveaways = sub('giveaways', 'giveaways');
        const unsubPosts = sub('posts', 'posts');
        const unsubWallPosts = sub('campus_wall_posts', 'campusWallPosts');
        const unsubGuestlistPasses = sub('campus_guestlist_passes', 'campusGuestlistPasses');

        // Admin-only subscriptions (only run if isAdmin is true)
        let unsub4 = null;
        let unsubSpends = null;
        let unsubOtherIncomes = null;
        let unsubFinancePayees = null;
        let unsubMessages = null;
        let unsubCreators = null;
        let unsubCampus = null;
        let unsubCampusAct = null;
        let unsubCampusEntries = null;
        let unsubCampaigns = null;
        let unsubProposals = null;
        let unsubAgreements = null;
        let unsubSubscribers = null;
        let unsubAllUsers = null;
        let unsubArtists = null;
        let unsubAdmins = null;
        let unsubClientRequests = null;
        let unsubTicketOrders = null;
        let unsubCoupons = null;
        let unsubDocuments = null;
        let unsubGenDocuments = null;

        if (isAdmin) {
            unsub4 = sub('invoices', 'invoices');
            unsubSpends = sub('spends', 'spends');
            unsubOtherIncomes = sub('other_incomes', 'otherIncomes');
            unsubFinancePayees = sub('finance_payees', 'financePayees');
            unsubMessages = sub('messages', 'messages');
            unsubCreators = sub('creators', 'creators');
            unsubCampus = sub('campus_profiles', 'campusProfiles');
            unsubCampusAct = sub('campus_activations', 'campusActivations');
            unsubCampusEntries = sub('campus_activation_entries', 'campusActivationEntries');
            unsubCampaigns = sub('campaigns', 'campaigns');
            unsubProposals = sub('proposals', 'proposals');
            unsubAgreements = sub('agreements', 'agreements');
            unsubSubscribers = sub('subscribers', 'subscribers');
            unsubAllUsers = sub('users', 'allUsers');
            unsubArtists = sub('artists', 'artists');
            unsubAdmins = sub('admins', 'admins');
            unsubClientRequests = sub('client_requests', 'clientRequests');
            unsubTicketOrders = sub('ticket_orders', 'ticketOrders');
            unsubCoupons = sub('coupons', 'coupons');
            unsubDocuments = sub('documents', 'documents');
            unsubGenDocuments = sub('gen_documents', 'genDocuments');
        }

        // Site Settings Subscription (Single Doc)
        const unsub9 = onSnapshot(doc(db, 'site_settings', 'general'), (docSnap) => {
            if (docSnap.exists()) {
                set({ siteSettings: docSnap.data() });
            } else {
                console.log("Initializing site_settings/general");
                const initialSettings = { showUpcomingEvents: true };
                set({ siteSettings: initialSettings });
            }
            loadedKeys.add('siteSettings');
            if (criticalKeys.every(key => loadedKeys.has(key))) set({ loading: false });
        }, (error) => {
            console.error("Error fetching site settings:", error);
            loadedKeys.add('siteSettings');
            if (criticalKeys.every(key => loadedKeys.has(key))) set({ loading: false });
        });

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
        
        // AI Config Subscription
        const unsubAI = onSnapshot(doc(db, 'site_settings', 'ai_config'), (docSnap) => {
            if (docSnap.exists()) {
                set({ aiConfig: docSnap.data() });
            }
        }, (error) => console.error("Error fetching AI config:", error));

        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const maintenanceDocId = isLocal ? 'maintenance_local' : 'maintenance';

        const unsub11 = onSnapshot(doc(db, 'app_state', maintenanceDocId), (docSnap) => {
            if (docSnap.exists()) {
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
            unsub1(); unsub2(); unsub3(); unsub5(); unsub7(); unsub8(); unsub9(); unsub10(); unsub11(); unsub12(); unsubCategory(); unsubGuestlist(); unsubGiveaways();
            unsubPosts(); unsubWallPosts(); unsubGuestlistPasses();
            unsubAI();

            if (unsub4) unsub4();
            if (unsubSpends) unsubSpends();
            if (unsubOtherIncomes) unsubOtherIncomes();
            if (unsubFinancePayees) unsubFinancePayees();
            if (unsubMessages) unsubMessages();
            if (unsubCreators) unsubCreators();
            if (unsubCampus) unsubCampus();
            if (unsubCampusAct) unsubCampusAct();
            if (unsubCampusEntries) unsubCampusEntries();
            if (unsubCampaigns) unsubCampaigns();
            if (unsubProposals) unsubProposals();
            if (unsubAgreements) unsubAgreements();
            if (unsubSubscribers) unsubSubscribers();
            if (unsubAllUsers) unsubAllUsers();
            if (unsubArtists) unsubArtists();
            if (unsubAdmins) unsubAdmins();
            if (unsubClientRequests) unsubClientRequests();
            if (unsubTicketOrders) unsubTicketOrders();
            if (unsubCoupons) unsubCoupons();
            if (unsubDocuments) unsubDocuments();
            if (unsubGenDocuments) unsubGenDocuments();
        };
    },

    // Campaign-specific Giveaway Entries Subscription (to avoid loading all entries globally)
    subscribeToGiveawayEntries: (campaignId) => {
        if (!campaignId) return () => {};
        console.log(`Subscribing to giveaway entries for campaign: ${campaignId}`);
        const q = query(collection(db, 'giveaway_entries'), where('campaignId', '==', campaignId));
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            set({ giveawayEntries: data });
        }, (error) => {
            console.error("Error fetching giveaway entries for campaign:", campaignId, error);
        });
    },

    // Toast System
    addToast: (message, type = 'error', code = null) => {
        const id = Date.now();
        
        let finalMessage = message;
        // Append support email for specific non-auto-resolvable errors (like ticketing/payments)
        if (type === 'error' && (code?.startsWith('TKT') || code?.startsWith('EVT') || code?.startsWith('PAY') || message.toLowerCase().includes('ticket') || message.toLowerCase().includes('payment'))) {
            finalMessage = `${message} For assistance, contact support@newbi.live`;
        }

        set(state => ({
            toasts: [...state.toasts, { id, message: finalMessage, type, code }]
        }));
        // Auto-remove after 5 seconds
        setTimeout(() => {
            set(state => ({
                toasts: state.toasts.filter(t => t.id !== id)
            }));
        }, 5000);
    },
    removeToast: (id) => {
        set(state => ({
            toasts: state.toasts.filter(t => t.id !== id)
        }));
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
    
    // Notifications
    addNotification: async (notificationData) => {
        try {
            await addDoc(collection(db, 'notifications'), {
                ...notificationData,
                isRead: false,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Failed to add notification:", error);
        }
    },
    markNotificationRead: async (id) => {
        try {
            await updateDoc(doc(db, 'notifications', id), { isRead: true });
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    },
    markAllNotificationsRead: async () => {
        try {
            const user = get().user;
            const { notifications } = get();
            
            // Only update notifications that belong to the user or are global, and are unread
            const unread = notifications.filter(n => !n.isRead && (!n.userId || n.userId === user?.uid));
            
            const updates = unread.map(n => 
                updateDoc(doc(db, 'notifications', n.id), { isRead: true })
            );
            
            await Promise.all(updates);
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        }
    },

    // Upcoming Events
    addUpcomingEvent: async (event, alsoAddToAnnouncements = false) => {
        // Assign a default order if not present (put at end)
        const currentItems = get().upcomingEvents;
        const maxOrder = currentItems.reduce((max, i) => Math.max(max, i.order || 0), 0);

        // Recursive clean utility for nested objects/arrays
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };

        const cleanedEvent = deepClean({
            ...event,
            category: event.category || '',
            order: maxOrder + 1
        });

        // Safely remove id if it exists
        delete cleanedEvent.id;

        const docRef = await addDoc(collection(db, 'upcoming_events'), cleanedEvent);

        // Ensure Guestlist doc exists if enabled
        if (event.isGuestlistEnabled) {
            const glRef = doc(db, 'guestlists', docRef.id);
            const glSnap = await getDoc(glRef);
            if (!glSnap.exists()) {
                await setDoc(glRef, {
                    id: docRef.id,
                    title: event.title,
                    date: event.date,
                    status: 'Open',
                    createdAt: new Date().toISOString(),
                    isEmbedded: true,
                    eventId: docRef.id,
                    guestlistMode: event.guestlistMode || 'qr',
                    perUserLimit: event.perUserLimit || 5
                });
            }
        }

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
        // Recursive clean utility
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };

        const cleanedUpdates = deepClean({
            ...updates,
            category: updates.category || ''
        });

        // Safely remove id if it exists in updates to avoid rewriting document id
        delete cleanedUpdates.id;

        await updateDoc(doc(db, 'upcoming_events', id), cleanedUpdates);

        // Ensure Guestlist doc exists if newly enabled or title changed
        if (updates.isGuestlistEnabled) {
            const glRef = doc(db, 'guestlists', id);
            const glSnap = await getDoc(glRef);
            if (!glSnap.exists()) {
                await setDoc(glRef, {
                    id: id,
                    title: updates.title,
                    date: updates.date,
                    status: 'Open',
                    createdAt: new Date().toISOString(),
                    isEmbedded: true,
                    eventId: id,
                    guestlistMode: updates.guestlistMode || 'qr',
                    perUserLimit: updates.perUserLimit || 5
                }, { merge: true });
            } else {
                // Update basic info if it exists
                await updateDoc(glRef, {
                    title: updates.title,
                    date: updates.date,
                    guestlistMode: updates.guestlistMode || 'qr',
                    perUserLimit: updates.perUserLimit || 5
                });
            }
        }

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
    togglePinUpcomingEvent: async (id) => {
        const item = get().upcomingEvents.find(e => e.id === id);
        if (item) await updateDoc(doc(db, 'upcoming_events', id), { isPinned: !item.isPinned });
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
            // 1. Add to Portfolio (using setDoc to preserve ID for ticketing link)
            await setDoc(doc(db, 'portfolio', event.id), {
                title: event.title,
                image: event.image,
                category: event.category || defaultCategory,
                highlightUrl: '',
                date: event.date,
                wasEvent: true,
                isTicketed: event.isTicketed || false,
                isGuestlistEnabled: event.isGuestlistEnabled || false,
                ticketCategories: event.ticketCategories || [],
                archivedAt: new Date().toISOString()
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
    updateSiteSettings: async (updates) => {
        await updateDoc(doc(db, 'site_settings', 'general'), updates);
    },

    // Utilities Settings
    toggleUpcomingSectionVisibility: async (currentValue) => {
        await setDoc(doc(db, 'site_settings', 'general'), { showUpcomingEvents: !currentValue }, { merge: true });
    },
    updateGeneralSettings: async (settings) => {
        await setDoc(doc(db, 'site_settings', 'general'), settings, { merge: true });
    },
    updateAiConfig: async (config) => {
        await setDoc(doc(db, 'site_settings', 'ai_config'), config, { merge: true });
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
        const user = get().user;
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({ ...invoice, createdBy: user?.uid || null, createdByEmail: user?.email || null });
        delete cleaned.id;
        return await addDoc(collection(db, 'invoices'), cleaned);
    },
    updateInvoice: async (id, updates) => {
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({ ...updates });
        delete cleaned.id;
        await updateDoc(doc(db, 'invoices', id), cleaned);
    },
    updateInvoiceStatus: async (id, status) => {
        await updateDoc(doc(db, 'invoices', id), { status });
    },
    deleteInvoice: async (id) => {
        await deleteDoc(doc(db, 'invoices', id));
    },

    // Spends
    addSpend: async (spend) => {
        const user = get().user;
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({ 
            ...spend, 
            createdBy: user?.uid || null, 
            createdByEmail: user?.email || null,
            createdAt: spend.createdAt || new Date().toISOString()
        });
        delete cleaned.id;
        return await addDoc(collection(db, 'spends'), cleaned);
    },
    updateSpend: async (id, updates) => {
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({ ...updates });
        delete cleaned.id;
        await updateDoc(doc(db, 'spends', id), cleaned);
    },
    deleteSpend: async (id) => {
        await deleteDoc(doc(db, 'spends', id));
    },

    // Other Incomes
    addOtherIncome: async (income) => {
        const user = get().user;
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({ 
            ...income, 
            createdBy: user?.uid || null, 
            createdByEmail: user?.email || null,
            createdAt: income.createdAt || new Date().toISOString()
        });
        delete cleaned.id;
        return await addDoc(collection(db, 'other_incomes'), cleaned);
    },
    updateOtherIncome: async (id, updates) => {
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({ ...updates });
        delete cleaned.id;
        await updateDoc(doc(db, 'other_incomes', id), cleaned);
    },
    deleteOtherIncome: async (id) => {
        await deleteDoc(doc(db, 'other_incomes', id));
    },

    // Finance Payees
    addFinancePayee: async (payee) => {
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({
            ...payee,
            createdAt: payee.createdAt || new Date().toISOString()
        });
        delete cleaned.id;
        return await addDoc(collection(db, 'finance_payees'), cleaned);
    },
    updateFinancePayee: async (id, updates) => {
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({ ...updates });
        delete cleaned.id;
        await updateDoc(doc(db, 'finance_payees', id), cleaned);
    },
    deleteFinancePayee: async (id) => {
        await deleteDoc(doc(db, 'finance_payees', id));
    },

    // Proposals
    addProposal: async (proposal) => {
        const user = get().user;
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({
            ...proposal,
            accessLogs: [],
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || null,
            createdByEmail: user?.email || null
        });
        delete cleaned.id;

        const docRef = doc(collection(db, 'proposals'));
        const proposalId = docRef.id;

        const processed = await processAndUploadBase64Fields(cleaned, `signatures/proposals/${proposalId}`);

        await setDoc(docRef, processed);
        return proposalId;
    },
    logDocumentAccess: async (type, id, metadata) => {
        const col = type === 'proposal' ? 'proposals' : 'agreements';
        const docRef = doc(db, col, id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const logs = snap.data().accessLogs || [];
            // Keep only last 50 logs to prevent doc bloat
            const updatedLogs = [{ ...metadata, timestamp: new Date().toISOString() }, ...logs].slice(0, 50);
            await updateDoc(docRef, { accessLogs: updatedLogs });
        }
    },
    updateProposal: async (id, updates) => {
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({ ...updates });
        delete cleaned.id;

        const processed = await processAndUploadBase64Fields(cleaned, `signatures/proposals/${id}`);

        // Heal/trim accessLogs to prevent Firestore size limit issues if the document or update is bloated
        if (processed.accessLogs && Array.isArray(processed.accessLogs)) {
            if (processed.accessLogs.length > 10) {
                processed.accessLogs = processed.accessLogs.slice(0, 10);
            }
        } else {
            try {
                const docRef = doc(db, 'proposals', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.accessLogs && Array.isArray(data.accessLogs) && data.accessLogs.length > 10) {
                        processed.accessLogs = data.accessLogs.slice(0, 10);
                    }
                }
            } catch (err) {
                console.error("Failed to auto-heal accessLogs for proposal:", err);
            }
        }

        await updateDoc(doc(db, 'proposals', id), processed);
    },
    updateProposalStatus: async (id, status) => {
        await updateDoc(doc(db, 'proposals', id), { status });
    },
    deleteProposal: async (id) => {
        await deleteDoc(doc(db, 'proposals', id));
    },

    // Generated Document PDFs
    addGenDocument: async (genDoc) => {
        const user = get().user;
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({
            ...genDoc,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || null,
            createdByEmail: user?.email || null
        });
        delete cleaned.id;
        const docRef = doc(collection(db, 'gen_documents'));
        await setDoc(docRef, cleaned);
        return docRef.id;
    },
    updateGenDocument: async (id, updates) => {
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({ ...updates });
        delete cleaned.id;
        await updateDoc(doc(db, 'gen_documents', id), cleaned);
    },
    deleteGenDocument: async (id) => {
        await deleteDoc(doc(db, 'gen_documents', id));
    },
    duplicateProposal: async (id) => {
        const { proposals, addProposal } = get();
        const original = proposals.find(p => p.id === id);
        if (!original) throw new Error("Proposal not found");

        const { id: _, createdAt: __, accessLogs: ___, approvalMetadata: ____, rejectionMetadata: _____, createdBy: ______, createdByEmail: _______, ...duplicateData } = original;
        const user = get().user;
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({
            ...duplicateData,
            clientName: `${original.clientName} (REVISED)`,
            status: 'Draft',
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || null,
            createdByEmail: user?.email || null
        });
        delete cleaned.id;
        return await addProposal(cleaned);
    },

    // Agreements
    addAgreement: async (agreement) => {
        const user = get().user;
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({
            ...agreement,
            accessLogs: [],
            versions: agreement.versions || [],
            negotiationHistory: agreement.negotiationHistory || [],
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || null,
            createdByEmail: user?.email || null
        });
        delete cleaned.id;

        const docRef = doc(collection(db, 'agreements'));
        const agreementId = docRef.id;

        const processed = await processAndUploadBase64Fields(cleaned, `signatures/agreements/${agreementId}`);

        await setDoc(docRef, processed);
        return agreementId;
    },
    updateAgreement: async (id, updates) => {
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({ ...updates });
        delete cleaned.id;

        const processed = await processAndUploadBase64Fields(cleaned, `signatures/agreements/${id}`);

        // Heal/trim accessLogs to prevent Firestore size limit issues if the document or update is bloated
        if (processed.accessLogs && Array.isArray(processed.accessLogs)) {
            if (processed.accessLogs.length > 10) {
                processed.accessLogs = processed.accessLogs.slice(0, 10);
            }
        } else {
            try {
                const docRef = doc(db, 'agreements', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.accessLogs && Array.isArray(data.accessLogs) && data.accessLogs.length > 10) {
                        processed.accessLogs = data.accessLogs.slice(0, 10);
                    }
                }
            } catch (err) {
                console.error("Failed to auto-heal accessLogs for agreement:", err);
            }
        }

        await updateDoc(doc(db, 'agreements', id), processed);
    },
    updateAgreementStatus: async (id, status) => {
        await updateDoc(doc(db, 'agreements', id), { status });
    },
    deleteAgreement: async (id) => {
        await deleteDoc(doc(db, 'agreements', id));
    },
    duplicateAgreement: async (id) => {
        const { agreements, addAgreement } = get();
        const original = agreements.find(a => a.id === id);
        if (!original) throw new Error("Agreement not found");

        const { id: _, createdAt: __, accessLogs: ___, approvalMetadata: ____, createdBy: _____, createdByEmail: ______, ...duplicateData } = original;
        const user = get().user;
        const deepClean = (obj) => {
            if (Array.isArray(obj)) return obj.map(deepClean);
            if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v !== undefined) acc[k] = deepClean(v);
                    return acc;
                }, {});
            }
            return obj;
        };
        const cleaned = deepClean({
            ...duplicateData,
            agreementNumber: `${original.agreementNumber}-REV`,
            status: 'Draft',
            parentAgreementId: id,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || null,
            createdByEmail: user?.email || null
        });
        delete cleaned.id;
        return await addAgreement(cleaned);
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
            // Auto-heal: check if there's a corresponding upcoming_events doc
            const eventRef = doc(db, 'upcoming_events', id);
            const eventSnap = await getDoc(eventRef);
            if (eventSnap.exists()) {
                const eventData = eventSnap.data();
                console.log(`[Store] Auto-healing missing guestlist doc for event: ${id}`);
                await setDoc(docRef, {
                    id: id,
                    title: eventData.title || 'Event',
                    date: eventData.date || null,
                    status: 'Open',
                    createdAt: new Date().toISOString(),
                    isEmbedded: true,
                    eventId: id,
                    guestlistMode: eventData.guestlistMode || 'qr',
                    perUserLimit: eventData.perUserLimit || 5,
                    isGuestlistEnabled: true
                });
            } else {
                console.error(`[Store] Guestlist ${id} does not exist. Aborting entry.`);
                throw new Error("Guestlist no longer active.");
            }
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

    // Ticketing & Scanning Operations
    addTicketOrder: async (orderData) => {
        return await addDoc(collection(db, 'ticket_orders'), {
            ...orderData,
            createdAt: new Date().toISOString()
        });
    },
    scanTicket: async (eventId, code) => {
        console.log(`[Store] Scanning ticket ${code} for event ${eventId}`);
        
        let refId = code;
        try {
            const decodedUri = decodeURIComponent(code);
            const obj = JSON.parse(decodedUri);
            if (obj.ref) refId = obj.ref;
        } catch (e) {
            try {
                const obj = JSON.parse(code);
                if (obj.ref) refId = obj.ref;
            } catch (e2) {
                // Not a JSON, assume it's directly a code
            }
        }

        // 1. Check in ticket_orders
        const qTicket = query(collection(db, 'ticket_orders'), where('bookingRef', '==', refId), where('eventId', '==', eventId));
        const snapTicket = await getDocs(qTicket);
        
        if (!snapTicket.empty) {
            const docSnap = snapTicket.docs[0];
            const data = docSnap.data();
            
            // Validate payment status
            if (data.status !== 'approved' && data.status !== 'dispatched') {
                return { valid: false, message: 'PAYMENT NOT VERIFIED' };
            }

            if (data.isScanned) {
                return { valid: true, scanned: true, data: { code: refId, name: data.customerName, type: 'Paid Ticket' } };
            }

            // Mark as scanned
            await updateDoc(doc(db, 'ticket_orders', docSnap.id), {
                isScanned: true,
                scannedAt: new Date().toISOString()
            });

            return { valid: true, scanned: false, data: { code: refId, name: data.customerName, type: 'Paid Ticket', items: data.items } };
        }

        // 2. Check in guestlist entries
        const qGuest = query(collection(db, 'guestlists', eventId, 'entries'), where('bookingRef', '==', refId));
        const snapGuest = await getDocs(qGuest);

        if (!snapGuest.empty) {
            const docSnap = snapGuest.docs[0];
            const data = docSnap.data();

            if (data.attended) {
                return { valid: true, scanned: true, data: { code: refId, name: data.customerName || data.name, type: 'Guestlist' } };
            }

            // Mark as attended
            await updateDoc(docSnap.ref, {
                attended: true,
                attendedAt: new Date().toISOString()
            });

            return { valid: true, scanned: false, data: { code: refId, name: data.customerName || data.name, type: 'Guestlist', guestsCount: data.guestsCount } };
        }

        // 3. Fallback: Global check to see if it's the WRONG EVENT
        const globalTicket = query(collection(db, 'ticket_orders'), where('bookingRef', '==', refId));
        const globalTicketSnap = await getDocs(globalTicket);
        if (!globalTicketSnap.empty) {
            return { valid: false, message: `WRONG EVENT: Valid for "${globalTicketSnap.docs[0].data().eventTitle}"` };
        }

        const globalGuest = query(collectionGroup(db, 'entries'), where('bookingRef', '==', refId));
        const globalGuestSnap = await getDocs(globalGuest);
        if (!globalGuestSnap.empty) {
            return { valid: false, message: `WRONG EVENT: Valid for "${globalGuestSnap.docs[0].data().title || 'Another Event'}"` };
        }

        return { valid: false, message: 'INVALID PASS: CODE NOT FOUND' };
    },
    updateTicketOrderStatus: async (orderId, status) => {
        await updateDoc(doc(db, 'ticket_orders', orderId), { status });

        if (status === 'dispatched') {
            try {
                const orderDoc = await getDoc(doc(db, 'ticket_orders', orderId));
                if (orderDoc.exists()) {
                    const orderData = orderDoc.data();
                    let eventName = 'Event';
                    if (orderData.eventId) {
                        const eventDoc = await getDoc(doc(db, 'upcoming_events', orderData.eventId));
                        if (eventDoc.exists()) {
                            eventName = eventDoc.data().title || 'Event';
                        }
                    }
                    
                    const ticketsHtml = (orderData.items || []).map(item => `
                        <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                            <strong>${item.name}</strong> x ${item.count}
                        </div>
                    `).join('');
                    
                    await sendBookingConfirmation({
                        to_name: orderData.customerName,
                        to_email: orderData.customerEmail,
                        event_name: eventName,
                        booking_ref: orderData.bookingRef,
                        tickets_html: ticketsHtml,
                        total_amount: orderData.totalAmount || 0,
                        payment_ref: orderData.paymentRef || 'FREE',
                        items: orderData.items || []
                    });
                }
            } catch (err) {
                console.error("Failed to send booking confirmation email on dispatch:", err);
            }
        }
    },

    // Messages
    markMessageRead: async (id, status = 'read') => {
        await updateDoc(doc(db, 'messages', id), { status });
    },
    deleteMessage: async (id) => {
        await deleteDoc(doc(db, 'messages', id));
    },

    // Campus Profiles
    addCampusProfile: async (profile) => {
        const namePart = (profile.fullName || 'CAMPUS').split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const referralCode = `CAMPUS-${namePart}-${randomPart}`;

        const finalProfile = await processAndUploadBase64Fields({
            ...profile,
            referralCode,
            referralsCount: 0,
            campusPoints: 0,
            redeemedPerks: [],
        }, `campus/${profile.uid}`);
        await setDoc(doc(db, 'campus_profiles', profile.uid), finalProfile);
    },
    redeemCampusPerk: async (uid, perk, cost) => {
        const profileRef = doc(db, 'campus_profiles', uid);
        await updateDoc(profileRef, {
            campusPoints: increment(-cost),
            redeemedPerks: arrayUnion({ perkId: perk.id, title: perk.title, cost, redeemedAt: new Date().toISOString() })
        });
    },
    updateCampusProfile: async (uid, data) => {
        const finalData = await processAndUploadBase64Fields(data, `campus/${uid}`);
        await updateDoc(doc(db, 'campus_profiles', uid), finalData);
    },
    deleteCampusProfile: async (uid) => {
        await deleteDoc(doc(db, 'campus_profiles', uid));
    },

    // Campus Activations
    addCampusActivation: async (activation) => {
        const finalActivation = await processAndUploadBase64Fields({
            ...activation,
            createdAt: serverTimestamp()
        }, `campus_activations/${Date.now()}`);
        await addDoc(collection(db, 'campus_activations'), finalActivation);
    },
    updateCampusActivation: async (id, data) => {
        const finalData = await processAndUploadBase64Fields(data, `campus_activations/${id}`);
        await updateDoc(doc(db, 'campus_activations', id), finalData);
    },
    deleteCampusActivation: async (id) => {
        await deleteDoc(doc(db, 'campus_activations', id));
    },
    
    // Campus Activation Entries (Gamification Tracking)
    joinCampusActivation: async (campaignId, userId, userData) => {
        const entryId = `${campaignId}_${userId}`;
        await setDoc(doc(db, 'campus_activation_entries', entryId), {
            campaignId,
            userId,
            ...userData,
            points: 0,
            completedTasks: [],
            joinedAt: serverTimestamp()
        });
    },
    completeActivationTask: async (entryId, taskId, points) => {
        const entryRef = doc(db, 'campus_activation_entries', entryId);
        await updateDoc(entryRef, {
            completedTasks: arrayUnion(taskId),
            points: increment(points)
        });
    },

    // Campus Wall Posts (Spotted & Gigs)
    addCampusWallPost: async (post) => {
        await addDoc(collection(db, 'campus_wall_posts'), {
            ...post,
            createdAt: serverTimestamp()
        });
    },
    deleteCampusWallPost: async (id) => {
        await deleteDoc(doc(db, 'campus_wall_posts', id));
    },

    // Campus Guestlist Passes (Dynamic QR)
    generateGuestlistPass: async (eventId, userId, userData) => {
        const passId = `${eventId}_${userId}`;
        await setDoc(doc(db, 'campus_guestlist_passes', passId), {
            eventId,
            userId,
            ...userData,
            claimedAt: serverTimestamp(),
            status: 'active'
        });
    },

    // Creators / Influencers
    addCreator: async (creator, sendWelcome = true) => {
        const creatorId = (creator.creatorId || creator.uid.slice(0, 8)).toUpperCase();
        const finalCreator = {
            ...creator,
            creatorId,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'creators', creator.uid), finalCreator);

        if (creator.referredBy) {
            const referredBy = creator.referredBy.trim();
            const { creators } = get();
            
            const referrer = creators.find(c => 
                c.uid === referredBy || 
                (c.creatorId && c.creatorId.toUpperCase() === referredBy.toUpperCase()) ||
                (c.instagram && c.instagram.toLowerCase() === referredBy.toLowerCase()) ||
                (c.linkedin && c.linkedin.toLowerCase() === referredBy.toLowerCase())
            );

            if (referrer) {
                try {
                    await addDoc(collection(db, 'notifications'), {
                        userId: referrer.uid,
                        title: "New Creator Referral! 🚀",
                        message: `${creator.displayName || creator.name || 'A creator'} joined Newbi using your referral link!`,
                        type: "info",
                        isRead: false,
                        createdAt: new Date().toISOString()
                    });
                } catch (notiErr) {
                    console.error("Failed to add referral notification:", notiErr);
                }
            }
        }

        if (sendWelcome && creator.email) {
            sendCreatorWelcomeEmail(creator.email, creator.displayName || creator.name || 'Creator')
                .catch(err => console.error("Error sending welcome email to creator:", err));
        }
    },


    updateCreator: async (uid, updates) => {
        const creatorRef = doc(db, 'creators', uid);
        let prevStatus = null;
        let email = null;
        let name = null;
        try {
            const snap = await getDoc(creatorRef);
            if (snap.exists()) {
                const data = snap.data();
                prevStatus = data.profileStatus;
                email = data.email;
                name = data.displayName || data.name || 'Creator';
            }
        } catch (e) {
            console.error("Error fetching creator for status update check:", e);
        }

        await updateDoc(creatorRef, updates);

        if (updates.profileStatus === 'approved' && prevStatus !== 'approved' && email) {
            sendCreatorApprovedEmail(email, name)
                .catch(err => console.error("Error sending creator approval email:", err));
        }
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
    addClientRequest: async (request) => {
        const user = get().user;
        const requestData = {
            ...request,
            uid: user?.uid || null,
            email: user?.email || request.email || null,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        return await addDoc(collection(db, 'client_requests'), requestData);
    },
    updateArtist: async (id, updates) => {
        await updateDoc(doc(db, 'artists', id), updates);
    },
    deleteArtist: async (id) => {
        await deleteDoc(doc(db, 'artists', id));
    },

    castArtistToGig: async (artistId, gigId, status = 'shortlisted') => {
        const artistRef = doc(db, 'artists', artistId);
        await updateDoc(artistRef, {
            [`gigCasting.${gigId}`]: {
                status,
                assignedAt: new Date().toISOString()
            }
        });
    },

    applyArtistToGig: async (artistId, gigId) => {
        const artistRef = doc(db, 'artists', artistId);
        const artistSnap = await getDoc(artistRef);
        if (artistSnap.exists()) {
            const data = artistSnap.data();
            const gigCasting = data.gigCasting || {};
            
            if (!gigCasting[gigId]) {
                await updateDoc(artistRef, {
                    [`gigCasting.${gigId}`]: {
                        status: 'applied',
                        appliedAt: new Date().toISOString()
                    }
                });
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
        const docRef = await addDoc(collection(db, 'campaigns'), {
            ...campaign,
            minInstagramFollowers: campaign.minInstagramFollowers || 0,
            thumbnail: campaign.thumbnail || '',
            tasks: campaign.tasks || [], // Store tasks directly in campaign structure for now
            createdAt: new Date().toISOString()
        });

        if (campaign.status === 'Open') {
            notifyMatchingCreatorsOfCampaign({ ...campaign, id: docRef.id }, get().creators);
        }
        return docRef.id;
    },
    updateCampaign: async (id, updates) => {
        let prevStatus = null;
        try {
            const docSnap = await getDoc(doc(db, 'campaigns', id));
            if (docSnap.exists()) {
                prevStatus = docSnap.data().status;
            }
        } catch (err) {
            console.error("Error fetching previous campaign status:", err);
        }

        await updateDoc(doc(db, 'campaigns', id), updates);

        if (updates.status === 'Open' && prevStatus !== 'Open') {
            try {
                const campaignDoc = await getDoc(doc(db, 'campaigns', id));
                if (campaignDoc.exists()) {
                    notifyMatchingCreatorsOfCampaign({ ...campaignDoc.data(), id }, get().creators);
                }
            } catch (err) {
                console.error("Error fetching campaign doc for notifications:", err);
            }
        }
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
    rejectTicketOrder: async (id) => {
        await updateDoc(doc(db, 'ticket_orders', id), {
            status: 'rejected',
            rejectedAt: new Date().toISOString()
        });
    },

    // Coupons System
    addCoupon: async (coupon) => {
        await addDoc(collection(db, 'coupons'), {
            ...coupon,
            usedCount: 0,
            createdAt: serverTimestamp(),
            isActive: true
        });
    },
    updateCoupon: async (id, updates) => {
        await updateDoc(doc(db, 'coupons', id), updates);
    },
    deleteCoupon: async (id) => {
        await deleteDoc(doc(db, 'coupons', id));
    },
    validateCoupon: async (code, eventId) => {
        const { coupons } = get();
        const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.isActive);
        
        if (!coupon) throw new Error("Invalid or inactive coupon code.");
        
        // Expiry check
        if (coupon.expiryDate) {
            const expiry = new Date(coupon.expiryDate);
            const now = new Date();
            if (expiry < now) throw new Error("This coupon code has expired.");
        }
        
        // Usage limit check
        if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
            throw new Error("This coupon has reached its usage limit.");
        }
        
        // Event restriction check
        if (coupon.eventId && coupon.eventId !== eventId) {
            throw new Error("This coupon is not valid for this specific event.");
        }
        
        return coupon;
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
        if (!email) {
            throw new Error("No email address associated with this account.");
        }
        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            
            const text = await response.text();
            
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                if (text.trim().startsWith('<')) {
                    // Vite local dev server fallback page or other HTML response
                    throw { isFallbackable: true, message: 'Vite dev fallback' };
                }
                throw new Error(`Non-JSON API response (Status: ${response.status})`);
            }

            if (!response.ok) {
                if (response.status === 404) {
                    throw { isFallbackable: true, message: 'Endpoint not found (404)' };
                }
                throw new Error(result.details || result.error || `Server Error: ${response.status}`);
            }

            return result;
        } catch (error) {
            if (error && error.isFallbackable) {
                console.warn("[Auth] Custom reset failed, falling back to client-side Firebase Auth:", error.message);
                try {
                    const { sendPasswordResetEmail } = await import('firebase/auth');
                    const { auth } = await import('./firebase');
                    if (!auth) throw new Error("Firebase Auth is not initialized.");
                    await sendPasswordResetEmail(auth, email);
                    return { success: true, fallback: true };
                } catch (fallbackError) {
                    console.error("[Auth] Firebase Auth fallback also failed:", fallbackError);
                    let msg = fallbackError.message;
                    if (fallbackError.code === 'auth/user-not-found') msg = 'Email address is not registered.';
                    else if (fallbackError.code === 'auth/invalid-email') msg = 'Invalid email address format.';
                    else if (fallbackError.code === 'auth/too-many-requests') msg = 'Too many requests. Try again later.';
                    else if (fallbackError.code === 'auth/unauthorized-continue-uri') msg = 'Domain not authorized for password reset.';
                    throw new Error(msg);
                }
            } else {
                console.error("[Auth] Custom reset failed with server error:", error.message);
                throw error;
            }
        }
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

    updateUserProfile: async (uid, data) => {
        const { updateProfile } = await import('firebase/auth');
        const { auth } = await import('./firebase');

        // 1. Sync with Firestore
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, data, { merge: true });
        
        // 2. If it's the current user, sync with Firebase Auth profile
        if (auth.currentUser && auth.currentUser.uid === uid) {
            const updates = {};
            if (data.displayName) updates.displayName = data.displayName;
            // Note: email and photoURL can also be updated here if needed
            if (Object.keys(updates).length > 0) {
                await updateProfile(auth.currentUser, updates);
            }
        }

        // 3. Update local state
        const { user } = get();
        if (user && user.uid === uid) {
            set({ user: { ...user, ...data } });
        }
    },

    checkUserRole: async (firebaseUser) => {
        if (!firebaseUser) {
            localStorage.removeItem(AUTH_CACHE_KEY);
            set({ user: null, authInitialized: true });
            return;
        }

        let role = 'unauthorized';
        let hasJoinedTribe = false;
        let hasJoinedWhatsapp = false;
        let displayName = firebaseUser.displayName || '';
        let adminSnapshot = null;
        let userDoc = null;

        try {
            // Parallelize Firestore lookups to reduce auto-login delay
            const [adminSnap, uDoc] = await Promise.all([
                getDocs(query(collection(db, 'admins'), where('email', '==', firebaseUser.email))),
                getDoc(doc(db, 'users', firebaseUser.uid))
            ]);
            adminSnapshot = adminSnap;
            userDoc = uDoc;

            if (adminSnapshot && !adminSnapshot.empty) {
                const adminData = adminSnapshot.docs[0].data();
                role = adminData.role || 'unauthorized';
                displayName = adminData.displayName || displayName;
            }

            const userRef = doc(db, 'users', firebaseUser.uid);
            if (userDoc?.exists()) {
                const userData = userDoc.data();

                // CHECK BLOCK STATUS
                if (userData.isBlocked) {
                    console.warn("User is blocked. Denying access.");
                    set({ user: null, authInitialized: true });
                    // Force logout if currently signed in
                    const { getAuth } = await import('firebase/auth');
                    const auth = getAuth();
                    await auth.signOut();
                    useStore.getState().addToast("Your account has been suspended. Please contact support.", 'error');
                    return;
                }

                // CHECK FORCE LOGOUT STATUS
                if (userData.forceLogoutBefore) {
                    const sessionTimestamp = getSessionTimestamp();
                    const forceLogoutTime = new Date(userData.forceLogoutBefore).getTime();
                    if (sessionTimestamp < forceLogoutTime) {
                        console.warn("User session has been revoked. Denying access.");
                        set({ user: null, authInitialized: true });
                        const { getAuth } = await import('firebase/auth');
                        const auth = getAuth();
                        await auth.signOut();
                        useStore.getState().addToast("Your session has expired. Please sign in again.", 'warning');
                        return;
                    }
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

        const finalUser = {
            email: firebaseUser.email || (userDoc?.exists() ? userDoc.data().email : null),
            uid: firebaseUser.uid,
            role: role,
            displayName: displayName,
            phoneNumber: firebaseUser.phoneNumber || (userDoc?.exists() ? userDoc.data().phoneNumber : null),
            hasJoinedTribe: hasJoinedTribe,
            hasJoinedWhatsapp: hasJoinedWhatsapp
        };

        // Cache the session for instant retrieval on refresh
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
            user: finalUser,
            timestamp: Date.now()
        }));

        set({
            user: finalUser,
            authInitialized: true
        });

        // Initialize real-time listener for current user's profile updates
        if (finalUser && finalUser.uid) {
            get().setupUserListener(finalUser.uid);
        }
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
        const { userListenerUnsubscribe } = get();
        if (userListenerUnsubscribe) {
            userListenerUnsubscribe();
        }
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        await auth.signOut();
        localStorage.removeItem(AUTH_CACHE_KEY);
        set({ user: null, userListenerUnsubscribe: null });
    },

    setupUserListener: (uid) => {
        const { userListenerUnsubscribe } = get();
        if (userListenerUnsubscribe) {
            userListenerUnsubscribe();
        }

        const unsub = onSnapshot(doc(db, 'users', uid), (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.data();
                const currentUser = get().user;
                if (!currentUser) return;

                // 1. Check if user is blocked
                if (userData.isBlocked) {
                    console.warn("User is blocked. Revoking local session.");
                    get().logout();
                    get().addToast("Your account has been suspended. Please contact support.", 'error');
                    return;
                }

                // 2. Check if user has been logged out from all devices
                if (userData.forceLogoutBefore) {
                    const sessionTimestamp = getSessionTimestamp();
                    const forceLogoutTime = new Date(userData.forceLogoutBefore).getTime();
                    if (sessionTimestamp < forceLogoutTime) {
                        console.warn("User session has been revoked. Revoking local session.");
                        get().logout();
                        get().addToast("Your session has expired. Please sign in again.", 'warning');
                        return;
                    }
                }
            }
        }, (error) => {
            console.error("Error in real-time user listener:", error);
        });

        set({ userListenerUnsubscribe: unsub });
    },

    revokeSessions: async (targetUid = null, targetEmail = null) => {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Authentication required");

        const token = await currentUser.getIdToken(true);
        const response = await fetch('/api/revoke-sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ targetUid, targetEmail })
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal || text.trim().startsWith('<') || response.status === 404) {
                // local development fallback
                console.warn("[Revoke Sessions] API returned HTML or 404 on localhost. Falling back to client-only action.");
                const { db } = await import('./firebase');
                const { doc, setDoc, query, collection, where, getDocs } = await import('firebase/firestore');
                
                let resolvedUid = targetUid;
                // If resolving admin where targetUid is doc.id (and not a real Auth UID), resolve it via email
                if (targetEmail && (!resolvedUid || resolvedUid.length < 20 || resolvedUid === targetEmail)) {
                    try {
                        const userQuery = query(collection(db, 'users'), where('email', '==', targetEmail));
                        const userSnap = await getDocs(userQuery);
                        if (!userSnap.empty) {
                            resolvedUid = userSnap.docs[0].id;
                        }
                    } catch (err) {
                        console.error("[Revoke Sessions] Failed to resolve UID from email:", err);
                    }
                }
                
                if (!resolvedUid) {
                    resolvedUid = currentUser.uid;
                }
                
                await setDoc(doc(db, 'users', resolvedUid), { forceLogoutBefore: new Date().toISOString() }, { merge: true });
                
                if (resolvedUid === currentUser.uid) {
                    await get().logout();
                }
                return { success: true, message: 'Vite dev fallback session revoke executed' };
            }
            throw new Error(`Non-JSON API response (Status: ${response.status})`);
        }

        if (!response.ok) {
            throw new Error(data.error || "Failed to revoke sessions");
        }

        // If revoking own sessions, run local logout
        if (!targetUid || targetUid === currentUser.uid) {
            await get().logout();
        }
        return data;
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
            useStore.getState().addToast(`Firestore Global Update Failed: ${error.message}`, 'error');
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
    incrementPostView: async (id) => {
        try {
            await updateDoc(doc(db, 'posts', id), {
                viewCount: increment(1)
            });
        } catch (error) {
            console.error("Failed to increment view count:", error);
        }
    },
    incrementPostShare: async (id) => {
        try {
            await updateDoc(doc(db, 'posts', id), {
                shareCount: increment(1)
            });
        } catch (error) {
            console.error("Failed to increment share count:", error);
        }
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

    saveFcmToken: async (token) => {
        const { user } = get();
        if (user) {
            await setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true });
        }
        set({ fcmToken: token });
    },
    logDocumentAccess: async (type, docId, metadata) => {
        const col = type === 'proposal' ? 'proposals' : type === 'invoice' ? 'invoices' : 'agreements';
        const docRef = doc(db, col, docId);
        const logEntry = {
            ...metadata,
            timestamp: new Date().toISOString()
        };
        
        try {
            // Use arrayUnion for efficiency
            await updateDoc(docRef, {
                lastOpened: new Date().toISOString(),
                accessLogs: arrayUnion(logEntry)
            });
        } catch (err) {
            console.error("Log access failed:", err);
        }
    },
    clearAllAccessLogs: async () => {
        const { proposals, agreements, invoices } = get();
        const updatePromises = [];
        
        proposals.forEach(p => {
            if (p.id) {
                updatePromises.push(updateDoc(doc(db, 'proposals', p.id), { accessLogs: [] }));
            }
        });
        agreements.forEach(a => {
            if (a.id) {
                updatePromises.push(updateDoc(doc(db, 'agreements', a.id), { accessLogs: [] }));
            }
        });
        invoices.forEach(i => {
            if (i.id) {
                updatePromises.push(updateDoc(doc(db, 'invoices', i.id), { accessLogs: [] }));
            }
        });
        
        try {
            await Promise.all(updatePromises);
            console.log("Successfully cleared all access logs.");
        } catch (err) {
            console.error("Failed to clear access logs:", err);
        }
    },

    // ========== Document Hub ==========
    addDocument: async (docData) => {
        const cleanData = { ...docData };
        delete cleanData.id;
        cleanData.createdAt = new Date().toISOString();
        cleanData.updatedAt = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'documents'), cleanData);
        return docRef.id;
    },
    updateDocument: async (id, updates) => {
        const cleanUpdates = { ...updates };
        delete cleanUpdates.id;
        cleanUpdates.updatedAt = new Date().toISOString();
        await updateDoc(doc(db, 'documents', id), cleanUpdates);
    },
    deleteDocument: async (id) => {
        // Check if document has a storage file to clean up
        const document = get().documents.find(d => d.id === id);
        if (document?.storagePath) {
            try {
                const storageRef = ref(storage, document.storagePath);
                const { deleteObject } = await import('firebase/storage');
                await deleteObject(storageRef);
            } catch (e) {
                console.warn('Failed to delete storage file:', e);
            }
        }
        await deleteDoc(doc(db, 'documents', id));
    },
}));
