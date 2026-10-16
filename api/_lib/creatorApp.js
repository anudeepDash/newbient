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
 *
 * Instagram verification is behind site_settings/general.instagramMetaVerification.
 * While it's off, applications go to admin review with the handle the creator
 * typed (no scraping, no third-party APIs).
 */
import { getDb, nowIso, FieldValue } from './db.js';
import { makeSignedToken, readSignedToken, isOwnHost } from './linkSign.js';
import { sendTransactional } from './mail/send.js';
import { notify } from './notify.js';
import {
    cleanHandle, readCreatorSettings, lookupInstagram, isOauthConfigured, oauthAuthorizeUrl, exchangeCode,
    fetchMe, refreshToken, tokenRef, ownerRef, otherOwnerOf, logIntegration, PROFESSIONAL_ACCOUNT_TYPES,
} from './instagram.js';
import { NICHE_IDS, COLLAB_IDS, BIO_MAX, isCollegeNiche } from '../../src/lib/creator/options.js';
import { isCampaignCityMatch } from '../../src/lib/constants.js';

/* The app's own origin (links in emails, the OAuth fallback). PUBLIC_APP_URL overrides it on previews. */
const APP_URL = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');

export const CREATOR_APP_ACTIONS = new Set([
    'ig-lookup', 'ig-connect', 'ig-callback', 'instagram-cron', 'creator-apply', 'campaign-apply', 'campaign-submit',
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

const handleLookup = async (req, res, { db, token }) => {
    const settings = await readCreatorSettings(db);
    if (!settings.metaVerification) {
        return send(res, 200, { success: true, enabled: false, minFollowers: settings.minFollowers });
    }
    const result = await lookupInstagram(req.body?.handle || req.query?.handle, { db });
    const base = { success: true, enabled: true, oauthReady: isOauthConfigured(), minFollowers: settings.minFollowers };
    if (!result.ok) return send(res, 200, { ...base, ok: false, reason: result.reason, message: result.message });

    const { profile } = result;
    const [taken, tokenSnap] = await Promise.all([
        otherOwnerOf(profile.igUserId, token.uid, db),
        tokenRef(token.uid, db).get().catch(() => null),
    ]);
    const connected = Boolean(tokenSnap?.exists && tokenSnap.data()?.igUserId === profile.igUserId);
    return send(res, 200, {
        ...base,
        ok: true,
        profile,
        connected,
        alreadyRegistered: Boolean(taken),
        meetsMinimum: !settings.requireVerification || settings.minFollowers <= 0 || profile.followers >= settings.minFollowers,
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

const handleCallback = async (req, res, { db }) => {
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
    // A creator waiting on Instagram gets their decision now.
    if (creator?.profileStatus === 'pending_verification') {
        await settlePendingCreator(db, creator, { followers: me.followers, ownershipVerified: true });
    }
    return back({ ig: 'connected' });
};

/* ── Status rules ─────────────────────────────────────────────────────── */

/*
 * approved            Instagram proven through Meta (OAuth) and over the minimum
 * pending             admin review (no Meta check, or the account isn't proven yet)
 * pending_verification Meta didn't answer; the cron retries
 */
const decideStatus = ({ ownershipVerified, followers, settings }) => {
    if (!ownershipVerified) return 'pending';
    if (settings.requireVerification && settings.minFollowers > 0 && followers < settings.minFollowers) return 'pending';
    return 'approved';
};

const settlePendingCreator = async (db, creator, { followers, ownershipVerified }) => {
    const settings = await readCreatorSettings(db);
    const status = decideStatus({ ownershipVerified, followers, settings });
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

const PROFILE_FIELDS_MISSING = (id, campusNiche) => {
    const missing = [];
    if (!id.name) missing.push('name');
    if (!id.email) missing.push('email');
    if (!id.phoneVerified) missing.push('phoneVerified');
    if (!id.city) missing.push('city');
    if (campusNiche && !id.college) missing.push('college');
    return missing;
};

const handleApply = async (req, res, { db, token }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const body = req.body || {};
    const uid = token.uid;

    const niche = str(body.niche, 80);
    if (!NICHE_IDS.has(niche)) return send(res, 400, { success: false, field: 'niche', error: 'Pick the niche that fits you best.' });
    const customNiche = niche === 'Others' ? str(body.customNiche, 60) : '';
    if (niche === 'Others' && !customNiche) return send(res, 400, { success: false, field: 'customNiche', error: 'Tell us your niche.' });
    const collab = COLLAB_IDS.has(body.collaboration) ? body.collaboration : 'both';
    const commercials = str(body.commercials, 80);
    const bio = str(body.bio, BIO_MAX);
    const campusNiche = isCollegeNiche(niche);

    const id = await loadIdentity(db, token);
    // A campus niche can name the college on the form; it's saved to the profile too.
    const collegeName = campusNiche ? (str(body.collegeName, 160) || id.college) : '';
    if (campusNiche && collegeName) id.college = collegeName;

    const settings = await readCreatorSettings(db);
    const existingSnap = await findOwnCreator(db, uid);
    const existing = existingSnap?.exists ? existingSnap.data() : null;
    if (existing?.profileStatus === 'rejected' || existing?.profileStatus === 'suspended') {
        return send(res, 403, { success: false, error: "Your creator profile can't be changed right now. Contact creators@newbi.live." });
    }
    // New applicants need the full profile. Existing creators editing their details
    // keep what's on their creator record for anything the profile doesn't have yet.
    if (existing) {
        id.name = id.name || str(existing.name || existing.displayName, 120);
        id.email = id.email || str(existing.email, 200).toLowerCase();
        if (!id.phoneVerified && existing.isPhoneVerified) { id.phone = toE164(existing.phone); id.phoneVerified = Boolean(id.phone); }
        id.city = id.city || str(existing.city, 80);
    } else {
        const missing = PROFILE_FIELDS_MISSING(id, campusNiche);
        if (missing.length) return send(res, 400, { success: false, missing, error: 'Complete your profile first.' });
    }

    // ── Instagram ──
    let handle = cleanHandle(body.handle) || cleanHandle(existing?.instagram);
    let ig = { handle, igUserId: existing?.igUserId || null, followers: Number(existing?.instagramFollowers) || 0, ownershipVerified: false, via: null, pending: false, profilePic: '' };
    // An existing creator editing their details (same handle) keeps their Instagram record as it is.
    const detailsOnly = Boolean(existing && existing.profileStatus !== 'pending_verification'
        && (!cleanHandle(body.handle) || cleanHandle(body.handle) === cleanHandle(existing.instagram)));

    if (detailsOnly) {
        ig = { ...ig, ownershipVerified: existing.instagramVerifiedVia === 'oauth', via: existing.instagramVerifiedVia || null };
    } else if (settings.metaVerification) {
        const tokenSnap = await tokenRef(uid, db).get().catch(() => null);
        const t = tokenSnap?.exists ? tokenSnap.data() : null;
        if (t?.igUserId && (!handle || handle === t.username)) {
            let followers = Number(t.followers) || 0;
            // Refresh the count if the stored one is more than a day old.
            if (Date.now() - new Date(t.refreshedAt || 0).getTime() > 24 * 60 * 60 * 1000) {
                const fresh = await fetchMe(t.token);
                if (fresh.ok) {
                    followers = fresh.me.followers;
                    await tokenSnap.ref.set({ followers, refreshedAt: nowIso() }, { merge: true });
                }
            }
            ig = { handle: t.username, igUserId: t.igUserId, followers, ownershipVerified: true, via: 'oauth', pending: false, profilePic: t.profilePic || '' };
        } else {
            if (!handle) return send(res, 400, { success: false, field: 'handle', error: 'Add your Instagram username.' });
            const lookup = await lookupInstagram(handle, { db });
            if (lookup.ok && isOauthConfigured()) {
                return send(res, 409, { success: false, code: 'connect_required', error: 'Connect your Instagram account to finish.' });
            }
            if (lookup.ok) {
                // Found through Meta but ownership can't be proven yet (Instagram Login not set up): review.
                ig = { ...ig, handle: lookup.profile.username, igUserId: lookup.profile.igUserId, followers: lookup.profile.followers, profilePic: lookup.profile.profilePic || '' };
            } else if (lookup.reason === 'not_professional' || lookup.reason === 'invalid') {
                return send(res, 400, { success: false, code: lookup.reason, field: 'handle', error: lookup.message });
            } else {
                // Meta is down or not reachable: save it and let the cron confirm.
                ig = { ...ig, handle, pending: true };
            }
        }
        if (ig.ownershipVerified && settings.requireVerification && settings.minFollowers > 0 && ig.followers < settings.minFollowers) {
            return send(res, 400, {
                success: false,
                code: 'below_minimum',
                error: `Newbi Creators needs at least ${settings.minFollowers.toLocaleString('en-IN')} Instagram followers. @${ig.handle} has ${ig.followers.toLocaleString('en-IN')}.`,
            });
        }
    } else {
        if (!handle) return send(res, 400, { success: false, field: 'handle', error: 'Add your Instagram username.' });
        const claimed = Math.max(0, Math.min(Number(body.followers) || 0, 500_000_000));
        ig = { ...ig, handle, followers: claimed || ig.followers };
    }
    const instagramFields = detailsOnly ? {} : {
        instagram: ig.handle,
        instagramFollowers: String(ig.followers || 0),
        instagramVerified: ig.ownershipVerified,
        instagramVerifiedVia: ig.via,
        ...(ig.igUserId ? { igUserId: ig.igUserId } : {}),
        ...(ig.profilePic ? { instagramProfilePic: ig.profilePic } : {}),
        ...(ig.ownershipVerified ? { instagramVerifiedAt: nowIso(), instagramProfessional: true, needsInstagramReconnect: false } : {}),
        manualFollowerEntry: !ig.ownershipVerified,
        requiresManualVerification: !ig.ownershipVerified,
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
    let profileStatus;
    if (existing?.profileStatus && existing.profileStatus !== 'pending_verification') profileStatus = existing.profileStatus;
    else if (ig.pending) profileStatus = 'pending_verification';
    else profileStatus = decideStatus({ ownershipVerified: ig.ownershipVerified, followers: ig.followers, settings });
    const isNew = !existing;
    const now = nowIso();
    const docId = existingSnap?.id || uid;
    const creatorId = (existing?.creatorId || uid.slice(0, 8)).toUpperCase();
    const referredBy = isNew ? str(body.referredBy, 40) : '';

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
        categories: niche,
        specializations: [niche],
        customNiche,
        cityPageFocus: niche === 'City Pages' ? str(body.cityPageFocus, 80) : '',
        collegeName,
        doBarter: collab,
        commercials,
        bio,
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
    if (profileStatus === 'approved' && existing?.profileStatus === 'pending_verification') {
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
    if (detailsOnly) {
        // Nothing about Instagram changes.
    } else if (ig.ownershipVerified) {
        userPatch.instagram = { handle: ig.handle, igUserId: ig.igUserId, followers: ig.followers, verifiedVia: ig.via, verifiedAt: now };
    } else if (ig.handle && !id.user.instagram?.igUserId) {
        userPatch.instagram = { handle: ig.handle };
    }
    await db.collection('users').doc(uid).set(userPatch, { merge: true });

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
        creator: { id: docId, uid, creatorId, profileStatus, instagram: ig.handle, instagramFollowers: creator.instagramFollowers, instagramVerified: ig.ownershipVerified },
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

const OPEN_STATUSES = new Set(['open', 'active', 'live', 'published']);

const handleCampaignApply = async (req, res, { db, token }) => {
    if (req.method !== 'POST') return send(res, 405, { success: false, error: 'Method not allowed' });
    const campaignId = str(req.body?.campaignId, 120);
    if (!campaignId) return send(res, 400, { success: false, error: 'campaignId is required' });

    const [creatorSnap, campSnap] = await Promise.all([findOwnCreator(db, token.uid), db.collection('campaigns').doc(campaignId).get()]);
    if (!creatorSnap) return send(res, 409, { success: false, code: 'no_profile', error: 'Apply as a creator first.' });
    if (!campSnap.exists) return send(res, 404, { success: false, error: 'This campaign no longer exists.' });
    const creator = creatorSnap.data();
    const c = campSnap.data();

    if (['rejected', 'suspended'].includes(creator.profileStatus)) return send(res, 403, { success: false, error: "Your creator profile can't apply to campaigns right now." });
    if ((creator.joinedCampaigns || []).includes(campaignId)) return send(res, 200, { success: true, already: true, shortlisted: (creator.shortlistedCampaigns || []).includes(campaignId) });
    if (!OPEN_STATUSES.has(String(c.status || 'open').toLowerCase()) || c.websiteApplyEnabled === false) {
        return send(res, 409, { success: false, error: 'This campaign is not taking applications.' });
    }

    const followers = Number(creator.instagramFollowers) || 0;
    const min = Number(c.minInstagramFollowers) || 0;
    if (min > 0 && followers < min) return send(res, 409, { success: false, code: 'followers', error: `This campaign needs ${min.toLocaleString('en-IN')}+ Instagram followers.` });
    if (!isCampaignCityMatch(c.targetCity, creator.city)) return send(res, 409, { success: false, code: 'city', error: `This campaign is for creators in ${c.targetCity}.` });
    const college = String(c.targetCollege || '').trim();
    if (college && college.toLowerCase() !== 'any' && !String(creator.collegeName || '').toLowerCase().includes(college.toLowerCase())) {
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

    const shortlisted = Boolean(c.autoShortlistEligible && creator.profileStatus === 'approved');
    const patch = { joinedCampaigns: FieldValue.arrayUnion(campaignId), updatedAt: nowIso() };
    if (shortlisted) patch.shortlistedCampaigns = FieldValue.arrayUnion(campaignId);
    await creatorSnap.ref.update(patch);
    return send(res, 200, { success: true, shortlisted });
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
    if (!campaignId || !taskId) return send(res, 400, { success: false, error: 'campaignId and taskId are required' });
    if (!contentLink && !proofUrl) return send(res, 400, { success: false, error: 'Add a link or a screenshot.' });
    if (contentLink && !isHttpUrl(contentLink)) return send(res, 400, { success: false, field: 'contentLink', error: 'Paste the full link, starting with https://' });
    if (proofUrl && !/^https:\/\//.test(proofUrl)) return send(res, 400, { success: false, error: 'The screenshot did not upload. Try again.' });

    const [creatorSnap, campSnap] = await Promise.all([findOwnCreator(db, token.uid), db.collection('campaigns').doc(campaignId).get()]);
    if (!creatorSnap || !campSnap.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const creator = creatorSnap.data();
    const task = (campSnap.data().tasks || []).find(t => String(t.id) === taskId);
    if (!task) return send(res, 404, { success: false, error: 'This deliverable no longer exists.' });
    const inCampaign = (creator.joinedCampaigns || []).includes(campaignId) || (creator.shortlistedCampaigns || []).includes(campaignId);
    if (!inCampaign) return send(res, 403, { success: false, error: 'Apply to this campaign first.' });

    const ref = db.collection('campaigns').doc(campaignId).collection('submissions').doc(token.uid);
    const submission = { status: 'submitted', contentLink, proofUrl, note, submittedAt: nowIso(), reviewedAt: null, rejectionReason: '' };
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

/* ── instagram-cron ───────────────────────────────────────────────────── */

const isCronCall = (req) => {
    const secret = process.env.CRON_SECRET;
    const auth = String(req.headers?.authorization || '');
    if (secret) return auth === `Bearer ${secret}`;
    return /vercel-cron/i.test(String(req.headers?.['user-agent'] || ''));
};

const PENDING_GIVE_UP_MS = 3 * 24 * 60 * 60 * 1000;

const handleCron = async (req, res, { db }) => {
    if (!isCronCall(req)) return send(res, 401, { success: false, error: 'Unauthorized' });
    const deadline = Date.now() + 45_000;
    const report = { pending: { checked: 0, settled: 0 }, tokens: { refreshed: 0, failed: 0 }, counts: { updated: 0 } };
    const settings = await readCreatorSettings(db);
    if (!settings.metaVerification) return send(res, 200, { success: true, skipped: 'instagramMetaVerification is off' });

    // 1. Applications saved while Meta was unreachable.
    const pending = await db.collection('creators').where('profileStatus', '==', 'pending_verification').limit(50).get();
    for (const doc of pending.docs) {
        if (Date.now() > deadline) break;
        report.pending.checked += 1;
        const creator = { ...doc.data(), id: doc.id };
        const uid = creator.uid || doc.id;
        const t = await tokenRef(uid, db).get().catch(() => null);
        if (t?.exists) {
            const fresh = await fetchMe(t.data().token);
            if (fresh.ok) {
                await settlePendingCreator(db, creator, { followers: fresh.me.followers, ownershipVerified: true });
                report.pending.settled += 1;
                continue;
            }
        } else {
            const handle = creator.instagramPending?.handle || creator.instagram;
            const lookup = await lookupInstagram(handle, { db, force: true });
            if (lookup.ok || lookup.reason === 'not_professional') {
                // Found (but not proven) or not Professional: a person decides.
                await settlePendingCreator(db, creator, { followers: lookup.ok ? lookup.profile.followers : 0, ownershipVerified: false });
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
            await recordVerifiedInstagram(db, doc.id, { ...me.me, profilePic: t.profilePic }, 'oauth');
            report.counts.updated += 1;
        } else if (expiresIn <= 0) {
            patch.expired = true;
            await db.collection('creators').doc(doc.id).set({ needsInstagramReconnect: true }, { merge: true }).catch(() => {});
        }
        await doc.ref.set(patch, { merge: true });
    }

    return send(res, 200, { success: true, ...report });
};

/* ── Router ───────────────────────────────────────────────────────────── */

export const handleCreatorAppAction = async (action, req, res, { decodedToken }) => {
    const db = getDb();
    try {
        if (action === 'ig-callback') return await handleCallback(req, res, { db });
        if (action === 'instagram-cron') return await handleCron(req, res, { db });
        if (!decodedToken) return send(res, 401, { success: false, error: 'Please sign in to continue.' });
        const ctx = { db, token: decodedToken };
        if (action === 'ig-lookup') return await handleLookup(req, res, ctx);
        if (action === 'ig-connect') return await handleConnect(req, res, ctx);
        if (action === 'creator-apply') return await handleApply(req, res, ctx);
        if (action === 'campaign-apply') return await handleCampaignApply(req, res, ctx);
        if (action === 'campaign-submit') return await handleCampaignSubmit(req, res, ctx);
        return send(res, 400, { success: false, error: 'Unknown action.' });
    } catch (err) {
        console.error(`[creatorApp] ${action}:`, err);
        if (action === 'ig-callback') return redirect(res, `${APP_URL}/creator/apply?ig=error&reason=failed`);
        return send(res, 500, { success: false, error: 'Something went wrong. Please try again.' });
    }
};
