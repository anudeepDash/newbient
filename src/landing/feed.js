import { useEffect, useState } from 'react';
import { FEED_URL } from './links';

/*
 * One fetch of the cached public feed per page load, shared by every section.
 * The first render (and the prerendered HTML) always has no feed, so sections
 * that need data render nothing until it arrives, and hydration matches.
 */

let feed = null;
let pending = null;

export function loadFeed() {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (!pending) {
        pending = fetch(FEED_URL, { headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => { feed = json?.success ? json : { failed: true }; return feed; })
            .catch(() => { feed = { failed: true }; return feed; });
    }
    return pending;
}

export function usePublicFeed() {
    const [state, setState] = useState(null);
    useEffect(() => {
        let alive = true;
        if (feed) setState(feed);
        else loadFeed().then((f) => { if (alive) setState(f); });
        return () => { alive = false; };
    }, []);
    return state;
}

// A page or section is switched off from the admin's maintenance controls.
export const isOff = (f, { page, section } = {}) => Boolean(
    f?.maintenance && (f.maintenance.global || (page && f.maintenance.pages?.[page]) || (section && f.maintenance.sections?.[section]))
);
