import { cleanCity } from '../CityInput';
import { splitDateTime } from './EditorParts';

/*
 * Event rules shared by the Events list and the editor. No React, no Firebase.
 *
 * What the app reads from an upcoming_events doc (and so what the editor writes):
 *   title, date ('YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm', local India time), time ('HH:mm'),
 *   doorsOpen, location, city, locationUrl, category, description, artists[],
 *   image (card / poster), hubImage (wide banner: community cards, guestlist page),
 *   venueLayout, isPinned, status ('draft' hides it everywhere),
 *   showOnSite (newbi.live home), showInApp (app Home),
 *   isTicketed, ticketCategories[{ id, name, price, capacity, color, mapping, coords }],
 *   basePrice, ticketCapacity, ticketingDescription, ticketingRules,
 *   isGuestlistEnabled, guestlistMode ('qr' | 'rsvp'), maxSpots, perUserLimit,
 *   entryUntil, hasGuestlistTask, guestlistTask.
 * Set in Ticket sales, and left alone here (saves are partial updates): payment
 * details, venueMap (seat map), lineup[], info{}, faqs, sale dates and extra tier
 * fields (description, maxPerOrder, salesStart…; cleanTiers keeps them).
 *
 * Older fields nothing in the app reads any more (buttonText, link, highlightColor,
 * videoUrl, enableVideoBackground, externalTicketingLinks, ticketMode, ageLimit,
 * performanceType, relatedVolunteerGigId, relatedCampaignId, image transforms) are
 * left as they are on existing events: the editor neither shows nor clears them.
 */

const IST_MS = 5.5 * 3600 * 1000;

/** Today in India as YYYY-MM-DD, the same "today" the app uses. */
export const todayKey = (now = Date.now()) => new Date(now + IST_MS).toISOString().slice(0, 10);

/** The event's calendar day (YYYY-MM-DD) from a local string, an ISO string or a Timestamp. */
export const eventDayKey = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
        const local = value.match(/^(\d{4}-\d{2}-\d{2})(?!.*(Z|[+-]\d{2}:?\d{2})$)/);
        if (local) return local[1];
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? '' : todayKey(d.getTime());
    }
    const ms = typeof value?.toDate === 'function' ? value.toDate().getTime()
        : typeof value?.seconds === 'number' ? value.seconds * 1000
            : value instanceof Date ? value.getTime() : NaN;
    return Number.isNaN(ms) ? '' : todayKey(ms);
};

/** "20:00" → "8:00 pm". Free text (an older "8 PM") passes through. */
export const to12h = (t) => {
    if (!/^\d{1,2}:\d{2}$/.test(String(t || '').trim())) return String(t || '').trim();
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
};

/** The start time ('HH:mm'), from `time` or the time inside a local date string. */
export const eventTimeOf = (e) => {
    if (/^\d{2}:\d{2}$/.test(String(e?.time || ''))) return e.time;
    const m = typeof e?.date === 'string' ? e.date.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/) : null;
    return m && !/(Z|[+-]\d{2}:?\d{2})$/.test(e.date) ? m[1] : '';
};

/** "Sat, 8 Nov 2026 · 8:00 pm", or "Date to be announced". */
export const formatWhen = (e, { year = true } = {}) => {
    const day = eventDayKey(e?.date);
    if (!day) return 'Date to be announced';
    const d = new Date(`${day}T12:00:00`);
    const text = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
    const time = eventTimeOf(e) || e?.time;
    return time ? `${text} · ${to12h(time)}` : text;
};

export const isDraft = (e) => String(e?.status || '').toLowerCase() === 'draft';

/** 'draft' | 'today' | 'upcoming' | 'past' | 'tba' (no date). */
export const eventState = (e, today = todayKey()) => {
    if (isDraft(e)) return 'draft';
    const day = eventDayKey(e?.date);
    if (!day) return 'tba';
    if (day === today) return 'today';
    return day > today ? 'upcoming' : 'past';
};

export const STATE_BADGE = {
    draft: { label: 'Draft', tone: 'gray' },
    today: { label: 'Today', tone: 'amber' },
    upcoming: { label: 'Upcoming', tone: 'green' },
    past: { label: 'Past', tone: 'gray' },
    tba: { label: 'Date to be announced', tone: 'blue' },
};

/**
 * Cards the home page shows for something managed elsewhere (a gig, a form,
 * a giveaway, a standalone guestlist). They are edited where they came from.
 */
export const homeCardSource = (e) => {
    if (!e) return null;
    if (e.isVolunteerGig || e.gigId) {
        const id = e.gigId || e.relatedVolunteerGigId;
        return { kind: 'gig', label: 'Volunteer gig', to: id ? `/admin/volunteer-gigs?edit=${encodeURIComponent(id)}` : '/admin/volunteer-gigs' };
    }
    if (e.isForm) {
        const id = e.relatedArtistFormId;
        return { kind: 'form', label: 'Form', to: id ? `/admin/forms/edit/${encodeURIComponent(id)}` : '/admin/forms' };
    }
    if (e.isGiveaway || e.giveawayId) {
        return { kind: 'giveaway', label: 'Giveaway', to: e.giveawayId ? `/admin/giveaways?edit=${encodeURIComponent(e.giveawayId)}` : '/admin/giveaways' };
    }
    if (e.category === 'guestlist' && e.guestlistId) {
        return { kind: 'guestlist', label: 'Guestlist', to: `/admin/guestlists?eventId=${encodeURIComponent(e.guestlistId)}` };
    }
    return null;
};

