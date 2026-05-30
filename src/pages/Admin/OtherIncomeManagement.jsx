import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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

import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const OtherIncomeManagement = () => {
    const { otherIncomes, addOtherIncome, updateOtherIncome, deleteOtherIncome, uploadToCloudinary, user } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [monthFilter, setMonthFilter] = useState(
        new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    );
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [accountFilter, setAccountFilter] = useState('All');
    const [viewMode, setViewMode] = useState('grid');
    const [dateFilter, setDateFilter] = useState('');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

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

    const financeTabs = [
        { name: 'Overview', path: '/admin/finance', icon: LayoutGrid, color: 'text-[#39FF14]' },
        { name: 'Spends Ledger', path: '/admin/spends', icon: IndianRupee, color: 'text-neon-pink' },
        { name: 'Other Income', path: '/admin/other-income', icon: FileSpreadsheet, color: 'text-[#39FF14]' },
        { name: 'Payee Registry', path: '/admin/payees', icon: User, color: 'text-neon-blue' }
    ];

    // District Category Navigation setup
    const categories = [
        {
            name: 'Overview',
            desc: 'Liquidity Dashboard',
            info: 'Real-time metrics, cash flow graphs & indicators',
            path: '/admin/finance',
            icon: LayoutGrid,
            color: 'text-[#39FF14]',
            glow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:border-[#39FF14]/40',
            bgGradient: 'from-[#39FF14]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#39FF14]/15',
            badge: 'COMMAND',
            active: false
        },
        {
            name: 'Spends Ledger',
            desc: 'Expenditures & Debits',
            info: 'Track payroll, supplier bills, and vendor payouts',
            path: '/admin/spends',
            icon: CreditCard,
            color: 'text-[#FF2E90]',
            glow: 'hover:shadow-[0_0_30px_rgba(255,46,144,0.15)] hover:border-[#FF2E90]/40',
            bgGradient: 'from-[#FF2E90]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#FF2E90]/15',
            badge: 'DEBITS',
            active: false
        },
        {
            name: 'Other Income',
            desc: 'Revenue & Capital Inflow',
            info: 'Manage sponsorships, tickets, and external grants',
            path: '/admin/other-income',
            icon: FileSpreadsheet,
            color: 'text-[#39FF14]',
            glow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:border-[#39FF14]/40',
            bgGradient: 'from-[#39FF14]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#39FF14]/15',
            badge: 'INFLOW',
            active: true
        },
        {
            name: 'Payee Registry',
            desc: 'Beneficiary Directory',
            info: 'Manage rosters of volunteers, retainers, and crews',
            path: '/admin/payees',
            icon: User,
            color: 'text-[#00F0FF]',
            glow: 'hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] hover:border-[#00F0FF]/40',
            bgGradient: 'from-[#00F0FF]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#00F0FF]/15',
            badge: 'REGISTRY',
            active: false
        }
    ];

    const incomeCategories = [
        'Sponsorship',
        'Ticket Sales',
        'Client Work',
        'Booking Fee',
        'Other'
    ];

    const paymentModes = ['UPI', 'Bank Transfer', 'Cash', 'Card', 'Other'];

    // Helper to extract month label
    const getMonthLabel = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Calculate month selector list dynamically
    const monthOptions = useMemo(() => {
        const months = new Set();
        months.add(new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        otherIncomes.forEach(inc => {
            const label = getMonthLabel(inc.createdAt || inc.date);
            if (label) months.add(label);
        });
        const sorted = Array.from(months).sort((a, b) => new Date(b) - new Date(a));
        return ['All Time', ...sorted];
    }, [otherIncomes]);

    // Filtered Incomes
    const filteredIncomes = useMemo(() => {
        return otherIncomes
            .filter(inc => {
                const matchesSearch = 
                    inc.sourceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    inc.receiverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    inc.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    inc.transactionRef?.toLowerCase().includes(searchTerm.toLowerCase());

                const label = getMonthLabel(inc.createdAt || inc.date);
                const matchesMonth = monthFilter === 'All Time' ? true : label === monthFilter;

                const matchesCategory = categoryFilter === 'All' ? true : inc.category === categoryFilter;
                const matchesStatus = statusFilter === 'All' ? true : inc.status === statusFilter;
                const matchesAccount = accountFilter === 'All' ? true : inc.accountType === accountFilter;
                const matchesDate = !dateFilter ? true : inc.date === dateFilter;

                return matchesSearch && matchesMonth && matchesCategory && matchesStatus && matchesAccount && matchesDate;
            });
    }, [otherIncomes, searchTerm, monthFilter, categoryFilter, statusFilter, accountFilter, dateFilter]);

    const handleAttachmentUpload = async (e, setUrl) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingAttachment(true);
        try {
            const url = await uploadToCloudinary(file);
            setUrl(url);
            useStore.getState().addToast('Attachment uploaded successfully!', 'success');
        } catch (err) {
            useStore.getState().addToast(err.message || 'Failed to upload attachment.', 'error');
        } finally {
            setUploadingAttachment(false);
        }
    };

    const handleCreateIncome = async (e) => {
        e.preventDefault();
        if (!sourceName || !amount || !date) {
            useStore.getState().addToast('Please fill in all required fields.', 'error');
            return;
        }

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

            useStore.getState().addToast('Income record added.', 'success');
            setShowAddModal(false);
            resetForm();
        } catch (err) {
            useStore.getState().addToast('Failed to save income record. Please try again.', 'error');
        }
    };

    const handleUpdateIncome = async (e) => {
        e.preventDefault();
        if (!sourceName || !amount || !date) {
            useStore.getState().addToast('Please fill in all required fields.', 'error');
            return;
        }

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

            useStore.getState().addToast('Income record updated.', 'success');
            setShowEditModal(null);
            resetForm();
        } catch (err) {
            useStore.getState().addToast('Failed to update income record. Please try again.', 'error');
        }
    };

    const handleDeleteIncome = (id) => {
        if (user?.role === 'editor' || user?.role === 'content_admin') {
            useStore.getState().addToast("Only administrators can delete income records.", 'error');
            return;
        }

        if (window.confirm('Are you sure you want to delete this income record?')) {
            deleteOtherIncome(id);
            useStore.getState().addToast('Income record deleted.', 'success');
        }
    };

    const handleToggleStatus = async (income) => {
        try {
            const newStatus = income.status === 'Paid' ? 'Pending' : 'Paid';
            await updateOtherIncome(income.id, { status: newStatus });
            useStore.getState().addToast(`Income marked as ${newStatus}.`, 'success');
        } catch (err) {
            useStore.getState().addToast('Failed to update status.', 'error');
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
        useStore.getState().addToast('Transaction details copied to clipboard!', 'success');
    };

    const handleExportCSV = () => {
        if (filteredIncomes.length === 0) {
            useStore.getState().addToast('No records to export.', 'error');
            return;
        }

        const headers = ['Source Name', 'Amount (INR)', 'Category', 'Date', 'Account Type', 'Receiver Name', 'Payment Mode', 'Status', 'Notes', 'Transaction Ref', 'Attachment URL'];
        const rows = filteredIncomes.map(inc => [
            `"${inc.sourceName?.replace(/"/g, '""') || ''}"`,
            inc.amount || 0,
            `"${inc.category || ''}"`,
            inc.date || '',
            inc.accountType === 'personal' ? 'Personal Account' : 'Newbi Official',
            `"${inc.receiverName || ''}"`,
            inc.paymentMode || '',
            inc.status || '',
            `"${inc.notes?.replace(/"/g, '""') || ''}"`,
            `"${inc.transactionRef?.replace(/"/g, '""') || ''}"`,
            inc.attachmentUrl || ''
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `newbi_other_income_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <AdminCommunityHubLayout
                studioHeader={{
                    title: 'OTHER',
                    subtitle: 'REVENUE',
                    accentClass: 'text-[#39FF14]',
                    icon: FileSpreadsheet
                }}
                tabs={financeTabs}
                accentColor="neon-green"
                action={
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                        <button
                            onClick={handleExportCSV}
                            className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-6 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black uppercase tracking-widest text-[8px] md:text-[9px] rounded-xl border border-white/5 transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                        <button
                            onClick={() => { resetForm(); setShowAddModal(true); }}
                            className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-8 bg-[#39FF14] text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl shadow-[0_4px_12px_rgba(57,255,20,0.2)] hover:shadow-[0_8px_24px_rgba(57,255,20,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95 animate-pulse"
                        >
                            <Plus size={16} /> Log Income
                        </button>
                    </div>
                }
            >
                <div className="space-y-8 relative">
                    {/* Ambient Background Glow Blobs for Glassmorphism */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                        <div className="absolute top-[15%] right-[5%] w-[350px] h-[350px] rounded-full bg-[#39FF14]/5 blur-[120px] animate-pulse duration-[10000ms]" />
                        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-[#00F0FF]/5 blur-[150px] animate-pulse duration-[8000ms]" />
                    </div>

                    {/* District Category Booking Tiles Navigation Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {categories.map((cat) => {
                            const IconComp = cat.icon;
                            return (
                                <Link 
                                    key={cat.name} 
                                    to={cat.path}
                                    className={cn(
                                        "relative overflow-hidden group p-5 rounded-3xl border bg-gradient-to-br bg-zinc-900/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/60 select-none",
                                        cat.borderColor,
                                        cat.glow,
                                        cat.active && "border-[#39FF14]/40 bg-[#39FF14]/5 shadow-[0_0_20px_rgba(57,255,20,0.06)]"
                                    )}
                                >
                                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.03] transition-opacity duration-300 group-hover:opacity-[0.07]", cat.bgGradient)} />
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={cn("p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", cat.color)}>
                                            <IconComp size={16} />
                                        </div>
                                        <span className={cn(
                                            "text-[7px] font-black px-2 py-0.5 rounded-full tracking-widest border uppercase",
                                            cat.active 
                                                ? "bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20" 
                                                : "bg-white/5 text-gray-500 border-white/5"
                                        )}>
                                            {cat.badge}
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-black uppercase text-white tracking-wider mb-1">{cat.name}</h4>
                                    <p className="text-[9px] font-bold text-gray-400 leading-snug line-clamp-1">{cat.desc}</p>
                                    <p className="text-[8px] font-medium text-gray-600 leading-normal line-clamp-2 mt-1.5 group-hover:text-gray-500 transition-colors">{cat.info}</p>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Advanced Command Filter Panel */}
                    <div className="bg-zinc-900/40 border border-white/5 rounded-2xl md:rounded-[2.5rem] p-4 backdrop-blur-3xl space-y-4">
                        {/* First Row: Search & View modes */}
                        <div className="flex flex-col xl:flex-row items-center gap-4">
                            <div className="relative flex-1 w-full group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#39FF14] transition-colors" size={18} />
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by client, sponsor, receiver, reference or notes..."
                                    className="w-full bg-zinc-900/40 hover:bg-zinc-900/60 h-14 pl-16 pr-6 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600 border border-white/5 focus:border-[#39FF14] focus:shadow-[0_0_15px_rgba(57,255,20,0.1)]"
                                />
                            </div>

                            {/* View Mode Toggle */}
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full xl:w-auto justify-center shrink-0">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "flex-1 xl:flex-none px-6 py-3 rounded-lg transition-all flex justify-center gap-2 text-[9px] font-black uppercase tracking-widest",
                                        viewMode === 'grid' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    <LayoutGrid size={16} /> Grid
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={cn(
                                        "flex-1 xl:flex-none px-6 py-3 rounded-lg transition-all flex justify-center gap-2 text-[9px] font-black uppercase tracking-widest",
                                        viewMode === 'table' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    <FileText size={16} /> Table
                                </button>
                            </div>
                        </div>

                        {/* Second Row: Detailed filtration toggles */}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                            {/* Month selection */}
                            <div className="space-y-1.5">
                                <span className="text-[8px] text-gray-500 tracking-widest">Select Month</span>
                                <select 
                                    value={monthFilter} 
                                    onChange={(e) => setMonthFilter(e.target.value)}
                                    className="w-full bg-zinc-900/80 border border-white/10 h-12 rounded-xl px-4 text-gray-300 outline-none focus:border-[#39FF14]/40 transition-all font-bold cursor-pointer"
                                >
                                    {monthOptions.map(m => <option key={m} value={m} className="bg-zinc-950">{m}</option>)}
                                </select>
                            </div>

                            {/* Date Filter Selector */}
                            <div className="space-y-1.5">
                                <span className="text-[8px] text-gray-500 tracking-widest">Select Date</span>
                                <input 
                                    type="date"
                                    value={dateFilter} 
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full bg-zinc-900/80 border border-white/10 h-12 rounded-xl px-4 text-gray-300 outline-none focus:border-[#39FF14]/40 transition-all text-[9px] font-black uppercase tracking-widest"
                                />
                            </div>

                            {/* Category selection */}
                            <div className="space-y-1.5">
                                <span className="text-[8px] text-gray-500 tracking-widest">Category</span>
                                <select 
                                    value={categoryFilter} 
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full bg-zinc-900/80 border border-white/10 h-12 rounded-xl px-4 text-gray-300 outline-none focus:border-[#39FF14]/40 transition-all font-bold cursor-pointer"
                                >
                                    <option value="All" className="bg-zinc-950">All Categories</option>
                                    {incomeCategories.map(c => <option key={c} value={c} className="bg-zinc-950">{c}</option>)}
                                </select>
                            </div>

                            {/* Account type filter */}
                            <div className="space-y-1.5">
                                <span className="text-[8px] text-gray-500 tracking-widest">Received Account</span>
                                <select 
                                    value={accountFilter} 
                                    onChange={(e) => setAccountFilter(e.target.value)}
                                    className="w-full bg-zinc-900/80 border border-white/10 h-12 rounded-xl px-4 text-gray-300 outline-none focus:border-[#39FF14]/40 transition-all font-bold cursor-pointer"
                                >
                                    <option value="All" className="bg-zinc-950">All Accounts</option>
                                    <option value="newbi" className="bg-zinc-950">Newbi Official</option>
                                    <option value="personal" className="bg-zinc-950">Personal Account</option>
                                </select>
                            </div>

                            {/* Status filter */}
                            <div className="space-y-1.5">
                                <span className="text-[8px] text-gray-500 tracking-widest">Payment Status</span>
                                <select 
                                    value={statusFilter} 
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full bg-zinc-900/80 border border-white/10 h-12 rounded-xl px-4 text-gray-300 outline-none focus:border-[#39FF14]/40 transition-all font-bold cursor-pointer"
                                >
                                    <option value="All" className="bg-zinc-950">All Status</option>
                                    <option value="Paid" className="bg-zinc-950">Received / Cleared</option>
                                    <option value="Pending" className="bg-zinc-950">Pending / Outstanding</option>
                                </select>
                            </div>

                            {/* Clear/Reset button */}
                            <div className="flex items-end justify-end">
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setMonthFilter(new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                                        setCategoryFilter('All');
                                        setStatusFilter('All');
                                        setAccountFilter('All');
                                        setDateFilter('');
                                    }}
                                    className="w-full h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2 font-black tracking-widest uppercase hover:border-[#39FF14]/30"
                                >
                                    <X size={12} /> Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Income Display */}
                    <AnimatePresence mode="wait">
                        {viewMode === 'grid' ? (
                            <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredIncomes.map((inc, i) => (
                                    <motion.div key={inc.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="h-full flex flex-col">
                                        <Card className="group relative p-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[2.5rem] flex flex-col justify-between h-full overflow-hidden hover:border-white/20 duration-500 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(57,255,20,0.06)]">
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none"><IndianRupee size={100} /></div>
                                            <div>
                                                {/* Top badges */}
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-[#39FF14] bg-[#39FF14]/10 px-3 py-1 rounded-full border border-[#39FF14]/20">
                                                            {inc.category}
                                                        </span>
                                                        <div className={cn("w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]", inc.status === 'Paid' ? 'text-[#39FF14] bg-[#39FF14]' : 'text-yellow-500 bg-yellow-500')} />
                                                    </div>
                                                    <div className="flex items-center gap-1.5 z-20">
                                                        <button onClick={() => openEdit(inc)} className="p-2 bg-white/5 hover:bg-white/10 text-gray-500 rounded-xl transition-all border border-white/5 hover:text-white" title="Edit Income"><Edit size={14} /></button>
                                                        {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                            <button onClick={() => handleDeleteIncome(inc.id)} className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-gray-500 rounded-xl transition-all border border-white/5" title="Purge Record"><Trash2 size={14} /></button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Details section */}
                                                <h3 className="text-xl font-black font-heading tracking-tighter uppercase italic text-white mb-2 leading-tight line-clamp-2">{inc.sourceName}</h3>
                                                
                                                <div className="space-y-2 mt-5 p-4 bg-black/40 border border-white/5 rounded-2xl text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                                    <div className="flex justify-between"><span className="text-gray-600">Date:</span> <span className="text-gray-400 font-mono">{new Date(inc.date).toLocaleDateString()}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-600">Payment Mode:</span> <span className="text-white">{inc.paymentMode}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-600">Account:</span> <span className="text-white">{inc.accountType === 'personal' ? `Personal (${inc.receiverName})` : 'Newbi Official'}</span></div>
                                                </div>

                                                {/* Transaction Ref copy block */}
                                                {inc.transactionRef && (
                                                    <div className="mt-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-3 text-[8px] font-black uppercase tracking-widest z-20 relative">
                                                        <div className="truncate flex-1">
                                                            <span className="text-gray-600 block text-[6px]">Transaction Ref</span>
                                                            <span className="text-white font-mono select-all truncate block mt-0.5">{inc.transactionRef}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => copyToClipboard(inc.transactionRef)}
                                                            className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg border border-white/5 transition-all shrink-0"
                                                            title="Copy Reference"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bottom metrics and Action toggles */}
                                            <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/5 shrink-0 relative z-10">
                                                <div className="text-xl font-black text-white tabular-nums flex items-center gap-0.5 leading-none">
                                                    <IndianRupee className="size-4 stroke-[2] text-[#39FF14]" />
                                                    {inc.amount?.toLocaleString()}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {inc.attachmentUrl ? (
                                                        <a 
                                                            href={inc.attachmentUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="h-10 px-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/5 flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            <Eye size={12} /> Proof
                                                        </a>
                                                    ) : (
                                                        <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest flex items-center gap-1 pl-2"><AlertTriangle size={10} /> No Proof</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleToggleStatus(inc)}
                                                        className={cn(
                                                            "h-10 px-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border",
                                                            inc.status === 'Paid' 
                                                                ? "bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/25 hover:bg-[#39FF14]/20 shadow-[0_0_10px_rgba(57,255,20,0.15)]" 
                                                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/25 hover:bg-yellow-500/20"
                                                        )}
                                                    >
                                                        {inc.status === 'Paid' ? 'Cleared' : 'Outstanding'}
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div key="table" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="overflow-x-auto scrollbar-hide">
                                <Card className="min-w-[1000px] bg-zinc-900/40 border-white/5 rounded-3xl p-0 border overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                                                <th className="p-6">Income Source</th>
                                                <th className="p-6">Amount</th>
                                                <th className="p-6">Category</th>
                                                <th className="p-6">Received Account</th>
                                                <th className="p-6">Transaction Ref</th>
                                                <th className="p-6">Payment Mode</th>
                                                <th className="p-6">Date</th>
                                                <th className="p-6">Status</th>
                                                <th className="p-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-[11px] font-bold uppercase tracking-wider">
                                            {filteredIncomes.map((inc) => (
                                                <tr key={inc.id} className="hover:bg-white/[0.01] transition-colors group">
                                                    <td className="p-6">
                                                        <div className="text-xs font-black text-white">{inc.sourceName}</div>
                                                        {inc.notes && <div className="text-[8px] text-gray-600 tracking-wide mt-1 lowercase normal-case">{inc.notes}</div>}
                                                    </td>
                                                    <td className="p-6 text-white font-black tabular-nums">
                                                        <div className="flex items-center gap-0.5">₹{inc.amount?.toLocaleString()}</div>
                                                    </td>
                                                    <td className="p-6 text-[#39FF14] font-black text-[9px]">{inc.category}</td>
                                                    <td className="p-6 text-gray-400">
                                                        {inc.accountType === 'personal' ? `Personal (${inc.receiverName})` : 'Newbi Official'}
                                                    </td>
                                                    <td className="p-6 text-gray-400">
                                                        {inc.transactionRef ? (
                                                            <div className="flex items-center gap-2 max-w-[200px]">
                                                                <span className="font-mono text-[9px] truncate text-white select-all">{inc.transactionRef}</span>
                                                                <button 
                                                                    onClick={() => copyToClipboard(inc.transactionRef)}
                                                                    className="p-1.5 hover:bg-white/10 text-gray-500 rounded hover:text-white transition-all shrink-0"
                                                                    title="Copy Reference"
                                                                >
                                                                    <Copy size={10} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[8px] text-gray-700 font-black">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="p-6 text-gray-400">{inc.paymentMode}</td>
                                                    <td className="p-6 text-gray-500 font-mono text-[10px]">{new Date(inc.date).toLocaleDateString()}</td>
                                                    <td className="p-6">
                                                        <button 
                                                            onClick={() => handleToggleStatus(inc)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border",
                                                                inc.status === 'Paid' 
                                                                    ? "bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20" 
                                                                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                                            )}
                                                        >
                                                            {inc.status === 'Paid' ? 'Cleared' : 'Outstanding'}
                                                        </button>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {inc.attachmentUrl && (
                                                                <a href={inc.attachmentUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-white transition-colors"><Eye size={16} /></a>
                                                            )}
                                                            <button onClick={() => openEdit(inc)} className="p-2 text-gray-500 hover:text-white transition-colors"><Edit size={16} /></button>
                                                            {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                                <button onClick={() => handleDeleteIncome(inc.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </AdminCommunityHubLayout>

            {/* Add Income Drawer Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
                        <motion.div 
                            initial={{ x: '100%' }} 
                            animate={{ x: 0 }} 
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-full max-w-xl bg-zinc-950/95 border-l-2 border-[#39FF14] shadow-2xl z-[101] flex flex-col text-white"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black font-heading tracking-tighter uppercase italic text-white">LOG <span className="text-[#39FF14]">INCOME.</span></h2>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Record non-invoice incoming revenue</p>
                                </div>
                                <button type="button" onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all"><X size={14} /></button>
                            </div>
                            
                            <form onSubmit={handleCreateIncome} className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar pb-24">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Source Name (Sponsor/Client) *</label>
                                            <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Sprite Sponsor / Offline Ticket Cash" className="h-12 border-white/10 bg-white/5 focus:border-[#39FF14]" required />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Amount (INR) *</label>
                                            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" className="h-12 border-white/10 bg-white/5 focus:border-[#39FF14]" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Category *</label>
                                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-lg text-xs font-semibold px-4 text-white outline-none focus:border-[#39FF14] transition-all">
                                                {incomeCategories.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Date *</label>
                                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 border-white/10 bg-white/5 focus:border-[#39FF14]" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Destination Account *</label>
                                            <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-lg text-xs font-semibold px-4 text-white outline-none focus:border-[#39FF14] transition-all">
                                                <option value="newbi" className="bg-zinc-900">Official Newbi Account</option>
                                                <option value="personal" className="bg-zinc-900">Personal Account</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                                {accountType === 'personal' ? 'Receiver Name (Team Member) *' : 'Receiver Entity'}
                                            </label>
                                            <Input 
                                                value={accountType === 'personal' ? receiverName : 'Newbi Core Account'} 
                                                onChange={(e) => setReceiverName(e.target.value)} 
                                                placeholder={accountType === 'personal' ? "e.g. Team member name" : "Newbi Core Account"} 
                                                className="h-12 border-white/10 bg-white/5 focus:border-[#39FF14]"
                                                disabled={accountType === 'newbi'}
                                                required={accountType === 'personal'}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payment Method</label>
                                            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-lg text-xs font-semibold px-4 text-white outline-none focus:border-[#39FF14] transition-all">
                                                {paymentModes.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Status</label>
                                            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-lg text-xs font-semibold px-4 text-white outline-none focus:border-[#39FF14] transition-all">
                                                <option value="Paid" className="bg-zinc-900">Received / Cleared</option>
                                                <option value="Pending" className="bg-zinc-900">Pending / Outstanding</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Transaction Ref / Details</label>
                                            <Input 
                                                value={transactionRef} 
                                                onChange={(e) => setTransactionRef(e.target.value)} 
                                                placeholder="e.g. UPI Ref / Bank IMPS ID" 
                                                className="h-12 border-white/10 bg-white/5 focus:border-[#39FF14]" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Proof Attachment (Image/PDF)</label>
                                            <div className="relative group cursor-pointer h-12 border border-dashed border-white/10 rounded-lg flex items-center justify-center gap-3 bg-white/5 hover:border-[#39FF14]/40 transition-all">
                                                <input type="file" onChange={(e) => handleAttachmentUpload(e, setAttachmentUrl)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                <Upload className="text-gray-500 group-hover:text-[#39FF14]" size={16} />
                                                <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">
                                                    {uploadingAttachment ? 'UPLOADING...' : (attachmentUrl ? 'CHANGE ATTACHMENT' : 'CHOOSE FILE')}
                                                </span>
                                            </div>
                                            {attachmentUrl && (
                                                <div className="text-[8px] text-[#39FF14] font-bold uppercase tracking-wider mt-1 truncate">
                                                    File linked: <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">View File</a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Internal Notes</label>
                                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add transaction details or verification reference..." className="w-full bg-white/5 border border-white/10 h-24 rounded-lg text-xs font-semibold p-4 text-white outline-none focus:border-[#39FF14] placeholder:text-white/20 transition-all" />
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/10 transition-all font-bold">
                                            Cancel
                                        </button>
                                        <Button type="submit" className="flex-1 h-12 bg-[#39FF14] text-black font-black uppercase tracking-[0.2em] text-[9px] rounded-xl" disabled={uploadingAttachment}>
                                            LOG INCOME RECORD
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Edit Income Drawer Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
                        <motion.div 
                            initial={{ x: '100%' }} 
                            animate={{ x: 0 }} 
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-full max-w-xl bg-zinc-950/95 border-l-2 border-[#39FF14] shadow-2xl z-[101] flex flex-col text-white"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black font-heading tracking-tighter uppercase italic text-white">EDIT <span className="text-[#39FF14]">INCOME.</span></h2>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Modify income details</p>
                                </div>
                                <button type="button" onClick={() => setShowEditModal(null)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all"><X size={14} /></button>
                            </div>
                            
                            <form onSubmit={handleUpdateIncome} className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar pb-24">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Source Name (Sponsor/Client) *</label>
                                            <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Sprite Sponsor" className="h-12 border-white/10 bg-white/5 focus:border-[#39FF14]" required />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Amount (INR) *</label>
                                            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" className="h-12 border-white/10 bg-white/5 focus:border-[#39FF14]" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Category *</label>
                                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-lg text-xs font-semibold px-4 text-white outline-none focus:border-[#39FF14] transition-all">
                                                {incomeCategories.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Date *</label>
                                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 border-white/10 bg-white/5 focus:border-[#39FF14]" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Destination Account *</label>
                                            <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-lg text-xs font-semibold px-4 text-white outline-none focus:border-[#39FF14] transition-all">
                                                <option value="newbi" className="bg-zinc-900">Official Newbi Account</option>
                                                <option value="personal" className="bg-zinc-900">Personal Account</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                                {accountType === 'personal' ? 'Receiver Name (Team Member) *' : 'Receiver Entity'}
                                            </label>
                                            <Input 
                                                value={accountType === 'personal' ? receiverName : 'Newbi Core Account'} 
                                                onChange={(e) => setReceiverName(e.target.value)} 
                                                placeholder={accountType === 'personal' ? "e.g. Team member name" : "Newbi Core Account"} 
                                                className="h-12 border-white/10 bg-white/5 focus:border-[#39FF14]"
                                                disabled={accountType === 'newbi'}
                                                required={accountType === 'personal'}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Payment Method</label>
                                            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-lg text-xs font-semibold px-4 text-white outline-none focus:border-[#39FF14] transition-all">
                                                {paymentModes.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Status</label>
                                            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-white/5 border border-white/10 h-12 rounded-lg text-xs font-semibold px-4 text-white outline-none focus:border-[#39FF14] transition-all">
                                                <option value="Paid" className="bg-zinc-900">Received / Cleared</option>
                                                <option value="Pending" className="bg-zinc-900">Pending / Outstanding</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Transaction Ref / Details</label>
                                            <Input 
                                                value={transactionRef} 
                                                onChange={(e) => setTransactionRef(e.target.value)} 
                                                placeholder="e.g. UPI Ref / Bank IMPS ID" 
                                                className="h-12 border-white/10 bg-white/5 focus:border-[#39FF14]" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Proof Attachment (Image/PDF)</label>
                                            <div className="relative group cursor-pointer h-12 border border-dashed border-white/10 rounded-lg flex items-center justify-center gap-3 bg-white/5 hover:border-[#39FF14]/40 transition-all">
                                                <input type="file" onChange={(e) => handleAttachmentUpload(e, setAttachmentUrl)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                <Upload className="text-gray-500 group-hover:text-[#39FF14]" size={16} />
                                                <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">
                                                    {uploadingAttachment ? 'UPLOADING...' : (attachmentUrl ? 'CHANGE ATTACHMENT' : 'CHOOSE FILE')}
                                                </span>
                                            </div>
                                            {attachmentUrl && (
                                                <div className="text-[8px] text-[#39FF14] font-bold uppercase tracking-wider mt-1 truncate">
                                                    File linked: <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">View File</a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Internal Notes</label>
                                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add transaction details or verification reference..." className="w-full bg-white/5 border border-white/10 h-24 rounded-lg text-xs font-semibold p-4 text-white outline-none focus:border-[#39FF14] placeholder:text-white/20 transition-all" />
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setShowEditModal(null)} className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-white/10 transition-all font-bold">
                                            Cancel
                                        </button>
                                        <Button type="submit" className="flex-1 h-12 bg-[#39FF14] text-black font-black uppercase tracking-[0.2em] text-[9px] rounded-xl" disabled={uploadingAttachment}>
                                            UPDATE INCOME RECORD
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default OtherIncomeManagement;
