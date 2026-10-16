/**
 * Money rules for the Finance board, spends, other income and payees.
 * Pure functions only. Invoice money comes from lib/invoicing.js.
 *
 * Dates arrive as "YYYY-MM-DD" strings (what people typed), ISO strings,
 * Firestore Timestamps or {seconds}. Everything is bucketed by the day in
 * India (IST), so a payout saved at 1am IST never slides into the day before.
 */
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import Coins from 'lucide-react/dist/esm/icons/coins';
import Users from 'lucide-react/dist/esm/icons/users';
import {
    INVOICE_STATUS, invoiceAdvance, invoiceBalance, invoiceCollected, invoicePayments, invoiceTotal,
} from '../../../lib/invoicing';

export const FINANCE_TABS = [
    { name: 'Overview', path: '/admin/finance', icon: LayoutGrid },
    { name: 'Spends', path: '/admin/spends', icon: IndianRupee },
    { name: 'Other income', path: '/admin/other-income', icon: Coins },
    { name: 'Payees', path: '/admin/payees', icon: Users },
];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const amountOf = (n) => {
    const v = Number(n);
    return Number.isFinite(v) ? round2(v) : 0;
};

const IST_OFFSET = 330 * 60000;
const pad = (n) => String(n).padStart(2, '0');

/** Any stored date → "YYYY-MM-DD" in IST, or '' when it can't be read. */
export const dayOf = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    let d = null;
    if (typeof value?.toDate === 'function') d = value.toDate();
    else if (typeof value === 'object' && typeof value.seconds === 'number') d = new Date(value.seconds * 1000);
    else if (value instanceof Date) d = value;
    else d = new Date(value);
    if (!d || isNaN(d.getTime())) return '';
    const ist = new Date(d.getTime() + IST_OFFSET);
    return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
};

export const monthOf = (value) => dayOf(value).slice(0, 7);

/** Today in IST as "YYYY-MM-DD". */
export const todayIST = () => dayOf(new Date());

export const shiftMonth = (monthKey, delta) => {
    const [y, m] = monthKey.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};

export const monthLabel = (monthKey, opts = { month: 'short', year: 'numeric' }) => {
    if (!monthKey) return '';
    const [y, m] = monthKey.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });
};

