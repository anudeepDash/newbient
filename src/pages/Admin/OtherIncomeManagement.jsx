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
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const OtherIncomeManagement = () => {
    useStoreSubscription(['otherIncomes']);
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

    const navPills = [
        { name: 'Overview', path: '/admin/finance', icon: LayoutGrid, isActive: false },
        { name: 'Expense Ledger', path: '/admin/spends', icon: IndianRupee, isActive: false },
        { name: 'Other Revenue', path: '/admin/other-income', icon: FileSpreadsheet, isActive: true },
        { name: 'Payee Database', path: '/admin/payees', icon: User, isActive: false }
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
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-3">
                        {navPills.map((pill) => {
                            const Icon = pill.icon;
                            return (
                                <Link key={pill.name} to={pill.path}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 group",
                                        pill.isActive 
                                            ? "bg-[#39FF14] text-black border-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.3)]" 
                                            : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/30 hover:text-white hover:bg-white/[0.05]"
                                    )}
                                >
                                    <Icon size={14} className={cn("transition-transform group-hover:scale-110", pill.isActive ? "text-black" : "text-[#39FF14]")} />
                                    {pill.name}
                                </Link>
                            )
                        })}
                    </motion.div>

                    {/* Advanced Command Filter Panel */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-4">
                        {/* First Row: Search & View modes */}
                        <div className="flex flex-col xl:flex-row items-center gap-4">
                            <div className="relative flex-1 w-full group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#39FF14] transition-colors" size={16} />
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by client, sponsor, receiver, reference or notes..."
                                    className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 pl-10 pr-3 outline-none focus:border-[#39FF14] transition-all placeholder:text-zinc-600"
                                />
                            </div>

                            {/* View Mode Toggle */}
                            <div className="flex bg-zinc-950/40 p-1 rounded-xl border border-white/10 w-full xl:w-auto justify-center shrink-0">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "flex-1 xl:flex-none px-6 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest h-8",
                                        viewMode === 'grid' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white"
                                    )}
                                >
                                    <LayoutGrid size={14} /> Grid
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={cn(
                                        "flex-1 xl:flex-none px-6 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest h-8",
                                        viewMode === 'table' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white"
                                    )}
                                >
                                    <FileText size={14} /> Table
                                </button>
                            </div>
                        </div>

                        {/* Second Row: Detailed filtration toggles */}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                            {/* Month selection */}
                            <select 
                                value={monthFilter} 
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 px-3 outline-none focus:border-[#39FF14] transition-all cursor-pointer"
                            >
                                {monthOptions.map(m => <option key={m} value={m} className="bg-zinc-950">{m}</option>)}
                            </select>

                            {/* Date Filter Selector */}
                            <input 
                                type="date"
                                value={dateFilter} 
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 px-3 outline-none focus:border-[#39FF14] transition-all"
                            />

                            {/* Category selection */}
                            <select 
                                value={categoryFilter} 
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 px-3 outline-none focus:border-[#39FF14] transition-all cursor-pointer"
                            >
                                <option value="All" className="bg-zinc-950">All Categories</option>
                                {incomeCategories.map(c => <option key={c} value={c} className="bg-zinc-950">{c}</option>)}
                            </select>

                            {/* Account type filter */}
                            <select 
                                value={accountFilter} 
                                onChange={(e) => setAccountFilter(e.target.value)}
                                className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 px-3 outline-none focus:border-[#39FF14] transition-all cursor-pointer"
                            >
                                <option value="All" className="bg-zinc-950">All Accounts</option>
                                <option value="newbi" className="bg-zinc-950">Newbi Official</option>
                                <option value="personal" className="bg-zinc-950">Personal Account</option>
                            </select>

                            {/* Status filter */}
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 px-3 outline-none focus:border-[#39FF14] transition-all cursor-pointer"
                            >
                                <option value="All" className="bg-zinc-950">All Status</option>
                                <option value="Paid" className="bg-zinc-950">Received / Cleared</option>
                                <option value="Pending" className="bg-zinc-950">Pending / Outstanding</option>
                            </select>

                            {/* Clear/Reset button */}
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setMonthFilter(new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                                    setCategoryFilter('All');
                                    setStatusFilter('All');
                                    setAccountFilter('All');
                                    setDateFilter('');
                                }}
                                className="w-full h-10 bg-white/[0.03] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 text-[10px] font-extrabold tracking-widest uppercase hover:border-white/30"
                            >
                                <X size={12} /> Clear
                            </button>
                        </div>
                    </motion.div>

                    {/* Income Display */}
                    <AnimatePresence mode="wait">
                        {filteredIncomes.length === 0 ? (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-20">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No records found</span>
                            </motion.div>
                        ) : viewMode === 'grid' ? (
                            <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredIncomes.map((inc, i) => (
                                    <motion.div key={inc.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + (i * 0.05) }} className="h-full flex flex-col">
                                        <div className="group relative p-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col justify-between h-full overflow-hidden hover:border-white/20 hover:bg-white/[0.04] transition-all">
                                            <div>
                                                {/* Top badges */}
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                                            {inc.category}
                                                        </span>
                                                        <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border w-fit", inc.status === 'Paid' ? 'text-[#39FF14] bg-[#39FF14]/10 border-[#39FF14]/20' : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20')}>
                                                            {inc.status}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 z-20">
                                                        <button onClick={() => openEdit(inc)} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-xl transition-all border border-white/5 hover:text-white" title="Edit Income"><Edit size={14} /></button>
                                                        {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                            <button onClick={() => handleDeleteIncome(inc.id)} className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-zinc-400 rounded-xl transition-all border border-white/5" title="Purge Record"><Trash2 size={14} /></button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Details section */}
                                                <h3 className="text-xl font-black uppercase text-white mb-2 leading-tight line-clamp-2">{inc.sourceName}</h3>
                                                
                                                <div className="space-y-1 mt-4">
                                                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Amount</div>
                                                    <div className="text-2xl font-mono font-black text-white flex items-center gap-1">
                                                        ₹{inc.amount?.toLocaleString()}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mt-5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                                                    <div className="flex justify-between"><span>Date:</span> <span className="text-white">{new Date(inc.date).toLocaleDateString()}</span></div>
                                                    <div className="flex justify-between"><span>Payment Mode:</span> <span className="text-white">{inc.paymentMode}</span></div>
                                                    <div className="flex justify-between"><span>Account:</span> <span className="text-white">{inc.accountType === 'personal' ? `Personal (${inc.receiverName})` : 'Newbi Official'}</span></div>
                                                </div>

                                                {/* Transaction Ref copy block */}
                                                {inc.transactionRef && (
                                                    <div className="mt-4 p-3 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between gap-3 text-[8px] font-black uppercase tracking-widest z-20 relative">
                                                        <div className="truncate flex-1">
                                                            <span className="text-zinc-500 block text-[7px]">Transaction Ref</span>
                                                            <span className="text-white font-mono select-all truncate block mt-0.5">{inc.transactionRef}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => copyToClipboard(inc.transactionRef)}
                                                            className="p-2 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-all shrink-0"
                                                            title="Copy Reference"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bottom metrics and Action toggles */}
                                            <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10 shrink-0 relative z-10">
                                                <div className="flex items-center gap-2 w-full">
                                                    {inc.attachmentUrl ? (
                                                        <a 
                                                            href={inc.attachmentUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="flex-1 h-10 px-3 bg-white/[0.03] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-xl border border-white/10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            <Eye size={12} /> View Proof
                                                        </a>
                                                    ) : (
                                                        <span className="flex-1 h-10 px-3 flex items-center justify-center text-[9px] text-zinc-600 font-black uppercase tracking-widest gap-1"><AlertTriangle size={12} /> No Proof</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleToggleStatus(inc)}
                                                        className="flex-1 h-10 px-3 bg-white/[0.03] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-xl border border-white/10 flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Toggle Status
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div key="table" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.3 }} className="overflow-x-auto custom-scrollbar">
                                <div className="min-w-[1000px] bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-0 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                                <th className="p-6">Income Source</th>
                                                <th className="p-6">Amount</th>
                                                <th className="p-6">Category</th>
                                                <th className="p-6">Received Account</th>
                                                <th className="p-6">Transaction Ref</th>
                                                <th className="p-6">Date</th>
                                                <th className="p-6">Status</th>
                                                <th className="p-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-[11px] font-bold">
                                            {filteredIncomes.map((inc) => (
                                                <tr key={inc.id} className="hover:bg-white/[0.03] transition-colors group">
                                                    <td className="p-6">
                                                        <div className="text-xs font-black text-white uppercase">{inc.sourceName}</div>
                                                        {inc.notes && <div className="text-[9px] text-zinc-500 tracking-wide mt-1 line-clamp-1">{inc.notes}</div>}
                                                    </td>
                                                    <td className="p-6 text-white font-black font-mono">
                                                        ₹{inc.amount?.toLocaleString()}
                                                    </td>
                                                    <td className="p-6 text-zinc-400 uppercase text-[9px] font-black">{inc.category}</td>
                                                    <td className="p-6 text-zinc-400 text-[10px] uppercase font-bold">
                                                        {inc.accountType === 'personal' ? `Personal (${inc.receiverName})` : 'Newbi Official'}
                                                        <div className="text-zinc-500 text-[8px] mt-0.5">{inc.paymentMode}</div>
                                                    </td>
                                                    <td className="p-6 text-zinc-400">
                                                        {inc.transactionRef ? (
                                                            <div className="flex items-center gap-2 max-w-[200px]">
                                                                <span className="font-mono text-[10px] truncate text-white select-all">{inc.transactionRef}</span>
                                                                <button 
                                                                    onClick={() => copyToClipboard(inc.transactionRef)}
                                                                    className="p-1.5 hover:bg-white/10 text-zinc-500 rounded hover:text-white transition-all shrink-0"
                                                                    title="Copy Reference"
                                                                >
                                                                    <Copy size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] text-zinc-600 font-black uppercase">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="p-6 text-zinc-400 font-mono text-[10px]">{new Date(inc.date).toLocaleDateString()}</td>
                                                    <td className="p-6">
                                                        <button 
                                                            onClick={() => handleToggleStatus(inc)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all",
                                                                inc.status === 'Paid' 
                                                                    ? "bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20 hover:bg-[#39FF14]/20" 
                                                                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20"
                                                            )}
                                                        >
                                                            {inc.status}
                                                        </button>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {inc.attachmentUrl && (
                                                                <a href={inc.attachmentUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-lg"><Eye size={14} /></a>
                                                            )}
                                                            <button onClick={() => openEdit(inc)} className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-lg"><Edit size={14} /></button>
                                                            {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                                <button onClick={() => handleDeleteIncome(inc.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg"><Trash2 size={14} /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
                            className="fixed top-0 right-0 h-full w-full max-w-xl bg-zinc-950/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl z-[101] flex flex-col text-white"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black uppercase text-white">LOG INCOME</h2>
                                </div>
                                <button type="button" onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-all"><X size={14} /></button>
                            </div>
                            
                            <form onSubmit={handleCreateIncome} className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar pb-24">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Source Name (Sponsor/Client) *</label>
                                            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Sprite Sponsor / Offline Ticket Cash" className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all" required />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Amount (INR) *</label>
                                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Category *</label>
                                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer">
                                                {incomeCategories.map(c => <option key={c} value={c} className="bg-zinc-950">{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Date *</label>
                                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Destination Account *</label>
                                            <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer">
                                                <option value="newbi" className="bg-zinc-950">Official Newbi Account</option>
                                                <option value="personal" className="bg-zinc-950">Personal Account</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">
                                                {accountType === 'personal' ? 'Receiver Name (Team Member) *' : 'Receiver Entity'}
                                            </label>
                                            <input 
                                                value={accountType === 'personal' ? receiverName : 'Newbi Core Account'} 
                                                onChange={(e) => setReceiverName(e.target.value)} 
                                                placeholder={accountType === 'personal' ? "e.g. Team member name" : "Newbi Core Account"} 
                                                className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={accountType === 'newbi'}
                                                required={accountType === 'personal'}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Payment Method</label>
                                            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer">
                                                {paymentModes.map(m => <option key={m} value={m} className="bg-zinc-950">{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Status</label>
                                            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer">
                                                <option value="Paid" className="bg-zinc-950">Received / Cleared</option>
                                                <option value="Pending" className="bg-zinc-950">Pending / Outstanding</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Transaction Ref / Details</label>
                                            <input 
                                                value={transactionRef} 
                                                onChange={(e) => setTransactionRef(e.target.value)} 
                                                placeholder="e.g. UPI Ref / Bank IMPS ID" 
                                                className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Proof Attachment (Image/PDF)</label>
                                            <div className="relative group cursor-pointer h-12 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-3 bg-zinc-900/50 hover:border-white/30 transition-all">
                                                <input type="file" onChange={(e) => handleAttachmentUpload(e, setAttachmentUrl)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                <Upload className="text-zinc-500 group-hover:text-white transition-colors" size={16} />
                                                <span className="text-[10px] font-black text-zinc-500 group-hover:text-white uppercase tracking-widest transition-colors">
                                                    {uploadingAttachment ? 'UPLOADING...' : (attachmentUrl ? 'CHANGE ATTACHMENT' : 'CHOOSE FILE')}
                                                </span>
                                            </div>
                                            {attachmentUrl && (
                                                <div className="text-[9px] text-[#39FF14] font-bold uppercase tracking-wider mt-1.5 pl-1 truncate">
                                                    File linked: <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">View File</a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Internal Notes</label>
                                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add transaction details or verification reference..." className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] min-h-[100px] resize-y transition-all" />
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 h-12 bg-white/[0.03] hover:bg-white/[0.05] text-zinc-400 hover:text-white font-black uppercase tracking-widest text-[10px] rounded-xl border border-white/10 transition-all">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={uploadingAttachment} className="flex-1 h-12 bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                            LOG INCOME RECORD
                                        </button>
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
                            className="fixed top-0 right-0 h-full w-full max-w-xl bg-zinc-950/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl z-[101] flex flex-col text-white"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black uppercase text-white">EDIT INCOME</h2>
                                </div>
                                <button type="button" onClick={() => setShowEditModal(null)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-all"><X size={14} /></button>
                            </div>
                            
                            <form onSubmit={handleUpdateIncome} className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar pb-24">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Source Name (Sponsor/Client) *</label>
                                            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Sprite Sponsor" className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all" required />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Amount (INR) *</label>
                                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Category *</label>
                                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer">
                                                {incomeCategories.map(c => <option key={c} value={c} className="bg-zinc-950">{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Date *</label>
                                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Destination Account *</label>
                                            <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer">
                                                <option value="newbi" className="bg-zinc-950">Official Newbi Account</option>
                                                <option value="personal" className="bg-zinc-950">Personal Account</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">
                                                {accountType === 'personal' ? 'Receiver Name (Team Member) *' : 'Receiver Entity'}
                                            </label>
                                            <input 
                                                value={accountType === 'personal' ? receiverName : 'Newbi Core Account'} 
                                                onChange={(e) => setReceiverName(e.target.value)} 
                                                placeholder={accountType === 'personal' ? "e.g. Team member name" : "Newbi Core Account"} 
                                                className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={accountType === 'newbi'}
                                                required={accountType === 'personal'}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Payment Method</label>
                                            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer">
                                                {paymentModes.map(m => <option key={m} value={m} className="bg-zinc-950">{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Status</label>
                                            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all cursor-pointer">
                                                <option value="Paid" className="bg-zinc-950">Received / Cleared</option>
                                                <option value="Pending" className="bg-zinc-950">Pending / Outstanding</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Transaction Ref / Details</label>
                                            <input 
                                                value={transactionRef} 
                                                onChange={(e) => setTransactionRef(e.target.value)} 
                                                placeholder="e.g. UPI Ref / Bank IMPS ID" 
                                                className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl px-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Proof Attachment (Image/PDF)</label>
                                            <div className="relative group cursor-pointer h-12 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-3 bg-zinc-900/50 hover:border-white/30 transition-all">
                                                <input type="file" onChange={(e) => handleAttachmentUpload(e, setAttachmentUrl)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                <Upload className="text-zinc-500 group-hover:text-white transition-colors" size={16} />
                                                <span className="text-[10px] font-black text-zinc-500 group-hover:text-white uppercase tracking-widest transition-colors">
                                                    {uploadingAttachment ? 'UPLOADING...' : (attachmentUrl ? 'CHANGE ATTACHMENT' : 'CHOOSE FILE')}
                                                </span>
                                            </div>
                                            {attachmentUrl && (
                                                <div className="text-[9px] text-[#39FF14] font-bold uppercase tracking-wider mt-1.5 pl-1 truncate">
                                                    File linked: <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">View File</a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-1">Internal Notes</label>
                                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add transaction details or verification reference..." className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-[#39FF14] min-h-[100px] resize-y transition-all" />
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setShowEditModal(null)} className="flex-1 h-12 bg-white/[0.03] hover:bg-white/[0.05] text-zinc-400 hover:text-white font-black uppercase tracking-widest text-[10px] rounded-xl border border-white/10 transition-all">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={uploadingAttachment} className="flex-1 h-12 bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                            UPDATE INCOME RECORD
                                        </button>
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
