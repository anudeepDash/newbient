/**
 * Outreach → WhatsApp → Campaign open: tell creators registered on the portal
 * that this campaign is live: the campaign_live_brief template ("View the brief"
 * button) once it's switched on, else campaign_invite (Apply button). Either has
 * the campaign's picture and opens app.newbi.live/c/<id>.
 *
 *   outreach-open-audience { campaignId }
 *     → { creators: [{ id, name, handle, city, followers, niches, phone, verified, cityMatch, nicheMatch, applied, told, whatsappOff, optedOut }],
 *         criteria: { cities, minFollowers, niches }, open, live, template }
 *   outreach-open-send { campaignId, creatorIds, criteria: { cities, min, niche, mode }, includeUnverified?, again? }
 *     (cities: the cities picked, empty = all; older pages send city: 'campaign'|'any' instead)
 *     → { queued, skipped: { noNumber, whatsappOff, already, notEligible, notMatching } }
 *
 * Who's listed: every creator registered on the portal (the creators collection)
 * whose profile isn't rejected or suspended. The
 * browser starts with the ones matching the campaign (its cities and the Nano
 * tier's follower minimum) who haven't applied or been told yet; the team can
 * widen that, add the campaign's niches, and choose all or any of the criteria
 * (src/lib/outreach/openAudience.js). The send checks the criteria again here:
 * at least one has to be set, and anyone picked who doesn't meet them is left
 * out, so it never goes to every registered creator. Sending is the team's choice each time (never automatic) and
 * goes through the outreach queue, one job per creator per campaign, shared
 * with the campaign announcement (api/_lib/campaignInvites.js), so nobody gets
 * it twice unless the team asks to send again. Numbers that replied STOP are
 * skipped by the queue. Unverified numbers are left out unless the team
 * includes them: a number typed on a form could be someone else's.
 */
import { nowIso } from './db.js';
import { isWhatsAppConfigured, toE164 } from './whatsapp.js';
import { contactIdFor } from './outreachThreads.js';
import { inviteJobId, inviteTemplate, queueCampaignInvites } from './campaignInvites.js';
import { applicationsOpen, campaignCities, minFollowersFor } from '../../src/lib/outreach/application.js';
import { isCampaignCityMatch, nicheKey } from '../../src/lib/constants.js';
import { activeCriteria, matchesCriteria } from '../../src/lib/outreach/openAudience.js';

const send = (res, status, body) => res.status(status).json(body);
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const MAX_SEND = 1000;
const OUT = new Set(['rejected', 'suspended', 'blocked', 'deleted']);

const followersOf = (c) => {
    const n = Number(String(c.instagramFollowers ?? c.followers ?? '').replace(/[,\s]/g, ''));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};
const numberOf = (c) => toE164(c.whatsapp || c.phone);
const eligible = (c) => !OUT.has(String(c.profileStatus || '').toLowerCase()) && !c.deletedAt;
const nichesOf = (c) => [...(Array.isArray(c.specializations) ? c.specializations : Array.isArray(c.niches) ? c.niches : []), c.category, c.niche].filter(Boolean);
/* The campaign's preferred niches (optional, set in the campaign editor). */
const wantedNiches = (campaign) => (Array.isArray(campaign.preferredNiches) ? campaign.preferredNiches : []).filter(Boolean);
export const nicheMatches = (campaign, c) => {
    const wanted = new Set(wantedNiches(campaign).map(nicheKey));
    return wanted.size > 0 && nichesOf(c).some(n => wanted.has(nicheKey(n)));
};
export const cityMatches = (campaign, city) => {
    const cities = campaignCities(campaign);
    return !cities.length || cities.some(cc => isCampaignCityMatch(cc, city));
};

/* What the campaign already knows: who applied (by account and number) and who was told (queued or sent). */
const campaignState = async (db, campaignId) => {
    const [apps, jobs] = await Promise.all([
        db.collection('campaigns').doc(campaignId).collection('applications').select('uid', 'phone', 'creatorId').get(),
        db.collection('outreach_queue').where('campaignId', '==', campaignId).where('kind', '==', 'template').select('status').get(),
    ]);
    const appliedUids = new Set();
    const appliedPhones = new Set();
    apps.docs.forEach((d) => {
        const a = d.data();
        if (a.uid) appliedUids.add(a.uid);
        if (a.creatorId) appliedUids.add(a.creatorId);
        if (a.phone) appliedPhones.add(toE164(a.phone));
    });
    const told = new Map(jobs.docs.map(d => [d.id, d.data().status]));
    return { appliedUids, appliedPhones, told };
};

const applied = (state, c, phone) => state.appliedUids.has(c.uid) || state.appliedUids.has(c.id) || (phone && state.appliedPhones.has(phone));

