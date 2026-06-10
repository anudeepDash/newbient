export const MILESTONE_BADGES = {
    official: {
        id: 'official',
        label: 'Official Creator',
        icon: '🛡️',
        bg: 'bg-neon-green/10 border-neon-green/30 text-neon-green',
        desc: 'Verified and approved creator profile'
    },
    featured: {
        id: 'featured',
        label: 'Featured Star',
        icon: '⭐',
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        desc: 'Featured creator by Newbi Entertainment'
    },
    // Referrals
    bronze_inviter: {
        id: 'bronze_inviter',
        label: 'Bronze Inviter',
        icon: '🥉',
        bg: 'bg-amber-700/10 border-amber-700/30 text-amber-600',
        desc: 'Referred 1+ creator'
    },
    silver_inviter: {
        id: 'silver_inviter',
        label: 'Silver Inviter',
        icon: '🥈',
        bg: 'bg-zinc-400/10 border-zinc-400/30 text-zinc-400',
        desc: 'Referred 5+ creators'
    },
    gold_inviter: {
        id: 'gold_inviter',
        label: 'Gold Inviter',
        icon: '🥇',
        bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
        desc: 'Referred 10+ creators'
    },
    diamond_inviter: {
        id: 'diamond_inviter',
        label: 'Diamond Inviter',
        icon: '💎',
        bg: 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue',
        desc: 'Referred 25+ creators'
    },
    // Campaigns
    rising_star: {
        id: 'rising_star',
        label: 'Rising Star',
        icon: '✨',
        bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        desc: 'Completed 1+ verified campaign'
    },
    superstar: {
        id: 'superstar',
        label: 'Superstar',
        icon: '⚡',
        bg: 'bg-neon-pink/10 border-neon-pink/30 text-neon-pink',
        desc: 'Completed 5+ verified campaigns'
    },
    megastar: {
        id: 'megastar',
        label: 'Megastar',
        icon: '🔥',
        bg: 'bg-red-500/10 border-red-500/30 text-red-500',
        desc: 'Completed 10+ verified campaigns'
    },
    // Followers
    club_10k: {
        id: 'club_10k',
        label: '10K Club',
        icon: '🚀',
        bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
        desc: 'Reached 10K+ followers'
    },
    club_50k: {
        id: 'club_50k',
        label: '50K Club',
        icon: '👑',
        bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
        desc: 'Reached 50K+ followers'
    },
    club_100k: {
        id: 'club_100k',
        label: '100K Club',
        icon: '🌌',
        bg: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
        desc: 'Reached 100K+ followers'
    },
    megalodon: {
        id: 'megalodon',
        label: 'Megalodon',
        icon: '🐋',
        bg: 'bg-white/10 border-white/30 text-white',
        desc: 'Reached 1M+ followers'
    }
};

/**
 * Counts how many verified campaign tasks a creator has completed.
 */
export const getVerifiedTasksCount = (creatorUid, campaigns) => {
    if (!creatorUid || !campaigns) return 0;
    return campaigns.filter(task => 
        (task.verifiedBy || []).includes(creatorUid) ||
        task.submissions?.[creatorUid]?.status === 'approved'
    ).length;
};

/**
 * Gets creators referred by a creator.
 */
export const getReferralsForCreator = (creator, allCreators) => {
    if (!creator || !allCreators) return [];
    return allCreators.filter(c => 
        c.referredBy === creator.uid || 
        (creator.creatorId && c.referredBy && c.referredBy.toUpperCase() === creator.creatorId.toUpperCase()) ||
        (creator.instagram && c.referredBy && c.referredBy.toLowerCase() === creator.instagram.toLowerCase())
    );
};

/**
 * Computes milestone badges dynamically for a creator.
 */
export const getEarnedBadges = (creator, allCreators, campaigns) => {
    if (!creator) return [];
    const badges = [];

    // Official Verification Badge
    if (creator.profileStatus === 'approved') {
        badges.push(MILESTONE_BADGES.official);
    }

    // Featured Badge
    if (creator.isFeatured) {
        badges.push(MILESTONE_BADGES.featured);
    }

    // Referral Inviter Badges
    const referrals = getReferralsForCreator(creator, allCreators);
    const refCount = referrals.length;

    if (refCount >= 25) {
        badges.push(MILESTONE_BADGES.diamond_inviter);
    } else if (refCount >= 10) {
        badges.push(MILESTONE_BADGES.gold_inviter);
    } else if (refCount >= 5) {
        badges.push(MILESTONE_BADGES.silver_inviter);
    } else if (refCount >= 1) {
        badges.push(MILESTONE_BADGES.bronze_inviter);
    }

    // Campaigns Completed Badges
    const completedTasksCount = getVerifiedTasksCount(creator.uid, campaigns);

    if (completedTasksCount >= 10) {
        badges.push(MILESTONE_BADGES.megastar);
    } else if (completedTasksCount >= 5) {
        badges.push(MILESTONE_BADGES.superstar);
    } else if (completedTasksCount >= 1) {
        badges.push(MILESTONE_BADGES.rising_star);
    }

    // Followers Milestones
    const followers = Math.max(Number(creator.instagramFollowers || 0), Number(creator.youtubeSubscribers || 0));
    if (followers >= 1000000) {
        badges.push(MILESTONE_BADGES.megalodon);
    } else if (followers >= 100000) {
        badges.push(MILESTONE_BADGES.club_100k);
    } else if (followers >= 50000) {
        badges.push(MILESTONE_BADGES.club_50k);
    } else if (followers >= 10000) {
        badges.push(MILESTONE_BADGES.club_10k);
    }

    return badges;
};
