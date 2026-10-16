import React, { useEffect, useRef, useState } from 'react';
import Send from 'lucide-react/dist/esm/icons/send';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import CircleStop from 'lucide-react/dist/esm/icons/circle-stop';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import PauseCircle from 'lucide-react/dist/esm/icons/pause-circle';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import { Button, SegmentedTabs } from '../ui';
import Sheet from '../Sheet';
import { fieldCls } from '../uploads/UploadKit';
import { previewCampaign, queueCampaign, retryQueuedCampaign, cancelQueuedCampaign, kickMailWorker } from '../../../lib/mailApi';
import { formatWhen } from './mailingApi';

/*
 * Review → queue → live progress, in one sheet. Used for new campaigns, the
 * newsletter, and "retry failed" from history.
 *
 * The server sends the campaign in batches within the daily limit, so the
 * admin can close the tab; this sheet only watches `email_campaigns/{id}`.
 *
 * job = {
 *   recipients: [{ email, name, role }], subject, html, accountType, fromName, fromEmail,
 *   mailData (stored on the report so it can be re-opened), options: { audience, campaignId (retry) },
 *   summary: [{ label, value }], warnings: [string], prepare?: async () => ({ html, mailData }),
 *   confirmLabel?, retry?: bool
 * }
 */

// The cron that wakes the worker runs once a day on the current Vercel plan.
const DAILY_RUN = '9:00 am';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const FINAL = ['completed', 'partially_failed', 'failed', 'cancelled'];

const Stat = ({ label, value, tone }) => (
    <div className={cn('rounded-xl p-3', accent(tone).soft)}>
        <p className="text-[12px] font-bold text-gray-500">{label}</p>
        <p className={cn('font-heading text-[22px] font-extrabold tabular-nums', accent(tone).text)}>{fmt(value)}</p>
    </div>
);

const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/** Keeps the server sending while Mailing is open (wakes due scheduled sends and stalled ones). */
export const useMailWorkerKick = (campaigns) => {
    useEffect(() => {
        const due = () => (campaigns || []).some(c => c.queue && (
            (c.status === 'scheduled' && Date.parse(c.scheduledAt || '') <= Date.now())
            || (['queued', 'sending'].includes(c.status) && c.pausedReason !== 'daily_limit' && Date.now() - (Date.parse(c.lastProgressAt || '') || 0) > 2 * 60 * 1000)
        ));
        if (due()) kickMailWorker();
        const id = setInterval(() => { if (due()) kickMailWorker(); }, 60 * 1000);
        return () => clearInterval(id);
    }, [campaigns]);
};

