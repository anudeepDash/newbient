import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { eventTiers } from '../../lib/ticketing';

/*
 * Upcoming events that sell tickets (upcoming_events with isTicketed), for
 * the app's Tickets page and the Home card. One public read, cached for the
 * session (5 minutes), shared by every caller.
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
