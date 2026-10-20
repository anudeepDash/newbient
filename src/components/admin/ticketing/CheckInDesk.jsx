import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Users from 'lucide-react/dist/esm/icons/users';
import Search from 'lucide-react/dist/esm/icons/search';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import { SOLD_STATUSES, orderItems, orderTicketCount, isOrderCheckedIn, isGuestAdmissible } from '../../../lib/ticketing';
import { Button, Badge, SearchInput, SegmentedTabs, EmptyState } from '../ui';
import { accent } from '../theme';
import { Panel, Meter, useConfirm, useBusy } from './kit';
import { formatDateTime } from './format';

/*
 * Door check-in for one event: ticket buyers and guestlist entries in one
 * list, for when a QR won't scan or someone gives their name. Writes the same
 * fields as the camera scanner, so both always agree.
 */
const CheckInDesk = ({ eventId, orders, guestEntries }) => {
    const addToast = useStore(s => s.addToast);
    const setTicketCheckIn = useStore(s => s.setTicketCheckIn);
    const setGuestCheckIn = useStore(s => s.setGuestCheckIn);
    const [search, setSearch] = useState('');
    const [view, setView] = useState('waiting');
    const [busy, run] = useBusy();
    const [ask, confirmSheet] = useConfirm();

    const people = useMemo(() => {
        const rows = [];
        orders.forEach(o => {
            const admissible = SOLD_STATUSES.includes(o.status);
            if (!admissible && o.status !== 'pending') return;
            rows.push({
                key: `t-${o.id}`, id: o.id, kind: 'ticket', admissible,
                name: o.customerName || o.name || 'Ticket holder',
                phone: o.customerPhone || o.phone || '',
                email: o.customerEmail || o.email || '',
                ref: o.bookingRef || '',
                count: orderTicketCount(o),
                detail: orderItems(o).map(it => `${it.count}× ${it.name}`).join(', ') || 'Ticket',
                checkedIn: admissible && isOrderCheckedIn(o),
                at: o.scannedAt || o.attendedAt,
            });
        });
        guestEntries.forEach(e => {
            const admissible = isGuestAdmissible(e);
            if (!admissible && e.status === 'rejected') return;
            const n = Number(e.guestsCount) || 1;
            rows.push({
                key: `g-${e._glId}-${e.id}`, id: e.id, glId: e._glId, kind: 'guest', admissible,
                name: e.customerName || e.name || 'Guest',
                phone: e.customerPhone || e.phone || '',
                email: e.customerEmail || e.email || '',
                ref: e.bookingRef || '',
                count: n,
                detail: `Guestlist · ${n} ${n > 1 ? 'people' : 'person'}${Array.isArray(e.plusOneNames) && e.plusOneNames.filter(Boolean).length ? ` · with ${e.plusOneNames.filter(Boolean).join(', ')}` : ''}`,
                checkedIn: admissible && Boolean(e.attended),
                at: e.attendedAt,
            });
        });
        return rows.sort((a, b) => a.name.localeCompare(b.name));
    }, [orders, guestEntries]);

    const admitted = people.filter(p => p.admissible);
    const expected = admitted.reduce((a, p) => a + p.count, 0);
    const arrived = admitted.filter(p => p.checkedIn).reduce((a, p) => a + p.count, 0);
    const ticketsIn = admitted.filter(p => p.checkedIn && p.kind === 'ticket').reduce((a, p) => a + p.count, 0);
    const guestsIn = arrived - ticketsIn;

    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const visible = people.filter(p => {
        if (q) {
            // Searching shows everyone, including unpaid, so staff can explain why.
            return [p.name, p.email, p.ref].some(v => v.toLowerCase().includes(q))
                || (digits.length >= 3 && p.phone.replace(/\D/g, '').includes(digits));
        }
        if (!p.admissible) return false;
        if (view === 'waiting') return !p.checkedIn;
        if (view === 'in') return p.checkedIn;
        return true;
    });

    const write = (p, on) => (p.kind === 'ticket' ? setTicketCheckIn(p.id, on) : setGuestCheckIn(p.glId, p.id, on));

    const toggle = (p) => {
        if (!p.admissible) return;
        if (p.checkedIn) {
            ask({
                title: `Undo check-in for ${p.name}?`,
                body: 'Use this if they were checked in by mistake. Their pass will scan as valid again.',
                confirmLabel: 'Undo check-in',
                danger: true,
                action: async () => { await write(p, false); addToast('Check-in undone.', 'info'); },
            });
            return;
        }
        run(p.key, 'in', async () => {
            await write(p, true);
            addToast(p.count > 1 ? `All ${p.count} people on this pass are in.` : `${p.name} checked in.`, 'success', p.count > 1 ? { title: `${p.name} checked in` } : undefined);
        }, { errorTitle: "Couldn't check them in", errorMessage: 'Check your connection and try again.' });
    };

    const pct = expected ? Math.round((arrived / expected) * 100) : 0;

    return (
        <div className="space-y-4">
            <Panel className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[12px] font-bold text-gray-500">People in</p>
                        <p className="text-[32px] font-extrabold leading-none tracking-tight tabular-nums">{arrived}<span className="text-gray-400"> / {expected}</span></p>
                        <p className="mt-1 text-[12px] text-gray-500">{pct}% arrived · {expected - arrived} still to come</p>
                    </div>
                    <Button as={Link} to={`/admin/scanner?eventId=${encodeURIComponent(eventId)}`} variant="accent" className="h-12 px-5">
                        <ScanLine size={17} /> Scan QR
                    </Button>
                </div>
                <Meter className="mt-4 h-3" max={expected || 1} label="Arrivals" segments={[
                    { value: ticketsIn, tone: 'orange' },
                    { value: guestsIn, tone: 'fuchsia' },
                ]} />
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-500">
                    <span className="inline-flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-full', accent('orange').dot)} />Tickets {ticketsIn}</span>
                    <span className="inline-flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-full', accent('fuchsia').dot)} />Guests {guestsIn}</span>
                </div>
            </Panel>

            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 space-y-3 bg-[#f6f7f9]/95 px-4 py-2 backdrop-blur dark:bg-[#07080b]/95 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
                <SearchInput value={search} onChange={setSearch} placeholder="Name, phone, email or booking ref" />
                {!q && (
                    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                        <SegmentedTabs value={view} onChange={setView} items={[
                            { value: 'waiting', label: 'Not arrived', count: admitted.filter(p => !p.checkedIn).length },
                            { value: 'in', label: 'Checked in', count: admitted.filter(p => p.checkedIn).length },
                            { value: 'all', label: 'Everyone', count: admitted.length },
                        ]} />
                    </div>
                )}
            </div>

            {visible.length === 0 ? (
                <Panel>
                    <EmptyState
                        icon={q ? Search : UserCheck}
                        tone="green"
                        title={q ? 'Nobody matches' : view === 'waiting' ? (admitted.length ? 'Everyone is in' : 'Nobody to check in yet') : 'Nobody yet'}
                        description={q ? 'Check the spelling, or try their phone number or booking ref.' : view === 'waiting' ? (admitted.length ? 'All admitted guests have checked in.' : 'Verified ticket buyers and approved guests show up here.') : 'Checked-in guests show up here.'}
                    />
                </Panel>
            ) : (
                <Panel className="overflow-hidden">
                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                        {visible.slice(0, 300).map(p => (
                            <li key={p.key} className={cn('flex items-center gap-3 px-3 py-3 sm:px-4', p.checkedIn && accent('green').soft)}>
                                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                                    p.checkedIn ? accent('green').chip : p.kind === 'ticket' ? accent('orange').chip : accent('fuchsia').chip)}>
                                    {p.checkedIn ? <UserCheck size={18} /> : p.kind === 'ticket' ? <Ticket size={18} /> : <Users size={18} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-bold">{p.name}</p>
                                    <p className="truncate text-[12px] text-gray-500">{p.detail}{p.ref ? ` · ${p.ref}` : ''}</p>
                                    {p.checkedIn && p.at && <p className={cn('text-[12px] font-semibold', accent('green').text)}>In at {formatDateTime(p.at)}</p>}
                                    {!p.admissible && <Badge tone="amber" className="mt-1">{p.kind === 'ticket' ? "Payment not verified" : 'Not approved yet'}</Badge>}
                                </div>
                                {p.admissible && (
                                    <Button
                                        variant={p.checkedIn ? 'ghost' : 'success'}
                                        onClick={() => toggle(p)}
                                        disabled={Boolean(busy[p.key])}
                                        className="h-12 min-w-[112px]"
                                    >
                                        {p.checkedIn ? <><Undo2 size={15} /> Undo</> : <><UserCheck size={16} /> {busy[p.key] ? 'Saving…' : p.count > 1 ? `Admit ${p.count}` : 'Check in'}</>}
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                    {visible.length > 300 && <p className="px-5 py-3 text-[12px] text-gray-500">Showing 300 of {visible.length}. Search to find someone.</p>}
                </Panel>
            )}
            {confirmSheet}
        </div>
    );
};

export default CheckInDesk;
