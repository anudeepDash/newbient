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

/*
 * Where each creator stands for this campaign, for the Campaign open list (one status each, most telling first):
 *   applied   they applied to the campaign (left alone)
 *   blocked   can't be messaged: no number, replied STOP, or turned WhatsApp off
 *   replied   wrote back after the message
 *   read · delivered · sent · queued   how the message went (WhatsApp's receipts)
 *   failed    the message didn't go (can be sent again)
 *   new       not messaged yet
 */
export const STATUS_ORDER = ['new', 'queued', 'sent', 'delivered', 'read', 'replied', 'failed', 'applied', 'blocked'];

export const statusOf = (c) => {
    if (c.applied) return 'applied';
    if (!c.phone || c.optedOut || c.whatsappOff) return 'blocked';
    const m = c.message;
    if (!m) return 'new';
    if (m.replied && m.status !== 'failed') return 'replied';
    return STATUS_ORDER.includes(m.status) ? m.status : 'new';
};

/* Ticked by default, and tickable without "send again": nobody has it yet, or it didn't go. */
export const needsMessage = (status) => status === 'new' || status === 'failed';

/* Already has it (or it's on its way): tickable only with "send again", except queued, which is still going out. */
export const hasMessage = (status) => ['sent', 'delivered', 'read', 'replied'].includes(status);
