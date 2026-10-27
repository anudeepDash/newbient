import React from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Reply from 'lucide-react/dist/esm/icons/reply';
import { cn } from '../../../lib/utils';
import { waText } from './waText';
import { G, LINE, MUTED, SURFACE } from '../campaigns/outreach/InboxPanel';

/* Shared pieces of the WhatsApp center's panes (pages/Admin/WhatsAppCenter.jsx). */

export const STATUS_TONE = { APPROVED: 'green', PENDING: 'amber', IN_APPEAL: 'amber', REJECTED: 'rose', PAUSED: 'rose', DISABLED: 'gray' };
export const SEND_TONE = { sent: 'blue', delivered: 'teal', read: 'green', failed: 'rose', retry: 'amber', held: 'amber', skipped: 'gray' };

export const statusLabel = (s) => {
    const t = String(s || '').toLowerCase().replace(/_/g, ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
};
/* "campaign_shortlist" → "Campaign shortlist". */
export const templateTitle = (name) => statusLabel(name);

/* Where a send came from, in words. */
export const eventLabel = (e = '') => {
    if (e === 'admin-manual') return 'Sent by hand';
    if (e === 'admin-bulk') return 'Sent to many';
    if (e.startsWith('outreach-')) return 'Campaign outreach';
    if (e.startsWith('otp-')) return 'Sign-in code';
    if (e === 'creator-verification') return 'Number check';
    if (e === 'inbox-reply') return 'Inbox reply';
    return e ? `Automatic · ${e.replace(/-/g, ' ')}` : 'Automatic';
};

export const fill = (text, values) => String(text || '').replace(/\{\{(\d+)\}\}/g, (_, n) => values[Number(n) - 1] || `{{${n}}}`);

/* A pane's top bar: back on phones, close on desktop. */
export const PaneHeader = ({ icon: Icon, title, subtitle, onClose, children }) => (
    <header className={cn('flex h-16 shrink-0 items-center gap-3 border-b px-3 sm:px-4', LINE, SURFACE)}>
        <button type="button" onClick={onClose} aria-label="Back to chats" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 lg:hidden dark:text-zinc-400 dark:hover:bg-white/[0.06]"><ChevronLeft size={22} /></button>
        {Icon && <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', G.chip)}><Icon size={18} /></span>}
        <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-[16px] font-bold text-gray-900 dark:text-white">{title}</p>
            {subtitle && <p className={cn('truncate text-[12.5px]', MUTED)}>{subtitle}</p>}
        </div>
        {children}
        <button type="button" onClick={onClose} aria-label="Close" className="hidden h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-900 lg:flex dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white"><X size={19} /></button>
    </header>
);

/* Filter pills in the Newbi green. */
export const Pills = ({ items, value, onChange }) => (
    <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
        {items.map(f => (
            <button key={f.value} type="button" role="tab" aria-selected={value === f.value} onClick={() => onChange(f.value)} className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold transition-colors', value === f.value ? G.solid : 'bg-black/[0.04] text-gray-600 hover:bg-black/[0.07] dark:bg-white/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.09]')}>
                {f.label}
                {f.count !== undefined && <span className={cn('text-[11px] tabular-nums', value === f.value ? 'opacity-75' : 'opacity-60')}>{f.count}</span>}
            </button>
        ))}
    </div>
);

/* How a template looks on the person's phone: a message from Newbi. */
export const TemplateBubble = ({ tpl, body, headerText, headerImage, clamp = false, className }) => (
    <div className={cn('w-full max-w-[300px] overflow-hidden rounded-2xl rounded-tl-md bg-white text-[13.5px] leading-[1.42] text-gray-900 shadow-sm ring-1 ring-black/[0.05] dark:bg-[#171a21] dark:text-zinc-100 dark:ring-white/[0.06]', className)}>
        {tpl.header?.format === 'IMAGE' && (
            <div className="m-1 mb-0 flex aspect-[1.91/1] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 text-[12px] font-semibold text-gray-600 dark:from-neon-green/15 dark:to-neon-blue/10 dark:text-zinc-300">
                <ImageIcon size={15} /> {headerImage || 'Newbi card'}
            </div>
        )}
        {tpl.header?.format === 'DOCUMENT' && (
            <div className="m-1 mb-0 flex items-center gap-2 rounded-xl bg-black/[0.04] px-3 py-3 text-[12.5px] font-semibold dark:bg-white/[0.05]"><FileText size={16} /> PDF document</div>
        )}
        {tpl.header?.format === 'TEXT' && <p className="px-3 pt-2.5 font-bold">{headerText ?? tpl.header.text}</p>}
        <p className={cn('whitespace-pre-wrap px-3 pb-1 pt-2 [overflow-wrap:anywhere]', clamp && 'line-clamp-6')}>{waText(body ?? tpl.body)}</p>
        {tpl.footer && <p className={cn('px-3 pb-1 text-[12px]', MUTED)}>{tpl.footer}</p>}
        <p className={cn('px-3 pb-2 text-right text-[10.5px]', MUTED)}>12:00</p>
        {tpl.buttons?.map(b => (
            <p key={b.index} className={cn('flex items-center justify-center gap-1.5 border-t py-2.5 text-center text-[13px] font-bold', LINE, G.text)}>
                {b.url ? <ExternalLink size={13} /> : <Reply size={13} />}{b.text}
            </p>
        ))}
    </div>
);

/* The chat-like backdrop the previews sit on. */
export const PreviewWell = ({ children, className }) => (
    <div className={cn('rounded-2xl bg-[#f4f5f7] p-3 dark:bg-[#07080b]', className)} style={{ backgroundImage: 'radial-gradient(rgba(128,128,128,0.13) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
        {children}
    </div>
);
