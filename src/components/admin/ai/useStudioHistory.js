import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * Past AI studio generations, kept in this browser only (nothing is written to
 * the database until "Save as draft"). Each entry holds the brief and the
 * latest working copy of the document, so a refresh or a closed tab never
 * loses work. Storage can be full or blocked; every access is guarded.
 */

const KEY = 'newbi_ai_studio_history_v1';
const MAX_ENTRIES = 25;

const read = () => {
    try {
        const raw = window.localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(e => e && e.id && e.kind && e.doc) : [];
    } catch {
        return [];
    }
};

const write = (entries) => {
    let next = entries.slice(0, MAX_ENTRIES);
    // Drop the oldest entries until it fits (signatures can be large).
    while (next.length) {
        try {
            window.localStorage.setItem(KEY, JSON.stringify(next));
            return true;
        } catch {
            next = next.slice(0, -1);
        }
    }
    try { window.localStorage.removeItem(KEY); } catch { /* blocked */ }
    return false;
};

export const newEntryId = () => `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export default function useStudioHistory() {
    const [entries, setEntries] = useState(read);
    const pending = useRef(null);

    // Writes are batched so typing in the editor doesn't hit storage every key.
    const persist = useCallback((next) => {
        clearTimeout(pending.current);
        pending.current = setTimeout(() => write(next), 400);
    }, []);
    useEffect(() => () => clearTimeout(pending.current), []);

    const upsert = useCallback((entry) => {
        setEntries(prev => {
            const rest = prev.filter(e => e.id !== entry.id);
            const existing = prev.find(e => e.id === entry.id);
            const next = [{ ...(existing || {}), ...entry, updatedAt: new Date().toISOString() }, ...rest];
            persist(next);
            return next;
        });
    }, [persist]);

    const remove = useCallback((id) => {
        setEntries(prev => {
            const next = prev.filter(e => e.id !== id);
            persist(next);
            return next;
        });
    }, [persist]);

    const clear = useCallback(() => {
        setEntries([]);
        clearTimeout(pending.current);
        try { window.localStorage.removeItem(KEY); } catch { /* blocked */ }
    }, []);

    return { entries, upsert, remove, clear };
}
