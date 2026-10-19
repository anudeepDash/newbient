import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { callCreatorApi } from '../../app/creator/api';
import { isTesterRole } from '../../constants/roles';

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

/* Campaigns still taking applications: status Open (or unset) and not out of spots. 'Live' means the event is on and applications are closed. */
export const isCampaignOpen = (c = {}) => {
    const status = String(c.status || 'open').trim().toLowerCase();
    if (!['open', 'active', 'published'].includes(status)) return false;
    const left = c.spotsLeft;
    return !(left !== null && left !== undefined && left !== '' && Number(left) <= 0);
};

const REFERRALS_TTL_MS = 2 * 60 * 1000;

export const createCreatorSlice = (set, get) => ({
    /*
     * Creator settings from site_settings/general (public): the follower
     * minimum, whether Meta verification is on, and the welcome points. The
     * points shown anywhere come from creatorWelcomePoints only.
     */
    creatorSettings: null,
    loadCreatorSettings: async () => {
        if (get().creatorSettings || !db) return;
        try {
            const snap = await getDoc(doc(db, 'site_settings', 'general'));
            const d = snap.exists() ? snap.data() : {};
            const min = Number(d.minInstagramFollowersToJoin);
            set({
                creatorSettings: {
                    minFollowers: Number.isFinite(min) ? min : 1000,
                    metaVerification: d.instagramMetaVerification === true,
                    requireVerification: d.requireInstagramVerification !== false,
                    welcomePoints: Number(d.creatorWelcomePoints) || 0,
                    allowSignups: d.allowCreatorSignups !== false,
                    announcement: String(d.creatorAnnouncement || '').trim(),
                },
            });
        } catch (error) {
            console.warn('[app/creator] settings:', error?.code || error);
            set({ creatorSettings: { minFollowers: 1000, metaVerification: false, requireVerification: true, welcomePoints: 0, allowSignups: true, announcement: '' } });
        }
    },

    /* Single campaigns by id (shared links, closed campaigns you joined). */
    campaignsById: {},
    loadCampaign: async (id, { force = false } = {}) => {
        if (!id || !db) return null;
        const known = get().campaignsById[id];
        if (known !== undefined && !force) return known;
        try {
            const snap = await getDoc(doc(db, 'campaigns', id));
            const value = snap.exists() ? { ...snap.data(), id: snap.id } : null;
            set(state => ({ campaignsById: { ...state.campaignsById, [id]: value } }));
            return value;
        } catch (error) {
            console.warn('[app/creator] campaign:', error?.code || error);
            set(state => ({ campaignsById: { ...state.campaignsById, [id]: null } }));
            return null;
        }
    },

    /* Your own submissions record for a campaign: campaigns/{id}/submissions/{uid}. */
    mySubmissions: {},
    // What the server just saved, shown straight away (the live read may come through the server, a minute apart).
    noteMySubmission: (campaignId, taskId, submission) => {
        if (!campaignId || !taskId || !submission) return;
        set(state => {
            const prev = state.mySubmissions[campaignId] || {};
            return { mySubmissions: { ...state.mySubmissions, [campaignId]: { ...prev, tasks: { ...(prev.tasks || {}), [taskId]: submission } } } };
        });
    },
    subscribeMySubmission: (campaignId) => {
        const uid = get().authUser?.uid;
        if (!uid || !campaignId || !db) return () => {};
        let timer = null;
        const unsub = onSnapshot(doc(db, 'campaigns', campaignId, 'submissions', uid), (snap) => {
            set(state => ({ mySubmissions: { ...state.mySubmissions, [campaignId]: snap.exists() ? snap.data() : null } }));
        }, (error) => {
            if (error?.code !== 'permission-denied') {
                console.warn('[app/creator] submission:', error?.code || error);
                set(state => ({ mySubmissions: { ...state.mySubmissions, [campaignId]: null } }));
                return;
            }
            // The Firestore rules don't let the browser read it: ask the server (and again every minute).
            const load = async () => {
                const res = await callCreatorApi('my-submission', {}, { method: 'GET', query: { campaignId } });
                if (res.ok) set(state => ({ mySubmissions: { ...state.mySubmissions, [campaignId]: res.data.submission || null } }));
            };
            load();
            timer = setInterval(() => { if (document.visibilityState !== 'hidden') load(); }, 60000);
        });
        return () => { unsub(); if (timer) clearInterval(timer); };
    },

    /* Your referrals, your tier and the top-10 boards (all time and this month), from the server (never the whole creators list). */
    referrals: null,
    _referralsAt: 0,
    loadReferrals: async ({ force = false } = {}) => {
        if (!force && get().referrals && Date.now() - get()._referralsAt < REFERRALS_TTL_MS) return;
        set({ _referralsAt: Date.now() });
        const res = await callCreatorApi('creator-referrals', {}, { method: 'GET' });
        const d = res.ok ? res.data : {};
        set({
            referrals: {
                list: d.referrals || [],
                leaderboard: d.leaderboard || [],
                monthLeaderboard: d.monthLeaderboard || [],
                me: d.me || { approved: 0, pending: 0, month: 0, rank: 0, monthRank: 0 },
                myRank: d.myRank || 0,
                referrers: d.referrers || 0,
                ...(res.ok ? {} : { failed: true }),
            },
        });
    },

    openCampaigns: [],
    campaignsLoaded: false,
    _campaignsAt: 0,

    /* Open campaigns are public: anyone can browse them, applying needs a creator profile.
       Developers (testers) get every campaign, whatever its status. */
    loadOpenCampaigns: async ({ force = false } = {}) => {
        const tester = isTesterRole(get().authUser?.role);
        if (!db || (!force && Date.now() - get()._campaignsAt < CAMPAIGNS_TTL_MS && get().campaignsLoaded && get()._campaignsTester === tester)) return;
        set({ _campaignsAt: Date.now(), _campaignsTester: tester });
        try {
            const snap = await getDocs(collection(db, 'campaigns'));
            const open = snap.docs
                .map(d => ({ ...d.data(), id: d.id }))
                .filter(c => tester || isCampaignOpen(c))
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
