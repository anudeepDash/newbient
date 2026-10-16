import { auth } from './firebase';

/**
 * Calls the ticket API (served by /api/creator-join?action=ticket-*).
 *
 * Resolves to { ok: true, data } on success, { ok: false, code, error } when the
 * server refused (sold out, bad coupon…), or { ok: false, unavailable: true }
 * when the API couldn't be reached — callers then fall back to the old
 * in-browser flow so sales never stop because of the API.
 */
export const callTicketApi = async (action, body = {}, { timeoutMs = 15000 } = {}) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const headers = { 'Content-Type': 'application/json' };
        try {
            const token = await auth?.currentUser?.getIdToken?.();
            if (token) headers.Authorization = `Bearer ${token}`;
        } catch { /* signed-out buyers are fine */ }

        const res = await fetch(`/api/creator-join?action=${encodeURIComponent(action)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...body, action }),
            signal: controller?.signal,
        });
        let data = null;
        try { data = await res.json(); } catch { /* non-JSON means the API isn't there */ }

        if (res.ok && data?.success) return { ok: true, data };
        if (data && res.status >= 400 && res.status < 500 && data.code) {
            return { ok: false, code: data.code, error: data.error, status: res.status };
        }
        return { ok: false, unavailable: true, error: data?.error };
    } catch {
        return { ok: false, unavailable: true };
    } finally {
        if (timer) clearTimeout(timer);
    }
};
