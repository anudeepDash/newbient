import { parseCSV } from '../creators/creatorData';
import { stageMeta, creatorHandle, creatorKeys, creatorNiches, creatorRef, guestCreatorFor, guestKeyFor, hasApplied, isGuestKey, isSelected, progressFor, submitterKeys } from './campaignModel';
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

const deliverableScreenshot = (sub) => [sub?.proofUrl, sub?.screenshotUrl].find(l => /^https?:\/\//i.test(String(l || ''))) || '';

// A story task, or a custom one titled as a story ("Story", "2 stories").
const isStoryTask = (task) => {
    const kind = String(task?.taskType || '').toLowerCase();
    if (kind === 'story') return true;
    return (!kind || kind === 'custom') && /\bstor(y|ies)\b/i.test(String(task?.title || ''));
};

// Stories vanish after a day, so they go by the screenshot; reels and posts go by the link the creator sent.
const sheetLink = (task, sub) => (isStoryTask(task) ? deliverableScreenshot(sub) : deliverableLink(sub));

// Done work says where it came from: the app, an uploaded sheet, or both.
const deliverableStatus = (item, sheet) => {
    if (item.status !== 'approved') return DELIVERABLE_STATUS[item.status] || 'Not started';
    if (item.sub?.via === 'sheet') return 'Done (sheet)';
    if (!sheet) return 'Done';
    return item.sub?.via === 'admin' ? 'Done (sheet)' : 'Done (app + sheet)';
};

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
                    { header: name, width: 18, value: a => deliverableStatus(item(a, idx), sheetMarkOf(task, a)) },
                    { header: `${name} · link`, width: 18, type: 'link', label: isStoryTask(task) ? 'Open screenshot' : 'Open link', value: a => sheetLink(task, item(a, idx).sub) },
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
// "@asha", "asha", "instagram.com/asha", "https://www.instagram.com/asha/?hl=en" all read as "asha".
const handleKey = (v) => String(v || '').trim().replace(/^@+/, '').replace(/^(https?:\/\/)?(www\.|m\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@+/, '').trim().toLowerCase();
const HANDLE = /^[a-z0-9._]{1,30}$/;
const NOT_PROFILES = new Set(['p', 'reel', 'reels', 'stories', 'tv', 'explore', 'accounts']);
/**
 * The handle in a cell people typed by hand: "@riya.s – 12k", "Riya (@riya.s)",
 * "riya.s " or a profile link anywhere in it. '' when there isn't one.
 */
export const handleIn = (v) => {
    const plain = handleKey(v);
    if (HANDLE.test(plain) && !NOT_PROFILES.has(plain)) return plain;
    const s = String(v || '');
    const url = s.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i);
    if (url && !NOT_PROFILES.has(url[1].toLowerCase())) return url[1].toLowerCase();
    const at = s.match(/@([A-Za-z0-9._]{1,30})/);
    return at && !/@[^\s]+\.[a-z]{2,}$/i.test(s.trim()) ? at[1].toLowerCase() : '';
};
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
        || (cells.instagram && handleIn(cells.instagram) && by.get(`h:${handleIn(cells.instagram)}`))
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
// "Done (app + sheet)" from a downloaded deliverables sheet still reads as done.
const isDoneWord = (v) => DONE.has(v) || /^done\b/.test(v);
const LINK_HEADERS = ['link', 'links', 'post link', 'content link', 'url', 'post url', 'reel link', 'story link'];

/*
 * Columns in sheets people make themselves ("Instagram ID", "Insta handle (eg
 * @newbi.live)", "Mobile number", "Email address"), when no header is exactly a
 * known one. Post-link columns are never the handle column.
 */
const FUZZY = {
    instagram: (h) => /insta|\big\b|handle|user ?name|profile/.test(h) && !/reel|post|story|stories|content|video|proof|screenshot|follower/.test(h),
    phone: (h) => /phone|mobile|whats ?app|contact|number|\bmob\b/.test(h) && !/mail|follower|count|roll|reg|id\b|aadhar|upi|serial|^s\.? ?no|^sr\b/.test(h),
    email: (h) => /e-?mail/.test(h),
    name: (h) => /name/.test(h) && !/user ?name|insta|handle|college|brand|campaign|company|file/.test(h),
};
export const SHEET_COLUMNS = ['instagram', 'phone', 'email', 'name'];
const detectColumns = (header, skip) => {
    const col = {};
    ['id', 'instagram', 'email', 'phone', 'name'].forEach(key => {
        const i = header.findIndex((h, idx) => !skip.has(idx) && HEADERS[key].includes(h));
        if (i >= 0) col[key] = i;
    });
    Object.entries(FUZZY).forEach(([key, test]) => {
        if (col[key] !== undefined) return;
        const taken = new Set(Object.values(col));
        const i = header.findIndex((h, idx) => !skip.has(idx) && !taken.has(idx) && test(h));
        if (i >= 0) col[key] = i;
    });
    return col;
};
const isUrl = (v) => /^https?:\/\//i.test(String(v || '').trim());
const taskName = (v) => String(v || '').trim().toLowerCase().replace(/^\d+[.)]\s*/, '').replace(/\s+/g, ' ');

