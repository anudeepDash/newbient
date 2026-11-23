import React, { useEffect, useMemo, useState } from 'react';
import AlarmClock from 'lucide-react/dist/esm/icons/alarm-clock';
import X from 'lucide-react/dist/esm/icons/x';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Button } from '../../ui';
import { fieldCls } from '../../uploads/UploadKit';
import { Spinner } from '../parts';
import { callOutreach } from './outreachApi';

/*
 * Outreach → Send on WhatsApp → Task reminder: when reminders for one task go out by themselves.
 * The team picks up to five times (quick picks, or any date and time); at each, everyone approved who
 * still hasn't sent the task gets a reminder (api/_lib/taskReminders.js). Times are the browser's
 * local time (the team's), saved as UTC.
 */

const MAX_TIMES = 5;
const pad = (n) => String(n).padStart(2, '0');
/* A Date → the value a datetime-local input takes ("2026-11-24T19:00"). */
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const at = (day, hour) => { const d = new Date(day); d.setHours(hour, 0, 0, 0); return d; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export const whenLabel = (iso) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/* Quick picks that are still ahead: this evening or tomorrow, and around the due date when there is one. */
const presetsFor = (dueDay, now = new Date()) => {
    const today = new Date(now);
    const out = [];
    const tonight = at(today, 19);
    if (tonight - now > 30 * 60_000) out.push({ label: 'Today, 7 PM', date: tonight });
    out.push({ label: 'Tomorrow, 11 AM', date: at(addDays(today, 1), 11) });
    out.push({ label: 'Tomorrow, 7 PM', date: at(addDays(today, 1), 19) });
    if (dueDay) {
        const [y, m, d] = dueDay.split('-').map(Number);
        const due = new Date(y, m - 1, d);
        out.push({ label: 'Day before due, 6 PM', date: at(addDays(due, -1), 18) });
        out.push({ label: 'Due day, 10 AM', date: at(due, 10) });
    }
    const seen = new Set();
    return out.filter(p => p.date - now > 60_000 && !seen.has(+p.date) && seen.add(+p.date));
};

const TaskReminderSchedule = ({ campaign, task, saved = [], log = [], viaTaskMessage = false, onSaved }) => {
    const addToast = useStore(s => s.addToast);
    const savedKey = saved.join(',');
    const [times, setTimes] = useState(saved);
    useEffect(() => { setTimes(saved); }, [savedKey, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps
    const [custom, setCustom] = useState('');
    const [saving, setSaving] = useState(false);
    const dirty = [...times].sort().join(',') !== [...saved].sort().join(',');
    const dueDay = String(task?.deadline || campaign?.postingDeadline || '').slice(0, 10) || null;
    const presets = useMemo(() => presetsFor(dueDay), [dueDay, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps
    const full = times.length >= MAX_TIMES;

    const add = (date) => {
        if (!date || Number.isNaN(+date)) return;
        if (date - Date.now() < 60_000) { addToast('Pick a time from a minute from now onwards.', 'warning'); return; }
        const iso = new Date(Math.floor(+date / 60_000) * 60_000).toISOString();
        setTimes(t => (t.includes(iso) || t.length >= MAX_TIMES ? t : [...t, iso].sort()));
    };
    const save = async () => {
        setSaving(true);
        const r = await callOutreach('outreach-task-reminders', { campaignId: campaign.id, taskId: String(task.id), times });
        setSaving(false);
        if (!r.ok) { addToast(r.error || 'Please try again.', 'error', { title: 'Reminders not saved' }); return; }
        addToast(times.length ? `${times.length} reminder${times.length === 1 ? '' : 's'} set for ${task.title || 'this task'}.` : `Reminders off for ${task.title || 'this task'}.`, 'success');
        onSaved?.();
    };

    return (
        <div className="space-y-3 rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
            <div className="flex items-start gap-2.5">
                <AlarmClock size={16} className="mt-0.5 shrink-0 text-amber-500" />
                <div className="min-w-0">
                    <h4 className="text-[13.5px] font-bold">Remind automatically</h4>
                    <p className="text-[12px] leading-snug text-gray-500">At each time, everyone approved who still hasn’t sent this task gets a reminder. Anyone who sent it, or replied STOP, is skipped. Up to {MAX_TIMES} times; they go out within about 15 minutes of each.</p>
                </div>
            </div>

            {times.length ? (
                <ul className="flex flex-wrap gap-2">
                    {times.map(t => (
                        <li key={t} className={cn('flex h-9 items-center gap-1.5 rounded-full pl-3 pr-1 text-[12.5px] font-semibold', saved.includes(t) ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200' : 'bg-gray-900 text-white dark:bg-white dark:text-black')}>
                            {whenLabel(t)}
                            <button type="button" aria-label={`Remove ${whenLabel(t)}`} onClick={() => setTimes(x => x.filter(y => y !== t))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/15"><X size={13} /></button>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-[12.5px] text-gray-500">No reminders set for this task.</p>}

            {!full && (
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        {presets.map(p => (
                            <button key={p.label} type="button" onClick={() => add(p.date)} disabled={times.includes(new Date(Math.floor(+p.date / 60_000) * 60_000).toISOString())}
                                className="flex h-8 items-center gap-1 rounded-full border border-black/[0.08] px-3 text-[12px] font-semibold text-gray-700 hover:border-black/20 disabled:opacity-40 dark:border-white/[0.1] dark:text-zinc-200 dark:hover:border-white/25">
                                <Plus size={12} /> {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="datetime-local" aria-label="Another date and time" className={cn(fieldCls, 'min-w-0 flex-1')} value={custom} min={toLocalInput(new Date())} onChange={(e) => setCustom(e.target.value)} />
                        <Button size="md" disabled={!custom} onClick={() => { add(new Date(custom)); setCustom(''); }}>Add</Button>
                    </div>
                </div>
            )}

            {viaTaskMessage && <p className="text-[11.5px] leading-snug text-amber-700 dark:text-amber-300">The reminder template (campaign_task_reminder) is waiting for Meta, so until then a reminder goes as the task message again, with the same link.</p>}

            {(dirty || saved.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                    {dirty && <Button variant="success" disabled={saving} onClick={save}>{saving ? <Spinner /> : null} {times.length ? 'Save reminders' : 'Turn reminders off'}</Button>}
                    {dirty && <Button variant="ghost" onClick={() => setTimes(saved)}>Undo</Button>}
                    {!dirty && saved.length > 0 && <Button variant="ghost" onClick={() => setTimes([])}>Clear all</Button>}
                </div>
            )}

            {log.length > 0 && (
                <div className="border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                    <p className="mb-1 text-[11.5px] font-bold text-gray-500">Earlier reminders</p>
                    <ul className="space-y-0.5">
                        {[...log].reverse().slice(0, 5).map(l => (
                            <li key={`${l.at}-${l.ranAt}`} className="text-[12px] text-gray-600 dark:text-zinc-300">{whenLabel(l.at)} · {l.note}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default TaskReminderSchedule;
