import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Users from 'lucide-react/dist/esm/icons/users';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Mic2 from 'lucide-react/dist/esm/icons/mic-vocal';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { Button, CARD_TYPES, Field, Section, Sheet, Stat, StatRow, TextInput } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { passesGet, passesPost } from '../../lib/passesApi';
import { isPresent } from '../../lib/present';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import { missingFields, requirementsFor } from '../profile/requirements';
import { appPath } from '../host';
import { ROW } from '../pages/DetailLayout';
import { ActionBar, BackButton, BarStatus, ExpandedHero, ExpandedMissing, ExpandedPage, ExpandedSkeleton, ExpandedTitle, useCloseExpanded } from '../pages/ExpandedCard';
import { Notice } from '../creator/ui';
import { VenueField, passWhen } from '../passes/passParts';
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

const GuestlistPage = ({ overlay = false }) => {
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
    const [guestNames, setGuestNames] = useState([]);
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
        const names = guestNames.slice(0, guests - 1).map(n => String(n || '').trim());
        const res = await passesPost('register-guestlist', { guestlistId: id, guests, guestNames: names, taskSubmission: gl?.task ? task : null });
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
    const hiDescription = useLocalizedField('guestlist', id, 'description', gl?.description);
    const description = useMemo(() => plainText(hiDescription), [hiDescription]);

    const close = useCloseExpanded(appPath('/community'));
    const back = !overlay ? <BackButton to={appPath('/community')}>{t('Community')}</BackButton> : null;
    const KindIcon = CARD_TYPES.guestlist.icon;

    if (!gl) {
        return (
            <ExpandedPage
                overlay={overlay}
                onClose={close}
                back={back}
                label={t('Guestlist')}
                body={loadError
                    ? <ExpandedMissing title={t('Guestlist not found')} message={loadError} action={<Button variant="secondary" to={appPath('/community')}>{t('See what’s on')}</Button>} />
                    : <ExpandedSkeleton />}
            />
        );
    }

    const statusChip = gl.past ? t('Ended') : gl.closed ? t('Closed') : gl.full ? t('Full') : gl.spotsLeft !== null && gl.spotsLeft <= 20 ? t('{count} spots left', { count: gl.spotsLeft }) : null;
    const share = () => shareLink({ title: gl.title, url: window.location.href });

    // The action bar: your place once you're on the list, otherwise the way on.
    const action = me?.status === 'pending'
        ? <BarStatus icon={Hourglass} tone="warn">{t('Request sent. We’ll send your pass once you’re approved.')}</BarStatus>
        : me
            ? (me.ref
                ? <Button className="flex-1" size="lg" icon={Ticket} to={appPath(`/p/${me.ref}`)}>{gl.mode === 'rsvp' ? t('Open my RSVP') : t('Open my pass')}</Button>
                : <Button className="flex-1" size="lg" variant="secondary" to={appPath('/community')}>{t('See My guestlists')}</Button>)
            : !gl.open
                ? <BarStatus>{gl.past ? t('This event has happened.') : gl.full ? t('This guestlist is full.') : t('This guestlist is closed.')}</BarStatus>
                : <Button className="flex-1" size="lg" icon={KindIcon} onClick={register} loading={submitting && !step}>{gl.mode === 'rsvp' ? t('RSVP') : t('Get on the list')}</Button>;
    const bar = <ActionBar onShare={share} shareLabel="Share guestlist">{action}</ActionBar>;

    const hero = (
        <ExpandedHero
            image={gl.image}
            icon={KindIcon}
            chips={[
                { icon: MapPin, label: gl.city },
                { label: statusChip, tone: gl.open ? 'warn' : 'default' },
            ]}
        />
    );
    const lineUp = (gl.artists || []).join(', ');

    return (
        <>
            <ExpandedPage overlay={overlay} onClose={close} back={back} label={gl.title} hero={hero} bar={bar}>
                <ExpandedTitle meta={[{ icon: CalendarDays, label: when }]} title={gl.title}>
                    <StatRow>
                        <Stat label={t('Entry')} value={gl.mode === 'rsvp' ? t('RSVP') : t('QR pass')} icon={KindIcon} tone="accent" />
                        <Stat label={t('Spots left')} value={gl.open && gl.spotsLeft !== null ? gl.spotsLeft : null} icon={Users} allowZero />
                        <Stat label={t('Per person')} value={(gl.perUserLimit || 1) > 1 ? t('Up to {max}', { max: gl.perUserLimit }) : null} icon={Users} />
                    </StatRow>
                </ExpandedTitle>

                {me && me.status !== 'pending' && <Notice tone="success" title={t('You’re on the list.')}>{gl.mode === 'rsvp' ? t('Your RSVP is confirmed.') : t('Show your pass at the gate.')}</Notice>}
                {!me && gl.open && gl.needsApproval && <Notice tone="info">{t('The team reviews requests before sending passes.')}</Notice>}
                {error && !step && <Notice tone="error">{error}</Notice>}

                <Section title={t('Details')}>
                    <div className={`divide-y divide-black/[0.05] px-4 dark:divide-white/[0.06] ${ROW}`}>
                        <Field icon={CalendarDays} label={t('When')} value={when} />
                        <VenueField event={gl} />
                        <Field icon={Mic2} label={t('Line-up')} value={lineUp} />
                    </div>
                </Section>

                {gl.task && !me && (
                    <Section title={t('To get on the list')}>
                        <div className={`${ROW} px-4 py-3.5`}>
                            <p className="text-[15px] font-bold">{gl.task.title || t('A quick task')}</p>
                            {isPresent(gl.task.description) && <p className="mt-1 whitespace-pre-line text-[14px] text-gray-600 dark:text-zinc-400">{gl.task.description}</p>}
                        </div>
                    </Section>
                )}

                <Section title={t('About')}>
                    {description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{description}</p>}
                </Section>
            </ExpandedPage>

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
                    {guests > 1 && (
                        <div className="space-y-3">
                            <div>
                                <p className="text-[16px] font-bold">{t('Who’s coming with you?')}</p>
                                <p className="text-[13px] text-gray-500 dark:text-zinc-400">{t('Their names go on the door list. You can leave these blank.')}</p>
                            </div>
                            {Array.from({ length: guests - 1 }, (_, i) => (
                                <TextInput
                                    key={i}
                                    id={`guest-name-${i + 2}`}
                                    label={t('Guest {n}', { n: i + 2 })}
                                    value={guestNames[i] || ''}
                                    onChange={(e) => setGuestNames(list => { const next = [...list]; next[i] = e.target.value; return next; })}
                                    maxLength={80}
                                    autoComplete="off"
                                    autoCapitalize="words"
                                    placeholder={t('Full name')}
                                />
                            ))}
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
