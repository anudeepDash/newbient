import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import Users from 'lucide-react/dist/esm/icons/users';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Clock from 'lucide-react/dist/esm/icons/clock';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import HeartHandshake from 'lucide-react/dist/esm/icons/heart-handshake';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Send from 'lucide-react/dist/esm/icons/send';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import { db } from '../../lib/firebase';
import { useAppStore } from '../../lib/store/appStore';
import { communityPost } from '../../lib/passesApi';
import { isPresent } from '../../lib/present';
import { APPLICANT_STATUS, GIG_FIELD_IDS, applicantStatus, canWithdraw, gigDayKeys } from '../../lib/gigApplications';
import { Button, CARD_TYPES, Field, Section, Stat, StatRow, WhatsAppLogo } from '../../components/app';
import ExpandedCard, { ActionBar, BarStatus, ExpandedHero, ExpandedSkeleton, ExpandedTitle } from '../pages/ExpandedCard';
import { ROW } from '../pages/DetailLayout';
import { Notice } from '../creator/ui';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import { requirementsFor } from '../profile/requirements';
import { appPath } from '../host';
import { loadForm, plainText, shareLink } from './communityParts';
import { useT } from '../../i18n';

const FormRenderer = lazy(() => import('../../components/admin/forms/FormRenderer'));

/*
 * A volunteer gig, opened over Community (?gig=ID). Apply moves the drawer
 * to its second step: the gig's built-in form, filled once per signed-in
 * account (back arrow returns to the gig). After sending, the gig shows their
 * status (applied, shortlisted, confirmed with the crew group link, waitlist,
 * not this time) shows in the same place. Older gigs without a form yet take
 * an "I'm interested" tap instead. No outside forms.
 *
 * `item` is the gig from the feed; a closed or unlisted gig (e.g. a
 * confirmed volunteer opening their notification) is read by id.
 */

const toItem = (id, g) => ({
    id,
    title: g.title || '',
    description: g.description || '',
    image: g.image || null,
    city: g.city || null,
    venue: g.location || g.venue || null,
    time: g.time || null,
    days: gigDayKeys(g),
    formId: g.formId || null,
    gigStatus: g.status || 'Open',
    slots: Number(g.slots || g.totalSlots || g.maxVolunteers) || 0,
});

