import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const LoadingScreen = ({ isVisible }) => {
    const location = useLocation();
    const path = location.pathname;

    // Remove loading animation from home page as requested
    if (path === '/') return null;

    // Minimalist brand-focused animation system
    const getThemeColor = () => {
        if (path.startsWith('/community')) return { color: '#2ebfff', text: 'NB', bg: 'bg-[#2ebfff]' };
        if (path.startsWith('/creator')) return { color: '#FF4F8B', text: 'NB', bg: 'bg-[#FF4F8B]' };
        if (path.startsWith('/admin')) return { color: '#2bd93e', text: 'NB', bg: 'bg-[#2bd93e]' };
        return { color: '#2bd93e', text: 'NB', bg: 'bg-[#2bd93e]' };
    };

    const theme = getThemeColor();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
                >
                    <div className="relative flex flex-col items-center gap-8">
                        {/* Favicon-inspired Logo Animation */}
                        <div className="relative">
                            {/* Outer Glow */}
                            <motion.div 
                                animate={{ 
                                    scale: [1, 1.4, 1],
                                    opacity: [0.1, 0.3, 0.1]
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className={`absolute inset-[-20px] rounded-[2.5rem] blur-2xl ${theme.bg}`}
                            />
                            
                            {/* The Logo Box */}
                            <motion.div
                                animate={{ 
                                    scale: [0.98, 1.02, 0.98],
                                    rotate: [0, 5, 0, -5, 0]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className={`w-24 h-24 ${theme.bg} rounded-[1.5rem] flex items-center justify-center shadow-2xl relative z-10`}
                            >
                                <span className="text-4xl font-black text-white tracking-tighter italic select-none">NB</span>
                            </motion.div>
                        </div>

                        {/* Status Text removed as requested */}
                    </div>

                    {/* Minimalist Grid Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                         style={{ 
                             backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
                             backgroundSize: '100px 100px' 
                         }} />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoadingScreen;
