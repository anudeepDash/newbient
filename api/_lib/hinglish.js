/*
 * Auto-Hinglish for content the team uploads in English (campaign briefs and
 * their tasks). The first time someone views a campaign in Hinglish, the
 * server reads the English text, has Gemini write the Hinglish, and keeps it
 * in `hinglish_cache/{kind}__{id}` next to a hash of the English it came from.
 * Edit the English and the hash stops matching, so the next view regenerates;
 * nobody has to press anything.
 *
 * The browser only sends {kind, id}. The text is always read from Firestore
 * here, so the endpoint can't be used as a free translator, and only fields
 * listed in KINDS are ever returned. Served by api/forms.js as
 * GET /api/forms?type=hinglish&kind=campaign&id=<id>.
 */
import { createHash } from 'node:crypto';

const CACHE = 'hinglish_cache';
const MAX_UNIT_CHARS = 6000;
const MAX_TOTAL_CHARS = 24000;
const FAIL_COOLDOWN_MS = 60 * 1000;
const MODELS = (process.env.HINGLISH_MODELS || 'gemini-2.5-flash,gemini-2.0-flash').split(',').map((m) => m.trim()).filter(Boolean);

const hidden = (d) => d.isHidden === true || d.hidden === true || d.isActive === false
    || d.status === 'draft' || d.status === 'archived' || d.visibility === 'hidden';
const text = (v) => (typeof v === 'string' ? v : '');
const hasWords = (s) => /[A-Za-z]{2,}/.test(String(s || '').replace(/<[^>]+>/g, ' '));

/*
 * What gets translated per kind. `units` turns a document into flat
 * { key: english } pairs. Caption scripts are left out on purpose: creators
 * copy those word for word into their posts.
 */
const describedItem = {
    isPublic: (d) => !hidden(d) && Boolean(text(d.title || d.name).trim()),
    // Names (titles, artists, venues) stay as they are; only the description is rewritten.
    units: (d) => (hasWords(d.description) ? { description: d.description } : {}),
};

export const KINDS = {
    // An id can live in more than one collection (an event with a guestlist, a gig that runs one);
    // later collections win, the same merge the app uses to build its feed.
    guestlist: { collections: ['volunteer_gigs', 'upcoming_events', 'guestlists'], ...describedItem },
    giveaway: { collections: ['giveaways'], ...describedItem },
    gig: { collections: ['volunteer_gigs'], ...describedItem },
    campaign: {
        collections: ['campaigns'],
        isPublic: (d) => !hidden(d) && Boolean(text(d.title).trim()),
        units(d) {
            const out = {};
            if (hasWords(d.title)) out.title = d.title;
            if (hasWords(d.reward)) out.reward = d.reward;
            if (hasWords(d.description)) out.description = d.description;
            (Array.isArray(d.tasks) ? d.tasks : []).forEach((task, i) => {
                const id = String(task?.id ?? i);
                if (hasWords(task?.title)) out[`task:${id}:title`] = task.title;
                if (hasWords(task?.description)) out[`task:${id}:description`] = task.description;
            });
            return out;
        },
    },
};

const hashOf = (units) => createHash('sha256').update(JSON.stringify(units)).digest('hex').slice(0, 24);

