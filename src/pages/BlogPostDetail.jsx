import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from 'framer-motion';
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
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Home from 'lucide-react/dist/esm/icons/home';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import BlogNewsletter from '../components/blog/BlogNewsletter';
import BlogCard from '../components/blog/BlogCard';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { TEST_POSTS } from './ConcertZoneBlog';

const CATEGORY_COLORS = {
    'Live Events': '#00ffff', // neon-blue
    'Artists': '#e11d48',    // rose-600 (premium red)
    'Guides': '#a855f7',     // purple
    'Buzz': '#facc15',       // yellow
    'Community': '#10b981',   // green
    'default': '#00ffff'
};

const BlogPostDetail = () => {
    const { category, slug } = useParams();
    const { posts } = useStore();
    const navigate = useNavigate();
    const [isLiked, setIsLiked] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const contentRef = useRef(null);

    const { scrollYProgress } = useScroll({
        target: contentRef,
        offset: ["start start", "end end"]
    });

    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });


    const post = useMemo(() => {
        // Try Firestore posts first, then fall back to test posts
        return posts.find(p => p.slug === slug) || TEST_POSTS.find(p => p.slug === slug);
    }, [posts, slug]);

    useDynamicMeta({
        title: post ? post.title : "Newbi Article",
        description: post ? post.shortDescription : "Read this article on Concert Zone.",
        image: post && post.coverImage ? post.coverImage : "/favicon.svg",
        url: window.location.href
    });

    const relatedPosts = useMemo(() => {
        if (!post) return [];
        const allPosts = posts.length > 0 ? posts : TEST_POSTS;
        return allPosts
            .filter(p => p.id !== post.id && (p.category === post.category || true))
            .filter(p => p.status === 'Published' || p.id.includes('-test'))
            .slice(0, 3);
    }, [posts, post]);

    if (!post) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <motion.h1 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-4xl md:text-6xl font-black font-heading uppercase italic tracking-tighter mb-8"
                >
                    ARTICLE <span className="text-neon-pink">MISSING.</span>
                </motion.h1>
                <Link to="/concertzone" className="h-14 px-8 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 hover:scale-105 transition-all">
                    <ArrowLeft size={18} /> BACK TO HUB
                </Link>
            </div>
        );
    }

    useEffect(() => {
        if (post?.id && !post.id.includes('-test')) {
            useStore.getState().incrementPostView?.(post.id);
        }
    }, [post?.id]);

    const accentColor = useMemo(() => {
        return post?.accentColor || CATEGORY_COLORS[post?.category] || CATEGORY_COLORS.default;
    }, [post]);

    const handleShare = (platform) => {
        const url = window.location.href;
        const text = `Read "${post.title}" on Newbi Concert Zone`;
        const links = {
            whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        };

        if (!post.id.includes('-test')) {
            useStore.getState().incrementPostShare?.(post.id);
        }

        if (platform === 'native') {
            setIsShareOpen(true);
        } else {
            window.open(links[platform], '_blank');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pb-32 selection:bg-neon-blue selection:text-black">
            {/* Immersive Background Atmos (Newbi Feel) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div 
                    className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-20" 
                    style={{ backgroundColor: accentColor }}
                />
                <div 
                    className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-10" 
                    style={{ backgroundColor: accentColor }}
                />
                
                {/* Mesh Grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
                
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
            </div>



            {/* Futuristic Left-Aligned Navigation Bar */}
            <motion.div 
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="fixed top-8 left-8 md:left-24 z-[200] w-auto max-w-[80%]"
            >
                <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-3 px-8 flex items-center gap-8 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                    <button 
                        onClick={() => navigate('/concertzone')}
                        className="flex items-center gap-3 h-10 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group shrink-0"
                    >
                        <ArrowLeft size={14} style={{ color: accentColor }} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-white">CONCERT ZONE</span>
                    </button>

                    <div className="w-[1px] h-6 bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-6 shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: accentColor }}>{post.category}</span>
                        <div className="h-px w-16 bg-white/20" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic">Reading Now</span>
                    </div>

                    <div className="hidden lg:block w-[1px] h-6 bg-white/10" />

                    <div className="flex-1 min-w-0 hidden md:block max-w-md">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white truncate italic opacity-80">{post.title}</h4>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                        <div className="relative w-24 h-[2px] bg-white/10 rounded-full overflow-hidden hidden sm:block">
                            <motion.div 
                                className="absolute inset-0 origin-left" 
                                style={{ scaleX, backgroundColor: accentColor }} 
                            />
                        </div>
                        <button 
                            onClick={() => setIsShareOpen(true)}
                            className="h-10 px-6 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg"
                        >
                            SHARE
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Cinematic Hero Segment */}
            <header className="relative w-full h-[85vh] md:h-[95vh] overflow-hidden flex flex-col justify-end">
                <motion.div 
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.8, ease: "easeOut" }}
                    className="absolute inset-0"
                >
                    {post.videoUrl ? (
                        <video 
                            src={post.videoUrl} 
                            autoPlay 
                            muted 
                            loop 
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <img 
                            src={post.coverImage} 
                            alt={post.title} 
                            className="w-full h-full" 
                            style={{ 
                                objectFit: 'cover', 
                                transform: `scale(${post.coverImageScale || 1})`,
                                transformOrigin: `${post.coverImagePosX ?? 50}% ${post.coverImagePosY ?? 50}%`
                            }}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                </motion.div>

                <div className="relative z-10 max-w-[1800px] mx-auto px-8 md:px-24 pb-24 md:pb-32 w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="max-w-6xl"
                    >
                        <div className="flex items-center gap-6 mb-12">
                            <motion.span 
                                whileHover={{ scale: 1.05 }}
                                className="px-8 py-3 text-black text-[13px] font-black uppercase tracking-widest rounded-2xl italic transition-all cursor-pointer"
                                style={{ backgroundColor: accentColor, boxShadow: `0 15px 40px ${accentColor}66` }}
                            >
                                {post.category}
                            </motion.span>
                            <div className="h-px w-24 bg-white/20" />
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">Reading Now</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black font-heading uppercase leading-[1.2] tracking-tight mb-16 italic drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] break-words pr-16 pb-4">
                            {post.title.split(' ').map((word, i) => (
                                <span key={i} 
                                    className={i % 2 === 1 ? "text-transparent bg-clip-text not-italic" : "text-white"}
                                    style={i % 2 === 1 ? { backgroundImage: `linear-gradient(to right, ${accentColor}, white, ${accentColor})` } : {}}
                                >
                                    {word}{' '}
                                </span>
                            ))}
                        </h1>
                        <div className="flex flex-wrap items-center gap-16 text-[13px] font-black uppercase tracking-[0.4em] text-white/50">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center group overflow-hidden">
                                    <User size={24} className="group-hover:text-neon-blue transition-colors" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-600 mb-1 tracking-widest">AUTHOR</span>
                                    <span className="text-white text-sm">{post.author || 'NEWBI TEAM'}</span>
                                </div>
                            </div>
                            <div className="hidden md:block w-[1px] h-12 bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-600 mb-1 tracking-widest">PUBLISHED</span>
                                <span className="text-white text-sm">{new Date(post.publishDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
                
                {/* Scroll Indicator */}
                <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-30"
                >
                    <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Scroll</span>
                </motion.div>
            </header>

            <div className="max-w-[1800px] mx-auto px-8 md:px-24 grid grid-cols-1 lg:grid-cols-12 gap-24 relative pt-32">
                
                {/* High-Fi Engagement Rail */}
                <aside className="hidden xl:block lg:col-span-1">
                    <div className="sticky top-48 flex flex-col items-center gap-8">
                        <button 
                            onClick={() => setIsLiked(!isLiked)}
                            className={cn(
                                "w-20 h-20 rounded-[2rem] flex flex-col items-center justify-center transition-all border group",
                                isLiked ? "bg-neon-pink border-neon-pink text-white shadow-[0_15px_40px_rgba(255,0,85,0.4)]" : "bg-white/5 border-white/10 text-gray-600 hover:text-white hover:border-white/20"
                            )}
                        >
                            <Heart size={24} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "scale-110" : "group-hover:scale-110 transition-transform"} />
                            <span className="text-[8px] font-black mt-2 tracking-widest">LIKE</span>
                        </button>
                        <button 
                            onClick={() => setIsShareOpen(true)}
                            className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 text-gray-600 hover:text-white hover:border-white/20 flex flex-col items-center justify-center transition-all group"
                        >
                            <Share2 size={24} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[8px] font-black mt-2 tracking-widest">SHARE</span>
                        </button>
                    </div>
                </aside>

                {/* The Narrative Hub */}
                <div ref={contentRef} className="lg:col-span-8 xl:col-span-9">
                    <div className="prose prose-invert prose-2xl max-w-none prose-p:text-gray-300 prose-p:leading-[1.8] prose-p:mb-8 prose-headings:font-heading prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-headings:mb-8 prose-img:rounded-[4rem] prose-img:shadow-2xl prose-img:border prose-img:border-white/10 prose-a:text-neon-blue prose-a:underline-offset-8 prose-strong:text-white prose-blockquote:border-l-neon-blue prose-blockquote:bg-white/5 prose-blockquote:p-12 prose-blockquote:rounded-[3rem] prose-blockquote:italic selection:bg-neon-blue selection:text-black">
                        <div dangerouslySetInnerHTML={{ __html: post.content }} />
                    </div>

                    {/* Metadata Fragments */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-12">
                            {post.tags.map(tag => (
                                <span key={tag} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-neon-blue hover:border-neon-blue/20 hover:bg-neon-blue/5 transition-all cursor-pointer">
                                    // {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Visual Separator */}
                    <div className="h-px w-full bg-gradient-to-r from-white/5 via-white/10 to-white/5 mt-12" />
                </div>

                {/* High-Fidelity Sidebar */}
                <aside className="lg:col-span-3 space-y-20">
                </aside>
            </div>

            {/* Horizontal Suggested Articles Segment */}
            {relatedPosts.length > 0 && (
                <div className="max-w-[1800px] mx-auto px-8 md:px-24 mb-16">
                    <div className="flex items-center gap-5 mb-10 px-4">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor, boxShadow: `0 0 15px ${accentColor}` }} />
                        <h4 className="text-xs font-black uppercase tracking-[0.5em] text-white/40">
                            SUGGESTED ARTICLES
                        </h4>
                        <div className="flex-1 h-px bg-white/5 ml-10" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {relatedPosts.map(p => (
                            <BlogCard key={p.id} post={p} variant="compact" />
                        ))}
                    </div>
                </div>
            )}



            {/* Bottom Content Row */}
            <div className="max-w-[1800px] mx-auto px-8 md:px-24 mt-12">
                <BlogNewsletter />
            </div>

            {/* Modals Interface */}
            <AnimatePresence>
                {/* Share Modal */}
                {isShareOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
                    >
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" onClick={() => setIsShareOpen(false)} />
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-[3rem] p-12 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/10 blur-[100px] -mr-32 -mt-32" />
                            
                            <h2 className="text-4xl font-black font-heading tracking-tighter uppercase italic mb-4">SHARE ARTICLE</h2>
                            <p className="text-gray-500 text-sm font-medium mb-12 tracking-widest">TRANSMIT TO YOUR TRIBE</p>

                            <div className="grid grid-cols-2 gap-6 mb-12">
                                {[
                                    { icon: MessageCircle, label: 'whatsapp', color: 'text-green-400', bg: 'bg-green-400/5 hover:bg-green-400/10' },
                                    { icon: Twitter, label: 'twitter', color: 'text-sky-400', bg: 'bg-sky-400/5 hover:bg-sky-400/10' },
                                    { icon: Linkedin, label: 'linkedin', color: 'text-blue-500', bg: 'bg-blue-500/5 hover:bg-blue-500/10' },
                                    { icon: ExternalLink, label: 'copy link', color: 'text-white', bg: 'bg-white/5 hover:bg-white/10' }
                                ].map((s, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => {
                                            if (s.label === 'copy link') {
                                                navigator.clipboard.writeText(window.location.href);
                                                useStore.getState().addToast('LINK_COPIED', 'success');
                                            } else {
                                                handleShare(s.label);
                                            }
                                        }}
                                        className={cn("h-32 rounded-3xl flex flex-col items-center justify-center gap-4 border border-white/5 transition-all group relative overflow-hidden", s.bg)}
                                    >
                                        <s.icon size={28} className={cn(s.color, "transition-transform group-hover:scale-110 relative z-10")} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity relative z-10">{s.label}</span>
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => setIsShareOpen(false)} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white/10 transition-all text-gray-400 hover:text-white">
                                // CLOSE CONSOLE
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BlogPostDetail;
