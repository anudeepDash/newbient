/*
 * Staff signed in on app.newbi.live (or newbi.live) stay signed in when they
 * open admin.newbi.live. Firebase keeps a sign-in per origin, so the page that
 * sends them asks the server for a one-time code (60 seconds, single use) and
 * puts it in the admin link's fragment; the admin page trades it for a sign-in
 * on the same account. Server side: api/_lib/adminHandoff.js.
 */
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../lib/firebase';

const FRAGMENT = /^#nb-handoff=([A-Za-z0-9_-]{20,100})$/;

const callApi = async (action, body, idToken) => {
    const res = await fetch(`/api/creator-join?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify(body || {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Handoff failed (${res.status})`);
    return json;
};

/* The admin link with a sign-in code attached, or the plain link when there's no one to carry over. */
export const withHandoff = async (target) => {
    try {
        if (!auth) return target;
        await auth.authStateReady();
        if (!auth.currentUser) return target;
        const { code } = await callApi('admin-handoff-create', {}, await auth.currentUser.getIdToken());
        if (!code) return target;
        const url = new URL(target);
        url.hash = `nb-handoff=${code}`;
        return url.toString();
    } catch (err) {
        console.warn('[admin handoff] Opening the admin without carrying the sign-in:', err?.message);
        return target;
    }
};

export const hasHandoffCode = () => typeof window !== 'undefined' && FRAGMENT.test(window.location.hash);

/*
 * On the admin host: signs in with the code in the URL, if there is one and
 * nobody is signed in here yet. Runs once per page load. Returns the signed-in uid, or null.
 */
let redeeming = null;
export const redeemHandoff = () => {
    if (!redeeming) redeeming = redeem();
    return redeeming;
};

const redeem = async () => {
    const match = window.location.hash.match(FRAGMENT);
    if (!match) return null;
    // The code leaves the address bar (and history) straight away.
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
    try {
        if (!auth) return null;
        await auth.authStateReady();
        if (auth.currentUser) return auth.currentUser.uid;
        const { token } = await callApi('admin-handoff-redeem', { code: match[1] });
        if (!token) return null;
        const cred = await signInWithCustomToken(auth, token);
        return cred.user?.uid || null;
    } catch (err) {
        console.warn('[admin handoff] Sign-in was not carried over:', err?.message);
        return null;
    }
};
