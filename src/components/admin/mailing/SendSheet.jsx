import React, { useEffect, useRef, useState } from 'react';
import Send from 'lucide-react/dist/esm/icons/send';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import CircleStop from 'lucide-react/dist/esm/icons/circle-stop';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import { Button } from '../ui';
import Sheet from '../Sheet';
import { sendMassEmail } from '../../../lib/email';
import { estimateDuration } from './audience';

/*
 * Review → send → result, in one sheet. Used for new campaigns, the
 * newsletter, and "retry failed" from history.
 *
 * job = {
 *   recipients: [{ email, name, role }], subject, html, accountType, fromName, fromEmail,
 *   mailData, options (passed to sendMassEmail: buildHtml, individual, audience, campaignId, baseSentCount),
 *   summary: [{ label, value }], warnings: [string], prepare?: async () => ({ html, mailData }),
 *   confirmLabel?, retry?: bool
 * }
 */

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const Stat = ({ label, value, tone }) => (
    <div className={cn('rounded-xl p-3', accent(tone).soft)}>
        <p className="text-[12px] font-bold text-gray-500">{label}</p>
        <p className={cn('font-heading text-[22px] font-extrabold tabular-nums', accent(tone).text)}>{fmt(value)}</p>
    </div>
);

const SendSheet = ({ open, onClose, job, onFinished, onViewReport }) => {
    const [phase, setPhase] = useState('review');
    const [progress, setProgress] = useState(null);
    const [result, setResult] = useState(null);
    const [problem, setProblem] = useState('');
    const [preparing, setPreparing] = useState(false);
    const controllerRef = useRef(null);
    const startedRef = useRef(false);
    const preparedRef = useRef(null); // images are uploaded once, retries reuse them

    useEffect(() => {
        if (!open) return;
        setPhase('review');
        setProgress(null);
        setResult(null);
        setProblem('');
        setPreparing(false);
        startedRef.current = false;
        preparedRef.current = null;
    }, [open, job]);

    // Closing the tab mid-send would stop it; ask first.
    useEffect(() => {
        if (phase !== 'sending') return undefined;
        const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [phase]);

    if (!job) return null;
    const count = job.recipients?.length || 0;

    const run = async (recipients, extraOptions = {}) => {
        if (startedRef.current && phase === 'sending') return;
        startedRef.current = true;
        setProblem('');
        let html = job.html;
        let mailData = job.mailData;
        if (preparedRef.current) {
            ({ html, mailData } = preparedRef.current);
        } else if (job.prepare) {
            setPreparing(true);
            try {
                ({ html, mailData } = await job.prepare());
                preparedRef.current = { html, mailData };
            } catch (err) {
                console.error('Preparing email failed:', err);
                setProblem(err?.message === 'Image upload failed' || /upload/i.test(err?.message || '')
                    ? "Couldn't upload the images in your message. Check your connection and try again."
                    : "Couldn't get the email ready. Please try again.");
                setPreparing(false);
                startedRef.current = false;
                return;
            }
            setPreparing(false);
        }
        const controller = new AbortController();
        controllerRef.current = controller;
        setPhase('sending');
        setProgress({ sent: 0, failed: 0, total: recipients.length, currentBatch: 0, totalBatches: 0 });
        try {
            const res = await sendMassEmail(
                recipients,
                job.subject,
                html,
                job.accountType || 'official',
                (p) => setProgress(p),
                job.fromName || null,
                job.fromEmail || null,
                mailData || null,
                { ...(job.options || {}), ...extraOptions, signal: controller.signal },
            );
            setResult(res);
            setPhase('done');
            onFinished?.(res);
        } catch (err) {
            console.error('Campaign send crashed:', err);
            setResult({ success: false, sent: 0, failed: recipients.length, total: recipients.length, failedEmails: recipients.map(r => r.email || r), error: err.message });
            setPhase('done');
        } finally {
            controllerRef.current = null;
            startedRef.current = false;
        }
    };

    const retryFailed = () => {
        if (!result?.campaignId) return;
        const pending = [...(result.failedEmails || []), ...(result.unsentEmails || [])];
        const byEmail = new Map((job.recipients || []).map(r => [String(r.email || r).toLowerCase(), r]));
        const recipients = pending.map(e => byEmail.get(e) || { email: e });
        run(recipients, { campaignId: result.campaignId, baseSentCount: (job.options?.baseSentCount || 0) + (result.sent || 0) });
    };

    const done = phase === 'done' && result;
    const pending = done ? (result.failedEmails?.length || 0) + (result.unsentEmails?.length || 0) : 0;
    const outcome = !done ? null
        : result.cancelled ? { tone: 'gray', Icon: CircleStop, title: 'Sending stopped', text: `${fmt(result.sent)} sent before you stopped. ${fmt(result.unsentEmails?.length)} weren't sent.` }
            : result.success ? { tone: 'green', Icon: CheckCircle2, title: 'Sent', text: `Your email went to ${fmt(result.sent)} ${result.sent === 1 ? 'person' : 'people'}.` }
                : result.sent > 0 ? { tone: 'amber', Icon: AlertTriangle, title: 'Partly sent', text: `${fmt(result.sent)} sent, ${fmt(result.failed)} couldn't be delivered. You can retry just those.` }
                    : { tone: 'red', Icon: XCircle, title: "Couldn't send", text: result.error === 'No valid recipients' ? 'None of the addresses were valid.' : 'Nothing was delivered. Check your connection and try again.' };

    const pct = progress?.total ? Math.round((((progress.sent || 0) + (progress.failed || 0) + (progress.suppressed || 0)) / progress.total) * 100) : 0;
    const individual = job.options?.individual || job.individualAuto;

    const footer = phase === 'review' ? (
        <div className="space-y-2">
            {problem && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
            <div className="flex gap-2">
                <Button variant="ghost" className="h-12" onClick={onClose} disabled={preparing}>Cancel</Button>
                <Button variant="primary" className="h-12 flex-1" disabled={!count || preparing} onClick={() => run(job.recipients)}>
                    <Send size={15} /> {preparing ? 'Getting it ready…' : (job.confirmLabel || `Send to ${fmt(count)} ${count === 1 ? 'person' : 'people'}`)}
                </Button>
            </div>
        </div>
    ) : phase === 'sending' ? (
        <Button variant="secondary" className="h-12 w-full" onClick={() => controllerRef.current?.abort()}>
            <CircleStop size={15} /> Stop sending
        </Button>
    ) : (
        <div className="flex flex-wrap gap-2">
            {pending > 0 && result.campaignId && (
                <Button variant="primary" className="h-12 flex-1" onClick={retryFailed}><RotateCcw size={15} /> Retry {fmt(pending)} {result.cancelled && !result.failedEmails?.length ? 'unsent' : 'failed'}</Button>
            )}
            {result?.campaignId && result.recordSaved !== false && onViewReport && (
                <Button variant="secondary" className="h-12 flex-1" onClick={() => onViewReport(result.campaignId)}><BarChart3 size={15} /> View report</Button>
            )}
            <Button variant={pending ? 'ghost' : 'primary'} className="h-12 flex-1" onClick={onClose}>Done</Button>
        </div>
    );

    return (
        <Sheet
            open={open}
            onClose={phase === 'sending' || preparing ? () => {} : onClose}
            size="md"
            title={phase === 'review' ? (job.retry ? 'Retry sending' : 'Ready to send?') : phase === 'sending' ? 'Sending…' : 'Result'}
            subtitle={phase === 'review' ? 'Check the details. Once sent, an email can\'t be taken back.' : phase === 'sending' ? 'Keep this tab open until it finishes.' : undefined}
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
                        <div className="flex items-start justify-between gap-4 px-4 py-3">
                            <dt className="shrink-0 text-[12px] font-bold text-gray-500">Delivery</dt>
                            <dd className="text-right text-[14px] font-semibold">
                                {individual ? 'One email per person' : 'In batches of 45 (BCC)'}
                                <span className="block text-[12px] font-medium text-gray-500">Takes {estimateDuration(count, individual)}</span>
                            </dd>
                        </div>
                    </dl>
                    {(job.warnings || []).filter(Boolean).map(w => (
                        <p key={w} className={cn('flex items-start gap-2 rounded-xl p-3 text-[13px] font-semibold', accent('amber').soft, accent('amber').text)}>
                            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {w}
                        </p>
                    ))}
                </>
            )}

            {phase === 'sending' && progress && (
                <div className="space-y-4">
                    <div>
                        <div className="mb-2 flex items-baseline justify-between">
                            <p className="font-heading text-[28px] font-extrabold tabular-nums">{pct}%</p>
                            <p className="text-[13px] font-semibold text-gray-500">{fmt((progress.sent || 0) + (progress.failed || 0) + (progress.suppressed || 0))} of {fmt(progress.total)}</p>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                            <div className={cn('h-full rounded-full transition-[width] duration-500', accent('fuchsia').dot)} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <Stat label="Sent" value={progress.sent} tone="green" />
                        <Stat label="Failed" value={progress.failed} tone={progress.failed ? 'red' : 'gray'} />
                        <Stat label="Unsubscribed" value={progress.suppressed} tone="amber" />
                    </div>
                    {progress.failed > 0 && <p className="text-[12px] text-gray-500">Failed sends were already retried twice. You can retry them again at the end.</p>}
                </div>
            )}

            {done && outcome && (
                <div className="space-y-4">
                    <div className={cn('flex items-start gap-3 rounded-2xl border p-4', accent(outcome.tone).soft, accent(outcome.tone).border)}>
                        <outcome.Icon size={22} className={cn('mt-0.5 shrink-0', accent(outcome.tone).text)} />
                        <div>
                            <p className="text-[16px] font-bold">{outcome.title}</p>
                            <p className="text-[13px] text-gray-600 dark:text-zinc-300">{outcome.text}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Stat label="Sent" value={result.sent} tone="green" />
                        <Stat label="Failed" value={result.failed} tone={result.failed ? 'red' : 'gray'} />
                        <Stat label="Unsubscribed" value={result.suppressed?.length} tone="amber" />
                        <Stat label="Not sent" value={result.unsentEmails?.length} tone="gray" />
                    </div>
                    {(result.invalid > 0 || result.duplicates > 0) && (
                        <p className="text-[12px] text-gray-500">Skipped before sending: {result.invalid ? `${fmt(result.invalid)} invalid` : ''}{result.invalid && result.duplicates ? ', ' : ''}{result.duplicates ? `${fmt(result.duplicates)} duplicates` : ''}.</p>
                    )}
                    {result.recordSaved === false && (
                        <p className={cn('rounded-xl p-3 text-[13px] font-semibold', accent('amber').soft, accent('amber').text)}>
                            The email went out, but its report couldn't be saved, so opens and clicks won't show in History.
                        </p>
                    )}
                    {result.failures?.length > 0 && (
                        <details className="rounded-xl border border-black/[0.06] p-3 text-[12px] dark:border-white/[0.08]">
                            <summary className="cursor-pointer font-semibold">Who failed and why</summary>
                            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                                {result.failures.map(f => <li key={f.email} className="break-all"><span className="font-semibold">{f.email}</span> · <span className="text-gray-500">{f.error}</span></li>)}
                            </ul>
                        </details>
                    )}
                </div>
            )}
        </Sheet>
    );
};

export default SendSheet;
