/*
 * Which route tree this page load serves.
 *
 * newbi.live is the landing site; app.newbi.live is the app. Both are the same
 * Vercel project and the same bundle, so the router picks its tree from the
 * hostname. Any `app.` host counts (app.newbi.live, app.localhost in Chrome,
 * an app.* preview alias).
 *
 * Safari can't open app.localhost, so in dev (and on hosts that set
 * VITE_APP_BASE) the same app tree also mounts under a path prefix, `/app` by
 * default, on the landing host.
 */

export const APP_ORIGIN = 'https://app.newbi.live';
export const LANDING_ORIGIN = 'https://newbi.live';

const hostname = () => (typeof window !== 'undefined' ? window.location.hostname : '');

export const isAppHost = (host = hostname()) => /^app\./i.test(host || '');

const normaliseBase = (base) => {
    const trimmed = String(base || '').trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const isPreviewHost = (host) => /(^localhost$|^127\.0\.0\.1$|^\[::1\]$|\.localhost$|\.vercel\.app$)/i.test(host || '');

/*
 * Path prefix the app tree is mounted under on the landing host, or null when
 * it isn't mounted there (production newbi.live without VITE_APP_BASE).
 */
export const landingAppBase = (host = hostname()) => {
    const fromEnv = normaliseBase(import.meta.env.VITE_APP_BASE);
    if (fromEnv) return fromEnv;
    return import.meta.env.DEV || isPreviewHost(host) ? '/app' : null;
};

/* The prefix every app path gets on this page load: '' on the app host. */
export const appBasePath = () => (isAppHost() ? '' : landingAppBase() || '');

/* In-app path, e.g. appPath('/community') → '/community' or '/app/community'. */
export const appPath = (path = '/') => {
    const clean = path.startsWith('/') ? path : `/${path}`;
    const base = appBasePath();
    if (!base) return clean;
    return clean === '/' ? base : `${base}${clean}`;
};

/* Strips the base, so the shell can match tabs: '/app/community/x' → '/community/x'. */
export const stripAppBase = (pathname = '/') => {
    const base = appBasePath();
    if (!base || !pathname.startsWith(base)) return pathname || '/';
    return pathname.slice(base.length) || '/';
};

/*
 * A link from the landing site into the app. Same origin when the app is
 * mounted here (dev, previews), otherwise app.newbi.live.
 */
export const appUrl = (path = '/') => {
    if (isAppHost() || landingAppBase()) return appPath(path);
    return `${APP_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};

/*
 * A link from the app to a page that still lives on the landing site (the
 * current creator dashboard, community page and so on, until their phase moves
 * them into the app).
 */
export const landingUrl = (path = '/') => {
    const clean = path.startsWith('/') ? path : `/${path}`;
    if (!isAppHost()) return clean;
    // On app.localhost the landing site is plain localhost on the same port.
    const { protocol, host } = window.location;
    const landingHost = host.replace(/^app\./i, '');
    return isPreviewHost(landingHost.split(':')[0]) ? `${protocol}//${landingHost}${clean}` : `${LANDING_ORIGIN}${clean}`;
};
