import { isInAppBrowser } from './platform';

/*
 * Google sign-in, shared by the legacy AuthOverlay and the app.
 *
 * Popups fail inside the Instagram/WhatsApp in-app browsers, so there it's a
 * full-page redirect. The page reloads signed in; finishRedirectSignIn()
 * collects the result (and any error) once on the way back.
 */

const PENDING_REDIRECT_KEY = 'nb_auth_redirect_pending';

export async function signInWithGoogle({ redirect = isInAppBrowser() } = {}) {
    const { auth, googleProvider } = await import('./firebase');
    const { signInWithPopup, signInWithRedirect } = await import('firebase/auth');
    if (redirect) {
        try { sessionStorage.setItem(PENDING_REDIRECT_KEY, '1'); } catch (e) { /* private mode */ }
        await signInWithRedirect(auth, googleProvider);
        return null;
    }
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

export async function finishRedirectSignIn() {
    let pending = false;
    try {
        pending = sessionStorage.getItem(PENDING_REDIRECT_KEY) === '1';
        sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    } catch (e) { /* private mode */ }
    if (!pending) return null;
    const { auth } = await import('./firebase');
    const { getRedirectResult } = await import('firebase/auth');
    const result = await getRedirectResult(auth);
    return result?.user || null;
}
