import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Copy from 'lucide-react/dist/esm/icons/copy';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Send from 'lucide-react/dist/esm/icons/send';
import Clock from 'lucide-react/dist/esm/icons/clock';
import CheckCircle from 'lucide-react/dist/esm/icons/circle-check';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import AlertTriangle from 'lucide-react/dist/esm/icons/triangle-alert';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MoreHorizontal from 'lucide-react/dist/esm/icons/ellipsis';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import Sheet from '../../components/admin/Sheet';
import { Button, Badge, SearchInput, SegmentedTabs, EmptyState, StatTile, Menu, MenuItem } from '../../components/admin/ui';
import { Panel, CopyChip, ContactLinks, useConfirm, useBusy } from '../../components/admin/ticketing/kit';
import { Field, Choice, fieldCls } from '../../components/admin/uploads/UploadKit';
import { ImagePicker } from '../../components/admin/content/ContentKit';
import { sizedImage } from '../../lib/image';
import { inr, formatDateTime } from '../../components/admin/ticketing/format';
import { callTicketApi } from '../../lib/ticketApi';
import { copyToClipboard } from '../../lib/clipboard';
import { useStore } from '../../lib/store';
import { FINANCE_ROLES } from '../../constants/roles';
import { APP_ORIGIN } from '../../app/host';

/*
 * Resale payment links, kept as simple as possible. Two kinds:
 *   - a Razorpay link: the event name and a fixed amount (api/_lib/ticketResale.js)
 *   - a payment page: just the event name; buyers open Newbi's own page, type the
 *     amount and pay, as many times as needed (api/_lib/payPages.js, /pay/t/:id)
 * Either way the buyer gets a "payment received" email. Handing over the tickets
 * stays manual.
 */

const STATUS = {
    open: { label: 'Open', tone: 'green' },
    closed: { label: 'Closed', tone: 'gray' },
    awaiting: { label: 'Awaiting payment', tone: 'amber' },
    paid: { label: 'Paid', tone: 'green' },
    cancelled: { label: 'Cancelled', tone: 'gray' },
    expired: { label: 'Expired', tone: 'red' },
};

const apiError = (res, fallback) => res?.error || (res?.unavailable ? "Couldn't reach the server. Check your connection and try again." : fallback);

const toast = (msg, tone = 'success', opts) => useStore.getState().addToast(msg, tone, opts);

const isPage = (r) => r?.kind === 'page';
const linkOf = (r) => (isPage(r) ? `${APP_ORIGIN}/pay/t/${encodeURIComponent(r.id)}` : r.shortUrl);
const shareText = (r) => (isPage(r)
    ? `Pay for ${r.eventName} here:\n${linkOf(r)}\nEnter the amount we agreed and pay. You'll get an email from Newbi once it's paid.`
    : `Payment link for ${r.eventName}: ${inr(r.amount)}\n${r.shortUrl}\nYou'll get an email from Newbi once it's paid.`);
const whatsappUrl = (r) => `https://wa.me/?text=${encodeURIComponent(shareText(r))}`;

const copyLink = async (r) => {
    const ok = await copyToClipboard(linkOf(r));
    toast(ok ? 'Payment link copied.' : 'Select it and copy it by hand.', ok ? 'success' : 'error');
};

// ── new link: event name and amount, that's all ─────────────────────────────

