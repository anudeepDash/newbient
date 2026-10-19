import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { pollPasses, staffPassList } from '../../../lib/passesApi';
import { parseCSV } from '../creators/creatorData';
import { creatorHandle, creatorRef } from './campaignModel';

/*
 * Campaign tickets (Phase 5, Flow 2): who can get one, the passes already
 * sent, and the "official tickets" CSV: template, parsing, matching rows to
 * this campaign's applicants, and the preview statuses.
 *
 *   CSV columns: creator (email, phone, Instagram handle or creator ID) ·
 *                ticket_url | ticket_file · qty · tier · note
 */

export const TICKET_STAGES = ['shortlisted', 'selected', 'review', 'approved', 'paid'];
export const canGetTicket = (entry) => TICKET_STAGES.includes(entry?.stage);

/**
 * Live passes for one campaign. Straight from Firestore when the rules let
 * staff read passes; otherwise through the API (staff-list), refreshed every
 * 15 s and right after any send, upgrade or revoke.
 */
export const useCampaignPasses = (campaignId) => {
    const [state, setState] = useState({ passes: [], loaded: false, error: null });
    useEffect(() => {
        if (!campaignId || !db) return undefined;
        setState(s => ({ ...s, loaded: false }));
        let stopPoll = null;
        let alive = true;
        const viaApi = () => {
            stopPoll = pollPasses(async () => {
                const res = await staffPassList({ campaignId });
                if (!alive) return;
                if (res.ok) setState({ passes: res.data.passes || [], loaded: true, error: null });
                else setState(s => ({ ...s, loaded: true, error: s.passes.length ? null : res.code || 'error' }));
            });
        };
        const unsub = onSnapshot(
            query(collection(db, 'passes'), where('sourceId', '==', campaignId)),
            (snap) => setState({
                passes: snap.docs.map(d => ({ ...d.data(), ref: d.id })).filter(p => p.source === 'campaign'),
                loaded: true,
                error: null,
            }),
            (error) => {
                if (error?.code === 'permission-denied') viaApi();
                else setState({ passes: [], loaded: true, error: error?.code || 'error' });
            }
        );
        return () => { alive = false; unsub(); stopPoll?.(); };
    }, [campaignId]);
    return state;
};

/** creator key (uid or profile id) → their live pass for this campaign. */
export const passesByCreator = (passes) => {
    const map = new Map();
    (passes || []).filter(p => p.status !== 'revoked').forEach(p => {
        [p.holderUid, p.creatorId].filter(Boolean).forEach(k => map.set(k, p));
    });
    return map;
};
export const passFor = (map, creator) => map.get(creator?.uid) || map.get(creator?.id) || null;

/* ---------- delivery status ---------- */

const OK = new Set(['sent', 'delivered', 'read', 'queued', 'duplicate']);
export const channelState = (delivery, channel) => {
    const st = delivery?.[channel]?.status;
    if (!st) return 'none';
    if (OK.has(st)) return 'ok';
    if (st === 'skipped' || st === 'suppressed') return 'skipped';
    if (st === 'retry' || st === 'retrying' || st === 'sending') return 'pending';
    return 'failed';
};
export const hasFailure = (p) => ['email', 'whatsapp'].some(ch => channelState(p.delivery, ch) === 'failed');

/* ---------- CSV ---------- */

export const TEMPLATE_COLUMNS = ['creator', 'name', 'ticket_url', 'ticket_file', 'qty', 'tier', 'note'];

const digits = (v) => String(v || '').replace(/\D/g, '');
const phoneKey = (v) => { const d = digits(v); return d.length >= 10 ? d.slice(-10) : ''; };
const emailKey = (v) => { const e = String(v || '').trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ''; };
const handleKey = (v) => String(v || '').trim().replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '').toLowerCase();

/** The identifier we put in the template's creator column: email, else phone, else @handle, else id. */
export const creatorIdentifier = (c) => emailKey(c.email) || (phoneKey(c.phone) ? `+91${phoneKey(c.phone)}` : '') || (creatorHandle(c) ? `@${creatorHandle(c)}` : '') || creatorRef(c);

