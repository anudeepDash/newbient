import { auth } from './firebase';

/*
 * The browser side of the passes and community APIs (served by
 * /api/forms?type=passes|community&action=…, inside an existing function
 * because the project is at Vercel's function limit).
 *
 * Every call resolves to { ok: true, data } or { ok: false, code, error, status, ...extra }.
 * code 'OFFLINE' means the request never reached the server.
 */

const call = async (type, action, { method = 'POST', body, query, timeoutMs = 20000 } = {}) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const headers = { 'Content-Type': 'application/json' };
        try {
            const token = await auth?.currentUser?.getIdToken?.();
            if (token) headers.Authorization = `Bearer ${token}`;
        } catch { /* signed out is fine for public actions */ }
        const qs = new URLSearchParams({ type, action, ...(query || {}) });
        const res = await fetch(`/api/forms?${qs}`, {
            method,
            headers,
            body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
            signal: controller?.signal,
        });
        let data = null;
        try { data = await res.json(); } catch { /* not JSON: the API isn't there (local dev without it) */ }
        if (res.ok && data?.success) return { ok: true, data };
        if (data) {
            const { success, error, code, ...extra } = data;
            void success;
            return { ok: false, status: res.status, code: code || 'ERROR', error: error || 'Something went wrong. Please try again.', ...extra };
        }
        return { ok: false, status: res.status, code: 'UNAVAILABLE', error: 'This isn’t available right now. Please try again in a moment.' };
    } catch {
        return { ok: false, code: 'OFFLINE', error: 'You seem to be offline. Check your connection and try again.' };
    } finally {
        if (timer) clearTimeout(timer);
    }
};

/* Fired after anything that changes passes, so lists read through the API refresh at once. */
export const PASSES_CHANGED = 'nb:passes-changed';
const CHANGES_PASSES = new Set(['register-guestlist', 'issue-campaign', 'issue-campaign-external', 'resend', 'retier', 'revoke', 'checkin', 'upload-finish']);

export const passesGet = (action, query, opts) => call('passes', action, { method: 'GET', query, ...opts });
export const passesPost = async (action, body, opts) => {
    const res = await call('passes', action, { method: 'POST', body, ...opts });
    if (res.ok && CHANGES_PASSES.has(action) && typeof window !== 'undefined') window.dispatchEvent(new Event(PASSES_CHANGED));
    return res;
};

/*
 * Passes read through the API instead of Firestore (when the rules don't let
 * the browser read them): runs `load` now, every `ms` while the page is
 * visible, when it comes back into view, and right after any pass change.
 * Returns stop().
 */
export const pollPasses = (load, ms = 15000) => {
    let stopped = false;
    const run = () => { if (!stopped && document.visibilityState !== 'hidden') load(); };
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    run();
    const timer = setInterval(run, ms);
    window.addEventListener(PASSES_CHANGED, run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
        stopped = true;
        clearInterval(timer);
        window.removeEventListener(PASSES_CHANGED, run);
        document.removeEventListener('visibilitychange', onVisible);
    };
};

/* One request for a campaign's passes and send log, shared by the Tickets tab's two lists. */
const inflight = new Map();
export const staffPassList = (body) => {
    const key = JSON.stringify(body);
    const hit = inflight.get(key);
    if (hit && Date.now() - hit.at < 1500) return hit.promise;
    const promise = passesPost('staff-list', body, { timeoutMs: 20000 });
    inflight.set(key, { at: Date.now(), promise });
    return promise;
};
export const communityGet = (action, query, opts) => call('community', action, { method: 'GET', query, ...opts });
export const communityPost = (action, body, opts) => call('community', action, { method: 'POST', body, ...opts });

/* File → base64 (no data: prefix), for the staff PDF upload. */
export const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('Could not read the file'));
    reader.readAsDataURL(file);
});

/* ---- offline copies of passes (so a pass opens at the gate with no signal) ---- */

const CACHE_PREFIX = 'nb_pass_';

export const cachePass = (pass) => {
    if (!pass?.ref) return;
    try { window.localStorage.setItem(`${CACHE_PREFIX}${pass.ref}`, JSON.stringify({ pass, savedAt: Date.now() })); } catch { /* storage full or blocked */ }
};

export const cachedPass = (ref) => {
    try {
        const raw = window.localStorage.getItem(`${CACHE_PREFIX}${String(ref || '').toUpperCase()}`);
        return raw ? JSON.parse(raw).pass : null;
    } catch {
        return null;
    }
};