const NewLinkSheet = ({ open, onClose, onCreated }) => {
    const [kind, setKind] = useState('link');
    const [eventName, setEventName] = useState('');
    const [amount, setAmount] = useState('');
    const [image, setImage] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [created, setCreated] = useState(null);

    useEffect(() => { if (open) { setKind('link'); setEventName(''); setAmount(''); setImage(''); setError(''); setCreated(null); } }, [open]);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (busy) return;
        setBusy(true);
        setError('');
        const res = await callTicketApi('ticket-resale-create', kind === 'page' ? { kind: 'page', eventName, image } : { eventName, amount: Number(amount) }, { timeoutMs: 25000 });
        setBusy(false);
        if (!res.ok) { setError(apiError(res, "Couldn't create the link.")); return; }
        setCreated(res.data.resale);
        onCreated?.(res.data.resale);
    };

    if (created) {
        return (
            <Sheet open={open} onClose={onClose} variant="dialog" size="sm" title={isPage(created) ? 'Payment page ready' : 'Payment link ready'} subtitle={isPage(created) ? `${created.eventName} · buyer enters the amount` : `${created.eventName} · ${inr(created.amount)}`}
                footer={<Button variant="accent" className="h-12 w-full" onClick={onClose}>Done</Button>}>
                <div className="space-y-4">
                    <p className="break-all rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 font-mono text-[15px] font-bold">{linkOf(created)}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" className="h-12" onClick={() => copyLink(created)}><Copy size={15} /> Copy link</Button>
                        <Button as="a" href={whatsappUrl(created)} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-12"><Send size={15} /> WhatsApp</Button>
                    </div>
                    <p className="text-[13px] leading-relaxed text-gray-500 dark:text-zinc-400">
                        {isPage(created)
                            ? 'Share it with anyone buying for this event. Each buyer types the amount and their details, pays, and gets a confirmation email. You can share the same page many times.'
                            : 'The buyer enters their email on the payment page and gets a confirmation once they pay. Send the tickets yourself after that.'}
                    </p>
                </div>
            </Sheet>
        );
    }

    return (
        <Sheet open={open} onClose={busy ? undefined : onClose} variant="dialog" size="sm" title="New payment link"
            footer={<Button variant="accent" className="h-12 w-full" onClick={submit} disabled={busy}>{busy ? 'Creating…' : kind === 'page' ? 'Create payment page' : 'Create payment link'}</Button>}>
            <form onSubmit={submit} className="space-y-4">
                <Choice value={kind} onChange={setKind} options={[
                    { value: 'link', label: 'I set the amount', hint: 'One Razorpay link' },
                    { value: 'page', label: 'Buyer enters it', hint: 'A Newbi payment page' },
                ]} />
                <Field label="Event name">
                    <input className={fieldCls} value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Coldplay, Mumbai" maxLength={140} autoFocus required />
                </Field>
                {kind === 'page' && (
                    <ImagePicker label="Picture" optional hint="Shown at the top of the page and in the confirmation email." value={image} onChange={setImage} />
                )}
                {kind === 'link' && (
                    <Field label="Amount (₹)">
                        <input className={fieldCls} type="number" inputMode="decimal" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required />
                    </Field>
                )}
                {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-[13px] font-semibold text-red-600 dark:text-red-300">{error}</p>}
                <button type="submit" hidden aria-hidden tabIndex={-1} />
            </form>
        </Sheet>
    );
};

// ── list ────────────────────────────────────────────────────────────────────

