/**
 * Proposal rules shared by the admin list, dashboard, store and public page.
 * Stored statuses stay 'Draft' | 'Sent' | 'Accepted' | 'Rejected'; "viewed"
 * and "expired" are derived from view logs and the validUntil date.
 */

export const PROPOSAL_STATUS = { DRAFT: 'Draft', SENT: 'Sent', ACCEPTED: 'Accepted', REJECTED: 'Rejected' };

/** Statuses that are final: sharing or editing must never move a proposal out of them. */
export const isProposalClosed = (p) => p?.status === PROPOSAL_STATUS.ACCEPTED || p?.status === PROPOSAL_STATUS.REJECTED;

/** Deal value: an uploaded proposal's stated value, else the manual override, else the computed total. */
export const proposalValue = (p) => {
    const candidates = [p?.dealValue, p?.totalOverride, p?.totalAmount];
    for (const v of candidates) {
        const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
        if (n > 0) return Math.round(n * 100) / 100;
    }
    return 0;
};

/** Client views only (admins previewing their own proposal aren't logged). */
export const proposalViews = (p) => (Array.isArray(p?.accessLogs) ? p.accessLogs : []);

const toDate = (v) => {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};

export const lastViewedAt = (p) => {
    const times = proposalViews(p).map(l => toDate(l.timestamp)).filter(Boolean);
    const opened = toDate(p?.lastOpened);
    if (opened) times.push(opened);
    return times.length ? new Date(Math.max(...times.map(d => d.getTime()))) : null;
};

/** validUntil is a calendar day; the offer stands until the end of that day in India. */
export const proposalExpiry = (p) => {
    if (!p?.validUntil) return null;
    const d = new Date(`${String(p.validUntil).slice(0, 10)}T23:59:59+05:30`);
    return isNaN(d.getTime()) ? null : d;
};

export const isProposalExpired = (p, now = new Date()) => {
    if (isProposalClosed(p)) return false;
    const expiry = proposalExpiry(p);
    return Boolean(expiry && expiry < now);
};

/** draft · sent · viewed · accepted · declined · expired */
export const proposalState = (p, now = new Date()) => {
    if (p?.status === PROPOSAL_STATUS.ACCEPTED) return 'accepted';
    if (p?.status === PROPOSAL_STATUS.REJECTED) return 'declined';
    if (isProposalExpired(p, now)) return 'expired';
    if (lastViewedAt(p)) return 'viewed';
    if (p?.status === PROPOSAL_STATUS.SENT) return 'sent';
    return 'draft';
};

export const PROPOSAL_STATE_LABEL = {
    draft: { label: 'Draft', tone: 'gray' },
    sent: { label: 'Sent', tone: 'blue' },
    viewed: { label: 'Viewed', tone: 'violet' },
    accepted: { label: 'Accepted', tone: 'green' },
    declined: { label: 'Declined', tone: 'red' },
    expired: { label: 'Expired', tone: 'amber' },
};

/** Next number in the NBQ series: one more than the highest NBQ-<digits> in use. */
export const nextProposalNumber = (proposals = []) => {
    let max = 0;
    proposals.forEach(p => {
        const m = /^NBQ-(\d+)$/i.exec(String(p?.proposalNumber || '').trim());
        if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `NBQ-${max ? max + 1 : 1001}`;
};

/** Fields a copy must not inherit: identity, client responses and history. */
export const PROPOSAL_NON_COPYABLE_FIELDS = [
    'id', 'status', 'proposalNumber', 'createdAt', 'updatedAt', 'createdBy', 'createdByEmail',
    'accessLogs', 'lastOpened', 'approvalMetadata', 'rejectionMetadata', 'clientSignature',
    'statusHistory', 'convertedInvoiceId', 'sentAt',
];

// ── What goes out with a proposal link ──
// Signed by the company, never a person.

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** "18 December 2026" (long) or "18 Dec 2026", for the proposal's valid-until date; '' when it has none. */
export const proposalValidUntil = (p, month = 'long') => {
    const expiry = proposalExpiry(p);
    return expiry ? expiry.toLocaleDateString('en-IN', { day: 'numeric', month, year: 'numeric' }) : '';
};

/** Who the message greets and what the proposal is for. */
const proposalNote = (p) => {
    const contact = firstName(p?.clientContactName);
    const company = String(p?.clientName || '').trim();
    return {
        greet: contact || company,
        project: String(p?.campaignName || p?.proposalTitle || '').trim(),
        // Named in the message only when the greeting is a person.
        company: contact && company ? company : '',
        number: String(p?.proposalNumber || '').trim(),
        validUntil: proposalValidUntil(p),
    };
};

/** "Here's our proposal for Pinnaca 2026 (ref NBQ-1637), prepared for Astrohm Private Limited." */
const introLine = (n, strong = (t) => t, esc = (t) => t) => `Here's our proposal${n.project ? ` for ${strong(n.project)}` : ''}${n.number ? ` (ref ${esc(n.number)})` : ''}${n.company ? `, prepared for ${esc(n.company)}` : ''}.`;

/** The WhatsApp message, link included (WhatsApp shows *text* in bold). */
export const proposalWhatsAppText = (p, link) => {
    const n = proposalNote(p);
    return [
        `Hi${n.greet ? ` ${n.greet}` : ''},`,
        '',
        introLine(n, (t) => `*${t}*`),
        '',
        'You can read it in full and accept it online here:',
        link,
        '',
        `${n.validUntil ? `The quote is valid until ${n.validUntil}. ` : ''}If you'd like anything changed, just reply here and we'll update it.`,
        '',
        'Thanks,',
        'Team Newbi Entertainment',
    ].join('\n');
};

/**
 * The email's subject, heading and message. The proposal template
 * (api/_lib/mail/templates/proposal.js) adds the document card, the facts
 * (client, valid until, value) and the button, so the message stays short.
 */
export const proposalEmail = (p) => {
    const n = proposalNote(p);
    return {
        subject: [`Proposal${n.project ? ` for ${n.project}` : ''}`, n.number].filter(Boolean).join(' · '),
        headerText: 'Your proposal is ready',
        messageBody: [
            `<p>Hi${n.greet ? ` <strong>${escapeHtml(n.greet)}</strong>` : ''},</p>`,
            `<p>${introLine(n, (t) => `<strong>${escapeHtml(t)}</strong>`, escapeHtml)}</p>`,
            `<p>You can read it in full and accept it online using the button below. If you'd like anything changed, just reply to this email.</p>`,
            `<p>Best regards,<br/>Newbi Entertainment</p>`,
        ].join('\n'),
    };
};

/** The same email as plain text, for a mailto: link. */
export const proposalEmailText = (p, link) => {
    const n = proposalNote(p);
    return [
        `Hi${n.greet ? ` ${n.greet}` : ''},`,
        '',
        introLine(n),
        '',
        'You can read it in full and accept it online here:',
        link,
        '',
        `${n.validUntil ? `The quote is valid until ${n.validUntil}. ` : ''}If you'd like anything changed, just reply to this email.`,
        '',
        'Best regards,',
        'Newbi Entertainment',
    ].join('\n');
};
