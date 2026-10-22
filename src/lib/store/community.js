import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { isPresent } from '../present';
import { closingDate, isOpen, itemDate } from '../feedItems';
import { fetchAppFeed } from '../appFeed';

export { itemDate };

/*
 * Community slice.
 *
 * The public collections (events, gigs, giveaways, forms) come from the
 * server's cached app feed (src/lib/appFeed.js), already stripped of closed
 * giveaways and forms; Firestore is read directly only when that request
 * fails. Events with their guestlist switched on are public, so they show
 * signed out; standalone guestlists join after sign-in and are the one part
 * read from Firestore for the user. Cached here for a few minutes, not a
 * live listener. Every item links to its page inside the app (`link(path)`
 * adds the app's base path).
 */

const FEED_TTL_MS = 5 * 60 * 1000;
const firstImage = (...values) => values.find(v => typeof v === 'string' && /^(https?:)?\/\//.test(v)) || null;

const isPast = (date) => {
    if (!date) return false;
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime() < Date.now();
};

const normalise = (type, item, to, extra = {}) => {
    const date = itemDate(item);
    return {
        key: `${type}:${item.id}`,
        type,
        id: item.id,
        title: item.title || item.name || '',
        description: item.description || item.subtitle || '',
        image: firstImage(item.hubImage, item.image, item.posterUrl, item.poster, item.thumbnail, item.coverImage),
        date,
        closesAt: closingDate(item),
        time: isPresent(item.time) ? item.time : null,
        venue: item.venue || item.location || null,
        city: item.city || item.targetCity || null,
        label: isPresent(item.activeLabel) ? item.activeLabel : null,
        pinned: Boolean(item.isPinned),
        // Admin's "Where it shows → App home" (guestlists opt in).
        showInApp: item.showInApp === true,
        to,
        ...extra,
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

/*
 * One card per guestlist: an event with its list on, a standalone list, or a
 * gig that runs a list. A list that belongs to an event (same id, or eventId)
 * borrows the event's date and poster and shows once. An event card made
 * from a guestlist (it carries guestlistId) is that list's card on the site:
 * the list stands for it here.
 */
export const buildFeed = ({ events = [], guestlists = [], gigs = [], giveaways = [], forms = [] }, link = (p) => p) => {
    const eventsById = new Map(events.map(e => [e.id, e]));
    const gigsById = new Map(gigs.map(g => [g.id, g]));
    const seenLists = new Set();
    const items = [];

    events.filter(e => e.isGuestlistEnabled && isOpen(e)).forEach(e => {
        seenLists.add(e.id);
        if (e.guestlistId && e.guestlistId !== e.id) return;
        items.push(normalise('guestlist', e, link(`/community/g/${e.id}`)));
    });
    guestlists.filter(isOpen).forEach(gl => {
        const ownerId = eventsById.has(gl.id) ? gl.id : eventsById.has(gl.eventId) ? gl.eventId : null;
        // A list made for an event that has since been archived (moved out of upcoming_events) is over,
        // even when the list itself has no date.
        const linkedEvent = gl.isEmbedded || (gl.eventId && gl.eventId !== gl.id && !gigsById.has(gl.eventId));
        if (!ownerId && linkedEvent && !gigsById.has(gl.id)) return;
        if (ownerId && seenLists.has(ownerId)) return;
        if (seenLists.has(gl.id)) return;
        seenLists.add(gl.id);
        const owner = (ownerId && eventsById.get(ownerId)) || gigsById.get(gl.id) || {};
        const merged = { ...owner, ...gl, date: owner.date || gl.date, hubImage: owner.hubImage || gl.hubImage, image: gl.image || owner.image };
        items.push(normalise('guestlist', merged, link(`/community/g/${gl.id}`)));
    });
    gigs.filter(isOpen).forEach(g => {
        if (seenLists.has(g.id)) return; // the gig's guestlist card already stands for it
        if (g.guestlistEnabled) {
            seenLists.add(g.id);
            items.push(normalise('guestlist', g, link(`/community/g/${g.id}`)));
            return;
        }
        items.push(normalise('gig', g, null, {
            applyType: g.formId ? 'form' : (g.applyType || 'link'),
            applyLink: g.formId ? link(`/forms/${g.formId}`) : (g.applyLink || ''),
            interestedCount: Number(g.interestedCount) || 0,
            slots: Number(g.slots || g.totalSlots || g.maxVolunteers) || 0,
        }));
    });
    giveaways.filter(isOpen).forEach(g => items.push(normalise('giveaway', g, link(`/community/giveaways/${g.slug || g.id}`))));
    forms.filter(isOpen).forEach(f => items.push(normalise('form', f, link(`/forms/${f.id}`))));

    return items.filter(item => isPresent(item.title) && !isPast(item.closesAt)).sort(sortFeed);
};

export const createCommunitySlice = (set, get) => ({
    communityFeed: [],
    communityFeedLoaded: false,
    _feedFor: null,
    _feedAt: 0,

    /* Loads (or refreshes) the feed. `link(path)` turns an app path into a link (adds /app in dev). */
    loadCommunityFeed: async (link = (p) => p, { force = false } = {}) => {
        const uid = get().authUser?.uid || null;
        const fresh = Date.now() - get()._feedAt < FEED_TTL_MS && get()._feedFor === uid;
        if (!db || (!force && fresh && get().communityFeedLoaded)) return;
        set({ _feedFor: uid, _feedAt: Date.now() });

        const readPublic = async () => {
            const feed = (await fetchAppFeed({ force }))?.community;
            if (feed) return feed;
            const [events, gigs, giveaways, forms] = await Promise.all([
                read('upcoming_events'),
                read('volunteer_gigs'),
                read('giveaways'),
                read('forms'),
            ]);
            return { events, gigs, giveaways, forms };
        };
        // Signed-in only (the rules keep guestlists from visitors), so never part of the shared cache.
        const [{ events = [], gigs = [], giveaways = [], forms = [] }, guestlists] = await Promise.all([
            readPublic(),
            uid ? read('guestlists') : [],
        ]);

        set({ communityFeed: buildFeed({ events, guestlists, gigs, giveaways, forms }, link), communityFeedLoaded: true });
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
