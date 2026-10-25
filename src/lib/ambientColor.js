/*
 * The glow colour behind a card's or popup's picture (`ambientColor` on
 * campaigns, events, ticket sales, guestlists, gigs, giveaways and forms).
 *
 *   ''        Auto: sampled from the picture (the default)
 *   '#rrggbb' This colour, for when the sampled one is wrong
 *   'none'    No glow
 *
 * Shared by the app and the API (api/_lib), so it has no imports.
 */

export const AMBIENT_OFF = 'none';

/* A stored value as one of the three forms above; anything else is Auto. */
export const cleanAmbient = (value) => {
    const s = String(value ?? '').trim().toLowerCase();
    if (s === AMBIENT_OFF) return AMBIENT_OFF;
    if (/^#[0-9a-f]{6}$/.test(s)) return s;
    if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
    return '';
};

/* The first value that isn't Auto (for documents that borrow a picture from another). */
export const firstAmbient = (...values) => values.map(cleanAmbient).find(Boolean) || '';

/* '#rrggbb' as [h (0–360), s (0–1), l (0–1)]. */
export const hexToHsl = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
};

/* [h, s, l] as '#rrggbb'. */
export const hslToHex = ([h, s, l]) => {
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
