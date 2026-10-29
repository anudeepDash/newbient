// Link previews. vercel.json rewrites every shareable page here; this serves the
// built index.html with that page's title, description and share image in <head>,
// so WhatsApp, Instagram, Facebook, X and search engines see a proper card.
// Humans get the same HTML and the SPA takes over.
//
// Page copy and image rules live in src/app/seo.js (shared with useDynamicMeta).
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    PAGES,
    LANDING_ORIGIN,
    brandOf,
    defaultOgImage,
    ogImageOf,
    formatTitle,
    originFor,
    pageUrl,
    productionSiteOf,
    isAppHostname,
    stripHtml,
    toDescription,
    toOgImage,
} from '../src/app/seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Firestore (read-only)

let adminDb = null;

const formatPrivateKey = (value) => {
    let key = String(value || '').trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1).trim();
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';
    const body = key.replace(header, '').replace(footer, '').replace(/\\n/g, '').replace(/\s+/g, '');
    return `${header}\n${body.match(/.{1,64}/g).join('\n')}\n${footer}`;
};

/** Throws when the Admin credentials are missing, so a broken setup shows up in the logs. */
const getDb = () => {
    if (adminDb) return adminDb;
    if (getApps().length) {
        adminDb = getFirestore(getApps()[0]);
        return adminDb;
    }
    const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'newbi-ent-v2').trim();
    if (process.env.FIRESTORE_EMULATOR_HOST) {
        adminDb = getFirestore(initializeApp({ projectId }));
        return adminDb;
    }
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
    if (!clientEmail || !privateKey) {
        throw new Error('FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are not set: dynamic link previews fall back to the default card');
    }
    adminDb = getFirestore(initializeApp({ credential: cert({ projectId, clientEmail, privateKey: formatPrivateKey(privateKey) }) }));
    return adminDb;
};

/** For local checks only: run the handler against a stub database. */
export const __setPreviewDb = (db) => { adminDb = db; };

// ---------------------------------------------------------------------------
// Helpers

const escapeHtml = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** JSON that is safe inside an inline <script> (no "</script>", no line separators). */
const toInlineJson = (value) => JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const normalizeString = (str) => String(str || '').trim().toLowerCase();
const createSlug = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Ids and slugs come from the URL; anything with a slash would address another collection.
const cleanId = (value) => {
    const id = String(value || '').trim();
    return id && id.length <= 200 && !id.includes('/') && id !== '.' && id !== '..' ? id : '';
};

const isBot = (ua) => /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp|telegram|twitterbot|slackbot|linkedinbot|embedly|quora link preview|pinterest|redditbot|applebot|discordbot|skypeuripreview|vkshare|google-inspectiontool/i.test(ua || '');

const TIMED_OUT = Symbol('timed out');
const withTimeout = (promise, ms) => {
    let timer;
    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        new Promise((resolve) => { timer = setTimeout(() => resolve(TIMED_OUT), ms); }),
    ]);
};

let cachedBaseHtml = '';

const isBuiltIndex = (html) => html && html.length > 50 && html.includes('<div id="root">') && !html.includes('/src/main.jsx');

async function getBaseHtml() {
    if (cachedBaseHtml) return cachedBaseHtml;
    // The app page is dist/app-shell.html now that the prerendered landing owns dist/index.html.
    const candidates = [
        path.join(process.cwd(), 'dist', 'app-shell.html'),
        path.join(__dirname, '..', 'dist', 'app-shell.html'),
        path.join(process.cwd(), 'dist', 'index.html'),
        path.join(__dirname, '..', 'dist', 'index.html'),
        path.join('/var/task', 'dist', 'index.html'),
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                const content = fs.readFileSync(p, 'utf8');
                if (isBuiltIndex(content)) {
                    cachedBaseHtml = content;
                    return content;
                }
            }
        } catch { /* try the next one */ }
    }
    console.error('[og] dist/index.html is missing from the function bundle; fetching the live copy');
    try {
        const res = await fetch(`${LANDING_ORIGIN}/app-shell.html`);
        const fetched = res.ok ? await res.text() : '';
        if (isBuiltIndex(fetched)) {
            cachedBaseHtml = fetched;
            return fetched;
        }
    } catch (e) {
        console.error('[og] fetching the live index.html failed:', e.message);
    }
    return '';
}

