import { useMemo } from 'react';
import { creatorBadges } from '../../../lib/creator/achievements';
import { safeLocalStorage } from '../../../lib/storage';

/* The signed-in creator's badges, worked out from what the creator home already loads. */
export function useBadges({ creator, profile, mine, referrals }) {
    return useMemo(() => creatorBadges({ creator, profile, mine, referrals }), [creator, profile, mine, referrals]);
}

/*
 * Which badges this device has already celebrated, per creator. Kept on the
 * device only: at worst a creator sees an unlock again on a new phone.
 */
const seenKey = (uid) => `nb_badges_seen:${uid}`;

export const readSeen = (uid) => {
    try {
        const raw = safeLocalStorage.getItem(seenKey(uid));
        return raw ? new Set(JSON.parse(raw)) : null;
    } catch { return null; }
};

export const writeSeen = (uid, ids) => {
    try { safeLocalStorage.setItem(seenKey(uid), JSON.stringify(Array.from(ids))); } catch { /* storage off */ }
};
