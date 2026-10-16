import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import PartyPopper from 'lucide-react/dist/esm/icons/party-popper';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import { Button } from '../../../components/app';
import { useAppStore } from '../../../lib/store/appStore';
import { isPresent } from '../../../lib/present';
import AuthGate, { INTENTS } from '../../auth/AuthGate';
import CompleteProfileSheet from '../../profile/CompleteProfileSheet';
import { missingFields, requirementsFor } from '../../profile/requirements';
import { appPath } from '../../host';
import PageHeader, { PageBody } from '../../pages/PageHeader';
import { HeroPanel } from '../../pages/parts';
import { Notice, StepBars } from '../ui';
import { useCreatorApplication } from './useCreatorApplication';
import InstagramStep, { oauthErrorMessage } from './InstagramStep';
import DetailsStep, { validateDetails } from './DetailsStep';

/*
 * /creator/apply: the creator application, two steps.
 *
 * Name, email, verified phone, city and photo come from the profile; when
 * any is missing, CompleteProfileSheet asks for just those first. The server
 * decides the status and writes creators/{uid} and users/{uid}.capabilities.
 */

const REF_KEY = 'nb_creator_ref';
const readRef = (params) => {
    const fromUrl = params.get('ref') || params.get('referral');
    try {
        if (fromUrl) sessionStorage.setItem(REF_KEY, fromUrl);
        return fromUrl || sessionStorage.getItem(REF_KEY) || '';
    } catch { return fromUrl || ''; }
};

const IdentityCard = ({ profile, onEdit }) => {
    const rows = [
        { icon: Mail, value: profile?.email },
        { icon: Phone, value: profile?.phoneVerified ? profile.phone : null },
        { icon: MapPin, value: profile?.city },
    ].filter(r => isPresent(r.value));
    return (
        <div className="flex items-center gap-3 rounded-3xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.07] dark:bg-[#0c0e14]">
            {profile?.photoURL
                ? <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
                : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neon-green/15 text-lg font-black text-emerald-700 dark:text-neon-green">{(profile?.name || '?').charAt(0).toUpperCase()}</span>}
            <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-gray-500 dark:text-zinc-500">Applying as</p>
                {isPresent(profile?.name) && <p className="truncate text-[16px] font-bold">{profile.name}</p>}
                {rows.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-gray-600 dark:text-zinc-400">
                        {rows.map(({ icon: Icon, value }) => (
                            <span key={value} className="flex min-w-0 items-center gap-1"><Icon size={12} className="shrink-0" /><span className="truncate">{value}</span></span>
                        ))}
                    </div>
                )}
            </div>
            <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
        </div>
    );
};

