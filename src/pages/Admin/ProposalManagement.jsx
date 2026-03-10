import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Copy, ArrowLeft, Plus, Eye, FileSpreadsheet, ExternalLink, Calendar, Search } from 'lucide-react';
import { useStore } from '../../lib/store';
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

    const handleDelete = async (id) => {
        if (window.confirm('IRREVERSIBLE ACTION: Delete this proposal?')) {
            await deleteProposal(id);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-neon-green/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-6 pt-32">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                    <div className="space-y-2">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest mb-4">
                            <ArrowLeft size={14} /> Back to Hub
                        </Link>
                        <h1 className="text-4xl font-black font-heading tracking-tighter uppercase italic">
                            PROPOSAL <span className="text-neon-blue">VAULT.</span>
                        </h1>
                    </div>
                    
                    <Link to="/admin/create-proposal">
                        <Button className="bg-neon-blue text-black font-black font-heading uppercase tracking-widest text-xs h-12 px-8 rounded-xl hover:scale-105 transition-all">
                            <Plus className="mr-2 h-4 w-4" /> Generate New Quote
                        </Button>
                    </Link>
                </div>

                {/* Filters & Search */}
                <Card className="p-6 bg-zinc-900/40 backdrop-blur-3xl border-white/5 mb-8 rounded-[2rem]">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <Input 
                                placeholder="SEARCH BY CLIENT OR ID..." 
                                className="pl-12 bg-black/50 border-white/5 h-12 rounded-xl text-xs font-bold tracking-widest uppercase"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {['All', 'Draft', 'Sent', 'Accepted'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={cn(
                                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                        statusFilter === status 
                                            ? "bg-neon-blue border-neon-blue text-black shadow-[0_0_20px_rgba(0,255,255,0.3)]" 
                                            : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Proposals Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredProposals.map((proposal, i) => (
                            <motion.div
                                key={proposal.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Card className="group relative p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-all rounded-[2.5rem] h-full flex flex-col justify-between overflow-hidden border">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
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

                                        <h3 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white mb-2 leading-none">
                                            {proposal.clientName}
                                        </h3>
                                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-8">
                                            <Calendar size={12} /> {new Date(proposal.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 pt-6 border-t border-white/5">
                                        <Link to={`/admin/edit-proposal/${proposal.id}`} className="flex-1">
                                            <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5">
                                                Edit
                                            </button>
                                        </Link>
                                        <button 
                                            onClick={() => handleCopyLink(proposal.id)}
                                            className="p-3 bg-white/5 hover:bg-neon-blue/20 hover:text-neon-blue text-gray-500 rounded-xl transition-all border border-white/5"
                                        >
                                            <Copy size={16} />
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
                    </AnimatePresence>

                    {filteredProposals.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                            <FileSpreadsheet className="mx-auto text-gray-800 mb-6" size={64} />
                            <h3 className="text-xl font-black font-heading text-gray-600 uppercase italic">No Proposals Found</h3>
                            <p className="text-gray-700 text-xs font-bold uppercase tracking-widest mt-2">Start by generating your first quotation.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProposalManagement;
