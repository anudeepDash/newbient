/**
 * Web push through Firebase Cloud Messaging to the tokens saved on
 * `users/{uid}` (`fcmToken`, plus `fcmTokens` for more than one device).
 * Dead tokens are removed so we stop paying for them.
 */
import { getMessaging } from 'firebase-admin/messaging';
import { getDb, FieldValue, SITE_URL } from './db.js';

let testMessaging = null;
export const setMessagingForTests = (m) => { testMessaging = m; };

const DEAD_TOKEN_CODES = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

export const tokensFromUser = (user = {}) => [...new Set([
    ...(Array.isArray(user.fcmTokens) ? user.fcmTokens : []),
    user.fcmToken,
].filter(t => typeof t === 'string' && t.length > 20))].slice(0, 20);

/**
 * sendPush(uid, { title, body, link, image, data }, { user })
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

        const link = message.link ? (/^https?:/i.test(message.link) ? message.link : `${SITE_URL}${message.link.startsWith('/') ? '' : '/'}${message.link}`) : SITE_URL;
        const messaging = testMessaging || getMessaging();
        const res = await messaging.sendEachForMulticast({
            tokens,
            notification: { title: String(message.title || 'Newbi').slice(0, 120), body: String(message.body || '').slice(0, 400), ...(message.image ? { imageUrl: message.image } : {}) },
            data: { link, ...(message.data || {}) },
            webpush: { fcmOptions: { link }, notification: { icon: `${SITE_URL}/favicon.png`, badge: `${SITE_URL}/favicon.png` } },
        });

        const dead = [];
        (res.responses || []).forEach((r, i) => { if (!r.success && DEAD_TOKEN_CODES.has(r.error?.code)) dead.push(tokens[i]); });
        if (dead.length && uid) {
            const update = { fcmTokens: FieldValue.arrayRemove(...dead) };
            if (profile?.fcmToken && dead.includes(profile.fcmToken)) update.fcmToken = FieldValue.delete();
            await db.collection('users').doc(uid).set(update, { merge: true }).catch(() => {});
        }
        const sent = Number(res.successCount || 0);
        return { ok: sent > 0, status: sent > 0 ? 'sent' : 'failed', sent, failed: Number(res.failureCount || 0), ...(sent ? {} : { error: res.responses?.[0]?.error?.message || 'Push failed' }) };
    } catch (err) {
        console.warn('[PUSH] Send failed:', err.message);
        return { ok: false, status: 'failed', error: String(err.message || 'Push failed').slice(0, 200) };
    }
};
