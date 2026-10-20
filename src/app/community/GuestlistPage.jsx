import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Users from 'lucide-react/dist/esm/icons/users';
import Mic2 from 'lucide-react/dist/esm/icons/mic-vocal';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { Button, Field, GlassChip, Section, Sheet } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { passesGet, passesPost } from '../../lib/passesApi';
import { isPresent } from '../../lib/present';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import { missingFields, requirementsFor } from '../profile/requirements';
import { appPath } from '../host';
import { PageBody } from '../pages/PageHeader';
import DetailLayout, { BackLink, DetailSkeleton, Panel, ROW } from '../pages/DetailLayout';
import { passWhen } from '../passes/passParts';
import GuestlistTaskFields, { validateTask } from './GuestlistTaskFields';
import { plainText, shareLink } from './communityParts';
import { useT } from '../../i18n';
import { useLocalizedField } from '../../i18n/useHinglish';

/*
 * /community/g/:id: a guestlist (or an event with its guestlist on). Replaces
 * EventHubModal as a real page, so it can be shared with a proper preview.
 *
 * Register → sign in (resumes here) → only the missing profile fields (name,
 * verified phone) → guests / the guestlist task when there is one → the
 * server issues the pass and sends it (email, WhatsApp, push) → Community →
 * My guestlists.
 */

