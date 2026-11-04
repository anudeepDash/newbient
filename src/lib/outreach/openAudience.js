/*
 * Who Outreach → WhatsApp → Campaign open goes to, from the criteria the team
 * sets (src/components/admin/campaigns/outreach/CampaignOpenPanel.jsx).
 *
 *   city      'campaign' (in the campaign's cities) | 'any'
 *   min       follower minimum (0 = none)
 *   niche     'campaign' (in the campaign's preferred niches) | 'any'
 *   mode      'all': must meet every criterion that's set; 'any': at least one
 *
 * A criterion counts as set only when it narrows anything: a city match when
 * the campaign has cities, followers above 0, a niche match when the campaign
 * has preferred niches. With nothing set, everyone matches.
 */
export const activeCriteria = ({ city = 'campaign', min = 0, niche = 'any' } = {}, campaign = {}) => [
    city === 'campaign' && (campaign.cities || []).length ? (c) => Boolean(c.cityMatch) : null,
    min > 0 ? (c) => Number(c.followers || 0) >= min : null,
    niche === 'campaign' && (campaign.niches || []).length ? (c) => Boolean(c.nicheMatch) : null,
].filter(Boolean);

export const matchesCriteria = (creator, criteria = [], mode = 'all') => {
    if (!criteria.length) return true;
    return mode === 'any' ? criteria.some(test => test(creator)) : criteria.every(test => test(creator));
};
