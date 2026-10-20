import React, { useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Eye from 'lucide-react/dist/esm/icons/eye';
import X from 'lucide-react/dist/esm/icons/x';
import Search from 'lucide-react/dist/esm/icons/search';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Download from 'lucide-react/dist/esm/icons/download';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import User from 'lucide-react/dist/esm/icons/user';
import Copy from 'lucide-react/dist/esm/icons/copy';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Award from 'lucide-react/dist/esm/icons/award';
import Inbox from 'lucide-react/dist/esm/icons/inbox';

import ExportMenu from '../../components/admin/ExportMenu';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import Sheet from '../../components/admin/Sheet';
import { Card, Button, Badge, StatTile, SearchInput, Select, SegmentedTabs, EmptyState, Menu, MenuItem, ViewToggle, useViewMode } from '../../components/admin/ui';
import { inr } from '../../components/admin/ticketing/format';
import { Field, Section, Choice, fieldCls, areaCls } from '../../components/admin/uploads/UploadKit';
import ConfirmDialog from '../../components/admin/finance/ConfirmDialog';
import { FINANCE_TABS, incomeDay, todayIST, monthLabel, formatDay, isIncomeReceived, isIncomePending } from '../../components/admin/finance/money';

const INCOME_CATEGORIES = ['Sponsorship', 'Ticket Sales', 'Client Work', 'Booking Fee', 'Other'];
const CATEGORY_TONE = { 'Sponsorship': 'violet', 'Ticket Sales': 'blue', 'Client Work': 'teal', 'Booking Fee': 'orange', 'Other': 'gray' };
const PAGE = 30;
const KPI_CLS = 'w-[78%] shrink-0 snap-start sm:w-auto';

const formatINR = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

// Pill buttons for short lists (category, payment method).
const Chips = ({ value, onChange, options, label }) => (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(opt => (
            <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={value === opt}
                onClick={() => onChange(opt)}
                className={cn(
                    'h-10 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors',
                    value === opt
                        ? 'border-emerald-500/60 bg-neon-green/[0.08] text-gray-900 dark:border-neon-green/50 dark:text-white'
                        : 'border-black/10 text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20'
                )}
            >
                {opt}
            </button>
        ))}
    </div>
);

const GroupLabel = ({ children, optional }) => (
    <span className="mb-1.5 block text-[12px] font-bold text-gray-500">
        {children}{optional && <span className="font-medium"> (optional)</span>}
    </span>
);