const ResaleRow = ({ r, busy, onSync, onCancel }) => {
    const status = STATUS[r.status] || STATUS.awaiting;
    const live = r.status === 'awaiting' && r.shortUrl;
    const paid = r.status === 'paid';
    return (
        <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-bold">{r.eventName}</p>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {paid && r.emailStatus === 'sent' && <Badge tone="blue"><Mail size={10} /> Confirmation sent</Badge>}
                    {paid && r.emailStatus === 'failed' && <Badge tone="red"><AlertTriangle size={10} /> Email not sent</Badge>}
                    {paid && r.emailStatus === 'no_email' && <Badge tone="gray">No email given</Badge>}
                </div>
                {paid && (r.buyerName || r.buyerEmail || r.buyerPhone) && (
                    <div className="flex flex-wrap items-center gap-x-3 text-[13px]">
                        {r.buyerName && <span className="font-semibold">{r.buyerName}</span>}
                        <ContactLinks phone={r.buyerPhone} email={r.buyerEmail} />
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    {paid && r.paymentId && <CopyChip text={r.paymentId} label="Payment ID" prefix="Razorpay" />}
                    <span className="text-[11px] text-gray-400">
                        {paid && r.paidAt ? `Paid ${formatDateTime(r.paidAt)}${r.paymentMethod ? ` by ${r.paymentMethod}` : ''}` : `Created ${formatDateTime(r.createdAt)}`}
                        {r.createdBy ? ` · ${r.createdBy}` : ''}
                    </span>
                </div>
                {r.linkError && <p className="text-[12px] font-semibold text-red-600 dark:text-red-300">{r.linkError}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <p className="mr-auto text-lg font-extrabold tabular-nums sm:mr-2">{inr(r.paidAmount ?? r.amount)}</p>
                {live && <Button variant="secondary" className="h-10" onClick={() => copyLink(r)}><Copy size={14} /> Copy link</Button>}
                {live && <Button as="a" href={whatsappUrl(r)} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-10 w-10 px-0" aria-label="Share on WhatsApp"><Send size={14} /></Button>}
                {paid && r.emailStatus === 'failed' && (
                    <Button variant="secondary" className="h-10" onClick={() => onSync(r)} disabled={Boolean(busy)}><Mail size={14} /> {busy || 'Resend email'}</Button>
                )}
                {r.status === 'awaiting' && (
                    <Menu title="Link actions" trigger={({ toggle: t }) => <Button variant="ghost" onClick={t} aria-label={`More for ${r.eventName}`} className="h-10 w-10 px-0" disabled={Boolean(busy)}>{busy ? <RefreshCw size={16} className="animate-spin" /> : <MoreHorizontal size={17} />}</Button>}>
                        <MenuItem icon={RefreshCw} onClick={() => onSync(r)} hint="Ask Razorpay now">Check payment</MenuItem>
                        {r.shortUrl && <MenuItem icon={ExternalLink} as="a" href={r.shortUrl} target="_blank" rel="noopener noreferrer">Open link</MenuItem>}
                        <MenuItem icon={Ban} danger onClick={() => onCancel(r)}>Cancel link</MenuItem>
                    </Menu>
                )}
            </div>
        </li>
    );
};

// Change a payment page's picture.
const PictureSheet = ({ page, onClose, onSaved }) => {
    const [image, setImage] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { if (page) { setImage(page.image || ''); setError(''); } }, [page]);
    const save = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        const res = await callTicketApi('ticket-resale-update', { id: page.id, image });
        setBusy(false);
        if (!res.ok) { setError(apiError(res, "Couldn't save the picture.")); return; }
        onSaved(res.data.resale);
        toast(image ? 'Picture saved.' : 'Picture removed.');
        onClose();
    };
    return (
        <Sheet open={Boolean(page)} onClose={busy ? undefined : onClose} variant="dialog" size="sm" title="Page picture" subtitle={page?.eventName}
            footer={<Button variant="accent" className="h-12 w-full" onClick={save} disabled={busy || image === (page?.image || '')}>{busy ? 'Saving…' : 'Save'}</Button>}>
            <div className="space-y-3">
                <ImagePicker label="Picture" optional hint="Shown at the top of the page and in the confirmation email." value={image} onChange={setImage} />
                {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-[13px] font-semibold text-red-600 dark:text-red-300">{error}</p>}
            </div>
        </Sheet>
    );
};

// A payment page: many buyers, each typing their own amount.
const PageRow = ({ r, busy, onResend, onClose, onPicture }) => {
    const [openList, setOpenList] = useState(false);
    const status = STATUS[r.status] || STATUS.open;
    const payments = r.payments || [];
    const live = r.status === 'open';
    return (
        <li className="px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => onPicture(r)} aria-label={r.image ? 'Change picture' : 'Add a picture'}
                    className="hidden h-16 w-28 shrink-0 overflow-hidden rounded-xl border border-black/[0.06] bg-black/[0.03] text-gray-400 hover:border-black/20 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-white/25 sm:flex sm:items-center sm:justify-center">
                    {r.image ? <img src={sizedImage(r.image, 320)} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-0.5 text-[11px] font-semibold"><ImageIcon size={16} /> Add picture</span>}
                </button>
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[15px] font-bold">{r.eventName}</p>
                        <Badge tone="violet">Payment page</Badge>
                        <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <p className="truncate font-mono text-[12px] text-gray-500 dark:text-zinc-400">{linkOf(r)}</p>
                    <span className="block text-[11px] text-gray-400">
                        {payments.length ? `${payments.length} payment${payments.length === 1 ? '' : 's'} · last ${formatDateTime(r.lastPaidAt || payments[0]?.paidAt)}` : `No payments yet · created ${formatDateTime(r.createdAt)}`}
                        {r.createdBy ? ` · ${r.createdBy}` : ''}
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <p className="mr-auto text-lg font-extrabold tabular-nums sm:mr-2">{inr(r.paidTotal)}</p>
                    {live && <Button variant="secondary" className="h-10" onClick={() => copyLink(r)}><Copy size={14} /> Copy link</Button>}
                    {live && <Button as="a" href={whatsappUrl(r)} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-10 w-10 px-0" aria-label="Share on WhatsApp"><Send size={14} /></Button>}
                    <Menu title="Page actions" trigger={({ toggle: t }) => <Button variant="ghost" onClick={t} aria-label={`More for ${r.eventName}`} className="h-10 w-10 px-0" disabled={Boolean(busy)}>{busy ? <RefreshCw size={16} className="animate-spin" /> : <MoreHorizontal size={17} />}</Button>}>
                        <MenuItem icon={ExternalLink} as="a" href={linkOf(r)} target="_blank" rel="noopener noreferrer">Open page</MenuItem>
                        <MenuItem icon={ImageIcon} onClick={() => onPicture(r)}>{r.image ? 'Change picture' : 'Add a picture'}</MenuItem>
                        {live && <MenuItem icon={Ban} danger onClick={() => onClose(r)}>Close page</MenuItem>}
                    </Menu>
                </div>
            </div>
            {payments.length > 0 && (
                <div className="mt-3">
                    <button type="button" onClick={() => setOpenList(v => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[12px] font-bold text-gray-600 hover:bg-black/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.05]">
                        <ChevronDown size={14} className={openList ? 'rotate-180 transition-transform' : 'transition-transform'} /> {openList ? 'Hide payments' : 'Show payments'}
                    </button>
                    {openList && (
                        <ul className="mt-2 divide-y divide-black/[0.05] rounded-xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                            {payments.map(p => (
                                <li key={p.paymentId} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center">
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[13px] font-bold">{p.name || 'Buyer'}</span>
                                            {p.emailStatus === 'sent' && <Badge tone="blue"><Mail size={10} /> Confirmation sent</Badge>}
                                            {p.emailStatus === 'failed' && <Badge tone="red"><AlertTriangle size={10} /> Email not sent</Badge>}
                                        </div>
                                        <ContactLinks phone={p.phone} email={p.email} />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <CopyChip text={p.paymentId} label="Payment ID" prefix="Razorpay" />
                                            <span className="text-[11px] text-gray-400">{formatDateTime(p.paidAt)}{p.method ? ` by ${p.method}` : ''}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="mr-auto text-[15px] font-extrabold tabular-nums sm:mr-1">{inr(p.amount)}</span>
                                        {p.emailStatus === 'failed' && <Button variant="secondary" className="h-9" onClick={() => onResend(r, p)} disabled={Boolean(busy)}><Mail size={13} /> Resend</Button>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </li>
    );
};

const TicketResale = () => {
    const user = useStore(s => s.user);
    const canSeeMoney = FINANCE_ROLES.includes(user?.role);
    const [rows, setRows] = useState(null);
    const [gatewayReady, setGatewayReady] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [picturePage, setPicturePage] = useState(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [ask, confirmSheet] = useConfirm();
    const [busy, run] = useBusy();

    const load = useCallback(async () => {
        setRefreshing(true);
        const res = await callTicketApi('ticket-resale-list', {}, { timeoutMs: 30000 });
        setRefreshing(false);
        if (!res.ok) { setLoadError(apiError(res, "Couldn't load the links.")); return; }
        setLoadError('');
        setGatewayReady(Boolean(res.data.gatewayReady));
        setRows(res.data.resales || []);
    }, []);
    useEffect(() => { load(); }, [load]);

    const replace = (next) => setRows(list => {
        const cur = list || [];
        return cur.some(r => r.id === next.id) ? cur.map(r => (r.id === next.id ? next : r)) : [next, ...cur];
    });

    const sync = (r) => run(r.id, r.status === 'paid' ? 'Sending…' : 'Checking…', async () => {
        const res = await callTicketApi('ticket-resale-sync', { id: r.id }, { timeoutMs: 25000 });
        if (!res.ok) throw new Error(apiError(res, "Couldn't check with Razorpay."));
        const next = res.data.resale;
        replace(next);
        if (next.status === 'paid') {
            const mailed = next.emailStatus === 'sent';
            toast(mailed ? 'Paid. The buyer has the confirmation email.' : next.emailStatus === 'no_email' ? 'Paid. The buyer gave no email, so no confirmation went.' : 'Paid, but the email did not go. Try again in a bit.', mailed ? 'success' : next.emailStatus === 'no_email' ? 'info' : 'error');
        } else {
            toast(next.status === 'awaiting' ? 'Not paid yet.' : `This link is ${STATUS[next.status]?.label.toLowerCase() || next.status}.`, 'info');
        }
    });

    const resendPageEmail = (r, p) => run(r.id, 'Sending…', async () => {
        const res = await callTicketApi('ticket-resale-sync', { id: r.id, paymentId: p.paymentId }, { timeoutMs: 25000 });
        if (!res.ok) throw new Error(apiError(res, "Couldn't send the email."));
        replace(res.data.resale);
        const after = (res.data.resale.payments || []).find(x => x.paymentId === p.paymentId);
        toast(after?.emailStatus === 'sent' ? 'Confirmation sent.' : 'The email did not go. Try again in a bit.', after?.emailStatus === 'sent' ? 'success' : 'error');
    });

    const closePage = (r) => ask({
        title: 'Close this payment page?',
        body: `Nobody will be able to pay for ${r.eventName} on it any more. Payments already made stay here.`,
        confirmLabel: 'Close page',
        cancelLabel: 'Keep it open',
        danger: true,
        busyLabel: 'Closing…',
        action: async () => {
            const res = await callTicketApi('ticket-resale-cancel', { id: r.id });
            if (!res.ok) throw new Error(apiError(res, "Couldn't close the page."));
            replace(res.data.resale);
            toast('Page closed.', 'success');
        },
    });

    const cancel = (r) => ask({
        title: 'Cancel this payment link?',
        body: `Nobody will be able to pay ${inr(r.amount)} for ${r.eventName} on this link any more.`,
        confirmLabel: 'Cancel link',
        cancelLabel: 'Keep it',
        danger: true,
        busyLabel: 'Cancelling…',
        action: async () => {
            const res = await callTicketApi('ticket-resale-cancel', { id: r.id });
            if (!res.ok) throw new Error(apiError(res, "Couldn't cancel the link."));
            replace(res.data.resale);
            toast(res.data.resale.status === 'paid' ? 'It was already paid, so it stays.' : 'Link cancelled.', res.data.resale.status === 'paid' ? 'info' : 'success');
        },
    });

    const list = rows || [];
    // Open = links awaiting payment and pages taking payments; Paid = paid links and pages with payments.
    const isOpen = (r) => r.status === 'awaiting' || r.status === 'open';
    const hasPaid = (r) => r.status === 'paid' || (isPage(r) && (r.paidCount || 0) > 0);
    const isClosed = (r) => ['cancelled', 'expired', 'closed'].includes(r.status);
    const counts = useMemo(() => ({
        all: list.length,
        awaiting: list.filter(isOpen).length,
        paid: list.reduce((a, r) => a + (isPage(r) ? (r.paidCount || 0) : r.status === 'paid' ? 1 : 0), 0),
        paidRows: list.filter(hasPaid).length,
        closed: list.filter(isClosed).length,
        collected: list.reduce((a, r) => a + (isPage(r) ? (Number(r.paidTotal) || 0) : r.status === 'paid' ? (Number(r.paidAmount ?? r.amount) || 0) : 0), 0),
    }), [list]); // eslint-disable-line react-hooks/exhaustive-deps

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return list.filter(r => {
            if (filter === 'awaiting' && !isOpen(r)) return false;
            if (filter === 'paid' && !hasPaid(r)) return false;
            if (filter === 'closed' && !isClosed(r)) return false;
            if (!q) return true;
            const people = (r.payments || []).flatMap(p => [p.name, p.email, p.phone, p.paymentId]);
            return [r.eventName, r.buyerName, r.buyerEmail, r.buyerPhone, r.paymentId, ...people].some(v => String(v || '').toLowerCase().includes(q));
        });
    }, [list, filter, search]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Resale links', icon: Link2, description: 'Payment links and pages for tickets you resell by hand' }}
            hideTabs
            action={(
                <div className="flex w-full gap-2 sm:w-auto">
                    <Button variant="secondary" className="h-11 flex-1 sm:flex-none" onClick={load} disabled={refreshing}>
                        <RefreshCw size={15} className={refreshing ? 'animate-spin' : undefined} /> {refreshing ? 'Checking…' : 'Refresh'}
                    </Button>
                    <Button variant="accent" className="h-11 flex-1 sm:flex-none" onClick={() => setCreating(true)} disabled={!gatewayReady}><Plus size={15} /> New payment link</Button>
                </div>
            )}
        >
            <div className="space-y-5">
                {!gatewayReady && (
                    <Panel className="flex items-start gap-3 border-amber-500/30 bg-amber-500/[0.06] p-4 text-[13px]">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                        <p>Razorpay isn't set up on the server, so links can't be made. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel.</p>
                    </Panel>
                )}

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <StatTile icon={Clock} tone="amber" label="Open" value={counts.awaiting} hint={counts.awaiting ? 'Links and pages taking payment' : 'Nothing open'} onClick={counts.awaiting ? () => setFilter('awaiting') : undefined} active={filter === 'awaiting'} />
                    <StatTile icon={CheckCircle} tone="green" label="Payments" value={counts.paid} hint="Send the tickets by hand" onClick={counts.paidRows ? () => setFilter('paid') : undefined} active={filter === 'paid'} />
                    {canSeeMoney && <StatTile icon={IndianRupee} tone="blue" label="Collected" value={inr(counts.collected)} hint="Links and pages" className="col-span-2 lg:col-span-1" />}
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search event or buyer" className="lg:w-80" />
                    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                        <SegmentedTabs value={filter} onChange={setFilter} items={[
                            { value: 'all', label: 'All', count: counts.all },
                            { value: 'awaiting', label: 'Open', count: counts.awaiting },
                            { value: 'paid', label: 'Paid', count: counts.paidRows },
                            { value: 'closed', label: 'Closed', count: counts.closed },
                        ]} />
                    </div>
                </div>

                {loadError && (
                    <Panel className="flex items-center justify-between gap-3 p-4 text-[13px] font-semibold text-red-600 dark:text-red-300">
                        <span>{loadError}</span>
                        <Button variant="secondary" className="h-10" onClick={load}>Try again</Button>
                    </Panel>
                )}

                {rows === null && !loadError ? (
                    <Panel className="p-8 text-center text-[13px] text-gray-500">Loading links…</Panel>
                ) : shown.length === 0 && !loadError ? (
                    <Panel>
                        <EmptyState
                            icon={Link2}
                            title={list.length ? 'Nothing here' : 'No payment links yet'}
                            description={list.length ? 'Try another filter or search.' : 'Make a Razorpay link with a fixed amount, or a payment page where the buyer types the amount. Either way they get an email once it is paid.'}
                            action={!list.length && gatewayReady && <Button variant="accent" className="h-11" onClick={() => setCreating(true)}><Plus size={14} /> New payment link</Button>}
                        />
                    </Panel>
                ) : shown.length > 0 && (
                    <Panel className="overflow-hidden">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map(r => (isPage(r)
                                ? <PageRow key={r.id} r={r} busy={busy[r.id]} onResend={resendPageEmail} onClose={closePage} onPicture={setPicturePage} />
                                : <ResaleRow key={r.id} r={r} busy={busy[r.id]} onSync={sync} onCancel={cancel} />))}
                        </ul>
                    </Panel>
                )}
            </div>

            <NewLinkSheet open={creating} onClose={() => setCreating(false)} onCreated={replace} />
            <PictureSheet page={picturePage} onClose={() => setPicturePage(null)} onSaved={replace} />
            {confirmSheet}
        </AdminCommunityHubLayout>
    );
};

export default TicketResale;
