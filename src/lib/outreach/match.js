import { normalizeHandle } from './normalize.js';

/*
 * Bulk paste on the shortlist: the admin pastes Instagram handles from a sheet
 * or a chat, one per line, as @handle, plain handle or profile link.
 */

const URL_IN_LINE = /(?:https?:\/\/)?(?:[a-z]+\.)?(?:instagram\.com|instagr\.am)\/[^\s,;]*/i;
const AT_IN_LINE = /@[a-z0-9._]+/i;

/* The handles on one pasted line. A sheet row can carry a name too ("Riya Sharma  @riya.s"). */
const handlesInLine = (line) => {
    const pieces = line.split(/[,;]/).map(p => p.trim()).filter(Boolean);
    if (pieces.length > 1) {
        const all = pieces.map(normalizeHandle);
        if (all.every(Boolean)) return all;
    }
    const url = line.match(URL_IN_LINE);
    const at = line.match(AT_IN_LINE);
    const one = (url && normalizeHandle(url[0])) || (at && normalizeHandle(at[0])) || normalizeHandle(line);
    return one ? [one] : [];
};

/** → { handles: unique, in the order pasted; invalid: lines with no handle in them }. */
export const parsePastedHandles = (text) => {
    const handles = [];
    const invalid = [];
    const seen = new Set();
    String(text || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .forEach(line => {
            const found = handlesInLine(line);
            if (!found.length) {
                invalid.push(line);
                return;
            }
            found.forEach(handle => {
                if (seen.has(handle)) return;
                seen.add(handle);
                handles.push(handle);
            });
        });
    return { handles, invalid };
};

/**
 * Matches pasted handles to a campaign's applications (by instagramHandle).
 * → { matched: [{ handle, application }], unmatched: [handle], invalid: [line] }
 */
export const matchPastedHandles = (text, applications) => {
    const { handles, invalid } = parsePastedHandles(text);
    const byHandle = new Map();
    (applications || []).forEach(a => {
        if (a?.instagramHandle) byHandle.set(String(a.instagramHandle).toLowerCase(), a);
    });
    const matched = [];
    const unmatched = [];
    handles.forEach(handle => {
        const application = byHandle.get(handle);
        if (application) matched.push({ handle, application });
        else unmatched.push(handle);
    });
    return { matched, unmatched, invalid };
};
