// Data helpers for the admin Creators screens: search, CSV import checks and the
// referral leaderboard. Pure functions, no React.
import { PREDEFINED_CITIES, CREATOR_NICHES, nicheKey, isCollegeNiche } from '../../../lib/constants';
import { extractSocialUsername } from '../../../lib/socialUtils';
import { normalizePhoneNumber } from '../../../lib/utils';
import { creatorKey, creatorReach, isBangaloreVariant, toMillis } from '../creatorPortal/creatorUtils';
import { referralCounts, tierFor } from '../../../lib/creator/referralTiers';

/* ── Search ──────────────────────────────────────────────────────────────── */

export const SEARCH_FIELDS = [
    { id: 'all', label: 'All fields', placeholder: 'Name, phone, email, @instagram, city, college…' },
    { id: 'phone', label: 'Phone', placeholder: 'Search by phone number' },
    { id: 'name', label: 'Name', placeholder: 'Search by name' },
    { id: 'instagram', label: 'Instagram', placeholder: 'Search by @handle' },
    { id: 'email', label: 'Email', placeholder: 'Search by email' },
    { id: 'id', label: 'Creator ID', placeholder: 'Search by creator ID or UID' },
    { id: 'college', label: 'College', placeholder: 'Search by college' },
    { id: 'city', label: 'City', placeholder: 'Search by city' },
    { id: 'niche', label: 'Niche', placeholder: 'Search by niche' },
];

export const creatorNiches = (c) => {
    const list = Array.isArray(c?.specializations) ? c.specializations : (Array.isArray(c?.niches) ? c.niches : []);
    return list.filter(n => typeof n === 'string' && n.trim());
};

export const matchesCreatorSearch = (c, term, field = 'all') => {
    if (!term || !term.trim()) return true;
    const cleanTerm = term.trim().toLowerCase();
    const termDigits = cleanTerm.replace(/\D/g, '');

    const rawPhones = [c.phone, c.mobile, c.whatsapp, c.contact, c.phoneNumber].filter(Boolean).map(String);
    const phoneDigitsList = rawPhones.map(p => p.replace(/\D/g, ''));

    const matchesPhone = () => {
        if (rawPhones.some(p => p.toLowerCase().includes(cleanTerm))) return true;
        if (termDigits.length >= 3) {
            return phoneDigitsList.some(pDigits => pDigits && (pDigits.includes(termDigits) || termDigits.includes(pDigits)));
        }
        return false;
    };
    const matchesName = () => [c.name, c.displayName, c.fullName, c.artistName].filter(Boolean)
        .some(n => String(n).toLowerCase().includes(cleanTerm));
    const matchesEmail = () => Boolean(c.email && String(c.email).toLowerCase().includes(cleanTerm));
    const matchesInstagram = () => {
        const strippedTerm = cleanTerm.replace(/^@/, '');
        return [c.instagram, c.handle, c.instagramHandle].filter(Boolean)
            .some(ig => String(ig).toLowerCase().replace(/^@/, '').includes(strippedTerm));
    };
    const matchesCity = () => Boolean(c.city && String(c.city).toLowerCase().includes(cleanTerm));
    const matchesId = () => [c.uid, c.id, c.creatorId, c.passId, c.passNumber].filter(Boolean)
        .some(id => String(id).toLowerCase().includes(cleanTerm));
    const matchesCollege = () => [c.college, c.collegeName, c.university, c.campus, c.school].filter(Boolean)
        .some(col => String(col).toLowerCase().includes(cleanTerm));
    const matchesNiche = () => [...creatorNiches(c), c.categories, c.category, c.niche]
        .some(n => typeof n === 'string' && n.toLowerCase().includes(cleanTerm));
    const matchesSocials = () => [c.youtube, c.youtubeChannel, c.youtubeHandle, c.linkedin, c.linkedinProfile, c.twitter, c.xHandle, c.portfolio, c.website]
        .filter(Boolean).some(soc => String(soc).toLowerCase().includes(cleanTerm));
    const matchesFinance = () => [c.pan, c.panNumber, c.upiId, c.bankAccount, c.accountNumber, c.ifsc, c.gstNumber]
        .filter(Boolean).some(f => String(f).toLowerCase().includes(cleanTerm));
    const matchesBio = () => [c.bio, c.about, c.description, c.notes, c.adminNotes]
        .filter(Boolean).some(t => String(t).toLowerCase().includes(cleanTerm));

    switch (field) {
        case 'phone': return matchesPhone();
        case 'name': return matchesName();
        case 'email': return matchesEmail();
        case 'instagram': return matchesInstagram();
        case 'id': return matchesId();
        case 'college': return matchesCollege();
        case 'city': return matchesCity();
        case 'niche': return matchesNiche();
        case 'socials': return matchesSocials() || matchesInstagram();
        case 'finance': return matchesFinance();
        case 'all':
        default:
            return matchesPhone() || matchesName() || matchesEmail() || matchesInstagram() || matchesId() ||
                matchesCity() || matchesNiche() || matchesCollege() || matchesSocials() || matchesFinance() || matchesBio();
    }
};

