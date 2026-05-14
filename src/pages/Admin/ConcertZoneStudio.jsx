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
    Music,
    Monitor,
    Smartphone,
    Globe,
    ExternalLink,
    Ticket
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const ConcertZoneStudio = () => {
    const { posts, deletePost, updatePost, siteSettings, updateGeneralSettings, addToast } = useStore();
    const [activeTab, setActiveTab] = useState('LAYOUT');
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState('desktop');
    const navigate = useNavigate();

    // Layout State
    const [layoutSettings, setLayoutSettings] = useState({
        mastheadVol: 'VOL 01',
        mastheadEst: 'EST. 2026',
        heroSubtitle: 'MUSIC, LIFE & CULTURE.',
        accentColor: '#00ffff'
    });

    useEffect(() => {
        if (siteSettings?.concertzone) {
            setLayoutSettings(siteSettings.concertzone);
        }
    }, [siteSettings]);

    const handleSaveLayout = async () => {
        setIsSaving(true);
        try {
            await updateGeneralSettings({
                concertzone: layoutSettings
            });
            addToast("HUB_LAYOUT_SYNCHRONIZED.", "success");
        } catch (error) {
            addToast("Failed to sync layout.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const recentPosts = useMemo(() => {
        return [...posts]
            .filter(p => p.status === 'Published')
            .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
            .slice(0, 10);
    }, [posts]);

    const coreContentTabs = [
        { name: 'Upcoming', path: '/admin/upcoming-events', icon: Calendar, color: 'text-neon-green' },
        { name: 'Announcements', path: '/admin/announcements', icon: Radio, color: 'text-neon-pink' },
        { name: 'Blog', path: '/admin/blog', icon: Newspaper, color: 'text-neon-blue' },
        { name: 'Portfolio', path: '/admin/concertzone', icon: Music, color: 'text-neon-purple' },
    ];

    const categoryColors = {
        'Live Events': '#00ffff',
        'Artists': '#e11d48',
        'Guides': '#a855f7',
        'Buzz': '#facc15',
        'Community': '#10b981'
    };

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
            {/* Immersive Atmospheric Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }}></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-blue/5 blur-[150px] -mr-64 -mt-64 rounded-full" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-neon-pink/5 blur-[150px] -ml-64 -mb-64 rounded-full" />
            </div>

            <div className="relative z-10 space-y-12 pb-32">
                {/* Visual Tab Switcher - Glass Pill Style */}
                <div className="flex bg-black/40 backdrop-blur-3xl p-2 rounded-[2.5rem] border border-white/10 w-fit mx-auto shadow-2xl overflow-x-auto no-scrollbar max-w-full">
                    {[
                        { id: 'LAYOUT', label: 'HUB LAYOUT', icon: LayoutIcon },
                        { id: 'EDITORIAL', label: 'CONTENT STACK', icon: Newspaper },
                        { id: 'NEWSLETTER', label: 'NEWSLETTER', icon: Mail },
                        { id: 'COMMERCIALS', label: 'SPONSORS', icon: Zap },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-3 px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                                activeTab === tab.id 
                                ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.2)] scale-105" 
                                : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <tab.icon size={14} className={cn(activeTab === tab.id ? "text-black" : "text-gray-500")} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'LAYOUT' && (
                        <motion.div 
                            key="layout"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="space-y-12"
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black font-heading uppercase italic tracking-tighter text-white">Hub Visualization</h3>
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Live synchronization with public platform</p>
                                </div>
                                <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10 shadow-xl">
                                    <button 
                                        onClick={() => setViewMode('desktop')}
                                        className={cn("px-6 py-2 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest", viewMode === 'desktop' ? "bg-white text-black" : "text-gray-500")}
                                    >
                                        <Monitor size={14} className="inline mr-2" /> Desktop
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('mobile')}
                                        className={cn("px-6 py-2 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest", viewMode === 'mobile' ? "bg-white text-black" : "text-gray-500")}
                                    >
                                        <Smartphone size={14} className="inline mr-2" /> Mobile
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-8">
                                    <div className={cn(
                                        "mx-auto transition-all duration-700 rounded-[4rem] border border-white/10 bg-[#050505] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative",
                                        viewMode === 'mobile' ? "max-w-[400px] aspect-[9/19]" : "w-full min-h-[600px]"
                                    )}>
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-neon-blue/10 via-transparent to-transparent pointer-events-none" />
                                        
                                        <div className="relative z-10 p-12 md:p-20 space-y-12 h-full flex flex-col justify-center items-start text-left">
                                            <div className="space-y-8 w-full max-w-2xl">
                                                    <div className="flex flex-col items-start gap-6">
                                                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl">
                                                            <div 
                                                                className="w-1.5 h-1.5 rounded-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" 
                                                                style={{ backgroundColor: layoutSettings.accentColor }}
                                                            />
                                                            <input 
                                                                value={layoutSettings.heroSubtitle}
                                                                onChange={(e) => setLayoutSettings({...layoutSettings, heroSubtitle: e.target.value})}
                                                                className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-[0.5em] text-white/40 hover:text-white transition-colors text-left outline-none w-full"
                                                                placeholder="SUBTITLE..."
                                                            />
                                                        </div>
    
                                                        <h1 className="text-5xl md:text-8xl font-black font-heading uppercase tracking-tighter italic leading-[0.8]">
                                                            <span className="block text-white">CONCERT</span>
                                                            <span 
                                                                className="block text-transparent bg-clip-text"
                                                                style={{ backgroundImage: `linear-gradient(to right, ${layoutSettings.accentColor}, #ffffff, ${layoutSettings.accentColor}dd)` }}
                                                            >
                                                                ZONE.
                                                            </span>
                                                        </h1>
    
                                                        <div className="flex items-center gap-8 px-10 py-5 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-2xl">
                                                        <input 
                                                            value={layoutSettings.mastheadEst}
                                                            onChange={(e) => setLayoutSettings({...layoutSettings, mastheadEst: e.target.value})}
                                                            className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white/60 transition-colors w-24 text-center outline-none"
                                                        />
                                                        <div className="w-[1px] h-4 bg-white/10" />
                                                        <input 
                                                            value={layoutSettings.mastheadVol}
                                                            onChange={(e) => setLayoutSettings({...layoutSettings, mastheadVol: e.target.value})}
                                                            className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-white transition-colors w-24 text-center outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-4 space-y-8">
                                    <Card className="p-10 bg-zinc-950/50 backdrop-blur-3xl border-white/10 rounded-[3rem] space-y-10">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20">
                                                    <Palette size={20} />
                                                </div>
                                                <h3 className="text-sm font-black uppercase tracking-widest text-white">Global Aesthetic</h3>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Accent Signature</label>
                                                <div className="flex flex-wrap gap-4 p-5 bg-white/[0.02] border border-white/10 rounded-[2rem]">
                                                    {['#00ffff', '#ff0055', '#bb00ff', '#00ff66', '#ffffff'].map(color => (
                                                        <button 
                                                            key={color}
                                                            onClick={() => setLayoutSettings({...layoutSettings, accentColor: color})}
                                                            className={cn(
                                                                "w-12 h-12 rounded-2xl border-4 transition-all duration-500",
                                                                layoutSettings.accentColor === color ? "border-white scale-110 shadow-2xl" : "border-transparent opacity-40 hover:opacity-100"
                                                            )}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-white/5">
                                            <Button 
                                                onClick={handleSaveLayout}
                                                disabled={isSaving}
                                                className="w-full h-20 text-black font-black uppercase tracking-[0.2em] rounded-3xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                                                style={{ 
                                                    backgroundColor: layoutSettings.accentColor,
                                                    boxShadow: `0 20px 50px ${layoutSettings.accentColor}33`
                                                }}
                                            >
                                                {isSaving ? <LoadingSpinner size="xs" color="black" /> : 'SYNC REALITY'}
                                            </Button>
                                        </div>
                                    </Card>

                                    <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5">
                                        <div className="flex gap-4">
                                            <Globe className="text-gray-600 shrink-0" size={18} />
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-relaxed">
                                                Changes made here update the core identity of the Concert Zone across all devices globally.
                                            </p>
                                        </div>
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
                            className="space-y-12"
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black font-heading uppercase italic tracking-tighter text-white">Editorial Stack</h3>
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">{posts.length} Narratives in production</p>
                                </div>
                                <Link to="/admin/blog/create">
                                    <Button className="h-16 px-10 bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                        <Plus size={18} className="mr-3" /> Create Narrative
                                    </Button>
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {posts.map(post => (
                                    <motion.div 
                                        key={post.id}
                                        whileHover={{ y: -10 }}
                                        className="group relative flex flex-col bg-zinc-950/50 border border-white/10 rounded-[3rem] overflow-hidden backdrop-blur-3xl shadow-2xl transition-all duration-700"
                                    >
                                        <div className="relative aspect-[16/10] overflow-hidden">
                                            <img 
                                                src={post.coverImage} 
                                                className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-[1500ms]" 
                                                style={{ 
                                                    objectFit: 'cover',
                                                    transform: `scale(${post.coverImageScale || 1})`,
                                                    transformOrigin: `${post.coverImagePosX ?? 50}% ${post.coverImagePosY ?? 50}%`
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                            
                                            <div className="absolute top-6 left-6">
                                                <span 
                                                    className="px-5 py-2 text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-xl italic"
                                                    style={{ backgroundColor: post.accentColor || categoryColors[post.category] || '#00ffff' }}
                                                >
                                                    {post.category}
                                                </span>
                                            </div>

                                            <div className="absolute top-6 right-6 flex gap-3">
                                                <button 
                                                    onClick={() => updatePost(post.id, { featured: !post.featured })}
                                                    className={cn(
                                                        "w-12 h-12 rounded-2xl backdrop-blur-3xl border flex items-center justify-center transition-all",
                                                        post.featured 
                                                            ? "bg-neon-pink/20 border-neon-pink/30 text-neon-pink" 
                                                            : "bg-black/40 border-white/10 text-white/40 hover:text-white"
                                                    )}
                                                >
                                                    <Star size={18} fill={post.featured ? "currentColor" : "none"} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-10 flex-1 flex flex-col space-y-6">
                                            <h4 
                                                className="text-2xl font-black font-heading uppercase italic tracking-tighter text-white leading-tight line-clamp-2 transition-colors cursor-pointer"
                                                style={{ '--hover-color': post.accentColor || '#00ffff' }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = post.accentColor || '#00ffff'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                                                onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                                            >
                                                {post.title}
                                            </h4>
                                            
                                            <div className="flex items-center gap-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                                <div className="flex items-center gap-2" style={{ color: post.accentColor || '#00ffff' }}>
                                                    <Clock size={14} /> {post.readingTime || 5} MIN
                                                </div>
                                                <div className="w-[1px] h-3 bg-white/10" />
                                                <div>{new Date(post.publishDate).toLocaleDateString()}</div>
                                            </div>

                                            <div className="pt-8 mt-auto border-t border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-2 p-1 bg-black/60 rounded-2xl border border-white/10">
                                                    {['#00ffff', '#ff0055', '#bb00ff', '#00ff66'].map(color => (
                                                        <button 
                                                            key={color}
                                                            onClick={() => updatePost(post.id, { accentColor: color })}
                                                            className={cn(
                                                                "w-5 h-5 rounded-full transition-all",
                                                                (post.accentColor || '#00ffff') === color ? "ring-2 ring-white scale-110 shadow-lg" : "opacity-30 hover:opacity-100"
                                                            )}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex gap-4">
                                                    <button 
                                                        onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                                                        className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => navigate(`/concertzone/${post.category?.toLowerCase()}/${post.slug}`)}
                                                        className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
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
                                <div className="lg:col-span-5">
                                    <div className="p-12 bg-zinc-950 border border-white/10 rounded-[4rem] space-y-10 relative overflow-hidden shadow-2xl">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-pink/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
                                        
                                        <div className="space-y-4 relative z-10">
                                            <div className="w-16 h-16 rounded-3xl bg-neon-pink/10 flex items-center justify-center text-neon-pink border border-neon-pink/20 mb-8">
                                                <Mail size={32} />
                                            </div>
                                            <h3 className="text-3xl font-black font-heading uppercase italic tracking-tighter text-white">Weekly Newsletter</h3>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 leading-relaxed">
                                                Curate and send the official Weekly by Concert Zone newsletter to your audience.
                                            </p>
                                        </div>

                                        <div className="space-y-6 relative z-10 pt-10 border-t border-white/5">
                                            <div className="flex justify-between items-center p-6 bg-white/[0.03] rounded-3xl border border-white/5">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Story Selection</span>
                                                    <p className="text-sm font-black text-white">{recentPosts.length} Stories Available</p>
                                                </div>
                                                <div className="w-12 h-12 rounded-full bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20">
                                                    <Zap size={20} />
                                                </div>
                                            </div>

                                            <Link 
                                                to="/admin/newsletter/studio"
                                                className="w-full h-20 bg-neon-pink text-white font-black uppercase tracking-[0.2em] rounded-3xl shadow-[0_20px_50px_rgba(255,0,85,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center"
                                            >
                                                Create Newsletter
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-7">
                                    <div className="h-full rounded-[4rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-12 bg-black/20">
                                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/10 mb-8">
                                            <Radio size={40} />
                                        </div>
                                        <h4 className="text-2xl font-black font-heading uppercase italic tracking-tighter text-white/20 mb-4">Ready to Create</h4>
                                        <p className="max-w-md text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 leading-relaxed">
                                            No newsletter is currently in progress. Click the button to start curating this week's highlights.
                                        </p>
                                    </div>
                                </div>
                             </div>
                        </motion.div>
                    )}

                    {activeTab === 'COMMERCIALS' && (
                        <motion.div 
                            key="commercials"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-8 space-y-10">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black font-heading uppercase italic tracking-tighter text-white">Commercial Intelligence</h3>
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Managing ticketing & direct sponsorships</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="p-10 bg-zinc-950 border border-white/10 rounded-[3rem] space-y-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20">
                                                    <Ticket size={24} />
                                                </div>
                                                <h4 className="text-sm font-black uppercase tracking-widest text-white">Active Ticketing</h4>
                                            </div>
                                            <div className="space-y-4">
                                                {posts.filter(p => p.ticketingLink).length > 0 ? (
                                                    posts.filter(p => p.ticketingLink).map(post => (
                                                        <div key={post.id} className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/5">
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-black uppercase text-white truncate">{post.title}</p>
                                                                <p className="text-[8px] font-bold text-gray-500 truncate">{post.ticketingLink}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => window.open(post.ticketingLink, '_blank')}
                                                                className="text-neon-blue hover:text-white transition-colors"
                                                            >
                                                                <ExternalLink size={16} />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] font-black uppercase text-gray-600 text-center py-10 border border-dashed border-white/10 rounded-2xl">No Active Ticket Links</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-10 bg-zinc-950 border border-white/10 rounded-[3rem] space-y-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-neon-pink/10 flex items-center justify-center text-neon-pink border border-neon-pink/20">
                                                    <Sparkles size={24} />
                                                </div>
                                                <h4 className="text-sm font-black uppercase tracking-widest text-white">Direct Sponsors</h4>
                                            </div>
                                            <div className="space-y-4">
                                                {posts.filter(p => p.sponsorName).length > 0 ? (
                                                    posts.filter(p => p.sponsorName).map(post => (
                                                        <div key={post.id} className="flex items-center gap-4 p-5 bg-white/[0.03] rounded-2xl border border-white/5">
                                                            {post.sponsorLogo && <img src={post.sponsorLogo} className="w-10 h-10 object-contain rounded-lg" />}
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-black uppercase text-white truncate">{post.sponsorName}</p>
                                                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{post.title}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] font-black uppercase text-gray-600 text-center py-10 border border-dashed border-white/10 rounded-2xl">No Direct Sponsors Linked</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-4">
                                    <div className="p-10 bg-white/[0.02] border border-white/10 rounded-[3rem] space-y-8">
                                        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-gray-400">
                                            <Globe size={32} />
                                        </div>
                                        <h4 className="text-lg font-black font-heading uppercase italic tracking-tighter text-white">Commercial Strategy</h4>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 leading-relaxed">
                                            Management of non-AdSense revenue streams. Ticketing links and direct sponsor logos are integrated directly into article narratives for maximum conversion.
                                        </p>
                                        <div className="pt-8 border-t border-white/5">
                                            <Button 
                                                onClick={() => navigate('/admin/blog')}
                                                className="w-full h-16 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest rounded-2xl transition-all"
                                            >
                                                Review All Content
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default ConcertZoneStudio;
