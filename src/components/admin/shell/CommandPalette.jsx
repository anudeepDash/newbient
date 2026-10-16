import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Search from 'lucide-react/dist/esm/icons/search';
import CornerDownLeft from 'lucide-react/dist/esm/icons/corner-down-left';
import { cn } from '../../../lib/utils';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

/*
 * Quick-jump palette (⌘K / Ctrl+K, or the search buttons in the shell).
 * Lists every screen the current role can open plus "create" shortcuts.
 */
const CommandPalette = ({ open, onClose, nav, actions }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [cursor, setCursor] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    useBodyScrollLock(open);

    const entries = useMemo(() => [
        ...actions.map(a => ({ ...a, section: 'Create', keywords: a.name })),
        ...nav.flatMap(g => g.items.map(i => ({ ...i, section: g.title, keywords: `${i.name} ${g.title}` }))),
    ], [nav, actions]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return entries;
        const terms = q.split(/\s+/);
        return entries.filter(e => terms.every(t => e.keywords.toLowerCase().includes(t)));
    }, [entries, query]);

    useEffect(() => {
        if (!open) return;
        setQuery('');
        setCursor(0);
        // iOS Safari only raises the keyboard for focus() called inside the tap
        // handler's task, so focus synchronously after mount rather than in a timeout.
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [open]);

    useEffect(() => { setCursor(0); }, [query]);

    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [cursor]);

    const go = (entry) => {
        if (!entry) return;
        onClose();
        navigate(entry.path);
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(results.length - 1, c + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); go(results[cursor]); }
        else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };

    let lastSection = null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[400] flex items-start justify-center px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-[12vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/70"
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Jump to"
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
                        className="relative flex max-h-[min(70dvh,560px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d0f15]"
                    >
                        <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 dark:border-white/[0.06]">
                            <Search size={16} className="shrink-0 text-gray-400" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Jump to a page or create something…"
                                className="h-14 w-full bg-transparent text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400 dark:text-white"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                enterKeyHint="go"
                            />
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 rounded-lg border border-black/10 px-2 py-1 text-[10px] font-bold text-gray-500 dark:border-white/10"
                            >
                                Esc
                            </button>
                        </div>
                        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain p-2">
                            {results.length === 0 && (
                                <p className="px-3 py-10 text-center text-sm font-medium text-gray-500">Nothing matches “{query}”.</p>
                            )}
                            {results.map((entry, index) => {
                                const showHeader = entry.section !== lastSection;
                                lastSection = entry.section;
                                const Icon = entry.icon;
                                const active = index === cursor;
                                return (
                                    <React.Fragment key={`${entry.section}-${entry.id}`}>
                                        {showHeader && (
                                            <p className="px-3 pb-1 pt-3 text-[12px] font-bold text-gray-400 first:pt-1">{entry.section}</p>
                                        )}
                                        <button
                                            type="button"
                                            data-index={index}
                                            onClick={() => go(entry)}
                                            onMouseMove={() => setCursor(index)}
                                            className={cn(
                                                'flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors',
                                                active ? 'bg-black/[0.05] text-gray-900 dark:bg-white/[0.07] dark:text-white' : 'text-gray-700 dark:text-zinc-300'
                                            )}
                                        >
                                            <span className={cn(
                                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                                                entry.section === 'Create'
                                                    ? 'border-neon-green/30 bg-neon-green/10 text-emerald-700 dark:text-neon-green'
                                                    : 'border-black/[0.06] bg-black/[0.03] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-400'
                                            )}>
                                                <Icon size={15} />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                                            {active && <CornerDownLeft size={14} className="hidden shrink-0 text-gray-400 sm:block" />}
                                        </button>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default CommandPalette;