export const creatorJoinedAt = (c) => toMillis(c?.createdAt || c?.joinedAt || c?.registeredAt || c?.updatedAt);

// A steady colour per niche, so niche chips aren't all grey.
const NICHE_TONES = ['violet', 'blue', 'teal', 'orange', 'fuchsia', 'cyan', 'indigo', 'rose', 'amber', 'green'];
export const nicheTone = (niche) => {
    if (isCollegeNiche(niche)) return 'teal';
    let h = 0;
    for (const ch of nicheKey(niche)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return NICHE_TONES[h % NICHE_TONES.length];
};

/* ── CSV ─────────────────────────────────────────────────────────────────── */

// RFC 4180-ish parser: quoted fields, escaped quotes, commas/newlines in quotes, CRLF.
export const parseCSV = (text) => {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    const input = String(text || '').replace(/^﻿/, '');
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (inQuotes) {
            if (ch === '"') {
                if (input[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
            } else field += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && input[i + 1] === '\n') i++;
            row.push(field); field = '';
            if (row.some(v => v.trim() !== '')) rows.push(row);
            row = [];
        } else field += ch;
    }
    row.push(field);
    if (row.some(v => v.trim() !== '')) rows.push(row);
    return rows;
};

// Accepted header names for each field (lower-case). The creator export uses
// the first names, so an export can be re-imported.
const COLUMN_ALIASES = {
    name: ['name', 'full name', 'creator name', 'creator'],
    email: ['email', 'email id', 'email address', 'mail'],
    phone: ['phone', 'mobile', 'contact', 'phone number', 'mobile number', 'whatsapp'],
    city: ['city', 'location'],
    niche: ['niches', 'niche', 'specialization', 'specializations', 'category', 'categories'],
    college: ['college', 'college name', 'university', 'campus'],
    instagram: ['instagram', 'handle', 'instagram handle', 'ig'],
    followers: ['instagram followers', 'followers', 'ig followers'],
    linkedin: ['linkedin'],
    youtube: ['youtube', 'youtube channel'],
    bio: ['bio', 'description', 'about'],
    referredBy: ['referred by', 'referral', 'referral code', 'ref'],
};

export const IMPORT_TEMPLATE_HEADERS = ['Name', 'Email', 'Phone', 'City', 'Niches', 'College', 'Instagram', 'Instagram followers', 'LinkedIn', 'YouTube', 'Bio', 'Referred by'];
export const IMPORT_TEMPLATE_SAMPLE = ['Priya Sharma', 'priya@example.com', '9876543210', 'Bengaluru', 'Student/ Campus Creator', 'Christ University', 'priyastyle', '12500', '', '', 'Campus lifestyle creator', ''];

const parseCount = (raw) => {
    const s = String(raw || '').trim().toLowerCase().replace(/,/g, '');
    if (!s) return 0;
    const m = s.match(/^([\d.]+)\s*([km])?/);
    if (!m) return 0;
    const n = Number(m[1]) * (m[2] === 'm' ? 1_000_000 : m[2] === 'k' ? 1_000 : 1);
    return Number.isFinite(n) ? Math.round(n) : 0;
};

const canonicalCity = (raw) => {
    const city = String(raw || '').trim();
    if (!city) return '';
    if (isBangaloreVariant(city) || /^bengaluru$/i.test(city)) return 'Bengaluru';
    if (/^(visakhapatnam|vizag)$/i.test(city)) return 'Vizag';
    return PREDEFINED_CITIES.find(c => c.toLowerCase() === city.toLowerCase()) || city;
};

const canonicalNiche = (raw) => {
    const key = nicheKey(raw);
    if (!key) return '';
    const known = CREATOR_NICHES.find(n => nicheKey(n) === key);
    if (known) return known;
    // "Food" → "Food & Beverage", "Tech" → "Tech & Gaming"…
    const partial = key.length >= 4 && CREATOR_NICHES.find(n => nicheKey(n).startsWith(key));
    if (partial) return partial;
    if (/student|campus/.test(key)) return 'Student/ Campus Creator';
    if (/college/.test(key)) return 'College Pages';
    return String(raw).trim();
};

const formatPhone = (raw) => {
    const original = String(raw || '').trim();
    const digits = original.replace(/\D/g, '');
    if (digits.length === 10) return `+91 ${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
    if (digits.length === 11 && digits.startsWith('0')) return `+91 ${digits.slice(1)}`;
    if (original.startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
    return null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Reads a CSV into import rows, each with the creator it would create and the
 * reasons it can't be imported (missing fields, duplicates…).
 */
export const analyseImport = (text, existingCreators = []) => {
    const table = parseCSV(text);
    if (table.length < 2) return { error: 'The file has no rows under the header.' };
    const headers = table[0].map(h => h.trim().toLowerCase());
    const col = {};
    Object.entries(COLUMN_ALIASES).forEach(([key, names]) => {
        const idx = headers.findIndex(h => names.includes(h));
        if (idx >= 0) col[key] = idx;
    });
    const missingColumns = ['name', 'email', 'phone'].filter(k => col[k] === undefined);
    if (missingColumns.length) {
        return { error: `The file needs ${missingColumns.join(', ')} column${missingColumns.length === 1 ? '' : 's'}. Download the template to see the layout.` };
    }

    const byPhone = new Map();
    const byEmail = new Map();
    const byInsta = new Map();
    existingCreators.forEach(c => {
        const p = normalizePhoneNumber(c.phone);
        if (p) byPhone.set(p, c);
        if (c.email) byEmail.set(String(c.email).trim().toLowerCase(), c);
        if (c.instagram) byInsta.set(String(c.instagram).trim().replace(/^@/, '').toLowerCase(), c);
    });
    const seenPhone = new Map();
    const seenEmail = new Map();
    const seenInsta = new Map();

    const rows = table.slice(1).map((values, i) => {
        const get = (key) => (col[key] === undefined ? '' : String(values[col[key]] || '').trim());
        const line = i + 2; // spreadsheet row number (header is row 1)
        const problems = [];
        let duplicateOf = null;

        const name = get('name');
        const email = get('email').toLowerCase();
        const phone = formatPhone(get('phone'));
        const city = canonicalCity(get('city'));
        const niches = get('niche').split(/[;,|]/).map(canonicalNiche).filter(Boolean);
        const niche = niches[0] || '';
        const college = get('college');
        const instagram = extractSocialUsername(get('instagram'), 'instagram').toLowerCase();
        const followers = parseCount(get('followers'));

        if (!name) problems.push('No name');
        if (!email) problems.push('No email');
        else if (!EMAIL_RE.test(email)) problems.push('Email looks wrong');
        if (!get('phone')) problems.push('No phone');
        else if (!phone) problems.push('Phone looks wrong');
        if (!city) problems.push('No city');
        if (!niche) problems.push('No niche');
        if (niches.some(isCollegeNiche) && !college) problems.push('College needed for campus creators and college pages');

        const normPhone = phone ? normalizePhoneNumber(phone) : '';
        const existing = (normPhone && byPhone.get(normPhone)) || (email && byEmail.get(email)) || (instagram && byInsta.get(instagram));
        if (existing) {
            duplicateOf = existing;
            const what = normPhone && byPhone.get(normPhone) ? 'phone' : email && byEmail.get(email) ? 'email' : 'Instagram';
            problems.unshift(`Already a creator (same ${what}): ${existing.name || existing.email || creatorKey(existing)}`);
        } else {
            const earlier = (normPhone && seenPhone.get(normPhone)) || (email && seenEmail.get(email)) || (instagram && seenInsta.get(instagram));
            if (earlier) problems.unshift(`Same person as row ${earlier}`);
        }
        if (normPhone && !seenPhone.has(normPhone)) seenPhone.set(normPhone, line);
        if (email && !seenEmail.has(email)) seenEmail.set(email, line);
        if (instagram && !seenInsta.has(instagram)) seenInsta.set(instagram, line);

        return {
            line,
            ok: problems.length === 0,
            duplicate: Boolean(duplicateOf),
            problems,
            preview: { name, email, phone: phone || get('phone'), city, niche, college, instagram, followers },
            data: {
                name,
                displayName: name,
                email,
                phone: phone || '',
                city,
                categories: niche,
                specializations: niches.length ? niches : [],
                collegeName: college,
                instagram,
                instagramFollowers: String(followers || 0),
                linkedin: extractSocialUsername(get('linkedin'), 'linkedin'),
                youtube: extractSocialUsername(get('youtube'), 'youtube'),
                bio: get('bio'),
                referredBy: get('referredBy'),
            },
        };
    });

    return { rows, columns: Object.keys(col) };
};

/** The creator document an import row becomes (mirrors the Add creator form). */
export const importPayload = (row, status) => {
    const now = new Date().toISOString();
    const approved = status === 'approved';
    return {
        ...row.data,
        uid: `imported_${Math.random().toString(36).substring(2, 15)}`,
        // Follower counts come from a spreadsheet, not an Instagram check.
        manualFollowerEntry: true,
        requiresManualVerification: !approved,
        profileStatus: approved ? 'approved' : 'pending',
        isVerified: approved,
        verifiedAt: approved ? now : null,
        verifiedBy: approved ? 'admin_csv_import' : null,
        isPhoneVerified: Boolean(row.data.phone),
        phoneVerifiedAt: row.data.phone ? now : null,
        addedByAdmin: true,
        importedAt: now,
        source: 'csv_import',
    };
};

/* ── Referral leaderboard ────────────────────────────────────────────────── */

/**
 * Ranks referrers by how many creators joined with their code. The code in a
 * creator's `referredBy` can be the referrer's doc id / uid, creator ID,
 * Instagram handle or LinkedIn handle (the same matching the creator dashboard uses).
 * `since` (ms) counts only sign-ups after that time.
 */
export const buildReferralLeaderboard = (creators, { since = 0, city = 'all' } = {}) => {
    const byUid = new Map();
    const byCreatorId = new Map();
    const byInstagram = new Map();
    const byLinkedin = new Map();
    creators.forEach(rc => {
        if (rc.uid) byUid.set(String(rc.uid), rc);
        if (rc.id) byUid.set(String(rc.id), rc);
        if (rc.creatorId) byCreatorId.set(String(rc.creatorId).toUpperCase(), rc);
        if (rc.instagram) byInstagram.set(String(rc.instagram).toLowerCase().replace(/^@/, ''), rc);
        if (rc.linkedin) byLinkedin.set(String(rc.linkedin).toLowerCase(), rc);
    });

    const referred = new Map();
    const unmatched = new Map();
    let total = 0;
    creators.forEach(c => {
        if (!c.referredBy) return;
        if (since && creatorJoinedAt(c) < since) return;
        const ref = String(c.referredBy).trim();
        if (!ref) return;
        const referrer = byUid.get(ref) || byCreatorId.get(ref.toUpperCase()) ||
            byInstagram.get(ref.toLowerCase().replace(/^@/, '')) || byLinkedin.get(ref.toLowerCase());
        if (!referrer) {
            unmatched.set(ref, (unmatched.get(ref) || 0) + 1);
            return;
        }
        if (creatorKey(referrer) === creatorKey(c)) return;
        total++;
        const key = creatorKey(referrer);
        if (!referred.has(key)) referred.set(key, { referrer, list: [] });
        referred.get(key).list.push(c);
    });

    const rows = [...referred.values()]
        .filter(({ referrer }) => city === 'all' || referrer.city === city || (city === 'Bengaluru' && isBangaloreVariant(referrer.city)))
        .map(({ referrer, list }) => {
            // Approved and not voided: what counts towards the creator's tier (same as the app).
            const verified = list.filter(referralCounts).length;
            const latest = Math.max(0, ...list.map(creatorJoinedAt));
            return {
                creator: referrer,
                referrals: list.sort((a, b) => creatorJoinedAt(b) - creatorJoinedAt(a)),
                count: list.length,
                verified,
                pending: list.filter(r => !r.referralVoid && (!r.profileStatus || r.profileStatus === 'pending' || r.profileStatus === 'pending_verification')).length,
                voided: list.filter(r => r.referralVoid).length,
                tier: tierFor(verified),
                reach: list.reduce((sum, r) => sum + creatorReach(r), 0),
                latest,
            };
        })
        // Approved referrals first, like the creators' own leaderboard; then all sign-ups.
        .sort((a, b) => b.verified - a.verified || b.count - a.count || a.latest - b.latest);

    // Equal scores share a rank (1, 2, 2, 4…).
    let prev = null;
    rows.forEach((r, i) => {
        r.rank = prev && prev.verified === r.verified && prev.count === r.count ? prev.rank : i + 1;
        prev = r;
    });

    return {
        rows,
        total,
        unmatched: [...unmatched.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count),
    };
};

/* Each referrer's tier (Scout, Connector…) by creatorKey, for badges on applicant lists. */
export const referralTierMap = (creators) => {
    const map = new Map();
    buildReferralLeaderboard(creators).rows.forEach(r => { if (r.tier) map.set(creatorKey(r.creator), { tier: r.tier, approved: r.verified }); });
    return map;
};
