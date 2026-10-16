/*
 * Contract builder rules: money, milestones, dates and the checks a contract
 * must pass before it goes out for signing. Used by the builder, the contract
 * paper (editor preview and the public /agreement page) and the list.
 */
import { contractValue } from '../../../lib/contracts';

export const CURRENCY_SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

/** Clauses a contract should normally carry. */
export const ESSENTIAL_CLAUSES = [
    { id: 'confidentiality', label: 'Confidentiality', match: /confidential/i },
    { id: 'ip_rights', label: 'IP and usage rights', match: /intellectual|ip\b|usage right/i },
    { id: 'termination', label: 'Termination', match: /terminat/i },
    { id: 'liability', label: 'Liability', match: /liabilit/i },
    { id: 'governing_law', label: 'Governing law', match: /governing law|jurisdiction/i },
    { id: 'dispute_resolution', label: 'Dispute resolution', match: /dispute|arbitration/i },
];

/** Which essential clauses are missing (matched by library id or by title). */
export const missingEssentialClauses = (clauses = []) => {
    const active = (clauses || []).filter(c => c && c.isActive !== false);
    return ESSENTIAL_CLAUSES.filter(e => !active.some(c => c.id === e.id || e.match.test(String(c.title || ''))));
};

export const formatMoney = (n, currency = 'INR') => {
    const v = Math.round((Number(n) || 0) * 100) / 100;
    return `${CURRENCY_SYMBOL[currency] || ''}${v.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`;
};

/** "500000" / "5,00,000" → "5,00,000" (keeps text it can't read, like "5 lakh"). */
export const tidyAmountText = (text, currency = 'INR') => {
    const raw = String(text ?? '').trim();
    if (!raw) return '';
    if (!/^[₹$€£]?\s*[\d,]+(\.\d{1,2})?$/.test(raw)) return raw;
    const n = Number(raw.replace(/[^\d.]/g, ''));
    if (!(n > 0)) return raw;
    return n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 2 });
};

export const contractTotal = (form) => contractValue(form);

/** GST on top of the value (0 when GST is included or off). */
export const gstSummary = (form) => {
    const c = form?.commercials || {};
    const base = contractValue(form);
    const rate = Number(c.gstRate ?? 18) || 0;
    if (c.gstMode === 'extra') {
        const gst = Math.round(base * rate) / 100;
        return { mode: 'extra', rate, gst, base, grand: Math.round((base + gst) * 100) / 100 };
    }
    if (c.gstMode === 'included') return { mode: 'included', rate, gst: 0, base, grand: base };
    // Older contracts never stated GST on the paper.
    return { mode: 'none', rate: 0, gst: 0, base, grand: base };
};

/** The one-line GST note printed under the contract value. */
export const gstNote = (form) => {
    const c = form?.commercials || {};
    if (c.gstMode === 'extra') return `Plus GST @ ${Number(c.gstRate ?? 18) || 0}%, payable in addition to the above.`;
    if (c.gstMode === 'included') return 'Inclusive of all applicable taxes (GST).';
    return '';
};

/** Milestones with their amount worked out from the percentage when needed. */
export const milestoneRows = (form) => {
    const total = contractValue(form);
    return (form?.commercials?.milestones || []).filter(Boolean).map(m => {
        const pct = Number(m.percent);
        const amt = Number(m.amount);
        const amount = amt > 0 ? amt : (pct > 0 && total > 0 ? Math.round(total * pct) / 100 : 0);
        const percent = pct > 0 ? pct : (amt > 0 && total > 0 ? Math.round((amt / total) * 10000) / 100 : 0);
        return { ...m, amount, percent };
    });
};

