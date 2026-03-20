import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { ArrowRight, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

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
        <section className="py-16 md:py-40 bg-[#020202] text-white relative overflow-hidden border-t border-white/5"
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
                    <div className="inline-flex overflow-x-auto whitespace-nowrap snap-x gap-2 md:gap-4 p-2 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-3xl w-full md:w-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                            className="relative"
                        >
                            <div
                                ref={carouselRef}
                                className="flex flex-row overflow-x-auto gap-6 md:gap-10 pb-10 md:pb-20 portfolio-scrollbar snap-x snap-mandatory scroll-smooth px-4 md:px-0"
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

                    {/* Nav Buttons */}
                    {activeTab === 'concerts' && filteredItems.length > 2 && (
                        <div className="absolute top-1/2 -translate-y-1/2 w-full left-0 flex justify-between pointer-events-none z-30 px-6">
                            <button
                                onClick={() => scroll('left')}
                                className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-3xl border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all pointer-events-auto opacity-0 group-hover/carousel:opacity-100 -translate-x-12 group-hover/carousel:translate-x-0"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={() => scroll('right')}
                                className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-3xl border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all pointer-events-auto opacity-0 group-hover/carousel:opacity-100 translate-x-12 group-hover/carousel:translate-x-0"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

const PortfolioCard = ({ item, categories }) => {
    return (
        <div className="w-full md:w-auto md:min-w-[380px] aspect-[4/5] relative rounded-[3rem] md:rounded-[3.5rem] overflow-hidden group border border-white/5 bg-zinc-900 md:snap-start transition-all duration-700 hover:border-white/20 shadow-2xl flex-shrink-0">
            {/* Visual Perforation (Premium Ticket Style) */}
            <div className="absolute top-[70%] -left-4 w-8 h-8 bg-[#020202] rounded-full border border-white/5 z-20 group-hover:scale-110 transition-transform" />
            <div className="absolute top-[70%] -right-4 w-8 h-8 bg-[#020202] rounded-full border border-white/5 z-20 group-hover:scale-110 transition-transform" />
            <div className="absolute top-[71.5%] left-6 right-6 h-px border-t border-dashed border-white/10 z-10" />

            {/* High-fidelity Background Image */}
            {item.image ? (
                <div
                    className="absolute inset-0 bg-cover bg-[center_top] md:bg-center transition-transform duration-1000 group-hover:scale-110"
                    style={{ backgroundImage: `url(${item.image})` }}
                >
                    {/* Organic Vignette Gradient Overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(2,2,2,0.4)_50%,_rgba(2,2,2,0.95)_95%)]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent opacity-80" />
                </div>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-gray-500 font-black uppercase tracking-[0.5em] text-[10px]">
                    NO VISUAL ASSET
                </div>
            )}

            {/* Content Layer */}
            <div className="absolute inset-0 p-12 flex flex-col justify-end z-10">
                <div className="overflow-hidden">
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        className="flex flex-col"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-8 h-px bg-neon-green" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neon-green">
                                {categories.find(c => c.id === item.category)?.label}
                            </span>
                        </div>
                        <h3 className="text-2xl md:text-4xl font-black text-white leading-[0.95] tracking-tighter group-hover:translate-x-3 transition-transform duration-700 whitespace-nowrap overflow-hidden text-ellipsis">
                            {item.title}
                        </h3>
                    </motion.div>
                </div>
            </div>

            {/* Premium Interaction Layer */}
            <div className="absolute inset-0 bg-neon-green/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
            
            <div className="absolute top-4 right-4 md:top-12 md:right-12 opacity-0 group-hover:opacity-100 md:-translate-y-4 md:group-hover:translate-y-0 transition-all duration-700 z-30">
                {item.highlightUrl && (
                    <a
                        href={item.highlightUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.2)]"
                    >
                        <ArrowRight className="w-5 h-5 md:w-7 md:h-7" />
                    </a>
                )}
            </div>
        </div>
    );
};

export default Portfolio;
