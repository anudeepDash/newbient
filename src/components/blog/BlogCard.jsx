import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, User, ArrowUpRight, Tag, Calendar } from 'lucide-react';

const BlogCard = ({ post, variant = 'standard' }) => {
    // Generate the path based on the new category-slug structure
    const categorySlug = post.category?.toLowerCase().replace(' ', '-') || 'news';
    const detailPath = `/concert-zone/${categorySlug}/${post.slug}`;

    if (variant === 'carousel-item') {
        return (
            <Link to={detailPath} className="relative block w-full h-full rounded-[2.5rem] overflow-hidden group">
                <img 
                    src={post.coverImage} 
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-12 md:p-16">
                    <span className="inline-block px-4 py-1.5 bg-neon-blue text-black text-[10px] font-black uppercase tracking-widest rounded-full mb-6 italic flex items-center justify-center w-fit">
                        {post.category}
                    </span>
                    <h2 className="text-4xl md:text-6xl font-black font-heading uppercase leading-[0.9] tracking-tighter italic mb-6 group-hover:text-neon-blue transition-colors">
                        {post.title}
                    </h2>
                    <p className="text-gray-300 text-sm md:text-base font-medium max-w-2xl line-clamp-2 mb-8">
                        {post.shortDescription}
                    </p>
                    <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-white/60">
                        <div className="flex items-center gap-2">BY {post.author || 'NEWBI TEAM'}</div>
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue" />
                        <div className="flex items-center gap-2">{post.readingTime || 5} MIN READ</div>
                    </div>
                </div>
            </Link>
        );
    }

    if (variant === 'list-item') {
        return (
            <Link to={detailPath} className="flex gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all group border border-transparent hover:border-white/10">
                <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <div className="flex flex-col justify-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-neon-blue">{post.category}</span>
                    <h4 className="text-sm font-black font-heading uppercase leading-tight line-clamp-2 group-hover:text-white transition-colors">
                        {post.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest text-gray-500">
                        <span>{post.readingTime || 5} MIN</span>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <span>{new Date(post.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                </div>
            </Link>
        );
    }

    if (variant === 'grid-card-v2') {
        return (
            <motion.div
                whileHover={{ y: -10 }}
                className="group relative flex flex-col h-full bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl hover:border-white/20 transition-all duration-500"
            >
                <Link to={detailPath} className="flex flex-col h-full">
                    <div className="relative aspect-[4/5] overflow-hidden">
                        <img 
                            src={post.coverImage} 
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                        <div className="absolute top-6 left-6">
                            <span className="px-4 py-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-white flex items-center justify-center">
                                {post.category}
                            </span>
                        </div>
                    </div>
                    <div className="p-8 flex flex-col flex-grow">
                        <div className="flex items-center gap-4 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                            <div className="flex items-center gap-1.5"><Clock size={12} /> {post.readingTime || 5} MIN</div>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <div className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(post.publishDate).toLocaleDateString()}</div>
                        </div>
                        <h3 className="text-2xl font-black font-heading uppercase leading-[1.1] tracking-tight mb-4 group-hover:text-neon-blue transition-colors line-clamp-3">
                            {post.title}
                        </h3>
                        <p className="text-gray-400 text-sm font-medium line-clamp-2 mb-8 flex-grow">
                            {post.shortDescription}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                    <User size={14} className="text-gray-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                                    {post.author || 'NEWBI TEAM'}
                                </span>
                            </div>
                            <ArrowUpRight size={16} className="text-neon-blue opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </div>
                    </div>
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.div
            whileHover={{ y: -10 }}
            className="group relative flex flex-col h-full"
        >
            <Link to={detailPath} className="flex flex-col h-full bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl hover:border-white/20 transition-all duration-500">
                {/* Image Container */}
                <div className="relative aspect-[16/10] overflow-hidden">
                    <img 
                        src={post.coverImage} 
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    
                    {/* Category Overlay */}
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-white flex items-center justify-center">
                            {post.category}
                        </span>
                    </div>

                    {/* Quick Access Arrow */}
                    <div className="absolute top-4 right-4 translate-x-10 -translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500 bg-white text-black p-3 rounded-2xl shadow-xl">
                        <ArrowUpRight size={16} />
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col flex-grow">
                    <div className="flex items-center gap-4 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] mb-4">
                        <div className="flex items-center gap-1.5"><Clock size={10} /> {post.readingTime || 5} MIN</div>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <div className="flex items-center gap-1.5"><Calendar size={10} className="hidden sm:block" /> {new Date(post.publishDate).toLocaleDateString()}</div>
                    </div>

                    <h3 className="text-xl md:text-2xl font-black font-heading uppercase leading-[1.1] tracking-tight mb-4 group-hover:text-neon-blue transition-colors">
                        {post.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm font-medium line-clamp-3 mb-8 flex-grow">
                        {post.shortDescription}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                <User size={12} className="text-gray-500" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                                {post.author || 'NEWBI TEAM'}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-neon-blue group-hover:gap-2 transition-all">
                            View <ArrowUpRight size={10} />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};

export default BlogCard;
