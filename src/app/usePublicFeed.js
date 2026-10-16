import { useEffect, useState } from 'react';

/*
 * The landing site's cached public feed (/api/forms?type=public-feed): site
 * settings and contact details such as the WhatsApp community link. The app
 * doesn't keep the old site-wide listeners, so it reads these from here once
 * per page load instead.
 */
const FEED_URL = '/api/forms?type=public-feed';
let cache = null;
let pending = null;

const load = () => {
    if (cache) return Promise.resolve(cache);
    if (!pending) {
        pending = fetch(FEED_URL)
            .then(r => (r.ok ? r.json() : null))
            .then(data => { cache = data || {}; return cache; })
            .catch(() => { pending = null; return {}; });
    }
    return pending;
};

export function usePublicFeed() {
    const [feed, setFeed] = useState(cache);
    useEffect(() => {
        if (cache) return undefined;
        let alive = true;
        load().then(data => { if (alive) setFeed(data); });
        return () => { alive = false; };
    }, []);
    return feed;
}

export const usePublicContact = () => usePublicFeed()?.contact || {};
