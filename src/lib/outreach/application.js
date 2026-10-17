import { CREATOR_NICHE_OPTIONS } from '../constants.js';
import { normalizeHandle, normalizePhone, normalizeEmail, firstNameOf } from './normalize.js';

/*
 * Campaign applications (campaigns/{id}/applications/{appId}).
 *
 * The public form and the server both run validateApplication(); the server's
 * result is the one that counts. Duplicates (same phone or same handle within a
 * campaign) update the existing application with the latest values; see
 * mergeApplication() and resolveDuplicate().
 */

export const CONSENT_TEXT = 'I agree to receive campaign updates on WhatsApp.';

/* Creator categories, the same list creator profiles use. */
export const CATEGORIES = CREATOR_NICHE_OPTIONS.map(o => ({ value: o.id, label: o.label }));
const CATEGORY_IDS = new Set(CATEGORIES.map(c => c.value));

export const REFERRAL_SOURCES = ['Instagram', 'WhatsApp group', 'A friend', 'College', 'Newbi website', 'Other'];

export const MAX_FOLLOWERS = 500_000_000;

/* ── Tiers ────────────────────────────────────────────────────────────── */

export const TIERS = ['nano', 'micro', 'macro'];
export const DEFAULT_TIER_MIN = { nano: 0, micro: 10_000, macro: 100_000 };

/** nano / micro / macro by follower count, using the campaign's own thresholds when set. */
export const tierFor = (followers, perksByTier) => {
    const n = Number(followers) || 0;
    const minOf = (t) => {
        const v = perksByTier?.[t]?.minFollowers;
        return v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? DEFAULT_TIER_MIN[t] : Number(v);
    };
    if (n >= minOf('macro')) return 'macro';
    if (n >= minOf('micro')) return 'micro';
    return 'nano';
};

/* ── Campaign rules the form needs ────────────────────────────────────── */

/** The cities this campaign takes applications from (falls back to the older single targetCity). */
export const campaignCities = (campaign) => {
    const list = Array.isArray(campaign?.cities) ? campaign.cities : [];
    const clean = list.map(c => String(c || '').trim()).filter(Boolean);
    if (clean.length) return [...new Set(clean)];
    const single = String(campaign?.targetCity || '').trim();
    return single ? [single] : [];
};

/** "2026-10-20" plus the end of that day in India, as a timestamp. */
const endOfIstDay = (day) => {
    const m = String(day || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999) - 330 * 60 * 1000;
};

/**
 * Whether the public form takes applications now. Only Open campaigns do
 * ('Live' means the event is running and applications are closed), and only
 * until the end of the application deadline, India time.
 */
export const applicationsOpen = (campaign, now = Date.now()) => {
    const status = String(campaign?.status || '').trim().toLowerCase();
    if (status !== 'open') return { open: false, reason: status === 'live' ? 'live' : 'closed' };
    const end = endOfIstDay(campaign?.applicationDeadline);
    if (end !== null && now > end) return { open: false, reason: 'deadline' };
    return { open: true, reason: null };
};

/* ── Validation ───────────────────────────────────────────────────────── */

const str = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const bool = (v) => v === true || v === 'true' || v === 'yes' || v === 'on' || v === 1 || v === '1';

/** "12,500" or 12500 → 12500. "12.5k" → 12500. Anything else → NaN. */
export const parseFollowers = (v) => {
    if (typeof v === 'number') return Number.isInteger(v) ? v : NaN;
    const s = String(v ?? '').trim().toLowerCase().replace(/[,\s]/g, '');
    if (!s) return NaN;
    const m = s.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
    if (!m) return NaN;
    const n = Number(m[1]) * (m[2] === 'k' ? 1_000 : m[2] === 'm' ? 1_000_000 : 1);
    return Number.isFinite(n) ? Math.round(n) : NaN;
};

/**
 * → { ok, value, errors } where errors is { field: message } for inline display.
 * `value` holds only the cleaned fields we store.
 */
