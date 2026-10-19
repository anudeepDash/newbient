/**
 * The app's creator actions (app.newbi.live/creator…). Served by
 * api/creator-join.js, because the project is at Vercel's function limit;
 * vercel.json rewrites the public paths onto it:
 *
 *   /api/instagram/connect      → ?action=ig-connect     (POST, signed in) → { url }
 *   /api/instagram/callback     → ?action=ig-callback    (GET, Instagram redirects here)
 *   /api/cron/refresh-instagram → ?action=instagram-cron (GET, Vercel Cron, Bearer CRON_SECRET)
 *
 *   ?action=ig-lookup        POST { handle }  Business Discovery check while typing
 *   ?action=creator-apply    POST {...}       the application (status decided here)
 *   ?action=campaign-apply   POST { campaignId }
 *   ?action=campaign-submit  POST { campaignId, taskId, contentLink, proofUrl, note }
 *   ?action=creator-self-delete POST {}       the signed-in creator deletes their own creator profile
 *   ?action=creator-sync-profile POST {}      copies name, city and phone from users/{uid} onto the creator profile
 *   ?action=profile-phone    POST { phone }   saves the account's phone; verified only if it's the number on the sign-in account
 *   ?action=account-matches  POST { email? }  other accounts with your phone or email (api/_lib/accountMerge.js)
 *   ?action=account-merge    POST { proofToken, confirm? } merges one of them into this account
 *
 * Instagram verification is behind site_settings/general.instagramMetaVerification.
 * On: Instagram Login (OAuth) proves the account. Off: followers are read from
 * the public profile. Either way a count read automatically is approved when
 * it's over the minimum; a count the creator typed in goes to admin review.
 */
import { getDb, nowIso, FieldValue } from './db.js';
import { hasAdminCredentials, auth as defaultAdminAuth, verifyIdTokenSafe } from './auth.js';
import { makeSignedToken, readSignedToken, isOwnHost } from './linkSign.js';
import { sendTransactional } from './mail/send.js';
import { notify } from './notify.js';
import {
    cleanHandle, readCreatorSettings, lookupInstagram, isOauthConfigured, oauthAuthorizeUrl, exchangeCode,
    fetchMe, refreshToken, tokenRef, ownerRef, otherOwnerOf, logIntegration, PROFESSIONAL_ACCOUNT_TYPES,
} from './instagram.js';
import { NICHE_IDS, COLLAB_IDS, BIO_MAX, isCollegeNiche } from '../../src/lib/creator/options.js';
import { isCampaignCityMatch } from '../../src/lib/constants.js';
import { findMatches, readProof, checkMergeable, describeAccount, mergeAccounts, MergeError } from './accountMerge.js';
import { isStaffCaller, staffRoleOf } from './mailing.js';
import { isTesterRole } from '../../src/constants/roles.js';
import { FieldPath } from 'firebase-admin/firestore';

/* The app's own origin (links in emails, the OAuth fallback). PUBLIC_APP_URL overrides it on previews. */
const APP_URL = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');

export const CREATOR_APP_ACTIONS = new Set([
    'ig-lookup', 'ig-connect', 'ig-callback', 'instagram-cron', 'creator-apply', 'campaign-apply', 'campaign-submit',
    'creator-self-delete', 'creator-sync-profile', 'account-matches', 'account-merge', 'profile-phone',
    'my-submission', 'submissions-list', 'submissions-review', 'submissions-delete',
]);
/* Actions that don't take a Firebase ID token (they carry their own proof). */
export const CREATOR_APP_PUBLIC = new Set(['ig-callback', 'instagram-cron']);

const send = (res, status, body) => res.status(status).json(body);
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const toE164 = (phone) => {
    const raw = String(phone || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.startsWith('+')) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return `+${digits}`;
};
const isHttpUrl = (v) => {
    try { return ['http:', 'https:'].includes(new URL(v).protocol); } catch { return false; }
};

/* ── Who's asking ─────────────────────────────────────────────────────── */

/* Identity for the application comes from users/{uid} and the ID token, never the form. */
const loadIdentity = async (db, token) => {
    const snap = await db.collection('users').doc(token.uid).get().catch(() => null);
    const u = snap?.exists ? snap.data() : {};
    const phone = toE164(u.phone || u.phoneNumber || token.phone_number || '');
    const tokenPhone = toE164(token.phone_number || '');
    return {
        user: u,
        name: str(u.name || u.displayName || token.name, 120),
        email: str(u.email || token.email, 200).toLowerCase(),
        phone,
        phoneVerified: Boolean(phone && (u.phoneVerified || u.isPhoneVerified || (tokenPhone && tokenPhone === phone))),
        city: str(u.city, 80),
        college: str(u.college || u.collegeName, 160),
        collegeId: u.collegeId || null,
        photoURL: u.photoURL || token.picture || '',
    };
};

/* creators/{uid}, or a not-yet-migrated profile that carries this uid. */
const findOwnCreator = async (db, uid) => {
    const direct = await db.collection('creators').doc(uid).get();
    if (direct.exists) return direct;
    const legacy = await db.collection('creators').where('uid', '==', uid).limit(1).get();
    return legacy.empty ? null : legacy.docs[0];
};

/* ── Step A: ig-lookup ─────────────────────────────────────────────────── */

/* Signed-out Instagram checks: 12 per minute per IP on a warm instance. */
const lookupHits = new Map();
const lookupLimited = (req) => {
    const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const rec = lookupHits.get(ip) || { count: 0, reset: now + 60_000 };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + 60_000; }
    rec.count += 1;
    if (lookupHits.size > 5000) lookupHits.clear();
    lookupHits.set(ip, rec);
    return rec.count > 12;
};

/* The account this person connected through Instagram Login, as a lookup profile. */
const connectedProfile = (t) => ({
    igUserId: t.igUserId,
    username: t.username,
    name: t.name || '',
    followers: Number(t.followers) || 0,
    profilePic: t.profilePic || '',
    accountType: t.accountType || '',
    source: 'oauth',
});

/*
 * With no handle: just the switches and the signed-in person's connected
 * account ({ ok:false, reason:'idle', account }), so the apply page can start
 * with "Connect with Instagram". With the connected handle: that account
 * straight from the login, without needing Business Discovery.
 */
export const handleLookup = async (req, res, { db, token }) => {
    const settings = await readCreatorSettings(db);
    const oauthReady = settings.metaVerification && isOauthConfigured();
    const base = { success: true, enabled: true, metaVerification: settings.metaVerification, oauthReady, minFollowers: settings.minFollowers };
    const meetsMinimum = (followers) => !settings.requireVerification || settings.minFollowers <= 0 || followers >= settings.minFollowers;

    const tokenSnap = token && settings.metaVerification ? await tokenRef(token.uid, db).get().catch(() => null) : null;
    const t = tokenSnap?.exists ? tokenSnap.data() : null;
    const account = t?.igUserId && !t.expired ? connectedProfile(t) : null;
    const handle = cleanHandle(req.body?.handle || req.query?.handle);

    if (!handle) return send(res, 200, { ...base, ok: false, reason: 'idle', account });
    if (account && account.username === handle) {
        return send(res, 200, { ...base, ok: true, profile: account, account, connected: true, alreadyRegistered: false, meetsMinimum: meetsMinimum(account.followers) });
    }

    // Meta when it's switched on; otherwise (or if Meta is down) the public-profile estimate.
    const result = await lookupInstagram(handle, { db, useMeta: settings.metaVerification });
    if (!result.ok) return send(res, 200, { ...base, ok: false, reason: result.reason, message: result.message, account });

    const { profile } = result;
    const taken = profile.igUserId && token ? await otherOwnerOf(profile.igUserId, token.uid, db) : null;
    const connected = Boolean(account && account.igUserId === profile.igUserId);
    return send(res, 200, {
        ...base,
        ok: true,
        profile,
        account,
        connected,
        alreadyRegistered: Boolean(taken),
        meetsMinimum: meetsMinimum(profile.followers),
    });
};

