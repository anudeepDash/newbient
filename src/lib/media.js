/*
 * Uploads to Firebase Storage (bucket in us-central1, free up to 5 GB stored and
 * 100 GB downloaded a month). Replaces Cloudinary, whose free bandwidth ran out.
 *
 * Firebase can't resize on the fly the way Cloudinary did, so pictures are
 * resized here in the browser before upload: one WebP (or JPEG where the
 * browser can't write WebP) per width in MEDIA_WIDTHS below the picture's own
 * width, the largest capped at MEDIA_MAX_WIDTH, plus an email.jpg for mail
 * clients, push notifications and link previews. They are stored as
 *
 *   media/<id>/w160.webp, w480.webp, …, w<largest>.webp, email.jpg
 *
 * and the link returned names the largest. sizedImage / sizedJpeg
 * (src/lib/image.js) pick the other copies from that link.
 *
 * Everything else (GIF, SVG, PDF, video, documents, and pictures the browser
 * can't read, such as HEIC on Chrome) is stored once, as it is, as
 * media/<id>/<file name>.
 *
 * Files under media/ are public to read (storage.rules), so the links carry no
 * download token and are cached for a year: a file is never changed in place.
 */
import { ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from './firebase';
import { MEDIA_WIDTHS, MEDIA_MAX_WIDTH, MEDIA_EMAIL_WIDTH } from './image';

const CACHE = 'public, max-age=31536000, immutable';
const QUALITY = 0.82;
// Formats the browser is asked to read and resize. GIF (animation) and SVG stay as they are.
const RESIZABLE = /^image\/(jpeg|jpg|png|webp|bmp|avif|heic|heif)$/i;
const RESIZABLE_EXT = /\.(jpe?g|png|webp|bmp|avif|heic|heif)$/i;

const bucketName = () => storage?.app?.options?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;

/* The public, token-free link to a file under media/. */
export const mediaUrl = (path) =>
    `https://firebasestorage.googleapis.com/v0/b/${bucketName()}/o/${encodeURIComponent(path)}?alt=media`;

const newId = () => {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '');
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
};

/* A file name safe for a storage path, keeping its extension. */
const safeName = (name, type) => {
    const fallbackExt = (type || '').split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
    const clean = String(name || '').replace(/[^A-Za-z0-9._-]/g, '_').replace(/_+/g, '_').slice(-100);
    if (!clean || clean === '.' || !/\.[A-Za-z0-9]+$/.test(clean)) return `${clean || 'file'}.${fallbackExt}`;
    return clean;
};

const isResizable = (file) => RESIZABLE.test(file.type || '') || (!file.type && RESIZABLE_EXT.test(file.name || ''));

/* Reads a picture into something drawable, upright (EXIF rotation applied), or null. */
const decode = async (file) => {
    if (typeof createImageBitmap === 'function') {
        try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* try an <img> */ }
    }
    if (typeof Image === 'undefined') return null;
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        await img.decode();
        return img.naturalWidth ? img : null;
    } catch {
        return null;
    } finally {
        URL.revokeObjectURL(url);
    }
};

const sourceSize = (src) => ({ w: src.width || src.naturalWidth, h: src.height || src.naturalHeight });

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/* Draws `src` at `width` (keeping its shape) into a new canvas; `background` fills transparency. */
const draw = (src, width, background) => {
    const { w, h } = sourceSize(src);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.max(1, Math.round((h * width) / w));
    const ctx = canvas.getContext('2d');
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    return canvas;
};

let webpSupport = null;
/* Some browsers (older Safari) quietly write PNG when asked for WebP. */
const canWriteWebp = async () => {
    if (webpSupport === null) {
        const c = document.createElement('canvas');
        c.width = 2; c.height = 2;
        const blob = await toBlob(c, 'image/webp', QUALITY);
        webpSupport = blob?.type === 'image/webp';
    }
    return webpSupport;
};

/*
 * The sized copies of a picture: [{ name, blob }], the largest first, or null
 * when the browser can't read it. Each copy is drawn from the one above it,
 * which looks better than shrinking a big photo in one step.
 */
