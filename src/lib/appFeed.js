/*
 * The app's cached public lists from the server (/api/forms?type=app-feed,
 * built in api/_lib/publicFeed.js): the community feed's public collections
 * and the open campaigns, pre-filtered and cached at the edge. The community
 * feed and the campaigns list both start from this one request; null means
 * it failed and the caller reads Firestore instead.
 */

const APP_FEED_URL = '/api/forms?type=app-feed';
const SHARE_MS = 60 * 1000;

let pending = null;
let pendingAt = 0;

export const fetchAppFeed = ({ force = false } = {}) => {
    if (!pending || force || Date.now() - pendingAt > SHARE_MS) {
        pendingAt = Date.now();
        const request = fetch(APP_FEED_URL)
            .then(r => (r.ok ? r.json() : null))
            .then(data => (data?.success ? data : null))
            .catch(() => null)
            .then(data => {
                if (!data && pending === request) pending = null;
                return data;
            });
        pending = request;
    }
    return pending;
};
