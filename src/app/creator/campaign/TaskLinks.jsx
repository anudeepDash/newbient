import React from 'react';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import { cn } from '../../../lib/utils';

/* A deliverable's links (form, ticket, post to repost, assets) as small pills. The form or ticket is the green one. */

const KIND = {
    google_form: { label: 'Open form', strong: true },
    ticket: { label: 'Open ticket', strong: true },
    repost: { label: 'Post to repost' },
    creative: { label: 'Assets' },
};

const TaskLinks = ({ links = [], className }) => {
    if (!links.length) return null;
    return (
        <div className={cn('flex flex-wrap gap-2', className)} onClick={e => e.stopPropagation()}>
            {links.map((item, i) => {
                const kind = KIND[item.type] || { label: 'Open link' };
                return (
                    <a
                        key={`${item.url}-${i}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={item.label || undefined}
                        className={cn(
                            'inline-flex h-9 items-center gap-1 rounded-full px-3.5 font-heading text-[13px] font-bold transition-colors',
                            kind.strong
                                ? 'bg-neon-green text-black hover:bg-[#4dff2e]'
                                : 'bg-black/[0.05] text-gray-800 hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-zinc-200 dark:hover:bg-white/[0.12]'
                        )}
                    >
                        {kind.label} <ArrowUpRight size={14} />
                    </a>
                );
            })}
        </div>
    );
};

export default TaskLinks;
