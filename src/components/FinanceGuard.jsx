import React from 'react';
import { useStore } from '../lib/store';
import { ShieldAlert, IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';

const FinanceGuard = ({ children }) => {
    const { user } = useStore();

    if (user?.role === 'developer' || user?.role === 'founder') {
        return children;
    }

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
                    <IndianRupee className="text-red-500" size={48} />
                </div>
                
                <div className="space-y-4">
                    <h1 className="text-4xl font-black font-heading text-white uppercase italic tracking-tighter">FINANCE ACCESS DENIED.</h1>
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                        Your admin credentials do not have the clearance level required to view the <span className="text-neon-green">Newbi Finance Dashboard</span>.
                    </p>
                </div>

                <div className="pt-8 space-y-4">
                    <button 
                        onClick={() => window.location.href = '/admin'}
                        className="px-8 h-14 bg-white/5 border border-white/5 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 transition-all w-full"
                    >
                        Return to Admin Command Center
                    </button>
                </div>
                
                <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.4em]">
                    Access Attempt Logged
                </p>
            </motion.div>
        </div>
    );
};

export default FinanceGuard;
