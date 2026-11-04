import React from 'react';
import { Badge } from '../../ui';
import { STATUS_META } from '../../../../lib/outreach/status';
import { formatCount } from '../campaignModel';

/* Small pieces shared by the Outreach tab's panels. */

export const StatusBadge = ({ status }) => {
    const meta = STATUS_META[status] || STATUS_META.applied;
    return <Badge tone={meta.tone}>{meta.label}</Badge>;
};

export const Handle = ({ handle, className }) => (handle ? (
    <a href={`https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer" className={className || 'font-semibold text-pink-600 hover:underline dark:text-neon-pink'} onClick={(e) => e.stopPropagation()}>
        @{handle}
    </a>
) : null);

export const followers = (n) => formatCount(Number(n) || 0);

/* Actions for moving someone along, in the order an admin would use them. */
export const STATUS_ACTIONS = {
    shortlisted: 'Add to shortlist',
    message_queued: 'Move to To send',
    message_sent: 'Mark sent',
    replied: 'Mark replied',
    joined: 'Mark joined the group',
    posted: 'Mark posted',
    paid: 'Mark paid',
    removed: 'Remove from shortlist',
};

/* "3 min ago", "2 Oct, 14:05". */
export const when = (iso) => {
    const t = Date.parse(iso || '');
    if (!t) return '';
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    return new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
};

export const SKIP_REASON = {
    already: 'already there',
    not_allowed: 'not allowed from their current status',
    not_found: 'no longer exists',
    no_phone: 'no phone number',
    below_min: 'under the follower minimum',
};

/* The message as the creator sees it in WhatsApp: picture, text with *bold*, buttons. */
export const Bubble = ({ text, image, buttons }) => (
    <div className="rounded-[1.4rem] bg-[#e7ddd3] p-3 dark:bg-[#0b141a]">
        <div className="max-w-[19rem] overflow-hidden rounded-xl rounded-tl-sm bg-white shadow-sm dark:bg-[#202c33]">
            {image
                ? <img src={image} alt="" className="aspect-[1.9/1] w-full object-cover" />
                : <div className="aspect-[1.9/1] w-full bg-gradient-to-br from-emerald-400/40 to-sky-400/30" />}
            <p className="whitespace-pre-wrap break-words px-3 pb-1 pt-2 text-[13px] leading-relaxed text-[#111b21] dark:text-[#e9edef]">
                {String(text).split(/(\*[^*\n]+\*)/g).map((part, i) => (/^\*[^*]+\*$/.test(part) ? <strong key={i}>{part.slice(1, -1)}</strong> : part))}
            </p>
            <p className="px-3 pb-2 text-[11px] text-gray-500">Newbi Creators · app.newbi.live</p>
            {buttons.map(b => <p key={b} className="border-t border-black/[0.06] py-2 text-center text-[13px] font-semibold text-[#027eb5] dark:border-white/[0.08] dark:text-[#53bdeb]">{b}</p>)}
        </div>
    </div>
);
