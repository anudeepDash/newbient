import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AdminCarousel = ({ title, children }) => {
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
            const { clientWidth } = scrollRef.current;
            const scrollAmount = direction === 'left' ? -clientWidth / 2 : clientWidth / 2;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            setTimeout(checkScroll, 300); // Check after scroll animation
        }
    };

    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className={`p-2 rounded-full border transition-all ${canScrollLeft
                            ? 'border-white/20 hover:bg-white/10 text-white'
                            : 'border-white/5 text-gray-600 cursor-not-allowed'
                            }`}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className={`p-2 rounded-full border transition-all ${canScrollRight
                            ? 'border-white/20 hover:bg-white/10 text-white'
                            : 'border-white/5 text-gray-600 cursor-not-allowed'
                            }`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex gap-6 overflow-x-auto pt-4 pb-8 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {React.Children.map(children, (child) => (
                    <div className="min-w-[280px] md:min-w-[320px] snap-start">
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminCarousel;
