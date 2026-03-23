import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Zap, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminGuard = ({ children }) => {
    const { user, authInitialized, setAuthModal } = useStore();
    const location = useLocation();

    useEffect(() => {
        if (authInitialized && !user) {
            setAuthModal(true);
        }
    }, [authInitialized, user, setAuthModal]);

    if (!authInitialized) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
                <motion.div 
                    animate={{ 
                        rotate: 360,
                        scale: [1, 1.2, 1],
                    }} 
                    transition={{ 
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                        scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                    }}
                >
                    <Zap className="text-neon-green" size={64} />
                </motion.div>
                <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Authenticating Authority...</p>
            </div>
        );
    }

    if (!user || (user.role !== 'super_admin' && user.role !== 'developer')) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full text-center space-y-8"
                >
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-md">
                            <ShieldAlert size={14} className="text-red-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Restricted Access</span>
                        </div>
                    </div>

                    <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] border border-red-500/20 flex items-center justify-center mx-auto mb-8">
                        <ShieldAlert className="text-red-500" size={48} />
                    </div>
                    
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black font-heading text-white uppercase italic tracking-tighter">ACCESS DENIED.</h1>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                            Your credentials do not have the required authority to access the <span className="text-neon-green">Newbi Admin Dashboard</span>.
                        </p>
                    </div>

                    <div className="pt-8 space-y-4">
                        {(!user || user.role === 'unauthorized') ? (
                            <button 
                                onClick={async () => {
                                    try {
                                        const btn = document.activeElement;
                                        btn.disabled = true;
                                        btn.innerText = 'SENDING REQUEST...';
                                        await useStore.getState().requestAdminAccess();
                                    } catch (err) {
                                        alert(err.message || "Failed to send request");
                                        const btn = document.activeElement;
                                        btn.disabled = false;
                                        btn.innerText = 'REQUEST COMMAND ACCESS';
                                    }
                                }}
                                className="px-8 h-14 bg-neon-green text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all w-full shadow-[0_10px_30px_rgba(57,255,20,0.2)]"
                            >
                                REQUEST ADMIN ACCESS
                            </button>
                        ) : user.role === 'pending' ? (
                            <div className="p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-center">
                                <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.2em]">AUTHORIZATION PENDING</p>
                                <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">AWAITING ADMIN APPROVAL</p>
                            </div>
                        ) : null}

                        <button 
                            onClick={() => window.location.href = '/'}
                            className="px-8 h-14 bg-white/5 border border-white/5 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 transition-all w-full"
                        >
                            Return to Safe Zone
                        </button>
                    </div>
                    
                    <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.4em]">
                        {user?.role === 'pending' ? 'Request Persistence Active' : 'Access Attempt Logged'}
                    </p>
                </motion.div>
            </div>
        );
    }

    return children;
};

export default AdminGuard;
