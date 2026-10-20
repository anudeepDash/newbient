/**
 * One call to reach a person on every channel they use:
 *
 *   const delivery = await notify('campaign-ticket', uid, data, { ref: { collection: 'passes', id } });
 *   // → { email: {status, id, error}, whatsapp: {status, messageId}, push: {...}, inApp: {...} }
 *
 * Email, WhatsApp, push and the in-app feed go out in parallel; one failing
 * never stops the others. Preferences:
 *   users/{uid}.emailPrefs   { product, events, creator, newsletter }  (false = off)
 *   users/{uid}.channelPrefs { whatsapp, push }                      (false = off)
 * Tickets and passes are transactional: they ignore emailPrefs, and WhatsApp
 * is only skipped when the person turned it off.
 *
 * WhatsApp goes out once the template is approved in Meta and the owner sets
 * WHATSAPP_TEMPLATE_<NAME> (e.g. WHATSAPP_TEMPLATE_PASS_CONFIRMED=pass_confirmed).
 * campaign-ticket and pass-confirmed always use it; creator-approved and
 * campaign-invite only if those optional templates are set up too.
 */
import { getDb, nowIso, SITE_URL, APP_URL } from './db.js';
import { sendTransactional } from './mail/send.js';
import { sendTemplate, toE164 } from './whatsapp.js';
import { sendPush } from './push.js';
import { formatDate, firstName } from './mail/layout.js';

const short = (s, n = 60) => {
    const v = String(s || '').trim();
    return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v;
};

// Passes open in the app (app.newbi.live/p/REF); PUBLIC_APP_URL overrides the host.
const PASS_ORIGIN = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');
const passLink = (d) => d.passUrl || (d.ref ? `${PASS_ORIGIN}/p/${encodeURIComponent(d.ref)}` : `${PASS_ORIGIN}/`);

/*
 * Copy rules for push and in-app (keep new events to them):
 * - Say what happened and name it: the event, the campaign, the task.
 * - The body is the one next step or the one detail that matters.
 * - Plain words. No emoji, no "waiting for you", no "in a tap", no "Good news".
 * - Push titles stay under ~45 characters so phones don't cut them.
 * `tag` groups alerts about one thing: a newer push replaces the older one.
 */
const eventOf = (d) => d.eventName || d.campaignTitle || 'your event';
const when = (d) => formatDate(d.date).replace(/^\w+,\s*/, '');
const join = (...parts) => parts.filter(Boolean).join(' · ');

