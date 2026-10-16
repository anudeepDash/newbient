import React from 'react';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import { cn } from '../../../lib/utils';

/* A deliverable's links (form, ticket, post to repost, assets) as small pills. The form or ticket is the green one. */

const KIND = {
    google_form: { label: 'Open form', short: 'Form', strong: true },
    ticket: { label: 'Open ticket', short: 'Ticket', strong: true },
    repost: { label: 'Post to repost', short: 'Repost' },
    creative: { label: 'Assets', short: 'Assets' },
};

/* compact: the one-link version that sits at the end of the deliverable's row (shorter label on phones). */
const TaskLinks = ({ links = [], compact = false, className }) => {
    if (!links.length) return null;
    return (
        <div className={cn('flex flex-wrap gap-2', className)} onClick={e => e.stopPropagation()}>
            {links.map((item, i) => {
                const kind = KIND[item.type] || { label: 'Open link', short: 'Open' };
                return (
                    <a
                        key={`${item.url}-${i}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={item.label || undefined}
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full font-heading font-bold transition-colors',
                            compact ? 'h-9 px-3 text-[13px] sm:px-3.5' : 'h-9 px-3.5 text-[13px]',
                            kind.strong
                                ? 'bg-neon-green text-black hover:bg-[#4dff2e]'
                                : 'bg-black/[0.05] text-gray-800 hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-zinc-200 dark:hover:bg-white/[0.12]'
                        )}
                    >
                        {compact ? <><span className="sm:hidden">{kind.short}</span><span className="hidden sm:inline">{kind.label}</span></> : kind.label}
                        <ArrowUpRight size={14} />
                    </a>
                );
            })}
        </div>
    );
};

export default TaskLinks;