const isImageUrl = (url = '') => /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url) || (/\/image\/upload\//.test(url) && !/\.pdf(\?|$)/i.test(url));

// Pick a file and upload it straight away (same as before); shows what's attached.
const AttachmentField = ({ url, uploading, onPick, onRemove, label = 'Attach proof', sub = 'Screenshot, photo or PDF' }) => {
    const inputRef = useRef(null);
    const input = (
        <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => { onPick(e); e.target.value = ''; }}
        />
    );

    if (uploading) {
        return (
            <div className="flex h-16 items-center gap-3 rounded-2xl border border-black/[0.08] px-4 text-[13px] font-semibold text-gray-500 dark:border-white/[0.08]">
                <Loader2 size={16} className="animate-spin" /> Uploading…
            </div>
        );
    }

    if (!url) {
        return (
            <div>
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-black/10 px-4 py-4 text-left transition-colors hover:border-black/25 dark:border-white/10 dark:hover:border-white/25"
                >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 text-gray-500 dark:bg-white/[0.06] dark:text-zinc-300"><Upload size={17} /></span>
                    <span className="min-w-0">
                        <span className="block text-[14px] font-bold">{label}</span>
                        <span className="block text-[12px] text-gray-500">{sub}</span>
                    </span>
                </button>
                {input}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-black/[0.08] p-3 dark:border-white/[0.08]">
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-gray-50 dark:border-white/10 dark:bg-white/[0.04]">
                {isImageUrl(url) ? <img src={url} alt="Attachment" className="h-full w-full object-cover" /> : <FileText size={18} className="text-gray-400" />}
            </a>
            <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">File attached</p>
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-sky-600 dark:text-neon-blue">
                    Open <ExternalLink size={11} />
                </a>
            </div>
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-[12px] font-bold hover:border-black/25 dark:border-white/10 dark:hover:border-white/25">
                <RefreshCw size={13} /> Replace
            </button>
            {onRemove && (
                <button type="button" onClick={onRemove} aria-label="Remove attachment" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-red-500/10 hover:text-red-600">
                    <Trash2 size={15} />
                </button>
            )}
            {input}
        </div>
    );
};

const OtherIncomeManagement = () => {
    useStoreSubscription(['otherIncomes']);
    const { otherIncomes, addOtherIncome, updateOtherIncome, deleteOtherIncome, uploadToCloudinary, user } = useStore();
    // Filters live in the URL so a filtered view can be shared or reloaded.
    // No month in the URL means this month, as before; "all" means all time.
    const [params, setParams] = useSearchParams();
    const currentMonth = todayIST().slice(0, 7);
    const [searchTerm, setSearchTerm] = useState(() => params.get('q') || '');
    // Months are "YYYY-MM" (IST) and follow the date the money came in, the same as the Finance board.
    const monthFilter = params.get('month') === 'all' ? 'all' : (/^\d{4}-\d{2}$/.test(params.get('month') || '') ? params.get('month') : currentMonth);
    const categoryFilter = INCOME_CATEGORIES.includes(params.get('category')) ? params.get('category') : 'All';
    const statusFilter = ['Paid', 'Pending'].includes(params.get('status')) ? params.get('status') : 'All';
    const accountFilter = ['newbi', 'personal'].includes(params.get('account')) ? params.get('account') : 'All';
    const dateFilter = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : '';
    const [view, setView] = useViewMode('other_income', 'cards');
    const [limit, setLimit] = useState(PAGE);

    const setFilter = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        setParams(next, { replace: true });
        setLimit(PAGE);
    };
    const setMonth = (value) => setFilter('month', value === currentMonth ? null : value);
    const setStatusFilter = (value) => setFilter('status', value === 'All' ? null : value);
    const filtersActive = Boolean(searchTerm || params.get('month') || categoryFilter !== 'All' || statusFilter !== 'All' || accountFilter !== 'All' || dateFilter);
    const clearFilters = () => {
        setSearchTerm('');
        const next = new URLSearchParams(params);
        ['q', 'month', 'category', 'status', 'account', 'date'].forEach(k => next.delete(k));
        setParams(next, { replace: true });
        setLimit(PAGE);
    };

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [savingIncome, setSavingIncome] = useState(false);
    const [deletingIncome, setDeletingIncome] = useState(null);

    // Form states
    const [sourceName, setSourceName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Sponsorship');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountType, setAccountType] = useState('newbi'); // newbi vs personal
    const [receiverName, setReceiverName] = useState(''); // core member who received it
    const [paymentMode, setPaymentMode] = useState('UPI'); // UPI, Bank Transfer, Cash, Card, Other
    const [status, setStatus] = useState('Paid'); // Paid / Pending
    const [notes, setNotes] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [transactionRef, setTransactionRef] = useState('');

    const financeTabs = FINANCE_TABS;
    const incomeCategories = INCOME_CATEGORIES;

    const paymentModes = ['UPI', 'Bank Transfer', 'Cash', 'Card', 'Other'];

    // Months that have income, newest first ("YYYY-MM").
    const monthOptions = useMemo(() => {
        const months = new Set([currentMonth]);
        if (monthFilter !== 'all') months.add(monthFilter);
        otherIncomes.forEach(inc => {
            const key = incomeDay(inc).slice(0, 7);
            if (key) months.add(key);
        });
        return [...months].sort().reverse();
    }, [otherIncomes, currentMonth, monthFilter]);

    // Filtered incomes (status is applied last so the status tabs can show counts)
    const incomesBeforeStatus = useMemo(() => {
        return otherIncomes
            .filter(inc => {
                const matchesSearch = 
                    inc.sourceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    inc.receiverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    inc.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    inc.transactionRef?.toLowerCase().includes(searchTerm.toLowerCase());

                const matchesMonth = monthFilter === 'all' ? true : incomeDay(inc).slice(0, 7) === monthFilter;

                const matchesCategory = categoryFilter === 'All' ? true : inc.category === categoryFilter;
                const matchesAccount = accountFilter === 'All' ? true : inc.accountType === accountFilter;
                const matchesDate = !dateFilter ? true : incomeDay(inc) === dateFilter;

                return matchesSearch && matchesMonth && matchesCategory && matchesAccount && matchesDate;
            });
    }, [otherIncomes, searchTerm, monthFilter, categoryFilter, accountFilter, dateFilter]);
    const filteredIncomes = useMemo(
        () => (statusFilter === 'All' ? incomesBeforeStatus : incomesBeforeStatus.filter(inc => (statusFilter === 'Paid' ? isIncomeReceived(inc) : isIncomePending(inc)))),
        [incomesBeforeStatus, statusFilter]
    );
    const statusCounts = {
        All: incomesBeforeStatus.length,
        Paid: incomesBeforeStatus.filter(isIncomeReceived).length,
        Pending: incomesBeforeStatus.filter(isIncomePending).length,
    };

    // Totals for what's shown.
    const stats = useMemo(() => {
        let received = 0, pending = 0, personal = 0, countReceived = 0, countPending = 0;
        const byCat = {};
        filteredIncomes.forEach(inc => {
            const amt = Number(inc.amount || 0);
            if (isIncomeReceived(inc)) { received += amt; countReceived += 1; } else { pending += amt; countPending += 1; }
            if (inc.accountType === 'personal') personal += amt;
            if (inc.category) byCat[inc.category] = (byCat[inc.category] || 0) + amt;
        });
        const [topCat, topVal] = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0] || [null, 0];
        return { received, pending, personal, countReceived, countPending, topCat: topVal > 0 ? topCat : null, topVal };
    }, [filteredIncomes]);

    const handleAttachmentUpload = async (e, setUrl) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingAttachment(true);
        try {
            const url = await uploadToCloudinary(file);
            setUrl(url);
            useStore.getState().addToast('Attachment uploaded.', 'success');
        } catch (err) {
            useStore.getState().addToast('Check your connection and try again.', 'error', { title: 'Attachment not uploaded' });
        } finally {
            setUploadingAttachment(false);
        }
    };

    const handleCreateIncome = async (e) => {
        e.preventDefault();
        if (!sourceName || !amount || !date) {
            useStore.getState().addToast('Add the source, amount and date first.', 'warning');
            return;
        }
        if (savingIncome) return;
        setSavingIncome(true);

        try {
            await addOtherIncome({
                sourceName,
                amount: Number(amount),
                category,
                date,
                accountType,
                receiverName: accountType === 'personal' ? receiverName : 'Newbi Core Account',
                paymentMode,
                status,
                notes,
                attachmentUrl,
                transactionRef,
                createdAt: new Date().toISOString()
            });

            useStore.getState().addToast('Income entry added.', 'success');
            setShowAddModal(false);
            resetForm();
        } catch (err) {
            useStore.getState().addToast('Check your connection and try again.', 'error', { title: 'Income entry not saved', action: { label: 'Try again', onClick: () => handleCreateIncome(e) } });
        } finally {
            setSavingIncome(false);
        }
    };

    const handleUpdateIncome = async (e) => {
        e.preventDefault();
        if (!sourceName || !amount || !date) {
            useStore.getState().addToast('Add the source, amount and date first.', 'warning');
            return;
        }
        if (savingIncome) return;
        setSavingIncome(true);

        try {
            await updateOtherIncome(showEditModal.id, {
                sourceName,
                amount: Number(amount),
                category,
                date,
                accountType,
                receiverName: accountType === 'personal' ? receiverName : 'Newbi Core Account',
                paymentMode,
                status,
                notes,
                attachmentUrl,
                transactionRef
            });

            useStore.getState().addToast('Income entry updated.', 'success');
            setShowEditModal(null);
            resetForm();
        } catch (err) {
            useStore.getState().addToast('Check your connection and try again.', 'error', { title: 'Changes not saved', action: { label: 'Try again', onClick: () => handleUpdateIncome(e) } });
        } finally {
            setSavingIncome(false);
        }
    };

    const handleDeleteIncome = (income) => {
        if (user?.role === 'editor' || user?.role === 'content_admin') {
            useStore.getState().addToast("Only admins can delete income entries.", 'warning');
            return;
        }
        setDeletingIncome(income);
    };

    // Runs from the confirm dialog, which stays open and shows the error if this throws.
    const confirmDeleteIncome = async () => {
        await deleteOtherIncome(deletingIncome.id);
        useStore.getState().addToast('Income entry deleted.', 'success');
    };

    const handleToggleStatus = async (income) => {
        try {
            const newStatus = isIncomeReceived(income) ? 'Pending' : 'Paid';
            await updateOtherIncome(income.id, { status: newStatus });
            useStore.getState().addToast(`Income marked as ${newStatus.toLowerCase()}.`, 'success');
        } catch (err) {
            useStore.getState().addToast('Check your connection and try again.', 'error', { title: 'Status not changed', action: { label: 'Try again', onClick: () => handleToggleStatus(income) } });
        }
    };

    const resetForm = () => {
        setSourceName('');
        setAmount('');
        setCategory('Sponsorship');
        setDate(new Date().toISOString().split('T')[0]);
        setAccountType('newbi');
        setReceiverName('');
        setPaymentMode('UPI');
        setStatus('Paid');
        setNotes('');
        setAttachmentUrl('');
        setTransactionRef('');
    };

    const openEdit = (income) => {
        setShowEditModal(income);
        setSourceName(income.sourceName || '');
        setAmount(income.amount || '');
        setCategory(income.category || 'Sponsorship');
        setDate(income.date || new Date().toISOString().split('T')[0]);
        setAccountType(income.accountType || 'newbi');
        setReceiverName(income.receiverName || '');
        setPaymentMode(income.paymentMode || 'UPI');
        setStatus(income.status || 'Paid');
        setNotes(income.notes || '');
        setAttachmentUrl(income.attachmentUrl || '');
        setTransactionRef(income.transactionRef || '');
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        useStore.getState().addToast('Payment details copied.', 'success');
    };

    const incomeExportSpec = () => ({
        filename: `newbi_other_income_${fileDate()}`,
        sheetName: 'Other income',
        title: 'Newbi other income',
        subtitle: exportSubtitle(filteredIncomes.length, 'income entry'),
        rows: filteredIncomes,
        totals: { amount: true },
        columns: [
            { header: 'Date', type: 'date', value: inc => inc.date || null },
            { header: 'Source', value: inc => inc.sourceName || '' },
            { header: 'Amount', key: 'amount', type: 'money', value: inc => Number(inc.amount) || 0 },
            { header: 'Category', value: inc => inc.category || '' },
            { header: 'Account', value: inc => (inc.accountType === 'personal' ? 'Personal account' : 'Newbi official') },
            { header: 'Received By', value: inc => inc.receiverName || '' },
            { header: 'Payment Mode', value: inc => inc.paymentMode || '' },
            { header: 'Status', value: inc => inc.status || '' },
            { header: 'Transaction Ref', value: inc => inc.transactionRef || '' },
            { header: 'Notes', value: inc => inc.notes || '', width: 40 },
            { header: 'Attachment', value: inc => inc.attachmentUrl || '' },
        ],
    });

    // Add / edit income form (same fields and payload as before, grouped into sections).
    const renderIncomeForm = (isEdit) => (
        <form id={isEdit ? 'income-form-edit' : 'income-form-add'} onSubmit={isEdit ? handleUpdateIncome : handleCreateIncome} className="space-y-7">
            <Section title="What came in">
                <Field label="From">
                    <input
                        className={fieldCls}
                        value={sourceName}
                        onChange={(e) => setSourceName(e.target.value)}
                        placeholder={isEdit ? 'e.g. Sprite sponsorship' : 'e.g. Sprite sponsorship, door cash'}
                        required
                    />
                </Field>
                <div>
                    <GroupLabel>Category</GroupLabel>
                    <Chips label="Category" value={category} onChange={setCategory} options={incomeCategories} />
                </div>
            </Section>

            <Section title="Amount and date">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Amount (₹)">
                        <input className={fieldCls} type="number" inputMode="decimal" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
                    </Field>
                    <Field label="Date">
                        <input className={fieldCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                    </Field>
                </div>
            </Section>

            <Section title="Who received it">
                <Choice
                    value={accountType}
                    onChange={setAccountType}
                    options={[
                        { value: 'newbi', label: 'Newbi account', hint: 'Paid to the company' },
                        { value: 'personal', label: 'Personal account', hint: 'A team member got it' },
                    ]}
                />
                {accountType === 'personal' && (
                    <Field label="Team member who received it">
                        <input className={fieldCls} value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="e.g. Team member name" required />
                    </Field>
                )}
            </Section>

            <Section title="Payment details">
                <div>
                    <GroupLabel>Method</GroupLabel>
                    <Chips label="Payment method" value={paymentMode} onChange={setPaymentMode} options={paymentModes} />
                </div>
                <div>
                    <GroupLabel>Status</GroupLabel>
                    <Choice
                        value={status}
                        onChange={setStatus}
                        options={[
                            { value: 'Paid', label: 'Received', hint: 'The money is in' },
                            { value: 'Pending', label: 'Pending', hint: 'Still to come' },
                        ]}
                    />
                </div>
                <Field label="Reference" optional hint="UPI reference, IMPS ID or anything that helps find it later">
                    <input className={cn(fieldCls, 'font-mono')} value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="e.g. 412345678901" autoCapitalize="characters" />
                </Field>
            </Section>

            <Section title="Proof" hint="Optional. A screenshot or PDF of the payment.">
                <AttachmentField
                    url={attachmentUrl}
                    uploading={uploadingAttachment}
                    onPick={(e) => handleAttachmentUpload(e, setAttachmentUrl)}
                    onRemove={() => setAttachmentUrl('')}
                />
            </Section>

            <Section title="Notes">
                <textarea className={cn(areaCls, 'min-h-[96px] resize-y')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering about this payment" />
            </Section>
        </form>
    );

    const renderIncomeFooter = (isEdit) => (
        <div className="flex gap-2">
            <Button variant="ghost" className="h-12" onClick={() => (isEdit ? setShowEditModal(null) : setShowAddModal(false))}>Cancel</Button>
            <Button variant="primary" type="submit" form={isEdit ? 'income-form-edit' : 'income-form-add'} disabled={uploadingAttachment || savingIncome} className="h-12 flex-1">
                {savingIncome ? 'Saving…' : uploadingAttachment ? 'Uploading…' : isEdit ? 'Save changes' : 'Save income'}
            </Button>
        </div>
    );

    const canDelete = user?.role !== 'editor' && user?.role !== 'content_admin';
    const shown = filteredIncomes.slice(0, limit);
    const accountLabel = (inc) => (inc.accountType === 'personal' ? `Personal (${inc.receiverName || 'team member'})` : 'Newbi account');
    const statusBadge = (inc) => <Badge tone={isIncomeReceived(inc) ? 'green' : 'amber'}>{isIncomeReceived(inc) ? 'Received' : 'Pending'}</Badge>;

    const incomeMenu = (inc) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="w-9 px-0"><MoreHorizontal size={15} /></Button>
        )}>
            <MenuItem icon={Edit} onClick={() => openEdit(inc)}>Edit</MenuItem>
            <MenuItem icon={isIncomeReceived(inc) ? Clock : CheckCircle} onClick={() => handleToggleStatus(inc)}>
                {isIncomeReceived(inc) ? 'Mark as pending' : 'Mark as received'}
            </MenuItem>
            {inc.attachmentUrl && <MenuItem as="a" href={inc.attachmentUrl} target="_blank" rel="noopener noreferrer" icon={Eye}>View proof</MenuItem>}
            {inc.transactionRef && <MenuItem icon={Copy} onClick={() => copyToClipboard(inc.transactionRef)} hint={inc.transactionRef}>Copy reference</MenuItem>}
            {canDelete && <MenuItem icon={Trash2} danger onClick={() => handleDeleteIncome(inc)}>Delete</MenuItem>}
        </Menu>
    );

    return (
        <>
            <AdminCommunityHubLayout
                studioHeader={{ title: 'Other income', icon: FileSpreadsheet, description: 'Sponsorships, door sales and money outside invoices' }}
                tabs={financeTabs}
                action={(
                    <div className="flex w-full gap-2 sm:w-auto">
                        <Button variant="primary" onClick={() => { resetForm(); setShowAddModal(true); }} className="flex-1 sm:flex-none"><Plus size={14} /> Log income</Button>
                    </div>
                )}
            >
                <div className="space-y-5">
                    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                        <StatTile className={KPI_CLS} icon={CheckCircle} tone="green" label="Received" value={inr(stats.received)} hint={`${stats.countReceived} ${stats.countReceived === 1 ? 'entry' : 'entries'}`} active={statusFilter === 'Paid'} onClick={() => setStatusFilter(statusFilter === 'Paid' ? 'All' : 'Paid')} />
                        <StatTile className={KPI_CLS} icon={Clock} tone={stats.countPending ? 'amber' : 'gray'} label="Still to come" value={inr(stats.pending)} hint={stats.countPending ? `${stats.countPending} pending` : 'Nothing pending'} active={statusFilter === 'Pending'} onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')} />
                        <StatTile className={KPI_CLS} icon={Award} tone={CATEGORY_TONE[stats.topCat] || 'gray'} label="Biggest category" value={stats.topCat || '—'} hint={stats.topCat ? `${inr(stats.topVal)} in total` : 'No income yet'} active={!!stats.topCat && categoryFilter === stats.topCat} onClick={stats.topCat ? () => setFilter('category', categoryFilter === stats.topCat ? null : stats.topCat) : undefined} />
                        <StatTile className={KPI_CLS} icon={User} tone={stats.personal ? 'orange' : 'gray'} label="In personal accounts" value={inr(stats.personal)} hint={stats.personal ? 'Received by team members' : 'All paid to Newbi'} active={accountFilter === 'personal'} onClick={() => setFilter('account', accountFilter === 'personal' ? null : 'personal')} />
                    </div>

                    <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
                        <SearchInput value={searchTerm} onChange={(v) => { setSearchTerm(v); setLimit(PAGE); }} placeholder="Source, receiver, reference or notes" className="2xl:w-72" />
                        <div className="grid flex-1 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                            <Select label="Month" value={monthFilter} onChange={setMonth} className="sm:w-36" options={[{ value: 'all', label: 'All time' }, ...monthOptions.map(m => ({ value: m, label: monthLabel(m) }))]} />
                            <label className="relative">
                                <span className="sr-only">Exact day</span>
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setFilter('date', e.target.value || null)}
                                    className={cn('h-11 w-full min-w-0 appearance-none rounded-xl border border-black/10 bg-white px-3.5 text-xs font-bold outline-none transition-all hover:border-black/20 focus:border-neon-green/50 dark:border-white/10 dark:bg-white/[0.03] dark:[color-scheme:dark] dark:hover:border-white/20 sm:w-40', dateFilter ? 'text-gray-800 dark:text-zinc-200' : 'text-gray-400')}
                                />
                            </label>
                            <Select label="Category" value={categoryFilter} onChange={(v) => setFilter('category', v === 'All' ? null : v)} className="sm:w-40" options={[{ value: 'All', label: 'All categories' }, ...incomeCategories.map(c => ({ value: c, label: c }))]} />
                            <Select label="Received into" value={accountFilter} onChange={(v) => setFilter('account', v === 'All' ? null : v)} className="sm:w-44" options={[{ value: 'All', label: 'Any account' }, { value: 'newbi', label: 'Newbi account' }, { value: 'personal', label: 'Personal account' }]} />
                            <div className="col-span-2 sm:col-span-1 sm:ml-auto">
                                <ExportMenu getSpec={incomeExportSpec} className="w-full [&>button]:w-full" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <SegmentedTabs
                                value={statusFilter}
                                onChange={setStatusFilter}
                                items={[
                                    { value: 'All', label: 'All', count: statusCounts.All },
                                    { value: 'Pending', label: 'Pending', count: statusCounts.Pending, highlight: statusCounts.Pending > 0 },
                                    { value: 'Paid', label: 'Received', count: statusCounts.Paid },
                                ]}
                            />
                        </div>
                        {filtersActive && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} aria-label="Clear filters" className="px-2.5 sm:px-3"><X size={14} /><span className="hidden sm:inline">Clear filters</span></Button>
                        )}
                        <ViewToggle value={view} onChange={setView} />
                    </div>

                    {shown.length === 0 ? (
                        <Card className="rounded-2xl">
                            <EmptyState
                                icon={Inbox}
                                title={otherIncomes.length ? 'No matching income' : 'No income logged yet'}
                                description={otherIncomes.length ? `Nothing for ${dateFilter ? 'that day' : monthFilter === 'all' ? 'these filters' : monthLabel(monthFilter)}. Try another month or clear the filters.` : 'Log sponsorships, door sales and other money that came in outside invoices.'}
                                action={otherIncomes.length
                                    ? (filtersActive && <Button variant="secondary" onClick={clearFilters}><X size={14} /> Clear filters</Button>)
                                    : <Button variant="primary" onClick={() => { resetForm(); setShowAddModal(true); }}><Plus size={14} /> Log income</Button>}
                            />
                        </Card>
                    ) : view === 'cards' ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {shown.map(inc => (
                                <Card key={inc.id} className="flex flex-col rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {statusBadge(inc)}
                                            {inc.category && <Badge tone={CATEGORY_TONE[inc.category] || 'gray'}>{inc.category}</Badge>}
                                        </div>
                                        <span className="shrink-0 text-[12px] text-gray-500">{formatDay(incomeDay(inc)) || '—'}</span>
                                    </div>

                                    <button type="button" onClick={() => openEdit(inc)} className="mt-3 min-w-0 text-left">
                                        <p className="line-clamp-2 text-[17px] font-extrabold leading-snug">{inc.sourceName || 'Untitled'}</p>
                                        {inc.notes && <p className="mt-0.5 line-clamp-2 text-[13px] text-gray-500">{inc.notes}</p>}
                                    </button>

                                    <p className="mt-3 text-[24px] font-extrabold tracking-tight tabular-nums">{formatINR(inc.amount)}</p>

                                    <dl className="mt-2 space-y-1 text-[12px]">
                                        <div className="flex justify-between gap-3">
                                            <dt className="shrink-0 text-gray-500">Received into</dt>
                                            <dd className="min-w-0 truncate text-right font-semibold text-gray-800 dark:text-zinc-200">{accountLabel(inc)}</dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="shrink-0 text-gray-500">Method</dt>
                                            <dd className="min-w-0 truncate text-right font-semibold text-gray-800 dark:text-zinc-200">{inc.paymentMode || '—'}</dd>
                                        </div>
                                    </dl>

                                    {inc.transactionRef && (
                                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/[0.06] bg-black/[0.02] py-1.5 pl-3 pr-1 dark:border-white/[0.06] dark:bg-white/[0.02]">
                                            <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-gray-700 dark:text-zinc-300">{inc.transactionRef}</span>
                                            <button type="button" onClick={() => copyToClipboard(inc.transactionRef)} aria-label="Copy reference" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    )}

                                    <div className="min-h-4 flex-1" />
                                    <div className="flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                        {inc.attachmentUrl ? (
                                            <Button size="sm" as="a" href={inc.attachmentUrl} target="_blank" rel="noopener noreferrer" variant="secondary" className="flex-1"><Eye size={13} /> View proof</Button>
                                        ) : (
                                            <span className="inline-flex flex-1 items-center gap-1 text-[11px] text-gray-400"><AlertTriangle size={12} /> No proof</span>
                                        )}
                                        {!isIncomeReceived(inc) && (
                                            <Button size="sm" variant="success" onClick={() => handleToggleStatus(inc)}><CheckCircle size={13} /> Mark received</Button>
                                        )}
                                        {incomeMenu(inc)}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="overflow-hidden rounded-2xl">
                            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-4 border-b border-black/[0.06] px-5 py-2.5 text-[11px] font-bold text-gray-500 dark:border-white/[0.06] xl:grid">
                                <span>Source</span><span>Received into</span><span>Reference</span><span className="text-right">Amount</span><span className="w-[148px]" />
                            </div>
                            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                {shown.map(inc => (
                                    <li key={inc.id} className="transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 sm:px-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] xl:gap-4">
                                            <button type="button" onClick={() => openEdit(inc)} className="min-w-0 text-left">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate text-[15px] font-bold">{inc.sourceName || 'Untitled'}</span>
                                                    {statusBadge(inc)}
                                                </span>
                                                <span className="mt-0.5 block truncate text-[12px] text-gray-500">
                                                    {[inc.category, formatDay(incomeDay(inc)) || 'No date'].filter(Boolean).join(' · ')}
                                                    <span className="xl:hidden"> · {accountLabel(inc)}</span>
                                                </span>
                                                {inc.notes && <span className="mt-0.5 hidden truncate text-[12px] text-gray-400 xl:block">{inc.notes}</span>}
                                            </button>

                                            <p className="text-right text-[15px] font-extrabold tabular-nums xl:hidden">{formatINR(inc.amount)}</p>

                                            <div className="hidden min-w-0 text-[13px] xl:block">
                                                <p className="truncate">{accountLabel(inc)}</p>
                                                <p className="truncate text-[12px] text-gray-500">{inc.paymentMode || '—'}</p>
                                            </div>
                                            <div className="hidden min-w-0 items-center gap-1 xl:flex">
                                                {inc.transactionRef ? (
                                                    <>
                                                        <span className="min-w-0 truncate font-mono text-[12px]">{inc.transactionRef}</span>
                                                        <button type="button" onClick={() => copyToClipboard(inc.transactionRef)} aria-label="Copy reference" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
                                                            <Copy size={13} />
                                                        </button>
                                                    </>
                                                ) : <span className="text-[12px] text-gray-400">—</span>}
                                            </div>
                                            <p className="hidden text-right text-[14px] font-extrabold tabular-nums xl:block">{formatINR(inc.amount)}</p>

                                            <div className="col-span-2 flex items-center justify-end gap-2 pt-2 xl:col-span-1 xl:w-[148px] xl:pt-0">
                                                {!isIncomeReceived(inc) && (
                                                    <Button size="sm" variant="success" onClick={() => handleToggleStatus(inc)} className="flex-1 sm:flex-none"><CheckCircle size={13} /> Mark received</Button>
                                                )}
                                                {inc.attachmentUrl && (
                                                    <Button size="sm" as="a" href={inc.attachmentUrl} target="_blank" rel="noopener noreferrer" variant="secondary" aria-label="View proof" className="w-9 px-0"><Eye size={14} /></Button>
                                                )}
                                                {incomeMenu(inc)}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    {filteredIncomes.length > limit && (
                        <div className="text-center">
                            <Button variant="ghost" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, filteredIncomes.length - limit)} more of {filteredIncomes.length - limit}</Button>
                        </div>
                    )}
                </div>
            </AdminCommunityHubLayout>

            <ConfirmDialog
                open={!!deletingIncome}
                onClose={() => setDeletingIncome(null)}
                title="Delete this income entry?"
                body={deletingIncome ? `${deletingIncome.sourceName || 'This entry'} for ${formatINR(deletingIncome.amount)} will be removed from the ledger. This can't be undone.` : ''}
                confirmLabel="Delete entry"
                onConfirm={confirmDeleteIncome}
            />

            {/* Add income */}
            <Sheet
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                size="lg"
                title="Log income"
                subtitle="Money that came in outside invoices, like sponsorships or door sales."
                footer={renderIncomeFooter(false)}
            >
                {renderIncomeForm(false)}
            </Sheet>

            {/* Edit income */}
            <Sheet
                open={!!showEditModal}
                onClose={() => setShowEditModal(null)}
                size="lg"
                title="Edit income"
                subtitle={showEditModal?.sourceName || 'Update this income entry.'}
                footer={renderIncomeFooter(true)}
            >
                {renderIncomeForm(true)}
            </Sheet>
        </>
    );
};

export default OtherIncomeManagement;
