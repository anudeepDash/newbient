import { collection, doc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/*
 * Creator slice: only the signed-in user's own creator profile.
 *
 * creators/{uid} is the target model. Until scripts/migrate-creators-to-uid.mjs
 * has run, some profiles still sit under a random id with a `uid` field, so
 * this falls back to that one per-user query. It never reads the whole
 * `creators` collection and never matches by email or phone.
 */

export const createCreatorSlice = (set, get) => ({
    creatorProfile: null,
    creatorLoaded: false,
    _creatorUnsub: null,

    subscribeCreator: (uid) => {
        get()._creatorUnsub?.();
        if (!uid || !db) {
            set({ creatorProfile: null, creatorLoaded: Boolean(!uid), _creatorUnsub: null });
            return () => {};
        }
        set({ creatorLoaded: false });
        let cancelled = false;
        let innerUnsub = null;

        const listenTo = (docId) => onSnapshot(doc(db, 'creators', docId), (snap) => {
            set({ creatorProfile: snap.exists() ? { ...snap.data(), id: snap.id } : null, creatorLoaded: true });
        }, (error) => {
            console.warn('[app/creator] creator listener:', error?.code || error);
            set({ creatorProfile: null, creatorLoaded: true });
        });

        // creators/{uid} first; if it doesn't exist, the legacy doc that carries this uid.
        innerUnsub = onSnapshot(doc(db, 'creators', uid), async (snap) => {
            if (snap.exists()) {
                set({ creatorProfile: { ...snap.data(), id: snap.id }, creatorLoaded: true });
                return;
            }
            try {
                const legacy = await getDocs(query(collection(db, 'creators'), where('uid', '==', uid), limit(1)));
                if (cancelled) return;
                if (legacy.empty) {
                    set({ creatorProfile: null, creatorLoaded: true });
                    return;
                }
                innerUnsub?.();
                innerUnsub = listenTo(legacy.docs[0].id);
            } catch (error) {
                console.warn('[app/creator] legacy lookup:', error?.code || error);
                if (!cancelled) set({ creatorProfile: null, creatorLoaded: true });
            }
        }, (error) => {
            console.warn('[app/creator] creator listener:', error?.code || error);
            set({ creatorProfile: null, creatorLoaded: true });
        });

        const unsub = () => {
            cancelled = true;
            innerUnsub?.();
        };
        set({ _creatorUnsub: unsub });
        return () => {
            unsub();
            if (get()._creatorUnsub === unsub) set({ _creatorUnsub: null });
        };
    },
});