export const milestoneCheck = (form) => {
    const rows = milestoneRows(form);
    const total = contractValue(form);
    const sum = Math.round(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100;
    const diff = Math.round((total - sum) * 100) / 100;
    return { rows, total, sum, diff, ok: rows.length === 0 || (total > 0 && Math.abs(diff) < 1) };
};

/** "2026-10-15" → a local date (no UTC shift); also takes ISO strings and Firestore timestamps. */
export const parseContractDate = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const s = String(value);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

export const formatContractDate = (value, style = 'long') => {
    const d = parseContractDate(value);
    if (!d) return '';
    return d.toLocaleDateString('en-GB', style === 'short'
        ? { day: '2-digit', month: 'short', year: 'numeric' }
        : { day: '2-digit', month: 'long', year: 'numeric' });
};

/** "PAN ABCDE1234F, GSTIN 07ABCDE1234F1Z5" for the parties paragraph. */
export const partyIds = (party) => [
    party?.pan ? `PAN ${party.pan}` : null,
    party?.gstin ? `GSTIN ${party.gstin}` : null,
].filter(Boolean).join(', ');

/** Term sentence for the paper, or '' when no term was set. */
export const termSentence = (form) => {
    const d = form?.details || {};
    const end = formatContractDate(d.endDate);
    if (d.duration && end) return `This Agreement shall remain in force for ${d.duration}, until ${end}, unless terminated earlier in accordance with its terms.`;
    if (d.duration) return `This Agreement shall remain in force for ${d.duration} from the Effective Date, unless terminated earlier in accordance with its terms.`;
    if (end) return `This Agreement shall remain in force until ${end}, unless terminated earlier in accordance with its terms.`;
    return '';
};

export const deliverablesOf = (form) => (form?.details?.deliverables || []).map(x => String(x || '').trim()).filter(Boolean);

const stripHtml = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();

/**
 * What stops a contract from going out for signing. Each issue names the
 * builder step that fixes it. `blocking: false` items are warnings.
 */
export const contractIssues = (form, { agreements = [], id } = {}) => {
    const issues = [];
    const add = (step, message, blocking = true) => issues.push({ step, message, blocking });
    const p1 = form?.parties?.firstParty || {};
    const p2 = form?.parties?.secondParty || {};
    const hidden = (f) => (form?.hiddenFields || []).includes(f);

    if (!String(form?.agreementNumber || '').trim()) add('parties', 'Add a contract number.');
    else {
        const num = String(form.agreementNumber).trim().toUpperCase();
        if ((agreements || []).some(a => a.id !== id && String(a.agreementNumber || '').trim().toUpperCase() === num)) {
            add('parties', `Contract number ${form.agreementNumber} is already used by another contract.`);
        }
    }
    if (!String(p1.name || '').trim()) add('parties', "Add Newbi's legal name.");
    if (!String(p1.address || '').trim()) add('parties', "Add Newbi's registered address.");
    if (!String(p2.name || '').trim()) add('parties', "Add the other party's legal name.");
    if (!String(p2.address || '').trim()) add('parties', "Add the other party's address.");
    if (!String(p2.signatoryName || '').trim()) add('parties', "Add who signs for the other party.", false);
    if (!p2.pan && !p2.gstin) add('parties', "The other party's PAN or GSTIN is missing.", false);

    if (!parseContractDate(form?.effectiveDate)) add('project', 'Set the effective date.');
    if (!String(form?.details?.projectName || '').trim()) add('project', 'Give the project a title.', false);
    if (!stripHtml(form?.details?.purpose) && !hidden('mission')) add('project', 'Describe the scope of work.');
    if (!form?.details?.duration && !form?.details?.endDate) add('project', 'Set how long the contract lasts (term or end date).', false);

    if (!hidden('commercials')) {
        if (!(contractValue(form) > 0)) add('commercials', 'Enter the contract value.');
        const check = milestoneCheck(form);
        if (!check.ok) add('commercials', `Payment milestones add up to ${formatMoney(check.sum, form?.commercials?.currency)}, not ${formatMoney(check.total, form?.commercials?.currency)}.`);
        if (!check.rows.length && !stripHtml(form?.commercials?.paymentSchedule)) add('commercials', 'Add a payment schedule or milestones.', false);
    }

    const active = (form?.clauses || []).filter(c => c && c.isActive !== false);
    if (!active.length || hidden('clauses')) add('clauses', 'The contract has no clauses.');
    else {
        const missing = missingEssentialClauses(form.clauses);
        if (missing.length) add('clauses', `Missing: ${missing.map(m => (m.label.startsWith('IP') ? m.label : m.label.toLowerCase())).join(', ')}.`, false);
        if (active.some(c => !String(c.title || '').trim() || !stripHtml(c.content))) add('clauses', 'A clause has no title or no text.');
    }

    if (!form?.showSignatures) add('signatures', 'Turn on the signature block so the other party can sign.');
    else {
        if (!form?.providerSignature) add('signatures', "Add Newbi's signature.");
        if (!String(form?.providerName || '').trim() || /^authori[sz]ed signatory$/i.test(String(form?.providerName || '').trim())) {
            add('signatures', "Add the name of the person signing for Newbi.", false);
        }
    }
    return issues;
};
