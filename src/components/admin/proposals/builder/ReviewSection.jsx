import React, { useState } from 'react';
import { sendComposedEmail } from '../../../../lib/mailApi';
import { useNavigate } from 'react-router-dom';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Download from 'lucide-react/dist/esm/icons/download';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import CircleAlert from 'lucide-react/dist/esm/icons/circle-alert';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { copyToClipboard } from '../../../../lib/clipboard';
import { proposalShareLink } from '../../../../lib/docShareCard';
import { proposalWhatsAppText } from '../../../../lib/proposals';
import { proposalState, PROPOSAL_STATE_LABEL, proposalViews, lastViewedAt } from '../../../../lib/proposals';
import { accent } from '../../theme';
import { Badge, Button } from '../../ui';
import { BuilderCard } from '../../events/EditorParts';
import ProposalEmailModal from '../../ProposalEmailModal';
import { rupees } from './model';

const fmt = (d) => (d ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

const ActionTile = ({ icon: Icon, tone, label, hint, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled}
        className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-black/[0.08] bg-white p-3 text-left transition-colors hover:border-black/20 disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(tone).chip)}><Icon size={18} /></span>
        <span className="min-w-0">
            <span className="block text-[14px] font-bold">{label}</span>
            {hint && <span className="block truncate text-[12px] text-gray-500">{hint}</span>}
        </span>
    </button>
);

/**
 * Last step: what's missing, the numbers, and every way to send it.
 * ensureSaved() saves pending changes and resolves to the proposal id (or null).
 */
