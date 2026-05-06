import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const StudioSelect = ({ 
    value, 
    onChange, 
    options = [], 
    placeholder = "SELECT OPTION", 
    className,
    multi = false,
    accentColor = "neon-blue" 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        if (multi) {
            const currentValues = Array.isArray(value) ? value : [];
            const isSelected = currentValues.includes(optionValue);
            if (isSelected) {
                onChange(currentValues.filter(v => v !== optionValue));
            } else {
                onChange([...currentValues, optionValue]);
            }
        } else {
            onChange(optionValue);
            setIsOpen(false);
        }
    };

    const getDisplayLabel = () => {
        if (multi) {
            const currentValues = Array.isArray(value) ? value : [];
            if (currentValues.length === 0) return placeholder;
            if (currentValues.length === 1) {
                const opt = options.find(o => o.value === currentValues[0]);
                return opt ? opt.label : currentValues[0];
            }
            return `${currentValues.length} SELECTED`;
        } else {
            const opt = options.find(o => o.value === value);
            return opt ? opt.label : (value || placeholder);
        }
    };

    const isSelected = (optionValue) => {
        if (multi) {
            return Array.isArray(value) && value.includes(optionValue);
        }
        return value === optionValue;
    };

    const accentClasses = {
        'neon-blue': 'text-neon-blue border-neon-blue/20 bg-neon-blue/10',
        'neon-pink': 'text-neon-pink border-neon-pink/20 bg-neon-pink/10',
        'neon-green': 'text-neon-green border-neon-green/20 bg-neon-green/10',
    };

    const hoverAccentClasses = {
        'neon-blue': 'hover:bg-neon-blue hover:text-black',
        'neon-pink': 'hover:bg-neon-pink hover:text-black',
        'neon-green': 'hover:bg-neon-green hover:text-black',
    };

    const activeAccentClasses = {
        'neon-blue': 'bg-neon-blue text-black',
        'neon-pink': 'bg-neon-pink text-black',
        'neon-green': 'bg-neon-green text-black',
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between h-full bg-black/60 border border-white/10 rounded-xl px-4 cursor-pointer hover:border-white/20 transition-all group shadow-inner",
                    isOpen && "border-white/20"
                )}
            >
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-[0.15em] truncate leading-none",
                        (!value || (multi && value.length === 0)) ? "text-white/30" : "text-white italic"
                    )}>
                        {getDisplayLabel()}
                    </span>
                </div>
                <ChevronDown 
                    size={14} 
                    className={cn(
                        "transition-all duration-300 shrink-0 ml-2", 
                        isOpen ? cn("rotate-180", `text-${accentColor}`) : "text-white/30 group-hover:text-white/50"
                    )} 
                />
            </div>


            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-[100] top-full mt-3 left-0 w-full bg-[#0a0a0a]/95 backdrop-blur-[64px] border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden"
                    >
                        <div className="max-h-[300px] overflow-y-auto py-2 custom-scrollbar">
                            {options.map((option) => {
                                const active = isSelected(option.value);
                                return (
                                    <div 
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            "px-6 py-4 text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-between",
                                            active ? activeAccentClasses[accentColor] : "text-gray-500",
                                            !active && hoverAccentClasses[accentColor]
                                        )}
                                    >
                                        <span className={cn(active ? "italic" : "")}>{option.label}</span>
                                        {active && <Check size={14} />}
                                    </div>
                                );
                            })}
                            {options.length === 0 && (
                                <div className="px-6 py-8 text-[9px] font-black uppercase tracking-[0.3em] text-gray-700 text-center">
                                    No Options Available
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudioSelect;
