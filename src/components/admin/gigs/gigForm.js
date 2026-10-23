import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { communityPost } from '../../../lib/passesApi';
import { gigFormDoc } from '../../../lib/gigApplications';

/*
 * Gives a gig its in-app application (its own built-in form) and brings
 * over anyone who tapped "I'm interested". The server does it
 * (api/_lib/community.js, gig-form); when the API isn't there (local dev
 * without it) the same form is written from the browser, without the
 * interested taps. Resolves to { formId, created, imported }.
 */
export const ensureGigForm = async (gigId) => {
    const res = await communityPost('gig-form', { gigId });
    if (res.ok) return res.data;
    if (res.code !== 'UNAVAILABLE') throw new Error(res.error);

    const snap = await getDoc(doc(db, 'volunteer_gigs', gigId));
    if (!snap.exists()) throw new Error("We couldn't find this gig.");
    const gig = { id: snap.id, ...snap.data() };
    if (gig.formId) {
        const existing = await getDoc(doc(db, 'forms', gig.formId));
        if (existing.exists() && Array.isArray(existing.data().fields) && existing.data().fields.length) return { formId: gig.formId, created: false, imported: 0 };
    }
    const ref = await addDoc(collection(db, 'forms'), gigFormDoc(gig));
    await updateDoc(snap.ref, { formId: ref.id, applyType: 'form', applyLink: `/forms/${ref.id}`, updatedAt: new Date().toISOString() });
    return { formId: ref.id, created: true, imported: 0 };
};