const ReviewSection = ({ id, formData, live, totals, checks, onGoto, ensureSaved, onDownload, downloading, locked }) => {
    const navigate = useNavigate();
    const addToast = useStore(s => s.addToast);
    const [emailFor, setEmailFor] = useState(null);
    const [busy, setBusy] = useState('');
    const state = live ? proposalState(live) : 'draft';
    const cfg = PROPOSAL_STATE_LABEL[state];
    const views = live ? proposalViews(live).length : 0;
    const seen = live ? lastViewedAt(live) : null;
    // A closed proposal can still be shared again (it just can't change).
    const blocked = !locked && checks.blockers.length > 0;

    // Just saved, so the chat preview is made again before the link goes out.
    const urlFor = (pid, via) => proposalShareLink({ ...formData, id: pid, isUploaded: false }, via, { fresh: true });
    const markShared = (pid, via) => useStore.getState().markProposalShared(pid, via).catch(err => console.warn('Share status not saved', err));

    // Save first, then hand over the saved proposal's id.
    const withSaved = async (key, fn) => {
        if (blocked) { addToast(checks.blockers[0].text, 'warning', { title: 'Not ready to share yet' }); return; }
        setBusy(key);
        try {
            const pid = await ensureSaved();
            if (pid) await fn(pid);
        } finally {
            setBusy('');
        }
    };

    const copyLink = () => withSaved('copy', async (pid) => {
        const ok = await copyToClipboard(await urlFor(pid, 'link'));
        if (ok) addToast('Paste it anywhere to share.', 'success', { title: 'Link copied' });
        else addToast('Your browser blocked it. Try again.', 'error', { title: "Couldn't copy the link", action: { label: 'Try again', onClick: () => copyLink() } });
        if (ok) markShared(pid, 'link');
    });
    const whatsapp = () => {
        // Opened now, while the tap still counts, then pointed at WhatsApp once the link is ready.
        const tab = blocked ? null : window.open('', '_blank');
        if (tab) tab.document.title = 'Opening WhatsApp…';
        let sent = false;
        return withSaved('wa', async (pid) => {
            const text = proposalWhatsAppText(formData, await urlFor(pid, 'whatsapp'));
            const digits = String(formData.clientPhone || '').replace(/\D/g, '');
            const phone = digits.length === 10 ? `91${digits}` : digits;
            const target = `https://wa.me/${phone.length >= 11 ? phone : ''}?text=${encodeURIComponent(text)}`;
            if (tab && !tab.closed) { tab.opener = null; tab.location.href = target; } else window.open(target, '_blank', 'noopener');
            sent = true;
            markShared(pid, 'whatsapp');
        }).finally(() => { if (tab && !sent && !tab.closed) tab.close(); });
    };
    const nativeShare = () => withSaved('share', async (pid) => {
        if (!navigator.share) { await copyToClipboard(await urlFor(pid, 'link')); addToast('Link copied.', 'success'); markShared(pid, 'link'); return; }
        try {
            await navigator.share({ title: `Proposal for ${formData.clientName || 'you'}`, text: 'Your proposal from Newbi Entertainment & Marketing LLP.', url: await urlFor(pid, 'share') });
            markShared(pid, 'share');
        } catch (err) {
            if (err?.name !== 'AbortError') addToast('Use Copy link instead.', 'error', { title: "Couldn't open sharing" });
        }
    });
    const email = () => withSaved('email', async (pid) => setEmailFor({ ...formData, id: pid }));
    const sendEmail = async (payload) => {
        await sendComposedEmail({ ...payload, fromName: 'Newbi Partnerships', fromEmail: 'partnership@newbi.live' });
        if (emailFor?.id) markShared(emailFor.id, 'email');
    };
    const openClient = () => withSaved('open', async (pid) => { window.open(`/proposal/${pid}`, '_blank', 'noopener'); });

    const convert = async () => {
        if (live?.convertedInvoiceId) { navigate(`/admin/edit-invoice/${live.convertedInvoiceId}`); return; }
        if (!id) return;
        if (!window.confirm(`Create an invoice for ${formData.clientName || 'this client'} from ${formData.proposalNumber || 'this proposal'}? You can edit it before sending.`)) return;
        setBusy('invoice');
        try {
            if (!locked) await ensureSaved();
            const invoiceId = await useStore.getState().convertProposalToInvoice(id);
            addToast('Invoice drafted from the proposal.', 'success');
            navigate(`/admin/edit-invoice/${invoiceId}`);
        } catch (err) {
            console.error(err);
            addToast('Please try again.', 'error', { title: "Couldn't create the invoice", action: { label: 'Try again', onClick: () => convert() } });
        } finally {
            setBusy('');
        }
    };

    return (
        <div className="space-y-5">
            <BuilderCard title="Status" action={<Badge tone={cfg.tone}>{cfg.label}</Badge>}>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-3">
                    <div><dt className="text-gray-500">Client</dt><dd className="truncate font-semibold">{formData.clientName || '—'}</dd></div>
                    <div><dt className="text-gray-500">Number</dt><dd className="font-semibold">{formData.proposalNumber || '—'}</dd></div>
                    <div><dt className="text-gray-500">Total</dt><dd className="font-semibold tabular-nums">{totals.totalAmount ? rupees(totals.totalAmount) : '—'}</dd></div>
                    <div><dt className="text-gray-500">Views</dt><dd className="font-semibold tabular-nums">{views}{seen ? ` · last ${fmt(seen)}` : ''}</dd></div>
                    <div><dt className="text-gray-500">Valid until</dt><dd className="font-semibold">{formData.validUntil ? new Date(`${String(formData.validUntil).slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No expiry'}</dd></div>
                    <div><dt className="text-gray-500">Online acceptance</dt><dd className="font-semibold">{formData.showSignatures ? 'On' : 'Off'}</dd></div>
                </dl>
                {live?.status === 'Accepted' && live.approvalMetadata && (
                    <p className={cn('mt-4 rounded-xl p-3 text-[13px] font-semibold', accent('green').soft, accent('green').text)}>
                        Signed by {live.approvalMetadata.signedBy || live.clientName}{live.approvalMetadata.signedAt ? ` on ${fmt(new Date(live.approvalMetadata.signedAt))}` : ''}{live.approvalMetadata.email ? ` (${live.approvalMetadata.email})` : ''}.
                    </p>
                )}
                {live?.status === 'Rejected' && (
                    <p className={cn('mt-4 rounded-xl p-3 text-[13px] font-semibold', accent('red').soft, accent('red').text)}>
                        Declined{live.rejectionMetadata?.reason ? `: “${live.rejectionMetadata.reason}”` : '.'}
                    </p>
                )}
            </BuilderCard>

            {!locked && (
                <BuilderCard title="Before you send" hint={blocked ? 'Fix these to share it' : checks.warnings.length ? 'Good to go. A few things to look at:' : 'Everything looks ready.'}>
                    <div className="space-y-2">
                        {checks.blockers.map((c, i) => (
                            <button key={`b${i}`} type="button" onClick={() => onGoto(c.section)} className={cn('flex w-full items-center gap-3 rounded-xl p-3 text-left text-[13px] font-semibold', accent('red').soft)}>
                                <CircleAlert size={16} className={cn('shrink-0', accent('red').text)} /> <span className="flex-1">{c.text}</span> <ChevronRight size={15} className="text-gray-400" />
                            </button>
                        ))}
                        {checks.warnings.map((c, i) => (
                            <button key={`w${i}`} type="button" onClick={() => onGoto(c.section)} className={cn('flex w-full items-center gap-3 rounded-xl p-3 text-left text-[13px] font-semibold', accent('amber').soft)}>
                                <AlertTriangle size={16} className={cn('shrink-0', accent('amber').text)} /> <span className="flex-1">{c.text}</span> <ChevronRight size={15} className="text-gray-400" />
                            </button>
                        ))}
                        {!blocked && !checks.warnings.length && (
                            <p className={cn('flex items-center gap-2 rounded-xl p-3 text-[13px] font-semibold', accent('green').soft, accent('green').text)}><CheckCircle2 size={16} /> Ready to send.</p>
                        )}
                    </div>
                </BuilderCard>
            )}

            <BuilderCard title={locked ? 'Share again' : 'Send it'} hint="Saves your changes first. Sharing marks a draft as sent.">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ActionTile icon={Mail} tone="blue" label="Email" hint={formData.clientEmail || 'Tracked link for each person'} onClick={email} disabled={blocked || Boolean(busy)} />
                    <ActionTile icon={MessageCircle} tone="green" label="WhatsApp" hint={formData.clientPhone || 'Pick a chat'} onClick={whatsapp} disabled={blocked || Boolean(busy)} />
                    <ActionTile icon={Link2} tone="violet" label={busy === 'copy' ? 'Saving…' : 'Copy link'} hint="Paste it anywhere" onClick={copyLink} disabled={blocked || Boolean(busy)} />
                    <ActionTile icon={Share2} tone="cyan" label="More apps" hint="Your phone's share menu" onClick={nativeShare} disabled={blocked || Boolean(busy)} />
                    <ActionTile icon={ExternalLink} tone="gray" label="Open client view" hint="See what the client sees" onClick={openClient} disabled={Boolean(busy) || (!id && blocked)} />
                    <ActionTile icon={Download} tone="amber" label={downloading ? 'Making PDF…' : 'Download PDF'} hint="A4, every page" onClick={onDownload} disabled={downloading} />
                </div>
            </BuilderCard>

            {id && (
                <BuilderCard title="Invoice" hint={live?.convertedInvoiceId ? 'An invoice was made from this proposal.' : 'Turn the agreed proposal into a draft invoice.'}>
                    <Button variant={live?.status === 'Accepted' ? 'accent' : 'secondary'} className="h-11 w-full sm:w-auto" onClick={convert} disabled={busy === 'invoice'}>
                        <Receipt size={15} /> {live?.convertedInvoiceId ? 'Open the invoice' : 'Create invoice'}
                    </Button>
                </BuilderCard>
            )}

            <ProposalEmailModal isOpen={Boolean(emailFor)} onClose={() => setEmailFor(null)} proposal={emailFor} onSend={sendEmail} />
        </div>
    );
};

export default ReviewSection;
