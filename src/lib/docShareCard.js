import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/*
 * The picture a shared document link shows in WhatsApp and other chats: the
 * top of the document's first page, full width, 1200x630 so chats show it as
 * a large card. It is saved on the document (previewImage, previewKey) and
 * api/og.js serves it to link crawlers.
 *
 * Uploaded PDFs are drawn straight from the file. Proposals built in the
 * builder are drawn by their own page (/proposal/:id): opened by staff, or
 * loaded out of sight by the admin when it shares a link (?card=1).
 */

const CARD_W = 1200;
const CARD_H = 630;

const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
});

/** The top of the first page (a canvas or image URL) across the whole card. Resolves to a JPEG data URL. */
export async function composeShareCard(pages) {
    const first = pages.find(Boolean);
    if (!first) return null;
    const page = typeof first === 'string' ? await loadImage(first) : first;

    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    const w = page.width || page.naturalWidth;
    const h = page.height || page.naturalHeight;
    ctx.drawImage(page, 0, 0, CARD_W, Math.round((h / w) * CARD_W));

    return canvas.toDataURL('image/jpeg', 0.88);
}

/** Page 1 of a PDF (URL or data: URL), rendered at card width. */
export async function renderPdfFirstPage(url) {
    const [pdfjs, worker] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const bytes = await (await fetch(url)).arrayBuffer();
    const task = pdfjs.getDocument({ data: bytes });
    try {
        const pdf = await task.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: CARD_W / page.getViewport({ scale: 1 }).width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport }).promise;
        return canvas;
    } finally {
        task.destroy();
    }
}

/** Short, stable fingerprint of the card, so an unchanged document is not uploaded again. */
async function fingerprint(dataUrl) {
    const bytes = new TextEncoder().encode(dataUrl);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function uploadCard(dataUrl) {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dgtalrz4n';
    const form = new FormData();
    form.append('file', dataUrl);
    form.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'maw1e4ud');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.secure_url) throw new Error(json.error?.message || `Upload failed (${res.status})`);
    return json.secure_url;
}

// Who may save a card: the staff roles firestore.rules allows to write documents.
const STAFF_ROLES = ['founder', 'super_admin', 'developer', 'admin', 'editor', 'content_admin', 'scanner', 'gate_manager', 'blog_writer'];
export const canSaveShareCard = (user) => STAFF_ROLES.includes(user?.role);

// The card being made for each document, so a share can wait for it, and the
// last one made this session (the list it was shared from may not have it yet).
const inflight = new Map();
const made = new Map();

const track = (slot, promise) => {
    const tracked = promise
        .then((result) => { if (result) made.set(slot, result); return result; })
        .finally(() => { if (inflight.get(slot) === tracked) inflight.delete(slot); });
    inflight.set(slot, tracked);
    return tracked;
};

/** Resolves to { key, url } once the card being made for collection/id is saved; null when none is in progress. */
export const whenShareCard = (collection, id) => inflight.get(`${collection}/${id}`) || null;

/**
 * Saves a fresh share card on collection/id when the page has changed since
 * the last one. getPages resolves to the page canvases or image URLs.
 * Resolves to { key, url }, or null when there was nothing to draw.
 */
export function syncShareCard(collection, id, current, getPages) {
    return track(`${collection}/${id}`, (async () => {
        const card = await composeShareCard(await getPages());
        if (!card) return null;
        const key = await fingerprint(card);
        if (current?.previewKey === key && current?.previewImage) return { key, url: current.previewImage };
        const url = await uploadCard(card);
        await updateDoc(doc(db, collection, id), { previewImage: url, previewKey: key });
        return { key, url };
    })());
}

export const CARD_MESSAGE = 'newbi:share-card';

/** Loads /proposal/:id?card=1 out of sight; that page draws and saves the card and reports back. */
const cardFromPage = (id) => new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    Object.assign(frame.style, { position: 'fixed', left: '-12000px', top: '0', width: '1280px', height: '900px', border: '0' });
    const done = (fn, value) => {
        window.removeEventListener('message', onMessage);
        clearTimeout(timer);
        frame.remove();
        fn(value);
    };
    const onMessage = (event) => {
        if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
        const data = event.data || {};
        if (data.type !== CARD_MESSAGE || data.id !== id) return;
        if (data.error) done(reject, new Error(data.error));
        else done(resolve, data.result || null);
    };
    const timer = setTimeout(() => done(reject, new Error('The proposal took too long to load.')), 30000);
    window.addEventListener('message', onMessage);
    frame.src = `/proposal/${encodeURIComponent(id)}?card=1`;
    document.body.appendChild(frame);
});

/**
 * Makes sure a proposal's card is saved and current. Uploaded PDFs are drawn
 * here; builder proposals by their page. Resolves to { key, url } or null.
 */
export function prepareProposalCard(proposal) {
    if (!proposal?.id) return Promise.resolve(null);
    const pending = whenShareCard('proposals', proposal.id);
    if (pending) return pending;
    if (proposal.isUploaded && proposal.fileUrl) {
        return syncShareCard('proposals', proposal.id, proposal, async () => [await renderPdfFirstPage(proposal.fileUrl)]);
    }
    return track(`proposals/${proposal.id}`, cardFromPage(proposal.id));
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

/**
 * A proposal link for the admin to send, once its card is ready. Uses the
 * saved card when there is one and `fresh` isn't asked for (the builder asks,
 * since it has just saved changes). A card that can't be made never blocks
 * the share: the link goes out without one.
 */
export async function proposalShareLink(proposal, via, { fresh = false } = {}) {
    const base = `${window.location.origin}/proposal/${proposal.id}?via=${via}`;
    let key = fresh ? null : (made.get(`proposals/${proposal.id}`)?.key || (!proposal.isUploaded && proposal.previewKey) || null);
    if (!key) {
        try {
            key = (await prepareProposalCard(proposal))?.key || proposal.previewKey || null;
        } catch {
            key = proposal.previewKey || null;
        }
    }
    return shareLinkWithCard(base, key);
}
