import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const LoadingScreen = ({ isVisible }) => {
    const location = useLocation();
    const path = location.pathname;

    // Determine theme color based on path
    const getThemeColor = () => {
        if (path.startsWith('/community')) return 'text-neon-blue border-neon-blue';
        if (path.startsWith('/creator')) return 'text-neon-pink border-neon-pink';
        if (path.startsWith('/concertzone')) return 'text-purple-500 border-purple-500';
        if (path.startsWith('/admin')) return 'text-neon-green border-neon-green';
        return 'text-white border-white';
    };

    const getGlowColor = () => {
        if (path.startsWith('/community')) return 'bg-neon-blue/20';
        if (path.startsWith('/creator')) return 'bg-neon-pink/20';
        if (path.startsWith('/concertzone')) return 'bg-purple-500/20';
        if (path.startsWith('/admin')) return 'bg-neon-green/20';
        return 'bg-white/10';
    };

    const themeClass = getThemeColor();
    const glowClass = getGlowColor();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
                >
                    {/* Background Glows */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] ${glowClass} rounded-full blur-[100px] animate-pulse`} />
                    </div>

                    <div className="relative flex flex-col items-center gap-8">
                        {/* Animated Logo / Icon Placeholder */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ 
                                duration: 0.5,
                                repeat: Infinity,
                                repeatType: "reverse"
                            }}
                            className={`w-24 h-24 rounded-3xl border-2 ${themeClass} flex items-center justify-center backdrop-blur-xl bg-white/5 shadow-[0_0_50px_rgba(255,255,255,0.05)]`}
                        >
                            <span className={`text-4xl font-black font-heading ${themeClass.split(' ')[0]}`}>N</span>
                        </motion.div>

                        {/* Loading Text */}
                        <div className="flex flex-col items-center gap-2">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className={`h-[2px] ${themeClass.split(' ')[1] || 'bg-white'} rounded-full`}
                                style={{ width: '120px' }}
                            />
                            <motion.span 
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="text-[10px] font-black uppercase tracking-[0.5em] text-white/60 ml-2"
                            >
                                Initializing Pulse
                            </motion.span>
                        </div>
                    </div>

                    {/* Corner Tech Accents */}
                    <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-white/5 rounded-tl-3xl" />
                    <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-white/5 rounded-br-3xl" />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoadingScreen;
