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
            <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="max-w-xl mx-auto p-12 bg-zinc-900 border border-neon-pink/30 rounded-[3rem] shadow-[0_0_50px_rgba(255,0,255,0.1)]"
                >
                    <div className="w-20 h-20 bg-neon-pink rounded-full flex items-center justify-center mx-auto mb-6">
                        <Camera size={40} className="text-black" />
                    </div>
                    <h2 className="text-3xl font-bold font-heading mb-4">You're In!</h2>
                    <p className="text-gray-400 mb-8">Your creator profile is set up. Check out the dashboard to find campaigns in your city.</p>
                    <Button onClick={() => navigate('/creator-dashboard')} className="w-full bg-neon-pink text-black hover:bg-neon-pink/80 h-14 rounded-2xl font-bold uppercase tracking-widest gap-2">
                        Go to Dashboard <ArrowRight size={16} />
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4">
            <div className="max-w-4xl mx-auto text-center mb-16 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neon-pink/10 blur-[120px] pointer-events-none rounded-full"></div>
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
                >
                    <Sparkles size={16} className="text-neon-pink" />
                    <span className="text-xs font-heading font-bold uppercase tracking-widest text-gray-300">Influencer Marketing</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="text-4xl md:text-6xl font-bold font-heading mb-6 tracking-tight"
                >
                    Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-blue">Creator Network</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto mb-10"
                >
                    Partner with top brands, get access to exclusive local gigs, and monetize your influence. Apply now to become a certified Newbi Creator.
                </motion.p>

                {!user && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Button onClick={handleStart} className="h-16 px-10 rounded-2xl text-lg font-bold font-heading uppercase tracking-widest bg-neon-pink text-black hover:bg-neon-pink/80 shadow-[0_0_30px_rgba(255,0,255,0.2)]">
                            Sign In to Apply <ArrowRight className="ml-2" />
                        </Button>
                    </motion.div>
                )}
            </div>

            {user && (
                <motion.div
                    id="creator-form"
                    initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="max-w-3xl mx-auto bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/5 blur-[80px] -mr-32 -mt-32"></div>

                    <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-pink/20 to-neon-blue/20 flex items-center justify-center">
                            <Users className="w-8 h-8 text-neon-pink" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold font-heading">Creator Profile Setup</h2>
                            <p className="text-gray-400 text-sm">Tell us about yourself and your audience.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                                <Input required name="name" value={formData.name} onChange={handleChange} placeholder="Your legal or stage name" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                                <Input required name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Primary City</label>
                                <select
                                    required name="city" value={formData.city} onChange={handleChange}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-neon-pink transition-colors appearance-none"
                                >
                                    <option value="" disabled className="text-gray-500 bg-zinc-900">Select City</option>
                                    {PREDEFINED_CITIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Content Niches</label>
                                <Input required name="niches" value={formData.niches} onChange={handleChange} placeholder="Fashion, Tech, Music (comma separated)" />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-neon-blue uppercase tracking-widest">Social Presence</h3>
                            </div>

                            <div className="space-y-6">
                                {/* Instagram */}
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Instagram size={14} className="text-pink-500" /> Instagram Handle
                                            </label>
                                            <Input name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@yourusername" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Users size={14} className="text-neon-blue" /> Follower Count
                                            </label>
                                            <Input 
                                                type="number" 
                                                name="instagramFollowers" 
                                                value={formData.instagramFollowers} 
                                                onChange={(e) => handleSocialChange(e, 'ig')} 
                                                placeholder="e.g. 15000" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* YouTube */}
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Youtube size={14} className="text-red-500" /> YouTube Channel
                                            </label>
                                            <Input name="youtube" value={formData.youtube} onChange={handleChange} placeholder="Channel URL" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Users size={14} className="text-neon-blue" /> Subscriber Count
                                            </label>
                                            <Input 
                                                type="number" 
                                                name="youtubeSubscribers" 
                                                value={formData.youtubeSubscribers} 
                                                onChange={(e) => handleSocialChange(e, 'yt')} 
                                                placeholder="e.g. 5000" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 space-y-6">
                            <h3 className="text-sm font-bold text-neon-green uppercase tracking-widest">About You</h3>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Short Bio</label>
                                <textarea
                                    required name="bio" value={formData.bio} onChange={handleChange}
                                    placeholder="Tell brands why they should work with you..."
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-neon-pink transition-colors h-32 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Past Campaigns / Portfolio Link (Optional)</label>
                                <Input name="portfolioInfo" value={formData.portfolioInfo} onChange={handleChange} placeholder="Link to your media kit or past work" />
                            </div>
                        </div>

                        <div className="pt-8 text-center">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-16 rounded-2xl text-lg font-bold font-heading uppercase tracking-widest bg-white text-black hover:bg-neon-green transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                            >
                                {isSubmitting ? 'Submitting Application...' : 'Register as Creator'}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            )}
        </div>
    );
};

export default CreatorJoin;
