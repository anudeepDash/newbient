import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Check from 'lucide-react/dist/esm/icons/check';
import Loader2 from 'lucide-react/dist/esm/icons/loader-circle';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Button, Sheet, TextInput } from '../../../components/app';
import { useAppStore } from '../../../lib/store/appStore';
import { cn } from '../../../lib/utils';
import { CREATOR_NICHE_OPTIONS } from '../../../lib/creator/options';
import { INTENTS, useAuthGate, useResumeIntent } from '../../auth/AuthGate';
import { appPath } from '../../host';
import { PageBody } from '../../pages/PageHeader';
import { GLASS } from '../../pages/parts';
import Sticker from '../../../components/brand/Sticker';
import { creatorPassId } from '../format';
import { ChoiceChip, Notice, STICKY_DOCK } from '../ui';
import { useCreatorApplication, MAX_NICHES, isValidHandle } from './useCreatorApplication';
import CreatorPass from './CreatorPass';
import { callCreatorApi } from '../api';
import { SwitchGuide, oauthErrorMessage } from './instagramCopy';

/*
 * /creator/apply: one screen, about 30 seconds.
 *
 *   Instagram username → the live creator pass fills in from Instagram
 *   City (one tap) → Niches (up to 3) → College only for campus niches
 *   Sticky "Apply" (or "Connect Instagram & apply" when Meta can prove it)
 *
 * Opened from a card or button (link state { backgroundLocation }) it's a
 * sheet over the current page, with Apply in the sheet's footer; opened by
 * URL it's a page with a sticky dock.
 *
 * Anyone can fill it in; the Instagram lookup works before sign-in. Tapping
 * Apply goes through the one account sheet (sign in, then any missing name,
 * email or verified phone) and then sends it. Rates, bio and other socials
 * are added later from the creator profile. The server decides the status.
 */

const REF_KEY = 'nb_creator_ref';
const readRef = (params) => {
    const fromUrl = params.get('ref') || params.get('referral');
    try {
        if (fromUrl) sessionStorage.setItem(REF_KEY, fromUrl);
        return fromUrl || sessionStorage.getItem(REF_KEY) || '';
    } catch { return fromUrl || ''; }
};
const safeNext = (value) => (typeof value === 'string' && /^\/c\/[^/?#]+$/.test(value) ? value : null);

const CITIES = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Goa', 'Jaipur', 'Chandigarh', 'Kochi'];

/* A glass section with a small label, like the landing site's panels. */
const Block = ({ label, done, hint, children }) => (
    <section className={cn('space-y-3 rounded-[1.75rem] p-5', GLASS)}>
        <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full transition-colors', done ? 'bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.9)]' : 'bg-black/20 dark:bg-white/25')} aria-hidden="true" />
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-zinc-400">{label}</h2>
            {hint && <span className="ml-auto text-[12px] font-semibold text-gray-500 dark:text-zinc-500">{hint}</span>}
        </div>
        {children}
    </section>
);

/* When Instagram can't be read automatically: the creator types their count, and the team confirms it. */
const ManualFollowers = ({ app }) => (
    <div className={cn('space-y-2 rounded-[1.25rem] p-4', GLASS)}>
        <label htmlFor="manual-followers" className="block text-[14px] font-bold">
            {app.lookup.state === 'not_found' ? 'Sure it’s right? Add your followers' : 'We couldn’t read your Instagram. Add your followers'}
        </label>
        <input
            id="manual-followers"
            value={app.manualFollowers}
            onChange={(e) => app.setManualFollowers(e.target.value.replace(/[^\d.,kKmM\s]/g, '').slice(0, 12))}
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 12.5k or 12500"
            className="h-12 w-full rounded-xl bg-white/70 px-4 text-[16px] font-bold text-gray-900 outline-none ring-1 ring-inset ring-black/[0.08] placeholder:font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-neon-green/70 dark:bg-white/[0.06] dark:text-white dark:ring-white/[0.12] dark:placeholder:text-zinc-600"
        />
        {app.manualBelowMin ? (
            <p className="text-[13px] font-medium text-amber-700 dark:text-amber-300">Newbi Creators starts at {app.lookup.minFollowers.toLocaleString('en-IN')} followers.</p>
        ) : app.manualFollowers && !app.manualCount ? (
            <p className="text-[13px] font-medium text-red-600 dark:text-red-400">Enter a number, like 12500 or 12.5k.</p>
        ) : (
            <p className="text-[13px] text-gray-500 dark:text-zinc-400">We’ll check it on your profile before you’re approved.</p>
        )}
        <button type="button" onClick={() => app.check(app.handle)} className="text-[13px] font-bold text-gray-700 underline underline-offset-2 dark:text-zinc-300">Try the automatic check again</button>
    </div>
);

