import { t } from '../../i18n';
import { auth } from '../../lib/firebase';
import { uploadFile } from '../../lib/media';

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
        // After a reload the signed-in user comes back from saved state before Firebase has
        // restored the session; wait for it, or the first calls go out signed out.
        if (auth?.authStateReady) await auth.authStateReady().catch(() => {});
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
            error: data?.error || t('Something went wrong. Please try again.'),
            missing: data?.missing || null,
            field: data?.field || null,
            errors: data?.errors || null,
        };
    } catch (e) {
        return { ok: false, status: 0, error: t('Check your connection and try again.') };
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/* Uploads a proof screenshot (Firebase Storage, see src/lib/media.js). */
export async function uploadProof(file) {
    if (!file) return '';
    return (await uploadFile(file)) || '';
}
