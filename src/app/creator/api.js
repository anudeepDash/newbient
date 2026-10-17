import { auth } from '../../lib/firebase';

/*
 * The creator module's server calls (api/creator-join.js → api/_lib/creatorApp.js).
 *
 * Resolves to { ok: true, data } or { ok: false, status, code, error, missing, field }.
 * Status, follower counts and approvals are decided by the server; the app
 * only sends what the person chose.
 */
export async function callCreatorApi(action, body = {}, { method = 'POST', timeoutMs = 20000, query = null } = {}) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const headers = { 'Content-Type': 'application/json' };
        const token = await auth?.currentUser?.getIdToken?.().catch(() => null);
        if (token) headers.Authorization = `Bearer ${token}`;
        const params = new URLSearchParams({ action, ...(query || {}) });
        const url = `/api/creator-join?${params.toString()}`;
        const res = await fetch(url, {
            method,
            headers,
            body: method === 'GET' ? undefined : JSON.stringify({ ...body, action }),
            signal: controller?.signal,
        });
        let data = null;
        try { data = await res.json(); } catch { /* not JSON */ }
        if (res.ok && data?.success) return { ok: true, data };
        return {
            ok: false,
            status: res.status,
            code: data?.code || null,
            error: data?.error || 'Something went wrong. Please try again.',
            missing: data?.missing || null,
            field: data?.field || null,
            errors: data?.errors || null,
        };
    } catch (e) {
        return { ok: false, status: 0, error: 'Check your connection and try again.' };
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/* Uploads a proof screenshot to Cloudinary (the same unsigned preset the rest of the site uses). */
export async function uploadProof(file) {
    if (!file) return '';
    const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dgtalrz4n';
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'maw1e4ud');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: data });
    if (!res.ok) throw new Error('upload failed');
    const json = await res.json();
    return json.secure_url || '';
}
