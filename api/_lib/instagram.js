/**
 * Instagram verification through Meta's official APIs only.
 *
 * Professional (Business or Creator) accounts only; personal accounts can't be
 * looked up or connected, and the app tells the creator how to switch.
 *
 *   Step A  lookupInstagram(handle)
 *           Business Discovery through Newbi's own Instagram Business account
 *           (META_GRAPH_TOKEN + NEWBI_IG_USER_ID). No login. Exact follower
 *           count, picture and Instagram's numeric id. Cached for 24 hours in
 *           instagram_profiles/{igUserId} and instagram_profiles/h_{handle}.
 *
 *   Step B  oauthAuthorizeUrl() → exchangeCode() → fetchMe()
 *           "Instagram API with Instagram Login", scope instagram_business_basic.
 *           Proves the creator owns the account. The long-lived token is kept
 *           server-side only (tokenRef(uid), under the private collection) and
 *           refreshed by the cron before its 60-day expiry.
 *
 * Every Meta call is one request with a 3-second timeout, never retried in a
 * loop. A timeout or outage comes back as { ok: false, reason: 'unavailable' }
 * so callers can save the application as pending_verification instead.
 *
 * Env: IG_APP_ID, IG_APP_SECRET, IG_REDIRECT_URI, META_GRAPH_TOKEN,
 *      NEWBI_IG_USER_ID, optional META_GRAPH_VERSION (default v21.0).
 */
import { getDb, nowIso } from './db.js';

const GRAPH_VERSION = () => process.env.META_GRAPH_VERSION || 'v21.0';
const TIMEOUT_MS = 3000;
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const PROFESSIONAL_ACCOUNT_TYPES = new Set(['BUSINESS', 'MEDIA_CREATOR', 'CREATOR']);

/** '@Some.Handle', 'instagram.com/some.handle/' → 'some.handle', or '' when it isn't a handle. */
export const cleanHandle = (raw = '') => {
    let value = String(raw || '').trim();
    const fromUrl = value.match(/instagram\.com\/([^/?#\s]+)/i);
    if (fromUrl) value = fromUrl[1];
    value = value.replace(/^@+/, '').trim().toLowerCase();
    return /^[a-z0-9._]{1,30}$/.test(value) ? value : '';
};

/** site_settings/general.instagramMetaVerification: off until the owner finishes the Meta setup. */
export const readCreatorSettings = async (db = getDb()) => {
    let data = {};
    try {
        const snap = await db.collection('site_settings').doc('general').get();
        data = snap.exists ? snap.data() || {} : {};
    } catch (e) {
        console.warn('[instagram] site_settings read:', e.message);
    }
    const min = Number(data.minInstagramFollowersToJoin);
    return {
        metaVerification: data.instagramMetaVerification === true,
        minFollowers: Number.isFinite(min) ? min : 1000,
        requireVerification: data.requireInstagramVerification !== false,
        welcomePoints: Number(data.creatorWelcomePoints) || 0,
    };
};

export const isLookupConfigured = () => Boolean(process.env.META_GRAPH_TOKEN && process.env.NEWBI_IG_USER_ID);
export const isOauthConfigured = () => Boolean(process.env.IG_APP_ID && process.env.IG_APP_SECRET && process.env.IG_REDIRECT_URI);

/** Errors go to integration_log (server-only), so admins can see why a check failed. */
export const logIntegration = async (entry = {}, db = getDb()) => {
    try {
        await db.collection('integration_log').add({ provider: 'instagram', ...entry, at: nowIso() });
    } catch (e) {
        console.warn('[instagram] integration_log write:', e.message);
    }
};

/* One fetch with a hard timeout. Resolves to { ok, status, json } or { ok:false, timeout|network }. */
const fetchJson = async (url, init = {}) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...init, signal: ctrl.signal });
        let json = null;
        try { json = await res.json(); } catch (e) { json = null; }
        return { ok: res.ok, status: res.status, json };
    } catch (e) {
        return { ok: false, status: 0, json: null, timeout: e?.name === 'AbortError', network: true, error: e?.message };
    } finally {
        clearTimeout(timer);
    }
};

