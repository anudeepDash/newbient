import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Search, 
    Filter, 
    Edit2, 
    Trash2, 
    Eye, 
    MoreVertical, 
    ArrowLeft,
    Newspaper,
    CheckCircle2,
    Clock,
    Star,
    ExternalLink,
    Mail,
    Send
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const BlogManager = () => {
    const { posts, deletePost, updatePost, subscribers } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const navigate = useNavigate();

    const categories = ['All', 'Live Events', 'Artists', 'Guides', 'Buzz'];

    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
        const matchesStatus = selectedStatus === 'All' || post.status === selectedStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            await deletePost(id);
        }
    };

    const toggleFeatured = async (post) => {
        await updatePost(post.id, { featured: !post.featured });
    };

    const handleSendNewsletter = async (post) => {
        if (!post.sendAsNewsletter && !window.confirm('This post is not marked for newsletter. Send anyway?')) {
            return;
        }
        
        if (window.confirm(`Send "${post.title}" to ${subscribers.length} subscribers?`)) {
            // Logic to trigger email send would go here
            alert('Newsletter distribution initiated! (Mock logic)');
        }
    };


    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-32">
            <div className="max-w-[1400px] mx-auto px-6">
                
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                    <div>
                        <Link to="/admin" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors mb-6">
                            <ArrowLeft size={16} /> Back to Dashboard
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black font-heading uppercase tracking-tighter italic">
                            BLOG <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white">MANAGEMENT.</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-2">
                            Concert Zone Content System • <span className="text-neon-blue">{subscribers.length} Subscribers</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link to="/admin/blog/create">
                            <Button className="h-14 px-8 bg-neon-blue text-black font-black font-heading uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(0,255,255,0.2)] hover:scale-105 active:scale-95 transition-all">
                                <Plus size={20} className="mr-2" /> New Post
                            </Button>
                        </Link>
                    </div>
                </header>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Total Posts', value: posts.length, icon: Newspaper, color: 'text-white' },
                        { label: 'Published', value: posts.filter(p => p.status === 'Published').length, icon: CheckCircle2, color: 'text-neon-green' },
                        { label: 'Drafts', value: posts.filter(p => p.status === 'Draft').length, icon: Clock, color: 'text-yellow-400' },
                        { label: 'Subscribers', value: subscribers.length, icon: Star, color: 'text-neon-pink' },
                    ].map((stat, i) => (
                        <Card key={i} className="p-6 bg-zinc-900/40 border-white/5 flex items-center justify-between overflow-hidden relative group">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{stat.label}</p>
                                <h3 className="text-3xl font-black font-heading leading-none">{stat.value}</h3>
                            </div>
                            <stat.icon size={48} className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.05] group-hover:opacity-10 transition-opacity ${stat.color}`} />
                        </Card>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row gap-6 mb-8 items-stretch xl:items-center">
                    <div className="relative flex-grow group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-neon-blue/50 transition-all backdrop-blur-xl"
                        />
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="h-14 bg-zinc-900 border border-white/10 rounded-2xl px-6 font-black font-heading uppercase tracking-widest text-[10px] focus:outline-none focus:border-neon-blue/50"
                        >
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="h-14 bg-zinc-900 border border-white/10 rounded-2xl px-6 font-black font-heading uppercase tracking-widest text-[10px] focus:outline-none focus:border-neon-blue/50"
                        >
                            <option value="All">All Status</option>
                            <option value="Published">Published</option>
                            <option value="Draft">Draft</option>
                        </select>
                    </div>
                </div>

                {/* Posts Table/Grid */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Article</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {filteredPosts.map((post, i) => (
                                        <motion.tr
                                            key={post.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/5">
                                                        <img src={post.coverImage} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold uppercase leading-tight group-hover:text-neon-blue transition-colors">{post.title}</h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{post.author || 'NEWBI TEAM'}</span>
                                                            {post.featured && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-pink/10 text-neon-pink text-[8px] font-black border border-neon-pink/20 uppercase tracking-widest">
                                                                    <Star size={8} fill="currentColor" /> Featured
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-300">
                                                    {post.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {post.publishDate ? new Date(post.publishDate).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${post.status === 'Published' ? 'bg-neon-green shadow-[0_0_8px_rgba(0,255,0,0.5)]' : 'bg-yellow-400 shadow-[0_0_8px_rgba(255,255,0,0.5)]'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                                        {post.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => navigate(`/concert-zone-new/${post.slug}`)}
                                                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
                                                        title="View Post"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                                                        className="p-3 bg-white/5 hover:bg-neon-blue/10 border border-white/5 hover:border-neon-blue/20 rounded-xl text-gray-400 hover:text-neon-blue transition-all"
                                                        title="Edit Post"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => toggleFeatured(post)}
                                                        className={`p-3 bg-white/5 border border-white/5 rounded-xl transition-all ${post.featured ? 'text-neon-pink hover:bg-neon-pink/10 border-neon-pink/20' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                        title="Toggle Featured"
                                                    >
                                                        <Star size={18} fill={post.featured ? 'currentColor' : 'none'} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSendNewsletter(post)}
                                                        className={`p-3 bg-white/5 border border-white/5 rounded-xl transition-all ${post.sendAsNewsletter ? 'text-neon-blue hover:bg-neon-blue/10 border-neon-blue/20' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                        title="Send as Newsletter"
                                                    >
                                                        <Mail size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(post.id)}
                                                        className="p-3 bg-white/5 hover:bg-neon-pink/10 border border-white/5 hover:border-neon-pink/20 rounded-xl text-gray-400 hover:text-neon-pink transition-all"
                                                        title="Delete Post"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {filteredPosts.length === 0 && (
                        <div className="py-20 text-center">
                            <p className="text-gray-500 font-bold uppercase tracking-widest">No articles found matching filters.</p>
                            <Link to="/admin/blog/create" className="text-neon-blue text-sm font-black mt-4 inline-block uppercase tracking-widest hover:underline">
                                Create your first post
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BlogManager;
