import React, { useEffect, useMemo, useRef, useState } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Send from 'lucide-react/dist/esm/icons/send';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { cn } from '../../lib/utils';
import Sheet from './Sheet';
import { Button, SegmentedTabs } from './ui';
import RichEditor from './RichEditor';
import EmailPreviewIframe from '../ui/EmailPreviewIframe';
import { Field, fieldCls } from './uploads/UploadKit';
import { previewEmailHtml } from '../../lib/emailTemplates';

/*
 * One composer for every "email this document" action (invoices, proposals,
 * contracts, receipts): recipients as chips, optional CC/BCC, the message,
 * and a real preview of the branded email.
 *
 * buildHtml({ headerText, messageBody, theme, recipient, preview }) → html
 * template + buildData({ headerText, messageBody, recipient }) → data: use a
 *   server email template instead (documents). The preview renders the same
 *   template, and onSend gets { template, data } so the server builds it.
 * perRecipient: send one email per address (each gets its own tracked link);
 *   CC/BCC go with the first only, and a partial failure keeps just the
 *   addresses that failed so Send retries those.
 */

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
const splitEmails = (text) => String(text || '').split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);

const RecipientInput = ({ value, onChange, placeholder, autoFocus }) => {
    const [draft, setDraft] = useState('');
    const [bad, setBad] = useState('');
    const inputRef = useRef(null);

    const commit = (text = draft) => {
        const parts = splitEmails(text);
        if (!parts.length) { setDraft(''); return; }
        const good = parts.filter(p => EMAIL_RE.test(p));
        const wrong = parts.filter(p => !EMAIL_RE.test(p));
        if (good.length) onChange([...new Set([...value, ...good.map(g => g.toLowerCase())])]);
        setDraft(wrong.join(' '));
        setBad(wrong.length ? `${wrong[0]} doesn't look like an email address.` : '');
    };

    return (
        <div>
            <div
                onClick={() => inputRef.current?.focus()}
                className="flex min-h-12 w-full cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-black/10 bg-white px-2.5 py-2 focus-within:border-neon-green/60 dark:border-white/10 dark:bg-white/[0.04]"
            >
                {value.map(email => (
                    <span key={email} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-black/5 py-1 pl-2.5 pr-1 text-[13px] font-semibold dark:bg-white/10">
                        <span className="truncate">{email}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onChange(value.filter(v => v !== email)); }} aria-label={`Remove ${email}`} className="flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-black/10 dark:hover:bg-white/10">
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="email"
                    inputMode="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoFocus={autoFocus}
                    value={draft}
                    onChange={(e) => { setBad(''); const v = e.target.value; if (/[,;\s]$/.test(v)) commit(v); else setDraft(v); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commit(); }
                        if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
                    }}
                    onBlur={() => commit()}
                    onPaste={(e) => { const t = e.clipboardData.getData('text'); if (/[,;\s]/.test(t)) { e.preventDefault(); commit(`${draft} ${t}`); } }}
                    placeholder={value.length ? '' : placeholder}
                    className="h-8 min-w-[10rem] flex-1 bg-transparent px-1 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-gray-400"
                />
            </div>
            {bad && <p className="mt-1 text-[12px] font-semibold text-red-600 dark:text-red-400">{bad}</p>}
        </div>
    );
};