/*
 * Meta's answer for a personal or missing account is the same: code 110 /
 * subcode 2207013 ("cannot be found"). Token, permission and rate-limit errors
 * are our problem, not the creator's, so they count as "unavailable".
 */
const classifyGraphError = (result) => {
    const err = result?.json?.error || {};
    if (result.network) return { reason: 'unavailable', detail: result.timeout ? 'timeout' : (result.error || 'network') };
    const code = Number(err.code);
    const sub = Number(err.error_subcode);
    if (sub === 2207013 || code === 110 || /cannot be found|does not exist|invalid user id/i.test(err.message || '')) {
        return { reason: 'not_professional', detail: err.message || 'not found' };
    }
    return { reason: 'unavailable', detail: err.message || `HTTP ${result.status}`, code };
};

const cacheRef = (db, key) => db.collection('instagram_profiles').doc(key);

const readCache = async (db, handle) => {
    try {
        const snap = await cacheRef(db, `h_${handle}`).get();
        if (!snap.exists) return null;
        const data = snap.data();
        const age = Date.now() - new Date(data.fetchedAt || 0).getTime();
        return age >= 0 && age < CACHE_TTL_MS ? data : null;
    } catch (e) {
        return null;
    }
};

const writeCache = async (db, profile) => {
    const record = { ...profile, fetchedAt: nowIso(), source: profile.source || 'business_discovery' };
    try {
        const batch = db.batch();
        batch.set(cacheRef(db, `h_${profile.username}`), record);
        if (profile.igUserId) batch.set(cacheRef(db, String(profile.igUserId)), record);
        await batch.commit();
    } catch (e) {
        console.warn('[instagram] cache write:', e.message);
    }
    return record;
};

/**
 * Step A: Business Discovery. Resolves to
 *   { ok: true, profile: { igUserId, username, name, followers, mediaCount, profilePic }, cached }
 *   { ok: false, reason: 'invalid' | 'not_professional' | 'unavailable' | 'not_configured', message }
 */
export const lookupInstagram = async (rawHandle, { force = false, db = getDb() } = {}) => {
    const handle = cleanHandle(rawHandle);
    if (!handle) return { ok: false, reason: 'invalid', message: 'Enter your Instagram username, without links.' };

    if (!force) {
        const cached = await readCache(db, handle);
        if (cached) return { ok: true, cached: true, profile: publicProfile(cached) };
    }
    if (!isLookupConfigured()) {
        return { ok: false, reason: 'not_configured', message: 'Instagram checks are not switched on yet.' };
    }

    const fields = `business_discovery.username(${handle}){id,username,name,followers_count,media_count,profile_picture_url}`;
    const url = `https://graph.facebook.com/${GRAPH_VERSION()}/${encodeURIComponent(process.env.NEWBI_IG_USER_ID)}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(process.env.META_GRAPH_TOKEN)}`;
    const result = await fetchJson(url);
    const bd = result.ok ? result.json?.business_discovery : null;
    if (!bd?.id) {
        const { reason, detail, code } = result.ok ? { reason: 'not_professional', detail: 'no business_discovery' } : classifyGraphError(result);
        if (reason === 'unavailable') await logIntegration({ op: 'business_discovery', handle, error: detail, code: code || null }, db);
        return {
            ok: false,
            reason,
            message: reason === 'not_professional'
                ? `We couldn't find @${handle} as a Professional account.`
                : "Instagram isn't answering right now.",
        };
    }

    const record = await writeCache(db, {
        igUserId: String(bd.id),
        username: String(bd.username || handle).toLowerCase(),
        name: bd.name || '',
        followers: Number(bd.followers_count) || 0,
        mediaCount: Number(bd.media_count) || 0,
        profilePic: bd.profile_picture_url || '',
    });
    return { ok: true, cached: false, profile: publicProfile(record) };
};

export const publicProfile = (p = {}) => ({
    igUserId: p.igUserId ? String(p.igUserId) : null,
    username: p.username || null,
    name: p.name || null,
    followers: Number(p.followers) || 0,
    mediaCount: Number(p.mediaCount) || 0,
    profilePic: p.profilePic || null,
});

