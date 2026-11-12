/*
 * Giveaway rules, shared by the server (api/_lib/community.js, which is the
 * only place a score is ever written), the public page (to explain what each
 * thing is worth) and the admin editor.
 *
 * A score is always worked out from what the entry holds, never bumped:
 *
 *   1 for entering
 *   + each completed task's points (a quiz counts only when answered right)
 *   + referralPoints for every friend who entered with your link
 *   + the bonus of every referral milestone you've reached
 *   + what you won on the wheel (one spin, plus one more every N friends)
 *   + dailyBonus.points for every day you checked in
 *
 * Everything new is off unless the giveaway turns it on, so giveaways made
 * before these rules score exactly as they always did.
 */

export const DEFAULT_REFERRAL_POINTS = 3;
export const MAX_CODE_TRIES = 5;
export const TASK_TYPES_WITH_INPUT = ['quiz', 'code'];

/* The bonus wheel when a giveaway doesn't set its own: the odds it has always had. */
export const DEFAULT_WHEEL = [
    { id: 'points_1', label: '+1 point', points: 1, weight: 40 },
    { id: 'points_2', label: '+2 points', points: 2, weight: 30 },
    { id: 'points_5', label: '+5 points', points: 5, weight: 30 },
];

const num = (v, min = 0, max = 1000) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
const text = (v, n = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, n));

export const pointsLabel = (p) => (p === 1 ? '+1 point' : `+${p} points`);

/** The wheel's segments: the giveaway's own (2 to 8 with a chance above 0) or the default. */
export const wheelOf = (g = {}) => {
    const own = (Array.isArray(g.wheel) ? g.wheel : [])
        .map((s, i) => ({ id: text(s.id, 40) || `seg_${i}`, label: text(s.label, 40), points: num(s.points, 0, 100), weight: num(s.weight, 0, 1000) }))
        .filter(s => s.weight > 0)
        .map(s => ({ ...s, label: s.label || pointsLabel(s.points) }));
    return own.length >= 2 && own.length <= 8 ? own.slice(0, 8) : DEFAULT_WHEEL;
};

/** Pick a segment with a random number in [0, 1). Returns { segment, index }. */
export const pickSegment = (wheel, unit) => {
    const total = wheel.reduce((s, w) => s + w.weight, 0);
    let r = unit * total;
    for (let i = 0; i < wheel.length; i += 1) {
        r -= wheel[i].weight;
        if (r < 0) return { segment: wheel[i], index: i };
    }
    return { segment: wheel[wheel.length - 1], index: wheel.length - 1 };
};

export const referralPointsOf = (g = {}) => (g.referralPoints === undefined || g.referralPoints === null || g.referralPoints === ''
    ? DEFAULT_REFERRAL_POINTS
    : num(g.referralPoints, 0, 100));

/** Referral milestones, smallest first: [{ at: 3, bonus: 5 }]. */
export const milestonesOf = (g = {}) => {
    const seen = new Set();
    return (Array.isArray(g.referralMilestones) ? g.referralMilestones : [])
        .map(m => ({ at: num(m.at, 0, 500), bonus: num(m.bonus, 0, 500) }))
        .filter(m => m.at > 0 && m.bonus > 0 && !seen.has(m.at) && seen.add(m.at))
        .sort((a, b) => a.at - b.at)
        .slice(0, 6);
};

export const dailyOf = (g = {}) => {
    const d = g.dailyBonus || {};
    const points = num(d.points, 0, 100);
    return { enabled: Boolean(d.enabled) && points > 0, points };
};

export const spinEveryOf = (g = {}) => num(g.bonusSpinEvery, 0, 50);

export const spinsUsed = (entry = {}) => (Array.isArray(entry.spins) ? entry.spins.length : (entry.hasSpunWheel ? 1 : 0));

export const spinsAllowed = (entry = {}, g = {}) => {
    if (g.showSpinWheel === false) return 0;
    const every = spinEveryOf(g);
    const extra = every > 0 ? Math.floor((Number(entry.referralCount) || 0) / every) : 0;
    return 1 + Math.min(extra, 10);
};

/** The days ("2026-11-12", India time) someone checked in, oldest first. */
export const checkinDays = (entry = {}) => Object.keys(entry.checkins || {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();

const prevDay = (day) => {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
};

/** Days in a row up to today (or yesterday, when today isn't claimed yet). */
export const streakOf = (entry = {}, today) => {
    const days = new Set(checkinDays(entry));
    let day = days.has(today) ? today : prevDay(today);
    let n = 0;
    while (days.has(day)) { n += 1; day = prevDay(day); }
    return n;
};

export const taskPoints = (t = {}) => num(t.entryScore ?? t.points, 0, 1000);

/** The one scoring rule. */
export const scoreFor = (entry = {}, g = {}) => {
    const tasks = Array.isArray(g.tasks) ? g.tasks : [];
    const done = entry.completedTasks || {};
    const fromTasks = tasks.reduce((n, t) => n + (done[t.id] ? taskPoints(t) : 0), 0);
    const referrals = Math.max(0, Number(entry.referralCount) || 0);
    const fromReferrals = referrals * referralPointsOf(g);
    const fromMilestones = milestonesOf(g).reduce((n, m) => n + (referrals >= m.at ? m.bonus : 0), 0);
    const fromSpins = Math.max(0, Number(entry.spinPoints) || 0);
    const daily = dailyOf(g);
    const fromDaily = daily.enabled ? checkinDays(entry).length * daily.points : 0;
    return 1 + fromTasks + fromReferrals + fromMilestones + fromSpins + fromDaily;
};

/** A task as the public sees it: never the quiz answer or the secret code. */
export const publicTask = (t = {}) => {
    const url = /^https?:\/\//.test(t.config?.url || '') ? t.config.url : null;
    const out = { id: t.id, type: t.type, label: text(t.label, 200), points: taskPoints(t), url };
    if (t.type === 'quiz') {
        out.question = text(t.config?.question, 300) || out.label;
        out.options = (Array.isArray(t.config?.options) ? t.config.options : []).map(o => text(o, 120)).filter(Boolean).slice(0, 6);
    }
    if (t.type === 'code') out.hint = text(t.config?.hint, 200) || null;
    return out;
};

/** "ab-12 C" → "AB12C": how secret codes are compared. */
export const normalizeCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40);

/** Chance (0–1) of winning at least one of `winners` points-weighted draws. */
export const winChance = (mine, totalPoints, winners = 1) => {
    if (!(mine > 0) || !(totalPoints > 0)) return 0;
    const p = Math.min(1, mine / totalPoints);
    return Math.min(0.99, 1 - (1 - p) ** Math.max(1, winners));
};
