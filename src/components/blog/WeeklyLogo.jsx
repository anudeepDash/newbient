import React from 'react';
import { motion } from 'framer-motion';

const WeeklyLogo = ({ className = "" }) => {
    return (
        <div className={`relative flex flex-col items-stretch w-fit ${className} group`}>
            {/* Animated Glow Backer */}
            <div className="absolute -inset-4 bg-neon-blue/20 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative flex flex-col leading-none">
                {/* Main Logo Text with Offset Glow */}
                <div className="relative flex justify-between w-full">
                    <div className="absolute inset-0 flex justify-between text-neon-blue blur-[4px] opacity-20 select-none font-black italic tracking-tighter text-3xl md:text-6xl">
                        {"WEEKLY".split("").map((char, i) => (
                            <span key={i}>{char}</span>
                        ))}
                    </div>
                    <div className="relative flex justify-between w-full text-white font-black uppercase italic text-3xl md:text-6xl leading-[0.8]">
                        {"WEEKLY".split("").map((char, i) => (
                            <span key={i}>{char}</span>
                        ))}
                    </div>
                </div>

                {/* Styled Subtitle */}
                <div className="mt-2 md:mt-4 flex items-center gap-2 md:gap-4">
                    <div className="h-[2px] w-6 md:w-12 bg-gradient-to-r from-neon-blue to-transparent rounded-full" />
                    <span className="text-[8px] md:text-xs font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-white/30 italic whitespace-nowrap">
                        BY CONCERT ZONE<span className="text-neon-blue">.</span>
                    </span>
                </div>
            </div>

            {/* Neural Spark Detail */}
            <motion.div 
                animate={{ 
                    opacity: [0.2, 0.5, 0.2],
                    scale: [1, 1.2, 1]
                }}
                transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute -top-2 -right-4 w-1 h-1 bg-neon-blue rounded-full shadow-[0_0_10px_#00ffff]"
            />
        </div>
    );
};

export default WeeklyLogo;
