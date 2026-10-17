/*
 * Where an applicant is in a campaign's outreach. The server enforces these
 * transitions (api/_lib/outreach.js) and writes an audit entry for each one;
 * the admin screens use the same table to decide which buttons to show.
 *
 *   applied → shortlisted → message_queued → message_sent → replied / joined → posted → paid
 *   Any step before paid can go to removed; removed can be restored to shortlisted.
 *
 * message_queued means "WhatsApp was opened for this person"; it never means sent.
 * Only the admin's "Mark sent" moves someone to message_sent.
 */

export const STATUSES = ['applied', 'shortlisted', 'message_queued', 'message_sent', 'replied', 'joined', 'posted', 'paid', 'removed'];

export const STATUS_META = {
    applied: { label: 'Applied', tone: 'blue' },
    shortlisted: { label: 'Shortlisted', tone: 'violet' },
    message_queued: { label: 'WhatsApp opened', tone: 'amber' },
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
