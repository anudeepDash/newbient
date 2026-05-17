import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { 
    Search, 
    Filter, 
    MapPin, 
    Users, 
    Zap, 
    ArrowRight, 
    Sparkles, 
    Instagram, 
    Youtube, 
    Twitter, 
    Globe, 
    Star, 
    CheckCircle2 
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PREDEFINED_CITIES } from '../lib/constants';
import StudioSelect from '../components/ui/StudioSelect';

const PLATFORMS = {
    all: { label: 'All Platforms', icon: Globe },
    instagram: { label: 'Instagram', icon: Instagram },
    youtube: { label: 'YouTube', icon: Youtube },
    twitter: { label: 'Twitter / X', icon: Twitter },
    other: { label: 'Other', icon: Star },
};

const LiveCampaigns = () => {
    const navigate = useNavigate();
    const { campaigns } = useStore();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('all');
    const [selectedCity, setSelectedCity] = useState('All');

    // Filter active campaigns
    const filteredCampaigns = useMemo(() => {
        const live = campaigns.filter(c => c.status === 'Open');
        
        // If store is empty or has no open campaigns, provide premium fallback mockups
        const baseList = live.length > 0 ? live : [
            { id: '1', title: 'Luxury Lifestyle Summer Collab', description: 'Partner with a world-renowned luxury resort chain for their upcoming summer destination campaign.', targetCity: 'Mumbai', reward: '₹25,000 + Stay', minInstagramFollowers: 25000, platform: 'instagram', thumbnail: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800' },
            { id: '2', title: 'Tech Flagship Smartphone Launch', description: 'Create unboxing and review content for the newest flagship smartphone release.', targetCity: 'Bangalore', reward: '₹40,000 + Device', minInstagramFollowers: 50000, platform: 'youtube', thumbnail: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=800' },
            { id: '3', title: 'Premium Streetwear Drop Vol. 4', description: 'Showcase urban streetwear aesthetics in high-energy reels and story sequences.', targetCity: 'Delhi', reward: '₹15,000 + Wardrobe', minInstagramFollowers: 10000, platform: 'instagram', thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800' },
            { id: '4', title: 'Gourmet Culinary Experience Invite', description: 'Attend an exclusive multi-course tasting menu event at a Michelin-starred restaurant.', targetCity: 'Mumbai', reward: '₹20,000 + Experience', minInstagramFollowers: 30000, platform: 'instagram', thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800' },
            { id: '5', title: 'Fintech Gen-Z Investment Masterclass', description: 'Educate young investors on smart SIPs and stock market fundamentals through engaging threads.', targetCity: 'Any', reward: '₹35,000', minInstagramFollowers: 40000, platform: 'twitter', thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800' }
        ];

        return baseList.filter(camp => {
            const matchesSearch = camp.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  camp.description?.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesPlatform = selectedPlatform === 'all' || 
                                    (camp.platform || 'instagram').toLowerCase() === selectedPlatform.toLowerCase();
            
            const matchesCity = selectedCity === 'All' || 
                                camp.targetCity?.toLowerCase() === 'any' ||
                                camp.targetCity?.toLowerCase() === selectedCity.toLowerCase();

            return matchesSearch && matchesPlatform && matchesCity;
        });
    }, [campaigns, searchQuery, selectedPlatform, selectedCity]);

    const cityOptions = useMemo(() => {
        return [{ value: 'All', label: 'ALL CITIES / UNIVERSAL' }, ...PREDEFINED_CITIES.map(c => ({ value: c, label: c.toUpperCase() }))];
    }, []);

    return (
        <div className="min-h-screen bg-[#030303] text-white selection:bg-neon-blue selection:text-black overflow-hidden relative pb-40">
            {/* Ambient Cinematic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[160px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[50%] bg-neon-pink/10 rounded-full blur-[160px] animate-pulse delay-700" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>

            <div className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-12 pt-32 md:pt-40 space-y-16">
                {/* DIRECTORY HEADER */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
                    <div className="space-y-4 max-w-3xl">
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-[10px] font-black uppercase tracking-[0.4em] text-neon-blue shadow-xl">
                            <Sparkles size={14} className="animate-spin-slow" /> LIVE MISSION BOARD
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-black font-heading tracking-tighter uppercase italic text-white pr-4 leading-none">
                            DISCOVER <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-white">CAMPAIGNS.</span>
                        </h1>
                        <p className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">
                            Browse verified, escrow-backed brand opportunities. Filter by platform, city, and follower requirements to claim your next high-ticket collaboration.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <Button 
                            onClick={() => navigate('/creator')}
                            className="h-16 px-8 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-white hover:text-black transition-all backdrop-blur-xl shadow-2xl"
                        >
                            Creator Network Home
                        </Button>
                        <Button 
                            onClick={() => navigate('/creator/join')}
                            className="h-16 px-8 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-neon-blue hover:text-black transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        >
                            Apply for Certification <ArrowRight size={16} className="ml-2" />
                        </Button>
                    </div>
                </div>

                {/* SEARCH & FILTER BENCH */}
                <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-8 relative z-30">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Search Input */}
                        <div className="lg:col-span-6 relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <Input 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search campaigns by brand, title, or keywords..."
                                className="w-full h-16 pl-16 pr-6 bg-white/[0.03] border-white/10 rounded-2xl text-sm font-bold text-white placeholder:text-gray-600 focus:border-neon-blue transition-all"
                            />
                        </div>

                        {/* City Dropdown */}
                        <div className="lg:col-span-6">
                            <StudioSelect 
                                value={selectedCity} 
                                options={cityOptions}
                                onChange={val => setSelectedCity(val)} 
                                placeholder="FILTER BY CITY"
                                className="h-16"
                                accentColor="neon-blue"
                            />
                        </div>
                    </div>

                    {/* Platform Filter Tabs */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide pt-4 border-t border-white/5">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mr-4 shrink-0">
                            <Filter size={14} /> Platform:
                        </span>
                        {Object.entries(PLATFORMS).map(([key, plat]) => {
                            const Icon = plat.icon;
                            const isActive = selectedPlatform === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedPlatform(key)}
                                    className={cn(
                                        "h-12 px-6 rounded-xl border flex items-center gap-2.5 text-xs font-black uppercase tracking-wider shrink-0 transition-all",
                                        isActive ? "bg-neon-blue text-black border-neon-blue shadow-[0_0_20px_rgba(46,191,255,0.3)]" : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/[0.05]"
                                    )}
                                >
                                    <Icon size={16} className={isActive ? "text-black" : "text-gray-400"} />
                                    {plat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* CAMPAIGNS GRID */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">
                            SHOWING {filteredCampaigns.length} MATCHING OPPORTUNITIES
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                        <AnimatePresence mode="popLayout">
                            {filteredCampaigns.map((camp) => {
                                const platInfo = PLATFORMS[camp.platform?.toLowerCase()] || PLATFORMS.instagram;
                                const PlatIcon = platInfo.icon;

                                return (
                                    <motion.div
                                        key={camp.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.4 }}
                                        className="group bg-black/40 backdrop-blur-2xl border border-white/10 hover:border-neon-blue/40 rounded-[2.5rem] overflow-hidden flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 shadow-2xl relative"
                                    >
                                        <div className="h-64 relative overflow-hidden bg-zinc-900 shrink-0">
                                            <img src={camp.thumbnail || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800'} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                                            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 gap-2">
                                                <span className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-neon-pink flex items-center gap-1.5 shadow-xl">
                                                    <MapPin size={12} /> {camp.targetCity || 'Universal'}
                                                </span>
                                                <div className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-xl">
                                                    <PlatIcon size={18} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 flex-1 flex flex-col justify-between space-y-8 bg-gradient-to-b from-transparent to-black/60">
                                            <div className="space-y-4">
                                                <h3 className="text-2xl font-black uppercase italic tracking-tight text-white group-hover:text-neon-blue transition-colors line-clamp-2 pr-2">{camp.title}</h3>
                                                <p className="text-gray-400 text-xs font-medium leading-relaxed line-clamp-3">{camp.description || 'Exclusive brand mission requiring verified creator fulfillment and professional engagement deliverables.'}</p>
                                                
                                                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/5">
                                                    <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-300 flex items-center gap-1.5">
                                                        <Users size={12} className="text-neon-blue" /> Min. {Number(camp.minInstagramFollowers || 0).toLocaleString()} Followers
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto shrink-0">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Reward Payout</p>
                                                    <p className="text-base font-black text-neon-green uppercase truncate max-w-[160px]">{camp.reward}</p>
                                                </div>
                                                <Button 
                                                    onClick={() => navigate(`/campaign/${camp.id}`)}
                                                    className="h-14 px-8 rounded-xl bg-white text-black font-black uppercase tracking-widest text-xs group-hover:bg-neon-blue group-hover:text-black transition-all shadow-xl"
                                                >
                                                    View Brief & Apply <ArrowRight size={16} className="ml-2" />
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {filteredCampaigns.length === 0 && (
                        <div className="py-32 text-center bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 shadow-2xl max-w-3xl mx-auto space-y-6">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-600">
                                <Search size={40} />
                            </div>
                            <h3 className="text-3xl font-black font-heading uppercase italic tracking-tighter text-white pr-4">No matching missions found.</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                                Try adjusting your search keywords, selecting a different platform, or expanding your city filter to discover more brand gigs.
                            </p>
                            <Button 
                                onClick={() => { setSearchQuery(''); setSelectedPlatform('all'); setSelectedCity('All'); }}
                                className="h-16 px-10 rounded-2xl bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all mt-4"
                            >
                                Reset All Filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveCampaigns;