// ---------------------------------------------------------------------------
// Which page is this?

// Paths the SPA serves, by host. Used when a request reaches this function
// without an explicit ?route= (vercel.json always passes one).
const APP_PATHS = [
    [/^\/$/, 'app-home'],
    [/^\/community$/, 'community'],
    [/^\/community\/g\/([^/]+)$/, 'guestlist'],
    [/^\/community\/giveaways\/([^/]+)$/, 'giveaway'],
    [/^\/tickets\/([^/]+)$/, 'ticket-event'],
    [/^\/c\/([^/]+)$/, 'campaign'],
    [/^\/p\/([^/]+)$/, 'pass'],
    [/^\/creator$/, 'app-creator'],
    [/^\/creator\/apply$/, 'creator-apply'],
    [/^\/campus(\/.*)?$/, 'campus'],
    [/^\/notifications$/, 'notifications'],
    [/^\/profile$/, 'profile'],
];

const LANDING_PATHS = [
    [/^\/$/, 'home'],
    [/^\/(creator|creators|creator\/landing)$/, 'creator'],
    [/^\/(creator\/join|creator-join|creator\/apply|creator\/register|creator\/signup)$/, 'creator-apply'],
    [/^\/(creator-dashboard|creator-dashboard\/.*|creator\/dashboard|creator\/hub|creator\/studio|creator\/campaigns|creator-hub|creator-studio|campaigns)$/, 'app-creator'],
    [/^\/(?:campaign|campaigns|creator\/campaign|creator\/campaigns|creator-dashboard\/campaign)\/([^/]+)$/, 'campaign'],
    [/^\/(community|community-join)$/, 'community'],
    [/^\/giveaway\/([^/]+)$/, 'giveaway'],
    [/^\/ticket\/([^/]+)$/, 'pass'],
    [/^\/forms?$/, 'forms'],
    [/^\/forms?\/([^/]+)$/, 'form'],
    [/^\/concertzone$/, 'concertzone'],
    [/^\/concertzone\/([^/]+)$/, 'concertzone-category'],
    [/^\/concertzone\/([^/]+)\/([^/]+)$/, 'post'],
    [/^\/proposal\/([^/]+)$/, 'proposal'],
    [/^\/invoice\/([^/]+)$/, 'invoice'],
    [/^\/agreement\/([^/]+)$/, 'agreement'],
    [/^\/doc\/([^/]+)$/, 'doc'],
    [/^\/artistant$/, 'artistant'],
    [/^\/(contact|services|refund-policy|terms|privacy|verify-creator|verify-payout|register-payment|campus)$/, null],
];

export const routeFromPath = (host, pathname) => {
    const clean = (pathname || '/').replace(/\/+$/, '') || '/';
    if (productionSiteOf(host) === 'artistant' && clean === '/') return { route: 'artistant' };
    const table = isAppHostname(host) ? APP_PATHS : LANDING_PATHS;
    for (const [pattern, route] of table) {
        const m = clean.match(pattern);
        if (!m) continue;
        const key = route || clean.slice(1);
        if (key === 'post') return { route: key, category: decodeURIComponent(m[1]), id: decodeURIComponent(m[2]) };
        if (key === 'concertzone-category') return { route: key, category: decodeURIComponent(m[1]) };
        return { route: key, id: m[1] && !m[1].startsWith('/') ? decodeURIComponent(m[1]) : undefined };
    }
    return { route: isAppHostname(host) ? 'app-home' : 'home' };
};

