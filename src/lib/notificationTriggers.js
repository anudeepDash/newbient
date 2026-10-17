import { useStore } from './store';
import { db } from './firebase';
import { collection, getDocs, query } from 'firebase/firestore';

/**
 * Triggers an in-app and potentially a push notification.
 */
export const triggerNotification = async ({ userId, type, title, content, link, image, audience }) => {
    try {
        const { addNotification } = useStore.getState();
        
        const notificationData = {
            userId: userId || null, // null means global
            type: type || 'announcement',
            title,
            content,
            link: link || '',
            // Only real images (event posters, avatars) are stored; the app draws category icons itself.
            image: image || '',
            // 'creators': only people with a creator profile see it in the app. Omitted = everyone.
            ...(audience === 'creators' ? { audience: 'creators' } : {}),
        };

        await addNotification(notificationData);
        console.log(`[Notification Triggered] Type: ${type}, Title: ${title}`);

        // Show Native OS Notification only if the notification is targeted for the current logged-in user or is a broadcast to all
        const currentUser = useStore.getState().user;
        const isForCurrentUser = !userId || (currentUser && currentUser.uid === userId);

        // Skipped while the tab is visible: the in-app banner already shows it, so this avoids a double pop-up.
        if (isForCurrentUser && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
            try {
                new Notification(title, {
                    body: content,
                    icon: image || '/favicon.png',
                    badge: '/favicon.png', // Small icon for mobile status bar
                    data: { link: link || '' } 
                });
            } catch (e) {
                console.error("Error showing native notification:", e);
            }
        }
    } catch (error) {
        console.error("Failed to trigger notification:", error);
    }
};

/**
 * Opens the Mailing composer with an email drafted from a notification, so
 * staff pick the audience and the server queues it.
 */
export const openMailingDraft = ({ title, content, link = '', image = '' }) => {
    const ctaUrl = link ? (link.startsWith('http') ? link : `${window.location.origin}${link.startsWith('/') ? '' : '/'}${link}`) : '';
    const params = new URLSearchParams({ subject: title || '', header: title || '', body: content || '' });
    if (image) params.set('heroImage', image);
    if (ctaUrl) { params.set('ctaText', 'View details'); params.set('ctaUrl', ctaUrl); }
    window.location.assign(`/admin/mailing?${params.toString()}`);
};

/**
 * In-app (and push) announcement for everyone. It no longer emails every
 * user: with `openEmailDraft` the Mailing composer opens pre-filled, so the
 * email goes to a chosen audience through the server queue.
 */
export const notifyAllUsers = async (title, content, link = '', image = '', openEmailDraft = false, type = 'announcement') => {
    await triggerNotification({
        userId: null,
        type,
        title,
        content,
        link,
        image
    });
    if (openEmailDraft && typeof window !== 'undefined') openMailingDraft({ title, content, link, image });
};

/**
 * Notify all admins
 */
export const notifyAdmins = async (title, content, link = '', type = 'message') => {
    try {
        const adminsQ = query(collection(db, 'admins'));
        const snapshot = await getDocs(adminsQ);
        
        const notificationPromises = snapshot.docs.map(doc => {
            const adminData = doc.data();
            if (adminData.uid) {
                return triggerNotification({
                    userId: adminData.uid,
                    type,
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
