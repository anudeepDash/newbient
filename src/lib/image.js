/*
 * Smaller, modern-format renditions of Cloudinary pictures.
 *
 * Uploads are kept at full size (often a 4 MB phone photo), so showing the
 * original in a card spends Cloudinary bandwidth for pixels nobody sees.
 * sizedImage asks Cloudinary for a copy no wider than `width` in the lightest
 * format the browser takes (WebP/AVIF), at automatic quality.
 *
 * Widths are rounded up to a few fixed steps: every distinct size is a separate
 * derived image that counts against the transformation quota, so the steps keep
 * that to a handful per picture. Pass the pixels needed on a 2x screen.
 *
 * Other hosts, data:/blob: previews, SVG, GIF and PDF uploads, and links that
 * already carry a transformation come back unchanged.
 */
const CLOUDINARY_IMAGE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;
const ALREADY_TRANSFORMED = /\/upload\/[^/]*(w_|h_|f_auto|q_auto)/;
const KEEP_AS_IS = /\.(svg|gif|pdf)(\?|#|$)/i;
const STEPS = [96, 160, 320, 480, 720, 960, 1280, 1600, 2000];

export const sizedImage = (src, width) => {
    if (typeof src !== 'string' || !CLOUDINARY_IMAGE.test(src)) return src;
    if (ALREADY_TRANSFORMED.test(src) || KEEP_AS_IS.test(src)) return src;
    const w = STEPS.find((s) => s >= width) || STEPS[STEPS.length - 1];
    return src.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${w}/`);
};
