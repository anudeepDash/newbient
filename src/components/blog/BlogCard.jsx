import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, User, ArrowUpRight, Calendar, Sparkles, Star } from 'lucide-react';

const CATEGORY_COLORS = {
    'Live Events': '#00ffff', // neon-blue
    'Artists': '#e11d48',    // rose-600
    'Guides': '#a855f7',     // purple
    'Buzz': '#facc15',       // yellow
    'Community': '#10b981',   // green
    'default': '#00ffff'
};

const BlogCard = ({ post, variant = 'standard', index = 0 }) => {
    const categorySlug = post.category?.toLowerCase().replace(' ', '-') || 'news';
    const detailPath = `/concertzone/${categorySlug}/${post.slug}`;
    const accentColor = post.accentColor || CATEGORY_COLORS[post.category] || CATEGORY_COLORS.default;

    const variants = {
        hero: (
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative group w-full h-[550px] md:h-[850px] rounded-[3rem] md:rounded-[4rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
            >
                <Link to={detailPath} className="block w-full h-full">
                    {post.videoUrl ? (
                        <video 
                            src={post.videoUrl} 
                            autoPlay 
                            muted 
                            loop 
                            playsInline
                            className="w-full h-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-110" 
                        />
                    ) : (
                        <img 
                            src={post.coverImage} 
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-110"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                    
                    {/* Immersive Badge System */}
                    <div className="absolute top-8 left-8 md:top-16 md:left-16 flex flex-wrap items-center gap-4 md:gap-6">
                        <span 
                            className="px-6 md:px-8 py-2 md:py-3 text-black text-[11px] md:text-[14px] font-black uppercase tracking-[0.2em] rounded-xl md:rounded-2xl italic"
                            style={{ backgroundColor: accentColor, boxShadow: `0 20px 40px ${accentColor}66` }}
                        >
                            {post.category}
                        </span>
                        <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em]">
                            <Clock size={14} className="md:size-[16px]" style={{ color: accentColor }} /> {post.readingTime || 5} MIN
                        </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-10 md:p-24 lg:p-32">
                        <div className="max-w-5xl space-y-10">
                            <motion.h2 
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl md:text-8xl lg:text-[10rem] font-black font-heading uppercase leading-[1] md:leading-[0.8] tracking-tighter italic transition-all duration-700"
                                style={{ 
                                    '--hover-color': accentColor 
                                }}
                            >
                                {post.title}
                            </motion.h2>
                            <p className="text-gray-300 text-base md:text-2xl font-medium max-w-3xl line-clamp-2 opacity-60 group-hover:opacity-100 transition-opacity duration-500 leading-relaxed italic">
                                {post.shortDescription}
                            </p>
                            <div className="flex flex-wrap items-center gap-6 md:gap-10 text-[11px] md:text-[13px] font-black uppercase tracking-[0.4em] text-white/40">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        <User size={16} className="md:size-[20px]" />
                                    </div>
                                    <span className="text-[10px] md:text-[13px]">{post.author || 'NEWBI TEAM'}</span>
                                </div>
                                <div className="hidden xs:block w-1 h-1 md:w-2 md:h-2 rounded-full" style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
                                <div className="flex items-center gap-2 md:gap-3">
                                    <Calendar size={14} className="md:size-[18px]" /> <span className="text-[10px] md:text-[13px]">{new Date(post.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Hover Interaction Hub */}
                    <div className="absolute bottom-16 right-16 w-24 h-24 bg-white text-black rounded-[2.5rem] flex items-center justify-center opacity-0 translate-y-10 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 shadow-[0_30px_60px_rgba(255,255,255,0.3)]">
                        <ArrowUpRight size={40} className="group-hover:rotate-45 transition-transform duration-500" />
                    </div>
                </Link>
            </motion.div>
        ),
        featured: (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="group relative h-full min-h-[550px] bg-zinc-900/30 border border-white/5 rounded-[3.5rem] overflow-hidden backdrop-blur-3xl transition-all duration-700 shadow-2xl"
                style={{ '--hover-border': `${accentColor}4D` }}
            >
                <Link to={detailPath} className="flex flex-col h-full">
                    <div className="relative h-[60%] overflow-hidden">
                        {post.videoUrl ? (
                            <video 
                                src={post.videoUrl} 
                                autoPlay 
                                muted 
                                loop 
                                playsInline
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                            />
                        ) : (
                            <img 
                                src={post.coverImage} 
                                alt={post.title}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                        <div className="absolute top-8 left-8">
                            <span className="px-6 py-2 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-white italic">
                                {post.category}
                            </span>
                        </div>
                        {post.featured && (
                            <div 
                                className="absolute top-8 right-8 w-12 h-12 text-white rounded-2xl flex items-center justify-center"
                                style={{ backgroundColor: accentColor, boxShadow: `0 10px 20px ${accentColor}66` }}
                            >
                                <Star size={18} fill="currentColor" />
                            </div>
                        )}
                    </div>
                    <div className="p-8 md:p-14 flex flex-col flex-grow">
                        <div className="flex items-center gap-4 md:gap-5 text-gray-500 text-[9px] md:text-[11px] font-black uppercase tracking-[0.4em] mb-4 md:mb-6">
                            <div className="flex items-center gap-2 font-black" style={{ color: accentColor }}><Clock size={12} className="md:size-[14px]" /> {post.readingTime || 5} MIN</div>
                            <div className="w-[1px] h-3 md:h-4 bg-white/10" />
                            <div>{new Date(post.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                        </div>
                        <h3 className="text-3xl md:text-5xl font-black font-heading uppercase leading-[1] md:leading-[0.9] tracking-tighter mb-4 md:mb-6 group-hover:text-neon-blue transition-colors line-clamp-3 italic">
                            {post.title}
                        </h3>
                        <p className="text-gray-400 text-sm md:text-base font-medium line-clamp-2 mb-8 md:mb-10 opacity-60 group-hover:opacity-100 transition-opacity leading-relaxed italic">
                            {post.shortDescription}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-6 md:pt-8 border-t border-white/5">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <User size={14} className="text-gray-400 md:size-[16px]" />
                                </div>
                                <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-gray-500">
                                    {post.author || 'NEWBI TEAM'}
                                </span>
                            </div>
                            <div 
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500 group-hover:text-black"
                                style={{ '--hover-bg': accentColor }}
                            >
                                <ArrowUpRight size={18} className="md:size-[20px]" />
                            </div>
                        </div>
                    </div>
                </Link>
            </motion.div>
        ),
        standard: (
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative flex flex-col h-full bg-zinc-900/20 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md hover:bg-white/[0.03] hover:border-white/10 transition-all duration-500 shadow-xl"
            >
                <Link to={detailPath} className="flex flex-col h-full">
                    <div className="relative aspect-[16/10] overflow-hidden">
                        <img 
                            src={post.coverImage} 
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                        <div className="absolute top-5 left-5">
                            <span className="px-4 py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white">
                                {post.category}
                            </span>
                        </div>
                    </div>
                    <div className="p-8 md:p-10 flex flex-col flex-grow">
                        <div className="flex items-center gap-4 text-gray-600 text-[10px] font-black uppercase tracking-[0.3em] mb-5">
                            <div className="flex items-center gap-2"><Clock size={12} /> {post.readingTime || 5} MIN</div>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <div>{new Date(post.publishDate).toLocaleDateString()}</div>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black font-heading uppercase leading-[1.1] tracking-tighter mb-6 transition-colors line-clamp-2 italic group-hover:text-white" style={{ '--hover-text': accentColor }}>
                            {post.title}
                        </h3>
                        <p className="text-gray-500 text-sm font-medium line-clamp-3 mb-10 flex-grow leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                            {post.shortDescription}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-8 border-t border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-white transition-colors">
                                BY {post.author || 'NEWBI TEAM'}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] transition-transform group-hover:translate-x-2" style={{ color: accentColor }}>
                                READ <ArrowUpRight size={12} />
                            </div>
                        </div>
                    </div>
                </Link>
            </motion.div>
        ),
        compact: (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="group relative"
            >
                <Link to={detailPath} className="flex gap-4 md:gap-8 items-center p-4 md:p-6 bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-[2.5rem] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500">
                    <div className="w-20 h-20 md:w-28 md:h-28 shrink-0 rounded-xl md:rounded-[2rem] overflow-hidden border border-white/10 shadow-lg">
                        <img src={post.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                    </div>
                    <div className="flex flex-col gap-2 md:gap-3 overflow-hidden">
                        <div className="flex items-center gap-3 md:gap-4">
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] whitespace-nowrap" style={{ color: accentColor }}>{post.category}</span>
                            <div className="w-1 h-1 rounded-full bg-white/10 hidden md:block" />
                            <span className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{post.readingTime || 5} MIN</span>
                        </div>
                        <h4 className="text-lg md:text-2xl font-black font-heading uppercase leading-[1.1] transition-colors line-clamp-2 italic tracking-tighter group-hover:text-white" style={{ '--hover-text': accentColor }}>
                            {post.title}
                        </h4>
                    </div>
                </Link>
            </motion.div>
        )
    };

    return variants[variant] || variants.standard;
};

export default BlogCard;

