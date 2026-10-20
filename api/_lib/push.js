/**
 * Web push through Firebase Cloud Messaging.
 *
 * Devices live on `users/{uid}.pushDevices` ({ [id]: { token, origin, at } }),
 * saved by the app (src/lib/notifications.js). Only devices registered on the
 * app (app.newbi.live, or localhost/previews) get pushes, so signing in to the
 * admin or the old site never adds a second copy of every alert. People who
 * haven't opened the app since fall back to the older `fcmTokens` list.
 *
 * Messages are data-only: the service worker (public/firebase-messaging-sw.js)
 * draws the one notification, with the app icon, a monochrome badge and a tag,
 * so a resend replaces the earlier alert instead of stacking a copy.
 * Dead tokens are removed so we stop paying for them.
 */
import { getMessaging } from 'firebase-admin/messaging';
import { getDb, FieldValue } from './db.js';

let testMessaging = null;
export const setMessagingForTests = (m) => { testMessaging = m; };

const DEAD_TOKEN_CODES = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

// Pushes open in the app; PUBLIC_APP_URL overrides the host.
export const PUSH_ORIGIN = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');

const validToken = (t) => typeof t === 'string' && t.length > 20;

/** The app itself: app.* hosts, localhost and Vercel previews. Not admin.* or the landing site. */
export const isAppOrigin = (origin) => {
    let host = '';
    try { host = new URL(String(origin)).hostname; } catch { return false; }
    return /^app\./i.test(host) || /(^localhost$|^127\.0\.0\.1$|\.localhost$|\.vercel\.app$)/i.test(host);
};

export const tokensFromUser = (user = {}) => {
    const devices = Object.values(user.pushDevices || {}).filter(d => d && validToken(d.token));
    if (devices.length) return [...new Set(devices.filter(d => isAppOrigin(d.origin)).map(d => d.token))].slice(0, 10);
    return [...new Set([...(Array.isArray(user.fcmTokens) ? user.fcmTokens : []), user.fcmToken].filter(validToken))].slice(0, 10);
};

/** '/c/abc' → 'https://app.newbi.live/c/abc'; full URLs stay as they are. */
export const pushLink = (link) => {
    if (!link) return `${PUSH_ORIGIN}/`;
    if (/^https?:/i.test(link)) return link;
    return `${PUSH_ORIGIN}${link.startsWith('/') ? '' : '/'}${link}`;
};

const clip = (s, n) => {
    const v = String(s || '').replace(/\s+/g, ' ').trim();
    return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v;
};

/**
 * sendPush(uid, { title, body, link, image, tag, data }, { user })
 * `tag` groups alerts about the same thing (one campaign, one pass): a newer one replaces the older.
 * → { ok, status: 'sent'|'skipped'|'failed', sent, failed, error }
 */
export const sendPush = async (uid, message, { user = null } = {}) => {
    try {
        const db = getDb();
        let profile = user;
        if (!profile && uid) {
            const snap = await db.collection('users').doc(uid).get();
            profile = snap.exists ? snap.data() : null;
        }
        const tokens = tokensFromUser(profile || {});
        if (!tokens.length) return { ok: false, status: 'skipped', error: 'No device registered for push' };

        const data = {
            title: clip(message.title || 'Newbi', 80),
            body: clip(message.body, 180),
            link: pushLink(message.link),
            tag: clip(message.tag || message.title || 'newbi', 64),
            icon: `${PUSH_ORIGIN}/brand/push/icon-192.png`,
            badge: `${PUSH_ORIGIN}/brand/push/badge-96.png`,
            ...(message.image ? { image: String(message.image) } : {}),
            ...Object.fromEntries(Object.entries(message.data || {}).map(([k, v]) => [k, String(v ?? '')])),
        };
        const messaging = testMessaging || getMessaging();
        const res = await messaging.sendEachForMulticast({
            tokens,
            data,
            webpush: { headers: { Urgency: 'high', TTL: String(3 * 24 * 3600) } },
        });

        const dead = [];
        (res.responses || []).forEach((r, i) => { if (!r.success && DEAD_TOKEN_CODES.has(r.error?.code)) dead.push(tokens[i]); });
        if (dead.length && uid) {
            const update = { fcmTokens: FieldValue.arrayRemove(...dead) };
            if (profile?.fcmToken && dead.includes(profile.fcmToken)) update.fcmToken = FieldValue.delete();
            Object.entries(profile?.pushDevices || {}).forEach(([id, d]) => { if (dead.includes(d?.token)) update[`pushDevices.${id}`] = FieldValue.delete(); });
            await db.collection('users').doc(uid).update(update).catch(() => {});
        }
        const sent = Number(res.successCount || 0);
        return { ok: sent > 0, status: sent > 0 ? 'sent' : 'failed', sent, failed: Number(res.failureCount || 0), ...(sent ? {} : { error: res.responses?.[0]?.error?.message || 'Push failed' }) };
    } catch (err) {
        console.warn('[PUSH] Send failed:', err.message);
        return { ok: false, status: 'failed', error: String(err.message || 'Push failed').slice(0, 200) };
    }
};
