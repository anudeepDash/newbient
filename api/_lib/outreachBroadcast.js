/**
 * Outreach → Send on WhatsApp: the team sends approved creators (shortlisted
 * onwards) one of three messages through the outreach queue (rate limit,
 * retries, STOP opt-outs, a copy in each inbox thread):
 *
 *   task_live    a live deliverable's brief and links (campaign_task_live), with
 *                their "Open my task" link. The same message goes by itself when a
 *                task is opened (api/_lib/postsOpen.js); this sends it again.
 *   group_link   the campaign's WhatsApp group, or another group link pasted here
 *                (campaign_group_link), with the signed "Joined" quick reply.
 *   update       a short note and a link (campaign_update).
 *   group_join   the reworded group invite with a join-by date (campaign_group_join).
 *   group_invite the group invite with a "Join the group" button instead of a pasted link (campaign_group_invite).
 *   reach_out    the first message to an imported number (campaign_creator_invite), "I'm interested".
 *   event_day    when, where and a note for the event (campaign_event_day), with their page link.
 *   brief_changed what changed in the brief (campaign_brief_updated), with their task link.
 *   not_selected applicants who weren't picked (campaign_not_selected).
 *
 * Nothing here is automatic: each send is an admin's choice. Passes stay in the
 * Send tickets sheet (they're never sent from here).
 *
 * Action: outreach-wa-send { campaignId, kind, appIds, taskId?, link?, note?, joinBy?, when?, where?, reward?, again? }
 *   → { queued, skipped: [{ id, reason }], worker }
 */
import { enqueueJob, kindLive, switchFor } from './outreachQueue.js';
import { queueTaskLive } from './postsOpen.js';
import { isWhatsAppConfigured } from './whatsapp.js';
import { isOnShortlist } from '../../src/lib/outreach/status.js';
import { taskWindow } from '../../src/lib/creator/tasks.js';
import { groupCodeOf } from '../../src/lib/outreach/whatsappTemplate.js';

/*
 * Who each message can go to. Most are for approved creators (shortlisted onwards); a first
 * reach-out goes to anyone not removed (imported numbers start as applicants), and "not picked"
 * only to applicants still waiting.
 */
const AUDIENCE = {
    task_live: (a) => isOnShortlist(a.status),
    group_link: (a) => isOnShortlist(a.status),
    group_join: (a) => isOnShortlist(a.status),
    group_invite: (a) => isOnShortlist(a.status),
    update: (a) => isOnShortlist(a.status),
    event_day: (a) => isOnShortlist(a.status),
    brief_changed: (a) => isOnShortlist(a.status),
    reach_out: (a) => a.status !== 'removed',
    not_selected: (a) => (a.status || 'applied') === 'applied',
};
const KINDS = new Set(Object.keys(AUDIENCE));
const MAX_IDS = 500;

const send = (res, status, body) => res.status(status).json(body);
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
// Template variables are one line (Meta refuses line breaks in them).
const oneLine = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const httpsUrl = (v) => {
    const u = str(v, 500);
    try { return new URL(u).protocol === 'https:' ? u : ''; } catch { return ''; }
};

export const handleWaSend = async (req, res, { db, actor, startWorker }) => {
    const b = req.body || {};
    const kind = str(b.kind, 20);
    if (!KINDS.has(kind)) return send(res, 400, { success: false, error: 'Choose what to send.' });
    if (!isWhatsAppConfigured()) return send(res, 409, { success: false, error: 'The WhatsApp API isn’t set up yet.' });
    if (!kindLive(kind)) {
        return send(res, 409, { success: false, error: `This WhatsApp template isn’t switched on yet. Submit it to Meta from WhatsApp → Templates, then set ${switchFor(kind)} in Vercel once it’s approved.` });
    }
    const campaignId = str(b.campaignId, 120);
    const ids = [...new Set((Array.isArray(b.appIds) ? b.appIds : []).map(id => str(id, 120)).filter(Boolean))];
    if (!campaignId || !ids.length) return send(res, 400, { success: false, error: 'Choose at least one person.' });
    if (ids.length > MAX_IDS) return send(res, 400, { success: false, error: `Up to ${MAX_IDS} at a time.` });
    const campRef = db.collection('campaigns').doc(campaignId);
    const campSnap = await campRef.get();
    if (!campSnap.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const campaign = campSnap.data();
    const createdBy = actor.actorEmail || 'Newbi team';

    let result;
    if (kind === 'task_live') {
        const task = (campaign.tasks || []).find(t => String(t.id) === str(b.taskId, 60));
        if (!task) return send(res, 400, { success: false, error: 'Choose a task.' });
        if (taskWindow(task) !== 'open') return send(res, 409, { success: false, error: 'Open this task first (Deliverables), then send it.' });
        result = await queueTaskLive({ db, campaignId, campaign, tasks: [task], appIds: ids, again: true, createdBy });
    } else {
        let data;
        if (kind === 'group_link' || kind === 'group_join' || kind === 'group_invite') {
            const priv = await campRef.collection('private').doc('outreach').get();
            const link = httpsUrl(b.link) || str(priv.data()?.whatsappGroupLink, 500) || str(campaign.whatsappLink, 500);
            if (!link) return send(res, 400, { success: false, error: 'Paste the group link (or add it in Settings).' });
            // The button carries only the invite code, so it has to be a chat.whatsapp.com link.
            if (kind === 'group_invite' && !groupCodeOf(link)) return send(res, 400, { success: false, error: 'Use the group’s invite link (https://chat.whatsapp.com/…).' });
            data = kind === 'group_link' ? { link } : { link, joinBy: oneLine(b.joinBy, 60) };
        } else if (kind === 'update') {
            const note = oneLine(b.note, 400);
            const link = httpsUrl(b.link);
            if (!note) return send(res, 400, { success: false, error: 'Write the update.' });
            if (!link) return send(res, 400, { success: false, error: 'Add a link starting with https://' });
            data = { note, link };
        } else if (kind === 'brief_changed') {
            const note = oneLine(b.note, 400);
            if (!note) return send(res, 400, { success: false, error: 'Say what changed in the brief.' });
            data = { note };
        } else if (kind === 'event_day') {
            const when = oneLine(b.when, 80);
            const where = oneLine(b.where, 140);
            if (!when || !where) return send(res, 400, { success: false, error: 'Add when and where.' });
            data = { when, where, note: oneLine(b.note, 200) };
        } else if (kind === 'reach_out') {
            data = { reward: oneLine(b.reward, 160) };
        } else {
            data = {};
        }
        result = { queued: 0, skipped: [] };
        const again = b.again === true;
        for (const appId of ids) {
            const snap = await campRef.collection('applications').doc(appId).get();
            const a = snap.exists ? snap.data() : null;
            if (!a) { result.skipped.push({ id: appId, reason: 'not_found' }); continue; }
            if (!AUDIENCE[kind](a)) { result.skipped.push({ id: appId, reason: kind === 'not_selected' ? 'not_applicant' : 'not_approved' }); continue; }
            if (!a.phone) { result.skipped.push({ id: appId, reason: 'no_phone' }); continue; }
            if (await enqueueJob(db, { campaignId, appId, kind, data, createdBy, again })) result.queued += 1;
            else result.skipped.push({ id: appId, reason: 'already_sent' });
        }
    }
    const worker = result.queued ? await startWorker(req, db) : { started: false };
    return send(res, 200, { success: true, ...result, worker });
};
