import React, { useMemo, useState } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Users from 'lucide-react/dist/esm/icons/users';
import FileUp from 'lucide-react/dist/esm/icons/file-up';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import GuestlistTaskReviewModal from '../GuestlistTaskReviewModal';
import { Button, Badge, SearchInput, SegmentedTabs, EmptyState, Menu, MenuItem, Avatar } from '../ui';
import { accent } from '../theme';
import { Panel, Meter, ContactLinks, CopyChip, SelectBox, useConfirm, useBusy } from './kit';
import { formatDateTime, guestStatus, GUEST_STATUS, guestCount, personName } from './format';

/*
 * Guestlist requests for one event: approve or decline (one by one or in
 * bulk), review task submissions, watch capacity. Check-in happens on the
 * Check-in tab; this list shows who is in.
 */

const hasTask = (e) => Boolean(e.hasTask || e.taskSubmission);

const FILTERS = [
    { value: 'pending', label: 'To review' },
    { value: 'approved', label: 'Approved' },
    { value: 'in', label: 'Checked in' },
    { value: 'tasks', label: 'With tasks' },
    { value: 'rejected', label: 'Declined' },
    { value: 'all', label: 'All' },
];

const matches = (e, filter) => {
    const s = guestStatus(e);
    if (filter === 'pending') return s === 'pending';
    if (filter === 'approved') return s === 'approved';
    if (filter === 'in') return s === 'approved' && Boolean(e.attended);
    if (filter === 'tasks') return hasTask(e);
    if (filter === 'rejected') return s === 'rejected';
    return true;
};

