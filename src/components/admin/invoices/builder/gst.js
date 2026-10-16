/*
 * Indian GST helpers for the invoice builder: GSTIN checks, the state a GSTIN
 * belongs to, the CGST+SGST / IGST split, amount in words, and the bank
 * details text block that prints on the invoice.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const GST_STATES = {
    '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
    '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
    '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya',
    '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
    '24': 'Gujarat', '25': 'Daman and Diu', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
    '28': 'Andhra Pradesh (old)', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
    '97': 'Other territory', '99': 'Centre jurisdiction',
};

export const GST_RATES = [0, 5, 12, 18, 28];

const GSTIN_SHAPE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const checksumOk = (gstin) => {
    let sum = 0;
    for (let i = 0; i < 14; i++) {
        const product = CHARS.indexOf(gstin[i]) * (i % 2 === 0 ? 1 : 2);
        sum += Math.floor(product / 36) + (product % 36);
    }
    return CHARS[(36 - (sum % 36)) % 36] === gstin[14];
};

export const cleanGstin = (value) => String(value || '').toUpperCase().replace(/\s+/g, '');

/** '' (nothing entered) | 'ok' | 'shape' (wrong format) | 'checksum' (a typo somewhere). */
export const gstinProblem = (value) => {
    const g = cleanGstin(value);
    if (!g) return '';
    if (!GSTIN_SHAPE.test(g)) return 'shape';
    if (!GST_STATES[g.slice(0, 2)]) return 'shape';
    return checksumOk(g) ? 'ok' : 'checksum';
};

export const stateOfGstin = (value) => {
    const g = cleanGstin(value);
    return /^\d{2}/.test(g) && GST_STATES[g.slice(0, 2)] ? { code: g.slice(0, 2), name: GST_STATES[g.slice(0, 2)] } : null;
};

/** PAN is characters 3–12 of a GSTIN. */
export const panOfGstin = (value) => {
    const g = cleanGstin(value);
    return GSTIN_SHAPE.test(g) ? g.slice(2, 12) : '';
};

/** The client's state: from their GSTIN, else the state picked in the builder (`clientState`, a 2-digit code). */
export const placeOfSupply = (inv) => {
    const fromGstin = gstinProblem(inv?.clientGst) !== 'shape' ? stateOfGstin(inv?.clientGst) : null;
    if (fromGstin) return fromGstin;
    const code = String(inv?.clientState || '').padStart(2, '0');
    return inv?.clientState && GST_STATES[code] ? { code, name: GST_STATES[code] } : null;
};

const rateLabel = (r) => String(Math.round(r * 1000) / 1000);

/**
 * The tax rows an invoice prints. Same state: CGST + SGST (half each).
 * Different states: IGST. When either state is unknown (old invoices), the
 * single "GST (x%)" line it always had. Shared by the builder, its PDF and
 * the client's invoice page.
 *   { type: 'intra' | 'inter' | 'single' | 'none', seller, client, lines: [{ label, amount }] }
 */
export const invoiceTaxLines = (inv, gstAmount) => {
    const rate = inv?.showGst ? (Number(inv?.gstPercentage) || 0) : 0;
    const seller = gstinProblem(inv?.senderGst) !== 'shape' ? stateOfGstin(inv?.senderGst) : null;
    const client = placeOfSupply(inv);
    if (!inv?.showGst) return { type: 'none', seller, client, lines: [] };
    const amount = round2(gstAmount);
    if (!seller || !client) return { type: 'single', seller, client, lines: [{ label: `GST (${rateLabel(rate)}%)`, amount }] };
    if (seller.code !== client.code) return { type: 'inter', seller, client, lines: [{ label: `IGST (${rateLabel(rate)}%)`, amount }] };
    const cgst = round2(amount / 2);
    return {
        type: 'intra', seller, client,
        lines: [
            { label: `CGST (${rateLabel(rate / 2)}%)`, amount: cgst },
            { label: `SGST (${rateLabel(rate / 2)}%)`, amount: round2(amount - cgst) },
        ],
    };
};

export const isUpiId = (v) => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/.test(String(v || '').trim());
export const isIfsc = (v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(v || '').trim().toUpperCase());
export const isHttpsUrl = (v) => {
    try { const u = new URL(String(v || '').trim()); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
};
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

// ── Amount in words (Indian system: thousand, lakh, crore) ──
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const twoDigits = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`);
const threeDigits = (n) => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return [h ? `${ONES[h]} hundred` : '', r ? twoDigits(r) : ''].filter(Boolean).join(' and ');
};

const integerWords = (n) => {
    if (n === 0) return 'zero';
    const parts = [];
    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const rest = n % 1000;
    if (crore) parts.push(`${integerWords(crore)} crore`);
    if (lakh) parts.push(`${twoDigits(lakh)} lakh`);
    if (thousand) parts.push(`${twoDigits(thousand)} thousand`);
    if (rest) parts.push(threeDigits(rest));
    return parts.join(' ');
};

export const amountInWords = (amount) => {
    const value = Math.abs(round2(amount));
    const rupees = Math.floor(value);
    const paise = Math.round((value - rupees) * 100);
    const words = `${integerWords(rupees)} rupees${paise ? ` and ${twoDigits(paise)} paise` : ''} only`;
    return words.charAt(0).toUpperCase() + words.slice(1);
};

// ── Bank details: edited as fields, printed as the "Payment details" text block ──
export const BANK_FIELDS = [
    { key: 'accountName', label: 'Account name', aliases: ['account name', 'name', 'beneficiary', 'beneficiary name', 'a/c name'] },
    { key: 'bankName', label: 'Bank', aliases: ['bank', 'bank name'] },
    { key: 'accountNumber', label: 'Account no.', aliases: ['account no.', 'account no', 'account number', 'a/c no.', 'a/c no', 'ac no'] },
    { key: 'ifsc', label: 'IFSC', aliases: ['ifsc', 'ifsc code'] },
    { key: 'branch', label: 'Branch', aliases: ['branch'] },
    { key: 'accountType', label: 'Account type', aliases: ['account type', 'a/c type'] },
    { key: 'upi', label: 'UPI ID', aliases: ['upi', 'upi id', 'upi handle'] },
    { key: 'contact', label: 'Contact no.', aliases: ['contact', 'contact no.', 'contact no', 'phone'] },
];

/** Fields from the text block, or null when it holds something we can't edit as fields (HTML, free text). */
export const parseBankDetails = (text) => {
    const out = Object.fromEntries(BANK_FIELDS.map(f => [f.key, '']));
    const src = String(text || '');
    if (!src.trim()) return out;
    if (/<[a-z][\s\S]*>/i.test(src)) return null;
    for (const line of src.split('\n')) {
        if (!line.trim()) continue;
        const m = /^([^:]+):\s?(.*)$/.exec(line);
        if (!m) return null;
        const field = BANK_FIELDS.find(f => f.aliases.includes(m[1].trim().toLowerCase()));
        if (!field || out[field.key]) return null;
        out[field.key] = m[2];
    }
    return out;
};

export const composeBankDetails = (fields) => BANK_FIELDS
    .filter(f => String(fields?.[f.key] || '') !== '')
    .map(f => `${f.label}: ${fields[f.key]}`)
    .join('\n');
