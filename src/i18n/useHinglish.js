import { useEffect, useMemo, useState } from 'react';
import { useLang } from './index';

/*
 * Hinglish for content the team uploads in English (campaign briefs).
 * When the site is in Hinglish, the server writes it on first view (Gemini)
 * and caches it, see api/_lib/hinglish.js. Until it arrives, or if it can't
 * be made, the English shows, so nothing ever blanks. The browser sends only
 * {kind, id}; the server reads the text itself.
 */

const URL = '/api/forms?type=hinglish';
const units = new Map();      // 'campaign:id' -> { key: hinglish } once known
const failed = new Map();     // 'campaign:id' -> when it last failed
const inflight = new Map();
const listeners = new Set();
const RETRY_AFTER_MS = 2 * 60 * 1000;

const notify = () => listeners.forEach((l) => l());

function request(kind, id) {
    const key = `${kind}:${id}`;
    if (units.has(key) || inflight.has(key)) return;
    if (Date.now() - (failed.get(key) || 0) < RETRY_AFTER_MS) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    inflight.set(key, true);
    fetch(`${URL}&kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' }, signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
            if (json?.success && json.units) units.set(key, json.units);
            else failed.set(key, Date.now());
        })
        .catch(() => { failed.set(key, Date.now()); })
        .finally(() => { clearTimeout(timer); inflight.delete(key); notify(); });
}

// Re-renders the caller whenever a translation lands.
function useVersion() {
    const [v, setV] = useState(0);
    useEffect(() => {
        const l = () => setV((n) => n + 1);
        listeners.add(l);
        return () => listeners.delete(l);
    }, []);
    return v;
}

/** One campaign with its Hinglish title, reward, brief and task text swapped in (same object when there is none). */
export function localizeCampaign(campaign, u, fields) {
    if (!campaign || !u) return campaign;
    const want = (f) => !fields || fields.includes(f);
    const next = { ...campaign };
    ['title', 'reward', 'description'].forEach((f) => { if (want(f) && u[f]) next[f] = u[f]; });
    if (want('tasks') && Array.isArray(campaign.tasks)) {
        next.tasks = campaign.tasks.map((task, i) => {
            const id = String(task?.id ?? i);
            const title = u[`task:${id}:title`];
            const description = u[`task:${id}:description`];
            return title || description ? { ...task, ...(title && { title }), ...(description && { description }) } : task;
        });
    }
    return next;
}

export function useLocalizedCampaigns(list, { fields } = {}) {
    const lang = useLang();
    const version = useVersion();
    const hi = lang === 'hi';
    const ids = hi && Array.isArray(list) ? list.map((c) => c?.id).filter(Boolean).join('|') : '';
    useEffect(() => { if (ids) ids.split('|').forEach((id) => request('campaign', id)); }, [ids]);
    const fieldKey = fields ? fields.join(',') : '';
    return useMemo(() => {
        if (!hi || !Array.isArray(list)) return list;
        return list.map((c) => localizeCampaign(c, units.get(`campaign:${c?.id}`), fields));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hi, list, version, fieldKey]);
}

export function useLocalizedCampaign(campaign, opts) {
    const wrapped = useMemo(() => (campaign ? [campaign] : []), [campaign]);
    const out = useLocalizedCampaigns(wrapped, opts);
    return campaign ? out[0] : campaign;
}

// Feed card type -> the server's kind. Other types (forms, plain events) are left in English.
const FEED_KINDS = { guestlist: 'guestlist', giveaway: 'giveaway', gig: 'gig' };

/** Community feed cards with their Hinglish description (the same items when there is none). */
export function useLocalizedFeed(items) {
    const lang = useLang();
    const version = useVersion();
    const hi = lang === 'hi';
    const pairs = hi && Array.isArray(items)
        ? items.filter((i) => FEED_KINDS[i?.type] && i.id).map((i) => `${FEED_KINDS[i.type]}:${i.id}`).join('|')
        : '';
    useEffect(() => {
        if (pairs) pairs.split('|').forEach((p) => { const [kind, ...id] = p.split(':'); request(kind, id.join(':')); });
    }, [pairs]);
    return useMemo(() => {
        if (!hi || !Array.isArray(items)) return items;
        return items.map((i) => {
            const u = FEED_KINDS[i?.type] ? units.get(`${FEED_KINDS[i.type]}:${i.id}`) : null;
            return u?.description ? { ...i, description: u.description } : i;
        });
    }, [hi, items, version]);
}

/** One text field of one item (a guestlist or giveaway description) in Hinglish, else the English you passed. */
export function useLocalizedField(kind, id, field, text) {
    const lang = useLang();
    const version = useVersion();
    const hi = lang === 'hi' && Boolean(id);
    useEffect(() => { if (hi) request(kind, id); }, [hi, kind, id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => (hi ? units.get(`${kind}:${id}`)?.[field] || text : text), [hi, kind, id, field, text, version]);
}