export const EVENTS = {
    'pass-confirmed': {
        email: 'always',
        whatsapp: {
            mode: 'always',
            template: () => 'pass_confirmed',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'your event'), formatDate(d.date) || 'See pass', d.ref || '-'], buttons: d.ref ? [{ index: 0, param: d.ref }] : [] }),
        },
        push: (d) => ({ title: `Your pass for ${short(eventOf(d), 30)}`, body: `${join(when(d), d.venue) || 'Saved in the app'}. Show the QR code at the entrance.`, link: passLink(d), tag: `pass-${d.ref || d.eventName || ''}` }),
        inApp: (d) => ({ title: `Pass ready: ${eventOf(d)}`, message: `${join(when(d), d.venue) ? `${join(when(d), d.venue)}. ` : ''}Show the QR code at the entrance.`, type: 'ticket', link: passLink(d) }),
    },
    'campaign-ticket': {
        email: 'always',
        whatsapp: {
            mode: 'always',
            // PDF tickets go as the template's document header; links use the URL button.
            template: (d) => (d.whatsappDocumentUrl ? 'campaign_ticket' : 'campaign_ticket_link'),
            build: (d) => ({
                header: d.whatsappDocumentUrl ? { type: 'document', link: d.whatsappDocumentUrl, filename: d.pdfFilename || 'ticket.pdf' } : null,
                bodyParams: [firstName(d.name), short(d.campaignTitle || 'your campaign'), short(d.eventName || d.campaignTitle || 'the event'), formatDate(d.date) || 'See ticket'],
                buttons: d.ticketToken ? [{ index: 0, param: d.ticketToken }] : [],
            }),
        },
        push: (d) => {
            const link = d.campaignUrl || d.ticketUrl;
            const tag = `ticket-${d.campaignId || d.ref || eventOf(d)}`;
            if (d.upgradedTo) return { title: `Upgraded to ${short(d.upgradedTo, 30)}`, body: `${eventOf(d)}: same pass, new category. Nothing else to do.`, link, tag };
            if (d.confirmation) return { title: `Confirmed for ${short(eventOf(d), 30)}`, body: `${join(when(d), d.venue) ? `${join(when(d), d.venue)}. ` : ''}Your confirmation is in the campaign.`, link, tag };
            return { title: `Your ticket for ${short(eventOf(d), 30)}`, body: `${join(when(d), d.venue) ? `${join(when(d), d.venue)}. ` : ''}It's in the campaign in the app.`, link, tag };
        },
        inApp: (d) => {
            const link = d.campaignUrl || d.ticketUrl || '';
            if (d.upgradedTo) return { title: `Upgraded to ${d.upgradedTo}: ${eventOf(d)}`, message: 'Same pass, new category. Nothing else to do.', type: 'ticket', link };
            if (d.confirmation) return { title: `Confirmed: ${eventOf(d)}`, message: `${join(when(d), d.venue) ? `${join(when(d), d.venue)}. ` : ''}Your confirmation is in the campaign.`, type: 'ticket', link };
            return { title: `Ticket ready: ${eventOf(d)}`, message: `${join(when(d), d.venue) ? `${join(when(d), d.venue)}. ` : ''}Open the campaign to see it.`, type: 'ticket', link };
        },
    },
    'order-received': {
        email: 'always',
        inApp: (d) => ({ title: `Order received: ${d.eventName || 'your tickets'}`, message: "We're checking your payment. Your tickets show up here once it's confirmed, usually within a few hours.", type: 'ticket', link: '' }),
    },
    'creator-application-received': { email: 'always' },
    'creator-approved': {
        email: 'always',
        whatsapp: { mode: 'optional', template: () => 'creator_approved', build: (d) => ({ bodyParams: [firstName(d.name)] }) },
        push: () => ({ title: 'Your creator profile is approved', body: 'You can now apply to brand campaigns. New ones in your city show up on your dashboard.', link: '/creator', tag: 'creator-status' }),
        inApp: () => ({ title: 'Creator profile approved', message: 'You can apply to campaigns now. New ones in your city show up on your dashboard.', type: 'creator', link: '/creator' }),
    },
    'creator-rejected': {
        email: 'always',
        inApp: () => ({ title: 'Update on your creator application', message: "We couldn't approve your profile this time. We've emailed you the reason and how to apply again.", type: 'creator', link: '/creator' }),
    },
    'campaign-invite': {
        email: 'pref:creator',
        whatsapp: { mode: 'optional', template: () => 'campaign_invite', build: (d) => ({ bodyParams: [firstName(d.name), short(d.campaignTitle)], buttons: d.campaignId ? [{ index: 0, param: d.campaignId }] : [] }) },
        push: (d) => campaignInvitePush(d),
        inApp: (d) => ({ title: `New campaign: ${d.campaignTitle || ''}`, message: `${d.reward ? `Reward: ${d.reward}. ` : ''}Read the brief and apply from the campaign page.`, type: 'campaign', link: d.campaignUrl || '' }),
    },
    // Sent when the team shortlists a creator: the campaign link, the WhatsApp group and what's next.
    // WhatsApp template `campaign_shortlisted` (see docs/campaign-flow.md): body {{1}} name, {{2}} campaign,
    // {{3}} group link (or the campaign link), URL button suffix = campaign id.
    'campaign-shortlisted': {
        email: 'always',
        whatsapp: {
            mode: 'optional',
            template: () => 'campaign_shortlisted',
            build: (d) => ({
                bodyParams: [firstName(d.name), short(d.campaignTitle || 'the campaign', 80), d.groupLink || d.campaignUrl || '-'],
                buttons: d.campaignId ? [{ index: 0, param: d.campaignId }] : [],
            }),
        },
        push: (d) => ({ title: `Shortlisted for ${short(d.campaignTitle || 'a campaign', 30)}`, body: d.groupLink ? 'Join the campaign WhatsApp group first. The brief and dates are shared there.' : 'Your deliverables and dates are in the campaign.', link: d.campaignUrl, tag: `campaign-${d.campaignId || d.campaignTitle || ''}` }),
        inApp: (d) => ({ title: `Shortlisted: ${d.campaignTitle || 'campaign'}`, message: d.groupLink ? 'Join the campaign WhatsApp group, then submit your deliverables in the campaign.' : 'Your deliverables and dates are in the campaign.', type: 'campaign', link: d.campaignUrl || '' }),
    },
    // Campaign outreach (api/_lib/outreach.js): in the app and as push only. WhatsApp for these goes
    // through the outreach send queue (rate limit, opt-outs), never from here; there's no email.
    'outreach-city-group': {
        push: (d) => ({ title: `${short(d.city || 'Your city', 24)} creators group`, body: 'Local campaigns, guestlist passes and meetups are posted here first. Join on WhatsApp.', link: d.groupUrl, tag: `city-group-${d.city || ''}` }),
        inApp: (d) => ({ title: `${d.city || 'Your city'} creators group on WhatsApp`, message: `${d.campaignTitle ? `Thanks for applying to ${d.campaignTitle}. ` : ''}Join ${d.groupTitle || 'the Newbi creators group'} for local campaigns, passes and meetups.`, type: 'creator', link: d.groupUrl || '' }),
    },
    'outreach-shortlisted': {
        push: (d) => ({ title: `Shortlisted for ${short(d.campaignTitle || 'a campaign', 30)}`, body: d.groupLink ? 'Join the creators group, then check what to post.' : 'See what to post, your ticket and payout on the campaign page.', link: d.hubUrl, tag: `campaign-${d.campaignId || d.campaignTitle || ''}` }),
        inApp: (d) => ({ title: `Shortlisted: ${d.campaignTitle || 'campaign'}`, message: d.groupLink ? 'Join the campaign WhatsApp group, then tap “I’ve joined”. What to post, your ticket and payout are on the same page.' : 'What to post, your ticket and payout are on your campaign page.', type: 'campaign', link: d.hubUrl || '' }),
    },
    'submission-reviewed': {
        email: 'pref:creator',
        push: (d) => {
            const task = d.taskTitle || 'Your submission';
            const copy = {
                approved: [`${short(task, 32)} approved`, `${d.campaignTitle || 'Your campaign'}. Nothing else to do for this one.`],
                rejected: [`${short(task, 28)} not approved`, `${d.campaignTitle || 'Your campaign'}. Open it to see why.`],
            }[d.status] || [`Changes requested: ${short(task, 24)}`, `${d.campaignTitle || 'Your campaign'}. See what to change and resubmit.`];
            return { title: copy[0], body: copy[1], link: d.campaignUrl, tag: `submission-${d.campaignId || ''}-${d.taskId || d.taskTitle || ''}` };
        },
        inApp: (d) => ({
            title: d.status === 'approved' ? `Approved: ${d.taskTitle || 'your submission'}` : d.status === 'rejected' ? `Not approved: ${d.taskTitle || 'your submission'}` : `Changes requested: ${d.taskTitle || 'your submission'}`,
            message: `${d.campaignTitle || 'Campaign'}. ${d.status === 'approved' ? 'Nothing else to do for this one.' : d.status === 'rejected' ? 'Open the campaign to see why.' : 'Open the campaign to see what to change.'}`,
            type: 'campaign',
            link: d.campaignUrl || '',
        }),
    },
    'giveaway-entry': { email: 'always' },
    'payee-registered': { email: 'always' },
    welcome: { email: 'always' },
};

