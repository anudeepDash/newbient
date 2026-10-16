/**
 * Signs tracked email links so /api/track only redirects to destinations we
 * sent. The key comes from LINK_SIGNING_SECRET, falling back to the Firebase
 * service-account key (server-only) so it works before the new env var exists.
 */
import crypto from 'node:crypto';

const secret = () => process.env.LINK_SIGNING_SECRET || process.env.FIREBASE_PRIVATE_KEY || '';

export const signValue = (value) => {
    const key = secret();
    if (!key) return '';
    return crypto.createHmac('sha256', key).update(String(value)).digest('base64url').slice(0, 22);
};

export const isValidSignature = (value, sig) => {
    const expected = signValue(value);
    if (!expected || typeof sig !== 'string' || sig.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
};

/** Our own sites: these redirect without a signature. */
export const isOwnHost = (hostname = '') => {
    const host = String(hostname).toLowerCase();
    return ['newbi.live', 'artistant.in', 'newbient.com'].some(d => host === d || host.endsWith(`.${d}`));
};

/** Adds &sig= to every /api/track click link in an email body. */
export const signTrackedLinks = (html) => {
    if (typeof html !== 'string' || !html.includes('/api/track')) return html;
    return html.replace(/(\/api\/track\?[^"'\s>]*)/g, (link) => {
        if (/[?&]sig=/.test(link) || !/[?&]type=click/.test(link)) return link;
        const match = link.match(/[?&]url=([^&]*)/);
        if (!match) return link;
        let target;
        try { target = decodeURIComponent(match[1].replace(/&amp;/g, '&')); } catch { return link; }
        const sig = signValue(target);
        return sig ? `${link}${link.includes('&amp;') ? '&amp;' : '&'}sig=${sig}` : link;
    });
};

/** An origin for links we email: the caller's if it's one of our sites (or local dev), else the main site. */
export const safeSiteOrigin = (candidate) => {
    try {
        const o = new URL(candidate || '');
        const isLocal = o.hostname === 'localhost' || o.hostname === '127.0.0.1';
        if ((o.protocol === 'https:' && isOwnHost(o.hostname)) || isLocal) return o.origin;
    } catch { /* fall through */ }
    return 'https://www.newbi.live';
};
