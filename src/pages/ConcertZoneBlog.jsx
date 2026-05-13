import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import Search from 'lucide-react/dist/esm/icons/search';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Play from 'lucide-react/dist/esm/icons/play';
import Users from 'lucide-react/dist/esm/icons/users';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Newspaper from 'lucide-react/dist/esm/icons/newspaper';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Clock from 'lucide-react/dist/esm/icons/clock';
import User from 'lucide-react/dist/esm/icons/user';
import Star from 'lucide-react/dist/esm/icons/star';
import Home from 'lucide-react/dist/esm/icons/home';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import { useStore } from '../lib/store';
import BlogNewsletter from '../components/blog/BlogNewsletter';

// Ad Slot placeholder for Google AdSense
const AdSlot = ({ className = '', format = 'horizontal' }) => (
    <div className={cn('relative group bg-white/[0.01] border border-dashed border-white/5 rounded-2xl flex items-center justify-center text-gray-800 text-[8px] font-black uppercase tracking-[0.4em] overflow-hidden', format === 'horizontal' ? 'h-24 w-full' : 'h-80 w-full', className)}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms]" />
        {/* Replace with AdSense script: <ins className="adsbygoogle" ... /> */}
        <span className="relative z-10 opacity-30 group-hover:opacity-60 transition-opacity italic">// SPONSORED SPACE //</span>
    </div>
);

const CATEGORIES = [
    { id: 'all', label: 'All', icon: Newspaper },
    { id: 'live-events', label: 'Live Events', icon: Play },
    { id: 'artists', label: 'Artists', icon: Users },
    { id: 'guides', label: 'Guides', icon: BookOpen },
    { id: 'buzz', label: 'Buzz', icon: Zap }
];

