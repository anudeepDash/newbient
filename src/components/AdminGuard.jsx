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
                    <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] border border-red-500/20 flex items-center justify-center mx-auto mb-8">
                        <ShieldAlert className="text-red-500" size={48} />
                    </div>
                    
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black font-heading text-white uppercase italic tracking-tighter">ACCESS DENIED.</h1>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                            Your credentials do not have the required authority to access the <span className="text-neon-green">Newbi Command Centre</span>.
                        </p>
                    </div>

                    <div className="pt-8">
                        <button 
                            onClick={() => window.location.href = '/'}
                            className="px-8 h-14 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all w-full"
                        >
                            Return to Safe Zone
                        </button>
                    </div>
                    
                    <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.4em]">Unauthorized Access Attempt Logged</p>
                </motion.div>
            </div>
        );
    }

    return children;
};

export default AdminGuard;
