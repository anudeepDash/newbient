import {
    collection, doc, onSnapshot, query, where, writeBatch, increment, runTransaction, getCountFromServer,
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { formClosedReason, validateAnswers, NO_ANSWER_TYPES } from './formSchema';

/*
 * Responses to built-in forms live in `form_responses`:
 *   { formId, formTitle, answers: { [fieldId]: value }, fields: [{ id, label, type }],
 *     userId, email, name, status, submittedAt, adminNote }
 *
 * Submitting goes through /api/forms?action=submit (the server re-checks
 * required answers, closed forms, limits and duplicates). When that endpoint
 * isn't reachable (local dev), the same checks run here and the response is
 * written directly. Admin reads and edits go straight to Firestore, with the
 * API as a fallback if the database rules refuse.
 */

const token = async () => {
    try { return auth.currentUser ? await auth.currentUser.getIdToken() : null; } catch { return null; }
};

const api = async (path, { method = 'GET', body } = {}) => {
    const t = await token();
    const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) {
        // Not the API (e.g. the dev server answered with the app's HTML).
        throw Object.assign(new Error('API unavailable'), { unavailable: true });
    }
    const json = await res.json();
    if (!res.ok || json.success === false) {
        throw Object.assign(new Error(json.error || 'Request failed'), { code: json.code, errors: json.errors, status: res.status });
    }
    return json;
};

const isPermission = (err) => err?.code === 'permission-denied' || /permission/i.test(err?.message || '');

/** Submit answers. Throws Error with `.code` (CLOSED, DUPLICATE, SIGN_IN, INVALID) and `.errors`. */
export const submitFormResponse = async (form, rawAnswers, user) => {
    try {
        return await api('/api/forms?action=submit', { method: 'POST', body: { formId: form.id, answers: rawAnswers } });
    } catch (err) {
        if (!err.unavailable) throw err;
    }

    // Fallback: same checks, written from the browser.
    const closed = formClosedReason(form);
    if (closed) throw Object.assign(new Error(closed), { code: 'CLOSED' });
    if ((form.requireSignIn || form.onePerPerson) && !user) throw Object.assign(new Error('Please sign in to fill this form.'), { code: 'SIGN_IN' });
    const { answers, errors } = validateAnswers(form.fields, rawAnswers);
    if (Object.keys(errors).length) throw Object.assign(new Error('Some answers need another look.'), { code: 'INVALID', errors });

    const emailField = form.fields.find(f => f.type === 'email' && answers[f.id]);
    const nameField = form.fields.find(f => f.type === 'short' && /name/i.test(f.label || '') && answers[f.id]);
    const ref = form.onePerPerson && user ? doc(db, 'form_responses', `${form.id}_${user.uid}`) : doc(collection(db, 'form_responses'));
    const data = {
        formId: form.id,
        formTitle: form.title || '',
        answers,
        fields: form.fields.filter(f => !NO_ANSWER_TYPES.includes(f.type)).map(f => ({ id: f.id, label: f.label || '', type: f.type })),
        userId: user?.uid || null,
        email: (emailField ? answers[emailField.id] : null) || user?.email || null,
        name: (nameField ? answers[nameField.id] : null) || user?.displayName || null,
        status: 'new',
        submittedAt: new Date().toISOString(),
        source: 'web',
    };
    await runTransaction(db, async (tx) => {
        if (form.onePerPerson && user) {
            const existing = await tx.get(ref);
            if (existing.exists()) throw Object.assign(new Error("You've already filled this form."), { code: 'DUPLICATE' });
        }
        tx.set(ref, data);
    });
    // Best effort: visitors may not be allowed to touch the form document.
    try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'forms', form.id), { responseCount: increment(1), lastResponseAt: data.submittedAt });
        await batch.commit();
    } catch { /* counted on the admin side instead */ }
    return { success: true, id: ref.id };
};

/** Live responses for one form, newest first. Returns an unsubscribe. */
export const subscribeToFormResponses = (formId, onData, onError) => {
    if (!formId) return () => {};
    let cancelled = false;
    const sort = (list) => list.sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
    const unsub = onSnapshot(
        query(collection(db, 'form_responses'), where('formId', '==', formId)),
        (snap) => onData(sort(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
        async (err) => {
            if (!isPermission(err)) { onError?.(err); return; }
            try {
                const json = await api(`/api/forms?action=responses&formId=${encodeURIComponent(formId)}`);
                if (!cancelled) onData(sort(json.responses || []));
            } catch (apiErr) {
                if (!cancelled) onError?.(apiErr);
            }
        }
    );
    return () => { cancelled = true; unsub(); };
};

export const countFormResponses = async (formId) => {
    const snap = await getCountFromServer(query(collection(db, 'form_responses'), where('formId', '==', formId)));
    return snap.data().count;
};

export const updateFormResponses = async (ids, updates) => {
    try {
        for (let i = 0; i < ids.length; i += 400) {
            const batch = writeBatch(db);
            ids.slice(i, i + 400).forEach(id => batch.update(doc(db, 'form_responses', id), updates));
            await batch.commit();
        }
    } catch (err) {
        if (!isPermission(err)) throw err;
        await api('/api/forms?action=response-update', { method: 'POST', body: { ids, updates } });
    }
};

export const deleteFormResponses = async (ids, formId) => {
    try {
        for (let i = 0; i < ids.length; i += 400) {
            const chunk = ids.slice(i, i + 400);
            const batch = writeBatch(db);
            chunk.forEach(id => batch.delete(doc(db, 'form_responses', id)));
            if (formId) batch.update(doc(db, 'forms', formId), { responseCount: increment(-chunk.length) });
            await batch.commit();
        }
    } catch (err) {
        if (!isPermission(err)) throw err;
        await api('/api/forms?action=response-delete', { method: 'POST', body: { ids } });
    }
};

/** Repair the stored count (used for response limits) from the real number. */
export const syncResponseCount = async (formId, count) => {
    try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'forms', formId), { responseCount: count });
        await batch.commit();
    } catch { /* not critical */ }
};
