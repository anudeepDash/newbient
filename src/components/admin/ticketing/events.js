import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useStore } from '../../../lib/store';
import { toDate } from './format';

/*
 * The events Ticketing and the gate scanner work with: upcoming events,
 * archived (portfolio) events and gigs that sell tickets or run a guestlist,
 * plus standalone guestlists. A guestlist document that belongs to an event is
 * merged into it, and every guestlist document whose sign-ups belong to the
 * event is listed in `guestlistIds` (an event's own list and a standalone list
 * posted to the home page can both hold entries).
 */

export const hasGuestlist = (e) => Boolean(e?.isGuestlistEnabled || e?.guestlistEnabled);

const uniq = (list) => [...new Set(list.filter(Boolean))];

export const useOperationalEvents = () => {
    const upcomingEvents = useStore(s => s.upcomingEvents);
    const portfolio = useStore(s => s.portfolio);
    const guestlists = useStore(s => s.guestlists);
    const volunteerGigs = useStore(s => s.volunteerGigs);

    return useMemo(() => {
        const merged = new Map();
        const add = (ev, source) => {
            const prev = merged.get(ev.id);
            const next = prev ? { ...prev, ...ev } : { ...ev, source };
            next.guestlistIds = uniq([
                ...(prev?.guestlistIds || []),
                hasGuestlist(ev) ? ev.id : null,
                ev.guestlistId,
                ev.linkedGuestlistId,
            ]);
            merged.set(ev.id, next);
        };
        (upcomingEvents || []).filter(e => e.isTicketed || hasGuestlist(e)).forEach(e => add(e, 'event'));
        (portfolio || []).filter(p => p.wasEvent && (p.isTicketed || hasGuestlist(p))).forEach(p => add(p, 'archive'));
        (volunteerGigs || []).filter(hasGuestlist).forEach(g => add(g, 'gig'));

        (guestlists || []).forEach(gl => {
            const linked = gl.eventId || gl.linkedEventId;
            let matchId = (linked && merged.has(linked)) ? linked : merged.has(gl.id) ? gl.id : null;
            if (!matchId) {
                for (const [id, ev] of merged.entries()) {
                    if ([ev.guestlistId, ev.linkedGuestlistId, ev.eventId, ev.linkedEventId].includes(gl.id) || (gl.eventId && ev.id === gl.eventId)) { matchId = id; break; }
                }
            }
            if (matchId) {
                const existing = merged.get(matchId);
                merged.set(matchId, {
                    ...gl,
                    ...existing,
                    id: existing.id,
                    source: existing.source,
                    guestlistId: existing.guestlistId || gl.id,
                    guestlistIds: uniq([...(existing.guestlistIds || []), gl.id]),
                    currentSpots: (Number(existing.currentSpots) || 0) + (Number(gl.currentSpots) || 0),
                    maxSpots: existing.maxSpots ?? gl.maxSpots,
                    isGuestlistEnabled: true,
                    // A list made on the Guestlists screen keeps its own settings.
                    guestlistDoc: gl.isEmbedded ? existing.guestlistDoc : gl,
                });
            } else {
                merged.set(gl.id, {
                    ...gl,
                    source: 'guestlist',
                    isGuestlistEnabled: true,
                    guestlistId: gl.id,
                    guestlistIds: [gl.id],
                    guestlistDoc: gl,
                });
            }
        });

        return Array.from(merged.values()).map(e => ({ ...e, when: toDate(e.date) }));
    }, [upcomingEvents, portfolio, guestlists, volunteerGigs]);
};

/**
 * Live guestlist entries from every list of an event. Each entry carries
 * `_glId`, the guestlist document it lives in, for writes.
 */
export const useGuestEntries = (guestlistIds, enabled = true) => {
    const key = (guestlistIds || []).join('|');
    const [state, setState] = useState({ entries: [], loading: false, error: false });

    useEffect(() => {
        const ids = key ? key.split('|') : [];
        if (!enabled || !ids.length) {
            setState({ entries: [], loading: false, error: false });
            return undefined;
        }
        const byList = {};
        const pending = new Set(ids);
        setState(s => ({ ...s, loading: true, error: false }));
        const publish = () => {
            const all = Object.values(byList).flat();
            all.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
            setState({ entries: all, loading: pending.size > 0, error: false });
        };
        const unsubs = ids.map(id => onSnapshot(collection(db, 'guestlists', id, 'entries'), snap => {
            byList[id] = snap.docs.map(d => ({ ...d.data(), id: d.id, _glId: id }));
            pending.delete(id);
            publish();
        }, err => {
            console.error('Guestlist entries failed to load:', id, err);
            pending.delete(id);
            byList[id] = byList[id] || [];
            setState(s => ({ ...s, loading: pending.size > 0, error: true }));
        }));
        return () => unsubs.forEach(u => u());
    }, [key, enabled]);

    return state;
};
