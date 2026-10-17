import { firstNameOf, waDigits } from './normalize.js';

/*
 * The shortlist WhatsApp message. Each campaign keeps its own template with
 * these placeholders:
 *
 *   {first_name}      "Riya". When the name isn't clear, "Hey {first_name}!" becomes "Hey!"
 *   {campaign_title}  the campaign's title
 *   {group_link}      the campaign's WhatsApp group invite
 *   {deadline_line}   "Please post by Monday, 2 November." or nothing when there's no posting deadline
 *   {submit_link}     their personal link to send their posts (Phase 3); empty when the campaign has no deliverables
 *
 * Phase 2 maps the same four values onto the approved Meta template's variables.
 */

export const PLACEHOLDERS = ['first_name', 'campaign_title', 'group_link', 'deadline_line', 'submit_link'];

export const DEFAULT_TEMPLATE = [
    'Hey {first_name}! 👋',
    '',
    "You're shortlisted for {campaign_title} with Newbi. 🎉",
    '',
    'Join the creators group for the brief, passes and next steps:',
    '{group_link}',
    '',
    '{deadline_line}',
    '',
    'See you there!',
].join('\n');

/** Placeholders in the template that we don't know, like {name} or {link}. */
export const unknownPlaceholders = (template) => {
    const found = String(template || '').match(/\{[a-z_]+\}/gi) || [];
    return [...new Set(found.map(p => p.slice(1, -1)).filter(p => !PLACEHOLDERS.includes(p)))];
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-11-02" → "Monday, 2 November". Calendar days, so no timezone can shift them. */
export const formatDeadline = (day) => {
    const m = String(day || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    if (Number.isNaN(d.getTime())) return '';
    // Built by hand: Intl output differs between browsers and Node versions.
    return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

export const deadlineLineFor = (campaign) => {
    const when = formatDeadline(campaign?.postingDeadline);
    return when ? `Please post by ${when}.` : '';
};

// A greeting word right before {first_name}: "Hey {first_name}!", "Hi {first_name},"
const GREETING_WITH_NAME = /\b(?:hey+|hi+|hello|hiya|dear)\s*\{first_name\}\s*[!,.]?/gi;

/**
 * The message for one person. `application` needs fullName; `campaign` needs
 * title, whatsappGroupLink and postingDeadline.
 */
export const renderMessage = (template, { application, campaign }) => {
    const firstName = firstNameOf(application?.fullName);
    let text = String(template || DEFAULT_TEMPLATE);
    if (!firstName) {
        text = text.replace(GREETING_WITH_NAME, 'Hey!').replace(/\{first_name\}/g, '');
    }
    const values = {
        first_name: firstName,
        campaign_title: String(campaign?.title || '').trim(),
        group_link: String(campaign?.whatsappGroupLink || '').trim(),
        deadline_line: deadlineLineFor(campaign),
        submit_link: String(application?.submitUrl || '').trim(),
    };
    text = text.replace(/\{(first_name|campaign_title|group_link|deadline_line|submit_link)\}/g, (_, key) => values[key]);
    // Tidy what empty values leave behind: "Thanks , see" → "Thanks, see", and blank-line runs.
    return text
        .split('\n')
        .map(line => line.replace(/[ \t]+([!,.?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

/** The click-to-chat link. The admin still presses send inside WhatsApp. */
export const waLink = (phone, message) => {
    const digits = waDigits(phone);
    if (!digits) return '';
    return `https://wa.me/${digits}?text=${encodeURIComponent(message || '')}`;
};
