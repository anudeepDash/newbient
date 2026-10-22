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
import { sendTemplate, toE164, isTemplateLive } from './whatsapp.js';
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
const rupees = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-IN') : String(n || '-'));
const rsvpTemplate = (d) => d.mode === 'rsvp' && isTemplateLive('guestlist_rsvp_confirmed');
const extraGuests = (d) => Math.max(0, (Number(d.qty) || 1) - 1);
// "Riya Sharma + 1": the name the door checks on an RSVP list.
const doorName = (d) => `${String(d.name || '').trim() || 'Your name'}${extraGuests(d) ? ` + ${extraGuests(d)}` : ''}`;
const comingLine = (d) => (extraGuests(d) ? `You + ${extraGuests(d)} ${extraGuests(d) === 1 ? 'guest' : 'guests'}` : 'Just you');
const listLink = (d) => (d.guestlistId ? `${PASS_ORIGIN}/community/g/${encodeURIComponent(d.guestlistId)}` : `${PASS_ORIGIN}/community`);
const listButton = (d) => (d.guestlistId ? [{ index: 0, param: d.guestlistId }] : []);
const passButton = (d) => (d.ref ? [{ index: 0, param: d.ref }] : []);

export const EVENTS = {
    'pass-confirmed': {
        email: 'always',
        whatsapp: {
            mode: 'always',
            // RSVP lists have no QR code, so they get guestlist_rsvp_confirmed once it's approved.
            template: (d) => (rsvpTemplate(d) ? 'guestlist_rsvp_confirmed' : 'pass_confirmed'),
            build: (d) => (rsvpTemplate(d)
                ? { bodyParams: [firstName(d.name), short(d.eventName || 'your event'), formatDate(d.date) || 'See the guestlist', short(doorName(d), 80)] }
                : { bodyParams: [firstName(d.name), short(d.eventName || 'your event'), formatDate(d.date) || 'See pass', d.ref || '-'], buttons: d.ref ? [{ index: 0, param: d.ref }] : [] }),
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
        whatsapp: {
            mode: 'always',
            template: () => 'order_received',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'your event'), rupees(d.totalAmount), d.paymentRef || 'Not needed'] }),
        },
        inApp: (d) => ({ title: `Order received: ${d.eventName || 'your tickets'}`, message: "We're checking your payment. Your tickets show up here once it's confirmed, usually within a few hours.", type: 'ticket', link: '' }),
    },
    // A ticket order the team couldn't match to a payment (rejected in Ticket sales). No email yet.
    'order-declined': {
        whatsapp: {
            mode: 'always',
            template: () => 'payment_declined',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'your event'), d.paymentRef || 'Not given'] }),
        },
        push: (d) => ({ title: `Payment not confirmed: ${short(d.eventName || 'your order', 26)}`, body: 'We couldn’t find the payment. Check the UTR in your UPI app and send it again.', link: d.eventUrl || '', tag: `order-${d.orderId || ''}` }),
        inApp: (d) => ({ title: `Payment not confirmed: ${d.eventName || 'your order'}`, message: 'We couldn’t find this payment. Check the UTR in your UPI app and send it again from the event page.', type: 'ticket', link: d.eventUrl || '' }),
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
        // WhatsApp only when something needs fixing; an approved post waits for campaign-all-approved.
        whatsapp: {
            mode: 'optional',
            template: (d) => (d.status === 'approved' ? null : 'submission_changes'),
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.campaignTitle || 'your campaign', 80), short(d.feedback || 'See the note in the campaign', 300)], buttons: d.campaignId ? [{ index: 0, param: d.campaignId }] : [] }),
        },
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
    // Once, when every required post a creator owes a campaign is approved (app and outreach campaigns).
    'campaign-all-approved': {
        whatsapp: {
            mode: 'optional',
            template: () => 'all_posts_approved',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.campaignTitle || 'your campaign', 80), d.summary || 'All your posts'] }),
        },
        push: (d) => ({ title: `All posts approved: ${short(d.campaignTitle || 'campaign', 26)}`, body: 'That’s everything for this campaign. We’ll update you about your reward.', link: d.campaignUrl || '', tag: `campaign-${d.campaignId || ''}` }),
        inApp: (d) => ({ title: `All posts approved: ${d.campaignTitle || 'campaign'}`, message: 'That’s everything for this campaign. We’ll update you about your reward.', type: 'campaign', link: d.campaignUrl || '' }),
    },
    'giveaway-entry': {
        email: 'always',
        whatsapp: {
            mode: 'optional',
            template: () => 'giveaway_entry',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.giveawayName || 'the giveaway', 80), formatDate(d.endsAt) || 'Soon'] }),
        },
    },
    // A volunteer marked confirmed for a gig (the in-app note is sent by the admin page).
    'gig-selected': {
        whatsapp: {
            mode: 'optional',
            template: () => 'gig_selected',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.gigTitle || 'the gig', 80), short(d.reportAt || 'See the briefing group', 80), short(d.location || 'Shared in the briefing group', 80)] }),
        },
    },
    // The day before an event, for every issued pass (api/mail.js daily worker).
    'event-reminder': {
        whatsapp: {
            mode: 'optional',
            template: () => 'event_reminder',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'your event', 80), short(d.doors || 'See your pass', 60), short(d.venue || 'See your pass', 80)], buttons: d.ref ? [{ index: 0, param: d.ref }] : [] }),
        },
        push: (d) => ({ title: `Tomorrow: ${short(d.eventName || 'your event', 34)}`, body: `${join(d.doors, d.venue) || 'Your pass is ready'}. Show the QR code at the entrance.`, link: d.passUrl || '', tag: `pass-${d.ref || ''}` }),
    },
    // Guestlists (api/_lib/passes.js, mail/events.js, passHolders.js). WhatsApp only once each template is approved.
    // Signed up on a list the team reviews.
    'guestlist-pending': {
        whatsapp: {
            mode: 'optional',
            template: () => 'guestlist_pending',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'the guestlist', 80), formatDate(d.date) || 'See the guestlist', comingLine(d)] }),
        },
    },
    // The team asked for a fix on the task sent to get on the list.
    'guestlist-task-changes': {
        whatsapp: {
            mode: 'optional',
            template: () => 'guestlist_task_changes',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'the guestlist', 80), short(d.feedback || 'See the note on the guestlist page', 300)], buttons: listButton(d) }),
        },
        push: (d) => ({ title: `Fix your task: ${short(d.eventName || 'guestlist', 28)}`, body: short(d.feedback || 'See what to change and send it again.', 120), link: listLink(d), tag: `guestlist-${d.guestlistId || ''}` }),
        inApp: (d) => ({ title: `Task needs a fix: ${d.eventName || 'guestlist'}`, message: `${d.feedback ? `${short(d.feedback, 200)}. ` : ''}Send it again from the guestlist page to keep your place.`, type: 'ticket', link: listLink(d) }),
    },
    // Declined, when the admin ticks "tell them".
    'guestlist-declined': {
        whatsapp: {
            mode: 'optional',
            template: () => 'guestlist_not_confirmed',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'the guestlist', 80), short(d.reason || 'The list filled up before we reached your sign-up', 120)] }),
        },
    },
    // A place came free for someone on the waitlist (passes.js advanceWaitlist). The button and links carry
    // a signed claim (claimParam: "<list id>?claim=<token>") that confirms the place without signing in.
    'guestlist-spot-opened': {
        whatsapp: {
            mode: 'optional',
            template: () => 'guestlist_spot_opened',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'the guestlist', 80), short(d.claimBy || 'Soon', 60)], buttons: d.claimParam ? [{ index: 0, param: d.claimParam }] : listButton(d) }),
        },
        push: (d) => ({ title: `A place is free: ${short(d.eventName || 'guestlist', 30)}`, body: `Confirm it before ${short(d.claimBy || 'the time runs out', 40)} or it goes to the next person.`, link: d.claimParam ? `${PASS_ORIGIN}/community/g/${d.claimParam}` : listLink(d), tag: `guestlist-${d.guestlistId || ''}` }),
        inApp: (d) => ({ title: `A place is free: ${d.eventName || 'guestlist'}`, message: `Confirm it before ${d.claimBy || 'the time runs out'} or it goes to the next person on the waitlist.`, type: 'ticket', link: d.claimParam ? `${PASS_ORIGIN}/community/g/${d.claimParam}` : listLink(d) }),
    },
    // The morning of an event whose guestlist has an entry cutoff (eventReminders.js).
    'guestlist-entry-cutoff': {
        whatsapp: {
            mode: 'optional',
            template: () => 'guestlist_entry_cutoff',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'your event', 80), short(d.entryUntil, 40), short(d.venue || 'See your pass', 80)], buttons: passButton(d) }),
        },
        push: (d) => ({ title: `Tonight: ${short(d.eventName || 'your event', 34)}`, body: `Guestlist entry until ${short(d.entryUntil, 40)}${d.venue ? ` at ${short(d.venue, 60)}` : ''}.`, link: d.passUrl || '', tag: `pass-${d.ref || ''}` }),
    },
    // An admin told pass holders about a change (time, date, venue).
    'event-changed': {
        whatsapp: {
            mode: 'optional',
            template: () => 'event_changed',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'your event', 80), short(d.change, 300)], buttons: passButton(d) }),
        },
        push: (d) => ({ title: `Change: ${short(d.eventName || 'your event', 34)}`, body: short(d.change, 140), link: d.passUrl || '', tag: `pass-${d.ref || ''}` }),
        inApp: (d) => ({ title: `Change to ${d.eventName || 'your event'}`, message: `${short(d.change, 300)}. Your pass still works.`, type: 'ticket', link: d.passUrl || '' }),
    },
    // An admin cancelled the event: the pass is cancelled with it.
    'event-cancelled': {
        whatsapp: {
            mode: 'optional',
            template: () => 'event_cancelled',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'your event', 80), formatDate(d.date) || 'The planned date', short(d.refund || 'Nothing to refund', 120)] }),
        },
        push: (d) => ({ title: `Cancelled: ${short(d.eventName || 'your event', 32)}`, body: `Your pass has been cancelled. ${short(d.refund || 'Nothing to refund', 100)}.`, link: '', tag: `pass-${d.ref || ''}` }),
        inApp: (d) => ({ title: `Cancelled: ${d.eventName || 'your event'}`, message: `Your pass has been cancelled. Refund: ${short(d.refund || 'nothing to refund', 200)}.`, type: 'ticket', link: '' }),
    },
    // The gate checked a pass in: the holder hears at once, so a copied QR gets noticed.
    'pass-checked-in': {
        whatsapp: {
            mode: 'optional',
            template: () => 'pass_checked_in',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.eventName || 'your event', 80), short(d.scannedAt || 'Just now', 60)] }),
        },
    },
    // Account security (api/_lib/securityAlerts.js). Sent only to a verified number, WhatsApp only.
    'new-sign-in': {
        whatsapp: {
            mode: 'optional',
            template: () => 'new_sign_in',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.device || 'A new device', 80), short(d.when || 'Just now', 40)] }),
        },
    },
    // Goes to the old number, so its owner hears even if someone else made the change.
    'phone-number-changed': {
        whatsapp: {
            mode: 'optional',
            template: () => 'phone_number_changed',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.last4 || '----', 8), short(d.when || 'Just now', 40)] }),
        },
    },
    'accounts-merged': {
        whatsapp: {
            mode: 'optional',
            template: () => 'accounts_merged',
            build: (d) => ({ bodyParams: [firstName(d.name), short(d.mergedIn || 'Another account', 80), short(d.summary || 'Your account details', 120)] }),
        },
    },
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

    // WhatsApp (an event can return no template for some cases, e.g. an approved post)
    const waTemplate = config.whatsapp && !skip.has('whatsapp') ? config.whatsapp.template(payload) : null;
    if (waTemplate) {
        const optedOut = person.channelPrefs.whatsapp === false;
        // A template is only used once the owner marks it approved in Meta by
        // setting WHATSAPP_TEMPLATE_<NAME> (its approved name), so nothing fails
        // while templates are still in review.
        if (optedOut) results.whatsapp = skipped('Turned off WhatsApp');
        else if (!isTemplateLive(waTemplate)) results.whatsapp = skipped('WhatsApp template not approved yet');
        else if (!toE164(person.phone)) results.whatsapp = skipped('No WhatsApp number');
        else {
            jobs.push(sendTemplate({ to: person.phone, template: waTemplate, image: payload.image, ...config.whatsapp.build(payload), event, uid, ref: opts.ref })
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