const dayText = (key) => {
    const d = new Date(`${key}T12:00:00`);
    return Number.isNaN(d.getTime()) ? key : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const to12h = (t) => {
    if (!/^\d{2}:\d{2}/.test(t || '')) return t || null;
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
};

const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* The drawer keeps its scroll between steps; each step starts at the top. */
const scrollDrawerTop = (el) => el?.closest('.overflow-y-auto')?.scrollTo({ top: 0 });

const GigSheet = ({ gigId, item, onClose }) => {
    const t = useT();
    const gate = useAuthGate();
    const authUser = useAppStore(s => s.authUser);
    const authReady = useAppStore(s => s.authReady);
    const profile = useAppStore(s => s.profile);

    const [loaded, setLoaded] = useState(null); // gig read by id when it isn't in the feed
    const [form, setForm] = useState(undefined);
    const [application, setApplication] = useState(undefined); // undefined = not known yet
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [askWithdraw, setAskWithdraw] = useState(false);
    const [step, setStep] = useState('details'); // details | apply
    const topRef = useRef(null);
    useEffect(() => { scrollDrawerTop(topRef.current); }, [step]);

    useEffect(() => {
        if (item || !gigId || !db) return undefined;
        let cancelled = false;
        setLoaded(null);
        getDoc(doc(db, 'volunteer_gigs', gigId))
            .then(snap => { if (!cancelled) setLoaded(snap.exists() ? toItem(snap.id, snap.data()) : false); })
            .catch(() => { if (!cancelled) setLoaded(false); });
        return () => { cancelled = true; };
    }, [item, gigId]);

    const gig = item || loaded || null;
    const uid = authUser?.uid || null;

    const refresh = useCallback(async () => {
        if (!uid || !gig?.id) { setApplication(null); return; }
        const res = await communityPost('gig-application', { gigId: gig.id });
        setApplication(res.ok ? res.data.application : null);
        if (!res.ok && res.code !== 'NOT_FOUND') setError(res.error);
    }, [uid, gig?.id]);

    useEffect(() => {
        setApplication(undefined);
        setError('');
        setAskWithdraw(false);
        setStep('details');
        if (authReady) refresh();
    }, [refresh, authReady]);

    // The application form, once someone signed in may need it.
    useEffect(() => {
        if (!gig?.formId || !uid) return undefined;
        let cancelled = false;
        loadForm(gig.formId).then(f => { if (!cancelled) setForm(f && Array.isArray(f.fields) && f.fields.length ? f : null); });
        return () => { cancelled = true; };
    }, [gig?.formId, uid]);

    const prefill = useMemo(() => (profile ? {
        [GIG_FIELD_IDS.name]: profile.name || '',
        [GIG_FIELD_IDS.phone]: profile.phone || '',
        [GIG_FIELD_IDS.email]: profile.email || '',
        [GIG_FIELD_IDS.city]: [profile.city, profile.college].filter(Boolean).join(', '),
        [GIG_FIELD_IDS.instagram]: profile.instagram?.handle ? `@${String(profile.instagram.handle).replace(/^@/, '')}` : '',
    } : null), [profile]);

    const apply = () => gate.run(
        { type: INTENTS.gigApply, payload: { id: gig.id }, returnTo: `${appPath('/community')}?gig=${encodeURIComponent(gig.id)}` },
        () => setStep('apply'),
        { require: requirementsFor('gig') },
    );
    useResumeIntent(INTENTS.gigApply, (payload) => { if (payload?.id === gig?.id) setStep('apply'); });

    // Older gigs without their form yet: the "I'm interested" tap.
    const saveInterest = async () => {
        setBusy('interest');
        setError('');
        const res = await communityPost('gig-interest', { gigId: gig.id });
        setBusy('');
        if (res.ok) refresh();
        else setError(res.error);
    };
    useResumeIntent(INTENTS.gigInterest, (payload) => { if (payload?.id === gig?.id) saveInterest(); });
    const interested = () => gate.run({ type: INTENTS.gigInterest, payload: { id: gig.id }, returnTo: `${appPath('/community')}?gig=${encodeURIComponent(gig.id)}` }, saveInterest, { require: requirementsFor('gig') });

    const withdraw = async () => {
        setBusy('withdraw');
        setError('');
        const res = await communityPost('gig-withdraw', { gigId: gig.id });
        setBusy('');
        setAskWithdraw(false);
        if (res.ok) {
            setApplication(null);
            try { window.localStorage.removeItem(`nb_form_draft_${gig.formId}`); } catch { /* ignore */ }
        } else setError(res.error);
    };

    if (!gig) {
        return (
            <ExpandedCard overlay onClose={onClose} label={t('Volunteer gig')}>
                {loaded === false
                    ? <p className={`${ROW} px-5 py-8 text-center text-[15px] text-gray-600 dark:text-zinc-400`}>{t('This gig isn’t available any more.')}</p>
                    : <ExpandedSkeleton />}
            </ExpandedCard>
        );
    }

    const today = todayKey();
    const over = gig.days.length > 0 && gig.days.every(d => d < today);
    const closed = over || /closed/i.test(String(gig.gigStatus || ''));
    const status = application ? applicantStatus(application.status) : null;
    const copy = status ? APPLICANT_STATUS[status] : null;
    const description = plainText(gig.description);
    const whenText = gig.days.length ? gig.days.map(dayText).join(' · ') : t('Dates to be announced');
    const share = () => shareLink({ title: gig.title, url: `${window.location.origin}${appPath('/community')}?gig=${encodeURIComponent(gig.id)}` });

    let action;
    if (application === undefined && uid) {
        action = <BarStatus>{t('Checking your application…')}</BarStatus>;
    } else if (application) {
        action = application.crewLink
            ? <Button className="flex-1" size="lg" icon={WhatsAppLogo} href={application.crewLink} target="_blank" rel="noopener noreferrer">{t('Join the crew group')}</Button>
            : <BarStatus icon={CircleCheck} tone={status === 'confirmed' ? 'success' : 'default'}>{t(copy.label)}</BarStatus>;
    } else if (closed) {
        action = <BarStatus icon={Lock}>{t('Applications are closed')}</BarStatus>;
    } else if (!gig.formId) {
        action = <Button className="flex-1" size="lg" icon={HeartHandshake} loading={busy === 'interest'} onClick={interested}>{t('I’m interested')}</Button>;
    } else {
        action = <Button className="flex-1" size="lg" icon={Send} onClick={apply}>{t('Apply')}</Button>;
    }

    const canApply = !closed && !application && gig.formId && uid && application !== undefined;
    const submitted = async () => {
        await refresh();
        setStep('details');
    };

    // Step 2: only the application, in the same drawer.
    if (step === 'apply' && canApply) {
        return (
            <ExpandedCard overlay onClose={onClose} label={`${t('Apply')}: ${gig.title}`}>
                <div ref={topRef} className="flex items-center gap-3 pt-5">
                    <button type="button" onClick={() => setStep('details')} aria-label={t('Back to the gig')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-gray-800 transition-colors hover:bg-black/[0.09] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 pr-12">
                        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{t('Apply to volunteer')}</p>
                        <p className="truncate font-heading text-[19px] font-extrabold tracking-[-0.02em]">{gig.title}</p>
                    </div>
                </div>
                {form === undefined ? (
                    <div className={`h-80 animate-pulse ${ROW}`} />
                ) : form ? (
                    <div className="overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08] [&_input]:text-[16px] [&_select]:text-[16px] [&_textarea]:text-[16px]">
                        <Suspense fallback={<div className="h-80 animate-pulse" />}>
                            <FormRenderer form={form} prefill={prefill} onSubmitted={submitted} />
                        </Suspense>
                    </div>
                ) : (
                    <p className={`${ROW} px-5 py-8 text-center text-[15px] text-gray-600 dark:text-zinc-400`}>{t('Applications aren’t open yet. Check back soon.')}</p>
                )}
            </ExpandedCard>
        );
    }

    return (
        <ExpandedCard
            overlay
            onClose={onClose}
            label={gig.title}
            hero={<ExpandedHero image={isPresent(gig.image) ? gig.image : null} icon={CARD_TYPES.gig.icon} chips={[{ icon: MapPin, label: gig.city }, { label: closed ? t('Closed') : /fill/i.test(gig.gigStatus || '') ? t('Filling fast') : null }]} />}
            bar={<ActionBar onShare={share} shareLabel="Share gig">{action}</ActionBar>}
        >
            <div ref={topRef} hidden />
            <ExpandedTitle meta={[{ icon: CalendarDays, label: gig.days[0] ? dayText(gig.days[0]) : null }]} eyebrow={<p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{t('Volunteer gig')}</p>} title={gig.title}>
                <StatRow>
                    <Stat label={t('Spots')} value={gig.slots || null} icon={Users} />
                </StatRow>
            </ExpandedTitle>

            {copy && (
                <Notice
                    tone={copy.tone}
                    title={t(copy.title)}
                    action={application.crewLink ? (
                        <Button size="sm" icon={WhatsAppLogo} href={application.crewLink} target="_blank" rel="noopener noreferrer">{t('Join the crew group')}</Button>
                    ) : canWithdraw(status) && !application.interestOnly && !askWithdraw ? (
                        <button type="button" onClick={() => setAskWithdraw(true)} className="min-h-[40px] text-[13px] font-semibold underline underline-offset-2 opacity-80 hover:opacity-100">{t('Withdraw my application')}</button>
                    ) : null}
                >
                    {application.interestOnly ? t('Saved. The team can see you’re interested.') : t(copy.body)}
                </Notice>
            )}
            {askWithdraw && (
                <Notice
                    tone="warn"
                    title={t('Withdraw your application?')}
                    action={(
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="danger" loading={busy === 'withdraw'} onClick={withdraw}>{t('Withdraw')}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setAskWithdraw(false)}>{t('Keep it')}</Button>
                        </div>
                    )}
                >
                    {t('The team won’t see it any more. You can apply again while applications are open.')}
                </Notice>
            )}
            {error && <Notice tone="error">{error}</Notice>}

            <Section title={t('Details')}>
                <div className={`divide-y divide-black/[0.05] px-4 dark:divide-white/[0.06] ${ROW}`}>
                    <Field icon={CalendarDays} label={gig.days.length > 1 ? t('Days') : t('When')} value={whenText} />
                    <Field icon={Clock} label={t('Reporting time')} value={to12h(gig.time)} />
                    <Field icon={MapPin} label={t('Where')} value={[gig.venue, gig.city].filter(Boolean).join(', ') || null} />
                </div>
            </Section>
            <Section title={t('About')}>
                {description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{description}</p>}
            </Section>

            {!uid && !closed && gig.formId && (
                <p className="px-1 text-[14px] text-gray-500 dark:text-zinc-400">{t('Tap Apply to sign in. Your application is linked to your account, so you can check its status here.')}</p>
            )}
        </ExpandedCard>
    );
};

export default GigSheet;
