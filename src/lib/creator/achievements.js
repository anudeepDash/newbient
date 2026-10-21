import { REFERRAL_TIERS } from './referralTiers';

/*
 * Creator badges: things a creator collects by doing things on Newbi.
 *
 * Every badge is worked out from data the creator page already has (their
 * creator doc, their campaigns with task progress, and the server's referral
 * counts), so nothing is written anywhere and an admin change (approval,
 * a voided referral) shows up on the next load. Badges carry no reward of
 * their own; referral tier rewards stay in referralTiers.js.
 *
 * Each badge has a family (its medal shape and colour), a tier (its metal:
 * bronze, silver, gold or legend) and a metric that returns how far along
 * the creator is, so locked badges can show progress. `secret` badges hide
 * their name and how to earn them until they're earned.
 *
 * `todo` names where a creator goes to work on a locked badge (the page
 * turns it into a button): 'details' (the creator details sheet), 'instagram'
 * (connect Instagram), 'openings', 'deliverables' or 'referrals'. `steps`
 * lists the parts of a badge that has several, each done or not.
 */

export const BADGE_FAMILIES = [
    { id: 'debut', label: 'Getting started', blurb: 'Your first steps as a Newbi creator.' },
    { id: 'campaigns', label: 'Campaigns', blurb: 'Apply, get picked, deliver.' },
    { id: 'community', label: 'Community', blurb: 'Bring creators you rate onto Newbi.' },
    { id: 'reach', label: 'Reach', blurb: 'Your Instagram audience, milestone by milestone.' },
    { id: 'special', label: 'Special', blurb: 'Rare ones. Some you won’t see coming.' },
];

export const BADGE_TIERS = {
    bronze: { id: 'bronze', label: 'Bronze', rank: 1 },
    silver: { id: 'silver', label: 'Silver', rank: 2 },
    gold: { id: 'gold', label: 'Gold', rank: 3 },
    legend: { id: 'legend', label: 'Legend', rank: 4 },
};

const count = (value, target) => ({ value: Math.max(0, Number(value) || 0), target });
const flag = (on) => count(on ? 1 : 0, 1);

const REFERRAL_BADGE = {
    scout: { tier: 'bronze', emblem: 'binoculars', flavor: 'You spotted talent before anyone else did.' },
    connector: { tier: 'silver', emblem: 'link', flavor: 'Three creators in. You’re a connector now.' },
    ambassador: { tier: 'gold', emblem: 'megaphone', flavor: 'People listen when you talk about Newbi.' },
    partner: { tier: 'legend', emblem: 'handshake', flavor: 'A real partner in growing the community.' },
};

const COLLECTOR_TARGET = 10;

