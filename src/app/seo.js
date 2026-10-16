// Titles, descriptions and share images for every page, in one place.
// Imported by the browser (src/hooks/useDynamicMeta.js) and by the preview
// function (api/og.js), so keep it plain JavaScript: no React, no
// import.meta.env, no window.

export const LANDING_ORIGIN = 'https://www.newbi.live';
export const APP_ORIGIN = 'https://app.newbi.live';
export const ARTISTANT_ORIGIN = 'https://artistant.in';

export const SITE_NAME = 'Newbi Entertainment & Marketing';
export const TWITTER_SITE = '@newbi_live';
export const DEFAULT_TITLE = 'Newbi Entertainment & Marketing';
export const DEFAULT_DESCRIPTION = 'Newbi Entertainment connects brands, colleges, and creators through talent management, live events, influencer marketing, and experiential campaigns.';

// public/og-default.jpg: the default share image for every Newbi page (1200×630
// JPEG, the newbi.live logo on #0B0B0B; source src/assets/logo/newbi-logo-2000w.png).
export const DEFAULT_IMAGE = {
    path: '/og-default.jpg',
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    alt: 'newbi.live',
};

// Concert Zone is a separate brand: its pages keep their own name and share image.
export const CONCERTZONE_IMAGE = {
    path: '/brand/concertzone-og.jpg',
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    alt: 'Concert Zone',
};

export const BRANDS = {
    newbi: { siteName: SITE_NAME, twitterSite: TWITTER_SITE, titleSuffix: ' | Newbi Ent.', image: DEFAULT_IMAGE },
    concertzone: { siteName: 'Concert Zone', twitterSite: '', titleSuffix: ' | Concert Zone', image: CONCERTZONE_IMAGE },
};

export const brandOf = (pageKey) => BRANDS[PAGES[pageKey]?.brand] || BRANDS.newbi;

const PRODUCTION_HOSTS = {
    'newbi.live': 'landing',
    'www.newbi.live': 'landing',
    'app.newbi.live': 'app',
    'artistant.in': 'artistant',
    'www.artistant.in': 'artistant',
};

const PRODUCTION_ORIGINS = {
    landing: LANDING_ORIGIN,
    app: APP_ORIGIN,
    artistant: ARTISTANT_ORIGIN,
};

const cleanHost = (host) => String(host || '').split(',')[0].trim().toLowerCase();

/** 'landing' | 'app' | 'artistant' for a production host, otherwise null. */
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
 * pageUrl(). Dynamic pages (campaign, guestlist…) use their entry as the fallback
 * when the record can't be loaded.
 */
