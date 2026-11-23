/*
 * "Email the campaign details": what one creator signed up for, as an email they can keep (template
 * campaign-details). The team pastes an email address (Outreach → Message → Email details), picks
 * what to include, and it goes from creators@newbi.live. The server builds the same data from the
 * stored campaign (api/_lib/outreachEmailDetails.js); the admin uses this for its preview.
 */
import { briefSummary } from './taskBrief.js';

const str = (v, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const dayOf = (v) => (String(v || '').match(/^\d{4}-\d{2}-\d{2}/) || [''])[0];

const PASS_KIND = { qr: 'entry pass', confirmation: 'confirmed entry', guestlist: 'guestlist place' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : (word.endsWith('s') ? 'es' : 's')}`;

/** The sections the team can leave out. All on by default (the group only when there is a link). */
export const DETAIL_SECTIONS = [
    { key: 'event', label: 'Event: date, time and venue' },
    { key: 'rewards', label: 'What they get' },
    { key: 'deliverables', label: 'What to post, with due dates' },
    { key: 'group', label: 'WhatsApp group link' },
];

export const MAX_NOTE = 600;

/**
 * The campaign-details email data.
 * opts: { name, reward (overrides the campaign's), note, include: { event, rewards, deliverables, group },
 *         groupLink, event (the linked event: { title, date, time, venue }), campaignUrl }
 */
export const campaignDetailsData = (campaign = {}, opts = {}) => {
    const inc = { event: true, rewards: true, deliverables: true, group: true, ...(opts.include || {}) };
    const ev = opts.event || {};
    const event = {
        name: str(campaign.eventName || ev.title, 120),
        date: dayOf(campaign.eventDate) || dayOf(ev.date),
        time: str(campaign.eventTime || ev.time, 40),
        venue: str(campaign.venue || ev.venue, 160),
    };
    const hasEvent = Boolean(event.name || event.date || event.venue);
    const payout = Number(campaign.payoutPerCreator) || 0;
    const passes = Number(campaign.ticketsPerCreator) || 1;
    const city = str(campaign.targetCity, 60);
    return {
        name: str(opts.name, 80),
        campaignTitle: str(campaign.title, 120) || 'your campaign',
        brand: str(campaign.brand || campaign.brandName, 80),
        city: city && city.toLowerCase() !== 'any' ? city : '',
        image: campaign.image || campaign.coverImage || campaign.bannerImage || campaign.thumbnail || '',
        note: String(opts.note || '').trim().slice(0, MAX_NOTE),
        event: inc.event && hasEvent ? event : null,
        rewards: inc.rewards ? {
            reward: str(opts.reward !== undefined && opts.reward !== null && String(opts.reward).trim() ? opts.reward : campaign.reward, 200),
            payout: payout > 0 ? `₹${payout.toLocaleString('en-IN')}` : '',
            passes: hasEvent || campaign.eventId ? plural(passes, PASS_KIND[campaign.passKind] || PASS_KIND.qr) : '',
        } : null,
        deliverables: inc.deliverables ? (Array.isArray(campaign.tasks) ? campaign.tasks : [])
            .filter(t => t && t.id !== undefined && t.id !== null)
            .slice(0, 12)
            .map(t => ({
                title: str(t.title, 80) || 'Deliverable',
                due: dayOf(t.deadline) || dayOf(campaign.postingDeadline),
                summary: briefSummary(t, 200),
            })) : [],
        groupLink: inc.group && /^https:\/\/\S+$/.test(String(opts.groupLink || '').trim()) ? String(opts.groupLink).trim() : '',
        campaignUrl: opts.campaignUrl || '',
    };
};
