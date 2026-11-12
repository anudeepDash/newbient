import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { INPUT } from '../../components/app/controls';
import { useParams, useSearchParams } from 'react-router-dom';
import Gift from 'lucide-react/dist/esm/icons/gift';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import PartyPopper from 'lucide-react/dist/esm/icons/party-popper';
import KeyRound from 'lucide-react/dist/esm/icons/key-round';
import { Button, Section, Sheet, TextInput } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { communityGet, communityPost } from '../../lib/passesApi';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { useAuthGate, useResumeIntent, INTENTS } from '../auth/AuthGate';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import { missingFields } from '../profile/requirements';
import { appPath } from '../host';
import { ActionBar, BackButton, BarStatus, ExpandedHero, ExpandedMissing, ExpandedPage, ExpandedSkeleton, ExpandedTitle, useCloseExpanded } from '../pages/ExpandedCard';
import { Notice } from '../creator/ui';
import { plainText, shareLink } from './communityParts';
import { useT } from '../../i18n';
import { useLocalizedField } from '../../i18n/useHinglish';
import { MAX_CODE_TRIES, winChance } from '../../lib/giveawayRules';
import SpinWheel from './giveaway/SpinWheel';
import { DailyBonus, EntryPass, FairPlay, HowItWorks, InviteCard, Leaderboard, PrizeVault, QuestProgress, QuestRow, fireConfetti, lookOf, useNow } from './giveaway/parts';
import { shareStoryCard } from './giveaway/storyCard';

