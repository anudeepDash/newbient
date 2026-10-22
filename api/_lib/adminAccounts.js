/**
 * Fixing someone's accounts from the admin (People → a person → Sign-in accounts).
 *
 * A person can end up split: a creator profile from the old form that no
 * sign-in owns, a phone sign-in and a Google sign-in. The app's own merge
 * (accountMerge.js) needs them to sign in to both; these let the team fix it
 * for them.
 *
 * Served by api/creator-join.js (creatorApp's router), staff only:
 *
 *   ?action=admin-accounts         POST { email?, phone?, ids? }       every sign-in account and creator profile for this person
 *   ?action=admin-account-merge    POST { keepUid, mergeUid, confirm? } fold one account into another (preview without confirm)
 *   ?action=admin-creator-link     POST { creatorId, uid }             give a creator profile no sign-in owns to an account
 *   ?action=admin-account-email    POST { uid, email }                 put an email on a phone account's profile
 *
 * The admin merge only folds in an account whose only sign-in is a phone
 * number: the server can move a phone sign-in, but not a Google or password
 * one, so the account that has those is always the one kept.
 */
import { nowIso } from './db.js';
import {
    MergeError, toE164, isEmail, authUserOr, userDoc, isStaff, ownCreatorDocs, describeAccount,
    checkMergeable, moveCreator,
} from './accountMerge.js';

const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const lower = (v) => str(v, 200).toLowerCase();
const blank = (v) => v === undefined || v === null || v === '';

/* Ways a phone number was typed into old forms ("+91 9334676596", "9334676596"…). */
export const phoneVariants = (e164) => {
    const d = String(e164 || '').replace(/\D/g, '');
    if (d.length < 10) return [];
    const local = d.slice(-10);
    const cc = d.slice(0, d.length - 10) || '91';
    const spaced = `${local.slice(0, 5)} ${local.slice(5)}`;
    return [...new Set([`+${cc}${local}`, `+${cc} ${local}`, `+${cc} ${spaced}`, local, spaced, `${cc}${local}`])];
};

const methodsOf = (authUser) => {
    const ids = new Set((authUser?.providerData || []).map(p => p.providerId));
    if (authUser?.phoneNumber) ids.add('phone');
    return [...ids];
};
const METHOD_LABEL = { 'google.com': 'Google', password: 'email and password', 'apple.com': 'Apple', phone: 'phone' };

/* ── admin-accounts ───────────────────────────────────────────────────── */

export const lookupPerson = async ({ db, adminAuth, email, phone, ids = [] }) => {
    const emails = [lower(email)].filter(isEmail);
    const phones = [toE164(phone)].filter(p => p.replace(/\D/g, '').length >= 10);
    const uids = new Set();
    const creators = new Map(); // path → snapshot

    for (const id of ids.map(i => str(i, 128)).filter(Boolean)) {
        if (await authUserOr(adminAuth, a => a.getUser(id))) uids.add(id);
        const c = await db.collection('creators').doc(id).get();
        if (c.exists) creators.set(c.ref.path, c);
    }
    for (const e of emails) {
        uids.add((await authUserOr(adminAuth, a => a.getUserByEmail(e)))?.uid);
        (await db.collection('users').where('email', '==', e).limit(5).get()).docs.forEach(d => uids.add(d.id));
        (await db.collection('creators').where('email', '==', e).limit(5).get()).docs.forEach(d => creators.set(d.ref.path, d));
    }
    for (const p of phones) {
        uids.add((await authUserOr(adminAuth, a => a.getUserByPhoneNumber(p)))?.uid);
        for (const field of ['phone', 'phoneNumber']) {
            (await db.collection('users').where(field, '==', p).limit(5).get()).docs.forEach(d => uids.add(d.id));
        }
        for (const v of phoneVariants(p)) {
            for (const field of ['phone', 'whatsapp']) {
                (await db.collection('creators').where(field, '==', v).limit(5).get()).docs.forEach(d => creators.set(d.ref.path, d));
            }
        }
    }
    uids.delete(undefined);

    const accounts = [];
    const owned = new Set();
    for (const uid of uids) {
        const [authUser, u] = await Promise.all([authUserOr(adminAuth, a => a.getUser(uid)), userDoc(db, uid)]);
        // A profile nothing signs in to (deleted, or already merged) isn't an account.
        if (!authUser || u.mergedInto) continue;
        const own = await ownCreatorDocs(db, uid);
        own.forEach(d => owned.add(d.ref.path));
        accounts.push({
            uid,
            name: str(u.name || u.displayName || authUser.displayName, 120),
            signInEmail: authUser.email || null,
            profileEmail: u.email || null,
            phone: authUser.phoneNumber || toE164(u.phone || u.phoneNumber) || null,
            methods: methodsOf(authUser),
            createdAt: authUser.metadata?.creationTime || u.createdAt || null,
            lastSignIn: authUser.metadata?.lastRefreshTime || authUser.metadata?.lastSignInTime || null,
            isBlocked: Boolean(u.isBlocked || authUser.disabled),
            staff: await isStaff(db, u, authUser),
            creatorProfileId: own[0]?.id || null,
            holds: await describeAccount(db, uid),
        });
    }
    accounts.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

    // Creator profiles from the old form that no sign-in owns.
    const unlinkedCreators = [];
    for (const [path, d] of creators) {
        if (owned.has(path)) continue;
        const data = d.data();
        const ownerUid = data.uid && data.uid !== d.id ? data.uid : null;
        if (ownerUid && await authUserOr(adminAuth, a => a.getUser(ownerUid))) continue;
        if (await authUserOr(adminAuth, a => a.getUser(d.id))) continue;
        unlinkedCreators.push({
            id: d.id,
            name: str(data.name || data.displayName, 120),
            email: data.email || null,
            phone: data.phone || null,
            instagram: data.instagram || data.instagramHandle || null,
            status: data.profileStatus || null,
            createdAt: data.createdAt || null,
        });
    }
    return { accounts, unlinkedCreators };
};