const EmailComposer = ({
    open, onClose, title = 'Send email', subtitle, initial, resetKey,
    buildHtml, template, buildData, perRecipient = false, onSend, successText = 'Sent.',
}) => {
    const [to, setTo] = useState([]);
    const [cc, setCc] = useState([]);
    const [bcc, setBcc] = useState([]);
    const [showCopies, setShowCopies] = useState(false);
    const [subject, setSubject] = useState('');
    const [headerText, setHeaderText] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [theme, setTheme] = useState('light');
    const [tab, setTab] = useState('write');
    const [device, setDevice] = useState('desktop');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        if (!open || !initial) return;
        setTo(splitEmails(initial.to).filter(e => EMAIL_RE.test(e)).map(e => e.toLowerCase()));
        setCc([]);
        setBcc([]);
        setShowCopies(false);
        setSubject(initial.subject || '');
        setHeaderText(initial.headerText || '');
        setMessageBody(initial.messageBody || '');
        setTheme(initial.theme || 'light');
        setTab('write');
        setStatus(null);
        setSending(false);
    }, [open, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const previewHtml = useMemo(() => {
        if (!open) return '';
        if (template) return previewEmailHtml(template, { ...buildData({ headerText, messageBody, recipient: to[0] || '' }), subject });
        return buildHtml({ headerText, messageBody, theme, recipient: to[0] || '', preview: true });
    }, [open, template, buildData, buildHtml, headerText, messageBody, theme, to, subject]);

    // What onSend gets for one email: the template and its data, or the finished html.
    const content = (recipient) => (template
        ? { template, data: buildData({ headerText, messageBody, recipient }) }
        : { html: buildHtml({ headerText, messageBody, theme, recipient }) });

    const send = async () => {
        if (!to.length) { setStatus({ type: 'error', text: 'Add at least one recipient.' }); setTab('write'); return; }
        if (!subject.trim()) { setStatus({ type: 'error', text: 'Add a subject.' }); setTab('write'); return; }
        setSending(true);
        setStatus({ type: 'info', text: `Sending to ${to.length} recipient${to.length === 1 ? '' : 's'}…` });
        try {
            if (!perRecipient) {
                await onSend({
                    to: to.join(', '), cc: cc.join(', '), bcc: bcc.join(', '), subject: subject.trim(),
                    ...content(to[0]),
                });
                setStatus({ type: 'success', text: successText });
                setTimeout(onClose, 1200);
                return;
            }
            const sent = [];
            const failed = [];
            for (const recipient of to) {
                try {
                    await onSend({
                        to: recipient,
                        cc: sent.length === 0 ? cc.join(', ') : '',
                        bcc: sent.length === 0 ? bcc.join(', ') : '',
                        subject: subject.trim(),
                        ...content(recipient),
                    });
                    sent.push(recipient);
                } catch (err) {
                    console.error('Send failed for', recipient, err);
                    failed.push(recipient);
                }
            }
            if (!failed.length) {
                setStatus({ type: 'success', text: `${successText} ${sent.length} recipient${sent.length === 1 ? '' : 's'}.` });
                setTimeout(onClose, 1200);
            } else {
                setTo(failed);
                if (sent.length) { setCc([]); setBcc([]); }
                setStatus({
                    type: 'error',
                    text: sent.length
                        ? `Sent to ${sent.join(', ')}. Couldn't reach ${failed.join(', ')}; press Send to retry just those.`
                        : "Couldn't send the email. Check the addresses and try again.",
                });
            }
        } catch (err) {
            console.error('Send failed:', err);
            setStatus({ type: 'error', text: "Couldn't send the email. Please try again." });
        } finally {
            setSending(false);
        }
    };

    const done = status?.type === 'success';

    return (
        <Sheet
            open={open}
            onClose={sending ? () => {} : onClose}
            size="xl"
            title={title}
            subtitle={subtitle}
            bodyClassName="space-y-5"
            footer={(
                <div className="space-y-3">
                    {status && (
                        <p role={status.type === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-2 text-[13px] font-semibold',
                            status.type === 'error' ? 'text-red-600 dark:text-red-400' : status.type === 'success' ? 'text-emerald-600 dark:text-neon-green' : 'text-gray-500')}>
                            {done && <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}{status.text}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={sending} className="h-12">Cancel</Button>
                        <Button variant="primary" onClick={send} disabled={sending || done} className="h-12 flex-1">
                            <Send size={15} /> {sending ? 'Sending…' : `Send${to.length > 1 ? ` to ${to.length}` : ''}`}
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
                        <div className="mb-1 flex items-center justify-between">
                            <span className="text-[12px] font-bold text-gray-500">To</span>
                            {!showCopies && <button type="button" onClick={() => setShowCopies(true)} className="text-[12px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">CC / BCC</button>}
                        </div>
                        <RecipientInput value={to} onChange={setTo} placeholder="client@company.com" />
                        {perRecipient && to.length > 1 && <p className="mt-1 text-[11px] text-gray-500">Each person gets their own email, so you can see who opened it.</p>}
                    </div>
                    {showCopies && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div><span className="mb-1 block text-[12px] font-bold text-gray-500">CC</span><RecipientInput value={cc} onChange={setCc} placeholder="Add CC" /></div>
                            <div><span className="mb-1 block text-[12px] font-bold text-gray-500">BCC</span><RecipientInput value={bcc} onChange={setBcc} placeholder="Add BCC" /></div>
                        </div>
                    )}
                    <Field label="Subject">
                        <input className={fieldCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </Field>
                    <Field label="Heading in the email">
                        <input className={fieldCls} value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
                    </Field>
                    <div>
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Message</span>
                        <RichEditor value={messageBody} onChange={setMessageBody} placeholder="Write your message…" />
                        <p className="mt-1 text-[11px] text-gray-500">The button to open the document is added below your message.</p>
                    </div>
                    {!template && (
                        <div>
                            <span className="mb-1 block text-[12px] font-bold text-gray-500">Email style</span>
                            <SegmentedTabs value={theme} onChange={setTheme} items={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-[13px] font-semibold"><span className="text-gray-500">Subject:</span> {subject}</p>
                        <div className="hidden shrink-0 gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/5 sm:flex">
                            {[{ v: 'desktop', I: Monitor }, { v: 'mobile', I: Smartphone }].map(({ v, I }) => (
                                <button key={v} type="button" onClick={() => setDevice(v)} aria-label={`${v} preview`} className={cn('flex h-8 w-8 items-center justify-center rounded-lg', device === v ? 'bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white' : 'text-gray-500')}>
                                    <I size={14} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-center rounded-2xl bg-black/[0.03] p-2 dark:bg-white/[0.03] sm:p-4">
                        <div className={cn('w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition-[max-width] dark:border-white/10', device === 'mobile' ? 'max-w-[375px]' : 'max-w-full')}>
                            <EmailPreviewIframe html={previewHtml} />
                        </div>
                    </div>
                </div>
            )}
        </Sheet>
    );
};

export default EmailComposer;
