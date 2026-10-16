import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { INPUT } from '../../components/app/controls';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { format } from 'date-fns';
import { AmbientBackdrop, Button, Field, GlassChip, Section, Sheet, Stat, StatRow, TextInput } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { communityGet, communityPost } from '../../lib/passesApi';
import { isPresent } from '../../lib/present';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import { missingFields } from '../profile/requirements';
import { appPath } from '../host';
import { PageBody } from '../pages/PageHeader';
import AppNotFound from '../pages/AppNotFound';
import { plainText, shareLink } from './communityParts';

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

const GiveawayPage = () => {
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

    useDynamicMeta({ page: 'giveaway', title: g?.name ? `${g.name} | Giveaway` : undefined, description: g ? plainText(g.description).slice(0, 160) || undefined : undefined, image: g?.posterUrl || undefined });

    const me = g?.me || null;
    const needed = useMemo(() => (g?.askCollege ? ['city', 'college'] : ['city']).filter(f => missingFields(profile, [f]).length), [g?.askCollege, profile]);
    const needsSheet = needed.length > 0 || Boolean(g?.question) || Boolean(g?.askInstagram);

    const enter = async () => {
        setError('');
        if (g.question && !form.answer.trim()) { setError('Answer the question to enter.'); return; }
        if (needed.includes('city') && !form.city.trim()) { setError('Add your city.'); return; }
        if (needed.includes('college') && !form.college.trim()) { setError('Add your college.'); return; }
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

    if (notFound) return <AppNotFound />;
    if (!g) {
        return (
            <PageBody>
                {loadError
                    ? <p className="mx-auto max-w-md rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center text-[15px] dark:border-white/[0.1]">{loadError}</p>
                    : <div className="mx-auto max-w-2xl space-y-4"><div className="aspect-video animate-pulse rounded-3xl bg-black/[0.05] dark:bg-white/[0.05]" /><div className="h-7 w-2/3 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" /></div>}
            </PageBody>
        );
    }

    const shareUrl = me?.referralCode ? `${window.location.origin}${appPath(`/community/giveaways/${g.slug || slug}`)}?ref=${me.referralCode}` : window.location.href;
    const description = plainText(g.description);
    const winner = board?.winner;

    return (
        <PageBody>
            <div className="mx-auto max-w-2xl space-y-5">
                <Link to={appPath('/community')} className="-ml-2 inline-flex h-10 items-center gap-1 rounded-full px-2 text-[14px] font-bold text-gray-600 dark:text-zinc-400">
                    <ChevronLeft size={18} /> Community
                </Link>

                <article className="relative overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#0c0e14]">
                    <AmbientBackdrop image={g.posterUrl} />
                    {isPresent(g.posterUrl) && (
                        <div className="relative aspect-video w-full overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)', maskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }}>
                            <img src={g.posterUrl} alt="" className="h-full w-full object-cover" decoding="async" />
                            <div className="absolute left-4 top-4"><GlassChip icon={Gift} label={g.ended ? 'Ended' : 'Giveaway'} /></div>
                        </div>
                    )}
                    <div className={isPresent(g.posterUrl) ? 'relative -mt-4 space-y-5 px-5 pb-6 sm:px-7' : 'relative space-y-5 px-5 py-6 sm:px-7'}>
                        <h1 className="font-heading text-[28px] font-black leading-tight tracking-tight sm:text-[34px]">{g.name}</h1>
                        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                            <Field icon={Trophy} label="Prize" value={g.prize} />
                            <Field icon={CalendarDays} label={g.ended ? 'Ended' : 'Closes'} value={endsLabel(g.endsAt)} />
                        </div>

                        {winner && (
                            <p className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-[15px] font-bold text-emerald-800 dark:text-neon-green">
                                <Trophy size={17} /> Winner: {winner.name}{me?.isWinner ? ' (that’s you!)' : ''}
                            </p>
                        )}

                        {me ? (
                            <StatRow>
                                <Stat label="Your points" value={me.entryScore} tone="accent" allowZero />
                                <Stat label="Friends" value={me.referralCount} />
                                <Stat label="Entries" value={board?.totalEntries} />
                            </StatRow>
                        ) : g.ended ? (
                            <p className="rounded-2xl bg-black/[0.04] px-4 py-3 text-center text-[15px] font-semibold text-gray-600 dark:bg-white/[0.05] dark:text-zinc-400">This giveaway has ended.</p>
                        ) : (
                            <div className="space-y-2">
                                <Button size="lg" className="w-full" onClick={onEnter} loading={busy === 'enter' && !step}>Enter giveaway</Button>
                                {error && !step && <p role="alert" className="text-center text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                            </div>
                        )}
                    </div>
                </article>

                {me && !g.ended && (
                    <>
                        <Section title="Earn more points">
                            {g.tasks.length > 0 && (
                                <ul className="space-y-2">
                                    {g.tasks.map(task => {
                                        const done = Boolean(me.completedTasks?.[task.id]);
                                        return (
                                            <li key={task.id} className="flex items-center gap-3 rounded-2xl border border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[15px] font-semibold">{task.label}</p>
                                                    {task.points > 0 && <p className="text-[13px] text-gray-500 dark:text-zinc-400">+{task.points} {task.points === 1 ? 'point' : 'points'}</p>}
                                                </div>
                                                {done
                                                    ? <span className="flex items-center gap-1.5 text-[14px] font-bold text-emerald-700 dark:text-neon-green"><CircleCheck size={16} /> Done</span>
                                                    : <Button size="sm" variant="secondary" icon={task.url ? ExternalLink : undefined} loading={busy === `task:${task.id}`} onClick={() => openTask(task)}>{task.url ? 'Go' : 'Done'}</Button>}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-semibold">Invite friends</p>
                                    <p className="text-[13px] text-gray-500 dark:text-zinc-400">+{g.referralPoints} points for each friend who enters with your link</p>
                                </div>
                                <Button size="sm" variant="secondary" icon={Share2} onClick={() => shareLink({ title: g.name, text: `Enter the ${g.name} giveaway on Newbi`, url: shareUrl })}>Share</Button>
                            </div>
                            {g.showSpinWheel && (
                                <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] font-semibold">Bonus spin</p>
                                        <p className="text-[13px] text-gray-500 dark:text-zinc-400">{me.hasSpunWheel ? `You won ${String(me.spinReward || '').toLowerCase()}.` : `One spin: ${g.wheel.map(w => w.label).join(', ')}`}</p>
                                    </div>
                                    {!me.hasSpunWheel && <Button size="sm" icon={Sparkles} loading={busy === 'spin'} onClick={doSpin}>Spin</Button>}
                                </div>
                            )}
                            {error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                        </Section>
                    </>
                )}

                <Section title="About">
                    {description && <p className="whitespace-pre-line px-1 text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{description}</p>}
                </Section>

                <Section title="Leaderboard">
                    {(board?.leaderboard || []).length > 0 && (
                        <ol className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] px-4 dark:divide-white/[0.06] dark:border-white/[0.08]">
                            {board.leaderboard.map((p, i) => (
                                <li key={p.id} className="flex items-center gap-3 py-3">
                                    <span className="w-6 text-center text-[14px] font-black text-gray-400">{i + 1}</span>
                                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{p.name}</span>
                                    <span className="text-[14px] font-black tabular-nums">{p.entryScore}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </Section>
            </div>

            <CompleteProfileSheet open={step === 'name'} required={['name']} reason="to enter" onClose={() => setStep(s => (s === 'name' ? null : s))} onComplete={() => setTimeout(() => (needsSheet ? setStep('enter') : enter()), 0)} />

            <Sheet
                open={step === 'enter'}
                onClose={() => busy !== 'enter' && setStep(null)}
                title="Enter the giveaway"
                subtitle={g.name}
                footer={<Button className="w-full" size="lg" onClick={enter} loading={busy === 'enter'}>Enter</Button>}
            >
                <div className="space-y-4">
                    {needed.includes('city') && <TextInput label="City" autoComplete="address-level2" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />}
                    {needed.includes('college') && <TextInput label="College" autoComplete="organization" value={form.college} onChange={e => setForm(f => ({ ...f, college: e.target.value }))} />}
                    {g.askInstagram && <TextInput label="Instagram username" hint="For the follow task" autoCapitalize="none" autoCorrect="off" placeholder="yourhandle" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />}
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
                title="Your Instagram"
                subtitle="So we can check the follow when we pick winners."
                footer={<Button className="w-full" onClick={() => doTask(igFor, form.instagram.replace(/^@+/, ''))} loading={Boolean(igFor) && busy === `task:${igFor?.id}`}>Save</Button>}
            >
                <TextInput label="Instagram username" autoCapitalize="none" autoCorrect="off" placeholder="yourhandle" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
            </Sheet>

            <Sheet open={Boolean(spin)} onClose={() => setSpin(null)} title="Bonus spin" footer={<Button className="w-full" onClick={() => setSpin(null)}>Nice</Button>}>
                <p className="py-6 text-center font-heading text-[40px] font-black text-emerald-700 dark:text-neon-green">{spin?.label}</p>
            </Sheet>
        </PageBody>
    );
};

export default GiveawayPage;
