import React from 'react';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import UserRound from 'lucide-react/dist/esm/icons/user-round';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Phone from 'lucide-react/dist/esm/icons/phone';
import { cn } from '../../../lib/utils';
import { creatorHasCollegeNiche } from '../../../lib/constants';
import { extractSocialUsername, buildSocialUrl } from '../../../lib/socialUtils';
import { MILESTONE_BADGES } from '../../../lib/badges';
import { useAccent } from '../theme';
import { Button, Badge, CreatorStatusBadge, Avatar, Menu, MenuItem } from '../ui';
import { creatorPhoto, creatorReach, creatorNiche, isManualFollowerEntry, formatDate, formatCount } from '../creatorPortal/creatorUtils';
import { nicheTone } from './creatorData';

/* Shared pieces for the creator list: card, list row and the actions menu. */

export const whatsappLink = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 10) return '';
    return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

const BADGE_TONES = {
    featured: 'amber', bronze_inviter: 'orange', silver_inviter: 'gray', gold_inviter: 'amber',
    diamond_inviter: 'blue', rising_star: 'violet', superstar: 'pink',
};

/** Row checkbox with a 40px tap target. */
export const SelectBox = ({ checked, onChange, label, className }) => (
    <label className={cn('relative z-10 -m-2 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center', className)} onClick={(e) => e.stopPropagation()}>
        <input
            type="checkbox"
            aria-label={label}
            checked={checked}
            onChange={onChange}
            className="h-[18px] w-[18px] cursor-pointer rounded-md border-black/25 accent-pink-500 dark:border-white/25"
        />
    </label>
);

export const CreatorActionsMenu = ({ creator: c, onAction, size = 'sm' }) => {
    const status = c.profileStatus || 'pending';
    const wa = whatsappLink(c.phone);
    return (
        <Menu trigger={({ toggle }) => (
            <Button size={size} variant="ghost" onClick={(e) => { e.stopPropagation(); toggle(e); }} aria-label={`Actions for ${c.name || 'creator'}`} className="relative z-10 h-10 w-10 px-0">
                <MoreHorizontal size={16} />
            </Button>
        )}>
            <MenuItem icon={UserRound} onClick={() => onAction('open', c)}>Open profile</MenuItem>
            {status !== 'approved' && <MenuItem icon={Check} onClick={() => onAction('approved', c)} hint="Sends the approval email">Verify</MenuItem>}
            {status === 'pending' && <MenuItem icon={X} onClick={() => onAction('rejected', c)}>Reject</MenuItem>}
            {status !== 'pending' && <MenuItem icon={Clock} onClick={() => onAction('pending', c)}>Move back to pending</MenuItem>}
            {status !== 'blocked' && <MenuItem icon={Ban} onClick={() => onAction('blocked', c)} hint="Can't join campaigns">Block</MenuItem>}
            <div className="my-1 border-t border-black/[0.05] dark:border-white/[0.08]" />
            {wa && <MenuItem as="a" href={wa} target="_blank" rel="noopener noreferrer" icon={MessageCircle}>WhatsApp</MenuItem>}
            {c.email && <MenuItem icon={Mail} onClick={() => onAction('email', c)}>Send an email</MenuItem>}
            {c.phone && <MenuItem icon={Phone} onClick={() => onAction('copy-phone', c)} hint={c.phone}>Copy phone</MenuItem>}
            <MenuItem icon={Link2} onClick={() => onAction('copy-link', c)}>Copy admin link</MenuItem>
            <div className="my-1 border-t border-black/[0.05] dark:border-white/[0.08]" />
            <MenuItem icon={Trash2} danger onClick={() => onAction('delete', c)}>Delete</MenuItem>
        </Menu>
    );
};

