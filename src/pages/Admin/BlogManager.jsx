import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Edit2, Trash2, Eye, MoreVertical, Newspaper, Clock, Star, Mail, Sparkles, CheckCircle2, LayoutGrid, List, Calendar, Radio, Music, FileText, TrendingUp, Users, Zap, MoreHorizontal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const BlogManager = () => {
    const { posts, deletePost, updatePost, subscribers, siteSettings, updateGeneralSettings } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [viewMode, setViewMode] = useState('grid');
    const [showTickerEditor, setShowTickerEditor] = useState(false);
    const [tickerItems, setTickerItems] = useState(siteSettings?.blogTicker || ['Welcome to ConcertZone', 'New stories every week']);
    const navigate = useNavigate();

    const coreContentTabs = [
        { name: 'Upcoming', path: '/admin/upcoming-events', icon: Calendar, color: 'text-neon-green' },
        { name: 'Announcements', path: '/admin/announcements', icon: Radio, color: 'text-neon-pink' },
        { name: 'Blog', path: '/admin/blog', icon: FileText, color: 'text-neon-blue' },
        { name: 'Portfolio', path: '/admin/concertzone', icon: Music, color: 'text-neon-purple' },
    ];

    const categories = ['All', 'Live Events', 'Artists', 'Guides', 'Buzz'];

    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
        const matchesStatus = selectedStatus === 'All' || post.status === selectedStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const handleDelete = async (id) => {
        if (window.confirm('Delete this article? This action is irreversible.')) {
            await deletePost(id);
            useStore.getState().addToast("ARTICLE_DELETED_SUCCESSFULLY.", 'success');
        }
    };

    const toggleFeatured = async (post) => {
        await updatePost(post.id, { featured: !post.featured });
        useStore.getState().addToast(post.featured ? "REMOVED_FROM_FEATURED." : "MARKED_AS_FEATURED.", 'success');
    };

    const handleSendNewsletter = (post) => {
        const params = new URLSearchParams({
            subject: `NEWSLETTER: ${post.title}`,
            header: post.title,
            body: post.shortDescription || post.content.substring(0, 200) + '...',
            heroImage: post.coverImage || '',
            ctaText: 'READ FULL STORY',
            ctaUrl: `${window.location.origin}/concertzone/${post.category?.toLowerCase().replace(' ', '-') || 'news'}/${post.slug}`
        });
        navigate(`/admin/mailing?${params.toString()}`);
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'CONTENT',
                subtitle: 'STUDIO',
                accentClass: 'text-neon-blue',
                icon: Newspaper
            }}
            tabs={coreContentTabs}
            accentColor="neon-blue"
            action={
                <Link to="/admin/blog/create">
                    <Button className="h-14 px-10 bg-neon-blue text-black font-black font-heading uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(0,255,255,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center">
                        <Plus size={22} className="mr-3" /> NEW ARTICLE
                    </Button>
                </Link>
            }
        >
            <div className="relative z-10 pb-20">
                {/* Status Bar - Refined alignment */}
                <div className="flex items-center gap-4 mb-12">
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/60">LIVE STATUS</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                        <span className="text-white">{posts.length} ARTICLES</span>
                        <span className="mx-3 text-white/10">•</span>
                        <span className="text-neon-blue">{subscribers.length} SUBSCRIBERS</span>
                    </p>
                </div>

                {/* Stats Grid - Ultra Premium */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
                    {[
                        { label: 'Total Reach', value: posts.reduce((acc, p) => acc + (p.viewCount || 0), 0), icon: TrendingUp, color: 'text-neon-blue', suffix: ' Views' },
                        { label: 'Published', value: posts.filter(p => p.status === 'Published').length, icon: CheckCircle2, color: 'text-neon-green', suffix: ' Live' },
                        { label: 'Drafts', value: posts.filter(p => p.status === 'Draft').length, icon: Clock, color: 'text-yellow-400', suffix: ' Pending' },
                        { label: 'Engagement', value: posts.filter(p => p.featured).length, icon: Star, color: 'text-neon-pink', suffix: ' Featured' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="p-8 bg-zinc-900/40 border-white/5 relative group overflow-hidden hover:border-white/10 transition-all">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{stat.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-4xl font-black font-heading leading-none italic">{stat.value}</h3>
                                        <span className="text-[10px] font-bold text-gray-600 uppercase">{stat.suffix}</span>
                                    </div>
                                </div>
                                <stat.icon size={56} className={`absolute right-4 bottom-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all ${stat.color}`} />
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Ticker Editor */}
                <div className="mb-12">
                    <button onClick={() => setShowTickerEditor(!showTickerEditor)}
                        className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors mb-4">
                        <Radio size={14} className="text-neon-blue" /> Manage Ticker Bar
                        <span className="text-gray-600">{showTickerEditor ? '▲' : '▼'}</span>
                    </button>
                    {showTickerEditor && (
                        <Card className="p-6 bg-zinc-900/40 border-white/5">
                            <p className="text-xs text-gray-500 mb-4">These items scroll across the top of the ConcertZone page.</p>
                            {tickerItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 mb-2">
                                    <input value={item} onChange={e => { const n = [...tickerItems]; n[idx] = e.target.value; setTickerItems(n); }}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neon-blue/40" />
                                    <button onClick={() => setTickerItems(tickerItems.filter((_, i) => i !== idx))}
                                        className="text-gray-600 hover:text-neon-pink transition-colors"><Trash2 size={14} /></button>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 mt-3">
                                <button onClick={() => setTickerItems([...tickerItems, ''])}
                                    className="h-8 px-4 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all flex items-center gap-1">
                                    <Plus size={12} /> Add Item
                                </button>
                                <button onClick={async () => {
                                    await updateGeneralSettings({ blogTicker: tickerItems.filter(i => i.trim()) });
                                    useStore.getState().addToast('Ticker updated successfully.', 'success');
                                }}
                                    className="h-8 px-4 bg-neon-blue text-black rounded-lg text-[10px] font-bold uppercase tracking-wider hover:scale-105 transition-all">
                                    Save Ticker
                                </button>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Control Bar */}
                <div className="flex flex-col xl:flex-row gap-6 mb-12 items-stretch xl:items-center">
                    <div className="relative flex-grow group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="SEARCH STORIES BY TITLE OR KEYWORD..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-16 bg-white/5 border border-white/10 rounded-[1.5rem] pl-16 pr-6 font-black font-heading uppercase tracking-widest text-[11px] text-white placeholder:text-white/10 focus:outline-none focus:border-neon-blue/50 transition-all backdrop-blur-xl"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>
                        
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="h-16 bg-zinc-900 border border-white/10 rounded-[1.5rem] px-8 font-black font-heading uppercase tracking-widest text-[10px] focus:outline-none focus:border-neon-blue/50 appearance-none cursor-pointer hover:bg-white/5 transition-all"
                        >
                            {categories.map(cat => <option key={cat} value={cat}>{cat === 'All' ? 'ALL CATEGORIES' : cat.toUpperCase()}</option>)}
                        </select>

                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="h-16 bg-zinc-900 border border-white/10 rounded-[1.5rem] px-8 font-black font-heading uppercase tracking-widest text-[10px] focus:outline-none focus:border-neon-blue/50 appearance-none cursor-pointer hover:bg-white/5 transition-all"
                        >
                            <option value="All">ALL STATUS</option>
                            <option value="Published">PUBLISHED</option>
                            <option value="Draft">DRAFTS</option>
                        </select>
                    </div>
                </div>

                {/* Content Display */}
                {viewMode === 'grid' ? (
                    <div className="flex md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 overflow-x-auto md:overflow-x-visible pb-8 snap-x snap-mandatory">
                        <AnimatePresence mode="popLayout">
                            {filteredPosts.map((post, i) => (
                                <motion.div
                                    key={post.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group relative shrink-0 w-[85vw] md:w-auto snap-center"
                                >
                                    <div className="bg-zinc-900/60 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl hover:border-neon-blue/20 transition-all duration-500 h-full flex flex-col">
                                        {/* Image Header */}
                                        <div className="relative aspect-video overflow-hidden">
                                            <img src={post.coverImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
                                            
                                            {/* Top Badges */}
                                            <div className="absolute top-6 left-6 flex items-center gap-2">
                                                <span className="px-4 py-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-white">
                                                    {post.category}
                                                </span>
                                                {post.featured && (
                                                    <span className="p-1.5 bg-neon-pink text-white rounded-lg shadow-[0_0_15px_rgba(255,80,139,0.5)]">
                                                        <Star size={12} fill="currentColor" />
                                                    </span>
                                                )}
                                            </div>

                                            <div className="absolute top-6 right-6">
                                                <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md border ${
                                                    post.status === 'Published' 
                                                        ? 'bg-neon-green/10 border-neon-green/20 text-neon-green shadow-[0_0_15px_rgba(0,255,0,0.1)]' 
                                                        : 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400'
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${post.status === 'Published' ? 'bg-neon-green' : 'bg-yellow-400'}`} />
                                                    {post.status}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content Area */}
                                        <div className="p-8 flex flex-col flex-grow">
                                            <div className="flex items-center gap-3 text-gray-500 text-[9px] font-black uppercase tracking-widest mb-4">
                                                <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                <span>{post.author || 'NEWBI TEAM'}</span>
                                            </div>
                                            
                                            <h3 className="text-xl font-black font-heading uppercase italic leading-tight mb-4 group-hover:text-neon-blue transition-colors line-clamp-2">
                                                {post.title}
                                            </h3>
                                            
                                            <p className="text-gray-400 text-xs font-medium line-clamp-2 mb-8 flex-grow">
                                                {post.shortDescription}
                                            </p>

                                            {/* Action Grid */}
                                            <div className="grid grid-cols-4 gap-3 pt-6 border-t border-white/5 mt-auto">
                                                <button 
                                                    onClick={() => navigate(`/concertzone/${post.category?.toLowerCase().replace(' ', '-') || 'news'}/${post.slug}`)}
                                                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-gray-400 hover:text-white transition-all flex items-center justify-center"
                                                    title="Preview"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => toggleFeatured(post)}
                                                    className={`p-4 border rounded-2xl transition-all flex items-center justify-center ${
                                                        post.featured 
                                                            ? 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink shadow-[0_0_15px_rgba(255,0,85,0.2)]' 
                                                            : 'bg-white/5 border-white/5 text-gray-400 hover:text-neon-pink hover:bg-neon-pink/5'
                                                    }`}
                                                    title={post.featured ? "Unfeature" : "Feature Story"}
                                                >
                                                    <Star size={18} fill={post.featured ? 'currentColor' : 'none'} />
                                                </button>
                                                <button 
                                                    onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                                                    className="p-4 bg-white/5 hover:bg-neon-blue/10 border border-white/5 hover:border-neon-blue/20 rounded-2xl text-gray-400 hover:text-neon-blue transition-all flex items-center justify-center"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <div className="relative group/menu">
                                                    <button className="w-full h-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-gray-400 hover:text-white transition-all flex items-center justify-center">
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                    {/* Floating Menu */}
                                                    <div className="absolute bottom-full right-0 mb-4 w-56 bg-zinc-900 border border-white/10 rounded-2xl p-2 opacity-0 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:pointer-events-auto transition-all translate-y-2 group-hover/menu:translate-y-0 backdrop-blur-3xl shadow-2xl z-50">
                                                        <button 
                                                            onClick={() => toggleFeatured(post)}
                                                            className="w-full p-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                        >
                                                            <Star size={16} fill={post.featured ? 'currentColor' : 'none'} className={post.featured ? 'text-neon-pink' : ''} /> 
                                                            {post.featured ? 'Unfeature' : 'Feature Story'}
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                if (window.confirm(`TRANSMIT DIRECT PUSH SIGNAL FOR "${post.title}"?`)) {
                                                                    await notifyAllUsers(
                                                                        `New Post: ${post.title}`,
                                                                        post.shortDescription || (post.content ? post.content.substring(0, 100) + '...' : ''),
                                                                        `/concertzone/${post.category?.toLowerCase().replace(' ', '-') || 'news'}/${post.slug}`,
                                                                        post.coverImage
                                                                    );
                                                                    useStore.getState().addToast("PUSH_SIGNAL_TRANSMITTED.", 'success');
                                                                }
                                                            }}
                                                            className="w-full p-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-neon-blue hover:bg-neon-blue/5 rounded-xl transition-all"
                                                        >
                                                            <Sparkles size={16} className="text-neon-blue" /> Direct Push
                                                        </button>
                                                        <button 
                                                            onClick={() => handleSendNewsletter(post)}
                                                            className="w-full p-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-neon-pink hover:bg-neon-pink/5 rounded-xl transition-all"
                                                        >
                                                            <Mail size={16} className="text-neon-pink" /> Send Newsletter
                                                        </button>
                                                        <div className="h-px bg-white/5 my-2" />
                                                        <button 
                                                            onClick={() => handleDelete(post.id)}
                                                            className="w-full p-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={16} /> Delete Article
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">ARTICLE_ID</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">CATEGORY</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">STATS</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">STATUS</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {filteredPosts.map((post, i) => (
                                        <motion.tr
                                            key={post.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <img src={post.coverImage} className="w-16 h-10 rounded-lg object-cover" alt="" />
                                                    <div>
                                                        <h4 className="font-bold uppercase text-xs leading-tight group-hover:text-neon-blue transition-colors">{post.title}</h4>
                                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{post.author || 'NEWBI TEAM'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                    {post.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500">
                                                    <span className="flex items-center gap-1.5"><Eye size={12} /> {post.viewCount || 0}</span>
                                                    <span className="flex items-center gap-1.5"><Mail size={12} /> {post.shareCount || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${post.status === 'Published' ? 'bg-neon-green shadow-[0_0_8px_rgba(0,255,0,0.5)]' : 'bg-yellow-400'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                                        {post.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => toggleFeatured(post)}
                                                        className={`p-3 border rounded-xl transition-all ${
                                                            post.featured 
                                                                ? 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink shadow-[0_0_15px_rgba(255,0,85,0.2)]' 
                                                                : 'bg-white/5 border-white/5 text-gray-400 hover:text-neon-pink hover:bg-neon-pink/5'
                                                        }`}
                                                        title={post.featured ? "Unfeature" : "Feature Story"}
                                                    >
                                                        <Star size={16} fill={post.featured ? 'currentColor' : 'none'} />
                                                    </button>
                                                    <button onClick={() => navigate(`/admin/blog/edit/${post.id}`)} className="p-3 bg-white/5 hover:bg-neon-blue/10 border border-white/5 hover:border-neon-blue/20 rounded-xl text-gray-400 hover:text-neon-blue transition-all"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(post.id)} className="p-3 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-xl text-gray-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredPosts.length === 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-40 text-center"
                    >
                        <Zap size={64} className="mx-auto text-gray-800 mb-8" />
                        <h3 className="text-2xl font-black font-heading uppercase italic text-gray-500 tracking-widest mb-4">NO STORIES DETECTED.</h3>
                        <p className="text-gray-600 font-medium max-w-sm mx-auto mb-12">
                            The frequency is quiet. Start broadcasting new stories to the Concert Zone.
                        </p>
                        <Link to="/admin/blog/create">
                            <Button className="h-14 px-12 bg-white text-black font-black uppercase tracking-widest rounded-2xl">
                                START BROADCAST
                            </Button>
                        </Link>
                    </motion.div>
                )}
            </div>
        </AdminCommunityHubLayout>
    );
};

export default BlogManager;

