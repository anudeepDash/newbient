import React, { useEffect, useMemo, useRef, useState } from 'react';
import Shuffle from 'lucide-react/dist/esm/icons/shuffle';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Users from 'lucide-react/dist/esm/icons/users';
import Info from 'lucide-react/dist/esm/icons/info';
import Sheet from '../Sheet';
import { Avatar, Badge, Button } from '../ui';
import { Field, Toggle, Choice, fieldCls } from '../uploads/UploadKit';
import { useStore } from '../../../lib/store';
import { notifySpecificUser } from '../../../lib/notificationTriggers';
import { cn } from '../../../lib/utils';
import { buildPool, chanceOf, drawFrom, entryPoints, giveawayState } from './giveawayUtils';

/*
 * The winner draw. Set it up (how many, the prize, points or equal chances,
 * who's left out), draw, re-roll anyone who can't be reached, then confirm.
 * Confirming re-checks every winner on the server side of a transaction and
 * logs the draw (who, when, by whom, pool size, re-rolls) on the giveaway.
 */

const pct = (n) => (n >= 0.1 ? `${Math.round(n * 100)}%` : n >= 0.001 ? `${(n * 100).toFixed(1)}%` : '<0.1%');

const WinnerDrawSheet = ({ open, onClose, giveaway, entries }) => {
    const addToast = useStore(s => s.addToast);
    const [step, setStep] = useState('setup');
    const [count, setCount] = useState(1);
    const [prize, setPrize] = useState('');
    const [mode, setMode] = useState('points');
    const [minPoints, setMinPoints] = useState('');
    const [onePerPerson, setOnePerPerson] = useState(true);
    const [closeAfter, setCloseAfter] = useState(true);
    const [notify, setNotify] = useState(true);
    const [drawn, setDrawn] = useState([]);
    const [rerolled, setRerolled] = useState([]);
    const [shuffleName, setShuffleName] = useState('');
    const [saving, setSaving] = useState(false);
    const timer = useRef(null);

    useEffect(() => {
        if (!open) return;
        setStep('setup');
        setDrawn([]);
        setRerolled([]);
        setPrize(giveaway?.prize || '');
        setCloseAfter(giveawayState(giveaway) !== 'open');
        setCount(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, giveaway?.id]);
    useEffect(() => () => clearInterval(timer.current), []);

    const { pool, left } = useMemo(() => buildPool(entries || [], { minPoints: Number(minPoints) || 0, onePerPerson }), [entries, minPoints, onePerPerson]);
    const want = Math.max(1, Math.min(Number(count) || 1, pool.length || 1));

    const shuffleThen = (fn) => {
        if (!pool.length) return;
        setStep('drawing');
        let ticks = 0;
        clearInterval(timer.current);
        timer.current = setInterval(() => {
            ticks += 1;
            setShuffleName(pool[Math.floor(Math.random() * pool.length)]?.name || '');
            if (ticks >= 12) {
                clearInterval(timer.current);
                fn();
                setStep('result');
            }
        }, 70);
    };

    const draw = () => shuffleThen(() => {
        setRerolled([]);
        setDrawn(drawFrom(pool, want, mode));
    });

    const reroll = (entry) => {
        const exclude = new Set([...drawn.map(d => d.id), ...rerolled.map(r => r.id), entry.id]);
        const [next] = drawFrom(pool, 1, mode, exclude);
        if (!next) { addToast('Everyone eligible has already been drawn.', 'info'); return; }
        setRerolled(prev => [...prev, entry]);
        setDrawn(prev => prev.map(d => (d.id === entry.id ? next : d)));
    };

    const confirmWinners = async () => {
        if (saving || !drawn.length) return;
        setSaving(true);
        try {
            const prizeText = prize.trim();
            await useStore.getState().confirmGiveawayWinners(
                giveaway.id,
                drawn.map(e => ({ entryId: e.id, name: e.name || '', prize: prizeText || null })),
                { poolSize: pool.length, mode, rerolled: rerolled.map(r => ({ entryId: r.id, name: r.name || '' })) },
                { close: closeAfter }
            );
            let notified = 0;
            if (notify) {
                await Promise.all(drawn.filter(e => e.userId).map(e => notifySpecificUser(
                    e.userId,
                    'You won!',
                    `Congratulations, you've won${prizeText ? ` ${prizeText}` : ''} in the ${giveaway.name} giveaway. Open the giveaway for details.`,
                    `/giveaway/${giveaway.slug}`,
                    'giveaway'
                ).then(() => { notified += 1; }).catch(() => {})));
            }
            addToast(`${drawn.length === 1 ? `${drawn[0].name || 'The winner'} is` : `${drawn.length} winners are`} confirmed${closeAfter ? ' and the giveaway is closed' : ''}.${notified ? ` ${notified} notified.` : ''}`, 'success');
            onClose();
        } catch (err) {
            console.error(err);
            addToast(err?.message && !/firestore|permission|network/i.test(err.message) ? `${err.message} Draw again.` : "Couldn't save the winners. Please try again.", 'error');
            setStep('setup');
        } finally {
            setSaving(false);
        }
    };

    const footer = step === 'setup' ? (
        <Button variant="accent" onClick={draw} disabled={!pool.length} className="h-12 w-full"><Shuffle size={16} /> Draw {want} winner{want === 1 ? '' : 's'}</Button>
    ) : step === 'result' ? (
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('setup')} disabled={saving} className="h-12">Back</Button>
            <Button variant="secondary" onClick={draw} disabled={saving} className="h-12"><RotateCcw size={15} /> Draw again</Button>
            <Button variant="success" onClick={confirmWinners} disabled={saving} className="h-12 flex-1"><Trophy size={15} /> {saving ? 'Saving…' : `Confirm ${drawn.length === 1 ? 'winner' : `${drawn.length} winners`}`}</Button>
        </div>
    ) : null;

    return (
        <Sheet open={open} onClose={() => !saving && onClose()} size="lg" title="Draw winners" subtitle={giveaway?.name} footer={footer} bodyClassName="space-y-4">
            {step === 'setup' && (
                <>
                    <div className={cn('flex items-center gap-3 rounded-2xl p-4', pool.length ? 'bg-rose-500/[0.07] dark:bg-rose-400/[0.06]' : 'bg-amber-500/10')}>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300"><Users size={20} /></span>
                        <div className="min-w-0">
                            <p className="text-[15px] font-bold">{pool.length} eligible {pool.length === 1 ? 'entry' : 'entries'}</p>
                            <p className="text-[12px] text-gray-500">
                                {[
                                    left.winners && `${left.winners} already won`,
                                    left.disqualified && `${left.disqualified} disqualified`,
                                    left.duplicates && `${left.duplicates} duplicate${left.duplicates === 1 ? '' : 's'} skipped`,
                                    left.lowPoints && `${left.lowPoints} below the points minimum`,
                                ].filter(Boolean).join(' · ') || 'Everyone who entered can win'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="How many winners">
                            <input className={fieldCls} type="number" min="1" max={Math.max(1, pool.length)} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
                        </Field>
                        <Field label="Minimum points" optional>
                            <input className={fieldCls} type="number" min="0" inputMode="numeric" value={minPoints} onChange={(e) => setMinPoints(e.target.value)} placeholder="Any" />
                        </Field>
                    </div>
                    <Field label="Prize" optional hint="Saved on each winner and shown in their notification">
                        <input className={fieldCls} value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. 2 GA passes" />
                    </Field>
                    <div>
                        <p className="mb-1.5 text-[12px] font-bold text-gray-500">Chances</p>
                        <Choice value={mode} onChange={setMode} options={[
                            { value: 'points', label: 'More points, more chances', hint: 'Each point is a ticket in the hat' },
                            { value: 'equal', label: 'Equal chance', hint: 'One ticket each' },
                        ]} />
                    </div>
                    <div className="divide-y divide-black/[0.06] rounded-2xl border border-black/[0.06] px-4 dark:divide-white/[0.06] dark:border-white/[0.08]">
                        <div className="py-3"><Toggle label="One chance per person" hint="Skip later entries with the same phone or email" checked={onePerPerson} onChange={setOnePerPerson} /></div>
                        <div className="py-3"><Toggle label="Close the giveaway after confirming" hint="Stops new entries and shows the winner on the page" checked={closeAfter} onChange={setCloseAfter} /></div>
                        <div className="py-3"><Toggle label="Notify the winners" hint="In-app notification for signed-in entrants" checked={notify} onChange={setNotify} /></div>
                    </div>
                    <p className="flex gap-2 text-[12px] text-gray-500"><Info size={14} className="mt-0.5 shrink-0" /> Winners and disqualified entries are never drawn. Each draw is logged on the giveaway with who ran it and when.</p>
                </>
            )}

            {step === 'drawing' && (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-300"><Shuffle size={28} /></span>
                    <p className="min-h-[2rem] text-[22px] font-extrabold tracking-tight">{shuffleName}</p>
                    <p className="text-[13px] text-gray-500">Drawing from {pool.length} entries…</p>
                </div>
            )}

            {step === 'result' && (
                <>
                    <p className="text-[13px] text-gray-500">Can't reach someone, or they broke the rules? Re-roll just that pick. Nothing is saved until you confirm.</p>
                    <ul className="space-y-2">
                        {drawn.map((e, i) => (
                            <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-black/[0.08] p-3 dark:border-white/[0.08]">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-[13px] font-extrabold text-amber-700 dark:text-amber-300">{i + 1}</span>
                                <Avatar name={e.name} size={40} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-bold">{e.name || 'No name'}</p>
                                    <p className="truncate text-[12px] text-gray-500">{[e.phone, e.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        <Badge tone="violet">{entryPoints(e)} pts</Badge>
                                        <Badge tone="gray">{pct(chanceOf(e, pool, mode))} chance</Badge>
                                    </div>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => reroll(e)} disabled={saving} className="h-10"><RotateCcw size={13} /> Re-roll</Button>
                            </li>
                        ))}
                    </ul>
                    {drawn.length < want && <p className="text-[13px] font-semibold text-amber-600">Only {drawn.length} eligible {drawn.length === 1 ? 'entry was' : 'entries were'} left to draw.</p>}
                    {rerolled.length > 0 && <p className="text-[12px] text-gray-500">Re-rolled: {rerolled.map(r => r.name || 'No name').join(', ')}</p>}
                </>
            )}
        </Sheet>
    );
};

export default WinnerDrawSheet;
