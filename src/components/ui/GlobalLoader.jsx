import React from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

const GlobalLoader = ({ color = "#39FF14" }) => {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
        >
            {/* Minimal Background Glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 0.15 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
                    className="w-[40%] h-[40%] rounded-full blur-[120px]"
                    style={{ backgroundColor: color }}
                />
            </div>

            {/* Spinner Section */}
            <div className="relative">
                <LoadingSpinner size="lg" color={color} />
            </div>

            {/* Subtle Horizontal Scanning Line (Very faint for texture) */}
            <motion.div 
                animate={{ top: ['-10%', '110%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[1px] opacity-10 pointer-events-none"
                style={{ background: `linear-gradient(to r, transparent, ${color}, transparent)` }}
            />
        </motion.div>
    );
};

export default GlobalLoader;
