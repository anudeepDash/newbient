import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { PREDEFINED_CITIES, ARTIST_CATEGORIES } from '../lib/constants';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Music, 
    Mic2, 
    Users, 
    Camera, 
    Video, 
    Instagram, 
    Youtube, 
    Globe, 
    Sparkles, 
    CheckCircle2, 
    Loader2, 
    ArrowRight, 
    Zap,
    MapPin,
    Star,
    Layout
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import logo from '../assets/logo/artistant.png';

const ArtistAnt = () => {
    const { user, authInitialized, setAuthModal, addArtist, artists, upcomingEvents, applyArtistToGig, updateArtist, deleteArtist } = useStore();
    const navigate = useNavigate();

    // Form State
    const [step, setStep] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        city: '',
        category: '',
        bio: '',
        instagram: '',
        youtube: '',
        portfolioLink: '',
        basePrice: '',
        experienceYears: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);

    useEffect(() => {
        if (user && artists) {
            const existingProfile = artists.find(a => a.uid === user.uid);
            if (existingProfile) {
                setHasJoined(true);
                setFormData({
                    name: existingProfile.name || '',
                    phone: existingProfile.phone || '',
                    city: existingProfile.city || '',
                    category: existingProfile.category || '',
                    bio: existingProfile.bio || '',
                    instagram: existingProfile.instagram || '',
                    youtube: existingProfile.youtube || '',
                    portfolioLink: existingProfile.portfolioLink || '',
                    basePrice: existingProfile.basePrice || '',
                    experienceYears: existingProfile.experienceYears || ''
                });
            }
        }
    }, [user, artists]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
            if (isEditing) {
                const existingProfile = artists.find(a => a.uid === user.uid);
                if (existingProfile) {
                    await updateArtist(existingProfile.id, {
                        ...formData
                    });
                    setIsEditing(false);
                    setStep(1);
                }
            } else {
                await addArtist({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    profileStatus: 'pending',
                    ...formData,
                    isVerified: false,
                    type: 'artist'
                });
                setHasJoined(true);
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!authInitialized) {
        return <div className="min-h-screen bg-black flex items-center justify-center"><Sparkles className="animate-pulse text-neon-blue" size={48} /></div>;
    }

    if (hasJoined && !isEditing) {
        const artistProfile = artists.find(a => a.uid === user?.uid);
        return <ArtistDashboard 
            artist={artistProfile} 
            upcomingEvents={upcomingEvents} 
            applyArtistToGig={applyArtistToGig} 
            navigate={navigate} 
            onEdit={() => setIsEditing(true)}
            onDelete={async () => {
                if (window.confirm("Are you sure you want to delete your artist profile? This action cannot be undone.")) {
                    try {
                        await deleteArtist(artistProfile.id);
                        setHasJoined(false);
                        setStep(1);
                    } catch (error) {
                        alert("Failed to delete profile.");
                    }
                }
            }}
        />;
    }

    const steps = [
        { id: 1, title: 'ARTIST IDENTITY', icon: Mic2 },
        { id: 2, title: 'TALENT SPEC', icon: Music },
        { id: 3, title: 'MEDIA ASSETS', icon: Video }
    ];

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-6 md:pt-12 pb-40 px-4 relative overflow-hidden">
            {/* Immersive Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[100vh] bg-gradient-to-b from-orange-500/10 via-transparent to-transparent blur-[120px] opacity-40" />
                <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] bg-neon-blue/5 rounded-full blur-[180px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[180px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto">
                {/* Cinema Header */}
                <div className="text-center mb-32 relative">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                        className="inline-flex flex-col items-center mb-0 z-10 relative"
                    >
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-neon-blue/20 bg-neon-blue/5 backdrop-blur-md relative z-20 shadow-[0_0_30px_rgba(46,191,255,0.15)] z-30">
                            <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse shadow-[0_0_10px_rgba(46,191,255,0.8)]" />
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-neon-blue">
                                ARTIST REGISTRY
                            </span>
                        </div>
                        
                        <div className="relative group -mt-10 -mb-8 md:-mt-16 md:-mb-12 z-10">
                            <div className="absolute -inset-14 bg-gradient-to-r from-orange-600/30 via-purple-600/30 to-blue-600/30 rounded-full blur-[80px] opacity-70 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse" />
                            <img src={logo} alt="ArtistAnt Logo" className="w-64 md:w-80 lg:w-[28rem] object-contain relative z-10 drop-shadow-[0_20px_60px_rgba(255,87,34,0.3)] hover:scale-105 transition-transform duration-500" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.8 }}
                        className="relative z-20 mt-4 md:mt-8"
                    >
                        <h1 className="text-[14vw] sm:text-[12vw] md:text-[9vw] lg:text-[7.5vw] xl:text-[8rem] font-black font-heading tracking-tighter leading-[0.85] uppercase italic select-none">
                            <span className="block text-white">UNLEASH THE</span>
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#FF5722] via-[#FF1F71] to-[#7B61FF] filter drop-shadow-[0_0_60px_rgba(255,87,34,0.25)] pb-4">PERFORMER.</span>
                        </h1>
                        
                        <div className="absolute -top-10 -right-10 hidden md:block">
                        </div>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                        className="text-gray-500 max-w-2xl mx-auto text-sm md:text-lg font-medium leading-relaxed uppercase tracking-[0.2em] mt-12 px-6"
                    >
                        THE NEXT GENERATION OF ARTIST MANAGEMENT. <br className="hidden md:block" />
                        <span className="text-white/40">REGISTER. VERIFY. PERFORM.</span>
                    </motion.p>
                </div>

                {!user ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
                        <div className="p-16 bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[4rem] shadow-2xl">
                            <Star className="w-20 h-20 text-neon-blue mx-auto mb-10 animate-pulse" />
                            <h3 className="text-4xl font-black font-heading mb-6 italic uppercase">AUTHENTICATION REQUIRED</h3>
                            <p className="text-gray-500 mb-12 font-medium text-lg leading-relaxed uppercase tracking-tight">Identity verification is mandatory to enter the ArtistAnt Registry. Sign in to proceed.</p>
                            <button onClick={() => setAuthModal(true)} className="h-20 px-16 rounded-2xl text-base font-black font-heading uppercase tracking-[0.2em] bg-white text-black hover:bg-neon-blue transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center gap-4 mx-auto">
                                Sign In <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-gray-500 mb-8">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" /> ARTIST PORTAL</span>
                            <span>//</span>
                            <span>{isEditing ? 'EDIT PROFILE' : 'REGISTRATION'}</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-heading tracking-tighter uppercase italic leading-[0.85] text-white mb-16">
                            {isEditing ? 'UPDATE ' : 'ARTIST '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-orange-500">
                                PROFILE.
                            </span>
                        </h1>

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
                            
                            <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                                {step === 1 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center gap-5 mb-10">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white"><Mic2 size={24} /></div>
                                            <div>
                                                <h3 className="text-3xl font-black font-heading uppercase tracking-tighter italic">Identity Profile</h3>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Artist Registration</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Stage Name / Full Name</label>
                                                <Input required name="name" value={formData.name} onChange={handleChange} placeholder="The Rocking Ants" className="h-16 bg-black/50 border-white/5 rounded-2xl text-[12px] font-bold" />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Primary Category</label>
                                                <select
                                                    required name="category" value={formData.category} onChange={handleChange}
                                                    className="w-full h-16 bg-black/50 border border-white/5 rounded-2xl px-6 text-white text-[12px] font-bold focus:border-neon-blue transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled className="bg-zinc-900">SELECT TALENT CATEGORY</option>
                                                    {ARTIST_CATEGORIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c.toUpperCase()}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Base Location</label>
                                                <select
                                                    required name="city" value={formData.city} onChange={handleChange}
                                                    className="w-full h-16 bg-black/50 border border-white/5 rounded-2xl px-6 text-white text-[12px] font-bold focus:border-neon-blue transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled className="bg-zinc-900">SELECT OPERATING HUB</option>
                                                    {PREDEFINED_CITIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c.toUpperCase()}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Contact Number</label>
                                                <Input required name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 00000 00000" className="h-16 bg-black/50 border-white/5 rounded-2xl text-[12px] font-bold" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center gap-5 mb-10">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-neon-blue"><Music size={24} /></div>
                                            <div>
                                                <h3 className="text-3xl font-black font-heading uppercase tracking-tighter italic text-orange-500">Performance Spec</h3>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Marketable Skills</p>
                                            </div>
                                        </div>
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Years of Experience</label>
                                                    <Input required type="number" name="experienceYears" value={formData.experienceYears} onChange={handleChange} placeholder="e.g. 5" className="h-16 bg-black/50 border-white/5 rounded-2xl text-[12px] font-bold" />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Estimated Base Price (₹)</label>
                                                    <Input required type="number" name="basePrice" value={formData.basePrice} onChange={handleChange} placeholder="e.g. 25000" className="h-16 bg-black/50 border-white/5 rounded-2xl text-[12px] font-bold" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Performance Bio / Vision</label>
                                                <textarea
                                                    required name="bio" value={formData.bio} onChange={handleChange}
                                                    placeholder="Describe your style, performance energy, and what makes you unique on stage..."
                                                    className="w-full bg-black/50 border border-white/5 rounded-[2rem] p-6 text-white text-[12px] font-medium leading-relaxed focus:border-neon-blue transition-all h-40 resize-none shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center gap-5 mb-10">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white"><Video size={24} /></div>
                                            <div>
                                                <h3 className="text-3xl font-black font-heading uppercase tracking-tighter italic">Media Dossier</h3>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Visual Authority</p>
                                            </div>
                                        </div>
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Instagram size={14} className="text-pink-500" /> Instagram Handle</label>
                                                    <Input required name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@handle" className="h-14 bg-black/50 border-white/5 rounded-xl font-bold" />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Youtube size={14} className="text-red-500" /> YouTube Channel Link</label>
                                                    <Input name="youtube" value={formData.youtube} onChange={handleChange} placeholder="https://youtube.com/..." className="h-14 bg-black/50 border-white/5 rounded-xl font-bold" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Portfolio / Live Performance Link</label>
                                                <Input required name="portfolioLink" value={formData.portfolioLink} onChange={handleChange} placeholder="Google Drive, Dropbox or Website" className="h-16 bg-black/50 border-white/5 rounded-2xl text-[12px] font-bold" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-10 border-t border-white/5">
                                    {step > 1 ? (
                                        <button type="button" onClick={prevStep} className="px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2">
                                            <ArrowRight size={16} className="rotate-180" /> BACK
                                        </button>
                                    ) : (
                                        isEditing ? (
                                            <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                                                CANCEL
                                            </button>
                                        ) : <div />
                                    )}
                                    
                                    {step < 3 ? (
                                        <Button type="button" onClick={nextStep} className="px-10 py-4 rounded-xl text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-neon-blue transition-colors flex items-center gap-2">
                                            CONTINUE <ArrowRight size={16} />
                                        </Button>
                                    ) : (
                                        <Button type="submit" disabled={isSubmitting} className="px-10 py-4 rounded-xl text-xs font-black uppercase tracking-widest bg-neon-blue text-black hover:bg-white transition-colors flex items-center gap-2 shadow-[0_0_30px_rgba(46,191,255,0.3)]">
                                            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (isEditing ? 'SAVE CHANGES' : 'INITIALIZE PROFILE')}
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArtistAnt;

import { Trash2, Edit } from 'lucide-react';

const ArtistDashboard = ({ artist, upcomingEvents, applyArtistToGig, navigate, onEdit, onDelete }) => {
    const isApproved = artist?.profileStatus === 'approved';
    const gigs = upcomingEvents || [];
    const gigCasting = artist?.gigCasting || {};

    const handleApply = async (gigId) => {
        if (!isApproved) {
            alert('Your profile must be approved before you can apply to gigs.');
            return;
        }
        try {
            await applyArtistToGig(artist.id, gigId);
            alert('Successfully applied to gig!');
        } catch (error) {
            alert('Failed to apply. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-20 px-4 md:px-8 overflow-x-hidden">
            {/* Ambient Lighting */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[10%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] left-[10%] w-[40%] h-[40%] bg-neon-pink/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto">
                <div className="flex flex-col lg:flex-row gap-8 mb-16">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <Sparkles size={16} className="text-neon-blue" />
                            <span className="text-neon-blue text-[10px] font-black uppercase tracking-[0.4em]">Core Talent System</span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            <img src={logo} alt="ArtistAnt" className="h-20 md:h-28 object-contain drop-shadow-[0_0_30px_rgba(46,191,255,0.3)]" />
                            <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic text-white">
                                DASHBOARD.
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-black text-xl text-neon-blue">
                                {artist?.name?.charAt(0)}
                            </div>
                            <div>
                                <p className="font-black uppercase tracking-widest text-sm">{artist?.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={cn("w-2 h-2 rounded-full", isApproved ? "bg-neon-green" : "bg-yellow-500")} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        {isApproved ? 'VERIFIED TALENT' : 'PENDING REVIEW'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={onEdit} className="h-12 px-6 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 hover:bg-white/10 transition-all">
                                <Edit size={16} className="text-neon-blue" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">EDIT</span>
                            </button>
                            <button onClick={onDelete} className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-red-500">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {!isApproved && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-[2rem] mb-12 flex items-start gap-4">
                        <div className="mt-1">
                            <CheckCircle2 className="text-yellow-500" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-yellow-500 mb-2">Profile Under Review</h3>
                            <p className="text-xs font-medium text-gray-400 leading-relaxed max-w-3xl">
                                Your artist profile has been submitted and is currently under review by our talent operations team. You will be able to apply to available gigs once your profile has been verified and approved.
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-8">
                    <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3">
                        <Layout className="text-neon-blue" size={24} /> AVAILABLE GIGS
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {gigs.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-zinc-900/30 rounded-[3rem] border border-white/5">
                                <Music className="mx-auto mb-4 text-gray-600" size={48} />
                                <p className="text-sm font-black uppercase tracking-widest text-gray-500">No upcoming gigs available.</p>
                            </div>
                        ) : (
                            gigs.map(gig => {
                                const statusInfo = gigCasting[gig.id];
                                const hasApplied = !!statusInfo;
                                const statusText = statusInfo?.status === 'shortlisted' ? 'SHORTLISTED' : 
                                                   statusInfo?.status === 'applied' ? 'APPLIED' : 
                                                   statusInfo?.status === 'rejected' ? 'REJECTED' : 'APPLY NOW';
                                
                                return (
                                    <div key={gig.id} className="group relative bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-neon-blue/40 transition-all duration-500 flex flex-col">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-neon-blue/20 group-hover:bg-neon-blue transition-all" />
                                        <div className="aspect-video overflow-hidden bg-black/50 relative">
                                            {gig.image ? (
                                                <img src={gig.image} alt={gig.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><Music size={40} className="text-gray-700" /></div>
                                            )}
                                            {hasApplied && (
                                                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        statusInfo.status === 'shortlisted' ? "bg-neon-green" : 
                                                        statusInfo.status === 'applied' ? "bg-neon-blue" : "bg-red-500"
                                                    )} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white">{statusText}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-8 flex-1 flex flex-col">
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-400">
                                                    {gig.category || 'MUSIC'}
                                                </span>
                                                <span className="text-[10px] font-black text-gray-500 flex items-center gap-1 uppercase">
                                                    <MapPin size={12} /> {gig.location}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-black font-heading tracking-tight uppercase italic text-white mb-2 group-hover:text-neon-blue transition-colors">{gig.title}</h3>
                                            <p className="text-xs text-gray-500 font-medium line-clamp-2 mb-6 flex-1">{gig.description}</p>
                                            
                                            <Button 
                                                onClick={() => handleApply(gig.id)}
                                                disabled={hasApplied || !isApproved}
                                                className={cn(
                                                    "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all",
                                                    hasApplied ? "bg-white/5 text-gray-500 border border-white/10" : "bg-neon-blue text-black hover:scale-[1.02]"
                                                )}
                                            >
                                                {hasApplied ? statusText : 'APPLY FOR GIG'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
