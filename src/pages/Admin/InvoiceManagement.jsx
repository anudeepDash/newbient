import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Copy, LayoutGrid, Plus, Eye, CheckCircle, FileText, Filter, Download, X, Search, Sparkles, Upload, DollarSign, Mail, Send, CopyPlus, MoreVertical, FileSpreadsheet, ShieldCheck, Activity, Calendar, Smartphone, Globe, MessageCircle } from 'lucide-react';
import { useStore } from '../../lib/store';
import { sendInvoiceEmail } from '../../lib/email';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const InvoiceManagement = () => {
    const navigate = useNavigate();
    const { invoices, updateInvoice, deleteInvoice, addInvoice, user } = useStore();
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedAnalytics, setSelectedAnalytics] = useState(null);

    const vaultTabs = [
        { name: 'Invoices', path: '/admin/invoices', icon: FileText, color: 'text-neon-blue' },
        { name: 'Proposals', path: '/admin/proposals', icon: FileSpreadsheet, color: 'text-neon-green' },
        { name: 'Contracts', path: '/admin/agreements', icon: ShieldCheck, color: 'text-[#A855F7]' },
    ];

    // Quick Upload State
    const [showQuickUpload, setShowQuickUpload] = useState(false);
    const [quickClientName, setQuickClientName] = useState('');
    const [quickFile, setQuickFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const filteredInvoices = invoices
        .filter(inv => {
            if (user?.role === 'editor') {
                return inv.createdBy === user?.uid;
            }
            return true;
        })
        .filter(inv => filter === 'All' ? true : inv.status === filter)
        .filter(inv => {
            if (!searchTerm) return true;
            const clientName = inv.clientName || '';
            const invoiceNumber = inv.invoiceNumber || '';
            return clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
        });

    const handleCopyLink = (id) => {
        const link = `${window.location.origin}/invoice/${id}`;
        navigator.clipboard.writeText(link);
        useStore.getState().addToast(`Invoice link copied!`, 'success');
    };

    const handleDelete = (id, inv) => {
        // Permission Check: Editor cannot delete anything. Super Admin can delete anything except developer docs? 
        // User said: "editors cannot delete anything... they can create new document which can be deleted by super admin and developer"
        if (user?.role === 'editor') {
            useStore.getState().addToast("Permission Denied: Editors cannot delete documents.", 'error');
            return;
        }

        if (window.confirm('Are you sure you want to delete this invoice?')) {
            deleteInvoice(id);
        }
    };

    const handleDuplicate = async (invoice) => {
        if (window.confirm('Duplicate this invoice?')) {
            try {
                const { id, ...restOptions } = invoice;
                const newInvoice = {
                    ...restOptions,
                    invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
                    status: 'Pending',
                    createdAt: new Date().toISOString(),
                    issueDate: new Date().toISOString().split('T')[0]
                };
                await addInvoice(newInvoice);
                useStore.getState().addToast('Invoice duplicated.', 'success');
            } catch (error) {
                useStore.getState().addToast("Failed to duplicate invoice.", 'error');
            }
        }
    };

    const handleSendEmail = async (invoice) => {
        const email = prompt("Enter client's email address:", invoice.clientEmail || "");
        if (!email) return;

        const amount = `₹${(invoice.total || invoice.amount || 0).toLocaleString()}`;
        const url = `${window.location.origin}/invoice/${invoice.id}`;
        
        try {
            const res = await sendInvoiceEmail(email, invoice.invoiceNumber, amount, url);
            if (res.success) {
                useStore.getState().addToast("Invoice link sent successfully!", 'success');
            } else {
                useStore.getState().addToast("Failed to send email.", 'error');
            }
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("An error occurred.", 'error');
        }
    };

    const handleMarkAsPaid = async (invoice) => {
        if (window.confirm('Mark as Paid?')) {
            try {
                await updateInvoice(invoice.id, { status: 'Paid' });
            } catch (error) {
                useStore.getState().addToast("Failed to update status.", 'error');
            }
        }
    };

    const handleQuickUpload = async (e) => {
        e.preventDefault();
        if (!quickClientName || !quickFile) return;
        setUploading(true);
        try {
            const toBase64 = (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
            const base64Data = await toBase64(quickFile);
            const newInvoice = {
                invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
                clientName: quickClientName,
                issueDate: new Date().toISOString().split('T')[0],
                status: 'Pending',
                createdAt: new Date().toISOString(),
                pdfUrl: base64Data,
                type: 'upload'
            };
            await addInvoice(newInvoice);
            setShowQuickUpload(false);
            setQuickClientName('');
            setQuickFile(null);
        } catch (error) {
            useStore.getState().addToast("Failed to upload.", 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'INVOICE',
                subtitle: 'VAULT',
                accentClass: 'text-neon-blue',
                icon: FileText
            }}
            tabs={vaultTabs}
            accentColor="neon-blue"
            action={
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowQuickUpload(true)}
                        className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-6 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black uppercase tracking-widest text-[8px] md:text-[9px] rounded-xl border border-white/5 transition-all flex items-center justify-center gap-2"
                    >
                        <Upload size={14} /> Quick Upload
                    </button>
                    <Link
                        to="/admin/create-invoice"
                        className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-8 bg-neon-blue text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl shadow-[0_4px_12px_rgba(0,209,255,0.2)] hover:shadow-[0_8px_24px_rgba(0,209,255,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95"
                    >
                        <Plus size={16} /> New Invoice
                    </Link>
                </div>
            }
        >
            <div className="relative z-10">
                {/* Dynamic Command Center - Optimized for Mobile */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl md:rounded-[2.5rem] p-1.5 md:p-2 mb-8 md:mb-12 backdrop-blur-3xl flex flex-col xl:flex-row items-center gap-2 md:gap-4">
                    {/* Search Field */}
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={20} />
                        <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search invoices..."
                            className="w-full bg-transparent h-14 md:h-16 pl-16 md:pl-20 pr-6 md:pr-8 rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
                        {/* Status Filter Toggles */}
                        <div className="flex bg-black/40 p-1 rounded-xl md:rounded-[1.5rem] border border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
                            <div className="flex min-w-max md:min-w-0 flex-1">
                                {['All', 'Pending', 'Paid'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setFilter(s)}
                                        className={cn(
                                            "flex-1 px-3 sm:px-6 md:px-10 py-2.5 rounded-lg md:rounded-xl text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 min-w-[70px] sm:min-w-[100px] md:min-w-[120px]",
                                            filter === s 
                                                ? "bg-white text-black shadow-[0_10px_25px_rgba(255,255,255,0.2)]" 
                                                : "text-gray-500 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-black/40 p-1 rounded-xl md:rounded-[1.5rem] border border-white/5 w-full sm:w-auto justify-center">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "flex-1 sm:flex-none p-3 rounded-lg md:rounded-xl transition-all duration-300 flex justify-center",
                                    viewMode === 'grid' ? "bg-white text-black shadow-[0_10px_25px_rgba(255,255,255,0.2)]" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "flex-1 sm:flex-none p-3 rounded-lg md:rounded-xl transition-all duration-300 flex justify-center",
                                    viewMode === 'table' ? "bg-white text-black shadow-[0_10px_25px_rgba(255,255,255,0.2)]" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <FileText size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex overflow-x-auto lg:overflow-x-visible md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide snap-x snap-mandatory pb-8 md:pb-0">
                            {filteredInvoices.map((inv, i) => (
                                <motion.div key={inv.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="min-w-[85vw] md:min-w-0 snap-center h-full flex flex-col">
                                    <Card className="group relative p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-all rounded-[2.5rem] h-full flex flex-col justify-between overflow-hidden border">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700 pointer-events-none"><DollarSign size={100} /></div>
                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black font-mono tracking-widest text-neon-blue bg-neon-blue/10 px-3 py-1 rounded-full border border-neon-blue/20">{inv.invoiceNumber || 'NEWBI-INV'}</span>
                                                    <div className={cn("w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]", inv.status === 'Paid' ? 'text-neon-green bg-neon-green' : 'text-yellow-500 bg-yellow-500')} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleDuplicate(inv)} className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-500 rounded-xl transition-all border border-white/5"><CopyPlus size={14} /></button>
                                                    {user?.role !== 'editor' && (
                                                        <>
                                                            <button onClick={() => setSelectedAnalytics(inv)} className="p-2.5 bg-white/5 hover:bg-neon-blue/20 hover:text-neon-blue text-gray-500 rounded-xl transition-all border border-white/5"><Activity size={14} /></button>
                                                            <button onClick={() => handleDelete(inv.id, inv)} className="p-2.5 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-gray-500 rounded-xl transition-all border border-white/5"><Trash2 size={14} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white mb-2 leading-none">{inv.clientName}</h3>
                                            <div className="flex items-center gap-3">
                                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Calendar size={12} /> {new Date(inv.createdAt || inv.issueDate).toLocaleDateString()}</p>
                                                <p className="text-neon-blue text-[10px] font-black uppercase tracking-widest">₹{(inv.total || inv.amount || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-white/5">
                                            <div className="flex items-center gap-2 w-full">
                                                <Link 
                                                    to={`/admin/edit-invoice/${inv.id}`}
                                                    className="flex-1 h-12 bg-neon-blue text-black rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-[0_5px_15px_rgba(0,209,255,0.2)] hover:scale-[1.02]"
                                                >
                                                    <Edit size={14} /> Edit
                                                </Link>
                                                <div className="flex bg-white/5 border border-white/5 rounded-xl overflow-hidden p-1">
                                                    <button 
                                                        onClick={() => {
                                                            const text = `Invoice from Newbi: ${window.location.origin}/invoice/${inv.id}`;
                                                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                                        }}
                                                        className="h-10 w-10 hover:bg-green-500/20 text-green-500 rounded-lg transition-all flex items-center justify-center"
                                                        title="WhatsApp"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCopyLink(inv.id)}
                                                        className="h-10 w-10 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all flex items-center justify-center border-l border-white/5"
                                                        title="Copy Link"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                                <Link 
                                                    to={`/invoice/${inv.id}`}
                                                    className="h-12 w-12 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5 flex items-center justify-center"
                                                >
                                                    <Eye size={16} />
                                                </Link>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="table"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0"
                        >
                            <Card className="min-w-[800px] bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-0 border overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                            <th className="p-6 md:p-8">Reference</th>
                                            <th className="p-6 md:p-8">Client</th>
                                            <th className="p-6 md:p-8">Amount</th>
                                            <th className="p-6 md:p-8">Created</th>
                                            <th className="p-6 md:p-8">Status</th>
                                            <th className="p-6 md:p-8 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredInvoices.map((invoice) => (
                                            <tr key={invoice.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="p-6 md:p-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue group-hover:scale-110 transition-transform">
                                                            <Receipt size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black uppercase tracking-widest text-white">{invoice.invoiceNumber || 'NEWBI-INV'}</div>
                                                            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">FINANCIAL DOC</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <div className="text-sm font-black uppercase tracking-tight text-white">{invoice.clientName}</div>
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <div className="text-sm font-black text-white tabular-nums">₹{Number(invoice.total || invoice.amount || 0).toLocaleString()}</div>
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                        {new Date(invoice.createdAt || invoice.issueDate).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <div className={cn(
                                                        "inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em]",
                                                        invoice.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 
                                                        (invoice.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-gray-600/10 text-gray-600')
                                                    )}>
                                                        {invoice.status}
                                                    </div>
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <div className="flex justify-end gap-2">
                                                        <a href={`/invoice/${invoice.id}`} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-white transition-colors"><Eye size={18} /></a>
                                                        {user?.role !== 'editor' && (
                                                            <>
                                                                <button onClick={() => setSelectedAnalytics(invoice)} className="p-2 text-gray-500 hover:text-neon-blue transition-colors"><Activity size={18} /></button>
                                                                <button onClick={() => handleDelete(invoice.id, invoice)} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                            </>
                                                        )}
                                                        <button onClick={() => handleDuplicate(invoice)} className="p-2 text-gray-500 hover:text-white transition-colors"><History size={18} /></button>
                                                        <button onClick={() => handleNativeShare(invoice)} className="p-2 text-gray-500 hover:text-neon-blue transition-colors"><Share2 size={18} /></button>
                                                        <Link to={`/admin/edit-invoice/${invoice.id}`} className="p-2 text-gray-500 hover:text-white transition-colors"><Edit size={18} /></Link>
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

            {/* Quick Import Modal */}
            <AnimatePresence>
                {showQuickUpload && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQuickUpload(false)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg shrink-0">
                            <Card className="p-10 bg-zinc-900 border-white/10 rounded-[3rem] shadow-2xl">
                                <button onClick={() => setShowQuickUpload(false)} className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all z-10"><X size={20} /></button>
                                <h2 className="text-4xl font-black font-heading tracking-tighter uppercase italic text-white mb-2">IMPORT <span className="text-neon-blue">INVOICE.</span></h2>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-10">Sync external billing documents</p>
                                <form onSubmit={handleQuickUpload} className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Client Entity</label>
                                        <Input value={quickClientName} onChange={(e) => setQuickClientName(e.target.value)} placeholder="e.g. RedBull Global" className="h-14 bg-black/50 border-white/5 rounded-2xl" required />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">PDF Document</label>
                                        <div className="relative group cursor-pointer h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 bg-black/30 group-hover:border-neon-blue/40 transition-all">
                                            <input type="file" accept="application/pdf" onChange={(e) => setQuickFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" required />
                                            <Upload className="text-gray-500 group-hover:text-neon-blue" size={24} />
                                            <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{quickFile ? quickFile.name : 'Select PDF File'}</span>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-16 bg-neon-blue text-black font-black font-heading uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl" disabled={uploading}>{uploading ? 'PROCESSING...' : 'IMPORT INVOICE'}</Button>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Analytics Side Panel */}
            <AnimatePresence>
                {selectedAnalytics && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setSelectedAnalytics(null)} 
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ x: '100%' }} 
                            animate={{ x: 0 }} 
                            exit={{ x: '100%' }} 
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
                            className="relative w-full max-w-xl bg-zinc-950 border-l border-white/10 h-full shadow-[-20px_0_60px_rgba(0,0,0,0.8)] flex flex-col"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter italic text-neon-blue">Billing Intel.</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Activity Log for {selectedAnalytics.clientName}</p>
                                </div>
                                <button onClick={() => setSelectedAnalytics(null)} className="p-3 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Timeline</p>
                                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                            <span className="text-[8px] font-black text-neon-blue uppercase tracking-widest">Live Tracking Active</span>
                                        </div>
                                    </div>
                                    {(selectedAnalytics.accessLogs || []).length > 0 ? (
                                        <div className="space-y-3">
                                            {[...(selectedAnalytics.accessLogs || [])].reverse().map((log, i) => (
                                                <div key={i} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.05] hover:border-neon-blue/20 transition-all duration-500">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-neon-blue transition-colors"><Globe size={16} /></div>
                                                        <div>
                                                            <p className="text-xs font-bold text-white group-hover:text-neon-blue transition-colors">{log.platform || 'Browser Session'}</p>
                                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">{log.screen || 'Desktop View'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[11px] font-black text-white uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                                        <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">{new Date(log.timestamp).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-20 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
                                                <Activity size={24} />
                                            </div>
                                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">No access history recorded.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Payment Ledger */}
                                <div className="space-y-4 pt-8 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Ledger</p>
                                        {selectedAnalytics.status === 'Pending' && (
                                            <button 
                                                onClick={async () => {
                                                    if(window.confirm('Manually verify and mark this invoice as PAID?')) {
                                                        const logs = selectedAnalytics.paymentLogs || [];
                                                        await updateInvoice(selectedAnalytics.id, { 
                                                            status: 'Paid',
                                                            paymentLogs: [...logs, {
                                                                type: 'Manual Verification',
                                                                timestamp: new Date().toISOString(),
                                                                amount: selectedAnalytics.total || selectedAnalytics.amount
                                                            }]
                                                        });
                                                        setSelectedAnalytics({...selectedAnalytics, status: 'Paid'});
                                                    }
                                                }}
                                                className="text-[9px] font-black text-neon-blue uppercase tracking-widest hover:underline"
                                            >
                                                Verify Manually
                                            </button>
                                        )}
                                    </div>
                                    {(selectedAnalytics.paymentLogs || []).length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedAnalytics.paymentLogs.map((log, i) => (
                                                <div key={i} className="p-5 bg-neon-green/5 border border-neon-green/20 rounded-2xl flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-neon-green/20 rounded-xl flex items-center justify-center text-neon-green"><CheckCircle size={16} /></div>
                                                        <div>
                                                            <p className="text-xs font-bold text-white">{log.type}</p>
                                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">ID: {log.transactionId || 'INTERNAL'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-neon-green uppercase tracking-widest">SUCCESS</p>
                                                        <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">{new Date(log.timestamp).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest text-center">No transaction records found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-8 border-t border-white/5 bg-black/40 shrink-0">
                                <div className="p-6 rounded-2xl bg-neon-blue/5 border border-neon-blue/10 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Real-time Security</p>
                                        <p className="text-[9px] font-medium text-gray-500 mt-1">All access attempts are logged with IP & browser fingerprints.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </AdminCommunityHubLayout>
    );
};

export default InvoiceManagement;
