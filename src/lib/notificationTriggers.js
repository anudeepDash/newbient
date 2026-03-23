import { useStore } from './store';
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

/**
 * Triggers an in-app and potentially a push notification.
 */
export const triggerNotification = async ({ userId, type, title, content, link, image }) => {
    const { addNotification } = useStore.getState();
    
    const notificationData = {
        userId: userId || null, // null means global
        type,
        title,
        content,
        link: link || '',
        image: image || '',
    };

    await addNotification(notificationData);
    console.log(`[Notification Triggered] Type: ${type}, Title: ${title}`);

    // Show Native OS Notification if permitted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: content,
                icon: image || '/logo_full.png',
                badge: '/logo_full.png', // Small icon for mobile status bar
                data: { link: link || '' } 
            });
        } catch (e) {
            console.error("Error showing native notification:", e);
        }
    }
};

/**
 * Notify all users with an announcement
 */
export const notifyAllUsers = async (title, content, link = '', image = '') => {
    await triggerNotification({
        userId: null,
        type: 'announcement',
        title,
        content,
        link,
        image
    });
};

/**
 * Notify all admins
 */
export const notifyAdmins = async (title, content, link = '') => {
    try {
        const adminsQ = query(collection(db, 'admins'));
        const snapshot = await getDocs(adminsQ);
        
        const notificationPromises = snapshot.docs.map(doc => {
            const adminData = doc.data();
            if (adminData.uid) {
                return triggerNotification({
                    userId: adminData.uid,
                    type: 'message',
                    title,
                    content,
                    link
                });
            }
            return Promise.resolve();
        });
        
        await Promise.all(notificationPromises);
    } catch (error) {
        console.error("Error notifying admins:", error);
    }
};

/**
 * Notify a specific user (e.g., creator)
 */
export const notifySpecificUser = async (userId, title, content, link = '', type = 'announcement') => {
    await triggerNotification({
        userId,
        type,
        title,
        content,
        link
    });
};
