/*
 * "Is there anything worth showing?" for every field the app renders.
 *
 * The rule across the app is that an empty field is not shown at all, rather
 * than shown as "—", "0+", "N/A", "@" or "Universal". Values that only stand in
 * for "unset" count as empty.
 */

const PLACEHOLDERS = new Set([
    '—', '–', '-', '--', '...', '…', '@', '#', '0+',
    'tbd', 'tba', 'n/a', 'na', 'none', 'null', 'undefined', 'nan', 'universal', 'unknown',
]);

const isPlainObject = (v) => Object.prototype.toString.call(v) === '[object Object]';

/*
 * isPresent(value, { allowZero })
 *  - '', whitespace and placeholder strings ('—', 'TBD', 'N/A', '@'…) → false
 *  - null, undefined, NaN, Invalid Date → false
 *  - 0 → false unless allowZero (a count of zero usually means "not set" here)
 *  - [] and {} → false; arrays count only their present items
 *  - false → false
 */
export function isPresent(value, { allowZero = false } = {}) {
    if (value === null || value === undefined || value === false) return false;
    if (typeof value === 'number') {
        if (Number.isNaN(value)) return false;
        return allowZero || value !== 0;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return false;
        return !PLACEHOLDERS.has(trimmed.toLowerCase());
    }
    if (value instanceof Date) return !Number.isNaN(value.getTime());
    if (Array.isArray(value)) return value.some(item => isPresent(item, { allowZero }));
    if (isPlainObject(value)) return Object.values(value).some(item => isPresent(item, { allowZero }));
    return true;
}

/* The value if it's present, otherwise undefined (handy for `a ?? b` chains). */
export const presentOr = (value, fallback, options) => (isPresent(value, options) ? value : fallback);

/* First present value from a list of candidates. */
export const firstPresent = (...values) => values.find(v => isPresent(v));

/* Drops empty items from a list of { value } entries (chips, stats, fields). */
export const presentItems = (items = [], key = 'value', options) =>
    (items || []).filter(item => item && isPresent(typeof item === 'object' ? item[key] : item, { ...options, allowZero: item?.allowZero ?? options?.allowZero }));

export default isPresent;