/** Where the event opens in the app (relative to the app). */
export const appPathFor = (e, id = e?.id) => {
    if (!id) return '/';
    if (e?.isTicketed) return `/tickets?event=${encodeURIComponent(id)}`;
    if (e?.isGuestlistEnabled) return `/community/g/${encodeURIComponent(id)}`;
    return '/';
};

// ── Editor form ──────────────────────────────────────────────────────────

let tierSeed = 0;
export const newTierId = () => `cat_${Date.now()}_${(tierSeed++ % 1000).toString(36)}`;
export const TIER_COLORS = ['#2ebfff', '#39FF14', '#FF4F8B', '#BF00FF', '#FF7A1A', '#FACC15'];

export const blankTier = (existing = []) => ({
    id: newTierId(),
    name: '',
    price: '',
    capacity: '',
    color: TIER_COLORS[existing.length % TIER_COLORS.length],
});

const numOrBlank = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '' : String(v));

export const EMPTY_EVENT = {
    title: '',
    date: '',
    time: '',
    doorsOpen: '',
    location: '',
    city: '',
    locationUrl: '',
    category: '',
    description: '',
    artists: [],
    image: '',
    hubImage: '',
    venueLayout: '',
    isPinned: false,
    draft: false,
    showOnSite: true,
    showInApp: true,
    isTicketed: false,
    tiers: [],
    basePrice: '',
    ticketCapacity: '',
    ticketingDescription: '',
    ticketingRules: '',
    isGuestlistEnabled: false,
    guestlistMode: 'qr',
    maxSpots: '',
    perUserLimit: '2',
    entryUntil: '',
    hasGuestlistTask: false,
    guestlistTask: null,
};

/** A stored event → the editor's form. */
export const fromEvent = (e) => {
    if (!e) return { ...EMPTY_EVENT, artists: [], tiers: [] };
    const raw = e.date?.seconds || typeof e.date?.toDate === 'function'
        ? new Date((e.date.seconds ?? e.date.toDate().getTime() / 1000) * 1000).toISOString()
        : e.date;
    const { date, time } = splitDateTime(typeof raw === 'string' ? raw : '');
    const cats = Array.isArray(e.ticketCategories) ? e.ticketCategories : [];
    return {
        ...EMPTY_EVENT,
        title: e.title || '',
        date,
        time: /^\d{2}:\d{2}$/.test(String(e.time || '')) ? e.time : time,
        doorsOpen: e.doorsOpen || '',
        location: e.location || e.venue || '',
        city: e.city || '',
        locationUrl: e.locationUrl || '',
        category: e.category || '',
        description: e.description || '',
        artists: (Array.isArray(e.artists) ? e.artists : []).map(a => (typeof a === 'string' ? a : a?.name)).filter(Boolean),
        image: e.image || e.poster || '',
        hubImage: e.hubImage || '',
        venueLayout: e.venueLayout || '',
        isPinned: Boolean(e.isPinned),
        draft: isDraft(e),
        // Events made before these switches existed show everywhere.
        showOnSite: e.showOnSite !== false,
        showInApp: e.showInApp !== false,
        isTicketed: Boolean(e.isTicketed),
        tiers: cats.map((c, i) => ({ ...c, name: c.name || '', price: numOrBlank(c.price), capacity: numOrBlank(c.capacity), color: c.color || TIER_COLORS[i % TIER_COLORS.length] })),
        basePrice: numOrBlank(e.basePrice),
        ticketCapacity: numOrBlank(e.ticketCapacity),
        ticketingDescription: e.ticketingDescription || '',
        ticketingRules: e.ticketingRules || '',
        isGuestlistEnabled: Boolean(e.isGuestlistEnabled),
        guestlistMode: e.guestlistMode === 'rsvp' ? 'rsvp' : 'qr',
        maxSpots: Number(e.maxSpots) > 0 ? String(e.maxSpots) : '',
        perUserLimit: String(Number(e.perUserLimit) > 0 ? e.perUserLimit : 2),
        entryUntil: e.entryUntil || '',
        hasGuestlistTask: Boolean(e.hasGuestlistTask),
        guestlistTask: e.guestlistTask || null,
    };
};

const intOrNull = (v) => (v === '' || v === null || v === undefined ? null : Math.max(0, parseInt(v, 10) || 0));
const money = (v) => Math.max(0, Math.round((Number(v) || 0) * 100) / 100);

/** The tiers as stored (ids kept, so orders stay matched to their tier). */
export const cleanTiers = (tiers = []) => tiers
    .filter(t => String(t.name || '').trim() || String(t.price ?? '').trim())
    .map(({ name, price, capacity, ...rest }) => ({
        ...rest,
        name: String(name || '').trim(),
        price: money(price),
        capacity: intOrNull(capacity),
    }));

