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

// As approved in Meta: WhatsApp Manager strips emoji from button labels.
export const JOIN_BUTTON = 'Joined';
export const STOP_BUTTON = 'Stop updates';
/* The quick-reply payload of "Stop updates" (and texts like STOP) opts the number out of every template. */
export const STOP_PAYLOAD = 'stop';

export const WA_TEMPLATES = {
    invite: {
        name: 'campaign_shortlist',
        body: "✅ *You're shortlisted, {{1}}!*\n\n*Campaign:* {{2}} with Newbi\n\nJoin the creators group for the brief, passes and next steps:\n{{3}}\n\n{{4}}\n\nTap *Joined ✅* once you're in.",
        placeholders: ['first_name', 'campaign_title', 'group_link', 'deadline_line'],
    },
    reminder: {
        name: 'campaign_join_reminder',
        body: "⏰ *Quick reminder, {{1}}*\n\nYou haven't joined the *{{2}}* creators group yet. Here's the link:\n{{3}}\n\nTap *Joined ✅* once you're in.",
        placeholders: ['first_name', 'campaign_title', 'group_link'],
    },
    // Phase 3. The first two have a URL button: https://app.newbi.live/d/{{1}} (their signed link).
    deliverables: {
        name: 'campaign_deliverables',
        body: "📸 *Time to send your posts, {{1}}*\n\nHere's your personal link to send your *{{2}}* posts to Newbi. Tap *Send my posts* once they're live.",
        placeholders: ['first_name', 'campaign_title'],
        button: 'Send my posts',
    },
    changes: {
        name: 'campaign_deliverable_changes',
        body: "✏️ *A quick change, {{1}}*\n\n*Post:* {{2}}\n*What to fix:* {{3}}\n\nTap *Send it again* once it's updated.",
        placeholders: ['first_name', 'task_title', 'reason'],
        button: 'Send it again',
    },
    // Sent when someone applies (the city creator community). Quick reply: Stop updates.
    city_group: {
        name: 'creator_city_group',
        body: '👋 *Thanks for applying to {{2}}, {{1}}!*\n\nJoin the Newbi *{{3}}* creators community on WhatsApp for gigs, guestlist passes and meetups:\n{{4}}\n\nSee you in there.',
        placeholders: ['first_name', 'campaign_title', 'city', 'city_group_link'],
    },
    // Once, when every required deliverable is approved (never per post).
    all_approved: {
        name: 'all_posts_approved',
        body: "🏁 *All your posts are approved, {{1}}*\n\n*Campaign:* {{2}}\n*Approved:* {{3}}\n\nThat's everything for this campaign. We'll message you here about your reward. Thanks for creating with Newbi!",
        placeholders: ['first_name', 'campaign_title', 'approved_summary'],
    },
    payout: {
        name: 'campaign_payout_sent',
        body: '💸 *Payout sent, {{1}}*\n\n*Amount:* ₹{{2}}\n*Campaign:* {{3}}\n*Reference:* {{4}}\n\nThanks for creating with Newbi!',
        placeholders: ['first_name', 'amount', 'campaign_title', 'reference'],
    },
    // Sent by the team from a campaign's Payouts (outreach-ask-payout): asks where to pay them.
    // URL button: their payout details page https://app.newbi.live/pay/{{1}} (the same signed token as /d/).
    payout_details: {
        name: 'campaign_payout_details',
        body: "💳 *Payout details needed, {{1}}*\n\n*Campaign:* {{2}}\n\nTo pay you for this campaign, we need your UPI ID or bank account. Tap *Add payout details* to share them securely.\n\nWe will never ask for your PIN, password or OTP.",
        placeholders: ['first_name', 'campaign_title'],
        button: 'Add payout details',
    },
    // When a deliverable opens for posting (worded as an update on their post, so Meta keeps it Utility): the day before its "Opens on" date, or
    // right away when the team opens it (api/_lib/postsOpen.js). Same posts link.
    posts_open: {
        name: 'campaign_posts_open',
        body: "🗓️ *Your post date is set, {{1}}*\n\nYour post for *{{2}}* can go up from {{3}}.\n\n*Post:* {{4}}\n*Due:* {{5}}\n\nOnce it's up, tap *Send my posts* so we can check it. Reply here if you need to change anything.",
        placeholders: ['first_name', 'campaign_title', 'opens_at', 'what_to_post', 'due_at'],
        button: 'Send my posts',
    },
    // The day before a posting deadline, and the day after it if the posts still aren't in
    // (api/_lib/postReminders.js). URL button: their posts link, like campaign_deliverables.
    post_due: {
        name: 'campaign_post_due',
        body: "⏳ *Your post is due tomorrow, {{1}}*\n\n*Campaign:* {{2}}\n*Due:* {{3}}\n*Still to send:* {{4}}\n\nPost it, then tap *Send my posts* so we can check it. Reply here if you need more time.",
        placeholders: ['first_name', 'campaign_title', 'due_at', 'still_to_send'],
        button: 'Send my posts',
    },
    post_overdue: {
        name: 'campaign_post_overdue',
        body: "⚠️ *We haven't got your post yet, {{1}}*\n\n*Campaign:* {{2}}\n*Was due:* {{3}}\n\nSend it today to stay on the campaign. If something came up, reply here and tell us.",
        placeholders: ['first_name', 'campaign_title', 'due_at'],
        button: 'Send my posts',
    },
    // The day after the campaign's event, to everyone who took part (api/_lib/campaignFeedback.js).
    // URL button: https://app.newbi.live/f/{{1}} (their own feedback form). Category: Utility (if Meta
    // moves it to Marketing, it still sends; it just costs more).
    feedback: {
        name: 'campaign_feedback',
        body: "🙏 *Thanks for creating with us, {{1}}!*\n\nHow was *{{2}}* for you? Tell us what worked and what we should fix. It takes about a minute.\n\nIf you'd like, add a few lines about working with Newbi, and tell us whether we can share them on our website.",
        placeholders: ['first_name', 'campaign_title'],
        button: 'Share feedback',
    },
};

export const NAME_FALLBACK = 'there';

/** "Reel, Story 1 and Story 2" for a few posts, else "All 5 posts" (the all_posts_approved summary). */
export const approvedSummary = (titles = []) => {
    const list = titles.map(t => String(t || '').trim()).filter(Boolean);
    if (!list.length) return 'All your posts';
    if (list.length > 3) return `All ${list.length} posts`;
    return list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
};
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
        approved_summary: String(data.summary || '').trim() || 'All your posts',
        due_at: String(data.dueAt || '').trim() || 'Soon',
        still_to_send: String(data.stillToSend || '').trim() || 'Your posts',
        opens_at: String(data.opensAt || '').trim() || 'today',
        what_to_post: String(data.whatToPost || '').trim() || 'Your posts',
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

/* Shortlisted while the template was off: told in the Newbi app only, so the WhatsApp invite can still go. */
export const toldInAppOnly = (app) => app?.status === 'message_sent' && app.messageSentBy === 'Newbi app' && !app.delivery?.whatsapp?.status && !app.joinedAt;

/* Has this person got an API message on its way or delivered? */
export const IN_FLIGHT = new Set(['queued', 'retrying', 'sent', 'delivered', 'read']);
