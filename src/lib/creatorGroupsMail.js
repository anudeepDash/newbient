import { generateCreatorGroupsBroadcastHTML } from './email';
import { queueCampaign } from './mailApi';

/**
 * Emails the creator WhatsApp-group announcement to a list of creators
 * through the server queue (sent in batches, so the tab can close).
 * Resolves { success, queued, sentCount, campaignId, failed }.
 */
export const queueCreatorGroupsBroadcast = async (recipientList, {
    city = 'Bengaluru',
    groupUrl = 'https://chat.whatsapp.com/K6MtDAOlZ7s7AUtOFHxduU?mode=gi_t',
    customSubject = '',
    customMessage = '',
    availableGroups = [],
} = {}) => {
    try {
        const subject = customSubject.trim() || `Official ${city ? `${city} ` : ''}Creator WhatsApp community is live`;
        const html = generateCreatorGroupsBroadcastHTML({ creatorName: '{{first_name}}', city, groupUrl, customMessage, availableGroups });
        const res = await queueCampaign({
            recipients: recipientList,
            subject,
            html,
            accountType: 'creators',
            fromName: 'Newbi Creators',
            fromEmail: 'creators@newbi.live',
            meta: { category: 'CREATORS', recipientType: `creator-groups:${city || 'all'}` },
        });
        return { success: true, queued: res.queued, sent: res.queued, sentCount: res.queued, failed: 0, campaignId: res.campaignId };
    } catch (error) {
        console.error('Failed to queue the creator groups email:', error);
        return { success: false, error: error.message || 'Broadcast failed', sent: 0, sentCount: 0, failed: recipientList?.length || 0 };
    }
};
