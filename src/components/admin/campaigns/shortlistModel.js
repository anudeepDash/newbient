import { parseCSV } from '../creators/creatorData';
import { stageMeta, creatorHandle, creatorNiches, creatorRef, isSelected, progressFor } from './campaignModel';
import { isRequiredTask } from '../../../lib/creator/tasks';

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

const DELIVERABLE_STATUS = { approved: 'Done', submitted: 'To review', rejected: 'Changes asked', not_started: 'Not started' };

const deliverableLink = (sub) => [sub?.contentLink, sub?.proofUrl, sub?.screenshotUrl].find(l => /^https?:\/\//i.test(String(l || ''))) || '';

/**
 * ExportMenu spec for the deliverables: one row per shortlisted creator (or anyone
 * who sent work in), with each deliverable's status, link and date. No phone or
 * email, so it can go to the brand as is. Developer test submissions are left out.
 */
export const deliverablesSheetSpec = (campaign, entries, { fileDate, exportSubtitle }) => {
    const tasks = campaign.tasks || [];
    const rows = entries
        .filter(a => (a.orphan
            ? a.progress.items.some(i => i.sub && !i.sub.test)
            : isSelected(campaign, a.creator) || a.progress.items.some(i => i.sub && !i.sub.test)))
        .map(a => ({ ...a, items: a.progress.items.map(i => (i.sub?.test ? { ...i, sub: null, status: 'not_started' } : i)) }))
        .map(a => {
            const required = a.items.filter(i => isRequiredTask(i.task));
            return { ...a, done: a.items.filter(i => i.status === 'approved').length, allDone: required.length > 0 && required.every(i => i.status === 'approved') };
        })
        .sort((x, y) => y.done - x.done || String(x.creator.name || '').localeCompare(String(y.creator.name || '')));
    const complete = rows.filter(a => a.allDone).length;
    const item = (a, idx) => a.items[idx] || { status: 'not_started' };
    return {
        filename: `${(campaign.title || 'campaign').replace(/[^\w-]+/g, '_').slice(0, 40)}_deliverables_${fileDate()}`,
        sheetName: 'Deliverables',
        title: `${campaign.title || 'Campaign'} · deliverables`,
        subtitle: exportSubtitle(rows.length, 'creator', `${complete} done with everything`),
        rows,
        totals: { done: true },
        columns: [
            { header: 'Newbi ID', value: a => (a.orphan ? '' : newbiIdOf(a.creator)) },
            { header: 'Name', width: 24, value: a => (a.orphan ? 'No creator profile linked' : a.creator.name || '') },
            { header: 'Instagram', value: a => (creatorHandle(a.creator) ? `@${creatorHandle(a.creator)}` : '') },
            { header: 'Instagram link', width: 32, value: a => instagramUrl(a.creator) },
            { header: 'Followers', type: 'number', value: a => a.criteria?.followers ?? null },
            { header: 'City', value: a => a.creator.city || '' },
            { header: 'Done', key: 'done', type: 'number', value: a => a.done },
            { header: 'Out of', type: 'number', value: () => tasks.length },
            { header: 'All required done', value: a => (a.allDone ? 'Yes' : 'No') },
            ...tasks.flatMap((task, idx) => {
                const name = `${idx + 1}. ${task.title || `Deliverable ${idx + 1}`}`;
                return [
                    { header: name, width: 16, value: a => DELIVERABLE_STATUS[item(a, idx).status] || 'Not started' },
                    { header: `${name} · link`, width: 36, value: a => deliverableLink(item(a, idx).sub) },
                    { header: `${name} · sent on`, type: 'date', value: a => item(a, idx).sub?.submittedAt || null },
                ];
            }),
        ],
    };
};

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

/* ---------- completed deliverables coming back ---------- */

const DONE = new Set([...YES, 'done', 'complete', 'completed', 'posted', 'live', 'uploaded']);
const LINK_HEADERS = ['link', 'links', 'post link', 'content link', 'url', 'post url', 'reel link', 'story link'];
const isUrl = (v) => /^https?:\/\//i.test(String(v || '').trim());
const taskName = (v) => String(v || '').trim().toLowerCase().replace(/^\d+[.)]\s*/, '').replace(/\s+/g, ' ');

