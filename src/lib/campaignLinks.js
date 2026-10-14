import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getPublicSiteUrl } from './siteUrl';

// Shared helpers for resolving creator campaign deep links
// (/campaign/:id, /creator-dashboard?campaignId=..., notification links).

export const normalizeCampaignId = (id) => {
    let value = String(id || '');
    try { value = decodeURIComponent(value); } catch { /* keep raw value */ }
    return value.trim().replace(/\/+$/, '');
};

export const findCampaignById = (campaigns, id) => {
    const target = normalizeCampaignId(id);
    if (!target || !Array.isArray(campaigns)) return null;
    const lower = target.toLowerCase();
    return campaigns.find(c => c?.id === target) ||
        campaigns.find(c => c?.id && c.id.toLowerCase() === lower) ||
        null;
};

// Direct Firestore read used when the live campaigns listener has not delivered
// the campaign yet (slow network, listener denied for signed-out visitors, etc).
export const fetchCampaignById = async (id) => {
    const target = normalizeCampaignId(id);
    if (!target) return null;
    try {
        const snap = await getDoc(doc(db, 'campaigns', target));
        if (snap.exists()) return { ...snap.data(), id: snap.id };
    } catch (err) {
        console.warn('[campaignLinks] Direct campaign lookup failed:', err?.message || err);
    }
    return null;
};

export const buildCampaignUrl = (campaignId, taskId) => {
    const base = `${getPublicSiteUrl()}/campaign/${encodeURIComponent(campaignId)}`;
    return taskId ? `${base}?taskId=${encodeURIComponent(taskId)}` : base;
};

// In-app link a creator should land on for a specific campaign.
export const creatorCampaignPath = (campaignId) =>
    campaignId ? `/creator-dashboard?campaignId=${encodeURIComponent(campaignId)}` : '/creator-dashboard';
