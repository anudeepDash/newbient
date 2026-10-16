import { nicheKey } from '../../../lib/constants';
import { isBangaloreVariant, isPendingCreator, toMillis } from '../creatorPortal/creatorUtils';

/*
 * Who gets a campaign. Pure functions so the audience builder, the review
 * step and the newsletter studio all count people the same way.
 *
 * A contact is { email, name, role, source }.
 */

export const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
export const isValidEmail = (value) => EMAIL_RE.test(normalizeEmail(value));

export const SEGMENTS = [
    { id: 'subscribers', label: 'Newsletter subscribers', short: 'Subscribers', tone: 'blue', hint: 'People who signed up on the website' },
    { id: 'users', label: 'Registered users', short: 'Users', tone: 'violet', hint: 'Everyone with a Newbi account' },
    { id: 'creators', label: 'Creators', short: 'Creators', tone: 'pink', hint: 'Filter by city, niche and status' },
    { id: 'team', label: 'Team', short: 'Team', tone: 'amber', hint: 'Admins and staff, good for a dry run' },
    { id: 'custom', label: 'Custom list', short: 'Custom', tone: 'teal', hint: 'Pick people, paste emails or import a CSV' },
];

export const SEGMENT_BY_ID = Object.fromEntries(SEGMENTS.map(s => [s.id, s]));

export const CREATOR_STATUSES = [
    { value: 'all', label: 'Any status' },
    { value: 'approved', label: 'Verified' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'blocked', label: 'Blocked' },
];

export const DEFAULT_AUDIENCE = {
    segments: ['subscribers'],
    creatorFilters: { city: 'all', niche: 'all', status: 'all' },
    custom: [],
    exclude: [],
};

const contact = (raw, source) => {
    if (!raw) return null;
    const email = normalizeEmail(raw.email);
    return {
        email,
        name: String(raw.displayName || raw.name || raw.fullName || '').trim(),
        role: raw.role || raw.category || '',
        source,
        unsubscribed: raw.unsubscribed === true,
    };
};

export const creatorMatches = (c, { city = 'all', niche = 'all', status = 'all' } = {}) => {
    if (status === 'pending' && !isPendingCreator(c)) return false;
    if (status !== 'all' && status !== 'pending' && c.profileStatus !== status) return false;
    if (city !== 'all') {
        const own = String(c.city || '').trim();
        const sameCity = own.toLowerCase() === city.toLowerCase() || (city === 'Bengaluru' && isBangaloreVariant(own));
        if (!sameCity) return false;
    }
    if (niche !== 'all') {
        const specs = Array.isArray(c.specializations) ? c.specializations : (Array.isArray(c.niches) ? c.niches : []);
        const target = nicheKey(niche);
        if (![...specs, c.categories, c.category, c.niche].some(n => n && nicheKey(n) === target)) return false;
    }
    return true;
};

/** Contacts for one segment (not yet de-duplicated). */
export const segmentContacts = (id, sources, filters) => {
    const { subscribers = [], users = [], creators = [], team = [] } = sources;
    if (id === 'subscribers') return subscribers.map(s => contact(s, 'subscribers'));
    if (id === 'users') return users.map(u => contact(u, 'users'));
    if (id === 'creators') return creators.filter(c => creatorMatches(c, filters)).map(c => contact({ ...c, role: 'Creator' }, 'creators'));
    if (id === 'team') return team.map(a => contact(a, 'team'));
    return [];
};

/**
 * Builds the final list.
 * suppressed: Set of emails that unsubscribed (server list).
 * Returns { recipients, stats, perSegment, skipped }.
 */
