import { describe, it, expect } from 'vitest';
import { BADGES, creatorBadges, nextBadge, byRarity } from '../src/lib/creator/achievements.js';

const progress = (approved, requiredDone = false) => ({ approved, requiredDone });
const camp = (id, { shortlisted = false, approved = 0, requiredDone = false } = {}) => ({ campaign: { id }, shortlisted, progress: progress(approved, requiredDone) });
const earnedIds = (list) => list.filter(b => b.earned).map(b => b.id);

describe('creatorBadges', () => {
    it('gives nothing without a creator and Day One to any creator', () => {
        expect(creatorBadges({})).toEqual([]);
        const list = creatorBadges({ creator: { uid: 'a' } });
        expect(list).toHaveLength(BADGES.length);
        expect(earnedIds(list)).toEqual(['day_one']);
    });

    it('counts campaigns, shortlists, approvals and clean sweeps', () => {
        const mine = [
            camp('c1', { shortlisted: true, approved: 6, requiredDone: true }),
            camp('c2', { shortlisted: true, approved: 4 }),
            camp('c3'),
        ];
        const ids = earnedIds(creatorBadges({ creator: { uid: 'a' }, mine }));
        expect(ids).toEqual(expect.arrayContaining(['first_pitch', 'first_drop', 'picked', 'clean_sweep', 'content_machine']));
        expect(ids).not.toContain('regular');
        expect(ids).not.toContain('headliner');
        const regular = creatorBadges({ creator: { uid: 'a' }, mine }).find(b => b.id === 'regular');
        expect(regular).toMatchObject({ value: 2, target: 5, earned: false });
    });

    it('follows the referral tiers and the podium', () => {
        const at = (approved, extra = {}) => earnedIds(creatorBadges({ creator: { uid: 'a' }, referrals: { me: { approved, ...extra } } }));
        expect(at(0)).not.toContain('scout');
        expect(at(1)).toContain('scout');
        expect(at(3)).toEqual(expect.arrayContaining(['scout', 'connector']));
        expect(at(10)).toEqual(expect.arrayContaining(['ambassador', 'partner']));
        expect(at(2, { monthRank: 2 })).toContain('podium');
        expect(at(0, { rank: 1 })).not.toContain('podium');
    });

    it('reads profile completeness, verification and reach', () => {
        const creator = { uid: 'a', profileStatus: 'approved', instagramVerifiedVia: 'oauth', niches: ['music'], commercials: '2000', instagramFollowers: 12000 };
        const ids = earnedIds(creatorBadges({ creator, profile: { city: 'Pune' } }));
        expect(ids).toEqual(expect.arrayContaining(['verified', 'plugged_in', 'full_picture', 'club_1k', 'club_10k']));
        expect(ids).not.toContain('club_100k');
        expect(earnedIds(creatorBadges({ creator: { ...creator, city: '' } }))).not.toContain('full_picture');
    });

    it('lists Full Picture\'s missing parts and gives every non-secret badge but Collector a task', () => {
        const full = creatorBadges({ creator: { uid: 'a', commercials: '500' }, profile: { city: 'Pune' } }).find(b => b.id === 'full_picture');
        expect(full.todo).toBe('details');
        expect(full.steps.filter(s => !s.done).map(s => s.id)).toEqual(['niche']);
        expect(full).toMatchObject({ value: 2, target: 3, earned: false });
        const untasked = BADGES.filter(b => !b.todo && !b.secret).map(b => b.id);
        expect(untasked).toEqual(['day_one', 'collector']);
        expect(BADGES.find(b => b.id === 'plugged_in').todo).toBe('instagram');
    });

    it('keeps secret badges secret until earned and counts other badges for Collector', () => {
        const plain = creatorBadges({ creator: { uid: 'a' } });
        expect(plain.find(b => b.id === 'spotlight')).toMatchObject({ secret: true, earned: false });
        expect(nextBadge(plain)?.secret).toBeFalsy();
        const big = creatorBadges({
            creator: { uid: 'a', isFeatured: true, profileStatus: 'approved', instagramVerifiedVia: 'oauth', instagramFollowers: 150000 },
            mine: [camp('c1', { shortlisted: true, approved: 12, requiredDone: true })],
            referrals: { me: { approved: 3 } },
        });
        const collector = big.find(b => b.id === 'collector');
        expect(collector.earned).toBe(true);
        expect(big.filter(b => b.earned).sort(byRarity)[0].tier).toBe('legend');
    });
});
