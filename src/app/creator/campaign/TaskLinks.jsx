import React, { useState } from 'react';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Download from 'lucide-react/dist/esm/icons/download';
import Globe from 'lucide-react/dist/esm/icons/globe';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import { cn } from '../../../lib/utils';
import { copyToClipboard } from '../../../lib/clipboard';

/* A deliverable's links (form, ticket, post to repost, creative assets), in the app's glass style. */

const KIND = {
    google_form: { icon: FileText, open: 'Open form', strong: true },
    ticket: { icon: Ticket, open: 'Open ticket', strong: true },
    repost: { icon: Instagram, open: 'View post' },
    creative: { icon: Download, open: 'Open asset' },
};

const TaskLinks = ({ links = [] }) => {
    const [copied, setCopied] = useState(null);
    if (!links.length) return null;
    const copy = (e, url, i) => {
        e.preventDefault();
        e.stopPropagation();
        copyToClipboard(url).then(ok => {
            if (!ok) return;
            setCopied(i);
            setTimeout(() => setCopied(null), 2000);
        });
    };
    return (
        <ul className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
            {links.map((item, i) => {
                const kind = KIND[item.type] || { icon: Globe, open: 'Open link' };
                const Icon = kind.icon;
                return (
                    <li key={`${item.url}-${i}`} className="flex items-center gap-3 rounded-2xl bg-white/60 p-2.5 ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.04] dark:ring-white/[0.08]">
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', kind.strong ? 'bg-neon-green text-black' : 'bg-black/[0.05] text-gray-600 dark:bg-white/[0.08] dark:text-zinc-300')}>
                            <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-bold">{item.label}</span>
                            {item.domain && <span className="block truncate font-mono text-[11px] text-gray-500 dark:text-zinc-500">{item.domain}</span>}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => copy(e, item.url, i)}
                            aria-label={copied === i ? 'Copied' : 'Copy link'}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/[0.05] hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
                        >
                            {copied === i ? <Check size={15} className="text-emerald-600 dark:text-neon-green" /> : <Copy size={15} />}
                        </button>
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 font-heading text-[13px] font-bold transition-transform active:scale-95',
                                kind.strong
                                    ? 'border-2 border-black bg-neon-green text-black shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_rgba(255,255,255,0.85)]'
                                    : 'bg-gray-900 text-white dark:bg-white dark:text-black'
                            )}
                        >
                            {kind.open} <ExternalLink size={12} />
                        </a>
                    </li>
                );
            })}
        </ul>
    );
};

export default TaskLinks;
