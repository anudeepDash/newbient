/**
 * WhatsApp for a new campaign, sent only from Outreach → WhatsApp → Campaign
 * open (api/_lib/outreachOpenCall.js) to the registered creators the team picked
 * by its criteria. Announcing a campaign doesn't send WhatsApp (it did until
 * 4 Nov 2026, to everyone in the campaign's city). Each one gets the campaign_live_brief
 * template ("View the brief" button) once it's switched on, else campaign_invite
 * (Apply button), with the campaign's picture. Both open app.newbi.live/c/<id>.
 *
 * The messages go through the outreach send queue (outreach_queue, kind
 * 'template'), so they keep to the number's rate limit and skip anyone who
 * replied STOP. One job per creator per campaign (its id), so sending again
 * only re-sends when staff ask for it (`again`). Creators who
 * turned WhatsApp off in the app are left out. Nothing is queued until
 * WHATSAPP_TEMPLATE_CAMPAIGN_LIVE_BRIEF or WHATSAPP_TEMPLATE_CAMPAIGN_INVITE is set.
 */
import { APP_URL, getDb } from './db.js';
import { campaignImageOf, imageHeaderFor, isTemplateLive, isWhatsAppConfigured, toE164 } from './whatsapp.js';
import { enqueueJob, kickWorker, runQueue } from './outreachQueue.js';
import { firstName } from './mail/layout.js';
import { LIVE_BRIEF_TEMPLATE, STOP_PAYLOAD } from '../../src/lib/outreach/whatsappTemplate.js';

export const INVITE_TEMPLATE = 'campaign_invite';
export { LIVE_BRIEF_TEMPLATE };

/* The template a campaign-open message goes out with: the "View the brief" one once it's on, else the Apply one. Null when neither is. */
export const inviteTemplate = () => (isTemplateLive(LIVE_BRIEF_TEMPLATE) ? LIVE_BRIEF_TEMPLATE : isTemplateLive(INVITE_TEMPLATE) ? INVITE_TEMPLATE : null);
const MAX_INVITES = 1000;

const short = (s, n) => {
    const v = String(s || '').trim();
    return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v;
};

/* The number to use: their verified WhatsApp (or phone). Unverified numbers could be anyone's, so they're used only when the team says so. */
const whatsappOf = (c, verifiedOnly = true) => (c.isPhoneVerified || !verifiedOnly ? toE164(c.whatsapp || c.phone) : null);

/* One job per creator per campaign (older jobs from the announcement share it, so they count as already told). */
export const inviteJobId = (campaignId, uid, phone) => `invite_${campaignId}_${uid || String(phone || '').slice(1)}`.slice(0, 140);

/**
 * creators: the creator docs the team picked (already checked against the criteria).
 * → { queued, skipped: { noNumber, whatsappOff, already } }
 */
export const queueCampaignInvites = async ({ db = getDb(), campaign, creators, again = false, createdBy = 'Newbi app', start = true, verifiedOnly = true }) => {
    const out = { queued: 0, skipped: { noNumber: 0, whatsappOff: 0, already: 0 } };
    const template = inviteTemplate();
    if (!isWhatsAppConfigured() || !template || !campaign?.id) return { ...out, off: true };
    const header = imageHeaderFor(template, campaignImageOf(campaign));
    // campaign_live_brief has a Stop updates quick reply after its URL button.
    const buttons = [{ index: 0, param: campaign.id }, ...(template === LIVE_BRIEF_TEMPLATE ? [{ index: 1, payload: STOP_PAYLOAD }] : [])];
    const seen = new Set();
    for (const c of creators.slice(0, MAX_INVITES)) {
        const phone = whatsappOf(c, verifiedOnly);
        if (!phone || seen.has(phone)) { out.skipped.noNumber += phone ? 0 : 1; continue; }
        seen.add(phone);
        const uid = c.uid || c.id;
        const user = uid ? await db.collection('users').doc(uid).get().catch(() => null) : null;
        const prefs = { ...(c.channelPrefs || {}), ...(user?.exists ? user.data().channelPrefs || {} : {}) };
        if (prefs.whatsapp === false) { out.skipped.whatsappOff += 1; continue; }
        const name = c.displayName || c.name || '';
        const bodyParams = [firstName(name), short(campaign.title || 'a new campaign', 80)];
        const id = await enqueueJob(db, {
            id: inviteJobId(campaign.id, uid, phone),
            campaignId: campaign.id,
            kind: 'template',
            again,
            createdBy,
            data: {
                phone, name: name || null, template, language: null, header,
                bodyParams, buttons,
                text: `New campaign: ${bodyParams[1]}`,
            },
        });
        if (id) out.queued += 1; else out.skipped.already += 1;
    }
    // Start sending now: the background worker when it can be kicked, else a first batch here.
    if (out.queued && start) {
        const req = { headers: { host: new URL(APP_URL).host } };
        if (!(await kickWorker(req, 0).catch(() => false))) await runQueue({ db, deadline: Date.now() + 15_000 }).catch(() => null);
    }
    return out;
};
