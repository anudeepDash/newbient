import React, { useMemo, useState } from 'react';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import Clock from 'lucide-react/dist/esm/icons/clock';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Users from 'lucide-react/dist/esm/icons/users';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import Layers from 'lucide-react/dist/esm/icons/layers';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { Button, StatTile } from '../ui';
import { accent } from '../theme';
import { cn } from '../../../lib/utils';
import { computeAvailability, SOLD_STATUSES, orderTicketCount, isOrderCheckedIn } from '../../../lib/ticketing';
import { Panel, PanelTitle, Meter } from './kit';
import { inr, toDate, dayKey, guestStatus, guestCount } from './format';

const TIER_TONES = ['orange', 'pink', 'violet', 'blue', 'teal', 'amber', 'indigo', 'rose'];

// Tickets sold per day over the last two weeks; tap or hover a bar for its value.
const SalesChart = ({ orders }) => {
    const [hover, setHover] = useState(null);
    const days = useMemo(() => {
        const out = [];
        const today = new Date(); today.setHours(0, 0, 0, 0);
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today); d.setDate(today.getDate() - i);
            out.push({ key: dayKey(d), date: d, count: 0 });
        }
        const index = Object.fromEntries(out.map((d, i) => [d.key, i]));
        orders.forEach(o => {
            if (!SOLD_STATUSES.includes(o.status)) return;
            const d = toDate(o.createdAt);
            if (!d) return;
            const i = index[dayKey(d)];
            if (i !== undefined) out[i].count += orderTicketCount(o);
        });
        return out;
    }, [orders]);
    const max = Math.max(1, ...days.map(d => d.count));
    const total = days.reduce((a, d) => a + d.count, 0);
    const shown = hover !== null ? days[hover] : null;
    const fmt = (d, month = 'short') => d.toLocaleDateString('en-IN', { day: 'numeric', month });

    return (
        <div>
            <p className="mb-3 text-[13px] tabular-nums text-gray-500 dark:text-zinc-400">
                {shown
                    ? <><span className="text-[22px] font-extrabold text-gray-900 dark:text-white">{shown.count}</span> on {fmt(shown.date)}</>
                    : <><span className="text-[22px] font-extrabold text-gray-900 dark:text-white">{total}</span> in the last 14 days</>}
            </p>
            <div className="flex h-36 items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
                {days.map((d, i) => (
                    <button
                        key={d.key}
                        type="button"
                        className="flex h-full flex-1 items-end justify-center"
                        onMouseEnter={() => setHover(i)}
                        onFocus={() => setHover(i)}
                        onBlur={() => setHover(null)}
                        onClick={() => setHover(hover === i ? null : i)}
                        aria-label={`${d.count} tickets on ${fmt(d.date, 'long')}`}
                    >
                        <span
                            className={cn('block w-full max-w-[24px] rounded-t-md transition-opacity',
                                d.count ? accent('orange').dot : 'bg-black/[0.06] dark:bg-white/[0.07]',
                                hover !== null && hover !== i && 'opacity-40')}
                            style={{ height: d.count ? `${Math.max(6, (d.count / max) * 100)}%` : '3px' }}
                        />
                    </button>
                ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-gray-500">
                <span>{fmt(days[0].date)}</span>
                <span>Today</span>
            </div>
        </div>
    );
};

const Legend = ({ items }) => (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map(it => (
            <span key={it.label} className="inline-flex items-center gap-1.5 text-[12px] text-gray-600 dark:text-zinc-300">
                <span className={cn('h-2.5 w-2.5 rounded-full', accent(it.tone).dot)} />
                {it.label} <span className="font-bold tabular-nums">{it.value}</span>
            </span>
        ))}
    </div>
);

const AttentionRow = ({ tone, icon: Icon, title, detail, onClick }) => (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors sm:p-4', accent(tone).soft, accent(tone).border)}>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(tone).chip)}><Icon size={18} /></span>
        <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold">{title}</span>
            <span className="block text-[12px] text-gray-600 dark:text-zinc-400">{detail}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-gray-400" />
    </button>
);

const EventOverview = ({ event, orders, guestEntries, coupons, canSeeMoney, onJump }) => {
    const hasTickets = Boolean(event?.isTicketed);
    const hasGuestlist = Boolean(event?.isGuestlistEnabled || event?.guestlistEnabled);
    const availability = useMemo(() => computeAvailability(event, orders), [event, orders]);
    const tiers = Object.values(availability.tiers);

    const stats = useMemo(() => {
        const sold = orders.filter(o => SOLD_STATUSES.includes(o.status));
        const pending = orders.filter(o => o.status === 'pending');
        const ticketsIn = sold.filter(isOrderCheckedIn).reduce((a, o) => a + orderTicketCount(o), 0);
        const guests = { approved: 0, pending: 0, rejected: 0, waitlist: 0, expired: 0, in: 0, pendingEntries: 0 };
        guestEntries.forEach(e => {
            const s = guestStatus(e);
            guests[s] += guestCount(e);
            if (s === 'pending') guests.pendingEntries += 1;
            if (s === 'approved' && e.attended) guests.in += guestCount(e);
        });
        return {
            soldOrders: sold.length,
            pendingOrders: pending.length,
            heldTickets: availability.total.held - availability.total.sold,
            revenue: sold.reduce((a, o) => a + (Number(o.totalAmount) || 0), 0),
            expected: pending.reduce((a, o) => a + (Number(o.totalAmount) || 0), 0),
            ticketsIn,
            guests,
            peopleExpected: availability.total.sold + guests.approved,
            peopleIn: ticketsIn + guests.in,
            flagged: orders.filter(o => o.status !== 'rejected' && (o.overCapacity || o.couponRejected)),
        };
    }, [orders, guestEntries, availability]);

    const couponUse = useMemo(() => {
        const used = {};
        orders.forEach(o => {
            const code = o.appliedCoupon?.code;
            if (!code || !SOLD_STATUSES.includes(o.status)) return;
            used[code] = used[code] || { code, orders: 0, discount: 0 };
            used[code].orders += 1;
            used[code].discount += Number(o.discount) || 0;
        });
        return Object.values(used).sort((a, b) => b.orders - a.orders);
    }, [orders]);

    const cap = availability.total.capacity;
    const maxSpots = Number(event?.maxSpots) || 0;
    const arrivalPct = stats.peopleExpected ? Math.round((stats.peopleIn / stats.peopleExpected) * 100) : 0;

    return (
        <div className="space-y-5">
            {(stats.pendingOrders > 0 || stats.flagged.length > 0 || stats.guests.pendingEntries > 0) && (
                <div className="grid gap-3 lg:grid-cols-3">
                    {stats.pendingOrders > 0 && (
                        <AttentionRow tone="amber" icon={Clock} onClick={() => onJump('orders', 'pending')}
                            title={`${stats.pendingOrders} ${stats.pendingOrders === 1 ? 'payment' : 'payments'} to verify`}
                            detail={canSeeMoney && stats.expected ? `${inr(stats.expected)} waiting · match each UTR with your bank` : 'Match each UTR with your bank, then verify'} />
                    )}
                    {stats.flagged.length > 0 && (
                        <AttentionRow tone="red" icon={AlertTriangle} onClick={() => onJump('orders', 'flagged')}
                            title={`${stats.flagged.length} ${stats.flagged.length === 1 ? 'order needs' : 'orders need'} a look`}
                            detail="Paid after selling out, or their coupon ran out" />
                    )}
                    {stats.guests.pendingEntries > 0 && (
                        <AttentionRow tone="fuchsia" icon={Users} onClick={() => onJump('guestlist', 'pending')}
                            title={`${stats.guests.pendingEntries} guestlist ${stats.guests.pendingEntries === 1 ? 'request' : 'requests'}`}
                            detail={`${stats.guests.pending} ${stats.guests.pending === 1 ? 'person' : 'people'} waiting for approval`} />
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {hasTickets && (
                    <StatTile icon={Ticket} tone="orange" label="Tickets sold" value={cap ? `${availability.total.sold} / ${cap}` : availability.total.sold}
                        hint={availability.total.remaining !== null ? (availability.total.remaining === 0 ? 'Sold out' : `${availability.total.remaining} left`) : `${stats.soldOrders} orders`}
                        onClick={() => onJump('orders', 'sold')} />
                )}
                {hasTickets && canSeeMoney && (
                    <StatTile icon={IndianRupee} tone="blue" label="Revenue" value={inr(stats.revenue)}
                        hint={stats.expected ? `${inr(stats.expected)} awaiting check` : 'From verified orders'} />
                )}
                {hasTickets && !canSeeMoney && (
                    <StatTile icon={Clock} tone="amber" label="To verify" value={stats.pendingOrders}
                        hint={stats.heldTickets ? `${stats.heldTickets} seats held` : 'Nothing to verify'} onClick={() => onJump('orders', 'pending')} />
                )}
                {hasGuestlist && (
                    <StatTile icon={Users} tone="fuchsia" label={event.guestlistMode === 'rsvp' ? 'RSVPs approved' : 'Guestlist approved'}
                        value={maxSpots ? `${stats.guests.approved} / ${maxSpots}` : stats.guests.approved}
                        hint={stats.guests.pendingEntries ? `${stats.guests.pendingEntries} to review` : `${guestEntries.length} sign-ups`}
                        onClick={() => onJump('guestlist')} />
                )}
                <StatTile icon={UserCheck} tone="green" label="Checked in" value={`${stats.peopleIn} / ${stats.peopleExpected}`}
                    hint={stats.peopleExpected ? `${arrivalPct}% arrived` : 'Nobody admitted yet'} onClick={() => onJump('checkin')} />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
                {hasTickets && (
                    <Panel className="p-4 sm:p-5 xl:col-span-3">
                        <PanelTitle icon={Layers} tone="orange" title="Ticket types" hint="Sold, held while payment is checked, and left" />
                        <div className="space-y-4">
                            {tiers.map((tier, i) => (
                                <div key={tier.id}>
                                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', accent(TIER_TONES[i % TIER_TONES.length]).dot)} style={tier.color ? { background: tier.color } : undefined} />
                                            <span className="truncate text-[14px] font-bold">{tier.name}</span>
                                            <span className="shrink-0 text-[12px] text-gray-500">{tier.price ? inr(tier.price) : 'Free'}</span>
                                        </div>
                                        <div className="shrink-0 text-right text-[12px] tabular-nums text-gray-500">
                                            <span className="font-bold text-gray-900 dark:text-white">{tier.sold}</span>
                                            {tier.capacity !== null ? ` / ${tier.capacity}` : ' sold'}
                                            {tier.held > tier.sold && <span className={accent('amber').text}> · {tier.held - tier.sold} held</span>}
                                        </div>
                                    </div>
                                    <Meter max={tier.capacity || Math.max(tier.held, 1)} label={`${tier.name}: ${tier.sold} sold`} segments={[
                                        { value: tier.sold, tone: TIER_TONES[i % TIER_TONES.length] },
                                        { value: tier.held - tier.sold, tone: 'amber' },
                                    ]} />
                                    <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                                        <span>{tier.remaining === null ? 'No limit set' : tier.remaining === 0 ? 'Sold out' : `${tier.remaining} left`}</span>
                                        {canSeeMoney && <span className="tabular-nums">{inr(tier.revenue)}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {cap !== null && tiers.length > 1 && (
                            <div className="mt-5 border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
                                <div className="mb-1.5 flex justify-between text-[12px]">
                                    <span className="font-bold">Whole event</span>
                                    <span className="tabular-nums text-gray-500">{availability.total.held} / {cap} seats taken</span>
                                </div>
                                <Meter max={cap} label="Whole event" segments={[
                                    { value: availability.total.sold, tone: 'orange' },
                                    { value: availability.total.held - availability.total.sold, tone: 'amber' },
                                ]} />
                            </div>
                        )}
                        {tiers.every(t => t.capacity === null) && cap === null && (
                            <p className="mt-4 rounded-xl bg-black/[0.03] px-3 py-2 text-[12px] text-gray-600 dark:bg-white/[0.04] dark:text-zinc-400">
                                No capacity is set, so tickets never sell out. Add limits when you edit the event in Events.
                            </p>
                        )}
                    </Panel>
                )}

                {hasTickets && (
                    <Panel className="p-4 sm:p-5 xl:col-span-2">
                        <PanelTitle icon={BarChart3} tone="blue" title="Sales" hint="Verified tickets per day" />
                        <SalesChart orders={orders} />
                    </Panel>
                )}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel className="p-4 sm:p-5">
                    <PanelTitle icon={UserCheck} tone="green" title="Arrivals" hint={`${stats.peopleIn} of ${stats.peopleExpected} people are in`}
                        action={<Button size="sm" variant="ghost" onClick={() => onJump('checkin')}>Check-in</Button>} />
                    <Meter max={stats.peopleExpected || 1} label="Arrivals" segments={[
                        { value: stats.ticketsIn, tone: 'orange' },
                        { value: stats.guests.in, tone: 'fuchsia' },
                    ]} className="h-3" />
                    <Legend items={[
                        ...(hasTickets ? [{ label: 'Tickets in', value: `${stats.ticketsIn} / ${availability.total.sold}`, tone: 'orange' }] : []),
                        ...(hasGuestlist ? [{ label: 'Guests in', value: `${stats.guests.in} / ${stats.guests.approved}`, tone: 'fuchsia' }] : []),
                    ]} />
                </Panel>

                {hasGuestlist && (
                    <Panel className="p-4 sm:p-5">
                        <PanelTitle icon={Users} tone="fuchsia" title={event.guestlistMode === 'rsvp' ? 'RSVPs' : 'Guestlist'}
                            hint={maxSpots ? `${Math.max(0, maxSpots - stats.guests.approved - stats.guests.pending)} of ${maxSpots} spots free · up to ${event.perUserLimit || 5} per person` : `Up to ${event.perUserLimit || 5} per person · no total limit`}
                            action={<Button size="sm" variant="ghost" onClick={() => onJump('guestlist')}>Open</Button>} />
                        <Meter max={maxSpots || (stats.guests.approved + stats.guests.pending + stats.guests.rejected) || 1} label="Guestlist people" segments={[
                            { value: stats.guests.approved, tone: 'green' },
                            { value: stats.guests.pending, tone: 'amber' },
                        ]} className="h-3" />
                        <Legend items={[
                            { label: 'Approved', value: stats.guests.approved, tone: 'green' },
                            { label: 'Waiting', value: stats.guests.pending, tone: 'amber' },
                            { label: 'Declined', value: stats.guests.rejected, tone: 'red' },
                        ]} />
                    </Panel>
                )}

                {hasTickets && (
                    <Panel className="p-4 sm:p-5">
                        <PanelTitle icon={Tag} tone="violet" title="Coupons used"
                            action={<Button size="sm" variant="ghost" onClick={() => onJump('coupons')}>Manage</Button>} />
                        {couponUse.length === 0 ? (
                            <p className="text-[13px] text-gray-500">{coupons.length ? 'No verified order has used a coupon yet.' : 'No coupons for this event yet.'}</p>
                        ) : (
                            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                {couponUse.map(c => (
                                    <li key={c.code} className="flex items-center justify-between gap-3 py-2.5">
                                        <span className={cn('rounded-lg px-2 py-0.5 font-mono text-[13px] font-bold', accent('violet').chip)}>{c.code}</span>
                                        <span className="text-[12px] tabular-nums text-gray-500">
                                            {c.orders} {c.orders === 1 ? 'order' : 'orders'}{canSeeMoney && c.discount ? ` · ${inr(c.discount)} off` : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                )}
            </div>
        </div>
    );
};

export default EventOverview;
