/**
 * WhatsApp for a new campaign: every creator it was announced to (same city
 * match as the email) with a verified WhatsApp number gets the campaign_invite
 * template, with the campaign's picture and an Apply button.
 *
 * The messages go through the outreach send queue (outreach_queue, kind
 * 'template'), so they keep to the number's rate limit and skip anyone who
 * replied STOP. One job per creator per campaign (its id), so announcing the
 * campaign again only re-sends when staff ask for it (`again`). Creators who
 * turned WhatsApp off in the app are left out. Nothing is queued until
 * WHATSAPP_TEMPLATE_CAMPAIGN_INVITE is set.
 */
import { APP_URL, getDb } from './db.js';
import { campaignImageOf, imageHeaderFor, isTemplateLive, isWhatsAppConfigured, toE164 } from './whatsapp.js';
import { enqueueJob, kickWorker, runQueue } from './outreachQueue.js';
import { firstName } from './mail/layout.js';

export const INVITE_TEMPLATE = 'campaign_invite';
const MAX_INVITES = 1000;

const short = (s, n) => {
    const v = String(s || '').trim();
    return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v;
};

/* The number to use: their verified WhatsApp (or phone). Unverified numbers could be anyone's. */
const whatsappOf = (c) => (c.isPhoneVerified ? toE164(c.whatsapp || c.phone) : null);

/**
 * creators: the docs the campaign was announced to (already city-matched).
 * → { queued, skipped: { noNumber, whatsappOff, already } }
 */
export const queueCampaignInvites = async ({ db = getDb(), campaign, creators, again = false, createdBy = 'Newbi app', start = true }) => {
    const out = { queued: 0, skipped: { noNumber: 0, whatsappOff: 0, already: 0 } };
    if (!isWhatsAppConfigured() || !isTemplateLive(INVITE_TEMPLATE) || !campaign?.id) return { ...out, off: true };
    const header = imageHeaderFor(INVITE_TEMPLATE, campaignImageOf(campaign));
    const seen = new Set();
    for (const c of creators.slice(0, MAX_INVITES)) {
        const phone = whatsappOf(c);
        if (!phone || seen.has(phone)) { out.skipped.noNumber += phone ? 0 : 1; continue; }
        seen.add(phone);
        const uid = c.uid || c.id;
        const user = uid ? await db.collection('users').doc(uid).get().catch(() => null) : null;
        const prefs = { ...(c.channelPrefs || {}), ...(user?.exists ? user.data().channelPrefs || {} : {}) };
        if (prefs.whatsapp === false) { out.skipped.whatsappOff += 1; continue; }
        const name = c.displayName || c.name || '';
        const bodyParams = [firstName(name), short(campaign.title || 'a new campaign', 80)];
        const id = await enqueueJob(db, {
            id: `invite_${campaign.id}_${uid || phone.slice(1)}`.slice(0, 140),
            campaignId: campaign.id,
            kind: 'template',
            again,
            createdBy,
            data: {
                phone, name: name || null, template: INVITE_TEMPLATE, language: null, header,
                bodyParams, buttons: [{ index: 0, param: campaign.id }],
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
