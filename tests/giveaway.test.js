import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../api/_lib/mailing.js', () => ({
    normalizeEmail: (e) => String(e || '').trim().toLowerCase(),
    staffRoleOf: vi.fn(async () => ''),
}));
vi.mock('../api/_lib/notify.js', () => ({ notify: vi.fn(async () => ({})) }));

import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests, istDate } from '../api/_lib/db.js';
import { _internal, boardName, giveawayBoard } from '../api/_lib/community.js';
import { scoreFor, wheelOf, pickSegment, spinsAllowed, streakOf, winChance, DEFAULT_WHEEL } from '../src/lib/giveawayRules.js';

const act = (name, body, caller) => _internal.actions[name](db, body, caller);
const asha = { uid: 'uAsha0001', email: 'asha@example.com', token: { email: 'asha@example.com' } };
const ravi = { uid: 'uRavi0002', email: 'ravi@example.com', token: { email: 'ravi@example.com' } };

/* The live giveaway as it was made: three tasks, the default wheel, nothing else. */
const LEGACY = {
    name: 'Shreya Ghoshal Bengaluru Giveaway', slug: 'sg', status: 'Open', endDate: '2099-01-01', showSpinWheel: true,
    tasks: [
        { id: 't1', type: 'instagram', label: 'Follow', entryScore: 5, config: { url: 'https://instagram.com/newbi.live' } },
        { id: 't2', type: 'instagram_like_comment', label: 'Like', entryScore: 1, config: { url: '' } },
    ],
};

const BOOSTED = {
    ...LEGACY,
    slug: 'boosted',
    referralPoints: 4,
    referralMilestones: [{ at: 2, bonus: 10 }, { at: 1, bonus: 0 }],
    bonusSpinEvery: 1,
    dailyBonus: { enabled: true, points: 2 },
    tasks: [
        ...LEGACY.tasks,
        { id: 'q1', type: 'quiz', label: 'Quiz', entryScore: 3, config: { question: 'Who?', options: ['A', 'B', 'C'], answer: 1 } },
        { id: 'c1', type: 'code', label: 'Code', entryScore: 7, config: { code: 'SHREYA-26', hint: 'In our story' } },
    ],
};

let db;
beforeEach(() => {
    db = new FakeFirestore({
        'giveaways/legacy': LEGACY,
        'giveaways/boost': BOOSTED,
        'users/uAsha0001': { name: 'Asha Rao', city: 'Bengaluru', email: 'asha@example.com' },
        'users/uRavi0002': { name: 'Ravi', city: 'Pune', email: 'ravi@example.com' },
        // An entry made before these rules: spun once, followed once.
        'giveaway_entries/legacy_old': { campaignId: 'legacy', userId: 'old', name: 'Old Timer', referralCount: 0, completedTasks: { t1: 'x' }, hasSpunWheel: true, spinPoints: 1, spinReward: '+1 point', entryScore: 7 },
    });
    setDbForTests(db);
});
afterEach(() => setDbForTests(null));

describe('scoring', () => {
    it('scores a giveaway made before the new rules exactly as before', () => {
        expect(scoreFor({ completedTasks: { t1: 'x' }, spinPoints: 1, referralCount: 2 }, LEGACY)).toBe(1 + 5 + 1 + 2 * 3);
    });

    it('adds referral points, reached milestones and daily check-ins when they are on', () => {
        const entry = { referralCount: 2, checkins: { '2030-01-01': 'x', '2030-01-02': 'x' } };
        expect(scoreFor(entry, BOOSTED)).toBe(1 + 2 * 4 + 10 + 2 * 2);
    });

    it('gives one spin, plus one per N friends when set', () => {
        expect(spinsAllowed({ referralCount: 5 }, LEGACY)).toBe(1);
        expect(spinsAllowed({ referralCount: 3 }, BOOSTED)).toBe(4);
        expect(spinsAllowed({}, { showSpinWheel: false })).toBe(0);
    });

    it('falls back to the default wheel and picks by weight', () => {
        expect(wheelOf({ wheel: [{ label: 'x', points: 1, weight: 1 }] })).toBe(DEFAULT_WHEEL);
        const wheel = wheelOf({ wheel: [{ points: 1, weight: 1 }, { points: 9, weight: 3 }] });
        expect(pickSegment(wheel, 0.1).segment.points).toBe(1);
        expect(pickSegment(wheel, 0.5).index).toBe(1);
    });

    it('counts a streak up to today or yesterday', () => {
        const e = { checkins: { '2030-01-01': 1, '2030-01-02': 1, '2030-01-03': 1 } };
        expect(streakOf(e, '2030-01-03')).toBe(3);
        expect(streakOf(e, '2030-01-04')).toBe(3);
        expect(streakOf(e, '2030-01-05')).toBe(0);
    });

    it('works out the odds', () => {
        expect(winChance(10, 100, 1)).toBeCloseTo(0.1);
        expect(winChance(10, 100, 2)).toBeCloseTo(0.19);
        expect(winChance(0, 100)).toBe(0);
    });
});