const resolveRoute = (req, host) => {
    const q = req.query || {};
    let resolved;
    if (q.route && PAGES[q.route]) {
        resolved = { route: q.route, id: q.id, category: q.category };
    } else {
        let pathname = '/';
        try { pathname = new URL(req.url || '/', 'http://x').pathname; } catch { /* default */ }
        resolved = routeFromPath(host, pathname);
    }
    // A creator's invite link (/creator/apply?ref=CODE).
    if (resolved.route === 'creator-apply' && q.ref) return { route: 'creator-invite', id: q.ref };
    // Community deep links carried in the query (?gl=, ?event=, ?gig=, ?form=).
    if (resolved.route === 'community' || resolved.route === 'home' || resolved.route === 'app-home') {
        if (q.gl || q.event) return { route: 'guestlist', id: q.gl || q.event };
        if (q.gig) return { route: 'gig', id: q.gig };
        if (q.form) return { route: 'community-form', id: q.form };
    }
    return resolved;
};

// ---------------------------------------------------------------------------
// Dynamic pages. Each returns { title, description, image, url?, type?, extra? }
// or null when the record doesn't exist.

const firstImage = (...candidates) => candidates.find((c) => typeof c === 'string' && c.trim()) || '';

const eventDescription = (data) => {
    const bits = [];
    const date = data.date ? new Date(data.date) : null;
    if (date && !Number.isNaN(date.getTime())) {
        bits.push(date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }));
    }
    const place = [data.venue, data.city].map(stripHtml).filter(Boolean).join(', ');
    if (place) bits.push(place);
    const artists = Array.isArray(data.artists) ? data.artists.map(stripHtml).filter(Boolean) : [];
    const lead = [bits.join(' · '), artists.length ? `Featuring ${artists.join(', ')}.` : ''].filter(Boolean).join('. ');
    return [lead && !/[.!?]$/.test(lead) ? `${lead}.` : lead, stripHtml(data.description)].filter(Boolean).join(' ');
};

