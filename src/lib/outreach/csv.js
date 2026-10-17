import { statusLabel } from './status.js';

/*
 * The shortlist CSV. Cells that start with = + - @ are prefixed with a quote
 * so a spreadsheet never runs them as formulas (an applicant controls their name).
 */

export const EXPORT_COLUMNS = [
    { key: 'fullName', label: 'Name' },
    { key: 'instagramHandle', label: 'Instagram', get: a => (a.instagramHandle ? `@${a.instagramHandle}` : '') },
    { key: 'followerCount', label: 'Followers' },
    { key: 'tier', label: 'Tier' },
    { key: 'city', label: 'City' },
    { key: 'collegeOrEmployer', label: 'College or employer' },
    { key: 'category', label: 'Category' },
    { key: 'registeredNewbiCreator', label: 'Registered on Newbi', get: a => (a.registeredNewbiCreator ? 'Yes' : 'No') },
    { key: 'creatorId', label: 'Newbi creator ID', get: a => a.creatorId || '' },
    { key: 'runsCityPages', label: 'Runs city pages', get: a => (a.runsCityPages ? 'Yes' : 'No') },
    { key: 'cityPagesHandle', label: 'City page', get: a => (a.cityPagesHandle ? `@${a.cityPagesHandle}` : '') },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', get: a => statusLabel(a.status) },
    { key: 'referralSource', label: 'Heard via' },
    { key: 'consentAt', label: 'WhatsApp consent at' },
    { key: 'firstSubmittedAt', label: 'First applied' },
    { key: 'lastSubmittedAt', label: 'Last updated by applicant' },
    { key: 'submitCount', label: 'Times submitted' },
    { key: 'messageSentAt', label: 'Message sent at' },
    { key: 'messageSentBy', label: 'Message sent by' },
];

export const csvCell = (value) => {
    let s = value === null || value === undefined ? '' : String(value);
    // Phone numbers ("+919876543210") and handles ("@riya") we cleaned ourselves are data, not formulas.
    if (/^[=+\-@\t\r]/.test(s) && !/^\+\d{8,15}$/.test(s) && !/^@[a-z0-9._]{1,30}$/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows, columns = EXPORT_COLUMNS) => {
    const head = columns.map(c => csvCell(c.label)).join(',');
    const body = (rows || []).map(row => columns.map(c => csvCell(c.get ? c.get(row) : row[c.key])).join(','));
    // BOM so Excel opens UTF-8 names (Devanagari, emoji) correctly.
    return `\uFEFF${[head, ...body].join('\r\n')}\r\n`;
};
