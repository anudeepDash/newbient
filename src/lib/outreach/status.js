/*
 * Where an applicant is in a campaign's outreach. The server enforces these
 * transitions (api/_lib/outreach.js) and writes an audit entry for each one;
 * the admin screens use the same table to decide which buttons to show.
 *
 *   applied → shortlisted → message_queued → message_sent → replied / joined → posted → paid
 *   Any step before paid can go to removed; removed can be restored to shortlisted.
 *
 * message_queued ("To send") means WhatsApp was opened or the message copied
 * (by hand), or the message is in the WhatsApp API send queue. It never means
 * sent: by hand only "Mark sent" moves someone on; through the API, only Meta
 * accepting the message does.
 */

export const STATUSES = ['applied', 'shortlisted', 'message_queued', 'message_sent', 'replied', 'joined', 'posted', 'paid', 'removed'];

export const STATUS_META = {
    applied: { label: 'Applied', tone: 'blue' },
    shortlisted: { label: 'Shortlisted', tone: 'violet' },
    message_queued: { label: 'To send', tone: 'amber' },
    message_sent: { label: 'Message sent', tone: 'green' },
    replied: { label: 'Replied', tone: 'teal' },
    joined: { label: 'Joined group', tone: 'pink' },
    posted: { label: 'Posted', tone: 'orange' },
    paid: { label: 'Paid', tone: 'teal' },
    removed: { label: 'Removed', tone: 'gray' },
};

export const TRANSITIONS = {
    applied: ['shortlisted', 'removed'],
    shortlisted: ['message_queued', 'removed'],
    message_queued: ['message_sent', 'shortlisted', 'removed'],
    message_sent: ['replied', 'joined', 'removed'],
    replied: ['joined', 'removed'],
    joined: ['posted', 'removed'],
    posted: ['paid', 'removed'],
    paid: [],
    removed: ['shortlisted'],
};

export const isStatus = (s) => STATUSES.includes(s);

export const canTransition = (from, to) => Boolean(isStatus(from) && isStatus(to) && TRANSITIONS[from].includes(to));

/** Everyone who is on the shortlist in some form (not applied, not removed). */
export const ON_SHORTLIST = new Set(['shortlisted', 'message_queued', 'message_sent', 'replied', 'joined', 'posted', 'paid']);
export const isOnShortlist = (s) => ON_SHORTLIST.has(s);

export const statusLabel = (s) => STATUS_META[s]?.label || 'Applied';

/*
 * Moves only the system makes (never offered as buttons):
 *   - Meta reports a message it accepted as failed → back to "To send".
 *   - Every required deliverable approved → posted, from wherever they were
 *     after the message (not everyone taps "Joined").
 *   - A payout recorded with an admin's written override → paid early.
 *   - A payout cancelled → back to posted.
 *   - Shortlisted people with a Newbi account are told in the app → message sent.
 *   - They tap "I've joined" in the app, even before the WhatsApp message lands → joined.
 */
export const SYSTEM_TRANSITIONS = {
    shortlisted: ['message_sent', 'joined'],
    message_queued: ['joined'],
    message_sent: ['message_queued', 'posted', 'paid'],
    replied: ['posted', 'paid'],
    joined: ['paid'],
    paid: ['posted'],
};
export const canSystemTransition = (from, to) => canTransition(from, to) || Boolean(SYSTEM_TRANSITIONS[from]?.includes(to));
