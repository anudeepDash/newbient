import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, eachDayOfInterval, isToday } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const StudioDatePicker = ({ value, onChange, placeholder = "SELECT DATE", className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
    const containerRef = useRef(null);

    const handleDateClick = (day) => {
        onChange(format(day, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedDate = value ? new Date(value) : null;

    const renderHeader = () => (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white">
                <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">
                {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white">
                <ChevronRight size={16} />
            </button>
        </div>
    );

    const renderDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="grid grid-cols-7 mb-2">
                {days.map(day => (
                    <div key={day} className="text-center text-[8px] font-black uppercase text-gray-600 tracking-widest py-2">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="grid grid-cols-7 gap-1 p-2">
                {calendarDays.map((day, i) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    
                    return (
                        <button
                            key={i}
                            onClick={() => handleDateClick(day)}
                            className={cn(
                                "h-10 w-full rounded-xl flex items-center justify-center text-[10px] font-bold transition-all relative group",
                                !isCurrentMonth ? "text-gray-700 opacity-30" : "text-gray-300 hover:bg-white/10 hover:text-white",
                                isSelected && "bg-neon-pink text-black font-black shadow-[0_0_15px_rgba(255,79,139,0.3)] hover:bg-neon-pink hover:text-black",
                                isToday(day) && !isSelected && "border border-neon-pink/30 text-neon-pink"
                            )}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between h-full bg-black/40 border border-white/5 rounded-xl px-6 cursor-pointer hover:border-white/20 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <CalendarIcon size={16} className={cn("transition-colors", isOpen ? "text-neon-pink" : "text-white/20 group-hover:text-white/40")} />
                    <span className={cn("text-[11px] font-black uppercase tracking-widest", !value ? "text-white/20" : "text-white italic")}>
                        {value ? format(selectedDate, 'dd-MM-yyyy') : placeholder}
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-[100] top-full mt-3 left-0 w-[300px] bg-black/95 backdrop-blur-[64px] border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden"
                    >
                        {renderHeader()}
                        <div className="p-4">
                            {renderDays()}
                            {renderCells()}
                        </div>
                        <div className="p-4 bg-white/5 flex justify-center">
                            <button 
                                onClick={() => handleDateClick(new Date())}
                                className="text-[8px] font-black uppercase tracking-[0.3em] text-neon-pink hover:underline"
                            >
                                Jump to Today
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudioDatePicker;
