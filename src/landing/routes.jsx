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
            title: 'Newbi | College activations, live shows and creator campaigns',
            description: 'Newbi runs college activations, live shows and creator campaigns across India for brands, colleges and artists.',
        },
    },
    {
        path: '/creator',
        featureId: 'influencer_public',
        ownHeader: true,
        Page: lazyPage(() => import('../pages/CreatorLanding.jsx')),
        meta: {
            title: 'Newbi Creators | Brand campaigns and live event access',
            description: 'Join the Newbi creator network: brand campaigns matched to your audience, plus access to concerts and live events. Free to join.',
        },
    },
    {
        path: '/contact',
        featureId: 'contact',
        Page: lazyPage(() => import('../pages/Contact.jsx')),
        meta: {
            title: 'Contact Newbi',
            description: 'Tell us what you are planning: a college activation, a live show or a creator campaign. We reply within a working day.',
        },
    },
    {
        path: '/terms',
        Page: lazyPage(() => import('../pages/Terms.jsx')),
        meta: { title: 'Terms & Conditions | Newbi', description: 'Terms and conditions for using newbi.live and Newbi services.' },
    },
    {
        path: '/privacy',
        Page: lazyPage(() => import('../pages/Privacy.jsx')),
        meta: { title: 'Privacy Policy | Newbi', description: 'How Newbi Entertainment & Marketing collects, uses and protects your data.' },
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