const GuestlistPanel = ({ event, entries, loading, error, initialFilter }) => {
    const addToast = useStore(s => s.addToast);
    const updateGuestlistEntryStatus = useStore(s => s.updateGuestlistEntryStatus);
    const deleteGuestlistEntry = useStore(s => s.deleteGuestlistEntry);
    const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.value, entries.filter(e => matches(e, f.value)).length])), [entries]);
    const [filter, setFilter] = useState(() => initialFilter || (counts.pending ? 'pending' : 'all'));
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(() => new Set());
    const [reviewingId, setReviewingId] = useState(null);
    const [bulk, setBulk] = useState(null);
    const [busy, run] = useBusy();
    const [ask, confirmSheet] = useConfirm();

    const label = event?.guestlistMode === 'rsvp' ? 'RSVP' : 'guestlist';
    const maxSpots = Number(event?.maxSpots) || 0;
    const people = useMemo(() => {
        const p = { approved: 0, pending: 0, rejected: 0, in: 0 };
        entries.forEach(e => {
            const s = guestStatus(e);
            p[s] += guestCount(e);
            if (s === 'approved' && e.attended) p.in += guestCount(e);
        });
        return p;
    }, [entries]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        const digits = q.replace(/\D/g, '');
        return entries.filter(e => {
            if (q) {
                const hit = [e.customerName, e.name, e.customerEmail, e.email, e.bookingRef, ...(e.plusOneNames || [])].some(v => String(v || '').toLowerCase().includes(q))
                    || (digits.length >= 3 && String(e.customerPhone || e.phone || '').replace(/\D/g, '').includes(digits));
                if (!hit) return false;
            }
            return matches(e, filter);
        }).sort((a, b) => {
            // Oldest requests first while reviewing, so nobody waits longest.
            if (filter === 'pending') return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
            return 0;
        });
    }, [entries, filter, search]);

    const reviewing = entries.find(e => e.id === reviewingId) || null;
    const selectedEntries = entries.filter(e => selected.has(e.id));
    const toggleSelect = (id, on) => setSelected(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });
    const allVisibleSelected = visible.length > 0 && visible.every(e => selected.has(e.id));

    const glOf = (entry) => entry._glId || event?.guestlistId || event?.id;

    // Approving more people than the list holds needs a second look.
    const overBy = (extra) => (maxSpots ? Math.max(0, people.approved + extra - maxSpots) : 0);

    const setStatus = async (entry, status) => {
        await updateGuestlistEntryStatus(glOf(entry), entry.id, status);
    };

    const approve = (entry) => {
        const go = () => run(entry.id, 'approve', async () => {
            await setStatus(entry, 'approved');
            addToast("They'll get a confirmation email.", 'success', {
                title: guestCount(entry) > 1 ? `${personName(entry)} approved for ${guestCount(entry)} people` : `${personName(entry)} approved`,
            });
        });
        const over = guestStatus(entry) === 'approved' ? 0 : overBy(guestCount(entry));
        if (over) {
            ask({
                title: 'Go over capacity?',
                body: `Approving ${personName(entry)} puts the list ${over} over its ${maxSpots} spots.`,
                confirmLabel: 'Approve anyway',
                action: async () => { await setStatus(entry, 'approved'); addToast(`${personName(entry)} approved.`, 'success'); },
            });
        } else go();
    };

    const decline = (entry) => ask({
        title: `Decline ${personName(entry)}?`,
        body: `Their ${guestCount(entry) === 1 ? 'spot goes' : `${guestCount(entry)} spots go`} back to the list. They won't be able to get in with their pass.`,
        confirmLabel: 'Decline',
        danger: true,
        action: async () => { await setStatus(entry, 'rejected'); addToast('Request declined.', 'info'); },
    });

    const remove = (entry) => ask({
        title: `Remove ${personName(entry)}?`,
        body: "This deletes their sign-up for good. Declining is usually better, since it keeps a record.",
        confirmLabel: 'Remove',
        danger: true,
        action: async () => {
            await deleteGuestlistEntry(glOf(entry), entry.id);
            setSelected(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
            addToast('Sign-up removed.', 'success');
        },
    });

    const runBulk = async (verb, list, status) => {
        let failed = 0;
        setBulk({ verb, done: 0, total: list.length });
        for (let i = 0; i < list.length; i++) {
            try { await setStatus(list[i], status); } catch (err) { console.error(err); failed += 1; }
            setBulk({ verb, done: i + 1, total: list.length });
        }
        setBulk(null);
        setSelected(new Set());
        return failed;
    };

    const bulkApprove = () => {
        const list = selectedEntries.filter(e => guestStatus(e) !== 'approved');
        const extra = list.reduce((a, e) => a + guestCount(e), 0);
        const over = overBy(extra);
        ask({
            title: `Approve ${list.length} ${list.length === 1 ? 'request' : 'requests'}?`,
            body: `${extra} ${extra === 1 ? 'person' : 'people'} get a confirmation email.${over ? ` This puts the list ${over} over its ${maxSpots} spots.` : ''}`,
            confirmLabel: over ? 'Approve anyway' : 'Approve all',
            action: async () => {
                const failed = await runBulk('Approving', list, 'approved');
                addToast(
                    failed ? `${failed} couldn't be approved. Try those again.` : `${list.length} ${list.length === 1 ? 'request' : 'requests'} approved.`,
                    failed ? 'warning' : 'success',
                    failed ? { title: `Approved ${list.length - failed} of ${list.length}` } : undefined,
                );
            },
        });
    };

    const bulkDecline = () => {
        const list = selectedEntries.filter(e => guestStatus(e) !== 'rejected');
        ask({
            title: `Decline ${list.length} ${list.length === 1 ? 'request' : 'requests'}?`,
            body: 'Their spots go back to the list.',
            confirmLabel: 'Decline all',
            danger: true,
            action: async () => {
                const failed = await runBulk('Declining', list, 'rejected');
                addToast(
                    failed ? `${failed} couldn't be declined. Try those again.` : `${list.length} ${list.length === 1 ? 'request' : 'requests'} declined.`,
                    failed ? 'warning' : 'info',
                    failed ? { title: `Declined ${list.length - failed} of ${list.length}` } : undefined,
                );
            },
        });
    };

    const selApprovable = selectedEntries.filter(e => guestStatus(e) !== 'approved').length;
    const selDeclinable = selectedEntries.filter(e => guestStatus(e) !== 'rejected').length;
    const free = maxSpots ? Math.max(0, maxSpots - people.approved - people.pending) : null;

    return (
        <div className="space-y-4">
            <Panel className="p-4 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-[12px] font-bold text-gray-500">People approved</p>
                        <p className="text-[28px] font-extrabold leading-tight tabular-nums">
                            {people.approved}{maxSpots ? <span className="text-gray-400"> / {maxSpots}</span> : null}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <Badge tone="fuchsia">Up to {event?.perUserLimit || 5} per person</Badge>
                        {free !== null && <Badge tone={free === 0 ? 'red' : 'green'}>{free === 0 ? 'Full' : `${free} spots free`}</Badge>}
                        <Badge tone="teal"><UserCheck size={10} /> {people.in} in</Badge>
                        {event?.guestlistMode === 'rsvp' && <Badge tone="gray">RSVP, no QR</Badge>}
                    </div>
                </div>
                <Meter className="mt-3 h-3" max={maxSpots || (people.approved + people.pending) || 1} label="Guestlist capacity" segments={[
                    { value: people.in, tone: 'teal' },
                    { value: people.approved - people.in, tone: 'green' },
                    { value: people.pending, tone: 'amber' },
                ]} />
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-500">
                    <span className="inline-flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-full', accent('teal').dot)} />Checked in</span>
                    <span className="inline-flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-full', accent('green').dot)} />Approved</span>
                    <span className="inline-flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-full', accent('amber').dot)} />Waiting ({people.pending})</span>
                    {people.rejected > 0 && <span>{people.rejected} declined</span>}
                </div>
            </Panel>

            <SearchInput value={search} onChange={setSearch} placeholder="Name, phone, email or booking ref" className="lg:w-96" />
            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <SegmentedTabs value={filter} onChange={(v) => { setFilter(v); setSelected(new Set()); }} items={FILTERS
                    .filter(f => ['all', 'pending', 'approved', filter].includes(f.value) || counts[f.value] > 0)
                    .map(f => ({ ...f, count: counts[f.value], highlight: f.value === 'pending' && counts.pending > 0 }))} />
            </div>

            {(selected.size > 0 || bulk) && (
                <div className={cn('sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 flex flex-wrap items-center gap-2 rounded-2xl border bg-white/95 p-2.5 backdrop-blur dark:bg-[#0d0f15]/95 lg:top-2', accent('fuchsia').border)}>
                    {bulk ? (
                        <p className="px-2 text-[13px] font-semibold">{bulk.verb} {bulk.done} of {bulk.total}…</p>
                    ) : (
                        <>
                            <p className="px-2 text-[13px] font-bold">{selected.size} selected</p>
                            {selApprovable > 0 && <Button variant="success" size="sm" className="h-10" onClick={bulkApprove}><Check size={14} /> Approve {selApprovable}</Button>}
                            {selDeclinable > 0 && <Button variant="secondary" size="sm" className="h-10 text-red-600 dark:text-red-400" onClick={bulkDecline}><X size={14} /> Decline {selDeclinable}</Button>}
                            <Button variant="ghost" size="sm" className="ml-auto h-10" onClick={() => setSelected(new Set())}>Clear</Button>
                        </>
                    )}
                </div>
            )}

            {error && (
                <div className={cn('flex items-start gap-3 rounded-2xl border p-4 text-[13px]', accent('red').border, accent('red').soft)}>
                    <AlertTriangle size={16} className={cn('mt-0.5 shrink-0', accent('red').text)} />
                    <p>Some sign-ups couldn't be loaded. Check your connection and reload the page.</p>
                </div>
            )}

            {loading && !entries.length ? (
                <Panel className="p-10 text-center text-[13px] text-gray-500">Loading the {label}…</Panel>
            ) : error && !entries.length ? null : visible.length === 0 ? (
                <Panel>
                    <EmptyState icon={Users} tone="fuchsia"
                        title={entries.length ? (filter === 'pending' && !search ? 'Nothing to review' : 'Nobody matches') : `No ${label} sign-ups yet`}
                        description={entries.length ? (filter === 'pending' && !search ? 'Every request has been answered.' : 'Try another filter or search.') : 'Sign-ups appear here the moment someone joins.'} />
                </Panel>
            ) : (
                <Panel className="overflow-hidden">
                    <div className="flex items-center gap-1 border-b border-black/[0.05] px-2 py-1 dark:border-white/[0.05] sm:px-3">
                        <SelectBox checked={allVisibleSelected} onChange={(on) => setSelected(on ? new Set(visible.map(e => e.id)) : new Set())} label="Select all shown" />
                        <span className="text-[12px] font-semibold text-gray-500">
                            {visible.length} {visible.length === 1 ? 'sign-up' : 'sign-ups'} · {visible.reduce((a, e) => a + guestCount(e), 0)} people
                        </span>
                    </div>
                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                        {visible.map(entry => {
                            const name = personName(entry);
                            const s = guestStatus(entry);
                            const st = GUEST_STATUS[s];
                            const working = busy[entry.id];
                            const n = guestCount(entry);
                            const task = entry.taskSubmission;
                            return (
                                <li key={`${entry._glId}-${entry.id}`} className={cn('flex flex-col gap-3 p-3 sm:px-4 md:flex-row md:items-center', selected.has(entry.id) && accent('fuchsia').soft)}>
                                    <div className="flex min-w-0 flex-1 items-start gap-2">
                                        <SelectBox checked={selected.has(entry.id)} onChange={(on) => toggleSelect(entry.id, on)} label={`Select ${name}`} className="-ml-1" />
                                        <Avatar name={name} size={40} className="hidden sm:flex" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <p className="truncate text-[15px] font-bold">{name}</p>
                                                <Badge tone={st.tone}>{st.label}</Badge>
                                                <Badge tone="fuchsia"><Users size={10} /> {n}</Badge>
                                                {s === 'approved' && entry.attended && <Badge tone="teal"><UserCheck size={10} /> In</Badge>}
                                            </div>
                                            <ContactLinks phone={entry.customerPhone || entry.phone} email={entry.customerEmail || entry.email} className="mt-0.5" />
                                            {Array.isArray(entry.plusOneNames) && entry.plusOneNames.filter(Boolean).length > 0 && (
                                                <p className="mt-1 truncate text-[12px] text-gray-500">With {entry.plusOneNames.filter(Boolean).join(', ')}</p>
                                            )}
                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                {entry.bookingRef && <CopyChip text={entry.bookingRef} label="Booking ref" />}
                                                {hasTask(entry) && (
                                                    <button type="button" onClick={() => setReviewingId(entry.id)} className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold', accent('blue').chip)}>
                                                        <FileUp size={12} /> Task
                                                        {task?.fileUrl ? ' · file' : ''}{task?.link ? ' · link' : ''}{task?.text ? ' · note' : ''}
                                                        {!task && ' · nothing sent'}
                                                    </button>
                                                )}
                                                <span className="text-[12px] text-gray-500">{formatDateTime(entry.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2 md:pl-2">
                                        {hasTask(entry) && s === 'pending' && (
                                            <Button variant="secondary" className="h-11" onClick={() => setReviewingId(entry.id)}><Eye size={15} /> Review</Button>
                                        )}
                                        {s !== 'approved' && (
                                            <Button variant="success" className="h-11 flex-1 md:flex-none" onClick={() => approve(entry)} disabled={Boolean(working)}>
                                                <Check size={15} /> {working ? 'Approving…' : s === 'rejected' ? 'Approve instead' : 'Approve'}
                                            </Button>
                                        )}
                                        {s === 'pending' && (
                                            <Button variant="secondary" className="h-11 w-11 px-0 text-red-600 dark:text-red-400" onClick={() => decline(entry)} disabled={Boolean(working)} aria-label={`Decline ${name}`}>
                                                <X size={16} />
                                            </Button>
                                        )}
                                        <Menu trigger={({ toggle }) => (
                                            <Button variant="ghost" onClick={toggle} aria-label="More actions" className="h-11 w-11 px-0"><MoreHorizontal size={17} /></Button>
                                        )}>
                                            {hasTask(entry) && <MenuItem icon={Eye} onClick={() => setReviewingId(entry.id)}>Review task</MenuItem>}
                                            {entry.bookingRef && event?.guestlistMode !== 'rsvp' && (
                                                <MenuItem as="a" href={`/ticket/${encodeURIComponent(entry.bookingRef)}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open pass</MenuItem>
                                            )}
                                            {s === 'approved' && <MenuItem icon={Undo2} onClick={() => decline(entry)} hint="They can't get in afterwards">Decline after all</MenuItem>}
                                            <MenuItem icon={Trash2} danger onClick={() => remove(entry)} hint="Deletes the sign-up">Remove</MenuItem>
                                        </Menu>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Panel>
            )}

            <GuestlistTaskReviewModal
                isOpen={Boolean(reviewing)}
                onClose={() => setReviewingId(null)}
                entry={reviewing}
                event={event}
                onStatusChange={async (entryId, newStatus) => {
                    const entry = entries.find(e => e.id === entryId);
                    if (!entry) throw new Error('This sign-up no longer exists.');
                    await setStatus(entry, newStatus);
                }}
            />
            {confirmSheet}
        </div>
    );
};

export default GuestlistPanel;