const Socials = ({ c }) => {
    const items = [
        c.instagram && { href: buildSocialUrl(c.instagram, 'instagram'), label: 'Instagram', icon: Instagram, cls: 'text-pink-600 dark:text-pink-300' },
        c.youtube && { href: buildSocialUrl(c.youtube, 'youtube'), label: 'YouTube', icon: Youtube, cls: 'text-red-600 dark:text-red-300' },
        c.linkedin && { href: buildSocialUrl(c.linkedin, 'linkedin'), label: 'LinkedIn', icon: Linkedin, cls: 'text-sky-600 dark:text-sky-300' },
    ].filter(Boolean);
    if (!items.length) return <span className="text-[12px] text-gray-400">No socials</span>;
    return (
        <span className="relative z-10 flex items-center gap-1">
            {items.map(s => (
                <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={s.label}
                    title={s.label}
                    className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.04] transition-colors hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]', s.cls)}
                >
                    <s.icon size={14} />
                </a>
            ))}
        </span>
    );
};

const CollegeLine = ({ c, className }) => {
    const college = String(c.collegeName || '').trim();
    if (college) {
        return (
            <p className={cn('flex min-w-0 items-center gap-1 text-[12px] font-semibold text-teal-700 dark:text-teal-300', className)} title={college}>
                <GraduationCap size={13} className="shrink-0" /><span className="truncate">{college}</span>
            </p>
        );
    }
    if (creatorHasCollegeNiche(c)) {
        return (
            <p className={cn('flex items-center gap-1 text-[12px] font-semibold text-orange-600 dark:text-orange-300', className)}>
                <GraduationCap size={13} className="shrink-0" /> College missing
            </p>
        );
    }
    return null;
};

/* ── Card view ───────────────────────────────────────────────────────────── */

export const CreatorCard = ({ creator: c, badges = [], selected, onToggle, onOpen, onAction, busy }) => {
    const a = useAccent();
    const reach = creatorReach(c);
    const manual = isManualFollowerEntry(c) && c.profileStatus !== 'approved';
    const niche = creatorNiche(c);
    const handle = c.instagram ? `@${extractSocialUsername(c.instagram, 'instagram')}` : '';
    const status = c.profileStatus || 'pending';
    const shown = badges.filter(b => b !== MILESTONE_BADGES.official).slice(0, 2);
    const wa = whatsappLink(c.phone);

    return (
        <div className={cn(
            'relative flex flex-col rounded-2xl border bg-white p-4 transition-all dark:bg-white/[0.03]',
            selected ? cn(a.border, a.soft) : 'border-black/[0.06] hover:border-black/15 dark:border-white/[0.08] dark:hover:border-white/20'
        )}>
            <div className="flex items-center justify-between gap-2">
                <SelectBox checked={selected} onChange={onToggle} label={`Select ${c.name || 'creator'}`} className="ml-0" />
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
                    <CreatorStatusBadge status={status} />
                    {manual && <Badge tone="orange">Manual followers</Badge>}
                </div>
                <CreatorActionsMenu creator={c} onAction={onAction} />
            </div>

            <button type="button" onClick={onOpen} className="mt-2 flex min-w-0 items-center gap-3 text-left after:absolute after:inset-0 after:rounded-2xl">
                <Avatar src={creatorPhoto(c)} name={c.name} size={56} className="rounded-2xl" />
                <span className="min-w-0">
                    <span className="block truncate text-[16px] font-extrabold leading-snug">{c.name || 'Unnamed creator'}</span>
                    <span className="block truncate text-[12px] text-gray-500">{handle || c.email || 'No contact'}</span>
                </span>
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {niche && <Badge tone={nicheTone(niche)}>{niche}</Badge>}
                <Badge tone="gray"><MapPin size={11} />{c.city || 'No city'}</Badge>
                {shown.map(b => <Badge key={b.id} tone={BADGE_TONES[b.id] || 'violet'} title={b.desc}>{b.icon} {b.label}</Badge>)}
            </div>
            <CollegeLine c={c} className="mt-2" />

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.025] p-2.5 dark:bg-white/[0.03]">
                <div>
                    <p className="text-[11px] font-semibold text-gray-500">Followers</p>
                    <p className="text-[16px] font-extrabold tabular-nums">{formatCount(reach)}</p>
                </div>
                <div>
                    <p className="text-[11px] font-semibold text-gray-500">Joined</p>
                    <p className="truncate text-[13px] font-bold">{formatDate(c.createdAt) || '—'}</p>
                </div>
            </div>

            <div className="flex-1" />
            <div className="relative z-10 mt-3.5 flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                <Socials c={c} />
                <span className="flex-1" />
                {wa && (
                    <Button size="sm" variant="secondary" as="a" href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="h-10 w-10 px-0 text-emerald-600 dark:text-emerald-300">
                        <MessageCircle size={15} />
                    </Button>
                )}
                {status !== 'approved' ? (
                    <Button size="sm" variant="success" onClick={() => onAction('approved', c)} disabled={busy} className="h-10">
                        <Check size={14} /> Verify
                    </Button>
                ) : (
                    <Button size="sm" variant="secondary" onClick={onOpen} className="h-10">Open</Button>
                )}
            </div>
        </div>
    );
};