/** Template rows, pre-filled with the creators who can get a ticket. */
// Category and count pre-filled from the campaign's follower categories (followerTier, below).
export const templateRows = (entries, campaign) => entries.map(e => {
    const t = followerTier(campaign?.passTiers, e.creator);
    return {
        creator: creatorIdentifier(e.creator),
        name: e.creator.name || '',
        ticket_url: '',
        ticket_file: '',
        qty: String(t?.qty || Number(campaign?.ticketsPerCreator) || 1),
        tier: t?.name || '',
        note: '',
    };
});

/** Lookups from every way a CSV might name a creator → applicant entry. */
export const buildMatcher = (applicants) => {
    const by = new Map();
    const add = (key, entry) => { if (key && !by.has(key)) by.set(key, entry); };
    applicants.forEach(entry => {
        const c = entry.creator;
        add(`id:${c.id}`, entry);
        add(`id:${c.uid}`, entry);
        add(`e:${emailKey(c.email)}`, entry);
        add(`p:${phoneKey(c.phone)}`, entry);
        add(`p:${phoneKey(c.whatsapp)}`, entry);
        add(`h:${handleKey(c.instagram)}`, entry);
    });
    return (raw) => {
        const v = String(raw || '').trim();
        if (!v) return null;
        if (emailKey(v)) return by.get(`e:${emailKey(v)}`) || null;
        if (v.startsWith('@') || /instagram\.com/i.test(v)) return by.get(`h:${handleKey(v)}`) || null;
        return by.get(`id:${v}`) || (phoneKey(v) && /^[+\d\s()-]+$/.test(v) ? by.get(`p:${phoneKey(v)}`) : null) || by.get(`h:${handleKey(v)}`) || null;
    };
};

const HEADER_ALIASES = {
    creator: ['creator', 'creator id', 'email', 'phone', 'instagram', 'handle', 'id', 'uid'],
    ticket_url: ['ticket_url', 'ticket url', 'url', 'link', 'ticket link'],
    ticket_file: ['ticket_file', 'ticket file', 'file', 'pdf', 'filename', 'file name'],
    qty: ['qty', 'quantity', 'tickets', 'count'],
    tier: ['tier', 'type', 'ticket type', 'category'],
    note: ['note', 'notes', 'message', 'comment'],
    provider: ['provider', 'partner', 'platform'],
};

/** CSV text → [{ row, creator, ticket_url, ticket_file, qty, tier, note, provider }] (row is the line number). */
export const readTicketCsv = (text) => {
    const rows = parseCSV(text);
    if (!rows.length) return { rows: [], error: 'The file is empty.' };
    const header = rows[0].map(h => String(h || '').trim().toLowerCase());
    const col = {};
    Object.entries(HEADER_ALIASES).forEach(([key, names]) => {
        const i = header.findIndex(h => names.includes(h));
        if (i >= 0) col[key] = i;
    });
    if (col.creator === undefined) return { rows: [], error: 'Add a "creator" column (email, phone, Instagram handle or creator ID).' };
    if (col.ticket_url === undefined && col.ticket_file === undefined) return { rows: [], error: 'Add a "ticket_url" or "ticket_file" column.' };
    const get = (r, key) => (col[key] === undefined ? '' : String(r[col[key]] ?? '').trim());
    return {
        rows: rows.slice(1).map((r, i) => ({
            row: i + 2,
            creator: get(r, 'creator'),
            ticket_url: get(r, 'ticket_url'),
            ticket_file: get(r, 'ticket_file'),
            qty: get(r, 'qty'),
            tier: get(r, 'tier'),
            note: get(r, 'note'),
            provider: get(r, 'provider'),
        })).filter(r => r.creator || r.ticket_url || r.ticket_file),
        error: null,
    };
};

