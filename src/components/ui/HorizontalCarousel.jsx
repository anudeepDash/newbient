import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function HorizontalCarousel({ children, className, autoScroll = false, autoScrollInterval = 3000 }) {
    const scrollRef = useRef(null);
    const scrollDirRef = useRef('right');
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

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

    useEffect(() => {
        if (!autoScroll) return;
        
        const interval = setInterval(() => {
            if (isHovered) return;
            
            if (scrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
                
                if (scrollWidth <= clientWidth) return; // No scrolling needed
                
                if (scrollLeft >= scrollWidth - clientWidth - 10) {
                    scrollDirRef.current = 'left';
                } else if (scrollLeft <= 10) {
                    scrollDirRef.current = 'right';
                }
                
                const scrollAmount = clientWidth * 0.8;
                scrollRef.current.scrollBy({
                    left: scrollDirRef.current === 'left' ? -scrollAmount : scrollAmount,
                    behavior: 'smooth'
                });
                
                setTimeout(checkScroll, 300);
            }
        }, autoScrollInterval);

        return () => clearInterval(interval);
    }, [autoScroll, autoScrollInterval, isHovered]);

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
        <div 
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => {
                setTimeout(() => setIsHovered(false), 2000); // Resume auto-scroll after a short delay
            }}
        >
            {/* Left Nav Button */}
            {canScrollLeft && (
                <button
                    type="button"
                    onClick={() => scroll('left')}
                    className="absolute left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-black/90 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity hover:scale-105"
                    aria-label="Scroll left"
                >
                    <ChevronLeft size={20} />
                </button>
            )}

            {/* Right Nav Button */}
            {canScrollRight && (
                <button
                    type="button"
                    onClick={() => scroll('right')}
                    className="absolute right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-black/90 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity hover:scale-105"
                    aria-label="Scroll right"
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
