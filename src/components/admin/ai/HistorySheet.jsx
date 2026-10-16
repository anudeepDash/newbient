import React, { useState } from 'react';
import History from 'lucide-react/dist/esm/icons/history';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import Sheet from '../Sheet';
import { Badge, Button, EmptyState, Menu, MenuItem, SearchInput } from '../ui';
import { accent } from '../theme';
import { cn } from '../../../lib/utils';
import { STUDIO_KINDS, documentSubtitle, documentTitle } from './studioDocuments';

/* Past generations kept in this browser, newest first. */

export const timeAgo = (iso) => {
    const t = new Date(iso).getTime();
    if (!t) return '';
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
    return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const HistoryRow = ({ entry, active, onOpen, onRemove }) => {
    const cfg = STUDIO_KINDS[entry.kind] || STUDIO_KINDS.proposal;
    const Icon = cfg.icon;
    return (
        <div className={cn(
            'flex items-center gap-3 rounded-2xl border p-3 transition-colors',
            active ? cn(accent(cfg.tone).border, accent(cfg.tone).soft) : 'border-black/[0.06] bg-white hover:border-black/15 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20'
        )}>
            <button type="button" onClick={() => onOpen(entry)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(cfg.tone).chip)}><Icon size={17} /></span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-gray-900 dark:text-white">{documentTitle(entry.kind, entry.doc)}</span>
                    <span className="block truncate text-[12.5px] text-gray-500">
                        {[cfg.label, documentSubtitle(entry.kind, entry.doc), timeAgo(entry.updatedAt || entry.createdAt)].filter(Boolean).join(' · ')}
                    </span>
                </span>
                {entry.savedId ? <Badge tone="green">Saved</Badge> : <Badge tone="amber">Not saved</Badge>}
            </button>
            {onRemove && (
                <Menu trigger={({ toggle }) => (
                    <button type="button" onClick={toggle} aria-label="More" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
                        <MoreHorizontal size={17} />
                    </button>
                )}>
                    <MenuItem icon={FolderOpen} onClick={() => onOpen(entry)}>Open</MenuItem>
                    <MenuItem icon={Trash2} danger onClick={() => onRemove(entry)} hint={entry.savedId ? 'The saved draft stays in its module' : 'This draft was never saved'}>Remove from history</MenuItem>
                </Menu>
            )}
        </div>
    );
};

const HistorySheet = ({ open, onClose, entries, activeId, onOpen, onRemove, onClear }) => {
    const [q, setQ] = useState('');
    const needle = q.trim().toLowerCase();
    const shown = needle
        ? entries.filter(e => `${documentTitle(e.kind, e.doc)} ${documentSubtitle(e.kind, e.doc)} ${e.brief?.prompt || ''}`.toLowerCase().includes(needle))
        : entries;
    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="History"
            subtitle="Your recent generations, kept on this device only."
            size="md"
            footer={entries.length > 0 ? (
                <Button variant="ghost" className="h-11 w-full text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400" onClick={onClear}>
                    <Trash2 size={15} /> Clear history
                </Button>
            ) : null}
        >
            {entries.length === 0 ? (
                <EmptyState icon={History} title="Nothing here yet" description="Every draft you generate is kept here, so you can come back to it after a refresh." />
            ) : (
                <div className="space-y-3">
                    {entries.length > 5 && <SearchInput value={q} onChange={setQ} placeholder="Search history" />}
                    {shown.map(e => (
                        <HistoryRow key={e.id} entry={e} active={e.id === activeId} onOpen={(x) => { onOpen(x); onClose(); }} onRemove={onRemove} />
                    ))}
                    {shown.length === 0 && <p className="py-6 text-center text-[13px] text-gray-500">No match for "{q}".</p>}
                </div>
            )}
        </Sheet>
    );
};

export default HistorySheet;
