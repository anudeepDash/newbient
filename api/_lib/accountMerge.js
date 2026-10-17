/**
 * One person, one account. When a phone number or email is on two Newbi
 * accounts (say a Google sign-in and an older phone sign-in), the person can
 * merge the other account into the one they're signed in to: everything it
 * holds moves over, then its sign-in is deleted, so that number or email only
 * ever opens one account again.
 *
 * Served by api/creator-join.js (creatorApp's router):
 *
 *   ?action=account-matches  POST { email? }   other accounts sharing your phone or email (masked hints only)
 *   ?action=account-merge    POST { proofToken, confirm? }
 *       Without confirm: what the other account holds and whether it can merge.
 *       With confirm: the merge.
 *
 * Proof: the app signs in to the other account in a throwaway, in-memory
 * session (phone code, Google or password) and sends that session's fresh ID
 * token. Nothing on a profile (a phone or email typed into it) is ever taken
 * as proof: only a sign-in from the last 10 minutes.
 *
 * What moves (the other account is "from", the signed-in one is "to"):
 *   users           blanks on "to" are filled from "from" (never role or blocks); "from" becomes { mergedInto }
 *   creators        the creator profile, its Instagram link, campaign submissions and references
 *   passes, pass_keys, guestlist entries, ticket_orders, giveaway_entries,
 *   gig_applications, form_responses, notifications, outreach applications,
 *   finance_payees, artists, client_requests
 * Docs keyed by uid ({id}_{uid}) are re-keyed; when both accounts have one for
 * the same thing, the signed-in account's stays and the other is kept beside it
 * (re-pointed, marked mergedFrom), so nothing is lost.
 *
 * It refuses when the other account is staff (role or admins list), either
 * account is blocked, or both have a creator profile (that's merged by hand).
 * Every step looks the "from" uid up afresh, so a merge that stops halfway can
 * simply be run again.
 */
import { nowIso, FieldValue } from './db.js';

const PROOF_MAX_AGE_S = 10 * 60;

export class MergeError extends Error {
    constructor(message, status = 400, code = 'merge_failed') { super(message); this.status = status; this.code = code; }
}

const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const lower = (v) => str(v, 200).toLowerCase();
const toE164 = (phone) => {
    const raw = String(phone || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.startsWith('+')) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
};
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export const maskPhone = (e164) => {
    const d = String(e164 || '').replace(/\D/g, '');
    if (d.length < 6) return '';
    const cc = d.length > 10 ? `+${d.slice(0, d.length - 10)} ` : '';
    return `${cc}••••• •${d.slice(-3)}`;
};
export const maskEmail = (email) => {
    const [name, domain] = String(email || '').split('@');
    if (!name || !domain) return '';
    return `${name[0]}${'•'.repeat(Math.min(Math.max(name.length - 1, 2), 6))}@${domain}`;
};
const firstName = (u) => str(u?.name || u?.displayName, 120).split(/\s+/)[0] || '';

const authUserOr = async (adminAuth, fn) => {
    try { return await fn(adminAuth); } catch (e) {
        if (String(e?.code || '').includes('user-not-found')) return null;
        throw e;
    }
};

const userDoc = async (db, uid) => {
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists ? snap.data() : {};
};

const signInMethods = (authUser) => {
    const ids = new Set((authUser?.providerData || []).map(p => p.providerId));
    if (authUser?.phoneNumber) ids.add('phone');
    return {
        phone: ids.has('phone') ? maskPhone(authUser.phoneNumber) : null,
        google: ids.has('google.com') ? maskEmail(authUser.email || authUser.providerData.find(p => p.providerId === 'google.com')?.email) : null,
        password: ids.has('password') ? maskEmail(authUser.email) : null,
    };
};

/* ── account-matches ──────────────────────────────────────────────────── */

/*
 * Other accounts with the caller's phone or email, from Auth (the number or
 * email they sign in with) and from profiles (one typed in). Hints are masked;
 * merging still needs a sign-in to that account.
 */
