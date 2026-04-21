import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, MapPin, Users, Zap, CheckCircle2, ArrowRight, Sparkles, Loader2, ShieldCheck, Trophy, Target, Ban, Camera, Video, Eye, Star, Globe, Youtube, Twitter, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { PREDEFINED_CITIES } from '../lib/constants';
import StudioSelect from '../components/ui/StudioSelect';
import useDynamicMeta from '../hooks/useDynamicMeta';

const TASK_TYPES = {
    content_post: { label: 'Content Post', icon: Camera, color: 'text-pink-400' },
    story: { label: 'Story', icon: Eye, color: 'text-purple-400' },
    reel: { label: 'Reel', icon: Video, color: 'text-orange-400' },
    visit_event: { label: 'Visit Event', icon: MapPin, color: 'text-green-400' },
    custom: { label: 'Custom', icon: Star, color: 'text-neon-blue' },
};

const PLATFORMS = {
    instagram: { label: 'Instagram', icon: Instagram },
    youtube: { label: 'YouTube', icon: Youtube },
    twitter: { label: 'Twitter / X', icon: Twitter },
    other: { label: 'Other', icon: Globe },
};

const CampaignPublicView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { campaigns, user, authInitialized, creators, addCreator, updateCreator, setAuthModal } = useStore();
    
    const [campaign, setCampaign] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStep, setVerificationStep] = useState('idle'); // idle | verifying | success | failed
    const [isJoining, setIsJoining] = useState(false);
    const [joinSuccess, setJoinSuccess] = useState(false);

    const [form, setForm] = useState({
        instagram: '',
        followers: '',
        name: '',
        phone: '',
        city: '',
        categories: '',
        bio: ''
    });

    useEffect(() => {
        const found = campaigns.find(c => c.id === id);
        if (found) setCampaign(found);
    }, [id, campaigns]);

    useEffect(() => {
        if (authInitialized && user) {
            const existing = creators.find(c => c.uid === user.uid);
            if (existing) {
                setProfile(existing);
                setForm(prev => ({
                    ...prev,
                    instagram: existing.instagram || '',
                    followers: existing.instagramFollowers || '',
                    name: existing.name || '',
                    phone: existing.phone || '',
                    city: existing.city || '',
                    categories: (existing.specializations || existing.niches || []).join(', '),
                    bio: existing.bio || ''
                }));
            }
        }
    }, [user, authInitialized, creators]);

    useDynamicMeta({
        title: campaign ? campaign.title : "Creator Campaign",
        description: campaign ? campaign.description : "Join this exclusive creator campaign.",
        image: campaign && campaign.image ? campaign.image : "/favicon.svg",
        url: window.location.href
    });

    const handleInstagramVerify = async () => {
        if (!form.instagram) return alert("Enter your Instagram handle");
        setIsVerifying(true);
        setVerificationStep('verifying');

        setTimeout(() => {
            const count = parseInt(form.followers);
            if (isNaN(count)) {
                setIsVerifying(false);
                setVerificationStep('failed');
                alert("Please enter a valid follower count for verification.");
            } else if (count < (campaign?.minInstagramFollowers || 0)) {
                setIsVerifying(false);
                setVerificationStep('failed');
            } else {
                setIsVerifying(false);
                setVerificationStep('success');
            }
        }, 3000);
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!user) {
            setAuthModal(true);
            return;
        }

        if (verificationStep !== 'success') {
            return alert("Check your Instagram eligibility first!");
        }

        setIsJoining(true);
        try {
            const currentJoined = profile?.joinedCampaigns || [];
            if (currentJoined.includes(id)) {
                alert("You've already applied!");
                navigate('/creator-dashboard');
                return;
            }

            const creatorData = {
                uid: user.uid,
                email: user.email,
                name: form.name,
                phone: form.phone,
                city: form.city,
                instagram: form.instagram,
                instagramFollowers: parseInt(form.followers),
                specializations: form.categories.split(',').map(n => n.trim()),
                bio: form.bio,
                profileStatus: 'pending',
                joinedCampaigns: [...currentJoined, id]
            };

            if (profile) {
                await updateCreator(user.uid, creatorData);
            } else {
                await addCreator(creatorData);
            }

            setJoinSuccess(true);
        } catch (error) {
            alert("Application submission failed.");
        } finally {
            setIsJoining(false);
        }
    };

    if (!campaign) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="animate-spin text-neon-blue mx-auto" size={48} />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Campaign Details...</p>
                </div>
            </div>
        );
    }

    const isEligible = verificationStep === 'success';
    const campaignTasks = campaign.tasks || [];
    const requiredTasks = campaignTasks.filter(t => t.priority !== 'optional');

    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden pt-12">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-white/[0.02] rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
                    {/* Left Column: Mission Content */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                                <Instagram size={16} className="text-neon-blue" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Creator Opportunity</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black font-heading leading-tight uppercase tracking-tight">{campaign.title}</h1>
                            <div className="flex flex-wrap gap-10 py-4 border-y border-white/5">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Location</span>
                                    <div className="flex items-center gap-2 text-white font-bold uppercase"><MapPin size={14} className="text-neon-blue" /> {campaign.targetCity}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Campaign Reward</span>
                                    <div className="flex items-center gap-2 text-neon-green font-bold uppercase"><Zap size={14} /> {campaign.reward}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Target Followers</span>
                                    <div className="flex items-center gap-2 text-white font-bold uppercase"><Users size={14} className="text-neon-blue" /> {Number(campaign.minInstagramFollowers || 0).toLocaleString()}+</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em]">Campaign Brief</h3>
                            <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed">{campaign.description}</p>
                        </div>

                        {campaignTasks.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em]">Mission Deliverables</h3>
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                        {requiredTasks.length} Required · {campaignTasks.length - requiredTasks.length} Optional
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    {campaignTasks.map((task, idx) => {
                                        const typeInfo = TASK_TYPES[task.taskType] || TASK_TYPES.custom;
                                        const TypeIcon = typeInfo.icon;
                                        const platInfo = PLATFORMS[task.platform] || PLATFORMS.other;
                                        return (
                                            <motion.div
                                                key={task.id || idx}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.08 }}
                                                className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl flex items-start gap-4 group transition-all hover:border-neon-blue/20"
                                            >
                                                <div className={cn("w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-neon-blue/30 transition-colors", typeInfo.color)}>
                                                    <TypeIcon size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center flex-wrap gap-2 mb-2">
                                                        <p className="font-bold text-[14px] text-white uppercase tracking-tight">{task.title}</p>
                                                        {task.priority === 'required' && (
                                                            <span className="px-2 py-0.5 bg-neon-blue/10 border border-neon-blue/20 rounded-md text-[7px] font-black uppercase tracking-widest text-neon-blue">★ Required</span>
                                                        )}
                                                    </div>
                                                    {task.description && <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{task.description}</p>}
                                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                                        <span className="px-2 py-0.5 bg-white/5 rounded-md text-[7px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1">
                                                            {React.createElement(platInfo.icon, { size: 8 })} {platInfo.label}
                                                        </span>
                                                        <span className="px-2 py-0.5 bg-white/5 rounded-md text-[7px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1">
                                                            {React.createElement(typeInfo.icon, { size: 8 })} {typeInfo.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Right Column: Interactive Form */}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="lg:sticky lg:top-32">
                        <div className="bg-zinc-900/50 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                            <div className="relative z-10 space-y-10">
                                <div className="flex items-center gap-4 pb-8 border-b border-white/5">
                                    <div className="w-12 h-12 rounded-xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center">
                                        <Sparkles className="text-neon-blue" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black font-heading text-white uppercase tracking-tight">Creator Application</h2>
                                        <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mt-1">Submit your profile for review</p>
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {!joinSuccess ? (
                                        <motion.div key="application-flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Instagram Handle</label>
                                                        <Input value={form.instagram} onChange={e => setForm({...form, instagram: e.target.value})} placeholder="@username" className="h-14 bg-black/40 border-white/10 rounded-xl text-[11px] font-bold" disabled={isEligible} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Current Followers</label>
                                                        <Input type="number" value={form.followers} onChange={e => setForm({...form, followers: e.target.value})} placeholder="Enter count" className="h-14 bg-black/40 border-white/10 rounded-xl text-[11px] font-bold" disabled={isEligible} />
                                                    </div>
                                                </div>

                                                <AnimatePresence mode="wait">
                                                    {verificationStep === 'verifying' ? (
                                                        <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-14 bg-white/5 border border-neon-blue/20 rounded-xl flex items-center px-6 gap-4">
                                                            <Loader2 size={16} className="animate-spin text-neon-blue" />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Verifying qualifications...</span>
                                                        </motion.div>
                                                    ) : verificationStep === 'success' ? (
                                                        <motion.div key="verified" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="h-14 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center px-6 gap-4">
                                                            <ShieldCheck size={16} className="text-green-500" />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-green-500">Eligibility Confirmed</span>
                                                        </motion.div>
                                                    ) : (
                                                        <Button key="verify-btn" onClick={handleInstagramVerify} disabled={isVerifying} className="w-full h-14 bg-white text-black font-black uppercase tracking-[0.2em] rounded-xl hover:bg-neon-blue hover:text-white transition-all text-xs">
                                                            {verificationStep === 'failed' ? 'Retry Verification' : 'Check Eligibility'}
                                                        </Button>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <AnimatePresence>
                                                {isEligible && (
                                                    <motion.form key="submission-form" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} onSubmit={handleJoin} className="space-y-6 pt-6 border-t border-white/5">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                                                                <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full name" className="h-14 bg-black/40 border-white/5 rounded-xl text-[11px] font-bold" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">WhatsApp / Phone</label>
                                                                <Input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91..." className="h-14 bg-black/40 border-white/5 rounded-xl text-[11px] font-bold" />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <StudioSelect 
                                                                    value={form.city} 
                                                                    options={PREDEFINED_CITIES.map(c => ({ value: c, label: c.toUpperCase() }))}
                                                                    onChange={val => setForm({...form, city: val})} 
                                                                    placeholder="SELECT CITY"
                                                                    className="h-14"
                                                                    accentColor="neon-blue"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Specializations</label>
                                                                <Input required value={form.categories} onChange={e => setForm({...form, categories: e.target.value})} placeholder="Fashion, Travel, Tech..." className="h-14 bg-black/40 border-white/5 rounded-xl text-[11px] font-bold" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Creator Bio</label>
                                                            <textarea required value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Tell us about yourself..." className="w-full h-24 bg-black/40 border border-white/5 rounded-xl p-5 text-white focus:outline-none focus:border-neon-blue text-[11px] font-medium resize-none shadow-inner" />
                                                        </div>
                                                        <Button type="submit" disabled={isJoining} className="w-full h-16 bg-neon-blue text-black font-black uppercase tracking-[0.3em] rounded-xl shadow-xl hover:scale-[1.02] transition-all border-none text-xs">
                                                            {isJoining ? 'Submitting...' : 'Submit Creator Application'}
                                                        </Button>
                                                    </motion.form>
                                                )}
                                            </AnimatePresence>

                                            {!isEligible && verificationStep === 'failed' && (
                                                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4">
                                                    <Ban className="text-red-500 shrink-0" size={20} />
                                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest leading-relaxed">Profile qualifications not met. You must have at least {Number(campaign.minInstagramFollowers || 0).toLocaleString()} followers to apply.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div key="success-state" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-6">
                                            <div className="w-20 h-20 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center mx-auto mb-8">
                                                <CheckCircle2 className="text-neon-blue" size={40} />
                                            </div>
                                            <h2 className="text-3xl font-black font-heading text-white uppercase tracking-tight">Application Sent</h2>
                                            <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">Your creator profile has been submitted for this mission. We will review your analytics and notify you via email.</p>
                                            <Button onClick={() => navigate('/creator-dashboard')} className="w-full h-14 bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] rounded-xl hover:bg-white/10 transition-all text-[10px] mt-8">
                                                Go to Dashboard
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default CampaignPublicView;
