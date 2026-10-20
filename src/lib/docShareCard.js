import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/*
 * The picture a shared document link shows in WhatsApp and other chats: the
 * document's own first pages on a dark backdrop, 1200x630 so chats show it
 * as a large card. Staff browsers draw it from the rendered pages and save it
 * on the document (previewImage); api/og.js serves it to link crawlers.
 */

const CARD_W = 1200;
const CARD_H = 630;
const PAGE_H = 566;
const PAGE_GAP = 32;

const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
});

/** Draws up to two pages (canvases or image URLs) side by side. Resolves to a JPEG data URL. */
export async function composeShareCard(pages) {
    const sources = await Promise.all(pages.filter(Boolean).slice(0, 2).map((p) => (typeof p === 'string' ? loadImage(p) : p)));
    if (!sources.length) return null;

    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    bg.addColorStop(0, '#18181b');
    bg.addColorStop(1, '#09090b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    const sizes = sources.map((s) => {
        const w = s.width || s.naturalWidth;
        const h = s.height || s.naturalHeight;
        return { w: Math.round((w / h) * PAGE_H), h: PAGE_H };
    });
    const total = sizes.reduce((sum, s) => sum + s.w, 0) + PAGE_GAP * (sizes.length - 1);
    let x = Math.round((CARD_W - total) / 2);
    const y = Math.round((CARD_H - PAGE_H) / 2);

    sources.forEach((src, i) => {
        const { w, h } = sizes[i];
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 36;
        ctx.shadowOffsetY = 12;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, w, h);
        ctx.restore();
        ctx.drawImage(src, x, y, w, h);
        x += w + PAGE_GAP;
    });

    return canvas.toDataURL('image/jpeg', 0.86);
}

/** Short, stable fingerprint of the card, so an unchanged document is not uploaded again. */
async function fingerprint(dataUrl) {
    const bytes = new TextEncoder().encode(dataUrl);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function uploadCard(dataUrl, name) {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dgtalrz4n';
    const form = new FormData();
    form.append('file', dataUrl);
    form.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'maw1e4ud');
    form.append('public_id', name);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.secure_url) throw new Error(json.error?.message || `Upload failed (${res.status})`);
    return json.secure_url;
}

/**
 * Saves a fresh share card on collection/id when the pages have changed since
 * the last one. Staff only: Firestore rules refuse everyone else.
 */
export async function syncShareCard(collection, id, current, pages) {
    const card = await composeShareCard(pages);
    if (!card) return null;
    const key = await fingerprint(card);
    if (current?.previewKey === key && current?.previewImage) return key;
    const url = await uploadCard(card, `share-cards/${collection}-${id}-${key}`);
    await updateDoc(doc(db, collection, id), { previewImage: url, previewKey: key });
    return key;
}

/** The link to share: carries the card version so chats fetch the new card instead of a cached one. */
export const shareLinkWithCard = (href, previewKey) => {
    if (!previewKey) return href;
    try {
        const url = new URL(href);
        url.hash = '';
        url.searchParams.set('v', previewKey);
        return url.toString();
    } catch {
        return href;
    }
};
