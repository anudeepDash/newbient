import { firstNameOf } from './normalize.js';
import { deadlineLineFor } from './template.js';

/*
 * The WhatsApp Cloud API templates for outreach (Phase 2). They're created and
 * approved in WhatsApp Manager; these are the names and the text we submitted,
 * so the admin preview shows exactly what goes out. Names can be overridden
 * per environment with WHATSAPP_TEMPLATE_CAMPAIGN_SHORTLIST / _CAMPAIGN_JOIN_REMINDER.
 *
 * The variables are the Phase 1 placeholders, in order. Meta rejects empty
 * variables, so an unclear first name is sent as "there" and a missing posting
 * deadline as "Details are in the group."
 */

export const JOIN_BUTTON = 'Joined ✅';
export const STOP_BUTTON = 'Stop updates';
/* The quick-reply payload of "Stop updates" (and texts like STOP) opts the number out of every template. */
export const STOP_PAYLOAD = 'stop';

export const WA_TEMPLATES = {
    invite: {
        name: 'campaign_shortlist',
        body: "Hey {{1}}! You're shortlisted for {{2}} with Newbi. Join the creators group for the brief, passes and next steps: {{3}} {{4}}",
        placeholders: ['first_name', 'campaign_title', 'group_link', 'deadline_line'],
    },
    reminder: {
        name: 'campaign_join_reminder',
        body: 'Hey {{1}}, a reminder to join the {{2}} creators group: {{3}}',
        placeholders: ['first_name', 'campaign_title', 'group_link'],
    },
    // Phase 3. The first two have a URL button: https://app.newbi.live/d/{{1}} (their signed link).
    deliverables: {
        name: 'campaign_deliverables',
        body: "Hey {{1}}! Here's your personal link to send your {{2}} posts to Newbi. Tap the button once they're live.",
        placeholders: ['first_name', 'campaign_title'],
        button: 'Send my posts',
    },
    changes: {
        name: 'campaign_deliverable_changes',
        body: 'Hey {{1}}, a quick change on "{{2}}": {{3}} Tap the button to send it again.',
        placeholders: ['first_name', 'task_title', 'reason'],
        button: 'Send it again',
    },
    // Sent when someone applies (the city creator community). Quick reply: Stop updates.
    city_group: {
        name: 'creator_city_group',
        body: 'Hey {{1}}! Thanks for applying to {{2}}. Join the Newbi {{3}} creators community on WhatsApp for gigs, passes and meetups: {{4}}',
        placeholders: ['first_name', 'campaign_title', 'city', 'city_group_link'],
    },
    payout: {
        name: 'campaign_payout_sent',
        body: "Hey {{1}}, we've sent ₹{{2}} for {{3}}. Reference: {{4}}. Thanks for creating with Newbi!",
        placeholders: ['first_name', 'amount', 'campaign_title', 'reference'],
    },
};

export const NAME_FALLBACK = 'there';
export const DEADLINE_FALLBACK = 'Details are in the group.';

/** The template variables for one person, in order. `data` carries per-message values (task title, reason, amount, reference). */
export const templateParamsFor = (kind, { application, campaign, groupLink, data = {} }) => {
    const values = {
        first_name: firstNameOf(application?.fullName) || NAME_FALLBACK,
        campaign_title: String(campaign?.title || '').trim() || 'the campaign',
        group_link: String(groupLink || '').trim(),
        deadline_line: deadlineLineFor(campaign) || DEADLINE_FALLBACK,
        task_title: String(data.taskTitle || 'your post').trim(),
        reason: String(data.reason || 'Please check the brief.').trim(),
        amount: Number(data.amount || 0).toLocaleString('en-IN'),
        reference: String(data.reference || '').trim() || 'shared separately',
        city: String(data.city || application?.city || 'your city').trim(),
        city_group_link: String(data.groupUrl || '').trim(),
    };
    return (WA_TEMPLATES[kind] || WA_TEMPLATES.invite).placeholders.map(p => values[p]);
};

/** The message text as WhatsApp will show it, for the admin preview. */
export const renderTemplatePreview = (kind, ctx) => {
    const params = templateParamsFor(kind, ctx);
    return (WA_TEMPLATES[kind] || WA_TEMPLATES.invite).body.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? '');
};

/* Delivery states written by the sender and the webhook, for badges. */
export const DELIVERY_META = {
    queued: { label: 'In the send queue', tone: 'amber' },
    retrying: { label: 'Retrying', tone: 'amber' },
    sent: { label: 'Sent ✓', tone: 'blue' },
    delivered: { label: 'Delivered ✓✓', tone: 'teal' },
    read: { label: 'Read ✓✓', tone: 'green' },
    failed: { label: 'Not delivered', tone: 'rose' },
    cancelled: { label: 'Send stopped', tone: 'gray' },
};

/* Has this person got an API message on its way or delivered? */
export const IN_FLIGHT = new Set(['queued', 'retrying', 'sent', 'delivered', 'read']);