/* ── Step B: ig-connect / ig-callback ─────────────────────────────────── */

/* Only our own sites (or local dev) may receive the OAuth result. */
const safeOrigin = (candidate) => {
    try {
        const o = new URL(candidate || '');
        const local = ['localhost', '127.0.0.1'].includes(o.hostname) || o.hostname.endsWith('.localhost');
        if ((o.protocol === 'https:' && isOwnHost(o.hostname)) || local) return o.origin;
    } catch { /* fall through */ }
    return APP_URL;
};
const safeReturnPath = (p) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.includes('\\') ? p.slice(0, 300) : '/creator/apply');

const handleConnect = async (req, res, { db, token }) => {
    const settings = await readCreatorSettings(db);
    if (!settings.metaVerification || !isOauthConfigured()) {
        return send(res, 409, { success: false, error: 'Connecting Instagram is not switched on yet.' });
    }
    const handle = cleanHandle(req.body?.handle);
    let expect = null;
    if (handle) {
        const lookup = await lookupInstagram(handle, { db });
        if (lookup.ok) expect = { id: lookup.profile.igUserId, username: lookup.profile.username };
    }
    const state = makeSignedToken({
        uid: token.uid,
        returnTo: safeReturnPath(req.body?.returnTo),
        origin: safeOrigin(req.headers?.origin || req.body?.origin),
        expect,
        n: Math.random().toString(36).slice(2, 10),
    }, 15 * 60);
    if (!state) return send(res, 500, { success: false, error: 'Link signing is not configured.' });
    return send(res, 200, { success: true, url: oauthAuthorizeUrl(state) });
};

const redirect = (res, url) => {
    res.statusCode = 302;
    res.setHeader('Location', url);
    res.setHeader('Cache-Control', 'no-store');
    return res.end();
};

const withParams = (origin, path, params) => {
    const url = new URL(path, origin);
    Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
    return url.toString();
};

/* Best effort: Instagram picture URLs expire, so keep a copy on Cloudinary. */
const persistPicture = async (url) => {
    if (!url) return '';
    try {
        const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dgtalrz4n';
        const preset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'maw1e4ud';
        const body = new URLSearchParams({ file: url, upload_preset: preset });
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body, signal: ctrl.signal }).finally(() => clearTimeout(timer));
        if (r.ok) return (await r.json()).secure_url || url;
    } catch { /* keep Instagram's URL */ }
    return url;
};

/* Writes a verified Instagram account onto the profile and (if there is one) the creator doc. */
const recordVerifiedInstagram = async (db, uid, me, via) => {
    const verifiedAt = nowIso();
    await db.collection('users').doc(uid).set({
        instagram: { handle: me.username, igUserId: me.igUserId, followers: me.followers, verifiedVia: via, verifiedAt },
        updatedAt: verifiedAt,
    }, { merge: true });
    const creatorSnap = await findOwnCreator(db, uid);
    if (!creatorSnap) return null;
    const patch = {
        instagram: me.username,
        igUserId: me.igUserId,
        instagramFollowers: String(me.followers),
        instagramVerified: true,
        instagramVerifiedVia: via,
        instagramVerifiedAt: verifiedAt,
        instagramProfessional: true,
        needsInstagramReconnect: false,
        updatedAt: verifiedAt,
    };
    if (me.profilePic) patch.instagramProfilePic = me.profilePic;
    await creatorSnap.ref.set(patch, { merge: true });
    return { ...creatorSnap.data(), ...patch, id: creatorSnap.id };
};

export const handleCallback = async (req, res, { db }) => {
    const q = req.query || {};
    const state = readSignedToken(q.state);
    const origin = state?.origin || APP_URL;
    const back = (params) => redirect(res, withParams(origin, state?.returnTo || '/creator/apply', params));

    if (!state?.uid) return back({ ig: 'error', reason: 'expired' });
    if (q.error) return back({ ig: 'error', reason: q.error_reason === 'user_denied' ? 'denied' : 'failed' });
    if (!q.code) return back({ ig: 'error', reason: 'failed' });

    const exchanged = await exchangeCode(q.code);
    if (!exchanged.ok) {
        await logIntegration({ op: 'oauth_exchange', uid: state.uid, error: exchanged.detail || exchanged.reason }, db);
        return back({ ig: 'error', reason: 'unavailable' });
    }
    const meRes = await fetchMe(exchanged.token);
    if (!meRes.ok) {
        await logIntegration({ op: 'oauth_me', uid: state.uid, error: meRes.detail || meRes.reason }, db);
        return back({ ig: 'error', reason: 'unavailable' });
    }
    const me = meRes.me;
    if (me.accountType && !PROFESSIONAL_ACCOUNT_TYPES.has(me.accountType)) return back({ ig: 'error', reason: 'personal' });

    // The connected account must be the one the creator looked up in step A.
    if (state.expect?.id && state.expect.id !== me.igUserId) {
        const sameName = state.expect.username && state.expect.username === me.username;
        await logIntegration({ op: 'oauth_id_mismatch', uid: state.uid, expected: state.expect, got: { id: me.igUserId, username: me.username }, accepted: Boolean(sameName) }, db);
        if (!sameName) return back({ ig: 'error', reason: 'mismatch', handle: me.username });
    }

    if (await otherOwnerOf(me.igUserId, state.uid, db)) return back({ ig: 'error', reason: 'taken', handle: me.username });

    try {
        await db.runTransaction(async (tx) => {
            const owner = await tx.get(ownerRef(me.igUserId, db));
            if (owner.exists && owner.data()?.uid && owner.data().uid !== state.uid) throw Object.assign(new Error('taken'), { code: 'taken' });
            tx.set(ownerRef(me.igUserId, db), { uid: state.uid, username: me.username, at: nowIso() }, { merge: true });
        });
    } catch (e) {
        if (e.code === 'taken') return back({ ig: 'error', reason: 'taken', handle: me.username });
        throw e;
    }

    const picture = await persistPicture(me.profilePic);
    const verified = { ...me, profilePic: picture };
    const now = nowIso();
    await tokenRef(state.uid, db).set({
        token: exchanged.token,
        expiresAt: exchanged.expiresAt,
        longLived: exchanged.longLived !== false,
        igUserId: me.igUserId,
        username: me.username,
        name: me.name,
        followers: me.followers,
        accountType: me.accountType,
        profilePic: picture,
        verifiedAt: now,
        refreshedAt: now,
    });
    await db.collection('instagram_profiles').doc(me.igUserId).set({ ...verified, source: 'oauth', fetchedAt: now }, { merge: true });
    await db.collection('instagram_profiles').doc(`h_${me.username}`).set({ ...verified, source: 'oauth', fetchedAt: now }, { merge: true });

    const creator = await recordVerifiedInstagram(db, state.uid, verified, 'oauth');
    // A creator waiting on Instagram or on review is verified automatically now (if over the minimum).
    let status = creator?.profileStatus || '';
    if (AWAITING_VERIFICATION.has(status)) {
        status = await settlePendingCreator(db, creator, { followers: me.followers, ownershipVerified: true });
    }
    return back({ ig: 'connected', handle: me.username, approved: status === 'approved' ? '1' : '' });
};

/* ── Status rules ─────────────────────────────────────────────────────── */

