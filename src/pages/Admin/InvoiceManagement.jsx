import React, { useMemo, useState } from 'react';
import { sendComposedEmail } from '../../lib/mailApi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { copyToClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/utils';
import { exportSubtitle } from '../../lib/xlsx';
import ExportMenu from '../../components/admin/ExportMenu';
import {
    invoiceTotal, invoiceAdvance, invoiceReceived, invoiceBalance, invoiceState, INVOICE_STATE_LABEL,
    daysOverdue, nextInvoiceNumber, todayKey, INVOICE_NON_COPYABLE_FIELDS, invoiceCollectedSince,
} from '../../lib/invoicing';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Card, Button, Badge, SearchInput, SegmentedTabs, EmptyState, Select, Menu, MenuItem, ViewToggle, useViewMode } from '../../components/admin/ui';
import InvoiceEmailModal from '../../components/admin/InvoiceEmailModal';
import InvoiceDetailPanel from '../../components/admin/invoices/InvoiceDetailPanel';
import RecordPaymentModal from '../../components/admin/invoices/RecordPaymentModal';
import QuickUploadModal from '../../components/admin/invoices/QuickUploadModal';
import { inr, toDate } from '../../components/admin/ticketing/format';

const VAULT_TABS = [
    { name: 'Invoices', path: '/admin/invoices', icon: FileText },
    { name: 'Proposals', path: '/admin/proposals', icon: FileSpreadsheet },
    { name: 'Contracts', path: '/admin/agreements', icon: ShieldCheck },
];

const FILTERS = ['all', 'unpaid', 'overdue', 'verifying', 'partial', 'paid'];
const FILTER_LABEL = { all: 'All', unpaid: 'Unpaid', overdue: 'Overdue', verifying: 'Claimed paid', partial: 'Part paid', paid: 'Paid' };
const PAGE = 50;

const issuedOf = (inv) => toDate(inv.issueDate ? `${String(inv.issueDate).slice(0, 10)}T00:00:00` : inv.createdAt);
const formatDay = (d) => (d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const Kpi = ({ icon: Icon, label, value, hint, tone, active, onClick }) => {
    const tones = {
        gray: 'bg-black/5 text-gray-700 dark:bg-white/5 dark:text-zinc-300',
        red: 'bg-red-500/10 text-red-600 dark:text-red-400',
        amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
        green: 'bg-neon-green/10 text-emerald-700 dark:text-neon-green',
    };
    return (
        <button type="button" onClick={onClick} className="text-left">
            <Card className={cn('h-full rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15', active && 'border-gray-900 dark:border-white/60')}>
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tones[tone])}><Icon size={17} /></span>
                <p className="mt-3 truncate text-[20px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[24px]">{value}</p>
                <p className="mt-1.5 truncate text-[12px] font-bold text-gray-700 dark:text-zinc-300">{label}</p>
                <p className="line-clamp-2 text-[11px] text-gray-500 sm:line-clamp-1">{hint}</p>
            </Card>
        </button>
    );
};