/** The new-campaign push, also sent in bulk when a campaign opens (mail/events.js). */
export const campaignInvitePush = (d) => ({
    title: d.brand ? `New campaign from ${short(d.brand, 26)}` : 'New campaign for creators',
    body: `${short(d.campaignTitle, 60)}${d.reward ? `. Reward: ${short(d.reward, 50)}` : ''}. Read the brief and apply.`,
    link: d.campaignUrl,
    tag: `campaign-${d.campaignId || d.campaignTitle || ''}`,
});

/** Loads what we need about a person: users/{uid}, with creators/{uid} as a fallback. */
export const loadRecipient = async (uid, override = {}) => {
    const db = getDb();
    let user = {};
    let creator = {};
    if (uid) {
        const [u, c] = await Promise.all([
            db.collection('users').doc(uid).get().catch(() => null),
            db.collection('creators').doc(uid).get().catch(() => null),
        ]);
        user = u?.exists ? u.data() : {};
        creator = c?.exists ? c.data() : {};
    }
    const verifiedCreatorPhone = creator.isPhoneVerified ? (creator.whatsapp || creator.phone) : '';
    return {
        uid: uid || null,
        user,
        email: override.email || user.email || creator.email || '',
        phone: override.phone || user.phoneNumber || user.phone || verifiedCreatorPhone || '',
        name: override.name || user.displayName || user.name || creator.displayName || creator.name || '',
        emailPrefs: user.emailPrefs || {},
        channelPrefs: { ...(creator.channelPrefs || {}), ...(user.channelPrefs || {}) },
    };
};

