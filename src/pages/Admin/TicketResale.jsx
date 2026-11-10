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
import { Field, Choice, fieldCls, areaCls } from '../../components/admin/uploads/UploadKit';
import { inr, formatDateTime, formatEventDate } from '../../components/admin/ticketing/format';
import { callTicketApi } from '../../lib/ticketApi';
import { copyToClipboard } from '../../lib/clipboard';
import { useStore } from '../../lib/store';
import { FINANCE_ROLES } from '../../constants/roles';
import { cn } from '../../lib/utils';

/*
 * Resale payment links. For tickets Newbi resells by hand: the team types in the
 * ticket details and the buyer, Razorpay makes a payment link, and the buyer gets
 * a "payment received" email once it's paid. Everything else (getting and
 * handing over the tickets) stays manual. Server: api/_lib/ticketResale.js.
 */

const STATUS = {
    awaiting: { label: 'Awaiting payment', tone: 'amber' },
    paid: { label: 'Paid', tone: 'green' },
    cancelled: { label: 'Cancelled', tone: 'gray' },
    expired: { label: 'Expired', tone: 'red' },
};

const EMPTY_FORM = {
    eventName: '', eventDate: '', venue: '', ticketType: '', quantity: '1', unitPrice: '',
    buyerName: '', buyerEmail: '', buyerPhone: '', note: '', expiresInDays: '7', notify: 'razorpay',
};

const apiError = (res, fallback) => res?.error || (res?.unavailable ? "Couldn't reach the server. Check your connection and try again." : fallback);

const toast = (msg, tone = 'success', opts) => useStore.getState().addToast(msg, tone, opts);

