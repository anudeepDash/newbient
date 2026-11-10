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
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import Sheet from '../../components/admin/Sheet';
import { Button, Badge, SearchInput, SegmentedTabs, EmptyState, StatTile, Menu, MenuItem } from '../../components/admin/ui';
import { Panel, CopyChip, ContactLinks, useConfirm, useBusy } from '../../components/admin/ticketing/kit';
import { Field, fieldCls } from '../../components/admin/uploads/UploadKit';
import { inr, formatDateTime } from '../../components/admin/ticketing/format';
import { callTicketApi } from '../../lib/ticketApi';
import { copyToClipboard } from '../../lib/clipboard';
import { useStore } from '../../lib/store';
import { FINANCE_ROLES } from '../../constants/roles';

/*
 * Resale payment links, kept as simple as possible: the event name and the
 * amount make a Razorpay link to share. The buyer gives their email and phone on
 * Razorpay's page and gets a "payment received" email once it's paid. Everything
 * else (handing over the tickets) stays manual. Server: api/_lib/ticketResale.js.
 */

const STATUS = {
    awaiting: { label: 'Awaiting payment', tone: 'amber' },
    paid: { label: 'Paid', tone: 'green' },
    cancelled: { label: 'Cancelled', tone: 'gray' },
    expired: { label: 'Expired', tone: 'red' },
};

const apiError = (res, fallback) => res?.error || (res?.unavailable ? "Couldn't reach the server. Check your connection and try again." : fallback);

const toast = (msg, tone = 'success', opts) => useStore.getState().addToast(msg, tone, opts);

const shareText = (r) => `Payment link for ${r.eventName}: ${inr(r.amount)}\n${r.shortUrl}\nYou'll get an email from Newbi once it's paid.`;
const whatsappUrl = (r) => `https://wa.me/?text=${encodeURIComponent(shareText(r))}`;

const copyLink = async (r) => {
    const ok = await copyToClipboard(r.shortUrl);
    toast(ok ? 'Payment link copied.' : 'Select it and copy it by hand.', ok ? 'success' : 'error');
};

// ── new link: event name and amount, that's all ─────────────────────────────

const NewLinkSheet = ({ open, onClose, onCreated }) => {
    const [eventName, setEventName] = useState('');
    const [amount, setAmount] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [created, setCreated] = useState(null);

    useEffect(() => { if (open) { setEventName(''); setAmount(''); setError(''); setCreated(null); } }, [open]);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (busy) return;
        setBusy(true);
        setError('');
        const res = await callTicketApi('ticket-resale-create', { eventName, amount: Number(amount) }, { timeoutMs: 25000 });
        setBusy(false);
        if (!res.ok) { setError(apiError(res, "Couldn't create the link.")); return; }
        setCreated(res.data.resale);
        onCreated?.(res.data.resale);
    };

    if (created) {
        return (
            <Sheet open={open} onClose={onClose} variant="dialog" size="sm" title="Payment link ready" subtitle={`${created.eventName} · ${inr(created.amount)}`}
                footer={<Button variant="accent" className="h-12 w-full" onClick={onClose}>Done</Button>}>
                <div className="space-y-4">
                    <p className="break-all rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 font-mono text-[15px] font-bold">{created.shortUrl}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" className="h-12" onClick={() => copyLink(created)}><Copy size={15} /> Copy link</Button>
                        <Button as="a" href={whatsappUrl(created)} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-12"><Send size={15} /> WhatsApp</Button>
                    </div>
                    <p className="text-[13px] leading-relaxed text-gray-500 dark:text-zinc-400">
                        The buyer enters their email on the payment page and gets a confirmation once they pay. Send the tickets yourself after that.
                    </p>
                </div>
            </Sheet>
        );
    }

    return (
        <Sheet open={open} onClose={busy ? undefined : onClose} variant="dialog" size="sm" title="New payment link"
            footer={<Button variant="accent" className="h-12 w-full" onClick={submit} disabled={busy}>{busy ? 'Creating link…' : 'Create payment link'}</Button>}>
            <form onSubmit={submit} className="space-y-4">
                <Field label="Event name">
                    <input className={fieldCls} value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Coldplay, Mumbai" maxLength={140} autoFocus required />
                </Field>
                <Field label="Amount (₹)">
                    <input className={fieldCls} type="number" inputMode="decimal" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required />
                </Field>
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

const TicketResale = () => {
    const user = useStore(s => s.user);
    const canSeeMoney = FINANCE_ROLES.includes(user?.role);
    const [rows, setRows] = useState(null);
    const [gatewayReady, setGatewayReady] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
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
    const counts = useMemo(() => ({
        all: list.length,
        awaiting: list.filter(r => r.status === 'awaiting').length,
        paid: list.filter(r => r.status === 'paid').length,
        closed: list.filter(r => r.status === 'cancelled' || r.status === 'expired').length,
        collected: list.filter(r => r.status === 'paid').reduce((a, r) => a + (Number(r.paidAmount ?? r.amount) || 0), 0),
    }), [list]);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return list.filter(r => {
            if (filter === 'awaiting' && r.status !== 'awaiting') return false;
            if (filter === 'paid' && r.status !== 'paid') return false;
            if (filter === 'closed' && !['cancelled', 'expired'].includes(r.status)) return false;
            if (!q) return true;
            return [r.eventName, r.buyerName, r.buyerEmail, r.buyerPhone, r.paymentId].some(v => String(v || '').toLowerCase().includes(q));
        });
    }, [list, filter, search]);

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Resale links', icon: Link2, description: 'Razorpay payment links for tickets you resell by hand' }}
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
                    <StatTile icon={Clock} tone="amber" label="Awaiting payment" value={counts.awaiting} hint={counts.awaiting ? 'Tap to see them' : 'Nothing open'} onClick={counts.awaiting ? () => setFilter('awaiting') : undefined} active={filter === 'awaiting'} />
                    <StatTile icon={CheckCircle} tone="green" label="Paid" value={counts.paid} hint="Send the tickets by hand" onClick={counts.paid ? () => setFilter('paid') : undefined} active={filter === 'paid'} />
                    {canSeeMoney && <StatTile icon={IndianRupee} tone="blue" label="Collected" value={inr(counts.collected)} hint="Paid links" className="col-span-2 lg:col-span-1" />}
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search event or buyer" className="lg:w-80" />
                    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                        <SegmentedTabs value={filter} onChange={setFilter} items={[
                            { value: 'all', label: 'All', count: counts.all },
                            { value: 'awaiting', label: 'Awaiting', count: counts.awaiting },
                            { value: 'paid', label: 'Paid', count: counts.paid },
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
                            description={list.length ? 'Try another filter or search.' : 'Type the event name and amount, and share the Razorpay link. The buyer gets an email once it is paid.'}
                            action={!list.length && gatewayReady && <Button variant="accent" className="h-11" onClick={() => setCreating(true)}><Plus size={14} /> New payment link</Button>}
                        />
                    </Panel>
                ) : shown.length > 0 && (
                    <Panel className="overflow-hidden">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map(r => <ResaleRow key={r.id} r={r} busy={busy[r.id]} onSync={sync} onCancel={cancel} />)}
                        </ul>
                    </Panel>
                )}
            </div>

            <NewLinkSheet open={creating} onClose={() => setCreating(false)} onCreated={replace} />
            {confirmSheet}
        </AdminCommunityHubLayout>
    );
};

export default TicketResale;
