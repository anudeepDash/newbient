import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import Printer from 'lucide-react/dist/esm/icons/printer';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
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
import Award from 'lucide-react/dist/esm/icons/award';
import Layers from 'lucide-react/dist/esm/icons/layers';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Check from 'lucide-react/dist/esm/icons/check';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Info from 'lucide-react/dist/esm/icons/info';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Send from 'lucide-react/dist/esm/icons/send';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import ReceiptEmailModal from '../../components/admin/ReceiptEmailModal';

import ExportMenu from '../../components/admin/ExportMenu';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import Sheet from '../../components/admin/Sheet';
import { Card, Button, Badge, StatTile, SearchInput, Select, SegmentedTabs, EmptyState, Menu, MenuItem, ViewToggle, useViewMode } from '../../components/admin/ui';
import { inr } from '../../components/admin/ticketing/format';
import { Field, Section, Choice, fieldCls, areaCls } from '../../components/admin/uploads/UploadKit';
import ConfirmDialog from '../../components/admin/finance/ConfirmDialog';
import { FINANCE_TABS, spendDay, todayIST, monthLabel, formatDay, isSpendPaid, isSpendPending, spendPayee } from '../../components/admin/finance/money';
import ThemedSelect from '../../components/admin/ThemedSelect';

const PAYOUT_TYPES = ['Salary', 'Volunteer Payout', 'Vendor Payout', 'Artist Fee', 'General Expense'];
const TYPE_LABEL = { 'Salary': 'Salary', 'Volunteer Payout': 'Volunteer payout', 'Vendor Payout': 'Vendor payout', 'Artist Fee': 'Artist fee', 'General Expense': 'General expense' };
const TYPE_TONE = { 'Salary': 'violet', 'Volunteer Payout': 'blue', 'Vendor Payout': 'orange', 'Artist Fee': 'pink', 'General Expense': 'gray' };
const PAGE = 30;
const KPI_CLS = 'w-[78%] shrink-0 snap-start sm:w-auto';

// ---------- Small form pieces used by the sheets below ----------

// Pill buttons for short lists (payout type, payment method).
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

const NativeSelect = ({ className, children, ...rest }) => (
    <ThemedSelect className={cn(fieldCls, className)} {...rest}>
        {children}
    </ThemedSelect>
);