const loaders = {
    // The inviter's first name, from their referral code (creators.creatorId).
    async 'creator-invite'(db, { id }) {
        const snaps = await db.collection('creators').where('creatorId', '==', id.toUpperCase()).limit(1).get();
        if (snaps.empty) return null;
        const data = snaps.docs[0].data();
        const first = stripHtml(data.displayName || data.name).split(' ')[0].slice(0, 24);
        return first ? { title: `${first} invited you to Newbi Creators`, params: { id: data.creatorId || id } } : null;
    },

    async campaign(db, { id }) {
        let snap = await db.collection('campaigns').doc(id).get();
        if (!snap.exists) {
            // Old links sometimes differ from the doc id only in case.
            const recent = await db.collection('campaigns').limit(50).get();
            snap = recent.docs.find((d) => d.id.toLowerCase() === id.toLowerCase()) || snap;
        }
        if (!snap.exists) return null;
        const data = snap.data();
        const brand = stripHtml(data.brandName);
        const payout = stripHtml(data.payout || data.budget);
        return {
            title: stripHtml(data.title) || 'Brand campaign',
            description: [brand && `Brand: ${brand}.`, payout && `Compensation: ${payout}.`, stripHtml(data.description) || PAGES.campaign.description].filter(Boolean).join(' '),
            image: firstImage(data.thumbnail, data.image, data.coverImage),
            alt: stripHtml(data.title),
            params: { id: snap.id },
        };
    },

    // One page for events and guestlists (old ?event= and ?gl= links both land here).
    async guestlist(db, { id }) {
        const eventSnap = await db.collection('upcoming_events').doc(id).get();
        if (eventSnap.exists) {
            const data = eventSnap.data();
            const title = stripHtml(data.title) || 'Newbi event';
            return {
                title: `${title}${data.city ? ` | ${stripHtml(data.city)}` : ''}`,
                description: eventDescription(data) || PAGES.guestlist.description,
                image: firstImage(data.image, data.posterUrl, data.coverImage),
                alt: title,
            };
        }
        const glSnap = await db.collection('guestlists').doc(id).get();
        if (!glSnap.exists) return null;
        const data = glSnap.data();
        const title = stripHtml(data.title) || 'Newbi event';
        return {
            title: `${title} | Guestlist`,
            description: eventDescription(data) || `Get on the guestlist for ${title}.`,
            image: firstImage(data.image, data.posterUrl),
            alt: title,
        };
    },

    // A show's ticket page (/tickets/:id).
    async 'ticket-event'(db, { id }) {
        const snap = await db.collection('upcoming_events').doc(id).get();
        if (!snap.exists) return null;
        const data = snap.data();
        const title = stripHtml(data.title) || 'Newbi event';
        return {
            title: `${title}${data.city ? ` | ${stripHtml(data.city)}` : ''} | Tickets`,
            description: eventDescription(data) || PAGES['ticket-event'].description,
            image: firstImage(data.hubImage, data.image, data.posterUrl),
            alt: title,
        };
    },

    async gig(db, { id }) {
        const snap = await db.collection('volunteer_gigs').doc(id).get();
        if (!snap.exists) return null;
        const data = snap.data();
        const title = stripHtml(data.title);
        return {
            title: `${title} | Volunteer gig`,
            description: stripHtml(data.description) || `Volunteer with the Newbi crew for ${title}.`,
            image: firstImage(data.image),
            alt: title,
        };
    },

    async giveaway(db, { id }) {
        const snaps = await db.collection('giveaways').where('slug', '==', id).limit(1).get();
        if (snaps.empty) return null;
        const data = snaps.docs[0].data();
        const name = stripHtml(data.name);
        return {
            title: `${name} | Giveaway`,
            description: stripHtml(data.description) || `Enter the Newbi giveaway to win ${name}.`,
            image: firstImage(data.posterUrl, data.image),
            alt: name,
        };
    },

    async form(db, { id }) {
        const formResult = (data, docId) => ({
            title: stripHtml(data.title),
            description: stripHtml(data.description) || `Fill in ${stripHtml(data.title)} on Newbi.`,
            image: firstImage(data.image),
            alt: stripHtml(data.title),
            params: { id: docId },
        });

        const snap = await db.collection('forms').doc(id).get();
        if (snap.exists) {
            const data = snap.data();
            return { ...formResult(data, snap.id), initialData: { id: snap.id, ...data } };
        }

        // Older links use a slug, a custom form id or the title.
        const clean = normalizeString(id);
        const cleanSlug = createSlug(id);
        const all = await db.collection('forms').get();
        const match = all.docs.find((d) => {
            const f = d.data();
            return normalizeString(d.id) === clean
                || normalizeString(f.slug) === clean
                || normalizeString(f.formId) === clean
                || (f.title && createSlug(f.title) === cleanSlug)
                || (f.link && normalizeString(f.link).endsWith(`/${clean}`));
        });
        if (match) {
            const data = match.data();
            return { ...formResult(data, match.id), initialData: { id: match.id, ...data } };
        }

        // Events and gigs can be opened as forms too.
        const eventSnap = await db.collection('upcoming_events').doc(id).get();
        if (eventSnap.exists) {
            const data = eventSnap.data();
            let initialData = null;
            const refFormId = cleanId(data.formId || data.relatedArtistFormId);
            if (refFormId) {
                const refSnap = await db.collection('forms').doc(refFormId).get();
                if (refSnap.exists) initialData = { id: refSnap.id, ...refSnap.data() };
            }
            return {
                ...formResult(data, id),
                initialData: initialData || {
                    id: eventSnap.id,
                    title: data.title,
                    description: data.description,
                    formUrl: data.formUrl || data.link,
                    activeLabel: data.status || 'Live',
                    image: data.image,
                    highlightColor: data.highlightColor || '#2ebfff',
                    bottomText: data.location || 'Event Form',
                },
            };
        }
        const gigSnap = await db.collection('volunteer_gigs').doc(id).get();
        if (gigSnap.exists) {
            const data = gigSnap.data();
            return {
                ...formResult(data, id),
                title: `${stripHtml(data.title)} | Volunteer form`,
                initialData: {
                    id: gigSnap.id,
                    title: data.title,
                    description: data.description,
                    formUrl: data.formUrl || data.applyLink || data.link,
                    activeLabel: data.status || 'Live',
                    image: data.image,
                    highlightColor: data.highlightColor || '#39FF14',
                    bottomText: data.location || 'Gig Form',
                },
            };
        }
        return null;
    },

    async post(db, { id }) {
        const snaps = await db.collection('posts').where('slug', '==', id).get();
        // Only published posts (or scheduled ones whose time has come) get a preview card.
        const isLive = (d) => d.status === 'Published' || (d.status === 'Scheduled' && new Date(d.publishAt || d.publishDate || 0).getTime() <= Date.now());
        const live = snaps.docs.find((d) => isLive(d.data()));
        if (!live) return null;
        const data = live.data();
        const published = new Date(data.publishAt || data.publishDate || data.createdAt || 0);
        return {
            title: `${stripHtml(data.seoTitle || data.title)} | Concert Zone`,
            description: stripHtml(data.seoDescription || data.shortDescription || data.excerpt) || stripHtml(data.content),
            image: firstImage(data.coverImage, data.image),
            alt: stripHtml(data.title),
            params: { category: createSlug(data.category || 'news') || 'news', id },
            extra: published.getTime() > 0 ? [['article:published_time', published.toISOString()]] : [],
        };
    },

    async proposal(db, { id }) {
        const snap = await db.collection('proposals').doc(id).get();
        if (!snap.exists) return null;
        const data = snap.data();
        return {
            title: `${stripHtml(data.proposalNumber) || 'Proposal'} | ${stripHtml(data.clientName) || 'Valued Partner'}`,
            description: `Proposal for ${stripHtml(data.campaignName) || 'your campaign'} from Newbi Entertainment & Marketing LLP.`,
            // The proposal's own first pages, saved by src/lib/docShareCard.js.
            image: data.previewImage,
            alt: `${stripHtml(data.proposalNumber) || 'Proposal'} for ${stripHtml(data.clientName) || 'a client'}`,
        };
    },

    async invoice(db, { id }) {
        const snap = await db.collection('invoices').doc(id).get();
        if (!snap.exists) return null;
        const data = snap.data();
        return {
            title: `${stripHtml(data.invoiceNumber) || 'Tax Invoice'} | ${stripHtml(data.clientName) || 'Valued Partner'}`,
            description: `Tax invoice for ${stripHtml(data.campaignName) || 'services'} from Newbi Entertainment & Marketing LLP.`,
        };
    },

    async agreement(db, { id }) {
        const snap = await db.collection('agreements').doc(id).get();
        if (!snap.exists) return null;
        const data = snap.data();
        return {
            title: `${stripHtml(data.agreementNumber) || 'Agreement'} | ${stripHtml(data.clientName) || 'Valued Partner'}`,
            description: `Service agreement for ${stripHtml(data.campaignName) || 'services'} from Newbi Entertainment & Marketing LLP.`,
        };
    },

    async doc(db, { id }) {
        const snap = await db.collection('gen_documents').doc(id).get();
        if (!snap.exists) return null;
        const data = snap.data();
        return {
            title: stripHtml(data.title) || 'Official Document',
            description: `${stripHtml(data.documentType) || 'Official document'} #${stripHtml(data.docNumber) || id}, issued by Newbi Entertainment & Marketing LLP.`,
        };
    },
};

