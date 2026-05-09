import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import Clock from 'lucide-react/dist/esm/icons/clock';
import User from 'lucide-react/dist/esm/icons/user';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Tag from 'lucide-react/dist/esm/icons/tag';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import Heart from 'lucide-react/dist/esm/icons/heart';
import { useStore } from '../lib/store';
import BlogNewsletter from '../components/blog/BlogNewsletter';
import BlogCard from '../components/blog/BlogCard';
import useDynamicMeta from '../hooks/useDynamicMeta';

const BlogPostDetail = () => {
    const { category, slug } = useParams();
    const { posts } = useStore();
    const navigate = useNavigate();
    const [isLiked, setIsLiked] = useState(false);

    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const post = useMemo(() => {
        return posts.find(p => p.slug === slug);
    }, [posts, slug]);

    useDynamicMeta({
        title: post ? post.title : "Newbi Article",
        description: post ? post.shortDescription : "Read this article on Concert Zone.",
        image: post && post.coverImage ? post.coverImage : "/favicon.svg",
        url: window.location.href
    });

    const relatedPosts = useMemo(() => {
        if (!post) return [];
        return posts
            .filter(p => p.category === post.category && p.id !== post.id && p.status === 'Published')
            .slice(0, 3);
    }, [posts, post]);

    if (!post) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-4xl md:text-6xl font-black font-heading uppercase italic tracking-tighter mb-8 transition-all">ARTICLE <span className="text-neon-pink">NOT FOUND.</span></h1>
                <Link to="/concert-zone" className="h-14 px-8 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 hover:scale-105 transition-all">
                    <ArrowLeft size={18} /> BACK TO HUB
                </Link>
            </div>
        );
    }

    const readingTime = post.readingTime || Math.ceil((post.content?.split(' ').length || 0) / 200) || 5;

    const handleShare = (platform) => {
        const url = window.location.href;
        const text = `Check out this story on Concert Zone: ${post.title}`;
        
        const links = {
            whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        };

        if (platform === 'native') {
            if (navigator.share) {
                navigator.share({ title: post.title, text, url });
            } else {
                navigator.clipboard.writeText(url);
                useStore.getState().addToast('Link copied to clipboard!', 'success');
            }
        } else {
            window.open(links[platform], '_blank');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-32">
            {/* Reading Progress Bar */}
            <motion.div 
                className="fixed top-0 left-0 right-0 h-1.5 bg-neon-blue z-[100] origin-left"
                style={{ scaleX }}
            />

            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16">
                
                {/* Left Content Side */}
                <article className="lg:col-span-8 flex flex-col">
                    {/* Back Navigation */}
                    <Link 
                        to={category ? `/concert-zone/${category}` : '/concert-zone'} 
                        className="group inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-neon-blue transition-colors mb-12"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                        BACK TO {category ? category.replace('-', ' ') : 'HUB'}
                    </Link>

                    {/* Article Header */}
                    <header className="mb-16">
                        <div className="flex flex-wrap items-center gap-4 mb-8">
                            <span className="px-4 py-1.5 rounded-full bg-neon-blue text-black text-[10px] font-black uppercase tracking-widest">
                                {post.category}
                            </span>
                            <div className="h-px w-8 bg-white/20" />
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> {readingTime} MIN READ
                            </span>
                        </div>

                        <h1 className="text-5xl md:text-8xl font-black font-heading uppercase italic tracking-tighter leading-[0.9] mb-12">
                            {post.title}
                        </h1>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 py-10 border-y border-white/5">
                            <div className="flex items-center gap-4 text-gray-400">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 overflow-hidden flex items-center justify-center border border-white/10">
                                    {post.authorImage ? (
                                        <img src={post.authorImage} alt={post.author} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="opacity-40" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">WORDS BY</span>
                                    <span className="text-lg font-bold uppercase">{post.author || 'NEWBI TEAM'}</span>
                                </div>
                            </div>

                            <div className="flex flex-col md:items-end">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">PUBLISHED</span>
                                <span className="text-lg font-bold uppercase">{new Date(post.publishDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </header>

                    {/* Immersive Cover Image */}
                    <div className="relative aspect-[16/10] md:aspect-[21/9] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl mb-20 group">
                        <img 
                            src={post.coverImage} 
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>

                    {/* Main Rich Content */}
                    <div className="article-content max-w-none text-xl md:text-2xl leading-relaxed text-gray-100 font-medium">
                        <div dangerouslySetInnerHTML={{ __html: post.content }} />
                    </div>

                    {/* Shared Tags / Bottom Section */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-24 mb-12">
                            {post.tags.map(tag => (
                                <span key={tag} className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/10 transition-all cursor-default">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* CTA Box */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mt-12 p-10 md:p-16 rounded-[3rem] bg-gradient-to-br from-neon-blue/20 via-purple-600/20 to-neon-pink/20 border border-white/10 relative overflow-hidden group shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[120px] -mr-48 -mt-48 pointer-events-none group-hover:bg-white/10 transition-colors duration-1000" />
                        <div className="relative z-10">
                            <h3 className="text-3xl md:text-5xl font-black font-heading uppercase italic tracking-tighter mb-8 leading-tight">
                                CRAVING THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white">ACTION?</span>
                            </h3>
                            <p className="text-gray-300 text-lg md:text-xl font-medium mb-12 max-w-xl">
                                Stories are just the beginning. Witness the magic live at upcoming concerts and festivals across the country.
                            </p>
                            <Link 
                                to="/concertzone"
                                className="h-16 px-10 bg-white text-black font-black font-heading uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 w-fit hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >
                                EXPLORE EVENTS <ExternalLink size={20} />
                            </Link>
                        </div>
                    </motion.div>
                </article>

                {/* Right Sidebar / Sticky Tools */}
                <aside className="lg:col-span-4 lg:pl-12">
                    <div className="sticky top-32 space-y-16">
                        
                        {/* Engagement Tools */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700" />
                            
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-8 flex items-center gap-2">
                                <Share2 size={12} className="text-neon-blue" /> Share Story
                            </h4>

                            <div className="grid grid-cols-3 gap-4 mb-12">
                                {[
                                    { icon: MessageCircle, color: 'hover:text-green-400', label: 'whatsapp', hoverBg: 'hover:bg-green-400/10' },
                                    { icon: Twitter, color: 'hover:text-sky-400', label: 'twitter', hoverBg: 'hover:bg-sky-400/10' },
                                    { icon: Linkedin, color: 'hover:text-blue-500', label: 'linkedin', hoverBg: 'hover:bg-blue-500/10' }
                                ].map((tool, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => handleShare(tool.label)}
                                        className={`h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 transition-all ${tool.color} ${tool.hoverBg} hover:border-white/20`}
                                    >
                                        <tool.icon size={22} />
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setIsLiked(!isLiked)}
                                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] transition-all ${
                                    isLiked 
                                        ? 'bg-neon-pink text-white shadow-[0_0_20px_rgba(255,80,139,0.3)]' 
                                        : 'bg-white/5 text-gray-400 border border-white/5 hover:border-neon-pink/20 hover:text-neon-pink'
                                }`}
                            >
                                <Heart size={18} fill={isLiked ? "currentColor" : "none"} /> 
                                {isLiked ? 'STORY LOVED' : 'LOVE STORY'}
                            </button>
                        </div>

                        {/* Newsletter Integrated */}
                        <BlogNewsletter />

                        {/* Summary View Top Posts Sidebar */}
                        {relatedPosts.length > 0 && (
                            <section>
                                <h3 className="text-sm font-black uppercase tracking-widest text-white mb-8 border-b border-white/10 pb-4">
                                    MORE IN <span className="text-neon-blue">{post.category}</span>
                                </h3>
                                <div className="space-y-6">
                                    {relatedPosts.map(p => (
                                        <Link key={p.id} to={`/concert-zone/${p.category?.toLowerCase()}/${p.slug}`} className="block group">
                                            <div className="flex gap-4">
                                                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/5">
                                                    <img src={p.coverImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold uppercase text-xs leading-tight line-clamp-2 group-hover:text-neon-blue transition-colors">
                                                        {p.title}
                                                    </h4>
                                                    <span className="text-[8px] font-black uppercase text-gray-500 mt-2 inline-block">
                                                        {new Date(p.publishDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </aside>
            </div>
            
            {/* Native Share / Progress Mini Control for Mobile */}
            <div className="fixed bottom-10 inset-x-6 md:hidden flex items-center gap-3 z-50">
                <Link to="/concert-zone" className="flex-grow h-14 rounded-full bg-black/80 backdrop-blur-3xl border border-white/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-2xl">
                    <ArrowLeft size={16} /> Hub
                </Link>
                <button 
                    onClick={() => handleShare('native')}
                    className="w-14 h-14 rounded-full bg-neon-blue text-black flex items-center justify-center shadow-2xl shadow-neon-blue/20"
                >
                    <Share2 size={20} />
                </button>
                <button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl"
                >
                    <ArrowUp size={20} />
                </button>
            </div>
        </div>
    );
};

export default BlogPostDetail;