export const formatDay = (value) => {
    const key = dayOf(value);
    if (!key) return '';
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

// ---------- Spends ----------

/** Spends saved over the years used Paid/Cleared and Pending/Unpaid. */
export const isSpendPaid = (sp) => sp?.status === 'Paid' || sp?.status === 'Cleared';
export const isSpendPending = (sp) => sp?.status === 'Pending' || sp?.status === 'Unpaid';

/** The day the money went out: the date people entered, else when it was logged. */
export const spendDay = (sp) => dayOf(sp?.date) || dayOf(sp?.createdAt);

export const SPEND_TYPES = {
    'Salary': { label: 'Salary', tone: 'blue' },
    'Volunteer Payout': { label: 'Volunteer payouts', tone: 'green' },
    'Vendor Payout': { label: 'Vendors', tone: 'orange' },
    'Artist Fee': { label: 'Artist fees', tone: 'violet' },
    'General Expense': { label: 'General expenses', tone: 'rose' },
};
export const spendType = (sp) => (SPEND_TYPES[sp?.payoutType] ? sp.payoutType : 'General Expense');

export const spendPayee = (sp) => sp?.receiverName || sp?.paidTo || '';

// ---------- Other income ----------

export const isIncomeReceived = (inc) => inc?.status === 'Paid' || inc?.status === 'Received';
export const isIncomePending = (inc) => !isIncomeReceived(inc);
export const incomeDay = (inc) => dayOf(inc?.date) || dayOf(inc?.createdAt);

// ---------- Invoices ----------

/**
 * Each amount an invoice brought in, with the day it came in. Adds up to
 * invoiceCollected(): the advance on the issue day, each recorded payment on
 * its day, and for invoices marked paid without (enough) payment entries,
 * the rest on the day they were marked paid.
 */
export const invoiceReceipts = (inv) => {
    const out = [];
    const issued = dayOf(inv?.issueDate || inv?.invoiceDate) || dayOf(inv?.createdAt);
    const advance = invoiceAdvance(inv);
    let counted = 0;
    if (advance > 0) {
        out.push({ day: issued, amount: advance, kind: 'advance' });
        counted += advance;
    }
    invoicePayments(inv).forEach(p => {
        if (!(p.amount > 0)) return;
        out.push({ day: dayOf(p.timestamp) || dayOf(p.recordedAt) || issued, amount: p.amount, kind: 'payment' });
        counted += p.amount;
    });
    const collected = invoiceCollected(inv);
    // Never count more than was collected (an advance larger than the total, an overpayment).
    if (counted > collected) {
        let excess = round2(counted - collected);
        for (let i = out.length - 1; i >= 0 && excess > 0; i--) {
            const cut = Math.min(out[i].amount, excess);
            out[i].amount = round2(out[i].amount - cut);
            excess = round2(excess - cut);
        }
    } else if (inv?.status === INVOICE_STATUS.PAID && collected - counted > 0.009) {
        out.push({ day: dayOf(inv.paidAt) || dayOf(inv.updatedAt) || issued, amount: round2(collected - counted), kind: 'marked-paid' });
    }
    return out.filter(r => r.amount > 0);
};

// ---------- One ledger for the board ----------

/**
 * Every money movement as one list:
 *   { id, source: 'invoice'|'income'|'spend', direction: 'in'|'out',
 *     settled, amount, day, category, title, who, account, record }
 * Invoices contribute one row per receipt (settled) plus their open balance
 * (not settled, dated by due date or issue date).
 */
export const buildLedger = ({ invoices = [], spends = [], otherIncomes = [] }) => {
    const rows = [];
    invoices.forEach(inv => {
        if (!inv || inv.isDeleted) return;
        const title = inv.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : 'Invoice';
        invoiceReceipts(inv).forEach((r, i) => rows.push({
            id: `inv-${inv.id}-${i}`, source: 'invoice', direction: 'in', settled: true,
            amount: r.amount, day: r.day, category: 'Client invoices', title, who: inv.clientName || 'Client',
            account: 'newbi', record: inv,
        }));
        const balance = invoiceBalance(inv);
        if (balance > 0) {
            rows.push({
                id: `inv-${inv.id}-due`, source: 'invoice', direction: 'in', settled: false,
                amount: balance, day: dayOf(inv.dueDate) || dayOf(inv.issueDate || inv.invoiceDate) || dayOf(inv.createdAt),
                category: 'Client invoices', title, who: inv.clientName || 'Client', account: 'newbi', record: inv,
                total: invoiceTotal(inv),
            });
        }
    });
    otherIncomes.forEach(inc => {
        if (!inc) return;
        const amount = amountOf(inc.amount);
        if (!(amount > 0)) return;
        rows.push({
            id: `inc-${inc.id}`, source: 'income', direction: 'in', settled: isIncomeReceived(inc),
            amount, day: incomeDay(inc), category: inc.category || 'Other income',
            title: inc.sourceName || 'Other income', who: inc.sourceName || '',
            account: inc.accountType === 'personal' ? 'personal' : 'newbi', holder: inc.receiverName || '', record: inc,
        });
    });
    spends.forEach(sp => {
        if (!sp) return;
        const amount = amountOf(sp.amount);
        if (!(amount > 0)) return;
        const type = spendType(sp);
        rows.push({
            id: `sp-${sp.id}`, source: 'spend', direction: 'out', settled: isSpendPaid(sp),
            amount, day: spendDay(sp), category: SPEND_TYPES[type].label, type,
            title: sp.title || SPEND_TYPES[type].label, who: spendPayee(sp),
            account: sp.accountType === 'personal' ? 'personal' : 'newbi', holder: sp.paidBy || '', record: sp,
        });
    });
    return rows;
};

/** Settled in / out / net for rows whose day falls inside [from, to] (inclusive "YYYY-MM-DD"). */
export const sumRange = (rows, from, to) => {
    let income = 0, invoiceIn = 0, otherIn = 0, out = 0;
    rows.forEach(r => {
        if (!r.settled || !r.day) return;
        if ((from && r.day < from) || (to && r.day > to)) return;
        if (r.direction === 'in') {
            income += r.amount;
            if (r.source === 'invoice') invoiceIn += r.amount; else otherIn += r.amount;
        } else out += r.amount;
    });
    return { income: round2(income), invoiceIn: round2(invoiceIn), otherIn: round2(otherIn), out: round2(out), net: round2(income - out) };
};

export const monthRange = (monthKey) => {
    if (!monthKey) return [null, null];
    return [`${monthKey}-01`, `${monthKey}-31`];
};

/** % change, or null when there's nothing to compare with. */
export const change = (now, before) => {
    if (!before) return null;
    return Math.round(((now - before) / Math.abs(before)) * 100);
};

// ---------- Payees ----------

const digits = (s) => String(s || '').replace(/\D/g, '');
const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** The UPI ID or bank account number a payee is paid to, for matching. */
export const payeeAccountKey = (p) => {
    const upi = norm(p?.upiId) || (/upi:\s*([^|\s]+)/i.exec(p?.destinationDetails || '')?.[1] || '').toLowerCase();
    if (upi && upi.includes('@')) return `upi:${upi}`;
    const acct = digits(p?.bankDetails?.accountNumber) || digits(/a\/c:\s*([^|]+)/i.exec(p?.destinationDetails || '')?.[1]);
    if (acct.length >= 6) return `ac:${acct}`;
    return '';
};

/**
 * Groups payees that look like the same person: same email, same phone
 * (last 10 digits) or same UPI / bank account. Returns Map(id → group id).
 */
export const findDuplicatePayees = (payees = []) => {
    const parent = new Map();
    const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
    const seen = new Map();
    payees.forEach(p => parent.set(p.id, p.id));
    payees.forEach(p => {
        const keys = [];
        if (norm(p.email)) keys.push(`e:${norm(p.email)}`);
        const ph = digits(p.phone).slice(-10);
        if (ph.length === 10) keys.push(`p:${ph}`);
        const acct = payeeAccountKey(p);
        if (acct) keys.push(acct);
        keys.forEach(k => {
            if (seen.has(k)) union(seen.get(k), p.id); else seen.set(k, p.id);
        });
    });
    const groups = new Map();
    payees.forEach(p => {
        const root = find(p.id);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(p.id);
    });
    const result = new Map();
    groups.forEach((ids, root) => { if (ids.length > 1) ids.forEach(id => result.set(id, root)); });
    return result;
};

/** Spends that went to this payee (matched by name, case-insensitive). */
export const spendsForPayee = (payee, spends = []) => {
    const name = norm(payee?.name);
    if (!name) return [];
    return spends.filter(sp => norm(sp?.receiverName) === name || norm(sp?.paidTo) === name);
};

/** "UPI: x" / "Bank: … | A/C: … | IFSC: …", the format the registration page saves. */
export const destinationFor = ({ paymentMode, upiId, bankName, accountNumber, ifscCode, otherDetails }) => {
    if (paymentMode === 'UPI') return upiId?.trim() ? `UPI: ${upiId.trim()}` : '';
    if (paymentMode === 'Bank Transfer') {
        if (!bankName?.trim() && !accountNumber?.trim() && !ifscCode?.trim()) return '';
        return `Bank: ${(bankName || '').trim()} | A/C: ${(accountNumber || '').trim()} | IFSC: ${(ifscCode || '').trim().toUpperCase()}`;
    }
    return (otherDetails || '').trim();
};

export const PAYEE_TYPES = {
    Volunteer: { label: 'Volunteer', plural: 'Volunteers', tone: 'green', hint: 'Event gigs and helpers' },
    Vendor: { label: 'Vendor', plural: 'Vendors', tone: 'orange', hint: 'Suppliers and partners' },
    Salary: { label: 'Core team', plural: 'Core team', tone: 'blue', hint: 'Monthly salary and staff' },
    Artist: { label: 'Artist', plural: 'Artists', tone: 'violet', hint: 'Performer and creator fees' },
};
export const payeeType = (p) => (PAYEE_TYPES[p?.type] ? p.type : 'Vendor');