export const makeSizedCopies = async (file) => {
    const src = await decode(file);
    if (!src) return null;
    try {
        const { w } = sourceSize(src);
        if (!w) return null;
        const top = Math.min(w, MEDIA_MAX_WIDTH);
        const widths = [top, ...MEDIA_WIDTHS.filter((x) => x < top).reverse()];
        const webp = await canWriteWebp();
        const type = webp ? 'image/webp' : 'image/jpeg';
        const ext = webp ? 'webp' : 'jpg';
        // JPEG has no transparency: put logos on white instead of black.
        const background = webp ? null : '#ffffff';

        const copies = [];
        let from = src;
        for (const width of widths) {
            const canvas = draw(from, width, background);
            const blob = await toBlob(canvas, type, QUALITY);
            if (!blob) return null;
            copies.push({ name: `w${width}.${ext}`, blob });
            from = canvas;
        }
        const email = await toBlob(draw(src, Math.min(top, MEDIA_EMAIL_WIDTH), '#ffffff'), 'image/jpeg', QUALITY);
        if (!email) return null;
        copies.push({ name: 'email.jpg', blob: email });
        return copies;
    } finally {
        src.close?.();
    }
};

/* Uploads blobs under media/<id>/ with one combined progress callback (0–100). */
const putAll = (id, items, onProgress) => {
    const total = items.reduce((n, it) => n + it.blob.size, 0) || 1;
    const sent = items.map(() => 0);
    const report = () => onProgress?.(Math.min(99, Math.round((sent.reduce((a, b) => a + b, 0) / total) * 100)));
    return Promise.all(items.map((it, i) => new Promise((resolve, reject) => {
        const task = uploadBytesResumable(ref(storage, `media/${id}/${it.name}`), it.blob, {
            contentType: it.blob.type || it.type || 'application/octet-stream',
            cacheControl: CACHE,
        });
        task.on('state_changed', (snap) => { sent[i] = snap.bytesTransferred; report(); }, reject, resolve);
    })));
};

const withTimeout = (promise, ms, message) => {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
    ]).finally(() => clearTimeout(timer));
};

/**
 * Uploads a file to Firebase Storage and resolves to its public link.
 *   options.onProgress(percent)  progress, 0–100
 *   options.resize = false       store a picture as it is (no sized copies)
 */
export const uploadMedia = async (file, { onProgress, resize = true } = {}) => {
    if (!file) return null;
    if (!storage) throw new Error('File storage is not set up.');
    const id = newId();

    const copies = resize && isResizable(file) ? await makeSizedCopies(file).catch(() => null) : null;
    const items = copies || [{ name: safeName(file.name, file.type), blob: file, type: file.type }];
    const bytes = items.reduce((n, it) => n + it.blob.size, 0);
    // A minute plus a minute for every 10 MB, so a slow phone connection isn't cut off.
    await withTimeout(putAll(id, items, onProgress), 60000 + (bytes / 10e6) * 60000, 'The upload took too long.');
    onProgress?.(100);
    return mediaUrl(`media/${id}/${items[0].name}`);
};

/* The old uploader: Cloudinary's unsigned preset. Only a fallback now (see uploadFile). */
const uploadToCloudinary = async (file) => {
    const extension = file.name?.split('.').pop()?.toLowerCase();
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'heic', 'heif'];
    let resourceType = 'image';
    if (file.type?.startsWith('video/') || videoExtensions.includes(extension)) resourceType = 'video';
    else if (file.type?.startsWith('application/') || (extension && !imageExtensions.includes(extension))) resourceType = 'raw';

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dgtalrz4n';
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'maw1e4ud');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: data });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.secure_url) throw new Error(json.error?.message || `Upload failed (${res.status})`);
    return json.secure_url;
};

/**
 * What the app's upload buttons call: Firebase Storage (uploadMedia), and
 * Cloudinary only if that fails, so an upload still goes through during an
 * outage. Same options as uploadMedia.
 */
export const uploadFile = async (file, options = {}) => {
    if (!file) return null;
    try {
        return await uploadMedia(file, options);
    } catch (firebaseError) {
        console.warn('[upload] Firebase Storage failed, trying Cloudinary:', firebaseError);
        try {
            options.onProgress?.(50);
            const url = await uploadToCloudinary(file);
            options.onProgress?.(100);
            return url;
        } catch (error) {
            console.error('[upload] Cloudinary fallback also failed:', error);
            throw new Error("Couldn't upload your file. Please check your internet connection or try a smaller file.");
        }
    }
};
