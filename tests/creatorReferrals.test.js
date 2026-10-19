import { describe, it, expect } from 'vitest';
import { buildCreatorReferrals } from '../api/_lib/referrals.js';
import { tierProgress, monthStartIST, referralCounts } from '../src/lib/creator/referralTiers.js';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const c = (uid, extra = {}) => ({ id: uid, uid, name: uid.toUpperCase(), profileStatus: 'approved', createdAt: '2026-09-01T00:00:00Z', ...extra });

const world = [
    c('alice', { creatorId: 'ALICE01' }),
    c('bob'),
    c('rejected-ref', { profileStatus: 'rejected' }),
    // Alice's referrals: 2 approved (1 this month), 1 pending, 1 voided, 1 rejected.
    c('a1', { referredBy: 'alice01' }),
    c('a2', { referredBy: 'alice', createdAt: '2026-10-05T00:00:00Z' }),
    c('a3', { referredBy: 'alice', profileStatus: 'pending' }),
    c('a4', { referredBy: 'alice', referralVoid: true }),
    c('a5', { referredBy: 'alice', profileStatus: 'rejected' }),
    // Bob: 1 approved this month.
    c('b1', { referredBy: 'bob', createdAt: '2026-10-10T00:00:00Z' }),
    // A rejected referrer brings someone in: never ranked.
    c('r1', { referredBy: 'rejected-ref' }),
    // Self-referral is ignored.
    c('self', { referredBy: 'self' }),
];

describe('creator referrals', () => {
    it('counts only approved, non-voided referrals and ranks approved referrers', () => {
        const out = buildCreatorReferrals(world, 'alice', NOW);
        expect(out.me).toMatchObject({ approved: 2, pending: 1, month: 1, rank: 1, tier: 'scout' });
        expect(out.referrals.map(r => r.uid)).toEqual(expect.arrayContaining(['a1', 'a2', 'a3', 'a4', 'a5']));
        expect(out.referrals.find(r => r.uid === 'a4')).toMatchObject({ counts: false, voided: true });
        expect(out.leaderboard.map(r => [r.uid, r.score, r.rank])).toEqual([['alice', 2, 1], ['bob', 1, 2]]);
        expect(out.leaderboard.some(r => r.uid === 'rejected-ref' || r.uid === 'self')).toBe(false);
        // This month both have 1: shared rank, Alice first on all-time approved.
        expect(out.monthLeaderboard.map(r => [r.uid, r.rank])).toEqual([['alice', 1], ['bob', 1]]);
        expect(out.referrals[0]).not.toHaveProperty('email');
    });

    it('returns an empty answer for someone without a creator profile', () => {
        expect(buildCreatorReferrals(world, 'stranger', NOW)).toMatchObject({ referrals: [], leaderboard: [], myRank: 0 });
    });

    it('works out tier progress', () => {
        expect(tierProgress(0)).toMatchObject({ tier: null, toNext: 1 });
        expect(tierProgress(4)).toMatchObject({ tier: { id: 'connector' }, next: { id: 'ambassador' }, toNext: 1, ratio: 0.5 });
        expect(tierProgress(12)).toMatchObject({ tier: { id: 'partner' }, next: null, ratio: 1 });
        expect(referralCounts({ profileStatus: 'approved', referralVoid: true })).toBe(false);
    });

    it('starts the month at midnight in India', () => {
        expect(new Date(monthStartIST(NOW)).toISOString()).toBe('2026-09-30T18:30:00.000Z');
    });
});