export const findMatches = async ({ db, adminAuth, token, email: typedEmail }) => {
    const me = await userDoc(db, token.uid);
    const phones = [...new Set([token.phone_number, me.phoneVerified || me.isPhoneVerified ? (me.phone || me.phoneNumber) : null]
        .map(toE164).filter(p => p.replace(/\D/g, '').length >= 10))];
    const emails = [...new Set([token.email, me.email, typedEmail].map(lower).filter(isEmail))];

    const found = new Map(); // uid → Set of 'phone' | 'email'
    const add = (uid, by) => {
        if (!uid || uid === token.uid) return;
        if (!found.has(uid)) found.set(uid, new Set());
        found.get(uid).add(by);
    };
    for (const phone of phones) {
        add((await authUserOr(adminAuth, a => a.getUserByPhoneNumber(phone)))?.uid, 'phone');
        for (const field of ['phone', 'phoneNumber']) {
            const q = await db.collection('users').where(field, '==', phone).limit(5).get();
            q.docs.forEach(d => add(d.id, 'phone'));
        }
    }
    for (const email of emails) {
        add((await authUserOr(adminAuth, a => a.getUserByEmail(email)))?.uid, 'email');
        const q = await db.collection('users').where('email', '==', email).limit(5).get();
        q.docs.forEach(d => add(d.id, 'email'));
    }

    const matches = [];
    for (const [uid, by] of found) {
        const [authUser, u] = await Promise.all([authUserOr(adminAuth, a => a.getUser(uid)), userDoc(db, uid)]);
        // Nothing signs in to it (deleted, or already merged): nothing to merge.
        if (!authUser || u.mergedInto) continue;
        matches.push({
            uid,
            name: firstName(u) || firstName({ name: authUser.displayName }),
            matchedBy: [...by],
            methods: signInMethods(authUser),
            // The app already knows this number (it's the caller's own), so it can send the code straight away.
            phoneIsYours: Boolean(authUser.phoneNumber && phones.includes(authUser.phoneNumber)),
        });
    }
    return { matches, phone: phones[0] || null };
};

/* ── proof ────────────────────────────────────────────────────────────── */

export const readProof = async ({ token, proofToken, verifyProof }) => {
    if (!proofToken) throw new MergeError('Sign in to your other account first.');
    let proof;
    try { proof = await verifyProof(proofToken); } catch {
        throw new MergeError('That sign-in expired. Try again.', 400, 'proof_expired');
    }
    const fresh = Number(proof?.auth_time) && (Date.now() / 1000 - Number(proof.auth_time)) <= PROOF_MAX_AGE_S;
    if (!proof?.uid || !fresh) throw new MergeError('That sign-in expired. Try again.', 400, 'proof_expired');
    if (proof.uid === token.uid) throw new MergeError('That’s the account you’re signed in to. Sign in to the other one.', 400, 'same_account');
    return proof;
};

/* ── what the other account holds ─────────────────────────────────────── */

const ownCreatorDocs = async (db, uid) => {
    const direct = await db.collection('creators').doc(uid).get();
    const legacy = await db.collection('creators').where('uid', '==', uid).get();
    return [direct, ...legacy.docs].filter((d, i, all) => d.exists && all.findIndex(o => o.ref.path === d.ref.path) === i);
};

const count = async (q) => (await q.get()).size;

export const describeAccount = async (db, uid) => {
    const [passes, orders, entries, creators] = await Promise.all([
        count(db.collection('passes').where('holderUid', '==', uid)),
        count(db.collection('ticket_orders').where('userId', '==', uid)),
        count(db.collection('giveaway_entries').where('userId', '==', uid)),
        ownCreatorDocs(db, uid),
    ]);
    return { passes, ticketOrders: orders, giveawayEntries: entries, creatorProfile: creators.length > 0 };
};

const isStaff = async (db, u, authUser) => {
    if (u.role) return true;
    const email = lower(authUser?.email || u.email);
    if (!email) return false;
    return !(await db.collection('admins').where('email', '==', email).limit(1).get()).empty;
};

export const checkMergeable = async ({ db, adminAuth, toUid, fromUid }) => {
    const [to, from, fromAuth, toCreators, fromCreators] = await Promise.all([
        userDoc(db, toUid), userDoc(db, fromUid), authUserOr(adminAuth, a => a.getUser(fromUid)),
        ownCreatorDocs(db, toUid), ownCreatorDocs(db, fromUid),
    ]);
    if (from.mergedInto) throw new MergeError('That account has already been merged.', 409, 'already_merged');
    if (to.isBlocked || from.isBlocked) throw new MergeError('These accounts can’t be merged from the app. Contact hello@newbi.live.', 403, 'blocked');
    if (await isStaff(db, from, fromAuth)) throw new MergeError('That’s a team account, so it can’t be merged here. Contact hello@newbi.live.', 403, 'staff');
    if (toCreators.length && fromCreators.length) {
        throw new MergeError('Both accounts have a creator profile. Write to creators@newbi.live and we’ll merge them for you.', 409, 'two_creators');
    }
    return { to, from, fromAuth, fromCreators };
};

