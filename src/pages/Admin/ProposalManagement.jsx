import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Copy, LayoutGrid, Plus, Eye, FileSpreadsheet, ExternalLink, Calendar, Search, FileText, DollarSign, Send, MessageCircle, Share2, Activity, History, X, Smartphone, Globe, ShieldCheck } from 'lucide-react';
import { useStore } from '../../lib/store';
import { sendProposalEmail } from '../../lib/email';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const ProposalManagement = () => {
    const navigate = useNavigate();
    const { proposals, deleteProposal, updateProposalStatus, duplicateProposal, user } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedAnalytics, setSelectedAnalytics] = useState(null);
    const [sharingProposal, setSharingProposal] = useState(null);

    const vaultTabs = [
        { name: 'Invoices', path: '/admin/invoices', icon: FileText, color: 'text-neon-blue' },
        { name: 'Proposals', path: '/admin/proposals', icon: FileSpreadsheet, color: 'text-neon-green' },
        { name: 'Contracts', path: '/admin/agreements', icon: ShieldCheck, color: 'text-[#A855F7]' },
    ];

    const filteredProposals = proposals
        .filter(p => {
            if (user?.role === 'editor') {
                return p.createdBy === user?.uid;
            }
            return true;
        })
        .filter(p => {
            const matchesSearch = p.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 p.proposalNumber?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

    const handleCopyLink = (id) => {
        const link = `${window.location.origin}/proposal/${id}`;
        navigator.clipboard.writeText(link);
        useStore.getState().addToast(`Proposal link copied!`, 'success');
    };

    const handleDelete = (id) => {
        if (user?.role === 'editor') {
            useStore.getState().addToast("Permission Denied: Editors cannot delete documents.", 'error');
            return;
        }
        if (window.confirm('Are you sure you want to delete this proposal?')) {
            deleteProposal(id);
        }
    };

    const handleSendEmail = async (proposal) => {
        const email = prompt("Enter client's email address:", proposal.clientEmail || "");
        if (!email) return;

        const url = `${window.location.origin}/proposal/${proposal.id}`;
        
        try {
            const res = await sendProposalEmail(email, proposal.title || "Strategic Proposal", url);
            if (res.success) {
                useStore.getState().addToast("Proposal link sent successfully!", 'success');
                updateProposalStatus(proposal.id, 'Sent');
            } else {
                useStore.getState().addToast("Failed to send email. Check console for details.", 'error');
            }
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("An error occurred while sending.", 'error');
        }
    };

    const handleWhatsAppShare = (proposal) => {
        const url = `${window.location.origin}/proposal/${proposal.id}`;
        const text = `Greetings from Newbi Entertainment. Here is your Strategic Proposal: ${url}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
        updateProposalStatus(proposal.id, 'Sent');
    };

    const handleNativeShare = async (proposal) => {
        const url = `${window.location.origin}/proposal/${proposal.id}`;
        
        // If native share is available and it's a mobile device, use it directly
        if (navigator.share && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            try {
                await navigator.share({
                    title: `Strategic Proposal - ${proposal.clientName}`,
                    text: `View your Strategic Memorandum from Newbi Entertainment.`,
                    url: url
                });
                updateProposalStatus(proposal.id, 'Sent');
                return;
            } catch (err) {
                console.error("Share failed:", err);
            }
        }

        // Open our custom high-fidelity share modal
        setSharingProposal(proposal);
    };

    const handleDuplicate = async (id) => {
        if (window.confirm('Duplicate this proposal for a revision?')) {
            try {
                const newId = await duplicateProposal(id);
                useStore.getState().addToast('Proposal duplicated as Draft.', 'success');
            } catch (err) {
                console.error(err);
                useStore.getState().addToast('Failed to duplicate.', 'error');
            }
        }
    };

    const handleRevokeSignature = async (proposalId) => {
        if (window.confirm('CRITICAL: Are you sure you want to revoke this signature? This will unlock the document and void the current authorization.')) {
            try {
                await useStore.getState().updateProposal(proposalId, {
                    status: 'Sent',
                    approvalMetadata: null,
                    rejectionMetadata: null
                });
                useStore.getState().addToast('Signature revoked successfully. Document is now active.', 'success');
                setSelectedAnalytics(null);
            } catch (err) {
                console.error(err);
                useStore.getState().addToast('Failed to revoke signature.', 'error');
            }
        }
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'PROPOSAL',
                subtitle: 'VAULT',
                accentClass: 'text-[#39FF14]',
                icon: FileSpreadsheet
            }}
            tabs={vaultTabs}
            accentColor="neon-green"
            action={
                <Link to="/admin/create-proposal" className="w-full md:w-auto">
                    <button className="w-full md:w-auto bg-[#39FF14] text-black font-black font-heading uppercase tracking-widest text-[9px] sm:text-xs h-12 md:h-14 px-6 md:px-10 rounded-xl md:rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_4px_12px_rgba(57,255,20,0.4)] hover:shadow-[0_8px_24px_rgba(57,255,20,0.6)] flex items-center justify-center">
                        <Plus className="mr-2 h-4 w-4" /> New Quote
                    </button>
                </Link>
            }
        >
            <div className="relative z-10">
                {/* Combined Search & Filters Bar - Matching Invoice Style */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl md:rounded-[2.5rem] p-1.5 md:p-2 mb-8 md:mb-12 backdrop-blur-3xl flex flex-col xl:flex-row items-center gap-2 md:gap-4">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition-colors" size={18} md={20} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search proposals..."
                            className="w-full bg-transparent h-14 md:h-16 pl-16 md:pl-20 pr-6 md:pr-8 rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
                        <div className="flex bg-black/40 p-1 rounded-xl md:rounded-[1.5rem] border border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
                            <div className="flex flex-1">
                                {['All', 'Draft', 'Sent', 'Accepted'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={cn(
                                            "flex-1 px-3 sm:px-6 md:px-10 py-2.5 sm:py-3 rounded-lg md:rounded-xl text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 min-w-[70px] sm:min-w-[100px] md:min-w-[120px]",
                                            statusFilter === s 
                                                ? "bg-[#39FF14] text-black shadow-[0_10px_25px_rgba(57,255,20,0.5)] scale-[1.02]" 
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
                                    viewMode === 'grid' ? "bg-[#39FF14] text-black shadow-[0_10px_25px_rgba(57,255,20,0.4)]" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <LayoutGrid size={16} md={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "flex-1 sm:flex-none p-3 rounded-lg md:rounded-xl transition-all duration-300 flex justify-center",
                                    viewMode === 'table' ? "bg-[#39FF14] text-black shadow-[0_10px_25px_rgba(57,255,20,0.4)]" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <FileText size={16} md={18} />
                            </button>
                        </div>
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
                            className="flex overflow-x-auto lg:overflow-x-visible md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide snap-x snap-mandatory pb-8 md:pb-0"
                        >
                            {filteredProposals.map((proposal, i) => (
                                <motion.div
                                    key={proposal.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="min-w-[85vw] md:min-w-0 snap-center h-full flex flex-col"
                                >
                                    <Card className="group relative p-6 md:p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-all rounded-[2.5rem] h-full flex flex-col justify-between overflow-hidden border">
                                        <div className="absolute top-0 right-0 p-6 md:p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                                            <FileSpreadsheet size={100} />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black font-mono tracking-widest text-neon-green bg-neon-green/10 px-3 py-1 rounded-full border border-neon-green/20">
                                                        {proposal.proposalNumber || 'ID: ' + proposal.id.slice(0, 8)}
                                                    </span>
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]",
                                                        proposal.status === 'Accepted' ? 'text-neon-green bg-neon-green' : 
                                                        (proposal.status === 'Rejected' ? 'text-red-500 bg-red-500' : 
                                                        (proposal.status === 'Sent' ? 'text-neon-green bg-neon-green' : 'text-gray-600 bg-gray-600'))
                                                    )} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleDuplicate(proposal.id)}
                                                        className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-500 rounded-xl transition-all border border-white/5"
                                                        title="Duplicate Proposal"
                                                    >
                                                        <History size={14} />
                                                    </button>
                                                    {user?.role !== 'editor' && (
                                                        <>
                                                            <button 
                                                                onClick={() => setSelectedAnalytics(proposal)}
                                                                className="p-2.5 bg-white/5 hover:bg-neon-green/20 hover:text-neon-green text-gray-500 rounded-xl transition-all border border-white/5"
                                                                title="View Analytics"
                                                            >
                                                                <Activity size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(proposal.id)}
                                                                className="p-2.5 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-gray-500 rounded-xl transition-all border border-white/5"
                                                                title="Delete Proposal"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <h3 className="text-xl md:text-2xl font-black font-heading tracking-tighter uppercase italic text-white mb-2 leading-none">
                                                {proposal.clientName}
                                            </h3>
                                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-8">
                                                <Calendar size={12} /> {new Date(proposal.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-white/5">
                                            <Link to={`/admin/edit-proposal/${proposal.id}`} className="flex-1 min-w-[30%]">
                                                <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5">
                                                    Edit
                                                </button>
                                            </Link>
                                            <button 
                                                onClick={() => handleNativeShare(proposal)}
                                                className="flex-1 min-w-[30%] py-3 bg-neon-green/10 hover:bg-neon-green/20 text-neon-green text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-neon-green/10 flex items-center justify-center gap-2"
                                            >
                                                <Share2 size={12} /> Share
                                            </button>
                                            <a 
                                                href={`/proposal/${proposal.id}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-3 bg-white/5 hover:bg-neon-green/20 hover:text-neon-green text-gray-500 rounded-xl transition-all border border-white/5"
                                            >
                                                <Eye size={16} />
                                            </a>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                            {filteredProposals.length === 0 && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                                    <FileSpreadsheet className="mx-auto text-gray-800 mb-6" size={64} />
                                    <h3 className="text-xl font-black font-heading text-gray-600 uppercase italic">No Proposals Found</h3>
                                    <p className="text-gray-700 text-xs font-bold uppercase tracking-widest mt-2">Start by generating your first quotation.</p>
                                </div>
                            )}
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
                                            <th className="p-6 md:p-8">Document</th>
                                            <th className="p-6 md:p-8">Client</th>
                                            <th className="p-6 md:p-8">Created</th>
                                            <th className="p-6 md:p-8">Status</th>
                                            <th className="p-6 md:p-8 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredProposals.map((proposal) => (
                                            <tr key={proposal.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="p-6 md:p-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green group-hover:scale-110 transition-transform">
                                                            <FileSpreadsheet size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black uppercase tracking-widest text-white">{proposal.proposalNumber || 'NEWBI-PROP'}</div>
                                                            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">STRATEGIC QUOTE</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <div className="text-sm font-black uppercase tracking-tight text-white">{proposal.clientName}</div>
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                        {new Date(proposal.createdAt).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <div className={cn(
                                                        "inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em]",
                                                        proposal.status === 'Accepted' ? 'bg-neon-green/10 text-neon-green' : 
                                                        (proposal.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 
                                                        (proposal.status === 'Sent' ? 'bg-neon-green/10 text-neon-green' : 'bg-gray-600/10 text-gray-600'))
                                                    )}>
                                                        {proposal.status}
                                                    </div>
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <div className="flex justify-end gap-2">
                                                        <a href={`/proposal/${proposal.id}`} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-white transition-colors"><Eye size={18} /></a>
                                                        {user?.role !== 'editor' && (
                                                            <>
                                                                <button onClick={() => setSelectedAnalytics(proposal)} className="p-2 text-gray-500 hover:text-neon-green transition-colors"><Activity size={18} /></button>
                                                                <button onClick={() => handleDelete(proposal.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                            </>
                                                        )}
                                                        <button onClick={() => handleDuplicate(proposal.id)} className="p-2 text-gray-500 hover:text-white transition-colors"><History size={18} /></button>
                                                        <button onClick={() => handleNativeShare(proposal)} className="p-2 text-gray-500 hover:text-neon-green transition-colors"><Share2 size={18} /></button>
                                                        <Link to={`/admin/edit-proposal/${proposal.id}`} className="p-2 text-gray-500 hover:text-white transition-colors"><Edit size={18} /></Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredProposals.length === 0 && (
                                    <div className="py-20 text-center flex flex-col items-center gap-4">
                                        <FileSpreadsheet className="text-gray-700" size={40} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">No proposals found.</p>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Analytics Modal */}
                <AnimatePresence>
                    {selectedAnalytics && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAnalytics(null)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden max-h-[90vh] flex flex-col">
                                <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center shrink-0">
                                    <div>
                                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">Strategic Analytics.</h3>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{selectedAnalytics.clientName}</p>
                                    </div>
                                    <button onClick={() => setSelectedAnalytics(null)} className="p-2 md:p-3 hover:bg-white/5 rounded-full transition-colors"><X size={18} md={20} /></button>
                                </div>
                                <div className="p-6 md:p-8 overflow-y-auto space-y-6 scrollbar-hide">
                                    {selectedAnalytics.status === 'Accepted' && selectedAnalytics.approvalMetadata && (
                                        <div className="space-y-3 md:space-y-4">
                                            <div className="p-4 md:p-6 bg-neon-green/5 border border-neon-green/20 rounded-2xl flex items-start gap-3 md:gap-4">
                                                <ShieldCheck className="text-neon-green shrink-0" size={20} md={24} />
                                                <div>
                                                    <p className="text-[9px] md:text-[10px] font-black text-neon-green uppercase tracking-widest mb-1">Authorization Details</p>
                                                    <p className="text-[11px] md:text-sm font-bold text-white mb-2">Signed by {selectedAnalytics.approvalMetadata.signedBy}</p>
                                                    <div className="flex flex-wrap gap-2 md:gap-4 text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                                        <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(selectedAnalytics.approvalMetadata.signedAt).toLocaleString()}</span>
                                                        <span className="flex items-center gap-1"><Globe size={10} /> {selectedAnalytics.approvalMetadata.ip}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRevokeSignature(selectedAnalytics.id)}
                                                className="w-full py-3 md:py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl md:rounded-2xl border border-red-500/10 transition-all"
                                            >
                                                Revoke Authorization
                                            </button>
                                        </div>
                                    )}
                                    {selectedAnalytics.status === 'Rejected' && selectedAnalytics.rejectionMetadata && (
                                        <div className="space-y-4">
                                            <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-4">
                                                <X className="text-red-500 shrink-0" size={24} />
                                                <div>
                                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Refusal Context</p>
                                                    <p className="text-sm font-bold text-white mb-2">{selectedAnalytics.rejectionMetadata.reason}</p>
                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                                        <Calendar size={10} /> {new Date(selectedAnalytics.rejectionMetadata.rejectedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRevokeSignature(selectedAnalytics.id)}
                                                className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 transition-all"
                                            >
                                                Reset to Active
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Access Events</p>
                                        {(selectedAnalytics.accessLogs || []).length > 0 ? (
                                            <div className="space-y-3">
                                                {[...(selectedAnalytics.accessLogs || [])].reverse().map((log, i) => (
                                                    <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-2 bg-white/5 rounded-lg text-gray-400"><Globe size={14} /></div>
                                                            <div>
                                                                <p className="text-[11px] font-bold text-white">{log.platform || 'Browser Session'}</p>
                                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{log.screen || 'Desktop View'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-neon-green uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                                            <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{new Date(log.timestamp).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">No access logs recorded yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Unified Share Modal */}
                <AnimatePresence>
                    {sharingProposal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSharingProposal(null)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[3rem] overflow-hidden">
                                <div className="p-8 text-center space-y-1 border-b border-white/5">
                                    <h3 className="text-2xl font-black uppercase tracking-[0.2em] italic">SHARE</h3>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{sharingProposal.clientName}</p>
                                </div>

                                <div className="p-8 grid grid-cols-1 gap-3">
                                    <button 
                                        onClick={() => { handleCopyLink(sharingProposal.id); setSharingProposal(null); }}
                                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center gap-4 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green group-hover:scale-110 transition-transform"><Copy size={16} /></div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black uppercase tracking-widest">Copy Link</p>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => { handleWhatsAppShare(sharingProposal); setSharingProposal(null); }}
                                        className="p-4 bg-white/5 hover:bg-[#25D366]/10 border border-white/5 rounded-2xl flex items-center gap-4 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform"><MessageCircle size={16} /></div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black uppercase tracking-widest">WhatsApp</p>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => { handleSendEmail(sharingProposal); setSharingProposal(null); }}
                                        className="p-4 bg-white/5 hover:bg-neon-green/10 border border-white/5 rounded-2xl flex items-center gap-4 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green group-hover:scale-110 transition-transform"><Send size={16} /></div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black uppercase tracking-widest">Email</p>
                                        </div>
                                    </button>
                                </div>

                                <button onClick={() => setSharingProposal(null)} className="w-full py-5 text-[9px] font-black uppercase tracking-[0.4em] text-gray-600 hover:text-white transition-colors bg-white/[0.02]">
                                    Cancel
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default ProposalManagement;
