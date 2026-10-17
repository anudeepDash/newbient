import { create } from 'zustand';
import { db, storage, auth } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs, where, setDoc, getDoc, increment, arrayUnion, collectionGroup, serverTimestamp, limit, getCountFromServer, startAfter, writeBatch, runTransaction, FieldPath } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { notifyEvent, subscribeToNewsletter } from './mailApi';
import { normalizePhoneNumber } from './utils';
import { couponProblem, normalizeCouponCode, isGuestAdmissible, orderItems, orderTicketCount } from './ticketing';
import { invoiceBalance, INVOICE_STATUS, nextInvoiceNumber, todayKey } from './invoicing';
import { CONTRACT_STATUS, CONTRACT_NON_COPYABLE_FIELDS } from './contracts';
import { isProposalClosed, isProposalExpired, nextProposalNumber, proposalValue, PROPOSAL_NON_COPYABLE_FIELDS, PROPOSAL_STATUS } from './proposals';
import { extractSocialUsername, hasDisallowedLink } from './socialUtils';
import { safeLocalStorage } from './storage';
import { DEFAULT_CREATOR_GROUPS, isCampaignCityMatch } from './constants';
import { TOAST_TYPES, toFriendlyMessage, getSupportHint, getToastDuration } from './toastCopy';
import { indexAppSubmissions, mergeAppSubmissions, isAppSubmission } from './creator/appSubmissions';
import { ADMIN_ROLES } from '../constants/roles';

const MAX_TOASTS = 4;
let toastSeq = 0;

// JSON headers plus the signed-in user's ID token, for /api routes that check who is calling.
const authJsonHeaders = async (forceRefresh = false) => {
    const headers = { 'Content-Type': 'application/json' };
    try {
        const token = auth?.currentUser ? await auth.currentUser.getIdToken(forceRefresh) : null;
        if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
        // Fall through without a token; the API answers 401 if it needs one.
    }
    return headers;
};

// Read state for global notifications, kept per user in this browser so one person
// reading a broadcast doesn't mark it read for everyone.
const readGlobalsKey = (uid) => `nb_read_global_notifications_${uid}`;
const getReadGlobalNotificationIds = (uid) => {
    if (!uid) return new Set();
    try {
        return new Set(JSON.parse(safeLocalStorage.getItem(readGlobalsKey(uid)) || '[]'));
    } catch (e) {
        return new Set();
    }
};
const markGlobalNotificationsRead = (uid, ids = []) => {
    if (!uid || !ids.length) return;
    const next = getReadGlobalNotificationIds(uid);
    ids.forEach(id => next.add(id));
    try {
        safeLocalStorage.setItem(readGlobalsKey(uid), JSON.stringify(Array.from(next).slice(-500)));
    } catch (e) { /* storage unavailable */ }
};

const AUTH_CACHE_KEY = 'nb_auth_session';
const getCachedSession = () => {
    try {
        const session = safeLocalStorage.getItem(AUTH_CACHE_KEY);
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
        const session = safeLocalStorage.getItem(AUTH_CACHE_KEY);
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
        const uploadPromise = uploadBytes(storageRef, blob).then(() => getDownloadURL(storageRef));
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Storage timeout')), 2000));
        return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (e) {
        console.warn("Firebase Storage unavailable, falling back to Cloudinary...", e);
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
            console.warn("Storage upload failed, preserving base64 asset locally:", cloudinaryError);
            if (base64String.length < 800000) {
                return base64String;
            }
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

const notifyMatchingCreatorsOfCampaign = async (campaignData, creatorsList, { again = false } = {}) => {
    try {
        let allCreators = creatorsList || [];
        if (allCreators.length === 0) {
            const snapshot = await getDocs(collection(db, 'creators'));
            allCreators = snapshot.docs.map(d => ({ ...d.data(), uid: d.id }));
        }

        // Same city rules as eligibility ("Bangalore" matches "Bengaluru"; "Any",
        // "Pan-India"… mean everyone). An empty creator city only matches a
        // campaign open to everyone, so this doubles as the "universal" check.
        const isUniversal = isCampaignCityMatch(campaignData.targetCity, '');
        const matchingCreators = allCreators.filter(creator => {
            if (!creator.email && !creator.uid && !creator.id) return false;
            return isUniversal || isCampaignCityMatch(campaignData.targetCity, creator.city);
        });

        if (matchingCreators.length > 0) {
            // 1. Email + push to matching creators: queued on the server, which
            // works out who matches the campaign city from the saved record.
            if (campaignData.id && matchingCreators.some(c => c.email)) {
                await notifyEvent('campaign-invite', { campaignId: campaignData.id, again });
            }

            // 2. Create in-app notification for each matching creator. A campaign
            // open to everyone gets the single broadcast below instead, so
            // creators don't see the same alert twice.
            const notificationPromises = (isUniversal ? [] : matchingCreators).map(creator => {
                const creatorUid = creator.uid || creator.userId || creator.id;
                if (!creatorUid) return Promise.resolve();
                return addDoc(collection(db, 'notifications'), {
                    userId: creatorUid,
                    title: `🔥 New Campaign: ${campaignData.title}`,
                    message: `${campaignData.reward ? `Reward: ${campaignData.reward}. ` : ''}A new brand campaign is live in ${campaignData.targetCity || 'Universal'}. Check the brief and apply!`,
                    type: 'campaign',
                    link: `/campaign/${campaignData.id}`,
                    campaignId: campaignData.id,
                    isRead: false,
                    createdAt: new Date().toISOString()
                }).catch(e => console.error("Error creating creator in-app notification:", e));
            });
            await Promise.all(notificationPromises);
        }

        // 3. Broadcast in-app notification if campaign is open to all cities
        if (isUniversal) {
            await addDoc(collection(db, 'notifications'), {
                userId: null,
                title: `🔥 New Campaign Live: ${campaignData.title}`,
                message: `${campaignData.reward ? `Reward: ${campaignData.reward}. ` : ''}New creator brief is now open for applications.`,
                type: 'campaign',
                link: `/campaign/${campaignData.id}`,
                campaignId: campaignData.id,
                isRead: false,
                createdAt: new Date().toISOString()
            }).catch(e => console.error("Error creating broadcast campaign notification:", e));
        }
    } catch (err) {
        console.error("Error notifying creators of campaign:", err);
    }
};

// Firestore rejects `undefined` anywhere in a document; drop those keys.
const stripUndefinedDeep = (value) => {
    if (Array.isArray(value)) return value.map(stripUndefinedDeep);
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (v !== undefined) out[k] = stripUndefinedDeep(v);
        }
        return out;
    }
    return value;
};

// The campaign editor holds a copy of the deliverables from when it opened.
// Creators keep submitting (and admins keep reviewing) meanwhile, so progress
// always comes from the stored campaign, never from the editor's copy.
const TASK_PROGRESS_FIELDS = ['submissions', 'completedBy', 'verifiedBy'];
const mergeLiveTaskProgress = (formTasks, liveTasks) => {
    const live = new Map((liveTasks || []).map(t => [String(t.id), t]));
    return (formTasks || []).map(t => {
        const liveTask = live.get(String(t.id));
        if (!liveTask) return t;
        const merged = { ...t };
        TASK_PROGRESS_FIELDS.forEach(f => {
            if (liveTask[f] !== undefined) merged[f] = liveTask[f];
        });
        return merged;
    });
};

const initialUser = getCachedSession();

const activeListeners = {};

// Pinned first, then open before closed, then newest.
const sortCampaigns = (data) => {
    return data.sort((a, b) => {
        // 1. Pinned to top
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
            return a.isPinned ? -1 : 1;
        }
        // 2. Open campaigns before Closed campaigns
        const aIsOpen = a.status === 'Open';
        const bIsOpen = b.status === 'Open';
        if (aIsOpen !== bIsOpen) {
            return aIsOpen ? -1 : 1;
        }
        // 3. Date added (newest first)
        const getTs = (c) => {
            if (!c) return 0;
            const raw = c.createdAt || c.dateAdded || c.updatedAt;
            if (!raw) return 0;
            if (typeof raw === 'number') return raw;
            if (typeof raw === 'string') {
                const p = Date.parse(raw);
                return isNaN(p) ? 0 : p;
            }
            if (typeof raw === 'object') {
                if (typeof raw.toDate === 'function') return raw.toDate().getTime();
                if (typeof raw.seconds === 'number') return raw.seconds * 1000;
            }
            return 0;
        };
        return getTs(b) - getTs(a);
    });
};

// Admin only: app task submissions (campaigns/{id}/submissions/{uid}), merged
// into the campaigns list so every admin screen sees them (lib/creator/appSubmissions.js).
let rawCampaigns = null;
let appSubmissionIndex = {};
let appSubmissionsUnsub = null;

// ── Giveaway helpers ─────────────────────────────────────────────────────
// The end moment of a giveaway in local time: endDate (YYYY-MM-DD) plus
// endTime (HH:mm), or the end of that day when no time is set.
export const giveawayEndsAt = (g) => {
    if (!g?.endDate) return null;
    const day = String(g.endDate).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        const d = new Date(g.endDate);
        return isNaN(d.getTime()) ? null : d;
    }
    const time = /^\d{2}:\d{2}/.test(g.endTime || '') ? g.endTime.slice(0, 5) : '23:59';
    const d = new Date(`${day}T${time}:00`);
    return isNaN(d.getTime()) ? null : d;
};
export const giveawayHasEnded = (g, now = new Date()) => {
    if (!g) return true;
    if (String(g.status || '').toLowerCase() === 'closed') return true;
    const end = giveawayEndsAt(g);
    return Boolean(end && end < now);
};
const giveawayMirrorEvent = (g) => ({
    title: g.name || '',
    date: g.endDate ? `${String(g.endDate).slice(0, 10)}${g.endTime ? `T${g.endTime}` : ''}` : '',
    category: 'giveaway',
    description: g.description || '',
    location: g.location || 'Online',
    buttonText: g.buttonText || 'PARTICIPATE NOW',
    image: g.posterUrl || '',
    link: `/giveaway/${g.slug || ''}`,
    isTicketed: g.isTicketed || false,
    ticketPrice: g.ticketCategories?.[0]?.price || 0,
    ticketCategories: g.ticketCategories || [],
    venueLayout: g.venueLayout || '',
    giveawaySlug: g.slug || ''
});
const giveawayMirrorAnnouncement = (g) => ({
    title: `NEW GIVEAWAY: ${g.name || ''}`,
    content: g.description || '',
    image: g.posterUrl || '',
    link: `/giveaway/${g.slug || ''}`
});