export const buildAudience = (sources, audience, suppressed = new Set()) => {
    const segments = audience?.segments || [];
    const perSegment = {};
    const all = [];
    segments.forEach(id => {
        const list = id === 'custom'
            ? (audience.custom || []).map(c => contact(c, 'custom'))
            : segmentContacts(id, sources, audience.creatorFilters);
        const cleaned = list.filter(Boolean);
        perSegment[id] = cleaned.length;
        all.push(...cleaned);
    });

    const excludeSet = new Set((audience?.exclude || []).map(normalizeEmail).filter(Boolean));
    const seen = new Map();
    const skipped = { invalid: [], duplicates: 0, unsubscribed: [], excluded: [] };
    all.forEach(c => {
        if (!c.email || !EMAIL_RE.test(c.email)) { skipped.invalid.push(c); return; }
        if (seen.has(c.email)) {
            skipped.duplicates++;
            const kept = seen.get(c.email);
            if (!kept.name && c.name) kept.name = c.name;
            if (c.unsubscribed) kept.unsubscribed = true;
            return;
        }
        seen.set(c.email, { ...c });
    });

    const recipients = [];
    seen.forEach(c => {
        if (excludeSet.has(c.email)) { skipped.excluded.push(c); return; }
        if (c.unsubscribed || suppressed.has(c.email)) { skipped.unsubscribed.push(c); return; }
        recipients.push(c);
    });

    return {
        recipients,
        perSegment,
        skipped,
        stats: {
            matched: all.length,
            duplicates: skipped.duplicates,
            invalid: skipped.invalid.length,
            unsubscribed: skipped.unsubscribed.length,
            excluded: skipped.excluded.length,
            final: recipients.length,
        },
    };
};

/** "Subscribers + creators in Pune" */
export const describeAudience = (audience) => {
    const parts = (audience?.segments || []).map(id => {
        if (id === 'creators') {
            const f = audience.creatorFilters || {};
            const bits = [];
            if (f.status && f.status !== 'all') bits.push(CREATOR_STATUSES.find(s => s.value === f.status)?.label.toLowerCase());
            bits.push('creators');
            if (f.niche && f.niche !== 'all') bits.push(`(${f.niche})`);
            if (f.city && f.city !== 'all') bits.push(`in ${f.city}`);
            return bits.filter(Boolean).join(' ');
        }
        if (id === 'custom') return `${(audience.custom || []).length} custom`;
        return (SEGMENT_BY_ID[id]?.short || id).toLowerCase();
    });
    if (!parts.length) return 'No one yet';
    const text = parts.join(' + ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Reads pasted text or a CSV. With a header row that has an "email" column
 * (and maybe "name"), uses those columns; otherwise pulls out anything that
 * looks like an email address.
 */
export const parseEmailList = (text) => {
    const raw = String(text || '');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    const out = [];
    const bad = [];
    const splitCsv = (line) => {
        const cells = [];
        let cur = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted; }
            else if ((ch === ',' || ch === ';' || ch === '\t') && !quoted) { cells.push(cur.trim()); cur = ''; }
            else cur += ch;
        }
        cells.push(cur.trim());
        return cells;
    };
    if (lines.length) {
        const header = splitCsv(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
        const emailCol = header.findIndex(h => h === 'email' || h === 'emailaddress' || h === 'mail' || h === 'emailid');
        if (emailCol >= 0) {
            const nameCol = header.findIndex(h => h === 'name' || h === 'fullname' || h === 'firstname' || h === 'displayname');
            lines.slice(1).forEach(line => {
                const cells = splitCsv(line);
                const email = normalizeEmail(cells[emailCol]);
                if (!email) return;
                if (EMAIL_RE.test(email)) out.push({ email, name: nameCol >= 0 ? (cells[nameCol] || '') : '' });
                else bad.push(cells[emailCol]);
            });
            return { contacts: dedupe(out), invalid: bad };
        }
    }
    const tokens = raw.split(/[\s,;<>()"']+/).map(t => t.trim()).filter(t => t.includes('@'));
    tokens.forEach(t => {
        const email = normalizeEmail(t.replace(/^mailto:/i, ''));
        if (EMAIL_RE.test(email)) out.push({ email, name: '' });
        else bad.push(t);
    });
    return { contacts: dedupe(out), invalid: bad };
};

const dedupe = (list) => {
    const map = new Map();
    list.forEach(c => { if (!map.has(c.email)) map.set(c.email, c); });
    return [...map.values()];
};

/** A rough "how long will this take" for the review step. */
export const estimateDuration = (count, individual) => {
    if (!count) return '';
    const seconds = individual ? Math.ceil(count / 3) * 1.6 : Math.ceil(count / 45) * 2.5;
    if (seconds < 60) return 'under a minute';
    const minutes = Math.round(seconds / 60);
    return minutes <= 1 ? 'about a minute' : `about ${minutes} minutes`;
};

export const campaignTime = (c) => toMillis(c?.sentAt || c?.createdAt);