export const BADGES = [
    // Getting started
    { id: 'day_one', family: 'debut', tier: 'bronze', emblem: 'rocket', name: 'Day One', how: 'Create your creator profile.', flavor: 'Every big creator had a day one. This is yours.', metric: () => flag(true) },
    { id: 'full_picture', family: 'debut', tier: 'bronze', emblem: 'id-card', name: 'Full Picture', how: 'Add your niche, city and rates to your profile.', flavor: 'Brands know exactly who they’re working with.', todo: 'details', steps: ({ creator, profile }) => profileSteps(creator, profile), metric: ({ creator, profile }) => count(profileSteps(creator, profile).filter(s => s.done).length, 3) },
    { id: 'verified', family: 'debut', tier: 'silver', emblem: 'badge-check', name: 'Verified', how: 'Get your creator profile approved.', flavor: 'Checked, approved and ready for campaigns.', todo: 'instagram', metric: ({ creator }) => flag(creator?.profileStatus === 'approved') },
    { id: 'plugged_in', family: 'debut', tier: 'silver', emblem: 'instagram', name: 'Plugged In', how: 'Connect your Instagram Professional account.', flavor: 'Your numbers come straight from Instagram.', todo: 'instagram', metric: ({ creator }) => flag(creator?.instagramVerifiedVia === 'oauth') },

    // Campaigns
    { id: 'first_pitch', family: 'campaigns', tier: 'bronze', emblem: 'send', name: 'First Pitch', how: 'Apply to your first campaign.', flavor: 'Shot taken. Plenty more where that came from.', todo: 'openings', metric: ({ mine }) => count(mine.length, 1) },
    { id: 'first_drop', family: 'campaigns', tier: 'bronze', emblem: 'clapperboard', name: 'First Drop', how: 'Get your first deliverable approved.', flavor: 'Your first post for a Newbi campaign is live.', todo: 'deliverables', metric: ({ mine }) => count(approvedTotal(mine), 1) },
    { id: 'picked', family: 'campaigns', tier: 'silver', emblem: 'heart-handshake', name: 'Picked', how: 'Get shortlisted for a campaign.', flavor: 'Out of everyone who applied, they picked you.', todo: 'openings', metric: ({ mine }) => count(shortlistedTotal(mine), 1) },
    { id: 'clean_sweep', family: 'campaigns', tier: 'silver', emblem: 'list-checks', name: 'Clean Sweep', how: 'Get every required deliverable in a campaign approved.', flavor: 'Brief done, start to finish. No loose ends.', todo: 'deliverables', metric: ({ mine }) => count(sweptTotal(mine), 1) },
    { id: 'content_machine', family: 'campaigns', tier: 'silver', emblem: 'film', name: 'Content Machine', how: 'Get 10 deliverables approved.', flavor: 'Ten approved posts. The feed is yours.', todo: 'deliverables', metric: ({ mine }) => count(approvedTotal(mine), 10) },
    { id: 'regular', family: 'campaigns', tier: 'gold', emblem: 'ticket', name: 'Regular', how: 'Get shortlisted for 5 campaigns.', flavor: 'Brands keep coming back to you.', todo: 'openings', metric: ({ mine }) => count(shortlistedTotal(mine), 5) },
    { id: 'tour_veteran', family: 'campaigns', tier: 'gold', emblem: 'route', name: 'Tour Veteran', how: 'Complete 5 campaigns, every required deliverable approved.', flavor: 'Five campaigns, five clean finishes.', todo: 'deliverables', metric: ({ mine }) => count(sweptTotal(mine), 5) },
    { id: 'headliner', family: 'campaigns', tier: 'legend', emblem: 'mic-vocal', name: 'Headliner', how: 'Get 25 deliverables approved.', flavor: 'Top of the bill. Twenty-five approved posts.', todo: 'deliverables', metric: ({ mine }) => count(approvedTotal(mine), 25) },

    // Community: the referral tiers, plus the leaderboard
    ...REFERRAL_TIERS.map(t => ({
        id: t.id,
        family: 'community',
        tier: REFERRAL_BADGE[t.id]?.tier || 'bronze',
        emblem: REFERRAL_BADGE[t.id]?.emblem || 'link',
        name: t.label,
        how: t.min === 1 ? 'Invite a creator who gets approved.' : `Invite ${t.min} creators who get approved.`,
        flavor: REFERRAL_BADGE[t.id]?.flavor || '',
        todo: 'referrals',
        metric: ({ referrals }) => count(referrals?.me?.approved, t.min),
    })),
    { id: 'podium', family: 'community', tier: 'gold', emblem: 'trophy', name: 'Podium', how: 'Finish in the top 3 of a referral leaderboard.', flavor: 'Top three. Everyone saw your name up there.', todo: 'referrals', metric: ({ referrals }) => flag(onPodium(referrals?.me)) },

    // Reach: Instagram followers
    { id: 'club_1k', family: 'reach', tier: 'bronze', emblem: 'sprout', name: '1K Club', how: 'Reach 1,000 Instagram followers.', flavor: 'A thousand people want to see what you post.', todo: 'instagram', metric: ({ creator }) => count(followersOf(creator), 1_000) },
    { id: 'club_10k', family: 'reach', tier: 'silver', emblem: 'flame', name: '10K Club', how: 'Reach 10,000 Instagram followers.', flavor: 'Ten thousand. That’s a full stadium.', todo: 'instagram', metric: ({ creator }) => count(followersOf(creator), 10_000) },
    { id: 'club_100k', family: 'reach', tier: 'gold', emblem: 'zap', name: '100K Club', how: 'Reach 100,000 Instagram followers.', flavor: 'Six figures of followers. Big-room energy.', todo: 'instagram', metric: ({ creator }) => count(followersOf(creator), 100_000) },
    { id: 'club_1m', family: 'reach', tier: 'legend', emblem: 'crown', name: 'Million Club', how: 'Reach 1,000,000 Instagram followers.', flavor: 'A million followers. Legend status.', todo: 'instagram', metric: ({ creator }) => count(followersOf(creator), 1_000_000) },

    // Special
    { id: 'collector', family: 'special', tier: 'gold', emblem: 'gem', name: 'Collector', how: `Collect ${COLLECTOR_TARGET} other badges.`, flavor: 'Ten badges deep. The shelf is filling up.', metric: ({ earnedOthers }) => count(earnedOthers, COLLECTOR_TARGET) },
    { id: 'spotlight', family: 'special', tier: 'legend', emblem: 'sparkles', name: 'Spotlight', how: 'Get featured by the Newbi team.', flavor: 'Handpicked by Newbi. The light’s on you.', secret: true, metric: ({ creator }) => flag(creator?.isFeatured || creator?.featured) },
];

