import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Users from 'lucide-react/dist/esm/icons/users';
import Mic2 from 'lucide-react/dist/esm/icons/mic-vocal';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { AmbientBackdrop, Button, Field, GlassChip, Section, Sheet } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { passesGet, passesPost } from '../../lib/passesApi';
import { isPresent } from '../../lib/present';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import { missingFields, requirementsFor } from '../profile/requirements';
import { appPath } from '../host';
import { PageBody } from '../pages/PageHeader';
import { passWhen } from '../passes/passParts';
import GuestlistTaskFields, { validateTask } from './GuestlistTaskFields';
import { plainText, shareLink } from './communityParts';

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

    useDynamicMeta({ page: 'guestlist', title: gl?.title ? `${gl.title} | Guestlist` : undefined, description: gl ? plainText(gl.description).slice(0, 160) || undefined : undefined, image: gl?.image || undefined });

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

    const register = () => gate.run({ type: INTENTS.guestlistRegister, payload: { id } }, () => setWantStart(true));
    useResumeIntent(INTENTS.guestlistRegister, () => setWantStart(true));

    const when = gl ? passWhen({ date: gl.date, time: gl.time }) : null;
    const venue = gl ? [gl.venue, gl.city && !String(gl.venue || '').includes(gl.city) ? gl.city : null].filter(Boolean).join(', ') : null;
    const description = useMemo(() => plainText(gl?.description), [gl?.description]);

    if (loadError && !gl) {
        return (
            <PageBody>
                <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
                    <p className="text-[17px] font-bold">Guestlist not found</p>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">{loadError}</p>
                    <Button variant="secondary" to={appPath('/community')}>See what’s on</Button>
                </div>
            </PageBody>
        );
    }

    if (!gl) {
        return (
            <PageBody>
                <div className="mx-auto max-w-2xl space-y-4">
                    <div className="aspect-video animate-pulse rounded-3xl bg-black/[0.05] dark:bg-white/[0.05]" />
                    <div className="h-7 w-2/3 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
                    <div className="h-24 animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />
                </div>
            </PageBody>
        );
    }

    const statusChip = gl.past ? 'Ended' : gl.closed ? 'Closed' : gl.full ? 'Full' : gl.spotsLeft !== null && gl.spotsLeft <= 20 ? `${gl.spotsLeft} spots left` : null;

    const action = (() => {
        if (me?.status === 'pending') {
            return (
                <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-200">
                    <Hourglass size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="text-[15px] font-bold">Request sent</p>
                        <p className="text-[14px]">We’ll send your pass by email and WhatsApp once you’re approved.</p>
                    </div>
                </div>
            );
        }
        if (me) {
            return (
                <div className="space-y-3">
                    <p className="text-center text-[15px] font-bold text-emerald-700 dark:text-neon-green">You’re on the list.</p>
                    {me.ref
                        ? <Button size="lg" className="w-full" icon={Ticket} to={appPath(`/p/${me.ref}`)}>{gl.mode === 'rsvp' ? 'Open my RSVP' : 'Open my pass'}</Button>
                        : <Button size="lg" variant="secondary" className="w-full" to={appPath('/community')}>See My guestlists</Button>}
                </div>
            );
        }
        if (!gl.open) {
            return <p className="rounded-2xl bg-black/[0.04] px-4 py-3 text-center text-[15px] font-semibold text-gray-600 dark:bg-white/[0.05] dark:text-zinc-400">{gl.past ? 'This event has happened.' : gl.full ? 'This guestlist is full.' : 'This guestlist is closed.'}</p>;
        }
        return (
            <div className="space-y-2">
                <Button size="lg" className="w-full" onClick={register} loading={submitting && !step}>
                    {gl.mode === 'rsvp' ? 'RSVP' : 'Get on the list'}
                </Button>
                {gl.needsApproval && <p className="text-center text-[13px] text-gray-500 dark:text-zinc-400">The team reviews requests before sending passes.</p>}
                {error && !step && <p role="alert" className="text-center text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
            </div>
        );
    })();

    return (
        <PageBody>
            <div className="mx-auto max-w-2xl space-y-5">
                <Link to={appPath('/community')} className="-ml-2 inline-flex h-10 items-center gap-1 rounded-full px-2 text-[14px] font-bold text-gray-600 dark:text-zinc-400">
                    <ChevronLeft size={18} /> Community
                </Link>

                <article className="relative overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#0c0e14]">
                    <AmbientBackdrop image={gl.image} />
                    {isPresent(gl.image) && (
                        <div className="relative aspect-video w-full overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)', maskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }}>
                            <img src={gl.image} alt="" className="h-full w-full object-cover" decoding="async" />
                            <div className="absolute left-4 top-4 flex gap-2">
                                <GlassChip icon={Ticket} label={gl.mode === 'rsvp' ? 'RSVP' : 'Guestlist'} />
                                {statusChip && <GlassChip label={statusChip} tone={gl.open ? 'warn' : 'default'} />}
                            </div>
                        </div>
                    )}
                    <div className={isPresent(gl.image) ? 'relative -mt-4 space-y-5 px-5 pb-6 sm:px-7' : 'relative space-y-5 px-5 py-6 sm:px-7'}>
                        <div className="flex items-start justify-between gap-3">
                            <h1 className="font-heading text-[28px] font-black leading-tight tracking-tight sm:text-[34px]">{gl.title}</h1>
                            <button
                                type="button"
                                aria-label="Share"
                                onClick={() => shareLink({ title: gl.title, url: window.location.href })}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/[0.08] text-gray-600 dark:border-white/[0.1] dark:text-zinc-300"
                            >
                                <Share2 size={17} />
                            </button>
                        </div>

                        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                            <Field icon={CalendarDays} label="When" value={when} />
                            <Field icon={MapPin} label="Venue" value={venue} />
                            <Field icon={Users} label="Spots left" value={gl.open && gl.spotsLeft !== null ? gl.spotsLeft : null} />
                            <Field icon={Mic2} label="Line-up" value={(gl.artists || []).join(', ')} />
                        </div>

                        {action}
                    </div>
                </article>

                <Section title="About">
                    {description && <p className="whitespace-pre-line px-1 text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{description}</p>}
                </Section>

                <Section title="To get on the list">
                    {gl.task && !me && (
                        <div className="rounded-2xl border border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
                            <p className="text-[15px] font-bold">{gl.task.title || 'A quick task'}</p>
                            {isPresent(gl.task.description) && <p className="mt-1 whitespace-pre-line text-[14px] text-gray-600 dark:text-zinc-400">{gl.task.description}</p>}
                        </div>
                    )}
                </Section>
            </div>

            <CompleteProfileSheet
                open={step === 'profile'}
                required={profileFields || requirementsFor('guestlist')}
                reason="for your pass"
                onClose={() => setStep(s => (s === 'profile' ? null : s))}
                onComplete={() => setTimeout(proceed, 0)}
            />

            <Sheet
                open={step === 'details'}
                onClose={() => !submitting && setStep(null)}
                title={gl.task ? 'One more step' : 'How many of you?'}
                subtitle={gl.title}
                footer={<Button className="w-full" size="lg" onClick={submit} loading={submitting} disabled={uploading}>{gl.mode === 'rsvp' ? 'Confirm RSVP' : 'Get my pass'}</Button>}
            >
                <div className="space-y-6">
                    {(gl.perUserLimit || 1) > 1 && (
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[16px] font-bold">Guests</p>
                                <p className="text-[13px] text-gray-500 dark:text-zinc-400">Including you, up to {gl.perUserLimit}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button type="button" aria-label="Fewer guests" disabled={guests <= 1} onClick={() => setGuests(g => Math.max(1, g - 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.1] disabled:opacity-40 dark:border-white/[0.12]"><Minus size={16} /></button>
                                <span className="w-6 text-center text-[20px] font-black tabular-nums">{guests}</span>
                                <button type="button" aria-label="More guests" disabled={guests >= gl.perUserLimit || (gl.spotsLeft !== null && guests >= gl.spotsLeft)} onClick={() => setGuests(g => Math.min(gl.perUserLimit, g + 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.1] disabled:opacity-40 dark:border-white/[0.12]"><Plus size={16} /></button>
                            </div>
                        </div>
                    )}
                    {gl.task && <GuestlistTaskFields task={gl.task} value={task} onChange={setTask} onUploading={setUploading} />}
                    {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                </div>
            </Sheet>
        </PageBody>
    );
};

export default GuestlistPage;
