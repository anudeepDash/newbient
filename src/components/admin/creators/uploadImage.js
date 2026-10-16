import { useStore } from '../../../lib/store';

const MAX_MB = 5;

/** Checks an image and uploads it. Resolves to the public URL or throws a friendly error. */
export const uploadImage = async (file) => {
    if (!file) throw new Error('Choose an image.');
    const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(file.name || '');
    if (!isImage) throw new Error("That isn't an image. Use a JPG, PNG, WebP or SVG.");
    if (file.size > MAX_MB * 1024 * 1024) {
        throw new Error(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Keep it under ${MAX_MB} MB.`);
    }
    let url = null;
    try {
        url = await useStore.getState().uploadToCloudinary(file);
    } catch (err) {
        console.error('Image upload failed:', err);
    }
    if (!url) throw new Error("Couldn't upload the image. Please try again.");
    return url;
};

/** Accepts "brand.com" or "https://brand.com"; returns '' when empty and null when invalid. */
export const normaliseUrl = (raw) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    try {
        const u = new URL(withScheme);
        return u.hostname.includes('.') ? u.toString().replace(/\/$/, '') : null;
    } catch {
        return null;
    }
};

/**
 * Moves one item up or down and renumbers `order` 1..n for every item whose
 * position changed. `update(id, { order })` is the store action.
 */
export const moveItem = async (items, index, delta, update) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const writes = next
        .map((item, i) => ({ item, order: i + 1 }))
        .filter(({ item, order }) => (item.order || 0) !== order);
    await Promise.all(writes.map(({ item, order }) => update(item.id, { order })));
};