const skipped = (reason) => ({ status: 'skipped', reason });

/**
 * notify(event, uid, data, opts)
 * opts: { to: {email, phone, name}, ref: {collection, id}, attachments, skip: ['whatsapp'], idempotencyKey }
 */
export const notify = async (event, uid, data = {}, opts = {}) => {
    const config = EVENTS[event];
    if (!config) throw new Error(`Unknown notify event: ${event}`);
    const person = await loadRecipient(uid, opts.to || {});
    const payload = { ...data, name: data.name || person.name };
    const skip = new Set(opts.skip || []);
    const results = {};
    const jobs = [];

    // Email
    if (config.email && !skip.has('email')) {
        const prefKey = String(config.email).startsWith('pref:') ? config.email.slice(5) : null;
        if (!person.email) results.email = skipped('No email address');
        else if (prefKey && person.emailPrefs[prefKey] === false) results.email = skipped('Turned off in email preferences');
        else {
            jobs.push(sendTransactional(event, person.email, payload, {
                uid, ref: opts.ref, attachments: opts.attachments, idempotencyKey: opts.idempotencyKey ? `${opts.idempotencyKey}_email` : undefined,
            }).then(r => { results.email = { status: r.status, id: r.id || null, ...(r.error ? { error: r.error } : {}) }; }));
        }
    }

    // WhatsApp
    if (config.whatsapp && !skip.has('whatsapp')) {
        const wa = config.whatsapp;
        const template = wa.template(payload);
        const optedOut = person.channelPrefs.whatsapp === false;
        // A template is only used once the owner marks it approved in Meta by
        // setting WHATSAPP_TEMPLATE_<NAME> (its approved name), so nothing fails
        // while templates are still in review.
        const templateLive = Boolean(process.env[`WHATSAPP_TEMPLATE_${template.toUpperCase()}`]);
        if (optedOut) results.whatsapp = skipped('Turned off WhatsApp');
        else if (!templateLive) results.whatsapp = skipped('WhatsApp template not approved yet');
        else if (!toE164(person.phone)) results.whatsapp = skipped('No WhatsApp number');
        else {
            jobs.push(sendTemplate({ to: person.phone, template, ...wa.build(payload), event, uid, ref: opts.ref })
                .then(r => { results.whatsapp = { status: r.status, ...(r.messageId ? { messageId: r.messageId } : {}), ...(r.error ? { error: r.error } : {}) }; }));
        }
    }

    // Push
    if (config.push && !skip.has('push') && uid) {
        if (person.channelPrefs.push === false) results.push = skipped('Turned off push');
        else jobs.push(sendPush(uid, config.push(payload), { user: person.user }).then(r => { results.push = { status: r.status, ...(r.error ? { error: r.error } : {}) }; }));
    }

    // In-app feed
    if (config.inApp && !skip.has('inApp') && uid) {
        const n = config.inApp(payload);
        jobs.push(getDb().collection('notifications').add({
            userId: uid, title: n.title, message: n.message, content: n.message, type: n.type || 'info', link: n.link || '', image: payload.image || '', isRead: false, createdAt: nowIso(), event,
        }).then(ref => { results.inApp = { status: 'sent', id: ref.id }; }, err => { results.inApp = { status: 'failed', error: err.message }; }));
    }

    await Promise.allSettled(jobs);

    // Keep a per-channel record on the thing this was about (e.g. a pass).
    if (opts.ref?.collection && opts.ref?.id) {
        const at = nowIso();
        const delivery = {};
        if (results.email) delivery.email = { status: results.email.status, at, error: results.email.error || null, logId: results.email.id || null };
        if (results.push) delivery.push = { status: results.push.status, at };
        if (results.inApp) delivery.inApp = { status: results.inApp.status, at };
        // WhatsApp writes its own entry (and later receipts) from whatsapp.js.
        if (results.whatsapp?.status === 'skipped') delivery.whatsapp = { status: 'skipped', at, error: results.whatsapp.reason };
        if (Object.keys(delivery).length) {
            await getDb().collection(opts.ref.collection).doc(opts.ref.id).set({ delivery }, { merge: true }).catch(e => console.warn('[NOTIFY] delivery not saved:', e.message));
        }
    }
    return results;
};

export { SITE_URL, APP_URL };