/** The editor's form → the fields to save. `original` is the stored event (when editing). */
export const toPayload = (form, original = null) => {
    const tiers = cleanTiers(form.tiers);
    const payload = {
        title: form.title.trim(),
        date: form.date ? (form.time ? `${form.date}T${form.time}` : form.date) : '',
        time: form.date ? (form.time || '') : '',
        doorsOpen: String(form.doorsOpen || '').trim(),
        location: form.location.trim(),
        city: cleanCity(form.city),
        locationUrl: String(form.locationUrl || '').trim(),
        category: form.category || '',
        description: form.description || '',
        artists: (form.artists || []).map(a => String(a).trim()).filter(Boolean),
        image: String(form.image || '').trim(),
        hubImage: String(form.hubImage || '').trim(),
        venueLayout: String(form.venueLayout || '').trim(),
        isPinned: Boolean(form.isPinned),
        showOnSite: Boolean(form.showOnSite),
        showInApp: Boolean(form.showInApp),
        isTicketed: Boolean(form.isTicketed),
        ticketCategories: tiers,
        // One price for everyone when there are no tiers; otherwise the lowest tier.
        basePrice: tiers.length ? Math.min(...tiers.map(t => t.price)) : money(form.basePrice),
        ticketCapacity: intOrNull(form.ticketCapacity),
        ticketingDescription: form.ticketingDescription || '',
        ticketingRules: form.ticketingRules || '',
        isGuestlistEnabled: Boolean(form.isGuestlistEnabled),
        guestlistMode: form.guestlistMode === 'rsvp' ? 'rsvp' : 'qr',
        // 0 = no limit (what the guestlist page reads).
        maxSpots: intOrNull(form.maxSpots) || 0,
        perUserLimit: Math.max(1, parseInt(form.perUserLimit, 10) || 1),
        entryUntil: String(form.entryUntil || '').trim().slice(0, 40),
        hasGuestlistTask: Boolean(form.hasGuestlistTask && form.guestlistTask),
        guestlistTask: form.hasGuestlistTask ? (form.guestlistTask || null) : null,
        updatedAt: new Date().toISOString(),
    };
    // Only touch status for drafts, so a status another screen set (a form card's "Live") stays.
    if (form.draft) payload.status = 'draft';
    else if (isDraft(original)) payload.status = '';
    return payload;
};

/** Problems that stop a save, keyed by field. Drafts only need a name. */
export const eventProblems = (form, { soldByTier = {} } = {}) => {
    const p = {};
    if (!form.title.trim()) p.title = 'Give the event a name.';
    if (form.draft) return p;
    if (!form.date) p.date = 'Add the date (save as a draft if it isn’t fixed yet).';
    if (!form.location.trim()) p.location = 'Add the venue.';
    if (form.locationUrl.trim() && !/^https:\/\/\S+$/i.test(form.locationUrl.trim())) p.locationUrl = 'The map link should start with https://, like a Google Maps share link.';
    if (form.isTicketed) {
        const tiers = form.tiers.filter(t => String(t.name || '').trim() || String(t.price ?? '').trim());
        if (tiers.some(t => !String(t.name || '').trim())) p.tiers = 'Every ticket type needs a name.';
        else if (tiers.some(t => Number(t.price) < 0 || Number.isNaN(Number(t.price || 0)))) p.tiers = 'Prices must be 0 or more.';
        else {
            const short = tiers.find(t => t.capacity !== '' && soldByTier[t.id] > Number(t.capacity));
            if (short) p.tiers = `${short.name} has ${soldByTier[short.id]} tickets sold or held, more than its limit of ${short.capacity}.`;
        }
        if (!tiers.length && (Number(form.basePrice) < 0 || Number.isNaN(Number(form.basePrice || 0)))) p.price = 'The price must be 0 or more.';
    }
    if (form.isGuestlistEnabled) {
        const max = intOrNull(form.maxSpots) || 0;
        const per = parseInt(form.perUserLimit, 10);
        if (!(per >= 1)) p.guestlist = 'Spots per person must be at least 1.';
        else if (max && per > max) p.guestlist = 'Spots per person can’t be more than the guestlist capacity.';
    }
    return p;
};

/** Tickets held per tier (for "can't remove a tier that has sales"). */
export const soldPerTier = (availability) => Object.fromEntries(Object.entries(availability?.tiers || {}).map(([id, t]) => [id, t.held || 0]));

/** Whether the ticketed event can take payments yet (details live in Ticket sales → Settings). */
// Without these, checkout falls back to the site-wide UPI (site_settings/payment_info).
export const hasPaymentSetup = (e) => Boolean(e?.upiId || e?.paymentDetails?.upiId || e?.qrCodeUrl || e?.gatewayUrl || e?.payments?.gateway === true);

/** What changed between the stored event and the form, for the leave-without-saving check. */
export const isSameForm = (a, b) => JSON.stringify(a) === JSON.stringify(b);
