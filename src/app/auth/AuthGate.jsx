import React, { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/app/controls';
import { HeroPanel } from '../pages/parts';
import newbiIcon from '../../assets/logo/newbi-icon.svg';

/*
 * Sign-in that picks up where you left off.
 *
 * When a signed-out visitor taps "Apply", "Get pass", "Enter giveaway" or
 * "I'm interested", the action is saved as a pending intent with the page it
 * came from. After sign-in (popup, phone or a full-page Google redirect from an
 * in-app browser) the visitor lands back on that page and the action resumes.
 *
 *   // in a page or component
 *   const gate = useAuthGate();
 *   const apply = () => gate.run({ type: 'campaign-apply', payload: { id } }, () => doApply(id));
 *   useResumeIntent('campaign-apply', ({ id }) => doApply(id));
 *
 *   // a page that needs sign-in
 *   <AuthGate title="Your passes" message="Sign in to see your passes.">{children}</AuthGate>
 *
 * <AuthResumer /> is mounted once by AppLayout.
 *
 * The sign-in UI is the existing AuthOverlay (Google, email, phone).
 */

const INTENT_KEY = 'nb_pending_intent';
const INTENT_TTL_MS = 30 * 60 * 1000;

/* Known intent types, so flows agree on names. */
export const INTENTS = {
    campaignApply: 'campaign-apply',
    guestlistRegister: 'guestlist-register',
    giveawayEnter: 'giveaway-enter',
    gigInterest: 'gig-interest',
    creatorApply: 'creator-apply',
    joinCommunity: 'join-community',
};

const storage = () => {
    try { return window.localStorage; } catch (e) { return null; }
};

export const savePendingIntent = (intent) => {
    try { storage()?.setItem(INTENT_KEY, JSON.stringify({ ...intent, savedAt: Date.now() })); } catch (e) { /* storage full or blocked */ }
};

export const readPendingIntent = () => {
    try {
        const raw = storage()?.getItem(INTENT_KEY);
        if (!raw) return null;
        const intent = JSON.parse(raw);
        if (!intent?.type || Date.now() - (intent.savedAt || 0) > INTENT_TTL_MS) {
            storage()?.removeItem(INTENT_KEY);
            return null;
        }
        return intent;
    } catch (e) {
        return null;
    }
};

export const clearPendingIntent = () => {
    try { storage()?.removeItem(INTENT_KEY); } catch (e) { /* blocked */ }
};

const currentPath = (location) => `${location.pathname}${location.search}${location.hash}`;

/* run(intent, action): runs now when signed in, otherwise saves the intent and opens sign-in. */
export function useAuthGate() {
    const location = useLocation();
    const authUser = useAppStore(s => s.authUser);
    const openSignIn = useAppStore(s => s.openSignIn);

    const requestSignIn = useCallback((intent = null) => {
        savePendingIntent({ type: intent?.type || 'sign-in', payload: intent?.payload ?? null, returnTo: intent?.returnTo || currentPath(location) });
        openSignIn();
    }, [location, openSignIn]);

    const run = useCallback((intent, action) => {
        if (authUser) return action?.();
        requestSignIn(intent);
        return undefined;
    }, [authUser, requestSignIn]);

    return { signedIn: Boolean(authUser), run, requestSignIn };
}

/*
 * Resumes a saved intent of this type once the user is signed in and back on
 * the page it started from. The handler runs once; the intent is then cleared.
 */
export function useResumeIntent(type, handler) {
    const location = useLocation();
    const authUser = useAppStore(s => s.authUser);
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!authUser) return;
        const intent = readPendingIntent();
        if (!intent || intent.type !== type) return;
        if (intent.returnTo && intent.returnTo.split(/[?#]/)[0] !== location.pathname) return;
        clearPendingIntent();
        handlerRef.current?.(intent.payload, intent);
    }, [authUser, type, location.pathname]);
}

/*
 * Mounted once in the shell: finishes redirect sign-ins, sends the user back
 * to where they started, and drops a bare "sign-in" intent once it's done.
 */
export function AuthResumer() {
    const navigate = useNavigate();
    const location = useLocation();
    const authUser = useAppStore(s => s.authUser);
    const finishRedirectSignIn = useAppStore(s => s.finishRedirectSignIn);
    const isAuthOpen = useLegacyStore(s => s.isAuthOpen);
    const wasSignedIn = useRef(Boolean(authUser));

    // Surface errors from a redirect sign-in (in-app browsers) once.
    useEffect(() => {
        finishRedirectSignIn().catch((err) => {
            console.warn('[auth] redirect sign-in failed:', err?.code || err);
            useLegacyStore.getState().addToast?.('Sign-in didn’t finish. Please try again.', 'error');
        });
    }, [finishRedirectSignIn]);

    useEffect(() => {
        const justSignedIn = authUser && !wasSignedIn.current;
        wasSignedIn.current = Boolean(authUser);
        if (!authUser) return;
        const intent = readPendingIntent();
        if (!intent) return;
        if (justSignedIn && intent.returnTo && intent.returnTo !== currentPath(location)) {
            navigate(intent.returnTo, { replace: true });
        }
        if (intent.type === 'sign-in') clearPendingIntent();
        // Only react to sign-in changes.
        // eslint-disable-next-line
    }, [authUser]);

    // Closing the sign-in sheet without signing in abandons the intent.
    const wasOpen = useRef(isAuthOpen);
    useEffect(() => {
        // Firebase's own user, not the store's: the store fills in a moment after sign-in.
        if (wasOpen.current && !isAuthOpen && !auth?.currentUser) {
            // A redirect sign-in leaves the page; keep the intent for the way back.
            let redirecting = false;
            try { redirecting = sessionStorage.getItem('nb_auth_redirect_pending') === '1'; } catch (e) { /* blocked */ }
            if (!redirecting) clearPendingIntent();
        }
        wasOpen.current = isAuthOpen;
    }, [isAuthOpen]);

    return null;
}

/*
 * Page guard: shows a sign-in panel instead of the children when signed out.
 * The panel is the "N." hero card; `plain` drops the card for use inside a
 * Sheet, so there's no card inside a modal.
 */
const AuthGate = ({ children, title = 'Sign in to continue', message = 'One account for passes, campaigns and the community.', intent, plain = false }) => {
    const authUser = useAppStore(s => s.authUser);
    const authReady = useAppStore(s => s.authReady);
    const { requestSignIn } = useAuthGate();

    if (authUser) return children;
    if (!authReady) {
        return <div className="mx-auto h-48 max-w-md animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />;
    }
    const signIn = <Button size="lg" className="w-full" onClick={() => requestSignIn(intent)}>Sign in</Button>;
    if (plain) {
        return (
            <div className="mx-auto flex min-h-[50dvh] max-w-sm flex-col items-center justify-center px-2 py-10 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-gray-900 shadow-[0_18px_50px_-18px_rgba(57,255,20,0.7)] dark:bg-white/[0.06] dark:ring-1 dark:ring-white/10">
                    <img src={newbiIcon} alt="" className="w-12" />
                </span>
                <h2 className="mt-5 font-heading text-[26px] font-black leading-tight tracking-tight">{title}</h2>
                <p className="mt-2 text-[15px] text-gray-600 dark:text-zinc-400">{message}</p>
                <div className="mt-6 w-full">{signIn}</div>
            </div>
        );
    }
    return (
        <HeroPanel eyebrow="Your Newbi account" title={title} className="mx-auto max-w-md">
            <p className="text-[15px] text-gray-600 dark:text-zinc-300">{message}</p>
            <div className="pt-2">{signIn}</div>
        </HeroPanel>
    );
};

export default AuthGate;
