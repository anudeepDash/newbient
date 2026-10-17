/*
 * The landing site's pages. Each one is its own chunk; the client loads the
 * current page's chunk before hydrating, so the prerendered HTML is adopted
 * as-is, and later visits load on navigation.
 */

const SITE = 'https://www.newbi.live';
const DEFAULT_IMAGE = `${SITE}/og-brand.png?v=2`;

function lazyPage(loader) {
    let Component = null;
    let promise = null;
    const preload = () => {
        if (!promise) promise = loader().then((m) => { Component = m.default; return Component; });
        return promise;
    };
    function Page(props) {
        if (!Component) throw preload(); // suspends until the chunk is in
        return <Component {...props} />;
    }
    Page.preload = preload;
    return Page;
}

export const LANDING_ROUTES = [
    {
        path: '/',
        featureId: 'home',
        Page: lazyPage(() => import('./pages/HomePage.jsx')),
        meta: {
            title: 'Newbi — We build the nights you remember',
            description: 'Concerts, college fests, brand activations and creator campaigns across India, planned, produced and run end to end by the Newbi crew.',
        },
    },
    {
        path: '/work',
        featureId: 'home',
        Page: lazyPage(() => import('./pages/WorkPage.jsx')),
        meta: {
            title: 'Nights we built | Newbi',
            description: 'Concerts, launches, fests and campaigns the Newbi crew has produced and run across India. Tap a poster to watch the reel.',
        },
    },
    {
        path: '/creator',
        featureId: 'influencer_public',
        Page: lazyPage(() => import('./pages/CreatorPage.jsx')),
        meta: {
            title: 'Newbi Creators — Brand deals, backstage access',
            description: 'Join the Newbi creator network: brand campaigns matched to your city, niche and audience, plus access to the shows we run. Free to join.',
        },
    },
    {
        path: '/community',
        featureId: 'community',
        Page: lazyPage(() => import('./pages/CommunityPage.jsx')),
        meta: {
            title: 'Get on the list | Newbi Community',
            description: 'One account for guestlists, volunteer gigs, giveaways and passes at the shows Newbi runs. Sign in once; your QR code does the rest at the gate.',
        },
    },
    {
        path: '/contact',
        featureId: 'contact',
        Page: lazyPage(() => import('../pages/Contact.jsx')),
        meta: {
            title: "Let's make some noise | Newbi",
            description: 'Tell us what you are planning: a college activation, a live show or a creator campaign. We reply within a working day.',
        },
    },
    {
        path: '/terms',
        Page: lazyPage(() => import('../pages/Terms.jsx')),
        meta: { title: 'Terms of Service | Newbi', description: 'The terms for using newbi.live, app.newbi.live and Newbi services.' },
    },
    {
        path: '/privacy',
        Page: lazyPage(() => import('../pages/Privacy.jsx')),
        meta: { title: 'Privacy Policy | Newbi', description: 'How Newbi collects, uses and protects your data.' },
    },
];

export const findRoute = (pathname) => {
    const clean = (pathname || '/').replace(/\/+$/, '') || '/';
    return LANDING_ROUTES.find((r) => r.path === clean) || null;
};

export const canonicalUrl = (path) => `${SITE}${path === '/' ? '/' : path}`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Static <head> tags for a prerendered page.
export function headTags(route) {
    const { title, description, image = DEFAULT_IMAGE } = route.meta;
    const url = canonicalUrl(route.path);
    return [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}" />`,
        `<link rel="canonical" href="${url}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="Newbi" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:image" content="${image}" />`,
        `<meta property="og:image:alt" content="Newbi" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:site" content="@newbi_live" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(description)}" />`,
        `<meta name="twitter:image" content="${image}" />`,
    ].join('\n  ');
}