export const DONE_ROW_STATUS = {
    ready: { label: 'Mark done', tone: 'green' },
    both: { label: 'Done in both', tone: 'blue' },
    already: { label: 'Already uploaded', tone: 'gray' },
    nothing: { label: 'Nothing marked', tone: 'gray' },
    guest: { label: 'Not on Newbi · add', tone: 'amber' },
    duplicate: { label: 'Repeated row', tone: 'gray' },
    unknown: { label: 'Can’t add', tone: 'rose' },
};

/*
 * What the sheet means for one deliverable of one creator:
 *   new       not started (or changes asked) in the app: the sheet completes it
 *   sent      sent in the app, waiting for review: the sheet approves it
 *   both      done in the app and in the sheet: marked as done in both
 *   uploaded  already marked done from a sheet or by hand
 */
export const DONE_ITEM_NOTE = {
    new: 'done from the sheet',
    sent: 'sent in the app, approved from the sheet',
    both: 'done in the app and the sheet',
    uploaded: 'already marked done',
};

/**
 * Every creator as an entry the matcher can use, applicants first so their stage
 * carries over, then the campaign's sheet guests (so a second sheet finds them).
 */
export const creatorEntriesFor = (campaign, creators, applicants = []) => {
    const byKey = new Map(applicants.map(a => [a.key, a]));
    const guests = [...submitterKeys(campaign)].filter(isGuestKey).map(key => {
        const creator = guestCreatorFor(campaign, key);
        return { creator, key, progress: progressFor(campaign, creator), stage: 'guest', guest: true };
    });
    return [
        ...applicants.filter(a => !a.orphan),
        ...(creators || []).filter(c => !byKey.has(creatorRef(c))).map(c => ({ creator: c, key: creatorRef(c), progress: progressFor(campaign, c), stage: 'none' })),
        ...guests,
    ];
};

/** The sheet record for a creator's deliverable ({ at, link, file }), if a sheet marked it. */
export const sheetMarkOf = (task, entry) => [entry?.key, ...creatorKeys(entry?.creator)]
    .map(k => (k ? task?.sheetDone?.[k] : null))
    .find(Boolean) || null;

/**
 * CSV text → { rows, error, byColumn, header }.
 *
 * With `forTaskId`, the sheet is for that one deliverable: every row counts as
 * done for it (unless a column for it says otherwise, like the downloaded sheet's
 * "Not started"), and the first post link in the row is its link.
 * Without it, a column named after a deliverable ("Reel", or "2. Reel" from the
 * deliverables sheet) marks it done with yes / done / a link; "Reel · link" gives
 * its link.
 *
 * Row: { row, cells, label, status, entry, adds, member, marked, done, save }
 *   marked  every deliverable the sheet says is done: [{ task, link, state }]
 *   done    the ones not approved yet (new or sent)
 *   save    the ones with something to write (completion, link or the sheet mark)
 */
