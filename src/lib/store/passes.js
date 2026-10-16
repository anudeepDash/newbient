import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/*
 * Passes slice, shared by both ticket flows (Phase 5):
 *   source 'guestlist' → shown in Community → My guestlists
 *   source 'campaign'  → shown inside that creator's campaign
 *
 * passes/{ref} is written only by api/passes.js. Holders read their own
 * (holderUid == uid); this never lists other people's passes.
 */

const sortByIssued = (a, b) => new Date(b.issuedAt || 0) - new Date(a.issuedAt || 0);

export const createPassesSlice = (set, get) => ({
    passes: [],
    passesLoaded: false,
    _passesUnsub: null,

    subscribePasses: (uid) => {
        get()._passesUnsub?.();
        if (!uid || !db) {
            set({ passes: [], passesLoaded: Boolean(!uid), _passesUnsub: null });
            return () => {};
        }
        set({ passesLoaded: false });
        const unsub = onSnapshot(
            query(collection(db, 'passes'), where('holderUid', '==', uid)),
            (snap) => set({ passes: snap.docs.map(d => ({ ...d.data(), ref: d.id })).sort(sortByIssued), passesLoaded: true }),
            (error) => {
                // Until the passes collection and its rules ship, this is expected to be denied.
                if (error?.code !== 'permission-denied') console.warn('[app/passes] passes listener:', error?.code || error);
                set({ passes: [], passesLoaded: true });
            }
        );
        set({ _passesUnsub: unsub });
        return () => {
            unsub();
            if (get()._passesUnsub === unsub) set({ _passesUnsub: null });
        };
    },
});

/* Selectors */
export const guestlistPasses = (state) => state.passes.filter(p => p.source === 'guestlist');
export const campaignPasses = (campaignId) => (state) =>
    state.passes.filter(p => p.source === 'campaign' && (!campaignId || p.sourceId === campaignId));
