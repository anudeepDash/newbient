import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Copy, LayoutGrid, Plus, Eye, CheckCircle, FileText, Filter, Download, X, Search, Sparkles, Upload, DollarSign, Mail, Send } from 'lucide-react';
import { useStore } from '../../lib/store';
import { sendInvoiceEmail } from '../../lib/email';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

const InvoiceManagement = () => {
    const navigate = useNavigate();
    const { invoices, updateInvoice, deleteInvoice, addInvoice } = useStore();
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');

    // Quick Upload State
    const [showQuickUpload, setShowQuickUpload] = useState(false);
    const [quickClientName, setQuickClientName] = useState('');
    const [quickFile, setQuickFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Edit State (for metadata/quick uploads)
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [editName, setEditName] = useState('');

    const filteredInvoices = invoices
        .filter(inv => filter === 'All' ? true : inv.status === filter)
        .filter(inv => {
            if (!searchTerm) return true;
            return inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
        });

    const handleCopyLink = (id) => {
        const link = `${window.location.origin}/invoice/${id}`;
        navigator.clipboard.writeText(link);
        alert(`Invoice link copied!`);
    };

    const handleEdit = (invoice) => {
        if (invoice.items && invoice.items.length > 0) {
            navigate(`/admin/edit-invoice/${invoice.id}`);
        } else {
            setEditingInvoice(invoice);
            setEditName(invoice.clientName);
            setShowEditModal(true);
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editName) return;
        setUploading(true);
        try {
            await updateInvoice(editingInvoice.id, { clientName: editName });
            setShowEditModal(false);
        } catch (error) {
            alert("Failed to update invoice.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this invoice?')) {
            deleteInvoice(id);
        }
    };

    const handleSendEmail = async (invoice) => {
        const email = prompt("Enter client's email address:", invoice.clientEmail || "");
        if (!email) return;

        const amount = `₹${invoice.total?.toLocaleString() || invoice.amount?.toLocaleString()}`;
        const url = `${window.location.origin}/invoice/${invoice.id}`;
        
        try {
            const res = await sendInvoiceEmail(email, invoice.invoiceNumber, amount, url);
            if (res.success) {
                alert("Invoice link sent successfully!");
            } else {
                alert("Failed to send email. Check console for details.");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred while sending.");
        }
    };

    const handleMarkAsPaid = async (invoice) => {
        if (window.confirm('Mark as Paid?')) {
            try {
                await updateInvoice(invoice.id, { status: 'Paid' });
            } catch (error) {
                alert("Failed to update status.");
            }
        }
    };

    const handleQuickUpload = async (e) => {
        e.preventDefault();
        if (!quickClientName || !quickFile) return;

        if (quickFile.size > 750 * 1024) {
            alert("Limit: PDF should be under 750KB.");
            return;
        }

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
                invoiceNumber: `NB-${Math.floor(100000 + Math.random() * 900000)}`,
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
            alert("Failed to upload.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-green/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-12 gap-8">
                    <div className="space-y-4 max-w-full">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em] group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> Back to Admin Dashboard
                        </Link>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">
                            INVOICE <span className="text-neon-blue px-4">VAULT.</span>
                        </h1>
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowQuickUpload(true)} 
                            className="flex-1 md:flex-none h-14 px-8 rounded-2xl bg-white/5 border-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-all"
                        >
                            <Plus className="mr-2 h-4 w-4" /> IMPORT PDF
                        </Button>
                        <Link to="/admin/create-invoice">
                            <Button className="bg-neon-blue text-black font-black font-heading uppercase tracking-widest text-xs h-12 px-8 rounded-xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                                <Plus className="mr-2 h-4 w-4" /> GENERATE NEW INVOICE
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Combined Search & Filters Bar & Actions */}
                <div className="flex flex-col xl:flex-row gap-4 mb-12">
                    <div className="flex-1 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-2 backdrop-blur-3xl flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={20} />
                            <input 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by client or invoice #..."
                                className="w-full bg-transparent h-16 pl-20 pr-8 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <div className="flex bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5 w-full md:w-auto mr-1 shrink-0">
                            {['All', 'Pending', 'Paid'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilter(s)}
                                    className={cn(
                                        "px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 min-w-[120px]",
                                        filter === s 
                                            ? "bg-neon-blue text-black shadow-[0_10px_25px_rgba(0,255,255,0.3)] scale-[1.02]" 
                                            : "text-gray-500 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5 mr-1 shrink-0">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-3.5 rounded-xl transition-all duration-300",
                                    viewMode === 'grid' ? "bg-neon-blue text-black shadow-[0_10px_25px_rgba(0,255,255,0.3)]" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "p-3.5 rounded-xl transition-all duration-300",
                                    viewMode === 'table' ? "bg-neon-blue text-black shadow-[0_10px_25px_rgba(0,255,255,0.3)]" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <FileText size={18} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-4 shrink-0 h-20 xl:h-auto">
                        <Button onClick={() => setShowQuickUpload(true)} variant="outline" className="flex-1 xl:flex-none h-full xl:min-h-[4rem] px-8 rounded-[2rem] bg-zinc-900/30 border-white/5 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all">
                            <Upload className="mr-3 text-neon-blue" size={16} /> Quick Upload
                        </Button>
                        <Button variant="outline" className="flex-1 xl:flex-none h-full xl:min-h-[4rem] px-8 rounded-[2rem] bg-zinc-900/30 border-white/5 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all">
                            <Download className="mr-3" size={16} /> Export
                        </Button>
                    </div>
                </div>

                {/* Main Content Area: Grid or Table */}
                <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div 
                            key="grid"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {filteredInvoices.map((inv, i) => (
                                <motion.div
                                    key={inv.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card className="group relative p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-all rounded-[2.5rem] h-full flex flex-col justify-between overflow-hidden border">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                                            <FileText size={100} />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black font-mono tracking-widest text-neon-blue bg-neon-blue/10 px-3 py-1 rounded-full border border-neon-blue/20">
                                                        {inv.invoiceNumber || 'NEWBI-INV'}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                                                        {inv.type === 'upload' ? 'IMPORTED PDF' : 'SYSTEM GEN'}
                                                    </span>
                                                </div>
                                                <div className={cn(
                                                    "w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_15px_currentColor]",
                                                    inv.status === 'Paid' ? 'text-neon-green bg-neon-green' : 'text-yellow-500 bg-yellow-500'
                                                )} />
                                            </div>

                                            <h3 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white mb-2 leading-none">
                                                {inv.clientName}
                                            </h3>
                                            <div className="flex items-center gap-4 mb-8">
                                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                    <Sparkles size={12} className="text-neon-blue" /> {new Date(inv.createdAt || inv.issueDate).toLocaleDateString()}
                                                </p>
                                                {inv.status === 'Paid' && (
                                                    <span className="text-neon-green text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                        <CheckCircle size={12} /> PAID
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-white/5">
                                            <button 
                                                onClick={() => handleEdit(inv)}
                                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleCopyLink(inv.id)}
                                                className="p-3 bg-white/5 hover:bg-neon-blue/20 hover:text-neon-blue text-gray-500 rounded-xl transition-all border border-white/5"
                                                title="Copy Link"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleSendEmail(inv)}
                                                className="p-3 bg-white/5 hover:bg-neon-blue/20 hover:text-neon-blue text-gray-500 rounded-xl transition-all border border-white/5"
                                                title="Send Link"
                                            >
                                                <Send size={16} />
                                            </button>
                                            <a 
                                                href={`/invoice/${inv.id}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-3 bg-white/5 hover:bg-neon-green/20 hover:text-neon-green text-gray-500 rounded-xl transition-all border border-white/5"
                                                title="View Online"
                                            >
                                                <Eye size={16} />
                                            </a>
                                            {inv.status !== 'Paid' && (
                                                <button 
                                                    onClick={() => handleMarkAsPaid(inv)}
                                                    className="p-3 bg-white/5 hover:bg-neon-green/20 hover:text-neon-green text-gray-500 rounded-xl transition-all border border-white/5"
                                                    title="Mark as Paid"
                                                >
                                                    <DollarSign size={16} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDelete(inv.id)}
                                                className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-gray-500 rounded-xl transition-all border border-white/5"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3.5rem]">
                                    <Sparkles className="mx-auto text-gray-800 mb-6" size={64} />
                                    <h3 className="text-xl font-black font-heading text-gray-600 uppercase italic">No Invoices Found</h3>
                                    <p className="text-gray-700 text-xs font-bold uppercase tracking-widest mt-2">Start by generating or importing your first document.</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="table"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="overflow-hidden bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-0 border">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                            <th className="p-8">Document</th>
                                            <th className="p-8">Client</th>
                                            <th className="p-8">Created</th>
                                            <th className="p-8">Status</th>
                                            <th className="p-8 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredInvoices.map((inv) => (
                                            <tr key={inv.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="p-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue group-hover:scale-110 transition-transform">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black uppercase tracking-widest text-white">{inv.invoiceNumber || 'NEWBI-INV'}</div>
                                                            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">{inv.type === 'upload' ? 'IMPORTED PDF' : 'SYSTEM GEN'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="text-sm font-black uppercase tracking-tight text-white">{inv.clientName}</div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                        {new Date(inv.createdAt || inv.issueDate).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className={cn(
                                                        "inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em]",
                                                        inv.status === 'Paid' ? "bg-neon-green/10 text-neon-green" : "bg-yellow-500/10 text-yellow-500"
                                                    )}>
                                                        {inv.status}
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex justify-end gap-2">
                                                        <a href={`/invoice/${inv.id}`} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-white transition-colors"><Eye size={18} /></a>
                                                        <button onClick={() => handleCopyLink(inv.id)} className="p-2 text-gray-500 hover:text-neon-blue transition-colors"><Copy size={18} /></button>
                                                        {inv.status !== 'Paid' && (
                                                            <button onClick={() => handleMarkAsPaid(inv)} className="p-2 text-gray-500 hover:text-neon-green transition-colors"><CheckCircle size={18} /></button>
                                                        )}
                                                        <button onClick={() => handleEdit(inv)} className="p-2 text-gray-500 hover:text-white transition-colors"><Edit size={18} /></button>
                                                        <button onClick={() => handleDelete(inv.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredInvoices.length === 0 && (
                                    <div className="py-20 text-center flex flex-col items-center gap-4">
                                        <Sparkles className="text-gray-700" size={40} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">No invoices found.</p>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showQuickUpload && (
                    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 pt-20 pb-20 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQuickUpload(false)} className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg shrink-0">
                            <Card className="p-8 md:p-10 border-neon-blue/30 bg-zinc-900 rounded-[3rem] max-h-[85vh] md:max-h-[95vh] overflow-y-auto custom-scrollbar">
                                <button onClick={() => setShowQuickUpload(false)} className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all z-10"><X size={20} /></button>
                                <h2 className="text-4xl font-black font-heading tracking-tighter uppercase italic text-white mb-2">IMPORT <span className="text-neon-blue">INVOICE.</span></h2>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-10">UPLOAD EXTERNAL PDF INVOICES</p>
                                
                                <form onSubmit={handleQuickUpload} className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Client Business Name</label>
                                        <Input value={quickClientName} onChange={(e) => setQuickClientName(e.target.value)} placeholder="e.g. RedBull Global" className="h-14 bg-black/50 border-white/5 rounded-2xl" required />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Document File (PDF)</label>
                                        <div className="relative group cursor-pointer">
                                            <input type="file" accept="application/pdf" onChange={(e) => setQuickFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" required />
                                            <div className="h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 bg-black/30 group-hover:border-neon-blue/40 transition-all">
                                                <Plus className="text-gray-500 group-hover:text-neon-blue" size={24} />
                                                <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">
                                                    {quickFile ? quickFile.name : 'Select or drop PDF'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-16 bg-neon-blue text-black font-black font-heading uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_20px_40px_rgba(0,255,255,0.2)]" disabled={uploading}>
                                        {uploading ? 'PROCESSING...' : 'IMPORT INVOICE'}
                                    </Button>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {showEditModal && (
                    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 pt-20 pb-20 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg shrink-0">
                            <Card className="p-8 md:p-10 border-white/10 bg-zinc-900 rounded-[3rem] max-h-[85vh] md:max-h-[95vh] overflow-y-auto custom-scrollbar">
                                <button onClick={() => setShowEditModal(false)} className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all z-10"><X size={20} /></button>
                                <h2 className="text-3xl font-black font-heading tracking-tighter uppercase italic text-white mb-8">EDIT <span className="text-gray-500">DETAILS.</span></h2>
                                <form onSubmit={handleSaveEdit} className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Update Client Name</label>
                                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-14 bg-black/50 border-white/5 rounded-2xl" required />
                                    </div>
                                    <Button type="submit" className="w-full h-16 bg-white text-black font-black font-heading uppercase tracking-[0.2em] text-xs rounded-2xl" disabled={uploading}>
                                        {uploading ? 'SAVING...' : 'SAVE CHANGES'}
                                    </Button>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InvoiceManagement;
