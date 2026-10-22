import React, { useEffect, useState } from 'react';
import Send from 'lucide-react/dist/esm/icons/send';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { notifySpecificUser } from '../../../lib/notificationTriggers';
import { sendTemplateEmail } from '../../../lib/mailApi';
import { creatorCampaignPath } from '../../../lib/campaignLinks';
import Sheet from '../Sheet';
import { Button, Avatar } from '../ui';
import { Field, fieldCls, areaCls, Toggle } from '../uploads/UploadKit';
import { Spinner } from './parts';
import { callOutreach } from './outreach/outreachApi';
import { useWhatsAppTemplate, WhatsAppTemplateFields } from '../whatsapp/TemplateFields';
import { creatorPhotoOf, creatorRef, inr, payoutDefault, toDayInput, waNumber } from './campaignModel';

const todayInput = () => toDayInput(new Date());

const Recipients = ({ entries }) => (
    <div className="flex items-center gap-3 rounded-xl bg-black/[0.03] px-3 py-2.5 dark:bg-white/[0.04]">
        <div className="flex -space-x-2">
            {entries.slice(0, 4).map(e => (
                <Avatar key={e.key} src={creatorPhotoOf(e.creator)} name={e.creator.name} size={30} className="ring-2 ring-white dark:ring-[#0d0f15]" />
            ))}
        </div>
        <p className="min-w-0 truncate text-[13px] font-semibold">
            {entries.length === 1 ? entries[0].creator.name || 'Creator' : `${entries.length} creators`}
            {entries.length > 1 && <span className="font-medium text-gray-500"> · {entries.slice(0, 2).map(e => e.creator.name?.split(' ')[0]).filter(Boolean).join(', ')}{entries.length > 2 ? '…' : ''}</span>}
        </p>
    </div>
);

/**
 * A message to one or more creators of a campaign: in the Newbi app, by email,
 * and on WhatsApp with an approved template (queued on the server, so it goes
 * out at the rate limit and waits while Meta is holding the number).
 */
