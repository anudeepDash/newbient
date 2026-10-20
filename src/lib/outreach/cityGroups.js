import { normalizeCity, DEFAULT_CREATOR_GROUPS } from '../constants.js';

/*
 * The Newbi city creator community (WhatsApp group) for an applicant's city,
 * from creator_groups (the admin's Groups page), falling back to the built-in
 * defaults. Creators join through the invite link themselves; nobody is
 * messaged one by one.
 */
export const cityGroupFor = (groups, city, { withDefaults = false } = {}) => {
    const key = normalizeCity(city);
    if (!key) return null;
    const own = Array.isArray(groups) ? groups : [];
    // withDefaults: the admin's groups first, then the built-in ones for cities they don't cover.
    const base = withDefaults ? [...own, ...DEFAULT_CREATOR_GROUPS] : (own.length ? own : DEFAULT_CREATOR_GROUPS);
    const list = base.filter(g => g && g.isActive !== false && g.groupUrl);
    const g = list.find(x => normalizeCity(x.city) === key);
    return g ? { city: g.city, title: g.title || `${g.city} Creators Community`, url: g.groupUrl } : null;
};

/* Every active city group, one per city: the admin's first, then the built-in ones. */
export const allCityGroups = (groups) => {
    const seen = new Set();
    return [...(Array.isArray(groups) ? groups : []), ...DEFAULT_CREATOR_GROUPS]
        .filter(g => g && g.isActive !== false && g.groupUrl && normalizeCity(g.city))
        .filter(g => { const k = normalizeCity(g.city); if (seen.has(k)) return false; seen.add(k); return true; })
        .map(g => ({ city: g.city, title: g.title || `${g.city} Creators Community`, url: g.groupUrl }))
        .sort((a, b) => a.city.localeCompare(b.city));
};
