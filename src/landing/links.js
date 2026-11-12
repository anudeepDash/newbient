/*
 * Where the landing site sends people into the app.
 *
 * Production: app.newbi.live. Local dev: the same app routes mounted under /app
 * on localhost (Safari can't use app.localhost). VITE_APP_URL overrides both.
 */
const APP_BASE = (import.meta.env.VITE_APP_URL || (import.meta.env.DEV ? '/app' : 'https://app.newbi.live')).replace(/\/$/, '');

export const appUrl = (path = '/') => `${APP_BASE}${path === '/' ? '' : path}` || '/';

// The admin (admin.newbi.live; /admin on localhost). Linked quietly from the footer.
export const ADMIN_URL = import.meta.env.DEV ? '/admin' : 'https://admin.newbi.live';

export const APP_LINKS = {
    home: appUrl('/'),
    creatorApply: appUrl('/creator/apply'),
    community: appUrl('/community'),
    campaign: (id) => appUrl(`/c/${encodeURIComponent(id)}`),
    event: (id) => appUrl(`/community/g/${encodeURIComponent(id)}`),
    giveaway: (slug) => appUrl(`/community/giveaways/${encodeURIComponent(slug)}`),
};

export const FEED_URL = '/api/forms?type=public-feed';
export const ARCHIVE_URL = '/api/forms?type=public-archive';
export const ENQUIRY_URL = '/api/forms?type=enquiry';

// Smaller, modern-format Cloudinary renditions; other hosts are left alone.
export { sizedImage } from '../lib/image';
