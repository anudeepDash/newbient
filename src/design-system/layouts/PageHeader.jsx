import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { ChevronRight } from 'lucide-react';

export const PageHeader = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    breadcrumbs = [], 
    actions,
    className 
}) => {
    return (
        <div className={cn("relative mb-8", className)}>
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-zinc-500 mb-3">
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            <span className={cn(
                                "transition-colors",
                                crumb.active ? "text-gray-900 dark:text-white" : "hover:text-gray-700 dark:hover:text-zinc-300 cursor-pointer"
                            )} onClick={crumb.onClick}>
                                {crumb.label}
                            </span>
                            {index < breadcrumbs.length - 1 && <ChevronRight size={12} className="opacity-50" />}
                        </React.Fragment>
                    ))}
                </nav>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    {Icon && (
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#0c0e14] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-center justify-center shrink-0">
                            <Icon className="text-gray-900 dark:text-white" size={24} strokeWidth={1.5} />
                        </div>
                    )}
                    <div>
                        <motion.h1 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight"
                        >
                            {title}
                        </motion.h1>
                        {subtitle && (
                            <motion.p 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                className="text-sm font-semibold text-gray-500 dark:text-zinc-400 mt-0.5"
                            >
                                {subtitle}
                            </motion.p>
                        )}
                    </div>
                </div>

                {actions && (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 shrink-0"
                    >
                        {actions}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default PageHeader;
