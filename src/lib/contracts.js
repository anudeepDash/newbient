/**
 * Contract (agreement) rules shared by the admin list, store and public page.
 * Stored statuses: 'Draft' (being written) · 'Final' (ready to sign) · 'Executed' (signed).
 */

export const CONTRACT_STATUS = { DRAFT: 'Draft', FINAL: 'Final', EXECUTED: 'Executed' };

export const contractParty = (a) => a?.parties?.secondParty?.name || a?.clientName || '';
export const contractTitle = (a) => a?.details?.projectName || a?.template || a?.type || '';

/** Contract value from the commercials section (stored as text like "₹5,00,000"). */
export const contractValue = (a) => {
    for (const v of [a?.commercials?.totalValue, a?.dealValue]) {
        const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
        if (n > 0) return Math.round(n * 100) / 100;
    }
    return 0;
};

const toDate = (v) => {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};

export const contractViews = (a) => (Array.isArray(a?.accessLogs) ? a.accessLogs : []);

export const contractLastViewed = (a) => {
    const times = contractViews(a).map(l => toDate(l.timestamp)).filter(Boolean);
    const opened = toDate(a?.lastOpened);
    if (opened) times.push(opened);
    return times.length ? new Date(Math.max(...times.map(d => d.getTime()))) : null;
};

/** draft · ready · viewed · signed */
export const contractState = (a) => {
    if (a?.status === CONTRACT_STATUS.EXECUTED) return 'signed';
    if (a?.status === CONTRACT_STATUS.DRAFT) return 'draft';
    return contractLastViewed(a) ? 'viewed' : 'ready';
};

export const CONTRACT_STATE_LABEL = {
    draft: { label: 'Draft', tone: 'gray' },
    ready: { label: 'Ready to sign', tone: 'blue' },
    viewed: { label: 'Viewed', tone: 'violet' },
    signed: { label: 'Signed', tone: 'green' },
};

/** Fields a copy must not inherit: identity, signature and history. */
export const CONTRACT_NON_COPYABLE_FIELDS = [
    'id', 'status', 'createdAt', 'updatedAt', 'createdBy', 'createdByEmail', 'accessLogs', 'lastOpened',
    'approvalMetadata', 'clientSignature', 'executedAt', 'lastSharedAt', 'lastSharedVia',
];
