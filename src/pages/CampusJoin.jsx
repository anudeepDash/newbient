import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../lib/store';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowLeft, ArrowRight, User, MapPin, Phone, Mail, Instagram, Linkedin, MessageCircle, Copy, Hash, CheckCircle2, Clock, XCircle, Star, Users, Briefcase, Calendar, ChevronDown } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import useDynamicMeta from '../hooks/useDynamicMeta';
import GlobalLoader from '../components/ui/GlobalLoader';
import { serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import INDIA_DATA from '../data/indianColleges';

// Helper component for the dashboard shown after applying or if auto-activated
const AmbassadorDashboard = ({ profile }) => {
    const [copied, setCopied] = useState(false);
    const { campusActivations } = useStore();

    const handleCopy = () => {
        if (!profile.referralCode) return;
        navigator.clipboard.writeText(profile.referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderRoleContent = () => {
        switch (profile.role) {
            case 'normal_student':
                return (
                    <div className="space-y-6">
                        <div className="p-6 bg-neon-purple/10 border border-neon-purple/20 rounded-2xl">
                            <h3 className="text-neon-purple font-black uppercase tracking-tight text-xl mb-2 flex items-center gap-2">
                                <Star size={24} /> Gamified Campaigns
                            </h3>
                            <p className="text-zinc-400 text-sm mb-4">Discover and participate in exclusive live activations on your campus. Earn points and win rewards!</p>
                            
                            <div className="grid sm:grid-cols-2 gap-4">
                                {campusActivations?.length > 0 ? campusActivations.map(act => (
                                    <Link key={act.id} to={`/campus/activation/${act.slug}`} className="p-4 bg-black/40 border border-white/10 rounded-xl hover:border-neon-purple transition-all group">
                                        <h4 className="font-bold text-white group-hover:text-neon-purple transition-colors">{act.title}</h4>
                                        <p className="text-xs text-zinc-500 mt-1">By {act.brandName}</p>
                                    </Link>
                                )) : (
                                    <div className="col-span-2 text-center p-6 border border-white/5 rounded-xl text-zinc-500 text-sm">
                                        No active campaigns currently. Check back soon!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'fest_head':
            case 'club_head':
                return (
                    <div className="space-y-6">
                        <div className="p-6 bg-neon-green/10 border border-neon-green/20 rounded-2xl">
                            <h3 className="text-neon-green font-black uppercase tracking-tight text-xl mb-2 flex items-center gap-2">
                                <Calendar size={24} /> Event Organizer Hub
                            </h3>
                            <p className="text-zinc-400 text-sm mb-4">You have special access to request sponsorships and launch gamified campaigns for your college.</p>
                            
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link to="/contact" className="flex-1 p-4 bg-black/40 border border-white/10 rounded-xl hover:border-neon-green transition-all text-center group">
                                    <Briefcase className="mx-auto mb-2 text-zinc-500 group-hover:text-neon-green" size={24} />
                                    <h4 className="font-bold text-white text-sm">Request Sponsorship</h4>
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            case 'campus_influencer':
                return (
                    <div className="space-y-6">
                        <div className="p-6 bg-[#FF0055]/10 border border-[#FF0055]/20 rounded-2xl">
                            <h3 className="text-[#FF0055] font-black uppercase tracking-tight text-xl mb-2 flex items-center gap-2">
                                <Users size={24} /> Creator Hub
                            </h3>
                            <p className="text-zinc-400 text-sm mb-4">You're recognized as a campus influencer! Access exclusive brand deals and creator missions.</p>
                            <Link to="/creator-studio" className="inline-flex h-12 px-6 bg-[#FF0055] text-white font-bold rounded-xl items-center justify-center hover:scale-[1.02] transition-transform">
                                Go to Creator Studio
                            </Link>
                        </div>
                    </div>
                );
            case 'ambassador':
            default:
                return (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <a 
                                href="https://chat.whatsapp.com/your-invite-link"
                                target="_blank" rel="noreferrer"
                                className="p-6 bg-white/5 border border-white/10 hover:border-[#25D366]/50 hover:bg-[#25D366]/10 rounded-2xl transition-all group flex flex-col items-center justify-center text-center gap-3"
                            >
                                <MessageCircle className="w-8 h-8 text-[#25D366] group-hover:scale-110 transition-transform" />
                                <div>
                                    <h3 className="font-bold text-white mb-1">Campus Community</h3>
                                    <p className="text-xs text-zinc-400">Join the exclusive WhatsApp group</p>
                                </div>
                            </a>

                            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Hash className="w-8 h-8 text-neon-blue relative z-10" />
                                <div className="relative z-10">
                                    <h3 className="font-bold text-white mb-1">Total Referrals</h3>
                                    <p className="text-3xl font-black text-neon-blue">{profile.referralsCount || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-black/40 border border-white/10 rounded-2xl">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Your Unique Referral Code</h3>
                            <div className="flex items-center gap-3">
                                <code className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center px-4 font-mono text-neon-blue font-bold tracking-wider">
                                    {profile.referralCode || 'PENDING'}
                                </code>
                                <button 
                                    onClick={handleCopy}
                                    className="h-12 px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold text-sm flex items-center gap-2"
                                >
                                    {copied ? <CheckCircle2 size={16} className="text-neon-green" /> : <Copy size={16} />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-xs text-zinc-500 mt-3">Share this code with your peers. When they join Newbi using your code, you earn rewards!</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-dark text-white font-['Outfit'] relative overflow-hidden flex flex-col items-center justify-center p-4 pt-32 pb-20">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[140px]" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative z-10"
            >
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <GraduationCap className="text-neon-blue" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Campus Dashboard</h1>
                        <p className="text-neon-blue font-bold tracking-widest text-xs uppercase mt-1">
                            {profile.role ? profile.role.replace('_', ' ') : 'Campus Profile'}
                        </p>
                    </div>
                </div>

                {profile.profileStatus === 'pending' && (
                    <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-center">
                        <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-pulse" />
                        <h2 className="text-xl font-bold text-yellow-500 mb-2">Under Review</h2>
                        <p className="text-zinc-400 text-sm">Your application is currently being reviewed by our team. We'll be in touch soon!</p>
                    </div>
                )}

                {profile.profileStatus === 'rejected' && (
                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-red-500 mb-2">Application Unsuccessful</h2>
                        <p className="text-zinc-400 text-sm">Unfortunately, we cannot accept your application at this time. Thank you for your interest.</p>
                    </div>
                )}

                {profile.profileStatus === 'approved' && renderRoleContent()}

                <div className="mt-8 text-center">
                    <Link to="/campus" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Back to Main Page</span>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

const CampusJoin = () => {
    useDynamicMeta({
        title: "Join Campus Network",
        description: "Apply to be a part of the Newbi Campus Network.",
        url: window.location.href
    });

    const navigate = useNavigate();
    const { user, addCampusProfile, campusProfiles, creators } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        state: '',
        city: '',
        university: '',
        course: '',
        graduationYear: '',
        instagram: '',
        linkedin: '',
        whyJoin: '',
        role: 'normal_student'
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: prev.fullName || user.displayName || '',
                email: prev.email || user.email || '',
                phone: prev.phone || user.phoneNumber || ''
            }));
        }
    }, [user]);

    // Check if user is an auto-activated creator
    const creatorProfile = React.useMemo(() => {
        if (!user || !creators) return null;
        const creator = creators.find(c => c.uid === user.uid && c.status === 'approved' && (c.niche?.toLowerCase().includes('student') || c.niche?.toLowerCase().includes('campus')));
        if (creator) {
            return {
                ...creator,
                role: 'campus_influencer',
                profileStatus: 'approved',
                isCreatorImport: true
            };
        }
        return null;
    }, [user, creators]);

    // Determine if user has already applied
    const existingProfile = React.useMemo(() => {
        if (creatorProfile) return creatorProfile;
        if (!user || !campusProfiles) return null;
        return campusProfiles.find(c => c.uid === user.uid) || null;
    }, [user, campusProfiles, creatorProfile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'state') {
            setFormData(prev => ({ ...prev, state: value, city: '', university: '' }));
        } else if (name === 'city') {
            setFormData(prev => ({ ...prev, city: value, university: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const availableCities = useMemo(() => {
        if (!formData.state) return [];
        const stateData = INDIA_DATA.states.find(s => s.name === formData.state);
        return stateData?.cities || [];
    }, [formData.state]);

    const availableColleges = useMemo(() => {
        if (!formData.state || !formData.city) return [];
        const stateData = INDIA_DATA.states.find(s => s.name === formData.state);
        const cityData = stateData?.cities.find(c => c.name === formData.city);
        return cityData?.colleges || [];
    }, [formData.state, formData.city]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError("Please sign in first to apply.");
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const applicationData = {
                uid: user.uid,
                ...formData,
                profileStatus: 'pending', // pending | approved | rejected
                joinedAt: serverTimestamp(),
            };

            await addCampusProfile(applicationData);
        } catch (err) {
            console.error("Error submitting application:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (existingProfile) {
        return <AmbassadorDashboard profile={existingProfile} />;
    }

    return (
        <div className="min-h-screen bg-dark text-white font-['Outfit'] relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/10 rounded-full blur-[140px]" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">
                <Link to="/campus" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Back to Campus</span>
                </Link>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
                    {/* Left Column - Info */}
                    <div className="sticky top-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white mb-6">
                            <GraduationCap size={16} className="text-neon-blue" />
                            <span className="text-xs font-black uppercase tracking-widest">Join the Network</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
                            Enter the <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple pb-2">Campus Hub</span>
                        </h1>
                        <p className="text-zinc-400 text-lg max-w-md mb-8">
                            Select your role to unlock gamified campaigns, brand sponsorships, and exclusive community access.
                        </p>
                    </div>

                    {/* Right Column - Form */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl">
                        {!user && (
                            <div className="mb-8 p-4 bg-neon-blue/10 border border-neon-blue/20 rounded-2xl">
                                <h3 className="font-bold text-neon-blue mb-2">Sign in to Apply</h3>
                                <p className="text-sm text-zinc-400 mb-4">You need a Newbi account to join the network.</p>
                                <Link to="/auth/action?mode=login" className="h-10 px-6 rounded-xl bg-neon-blue text-black font-black uppercase tracking-widest text-xs inline-flex items-center justify-center">
                                    Sign In Now
                                </Link>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-6">
                                {/* Role Selection */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">I am applying as a...</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {[
                                            { id: 'normal_student', label: 'Student' },
                                            { id: 'ambassador', label: 'Ambassador' },
                                            { id: 'campus_influencer', label: 'Influencer' },
                                            { id: 'fest_head', label: 'Fest Head' },
                                            { id: 'club_head', label: 'Club Head' },
                                        ].map((role) => (
                                            <button
                                                type="button"
                                                key={role.id}
                                                onClick={() => setFormData(prev => ({ ...prev, role: role.id }))}
                                                className={cn(
                                                    "h-10 rounded-xl text-xs font-bold border transition-all uppercase tracking-wider",
                                                    formData.role === role.id 
                                                        ? "bg-neon-blue border-neon-blue text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]" 
                                                        : "bg-black/40 border-white/10 text-zinc-400 hover:border-white/30 hover:text-white"
                                                )}
                                            >
                                                {role.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Standard Fields */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Full Name</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input 
                                            type="text" 
                                            name="fullName"
                                            required
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 focus:border-neon-blue focus:outline-none transition-colors"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Email</label>
                                        <div className="relative">
                                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                            <input 
                                                type="email" 
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 focus:border-neon-blue focus:outline-none transition-colors"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Phone</label>
                                        <div className="relative">
                                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                            <input 
                                                type="tel" 
                                                name="phone"
                                                required
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 focus:border-neon-blue focus:outline-none transition-colors"
                                                placeholder="+91 9876543210"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* State → City → College Cascade */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">State</label>
                                        <div className="relative">
                                            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                            <select 
                                                name="state"
                                                required
                                                value={formData.state}
                                                onChange={handleChange}
                                                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-10 focus:border-neon-blue focus:outline-none transition-colors appearance-none text-white"
                                            >
                                                <option value="" className="bg-zinc-900">Select State</option>
                                                {INDIA_DATA.states.map(s => (
                                                    <option key={s.name} value={s.name} className="bg-zinc-900">{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">City</label>
                                        <div className="relative">
                                            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                            <select 
                                                name="city"
                                                required
                                                value={formData.city}
                                                onChange={handleChange}
                                                disabled={!formData.state}
                                                className={cn(
                                                    "w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-10 focus:border-neon-blue focus:outline-none transition-colors appearance-none",
                                                    !formData.state ? "text-zinc-600 cursor-not-allowed" : "text-white"
                                                )}
                                            >
                                                <option value="" className="bg-zinc-900">{formData.state ? 'Select City' : 'Select state first'}</option>
                                                {availableCities.map(c => (
                                                    <option key={c.name} value={c.name} className="bg-zinc-900">{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">University / College</label>
                                    <div className="relative">
                                        <GraduationCap size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                        <select 
                                            name="university"
                                            required
                                            value={availableColleges.includes(formData.university) || formData.university === 'Other' ? formData.university : (formData.university ? 'Other' : '')}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === 'Other') {
                                                    setFormData(prev => ({ ...prev, university: 'Other' }));
                                                } else {
                                                    setFormData(prev => ({ ...prev, university: val }));
                                                }
                                            }}
                                            disabled={!formData.city}
                                            className={cn(
                                                "w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-10 focus:border-neon-blue focus:outline-none transition-colors appearance-none",
                                                !formData.city ? "text-zinc-600 cursor-not-allowed" : "text-white"
                                            )}
                                        >
                                            <option value="" className="bg-zinc-900">{formData.city ? 'Select College' : 'Select city first'}</option>
                                            {availableColleges.map(col => (
                                                <option key={col} value={col} className="bg-zinc-900">{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {formData.university === 'Other' && (
                                        <input 
                                            type="text"
                                            name="university"
                                            required
                                            value={formData.university === 'Other' ? '' : formData.university}
                                            onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value || 'Other' }))}
                                            className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 focus:border-neon-blue focus:outline-none transition-colors mt-3"
                                            placeholder="Type your college name..."
                                            autoFocus
                                        />
                                    )}
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Course / Degree</label>
                                        <input 
                                            type="text" 
                                            name="course"
                                            required
                                            value={formData.course}
                                            onChange={handleChange}
                                            className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 focus:border-neon-blue focus:outline-none transition-colors"
                                            placeholder="B.Tech Computer Science"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Grad Year</label>
                                        <input 
                                            type="text" 
                                            name="graduationYear"
                                            required
                                            value={formData.graduationYear}
                                            onChange={handleChange}
                                            className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 focus:border-neon-blue focus:outline-none transition-colors"
                                            placeholder="2026"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Instagram Handle</label>
                                        <div className="relative">
                                            <Instagram size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                            <input 
                                                type="text" 
                                                name="instagram"
                                                value={formData.instagram}
                                                onChange={handleChange}
                                                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 focus:border-neon-blue focus:outline-none transition-colors"
                                                placeholder="@username"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">LinkedIn Profile URL</label>
                                        <div className="relative">
                                            <Linkedin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                            <input 
                                                type="text" 
                                                name="linkedin"
                                                value={formData.linkedin}
                                                onChange={handleChange}
                                                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 focus:border-neon-blue focus:outline-none transition-colors"
                                                placeholder="linkedin.com/in/username"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Why do you want to join?</label>
                                    <textarea 
                                        name="whyJoin"
                                        required
                                        rows={4}
                                        value={formData.whyJoin}
                                        onChange={handleChange}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 focus:border-neon-blue focus:outline-none transition-colors resize-none"
                                        placeholder="Tell us a little bit about yourself and why you'd be a great fit..."
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isLoading || !user}
                                className={cn(
                                    "w-full h-14 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all",
                                    !user ? "bg-white/10 text-white/50 cursor-not-allowed" : "bg-neon-blue text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(0,240,255,0.3)]"
                                )}
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Submit Profile
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            {isLoading && <GlobalLoader color="#00F0FF" />}
        </div>
    );
};

export default CampusJoin;
