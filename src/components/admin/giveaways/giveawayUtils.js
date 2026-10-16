import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { giveawayEndsAt } from '../../../lib/store';

/*
 * Giveaway helpers: state, duplicate detection and a fair draw.
 *
 * The draw uses the browser's cryptographic random numbers. In "points" mode
 * every point is one ticket in the hat (that's what the public page promises:
 * tasks and referrals raise your chances); in "equal" mode everyone has one.
 * Winners are drawn without replacement, so nobody can be drawn twice.
 */

export { giveawayEndsAt };

/** open | ended (past its end but not closed yet) | closed */
export const giveawayState = (g, now = new Date()) => {
    if (String(g?.status || '').toLowerCase() === 'closed') return 'closed';
    const end = giveawayEndsAt(g);
    if (end && end < now) return 'ended';
    return 'open';
};

export const GIVEAWAY_STATE = {
    open: { label: 'Open', tone: 'green' },
    ended: { label: 'Ended, still open', tone: 'amber' },
    closed: { label: 'Closed', tone: 'gray' },
};

export const entryPoints = (e) => Math.max(0, Number(e?.entryScore) || 0);

/** Live entries for one giveaway (own listener, so the page knows when it's loaded). */
export const subscribeToEntries = (campaignId, onData, onError) => {
    if (!campaignId) return () => {};
    return onSnapshot(
        query(collection(db, 'giveaway_entries'), where('campaignId', '==', campaignId)),
        (snap) => onData(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
        onError
    );
};

const phoneKey = (p) => {
    const d = String(p || '').replace(/\D/g, '');
    return d.length >= 10 ? d.slice(-10) : '';
};

/**
 * Entries that share a phone number or email with an earlier entry (the same
 * person on two accounts). Returns Map<entryId, firstEntryOfThatPerson>.
 */
export const findDuplicates = (entries) => {
    const sorted = [...entries].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    const firstBy = new Map();
    const dupes = new Map();
    sorted.forEach(e => {
        const keys = [phoneKey(e.phone) && `p:${phoneKey(e.phone)}`, e.email && `e:${String(e.email).trim().toLowerCase()}`].filter(Boolean);
        const seen = keys.map(k => firstBy.get(k)).find(Boolean);
        if (seen && seen.id !== e.id) dupes.set(e.id, seen);
        keys.forEach(k => { if (!firstBy.has(k)) firstBy.set(k, seen || e); });
    });
    return dupes;
};

const randomUnit = () => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const buf = new Uint32Array(2);
        crypto.getRandomValues(buf);
        // 53 random bits → [0, 1)
        return ((buf[0] >>> 5) * 67108864 + (buf[1] >>> 6)) / 9007199254740992;
    }
    return Math.random();
};

/** Who can be drawn, and why the rest can't. */
export const buildPool = (entries, { minPoints = 0, onePerPerson = true } = {}) => {
    const dupes = onePerPerson ? findDuplicates(entries) : new Map();
    const pool = [];
    const left = { winners: 0, disqualified: 0, duplicates: 0, lowPoints: 0 };
    entries.forEach(e => {
        if (e.isWinner) left.winners += 1;
        else if (e.disqualified) left.disqualified += 1;
        else if (dupes.has(e.id)) left.duplicates += 1;
        else if (entryPoints(e) < minPoints) left.lowPoints += 1;
        else pool.push(e);
    });
    return { pool, left };
};

const weightOf = (e, mode) => (mode === 'equal' ? 1 : Math.max(1, entryPoints(e)));

/** Each entry's chance (0–1) of being picked in a single draw. */
export const chanceOf = (entry, pool, mode) => {
    const total = pool.reduce((s, e) => s + weightOf(e, mode), 0);
    return total ? weightOf(entry, mode) / total : 0;
};

/** Draw `count` different entries, skipping any ids in `exclude`. */
export const drawFrom = (pool, count, mode = 'points', exclude = new Set()) => {
    const remaining = pool.filter(e => !exclude.has(e.id));
    const picked = [];
    while (picked.length < count && remaining.length) {
        const total = remaining.reduce((s, e) => s + weightOf(e, mode), 0);
        let r = randomUnit() * total;
        let index = remaining.length - 1;
        for (let i = 0; i < remaining.length; i += 1) {
            r -= weightOf(remaining[i], mode);
            if (r < 0) { index = i; break; }
        }
        picked.push(remaining[index]);
        remaining.splice(index, 1);
    }
    return picked;
};

export const TASK_PRESETS = [
    { type: 'instagram', label: 'Follow on Instagram', short: 'Follow IG', tone: 'pink' },
    { type: 'instagram_like_comment', label: 'Like and comment on our post', short: 'Like + comment', tone: 'fuchsia' },
    { type: 'youtube', label: 'Subscribe on YouTube', short: 'YouTube', tone: 'red' },
    { type: 'telegram', label: 'Join our Telegram channel', short: 'Telegram', tone: 'blue' },
    { type: 'twitter', label: 'Follow on X', short: 'X', tone: 'gray' },
    { type: 'discord', label: 'Join our Discord server', short: 'Discord', tone: 'indigo' },
    { type: 'spotify', label: 'Follow on Spotify', short: 'Spotify', tone: 'green' },
    { type: 'snapchat', label: 'Add us on Snapchat', short: 'Snapchat', tone: 'amber' },
    { type: 'website', label: 'Visit our website', short: 'Website', tone: 'cyan' },
    { type: 'custom', label: 'New task', short: 'Custom', tone: 'violet' },
];
export const TASK_PRESET_MAP = Object.fromEntries(TASK_PRESETS.map(t => [t.type, t]));