export const useStore = create((set, get) => ({
    // ... existing state ...
    
    // Centralized Cloudinary Upload Utility
    uploadToCloudinary: async (file) => {
        if (!file) return null;

        const extension = file.name?.split('.').pop()?.toLowerCase();
        const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'];
        const isVideo = file.type?.startsWith("video/") || videoExtensions.includes(extension);

        // Try Firebase Storage first for PDF/SVG files with strict 2s timeout
        if (file.type === "application/pdf" || file.type.includes("svg") || file.name?.toLowerCase().endsWith(".svg")) {
            try {
                const uniqueId = Math.random().toString(36).substring(2, 9);
                const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const storagePath = `uploads/file_${uniqueId}_${cleanName}`;
                const storageRef = ref(storage, storagePath);
                const uploadPromise = uploadBytes(storageRef, file, { contentType: file.type || 'application/pdf' }).then(() => getDownloadURL(storageRef));
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Storage timeout')), 2000));
                return await Promise.race([uploadPromise, timeoutPromise]);
            } catch (firebaseError) {
                console.warn("Firebase Storage fast-fallback to Cloudinary:", firebaseError);
            }
        }

        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "maw1e4ud");
        data.append("cloud_name", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgtalrz4n");

        let resourceType = "image";
        if (isVideo) {
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
            console.warn("Cloudinary upload failed, falling back to Firebase Storage:", error);
            try {
                const uniqueId = Math.random().toString(36).substring(2, 9);
                const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const storagePath = `uploads/fallback_${uniqueId}_${cleanName}`;
                const storageRef = ref(storage, storagePath);
                const metadata = file.type ? { contentType: file.type } : (resourceType === 'video' ? { contentType: 'video/mp4' } : undefined);
                await uploadBytes(storageRef, file, metadata);
                return await getDownloadURL(storageRef);
            } catch (firebaseError) {
                console.error("Firebase fallback also failed:", firebaseError);
                const message = (!error.message || error.message.includes("failed") || error.message.includes("Failed"))
                    ? "Couldn't upload your file. Please check your internet connection or try a smaller file." 
                    : error.message;
                throw new Error(message);
            }
        }
    },

    // Dedicated Resumable Video Upload Utility with Real-time Progress Tracking
    uploadVideoFile: async (file, onProgress = null) => {
        if (!file) return null;

        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgtalrz4n";
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "maw1e4ud";

        // Step 1: Upload directly to Cloudinary with real-time XHR progress (avoids Firebase CORS/rules hangs)
        try {
            return await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", uploadPreset);
                formData.append("cloud_name", cloudName);

                xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, true);

                // Real-time byte upload tracking
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && event.total > 0) {
                        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
                        if (onProgress) onProgress(percent);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const res = JSON.parse(xhr.responseText);
                            if (res.secure_url) {
                                if (onProgress) onProgress(100);
                                resolve(res.secure_url);
                                return;
                            }
                        } catch (parseErr) {
                            console.warn("Error parsing upload response:", parseErr);
                        }
                    }
                    try {
                        const errObj = JSON.parse(xhr.responseText);
                        reject(new Error(errObj.error?.message || `Upload failed with status ${xhr.status}`));
                    } catch {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => {
                    reject(new Error("Network connection error during video upload."));
                };

                xhr.ontimeout = () => {
                    reject(new Error("Video upload timed out."));
                };

                // 2.5 minutes timeout for video processing
                xhr.timeout = 150000;

                xhr.send(formData);
            });
        } catch (cloudinaryErr) {
            console.warn("Cloudinary video upload failed, trying Firebase Storage fallback:", cloudinaryErr);
            if (onProgress) onProgress(50);

            // Step 2: Fallback to Firebase Storage with a strict 20s timeout so it NEVER gets stuck indefinitely
            try {
                const uniqueId = Math.random().toString(36).substring(2, 9);
                const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const storagePath = `events/videos/${uniqueId}_${cleanName}`;
                const storageRef = ref(storage, storagePath);
                const metadata = { contentType: file.type || 'video/mp4' };

                const uploadPromise = uploadBytes(storageRef, file, metadata).then(async (snap) => {
                    return await getDownloadURL(snap.ref);
                });

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Firebase Storage connection timed out.")), 20000)
                );

                const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
                if (onProgress) onProgress(100);
                return downloadUrl;
            } catch (fbErr) {
                console.error("Both Cloudinary and Firebase video uploads failed:", fbErr);
                throw new Error(cloudinaryErr.message || "Failed to upload video. Please ensure the file is a valid video format and under 100MB.");
            }
        }
    },

    // Dedicated Blazing-Fast Proposal & Document Vault Upload Utility with Real-time Progress Tracking
    uploadProposalFile: async (file, onProgress = null) => {
        if (!file) return null;

        const maxMb = 35;
        if (file.size > maxMb * 1024 * 1024) {
            throw new Error(`File is too large. Please select a proposal document under ${maxMb}MB.`);
        }

        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgtalrz4n";
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "maw1e4ud";
        const rawExtension = file.name?.split('.').pop()?.toLowerCase() || 'pdf';
        const isPdf = file.type === 'application/pdf' || rawExtension === 'pdf';
        const isImage = file.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(rawExtension);

        const resourceType = isImage ? 'image' : 'raw';

        // For PDFs, upload to Cloudinary raw storage with an alias extension (.doc) 
        // to prevent Cloudinary default PDF delivery security blocks (401 ACL error),
        // guaranteeing immediate 200 OK delivery with Access-Control-Allow-Origin: *
        let uploadFileName = file.name;
        if (isPdf) {
            const cleanBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const uniqueToken = Math.random().toString(36).substring(2, 8);
            uploadFileName = `${cleanBase || 'proposal'}_${uniqueToken}.doc`;
        }

        const formData = new FormData();
        formData.append("file", file, uploadFileName);
        formData.append("upload_preset", uploadPreset);
        formData.append("cloud_name", cloudName);

        return await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, true);

            // Real-time byte tracking progress
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && event.total > 0) {
                    const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
                    if (onProgress) onProgress(percent);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const res = JSON.parse(xhr.responseText);
                        if (res.secure_url) {
                            if (onProgress) onProgress(100);
                            resolve({
                                url: res.secure_url,
                                fileName: file.name,
                                fileSize: file.size,
                                fileType: isPdf ? 'pdf' : rawExtension
                            });
                            return;
                        }
                    } catch (parseErr) {
                        console.warn("Error parsing upload response:", parseErr);
                    }
                }
                try {
                    const errObj = JSON.parse(xhr.responseText);
                    reject(new Error(errObj.error?.message || `Upload failed with status ${xhr.status}`));
                } catch {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error("Network connection error during proposal upload. Please check your connection."));
            };

            xhr.ontimeout = () => {
                reject(new Error("Proposal upload timed out. Please check your network."));
            };

            // 90s max timeout
            xhr.timeout = 90000;
            xhr.send(formData);
        });
    },

    // Dedicated Blazing-Fast Agreement & Contract Vault Upload Utility with Real-time Progress Tracking
    uploadAgreementFile: async (file, onProgress = null) => {
        if (!file) return null;

        const maxMb = 35;
        if (file.size > maxMb * 1024 * 1024) {
            throw new Error(`File is too large. Please select a contract document under ${maxMb}MB.`);
        }

        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgtalrz4n";
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "maw1e4ud";
        const rawExtension = file.name?.split('.').pop()?.toLowerCase() || 'pdf';
        const isPdf = file.type === 'application/pdf' || rawExtension === 'pdf';
        const isImage = file.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(rawExtension);

        const resourceType = isImage ? 'image' : 'raw';

        let uploadFileName = file.name;
        if (isPdf) {
            const cleanBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const uniqueToken = Math.random().toString(36).substring(2, 8);
            uploadFileName = `${cleanBase || 'contract'}_${uniqueToken}.doc`;
        }

        const formData = new FormData();
        formData.append("file", file, uploadFileName);
        formData.append("upload_preset", uploadPreset);
        formData.append("cloud_name", cloudName);

        return await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, true);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && event.total > 0) {
                    const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
                    if (onProgress) onProgress(percent);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const res = JSON.parse(xhr.responseText);
                        if (res.secure_url) {
                            if (onProgress) onProgress(100);
                            resolve({
                                url: res.secure_url,
                                fileName: file.name,
                                fileSize: file.size,
                                fileType: isPdf ? 'pdf' : rawExtension
                            });
                            return;
                        }
                    } catch (parseErr) {
                        console.warn("Error parsing upload response:", parseErr);
                    }
                }
                try {
                    const errObj = JSON.parse(xhr.responseText);
                    reject(new Error(errObj.error?.message || `Upload failed with status ${xhr.status}`));
                } catch {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error("Network connection error during contract upload. Please check your connection."));
            };

            xhr.ontimeout = () => {
                reject(new Error("Contract upload timed out. Please check your network."));
            };

            xhr.timeout = 90000;
            xhr.send(formData);
        });
    },

    // Centralized Document Upload Utility (tries Firebase Storage first with 2s timeout, falls back to Cloudinary raw upload)
    uploadDocumentFile: async (file) => {
        if (!file) return null;
        
        const uniqueId = Math.random().toString(36).substring(2, 9);
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const storagePath = `documents/${uniqueId}_${cleanName}`;
        
        // Try Firebase Storage first with strict 2s timeout
        try {
            const storageRef = ref(storage, storagePath);
            const uploadPromise = uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef)).then(url => ({ url, storagePath }));
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Storage timeout')), 2000));
            return await Promise.race([uploadPromise, timeoutPromise]);
        } catch (firebaseError) {
            console.warn("Firebase Storage upload skipped/failed, falling back to Cloudinary raw upload:", firebaseError);
            
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
    campaigns: [], // Influencer Marketing
    giveaways: [], // Giveaway Campaigns
    giveawayEntries: [], // Giveaway Entries
    posts: [], // Blog Posts
    subscribers: [], // Newsletter Subscribers
    allUsers: [], // All Registered Users (Admin only context)
    // Firebase Auth account count; last known value until fetchMembersCount refreshes it.
    totalAuthUsers: (() => {
        try {
            const cached = parseInt(localStorage.getItem('newbi_total_auth_users'), 10);
            return Number.isFinite(cached) ? cached : null;
        } catch (e) {
            return null;
        }
    })(),
    membersCountedAt: 0,
    isSyncingUsers: false,
    lastAuthUsersSyncedAt: (() => {
        try {
            return Number(localStorage.getItem('newbi_last_auth_sync_time')) || 0;
        } catch (e) {
            return 0;
        }
    })(),
    authSyncError: null,
    artists: [], // Artist Onboarding state
    admins: [], // All Administrators
    clientRequests: [], // Artistant Client Onboarding
    creatorGroups: (() => {
        try {
            const stored = safeLocalStorage.getItem('nb_local_creator_groups');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const existingCityMap = new Map();
                    parsed.forEach(g => {
                        if (g.city) existingCityMap.set(g.city.toLowerCase().trim(), g);
                    });
                    const merged = [...parsed];
                    DEFAULT_CREATOR_GROUPS.forEach(dg => {
                        const key = dg.city.toLowerCase().trim();
                        if (!existingCityMap.has(key)) merged.push(dg);
                    });
                    return merged.sort((a, b) => (a.order || 0) - (b.order || 0));
                }
            }
        } catch (e) {}
        return DEFAULT_CREATOR_GROUPS;
    })(), // City-wise Creator Community Groups (defaults + local cache + remote)
    notifications: [], // Notifications System
    emailTemplates: [], // Mailing Manager Templates
    emailCampaigns: [], // Email Broadcasts & Analytics
    emailEvents: [], // Realtime email tracking stream
    unreadNotificationsCount: 0,
    fcmToken: null,
    paymentDetails: { upiId: '', qrCodeUrl: '' }, // New state
    coupons: [], // Coupon Code System
    documents: [], // Document Hub
    portfolioCategories: [], // Dynamic categories
    toasts: [], // Ephemeral UI notifications
    dismissedAnnouncementId: safeLocalStorage.getItem('nb_dismissed_announcement'),
    aiConfig: { geminiKey: '', defaultModel: 'gemini-3.5-flash' }, // Global AI Config
    activeModel: 'Gemini 3.5 Flash',
    dashboardWidgets: ['total_members', 'active_users', 'administrators', 'ticket_sales'], // Configurable 4-card metric keys
    maintenanceState: {
        global: false,
        pages: {}, // e.g., gallery, concerts
        features: {}, // e.g., invoices, announcements
        sections: {}, // e.g., home_upcoming, home_portfolio
        cards: {}, // e.g., invoices, proposals, tickets (admin dashboard cards)
    },
    siteSettings: { showUpcomingEvents: true, hideMaintenancePages: false },
    siteDetails: { instagram: '#', linkedin: '#', whatsappCommunity: '', phone: '', address: '', email: '' },
    isProfilePanelOpen: false,
    profilePanelTab: 'overview',
    openProfilePanel: (tab = 'overview') => set({ isProfilePanelOpen: true, profilePanelTab: tab }),
    closeProfilePanel: () => set({ isProfilePanelOpen: false }),
    setProfilePanelTab: (tab) => set({ profilePanelTab: tab }),
    loading: true,
    authInitialized: initialUser !== null,
    user: initialUser,
    userListenerUnsubscribe: null,
    subscriptionsLoaded: {},

    // Real-time Subscription Init
    // Reference-counted subscription helper
    subscribeToKey: (stateKey, colName, sortFn = null) => {
        if (!activeListeners[stateKey]) {
            console.log(`[Store] Opening Firestore listener for: ${stateKey} (${colName})`);
            const q = query(collection(db, colName));
            const unsub = onSnapshot(q, (snapshot) => {
                let data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                if (sortFn) {
                    data = sortFn(data);
                }
                set((state) => ({
                    [stateKey]: data,
                    subscriptionsLoaded: { ...(state.subscriptionsLoaded || {}), [stateKey]: true }
                }));
            }, async (error) => {
                console.error(`Error fetching ${stateKey} (${colName}):`, error);
                set((state) => ({
                    subscriptionsLoaded: { ...(state.subscriptionsLoaded || {}), [stateKey]: true }
                }));
                // Graceful fallback for public endpoints if client Firestore rules reject unauthenticated access
                if (stateKey === 'forms') {
                    try {
                        const res = await fetch('/api/forms');
                        if (res.ok) {
                            const json = await res.json();
                            if (json.success && Array.isArray(json.forms)) {
                                let data = json.forms;
                                if (sortFn) data = sortFn(data);
                                set({ forms: data });
                            }
                        }
                    } catch (apiErr) {
                        console.warn('[Store] Forms API fallback notice:', apiErr);
                    }
                } else if (stateKey === 'creatorGroups') {
                    try {
                        const res = await fetch('/api/creator-join?action=creator-groups-get');
                        if (res.ok) {
                            const json = await res.json();
                            if (json.success && Array.isArray(json.groups)) {
                                let data = json.groups;
                                if (sortFn) data = sortFn(data);
                                set({ creatorGroups: data });
                            }
                        }
                    } catch (apiErr) {
                        console.warn('[Store] Creator groups API fallback notice:', apiErr);
                    }
                }
            });
            activeListeners[stateKey] = { unsub, count: 1, timeoutId: null };
        } else {
            if (activeListeners[stateKey].timeoutId) {
                console.log(`[Store] Cancelling pending teardown timer for: ${stateKey}`);
                clearTimeout(activeListeners[stateKey].timeoutId);
                activeListeners[stateKey].timeoutId = null;
            }
            activeListeners[stateKey].count++;
            console.log(`[Store] Reusing listener for: ${stateKey} (Count: ${activeListeners[stateKey].count})`);
        }

        return () => {
            if (activeListeners[stateKey]) {
                activeListeners[stateKey].count--;
                console.log(`[Store] Decrementing listener for: ${stateKey} (Count: ${activeListeners[stateKey].count})`);
                if (activeListeners[stateKey].count === 0) {
                    console.log(`[Store] Scheduling delayed teardown (15s) for: ${stateKey}`);
                    activeListeners[stateKey].timeoutId = setTimeout(() => {
                        console.log(`[Store] Delayed teardown executing for: ${stateKey}`);
                        if (activeListeners[stateKey] && activeListeners[stateKey].count === 0) {
                            activeListeners[stateKey].unsub();
                            delete activeListeners[stateKey];
                        }
                    }, 15000);
                }
            }
        };
    },

    // Public On-Demand Subscriptions
    subscribeToConcerts: () => get().subscribeToKey('concerts', 'concerts'),
    subscribeToPortfolio: () => get().subscribeToKey('portfolio', 'portfolio', (data) => data.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? -1 : 1;
        return (a.order || 0) - (b.order || 0);
    })),
    subscribeToPortfolioCategories: () => get().subscribeToKey('portfolioCategories', 'portfolio_categories'),
    subscribeToForms: () => {
        // Proactive API fetch for instantaneous guest access without waiting on Firestore
        if ((get().forms || []).length === 0) {
            fetch('/api/forms')
                .then(r => r.json())
                .then(json => {
                    if (json.success && Array.isArray(json.forms) && json.forms.length > 0) {
                        set(state => {
                            if ((state.forms || []).length === 0) {
                                return { forms: json.forms };
                            }
                            return {};
                        });
                    }
                })
                .catch(() => {});
        }
        return get().subscribeToKey('forms', 'forms', (data) => data.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return b.isPinned ? -1 : 1;
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }));
    },
    subscribeToVolunteerGigs: () => get().subscribeToKey('volunteerGigs', 'volunteer_gigs', (data) => data.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? -1 : 1;
        return (a.order || 0) - (b.order || 0);
    })),
    subscribeToUpcomingEvents: () => get().subscribeToKey('upcomingEvents', 'upcoming_events', (data) => data.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? -1 : 1;
        return (a.order || 0) - (b.order || 0);
    })),
    subscribeToGuestlists: () => get().subscribeToKey('guestlists', 'guestlists', (data) => data.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? -1 : 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    })),
    subscribeToGiveaways: () => get().subscribeToKey('giveaways', 'giveaways'),
    // A scheduled post goes live by itself once its time has come: everyone
    // reading the blog sees it as Published (no server job needed).
    subscribeToPosts: () => get().subscribeToKey('posts', 'posts', (data) => {
        const now = Date.now();
        return data.map(p => {
            if (p.status !== 'Scheduled') return p;
            const at = new Date(p.publishAt || p.publishDate || 0).getTime();
            return at && at <= now ? { ...p, status: 'Published' } : p;
        });
    }),

    // Admin On-Demand Subscriptions
    subscribeToInvoices: () => get().subscribeToKey('invoices', 'invoices', (data) => data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))),
    subscribeToSpends: () => get().subscribeToKey('spends', 'spends', (data) => data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))),
    subscribeToOtherIncomes: () => get().subscribeToKey('otherIncomes', 'other_incomes', (data) => data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))),
    subscribeToFinancePayees: () => get().subscribeToKey('financePayees', 'finance_payees', (data) => data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))),
    subscribeToMessages: () => get().subscribeToKey('messages', 'messages', (data) => data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))),
    subscribeToCreators: () => get().subscribeToKey('creators', 'creators', (data) => {
        (data || []).forEach(creator => {
            if (!creator.uid && creator.id) creator.uid = creator.id;
            if (!creator.id && creator.uid) creator.id = creator.uid;
            
            // Fix Bengaluru variants locally only, do NOT write back to DB from client
            if (creator.city) {
                const c = String(creator.city).trim().toLowerCase();
                if (c === 'bangalore' || c === 'banglore' || c === 'bengaluru south' || c === 'bengaluru north' || c.includes('bangalore') || c.includes('banglore')) {
                    creator.city = 'Bengaluru';
                }
            }
        });
        return data;
    }),
    subscribeToCampaigns: () => {
        // Staff also get the app's submissions (one collection-group listener for the session).
        if (!appSubmissionsUnsub && ADMIN_ROLES.includes(get().user?.role)) {
            appSubmissionsUnsub = onSnapshot(collectionGroup(db, 'submissions'), (snap) => {
                appSubmissionIndex = indexAppSubmissions(snap.docs
                    .filter(d => d.ref.parent.parent?.parent?.id === 'campaigns')
                    .map(d => ({ campaignId: d.ref.parent.parent.id, uid: d.id, data: d.data() })));
                set({ appSubmissions: appSubmissionIndex });
                if (rawCampaigns) set({ campaigns: mergeAppSubmissions(rawCampaigns, appSubmissionIndex) });
            }, (error) => {
                console.warn('[Store] app submissions listener:', error?.code || error);
                appSubmissionsUnsub = null;
            });
        }
        return get().subscribeToKey('campaigns', 'campaigns', (data) => {
            rawCampaigns = sortCampaigns(data);
            return mergeAppSubmissions(rawCampaigns, appSubmissionIndex);
        });
    },
    subscribeToProposals: () => get().subscribeToKey('proposals', 'proposals', (data) => data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))),
    subscribeToAgreements: () => get().subscribeToKey('agreements', 'agreements', (data) => data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))),
    subscribeToSubscribers: () => get().subscribeToKey('subscribers', 'subscribers'),
    subscribeToAllUsers: () => get().subscribeToKey('allUsers', 'users'),
    subscribeToArtists: () => get().subscribeToKey('artists', 'artists'),
    subscribeToAdmins: () => get().subscribeToKey('admins', 'admins'),
    subscribeToClientRequests: () => get().subscribeToKey('clientRequests', 'client_requests'),
    subscribeToPastClients: () => get().subscribeToKey('pastClients', 'past_clients', (data) => data.sort((a, b) => (a.order || 0) - (b.order || 0))),
    subscribeToCreatorGroups: () => {
        // Immediately query the server API to ensure groups are available even when client Firestore rules reject unauthenticated access
        const fetchRemoteGroups = async () => {
            try {
                const res = await fetch('/api/creator-join?action=creator-groups-get');
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && Array.isArray(json.groups)) {
                        const firestoreList = json.groups;
                        const existingCityMap = new Map();
                        firestoreList.forEach(g => {
                            if (g.city) existingCityMap.set(g.city.toLowerCase().trim(), g);
                        });
                        const merged = [...firestoreList];
                        DEFAULT_CREATOR_GROUPS.forEach(defaultGroup => {
                            const key = defaultGroup.city.toLowerCase().trim();
                            if (!existingCityMap.has(key)) {
                                merged.push(defaultGroup);
                            }
                        });
                        const sorted = merged.sort((a, b) => (a.order || 0) - (b.order || 0));
                        set((state) => ({
                            creatorGroups: sorted,
                            subscriptionsLoaded: { ...(state.subscriptionsLoaded || {}), creatorGroups: true }
                        }));
                    }
                }
            } catch (err) {
                console.warn('[Store] Background creator groups fetch error:', err);
            }
        };
        fetchRemoteGroups();

        return get().subscribeToKey('creatorGroups', 'creator_groups', (data) => {
            const firestoreList = Array.isArray(data) ? data : [];
            const existingCityMap = new Map();
            firestoreList.forEach(g => {
                if (g.city) existingCityMap.set(g.city.toLowerCase().trim(), g);
            });

            // Also merge any groups stored in local cache
            try {
                const stored = safeLocalStorage.getItem('nb_local_creator_groups');
                if (stored) {
                    const localGroups = JSON.parse(stored);
                    if (Array.isArray(localGroups)) {
                        localGroups.forEach(lg => {
                            const key = (lg.city || '').toLowerCase().trim();
                            if (key && !existingCityMap.has(key)) {
                                firestoreList.push(lg);
                                existingCityMap.set(key, lg);
                            }
                        });
                    }
                }
            } catch (e) {}

            const merged = [...firestoreList];
            DEFAULT_CREATOR_GROUPS.forEach(defaultGroup => {
                const key = defaultGroup.city.toLowerCase().trim();
                if (!existingCityMap.has(key)) {
                    merged.push(defaultGroup);
                }
            });

            return merged.sort((a, b) => (a.order || 0) - (b.order || 0));
        });
    },
    subscribeToCreatorTestimonials: () => get().subscribeToKey('creatorTestimonials', 'creator_testimonials', (data) => data.sort((a, b) => (a.order || 0) - (b.order || 0))),
    subscribeToTicketOrders: () => get().subscribeToKey('ticketOrders', 'ticket_orders'),
    subscribeToCoupons: () => get().subscribeToKey('coupons', 'coupons'),
    subscribeToDocuments: () => get().subscribeToKey('documents', 'documents'),
    subscribeToGenDocuments: () => get().subscribeToKey('genDocuments', 'gen_documents'),
    subscribeToEmailTemplates: () => get().subscribeToKey('emailTemplates', 'email_templates', (data) => {
        let localTemplates = [];
        try {
            const stored = safeLocalStorage.getItem('nb_local_email_templates');
            if (stored) localTemplates = JSON.parse(stored);
        } catch (e) {}

        const remoteIds = new Set(data.map(d => d.id));
        const merged = [...data, ...localTemplates.filter(l => !remoteIds.has(l.id))];
        return merged.sort((a, b) => {
            const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime() || 0;
            const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime() || 0;
            return timeB - timeA;
        });
    }),
    subscribeToEmailCampaigns: () => get().subscribeToKey('emailCampaigns', 'email_campaigns', (data) => data.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0))),
    subscribeToEmailEvents: () => get().subscribeToKey('emailEvents', 'email_events', (data) => data.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))),

    subscribeToAnnouncements: () => get().subscribeToKey('announcements', 'announcements', (data) => data.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? -1 : 1;
        return (a.order || 0) - (b.order || 0);
    })),

    // Real-time Subscription Init (Global configuration documents and announcements)
    subscribeToData: (isAdmin) => {
        console.log("Initializing Core Subscriptions...");
        
        // Safety timeout to prevent stuck loading screen
        const loadingTimeout = setTimeout(() => {
            if (get().loading) {
                console.log("[Auto-Recovery] Forcing loading to false after timeout.");
                set({ loading: false });
            }
        }, 1500);

        const loadedKeys = new Set();
        const criticalKeys = ['siteSettings', 'announcements'];

        // Announcements
        const unsubAnnouncements = get().subscribeToAnnouncements();

        // Mark announcements loaded once the shared listener above reports in,
        // instead of opening a second listener on the same collection.
        const markAnnouncementsLoaded = () => {
            if (loadedKeys.has('announcements')) return;
            loadedKeys.add('announcements');
            if (criticalKeys.every(key => loadedKeys.has(key))) set({ loading: false });
        };
        if (get().subscriptionsLoaded?.announcements) markAnnouncementsLoaded();
        const unsubAnnouncementsCheck = useStore.subscribe((state) => {
            if (state.subscriptionsLoaded?.announcements) markAnnouncementsLoaded();
        });

        // Site Settings Subscription (Single Doc)
        const unsub9 = onSnapshot(doc(db, 'site_settings', 'general'), (docSnap) => {
            if (docSnap.exists()) {
                set({ siteSettings: docSnap.data() });
            } else {
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
        
        // AI Config Subscription (admins only: this doc holds API settings that visitors must never receive)
        const unsubAI = isAdmin ? onSnapshot(doc(db, 'site_settings', 'ai_config'), (docSnap) => {
            if (docSnap.exists()) {
                set({ aiConfig: docSnap.data() });
            }
        }, (error) => console.error("Error fetching AI config:", error)) : () => {};
        if (!isAdmin) set({ aiConfig: { geminiKey: '', defaultModel: 'gemini-3.5-flash' } });

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

        // Dashboard Widget Config Subscription (admin dashboard only)
        const unsubDashConfig = isAdmin ? onSnapshot(doc(db, 'app_state', 'dashboard_config'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (Array.isArray(data.widgets) && data.widgets.length === 4) {
                    set({ dashboardWidgets: data.widgets });
                }
            }
        }, (error) => console.error('Error fetching dashboard config:', error)) : () => {};

        return () => {
            clearTimeout(loadingTimeout);
            unsubAnnouncements();
            unsubAnnouncementsCheck();
            unsub9();
            unsub10();
            unsub11();
            unsub12();
            unsubAI();
            unsubDashConfig();
        };
    },

    // Campaign-specific or global Giveaway Entries Subscription
    subscribeToGiveawayEntries: (campaignId = null) => {
        console.log(`Subscribing to giveaway entries${campaignId ? ` for campaign: ${campaignId}` : ''}`);
        const colRef = collection(db, 'giveaway_entries');
        const q = campaignId ? query(colRef, where('campaignId', '==', campaignId)) : query(colRef);
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            set({ giveawayEntries: data });
        }, (error) => {
            console.error("Error fetching giveaway entries:", campaignId, error);
        });
    },

    // Toast System
    // addToast(message, type, codeOrOptions)
    //   type: 'success' | 'error' | 'warning' | 'info'
    //   codeOrOptions: an error code string (legacy) or { title, code, duration, action: { label, onClick } }
    addToast: (message, type = 'error', codeOrOptions = null) => {
        const options = codeOrOptions && typeof codeOrOptions === 'object' ? codeOrOptions : { code: codeOrOptions };
        const kind = TOAST_TYPES.includes(type) ? type : 'info';
        const text = toFriendlyMessage(message, kind);
        const now = Date.now();

        // Repeated identical toasts collapse into one with a counter instead of stacking up.
        const existing = get().toasts.find(t => t.kind === 'toast' && t.type === kind && t.message === text);
        if (existing) {
            set(state => ({
                toasts: [
                    { ...existing, count: (existing.count || 1) + 1, updatedAt: now },
                    ...state.toasts.filter(t => t.id !== existing.id)
                ]
            }));
            return existing.id;
        }

        const id = `toast-${now}-${++toastSeq}`;
        const toast = {
            id,
            kind: 'toast',
            type: kind,
            title: options.title || null,
            message: text,
            hint: getSupportHint(text, kind, options.code),
            code: options.code || null,
            action: options.action || null,
            duration: options.duration ?? getToastDuration(kind, text),
            count: 1,
            createdAt: now,
            updatedAt: now,
        };
        set(state => ({ toasts: [toast, ...state.toasts].slice(0, MAX_TOASTS) }));
        return id;
    },
    // Shows an incoming in-app notification as a banner in the same stack as other toasts.
    showNotificationToast: (notification) => {
        const id = `notif-${notification.id}`;
        if (get().toasts.some(t => t.id === id)) return;
        const now = Date.now();
        const toast = {
            id,
            kind: 'notification',
            type: 'info',
            notificationId: notification.id,
            title: notification.title || 'New notification',
            message: notification.content || notification.message || '',
            image: notification.image || null,
            link: notification.link || '',
            category: notification.type || null,
            duration: 7000,
            count: 1,
            createdAt: now,
            updatedAt: now,
        };
        set(state => ({ toasts: [toast, ...state.toasts].slice(0, MAX_TOASTS) }));
    },
    dismissPinnedAnnouncement: (id) => {
        safeLocalStorage.setItem('nb_dismissed_announcement', id);
        set({ dismissedAnnouncementId: id });
    },
    removeToast: (id) => {
        set(state => ({
            toasts: state.toasts.filter(t => t.id !== id)
        }));
    },

    // Notifications Subscription: the user's own notifications plus global ones (userId: null).
    // Two equality queries, so no composite index is needed; they are merged and sorted here.
    subscribeToNotifications: (uid) => {
        if (!uid) {
            set({ notifications: [], unreadNotificationsCount: 0 });
            return () => {};
        }

        let own = [];
        let globals = [];
        const publish = () => {
            const readGlobals = getReadGlobalNotificationIds(uid);
            const merged = [...own, ...globals.map(n => ({ ...n, isRead: n.isRead === true || readGlobals.has(n.id) }))]
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .slice(0, 50);
            set({ notifications: merged, unreadNotificationsCount: merged.filter(n => !n.isRead).length });
        };

        const unsubOwn = onSnapshot(
            query(collection(db, 'notifications'), where('userId', '==', uid)),
            (snapshot) => {
                own = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
                publish();
            },
            (error) => console.error("Error fetching notifications:", error)
        );
        const unsubGlobal = onSnapshot(
            query(collection(db, 'notifications'), where('userId', '==', null)),
            (snapshot) => {
                globals = snapshot.docs.map(d => ({ ...d.data(), id: d.id, isGlobal: true }));
                publish();
            },
            (error) => console.error("Error fetching global notifications:", error)
        );

        return () => {
            unsubOwn();
            unsubGlobal();
        };
    },

    // --- Actions (Write to DB) ---
    
    // Notifications
    addNotification: async (notificationData) => {
        try {
            await addDoc(collection(db, 'notifications'), {
                ...notificationData,
                // Always store the field: null marks a global notification, so it can be queried.
                userId: notificationData?.userId ?? null,
                isRead: false,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Failed to add notification:", error);
        }
    },
    markNotificationRead: async (id) => {
        try {
            const { notifications, user } = get();
            const target = (notifications || []).find(n => n.id === id);
            // Global notifications are shared, so their read state is kept per user on this device.
            if (target && !target.userId) {
                markGlobalNotificationsRead(user?.uid, [id]);
                set(state => {
                    const next = (state.notifications || []).map(n => n.id === id ? { ...n, isRead: true } : n);
                    return { notifications: next, unreadNotificationsCount: next.filter(n => !n.isRead).length };
                });
                return;
            }
            await updateDoc(doc(db, 'notifications', id), { isRead: true });
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    },
    markAllNotificationsRead: async () => {
        try {
            const user = get().user;
            const { notifications } = get();
            
            const unread = notifications.filter(n => !n.isRead);
            const unreadGlobal = unread.filter(n => !n.userId);
            const unreadOwn = unread.filter(n => n.userId && n.userId === user?.uid);

            if (unreadGlobal.length) {
                markGlobalNotificationsRead(user?.uid, unreadGlobal.map(n => n.id));
                set(state => {
                    const ids = new Set(unreadGlobal.map(n => n.id));
                    const next = (state.notifications || []).map(n => ids.has(n.id) ? { ...n, isRead: true } : n);
                    return { notifications: next, unreadNotificationsCount: next.filter(n => !n.isRead).length };
                });
            }
            
            const updates = unreadOwn.map(n => 
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
                    perUserLimit: event.perUserLimit || 5,
                    hasGuestlistTask: !!event.hasGuestlistTask,
                    guestlistTask: event.guestlistTask || null
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

        // Partial updates (e.g. ticketing payment settings) must not blank the category.
        const cleanedUpdates = deepClean('category' in updates ? { ...updates, category: updates.category || '' } : { ...updates });

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
                    perUserLimit: updates.perUserLimit || 5,
                    hasGuestlistTask: !!updates.hasGuestlistTask,
                    guestlistTask: updates.guestlistTask || null
                }, { merge: true });
            } else {
                // Update basic info if it exists
                await updateDoc(glRef, {
                    title: updates.title,
                    date: updates.date,
                    guestlistMode: updates.guestlistMode || 'qr',
                    perUserLimit: updates.perUserLimit || 5,
                    hasGuestlistTask: updates.hasGuestlistTask !== undefined ? !!updates.hasGuestlistTask : false,
                    guestlistTask: updates.guestlistTask || null
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
                // Partial updates (payment settings) carry no date; don't blank it.
                date: updates.date === undefined ? undefined : (updates.date?.split('T')[0] || '')
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
                // A sale switched off for newbi.live stays off the Work page too.
                ...(event.showOnSite === false ? { isHidden: true } : {}),
                archivedAt: new Date().toISOString()
            });

            // 2. Remove from Upcoming
            await deleteUpcomingEvent(event.id);
            console.log(`[Auto-Archive] Moved "${event.title}" to Past Events.`);
        }

        // --- Archive Community Features (Gigs, Guestlists, Forms) ---

        // 1. Volunteer Gigs
        // Only gigs whose dates are over. "Closed" just means applications are
        // closed (it can be reopened), so it must never delete the gig.
        const gigsToArchive = volunteerGigs.filter(gig => {
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

        // 3. Forms are never archived: closing a form is reversible and its
        // responses must stay reachable, so nothing is deleted here.
        const formsToArchive = [];

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

    // Past Clients CRUD
    addPastClient: async (client) => {
        const currentItems = get().pastClients || [];
        const maxOrder = currentItems.reduce((max, i) => Math.max(max, i.order || 0), 0);
        await addDoc(collection(db, 'past_clients'), {
            ...client,
            order: maxOrder + 1,
            createdAt: new Date().toISOString()
        });
    },
    updatePastClient: async (id, updates) => {
        await updateDoc(doc(db, 'past_clients', id), updates);
    },
    deletePastClient: async (id) => {
        await deleteDoc(doc(db, 'past_clients', id));
    },
    reorderPastClients: async (items) => {
        const batch = writeBatch(db);
        items.forEach((item, index) => batch.update(doc(db, 'past_clients', item.id), { order: index + 1 }));
        await batch.commit();
    },

    // City-Wise Creator Groups CRUD
    addCreatorGroup: async (group) => {
        const currentItems = get().creatorGroups || [];
        const maxOrder = currentItems.reduce((max, i) => Math.max(max, i.order || 0), 0);
        const newId = group.id || `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newGroup = {
            ...group,
            id: newId,
            order: group.order || (maxOrder + 1),
            isActive: group.isActive !== false,
            createdAt: new Date().toISOString()
        };

        // 1. Instantly update in-memory state and local cache (guaranteed success)
        const updatedList = [
            ...currentItems.filter(g => g.id !== newId && g.city?.toLowerCase().trim() !== newGroup.city?.toLowerCase().trim()),
            newGroup
        ].sort((a, b) => (a.order || 0) - (b.order || 0));

        set({ creatorGroups: updatedList });
        try {
            safeLocalStorage.setItem('nb_local_creator_groups', JSON.stringify(updatedList));
        } catch (e) {}

        // 2. Sync to site_settings/creator_groups document in Firestore (broad write permissions)
        try {
            await setDoc(doc(db, 'site_settings', 'creator_groups'), {
                groups: updatedList,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        } catch (sErr) {
            console.warn('[store] site_settings/creator_groups sync notice:', sErr.message);
        }

        // 3. Try direct Firestore addDoc / setDoc in creator_groups collection
        try {
            const docRef = await addDoc(collection(db, 'creator_groups'), newGroup);
            if (docRef?.id) {
                newGroup.id = docRef.id;
            }
        } catch (fsErr) {
            console.warn('[store] creator_groups addDoc notice, trying setDoc fallback:', fsErr.message);
            try {
                await setDoc(doc(db, 'creator_groups', newId), newGroup, { merge: true });
            } catch (fsErr2) {
                console.warn('[store] creator_groups setDoc notice:', fsErr2.message);
            }
        }

        // 4. Server API non-blocking sync
        try {
            await fetch('/api/creator-join?action=creator-group-add', {
                method: 'POST',
                headers: await authJsonHeaders(),
                body: JSON.stringify(newGroup)
            });
        } catch (apiErr) {
            console.warn('[store] Server creator-group-add notice:', apiErr.message);
        }

        return newGroup;
    },
    updateCreatorGroup: async (id, updates) => {
        const currentItems = get().creatorGroups || [];
        const updatedList = currentItems.map(g => g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g);
        set({ creatorGroups: updatedList });
        try {
            safeLocalStorage.setItem('nb_local_creator_groups', JSON.stringify(updatedList));
        } catch (e) {}

        // 1. Sync to site_settings/creator_groups
        try {
            await setDoc(doc(db, 'site_settings', 'creator_groups'), {
                groups: updatedList,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        } catch (e) {}

        // 2. Direct Firestore update
        try {
            await updateDoc(doc(db, 'creator_groups', id), updates);
        } catch (fsErr) {
            console.warn('[store] updateDoc creator_groups notice:', fsErr.message);
            try {
                await setDoc(doc(db, 'creator_groups', id), updates, { merge: true });
            } catch (e) {}
        }

        // 3. Server API fallback
        try {
            await fetch('/api/creator-join?action=creator-group-update', {
                method: 'POST',
                headers: await authJsonHeaders(),
                body: JSON.stringify({ id, updates })
            });
        } catch (e) {}
    },
    deleteCreatorGroup: async (id) => {
        const currentItems = get().creatorGroups || [];
        const updatedList = currentItems.filter(g => g.id !== id);
        set({ creatorGroups: updatedList });
        try {
            safeLocalStorage.setItem('nb_local_creator_groups', JSON.stringify(updatedList));
        } catch (e) {}

        // 1. Sync to site_settings/creator_groups
        try {
            await setDoc(doc(db, 'site_settings', 'creator_groups'), {
                groups: updatedList,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        } catch (e) {}

        // 2. Direct Firestore delete
        try {
            await deleteDoc(doc(db, 'creator_groups', id));
        } catch (fsErr) {
            console.warn('[store] deleteDoc creator_groups notice:', fsErr.message);
        }

        // 3. Server API fallback
        try {
            await fetch('/api/creator-join?action=creator-group-delete', {
                method: 'POST',
                headers: await authJsonHeaders(),
                body: JSON.stringify({ id })
            });
        } catch (e) {}
    },
    seedDefaultCreatorGroups: async () => {
        try {
            const res = await fetch('/api/creator-join?action=creator-groups-sync', {
                method: 'POST',
                headers: await authJsonHeaders(),
                body: JSON.stringify({ groups: DEFAULT_CREATOR_GROUPS })
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || 'Failed to sync default creator groups');
            }
            const resData = await res.json();
            // Refresh creator groups from API
            try {
                const getRes = await fetch('/api/creator-join?action=creator-groups-get');
                if (getRes.ok) {
                    const json = await getRes.json();
                    if (json.success && Array.isArray(json.groups)) {
                        set({ creatorGroups: json.groups });
                    }
                }
            } catch (e) {}
            return resData;
        } catch (err) {
            console.error('[store] seedDefaultCreatorGroups error:', err);
            throw err;
        }
    },

    // Creator Testimonials CRUD
    addCreatorTestimonial: async (testimonial) => {
        const currentItems = get().creatorTestimonials || [];
        const maxOrder = currentItems.reduce((max, i) => Math.max(max, i.order || 0), 0);
        await addDoc(collection(db, 'creator_testimonials'), {
            ...testimonial,
            order: maxOrder + 1,
            isActive: testimonial.isActive !== false,
            rating: testimonial.rating || 5,
            createdAt: new Date().toISOString()
        });
    },
    updateCreatorTestimonial: async (id, updates) => {
        await updateDoc(doc(db, 'creator_testimonials', id), updates);
    },
    deleteCreatorTestimonial: async (id) => {
        await deleteDoc(doc(db, 'creator_testimonials', id));
    },

    // Creator City Group Joined Status
    markCreatorCityGroupJoined: async (creatorId) => {
        if (!creatorId) return;
        const docRef = doc(db, 'creators', creatorId);
        await updateDoc(docRef, {
            hasJoinedCityGroup: true,
            joinedCityGroupAt: new Date().toISOString()
        });
        set(state => ({
            creators: (state.creators || []).map(c => 
                (c.id === creatorId || c.uid === creatorId) 
                    ? { ...c, hasJoinedCityGroup: true, joinedCityGroupAt: new Date().toISOString() } 
                    : c
            )
        }));
    },
    markCreatorInviteSent: async (creatorId, channel = 'whatsapp') => {
        if (!creatorId) return;
        const now = new Date().toISOString();
        try {
            const docRef = doc(db, 'creators', creatorId);
            await updateDoc(docRef, {
                inviteLinkSent: true,
                inviteLinkSentAt: now,
                inviteLinkChannel: channel
            });
        } catch (e) {
            console.warn('[store] Error updating creator invite sent in client:', e);
        }
        set(state => ({
            creators: (state.creators || []).map(c => 
                (c.id === creatorId || c.uid === creatorId) 
                    ? { ...c, inviteLinkSent: true, inviteLinkSentAt: now, inviteLinkChannel: channel } 
                    : c
            )
        }));
    },

    bulkMarkCreatorInvitesSent: async (creatorIds = [], channel = 'whatsapp') => {
        if (!creatorIds || !creatorIds.length) return { success: false, count: 0 };
        const now = new Date().toISOString();

        // 1. Try serverless backend API first
        try {
            const res = await fetch('/api/creator-join?action=creator-group-bulk-invite-sent', {
                method: 'POST',
                headers: await authJsonHeaders(),
                body: JSON.stringify({ creatorIds, channel })
            });
            if (res.ok) {
                const data = await res.json();
                set(state => ({
                    creators: (state.creators || []).map(c => {
                        if (creatorIds.includes(c.id) || creatorIds.includes(c.uid)) {
                            return { ...c, inviteLinkSent: true, inviteLinkSentAt: now, inviteLinkChannel: channel };
                        }
                        return c;
                    })
                }));
                return { success: true, count: data.count || creatorIds.length };
            }
        } catch (apiErr) {
            console.warn('[store] Serverless bulk invite sent error, attempting writeBatch fallback:', apiErr);
        }

        // 2. Client SDK fallback using writeBatch
        try {
            const batch = writeBatch(db);
            const targetIds = [...creatorIds];
            targetIds.forEach(id => {
                const docRef = doc(db, 'creators', id);
                batch.update(docRef, {
                    inviteLinkSent: true,
                    inviteLinkSentAt: now,
                    inviteLinkChannel: channel
                });
            });
            await batch.commit();

            set(state => ({
                creators: (state.creators || []).map(c => 
                    targetIds.includes(c.id) || targetIds.includes(c.uid)
                        ? { ...c, inviteLinkSent: true, inviteLinkSentAt: now, inviteLinkChannel: channel }
                        : c
                )
            }));
            return { success: true, count: targetIds.length };
        } catch (clientErr) {
            console.warn('[store] Client batch invite sent error, updating local state only:', clientErr);
            set(state => ({
                creators: (state.creators || []).map(c => 
                    creatorIds.includes(c.id) || creatorIds.includes(c.uid)
                        ? { ...c, inviteLinkSent: true, inviteLinkSentAt: now, inviteLinkChannel: channel }
                        : c
                )
            }));
            return { success: true, count: creatorIds.length };
        }
    },

    bulkAddCreatorsToCityGroup: async (city, creatorIds = []) => {
        if (!city && (!creatorIds || !creatorIds.length)) return { success: false, count: 0 };
        const now = new Date().toISOString();

        // 1. Try serverless backend API first (handles batching & admin permissions)
        try {
            const res = await fetch('/api/creator-join?action=creator-group-bulk-add', {
                method: 'POST',
                headers: await authJsonHeaders(),
                body: JSON.stringify({ city, creatorIds })
            });
            if (res.ok) {
                const data = await res.json();
                set(state => ({
                    creators: (state.creators || []).map(c => {
                        const matchesId = creatorIds.includes(c.id) || creatorIds.includes(c.uid);
                        const normC = (c.city || '').toLowerCase().trim();
                        const normTarget = (city || '').toLowerCase().trim();
                        const matchesCity = normC === normTarget || (normTarget === 'bengaluru' && /bang[al]*o?re/i.test(normC)) || normC.includes(normTarget);
                        if (matchesId || (creatorIds.length === 0 && matchesCity)) {
                            return { ...c, hasJoinedCityGroup: true, joinedCityGroupAt: now, cityGroupAddedBy: 'admin' };
                        }
                        return c;
                    })
                }));
                return { success: true, count: data.count || creatorIds.length };
            }
        } catch (apiErr) {
            console.warn('[store] Serverless bulk add error, attempting client writeBatch fallback:', apiErr);
        }

        // 2. Client SDK fallback using writeBatch
        try {
            const batch = writeBatch(db);
            const targetIds = [...creatorIds];
            targetIds.forEach(id => {
                const docRef = doc(db, 'creators', id);
                batch.update(docRef, {
                    hasJoinedCityGroup: true,
                    joinedCityGroupAt: now,
                    cityGroupAddedBy: 'admin'
                });
            });
            await batch.commit();

            set(state => ({
                creators: (state.creators || []).map(c => 
                    targetIds.includes(c.id) || targetIds.includes(c.uid)
                        ? { ...c, hasJoinedCityGroup: true, joinedCityGroupAt: now, cityGroupAddedBy: 'admin' }
                        : c
                )
            }));
            return { success: true, count: targetIds.length };
        } catch (clientErr) {
            console.error('[store] Client writeBatch bulk add error:', clientErr);
            throw clientErr;
        }
    },
    updateAiConfig: async (config) => {
        await setDoc(doc(db, 'site_settings', 'ai_config'), config, { merge: true });
    },

    // Announcements
    addAnnouncement: async (announcement) => {
        // Assign a default order (put at top -> minOrder - 1)
        const currentItems = get().announcements;
        const minOrder = currentItems.reduce((min, i) => Math.min(min, i.order || 0), 0);

        return await addDoc(collection(db, 'announcements'), {
            ...announcement,
            order: minOrder - 1
        });
    },
    reorderAnnouncements: async (items) => {
        // One batch, so a failed write never leaves half the list re-ordered.
        const batch = writeBatch(db);
        items.forEach((item, index) => batch.update(doc(db, 'announcements', item.id), { order: index }));
        await batch.commit();
    },
    cleanupExpiredAnnouncements: async () => {
        // No longer deletes anything. Announcements past their end date are
        // hidden from the site and kept in the admin under "Ended" instead
        // (this used to delete every announcement dated before today).
        return [];
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
    /**
     * Claim the right to send the notification for an announcement or blog
     * post, once. Returns false when it was already sent (unless `force`), so
     * a double tap or two admins at once never notify everyone twice.
     */
    claimContentNotification: async (col, id, { force = false } = {}) => {
        if (!['announcements', 'posts'].includes(col) || !id) throw new Error('Unknown content');
        const ref = doc(db, col, id);
        return runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) throw new Error('Not found');
            const data = snap.data();
            if (data.notifiedAt && !force) return false;
            tx.update(ref, { notifiedAt: new Date().toISOString(), notifyCount: (Number(data.notifyCount) || 0) + 1 });
            return true;
        });
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
        // One batch, so the saved order is all-or-nothing.
        const batch = writeBatch(db);
        items.forEach((item, index) => batch.update(doc(db, 'portfolio', item.id), { order: index }));
        await batch.commit();
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
        await updateDoc(doc(db, 'invoices', id), status === 'Paid' ? { status, paidAt: new Date().toISOString() } : { status });
    },
    deleteInvoice: async (id) => {
        await deleteDoc(doc(db, 'invoices', id));
    },

    /**
     * Record money received against an invoice (full or partial). Runs in a
     * transaction so a client's claim or another admin can't be overwritten.
     * Marks the invoice Paid once nothing is left to pay. Returns the new balance.
     */
    recordInvoicePayment: async (id, { amount, method = 'Bank transfer', reference = '', date = null, note = '' } = {}) => {
        const value = Math.round((Number(amount) || 0) * 100) / 100;
        if (!(value > 0)) throw new Error('Enter an amount above zero.');
        const user = get().user;
        const ref = doc(db, 'invoices', id);
        return runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) throw new Error('This invoice no longer exists.');
            const inv = snap.data();
            const entry = {
                kind: 'payment',
                type: method,
                amount: value,
                transactionId: reference || null,
                note: note || null,
                timestamp: date ? new Date(`${date}T12:00:00`).toISOString() : new Date().toISOString(),
                recordedAt: new Date().toISOString(),
                verifiedBy: user?.displayName || user?.email || 'Admin',
            };
            const next = { ...inv, paymentLogs: [...(inv.paymentLogs || []), entry] };
            const balance = invoiceBalance({ ...next, status: INVOICE_STATUS.PENDING });
            const updates = { paymentLogs: next.paymentLogs, updatedAt: new Date().toISOString() };
            if (balance <= 0) {
                updates.status = INVOICE_STATUS.PAID;
                updates.paidAt = new Date().toISOString();
                if (inv.paymentClaim?.status === 'pending') updates.paymentClaim = { ...inv.paymentClaim, status: 'approved' };
            } else if (inv.status === INVOICE_STATUS.PAID) {
                updates.status = INVOICE_STATUS.PENDING;
            }
            tx.update(ref, updates);
            return balance;
        });
    },

    // Strike a payment entered by mistake (kept in the log, marked void).
    voidInvoicePayment: async (id, index) => {
        const user = get().user;
        const ref = doc(db, 'invoices', id);
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) return;
            const inv = snap.data();
            const logs = [...(inv.paymentLogs || [])];
            if (!logs[index]) return;
            logs[index] = { ...logs[index], voided: true, voidedAt: new Date().toISOString(), voidedBy: user?.displayName || user?.email || 'Admin' };
            const balance = invoiceBalance({ ...inv, paymentLogs: logs, status: INVOICE_STATUS.PENDING });
            tx.update(ref, {
                paymentLogs: logs,
                status: balance <= 0 ? INVOICE_STATUS.PAID : (inv.status === INVOICE_STATUS.VERIFYING ? INVOICE_STATUS.VERIFYING : INVOICE_STATUS.PENDING),
                updatedAt: new Date().toISOString(),
            });
        });
    },

    // A client said they paid: accept it as payment of the remaining balance.
    // One transaction, so two admins approving at once can't log the balance twice.
    approveInvoiceClaim: async (id) => {
        const user = get().user;
        const ref = doc(db, 'invoices', id);
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) throw new Error('This invoice no longer exists.');
            const inv = snap.data();
            if (inv.paymentClaim?.status === 'approved') throw new Error('This claim was already approved.');
            const now = new Date().toISOString();
            const reviewer = user?.displayName || user?.email || 'Admin';
            const balance = invoiceBalance({ ...inv, status: INVOICE_STATUS.PENDING });
            const updates = {
                status: INVOICE_STATUS.PAID,
                paidAt: inv.paidAt || now,
                updatedAt: now,
                paymentClaim: { ...(inv.paymentClaim || {}), status: 'approved', reviewedAt: now, reviewedBy: reviewer },
            };
            if (balance > 0) {
                // Same entry shape as recordInvoicePayment.
                updates.paymentLogs = [...(inv.paymentLogs || []), {
                    kind: 'payment',
                    type: 'Client claim (verified)',
                    amount: balance,
                    transactionId: inv.paymentClaim?.transactionId || null,
                    note: inv.paymentClaim?.name ? `Claimed by ${inv.paymentClaim.name}` : null,
                    timestamp: inv.paymentClaim?.claimedAt || now,
                    recordedAt: now,
                    verifiedBy: reviewer,
                }];
            }
            tx.update(ref, updates);
        });
    },

    // Declining only reopens an invoice that was waiting on this claim; an
    // invoice paid some other way meanwhile stays paid.
    declineInvoiceClaim: async (id) => {
        const user = get().user;
        const ref = doc(db, 'invoices', id);
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) throw new Error('This invoice no longer exists.');
            const inv = snap.data();
            if (inv.paymentClaim?.status === 'approved') throw new Error('This claim was already approved.');
            const now = new Date().toISOString();
            tx.update(ref, {
                status: inv.status === INVOICE_STATUS.PAID ? INVOICE_STATUS.PAID : INVOICE_STATUS.PENDING,
                updatedAt: now,
                paymentClaim: { ...(inv.paymentClaim || {}), status: 'declined', reviewedAt: now, reviewedBy: user?.displayName || user?.email || 'Admin' },
            });
        });
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
    // Several spends saved all-or-nothing (bulk volunteer payouts), so a failed
    // save never leaves half the payouts behind for a retry to duplicate.
    addSpendsBatch: async (spends = []) => {
        if (!spends.length) return [];
        if (spends.length > 450) throw new Error('Pay at most 450 people at once.');
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
        const batch = writeBatch(db);
        const ids = spends.map(spend => {
            const cleaned = deepClean({
                ...spend,
                createdBy: user?.uid || null,
                createdByEmail: user?.email || null,
                createdAt: spend.createdAt || new Date().toISOString()
            });
            delete cleaned.id;
            const ref = doc(collection(db, 'spends'));
            batch.set(ref, cleaned);
            return ref.id;
        });
        await batch.commit();
        return ids;
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

        // Cap accessLogs so the document stays under Firestore's size limit.
        // logDocumentAccess appends with arrayUnion, so the newest entries are at the end.
        const MAX_ACCESS_LOGS = 50;
        if (processed.accessLogs && Array.isArray(processed.accessLogs)) {
            if (processed.accessLogs.length > MAX_ACCESS_LOGS) {
                processed.accessLogs = processed.accessLogs.slice(-MAX_ACCESS_LOGS);
            }
        } else {
            try {
                const docRef = doc(db, 'proposals', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.accessLogs && Array.isArray(data.accessLogs) && data.accessLogs.length > MAX_ACCESS_LOGS) {
                        processed.accessLogs = data.accessLogs.slice(-MAX_ACCESS_LOGS);
                    }
                }
            } catch (err) {
                console.error("Failed to auto-heal accessLogs for proposal:", err);
            }
        }

        await updateDoc(doc(db, 'proposals', id), processed);
        set(state => ({
            proposals: (state.proposals || []).map(p => p.id === id ? { ...p, ...processed } : p)
        }));
    },
    updateProposalStatus: async (id, status) => {
        await updateDoc(doc(db, 'proposals', id), { status });
        set(state => ({
            proposals: (state.proposals || []).map(p => p.id === id ? { ...p, status } : p)
        }));
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
    // Copy a proposal as a new draft with its own number. Client responses,
    // view history and the client's signature are never copied.
    duplicateProposal: async (id) => {
        const { proposals, addProposal } = get();
        const original = (proposals || []).find(p => p.id === id);
        if (!original) throw new Error("Proposal not found");
        const copy = { ...original };
        PROPOSAL_NON_COPYABLE_FIELDS.forEach(key => { delete copy[key]; });
        return await addProposal({
            ...JSON.parse(JSON.stringify(copy)),
            proposalNumber: nextProposalNumber(proposals),
            status: PROPOSAL_STATUS.DRAFT,
            revisionOf: original.id,
        });
    },

    // Record that a proposal went out. Only drafts become 'Sent'; an accepted or
    // declined proposal keeps its status no matter how often it's shared.
    markProposalShared: async (id, via) => {
        const ref = doc(db, 'proposals', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const p = snap.data();
        const now = new Date().toISOString();
        const updates = { lastSharedAt: now, lastSharedVia: via || 'link' };
        if (!isProposalClosed(p) && p.status !== PROPOSAL_STATUS.SENT) {
            updates.status = PROPOSAL_STATUS.SENT;
            updates.sentAt = now;
        }
        await updateDoc(ref, updates);
    },

    // Client accepts or declines on the public page. Checked inside a
    // transaction so a proposal can't be answered twice or after it expired.
    respondToProposal: async (id, response, details = {}) => {
        if (![PROPOSAL_STATUS.ACCEPTED, PROPOSAL_STATUS.REJECTED].includes(response)) throw new Error('Invalid response');
        // Signatures arrive as images; store them as files, not inside the document.
        const processed = await processAndUploadBase64Fields(JSON.parse(JSON.stringify(details)), `signatures/proposals/${id}`);
        const ref = doc(db, 'proposals', id);
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) throw Object.assign(new Error('This proposal no longer exists.'), { code: 'NOT_FOUND' });
            const current = snap.data();
            if (isProposalClosed(current)) throw Object.assign(new Error(`This proposal was already ${current.status === PROPOSAL_STATUS.ACCEPTED ? 'accepted' : 'declined'}.`), { code: 'CLOSED' });
            if (isProposalExpired(current)) throw Object.assign(new Error('This proposal has expired. Please ask us for an updated one.'), { code: 'EXPIRED' });
            tx.update(ref, { ...processed, status: response, respondedAt: new Date().toISOString() });
        });
    },

    // Start an invoice from an accepted (or any) proposal, then link the two.
    convertProposalToInvoice: async (id) => {
        const { proposals, invoices } = get();
        const p = (proposals || []).find(x => x.id === id);
        if (!p) throw new Error('Proposal not found');
        const firstNumber = (text) => Number((String(text || '').replace(/,/g, '').match(/\d+(\.\d+)?/) || [0])[0]) || 0;
        const isV2 = p.templateVersion === 'v2' || Boolean(p.whatsInside || p.blueprintSteps || p.deliverablesTable);
        const label = p.campaignName || `As per proposal ${p.proposalNumber || ''}`.trim();
        const oneLine = (price) => [{ id: `${Date.now()}_0`, name: '', description: label, qty: 1, price, customValues: {} }];
        // Classic proposals: the summed column holds line totals, so each line is
        // carried as qty 1 at that amount (the invoice total then matches the proposal).
        const src = p.totalSourceColumn || 'price';
        const legacyItems = isV2 ? [] : (Array.isArray(p.items) ? p.items : [])
            .filter(it => it && (it.description || Number(it[src])))
            .filter(it => !(it.description === 'Project Phase 01: Initial Strategic Planning' && !Number(it[src])))
            .map((it, i) => {
                const q = Number(it.qty) || 1;
                return { id: `${Date.now()}_${i}`, name: '', description: `${it.description || ''}${q > 1 && src === 'price' ? ` (qty ${q})` : ''}`, qty: 1, price: Number(it[src]) || 0, customValues: {} };
            });
        const tableItems = (Array.isArray(p.pricingTable) ? p.pricingTable : [])
            .filter(row => row && (row.deliverable || row.description || row.package))
            .map((row, i) => ({ id: `${Date.now()}_t${i}`, name: '', description: [row.deliverable || row.package, row.description || row.scope].filter(Boolean).join(' — '), qty: 1, price: firstNumber(row.qtyPrice || row.price), customValues: {} }));
        const override = p.totalOverride !== null && p.totalOverride !== undefined && p.totalOverride !== '' ? Number(p.totalOverride) || 0 : null;
        const dealValue = Number(String(p.dealValue ?? '').replace(/[^\d.]/g, '')) || 0;
        let items;
        if (!isV2 && override !== null) items = oneLine(override);
        else if (isV2 && dealValue > 0) items = oneLine(dealValue);
        else items = legacyItems.length ? legacyItems : tableItems;
        if (!items.length) items = oneLine(proposalValue(p));
        const today = todayKey();
        const subtotal = items.reduce((a, it) => a + it.qty * it.price, 0);
        // GST as the proposal had it: off means none; never set means the usual 18%.
        const gst = p.showGst === false ? 0 : Number(p.gstRate ?? 18) || 0;
        const total = Math.round((subtotal + (subtotal * gst) / 100) * 100) / 100;
        const ref = await get().addInvoice({
            clientName: p.clientName || '',
            clientAddress: p.clientAddress || '',
            clientEmail: p.clientEmail || '',
            invoiceNumber: nextInvoiceNumber(invoices || []),
            invoiceDate: today,
            issueDate: today,
            dueDate: '',
            items,
            customColumns: [],
            showGst: gst > 0,
            gstPercentage: gst || 18,
            amount: total,
            total,
            advancePaid: 0,
            status: INVOICE_STATUS.PENDING,
            selectedLogo: p.selectedLogo || 'entertainment',
            sourceProposalId: p.id,
            note: p.proposalNumber ? `As per proposal ${p.proposalNumber}.` : '',
            createdAt: new Date().toISOString(),
        });
        await updateDoc(doc(db, 'proposals', id), { convertedInvoiceId: ref.id, convertedAt: new Date().toISOString() });
        return ref.id;
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
    // opts.unlessSigned: refuse (code 'LOCKED') if the contract was signed meanwhile,
    // checked in a transaction so an open editor can never overwrite a signed contract.
    // Returns what was written (signature images swapped for their uploaded URLs).
    updateAgreement: async (id, updates, opts = {}) => {
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
            if (processed.accessLogs.length > 50) {
                processed.accessLogs = processed.accessLogs.slice(-50);
            }
        } else {
            try {
                const docRef = doc(db, 'agreements', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Newest entries are at the end (arrayUnion appends); keep the latest 50.
                    if (data.accessLogs && Array.isArray(data.accessLogs) && data.accessLogs.length > 50) {
                        processed.accessLogs = data.accessLogs.slice(-50);
                    }
                }
            } catch (err) {
                console.error("Failed to auto-heal accessLogs for agreement:", err);
            }
        }

        if (opts.unlessSigned) {
            const ref = doc(db, 'agreements', id);
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists()) throw Object.assign(new Error('This contract no longer exists.'), { code: 'NOT_FOUND' });
                if (snap.data().status === CONTRACT_STATUS.EXECUTED) throw Object.assign(new Error('This contract has been signed and is locked.'), { code: 'LOCKED' });
                tx.update(ref, processed);
            });
            return processed;
        }
        await updateDoc(doc(db, 'agreements', id), processed);
        return processed;
    },
    updateAgreementStatus: async (id, status) => {
        await updateDoc(doc(db, 'agreements', id), { status });
    },
    deleteAgreement: async (id) => {
        await deleteDoc(doc(db, 'agreements', id));
    },
    // Copy a contract as a new draft. The client's signature and view history are never copied.
    duplicateAgreement: async (id) => {
        const { agreements, addAgreement } = get();
        const original = (agreements || []).find(a => a.id === id);
        if (!original) throw new Error("Agreement not found");
        const copy = JSON.parse(JSON.stringify(original));
        CONTRACT_NON_COPYABLE_FIELDS.forEach(key => { delete copy[key]; });
        const base = String(original.agreementNumber || 'NB-AGR').replace(/-REV\d*$/i, '');
        const revisions = (agreements || []).filter(a => String(a.agreementNumber || '').startsWith(`${base}-REV`)).length;
        return await addAgreement({
            ...copy,
            agreementNumber: `${base}-REV${revisions + 1}`,
            status: CONTRACT_STATUS.DRAFT,
            parentAgreementId: id,
        });
    },

    // Client signs on the public page. A transaction makes sure a contract is
    // only signed once; the signature image is stored as a file first.
    signAgreement: async (id, approvalMetadata) => {
        if (!String(approvalMetadata?.signedBy || '').trim()) throw Object.assign(new Error('Enter your full name to sign.'), { code: 'INVALID' });
        const processed = await processAndUploadBase64Fields(JSON.parse(JSON.stringify({ approvalMetadata })), `signatures/agreements/${id}`);
        const ref = doc(db, 'agreements', id);
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) throw Object.assign(new Error('This contract no longer exists.'), { code: 'NOT_FOUND' });
            if (snap.data().status === CONTRACT_STATUS.EXECUTED) throw Object.assign(new Error('This contract has already been signed.'), { code: 'CLOSED' });
            // The signing time is taken when the signature is recorded, not when the page opened.
            processed.approvalMetadata = { ...processed.approvalMetadata, signedAt: new Date().toISOString() };
            tx.update(ref, {
                status: CONTRACT_STATUS.EXECUTED,
                approvalMetadata: processed.approvalMetadata,
                clientSignature: processed.approvalMetadata?.clientSignature || null,
                executedAt: new Date().toISOString(),
            });
        });
        return processed.approvalMetadata;
    },

    markAgreementShared: async (id, via) => {
        await updateDoc(doc(db, 'agreements', id), { lastSharedAt: new Date().toISOString(), lastSharedVia: via || 'link' });
    },

    // Forms
    addForm: async (form) => {
        const { alsoPostToUpcomingEvents, ...formData } = form;
        const docRef = await addDoc(collection(db, 'forms'), {
            ...formData,
            createdAt: form.createdAt || new Date().toISOString()
        });

        if (alsoPostToUpcomingEvents) {
            const eventData = {
                title: formData.title,
                description: formData.description || '',
                image: formData.image || '',
                link: `/forms/${docRef.id}`,
                buttonText: formData.buttonText || 'FILL FORM',
                highlightColor: formData.highlightColor || '#FF4F8B',
                category: 'form',
                formId: docRef.id,
                relatedArtistFormId: docRef.id,
                date: new Date().toISOString(),
                location: 'Online Form',
                status: formData.activeLabel || 'Live',
                isForm: true
            };
            const currentEvents = get().upcomingEvents;
            const maxOrder = currentEvents.reduce((max, i) => Math.max(max, i.order || 0), 0);
            await addDoc(collection(db, 'upcoming_events'), {
                ...eventData,
                order: maxOrder + 1
            });
        }

        return docRef.id;
    },
    updateForm: async (id, updates) => {
        const { alsoPostToUpcomingEvents, id: _ignoredId, ...formData } = updates;
        await updateDoc(doc(db, 'forms', id), formData);

        // Keep the home-page card in step. Partial updates (e.g. only the
        // status) are merged with the saved form so nothing is blanked.
        try {
            const eventSnap = await getDocs(query(collection(db, 'upcoming_events'), where('formId', '==', id)));
            if (!eventSnap.empty && alsoPostToUpcomingEvents === false) {
                await Promise.all(eventSnap.docs.map(d => deleteDoc(doc(db, 'upcoming_events', d.id))));
                return;
            }
            if (eventSnap.empty && !alsoPostToUpcomingEvents) return;
            const saved = await getDoc(doc(db, 'forms', id));
            const form = { ...(saved.exists() ? saved.data() : {}), ...formData };
            const mirror = {
                title: form.title || '',
                description: form.description || '',
                image: form.image || '',
                buttonText: form.buttonText || 'FILL FORM',
                highlightColor: form.highlightColor || '#FF4F8B',
                status: form.activeLabel || 'Live',
            };
            if (!eventSnap.empty) {
                await Promise.all(eventSnap.docs.map(d => updateDoc(doc(db, 'upcoming_events', d.id), mirror)));
            } else {
                const currentEvents = get().upcomingEvents || [];
                const maxOrder = currentEvents.reduce((max, i) => Math.max(max, i.order || 0), 0);
                await addDoc(collection(db, 'upcoming_events'), {
                    ...mirror,
                    link: `/forms/${id}`,
                    category: 'form',
                    formId: id,
                    relatedArtistFormId: id,
                    date: new Date().toISOString(),
                    location: 'Online Form',
                    isForm: true,
                    order: maxOrder + 1
                });
            }
        } catch (err) {
            console.warn('[updateForm] Home card sync failed:', err);
        }
    },
    deleteForm: async (id) => {
        await deleteDoc(doc(db, 'forms', id));
        // Delete mirrored Upcoming Event if any. Responses are kept.
        const eventSnap = await getDocs(query(collection(db, 'upcoming_events'), where('formId', '==', id)));
        await Promise.all(eventSnap.docs.map(d => deleteDoc(doc(db, 'upcoming_events', d.id))));
    },



    // Volunteer Gigs
    addVolunteerGig: async (gig) => {
        const currentItems = get().volunteerGigs || [];
        const maxOrder = currentItems.reduce((max, i) => Math.max(max, i.order || 0), 0);
        return await addDoc(collection(db, 'volunteer_gigs'), { ...gig, order: maxOrder + 1, createdAt: new Date().toISOString() });
    },
    reorderVolunteerGigs: async (items) => {
        const batch = writeBatch(db);
        items.forEach((item, index) => batch.update(doc(db, 'volunteer_gigs', item.id), { order: index }));
        await batch.commit();
    },
    updateVolunteerGig: async (id, updates) => {
        const { id: _ignoredId, ...data } = updates;
        await updateDoc(doc(db, 'volunteer_gigs', id), data);
        // Keep the home-page card in step, merged with the saved gig so a
        // partial update (status, pin) never blanks the card.
        try {
            const eventSnap = await getDocs(query(collection(db, 'upcoming_events'), where('gigId', '==', id)));
            if (eventSnap.empty) return;
            const saved = await getDoc(doc(db, 'volunteer_gigs', id));
            const gig = { ...(saved.exists() ? saved.data() : {}), ...data };
            await Promise.all(eventSnap.docs.map(d => updateDoc(doc(db, 'upcoming_events', d.id), {
                title: gig.title || '',
                description: gig.description || '',
                image: gig.image || '',
                location: gig.location || 'GLOBAL',
                highlightColor: gig.highlightColor || '#39FF14'
            })));
        } catch (err) {
            console.warn('[updateVolunteerGig] Home card sync failed:', err);
        }
    },
    deleteVolunteerGig: async (id) => {
        await deleteDoc(doc(db, 'volunteer_gigs', id));
        const eventSnap = await getDocs(query(collection(db, 'upcoming_events'), where('gigId', '==', id)));
        await Promise.all(eventSnap.docs.map(d => deleteDoc(doc(db, 'upcoming_events', d.id))));
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
        const eventQ = query(collection(db, 'upcoming_events'), where('guestlistId', '==', id));
        const eventSnap = await getDocs(eventQ);
        eventSnap.forEach(async (d) => {
            await deleteDoc(doc(db, 'upcoming_events', d.id));
        });
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

        // 1+2. Add the entry and bump currentSpots together, refusing the
        // request when the list is closed, full, or asks for too many spots.
        const entryRef = doc(collection(db, 'guestlists', id, 'entries'));
        await runTransaction(db, async (tx) => {
            const parent = await tx.get(docRef);
            const gl = parent.exists() ? parent.data() : {};
            const want = Math.max(1, Number(entry.guestsCount) || 1);
            if (String(gl.status || '').toLowerCase() === 'closed') {
                throw new Error('This guestlist is closed.');
            }
            const perUser = Number(gl.perUserLimit) || 0;
            if (perUser > 0 && want > perUser) {
                throw new Error(`You can request at most ${perUser} ${perUser === 1 ? 'spot' : 'spots'}.`);
            }
            const max = Number(gl.maxSpots) || 0;
            const taken = Math.max(0, Number(gl.currentSpots) || 0);
            if (max > 0 && taken + want > max) {
                const left = Math.max(0, max - taken);
                throw new Error(left ? `Only ${left} ${left === 1 ? 'spot is' : 'spots are'} left.` : 'This guestlist is full.');
            }
            tx.set(entryRef, { ...entry, createdAt: new Date().toISOString() });
            tx.update(docRef, { currentSpots: increment(want) });
        });
        return entryRef.id;
    },
    markGuestlistAttendance: async (id, entryId, attended) => {
        await updateDoc(doc(db, 'guestlists', id, 'entries', entryId), {
            attended,
            attendedAt: attended ? new Date().toISOString() : null
        });
    },
    updateGuestlistEntryStatus: async (guestlistId, entryId, status, extra = {}) => {
        const entryRef = doc(db, 'guestlists', guestlistId, 'entries', entryId);
        const entrySnap = await getDoc(entryRef);
        const currentData = entrySnap.exists() ? entrySnap.data() : {};

        await updateDoc(entryRef, {
            status,
            statusUpdatedAt: new Date().toISOString(),
            ...extra
        });

        // Approved: the server sends the pass (email, WhatsApp, push) once.
        if (status === 'approved' || status === 'confirmed') {
            await notifyEvent('pass-confirmed', { guestlistId, entryId });
        }

        // Rejected entries don't hold spots. Only move the counter when the
        // entry actually crosses that line, so repeat clicks can't drift it.
        const wasRejected = currentData.status === 'rejected';
        const isRejected = status === 'rejected';
        if (entrySnap.exists() && wasRejected !== isRejected) {
            try {
                const spots = Number(currentData.guestsCount) || 1;
                await updateDoc(doc(db, 'guestlists', guestlistId), {
                    currentSpots: increment(isRejected ? -spots : spots)
                });
            } catch (err) {
                console.warn('Failed to update guestlist spots after a status change:', err);
            }
        }
    },
    // Removes an entry and gives its spots back (rejected entries already did).
    deleteGuestlistEntry: async (guestlistId, entryId) => {
        const entryRef = doc(db, 'guestlists', guestlistId, 'entries', entryId);
        const snap = await getDoc(entryRef);
        if (!snap.exists()) return;
        const data = snap.data();
        await deleteDoc(entryRef);
        if (data.status !== 'rejected') {
            try {
                await updateDoc(doc(db, 'guestlists', guestlistId), {
                    currentSpots: increment(-(Number(data.guestsCount) || 1))
                });
            } catch { /* standalone entries may have no parent counter */ }
        }
    },

    // Ticketing & Scanning Operations
    addTicketOrder: async (orderData) => {
        return await addDoc(collection(db, 'ticket_orders'), {
            ...orderData,
            createdAt: new Date().toISOString()
        });
    },
    // Door check-in for one scanned or typed code. Every outcome carries a
    // `reason` the scanner shows: admitted | already | pending | rejected |
    // unpaid | wrong_event | not_found. `guestlistIds` lists every guestlist
    // document whose entries belong to this event (standalone lists and the
    // event's own list can both hold sign-ups). Claims run in transactions so
    // two phones (or a double scan) can never admit the same pass twice.
    scanTicket: async (eventId, code, { guestlistIds = [] } = {}) => {
        const readRef = (raw) => {
            let text = String(raw || '').trim();
            for (let i = 0; i < 2; i++) {
                try { text = decodeURIComponent(text); } catch { break; }
            }
            try {
                const obj = JSON.parse(text);
                if (obj && obj.ref) return String(obj.ref).trim().toUpperCase();
            } catch { /* not JSON */ }
            const match = text.toUpperCase().match(/\b(?:NB|GL)-[A-Z0-9]{3,12}\b/);
            if (match) return match[0];
            // Typed codes: "nb abc123" or "abc123" → NB-ABC123.
            const bare = text.toUpperCase().replace(/\s+/g, '');
            if (/^(NB|GL)[A-Z0-9]{3,12}$/.test(bare)) return `${bare.slice(0, 2)}-${bare.slice(2)}`;
            return bare;
        };
        const refId = readRef(code);
        if (!refId) return { valid: false, reason: 'not_found', message: 'That code is empty.' };

        // 1. Ticket orders for this event
        const snapTicket = await getDocs(query(collection(db, 'ticket_orders'), where('bookingRef', '==', refId), where('eventId', '==', eventId)));
        if (!snapTicket.empty) {
            const ticketRef = doc(db, 'ticket_orders', snapTicket.docs[0].id);
            return runTransaction(db, async (tx) => {
                const fresh = await tx.get(ticketRef);
                const data = fresh.data() || {};
                const base = {
                    code: refId,
                    id: ticketRef.id,
                    kind: 'ticket',
                    name: data.customerName || data.name || 'Ticket holder',
                    phone: data.customerPhone || data.phone || '',
                    type: Number(data.totalAmount || 0) > 0 ? 'Paid ticket' : 'Free ticket',
                    items: orderItems(data),
                    people: orderTicketCount(data),
                    amount: Number(data.totalAmount) || 0,
                };
                if (data.status === 'pending') {
                    return { valid: false, reason: 'unpaid', message: "Payment hasn't been verified yet.", data: base };
                }
                if (data.status === 'rejected') {
                    return { valid: false, reason: 'rejected', message: 'This order was cancelled.', data: base };
                }
                // Free tickets are 'confirmed'; paid ones are 'approved' or 'dispatched'.
                if (!['approved', 'dispatched', 'confirmed', 'attended'].includes(data.status)) {
                    return { valid: false, reason: 'unpaid', message: "This ticket isn't valid yet.", data: base };
                }
                // The check-in desk sets attended/status; the scanner sets isScanned. Honour both.
                if (data.isScanned || data.attended || data.status === 'attended') {
                    return { valid: true, scanned: true, reason: 'already', message: 'Already checked in.', data: { ...base, previousAt: data.scannedAt || data.attendedAt || null } };
                }
                const now = new Date().toISOString();
                tx.update(ticketRef, { isScanned: true, scannedAt: now, attended: true, attendedAt: now });
                return { valid: true, scanned: false, reason: 'admitted', message: 'Entry granted.', data: base };
            });
        }

        // 2. Guestlist entries in any list that belongs to this event
        const listIds = [...new Set([eventId, ...guestlistIds].filter(Boolean))];
        for (const listId of listIds) {
            const snapGuest = await getDocs(query(collection(db, 'guestlists', listId, 'entries'), where('bookingRef', '==', refId)));
            if (snapGuest.empty) continue;
            const entryRef = snapGuest.docs[0].ref;
            return runTransaction(db, async (tx) => {
                const fresh = await tx.get(entryRef);
                const data = fresh.data() || {};
                const people = Number(data.guestsCount) || 1;
                const base = {
                    code: refId,
                    id: entryRef.id,
                    guestlistId: listId,
                    kind: 'guest',
                    name: data.customerName || data.name || 'Guest',
                    phone: data.customerPhone || data.phone || '',
                    type: data.guestlistMode === 'rsvp' ? 'RSVP' : 'Guestlist',
                    people,
                    guestsCount: people,
                    plusOneNames: Array.isArray(data.plusOneNames) ? data.plusOneNames.filter(Boolean) : [],
                };
                if (data.status === 'rejected') {
                    return { valid: false, reason: 'rejected', message: 'This request was declined.', data: base };
                }
                if (!isGuestAdmissible(data)) {
                    return { valid: false, reason: 'pending', message: "This request hasn't been approved yet.", data: base };
                }
                if (data.attended) {
                    return { valid: true, scanned: true, reason: 'already', message: 'Already checked in.', data: { ...base, previousAt: data.attendedAt || null } };
                }
                tx.update(entryRef, { attended: true, attendedAt: new Date().toISOString() });
                return { valid: true, scanned: false, reason: 'admitted', message: 'Entry granted.', data: base };
            });
        }

        // 3. Valid somewhere else?
        const globalTicketSnap = await getDocs(query(collection(db, 'ticket_orders'), where('bookingRef', '==', refId), limit(1)));
        if (!globalTicketSnap.empty) {
            const other = globalTicketSnap.docs[0].data();
            let otherTitle = other.eventTitle || '';
            if (!otherTitle && other.eventId) {
                try {
                    const ev = await getDoc(doc(db, 'upcoming_events', other.eventId));
                    otherTitle = ev.exists() ? ev.data().title || '' : '';
                } catch { /* title is a nicety */ }
            }
            return { valid: false, reason: 'wrong_event', message: `This ticket is for ${otherTitle || 'another event'}.`, data: { code: refId, name: other.customerName || '' } };
        }
        try {
            const globalGuestSnap = await getDocs(query(collectionGroup(db, 'entries'), where('bookingRef', '==', refId), limit(1)));
            if (!globalGuestSnap.empty) {
                const other = globalGuestSnap.docs[0].data();
                return { valid: false, reason: 'wrong_event', message: `This pass is for ${other.title || 'another event'}.`, data: { code: refId, name: other.customerName || other.name || '' } };
            }
        } catch (err) {
            console.warn('[Store] Cross-event pass lookup failed:', err);
        }

        return { valid: false, reason: 'not_found', message: "We couldn't find this code.", data: { code: refId } };
    },
    // Returns { emailed } for 'dispatched' so the screen can say when the
    // status changed but the ticket email didn't go out.
    updateTicketOrderStatus: async (orderId, status) => {
        if (status === 'rejected') {
            await get().rejectTicketOrder(orderId);
            return { ok: true };
        }
        const orderRef = doc(db, 'ticket_orders', orderId);
        const now = new Date().toISOString();
        if (status === 'approved') {
            // Verifying an order that was rejected by mistake takes its coupon use back.
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(orderRef);
                if (!snap.exists()) throw new Error('This order no longer exists.');
                const order = snap.data();
                const couponId = order.appliedCoupon?.id;
                const reclaim = order.status === 'rejected' && order.couponReleased && couponId;
                const couponRef = reclaim ? doc(db, 'coupons', couponId) : null;
                const couponSnap = couponRef ? await tx.get(couponRef) : null;
                tx.update(orderRef, { status, approvedAt: now, ...(reclaim ? { couponReleased: false } : {}) });
                if (couponSnap?.exists()) tx.update(couponRef, { usedCount: increment(1) });
            });
            return { ok: true };
        }
        await updateDoc(orderRef, { status, [`${status}At`]: now });

        if (status !== 'dispatched') return { ok: true };
        // The server builds and sends the pass from the order record (once).
        const result = await notifyEvent('pass-confirmed', { orderId });
        return { ok: true, emailed: Boolean(result?.success && (result.duplicate || result.delivery?.email?.status === 'sent')) };
    },

    // Messages
    markMessageRead: async (id, status = 'read') => {
        await updateDoc(doc(db, 'messages', id), { status });
    },
    // Inbox bookkeeping (replied / archived). `status` stays 'new' | 'read' |
    // 'archived' so the shell's unread badge (status === 'new') keeps working.
    updateMessage: async (id, updates) => {
        await updateDoc(doc(db, 'messages', id), { ...updates, updatedAt: new Date().toISOString() });
    },
    deleteMessage: async (id) => {
        await deleteDoc(doc(db, 'messages', id));
    },

    // Creators / Influencers
    addCreator: async (creator, sendWelcome = true) => {
        const { creators, user } = get();
        const normPhone = normalizePhoneNumber(creator.phone);
        const normEmail = creator.email?.trim().toLowerCase();
        const cleanInsta = extractSocialUsername(creator.instagram, 'instagram').toLowerCase();
        const cleanLinkedin = extractSocialUsername(creator.linkedin, 'linkedin');
        const cleanYoutube = extractSocialUsername(creator.youtube, 'youtube');
        const cleanTwitter = extractSocialUsername(creator.twitter, 'twitter');
        const currentUid = creator.uid || user?.uid || null;

        if (hasDisallowedLink(creator.instagram) && !cleanInsta) {
            throw new Error('Links are not allowed. Please enter only your Instagram username or handle.');
        }
        if (hasDisallowedLink(creator.linkedin) && !cleanLinkedin) {
            throw new Error('Links are not allowed. Please enter only your LinkedIn username.');
        }
        if (hasDisallowedLink(creator.youtube) && !cleanYoutube) {
            throw new Error('Links are not allowed. Please enter only your YouTube handle.');
        }
        if (hasDisallowedLink(creator.twitter) && !cleanTwitter) {
            throw new Error('Links are not allowed. Please enter only your X/Twitter handle.');
        }

        // 1. Phone number deduplication
        if (normPhone) {
            const existingPhone = creators.find(c => c.uid !== currentUid && normalizePhoneNumber(c.phone) === normPhone);
            if (existingPhone) {
                throw new Error(`The mobile number ${creator.phone} is already linked to another Creator profile (${existingPhone.displayName || existingPhone.name || 'Existing Account'}). Multiple creator accounts for the same phone number are not allowed.`);
            }
        }

        // 2. Email deduplication
        if (normEmail) {
            const existingEmail = creators.find(c => c.uid !== currentUid && c.email && c.email.trim().toLowerCase() === normEmail);
            if (existingEmail) {
                throw new Error(`The email address ${creator.email} is already registered to an existing Creator profile. Please sign in to access your dashboard.`);
            }
        }

        // 3. Instagram handle deduplication
        if (cleanInsta) {
            const existingInsta = creators.find(c => c.uid !== currentUid && c.instagram && c.instagram.trim().replace(/^@/, '').toLowerCase() === cleanInsta);
            if (existingInsta) {
                throw new Error(`The Instagram handle @${cleanInsta} is already linked to an existing Creator profile.`);
            }
        }

        // 4. Primary: Route submission through serverless API (Firebase Admin bypasses client Firestore rules)
        try {
            // Fresh token so a just-verified phone number is included; the server only trusts the token.
            const headers = await authJsonHeaders(true);

            const isManualFollowers = Boolean(
                creator.manualFollowerEntry || 
                creator.isManualFollowerEntry || 
                creator.requiresManualVerification
            );
            const shouldAutoVerify = !isManualFollowers;
            const profileStatus = creator.profileStatus 
                ? creator.profileStatus 
                : (shouldAutoVerify ? 'approved' : 'pending');
            const isVerified = creator.isVerified !== undefined 
                ? creator.isVerified 
                : shouldAutoVerify;
            const now = new Date().toISOString();

            const creatorPayload = {
                ...creator,
                instagram: cleanInsta,
                linkedin: cleanLinkedin,
                youtube: cleanYoutube,
                twitter: cleanTwitter,
                website: '',
                uid: currentUid || auth?.currentUser?.uid || null,
                profileStatus,
                isVerified,
                manualFollowerEntry: isManualFollowers,
                requiresManualVerification: isManualFollowers,
                verifiedAt: shouldAutoVerify ? (creator.verifiedAt || now) : null,
                verifiedBy: shouldAutoVerify ? (creator.verifiedBy || 'system_auto_verify') : null
            };

            const res = await fetch('/api/creator-join', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    creator: creatorPayload,
                    sendWelcome
                })
            });

            let json = null;
            try {
                json = await res.json();
            } catch (parseErr) {
                // non-JSON response
            }

            if (res.ok && json?.success) {
                if (json.creator) {
                    set(state => {
                        const existingList = state.creators || [];
                        const exists = existingList.some(c => c.uid === json.id || c.id === json.id);
                        if (exists) {
                            return {
                                creators: existingList.map(c => (c.uid === json.id || c.id === json.id) ? { ...c, ...json.creator } : c)
                            };
                        } else {
                            return {
                                creators: [json.creator, ...existingList]
                            };
                        }
                    });
                }

                return {
                    id: json.id,
                    creatorId: json.creatorId,
                    verificationToken: json.verificationToken
                };
            }

            if (json && json.error) {
                throw new Error(json.error);
            }
            if (!res.ok) {
                throw new Error(`Server returned error (${res.status}). Please check your connection or try again shortly.`);
            }
        } catch (apiErr) {
            const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            const isOfflineNetworkErr = apiErr.message && (
                apiErr.message.includes('Failed to fetch') ||
                apiErr.message.includes('NetworkError') ||
                apiErr.message.includes('Load failed')
            );

            if (!isLocalDev || !isOfflineNetworkErr) {
                throw apiErr;
            }
            console.warn('[Store] Local offline dev notice, falling back to direct Firestore:', apiErr.message);
        }

        // 5. Fallback: Direct Firestore setDoc if API is unavailable (e.g. offline dev)
        const targetUid = currentUid || doc(collection(db, 'creators')).id;
        const verificationToken = creator.verificationToken || `vt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const creatorId = (creator.creatorId || targetUid.slice(0, 8)).toUpperCase();
        
        // Auto-verify email if user is signed in with Google
        const isEmailVerified = creator.isEmailVerified || (user?.emailVerified && user?.email?.toLowerCase() === normEmail) || false;
        const fallbackNow = new Date().toISOString();

        const isManualFollowersFallback = Boolean(
            creator.manualFollowerEntry || 
            creator.isManualFollowerEntry || 
            creator.requiresManualVerification
        );
        const shouldAutoVerifyFallback = !isManualFollowersFallback;
        const profileStatusFallback = creator.profileStatus 
            ? creator.profileStatus 
            : (shouldAutoVerifyFallback ? 'approved' : 'pending');
        const isVerifiedFallback = creator.isVerified !== undefined 
            ? creator.isVerified 
            : shouldAutoVerifyFallback;

        const finalCreator = {
            ...creator,
            uid: targetUid,
            creatorId,
            verificationToken,
            profileStatus: profileStatusFallback,
            isVerified: isVerifiedFallback,
            manualFollowerEntry: isManualFollowersFallback,
            requiresManualVerification: isManualFollowersFallback,
            verifiedAt: shouldAutoVerifyFallback ? (creator.verifiedAt || fallbackNow) : null,
            verifiedBy: shouldAutoVerifyFallback ? (creator.verifiedBy || 'system_auto_verify') : null,
            isPhoneVerified: creator.isPhoneVerified ?? false,
            isEmailVerified,
            createdAt: creator.createdAt || fallbackNow
        };

        try {
            await setDoc(doc(db, 'creators', targetUid), finalCreator);
        } catch (firestoreErr) {
            console.error('[Store] Firestore direct setDoc error:', firestoreErr);
            if (firestoreErr.code === 'permission-denied' || firestoreErr.message?.includes('permission')) {
                throw new Error("Unable to submit application due to security permissions. Please ensure your details are valid or try again shortly.");
            }
            throw firestoreErr;
        }

        if (creator.referredBy) {
            const referredBy = creator.referredBy.trim();
            
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

        // Local offline fallback only: the welcome email and WhatsApp link are sent
        // by /api/creator-join (once, awaited), never from the browser.
        return { id: targetUid, creatorId, verificationToken };
    },
    resolveCreatorProfile: async (user) => {
        if (!user) return null;

        const { creators } = get();
        const searchUid = user.uid || user.id;
        const searchEmail = (user.email || '').trim().toLowerCase();
        const searchPhone = normalizePhoneNumber(user.phoneNumber || user.phone || '');

        let foundProfile = null;

        // 1. Try local cache first
        if (creators && creators.length > 0) {
            foundProfile = creators.find(c => 
                (searchUid && (c.id === searchUid || c.uid === searchUid)) ||
                (searchEmail && c.email && c.email.trim().toLowerCase() === searchEmail) ||
                (searchPhone && normalizePhoneNumber(c.phone) === searchPhone)
            );
        }

        // 2. Try direct Firestore lookup by uid
        if (!foundProfile && searchUid) {
            try {
                const docSnap = await getDoc(doc(db, 'creators', searchUid));
                if (docSnap.exists()) {
                    foundProfile = { ...docSnap.data(), id: docSnap.id };
                } else {
                    const qUid = query(collection(db, 'creators'), where('uid', '==', searchUid), limit(1));
                    const qUidSnap = await getDocs(qUid);
                    if (!qUidSnap.empty) {
                        foundProfile = { ...qUidSnap.docs[0].data(), id: qUidSnap.docs[0].id };
                    }
                }
            } catch (err) {
                console.warn('[store] Direct Firestore lookup by UID failed:', err.message);
            }
        }
        
        // 2.5 Try direct Firestore lookup by Email if uid fails
        if (!foundProfile && searchEmail) {
            try {
                const qEmail = query(collection(db, 'creators'), where('email', '==', searchEmail), limit(1));
                const qEmailSnap = await getDocs(qEmail);
                if (!qEmailSnap.empty) {
                    foundProfile = { ...qEmailSnap.docs[0].data(), id: qEmailSnap.docs[0].id };
                }
            } catch (err) {
                console.warn('[store] Direct Firestore lookup by Email failed:', err.message);
            }
        }
        
        // 2.6 Try direct Firestore lookup by Phone if email fails
        if (!foundProfile && searchPhone) {
            try {
                const qPhone = query(collection(db, 'creators'), where('phone', '==', searchPhone), limit(1));
                const qPhoneSnap = await getDocs(qPhone);
                if (!qPhoneSnap.empty) {
                    foundProfile = { ...qPhoneSnap.docs[0].data(), id: qPhoneSnap.docs[0].id };
                }
            } catch (err) {
                console.warn('[store] Direct Firestore lookup by Phone failed:', err.message);
            }
        }

        // 3. Robust fallback: Serverless API (bypasses restrictive client rules).
        // The server resolves the profile from the signed-in user's token, so this only runs for them.
        if (!foundProfile && auth?.currentUser && auth.currentUser.uid === searchUid) {
            try {
                const res = await fetch('/api/creator-join?action=get-profile', {
                    headers: await authJsonHeaders()
                });
                const data = await res.json();
                if (data.success && data.creator) {
                    foundProfile = data.creator;
                }
            } catch (err) {
                console.error('[store] Serverless API profile lookup failed:', err.message);
            }
        }

        // 4. Update local state if found and not already there
        if (foundProfile) {
            const currentCreators = get().creators || [];
            const exists = currentCreators.some(c => c.id === foundProfile.id);
            if (!exists) {
                set({ creators: [...currentCreators, foundProfile] });
            }
        }

        return foundProfile;
    },

    updateCreator: async (uid, updates) => {
        if (!uid) {
            throw new Error("Creator identifier is required to update creator.");
        }

        const sanitizedUpdates = { ...updates };
        if (updates.instagram !== undefined) {
            sanitizedUpdates.instagram = extractSocialUsername(updates.instagram, 'instagram').toLowerCase();
            if (hasDisallowedLink(updates.instagram) && !sanitizedUpdates.instagram) {
                throw new Error('Links are not allowed. Please enter only your Instagram username or handle.');
            }
        }
        if (updates.linkedin !== undefined) {
            sanitizedUpdates.linkedin = extractSocialUsername(updates.linkedin, 'linkedin');
            if (hasDisallowedLink(updates.linkedin) && !sanitizedUpdates.linkedin) {
                throw new Error('Links are not allowed. Please enter only your LinkedIn username.');
            }
        }
        if (updates.youtube !== undefined) {
            sanitizedUpdates.youtube = extractSocialUsername(updates.youtube, 'youtube');
            if (hasDisallowedLink(updates.youtube) && !sanitizedUpdates.youtube) {
                throw new Error('Links are not allowed. Please enter only your YouTube handle.');
            }
        }
        if (updates.twitter !== undefined) {
            sanitizedUpdates.twitter = extractSocialUsername(updates.twitter, 'twitter');
            if (hasDisallowedLink(updates.twitter) && !sanitizedUpdates.twitter) {
                throw new Error('Links are not allowed. Please enter only your X/Twitter handle.');
            }
        }
        if (updates.website !== undefined) {
            sanitizedUpdates.website = '';
        }

        const { creators } = get();
        const existingCreator = (creators || []).find(c => 
            c.id === uid || 
            c.uid === uid || 
            (c.creatorId && String(c.creatorId).toUpperCase() === String(uid).toUpperCase())
        );

        if (sanitizedUpdates.phone) {
            const normPhone = normalizePhoneNumber(sanitizedUpdates.phone);
            if (normPhone) {
                const conflict = (creators || []).find(c => 
                    c.uid !== uid && c.id !== uid && normalizePhoneNumber(c.phone) === normPhone
                );
                if (conflict) {
                    throw new Error(`The mobile number ${sanitizedUpdates.phone} is already registered to another Creator account.`);
                }
            }
        }

        const docId = existingCreator?.id || existingCreator?.uid || uid;
        let prevStatus = existingCreator?.profileStatus || null;
        let email = existingCreator?.email || null;
        let name = existingCreator?.displayName || existingCreator?.name || 'Creator';

        let directSuccess = false;
        let lastError = null;
        let writtenId = docId;

        // 1. Attempt direct client-side Firestore update
        try {
            const creatorRef = doc(db, 'creators', docId);
            const snap = await getDoc(creatorRef);
            if (snap.exists()) {
                const data = snap.data();
                prevStatus = prevStatus || data.profileStatus;
                email = email || data.email;
                name = name || data.displayName || data.name || 'Creator';
                await updateDoc(creatorRef, sanitizedUpdates);
                directSuccess = true;
            } else if (existingCreator?.uid && existingCreator.uid !== docId) {
                const altRef = doc(db, 'creators', existingCreator.uid);
                const altSnap = await getDoc(altRef);
                if (altSnap.exists()) {
                    await updateDoc(altRef, sanitizedUpdates);
                    writtenId = existingCreator.uid;
                    directSuccess = true;
                }
            }
            if (!directSuccess) {
                // Fallback to setDoc merge if doc does not exist yet under this key
                await setDoc(doc(db, 'creators', docId), sanitizedUpdates, { merge: true });
                directSuccess = true;
            }
        } catch (fsErr) {
            console.warn('[store] Direct Firestore updateCreator failed, attempting serverless fallback:', fsErr.message);
            lastError = fsErr;
        }

        // 2. Server API fallback if direct Firestore write failed (e.g. security rules)
        if (!directSuccess) {
            try {
                const res = await fetch('/api/creator-join?action=creator-update', {
                    method: 'POST',
                    headers: await authJsonHeaders(true),
                    body: JSON.stringify({ id: docId, uid, updates: sanitizedUpdates })
                });
                if (res.ok) {
                    const resJson = await res.json();
                    if (resJson.success) {
                        directSuccess = true;
                        if (resJson.email) email = email || resJson.email;
                        if (resJson.name) name = name || resJson.name;
                        if (resJson.prevStatus) prevStatus = prevStatus || resJson.prevStatus;
                    } else {
                        throw new Error(resJson.error || 'Server failed to update creator');
                    }
                } else {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson.error || lastError?.message || 'Failed to update creator profile');
                }
            } catch (apiErr) {
                console.error('[store] Both direct and serverless updateCreator failed:', apiErr);
                throw apiErr;
            }
        }

        // Optimistically update local Zustand store
        set(state => ({
            creators: (state.creators || []).map(c => 
                (c.id === docId || c.uid === docId || c.uid === uid || c.id === uid)
                    ? { ...c, ...sanitizedUpdates }
                    : c
            )
        }));

        // Approved / rejected: the server sends the email (and push, in-app) from the saved record.
        const decided = sanitizedUpdates.profileStatus;
        if ((decided === 'approved' || decided === 'rejected') && prevStatus !== decided && email) {
            await notifyEvent(decided === 'approved' ? 'creator-approved' : 'creator-rejected', { creatorId: writtenId, reason: sanitizedUpdates.rejectionReason || '' });
        }
    },
    deleteCreator: async (uid) => {
        if (!uid) return;
        const { creators } = get();
        const existingCreator = (creators || []).find(c => 
            c.id === uid || c.uid === uid || (c.creatorId && String(c.creatorId).toUpperCase() === String(uid).toUpperCase())
        );
        const docId = existingCreator?.id || existingCreator?.uid || uid;

        let deleteSuccess = false;
        try {
            await deleteDoc(doc(db, 'creators', docId));
            deleteSuccess = true;
        } catch (fsErr) {
            console.warn('[store] Direct deleteCreator failed, falling back to server API:', fsErr.message);
        }

        if (!deleteSuccess) {
            try {
                // The server only deletes for signed-in admins.
                const res = await fetch('/api/creator-join?action=creator-delete', {
                    method: 'POST',
                    headers: await authJsonHeaders(),
                    body: JSON.stringify({ id: docId, uid })
                });
                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson.error || 'Failed to delete creator');
                }
            } catch (apiErr) {
                console.error('[store] Both direct and server deleteCreator failed:', apiErr);
                throw apiErr;
            }
        }

        set(state => ({
            creators: (state.creators || []).filter(c => 
                c.id !== docId && c.uid !== docId && c.id !== uid && c.uid !== uid
            )
        }));
    },
    mergeBangaloreCreatorsToBengaluru: async () => {
        const { creators } = get();
        const isBangaloreVariant = (city) => {
            if (!city) return false;
            const c = city.trim().toLowerCase();
            return c === 'bangalore' || c === 'banglore' || c === 'bengaluru south' || c === 'bengaluru north' || c.includes('bangalore') || c.includes('banglore');
        };
        const affected = (creators || []).filter(c => isBangaloreVariant(c.city));
        let updatedCount = 0;
        for (const creator of affected) {
            // Doc id first (it is always the document key; uid can differ on old records).
            const docId = creator.id || creator.uid;
            if (docId) {
                try {
                    await get().updateCreator(docId, { city: 'Bengaluru' });
                    updatedCount++;
                } catch (e) {
                    console.error(`Failed to merge creator ${docId} to Bengaluru:`, e);
                }
            }
        }
        return { totalFound: affected.length, updatedCount };
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
            const shortlisted = data.shortlistedCampaigns || [];
            
            const campaign = (get().campaigns || []).find(c => c.id === campaignId);
            const minFollowers = Number(campaign?.minInstagramFollowers || 0);
            const creatorFollowers = Number(data.instagramFollowers || 0);
            const meetsFollowers = creatorFollowers >= minFollowers;
            const meetsCity = isCampaignCityMatch(campaign?.targetCity, data.city);
            const shouldAutoShortlist = Boolean(campaign?.autoShortlistEligible) && meetsFollowers && meetsCity;

            const updates = {};
            if (!joined.includes(campaignId)) {
                updates.joinedCampaigns = [...joined, campaignId];
            }
            if (shouldAutoShortlist && !shortlisted.includes(campaignId)) {
                updates.shortlistedCampaigns = [...shortlisted, campaignId];
            }

            if (Object.keys(updates).length > 0) {
                await updateDoc(creatorRef, updates);
                set(state => ({
                    creators: (state.creators || []).map(c => 
                        (c.id === uid || c.uid === uid)
                            ? { ...c, ...updates }
                            : c
                    )
                }));
            }
        }
    },

    // Campaigns / Gigs
    addCampaign: async (campaign, options = {}) => {
        // eslint-disable-next-line no-unused-vars
        const { id: _ignoredId, ...rest } = campaign || {};
        const now = new Date().toISOString();
        // A campaign is announced (email + in-app) once, when it goes live.
        const willAnnounce = rest.status === 'Open' && options.notify !== false;
        const cleanedData = stripUndefinedDeep({
            ...rest,
            brand: rest.brand || '',
            brandLogo: rest.brandLogo || '',
            totalSpots: (rest.totalSpots !== undefined && rest.totalSpots !== '' && rest.totalSpots !== null) ? Number(rest.totalSpots) : null,
            spotsLeft: (rest.spotsLeft !== undefined && rest.spotsLeft !== '' && rest.spotsLeft !== null) ? Number(rest.spotsLeft) : null,
            minInstagramFollowers: Number(rest.minInstagramFollowers) || 0,
            thumbnail: rest.thumbnail || '',
            tasks: rest.tasks || [], // Store tasks directly in campaign structure for now
            createdAt: now,
            ...(willAnnounce ? { announcedAt: now } : {}),
        });
        const docRef = await addDoc(collection(db, 'campaigns'), cleanedData);

        if (willAnnounce) {
            notifyMatchingCreatorsOfCampaign({ ...cleanedData, id: docRef.id }, get().creators);
        }
        return docRef.id;
    },
    /**
     * options.notify: when this update opens the campaign, true announces it to
     * matching creators again, false never does. Left out, only a campaign that
     * was never announced (a draft being published) is announced.
     */
    updateCampaign: async (id, updates, options = {}) => {
        const cleanedUpdates = {};
        for (const [key, val] of Object.entries(updates || {})) {
            if (key !== 'id' && val !== undefined) {
                cleanedUpdates[key] = val;
            }
        }
        if (cleanedUpdates.totalSpots !== undefined) {
            cleanedUpdates.totalSpots = (cleanedUpdates.totalSpots !== '' && cleanedUpdates.totalSpots !== null) ? Number(cleanedUpdates.totalSpots) : null;
        }
        if (cleanedUpdates.spotsLeft !== undefined) {
            cleanedUpdates.spotsLeft = (cleanedUpdates.spotsLeft !== '' && cleanedUpdates.spotsLeft !== null) ? Number(cleanedUpdates.spotsLeft) : null;
        }
        if (cleanedUpdates.minInstagramFollowers !== undefined) {
            cleanedUpdates.minInstagramFollowers = Number(cleanedUpdates.minInstagramFollowers) || 0;
        }

        const before = (get().campaigns || []).find(c => c.id === id);
        // Optimistically update local Zustand store immediately
        set(state => ({
            campaigns: (state.campaigns || []).map(c => c.id === id ? { ...c, ...cleanedUpdates } : c)
        }));

        const ref = doc(db, 'campaigns', id);
        let result;
        try {
            // Read-then-write in one transaction so a save never wipes task
            // submissions that arrived while the editor was open.
            result = await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists()) throw new Error('This campaign no longer exists.');
                const stored = snap.data();
                const write = { ...cleanedUpdates };
                if (Array.isArray(write.tasks)) write.tasks = mergeLiveTaskProgress(write.tasks, stored.tasks);
                const opening = write.status === 'Open' && stored.status !== 'Open';
                const announce = opening && (options.notify === true
                    || (options.notify === undefined && !stored.announcedAt && stored.status === 'Draft'));
                if (announce) write.announcedAt = new Date().toISOString();
                const clean = stripUndefinedDeep(write);
                tx.update(ref, clean);
                return { stored, written: clean, announce };
            });
        } catch (err) {
            if (before) {
                set(state => ({ campaigns: (state.campaigns || []).map(c => c.id === id ? before : c) }));
            }
            throw err;
        }

        set(state => ({
            campaigns: (state.campaigns || []).map(c => c.id === id ? { ...c, ...result.written } : c)
        }));

        if (result.announce) {
            notifyMatchingCreatorsOfCampaign({ ...result.stored, ...result.written, id }, get().creators);
        }
    },
    // Tell matching creators about a live campaign again (email + in-app).
    announceCampaign: async (id) => {
        const snap = await getDoc(doc(db, 'campaigns', id));
        if (!snap.exists()) throw new Error('This campaign no longer exists.');
        await notifyMatchingCreatorsOfCampaign({ ...snap.data(), id }, get().creators, { again: true });
        const announcedAt = new Date().toISOString();
        await updateDoc(doc(db, 'campaigns', id), { announcedAt });
        set(state => ({ campaigns: (state.campaigns || []).map(c => c.id === id ? { ...c, announcedAt } : c) }));
    },
    // Deletes the campaign, then takes it off creators' applied / selected
    // lists so their profiles and counts don't point at a campaign that's gone.
    // Payout records stay on the creator as history.
    deleteCampaign: async (id) => {
        await deleteDoc(doc(db, 'campaigns', id));
        set(state => ({ campaigns: (state.campaigns || []).filter(c => c.id !== id) }));

        const linked = (get().creators || []).filter(c =>
            (c.joinedCampaigns || []).includes(id) || (c.shortlistedCampaigns || []).includes(id));
        if (!linked.length) return { cleaned: 0, failed: 0 };

        const { arrayRemove } = await import('firebase/firestore');
        const cleaned = [];
        let failed = 0;
        await Promise.all(linked.map(async (c) => {
            const docId = c.id || c.uid;
            const next = {
                joinedCampaigns: (c.joinedCampaigns || []).filter(x => x !== id),
                shortlistedCampaigns: (c.shortlistedCampaigns || []).filter(x => x !== id),
            };
            try {
                await updateDoc(doc(db, 'creators', docId), { joinedCampaigns: arrayRemove(id), shortlistedCampaigns: arrayRemove(id) });
                cleaned.push({ key: docId, next });
            } catch (fsErr) {
                try {
                    const res = await fetch('/api/creator-join?action=creator-update', {
                        method: 'POST',
                        headers: await authJsonHeaders(),
                        body: JSON.stringify({ id: docId, uid: c.uid || docId, updates: next })
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    cleaned.push({ key: docId, next });
                } catch (apiErr) {
                    failed += 1;
                    console.warn('[store] Could not unlink creator from deleted campaign:', docId, apiErr?.message || fsErr?.message);
                }
            }
        }));
        const byKey = new Map(cleaned.map(x => [x.key, x.next]));
        set(state => ({
            creators: (state.creators || []).map(c => {
                const next = byKey.get(c.id || c.uid);
                return next ? { ...c, ...next } : c;
            })
        }));
        return { cleaned: cleaned.length, failed };
    },

    // Task Submission & Review (Dynamic Task System)
    submitTaskProof: async (campaignId, taskId, creatorUid, options = {}, maybeProof = '') => {
        const contentLink = typeof options === 'string' ? options : (options?.contentLink || '');
        const proofUrl = typeof options === 'object' && options !== null ? (options?.proofUrl || '') : (maybeProof || '');

        const { campaigns } = get();
        let campaign = (campaigns || []).find(c => c.id === campaignId);
        if (!campaign) {
            const snap = await getDoc(doc(db, 'campaigns', campaignId));
            if (snap.exists()) {
                campaign = { id: snap.id, ...snap.data() };
            }
        }
        if (!campaign) throw new Error("Campaign not found");

        const submissionData = {
            status: 'submitted',
            contentLink: contentLink || '',
            proofUrl: proofUrl || '',
            submittedAt: new Date().toISOString(),
            reviewedAt: null,
            rejectionReason: ''
        };
        const userUid = get().user?.uid;
        const withSubmission = (tasks) => (tasks || []).map(t => {
            if (t.id === taskId || String(t.id) === String(taskId)) {
                const submissions = { ...(t.submissions || {}) };
                submissions[creatorUid] = submissionData;
                if (userUid && userUid !== creatorUid) {
                    submissions[userUid] = submissionData;
                }
                const completedBy = Array.from(new Set([...(t.completedBy || []), creatorUid, userUid].filter(Boolean)));
                return { ...t, submissions, completedBy };
            }
            return t;
        });
        const previousTasks = campaign.tasks || [];

        // 1. Optimistically update local Zustand store so UI updates immediately
        set(state => ({
            campaigns: (state.campaigns || []).map(c => 
                c.id === campaignId ? { ...c, tasks: withSubmission(previousTasks) } : c
            )
        }));

        // 2. Persist to Firestore with serverless fallback for security rule resilience.
        // Built from the stored campaign inside a transaction so two creators
        // submitting at once (or an admin reviewing) never overwrite each other.
        let directSuccess = false;
        try {
            await runTransaction(db, async (tx) => {
                const ref = doc(db, 'campaigns', campaignId);
                const snap = await tx.get(ref);
                if (!snap.exists()) throw new Error('Campaign not found');
                tx.update(ref, { tasks: withSubmission(snap.data().tasks) });
            });
            directSuccess = true;
        } catch (fsErr) {
            console.warn('[store] Direct updateDoc on campaigns failed, using serverless fallback:', fsErr.message);
        }

        if (!directSuccess) {
            try {
                // The server re-reads the campaign and adds this one submission.
                const res = await fetch('/api/creator-join?action=campaign-task-submit', {
                    method: 'POST',
                    headers: await authJsonHeaders(),
                    body: JSON.stringify({
                        campaignId,
                        taskId,
                        creatorUid,
                        contentLink,
                        proofUrl
                    })
                });
                if (res.ok) {
                    const resJson = await res.json();
                    if (!resJson.success) {
                        throw new Error(resJson.error || 'Server failed to save task submission');
                    }
                } else {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson.error || 'Failed to save task submission to database');
                }
            } catch (apiErr) {
                console.error('[store] Both direct and serverless task submission failed:', apiErr);
                set(state => ({
                    campaigns: (state.campaigns || []).map(c =>
                        c.id === campaignId ? { ...c, tasks: previousTasks } : c
                    )
                }));
                throw apiErr;
            }
        }
    },

    // Alias for submitTaskProof with flexible argument support
    submitTask: async (campaignId, taskId, creatorUid, contentLinkOrOptions, maybeProofUrl) => {
        const payload = typeof contentLinkOrOptions === 'object' && contentLinkOrOptions !== null
            ? contentLinkOrOptions
            : { contentLink: contentLinkOrOptions || '', proofUrl: maybeProofUrl || '' };
        return await get().submitTaskProof(campaignId, taskId, creatorUid, payload);
    },

    uploadTaskProof: async (file) => {
        if (!file) return '';
        return await get().uploadToCloudinary(file);
    },

    reviewTaskSubmission: async (campaignId, taskId, creatorUid, status, rejectionReason = '') => {
        return get().reviewTaskSubmissions(campaignId, [{ taskId, creatorUid, status, rejectionReason }]);
    },

    /**
     * Approve / request changes on several submissions in one write.
     * reviews: [{ taskId, creatorUid, keys?: [uid, docId], status, rejectionReason }]
     * `keys` covers creators whose submissions are stored under both their auth
     * uid and their profile id. Read and written in one transaction so a
     * creator submitting at the same moment isn't lost.
     */
    reviewTaskSubmissions: async (campaignId, allReviews = []) => {
        if (!allReviews.length) return 0;
        const reviewedAt = new Date().toISOString();

        // Submissions made in the app are reviewed where they live
        // (campaigns/{id}/submissions/{uid}); older ones on the campaign doc.
        const appReviews = [];
        const reviews = [];
        allReviews.forEach(r => {
            const keys = Array.from(new Set([...(r.keys || []), r.creatorUid].filter(Boolean)));
            const appKey = keys.find(k => isAppSubmission(appSubmissionIndex, campaignId, k, r.taskId));
            if (appKey) appReviews.push({ ...r, appKey });
            else reviews.push(r);
        });
        if (appReviews.length) {
            const batch = writeBatch(db);
            appReviews.forEach(r => {
                const field = (name) => new FieldPath('tasks', String(r.taskId), name);
                batch.update(doc(db, 'campaigns', campaignId, 'submissions', r.appKey),
                    field('status'), r.status,
                    field('rejectionReason'), r.status === 'rejected' ? (r.rejectionReason || '') : '',
                    field('reviewedAt'), reviewedAt,
                    field('reviewedBy'), get().user?.email || null,
                    'updatedAt', reviewedAt);
            });
            await batch.commit();
        }
        if (!reviews.length) return appReviews.length;

        let applied = 0;
        const applyReviews = (tasks) => {
            applied = 0;
            return (tasks || []).map(t => {
                const mine = reviews.filter(r => String(r.taskId) === String(t.id));
                if (!mine.length) return t;
                const submissions = { ...(t.submissions || {}) };
                let verifiedBy = Array.from(t.verifiedBy || []);
                mine.forEach(r => {
                    const keys = Array.from(new Set([...(r.keys || []), r.creatorUid].filter(Boolean)));
                    keys.forEach(key => {
                        if (submissions[key]) {
                            submissions[key] = {
                                ...submissions[key],
                                status: r.status,
                                rejectionReason: r.status === 'rejected' ? (r.rejectionReason || '') : '',
                                reviewedAt
                            };
                            applied += 1;
                        }
                        // Sync with legacy arrays
                        if (r.status === 'approved' && !verifiedBy.includes(key)) {
                            verifiedBy = [...verifiedBy, key];
                        } else if (r.status === 'rejected') {
                            verifiedBy = verifiedBy.filter(uid => uid !== key);
                        }
                    });
                });
                return { ...t, submissions, verifiedBy };
            });
        };

        const ref = doc(db, 'campaigns', campaignId);
        const tasks = await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) throw new Error('Campaign not found');
            const next = applyReviews(snap.data().tasks);
            tx.update(ref, { tasks: next });
            return next;
        });

        if (rawCampaigns) rawCampaigns = rawCampaigns.map(c => (c.id === campaignId ? { ...c, tasks } : c));
        set(state => ({
            campaigns: mergeAppSubmissions((state.campaigns || []).map(c => 
                c.id === campaignId ? { ...c, tasks } : c
            ), appSubmissionIndex)
        }));
        return applied + appReviews.length;
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
            await addDoc(collection(db, 'upcoming_events'), {
                ...giveawayMirrorEvent(giveaway),
                isGiveaway: true,
                giveawayId: docRef.id,
                order: (get().upcomingEvents || []).reduce((max, i) => Math.max(max, i.order || 0), 0) + 1
            });
        }

        // 2. Also Post to Announcements
        if (giveaway.alsoPostToAnnouncements) {
            const minOrder = (get().announcements || []).reduce((min, i) => Math.min(min, i.order || 0), 0);
            await addDoc(collection(db, 'announcements'), {
                ...giveawayMirrorAnnouncement(giveaway),
                date: new Date().toISOString().split('T')[0],
                isPinned: false,
                order: minOrder - 1,
                linkedGiveawayId: docRef.id
            });
        }

        return docRef;
    },
    // Partial updates are fine: the home card and announcement are synced from
    // the saved giveaway merged with the update, never with blanks.
    updateGiveaway: async (id, updates) => {
        const { id: _ignoredId, ...data } = updates;
        const before = await getDoc(doc(db, 'giveaways', id)).catch(() => null);
        const previous = before?.exists() ? before.data() : {};
        await updateDoc(doc(db, 'giveaways', id), data);
        const giveaway = { ...previous, ...data };

        try {
            const eventSnap = await getDocs(query(collection(db, 'upcoming_events'), where('giveawayId', '==', id)));
            if (!eventSnap.empty && data.alsoPostToUpcomingEvents === false) {
                await Promise.all(eventSnap.docs.map(d => deleteDoc(doc(db, 'upcoming_events', d.id))));
            } else if (!eventSnap.empty) {
                const { order: _o, ...mirror } = giveawayMirrorEvent(giveaway);
                await Promise.all(eventSnap.docs.map(d => updateDoc(doc(db, 'upcoming_events', d.id), mirror)));
            } else if (data.alsoPostToUpcomingEvents) {
                await addDoc(collection(db, 'upcoming_events'), {
                    ...giveawayMirrorEvent(giveaway),
                    isGiveaway: true,
                    giveawayId: id,
                    order: (get().upcomingEvents || []).reduce((max, i) => Math.max(max, i.order || 0), 0) + 1
                });
            }

            const announcementSnap = await getDocs(query(collection(db, 'announcements'), where('linkedGiveawayId', '==', id)));
            if (!announcementSnap.empty) {
                await Promise.all(announcementSnap.docs.map(d => updateDoc(doc(db, 'announcements', d.id), giveawayMirrorAnnouncement(giveaway))));
            } else if (data.alsoPostToAnnouncements && !previous.alsoPostToAnnouncements) {
                // Switched on while editing: post it now.
                const minOrder = (get().announcements || []).reduce((min, i) => Math.min(min, i.order || 0), 0);
                await addDoc(collection(db, 'announcements'), {
                    ...giveawayMirrorAnnouncement(giveaway),
                    date: new Date().toISOString().split('T')[0],
                    isPinned: false,
                    order: minOrder - 1,
                    linkedGiveawayId: id
                });
            }
        } catch (err) {
            console.warn('[updateGiveaway] Home card / announcement sync failed:', err);
        }
    },
    // Entries are kept (they hold people's details and any winner record); the
    // home card and announcement that point at the deleted page are removed.
    deleteGiveaway: async (id) => {
        await deleteDoc(doc(db, 'giveaways', id));
        try {
            const [eventSnap, announcementSnap] = await Promise.all([
                getDocs(query(collection(db, 'upcoming_events'), where('giveawayId', '==', id))),
                getDocs(query(collection(db, 'announcements'), where('linkedGiveawayId', '==', id))),
            ]);
            await Promise.all([
                ...eventSnap.docs.map(d => deleteDoc(doc(db, 'upcoming_events', d.id))),
                ...announcementSnap.docs.map(d => deleteDoc(doc(db, 'announcements', d.id))),
            ]);
        } catch (err) {
            console.warn('[deleteGiveaway] Cleanup failed:', err);
        }
    },
    // One entry per person per giveaway. New entries use a fixed id
    // (campaign_user) inside a transaction, so a double tap can't create two.
    // Giveaway entries, tasks and the spin are written by the server (api/_lib/community.js), which also scores them.
    deleteGiveawayEntry: async (id) => {
        await deleteDoc(doc(db, 'giveaway_entries', id));
    },
    // Confirm drawn winners. A transaction re-checks every entry so nobody is
    // crowned twice or after being disqualified, even if two admins draw at
    // once. The draw (who, when, by whom, pool size, re-rolls) is logged on
    // the giveaway.
    confirmGiveawayWinners: async (giveawayId, winners, draw = {}, { close = false } = {}) => {
        const { user } = get();
        const at = new Date().toISOString();
        const drawId = `draw_${Date.now().toString(36)}`;
        const giveawayRef = doc(db, 'giveaways', giveawayId);
        await runTransaction(db, async (tx) => {
            const refs = winners.map(w => doc(db, 'giveaway_entries', w.entryId));
            const snaps = await Promise.all(refs.map(r => tx.get(r)));
            snaps.forEach((snap, i) => {
                const data = snap.exists() ? snap.data() : null;
                if (!data || data.campaignId !== giveawayId) throw new Error(`${winners[i].name || 'An entry'} is no longer in this giveaway.`);
                if (data.isWinner) throw new Error(`${data.name || 'Someone'} has already been picked as a winner.`);
                if (data.disqualified) throw new Error(`${data.name || 'Someone'} has been disqualified.`);
            });
            refs.forEach((r, i) => tx.update(r, {
                isWinner: true,
                prize: winners[i].prize || null,
                winnerSelectedAt: at,
                winnerSelectedBy: user?.email || user?.uid || null,
                drawId,
            }));
            const giveawayUpdate = {
                lastDrawAt: at,
                drawHistory: arrayUnion({
                    id: drawId,
                    type: 'draw',
                    at,
                    by: user?.email || user?.uid || null,
                    winners: winners.map(w => ({ entryId: w.entryId, name: w.name || '', prize: w.prize || null })),
                    rerolled: draw.rerolled || [],
                    poolSize: draw.poolSize || 0,
                    mode: draw.mode || 'weighted',
                    manual: Boolean(draw.manual),
                }),
            };
            if (close) {
                giveawayUpdate.status = 'Closed';
                giveawayUpdate.closedAt = at;
            }
            tx.update(giveawayRef, giveawayUpdate);
        });
        return drawId;
    },
    revokeGiveawayWinner: async (giveawayId, entry, reason = '') => {
        const { user } = get();
        const at = new Date().toISOString();
        const batch = writeBatch(db);
        batch.update(doc(db, 'giveaway_entries', entry.id), {
            isWinner: false,
            prize: null,
            winnerSelectedAt: null,
            winnerRevokedAt: at,
        });
        batch.update(doc(db, 'giveaways', giveawayId), {
            drawHistory: arrayUnion({ id: `revoke_${Date.now().toString(36)}`, type: 'revoke', at, by: user?.email || user?.uid || null, entryId: entry.id, name: entry.name || '', reason }),
        });
        await batch.commit();
    },
    setGiveawayEntriesDisqualified: async (ids, disqualified, reason = '') => {
        const at = new Date().toISOString();
        for (let i = 0; i < ids.length; i += 400) {
            const batch = writeBatch(db);
            ids.slice(i, i + 400).forEach(id => batch.update(doc(db, 'giveaway_entries', id), disqualified
                ? { disqualified: true, disqualifiedReason: reason || null, disqualifiedAt: at }
                : { disqualified: false, disqualifiedReason: null, disqualifiedAt: null }));
            await batch.commit();
        }
    },
    deleteGiveawayEntries: async (ids) => {
        for (let i = 0; i < ids.length; i += 400) {
            const batch = writeBatch(db);
            ids.slice(i, i + 400).forEach(id => batch.delete(doc(db, 'giveaway_entries', id)));
            await batch.commit();
        }
    },
    closeGiveaways: async (ids) => {
        const at = new Date().toISOString();
        const batch = writeBatch(db);
        ids.forEach(id => batch.update(doc(db, 'giveaways', id), { status: 'Closed', closedAt: at }));
        await batch.commit();
    },

    // Bulk Shortlist Helpers
    bulkUpdateCreatorStatus: async (uidArray, status) => {
        const { creators } = get();
        const updatePromises = uidArray.map(async (uid) => {
            const found = (creators || []).find(c => c.uid === uid || c.id === uid);
            const docId = found?.id || found?.uid || uid;
            try {
                await updateDoc(doc(db, 'creators', docId), { profileStatus: status });
            } catch (fsErr) {
                console.warn('[store] Direct bulkUpdateCreatorStatus failed, falling back to server API:', fsErr.message);
                await fetch('/api/creator-join?action=creator-update', {
                    method: 'POST',
                    headers: await authJsonHeaders(),
                    body: JSON.stringify({ id: docId, uid, updates: { profileStatus: status } })
                }).catch(err => console.error('[store] Server fallback for bulkUpdateCreatorStatus error:', err));
            }
        });
        await Promise.all(updatePromises);
        set(state => ({
            creators: (state.creators || []).map(c => 
                uidArray.includes(c.uid) || uidArray.includes(c.id)
                    ? { ...c, profileStatus: status }
                    : c
            )
        }));
    },

    /**
     * Select (shortlist) or unselect creators for a campaign. Each creator is
     * written on its own; returns { done, failed } (lists of the ids passed in)
     * and only changes local state for writes that actually saved. Throws when
     * nothing could be saved.
     */
    bulkShortlistCreators: async (campaignId, uidArray, shouldShortlist = true) => {
        const { creators } = get();
        const { arrayRemove } = await import('firebase/firestore');
        const done = [];
        const failed = [];
        await Promise.all((uidArray || []).map(async (uid) => {
            const creator = (creators || []).find(c => c.uid === uid || c.id === uid);
            if (!creator) { failed.push(uid); return; }
            const docId = creator.id || creator.uid || uid;
            const shortlisted = creator.shortlistedCampaigns || [];
            if (shouldShortlist === shortlisted.includes(campaignId)) { done.push(uid); return; }
            try {
                await updateDoc(doc(db, 'creators', docId), {
                    shortlistedCampaigns: shouldShortlist ? arrayUnion(campaignId) : arrayRemove(campaignId)
                });
                done.push(uid);
            } catch (fsErr) {
                console.warn('[store] Direct bulkShortlistCreators failed, falling back to server API:', fsErr?.message);
                try {
                    const res = await fetch('/api/creator-join?action=creator-update', {
                        method: 'POST',
                        headers: await authJsonHeaders(),
                        body: JSON.stringify({ id: docId, uid: creator.uid || uid, updates: { shortlistedCampaigns: shouldShortlist ? Array.from(new Set([...shortlisted, campaignId])) : shortlisted.filter(id => id !== campaignId) } })
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    done.push(uid);
                } catch (apiErr) {
                    console.error('[store] API fallback error:', apiErr);
                    failed.push(uid);
                }
            }
        }));
        set(state => ({
            creators: (state.creators || []).map(c => {
                if (done.includes(c.uid) || done.includes(c.id)) {
                    const currentShortlisted = c.shortlistedCampaigns || [];
                    return {
                        ...c,
                        shortlistedCampaigns: shouldShortlist
                            ? Array.from(new Set([...currentShortlisted, campaignId]))
                            : currentShortlisted.filter(id => id !== campaignId)
                    };
                }
                return c;
            })
        }));
        if (!done.length && failed.length) throw new Error("Couldn't update those creators.");
        return { done, failed };
    },

    toggleShortlistStatus: async (campaignId, creatorUid) => {
        const { creators } = get();
        const creator = (creators || []).find(c => c.uid === creatorUid || c.id === creatorUid);
        if (!creator) throw new Error('Creator not found');
        const isCurrentlyShortlisted = (creator.shortlistedCampaigns || []).includes(campaignId);
        await get().bulkShortlistCreators(campaignId, [creatorUid], !isCurrentlyShortlisted);
        return !isCurrentlyShortlisted;
    },

    /**
     * Admin-only notes about a creator's place in one campaign, kept on the
     * creator: patch.stage ('shortlisted' | 'declined' | null) and patch.payout
     * ({ status: 'paid', amount, paidAt, note } | null). Returns { done, failed }.
     */
    setCampaignApplicantMeta: async (campaignId, uidArray, patch = {}) => {
        const { creators } = get();
        const { FieldPath } = await import('firebase/firestore');
        const fields = [];
        if ('stage' in patch) fields.push(['campaignStages', patch.stage ?? null]);
        if ('payout' in patch) fields.push(['campaignPayouts', patch.payout ?? null]);
        if (!fields.length) return { done: [], failed: [] };
        const done = [];
        const failed = [];
        await Promise.all((uidArray || []).map(async (uid) => {
            const creator = (creators || []).find(c => c.uid === uid || c.id === uid);
            const docId = creator?.id || creator?.uid || uid;
            try {
                const args = fields.flatMap(([field, value]) => [new FieldPath(field, campaignId), value]);
                await updateDoc(doc(db, 'creators', docId), ...args);
                done.push(uid);
            } catch (fsErr) {
                try {
                    const updates = Object.fromEntries(fields.map(([field, value]) => [field, { [campaignId]: value }]));
                    const res = await fetch('/api/creator-join?action=creator-update', {
                        method: 'POST',
                        headers: await authJsonHeaders(),
                        body: JSON.stringify({ id: docId, uid: creator?.uid || uid, updates })
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    done.push(uid);
                } catch (apiErr) {
                    console.error('[store] setCampaignApplicantMeta failed:', fsErr?.message, apiErr?.message);
                    failed.push(uid);
                }
            }
        }));
        set(state => ({
            creators: (state.creators || []).map(c => {
                if (!(done.includes(c.uid) || done.includes(c.id))) return c;
                const next = { ...c };
                fields.forEach(([field, value]) => { next[field] = { ...(c[field] || {}), [campaignId]: value }; });
                return next;
            })
        }));
        if (!done.length && failed.length) throw new Error("Couldn't save that change.");
        return { done, failed };
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
    // Rejecting frees the seat (capacity counts only live orders) and gives the
    // coupon use back, exactly once, inside a transaction.
    rejectTicketOrder: async (id) => {
        const orderRef = doc(db, 'ticket_orders', id);
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(orderRef);
            if (!snap.exists()) return;
            const order = snap.data();
            const couponId = order.appliedCoupon?.id;
            const releaseCoupon = couponId && !order.couponReleased;
            const couponRef = releaseCoupon ? doc(db, 'coupons', couponId) : null;
            const couponSnap = couponRef ? await tx.get(couponRef) : null;
            tx.update(orderRef, {
                status: 'rejected',
                rejectedAt: new Date().toISOString(),
                ...(releaseCoupon ? { couponReleased: true } : {})
            });
            if (couponSnap?.exists() && Number(couponSnap.data().usedCount || 0) > 0) {
                tx.update(couponRef, { usedCount: increment(-1) });
            }
        });
    },

    // One check-in helper for the desk and the order list. Writes every field the
    // scanner, the desk and older screens read, and never changes the payment status.
    setTicketCheckIn: async (orderId, checkedIn) => {
        const now = new Date().toISOString();
        await updateDoc(doc(db, 'ticket_orders', orderId), checkedIn
            ? { attended: true, attendedAt: now, isScanned: true, scannedAt: now }
            : { attended: false, attendedAt: null, isScanned: false, scannedAt: null });
    },
    setGuestCheckIn: async (guestlistId, entryId, checkedIn) => {
        await updateDoc(doc(db, 'guestlists', guestlistId, 'entries', entryId), {
            attended: checkedIn,
            attendedAt: checkedIn ? new Date().toISOString() : null
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
    // Fallback used by checkout when the ticket API is unreachable. Reads the
    // coupon straight from Firestore (the coupons list is only loaded for admins).
    validateCoupon: async (code, eventId) => {
        const normalized = normalizeCouponCode(code);
        let candidates = (get().coupons || []).filter(c => normalizeCouponCode(c.code) === normalized);
        if (!candidates.length) {
            const snap = await getDocs(query(collection(db, 'coupons'), where('code', '==', normalized), limit(10)));
            candidates = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        }
        const coupon = candidates.find(c => c.eventId === eventId && c.isActive !== false)
            || candidates.find(c => !c.eventId && c.isActive !== false)
            || candidates[0];
        const problem = couponProblem(coupon, eventId);
        if (problem) throw new Error(problem);
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

    // Popup sign-in, or a full-page redirect inside Instagram/WhatsApp in-app browsers.
    loginWithGoogle: async () => {
        const { signInWithGoogle } = await import('./googleSignIn');
        return signInWithGoogle();
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
            safeLocalStorage.removeItem(AUTH_CACHE_KEY);
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
                    useStore.getState().addToast("Your account has been suspended. Contact support@newbi.live if you think this is a mistake.", 'error');
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
                        useStore.getState().addToast("You've been signed out for your security. Please sign in again.", 'warning');
                        return;
                    }
                }

                hasJoinedTribe = userData.hasJoinedTribe || false;
                hasJoinedWhatsapp = userData.hasJoinedWhatsapp || false;
                displayName = userData.displayName || displayName;

                // Update Last Active Timestamp (Fire and forget)
                setDoc(userRef, { lastActive: new Date().toISOString() }, { merge: true });

            } else {
                // Auto-create profile for ANY authenticated user missing in Firestore
                await setDoc(userRef, {
                    email: firebaseUser.email || '',
                    displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Member'),
                    hasJoinedTribe: false,
                    createdAt: firebaseUser.metadata?.creationTime || new Date().toISOString(),
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
        safeLocalStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
            user: {
                uid: finalUser.uid,
                role: finalUser.role,
                email: finalUser.email,
                phoneNumber: finalUser.phoneNumber,
                displayName: finalUser.displayName,
                hasJoinedTribe: finalUser.hasJoinedTribe,
                hasJoinedWhatsapp: finalUser.hasJoinedWhatsapp
            },
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
        safeLocalStorage.removeItem(AUTH_CACHE_KEY);
        set({ user: null, userListenerUnsubscribe: null });

    },

    deleteAccount: async () => {
        try {
            const { getAuth, deleteUser } = await import('firebase/auth');
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("No authenticated user");
            
            // Delete user document from Firestore
            await deleteDoc(doc(db, 'users', currentUser.uid));
            
            // Delete user from Firebase Auth
            await deleteUser(currentUser);
            
            // Clean up state
            get().logout();
            get().addToast("Your account has been deleted. Sorry to see you go.", "success");
        } catch (error) {
            console.error("Error deleting account:", error);
            if (error.code === 'auth/requires-recent-login') {
                get().addToast("For your security, please sign out and sign back in, then try deleting your account again.", "warning");
            } else {
                get().addToast("Couldn't delete your account. Please contact support@newbi.live.", "error");
            }
        }
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
                    get().addToast("Your account has been suspended. Contact support@newbi.live if you think this is a mistake.", 'error');
                    return;
                }

                // 2. Check if user has been logged out from all devices
                if (userData.forceLogoutBefore) {
                    const sessionTimestamp = getSessionTimestamp();
                    const forceLogoutTime = new Date(userData.forceLogoutBefore).getTime();
                    if (sessionTimestamp < forceLogoutTime) {
                        console.warn("User session has been revoked. Revoking local session.");
                        get().logout();
                        get().addToast("You've been signed out for your security. Please sign in again.", 'warning');
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
                // If resolving admin where targetUid is doc.id (a 20-character Firestore id, not a real Auth UID), resolve it via email
                if (targetEmail && (!resolvedUid || resolvedUid.length <= 20 || resolvedUid === targetEmail)) {
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
                    // Someone else was asked for but has no account: never fall back to signing out the caller.
                    if (targetEmail || targetUid) throw new Error("That person doesn't have an account to sign out of.");
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

        // If revoking own sessions, run local logout. (A target given only by
        // email is someone else unless it is our own address.)
        const ownEmail = (currentUser.email || '').toLowerCase();
        const isSelf = (!targetUid && !targetEmail)
            || targetUid === currentUser.uid
            || (!targetUid && targetEmail && targetEmail.toLowerCase() === ownEmail);
        if (isSelf) {
            await get().logout();
        }
        return data;
    },

    syncAuthUsers: async (options = {}) => {
        const { silent = false } = (typeof options === 'boolean') ? { silent: options } : options;
        if (get().isSyncingUsers) return;

        set({ isSyncingUsers: true, authSyncError: null });

        try {
            const { getAuth } = await import('firebase/auth');
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser) {
                set({ isSyncingUsers: false });
                if (!silent) throw new Error("Authentication required to sync members");
                return;
            }

            const token = await currentUser.getIdToken(true);
            const response = await fetch('/api/sync-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 404) {
                throw new Error("Sync endpoint (/api/sync-users) is not accessible (404). If testing locally, please restart the Vite dev server (npm run dev). If in production, ensure the new endpoint is deployed to Vercel.");
            }

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error(`Sync server returned non-JSON response (Status: ${response.status}). If running locally, check terminal console.`);
            }

            if (!response.ok) {
                throw new Error(data.error || "Failed to synchronize users");
            }

            const now = Date.now();
            set({
                isSyncingUsers: false,
                lastAuthUsersSyncedAt: now,
                authSyncError: null,
                ...(data.totalAuthUsers ? { totalAuthUsers: data.totalAuthUsers } : {})
            });

            try {
                if (data.totalAuthUsers) {
                    localStorage.setItem('newbi_total_auth_users', String(data.totalAuthUsers));
                }
                localStorage.setItem('newbi_last_auth_sync_time', String(now));
            } catch (e) {}

            if (!silent) {
                useStore.getState().addToast(data.message || `${data.syncedCount || 0} members updated.`, 'success');
            }

            return data;
        } catch (error) {
            console.error('[Store] syncAuthUsers error:', error);
            set({ isSyncingUsers: false, authSyncError: error.message });
            if (!silent) {
                useStore.getState().addToast(error.message || "Couldn't update the member list. Please try again.", 'error');
                throw error;
            }
        }
    },

    // ── Helper: get auth token for API calls ──────────────────────────────────
    _getAuthToken: async () => {
        const { getAuth } = await import('firebase/auth');
        const currentUser = getAuth().currentUser;
        if (!currentUser) throw new Error('Not authenticated');
        return currentUser.getIdToken(true);
    },

    // Members — count via server-side API (bypasses Firestore rules + browser blockers)
    fetchMembersCount: async () => {
        try {
            const token = await get()._getAuthToken();
            const response = await fetch('/api/get-members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ countOnly: true }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Count failed');
            if (Number.isFinite(data.count)) {
                set({ totalAuthUsers: data.count, membersCountedAt: Date.now() });
                try { localStorage.setItem('newbi_total_auth_users', String(data.count)); } catch (e) { /* private mode */ }
            }
            return data.count;
        } catch (error) {
            console.error('[Store] fetchMembersCount error:', error);
            return null;
        }
    },

    // Members — paginated fetch via server-side API (bypasses Firestore rules + browser blockers)
    // lastDoc is now a document ID string (not a DocumentSnapshot) for easy serialization
    fetchMembersPage: async (pageSize = 24, lastDoc = null) => {
        try {
            const token = await get()._getAuthToken();
            const startAfterDocId = lastDoc ? (typeof lastDoc === 'string' ? lastDoc : lastDoc.id) : null;
            const response = await fetch('/api/get-members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ pageSize, startAfterDocId }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Fetch failed');
            console.log('[Store] fetchMembersPage (API): got', data.data?.length, 'docs, hasMore:', data.hasMore);
            return { data: data.data || [], lastVisible: data.lastDocId || null, hasMore: data.hasMore || false };
        } catch (error) {
            console.error('[Store] fetchMembersPage error:', error);
            return { data: [], lastVisible: null, hasMore: false };
        }
    },


    // Maintenance Actions

    saveDashboardWidgets: async (widgets) => {
        try {
            if (!Array.isArray(widgets) || widgets.length !== 4) throw new Error('Exactly 4 widgets required');
            await setDoc(doc(db, 'app_state', 'dashboard_config'), { widgets, updatedAt: new Date().toISOString() });
            set({ dashboardWidgets: widgets });
        } catch (error) {
            console.error('Error saving dashboard widgets:', error);
            throw error;
        }
    },

    // `value` (optional): true = switched off / under maintenance. Only this one
    // key is written (merge), so a page opened before the live state loaded, or
    // two people switching different things at once, can't wipe other switches.
    toggleMaintenanceFeature: async (category, key, value) => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const maintenanceDocId = isLocal ? 'maintenance_local' : 'maintenance';

        console.log(`[Maintenance] Toggling ${category}.${key} in ${maintenanceDocId}`);

        try {
            const current = get().maintenanceState;
            const next = typeof value === 'boolean' ? value : !current[category]?.[key];
            const newState = {
                ...current,
                [category]: {
                    ...current[category],
                    [key]: next
                }
            };

            await setDoc(doc(db, 'app_state', maintenanceDocId), { [category]: { [key]: next } }, { merge: true });
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
            await get().setTicketCheckIn(id, true);
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


    // `value` (optional): the state to set, so a stale screen can't flip it the wrong way.
    // Throws on failure so the caller can keep its confirm open and say so.
    toggleGlobalMaintenance: async (value) => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const maintenanceDocId = isLocal ? 'maintenance_local' : 'maintenance';

        console.log(`[Maintenance] Toggling GLOBAL in ${maintenanceDocId}`);

        try {
            const current = get().maintenanceState;
            const newState = { global: typeof value === 'boolean' ? value : !current.global };
            console.log(`[Maintenance] New Global State:`, newState);
            await setDoc(doc(db, 'app_state', maintenanceDocId), newState, { merge: true });
            set({ maintenanceState: { ...current, ...newState } });
        } catch (error) {
            console.error(`[Maintenance] Failed to update global in ${maintenanceDocId}:`, error);
            throw error;
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
        // The server handles it: people who unsubscribed before get a confirm
        // email (double opt-in) instead of silently staying suppressed.
        try {
            const res = await subscribeToNewsletter(email, name);
            return { success: true, message: res.message || 'Successfully subscribed!', confirmRequired: Boolean(res.confirmRequired) };
        } catch (err) {
            if (err.status && err.status !== 404) return { success: false, message: err.message };
            // Offline local dev without the API: the old direct write.
        }
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
    deleteNotification: async (id) => {
        try {
            await deleteDoc(doc(db, 'notifications', id));
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    },

    saveFcmToken: async (token) => {
        const { user } = get();
        if (user) {
            // fcmTokens keeps every device; fcmToken stays for older readers.
            await setDoc(doc(db, 'users', user.uid), { fcmToken: token, fcmTokens: arrayUnion(token) }, { merge: true });
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

    saveEmailTemplate: async (templateData) => {
        const cleanData = { ...templateData };
        const id = cleanData.id;
        delete cleanData.id;
        
        // Remove undefined keys so Firestore doesn't throw invalid data errors
        Object.keys(cleanData).forEach(key => {
            if (cleanData[key] === undefined) {
                delete cleanData[key];
            }
        });

        // Automatically upload any embedded base64 images to Firebase Storage if permitted
        let processedData = cleanData;
        try {
            processedData = await processAndUploadBase64Fields(cleanData, `email_templates/${id || 'new'}`);
        } catch (storageErr) {
            console.warn("Storage upload warning:", storageErr);
        }
        
        const now = new Date().toISOString();

        const getLocalTemplates = () => {
            try {
                const stored = safeLocalStorage.getItem('nb_local_email_templates');
                return stored ? JSON.parse(stored) : [];
            } catch (e) { return []; }
        };
        const saveLocalTemplates = (list) => {
            try { safeLocalStorage.setItem('nb_local_email_templates', JSON.stringify(list)); } catch (e) {}
        };

        try {
            if (id && !id.startsWith('tpl_local_')) {
                processedData.updatedAt = now;
                await updateDoc(doc(db, 'email_templates', id), processedData);
                return id;
            } else {
                processedData.createdAt = now;
                processedData.updatedAt = now;
                const docRef = await addDoc(collection(db, 'email_templates'), processedData);
                
                // If it was previously saved locally, clean up local copy now that remote succeeded
                if (id && id.startsWith('tpl_local_')) {
                    const filtered = getLocalTemplates().filter(t => t.id !== id);
                    saveLocalTemplates(filtered);
                }
                return docRef.id;
            }
        } catch (error) {
            console.warn("Firestore email_templates write notice:", error);
            const isPermissionError = error.code === 'permission-denied' || 
                                      (error.message && error.message.toLowerCase().includes('permission'));

            // Generate fallback local ID if new or previous local
            const fallbackId = id || `tpl_local_${Date.now()}`;
            const fallbackObj = {
                id: fallbackId,
                ...processedData,
                createdAt: processedData.createdAt || now,
                updatedAt: now,
                isLocalFallback: true
            };

            const localList = getLocalTemplates();
            const idx = localList.findIndex(t => t.id === fallbackId);
            if (idx >= 0) localList[idx] = fallbackObj;
            else localList.unshift(fallbackObj);
            saveLocalTemplates(localList);

            // Update in-memory state so UI dropdown updates immediately
            const currentList = get().emailTemplates || [];
            const mergedList = [fallbackObj, ...currentList.filter(t => t.id !== fallbackId)].sort((a, b) => {
                const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime() || 0;
                const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime() || 0;
                return timeB - timeA;
            });
            set({ emailTemplates: mergedList });

            if (isPermissionError) {
                throw new Error("SAVED_LOCALLY: Template saved on this device only. It won't appear for other admins until cloud saving is enabled.");
            }
            return fallbackId;
        }
    },
    deleteEmailTemplate: async (id) => {
        try {
            // Delete the shared copy first, so a failed delete leaves the list as it was.
            if (id && !id.startsWith('tpl_local_')) {
                await deleteDoc(doc(db, 'email_templates', id));
            }
            try {
                const stored = safeLocalStorage.getItem('nb_local_email_templates');
                const list = stored ? JSON.parse(stored) : [];
                safeLocalStorage.setItem('nb_local_email_templates', JSON.stringify(list.filter(t => t.id !== id)));
            } catch (e) { /* local copy is optional */ }
            set(state => ({
                emailTemplates: (state.emailTemplates || []).filter(t => t.id !== id)
            }));
        } catch (err) {
            console.warn("Delete template error:", err);
            // Let the caller say so instead of reporting a delete that didn't happen.
            throw err;
        }
    },
    deleteEmailCampaign: async (id) => {
        try {
            if (id) {
                await deleteDoc(doc(db, 'email_campaigns', id));
            }
            set(state => ({
                emailCampaigns: (state.emailCampaigns || []).filter(c => c.id !== id)
            }));
        } catch (err) {
            console.warn("Delete email campaign error:", err);
            throw err;
        }
    }
}));
