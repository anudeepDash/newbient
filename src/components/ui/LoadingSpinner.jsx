import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = "md", color = "#39FF14" }) => {
    const sizeMap = {
        xs: "h-4 w-4 border-[1.5px]",
        sm: "h-6 w-6 border-2",
        md: "h-10 w-10 border-[3px]",
        lg: "h-16 w-16 border-[4px]",
        xl: "h-24 w-24 border-[5px]"
    };

    return (
        <div className="relative flex items-center justify-center">
            {/* Main Minimalistic Ring */}
            <motion.div
                className={`${sizeMap[size]} rounded-full border-t-transparent border-r-transparent`}
                style={{ borderColor: color }}
                animate={{ rotate: 360 }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
            
            {/* Subtle Static Background Ring */}
            <div 
                className={`${sizeMap[size]} absolute rounded-full opacity-10`}
                style={{ borderColor: color }}
            />

            {/* Soft Glow */}
            <div 
                className="absolute inset-0 blur-xl opacity-20 rounded-full"
                style={{ backgroundColor: color }}
            />
        </div>
    );
};

export default LoadingSpinner;
