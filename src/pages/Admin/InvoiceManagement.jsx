import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Copy, LayoutGrid, Plus, Eye, CheckCircle, FileText, Filter, Download, X, Search, Sparkles, Upload } from 'lucide-react';
import { useStore } from '../../lib/store';
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
        if (window.confirm('Delete this invoice forever?')) {
            deleteInvoice(id);
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

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 md:pt-32">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-12 gap-8">
                    <div className="space-y-4 max-w-full">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO COMMAND CENTRE
                        </Link>
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black font-heading tracking-tighter uppercase italic leading-[1.6] py-10 pr-12 pl-1 overflow-visible whitespace-nowrap">
                            INVOICE <span className="text-neon-blue px-4">MANAGER.</span>
                        </h1>
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowQuickUpload(true)} 
                            className="flex-1 md:flex-none h-14 px-8 rounded-2xl bg-white/5 border-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-all"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Import PDF
                        </Button>
                        <Link to="/admin/create-invoice" className="flex-1 md:flex-none">
                            <Button className="w-full h-14 px-8 rounded-2xl bg-neon-blue text-black text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                                <FileText className="mr-2 h-4 w-4" /> New Invoice
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
                                placeholder="SEARCH BY CLIENT OR INVOICE #..."
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

                {/* Desktop Content */}
                <Card className="hidden md:block overflow-hidden bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-0">
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

                {/* Mobile Content */}
                <div className="md:hidden space-y-4">
                    {filteredInvoices.map((inv) => (
                        <div key={inv.id} className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white">{inv.invoiceNumber}</div>
                                        <div className="text-[8px] font-bold text-gray-500 uppercase">{new Date(inv.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                    inv.status === 'Paid' ? "bg-neon-green/10 text-neon-green" : "bg-yellow-500/10 text-yellow-500"
                                )}>
                                    {inv.status}
                                </div>
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-white mb-6 italic">{inv.clientName}</h3>
                            <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                <div className="flex gap-1">
                                    <a href={`/invoice/${inv.id}`} className="p-2.5 text-gray-500 hover:text-neon-green transition-colors"><Eye size={18} /></a>
                                    <button onClick={() => handleCopyLink(inv.id)} className="p-2.5 text-gray-500 hover:text-neon-blue transition-colors"><Copy size={18} /></button>
                                </div>
                                <div className="flex gap-1">
                                    {inv.status !== 'Paid' && (
                                        <button onClick={() => handleMarkAsPaid(inv)} className="p-2.5 text-gray-500 hover:text-neon-green transition-colors"><CheckCircle size={18} /></button>
                                    )}
                                    <button onClick={() => handleEdit(inv)} className="p-2.5 text-gray-500 hover:text-white transition-colors"><Edit size={18} /></button>
                                    <button onClick={() => handleDelete(inv.id)} className="p-2.5 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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
