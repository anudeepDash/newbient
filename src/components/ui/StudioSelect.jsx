import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * StudioSelect
 * Ultra-premium luxury custom dropdown component.
 * Features glassmorphism, instant search filtering for long lists,
 * smooth Framer Motion spring micro-animations, and full form compatibility.
 */
const StudioSelect = ({ 
    name,
    value, 
    onChange, 
    options = [], 
    placeholder = "Select Option", 
    className,
    multi = false,
    accentColor = "neon-blue",
    disabled = false,
    position = "bottom",
    searchable = null, // Auto-enabled if options > 6 unless explicitly false
    uppercase = false,
    size = "md", // "sm", "md", "lg"
    icon: LeadingIcon = null,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownStyles, setDropdownStyles] = useState({});
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Auto-enable search if there are more than 6 options
    const isSearchable = searchable !== null ? searchable : options.length > 6;

    // Track position for React Portal
    useEffect(() => {
        const updatePosition = () => {
            if (isOpen && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDropdownStyles({
                    position: 'fixed',
                    ...(position === 'top' 
                        ? { bottom: `${window.innerHeight - rect.top + 8}px` } 
                        : { top: `${rect.bottom + 8}px` }),
                    left: `${rect.left}px`,
                    width: `${rect.width}px`,
                    zIndex: 99999, // Ensure it's above modals and panels
                });
            }
        };

        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, position]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && isSearchable) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen, isSearchable]);

    // Normalize options format (supports array of strings or { value, label, icon, badge })
    const normalizedOptions = useMemo(() => {
        return options.map(opt => {
            if (typeof opt === 'object' && opt !== null) {
                return {
                    value: opt.value,
                    label: opt.label !== undefined ? opt.label : String(opt.value),
                    icon: opt.icon || null,
                    badge: opt.badge || null,
                    description: opt.description || null,
                };
            }
            return {
                value: opt,
                label: String(opt),
                icon: null,
                badge: null,
                description: null,
            };
        });
    }, [options]);

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return normalizedOptions;
        const query = searchQuery.toLowerCase().trim();
        return normalizedOptions.filter(opt => 
            opt.label.toLowerCase().includes(query) || 
            String(opt.value).toLowerCase().includes(query) ||
            (opt.description && opt.description.toLowerCase().includes(query))
        );
    }, [normalizedOptions, searchQuery]);

    const handleSelect = (optionValue) => {
        if (multi) {
            const currentValues = Array.isArray(value) ? value : [];
            const isSelected = currentValues.includes(optionValue);
            const nextValues = isSelected 
                ? currentValues.filter(v => v !== optionValue)
                : [...currentValues, optionValue];
            
            if (onChange) {
                if (name) {
                    onChange({ target: { name, value: nextValues } });
                } else {
                    onChange(nextValues);
                }
            }
        } else {
            if (onChange) {
                if (name) {
                    onChange({ target: { name, value: optionValue } });
                } else {
                    onChange(optionValue);
                }
            }
            setIsOpen(false);
            setSearchQuery('');
        }
    };

    const getDisplayLabel = () => {
        if (multi) {
            const currentValues = Array.isArray(value) ? value : [];
            if (currentValues.length === 0) return placeholder;
            if (currentValues.length === 1) {
                const opt = normalizedOptions.find(o => o.value === currentValues[0]);
                return opt ? opt.label : currentValues[0];
            }
            return `${currentValues.length} Selected`;
        } else {
            const opt = normalizedOptions.find(o => o.value === value);
            if (opt) return opt.label;
            if (value && value !== 'All' && value !== '') return value;
            return placeholder;
        }
    };

    const isSelected = (optionValue) => {
        if (multi) {
            return Array.isArray(value) && value.includes(optionValue);
        }
        return value === optionValue;
    };

    const isPlaceholder = (!value || (multi && (!Array.isArray(value) || value.length === 0)) || value === 'All' || value === '');

    // Accent mappings for active states and highlights
    const accentStyles = {
        'neon-blue': {
            activeItem: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25',
            hoverItem: 'hover:bg-cyan-500/10 hover:text-cyan-300',
            border: 'focus:border-cyan-400 border-cyan-500/30',
            chevron: 'text-cyan-400',
            check: 'text-cyan-400',
            searchFocus: 'focus:border-cyan-400/50',
        },
        'neon-pink': {
            activeItem: 'bg-pink-500/10 text-pink-400 border border-pink-500/25',
            hoverItem: 'hover:bg-pink-500/10 hover:text-pink-300',
            border: 'focus:border-pink-400 border-pink-500/30',
            chevron: 'text-pink-400',
            check: 'text-pink-400',
            searchFocus: 'focus:border-pink-400/50',
        },
        'neon-green': {
            activeItem: 'bg-emerald-500/15 text-emerald-600 dark:text-neon-green border border-emerald-500/30',
            hoverItem: 'hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-neon-green',
            border: 'focus:border-emerald-400 border-emerald-500/30',
            chevron: 'text-emerald-500 dark:text-neon-green',
            check: 'text-emerald-500 dark:text-neon-green',
            searchFocus: 'focus:border-emerald-400/50',
        },
        'purple': {
            activeItem: 'bg-purple-500/10 text-purple-400 border border-purple-500/25',
            hoverItem: 'hover:bg-purple-500/10 hover:text-purple-300',
            border: 'focus:border-purple-400 border-purple-500/30',
            chevron: 'text-purple-400',
            check: 'text-purple-400',
            searchFocus: 'focus:border-purple-400/50',
        },
    };

    const currentAccent = accentStyles[accentColor] || accentStyles['neon-blue'];

    const sizeClasses = {
        sm: "h-8 px-2.5 text-[10px]",
        md: "h-10 sm:h-11 px-3 sm:px-3.5 text-xs",
        lg: "h-12 px-4 text-sm",
    };

    return (
        <div className={cn("relative w-full select-none", isOpen ? "z-[70]" : "z-10", className)} ref={containerRef}>
            {/* Trigger Button */}
            <div 
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setIsOpen(!isOpen);
                    }
                }}
                className={cn(
                    "w-full flex items-center justify-between rounded-xl transition-all outline-none font-medium",
                    sizeClasses[size] || sizeClasses.md,
                    // Light mode: Clean ceramic white with hairline border
                    "bg-white text-gray-900 border border-black/10 hover:border-black/20 shadow-xs",
                    // Dark mode: Matte obsidian with subtle glassmorphism
                    "dark:bg-[#0c0e17]/80 dark:text-white dark:border-white/10 dark:hover:border-white/20 dark:shadow-inner",
                    disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                    isOpen && cn("ring-1 ring-black/10 dark:ring-white/15", currentAccent.border)
                )}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0 mr-1.5">
                    {LeadingIcon && (
                        <LeadingIcon size={14} className="shrink-0 text-gray-400 dark:text-zinc-500" />
                    )}
                    <span className={cn(
                        "truncate leading-tight block",
                        uppercase ? "uppercase tracking-wider font-bold text-[10px] sm:text-[11px]" : "text-xs font-semibold",
                        isPlaceholder ? "text-gray-400 dark:text-zinc-500 font-normal" : "text-gray-900 dark:text-white"
                    )}>
                        {getDisplayLabel()}
                    </span>
                </div>
                
                <ChevronDown 
                    size={13} 
                    className={cn(
                        "transition-transform duration-200 shrink-0", 
                        isOpen ? cn("rotate-180", currentAccent.chevron) : "text-gray-400 dark:text-zinc-500"
                    )} 
                />
            </div>

            {/* Dropdown Menu Overlay - Rendered in Portal to prevent clipping */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: position === "top" ? -8 : 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: position === "top" ? -8 : 8, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            style={dropdownStyles}
                            className={cn(
                                "shadow-2xl backdrop-blur-2xl border overflow-hidden",
                                // Light mode: Clean glassmorphic card
                                "bg-white/95 text-gray-900 border-black/10 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.15)]",
                                // Dark mode: Obsidian deep titanium
                                "dark:bg-[#0c0e17]/95 dark:text-white dark:border-white/10 dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]",
                                "rounded-2xl p-1.5"
                            )}
                        >
                        {/* Search Input for Long Option Lists */}
                        {isSearchable && (
                            <div className="p-1 mb-1 border-b border-black/5 dark:border-white/5">
                                <div className="relative flex items-center">
                                    <Search size={13} className="absolute left-2.5 text-gray-400 dark:text-zinc-500 pointer-events-none" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search options..."
                                        className={cn(
                                            "w-full h-8 pl-8 pr-7 rounded-lg text-xs outline-none transition-all",
                                            "bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/5",
                                            "text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500",
                                            currentAccent.searchFocus
                                        )}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setIsOpen(false);
                                            }
                                        }}
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSearchQuery('');
                                                searchInputRef.current?.focus();
                                            }}
                                            className="absolute right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-0.5"
                                        >
                                            <X size={11} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Options List */}
                        <div className="max-h-[260px] sm:max-h-[300px] overflow-y-auto py-0.5 custom-scrollbar flex flex-col gap-0.5">
                            {filteredOptions.map((option) => {
                                const active = isSelected(option.value);
                                const OptionIcon = option.icon;
                                return (
                                    <div 
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            "px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center justify-between gap-2",
                                            active 
                                                ? currentAccent.activeItem 
                                                : cn("text-gray-700 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]", currentAccent.hoverItem)
                                        )}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {OptionIcon && (
                                                <OptionIcon size={14} className={cn("shrink-0", active ? currentAccent.chevron : "text-gray-400 dark:text-zinc-500")} />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn("truncate block", active && "font-bold", uppercase && "uppercase text-[10px] tracking-wider")}>
                                                        {option.label}
                                                    </span>
                                                    {option.badge && (
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-black/5 dark:bg-white/10 text-gray-600 dark:text-zinc-400 shrink-0">
                                                            {option.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                {option.description && (
                                                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                                                        {option.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {active && (
                                            <Check size={14} className={cn("shrink-0", currentAccent.check)} />
                                        )}
                                    </div>
                                );
                            })}
                            
                            {filteredOptions.length === 0 && (
                                <div className="px-4 py-6 text-xs text-gray-400 dark:text-zinc-500 text-center font-medium">
                                    No options match "{searchQuery}"
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default StudioSelect;