const SendSheet = ({ open, onClose, job, onFinished, onViewReport }) => {
    const [phase, setPhase] = useState('review'); // review → watching → done
    const [problem, setProblem] = useState('');
    const [working, setWorking] = useState(false);
    const [preview, setPreview] = useState(null);
    const [when, setWhen] = useState('now');
    const [scheduledFor, setScheduledFor] = useState('');
    const [campaignId, setCampaignId] = useState(null);
    const [record, setRecord] = useState(null);
    const [queuedInfo, setQueuedInfo] = useState(null);
    const preparedRef = useRef(null); // images are uploaded once
    const finishedRef = useRef(false);

    useEffect(() => {
        if (!open) return;
        setPhase('review');
        setProblem('');
        setWorking(false);
        setPreview(null);
        setWhen('now');
        setScheduledFor(toLocalInput(Date.now() + 60 * 60 * 1000));
        setCampaignId(null);
        setRecord(null);
        setQueuedInfo(null);
        preparedRef.current = null;
        finishedRef.current = false;
    }, [open, job]);

    // How many will actually get it, checked on the server (unsubscribes, duplicates, today's room).
    useEffect(() => {
        if (!open || !job || job.retry) return undefined;
        let alive = true;
        previewCampaign({ recipients: job.recipients, accountType: job.accountType, fromEmail: job.fromEmail })
            .then(p => { if (alive) setPreview(p); })
            .catch(() => { if (alive) setPreview({ error: true }); });
        return () => { alive = false; };
    }, [open, job]);

    // Live progress from the report the worker keeps up to date.
    useEffect(() => {
        if (!campaignId) return undefined;
        return onSnapshot(doc(db, 'email_campaigns', campaignId), (snap) => {
            if (!snap.exists()) return;
            const data = { id: snap.id, ...snap.data() };
            setRecord(data);
            if (FINAL.includes(data.status)) {
                setPhase('done');
                if (!finishedRef.current) {
                    finishedRef.current = true;
                    onFinished?.({ success: data.status === 'completed', sent: Number(data.sentCount || 0), campaignId: data.id, status: data.status });
                }
            }
        }, () => { /* the sheet still shows what the queue call returned */ });
    }, [campaignId, onFinished]);

    // Nudge the worker if progress stalls while this is open.
    useEffect(() => {
        if (phase !== 'watching' || !record || record.status === 'scheduled' || record.pausedReason) return undefined;
        const id = setInterval(() => {
            if (Date.now() - (Date.parse(record.lastProgressAt || '') || 0) > 90 * 1000) kickMailWorker();
        }, 30 * 1000);
        return () => clearInterval(id);
    }, [phase, record]);

    if (!job) return null;
    const count = job.recipients?.length || 0;

    const prepare = async () => {
        if (preparedRef.current) return preparedRef.current;
        if (!job.prepare) return { html: job.html, mailData: job.mailData };
        const ready = await job.prepare();
        preparedRef.current = ready;
        return ready;
    };

    const submit = async () => {
        setProblem('');
        let scheduledAt = null;
        if (when === 'later') {
            const ms = Date.parse(scheduledFor);
            if (!Number.isFinite(ms) || ms < Date.now() + 2 * 60 * 1000) { setProblem('Pick a time at least a few minutes from now.'); return; }
            scheduledAt = new Date(ms).toISOString();
        }
        setWorking(true);
        let ready;
        try {
            ready = await prepare();
        } catch (err) {
            console.error('Preparing email failed:', err);
            setProblem(/upload/i.test(err?.message || '') ? "Couldn't upload the images in your message. Check your connection and try again." : "Couldn't get the email ready. Please try again.");
            setWorking(false);
            return;
        }
        try {
            const mailData = ready.mailData || {};
            const res = job.retry
                ? await retryQueuedCampaign({ campaignId: job.options?.campaignId, html: ready.html, subject: job.subject, recipients: job.recipients, accountType: job.accountType, fromName: job.fromName, fromEmail: job.fromEmail })
                : await queueCampaign({
                    recipients: job.recipients,
                    subject: job.subject,
                    html: ready.html,
                    accountType: job.accountType || 'official',
                    fromName: job.fromName || undefined,
                    fromEmail: job.fromEmail || undefined,
                    scheduledAt,
                    meta: {
                        category: mailData.category,
                        recipientType: mailData.recipientType,
                        headerText: mailData.headerText,
                        messageBody: mailData.messageBody,
                        preheader: mailData.preheader,
                        heroImage: mailData.heroImage,
                        ctaText: mailData.ctaText,
                        ctaUrl: mailData.ctaUrl,
                        theme: mailData.theme,
                        audience: job.options?.audience || null,
                    },
                });
            setQueuedInfo(res);
            setCampaignId(res.campaignId);
            setPhase('watching');
        } catch (err) {
            console.error('Queueing campaign failed:', err);
            setProblem(err.message && err.status && err.status < 500 ? err.message : "Couldn't queue the email. Please try again.");
        } finally {
            setWorking(false);
        }
    };

    const stop = async () => {
        if (!campaignId) return;
        setWorking(true);
        try { await cancelQueuedCampaign(campaignId); } catch (err) { setProblem(err.message || "Couldn't stop it."); } finally { setWorking(false); }
    };

    const retryFailed = async () => {
        if (!campaignId) return;
        setWorking(true);
        setProblem('');
        try {
            finishedRef.current = false;
            await retryQueuedCampaign({ campaignId });
            setPhase('watching');
        } catch (err) {
            setProblem(err.message || "Couldn't retry. Please try again.");
        } finally {
            setWorking(false);
        }
    };

    /* ---------- Progress numbers ---------- */
    const total = Number(record?.totalRecipients || queuedInfo?.queued || 0);
    const sent = Number(record?.sentCount || 0);
    const failed = Number(record?.failedCount || 0);
    const unsubscribed = Number(record?.suppressedCount || queuedInfo?.suppressed?.length || 0);
    const unsent = record?.unsentEmails?.length || 0;
    const pct = total ? Math.min(100, Math.round(((sent + failed) / total) * 100)) : 0;
    const status = record?.status || queuedInfo?.status;
    const scheduled = status === 'scheduled';
    const paused = record?.pausedReason === 'daily_limit';
    const pending = (record?.failedEmails?.length || failed) + unsent;

    const outcome = phase !== 'done' ? null
        : status === 'cancelled' ? { tone: 'gray', Icon: CircleStop, title: 'Sending stopped', text: `${fmt(sent)} sent before you stopped. ${fmt(unsent)} weren't sent.` }
            : status === 'completed' ? { tone: 'green', Icon: CheckCircle2, title: 'Sent', text: `Your email went to ${fmt(sent)} ${sent === 1 ? 'person' : 'people'}.` }
                : sent > 0 ? { tone: 'amber', Icon: AlertTriangle, title: 'Partly sent', text: `${fmt(sent)} sent, ${fmt(failed)} couldn't be delivered. You can retry just those.` }
                    : { tone: 'red', Icon: XCircle, title: "Couldn't send", text: 'Nothing was delivered. Check the sender settings and try again.' };

    const willSend = preview && !preview.error ? preview.willSend : count;
    const sendLabel = job.confirmLabel || (when === 'later' ? `Schedule for ${fmt(willSend)} ${willSend === 1 ? 'person' : 'people'}` : `Send to ${fmt(willSend)} ${willSend === 1 ? 'person' : 'people'}`);

    const footer = phase === 'review' ? (
        <div className="space-y-2">
            {problem && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
            <div className="flex gap-2">
                <Button variant="ghost" className="h-12" onClick={onClose} disabled={working}>Cancel</Button>
                <Button variant="primary" className="h-12 flex-1" disabled={!count || working || (preview && !preview.error && preview.willSend === 0)} onClick={submit}>
                    {when === 'later' ? <CalendarClock size={15} /> : <Send size={15} />} {working ? 'Queueing…' : sendLabel}
                </Button>
            </div>
        </div>
    ) : phase === 'watching' ? (
        <div className="space-y-2">
            {problem && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
            <div className="flex gap-2">
                <Button variant="secondary" className="h-12 flex-1" onClick={stop} disabled={working}><CircleStop size={15} /> {scheduled ? 'Cancel send' : 'Stop sending'}</Button>
                <Button variant="primary" className="h-12 flex-1" onClick={onClose}>Close</Button>
            </div>
        </div>
    ) : (
        <div className="space-y-2">
            {problem && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
            <div className="flex flex-wrap gap-2">
                {pending > 0 && <Button variant="primary" className="h-12 flex-1" onClick={retryFailed} disabled={working}><RotateCcw size={15} /> Retry {fmt(pending)} {status === 'cancelled' && !failed ? 'unsent' : 'failed'}</Button>}
                {campaignId && onViewReport && <Button variant="secondary" className="h-12 flex-1" onClick={() => onViewReport(campaignId)}><BarChart3 size={15} /> View report</Button>}
                <Button variant={pending ? 'ghost' : 'primary'} className="h-12 flex-1" onClick={onClose}>Done</Button>
            </div>
        </div>
    );

    return (
        <Sheet
            open={open}
            onClose={working ? () => {} : onClose}
            size="md"
            title={phase === 'review' ? (job.retry ? 'Retry sending' : 'Ready to send?') : phase === 'watching' ? (scheduled ? 'Scheduled' : 'Sending') : 'Result'}
            subtitle={phase === 'review' ? "Check the details. Once sent, an email can't be taken back." : phase === 'watching' ? 'Our server sends this, so you can close this window.' : undefined}
            footer={footer}
            bodyClassName="space-y-4"
        >
            {phase === 'review' && (
                <>
                    <dl className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                        {(job.summary || []).map(row => (
                            <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-3">
                                <dt className="shrink-0 text-[12px] font-bold text-gray-500">{row.label}</dt>
                                <dd className="min-w-0 break-words text-right text-[14px] font-semibold">{row.value}</dd>
                            </div>
                        ))}
                        {!job.retry && (
                            <div className="flex items-start justify-between gap-4 px-4 py-3">
                                <dt className="shrink-0 text-[12px] font-bold text-gray-500">Will get it</dt>
                                <dd className="text-right text-[14px] font-semibold">
                                    {!preview ? <span className="text-gray-400">Checking…</span>
                                        : preview.error ? <span className="text-gray-500">{fmt(count)} (couldn't check the unsubscribe list here; the server still skips them)</span>
                                            : (
                                                <>
                                                    {fmt(preview.willSend)} {preview.willSend === 1 ? 'person' : 'people'}
                                                    {(preview.suppressed > 0 || preview.duplicates > 0 || preview.invalid > 0) && (
                                                        <span className="block text-[12px] font-medium text-gray-500">
                                                            Skipping {[preview.suppressed && `${fmt(preview.suppressed)} unsubscribed`, preview.duplicates && `${fmt(preview.duplicates)} duplicates`, preview.invalid && `${fmt(preview.invalid)} invalid`].filter(Boolean).join(', ')}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                </dd>
                            </div>
                        )}
                        <div className="flex items-start justify-between gap-4 px-4 py-3">
                            <dt className="shrink-0 text-[12px] font-bold text-gray-500">Delivery</dt>
                            <dd className="text-right text-[14px] font-semibold">
                                One email per person, sent by our server
                                {preview && !preview.error && preview.quota && (
                                    <span className="block text-[12px] font-medium text-gray-500">
                                        {preview.days > 1
                                            ? `Today's limit has room for ${fmt(preview.quota.bulkRoom)}; the rest goes out over ${preview.days} days.`
                                            : `Within today's limit (${fmt(preview.quota.bulkRoom)} left).`}
                                    </span>
                                )}
                            </dd>
                        </div>
                    </dl>

                    {!job.retry && (
                        <div className="space-y-2">
                            <SegmentedTabs value={when} onChange={setWhen} items={[{ value: 'now', label: 'Send now', icon: Send }, { value: 'later', label: 'Schedule', icon: CalendarClock }]} />
                            {when === 'later' && (
                                <div>
                                    <input
                                        type="datetime-local"
                                        value={scheduledFor}
                                        min={toLocalInput(Date.now() + 5 * 60 * 1000)}
                                        onChange={(e) => setScheduledFor(e.target.value)}
                                        className={fieldCls}
                                        aria-label="Send at"
                                    />
                                    <p className="mt-1.5 text-[12px] text-gray-500">It goes out with the first mail run after this time: within a minute or two while Mailing is open in the admin, otherwise at the daily run ({DAILY_RUN}).</p>
                                </div>
                            )}
                        </div>
                    )}

                    {(job.warnings || []).filter(Boolean).map(w => (
                        <p key={w} className={cn('flex items-start gap-2 rounded-xl p-3 text-[13px] font-semibold', accent('amber').soft, accent('amber').text)}>
                            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {w}
                        </p>
                    ))}
                </>
            )}

            {phase === 'watching' && (
                <div className="space-y-4">
                    {scheduled ? (
                        <div className={cn('flex items-start gap-3 rounded-2xl border p-4', accent('violet').soft, accent('violet').border)}>
                            <CalendarClock size={22} className={cn('mt-0.5 shrink-0', accent('violet').text)} />
                            <div>
                                <p className="text-[16px] font-bold">Scheduled for {formatWhen(record?.scheduledAt || queuedInfo?.scheduledAt)}</p>
                                <p className="text-[13px] text-gray-600 dark:text-zinc-300">{fmt(total)} {total === 1 ? 'person' : 'people'}. You can cancel it until then.</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-2 flex items-baseline justify-between">
                                <p className="font-heading text-[28px] font-extrabold tabular-nums">{pct}%</p>
                                <p className="text-[13px] font-semibold text-gray-500">{fmt(sent + failed)} of {fmt(total)}</p>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                                <div className={cn('h-full rounded-full transition-[width] duration-500', accent('fuchsia').dot)} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    )}
                    {paused && (
                        <p className={cn('flex items-start gap-2 rounded-xl p-3 text-[13px] font-semibold', accent('amber').soft, accent('amber').text)}>
                            <PauseCircle size={15} className="mt-0.5 shrink-0" /> Today's sending limit is reached. The rest goes out automatically from {formatWhen(record?.resumesAt) || 'tomorrow'}.
                        </p>
                    )}
                    {!scheduled && (
                        <div className="grid grid-cols-3 gap-2">
                            <Stat label="Sent" value={sent} tone="green" />
                            <Stat label="Failed" value={failed} tone={failed ? 'red' : 'gray'} />
                            <Stat label="Unsubscribed" value={unsubscribed} tone="amber" />
                        </div>
                    )}
                </div>
            )}

            {phase === 'done' && outcome && (
                <div className="space-y-4">
                    <div className={cn('flex items-start gap-3 rounded-2xl border p-4', accent(outcome.tone).soft, accent(outcome.tone).border)}>
                        <outcome.Icon size={22} className={cn('mt-0.5 shrink-0', accent(outcome.tone).text)} />
                        <div>
                            <p className="text-[16px] font-bold">{outcome.title}</p>
                            <p className="text-[13px] text-gray-600 dark:text-zinc-300">{outcome.text}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Stat label="Sent" value={sent} tone="green" />
                        <Stat label="Failed" value={failed} tone={failed ? 'red' : 'gray'} />
                        <Stat label="Unsubscribed" value={unsubscribed} tone="amber" />
                        <Stat label="Not sent" value={unsent} tone="gray" />
                    </div>
                    {(queuedInfo?.invalid > 0 || queuedInfo?.duplicates > 0) && (
                        <p className="text-[12px] text-gray-500">Skipped before sending: {[queuedInfo.invalid && `${fmt(queuedInfo.invalid)} invalid`, queuedInfo.duplicates && `${fmt(queuedInfo.duplicates)} duplicates`].filter(Boolean).join(', ')}.</p>
                    )}
                    {record?.failedEmails?.length > 0 && (
                        <details className="rounded-xl border border-black/[0.06] p-3 text-[12px] dark:border-white/[0.08]">
                            <summary className="cursor-pointer font-semibold">Who didn't get it</summary>
                            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                                {record.failedEmails.slice(0, 200).map(e => <li key={e} className="break-all font-semibold">{e}</li>)}
                            </ul>
                        </details>
                    )}
                </div>
            )}
        </Sheet>
    );
};

export default SendSheet;
