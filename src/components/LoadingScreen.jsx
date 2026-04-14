import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const LoadingScreen = ({ isVisible }) => {
    const location = useLocation();
    const path = location.pathname;
    const [statusIndex, setStatusIndex] = useState(0);

    const states = {
        admin: ["INITIALIZING STUDIO...", "SYNCING WORKSPACE...", "SECURING DATA...", "AUTHENTICATING..."],
        community: ["ENTERING HUB...", "CONNECTING PEERS...", "FETCHING ACCESS...", "SYNCHRONIZING..."],
        creator: ["BOOTING DASHBOARD...", "LOADING METRICS...", "FETCHING ANALYTICS...", "READYING STUDIO..."],
        default: ["LOADING NEWBI...", "ESTABLISHING CONNECTION...", "FETCHING ASSETS...", "OPTIMIZING..."]
    };

    const currentStates = path.startsWith('/admin') ? states.admin : 
                         path.startsWith('/community') ? states.community : 
                         path.startsWith('/creator') ? states.creator : states.default;

    useEffect(() => {
        if (!isVisible) return;
        const interval = setInterval(() => {
            setStatusIndex(prev => (prev + 1) % currentStates.length);
        }, 800);
        return () => clearInterval(interval);
    }, [isVisible, currentStates]);

    const getThemeColor = () => {
        if (path.startsWith('/community')) return { color: '#2ebfff', text: 'text-neon-blue', border: 'border-neon-blue', ring: 'rgba(46, 191, 255, 0.2)' };
        if (path.startsWith('/creator')) return { color: '#FF4F8B', text: 'text-neon-pink', border: 'border-neon-pink', ring: 'rgba(255, 79, 139, 0.2)' };
        if (path.startsWith('/admin')) return { color: '#2eff90', text: 'text-neon-green', border: 'border-neon-green', ring: 'rgba(46, 255, 144, 0.2)' };
        return { color: '#ffffff', text: 'text-white', border: 'border-white', ring: 'rgba(255, 255, 255, 0.1)' };
    };

    const theme = getThemeColor();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
                >
                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none" 
                         style={{ 
                             backgroundImage: `linear-gradient(${theme.color}10 1px, transparent 1px), linear-gradient(90deg, ${theme.color}10 1px, transparent 1px)`,
                             backgroundSize: '40px 40px' 
                         }} />
                    
                    {/* Scanning Line */}
                    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                        <div className="w-full h-[15vh] bg-gradient-to-b from-transparent via-white/5 to-transparent animate-scan" style={{ boxShadow: `0 0 50px ${theme.color}10` }} />
                    </div>

                    <div className="relative flex flex-col items-center gap-12 z-20">
                        {/* THE NUCLEUS (Cyber-Core) */}
                        <div className="relative w-48 h-48 flex items-center justify-center">
                            {/* Inner Pulsing Ring */}
                            <motion.div 
                                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 border border-white/5 rounded-full" />
                            
                            {/* Outer Spinning Orbits */}
                            <motion.svg className="absolute w-full h-full rotate-45" viewBox="0 0 100 100">
                                <motion.circle 
                                    cx="50" cy="50" r="45" 
                                    stroke={theme.color} strokeWidth="0.5" fill="none" 
                                    strokeDasharray="20 150" strokeLinecap="round"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                />
                                <motion.circle 
                                    cx="50" cy="50" r="38" 
                                    stroke={theme.color} strokeWidth="1" fill="none" 
                                    strokeDasharray="40 120" strokeLinecap="round" opacity="0.5"
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                />
                                <motion.circle 
                                    cx="50" cy="50" r="30" 
                                    stroke={theme.color} strokeWidth="0.5" fill="none" 
                                    strokeDasharray="10 80" strokeLinecap="round"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                />
                            </motion.svg>

                            {/* Center Logo */}
                            <motion.div
                                animate={{ scale: [0.95, 1.05, 0.95], rotateY: [0, 180, 360] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className={`w-20 h-20 rounded-[2rem] border-2 ${theme.border} flex items-center justify-center bg-black shadow-[0_0_30px_${theme.ring}] backdrop-blur-xl preserve-3d`}
                            >
                                <span className={`text-4xl font-black font-heading ${theme.text}`}>N</span>
                            </motion.div>
                        </div>

                            {/* Slim Progress Indicator */}
                            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden relative">
                                <motion.div 
                                    className={`absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-${theme.text.split('-')[1]}-${theme.text.split('-')[2]} to-transparent w-full`}
                                    animate={{ x: ['-100%', '100%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                />
                            </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoadingScreen;
