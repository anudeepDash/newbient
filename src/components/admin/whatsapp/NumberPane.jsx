import React, { useCallback, useEffect, useState } from 'react';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Activity from 'lucide-react/dist/esm/icons/activity';
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { Button } from '../ui';
import { accent } from '../theme';
import { callOutreach } from '../campaigns/outreach/outreachApi';
import { when } from '../campaigns/outreach/parts';
import { LINE, MUTED } from '../campaigns/outreach/InboxPanel';
import { PaneHeader } from './centerParts';

/*
 * Whether the Newbi number can send right now: Meta's health check, the display
 * name and its review, quality and limit, and how the last real message went
 * (api/_lib/whatsappCenter.js, wa-number). The center shows it as a dot by the
 * title; this pane has the details.
 */

const NAME_STATUS = {
    APPROVED: 'Approved',
    AVAILABLE_WITHOUT_REVIEW: 'In use, no review needed',
    PENDING_REVIEW: 'Waiting for Meta’s review',
    DECLINED: 'Rejected',
    EXPIRED: 'Expired',
    NONE: 'Not submitted',
};
const QUALITY = { GREEN: 'High', YELLOW: 'Medium', RED: 'Low' };
const CAN_SEND = { AVAILABLE: 'Can send', LIMITED: 'Limited', BLOCKED: 'Blocked' };
export const DOT = { green: 'bg-emerald-500 dark:bg-neon-green', amber: 'bg-amber-500', rose: 'bg-rose-500', gray: 'bg-gray-400' };
const PING = { green: 'bg-emerald-400 dark:bg-neon-green', amber: 'bg-amber-400', rose: 'bg-rose-400', gray: '' };
/* The short word next to the dot; the pane has the full story. */
export const SHORT = { green: 'Sending normally', amber: 'Needs a look', rose: 'Not sending', gray: 'Status unknown' };

/* "TIER_1K" → "1,000 a day". */
const limitLabel = (tier) => {
    const m = String(tier || '').match(/^TIER_(\d+)(K)?$/i);
    if (m) return `${(Number(m[1]) * (m[2] ? 1000 : 1)).toLocaleString('en-IN')} a day`;
    if (/UNLIMITED/i.test(tier || '')) return 'No daily limit';
    return tier ? String(tier).replace(/_/g, ' ').toLowerCase() : null;
};

