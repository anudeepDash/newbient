import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const DocumentSeal = ({ className }) => {
    return (
        <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }} 
            className={cn("relative w-64 h-64 flex items-center justify-center select-none print:opacity-100", className)}
        >
            <img 
                src="/official_seal.png" 
                alt="Official Seal" 
                className="w-full h-full object-contain opacity-95" 
                crossOrigin="anonymous"
            />
        </motion.div>
    );
};

export default DocumentSeal;



