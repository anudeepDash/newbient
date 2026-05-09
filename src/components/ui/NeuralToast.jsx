import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X, ShieldAlert } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';

const NeuralToast = () => {
    const { toasts, removeToast } = useStore();

    return (
        <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className={cn(
                            "pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-[20px] shadow-2xl min-w-[320px] max-w-[420px] border backdrop-blur-xl",
                            toast.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500" : 
                            toast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                            "bg-neon-blue/10 border-neon-blue/20 text-neon-blue"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            toast.type === 'error' ? "bg-red-500/20" : 
                            toast.type === 'success' ? "bg-emerald-500/20" :
                            "bg-neon-blue/20"
                        )}>
                            {toast.type === 'error' ? <ShieldAlert size={20} /> : 
                             toast.type === 'success' ? <CheckCircle size={20} /> :
                             <Info size={20} />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 opacity-50 flex items-center gap-2">
                                {toast.type === 'error' ? "System Error" : 
                                 toast.type === 'success' ? "Operation Success" :
                                 "System Notification"}
                                {toast.code && <span className="px-1.5 py-0.5 bg-white/10 rounded-md text-[8px] font-black">{toast.code}</span>}
                            </p>
                            <p className="text-[13px] font-bold leading-tight">{toast.message}</p>
                        </div>

                        <button 
                            onClick={() => removeToast(toast.id)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors opacity-50 hover:opacity-100"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default NeuralToast;
