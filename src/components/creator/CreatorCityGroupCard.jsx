import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { DEFAULT_CREATOR_GROUPS } from '../../lib/constants';
import { requestAutoLocation } from '../../lib/location';
import { cn } from '../../lib/utils';
import confetti from 'canvas-confetti';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Check from 'lucide-react/dist/esm/icons/check';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Search from 'lucide-react/dist/esm/icons/search';

// Standard SVG for WhatsApp
const WhatsAppIcon = ({ className = "w-5 h-5", size = 20 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const normalizeCity = (cityStr = '') => {
    const raw = String(cityStr || '').trim().toLowerCase();
    if (!raw) return '';
    if (/^bang[al]*o?re$/i.test(raw) || raw.includes('bengaluru') || raw.includes('bangalore')) return 'Bengaluru';
    if (raw.includes('hyderabad') || raw.includes('secunderabad')) return 'Hyderabad';
    if (raw.includes('chandigarh') || raw.includes('mohali') || raw.includes('panchkula') || raw.includes('tricity')) return 'Chandigarh';
    if (raw.includes('mumbai') || raw.includes('bombay') || raw.includes('navi mumbai') || raw.includes('thane')) return 'Mumbai';
    if (raw.includes('pune') || raw.includes('poona')) return 'Pune';
    if (raw.includes('kolkata') || raw.includes('calcutta')) return 'Kolkata';
    if (raw.includes('kochi') || raw.includes('cochin') || raw.includes('kerala') || raw.includes('ernakulam')) return 'Kochi';
    if (raw.includes('delhi') || raw.includes('ncr') || raw.includes('noida') || raw.includes('gurugram') || raw.includes('gurgaon')) return 'Delhi';
    if (raw.includes('bhubaneswar') || raw.includes('bhubaneshwar') || raw.includes('cuttack')) return 'Bhubaneswar & Cuttack';
    if (raw.includes('vizag') || raw.includes('visakhapatnam')) return 'Vizag';
    if (raw.includes('jaipur')) return 'Jaipur';
    if (raw.includes('ahmedabad')) return 'Ahmedabad';
    if (raw.includes('chennai') || raw.includes('madras')) return 'Chennai';
    if (raw.includes('goa')) return 'Goa';
    if (raw.includes('indore')) return 'Indore';
    if (raw.includes('lucknow')) return 'Lucknow';
    if (raw.includes('guwahati')) return 'Guwahati';
    if (raw.includes('surat')) return 'Surat';
    if (raw.includes('bhopal')) return 'Bhopal';
    if (raw.includes('kolhapur')) return 'Kolhapur';
    if (raw.includes('shillong')) return 'Shillong';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const CreatorCityGroupCard = ({
    initialCity = '',
    creatorId = null,
    isJoined = false,
    onJoinMarked = null,
    className = ''
}) => {
    useStoreSubscription(['creatorGroups']);
    const { creatorGroups, markCreatorCityGroupJoined, addToast } = useStore();
    const dropdownRef = useRef(null);

    const [selectedCity, setSelectedCity] = useState(normalizeCity(initialCity) || '');
    const [citySearch, setCitySearch] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [hasJoined, setHasJoined] = useState(isJoined);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setHasJoined(isJoined);
    }, [isJoined]);

    useEffect(() => {
        if (!selectedCity && initialCity) {
            setSelectedCity(normalizeCity(initialCity));
        }
    }, [initialCity]);

    // Merge remote groups with defaults for options
    const activeGroups = useMemo(() => {
        const remote = (creatorGroups || []).filter(g => g.isActive !== false);
        const map = new Map();
        remote.forEach(g => {
            if (g.city) map.set(normalizeCity(g.city), g);
        });

        DEFAULT_CREATOR_GROUPS.forEach(dg => {
            const key = normalizeCity(dg.city);
            if (!map.has(key)) {
                map.set(key, dg);
            }
        });
        
        return Array.from(map.values()).sort((a, b) => a.city.localeCompare(b.city));
    }, [creatorGroups]);

    const currentGroup = useMemo(() => {
        const targetKey = normalizeCity(selectedCity);
        if (!targetKey) return activeGroups[0] || DEFAULT_CREATOR_GROUPS[0];
        
        const exact = activeGroups.find(g => normalizeCity(g.city) === targetKey);
        if (exact) return exact;

        const partial = activeGroups.find(g => {
            const gKey = normalizeCity(g.city);
            return gKey.includes(targetKey.toLowerCase()) || targetKey.toLowerCase().includes(gKey);
        });
        if (partial) return partial;

        // Fallback to Pan-India
        const panIndia = activeGroups.find(g => {
            const gKey = normalizeCity(g.city);
            return gKey.includes('pan-india') || gKey.includes('india') || gKey.includes('remote') || gKey.includes('all');
        });
        if (panIndia) return panIndia;

        return activeGroups[0] || DEFAULT_CREATOR_GROUPS[0];
    }, [activeGroups, selectedCity]);

    const filteredGroups = useMemo(() => {
        if (!citySearch.trim()) return activeGroups;
        const q = citySearch.toLowerCase();
        return activeGroups.filter(g => g.city.toLowerCase().includes(q));
    }, [activeGroups, citySearch]);

    const handleJoinClick = () => {
        if (currentGroup?.groupUrl) {
            window.open(currentGroup.groupUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const handleMarkJoined = async () => {
        setHasJoined(true);
        try {
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });
        } catch (e) {}

        if (creatorId && markCreatorCityGroupJoined) {
            try {
                await markCreatorCityGroupJoined(creatorId);
            } catch (err) {
                console.warn('markJoined error:', err);
            }
        }
        if (onJoinMarked) onJoinMarked(currentGroup);
        addToast(`Verified! You're in the ${currentGroup.city} Creators Hub. 🎉`, 'success');
    };

    const handleCopyInvite = () => {
        if (!currentGroup?.groupUrl) return;
        navigator.clipboard.writeText(currentGroup.groupUrl);
        setCopied(true);
        addToast('WhatsApp invite link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    // Auto-detect location silently on mount if not set
    useEffect(() => {
        if (!selectedCity && !initialCity) {
            requestAutoLocation()
                .then(({ city }) => {
                    if (city) {
                        setSelectedCity(normalizeCity(city));
                    }
                })
                .catch(() => {});
        }
    }, [selectedCity, initialCity]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.city-dropdown-container')) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!currentGroup) return null;

    const renderCityDropdown = (alignRight = true) => (
        <div className="relative inline-block city-dropdown-container">
            <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.09] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-gray-700 dark:text-zinc-200 transition-colors inline-flex items-center gap-1.5 active:scale-95 shrink-0"
                title="Change city"
            >
                <MapPin size={13} className="text-[#25D366] shrink-0" />
                <span>{selectedCity || currentGroup.city}</span>
                <ChevronDown size={13} className={cn("opacity-50 transition-transform duration-200 shrink-0", dropdownOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {dropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className={cn(
                            "absolute top-full mt-1.5 w-52 max-h-60 overflow-hidden bg-white dark:bg-[#121620] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-xl z-50 p-1.5 backdrop-blur-2xl flex flex-col",
                            alignRight ? "right-0" : "left-0"
                        )}
                    >
                        <div className="relative mb-1 px-1">
                            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
                            <input
                                type="text"
                                value={citySearch}
                                onChange={(e) => setCitySearch(e.target.value)}
                                placeholder="Search city..."
                                className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] rounded-xl pl-6 pr-2 py-1 text-[11px] text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#25D366]"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="overflow-y-auto max-h-44 custom-scrollbar space-y-0.5">
                            {filteredGroups.map((g) => {
                                const isCur = selectedCity === normalizeCity(g.city);
                                return (
                                    <button
                                        key={g.id || g.city}
                                        type="button"
                                        onClick={() => {
                                            setSelectedCity(normalizeCity(g.city));
                                            setDropdownOpen(false);
                                            setCitySearch('');
                                        }}
                                        className={cn(
                                            "w-full text-left px-2.5 py-1.5 text-xs rounded-xl transition-colors flex items-center justify-between",
                                            isCur
                                                ? "bg-black/[0.05] dark:bg-white/10 font-bold text-gray-950 dark:text-white"
                                                : "text-gray-600 dark:text-zinc-300 hover:bg-black/[0.02] dark:hover:bg-white/5"
                                        )}
                                    >
                                        <span>{g.city}</span>
                                        {isCur && <Check size={11} className="text-[#25D366]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative overflow-visible rounded-2xl sm:rounded-3xl border transition-all duration-200",
                dropdownOpen ? "z-30" : "z-10",
                "bg-white/80 dark:bg-[#121620]/80 backdrop-blur-xl",
                "border-black/[0.08] dark:border-white/[0.1] shadow-xs hover:shadow-sm",
                "p-4 sm:p-5",
                className
            )}
        >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Icon + Content */}
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                    {/* Sleek WhatsApp Squircle */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-[0_2px_10px_rgba(37,211,102,0.25)] shrink-0">
                        <WhatsAppIcon size={22} className="text-white fill-current" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h4 className="text-base sm:text-lg font-bold text-gray-950 dark:text-white tracking-tight mb-0.5">
                            {currentGroup.city} Creators Hub
                        </h4>

                        <p className="text-xs sm:text-[13px] text-gray-500 dark:text-zinc-400 font-normal leading-relaxed line-clamp-2 sm:line-clamp-1">
                            {hasJoined
                                ? `Confirmed member in ${currentGroup.city}. Festival passes, call times, and brand deliverables drop here.`
                                : `Official community for festival passes, call times, and brand deliverables in ${currentGroup.city}.`}
                        </p>
                    </div>
                </div>

                {/* Right: Clean Unified Single-Line Action Cluster */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-start md:self-center flex-nowrap">
                    {/* Primary WhatsApp Action */}
                    <a
                        href={currentGroup.groupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleJoinClick}
                        className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 shadow-[0_2px_8px_rgba(37,211,102,0.2)] transition-all shrink-0"
                    >
                        <WhatsAppIcon size={16} className="text-black shrink-0" />
                        <span className="hidden sm:inline">{hasJoined ? 'Open WhatsApp' : 'Join WhatsApp'}</span>
                        <span className="sm:hidden">{hasJoined ? 'Open' : 'Join'}</span>
                        <ArrowRight size={13} className="opacity-75 shrink-0 hidden sm:inline" />
                    </a>

                    {/* Secondary Confirmation */}
                    {!hasJoined ? (
                        <button
                            type="button"
                            onClick={handleMarkJoined}
                            className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.09] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-gray-700 dark:text-zinc-200 transition-colors flex items-center gap-1.5 active:scale-95 shrink-0"
                        >
                            <Check size={12} strokeWidth={2.5} className="text-[#25D366] shrink-0" />
                            <span>I've Joined</span>
                        </button>
                    ) : (
                        <span className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                            <CheckCircle2 size={13} className="shrink-0" />
                            <span>Verified</span>
                        </span>
                    )}

                    {/* Copy Link Button */}
                    <button
                        type="button"
                        onClick={handleCopyInvite}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.09] border border-black/[0.06] dark:border-white/[0.08] text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors active:scale-95 shrink-0"
                        title="Copy WhatsApp Group Link"
                        aria-label="Copy WhatsApp Group Link"
                    >
                        {copied ? <Check size={13} className="text-[#25D366]" /> : <Copy size={13} />}
                    </button>

                    {/* City Dropdown */}
                    <div className="shrink-0">
                        {renderCityDropdown(true)}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default CreatorCityGroupCard;

