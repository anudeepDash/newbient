import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/*
 * Community slice.
 *
 * Phase 1 holds only the per-user part: joining the community, which replaces
 * the Google Form gate. The public feed (guestlists, gigs, giveaways, forms)
 * arrives in Phase 5 as one cached read, not a listener per collection.
 */

export const createCommunitySlice = (set, get) => ({
    communityFeed: [],
    communityFeedLoaded: false,

    /* One tap: sets capabilities.member (and the legacy hasJoinedTribe flag). */
    joinCommunity: async () => {
        const uid = get().authUser?.uid;
        if (!uid) throw new Error('Sign in to join the community.');
        await setDoc(doc(db, 'users', uid), {
            capabilities: { member: true },
            hasJoinedTribe: true,
            joinedCommunityAt: new Date().toISOString(),
        }, { merge: true });
    },
});
