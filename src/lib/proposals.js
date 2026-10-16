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