/* ── Step B: Instagram Login ─────────────────────────────────────────────── */

export const oauthAuthorizeUrl = (state) => {
    const params = new URLSearchParams({
        client_id: process.env.IG_APP_ID,
        redirect_uri: process.env.IG_REDIRECT_URI,
        response_type: 'code',
        scope: 'instagram_business_basic',
        state,
    });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
};

/** code → { ok, token, expiresAt } (a long-lived, 60-day token). */
export const exchangeCode = async (code) => {
    const body = new URLSearchParams({
        client_id: process.env.IG_APP_ID,
        client_secret: process.env.IG_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: process.env.IG_REDIRECT_URI,
        code: String(code || '').replace(/#_$/, ''),
    });
    const short = await fetchJson('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    const shortToken = short.json?.access_token;
    if (!short.ok || !shortToken) return { ok: false, ...classifyGraphError(short), step: 'code' };

    const params = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: process.env.IG_APP_SECRET, access_token: shortToken });
    const long = await fetchJson(`https://graph.instagram.com/access_token?${params.toString()}`);
    // A short-lived token (1 hour) still lets us read the profile now; the cron can't refresh it later.
    if (!long.ok || !long.json?.access_token) {
        return { ok: true, token: shortToken, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), longLived: false };
    }
    const expiresIn = Number(long.json.expires_in) || 60 * 24 * 60 * 60;
    return { ok: true, token: long.json.access_token, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(), longLived: true };
};

/** The connected account, straight from Meta: { ok, me: { igUserId, username, followers, accountType, profilePic, name } }. */
export const fetchMe = async (token) => {
    const fields = 'user_id,username,name,followers_count,media_count,account_type,profile_picture_url';
    const result = await fetchJson(`https://graph.instagram.com/${GRAPH_VERSION()}/me?fields=${fields}&access_token=${encodeURIComponent(token)}`);
    const me = result.json;
    if (!result.ok || !(me?.user_id || me?.id)) return { ok: false, ...classifyGraphError(result) };
    return {
        ok: true,
        me: {
            igUserId: String(me.user_id || me.id),
            username: String(me.username || '').toLowerCase(),
            name: me.name || '',
            followers: Number(me.followers_count) || 0,
            mediaCount: Number(me.media_count) || 0,
            accountType: String(me.account_type || '').toUpperCase(),
            profilePic: me.profile_picture_url || '',
        },
    };
};

/** Long-lived tokens can be refreshed once they're a day old, up to their 60-day expiry. */
export const refreshToken = async (token) => {
    const result = await fetchJson(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    if (!result.ok || !result.json?.access_token) return { ok: false, ...classifyGraphError(result) };
    const expiresIn = Number(result.json.expires_in) || 60 * 24 * 60 * 60;
    return { ok: true, token: result.json.access_token, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
};

/* ── Server-only records ─────────────────────────────────────────────────── */

/*
 * private/instagram_tokens/users/{uid}: the token and the account it proved.
 * Everything under `private` is closed to clients in the Firestore rules.
 */
export const tokenRef = (uid, db = getDb()) => db.collection('private').doc('instagram_tokens').collection('users').doc(String(uid));

/* instagram_owners/{igUserId} → { uid }: one Instagram account belongs to one person, even after a rename. */
export const ownerRef = (igUserId, db = getDb()) => db.collection('instagram_owners').doc(String(igUserId));

/** The uid that already owns this Instagram account, if it isn't `uid`. */
export const otherOwnerOf = async (igUserId, uid, db = getDb()) => {
    if (!igUserId) return null;
    try {
        const snap = await ownerRef(igUserId, db).get();
        const owner = snap.exists ? snap.data()?.uid : null;
        if (owner && owner !== uid) return owner;
        // Creators verified before instagram_owners existed.
        const legacy = await db.collection('creators').where('igUserId', '==', String(igUserId)).limit(2).get();
        const other = legacy.docs.find(d => (d.data().uid || d.id) !== uid);
        return other ? (other.data().uid || other.id) : null;
    } catch (e) {
        console.warn('[instagram] owner check:', e.message);
        return null;
    }
};
