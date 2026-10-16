import React, { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import { missingFields } from '../profile/requirements';
import { useAppStore } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/app/controls';

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

/*
 * The one gate for every action that needs an account:
 *
 *   run(intent, action, { require: requirementsFor('guestlist') })
 *
 * Signed in with everything `require` lists → runs now. Signed in but missing
 * something → the account sheet opens on its details step, then runs it.
 * Signed out → saves the intent and opens the same sheet: sign in, then any
 * missing details, then the flow resumes (useResumeIntent) once it closes.
 */
export function useAuthGate() {
    const location = useLocation();
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const openSignIn = useAppStore(s => s.openSignIn);

    const requestSignIn = useCallback((intent = null, { require = [] } = {}) => {
        savePendingIntent({ type: intent?.type || 'sign-in', payload: intent?.payload ?? null, returnTo: intent?.returnTo || currentPath(location), require });
        openSignIn({ require });
    }, [location, openSignIn]);

    const run = useCallback((intent, action, { require = [] } = {}) => {
        if (!authUser) {
            requestSignIn(intent, { require });
            return undefined;
        }
        if (missingFields(profile, require).length) {
            openSignIn({ require, action });
            return undefined;
        }
        return action?.();
    }, [authUser, profile, openSignIn, requestSignIn]);

    return { signedIn: Boolean(authUser), run, requestSignIn };
}

/*
 * Resumes a saved intent of this type once the user is signed in and back on
 * the page it started from. The handler runs once; the intent is then cleared.
 * If the profile still misses what the flow needs (the details step was
 * closed), the account sheet asks again and runs the handler after it.
 */
export function useResumeIntent(type, handler) {
    const location = useLocation();
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const openSignIn = useAppStore(s => s.openSignIn);
    // Wait for the account sheet to close: it may still be asking for details.
    const isAuthOpen = useLegacyStore(s => s.isAuthOpen);
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!authUser || isAuthOpen) return;
        const intent = readPendingIntent();
        if (!intent || intent.type !== type) return;
        if (intent.returnTo && intent.returnTo.split(/[?#]/)[0] !== location.pathname) return;
        const require = Array.isArray(intent.require) ? intent.require : [];
        if (require.length && !profileLoaded) return;
        clearPendingIntent();
        const resume = () => handlerRef.current?.(intent.payload, intent);
        if (require.length && missingFields(profile, require).length) openSignIn({ require, action: resume });
        else resume();
    }, [authUser, isAuthOpen, type, location.pathname, profile, profileLoaded, openSignIn]);
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

/* Page guard: shows a sign-in panel instead of the children when signed out. */
const AuthGate = ({ children, title = 'Sign in to continue', message = 'One account for passes, campaigns and the community.', intent }) => {
    const authUser = useAppStore(s => s.authUser);
    const authReady = useAppStore(s => s.authReady);
    const { requestSignIn } = useAuthGate();

    if (authUser) return children;
    if (!authReady) {
        return <div className="mx-auto h-48 max-w-md animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />;
    }
    return (
        <div className="relative mx-auto max-w-md overflow-hidden rounded-[1.75rem] bg-white/55 px-6 py-9 text-center ring-1 ring-inset ring-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_44px_-26px_rgba(0,0,0,0.3)] backdrop-blur-2xl dark:bg-white/[0.05] dark:ring-white/[0.12]">
            <div className="relative space-y-4">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-green text-black shadow-[0_8px_24px_-8px_rgba(57,255,20,0.8)]">
                    <LogIn size={22} />
                </span>
                <h2 className="font-heading text-[22px] font-extrabold tracking-[-0.03em]">{title}</h2>
                <p className="text-[15px] text-gray-600 dark:text-zinc-400">{message}</p>
                <Button className="w-full" onClick={() => requestSignIn(intent)}>Sign in</Button>
            </div>
        </div>
    );
};

export default AuthGate;
