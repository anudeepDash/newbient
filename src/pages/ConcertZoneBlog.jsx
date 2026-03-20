import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    ChevronRight, 
    TrendingUp, 
    Calendar, 
    ArrowRight,
    Play,
    Newspaper,
    Users,
    BookOpen,
    Zap
} from 'lucide-react';
import { useStore } from '../lib/store';
import BlogCard from '../components/blog/BlogCard';
import BlogNewsletter from '../components/blog/BlogNewsletter';

const CATEGORIES = [
    { id: 'all', label: 'All', icon: Newspaper },
    { id: 'live-events', label: 'Live Events', icon: Play },
    { id: 'artists', label: 'Artists', icon: Users },
    { id: 'guides', label: 'Guides', icon: BookOpen },
    { id: 'buzz', label: 'Buzz', icon: Zap }
];

const ConcertZoneBlog = () => {
    const { category } = useParams();
    const navigate = useNavigate();
    const { posts } = useStore();
    const [searchQuery, setSearchQuery] = useState('');

    const activeCategory = category || 'all';
    const [visibleCount, setVisibleCount] = useState(6);

    const filteredPosts = useMemo(() => {
        let result = posts.filter(p => p.status === 'Published');
        
        if (activeCategory !== 'all') {
            const label = CATEGORIES.find(c => c.id === activeCategory)?.label;
            result = result.filter(p => p.category === label);
        }

        if (searchQuery) {
            result = result.filter(p => 
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return result.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
    }, [posts, activeCategory, searchQuery]);

    const featuredPosts = useMemo(() => {
        return posts.filter(p => p.featured && p.status === 'Published').slice(0, 3);
    }, [posts]);

    const latestPostsSidebar = useMemo(() => {
        return posts.filter(p => p.status === 'Published').slice(0, 5);
    }, [posts]);

    const liveEventsPosts = useMemo(() => {
        return posts.filter(p => p.status === 'Published' && p.category === 'Live Events').slice(0, 4);
    }, [posts]);

    const handleCategoryChange = (catId) => {
        if (catId === 'all') {
            navigate('/concert-zone');
        } else {
            navigate(`/concert-zone/${catId}`);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-32 overflow-hidden relative">
            {/* GIGX Style Background Pattern */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="music-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                            <path d="M10 10l80 80m-80 0l80-80" stroke="currentColor" strokeWidth="0.5" fill="none" />
                            <circle cx="50" cy="50" r="2" fill="currentColor" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#music-pattern)" />
                </svg>
            </div>

            <div className="max-w-[1500px] mx-auto px-6 relative z-10">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
                    <div className="relative">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100px' }}
                            className="h-1 bg-neon-blue mb-4"
                        />
                        <h1 className="text-6xl md:text-8xl font-black font-heading uppercase tracking-tighter italic leading-[0.8]">
                            CONCERT <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white">ZONE.</span>
                        </h1>
                    </div>
                </div>

                {/* GIGX Split Hero */}
                {!category && (
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-24">
                        {/* Carousel Wrapper (8 Columns) */}
                        <div className="lg:col-span-8 h-[500px] md:h-[650px]">
                            <div className="w-full h-full relative rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                                <AnimatePresence mode="wait">
                                    {featuredPosts.length > 0 && (
                                        <motion.div
                                            key={featuredPosts[0].id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="w-full h-full"
                                        >
                                            <BlogCard post={featuredPosts[0]} variant="carousel-item" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Side List: THE PULSE (4 Columns) */}
                        <div className="lg:col-span-4 flex flex-col">
                            <div className="flex items-center gap-4 mb-6 pl-4">
                                <div className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
                                <h3 className="text-xl font-black font-heading uppercase italic tracking-widest text-white/40">THE <span className="text-white">PULSE.</span></h3>
                            </div>
                            <div className="flex-grow space-y-2 bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 backdrop-blur-xl">
                                {latestPostsSidebar.map(post => (
                                    <BlogCard key={post.id} post={post} variant="list-item" />
                                ))}
                                <Link to="/concert-zone/buzz" className="flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                                    View All Updates <ChevronRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                {/* Sub-Navigation Categories */}
                <div className="flex items-center gap-4 mb-20 border-b border-white/5 pb-6 overflow-x-auto no-scrollbar">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryChange(cat.id)}
                            className={`px-6 py-2 rounded-full flex items-center gap-3 whitespace-nowrap transition-all font-black uppercase tracking-widest text-[10px] ${
                                activeCategory === cat.id 
                                    ? 'bg-neon-blue text-black italic' 
                                    : 'text-gray-500 hover:text-white'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                    <div className="ml-auto md:w-80 relative group hidden md:block">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search stories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 bg-white/5 border border-white/10 rounded-full pl-12 pr-6 text-[10px] font-bold focus:outline-none focus:border-neon-blue/50 transition-all"
                        />
                    </div>
                </div>

                {/* Sectioned Content */}
                <div className="space-y-32">
                    {/* Live Events Section (If on Home) */}
                    {!category && liveEventsPosts.length > 0 && (
                        <section>
                            <div className="flex items-end justify-between mb-12">
                                <h3 className="text-3xl font-black font-heading uppercase italic leading-none">
                                    LIVE <span className="text-neon-pink text-5xl">X.</span>
                                </h3>
                                <Link to="/concert-zone/live-events" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">View All Events</Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {liveEventsPosts.map(post => (
                                    <BlogCard key={post.id} post={post} variant="grid-card-v2" />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Main Feed Section */}
                    <section>
                        <div className="flex items-end justify-between mb-12">
                            <h3 className="text-3xl font-black font-heading uppercase italic leading-none">
                                {activeCategory === 'all' ? 'LATEST' : activeCategory.replace('-', ' ')} <span className="text-neon-blue text-5xl">STORIES.</span>
                            </h3>
                            <div className="h-px flex-grow bg-white/10 ml-8 opacity-20" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                            <AnimatePresence mode="popLayout">
                                {filteredPosts.slice(0, visibleCount).map((post, index) => (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <BlogCard post={post} variant="grid-card-v2" />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {filteredPosts.length > visibleCount && (
                            <div className="flex justify-center pt-12">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 6)}
                                    className="h-14 px-12 bg-white text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
                                >
                                    More Stories
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Newsletter Grid */}
                    <section className="py-24 border-y border-white/5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-16">
                            <div>
                                <h2 className="text-6xl md:text-8xl font-black font-heading uppercase italic tracking-tighter leading-[0.8] mb-8">
                                    STAY IN <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-blue">TOUCH.</span>
                                </h2>
                                <p className="text-gray-400 text-lg font-medium max-w-lg leading-relaxed">
                                    Join 5,000+ music fans getting first access to event recaps, artist interviews, and tickets.
                                </p>
                            </div>
                            <BlogNewsletter />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ConcertZoneBlog;
