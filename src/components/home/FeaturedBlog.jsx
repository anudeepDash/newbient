import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import BlogCard from '../blog/BlogCard';
import { TEST_POSTS } from '../../pages/ConcertZoneBlog';

const FeaturedBlog = () => {
    const { posts } = useStore();
    const [isPaused, setIsPaused] = useState(false);
    const carouselRef = useRef(null);

    const featuredPosts = useMemo(() => {
        let published = posts.filter(p => p.status === 'Published');
        if (published.length === 0) {
            published = [...TEST_POSTS];
        }
        
        // Sort by publishDate descending
        published.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

        // Get featured posts, or fallback to the latest 3 posts
        const featured = published.filter(p => p.featured);
        return featured.length > 0 ? featured.slice(0, 3) : published.slice(0, 3);
    }, [posts]);

    const scroll = (direction) => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (isPaused || featuredPosts.length <= 1) return;

        const interval = setInterval(() => {
            if (window.innerWidth >= 768) return;

            if (carouselRef.current) {
                const el = carouselRef.current;
                const cardEl = el.querySelector('.flex-shrink-0');
                const cardWidth = cardEl?.offsetWidth || 290;
                const gap = 24;
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
    }, [isPaused, featuredPosts]);

    if (featuredPosts.length === 0) return null;

    return (
        <section
            id="featured-blog"
            className="relative py-10 md:py-16 scroll-mt-24 bg-dark text-white overflow-hidden border-t border-white/5"
        >
            {/* Ambient Background Glows */}

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-8">
                    <div className="max-w-xl">

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="font-heading text-4xl md:text-6xl font-extrabold tracking-tight text-white"
                        >
                            Concert <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neon-green">Zone</span>
                        </motion.h2>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <Link
                            to="/concertzone"
                            className="group h-12 px-6 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider text-[10px] hover:border-neon-green/50 hover:bg-neon-green/5 transition-all rounded-xl flex items-center gap-2"
                        >
                            EXPLORE ALL ARTICLES
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                </div>

                {/* Grid/Scroll Layout for Articles with Navigation Controls */}
                <div className="relative group/nav">
                    {/* Desktop Side Arrows */}
                    {featuredPosts.length > 3 && (
                        <div className="hidden lg:block">
                            <button 
                                onClick={() => scroll('left')}
                                className="absolute -left-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all z-30 backdrop-blur-md opacity-0 group-hover/nav:opacity-100 -translate-x-4 group-hover/nav:translate-x-0 duration-300"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button 
                                onClick={() => scroll('right')}
                                className="absolute -right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all z-30 backdrop-blur-md opacity-0 group-hover/nav:opacity-100 translate-x-4 group-hover/nav:translate-x-0 duration-300"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}

                    <div 
                        ref={carouselRef}
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                        onTouchStart={() => setIsPaused(true)}
                        onTouchEnd={() => setIsPaused(false)}
                        className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-8 md:pb-0 snap-x horizontal-scrollbar -mx-4 px-4 md:mx-0 md:px-0"
                    >
                        {featuredPosts.map((post, idx) => (
                            <div key={post.id} className="h-full w-[290px] sm:w-[360px] md:w-full flex-shrink-0 snap-center md:snap-none">
                                <BlogCard post={post} variant="standard" index={idx} />
                            </div>
                        ))}
                    </div>

                    {/* Mobile Bottom Arrows */}
                    {featuredPosts.length > 1 && (
                        <div className="flex md:hidden items-center justify-center gap-4 mt-4">
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
                </div>
            </div>
        </section>
    );
};

export default FeaturedBlog;
