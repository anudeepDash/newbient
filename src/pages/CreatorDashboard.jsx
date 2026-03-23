import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { MapPin, Calendar, ArrowRight, CheckCircle2, DollarSign, ExternalLink, Sparkles, MessageCircle, FileText, ChevronDown, ChevronUp, Target, Award, Star, Trash2, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreatorCampaignCard = ({ campaign, profile, type, handleApply, handleTaskToggle }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const isJoined = type === 'joined';
    const isShortlisted = (profile.shortlistedCampaigns || []).includes(campaign.id);

    return (
        <div className="perspective-1000 w-full min-h-[380px]">
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full h-full preserve-3d"
            >
                {/* Front Side */}
                <div className="backface-hidden relative bg-zinc-900/40 backdrop-blur-[20px] border border-white/10 hover:border-neon-pink/40 shadow-2xl rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-500 hover:shadow-neon-pink/10 h-full">
                    {/* Ambient Glow */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-neon-pink blur-[80px] pointer-events-none opacity-20 transition-opacity duration-700 group-hover:opacity-40" />
                   
                    <div className="flex flex-col h-full">
                        <div className="p-6 md:p-8 flex flex-col relative overflow-hidden flex-1">
                            <div className="absolute -right-8 -bottom-8 opacity-[0.03] rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                <Sparkles size={180} />
                            </div>

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-neon-pink group-hover:scale-110 transition-transform shadow-lg border-neon-pink/20">
                                        <Sparkles size={24} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                            <MapPin size={10} className="text-neon-pink" /> {campaign.targetCity}
                                        </span>
                                    </div>
                                </div>
                                
                                {isJoined && (
                                    <span className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full border shadow-lg backdrop-blur-md ${isShortlisted ? 'bg-neon-green/10 text-neon-green border-neon-green/20 shadow-neon-green/10' : 'bg-neon-blue/10 text-neon-blue border-neon-blue/20 shadow-neon-blue/10'}`}>
                                        {isShortlisted ? 'Shortlisted' : 'Applied'}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 relative z-10">
                                <h3 className="text-xl lg:text-2xl font-black font-heading mb-3 text-white group-hover:text-neon-pink transition-colors leading-tight uppercase">
                                    {campaign.title}
                                </h3>
                                <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed mb-6 font-medium italic opacity-80 break-words">
                                    "{campaign.description}"
                                </p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="px-8 shrink-0">
                            <div className="h-px w-full bg-white/5"></div>
                        </div>

                        {/* Action Section */}
                        <div className="p-6 md:p-8 flex flex-col justify-between items-center relative gap-4">
                            <div className="w-full flex items-start justify-between gap-4">
                                <div className="flex flex-col items-start gap-1 max-w-[70%]">
                                    <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">Reward</span>
                                    <span className="text-neon-green font-bold flex items-start gap-1 text-sm sm:text-base break-words">
                                        <span>{campaign.reward}</span>
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors shrink-0 pt-1"
                                >
                                    [ Details ]
                                </button>
                            </div>

                            {!isJoined && (
                                <Button
                                    onClick={() => handleApply(campaign.id)}
                                    className="w-full h-12 bg-neon-pink text-black hover:bg-neon-pink/80 rounded-xl font-bold uppercase tracking-widest text-xs gap-2 transition-all shadow-[0_0_20px_rgba(255,0,255,0.3)] hover:shadow-[0_0_30px_rgba(255,0,255,0.5)] hover:scale-[1.02]"
                                >
                                    Apply Now <ArrowRight size={14} />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Back Side */}
                <div className="backface-hidden rotate-y-180 absolute inset-0 bg-zinc-950/60 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl backdrop-blur-3xl">
                    {/* Background Decorative Icon */}
                    <div className="absolute -right-12 -bottom-12 opacity-[0.05] rotate-12 pointer-events-none transition-transform duration-1000 group-hover:scale-110 text-neon-blue">
                        <FileText size={240} />
                    </div>
                    
                    <div className="p-6 md:p-8 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-neon-blue uppercase tracking-[0.3em] mb-1">CAMPAIGN INFO</span>
                                <h4 className="text-xl font-black font-heading text-white tracking-tight uppercase">MISSION BRIEF</h4>
                            </div>
                            <button
                                onClick={() => setIsFlipped(false)}
                                className="text-gray-400 hover:text-white p-3 bg-white/5 border border-white/10 rounded-full transition-all hover:bg-white/10 shrink-0"
                            >
                                <ArrowRight className="rotate-180" size={16} />
                            </button>
                        </div>
                        
                        <div className="mb-6 shrink-0 pr-1">
                            <p className="text-xs md:text-sm text-gray-400 font-medium leading-relaxed mb-4 whitespace-pre-wrap">
                                {campaign.description}
                            </p>
                            
                            {campaign.requirements && (
                                <div className="p-4 bg-neon-blue/5 border border-neon-blue/10 rounded-2xl backdrop-blur-md">
                                    <h5 className="text-[10px] uppercase tracking-[0.2em] font-black text-neon-blue mb-2 flex items-center gap-2">
                                        <Target size={12} /> Requirements
                                    </h5>
                                    <p className="text-xs text-gray-300 xl:text-sm whitespace-pre-wrap font-medium leading-relaxed">{campaign.requirements}</p>
                                </div>
                            )}
                        </div>

                        {/* Task Checklist for shortlisted creators */}
                        {isJoined && isShortlisted && campaign.tasks?.length > 0 && (
                            <div className="mt-2 space-y-4 pb-4 shrink-0">
                                <h5 className="text-[10px] uppercase font-black text-white tracking-[0.3em] border-b border-white/5 pb-3">Creator Tasks</h5>
                                <div className="space-y-3">
                                    {campaign.tasks.map(task => {
                                        const isCompleted = (task.completedBy || []).includes(profile.uid);
                                        const isVerified = (task.verifiedBy || []).includes(profile.uid);
                                        
                                        let statusConfig = {
                                            bg: 'bg-white/5 hover:bg-white/10',
                                            border: 'border-white/10',
                                            iconBg: 'border-white/20 text-transparent hover:border-neon-green/50',
                                            text: 'text-white',
                                            label: ''
                                        };
                                        
                                        if (isVerified) {
                                            statusConfig = { bg: 'bg-neon-green/5', border: 'border-neon-green/20', iconBg: 'bg-neon-green border-neon-green text-black', text: 'text-gray-500 line-through', label: 'Verified' };
                                        } else if (isCompleted) {
                                            statusConfig = { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', iconBg: 'bg-yellow-500 border-yellow-500 text-black', text: 'text-gray-300', label: 'Pending' };
                                        }

                                        return (
                                            <div key={task.id} className={`p-4 rounded-2xl border transition-all duration-300 backdrop-blur-sm ${statusConfig.bg} ${statusConfig.border}`}>
                                                <div className="flex items-start gap-4">
                                                    <button
                                                        disabled={isVerified}
                                                        onClick={() => handleTaskToggle(campaign.id, task.id, isCompleted, isVerified)}
                                                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${statusConfig.iconBg} ${isVerified ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110 shadow-lg'}`}
                                                    >
                                                        <CheckCircle2 size={12} />
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                                            <p className={`text-xs font-black uppercase tracking-tight ${statusConfig.text} break-words`}>{task.title}</p>
                                                            {statusConfig.label && (
                                                                <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black whitespace-nowrap shadow-sm ${isVerified ? 'bg-neon-green/20 text-neon-green border border-neon-green/20' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'}`}>
                                                                    {statusConfig.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {task.description && <p className="text-[10px] text-gray-500 font-medium leading-normal mb-2 break-words">{task.description}</p>}
                                                        {task.creativeLink && (
                                                            <a href={task.creativeLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-widest text-neon-blue hover:text-white transition-colors font-black bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 hover:bg-neon-blue/10">
                                                                <ExternalLink size={10} /> View Creative
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-3 shrink-0 mt-auto pt-6 border-t border-white/5">
                            {isJoined && isShortlisted && campaign.whatsappLink && (
                                <a href={campaign.whatsappLink} target="_blank" rel="noopener noreferrer" className="w-full">
                                    <Button className="w-full bg-[#25D366]/5 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/10 font-black h-12 text-[10px] uppercase tracking-[0.2em] gap-2 rounded-xl transition-all">
                                        <MessageCircle size={14} /> WhatsApp Group
                                    </Button>
                                </a>
                            )}
                            
                            {!isJoined && (
                                <Button
                                    onClick={() => handleApply(campaign.id)}
                                    className="w-full h-12 bg-neon-pink text-black hover:bg-neon-pink/80 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] gap-2 transition-all shadow-[0_0_20px_rgba(255,0,255,0.3)] hover:scale-[1.02]"
                                >
                                    Apply Now <ArrowRight size={14} />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const CreatorDashboard = () => {
    const { user, authInitialized, creators, campaigns, updateCreator, deleteCreator, siteSettings } = useStore();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isExploreOpen, setIsExploreOpen] = useState(true);

    const handleDeleteProfile = async () => {
        if (!window.confirm("ARE YOU SURE? This will permanently delete your creator profile and remove you from all campaigns. This cannot be undone.")) return;
        
        try {
            await deleteCreator(profile.uid);
            alert("Creator profile deleted successfully.");
            navigate('/');
        } catch (error) {
            console.error("Error deleting profile:", error);
            alert("Failed to delete profile.");
        }
    };

    useEffect(() => {
        if (authInitialized && user) {
            const existingProfile = creators.find(c => c.uid === user.uid);
            if (existingProfile) {
                setProfile(existingProfile);
            } else {
                navigate('/creator'); // Redirect to join if not found
            }
        } else if (authInitialized && !user) {
            navigate('/creator');
        }
    }, [user, authInitialized, creators, navigate]);

    if (!profile) {
        return <div className="min-h-screen bg-black flex items-center justify-center"><Sparkles className="animate-pulse text-neon-pink" size={48} /></div>;
    }

    if (profile.profileStatus === 'blocked') {
        return (
            <div className="min-h-screen bg-[#020202] text-white pt-32 pb-20 relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="max-w-xl mx-auto p-12 bg-zinc-900 border border-red-500/30 rounded-[3rem] shadow-[0_0_50px_rgba(255,0,0,0.1)]"
                >
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Ban size={40} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-bold font-heading mb-4 text-red-500">Access Suspended</h2>
                    <p className="text-gray-400 mb-8">Your access to the Creator Hub has been suspended by the administration. If you believe this is a mistake, please contact support.</p>
                    <Button onClick={() => navigate('/')} className="w-full bg-white text-black hover:bg-gray-200 h-14 rounded-2xl font-bold uppercase tracking-widest gap-2">
                        Back to Home
                    </Button>
                </motion.div>
            </div>
        );
    }

    // Filter campaigns based on tab and city
    const availableCampaigns = campaigns.filter(c =>
        c.status === 'Open' &&
        (c.targetCity === 'Any' || c.targetCity.toLowerCase() === profile.city.toLowerCase()) &&
        !(profile.joinedCampaigns || []).includes(c.id)
    );

    const joinedCampaignsList = campaigns.filter(c =>
        (profile.joinedCampaigns || []).includes(c.id)
    );

    const handleApply = async (campaignId) => {
        if (!window.confirm("Are you sure you want to apply for this campaign?")) return;

        try {
            const currentJoined = profile.joinedCampaigns || [];
            await updateCreator(profile.uid, {
                joinedCampaigns: [...currentJoined, campaignId]
            });
            alert("Application submitted! The brand will review your profile.");
        } catch (error) {
            console.error("Error applying:", error);
            alert("Failed to apply.");
        }
    };

    const handleTaskToggle = async (campaignId, taskId, isCompleted, isVerified) => {
        if (isVerified) return; // Cannot toggle if already verified

        try {
            const campaign = campaigns.find(c => c.id === campaignId);
            if (!campaign) return;

            // Update the specific task for this creator
            const updatedTasks = campaign.tasks.map(t => {
                if (t.id === taskId) {
                    const currentCompletedBy = t.completedBy || [];

                    if (isCompleted) {
                        return { ...t, completedBy: currentCompletedBy.filter(uid => uid !== profile.uid) };
                    } else {
                        return { ...t, completedBy: [...currentCompletedBy, profile.uid] };
                    }
                }
                return t;
            });

            await useStore.getState().updateCampaign(campaignId, { tasks: updatedTasks });
        } catch (error) {
            console.error(error);
            alert("Failed to update task status");
        }
    };

    // Calculate Stats
    const totalApplied = joinedCampaignsList.length;
    let totalTasksCompleted = 0;
    
    joinedCampaignsList.forEach(campaign => {
        if (campaign.tasks) {
            campaign.tasks.forEach(task => {
                if ((task.completedBy || []).includes(profile.uid)) {
                    totalTasksCompleted++;
                }
            });
        }
    });

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-20 relative overflow-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
            `}} />

            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="text-center relative overflow-hidden mb-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-neon-pink/10 blur-[100px] pointer-events-none rounded-full"></div>

                    <div className="flex justify-center mb-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
                        >
                            <Sparkles size={16} className="text-neon-pink" />
                            <span className="text-xs font-heading font-bold uppercase tracking-widest text-gray-300">
                                Creator Hub
                            </span>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col items-center"
                    >
                        <p className="text-4xl md:text-8xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-white to-neon-blue mb-6 tracking-tighter leading-none uppercase text-center w-full">
                            HELLO, {profile.name.split(' ')[0]}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col items-center justify-center gap-4"
                    >
                        <span className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full border ${profile.profileStatus === 'approved' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                            {profile.profileStatus || 'Status: Pending'}
                        </span>
                        
                        <p className="text-gray-400 font-medium flex items-center gap-2 text-sm sm:text-base">
                            <MapPin size={16} className="text-neon-pink" /> {profile.city} • Influencer
                        </p>
                        
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                            {profile.niches.map((niche, i) => (
                                <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest text-gray-300 font-bold">
                                    {niche}
                                </span>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={handleDeleteProfile}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-red-500 transition-colors group"
                            >
                                <Trash2 size={12} className="group-hover:scale-110 transition-transform" /> 
                                Delete My Creator Profile
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Optional Creator Stats Section */}
                {siteSettings?.showCreatorStats !== false && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                    >
                        <div className="bg-zinc-900/40 backdrop-blur-[20px] border border-white/10 rounded-[2rem] p-6 flex flex-col items-center text-center group hover:border-neon-pink/30 transition-all shadow-xl hover:shadow-neon-pink/5">
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4 text-neon-pink group-hover:scale-110 transition-transform">
                                <Target size={24} />
                            </div>
                            <h4 className="text-3xl font-black font-heading text-white mb-1 tracking-tighter">{totalApplied}</h4>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Campaigns Applied</p>
                        </div>
                        
                        <div className="bg-zinc-900/40 backdrop-blur-[20px] border border-white/10 rounded-[2rem] p-6 flex flex-col items-center text-center group hover:border-neon-blue/30 transition-all shadow-xl hover:shadow-neon-blue/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/5 blur-[50px] -mr-10 -mt-10"></div>
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4 text-neon-blue group-hover:scale-110 transition-transform relative z-10">
                                <CheckCircle2 size={24} />
                            </div>
                            <h4 className="text-3xl font-black font-heading text-white mb-1 relative z-10 tracking-tighter">{totalTasksCompleted}</h4>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black relative z-10">Tasks Completed</p>
                        </div>
                        
                        <div className="bg-zinc-900/40 backdrop-blur-[20px] border border-white/10 rounded-[2rem] p-6 flex flex-col items-center text-center group hover:border-yellow-400/30 transition-all shadow-xl hover:shadow-yellow-400/5">
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4 text-yellow-400 group-hover:scale-110 transition-transform">
                                <Award size={24} />
                            </div>
                            <h4 className="text-3xl font-black font-heading text-white mb-1 tracking-tighter">
                                {profile.profileStatus === 'approved' ? 'Active' : 'N/A'}
                            </h4>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Creator Tier</p>
                        </div>
                    </motion.div>
                )}

                {/* Explore Campaigns Section (Collapsible) */}
                <div className="space-y-6 max-w-6xl mx-auto pt-8">
                    <button 
                        onClick={() => setIsExploreOpen(!isExploreOpen)}
                        className="w-full flex items-center justify-between p-6 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-2xl hover:border-neon-pink/30 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-neon-pink/10 flex items-center justify-center text-neon-pink">
                                <Sparkles size={18} />
                            </div>
                            <div className="text-left">
                                <h2 className="text-xl font-bold font-heading uppercase tracking-widest">Explore New Campaigns</h2>
                                <p className="text-xs text-gray-400 mt-1 font-medium">{availableCampaigns.length} campaigns available in your area</p>
                            </div>
                        </div>
                        <div className="text-gray-500 group-hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                            {isExploreOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    </button>

                    {isExploreOpen && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 md:p-8"
                        >
                            {availableCampaigns.length === 0 ? (
                                <div className="py-16 text-center">
                                    <Star className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                                    <p className="text-gray-400 font-medium">No new campaigns found in {profile.city}. Check back soon!</p>
                                </div>
                            ) : (
                                <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 overflow-x-auto md:overflow-visible pb-8 md:pb-0 scrollbar-hide snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0">
                                    {availableCampaigns.map(campaign => (
                                        <div key={campaign.id} className="min-w-[85vw] md:min-w-0 snap-center h-full">
                                            <CreatorCampaignCard 
                                                campaign={campaign} 
                                                profile={profile} 
                                                type="explore" 
                                                handleApply={handleApply} 
                                                handleTaskToggle={handleTaskToggle} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>

                {/* My Applications Section */}
                <div className="space-y-6 max-w-6xl mx-auto pt-12 border-t border-white/10">
                    <div className="flex items-center gap-4 px-2">
                        <div className="w-10 h-10 rounded-full bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                            <Target size={18} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-heading uppercase tracking-widest">My Applications</h2>
                            <p className="text-xs text-gray-400 mt-1 font-medium">Track your status and manage tasks</p>
                        </div>
                    </div>

                    <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 md:p-8">
                        {joinedCampaignsList.length === 0 ? (
                            <div className="py-16 text-center">
                                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                                <p className="text-gray-400 font-medium">You haven't applied to any campaigns yet.</p>
                                <Button 
                                    onClick={() => setIsExploreOpen(true)}
                                    className="mt-6 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-full px-6"
                                >
                                    Browse Campaigns
                                </Button>
                            </div>
                        ) : (
                            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 overflow-x-auto md:overflow-visible pb-8 md:pb-0 scrollbar-hide snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0">
                                {joinedCampaignsList.map(campaign => (
                                    <div key={campaign.id} className="min-w-[85vw] md:min-w-0 snap-center h-full">
                                        <CreatorCampaignCard 
                                            campaign={campaign} 
                                            profile={profile} 
                                            type="joined" 
                                            handleApply={handleApply} 
                                            handleTaskToggle={handleTaskToggle} 
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreatorDashboard;