const confetti = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    import('canvas-confetti').then(({ default: fire }) => {
        fire({ particleCount: 90, spread: 70, origin: { y: 0.35 }, colors: ['#39FF14', '#ffffff', '#10b981'] });
    }).catch(() => {});
};

const Success = ({ app, profile, next, welcomePoints, campaignApply }) => {
    const r = app.result;
    const approved = r.status === 'approved';
    useEffect(() => { confetti(); window.scrollTo({ top: 0 }); }, []);
    return (
        <div className="mx-auto max-w-md space-y-6 pt-2 text-center">
            <CreatorPass
                handle={r.creator?.instagram || app.handle}
                lookup={app.lookup}
                profile={{ ...profile, name: r.creator?.name || profile?.name, photoURL: r.creator?.profilePicture || profile?.photoURL }}
                city={r.creator?.city || app.city}
                niches={app.niches}
                customNiche={app.customNiche}
                passId={creatorPassId(r.creator)}
                status={approved ? 'approved' : 'review'}
                className="text-left"
            />
            <div className="space-y-2">
                <h1 className="font-heading text-[30px] font-black leading-tight tracking-tight">{approved ? 'You’re in.' : 'Application sent.'}</h1>
                <p className="text-[15px] text-gray-600 dark:text-zinc-400">
                    {approved
                        ? 'Your creator profile is live. Pick a campaign and apply in a tap.'
                        : r.status === 'pending_verification'
                            ? 'We’ll confirm your followers with Instagram and let you know. You can look at campaigns meanwhile.'
                            : 'We’ll review your profile and let you know. You can look at campaigns meanwhile.'}
                </p>
                {approved && welcomePoints > 0 && <p className="text-[14px] font-bold text-emerald-700 dark:text-neon-green">+{welcomePoints.toLocaleString('en-IN')} welcome points</p>}
            </div>
            {next && campaignApply && (
                campaignApply.state === 'sending'
                    ? <p className="flex items-center justify-center gap-2 text-[14px] font-semibold text-gray-600 dark:text-zinc-400"><Loader2 size={16} className="animate-spin" /> Applying to the campaign…</p>
                    : campaignApply.state === 'done'
                        ? <Notice tone="success" title="Applied to the campaign too">{campaignApply.shortlisted ? 'You’re in. Your deliverables are on the campaign page.' : 'We’ll let you know if you’re picked.'}</Notice>
                        : <Notice tone="info">{campaignApply.error || 'Open the campaign to finish applying.'}</Notice>
            )}
            <div className="space-y-2">
                {next && <Button className="w-full" size="lg" to={appPath(next)} icon={ArrowRight}>Back to the campaign</Button>}
                <Button className="w-full" size="lg" variant={next ? 'secondary' : 'primary'} to={appPath('/creator')}>See open campaigns</Button>
                <Button className="w-full" variant="ghost" to={appPath('/creator/profile')}>Add your rates and bio</Button>
            </div>
        </div>
    );
};

