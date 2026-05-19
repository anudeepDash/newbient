import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import BlogCard from '../blog/BlogCard';
import { TEST_POSTS } from '../../pages/ConcertZoneBlog';

const FeaturedBlog = () => {
    const { posts } = useStore();

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

    if (featuredPosts.length === 0) return null;

    return (
        <section
            id="featured-blog"
            className="relative py-10 md:py-16 scroll-mt-24 bg-[#020202] text-white overflow-hidden border-t border-white/5"
        >
            {/* Ambient Background Glows */}
            <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-neon-pink/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-neon-blue/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-8">
                    <div className="max-w-xl">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-neon-pink">Editorial Hub</span>
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="font-heading text-4xl md:text-6xl font-black tracking-tight italic text-white"
                        >
                            Concert <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-[#FF007F] to-neon-blue not-italic">Zone.</span>
                        </motion.h2>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <Link
                            to="/concertzone"
                            className="group h-12 px-6 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider text-[10px] hover:border-neon-pink/50 hover:bg-neon-pink/5 transition-all rounded-xl flex items-center gap-2"
                        >
                            EXPLORE ALL ARTICLES
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                </div>

                {/* Grid Layout for Articles */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {featuredPosts.map((post, idx) => (
                        <div key={post.id} className="h-full">
                            <BlogCard post={post} variant="standard" index={idx} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturedBlog;
