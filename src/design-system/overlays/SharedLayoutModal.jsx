import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const SharedLayoutModal = ({ 
    isOpen, 
    onClose, 
    layoutId, 
    children, 
    className,
    contentClassName
}) => {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6 md:px-8">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content - Expands from layoutId */}
                    <motion.div
                        layoutId={layoutId}
                        className={cn(
                            "relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0c0e14] border border-black/10 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl",
                            className
                        )}
                        transition={{ 
                            type: "spring", 
                            damping: 25, 
                            stiffness: 250, 
                            mass: 0.8
                        }}
                    >
                        {/* Close Button - Floats top right */}
                        <div className="absolute top-4 right-4 z-50">
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ delay: 0.2 }}
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-gray-900 dark:text-white transition-colors"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </motion.button>
                        </div>

                        {/* Actual Scrollable Content */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: 0.15 }}
                            className={cn("flex-1 overflow-y-auto hide-scrollbar", contentClassName)}
                        >
                            {children}
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SharedLayoutModal;
