import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Shield, Briefcase, Ticket, LogOut, ExternalLink, Settings, Sparkles, AlertCircle, ArrowRight, ArrowLeft, Key, RefreshCw, Mail, Check, Edit2, Loader2, Info, Instagram, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { loginWithMeta } from '../lib/metaSDK';

const ProfilePanel = ({ isOpen, onClose }) => {
    const { user, logout, creators, addNotification, resetPassword, updateDisplayName, verifyInstagramFollowers } = useStore();
    const navigate = useNavigate();
    const [view, setView] = useState('main'); // 'main', 'account', 'privacy'
    const [isUpdating, setIsUpdating] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
    const [isEditingName, setIsEditingName] = useState(false);

    if (!user) return null;

    const creatorProfile = creators?.find(c => c.uid === user.uid);
    const isCreator = !!creatorProfile;
    const isApprovedCreator = creatorProfile?.profileStatus === 'approved';

    const handleLogout = async () => {
        await logout();
        onClose();
        navigate('/');
    };

    const handleResetPassword = async () => {
        setIsUpdating(true);
        try {
            await resetPassword(user.email);
            addNotification({
                title: "Security Link Dispatched",
                content: "Check your inbox for password reset instructions.",
                type: 'message'
            });
        } catch (err) {
            addNotification({
                title: "Dispatch Failed",
                content: "Unable to send reset email. Contact technical support.",
                type: 'default'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateName = async () => {
        if (!newDisplayName.trim()) return;
        setIsUpdating(true);
        try {
            await updateDisplayName(newDisplayName);
            setIsEditingName(false);
            addNotification({
                title: "Identity Updated",
                content: "Your display name has been successfully synchronized.",
                type: 'message'
            });
        } catch (err) {
            addNotification({
                title: "Update Error",
                content: "Failed to sync identity changes.",
                type: 'default'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleVerifySocials = async () => {
        setIsUpdating(true);
        try {
            const token = await loginWithMeta();
            const result = await verifyInstagramFollowers(user.uid, token);
            
            if (result.success) {
                addNotification({
                    title: "Impact Synchronized",
                    content: `Verified ${Number(result.followers).toLocaleString()} followers. Profile unlocked.`,
                    type: 'message'
                });
            }
        } catch (err) {
            console.error(err);
            addNotification({
                title: "Protocol Interrupted",
                content: err.message || "Social verification failed. Check app permissions.",
                type: 'default'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-md bg-[#050505] border-l border-white/10 z-[101] overflow-hidden flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
                    >
                        {/* Immersive Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/10 blur-[100px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-pink/10 blur-[100px] pointer-events-none" />

                        {/* Top Header */}
                        <div className="p-8 flex items-center justify-between relative z-10">
                            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Personal Space</h2>
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* User Identity Section */}
                        <div className="px-8 pb-10 border-b border-white/5 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue to-neon-pink rounded-full blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative w-20 h-20 rounded-full bg-zinc-900 border-2 border-white/10 flex items-center justify-center overflow-hidden">
                                        <span className="text-3xl font-black text-white italic uppercase">
                                            {user.displayName ? user.displayName.charAt(0) : 'U'}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-neon-green rounded-full border-4 border-black flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-black font-heading text-white italic truncate tracking-tight capitalize">
                                        {user.displayName || 'Tribe Member'}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={cn(
                                            "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border",
                                            user.role === 'developer' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                            user.role === 'super_admin' ? "bg-neon-blue/10 text-neon-blue border-neon-blue/20" :
                                            isApprovedCreator ? "bg-neon-green/10 text-neon-green border-neon-green/20" :
                                            "bg-white/5 text-gray-500 border-white/5"
                                        )}>
                                            {user.role === 'developer' ? 'DEVELOPER' : (user.role === 'super_admin' ? 'SYSTEM ADMIN' : (isApprovedCreator ? 'VERIFIED CREATOR' : 'MEMBER'))}
                                        </span>
                                        <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Joined 2024</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar relative z-10">
                            
                            {/* Creator Section (Conditional) */}
                            {isCreator && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={14} className="text-neon-blue" />
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Creator Hub</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button 
                                            onClick={() => { navigate('/creator-dashboard'); onClose(); }}
                                            className="group flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-neon-blue/30 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                                                    <Briefcase size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black italic text-white uppercase tracking-tight">Studio Workspace</p>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase active:text-blue-200">Manage Missions & Earnings</p>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-gray-600 group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
                                        </button>

                                        {!isApprovedCreator && (
                                            <div className="p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 flex gap-4">
                                                <AlertCircle size={20} className="text-yellow-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Status: Pending Verification</p>
                                                    <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase">Our analysts are reviewing your profile. Verification usually takes 48-72 hours.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* My Tickets Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Ticket size={14} className="text-neon-pink" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                                            <User size={16} />
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                                            {view === 'main' ? 'Studio Profile' : view === 'account' ? 'Identity Management' : 'Security protocol'}
                                        </span>
                                        <h2 className="text-xl font-black font-heading uppercase text-white tracking-tighter leading-none mt-1">
                                            {view === 'main' ? 'Command Center' : view === 'account' ? 'Account Details' : 'Privacy & Security'}
                                        </h2>
                                    </div>
                                </div>
                                <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                {view === 'main' ? (
                                    <motion.div 
                                        key="main"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-10"
                                    >
                                        <div className="space-y-6">
                                            {/* User Info Header */}
                                            <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="w-20 h-20 rounded-[1.5rem] bg-black/40 border border-white/5 flex items-center justify-center relative z-10 shrink-0">
                                                    <span className="text-3xl font-black text-white italic">{user.displayName ? user.displayName[0] : user.email[0]}</span>
                                                </div>
                                                <div className="flex-1 min-w-0 relative z-10">
                                                    <h3 className="text-xl font-black font-heading uppercase text-white truncate italic">{user.displayName || 'System Member'}</h3>
                                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest truncate">{user.email}</p>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                                                            user.role === 'admin' ? "bg-neon-pink/10 text-neon-pink" : "bg-neon-blue/10 text-neon-blue"
                                                        )}>
                                                            {user.role}
                                                        </span>
                                                        {isCreator && (
                                                            <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-neon-green/10 text-neon-green">
                                                                Creator
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Creators Section */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Briefcase size={14} className="text-gray-600" />
                                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Creator Hub</h4>
                                                </div>
                                                {isCreator ? (
                                                    <button 
                                                        onClick={() => { navigate('/creator'); onClose(); }}
                                                        className="w-full flex items-center justify-between p-6 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-neon-blue/20 transition-all group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                                                                <Settings size={18} />
                                                            </div>
                                                            <div className="text-left">
                                                                <span className="block text-[11px] font-black text-white uppercase tracking-widest">Dashboard Console</span>
                                                                <span className="block text-[9px] text-gray-500 uppercase font-bold mt-0.5">Manage missions & status</span>
                                                            </div>
                                                        </div>
                                                        <ArrowRight size={16} className="text-gray-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => { navigate('/community-join'); onClose(); }}
                                                        className="w-full flex items-center justify-between p-6 rounded-[1.5rem] bg-neon-blue/5 border border-neon-blue/10 hover:border-neon-blue transition-all group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                                                                <Sparkles size={18} />
                                                            </div>
                                                            <div className="text-left">
                                                                <span className="block text-[11px] font-black text-white uppercase tracking-widest">Join The Movement</span>
                                                                <span className="block text-[9px] text-neon-blue uppercase font-bold mt-0.5">Become a verified creator</span>
                                                            </div>
                                                        </div>
                                                        <ArrowRight size={16} className="text-neon-blue group-hover:translate-x-1 transition-all" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Ticket Section */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Ticket size={14} className="text-gray-600" />
                                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Ticketing</h4>
                                                </div>
                                                <button 
                                                    onClick={() => { navigate('/tickets'); onClose(); }}
                                                    className="w-full flex items-center justify-between p-6 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-neon-pink/20 transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-neon-pink/10 flex items-center justify-center text-neon-pink">
                                                            <ExternalLink size={18} />
                                                        </div>
                                                        <div className="text-left">
                                                            <span className="block text-[11px] font-black text-white uppercase tracking-widest">Digital Vault</span>
                                                            <span className="block text-[9px] text-gray-500 uppercase font-bold mt-0.5">Access your entry passes</span>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={16} className="text-gray-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                                                </button>
                                            </div>

                                            {/* Preferences Section */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Settings size={14} className="text-gray-600" />
                                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Preferences</h4>
                                                </div>
                                                <div className="space-y-2">
                                                    <button 
                                                        onClick={() => setView('account')}
                                                        className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-left"
                                                    >
                                                        <User size={18} />
                                                        <span className="text-[11px] font-black uppercase tracking-widest">Account Details</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => setView('privacy')}
                                                        className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-left"
                                                    >
                                                        <Shield size={18} />
                                                        <span className="text-[11px] font-black uppercase tracking-widest">Privacy & Security</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : view === 'account' ? (
                                    <motion.div 
                                        key="account"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-8"
                                    >
                                        {/* Avatar Edit */}
                                        <div className="flex flex-col items-center justify-center py-6">
                                            <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center relative group overflow-hidden mb-4">
                                                <span className="text-4xl font-black text-white italic">{user.displayName ? user.displayName[0] : user.email[0]}</span>
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                                    <RefreshCw size={24} className="text-neon-blue" />
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{user.uid}</span>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Professional Identity</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        disabled={!isEditingName || isUpdating}
                                                        value={isEditingName ? newDisplayName : (user.displayName || '')} 
                                                        onChange={(e) => setNewDisplayName(e.target.value)}
                                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-6 text-sm font-bold text-white focus:border-neon-blue transition-all disabled:opacity-50"
                                                        placeholder="Member Display Name"
                                                    />
                                                    <button 
                                                        onClick={() => isEditingName ? handleUpdateName() : setIsEditingName(true)}
                                                        disabled={isUpdating}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-neon-blue hover:text-black transition-all"
                                                    >
                                                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : isEditingName ? <Check size={14} /> : <Edit2 size={14} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Primary Communications</label>
                                                <div className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-xl px-6 flex items-center justify-between text-gray-500">
                                                    <span className="text-sm font-bold">{user.email}</span>
                                                    <Mail size={16} className="opacity-30" />
                                                </div>
                                            </div>

                                            {isCreator && (
                                                <div className="p-6 rounded-2xl bg-neon-blue/5 border border-neon-blue/10 space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <Briefcase size={14} className="text-neon-blue" />
                                                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Creator Professional Data</h4>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Origin City</span>
                                                            <span className="block text-xs font-bold text-white uppercase italic">{creatorProfile.city || 'N/A'}</span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Impact Reach</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn("block text-xs font-bold uppercase italic", creatorProfile.instagramVerified ? "text-neon-blue" : "text-white")}>
                                                                    {Number(creatorProfile.instagramFollowers || 0).toLocaleString()}
                                                                </span>
                                                                {creatorProfile.instagramVerified && <CheckCircle2 size={10} className="text-neon-blue" />}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                                        <button 
                                                            onClick={handleVerifySocials}
                                                            disabled={isUpdating || creatorProfile.instagramVerified}
                                                            className={cn(
                                                                "h-10 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                                                                creatorProfile.instagramVerified 
                                                                    ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30 cursor-default" 
                                                                    : "bg-white text-black hover:bg-neon-blue transition-colors"
                                                            )}
                                                        >
                                                            {isUpdating ? <Loader2 size={12} className="animate-spin" /> : creatorProfile.instagramVerified ? <ShieldCheck size={12} /> : <Instagram size={12} />}
                                                            {creatorProfile.instagramVerified ? 'Verified' : 'Verify Impact'}
                                                        </button>
                                                        <button 
                                                            onClick={() => { navigate('/creator'); onClose(); }}
                                                            className="h-10 rounded-lg bg-zinc-900 border border-white/5 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:text-white hover:border-white/10 transition-all"
                                                        >
                                                            Edit Specs
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="privacy"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-8"
                                    >
                                        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 text-center space-y-4">
                                            <div className="w-16 h-16 rounded-2xl bg-neon-blue/10 flex items-center justify-center text-neon-blue mx-auto">
                                                <Key size={30} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black font-heading uppercase tracking-tighter text-white">Security Infrastructure</h3>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-relaxed mt-2 px-4">
                                                    Manage your access credentials and session security protocols.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Access Recovery</h4>
                                                <button 
                                                    onClick={handleResetPassword}
                                                    disabled={isUpdating}
                                                    className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all flex items-center justify-between px-6 group disabled:opacity-50"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <RefreshCw size={18} className={cn("text-neon-blue transition-transform group-hover:rotate-180 duration-500", isUpdating && "animate-spin")} />
                                                        <span className="text-[11px] font-black uppercase tracking-widest">Update Password</span>
                                                    </div>
                                                    <ArrowRight size={14} className="opacity-30" />
                                                </button>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest px-1 italic">
                                                    A reset link will be dispatched to {user.email}
                                                </p>
                                            </div>

                                            <div className="pt-8 space-y-3 border-t border-white/5">
                                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Data Governance</h4>
                                                <button className="w-full h-16 rounded-2xl bg-white/[0.02] border border-white/5 text-gray-600 hover:text-white transition-all flex items-center justify-between px-6 text-left">
                                                    <div className="flex items-center gap-4">
                                                        <Info size={18} />
                                                        <span className="text-[11px] font-black uppercase tracking-widest line-clamp-1">Personal Data Portability</span>
                                                    </div>
                                                    <span className="text-[8px] font-black px-2 py-1 bg-white/5 rounded text-gray-500">REQUEST</span>
                                                </button>
                                                <button className="w-full h-16 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500/50 hover:bg-red-500 hover:text-white transition-all flex items-center justify-between px-6 text-left group">
                                                    <div className="flex items-center gap-4">
                                                        <AlertCircle size={18} />
                                                        <span className="text-[11px] font-black uppercase tracking-widest">Permanent Account Deactivation</span>
                                                    </div>
                                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Logout Segment */}
                        {view === 'main' && (
                            <div className="p-8 border-t border-white/10 shrink-0">
                                <button 
                                    onClick={handleLogout}
                                    className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-4 group"
                                >
                                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                                    <span className="text-sm font-black font-heading uppercase tracking-widest">Logout</span>
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ProfilePanel;
