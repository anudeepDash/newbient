/*
 * UPI pay links, as every UPI app reads them (NPCI's deep-link spec):
 *   upi://pay?pa=<UPI ID>&pn=<name>&am=<amount>&cu=INR&tn=<note>
 * Scanning a QR of this with GPay / PhonePe / Paytm / BHIM opens the payment
 * with the payee, amount and note filled in; the payer still enters their PIN.
 * Nothing here moves money.
 */

const UPI_ID_RE = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,64}$/i;

/** A clean UPI ID ("Name@OkAxis " → "name@okaxis"), or '' when it isn't one. */
export const cleanUpiId = (v) => {
    const id = String(v || '').trim().replace(/\s+/g, '').toLowerCase();
    return UPI_ID_RE.test(id) ? id : '';
};

/** Rupees as UPI wants them: "1500.00". Empty for nothing, zero or junk. */
export const upiAmount = (v) => {
    const n = Number(String(v ?? '').replace(/[₹,\s]/g, ''));
    return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '';
};

/* Apps cut long names and notes, and some refuse odd characters in them. */
const tidy = (s, max) => String(s || '').replace(/[^\p{L}\p{N} .,'&()/-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * The upi://pay link for a payee, or '' when the UPI ID isn't valid.
 * amount and note are optional; leave amount out and the payer types it.
 */
export const upiPayUri = ({ upiId, name, amount, note }) => {
    const pa = cleanUpiId(upiId);
    if (!pa) return '';
    const parts = [`pa=${encodeURIComponent(pa)}`];
    const pn = tidy(name, 50);
    if (pn) parts.push(`pn=${encodeURIComponent(pn)}`);
    const am = upiAmount(amount);
    if (am) parts.push(`am=${am}`);
    parts.push('cu=INR');
    const tn = tidy(note, 60);
    if (tn) parts.push(`tn=${encodeURIComponent(tn)}`);
    return `upi://pay?${parts.join('&')}`;
};