/*
 * approved            followers read automatically and over the minimum. Either Instagram
 *                     Login proved the account (OAuth), or the automatic check read it
 *                     (Business Discovery, the public profile, RapidAPI: `autoChecked`).
 *                     At apply time, or later the moment a pending creator connects Instagram.
 * pending             admin review: the creator typed their follower count, or it's under the minimum
 * pending_verification nothing could read the profile yet; the cron retries
 */
/* Statuses that an automatic check can move to approved. Rejected and suspended stay as they are. */
const AWAITING_VERIFICATION = new Set(['pending', 'pending_verification']);
/* Where an automatically read follower count came from (anything but the creator's own typing). */
const AUTO_SOURCES = new Set(['business_discovery', 'public', 'rapidapi']);

const decideStatus = ({ ownershipVerified, autoChecked = false, followers, settings }) => {
    if (!ownershipVerified && !autoChecked) return 'pending';
    if (settings.requireVerification && settings.minFollowers > 0 && followers < settings.minFollowers) return 'pending';
    return 'approved';
};

const settlePendingCreator = async (db, creator, { followers, ownershipVerified, autoChecked = false }) => {
    const settings = await readCreatorSettings(db);
    const status = decideStatus({ ownershipVerified, autoChecked, followers, settings });
    const uid = creator.uid || creator.id;
    const now = nowIso();
    await db.collection('creators').doc(creator.id).set({
        profileStatus: status,
        isVerified: status === 'approved',
        instagramFollowers: String(followers),
        instagramPending: FieldValue.delete(),
        verifiedAt: status === 'approved' ? now : null,
        verifiedBy: status === 'approved' ? 'meta_auto_verify' : null,
        updatedAt: now,
    }, { merge: true });
    await db.collection('users').doc(uid).set({ creatorStatus: status }, { merge: true });
    if (status === 'approved') {
        await notify('creator-approved', uid, { name: creator.name || creator.displayName, dashboardUrl: `${APP_URL}/creator` }, { idempotencyKey: `creator-approved_${uid}` }).catch(e => console.warn('[creator] approve notify:', e.message));
    }
    return status;
};

/* ── creator-apply ────────────────────────────────────────────────────── */

const PROFILE_FIELDS_MISSING = (id, needsCollege) => {
    const missing = [];
    if (!id.name) missing.push('name');
    if (!id.email) missing.push('email');
    if (!id.phoneVerified) missing.push('phoneVerified');
    if (!id.city) missing.push('city');
    if (needsCollege) missing.push('college');
    return missing;
};

