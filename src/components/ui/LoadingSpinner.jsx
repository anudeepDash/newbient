import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = "md", color = "#2bd93e", className = "" }) => {
    const sizeMap = {
        sm: { box: "w-8 h-8", text: "text-[10px]", blur: "inset-[-8px]", blurRadius: "blur-md" },
        md: { box: "w-16 h-16", text: "text-lg", blur: "inset-[-12px]", blurRadius: "blur-xl" },
        lg: { box: "w-24 h-24", text: "text-2xl", blur: "inset-[-20px]", blurRadius: "blur-2xl" }
    };

    const s = sizeMap[size] || sizeMap.md;

    return (
        <div className={`relative flex flex-col items-center justify-center ${className}`}>
            <div className="relative">
                {/* Outer Glow */}
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute ${s.blur} rounded-[1.5rem] ${s.blurRadius}`}
                    style={{ backgroundColor: color }}
                />
                
                {/* The Logo Box */}
                <motion.div
                    animate={{ 
                        scale: [0.98, 1.02, 0.98],
                        rotate: [0, 5, 0, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={`${s.box} rounded-[1rem] flex items-center justify-center shadow-2xl relative z-10`}
                    style={{ backgroundColor: color }}
                >

                </motion.div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
