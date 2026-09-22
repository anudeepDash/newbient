import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
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
import CampaignDetailModal from '../components/creator/CampaignDetailModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const PLATFORMS = {
    all: { label: 'All Platforms', icon: Globe },
    instagram: { label: 'Instagram', icon: Instagram },
    youtube: { label: 'YouTube', icon: Youtube },
    twitter: { label: 'Twitter / X', icon: Twitter },
    other: { label: 'Other', icon: Star },
};

const LiveCampaigns = () => {
    useStoreSubscription(['campaigns']);
    const navigate = useNavigate();
    const { campaigns, user, resolveCreatorProfile, updateCreator, setAuthModal } = useStore();
    
    const [profile, setProfile] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('all');
    const [selectedCity, setSelectedCity] = useState('All');
    const [selectedCampaignForModal, setSelectedCampaignForModal] = useState(null);
    const [applyingCampaignId, setApplyingCampaignId] = useState(null);

    useEffect(() => {
        if (user && resolveCreatorProfile) {
            resolveCreatorProfile(user).then(p => {
                if (p) setProfile(p);
            }).catch(err => console.error("Error loading profile in LiveCampaigns:", err));
        }
    }, [user, resolveCreatorProfile]);

    const handleDirectApply = async (campaign) => {
        if (!user) {
            setAuthModal(true);
            return;
        }
        if (!profile) {
            setSelectedCampaignForModal(campaign);
            return;
        }

        const minFollowers = Number(campaign?.minInstagramFollowers || 0);
        const count = Number(profile.instagramFollowers || 0);
        const isAutoVerified = Boolean(
            profile.instagramVerified || 
            profile.isVerified || 
            profile.profileStatus === 'approved'
        );
        const meetsCriteria = minFollowers <= 0 || count >= minFollowers || isAutoVerified;

        if (!meetsCriteria) {
            useStore.getState().addToast(`Requires at least ${minFollowers.toLocaleString()} followers (${count.toLocaleString()} on profile).`, 'error');
            setSelectedCampaignForModal(campaign);
            return;
        }

        const currentJoined = profile.joinedCampaigns || [];
        if (currentJoined.includes(campaign.id)) {
            useStore.getState().addToast("You've already applied to this campaign!", 'info');
            return;
        }

        setApplyingCampaignId(campaign.id);
        try {
            const creatorData = {
                ...profile,
                uid: user.uid,
                email: user.email || profile.email,
                name: profile.name || user.displayName || '',
                phone: profile.phone || '',
                city: profile.city || '',
                instagram: profile.instagram || '',
                instagramFollowers: parseInt(profile.instagramFollowers || 0, 10),
                joinedCampaigns: [...currentJoined, campaign.id]
            };

            await updateCreator(user.uid, creatorData);
            setProfile(creatorData);
            useStore.getState().addToast(`Applied to ${campaign.title} successfully!`, 'success');
        } catch (err) {
            console.error("Direct apply failed:", err);
            useStore.getState().addToast(err.message || "Failed to apply directly. Opening campaign details...", 'error');
            setSelectedCampaignForModal(campaign);
        } finally {
            setApplyingCampaignId(null);
        }
    };

    // Filter active and past campaigns (exclude only Draft)
    const filteredCampaigns = useMemo(() => {
        const visible = (campaigns || []).filter(c => c.status && c.status !== 'Draft');

        return visible.filter(camp => {
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
        <div className="min-h-screen bg-gray-50 dark:bg-[#030303] text-gray-900 dark:text-white selection:bg-neon-blue selection:text-black overflow-hidden relative pb-40">
            {/* Ambient Cinematic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[160px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[50%] bg-neon-pink/10 rounded-full blur-[160px] animate-pulse delay-700" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>

            <div className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-12 pt-32 md:pt-40 space-y-16">
                {/* DIRECTORY HEADER */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-black/10 dark:border-white/5 pb-12">
                    <div className="space-y-4 max-w-3xl">
                        <h1 className="text-5xl sm:text-7xl font-black font-heading tracking-tighter uppercase italic text-gray-900 dark:text-white pr-4 leading-none">
                            DISCOVER <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-black dark:to-white">CAMPAIGNS.</span>
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">
                            Browse active brand opportunities. Filter by platform, city, and follower requirements to apply for your next partnership.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto shrink-0">
                        <Button 
                            onClick={() => navigate('/creator')}
                            className="h-14 sm:h-16 px-6 sm:px-8 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-black/10 dark:hover:bg-white/10 transition-all backdrop-blur-xl shadow-sm"
                        >
                            Creator Network Home
                        </Button>
                        <Button 
                            onClick={() => navigate('/creator/join')}
                            className="h-14 sm:h-16 px-6 sm:px-8 rounded-2xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neon-blue dark:hover:text-black font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl"
                        >
                            Register Profile <ArrowRight size={16} className="ml-2 inline" />
                        </Button>
                    </div>
                </div>

                {/* SEARCH & FILTER BENCH */}
                <div className="bg-white dark:bg-black/60 backdrop-blur-3xl border border-black/10 dark:border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl space-y-8 relative z-30">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Search Input */}
                        <div className="lg:col-span-6 relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400" size={20} />
                            <Input 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search campaigns by brand, title, or keywords..."
                                className="w-full h-16 pl-16 pr-6 bg-gray-100 dark:bg-white/[0.03] border-black/10 dark:border-white/10 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-600 focus:border-neon-blue transition-all"
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
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide pt-4 border-t border-black/10 dark:border-white/5">
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
                                        isActive ? "bg-neon-blue text-black border-neon-blue shadow-[0_0_20px_rgba(46,191,255,0.3)]" : "bg-gray-100 dark:bg-white/[0.02] border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 hover:bg-gray-200/50 dark:hover:bg-white/[0.05]"
                                    )}
                                >
                                    <Icon size={16} className={isActive ? "text-black" : "text-gray-600 dark:text-gray-400"} />
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
                                        className="group bg-gray-100 dark:bg-zinc-950/45 backdrop-blur-3xl border border-gray-200 dark:border-white/[0.08] hover:border-neon-blue/30 rounded-[2.2rem] overflow-hidden flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 shadow-md dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(0,240,255,0.1)] relative"
                                    >
                                        <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-zinc-900 shrink-0">
                                             <img src={camp.thumbnail || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800'} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-80" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />
                                            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 gap-2">
                                                <span className="px-3.5 py-1.5 rounded-full bg-white dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-neon-pink flex items-center gap-1.5 shadow-xl">
                                                    <MapPin size={12} /> {camp.targetCity || 'Universal'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {camp.status && camp.status.toLowerCase() !== 'open' && (
                                                        <span className={cn(
                                                            "px-3 py-1.5 rounded-full backdrop-blur-md text-[9px] font-black uppercase tracking-widest border shadow-xl",
                                                            camp.status.toLowerCase() === 'closed' 
                                                                ? "bg-red-500/20 text-red-500 border-red-500/30" 
                                                                : "bg-neon-green/20 text-neon-green border-neon-green/30"
                                                        )}>
                                                            {camp.status}
                                                        </span>
                                                    )}
                                                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white shadow-xl">
                                                        <PlatIcon size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6 sm:space-y-8 bg-gradient-to-b from-transparent to-zinc-950/40">
                                            <div className="space-y-4">
                                                <h3 className="text-2xl font-black uppercase italic tracking-tight text-gray-900 dark:text-white group-hover:text-neon-blue transition-colors line-clamp-2 pr-2 leading-none">{camp.title}</h3>
                                                <p className="text-gray-600 dark:text-gray-400 text-xs font-medium leading-relaxed line-clamp-2">{camp.description || 'Exclusive brand mission requiring verified creator fulfillment and professional engagement deliverables.'}</p>
                                                
                                                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-black/10 dark:border-white/5">
                                                    <span className="px-3.5 py-1.5 rounded-xl bg-gray-200/60 dark:bg-white/[0.03] border border-black/10 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                        <Users size={12} className="text-neon-blue" /> Min. {Number(camp.minInstagramFollowers || 0).toLocaleString()} Followers
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-black/10 dark:border-white/5 mt-auto shrink-0">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Reward Payout</p>
                                                    <p className="text-base font-black text-neon-green uppercase truncate max-w-[160px] italic">{camp.reward}</p>
                                                </div>

                                                {(() => {
                                                    const isJoined = profile && (profile.joinedCampaigns || []).includes(camp.id);
                                                    const minFollowers = Number(camp.minInstagramFollowers || 0);
                                                    const followersCount = Number(profile?.instagramFollowers || 0);
                                                    const isAutoVerified = Boolean(
                                                        profile?.instagramVerified || 
                                                        profile?.isVerified || 
                                                        profile?.profileStatus === 'approved'
                                                    );
                                                    const isEligible = Boolean(profile) && (
                                                        isAutoVerified ||
                                                        minFollowers <= 0 ||
                                                        followersCount >= minFollowers
                                                    );

                                                    if (isJoined) {
                                                        return (
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-3.5 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-neon-green border border-emerald-500/20 font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-mono">
                                                                    <CheckCircle2 size={12} className="stroke-[2.5]" />
                                                                    <span>Applied</span>
                                                                </span>
                                                                <Button 
                                                                    onClick={() => setSelectedCampaignForModal(camp)}
                                                                    className="h-11 px-4 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider text-[10px] hover:bg-black/10 dark:hover:bg-white/10"
                                                                >
                                                                    <span>Brief</span>
                                                                </Button>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                            <Button 
                                                                onClick={() => setSelectedCampaignForModal(camp)}
                                                                className="h-11 sm:h-12 px-4 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200 font-bold uppercase tracking-wider text-[10px] hover:bg-black/10 dark:hover:bg-white/10"
                                                            >
                                                                <span>View Brief</span>
                                                            </Button>

                                                            {isEligible ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDirectApply(camp);
                                                                    }}
                                                                    disabled={applyingCampaignId === camp.id}
                                                                    className="h-11 sm:h-12 px-4 sm:px-6 rounded-full bg-neon-green text-black font-black uppercase tracking-wider text-[10px] sm:text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(57,255,20,0.3)] cursor-pointer shrink-0"
                                                                >
                                                                    {applyingCampaignId === camp.id ? (
                                                                        <LoadingSpinner size="xs" color="#000000" />
                                                                    ) : (
                                                                        <>
                                                                            <Zap size={12} className="fill-black stroke-black shrink-0" />
                                                                            <span>1-Click Apply</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <Button 
                                                                    onClick={() => setSelectedCampaignForModal(camp)}
                                                                    className={cn(
                                                                        "h-11 sm:h-12 px-5 sm:px-6 rounded-full font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-xl flex items-center justify-center gap-2 border-none",
                                                                        (!camp.status || camp.status.toLowerCase() === 'open')
                                                                            ? "bg-white text-black hover:bg-neon-blue hover:text-black hover:scale-105"
                                                                            : "bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-black/10 dark:border-white/10"
                                                                    )}
                                                                >
                                                                    <span>Apply</span> 
                                                                    <ArrowRight size={12} />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {filteredCampaigns.length === 0 && (
                        <div className="py-32 text-center bg-white dark:bg-black/40 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-[3rem] p-12 shadow-2xl max-w-3xl mx-auto space-y-6">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mx-auto text-gray-600">
                                <Search size={40} />
                            </div>
                            <h3 className="text-3xl font-black font-heading uppercase italic tracking-tighter text-gray-900 dark:text-white pr-4">No matching missions found.</h3>
                            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                                Try adjusting your search keywords, selecting a different platform, or expanding your city filter to discover more brand gigs.
                            </p>
                            <Button 
                                onClick={() => { setSearchQuery(''); setSelectedPlatform('all'); setSelectedCity('All'); }}
                                className="h-16 px-10 rounded-2xl bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all mt-4"
                            >
                                Reset All Filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Campaign Detail Modal */}
            <AnimatePresence>
                {selectedCampaignForModal && (
                    <CampaignDetailModal 
                        campaign={selectedCampaignForModal}
                        onClose={() => setSelectedCampaignForModal(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default LiveCampaigns;
