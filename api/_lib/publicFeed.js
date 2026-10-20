/*
 * The public feed for the landing site (newbi.live): upcoming events, past
 * clients, case studies, creator testimonials, open campaigns and the public
 * part of the site settings, as one JSON document cached at the edge.
 *
 * The landing pages make no Firestore connections of their own; everything
 * they show comes from here. Only fields that are safe to publish leave the
 * server, and empty or hidden items are dropped rather than filled in.
 *
 * Served by api/forms.js as GET /api/forms?type=public-feed (the project is
 * at Vercel's function limit, so this is a handler, not its own function).
 *
 * The app (app.newbi.live) has its own cached document, GET
 * /api/forms?type=app-feed: the public collections behind the community feed
 * and the open campaigns, so first paint needs no Firestore connection.
 */

import { isPresent } from '../../src/lib/present.js';
import { closingDate, isCampaignOpen, isOpen } from '../../src/lib/feedItems.js';

const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : null);
const isHttpUrl = (v) => typeof v === 'string' && /^https:\/\//i.test(v.trim());
const url = (v) => (isHttpUrl(v) ? v.trim().slice(0, 1000) : '');

const stripHtml = (html, max = 240) => String(html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>|<[^>]+>/gi, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ').trim().slice(0, max);

const isHidden = (d) => d.isHidden === true || d.hidden === true || d.isActive === false
    || d.status === 'draft' || d.status === 'archived' || d.visibility === 'hidden';

// Today in India, as YYYY-MM-DD, so an event dated today still counts as upcoming.
const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const eventDay = (v) => {
    if (!v) return '';
    if (typeof v === 'string') {
        const m = v.match(/^\d{4}-\d{2}-\d{2}/);
        if (m) return m[0];
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    if (typeof v.toDate === 'function') return v.toDate().toISOString().slice(0, 10);
    return '';
};

async function readCollection(db, name, limit = 200) {
    try {
        const snap = await db.collection(name).limit(limit).get();
        return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    } catch (err) {
        console.warn(`[public-feed] ${name}:`, err.message);
        return [];
    }
}

async function readDoc(db, col, id) {
    try {
        const snap = await db.collection(col).doc(id).get();
        return snap.exists ? snap.data() : {};
    } catch (err) {
        console.warn(`[public-feed] ${col}/${id}:`, err.message);
        return {};
    }
}

function publicSettings(general) {
    // Stats are shown only when the team has entered them (site_settings/general.stats:
    // [{ value: '120+', label: 'College activations' }]). Nothing is ever made up here.
    const stats = (Array.isArray(general.stats) ? general.stats : [])
        .map((s) => ({ value: str(s?.value, 16), label: str(s?.label, 40) }))
        .filter((s) => s.value && s.label)
        .slice(0, 4);
    const points = num(general.creatorWelcomePoints);
    return {
        stats,
        creatorWelcomePoints: points !== null && points > 0 ? Math.round(points) : null,
        showPastClients: general.showPastClients !== false,
        showCreatorTestimonials: general.showCreatorTestimonials !== false,
        showUpcomingEvents: general.showUpcomingEvents !== false,
    };
}

function publicContact(info) {
    const pick = (k, max) => str(info[k], max);
    const link = (k) => url(info[k]);
    return {
        email: pick('email', 120),
        phone: pick('phone', 40),
        address: pick('address', 300),
        instagram: link('instagram'),
        linkedin: link('linkedin'),
        whatsappCommunity: link('whatsappCommunity'),
    };
}

// Upcoming for newbi.live's home: events (unless "Show on newbi.live" is off) and standalone
// guestlists that have it switched on. Each says whether the app's Home should list it too.
function upcomingEvents(list, guestlists = []) {
    const today = todayIST();
    const lists = guestlists
        .filter((g) => g.showOnSite === true && !g.isEmbedded && !g.eventId && !g.linkedEventId && String(g.status || '').toLowerCase() !== 'closed')
        .map((g) => ({ ...g, isGuestlistEnabled: true, isTicketed: false, standaloneList: true }));
    return [...list.filter((e) => e.showOnSite !== false), ...lists]
        .filter((e) => !isHidden(e) && str(e.title))
        .map((e) => ({ e, day: eventDay(e.date) }))
        .filter(({ day }) => day && day >= today)
        .sort((a, b) => a.day.localeCompare(b.day))
        .slice(0, 3)
        .map(({ e, day }) => ({
            id: e.id,
            title: str(e.title, 120),
            date: day,
            time: str(e.time || e.doorsOpen, 40),
            location: str(e.location || e.venue, 140),
            city: str(e.city, 60),
            image: url(e.image),
            category: str(e.category || e.performanceType, 40),
            isTicketed: Boolean(e.isTicketed),
            hasGuestlist: Boolean(e.isGuestlistEnabled || e.guestlistEnabled),
            // Guestlists opt in to the app's Home; events opt out.
            showInApp: e.standaloneList ? e.showInApp === true : e.showInApp !== false,
        }));
}

function pastClients(list) {
    return list
        .filter((c) => !isHidden(c) && (str(c.name) || isHttpUrl(c.logoUrl)))
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .slice(0, 40)
        .map((c) => ({
            id: c.id,
            name: str(c.name, 80),
            logoUrl: url(c.logoUrl),
            logoWidth: num(c.logoWidth),
            logoHeight: num(c.logoHeight),
        }));
}

// Real concert photos (Wikimedia Commons, CC BY / CC BY-SA: see public/work/CREDITS.md)
// for the headline artists whose portfolio card was a promo graphic. Matched by
// title; they are pre-cropped 4:5, so the admin framing is reset.
const ARTIST_PHOTOS = {
    'shreya ghoshal': 'shreya-ghoshal',
    'sonu nigam': 'sonu-nigam',
    'sunidhi chauhan': 'sunidhi-chauhan',
};
const PHOTO_HOST = 'https://app.newbi.live/work/';
const artistPhoto = (title) => {
    const key = ARTIST_PHOTOS[str(title).toLowerCase().replace(/\s+/g, ' ')];
    return key ? `${PHOTO_HOST}${key}.jpg` : '';
};

function caseStudies(list, categories, limit = 10) {
    const catName = new Map(categories.map((c) => [c.id, str(c.name || c.label || c.title, 40)]));
    return list
        .filter((p) => !isHidden(p) && str(p.title) && isHttpUrl(p.image))
        .sort((a, b) => {
            if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
            return (a.order || 0) - (b.order || 0);
        })
        .slice(0, limit)
        .map((p) => ({
            id: p.id,
            title: str(p.title, 120),
            image: artistPhoto(p.title) || url(p.image),
            year: num(p.year) || num(eventDay(p.date).slice(0, 4)),
            sector: str(p.sector, 60),
            category: catName.get(p.category) || '',
            highlightUrl: url(p.highlightUrl),
            date: eventDay(p.date),
            // How the admin framed the photo in the 4:5 portfolio card (PortfolioSheets).
            imageTransform: artistPhoto(p.title) ? { scale: 1, x: 0, y: 0 } : {
                scale: num(p.imageTransform?.scale) || 1,
                x: num(p.imageTransform?.x) || 0,
                y: num(p.imageTransform?.y) || 0,
            },
        }));
}

function testimonials(list) {
    return list
        .filter((t) => !isHidden(t) && str(t.quote) && str(t.name))
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .slice(0, 9)
        .map((t) => ({
            id: t.id,
            name: str(t.name, 80),
            quote: str(t.quote, 600),
            city: str(t.city, 60),
            niche: str(t.niche, 60),
            handle: str(t.handle, 60),
            avatarUrl: url(t.avatarUrl),
            rating: Math.min(5, Math.max(1, Math.round(num(t.rating) || 5))),
        }));
}

function openCampaigns(list) {
    return list
        .filter((c) => (!c.status || String(c.status).toLowerCase() === 'open') && !isHidden(c) && str(c.title))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, 6)
        .map((c) => {
            const tasks = Array.isArray(c.tasks) ? c.tasks : [];
            const total = num(c.totalSpots);
            const left = num(c.spotsLeft);
            return {
                id: c.id,
                title: str(c.title, 120),
                brand: str(c.brand, 60),
                brandLogo: url(c.brandLogo),
                thumbnail: url(c.thumbnail),
                targetCity: str(c.targetCity, 60),
                reward: str(c.reward, 60),
                description: stripHtml(c.description),
                minInstagramFollowers: num(c.minInstagramFollowers) || null,
                taskCount: tasks.length || null,
                spotsLeft: left !== null ? Math.max(0, left) : null,
                totalSpots: total && total > 0 ? total : null,
            };
        });
}

export async function getPublicFeed(db, { maintenanceDoc = 'maintenance' } = {}) {
    const [general, contact, maintenance, events, clients, portfolio, categories, quotes, campaigns, guestlists] = await Promise.all([
        readDoc(db, 'site_settings', 'general'),
        readDoc(db, 'site_settings', 'contact_info'),
        readDoc(db, 'app_state', maintenanceDoc),
        readCollection(db, 'upcoming_events'),
        readCollection(db, 'past_clients'),
        readCollection(db, 'portfolio', 300),
        readCollection(db, 'portfolio_categories'),
        readCollection(db, 'creator_testimonials'),
        readCollection(db, 'campaigns'),
        readCollection(db, 'guestlists'),
    ]);

    const settings = publicSettings(general);
    const boolMap = (m) => Object.fromEntries(Object.entries(m && typeof m === 'object' ? m : {})
        .filter(([, v]) => v === true).map(([k]) => [k, true]));

    return {
        generatedAt: new Date().toISOString(),
        settings,
        contact: publicContact(contact),
        maintenance: {
            global: maintenance.global === true,
            pages: boolMap(maintenance.pages),
            sections: boolMap(maintenance.sections),
        },
        events: settings.showUpcomingEvents ? upcomingEvents(events, guestlists) : [],
        clients: settings.showPastClients ? pastClients(clients) : [],
        caseStudies: caseStudies(portfolio, categories),
        testimonials: settings.showCreatorTestimonials ? testimonials(quotes) : [],
        campaigns: openCampaigns(campaigns),
    };
}

// Every published portfolio item, for the /work archive.
export async function getPublicArchive(db) {
    const [portfolio, categories] = await Promise.all([
        readCollection(db, 'portfolio', 500),
        readCollection(db, 'portfolio_categories'),
    ]);
    const items = caseStudies(portfolio, categories, 500);
    const used = [...new Set(items.map((i) => i.category).filter(Boolean))];
    return { generatedAt: new Date().toISOString(), items, categories: used };
}

export async function handlePublicArchive(db, req, res) {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (!db) return res.status(503).json({ success: false, error: 'Archive unavailable' });
    try {
        const archive = await getPublicArchive(db);
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({ success: true, ...archive });
    } catch (err) {
        console.error('[public-archive] error:', err);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(500).json({ success: false, error: 'Archive unavailable' });
    }
}

// ---- The app's feed (type=app-feed) ----

const APP_READ_LIMIT = 500;
const DAY_MS = 24 * 3600 * 1000;

// Every field the app's buildFeed (src/lib/store/community.js) reads. Nothing else is sent.
export const COMMUNITY_FIELDS = [
    'title', 'name', 'description', 'subtitle',
    'date', 'dates', 'eventDate', 'startDate', 'endsAt', 'endDate', 'closesAt', 'deadline',
    'status', 'activeLabel', 'isActive', 'hidden', 'isPinned', 'showInApp',
    'hubImage', 'image', 'posterUrl', 'poster', 'thumbnail', 'coverImage',
    'venue', 'location', 'city', 'targetCity',
    'isGuestlistEnabled', 'guestlistEnabled', 'eventId', 'isEmbedded',
    'formId', 'applyType', 'applyLink', 'interestedCount', 'slots', 'totalSlots', 'maxVolunteers', 'slug',
];

const isPlainObject = (v) => v !== null && typeof v === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(v));

