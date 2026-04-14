import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const StudioTimePicker = ({ value, onChange, placeholder = "SET TIME", className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Initial value processing (HH:mm)
    const [hours, setHours] = useState(value ? value.split(':')[0] : '12');
    const [minutes, setMinutes] = useState(value ? value.split(':')[1] : '00');

    useEffect(() => {
        if (value) {
            const [h, m] = value.split(':');
            setHours(h);
            setMinutes(m);
        }
    }, [value]);

    const updateTime = (newHours, newMinutes) => {
        const formattedH = newHours.toString().padStart(2, '0');
        const formattedM = newMinutes.toString().padStart(2, '0');
        onChange(`${formattedH}:${formattedM}`);
    };

    const adjustValue = (type, delta) => {
        if (type === 'hours') {
            let next = parseInt(hours) + delta;
            if (next > 23) next = 0;
            if (next < 0) next = 23;
            const h = next.toString().padStart(2, '0');
            setHours(h);
            updateTime(h, minutes);
        } else {
            let next = parseInt(minutes) + delta;
            if (next > 59) next = 0;
            if (next < 0) next = 59;
            const m = next.toString().padStart(2, '0');
            setMinutes(m);
            updateTime(hours, m);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between h-full bg-black/40 border border-white/5 rounded-xl px-6 cursor-pointer hover:border-white/20 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <Clock size={16} className={cn("transition-colors", isOpen ? "text-neon-pink" : "text-white/20 group-hover:text-white/40")} />
                    <span className={cn("text-[11px] font-black uppercase tracking-widest", !value ? "text-white/20" : "text-white italic")}>
                        {value ? `${hours}:${minutes}` : placeholder}
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-[100] top-full mt-3 left-0 w-[200px] bg-black/95 backdrop-blur-[64px] border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] p-6"
                    >
                        <div className="flex items-center justify-around">
                            {/* Hours */}
                            <div className="flex flex-col items-center gap-2">
                                <button onClick={() => adjustValue('hours', 1)} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-neon-pink transition-all">
                                    <ChevronUp size={20} />
                                </button>
                                <span className="text-3xl font-black italic tracking-tighter text-white font-heading">{hours}</span>
                                <button onClick={() => adjustValue('hours', -1)} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-neon-pink transition-all">
                                    <ChevronDown size={20} />
                                </button>
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">HOURS</span>
                            </div>

                            <div className="text-2xl font-black text-gray-700 pb-8">:</div>

                            {/* Minutes */}
                            <div className="flex flex-col items-center gap-2">
                                <button onClick={() => adjustValue('minutes', 5)} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-neon-pink transition-all">
                                    <ChevronUp size={20} />
                                </button>
                                <span className="text-3xl font-black italic tracking-tighter text-white font-heading">{minutes}</span>
                                <button onClick={() => adjustValue('minutes', -5)} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-neon-pink transition-all">
                                    <ChevronDown size={20} />
                                </button>
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">MINS</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/5 flex justify-center">
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="h-10 px-6 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-white rounded-xl transition-all"
                            >
                                Set Time
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudioTimePicker;
