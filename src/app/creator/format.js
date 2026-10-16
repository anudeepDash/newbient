/* Small display helpers for the creator module. Empty values come back as null. */

export const compactCount = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return null;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`;
    return String(Math.round(v));
};

export const handleOf = (value) => {
    const h = String(value || '').trim().replace(/^@+/, '');
    return h || null;
};

export const CREATOR_STATUS = {
    approved: { label: 'Approved', tone: 'green' },
    pending: { label: 'In review', tone: 'amber' },
    pending_verification: { label: 'Checking Instagram', tone: 'amber' },
    rejected: { label: 'Not approved', tone: 'red' },
    suspended: { label: 'Paused', tone: 'red' },
};

export const TONES = {
    green: 'text-emerald-700 bg-emerald-500/10 dark:text-neon-green dark:bg-neon-green/10',
    amber: 'text-amber-700 bg-amber-500/10 dark:text-amber-300 dark:bg-amber-400/10',
    red: 'text-red-700 bg-red-500/10 dark:text-red-400 dark:bg-red-500/10',
    blue: 'text-sky-700 bg-sky-500/10 dark:text-sky-300 dark:bg-sky-400/10',
    gray: 'text-gray-600 bg-black/[0.05] dark:text-zinc-300 dark:bg-white/[0.07]',
};

export const creatorPhoto = (c, profile) => c?.profilePicture || c?.instagramProfilePic || c?.photoURL || profile?.photoURL || null;

export const creatorPassId = (c) => {
    const id = c?.creatorId || (c?.uid ? String(c.uid).slice(0, 8) : null);
    return id ? String(id).toUpperCase() : null;
};

/* Day label for a deadline: "Due 12 Oct", or null. */
export const dueLabel = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return `Due ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
};
