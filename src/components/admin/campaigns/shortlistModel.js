import { parseCSV } from '../creators/creatorData';
import { stageMeta, creatorHandle, creatorNiches } from './campaignModel';

/*
 * The client sheet and the shortlist that comes back.
 *
 *   1. "Client sheet" downloads every applicant (no phone or email, so it can go to
 *      the brand as is) with an empty "Shortlist" column.
 *   2. The client writes "Yes" next to the creators they want (or deletes the
 *      rows they don't want) and sends it back.
 *   3. "Upload shortlist" reads it: each row is matched to an applicant by Newbi ID,
 *      then Instagram, email or phone. Preview → "Shortlist N" sends the welcome.
 */

export const SELECTED = ['selected', 'review', 'approved', 'paid'];

/** The Newbi ID creators see on their card (same rule as the app's creatorPassId). */
export const newbiIdOf = (c) => {
    const id = c?.creatorId || (c?.uid ? String(c.uid).slice(0, 8) : null);
    return id ? String(id).toUpperCase() : '';
};

const instagramUrl = (c) => (creatorHandle(c) ? `https://instagram.com/${creatorHandle(c)}` : '');

/** ExportMenu spec for the client: who applied, nothing private, and a column to mark picks. */
export const clientSheetSpec = (campaign, entries, { fileDate, exportSubtitle }) => ({
    filename: `${(campaign.title || 'campaign').replace(/[^\w-]+/g, '_').slice(0, 40)}_client_sheet_${fileDate()}`,
    sheetName: 'Applicants',
    title: `${campaign.title || 'Campaign'} · applicants`,
    subtitle: `${exportSubtitle(entries.length, 'applicant')} · Write "Yes" in the Shortlist column for the creators you want.`,
    rows: entries,
    columns: [
        { header: 'Newbi ID', value: a => newbiIdOf(a.creator) },
        { header: 'Name', width: 24, value: a => a.creator.name || '' },
        { header: 'Instagram', value: a => (creatorHandle(a.creator) ? `@${creatorHandle(a.creator)}` : '') },
        { header: 'Instagram link', width: 32, value: a => instagramUrl(a.creator) },
        { header: 'Followers', type: 'number', value: a => a.criteria.followers },
        { header: 'City', value: a => a.creator.city || '' },
        { header: 'Niche', width: 24, value: a => Array.from(new Set(creatorNiches(a.creator))).slice(0, 3).join(', ') },
        { header: 'College', value: a => a.creator.collegeName || '' },
        { header: 'Status', value: a => stageMeta(a.stage).label },
        { header: 'Shortlist', value: a => (SELECTED.includes(a.stage) ? 'Yes' : '') },
    ],
});

/* ---------- reading the sheet back ---------- */

const digits = (v) => String(v || '').replace(/\D/g, '');
const phoneKey = (v) => { const d = digits(v); return d.length >= 10 ? d.slice(-10) : ''; };
const emailKey = (v) => { const e = String(v || '').trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ''; };
const handleKey = (v) => String(v || '').trim().replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').toLowerCase();
const idKey = (v) => String(v || '').trim().toUpperCase();

const HEADERS = {
    id: ['newbi id', 'newbi_id', 'creator id', 'creator_id', 'id', 'uid'],
    instagram: ['instagram', 'instagram link', 'instagram handle', 'handle', 'ig', 'instagram url'],
    email: ['email', 'email id', 'email address'],
    phone: ['phone', 'mobile', 'whatsapp', 'phone number', 'contact'],
    name: ['name', 'creator name', 'full name'],
    pick: ['shortlist', 'shortlisted', 'selected', 'select', 'pick', 'picked', 'approved', 'decision', 'final'],
};

const YES = new Set(['yes', 'y', 'true', '1', 'x', '✓', '✔', 'shortlist', 'shortlisted', 'selected', 'select', 'picked', 'approved', 'ok', 'final']);

/** Applicant lookups by Newbi ID, doc id/uid, @handle, email and phone. */
const matcherFor = (entries) => {
    const by = new Map();
    const add = (k, e) => { if (k && !by.has(k)) by.set(k, e); };
    entries.forEach(e => {
        const c = e.creator;
        add(`id:${newbiIdOf(c)}`, e);
        add(`id:${idKey(c.id)}`, e);
        add(`id:${idKey(c.uid)}`, e);
        add(`h:${handleKey(c.instagram)}`, e);
        add(`e:${emailKey(c.email)}`, e);
        add(`p:${phoneKey(c.phone)}`, e);
        add(`p:${phoneKey(c.whatsapp)}`, e);
    });
    return (cells) => (cells.id && by.get(`id:${idKey(cells.id)}`))
        || (cells.instagram && handleKey(cells.instagram) && by.get(`h:${handleKey(cells.instagram)}`))
        || (cells.email && emailKey(cells.email) && by.get(`e:${emailKey(cells.email)}`))
        || (cells.phone && phoneKey(cells.phone) && by.get(`p:${phoneKey(cells.phone)}`))
        || null;
};

export const ROW_STATUS = {
    ready: { label: 'Shortlist', tone: 'green' },
    already: { label: 'Already shortlisted', tone: 'blue' },
    notPicked: { label: 'Not picked', tone: 'gray' },
    duplicate: { label: 'Repeated row', tone: 'gray' },
    unknown: { label: 'Not an applicant', tone: 'amber' },
};

/**
 * CSV text → { rows: [{ row, label, status, entry }], error, hasPickColumn }.
 * With a Shortlist column, only rows marked yes count; without one, every row is a pick.
 */
export const readShortlistCsv = (text, entries) => {
    const table = parseCSV(text);
    if (table.length < 2) return { rows: [], error: 'The file has no rows. Use the client sheet and mark the picks.' };
    const header = table[0].map(h => String(h || '').trim().toLowerCase());
    const col = {};
    Object.entries(HEADERS).forEach(([key, names]) => {
        const i = header.findIndex(h => names.includes(h));
        if (i >= 0) col[key] = i;
    });
    if (col.id === undefined && col.instagram === undefined && col.email === undefined && col.phone === undefined) {
        return { rows: [], error: 'Add a "Newbi ID" or "Instagram" column so we can find each creator.' };
    }
    const match = matcherFor(entries);
    const seen = new Set();
    const rows = table.slice(1).map((r, i) => {
        const cells = Object.fromEntries(Object.entries(col).map(([k, idx]) => [k, String(r[idx] ?? '').trim()]));
        const entry = match(cells);
        const picked = col.pick === undefined || YES.has(String(cells.pick || '').trim().toLowerCase());
        const label = entry?.creator?.name || cells.name || cells.instagram || cells.id || cells.email || cells.phone || `Row ${i + 2}`;
        let status;
        if (!picked) status = 'notPicked';
        else if (!entry) status = 'unknown';
        else if (seen.has(entry.key)) status = 'duplicate';
        else status = SELECTED.includes(entry.stage) ? 'already' : 'ready';
        if (entry && picked) seen.add(entry.key);
        return { row: i + 2, label, status, entry };
    });
    return { rows, error: null, hasPickColumn: col.pick !== undefined };
};
