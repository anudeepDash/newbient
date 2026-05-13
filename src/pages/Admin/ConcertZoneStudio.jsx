import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Layout as LayoutIcon, 
    Newspaper, 
    Mail, 
    Plus, 
    Search, 
    Settings, 
    Eye, 
    Star, 
    Edit2, 
    Trash2, 
    Sparkles, 
    ChevronRight,
    Zap,
    Clock,
    User,
    CheckCircle2,
    Calendar,
    ArrowUpRight,
    MousePointer2,
    Palette,
    Radio,
    Music
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import WeeklyNewsletterGenerator from '../../components/admin/WeeklyNewsletterGenerator';
import { TEST_POSTS } from '../ConcertZoneBlog';

const ConcertZoneStudio = () => {
    const { posts, deletePost, updatePost, siteSettings, updateGeneralSettings } = useStore();
    const [activeTab, setActiveTab] = useState('LAYOUT');
    const navigate = useNavigate();

    // Layout Tab State
    const [layoutSettings, setLayoutSettings] = useState({
        mastheadVol: 'VOL 01',
        mastheadEst: 'EST. 2026',
        heroSubtitle: 'MUSIC, LIFE & CULTURE.',
        accentColor: '#00ffff' // Default neon blue
    });

    useEffect(() => {
        if (siteSettings?.concertzone) {
            setLayoutSettings(siteSettings.concertzone);
        }
    }, [siteSettings]);

    const handleSaveLayout = async () => {
        await updateGeneralSettings({
            concertzone: layoutSettings
        });
        useStore.getState().addToast("HUB_LAYOUT_SYNCHRONIZED.", "success");
    };

    // Newsletter Tab State
    const [showNewsletterEngine, setShowNewsletterEngine] = useState(false);
    const [newsletterArticles, setNewsletterArticles] = useState([]);

    const recentPosts = useMemo(() => {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        return posts.filter(p => new Date(p.publishDate) >= lastWeek);
    }, [posts]);

    const coreContentTabs = [
        { name: 'Upcoming', path: '/admin/upcoming-events', icon: Calendar, color: 'text-neon-green' },
        { name: 'Announcements', path: '/admin/announcements', icon: Radio, color: 'text-neon-pink' },
        { name: 'Blog', path: '/admin/blog', icon: Newspaper, color: 'text-neon-blue' },
        { name: 'Portfolio', path: '/admin/concertzone', icon: Music, color: 'text-neon-purple' },
    ];

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'CONCERTZONE',
                subtitle: 'STUDIO',
                accentClass: 'text-neon-blue',
                icon: Zap
            }}
            tabs={coreContentTabs}
            accentColor="neon-blue"
        >
            <div className="relative z-10 space-y-12 pb-32">
                {/* Visual Tab Switcher */}
                <div className="flex bg-black/40 p-2 rounded-3xl border border-white/5 w-fit">
                    {[
                        { id: 'LAYOUT', label: 'PAGE TAB', icon: LayoutIcon },
                        { id: 'EDITORIAL', label: 'CONTENT STUDIO', icon: Newspaper },
                        { id: 'NEWSLETTER', label: 'WEEKLY BY CONCERT ZONE', icon: Mail },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                activeTab === tab.id 
                                ? 'bg-neon-blue text-black shadow-lg' 
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'LAYOUT' && (
                        <motion.div 
                            key="layout"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12"
                        >
                            {/* Visual Editor Card */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-8">
                                    <div className="relative group rounded-[3rem] border border-white/10 bg-[#060606] overflow-hidden p-12 md:p-20 shadow-2xl">
                                        <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 via-transparent to-neon-pink/5 opacity-50" />
                                        
                                        <div className="relative z-10 space-y-12 h-full flex flex-col justify-center items-center text-center py-20">
                                            {/* Neural Background Elements */}
                                            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                                                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neon-blue/10 via-transparent to-transparent blur-3xl" />
                                            </div>

                                            <div className="relative z-10 space-y-10">
                                                <div className="flex flex-col items-center">
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 group/badge cursor-pointer"
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-ping" />
                                                        <input 
                                                            value={layoutSettings.heroSubtitle}
                                                            onChange={(e) => setLayoutSettings({...layoutSettings, heroSubtitle: e.target.value})}
                                                            className="bg-transparent border-none focus:ring-0 text-[9px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-white transition-colors w-64 text-center outline-none"
                                                        />
                                                    </motion.div>

                                                    <h1 className="text-3xl md:text-5xl font-black font-heading uppercase tracking-tighter leading-[0.85] italic mb-10 flex flex-col items-center pointer-events-none">
                                                        <span className="text-white opacity-90">CONCERT</span>
                                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-pink not-italic relative mt-2 px-4">
                                                            ZONE.
                                                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-30" />
                                                        </span>
                                                    </h1>

                                                    <div className="flex items-center gap-6 px-8 py-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-xl group/meta">
                                                        <div className="flex items-center gap-4">
                                                            <input 
                                                                value={layoutSettings.mastheadEst}
                                                                onChange={(e) => setLayoutSettings({...layoutSettings, mastheadEst: e.target.value})}
                                                                className="bg-transparent border-none focus:ring-0 text-[9px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white/60 transition-colors w-24 text-center outline-none"
                                                            />
                                                            <div className="w-[1px] h-3 bg-white/10" />
                                                            <input 
                                                                value={layoutSettings.mastheadVol}
                                                                onChange={(e) => setLayoutSettings({...layoutSettings, mastheadVol: e.target.value})}
                                                                className="bg-transparent border-none focus:ring-0 text-[9px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-white transition-colors w-24 text-center outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* High-Fidelity Hub Preview Simulation (Fully Interactive) */}
                                    <div className="pt-20 space-y-12">
                                        <div className="flex items-center justify-between mb-12">
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Interactive Editorial Workbench</h3>
                                                <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Click any text to update // Hover to manage narratives</p>
                                            </div>
                                        </div>
                                        
                                        {/* Main Layout Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-fit">
                                            {/* Left Side: Hero Narrative (Inline Editable) */}
                                            <div className="lg:col-span-8">
                                                {(posts.filter(p => p.status === 'Published').length > 0 ? posts.filter(p => p.status === 'Published').slice(0, 1) : [TEST_POSTS[0]]).map((p, i) => (
                                                    <div key={p.id || i} className="relative rounded-[3rem] overflow-hidden border border-white/10 bg-[#060606] h-full flex flex-col min-h-[550px] group/hero">
                                                        <div className="absolute inset-0 opacity-40">
                                                            <img src={p.coverImage} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-transparent" />
                                                        </div>

                                                        {/* Admin Overlays */}
                                                        <div className="absolute top-8 right-8 z-30 opacity-0 group-hover/hero:opacity-100 transition-all flex gap-3">
                                                            <button 
                                                                onClick={() => updatePost(p.id, { featured: false })} 
                                                                className="px-4 py-2 bg-black/80 text-[9px] font-black uppercase tracking-widest text-white border border-white/10 rounded-xl hover:bg-neon-pink hover:text-white transition-all"
                                                            >
                                                                Unfeature
                                                            </button>
                                                            <button 
                                                                onClick={() => navigate(`/admin/blog/edit/${p.id}`)}
                                                                className="p-3 bg-neon-blue text-black rounded-xl shadow-lg hover:scale-110 transition-all"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        </div>

                                                        <div className="relative z-10 p-12 flex-1 flex flex-col justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <input 
                                                                    value={p.category}
                                                                    onChange={(e) => updatePost(p.id, { category: e.target.value })}
                                                                    className="px-5 py-2 bg-neon-blue text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-md border-none focus:ring-0 w-fit cursor-text"
                                                                />
                                                                <div className="px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[8px] font-black text-white/60 flex items-center gap-2 uppercase tracking-widest">
                                                                    <Clock size={12} className="text-neon-blue" /> 
                                                                    <input 
                                                                        value={p.readingTime || 8}
                                                                        onChange={(e) => updatePost(p.id, { readingTime: parseInt(e.target.value) })}
                                                                        className="bg-transparent border-none focus:ring-0 w-8 p-0 text-center outline-none"
                                                                    /> MIN
                                                                </div>
                                                            </div>

                                                            <div className="space-y-6 max-w-2xl">
                                                                <textarea 
                                                                    value={p.title}
                                                                    onChange={(e) => updatePost(p.id, { title: e.target.value })}
                                                                    className="w-full bg-transparent border-none focus:ring-0 text-6xl font-black font-heading uppercase italic tracking-tighter text-white leading-[0.9] overflow-hidden resize-none p-0"
                                                                    rows={2}
                                                                />
                                                                <textarea 
                                                                    value={p.shortDescription}
                                                                    onChange={(e) => updatePost(p.id, { shortDescription: e.target.value })}
                                                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-500 uppercase tracking-widest leading-relaxed overflow-hidden resize-none p-0"
                                                                    rows={3}
                                                                />
                                                                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-gray-600">
                                                                    <span className="flex items-center gap-2">
                                                                        <User size={12} className="text-neon-blue" /> 
                                                                        <input 
                                                                            value={p.author || 'NEWBI EDITORIAL'}
                                                                            onChange={(e) => updatePost(p.id, { author: e.target.value })}
                                                                            className="bg-transparent border-none focus:ring-0 p-0 text-gray-400 w-32"
                                                                        />
                                                                    </span>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                                                                    <span>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Floating Categories Bar Simulation */}
                                                        <div className="relative z-10 mx-10 mb-6 bg-black/80 backdrop-blur-3xl border border-white/5 rounded-2xl p-2 flex items-center justify-between">
                                                            <div className="flex gap-1">
                                                                {['ALL', 'LIVE EVENTS', 'ARTISTS', 'GUIDES', 'BUZZ'].map((cat, idx) => (
                                                                    <span key={idx} className={`px-4 py-2 rounded-xl text-[7px] font-black uppercase tracking-widest transition-all ${idx === 0 ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>
                                                                        {cat}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Right Side: Featured Sidebar (Interactive) */}
                                            <div className="lg:col-span-4 flex flex-col gap-6">
                                                <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-8 flex-1 space-y-8 relative">
                                                    <div className="flex items-center justify-between mb-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-neon-pink shadow-[0_0_10px_#ff0055]" />
                                                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Featured Stack</h4>
                                                        </div>
                                                        <button onClick={() => navigate('/admin/blog')} className="text-[8px] font-black text-neon-blue hover:underline uppercase tracking-widest">Manage All</button>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {(posts.filter(p => p.status === 'Published').length > 1 ? posts.filter(p => p.status === 'Published').slice(0, 3) : TEST_POSTS.slice(0, 3)).map((p, i) => (
                                                            <motion.div 
                                                                key={p.id || i} 
                                                                whileHover={{ x: 5 }}
                                                                className="group relative flex gap-5 items-center p-4 bg-white/[0.02] border border-white/5 rounded-[2rem] transition-all overflow-hidden"
                                                            >
                                                                {i === 0 && (
                                                                    <div className="absolute bottom-0 left-0 h-1 bg-neon-blue w-2/3 z-20" />
                                                                )}
                                                                
                                                                {/* Remove/Orchestration Control */}
                                                                <button 
                                                                    onClick={() => updatePost(p.id, { status: 'Draft' })}
                                                                    className="absolute top-2 right-2 p-2 bg-black/60 text-neon-pink rounded-lg border border-neon-pink/20 opacity-0 group-hover:opacity-100 transition-all hover:bg-neon-pink hover:text-white"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>

                                                                <div className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0">
                                                                    <img src={p.coverImage} className="w-full h-full object-cover grayscale-[30%]" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <input 
                                                                            value={p.category}
                                                                            onChange={(e) => updatePost(p.id, { category: e.target.value })}
                                                                            className="text-[7px] font-black uppercase text-neon-blue tracking-widest bg-transparent border-none focus:ring-0 p-0 w-16"
                                                                        />
                                                                        <div className="w-1 h-1 rounded-full bg-white/10" />
                                                                        <span className="text-[7px] font-bold text-gray-600">{p.readingTime || 5} MIN</span>
                                                                    </div>
                                                                    <textarea 
                                                                        value={p.title}
                                                                        onChange={(e) => updatePost(p.id, { title: e.target.value })}
                                                                        className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase italic tracking-tighter text-white line-clamp-2 leading-tight w-full resize-none p-0 overflow-hidden"
                                                                        rows={2}
                                                                    />
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-4 space-y-6">
                                    <Card className="p-8 space-y-8">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Palette size={16} className="text-neon-blue" />
                                            <h3 className="text-xs font-black uppercase tracking-widest text-white">Global Accents</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Theme Accent</label>
                                            <div className="flex gap-4">
                                                {['#00ffff', '#ff0055', '#bb00ff', '#00ff66'].map(color => (
                                                    <button 
                                                        key={color}
                                                        onClick={() => setLayoutSettings({...layoutSettings, accentColor: color})}
                                                        className={`w-12 h-12 rounded-2xl border-4 transition-all ${
                                                            layoutSettings.accentColor === color 
                                                            ? 'border-white scale-110 shadow-xl' 
                                                            : 'border-transparent'
                                                        }`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-white/5">
                                            <Button 
                                                onClick={handleSaveLayout}
                                                className="w-full h-16 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02]"
                                            >
                                                Apply Changes
                                            </Button>
                                        </div>
                                    </Card>

                                    <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4">
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] leading-relaxed">
                                            The Page Layout tab allows you to live-sync the masthead and branding of the editorial hub. All changes are reflected instantly across the public platform.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'EDITORIAL' && (
                        <motion.div 
                            key="editorial"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-black font-heading uppercase italic tracking-tighter text-neon-blue">Content Studio</h2>
                                <Link to="/admin/blog/create">
                                    <Button className="h-12 px-8 bg-neon-blue text-black font-black uppercase text-[10px] tracking-widest rounded-xl">
                                        <Plus size={16} className="mr-2" /> New Article
                                    </Button>
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {(posts.length > 0 ? posts : TEST_POSTS).map(post => (
                                    <Card key={post.id} className="group overflow-hidden border-white/5 hover:border-white/10 transition-all flex flex-col">
                                        <div className="relative aspect-[16/9] overflow-hidden">
                                            <img 
                                                src={post.coverImage} 
                                                className="w-full h-full" 
                                                style={{ 
                                                    objectFit: 'cover',
                                                    transform: `scale(${post.coverImageScale || 1})`,
                                                    transformOrigin: `${post.coverImagePosX ?? 50}% ${post.coverImagePosY ?? 50}%`
                                                }}
                                                alt="" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                            
                                            <div className="absolute top-4 left-4 flex gap-2">
                                                <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[8px] font-black text-white uppercase tracking-widest">{post.category}</span>
                                            </div>

                                            <div className="absolute top-4 right-4">
                                                <button 
                                                    onClick={() => updatePost(post.id, { featured: !post.featured })}
                                                    className={`p-2 rounded-xl border transition-all ${
                                                        post.featured ? 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink shadow-lg' : 'bg-black/60 border-white/10 text-white/40 hover:text-white'
                                                    }`}
                                                >
                                                    <Star size={14} fill={post.featured ? 'currentColor' : 'none'} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-4 flex-1 flex flex-col">
                                            <h3 className="text-lg font-black uppercase tracking-tighter italic leading-tight group-hover:text-neon-blue transition-colors line-clamp-2">{post.title}</h3>
                                            
                                            <div className="flex items-center gap-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5"><Clock size={12} /> {post.readingTime || 5} MIN</span>
                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                                            </div>

                                            <div className="flex items-center gap-2 pt-4 border-t border-white/5 mt-auto">
                                                {/* Quick Accent Color Picker for Article */}
                                                <div className="flex items-center gap-1.5 p-1.5 bg-black/40 rounded-lg border border-white/5">
                                                    {['#00ffff', '#ff0055', '#bb00ff', '#00ff66'].map(color => (
                                                        <button 
                                                            key={color}
                                                            onClick={() => updatePost(post.id, { accentColor: color })}
                                                            className={`w-4 h-4 rounded-full transition-all ${
                                                                (post.accentColor || '#00ffff') === color ? 'ring-2 ring-white scale-110' : 'opacity-40 hover:opacity-100'
                                                            }`}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex-1" />
                                                <div className="flex gap-2">
                                                    <button onClick={() => navigate(`/admin/blog/edit/${post.id}`)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><Edit2 size={14} /></button>
                                                    <button onClick={() => navigate(`/concertzone/${post.category?.toLowerCase()}/${post.slug}`)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><Eye size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'NEWSLETTER' && (
                        <motion.div 
                            key="newsletter"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-4 space-y-8">
                                    <div className="p-8 bg-zinc-900 border border-white/5 rounded-[3rem] space-y-8">
                                        <div className="flex items-center gap-3">
                                            <Sparkles size={20} className="text-neon-pink" />
                                            <h2 className="text-xl font-black font-heading uppercase italic tracking-tighter">Weekly Briefing Engine</h2>
                                        </div>
                                        
                                        <div className="space-y-6">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">
                                                This engine automatically identifies top stories from the past week to generate the signature "Weekly by Concert Zone" briefing.
                                            </p>
                                            
                                            <div className="space-y-4">
                                                <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40">PAST 7 DAYS ACTIVITY</h4>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">New Stories</span>
                                                        <span className="text-lg font-black font-heading text-neon-blue">{recentPosts.length}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button 
                                                onClick={() => {
                                                    // Pass the raw post objects for intelligent synthesis
                                                    setNewsletterArticles(recentPosts);
                                                    setShowNewsletterEngine(true);
                                                }}
                                                className="w-full h-16 bg-neon-pink text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(255,0,85,0.3)]"
                                            >
                                                Initialize Weekly Brief
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-8">
                                    <div className="p-12 rounded-[4rem] bg-white/[0.01] border border-dashed border-white/10 flex flex-col items-center justify-center text-center min-h-[500px]">
                                        <Mail size={64} className="text-white/5 mb-8" />
                                        <h3 className="text-2xl font-black font-heading uppercase italic tracking-tighter text-white/20 mb-4">No Active Briefing Session</h3>
                                        <p className="max-w-md text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Click Initialize to pull latest narratives and build your weekly mailer.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {showNewsletterEngine && (
                <WeeklyNewsletterGenerator 
                    onClose={() => setShowNewsletterEngine(false)}
                    initialSelectedPosts={newsletterArticles}
                />
            )}
        </AdminCommunityHubLayout>
    );
};

export default ConcertZoneStudio;
