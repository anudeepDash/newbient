import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { firstPresent, isPresent } from '../present';

/*
 * Profile slice: `users/{uid}` is the one profile for the whole app.
 *
 *   name, photoURL, email, city, collegeId, college
 *   phone (E.164, no spaces) + phoneVerified
 *   instagram { handle, igUserId, followers, verifiedVia, verifiedAt }
 *   capabilities { member, creator, campus }
 *   onboarding { ...flags }
 *
 * Older docs use displayName / phoneNumber / isPhoneVerified / hasJoinedTribe;
 * toProfile() reads both shapes so nothing needs migrating first.
 */

/* '+91 98765 43210', '09876543210', '9876543210' → '+919876543210'. */
export function toE164(phone, defaultCountry = '+91') {
    if (!isPresent(phone)) return null;
    const raw = String(phone).trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (raw.startsWith('+')) return `+${digits}`;
    if (digits.length === 10) return `${defaultCountry}${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `${defaultCountry}${digits.slice(1)}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return `+${digits}`;
}

const normaliseInstagram = (data = {}) => {
    const ig = data.instagram && typeof data.instagram === 'object' ? data.instagram : {};
    const legacyHandle = typeof data.instagram === 'string' ? data.instagram : data.instagramHandle;
    const handle = firstPresent(ig.handle, legacyHandle);
    return {
        handle: handle ? String(handle).replace(/^@+/, '').trim() : null,
        igUserId: ig.igUserId || null,
        followers: Number.isFinite(Number(ig.followers)) ? Number(ig.followers) : null,
        verifiedVia: ig.verifiedVia || null,
        verifiedAt: ig.verifiedAt || null,
    };
};

/* One normalised profile from the users/{uid} doc plus the Firebase auth user. */
export function toProfile(data = {}, authUser = null) {
    const caps = data.capabilities || {};
    const authPhone = authUser?.phoneNumber || null;
    const phone = toE164(firstPresent(data.phone, data.phoneNumber, authPhone));
    return {
        uid: authUser?.uid || data.uid || null,
        name: firstPresent(data.name, data.displayName, authUser?.displayName) || '',
        photoURL: firstPresent(data.photoURL, authUser?.photoURL) || null,
        email: firstPresent(data.email, authUser?.email) || null,
        phone,
        // A number on the auth account itself was verified by Firebase.
        phoneVerified: Boolean(phone && (data.phoneVerified || data.isPhoneVerified || (authPhone && toE164(authPhone) === phone))),
        city: firstPresent(data.city) || null,
        collegeId: firstPresent(data.collegeId) || null,
        college: firstPresent(data.college, data.collegeName) || null,
        instagram: normaliseInstagram(data),
        capabilities: {
            member: Boolean(caps.member ?? data.hasJoinedTribe),
            creator: Boolean(caps.creator),
            campus: Boolean(caps.campus),
        },
        onboarding: data.onboarding || {},
        emailPrefs: data.emailPrefs || {},
    };
}

/*
 * Fields the signed-in user may change on their own profile from the app.
 * Phone verification, capabilities.creator/campus and Instagram verification
 * are set by their own flows (verification hook, server), never by a form.
 */
const SELF_EDITABLE = new Set(['name', 'photoURL', 'city', 'collegeId', 'college', 'onboarding', 'emailPrefs']);

export const createProfileSlice = (set, get) => ({
    profile: null,
    profileDoc: null,
    profileLoaded: false,
    _profileUnsub: null,

    subscribeProfile: (uid) => {
        get()._profileUnsub?.();
        if (!uid || !db) {
            set({ profile: null, profileDoc: null, profileLoaded: Boolean(!uid), _profileUnsub: null });
            return () => {};
        }
        set({ profileLoaded: false });
        const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
            const data = snap.exists() ? snap.data() : {};
            set({ profileDoc: data, profile: toProfile(data, get().authUser), profileLoaded: true });
        }, (error) => {
            console.warn('[app/profile] profile listener:', error?.code || error);
            set({ profile: toProfile({}, get().authUser), profileLoaded: true });
        });
        set({ _profileUnsub: unsub });
        return () => {
            unsub();
            if (get()._profileUnsub === unsub) set({ _profileUnsub: null });
        };
    },

    /* Saves the editable profile fields. Also mirrors name to the legacy displayName. */
    updateProfile: async (patch = {}) => {
        const uid = get().authUser?.uid;
        if (!uid) throw new Error('Sign in to update your profile.');
        const clean = Object.fromEntries(Object.entries(patch).filter(([key]) => SELF_EDITABLE.has(key)));
        if (!Object.keys(clean).length) return;
        if (typeof clean.name === 'string') {
            clean.name = clean.name.trim();
            clean.displayName = clean.name;
        }
        if (typeof clean.city === 'string') clean.city = clean.city.trim();
        if (typeof clean.college === 'string') clean.college = clean.college.trim();
        clean.updatedAt = new Date().toISOString();
        await setDoc(doc(db, 'users', uid), clean, { merge: true });
        if (clean.displayName) {
            const { auth } = await import('../firebase');
            const { updateProfile } = await import('firebase/auth');
            if (auth?.currentUser?.uid === uid) await updateProfile(auth.currentUser, { displayName: clean.displayName }).catch(() => {});
        }
    },

    /* Records a phone number that was just verified by OTP (usePhoneVerification). */
    savePhoneVerified: async (e164) => {
        const uid = get().authUser?.uid;
        if (!uid || !e164) return;
        await setDoc(doc(db, 'users', uid), {
            phone: e164,
            phoneVerified: true,
            // Legacy readers (ProfilePanel, CreatorJoin) look at these.
            phoneNumber: e164,
            isPhoneVerified: true,
            phoneVerifiedAt: new Date().toISOString(),
        }, { merge: true });
    },

    setOnboardingFlag: async (key, value = true) => {
        const uid = get().authUser?.uid;
        if (!uid || !key) return;
        await setDoc(doc(db, 'users', uid), { onboarding: { [key]: value } }, { merge: true });
    },
});
