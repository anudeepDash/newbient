import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Megaphone, Plus, Search, MapPin, Edit, Trash2, Users, IndianRupee, Download, Upload, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadCSV, CSVUploadButton } from '../../components/admin/CSVHandler';

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
            alert("Error saving campaign");
        }
    };

    const handleEdit = (campaign) => {
        setFormData({ ...campaign, tasks: campaign.tasks || [] });
        setEditingId(campaign.id);
        setIsCreating(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this campaign?")) {
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
            alert("No creators have applied to this campaign yet.");
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
            Twitter: c.twitter,
            Status: c.profileStatus || 'pending'
        }));

        downloadCSV(exportData, `${campaign.title.replace(/\s+/g, '_')}_Applicants`);
    };

    const handleUploadShortlist = async (campaignId, parsedData) => {
        // Find all UIDs in the CSV
        const uploadedUids = parsedData.map(row => row.UID).filter(Boolean);

        if (uploadedUids.length === 0) {
            alert("No valid UIDs found in the CSV. Make sure the column 'UID' exists.");
            return;
        }

        setIsProcessingCSV(true);
        try {
            // Get all creators who applied to THIS campaign
            const appliedCreators = useStore.getState().creators.filter(c => (c.joinedCampaigns || []).includes(campaignId));

            // Separate into approved and rejected based on presence in CSV
            const approvedUids = appliedCreators.filter(c => uploadedUids.includes(c.uid)).map(c => c.uid);
            const rejectedUids = appliedCreators.filter(c => !uploadedUids.includes(c.uid)).map(c => c.uid);

            // Execute bulk updates
            if (approvedUids.length > 0) await useStore.getState().bulkShortlistCreators(campaignId, approvedUids, true);
            // if (rejectedUids.length > 0) await useStore.getState().bulkUpdateCreatorStatus(rejectedUids, 'rejected'); // Optional: explicitly reject others

            alert(`Successfully updated! Shortlisted ${approvedUids.length} creators.`);
        } catch (error) {
            console.error(error);
            alert("Error processing the shortlist.");
        } finally {
            setIsProcessingCSV(false);
        }
    };

    const handleToggleShortlist = async (creatorUid) => {
        try {
            if (!expandedCampaignId) return;
            await useStore.getState().toggleShortlistStatus(expandedCampaignId, creatorUid);
        } catch (error) {
            alert("Failed to toggle shortlist status");
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
            console.error(error);
            alert("Failed to verify task.");
        }
    };

    const expandedCampaign = campaigns.find(c => c.id === expandedCampaignId);
    
    // Get applied and approved creators for the expanded view
    const appliedCreatorsForExpanded = expandedCampaign 
        ? useStore.getState().creators.filter(c => (c.joinedCampaigns || []).includes(expandedCampaign.id))
        : [];
    const approvedCreatorsForExpanded = appliedCreatorsForExpanded.filter(c => (c.shortlistedCampaigns || []).includes(expandedCampaignId));

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-black text-white">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <Megaphone className="text-neon-blue" size={32} /> Campaign Manager
                        </h1>
                        <p className="text-gray-400 mt-2">Create and manage influencer marketing campaigns.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search campaigns..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 h-10 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue transition-all w-full sm:w-64 text-white placeholder:text-gray-500"
                            />
                        </div>
                        <Button onClick={() => { setIsCreating(true); setEditingId(null); setFormData({ title: '', description: '', targetCity: 'Any', reward: '', requirements: '', status: 'Open', createdBy: user?.uid || '', whatsappLink: '', tasks: [] }); }} className="bg-neon-blue text-black hover:bg-neon-blue/80 font-bold gap-2">
                            <Plus size={18} /> New Campaign
                        </Button>
                    </div>
                </div>

                {isCreating ? (
                    <Card className="bg-zinc-900 border-neon-blue/30 mb-8 p-6">
                        <h2 className="text-xl font-bold font-heading mb-6">{editingId ? 'Edit Campaign' : 'Create New Campaign'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Campaign Title</label>
                                    <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Summer Music Festival Promo" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target City</label>
                                    <select
                                        required
                                        value={formData.targetCity}
                                        onChange={e => setFormData({ ...formData, targetCity: e.target.value })}
                                        className="w-full h-12 bg-black/50 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-neon-blue transition-colors appearance-none"
                                    >
                                        <option value="Any" className="bg-zinc-900">Any City (National)</option>
                                        {PREDEFINED_CITIES.map(c => (
                                            <option key={c} value={c} className="bg-zinc-900">{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                                <textarea
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-neon-blue transition-colors h-32 resize-none"
                                    placeholder="Describe the campaign, deliverables, and timeline..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Reward / Budget</label>
                                    <Input required value={formData.reward} onChange={e => setFormData({ ...formData, reward: e.target.value })} placeholder="e.g. ₹5000 + Free Tickets" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Requirements (Follower count, edits, etc)</label>
                                    <Input value={formData.requirements} onChange={e => setFormData({ ...formData, requirements: e.target.value })} placeholder="e.g. Min 10k followers on Instagram" />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">WhatsApp Group Link (Optional)</label>
                                <Input value={formData.whatsappLink} onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })} placeholder="https://chat.whatsapp.com/..." />
                                <p className="text-[10px] text-gray-500 mt-1">Shortlisted creators will see this link to coordinate.</p>
                            </div>

                            {/* Task Manager Section */}
                            <div className="pt-6 border-t border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-neon-green" /> Campaign Tasks
                                    </h3>
                                    <Button type="button" onClick={handleAddTask} variant="outline" className="h-8 text-xs border-neon-green text-neon-green hover:bg-neon-green hover:text-black">
                                        <Plus size={12} className="mr-1" /> Add Task
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {formData.tasks.map((task, index) => (
                                        <div key={task.id} className="bg-black/30 border border-white/5 rounded-xl p-4 relative">
                                            <button type="button" onClick={() => handleRemoveTask(index)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-6">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Task Title</label>
                                                    <Input required value={task.title} onChange={e => handleTaskChange(index, 'title', e.target.value)} placeholder="e.g. Post 1 Instagram Reel" className="h-10 text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Creative Link (Optional)</label>
                                                    <Input value={task.creativeLink} onChange={e => handleTaskChange(index, 'creativeLink', e.target.value)} placeholder="Google Drive/Dropbox link" className="h-10 text-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Task Instructions</label>
                                                <Input value={task.description} onChange={e => handleTaskChange(index, 'description', e.target.value)} placeholder="Specific guidelines..." className="h-10 text-sm" />
                                            </div>
                                        </div>
                                    ))}
                                    {formData.tasks.length === 0 && (
                                        <p className="text-xs text-gray-500 italic text-center py-4">No tasks added yet. Creators will not have a checklist.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-8 border-t border-white/10">
                                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                                <Button type="submit" className="bg-neon-blue text-black hover:bg-neon-blue/80 font-bold">{editingId ? 'Update' : 'Create'} Campaign</Button>
                            </div>
                        </form>
                    </Card>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCampaigns.map(campaign => (
                        <div key={campaign.id} className="bg-zinc-900 border border-white/10 rounded-[2rem] p-6 flex flex-col h-full relative group hover:border-neon-blue/50 transition-all shadow-lg hover:-translate-y-1 cursor-pointer" onClick={() => setExpandedCampaignId(campaign.id)}>
                            <div className="flex items-start justify-between mb-4">
                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${campaign.status === 'Open' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                    {campaign.status}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(campaign); }} className="p-2 bg-white/5 rounded-full text-gray-400 hover:bg-white/10 hover:text-neon-blue transition-colors"><Edit size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id); }} className="p-2 bg-white/5 rounded-full text-gray-400 hover:bg-white/10 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-bold font-heading mb-2 group-hover:text-neon-blue transition-colors">{campaign.title}</h3>
                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                    <span className="flex items-center gap-1"><MapPin size={12} className="text-neon-blue" /> {campaign.targetCity}</span>
                                    <span className="flex items-center gap-1"><IndianRupee size={12} className="text-neon-green" /> {campaign.reward}</span>
                                </div>

                                <p className="text-gray-400 text-sm line-clamp-3 mb-6">{campaign.description}</p>
                                
                                <div className="mt-4 pt-4 border-t border-white/5 font-medium text-xs text-neon-blue flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Users size={14}/> View Applications & Tasks</span>
                                    <span className="text-gray-500 text-[10px] uppercase tracking-widest">{campaign.tasks?.length || 0} Tasks</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {campaigns.length === 0 && !isCreating && (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-gray-500 mb-4">No campaigns active.</p>
                        <Button onClick={() => setIsCreating(true)} className="bg-neon-blue text-black hover:bg-neon-blue/80">
                            Create First Campaign
                        </Button>
                    </div>
                )}
            </div>

            {/* EXPANDED CAMPAIGN MODAL */}
            <AnimatePresence>
                {expandedCampaign && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setExpandedCampaignId(null)} />
                        
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-zinc-900 border border-white/10 rounded-[2rem] max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                            <button onClick={() => setExpandedCampaignId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-white z-10 bg-black/50 p-2 rounded-full backdrop-blur-sm">✕</button>

                            <div className="p-8 border-b border-white/10 shrink-0 bg-gradient-to-r from-neon-blue/10 to-transparent">
                                <div className={`inline-block px-3 py-1 mb-4 rounded-full text-[10px] font-bold uppercase tracking-widest border ${expandedCampaign.status === 'Open' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                    {expandedCampaign.status}
                                </div>
                                <h2 className="text-3xl font-bold font-heading mb-2 text-white">{expandedCampaign.title}</h2>
                                <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
                                    <span className="flex items-center gap-1"><MapPin size={14} className="text-neon-blue" /> {expandedCampaign.targetCity}</span>
                                    <span className="flex items-center gap-1"><IndianRupee size={14} className="text-neon-green" /> {expandedCampaign.reward}</span>
                                </div>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* LEFT COLUMN: APPLICANTS */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                                            <Users size={18} className="text-neon-blue"/> Applied Creators ({appliedCreatorsForExpanded.length})
                                        </h3>
                                        <div className="flex gap-2">
                                            <Button title="Download CSV" onClick={() => handleDownloadApplications(expandedCampaign)} variant="outline" className="h-8 px-2 border-white/10 hover:border-white group flex items-center justify-center">
                                                <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                                            </Button>
                                            <CSVUploadButton onUpload={(data) => handleUploadShortlist(expandedCampaign.id, data)} isLoading={isProcessingCSV} className="h-8 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-neon-blue/10 text-neon-blue border border-neon-blue/20 hover:bg-neon-blue hover:text-black transition-colors" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {appliedCreatorsForExpanded.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic p-4 bg-white/5 rounded-xl border border-white/5">No one has applied yet.</p>
                                        ) : (
                                            appliedCreatorsForExpanded.map(creator => (
                                                <div key={creator.uid} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">
                                                            {(creator.name || 'U').charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-white">{creator.name}</p>
                                                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                                <span className={creator.profileStatus === 'approved' ? 'text-neon-green font-bold' : ''}>{creator.profileStatus || 'Pending'}</span>
                                                                {creator.instagramFollowers && <span>• {Number(creator.instagramFollowers).toLocaleString()} Insta</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleToggleShortlist(creator.uid); }}
                                                            className={`text-[10px] px-3 py-1.5 font-bold uppercase tracking-widest rounded-lg transition-colors border ${
                                                                (creator.shortlistedCampaigns || []).includes(expandedCampaignId)
                                                                    ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
                                                                    : 'bg-neon-green/10 text-neon-green border-neon-green/20 hover:bg-neon-green hover:text-black'
                                                            }`}
                                                        >
                                                            {(creator.shortlistedCampaigns || []).includes(expandedCampaignId) ? 'Remove Shortlist' : 'Shortlist'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: TASKS */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                                            <CheckCircle2 size={18} className="text-neon-green"/> Campaign Tasks ({expandedCampaign.tasks?.length || 0})
                                        </h3>
                                        <Button 
                                            onClick={() => {
                                                handleEdit(expandedCampaign);
                                                setExpandedCampaignId(null);
                                            }}
                                            variant="outline" 
                                            className="h-8 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10 hover:border-white hover:text-white transition-colors flex items-center gap-1"
                                        >
                                            <Edit size={12} /> Edit Tasks
                                        </Button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {(!expandedCampaign.tasks || expandedCampaign.tasks.length === 0) ? (
                                            <p className="text-sm text-gray-500 italic p-4 bg-white/5 rounded-xl border border-white/5">No tasks have been set up for this campaign.</p>
                                        ) : (
                                            expandedCampaign.tasks.map(task => {
                                                // Calculate metrics
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
                                                    <div key={task.id} className="p-4 bg-black/40 border border-white/5 rounded-xl">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <h4 className="font-bold text-sm text-white">{task.title}</h4>
                                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400 font-bold">{completionRate}% Done</span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mb-3">{task.description}</p>
                                                        
                                                        {pendingUids.length > 0 && (
                                                            <div className="pt-3 border-t border-white/5 mb-3">
                                                                <p className="text-[10px] uppercase font-bold text-yellow-500 tracking-widest mb-2 flex items-center gap-1">
                                                                    <Sparkles size={10} /> Pending Verification
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {pendingUids.map(uid => {
                                                                        const creator = approvedCreatorsForExpanded.find(c => c.uid === uid);
                                                                        return creator ? (
                                                                            <div key={uid} className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md pl-2 pr-1 py-1">
                                                                                <span className="text-xs text-yellow-500 whitespace-nowrap">{creator.name}</span>
                                                                                <button 
                                                                                    onClick={() => handleVerifyTask(expandedCampaign.id, task.id, uid)}
                                                                                    className="bg-white/10 hover:bg-white/20 text-white rounded p-1 ml-1 transition-colors flex items-center justify-center group"
                                                                                    title="Verify Task"
                                                                                >
                                                                                    <CheckCircle2 size={10} className="group-hover:text-neon-green" />
                                                                                </button>
                                                                            </div>
                                                                        ) : null;
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {verifiedUids.length > 0 ? (
                                                            <div className="pt-3 border-t border-white/5">
                                                                <p className="text-[10px] uppercase font-bold text-neon-green tracking-widest mb-2 flex items-center gap-1">
                                                                    <CheckCircle2 size={10} /> Verified Complete
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {verifiedUids.map(uid => {
                                                                        const creator = approvedCreatorsForExpanded.find(c => c.uid === uid);
                                                                        return creator ? (
                                                                            <span key={uid} className="text-xs px-2 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-md">
                                                                                {creator.name}
                                                                            </span>
                                                                        ) : null;
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            pendingUids.length === 0 && (
                                                                <div className="pt-3 border-t border-white/5">
                                                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">No one has completed this yet.</p>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 border-t border-white/10 shrink-0 bg-black/50 backdrop-blur-md flex justify-end">
                                <Button
                                    onClick={() => toggleStatus(expandedCampaign.id, expandedCampaign.status)}
                                    variant="outline"
                                    className="text-xs h-10 border-white/10 hover:border-white hover:text-white"
                                >
                                    {expandedCampaign.status === 'Open' ? 'Close Campaign' : 'Reopen Campaign'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CampaignManager;
