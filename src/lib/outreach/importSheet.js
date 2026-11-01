import { normalizePhone, normalizeHandle, normalizeEmail } from './normalize.js';
import { parseFollowers, CATEGORIES, MAX_FOLLOWERS } from './application.js';

/*
 * Outreach → Import: a sheet of creators (pasted from Google Sheets, or a .csv
 * or .xlsx file) becomes applications on a campaign, so the team can reach
 * people who never filled the form. Shared by the admin preview and the server
 * (api/_lib/outreachImport.js), so both agree on what a row is.
 *
 * Only a phone number is required. Columns are matched by their header
 * ("Name", "WhatsApp number", "Insta", "Followers"…); a sheet without headers
 * is read by what's in each column.
 */

export const IMPORT_FIELDS = [
    { key: 'fullName', label: 'Name', aliases: ['name', 'full name', 'creator', 'creator name', 'your name', 'influencer'] },
    { key: 'phone', label: 'Phone', aliases: ['phone', 'mobile', 'whatsapp', 'number', 'contact', 'phone number', 'mobile number', 'whatsapp number', 'cell'] },
    { key: 'instagramHandle', label: 'Instagram', aliases: ['instagram', 'insta', 'ig', 'handle', 'username', 'instagram handle', 'instagram id', 'profile', 'instagram link'] },
    { key: 'followerCount', label: 'Followers', aliases: ['followers', 'follower count', 'instagram followers', 'reach', 'fans'] },
    { key: 'city', label: 'City', aliases: ['city', 'location', 'town', 'based in'] },
    { key: 'email', label: 'Email', aliases: ['email', 'e-mail', 'mail', 'email address'] },
    { key: 'collegeOrEmployer', label: 'College', aliases: ['college', 'university', 'employer', 'company', 'organisation', 'organization', 'institute', 'college or employer'] },
    { key: 'category', label: 'Category', aliases: ['category', 'niche', 'genre', 'content type'] },
];
export const MAX_IMPORT_ROWS = 1000;

const norm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Splits pasted or CSV text into rows of cells. Tabs (a Google Sheets paste) win over commas. */
export const parseDelimited = (text) => {
    const src = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const firstLine = src.split('\n', 1)[0] || '';
    const sep = firstLine.includes('\t') ? '\t' : (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < src.length; i += 1) {
        const ch = src[i];
        if (quoted) {
            if (ch === '"' && src[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false;
            else cell += ch;
        } else if (ch === '"' && cell === '') quoted = true;
        else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.map(r => r.map(c => c.trim())).filter(r => r.some(Boolean));
};

const looksLike = {
    phone: (v) => Boolean(normalizePhone(v)),
    instagramHandle: (v) => /^@|instagram\.com/i.test(v),
    email: (v) => Boolean(normalizeEmail(v)),
    followerCount: (v) => Number.isFinite(parseFollowers(v)) && !normalizePhone(v),
};

/**
 * Which field each column holds: { 0: 'fullName', 2: 'phone', … }, and whether
 * the first row was a header. Headers are matched by name; without them, by content.
 */
export const detectColumns = (table) => {
    const header = table[0] || [];
    const byName = {};
    header.forEach((h, i) => {
        const n = norm(h);
        if (!n) return;
        const f = IMPORT_FIELDS.find(x => !Object.values(byName).includes(x.key) && x.aliases.some(a => n === a))
            || IMPORT_FIELDS.find(x => !Object.values(byName).includes(x.key) && x.aliases.some(a => n.includes(a)));
        if (f) byName[i] = f.key;
    });
    if (Object.values(byName).includes('phone')) return { columns: byName, hasHeader: true };

    // No usable header: look at what's in each column.
    const sample = table.slice(0, 30);
    const width = Math.max(...table.map(r => r.length), 0);
    const columns = {};
    const taken = new Set();
    for (const key of ['phone', 'email', 'instagramHandle', 'followerCount']) {
        let best = -1;
        let bestShare = 0;
        for (let i = 0; i < width; i += 1) {
            if (columns[i]) continue;
            const vals = sample.map(r => r[i] || '').filter(Boolean);
            const share = vals.length ? vals.filter(looksLike[key]).length / vals.length : 0;
            if (share > bestShare) { best = i; bestShare = share; }
        }
        if (best >= 0 && bestShare >= 0.6) { columns[best] = key; taken.add(key); }
    }
    const firstText = [...Array(width).keys()].find(i => !columns[i]);
    if (firstText !== undefined && taken.has('phone')) columns[firstText] = 'fullName';
    // A first row that isn't data (no phone in the phone column) is a header we couldn't read.
    const phoneCol = Object.keys(columns).find(k => columns[k] === 'phone');
    const hasHeader = phoneCol !== undefined && !normalizePhone(header[phoneCol]);
    return { columns, hasHeader };
};

const categoryOf = (v) => {
    const n = norm(v);
    if (!n) return null;
    return (CATEGORIES.find(c => norm(c.value) === n || norm(c.label) === n) || {}).value || null;
};

/** One sheet row → { value, problem }. `value` is what's stored; `problem` says why a row can't be used. */
export const cleanImportRow = (raw = {}) => {
    const phone = normalizePhone(raw.phone);
    const followers = parseFollowers(raw.followerCount);
    const value = {
        fullName: String(raw.fullName ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || null,
        phone,
        instagramHandle: normalizeHandle(raw.instagramHandle),
        followerCount: Number.isFinite(followers) && followers >= 0 && followers <= MAX_FOLLOWERS ? followers : null,
        city: String(raw.city ?? '').replace(/\s+/g, ' ').trim().slice(0, 60) || null,
        email: normalizeEmail(raw.email),
        collegeOrEmployer: String(raw.collegeOrEmployer ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) || null,
        category: categoryOf(raw.category),
    };
    const problem = !String(raw.phone ?? '').trim() ? 'No phone number' : !phone ? 'Not a mobile number' : null;
    return { value, problem };
};

/** The table as rows ready to import, with duplicates inside the sheet marked. */
export const rowsFromTable = (table, columns, hasHeader) => {
    const seen = new Set();
    return table.slice(hasHeader ? 1 : 0).map((cells, i) => {
        const raw = {};
        Object.entries(columns).forEach(([idx, key]) => { if (key) raw[key] = cells[Number(idx)] ?? ''; });
        const row = cleanImportRow(raw);
        if (!row.problem && seen.has(row.value.phone)) row.problem = 'Same number twice in the sheet';
        if (row.value.phone) seen.add(row.value.phone);
        return { line: i + (hasHeader ? 2 : 1), ...row };
    });
};