export const validateApplication = (input = {}, campaign = {}) => {
    const errors = {};
    const value = {};

    value.fullName = str(input.fullName, 80);
    if (value.fullName.length < 2) errors.fullName = 'Enter your full name.';

    value.email = normalizeEmail(input.email);
    if (!value.email) errors.email = 'Enter a valid email address.';

    value.phone = normalizePhone(input.phone);
    if (!value.phone) errors.phone = 'Enter a valid WhatsApp number, like 98765 43210 or +91 98765 43210.';

    value.instagramHandle = normalizeHandle(input.instagram ?? input.instagramHandle);
    if (!value.instagramHandle) errors.instagram = 'Enter your Instagram @handle or profile link.';

    const followers = parseFollowers(input.followerCount);
    if (!Number.isInteger(followers) || followers < 0 || followers > MAX_FOLLOWERS) {
        errors.followerCount = 'Enter your follower count as a number, like 12500.';
    } else {
        value.followerCount = followers;
    }

    value.collegeOrEmployer = str(input.collegeOrEmployer, 120);
    if (!value.collegeOrEmployer) errors.collegeOrEmployer = 'Enter your college or where you work.';

    const cities = campaignCities(campaign);
    const city = str(input.city, 80);
    value.city = cities.find(c => c.toLowerCase() === city.toLowerCase()) || '';
    if (!value.city) errors.city = cities.length ? 'Choose a city from the list.' : 'This campaign has no cities set yet.';

    value.category = str(input.category, 80);
    if (!CATEGORY_IDS.has(value.category)) errors.category = 'Choose the category that fits you best.';

    value.runsCityPages = bool(input.runsCityPages);
    value.cityPagesHandle = null;
    if (value.runsCityPages && str(input.cityPagesHandle, 200)) {
        value.cityPagesHandle = normalizeHandle(input.cityPagesHandle);
        if (!value.cityPagesHandle) errors.cityPagesHandle = 'Enter the page’s @handle or link.';
    }

    value.registeredNewbiCreator = bool(input.registeredNewbiCreator);
    value.referralSource = str(input.referralSource, 120) || null;

    if (!bool(input.consentWhatsApp)) errors.consentWhatsApp = 'Tick this so we can send you campaign updates on WhatsApp.';
    value.consentWhatsApp = true;

    value.firstName = firstNameOf(value.fullName);
    value.tier = tierFor(value.followerCount, campaign?.perksByTier);

    return { ok: Object.keys(errors).length === 0, value, errors };
};

/* ── Duplicates ───────────────────────────────────────────────────────── */

/**
 * Which existing application a new submission updates.
 *   byPhone / byHandle: the appId each key points at, or null.
 * The phone match wins. When phone and handle point at two different
 * applications, the other one is reported so an admin can look at both.
 */
export const resolveDuplicate = ({ byPhone, byHandle }) => {
    const targetId = byPhone || byHandle || null;
    const conflictWith = byPhone && byHandle && byPhone !== byHandle ? byHandle : null;
    return { targetId, conflictWith };
};

// Fields the applicant controls; a resubmission replaces all of them.
export const APPLICANT_FIELDS = [
    'fullName', 'firstName', 'email', 'phone', 'instagramHandle', 'followerCount', 'tier', 'collegeOrEmployer',
    'city', 'category', 'runsCityPages', 'cityPagesHandle', 'registeredNewbiCreator', 'referralSource', 'consentWhatsApp',
];

/**
 * The document for a submission. A new application starts at 'applied'. A
 * repeat keeps its status, links and first-submitted time and takes the
 * latest values for everything the applicant typed.
 */
export const mergeApplication = (existing, incoming, { now, consentText = CONSENT_TEXT } = {}) => {
    const at = now || new Date().toISOString();
    const fresh = Object.fromEntries(APPLICANT_FIELDS.map(k => [k, incoming[k] ?? null]));
    if (!existing) {
        return {
            ...fresh,
            status: 'applied',
            consentAt: at,
            consentText,
            submitCount: 1,
            firstSubmittedAt: at,
            lastSubmittedAt: at,
            updatedAt: at,
        };
    }
    return {
        ...existing,
        ...fresh,
        status: existing.status || 'applied',
        consentAt: at,
        consentText,
        submitCount: (Number(existing.submitCount) || 1) + 1,
        firstSubmittedAt: existing.firstSubmittedAt || at,
        lastSubmittedAt: at,
        updatedAt: at,
    };
};

/* ── Filters for the admin table ──────────────────────────────────────── */

export const filterApplications = (apps, f = {}) => {
    const min = f.minFollowers === '' || f.minFollowers == null ? null : Number(f.minFollowers);
    const max = f.maxFollowers === '' || f.maxFollowers == null ? null : Number(f.maxFollowers);
    const college = String(f.college || '').trim().toLowerCase();
    const q = String(f.q || '').trim().toLowerCase().replace(/^@/, '');
    return (apps || []).filter(a => {
        const n = Number(a.followerCount) || 0;
        if (min !== null && n < min) return false;
        if (max !== null && n > max) return false;
        if (f.category && f.category !== 'all' && a.category !== f.category) return false;
        if (f.city && f.city !== 'all' && a.city !== f.city) return false;
        if (f.registered === 'yes' && !a.registeredNewbiCreator) return false;
        if (f.registered === 'no' && a.registeredNewbiCreator) return false;
        if (f.status && f.status !== 'all' && a.status !== f.status) return false;
        if (college && !String(a.collegeOrEmployer || '').toLowerCase().includes(college)) return false;
        if (q && !`${a.fullName} ${a.instagramHandle}`.toLowerCase().includes(q)) return false;
        return true;
    });
};
