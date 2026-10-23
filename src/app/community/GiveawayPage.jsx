import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { INPUT } from '../../components/app/controls';
import { useParams, useSearchParams } from 'react-router-dom';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { format } from 'date-fns';
import { Button, Section, Sheet, Stat, StatRow, TextInput } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { communityGet, communityPost } from '../../lib/passesApi';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import { missingFields } from '../profile/requirements';
import { appPath } from '../host';
import { ROW } from '../pages/DetailLayout';
import { ActionBar, BackButton, BarStatus, ExpandedHero, ExpandedMissing, ExpandedPage, ExpandedSkeleton, ExpandedTitle, useCloseExpanded } from '../pages/ExpandedCard';
import { Notice } from '../creator/ui';
import { plainText, shareLink } from './communityParts';
import { useT } from '../../i18n';
import { useLocalizedField } from '../../i18n/useHinglish';

/*
 * /community/giveaways/:slug. Your name and city come from your profile (only
 * what's missing is asked), and every point is counted on the server: 1 for
 * entering, each task, 3 per friend who enters with your link, and the bonus
 * spin. Nothing on this page can set a score.
 */

const endsLabel = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : format(d, "EEE d MMM, h:mm a");
};

const GiveawayPage = ({ overlay = false }) => {
    const t = useT();
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const referredBy = searchParams.get('ref') || '';
    const uid = useAppStore(s => s.authUser?.uid);
    const authReady = useAppStore(s => s.authReady);
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const updateProfile = useAppStore(s => s.updateProfile);
    const gate = useAuthGate();

    const [g, setG] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [board, setBoard] = useState(null);
    const [step, setStep] = useState(null); // 'name' | 'enter'
    const [wantStart, setWantStart] = useState(false);
    const [form, setForm] = useState({ city: '', college: '', answer: '', instagram: '' });
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [spin, setSpin] = useState(null);
    const [igFor, setIgFor] = useState(null);

    const load = useCallback(async () => {
        const res = await communityGet('giveaway', { slug });
        if (res.ok) { setG(res.data.giveaway); setLoadError(''); } else if (res.status === 404) setNotFound(true); else setLoadError(res.error);
    }, [slug]);
    useEffect(() => { if (authReady) load(); }, [load, authReady, uid]);

    const loadBoard = useCallback(async (id) => {
        try {
            const res = await fetch(`/api/forms?type=giveaway-board&id=${encodeURIComponent(id)}`);
            const json = await res.json();
            if (json?.success) setBoard(json);
        } catch { /* the board is a nicety */ }
    }, []);
    useEffect(() => { if (g?.id) loadBoard(g.id); }, [g?.id, g?.me?.entryScore, loadBoard]);

    useDynamicMeta({ page: 'giveaway', title: g?.name ? t('{name} | Giveaway', { name: g.name }) : undefined, description: g ? plainText(g.description).slice(0, 160) || undefined : undefined, image: g?.posterUrl || undefined });

    const me = g?.me || null;
    const hiDescription = useLocalizedField('giveaway', g?.id, 'description', g?.description);
    const needed = useMemo(() => (g?.askCollege ? ['city', 'college'] : ['city']).filter(f => missingFields(profile, [f]).length), [g?.askCollege, profile]);
    const needsSheet = needed.length > 0 || Boolean(g?.question) || Boolean(g?.askInstagram);

    const enter = async () => {
        setError('');
        if (g.question && !form.answer.trim()) { setError(t('Answer the question to enter.')); return; }
        if (needed.includes('city') && !form.city.trim()) { setError(t('Add your city.')); return; }
        if (needed.includes('college') && !form.college.trim()) { setError(t('Add your college.')); return; }
        setBusy('enter');
        // Keep what they typed on their profile, so the next giveaway doesn't ask again.
        const patch = Object.fromEntries(needed.map(f => [f, form[f].trim()]));
        if (Object.keys(patch).length) await updateProfile(patch).catch(() => {});
        const res = await communityPost('giveaway-enter', {
            giveawayId: g.id, answer: form.answer, instagram: form.instagram, referredBy,
            city: form.city || profile?.city, college: form.college || profile?.college,
        });
        setBusy('');
        if (res.ok) {
            setStep(null);
            setG(prev => ({ ...prev, me: res.data.entry }));
            return;
        }
        if (res.code === 'DUPLICATE') { setStep(null); load(); return; }
        if (res.code === 'PROFILE_INCOMPLETE' && (res.missing || []).includes('name')) { setStep('name'); return; }
        setError(res.error);
    };

    const start = () => {
        setError('');
        if (missingFields(profile, ['name']).length) { setStep('name'); return; }
        if (needsSheet) setStep('enter');
        else enter();
    };

    useEffect(() => {
        if (wantStart && uid && profileLoaded && g) {
            setWantStart(false);
            if (!g.me && !g.ended) start();
        }
    }, [wantStart, uid, profileLoaded, g]); // eslint-disable-line react-hooks/exhaustive-deps

    // One account sheet: sign in and a name first; city/college/answer are asked in the entry sheet.
    const onEnter = () => gate.run({ type: INTENTS.giveawayEnter, payload: { slug } }, () => setWantStart(true), { require: ['name'] });
    useResumeIntent(INTENTS.giveawayEnter, () => setWantStart(true));

    const doTask = async (task, instagram) => {
        if (task.type === 'instagram' && !instagram) { setIgFor(task); return; }
        setBusy(`task:${task.id}`);
        setError('');
        const res = await communityPost('giveaway-task', { giveawayId: g.id, taskId: task.id, instagram });
        setBusy('');
        if (res.ok) { setG(prev => ({ ...prev, me: res.data.entry })); setIgFor(null); } else setError(res.error);
    };

    const openTask = (task) => {
        // Open the link straight from the tap (Safari blocks it after an await), then record it.
        if (task.url) window.open(task.url, '_blank', 'noopener');
        doTask(task, task.type === 'instagram' ? form.instagram.replace(/^@+/, '') : undefined);
    };

    const doSpin = async () => {
        setBusy('spin');
        setError('');
        const res = await communityPost('giveaway-spin', { giveawayId: g.id });
        setBusy('');
        if (res.ok) { setSpin(res.data.reward); setG(prev => ({ ...prev, me: res.data.entry })); } else setError(res.error);
    };

    const close = useCloseExpanded(appPath('/community'));
    const back = !overlay ? <BackButton to={appPath('/community')}>{t('Community')}</BackButton> : null;

    if (!g) {
        // In a fragment like the loaded page below, so the sheet stays put when the data arrives.
        return (
            <>
            <ExpandedPage
                overlay={overlay}
                onClose={close}
                back={back}
                label={t('Giveaway')}
                body={notFound || loadError
                    ? <ExpandedMissing title={t('Giveaway not found')} message={notFound ? t('It may have ended or the link is wrong.') : loadError} action={<Button variant="secondary" to={appPath('/community')}>{t('See what’s on')}</Button>} />
                    : <ExpandedSkeleton />}
            />
            </>
        );
    }

    const shareUrl = me?.referralCode ? `${window.location.origin}${appPath(`/community/giveaways/${g.slug || slug}`)}?ref=${me.referralCode}` : window.location.href;
    const share = () => shareLink({ title: g.name, text: t('Enter the {name} giveaway on Newbi', { name: g.name }), url: shareUrl });
    const description = plainText(hiDescription);
    const winner = board?.winner;

    const rowCls = `flex items-center gap-3 px-4 py-3.5 ${ROW}`;

    const action = me
        ? <BarStatus icon={CircleCheck} tone="success">{t('You’re in · {points} points', { points: me.entryScore || 0 })}</BarStatus>
        : g.ended
            ? <BarStatus>{t('This giveaway has ended.')}</BarStatus>
            : <Button className="flex-1" size="lg" icon={Gift} onClick={onEnter} loading={busy === 'enter' && !step}>{t('Enter giveaway')}</Button>;
    const bar = <ActionBar onShare={share} shareLabel="Share giveaway">{action}</ActionBar>;

    const hero = (
        <ExpandedHero
            image={g.posterUrl}
            icon={Gift}
            chips={[{ icon: MapPin, label: g.city }, { label: g.ended ? t('Ended') : null }]}
        />
    );

    return (
        <>
            <ExpandedPage overlay={overlay} onClose={close} back={back} label={g.name} hero={hero} bar={bar}>
                <ExpandedTitle meta={[{ icon: CalendarDays, label: endsLabel(g.endsAt) ? (g.ended ? t('Ended {date}', { date: endsLabel(g.endsAt) }) : t('Closes {date}', { date: endsLabel(g.endsAt) })) : null }]} title={g.name}>
                    <StatRow className="flex-wrap sm:flex-nowrap">
                        <Stat label={t('Prize')} value={g.prize} icon={Trophy} tone="accent" className={String(g.prize || '').length > 14 ? 'basis-full sm:basis-0' : undefined} />
                        {me && <Stat label={t('Your points')} value={me.entryScore} allowZero />}
                        {me && <Stat label={t('Friends')} value={me.referralCount} allowZero />}
                        <Stat label={t('Entries')} value={board?.totalEntries} />
                    </StatRow>
                </ExpandedTitle>

                {winner && (
                    <Notice tone="success" title={me?.isWinner ? t('Winner: {name} (that’s you!)', { name: winner.name }) : t('Winner: {name}', { name: winner.name })} />
                )}
                {error && !step && <Notice tone="error">{error}</Notice>}

                {me && !g.ended && (
                    <Section title={t('Earn more points')}>
                        <div className="space-y-2">
                            {g.tasks.length > 0 && (
                                <ul className="space-y-2">
                                    {g.tasks.map(task => {
                                        const done = Boolean(me.completedTasks?.[task.id]);
                                        return (
                                            <li key={task.id} className={rowCls}>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[15px] font-semibold">{task.label}</p>
                                                    {task.points > 0 && <p className="text-[13px] text-gray-500 dark:text-zinc-400">{task.points === 1 ? t('+{points} point', { points: task.points }) : t('+{points} points', { points: task.points })}</p>}
                                                </div>
                                                {done
                                                    ? <span className="flex items-center gap-1.5 text-[14px] font-bold text-emerald-700 dark:text-neon-green"><CircleCheck size={16} /> {t('Done')}</span>
                                                    : <Button size="sm" variant="secondary" icon={task.url ? ExternalLink : undefined} loading={busy === `task:${task.id}`} onClick={() => openTask(task)}>{task.url ? t('Go') : t('Done')}</Button>}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <div className={rowCls}>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-semibold">{t('Invite friends')}</p>
                                    <p className="text-[13px] text-gray-500 dark:text-zinc-400">{t('+{points} points for each friend who enters with your link', { points: g.referralPoints })}</p>
                                </div>
                                <Button size="sm" variant="secondary" icon={Share2} onClick={share}>{t('Share')}</Button>
                            </div>
                            {g.showSpinWheel && (
                                <div className={rowCls}>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] font-semibold">{t('Bonus spin')}</p>
                                        <p className="text-[13px] text-gray-500 dark:text-zinc-400">{me.hasSpunWheel ? t('You won {reward}.', { reward: String(me.spinReward || '').toLowerCase() }) : t('One spin: {options}', { options: g.wheel.map(w => w.label).join(', ') })}</p>
                                    </div>
                                    {!me.hasSpunWheel && <Button size="sm" icon={Sparkles} loading={busy === 'spin'} onClick={doSpin}>{t('Spin')}</Button>}
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                <Section title={t('About')}>
                    {description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{description}</p>}
                </Section>

                <Section title={t('Leaderboard')}>
                    {(board?.leaderboard || []).length > 0 && (
                        <ol className={`divide-y divide-black/[0.05] px-4 dark:divide-white/[0.06] ${ROW}`}>
                            {board.leaderboard.map((p, i) => (
                                <li key={p.id} className="flex items-center gap-3 py-3">
                                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-black ${i === 0 ? 'bg-neon-green text-black' : 'text-gray-400'}`}>{i + 1}</span>
                                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{p.name}</span>
                                    <span className="text-[14px] font-black tabular-nums">{p.entryScore}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </Section>
            </ExpandedPage>

            <CompleteProfileSheet open={step === 'name'} required={['name']} reason={t('to enter')} onClose={() => setStep(s => (s === 'name' ? null : s))} onComplete={() => setTimeout(() => (needsSheet ? setStep('enter') : enter()), 0)} />

            <Sheet
                open={step === 'enter'}
                onClose={() => busy !== 'enter' && setStep(null)}
                title={t('Enter the giveaway')}
                subtitle={g.name}
                footer={<Button className="w-full" size="lg" onClick={enter} loading={busy === 'enter'}>{t('Enter')}</Button>}
            >
                <div className="space-y-4">
                    {needed.includes('city') && <TextInput label={t('City')} autoComplete="address-level2" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />}
                    {needed.includes('college') && <TextInput label={t('College')} autoComplete="organization" value={form.college} onChange={e => setForm(f => ({ ...f, college: e.target.value }))} />}
                    {g.askInstagram && <TextInput label={t('Instagram username')} hint={t('For the follow task')} autoCapitalize="none" autoCorrect="off" placeholder={t('yourhandle')} value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />}
                    {g.question && (
                        <label className="block space-y-1.5">
                            <span className="block text-[13px] font-semibold text-gray-600 dark:text-zinc-400">{g.question}</span>
                            <textarea rows={3} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} className={cn(INPUT, 'px-4 py-3.5')} />
                        </label>
                    )}
                    {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                </div>
            </Sheet>

            <Sheet
                open={Boolean(igFor)}
                onClose={() => setIgFor(null)}
                title={t('Your Instagram')}
                subtitle={t('So we can check the follow when we pick winners.')}
                footer={<Button className="w-full" onClick={() => doTask(igFor, form.instagram.replace(/^@+/, ''))} loading={Boolean(igFor) && busy === `task:${igFor?.id}`}>{t('Save')}</Button>}
            >
                <TextInput label={t('Instagram username')} autoCapitalize="none" autoCorrect="off" placeholder={t('yourhandle')} value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
            </Sheet>

            <Sheet open={Boolean(spin)} onClose={() => setSpin(null)} title={t('Bonus spin')} footer={<Button className="w-full" onClick={() => setSpin(null)}>{t('Nice')}</Button>}>
                <p className="py-6 text-center font-heading text-[40px] font-black text-emerald-700 dark:text-neon-green">{spin?.label}</p>
            </Sheet>
        </>
    );
};

export default GiveawayPage;
