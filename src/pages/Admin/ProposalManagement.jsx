import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Copy, LayoutGrid, Plus, Eye, FileSpreadsheet, ExternalLink, Calendar, Search, FileText, DollarSign, Send } from 'lucide-react';
import { useStore } from '../../lib/store';
import { sendProposalEmail } from '../../lib/email';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const ProposalManagement = () => {
    const navigate = useNavigate();
    const { proposals, deleteProposal, updateProposalStatus } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [viewMode, setViewMode] = useState('grid');

    const filteredProposals = proposals.filter(p => {
        const matchesSearch = p.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             p.proposalNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleCopyLink = (id) => {
        const link = `${window.location.origin}/proposal/${id}`;
        navigator.clipboard.writeText(link);
        alert(`Proposal link copied!`);
    };

    const handleDelete = (id) => {
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
                alert("Proposal link sent successfully!");
            } else {
                alert("Failed to send email. Check console for details.");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred while sending.");
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-neon-green/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-32 md:pt-40">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                    <div className="space-y-2">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em] mb-4 group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> Back to Admin Dashboard
                        </Link>
                        <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">
                            PROPOSAL <span className="text-neon-green px-4">VAULT.</span>
                        </h1>
                    </div>
                    
                    <Link to="/admin/create-proposal">
                        <Button className="bg-neon-blue text-black font-black font-heading uppercase tracking-widest text-xs h-12 px-8 rounded-xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                            <Plus className="mr-2 h-4 w-4" /> Generate New Quote
                        </Button>
                    </Link>
                </div>

                {/* Combined Search & Filters Bar - Matching Invoice Style */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-2 mb-12 backdrop-blur-3xl flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={20} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by client or proposal ID..."
                            className="w-full bg-transparent h-16 pl-20 pr-8 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                    <div className="flex bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
                        <div className="flex min-w-max md:min-w-0">
                            {['All', 'Draft', 'Sent', 'Accepted'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={cn(
                                        "px-6 md:px-10 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 min-w-[100px] md:min-w-[120px]",
                                        statusFilter === s 
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
                            {filteredProposals.map((proposal, i) => (
                                <motion.div
                                    key={proposal.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card className="group relative p-6 md:p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-all rounded-[2.5rem] h-full flex flex-col justify-between overflow-hidden border">
                                        <div className="absolute top-0 right-0 p-6 md:p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                                            <FileSpreadsheet size={100} />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <span className="text-[10px] font-black font-mono tracking-widest text-neon-blue bg-neon-blue/10 px-3 py-1 rounded-full border border-neon-blue/20">
                                                    {proposal.proposalNumber || 'ID: ' + proposal.id.slice(0, 8)}
                                                </span>
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]",
                                                    proposal.status === 'Accepted' ? 'text-neon-green bg-neon-green' : 
                                                    (proposal.status === 'Sent' ? 'text-neon-blue bg-neon-blue' : 'text-gray-600 bg-gray-600')
                                                )} />
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
                                                onClick={() => handleCopyLink(proposal.id)}
                                                className="p-3 bg-white/5 hover:bg-neon-green/20 hover:text-neon-green text-gray-500 rounded-xl transition-all border border-white/5"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleSendEmail(proposal)}
                                                className="p-3 bg-white/5 hover:bg-neon-blue/20 hover:text-neon-blue text-gray-500 rounded-xl transition-all border border-white/5"
                                                title="Send to Client"
                                            >
                                                <Send size={16} />
                                            </button>
                                            <a 
                                                href={`/proposal/${proposal.id}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-3 bg-white/5 hover:bg-neon-green/20 hover:text-neon-green text-gray-500 rounded-xl transition-all border border-white/5"
                                            >
                                                <Eye size={16} />
                                            </a>
                                            <button 
                                                onClick={() => handleDelete(proposal.id)}
                                                className="p-3 bg-white/5 hover:bg-neon-pink/20 hover:text-neon-pink text-gray-500 rounded-xl transition-all border border-white/5"
                                            >
                                                <Trash2 size={16} />
                                            </button>
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
                                        {filteredProposals.map((proposal) => (
                                            <tr key={proposal.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="p-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue group-hover:scale-110 transition-transform">
                                                            <FileSpreadsheet size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black uppercase tracking-widest text-white">{proposal.proposalNumber || 'NEWBI-PROP'}</div>
                                                            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">STRATEGIC QUOTE</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="text-sm font-black uppercase tracking-tight text-white">{proposal.clientName}</div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                        {new Date(proposal.createdAt).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className={cn(
                                                        "inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em]",
                                                        proposal.status === 'Accepted' ? 'bg-neon-green/10 text-neon-green' : 
                                                        (proposal.status === 'Sent' ? 'bg-neon-blue/10 text-neon-blue' : 'bg-gray-600/10 text-gray-600')
                                                    )}>
                                                        {proposal.status}
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex justify-end gap-2">
                                                        <a href={`/proposal/${proposal.id}`} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-white transition-colors"><Eye size={18} /></a>
                                                        <button onClick={() => handleCopyLink(proposal.id)} className="p-2 text-gray-500 hover:text-neon-blue transition-colors"><Copy size={18} /></button>
                                                        <Link to={`/admin/edit-proposal/${proposal.id}`} className="p-2 text-gray-500 hover:text-white transition-colors"><Edit size={18} /></Link>
                                                        <button onClick={() => handleDelete(proposal.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
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
            </div>
        </div>
    );
};

export default ProposalManagement;