export const readDeliverablesCsv = (text, entries, campaign, forTaskId = null, { columns = {} } = {}) => {
    const tasks = campaign.tasks || [];
    const table = parseCSV(text);
    if (table.length < 2) return { rows: [], error: 'The file has no rows. Add one row per creator with their Instagram handle.' };
    const header = table[0].map(h => String(h || '').trim().toLowerCase().replace(/\s+/g, ' '));
    const statusCol = {};
    const linkCol = {};
    header.forEach((h, i) => {
        const linkOf = h.match(/^(.*?)\s*(?:·|-|–)?\s*link$/);
        const task = tasks.find(t => taskName(t.title) && taskName(t.title) === taskName(linkOf && linkOf[1] ? linkOf[1] : h));
        if (!task) return;
        if (linkOf && linkOf[1]) linkCol[task.id] = i;
        else statusCol[task.id] = i;
    });
    const col = detectColumns(header, new Set([...Object.values(statusCol), ...Object.values(linkCol)]));
    // Picked by hand in the sheet ("Instagram from …"): -1 means none.
    Object.entries(columns).forEach(([key, idx]) => {
        if (!SHEET_COLUMNS.includes(key)) return;
        if (idx === -1 || idx === null) delete col[key];
        else if (Number.isInteger(idx) && idx >= 0 && idx < header.length) col[key] = idx;
    });
    if (col.id === undefined && col.instagram === undefined && col.email === undefined && col.phone === undefined) {
        return { rows: [], header: table[0], columns: col, error: 'Add an "Instagram" column (or Newbi ID, email or phone) so we can find each creator, or pick the column below.' };
    }
    const only = forTaskId ? tasks.find(t => String(t.id) === String(forTaskId)) : null;
    const byColumn = !only && (Object.keys(statusCol).length > 0 || Object.keys(linkCol).length > 0);
    if (!only && !byColumn) {
        return { rows: [], error: 'Pick which deliverable this sheet is for, or add a column per deliverable.' };
    }
    const anyLink = header.findIndex(h => LINK_HEADERS.includes(h));
    // Profile links and contact details are never a post link.
    const idCols = new Set([
        ...Object.values(col),
        ...header.map((h, i) => (Object.values(HEADERS).some(names => names.includes(h)) ? i : -1)).filter(i => i >= 0),
    ]);

    const otherTaskCols = new Set([...Object.entries(statusCol), ...Object.entries(linkCol)]
        .filter(([id]) => !only || String(id) !== String(only.id)).map(([, idx]) => idx));

    const match = matcherFor(entries);
    const guestsByKey = new Map(entries.filter(e => e.guest).map(e => [e.key, e]));
    const seen = new Set();
    const rows = table.slice(1)
        .map((r, i) => ({ r, row: i + 2 }))
        .filter(({ r }) => r.some(v => String(v ?? '').trim()))
        .map(({ r, row }) => {
            const at = (idx) => (idx === undefined || idx < 0 ? '' : String(r[idx] ?? '').trim());
            const cells = Object.fromEntries(Object.entries(col).map(([k, idx]) => [k, at(idx)]));
            const entry = match(cells) || guestsByKey.get(guestKeyFor({ handle: handleIn(cells.instagram), phone: phoneKey(cells.phone) })) || null;
            const label = entry?.creator?.name || cells.name || cells.instagram || cells.id || cells.email || cells.phone || `Row ${row}`;
            const markedTasks = only
                ? (() => {
                    const value = at(statusCol[only.id]);
                    if (value && !isDoneWord(value.toLowerCase()) && !isUrl(value)) return [];
                    const rest = r.map((_, idx) => idx).filter(idx => !idCols.has(idx) && !otherTaskCols.has(idx));
                    const link = [at(linkCol[only.id]), value, at(anyLink), ...rest.map(at)].find(isUrl) || '';
                    return [{ task: only, link }];
                })()
                : tasks.flatMap(t => {
                    // A link means done, unless the status column says otherwise ("To review" plus a link isn't done).
                    const value = at(statusCol[t.id]);
                    const link = [at(linkCol[t.id]), value].find(isUrl) || '';
                    const isDone = value ? isDoneWord(value.toLowerCase()) || isUrl(value) : Boolean(link);
                    return isDone ? [{ task: t, link }] : [];
                });
            const itemOf = (t) => entry?.progress?.items?.find(x => String(x.task.id) === String(t.id));
            const marked = markedTasks.map(m => {
                const item = itemOf(m.task);
                const status = item?.status || 'not_started';
                const state = status === 'approved' ? (['admin', 'sheet'].includes(item.sub?.via) ? 'uploaded' : 'both') : status === 'submitted' ? 'sent' : 'new';
                const sheet = sheetMarkOf(m.task, entry);
                const hasLink = Boolean(deliverableLink(item?.sub) || sheet?.link);
                // A guest's own record is the sheet record (guests get no sheetDone on the public doc).
                const needs = state === 'new' || state === 'sent' || (!sheet && !entry?.guest) || Boolean(m.link && !hasLink);
                return { ...m, state, needs };
            });
            const done = marked.filter(m => m.state === 'new' || m.state === 'sent');
            const save = marked.filter(m => m.needs);
            const adds = Boolean(entry) && !entry.guest && !isSelected(campaign, entry.creator);
            // Not on Newbi: added to the campaign as a sheet guest, by handle (or phone), to invite later.
            const guestKey = entry ? null : guestKeyFor({ handle: handleIn(cells.instagram), phone: phoneKey(cells.phone) });
            const guest = guestKey ? {
                key: guestKey, instagram: handleIn(cells.instagram), name: cells.name || '', phone: phoneKey(cells.phone), email: emailKey(cells.email),
            } : null;
            const member = guest ? 'newGuest' : !entry ? null : entry.guest ? 'guest' : !adds ? 'in' : hasApplied(campaign, entry.creator) ? 'applied' : 'new';
            const seenKey = entry?.key || guestKey;
            let status;
            if (!entry && !guest) status = 'unknown';
            else if (seen.has(seenKey)) status = 'duplicate';
            else if (guest) status = marked.length ? 'guest' : 'nothing';
            else if (!marked.length) status = 'nothing';
            else if (done.length || adds) status = 'ready';
            else status = save.length ? 'both' : 'already';
            if (seenKey && marked.length) seen.add(seenKey);
            return { row, cells: r, read: cells, label: guest ? (cells.name || (guest.instagram ? `@${guest.instagram}` : label)) : label, status, entry, adds, guest, member, marked, done, save };
        });
    return { rows, error: null, byColumn, header: table[0], columns: col };
};

