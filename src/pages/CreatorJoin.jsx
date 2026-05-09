import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { PREDEFINED_CITIES } from '../lib/constants';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Users from 'lucide-react/dist/esm/icons/users';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Activity from 'lucide-react/dist/esm/icons/activity';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Upload from 'lucide-react/dist/esm/icons/upload';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

const CreatorJoin = () => {
    const { user, authInitialized, setAuthModal, addCreator, creators, uploadToCloudinary, loading } = useStore();
    const navigate = useNavigate();

    // Form State
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        city: '',
        categories: '',
        bio: '',
        instagram: '',
        instagramFollowers: '',
        youtube: '',
        youtubeSubscribers: '',
        twitter: '',
        portfolioInfo: '',
        profilePicture: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);

    useEffect(() => {
        if (user && creators && !loading) {
            const existingProfile = creators.find(c => c.uid === user.uid);
            if (existingProfile) {
                if (existingProfile.profileStatus === 'approved') {
                    navigate('/creator-dashboard');
                } else {
                    setHasJoined(true);
                }
            }
        }
    }, [user, creators, loading, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsSubmitting(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, profilePicture: url }));
            useStore.getState().addToast("Profile picture uploaded!", 'success');
        } catch (error) {
            useStore.getState().addToast("Upload failed: " + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

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
                specializations: formData.categories.split(',').map(n => n.trim())
            });
            setHasJoined(true);
            // navigate('/creator-dashboard'); // Handled by the success state UI
        } catch (error) {
            console.error("Error joining creator hub:", error);
            useStore.getState().addToast("Failed to submit application: " + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!authInitialized || loading) {
        return <div className="min-h-screen bg-black flex items-center justify-center"><Sparkles className="animate-pulse text-neon-blue" size={48} /></div>;
    }

    if (hasJoined) {
        return (
            <div className="min-h-screen bg-[#020202] text-white pt-40 pb-20 px-4 text-center relative overflow-hidden">
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[60%] h-[60%] bg-neon-blue/10 rounded-full blur-[150px] pointer-events-none" />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="max-w-xl mx-auto p-12 md:p-16 bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[4rem] shadow-2xl relative z-10"
                >
                    <div className="w-24 h-24 bg-neon-blue rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(46,191,255,0.3)]">
                        <CheckCircle2 size={48} className="text-black" />
                    </div>
                    <h2 className="text-5xl font-black font-heading tracking-tighter uppercase mb-6 italic pr-4">APPLICATION SENT.</h2>
                    <p className="text-gray-400 mb-12 font-medium text-lg leading-relaxed uppercase tracking-tight">Your creator profile is being analyzed by our team. You can now access your studio workspace.</p>
                    <button onClick={() => navigate('/creator-dashboard')} className="w-full h-20 rounded-2xl font-black font-heading uppercase tracking-[0.2em] bg-white text-black hover:bg-neon-blue transition-all flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(255,255,255,0.1)] group">
                        Enter Creator Studio <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                </motion.div>
            </div>
        );
    }

    const steps = [
        { id: 1, title: 'IDENTITY PROFILE', icon: Users },
        { id: 2, title: 'AUDIENCE ANALYTICS', icon: Instagram },
        { id: 3, title: 'COMMERCIAL SPEC', icon: Camera }
    ];

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-40 px-4 relative overflow-hidden">
            {/* Immersive Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] bg-neon-blue/5 rounded-full blur-[180px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[180px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto">
                {/* Cinema Header */}
                <div className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-12"
                    >
                        <Zap size={14} className="text-neon-blue" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">Creator Registration Phase II</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-black font-heading mb-4 tracking-tighter uppercase italic leading-[0.9] text-white pr-4"
                    >
                        STUDIO <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-blue">CERTIFICATION.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                        className="text-gray-500 max-w-4xl mx-auto text-lg md:text-2xl font-bold leading-relaxed uppercase tracking-widest"
                    >
                        Apply for professional backing. Gain access to high-tier brand missions, exclusive studio resources, and automated commercial settlements.
                    </motion.p>
                </div>

                {!user ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
                        <div className="p-16 bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[4rem] shadow-2xl">
                            <Activity className="w-20 h-20 text-neon-blue mx-auto mb-10" />
                            <h3 className="text-4xl font-black font-heading mb-6 italic uppercase">AUTHENTICATION REQUIRED</h3>
                            <p className="text-gray-500 mb-12 font-medium text-lg leading-relaxed uppercase tracking-tight">Identity verification is mandatory to enter the creator hub. Sign in to proceed.</p>
                            <button onClick={() => setAuthModal(true)} className="h-20 px-16 rounded-2xl text-base font-black font-heading uppercase tracking-[0.2em] bg-white text-black hover:bg-neon-blue transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center gap-4 mx-auto">
                                Sign In <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        {/* Step Progress */}
                        <div className="flex items-center justify-between mb-16 px-4">
                            {steps.map((s, idx) => (
                                <React.Fragment key={s.id}>
                                    <div className="flex flex-col items-center gap-4 group cursor-pointer" onClick={() => step > s.id && setStep(s.id)}>
                                        <div className={cn(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 border",
                                            step === s.id ? "bg-neon-blue text-black border-neon-blue shadow-[0_0_30px_rgba(46,191,255,0.4)]" : 
                                            step > s.id ? "bg-white/10 text-neon-blue border-white/10" : "bg-black/40 text-gray-700 border-white/5"
                                        )}>
                                            <s.icon size={24} />
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-[0.3em] transition-colors",
                                            step >= s.id ? "text-white" : "text-gray-700"
                                        )}>{s.title}</span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={cn(
                                            "flex-1 h-px transition-all duration-700 mx-4",
                                            step > s.id ? "bg-neon-blue" : "bg-white/5"
                                        )} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Form Card */}
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-zinc-900/40 backdrop-blur-[40px] border border-white/10 rounded-[3.5rem] p-10 md:p-16 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-80 h-80 bg-neon-blue/10 blur-[130px] -mr-40 -mt-40 pointer-events-none" />
                            
                            <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="space-y-10 relative z-10">
                                {step === 1 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center gap-5 mb-10">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white"><Users size={24} /></div>
                                            <div>
                                                <h3 className="text-3xl font-black font-heading uppercase tracking-tighter italic">Identity Profile</h3>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Legitimacy Verification</p>
                                            </div>
                                        </div>

                                        {/* Profile Picture Upload */}
                                        <div className="flex flex-col items-center gap-8 bg-black/30 border border-white/5 rounded-[2.5rem] p-10 mb-8 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-neon-blue/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative">
                                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] md:rounded-[3.5rem] bg-black border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-neon-blue/40">
                                                    {formData.profilePicture ? (
                                                        <img src={formData.profilePicture} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Camera size={40} className="text-gray-700 group-hover:text-neon-blue transition-colors" />
                                                    )}
                                                </div>
                                                <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-neon-blue text-black rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                                                    <Upload size={20} />
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                </label>
                                            </div>
                                            <div className="text-center space-y-1 relative z-10">
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Profile Identity</h4>
                                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Upload your professional headshot</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                                                <Input required name="name" value={formData.name} onChange={handleChange} placeholder="Stage or Legal Name" className="h-16 bg-black/50 border-white/5 rounded-2xl text-[12px] font-bold" />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Contact Number</label>
                                                <Input required name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 00000 00000" className="h-16 bg-black/50 border-white/5 rounded-2xl text-[12px] font-bold" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Operating City</label>
                                                <select
                                                    required name="city" value={formData.city} onChange={handleChange}
                                                    className="w-full h-16 bg-black/50 border border-white/5 rounded-2xl px-6 text-white text-[12px] font-bold focus:border-neon-blue transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled className="bg-zinc-900">Select Universal Hub</option>
                                                    {PREDEFINED_CITIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c.toUpperCase()}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Primary Specializations</label>
                                                <Input required name="categories" value={formData.categories} onChange={handleChange} placeholder="e.g. Fashion, Luxury, Tech" className="h-16 bg-black/50 border-white/5 rounded-2xl text-[12px] font-bold" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center gap-5 mb-10">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-neon-blue"><Instagram size={24} /></div>
                                            <div>
                                                <h3 className="text-3xl font-black font-heading uppercase tracking-tighter italic text-neon-blue">Social Impact</h3>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Analytics & Followers</p>
                                            </div>
                                        </div>
                                        <div className="space-y-10">
                                            {/* Instagram Section */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/30 p-8 rounded-[2.5rem] border border-white/5">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 italic"><Instagram size={14} className="text-pink-500" /> Handle</label>
                                                    <Input required name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@your_user" className="h-14 bg-black/50 border-white/5 rounded-xl font-bold" />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 italic"><Users size={14} className="text-neon-blue" /> Followers</label>
                                                    <Input required type="number" name="instagramFollowers" value={formData.instagramFollowers} onChange={handleChange} placeholder="e.g. 25000" className="h-14 bg-black/50 border-white/5 rounded-xl font-bold" />
                                                </div>
                                            </div>
                                            {/* Other Section */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/30 p-8 rounded-[2.5rem] border border-white/5">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 italic"><Youtube size={14} className="text-red-500" /> YouTube <span className="opacity-30 normal-case">(Optional)</span></label>
                                                    <Input name="youtube" value={formData.youtube} onChange={handleChange} placeholder="Channel URL" className="h-14 bg-black/50 border-white/5 rounded-xl font-bold" />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 italic"><Globe size={14} className="text-neon-blue" /> X / Website <span className="opacity-30 normal-case">(Optional)</span></label>
                                                    <Input name="twitter" value={formData.twitter} onChange={handleChange} placeholder="URL or Handle" className="h-14 bg-black/50 border-white/5 rounded-xl font-bold" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center gap-5 mb-10">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white"><Camera size={24} /></div>
                                            <div>
                                                <h3 className="text-3xl font-black font-heading uppercase tracking-tighter italic">Commercial Spec</h3>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Marketable Authority</p>
                                            </div>
                                        </div>
                                        <div className="space-y-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Professional Bio</label>
                                                <textarea
                                                    required name="bio" value={formData.bio} onChange={handleChange}
                                                    placeholder="Briefly describe your content niche and why brands should collaborate with you..."
                                                    className="w-full bg-black/50 border border-white/5 rounded-[2rem] p-6 text-white text-[12px] font-medium leading-relaxed focus:border-neon-blue transition-all h-40 resize-none shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Portfolio / Media Kit Link</label>
                                                <Input name="portfolioInfo" value={formData.portfolioInfo} onChange={handleChange} placeholder="https://..." className="h-16 bg-black/50 border-white/5 rounded-2xl text-[12px] font-bold" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-10 border-t border-white/5">
                                    {step > 1 ? (
                                        <button type="button" onClick={prevStep} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-[0.3em] transition-colors flex items-center gap-2">
                                            <ArrowRight size={14} className="rotate-180" /> Back
                                        </button>
                                    ) : <div />}
                                    
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="h-20 px-16 rounded-2xl text-sm font-black font-heading uppercase tracking-[0.2em] bg-neon-blue text-black hover:scale-105 hover:shadow-[0_0_50px_rgba(46,191,255,0.4)] transition-all flex items-center gap-4 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" /> : 
                                         step === 3 ? 'Finalize Registration' : 'Continue'}
                                        {step < 3 && <ArrowRight size={18} />}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatorJoin;

