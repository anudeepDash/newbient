import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { isPresent } from '../present';

/*
 * Community slice.
 *
 * The feed (guestlists, gigs, giveaways, forms) is one read per collection
 * when the app needs it, cached for a few minutes, not a live listener per
 * collection. Guestlists are only readable when signed in, so they join the
 * feed after sign-in. Items link to the current pages until Phase 5 moves
 * them into the app.
 */

const FEED_TTL_MS = 5 * 60 * 1000;
const CLOSED = /^(closed|archived|ended|expired|inactive|draft|hidden|completed|cancel+ed|past)$/i;

const firstImage = (...values) => values.find(v => typeof v === 'string' && /^(https?:)?\/\//.test(v)) || null;

/* The first date on an item, as a Date, or null. Accepts 'YYYY-MM-DD', ISO strings, Timestamps and arrays. */
export const itemDate = (item = {}) => {
    const raw = item.date ?? (Array.isArray(item.dates) ? item.dates[0]?.date ?? item.dates[0] : null) ?? item.eventDate ?? item.startDate ?? item.endsAt ?? null;
    if (!raw) return null;
    const value = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw);
    return Number.isNaN(value.getTime()) ? null : value;
};

const isPast = (date) => {
    if (!date) return false;
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime() < Date.now();
};

const isOpen = (item) => !CLOSED.test(String(item.status || '').trim()) && !CLOSED.test(String(item.activeLabel || '').trim()) && item.isActive !== false && item.hidden !== true;

const normalise = (type, item, href) => {
    const date = itemDate(item);
    return {
        key: `${type}:${item.id}`,
        type,
        id: item.id,
        title: item.title || item.name || '',
        description: item.description || item.subtitle || '',
        image: firstImage(item.hubImage, item.image, item.poster, item.thumbnail, item.coverImage),
        date,
        venue: item.venue || item.location || null,
        city: item.city || item.targetCity || null,
        label: isPresent(item.activeLabel) ? item.activeLabel : null,
        pinned: Boolean(item.isPinned),
        href,
        external: /^https?:\/\//.test(href || ''),
    };
};

const sortFeed = (a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.date && b.date) return a.date - b.date;
    if (a.date || b.date) return a.date ? -1 : 1;
    return 0;
};

const read = async (name) => {
    try {
        const snap = await getDocs(collection(db, name));
        return snap.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (error) {
        if (error?.code !== 'permission-denied') console.warn(`[app/community] ${name}:`, error?.code || error);
        return [];
    }
};

export const createCommunitySlice = (set, get) => ({
    communityFeed: [],
    communityFeedLoaded: false,
    _feedFor: null,
    _feedAt: 0,

    /* Loads (or refreshes) the feed. `landing(path)` builds links to the current pages. */
    loadCommunityFeed: async (landing = (p) => p, { force = false } = {}) => {
        const uid = get().authUser?.uid || null;
        const fresh = Date.now() - get()._feedAt < FEED_TTL_MS && get()._feedFor === uid;
        if (!db || (!force && fresh && get().communityFeedLoaded)) return;
        set({ _feedFor: uid, _feedAt: Date.now() });

        const [guestlists, gigs, giveaways, forms] = await Promise.all([
            uid ? read('guestlists') : [],
            read('volunteer_gigs'),
            read('giveaways'),
            read('forms'),
        ]);

        const items = [
            ...guestlists.filter(isOpen).map(g => normalise('guestlist', g, landing(`/community?gl=${g.id}`))),
            ...gigs.filter(isOpen).map(g => normalise('gig', g, landing(`/community?gig=${g.id}`))),
            ...giveaways.filter(isOpen).map(g => normalise('giveaway', g, landing(`/giveaway/${g.slug || g.id}`))),
            ...forms.filter(isOpen).map(f => normalise('form', f, landing(`/forms/${f.id}`))),
        ].filter(item => isPresent(item.title) && !isPast(item.date)).sort(sortFeed);

        set({ communityFeed: items, communityFeedLoaded: true });
    },

    /* One tap: sets capabilities.member (and the legacy hasJoinedTribe flag). */
    joinCommunity: async () => {
        const uid = get().authUser?.uid;
        if (!uid) throw new Error('Sign in to join the community.');
        await setDoc(doc(db, 'users', uid), {
            capabilities: { member: true },
            hasJoinedTribe: true,
            joinedCommunityAt: new Date().toISOString(),
        }, { merge: true });
    },
});