/*
 * /community/giveaways/:slug — the giveaway as a game.
 *
 * Your name and city come from your profile (only what's missing is asked).
 * Every point is counted on the server (api/_lib/community.js with the rules
 * in lib/giveawayRules.js): entering, quests (links, a quiz, a secret code),
 * friends who enter with your link and the milestones they unlock, spins of
 * the wheel, and a daily bonus. Nothing on this page can set a score; it only
 * shows what the server sends back.
 */

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
    const now = useNow(1000);

    const [g, setG] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [board, setBoard] = useState(null);
    const [step, setStep] = useState(null); // 'name' | 'enter'
    const [wantStart, setWantStart] = useState(false);
    const [form, setForm] = useState({ city: '', college: '', answer: '', instagram: '' });
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [igFor, setIgFor] = useState(null);
    const [quizFor, setQuizFor] = useState(null);
    const [quizPick, setQuizPick] = useState(null);
    const [quizResult, setQuizResult] = useState(null);
    const [codeFor, setCodeFor] = useState(null);
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState('');
    const [burst, setBurst] = useState(null);
    const celebrated = useRef(false);

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
    // The board stays live while the page is open and visible.
    useEffect(() => {
        if (!g?.id) return undefined;
        loadBoard(g.id);
        const id = setInterval(() => { if (document.visibilityState === 'visible') loadBoard(g.id); }, 30000);
        return () => clearInterval(id);
    }, [g?.id, loadBoard]);

    useDynamicMeta({ page: 'giveaway', title: g?.name ? t('{name} | Giveaway', { name: g.name }) : undefined, description: g ? plainText(g.description).slice(0, 160) || undefined : undefined, image: g?.posterUrl || undefined });

    const me = g?.me || null;
    const hiDescription = useLocalizedField('giveaway', g?.id, 'description', g?.description);
    const needed = useMemo(() => (g?.askCollege ? ['city', 'college'] : ['city']).filter(f => missingFields(profile, [f]).length), [g?.askCollege, profile]);
    const needsSheet = needed.length > 0 || Boolean(g?.question) || Boolean(g?.askInstagram);

    // A winner sees confetti once.
    useEffect(() => {
        if (me?.isWinner && !celebrated.current) { celebrated.current = true; fireConfetti(true); }
    }, [me?.isWinner]);

    /* Take the entry the server sent back, and show the points it gained. */
    const applyEntry = useCallback((entry, { confetti } = {}) => {
        setG(prev => {
            const before = Number(prev?.me?.entryScore) || 0;
            const gained = (Number(entry?.entryScore) || 0) - before;
            if (prev?.me && gained > 0) setBurst({ key: Date.now(), points: gained });
            return { ...prev, me: entry };
        });
        if (confetti) fireConfetti(confetti === 'big');
        if (g?.id) setTimeout(() => loadBoard(g.id), 600);
    }, [g?.id, loadBoard]);
    useEffect(() => {
        if (!burst) return undefined;
        const id = setTimeout(() => setBurst(null), 1600);
        return () => clearTimeout(id);
    }, [burst]);

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
            applyEntry(res.data.entry, { confetti: 'big' });
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

    const doTask = async (task, extra = {}) => {
        if (task.type === 'instagram' && !extra.instagram) { setIgFor(task); return null; }
        setBusy(`task:${task.id}`);
        setError('');
        const res = await communityPost('giveaway-task', { giveawayId: g.id, taskId: task.id, ...extra });
        setBusy('');
        if (!res.ok) { setError(res.error); return res; }
        const right = res.data.correct !== false;
        applyEntry(res.data.entry, { confetti: right && ['quiz', 'code'].includes(task.type) ? 'big' : right ? 'small' : null });
        setIgFor(null);
        return res;
    };

    const openTask = (task) => {
        if (task.type === 'quiz') { setQuizFor(task); setQuizPick(null); setQuizResult(null); return; }
        if (task.type === 'code') { setCodeFor(task); setCode(''); setCodeError(''); return; }
        // Open the link straight from the tap (Safari blocks it after an await), then record it.
        if (task.url) window.open(task.url, '_blank', 'noopener');
        doTask(task, task.type === 'instagram' ? { instagram: form.instagram.replace(/^@+/, '') } : {});
    };

    const submitQuiz = async () => {
        if (quizPick === null) return;
        const res = await doTask(quizFor, { choice: quizPick });
        if (res?.ok) setQuizResult(res.data.correct ? 'right' : 'wrong');
        else if (res) setQuizResult('error');
    };

    const submitCode = async () => {
        setCodeError('');
        if (!code.trim()) { setCodeError(t('Type the code.')); return; }
        const res = await doTask(codeFor, { code });
        if (!res) return;
        if (!res.ok) { setCodeError(res.error); setError(''); return; }
        if (res.data.correct) { setCodeFor(null); return; }
        setCodeError(res.data.triesLeft > 0 ? t('Not quite. {count} tries left.', { count: res.data.triesLeft }) : t('No tries left on this code.'));
    };

    const doSpin = async () => {
        setError('');
        const res = await communityPost('giveaway-spin', { giveawayId: g.id });
        if (!res.ok) { setError(res.error); return null; }
        // The wheel lands first; the points arrive with it.
        return { reward: res.data.reward, onLanded: () => applyEntry(res.data.entry, { confetti: res.data.reward.points >= 5 ? 'big' : 'small' }) };
    };

    const claimDaily = async () => {
        setBusy('daily');
        setError('');
        const res = await communityPost('giveaway-checkin', { giveawayId: g.id });
        setBusy('');
        if (res.ok) applyEntry(res.data.entry, { confetti: 'small' }); else setError(res.error);
    };

    const close = useCloseExpanded(appPath('/community'));
    const back = !overlay ? <BackButton to={appPath('/community')}>{t('Community')}</BackButton> : null;
    const [storyBusy, setStoryBusy] = useState(false);

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
    const shareText = g.prize ? t('Win {prize} in the {name} giveaway on Newbi. Enter free with my link:', { prize: g.prize, name: g.name }) : t('Enter the {name} giveaway on Newbi', { name: g.name });
    const share = () => shareLink({ title: g.name, text: shareText, url: shareUrl });
    const toast = (msg, tone = 'success') => useLegacyStore.getState().addToast?.(msg, tone);
    const copyLink = () => navigator.clipboard?.writeText(shareUrl).then(() => toast(t('Link copied.'))).catch(() => toast(t('Copy this link from the address bar.'), 'info'));
    const whatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank', 'noopener');
    const story = async () => {
        setStoryBusy(true);
        const how = await shareStoryCard({ name: g.name, prize: g.prize, posterUrl: g.posterUrl, url: shareUrl, points: me?.entryScore, ctaLabel: t('Enter with my link') });
        setStoryBusy(false);
        if (how === 'downloaded') toast(t('Saved. Post it on your story and add your link sticker.'));
        if (how === 'failed') toast(t('Couldn’t make the picture. Share the link instead.'), 'info');
    };

    const description = plainText(hiDescription);
    const winners = board?.winners || (board?.winner ? [board.winner] : []);
    const tasks = g.tasks || [];
    const doneCount = me ? tasks.filter(task => me.completedTasks?.[task.id]).length : 0;
    const earned = me ? tasks.reduce((n, task) => n + (me.completedTasks?.[task.id] ? task.points : 0), 0) : 0;
    const possible = tasks.reduce((n, task) => n + task.points, 0);
    const maxWheel = Math.max(0, ...(g.wheel || []).map(w => w.points));
    const maxPoints = 1 + possible + (g.showSpinWheel ? maxWheel : 0);
    const chance = me && board?.totalPoints ? winChance(me.entryScore, board.totalPoints, g.winnerCount) : null;
    const spinsLeft = me ? Math.max(0, (me.spinsAllowed || 0) - (me.spinsUsed || 0)) : 0;
    const playing = me && !g.ended;

    const action = me
        ? <BarStatus icon={CircleCheck} tone="success">{me.rank ? t('You’re in · {points} pts · #{rank}', { points: me.entryScore || 0, rank: me.rank }) : t('You’re in · {points} points', { points: me.entryScore || 0 })}</BarStatus>
        : g.ended
            ? <BarStatus>{t('This giveaway has ended.')}</BarStatus>
            : <Button className="flex-1" size="lg" icon={Gift} onClick={onEnter} loading={busy === 'enter' && !step}>{t('Enter free')}</Button>;
    const bar = <ActionBar onShare={share} shareLabel="Share giveaway">{action}</ActionBar>;

    const hero = (
        <ExpandedHero
            image={g.posterUrl}
            ambientColor={g.ambientColor}
            icon={Gift}
            chips={[{ icon: MapPin, label: g.city }, { label: g.ended ? t('Ended') : null }]}
        />
    );

    const questList = (
        <ul className="space-y-2">
            {tasks.map(task => {
                const done = Boolean(me?.completedTasks?.[task.id]);
                const failed = task.type === 'quiz' ? (me?.quizAnswers?.[task.id] && !me.quizAnswers[task.id].correct)
                    : task.type === 'code' ? (!done && (me?.codeTries?.[task.id] || 0) >= MAX_CODE_TRIES) : false;
                return (
                    <QuestRow
                        key={task.id}
                        task={task}
                        done={done}
                        failed={Boolean(failed)}
                        triesLeft={MAX_CODE_TRIES - (me?.codeTries?.[task.id] || 0)}
                        locked={!playing}
                        busy={busy === `task:${task.id}`}
                        onGo={openTask}
                    />
                );
            })}
        </ul>
    );

    return (
        <>
            <ExpandedPage overlay={overlay} onClose={close} back={back} label={g.name} hero={hero} bar={bar}>
                <ExpandedTitle title={g.name} />

                {me?.isWinner && (
                    <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-r from-yellow-300 via-neon-green to-neon-blue p-4 text-black">
                        <PartyPopper size={28} className="shrink-0" />
                        <div>
                            <p className="font-heading text-[20px] font-black leading-tight">{t('You won!')}</p>
                            <p className="text-[13px] font-semibold">{me.prize ? t('{prize} is yours. Check your email and WhatsApp for what’s next.', { prize: me.prize }) : t('Check your email and WhatsApp for what’s next.')}</p>
                        </div>
                    </div>
                )}

                {me && <EntryPass me={me} name={profile?.name || t('Your entry')} chance={chance} burst={burst} />}

                <PrizeVault g={g} board={board} now={now} />

                {winners.length > 0 && !me?.isWinner && (
                    <Notice tone="success" title={winners.length === 1 ? t('Winner: {name}', { name: winners[0].name }) : t('Winners: {names}', { names: winners.map(w => w.name).join(', ') })} />
                )}
                {error && !step && !quizFor && !codeFor && <Notice tone="error">{error}</Notice>}

                {!me && !g.ended && <HowItWorks maxPoints={maxPoints} />}

                {tasks.length > 0 && (me || !g.ended) && (
                    <Section title={me ? t('Quests') : t('Quests you’ll unlock')}>
                        <div className="space-y-3">
                            {me && <QuestProgress done={doneCount} total={tasks.length} earned={earned} possible={possible} />}
                            {questList}
                        </div>
                    </Section>
                )}

                {playing && g.dailyBonus?.enabled && <DailyBonus g={g} me={me} busy={busy === 'daily'} onClaim={claimDaily} />}

                {playing && g.showSpinWheel && (
                    <Section title={t('Bonus wheel')}>
                        <div className="rounded-3xl bg-white/60 p-5 ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.04] dark:ring-white/[0.08]">
                            <SpinWheel wheel={g.wheel} spinsLeft={spinsLeft} history={me.spins || []} onSpin={doSpin} />
                            {spinsLeft === 0 && g.bonusSpinEvery > 0 && (
                                <p className="mt-4 text-center text-[13px] font-semibold text-gray-500 dark:text-zinc-400 sm:text-left">{g.bonusSpinEvery === 1 ? t('Invite a friend to earn another spin.') : t('Every {n} friends you invite earn another spin.', { n: g.bonusSpinEvery })}</p>
                            )}
                        </div>
                    </Section>
                )}

                {playing && (
                    <Section title={t('Invite')}>
                        <InviteCard g={g} me={me} onShare={share} onWhatsApp={whatsApp} onStory={story} onCopy={copyLink} storyBusy={storyBusy} />
                    </Section>
                )}

                <Section title={t('Leaderboard')}>
                    <Leaderboard board={board} me={me} myId={me?.id} />
                </Section>

                <Section title={t('About')}>
                    {description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{description}</p>}
                </Section>

                <FairPlay />
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
                    {g.askInstagram && <TextInput label={t('Instagram username')} hint={t('For the follow quest')} autoCapitalize="none" autoCorrect="off" placeholder={t('yourhandle')} value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />}
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
                footer={<Button className="w-full" onClick={() => doTask(igFor, { instagram: form.instagram.replace(/^@+/, '') })} loading={Boolean(igFor) && busy === `task:${igFor?.id}`}>{t('Save')}</Button>}
            >
                <TextInput label={t('Instagram username')} autoCapitalize="none" autoCorrect="off" placeholder={t('yourhandle')} value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
                {error && igFor && <p role="alert" className="mt-3 text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
            </Sheet>

            {/* Quiz: one try. */}
            <Sheet
                open={Boolean(quizFor)}
                onClose={() => busy === '' && setQuizFor(null)}
                title={quizResult === 'right' ? t('Correct!') : quizResult === 'wrong' ? t('Not this time') : t('Quiz')}
                subtitle={quizResult ? null : t('One try for +{points} points. Pick carefully.', { points: quizFor?.points || 0 })}
                footer={quizResult
                    ? <Button className="w-full" onClick={() => setQuizFor(null)}>{quizResult === 'right' ? t('Nice') : t('Close')}</Button>
                    : <Button className="w-full" onClick={submitQuiz} disabled={quizPick === null} loading={Boolean(quizFor) && busy === `task:${quizFor?.id}`}>{t('Lock it in')}</Button>}
            >
                {quizFor && (
                    <div className="space-y-4">
                        <p className="font-heading text-[20px] font-extrabold leading-snug">{quizFor.question}</p>
                        <div className="grid gap-2">
                            {(quizFor.options || []).map((o, i) => {
                                const picked = quizPick === i;
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        disabled={Boolean(quizResult)}
                                        onClick={() => setQuizPick(i)}
                                        className={cn(
                                            'flex min-h-[52px] items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-semibold ring-1 ring-inset transition-all',
                                            picked ? 'bg-neon-green text-black ring-black' : 'bg-white/60 ring-black/[0.08] hover:ring-black/20 dark:bg-white/[0.05] dark:ring-white/[0.1]',
                                            quizResult === 'wrong' && picked && 'bg-red-500 text-white ring-red-600'
                                        )}
                                    >
                                        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black', picked ? 'bg-black text-neon-green' : 'bg-black/[0.06] dark:bg-white/[0.1]')}>{String.fromCharCode(65 + i)}</span>
                                        {o}
                                    </button>
                                );
                            })}
                        </div>
                        {quizResult === 'right' && <p className="text-center font-heading text-[28px] font-black text-emerald-600 dark:text-neon-green">+{quizFor.points}</p>}
                        {quizResult === 'wrong' && <p className="text-center text-[14px] text-gray-500">{t('No points for this one. Plenty more ways to score below.')}</p>}
                        {quizResult === 'error' && error && <p role="alert" className="text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                    </div>
                )}
            </Sheet>

            {/* Secret code. */}
            <Sheet
                open={Boolean(codeFor)}
                onClose={() => setCodeFor(null)}
                title={t('Secret code')}
                subtitle={codeFor?.label}
                footer={<Button className="w-full" icon={KeyRound} onClick={submitCode} loading={Boolean(codeFor) && busy === `task:${codeFor?.id}`}>{t('Unlock +{points}', { points: codeFor?.points || 0 })}</Button>}
            >
                {codeFor && (
                    <div className="space-y-4">
                        <div className={cn('flex items-center gap-3 rounded-2xl p-4', lookOf('code').bg, 'text-white')}>
                            <KeyRound size={22} className="shrink-0" />
                            <p className="min-w-0 flex-1 text-[14px] font-semibold leading-snug">{codeFor.hint || t('The code is hidden in one of our posts or stories. Find it, type it here.')}</p>
                        </div>
                        {codeFor.url && <Button variant="secondary" size="sm" href={codeFor.url} target="_blank" rel="noopener noreferrer">{t('Open where it’s hidden')}</Button>}
                        <TextInput
                            label={t('Code')}
                            autoCapitalize="characters"
                            autoCorrect="off"
                            spellCheck={false}
                            inputClassName="font-mono text-[20px] uppercase tracking-[0.25em]"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitCode(); }}
                            error={codeError || undefined}
                            hint={t('{count} tries in all', { count: MAX_CODE_TRIES })}
                        />
                    </div>
                )}
            </Sheet>
        </>
    );
};

export default GiveawayPage;