/* ── List view ───────────────────────────────────────────────────────────── */

export const LIST_GRID = 'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 xl:grid-cols-[auto_minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] xl:gap-x-4';

export const CreatorListHeader = ({ allSelected, onToggleAll }) => (
    <div className={cn(LIST_GRID, 'border-b border-black/[0.06] px-4 py-2 text-[12px] font-bold text-gray-500 dark:border-white/[0.06] sm:px-5')}>
        <SelectBox checked={allSelected} onChange={onToggleAll} label="Select all on this page" />
        <span>Creator</span>
        <span className="hidden xl:block">Niche · city</span>
        <span className="hidden text-right xl:block">Followers</span>
        <span className="hidden xl:block">Status</span>
        <span className="hidden xl:block">Joined</span>
        <span className="w-10" />
    </div>
);

export const CreatorRow = ({ creator: c, selected, onToggle, onOpen, onAction }) => {
    const a = useAccent();
    const reach = creatorReach(c);
    const manual = isManualFollowerEntry(c) && c.profileStatus !== 'approved';
    const niche = creatorNiche(c);
    const handle = c.instagram ? `@${extractSocialUsername(c.instagram, 'instagram')}` : '';

    return (
        <li className={cn('relative transition-colors', selected ? a.soft : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.02]')}>
            <div className={cn(LIST_GRID, 'px-4 py-3 sm:px-5')}>
                <SelectBox checked={selected} onChange={onToggle} label={`Select ${c.name || 'creator'}`} />
                <button type="button" onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left after:absolute after:inset-0">
                    <Avatar src={creatorPhoto(c)} name={c.name} size={42} />
                    <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-[15px] font-bold">{c.name || 'Unnamed creator'}</span>
                            <span className="xl:hidden"><CreatorStatusBadge status={c.profileStatus} /></span>
                        </span>
                        <span className="block truncate text-[12px] text-gray-500">
                            {handle || c.email || 'No contact'}
                            {c.phone ? <span className="hidden sm:inline"> · {c.phone}</span> : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-gray-500 xl:hidden">
                            {[c.city || 'No city', niche, `${formatCount(reach)} followers`].filter(Boolean).join(' · ')}
                        </span>
                        <CollegeLine c={c} className="mt-0.5 xl:hidden" />
                    </span>
                </button>
                <div className="hidden min-w-0 xl:block">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {niche ? <Badge tone={nicheTone(niche)} className="max-w-full truncate">{niche}</Badge> : <span className="text-[13px] text-gray-400">No niche</span>}
                    </div>
                    <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-gray-500"><MapPin size={11} className="shrink-0" />{c.city || 'No city'}</p>
                    <CollegeLine c={c} className="mt-0.5" />
                </div>
                <div className="hidden text-right xl:block">
                    <p className="text-[15px] font-extrabold tabular-nums">{formatCount(reach)}</p>
                    {manual && <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-300">Manual</p>}
                </div>
                <div className="hidden xl:block"><CreatorStatusBadge status={c.profileStatus} /></div>
                <p className="hidden whitespace-nowrap text-[13px] text-gray-500 xl:block">{formatDate(c.createdAt) || '—'}</p>
                <CreatorActionsMenu creator={c} onAction={onAction} />
            </div>
        </li>
    );
};