export const PAGES = {
    // newbi.live (landing)
    home: {
        site: 'landing', path: '/',
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
    },
    creator: {
        site: 'landing', path: '/creator',
        title: 'Newbi Creator Network • Brand Campaigns & Concert Experiences',
        description: "Join India's premier creator collective. Collaborate with iconic brands, access front-row concerts, and unlock real-world perks. 100% free to join.",
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
        site: 'landing', path: '/contact',
        title: 'Contact Us | Newbi Entertainment & Marketing',
        description: 'Get in touch with Newbi for brand partnerships, creator collaborations, event activations, and media inquiries.',
    },
    terms: {
        site: 'landing', path: '/terms',
        title: 'Terms of Service | Newbi Entertainment',
        description: 'Read the Terms of Service for Newbi Entertainment and its digital platforms.',
    },
    privacy: {
        site: 'landing', path: '/privacy',
        title: 'Privacy Policy | Newbi Entertainment',
        description: 'Read the Privacy Policy for Newbi Entertainment.',
    },
    forms: {
        site: 'landing', path: '/forms',
        title: 'Newbi Forms & Community Registrations',
        description: 'Submit applications and registrations for Newbi events, community initiatives, and creator opportunities.',
    },
    form: {
        site: 'landing', path: '/forms/:id',
        title: 'Newbi Forms',
        description: 'Fill in this form on Newbi.',
    },
    'verify-creator': {
        site: 'landing', path: '/verify-creator', noindex: true,
        title: 'Creator Verification | Newbi Creator Network',
        description: 'Verify and activate your Newbi Creator profile to access brand deals and campaigns.',
    },
    'verify-payout': {
        site: 'landing', path: '/verify-payout', noindex: true,
        title: 'Verify Payout | Newbi Finance',
        description: 'Check that a payout receipt was issued by Newbi Entertainment.',
    },
    'register-payment': {
        site: 'landing', path: '/register-payment', noindex: true,
        title: 'Payee Registration | Newbi Finance',
        description: 'Register banking and payee details for vendor and creator payouts.',
    },
    proposal: {
        site: 'landing', path: '/proposal/:id', noindex: true,
        title: 'Proposal | Newbi Ent.',
        description: 'A proposal from Newbi Entertainment & Marketing.',
    },
    invoice: {
        site: 'landing', path: '/invoice/:id', noindex: true,
        title: 'Tax Invoice | Newbi Ent.',
        description: 'A tax invoice from Newbi Entertainment & Marketing.',
    },
    agreement: {
        site: 'landing', path: '/agreement/:id', noindex: true,
        title: 'Agreement | Newbi Ent.',
        description: 'A service agreement from Newbi Entertainment & Marketing.',
    },
    doc: {
        site: 'landing', path: '/doc/:id', noindex: true,
        title: 'Official Document | Newbi Ent.',
        description: 'An official document issued by Newbi Entertainment & Marketing.',
    },

    // artistant.in
    artistant: {
        site: 'artistant', path: '/',
        title: 'Artistant — the ultimate creative link-up.',
        description: "Artistant is India's premier artist booking platform. Connect verified live performers — singers, DJs, bands, comedians — with event organizers. Book talent instantly.",
    },

    // app.newbi.live
    'app-home': {
        site: 'app', path: '/',
        title: 'Newbi • Guestlists, Gigs, Giveaways & Creator Campaigns',
        description: 'Your passes, guestlists, gigs, giveaways and creator campaigns from Newbi, in one app.',
    },
    community: {
        site: 'app', path: '/community',
        title: 'Newbi Community • Guestlists, Gigs & Events',
        description: 'Get on guestlists, sign up for backstage volunteer gigs, enter giveaways and join the Newbi community.',
    },
    // Community deep links that stay on /community (?gig=, ?form=).
    gig: {
        site: 'app', path: '/community', query: 'gig',
        title: 'Volunteer Gig | Newbi Community',
        description: 'Volunteer with the Newbi crew: backstage gigs at concerts and events.',
    },
    'community-form': {
        site: 'app', path: '/community', query: 'form',
        title: 'Newbi Forms',
        description: 'Fill in this form on Newbi.',
    },
    guestlist: {
        site: 'app', path: '/community/g/:id',
        title: 'Guestlist | Newbi Community',
        description: 'Get on the guestlist for this Newbi event.',
    },
    giveaway: {
        site: 'app', path: '/community/giveaways/:id',
        title: 'Giveaway | Newbi Community',
        description: 'Enter this Newbi giveaway.',
    },
    'app-creator': {
        site: 'app', path: '/creator',
        title: 'Creator Dashboard | Newbi Creator Network',
        description: 'Find open brand campaigns, submit deliverables and track your payouts with the Newbi Creator Network.',
    },
    'creator-apply': {
        site: 'app', path: '/creator/apply',
        title: 'Apply to Newbi Creator Network • 45-Second Onboarding',
        description: 'Connect with top brands and live events in your city. Fast creator onboarding with zero agency fees.',
    },
    campaign: {
        site: 'app', path: '/c/:id',
        title: 'Brand Campaign | Newbi Creator Network',
        description: 'See the brief and apply to this brand campaign on the Newbi Creator Network.',
    },
    pass: {
        site: 'app', path: '/p/:id', noindex: true,
        title: 'Your Newbi pass',
        description: 'Open this pass on your phone and show the QR code at the entry.',
    },
    campus: {
        site: 'app', path: '/campus',
        title: 'Newbi Campus',
        description: 'Newbi on campus: college events, campus creators and student communities.',
    },
    notifications: {
        site: 'app', path: '/notifications', noindex: true,
        title: 'Notifications | Newbi',
        description: 'Your Newbi updates.',
    },
    profile: {
        site: 'app', path: '/profile', noindex: true,
        title: 'Your profile | Newbi',
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

/** Adds the brand to a bare page title ("Contact Us" → "Contact Us | Newbi Ent."). */
export const formatTitle = (title, brand = BRANDS.newbi) => {
    const clean = stripHtml(title);
    if (!clean) return brand === BRANDS.concertzone ? 'Concert Zone' : DEFAULT_TITLE;
    if (brand === BRANDS.concertzone) return /concert ?zone/i.test(clean) ? clean : `${clean}${brand.titleSuffix}`;
    return /newbi|artistant/i.test(clean) ? clean : `${clean}${brand.titleSuffix}`;
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

const KNOWN_DEFAULTS = [DEFAULT_IMAGE, CONCERTZONE_IMAGE];

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
