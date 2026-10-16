/**
 * Invoice money rules shared by the admin list, the dashboard, the store and
 * the public invoice page. Pure functions only.
 *
 * Status values stay as they always were ('Pending', 'Verification Pending',
 * 'Paid'); partial payments live in paymentLogs and everything else
 * (balance, overdue, partly paid) is derived from them.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const INVOICE_STATUS = {
    PENDING: 'Pending',
    VERIFYING: 'Verification Pending',
    PAID: 'Paid',
};

export const invoiceTotal = (inv) => round2(inv?.total ?? inv?.amount ?? 0);

/** A line's amount as the invoice paper prints it: a blank or zero qty counts as 1. */
export const invoiceLineAmount = (item) => round2((Number(item?.qty) || 1) * (Number(item?.price) || 0));

/**
 * The money on a generated invoice, worked out the same way by the builder
 * and the public invoice page: subtotal of the lines, GST on the subtotal
 * (rounded to paise), and the total.
 */
export const invoiceAmounts = (inv) => {
    const items = Array.isArray(inv?.items) ? inv.items : [];
    const subtotal = round2(items.reduce((sum, item) => sum + invoiceLineAmount(item), 0));
    const gstRate = inv?.showGst ? (Number(inv?.gstPercentage) || 0) : 0;
    const gstAmount = round2((subtotal * gstRate) / 100);
    return { subtotal, gstRate, gstAmount, total: round2(subtotal + gstAmount) };
};

/** Advance shown on the invoice (only counts when the invoice displays it). */
export const invoiceAdvance = (inv) => (inv?.showAdvance === false ? 0 : round2(inv?.advancePaid || 0));

/** Payments recorded against the invoice after it was issued. */
export const invoicePayments = (inv) => (Array.isArray(inv?.paymentLogs) ? inv.paymentLogs : [])
    .filter(log => !log?.voided)
    .map(log => ({ ...log, amount: round2(log?.amount || 0) }));

export const invoiceReceived = (inv) => round2(invoicePayments(inv).reduce((a, p) => a + p.amount, 0));

/** What the client still owes. A paid invoice owes nothing. */
export const invoiceBalance = (inv) => {
    if (inv?.status === INVOICE_STATUS.PAID) return 0;
    return Math.max(0, round2(invoiceTotal(inv) - invoiceAdvance(inv) - invoiceReceived(inv)));
};

/** Everything collected so far, including the advance. */
export const invoiceCollected = (inv) => (inv?.status === INVOICE_STATUS.PAID
    ? invoiceTotal(inv)
    : Math.min(invoiceTotal(inv), round2(invoiceAdvance(inv) + invoiceReceived(inv))));

export const todayKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const isInvoiceOverdue = (inv, today = todayKey()) =>
    inv?.status !== INVOICE_STATUS.PAID && Boolean(inv?.dueDate) && String(inv.dueDate).slice(0, 10) < today && invoiceBalance(inv) > 0;

export const daysOverdue = (inv, now = new Date()) => {
    if (!isInvoiceOverdue(inv, todayKey(now))) return 0;
    const due = new Date(`${String(inv.dueDate).slice(0, 10)}T00:00:00`);
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((start - due) / 86400000));
};

/**
 * One label for lists and filters:
 * paid · verifying · overdue · partial · unpaid
 */
export const invoiceState = (inv, today = todayKey()) => {
    if (inv?.status === INVOICE_STATUS.PAID) return 'paid';
    if (inv?.status === INVOICE_STATUS.VERIFYING || inv?.paymentClaim?.status === 'pending') return 'verifying';
    if (isInvoiceOverdue(inv, today)) return 'overdue';
    if (invoiceReceived(inv) > 0) return 'partial';
    return 'unpaid';
};

export const INVOICE_STATE_LABEL = {
    paid: { label: 'Paid', tone: 'green' },
    verifying: { label: 'Claimed paid', tone: 'amber' },
    overdue: { label: 'Overdue', tone: 'red' },
    partial: { label: 'Part paid', tone: 'blue' },
    unpaid: { label: 'Unpaid', tone: 'gray' },
};

/**
 * Next number in the INV-0001 series: one more than the highest INV-<digits>
 * already used, so numbers stay unique and increasing.
 */
export const nextInvoiceNumber = (invoices = []) => {
    let max = 0;
    let width = 4;
    invoices.forEach(inv => {
        const m = /^INV-(\d+)$/i.exec(String(inv?.invoiceNumber || '').trim());
        if (m) {
            max = Math.max(max, parseInt(m[1], 10));
            width = Math.max(width, m[1].length);
        }
    });
    return `INV-${String(max + 1).padStart(width, '0')}`;
};

/** Fields a copy must not inherit: history, payments, sharing and identity. */
export const INVOICE_NON_COPYABLE_FIELDS = [
    'id', 'status', 'paymentClaim', 'paymentLogs', 'accessLogs', 'lastOpened',
    'createdAt', 'updatedAt', 'createdBy', 'createdByEmail', 'dueDate', 'advancePaid',
    'paymentLink', 'clientSignature',
];

const asDate = (v) => {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(String(v).length === 10 ? `${v}T12:00:00` : v);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Money received on or after `since`. Uses recorded payments; invoices marked
 * paid the old way (no payment entries) count their total on the day they were
 * marked paid (paidAt, else last update, else issue date).
 */
export const invoiceCollectedSince = (inv, since) => {
    // The advance counts as received on the issue date (same rule as the Finance board).
    const issued = asDate(inv?.issueDate || inv?.invoiceDate);
    const advance = issued && issued >= since ? invoiceAdvance(inv) : 0;
    const payments = invoicePayments(inv);
    if (payments.length) {
        return round2(advance + payments.reduce((a, p) => {
            const d = asDate(p.timestamp);
            return d && d >= since ? a + p.amount : a;
        }, 0));
    }
    if (inv?.status !== INVOICE_STATUS.PAID) return round2(advance);
    const when = asDate(inv.paidAt) || asDate(inv.updatedAt) || issued;
    return round2(advance + (when && when >= since ? Math.max(0, invoiceTotal(inv) - invoiceAdvance(inv)) : 0));
};
