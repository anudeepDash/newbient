/*
 * "Who's signed in" for the landing site.
 *
 * Firebase keeps a sign-in per origin, and the landing (newbi.live) doesn't
 * load Firebase at all, so the app (app.newbi.live) leaves a small cookie on
 * the shared parent domain: the first name and photo of whoever is signed in.
 * The landing reads it to show them as signed in. It's a display hint only and
 * grants nothing; the real session stays in the app.
 *
 *   app:     writeSessionHint({ name, photo }) · clearSessionHint()
 *   landing: readSessionHint() → { name, photo } | null
 */

const COOKIE = 'nb_signed_in';
const MAX_AGE = 60 * 60 * 24 * 30; // refreshed on every app visit

const cookieAttrs = () => {
    const { hostname, protocol } = window.location;
    // newbi.live and every subdomain share it; elsewhere (localhost, previews) it stays on this host.
    const domain = /(^|\.)newbi\.live$/i.test(hostname) ? '; domain=newbi.live' : '';
    return `; path=/${domain}; SameSite=Lax${protocol === 'https:' ? '; Secure' : ''}`;
};

export const writeSessionHint = ({ name = '', photo = '' } = {}) => {
    if (typeof document === 'undefined') return;
    const value = encodeURIComponent(JSON.stringify({ n: String(name || '').slice(0, 40), p: String(photo || '').slice(0, 500) }));
    try { document.cookie = `${COOKIE}=${value}; max-age=${MAX_AGE}${cookieAttrs()}`; } catch (e) { /* cookies blocked */ }
};

export const clearSessionHint = () => {
    if (typeof document === 'undefined') return;
    try { document.cookie = `${COOKIE}=; max-age=0${cookieAttrs()}`; } catch (e) { /* cookies blocked */ }
};

export const readSessionHint = () => {
    if (typeof document === 'undefined') return null;
    try {
        const raw = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE}=`));
        if (!raw) return null;
        const { n, p } = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1)));
        return { name: typeof n === 'string' ? n : '', photo: typeof p === 'string' && /^https:\/\//.test(p) ? p : '' };
    } catch (e) {
        return null;
    }
};
