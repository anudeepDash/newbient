import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { ArrowRight, Zap, ChevronLeft, ChevronRight, Play, Clock, LayoutGrid, Music2 } from 'lucide-react';

/* ─── Portfolio Section ──────────────────────────────────────────────────── */
const Portfolio = () => {
    const { portfolio, portfolioCategories } = useStore();
    const carouselRef = useRef(null);

    const categories = portfolioCategories.length > 0 ? portfolioCategories : [];
    const [activeTab, setActiveTab] = useState('');
    const [isPaused, setIsPaused] = useState(false);

    const filteredItems = portfolio.filter(item => item.category === activeTab);

    useEffect(() => {
        if (isPaused || filteredItems.length <= 1) return;

        const interval = setInterval(() => {
            if (carouselRef.current) {
                const el = carouselRef.current;
                const cardEl = el.querySelector('.flex-shrink-0');
                const cardWidth = cardEl?.offsetWidth || 280;
                const gap = window.innerWidth >= 768 ? 32 : 24;
                const scrollStep = cardWidth + gap;

                const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 15;
                if (isAtEnd) {
                    el.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    el.scrollBy({ left: scrollStep, behavior: 'smooth' });
                }
            }
        }, 3500);

        return () => clearInterval(interval);
    }, [isPaused, filteredItems]);

    // Sync active tab when categories load
    useEffect(() => {
        if (!activeTab && categories.length > 0) {
            setActiveTab(categories[0].id);
        }
    }, [categories, activeTab]);

    const scroll = (direction) => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
        }
    };

    if (portfolio.length === 0 && portfolioCategories.length === 0) return null;

    return (
        <section
            className="py-10 md:py-16 bg-dark text-white relative overflow-hidden border-t border-white/5"
        >
            {/* ── Atmosphere ── */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-neon-green/[0.04] blur-[180px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-zinc-800/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">

                {/* ── Section Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-8 md:gap-12">
                    <div className="max-w-2xl">


                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-none"
                        >
                            Our{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neon-green">
                                Impact
                            </span>
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] mt-4"
                        >
                            {portfolio.length} Documented Activations &amp; Counting
                        </motion.p>
                    </div>

                    {/* ── Category Tabs ── */}
                    {categories.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.15 }}
                            className="flex overflow-x-auto whitespace-nowrap gap-2 p-1.5 rounded-[2rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl w-full md:w-auto shrink-0 scrollbar-hide"
                        >
                            {categories.map((cat) => {
                                const isActive = activeTab === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setActiveTab(cat.id); }}
                                        className={`relative flex-shrink-0 px-6 py-2.5 rounded-[1.4rem] font-black text-[10px] uppercase tracking-[0.25em] transition-all duration-500 overflow-hidden ${
                                            isActive
                                                ? 'bg-white text-black shadow-lg'
                                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <span className="relative z-10">{cat.label}</span>
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </div>

                {/* ── Carousel ── */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="relative group/nav"
                    >
                        {/* Nav arrows — visible on hover when there are enough cards */}
                        {filteredItems.length > 2 && (
                            <div className="hidden lg:block">
                                <button
                                    onClick={() => { scroll('left'); }}
                                    className="absolute -left-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all z-30 backdrop-blur-md opacity-0 group-hover/nav:opacity-100 -translate-x-4 group-hover/nav:translate-x-0 duration-300"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => { scroll('right'); }}
                                    className="absolute -right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all z-30 backdrop-blur-md opacity-0 group-hover/nav:opacity-100 translate-x-4 group-hover/nav:translate-x-0 duration-300"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}

                        {filteredItems.length > 0 ? (
                            <>
                                <div
                                    ref={carouselRef}
                                    onMouseEnter={() => setIsPaused(true)}
                                    onMouseLeave={() => setIsPaused(false)}
                                    onTouchStart={() => setIsPaused(true)}
                                    onTouchEnd={() => setIsPaused(false)}
                                    className="flex gap-6 md:gap-8 overflow-x-auto pb-6 md:pb-10 horizontal-scrollbar snap-x snap-mandatory scroll-smooth px-4 md:px-0"
                                    style={{ scrollbarWidth: 'auto', msOverflowStyle: 'auto' }}
                                >
                                    {filteredItems.map((item, index) => (
                                        <div key={item.id} className="flex-shrink-0 w-[280px] sm:w-[360px] md:w-[380px] snap-start">
                                            <PortfolioCard item={item} categories={categories} index={index} />
                                        </div>
                                    ))}
                                </div>
                                {filteredItems.length > 1 && (
                                    <div className="flex md:hidden items-center justify-center gap-4 mt-2">
                                        <button 
                                            onClick={() => scroll('left')}
                                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white active:bg-white active:text-black transition-all"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button 
                                            onClick={() => scroll('right')}
                                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white active:bg-white active:text-black transition-all"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-32 flex flex-col items-center justify-center gap-6 bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/5">
                                <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-gray-700 animate-pulse">
                                    <Zap size={24} />
                                </div>
                                <p className="text-gray-600 font-black uppercase tracking-[0.3em] text-[10px]">
                                    No entries in this sector yet.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </section>
    );
};

/* ─── Portfolio Card ─────────────────────────────────────────────────────── */
const PortfolioCard = ({ item, categories, index }) => {
    const categoryLabel = categories.find(c => c.id === item.category)?.label || 'General';
    const year = item.date ? item.date.split('-')[0] : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: Math.min(index * 0.08, 0.3) }}
            className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-950 border border-white/5 hover:border-white/15 transition-[background-color,border-color,box-shadow] duration-700 shadow-[0_30px_80px_rgba(0,0,0,0.5)] cursor-default"
        >
            {/* ── Glow Halo ── */}
            <div className="absolute -inset-px rounded-[2.5rem] bg-gradient-to-br from-neon-green/10 to-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-xl" />

            {/* ── Image Layer ── */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                {item.image ? (
                    <div
                        className="absolute inset-0 bg-cover transition-transform duration-700 group-hover:scale-110"
                        style={{
                            backgroundImage: `url(${item.image})`,
                            transform: `scale(${item.imageTransform?.scale || 1})`,
                            backgroundPosition: `calc(50% + ${(item.imageTransform?.x || 0)}%) calc(50% + ${(item.imageTransform?.y || 0)}%)`,
                            transformOrigin: 'center',
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray-800 font-black uppercase tracking-[0.3em] text-[9px]">NO VISUAL ASSET</span>
                    </div>
                )}

                {/* Deep cinematic gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/10 z-10" />
                {/* Subtle side-bleed */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/10 z-10" />
                {/* Hover accent glow */}
                <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at bottom left, rgba(46,255,144,0.08) 0%, transparent 65%)' }}
                />
            </div>

            {/* ── Top Badges ── */}
            <div className="absolute top-6 left-6 right-6 z-30 flex justify-between items-start">
                {/* Category pill */}
                <div className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 group-hover:border-neon-green/20 transition-colors duration-500">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-neon-green">{categoryLabel}</span>
                </div>

                {/* Year badge */}
                {year && (
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center gap-1.5">
                        <Clock size={10} className="text-white/40" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{year}</span>
                    </div>
                )}
            </div>



            {/* ── Content Slab ── */}
            <div className="absolute inset-x-6 bottom-7 z-30 space-y-5">
                <div>
                    <h3 className="text-2xl md:text-3xl font-extrabold text-white leading-none tracking-tight mb-2 line-clamp-2 group-hover:text-neon-green transition-colors duration-500">
                        {item.title}
                    </h3>

                    {item.date && (
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em]">
                            {new Date(item.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </p>
                    )}
                </div>

                {/* Divider & CTA */}
                <div className="pt-5 border-t border-white/5 flex items-center justify-between">
                    {item.highlightUrl ? (
                        <a
                            href={item.highlightUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="group/cta flex items-center gap-3 hover:gap-4 transition-all duration-300"
                        >
                            <span className="w-8 h-8 rounded-xl bg-neon-green/90 text-black flex items-center justify-center shadow-[0_0_20px_rgba(46,255,144,0.3)] group-hover/cta:shadow-[0_0_30px_rgba(46,255,144,0.5)] transition-all">
                                <Play size={14} fill="black" />
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 group-hover/cta:text-white transition-colors">
                                View Reel
                            </span>
                            <ArrowRight size={14} className="text-white/30 group-hover/cta:text-neon-green group-hover/cta:translate-x-1 transition-all" />
                        </a>
                    ) : (
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="w-4 h-px bg-white/20" />
                            Archived Record
                        </span>
                    )}

                    {/* Index dot cluster */}
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-green/60" />
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                    </div>
                </div>
            </div>

            {/* ── Premium hover shimmer ── */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none z-20"
                style={{ background: 'linear-gradient(135deg, rgba(46,255,144,0.03) 0%, transparent 50%, rgba(46,191,255,0.03) 100%)' }}
            />
        </motion.div>
    );
};

export default Portfolio;