export const handleOpenAudience = async (req, res, { db }) => {
    const campaignId = str(req.body?.campaignId, 120);
    if (!campaignId) return send(res, 400, { success: false, error: 'campaignId is required' });
    const campSnap = await db.collection('campaigns').doc(campaignId).get();
    if (!campSnap.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const campaign = { id: campaignId, ...campSnap.data() };
    const [creatorsSnap, state, optSnap] = await Promise.all([
        db.collection('creators').get(),
        campaignState(db, campaignId),
        db.collection('creator_contacts').where('whatsappOptOut.at', '>', '').select().get().catch(() => ({ docs: [] })),
    ]);
    const optedOut = new Set(optSnap.docs.map(d => d.id));
    const creators = creatorsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(eligible).map((c) => {
        const phone = numberOf(c);
        const status = state.told.get(inviteJobId(campaignId, c.uid || c.id, phone));
        return {
            id: c.id,
            name: String(c.displayName || c.name || '').trim() || 'Unnamed creator',
            handle: String(c.instagram || c.handle || '').replace(/^@/, ''),
            city: String(c.city || '').trim(),
            followers: followersOf(c),
            niches: [...new Set(nichesOf(c))].slice(0, 3),
            phone: phone || '',
            verified: Boolean(c.isPhoneVerified),
            cityMatch: cityMatches(campaign, c.city),
            nicheMatch: nicheMatches(campaign, c),
            applied: applied(state, c, phone),
            told: status === 'sent' ? 'sent' : ['queued', 'sending'].includes(status) ? 'queued' : status === 'failed' ? 'failed' : null,
            whatsappOff: c.channelPrefs?.whatsapp === false,
            optedOut: Boolean(phone && optedOut.has(contactIdFor(phone))),
        };
    });
    return send(res, 200, {
        success: true,
        creators,
        criteria: { cities: campaignCities(campaign), minFollowers: minFollowersFor(campaign), niches: wantedNiches(campaign) },
        open: applicationsOpen(campaign).open,
        live: isWhatsAppConfigured() && Boolean(inviteTemplate()),
        template: inviteTemplate(),
    });
};

export const handleOpenSend = async (req, res, { db, actor }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    const ids = [...new Set((Array.isArray(b.creatorIds) ? b.creatorIds : []).map(id => str(id, 128)).filter(Boolean))];
    if (!campaignId || !ids.length) return send(res, 400, { success: false, error: 'Choose at least one creator.' });
    if (ids.length > MAX_SEND) return send(res, 400, { success: false, error: `Up to ${MAX_SEND} at a time.` });
    if (!isWhatsAppConfigured()) return send(res, 409, { success: false, error: 'The WhatsApp API isn’t set up yet.' });
    if (!inviteTemplate()) return send(res, 409, { success: false, error: 'Neither campaign_live_brief nor campaign_invite is switched on (WHATSAPP_TEMPLATE_CAMPAIGN_LIVE_BRIEF or _CAMPAIGN_INVITE).' });
    const campRef = db.collection('campaigns').doc(campaignId);
    const campSnap = await campRef.get();
    if (!campSnap.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const campaign = { id: campaignId, ...campSnap.data() };
    // The message says "apply", so the form has to be taking applications.
    if (!applicationsOpen(campaign).open) return send(res, 409, { success: false, error: 'This campaign isn’t taking applications. Set it to Open (and check the deadline) first.' });
    // Only the creators who fit what the team set, never everyone registered.
    const cr = b.criteria || {};
    const criteria = activeCriteria(
        {
            cities: Array.isArray(cr.cities) ? cr.cities : null,
            city: cr.city === 'any' ? 'any' : 'campaign',
            min: Math.max(0, Number(cr.min) || 0),
            niche: cr.niche === 'campaign' ? 'campaign' : 'any',
        },
        { cities: campaignCities(campaign), niches: wantedNiches(campaign) },
    );
    if (!criteria.length) return send(res, 400, { success: false, error: 'Set at least one criterion (cities, followers or niche), so this goes only to creators who fit.' });
    const mode = cr.mode === 'any' ? 'any' : 'all';
    const fits = (c) => matchesCriteria({ city: c.city, cityMatch: cityMatches(campaign, c.city), nicheMatch: nicheMatches(campaign, c), followers: followersOf(c) }, criteria, mode);

    const state = await campaignState(db, campaignId);
    const snaps = [];
    for (let i = 0; i < ids.length; i += 100) {
        snaps.push(...await db.getAll(...ids.slice(i, i + 100).map(id => db.collection('creators').doc(id))));
    }
    let notEligible = 0;
    let notMatching = 0;
    const creators = snaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() })).filter((c) => {
        const ok = eligible(c) && !applied(state, c, numberOf(c));
        if (!ok) { notEligible += 1; return false; }
        if (!fits(c)) { notMatching += 1; return false; }
        return true;
    });
    notEligible += snaps.filter(s => !s.exists).length;
    const out = await queueCampaignInvites({
        db, campaign, creators, again: b.again === true, createdBy: actor.actorEmail || 'Newbi team', verifiedOnly: b.includeUnverified !== true,
    });
    if (out.off) return send(res, 409, { success: false, error: 'The campaign-open template isn’t switched on.' });
    if (out.queued) {
        await campRef.collection('audit').doc().set({
            appId: null, field: 'campaign_open', from: null, to: `${out.queued} queued`, source: 'whatsapp_api',
            note: `Campaign-open message to ${out.queued} registered creator${out.queued === 1 ? '' : 's'}`, ...actor, at: nowIso(),
        });
    }
    return send(res, 200, { success: true, queued: out.queued, skipped: { ...out.skipped, notEligible, notMatching } });
};
