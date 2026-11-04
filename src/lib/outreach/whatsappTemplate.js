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

/*
 * Sent once when someone registers on the creator portal (api/creator-join.js, through the outreach queue): their
 * city's creators community, as a "Join the community" URL button (app.newbi.live/wa/g/<code>), then Stop updates.
 * Not tied to a campaign, so it isn't in WA_TEMPLATES. Variables: first name, city.
 */
export const WELCOME_CITY_BODY = "👋 *Welcome to Newbi Creators, {{1}}!*\n\nYour creator profile is set up. Paid gigs, guestlist passes and meetups in {{2}} are posted first in our city creators community on WhatsApp.\n\nTap *Join the community* below to get in.";

/*
 * Outreach → WhatsApp → Campaign open (and the announcement from Campaigns): a campaign is live, with a "View the
 * brief" URL button to its page in the app (app.newbi.live/c/<campaign id>), where the brief, the perks and Apply
 * are. Then Stop updates. Used instead of campaign_invite once WHATSAPP_TEMPLATE_CAMPAIGN_LIVE_BRIEF is set.
 * Variables: first name, campaign title (the same as campaign_invite, so either can go out).
 */
export const LIVE_BRIEF_TEMPLATE = 'campaign_live_brief';
export const LIVE_BRIEF_BODY = "📣 *A new campaign is live, {{1}}*\n\n*Campaign:* {{2}}\n\nThe brief has what to post, what you get and how to apply. Tap *View the brief* to open it in the Newbi app.";

