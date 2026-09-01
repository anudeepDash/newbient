import { getMessagingSafe } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useStore } from './store';

// Public VAPID key for Firebase Cloud Messaging
const VAPID_KEY = "BJ5S-LTtm0M9B94sR4e5fIKo2mixDt77bpN2w86NC16ZjpUrkNpKWRF14WhEV3yUKNqelLwaR7XPJ_F38Cc1DA0";

export const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return null;
    
    try {
        const msg = await getMessagingSafe();
        if (!msg) return null;

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

export const initForegroundMessaging = async () => {
    if (typeof window === 'undefined') return;

    try {
        const msg = await getMessagingSafe();
        if (!msg) return;

        onMessage(msg, (payload) => {
            try {
                // 1. Show Native Browser Notification if supported and permitted
                if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
                    const notification = payload.notification || {};
                    const title = notification.title || 'Newbi Entertainment';
                    const body = notification.body || '';
                    const image = notification.image || '';

                    try {
                        new window.Notification(title, {
                            body: body,
                            icon: image || '/logo_full.png',
                            badge: '/logo_full.png',
                            data: payload.data
                        });
                    } catch (e) {
                        // Some mobile browsers don't support new Notification() inside page context
                    }
                }
                
                // 2. Add to store notifications (In-app center)
                const notif = payload.notification || {};
                useStore.getState().addNotification({
                    title: notif.title || 'New Notification',
                    content: notif.body || '',
                    type: payload.data?.type || 'push',
                    link: payload.data?.link || '',
                    image: notif.image || '',
                    isRead: false,
                    createdAt: new Date().toISOString()
                });
            } catch (err) {
                console.warn('[Notifications] Error processing foreground message:', err);
            }
        });
    } catch (e) {
        console.warn('[Notifications] Failed to init foreground messaging:', e);
    }
};

