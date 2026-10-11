import { useStore } from './store';
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

/**
 * Triggers an in-app and potentially a push notification.
 */
export const triggerNotification = async ({ userId, type, title, content, link, image }) => {
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
 * Notify all users with an announcement and optionally broadcast via email
 */
export const notifyAllUsers = async (title, content, link = '', image = '', sendEmail = false, type = 'announcement') => {
    // 1. Trigger Push & In-App Notification
    await triggerNotification({
        userId: null,
        type,
        title,
        content,
        link,
        image
    });

    // 2. Trigger Mass Email Broadcast if requested
    if (sendEmail) {
        try {
            const usersSnap = await getDocs(query(collection(db, 'users')));
            const emails = [];
            usersSnap.forEach(doc => {
                const data = doc.data();
                if (data.email) emails.push(data.email);
            });
            
            const uniqueEmails = [...new Set(emails)];
            
            if (uniqueEmails.length > 0) {
                const { sendMassEmail } = await import('./email');
                const htmlContent = `
                    <style>
                        ul { list-style-type: disc !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                        ol { list-style-type: decimal !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                        li { margin-bottom: 5px !important; line-height: 1.6 !important; }
                    </style>
                    <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
                        ${image ? `<img src="${image}" alt="${title}" style="width: 100%; border-radius: 8px; margin-bottom: 20px;" />` : ''}
                        <h2 style="color: #000; text-transform: uppercase; font-style: italic;">${title}</h2>
                        <p style="font-size: 16px; line-height: 1.6; color: #555;">${content}</p>
                        ${link ? `
                        <div style="margin: 30px 0;">
                            <a href="${link.startsWith('http') ? link : `https://newbi.live${link}`}" style="background: #39FF14; color: #000; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">View Details</a>
                        </div>
                        ` : ''}
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                        <p style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px;">Newbi Entertainment &bull; Exclusive Experiences</p>
                    </div>
                `;
                
                await sendMassEmail(uniqueEmails, title, htmlContent);
                console.log(`[Mass Email Triggered] Dispatched to ${uniqueEmails.length} recipients.`);
            }
        } catch (error) {
            console.error("Error triggering mass email broadcast:", error);
        }
    }
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