const InvoiceManagement = () => {
    useStoreSubscription(['invoices']);
    const navigate = useNavigate();
    const invoices = useStore(s => s.invoices) || [];
    const user = useStore(s => s.user);
    const addToast = useStore(s => s.addToast);
    const [params, setParams] = useSearchParams();

    const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'all';
    const openId = params.get('invoice');
    const setParam = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        setParams(next, { replace: key !== 'invoice' });
    };

    const [view, setView] = useViewMode('invoices', 'cards');
    const [search, setSearch] = useState(() => params.get('q') || '');
    const [sort, setSort] = useState('newest');
    const [limit, setLimit] = useState(PAGE);
    const [emailInvoice, setEmailInvoice] = useState(null);
    const [payingInvoice, setPayingInvoice] = useState(null);
    const [uploadOpen, setUploadOpen] = useState(false);

    // Editors only see invoices they created and can't delete.
    const isEditor = user?.role === 'editor' || user?.role === 'content_admin';
    const canManage = !isEditor;
    const visibleInvoices = useMemo(
        () => (isEditor ? invoices.filter(inv => inv.createdBy === user?.uid) : invoices),
        [invoices, isEditor, user?.uid]
    );

    const today = todayKey();
    const enriched = useMemo(() => visibleInvoices.map(inv => ({
        inv,
        state: invoiceState(inv, today),
        total: invoiceTotal(inv),
        balance: invoiceBalance(inv),
        issued: issuedOf(inv),
        overdueDays: daysOverdue(inv),
    })), [visibleInvoices, today]);

    const counts = useMemo(() => {
        const c = Object.fromEntries(FILTERS.map(f => [f, 0]));
        enriched.forEach(e => {
            c.all += 1;
            c[e.state] += 1;
            if (e.state === 'overdue' || e.state === 'partial') c.unpaid += 1;
        });
        return c;
    }, [enriched]);

    const kpis = useMemo(() => {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        let outstanding = 0, overdue = 0, collectedMonth = 0;
        enriched.forEach(e => {
            outstanding += e.balance;
            if (e.state === 'overdue') overdue += e.balance;
            collectedMonth += invoiceCollectedSince(e.inv, monthStart);
        });
        return { outstanding, overdue, collectedMonth };
    }, [enriched]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = enriched.filter(e => {
            if (filter === 'unpaid' && !['unpaid', 'overdue', 'partial'].includes(e.state)) return false;
            if (!['all', 'unpaid'].includes(filter) && e.state !== filter) return false;
            if (!q) return true;
            return [e.inv.clientName, e.inv.invoiceNumber, e.inv.clientGst, e.inv.fileName].some(v => String(v || '').toLowerCase().includes(q));
        });
        const by = {
            newest: (a, b) => (b.issued?.getTime() || 0) - (a.issued?.getTime() || 0),
            due: (a, b) => String(a.inv.dueDate || '9999').localeCompare(String(b.inv.dueDate || '9999')),
            amount: (a, b) => b.total - a.total,
            balance: (a, b) => b.balance - a.balance,
            client: (a, b) => String(a.inv.clientName || '').localeCompare(String(b.inv.clientName || '')),
        }[sort];
        return list.sort(by);
    }, [enriched, filter, search, sort]);

    // ── actions ──
    const shareUrl = (inv, via) => `${window.location.origin}/invoice/${inv.id}?via=${via}`;

    const copyLink = async (inv) => {
        const ok = await copyToClipboard(shareUrl(inv, 'link'));
        addToast(ok ? 'Invoice link copied.' : 'Please try again.', ok ? 'success' : 'error', ok ? undefined : { title: "Couldn't copy the link" });
    };

    const share = async (inv) => {
        if (navigator.share) {
            try {
                await navigator.share({ title: `Invoice ${inv.invoiceNumber || ''}`.trim(), text: 'Your invoice from Newbi Entertainment & Marketing LLP.', url: shareUrl(inv, 'share') });
                return;
            } catch (err) {
                if (err?.name === 'AbortError') return;
            }
        }
        copyLink(inv);
    };

    const whatsapp = (inv) => {
        const text = `Hi${inv.clientName ? ` ${inv.clientName}` : ''}, here is invoice ${inv.invoiceNumber || ''} from Newbi Entertainment & Marketing LLP: ${shareUrl(inv, 'whatsapp')}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    };

    const duplicate = async (inv) => {
        if (!window.confirm(`Make a copy of ${inv.invoiceNumber || 'this invoice'} for ${inv.clientName || 'the same client'}?`)) return;
        try {
            const copy = { ...inv };
            INVOICE_NON_COPYABLE_FIELDS.forEach(k => { delete copy[k]; });
            const number = nextInvoiceNumber(invoices);
            const ref = await useStore.getState().addInvoice({
                ...copy,
                invoiceNumber: number,
                status: 'Pending',
                issueDate: today,
                invoiceDate: today,
                createdAt: new Date().toISOString(),
            });
            addToast(`Copied as ${number}.`, 'success');
            if (ref?.id && inv.type !== 'upload') navigate(`/admin/edit-invoice/${ref.id}`);
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: 'Invoice not copied', action: { label: 'Try again', onClick: () => duplicate(inv) } });
        }
    };

    const remove = async (inv) => {
        if (!canManage) { addToast('Only admins can delete invoices.', 'info'); return; }
        const paid = invoiceReceived(inv) > 0 || inv.status === 'Paid';
        if (!window.confirm(`Delete ${inv.invoiceNumber || 'this invoice'} for ${inv.clientName || 'this client'}?${paid ? ' It has payments recorded, which will be lost.' : ''} The client's link will stop working. This can't be undone.`)) return;
        try {
            await useStore.getState().deleteInvoice(inv.id);
            if (openId === inv.id) setParam('invoice', null);
            addToast('Invoice deleted.', 'success');
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: 'Invoice not deleted', action: { label: 'Try again', onClick: () => remove(inv) } });
        }
    };

    const sendEmail = async (payload) => {
        const { to } = payload;
        try {
            await sendComposedEmail({ ...payload, fromName: 'Newbi Finance', fromEmail: 'partnership@newbi.live' });
        } catch (err) {
            addToast('Check your connection and try again.', 'error', { title: 'Invoice email not sent' });
            throw err;
        }
        addToast('Invoice email sent.', 'success');
        if (emailInvoice?.id) {
            useStore.getState().updateInvoice(emailInvoice.id, { lastSentAt: new Date().toISOString(), lastSentTo: Array.isArray(to) ? to.join(', ') : to }).catch(() => {});
        }
    };

    const exportSpec = () => ({
        filename: `invoices_${filter}_${today}`,
        sheetName: 'Invoices',
        title: 'Invoices',
        subtitle: exportSubtitle(rows.length, 'invoice', filter !== 'all' ? (FILTER_LABEL[filter] || filter) : null),
        rows,
        totals: { total: true, advance: true, received: true, balance: true },
        columns: [
            { header: 'Invoice No', value: r => r.inv.invoiceNumber || '' },
            { header: 'Client', value: r => r.inv.clientName || '' },
            { header: 'Client GST', value: r => r.inv.clientGst || '' },
            { header: 'Issued', type: 'date', value: r => r.issued || null },
            { header: 'Due', type: 'date', value: r => r.inv.dueDate || null },
            { header: 'Total', key: 'total', type: 'money', value: r => r.total },
            { header: 'Advance', key: 'advance', type: 'money', value: r => invoiceAdvance(r.inv) },
            { header: 'Received', key: 'received', type: 'money', value: r => invoiceReceived(r.inv) },
            { header: 'Balance', key: 'balance', type: 'money', value: r => r.balance },
            { header: 'Status', value: r => INVOICE_STATE_LABEL[r.state].label },
            { header: 'Days Overdue', type: 'number', value: r => r.overdueDays || null },
            { header: 'Last Opened', type: 'datetime', value: r => r.inv.lastOpened || null },
            { header: 'Link', value: r => `${window.location.origin}/invoice/${r.inv.id}` },
        ],
    });

    const shown = rows.slice(0, limit);

    const actionsMenu = (inv) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="w-9 px-0"><MoreHorizontal size={15} /></Button>
        )}>
            <MenuItem icon={FileText} onClick={() => setParam('invoice', inv.id)}>Details & payments</MenuItem>
            <MenuItem as="a" href={`/invoice/${inv.id}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open invoice</MenuItem>
            {canManage && inv.type !== 'upload' && <MenuItem icon={Edit} onClick={() => navigate(`/admin/edit-invoice/${inv.id}`)}>Edit</MenuItem>}
            <MenuItem icon={Mail} onClick={() => setEmailInvoice(inv)}>Email to client</MenuItem>
            <MenuItem icon={MessageCircle} onClick={() => whatsapp(inv)}>Send on WhatsApp</MenuItem>
            <MenuItem icon={Link2} onClick={() => copyLink(inv)}>Copy link</MenuItem>
            {canManage && <MenuItem icon={CopyPlus} onClick={() => duplicate(inv)}>Duplicate</MenuItem>}
            {canManage && <MenuItem icon={Trash2} danger onClick={() => remove(inv)}>Delete</MenuItem>}
        </Menu>
    );

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Invoices', icon: FileText, accentClass: 'text-sky-600 dark:text-neon-blue', description: 'Billing, payments and who has opened what' }}
            tabs={VAULT_TABS}
            action={(
                <div className="flex w-full gap-2 sm:w-auto">
                    <Button variant="secondary" onClick={() => setUploadOpen(true)} className="flex-1 sm:flex-none"><Upload size={14} /> Add PDF</Button>
                    <Button as={Link} to="/admin/create-invoice" variant="primary" className="flex-1 sm:flex-none"><Plus size={14} /> New invoice</Button>
                </div>
            )}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi icon={Wallet} tone="gray" label="Outstanding" value={inr(kpis.outstanding)} hint={`${counts.unpaid + counts.verifying} unpaid invoices`} active={filter === 'unpaid'} onClick={() => setParam('filter', filter === 'unpaid' ? null : 'unpaid')} />
                    <Kpi icon={AlertCircle} tone={counts.overdue ? 'red' : 'gray'} label="Overdue" value={inr(kpis.overdue)} hint={counts.overdue ? `${counts.overdue} past their due date` : 'Nothing overdue'} active={filter === 'overdue'} onClick={() => setParam('filter', filter === 'overdue' ? null : 'overdue')} />
                    <Kpi icon={Clock} tone={counts.verifying ? 'amber' : 'gray'} label="Claimed paid" value={counts.verifying} hint={counts.verifying ? 'Check your bank, then confirm' : 'No claims waiting'} active={filter === 'verifying'} onClick={() => setParam('filter', filter === 'verifying' ? null : 'verifying')} />
                    <Kpi icon={TrendingUp} tone="green" label="Collected this month" value={inr(kpis.collectedMonth)} hint="Payments and invoices marked paid" active={false} onClick={() => setParam('filter', 'paid')} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={(v) => { setSearch(v); setLimit(PAGE); }} placeholder="Client, invoice number or GST" className="lg:w-80" />
                    <div className="flex flex-1 items-center gap-2">
                        <Select value={sort} onChange={setSort} label="Sort" className="flex-1 lg:w-48 lg:flex-none" options={[
                            { value: 'newest', label: 'Newest first' },
                            { value: 'due', label: 'Due soonest' },
                            { value: 'balance', label: 'Largest balance' },
                            { value: 'amount', label: 'Largest amount' },
                            { value: 'client', label: 'Client A–Z' },
                        ]} />
                        <ExportMenu getSpec={exportSpec} />
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs
                        value={filter}
                        onChange={(v) => { setParam('filter', v === 'all' ? null : v); setLimit(PAGE); }}
                        items={FILTERS.filter(f => f === 'all' || f === filter || counts[f] > 0).map(f => ({
                            value: f, label: FILTER_LABEL[f], count: counts[f], highlight: (f === 'overdue' || f === 'verifying') && counts[f] > 0,
                        }))}
                    />
                </div>

                {shown.length === 0 ? (
                    <Card className="rounded-2xl">
                        <EmptyState
                            icon={Inbox}
                            title={visibleInvoices.length ? 'No matching invoices' : 'No invoices yet'}
                            description={visibleInvoices.length ? 'Try another filter or search.' : 'Create one, or add a PDF you made elsewhere.'}
                            action={!visibleInvoices.length && <Button as={Link} to="/admin/create-invoice" variant="primary"><Plus size={14} /> New invoice</Button>}
                        />
                    </Card>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {shown.map(({ inv, state, total, balance, issued, overdueDays }) => {
                            const cfg = INVOICE_STATE_LABEL[state];
                            const collected = total - balance;
                            return (
                                <Card key={inv.id} className="relative flex flex-col rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Badge tone={cfg.tone}>{cfg.label}{overdueDays ? ` ${overdueDays}d` : ''}</Badge>
                                            {inv.type === 'upload' && <Badge tone="gray">PDF</Badge>}
                                            {inv.sourceProposalId && <Badge tone="violet">From proposal</Badge>}
                                        </div>
                                        <span className="shrink-0 font-mono text-[11px] text-gray-500">{inv.invoiceNumber || ''}</span>
                                    </div>
                                    <button type="button" onClick={() => setParam('invoice', inv.id)} className="mt-3 min-w-0 text-left after:absolute after:inset-0">
                                        <p className="line-clamp-2 text-[17px] font-extrabold leading-snug">{inv.clientName || 'Untitled'}</p>
                                    </button>
                                    <p className="mt-3 text-[11px] font-bold text-gray-500">{balance > 0 ? 'Balance due' : 'Total'}</p>
                                    <p className="text-[22px] font-extrabold tracking-tight tabular-nums">{inr(balance > 0 ? balance : total)}</p>
                                    {balance > 0 && collected > 0 && (
                                        <div className="mt-2">
                                            <div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                                                <div className="h-full rounded-full bg-emerald-500 dark:bg-neon-green" style={{ width: `${Math.min(100, (collected / total) * 100)}%` }} />
                                            </div>
                                            <p className="mt-1 text-[11px] text-gray-500">{inr(collected)} of {inr(total)} collected</p>
                                        </div>
                                    )}
                                    <div className="mt-2 space-y-0.5 text-[12px] text-gray-500">
                                        <p>Issued {formatDay(issued)}</p>
                                        <p className={cn(overdueDays && 'font-semibold text-red-600 dark:text-red-400')}>{inv.dueDate ? `Due ${formatDay(new Date(`${inv.dueDate}T00:00:00`))}` : 'No due date'}</p>
                                        <p>{inv.lastOpened ? `Opened by client ${formatDay(new Date(inv.lastOpened))}` : 'Not opened yet'}</p>
                                    </div>
                                    <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                        {canManage && balance > 0 ? (
                                            <Button size="sm" variant={state === 'verifying' ? 'secondary' : 'success'} onClick={() => (state === 'verifying' ? setParam('invoice', inv.id) : setPayingInvoice(inv))} className="flex-1">
                                                {state === 'verifying' ? 'Review claim' : <><Wallet size={13} /> Record payment</>}
                                            </Button>
                                        ) : (
                                            <Button size="sm" as="a" href={`/invoice/${inv.id}`} target="_blank" rel="noopener noreferrer" variant="secondary" className="flex-1"><ExternalLink size={13} /> Open</Button>
                                        )}
                                        <Button size="sm" variant="secondary" onClick={() => share(inv)} aria-label="Share invoice" className="w-9 px-0"><Share2 size={14} /></Button>
                                        {actionsMenu(inv)}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="overflow-hidden rounded-2xl">
                        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-black/[0.06] px-5 py-2.5 text-[11px] font-bold text-gray-500 dark:border-white/[0.06] xl:grid">
                            <span>Client</span><span>Issued / due</span><span className="text-right">Total</span><span className="text-right">Balance</span><span className="w-[248px]" />
                        </div>
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map(({ inv, state, total, balance, issued, overdueDays }) => {
                                const cfg = INVOICE_STATE_LABEL[state];
                                return (
                                    <li key={inv.id} className="relative transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 sm:px-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:gap-4">
                                            <button type="button" onClick={() => setParam('invoice', inv.id)} className="min-w-0 text-left after:absolute after:inset-0 xl:after:hidden">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate text-[15px] font-bold">{inv.clientName || 'Untitled'}</span>
                                                    <Badge tone={cfg.tone}>{cfg.label}{overdueDays ? ` ${overdueDays}d` : ''}</Badge>
                                                    {inv.type === 'upload' && <Badge tone="gray">PDF</Badge>}
                                                </span>
                                                <span className="mt-0.5 block truncate text-[12px] text-gray-500">
                                                    {inv.invoiceNumber || 'No number'}
                                                    <span className="xl:hidden"> · {formatDay(issued)}{inv.dueDate ? ` · due ${formatDay(new Date(`${inv.dueDate}T00:00:00`))}` : ''}</span>
                                                </span>
                                            </button>

                                            <div className="text-right xl:hidden">
                                                <p className="text-[15px] font-extrabold tabular-nums">{inr(balance > 0 ? balance : total)}</p>
                                                <p className="text-[11px] text-gray-500">{balance > 0 && balance < total ? `of ${inr(total)}` : balance > 0 ? 'due' : 'total'}</p>
                                            </div>

                                            <div className="hidden min-w-0 text-[13px] xl:block">
                                                <p>{formatDay(issued)}</p>
                                                <p className={cn('text-[12px]', overdueDays ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-500')}>
                                                    {inv.dueDate ? `due ${formatDay(new Date(`${inv.dueDate}T00:00:00`))}` : 'No due date'}
                                                </p>
                                            </div>
                                            <p className="hidden text-right text-[14px] font-semibold tabular-nums xl:block">{inr(total)}</p>
                                            <p className={cn('hidden text-right text-[14px] font-extrabold tabular-nums xl:block', balance === 0 && 'text-gray-400')}>{balance > 0 ? inr(balance) : '—'}</p>

                                            <div className="relative z-10 col-span-2 flex items-center justify-end gap-2 pt-2 xl:col-span-1 xl:w-[248px] xl:pt-0">
                                                {canManage && balance > 0 && (
                                                    <Button size="sm" variant={state === 'verifying' ? 'secondary' : 'success'} onClick={() => (state === 'verifying' ? setParam('invoice', inv.id) : setPayingInvoice(inv))} className="flex-1 sm:flex-none">
                                                        {state === 'verifying' ? 'Review claim' : <><Wallet size={13} /> Record payment</>}
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="secondary" onClick={() => share(inv)} aria-label="Share invoice" className="w-9 px-0"><Share2 size={14} /></Button>
                                                {actionsMenu(inv)}
                                            </div>
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

            <InvoiceDetailPanel
                invoiceId={openId}
                onClose={() => setParam('invoice', null)}
                canManage={canManage}
                onRecordPayment={setPayingInvoice}
                onEmail={setEmailInvoice}
                onShare={share}
                onDuplicate={duplicate}
                onDelete={remove}
            />
            <RecordPaymentModal invoice={payingInvoice} open={Boolean(payingInvoice)} onClose={() => setPayingInvoice(null)} />
            <QuickUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} invoices={invoices} onCreated={(id) => id && setParam('invoice', id)} />
            <AnimatePresence>
                {emailInvoice && (
                    <InvoiceEmailModal isOpen={Boolean(emailInvoice)} onClose={() => setEmailInvoice(null)} invoice={emailInvoice} onSend={sendEmail} />
                )}
            </AnimatePresence>
        </AdminCommunityHubLayout>
    );
};

export default InvoiceManagement;
