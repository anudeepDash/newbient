/*
 * Clean-up rules for what people type into the campaign application form.
 * Shared by the public form, the server (api/_lib/outreach.js) and the tests,
 * so the browser and the server always agree on what a handle or phone is.
 */

/* ── Instagram handles ────────────────────────────────────────────────── */

// Instagram paths that are not profiles. For stories the handle is the next segment.
const NOT_PROFILE = new Set(['p', 'reel', 'reels', 'tv', 'explore', 'accounts', 'direct', 'about', 'legal', 'developer']);

const isValidHandle = (h) => /^[a-z0-9._]{1,30}$/.test(h) && !h.startsWith('.') && !h.endsWith('.') && !h.includes('..');

/**
 * "@Riya.Sharma", "instagram.com/riya.sharma/?hl=en", "https://www.instagram.com/stories/riya.sharma/123"
 * → "riya.sharma". Returns null when it isn't a profile handle (a post link, spaces, bad characters).
 */
export const normalizeHandle = (input) => {
    let s = String(input ?? '').trim();
    if (!s) return null;
    const url = s.match(/^(?:https?:\/\/)?(?:[a-z]+\.)?(?:instagram\.com|instagr\.am)(\/[^\s]*)?$/i);
    if (url) {
        const parts = (url[1] || '').split(/[?#]/)[0].split('/').filter(Boolean);
        if (!parts.length) return null;
        if (parts[0].toLowerCase() === 'stories') s = parts[1] || '';
        else if (NOT_PROFILE.has(parts[0].toLowerCase())) return null;
        else s = parts[0];
    }
    s = s.replace(/^@+/, '').trim().toLowerCase();
    return isValidHandle(s) ? s : null;
};

/* ── Phone numbers ────────────────────────────────────────────────────── */

/**
 * E.164 ("+919876543210"). Numbers without a country code are taken as Indian.
 * Indian numbers must be 10 digits starting 6–9; other countries 8–15 digits in all.
 * Returns null when it can't be a real mobile number.
 */
export const normalizePhone = (input, defaultCountry = '91') => {
    const raw = String(input ?? '').trim();
    if (!raw || /[a-z]/i.test(raw)) return null;
    if (/[^\d\s+().-]/.test(raw)) return null;
    let digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (raw.startsWith('+')) {
        // already international
    } else if (digits.startsWith('00')) {
        digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
        digits = `${defaultCountry}${digits.slice(1)}`;
    } else if (digits.length === 10) {
        digits = `${defaultCountry}${digits}`;
    } else if (!(digits.length === 12 && digits.startsWith('91'))) {
        return null;
    }
    if (digits.startsWith('91')) {
        return /^91[6-9]\d{9}$/.test(digits) ? `+${digits}` : null;
    }
    if (digits.length < 8 || digits.length > 15 || digits.startsWith('0')) return null;
    return `+${digits}`;
};

/** "+919876543210" → "+91******3210". For logs and anywhere a full number shouldn't show. */
export const maskPhone = (phone) => {
    const s = String(phone || '');
    if (s.length <= 4) return s ? '****' : '';
    const cc = s.startsWith('+91') ? '+91' : s.startsWith('+') ? '+' : '';
    return `${cc}${'*'.repeat(Math.max(0, s.length - cc.length - 4))}${s.slice(-4)}`;
};

/** wa.me wants the number without the plus. */
export const waDigits = (phone) => String(phone || '').replace(/\D/g, '');

/* ── Names and emails ─────────────────────────────────────────────────── */

export const normalizeEmail = (input) => {
    const s = String(input ?? '').trim().toLowerCase();
    if (!s || s.length > 254) return null;
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(s) ? s : null;
};

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'shri', 'smt', 'sri']);

/**
 * The first name to greet someone by, or '' when it isn't clear enough to use
 * ("R", "rj_riya", "Riya123", an emoji, a handle). '' makes the message say "Hey!".
 */
export const firstNameOf = (fullName) => {
    const raw = String(fullName ?? '').normalize('NFC').trim();
    if (!raw || /[@_\d]/.test(raw) || /https?:/i.test(raw)) return '';
    const words = raw.split(/\s+/).filter(Boolean);
    let word = words[0] || '';
    if (HONORIFICS.has(word.toLowerCase().replace(/\.$/, '')) && words[1]) word = words[1];
    word = word.replace(/[.,!]+$/, '');
    // Letters only (any script), with hyphens or apostrophes inside: "Anne-Marie", "D'Souza".
    if (!/^[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*$/u.test(word)) return '';
    if ([...word.replace(/\p{M}/gu, '')].length < 2) return '';
    // ALL CAPS or all lower → "Riya"; mixed case ("McKenzie") is kept as typed.
    const lower = word.toLocaleLowerCase('en-IN');
    const isMixed = word !== lower && word !== word.toLocaleUpperCase('en-IN');
    return isMixed ? word : lower.charAt(0).toLocaleUpperCase('en-IN') + lower.slice(1);
};

/* ── Slugs ────────────────────────────────────────────────────────────── */

export const slugify = (input) => String(input ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

export const isValidSlug = (slug) => /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(String(slug || ''));
