import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Award } from 'lucide-react';
import { cn } from '../../lib/utils';

const DocumentSeal = ({ type = 'proposal', date = new Date(), className }) => {
    const isAgreement = type === 'agreement';
    // Switch to formal colors: Deep Red/Wax for Agreements, Professional Navy/Gold for Proposals
    const sealColor = isAgreement ? '#1a1a1a' : '#1a1a1a'; // Unified formal black/dark gray
    
    return (
        <motion.div 
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn("relative w-32 h-32 flex items-center justify-center select-none print:opacity-100", className)}
        >
            {/* Formal Outer Border */}
            <div className="absolute inset-0 rounded-full border-[1px] border-black opacity-20 scale-[0.98]" />
            <div className="absolute inset-0 rounded-full border-[3px] border-black opacity-10" />
            
            {/* SVG for Circular Text */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <path
                    id="sealPath"
                    d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
                    fill="none"
                />
                <text className="text-[5.5px] font-black uppercase tracking-[0.3em]" fill="#000000">
                    <textPath href="#sealPath">
                        * NEWBI ENTERTAINMENT * AUTHORIZATION & EXECUTION * CORPORATE SEAL *
                    </textPath>
                </text>
            </svg>

            {/* Inner Seal Body - Traditional "Wax" or Embossed Style */}
            <div 
                className="w-20 h-20 rounded-full border-[1.5px] border-black/40 flex flex-col items-center justify-center bg-white relative shadow-sm"
            >
                {/* Decorative Inner Ring */}
                <div className="absolute inset-1 rounded-full border-[0.5px] border-black/10" />
                
                <Award size={24} className="text-black mb-1 opacity-80" />
                <span className="text-[7px] font-black uppercase tracking-widest text-black">OFFICIAL</span>
                <span className="text-[5px] font-bold text-gray-500 mt-0.5">
                    EST. 2024
                </span>

                {/* Date Marker */}
                <div className="absolute -bottom-2 px-2 bg-white border border-black/20 text-[5px] font-bold uppercase tracking-tighter">
                    {new Date(date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </div>
            </div>

            {/* Sublte Emboss/Shadow Effect for Formality */}
            <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] pointer-events-none" />
        </motion.div>
    );
};

export default DocumentSeal;