export const DONE_ROW_STATUS = {
    ready: { label: 'Mark done', tone: 'green' },
    already: { label: 'Already done', tone: 'blue' },
    nothing: { label: 'Nothing marked', tone: 'gray' },
    duplicate: { label: 'Repeated row', tone: 'gray' },
    unknown: { label: 'Not on Newbi', tone: 'amber' },
};

/** Every creator as an entry the matcher can use, applicants first so their stage carries over. */
export const creatorEntriesFor = (campaign, creators, applicants = []) => {
    const byKey = new Map(applicants.map(a => [a.key, a]));
    return [
        ...applicants.filter(a => !a.orphan),
        ...(creators || []).filter(c => !byKey.has(creatorRef(c))).map(c => ({ creator: c, key: creatorRef(c), progress: progressFor(campaign, c), stage: 'none' })),
    ];
};

/**
 * CSV text → { rows, error, byColumn }.
 * A column named after a deliverable ("Reel", or "2. Reel" from the deliverables
 * sheet) marks it done with yes / done / a link; "Reel · link" gives its link.
 * Without such columns, every row counts as done for `pickedTaskIds`, and a
 * "Link" column fills the link.
 * Row: { row, label, status, entry, adds, done: [{ task, link }] }
 */
export const readDeliverablesCsv = (text, entries, campaign, pickedTaskIds = []) => {
    const tasks = campaign.tasks || [];
    const table = parseCSV(text);
    if (table.length < 2) return { rows: [], error: 'The file has no rows. Add one row per creator with their Instagram handle.' };
    const header = table[0].map(h => String(h || '').trim().toLowerCase());
    const col = {};
    ['id', 'instagram', 'email', 'phone', 'name'].forEach(key => {
        const i = header.findIndex(h => HEADERS[key].includes(h));
        if (i >= 0) col[key] = i;
    });
    if (col.id === undefined && col.instagram === undefined && col.email === undefined && col.phone === undefined) {
        return { rows: [], error: 'Add an "Instagram" column (or Newbi ID, email or phone) so we can find each creator.' };
    }
    const statusCol = {};
    const linkCol = {};
    header.forEach((h, i) => {
        const linkOf = h.match(/^(.*?)\s*(?:·|-|–)?\s*link$/);
        const task = tasks.find(t => taskName(t.title) && taskName(t.title) === taskName(linkOf && linkOf[1] ? linkOf[1] : h));
        if (!task) return;
        if (linkOf && linkOf[1]) linkCol[task.id] = i;
        else statusCol[task.id] = i;
    });
    const byColumn = Object.keys(statusCol).length > 0 || Object.keys(linkCol).length > 0;
    const anyLink = header.findIndex(h => LINK_HEADERS.includes(h));
    const picked = tasks.filter(t => pickedTaskIds.map(String).includes(String(t.id)));

    const match = matcherFor(entries);
    const seen = new Set();
    const rows = table.slice(1)
        .filter(r => r.some(v => String(v ?? '').trim()))
        .map((r, i) => {
            const at = (idx) => (idx === undefined || idx < 0 ? '' : String(r[idx] ?? '').trim());
            const cells = Object.fromEntries(Object.entries(col).map(([k, idx]) => [k, at(idx)]));
            const entry = match(cells);
            const label = entry?.creator?.name || cells.name || cells.instagram || cells.id || cells.email || cells.phone || `Row ${i + 2}`;
            const marked = byColumn
                ? tasks.flatMap(t => {
                    // A link means done, unless the status column says otherwise ("To review" plus a link isn't done).
                    const value = at(statusCol[t.id]);
                    const link = [at(linkCol[t.id]), value].find(isUrl) || '';
                    const isDone = value ? DONE.has(value.toLowerCase()) || isUrl(value) : Boolean(link);
                    return isDone ? [{ task: t, link }] : [];
                })
                : picked.map(t => ({ task: t, link: isUrl(at(anyLink)) ? at(anyLink) : '' }));
            const approved = (t) => entry?.progress?.items?.find(x => String(x.task.id) === String(t.id))?.status === 'approved';
            const done = marked.filter(m => !approved(m.task));
            const adds = Boolean(entry) && !isSelected(campaign, entry.creator);
            let status;
            if (!entry) status = 'unknown';
            else if (seen.has(entry.key)) status = 'duplicate';
            else if (!marked.length) status = 'nothing';
            else status = done.length || adds ? 'ready' : 'already';
            if (entry && marked.length) seen.add(entry.key);
            return { row: i + 2, label, status, entry, adds, done };
        });
    return { rows, error: null, byColumn };
};
