import { useEffect } from 'react';
import { create } from 'zustand';
import { createAuthSlice, bindLegacyAuth } from './auth';
import { createProfileSlice, toProfile } from './profile';
import { createCommunitySlice } from './community';
import { createPassesSlice } from './passes';
import { createCreatorSlice } from './creator';
import { createNotificationsSlice, bindLegacyNotifications } from './notifications';

/*
 * The app's store (app.newbi.live), built from slices.
 *
 * This is the start of splitting src/lib/store.js. The admin and the landing
 * site keep importing the legacy store; only src/app/* uses this one. Public
 * slices only ever query the signed-in user's own documents.
 */

export const useAppStore = create((...a) => ({
    ...createAuthSlice(...a),
    ...createProfileSlice(...a),
    ...createCommunitySlice(...a),
    ...createPassesSlice(...a),
    ...createCreatorSlice(...a),
    ...createNotificationsSlice(...a),
}));

bindLegacyAuth(useAppStore);
bindLegacyNotifications(useAppStore);

// Keep the profile's auth-derived fields (photo, verified auth phone) current.
useAppStore.subscribe((state, prev) => {
    if (state.authUser !== prev.authUser && state.profileDoc) {
        useAppStore.setState({ profile: toProfile(state.profileDoc, state.authUser) });
    }
});

/*
 * Per-user listeners for the app session (profile, creator profile, passes).
 * Mounted by AppLayout only, so landing-site visitors open none of them.
 */
export function useAppSession() {
    const uid = useAppStore(s => s.authUser?.uid);
    useEffect(() => {
        const { subscribeProfile, subscribeCreator, subscribePasses } = useAppStore.getState();
        const unsubs = [subscribeProfile(uid), subscribeCreator(uid), subscribePasses(uid)];
        return () => unsubs.forEach(fn => fn?.());
    }, [uid]);
}

/* Capability check: the profile flag, or (for creators) an existing creator profile. */
export const hasCapability = (state, capability) => {
    if (!capability) return true;
    if (state.profile?.capabilities?.[capability]) return true;
    if (capability === 'creator') return Boolean(state.creatorProfile);
    return false;
};

export const useCapability = (capability) => useAppStore(s => hasCapability(s, capability));
