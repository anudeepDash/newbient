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

const short = (s, n = 60) => String(s || '').slice(0, n);

// Passes open in the app (app.newbi.live/p/REF); PUBLIC_APP_URL overrides the host.
const PASS_ORIGIN = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');
const passLink = (d) => d.passUrl || (d.ref ? `${PASS_ORIGIN}/p/${encodeURIComponent(d.ref)}` : `${PASS_ORIGIN}/`);

export const EVENTS = {
    'pass-confirmed': {
        email: 'always',
        whatsapp: {
            mode: 'always',
            template: () => 'pass_confirmed',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'your event'), formatDate(d.date) || 'See pass', d.ref || '-'], buttons: d.ref ? [{ index: 0, param: d.ref }] : [] }),
        },
        push: (d) => ({ title: "You're on the list", body: `${d.eventName || 'Your event'}${d.date ? ` · ${formatDate(d.date)}` : ''}. Tap for your pass.`, link: passLink(d) }),
        inApp: (d) => ({ title: `You're in: ${d.eventName || 'event'}`, message: 'Your pass is ready. Show the QR code at the gate.', type: 'ticket', link: passLink(d) }),
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
        push: (d) => ({ title: 'Your ticket is ready', body: `${d.eventName || d.campaignTitle || 'Your campaign'}: open it in the app.`, link: d.campaignUrl || d.ticketUrl }),
        inApp: (d) => ({ title: `Ticket ready: ${d.eventName || d.campaignTitle || 'campaign'}`, message: 'Your ticket is inside the campaign.', type: 'ticket', link: d.campaignUrl || d.ticketUrl || '' }),
    },
    'order-received': {
        email: 'always',
        inApp: (d) => ({ title: 'Order received', message: `We're checking your payment for ${d.eventName || 'your tickets'}.`, type: 'ticket', link: '' }),
    },
    'creator-application-received': { email: 'always' },
    'creator-approved': {
        email: 'always',
        whatsapp: { mode: 'optional', template: () => 'creator_approved', build: (d) => ({ bodyParams: [firstName(d.name)] }) },
        push: () => ({ title: "You're approved", body: 'Your creator profile is live. Open campaigns are waiting.', link: '/creator-dashboard' }),
        inApp: () => ({ title: "You're approved as a Newbi creator", message: 'Browse open campaigns and apply in a tap.', type: 'creator', link: '/creator-dashboard' }),
    },
    'creator-rejected': {
        email: 'always',
        inApp: () => ({ title: 'About your creator application', message: "We couldn't approve your profile this time. Check your email for details.", type: 'creator', link: '/creator-dashboard' }),
    },
    'campaign-invite': {
        email: 'pref:creator',
        whatsapp: { mode: 'optional', template: () => 'campaign_invite', build: (d) => ({ bodyParams: [firstName(d.name), short(d.campaignTitle)], buttons: d.campaignId ? [{ index: 0, param: d.campaignId }] : [] }) },
        push: (d) => ({ title: `New campaign: ${short(d.campaignTitle, 80)}`, body: d.reward ? `Reward: ${short(d.reward, 80)}` : 'Tap to see the brief and apply.', link: d.campaignUrl }),
        inApp: (d) => ({ title: `New campaign: ${d.campaignTitle || ''}`, message: `${d.reward ? `Reward: ${d.reward}. ` : ''}Check the brief and apply.`, type: 'campaign', link: d.campaignUrl || '' }),
    },
    'submission-reviewed': {
        email: 'pref:creator',
        push: (d) => ({ title: d.status === 'approved' ? 'Submission approved' : 'Update on your submission', body: `${d.campaignTitle || 'Your campaign'}${d.taskTitle ? ` · ${d.taskTitle}` : ''}`, link: d.campaignUrl }),
        inApp: (d) => ({ title: d.status === 'approved' ? 'Submission approved' : d.status === 'rejected' ? 'Submission not approved' : 'Changes requested', message: `${d.campaignTitle || 'Campaign'}${d.taskTitle ? ` · ${d.taskTitle}` : ''}`, type: 'campaign', link: d.campaignUrl || '' }),
    },
    'giveaway-entry': { email: 'always' },
    'payee-registered': { email: 'always' },
    welcome: { email: 'always' },
};

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
