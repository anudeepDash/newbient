/**
 * Outreach → WhatsApp → Campaign open: tell creators registered on the portal
 * that this campaign takes applications, with the campaign_invite template
 * (the campaign's picture and an Apply button to app.newbi.live/c/<id>).
 *
 *   outreach-open-audience { campaignId }
 *     → { creators: [{ id, name, handle, city, followers, niches, phone, verified, cityMatch, applied, told, whatsappOff, optedOut }],
 *         criteria: { cities, minFollowers }, open }
 *   outreach-open-send { campaignId, creatorIds, includeUnverified?, again? }
 *     → { queued, skipped: { noNumber, whatsappOff, already, notEligible } }
 *
 * Who's listed: every creator profile that isn't rejected or suspended. The
 * browser starts with the ones matching the campaign (its cities and the Nano
 * tier's follower minimum) who haven't applied or been told yet; the team can
 * widen that. Sending is the team's choice each time (never automatic) and
 * goes through the outreach queue, one job per creator per campaign, shared
 * with the campaign announcement (api/_lib/campaignInvites.js), so nobody gets
 * it twice unless the team asks to send again. Numbers that replied STOP are
 * skipped by the queue. Unverified numbers are left out unless the team
 * includes them: a number typed on a form could be someone else's.
 */
import { nowIso } from './db.js';
import { isTemplateLive, isWhatsAppConfigured, toE164 } from './whatsapp.js';
import { contactIdFor } from './outreachThreads.js';
import { INVITE_TEMPLATE, inviteJobId, queueCampaignInvites } from './campaignInvites.js';
import { applicationsOpen, campaignCities, minFollowersFor } from '../../src/lib/outreach/application.js';
import { isCampaignCityMatch } from '../../src/lib/constants.js';

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
            niches: (Array.isArray(c.niches) ? c.niches : [c.niche || c.category].filter(Boolean)).slice(0, 3),
            phone: phone || '',
            verified: Boolean(c.isPhoneVerified),
            cityMatch: cityMatches(campaign, c.city),
            applied: applied(state, c, phone),
            told: status === 'sent' ? 'sent' : ['queued', 'sending'].includes(status) ? 'queued' : status === 'failed' ? 'failed' : null,
            whatsappOff: c.channelPrefs?.whatsapp === false,
            optedOut: Boolean(phone && optedOut.has(contactIdFor(phone))),
        };
    });
    return send(res, 200, {
        success: true,
        creators,
        criteria: { cities: campaignCities(campaign), minFollowers: minFollowersFor(campaign) },
        open: applicationsOpen(campaign).open,
        live: isWhatsAppConfigured() && isTemplateLive(INVITE_TEMPLATE),
    });
};

export const handleOpenSend = async (req, res, { db, actor }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    const ids = [...new Set((Array.isArray(b.creatorIds) ? b.creatorIds : []).map(id => str(id, 128)).filter(Boolean))];
    if (!campaignId || !ids.length) return send(res, 400, { success: false, error: 'Choose at least one creator.' });
    if (ids.length > MAX_SEND) return send(res, 400, { success: false, error: `Up to ${MAX_SEND} at a time.` });
    if (!isWhatsAppConfigured()) return send(res, 409, { success: false, error: 'The WhatsApp API isn’t set up yet.' });
    if (!isTemplateLive(INVITE_TEMPLATE)) return send(res, 409, { success: false, error: 'The campaign_invite template isn’t switched on (WHATSAPP_TEMPLATE_CAMPAIGN_INVITE).' });
    const campRef = db.collection('campaigns').doc(campaignId);
    const campSnap = await campRef.get();
    if (!campSnap.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const campaign = { id: campaignId, ...campSnap.data() };
    // The message says "apply", so the form has to be taking applications.
    if (!applicationsOpen(campaign).open) return send(res, 409, { success: false, error: 'This campaign isn’t taking applications. Set it to Open (and check the deadline) first.' });

    const state = await campaignState(db, campaignId);
    const snaps = [];
    for (let i = 0; i < ids.length; i += 100) {
        snaps.push(...await db.getAll(...ids.slice(i, i + 100).map(id => db.collection('creators').doc(id))));
    }
    let notEligible = 0;
    const creators = snaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() })).filter((c) => {
        const ok = eligible(c) && !applied(state, c, numberOf(c));
        if (!ok) notEligible += 1;
        return ok;
    });
    notEligible += snaps.filter(s => !s.exists).length;
    const out = await queueCampaignInvites({
        db, campaign, creators, again: b.again === true, createdBy: actor.actorEmail || 'Newbi team', verifiedOnly: b.includeUnverified !== true,
    });
    if (out.off) return send(res, 409, { success: false, error: 'The campaign_invite template isn’t switched on.' });
    if (out.queued) {
        await campRef.collection('audit').doc().set({
            appId: null, field: 'campaign_open', from: null, to: `${out.queued} queued`, source: 'whatsapp_api',
            note: `Campaign-open message to ${out.queued} registered creator${out.queued === 1 ? '' : 's'}`, ...actor, at: nowIso(),
        });
    }
    return send(res, 200, { success: true, queued: out.queued, skipped: { ...out.skipped, notEligible } });
};
