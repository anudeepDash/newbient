import React, { useState, useMemo } from 'react';
import { Plus, Search, LayoutGrid, List, Trash2, Copy, Eye, FileText, Clock, CheckCircle2, AlertCircle, Calendar, Users, Scale, ChevronRight, X, Sparkles, Send, ShieldCheck, History, Share2, MessageCircle, Activity, Edit } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { useNavigate, Link } from 'react-router-dom';

const AgreementManagement = () => {
    const navigate = useNavigate();
    const { agreements, deleteAgreement, duplicateAgreement } = useStore();
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [selectedAnalytics, setSelectedAnalytics] = useState(null);
    const [sharingAgreement, setSharingAgreement] = useState(null);

    const stats = useMemo(() => {
        const t = agreements.length;
        const d = agreements.filter(a => a.status === 'Draft').length;
        const f = agreements.filter(a => a.status === 'Final').length;
        const e = agreements.filter(a => a.status === 'Executed').length;
        return { total: t, draft: d, final: f, executed: e };
    }, [agreements]);

    const filtered = useMemo(() => agreements.filter(a => {
        const s = searchQuery.toLowerCase();
        const match = a.parties?.secondParty?.name?.toLowerCase().includes(s) || a.details?.projectName?.toLowerCase().includes(s) || a.agreementNumber?.toLowerCase().includes(s);
        return match && (statusFilter === 'All' || a.status === statusFilter);
    }), [agreements, searchQuery, statusFilter]);

    const handleDelete = async (id) => { try { await deleteAgreement(id); setShowDeleteModal(null); } catch (e) { alert("Error: " + e.message); } };
    const handleDuplicate = async (id) => { try { await duplicateAgreement(id); } catch (e) { alert("Error: " + e.message); } };
    const handleCopyLink = (id) => { navigator.clipboard.writeText(`${window.location.origin}/agreement/${id}`); alert('Link copied!'); };
    const handleWhatsApp = (a) => { const url = `${window.location.origin}/agreement/${a.id}`; window.open(`https://wa.me/?text=${encodeURIComponent(`Contract from Newbi Entertainment: ${url}`)}`, '_blank'); };
    const handleNativeShare = async (a) => {
        const url = `${window.location.origin}/agreement/${a.id}`;
        if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
            try { await navigator.share({ title: `Contract - ${a.parties?.secondParty?.name}`, text: 'View your contract from Newbi Entertainment.', url }); return; } catch {}
        }
        setSharingAgreement(a);
    };

    const statusColor = (s) => ({ Draft: 'text-amber-500 bg-amber-500/10 border-amber-500/20', Final: 'text-blue-500 bg-blue-500/10 border-blue-500/20', Executed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }[s] || 'text-gray-500 bg-gray-500/10 border-gray-500/20');

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}` }} />
            <div className="fixed inset-0 z-0 pointer-events-none"><div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[120px]" /></div>
            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-32 md:pt-40">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                    <div className="space-y-2"><AdminDashboardLink className="mb-4" />
                        <h1 className="text-2xl sm:text-3xl md:text-5xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">CONTRACT <span className="text-neon-blue px-2 sm:px-4">VAULT.</span></h1>
                    </div>
                    <Link to="/admin/agreements/new" className="w-full md:w-auto">
                        <Button className="w-full md:w-auto bg-neon-blue text-black font-black uppercase tracking-widest text-[10px] sm:text-xs h-12 px-8 rounded-xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(0,255,255,0.2)]" disabled><Plus className="mr-2 h-4 w-4" /> Coming Soon</Button>
                    </Link>
                </div>

                {/* Coming Soon Overlay Content */}
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl pointer-events-auto rounded-[3.5rem] mt-40">
                    <div className="text-center space-y-6 max-w-xl px-6">
                        <div className="w-24 h-24 bg-neon-blue/10 rounded-full flex items-center justify-center mx-auto border border-neon-blue/20 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
                            <Scale size={48} className="text-neon-blue animate-pulse" />
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic italic">COMING <span className="text-neon-blue">SOON.</span></h2>
                        <p className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-[0.2em] leading-relaxed">
                            The Contract Operating System is currently under security audit. AI-assisted legal instruments will be available in the next deployment cycle.
                        </p>
                        <div className="pt-8">
                            <AdminDashboardLink />
                        </div>
                    </div>
                </div>

                {/* Original content follows but will be obscured by overlay */}

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
                    {[{ l: 'Total Contracts', v: stats.total, icon: FileText, c: 'text-white' }, { l: 'Active Drafts', v: stats.draft, icon: Clock, c: 'text-amber-500' }, { l: 'Finalized', v: stats.final, icon: ShieldCheck, c: 'text-neon-blue' }, { l: 'Executed', v: stats.executed, icon: CheckCircle2, c: 'text-emerald-500' }].map((s, i) => (
                        <Card key={i} className="bg-zinc-900/40 border-white/5 p-6 md:p-8 rounded-[2rem] group hover:border-white/10 transition-all border">
                            <div className="flex justify-between items-start"><div><p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">{s.l}</p><p className={cn("text-3xl md:text-4xl font-black tracking-tighter", s.c)}>{s.v}</p></div><div className="p-2 md:p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform"><s.icon size={18} className={s.c} /></div></div>
                        </Card>
                    ))}
                </div>

                {/* Search & Filters */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl md:rounded-[2.5rem] p-2 mb-12 backdrop-blur-3xl flex flex-col xl:flex-row items-center gap-2 md:gap-4">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={18} />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search contracts, clients, IDs..." className="w-full bg-transparent h-14 md:h-16 pl-16 md:pl-20 pr-6 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest outline-none placeholder:text-gray-600" />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
                        <div className="flex bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5 w-full md:w-auto overflow-x-auto scrollbar-hide">
                            <div className="flex min-w-max md:min-w-0">
                                {['All', 'Draft', 'Final', 'Executed'].map(s => (
                                    <button key={s} onClick={() => setStatusFilter(s)} className={cn("px-4 sm:px-6 md:px-10 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all min-w-[80px] md:min-w-[120px]", statusFilter === s ? "bg-neon-blue text-black shadow-[0_10px_25px_rgba(0,255,255,0.3)]" : "text-gray-500 hover:text-white hover:bg-white/5")}>{s}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5">
                            <button onClick={() => setViewMode('grid')} className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white")}><LayoutGrid size={16} /></button>
                            <button onClick={() => setViewMode('list')} className={cn("p-3 rounded-xl transition-all", viewMode === 'list' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white")}><FileText size={16} /></button>
                        </div>
                    </div>
                </div>

                {/* Grid/List */}
                <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex overflow-x-auto lg:overflow-x-visible md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide snap-x snap-mandatory pb-8 md:pb-0">
                            {filtered.map((a, i) => (
                                <motion.div key={a.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="min-w-[85vw] md:min-w-0 snap-center h-full flex flex-col">
                                    <Card className="group relative p-6 md:p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-all rounded-[2.5rem] h-full flex flex-col justify-between overflow-hidden border">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none"><Scale size={100} /></div>
                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black font-mono tracking-widest text-neon-blue bg-neon-blue/10 px-3 py-1 rounded-full border border-neon-blue/20">{a.agreementNumber}</span>
                                                    <div className={cn("w-2 h-2 rounded-full animate-pulse", a.status === 'Executed' ? 'bg-emerald-500' : a.status === 'Final' ? 'bg-blue-500' : 'bg-gray-600')} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleDuplicate(a.id)} className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-500 rounded-xl border border-white/5" title="Duplicate"><History size={14} /></button>
                                                    <button onClick={() => setSelectedAnalytics(a)} className="p-2.5 bg-white/5 hover:bg-neon-blue/20 hover:text-neon-blue text-gray-500 rounded-xl border border-white/5" title="Analytics"><Activity size={14} /></button>
                                                    <button onClick={() => setShowDeleteModal(a.id)} className="p-2.5 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-gray-500 rounded-xl border border-white/5" title="Delete"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            <h3 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic text-white mb-2 leading-none">{a.parties?.secondParty?.name || 'Untitled'}</h3>
                                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><Scale size={12} /> {a.template || a.type || 'Service Agreement'}</p>
                                            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-8"><Calendar size={12} /> {a.effectiveDate ? new Date(a.effectiveDate).toLocaleDateString() : 'No date'}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-white/5">
                                            <Link to={`/admin/agreements/edit/${a.id}`} className="flex-1 min-w-[30%]"><button className="w-full py-3 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/5">Edit</button></Link>
                                            <button onClick={() => handleNativeShare(a)} className="flex-1 min-w-[30%] py-3 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue text-[10px] font-black uppercase tracking-widest rounded-xl border border-neon-blue/10 flex items-center justify-center gap-2"><Share2 size={12} /> Share</button>
                                            <a href={`/agreement/${a.id}`} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-neon-blue/20 hover:text-neon-blue text-gray-500 rounded-xl border border-white/5"><Eye size={16} /></a>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                            {filtered.length === 0 && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                                    <Scale className="mx-auto text-gray-800 mb-6" size={64} />
                                    <h3 className="text-xl font-black text-gray-600 uppercase italic">No Contracts Found</h3>
                                    <p className="text-gray-700 text-xs font-bold uppercase tracking-widest mt-2">Deploy your first contract from the generator.</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="table" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                            <Card className="min-w-[800px] md:min-w-0 bg-zinc-900/40 border-white/5 rounded-[2.5rem] p-0 border overflow-hidden">
                                <table className="w-full text-left">
                                    <thead><tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"><th className="p-8">Document</th><th className="p-8">Client</th><th className="p-8">Type</th><th className="p-8">Created</th><th className="p-8">Status</th><th className="p-8 text-right">Actions</th></tr></thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filtered.map(a => (
                                            <tr key={a.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="p-8"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue"><Scale size={20} /></div><div><div className="text-xs font-black uppercase tracking-widest">{a.agreementNumber}</div><div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">CONTRACT</div></div></div></td>
                                                <td className="p-8 text-sm font-black uppercase tracking-tight">{a.parties?.secondParty?.name}</td>
                                                <td className="p-8 text-[10px] font-bold text-gray-400 uppercase">{a.template || a.type || 'Service'}</td>
                                                <td className="p-8 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{a.effectiveDate ? new Date(a.effectiveDate).toLocaleDateString() : '—'}</td>
                                                <td className="p-8"><div className={cn("inline-flex px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-[0.2em]", statusColor(a.status))}>{a.status}</div></td>
                                                <td className="p-8"><div className="flex justify-end gap-2">
                                                    <a href={`/agreement/${a.id}`} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-white"><Eye size={18} /></a>
                                                    <button onClick={() => handleNativeShare(a)} className="p-2 text-gray-500 hover:text-neon-blue"><Share2 size={18} /></button>
                                                    <button onClick={() => handleDuplicate(a.id)} className="p-2 text-gray-500 hover:text-white"><History size={18} /></button>
                                                    <Link to={`/admin/agreements/edit/${a.id}`} className="p-2 text-gray-500 hover:text-white"><Edit size={18} /></Link>
                                                    <button onClick={() => setShowDeleteModal(a.id)} className="p-2 text-gray-500 hover:text-red-500"><Trash2 size={18} /></button>
                                                </div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filtered.length === 0 && <div className="py-20 text-center"><Scale className="mx-auto text-gray-700 mb-4" size={40} /><p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">No contracts found.</p></div>}
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Delete Modal */}
                <AnimatePresence>
                    {showDeleteModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteModal(null)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 text-center space-y-8">
                                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20"><Trash2 size={32} /></div>
                                <div><h3 className="text-2xl font-black uppercase tracking-tighter italic">Purge Contract?</h3><p className="text-gray-500 text-sm mt-4">This action permanently removes this contract from the vault. This is irreversible.</p></div>
                                <div className="flex gap-4">
                                    <button onClick={() => setShowDeleteModal(null)} className="flex-1 h-14 bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase tracking-widest text-xs rounded-xl">Cancel</button>
                                    <button onClick={() => handleDelete(showDeleteModal)} className="flex-1 h-14 bg-red-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-red-500/20">Purge</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Analytics Modal */}
                <AnimatePresence>
                    {selectedAnalytics && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAnalytics(null)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden">
                                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                                    <div><h3 className="text-2xl font-black uppercase tracking-tighter italic">Contract Analytics.</h3><p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{selectedAnalytics.agreementNumber}</p></div>
                                    <button onClick={() => setSelectedAnalytics(null)} className="p-3 hover:bg-white/5 rounded-full"><X size={20} /></button>
                                </div>
                                <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6 scrollbar-hide">
                                    <div className="grid grid-cols-3 gap-4">
                                        {[{ l: 'Status', v: selectedAnalytics.status, icon: ShieldCheck }, { l: 'Risk', v: selectedAnalytics.risk || 'N/A', icon: AlertCircle }, { l: 'Type', v: selectedAnalytics.template || selectedAnalytics.type || 'Service', icon: FileText }].map((s, i) => (
                                            <div key={i} className="p-5 bg-black/40 border border-white/5 rounded-2xl"><s.icon className="text-neon-blue mb-3" size={16} /><p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">{s.l}</p><p className="text-sm font-black uppercase">{s.v}</p></div>
                                        ))}
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Logs</p>
                                        {(selectedAnalytics.accessLogs || []).length > 0 ? (
                                            [...(selectedAnalytics.accessLogs || [])].reverse().slice(0, 10).map((log, i) => (
                                                <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-4"><div className="w-2 h-2 rounded-full bg-neon-blue" /><div><p className="text-[11px] font-bold">{log.userEmail || 'Guest'}</p><p className="text-[8px] font-bold text-gray-600 uppercase">{log.ip || 'Unknown IP'}</p></div></div>
                                                    <div className="text-right"><p className="text-[10px] font-black text-neon-blue">{new Date(log.timestamp).toLocaleTimeString()}</p><p className="text-[8px] font-bold text-gray-600">{new Date(log.timestamp).toLocaleDateString()}</p></div>
                                                </div>
                                            ))
                                        ) : <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl"><p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">No access logs yet.</p></div>}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Share Modal */}
                <AnimatePresence>
                    {sharingAgreement && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSharingAgreement(null)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[3rem] overflow-hidden">
                                <div className="p-8 text-center space-y-1 border-b border-white/5">
                                    <h3 className="text-2xl font-black uppercase tracking-[0.2em] italic">SHARE</h3>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{sharingAgreement.parties?.secondParty?.name}</p>
                                </div>
                                <div className="p-8 grid grid-cols-1 gap-3">
                                    <button onClick={() => { handleCopyLink(sharingAgreement.id); setSharingAgreement(null); }} className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center gap-4 group">
                                        <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue group-hover:scale-110 transition-transform"><Copy size={16} /></div>
                                        <p className="text-[11px] font-black uppercase tracking-widest">Copy Link</p>
                                    </button>
                                    <button onClick={() => { handleWhatsApp(sharingAgreement); setSharingAgreement(null); }} className="p-4 bg-white/5 hover:bg-[#25D366]/10 border border-white/5 rounded-2xl flex items-center gap-4 group">
                                        <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform"><MessageCircle size={16} /></div>
                                        <p className="text-[11px] font-black uppercase tracking-widest">WhatsApp</p>
                                    </button>
                                </div>
                                <button onClick={() => setSharingAgreement(null)} className="w-full py-5 text-[9px] font-black uppercase tracking-[0.4em] text-gray-600 hover:text-white bg-white/[0.02]">Cancel</button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AgreementManagement;