/* Desktop page: two columns, with the live creator pass and Apply pinned on the right. */
const WIDE_QUERY = '(min-width: 1024px)';
const useWide = () => {
    const [wide, setWide] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(WIDE_QUERY).matches));
    useEffect(() => {
        const mq = window.matchMedia?.(WIDE_QUERY);
        if (!mq) return undefined;
        const onChange = (e) => setWide(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return wide;
};

/* The same flow as a page (sticky dock under the tab pill) or a sheet (Apply in its footer). */
const PageFrame = ({ children, footer }) => (
    <PageBody>
        {children}
        {footer && <div className="mx-auto max-w-xl"><div className={STICKY_DOCK}>{footer}</div></div>}
    </PageBody>
);
const SheetFrame = ({ children, footer, onClose }) => (
    <Sheet open onClose={onClose} size="full" width="lg" header={<span className="sr-only">Apply as a creator</span>} footer={footer} bodyClassName="pt-0">
        {children}
    </Sheet>
);

const ApplyFlow = ({ Frame = PageFrame, onClose }) => {
    const [params, setParams] = useSearchParams();
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const creator = useAppStore(s => s.creatorProfile);
    const creatorLoaded = useAppStore(s => s.creatorLoaded);
    const settings = useAppStore(s => s.creatorSettings);
    const loadCreatorSettings = useAppStore(s => s.loadCreatorSettings);
    const referredBy = useMemo(() => readRef(params), [params]);
    const next = safeNext(params.get('next'));
    const app = useCreatorApplication({ referredBy, initialCity: profile?.city || '' });
    // Opened from a campaign ("Get my creator ID"): apply to it as soon as the creator profile exists.
    const [campaignApply, setCampaignApply] = useState(null);
    useEffect(() => {
        if (!app.result || !next || campaignApply) return;
        setCampaignApply({ state: 'sending' });
        callCreatorApi('campaign-apply', { campaignId: next.slice(3), via: 'newbi' }).then((res) => {
            setCampaignApply(res.ok ? { state: 'done', shortlisted: Boolean(res.data?.shortlisted) } : { state: 'error', error: res.error });
        });
    }, [app.result, next, campaignApply]);
    const [otherCity, setOtherCity] = useState(false);
    const [oauthError, setOauthError] = useState(null);
    const gate = useAuthGate();
    const twoColumns = useWide() && Frame === PageFrame;

    useEffect(() => { loadCreatorSettings(); }, [loadCreatorSettings]);
    const { check, handle } = app;

    // Look the handle up while typing (debounced): Meta when it's on, else the public profile.
    useEffect(() => {
        const t = setTimeout(() => check(handle), 500);
        return () => clearTimeout(t);
    }, [handle, check]);

    const go = () => (app.needsConnect ? app.connect() : app.submit());
    // One account sheet: sign in, then any missing name, email or verified phone, then send.
    const apply = () => {
        if (!app.ready) return;
        gate.run({ type: INTENTS.creatorApply }, go, { require: ['name', 'email', 'phoneVerified'] });
    };
    useResumeIntent(INTENTS.creatorApply, () => { if (app.ready) go(); });

    // Back from the Instagram login: show the result, and send the application if that's what was asked.
    useEffect(() => {
        const ig = params.get('ig');
        if (!ig) return;
        if (ig === 'connected') {
            setOauthError(null);
            check(handle);
            if (app.wantsAutoSubmit()) app.submit();
        } else {
            setOauthError(oauthErrorMessage(params.get('reason'), params.get('handle')));
        }
        const clean = new URLSearchParams(params);
        ['ig', 'reason', 'handle'].forEach(k => clean.delete(k));
        setParams(clean, { replace: true });
        // eslint-disable-next-line
    }, [params]);

    if (creatorLoaded && creator && !app.result) return <Navigate to={appPath(next || '/creator')} replace />;
    if (app.result) return <Frame onClose={onClose}><Success app={app} profile={profile} next={next} welcomePoints={settings?.welcomePoints || 0} campaignApply={campaignApply} /></Frame>;
    if (settings && !settings.allowSignups) {
        return (
            <Frame onClose={onClose}>
                <div className="mx-auto max-w-xl"><Notice tone="warn" title="Applications are paused">We’re not taking new creator applications right now. Check back soon.</Notice></div>
            </Frame>
        );
    }

    const { lookup, found } = app;
    const belowMin = found && found.meetsMinimum === false;
    const doneCount = app.steps.filter(s => s.done).length;
    const cityChoices = app.city && !CITIES.includes(app.city) && !otherCity ? [app.city, ...CITIES] : CITIES;
    const err = app.error && !app.error.missing ? app.error : null;

    const dock = (
        <div className="space-y-2">
            {err && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{err.error}</p>}
            <Button
                className="w-full"
                size="lg"
                icon={app.needsConnect ? Instagram : undefined}
                disabled={!app.ready || !isValidHandle(app.handle) || belowMin || found?.alreadyRegistered}
                loading={app.submitting || app.connecting}
                onClick={apply}
            >
                {app.needsConnect ? 'Verify & apply' : app.ready ? 'Apply' : `Apply · ${doneCount} of 3`}
            </Button>
        </div>
    );

    const pass = <CreatorPass handle={app.handle} lookup={lookup} profile={profile} city={app.city} niches={app.niches} customNiche={app.customNiche} manualFollowers={app.manualBelowMin ? 0 : app.manualCount} />;

    const form = (
            <div className={cn('space-y-5', !twoColumns && 'mx-auto max-w-xl')}>
                <header className="pb-1">
                    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gray-700 ring-1 ring-inset ring-black/[0.06] backdrop-blur-md dark:bg-white/[0.06] dark:text-zinc-300 dark:ring-white/10">
                        <span className="h-1.5 w-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.9)]" aria-hidden="true" /> Newbi creators
                    </p>
                    <h1 className="font-heading text-[34px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[40px]">Apply in <Sticker subtle>30 seconds.</Sticker></h1>
                    <p className="mt-2 text-[15px] text-gray-600 dark:text-zinc-400">Type your Instagram. We fill in your profile from it.</p>
                </header>

                {settings?.announcement && <Notice tone="info">{settings.announcement}</Notice>}

                {/* The Instagram field: big, first, and it does the work */}
                <div className="space-y-3">
                    <label className={cn('relative flex h-16 items-center rounded-[1.25rem] pl-4 pr-3', GLASS, lookup.state === 'invalid' || lookup.state === 'not_found' ? 'ring-red-500/60 dark:ring-red-500/60' : 'focus-within:ring-2 focus-within:ring-neon-green/70')}>
                        <span className="sr-only">Instagram username</span>
                        <Instagram size={20} className="mr-2 shrink-0 text-gray-500 dark:text-zinc-400" />
                        <span className="text-[18px] font-bold text-gray-400 dark:text-zinc-500">@</span>
                        <input
                            value={app.handle}
                            onChange={(e) => app.setHandle(e.target.value)}
                            placeholder="yourhandle"
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint="next"
                            className="h-full min-w-0 flex-1 bg-transparent pl-0.5 text-[18px] font-bold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400 dark:text-white dark:placeholder:text-zinc-600"
                        />
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                            {lookup.state === 'checking' ? <Loader2 size={18} className="animate-spin text-gray-400" />
                                : found && !found.alreadyRegistered && !belowMin ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neon-green text-black"><Check size={16} strokeWidth={3} /></span>
                                    : null}
                        </span>
                    </label>
                    {lookup.state === 'invalid' && <p className="px-1 text-[13px] font-medium text-red-600 dark:text-red-400">Use letters, numbers, dots and underscores. No links.</p>}
                    {lookup.state === 'not_found' && <p className="px-1 text-[13px] font-medium text-red-600 dark:text-red-400">We couldn’t find @{lookup.handle} on Instagram. Check the spelling, or add your followers below.</p>}
                    {app.manualAllowed && <ManualFollowers app={app} />}
                    {lookup.state === 'not_professional' && <SwitchGuide onRetry={() => check(handle)} checking={false} />}
                    {found?.alreadyRegistered && <Notice tone="error">This Instagram account is already linked to another Newbi creator profile.</Notice>}
                    {belowMin && !found.alreadyRegistered && (
                        <Notice tone="warn" title={`Newbi Creators starts at ${(found.minFollowers || 0).toLocaleString('en-IN')} followers`}>Keep growing and apply again when you get there.</Notice>
                    )}
                    {app.needsConnect && !belowMin && !found.alreadyRegistered && (
                        <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-400">When you apply, you’ll confirm it’s yours on Instagram and come straight back.</p>
                    )}
                    {oauthError && <Notice tone="error">{oauthError}</Notice>}
                </div>

                {!twoColumns && pass}

                <Block label="Your city" done={app.steps[1].done}>
                    <div className="flex flex-wrap gap-2">
                        {cityChoices.map(c => (
                            <ChoiceChip key={c} selected={app.city === c && !otherCity} onClick={() => { setOtherCity(false); app.setCity(c); }} className="py-2">{c}</ChoiceChip>
                        ))}
                        <ChoiceChip selected={otherCity} onClick={() => { setOtherCity(true); app.setCity(''); }} className="py-2">Other</ChoiceChip>
                    </div>
                    {otherCity && (
                        <TextInput label="City" value={app.city} onChange={(e) => app.setCity(e.target.value)} placeholder="e.g. Mysuru" autoComplete="address-level2" autoFocus />
                    )}
                </Block>

                <Block label="What you post" done={app.steps[2].done} hint={app.niches.length ? `${app.niches.length} of ${MAX_NICHES}` : `Up to ${MAX_NICHES}`}>
                    <div className="flex flex-wrap gap-2">
                        {CREATOR_NICHE_OPTIONS.map(n => (
                            <ChoiceChip key={n.id} selected={app.niches.includes(n.id)} onClick={() => app.toggleNiche(n.id)} className="py-2">{n.label}</ChoiceChip>
                        ))}
                    </div>
                    {app.niches.includes('Others') && (
                        <TextInput label="Your niche" value={app.customNiche} onChange={(e) => app.setCustomNiche(e.target.value)} placeholder="e.g. Sneakers" maxLength={60} />
                    )}
                    {app.campus && (
                        <TextInput
                            label={app.niches.includes('College Pages') ? 'College this page represents' : 'Your college'}
                            value={app.collegeName}
                            onChange={(e) => app.setCollegeName(e.target.value)}
                            placeholder={profile?.college || 'e.g. Christ University'}
                            autoComplete="organization"
                            maxLength={160}
                        />
                    )}
                </Block>

                <label className={cn('flex min-h-[56px] cursor-pointer items-center gap-3 rounded-[1.25rem] px-5 text-[14px] font-semibold text-gray-800 dark:text-zinc-200', GLASS)}>
                    <input type="checkbox" checked={app.whatsappOptIn} onChange={(e) => app.setWhatsappOptIn(e.target.checked)} className="h-5 w-5 shrink-0 accent-[#39FF14]" />
                    Send my tickets and updates on WhatsApp
                </label>
                {referredBy && <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-500">Invite code <span className="font-bold text-gray-800 dark:text-zinc-200">{referredBy}</span> applied.</p>}
            </div>
    );

    if (twoColumns) {
        return (
            <PageBody>
                <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-10 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-14">
                    {form}
                    <aside className="sticky top-24 space-y-4 pt-[7.5rem]">
                        {pass}
                        <div className={cn('rounded-[1.5rem] p-4', GLASS)}>{dock}</div>
                        <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-400">Name, email and phone come from your Newbi account. Rates and bio can be added later.</p>
                    </aside>
                </div>
            </PageBody>
        );
    }

    return <Frame footer={dock} onClose={onClose}>{form}</Frame>;
};

const CreatorApplyPage = ({ overlay = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const close = useCallback(() => {
        if (location.state?.backgroundLocation) navigate(-1);
        else navigate(appPath('/creator'), { replace: true });
    }, [location.state, navigate]);
    const Frame = overlay ? SheetFrame : PageFrame;

    // Open to everyone: signing in happens when you tap Apply (one account sheet).
    return <ApplyFlow Frame={Frame} onClose={close} />;
};

export default CreatorApplyPage;
