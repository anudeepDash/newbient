import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../lib/store/appStore';
import { taskProgress } from '../../lib/creator/tasks';
import { isPresent } from '../../lib/present';

/*
 * What the creator pages read. Everything is the signed-in creator's own
 * data (creators/{uid}, their submission records) plus public campaigns; the
 * referral list and leaderboard come from the server.
 */

const MAX_SUBMISSION_LISTENERS = 25;

/* uid plus the older ids a submission may be keyed by on the campaign doc. */
export const creatorWho = (creator, authUser, record = null) => ({
    uid: authUser?.uid || creator?.uid || null,
    keys: [creator?.id, creator?.uid, creator?.creatorId].filter(Boolean),
    record,
});

export const isInCampaign = (creator, campaignId) =>
    (creator?.joinedCampaigns || []).includes(campaignId) || (creator?.shortlistedCampaigns || []).includes(campaignId);
export const isShortlisted = (creator, campaignId) => (creator?.shortlistedCampaigns || []).includes(campaignId);

/* Campaigns aimed at a college are shown only to creators from it (the creator's college or the profile's). */
export const matchesCollege = (campaign, creator, profile) => {
    const target = String(campaign?.targetCollege || '').trim();
    if (!isPresent(target) || target.toLowerCase() === 'any') return true;
    return [creator?.collegeName, profile?.college]
        .map(v => String(v || '').toLowerCase())
        .some(mine => mine && mine.includes(target.toLowerCase()));
};

/* The city campaigns are matched against: the profile's (where people change it), else the creator doc's. Same as the server. */
export const creatorCity = (creator, profile) => profile?.city || creator?.city || null;

/* Campaigns you applied to or were picked for, open or not, with your progress on each. */
export function useMyCampaigns(creator) {
    const authUser = useAppStore(s => s.authUser);
    const open = useAppStore(s => s.openCampaigns);
    const byId = useAppStore(s => s.campaignsById);
    const records = useAppStore(s => s.mySubmissions);
    const loadCampaign = useAppStore(s => s.loadCampaign);
    const subscribeMySubmission = useAppStore(s => s.subscribeMySubmission);

    const ids = useMemo(() => Array.from(new Set([...(creator?.joinedCampaigns || []), ...(creator?.shortlistedCampaigns || [])])), [creator?.joinedCampaigns, creator?.shortlistedCampaigns]);
    const openById = useMemo(() => new Map((open || []).map(c => [c.id, c])), [open]);
    const idsKey = ids.join(',');

    useEffect(() => {
        ids.forEach(id => { if (!openById.has(id)) loadCampaign(id); });
        // eslint-disable-next-line
    }, [idsKey, openById]);

    useEffect(() => {
        const unsubs = ids.slice(0, MAX_SUBMISSION_LISTENERS).map(id => subscribeMySubmission(id));
        return () => unsubs.forEach(fn => fn?.());
        // eslint-disable-next-line
    }, [idsKey, authUser?.uid]);

    return useMemo(() => ids
        .map(id => openById.get(id) || byId[id])
        .filter(Boolean)
        .map(campaign => ({
            campaign,
            shortlisted: isShortlisted(creator, campaign.id),
            progress: taskProgress(campaign, creatorWho(creator, authUser, records[campaign.id])),
        })), [ids, openById, byId, records, creator, authUser]);
}

export function useReferrals(enabled) {
    const referrals = useAppStore(s => s.referrals);
    const loadReferrals = useAppStore(s => s.loadReferrals);
    useEffect(() => { if (enabled) loadReferrals(); }, [enabled, loadReferrals]);
    return referrals;
}