export const MessageSheet = ({ open, onClose, campaign, entries }) => {
    const addToast = useStore(s => s.addToast);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [inApp, setInApp] = useState(true);
    const [email, setEmail] = useState(false);
    const [whatsapp, setWhatsapp] = useState(false);
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState(0);
    const template = useWhatsAppTemplate({ active: open && whatsapp, campaign: true });

    useEffect(() => {
        if (open) {
            setTitle(`Update on ${campaign?.title || 'your campaign'}`);
            setBody('');
            setInApp(true);
            setEmail(false);
            setWhatsapp(false);
            setProgress(0);
            template.reset();
        }
    }, [open, campaign?.title]); // eslint-disable-line react-hooks/exhaustive-deps

    const withEmail = entries.filter(e => e.creator.email);
    const withPhone = entries.filter(e => waNumber(e.creator.phone));
    const single = entries.length === 1 ? entries[0] : null;
    const wa = single ? waNumber(single.creator.phone) : '';
    const needsText = inApp || email;
    const canSend = (inApp || email || whatsapp)
        && (!needsText || (body.trim() && title.trim()))
        && (!whatsapp || (template.ready && withPhone.length > 0));

    const sendWhatsApp = async () => {
        const r = await callOutreach('wa-bulk', {
            ...template.payload,
            params: { ...template.payload.params, campaignId: campaign.id },
            recipients: withPhone.map(e => ({ phone: e.creator.phone, name: e.creator.name || '' })),
        });
        if (!r.ok) return { error: r.error };
        return { queued: r.data.queued, skipped: r.data.skipped.length + (entries.length - withPhone.length) };
    };

    const send = async () => {
        if (sending || !canSend) return;
        setSending(true);
        setProgress(0);
        let mailFailed = 0;
        try {
            if (inApp) await Promise.all(entries.map(e => notifySpecificUser(creatorRef(e.creator), title.trim(), body.trim(), creatorCampaignPath(campaign.id), 'campaign')));
            if (email) {
                for (let i = 0; i < withEmail.length; i += 1) {
                    const e = withEmail[i];
                    try {
                        await sendTemplateEmail({ template: 'creator-message', to: e.creator.email, data: { name: e.creator.name || 'Creator', subject: title.trim(), message: body.trim() } });
                    } catch {
                        mailFailed += 1;
                    }
                    setProgress(Math.round(((i + 1) / withEmail.length) * 100));
                }
            }
            const waResult = whatsapp ? await sendWhatsApp() : null;
            if (waResult?.error) {
                addToast(waResult.error, 'error', { title: needsText ? 'Sent, but not on WhatsApp' : 'Not sent on WhatsApp' });
                if (!needsText) return;
            } else if (waResult) {
                addToast(
                    `${waResult.queued} queued on WhatsApp${waResult.skipped ? `, ${waResult.skipped} skipped (no number, or stopped updates)` : ''}. They go out a few a minute, and wait if Meta is holding the number.`,
                    waResult.queued ? 'success' : 'warning',
                    { title: 'WhatsApp' },
                );
            }
            if (mailFailed) addToast(`${mailFailed} email${mailFailed === 1 ? '' : 's'} didn't go through.`, 'warning', { title: 'Message sent in the app' });
            else if (needsText) addToast(entries.length === 1 ? 'Message sent.' : `Message sent to ${entries.length} creators.`, 'success');
            onClose();
        } catch {
            addToast('Check your connection and try again.', 'error', { title: 'Message not sent' });
        } finally {
            setSending(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={sending ? () => {} : onClose}
            title="Message creators"
            subtitle="In the Newbi app, by email, and on WhatsApp with an approved template."
            size="md"
            footer={(
                <div className="flex gap-2">
                    {wa && (
                        <Button as="a" variant="secondary" href={`https://wa.me/${wa}?text=${encodeURIComponent(body || `Hi ${single.creator.name || ''}!`)}`} target="_blank" rel="noopener noreferrer" className="h-11">
                            <MessageCircle size={14} /> WhatsApp
                        </Button>
                    )}
                    <Button variant="accent" onClick={send} disabled={sending || !canSend} className="h-11 flex-1">
                        {sending ? <Spinner /> : <Send size={14} />} {sending && email ? `Sending… ${progress}%` : 'Send'}
                    </Button>
                </div>
            )}
        >
            <div className="space-y-4">
                <Recipients entries={entries} />
                <div className="space-y-1 rounded-xl border border-black/[0.06] px-3.5 py-2.5 dark:border-white/[0.08]">
                    <Toggle label="In the Newbi app" hint="A notification and push" checked={inApp} onChange={setInApp} />
                    <Toggle
                        label="Email"
                        hint={withEmail.length === entries.length ? 'From creators@newbi.live' : `${withEmail.length} of ${entries.length} have an email address`}
                        checked={email}
                        onChange={setEmail}
                    />
                    <Toggle
                        label="WhatsApp"
                        hint={`An approved template · ${withPhone.length} of ${entries.length} have a number`}
                        checked={whatsapp}
                        onChange={setWhatsapp}
                    />
                </div>
                {needsText && (
                    <>
                        <Field label="Title">
                            <input className={fieldCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
                        </Field>
                        <Field label="Message">
                            <textarea className={areaCls} rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="e.g. Reminder: stories go live tomorrow at 6 PM. Tag @newbi.live and keep them up for 24 hours." />
                        </Field>
                    </>
                )}
                {whatsapp && (
                    <div className="space-y-2 rounded-xl border border-black/[0.06] p-3.5 dark:border-white/[0.08]">
                        <p className="text-[13px] font-bold">WhatsApp message</p>
                        <WhatsAppTemplateFields wa={template} campaign={campaign} sampleName={withPhone[0]?.creator.name || ''} />
                    </div>
                )}
            </div>
        </Sheet>
    );
};

/** Record a payment to one or more creators for this campaign. */
export const PayoutSheet = ({ open, onClose, campaign, entries, onSave }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(todayInput());
    const [note, setNote] = useState('');
    const [notify, setNotify] = useState(true);
    const [saving, setSaving] = useState(false);

    // Reset only when the sheet opens for a new set of creators, not on every
    // live update of the list behind it.
    const entryKey = entries.map(e => e.key).join('|');
    useEffect(() => {
        if (open) {
            const existing = entries.length === 1 ? entries[0].payout : null;
            const base = existing?.amount || payoutDefault(campaign);
            setAmount(base ? String(base) : '');
            setDate(existing?.paidAt ? toDayInput(existing.paidAt) : todayInput());
            setNote(existing?.note || '');
            setNotify(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, entryKey, campaign?.id]);

    const value = Math.max(0, Number(amount) || 0);
    const save = async () => {
        if (saving) return;
        setSaving(true);
        try {
            await onSave({ amount: value, paidAt: date || todayInput(), note: note.trim() }, notify);
            onClose();
        } catch {
            // The caller already showed what went wrong; keep the sheet open to retry.
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={saving ? () => {} : onClose}
            title="Mark as paid"
            subtitle="Keeps a record of what each creator was paid for this campaign."
            size="sm"
            footer={(
                <Button variant="success" onClick={save} disabled={saving} className="h-11 w-full">
                    {saving ? <Spinner /> : <Wallet size={14} />}
                    {entries.length > 1 ? `Mark ${entries.length} paid${value ? ` · ${inr(value * entries.length)}` : ''}` : `Mark paid${value ? ` · ${inr(value)}` : ''}`}
                </Button>
            )}
        >
            <div className="space-y-4">
                <Recipients entries={entries} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label={entries.length > 1 ? 'Amount each (₹)' : 'Amount (₹)'}>
                        <input className={fieldCls} type="number" min="0" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                    </Field>
                    <Field label="Paid on">
                        <input className={fieldCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </Field>
                </div>
                <Field label="Reference or note" optional>
                    <input className={fieldCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. UPI ref 4321… or 'paid in products'" />
                </Field>
                <div className="rounded-xl border border-black/[0.06] px-3.5 py-2.5 dark:border-white/[0.08]">
                    <Toggle label="Let them know" hint="App notification saying the payment was sent" checked={notify} onChange={setNotify} />
                </div>
            </div>
        </Sheet>
    );
};

const QUICK_REASONS = [
    'Please tag @newbi.live',
    "The link isn't opening",
    'Keep it up for at least 24 hours',
    'Use the poster we shared',
    'Add the ticket link sticker',
];

/** Ask a creator to change a submission, with a reason they'll see. */
export const ChangesSheet = ({ open, onClose, title, onSend }) => {
    const [reason, setReason] = useState('');
    const [sending, setSending] = useState(false);
    useEffect(() => { if (open) setReason(''); }, [open]);
    const send = async () => {
        if (sending || !reason.trim()) return;
        setSending(true);
        try {
            await onSend(reason.trim());
            onClose();
        } catch {
            // The caller already showed what went wrong; keep the sheet open to retry.
        } finally {
            setSending(false);
        }
    };
    return (
        <Sheet
            open={open}
            onClose={sending ? () => {} : onClose}
            title="Request changes"
            subtitle={title}
            variant="dialog"
            size="sm"
            footer={(
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={sending} className="h-11">Cancel</Button>
                    <Button variant="danger" onClick={send} disabled={sending || !reason.trim()} className="h-11 flex-1">
                        {sending && <Spinner />} Send feedback
                    </Button>
                </div>
            )}
        >
            <div className="space-y-3">
                <Field label="What needs to change?">
                    <textarea className={areaCls} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Be specific so they can fix it in one go." autoFocus />
                </Field>
                <div className="flex flex-wrap gap-1.5">
                    {QUICK_REASONS.map(r => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => setReason(prev => (prev ? `${prev.replace(/\s+$/, '')} ${r}.` : `${r}.`))}
                            className={cn('h-9 rounded-full border border-black/10 px-3 text-[12px] font-semibold text-gray-600 hover:border-black/25 dark:border-white/10 dark:text-zinc-300')}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>
        </Sheet>
    );
};