const whatsappUrl = (r) => {
    const digits = String(r.buyerPhone || '').replace(/\D/g, '');
    const text = `Hi ${String(r.buyerName || '').split(' ')[0] || 'there'}, here's the payment link for ${r.quantity} × ${r.ticketType} for ${r.eventName}: ${inr(r.amount)}.\n${r.shortUrl}\nReference: ${r.ref}. You'll get an email from Newbi once the payment goes through.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

const copyLink = async (r) => {
    const ok = await copyToClipboard(r.shortUrl);
    toast(ok ? 'Payment link copied.' : 'Select it and copy it by hand.', ok ? 'success' : 'error');
};

// ── new link ────────────────────────────────────────────────────────────────

const NewLinkSheet = ({ open, onClose, onCreated }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [created, setCreated] = useState(null);
    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e?.target ? e.target.value : e }));

    useEffect(() => { if (open) { setForm(EMPTY_FORM); setError(''); setCreated(null); } }, [open]);

    const total = (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (busy) return;
        setBusy(true);
        setError('');
        const res = await callTicketApi('ticket-resale-create', {
            ...form,
            quantity: Number(form.quantity),
            unitPrice: Number(form.unitPrice),
            expiresInDays: Number(form.expiresInDays),
            notifyEmail: form.notify === 'razorpay',
            notifySms: form.notify === 'razorpay',
        }, { timeoutMs: 25000 });
        setBusy(false);
        if (!res.ok) { setError(apiError(res, "Couldn't create the link.")); return; }
        setCreated(res.data.resale);
        onCreated?.(res.data.resale);
    };

    if (created) {
        return (
            <Sheet open={open} onClose={onClose} title="Payment link ready" subtitle={`${created.buyerName} · ${inr(created.amount)}`}
                footer={<Button variant="accent" className="h-12 w-full" onClick={onClose}>Done</Button>}>
                <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
                        <p className="text-[12px] font-bold text-emerald-700 dark:text-neon-green">Razorpay link</p>
                        <p className="mt-1 break-all font-mono text-[15px] font-bold">{created.shortUrl}</p>
                        <p className="mt-2 text-[12px] text-gray-500 dark:text-zinc-400">
                            {created.notifiedBy?.email || created.notifiedBy?.sms
                                ? `Razorpay is also sending it to the buyer by ${[created.notifiedBy.email && 'email', created.notifiedBy.sms && 'SMS'].filter(Boolean).join(' and ')}.`
                                : 'Razorpay is not sending it. Share it with the buyer yourself.'}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" className="h-12" onClick={() => copyLink(created)}><Copy size={15} /> Copy link</Button>
                        {created.buyerPhone
                            ? <Button as="a" href={whatsappUrl(created)} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-12"><Send size={15} /> WhatsApp</Button>
                            : <Button as="a" href={created.shortUrl} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-12"><ExternalLink size={15} /> Open</Button>}
                    </div>
                    <p className="text-[13px] leading-relaxed text-gray-500 dark:text-zinc-400">
                        When it's paid, this list shows it and {created.buyerEmail} gets a payment-received email with reference <span className="font-mono font-bold">{created.ref}</span>. Send the tickets yourself after that.
                    </p>
                </div>
            </Sheet>
        );
    }

    return (
        <Sheet open={open} onClose={busy ? undefined : onClose} title="New payment link" subtitle="For tickets you're reselling. Only the payment and its confirmation email are automatic."
            footer={(
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-gray-500">Buyer pays</p>
                        <p className="text-lg font-extrabold tabular-nums">{inr(total)}</p>
                    </div>
                    <Button variant="accent" className="h-12 flex-[1.4]" onClick={submit} disabled={busy}>{busy ? 'Creating link…' : 'Create payment link'}</Button>
                </div>
            )}>
            <form onSubmit={submit} className="space-y-6">
                <section className="space-y-3">
                    <h3 className="text-[13px] font-bold">Tickets</h3>
                    <Field label="Event"><input className={fieldCls} value={form.eventName} onChange={set('eventName')} placeholder="Event name" maxLength={140} required /></Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Event date" optional><input className={fieldCls} type="date" value={form.eventDate} onChange={set('eventDate')} /></Field>
                        <Field label="Venue" optional><input className={fieldCls} value={form.venue} onChange={set('venue')} placeholder="Venue, city" maxLength={140} /></Field>
                    </div>
                    <Field label="Ticket type" optional><input className={fieldCls} value={form.ticketType} onChange={set('ticketType')} placeholder="e.g. Gold, GA, Fan pit" maxLength={80} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Quantity"><input className={fieldCls} type="number" inputMode="numeric" min="1" max="100" value={form.quantity} onChange={set('quantity')} required /></Field>
                        <Field label="Price per ticket (₹)"><input className={fieldCls} type="number" inputMode="decimal" min="1" step="0.01" value={form.unitPrice} onChange={set('unitPrice')} placeholder="0" required /></Field>
                    </div>
                </section>

                <section className="space-y-3">
                    <h3 className="text-[13px] font-bold">Buyer</h3>
                    <Field label="Name"><input className={fieldCls} value={form.buyerName} onChange={set('buyerName')} autoComplete="off" maxLength={120} required /></Field>
                    <Field label="Email" hint="The payment-received email goes here."><input className={fieldCls} type="email" inputMode="email" value={form.buyerEmail} onChange={set('buyerEmail')} autoComplete="off" required /></Field>
                    <Field label="Phone" optional hint="For Razorpay's SMS and your WhatsApp share."><input className={fieldCls} type="tel" inputMode="tel" value={form.buyerPhone} onChange={set('buyerPhone')} placeholder="98765 43210" autoComplete="off" /></Field>
                </section>

                <section className="space-y-3">
                    <h3 className="text-[13px] font-bold">Link</h3>
                    <Field label="Who sends the link">
                        <Choice value={form.notify} onChange={set('notify')} options={[
                            { value: 'razorpay', label: 'Razorpay too', hint: 'Email and SMS to the buyer' },
                            { value: 'me', label: 'Only me', hint: 'You share it yourself' },
                        ]} />
                    </Field>
                    <Field label="Link works for">
                        <Choice value={form.expiresInDays} onChange={set('expiresInDays')} options={[
                            { value: '1', label: '1 day' },
                            { value: '3', label: '3 days' },
                            { value: '7', label: '7 days' },
                        ]} />
                    </Field>
                    <Field label="Team note" optional hint="Only the team sees this. Seller, seat numbers, where the tickets are.">
                        <textarea className={cn(areaCls, 'min-h-20')} value={form.note} onChange={set('note')} maxLength={500} />
                    </Field>
                </section>

                {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-[13px] font-semibold text-red-600 dark:text-red-300">{error}</p>}
            </form>
        </Sheet>
    );
};

// ── list ────────────────────────────────────────────────────────────────────

const ResaleRow = ({ r, busy, onSync, onCancel }) => {
    const status = STATUS[r.status] || STATUS.awaiting;
    const live = r.status === 'awaiting' && r.shortUrl;
    return (
        <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:px-5">
            <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-bold">{r.buyerName}</p>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {r.status === 'paid' && r.emailStatus === 'failed' && <Badge tone="red"><AlertTriangle size={10} /> Email not sent</Badge>}
                    {r.status === 'paid' && r.emailStatus === 'sent' && <Badge tone="blue"><Mail size={10} /> Confirmation sent</Badge>}
                </div>
                <p className="text-[13px] text-gray-600 dark:text-zinc-300">
                    <span className="font-semibold">{r.quantity} × {r.ticketType}</span> · {r.eventName}
                    {r.eventDate ? ` · ${formatEventDate(r.eventDate)}` : ''}{r.venue ? ` · ${r.venue}` : ''}
                </p>
                <ContactLinks phone={r.buyerPhone} email={r.buyerEmail} />
                {r.note && <p className="text-[12px] text-gray-500 dark:text-zinc-400">Note: {r.note}</p>}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <CopyChip text={r.ref} label="Reference" />
                    {r.paymentId && <CopyChip text={r.paymentId} label="Payment ID" prefix="Razorpay" />}
                    <span className="text-[11px] text-gray-400">
                        {r.status === 'paid' && r.paidAt ? `Paid ${formatDateTime(r.paidAt)}${r.paymentMethod ? ` by ${r.paymentMethod}` : ''}`
                            : r.status === 'awaiting' && r.expiresAt ? `Created ${formatDateTime(r.createdAt)} · expires ${formatDateTime(r.expiresAt)}`
                                : `Created ${formatDateTime(r.createdAt)}`}
                        {r.createdBy ? ` · ${r.createdBy}` : ''}
                    </span>
                </div>
                {r.linkError && <p className="text-[12px] font-semibold text-red-600 dark:text-red-300">{r.linkError}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                <p className="text-lg font-extrabold tabular-nums">{inr(r.paidAmount ?? r.amount)}</p>
                <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
                    {live && <Button variant="secondary" className="h-10" onClick={() => copyLink(r)}><Copy size={14} /> Copy</Button>}
                    {live && r.buyerPhone && <Button as="a" href={whatsappUrl(r)} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-10" aria-label="Share on WhatsApp"><Send size={14} /></Button>}
                    {r.status === 'paid' && r.emailStatus === 'failed' && (
                        <Button variant="secondary" className="h-10" onClick={() => onSync(r)} disabled={Boolean(busy)}><Mail size={14} /> {busy || 'Resend email'}</Button>
                    )}
                    {r.status === 'awaiting' && (
                        <Menu title="Link actions" trigger={({ toggle: t }) => <Button variant="ghost" onClick={t} aria-label={`More for ${r.ref}`} className="h-10 w-10 px-0" disabled={Boolean(busy)}>{busy ? <RefreshCw size={16} className="animate-spin" /> : <MoreHorizontal size={17} />}</Button>}>
                            <MenuItem icon={RefreshCw} onClick={() => onSync(r)} hint="Ask Razorpay now">Check payment</MenuItem>
                            {r.shortUrl && <MenuItem icon={ExternalLink} as="a" href={r.shortUrl} target="_blank" rel="noopener noreferrer">Open link</MenuItem>}
                            <MenuItem icon={Ban} danger onClick={() => onCancel(r)}>Cancel link</MenuItem>
                        </Menu>
                    )}
                </div>
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
        replace(res.data.resale);
        const s = res.data.resale.status;
        if (s === 'paid') toast(res.data.resale.emailStatus === 'sent' ? 'Paid. The buyer has the confirmation email.' : 'Paid, but the email did not go. Try again in a bit.', res.data.resale.emailStatus === 'sent' ? 'success' : 'error');
        else toast(s === 'awaiting' ? 'Not paid yet.' : `This link is ${STATUS[s]?.label.toLowerCase() || s}.`, 'info');
    });

    const cancel = (r) => ask({
        title: 'Cancel this payment link?',
        body: `${r.buyerName} won't be able to pay ${inr(r.amount)} on ${r.shortUrl} any more. You can make a new link later.`,
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
        mailFailed: list.filter(r => r.status === 'paid' && r.emailStatus === 'failed').length,
    }), [list]);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return list.filter(r => {
            if (filter === 'awaiting' && r.status !== 'awaiting') return false;
            if (filter === 'paid' && r.status !== 'paid') return false;
            if (filter === 'closed' && !['cancelled', 'expired'].includes(r.status)) return false;
            if (!q) return true;
            return [r.buyerName, r.buyerEmail, r.buyerPhone, r.eventName, r.ref, r.paymentId, r.ticketType].some(v => String(v || '').toLowerCase().includes(q));
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

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Clock} tone="amber" label="Awaiting payment" value={counts.awaiting} hint={counts.awaiting ? 'Tap to see them' : 'Nothing open'} onClick={counts.awaiting ? () => setFilter('awaiting') : undefined} active={filter === 'awaiting'} />
                    <StatTile icon={CheckCircle} tone="green" label="Paid" value={counts.paid} hint={counts.mailFailed ? `${counts.mailFailed} email${counts.mailFailed === 1 ? '' : 's'} to resend` : 'Send the tickets by hand'} onClick={counts.paid ? () => setFilter('paid') : undefined} active={filter === 'paid'} />
                    {canSeeMoney
                        ? <StatTile icon={IndianRupee} tone="blue" label="Collected" value={inr(counts.collected)} hint="Paid links, last 200" />
                        : <StatTile icon={Ban} tone="gray" label="Cancelled or expired" value={counts.closed} hint="Not payable any more" />}
                    <StatTile icon={Link2} tone="orange" label="All links" value={counts.all} hint="Newest first" onClick={() => setFilter('all')} active={filter === 'all'} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search buyer, event, reference" className="lg:w-80" />
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
                            description={list.length
                                ? 'Try another filter or search.'
                                : 'Reselling tickets? Type in the tickets and the buyer, and send them a Razorpay link. They get an email once it is paid; the tickets you send yourself.'}
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