const GuestlistPage = () => {
    const t = useT();
    const { id } = useParams();
    const uid = useAppStore(s => s.authUser?.uid);
    const authReady = useAppStore(s => s.authReady);
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const gate = useAuthGate();

    const [gl, setGl] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [step, setStep] = useState(null); // null | 'profile' | 'details'
    const [wantStart, setWantStart] = useState(false);
    const [guests, setGuests] = useState(1);
    const [task, setTask] = useState({});
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [profileFields, setProfileFields] = useState(null);

    useDynamicMeta({ page: 'guestlist', title: gl?.title ? t('{title} | Guestlist', { title: gl.title }) : undefined, description: gl ? plainText(gl.description).slice(0, 160) || undefined : undefined, image: gl?.image || undefined });

    const load = useCallback(async () => {
        const res = await passesGet('guestlist', { id });
        if (res.ok) { setGl(res.data.guestlist); setLoadError(''); } else setLoadError(res.error);
    }, [id]);

    useEffect(() => { if (authReady) load(); }, [load, authReady, uid]);

    const me = gl?.me || null;
    const needsDetailsStep = Boolean(gl?.task) || (gl?.perUserLimit || 1) > 1;

    const submit = async () => {
        setError('');
        if (gl?.task) {
            const problem = validateTask(gl.task, task);
            if (problem) { setError(problem); return; }
        }
        setSubmitting(true);
        const res = await passesPost('register-guestlist', { guestlistId: id, guests, taskSubmission: gl?.task ? task : null });
        setSubmitting(false);
        if (res.ok) {
            setStep(null);
            setGl(g => ({ ...g, me: { ref: res.data.ref, status: res.data.status } }));
            load();
            return;
        }
        if (res.code === 'PROFILE_INCOMPLETE') {
            setProfileFields(res.missing || requirementsFor('guestlist'));
            setStep('profile');
            return;
        }
        setError(res.error);
        if (['FULL', 'CLOSED'].includes(res.code)) load();
    };

    // After sign-in and the profile check: the guests/task step, or straight to registering.
    const proceed = () => {
        if (needsDetailsStep) setStep('details');
        else submit();
    };

    const start = () => {
        setError('');
        const missing = missingFields(profile, requirementsFor('guestlist'));
        if (missing.length) {
            setProfileFields(requirementsFor('guestlist'));
            setStep('profile');
        } else proceed();
    };

    // Right after sign-in the profile is still loading; start once it's there.
    useEffect(() => {
        if (wantStart && uid && profileLoaded && gl) {
            setWantStart(false);
            if (!gl.me) start();
        }
    }, [wantStart, uid, profileLoaded, gl]); // eslint-disable-line react-hooks/exhaustive-deps

    // One account sheet: sign in and any missing details (name, verified phone), then register.
    const register = () => gate.run({ type: INTENTS.guestlistRegister, payload: { id } }, () => setWantStart(true), { require: requirementsFor('guestlist') });
    useResumeIntent(INTENTS.guestlistRegister, () => setWantStart(true));

    const when = gl ? passWhen({ date: gl.date, time: gl.time }) : null;
    const venue = gl ? [gl.venue, gl.city && !String(gl.venue || '').includes(gl.city) ? gl.city : null].filter(Boolean).join(', ') : null;
    const hiDescription = useLocalizedField('guestlist', id, 'description', gl?.description);
    const description = useMemo(() => plainText(hiDescription), [hiDescription]);

    if (loadError && !gl) {
        return (
            <PageBody>
                <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
                    <p className="text-[17px] font-bold">{t('Guestlist not found')}</p>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">{loadError}</p>
                    <Button variant="secondary" to={appPath('/community')}>{t('See what’s on')}</Button>
                </div>
            </PageBody>
        );
    }

    if (!gl) return <DetailSkeleton />;

    const statusChip = gl.past ? t('Ended') : gl.closed ? t('Closed') : gl.full ? t('Full') : gl.spotsLeft !== null && gl.spotsLeft <= 20 ? t('{count} spots left', { count: gl.spotsLeft }) : null;

    const action = (() => {
        if (me?.status === 'pending') {
            return (
                <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-200">
                    <Hourglass size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="text-[15px] font-bold">{t('Request sent')}</p>
                        <p className="text-[14px]">{t('We’ll send your pass by email and WhatsApp once you’re approved.')}</p>
                    </div>
                </div>
            );
        }
        if (me) {
            return (
                <div className="space-y-3">
                    <p className="text-center text-[15px] font-bold text-emerald-700 dark:text-neon-green">{t('You’re on the list.')}</p>
                    {me.ref
                        ? <Button size="lg" className="w-full" icon={Ticket} to={appPath(`/p/${me.ref}`)}>{gl.mode === 'rsvp' ? t('Open my RSVP') : t('Open my pass')}</Button>
                        : <Button size="lg" variant="secondary" className="w-full" to={appPath('/community')}>{t('See My guestlists')}</Button>}
                </div>
            );
        }
        if (!gl.open) {
            return <p className="rounded-2xl bg-black/[0.04] px-4 py-3 text-center text-[15px] font-semibold text-gray-600 dark:bg-white/[0.05] dark:text-zinc-400">{gl.past ? t('This event has happened.') : gl.full ? t('This guestlist is full.') : t('This guestlist is closed.')}</p>;
        }
        return (
            <div className="space-y-2">
                <Button size="lg" className="w-full" onClick={register} loading={submitting && !step}>
                    {gl.mode === 'rsvp' ? t('RSVP') : t('Get on the list')}
                </Button>
                {gl.needsApproval && <p className="text-center text-[13px] text-gray-500 dark:text-zinc-400">{t('The team reviews requests before sending passes.')}</p>}
                {error && !step && <p role="alert" className="text-center text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
            </div>
        );
    })();

    const badges = (
        <>
            <GlassChip icon={Ticket} label={gl.mode === 'rsvp' ? t('RSVP') : t('Guestlist')} />
            {statusChip && <GlassChip label={statusChip} tone={gl.open ? 'warn' : 'default'} />}
        </>
    );

    return (
        <>
            <DetailLayout
                back={<BackLink to={appPath('/community')}>{t('Community')}</BackLink>}
                image={gl.image}
                badges={badges}
                title={gl.title}
                onShare={() => shareLink({ title: gl.title, url: window.location.href })}
            >
                <Panel>
                    <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        <Field icon={CalendarDays} label={t('When')} value={when} />
                        <Field icon={MapPin} label={t('Venue')} value={venue} />
                        <Field icon={Users} label={t('Spots left')} value={gl.open && gl.spotsLeft !== null ? gl.spotsLeft : null} />
                        <Field icon={Mic2} label={t('Line-up')} value={(gl.artists || []).join(', ')} />
                    </div>
                    <div className="pt-1">{action}</div>
                </Panel>

                <Section title={t('About')}>
                    {description && <p className="whitespace-pre-line px-1 text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300 lg:text-[16px]">{description}</p>}
                </Section>

                <Section title={t('To get on the list')}>
                    {gl.task && !me && (
                        <div className={`${ROW} px-4 py-3.5`}>
                            <p className="text-[15px] font-bold">{gl.task.title || t('A quick task')}</p>
                            {isPresent(gl.task.description) && <p className="mt-1 whitespace-pre-line text-[14px] text-gray-600 dark:text-zinc-400">{gl.task.description}</p>}
                        </div>
                    )}
                </Section>
            </DetailLayout>

            <CompleteProfileSheet
                open={step === 'profile'}
                required={profileFields || requirementsFor('guestlist')}
                reason={t('for your pass')}
                onClose={() => setStep(s => (s === 'profile' ? null : s))}
                onComplete={() => setTimeout(proceed, 0)}
            />

            <Sheet
                open={step === 'details'}
                onClose={() => !submitting && setStep(null)}
                title={gl.task ? t('One more step') : t('How many of you?')}
                subtitle={gl.title}
                footer={<Button className="w-full" size="lg" onClick={submit} loading={submitting} disabled={uploading}>{gl.mode === 'rsvp' ? t('Confirm RSVP') : t('Get my pass')}</Button>}
            >
                <div className="space-y-6">
                    {(gl.perUserLimit || 1) > 1 && (
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[16px] font-bold">{t('Guests')}</p>
                                <p className="text-[13px] text-gray-500 dark:text-zinc-400">{t('Including you, up to {max}', { max: gl.perUserLimit })}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button type="button" aria-label={t('Fewer guests')} disabled={guests <= 1} onClick={() => setGuests(g => Math.max(1, g - 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.1] disabled:opacity-40 dark:border-white/[0.12]"><Minus size={16} /></button>
                                <span className="w-6 text-center text-[20px] font-black tabular-nums">{guests}</span>
                                <button type="button" aria-label={t('More guests')} disabled={guests >= gl.perUserLimit || (gl.spotsLeft !== null && guests >= gl.spotsLeft)} onClick={() => setGuests(g => Math.min(gl.perUserLimit, g + 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.1] disabled:opacity-40 dark:border-white/[0.12]"><Plus size={16} /></button>
                            </div>
                        </div>
                    )}
                    {gl.task && <GuestlistTaskFields task={gl.task} value={task} onChange={setTask} onUploading={setUploading} />}
                    {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                </div>
            </Sheet>
        </>
    );
};

export default GuestlistPage;
