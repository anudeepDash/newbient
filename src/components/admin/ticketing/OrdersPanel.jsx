import React, { useMemo, useState } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Send from 'lucide-react/dist/esm/icons/send';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import Eye from 'lucide-react/dist/esm/icons/eye';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import { orderItems, orderTicketCount, isOrderCheckedIn, SOLD_STATUSES, computeAvailability } from '../../../lib/ticketing';
import Sheet from '../Sheet';
import { Button, Badge, SearchInput, SegmentedTabs, EmptyState, Menu, MenuItem, Avatar } from '../ui';
import { accent } from '../theme';
import { Panel, ContactLinks, CopyChip, SelectBox, useConfirm, useBusy } from './kit';
import { inr, formatDateTime, ORDER_STATUS, personName } from './format';

/*
 * Ticket orders for one event: verify payments (match the UTR with the bank),
 * send tickets, cancel. Check-in lives on the Check-in tab.
 */

const FILTERS = [
    { value: 'pending', label: 'To verify' },
    { value: 'approved', label: 'Paid, not sent' },
    { value: 'sold', label: 'Sold' },
    { value: 'flagged', label: 'Needs a look' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
];

const matchesFilter = (o, filter) => {
    switch (filter) {
        case 'pending': return o.status === 'pending';
        case 'approved': return o.status === 'approved';
        case 'sold': return SOLD_STATUSES.includes(o.status);
        case 'checkedin': return SOLD_STATUSES.includes(o.status) && isOrderCheckedIn(o);
        case 'flagged': return o.status !== 'rejected' && Boolean(o.overCapacity || o.couponRejected);
        case 'rejected': return o.status === 'rejected';
        default: return true;
    }
};

const sortValue = (o) => {
    const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : new Date(o.createdAt || 0).getTime();
    return isNaN(d) ? 0 : d;
};

const statusOf = (o) => ORDER_STATUS[o.status] || { label: o.status || 'Unknown', tone: 'gray' };
const isPaid = (o) => Number(o.totalAmount) > 0;
const hasUtr = (o) => o.paymentRef && o.paymentRef !== 'FREE';

const OrderFlags = ({ o }) => (
    <>
        {SOLD_STATUSES.includes(o.status) && isOrderCheckedIn(o) && o.status !== 'attended' && <Badge tone="green"><UserCheck size={10} /> In</Badge>}
        {o.overCapacity && o.status !== 'rejected' && <Badge tone="red"><AlertTriangle size={10} /> Over capacity</Badge>}
        {o.couponRejected && o.status !== 'rejected' && <Badge tone="amber">Coupon {o.requestedCoupon} refused</Badge>}
    </>
);

const Timeline = ({ o }) => {
    const steps = [
        { label: 'Booked', at: o.createdAt, tone: 'blue' },
        { label: 'Payment verified', at: o.approvedAt, tone: 'orange' },
        { label: 'Ticket sent', at: o.dispatchedAt, tone: 'green' },
        { label: 'Checked in', at: o.scannedAt || o.attendedAt, tone: 'teal' },
        { label: 'Rejected', at: o.rejectedAt, tone: 'red' },
    ].filter(s => s.at);
    return (
        <ol className="space-y-2.5">
            {steps.map(s => (
                <li key={s.label} className="flex items-center gap-3 text-[13px]">
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', accent(s.tone).dot)} />
                    <span className="font-semibold">{s.label}</span>
                    <span className="ml-auto text-gray-500">{formatDateTime(s.at)}</span>
                </li>
            ))}
        </ol>
    );
};

// Amounts always show here: whoever verifies payments needs them.
const OrdersPanel = ({ event, orders, initialFilter, canSeeMoney = true, canReview = true }) => {
    const addToast = useStore(s => s.addToast);
    const updateTicketOrderStatus = useStore(s => s.updateTicketOrderStatus);
    const counts = useMemo(() => Object.fromEntries([...FILTERS, { value: 'checkedin' }].map(f => [f.value, orders.filter(o => matchesFilter(o, f.value)).length])), [orders]);
    const [filter, setFilter] = useState(() => initialFilter || (counts.pending ? 'pending' : 'all'));
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(() => new Set());
    const [openId, setOpenId] = useState(null);
    const [bulk, setBulk] = useState(null); // { label, done, total }
    const [busy, run] = useBusy();
    const [ask, confirmSheet] = useConfirm();

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders
            .filter(o => matchesFilter(o, filter))
            .filter(o => !q || [o.customerName, o.name, o.customerEmail, o.email, o.customerPhone, o.phone, o.paymentRef, o.bookingRef, o.appliedCoupon?.code]
                .some(v => String(v || '').toLowerCase().includes(q)))
            .sort((a, b) => {
                // Waiting orders first (oldest first, so nobody waits longest), then newest.
                if ((a.status === 'pending') !== (b.status === 'pending')) return a.status === 'pending' ? -1 : 1;
                if (a.status === 'pending') return sortValue(a) - sortValue(b);
                return sortValue(b) - sortValue(a);
            });
    }, [orders, filter, search]);

    const open = orders.find(o => o.id === openId) || null;
    const selectedOrders = orders.filter(o => selected.has(o.id));
    const toggleSelect = (id, on) => setSelected(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });
    const allVisibleSelected = visible.length > 0 && visible.every(o => selected.has(o.id));

    const availability = useMemo(() => computeAvailability(event, orders), [event, orders]);

    // ── single actions ──
    const verify = (o) => {
        const doIt = () => run(o.id, 'approve', async () => {
            await updateTicketOrderStatus(o.id, 'approved');
            addToast(`Payment verified for ${personName(o, 'the buyer')}. Send the ticket next.`, 'success');
        });
        // Bringing back a rejected order takes seats again; say so if that oversells.
        if (o.status === 'rejected') {
            const left = availability.total.remaining;
            const over = left !== null && orderTicketCount(o) > left;
            ask({
                title: 'Verify this order after all?',
                body: over
                    ? `This takes ${orderTicketCount(o)} seats but only ${left} ${left === 1 ? 'is' : 'are'} left, so the event will be over capacity.`
                    : `${personName(o)} gets their ${orderTicketCount(o) === 1 ? 'seat' : 'seats'} back${o.appliedCoupon ? ' and the coupon use is counted again' : ''}.`,
                confirmLabel: 'Verify payment',
                action: async () => {
                    await updateTicketOrderStatus(o.id, 'approved');
                    addToast('Order verified.', 'success');
                },
            });
            return;
        }
        doIt();
    };

    const reject = (o) => ask({
        title: o.status === 'pending' ? 'Reject this order?' : 'Cancel this order?',
        body: `${personName(o)}'s ${orderTicketCount(o) === 1 ? 'seat is' : 'seats are'} released${o.appliedCoupon ? ' and the coupon use is given back' : ''}.${isPaid(o) && o.status !== 'pending' ? ' Refund them yourself if they paid.' : ''}`,
        confirmLabel: o.status === 'pending' ? 'Reject order' : 'Cancel order',
        danger: true,
        action: async () => {
            await updateTicketOrderStatus(o.id, 'rejected');
            addToast(o.status === 'pending' ? 'Order rejected.' : 'Order cancelled.', 'info');
        },
    });

    const send = (o) => run(o.id, 'send', async () => {
        const res = await updateTicketOrderStatus(o.id, 'dispatched');
        if (res?.emailed === false) addToast(`Marked as sent, but the email to ${o.customerEmail || personName(o)} didn't go out. Try Resend.`, 'error');
        else addToast(`Ticket sent to ${o.customerEmail || personName(o)}.`, 'success');
    });

    // ── bulk ──
    const runBulk = async (label, list, fn) => {
        let failed = 0;
        setBulk({ label, done: 0, total: list.length });
        for (let i = 0; i < list.length; i++) {
            try {
                const res = await fn(list[i]);
                if (res === false) failed += 1;
            } catch (err) {
                console.error(label, list[i].id, err);
                failed += 1;
            }
            setBulk({ label, done: i + 1, total: list.length });
        }
        setBulk(null);
        setSelected(new Set());
        return failed;
    };

    const bulkVerify = () => {
        const list = selectedOrders.filter(o => o.status === 'pending');
        const total = list.reduce((a, o) => a + (Number(o.totalAmount) || 0), 0);
        ask({
            title: `Verify ${list.length} ${list.length === 1 ? 'payment' : 'payments'}?`,
            body: `Only do this after matching every UTR with your bank${canSeeMoney ? ` (${inr(total)} in total)` : ''}.`,
            confirmLabel: 'Verify all',
            action: async () => {
                const failed = await runBulk('Verifying', list, (o) => updateTicketOrderStatus(o.id, 'approved'));
                addToast(failed ? `${list.length - failed} verified, ${failed} failed. Try those again.` : `${list.length} payments verified.`, failed ? 'error' : 'success');
            },
        });
    };

    const bulkReject = () => {
        const list = selectedOrders.filter(o => o.status !== 'rejected');
        ask({
            title: `Reject ${list.length} ${list.length === 1 ? 'order' : 'orders'}?`,
            body: 'Their seats are released and coupon uses given back. Refund anyone who already paid.',
            confirmLabel: 'Reject all',
            danger: true,
            action: async () => {
                const failed = await runBulk('Rejecting', list, (o) => updateTicketOrderStatus(o.id, 'rejected'));
                addToast(failed ? `${list.length - failed} rejected, ${failed} failed.` : `${list.length} orders rejected.`, failed ? 'error' : 'info');
            },
        });
    };

    const sendTo = (list) => ask({
        title: `Email ${list.length} ${list.length === 1 ? 'ticket' : 'tickets'}?`,
        body: 'Each buyer gets their ticket and QR code by email.',
        confirmLabel: 'Send tickets',
        action: async () => {
            const failed = await runBulk('Sending', list, async (o) => {
                const res = await updateTicketOrderStatus(o.id, 'dispatched');
                return res?.emailed !== false;
            });
            addToast(failed ? `Sent ${list.length - failed}; ${failed} didn't go out. Use Resend on those.` : 'All tickets sent.', failed ? 'error' : 'success');
        },
    });

    const readyToSend = orders.filter(o => o.status === 'approved');
    const selPending = selectedOrders.filter(o => o.status === 'pending').length;
    const selApproved = selectedOrders.filter(o => o.status === 'approved');
    const selRejectable = selectedOrders.filter(o => o.status !== 'rejected').length;

    const rowActions = (o, inSheet = false) => {
        const working = busy[o.id];
        return (
            <>
                {o.status === 'pending' && (
                    <>
                        <Button variant="success" onClick={(e) => { e.stopPropagation(); verify(o); }} disabled={Boolean(working)} className={cn('h-11', inSheet ? 'flex-[2]' : 'flex-1 md:flex-none')}>
                            <Check size={15} /> {working === 'approve' ? 'Verifying…' : 'Verify payment'}
                        </Button>
                        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); reject(o); }} disabled={Boolean(working)} className={cn('h-11 text-red-600 dark:text-red-400', inSheet && 'flex-1')} aria-label="Reject order">
                            <X size={15} /><span className={inSheet ? '' : 'md:hidden'}>Reject</span>
                        </Button>
                    </>
                )}
                {o.status === 'approved' && (
                    <Button variant="accent" onClick={(e) => { e.stopPropagation(); send(o); }} disabled={Boolean(working)} className={cn('h-11', inSheet ? 'flex-1' : 'flex-1 md:flex-none')}>
                        <Send size={15} /> {working === 'send' ? 'Sending…' : 'Send ticket'}
                    </Button>
                )}
            </>
        );
    };

    const moreMenu = (o) => (
        <Menu trigger={({ toggle }) => (
            <Button variant="ghost" onClick={(e) => { e.stopPropagation(); toggle(e); }} aria-label="More actions" className="h-11 w-11 px-0"><MoreHorizontal size={17} /></Button>
        )}>
            <MenuItem icon={Eye} onClick={() => setOpenId(o.id)}>Details</MenuItem>
            {o.bookingRef && (
                <MenuItem as="a" href={`/ticket/${encodeURIComponent(o.bookingRef)}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open ticket page</MenuItem>
            )}
            {['dispatched', 'confirmed'].includes(o.status) && <MenuItem icon={Send} onClick={() => send(o)} hint="Emails the ticket again">Resend ticket email</MenuItem>}
            {o.status === 'rejected' && <MenuItem icon={Undo2} onClick={() => verify(o)} hint="If it was rejected by mistake">Verify payment after all</MenuItem>}
            {['approved', 'dispatched', 'confirmed'].includes(o.status) && (
                <MenuItem icon={X} danger onClick={() => reject(o)} hint="Releases the seats">Cancel order</MenuItem>
            )}
        </Menu>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <SearchInput value={search} onChange={setSearch} placeholder="Name, phone, email, UTR or booking ref" className="lg:w-96" />
                {canReview && readyToSend.length > 0 && (
                    <Button variant="accent" className="h-11 lg:ml-auto" onClick={() => sendTo(readyToSend)} disabled={Boolean(bulk)}>
                        <Send size={14} /> Send tickets to paid buyers ({readyToSend.length})
                    </Button>
                )}
            </div>

            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <SegmentedTabs
                    value={filter}
                    onChange={(v) => { setFilter(v); setSelected(new Set()); }}
                    items={FILTERS
                        .filter(f => f.value === 'all' || f.value === filter || counts[f.value] > 0)
                        .map(f => ({ ...f, count: counts[f.value], highlight: (f.value === 'pending' || f.value === 'flagged') && counts[f.value] > 0 }))}
                />
            </div>

            {canReview && (selected.size > 0 || bulk) && (
                <div className={cn('sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 flex flex-wrap items-center gap-2 rounded-2xl border p-2.5 backdrop-blur lg:top-2', accent('orange').border, 'bg-white/95 dark:bg-[#0d0f15]/95')}>
                    {bulk ? (
                        <p className="px-2 text-[13px] font-semibold">{bulk.label} {bulk.done} of {bulk.total}…</p>
                    ) : (
                        <>
                            <p className="px-2 text-[13px] font-bold">{selected.size} selected</p>
                            {selPending > 0 && <Button variant="success" size="sm" className="h-10" onClick={bulkVerify}><Check size={14} /> Verify {selPending}</Button>}
                            {selApproved.length > 0 && <Button variant="accent" size="sm" className="h-10" onClick={() => sendTo(selApproved)}><Send size={14} /> Send {selApproved.length}</Button>}
                            {selRejectable > 0 && <Button variant="secondary" size="sm" className="h-10 text-red-600 dark:text-red-400" onClick={bulkReject}><X size={14} /> Reject {selRejectable}</Button>}
                            <Button variant="ghost" size="sm" className="ml-auto h-10" onClick={() => setSelected(new Set())}>Clear</Button>
                        </>
                    )}
                </div>
            )}

            {visible.length === 0 ? (
                <Panel>
                    <EmptyState icon={Inbox} title={orders.length ? (filter === 'pending' ? 'Nothing to verify' : 'No matching orders') : 'No orders yet'}
                        description={orders.length ? (filter === 'pending' ? 'Every payment has been checked.' : 'Try a different filter or search.') : 'Orders appear here as soon as someone books.'} />
                </Panel>
            ) : (
                <Panel className="overflow-hidden">
                    {canReview && (
                        <div className="flex items-center gap-1 border-b border-black/[0.05] px-2 py-1 dark:border-white/[0.05] sm:px-3">
                            <SelectBox checked={allVisibleSelected} onChange={(on) => setSelected(on ? new Set(visible.map(o => o.id)) : new Set())} label="Select all shown" />
                            <span className="text-[12px] font-semibold text-gray-500">
                                {visible.length} {visible.length === 1 ? 'order' : 'orders'} · {visible.reduce((a, o) => a + orderTicketCount(o), 0)} tickets
                                {canSeeMoney ? ` · ${inr(visible.reduce((a, o) => a + (Number(o.totalAmount) || 0), 0))}` : ''}
                            </span>
                        </div>
                    )}
                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                        {visible.map(o => {
                            const status = statusOf(o);
                            return (
                                <li key={o.id} className={cn('cursor-pointer transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]', selected.has(o.id) && accent('orange').soft)} onClick={() => setOpenId(o.id)}>
                                    <div className="flex flex-col gap-3 p-3 sm:px-4 md:flex-row md:items-center">
                                        <div className="flex min-w-0 flex-1 items-start gap-2">
                                            {canReview && <SelectBox checked={selected.has(o.id)} onChange={(on) => toggleSelect(o.id, on)} label={`Select ${personName(o)}`} className="-ml-1" />}
                                            <Avatar name={personName(o)} size={40} className="hidden sm:flex" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <p className="truncate text-[15px] font-bold">{personName(o, 'Unnamed buyer')}</p>
                                                    <Badge tone={status.tone}>{status.label}</Badge>
                                                    <OrderFlags o={o} />
                                                </div>
                                                <ContactLinks phone={o.customerPhone || o.phone} email={o.customerEmail || o.email} className="mt-0.5" />
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    {orderItems(o).map((it, i) => (
                                                        <span key={i} className={cn('rounded-lg px-2 py-0.5 text-[12px] font-bold', accent('orange').chip)}>{it.count}× {it.name}</span>
                                                    ))}
                                                    <span className="text-[13px] font-extrabold tabular-nums">{isPaid(o) ? inr(o.totalAmount) : 'Free'}</span>
                                                    {o.appliedCoupon?.code && <Badge tone="violet">{o.appliedCoupon.code}</Badge>}
                                                    <span className="text-[12px] text-gray-500">{formatDateTime(o.createdAt)}</span>
                                                </div>
                                                {(hasUtr(o) || o.bookingRef) && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {hasUtr(o) && <CopyChip text={o.paymentRef} label="UTR" prefix="UTR" className={o.status === 'pending' ? cn(accent('amber').border, accent('amber').soft) : ''} />}
                                                        {o.bookingRef && <CopyChip text={o.bookingRef} label="Booking ref" />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {canReview && (
                                            <div className="flex shrink-0 items-center gap-2 md:pl-2" onClick={(e) => e.stopPropagation()}>
                                                {rowActions(o)}
                                                {moreMenu(o)}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Panel>
            )}

            <Sheet
                open={Boolean(open)}
                onClose={() => setOpenId(null)}
                size="md"
                header={open && (
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={statusOf(open).tone}>{statusOf(open).label}</Badge>
                            <OrderFlags o={open} />
                        </div>
                        <h2 className="mt-1 truncate text-lg font-extrabold tracking-tight">{personName(open, 'Unnamed buyer')}</h2>
                        <p className="truncate text-[13px] text-gray-500">{orderTicketCount(open)} {orderTicketCount(open) === 1 ? 'ticket' : 'tickets'} · {isPaid(open) ? inr(open.totalAmount) : 'Free'}</p>
                    </div>
                )}
                footer={open && canReview && ['pending', 'approved'].includes(open.status) ? (
                    <div className="flex gap-2">{rowActions(open, true)}</div>
                ) : null}
                bodyClassName="space-y-5"
            >
                {open && (
                    <>
                        <ContactLinks phone={open.customerPhone || open.phone} email={open.customerEmail || open.email} className="text-[13px]" />
                        {open.status === 'pending' && isPaid(open) && (
                            <div className={cn('rounded-2xl border p-4', accent('amber').border, accent('amber').soft)}>
                                <p className="text-[14px] font-bold">Check this payment</p>
                                <p className="mt-1 text-[13px] text-gray-600 dark:text-zinc-300">
                                    Find {canSeeMoney ? <b>{inr(open.totalAmount)}</b> : 'the payment'} with UTR <b className="font-mono">{open.paymentRef || '—'}</b> in your bank or UPI app, then verify.
                                </p>
                            </div>
                        )}
                        {(open.overCapacityNote || open.couponRejectedNote) && open.status !== 'rejected' && (
                            <div className={cn('rounded-2xl border p-4 text-[13px]', accent('red').border, accent('red').soft)}>
                                {open.overCapacityNote && <p><b>Over capacity:</b> {open.overCapacityNote}</p>}
                                {open.couponRejectedNote && <p><b>Coupon {open.requestedCoupon}:</b> {open.couponRejectedNote} They paid full price.</p>}
                            </div>
                        )}
                        <section>
                            <p className="mb-2 text-[12px] font-bold text-gray-500">Tickets</p>
                            <div className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                                {orderItems(open).map((it, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
                                        <span><b>{it.count}×</b> {it.name}</span>
                                        {canSeeMoney && <span className="tabular-nums text-gray-500">{it.price ? inr(it.price * it.count) : 'Free'}</span>}
                                    </div>
                                ))}
                                {canSeeMoney && (
                                    <div className="space-y-1 px-4 py-2.5 text-[13px]">
                                        {Number(open.discount) > 0 && <div className="flex justify-between text-gray-500"><span>Coupon {open.appliedCoupon?.code}</span><span className="tabular-nums">−{inr(open.discount)}</span></div>}
                                        <div className="flex justify-between font-bold"><span>Total</span><span className="tabular-nums">{inr(open.totalAmount)}</span></div>
                                    </div>
                                )}
                            </div>
                        </section>
                        <section className="flex flex-wrap gap-2">
                            {hasUtr(open) && <CopyChip text={open.paymentRef} label="UTR" prefix="UTR" />}
                            {open.bookingRef && <CopyChip text={open.bookingRef} label="Booking ref" prefix="Ref" />}
                        </section>
                        <section>
                            <p className="mb-2 text-[12px] font-bold text-gray-500">History</p>
                            <Timeline o={open} />
                        </section>
                        <div className="flex flex-wrap gap-2">
                            {open.bookingRef && (
                                <Button as="a" href={`/ticket/${encodeURIComponent(open.bookingRef)}`} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-11"><ExternalLink size={14} /> Ticket page</Button>
                            )}
                            {canReview && ['dispatched', 'confirmed'].includes(open.status) && <Button variant="secondary" className="h-11" onClick={() => send(open)} disabled={Boolean(busy[open.id])}><Send size={14} /> {busy[open.id] === 'send' ? 'Sending…' : 'Resend email'}</Button>}
                            {canReview && open.status === 'rejected' && <Button variant="secondary" className="h-11" onClick={() => verify(open)}><Undo2 size={14} /> Verify after all</Button>}
                            {canReview && ['approved', 'dispatched', 'confirmed'].includes(open.status) && <Button variant="ghost" className="h-11 text-red-600 dark:text-red-400" onClick={() => reject(open)}><X size={14} /> Cancel order</Button>}
                        </div>
                    </>
                )}
            </Sheet>
            {confirmSheet}
        </div>
    );
};

export default OrdersPanel;
