import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, ShieldCheck, MapPin, Globe } from 'lucide-react';
import useDynamicMeta from '../hooks/useDynamicMeta';
import GlobalLoader from '../components/ui/GlobalLoader';
import { cn } from '../lib/utils';

const CampusActivationPage = () => {
    const { slug } = useParams();
    const { campusActivations, user, joinCampusActivation, completeActivationTask, campusActivationEntries, addCampusProfile, campusProfiles, creators } = useStore();
    const [campaign, setCampaign] = useState(null);
    const [entry, setEntry] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (campusActivations && slug) {
            const found = campusActivations.find(a => a.slug === slug);
            setCampaign(found || null);
            setIsLoading(false);
        }
    }, [slug, campusActivations]);

    useDynamicMeta({
        title: campaign ? `${campaign.title} | Campus Activation` : 'Campus Activation',
        description: campaign?.description || 'Join exclusive campus gamified campaigns.'
    });

    useEffect(() => {
        if (campaign && user && campusActivationEntries) {
            const foundEntry = campusActivationEntries.find(e => e.campaignId === campaign.id && e.userId === user.uid);
            setEntry(foundEntry || null);
        }
    }, [campaign, user, campusActivationEntries]);

    // Fast-track user into Campus Network if they aren't already
    const ensureCampusProfile = async () => {
        const isCreator = creators?.some(c => c.uid === user.uid && c.status === 'approved' && (c.niche?.toLowerCase().includes('student') || c.niche?.toLowerCase().includes('campus')));
        const hasProfile = campusProfiles?.some(p => p.uid === user.uid);

        if (!hasProfile && !isCreator) {
            await addCampusProfile({
                uid: user.uid,
                fullName: user.displayName || 'Student',
                email: user.email || '',
                role: 'normal_student',
                profileStatus: 'approved' // auto-approve for activation participation
            });
        }
    };

    const handleJoin = async () => {
        if (!user) {
            alert("Please login first!");
            return;
        }
        setIsLoading(true);
        try {
            await ensureCampusProfile();
            await joinCampusActivation(campaign.id, user.uid, {
                userName: user.displayName,
                email: user.email
            });
        } catch (error) {
            console.error("Error joining:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteTask = async (task) => {
        if (!entry) return;
        if (task.link) {
            window.open(task.link, '_blank');
        }
        setIsLoading(true);
        try {
            await completeActivationTask(entry.id, task.id, task.points);
        } catch (error) {
            console.error("Error completing task:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !campaign) return <GlobalLoader color="#B200FF" />;
    
    if (!campaign) {
        return (
            <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center text-white p-4">
                <div className="text-center">
                    <h1 className="text-4xl font-black mb-4">Activation Not Found</h1>
                    <Link to="/campus" className="text-neon-purple underline uppercase tracking-widest text-sm font-bold">Back to Campus Hub</Link>
                </div>
            </div>
        );
    }

    const { brandLogo, brandName, primaryColor, title, description, tasks } = campaign;

    return (
        <div className="min-h-screen bg-[#0B0F17] text-white font-['Outfit'] pb-20 relative overflow-hidden">
            {/* Dynamic Ambient Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-20 pointer-events-none blur-[140px]" style={{ backgroundColor: primaryColor }} />

            <div className="max-w-4xl mx-auto px-6 pt-32 relative z-10">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-12">
                    {brandLogo && (
                        <div className="w-24 h-24 bg-white rounded-2xl p-2 flex items-center justify-center mb-6 shadow-2xl">
                            <img src={brandLogo} alt={brandName} className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: primaryColor }}>{brandName} presents</h4>
                    <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-4">{title}</h1>
                    <p className="text-zinc-400 max-w-2xl text-lg">{description}</p>
                </div>

                {!entry ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="p-8 border border-white/10 rounded-3xl backdrop-blur-xl text-center max-w-lg mx-auto"
                        style={{ backgroundColor: `${primaryColor}10` }}
                    >
                        <h2 className="text-2xl font-bold mb-4">Ready to play?</h2>
                        <p className="text-zinc-400 mb-8">Join this activation, complete missions, and earn points on the leaderboard.</p>
                        
                        {!user ? (
                            <Link to="/auth/action?mode=login" className="h-14 px-8 rounded-2xl text-black font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                                Sign in to Join
                            </Link>
                        ) : (
                            <button onClick={handleJoin} disabled={isLoading} className="w-full h-14 rounded-2xl text-black font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                                {isLoading ? "Joining..." : "Enter Campaign"}
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Stats Panel */}
                        <div className="md:col-span-1 space-y-4">
                            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl text-center">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Your Score</h3>
                                <div className="text-5xl font-black" style={{ color: primaryColor }}>{entry.points}</div>
                                <p className="text-sm text-zinc-400 mt-2">Rank: #14 (Campus Wide)</p>
                            </div>
                        </div>

                        {/* Tasks List */}
                        <div className="md:col-span-2 space-y-6">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <ShieldCheck style={{ color: primaryColor }} />
                                Missions
                            </h2>

                            <div className="space-y-4">
                                {tasks.map((task) => {
                                    const isCompleted = entry.completedTasks?.includes(task.id);
                                    return (
                                        <div key={task.id} className={cn("p-5 border rounded-2xl flex items-center gap-4 transition-all", isCompleted ? "bg-white/5 border-white/10 opacity-70" : "bg-black/40 border-white/10 hover:border-white/30")}>
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                                {task.type === 'online' ? <Globe size={24} /> : <MapPin size={24} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                                        {task.type} Mission
                                                    </span>
                                                </div>
                                                <h3 className={cn("font-bold", isCompleted && "line-through text-zinc-500")}>{task.title}</h3>
                                                <p className="text-sm text-zinc-400">Earn <span className="font-bold" style={{ color: primaryColor }}>{task.points}</span> pts</p>
                                            </div>
                                            
                                            {isCompleted ? (
                                                <div className="flex items-center gap-2 text-neon-green font-bold text-sm">
                                                    <CheckCircle2 size={18} /> Done
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleCompleteTask(task)}
                                                    className="h-10 px-4 rounded-xl text-black font-bold text-sm uppercase tracking-widest flex items-center gap-2 transition-transform hover:scale-105 shrink-0"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    {task.link ? 'Go' : 'Done'} <ArrowRight size={16} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CampusActivationPage;
