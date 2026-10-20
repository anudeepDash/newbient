import { getApp, getApps, initializeApp } from 'firebase/app';
import {
    initializeAuth, inMemoryPersistence, signInWithCredential, signInWithPopup, signInWithEmailAndPassword, signOut,
    GoogleAuthProvider, EmailAuthProvider, linkWithCredential,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { callCreatorApi } from '../creator/api';
import { t } from '../../i18n';

/*
 * Merging another account into the signed-in one (api/_lib/accountMerge.js).
 *
 * To prove the other account is theirs, the person signs in to it in a
 * throwaway, in-memory Firebase session: the main session never changes. That
 * session's fresh ID token is the proof the server asks for.
 *
 *   const proof = await proveWithGoogle();          // or proveWithCredential / proveWithPassword
 *   const { preview } = await previewMerge(proof);  // what it holds, or why it can't merge
 *   await confirmMerge(proof);                      // moves everything, deletes the other sign-in
 */

let proofAuth = null;
const getProofAuth = () => {
    if (proofAuth) return proofAuth;
    const name = 'nb-account-proof';
    const app = getApps().find(a => a.name === name) || initializeApp(getApp().options, name);
    proofAuth = initializeAuth(app, { persistence: inMemoryPersistence });
    return proofAuth;
};

const friendly = (err) => {
    const code = String(err?.code || '');
    if (code.includes('popup-closed') || code.includes('cancelled-popup')) return '';
    if (code.includes('popup-blocked')) return t('Your browser blocked the Google window. Allow pop-ups and try again.');
    if (code.includes('wrong-password') || code.includes('invalid-credential') || code.includes('invalid-login')) return t('That email and password don’t match.');
    if (code.includes('user-not-found')) return t('There’s no account with that email.');
    if (code.includes('too-many-requests')) return t('Too many attempts. Wait a few minutes and try again.');
    if (code.includes('network-request-failed')) return t('No connection. Check your internet and try again.');
    return t('We couldn’t sign in to that account. Please try again.');
};

/* Signs in to the other account in the throwaway session; returns { token, credential } (the credential is linked here after the merge). */
const prove = async (signIn, linkable = null) => {
    const proof = getProofAuth();
    try {
        const result = await signIn(proof);
        const token = await result.user.getIdToken();
        return { token, credential: linkable ? linkable(result) : null, uid: result.user.uid };
    } catch (err) {
        throw Object.assign(new Error(friendly(err)), { code: err?.code, friendly: friendly(err) });
    } finally {
        await signOut(proof).catch(() => {});
    }
};

export const proveWithCredential = (credential) => prove(p => signInWithCredential(p, credential));
export const proveWithGoogle = () => prove(
    p => signInWithPopup(p, new GoogleAuthProvider()),
    result => GoogleAuthProvider.credentialFromResult(result),
);
export const proveWithPassword = (email, password) => prove(
    p => signInWithEmailAndPassword(p, email, password),
    () => EmailAuthProvider.credential(email, password),
);

export const findOtherAccounts = async (email) => {
    const res = await callCreatorApi('account-matches', email ? { email } : {});
    return res.ok ? res.data.matches || [] : [];
};

export const previewMerge = async (proof) => {
    const res = await callCreatorApi('account-merge', { proofToken: proof.token });
    if (!res.ok) throw Object.assign(new Error(res.error), { code: res.code, friendly: res.error });
    return res.data.preview;
};

/*
 * The merge. Afterwards the other account's Google or password sign-in is
 * added to this one (its phone sign-in is moved by the server), so signing in
 * that way opens this account. The account is reloaded so its token carries it.
 */
export const confirmMerge = async (proof) => {
    const res = await callCreatorApi('account-merge', { proofToken: proof.token, confirm: true }, { timeoutMs: 60000 });
    if (!res.ok) throw Object.assign(new Error(res.error), { code: res.code, friendly: res.error });
    if (proof.credential && auth.currentUser) {
        await linkWithCredential(auth.currentUser, proof.credential).catch(err => console.warn('[merge] link sign-in:', err?.code || err));
    }
    await auth.currentUser?.reload().catch(() => {});
    await auth.currentUser?.getIdToken(true).catch(() => {});
    return res.data;
};

/* "2 passes, 1 ticket order and your creator profile" */
export const describeHoldings = (holds = {}) => {
    const plural = (count, one, many) => t(count === 1 ? one : many, { count });
    const parts = [];
    if (holds.passes) parts.push(plural(holds.passes, '{count} pass', '{count} passes'));
    if (holds.ticketOrders) parts.push(plural(holds.ticketOrders, '{count} ticket order', '{count} ticket orders'));
    if (holds.giveawayEntries) parts.push(plural(holds.giveawayEntries, '{count} giveaway entry', '{count} giveaway entries'));
    if (holds.creatorProfile) parts.push(t('a creator profile'));
    if (!parts.length) return '';
    return parts.length > 1 ? t('{list} and {last}', { list: parts.slice(0, -1).join(', '), last: parts[parts.length - 1] }) : parts[0];
};