/* Where to go after applying: a campaign the creator came from (/c/:id), else creator home. */
const safeNext = (value) => (typeof value === 'string' && /^\/c\/[^/?#]+$/.test(value) ? value : null);

const ResultPanel = ({ result, welcomePoints, next }) => {
    const approved = result.status === 'approved';
    const verifying = result.status === 'pending_verification';
    return (
        <HeroPanel eyebrow="Newbi Creators" title={approved ? 'You’re in.' : 'Application sent.'}>
            <div className="flex items-start gap-3 text-[15px] text-gray-700 dark:text-zinc-300">
                {approved ? <PartyPopper size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-neon-green" /> : <Hourglass size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />}
                <p>
                    {approved
                        ? 'Your creator profile is live. Open campaigns are waiting for you.'
                        : verifying
                            ? 'We’ll confirm your followers with Instagram shortly and email you as soon as it’s done.'
                            : 'Our team reviews every profile and will email you once it’s checked.'}
                </p>
            </div>
            {approved && welcomePoints > 0 && (
                <p className="text-[14px] font-semibold text-emerald-700 dark:text-neon-green">+{welcomePoints.toLocaleString('en-IN')} welcome points added</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
                {next && <Button to={appPath(next)}>Back to the campaign</Button>}
                <Button variant={next ? 'secondary' : 'primary'} to={appPath('/creator')}>{approved ? 'See campaigns' : 'Go to creator home'}</Button>
            </div>
        </HeroPanel>
    );
};

const ApplyFlow = () => {
    const [params, setParams] = useSearchParams();
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const creator = useAppStore(s => s.creatorProfile);
    const creatorLoaded = useAppStore(s => s.creatorLoaded);
    const settings = useAppStore(s => s.creatorSettings);
    const loadCreatorSettings = useAppStore(s => s.loadCreatorSettings);
    const referredBy = useMemo(() => readRef(params), [params]);
    const next = safeNext(params.get('next'));
    const app = useCreatorApplication({ referredBy });
    const [sheet, setSheet] = useState({ open: false, editAll: false, fields: null });
    const [oauthError, setOauthError] = useState(null);
    const [fieldError, setFieldError] = useState(null);

    useEffect(() => { loadCreatorSettings(); }, [loadCreatorSettings]);

    // Back from the Instagram login.
    useEffect(() => {
        const ig = params.get('ig');
        if (!ig) return;
        if (ig === 'connected') {
            setOauthError(null);
            app.check(app.handle);
        } else {
            setOauthError(oauthErrorMessage(params.get('reason'), params.get('handle')));
        }
        const clean = new URLSearchParams(params);
        ['ig', 'reason', 'handle'].forEach(k => clean.delete(k));
        setParams(clean, { replace: true });
        // Only when the query changes.
        // eslint-disable-next-line
    }, [params]);

    const required = requirementsFor('creatorApply');
    const missing = profileLoaded ? missingFields(profile, required) : [];

    // Ask for missing profile details once, before anything else.
    useEffect(() => {
        if (profileLoaded && missing.length && !sheet.open && !sheet.dismissed) setSheet({ open: true, editAll: false });
        // eslint-disable-next-line
    }, [profileLoaded, missing.length]);

    if (creatorLoaded && creator && !app.result) return <Navigate to={appPath(next || '/creator')} replace />;

    const goToDetails = () => { setOauthError(null); app.setError(null); app.setStep(2); window.scrollTo({ top: 0 }); };

    const submit = async () => {
        if (missing.length) return setSheet({ open: true, editAll: false });
        const invalid = validateDetails(app.details, profile?.college);
        setFieldError(invalid);
        if (invalid) return undefined;
        const res = await app.submit();
        if (!res?.ok && res?.missing?.length) setSheet({ open: true, editAll: false, fields: res.missing });
        if (!res?.ok && res?.field && res.field !== 'handle') setFieldError({ field: res.field, error: res.error });
        if (res?.ok) window.scrollTo({ top: 0 });
        return undefined;
    };

    return (
        <PageBody>
            <PageHeader eyebrow="Newbi Creators" title={app.result ? 'Welcome' : 'Apply as a creator'} subtitle={app.result ? null : 'Two quick steps. Your contact details come from your profile.'} />

            {!app.result && settings?.announcement && <Notice tone="info">{settings.announcement}</Notice>}

            {settings && !settings.allowSignups && !app.result ? (
                <Notice tone="warn" title="Applications are paused">We’re not taking new creator applications right now. Check back soon.</Notice>
            ) : app.result ? (
                <ResultPanel result={app.result} welcomePoints={settings?.welcomePoints || 0} next={next} />
            ) : (
                <div className="mx-auto max-w-xl space-y-5">
                    {profileLoaded && <IdentityCard profile={profile} onEdit={() => setSheet({ open: true, editAll: true })} />}
                    {missing.length > 0 && (
                        <Notice tone="warn" action={<Button size="sm" variant="secondary" onClick={() => setSheet({ open: true, editAll: false })}>Add details</Button>}>
                            Add the missing details to your profile to apply.
                        </Notice>
                    )}

                    <StepBars step={app.step} labels={['Instagram', 'Your work']} />

                    <div className="rounded-3xl border border-black/[0.06] bg-white p-5 dark:border-white/[0.07] dark:bg-[#0c0e14] sm:p-6">
                        {app.step === 1 ? (
                            <InstagramStep app={app} settings={settings} oauthError={oauthError} onContinue={goToDetails} />
                        ) : (
                            <div className="space-y-6">
                                <button type="button" onClick={() => app.setStep(1)} className="-ml-1 flex h-10 items-center gap-1 rounded-xl px-1 text-[14px] font-bold text-gray-600 dark:text-zinc-400">
                                    <ArrowLeft size={16} /> @{app.handle}
                                </button>
                                <DetailsStep details={app.details} setDetails={app.setDetails} profileCollege={profile?.college} fieldError={fieldError} />
                                {referredBy && <p className="text-[13px] text-gray-500 dark:text-zinc-500">Invite code <span className="font-bold text-gray-800 dark:text-zinc-200">{referredBy}</span> applied.</p>}
                                {app.error && !app.error.missing && !app.error.field && <Notice tone="error">{app.error.error}</Notice>}
                                <div className="sticky bottom-[calc(6.5rem+env(safe-area-inset-bottom))] -mx-5 -mb-5 border-t border-black/[0.06] bg-white p-4 dark:border-white/[0.06] dark:bg-[#0c0e14] sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0 lg:bottom-0">
                                    <Button className="w-full" size="lg" loading={app.submitting} onClick={submit}>Send application</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <CompleteProfileSheet
                open={sheet.open}
                editAll={sheet.editAll}
                required={sheet.fields || required}
                reason="to apply as a creator"
                title={sheet.editAll ? 'Your details' : 'A few details first'}
                onComplete={() => setSheet({ open: false, dismissed: true })}
                onClose={() => setSheet(s => ({ ...s, open: false, dismissed: true }))}
            />
        </PageBody>
    );
};

const CreatorApplyPage = () => {
    const authUser = useAppStore(s => s.authUser);
    if (authUser) return <ApplyFlow />;
    return (
        <PageBody>
            <AuthGate
                title="Apply as a creator"
                message="Sign in to apply. Your name, phone and city carry over from your Newbi account."
                intent={{ type: INTENTS.creatorApply }}
            />
        </PageBody>
    );
};

export default CreatorApplyPage;