const BY_ID = new Map(BADGES.map(b => [b.id, b]));
export const badgeById = (id) => BY_ID.get(id) || null;

/* ── Inputs ───────────────────────────────────────────────────────── */

const approvedTotal = (mine) => mine.reduce((n, m) => n + (m.progress?.approved || 0), 0);
const shortlistedTotal = (mine) => mine.filter(m => m.shortlisted).length;
const sweptTotal = (mine) => mine.filter(m => m.progress?.requiredDone).length;
const onPodium = (me) => [me?.rank, me?.monthRank].some(r => Number(r) >= 1 && Number(r) <= 3) && Number(me?.approved) > 0;

export const followersOf = (creator) => Number(creator?.instagramFollowers) || 0;

const filled = (v) => (Array.isArray(v) ? v.length > 0 : String(v ?? '').trim() !== '');
const profileSteps = (creator, profile) => [
    { id: 'niche', label: 'Your niche', done: filled(creator?.niches) || filled(creator?.specializations) || filled(creator?.categories) },
    { id: 'city', label: 'Your city', done: filled(profile?.city) || filled(creator?.city) },
    { id: 'rates', label: 'Your rates', done: filled(creator?.commercials) || filled(creator?.doBarter) },
];

/* ── Evaluation ───────────────────────────────────────────────────── */

const evaluate = (badge, input) => {
    const { value, target } = badge.metric(input);
    const earned = value >= target;
    const steps = badge.steps ? badge.steps(input) : null;
    return { ...badge, value: Math.min(value, target), target, earned, ratio: target ? Math.min(1, value / target) : 0, steps };
};

/*
 * Every badge with its state for one creator:
 *   { ...badge, earned, value, target, ratio, steps }
 * `mine` is useMyCampaigns' list ({ campaign, shortlisted, progress }),
 * `referrals` is the store's referrals (null until loaded).
 */
export function creatorBadges({ creator, profile = null, mine = [], referrals = null } = {}) {
    if (!creator) return [];
    const input = { creator, profile, mine: mine || [], referrals };
    const base = BADGES.filter(b => b.id !== 'collector').map(b => evaluate(b, input));
    const earnedOthers = base.filter(b => b.earned).length;
    const collector = evaluate(BY_ID.get('collector'), { ...input, earnedOthers });
    return BADGES.map(b => (b.id === 'collector' ? collector : base.find(x => x.id === b.id)));
}

/* Showcase order: rarest first, then catalogue order. */
export const byRarity = (a, b) => (BADGE_TIERS[b.tier].rank - BADGE_TIERS[a.tier].rank) || (BADGES.indexOf(badgeById(a.id)) - BADGES.indexOf(badgeById(b.id)));

/* The locked badge you're closest to (secret ones excluded), or null. */
export const nextBadge = (list) => list
    .filter(b => !b.earned && !b.secret && b.ratio > 0)
    .sort((a, b) => (b.ratio - a.ratio) || (BADGE_TIERS[a.tier].rank - BADGE_TIERS[b.tier].rank))[0]
    || list.find(b => !b.earned && !b.secret)
    || null;
