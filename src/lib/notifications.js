import { messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useStore } from './store';

// Public VAPID key for Firebase Cloud Messaging
const VAPID_KEY = "BJ5S-LTtm0M9B94sR4e5fIKo2mixDt77bpN2w86NC16ZjpUrkNpKWRF14WhEV3yUKNqelLwaR7XPJ_F38Cc1DA0";

export const requestNotificationPermission = async () => {
    if (!messaging || !window.Notification) return null;
    
    try {
        const permission = await window.Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (token) {
                console.log('FCM Token:', token);
                await useStore.getState().saveFcmToken(token);
                return token;
            }
        }
    } catch (error) {
        console.error('An error occurred while retrieving token:', error);
    }
    return null;
};

export const initForegroundMessaging = () => {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        
        // 1. Show Native Browser Notification
        if (window.Notification?.permission === 'granted') {
            const { title, body, image } = payload.notification;
            new window.Notification(title, {
                body: body,
                icon: image || '/logo_full.png',
                badge: '/logo_full.png', // Small icon for mobile status bar
                data: payload.data
            });
        }
        
        // 2. Add to store notifications (In-app center)
        useStore.getState().addNotification({
            title: payload.notification.title,
            content: payload.notification.body,
            type: payload.data?.type || 'push',
            link: payload.data?.link || '',
            image: payload.notification.image || '',
            isRead: false,
            createdAt: new Date().toISOString()
        });
    });
};
