/**
 * Outreach → WhatsApp → Campaign open: tell creators registered on the portal
 * that this campaign is live: the campaign_live_brief template ("View the brief"
 * button) once it's switched on, else campaign_invite (Apply button). Either has
 * the campaign's picture and opens app.newbi.live/c/<id>.
 *
 *   outreach-open-audience { campaignId }
 *     → { creators: [{ id, name, handle, city, followers, niches, phone, verified, cityMatch, nicheMatch, applied, told,
 *                      message: { status: queued|sent|delivered|read|failed, at, error, replied, repliedAt } | null,
 *                      whatsappOff, optedOut }],
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

const RECEIPTS = new Set(['delivered', 'read', 'failed']);

/*
 * How each of this campaign's messages went, by job id: the queue job (queued, sent, failed; a cancelled one was
 * never sent), then WhatsApp's receipts on the send log (delivered, read, or failed after sending), then whether
 * they wrote back to the Newbi number after it went (outreach_inbox lastInboundAt).
 */
const messageStates = async (db, jobs) => {
    const out = new Map();
    jobs.forEach((d) => {
        const j = d.data();
        const status = j.status === 'sending' ? 'queued' : j.status;
        if (!['queued', 'sent', 'failed'].includes(status)) return;
        out.set(d.id, {
            status, at: j.sentAt || j.createdAt || null, error: status === 'failed' ? j.lastError || null : null,
            messageId: j.messageId || null, phone: j.data?.phone || null, sentAt: j.sentAt || null, replied: false, repliedAt: null,
        });
    });
    const sent = [...out.values()].filter(m => m.status === 'sent');
    const byMessage = new Map(sent.filter(m => m.messageId).map(m => [m.messageId, m]));
    const ids = [...byMessage.keys()];
    for (let i = 0; i < ids.length; i += 30) {
        const snap = await db.collection('message_log').where('messageId', 'in', ids.slice(i, i + 30)).select('messageId', 'status', 'statusTimes', 'error').get().catch(() => ({ docs: [] }));
        snap.docs.forEach((d) => {
            const l = d.data();
            const m = byMessage.get(l.messageId);
            if (!m || !RECEIPTS.has(l.status)) return;
            m.status = l.status;
            m.at = l.statusTimes?.[l.status] || m.at;
            if (l.status === 'failed') m.error = l.error || null;
        });
    }
    const phones = [...new Set(sent.map(m => m.phone).filter(Boolean))];
    const lastIn = new Map();
    for (let i = 0; i < phones.length; i += 100) {
        const chunk = phones.slice(i, i + 100);
        const snaps = await db.getAll(...chunk.map(p => db.collection('outreach_inbox').doc(contactIdFor(p)))).catch(() => []);
        snaps.forEach((s, k) => { if (s.exists && s.data().lastInboundAt) lastIn.set(chunk[k], s.data().lastInboundAt); });
    }
    sent.forEach((m) => {
        const t = lastIn.get(m.phone);
        if (t && m.sentAt && Date.parse(t) >= Date.parse(m.sentAt)) { m.replied = true; m.repliedAt = t; }
    });
    return out;
};

/* What the campaign already knows: who applied (by account and number) and how each message went. */
const campaignState = async (db, campaignId, { receipts = false } = {}) => {
    const [apps, jobs] = await Promise.all([
        db.collection('campaigns').doc(campaignId).collection('applications').select('uid', 'phone', 'creatorId').get(),
        db.collection('outreach_queue').where('campaignId', '==', campaignId).where('kind', '==', 'template')
            .select('status', 'messageId', 'sentAt', 'createdAt', 'lastError', 'data.phone').get(),
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
    const messages = receipts ? await messageStates(db, jobs.docs) : new Map();
    return { appliedUids, appliedPhones, told, messages };
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
        campaignState(db, campaignId, { receipts: true }),
        db.collection('creator_contacts').where('whatsappOptOut.at', '>', '').select().get().catch(() => ({ docs: [] })),
    ]);
    const optedOut = new Set(optSnap.docs.map(d => d.id));
    const creators = creatorsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(eligible).map((c) => {
        const phone = numberOf(c);
        const m = state.messages.get(inviteJobId(campaignId, c.uid || c.id, phone)) || null;
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
            told: !m ? null : m.status === 'failed' ? 'failed' : m.status === 'queued' ? 'queued' : 'sent',
            message: m ? { status: m.status, at: m.at, error: m.error, replied: m.replied, repliedAt: m.repliedAt } : null,
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
