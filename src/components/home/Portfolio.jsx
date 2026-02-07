import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { useStore } from '../../lib/store';
import { ArrowRight } from 'lucide-react';

const Portfolio = () => {
    const { portfolio } = useStore();
    const categories = [
        { id: 'music', label: 'Music Concerts' },
        { id: 'fests', label: 'Fests & IPs' },
        { id: 'comedy', label: 'Stand-Up Shows' }
    ];

    const [activeTab, setActiveTab] = useState(categories[0].id);
    const filteredItems = portfolio.filter(item => item.category === activeTab);

    return (
        <section className="py-20 bg-black text-white relative overflow-hidden border-t border-white/5">
            {/* Neon Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-neon-green/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-12">
                    <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                        Our <span className="text-neon-green">Portfolio</span>
                    </h2>
                    <p className="text-gray-400">Highlights from the incredible events we've powered.</p>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap justify-center gap-4 mb-12">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={`px-6 py-3 rounded-full font-medium transition-all duration-300 relative ${activeTab === cat.id
                                ? 'text-black bg-neon-green shadow-[0_0_20px_rgba(57,255,20,0.4)]'
                                : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Carousel Content */}
                <div className="min-h-[300px] relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 sm:px-6 lg:px-8 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {filteredItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="min-w-[280px] sm:min-w-[320px] aspect-square relative rounded-xl overflow-hidden group border border-white/10 bg-gray-900 flex-shrink-0 shadow-lg snap-start"
                                    >
                                        {/* Image Background */}
                                        {item.image ? (
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                                style={{ backgroundImage: `url(${item.image})` }}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-500">
                                                No Image
                                            </div>
                                        )}

                                        {/* Gradient Overlay & Text */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-300 flex flex-col justify-end p-6">
                                            <h3 className="text-xl font-bold text-white transform translate-y-0 group-hover:translate-y-4 transition-transform duration-300">
                                                {item.title}
                                            </h3>
                                            <p className="text-neon-green text-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                                                {categories.find(c => c.id === item.category)?.label}
                                            </p>
                                        </div>

                                        {/* Hover Revealed Text */}
                                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                                                <span className="text-neon-green font-bold uppercase tracking-wider text-sm mb-4">
                                                    {categories.find(c => c.id === item.category)?.label}
                                                </span>

                                                {item.highlightUrl && (
                                                    <a
                                                        href={item.highlightUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-white hover:text-neon-green transition-colors text-sm font-medium group/link"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        view event highlight
                                                        <ArrowRight className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {filteredItems.length === 0 && (
                                    <div className="w-full text-center text-gray-500 py-12 flex-shrink-0">
                                        No events added in this category yet.
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

export default Portfolio;
