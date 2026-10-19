import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

/*
 * One shared document (an invoice, proposal or contract link) by id, kept live.
 * Firestore rules let visitors read these one at a time, never list the collection.
 *
 *   const { data, loading, notFound } = useSharedDoc('invoices', id);
 */
export default function useSharedDoc(collectionName, id) {
    const [state, setState] = useState({ data: null, loading: true, notFound: false });

    useEffect(() => {
        if (!id || !db) {
            setState({ data: null, loading: false, notFound: true });
            return undefined;
        }
        setState(s => ({ ...s, loading: true }));
        return onSnapshot(doc(db, collectionName, id), (snap) => {
            setState({ data: snap.exists() ? { ...snap.data(), id: snap.id } : null, loading: false, notFound: !snap.exists() });
        }, (err) => {
            console.error(`[useSharedDoc] ${collectionName}/${id}:`, err?.code || err);
            setState({ data: null, loading: false, notFound: true });
        });
    }, [collectionName, id]);

    return state;
}