/* ── the merge ────────────────────────────────────────────────────────── */

const PROFILE_FILL = ['name', 'displayName', 'photoURL', 'city', 'collegeId', 'college', 'collegeName', 'isStudent', 'occupation',
    'gender', 'instagramHandle', 'hasJoinedTribe', 'joinedAt', 'joinedCommunityAt', 'hasJoinedWhatsapp', 'whatsappJoinedAt'];
const PHONE_FIELDS = ['phone', 'phoneVerified', 'phoneNumber', 'isPhoneVerified', 'phoneVerifiedAt'];
const blank = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);

/* The signed-in account's profile wins; its blanks are filled from the other one. Never role, blocks or sessions. */
export const mergedProfile = (to, from, fromAuth) => {
    const patch = {};
    for (const k of PROFILE_FILL) if (blank(to[k]) && !blank(from[k])) patch[k] = from[k];
    const toHasPhone = Boolean((to.phone || to.phoneNumber) && (to.phoneVerified || to.isPhoneVerified));
    const fromPhone = toE164(fromAuth?.phoneNumber || ((from.phoneVerified || from.isPhoneVerified) ? (from.phone || from.phoneNumber) : ''));
    if (!toHasPhone && fromPhone) {
        Object.assign(patch, { phone: fromPhone, phoneVerified: true, phoneNumber: fromPhone, isPhoneVerified: true, phoneVerifiedAt: from.phoneVerifiedAt || nowIso() });
    }
    const fromEmail = lower(fromAuth?.email || from.email);
    if (blank(to.email) && isEmail(fromEmail)) patch.email = fromEmail;
    const interests = [...new Set([...(to.interests || []), ...(from.interests || [])])];
    if (interests.length > (to.interests || []).length) patch.interests = interests;
    const tokens = [...new Set([...(to.fcmTokens || []), ...(from.fcmTokens || []), from.fcmToken].filter(Boolean))];
    if (tokens.length > (to.fcmTokens || []).length) patch.fcmTokens = tokens;
    if (from.capabilities?.member && !to.capabilities?.member) patch.capabilities = { ...(patch.capabilities || {}), member: true };
    if (from.createdAt && (!to.createdAt || String(from.createdAt) < String(to.createdAt))) patch.createdAt = from.createdAt;
    for (const k of ['onboarding', 'emailPrefs', 'channelPrefs']) {
        if (from[k] && typeof from[k] === 'object') patch[k] = { ...from[k], ...(to[k] || {}) };
    }
    return patch;
};

/* Re-points every doc in `col` whose `field` is `from`. */
const repoint = async (col, field, from, to, extra = {}) => {
    const q = await col.where(field, '==', from).get();
    for (const d of q.docs) await d.ref.set({ [field]: to, ...extra }, { merge: true });
    return q.size;
};

/*
 * Docs whose id ends in _{uid}: copy to the "to" id, unless the signed-in
 * account already has one (then the old doc stays, re-pointed and marked).
 */
const rekey = async (col, field, from, to, { idFor, extra = {} } = {}) => {
    const q = await col.where(field, '==', from).get();
    let moved = 0;
    for (const d of q.docs) {
        const target = idFor(d.id, d.data());
        if (target && target !== d.id) {
            const existing = await col.doc(target).get();
            if (!existing.exists) {
                await col.doc(target).set({ ...d.data(), [field]: to, ...extra, mergedFrom: from });
                await d.ref.delete();
                moved += 1;
                continue;
            }
        }
        await d.ref.set({ [field]: to, ...extra, mergedFrom: from }, { merge: true });
        moved += 1;
    }
    return moved;
};
const suffixId = (from, to) => (id) => (id.endsWith(`_${from}`) ? `${id.slice(0, -from.length)}${to}` : null);

