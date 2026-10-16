import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Check from 'lucide-react/dist/esm/icons/check';
import Loader2 from 'lucide-react/dist/esm/icons/loader-circle';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Button, Sheet, TextInput } from '../../../components/app';
import { useAppStore } from '../../../lib/store/appStore';
import { cn } from '../../../lib/utils';
import { CREATOR_NICHE_OPTIONS } from '../../../lib/creator/options';
import AuthGate, { INTENTS } from '../../auth/AuthGate';
import CompleteProfileSheet from '../../profile/CompleteProfileSheet';
import { missingFields } from '../../profile/requirements';
import { appPath } from '../../host';
import { PageBody } from '../../pages/PageHeader';
import { creatorPassId } from '../format';
import { ChoiceChip, Notice, STICKY_DOCK } from '../ui';
import { useCreatorApplication, MAX_NICHES, isValidHandle } from './useCreatorApplication';
import CreatorPass from './CreatorPass';
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
 * Phone and email come from the account; CompleteProfileSheet asks only if
 * one is missing, at the moment you tap Apply. Rates, bio and other socials
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

const Step = ({ n, title, done, hint, children }) => (
    <section className="space-y-3">
        <div className="flex items-center gap-3">
            <span className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-black transition-colors',
                done ? 'bg-neon-green text-black' : 'bg-black/[0.06] text-gray-500 dark:bg-white/[0.08] dark:text-zinc-400'
            )}>
                {done ? <Check size={15} strokeWidth={3} /> : n}
            </span>
            <h2 className="text-[17px] font-black tracking-tight">{title}</h2>
            {hint && <span className="ml-auto text-[12px] font-bold text-gray-500 dark:text-zinc-500">{hint}</span>}
        </div>
        <div className="sm:pl-10">{children}</div>
    </section>
);

const confetti = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    import('canvas-confetti').then(({ default: fire }) => {
        fire({ particleCount: 90, spread: 70, origin: { y: 0.35 }, colors: ['#39FF14', '#ffffff', '#10b981'] });
    }).catch(() => {});
};

