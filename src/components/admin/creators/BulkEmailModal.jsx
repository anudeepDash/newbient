import React, { useMemo, useState } from 'react';
import Users from 'lucide-react/dist/esm/icons/users';
import Send from 'lucide-react/dist/esm/icons/send';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { useStore } from '../../../lib/store';
import { sendTemplateEmail } from '../../../lib/mailApi';
import { previewEmailHtml } from '../../../lib/emailTemplates';
import Sheet from '../Sheet';
import RichEditor from '../RichEditor';
import EmailPreviewIframe from '../../ui/EmailPreviewIframe';
import { Field, fieldCls } from '../uploads/UploadKit';
import { Button, SegmentedTabs } from '../ui';

/* Email one or many creators. Each creator gets their own copy, addressed by name. */

const BulkEmailModal = ({ recipients, onClose }) => {
    const [subject, setSubject] = useState('Partnership update from Newbi Entertainment');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [tab, setTab] = useState('write');
    const [showAll, setShowAll] = useState(false);
    const [problem, setProblem] = useState('');
    const withEmail = recipients.filter(c => c.email);
    const withoutEmail = recipients.length - withEmail.length;
    // The editor leaves "<br>" behind when cleared, so check the visible text.
    const hasBody = /<img/i.test(body) || body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

    // The same server template the send uses, addressed to the first person.
    const previewHtml = useMemo(() => (tab === 'preview' ? previewEmailHtml('creator-message', {
        name: withEmail[0]?.name || 'Creator',
        subject,
        messageHtml: hasBody ? body : '<p style="color:#9ca3af">Your message will appear here.</p>',
    }) : ''), [tab, subject, body, hasBody, withEmail[0]?.name]); // eslint-disable-line react-hooks/exhaustive-deps

    const close = (sent) => { if (!isSending) onClose(sent); };

    const handleSend = async () => {
        setProblem('');
        if (!subject.trim() || !hasBody) {
            setTab('write');
            setProblem(!subject.trim() ? 'Add a subject.' : 'Write a message.');
            useStore.getState().addToast('Add a subject and a message.', 'warning');
            return;
        }
        setIsSending(true);
        setProgress({ current: 0, total: withEmail.length });
        let sent = 0;
        let failed = 0;
        for (let i = 0; i < withEmail.length; i++) {
            const c = withEmail[i];
            setProgress({ current: i + 1, total: withEmail.length });
            try {
                await sendTemplateEmail({ template: 'creator-message', to: c.email, data: { name: c.name || 'Creator', subject, messageHtml: body } });
                sent++;
            } catch {
                failed++;
            }
        }
        setIsSending(false);
        useStore.getState().addToast(
            !failed ? `Email sent to ${sent} creator${sent === 1 ? '' : 's'}.`
                : sent ? `${failed} couldn't be sent. Try those again.`
                : 'None of the emails went out. Check your connection and try again.',
            !failed ? 'success' : sent ? 'warning' : 'error',
            failed ? { title: sent ? `Sent ${sent} of ${sent + failed}` : 'Emails not sent' } : undefined,
        );
        if (sent === 0 && failed > 0) {
            // Nothing went out: keep the draft and the selection so it can be retried.
            setProblem("Couldn't send any of the emails. Please try again.");
            return;
        }
        onClose(true);
    };

    const names = withEmail.map(c => c.name || c.email);
    const shown = showAll ? names : names.slice(0, 6);
    const pct = progress.total ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <Sheet
            open
            onClose={() => close(false)}
            size="xl"
            title={`Email ${withEmail.length} creator${withEmail.length === 1 ? '' : 's'}`}
            subtitle="Each creator gets their own email from creators@newbi.live."
            bodyClassName="space-y-5"
            footer={(
                <div className="space-y-3">
                    {problem && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
                    {isSending && (
                        <div className="space-y-1.5" role="status">
                            <p className="text-[13px] font-semibold text-gray-600 dark:text-zinc-300">Sending {progress.current} of {progress.total}…</p>
                            <div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                <div className="h-full rounded-full bg-emerald-500 transition-all dark:bg-neon-green" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => close(false)} disabled={isSending} className="h-12">Cancel</Button>
                        <Button variant="primary" onClick={handleSend} disabled={isSending || withEmail.length === 0} className="h-12 flex-1">
                            <Send size={15} /> {isSending ? 'Sending…' : `Send to ${withEmail.length}`}
                        </Button>
                    </div>
                </div>
            )}
        >
            <SegmentedTabs value={tab} onChange={setTab} className="w-full [&>button]:flex-1 [&>button]:justify-center" items={[
                { value: 'write', label: 'Write' },
                { value: 'preview', label: 'Preview' },
            ]} />

            {tab === 'write' ? (
                <div className="space-y-4">
                    <div>
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">To</span>
                        <div className="rounded-xl border border-black/10 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                            <p className="flex items-center gap-2 text-[14px] font-semibold">
                                <Users size={15} className="shrink-0 text-gray-400" />
                                {withEmail.length} selected creator{withEmail.length === 1 ? '' : 's'}
                            </p>
                            {names.length > 0 && (
                                <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                                    {shown.join(', ')}
                                    {names.length > 6 && (
                                        <>
                                            {!showAll && ` and ${names.length - 6} more`}
                                            {' '}
                                            <button type="button" onClick={() => setShowAll(v => !v)} className="font-semibold text-gray-700 underline-offset-2 hover:underline dark:text-zinc-300">
                                                {showAll ? 'Show less' : 'Show all'}
                                            </button>
                                        </>
                                    )}
                                </p>
                            )}
                        </div>
                        {withoutEmail > 0 && (
                            <p className="mt-1.5 flex items-start gap-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-400">
                                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                                {withoutEmail} selected creator{withoutEmail === 1 ? ' has' : 's have'} no email and will be skipped.
                            </p>
                        )}
                    </div>
                    <Field label="Subject">
                        <input className={fieldCls} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isSending} />
                    </Field>
                    <div>
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Message</span>
                        <RichEditor value={body} onChange={setBody} placeholder="Write your message…" />
                        <p className="mt-1 text-[11px] text-gray-500">Starts with "Hi" and the creator's name.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="truncate text-[13px] font-semibold"><span className="text-gray-500">Subject:</span> {subject}</p>
                    <div className="rounded-2xl bg-black/[0.03] p-2 dark:bg-white/[0.03] sm:p-4">
                        <div className="w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm dark:border-white/10">
                            <EmailPreviewIframe html={previewHtml} />
                        </div>
                    </div>
                </div>
            )}
        </Sheet>
    );
};

export default BulkEmailModal;