/* The creator profile and everything that points at it (see scripts/migrate-creators-to-uid.mjs). */
const moveCreator = async ({ db, fromUid, toUid, fromCreators, fromUser, tokenRef, ownerRef }) => {
    if (!fromCreators.length) return false;
    const [main, ...rest] = fromCreators;
    const data = main.data();
    const legacyIds = [...new Set([...(data.legacyIds || []), ...fromCreators.map(d => d.id).filter(id => id !== toUid)])];
    // creatorId stays: referral links and pass keys carry it.
    await db.collection('creators').doc(toUid).set({ ...data, uid: toUid, legacyIds, mergedFrom: fromUid, updatedAt: nowIso() });
    for (const d of [main, ...rest]) if (d.id !== toUid) await d.ref.delete();

    await db.collection('users').doc(toUid).set({
        capabilities: { creator: true },
        ...(fromUser.creatorStatus ? { creatorStatus: fromUser.creatorStatus } : {}),
        ...(fromUser.instagram ? { instagram: fromUser.instagram } : {}),
    }, { merge: true });

    // Instagram: the token and the ownership move, or that Instagram stays locked to the old account.
    const tokenSnap = await tokenRef(fromUid, db).get().catch(() => null);
    if (tokenSnap?.exists) {
        await tokenRef(toUid, db).set(tokenSnap.data());
        await tokenRef(fromUid, db).delete();
    }
    const igIds = new Set([data.igUserId, fromUser.instagram?.igUserId].filter(Boolean).map(String));
    for (const ig of igIds) {
        const owner = await ownerRef(ig, db).get();
        if (owner.exists && owner.data()?.uid === fromUid) await ownerRef(ig, db).set({ uid: toUid }, { merge: true });
    }

    // References by uid or by any of the old creator doc ids.
    const oldIds = new Set([fromUid, ...fromCreators.map(d => d.id)]);
    const campaigns = await db.collection('campaigns').get();
    for (const c of campaigns.docs) {
        const sub = await c.ref.collection('submissions').doc(fromUid).get();
        if (sub.exists) {
            await c.ref.collection('submissions').doc(toUid).set({ ...sub.data(), uid: toUid, creatorDocId: toUid });
            await sub.ref.delete();
        }
        const tasks = c.data().tasks;
        if (!Array.isArray(tasks)) continue;
        let changed = false;
        const next = tasks.map((task) => {
            const out = { ...task };
            if (task.submissions && typeof task.submissions === 'object') {
                const subs = {};
                for (const [key, value] of Object.entries(task.submissions)) {
                    if (oldIds.has(key) && !task.submissions[toUid]) { subs[toUid] = value; changed = true; } else subs[key] = value;
                }
                out.submissions = subs;
            }
            for (const field of ['completedBy', 'verifiedBy']) {
                if (!Array.isArray(task[field])) continue;
                const ids = [...new Set(task[field].map(id => (oldIds.has(id) ? toUid : id)))];
                if (ids.length !== task[field].length || ids.some((id, i) => id !== task[field][i])) changed = true;
                out[field] = ids;
            }
            return out;
        });
        if (changed) await c.ref.set({ tasks: next }, { merge: true });
    }
    for (const oldId of oldIds) await repoint(db.collection('creators'), 'referredBy', oldId, toUid);
    return true;
};

/* Outreach applications, their keys and the contact book (campaign-outreach). */
const moveOutreach = async (db, fromUid, toUid) => {
    const campaigns = await db.collection('campaigns').get();
    let moved = 0;
    for (const c of campaigns.docs) {
        moved += await repoint(c.ref.collection('applications'), 'uid', fromUid, toUid);
        const key = await c.ref.collection('application_keys').doc(`u:${fromUid}`).get();
        if (key.exists) {
            const target = c.ref.collection('application_keys').doc(`u:${toUid}`);
            if (!(await target.get()).exists) await target.set(key.data());
            await key.ref.delete();
        }
    }
    const member = await db.collection('outreach_members').doc(fromUid).get();
    if (member.exists) {
        const mine = await db.collection('outreach_members').doc(toUid).get();
        const prev = mine.exists ? mine.data() : {};
        await db.collection('outreach_members').doc(toUid).set({ ...member.data(), ...prev, apps: { ...(member.data().apps || {}), ...(prev.apps || {}) } });
        await member.ref.delete();
    }
    const contacts = await db.collection('creator_contacts').where('uids', 'array-contains', fromUid).get();
    for (const d of contacts.docs) {
        await d.ref.set({ uids: [...new Set((d.data().uids || []).map(u => (u === fromUid ? toUid : u)))] }, { merge: true });
    }
    return moved;
};

