// Titles, descriptions and share images for every page, in one place.
// Imported by the browser (src/hooks/useDynamicMeta.js) and by the preview
// function (api/og.js), so keep it plain JavaScript: no React, no
// import.meta.env, no window.

export const LANDING_ORIGIN = 'https://www.newbi.live';
export const APP_ORIGIN = 'https://app.newbi.live';
export const ADMIN_ORIGIN = 'https://admin.newbi.live';
export const ARTISTANT_ORIGIN = 'https://artistant.in';

export const SITE_NAME = 'newbi.live';
export const TWITTER_SITE = '@newbi_live';
export const DEFAULT_TITLE = 'newbi.live — We build the nights you remember';
export const DEFAULT_DESCRIPTION = 'Concerts, college fests, brand activations and creator campaigns across India, planned, produced and run end to end by the Newbi crew.';

// Share cards (1200×630 JPEG) in public/og/, one per part of the site, drawn in
// scripts/og/cards.html and rendered by scripts/og/render.mjs. Chats cache a
// preview by its image URL, so after changing a card bump OG_CARD_VERSION and
// render again: the new files get new names (creator invite links carry it too).
export const OG_CARD_VERSION = 1;
const ogCard = (name, alt) => ({
    path: `/og/${name}-v${OG_CARD_VERSION}.jpg`,
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    alt,
});

export const OG_IMAGES = {
    home: ogCard('home', 'newbi.live: we make young India show up'),
    creator: ogCard('creator', 'Newbi Creators: create with brands, get into the shows'),
    invite: ogCard('invite', "You're invited to Newbi Creators"),
    community: ogCard('community', 'Newbi Community: get on the list'),
    app: ogCard('app', 'newbi.app: every show, one app'),
    campus: ogCard('campus', 'Newbi Campus: bring the show to your campus'),
    contact: ogCard('contact', "Let's make some noise with Newbi"),
    docs: ogCard('docs', 'Newbi Entertainment & Marketing LLP'),
};

// Image headers for the WhatsApp templates (api/_lib/whatsapp.js), one per message, drawn in the
// same sheet. Not link previews: they're only ever sent inside a WhatsApp message.
export const WA_CARDS = Object.fromEntries(
    ['pass', 'ticket', 'approved', 'invite', 'shortlisted', 'shortlist', 'reminder', 'deliverables', 'changes', 'payout', 'city',
        'signedup', 'onlist', 'request-change', 'declined', 'waitlist', 'tonight', 'changed', 'cancelled', 'scanned']
        .map((name) => [`wa-${name}`, ogCard(`wa-${name}`, `Newbi on WhatsApp: ${name}`)]),
);

// The share image for any Newbi page that has no card of its own.
export const DEFAULT_IMAGE = OG_IMAGES.home;

// Concert Zone is a separate brand: its pages keep their own name and share image.
export const CONCERTZONE_IMAGE = {
    path: '/brand/concertzone-og.jpg',
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    alt: 'Concert Zone',
};

// Each part of Newbi signs its titles with its own name: newbi.live (the
// landing site), newbi.app (the app) and newbi.admin (the admin panel).
export const BRANDS = {
    newbi: { siteName: SITE_NAME, twitterSite: TWITTER_SITE, titleSuffix: ' | newbi.live', image: DEFAULT_IMAGE },
    app: { siteName: 'newbi.app', twitterSite: TWITTER_SITE, titleSuffix: ' | newbi.app', image: DEFAULT_IMAGE },
    admin: { siteName: 'newbi.admin', twitterSite: TWITTER_SITE, titleSuffix: ' | newbi.admin', image: DEFAULT_IMAGE },
    concertzone: { siteName: 'Concert Zone', twitterSite: '', titleSuffix: ' | Concert Zone', image: CONCERTZONE_IMAGE },
};

/** A page's brand: its own (Concert Zone, admin), else the one for its site. */
export const brandOf = (pageKey) => {
    const page = PAGES[pageKey];
    return BRANDS[page?.brand] || (page?.site === 'app' ? BRANDS.app : BRANDS.newbi);
};

/** A page's share card when it has no image of its own: its section's card, else its brand's. */
export const ogImageOf = (pageKey) => OG_IMAGES[PAGES[pageKey]?.image] || brandOf(pageKey).image;

const PRODUCTION_HOSTS = {
    'newbi.live': 'landing',
    'www.newbi.live': 'landing',
    'app.newbi.live': 'app',
    'admin.newbi.live': 'admin',
    'artistant.in': 'artistant',
    'www.artistant.in': 'artistant',
};

const PRODUCTION_ORIGINS = {
    landing: LANDING_ORIGIN,
    app: APP_ORIGIN,
    admin: ADMIN_ORIGIN,
    artistant: ARTISTANT_ORIGIN,
};

