import { safeSessionStorage } from './storage';

// A new deploy renames chunks, and for a minute or so after one a chunk request can still
// miss (the rewrite then hands back HTML, which Safari reports as "Importing a module script
// failed"). Reloading picks up the live build; later tries wait a little longer so the deploy
// can settle, and three tries a minute is the cap so a real outage can't loop forever.
const KEY = 'chunk-reloads';
const MAX_TRIES = 3;
const WINDOW_MS = 60000;

let pending = false;

export const isChunkLoadError = (error) => {
    const message = error?.message || '';
    return message.includes('Failed to fetch dynamically imported module')
        || message.includes('Importing a module script failed')
        || message.includes('error loading dynamically imported module')
        || message.includes('Unable to preload CSS')
        || message.includes('Failed to load module script')
        || /Loading (CSS )?chunk .* failed/i.test(message);
};

/*
 * Whether this page is on its way out (Back/Forward to another document, a link to the
 * landing, a reload). The browser cancels the page's in-flight requests then, so a page
 * chunk that was still loading fails, and without this the error screen would flash for
 * a moment before the next page appears. Cleared when the page comes back (bfcache) or,
 * if something cancelled the unload, after a few seconds.
 */
let leaving = false;
let leavingTimer = null;
if (typeof window !== 'undefined') {
    const markLeaving = () => {
        leaving = true;
        clearTimeout(leavingTimer);
        leavingTimer = setTimeout(() => { leaving = false; }, 3000);
    };
    window.addEventListener('beforeunload', markLeaving);
    window.addEventListener('pagehide', markLeaving);
    window.addEventListener('pageshow', () => { leaving = false; clearTimeout(leavingTimer); });
}
export const isPageLeaving = () => leaving || pending;

// Returns true while a reload is on its way, false once the tries are used up.
export function reloadForNewChunks() {
    if (pending) return true;
    // Already navigating away: the next page loads the live build anyway.
    if (leaving) return true;
    try {
        const now = Date.now();
        const recent = JSON.parse(safeSessionStorage.getItem(KEY) || '[]')
            .filter((t) => now - t < WINDOW_MS);
        if (recent.length >= MAX_TRIES) return false;
        safeSessionStorage.setItem(KEY, JSON.stringify([...recent, now]));
        pending = true;
        setTimeout(() => window.location.reload(), recent.length * 2000);
        return true;
    } catch {
        return false;
    }
}
