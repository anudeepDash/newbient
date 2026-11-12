/*
 * Smaller, modern-format renditions of uploaded pictures.
 *
 * Two hosts are handled:
 *
 * - Firebase Storage (new uploads, see src/lib/media.js). The browser saves a
 *   picture at a few fixed widths when it is uploaded, as
 *   media/<id>/w<width>.<webp|jpg>, plus an email.jpg. The stored link names the
 *   largest copy, so the other sizes can be worked out from the link alone.
 * - Cloudinary (older uploads). Cloudinary resizes in the URL; every distinct
 *   size is a separate derived image that counts against its quota, so widths
 *   are rounded up to a few fixed steps.
 *
 * Pass the pixels needed on a 2x screen. Other hosts, data:/blob: previews,
 * SVG, GIF and PDF uploads, and Cloudinary links that already carry a
 * transformation come back unchanged.
 */

/* The widths saved for every Firebase upload (below its own largest copy). */
export const MEDIA_WIDTHS = [160, 480, 960, 1600];
/* The largest copy is at most this wide. */
export const MEDIA_MAX_WIDTH = 2000;
/* email.jpg is at most this wide. */
export const MEDIA_EMAIL_WIDTH = 1200;

// https://firebasestorage.googleapis.com/v0/b/<bucket>/o/media%2F<id>%2Fw<width>.<ext>?alt=media
const FIREBASE_MEDIA = /^(https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/?#]+\/o\/media%2F[A-Za-z0-9_-]+%2F)w(\d+)\.(webp|jpg)\?alt=media$/;

const CLOUDINARY_IMAGE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;
const ALREADY_TRANSFORMED = /\/upload\/[^/]*(w_|h_|f_auto|q_auto)/;
const KEEP_AS_IS = /\.(svg|gif|pdf)(\?|#|$)/i;
const STEPS = [96, 160, 320, 480, 720, 960, 1280, 1600, 2000];

/* True for a picture uploaded through src/lib/media.js (one that has sized copies). */
export const isSizedMedia = (src) => typeof src === 'string' && FIREBASE_MEDIA.test(src);

/* The widths a sized Firebase upload has, smallest first. */
const mediaWidths = (top) => [...MEDIA_WIDTHS.filter((w) => w < top), top];

const firebaseSized = (src, width) => {
    const m = src.match(FIREBASE_MEDIA);
    if (!m) return null;
    const top = Number(m[2]);
    const w = mediaWidths(top).find((s) => s >= width) || top;
    return `${m[1]}w${w}.${m[3]}?alt=media`;
};

const cloudinaryStep = (width) => STEPS.find((s) => s >= width) || STEPS[STEPS.length - 1];

export const sizedImage = (src, width) => {
    if (typeof src !== 'string') return src;
    const firebase = firebaseSized(src, width);
    if (firebase) return firebase;
    if (!CLOUDINARY_IMAGE.test(src)) return src;
    if (ALREADY_TRANSFORMED.test(src) || KEEP_AS_IS.test(src)) return src;
    return src.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${cloudinaryStep(width)}/`);
};

/**
 * The same, as a JPEG: for emails, push notifications and link previews, where
 * the picture is fetched by a mail client, the OS or a crawler rather than the
 * browser, so WebP (or Cloudinary's f_auto) can't be trusted. A Firebase upload
 * gives its email.jpg whatever the width asked for.
 */
export const sizedJpeg = (src, width) => {
    if (typeof src !== 'string') return src;
    const m = src.match(FIREBASE_MEDIA);
    if (m) return `${m[1]}email.jpg?alt=media`;
    if (!CLOUDINARY_IMAGE.test(src)) return src;
    if (ALREADY_TRANSFORMED.test(src) || KEEP_AS_IS.test(src)) return src;
    return src.replace('/image/upload/', `/image/upload/f_jpg,q_auto,c_limit,w_${cloudinaryStep(width)}/`);
};