const cleanHost = (host) => String(host || '').split(',')[0].trim().toLowerCase();

/** 'landing' | 'app' | 'admin' | 'artistant' for a production host, otherwise null. */
export const productionSiteOf = (host) => PRODUCTION_HOSTS[cleanHost(host).replace(/:\d+$/, '')] || null;

export const isAppHostname = (host) => {
    const h = cleanHost(host).replace(/:\d+$/, '');
    return h === 'app.newbi.live' || h === 'app.localhost';
};

/**
 * The origin to put in links for `site`. On production hosts every site has its
 * own fixed origin; anywhere else (localhost, Vercel previews) links stay on the
 * host that served the request so previews can be checked before release.
 */
export const originFor = (site, requestHost, protocol = 'https') => {
    const host = cleanHost(requestHost);
    if (!host || productionSiteOf(host)) return PRODUCTION_ORIGINS[site] || LANDING_ORIGIN;
    const proto = /^(localhost|127\.0\.0\.1|\[::1\]|[^/]+\.localhost)(:\d+)?$/.test(host) ? 'http' : protocol;
    return `${proto}://${host}`;
};

/** Absolute app link (e.g. a share link) from the page the user is on. */
export const appUrl = (path, currentOrigin) => {
    let host = '';
    try { host = new URL(currentOrigin).host; } catch { /* no origin: production */ }
    return `${originFor('app', host)}${path}`;
};

/**
 * Every page that gets its own title and description. `site` says which host a
 * page lives on (it decides the canonical URL); `:id` in `path` is filled in by
 * pageUrl(). `image` names its share card in OG_IMAGES. Dynamic pages (campaign,
 * guestlist…) use their entry as the fallback when the record can't be loaded.
 */
