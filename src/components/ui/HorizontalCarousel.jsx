import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function HorizontalCarousel({ children, className, autoScroll = false, autoScrollInterval = 3000 }) {
    const scrollRef = useRef(null);
    const scrollDirRef = useRef('right');
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const isTouchingRef = useRef(false);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 5);
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
        
        // On touch screens (iPhone Safari), do not auto-scroll to avoid interrupting user gesture & reading
        const isTouch = typeof window !== 'undefined' && 
            (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
        if (isTouch) return;
        
        const interval = setInterval(() => {
            if (isHovered || isTouchingRef.current) return;
            
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
                
                setTimeout(checkScroll, 350);
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
            setTimeout(checkScroll, 350);
        }
    };

    return (
        <div 
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => {
                isTouchingRef.current = true;
                setIsHovered(true);
            }}
            onTouchEnd={() => {
                isTouchingRef.current = false;
                setTimeout(() => setIsHovered(false), 2000);
            }}
        >
            {/* Left Nav Button - Desktop fine pointers only */}
            {canScrollLeft && (
                <button
                    type="button"
                    onClick={() => scroll('left')}
                    className="hidden md:flex absolute left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-black/90 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity hover:scale-105 active:scale-95"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    aria-label="Scroll left"
                >
                    <ChevronLeft size={20} />
                </button>
            )}

            {/* Right Nav Button - Desktop fine pointers only */}
            {canScrollRight && (
                <button
                    type="button"
                    onClick={() => scroll('right')}
                    className="hidden md:flex absolute right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-black/90 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity hover:scale-105 active:scale-95"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    aria-label="Scroll right"
                >
                    <ChevronRight size={20} />
                </button>
            )}

            {/* Scroll Container with native iOS Safari momentum scrolling and vertical passthrough */}
            <div
                ref={scrollRef}
                onScroll={checkScroll}
                className={cn(
                    "flex overflow-x-auto snap-x snap-mandatory carousel-scrollbar",
                    className
                )}
                style={{
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y',
                    overscrollBehaviorX: 'contain',
                    scrollPaddingLeft: '1.25rem',
                    scrollPaddingInlineStart: '1.25rem'
                }}
            >
                {children}
            </div>
        </div>
    );
}