/* ── admin-account-merge ──────────────────────────────────────────────── */

export const checkAdminMerge = async ({ db, adminAuth, keepUid, mergeUid }) => {
    if (!keepUid || !mergeUid || keepUid === mergeUid) throw new MergeError('Pick two different accounts.', 400, 'same_account');
    const [keepAuth, mergeAuth] = await Promise.all([
        authUserOr(adminAuth, a => a.getUser(keepUid)), authUserOr(adminAuth, a => a.getUser(mergeUid)),
    ]);
    if (!keepAuth || !mergeAuth) throw new MergeError('One of these accounts no longer exists. Refresh and try again.', 404, 'not_found');
    const other = methodsOf(mergeAuth).filter(m => m !== 'phone');
    if (other.length) {
        throw new MergeError(`That account signs in with ${METHOD_LABEL[other[0]] || other[0]}, which can't be moved. Keep that one and merge the other into it.`, 409, 'keep_other');
    }
    if (mergeAuth.phoneNumber && keepAuth.phoneNumber && keepAuth.phoneNumber !== mergeAuth.phoneNumber) {
        throw new MergeError('Both accounts have their own phone sign-in, so one number would stop working. Ask them to merge from the app.', 409, 'two_phones');
    }
    const checked = await checkMergeable({ db, adminAuth, toUid: keepUid, fromUid: mergeUid });
    return { ...checked, keepAuth, mergeAuth };
};

/* ── admin-creator-link ───────────────────────────────────────────────── */

export const linkCreatorProfile = async ({ db, adminAuth, creatorId, uid, tokenRef, ownerRef }) => {
    if (!creatorId || !uid) throw new MergeError('Pick a creator profile and an account.');
    const snap = await db.collection('creators').doc(creatorId).get();
    if (!snap.exists) throw new MergeError('That creator profile is gone. Refresh and try again.', 404, 'not_found');
    if (creatorId === uid) return { linked: false };
    const data = snap.data();
    const ownerUid = data.uid && data.uid !== creatorId ? data.uid : null;
    if (ownerUid === uid) return { linked: false };
    if ((ownerUid && await authUserOr(adminAuth, a => a.getUser(ownerUid))) || await authUserOr(adminAuth, a => a.getUser(creatorId))) {
        throw new MergeError('That creator profile belongs to another account. Merge the two accounts instead.', 409, 'owned');
    }
    if (!(await authUserOr(adminAuth, a => a.getUser(uid)))) throw new MergeError('That account no longer exists. Refresh and try again.', 404, 'not_found');
    const u = await userDoc(db, uid);
    if (u.mergedInto) throw new MergeError('That account was merged into another one. Refresh and try again.', 409, 'already_merged');
    if ((await ownCreatorDocs(db, uid)).length) {
        throw new MergeError('This account already has a creator profile. Delete one of the two first.', 409, 'two_creators');
    }

    await moveCreator({
        db, fromUid: data.uid || creatorId, toUid: uid, fromCreators: [snap],
        fromUser: { creatorStatus: data.profileStatus || null }, tokenRef, ownerRef,
    });
    // What they typed into the form fills the account's blanks.
    const patch = {};
    if (blank(u.email) && isEmail(lower(data.email))) patch.email = lower(data.email);
    if (blank(u.name) && data.name) { patch.name = str(data.name, 120); if (blank(u.displayName)) patch.displayName = patch.name; }
    if (blank(u.city) && data.city) patch.city = str(data.city, 80);
    await db.collection('users').doc(uid).set({ ...patch, updatedAt: nowIso() }, { merge: true });
    return { linked: true, filled: Object.keys(patch) };
};

/* ── admin-account-email ──────────────────────────────────────────────── */

/* The profile email only (updates and tickets go there); a sign-in email is never changed. */
export const setProfileEmail = async ({ db, adminAuth, uid, email }) => {
    const clean = lower(email);
    if (!isEmail(clean)) throw new MergeError('Enter a valid email address.', 400, 'invalid_email');
    const authUser = await authUserOr(adminAuth, a => a.getUser(uid));
    if (!authUser) throw new MergeError('That account no longer exists. Refresh and try again.', 404, 'not_found');
    if (authUser.email && lower(authUser.email) !== clean) {
        throw new MergeError('This account signs in with a different email, so its email can’t be changed here.', 409, 'sign_in_email');
    }
    const byAuth = await authUserOr(adminAuth, a => a.getUserByEmail(clean));
    const byDoc = (await db.collection('users').where('email', '==', clean).limit(5).get()).docs.find(d => d.id !== uid && !d.data().mergedInto);
    const otherUid = (byAuth && byAuth.uid !== uid && byAuth.uid) || byDoc?.id;
    if (otherUid) throw Object.assign(new MergeError('That email is on another account. Merge the two accounts instead.', 409, 'email_taken'), { otherUid });

    await db.collection('users').doc(uid).set({ email: clean, updatedAt: nowIso() }, { merge: true });
    const own = await ownCreatorDocs(db, uid);
    for (const d of own) if (blank(d.data().email)) await d.ref.set({ email: clean, updatedAt: nowIso() }, { merge: true });
    return { email: clean };
};
