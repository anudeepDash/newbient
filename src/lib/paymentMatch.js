/**
 * Matching UPI payments in a bank or UPI-app statement to ticket orders that
 * wait for a payment check, so the team can verify many at once.
 *
 * Statements come in every shape (bank CSV exports, PhonePe/GPay Business
 * downloads, text copied from netbanking), so this reads them as lines and
 * looks in each line for:
 *   a UTR      any 12-digit number (UPI references are always 12 digits)
 *   a ref      a booking reference like NB-7K2QXM (the checkout puts it in the
 *              payment note, which most statements show in the remarks)
 *   amounts    cells that are just a number (amount columns), or numbers with
 *              a ₹ / Rs / INR sign in free text
 * An order matches on its UTR, or on its booking reference, and the amount on
 * that line must equal what the order should have paid.
 */

import { normalizeUtr } from './ticketing.js';

const UTR_RE = /(?<!\d)\d{12}(?!\d)/g;
const REF_RE = /NB-?([A-HJ-NP-Z2-9]{6})(?![A-Z0-9])/gi;
// Inside free text, only amounts with a currency sign count (₹1,499 · Rs. 500 · INR 500).
const CURRENCY_RE = /(?:₹|\brs\.?|\binr)\s*(\d{1,3}(?:,\d{2,3}(?!\d))+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi;
// A whole cell that is just a number (an amount column): 1,499.00 · 500.00 · 500 · ₹500 · 500.00 CR
const CELL_AMOUNT_RE = /^(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d{1,7}(?:\.\d{1,2})?)\s*(?:cr|dr)?$/i;

const toAmount = (s) => {
    const n = Number(String(s).replace(/,/g, ''));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

/* A statement line split into cells: CSV (with quotes), tabs, semicolons or pipes. Plain text stays one cell. */
const cellsOf = (line) => {
    const sep = line.includes('\t') ? '\t' : /[;|]/.test(line) && !line.includes(',') ? (line.includes(';') ? ';' : '|') : ',';
    const cells = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
        } else if (ch === sep && !quoted) {
            cells.push(cur.trim()); cur = '';
        } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
};

const amountsIn = (line) => {
    const out = [];
    // Free text: amounts with a currency sign, read over the whole line ("Paid Rs. 1,499.00 to …").
    for (const m of line.matchAll(CURRENCY_RE)) out.push(toAmount(m[1]));
    // Columns (three or more cells): cells that are just a number.
    const cells = cellsOf(line);
    if (cells.length >= 3) {
        cells.forEach(cell => {
            if (!cell || /^\d{12}$/.test(cell)) return;
            const whole = cell.match(CELL_AMOUNT_RE);
            if (whole) out.push(toAmount(whole[1]));
        });
    }
    // Amounts with paise first: they're the money columns; bare integers come last.
    return [...new Set(out.filter(n => n !== null && n > 0))].sort((a, b) => Number(!(a % 1)) - Number(!(b % 1)));
};

/** Each line of a statement with the UTRs, booking refs and amounts on it. */
export const readStatement = (text) => String(text || '')
    .split(/\r?\n/)
    .map((raw, index) => {
        const line = raw.trim();
        if (!line) return null;
        const utrs = [...new Set(line.match(UTR_RE) || [])];
        const refs = [...new Set([...line.matchAll(REF_RE)].map(m => `NB-${m[1].toUpperCase()}`))];
        const amounts = amountsIn(line);
        if (!utrs.length && !refs.length) return null;
        return { index, line: line.slice(0, 300), utrs, refs, amounts };
    })
    .filter(Boolean);

const amountDue = (order) => Math.round((Number(order.totalAmount) || 0) * 100) / 100;

/**
 * For each pending paid order: how it was found in the statement.
 *   matched       the UTR (or booking ref) is there with the right amount
 *   wrongAmount   found, but the line shows a different amount
 *   notFound      not in this statement
 * Lines that matched no order are returned as `unmatched` (payments with no booking).
 */
export const matchStatement = (text, orders) => {
    const lines = readStatement(text);
    const used = new Set();
    const results = (orders || [])
        .filter(o => o.status === 'pending' && Number(o.totalAmount) > 0)
        .map(order => {
            const utr = normalizeUtr(order.paymentRef);
            const ref = String(order.bookingRef || '').toUpperCase();
            const due = amountDue(order);
            const hit = lines.find(l => utr && l.utrs.includes(utr))
                || lines.find(l => ref && l.refs.includes(ref));
            if (!hit) return { order, outcome: 'notFound' };
            used.add(hit.index);
            const by = utr && hit.utrs.includes(utr) ? 'utr' : 'ref';
            // A line with no readable amount still counts when found by UTR (some exports split columns oddly).
            if (!hit.amounts.length) return { order, outcome: by === 'utr' ? 'matched' : 'wrongAmount', by, line: hit.line, amount: null };
            const ok = hit.amounts.includes(due);
            return { order, outcome: ok ? 'matched' : 'wrongAmount', by, line: hit.line, amount: ok ? due : hit.amounts[0] };
        });
    const unmatched = lines.filter(l => !used.has(l.index) && l.utrs.length);
    return {
        results,
        matched: results.filter(r => r.outcome === 'matched'),
        wrongAmount: results.filter(r => r.outcome === 'wrongAmount'),
        notFound: results.filter(r => r.outcome === 'notFound'),
        unmatched,
        linesRead: lines.length,
    };
};