const URL_RE = /https?:\/\/[^\s"'<>)]+/gi;
const TAG_RE = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
const sorted = (a) => [...a].sort().join('|');

/** A translation is kept only if it still carries the same links and the same HTML tags as the English. */
export function looksFaithful(source, translated) {
    if (typeof translated !== 'string' || !translated.trim()) return false;
    if (sorted(source.match(URL_RE) || []) !== sorted(translated.match(URL_RE) || [])) return false;
    const tags = (s) => [...s.matchAll(TAG_RE)].map((m) => m[0].toLowerCase());
    if (sorted(tags(source)) !== sorted(tags(translated))) return false;
    // Placeholders like {name} must survive too.
    const ph = (s) => s.match(/\{\w+\}/g) || [];
    return sorted(ph(source)) === sorted(ph(translated));
}

export const SYSTEM_PROMPT = `You rewrite English text that a Newbi team member wrote (campaign briefs, task instructions for creators) into Hinglish: Hindi written in Roman script, mixed with English, the way young urban Indians write.

Style (medium Hinglish):
- Write descriptive sentences with real Hindi sentence structure (subject-object-verb; ke liye, mein, se, ko, ka/ki/ke, hai/hain/hoga/karenge, nahi, bas, toh, aur, ya). Not an English sentence with "aur" dropped in.
- Keep business and tech words in English: campaign, creator, brand, deliverable, followers, reel, post, story, link, deadline, brief, tag, caption, hashtag, profile, submit, approve, payment, and any app or product names.
- Friendly and direct. Say "tum", never "aap" or "tu". No slang forcing, no emojis, no Devanagari.
- Very short titles, rewards and labels stay close to English; only soften them if it reads naturally.

Hard rules:
- Return JSON only: an object with exactly the same keys you were given and a string value for each.
- Keep every number, amount (₹), date, time, @handle, #hashtag, email, URL and brand/person/place name exactly as written.
- If a value contains HTML, keep every tag, attribute and URL unchanged and only translate the text between tags. Do not add or remove tags.
- Keep {placeholders} unchanged.
- Never add, drop, or change the meaning of any instruction, requirement, amount or deadline.`;

async function geminiGenerate(units) {
    const key = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('No Gemini key configured');
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: key });
    let lastErr;
    for (const model of MODELS) {
        try {
            const res = await ai.models.generateContent({
                model,
                contents: JSON.stringify(units),
                config: { systemInstruction: SYSTEM_PROMPT, responseMimeType: 'application/json', temperature: 0.3 },
            });
            return JSON.parse(res.text);
        } catch (err) { lastErr = err; }
    }
    throw lastErr || new Error('No model answered');
}

const inflight = new Map();
const failedAt = new Map();

/**
 * The Hinglish for one document: { units, cached } or { units: null, reason }.
 * `generate` is injectable for tests.
 */
export async function getHinglish(db, kind, id, { generate = geminiGenerate } = {}) {
    const def = KINDS[kind];
    if (!def || !/^[A-Za-z0-9_-]{1,128}$/.test(String(id || ''))) return { units: null, reason: 'bad-request' };

    let doc = null;
    for (const name of def.collections) {
        const snap = await db.collection(name).doc(id).get();
        if (snap.exists) doc = { ...doc, ...snap.data() };
    }
    if (!doc) return { units: null, reason: 'not-found' };
    if (!def.isPublic(doc)) return { units: null, reason: 'not-public' };

    const units = def.units(doc);
    const keys = Object.keys(units);
    if (!keys.length) return { units: {}, cached: true };
    const total = keys.reduce((n, k) => n + units[k].length, 0);
    if (total > MAX_TOTAL_CHARS || keys.some((k) => units[k].length > MAX_UNIT_CHARS)) return { units: null, reason: 'too-long' };

    const hash = hashOf(units);
    const cacheRef = db.collection(CACHE).doc(`${kind}__${id}`);
    const hit = await cacheRef.get();
    if (hit.exists && hit.data()?.hash === hash) return { units: hit.data().units || {}, cached: true };

    const flightKey = `${kind}__${id}__${hash}`;
    if (Date.now() - (failedAt.get(flightKey) || 0) < FAIL_COOLDOWN_MS) return { units: null, reason: 'cooling-down' };
    if (!inflight.has(flightKey)) {
        inflight.set(flightKey, (async () => {
            const raw = await generate(units);
            const out = {};
            for (const k of keys) if (looksFaithful(units[k], raw?.[k])) out[k] = raw[k].trim();
            // Keep the result only if it covers the fields that matter, else try again later.
            if (!Object.keys(out).length) throw new Error('No usable Hinglish returned');
            await cacheRef.set({ hash, units: out, kind, docId: id, at: new Date().toISOString() });
            return out;
        })().finally(() => inflight.delete(flightKey)));
    }
    try {
        return { units: await inflight.get(flightKey), cached: false };
    } catch (err) {
        failedAt.set(flightKey, Date.now());
        console.warn('[hinglish] failed:', err.message);
        return { units: null, reason: 'unavailable' };
    }
}

export async function handleHinglish(db, req, res) {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (!db) return res.status(503).json({ success: false, error: 'Unavailable' });
    try {
        const { units, reason } = await getHinglish(db, String(req.query?.kind || ''), String(req.query?.id || ''));
        if (units) {
            res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
            return res.status(200).json({ success: true, units });
        }
        res.setHeader('Cache-Control', 'no-store');
        const status = reason === 'bad-request' ? 400 : reason === 'not-found' || reason === 'not-public' ? 404 : 200;
        return res.status(status).json({ success: false, reason });
    } catch (err) {
        console.error('[hinglish] error:', err);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(500).json({ success: false, reason: 'error' });
    }
}
