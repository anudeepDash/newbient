import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const FilterSearchBar = ({ 
    searchQuery, 
    onSearchChange, 
    placeholder = "Search...", 
    filters = [], 
    activeFilter, 
    onFilterChange,
    className
}) => {
    return (
        <div className={cn("relative flex flex-col sm:flex-row gap-3 w-full", className)}>
            {/* Search Input */}
            <div className="relative flex-1 group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 group-focus-within:text-neon-green transition-colors" />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white/70 dark:bg-[#0c0e14]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-neon-green/50 dark:focus:border-neon-green/30 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                />
                <AnimatePresence>
                    {searchQuery && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-gray-500 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                        >
                            <X size={12} strokeWidth={3} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Filter Tabs / Dropdown (Mobile scrollable, Desktop inline) */}
            {filters.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar shrink-0">
                    <div className="h-12 p-1.5 flex items-center bg-white/70 dark:bg-[#0c0e14]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                        <div className="pl-3 pr-2 flex items-center text-gray-400 dark:text-zinc-500 border-r border-black/10 dark:border-white/10 shrink-0">
                            <Filter size={14} />
                        </div>
                        {filters.map(filter => {
                            const isActive = activeFilter === filter.id;
                            return (
                                <button
                                    key={filter.id}
                                    onClick={() => onFilterChange(filter.id)}
                                    className={cn(
                                        "relative px-4 h-full rounded-xl text-[13px] font-bold tracking-tight transition-all shrink-0 ml-1",
                                        isActive 
                                            ? "text-black dark:text-white" 
                                            : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="filter-active-pill"
                                            className="absolute inset-0 bg-black/5 dark:bg-white/10 rounded-xl"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10">{filter.label}</span>
                                    {filter.count !== undefined && (
                                        <span className={cn(
                                            "relative z-10 ml-1.5 px-1.5 py-0.5 rounded-md text-[10px]",
                                            isActive ? "bg-black/10 dark:bg-white/20" : "bg-black/5 dark:bg-white/5"
                                        )}>
                                            {filter.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterSearchBar;