// Firestore values as JSON: Timestamps become ISO strings (the app reads both alike),
// references their path, geopoints their coordinates.
export const plain = (v) => {
    if (v === null || typeof v !== 'object') return v;
    if (typeof v.toDate === 'function') {
        const d = v.toDate();
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
    if (Array.isArray(v)) return v.map(plain);
    if (isPlainObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
    if (typeof v.latitude === 'number' && typeof v.longitude === 'number') return { latitude: v.latitude, longitude: v.longitude };
    if (typeof v.path === 'string') return v.path;
    return null;
};

const pickFields = (item) => {
    const out = { id: item.id };
    COMMUNITY_FIELDS.forEach((k) => { if (item[k] !== undefined) out[k] = plain(item[k]); });
    return out;
};

/*
 * A giveaway or form the app would hide from everyone: switched off, untitled,
 * or closed more than two days ago. The margin covers every visitor's time
 * zone; the app still applies the exact day itself.
 */
export const isListable = (item, now = Date.now()) => {
    if (!isOpen(item) || !isPresent(item.title || item.name || '')) return false;
    const closes = closingDate(item);
    return !closes || closes.getTime() >= now - 2 * DAY_MS;
};

export function communityCollections({ events = [], gigs = [], giveaways = [], forms = [] }, now = Date.now()) {
    const listable = (list) => list.map(pickFields).filter((item) => isListable(item, now));
    return {
        // Events and gigs are sent whole (only their feed fields): a signed-in user's
        // guestlists borrow their date and poster, and ownership, even from closed ones.
        events: events.map(pickFields),
        gigs: gigs.map(pickFields),
        giveaways: listable(giveaways),
        forms: listable(forms),
    };
}

// Campaigns taking applications, whole (the campaign pages read most fields; all are public).
export const appCampaigns = (list = []) => list.filter(isCampaignOpen).map(plain);

// Unlike readCollection, a failed read fails the feed, so the app falls back to Firestore.
async function readAll(db, name) {
    const snap = await db.collection(name).limit(APP_READ_LIMIT).get();
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function getAppFeed(db) {
    const [events, gigs, giveaways, forms, campaigns] = await Promise.all(
        ['upcoming_events', 'volunteer_gigs', 'giveaways', 'forms', 'campaigns'].map((name) => readAll(db, name)),
    );
    return {
        generatedAt: new Date().toISOString(),
        community: communityCollections({ events, gigs, giveaways, forms }),
        campaigns: appCampaigns(campaigns),
    };
}

export async function handleAppFeed(db, req, res) {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (!db) return res.status(503).json({ success: false, error: 'Feed unavailable' });
    try {
        const feed = await getAppFeed(db);
        // A minute at the edge (new campaigns and forms show up quickly), then stale while it refreshes.
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ success: true, ...feed });
    } catch (err) {
        console.error('[app-feed] error:', err);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(500).json({ success: false, error: 'Feed unavailable' });
    }
}

export async function handlePublicFeed(db, req, res) {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (!db) return res.status(503).json({ success: false, error: 'Feed unavailable' });
    try {
        const feed = await getPublicFeed(db);
        // Five minutes at the edge, then served stale while it refreshes in the background.
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({ success: true, ...feed });
    } catch (err) {
        console.error('[public-feed] error:', err);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(500).json({ success: false, error: 'Feed unavailable' });
    }
}
