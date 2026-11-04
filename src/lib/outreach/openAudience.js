import { isCampaignCityMatch } from '../constants.js';

/*
 * Who Outreach → WhatsApp → Campaign open goes to, from the criteria the team
 * sets (src/components/admin/campaigns/outreach/CampaignOpenPanel.jsx).
 *
 *   cities    the cities picked (like the creator admin's city filter; it
 *             starts with the campaign's). Empty = all cities.
 *   city      older pages: 'campaign' (the campaign's cities) | 'any'.
 *             Ignored when `cities` is a list.
 *   min       follower minimum (0 = none)
 *   niche     'campaign' (in the campaign's preferred niches) | 'any'
 *   mode      'all': must meet every criterion that's set; 'any': at least one
 *
 * A criterion counts as set only when it narrows anything: some cities picked
 * (or the campaign's, when it has any), followers above 0, a niche match when
 * the campaign has preferred niches. With nothing set, everyone matches.
 */

// Words that match every city in isCampaignCityMatch; picking one would mean "everyone", so they're dropped.
const EVERYWHERE = new Set(['any', 'all', 'universal', 'pan-india', 'global', 'remote', 'national', 'any hub', 'others', 'pan-india / remote']);

export const cleanCities = (list) => [...new Set((Array.isArray(list) ? list : [])
    .map(c => String(c ?? '').trim().slice(0, 80))
    .filter(c => c && !EVERYWHERE.has(c.toLowerCase())))].slice(0, 100);

export const inCities = (cities, city) => cities.some(ct => isCampaignCityMatch(ct, city) && Boolean(String(city || '').trim()));

export const activeCriteria = ({ cities = null, city = 'campaign', min = 0, niche = 'any' } = {}, campaign = {}) => {
    const picked = Array.isArray(cities) ? cleanCities(cities) : null;
    return [
        picked
            ? (picked.length ? (c) => inCities(picked, c.city) : null)
            : (city === 'campaign' && (campaign.cities || []).length ? (c) => Boolean(c.cityMatch) : null),
        min > 0 ? (c) => Number(c.followers || 0) >= min : null,
        niche === 'campaign' && (campaign.niches || []).length ? (c) => Boolean(c.nicheMatch) : null,
    ].filter(Boolean);
};

export const matchesCriteria = (creator, criteria = [], mode = 'all') => {
    if (!criteria.length) return true;
    return mode === 'any' ? criteria.some(test => test(creator)) : criteria.every(test => test(creator));
};
