import { useStore } from './store';
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const getNotificationIcon = (type, title) => {
    let category = 'announcement';
    const t = (title || '').toUpperCase();
    const typeStr = (type || '').toLowerCase();
    
    if (typeStr === 'message' || t.includes('MESSAGE')) category = 'message';
    else if (typeStr === 'ticket' || t.includes('TICKET')) category = 'ticket';
    else if (typeStr === 'campaign' || t.includes('CAMPAIGN')) category = 'campaign';
    else if (typeStr === 'event' || t.includes('EVENT')) category = 'event';
    else if (typeStr === 'volunteer' || t.includes('VOLUNTEER') || t.includes('SQUAD')) category = 'volunteer';
    else if (typeStr === 'guestlist' || t.includes('GUESTLIST')) category = 'guestlist';
    else if (typeStr === 'giveaway' || t.includes('GIVEAWAY')) category = 'giveaway';
    else if (typeStr === 'form' || t.includes('FORM')) category = 'form';
    else if (typeStr === 'blog' || t.includes('BLOG') || t.includes('POST')) category = 'blog';
    else if (typeStr === 'task' || t.includes('TASK')) category = 'task';

    try {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 256, 256);
        if (category === 'message') {
            grad.addColorStop(0, '#00C9FF'); grad.addColorStop(1, '#92FE9D');
        } else if (category === 'ticket') {
            grad.addColorStop(0, '#F7971E'); grad.addColorStop(1, '#FFD200');
        } else if (category === 'campaign') {
            grad.addColorStop(0, '#FF416C'); grad.addColorStop(1, '#FF4B2B');
        } else if (category === 'event') {
            grad.addColorStop(0, '#8A2387'); grad.addColorStop(1, '#E94057');
        } else if (category === 'volunteer') {
            grad.addColorStop(0, '#11998e'); grad.addColorStop(1, '#38ef7d');
        } else if (category === 'guestlist') {
            grad.addColorStop(0, '#b92b27'); grad.addColorStop(1, '#1565C0');
        } else if (category === 'giveaway') {
            grad.addColorStop(0, '#ffe000'); grad.addColorStop(1, '#799F0C');
        } else if (category === 'form') {
            grad.addColorStop(0, '#3a7bd5'); grad.addColorStop(1, '#3a6073');
        } else if (category === 'blog') {
            grad.addColorStop(0, '#DA22FF'); grad.addColorStop(1, '#9733EE');
        } else if (category === 'task') {
            grad.addColorStop(0, '#f12711'); grad.addColorStop(1, '#f5af19');
        } else {
            grad.addColorStop(0, '#39FF14'); grad.addColorStop(1, '#0072FF');
        }

        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, 256, 256);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(128, 128, 116, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 110px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let symbol = '📢';
        if (category === 'message') symbol = '💬';
        else if (category === 'ticket') symbol = '🎟️';
        else if (category === 'campaign') symbol = '🚀';
        else if (category === 'event') symbol = '📅';
        else if (category === 'volunteer') symbol = '🤝';
        else if (category === 'guestlist') symbol = '✨';
        else if (category === 'giveaway') symbol = '🎁';
        else if (category === 'form') symbol = '📋';
        else if (category === 'blog') symbol = '📰';
        else if (category === 'task') symbol = '✅';

        ctx.fillText(symbol, 128, 138);

        return canvas.toDataURL('image/png');
    } catch (e) {
        console.error("Canvas icon generation failed, fallback to favicon", e);
        return '/favicon.png';
    }
};

/**
 * Triggers an in-app and potentially a push notification.
 */
export const triggerNotification = async ({ userId, type, title, content, link, image }) => {
    const { addNotification } = useStore.getState();
    const resolvedImage = image || getNotificationIcon(type, title);
    
    const notificationData = {
        userId: userId || null, // null means global
        type: type || 'announcement',
        title,
        content,
        link: link || '',
        image: resolvedImage,
    };

    await addNotification(notificationData);
    console.log(`[Notification Triggered] Type: ${type}, Title: ${title}`);

    // Show Native OS Notification if permitted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: content,
                icon: resolvedImage,
                badge: '/favicon.png', // Small icon for mobile status bar
                data: { link: link || '' } 
            });
        } catch (e) {
            console.error("Error showing native notification:", e);
        }
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
