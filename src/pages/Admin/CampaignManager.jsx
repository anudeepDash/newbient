import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Megaphone, Plus, Search, MapPin, Edit, Trash2, Users, IndianRupee, Download, Upload, CheckCircle2, Sparkles, LayoutGrid, X, Filter, Globe, Zap, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadCSV, CSVUploadButton } from '../../components/admin/CSVHandler';
import { cn } from '../../lib/utils';

const CampaignManager = () => {
    const { campaigns, addCampaign, updateCampaign, deleteCampaign, user } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [expandedCampaignId, setExpandedCampaignId] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        targetCity: 'Any',
        reward: '',
        requirements: '',
        status: 'Open',
        createdBy: user?.uid || '',
        whatsappLink: '',
        tasks: []
    });

    const [isProcessingCSV, setIsProcessingCSV] = useState(false);

    const filteredCampaigns = campaigns.filter(c =>
        (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.targetCity || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateCampaign(editingId, formData);
            } else {
                await addCampaign(formData);
            }
            setIsCreating(false);
            setEditingId(null);
            setFormData({ title: '', description: '', targetCity: 'Any', reward: '', requirements: '', status: 'Open', createdBy: user?.uid || '', whatsappLink: '', tasks: [] });
        } catch (error) {
            alert("Storage error.");
        }
    };

    const handleEdit = (campaign) => {
        setFormData({ ...campaign, tasks: campaign.tasks || [] });
        setEditingId(campaign.id);
        setIsCreating(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Archive this campaign forever?")) {
            await deleteCampaign(id);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        await updateCampaign(id, { status: currentStatus === 'Open' ? 'Closed' : 'Open' });
    };

    const handleAddTask = () => {
        setFormData({
            ...formData,
            tasks: [...formData.tasks, { id: Date.now().toString(), title: '', description: '', creativeLink: '', completedBy: [] }]
        });
    };

    const handleTaskChange = (index, field, value) => {
        const newTasks = [...formData.tasks];
        newTasks[index][field] = value;
        setFormData({ ...formData, tasks: newTasks });
    };

    const handleRemoveTask = (index) => {
        const newTasks = [...formData.tasks];
        newTasks.splice(index, 1);
        setFormData({ ...formData, tasks: newTasks });
    };

    const handleDownloadApplications = (campaign) => {
        const appliedCreators = useStore.getState().creators.filter(c => (c.joinedCampaigns || []).includes(campaign.id));
        if (appliedCreators.length === 0) {
            alert("No applications yet.");
            return;
        }

        const exportData = appliedCreators.map(c => ({
            UID: c.uid,
            Name: c.name,
            Phone: c.phone,
            City: c.city,
            Niches: (c.niches || []).join(', '),
            Instagram: c.instagram,
            InstaFollowers: c.instagramFollowers || '0',
            YouTube: c.youtube,
            YTSubscribers: c.youtubeSubscribers || '0',
            Status: c.profileStatus || 'pending'
        }));

        downloadCSV(exportData, `${campaign.title.replace(/\s+/g, '_')}_Applicants`);
    };

    const handleUploadShortlist = async (campaignId, parsedData) => {
        const uploadedUids = parsedData.map(row => row.UID).filter(Boolean);
        if (uploadedUids.length === 0) {
            alert("No UID col found in CSV.");
            return;
        }

        setIsProcessingCSV(true);
        try {
            const appliedCreators = useStore.getState().creators.filter(c => (c.joinedCampaigns || []).includes(campaignId));
            const approvedUids = appliedCreators.filter(c => uploadedUids.includes(c.uid)).map(c => c.uid);
            if (approvedUids.length > 0) await useStore.getState().bulkShortlistCreators(campaignId, approvedUids, true);
            alert(`Shortlisted ${approvedUids.length} assets.`);
        } catch (error) {
            alert("Sync error.");
        } finally {
            setIsProcessingCSV(false);
        }
    };

    const handleToggleShortlist = async (creatorUid) => {
        try {
            if (!expandedCampaignId) return;
            await useStore.getState().toggleShortlistStatus(expandedCampaignId, creatorUid);
        } catch (error) {
            alert("Failed to toggle shortlist.");
        }
    };

    const handleVerifyTask = async (campaignId, taskId, creatorUid) => {
        try {
            const campaign = campaigns.find(c => c.id === campaignId);
            if (!campaign) return;
            const updatedTasks = campaign.tasks.map(t => {
                if (t.id === taskId) {
                    const verifiedBy = t.verifiedBy || [];
                    if (!verifiedBy.includes(creatorUid)) {
                        return { ...t, verifiedBy: [...verifiedBy, creatorUid] };
                    }
                }
                return t;
            });
            await useStore.getState().updateCampaign(campaignId, { tasks: updatedTasks });
        } catch (error) {
            alert("Verification failed.");
        }
    };

    const expandedCampaign = campaigns.find(c => c.id === expandedCampaignId);
    const appliedCreatorsForExpanded = expandedCampaign 
        ? useStore.getState().creators.filter(c => (c.joinedCampaigns || []).includes(expandedCampaign.id))
        : [];
    const approvedCreatorsForExpanded = appliedCreatorsForExpanded.filter(c => (c.shortlistedCampaigns || []).includes(expandedCampaignId));

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Immersive Atmos */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[40%] h-[40%] bg-neon-green/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 md:pt-32">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                    <div className="space-y-4">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] mb-4 group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO COMMAND CENTRE
                        </Link>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">
                            CAMPAIGN <span className="text-neon-blue">REGISTRY.</span>
                        </h1>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="SEARCH NEWBI CAMPAIGNS"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-14 pl-14 pr-6 bg-zinc-900/50 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-neon-blue/30 outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <Button onClick={() => { setIsCreating(true); setEditingId(null); setFormData({ title: '', description: '', targetCity: 'Any', reward: '', requirements: '', status: 'Open', createdBy: user?.uid || '', whatsappLink: '', tasks: [] }); }} className="h-14 px-8 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] hover:scale-105 active:scale-95 transition-all">
                            <Plus className="mr-2" size={18} /> Create Campaign
                        </Button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCampaigns.map(campaign => (
                        <motion.div 
                            key={campaign.id} 
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 flex flex-col h-full relative group hover:border-neon-blue/30 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,255,255,0.05)] cursor-pointer" 
                            onClick={() => setExpandedCampaignId(campaign.id)}
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className={cn(
                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                                    campaign.status === 'Open' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-red-500/10 text-red-500 border-red-500/20 opacity-60'
                                )}>
                                    MISSION STATUS: {campaign.status}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(campaign); }} className="p-2.5 bg-white/5 rounded-xl text-gray-500 hover:text-neon-blue transition-colors"><Edit size={16} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id); }} className="p-2.5 bg-white/5 rounded-xl text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-2xl font-black font-heading mb-3 uppercase italic tracking-tight group-hover:text-neon-blue transition-colors">{campaign.title}</h3>
                                <div className="flex flex-wrap items-center gap-6 mb-8">
                                    <span className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest"><MapPin size={12} className="text-neon-blue" /> {campaign.targetCity}</span>
                                    <span className="flex items-center gap-2 text-[10px] font-black text-neon-green uppercase tracking-widest"><Zap size={12} /> {campaign.reward}</span>
                                </div>

                                <p className="text-gray-400 text-sm font-medium line-clamp-3 mb-10 leading-relaxed border-l-2 border-white/5 pl-4">{campaign.description}</p>
                                
                                <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-900 group-hover:border-neon-blue/30 transition-colors" />)}
                                        </div>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{campaign.tasks?.length || 0} TASKS</span>
                                    </div>
                                    <ChevronRight className="text-gray-700 group-hover:text-neon-blue group-hover:translate-x-1 transition-all" size={20} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {campaigns.length === 0 && !isCreating && (
                    <div className="py-32 text-center bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
                            <Megaphone size={40} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-500 italic">No missions deployed.</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Start by creating a new mission briefing.</p>
                        </div>
                        <Button onClick={() => setIsCreating(true)} className="h-14 px-8 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl mt-4">
                            CREATE MISSION
                        </Button>
                    </div>
                )}
            </div>

            {/* CREATE/EDIT MODAL overlay */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 md:p-6 pt-20 pb-20 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreating(false)} className="fixed inset-0 bg-black/95 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="relative bg-zinc-900 border border-white/10 rounded-[3rem] p-6 md:p-10 max-w-4xl w-full max-h-[85vh] md:max-h-[95vh] overflow-y-auto custom-scrollbar shrink-0">
                            <button onClick={() => setIsCreating(false)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all group z-20">
                                <X size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                            
                            <h2 className="text-4xl font-black font-heading tracking-tighter uppercase italic text-white mb-10">{editingId ? 'EDIT' : 'NEW'} <span className="text-neon-blue">DETAILS.</span></h2>
                            
                            <form onSubmit={handleSubmit} className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Campaign Title</label>
                                        <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Summer Brand Campaign" className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Sector (City)</label>
                                        <div className="relative">
                                            <select
                                                required
                                                value={formData.targetCity}
                                                onChange={e => setFormData({ ...formData, targetCity: e.target.value })}
                                                className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl px-6 text-[11px] font-bold text-white focus:outline-none focus:border-neon-blue transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="Any" className="bg-zinc-900">UNIVERSAL (NATIONAL)</option>
                                                {PREDEFINED_CITIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c.toUpperCase()}</option>)}
                                            </select>
                                            <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 rotate-90" size={14} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Campaign Description</label>
                                        <textarea
                                            required
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-black/50 border border-white/5 rounded-[2rem] p-6 text-[11px] font-black uppercase tracking-widest text-gray-300 focus:outline-none focus:border-neon-blue transition-all h-40 resize-none shadow-inner"
                                            placeholder="OUTLINE CAMPAIGN GOALS AND DELIVERABLES..."
                                        />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Campaign Reward</label>
                                        <Input required value={formData.reward} onChange={e => setFormData({ ...formData, reward: e.target.value })} placeholder="e.g. ₹10,000 + Brand Gifts" className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Campaign Requirements</label>
                                        <Input value={formData.requirements} onChange={e => setFormData({ ...formData, requirements: e.target.value })} placeholder="e.g. 20k+ Followers" className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                    </div>
                                </div>

                                <div className="pt-10 border-t border-white/5 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                            <div className="w-8 h-px bg-neon-green" /> CAMPAIGN TASKS
                                        </h3>
                                        <button type="button" onClick={handleAddTask} className="h-10 px-6 rounded-xl border border-neon-green/30 text-neon-green text-[9px] font-black uppercase tracking-widest hover:bg-neon-green hover:text-black transition-all">
                                            + ADD TASK
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <AnimatePresence mode="popLayout">
                                        {formData.tasks.map((task, index) => (
                                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={task.id} className="bg-black/40 border border-white/5 rounded-[2rem] p-8 relative group">
                                                <button type="button" onClick={() => handleRemoveTask(index)} className="absolute top-6 right-6 text-gray-600 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 pr-10">
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Task Label</label>
                                                        <Input required value={task.title} onChange={e => handleTaskChange(index, 'title', e.target.value)} placeholder="e.g. 1x INSTAGRAM REEL" className="h-14 bg-zinc-900/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Resource Link (Shared Drive)</label>
                                                        <Input value={task.creativeLink} onChange={e => handleTaskChange(index, 'creativeLink', e.target.value)} placeholder="LINK TO ASSETS..." className="h-14 bg-zinc-900/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Detailed Instructions</label>
                                                    <Input value={task.description} onChange={e => handleTaskChange(index, 'description', e.target.value)} placeholder="GUIDELINES FOR EXECUTION..." className="h-14 bg-zinc-900/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest" />
                                                </div>
                                            </motion.div>
                                        ))}
                                        </AnimatePresence>
                                        {formData.tasks.length === 0 && (
                                            <div className="text-center py-12 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No specific objectives set for this deployment.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-10 border-t border-white/10 flex flex-col sm:flex-row gap-6">
                                    <div className="flex-1 space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">WhatsApp Comm-Link</label>
                                        <Input value={formData.whatsappLink} onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })} placeholder="https://chat.whatsapp.com/..." className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4 pt-6 sm:pt-0">
                                        <Button type="button" variant="outline" onClick={() => setIsCreating(false)} className="h-14 px-10 rounded-2xl border-white/10 text-gray-400 hover:text-white uppercase text-[10px] font-black tracking-widest">Cancel</Button>
                                        <Button type="submit" className="h-14 px-10 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105">
                                            {editingId ? 'UPDATE' : 'CREATE'} CAMPAIGN
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* EXPANDED MISSION ANALYTICS */}
            <AnimatePresence>
                {expandedCampaign && (
                    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 md:p-6 pt-20 pb-20 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setExpandedCampaignId(null)} />
                        
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="relative bg-zinc-900 border border-white/10 rounded-[3rem] p-0 max-w-6xl w-full max-h-[85vh] md:max-h-[95vh] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col shrink-0">
                            
                            <div className="p-10 border-b border-white/10 bg-gradient-to-r from-neon-blue/[0.05] to-transparent relative shrink-0">
                                <button onClick={() => setExpandedCampaignId(null)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all z-20 group">
                                    <X size={20} className="group-hover:scale-110 transition-transform" />
                                </button>
                                
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mr-10 pt-2">
                                    <div>
                                        <div className={cn(
                                            "inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border mb-6",
                                            expandedCampaign.status === 'Open' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                        )}>
                                            {expandedCampaign.status} MISSION
                                        </div>
                                        <h2 className="text-5xl font-black font-heading tracking-tighter uppercase italic text-white mb-4">{expandedCampaign.title}</h2>
                                        <div className="flex flex-wrap gap-6">
                                            <span className="flex items-center gap-2 text-[11px] font-black text-gray-500 uppercase tracking-widest"><MapPin size={14} className="text-neon-blue" /> {expandedCampaign.targetCity}</span>
                                            <span className="flex items-center gap-2 text-[11px] font-black text-neon-green uppercase tracking-widest"><IndianRupee size={14} /> {expandedCampaign.reward}</span>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => toggleStatus(expandedCampaign.id, expandedCampaign.status)}
                                        className="h-12 px-6 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest hover:border-white transition-all text-gray-500 hover:text-white"
                                    >
                                        {expandedCampaign.status === 'Open' ? 'SUSPEND MISSION' : 'RE-DEPLOY MISSION'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 grid grid-cols-1 lg:grid-cols-2 gap-12 bg-black/20">
                                
                                {/* APPLICANTS */}
                                <div className="space-y-10">
                                    <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                            <div className="w-8 h-px bg-neon-blue" /> APPLICANT LIST ({appliedCreatorsForExpanded.length})
                                        </h3>
                                        <div className="flex gap-4">
                                            <button onClick={() => handleDownloadApplications(expandedCampaign)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all border border-white/5">
                                                <Download size={16} />
                                            </button>
                                            <CSVUploadButton onUpload={(data) => handleUploadShortlist(expandedCampaign.id, data)} isLoading={isProcessingCSV} className="h-10 px-5 rounded-xl bg-neon-blue/10 text-neon-blue border border-neon-blue/20 text-[9px] font-black uppercase tracking-widest hover:bg-neon-blue hover:text-black transition-all" />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pr-4">
                                        {appliedCreatorsForExpanded.length === 0 ? (
                                            <div className="p-10 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/5">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">No asset signals detected yet.</p>
                                            </div>
                                        ) : (
                                            appliedCreatorsForExpanded.map(creator => (
                                                <div key={creator.uid} className="flex items-center justify-between p-6 bg-zinc-900/60 border border-white/5 rounded-[2rem] group/asset hover:bg-zinc-900 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-black text-lg group-hover/asset:bg-neon-blue/10 group-hover/asset:text-neon-blue transition-all">
                                                            {(creator.name || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-[13px] text-white uppercase tracking-tight">{creator.name}</p>
                                                            <div className="flex items-center gap-3 mt-1 underline-offset-4 decoration-neon-blue/20">
                                                                <span className={cn(
                                                                    "text-[8px] font-black uppercase tracking-[0.2em]",
                                                                    creator.profileStatus === 'approved' ? 'text-neon-green' : 'text-gray-600'
                                                                )}>{creator.profileStatus || 'PENDING'}</span>
                                                                <span className="w-1 h-1 rounded-full bg-gray-800" />
                                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{Number(creator.instagramFollowers || 0).toLocaleString()} REACH</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleToggleShortlist(creator.uid); }}
                                                        className={cn(
                                                            "text-[9px] h-10 px-5 font-black uppercase tracking-widest rounded-xl transition-all border",
                                                            (creator.shortlistedCampaigns || []).includes(expandedCampaignId)
                                                                ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-black'
                                                                : 'bg-neon-green/10 text-neon-green border-neon-green/20 hover:bg-neon-green hover:text-black'
                                                        )}
                                                    >
                                                        {(creator.shortlistedCampaigns || []).includes(expandedCampaignId) ? 'REVOKE STATUS' : 'SHORTLIST'}
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* OBJECTIVES TRACKER */}
                                <div className="space-y-10">
                                    <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                            <div className="w-8 h-px bg-neon-green" /> TASK TRACKER
                                        </h3>
                                        <button 
                                            onClick={() => {
                                                handleEdit(expandedCampaign);
                                                setExpandedCampaignId(null);
                                            }}
                                            className="h-10 px-5 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:border-white transition-all flex items-center gap-3"
                                        >
                                            <Edit size={14} /> EDIT COMMANDS
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-8">
                                        {(!expandedCampaign.tasks || expandedCampaign.tasks.length === 0) ? (
                                            <div className="p-10 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/5">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">No mission objectives defined.</p>
                                            </div>
                                        ) : (
                                            expandedCampaign.tasks.map(task => {
                                                const verifiedUids = (task.verifiedBy || []).filter(uid => 
                                                    approvedCreatorsForExpanded.some(c => c.uid === uid)
                                                );
                                                const pendingUids = (task.completedBy || []).filter(uid => 
                                                    approvedCreatorsForExpanded.some(c => c.uid === uid) && 
                                                    !verifiedUids.includes(uid)
                                                );
                                                const completionRate = approvedCreatorsForExpanded.length > 0 
                                                    ? Math.round((verifiedUids.length / approvedCreatorsForExpanded.length) * 100) 
                                                    : 0;

                                                return (
                                                    <div key={task.id} className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] relative overflow-hidden">
                                                        {/* Progress bar subtle */}
                                                        <div className="absolute top-0 left-0 h-1 bg-neon-green transition-all duration-1000" style={{ width: `${completionRate}%` }} />
                                                        
                                                        <div className="flex items-start justify-between mb-4">
                                                            <h4 className="font-black text-lg text-white uppercase tracking-tight italic">{task.title}</h4>
                                                            <span className="text-[9px] px-3 py-1 bg-white/5 rounded-full text-neon-green font-black uppercase tracking-widest border border-neon-green/20">{completionRate}% COMPLETE</span>
                                                        </div>
                                                        <p className="text-[11px] font-medium text-gray-500 mb-8 border-l border-white/10 pl-4">{task.description}</p>
                                                        
                                                        <div className="space-y-6">
                                                            {pendingUids.length > 0 && (
                                                                <div className="space-y-3">
                                                                    <p className="text-[8px] uppercase font-black text-yellow-500 tracking-[0.3em] flex items-center gap-2">
                                                                        <Sparkles size={10} className="animate-pulse" /> PENDING VERIFICATION
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-3">
                                                                        {pendingUids.map(uid => {
                                                                            const creator = approvedCreatorsForExpanded.find(c => c.uid === uid);
                                                                            return creator ? (
                                                                                <div key={uid} className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl pl-4 pr-1 py-1 group/v">
                                                                                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">{creator.name}</span>
                                                                                    <button 
                                                                                        onClick={() => handleVerifyTask(expandedCampaign.id, task.id, uid)}
                                                                                        className="w-8 h-8 bg-black/40 hover:bg-neon-green text-white rounded-lg transition-all flex items-center justify-center"
                                                                                        title="Verify Data"
                                                                                    >
                                                                                        <CheckCircle2 size={12} />
                                                                                    </button>
                                                                                </div>
                                                                            ) : null;
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="space-y-3 pt-6 border-t border-white/5">
                                                                <p className="text-[8px] uppercase font-black text-gray-500 tracking-[0.3em] flex items-center gap-2">
                                                                    <CheckCircle2 size={10} /> CLEARANCE GRANTED ({verifiedUids.length})
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {verifiedUids.length > 0 ? verifiedUids.map(uid => {
                                                                        const creator = approvedCreatorsForExpanded.find(c => c.uid === uid);
                                                                        return creator ? (
                                                                            <span key={uid} className="text-[9px] px-3 py-1.5 bg-neon-green/5 text-neon-green/60 border border-neon-green/10 rounded-lg font-black uppercase tracking-widest">
                                                                                {creator.name}
                                                                            </span>
                                                                        ) : null;
                                                                    }) : (
                                                                        <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">AWAITING INTEL...</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CampaignManager;
