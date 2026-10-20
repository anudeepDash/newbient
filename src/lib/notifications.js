import { getMessagingSafe } from './firebase';
import { getToken, deleteToken, onMessage } from 'firebase/messaging';
import { useStore } from './store';
import { isAppHost, landingAppBase } from '../app/host';

// Public VAPID key for Firebase Cloud Messaging
const VAPID_KEY = "BJ5S-LTtm0M9B94sR4e5fIKo2mixDt77bpN2w86NC16ZjpUrkNpKWRF14WhEV3yUKNqelLwaR7XPJ_F38Cc1DA0";

/*
 * Push belongs to the app (app.newbi.live, or /app on localhost and previews).
 * The admin and the landing site share the account but not the alerts: a token
 * there would show every alert a second time, from a second "site".
 */
const pushHere = () => isAppHost() || Boolean(landingAppBase());

/** Stops this browser getting pushes for this site, and drops its token from the account. */
const unregisterHere = async (msg) => {
    try {
        const token = await getToken(msg, { vapidKey: VAPID_KEY }).catch(() => null);
        if (!token) return;
        await useStore.getState().removeFcmToken?.(token);
        await deleteToken(msg).catch(() => {});
    } catch (e) {
        console.warn('[Notifications] Unregister warning:', e);
    }
};

export const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return null;

    try {
        const msg = await getMessagingSafe();
        if (!msg) return null;

        if (!pushHere()) {
            if (window.Notification.permission === 'granted') await unregisterHere(msg);
            return null;
        }

        let permission = window.Notification.permission;
        if (permission !== 'granted' && permission !== 'denied') {
            // Support both modern Promise syntax and older Safari callback syntax
            permission = await new Promise((resolve) => {
                const res = window.Notification.requestPermission(resolve);
                if (res && typeof res.then === 'function') {
                    res.then(resolve).catch(() => resolve('default'));
                }
            });
        }

        if (permission === 'granted') {
            const token = await getToken(msg, { vapidKey: VAPID_KEY }).catch((err) => {
                console.warn('[Notifications] Token retrieval warning:', err);
                return null;
            });
            if (token) {
                await useStore.getState().saveFcmToken(token);
                return token;
            }
        }
    } catch (error) {
        console.warn('[Notifications] Permission request error:', error);
    }
    return null;
};

// onMessage adds a new handler on every call, so it is registered once per page load.
let foregroundMessagingStarted = false;

/*
 * A push that lands while the app is open and on screen. The server already
 * wrote it to the in-app feed, which updates the bell by itself, so nothing is
 * drawn or saved here: no OS pop-up over the app, no second feed entry.
 */
export const initForegroundMessaging = async () => {
    if (typeof window === 'undefined' || foregroundMessagingStarted || !pushHere()) return;
    foregroundMessagingStarted = true;

    try {
        const msg = await getMessagingSafe();
        if (!msg) {
            foregroundMessagingStarted = false;
            return;
        }
        onMessage(msg, () => {});
    } catch (e) {
        foregroundMessagingStarted = false;
        console.warn('[Notifications] Failed to init foreground messaging:', e);
    }
};
