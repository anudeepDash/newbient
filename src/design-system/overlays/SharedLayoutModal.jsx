import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const SharedLayoutModal = ({ 
    isOpen, 
    onClose, 
    layoutId, 
    children, 
    className,
    contentClassName,
    hideCloseButton = false
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

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
                    {/* Backdrop — liquid glass blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-2xl z-0"
                        style={{ WebkitBackdropFilter: 'saturate(180%) blur(40px)' }}
                    />

                    {/* Modal Content — frosted glass shell */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ 
                            duration: 0.3,
                            ease: [0.32, 0.72, 0, 1]
                        }}
                        className={cn(
                            "relative z-10 w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-3xl overflow-hidden",
                            "bg-white/95 dark:bg-[#0c0e14]/80 backdrop-blur-3xl border border-black/10 dark:border-white/[0.12]",
                            "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_-10px_rgba(0,0,0,0.5),0_0_100px_-20px_rgba(57,255,20,0.05)]",
                            className
                        )}
                    >
                        {/* Top glass highlight */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-20 pointer-events-none" />

                        {/* Close Button */}
                        {!hideCloseButton && (
                            <div className="absolute top-4 right-4 z-50">
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/[0.08] backdrop-blur-xl hover:bg-black/10 dark:hover:bg-white/[0.15] text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer border border-black/10 dark:border-white/[0.06]"
                                >
                                    <X size={15} strokeWidth={2.5} />
                                </button>
                            </div>
                        )}

                        {/* Content Container */}
                        <div className={cn("flex-1 min-h-0 flex flex-col overflow-hidden", contentClassName)}>
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default SharedLayoutModal;