const MAX_PDF = 3 * 1024 * 1024;
/* The name the server stores a PDF under (same rule as api/_lib/passes.js safeFileName). */
export const storedPdfName = (name) => {
    const base = String(name || '').trim().slice(0, 120).replace(/\.pdf$/i, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'ticket';
    return `${base}.pdf`;
};
const fileKey = (name) => String(name || '').trim().toLowerCase();

/**
 * Works out every row's status for the preview:
 *   ready      matched, ticket is fine, will be sent (or replace a different ticket)
 *   unmatched  creator not found among this campaign's applicants
 *   duplicate  creator already listed above, or already has this exact ticket
 *   problem    no ticket, a bad link, a PDF that wasn't dropped in or is too big
 * Rows can be fixed inline: `override.creatorKey` picks the creator,
 * `override.url` / `override.file` replace the ticket, `skip` leaves it out.
 */
export const evaluateRows = ({ rows, applicants, files, passes, overrides = {} }) => {
    const match = buildMatcher(applicants);
    const byKey = new Map(applicants.map(a => [a.key, a]));
    const filesByName = new Map((files || []).map(f => [fileKey(f.name), f]));
    const existing = passesByCreator(passes);
    const seen = new Set();
    return rows.map((r) => {
        const o = overrides[r.row] || {};
        const entry = o.creatorKey ? byKey.get(o.creatorKey) || null : match(r.creator);
        const url = (o.url ?? r.ticket_url).trim();
        const fileName = (o.file ?? r.ticket_file).trim();
        const file = fileName ? filesByName.get(fileKey(fileName)) || filesByName.get(fileKey(`${fileName}.pdf`)) || null : null;
        const qty = Math.max(1, Math.min(50, parseInt(r.qty, 10) || 1));
        const base = { ...r, entry, url, fileName, file, qty, skip: Boolean(o.skip), kind: fileName ? 'pdf' : url ? 'link' : null };

        if (!entry) return { ...base, status: 'unmatched', reason: r.creator ? `No applicant matches “${r.creator}”` : 'No creator given' };
        const key = entry.key;
        if (seen.has(key)) return { ...base, status: 'duplicate', reason: 'Listed more than once' };
        seen.add(key);

        if (!url && !fileName) return { ...base, status: 'problem', reason: 'No ticket link or file' };
        if (fileName && !file) return { ...base, status: 'problem', reason: `Drop in ${fileName} too` };
        if (file && !/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return { ...base, status: 'problem', reason: 'Ticket files must be PDFs' };
        if (file && file.size > MAX_PDF) return { ...base, status: 'problem', reason: 'PDF is over 3 MB' };
        if (!fileName && !/^https:\/\/[^\s]+\.[^\s]+/i.test(url)) return { ...base, status: 'problem', reason: 'Links must start with https://' };

        const current = passFor(existing, entry.creator)?.externalTicket;
        if (current) {
            const sameLink = current.kind === 'link' && base.kind === 'link' && current.url === url;
            const sameFile = current.kind === 'pdf' && base.kind === 'pdf' && file && current.filename === storedPdfName(file.name) && Number(current.size) === file.size;
            if ((sameLink || sameFile) && Number(current.qty || 1) === qty && (current.tier || '') === r.tier && (current.note || '') === r.note) {
                return { ...base, status: 'duplicate', reason: 'Already has this ticket' };
            }
            return { ...base, status: 'ready', replaces: true, notSelected: !canGetTicket(entry) };
        }
        return { ...base, status: 'ready', notSelected: !canGetTicket(entry) };
    });
};

export const ROW_STATUS = {
    ready: { label: 'Matched', tone: 'green' },
    unmatched: { label: 'Unmatched', tone: 'amber' },
    duplicate: { label: 'Duplicate', tone: 'gray' },
    problem: { label: 'Problem', tone: 'rose' },
};

/* ---------- ticket categories by followers ---------- */

/*
 * campaign.passTiers: [{ name, minFollowers, qty? }] from the editor (Event passes).
 * A creator gets the highest category their Instagram follower count reaches;
 * no count, or below every category → null (the sheet's own tier and count apply).
 */
export const cleanPassTiers = (tiers) => (Array.isArray(tiers) ? tiers : [])
    .map(t => ({ name: String(t?.name || '').trim().slice(0, 60), minFollowers: Math.max(0, Math.round(Number(t?.minFollowers) || 0)), qty: Number(t?.qty) > 0 ? Math.min(20, Math.round(Number(t.qty))) : null }))
    .filter(t => t.name)
    .sort((a, b) => b.minFollowers - a.minFollowers);

export const followerTier = (tiers, creator) => {
    const followers = Number(creator?.instagramFollowers);
    if (!Number.isFinite(followers) || followers <= 0) return null;
    return cleanPassTiers(tiers).find(t => followers >= t.minFollowers) || null;
};

export const followersLabel = (n) => {
    const v = Number(n) || 0;
    if (v >= 1e6) return `${+(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${+(v / 1e3).toFixed(1)}K`;
    return String(v);
};
