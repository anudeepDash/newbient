import { auth } from './firebase';

/*
 * The browser's only way to send mail. Emails are built and sent on the
 * server (api/mail.js); the browser says what happened, or (staff) what to
 * send to whom.
 */

const callMail = async (body, { optionalAuth = false } = {}) => {
    let token = null;
    try { token = await auth.currentUser?.getIdToken?.(); } catch { token = null; }
    if (!token && !optionalAuth) throw new Error('Please sign in again.');
    let res;
    try {
        res = await fetch('/api/mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(body),
        });
    } catch {
        throw new Error('Network error. Check your connection and try again.');
    }
    let data = {};
    try { data = await res.json(); } catch { data = {}; }
    // Only a JSON { success: true } counts (a dev server answering with index.html doesn't).
    if (!res.ok || data.success !== true) {
        const err = new Error(data.error || `Request failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
};

/**
 * Tells the server something happened so it sends the right emails, WhatsApp
 * and push for that record. Never throws: a failed notification must not
 * break the flow that triggered it.
 *   notifyEvent('pass-confirmed', { guestlistId, entryId })
 */
export const notifyEvent = async (event, payload = {}) => {
    try {
        return await callMail({ action: 'event', event, ...payload }, { optionalAuth: true });
    } catch (err) {
        console.warn(`[mail] ${event} notification failed:`, err.message);
        return { success: false, error: err.message };
    }
};

/** Staff: a branded server template (invoice, proposal, agreement, receipt, creator-message…). */
export const sendTemplateEmail = ({ template, data, to, cc, bcc, attachments, ref }) => callMail({ action: 'send-template', template, data, to, cc, bcc, attachments, ref });

/** Staff: free-form mail from the composer screens (custom html). */
export const sendStaffMail = ({ to, cc, bcc, subject, html, text, fromName, fromEmail, accountType, attachments }) => callMail({ to, cc, bcc, subject, html, text, fromName, fromEmail, accountType, attachments });

/**
 * What the EmailComposer hands its onSend: a server template + data when the
 * screen uses one (documents), else staff html. The sender details are only
 * used for html; templates pick their own sender.
 */
export const sendComposedEmail = ({ to, cc, bcc, subject, html, template, data, fromName, fromEmail, attachments }) => (template
    ? sendTemplateEmail({ template, data: { ...(data || {}), subject }, to, cc, bcc, attachments })
    : sendStaffMail({ to, cc, bcc, subject, html, fromName, fromEmail, attachments }));

/* ---------- Bulk campaigns (queued on the server) ---------- */

const toRecipients = (list) => (list || []).map((r) => (typeof r === 'string'
    ? { email: r }
    : { email: r.email, name: r.displayName || r.name || r.fullName || '', role: r.role || r.category || '' }));

/** Counts who will actually get it (after duplicates, invalid and unsubscribed), and today's room. */
export const previewCampaign = ({ recipients, exclude, accountType, fromEmail }) => callMail({ action: 'campaign-preview', recipients: toRecipients(recipients), exclude, accountType, fromEmail });

/**
 * Queues a campaign. The server sends it in batches within the daily limit,
 * so the tab can be closed. `scheduledAt` (ISO) sends it later.
 * → { campaignId, status: 'queued'|'scheduled', queued, suppressed[], invalid, duplicates }
 */
export const queueCampaign = ({ recipients, subject, html, accountType = 'official', fromName, fromEmail, meta, scheduledAt, exclude }) => callMail({
    action: 'campaign-create', recipients: toRecipients(recipients), subject, html, accountType, fromName, fromEmail, meta, scheduledAt: scheduledAt || null, exclude,
});

/** Re-queues the people who didn't get it. Old browser-sent campaigns need html + recipients. */
export const retryQueuedCampaign = ({ campaignId, html, subject, recipients, accountType, fromName, fromEmail }) => callMail({
    action: 'campaign-retry', campaignId, html, subject, recipients: recipients ? toRecipients(recipients) : undefined, accountType, fromName, fromEmail,
});

export const cancelQueuedCampaign = (campaignId) => callMail({ action: 'campaign-cancel', campaignId });

/** One copy to your own (signed-in) address, through the same server path. */
export const sendCampaignTest = ({ subject, html, accountType, fromName, fromEmail }) => callMail({ action: 'campaign-test', subject, html, accountType, fromName, fromEmail });

/** Asks the server to send queued mail now (e.g. a scheduled campaign that's due). */
export const kickMailWorker = () => callMail({ action: 'worker' }).catch(() => null);

/* ---------- Unsubscribes ---------- */

export const fetchSuppressionList = async () => (await callMail({ action: 'suppression-list' })).entries || [];
export const allowEmailAgain = (email) => callMail({ action: 'resubscribe', email });

/* ---------- Public forms ---------- */

const callForms = async (type, body) => {
    let token = null;
    try { token = await auth.currentUser?.getIdToken?.(); } catch { token = null; }
    const res = await fetch(`/api/forms?type=${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
    });
    let data = {};
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok || data.success !== true) {
        const err = new Error(data.error || `Request failed (${res.status})`);
        err.status = res.status;
        throw err;
    }
    return data;
};

/** Contact form: saved, the team alerted and an auto-reply sent, all on the server. */
export const submitEnquiry = (form) => callForms('enquiry', form);

/** Newsletter sign-up; people who unsubscribed before get a confirm email first. */
export const subscribeToNewsletter = (email, name = '') => callForms('subscribe', { email, name });
