import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { eventTiers } from '../../lib/ticketing';

/*
 * Upcoming events that sell tickets (upcoming_events with isTicketed), for
 * the app's Tickets page and the Home card. One public read, cached for the
 * session (5 minutes), shared by every caller. Unlisted sales (listed: false)
 * are left out of the list but still open from their own link
 * (useTicketEvent).
 */

const TTL_MS = 5 * 60 * 1000;
let cache = { at: 0, events: null, promise: null };
const listeners = new Set();

const isHidden = (e) => e.isHidden === true || e.hidden === true || e.isActive === false
    || e.status === 'draft' || e.status === 'archived' || e.visibility === 'hidden';

// Today in India as YYYY-MM-DD, so an event dated today still counts.
const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

export const eventDay = (v) => {
    if (!v) return '';
    if (typeof v === 'string') {
        const m = v.match(/^\d{4}-\d{2}-\d{2}/);
        if (m) return m[0];
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    if (typeof v.toDate === 'function') return v.toDate().toISOString().slice(0, 10);
    return '';
};

/* Lowest ticket price above zero, or null. */
export const fromPrice = (event) => {
    const prices = eventTiers(event).map(t => t.price).filter(p => p > 0);
    return prices.length ? Math.min(...prices) : null;
};

const load = async () => {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, 'upcoming_events'), where('isTicketed', '==', true)));
    const today = todayIST();
    return snap.docs
        .map(d => ({ ...d.data(), id: d.id }))
        .filter(e => !isHidden(e) && e.title)
        .map(e => ({ ...e, day: eventDay(e.date) }))
        .filter(e => e.day && e.day >= today)
        .sort((a, b) => a.day.localeCompare(b.day));
};

/** Listed in the Tickets tab (unlisted sales are link-only). */
export const isListed = (e) => e?.listed !== false;

const refresh = () => {
    if (cache.promise) return cache.promise;
    cache.promise = load()
        .catch((err) => { console.warn('[app/tickets] events:', err?.code || err); return []; })
        .then((events) => {
            cache = { at: Date.now(), events, promise: null };
            listeners.forEach(fn => fn(events));
            return events;
        });
    return cache.promise;
};

/* { events, loaded }: events is [] until loaded. */
export function useTicketedEvents() {
    const [events, setEvents] = useState(cache.events);
    useEffect(() => {
        listeners.add(setEvents);
        if (!cache.events || Date.now() - cache.at > TTL_MS) refresh();
        else setEvents(cache.events);
        return () => listeners.delete(setEvents);
    }, []);
    return { events: events || [], loaded: Boolean(events) };
}

/*
 * One ticketed event for its page (/tickets/:id): from the list when it's
 * there, else read on its own (unlisted sales, and past shows so an old link
 * says "this show has ended" instead of nothing).
 * { event, loaded }: event is null when it doesn't exist or isn't ticketed.
 */
const single = new Map();
export function useTicketEvent(id) {
    const { events, loaded } = useTicketedEvents();
    const fromList = id ? events.find(e => e.id === id) : null;
    const [own, setOwn] = useState(() => (id ? single.get(id) : undefined));
    useEffect(() => {
        if (!id || fromList || !loaded) return undefined;
        if (single.has(id)) { setOwn(single.get(id)); return undefined; }
        let live = true;
        (db ? getDoc(doc(db, 'upcoming_events', id)) : Promise.resolve(null))
            .then((snap) => {
                const e = snap?.exists?.() ? { ...snap.data(), id: snap.id } : null;
                const ok = e && e.isTicketed && !isHidden(e) && e.title ? { ...e, day: eventDay(e.date) } : null;
                single.set(id, ok);
                if (live) setOwn(ok);
            })
            .catch((err) => { console.warn('[app/tickets] event:', err?.code || err); if (live) setOwn(null); });
        return () => { live = false; };
    }, [id, fromList, loaded]);
    if (fromList) return { event: fromList, loaded: true };
    return { event: own || null, loaded: loaded && own !== undefined };
}