export const TEST_POSTS = [
    {
        id: 'hello-world-test',
        title: 'Hello World',
        shortDescription: 'Welcome to ConcertZone — India\'s editorial hub for nightlife culture, artist deep-dives, and the stories behind the music scene.',
        content: '<h2>Welcome to ConcertZone</h2><p>This is the inaugural post of ConcertZone, India\'s definitive editorial destination for everything music, nightlife, and culture. We\'re building a platform where artists, fans, and the industry come together to share stories that matter.</p><h2>What to Expect</h2><p>From deep-dive artist profiles to venue guides, festival recaps to industry analysis — ConcertZone covers it all. Our editorial team is committed to delivering high-quality, well-researched content that goes beyond surface-level coverage.</p><h2>Join the Movement</h2><p>Whether you\'re an artist looking to share your story, a venue owner, or a passionate fan — ConcertZone is your home. Subscribe to our newsletter and never miss an update.</p>',
        coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=2000',
        videoUrl: 'https://cdn.pixabay.com/video/2019/11/15/29112-373979412_large.mp4',
        category: 'Live Events', status: 'Published', slug: 'hello-world',
        author: 'Newbi Editorial', publishDate: new Date().toISOString(), readingTime: 8, featured: true
    },
    {
        id: 'artist-spotlight-test',
        title: 'Artist Spotlight: The Underground Sound',
        shortDescription: 'A deep dive into the artists reshaping India\'s electronic music landscape.',
        content: '<h2>The Underground Revolution</h2><p>India\'s electronic music scene is undergoing a radical transformation. A new generation of producers and DJs are pushing boundaries, blending traditional Indian sounds with cutting-edge electronic production to create something entirely new.</p><h2>Artists to Watch</h2><p>From the bass-heavy sets of Mumbai\'s warehouse scene to the melodic techno emerging from Bangalore\'s underground clubs, these artists are defining what Indian electronic music sounds like in 2026.</p><p>Their approach is raw, unfiltered, and deeply personal — drawing from lived experience rather than following global trends.</p>',
        coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=2000',
        category: 'Artists', status: 'Published', slug: 'artist-spotlight',
        author: 'Newbi Editorial', publishDate: new Date(Date.now() - 86400000).toISOString(), readingTime: 6, featured: true
    },
    {
        id: 'venue-guide-test',
        title: 'The Complete Guide to Bangalore Nightlife',
        shortDescription: 'From hidden speakeasies to rooftop arenas — your essential blueprint to experiencing the best of Bangalore after dark.',
        content: '<h2>Bangalore After Dark</h2><p>Bangalore has evolved into India\'s nightlife capital, offering everything from intimate jazz bars to massive outdoor festivals. This guide covers the essential venues, the best nights to go out, and insider tips from the people who know the scene best.</p><h2>Top Venues</h2><p>Whether you\'re looking for a rooftop sundowner spot or a proper underground club, Bangalore has it all. We\'ve curated the definitive list of venues across the city, organized by vibe, music genre, and budget.</p><h2>Insider Tips</h2><p>The best nights aren\'t always the most advertised ones. Follow the right promoters, join the right WhatsApp groups, and you\'ll discover a whole hidden layer of Bangalore nightlife.</p>',
        coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=2000',
        category: 'Guides', status: 'Published', slug: 'bangalore-guide',
        author: 'Newbi Editorial', publishDate: new Date(Date.now() - 172800000).toISOString(), readingTime: 10, featured: false
    },
    {
        id: 'buzz-test',
        title: 'What\'s Buzzing This Week',
        shortDescription: 'Festival announcements, surprise collabs, and the hottest drops right now.',
        content: '<h2>This Week in Music</h2><p>It\'s been a massive week for the Indian music scene. Multiple festival lineups dropped, two major artist collaborations were announced, and a new venue just opened in Mumbai that\'s already getting rave reviews.</p><h2>Festival Season Updates</h2><p>With festival season approaching, organizers are pulling out all the stops. We\'ve got exclusive details on lineups, ticket pricing, and what to expect from this year\'s biggest events.</p>',
        coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2000',
        category: 'Buzz', status: 'Published', slug: 'weekly-buzz',
        author: 'Newbi Editorial', publishDate: new Date(Date.now() - 259200000).toISOString(), readingTime: 4, featured: false
    },
    {
        id: 'live-event-recap',
        title: 'Recap: Sunburn Festival 2024',
        shortDescription: 'Everything that went down at this year\'s biggest electronic music festival.',
        content: '<h2>Sunburn 2024: A Recap</h2><p>Sunburn Festival returned bigger than ever this year, drawing over 100,000 attendees across three days of non-stop music. From the headlining acts to the hidden gem sets on smaller stages, here\'s our complete breakdown of everything that went down.</p><h2>Highlights</h2><p>The festival featured over 80 artists across 5 stages. The production quality was a significant step up from previous years, with state-of-the-art sound systems and immersive visual installations throughout the venue.</p><h2>The Verdict</h2><p>Sunburn 2024 proved that India\'s festival scene is maturing rapidly. The curation was sharper, the experience more polished, and the audience more engaged than ever before.</p>',
        coverImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=2000',
        category: 'Live Events', status: 'Published', slug: 'sunburn-recap',
        author: 'Newbi Editorial', publishDate: new Date(Date.now() - 345600000).toISOString(), readingTime: 7, featured: false
    }
];

// Tiny reusable card for sidebar / compact lists
const MiniCard = ({ post, isActive, progress = 0 }) => {
    const slug = post.category?.toLowerCase().replace(' ', '-') || 'news';
    return (
        <Link to={`/concertzone/${slug}/${post.slug}`} 
            className={cn(
                "group relative flex gap-5 items-center py-5 px-4 bg-white/[0.01] border border-white/0 transition-all duration-500 rounded-2xl overflow-hidden",
                isActive ? "bg-white/[0.05] border-white/10" : "hover:border-white/5 hover:bg-white/[0.03]"
            )}
        >
            {/* Active Progress Overlay */}
            {isActive && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-neon-blue z-20 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            )}

            <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 group-hover:border-neon-blue/30 transition-colors">
                <img 
                    src={post.coverImage} 
                    alt="" 
                    className="w-full h-full grayscale-[30%] group-hover:grayscale-0 transition-all duration-700" 
                    style={{ 
                        objectFit: 'cover', 
                        transform: `scale(${post.coverImageScale || 1})`,
                        transformOrigin: `${post.coverImagePosX ?? 50}% ${post.coverImagePosY ?? 50}%`
                    }}
                />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn("text-[8px] font-black uppercase tracking-[0.2em]", isActive ? "text-neon-blue" : "text-neon-blue/80")}>{post.category}</span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-600">{post.readingTime || 5} MIN</span>
                </div>
                <h4 className={cn("text-sm font-black leading-tight uppercase italic tracking-tighter transition-colors line-clamp-2", isActive ? "text-white" : "text-white/60 group-hover:text-white")}>{post.title}</h4>
            </div>
        </Link>
    );
};

