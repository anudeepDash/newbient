import { collection, doc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/*
 * Creator slice: the signed-in user's own creator profile, plus the public
 * list of open campaigns (one cached read, no listener).
 *
 * creators/{uid} is the target model. Until scripts/migrate-creators-to-uid.mjs
 * has run, some profiles still sit under a random id with a `uid` field, so
 * this falls back to that one per-user query. It never reads the whole
 * `creators` collection and never matches creators by email or phone.
 */

const CAMPAIGNS_TTL_MS = 5 * 60 * 1000;

/* Campaigns still taking applications: status Open (or unset) and not out of spots. */
export const isCampaignOpen = (c = {}) => {
    const status = String(c.status || 'open').trim().toLowerCase();
    if (!['open', 'active', 'live', 'published'].includes(status)) return false;
    const left = c.spotsLeft;
    return !(left !== null && left !== undefined && left !== '' && Number(left) <= 0);
};

export const createCreatorSlice = (set, get) => ({
    openCampaigns: [],
    campaignsLoaded: false,
    _campaignsAt: 0,

    /* Open campaigns are public: anyone can browse them, applying needs a creator profile. */
    loadOpenCampaigns: async ({ force = false } = {}) => {
        if (!db || (!force && Date.now() - get()._campaignsAt < CAMPAIGNS_TTL_MS && get().campaignsLoaded)) return;
        set({ _campaignsAt: Date.now() });
        try {
            const snap = await getDocs(collection(db, 'campaigns'));
            const open = snap.docs
                .map(d => ({ ...d.data(), id: d.id }))
                .filter(isCampaignOpen)
                .sort((a, b) => (Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
            set({ openCampaigns: open, campaignsLoaded: true });
        } catch (error) {
            console.warn('[app/creator] campaigns:', error?.code || error);
            set({ openCampaigns: [], campaignsLoaded: true });
        }
    },

    creatorProfile: null,
    creatorLoaded: false,
    _creatorUnsub: null,

    subscribeCreator: (uid) => {
        get()._creatorUnsub?.();
        if (!uid || !db) {
            set({ creatorProfile: null, creatorLoaded: Boolean(!uid), _creatorUnsub: null });
            return () => {};
        }
        set({ creatorLoaded: false });
        let cancelled = false;
        let innerUnsub = null;

        const listenTo = (docId) => onSnapshot(doc(db, 'creators', docId), (snap) => {
            set({ creatorProfile: snap.exists() ? { ...snap.data(), id: snap.id } : null, creatorLoaded: true });
        }, (error) => {
            console.warn('[app/creator] creator listener:', error?.code || error);
            set({ creatorProfile: null, creatorLoaded: true });
        });

        // creators/{uid} first; if it doesn't exist, the legacy doc that carries this uid.
        innerUnsub = onSnapshot(doc(db, 'creators', uid), async (snap) => {
            if (snap.exists()) {
                set({ creatorProfile: { ...snap.data(), id: snap.id }, creatorLoaded: true });
                return;
            }
            try {
                const legacy = await getDocs(query(collection(db, 'creators'), where('uid', '==', uid), limit(1)));
                if (cancelled) return;
                if (legacy.empty) {
                    set({ creatorProfile: null, creatorLoaded: true });
                    return;
                }
                innerUnsub?.();
                innerUnsub = listenTo(legacy.docs[0].id);
            } catch (error) {
                console.warn('[app/creator] legacy lookup:', error?.code || error);
                if (!cancelled) set({ creatorProfile: null, creatorLoaded: true });
            }
        }, (error) => {
            console.warn('[app/creator] creator listener:', error?.code || error);
            set({ creatorProfile: null, creatorLoaded: true });
        });

        const unsub = () => {
            cancelled = true;
            innerUnsub?.();
        };
        set({ _creatorUnsub: unsub });
        return () => {
            unsub();
            if (get()._creatorUnsub === unsub) set({ _creatorUnsub: null });
        };
    },
});