// As approved in Meta: WhatsApp Manager strips emoji from button labels.
export const JOIN_BUTTON = 'Joined';
export const STOP_BUTTON = 'Stop updates';
/* The quick-reply payload of "Stop updates" (and texts like STOP) opts the number out of every template. */
export const STOP_PAYLOAD = 'stop';
export const INTERESTED_BUTTON = "I'm interested";

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
    // When the team opens (makes live) a deliverable: the brief itself, so creators needn't open the group to find it
    // (api/_lib/postsOpen.js). Also sent again by hand from Outreach → Send on WhatsApp. URL button: their posts link.
    task_live: {
        name: 'campaign_task_live',
        body: "📌 *A new task is live, {{1}}*\n\n*Campaign:* {{2}}\n*Task:* {{3}}\n\n*What to do:* {{4}}\n\n*Links:* {{5}}\n\n*Due:* {{6}}\n\nTap *Open my task* for the full brief. Once your post is up, send it to us from the same page so we can check it.",
        placeholders: ['first_name', 'campaign_title', 'task_title', 'task_details', 'task_links', 'due_at'],
        button: 'Open my task',
    },
    // Sent by the team from Outreach → Send on WhatsApp, to approved creators: the campaign's group (or another
    // group link they paste). Quick replies: Joined (signed, marks them joined) and Stop updates.
    group_link: {
        name: 'campaign_group_link',
        body: "👥 *Your creators group, {{1}}*\n\nYou're on the creator list for *{{2}}*. Briefs, passes and updates for the campaign are shared in this WhatsApp group:\n{{3}}\n\nTap *Joined* once you're in.",
        placeholders: ['first_name', 'campaign_title', 'group_link'],
    },
    // Sent by the team from Outreach → Send on WhatsApp: a short note about the campaign with a link (a brief,
    // a Drive folder, a form, a location). Quick reply: Stop updates.
    update: {
        name: 'campaign_update',
        body: "📣 *An update on your campaign, {{1}}*\n\n*Campaign:* {{2}}\n*Update:* {{3}}\n\n*Link:* {{4}}\n\nThis is about a campaign you’re on with Newbi. Reply here if you have any questions.",
        placeholders: ['first_name', 'campaign_title', 'update_note', 'update_link'],
    },
    // The first message to someone the team imported from a sheet (Outreach → Import), who gave Newbi their number
    // for creator collaborations but never applied. Quick replies: "I'm interested" (signed, marks them interested)
    // and "Stop updates". Category: Marketing (it's an invitation, not an update on something they did).
    reach_out: {
        name: 'campaign_creator_invite',
        body: "👋 *Hi {{1}}, it's the Newbi team*\n\nWe're picking creators for *{{2}}* in {{3}}.\n\n*What you get:* {{4}}\n\nYou're getting this because you shared your number with Newbi for creator collaborations. Tap *I'm interested* and we'll send you the details here.",
        placeholders: ['first_name', 'campaign_title', 'campaign_city', 'campaign_reward'],
    },
    // The group invite, reworded (replaces campaign_group_link once approved): what the group is for and a join-by date.
    // Quick replies: Joined (signed, marks them joined) and Stop updates.
    group_join: {
        name: 'campaign_group_join',
        body: "👥 *Hi {{1}}, join the {{2}} creators group*\n\nEverything for this campaign happens in the group: the brief, task dates, passes and quick updates from the Newbi team.\n\n*Group link:* {{3}}\n*Join by:* {{4}}\n\nTap *Joined* once you're in, so we know you've got it.",
        placeholders: ['first_name', 'campaign_title', 'group_link', 'join_by'],
    },
    // The group invite with a real button (replaces campaign_group_join and campaign_group_link once approved): the link
    // isn't in the text, it's the "Join the group" URL button (app.newbi.live/wa/g/<code>, which redirects to
    // chat.whatsapp.com/<code>). Then quick replies Joined (signed, marks them joined) and Stop updates.
    group_invite: {
        name: 'campaign_group_invite',
        body: "👥 *Hi {{1}}, join the {{2}} creators group*\n\nEverything for this campaign happens in the group: the brief, task dates, passes and quick updates from the Newbi team.\n\n*Join by:* {{3}}\n\nTap *Join the group* below, then tap *Joined* so we know you're in.",
        placeholders: ['first_name', 'campaign_title', 'join_by'],
        button: 'Join the group',
    },
    // The day before (or the morning of) the campaign's event, to approved creators: when, where, and anything to
    // bring. URL button: their creator page (/d/), where their pass and tasks are.
    event_day: {
        name: 'campaign_event_day',
        body: "🎬 *Hi {{1}}, see you at {{2}}*\n\n*When:* {{3}}\n*Where:* {{4}}\n*Note:* {{5}}\n\nShow your pass at the gate and ask for the Newbi crew. Tap *Open my page* for your pass and tasks.",
        placeholders: ['first_name', 'campaign_title', 'event_when', 'event_where', 'event_note'],
        button: 'Open my page',
    },
    // The team changed something in the brief. URL button: their task page with the brief.
    brief_changed: {
        name: 'campaign_brief_updated',
        body: "📋 *The brief changed, {{1}}*\n\n*Campaign:* {{2}}\n*What's new:* {{3}}\n\nRead the full brief before you post. Already posted? Reply here and we'll tell you if anything needs changing.",
        placeholders: ['first_name', 'campaign_title', 'update_note'],
        button: 'Open my task',
    },
    // Closes the loop for applicants who weren't picked. Quick reply: Stop updates.
    not_selected: {
        name: 'campaign_not_selected',
        body: "🙏 *Thanks for applying, {{1}}*\n\n*Campaign:* {{2}}\n\nThis one is full and we couldn't shortlist everyone. Your profile stays with us, and we'll message you when a campaign fits.",
        placeholders: ['first_name', 'campaign_title'],
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

/*
 * A WhatsApp group link's invite code ("https://chat.whatsapp.com/AbC…?mode=gi_t" → "AbC…"), or '' when it isn't
 * one. Templates with a "Join" button carry only the code: the button opens app.newbi.live/wa/g/<code>, which
 * redirects to the group (vercel.json), so the button shows our domain.
 */
export const groupCodeOf = (link) => {
    const m = String(link || '').trim().match(/^https:\/\/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{10,40})\/?(?:[?#].*)?$/);
    return m ? m[1] : '';
};
export const GROUP_JOIN_PATH = '/wa/g/';
export const WELCOME_CITY_TEMPLATE = 'creator_welcome_city';
export const JOIN_GROUP_BUTTON = 'Join the group';
export const JOIN_COMMUNITY_BUTTON = 'Join the community';

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
        group_link: String(data.link || groupLink || '').trim(),
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
        task_details: String(data.details || '').trim() || 'The full brief is on your task page.',
        task_links: String(data.links || '').trim() || 'None for this task.',
        update_note: String(data.note || '').trim() || 'There’s a new update for you.',
        update_link: String(data.link || '').trim(),
        campaign_city: String(data.city || campaign?.targetCity || (Array.isArray(campaign?.cities) ? campaign.cities[0] : '') || application?.city || 'your city').trim(),
        campaign_reward: String(data.reward || campaign?.reward || '').replace(/\s+/g, ' ').trim() || 'Details in the next message',
        join_by: String(data.joinBy || '').trim() || 'As soon as you can',
        event_when: String(data.when || '').trim() || 'Details on your page',
        event_where: String(data.where || '').trim() || 'Details on your page',
        event_note: String(data.note || '').trim() || 'Nothing extra, just bring your phone charged.',
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
