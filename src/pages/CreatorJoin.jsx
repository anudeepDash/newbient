import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { PREDEFINED_CITIES } from '../lib/constants';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, ArrowRight, Instagram, Youtube, Twitter, Globe, Camera, Activity, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

const CreatorJoin = () => {
    const { user, authInitialized, setAuthModal, addCreator, creators } = useStore();
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        city: '',
        niches: '',
        bio: '',
        instagram: '',
        instagramFollowers: '',
        youtube: '',
        youtubeSubscribers: '',
        twitter: '',
        portfolioInfo: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);

    useEffect(() => {
        if (user && creators) {
            const existingProfile = creators.find(c => c.uid === user.uid);
            if (existingProfile) {
                setHasJoined(true);
            }
        }
    }, [user, creators]);

    const handleStart = () => {
        if (!user) {
            setAuthModal(true);
        } else {
            document.getElementById('creator-form')?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSocialChange = (e, platform) => {
        const val = e.target.value;
        if (platform === 'ig') {
            setFormData(prev => ({ ...prev, instagramFollowers: val }));
        } else {
            setFormData(prev => ({ ...prev, youtubeSubscribers: val }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setAuthModal(true);
            return;
        }

        setIsSubmitting(true);
        try {
            await addCreator({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                profileStatus: 'pending',
                ...formData,
                isVerified: false,
                niches: formData.niches.split(',').map(n => n.trim())
            });
            setHasJoined(true);
            alert("Application submitted successfully! Welcome to the Creator Hub.");
            navigate('/creator-dashboard');
        } catch (error) {
            console.error("Error joining creator hub:", error);
            alert("Failed to submit application: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!authInitialized) {
        return <div className="min-h-screen bg-black flex items-center justify-center"><Sparkles className="animate-pulse text-neon-pink" size={48} /></div>;
    }

    if (hasJoined) {
        return (
            <div className="min-h-screen bg-[#020202] text-white pt-32 pb-20 px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="max-w-xl mx-auto p-12 bg-zinc-900/40 backdrop-blur-3xl border border-neon-pink/20 rounded-[3rem] shadow-[0_0_60px_rgba(255,0,255,0.08)]"
                >
                    <div className="w-20 h-20 bg-neon-pink rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,0,255,0.3)]">
                        <Camera size={40} className="text-black" />
                    </div>
                    <h2 className="text-4xl font-black font-heading tracking-tighter uppercase mb-4">YOU'RE IN.</h2>
                    <p className="text-gray-400 mb-10 font-medium">Your creator profile is live. Head to the dashboard to find campaigns in your city.</p>
                    <button onClick={() => navigate('/creator-dashboard')} className="w-full h-16 rounded-2xl font-black font-heading uppercase tracking-widest bg-neon-pink text-black hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,0,255,0.2)]">
                        Go to Dashboard <ArrowRight size={18} />
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-20 px-4 relative overflow-hidden">
            {/* Ambient Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[20%] left-[-5%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-10"
                    >
                        <Sparkles size={16} className="text-neon-pink" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Influencer Marketing</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="text-5xl md:text-8xl font-black font-heading mb-6 tracking-tighter leading-none uppercase"
                    >
                        JOIN THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-blue">CREATOR NETWORK.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                        className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed"
                    >
                        Partner with top brands, get exclusive local gigs, and monetize your influence. Apply to become a certified Newbi Creator.
                    </motion.p>

                    {!user && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-10">
                            <button onClick={handleStart} className="h-16 px-10 rounded-2xl text-base font-black font-heading uppercase tracking-widest bg-neon-pink text-black hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,0,255,0.2)] inline-flex items-center gap-3">
                                Sign In to Apply <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}
                </div>

                {user && (
                    <motion.div
                        id="creator-form"
                        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 md:p-14 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-80 h-80 bg-neon-blue/5 blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-60 h-60 bg-neon-pink/5 blur-[100px] -ml-30 -mb-30 pointer-events-none" />

                        <div className="flex items-center gap-5 mb-12 border-b border-white/5 pb-10 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-pink/20 to-neon-blue/20 border border-white/10 flex items-center justify-center">
                                <Users className="w-8 h-8 text-neon-pink" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black font-heading tracking-tighter uppercase">Creator Profile Setup</h2>
                                <p className="text-gray-500 text-sm font-medium mt-1">Tell us about yourself and your audience.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Full Name</label>
                                    <Input required name="name" value={formData.name} onChange={handleChange} placeholder="Your legal or stage name" className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Phone Number</label>
                                    <Input required name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Primary City</label>
                                    <select
                                        required name="city" value={formData.city} onChange={handleChange}
                                        className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl px-5 text-white focus:outline-none focus:border-neon-pink/50 transition-colors appearance-none text-sm"
                                    >
                                        <option value="" disabled className="text-gray-500 bg-zinc-900">Select City</option>
                                        {PREDEFINED_CITIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Content Niches</label>
                                    <Input required name="niches" value={formData.niches} onChange={handleChange} placeholder="Fashion, Tech, Music (comma separated)" className="h-14 bg-black/50 border-white/5 rounded-2xl" />
                                </div>
                            </div>

                            {/* Social Presence */}
                            <div className="pt-4 border-t border-white/5">
                                <h3 className="text-[10px] font-black text-neon-pink uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                                    <div className="w-6 h-px bg-neon-pink" /> Social Presence
                                </h3>
                                <div className="space-y-6">
                                    {/* Instagram */}
                                    <div className="p-6 rounded-2xl bg-black/30 border border-white/5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Instagram size={12} className="text-pink-500" /> Instagram Handle
                                                </label>
                                                <Input required name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@yourusername" className="h-12 bg-black/50 border-white/5 rounded-xl" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Users size={12} className="text-neon-blue" /> Follower Count
                                                </label>
                                                <Input required type="number" name="instagramFollowers" value={formData.instagramFollowers} onChange={(e) => handleSocialChange(e, 'ig')} placeholder="e.g. 15000" className="h-12 bg-black/50 border-white/5 rounded-xl" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* YouTube */}
                                    <div className="p-6 rounded-2xl bg-black/30 border border-white/5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Youtube size={12} className="text-red-500" /> YouTube Channel <span className="text-gray-600 font-medium normal-case tracking-normal">(Optional)</span>
                                                </label>
                                                <Input name="youtube" value={formData.youtube} onChange={handleChange} placeholder="Channel URL" className="h-12 bg-black/50 border-white/5 rounded-xl" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Users size={12} className="text-neon-blue" /> Subscriber Count <span className="text-gray-600 font-medium normal-case tracking-normal">(Optional)</span>
                                                </label>
                                                <Input type="number" name="youtubeSubscribers" value={formData.youtubeSubscribers} onChange={(e) => handleSocialChange(e, 'yt')} placeholder="e.g. 5000" className="h-12 bg-black/50 border-white/5 rounded-xl" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* About */}
                            <div className="pt-4 border-t border-white/5">
                                <h3 className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                                    <div className="w-6 h-px bg-neon-green" /> About You
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Short Bio</label>
                                        <textarea
                                            required name="bio" value={formData.bio} onChange={handleChange}
                                            placeholder="Tell brands why they should work with you..."
                                            className="w-full bg-black/50 border border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-neon-pink/50 transition-colors h-32 resize-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Past Campaigns / Portfolio Link (Optional)</label>
                                        <Input name="portfolioInfo" value={formData.portfolioInfo} onChange={handleChange} placeholder="Link to your media kit or past work" className="h-12 bg-black/50 border-white/5 rounded-xl" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-16 rounded-2xl text-base font-black font-heading uppercase tracking-widest bg-white text-black hover:bg-neon-green transition-all shadow-[0_20px_50px_rgba(255,255,255,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Submitting Application...' : 'Register as Creator'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default CreatorJoin;