// Standard grid card (compact)
const StoryCard = ({ post }) => {
    const slug = post.category?.toLowerCase().replace(' ', '-') || 'news';
    return (
        <Link to={`/concertzone/${slug}/${post.slug}`} className="group flex flex-col h-full relative bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] overflow-hidden hover:border-white/20 transition-all duration-700">
            {/* Visual Perforations */}
            <div className="absolute top-1/2 -left-2 w-4 h-4 bg-[#060606] rounded-full border border-white/5 z-20 group-hover:scale-110 transition-transform" />
            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-[#060606] rounded-full border border-white/5 z-20 group-hover:scale-110 transition-transform" />

            <div className="relative aspect-[16/10] overflow-hidden">
                <img 
                    src={post.coverImage} 
                    alt="" 
                    className="w-full h-full transition-transform duration-700 group-hover:scale-105" 
                    style={{ 
                        objectFit: 'cover', 
                        transform: `scale(${post.coverImageScale || 1})`,
                        transformOrigin: `${post.coverImagePosX ?? 50}% ${post.coverImagePosY ?? 50}%`
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060606]/80 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-[8px] font-black uppercase tracking-[0.2em] rounded-full border border-white/10 text-white/90">{post.category}</span>
                </div>
            </div>
            
            <div className="p-6">
                <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">
                    <span className="flex items-center gap-1.5"><Clock size={10} className="text-neon-blue" /> {post.readingTime || 5} MIN</span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span>{new Date(post.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
                
                <h3 className="text-lg md:text-xl font-black leading-tight uppercase italic tracking-tighter mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-neon-blue group-hover:to-neon-pink transition-all duration-500 line-clamp-2">
                    {post.title}
                </h3>
                
                <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed font-medium mb-6 opacity-70 group-hover:opacity-100 transition-opacity">
                    {post.shortDescription}
                </p>
                
                <div className="flex items-center justify-between pt-5 border-t border-white/5 mt-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <User size={10} className="text-gray-400" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">{post.author || 'NEWBI TEAM'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-neon-blue group-hover:translate-x-1 transition-transform">
                        READ <ArrowRight size={10} />
                    </div>
                </div>
            </div>
        </Link>
    );
};

const ConcertZoneBlog = () => {
    const { category } = useParams();
    const navigate = useNavigate();
    const { posts, siteSettings } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(12);
    const [scrolled, setScrolled] = useState(false);

    const layout = siteSettings?.concertzone || {
        mastheadVol: 'VOL 01',
        mastheadEst: 'EST. 2026',
        heroSubtitle: 'MUSIC, LIFE & CULTURE.',
        accentColor: '#00ffff'
    };


    const activeCategory = category || 'all';

    const tickerItems = siteSettings?.blogTicker || [
        'Welcome to ConcertZone — India\'s music culture hub',
        'New artist spotlights every week',
        'Submit your story → editorial@newbi.live'
    ];

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const filteredPosts = useMemo(() => {
        let result = posts.filter(p => p.status === 'Published');
        if (result.length === 0) result = [...TEST_POSTS];

        if (activeCategory !== 'all') {
            const label = CATEGORIES.find(c => c.id === activeCategory)?.label;
            result = result.filter(p => p.category === label);
        }
        if (searchQuery) {
            result = result.filter(p =>
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return result.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
    }, [posts, activeCategory, searchQuery]);

    const featuredPosts = useMemo(() => {
        const featured = filteredPosts.filter(p => p.featured);
        return featured.length > 0 ? featured : filteredPosts.slice(0, 3);
    }, [filteredPosts]);

    const [leadIndex, setLeadIndex] = useState(0);
    const [rotationProgress, setRotationProgress] = useState(0);

    useEffect(() => {
        if (featuredPosts.length <= 1) return;
        
        const duration = 8000; // 8 seconds per slide
        const interval = 50; 
        const step = (interval / duration) * 100;

        const timer = setInterval(() => {
            setRotationProgress(prev => {
                if (prev >= 100) {
                    setLeadIndex(idx => (idx + 1) % featuredPosts.length);
                    return 0;
                }
                return prev + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [featuredPosts.length]);

    const leadPost = featuredPosts[leadIndex];
    // Filtered lists for the rest of the layout
    const gridPosts = filteredPosts.filter(p => !featuredPosts.find(f => f.id === p.id)).slice(0, visibleCount);

    const handleCategoryChange = (catId) => {
        if (catId === 'all') navigate('/concertzone');
        else navigate(`/concertzone/${catId}`);
    };

    const leadSlug = leadPost?.category?.toLowerCase().replace(' ', '-') || 'news';

    return (
        <div className="min-h-screen bg-[#060606] text-white pb-32 relative selection:bg-neon-blue selection:text-black">


            {/* Anchored Top Bar (Ticker + Navigation) */}
            <div className="fixed top-0 left-0 right-0 z-[200] bg-black/60 backdrop-blur-3xl border-b border-white/5 flex items-center h-16 px-6 md:px-12 gap-8">
                <Link to="/" className="flex items-center gap-2 group whitespace-nowrap">
                    <Home size={14} className="text-neon-blue group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 group-hover:text-white transition-colors">newbi.live</span>
                </Link>
                <div className="w-[1px] h-6 bg-white/10 hidden md:block" />




                <div className="flex-1 overflow-hidden h-full flex items-center">
                    <div className="flex whitespace-nowrap animate-marquee">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-10 px-6">
                                {tickerItems.map((item, idx) => (
                                    <React.Fragment key={idx}>
                                        <span className="text-[9px] font-semibold uppercase tracking-widest text-neon-blue/70">{item}</span>
                                        <span className="text-neon-blue/20 text-xs">◆</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Immersive Background Effects (Newbi Home Feel) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {/* Dynamic Glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-pink/10 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-transparent via-black/40 to-[#060606] z-10" />

                {/* Animated Grid / Mesh Pattern */}
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
            </div>

            {/* Vertical Sidebar Identity */}
            <div className="fixed left-5 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center gap-8 z-50 mix-blend-difference">
                <span className="text-[8px] font-black uppercase tracking-[0.6em] rotate-180 [writing-mode:vertical-lr] text-white/25">Concert Zone</span>
                <div className="w-[1px] h-20 bg-white/10" />
                <span className="text-[8px] font-black uppercase tracking-[0.6em] rotate-180 [writing-mode:vertical-lr] text-neon-blue/60">Vol. 01 · 2026</span>
            </div>

            {/* Floating Bottom Nav */}
            <nav className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full px-2 py-1.5 flex items-center gap-1 shadow-2xl">
                    {CATEGORIES.map((cat) => (
                        <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
                            className={cn("h-8 px-4 rounded-full flex items-center gap-1.5 transition-all text-[8px] font-bold uppercase tracking-wider",
                                activeCategory === cat.id ? "bg-white text-black" : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}>
                            <cat.icon size={10} />
                            <span className="hidden md:inline">{cat.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* ═══ MAGAZINE LAYOUT ═══ */}
            <div className="max-w-[1800px] mx-auto px-4 md:px-16 pt-32 md:pt-40 relative z-10 overflow-x-hidden">
                


                {/* Redesigned High-Fidelity Masthead */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center md:items-start mb-12 md:mb-20 px-4 w-full"
                >
                    <div className="flex items-center gap-4 mb-4 md:mb-6">
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_10px_#00ffff]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">The Editorial Hub</span>
                    </div>
                    <h1 className="text-[10vw] xs:text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black font-heading uppercase italic tracking-tighter leading-tight text-white flex flex-row flex-wrap md:flex-nowrap items-center justify-center md:justify-start gap-x-3 md:gap-8 w-full overflow-hidden text-center md:text-left">
                        <span>CONCERT</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white">ZONE.</span>
                    </h1>
                </motion.div>

                {/* Control Bar — Categories + Search Integrated */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-8 mb-16">
                    {/* Category Bar — Floating Glass Pill Aesthetic */}
                    <div className="flex-1 overflow-hidden relative group w-full">
                        {/* Fade Edges for Scroll Suggestion */}
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#060606] via-[#060606]/80 to-transparent z-20 pointer-events-none md:hidden" />
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#060606] via-[#060606]/80 to-transparent z-20 pointer-events-none md:hidden" />
                        
                        <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-6 -mb-6 px-4 md:px-0 scroll-smooth">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategoryChange(cat.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border shrink-0",
                                        activeCategory === cat.id 
                                            ? "bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.2)]" 
                                            : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <cat.icon size={12} className={cn("hidden xs:block md:size-[14px]", activeCategory === cat.id ? "text-black" : "text-neon-blue/60")} />
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative group flex-1 max-w-md w-full">
                        <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-neon-blue transition-all" size={18} />
                        <input 
                            type="text" 
                            placeholder="SEARCH ARTICLES..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-zinc-900/40 border border-white/5 rounded-full pl-20 pr-8 h-16 w-full text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-neon-blue/30 transition-all placeholder:text-gray-600 backdrop-blur-3xl"
                        />
                    </div>
                </div>

                {/* ═══ LEAD STORY + SIDEBAR (Magazine Split) ═══ */}
                {leadPost && (
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
                        {/* Lead Story — 2/3 width */}
                        <div className="lg:col-span-2 relative group overflow-hidden rounded-[3rem]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={leadPost.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="relative"
                                >
                                    <Link to={`/concertzone/${leadSlug}/${leadPost.slug}`} className="block relative rounded-[3rem] overflow-hidden aspect-[16/10] border border-white/5 group-hover:border-white/20 transition-all duration-700">
                                        {leadPost.videoUrl ? (
                                            <video 
                                                src={leadPost.videoUrl} 
                                                autoPlay 
                                                muted 
                                                loop 
                                                playsInline
                                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                            />
                                        ) : (
                                            <img 
                                                src={leadPost.coverImage} 
                                                alt={leadPost.title}
                                                className="w-full h-full transition-transform duration-1000 group-hover:scale-110" 
                                                style={{ 
                                                    objectFit: 'cover', 
                                                    transform: `scale(${leadPost.coverImageScale || 1})`,
                                                    transformOrigin: `${leadPost.coverImagePosX ?? 50}% ${leadPost.coverImagePosY ?? 50}%`
                                                }}
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-700" />

                                        <div className="absolute top-8 left-8 flex items-center gap-3">
                                            <span className="px-5 py-2 bg-neon-blue text-black text-[10px] font-black uppercase tracking-widest rounded-2xl italic shadow-[0_10px_30px_rgba(0,255,255,0.3)]">{leadPost.category}</span>
                                            <span className="px-5 py-2 bg-black/60 backdrop-blur-xl text-white/70 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 flex items-center gap-2">
                                                <Clock size={12} className="text-neon-blue" /> {leadPost.readingTime || 5} MIN
                                            </span>
                                        </div>

                                        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                                            <motion.h2 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-4xl md:text-7xl font-black font-heading uppercase tracking-tighter leading-[0.9] mb-6 italic group-hover:translate-x-4 transition-transform duration-700"
                                            >
                                                {leadPost.title.split(' ').map((word, i) => (
                                                    <span key={i} className={i % 2 === 1 ? "text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white not-italic" : "text-white"}>
                                                        {word}{' '}
                                                    </span>
                                                ))}
                                            </motion.h2>
                                            <p className="text-gray-300 text-sm md:text-lg font-medium max-w-2xl line-clamp-2 opacity-60 group-hover:opacity-100 transition-opacity mb-8 leading-relaxed italic">{leadPost.shortDescription}</p>
                                            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.4em] text-white/30">
                                                <span className="flex items-center gap-2"><User size={12} className="text-neon-blue" /> {leadPost.author || 'NEWBI TEAM'}</span>
                                                <div className="w-1 h-1 rounded-full bg-white/20" />
                                                <span>{new Date(leadPost.publishDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-12 right-12 w-20 h-20 bg-white text-black rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 shadow-2xl rotate-12 group-hover:rotate-0">
                                            <ArrowUpRight size={32} />
                                        </div>
                                    </Link>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Sidebar — 1/3 width */}
                        <div className="lg:col-span-1">
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 h-full">
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neon-pink shadow-[0_0_10px_rgba(255,0,85,0.5)]" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">Featured Stories</span>
                                </div>
                                {featuredPosts.map((post, idx) => (
                                    <MiniCard 
                                        key={post.id} 
                                        post={post} 
                                        isActive={idx === leadIndex}
                                        progress={idx === leadIndex ? rotationProgress : 0}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Ad Slot — Between Sections */}
                <AdSlot className="my-10" format="horizontal" />

                {/* ═══ GRID SECTION ═══ */}
                {gridPosts.length > 0 && (
                    <section className="mb-20">
                        <div className="flex items-center gap-3 mb-8 px-6 md:px-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-neon-blue" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">MORE STORIES</span>
                            <div className="flex-1 h-[1px] bg-white/5" />
                        </div>

                        <div className="relative group">
                            {/* Mobile Scroll Indicators */}
                            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#060606] via-[#060606]/80 to-transparent z-20 pointer-events-none md:hidden" />
                            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#060606] via-[#060606]/80 to-transparent z-20 pointer-events-none md:hidden" />

                            <div className="flex flex-row flex-nowrap overflow-x-auto no-scrollbar lg:grid lg:grid-cols-3 gap-6 md:gap-10 px-0 pb-12 -mb-8 snap-x snap-mandatory scroll-smooth w-full">
                                <AnimatePresence mode="popLayout">
                                    {gridPosts.slice(0, visibleCount).map((post, index) => (
                                        <motion.div 
                                            key={post.id} 
                                            layout 
                                            initial={{ opacity: 0, y: 10 }} 
                                            animate={{ opacity: 1, y: 0 }} 
                                            transition={{ delay: index * 0.04 }}
                                            className="min-w-[70%] sm:min-w-[280px] lg:min-w-0 snap-start shrink-0"
                                        >
                                            <StoryCard post={post} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>

                        {gridPosts.length > visibleCount && (
                            <div className="flex justify-center pt-12 md:flex hidden">
                                <button onClick={() => setVisibleCount(prev => prev + 6)}
                                    className="h-10 px-6 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider text-[10px] hover:bg-white/10 transition-all rounded-lg flex items-center gap-2">
                                    Load More <ArrowRight size={12} />
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* Empty State */}
                {filteredPosts.length === 0 && (
                    <div className="text-center py-24">
                        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto mb-4">
                            <Newspaper size={24} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">No stories found</h3>
                        <p className="text-gray-500 text-sm">Try a different category or search term.</p>
                    </div>
                )}

                {/* Ad Slot — Before Newsletter */}
                <AdSlot className="mb-10" format="horizontal" />

                {/* Newsletter */}
                <section className="rounded-[3rem] bg-white/[0.01] border border-white/5 p-8 md:p-20 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-neon-blue/5 blur-[200px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2" />
                    
                    <div className="max-w-4xl mx-auto relative z-10">
                        <BlogNewsletter />
                    </div>
                </section>            </div>

        </div>
    );
};

export default ConcertZoneBlog;
