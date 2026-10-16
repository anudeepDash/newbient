import React, { useEffect, useState } from 'react';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Loader2 from 'lucide-react/dist/esm/icons/loader-circle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { Button, TextInput } from '../../../components/app';
import { cn } from '../../../lib/utils';
import { compactCount } from '../format';
import { Notice } from '../ui';
import { isValidHandle } from './useCreatorApplication';

/*
 * Step 1: Instagram, Professional accounts only.
 *
 * With Meta verification on: the handle is checked as you type (Business
 * Discovery), then "Connect Instagram" proves you own it. With it off (until
 * the Meta app is approved): the handle and a follower count go to review.
 */

const SWITCH_STEPS = [
    'Open Instagram and go to your profile.',
    'Tap ☰ → Settings and privacy → Account type and tools.',
    'Tap “Switch to professional account” and pick Creator. It’s free and takes a minute.',
    'Come back here and tap “Check again”.',
];

const OAUTH_ERRORS = {
    denied: 'You closed the Instagram login before it finished.',
    personal: 'That Instagram account is a personal account. Switch it to a Professional (Creator) account, then connect again.',
    mismatch: 'You connected a different Instagram account from the one you typed. Connect @HANDLE, or change the username above.',
    taken: 'That Instagram account is already linked to another Newbi creator profile.',
    expired: 'The Instagram login took too long. Please try again.',
    unavailable: 'Instagram didn’t answer. Please try again in a minute.',
    failed: 'The Instagram login didn’t finish. Please try again.',
};

export const oauthErrorMessage = (reason, handle) => (OAUTH_ERRORS[reason] || OAUTH_ERRORS.failed).replace('HANDLE', handle || 'your account');

const ProfilePreview = ({ profile, connected }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
        {profile.profilePic
            ? <img src={profile.profilePic} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full object-cover" />
            : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.05] dark:bg-white/[0.07]"><Instagram size={20} /></span>}
        <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[15px] font-bold">
                @{profile.username}
                {connected && <BadgeCheck size={16} className="shrink-0 text-emerald-600 dark:text-neon-green" />}
            </p>
            {(profile.name || compactCount(profile.followers)) && (
                <p className="truncate text-[13px] text-gray-500 dark:text-zinc-400">
                    {[profile.name, compactCount(profile.followers) && `${compactCount(profile.followers)} followers`].filter(Boolean).join(' · ')}
                </p>
            )}
        </div>
    </div>
);

const SwitchGuide = ({ onRetry, checking }) => {
    const [open, setOpen] = useState(true);
    return (
        <Notice
            tone="warn"
            title="Switch to a free Professional account"
            action={<Button size="sm" variant="secondary" icon={RefreshCw} loading={checking} onClick={onRetry}>Check again</Button>}
        >
            <p>Newbi checks followers through Instagram itself, which only works for Professional (Creator or Business) accounts. Switching takes about a minute.</p>
            <button type="button" onClick={() => setOpen(o => !o)} className="mt-1 flex items-center gap-1 font-bold underline-offset-2 hover:underline">
                How to switch <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <ol className="mt-1 list-decimal space-y-1 pl-5">
                    {SWITCH_STEPS.map(s => <li key={s}>{s}</li>)}
                </ol>
            )}
        </Notice>
    );
};

const InstagramStep = ({ app, settings, oauthError, onContinue }) => {
    const { handle, setHandle, lookup, check, connect, connecting, followers, setFollowers, error } = app;
    const metaOn = Boolean(settings?.metaVerification);
    const min = settings?.minFollowers || 0;

    // Check the handle while typing (debounced), only when Meta verification is on.
    useEffect(() => {
        if (!metaOn) return undefined;
        const t = setTimeout(() => check(handle), 600);
        return () => clearTimeout(t);
    }, [handle, metaOn, check]);

    const found = lookup.state === 'found' ? lookup : null;
    const belowMin = found && found.meetsMinimum === false;
    const ready = metaOn
        ? (found && !found.alreadyRegistered && !belowMin && (found.connected || found.oauthReady === false)) || lookup.state === 'unavailable'
        : isValidHandle(handle) && Number(String(followers).replace(/[^\d]/g, '')) > 0;

    return (
        <div className="space-y-5">
            <div className="space-y-1">
                <h2 className="font-heading text-[22px] font-black tracking-tight">Your Instagram</h2>
                <p className="text-[15px] text-gray-600 dark:text-zinc-400">
                    {metaOn
                        ? 'We check your followers with Instagram directly, so there’s nothing to screenshot.'
                        : 'Brands see this on your creator profile.'}
                </p>
            </div>

            <TextInput
                label="Instagram username"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourhandle"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                error={lookup.state === 'invalid' ? 'Use only letters, numbers, dots and underscores. No links.' : null}
            />

            {metaOn && (
                <div aria-live="polite" className="space-y-3">
                    {lookup.state === 'checking' && (
                        <p className="flex items-center gap-2 text-[14px] text-gray-500 dark:text-zinc-400"><Loader2 size={16} className="animate-spin" /> Checking with Instagram…</p>
                    )}
                    {found && <ProfilePreview profile={found.profile} connected={found.connected} />}
                    {found?.alreadyRegistered && (
                        <Notice tone="error" title="Already linked">This Instagram account belongs to another Newbi creator profile.</Notice>
                    )}
                    {belowMin && !found.alreadyRegistered && (
                        <Notice tone="warn" title={`Newbi Creators starts at ${min.toLocaleString('en-IN')} followers`}>
                            Keep growing and apply again when you get there.
                        </Notice>
                    )}
                    {(lookup.state === 'not_professional') && <SwitchGuide onRetry={() => check(handle)} checking={false} />}
                    {lookup.state === 'unavailable' && (
                        <Notice tone="info" title="Instagram isn’t answering right now">
                            You can still apply. We’ll confirm your followers shortly and let you know.
                        </Notice>
                    )}
                    {found && !found.connected && !found.alreadyRegistered && !belowMin && (
                        found.oauthReady === false ? (
                            <Notice tone="info">Connecting Instagram opens soon. You can apply now and we’ll confirm your account shortly.</Notice>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-[14px] text-gray-600 dark:text-zinc-400">Now connect it, so we know it’s yours. You’ll sign in on Instagram and come straight back.</p>
                                <Button className="w-full" icon={Instagram} loading={connecting} onClick={connect}>Connect Instagram</Button>
                            </div>
                        )
                    )}
                    {found?.connected && <Notice tone="success">Connected. Your follower count comes straight from Instagram.</Notice>}
                </div>
            )}

            {!metaOn && (
                <TextInput
                    label="Followers"
                    value={followers}
                    onChange={(e) => setFollowers(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder={min ? `At least ${min.toLocaleString('en-IN')}` : 'e.g. 12500'}
                    inputMode="numeric"
                    hint="Our team checks every profile by hand before it goes live."
                />
            )}

            {oauthError && <Notice tone="error">{oauthError}</Notice>}
            {error && !error.missing && <Notice tone="error">{error.error}</Notice>}

            {/* With Meta on, "Connect Instagram" is the next step until it's done. */}
            {(!metaOn || ready) && (
                <Button className="w-full" size="lg" disabled={!ready} onClick={onContinue}>Continue</Button>
            )}
        </div>
    );
};

export default InstagramStep;