const Success = ({ app, profile, next, welcomePoints }) => {
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
            <div className="space-y-2">
                {next && <Button className="w-full" size="lg" to={appPath(next)} icon={ArrowRight}>Back to the campaign</Button>}
                <Button className="w-full" size="lg" variant={next ? 'secondary' : 'primary'} to={appPath('/creator')}>See open campaigns</Button>
                <Button className="w-full" variant="ghost" to={appPath('/creator/profile')}>Add your rates and bio</Button>
            </div>
        </div>
    );
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
    const [sheet, setSheet] = useState({ open: false, fields: [] });
    const [otherCity, setOtherCity] = useState(false);
    const [oauthError, setOauthError] = useState(null);
    const afterSheet = useRef(null);

    useEffect(() => { loadCreatorSettings(); }, [loadCreatorSettings]);
    const metaOn = Boolean(settings?.metaVerification);
    const { check, handle } = app;

    // Look the handle up while typing (debounced), when Meta verification is on.
    useEffect(() => {
        if (!metaOn) return undefined;
        const t = setTimeout(() => check(handle), 500);
        return () => clearTimeout(t);
    }, [handle, metaOn, check]);

    // What the account still needs. A name from Instagram counts.
    const missing = useMemo(() => {
        if (!profileLoaded) return [];
        const list = missingFields(profile, ['email', 'phoneVerified']);
        if (!profile?.name && !app.found?.profile?.name) list.unshift('name');
        return list;
    }, [profileLoaded, profile, app.found]);

    const go = () => (app.needsConnect ? app.connect() : app.submit());
    const apply = () => {
        if (!app.ready) return;
        if (missing.length) {
            afterSheet.current = go;
            setSheet({ open: true, fields: missing });
            return;
        }
        go();
    };

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
    if (app.result) return <Frame onClose={onClose}><Success app={app} profile={profile} next={next} welcomePoints={settings?.welcomePoints || 0} /></Frame>;
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
            <div className="flex items-center gap-3">
                <div className="flex gap-1" aria-label={`${doneCount} of 3 done`}>
                    {app.steps.map(s => <span key={s.key} className={cn('h-1.5 w-5 rounded-full transition-colors', s.done ? 'bg-neon-green' : 'bg-black/[0.1] dark:bg-white/[0.12]')} />)}
                </div>
                <Button
                    className="flex-1"
                    size="lg"
                    icon={app.needsConnect ? Instagram : undefined}
                    disabled={!app.ready || !isValidHandle(app.handle) || belowMin || found?.alreadyRegistered}
                    loading={app.submitting || app.connecting}
                    onClick={apply}
                >
                    {app.needsConnect ? 'Verify & apply' : 'Apply'}
                </Button>
            </div>
        </div>
    );

    return (
        <Frame footer={dock} onClose={onClose}>
            <div className="mx-auto max-w-xl space-y-7">
                <header className="space-y-1">
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-neon-green">Newbi Creators</p>
                    <h1 className="font-heading text-[30px] font-black leading-[1.1] tracking-tight sm:text-[36px]">Apply in 30 seconds</h1>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">Your Instagram builds your creator profile.</p>
                </header>

                {settings?.announcement && <Notice tone="info">{settings.announcement}</Notice>}

                <CreatorPass handle={app.handle} lookup={lookup} profile={profile} city={app.city} niches={app.niches} customNiche={app.customNiche} />

                <Step n={1} title="Your Instagram" done={app.steps[0].done}>
                    <div className="space-y-3">
                        <label className="relative block">
                            <span className="sr-only">Instagram username</span>
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-bold text-gray-400 dark:text-zinc-500">@</span>
                            <input
                                value={app.handle}
                                onChange={(e) => app.setHandle(e.target.value)}
                                placeholder="yourhandle"
                                autoComplete="off"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                enterKeyHint="next"
                                className={cn(
                                    'h-14 w-full rounded-2xl border bg-white pl-9 pr-12 text-[17px] font-semibold text-gray-900 outline-none transition-colors placeholder:font-normal placeholder:text-gray-400',
                                    'border-black/[0.1] focus:border-gray-900 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-neon-green/60',
                                    lookup.state === 'invalid' && 'border-red-500/60'
                                )}
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                                {lookup.state === 'checking' ? <Loader2 size={18} className="animate-spin text-gray-400" />
                                    : found && !found.alreadyRegistered && !belowMin ? <Check size={18} strokeWidth={3} className="text-emerald-600 dark:text-neon-green" />
                                        : <Instagram size={18} className="text-gray-400" />}
                            </span>
                        </label>
                        {lookup.state === 'invalid' && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">Use letters, numbers, dots and underscores. No links.</p>}
                        {lookup.state === 'not_professional' && <SwitchGuide onRetry={() => check(handle)} checking={false} />}
                        {found?.alreadyRegistered && <Notice tone="error">This Instagram account is already linked to another Newbi creator profile.</Notice>}
                        {belowMin && !found.alreadyRegistered && (
                            <Notice tone="warn" title={`Newbi Creators starts at ${(found.minFollowers || 0).toLocaleString('en-IN')} followers`}>Keep growing and apply again when you get there.</Notice>
                        )}
                        {app.needsConnect && !belowMin && !found.alreadyRegistered && (
                            <p className="text-[13px] text-gray-500 dark:text-zinc-400">When you apply, you’ll confirm it’s yours on Instagram and come straight back.</p>
                        )}
                        {oauthError && <Notice tone="error">{oauthError}</Notice>}
                    </div>
                </Step>

                <Step n={2} title="Your city" done={app.steps[1].done}>
                    <div className="flex flex-wrap gap-2">
                        {cityChoices.map(c => (
                            <ChoiceChip key={c} selected={app.city === c && !otherCity} onClick={() => { setOtherCity(false); app.setCity(c); }} className="py-2">{c}</ChoiceChip>
                        ))}
                        <ChoiceChip selected={otherCity} onClick={() => { setOtherCity(true); app.setCity(''); }} className="py-2">Other</ChoiceChip>
                    </div>
                    {otherCity && (
                        <TextInput className="mt-3" label="City" value={app.city} onChange={(e) => app.setCity(e.target.value)} placeholder="e.g. Mysuru" autoComplete="address-level2" autoFocus />
                    )}
                </Step>

                <Step n={3} title="What you post" done={app.steps[2].done} hint={app.niches.length ? `${app.niches.length} of ${MAX_NICHES}` : `Up to ${MAX_NICHES}`}>
                    <div className="flex flex-wrap gap-2">
                        {CREATOR_NICHE_OPTIONS.map(n => (
                            <ChoiceChip key={n.id} selected={app.niches.includes(n.id)} onClick={() => app.toggleNiche(n.id)} className="py-2">{n.label}</ChoiceChip>
                        ))}
                    </div>
                    {app.niches.includes('Others') && (
                        <TextInput className="mt-3" label="Your niche" value={app.customNiche} onChange={(e) => app.setCustomNiche(e.target.value)} placeholder="e.g. Sneakers" maxLength={60} />
                    )}
                    {app.campus && (
                        <TextInput
                            className="mt-3"
                            label={app.niches.includes('College Pages') ? 'College this page represents' : 'Your college'}
                            value={app.collegeName}
                            onChange={(e) => app.setCollegeName(e.target.value)}
                            placeholder={profile?.college || 'e.g. Christ University'}
                            autoComplete="organization"
                            maxLength={160}
                        />
                    )}
                </Step>

                <div className="space-y-1 sm:pl-10">
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[14px] text-gray-700 dark:text-zinc-300">
                        <input type="checkbox" checked={app.whatsappOptIn} onChange={(e) => app.setWhatsappOptIn(e.target.checked)} className="h-5 w-5 shrink-0 accent-emerald-600" />
                        Send my tickets and updates on WhatsApp
                    </label>
                    {referredBy && <p className="text-[13px] text-gray-500 dark:text-zinc-500">Invite code <span className="font-bold text-gray-800 dark:text-zinc-200">{referredBy}</span> applied.</p>}
                </div>

            </div>

            <CompleteProfileSheet
                open={sheet.open}
                required={sheet.fields}
                reason="to apply as a creator"
                onComplete={() => { const fn = afterSheet.current; afterSheet.current = null; setSheet({ open: false, fields: [] }); fn?.(); }}
                onClose={() => { afterSheet.current = null; setSheet({ open: false, fields: [] }); }}
            />
        </Frame>
    );
};

const CreatorApplyPage = ({ overlay = false }) => {
    const authUser = useAppStore(s => s.authUser);
    const navigate = useNavigate();
    const location = useLocation();
    const close = useCallback(() => {
        if (location.state?.backgroundLocation) navigate(-1);
        else navigate(appPath('/creator'), { replace: true });
    }, [location.state, navigate]);
    const Frame = overlay ? SheetFrame : PageFrame;

    if (authUser) return <ApplyFlow Frame={Frame} onClose={close} />;
    return (
        <Frame onClose={close}>
            <AuthGate
                title="Apply as a creator"
                message="Sign in to apply. It takes about 30 seconds."
                intent={{ type: INTENTS.creatorApply }}
            />
        </Frame>
    );
};

export default CreatorApplyPage;
