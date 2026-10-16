import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Users from 'lucide-react/dist/esm/icons/users';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import HandHeart from 'lucide-react/dist/esm/icons/hand-heart';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Music from 'lucide-react/dist/esm/icons/music';

import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import ExportMenu from '../../components/admin/ExportMenu';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import {
    Card, Button, Badge, Avatar, SearchInput, Select, SegmentedTabs, StatTile, EmptyState, Menu, MenuItem, ViewToggle, useViewMode,
} from '../../components/admin/ui';
import { inr } from '../../components/admin/ticketing/format';
import {
    FINANCE_TABS, PAYEE_TYPES, payeeType, findDuplicatePayees, spendsForPayee, isSpendPaid, isSpendPending, amountOf, formatDay, dayOf,
} from '../../components/admin/finance/money';
import { PayeeEditorSheet, PayeeDetailSheet, RegistrationLinkSheet, ConfirmDialog, copyText, payeeAccount } from '../../components/admin/finance/PayeeSheets';

const PAGE = 30;
const TYPE_ICON = { Volunteer: HandHeart, Vendor: Building2, Salary: Briefcase, Artist: Music };
const MODES = [
    { value: 'all', label: 'Any method' },
    { value: 'UPI', label: 'UPI' },
    { value: 'Bank Transfer', label: 'Bank transfer' },
    { value: 'Other', label: 'Other' },
    { value: 'missing', label: 'No payment details' },
];
const SORTS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'name', label: 'Name A–Z' },
    { value: 'paid', label: 'Most paid' },
    { value: 'pending', label: 'Most to pay' },
];

