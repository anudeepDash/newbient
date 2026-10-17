/**
 * Every server email, by event name. Each template is (data, ctx) => model,
 * rendered by layout.js into { subject, html, text }. Pure JS so the admin can
 * import it for previews.
 */
import { renderEmail } from '../layout.js';
import welcome from './welcome.js';
import passwordReset from './password-reset.js';
import sessionsRevoked from './sessions-revoked.js';
import passConfirmed from './pass-confirmed.js';
import campaignTicket from './campaign-ticket.js';
import orderReceived from './order-received.js';
import creatorApplicationReceived from './creator-application-received.js';
import creatorApproved from './creator-approved.js';
import creatorRejected from './creator-rejected.js';
import campaignInvite from './campaign-invite.js';
import submissionReviewed from './submission-reviewed.js';
import campaignShortlisted from './campaign-shortlisted.js';
import giveawayEntry from './giveaway-entry.js';
import enquiryAutoreply from './enquiry-autoreply.js';
import payeeRegistered from './payee-registered.js';
import staffAuthorized from './staff-authorized.js';
import paymentApproved from './payment-approved.js';
import paymentDeclined from './payment-declined.js';
import creatorMessage from './creator-message.js';
import subscribeConfirm from './subscribe-confirm.js';
import invoice from './invoice.js';
import proposal from './proposal.js';
import agreement from './agreement.js';
import receipt from './receipt.js';

export const TEMPLATES = {
    welcome,
    'password-reset': passwordReset,
    'sessions-revoked': sessionsRevoked,
    'pass-confirmed': passConfirmed,
    'campaign-ticket': campaignTicket,
    'order-received': orderReceived,
    'creator-application-received': creatorApplicationReceived,
    'creator-approved': creatorApproved,
    'creator-rejected': creatorRejected,
    'campaign-invite': campaignInvite,
    'submission-reviewed': submissionReviewed,
    'campaign-shortlisted': campaignShortlisted,
    'giveaway-entry': giveawayEntry,
    'enquiry-autoreply': enquiryAutoreply,
    'payee-registered': payeeRegistered,
    'staff-authorized': staffAuthorized,
    'payment-approved': paymentApproved,
    'payment-declined': paymentDeclined,
    'creator-message': creatorMessage,
    'subscribe-confirm': subscribeConfirm,
    invoice,
    proposal,
    agreement,
    receipt,
};

/** Templates staff may send from the admin with their own data. */
export const STAFF_TEMPLATES = new Set(['invoice', 'proposal', 'agreement', 'receipt', 'creator-message', 'payment-approved', 'payment-declined', 'staff-authorized']);

export const hasTemplate = (name) => Object.prototype.hasOwnProperty.call(TEMPLATES, name);

/**
 * render('pass-confirmed', data, { origin, appOrigin, unsubscribeUrl })
 * → { subject, html, text, sender, kind }
 */
export const render = (name, data = {}, opts = {}) => {
    if (!hasTemplate(name)) throw new Error(`Unknown email template: ${name}`);
    const model = TEMPLATES[name](data || {}, opts);
    const out = renderEmail(model, opts);
    return { ...out, sender: model.sender || 'official', kind: model.kind === 'marketing' ? 'marketing' : 'transactional' };
};