// ---------------------------------------------------------------------------
// The page's <head>

/**
 * Everything the preview needs for one request. `cacheable` is false when the
 * Firestore lookup failed or timed out, so a degraded card isn't cached.
 */
export async function buildPreview({ host, query = {}, url = '/', userAgent = '' }) {
    const resolved = resolveRoute({ query, url }, host);
    const route = PAGES[resolved.route] ? resolved.route : 'home';
    const page = PAGES[route];
    const id = cleanId(resolved.id);
    const params = { id, category: createSlug(resolved.category || '') || (route === 'post' ? 'news' : '') };

    let result = null;
    let cacheable = true;

    const load = loaders[route] || (route === 'community-form' ? loaders.form : null);
    if (load && id) {
        try {
            const outcome = await withTimeout(load(getDb(), { id }), isBot(userAgent) ? 2500 : 600);
            if (outcome === TIMED_OUT) {
                cacheable = false;
                console.error(`[og] ${route} "${id}" timed out; served the default card`);
            } else if (!outcome) {
                console.error(`[og] ${route} "${id}" not found; served the default card`);
            } else {
                result = outcome;
            }
        } catch (e) {
            cacheable = false;
            console.error(`[og] ${route} "${id}" failed:`, e.message);
        }
    }

    if (route === 'concertzone-category' && resolved.category) {
        const label = stripHtml(resolved.category).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        result = {
            title: `${label} | Concert Zone`,
            description: `The latest ${label.toLowerCase()} stories, concert updates and live music guides on Concert Zone.`,
        };
    }

    const brand = brandOf(route);
    const title = formatTitle(result?.title || page.title, brand);
    const image = toOgImage(result?.image, originFor(page.site, host)) || defaultOgImage(originFor('landing', host), ogImageOf(route));

    return {
        route,
        cacheable,
        title,
        description: toDescription(result?.description || page.description),
        url: pageUrl(route, { ...params, ...(result?.params || {}) }, host),
        type: page.type || 'website',
        siteName: brand.siteName,
        twitterSite: brand.twitterSite,
        image: { ...image, alt: stripHtml(result?.alt) || image.alt || title },
        noindex: Boolean(page.noindex),
        extra: result?.extra || [],
        initialData: result?.initialData || null,
    };
}