/* Up to three valid niche ids, in the order picked. */
const MAX_NICHES = 3;
const cleanNiches = (value) => {
    const list = Array.isArray(value) ? value : (value ? [value] : []);
    return Array.from(new Set(list.map(v => str(v, 80)).filter(v => NICHE_IDS.has(v)))).slice(0, MAX_NICHES);
};
const has = (body, key) => Object.prototype.hasOwnProperty.call(body, key);
const socialHandle = (v) => str(v, 120).replace(/^https?:\/\/(www\.)?[^/]+\//i, '').replace(/^@+/, '').split(/[/?#\s]/)[0].slice(0, 60);

/*
 * The application, and later edits from the creator's profile.
 *
 * The form sends: handle, city, niches (1-3), collegeName for campus niches,
 * whatsappOptIn. The profile's "add later" fields (collaboration, commercials,
 * bio, cityPageFocus, linkedin, youtube, twitter) are saved only when sent.
 * Name, email and verified phone come from users/{uid}; a missing name or
 * photo is filled from Instagram.
 */
export const handleApply = async (req, res, { db, token }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const body = req.body || {};
    const uid = token.uid;

    const settings = await readCreatorSettings(db);
    const existingSnap = await findOwnCreator(db, uid);
    const existing = existingSnap?.exists ? existingSnap.data() : null;
    const isNew = !existing;
    if (existing?.profileStatus === 'rejected' || existing?.profileStatus === 'suspended') {
        return send(res, 403, { success: false, error: "Your creator profile can't be changed right now. Contact creators@newbi.live." });
    }
    if (isNew && !settings.allowSignups) {
        return send(res, 403, { success: false, code: 'paused', error: 'New creator applications are paused right now.' });
    }

    // ── What you make ──
    const sentNiches = has(body, 'niches') || has(body, 'niche');
    const niches = sentNiches ? cleanNiches(body.niches ?? body.niche) : null;
    if ((isNew || sentNiches) && !niches?.length) return send(res, 400, { success: false, field: 'niches', error: 'Pick at least one niche.' });
    const customNiche = niches?.includes('Others') ? str(body.customNiche, 60) : '';
    if (niches?.includes('Others') && !customNiche) return send(res, 400, { success: false, field: 'customNiche', error: 'Tell us your niche.' });
    const allNiches = niches || (Array.isArray(existing?.specializations) ? existing.specializations : [existing?.categories].filter(Boolean));
    const campusNiche = allNiches.some(isCollegeNiche);

    const id = await loadIdentity(db, token);
    const formCity = str(body.city, 80);
    if (formCity) id.city = formCity;
    const collegeName = campusNiche ? (str(body.collegeName, 160) || str(existing?.collegeName, 160) || id.college) : '';
    if (existing) {
        id.name = id.name || str(existing.name || existing.displayName, 120);
        id.email = id.email || str(existing.email, 200).toLowerCase();
        if (!id.phoneVerified && existing.isPhoneVerified) { id.phone = toE164(existing.phone); id.phoneVerified = Boolean(id.phone); }
        id.city = id.city || str(existing.city, 80);
    }

    // ── Instagram ──
    const handle = cleanHandle(body.handle) || cleanHandle(existing?.instagram);
    // Typed by the creator when the automatic check couldn't read their profile. Always reviewed.
    const manualFollowers = Math.min(1e9, Math.max(0, Math.floor(Number(body.manualFollowers) || 0)));
    const selfReported = (base) => ({ ...base, handle, followers: manualFollowers, via: 'self_reported', pending: false });
    // ownershipVerified: Instagram Login proved it. autoChecked: the followers were read automatically.
    let ig = { handle, igUserId: existing?.igUserId || null, followers: Number(existing?.instagramFollowers) || 0, ownershipVerified: false, autoChecked: false, via: null, pending: false, profilePic: '', name: '' };
    const fromLookup = (profile) => ({
        ...ig,
        handle: profile.username || handle,
        igUserId: profile.igUserId || ig.igUserId,
        followers: profile.followers,
        profilePic: profile.profilePic || '',
        name: profile.name || '',
        via: profile.source || 'business_discovery',
        autoChecked: true,
        pending: false,
    });
    // An existing creator editing their profile (same handle) keeps their Instagram record as it is.
    const detailsOnly = Boolean(existing && existing.profileStatus !== 'pending_verification'
        && (!cleanHandle(body.handle) || cleanHandle(body.handle) === cleanHandle(existing.instagram)));

    if (detailsOnly) {
        ig = { ...ig, ownershipVerified: existing.instagramVerifiedVia === 'oauth', autoChecked: AUTO_SOURCES.has(existing.instagramVerifiedVia), via: existing.instagramVerifiedVia || null };
    } else {
        if (!handle) return send(res, 400, { success: false, field: 'handle', error: 'Add your Instagram username.' });
        const tokenSnap = settings.metaVerification ? await tokenRef(uid, db).get().catch(() => null) : null;
        const t = tokenSnap?.exists ? tokenSnap.data() : null;
        if (t?.igUserId && handle === t.username) {
            let followers = Number(t.followers) || 0;
            // Refresh the count if the stored one is more than a day old.
            if (Date.now() - new Date(t.refreshedAt || 0).getTime() > 24 * 60 * 60 * 1000) {
                const fresh = await fetchMe(t.token);
                if (fresh.ok) {
                    followers = fresh.me.followers;
                    await tokenSnap.ref.set({ followers, refreshedAt: nowIso() }, { merge: true });
                }
            }
            ig = { handle: t.username, igUserId: t.igUserId, followers, ownershipVerified: true, via: 'oauth', pending: false, profilePic: t.profilePic || '', name: t.name || '' };
        } else if (settings.metaVerification) {
            const lookup = await lookupInstagram(handle, { db });
            if (lookup.ok && isOauthConfigured()) {
                return send(res, 409, { success: false, code: 'connect_required', error: 'Connect your Instagram account to finish.' });
            }
            if (lookup.ok) {
                // Instagram Login isn't set up, but the followers were read automatically: approved if over the minimum.
                ig = fromLookup(lookup.profile);
            } else if (lookup.reason === 'not_professional' || lookup.reason === 'invalid') {
                return send(res, 400, { success: false, code: lookup.reason, field: 'handle', error: lookup.message });
            } else {
                // Nothing could read it: a typed count goes to review; without one, the cron tries again.
                ig = manualFollowers ? selfReported(ig) : { ...ig, handle, pending: true };
            }
        } else {
            // Meta verification is off: followers, name and picture from the public profile. Read
            // automatically, so approved if over the minimum; a typed count goes to review.
            const lookup = await lookupInstagram(handle, { db, useMeta: false });
            if (!lookup.ok && lookup.reason === 'not_found' && !manualFollowers) {
                return send(res, 400, { success: false, code: 'not_found', field: 'handle', error: `${lookup.message} Check the spelling, or enter your followers yourself.` });
            }
            if (lookup.ok) {
                ig = fromLookup(lookup.profile);
            } else {
                // No cron runs while Meta is off, so this is a person's call either way.
                ig = manualFollowers ? selfReported(ig) : { ...ig, handle };
            }
        }
        // A count the creator typed still has to meet the minimum.
        if (ig.via === 'self_reported' && settings.requireVerification && settings.minFollowers > 0 && ig.followers < settings.minFollowers) {
            return send(res, 400, {
                success: false,
                code: 'below_minimum',
                field: 'manualFollowers',
                error: `Newbi Creators starts at ${settings.minFollowers.toLocaleString('en-IN')} Instagram followers.`,
            });
        }
        if (ig.ownershipVerified && settings.requireVerification && settings.minFollowers > 0 && ig.followers < settings.minFollowers) {
            return send(res, 400, {
                success: false,
                code: 'below_minimum',
                error: `Newbi Creators needs at least ${settings.minFollowers.toLocaleString('en-IN')} Instagram followers. @${ig.handle} has ${ig.followers.toLocaleString('en-IN')}.`,
            });
        }
    }

    // Instagram fills in what the profile doesn't have yet.
    const nameFromInstagram = !id.name && ig.name ? str(ig.name, 120) : '';
    if (nameFromInstagram) id.name = nameFromInstagram;
    const photoFromInstagram = !id.photoURL && ig.profilePic ? ig.profilePic : '';

    if (campusNiche && !collegeName) return send(res, 400, { success: false, field: 'collegeName', error: 'Add your college.' });
    if (isNew) {
        const missing = PROFILE_FIELDS_MISSING(id, false);
        if (missing.length) return send(res, 400, { success: false, missing, error: 'Complete your profile first.' });
    }

    const instagramFields = detailsOnly ? {} : {
        instagram: ig.handle,
        instagramFollowers: String(ig.followers || 0),
        instagramVerified: ig.ownershipVerified || ig.autoChecked,
        instagramVerifiedVia: ig.via,
        ...(ig.igUserId ? { igUserId: ig.igUserId } : {}),
        ...(ig.profilePic ? { instagramProfilePic: ig.profilePic } : {}),
        ...(ig.ownershipVerified ? { instagramVerifiedAt: nowIso(), instagramProfessional: true, needsInstagramReconnect: false } : {}),
        ...(ig.autoChecked ? { instagramVerifiedAt: nowIso() } : {}),
        manualFollowerEntry: !ig.ownershipVerified && !ig.autoChecked,
        requiresManualVerification: !ig.ownershipVerified && !ig.autoChecked,
        instagramPending: ig.pending ? { handle: ig.handle, since: nowIso(), attempts: 0 } : FieldValue.delete(),
    };

    // ── One Instagram account, one person ──
    if (!detailsOnly && ig.igUserId && await otherOwnerOf(ig.igUserId, uid, db)) {
        return send(res, 409, { success: false, field: 'handle', error: `@${ig.handle} is already linked to another creator profile.` });
    }
    if (!detailsOnly && !ig.ownershipVerified && ig.handle) {
        const sameHandle = await db.collection('creators').where('instagram', '==', ig.handle).limit(2).get();
        if (sameHandle.docs.some(d => (d.data().uid || d.id) !== uid)) {
            return send(res, 409, { success: false, field: 'handle', error: `@${ig.handle} is already linked to another creator profile.` });
        }
    }

    // ── Status, decided here ──
    // Approved, rejected and suspended profiles keep their status; a pending one is re-decided, so a
    // creator who has connected Instagram since applying is verified automatically.
    let profileStatus;
    if (existing?.profileStatus && !AWAITING_VERIFICATION.has(existing.profileStatus)) profileStatus = existing.profileStatus;
    else if (ig.pending) profileStatus = 'pending_verification';
    else profileStatus = decideStatus({ ownershipVerified: ig.ownershipVerified, autoChecked: ig.autoChecked, followers: ig.followers, settings });
    const newlyApproved = !isNew && profileStatus === 'approved' && existing.profileStatus !== 'approved';
    const now = nowIso();
    const docId = existingSnap?.id || uid;
    const creatorId = (existing?.creatorId || uid.slice(0, 8)).toUpperCase();
    const referredBy = isNew ? str(body.referredBy, 40) : '';

    const optional = {};
    if (has(body, 'collaboration')) optional.doBarter = COLLAB_IDS.has(body.collaboration) ? body.collaboration : 'both';
    if (has(body, 'commercials')) optional.commercials = str(body.commercials, 80);
    if (has(body, 'bio')) optional.bio = str(body.bio, BIO_MAX);
    if (has(body, 'cityPageFocus')) optional.cityPageFocus = str(body.cityPageFocus, 80);
    ['linkedin', 'youtube', 'twitter'].forEach((k) => { if (has(body, k)) optional[k] = socialHandle(body[k]); });

    const creator = {
        uid,
        creatorId,
        name: id.name,
        displayName: id.name,
        email: id.email,
        phone: id.phone || existing?.phone || '',
        isPhoneVerified: id.phoneVerified,
        phoneVerifiedAt: id.phoneVerified ? (existing?.phoneVerifiedAt || now) : null,
        phoneVerificationPending: !id.phoneVerified,
        needsPhoneVerificationNotice: !id.phoneVerified,
        isEmailVerified: Boolean(existing?.isEmailVerified || (token.email_verified && token.email?.toLowerCase() === id.email)),
        city: id.city,
        profilePicture: existing?.profilePicture || id.photoURL || ig.profilePic || '',
        ...instagramFields,
        ...(niches ? { categories: niches[0], specializations: niches, niches, customNiche } : {}),
        ...(campusNiche ? { collegeName } : (niches ? { collegeName: '' } : {})),
        ...optional,
        profileStatus,
        isVerified: profileStatus === 'approved',
        ...(isNew ? {
            createdAt: now,
            source: 'app',
            referredBy,
            verifiedAt: profileStatus === 'approved' ? now : null,
            verifiedBy: profileStatus === 'approved' ? 'meta_auto_verify' : null,
        } : {}),
        updatedAt: now,
    };
    if (newlyApproved) {
        creator.verifiedAt = now;
        creator.verifiedBy = 'meta_auto_verify';
    }

    await db.collection('creators').doc(docId).set(creator, { merge: true });
    if (!detailsOnly && ig.igUserId && ig.ownershipVerified) {
        await ownerRef(ig.igUserId, db).set({ uid, username: ig.handle, at: now }, { merge: true });
    }
    const userPatch = {
        capabilities: { creator: true },
        creatorStatus: profileStatus,
        updatedAt: now,
    };
    if (typeof body.whatsappOptIn === 'boolean') userPatch.channelPrefs = { whatsapp: body.whatsappOptIn };
    if (campusNiche && collegeName && !id.user.college) userPatch.college = collegeName;
    if (formCity && formCity !== id.user.city) userPatch.city = formCity;
    if (nameFromInstagram) { userPatch.name = nameFromInstagram; userPatch.displayName = nameFromInstagram; }
    if (photoFromInstagram) userPatch.photoURL = photoFromInstagram;
    if (detailsOnly) {
        // Nothing about Instagram changes.
    } else if (ig.ownershipVerified) {
        userPatch.instagram = { handle: ig.handle, igUserId: ig.igUserId, followers: ig.followers, verifiedVia: ig.via, verifiedAt: now };
    } else if (ig.handle && !id.user.instagram?.igUserId) {
        userPatch.instagram = { handle: ig.handle };
    }
    await db.collection('users').doc(uid).set(userPatch, { merge: true });

    if (newlyApproved) {
        await notify('creator-approved', uid, { name: id.name, dashboardUrl: `${APP_URL}/creator` }, { idempotencyKey: `creator-approved_${uid}` }).catch(e => console.warn('[creator] approve notify:', e.message));
    }
    if (isNew) {
        await Promise.allSettled([
            notifyReferrer(db, referredBy, creator),
            sendTransactional('creator-application-received', id.email, {
                name: id.name,
                status: profileStatus === 'approved' ? 'approved' : 'pending',
                passId: creatorId,
                handle: ig.handle,
                city: id.city,
                dashboardUrl: `${APP_URL}/creator`,
            }, { uid, idempotencyKey: `creator-welcome_${uid}` }),
        ]);
    }

    return send(res, 200, {
        success: true,
        status: profileStatus,
        isNew,
        creator: {
            id: docId, uid, creatorId, profileStatus,
            name: id.name, city: id.city, niches: creator.niches || allNiches,
            instagram: ig.handle, instagramFollowers: creator.instagramFollowers ?? existing?.instagramFollowers,
            instagramVerified: ig.ownershipVerified || ig.autoChecked, profilePicture: creator.profilePicture,
        },
    });
};

const notifyReferrer = async (db, referredBy, creator) => {
    if (!referredBy) return;
    let referrer = null;
    const direct = await db.collection('creators').doc(referredBy).get().catch(() => null);
    if (direct?.exists) referrer = { id: direct.id, ...direct.data() };
    else {
        const snap = await db.collection('creators').where('creatorId', '==', referredBy.toUpperCase()).limit(1).get();
        if (!snap.empty) referrer = { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    if (!referrer || (referrer.uid || referrer.id) === creator.uid) return;
    await db.collection('notifications').add({
        userId: referrer.uid || referrer.id,
        title: 'New creator referral',
        message: `${creator.name || 'A creator'} applied to Newbi Creators with your link.`,
        type: 'creator',
        link: '/creator/referrals',
        isRead: false,
        createdAt: nowIso(),
    });
};

/* ── campaign-apply ───────────────────────────────────────────────────── */

// 'live' means the event is on: applications are closed (see src/lib/outreach/application.js).
const OPEN_STATUSES = new Set(['open', 'active', 'published']);

export const handleCampaignApply = async (req, res, { db, token }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const campaignId = str(req.body?.campaignId, 120);
    if (!campaignId) return send(res, 400, { success: false, error: 'campaignId is required' });
    // 'newbi': the 1-click apply. 'google_form': the creator says they sent the campaign's Google Form.
    const via = req.body?.via === 'google_form' ? 'google_form' : 'newbi';

    const [creatorSnap, campSnap, userSnap] = await Promise.all([
        findOwnCreator(db, token.uid),
        db.collection('campaigns').doc(campaignId).get(),
        db.collection('users').doc(token.uid).get().catch(() => null),
    ]);
    if (!creatorSnap) return send(res, 409, { success: false, code: 'no_profile', error: 'Apply as a creator first.' });
    if (!campSnap.exists) return send(res, 404, { success: false, error: 'This campaign no longer exists.' });
    const creator = creatorSnap.data();
    const c = campSnap.data();
    // The profile (users/{uid}) is where people change their city and college, so it wins over the creator doc.
    const user = userSnap?.exists ? userSnap.data() : {};
    const city = str(user.city, 80) || creator.city;
    const colleges = [creator.collegeName, user.college, user.collegeName].map(v => String(v || '').toLowerCase()).filter(Boolean);

    if ((creator.joinedCampaigns || []).includes(campaignId)) return send(res, 200, { success: true, already: true, shortlisted: (creator.shortlistedCampaigns || []).includes(campaignId) });
    // Developers test the flow on any campaign: the criteria checks below don't apply to them.
    const tester = isTesterRole(await staffRoleOf(token, db));
    if (!tester) {
        if (['rejected', 'suspended'].includes(creator.profileStatus)) return send(res, 403, { success: false, error: "Your creator profile can't apply to campaigns right now." });
        if (!OPEN_STATUSES.has(String(c.status || 'open').toLowerCase()) || c.websiteApplyEnabled === false) {
            return send(res, 409, { success: false, error: 'This campaign is not taking applications.' });
        }
        const method = ['form', 'both'].includes(c.applyMethod) && c.applyFormUrl ? c.applyMethod : 'newbi';
        if (method === 'form' && via !== 'google_form') return send(res, 409, { success: false, code: 'form_only', error: 'Apply with the Google Form for this campaign.' });
        if (method === 'newbi' && via === 'google_form') return send(res, 400, { success: false, error: 'This campaign has no Google Form.' });

        const followers = Number(creator.instagramFollowers) || 0;
        const min = Number(c.minInstagramFollowers) || 0;
        if (min > 0 && followers < min) return send(res, 409, { success: false, code: 'followers', error: `This campaign needs ${min.toLocaleString('en-IN')}+ Instagram followers.` });
        if (!isCampaignCityMatch(c.targetCity, city)) return send(res, 409, { success: false, code: 'city', error: `This campaign is for creators in ${c.targetCity}.` });
        const college = String(c.targetCollege || '').trim();
        if (college && college.toLowerCase() !== 'any' && !colleges.some(mine => mine.includes(college.toLowerCase()))) {
            return send(res, 409, { success: false, code: 'college', error: `This campaign is for ${college} students.` });
        }

        // Spots: totalSpots counts applicants; spotsLeft (set by admins) wins when present.
        const spotsLeft = c.spotsLeft;
        if (spotsLeft !== null && spotsLeft !== undefined && spotsLeft !== '' && Number(spotsLeft) <= 0) {
            return send(res, 409, { success: false, code: 'full', error: 'All spots are taken.' });
        }
        const total = Number(c.totalSpots) || 0;
        if (total > 0) {
            const applied = await db.collection('creators').where('joinedCampaigns', 'array-contains', campaignId).count().get().then(s => s.data().count).catch(() => 0);
            if (applied >= total) return send(res, 409, { success: false, code: 'full', error: 'All spots are taken.' });
        }
    }

    // Applying never shortlists: the team (or the client's sheet) decides, from the admin.
    await creatorSnap.ref.update({
        joinedCampaigns: FieldValue.arrayUnion(campaignId),
        // Keep the creator doc's city in step with the profile it was checked against.
        ...(city && city !== creator.city ? { city } : {}),
        updatedAt: nowIso(),
    });
    // How they applied, per campaign (a nested map, so set+merge rather than a dotted path).
    await creatorSnap.ref.set({ campaignApplyVia: { [campaignId]: { via, at: nowIso(), ...(tester ? { test: true } : {}) } } }, { merge: true }).catch(() => {});
    return send(res, 200, { success: true, shortlisted: false, via, ...(tester ? { test: true } : {}) });
};

/* ── campaign-submit ──────────────────────────────────────────────────── */

const handleCampaignSubmit = async (req, res, { db, token }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const body = req.body || {};
    const campaignId = str(body.campaignId, 120);
    const taskId = str(body.taskId, 120);
    const contentLink = str(body.contentLink, 1000);
    const proofUrl = str(body.proofUrl, 1000);
    const note = str(body.note, 600);
    // 'google_form': "Mark as submitted" after sending the deliverable's Google Form (no link needed).
    const via = body.via === 'google_form' ? 'google_form' : 'app';
    if (!campaignId || !taskId) return send(res, 400, { success: false, error: 'campaignId and taskId are required' });
    if (via === 'app' && !contentLink && !proofUrl) return send(res, 400, { success: false, error: 'Add a link or a screenshot.' });
    if (contentLink && !isHttpUrl(contentLink)) return send(res, 400, { success: false, field: 'contentLink', error: 'Paste the full link, starting with https://' });
    if (proofUrl && !/^https:\/\//.test(proofUrl)) return send(res, 400, { success: false, error: 'The screenshot did not upload. Try again.' });

    const [creatorSnap, campSnap, role] = await Promise.all([findOwnCreator(db, token.uid), db.collection('campaigns').doc(campaignId).get(), staffRoleOf(token, db)]);
    // Developers' submissions are marked as tests; they still need a profile and the shortlist like everyone.
    const tester = isTesterRole(role);
    if (!creatorSnap || !campSnap.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const creator = creatorSnap.data();
    const task = (campSnap.data().tasks || []).find(t => String(t.id) === taskId);
    if (!task) return send(res, 404, { success: false, error: 'This deliverable no longer exists.' });
    // Only shortlisted creators work on (and submit) deliverables; applying isn't enough.
    if (!(creator.shortlistedCampaigns || []).includes(campaignId)) {
        return send(res, 403, { success: false, code: 'not_shortlisted', error: 'Only shortlisted creators can submit for this campaign.' });
    }
    if (via === 'google_form' && !isHttpUrl(task.googleFormLink)) return send(res, 400, { success: false, error: 'This deliverable has no Google Form. Add a link or a screenshot.' });

    const ref = db.collection('campaigns').doc(campaignId).collection('submissions').doc(token.uid);
    const submission = {
        status: 'submitted', via, contentLink, proofUrl, note, submittedAt: nowIso(), reviewedAt: null, rejectionReason: '',
        // Marked so the team never mistakes it for a creator's real work.
        ...(tester ? { test: true, tester: token.email || null } : {}),
    };
    const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = snap.exists ? snap.data()?.tasks?.[taskId] : null;
        if (current?.status === 'approved') return { conflict: true };
        tx.set(ref, {
            uid: token.uid,
            creatorDocId: creatorSnap.id,
            creatorId: creator.creatorId || null,
            campaignId,
            tasks: { [taskId]: submission },
            updatedAt: submission.submittedAt,
        }, { merge: true });
        return { conflict: false };
    });
    if (result.conflict) return send(res, 409, { success: false, error: 'This deliverable is already approved.' });
    return send(res, 200, { success: true, submission });
};

/*
 * App submissions (campaigns/{id}/submissions/{uid}) through the server, for when
 * the Firestore rules don't let the browser read or review them directly:
 *   my-submission       {campaignId}                          the caller's own record
 *   submissions-list    staff: every campaign's app submissions (collection group)
 *   submissions-review  staff: {campaignId, reviews: [{uid, taskId, status, rejectionReason}]}
 */
export const handleMySubmission = async (req, res, { db, token }) => {
    const campaignId = str(req.query?.campaignId || req.body?.campaignId, 128);
    if (!/^[\w-]{1,128}$/.test(campaignId)) return send(res, 400, { success: false, error: 'campaignId is required' });
    const snap = await db.collection('campaigns').doc(campaignId).collection('submissions').doc(token.uid).get();
    return send(res, 200, { success: true, submission: snap.exists ? snap.data() : null });
};

export const handleSubmissionsList = async (req, res, { db, token }) => {
    if (!(await isStaffCaller(token, db))) return send(res, 403, { success: false, error: 'Only the Newbi team can do this.' });
    const snap = await db.collectionGroup('submissions').get();
    const submissions = snap.docs
        .filter(d => d.ref.parent.parent?.parent?.id === 'campaigns')
        .map(d => ({ campaignId: d.ref.parent.parent.id, uid: d.id, data: d.data() }));
    return send(res, 200, { success: true, submissions });
};

const REVIEW_STATUS = new Set(['approved', 'rejected', 'submitted']);
export const handleSubmissionsReview = async (req, res, { db, token }) => {
    if (!(await isStaffCaller(token, db))) return send(res, 403, { success: false, error: 'Only the Newbi team can do this.' });
    const campaignId = str(req.body?.campaignId, 128);
    const reviews = (Array.isArray(req.body?.reviews) ? req.body.reviews : []).slice(0, 200)
        .map(r => ({ uid: str(r?.uid, 128), taskId: str(r?.taskId, 128), status: str(r?.status, 20), reason: str(r?.rejectionReason, 600) }))
        .filter(r => /^[\w-]{1,128}$/.test(r.uid) && r.taskId && REVIEW_STATUS.has(r.status));
    if (!/^[\w-]{1,128}$/.test(campaignId) || !reviews.length) return send(res, 400, { success: false, error: 'Nothing to review.' });
    const reviewedAt = nowIso();
    const batch = db.batch();
    for (const r of reviews) {
        const ref = db.collection('campaigns').doc(campaignId).collection('submissions').doc(r.uid);
        const field = (name) => new FieldPath('tasks', r.taskId, name);
        batch.update(ref,
            field('status'), r.status,
            field('rejectionReason'), r.status === 'rejected' ? r.reason : '',
            field('reviewedAt'), reviewedAt,
            field('reviewedBy'), token.email || null,
            'updatedAt', reviewedAt);
    }
    await batch.commit();
    return send(res, 200, { success: true, reviewed: reviews.length, reviewedAt });
};

/* Staff: removes app submissions sent by mistake: {campaignId, items: [{uid, taskId}]}. */
export const handleSubmissionsDelete = async (req, res, { db, token }) => {
    if (!(await isStaffCaller(token, db))) return send(res, 403, { success: false, error: 'Only the Newbi team can do this.' });
    const campaignId = str(req.body?.campaignId, 128);
    const items = (Array.isArray(req.body?.items) ? req.body.items : []).slice(0, 200)
        .map(r => ({ uid: str(r?.uid, 128), taskId: str(r?.taskId, 128) }))
        .filter(r => /^[\w-]{1,128}$/.test(r.uid) && r.taskId);
    if (!/^[\w-]{1,128}$/.test(campaignId) || !items.length) return send(res, 400, { success: false, error: 'Nothing to remove.' });
    const at = nowIso();
    const batch = db.batch();
    items.forEach(r => batch.update(db.collection('campaigns').doc(campaignId).collection('submissions').doc(r.uid),
        new FieldPath('tasks', r.taskId), FieldValue.delete(), 'updatedAt', at));
    await batch.commit();
    console.log(`[creator-app] ${token.email || token.uid} removed ${items.length} submission(s) on ${campaignId}`);
    return send(res, 200, { success: true, removed: items.length });
};

/* ── instagram-cron ───────────────────────────────────────────────────── */

const isCronCall = (req) => {
    const secret = process.env.CRON_SECRET;
    const auth = String(req.headers?.authorization || '');
    if (secret) return auth === `Bearer ${secret}`;
    return /vercel-cron/i.test(String(req.headers?.['user-agent'] || ''));
};

const PENDING_GIVE_UP_MS = 3 * 24 * 60 * 60 * 1000;

export const handleCron = async (req, res, { db }) => {
    if (!isCronCall(req)) return send(res, 401, { success: false, error: 'Unauthorized' });
    const deadline = Date.now() + 45_000;
    const report = { pending: { checked: 0, settled: 0 }, tokens: { refreshed: 0, failed: 0 }, counts: { updated: 0 } };
    const settings = await readCreatorSettings(db);

    // 1. Applications nothing could read yet (runs with Meta on or off: the public profile is read either way).
    const pending = await db.collection('creators').where('profileStatus', '==', 'pending_verification').limit(50).get();
    for (const doc of pending.docs) {
        if (Date.now() > deadline) break;
        report.pending.checked += 1;
        const creator = { ...doc.data(), id: doc.id };
        const uid = creator.uid || doc.id;
        // A count the creator typed goes to a person, not the automatic check.
        if (creator.instagramVerifiedVia === 'self_reported') {
            await settlePendingCreator(db, creator, { followers: Number(creator.instagramFollowers) || 0, ownershipVerified: false });
            report.pending.settled += 1;
            continue;
        }
        const t = settings.metaVerification ? await tokenRef(uid, db).get().catch(() => null) : null;
        if (t?.exists) {
            const fresh = await fetchMe(t.data().token);
            if (fresh.ok) {
                await settlePendingCreator(db, creator, { followers: fresh.me.followers, ownershipVerified: true });
                report.pending.settled += 1;
                continue;
            }
        } else {
            const handle = creator.instagramPending?.handle || creator.instagram;
            const lookup = await lookupInstagram(handle, { db, force: true, useMeta: settings.metaVerification });
            if (lookup.ok || lookup.reason === 'not_professional') {
                // Read automatically now: approved if over the minimum. Not Professional: a person decides.
                if (lookup.ok) {
                    await doc.ref.set({ instagramVerified: true, instagramVerifiedVia: lookup.profile.source || 'business_discovery', instagramVerifiedAt: nowIso(), manualFollowerEntry: false, requiresManualVerification: false }, { merge: true });
                }
                await settlePendingCreator(db, creator, { followers: lookup.ok ? lookup.profile.followers : 0, ownershipVerified: false, autoChecked: lookup.ok });
                report.pending.settled += 1;
                continue;
            }
        }
        const since = new Date(creator.instagramPending?.since || creator.createdAt || 0).getTime();
        if (Date.now() - since > PENDING_GIVE_UP_MS) {
            await settlePendingCreator(db, creator, { followers: Number(creator.instagramFollowers) || 0, ownershipVerified: false });
            report.pending.settled += 1;
        } else {
            await doc.ref.set({ instagramPending: { ...(creator.instagramPending || {}), attempts: FieldValue.increment(1), lastTriedAt: nowIso() } }, { merge: true });
        }
    }

    if (!settings.metaVerification) return send(res, 200, { success: true, ...report, tokens: 'skipped: instagramMetaVerification is off' });

    // 2. Stored tokens: refresh before the 60-day expiry, and refresh follower counts daily.
    const tokens = await db.collection('private').doc('instagram_tokens').collection('users')
        .where('refreshedAt', '<', new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
        .orderBy('refreshedAt').limit(100).get();
    for (const doc of tokens.docs) {
        if (Date.now() > deadline) break;
        const t = doc.data();
        const patch = { refreshedAt: nowIso() };
        const expiresIn = new Date(t.expiresAt || 0).getTime() - Date.now();
        if (t.longLived !== false && expiresIn < 10 * 24 * 60 * 60 * 1000 && expiresIn > 0) {
            const r = await refreshToken(t.token);
            if (r.ok) { patch.token = r.token; patch.expiresAt = r.expiresAt; report.tokens.refreshed += 1; } else { report.tokens.failed += 1; }
        }
        const me = await fetchMe(patch.token || t.token);
        if (me.ok) {
            patch.followers = me.me.followers;
            patch.username = me.me.username;
            const creator = await recordVerifiedInstagram(db, doc.id, { ...me.me, profilePic: t.profilePic }, 'oauth');
            report.counts.updated += 1;
            // Connected but still waiting on review (connected before auto-approval, or since grown past the minimum).
            if (creator?.profileStatus === 'pending') {
                await settlePendingCreator(db, creator, { followers: me.me.followers, ownershipVerified: true });
            }
        } else if (expiresIn <= 0) {
            patch.expired = true;
            await db.collection('creators').doc(doc.id).set({ needsInstagramReconnect: true }, { merge: true }).catch(() => {});
        }
        await doc.ref.set(patch, { merge: true });
    }

    return send(res, 200, { success: true, ...report });
};

/* ── Router ───────────────────────────────────────────────────────────── */

/* ── account-matches / account-merge ───────────────────────────────── */

/* Other accounts with this person's phone or email (masked hints), so the app can offer to merge them. */
export const handleAccountMatches = async (req, res, { db, token, adminAuth = defaultAdminAuth }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const email = str(req.body?.email, 200);
    const { matches } = await findMatches({ db, adminAuth, token, email });
    return send(res, 200, { success: true, matches });
};

/*
 * Merges another account into the signed-in one. The proof is a fresh ID
 * token from signing in to that account in a throwaway session. Without
 * confirm it only says what would move (or why it can't).
 */
export const handleAccountMerge = async (req, res, { db, token, adminAuth = defaultAdminAuth, verifyProof = (t) => verifyIdTokenSafe(adminAuth, t) }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    try {
        const proof = await readProof({ token, proofToken: str(req.body?.proofToken, 4096), verifyProof });
        if (!req.body?.confirm) {
            const { from, fromAuth } = await checkMergeable({ db, adminAuth, toUid: token.uid, fromUid: proof.uid });
            const holds = await describeAccount(db, proof.uid);
            const name = str(from.name || from.displayName || fromAuth?.displayName, 120);
            return send(res, 200, { success: true, preview: { name, holds, phone: fromAuth?.phoneNumber || null, email: fromAuth?.email || from.email || null } });
        }
        const result = await mergeAccounts({ db, adminAuth, toUid: token.uid, fromUid: proof.uid, tokenRef, ownerRef });
        return send(res, 200, { success: true, ...result });
    } catch (err) {
        if (err instanceof MergeError) return send(res, err.status, { success: false, code: err.code, error: err.message });
        throw err;
    }
};

/* ── creator-sync-profile ─────────────────────────────────────────────── */

/*
 * After someone edits their profile (name, city, phone), the creator doc
 * catches up, so the admin and campaign checks see the same details. Only
 * fields that changed are written; nothing about status or Instagram.
 */
export const handleSyncProfile = async (req, res, { db, token }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const snap = await findOwnCreator(db, token.uid);
    if (!snap) return send(res, 200, { success: true, updated: [] });
    const creator = snap.data();
    const id = await loadIdentity(db, token);
    const patch = {};
    if (id.name && id.name !== creator.name) { patch.name = id.name; patch.displayName = id.name; }
    if (id.city && id.city !== creator.city) patch.city = id.city;
    if (id.email && !creator.email) patch.email = id.email;
    if (id.phone && id.phoneVerified && (id.phone !== toE164(creator.phone) || !creator.isPhoneVerified)) {
        Object.assign(patch, {
            phone: id.phone,
            isPhoneVerified: true,
            phoneVerifiedAt: creator.phoneVerifiedAt || nowIso(),
            phoneVerificationPending: false,
            needsPhoneVerificationNotice: false,
        });
    }
    const updated = Object.keys(patch);
    if (updated.length) await snap.ref.set({ ...patch, updatedAt: nowIso() }, { merge: true });
    return send(res, 200, { success: true, updated });
};

/* ── profile-phone ──────────────────────────────────────────────────── */

/*
 * The account's phone on users/{uid}. Firestore rules don't let the browser
 * write the phone fields, so verification can't be claimed from the client:
 * a number counts as verified only when it is the one on the Firebase Auth
 * account (added by an OTP link, a phone sign-in, or an account merge), or
 * the server already recorded it as verified. Any other number is saved as
 * an unverified contact number, which drops a verification that belonged to
 * the old one.
 */
const PHONE_FIELDS = ['phone', 'phoneNumber', 'phoneVerified', 'isPhoneVerified', 'phoneVerifiedAt'];
export const handleProfilePhone = async (req, res, { db, token, adminAuth = defaultAdminAuth }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const wanted = toE164(req.body?.phone || '');
    const digits = wanted.replace(/\D/g, '');
    if (req.body?.phone && (digits.length < 10 || digits.length > 15)) {
        return send(res, 400, { success: false, field: 'phone', error: 'Enter a valid mobile number.' });
    }
    const authUser = await adminAuth.getUser(token.uid).catch(() => null);
    const authPhone = toE164(authUser?.phoneNumber || '');
    const ref = db.collection('users').doc(token.uid);
    const snap = await ref.get();
    const u = snap.exists ? snap.data() : {};
    const current = toE164(u.phone || u.phoneNumber || '');
    const now = nowIso();

    let patch;
    if (authPhone && (!wanted || wanted === authPhone)) {
        patch = { phone: authPhone, phoneNumber: authPhone, phoneVerified: true, isPhoneVerified: true,
            phoneVerifiedAt: (current === authPhone && u.phoneVerifiedAt) || now };
    } else if (!wanted) {
        return send(res, 409, { success: false, code: 'not_verified', error: 'Verify your phone number first.' });
    } else if (wanted === current && (u.phoneVerified || u.isPhoneVerified)) {
        // Already verified here (e.g. moved over by an account merge).
        return send(res, 200, { success: true, phone: current, verified: true, updated: [] });
    } else {
        patch = { phone: wanted, phoneNumber: wanted, phoneVerified: false, isPhoneVerified: false, phoneVerifiedAt: null };
    }
    const updated = PHONE_FIELDS.filter(k => u[k] !== patch[k]);
    if (updated.length) await ref.set({ ...patch, updatedAt: now }, { merge: true });
    return send(res, 200, { success: true, phone: patch.phone, verified: patch.phoneVerified, updated });
};

/* ── creator-self-delete ──────────────────────────────────────────────── */

/*
 * The signed-in creator deletes their own creator profile: every creators doc
 * that is theirs, their Instagram link (token and ownership, so the account can
 * be used again), and the creator flag on users/{uid}. Their account, passes
 * and tickets stay. A suspended or rejected profile can't be deleted this way,
 * so it can't be used to apply again from scratch.
 */
export const handleSelfDelete = async (req, res, { db, token }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const uid = token.uid;
    const direct = await db.collection('creators').doc(uid).get();
    const legacy = await db.collection('creators').where('uid', '==', uid).get();
    const docs = [direct, ...legacy.docs].filter((d, i, all) => d.exists && all.findIndex(o => o.ref.path === d.ref.path) === i);
    if (docs.some(d => ['suspended', 'rejected'].includes(d.data()?.profileStatus))) {
        return send(res, 403, { success: false, error: "Your creator profile can't be deleted from the app right now. Contact creators@newbi.live." });
    }

    const userSnap = await db.collection('users').doc(uid).get();
    const user = userSnap.exists ? userSnap.data() : {};
    const igUserIds = new Set([user.instagram?.igUserId, ...docs.map(d => d.data()?.igUserId)].filter(Boolean).map(String));
    for (const igUserId of igUserIds) {
        const owner = await ownerRef(igUserId, db).get();
        if (owner.exists && owner.data()?.uid === uid) await ownerRef(igUserId, db).delete();
    }
    await tokenRef(uid, db).delete().catch(() => {});
    for (const d of docs) await d.ref.delete();

    await db.collection('users').doc(uid).set({
        capabilities: { creator: false },
        creatorStatus: FieldValue.delete(),
        creatorDeletedAt: nowIso(),
        updatedAt: nowIso(),
    }, { merge: true });
    // The Instagram stays on the profile as a plain handle; its verification went with the creator profile.
    if (user.instagram?.igUserId) {
        await db.collection('users').doc(uid).update({
            'instagram.igUserId': FieldValue.delete(),
            'instagram.followers': FieldValue.delete(),
            'instagram.verifiedVia': FieldValue.delete(),
            'instagram.verifiedAt': FieldValue.delete(),
        });
    }
    return send(res, 200, { success: true, deleted: docs.length });
};

export const handleCreatorAppAction = async (action, req, res, { decodedToken }) => {
    const db = getDb();
    try {
        if (action === 'ig-callback') return await handleCallback(req, res, { db });
        if (action === 'instagram-cron') return await handleCron(req, res, { db });
        // The Instagram check works before sign-in (it only reads public data), rate-limited per visitor.
        if (action === 'ig-lookup') {
            if (!decodedToken && lookupLimited(req)) return send(res, 429, { success: false, error: 'Too many checks. Try again in a minute.' });
            return await handleLookup(req, res, { db, token: decodedToken || null });
        }
        if (!decodedToken) return send(res, 401, { success: false, error: 'Please sign in to continue.' });
        // Without the service-account key this server can't read or save profiles: say so plainly.
        if (!hasAdminCredentials) {
            console.error('[creator-app] FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are not set on this server.');
            return send(res, 503, { success: false, code: 'not_configured', error: 'This server can’t save creator profiles yet (its Firebase admin key isn’t set). It works on newbi.live.' });
        }
        const ctx = { db, token: decodedToken };
        if (action === 'ig-connect') return await handleConnect(req, res, ctx);
        if (action === 'creator-apply') return await handleApply(req, res, ctx);
        if (action === 'campaign-apply') return await handleCampaignApply(req, res, ctx);
        if (action === 'campaign-submit') return await handleCampaignSubmit(req, res, ctx);
        if (action === 'creator-self-delete') return await handleSelfDelete(req, res, ctx);
        if (action === 'creator-sync-profile') return await handleSyncProfile(req, res, ctx);
        if (action === 'account-matches') return await handleAccountMatches(req, res, ctx);
        if (action === 'account-merge') return await handleAccountMerge(req, res, ctx);
        if (action === 'profile-phone') return await handleProfilePhone(req, res, ctx);
        if (action === 'my-submission') return await handleMySubmission(req, res, ctx);
        if (action === 'submissions-list') return await handleSubmissionsList(req, res, ctx);
        if (action === 'submissions-review') return await handleSubmissionsReview(req, res, ctx);
        if (action === 'submissions-delete') return await handleSubmissionsDelete(req, res, ctx);
        return send(res, 400, { success: false, error: 'Unknown action.' });
    } catch (err) {
        console.error(`[creatorApp] ${action}:`, err);
        if (action === 'ig-callback') return redirect(res, `${APP_URL}/creator/apply?ig=error&reason=failed`);
        return send(res, 500, { success: false, error: 'Something went wrong. Please try again.' });
    }
};