const PayeeRegistry = () => {
    useStoreSubscription(['financePayees', 'upcomingEvents', 'spends']);
    const financePayees = useStore(s => s.financePayees) || [];
    const upcomingEvents = useStore(s => s.upcomingEvents) || [];
    const spends = useStore(s => s.spends) || [];
    const user = useStore(s => s.user);
    const deleteFinancePayee = useStore(s => s.deleteFinancePayee);
    const canDelete = user?.role !== 'editor' && user?.role !== 'content_admin';

    // Filters live in the URL so a view can be shared or reloaded.
    const [params, setParams] = useSearchParams();
    const setParam = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        setParams(next, { replace: key !== 'id' });
        if (key !== 'id') setLimit(PAGE);
    };
    const q = params.get('q') || '';
    const typeFilter = PAYEE_TYPES[params.get('type')] || params.get('type') === 'duplicates' ? params.get('type') : 'all';
    const mode = MODES.some(m => m.value === params.get('mode')) ? params.get('mode') : 'all';
    const sort = SORTS.some(s => s.value === params.get('sort')) ? params.get('sort') : 'newest';
    const openId = params.get('id');

    const [view, setView] = useViewMode('payees', 'cards');
    const [limit, setLimit] = useState(PAGE);
    const [editing, setEditing] = useState(null); // null | {} (new) | payee
    const [linkOpen, setLinkOpen] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const dupes = useMemo(() => findDuplicatePayees(financePayees), [financePayees]);

    // Money per payee, matched by name the same way the detail sheet does.
    const enriched = useMemo(() => financePayees.map(p => {
        const list = spendsForPayee(p, spends);
        return {
            p,
            paid: list.filter(isSpendPaid).reduce((a, s) => a + amountOf(s.amount), 0),
            pending: list.filter(isSpendPending).reduce((a, s) => a + amountOf(s.amount), 0),
            count: list.length,
            dup: dupes.has(p.id),
        };
    }), [financePayees, spends, dupes]);

    const beforeType = useMemo(() => {
        const term = q.trim().toLowerCase();
        return enriched.filter(({ p }) => {
            if (term) {
                const hay = [p.name, p.email, p.phone, p.destinationDetails, p.upiId, p.linkedGig, p.notes, p.bankDetails?.bankName].filter(Boolean).join(' ').toLowerCase();
                if (!hay.includes(term)) return false;
            }
            if (mode === 'missing') return !p.destinationDetails || /to be provided/i.test(p.destinationDetails);
            if (mode === 'Other') return p.paymentMode !== 'UPI' && p.paymentMode !== 'Bank Transfer';
            if (mode !== 'all') return p.paymentMode === mode;
            return true;
        });
    }, [enriched, q, mode]);

    const counts = useMemo(() => {
        const c = { all: beforeType.length, duplicates: beforeType.filter(r => r.dup).length };
        Object.keys(PAYEE_TYPES).forEach(t => { c[t] = beforeType.filter(r => r.p.type === t).length; });
        return c;
    }, [beforeType]);

    const rows = useMemo(() => {
        const list = typeFilter === 'all' ? beforeType
            : typeFilter === 'duplicates' ? beforeType.filter(r => r.dup)
                : beforeType.filter(r => r.p.type === typeFilter);
        const sorted = [...list];
        if (sort === 'name') sorted.sort((a, b) => (a.p.name || '').localeCompare(b.p.name || ''));
        else if (sort === 'paid') sorted.sort((a, b) => b.paid - a.paid);
        else if (sort === 'pending') sorted.sort((a, b) => b.pending - a.pending);
        else sorted.sort((a, b) => (dayOf(b.p.createdAt) || '').localeCompare(dayOf(a.p.createdAt) || ''));
        // Keep look-alikes next to each other on the duplicates tab.
        if (typeFilter === 'duplicates') sorted.sort((a, b) => String(dupes.get(a.p.id)).localeCompare(String(dupes.get(b.p.id))));
        return sorted;
    }, [beforeType, typeFilter, sort, dupes]);
    const shown = rows.slice(0, limit);

    const totals = useMemo(() => ({
        paid: enriched.reduce((a, r) => a + r.paid, 0),
        pending: enriched.reduce((a, r) => a + r.pending, 0),
        pendingPeople: enriched.filter(r => r.pending > 0).length,
        missing: financePayees.filter(p => !p.destinationDetails || /to be provided/i.test(p.destinationDetails)).length,
    }), [enriched, financePayees]);

    const openPayee = financePayees.find(p => p.id === openId) || null;
    const filtersActive = Boolean(q || mode !== 'all' || typeFilter !== 'all');
    const clearFilters = () => {
        const next = new URLSearchParams(params);
        ['q', 'mode', 'type'].forEach(k => next.delete(k));
        setParams(next, { replace: true });
    };

    const exportSpec = () => ({
        filename: `newbi_payees_${fileDate()}`,
        sheetName: 'Payees',
        title: 'Newbi payees',
        subtitle: exportSubtitle(rows.length, 'payee', typeFilter !== 'all' ? (PAYEE_TYPES[typeFilter]?.plural || 'Possible duplicates') : null),
        rows,
        totals: { paid: true, pending: true },
        columns: [
            { header: 'Name', value: r => r.p.name || '', width: 26 },
            { header: 'Type', value: r => PAYEE_TYPES[r.p.type]?.label || r.p.type || '' },
            { header: 'Email', value: r => r.p.email || '', width: 28 },
            { header: 'Phone', value: r => r.p.phone || '' },
            { header: 'Payment method', value: r => r.p.paymentMode || '' },
            { header: 'UPI ID', value: r => payeeAccount(r.p).upiId || '' },
            { header: 'Bank', value: r => payeeAccount(r.p).bankName || '' },
            { header: 'Account no.', value: r => payeeAccount(r.p).accountNumber || '' },
            { header: 'IFSC', value: r => payeeAccount(r.p).ifscCode || '' },
            { header: 'Event or gig', value: r => r.p.linkedGig || '' },
            { header: 'Paid so far', key: 'paid', type: 'money', value: r => r.paid },
            { header: 'To pay', key: 'pending', type: 'money', value: r => r.pending },
            { header: 'Payouts', type: 'number', value: r => r.count },
            { header: 'Added', type: 'date', value: r => dayOf(r.p.createdAt) || null },
            { header: 'Notes', value: r => r.p.notes || '', width: 40 },
        ],
    });

    const actionsMenu = (p) => (
        <Menu trigger={({ toggle }) => (
            <Button variant="ghost" size="sm" onClick={toggle} aria-label={`More for ${p.name || 'payee'}`} className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
        )}>
            <MenuItem icon={Eye} onClick={() => setParam('id', p.id)}>View details and payouts</MenuItem>
            <MenuItem icon={Edit} onClick={() => setEditing(p)}>Edit</MenuItem>
            <MenuItem icon={Copy} disabled={!p.destinationDetails} onClick={() => copyText(p.destinationDetails, 'Payment details')} hint={p.destinationDetails || 'No payment details yet'}>Copy payment details</MenuItem>
            {p.phone && <MenuItem icon={Phone} as="a" href={`tel:${p.phone}`}>Call {p.phone}</MenuItem>}
            {p.email && <MenuItem icon={Mail} as="a" href={`mailto:${p.email}`}>Email</MenuItem>}
            {canDelete && <MenuItem icon={Trash2} danger onClick={() => setDeleting(p)}>Delete</MenuItem>}
        </Menu>
    );

    const typeBadge = (p) => {
        const t = PAYEE_TYPES[payeeType(p)];
        return <Badge tone={t.tone}>{PAYEE_TYPES[p.type]?.label || p.type || 'Payee'}</Badge>;
    };
    const methodLine = (p) => {
        const a = payeeAccount(p);
        if (a.upiId) return { label: 'UPI', value: a.upiId };
        if (a.accountNumber) return { label: a.bankName || 'Bank', value: `A/C ${a.accountNumber}${a.ifscCode ? ` · ${a.ifscCode}` : ''}` };
        return { label: p.paymentMode || 'No method', value: p.destinationDetails || 'No payment details yet', missing: !p.destinationDetails };
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Payees', icon: Users, description: 'Everyone you pay, with their UPI and bank details' }}
            tabs={FINANCE_TABS}
            action={(
                <div className="flex w-full gap-2 sm:w-auto">
                    <Button variant="secondary" onClick={() => setLinkOpen(true)} className="h-11 flex-1 sm:flex-none"><LinkIcon size={14} /> Registration link</Button>
                    <Button variant="accent" onClick={() => setEditing({})} className="h-11 flex-1 sm:flex-none"><UserPlus size={14} /> Add payee</Button>
                </div>
            )}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Users} tone="teal" label="Payees" value={financePayees.length}
                        hint={Object.entries(PAYEE_TYPES).map(([k, t]) => `${financePayees.filter(p => p.type === k).length} ${t.plural.toLowerCase()}`).slice(0, 2).join(' · ')}
                        active={typeFilter === 'all' && !filtersActive} onClick={clearFilters} />
                    <StatTile icon={CreditCard} tone="green" label="Paid out" value={inr(totals.paid)} hint="All payouts logged under their names" />
                    <StatTile icon={HandHeart} tone={totals.pending ? 'orange' : 'gray'} label="Still to pay" value={inr(totals.pending)}
                        hint={totals.pendingPeople ? `${totals.pendingPeople} ${totals.pendingPeople === 1 ? 'person' : 'people'} waiting` : 'Nobody waiting'}
                        active={sort === 'pending'} onClick={() => setParam('sort', sort === 'pending' ? null : 'pending')} />
                    <StatTile icon={AlertTriangle} tone={counts.duplicates || totals.missing ? 'amber' : 'gray'} label="Need a look"
                        value={dupes.size + totals.missing}
                        hint={`${dupes.size} possible duplicates · ${totals.missing} without details`}
                        active={typeFilter === 'duplicates' || mode === 'missing'}
                        onClick={() => (dupes.size ? setParam('type', typeFilter === 'duplicates' ? null : 'duplicates') : setParam('mode', mode === 'missing' ? null : 'missing'))} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={q} onChange={(v) => setParam('q', v || null)} placeholder="Name, phone, email, UPI or gig" className="lg:w-80" />
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                        <Select value={mode} onChange={(v) => setParam('mode', v === 'all' ? null : v)} label="Payment method" options={MODES} className="min-w-0 flex-1 lg:w-44 lg:flex-none" />
                        <Select value={sort} onChange={(v) => setParam('sort', v === 'newest' ? null : v)} label="Sort" options={SORTS} className="min-w-0 flex-1 lg:w-40 lg:flex-none" />
                        <ExportMenu getSpec={exportSpec} />
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs
                        value={typeFilter}
                        onChange={(v) => setParam('type', v === 'all' ? null : v)}
                        items={[
                            { value: 'all', label: 'All', count: counts.all },
                            ...Object.entries(PAYEE_TYPES).filter(([k]) => counts[k] > 0 || typeFilter === k).map(([k, t]) => ({ value: k, label: t.plural, count: counts[k], icon: TYPE_ICON[k] })),
                            ...(counts.duplicates || typeFilter === 'duplicates' ? [{ value: 'duplicates', label: 'Possible duplicates', count: counts.duplicates, highlight: counts.duplicates > 0, icon: AlertTriangle }] : []),
                        ]}
                    />
                </div>

                {shown.length === 0 ? (
                    <Card className="rounded-2xl">
                        <EmptyState
                            icon={financePayees.length ? Inbox : Users}
                            title={financePayees.length ? 'No matching payees' : 'No payees yet'}
                            description={financePayees.length ? 'Try another search or filter.' : 'Send a registration link so people add their own payment details, or add someone yourself.'}
                            action={financePayees.length ? (filtersActive && <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>) : (
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Button variant="accent" onClick={() => setLinkOpen(true)}><LinkIcon size={14} /> Registration link</Button>
                                    <Button variant="secondary" onClick={() => setEditing({})}><UserPlus size={14} /> Add payee</Button>
                                </div>
                            )}
                        />
                    </Card>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {shown.map(({ p, paid, pending, count, dup }) => {
                            const m = methodLine(p);
                            return (
                                <Card key={p.id} className="relative flex flex-col rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15">
                                    <div className="flex items-start gap-3">
                                        <Avatar name={p.name} size={44} />
                                        <button type="button" onClick={() => setParam('id', p.id)} className="min-w-0 flex-1 text-left after:absolute after:inset-0">
                                            <p className="truncate text-[15px] font-bold">{p.name || 'Unnamed payee'}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                {typeBadge(p)}
                                                {dup && <Badge tone="amber">Possible duplicate</Badge>}
                                            </div>
                                        </button>
                                        <div className="relative z-10 -mr-1 -mt-1">{actionsMenu(p)}</div>
                                    </div>
                                    <div className="mt-3 space-y-1 text-[12.5px] text-gray-500 dark:text-zinc-400">
                                        {p.linkedGig && <p className="truncate">Gig: <span className="font-semibold text-gray-700 dark:text-zinc-200">{p.linkedGig}</span></p>}
                                        {(p.phone || p.email) && <p className="truncate">{[p.phone, p.email].filter(Boolean).join(' · ')}</p>}
                                    </div>
                                    <div className={cn('relative z-10 mt-3 flex items-center gap-2 rounded-xl px-3 py-2', m.missing ? 'bg-amber-500/[0.07] dark:bg-amber-400/[0.07]' : 'bg-black/[0.03] dark:bg-white/[0.04]')}>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11.5px] font-bold text-gray-500">{m.label}</p>
                                            <p className={cn('truncate font-mono text-[12.5px]', m.missing && 'font-sans text-amber-700 dark:text-amber-300')}>{m.value}</p>
                                        </div>
                                        {!m.missing && (
                                            <button type="button" onClick={() => copyText(p.destinationDetails, 'Payment details')} aria-label="Copy payment details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
                                                <Copy size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-3 flex items-end justify-between gap-3 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                        <div>
                                            <p className="text-[11.5px] font-bold text-gray-500">Paid so far</p>
                                            <p className="text-[17px] font-extrabold tabular-nums">{inr(paid)}</p>
                                        </div>
                                        <div className="text-right text-[12px] text-gray-500">
                                            {pending > 0 ? <Badge tone="orange">{inr(pending)} to pay</Badge> : <span>{count} {count === 1 ? 'payout' : 'payouts'}</span>}
                                            <p className="mt-0.5">Added {formatDay(p.createdAt) || '—'}</p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="overflow-hidden rounded-2xl">
                        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-4 border-b border-black/[0.06] px-5 py-2.5 text-[11px] font-bold text-gray-500 dark:border-white/[0.06] xl:grid">
                            <span>Payee</span><span>Payment details</span><span>Contact</span><span className="text-right">Paid</span><span className="w-10" />
                        </div>
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map(({ p, paid, pending, dup }) => {
                                const m = methodLine(p);
                                return (
                                    <li key={p.id} className="relative transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] xl:gap-4">
                                            <button type="button" onClick={() => setParam('id', p.id)} className="flex min-w-0 items-center gap-3 text-left after:absolute after:inset-0">
                                                <Avatar name={p.name} size={36} />
                                                <span className="min-w-0">
                                                    <span className="flex items-center gap-2">
                                                        <span className="truncate text-[14.5px] font-bold">{p.name || 'Unnamed payee'}</span>
                                                        {dup && <AlertTriangle size={13} className="shrink-0 text-amber-500" aria-label="Possible duplicate" />}
                                                    </span>
                                                    <span className="mt-0.5 flex items-center gap-1.5">
                                                        {typeBadge(p)}
                                                        <span className="truncate text-[12px] text-gray-500 xl:hidden">{m.missing ? 'No payment details' : m.value}</span>
                                                    </span>
                                                </span>
                                            </button>
                                            <div className="flex items-center gap-1 xl:hidden">
                                                <span className="text-right">
                                                    <span className="block text-[14px] font-extrabold tabular-nums">{inr(paid)}</span>
                                                    {pending > 0 && <span className="block text-[11px] font-semibold text-orange-600 dark:text-orange-300">{inr(pending)} to pay</span>}
                                                </span>
                                                <span className="relative z-10">{actionsMenu(p)}</span>
                                            </div>
                                            <div className="hidden min-w-0 items-center gap-1 xl:flex">
                                                <div className="min-w-0">
                                                    <p className="text-[11.5px] font-bold text-gray-500">{m.label}</p>
                                                    <p className={cn('truncate font-mono text-[12.5px]', m.missing && 'font-sans text-amber-700 dark:text-amber-300')}>{m.value}</p>
                                                </div>
                                                {!m.missing && (
                                                    <button type="button" onClick={() => copyText(p.destinationDetails, 'Payment details')} aria-label="Copy payment details" className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
                                                        <Copy size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="hidden min-w-0 text-[12.5px] text-gray-500 xl:block">
                                                <p className="truncate">{p.phone || '—'}</p>
                                                <p className="truncate">{p.email || ''}</p>
                                            </div>
                                            <div className="hidden text-right xl:block">
                                                <p className="text-[14px] font-extrabold tabular-nums">{inr(paid)}</p>
                                                {pending > 0 && <p className="text-[11.5px] font-semibold text-orange-600 dark:text-orange-300">{inr(pending)} to pay</p>}
                                            </div>
                                            <div className="relative z-10 hidden xl:block">{actionsMenu(p)}</div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                )}
                {rows.length > limit && (
                    <div className="text-center">
                        <Button variant="ghost" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more of {rows.length - limit}</Button>
                    </div>
                )}
            </div>

            <PayeeDetailSheet
                open={Boolean(openPayee)}
                payee={openPayee}
                onClose={() => setParam('id', null)}
                payees={financePayees}
                spends={spends}
                canDelete={canDelete}
                onEdit={(p) => setEditing(p)}
                onDelete={(p) => setDeleting(p)}
                onOpenPayee={(id) => setParam('id', id)}
            />
            <PayeeEditorSheet
                open={Boolean(editing)}
                payee={editing?.id ? editing : null}
                payees={financePayees}
                onClose={() => setEditing(null)}
                onSaved={(id) => id && !editing?.id && setParam('id', id)}
                onOpenPayee={(id) => { setEditing(null); setParam('id', id); }}
            />
            <RegistrationLinkSheet open={linkOpen} onClose={() => setLinkOpen(false)} events={upcomingEvents} />
            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                title={`Delete ${deleting?.name || 'this payee'}?`}
                body={(
                    <>
                        <p>Their saved contact and payment details will be removed. You can't undo this.</p>
                        <p className="mt-2 text-gray-500">Payouts already logged in spends stay as they are.</p>
                    </>
                )}
                onConfirm={async () => {
                    const id = deleting.id;
                    await deleteFinancePayee(id);
                    if (openId === id) setParam('id', null);
                    useStore.getState().addToast?.('Payee deleted.', 'success');
                }}
            />
        </AdminCommunityHubLayout>
    );
};

export default PayeeRegistry;