export const renderHead = (meta) => {
    const tag = (attr, key, value) => (value === undefined || value === null || value === '' ? '' : `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`);
    const lines = [
        `<title>${escapeHtml(meta.title)}</title>`,
        tag('name', 'description', meta.description),
        `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
        meta.noindex ? tag('name', 'robots', 'noindex') : '',
        tag('property', 'og:site_name', meta.siteName),
        tag('property', 'og:type', meta.type),
        tag('property', 'og:url', meta.url),
        tag('property', 'og:title', meta.title),
        tag('property', 'og:description', meta.description),
        tag('property', 'og:image', meta.image.url),
        meta.image.url.startsWith('https:') ? tag('property', 'og:image:secure_url', meta.image.url) : '',
        tag('property', 'og:image:type', meta.image.type),
        tag('property', 'og:image:width', meta.image.width),
        tag('property', 'og:image:height', meta.image.height),
        tag('property', 'og:image:alt', meta.image.alt),
        ...meta.extra.map(([key, value]) => tag('property', key, value)),
        tag('name', 'twitter:card', 'summary_large_image'),
        tag('name', 'twitter:site', meta.twitterSite),
        tag('name', 'twitter:url', meta.url),
        tag('name', 'twitter:title', meta.title),
        tag('name', 'twitter:description', meta.description),
        tag('name', 'twitter:image', meta.image.url),
        tag('name', 'twitter:image:alt', meta.image.alt),
        meta.initialData ? `<script>window.__INITIAL_FORM_DATA__ = ${toInlineJson(meta.initialData)};</script>` : '',
    ];
    return lines.filter(Boolean).join('\n    ');
};

export const injectHead = (html, meta) => {
    const base = html || '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div></body></html>';
    return base
        // Drop the static defaults so crawlers see one set of tags.
        .replace(/<title>[\s\S]*?<\/title>/gi, '')
        .replace(/<meta\s+(?:property|name)="(?:og:|twitter:|article:)[^"]*"[^>]*>\s*/gi, '')
        .replace(/<meta\s+name="(?:description|robots)"[^>]*>\s*/gi, '')
        .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
        .replace('</head>', `    ${renderHead(meta)}\n</head>`);
};

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
        res.status(204).end();
        return;
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.newbi.live';
    const meta = await buildPreview({
        host,
        query: req.query || {},
        url: req.url,
        userAgent: req.headers['user-agent'] || '',
    });
    const html = injectHead(await getBaseHtml(), meta);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', meta.cacheable
        ? 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400'
        : 'public, max-age=0, must-revalidate');
    res.status(200).send(html);
}