const isImageUrl = (url = '') => /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url) || (/\/image\/upload\//.test(url) && !/\.pdf(\?|$)/i.test(url));

// Pick a file and upload it straight away (same upload as before); shows what's attached.
const AttachmentField = ({ url, uploading, onPick, onRemove, label = 'Attach a file', sub = 'Screenshot, photo or PDF' }) => {
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

// Read-only label / value list.
const DetailList = ({ children, className }) => (
    <div className={cn('divide-y divide-black/[0.06] rounded-2xl border border-black/[0.08] px-4 dark:divide-white/[0.06] dark:border-white/[0.08]', className)}>
        {children}
    </div>
);

const DetailRow = ({ label, children, mono, onCopy }) => (
    <div className="flex items-center justify-between gap-4 py-2.5">
        <span className="min-w-[30%] break-words text-[13px] text-gray-500">{label}</span>
        <span className="flex min-w-0 items-center gap-1.5">
            <span className={cn('min-w-0 break-words text-right text-[13px] font-semibold', mono && 'break-all font-mono')}>{children}</span>
            {onCopy && (
                <button type="button" onClick={onCopy} aria-label={`Copy ${label}`} className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
                    <Copy size={14} />
                </button>
            )}
        </span>
    </div>
);

// A spend's date is usually a bare "YYYY-MM-DD"; show it as that day, not midnight UTC in IST.
const slipDate = (value) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const formatINR = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

// 'PENDING' and 'OFFLINE' are placeholders, not real payment references.
const hasRealRef = (sp) => Boolean(sp?.paymentRef) && sp.paymentRef !== 'PENDING' && sp.paymentRef !== 'OFFLINE';

// Where a UPI ID is stored as "UPI: name@bank" or just "name@bank".
const upiFrom = (dest = '') => (dest.includes('UPI:') ? dest.split('UPI:')[1].trim() : dest);

const SpendsManagement = () => {
    useStoreSubscription(['spends', 'financePayees', 'invoices', 'upcomingEvents']);
    const { spends, addSpend, updateSpend, deleteSpend, uploadToCloudinary, user, financePayees, invoices, upcomingEvents, addUpcomingEvent } = useStore();
    
    // Filters live in the URL so a filtered view can be shared or reloaded.
    // No month in the URL means this month (IST), as before; "all" means all time.
    // Months are "YYYY-MM" and follow the payout date, the same as the Finance board.
    const [params, setParams] = useSearchParams();
    const currentMonth = todayIST().slice(0, 7);
    const [searchTerm, setSearchTerm] = useState(() => params.get('q') || '');
    const monthFilter = params.get('month') === 'all' ? 'all' : (/^\d{4}-\d{2}$/.test(params.get('month') || '') ? params.get('month') : currentMonth);
    const payoutTypeFilter = PAYOUT_TYPES.includes(params.get('type')) ? params.get('type') : 'All';
    const statusFilter = ['Paid', 'Pending'].includes(params.get('status')) ? params.get('status') : 'All';
    const accountFilter = ['newbi', 'personal'].includes(params.get('account')) ? params.get('account') : 'All';
    const [view, setView] = useViewMode('spends', 'cards');
    const [limit, setLimit] = useState(PAGE);

    const setFilter = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        setParams(next, { replace: true });
        setLimit(PAGE);
    };
    const setMonth = (value) => setFilter('month', value === currentMonth ? null : value);
    const setStatusFilter = (value) => setFilter('status', value === 'All' ? null : value);
    const filtersActive = Boolean(searchTerm || params.get('month') || payoutTypeFilter !== 'All' || statusFilter !== 'All' || accountFilter !== 'All');
    const clearFilters = () => {
        setSearchTerm('');
        const next = new URLSearchParams(params);
        ['q', 'month', 'type', 'status', 'account'].forEach(k => next.delete(k));
        setParams(next, { replace: true });
        setLimit(PAGE);
    };

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const [savingSpend, setSavingSpend] = useState(false);
    const [deletingSpend, setDeletingSpend] = useState(null);

    // Form fields
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [payoutType, setPayoutType] = useState('Salary'); // Salary, Volunteer Payout, Vendor Payout, Artist Fee, General Expense
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountType, setAccountType] = useState('newbi'); // newbi vs personal
    const [paymentMode, setPaymentMode] = useState('UPI'); // UPI, Bank Transfer, Cash, Card, Other
    const [status, setStatus] = useState('Paid'); // Paid vs Pending
    const statusValue = status;
    const [notes, setNotes] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');

    // Dynamic Extra Payout Fields
    const [receiverName, setReceiverName] = useState(''); // Recipient / core member name / artist / volunteer / vendor
    const [paidByName, setPaidByName] = useState(''); // Team member who paid from a personal account (saved as paidBy)
    const [designation, setDesignation] = useState(''); // For Salaries
    const [salaryPeriod, setSalaryPeriod] = useState(''); // Month/Period (e.g. May 2026)
    const [volunteerPhone, setVolunteerPhone] = useState(''); // For volunteers
    const [linkedGig, setLinkedGig] = useState(''); // Linked event/volunteer gig reference
    const [paidTo, setPaidTo] = useState(''); // Vendor Name / payee name
    const [invoiceRef, setInvoiceRef] = useState(''); // Vendor invoice reference
    const [destinationDetails, setDestinationDetails] = useState(''); // UPI ID, bank account details

    // Linked Invoice Fields
    const [linkedInvoiceId, setLinkedInvoiceId] = useState('');
    const [linkedInvoiceNumber, setLinkedInvoiceNumber] = useState('');

    // Printer Modal states
    const [showPrinterModal, setShowPrinterModal] = useState(false);
    const [activeSlipData, setActiveSlipData] = useState(null);
    const [printerStage, setPrinterStage] = useState('verify'); // 'verify' | 'printing' | 'done'
    const [verificationUTR, setVerificationUTR] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [verificationReceiptUrl, setVerificationReceiptUrl] = useState('');
    const [slipBusy, setSlipBusy] = useState(false);

    // Email Receipt Modal
    const [showEmailModal, setShowEmailModal] = useState(false);

    // Pay Now UPI flow inside Log Spend modal
    const [showUPIFlow, setShowUPIFlow] = useState(false);
    const [customUTR, setCustomUTR] = useState('');

    // Bulk Event Payout states
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedBulkEvent, setSelectedBulkEvent] = useState('');
    const [bulkVolunteers, setBulkVolunteers] = useState([]);
    const [selectedVolunteerIds, setSelectedVolunteerIds] = useState([]);
    const [bulkPayoutAmount, setBulkPayoutAmount] = useState('500');
    const [bulkPaymentMode, setBulkPaymentMode] = useState('UPI');
    const [bulkAccountType, setBulkAccountType] = useState('newbi');
    const [bulkLinkedInvoiceId, setBulkLinkedInvoiceId] = useState('');
    const [bulkLinkedInvoiceNumber, setBulkLinkedInvoiceNumber] = useState('');
    const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkNotes, setBulkNotes] = useState('');
    const [bulkStep, setBulkStep] = useState(1);
    const [upiPayIndex, setUpiPayIndex] = useState(0);
    const [completedPayments, setCompletedPayments] = useState({});
    const [bulkNewEventName, setBulkNewEventName] = useState('');

    // Filter registered volunteers based on selected bulk event gig
    useEffect(() => {
        if (selectedBulkEvent) {
            const vols = financePayees.filter(p => p.type === 'Volunteer' && p.linkedGig === selectedBulkEvent);
            setBulkVolunteers(vols.map(v => ({ ...v, amount: bulkPayoutAmount })));
            setSelectedVolunteerIds(vols.map(v => v.id));
        } else {
            setBulkVolunteers([]);
            setSelectedVolunteerIds([]);
        }
    }, [selectedBulkEvent, financePayees]);

    // Update individual amounts if default bulk payout amount changes
    useEffect(() => {
        setBulkVolunteers(prev => prev.map(v => ({ ...v, amount: bulkPayoutAmount })));
    }, [bulkPayoutAmount]);

    const resetBulkForm = () => {
        setSelectedBulkEvent('');
        setBulkVolunteers([]);
        setSelectedVolunteerIds([]);
        setBulkPayoutAmount('500');
        setBulkPaymentMode('UPI');
        setBulkAccountType('newbi');
        setBulkLinkedInvoiceId('');
        setBulkLinkedInvoiceNumber('');
        setBulkDate(new Date().toISOString().split('T')[0]);
        setBulkNotes('');
        setBulkStep(1);
        setUpiPayIndex(0);
        setCompletedPayments({});
        setBulkNewEventName('');
    };

    const handleUpiPayClick = async () => {
        if (!activeSlipData) return;
        
        // Keep a reference that's already saved; otherwise make one.
        const autoTxnId = activeSlipData.reference || `UPI-TXN-${Date.now()}`;
        setVerificationUTR(autoTxnId);
        
        // Update status in the database to Paid (cleared)
        if (activeSlipData.id) {
            setSlipBusy(true);
            try {
                await updateSpend(activeSlipData.id, {
                    paymentRef: autoTxnId,
                    status: 'Paid'
                });
                setActiveSlipData(prev => ({ 
                    ...prev, 
                    reference: autoTxnId, 
                    status: 'Paid' 
                }));
                useStore.getState().addToast('Payment marked as paid via UPI.', 'success');
            } catch (e) {
                console.error("Error updating upi spend status: ", e);
                useStore.getState().addToast("Couldn't mark it as paid. Please try again.", 'error');
                return;
            } finally {
                setSlipBusy(false);
            }
        }
        
        // Trigger UPI app intent (using window.open)
        const pa = activeSlipData.destinationDetails ? activeSlipData.destinationDetails.replace('UPI:', '').trim() : '';
        const upiUrl = `upi://pay?pa=${pa}&pn=${encodeURIComponent(activeSlipData.receiverName)}&am=${activeSlipData.amount}&cu=INR`;
        window.open(upiUrl, '_self');
        
        // Go straight to the printing stage
        setPrinterStage('printing');
    };

    const handleViewReceiptSlip = (spend) => {
        // 'PENDING' / 'OFFLINE' are placeholders, not real references. A pending payout must not
        // carry 'PENDING' into the UTR box, or marking it paid would save that as its reference.
        const realRef = spend.paymentRef && spend.paymentRef !== 'OFFLINE' && spend.paymentRef !== 'PENDING' ? spend.paymentRef : '';
        const slip = {
            id: spend.id || '',
            date: slipDate(spend.date),
            reference: realRef || (isSpendPaid(spend) ? (spend.id || 'N/A') : ''),
            payoutType: spend.payoutType || 'Expense',
            receiverName: spend.receiverName || spend.paidTo || 'N/A',
            paymentMode: spend.paymentMode || 'N/A',
            destinationDetails: spend.destinationDetails || '',
            amount: spend.amount,
            linkedGig: spend.linkedGig || '',
            isBulk: spend.isBulk || false,
            volunteers: spend.volunteers || null,
            status: spend.status || 'Paid',
            receiptUrl: spend.receiptUrl || ''
        };
        setActiveSlipData(slip);
        setVerificationUTR(realRef && !realRef.startsWith('TXN-') && !realRef.startsWith('BULK-') ? realRef : '');
        setShowQR(false);
        setVerificationReceiptUrl(spend.receiptUrl || '');
        if (isSpendPaid(spend)) {
            setPrinterStage('printing');
        } else {
            setPrinterStage('verify');
        }
        setShowPrinterModal(true);
    };

    const getBankDetails = () => {
        if (!activeSlipData) return null;
        const payee = financePayees.find(p => p.name === activeSlipData.receiverName);
        if (payee?.bankDetails) {
            return payee.bankDetails;
        }
        const dest = activeSlipData.destinationDetails || '';
        if (dest.includes('Bank:') || dest.includes('A/C:') || dest.includes('IFSC:')) {
            const parts = dest.split('|').map(p => p.trim());
            const bankName = parts.find(p => p.startsWith('Bank:'))?.replace('Bank:', '')?.trim() || 'N/A';
            const accountNumber = parts.find(p => p.includes('A/C:'))?.replace('A/C:', '')?.trim() || 'N/A';
            const ifscCode = parts.find(p => p.includes('IFSC:'))?.replace('IFSC:', '')?.trim() || 'N/A';
            return { bankName, accountNumber, ifscCode };
        }
        return null;
    };

    // "Paid, no reference": same as the old Skip UTR button.
    const handleSkipReference = async () => {
        const autoTxnId = activeSlipData.reference || `TXN-SKIPPED-${Date.now()}`;
        if (activeSlipData.id) {
            setSlipBusy(true);
            try {
                const updateData = {
                    paymentRef: autoTxnId,
                    status: 'Paid'
                };
                if (verificationReceiptUrl) updateData.receiptUrl = verificationReceiptUrl;
                await updateSpend(activeSlipData.id, updateData);
                setActiveSlipData(prev => ({ ...prev, reference: autoTxnId, status: 'Paid', receiptUrl: verificationReceiptUrl || prev.receiptUrl, proofUrl: verificationReceiptUrl || prev.receiptUrl }));
                useStore.getState().addToast('Payment marked as paid.', 'success');
            } catch (e) {
                console.error(e);
                useStore.getState().addToast("Couldn't mark it as paid. Please try again.", 'error');
                return;
            } finally {
                setSlipBusy(false);
            }
        } else {
            setActiveSlipData(prev => ({ ...prev, reference: autoTxnId, status: 'Paid', receiptUrl: verificationReceiptUrl || prev.receiptUrl, proofUrl: verificationReceiptUrl || prev.receiptUrl }));
        }
        setPrinterStage('printing');
    };

    // "Mark paid and print" / "Print receipt": same as the old Verify & Print / Print Receipt buttons.
    const handleConfirmSlip = async (successMessage) => {
        if (activeSlipData.id) {
            setSlipBusy(true);
            try {
                const utrValue = verificationUTR || activeSlipData.reference || `TXN-AUTO-${Date.now()}`;
                const updateData = {
                    paymentRef: utrValue,
                    status: 'Paid'
                };
                if (verificationReceiptUrl) updateData.receiptUrl = verificationReceiptUrl;
                await updateSpend(activeSlipData.id, updateData);
                setActiveSlipData(prev => ({ ...prev, reference: utrValue, status: 'Paid', receiptUrl: verificationReceiptUrl || prev.receiptUrl, proofUrl: verificationReceiptUrl || prev.receiptUrl }));
                if (verificationUTR) {
                    useStore.getState().addToast(successMessage, 'success');
                }
            } catch (e) {
                console.error(e);
                useStore.getState().addToast("Couldn't save the payment details. Please try again.", 'error');
                return;
            } finally {
                setSlipBusy(false);
            }
        }
        setPrinterStage('printing');
    };

    const handleCopy = (text, label) => {
        navigator.clipboard.writeText(text);
        useStore.getState().addToast(`${label} copied.`, 'success');
    };

    // The slot the receipt slides out of.
    const renderPrinterSlot = (statusText, busy) => (
        <div className="relative z-30 w-[284px] max-w-full select-none">
            <div className="flex items-center justify-between px-1 pb-2 text-[12px] font-semibold text-gray-500">
                <span>Newbi payout receipt</span>
                <span className="inline-flex items-center gap-1.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full', busy ? 'animate-pulse bg-amber-500' : 'bg-emerald-500')} />
                    {statusText}
                </span>
            </div>
            <div className="h-3 rounded-full bg-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] ring-1 ring-black/10 dark:bg-black dark:ring-white/10" />
        </div>
    );

    const renderThermalReceipt = (data, utrVal) => {
        if (!data) return null;
        const finalUTR = utrVal || data.reference || 'N/A';
        
        return (
            <div 
                id="thermal-receipt-body"
                className="w-[260px] bg-transparent text-white flex flex-col relative select-none"
                style={{
                    fontFamily: "Outfit, Inter, system-ui, sans-serif"
                }}
            >
                {/* Top Header Card */}
                <div className="bg-gradient-to-br from-[#06120a] via-[#0b2416] to-[#070b09] p-4 text-center text-white rounded-t-none relative overflow-hidden border-b border-[#39ff14]/25">
                    <img 
                        src="/logo_full.png" 
                        alt="Newbi Logo" 
                        className="h-5 object-contain mx-auto mb-1.5 filter brightness-0 invert"
                    />
                    <p className="text-[7px] font-black uppercase tracking-[0.3em] text-[#39ff14]">Disbursement Voucher</p>
                    <h4 className="text-xl font-black tracking-tight text-white mt-1.5 mb-0.5 drop-shadow-[0_2px_8px_rgba(57,255,20,0.35)]">
                        ₹{Number(data.amount).toLocaleString('en-IN')}
                    </h4>
                    <p className="text-[7px] font-mono text-white/70 tracking-wider">REF: {finalUTR}</p>
                </div>

                {/* Details Card Body */}
                <div className="bg-[#070b09] text-white px-5 pt-3 pb-2 flex flex-col relative border-x border-[#39ff14]/10">
                    <div className="space-y-2 text-[9px] uppercase font-bold text-zinc-300">
                        <div className="flex justify-between items-center py-0.5">
                            <span className="text-gray-500 font-extrabold text-[7.5px] tracking-wider">Date</span>
                            <span className="text-white font-bold">{data.date}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-t border-white/5 pt-1.5">
                            <span className="text-gray-500 font-extrabold text-[7.5px] tracking-wider">Payee</span>
                            <span className="text-[#39ff14] font-bold">{data.receiverName}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-t border-white/5 pt-1.5">
                            <span className="text-gray-500 font-extrabold text-[7.5px] tracking-wider">Method</span>
                            <span className="text-[#39ff14] font-bold border border-[#39ff14]/20 bg-[#39ff14]/5 px-1.5 py-0.5 rounded text-[7.5px]">
                                {data.paymentMode}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-t border-white/5 pt-1.5 font-mono">
                            <span className="text-gray-500 font-extrabold text-[7.5px] tracking-wider font-sans uppercase">Txn ID / UTR</span>
                            <span className="text-white font-bold select-all tracking-normal text-right truncate max-w-[140px]">{finalUTR}</span>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-[#39ff14]/20 my-2.5" />

                    {/* Verification QR Code pointing to functional verification URL */}
                    <div className="flex flex-col items-center justify-center p-1.5 bg-white rounded-xl border border-white/10 w-fit mx-auto shadow-inner mb-2.5">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&color=020202&data=${encodeURIComponent(
                                `https://newbi.live/verify-payout?ref=${finalUTR}&amt=${data.amount}&payee=${encodeURIComponent(data.receiverName)}&date=${encodeURIComponent(data.date)}&mode=${encodeURIComponent(data.paymentMode)}${(data.receiptUrl || data.proofUrl) ? `&proof=${encodeURIComponent(data.receiptUrl || data.proofUrl)}` : ''}`
                            )}`}
                            alt="Verification QR"
                            className="w-12 h-12 rounded-md"
                        />
                    </div>

                    {/* Glowing Verified Banner */}
                    <div className="text-center font-black text-[8px] tracking-[0.2em] text-[#39ff14] border border-[#39ff14]/30 bg-[#39ff14]/5 p-1.5 rounded-lg uppercase shadow-[0_0_12px_rgba(57,255,20,0.1)]">
                        ★ Verified & Paid ★
                    </div>
                </div>

                {/* Jagged Saw-tooth Bottom Edge SVG with Neon Glow */}
                <div className="w-full h-4 -mt-px select-none" style={{ filter: 'drop-shadow(0 1.5px 3px rgba(57,255,20,0.25))' }}>
                    <svg viewBox="0 0 300 14" preserveAspectRatio="none" className="w-full h-full block">
                        {/* Solid fill of the paper body extending into teeth */}
                        <path d="M 0 0 L 300 0 L 300 14 L 295 5 L 290 14 L 285 5 L 280 14 L 275 5 L 270 14 L 265 5 L 260 14 L 255 5 L 250 14 L 245 5 L 240 14 L 235 5 L 230 14 L 225 5 L 220 14 L 215 5 L 210 14 L 205 5 L 200 14 L 195 5 L 190 14 L 185 5 L 180 14 L 175 5 L 170 14 L 165 5 L 160 14 L 155 5 L 150 14 L 145 5 L 140 14 L 135 5 L 130 14 L 125 5 L 120 14 L 115 5 L 110 14 L 105 5 L 100 14 L 95 5 L 90 14 L 85 5 L 80 14 L 75 5 L 70 14 L 65 5 L 60 14 L 55 5 L 50 14 L 45 5 L 40 14 L 35 5 L 30 14 L 25 5 L 20 14 L 15 5 L 10 14 L 5 5 L 0 14 Z" fill="#070b09" />
                        {/* Glowing neon-green stroke on the jagged edge only */}
                        <path d="M 300 14 L 295 5 L 290 14 L 285 5 L 280 14 L 275 5 L 270 14 L 265 5 L 260 14 L 255 5 L 250 14 L 245 5 L 240 14 L 235 5 L 230 14 L 225 5 L 220 14 L 215 5 L 210 14 L 205 5 L 200 14 L 195 5 L 190 14 L 185 5 L 180 14 L 175 5 L 170 14 L 165 5 L 160 14 L 155 5 L 150 14 L 145 5 L 140 14 L 135 5 L 130 14 L 125 5 L 120 14 L 115 5 L 110 14 L 105 5 L 100 14 L 95 5 L 90 14 L 85 5 L 80 14 L 75 5 L 70 14 L 65 5 L 60 14 L 55 5 L 50 14 L 45 5 L 40 14 L 35 5 L 30 14 L 25 5 L 20 14 L 15 5 L 10 14 L 5 5 L 0 14" fill="none" stroke="#39ff14" strokeWidth="1" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
        );
    };

    const handleDownloadReceipt = async () => {
        const receiptElement = document.getElementById('thermal-receipt-body');
        if (!receiptElement) return;

        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(receiptElement, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true
            });
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `newbi_receipt_${activeSlipData?.reference || 'payout'}.png`;
            link.href = imgData;
            link.click();
            useStore.getState().addToast('Receipt downloaded.', 'success');
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("Couldn't download the receipt. Please try again.", 'error');
        }
    };

    const handleShareReceiptText = async () => {
        if (!activeSlipData) return;
        
        const verifyUrl = `${window.location.origin}/verify-payout?ref=${encodeURIComponent(activeSlipData.reference || 'N/A')}&amt=${activeSlipData.amount}&payee=${encodeURIComponent(activeSlipData.receiverName)}${(activeSlipData.receiptUrl || activeSlipData.proofUrl) ? `&proof=${encodeURIComponent(activeSlipData.receiptUrl || activeSlipData.proofUrl)}` : ''}`;
        
        const message = `*NEWBI ENTERTAINMENT — PAYOUT RECEIPT*\n\n💰 Amount: ₹${Number(activeSlipData.amount).toLocaleString('en-IN')}\n👤 Payee: ${activeSlipData.receiverName}\n📋 Ref: ${activeSlipData.reference || 'N/A'}\n📅 Date: ${activeSlipData.date}\n✅ Status: VERIFIED & PAID\n\n🔗 Verify this payment:\n${verifyUrl}\n\n— Newbi Entertainment Pvt. Ltd.`;

        // Try to share with receipt PNG via Web Share API
        const receiptElement = document.getElementById('thermal-receipt-body');
        if (receiptElement && navigator.canShare) {
            try {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(receiptElement, {
                    backgroundColor: '#070b09',
                    scale: 2,
                    logging: false,
                    useCORS: true
                });
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const file = new File([blob], `newbi_receipt_${activeSlipData.reference || 'payout'}.png`, { type: 'image/png' });
                
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Newbi Payout Receipt',
                        text: message,
                        files: [file]
                    });
                    return;
                }
            } catch (err) {
                if (err.name !== 'AbortError') console.error('Share failed:', err);
            }
        }
        
        // Fallback: text share or copy
        if (navigator.share) {
            navigator.share({
                title: 'Newbi Payout Receipt',
                text: message,
                url: verifyUrl
            }).catch(() => copyToClipboard(message));
        } else {
            copyToClipboard(message);
        }
    };

    const handleWhatsAppShare = () => {
        if (!activeSlipData) return;
        const verifyUrl = `${window.location.origin}/verify-payout?ref=${encodeURIComponent(activeSlipData.reference || 'N/A')}&amt=${activeSlipData.amount}&payee=${encodeURIComponent(activeSlipData.receiverName)}${(activeSlipData.receiptUrl || activeSlipData.proofUrl) ? `&proof=${encodeURIComponent(activeSlipData.receiptUrl || activeSlipData.proofUrl)}` : ''}`;
        const message = `*NEWBI ENTERTAINMENT — PAYOUT RECEIPT*\n\n💰 Amount: ₹${Number(activeSlipData.amount).toLocaleString('en-IN')}\n👤 Payee: ${activeSlipData.receiverName}\n📋 Ref: ${activeSlipData.reference || 'N/A'}\n📅 Date: ${activeSlipData.date}\n✅ Status: VERIFIED & PAID\n\n🔗 Verify: ${verifyUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleSendReceiptEmail = async ({ to, cc, bcc, subject, html }) => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
            const response = await fetch('/api/mail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    to,
                    cc,
                    bcc,
                    subject,
                    html,
                    fromName: 'Newbi Finance',
                    fromEmail: 'partnership@newbi.live'
                }),
            });
            const result = await response.json();
            if (result.success) {
                useStore.getState().addToast('Receipt emailed.', 'success');
            } else {
                throw new Error(result.error || 'Failed to send email');
            }
        } catch (err) {
            console.error('Send receipt email failed:', err);
            useStore.getState().addToast("Couldn't send the email. Please try again.", 'error');
            throw err;
        }
    };

    const financeTabs = FINANCE_TABS;
    const payoutTypes = PAYOUT_TYPES;
    const paymentModes = ['UPI', 'Bank Transfer', 'Cash', 'Card', 'Other'];

    // Months that have payouts, newest first ("YYYY-MM").
    const monthOptions = useMemo(() => {
        const months = new Set([currentMonth]);
        if (monthFilter !== 'all') months.add(monthFilter);
        spends.forEach(sp => {
            const key = spendDay(sp).slice(0, 7);
            if (key) months.add(key);
        });
        return [...months].sort().reverse();
    }, [spends, currentMonth, monthFilter]);

    // Filtering logic (status is applied last so the status tabs can show counts)
    const spendsBeforeStatus = spends.filter(sp => {
        const matchesSearch = 
            sp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sp.receiverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sp.paidTo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sp.paidBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sp.linkedInvoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesMonth = monthFilter === 'all' ? true : spendDay(sp).slice(0, 7) === monthFilter;
        
        const matchesPayoutType = payoutTypeFilter === 'All' ? true : (sp.payoutType || 'General Expense') === payoutTypeFilter;
        const matchesAccount = accountFilter === 'All' ? true : sp.accountType === accountFilter;

        return matchesSearch && matchesMonth && matchesPayoutType && matchesAccount;
    });
    const filteredSpends = statusFilter === 'All' ? spendsBeforeStatus : spendsBeforeStatus.filter(sp => (statusFilter === 'Paid' ? isSpendPaid(sp) : isSpendPending(sp)));
    const statusCounts = {
        All: spendsBeforeStatus.length,
        Paid: spendsBeforeStatus.filter(isSpendPaid).length,
        Pending: spendsBeforeStatus.filter(isSpendPending).length,
    };

    // Compute stats for current selection
    const stats = useMemo(() => {
        const cleared = filteredSpends.filter(isSpendPaid);
        const pending = filteredSpends.filter(isSpendPending);
        const totalCleared = cleared.reduce((sum, s) => sum + Number(s.amount || 0), 0);
        const totalPending = pending.reduce((sum, s) => sum + Number(s.amount || 0), 0);
        const avgOutlay = filteredSpends.length > 0 
            ? (filteredSpends.reduce((sum, s) => sum + Number(s.amount || 0), 0) / filteredSpends.length) 
            : 0;

        // Top Category
        const catSums = {};
        filteredSpends.forEach(s => {
            const type = s.payoutType || 'General Expense';
            catSums[type] = (catSums[type] || 0) + Number(s.amount || 0);
        });
        let topCat = 'None';
        let maxCatVal = 0;
        Object.entries(catSums).forEach(([cat, val]) => {
            if (val > maxCatVal) {
                maxCatVal = val;
                topCat = cat;
            }
        });

        return {
            totalCleared,
            totalPending,
            avgOutlay,
            topCat,
            maxCatVal,
            countCleared: cleared.length,
            countPending: pending.length
        };
    }, [filteredSpends]);

    // Central uploader helper
    const handleReceiptUpload = async (e, setUrl) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingReceipt(true);
        try {
            const url = await uploadToCloudinary(file);
            setUrl(url);
            useStore.getState().addToast('Receipt uploaded.', 'success');
        } catch (err) {
            useStore.getState().addToast("Couldn't upload the receipt. Please try again.", 'error');
        } finally {
            setUploadingReceipt(false);
        }
    };

    // Copy to clipboard helper
    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        useStore.getState().addToast('Payout details copied.', 'success');
    };

    // Create Spend submission
    // forcedStatus: the UPI "confirm" button saves as Paid without waiting for a re-render.
    const handleCreateSpend = async (e, forcedStatus) => {
        if (e && e.preventDefault) e.preventDefault();
        const status = forcedStatus || statusValue;
        
        if (!title || !amount || !date) {
            useStore.getState().addToast('Add a title, amount and date before saving.', 'error');
            return;
        }
        if (savingSpend) return;
        setSavingSpend(true);

        try {
            const newSpendRef = status === 'Paid' ? (customUTR?.trim() || `TXN-${Date.now().toString().slice(-6)}`) : 'PENDING';
            
            const spendData = {
                title,
                amount: Number(amount),
                payoutType,
                date,
                accountType,
                paymentMode,
                status,
                notes,
                receiptUrl,
                receiverName: payoutType === 'Salary' || payoutType === 'Volunteer Payout' || payoutType === 'Artist Fee' || payoutType === 'General Expense' ? receiverName : paidTo,
                paidTo: payoutType === 'Vendor Payout' || payoutType === 'General Expense' ? paidTo : receiverName,
                paidBy: accountType === 'personal' ? (paidByName.trim() || 'Team Member') : 'Newbi Core',
                designation: payoutType === 'Salary' || payoutType === 'General Expense' ? designation : '',
                salaryPeriod: payoutType === 'Salary' ? salaryPeriod : '',
                volunteerPhone: payoutType === 'Volunteer Payout' ? volunteerPhone : '',
                linkedGig: payoutType === 'Volunteer Payout' || payoutType === 'Artist Fee' ? linkedGig : '',
                invoiceRef: payoutType === 'Vendor Payout' ? invoiceRef : '',
                destinationDetails,
                linkedInvoiceId: payoutType === 'Volunteer Payout' ? linkedInvoiceId : '',
                linkedInvoiceNumber: payoutType === 'Volunteer Payout' ? linkedInvoiceNumber : '',
                paymentRef: newSpendRef,
                createdAt: new Date().toISOString()
            };

            await addSpend(spendData);

            useStore.getState().addToast('Spend added.', 'success');
            setShowAddModal(false);
            
            // Only trigger receipt printer if status is Paid
            if (status === 'Paid') {
                const slip = {
                    date: slipDate(date),
                    reference: newSpendRef,
                    payoutType,
                    receiverName: spendData.receiverName,
                    paymentMode,
                    destinationDetails,
                    amount: Number(amount),
                    linkedGig: spendData.linkedGig,
                    isBulk: false,
                    receiptUrl: receiptUrl || ''
                };
                setActiveSlipData(slip);
                setPrinterStage('verify');
                setVerificationUTR('');
                setVerificationReceiptUrl('');
                setShowQR(false);
                setShowPrinterModal(true);
            }

            resetForm();
            setCustomUTR('');
            setShowUPIFlow(false);
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("Couldn't save the spend. Please try again.", 'error');
        } finally {
            setSavingSpend(false);
        }
    };

    // Create Bulk Event Payout submission
    const handleCreateBulkPayout = async () => {
        if (!selectedBulkEvent || selectedVolunteerIds.length === 0) {
            useStore.getState().addToast('Choose an event and at least one volunteer first.', 'error');
            return;
        }
        if (savingSpend) return;
        setSavingSpend(true);

        try {
            const bulkTransactionId = `BULK-${Date.now()}`;

            // Get selected volunteers with their custom amounts
            const targets = bulkVolunteers.filter(v => selectedVolunteerIds.includes(v.id));
            const badAmounts = targets.filter(v => !(Number(v.amount || bulkPayoutAmount) > 0));
            if (badAmounts.length) {
                useStore.getState().addToast(`Enter an amount above ₹0 for ${badAmounts.map(v => v.name).join(', ')}.`, 'error');
                return;
            }

            const records = targets.map(vol => ({
                title: `Volunteer Payout: ${selectedBulkEvent}`,
                amount: Number(vol.amount || bulkPayoutAmount),
                payoutType: 'Volunteer Payout',
                date: bulkDate,
                accountType: bulkAccountType,
                paymentMode: bulkPaymentMode,
                status: 'Paid',
                notes: bulkNotes || `Bulk event payout clearance.`,
                receiverName: vol.name,
                paidTo: vol.name,
                paidBy: bulkAccountType === 'personal' ? 'Team Member' : 'Newbi Core',
                volunteerPhone: vol.phone || '',
                linkedGig: selectedBulkEvent,
                destinationDetails: vol.destinationDetails || `UPI: ${vol.upiId || ''}`,
                linkedInvoiceId: bulkLinkedInvoiceId || '',
                linkedInvoiceNumber: bulkLinkedInvoiceNumber || '',
                paymentRef: bulkTransactionId,
                createdAt: new Date().toISOString()
            }));

            // Saved together: either every payout is logged or none are, so a retry can't duplicate.
            await useStore.getState().addSpendsBatch(records);

            useStore.getState().addToast(`${targets.length} volunteer payouts logged.`, 'success');
            
            // Set slip data to trigger receipt printer for the bulk txn
            const bulkSlip = {
                date: new Date().toLocaleString(),
                reference: bulkTransactionId,
                payoutType: 'Volunteer Payout',
                receiverName: `${targets.length} Volunteers (${selectedBulkEvent})`,
                paymentMode: bulkPaymentMode,
                destinationDetails: `${targets.length} cleared records`,
                amount: targets.reduce((sum, v) => sum + Number(v.amount || bulkPayoutAmount), 0),
                linkedGig: selectedBulkEvent,
                isBulk: true,
                volunteers: targets.map(t => ({ name: t.name, amount: Number(t.amount || bulkPayoutAmount) }))
            };
            
            setActiveSlipData(bulkSlip);
            setPrinterStage('verify');
            setVerificationUTR('');
            setVerificationReceiptUrl('');
            setShowQR(false);
            setShowPrinterModal(true);
            setShowBulkModal(false);
            resetBulkForm();
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("Couldn't log the volunteer payouts. Nothing was saved, so it's safe to try again.", 'error');
        } finally {
            setSavingSpend(false);
        }
    };

    // Update Spend submission
    const handleUpdateSpend = async (e) => {
        e.preventDefault();
        if (!title || !amount || !date) {
            useStore.getState().addToast('Add a title, amount and date before saving.', 'error');
            return;
        }
        if (savingSpend) return;
        setSavingSpend(true);

        try {
            // A saved reference is kept, also when the payout goes back to pending.
            const savedRef = hasRealRef(showEditModal) ? showEditModal.paymentRef : '';
            const newSpendRef = status === 'Paid' ? (customUTR?.trim() || savedRef || `TXN-${Date.now().toString().slice(-6)}`) : (savedRef || 'PENDING');
            
            await updateSpend(showEditModal.id, {
                title,
                amount: Number(amount),
                payoutType,
                date,
                accountType,
                paymentMode,
                status,
                notes,
                receiptUrl,
                receiverName: payoutType === 'Salary' || payoutType === 'Volunteer Payout' || payoutType === 'Artist Fee' || payoutType === 'General Expense' ? receiverName : paidTo,
                paidTo: payoutType === 'Vendor Payout' || payoutType === 'General Expense' ? paidTo : receiverName,
                paidBy: accountType === 'personal' ? (paidByName.trim() || 'Team Member') : 'Newbi Core',
                designation: payoutType === 'Salary' || payoutType === 'General Expense' ? designation : '',
                salaryPeriod: payoutType === 'Salary' ? salaryPeriod : '',
                volunteerPhone: payoutType === 'Volunteer Payout' ? volunteerPhone : '',
                linkedGig: payoutType === 'Volunteer Payout' || payoutType === 'Artist Fee' ? linkedGig : '',
                invoiceRef: payoutType === 'Vendor Payout' ? invoiceRef : '',
                destinationDetails,
                linkedInvoiceId: payoutType === 'Volunteer Payout' ? linkedInvoiceId : '',
                linkedInvoiceNumber: payoutType === 'Volunteer Payout' ? linkedInvoiceNumber : '',
                paymentRef: newSpendRef
            });

            useStore.getState().addToast('Spend updated.', 'success');
            setShowEditModal(null);
            resetForm();
        } catch (err) {
            useStore.getState().addToast("Couldn't update the spend. Please try again.", 'error');
        } finally {
            setSavingSpend(false);
        }
    };

    const handleDeleteSpend = (spend) => {
        if (user?.role === 'editor' || user?.role === 'content_admin') {
            useStore.getState().addToast("Only admins can delete spends.", 'error');
            return;
        }
        setDeletingSpend(spend);
    };

    // Runs from the confirm dialog, which stays open and shows the error if this throws.
    const confirmDeleteSpend = async () => {
        await deleteSpend(deletingSpend.id);
        useStore.getState().addToast('Spend deleted.', 'success');
    };

    const handleToggleStatus = async (spend) => {
        try {
            const newStatus = isSpendPaid(spend) ? 'Pending' : 'Paid';
            const update = { status: newStatus };
            // Only fill in a placeholder; a saved UTR or reference is never replaced.
            if (!hasRealRef(spend)) update.paymentRef = newStatus === 'Paid' ? `TXN-${Date.now().toString().slice(-6)}` : 'PENDING';
            await updateSpend(spend.id, update);
            useStore.getState().addToast(`Spend marked as ${newStatus}.`, 'success');
        } catch (err) {
            useStore.getState().addToast("Couldn't update the spend status. Please try again.", 'error');
        }
    };

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setPayoutType('Salary');
        setDate(new Date().toISOString().split('T')[0]);
        setAccountType('newbi');
        setPaymentMode('UPI');
        setStatus('Paid');
        setNotes('');
        setReceiptUrl('');
        setReceiverName('');
        setPaidByName('');
        setDesignation('');
        setSalaryPeriod(new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        setVolunteerPhone('');
        setLinkedGig('');
        setPaidTo('');
        setInvoiceRef('');
        setDestinationDetails('');
        setLinkedInvoiceId('');
        setLinkedInvoiceNumber('');
        setCustomUTR('');
    };

    const openEdit = (spend) => {
        setShowEditModal(spend);
        setTitle(spend.title || '');
        setAmount(spend.amount || '');
        setPayoutType(spend.payoutType || 'Salary');
        setDate(spend.date || new Date().toISOString().split('T')[0]);
        setAccountType(spend.accountType || 'newbi');
        setPaymentMode(spend.paymentMode || 'UPI');
        setStatus(spend.status || 'Paid');
        setNotes(spend.notes || '');
        setReceiptUrl(spend.receiptUrl || '');
        setReceiverName(spend.receiverName || spend.paidTo || '');
        setPaidByName(spend.accountType === 'personal' && spend.paidBy && spend.paidBy !== 'Newbi Core' && spend.paidBy !== 'Team Member' ? spend.paidBy : '');
        setDesignation(spend.designation || '');
        setSalaryPeriod(spend.salaryPeriod || '');
        setVolunteerPhone(spend.volunteerPhone || '');
        setLinkedGig(spend.linkedGig || '');
        setPaidTo(spend.paidTo || spend.receiverName || '');
        setInvoiceRef(spend.invoiceRef || '');
        setDestinationDetails(spend.destinationDetails || '');
        setLinkedInvoiceId(spend.linkedInvoiceId || '');
        setLinkedInvoiceNumber(spend.linkedInvoiceNumber || '');
        setCustomUTR(spend.paymentRef && !spend.paymentRef.startsWith('TXN-') && spend.paymentRef !== 'OFFLINE' && spend.paymentRef !== 'PENDING' ? spend.paymentRef : '');
    };

    // CSV Exporter
    const spendsExportSpec = () => ({
        filename: `newbi_spends_${fileDate()}`,
        sheetName: 'Spends',
        title: 'Newbi spends',
        subtitle: exportSubtitle(filteredSpends.length, 'payout'),
        rows: filteredSpends,
        totals: { amount: true },
        columns: [
            { header: 'Date', type: 'date', value: sp => sp.date || null },
            { header: 'Title', value: sp => sp.title || '' },
            { header: 'Amount', key: 'amount', type: 'money', value: sp => Number(sp.amount) || 0 },
            { header: 'Payout Type', value: sp => sp.payoutType || 'General Expense' },
            { header: 'Account', value: sp => (sp.accountType === 'personal' ? 'Personal account' : 'Newbi official') },
            { header: 'Paid By', value: sp => sp.paidBy || '' },
            { header: 'Receiver', value: sp => sp.receiverName || '' },
            { header: 'Paid To / Vendor', value: sp => sp.paidTo || '' },
            { header: 'Payment Mode', value: sp => sp.paymentMode || '' },
            { header: 'Status', value: sp => sp.status || '' },
            { header: 'Payment Ref', value: sp => sp.paymentRef || '' },
            { header: 'Notes', value: sp => sp.notes || '', width: 40 },
            { header: 'Recipient Details', value: sp => sp.destinationDetails || '', width: 40 },
        ],
    });


    // ---------- Sheet contents ----------

    // Quick fill from a saved payee (same mapping as before).
    const applyPayee = (payeeId) => {
        if (!payeeId) return;
        const payee = financePayees.find(p => p.id === payeeId);
        if (payee) {
            setReceiverName(payee.name);
            setPaidTo(payee.name);
            setPaymentMode(payee.paymentMode || 'UPI');
            setDestinationDetails(payee.destinationDetails || '');
            if (payee.phone) setVolunteerPhone(payee.phone);

            // Map payee type to payout classification
            if (payee.type === 'Salary') {
                setPayoutType('Salary');
                setTitle('Core Salary Payout');
            } else if (payee.type === 'Volunteer') {
                setPayoutType('Volunteer Payout');
                setTitle('Volunteer Gig Remuneration');
            } else if (payee.type === 'Vendor') {
                setPayoutType('Vendor Payout');
                setTitle('Vendor Service Clearance');
            } else if (payee.type === 'Artist') {
                setPayoutType('Artist Fee');
                setTitle('Artist Clearance');
            }
            useStore.getState().addToast(`Details filled in for ${payee.name}.`, 'success');
        }
    };

    // New payouts get a starter title for the type; editing keeps the title as it is.
    const changePayoutType = (value, isEdit) => {
        setPayoutType(value);
        if (isEdit) return;
        if (value === 'Salary') setTitle('Core Salary Payout');
        else if (value === 'Volunteer Payout') setTitle('Volunteer Gig Remuneration');
        else if (value === 'Vendor Payout') setTitle('Vendor Service Clearance');
        else if (value === 'Artist Fee') setTitle('Artist Clearance');
        else setTitle('');
    };

    const upiCheckoutLink = () => `upi://pay?pa=${upiFrom(destinationDetails)}&pn=${encodeURIComponent(receiverName || paidTo || 'Newbi Payee')}&am=${amount}&cu=INR`;

    const invoiceOptions = (invoices || []).map(inv => (
        <option key={inv.id} value={inv.id}>
            {inv.invoiceNumber || 'INV'} - {inv.clientName} (₹{inv.amount?.toLocaleString()})
        </option>
    ));

    const renderRecipientFields = () => {
        if (payoutType === 'Salary') {
            return (
                <>
                    <Field label="Team member">
                        <input className={fieldCls} value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Who is being paid" required />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Role">
                            <input className={fieldCls} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Creative director" required />
                        </Field>
                        <Field label="Salary month">
                            <input className={fieldCls} value={salaryPeriod} onChange={(e) => setSalaryPeriod(e.target.value)} placeholder="e.g. May 2026" required />
                        </Field>
                    </div>
                </>
            );
        }
        if (payoutType === 'Volunteer Payout') {
            return (
                <>
                    <Field label="Volunteer">
                        <input className={fieldCls} value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Full name" required />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Phone" optional>
                            <input className={fieldCls} type="tel" inputMode="tel" value={volunteerPhone} onChange={(e) => setVolunteerPhone(e.target.value)} placeholder="Phone number" />
                        </Field>
                        <Field label="Event or gig" optional>
                            <input className={fieldCls} value={linkedGig} onChange={(e) => setLinkedGig(e.target.value)} placeholder="e.g. Arena concert gate" />
                        </Field>
                    </div>
                    {invoices && invoices.length > 0 && (
                        <Field label="Client invoice this is paid from" optional>
                            <NativeSelect
                                value={linkedInvoiceId}
                                onChange={(e) => {
                                    const invId = e.target.value;
                                    setLinkedInvoiceId(invId);
                                    const inv = invoices.find(i => i.id === invId);
                                    setLinkedInvoiceNumber(inv ? (inv.invoiceNumber || inv.id) : '');
                                }}
                            >
                                <option value="">No invoice linked</option>
                                {invoiceOptions}
                            </NativeSelect>
                        </Field>
                    )}
                </>
            );
        }
        if (payoutType === 'Vendor Payout') {
            return (
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Vendor">
                        <input className={fieldCls} value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="e.g. Sound Rentals Ltd." required />
                    </Field>
                    <Field label="Their invoice no." optional>
                        <input className={fieldCls} value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="e.g. INV-10023" />
                    </Field>
                </div>
            );
        }
        if (payoutType === 'Artist Fee') {
            return (
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Artist or DJ">
                        <input className={fieldCls} value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Artist name" required />
                    </Field>
                    <Field label="Event" optional>
                        <input className={fieldCls} value={linkedGig} onChange={(e) => setLinkedGig(e.target.value)} placeholder="e.g. Sunburn stage" />
                    </Field>
                </div>
            );
        }
        // General Expense
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Paid to">
                    <input className={fieldCls} value={receiverName} onChange={(e) => { setReceiverName(e.target.value); setPaidTo(e.target.value); }} placeholder="e.g. Amazon office supplies" required />
                </Field>
                <Field label="Expense category" optional>
                    <input className={fieldCls} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Office, travel, food" />
                </Field>
            </div>
        );
    };

    const showUpiCheckout = paymentMode === 'UPI' && destinationDetails.includes('@');

    // Log / edit payout form. Fields, validation and saved data are unchanged; only the layout is new.
    const renderSpendForm = (isEdit) => (
        <form id={isEdit ? 'spend-form-edit' : 'spend-form-add'} onSubmit={isEdit ? handleUpdateSpend : handleCreateSpend} className="space-y-7">
            {financePayees && financePayees.length > 0 && (
                <Field label="Fill from a saved payee" optional hint="Copies their name, payment method and UPI or bank details.">
                    <NativeSelect defaultValue="" onChange={(e) => applyPayee(e.target.value)}>
                        <option value="">Choose a payee</option>
                        {financePayees.map(payee => (
                            <option key={payee.id} value={payee.id}>
                                {payee.name} ({payee.type} - {payee.paymentMode})
                            </option>
                        ))}
                    </NativeSelect>
                </Field>
            )}

            <Section title="What it's for">
                <div>
                    <GroupLabel>Type</GroupLabel>
                    <Chips label="Payout type" value={payoutType} onChange={(v) => changePayoutType(v, isEdit)} options={payoutTypes} />
                </div>
                <Field label="Title">
                    <input className={fieldCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isEdit ? 'e.g. Monthly salary retainer' : 'e.g. Graphic design monthly retainer'} required />
                </Field>
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

            <Section title="Who gets paid">
                {renderRecipientFields()}
            </Section>

            <Section title="Payment details">
                <div>
                    <GroupLabel>Paid from</GroupLabel>
                    <Choice
                        value={accountType}
                        onChange={setAccountType}
                        options={[
                            { value: 'newbi', label: 'Newbi account', hint: 'Official company account' },
                            { value: 'personal', label: 'Personal account', hint: 'A team member paid, to be reimbursed' },
                        ]}
                    />
                </div>
                {accountType === 'personal' && (
                    <Field label="Team member who paid">
                        <input className={fieldCls} value={paidByName} onChange={(e) => setPaidByName(e.target.value)} placeholder="Name of the member paying" required />
                    </Field>
                )}
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
                            { value: 'Paid', label: 'Paid', hint: 'Money has gone out' },
                            { value: 'Pending', label: 'Pending', hint: 'Still to pay' },
                        ]}
                    />
                </div>
                {status === 'Paid' && !(showUpiCheckout && showUPIFlow && !isEdit) && (
                    <Field label="UTR or reference" optional hint="Leave empty and we'll make one up.">
                        <input className={cn(fieldCls, 'font-mono')} value={customUTR} onChange={(e) => setCustomUTR(e.target.value)} placeholder="UPI UTR, bank ref or receipt no." autoCapitalize="characters" />
                    </Field>
                )}
                <Field label="Their UPI ID or bank details" optional hint="Saved with the payout so you can copy it later.">
                    <input className={fieldCls} value={destinationDetails} onChange={(e) => setDestinationDetails(e.target.value)} placeholder="e.g. UPI: name@okaxis" autoCapitalize="off" />
                </Field>
            </Section>

            {!isEdit && showUpiCheckout && (
                <section className="space-y-4 rounded-2xl border border-black/[0.08] p-4 dark:border-white/[0.08]">
                    <div>
                        <h3 className="text-[13px] font-bold">Pay now with UPI</h3>
                        <p className="text-[12px] text-gray-500">Pay {upiFrom(destinationDetails)}{amount ? ` ${formatINR(amount)}` : ''}, then add the UTR to save it as paid.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="secondary"
                            className="h-12"
                            onClick={() => {
                                window.open(upiCheckoutLink(), '_blank');
                                setShowUPIFlow(true);
                            }}
                        >
                            <Smartphone size={15} /> Open UPI app
                        </Button>
                        <Button variant="secondary" className="h-12" onClick={() => setShowUPIFlow(true)}>
                            <QrCode size={15} /> Show QR
                        </Button>
                    </div>
                    {showUPIFlow && (
                        <div className="space-y-4 border-t border-black/[0.06] pt-4 dark:border-white/[0.06]">
                            <div className="flex flex-col items-center gap-2">
                                <div className="rounded-2xl border border-black/10 bg-white p-3">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=020202&data=${encodeURIComponent(upiCheckoutLink())}`}
                                        alt="UPI payment QR code"
                                        className="h-[150px] w-[150px]"
                                    />
                                </div>
                                <span className="text-[12px] text-gray-500">Scan with any UPI app</span>
                            </div>
                            <Field label="UTR from the payment">
                                <input className={cn(fieldCls, 'font-mono')} value={customUTR} onChange={(e) => setCustomUTR(e.target.value)} placeholder="12-digit UPI reference" inputMode="numeric" />
                            </Field>
                            <Button
                                variant="primary"
                                className="h-12 w-full"
                                disabled={savingSpend || uploadingReceipt}
                                onClick={() => {
                                    if (!customUTR) {
                                        useStore.getState().addToast('Enter the UTR number to mark this payment as paid.', 'error');
                                        return;
                                    }
                                    setStatus('Paid');
                                    handleCreateSpend(null, 'Paid');
                                }}
                            >
                                <Check size={15} /> Confirm and save as paid
                            </Button>
                        </div>
                    )}
                </section>
            )}

            <Section title="Receipt" hint="Optional. An invoice, bill or payment screenshot.">
                <AttachmentField
                    url={receiptUrl}
                    uploading={uploadingReceipt}
                    onPick={(e) => handleReceiptUpload(e, setReceiptUrl)}
                    onRemove={() => setReceiptUrl('')}
                    label="Attach a receipt"
                />
            </Section>

            <Section title="Notes">
                <textarea className={cn(areaCls, 'min-h-[96px] resize-y')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering about this payout" />
            </Section>
        </form>
    );

    const renderSpendFooter = (isEdit) => (
        <div className="flex gap-2">
            <Button variant="ghost" className="h-12" onClick={() => (isEdit ? setShowEditModal(null) : setShowAddModal(false))}>Cancel</Button>
            <Button variant="primary" type="submit" form={isEdit ? 'spend-form-edit' : 'spend-form-add'} disabled={uploadingReceipt || savingSpend} className="h-12 flex-1">
                {savingSpend ? 'Saving…' : uploadingReceipt ? 'Uploading…' : isEdit ? 'Save changes' : status === 'Paid' ? 'Save payout' : 'Save as pending'}
            </Button>
        </div>
    );

    // ---------- Bulk volunteer payouts ----------

    const handleBulkCreateEvent = async () => {
        const eventName = bulkNewEventName.trim();
        if (!eventName) return;
        // Check if event already exists
        const exists = upcomingEvents?.find(e => e.title.toLowerCase() === eventName.toLowerCase());
        if (exists) {
            setSelectedBulkEvent(exists.title);
            setBulkNewEventName('');
            useStore.getState().addToast('That event already exists, so we selected it for you.', 'info');
            return;
        }
        try {
            await addUpcomingEvent({
                title: eventName,
                date: new Date().toISOString(),
                description: `Created from Bulk Payout for volunteer disbursements`,
                status: 'active',
                category: 'Event',
            });
            setSelectedBulkEvent(eventName);
            setBulkNewEventName('');
            useStore.getState().addToast(`Event "${eventName}" created.`, 'success');
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("Couldn't create the event. Please try again.", 'error');
        }
    };

    const bulkSelected = bulkVolunteers.filter(v => selectedVolunteerIds.includes(v.id));
    const bulkTotal = bulkSelected.reduce((sum, v) => sum + Number(v.amount || bulkPayoutAmount), 0);
    const bulkCanContinue = !!selectedBulkEvent && selectedVolunteerIds.length > 0;

    const renderBulkBody = () => (bulkStep === 1 ? (
        <div className="space-y-7">
            <Section title="Event">
                <Field label="Event">
                    <NativeSelect value={selectedBulkEvent} onChange={(e) => setSelectedBulkEvent(e.target.value)}>
                        <option value="">Choose an event</option>
                        {upcomingEvents && upcomingEvents.map(evt => (
                            <option key={evt.id || evt.title} value={evt.title}>{evt.title}</option>
                        ))}
                    </NativeSelect>
                </Field>
                <div>
                    <GroupLabel optional>Or add a new event</GroupLabel>
                    <div className="flex gap-2">
                        <input
                            className={fieldCls}
                            placeholder="New event name"
                            value={bulkNewEventName || ''}
                            onChange={(e) => setBulkNewEventName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBulkCreateEvent(); } }}
                        />
                        <Button variant="secondary" className="h-12" disabled={!bulkNewEventName?.trim()} onClick={handleBulkCreateEvent}>
                            <Plus size={14} /> Add
                        </Button>
                    </div>
                </div>
                <Field label="Default amount per volunteer (₹)" hint="You can change each person's amount below.">
                    <input className={fieldCls} type="number" inputMode="decimal" step="any" value={bulkPayoutAmount} onChange={(e) => setBulkPayoutAmount(e.target.value)} required />
                </Field>
            </Section>

            {selectedBulkEvent && (
                <Section>
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <h3 className="text-[13px] font-bold">Volunteers</h3>
                            <p className="text-[12px] text-gray-500">
                                {bulkVolunteers.length === 0 ? 'Registered for this event' : `${selectedVolunteerIds.length} of ${bulkVolunteers.length} selected · ${formatINR(bulkTotal)}`}
                            </p>
                        </div>
                        {bulkVolunteers.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-10"
                                onClick={() => {
                                    if (selectedVolunteerIds.length === bulkVolunteers.length) {
                                        setSelectedVolunteerIds([]);
                                    } else {
                                        setSelectedVolunteerIds(bulkVolunteers.map(v => v.id));
                                    }
                                }}
                            >
                                {selectedVolunteerIds.length === bulkVolunteers.length ? 'Clear all' : 'Select all'}
                            </Button>
                        )}
                    </div>

                    {bulkVolunteers.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-center text-[13px] text-gray-500 dark:border-white/10">
                            No volunteers registered for this event yet. Share a registration link to get started.
                        </p>
                    ) : (
                        <div className="divide-y divide-black/[0.06] rounded-2xl border border-black/[0.08] dark:divide-white/[0.06] dark:border-white/[0.08]">
                            {bulkVolunteers.map((vol, index) => {
                                const isSelected = selectedVolunteerIds.includes(vol.id);
                                return (
                                    <div key={vol.id} className={cn('flex items-center gap-3 px-3 py-2.5 transition-opacity', !isSelected && 'opacity-60')}>
                                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {
                                                    if (isSelected) {
                                                        setSelectedVolunteerIds(prev => prev.filter(id => id !== vol.id));
                                                    } else {
                                                        setSelectedVolunteerIds(prev => [...prev, vol.id]);
                                                    }
                                                }}
                                                className="h-5 w-5 shrink-0 cursor-pointer rounded accent-emerald-500"
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate text-[14px] font-semibold">{vol.name}</span>
                                                <span className="block truncate text-[12px] text-gray-500">{vol.upiId || vol.phone || 'No UPI ID or phone'}</span>
                                            </span>
                                        </label>
                                        <div className="relative w-28 shrink-0">
                                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₹</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                step="any"
                                                aria-label={`Amount for ${vol.name}`}
                                                value={vol.amount}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setBulkVolunteers(prev => prev.map((v, i) => i === index ? { ...v, amount: val } : v));
                                                }}
                                                className={cn(fieldCls, 'h-11 pl-7 pr-2 text-right font-mono text-[14px]')}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Section>
            )}

            <Section title="Payment details">
                <div>
                    <GroupLabel>Method</GroupLabel>
                    <Chips label="Payment method" value={bulkPaymentMode} onChange={setBulkPaymentMode} options={paymentModes} />
                </div>
                <div>
                    <GroupLabel>Paid from</GroupLabel>
                    <Choice
                        value={bulkAccountType}
                        onChange={setBulkAccountType}
                        options={[
                            { value: 'newbi', label: 'Newbi account', hint: 'Official company account' },
                            { value: 'personal', label: 'Personal account', hint: 'A team member paid' },
                        ]}
                    />
                </div>
                <Field label="Date">
                    <input className={fieldCls} type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} required />
                </Field>
                {invoices && invoices.length > 0 && (
                    <Field label="Client invoice these are paid from" optional>
                        <NativeSelect
                            value={bulkLinkedInvoiceId}
                            onChange={(e) => {
                                const invId = e.target.value;
                                setBulkLinkedInvoiceId(invId);
                                const inv = invoices.find(i => i.id === invId);
                                setBulkLinkedInvoiceNumber(inv ? (inv.invoiceNumber || inv.id) : '');
                            }}
                        >
                            <option value="">No invoice linked</option>
                            {invoiceOptions}
                        </NativeSelect>
                    </Field>
                )}
            </Section>

            <Section title="Notes">
                <textarea className={cn(areaCls, 'min-h-[88px] resize-y')} value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} placeholder="Added to every payout in this batch" />
            </Section>
        </div>
    ) : (
        <div className="space-y-6">
            <DetailList>
                <DetailRow label="Event">{selectedBulkEvent}</DetailRow>
                <DetailRow label="Volunteers">{selectedVolunteerIds.length}</DetailRow>
                <DetailRow label="Total">{formatINR(bulkTotal)}</DetailRow>
            </DetailList>

            <Section title="Pay each volunteer" hint="Tap Pay to open your UPI app, then tick them off once the money has gone.">
                <div className="divide-y divide-black/[0.06] rounded-2xl border border-black/[0.08] dark:divide-white/[0.06] dark:border-white/[0.08]">
                    {bulkSelected.map((vol) => {
                        const isPaid = completedPayments[vol.id];
                        return (
                            <div key={vol.id} className="flex items-center gap-3 px-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-[14px] font-semibold">{vol.name}</span>
                                        {isPaid && <Badge tone="green">Done</Badge>}
                                    </div>
                                    <span className="block truncate font-mono text-[12px] text-gray-500">{vol.upiId || 'No UPI ID'} · ₹{vol.amount || bulkPayoutAmount}</span>
                                </div>
                                <Button
                                    variant="secondary"
                                    className="h-10"
                                    onClick={() => {
                                        if (!vol.upiId) {
                                            useStore.getState().addToast("This payee doesn't have a UPI ID saved yet.", 'error');
                                            return;
                                        }
                                        const deepLink = `upi://pay?pa=${vol.upiId}&pn=${encodeURIComponent(vol.name)}&am=${vol.amount || bulkPayoutAmount}&cu=INR`;
                                        window.open(deepLink, '_blank');
                                        setCompletedPayments(prev => ({ ...prev, [vol.id]: true }));
                                    }}
                                >
                                    <Smartphone size={13} /> Pay
                                </Button>
                                <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center" aria-label={`Mark ${vol.name} as paid`}>
                                    <input
                                        type="checkbox"
                                        checked={!!isPaid}
                                        onChange={(e) => {
                                            setCompletedPayments(prev => ({ ...prev, [vol.id]: e.target.checked }));
                                        }}
                                        className="h-5 w-5 cursor-pointer rounded accent-emerald-500"
                                    />
                                </label>
                            </div>
                        );
                    })}
                </div>
            </Section>
        </div>
    ));

    const renderBulkFooter = () => (bulkStep === 1 ? (
        <div className="flex gap-2">
            <Button variant="ghost" className="h-12" onClick={() => setShowBulkModal(false)}>Cancel</Button>
            <Button
                variant="primary"
                className="h-12 flex-1"
                disabled={!bulkCanContinue || savingSpend}
                onClick={() => {
                    if (bulkPaymentMode === 'UPI') {
                        setBulkStep(2);
                    } else {
                        handleCreateBulkPayout();
                    }
                }}
            >
                {bulkPaymentMode === 'UPI'
                    ? 'Next: pay on UPI'
                    : savingSpend ? 'Saving…' : `Log ${selectedVolunteerIds.length || ''} payout${selectedVolunteerIds.length === 1 ? '' : 's'}`}
            </Button>
        </div>
    ) : (
        <div className="flex gap-2">
            <Button variant="secondary" className="h-12" onClick={() => setBulkStep(1)}><ArrowLeft size={14} /> Back</Button>
            <Button variant="primary" className="h-12 flex-1" disabled={savingSpend} onClick={handleCreateBulkPayout}>
                {savingSpend ? 'Saving…' : 'Log payouts and make receipt'}
            </Button>
        </div>
    ));

    // ---------- Payout slip / receipt ----------

    const slipIsPending = !!activeSlipData && (activeSlipData.status === 'Pending' || activeSlipData.status === 'Unpaid');

    const slipTitle = printerStage === 'verify'
        ? (slipIsPending ? 'Mark payout as paid' : 'Payout receipt')
        : printerStage === 'printing' ? 'Printing receipt' : 'Payout receipt';

    const closeSlip = () => {
        // Escape also reaches this sheet while the email sheet is on top; let that one close first.
        if (showEmailModal) return;
        setShowPrinterModal(false);
    };

    const renderSlipHero = () => (
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-[12px] font-bold text-gray-500">{activeSlipData.isBulk ? 'Bulk payout' : 'Paying'}</p>
                <p className="break-words text-[16px] font-bold leading-snug">{activeSlipData.receiverName}</p>
            </div>
            <div className="shrink-0 text-right">
                <p className="text-[24px] font-extrabold tracking-tight">{formatINR(activeSlipData.amount)}</p>
                <Badge tone={slipIsPending ? 'amber' : 'green'}>{slipIsPending ? 'Pending' : 'Paid'}</Badge>
            </div>
        </div>
    );

    const renderBulkBreakdown = () => (activeSlipData.isBulk && activeSlipData.volunteers && activeSlipData.volunteers.length > 0 ? (
        <Section title={`Volunteers (${activeSlipData.volunteers.length})`}>
            <DetailList className="max-h-56 overflow-y-auto">
                {activeSlipData.volunteers.map((vol, idx) => (
                    <DetailRow key={idx} label={vol.name} mono>{formatINR(vol.amount)}</DetailRow>
                ))}
            </DetailList>
        </Section>
    ) : null);

    const renderSlipBody = () => {
        if (!activeSlipData) return null;

        if (printerStage === 'verify' && slipIsPending) {
            const bank = activeSlipData.paymentMode === 'Bank Transfer' ? getBankDetails() : null;
            return (
                <div className="space-y-7">
                    {renderSlipHero()}

                    <DetailList>
                        <DetailRow label="Method">{activeSlipData.paymentMode}</DetailRow>
                        <DetailRow label="Type">{activeSlipData.payoutType}</DetailRow>
                        {activeSlipData.linkedGig && <DetailRow label="Event">{activeSlipData.linkedGig}</DetailRow>}
                    </DetailList>

                    {activeSlipData.paymentMode === 'UPI' && (
                        <Section title="Pay with UPI">
                            {activeSlipData.destinationDetails && (
                                <DetailList>
                                    <DetailRow
                                        label="UPI ID"
                                        mono
                                        onCopy={() => handleCopy(activeSlipData.destinationDetails.replace('UPI:', '').trim(), 'UPI ID')}
                                    >
                                        {activeSlipData.destinationDetails.replace('UPI:', '').trim()}
                                    </DetailRow>
                                </DetailList>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="secondary" className="h-12" disabled={slipBusy} onClick={handleUpiPayClick}>
                                    <Smartphone size={15} /> Pay in UPI app
                                </Button>
                                <Button variant="secondary" className="h-12" onClick={() => setShowQR(!showQR)}>
                                    <QrCode size={15} /> {showQR ? 'Hide QR' : 'Show QR'}
                                </Button>
                            </div>
                            <p className="text-[12px] text-gray-500">Pay in UPI app opens your UPI app and marks this payout as paid straight away.</p>
                            {showQR && activeSlipData.destinationDetails && (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="rounded-2xl border border-black/10 bg-white p-3">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=020202&data=${encodeURIComponent(
                                                `upi://pay?pa=${activeSlipData.destinationDetails.replace('UPI:', '').trim()}&pn=${encodeURIComponent(activeSlipData.receiverName)}&am=${activeSlipData.amount}&cu=INR`
                                            )}`}
                                            alt="UPI payment QR code"
                                            className="h-[160px] w-[160px]"
                                        />
                                    </div>
                                    <span className="text-[12px] text-gray-500">Scan with any UPI app</span>
                                </div>
                            )}
                        </Section>
                    )}

                    {activeSlipData.paymentMode === 'Bank Transfer' && (
                        <Section title="Bank details">
                            {!bank ? (
                                <p className="rounded-2xl border border-dashed border-black/10 px-4 py-4 text-[13px] text-gray-500 dark:border-white/10">No bank details saved for this payee. Transfer manually.</p>
                            ) : (
                                <DetailList>
                                    <DetailRow label="Account name" onCopy={() => handleCopy(activeSlipData.receiverName, 'Account name')}>{activeSlipData.receiverName}</DetailRow>
                                    <DetailRow label="Bank" onCopy={() => handleCopy(bank.bankName, 'Bank name')}>{bank.bankName}</DetailRow>
                                    <DetailRow label="Account no." mono onCopy={() => handleCopy(bank.accountNumber, 'Account number')}>{bank.accountNumber}</DetailRow>
                                    <DetailRow label="IFSC" mono onCopy={() => handleCopy(bank.ifscCode, 'IFSC code')}>{bank.ifscCode}</DetailRow>
                                </DetailList>
                            )}
                        </Section>
                    )}

                    {renderBulkBreakdown()}

                    <Section title="Confirm the payment">
                        <Field label="UTR or reference" optional hint="Leave empty to keep the current reference.">
                            <input className={cn(fieldCls, 'font-mono')} value={verificationUTR} onChange={(e) => setVerificationUTR(e.target.value)} placeholder="UPI UTR or bank ref" autoCapitalize="characters" />
                        </Field>
                        {activeSlipData.id && (
                            <div>
                                <GroupLabel optional>Payment proof</GroupLabel>
                                <AttachmentField
                                    url={verificationReceiptUrl}
                                    uploading={uploadingReceipt}
                                    onPick={(e) => handleReceiptUpload(e, setVerificationReceiptUrl)}
                                    label="Attach payment proof"
                                />
                            </div>
                        )}
                    </Section>
                </div>
            );
        }

        if (printerStage === 'verify') {
            return (
                <div className="space-y-7">
                    {renderSlipHero()}
                    <DetailList>
                        <DetailRow label="Method">{activeSlipData.paymentMode}</DetailRow>
                        <DetailRow label="Reference" mono>{activeSlipData.reference}</DetailRow>
                    </DetailList>
                    <Section title="Before you print">
                        <Field
                            label="UTR or reference on the receipt"
                            optional
                            hint={activeSlipData.id ? 'Saved to the payout too.' : 'Only changes the receipt. Edit the payout to change the saved reference.'}
                        >
                            <input className={cn(fieldCls, 'font-mono')} value={verificationUTR} onChange={(e) => setVerificationUTR(e.target.value)} placeholder={activeSlipData.reference || 'UPI UTR or bank ref'} autoCapitalize="characters" />
                        </Field>
                        {activeSlipData.id && (
                            <div>
                                <GroupLabel optional>Payment proof</GroupLabel>
                                <AttachmentField
                                    url={verificationReceiptUrl}
                                    uploading={uploadingReceipt}
                                    onPick={(e) => handleReceiptUpload(e, setVerificationReceiptUrl)}
                                    label="Attach payment proof"
                                />
                            </div>
                        )}
                    </Section>
                    {renderBulkBreakdown()}
                </div>
            );
        }

        // printing / done: the receipt comes out of the slot, then the actions show.
        return (
            <div className="flex flex-col items-center gap-6">
                <div className="flex w-full flex-col items-center">
                    {renderPrinterSlot(printerStage === 'printing' ? 'Printing' : 'Ready', printerStage === 'printing')}
                    <div className="relative z-20 -mt-1.5 flex w-[260px] justify-center overflow-hidden">
                        {printerStage === 'printing' ? (
                            <motion.div
                                initial={{ y: '-100%' }}
                                animate={{ y: 0 }}
                                transition={{ duration: 2.2, ease: 'linear' }}
                                onAnimationComplete={() => setPrinterStage('done')}
                                className="flex w-full justify-center"
                            >
                                {renderThermalReceipt(activeSlipData, verificationUTR)}
                            </motion.div>
                        ) : (
                            renderThermalReceipt(activeSlipData, verificationUTR)
                        )}
                    </div>
                </div>

                {printerStage === 'done' && (
                    <div className="w-full space-y-6">
                        <DetailList>
                            <DetailRow label="Type">{activeSlipData.payoutType}</DetailRow>
                            {activeSlipData.linkedGig && <DetailRow label="Event">{activeSlipData.linkedGig}</DetailRow>}
                            {activeSlipData.destinationDetails && (
                                <DetailRow label="Paid to" mono>{activeSlipData.destinationDetails.replace('UPI:', '').replace('Bank:', '').trim()}</DetailRow>
                            )}
                        </DetailList>
                        {renderBulkBreakdown()}
                    </div>
                )}
            </div>
        );
    };

    const renderSlipFooter = () => {
        if (!activeSlipData) return null;
        if (printerStage === 'verify' && slipIsPending) {
            return (
                <div className="flex gap-2">
                    <Button variant="secondary" className="h-12" disabled={slipBusy || uploadingReceipt} onClick={handleSkipReference}>
                        Paid, no reference
                    </Button>
                    <Button variant="primary" className="h-12 flex-1" disabled={slipBusy || uploadingReceipt} onClick={() => handleConfirmSlip('Payment details updated and marked as paid.')}>
                        <Printer size={15} /> {slipBusy ? 'Saving…' : 'Mark paid and print'}
                    </Button>
                </div>
            );
        }
        if (printerStage === 'verify') {
            return (
                <Button variant="primary" className="h-12 w-full" disabled={slipBusy || uploadingReceipt} onClick={() => handleConfirmSlip('Payment details updated.')}>
                    <Printer size={15} /> {slipBusy ? 'Saving…' : 'Print receipt'}
                </Button>
            );
        }
        if (printerStage === 'printing') return null;
        return (
            <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                    <Button variant="secondary" className="h-11 px-2" onClick={handleShareReceiptText}><Share2 size={14} /> Share</Button>
                    <Button variant="secondary" className="h-11 px-2" onClick={handleWhatsAppShare}><MessageCircle size={14} /> WhatsApp</Button>
                    <Button variant="secondary" className="h-11 px-2" onClick={() => setShowEmailModal(true)}><Mail size={14} /> Email</Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" className="h-12" onClick={() => setShowPrinterModal(false)}>Done</Button>
                    <Button variant="primary" className="h-12 flex-1" onClick={handleDownloadReceipt}><Download size={15} /> Download receipt</Button>
                </div>
            </div>
        );
    };

    const canDelete = user?.role !== 'editor' && user?.role !== 'content_admin';
    const shown = filteredSpends.slice(0, limit);
    const recipientOf = (sp) => sp.receiverName || sp.paidTo || '';
    const accountLabel = (sp) => {
        if (sp.accountType !== 'personal') return 'Newbi account';
        const payer = sp.paidBy && sp.paidBy !== 'Team Member' && sp.paidBy !== 'Newbi Core' ? sp.paidBy : '';
        return payer ? `Personal (${payer})` : 'Personal account';
    };

    // Type-specific lines shown on the card (same details as before).
    const spendFacts = (sp) => {
        const facts = [];
        if (sp.payoutType === 'Salary') {
            facts.push(['Month', sp.salaryPeriod || '—']);
            facts.push(['Role', sp.designation || 'Core team']);
        } else if (sp.payoutType === 'Volunteer Payout') {
            facts.push(['Phone', sp.volunteerPhone || '—', true]);
            facts.push(['Gig', sp.linkedGig || 'General support']);
            if (sp.linkedInvoiceNumber) facts.push(['Invoice', `#${sp.linkedInvoiceNumber}`, true]);
        } else if (sp.payoutType === 'Vendor Payout') {
            facts.push(['Vendor', sp.paidTo || '—']);
            facts.push(['Their invoice', sp.invoiceRef || '—', true]);
        } else if (sp.payoutType === 'Artist Fee') {
            if (sp.linkedGig) facts.push(['Event', sp.linkedGig]);
        } else if (sp.designation) {
            facts.push(['Category', sp.designation]);
        }
        facts.push(['Paid from', accountLabel(sp)]);
        facts.push(['Method', sp.paymentMode || '—']);
        return facts;
    };

    // Other gigs this volunteer is registered for (shown when there's more than one).
    const volunteerGigs = (sp) => financePayees
        .filter(p => p.type === 'Volunteer' && p.linkedGig && (
            (sp.receiverName && p.name?.toLowerCase() === sp.receiverName?.toLowerCase()) ||
            (sp.volunteerPhone && p.phone === sp.volunteerPhone)
        ))
        .map(p => p.linkedGig)
        .filter((g, idx, arr) => arr.indexOf(g) === idx);

    const slipButton = (sp, className) => (
        isSpendPaid(sp) ? (
            <Button size="sm" variant="secondary" onClick={() => handleViewReceiptSlip(sp)} className={className}><Printer size={13} /> Receipt</Button>
        ) : (
            <Button size="sm" variant="success" onClick={() => handleViewReceiptSlip(sp)} className={className}><Printer size={13} /> Pay or mark paid</Button>
        )
    );

    const spendMenu = (sp) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="w-9 px-0"><MoreHorizontal size={15} /></Button>
        )}>
            <MenuItem icon={Printer} onClick={() => handleViewReceiptSlip(sp)}>{isSpendPaid(sp) ? 'Payout slip' : 'Payout slip / mark paid'}</MenuItem>
            <MenuItem icon={Edit} onClick={() => openEdit(sp)}>Edit</MenuItem>
            <MenuItem icon={isSpendPaid(sp) ? Clock : CheckCircle} onClick={() => handleToggleStatus(sp)} hint={isSpendPaid(sp) ? 'Moves it back to pending' : 'Saves it as paid without a receipt'}>
                {isSpendPaid(sp) ? 'Mark as pending' : 'Mark as paid'}
            </MenuItem>
            {sp.receiptUrl && <MenuItem as="a" href={sp.receiptUrl} target="_blank" rel="noopener noreferrer" icon={Eye}>View proof</MenuItem>}
            {sp.destinationDetails && <MenuItem icon={Copy} onClick={() => copyToClipboard(sp.destinationDetails)} hint={sp.destinationDetails}>Copy UPI or bank details</MenuItem>}
            {canDelete && <MenuItem icon={Trash2} danger onClick={() => handleDeleteSpend(sp)}>Delete</MenuItem>}
        </Menu>
    );

    return (
        <>
            <AdminCommunityHubLayout
                studioHeader={{ title: 'Spends', icon: IndianRupee, description: 'Salaries, volunteer, vendor and artist payouts' }}
                tabs={financeTabs}
                action={(
                    <div className="flex w-full gap-2 sm:w-auto">
                        <Button variant="secondary" onClick={() => { resetBulkForm(); setShowBulkModal(true); }} className="flex-1 sm:flex-none"><Layers size={14} /> Pay volunteers</Button>
                        <Button variant="primary" onClick={() => { resetForm(); setShowAddModal(true); }} className="flex-1 sm:flex-none"><Plus size={14} /> Log payout</Button>
                    </div>
                )}
            >
                <div className="space-y-5">
                    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                        <StatTile className={KPI_CLS} icon={CheckCircle} tone="green" label="Paid out" value={inr(stats.totalCleared)} hint={`${stats.countCleared} paid ${stats.countCleared === 1 ? 'payout' : 'payouts'}`} active={statusFilter === 'Paid'} onClick={() => setStatusFilter(statusFilter === 'Paid' ? 'All' : 'Paid')} />
                        <StatTile className={KPI_CLS} icon={Clock} tone={stats.countPending ? 'amber' : 'gray'} label="Still to pay" value={inr(stats.totalPending)} hint={stats.countPending ? `${stats.countPending} pending ${stats.countPending === 1 ? 'payout' : 'payouts'}` : 'Nothing pending'} active={statusFilter === 'Pending'} onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')} />
                        <StatTile className={KPI_CLS} icon={Wallet} tone="teal" label="Average payout" value={inr(Math.round(stats.avgOutlay))} hint="Across the payouts shown" />
                        <StatTile className={KPI_CLS} icon={Award} tone={TYPE_TONE[stats.topCat] || 'gray'} label="Biggest category" value={stats.topCat === 'None' ? '—' : (TYPE_LABEL[stats.topCat] || stats.topCat)} hint={stats.maxCatVal ? `${inr(stats.maxCatVal)} spent` : 'No payouts yet'} active={stats.topCat !== 'None' && payoutTypeFilter === stats.topCat} onClick={stats.topCat !== 'None' ? () => setFilter('type', payoutTypeFilter === stats.topCat ? null : stats.topCat) : undefined} />
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <SearchInput value={searchTerm} onChange={(v) => { setSearchTerm(v); setLimit(PAGE); }} placeholder="Title, recipient, vendor or invoice" className="lg:w-72" />
                        <div className="grid flex-1 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                            <Select label="Month" value={monthFilter} onChange={setMonth} className="sm:w-36" options={[{ value: 'all', label: 'All time' }, ...monthOptions.map(m => ({ value: m, label: monthLabel(m) }))]} />
                            <Select label="Payout type" value={payoutTypeFilter} onChange={(v) => setFilter('type', v === 'All' ? null : v)} className="sm:w-44" options={[{ value: 'All', label: 'All types' }, ...payoutTypes.map(t => ({ value: t, label: TYPE_LABEL[t] || t }))]} />
                            <Select label="Paid from" value={accountFilter} onChange={(v) => setFilter('account', v === 'All' ? null : v)} className="sm:w-44" options={[{ value: 'All', label: 'Any account' }, { value: 'newbi', label: 'Newbi account' }, { value: 'personal', label: 'Personal account' }]} />
                            <div className="sm:ml-auto">
                                <ExportMenu getSpec={spendsExportSpec} className="w-full [&>button]:w-full" />
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
                                    { value: 'Paid', label: 'Paid', count: statusCounts.Paid },
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
                                title={spends.length ? 'No matching payouts' : 'No payouts yet'}
                                description={spends.length ? `Nothing for ${monthFilter === 'all' ? 'these filters' : monthLabel(monthFilter)}. Try another month or clear the filters.` : 'Log salaries, volunteer, vendor and artist payouts here.'}
                                action={spends.length
                                    ? (filtersActive && <Button variant="secondary" onClick={clearFilters}><X size={14} /> Clear filters</Button>)
                                    : <Button variant="primary" onClick={() => { resetForm(); setShowAddModal(true); }}><Plus size={14} /> Log payout</Button>}
                            />
                        </Card>
                    ) : view === 'cards' ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {shown.map(sp => {
                                const gigs = sp.payoutType === 'Volunteer Payout' ? volunteerGigs(sp) : [];
                                return (
                                    <Card key={sp.id} className="flex flex-col rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <Badge tone={isSpendPaid(sp) ? 'green' : 'amber'}>{isSpendPaid(sp) ? 'Paid' : 'Pending'}</Badge>
                                                <Badge tone={TYPE_TONE[sp.payoutType || 'General Expense'] || 'gray'}>{TYPE_LABEL[sp.payoutType || 'General Expense'] || sp.payoutType}</Badge>
                                                {sp.isBulk && <Badge tone="blue">Bulk</Badge>}
                                            </div>
                                            <span className="shrink-0 text-[12px] text-gray-500">{formatDay(spendDay(sp)) || '—'}</span>
                                        </div>

                                        <button type="button" onClick={() => openEdit(sp)} className="mt-3 min-w-0 text-left">
                                            <p className="line-clamp-2 text-[17px] font-extrabold leading-snug">{sp.title || 'Untitled payout'}</p>
                                            {recipientOf(sp) && <p className="mt-0.5 truncate text-[13px] text-gray-500">To {recipientOf(sp)}</p>}
                                        </button>

                                        <p className="mt-3 text-[24px] font-extrabold tracking-tight tabular-nums">{formatINR(sp.amount)}</p>

                                        <dl className="mt-2 space-y-1 text-[12px]">
                                            {spendFacts(sp).map(([label, value, mono]) => (
                                                <div key={label} className="flex justify-between gap-3">
                                                    <dt className="shrink-0 text-gray-500">{label}</dt>
                                                    <dd className={cn('min-w-0 truncate text-right font-semibold text-gray-800 dark:text-zinc-200', mono && 'font-mono')}>{value}</dd>
                                                </div>
                                            ))}
                                        </dl>

                                        {gigs.length > 1 && (
                                            <div className="mt-2">
                                                <p className="text-[11px] text-gray-500">Registered for</p>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {gigs.map(g => <Badge key={g} tone={g === sp.linkedGig ? 'green' : 'gray'}>{g}</Badge>)}
                                                </div>
                                            </div>
                                        )}

                                        {sp.destinationDetails && (
                                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/[0.06] bg-black/[0.02] py-1.5 pl-3 pr-1 dark:border-white/[0.06] dark:bg-white/[0.02]">
                                                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-gray-700 dark:text-zinc-300">{sp.destinationDetails}</span>
                                                <button type="button" onClick={() => copyToClipboard(sp.destinationDetails)} aria-label="Copy UPI or bank details" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="min-h-4 flex-1" />
                                        <div className="flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                            {slipButton(sp, 'flex-1')}
                                            {sp.receiptUrl ? (
                                                <Button size="sm" as="a" href={sp.receiptUrl} target="_blank" rel="noopener noreferrer" variant="secondary"><Eye size={13} /> Proof</Button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-1 text-[11px] text-gray-400"><AlertTriangle size={12} /> No proof</span>
                                            )}
                                            {spendMenu(sp)}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="overflow-hidden rounded-2xl">
                            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-4 border-b border-black/[0.06] px-5 py-2.5 text-[11px] font-bold text-gray-500 dark:border-white/[0.06] xl:grid">
                                <span>Payout</span><span>Paid to</span><span>Paid from</span><span className="text-right">Amount</span><span className="w-[232px]" />
                            </div>
                            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                {shown.map(sp => (
                                    <li key={sp.id} className="transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 sm:px-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] xl:gap-4">
                                            <button type="button" onClick={() => openEdit(sp)} className="min-w-0 text-left">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate text-[15px] font-bold">{sp.title || 'Untitled payout'}</span>
                                                    <Badge tone={isSpendPaid(sp) ? 'green' : 'amber'}>{isSpendPaid(sp) ? 'Paid' : 'Pending'}</Badge>
                                                </span>
                                                <span className="mt-0.5 block truncate text-[12px] text-gray-500">
                                                    {TYPE_LABEL[sp.payoutType || 'General Expense'] || sp.payoutType} · {formatDay(spendDay(sp)) || 'No date'}
                                                    <span className="xl:hidden">{recipientOf(sp) ? ` · ${recipientOf(sp)}` : ''}</span>
                                                </span>
                                                {sp.notes && <span className="mt-0.5 hidden truncate text-[12px] text-gray-400 xl:block">{sp.notes}</span>}
                                            </button>

                                            <p className="text-right text-[15px] font-extrabold tabular-nums xl:hidden">{formatINR(sp.amount)}</p>

                                            <div className="hidden min-w-0 text-[13px] xl:block">
                                                <p className="truncate font-semibold">{recipientOf(sp) || '—'}</p>
                                                <p className="truncate text-[12px] text-gray-500">
                                                    {[sp.designation, sp.volunteerPhone, sp.linkedGig, sp.linkedInvoiceNumber && `Invoice #${sp.linkedInvoiceNumber}`].filter(Boolean).join(' · ') || (sp.destinationDetails ? sp.destinationDetails : '')}
                                                </p>
                                            </div>
                                            <div className="hidden min-w-0 text-[13px] xl:block">
                                                <p className="truncate">{accountLabel(sp)}</p>
                                                <p className="truncate text-[12px] text-gray-500">{sp.paymentMode || '—'}</p>
                                            </div>
                                            <p className="hidden text-right text-[14px] font-extrabold tabular-nums xl:block">{formatINR(sp.amount)}</p>

                                            <div className="col-span-2 flex items-center justify-end gap-2 pt-2 xl:col-span-1 xl:w-[232px] xl:pt-0">
                                                {slipButton(sp, 'flex-1 sm:flex-none')}
                                                {sp.receiptUrl && (
                                                    <Button size="sm" as="a" href={sp.receiptUrl} target="_blank" rel="noopener noreferrer" variant="secondary" aria-label="View proof" className="w-9 px-0"><Eye size={14} /></Button>
                                                )}
                                                {spendMenu(sp)}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    {filteredSpends.length > limit && (
                        <div className="text-center">
                            <Button variant="ghost" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, filteredSpends.length - limit)} more of {filteredSpends.length - limit}</Button>
                        </div>
                    )}
                </div>
            </AdminCommunityHubLayout>

            {/* Log a payout */}
            <Sheet
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                size="lg"
                title="Log a payout"
                subtitle="Record money going out. Paid payouts get a receipt you can share."
                footer={renderSpendFooter(false)}
            >
                {renderSpendForm(false)}
            </Sheet>

            {/* Edit a payout */}
            <Sheet
                open={!!showEditModal}
                onClose={() => setShowEditModal(null)}
                size="lg"
                title="Edit payout"
                subtitle={showEditModal ? `${showEditModal.title || 'Payout'} · ref ${showEditModal.id?.substring(0, 8)}` : undefined}
                footer={renderSpendFooter(true)}
            >
                {renderSpendForm(true)}
            </Sheet>

            {/* Bulk volunteer payouts */}
            <Sheet
                open={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                size="lg"
                title="Pay volunteers in bulk"
                subtitle={bulkStep === 1 ? 'Pick an event, choose who to pay, then log every payout at once.' : `Step 2 of 2 · ${selectedBulkEvent}`}
                footer={renderBulkFooter()}
            >
                {renderBulkBody()}
            </Sheet>

            {/* Payout slip: mark as paid, then print / share the receipt */}
            <Sheet
                open={showPrinterModal && !!activeSlipData}
                onClose={closeSlip}
                size={printerStage === 'verify' && slipIsPending ? 'lg' : 'md'}
                title={slipTitle}
                subtitle={activeSlipData ? `${activeSlipData.receiverName} · ${formatINR(activeSlipData.amount)}` : undefined}
                footer={renderSlipFooter()}
            >
                {renderSlipBody()}
            </Sheet>

            <ConfirmDialog
                open={!!deletingSpend}
                onClose={() => setDeletingSpend(null)}
                title="Delete this payout?"
                body={deletingSpend ? `${deletingSpend.title || 'This payout'} for ${formatINR(deletingSpend.amount)}${spendPayee(deletingSpend) ? ` to ${spendPayee(deletingSpend)}` : ''} will be removed from the ledger. This can't be undone.` : ''}
                confirmLabel="Delete payout"
                onConfirm={confirmDeleteSpend}
            />

            {/* Receipt Email Modal */}
            <AnimatePresence>
                {showEmailModal && activeSlipData && (
                    <ReceiptEmailModal
                        isOpen={!!showEmailModal}
                        onClose={() => setShowEmailModal(false)}
                        receipt={activeSlipData}
                        onSend={handleSendReceiptEmail}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default SpendsManagement;
