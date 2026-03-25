import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { ArrowRight, Zap, ChevronLeft, ChevronRight, Share2, Clock } from 'lucide-react';

const Portfolio = () => {
    const { portfolio, portfolioCategories } = useStore();
    const carouselRef = useRef(null);
    const scroll = (direction) => {
        if (carouselRef.current) {
            const scrollAmount = direction === 'left' ? -400 : 400;
            carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const categories = portfolioCategories.length > 0 ? portfolioCategories : [];
    const [activeTab, setActiveTab] = useState(categories.length > 0 ? categories[0].id : '');
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    useEffect(() => {
        if (!activeTab && categories.length > 0) {
            setActiveTab(categories[0].id);
        }
    }, [categories, activeTab]);

    useEffect(() => {
        if (!isAutoPlaying || categories.length <= 1) return;
        const interval = setInterval(() => {
            setActiveTab(prev => {
                const currentIndex = categories.findIndex(c => c.id === prev);
                const nextIndex = (currentIndex + 1) % categories.length;
                return categories[nextIndex].id;
            });
        }, 8000);
        return () => clearInterval(interval);
    }, [isAutoPlaying, categories]);

    const filteredItems = portfolio.filter(item => item.category === activeTab);

    return (
        <section className="py-16 md:py-32 bg-[#020202] text-white relative overflow-hidden border-t border-white/5"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
        >
            {/* Background Atmosphere */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-green/5 blur-[150px] rounded-full pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-24 gap-8 md:gap-12">
                    <div className="max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6"
                        >
                            <Zap size={14} className="text-neon-green" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-neon-green">Portfolio Archive</span>
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="font-heading text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter"
                        >
                            OUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-white to-neon-blue">IMPACT.</span>
                        </motion.h2>
                    </div>

                    {/* Tabs with selection bar */}
                    <div className="inline-flex overflow-x-auto whitespace-nowrap snap-x gap-2 md:gap-4 p-2 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-3xl w-full md:w-auto max-w-full horizontal-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setActiveTab(cat.id);
                                    setIsAutoPlaying(false);
                                }}
                                className={`snap-center px-8 py-3 md:px-10 md:py-3 rounded-[1rem] md:rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-500 relative overflow-hidden flex-shrink-0 ${activeTab === cat.id
                                    ? 'text-black bg-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className="relative z-10">{cat.label}</span>
                                {activeTab === cat.id && isAutoPlaying && (
                                    <motion.div
                                        className="absolute bottom-0 left-0 h-[3px] bg-neon-green"
                                        initial={{ width: "0%" }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 8, ease: "linear" }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Carousel Container */}
                <div className="relative group/carousel">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ duration: 0.6 }}
                            className="relative group/nav"
                        >
                            {/* Navigation Arrows - Using group to show on hover */}
                            {activeTab === 'concerts' && filteredItems.length > 2 && (
                                <div className="hidden lg:block">
                                    <button 
                                        onClick={() => scroll('left')}
                                        className="absolute -left-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all z-30 backdrop-blur-md opacity-0 group-hover/nav:opacity-100 -translate-x-4 group-hover/nav:translate-x-0"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button 
                                        onClick={() => scroll('right')}
                                        className="absolute -right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all z-30 backdrop-blur-md opacity-0 group-hover/nav:opacity-100 translate-x-4 group-hover/nav:translate-x-0"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}

                            <div
                                ref={carouselRef}
                                className="flex flex-row overflow-x-auto gap-6 md:gap-10 pb-10 md:pb-20 horizontal-scrollbar snap-x snap-mandatory scroll-smooth px-8 md:px-0"
                                style={{ scrollbarWidth: 'auto', msOverflowStyle: 'auto' }}
                            >
                                {filteredItems.map((item) => (
                                    <PortfolioCard key={item.id} item={item} categories={categories} />
                                ))}

                                {filteredItems.length === 0 && (
                                    <div className="w-full text-center py-40 flex flex-col items-center gap-6 bg-white/[0.02] rounded-[4rem] border border-dashed border-white/10 mx-4">
                                        <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-gray-700 animate-pulse">
                                            <Zap size={24} />
                                        </div>
                                        <p className="text-gray-600 font-black font-heading uppercase tracking-widest text-[10px]">Awaiting Data Deployment...</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                </div>
            </div>
        </section>
    );
};

const PortfolioCard = ({ item, categories }) => {
    return (
        <div className="w-[320px] md:w-[380px] aspect-[4/5] relative rounded-3xl md:rounded-[3rem] overflow-hidden group border border-white/5 bg-black md:snap-start transition-all duration-700 hover:border-white/20 shadow-2xl flex-shrink-0">
            {/* Visual Perforation (Premium Ticket Style) */}
            <div className="absolute top-[65%] -left-4 w-8 h-8 bg-black rounded-full border border-white/5 z-20" />
            <div className="absolute top-[65%] -right-4 w-8 h-8 bg-black rounded-full border border-white/5 z-20" />
            <div className="absolute top-[66.5%] left-4 right-4 h-px border-t border-dashed border-white/20 z-10" />

            {/* Full Image Background */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                {item.image ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500"
                        style={{ 
                            backgroundImage: `url(${item.image})`,
                            transform: `scale(${item.imageTransform?.scale || 1}) translate(${(item.imageTransform?.x || 0)}%, ${(item.imageTransform?.y || 0)}%)`,
                            transformOrigin: 'center'
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-800 font-bold uppercase tracking-widest text-[10px]">
                        NO VISUAL ASSET
                    </div>
                )}
                {/* Premium Gradient Overlay - Compact deep black at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black from-[0%] via-black/90 via-[30%] to-transparent to-[55%] z-10" />
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-px bg-neon-green" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-neon-green">
                            {categories.find(c => c.id === item.category)?.label || 'General'}
                        </span>
                    </div>

                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight mb-2 line-clamp-2 italic uppercase">
                            {item.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <Clock size={12} className="text-neon-blue" />
                            {item.date?.split('-')[0] || 'PAST'}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        {item.highlightUrl ? (
                             <a
                                href={item.highlightUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white font-black tracking-widest flex items-center gap-2 hover:text-neon-green transition-all group/link"
                            >
                                <span className="text-[10px] uppercase">VIEW REEL</span>
                                <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                            </a>
                        ) : (
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">ARCHIVED RECORD</span>
                        )}

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleShare(e, item);
                            }}
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all z-30"
                        >
                            <Share2 size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Premium Interaction Layer */}
            <div className="absolute inset-0 bg-neon-green/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
        </div>
    );
};

export default Portfolio;