export const PAGES = {
    // newbi.live (landing)
    home: {
        site: 'landing', path: '/',
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
    },
    creator: {
        site: 'landing', path: '/creator', image: 'creator',
        title: 'Creators — Brand deals, backstage access',
        description: 'Get matched to paid brand campaigns in your city and niche, plus access to the shows we run. Free to join, no agency cut.',
    },
    concertzone: {
        site: 'landing', path: '/concertzone', brand: 'concertzone',
        title: 'Concert Zone • Music, Live Events & Tour Guides',
        description: 'Your backstage pass to concerts, live music festivals, artist spotlights, and gig guides across India.',
    },
    'concertzone-category': {
        site: 'landing', path: '/concertzone/:category', brand: 'concertzone',
        title: 'Concert Zone',
        description: 'Concert updates, live music guides and artist stories on Concert Zone.',
    },
    post: {
        site: 'landing', path: '/concertzone/:category/:id', type: 'article', brand: 'concertzone',
        title: 'Concert Zone',
        description: 'Read this article on Concert Zone.',
    },
    contact: {
        site: 'landing', path: '/contact', image: 'contact',
        title: "Let's make some noise",
        description: 'Planning a college activation, a live show or a creator campaign? Tell us about it. We reply within a working day.',
    },
    terms: {
        site: 'landing', path: '/terms',
        title: 'Terms of Service',
        description: 'The terms for using newbi.live, app.newbi.live and Newbi services.',
    },
    privacy: {
        site: 'landing', path: '/privacy',
        title: 'Privacy Policy',
        description: 'How Newbi collects, uses and protects your data.',
    },
    forms: {
        site: 'landing', path: '/forms',
        title: 'Forms & Registrations',
        description: 'Submit applications and registrations for Newbi events, community initiatives, and creator opportunities.',
    },
    form: {
        site: 'landing', path: '/forms/:id',
        title: 'Forms',
        description: 'Fill in this form on Newbi.',
    },
    'verify-creator': {
        site: 'landing', path: '/verify-creator', noindex: true, image: 'creator',
        title: 'Verify your creator profile',
        description: 'Verify and activate your Newbi Creator profile to access brand deals and campaigns.',
    },
    'verify-payout': {
        site: 'landing', path: '/verify-payout', noindex: true, image: 'docs',
        title: 'Verify a payout',
        description: 'Check that a payout receipt was issued by Newbi Entertainment & Marketing LLP.',
    },
    'register-payment': {
        site: 'landing', path: '/register-payment', noindex: true, image: 'docs',
        title: 'Payee registration',
        description: 'Register banking and payee details for vendor and creator payouts.',
    },
    proposal: {
        site: 'landing', path: '/proposal/:id', noindex: true, image: 'docs',
        title: 'Proposal',
        description: 'A proposal from Newbi Entertainment & Marketing LLP.',
    },
    invoice: {
        site: 'landing', path: '/invoice/:id', noindex: true, image: 'docs',
        title: 'Tax Invoice',
        description: 'A tax invoice from Newbi Entertainment & Marketing LLP.',
    },
    agreement: {
        site: 'landing', path: '/agreement/:id', noindex: true, image: 'docs',
        title: 'Agreement',
        description: 'A service agreement from Newbi Entertainment & Marketing LLP.',
    },
    doc: {
        site: 'landing', path: '/doc/:id', noindex: true, image: 'docs',
        title: 'Official Document',
        description: 'An official document issued by Newbi Entertainment & Marketing LLP.',
    },

    // admin.newbi.live/admin
    admin: {
        site: 'admin', path: '/admin', brand: 'admin', noindex: true, image: 'docs',
        title: 'Admin',
        description: 'The Newbi admin panel.',
    },

    // artistant.in
    artistant: {
        site: 'artistant', path: '/',
        title: 'Artistant — the ultimate creative link-up.',
        description: "Artistant is India's premier artist booking platform. Connect verified live performers — singers, DJs, bands, comedians — with event organizers. Book talent instantly.",
    },

    // app.newbi.live
    'app-home': {
        site: 'app', path: '/', image: 'app',
        title: 'newbi.app — Your passes, guestlists & gigs',
        description: 'Your passes, guestlists, gigs, giveaways and creator campaigns from Newbi, in one place.',
    },
    community: {
        site: 'app', path: '/community', image: 'community',
        title: 'Community — Get on the list',
        description: 'Get on guestlists, sign up for backstage volunteer gigs, enter giveaways and join the Newbi community.',
    },
    // Community deep links that stay on /community (?gig=, ?form=).
    gig: {
        site: 'app', path: '/community', query: 'gig', image: 'community',
        title: 'Volunteer gig — Work the show',
        description: 'Volunteer with the Newbi crew: backstage gigs at concerts and events.',
    },
    'community-form': {
        site: 'app', path: '/community', query: 'form', image: 'community',
        title: 'Forms',
        description: 'Fill in this form on Newbi.',
    },
    guestlist: {
        site: 'app', path: '/community/g/:id', image: 'community',
        title: 'Guestlist',
        description: 'Get on the guestlist for this Newbi event.',
    },
    giveaway: {
        site: 'app', path: '/community/giveaways/:id', image: 'community',
        title: 'Giveaway',
        description: 'Enter this Newbi giveaway.',
    },
    'app-creator': {
        site: 'app', path: '/creator', image: 'creator',
        title: 'Creator dashboard',
        description: 'Find open brand campaigns, submit deliverables and track your payouts with the Newbi Creator Network.',
    },
    'creator-apply': {
        site: 'app', path: '/creator/apply', image: 'creator',
        title: 'Become a creator — Apply in 45 seconds',
        description: 'Connect with top brands and live events in your city. Fast creator onboarding with zero agency fees.',
    },
    // /creator/apply?ref=CODE: a creator's invite link.
    'creator-invite': {
        site: 'app', path: '/creator/apply', query: 'ref', image: 'invite',
        title: "You're invited to Newbi Creators",
        description: 'Brands and shows invite creators to campaigns for passes, products and paid work. Free to join, no agency cut. Apply in 45 seconds.',
    },
    campaign: {
        site: 'app', path: '/c/:id', image: 'creator',
        title: 'Brand campaign',
        description: 'See the brief and apply to this brand campaign on the Newbi Creator Network.',
    },
    tickets: {
        site: 'app', path: '/tickets', image: 'app',
        title: 'Tickets',
        description: 'Tickets for the shows Newbi runs: pick your night, pay once and your pass lands in the app.',
    },
    pass: {
        site: 'app', path: '/p/:id', noindex: true, image: 'app',
        title: 'Your pass',
        description: 'Open this pass on your phone and show the QR code at the entry.',
    },
    campus: {
        site: 'app', path: '/campus', image: 'campus',
        title: 'Campus — Fests, creators & college crews',
        description: 'Newbi on campus: college fests, campus creators and student communities.',
    },
    notifications: {
        site: 'app', path: '/notifications', noindex: true, image: 'app',
        title: 'Notifications',
        description: 'Your Newbi updates.',
    },
    profile: {
        site: 'app', path: '/profile', noindex: true, image: 'app',
        title: 'Your profile',
        description: 'Your Newbi profile.',
    },
};

/** The page's path with its params filled in (`{ id, category }`). */
export const pagePath = (key, params = {}) => {
    const page = PAGES[key];
    if (!page) return '/';
    const path = page.path.replace(/:([a-z]+)/gi, (_, name) => encodeURIComponent(String(params[name] ?? '')));
    return page.query && params.id ? `${path}?${page.query}=${encodeURIComponent(params.id)}` : path;
};

