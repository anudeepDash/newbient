// Canonical public origin for links that leave the browser (emails, WhatsApp,
// copied share links). Admins sometimes work from Vercel preview URLs or
// localhost; links built from those origins break for creators (preview
// deployments sit behind Vercel auth, localhost only exists on one machine).
const CANONICAL_SITE_URL = (import.meta.env?.VITE_PUBLIC_SITE_URL || 'https://www.newbi.live').replace(/\/+$/, '');
const PRODUCTION_HOSTS = new Set(['newbi.live', 'www.newbi.live']);

export const getPublicSiteUrl = () => {
    if (typeof window === 'undefined' || !window.location?.origin) return CANONICAL_SITE_URL;
    const { hostname, origin } = window.location;
    if (PRODUCTION_HOSTS.has(hostname)) return origin;
    // Keep local links while developing so flows can be tested end to end.
    if (import.meta.env?.DEV && (hostname === 'localhost' || hostname === '127.0.0.1')) return origin;
    return CANONICAL_SITE_URL;
};

export const toPublicUrl = (path = '/') => `${getPublicSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