/* The number's state, shared by the dot and the pane. Opening the page gives waiting messages a push. */
export const useNumberStatus = () => {
    const addToast = useStore(s => s.addToast);
    const [state, setState] = useState({ loading: true });
    const [pushing, setPushing] = useState(false);
    const load = useCallback(async () => {
        setState(s => ({ ...s, loading: true }));
        const r = await callOutreach('wa-number');
        setState(r.ok ? { loading: false, ...r.data } : { loading: false, error: r.error });
        return r.ok ? r.data : null;
    }, []);
    // Send what's waiting now (it also runs on its own); held messages try again here too.
    const sendWaiting = useCallback(async ({ quiet = false } = {}) => {
        setPushing(true);
        const r = await callOutreach('outreach-queue-run');
        setPushing(false);
        if (!quiet) {
            if (!r.ok) addToast(r.error, 'error', { title: 'Couldn’t send' });
            else if (r.data.blocked) addToast('Meta is still refusing the number, so they keep waiting.', 'warning', { title: `${r.data.held} tried, still waiting` });
            else addToast(`${r.data.sent} sent${r.data.more ? ', the rest carry on in the background' : ''}.`, r.data.sent ? 'success' : 'info');
        }
        load();
    }, [addToast, load]);
    useEffect(() => { load().then(d => { if (d?.queue?.waiting) sendWaiting({ quiet: true }); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const tone = state.error ? 'gray' : state.verdict?.tone || 'gray';
    return { ...state, tone, label: state.error ? 'Status unavailable' : state.verdict ? SHORT[tone] : 'Checking…', waiting: state.queue?.waiting || 0, load, sendWaiting, pushing };
};

/* The little dot, pulsing while all is well or something needs a look. */
export const StatusDot = ({ status, size = 'h-2.5 w-2.5' }) => (
    <span className={cn('relative flex shrink-0', size)} aria-hidden="true">
        {status.verdict && status.tone !== 'gray' && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-50', PING[status.tone])} />}
        <span className={cn('relative inline-flex rounded-full', size, status.loading && !status.verdict ? 'animate-pulse bg-gray-300 dark:bg-zinc-600' : DOT[status.tone])} />
    </span>
);

const Fact = ({ label, value }) => (value ? (
    <div className="rounded-2xl bg-black/[0.03] px-4 py-3 dark:bg-white/[0.04]">
        <p className={cn('text-[11.5px] font-semibold', MUTED)}>{label}</p>
        <p className="mt-0.5 font-heading text-[15px] font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
) : null);

const NumberPane = ({ status, onClose }) => {
    const { number: n, verdict: v, lastSend, queue } = status;
    const a = accent(status.tone === 'rose' ? 'rose' : status.tone === 'amber' ? 'amber' : status.tone === 'green' ? 'green' : 'gray');
    return (
        <div className="flex h-full min-h-0 flex-col">
            <PaneHeader icon={Activity} title="Number & sending" subtitle="What Meta says about the Newbi number" onClose={onClose}>
                <Button size="sm" variant="ghost" onClick={status.load} disabled={status.loading}><RefreshCw size={13} className={status.loading ? 'animate-spin' : undefined} /> Check again</Button>
            </PaneHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
                    {status.error && <p className={cn('rounded-2xl bg-rose-500/10 p-4 text-[13px] text-rose-700 dark:text-rose-300')}>Couldn’t read the number’s status from Meta: {status.error}</p>}
                    {!status.error && !v && <p className={cn('p-4 text-[13px]', MUTED)}>Checking the number with Meta…</p>}
                    {v && (
                        <>
                            <section className={cn('flex items-start gap-4 rounded-3xl p-5', a.soft)}>
                                <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', a.chip)}><StatusDot status={status} size="h-3.5 w-3.5" /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-heading text-[19px] font-bold text-gray-900 dark:text-white">{v.title}</p>
                                    <p className={cn('text-[13.5px]', MUTED)}>{v.detail}</p>
                                    {(n.phone || n.verifiedName) && <p className="mt-2 text-[13px] font-semibold text-gray-700 dark:text-zinc-200">{[n.verifiedName, n.phone].filter(Boolean).join(' · ')}</p>}
                                </div>
                            </section>
                            <div className="grid grid-cols-2 gap-2.5">
                                <Fact label="Display name" value={NAME_STATUS[n.nameStatus] || n.nameStatus} />
                                <Fact label="Meta says" value={CAN_SEND[n.canSend] || n.canSend} />
                                <Fact label="Quality" value={QUALITY[n.quality] || (n.quality && n.quality !== 'UNKNOWN' ? n.quality : null)} />
                                <Fact label="Daily limit" value={limitLabel(n.limit)} />
                            </div>
                            {n.newNameStatus && n.newNameStatus !== 'NONE' && n.newNameStatus !== n.nameStatus && (
                                <p className={cn('text-[13px]', MUTED)}>A new display name is {String(NAME_STATUS[n.newNameStatus] || n.newNameStatus).toLowerCase()}.</p>
                            )}
                            {n.issues?.length > 0 && (
                                <section className="space-y-2">
                                    <p className="font-heading text-[14px] font-bold">What Meta flags</p>
                                    {n.issues.map((x, i) => (
                                        <div key={i} className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-[13px]">
                                            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
                                            <div>
                                                <span className="font-semibold">{x.entity.charAt(0).toUpperCase() + x.entity.slice(1)}</span>: {x.text}
                                                {x.fix && <span className={cn('block', MUTED)}>{x.fix}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )}
                            {status.waiting > 0 && (
                                <section className={cn('flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-[13px]', LINE)}>
                                    <Hourglass size={16} className="shrink-0 text-amber-600 dark:text-amber-300" />
                                    <span className="min-w-0 flex-1">
                                        <span className="font-semibold">{status.waiting} message{status.waiting === 1 ? '' : 's'} waiting to go out</span>
                                        <span className={cn('block', MUTED)}>
                                            {queue.held ? `${queue.held} held while Meta refuses the number` : 'They go out on their own'}
                                            {queue.nextAt ? ` · next try ${when(queue.nextAt)}` : ''}
                                        </span>
                                    </span>
                                    <Button size="sm" variant="primary" disabled={status.pushing} onClick={() => status.sendWaiting()}>{status.pushing ? 'Sending…' : 'Send now'}</Button>
                                </section>
                            )}
                            {lastSend && (
                                <p className={cn('text-[13px]', MUTED)}>
                                    Last message {when(lastSend.at)}{lastSend.template ? ` (${lastSend.template})` : ''}: <span className={cn('font-semibold', lastSend.status === 'failed' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-neon-green')}>{lastSend.status}</span>
                                    {lastSend.status === 'failed' && lastSend.error ? ` · ${lastSend.error}` : ''}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NumberPane;