describe('public view', () => {
    it('never sends the quiz answer or the secret code', async () => {
        const { giveaway } = await act('giveaway', { slug: 'boosted' }, { uid: null });
        const json = JSON.stringify(giveaway);
        expect(json).not.toContain('SHREYA');
        expect(json).not.toContain('"answer"');
        expect(giveaway.tasks.find(t => t.id === 'q1').options).toEqual(['A', 'B', 'C']);
        expect(giveaway.tasks.find(t => t.id === 'c1').hint).toBe('In our story');
        expect(giveaway.referralMilestones).toEqual([{ at: 2, bonus: 10 }]);
    });

    it('shows an older entry its one used spin', async () => {
        const { giveaway } = await act('giveaway', { slug: 'sg' }, { uid: 'old' });
        expect(giveaway.me).toMatchObject({ spinsUsed: 1, spinsAllowed: 1, entryScore: 7, rank: 1 });
    });
});

describe('playing', () => {
    const enter = async (caller, slugId = 'boost', extra = {}) => act('giveaway-enter', { giveawayId: slugId, ...extra }, caller);

    it('scores a right quiz answer once and refuses a second go', async () => {
        await enter(asha);
        const res = await act('giveaway-task', { giveawayId: 'boost', taskId: 'q1', choice: 1 }, asha);
        expect(res.correct).toBe(true);
        expect(res.entry.entryScore).toBe(1 + 3);
        await expect(act('giveaway-task', { giveawayId: 'boost', taskId: 'q1', choice: 0 }, asha)).resolves.toMatchObject({ entry: { entryScore: 4 } });
    });

    it('gives nothing for a wrong quiz answer and locks it', async () => {
        await enter(asha);
        const res = await act('giveaway-task', { giveawayId: 'boost', taskId: 'q1', choice: 0 }, asha);
        expect(res.correct).toBe(false);
        expect(res.entry.entryScore).toBe(1);
        await expect(act('giveaway-task', { giveawayId: 'boost', taskId: 'q1', choice: 1 }, asha)).rejects.toMatchObject({ code: 'DUPLICATE' });
    });

    it('checks secret codes loosely and stops after five tries', async () => {
        await enter(asha);
        for (let i = 0; i < 4; i += 1) {
            const r = await act('giveaway-task', { giveawayId: 'boost', taskId: 'c1', code: 'nope' }, asha);
            expect(r.correct).toBe(false);
        }
        const ok = await act('giveaway-task', { giveawayId: 'boost', taskId: 'c1', code: 'shreya 26' }, asha);
        expect(ok.correct).toBe(true);
        expect(ok.entry.entryScore).toBe(1 + 7);
    });

    it('locks a code after five wrong tries', async () => {
        await enter(asha);
        for (let i = 0; i < 5; i += 1) await act('giveaway-task', { giveawayId: 'boost', taskId: 'c1', code: 'nope' }, asha);
        await expect(act('giveaway-task', { giveawayId: 'boost', taskId: 'c1', code: 'SHREYA26' }, asha)).rejects.toMatchObject({ code: 'LOCKED' });
    });

    it('takes one daily check-in a day', async () => {
        await enter(asha);
        const res = await act('giveaway-checkin', { giveawayId: 'boost' }, asha);
        expect(res.entry.checkins).toEqual([istDate()]);
        expect(res.entry.entryScore).toBe(1 + 2);
        expect(res.entry.streak).toBe(1);
        await expect(act('giveaway-checkin', { giveawayId: 'boost' }, asha)).rejects.toMatchObject({ code: 'DUPLICATE' });
        await expect(act('giveaway-checkin', { giveawayId: 'legacy' }, asha)).rejects.toMatchObject({ code: 'VALIDATION' });
    });

    it('earns extra spins and milestone bonuses from referrals', async () => {
        const first = await enter(asha);
        await enter(ravi, 'boost', { referredBy: first.entry.referralCode });
        const s1 = await act('giveaway-spin', { giveawayId: 'boost' }, asha);
        expect(s1.entry.spinsAllowed).toBe(2);
        const s2 = await act('giveaway-spin', { giveawayId: 'boost' }, asha);
        expect(s2.entry.spinsUsed).toBe(2);
        await expect(act('giveaway-spin', { giveawayId: 'boost' }, asha)).rejects.toMatchObject({ code: 'DUPLICATE' });
        const spun = s2.entry.spins.reduce((n, s) => n + s.points, 0);
        expect(s2.entry.entryScore).toBe(1 + 4 + spun); // one friend: 4 points, milestone at 2 not yet reached
    });

    it('keeps an older single spin when counting spins', () => {
        const legacy = { ...BOOSTED, id: 'boost' };
        expect(spinsAllowed({ hasSpunWheel: true, referralCount: 0 }, legacy)).toBe(1);
    });
});

describe('board', () => {
    it('shows first names with an initial and the totals', async () => {
        await act('giveaway-enter', { giveawayId: 'legacy' }, asha);
        const board = await giveawayBoard(db, 'legacy');
        expect(board.totalEntries).toBe(2);
        expect(board.leaderboard.map(r => r.name)).toEqual(['Old T.', 'Asha R.']);
        expect(board.totalPoints).toBe(8);
        expect(JSON.stringify(board)).not.toContain('asha@example.com');
    });

    it('names', () => {
        expect(boardName('  ')).toBe('Participant');
        expect(boardName('Ravi')).toBe('Ravi');
        expect(boardName('Asha  Kumari rao')).toBe('Asha R.');
    });
});