export const pageUrl = (key, params = {}, requestHost = '') => {
    const page = PAGES[key] || PAGES.home;
    return `${originFor(page.site, requestHost)}${pagePath(key, params)}`;
};

export const stripHtml = (input) => {
    if (!input) return '';
    return String(input)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, ' ')
        .replace(/<(br|hr)\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&ndash;/gi, '–')
        .replace(/&mdash;/gi, '—')
        .replace(/&hellip;/gi, '...')
        .replace(/&bull;/gi, '•')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
};

/** Plain text, cut at a word boundary to `max` characters. */
export const toDescription = (input, max = 160) => {
    const text = stripHtml(input);
    if (text.length <= max) return text;
    const cut = text.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
};

/** Adds the brand to a bare page title ("Contact Us" → "Contact Us | newbi.live"). */
export const formatTitle = (title, brand = BRANDS.newbi) => {
    const clean = stripHtml(title);
    if (!clean) return brand === BRANDS.concertzone ? 'Concert Zone' : brand === BRANDS.newbi ? DEFAULT_TITLE : brand.siteName;
    if (brand === BRANDS.concertzone) return /concert ?zone/i.test(clean) ? clean : `${clean}${brand.titleSuffix}`;
    return /newbi\.(live|app|admin)|artistant/i.test(clean) ? clean : `${clean}${brand.titleSuffix}`;
};

const IMAGE_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const CLOUDINARY_OG = 'w_1200,h_630,c_fill,f_jpg,q_auto';
// A Cloudinary transformation segment, e.g. "c_fill,w_500" or "q_auto".
const CLOUDINARY_TRANSFORM = /^[a-z]{1,3}_[^/]*$/;

export const defaultOgImage = (origin = LANDING_ORIGIN, image = DEFAULT_IMAGE) => ({
    url: `${origin}${image.path}`,
    width: image.width,
    height: image.height,
    type: image.type,
    alt: image.alt,
});

const KNOWN_DEFAULTS = [...Object.values(OG_IMAGES), CONCERTZONE_IMAGE];

/** True for one of our own share cards (not a page's real photo or poster). */
export const isShareCard = (input) => {
    let pathname = '';
    try { pathname = new URL(String(input || ''), LANDING_ORIGIN).pathname; } catch { return false; }
    return pathname === '/og-default.jpg' || KNOWN_DEFAULTS.some((img) => img.path === pathname);
};

/**
 * Turns any stored image reference into something a link-preview crawler can show.
 * Returns `{ url, width?, height?, type? }`, or null when the image can't be used
 * (empty, data:/blob: URLs, SVG, Cloudinary raw files). Width and height are only
 * set when they're known: Cloudinary images are resized to exactly 1200×630 JPEG;
 * other hosts are left as they are, without dimensions.
 */
export const toOgImage = (input, base = LANDING_ORIGIN) => {
    const raw = String(input || '').trim();
    if (!raw || /^(data|blob|javascript):/i.test(raw)) return null;

    let url;
    try {
        url = new URL(raw, base);
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const ext = (url.pathname.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
    if (ext === 'svg' || /(^|[,/])f_svg([,/]|$)/.test(url.pathname)) return null;

    const known = KNOWN_DEFAULTS.find((img) => img.path === url.pathname);
    if (known) return { url: url.href, width: known.width, height: known.height, type: known.type };

    const isCloudinary = url.hostname === 'res.cloudinary.com' || url.hostname.endsWith('.cloudinary.com');
    if (isCloudinary) {
        // /<cloud>/<image|video|raw>/upload/[transformations/][v123/]<public id>
        const parts = url.pathname.split('/');
        const uploadAt = parts.indexOf('upload');
        const resource = parts[uploadAt - 1];
        if (uploadAt > 0 && (resource === 'image' || resource === 'video')) {
            let insertAt = uploadAt + 1;
            while (insertAt < parts.length - 1 && CLOUDINARY_TRANSFORM.test(parts[insertAt])) insertAt += 1;
            parts.splice(insertAt, 0, CLOUDINARY_OG);
            const last = parts.length - 1;
            if (/\.[a-z0-9]+$/i.test(parts[last])) parts[last] = parts[last].replace(/\.[a-z0-9]+$/i, '.jpg');
            url.pathname = parts.join('/');
            url.protocol = 'https:';
            return { url: url.href, width: 1200, height: 630, type: 'image/jpeg' };
        }
        if (resource === 'raw') return null;
    }

    return { url: url.href, type: IMAGE_TYPES[ext] };
};
