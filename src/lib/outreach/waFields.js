import { WA_TEMPLATES } from './whatsappTemplate.js';

/*
 * What each variable of our WhatsApp templates means, so the WhatsApp center
 * (src/pages/Admin/WhatsAppCenter.jsx) can label the fields and fill them in.
 *
 * A field written as {first_name} is filled in for each person when it's
 * sent (api/_lib/whatsappCenter.js): their first name, and for campaign
 * applicants the campaign, its group link, their city and their personal
 * links. Anything else is typed once and goes to everyone.
 */

export const FIELDS = {
    first_name: { label: 'First name', auto: 'person', example: 'Riya' },
    full_name: { label: 'Name', auto: 'person', example: 'Riya Sharma' },
    campaign_title: { label: 'Campaign', auto: 'campaign', example: 'Arijit Singh Live' },
    group_link: { label: 'Group link', auto: 'campaign', example: 'https://chat.whatsapp.com/…' },
    deadline_line: { label: 'Posting deadline line', auto: 'campaign', example: 'Post by 2 Nov.' },
    campaign_id: { label: 'Campaign link ending', auto: 'campaign', example: 'abc123' },
    city: { label: 'City', auto: 'applicant', example: 'Bengaluru' },
    submit_token: { label: 'Their posts link ending', auto: 'applicant', example: '(personal link)' },
    event_name: { label: 'Event', example: 'Arijit Singh Live' },
    event_date: { label: 'Date', example: 'Sat, 2 Nov' },
    pass_ref: { label: 'Pass reference', example: 'NB-12345' },
    ticket_token: { label: 'Ticket link ending', example: '(ticket token)' },
    amount: { label: 'Amount', example: '1,500' },
    payment_ref: { label: 'Payment reference', example: 'UTR 1234' },
    feedback: { label: 'What to change', example: 'Tag @newbi.live in the caption' },
    approved_summary: { label: 'Approved posts', example: 'Reel and Story' },
    giveaway_name: { label: 'Giveaway', example: 'Backstage passes' },
    ends_at: { label: 'Ends', example: 'Fri, 1 Nov' },
    gig_title: { label: 'Gig', example: 'Gate crew' },
    report_at: { label: 'Report at', example: '4 pm' },
    location: { label: 'Location', example: 'Gate 2' },
    doors: { label: 'Doors open', example: '6 pm' },
    venue: { label: 'Venue', example: 'Phoenix Arena' },
    task_title: { label: 'Post', example: 'Reel' },
    reason: { label: 'What to fix', example: 'Tag @newbi.live' },
    reference: { label: 'Payout reference', example: 'UTR 1234' },
    city_group_link: { label: 'City group link', example: 'https://chat.whatsapp.com/…' },
    role: { label: 'Role', example: 'Admin' },
    email: { label: 'Email', example: 'ops@newbi.live' },
    guestlist_title: { label: 'Guestlist', example: 'Techno Tuesdays at Kitty Su' },
    guestlist_id: { label: 'Guestlist link ending', example: '(guestlist id)' },
    guests_line: { label: 'Coming', example: 'You + 1 guest' },
    door_name: { label: 'Name at the door', example: 'Riya Sharma + 1' },
    decline_reason: { label: 'Why', example: 'The list filled up before we reached your sign-up' },
    claim_by: { label: 'Claim by', example: 'Today, 6:00 PM' },
    entry_until: { label: 'Guestlist entry until', example: '11:00 PM' },
    change: { label: 'What changed', example: 'Doors now open at 5:00 PM (was 4:00 PM)' },
    refund: { label: 'Refund', example: '₹1,499 back to your UPI in 5–7 working days' },
    scanned_at: { label: 'Scanned at', example: '5:42 PM' },
    device: { label: 'Device', example: 'Chrome on Android, Pune' },
    when: { label: 'When', example: '23 Oct, 9:42 PM' },
    phone_last4: { label: 'New number ends in', example: '4321' },
    merged_in: { label: 'Merged in', example: 'ri••••@example.com' },
    moved_summary: { label: 'Moved over', example: '3 passes and your creator profile' },
};