const MEMBER_NOTE = {
    in: 'Registered, in the campaign',
    applied: 'Registered and applied, added to the campaign',
    new: 'Registered, added to the campaign',
    guest: 'Not on Newbi yet, in the campaign from a sheet',
    newGuest: 'Not on Newbi yet: added to the campaign, invite them later',
};
/** The short form of MEMBER_NOTE, for a badge. */
export const MEMBER_BADGE = {
    in: { label: 'Registered', tone: 'blue' },
    applied: { label: 'Registered', tone: 'blue' },
    new: { label: 'Registered', tone: 'blue' },
    guest: { label: 'From a sheet', tone: 'gray' },
    newGuest: { label: 'Not on Newbi', tone: 'amber' },
};

/** One line on what happens to a row, for the preview and the checked sheet. */
export const doneRowNote = (r) => {
    if (r.status === 'unknown') {
        // Say what was in the row, so a wrong column or a mistyped handle is easy to spot.
        const ig = String(r.read?.instagram || '').trim();
        const phone = String(r.read?.phone || '').trim();
        if (ig) return `Not on Newbi, and “${ig.slice(0, 40)}” isn’t an Instagram handle`;
        if (phone) return `Not on Newbi, and “${phone.slice(0, 20)}” isn’t a 10-digit phone number`;
        return 'Not on Newbi, and this row has no Instagram handle or phone';
    }
    if (r.status === 'duplicate') return 'Repeated row';
    if (r.status === 'nothing') return 'Nothing marked done';
    return [MEMBER_NOTE[r.member], ...r.marked.map(m => `${m.task.title || 'Deliverable'}: ${DONE_ITEM_NOTE[m.state]}`)].filter(Boolean).join(' · ');
};

/** downloadCsv spec: the uploaded sheet as it was, plus what Newbi found for each row. */
export const checkedSheetSpec = (parsed, fileName = 'sheet') => ({
    filename: `${String(fileName).replace(/\.csv$/i, '').replace(/[^\w-]+/g, '_').slice(0, 40)}_checked`,
    rows: parsed.rows,
    columns: [
        ...parsed.header.map((h, idx) => ({ header: String(h || ''), value: r => r.cells[idx] ?? '' })),
        { header: 'Newbi ID', value: r => (r.entry ? newbiIdOf(r.entry.creator) : '') },
        { header: 'Newbi status', value: r => DONE_ROW_STATUS[r.status].label },
        { header: 'Newbi check', value: r => doneRowNote(r) },
    ],
});
