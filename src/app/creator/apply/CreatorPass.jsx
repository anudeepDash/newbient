import React from 'react';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Loader2 from 'lucide-react/dist/esm/icons/loader-circle';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { AmbientBackdrop } from '../../../components/app';
import { cn } from '../../../lib/utils';
import { isPresent } from '../../../lib/present';
import { CREATOR_NICHE_OPTIONS } from '../../../lib/creator/options';
import newbiIcon from '../../../assets/logo/newbi-icon.svg';
import { compactCount } from '../format';

/*
 * The live creator pass on the application: it fills in as you type. The
 * Instagram lookup supplies the picture, name and follower count; city and
 * niches come from the form. Empty parts are shimmer bars, never "—".
 */

const nicheLabel = (id, custom) => (id === 'Others' ? (custom || null) : CREATOR_NICHE_OPTIONS.find(n => n.id === id)?.label || id);

const Shimmer = ({ className }) => <span className={cn('block animate-pulse rounded-full bg-white/[0.12]', className)} />;

const STATUS = {
    checking: { icon: Loader2, spin: true, label: 'Checking Instagram…', tone: 'text-zinc-300' },
    found: { icon: Instagram, label: 'Found on Instagram', tone: 'text-zinc-200' },
    estimated: { icon: Instagram, label: 'Read from your public Instagram', tone: 'text-zinc-300' },
    connected: { icon: BadgeCheck, label: 'Verified with Instagram', tone: 'text-neon-green' },
    later: { icon: Hourglass, label: 'We’ll verify your followers shortly', tone: 'text-zinc-300' },
    manual: { icon: Hourglass, label: 'Your count · we’ll confirm it on Instagram', tone: 'text-zinc-300' },
    approved: { icon: BadgeCheck, label: 'Approved', tone: 'text-neon-green' },
    review: { icon: Hourglass, label: 'In review', tone: 'text-amber-300' },
};

const CreatorPass = ({ handle, lookup, profile, city, niches = [], customNiche, manualFollowers = 0, status, passId, className }) => {
    const found = lookup?.state === 'found' ? lookup.profile : null;
    const picture = found?.profilePic || profile?.photoURL || null;
    const name = found?.name || profile?.name || null;
    const followers = compactCount(found?.followers || (!found && manualFollowers) || 0);
    const statusKey = status || (lookup?.state === 'checking' ? 'checking'
        : found ? (lookup.connected ? 'connected' : found.estimated ? 'estimated' : 'found')
            : handle && manualFollowers ? 'manual'
                : handle && ['unavailable', 'disabled'].includes(lookup?.state) ? 'later' : null);
    const s = STATUS[statusKey];
    const shownNiches = niches.map(n => nicheLabel(n, customNiche)).filter(Boolean);

    return (
        <div className={cn(
            'relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-[#07090c] p-5 text-white',
            'shadow-[0_24px_60px_-28px_rgba(57,255,20,0.45)]',
            className
        )}>
            <AmbientBackdrop image={picture} intensity={0.5} fallbackColor="rgba(57,255,20,0.22)" />
            {/* Dot grid and the faded brand mark, like the app's hero panels */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 text-white/[0.06]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1.2px)', backgroundSize: '14px 14px', WebkitMaskImage: 'linear-gradient(to left, black, transparent 80%)', maskImage: 'linear-gradient(to left, black, transparent 80%)' }} />
            <img aria-hidden="true" src={newbiIcon} alt="" className="pointer-events-none absolute -bottom-8 -right-6 w-40 rotate-[-8deg] opacity-[0.10]" />

            <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neon-green">Creator pass</span>
                    {passId && <span className="font-mono text-[11px] font-bold text-zinc-400">#{passId}</span>}
                </div>

                <div className="flex items-center gap-4">
                    <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] ring-2 ring-neon-green/60 ring-offset-2 ring-offset-[#07090c]">
                        {picture
                            ? <img src={picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                            : <Instagram size={24} className="text-zinc-500" />}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                        {isPresent(name) ? <p className="truncate font-heading text-[20px] font-black leading-tight">{name}</p> : <Shimmer className="h-5 w-36" />}
                        {handle ? (
                            <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-zinc-300">
                                @{handle}
                                {lookup?.connected && <BadgeCheck size={15} className="shrink-0 text-neon-green" />}
                            </p>
                        ) : <Shimmer className="h-3.5 w-24" />}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {followers && (
                        <span className="flex h-8 items-center gap-1.5 rounded-full bg-neon-green/15 px-3 text-[13px] font-black text-neon-green">{followers} followers</span>
                    )}
                    {isPresent(city) && (
                        <span className="flex h-8 items-center gap-1.5 rounded-full bg-white/[0.08] px-3 text-[13px] font-bold text-zinc-200"><MapPin size={13} /> {city}</span>
                    )}
                    {shownNiches.map(n => (
                        <span key={n} className="flex h-8 items-center gap-1.5 rounded-full bg-white/[0.08] px-3 text-[13px] font-bold text-zinc-200"><Sparkles size={12} /> {n}</span>
                    ))}
                    {!followers && !isPresent(city) && !shownNiches.length && <><Shimmer className="h-8 w-24" /><Shimmer className="h-8 w-20" /></>}
                </div>

                {s && (
                    <p className={cn('flex items-center gap-1.5 border-t border-white/[0.08] pt-3 text-[13px] font-semibold', s.tone)}>
                        <s.icon size={15} className={cn('shrink-0', s.spin && 'animate-spin')} /> {s.label}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CreatorPass;