/* Our templates: their body variables in order, and what a link button's ending is. */
const OURS = {
    pass_confirmed: { body: ['first_name', 'event_name', 'event_date', 'pass_ref'], button: 'pass_ref' },
    campaign_ticket: { body: ['first_name', 'campaign_title', 'event_name', 'event_date'], button: 'ticket_token' },
    campaign_ticket_link: { body: ['first_name', 'campaign_title', 'event_name', 'event_date'], button: 'ticket_token' },
    order_received: { body: ['first_name', 'event_name', 'amount', 'payment_ref'] },
    payment_declined: { body: ['first_name', 'event_name', 'payment_ref'] },
    creator_approved: { body: ['first_name'] },
    campaign_invite: { body: ['first_name', 'campaign_title'], button: 'campaign_id' },
    campaign_shortlisted: { body: ['first_name', 'campaign_title', 'group_link'], button: 'campaign_id' },
    submission_changes: { body: ['first_name', 'campaign_title', 'feedback'], button: 'campaign_id' },
    giveaway_entry: { body: ['first_name', 'giveaway_name', 'ends_at'] },
    gig_selected: { body: ['first_name', 'gig_title', 'report_at', 'location'] },
    event_reminder: { body: ['first_name', 'event_name', 'doors', 'venue'], button: 'pass_ref' },
    staff_authorized: { body: ['full_name', 'role', 'email'] },
    guestlist_pending: { body: ['first_name', 'guestlist_title', 'event_date', 'guests_line'] },
    guestlist_rsvp_confirmed: { body: ['first_name', 'event_name', 'event_date', 'door_name'] },
    guestlist_task_changes: { body: ['first_name', 'guestlist_title', 'feedback'], button: 'guestlist_id' },
    guestlist_not_confirmed: { body: ['first_name', 'guestlist_title', 'decline_reason'] },
    guestlist_spot_opened: { body: ['first_name', 'guestlist_title', 'claim_by'], button: 'guestlist_id' },
    guestlist_entry_cutoff: { body: ['first_name', 'event_name', 'entry_until', 'venue'], button: 'pass_ref' },
    event_changed: { body: ['first_name', 'event_name', 'change'], button: 'pass_ref' },
    event_cancelled: { body: ['first_name', 'event_name', 'event_date', 'refund'] },
    pass_checked_in: { body: ['first_name', 'event_name', 'scanned_at'] },
    new_sign_in: { body: ['first_name', 'device', 'when'] },
    phone_number_changed: { body: ['first_name', 'phone_last4', 'when'] },
    accounts_merged: { body: ['first_name', 'merged_in', 'moved_summary'] },
    ...Object.fromEntries(Object.values(WA_TEMPLATES).map(t => [t.name, {
        body: t.placeholders,
        ...(['campaign_deliverables', 'campaign_deliverable_changes'].includes(t.name) ? { button: 'submit_token' } : {}),
    }])),
};

/* The outreach templates whose quick reply is "Joined": sent to an applicant, it carries their signed payload. */
export const JOIN_TEMPLATES = new Set([WA_TEMPLATES.invite.name, WA_TEMPLATES.reminder.name]);

/**
 * The meaning of each variable of a template (as listed by Meta).
 * → { body: [key|null], button: key|null }. Templates we don't know get
 * "first name" for a {{1}} that follows a greeting ("Hi {{1}}").
 */
export const fieldsFor = (tpl) => {
    const known = OURS[tpl?.name];
    const n = Number(tpl?.bodyVars || 0);
    if (known) return { body: Array.from({ length: n }, (_, i) => known.body[i] || null), button: known.button || null };
    const greets = /\b(hi|hey|hello|dear|thanks|thank you|congrats|welcome)\b[^{}\n]{0,3}\{\{1\}\}/i.test(String(tpl?.body || ''));
    return { body: Array.from({ length: n }, (_, i) => (i === 0 && greets ? 'first_name' : null)), button: null };
};

/** Can this field be filled in on its own for this audience? */
export const isAuto = (key, { campaign = false, applicants = false } = {}) => {
    const auto = FIELDS[key]?.auto;
    return auto === 'person' || (auto === 'campaign' && campaign) || (auto === 'applicant' && applicants);
};

export const token = (key) => `{${key}}`;

/** "{first_name}, see you" → "Riya, see you". Unknown or empty values leave the token, so the sender can tell. */
export const fillTokens = (value, values) => String(value ?? '').replace(/\{([a-z_]+)\}/g, (m, k) => (values[k] ? String(values[k]) : m));

/** The tokens still in a value after filling, e.g. ['campaign_title']. */
export const missingTokens = (value) => [...String(value ?? '').matchAll(/\{([a-z_]+)\}/g)].map(m => m[1]).filter(k => FIELDS[k]);
