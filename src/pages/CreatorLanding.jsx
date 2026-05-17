import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { 
    Sparkles, ArrowRight, Instagram, Youtube, Twitter, Users, Zap, Target, 
    ShieldCheck, Award, TrendingUp, CheckCircle2, ChevronDown, MapPin, 
    Briefcase, DollarSign, Star, Filter, Search, Share2, PieChart, Lock, 
    ExternalLink, Play, Check, Sliders, Wallet, FileText, Layers, CheckCircle,
    HelpCircle, ChevronRight, BarChart3, Globe, Shield
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const CreatorLanding = () => {
    const navigate = useNavigate();
    const { campaigns } = useStore();

    // Interactive Hero Mockup State
    const [heroTab, setHeroTab] = useState('media_kit');

    // Live Campaigns Filter State
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Interactive Earnings Calculator State
    const [calcFollowers, setCalcFollowers] = useState(75000);
    const [calcPlatform, setCalcPlatform] = useState('instagram');

    // FAQ Accordion State
    const [openFaq, setOpenFaq] = useState(null);

    // Live Campaigns Data Processing
    const liveCampaigns = useMemo(() => {
        const openCamps = campaigns.filter(c => c.status === 'Open');
        const fallbackCamps = [
            { id: '1', title: 'Luxury Lifestyle Summer Collab', category: 'Luxury & Fashion', targetCity: 'Mumbai', reward: '₹35,000 + Stay', minInstagramFollowers: 25000, thumbnail: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800', platform: 'instagram' },
            { id: '2', title: 'Tech Flagship Smartphone Launch', category: 'Tech & Gaming', targetCity: 'Bangalore', reward: '₹60,000 + Device', minInstagramFollowers: 50000, thumbnail: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=800', platform: 'youtube' },
            { id: '3', title: 'Premium Streetwear Drop Vol. 4', category: 'Luxury & Fashion', targetCity: 'Delhi', reward: '₹20,000 + Wardrobe', minInstagramFollowers: 15000, thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800', platform: 'instagram' },
            { id: '4', title: 'Gourmet Culinary Masterclass Series', category: 'Food & Travel', targetCity: 'Goa', reward: '₹40,000 + Experience', minInstagramFollowers: 30000, thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800', platform: 'instagram' },
            { id: '5', title: 'Elite Gaming Setup Showcase', category: 'Tech & Gaming', targetCity: 'Hyderabad', reward: '₹75,000 + Rig Upgrade', minInstagramFollowers: 100000, thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=800', platform: 'youtube' },
            { id: '6', title: 'Organic Skincare Brand Ambassador', category: 'Beauty & Lifestyle', targetCity: 'Universal', reward: '₹50,000 + 6M Retainer', minInstagramFollowers: 40000, thumbnail: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=800', platform: 'instagram' }
        ];
        return openCamps.length >= 3 ? openCamps : fallbackCamps;
    }, [campaigns]);

    const categories = ['All', 'Luxury & Fashion', 'Tech & Gaming', 'Beauty & Lifestyle', 'Food & Travel'];

    const filteredCampaigns = useMemo(() => {
        if (selectedCategory === 'All') return liveCampaigns.slice(0, 6);
        return liveCampaigns.filter(c => (c.category || 'Luxury & Fashion') === selectedCategory).slice(0, 6);
    }, [liveCampaigns, selectedCategory]);

    // Roster Mock Data (Confluencr Inspired)
    const creatorRoster = [
        { name: 'Aarav Sharma', niche: 'Tech & Gadgets', followers: '1.2M', engagement: '5.8%', reach: '4.2M/mo', collabs: ['Samsung', 'BMW', 'Intel'], avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400', platform: 'youtube' },
        { name: 'Priya Patel', niche: 'Luxury Fashion', followers: '850K', engagement: '6.4%', reach: '3.1M/mo', collabs: ['Dior', 'Vogue', 'Nykaa'], avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400', platform: 'instagram' },
        { name: 'Kabir Mehta', niche: 'Travel & Adventure', followers: '520K', engagement: '7.1%', reach: '2.5M/mo', collabs: ['GoPro', 'Emirates', 'Taj'], avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400', platform: 'youtube' },
        { name: 'Ananya Rao', niche: 'Beauty & Wellness', followers: '640K', engagement: '4.9%', reach: '2.8M/mo', collabs: ['Estee Lauder', 'Dyson', 'Sephora'], avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400', platform: 'instagram' }
    ];

    // Creator Suite Tools (Later.com Inspired)
    const suiteTools = [
        { title: 'Auto-Generated Media Kits', desc: 'Connect your socials to instantly generate beautifully styled, real-time analytics media kits with audience demographic breakdowns and one-click PDF export.', icon: PieChart, color: 'text-neon-blue', bg: 'bg-neon-blue/10', border: 'border-neon-blue/30' },
        { title: 'Smart Pitching Engine', desc: 'Leverage our proprietary AI quotation and proposal engine to submit professional, high-converting commercial bids directly to elite brand managers.', icon: FileText, color: 'text-neon-pink', bg: 'bg-neon-pink/10', border: 'border-neon-pink/30' },
        { title: 'Escrow-Backed Payouts', desc: '100% payment protection. Brands deposit funds into escrow before you start. Receive instant bank settlements upon deliverable verification.', icon: Wallet, color: 'text-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/30' },
        { title: 'Clause Library & Legal Backing', desc: 'Gain access to pre-vetted brand partnership agreements, commercial terms, and dedicated talent agent backing to protect your IP and secure your rates.', icon: ShieldCheck, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' }
    ];

    // Creator Tiers
    const tiers = [
        {
            name: 'RISING STAR',
            followers: '5K - 50K FOLLOWERS',
            description: 'Perfect for emerging creators looking to establish brand authority and gain consistent deal flow.',
            perks: ['Access to open community gigs', 'Automated pitch templates', 'Direct brand collab kits', 'Guaranteed 7-day payout settlement'],
            accent: 'from-blue-500/20 to-cyan-500/10',
            border: 'border-cyan-500/30',
            badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        },
        {
            name: 'PRO CREATOR',
            followers: '50K - 250K FOLLOWERS',
            description: 'Designed for professional influencers scaling their commercial revenue and seeking retainer contracts.',
            perks: ['Priority campaign shortlisting', 'Dedicated talent success manager', '1-on-1 monthly strategy sessions', 'Eligibility for monthly retainers'],
            accent: 'from-pink-500/20 to-purple-500/10',
            border: 'border-pink-500/30',
            badgeClass: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
            popular: true
        },
        {
            name: 'ELITE ICON',
            followers: '250K+ FOLLOWERS',
            description: 'Bespoke representation for industry leaders requiring high-ticket brand alignment and legal backing.',
            perks: ['Dedicated senior talent agent', 'Custom brand partnership agreements', 'Full legal & accounting backing', 'Exclusive celebrity & IP co-creation'],
            accent: 'from-amber-500/20 to-orange-500/10',
            border: 'border-amber-500/30',
            badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }
    ];

    // FAQs
    const faqs = [
        { q: 'How does the certification process work?', a: 'Connect your Instagram or YouTube during registration. Our proprietary engine analyzes your engagement, follower authenticity, and niche authority instantly to assign your creator tier.' },
        { q: 'What kind of brands will I work with?', a: 'We partner with elite global and national brands across Luxury, Tech, Fashion, Beauty, Hospitality, and Lifestyle sectors looking for verified, high-converting creators.' },
        { q: 'How and when do I get paid?', a: 'All payouts are escrow-backed. Once you submit your performance deliverables and receive admin verification, funds are released directly to your bank account within 24 to 48 hours.' },
        { q: 'Is there any fee to join the creator network?', a: 'No. Joining the network, getting certified, and accessing the studio workspace is 100% free for creators. We succeed when you succeed.' }
    ];

    // Earnings Calculator Logic
    const calculatedEarnings = useMemo(() => {
        const multiplier = calcPlatform === 'youtube' ? 1.5 : 1.0;
        const base = calcFollowers * 0.8 * multiplier;
        const min = Math.round(base * 0.6);
        const max = Math.round(base * 1.4);
        
        let tierName = 'RISING STAR';
        let tierColor = 'text-cyan-400';
        let tierPerk = 'Automated Pitching & Escrow Payouts';
        
        if (calcFollowers >= 250000) {
            tierName = 'ELITE ICON';
            tierColor = 'text-amber-400';
            tierPerk = 'Dedicated Senior Agent & Custom Legal Agreements';
        } else if (calcFollowers >= 50000) {
            tierName = 'PRO CREATOR';
            tierColor = 'text-pink-400';
            tierPerk = 'Dedicated Success Manager & Retainer Eligibility';
        }

        return { min, max, tierName, tierColor, tierPerk };
    }, [calcFollowers, calcPlatform]);

    return (
        <div className="min-h-screen bg-[#030303] text-white selection:bg-neon-blue selection:text-black font-['Outfit'] overflow-x-clip relative pb-32">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .animate-spin-slow { animation: spin 12s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />

            {/* Immersive Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/10 rounded-full blur-[160px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-neon-pink/10 rounded-full blur-[160px] animate-pulse delay-700" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>

            {/* Header Navigation */}
            <header className="fixed top-0 left-0 right-0 h-20 bg-black/40 backdrop-blur-3xl border-b border-white/10 z-50 px-6 md:px-12 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-3">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform">
                            NB
                        </div>
                        <span className="text-xl font-black uppercase tracking-tighter italic text-white hidden sm:inline">
                            Newbi <span className="text-neon-blue">Creator.</span>
                        </span>
                    </Link>
                </div>

                <nav className="hidden lg:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-gray-300">
                    <a href="#missions" className="hover:text-white transition-colors">Live Missions</a>
                    <a href="#roster" className="hover:text-white transition-colors">Elite Roster</a>
                    <a href="#suite" className="hover:text-white transition-colors">Creator Suite</a>
                    <a href="#calculator" className="hover:text-white transition-colors">Earnings Estimator</a>
                    <a href="#tiers" className="hover:text-white transition-colors">Commercial Tiers</a>
                </nav>

                <div className="flex items-center gap-4">
                    <Button 
                        onClick={() => navigate('/campaigns')}
                        className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all hidden sm:flex items-center gap-2"
                    >
                        <Globe size={14} className="text-neon-blue" />
                        <span>Directory</span>
                    </Button>
                    <Button 
                        onClick={() => navigate('/creator/join')}
                        className="h-10 md:h-12 px-6 md:px-8 rounded-xl bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-neon-blue hover:text-black hover:shadow-[0_0_30px_rgba(46,191,255,0.4)] transition-all flex items-center gap-2 group"
                    >
                        <span>Apply Now</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </header>

            <main className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-12 pt-32 md:pt-40 space-y-32 md:space-y-40">
                {/* CINEMATIC HERO SECTION (Later & Confluencr Inspired) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center pt-8">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="lg:col-span-7 space-y-8"
                    >
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                            <Sparkles size={16} className="text-neon-blue animate-spin-slow" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">INDIA'S PREMIER CREATOR ECOSYSTEM</span>
                        </div>

                        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.85] text-white pr-4">
                            MONETIZE <br />YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-purple-500">INFLUENCE.</span>
                        </h1>

                        <p className="text-gray-400 text-base md:text-xl font-medium leading-relaxed max-w-2xl">
                            Turn your audience into a commercial empire. Partner with elite global brands, unlock high-ticket campaigns, generate automated media kits, and get backed by dedicated talent agents.
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                            <Button 
                                onClick={() => navigate('/creator/join')}
                                className="h-16 md:h-20 px-10 md:px-12 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs md:text-sm shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:bg-neon-blue hover:text-black hover:shadow-[0_0_50px_rgba(46,191,255,0.4)] transition-all group flex items-center justify-center gap-3"
                            >
                                <span>Apply for Certification</span> 
                                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                            </Button>
                            <Button 
                                onClick={() => navigate('/campaigns')}
                                className="h-16 md:h-20 px-10 md:px-12 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-xs md:text-sm hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-xl shadow-2xl flex items-center justify-center gap-3"
                            >
                                <Globe size={20} className="text-neon-blue" />
                                <span>Explore Live Directory</span>
                            </Button>
                        </div>

                        {/* Floating Trust Metrics */}
                        <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5 max-w-2xl">
                            <div>
                                <h4 className="text-3xl md:text-4xl font-black text-white italic">₹50L+</h4>
                                <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Paid to Creators</p>
                            </div>
                            <div>
                                <h4 className="text-3xl md:text-4xl font-black text-neon-blue italic">500+</h4>
                                <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Active Missions</p>
                            </div>
                            <div>
                                <h4 className="text-3xl md:text-4xl font-black text-neon-pink italic">₹15K</h4>
                                <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Avg. Post Payout</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Hero Visual: Interactive Glassmorphic Hub Preview */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="lg:col-span-5 relative flex flex-col items-center justify-center"
                    >
                        <div className="absolute w-80 h-80 bg-neon-blue/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />

                        {/* Glassmorphic Mockup Container */}
                        <div className="w-full max-w-lg bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative z-10 space-y-8 group hover:border-neon-blue/40 transition-all duration-500">
                            {/* Mockup Header Tabs */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                                    <button 
                                        onClick={() => setHeroTab('media_kit')}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                                            heroTab === 'media_kit' ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        <PieChart size={12} />
                                        <span>Media Kit</span>
                                    </button>
                                    <button 
                                        onClick={() => setHeroTab('live_pitches')}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                                            heroTab === 'live_pitches' ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        <Target size={12} />
                                        <span>Brand Pitches</span>
                                    </button>
                                    <button 
                                        onClick={() => setHeroTab('wallet')}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                                            heroTab === 'wallet' ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        <Wallet size={12} />
                                        <span>Escrow</span>
                                    </button>
                                </div>
                                <span className="w-3 h-3 rounded-full bg-neon-green shadow-[0_0_10px_#39FF14] animate-pulse" />
                            </div>

                            {/* Tab Content 1: Media Kit & Analytics */}
                            {heroTab === 'media_kit' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" alt="Avatar" className="w-14 h-14 rounded-2xl object-cover border border-white/20 shadow-lg" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-lg font-black text-white uppercase tracking-tight">Aarav Sharma</h4>
                                                    <ShieldCheck size={16} className="text-neon-blue" />
                                                </div>
                                                <p className="text-xs font-bold text-neon-green uppercase tracking-widest">Verified Pro Creator</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-300">
                                            TECH & GADGETS
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Reach</p>
                                            <p className="text-xl font-black text-white font-mono">4.2M</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Avg. Eng.</p>
                                            <p className="text-xl font-black text-neon-blue font-mono">5.8%</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Est. Value</p>
                                            <p className="text-xl font-black text-neon-pink font-mono">₹45K</p>
                                        </div>
                                    </div>

                                    {/* Mock Demographics Chart */}
                                    <div className="space-y-3 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                                            <span>Audience Age (18-24)</span>
                                            <span className="text-white">68%</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="w-[68%] h-full bg-gradient-to-r from-neon-blue to-neon-pink shadow-[0_0_12px_rgba(46,191,255,0.5)]" />
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 pt-2 border-t border-white/5">
                                            <span>Top Location: Mumbai & Bangalore</span>
                                            <span className="text-neon-green flex items-center gap-1"><Check size={12} /> Verified</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab Content 2: Live Brand Pitches */}
                            {heroTab === 'live_pitches' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Brand Proposals</span>
                                        <span className="text-[10px] font-black text-neon-blue bg-neon-blue/10 px-2.5 py-1 rounded-full border border-neon-blue/20">2 Pending</span>
                                    </div>

                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4 hover:border-white/20 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-xs shadow-md">
                                                    BMW
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-black text-white uppercase tracking-tight">BMW Luxury Collab</h5>
                                                    <p className="text-[10px] font-bold text-gray-400">Deliverable: 1 Reel + 2 Stories</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-neon-green font-mono">₹85,000</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">Brand Reviewing</span>
                                            <span className="text-gray-500 hover:text-white cursor-pointer flex items-center gap-1">View Brief <ArrowRight size={12} /></span>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4 hover:border-white/20 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                                                    SAM
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-black text-white uppercase tracking-tight">Samsung Flagship Launch</h5>
                                                    <p className="text-[10px] font-bold text-gray-400">Deliverable: Dedicated Video</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-neon-blue font-mono">₹1,20,000</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-neon-green bg-neon-green/10 px-3 py-1 rounded-full border border-neon-green/20">Shortlisted</span>
                                            <span className="text-gray-500 hover:text-white cursor-pointer flex items-center gap-1">View Brief <ArrowRight size={12} /></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab Content 3: Escrow Wallet */}
                            {heroTab === 'wallet' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="p-8 bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 rounded-3xl relative overflow-hidden shadow-2xl space-y-6">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/10 rounded-full blur-3xl" />
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={14} className="text-neon-green" /> ESCROW PROTECTION ACTIVE</span>
                                            <span className="text-xs font-black font-mono text-neon-green bg-neon-green/10 px-3 py-1 rounded-full border border-neon-green/20">INSTANT PAYOUT</span>
                                        </div>
                                        <div className="space-y-1 relative z-10">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Available Escrow Balance</p>
                                            <h3 className="text-4xl font-black text-white font-mono tracking-tight">₹2,45,000</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 relative z-10">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">In Escrow (Active)</p>
                                                <p className="text-lg font-black text-white font-mono">₹1,20,000</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Ready for Bank Transfer</p>
                                                <p className="text-lg font-black text-neon-green font-mono">₹1,25,000</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button className="w-full h-16 rounded-2xl bg-neon-green text-black font-black uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(57,255,20,0.3)] hover:scale-105 transition-all flex items-center justify-center gap-2">
                                        <Wallet size={16} />
                                        <span>Withdraw to Bank Account</span>
                                    </Button>
                                </div>
                            )}

                            {/* Mockup Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <span className="flex items-center gap-1.5"><Lock size={12} className="text-neon-blue" /> 256-Bit Escrow Vault</span>
                                <span className="text-white hover:underline cursor-pointer flex items-center gap-1" onClick={() => navigate('/creator/join')}>Open Live Dashboard <ArrowRight size={12} /></span>
                            </div>
                        </div>

                        {/* Floating Decorative Badge */}
                        <motion.div 
                            animate={{ y: [-10, 10, -10] }} 
                            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                            className="absolute -top-6 -left-6 p-5 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex items-center gap-4 hidden sm:flex z-20"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shadow-[0_0_20px_rgba(57,255,20,0.2)]">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payout Released</p>
                                <p className="text-sm font-black text-white italic">₹45,000 Transferred</p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* LIVE CAMPAIGNS DIRECTORY (Influencer.in Inspired) */}
                <motion.section id="missions" className="space-y-12 pt-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                        <div>
                            <div className="flex items-center gap-3 text-neon-blue font-black tracking-[0.4em] text-[10px] uppercase mb-2">
                                <Zap size={14} className="animate-pulse" />
                                LIVE CAMPAIGNS DIRECTORY
                            </div>
                            <h2 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter text-white pr-4 leading-none">
                                FEATURED <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-white">MISSIONS.</span>
                            </h2>
                        </div>
                        <Button 
                            onClick={() => navigate('/campaigns')}
                            className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-white hover:text-black transition-all shadow-xl shrink-0 flex items-center gap-2"
                        >
                            <span>Explore Full Directory</span> 
                            <ArrowRight size={16} />
                        </Button>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
                        {categories.map((cat, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-6 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 flex items-center gap-2 shadow-lg",
                                    selectedCategory === cat 
                                        ? "bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-105" 
                                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                {cat === 'All' && <Globe size={14} />}
                                {cat === 'Luxury & Fashion' && <Star size={14} />}
                                {cat === 'Tech & Gaming' && <Zap size={14} />}
                                {cat === 'Beauty & Lifestyle' && <Sparkles size={14} />}
                                {cat === 'Food & Travel' && <MapPin size={14} />}
                                <span>{cat}</span>
                            </button>
                        ))}
                    </div>

                    {/* Campaigns Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
                        {filteredCampaigns.map((camp) => (
                            <div key={camp.id} className="group bg-black/40 backdrop-blur-2xl border border-white/10 hover:border-neon-blue/40 rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2 shadow-2xl">
                                <div className="h-56 relative overflow-hidden bg-zinc-900">
                                    <img src={camp.thumbnail} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                    <div className="absolute top-6 left-6 flex flex-wrap gap-2 z-10">
                                        <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-neon-pink flex items-center gap-1.5 shadow-xl">
                                            <MapPin size={12} /> {camp.targetCity || 'Universal'}
                                        </span>
                                        <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-neon-blue flex items-center gap-1.5 shadow-xl">
                                            {camp.platform === 'youtube' ? <Youtube size={12} className="text-red-500" /> : <Instagram size={12} className="text-pink-500" />}
                                            {camp.platform === 'youtube' ? 'YouTube' : 'Instagram'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-8 flex-1 flex flex-col justify-between space-y-6 bg-gradient-to-b from-transparent to-black/60">
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-bold text-neon-blue uppercase tracking-widest">{camp.category || 'Brand Mission'}</span>
                                        <h4 className="text-xl font-black uppercase italic tracking-tight text-white group-hover:text-neon-blue transition-colors line-clamp-2">{camp.title}</h4>
                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 pt-2 border-t border-white/5">
                                            <span>Min. {Number(camp.minInstagramFollowers || 0).toLocaleString()} Followers</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Reward Payout</p>
                                            <p className="text-sm font-black text-neon-green uppercase truncate max-w-[150px]">{camp.reward}</p>
                                        </div>
                                        <Button 
                                            onClick={() => navigate(`/campaign/${camp.id}`)}
                                            className="h-12 px-6 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] group-hover:bg-neon-blue group-hover:text-black transition-all shadow-xl"
                                        >
                                            View Brief
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* ELITE CREATOR ROSTER SHOWCASE (Confluencr Inspired) */}
                <motion.section id="roster" className="space-y-12 pt-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                        <div>
                            <div className="flex items-center gap-3 text-neon-pink font-black tracking-[0.4em] text-[10px] uppercase mb-2">
                                <Users size={14} className="animate-pulse" />
                                ELITE TALENT ROSTER
                            </div>
                            <h2 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter text-white pr-4 leading-none">
                                VERIFIED <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-purple-500 to-neon-blue">CREATORS.</span>
                            </h2>
                        </div>
                        <Button 
                            onClick={() => navigate('/creator/join')}
                            className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-white hover:text-black transition-all shadow-xl shrink-0 flex items-center gap-2"
                        >
                            <span>Join the Roster</span> 
                            <ArrowRight size={16} />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-4">
                        {creatorRoster.map((creator, idx) => (
                            <div key={idx} className="bg-black/60 backdrop-blur-3xl border border-white/10 hover:border-white/30 rounded-[2.5rem] p-8 flex flex-col justify-between space-y-8 transition-all duration-500 hover:-translate-y-2 shadow-2xl group">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <img src={creator.avatar} alt={creator.name} className="w-16 h-16 rounded-2xl object-cover border border-white/20 shadow-xl group-hover:scale-105 transition-transform" />
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="text-lg font-black text-white uppercase tracking-tight">{creator.name}</h4>
                                                <ShieldCheck size={16} className="text-neon-blue" />
                                            </div>
                                            <p className="text-xs font-bold text-neon-pink uppercase tracking-widest">{creator.niche}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center">
                                        <div>
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Followers</p>
                                            <p className="text-sm font-black text-white font-mono">{creator.followers}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Eng. Rate</p>
                                            <p className="text-sm font-black text-neon-blue font-mono">{creator.engagement}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Reach</p>
                                            <p className="text-sm font-black text-neon-green font-mono">{creator.reach}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Recent Brand Collabs</p>
                                        <div className="flex flex-wrap gap-2">
                                            {creator.collabs.map((brand, bIdx) => (
                                                <span key={bIdx} className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300">
                                                    {brand}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    onClick={() => navigate('/creator/join')}
                                    className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] group-hover:bg-white group-hover:text-black transition-all shadow-xl flex items-center justify-center gap-2"
                                >
                                    <span>View Media Kit</span>
                                    <ExternalLink size={12} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* ADVANCED CREATOR SUITE & TOOLS (Later.com Inspired) */}
                <motion.section id="suite" className="space-y-16 pt-12">
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-[10px] font-black uppercase tracking-[0.4em] text-neon-blue mb-2 shadow-2xl">
                            <Sliders size={14} /> ADVANCED CREATOR SUITE
                        </div>
                        <h2 className="text-4xl sm:text-6xl font-black font-heading tracking-tighter uppercase italic text-white pr-4 leading-none">
                            BUILT FOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-white">PROFESSIONALS.</span>
                        </h2>
                        <p className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">
                            Everything you need to automate your commercial pipeline, protect your IP, and secure escrow-backed brand retainers.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        {suiteTools.map((tool, idx) => (
                            <div key={idx} className="bg-black/60 backdrop-blur-3xl border border-white/10 hover:border-white/30 rounded-[3rem] p-10 space-y-8 transition-all duration-500 hover:-translate-y-2 shadow-2xl group flex flex-col justify-between">
                                <div className="space-y-6">
                                    <div className={cn("w-16 h-16 rounded-2xl border flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform", tool.bg, tool.border, tool.color)}>
                                        <tool.icon size={28} />
                                    </div>
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white pr-2">{tool.title}</h3>
                                    <p className="text-gray-400 text-sm font-medium leading-relaxed">{tool.desc}</p>
                                </div>
                                <div className="pt-6 border-t border-white/5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">
                                    <span>Explore Suite Feature</span> <ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* INTERACTIVE EARNINGS & TIER CALCULATOR (Gamified & Highly Engaging) */}
                <motion.section id="calculator" className="space-y-16 pt-12">
                    <div className="p-12 md:p-20 bg-gradient-to-br from-zinc-900/80 via-black/80 to-zinc-900/80 backdrop-blur-3xl border border-white/10 rounded-[4rem] relative overflow-hidden shadow-2xl space-y-12 group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-blue/10 rounded-full blur-[160px] pointer-events-none group-hover:bg-neon-blue/20 transition-all" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-pink/10 rounded-full blur-[160px] pointer-events-none group-hover:bg-neon-pink/20 transition-all" />

                        <div className="text-center max-w-3xl mx-auto space-y-4 relative z-10">
                            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-[10px] font-black uppercase tracking-[0.4em] text-neon-green mb-2 shadow-xl">
                                <TrendingUp size={14} /> INTERACTIVE ESTIMATOR
                            </div>
                            <h2 className="text-4xl sm:text-6xl font-black font-heading tracking-tighter uppercase italic text-white pr-4 leading-none">
                                CALCULATE YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-cyan-400 to-white">POTENTIAL.</span>
                            </h2>
                            <p className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">
                                Adjust your current follower count and primary platform to instantly estimate your monthly commercial revenue and assigned creator tier.
                            </p>
                        </div>

                        {/* Calculator Controls */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 pt-4">
                            {/* Left Controls */}
                            <div className="lg:col-span-7 space-y-10 bg-white/[0.02] border border-white/5 p-8 md:p-12 rounded-[3rem] backdrop-blur-xl shadow-inner">
                                {/* Platform Selector */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-2">1. Select Primary Platform</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setCalcPlatform('instagram')}
                                            className={cn(
                                                "h-16 rounded-2xl border flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-lg",
                                                calcPlatform === 'instagram' ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent scale-105 shadow-[0_0_30px_rgba(236,72,153,0.3)]" : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                                            )}
                                        >
                                            <Instagram size={18} />
                                            <span>Instagram</span>
                                        </button>
                                        <button 
                                            onClick={() => setCalcPlatform('youtube')}
                                            className={cn(
                                                "h-16 rounded-2xl border flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-lg",
                                                calcPlatform === 'youtube' ? "bg-red-600 text-white border-transparent scale-105 shadow-[0_0_30px_rgba(220,38,38,0.3)]" : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                                            )}
                                        >
                                            <Youtube size={18} />
                                            <span>YouTube</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Follower Slider */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">2. Adjust Follower Count</label>
                                        <span className="text-xl font-black text-white font-mono bg-white/5 px-4 py-1.5 rounded-xl border border-white/10 shadow-inner">
                                            {calcFollowers >= 1000000 ? `${(calcFollowers/1000000).toFixed(1)}M` : `${Math.round(calcFollowers/1000)}K`} Followers
                                        </span>
                                    </div>
                                    <div className="space-y-2 px-2">
                                        <input 
                                            type="range" 
                                            min="5000" 
                                            max="1000000" 
                                            step="5000"
                                            value={calcFollowers} 
                                            onChange={(e) => setCalcFollowers(Number(e.target.value))}
                                            className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-green shadow-inner"
                                        />
                                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest pt-1">
                                            <span>5K (Rising)</span>
                                            <span>250K (Pro)</span>
                                            <span>1M+ (Elite)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Included Agent Perks Preview */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Unlocked Representation Perks</p>
                                    <div className="flex items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/5">
                                        <ShieldCheck size={24} className="text-neon-green shrink-0" />
                                        <p className="text-xs font-bold text-white leading-relaxed">{calculatedEarnings.tierPerk}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Results Display */}
                            <div className="lg:col-span-5 space-y-8 p-8 md:p-12 bg-black/60 border border-white/10 rounded-[3rem] backdrop-blur-2xl shadow-2xl flex flex-col justify-between items-center text-center relative overflow-hidden group/calc">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-neon-green via-cyan-400 to-neon-blue" />

                                <div className="space-y-4 w-full">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] block">ESTIMATED COMMERCIAL REVENUE</span>
                                    <h3 className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight leading-none pt-2">
                                        ₹{calculatedEarnings.min.toLocaleString()} - ₹{calculatedEarnings.max.toLocaleString()}
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-1">Per Month (Escrow Payouts)</p>
                                </div>

                                <div className="space-y-4 w-full py-8 border-y border-white/5">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">ASSIGNED NETWORK TIER</p>
                                    <div className="inline-block px-8 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-xl">
                                        <h4 className={cn("text-2xl font-black font-heading uppercase italic tracking-wider", calculatedEarnings.tierColor)}>
                                            {calculatedEarnings.tierName}
                                        </h4>
                                    </div>
                                </div>

                                <Button 
                                    onClick={() => navigate('/creator/join')}
                                    className="w-full h-16 rounded-2xl bg-neon-green text-black font-black uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(57,255,20,0.3)] hover:scale-105 transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Lock In This Tier</span>
                                    <ArrowRight size={16} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* CREATOR TIERS & EXCLUSIVE PERKS */}
                <motion.section id="tiers" className="space-y-16 pt-12">
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-[10px] font-black uppercase tracking-[0.4em] text-neon-pink mb-2 shadow-2xl">
                            <Award size={14} /> ELITE CLASSIFICATION
                        </div>
                        <h2 className="text-4xl sm:text-6xl font-black font-heading tracking-tighter uppercase italic text-white pr-4 leading-none">
                            CREATOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-purple-500 to-neon-blue">TIERS.</span>
                        </h2>
                        <p className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">
                            Unlock escalating commercial benefits, dedicated talent managers, and retainer backing as your audience scales.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-4">
                        {tiers.map((tier, i) => (
                            <div 
                                key={i} 
                                className={cn(
                                    "bg-black/60 backdrop-blur-3xl border rounded-[3rem] p-10 flex flex-col justify-between relative overflow-hidden transition-all duration-500 hover:-translate-y-2 shadow-2xl group",
                                    tier.popular ? "border-pink-500/50 shadow-[0_0_50px_rgba(236,72,153,0.15)]" : "border-white/10 hover:border-white/30"
                                )}
                            >
                                {tier.popular && (
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-pink-500 to-purple-500 text-black font-black text-[9px] uppercase tracking-[0.3em] px-8 py-2 rounded-bl-3xl shadow-lg z-20">
                                        MOST POPULAR
                                    </div>
                                )}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                <div className="space-y-8 relative z-10">
                                    <div className="space-y-3">
                                        <span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border inline-block", tier.badgeClass)}>
                                            {tier.followers}
                                        </span>
                                        <h3 className="text-3xl font-black font-heading uppercase italic tracking-tighter text-white pr-4">{tier.name}</h3>
                                        <p className="text-gray-400 text-xs font-medium leading-relaxed">{tier.description}</p>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-white/5">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">INCLUDED BENEFITS</p>
                                        <ul className="space-y-3">
                                            {tier.perks.map((perk, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-xs font-bold text-gray-300">
                                                    <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neon-green shrink-0 mt-0.5 shadow-sm">
                                                        <CheckCircle2 size={12} />
                                                    </div>
                                                    <span>{perk}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-white/5 relative z-10 mt-8">
                                    <Button 
                                        onClick={() => navigate('/creator/join')}
                                        className={cn(
                                            "w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all",
                                            tier.popular ? "bg-white text-black hover:bg-neon-pink hover:text-white" : "bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black"
                                        )}
                                    >
                                        Apply for {tier.name}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* BRAND TRUST GRID */}
                <motion.section className="space-y-12 text-center pt-8">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em]">TRUSTED BY ELITE BRANDS ACROSS PREMIUM NICHES</p>
                    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                        {['LUXURY & RESORTS', 'TECH & ELECTRONICS', 'HIGH FASHION', 'BEAUTY & WELLNESS', 'PREMIUM HOSPITALITY'].map((brand, i) => (
                            <div key={i} className="px-8 py-5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-xl hover:border-white/20 transition-all shadow-xl group">
                                <span className="text-xs md:text-sm font-black font-heading uppercase italic tracking-widest text-gray-400 group-hover:text-white transition-colors">{brand}</span>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* FAQ SECTION */}
                <motion.section className="max-w-4xl mx-auto space-y-12 pt-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl sm:text-6xl font-black font-heading tracking-tighter uppercase italic text-white pr-4 leading-none">
                            FREQUENTLY ASKED <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-white">QUESTIONS.</span>
                        </h2>
                        <p className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest">Everything you need to know about network certification and payouts.</p>
                    </div>

                    <div className="space-y-4 pt-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-xl transition-all duration-300 shadow-xl">
                                <button 
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full p-8 text-left flex items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className="text-base md:text-lg font-black uppercase tracking-tight italic text-white">{faq.q}</span>
                                    <div className={cn("w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-transform duration-500 shadow-md", openFaq === i ? "rotate-180 bg-white text-black" : "text-gray-400")}>
                                        <ChevronDown size={16} />
                                    </div>
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="px-8 pb-8 text-sm md:text-base text-gray-400 font-medium leading-relaxed border-t border-white/5 pt-6"
                                        >
                                            {faq.a}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* MASSIVE BOTTOM CTA BANNER */}
                <motion.section className="relative bg-gradient-to-r from-neon-blue/20 via-neon-pink/20 to-purple-500/20 backdrop-blur-3xl border border-white/20 rounded-[4rem] p-12 md:p-24 text-center overflow-hidden shadow-[0_0_100px_rgba(46,191,255,0.2)] mt-12">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-neon-blue/30 rounded-full blur-[150px] pointer-events-none animate-pulse" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-neon-pink/30 rounded-full blur-[150px] pointer-events-none animate-pulse delay-700" />

                    <div className="relative z-10 max-w-3xl mx-auto space-y-10">
                        <div className="w-20 h-20 bg-white text-black rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
                            <Sparkles size={36} className="text-black animate-spin-slow" />
                        </div>
                        <h2 className="text-5xl sm:text-7xl font-black font-heading tracking-tighter uppercase italic text-white pr-4 leading-[0.9]">
                            READY TO ELEVATE YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400">INFLUENCE?</span>
                        </h2>
                        <p className="text-gray-300 text-base md:text-xl font-bold uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
                            Join hundreds of elite creators already monetizing their audience through verified, high-ticket brand missions.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Button 
                                onClick={() => navigate('/creator/join')}
                                className="w-full sm:w-auto h-20 px-16 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-sm shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:bg-neon-blue hover:text-black transition-all hover:scale-105 flex items-center justify-center gap-3"
                            >
                                <span>Apply for Certification</span> 
                                <ArrowRight size={20} />
                            </Button>
                        </div>
                    </div>
                </motion.section>
            </main>
        </div>
    );
};

export default CreatorLanding;