/* Guestlist entries live under each guestlist; there are few guestlists, so each is checked. */
const moveGuestlistEntries = async (db, fromUid, toUid) => {
    const lists = await db.collection('guestlists').get();
    let moved = 0;
    for (const g of lists.docs) moved += await repoint(g.ref.collection('entries'), 'userId', fromUid, toUid);
    return moved;
};

/* pass_keys/{source}_{sourceId}_{uid}: one pass per person per thing. If both had one, both passes stay; the key keeps the signed-in account's. */
const movePassKeys = async (db, fromUid, toUid) => {
    const keys = await db.collection('pass_keys').where('uid', '==', fromUid).get();
    for (const d of keys.docs) {
        const target = suffixId(fromUid, toUid)(d.id);
        if (target && !(await db.collection('pass_keys').doc(target).get()).exists) {
            await db.collection('pass_keys').doc(target).set({ ...d.data(), uid: toUid });
        }
        await d.ref.delete();
    }
    return keys.size;
};

export const mergeAccounts = async ({ db, adminAuth, toUid, fromUid, tokenRef, ownerRef }) => {
    const { to, from, fromAuth, fromCreators } = await checkMergeable({ db, adminAuth, toUid, fromUid });
    const toAuth = await authUserOr(adminAuth, a => a.getUser(toUid));
    const now = nowIso();

    // 1. The profile, and a marker so a stopped merge can be picked up again.
    await db.collection('users').doc(toUid).set({ ...mergedProfile(to, from, fromAuth), mergingFrom: fromUid, updatedAt: now }, { merge: true });

    // 2. Everything the other account holds.
    const moved = {};
    moved.creator = await moveCreator({ db, fromUid, toUid, fromCreators, fromUser: from, tokenRef, ownerRef });
    moved.passes = await repoint(db.collection('passes'), 'holderUid', fromUid, toUid);
    moved.passKeys = await movePassKeys(db, fromUid, toUid);
    moved.guestlistEntries = await moveGuestlistEntries(db, fromUid, toUid);
    moved.ticketOrders = await repoint(db.collection('ticket_orders'), 'userId', fromUid, toUid);
    moved.giveawayEntries = await rekey(db.collection('giveaway_entries'), 'userId', fromUid, toUid, { idFor: suffixId(fromUid, toUid) });
    moved.gigApplications = await rekey(db.collection('gig_applications'), 'userId', fromUid, toUid, { idFor: suffixId(fromUid, toUid) });
    moved.formResponses = await rekey(db.collection('form_responses'), 'userId', fromUid, toUid, { idFor: suffixId(fromUid, toUid) });
    moved.notifications = await repoint(db.collection('notifications'), 'userId', fromUid, toUid);
    moved.outreach = await moveOutreach(db, fromUid, toUid);
    moved.payees = await repoint(db.collection('finance_payees'), 'submittedByUid', fromUid, toUid);
    moved.requests = await repoint(db.collection('client_requests'), 'uid', fromUid, toUid);
    const artist = await db.collection('artists').doc(fromUid).get();
    if (artist.exists) {
        if (!(await db.collection('artists').doc(toUid).get()).exists) await db.collection('artists').doc(toUid).set({ ...artist.data(), uid: toUid });
        await artist.ref.delete();
    }

    // 3. The other profile becomes a pointer, and its sign-in goes, so that number or email opens this account from now on.
    await db.collection('users').doc(fromUid).set({ mergedInto: toUid, mergedAt: now });
    if (fromAuth) await adminAuth.deleteUser(fromUid);
    let phoneLinked = false;
    if (fromAuth?.phoneNumber && toAuth && !toAuth.phoneNumber) {
        try {
            await adminAuth.updateUser(toUid, { phoneNumber: fromAuth.phoneNumber });
            phoneLinked = true;
        } catch (e) {
            console.warn('[account-merge] could not move the phone sign-in:', e?.code || e);
        }
    }

    const merged = [...(to.mergedAccounts || []), { uid: fromUid, at: now }];
    await db.collection('users').doc(toUid).set({ mergingFrom: FieldValue.delete(), mergedAccounts: merged }, { merge: true });
    return { moved, phoneLinked, providers: (fromAuth?.providerData || []).map(p => p.providerId) };
};
