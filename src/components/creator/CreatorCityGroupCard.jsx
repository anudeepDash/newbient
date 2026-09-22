import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { DEFAULT_CREATOR_GROUPS } from '../../lib/constants';
import { requestAutoLocation } from '../../lib/location';
import { cn } from '../../lib/utils';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Check from 'lucide-react/dist/esm/icons/check';

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
    // Return formatted version of whatever it is
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
    const [isDetecting, setIsDetecting] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [hasJoined, setHasJoined] = useState(isJoined);

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

        const list = [...remote];
        DEFAULT_CREATOR_GROUPS.forEach(dg => {
            const key = normalizeCity(dg.city);
            if (!map.has(key)) {
                list.push(dg);
                map.set(key, dg);
            }
        });
        
        // Return uniquely named groups to avoid duplicates in dropdown
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

    const handleJoinClick = async () => {
        if (hasJoined) return;

        if (!selectedCity) {
            addToast("Please select a city first", "error");
            return;
        }

        if (currentGroup?.groupUrl) {
            window.open(currentGroup.groupUrl, '_blank', 'noopener,noreferrer');
            setHasJoined(true);
            if (creatorId && markCreatorCityGroupJoined) {
                try {
                    await markCreatorCityGroupJoined(creatorId);
                    if (onJoinMarked) onJoinMarked(currentGroup);
                } catch (err) {
                    console.warn('markJoined error:', err);
                }
            }
        }
    };

    const handleDetect = async () => {
        setIsDetecting(true);
        try {
            const { city } = await requestAutoLocation();
            if (city) {
                setSelectedCity(normalizeCity(city));
                addToast(`Location detected: ${city}`, "success");
            }
        } catch (err) {
            addToast("Could not detect location automatically.", "error");
        } finally {
            setIsDetecting(false);
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const initialLetter = selectedCity ? selectedCity.charAt(0).toUpperCase() : 'W';

    return (
        <div className={cn(
            "flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-[#0c0e14] p-3 rounded-2xl sm:rounded-full border border-gray-200 dark:border-white/10 shadow-sm transition-all",
            className
        )}>
            {/* Left Section: Icon and Text */}
            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto pl-1 sm:pl-2">
                <div className="w-10 h-10 rounded-[14px] bg-[#e6f8ee] dark:bg-[#e6f8ee]/10 text-[#25D366] flex items-center justify-center shrink-0">
                    <WhatsAppIcon size={20} />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-[13px]">
                        <span className="font-black text-gray-950 dark:text-white">{initialLetter}</span>
                        <span className="text-[#1b9a59] dark:text-[#25D366] font-bold text-[18px] leading-[0.5] mt-[-2px]">•</span>
                        <span className="font-bold text-[#1b9a59] dark:text-[#25D366]">Required</span>
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400 truncate max-w-[180px] sm:max-w-[220px]">
                        Brand briefs, concert passes...
                    </span>
                </div>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 hide-scrollbar shrink-0">
                {/* Detect Button */}
                <button
                    onClick={handleDetect}
                    disabled={isDetecting || hasJoined}
                    className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[11px] font-black tracking-wider text-gray-600 dark:text-zinc-300 uppercase shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDetecting ? (
                        <Loader2 size={14} className="animate-spin text-gray-400" />
                    ) : (
                        <MapPin size={14} className="text-gray-400" />
                    )}
                    <span>Detect</span>
                </button>

                {/* Dropdown */}
                <div className="relative shrink-0" ref={dropdownRef}>
                    <button
                        onClick={() => !hasJoined && setDropdownOpen(!dropdownOpen)}
                        disabled={hasJoined}
                        className="flex items-center justify-between gap-2 h-10 px-4 min-w-[120px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-[13px] font-bold text-gray-900 dark:text-white transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <span>{selectedCity || 'Select City'}</span>
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>
                    
                    <AnimatePresence>
                        {dropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 w-48 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-xl shadow-lg z-50 py-1"
                            >
                                {activeGroups.map((g) => (
                                    <button
                                        key={g.id || g.city}
                                        onClick={() => {
                                            setSelectedCity(normalizeCity(g.city));
                                            setDropdownOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-4 py-2 text-sm transition-colors",
                                            selectedCity === normalizeCity(g.city) 
                                                ? "bg-gray-50 dark:bg-white/5 font-bold text-gray-900 dark:text-white"
                                                : "text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5"
                                        )}
                                    >
                                        {g.city}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Join Button */}
                <button
                    onClick={handleJoinClick}
                    disabled={hasJoined}
                    className={cn(
                        "flex items-center gap-1.5 h-10 px-5 rounded-full text-[11px] font-black tracking-wider uppercase shrink-0 transition-colors",
                        hasJoined 
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 cursor-default"
                            : "bg-[#0c0e14] dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100"
                    )}
                >
                    {hasJoined ? (
                        <>
                            <span>Joined</span>
                            <Check size={14} />
                        </>
                    ) : (
                        <>
                            <span>Join</span>
                            <ArrowRight size={14} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default CreatorCityGroupCard;
