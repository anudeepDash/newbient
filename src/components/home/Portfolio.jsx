import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';

const Portfolio = () => {
    const { portfolio } = useStore();
    const categories = [
        {
            id: 'music',
            label: 'Music Concerts',
            items: [
                "Arijit Singh", "Marshmello", "Shreya Ghoshal", "Armaan Malik",
                "Seedhe Maut", "Darshan Raval", "Divine", "Nikhita Gandhi",
                "Papon", "Prateek Kuhad", "The Yellow Diary", "Sanam",
                "Hanumankind", "Kailash Kher", "Swarthama", "Iqlipse Nova"
            ]
        },
        {
            id: 'fests',
            label: 'Fests & IPs',
            items: [
                "Kingfisher OctoBeerfest", "The Big Feed", "Bangr Carnival",
                "Sun Downer", "McDowell's Yaari Jam", "TATA WPL", "Rivaayat"
            ]
        },
        {
            id: 'comedy',
            label: 'Stand-Up Shows',
            items: [
                "Anubhav Singh Bassi", "Ashish Vidyarthi", "Atul Khatri",
                "Amit Tandon", "Harsh Gujral", "Ravi Gupta", "Jaspreet Singh"
            ]
        }
    ];

    const [activeTab, setActiveTab] = useState(categories[0].id);

    return (
        <section className="py-20 bg-black text-white relative">
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

                {/* Grid Content */}
                <div className="min-h-[300px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                        >
                            {/* Filter items by active tab */}
                            {portfolio.filter(item => item.category === activeTab).map((item) => (
                                <div
                                    key={item.id}
                                    className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden aspect-square flex items-center justify-center text-center shadow-lg transition-transform hover:scale-[1.02] duration-300"
                                >
                                    {/* Image Background - Full Visibility */}
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

                                    {/* Gradient Overlay & Text - Visible by default, hidden on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-100 group-hover:opacity-0 transition-all duration-300 flex flex-col justify-end p-6">
                                        <h3 className="text-xl font-bold text-white transform translate-y-0 group-hover:translate-y-4 transition-transform duration-300">
                                            {item.title}
                                        </h3>
                                        <p className="text-neon-green text-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                                            {categories.find(c => c.id === item.category)?.label}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {portfolio.filter(item => item.category === activeTab).length === 0 && (
                                <div className="col-span-full text-center text-gray-500 py-12">
                                    No events added in this category yet.
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};

export default Portfolio;
