import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function HorizontalCarousel({ children, className }) {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [children]);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const scrollAmount = scrollRef.current.clientWidth * 0.8;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            // Update state slightly after scroll starts to prevent flickering
            setTimeout(checkScroll, 300);
        }
    };

    return (
        <div className="relative group">
            {/* Left Nav Button */}
            {canScrollLeft && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-black/90 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                >
                    <ChevronLeft size={20} />
                </button>
            )}

            {/* Right Nav Button */}
            {canScrollRight && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-black/90 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                >
                    <ChevronRight size={20} />
                </button>
            )}

            {/* Scroll Container */}
            <div
                ref={scrollRef}
                onScroll={checkScroll}
                className={cn(
                    "flex overflow-x-auto snap-x snap-mandatory carousel-scrollbar",
                    className
                )}
            >
                {children}
            </div>
        </div>
    );
}
