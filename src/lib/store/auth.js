import { useStore as useLegacyStore } from '../store.js';
import { auth } from '../firebase';
import { signInWithGoogle, finishRedirectSignIn } from '../googleSignIn';

/*
 * Auth slice for the app.
 *
 * The legacy store still owns the Firebase auth listener (App.jsx →
 * checkUserRole), and the admin depends on it, so this slice mirrors the
 * signed-in user from there instead of opening a second listener. App code
 * reads `authUser` / `authReady` from here and never touches the legacy store.
 */

const pickAuthUser = (user) => (user?.uid ? {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || '',
    phoneNumber: user.phoneNumber || null,
    // The legacy user object doesn't carry the photo; the Firebase user does.
    photoURL: user.photoURL || (auth?.currentUser?.uid === user.uid ? auth.currentUser.photoURL : null) || null,
    role: user.role || null,
} : null);

export const createAuthSlice = (set) => ({
    authUser: null,
    authReady: false,

    _syncAuth: (legacyState) => {
        set({ authUser: pickAuthUser(legacyState.user), authReady: Boolean(legacyState.authInitialized) });
    },

    /*
     * The one account sheet (src/app/auth/SignInSheet). `require` lists the
     * profile fields the next action needs (requirements.js); after sign-in the
     * same sheet asks for any that are missing. `action` runs when a signed-in
     * user finishes those details (signed-out flows resume through their intent).
     */
    accountRequire: ['name'],
    accountAction: null,
    openSignIn: ({ require = [], action = null } = {}) => {
        set({ accountRequire: Array.from(new Set(['name', ...require])), accountAction: action });
        useLegacyStore.getState().setAuthModal(true);
    },
    closeSignIn: () => useLegacyStore.getState().setAuthModal(false),
    takeAccountAction: () => {
        let action = null;
        set((state) => { action = state.accountAction; return { accountAction: null, accountRequire: ['name'] }; });
        return action;
    },

    signInWithGoogle,
    finishRedirectSignIn,

    signOut: () => useLegacyStore.getState().logout(),
});

/* Keeps the slice in step with the legacy auth state. */
export const bindLegacyAuth = (appStore) => {
    const sync = (state) => appStore.getState()._syncAuth(state);
    sync(useLegacyStore.getState());
    return useLegacyStore.subscribe((state, prev) => {
        if (state.user !== prev.user || state.authInitialized !== prev.authInitialized) sync(state);
    });
};
