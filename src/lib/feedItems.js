/*
 * Pure rules for what the app lists: when a community item is open, its
 * dates, and whether a campaign still takes applications. Shared by the app
 * (src/lib/store/community.js, creator.js) and the cached server feed
 * (api/_lib/publicFeed.js), so both decide the same way. No Firebase here.
 */

export const CLOSED = /^(closed|archived|ended|expired|inactive|draft|hidden|completed|cancel+ed|past)$/i;

/* The first date on an item, as a Date, or null. Accepts 'YYYY-MM-DD', ISO strings, Timestamps and arrays. */
export const itemDate = (item = {}) => {
    const raw = item.date ?? (Array.isArray(item.dates) ? item.dates[0]?.date ?? item.dates[0] : null) ?? item.eventDate ?? item.startDate ?? item.endsAt ?? null;
    if (!raw) return null;
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00`);
    const value = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw);
    return Number.isNaN(value.getTime()) ? null : value;
};

/* When an item stops being listed: a form's or giveaway's closing date, else the event day. */
export const closingDate = (item = {}) => {
    const raw = item.endDate ?? item.closesAt ?? item.deadline ?? null;
    if (raw) {
        const d = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? `${raw}T00:00:00` : raw);
        if (!Number.isNaN(d.getTime())) return d;
    }
    return itemDate(item);
};

export const isOpen = (item) => !CLOSED.test(String(item.status || '').trim()) && !CLOSED.test(String(item.activeLabel || '').trim()) && item.isActive !== false && item.hidden !== true;

/* Campaigns still taking applications: status Open (or unset) and not out of spots. 'Live' means the event is on and applications are closed. */
export const isCampaignOpen = (c = {}) => {
    const status = String(c.status || 'open').trim().toLowerCase();
    if (!['open', 'active', 'published'].includes(status)) return false;
    const left = c.spotsLeft;
    return !(left !== null && left !== undefined && left !== '' && Number(left) <= 0);
};
