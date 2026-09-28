import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SharedLayoutModal } from '../../design-system/overlays/SharedLayoutModal';
import { useStore } from '../../lib/store';
import { PREDEFINED_CITIES, DEFAULT_CREATOR_GROUPS } from '../../lib/constants';
import { sendCreatorGroupsBroadcastEmail } from '../../lib/email';
import { cn } from '../../lib/utils';
import {
    Users, Phone, Copy, Check, CheckCircle2, Search, MapPin, 
    MessageSquare, Play, Send, Mail, ShieldCheck, SkipForward, Square, ExternalLink, X, Undo2, ChevronDown
} from 'lucide-react';

const normalizeCity = (cityStr = '') => {
    const raw = String(cityStr || '').trim().toLowerCase();
    if (/^bang[al]*o?re$/i.test(raw) || raw.includes('bengaluru') || raw.includes('bangalore')) return 'Bengaluru';
    if (raw.includes('hyderabad')) return 'Hyderabad';
    if (raw.includes('chandigarh')) return 'Chandigarh';
    if (raw.includes('mumbai')) return 'Mumbai';
    if (raw.includes('pune')) return 'Pune';
    if (raw.includes('kolkata') || raw.includes('calcutta')) return 'Kolkata';
    if (raw.includes('kochi') || raw.includes('cochin')) return 'Kochi';
    if (raw.includes('delhi')) return 'Delhi NCR';
    if (raw.includes('chennai') || raw.includes('madras')) return 'Chennai';
    if (raw.includes('jaipur')) return 'Jaipur';
    if (raw.includes('goa')) return 'Goa';
    if (raw.includes('ahmedabad')) return 'Ahmedabad';
    if (raw.includes('bhubaneswar') || raw.includes('bhubaneshwar') || raw.includes('cuttack') || raw.includes('odisha')) return 'Bhubaneswar & Cuttack';
    if (raw.includes('vizag') || raw.includes('visakhapatnam')) return 'Vizag';
    if (raw.includes('surat')) return 'Surat';
    return cityStr ? (cityStr.charAt(0).toUpperCase() + cityStr.slice(1)) : 'Bengaluru';
};

const formatPhoneForWhatsApp = (raw) => {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (digits.length > 10) return `+${digits}`;
    return digits;
};

const DEFAULT_INVITE_TEMPLATE = `Hey {name}! \u{1F44B} Here is your exclusive invite link to join the Newbi {city} Creator WhatsApp Community:

\u{1F449} {groupLink}

Join to connect with local creators in {city}, unlock paid brand gigs, and get guestlist passes to exclusive events!`;

const TABS = [
    { id: 'audience', label: '1. Select Audience' },
    { id: 'message', label: '2. Customize Message' },
    { id: 'dispatch', label: '3. Dispatch' },
];


const CustomDropdown = ({ value, options, onChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef(null);

    React.useEffect(() => {
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="relative w-full z-50" ref={containerRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-12 px-4 bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] hover:border-neon-blue/50 rounded-xl flex items-center justify-between transition-all"
            >
                <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-neon-blue" />
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white">{value}</span>
                </div>
                <ChevronDown size={14} className={cn("text-gray-500 dark:text-white/50 transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="max-h-64 overflow-y-auto no-scrollbar p-1.5 space-y-0.5">
                            {options.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => { onChange(opt); setIsOpen(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                                        value === opt ? "bg-neon-blue/10 text-neon-blue font-bold" : "text-gray-700 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:text-white"
                                    )}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AddCityCreatorsModal = ({ isOpen = true, onClose, initialCity = 'Bengaluru', preselectedUids = null }) => {

    const { 
        creators, 
        creatorGroups, 
        bulkAddCreatorsToCityGroup,
        markCreatorInviteSent,
        updateCreator,
        bulkMarkCreatorInvitesSent,
        addToast
    } = useStore();

    const [activeTab, setActiveTab] = useState('audience');
    const [selectedCity, setSelectedCity] = useState(() => normalizeCity(initialCity));
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState(() => preselectedUids ? new Set(preselectedUids) : null);
    
    // Copy/Status
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Template
    const [inviteTemplate, setInviteTemplate] = useState(DEFAULT_INVITE_TEMPLATE);

    // Dispatch states
    const [isEmailSending, setIsEmailSending] = useState(false);
    const [emailProgress, setEmailProgress] = useState({ current: 0, total: 0 });
    const [isQueueActive, setIsQueueActive] = useState(false);
    const [queueIndex, setQueueIndex] = useState(0);

    // Derived Data
    const activeGroups = useMemo(() => {
        const remote = (creatorGroups || []).filter(g => g.isActive !== false);
        const map = new Map();
        remote.forEach(g => {
            if (g.city) map.set(normalizeCity(g.city).toLowerCase(), g);
        });
        const list = [...remote];
        DEFAULT_CREATOR_GROUPS.forEach(dg => {
            const key = normalizeCity(dg.city).toLowerCase();
            if (!map.has(key)) {
                list.push(dg);
                map.set(key, dg);
            }
        });
        return list;
    }, [creatorGroups]);

    const currentGroup = useMemo(() => {
        const normSelected = normalizeCity(selectedCity).toLowerCase();
        return activeGroups.find(g => normalizeCity(g.city).toLowerCase() === normSelected) || null;
    }, [activeGroups, selectedCity]);

    const availableCities = useMemo(() => {
        const citySet = new Set(PREDEFINED_CITIES.filter(c => c !== 'Others' && c !== 'Pan-India / Remote'));
        (creators || []).forEach(c => {
            if (c.city) citySet.add(normalizeCity(c.city));
        });
        return Array.from(citySet).sort();
    }, [creators]);

    const cityCreators = useMemo(() => {
        if (preselectedUids && preselectedUids.length > 0) {
            const preselectedSet = new Set(preselectedUids);
            return (creators || []).filter(c => preselectedSet.has(c.id) || preselectedSet.has(c.uid));
        }
        const normTarget = normalizeCity(selectedCity).toLowerCase();
        return (creators || []).filter(c => {
            const normC = normalizeCity(c.city).toLowerCase();
            return normC === normTarget || (normTarget === 'bengaluru' && /bang[al]*o?re/i.test(normC));
        });
    }, [creators, selectedCity, preselectedUids]);

    const filteredCreators = useMemo(() => {
        return cityCreators.filter(c => {
            const isJoined = Boolean(c.hasJoinedCityGroup);
            const isSent = Boolean(c.inviteLinkSent) && !isJoined;
            const isPending = !isJoined && !c.inviteLinkSent;

            if (statusFilter === 'pending' && !isPending) return false;
            if (statusFilter === 'sent' && !isSent) return false;
            if (statusFilter === 'joined' && !isJoined) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const name = (c.name || c.displayName || c.fullName || '').toLowerCase();
            const rawPhones = [c.phone, c.mobile, c.whatsapp].filter(Boolean).map(String);
            const phoneMatches = rawPhones.some(p => p.toLowerCase().includes(q));
            return name.includes(q) || phoneMatches;
        });
    }, [cityCreators, statusFilter, searchQuery]);

    const currentSelectedIds = useMemo(() => {
        if (selectedIds === null) {
            return new Set(filteredCreators.map(c => c.id || c.uid));
        }
        return selectedIds;
    }, [selectedIds, filteredCreators]);

    const isAllSelected = filteredCreators.length > 0 && filteredCreators.every(c => currentSelectedIds.has(c.id || c.uid));

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            const next = new Set(currentSelectedIds);
            filteredCreators.forEach(c => next.add(c.id || c.uid));
            setSelectedIds(next);
        }
    };

    const handleToggleCreator = (id) => {
        const next = new Set(currentSelectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const stats = useMemo(() => {
        const total = cityCreators.length;
        const joined = cityCreators.filter(c => c.hasJoinedCityGroup).length;
        const sent = cityCreators.filter(c => c.inviteLinkSent && !c.hasJoinedCityGroup).length;
        const pending = total - (joined + sent);
        const withPhone = cityCreators.filter(c => c.phone && String(c.phone).trim().length >= 10).length;
        const withEmail = cityCreators.filter(c => c.email && c.email.includes('@')).length;
        return { total, joined, sent, pending, withPhone, withEmail };
    }, [cityCreators]);

    const getInviteMessageForCreator = (creator) => {
        const name = (creator?.name || creator?.displayName || 'Creator').trim().split(' ')[0];
        const groupLink = currentGroup?.groupUrl || 'https://chat.whatsapp.com/K6MtDAOlZ7s7AUtOFHxduU';
        return inviteTemplate
            .replace(/{name}/g, name)
            .replace(/{city}/g, selectedCity)
            .replace(/{groupLink}/g, groupLink);
    };

    const queueCandidates = useMemo(() => {
        return cityCreators.filter(c => {
            const id = c.id || c.uid;
            if (!currentSelectedIds.has(id)) return false;
            const phone = formatPhoneForWhatsApp(c.phone);
            return Boolean(phone) && !c.hasJoinedCityGroup;
        });
    }, [cityCreators, currentSelectedIds]);

    const currentQueueCreator = queueCandidates[queueIndex] || null;

    // Handlers
    const handleSendIndividualWhatsApp = (creator) => {
        const phone = formatPhoneForWhatsApp(creator.phone).replace(/\+/g, '');
        if (!phone) { addToast(`No valid phone for ${creator.name}`, 'error'); return; }
        
        // Fix for WhatsApp Web preview: convert LF to CRLF so newlines don't get stripped
        const rawMessage = getInviteMessageForCreator(creator);
        const formattedMessage = rawMessage.replace(/\r?\n/g, '\r\n');
        
        // Use api.whatsapp.com directly to avoid wa.me redirect mangling emojis on some devices
        const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(formattedMessage)}`;
        window.open(waUrl, '_blank');
        
        if (markCreatorInviteSent) markCreatorInviteSent(creator.id || creator.uid, 'whatsapp');
    };

    const handleUndoSent = async (creator) => {
        const id = creator.id || creator.uid;
        if (updateCreator) {
            try {
                await updateCreator(id, { inviteLinkSent: false, inviteLinkSentAt: null, inviteLinkChannel: null });
                addToast(`Unmarked ${creator.name} as sent.`, 'info');
            } catch (err) {
                addToast('Failed to undo status.', 'error');
            }
        }
    };

    const handleStartQueue = () => {
        if (!queueCandidates.length) { addToast('No eligible creators in selection.', 'error'); return; }
        setQueueIndex(0); setIsQueueActive(true);
    };

    const handleQueueNext = () => {
        if (!currentQueueCreator) { setIsQueueActive(false); return; }
        handleSendIndividualWhatsApp(currentQueueCreator);
        if (queueIndex + 1 < queueCandidates.length) setQueueIndex(prev => prev + 1);
        else { setIsQueueActive(false); setQueueIndex(0); addToast('Queue completed!', 'success'); }
    };

    const handleQueueSkip = () => {
        if (queueIndex + 1 < queueCandidates.length) setQueueIndex(prev => prev + 1);
        else { setIsQueueActive(false); setQueueIndex(0); addToast('Queue finished.', 'info'); }
    };

    const handleBulkSendEmail = async () => {
        const targetCreators = cityCreators.filter(c => currentSelectedIds.has(c.id || c.uid) && c.email?.includes('@'));
        if (!targetCreators.length) { addToast('No creators with valid email addresses.', 'error'); return; }

        setIsEmailSending(true);
        setEmailProgress({ current: 0, total: targetCreators.length });

        try {
            const recipientsPayload = targetCreators.map(c => ({
                email: c.email.trim().toLowerCase(),
                name: c.name || c.displayName || 'Creator',
                city: c.city || selectedCity
            }));

            const result = await sendCreatorGroupsBroadcastEmail(recipientsPayload, {
                city: currentGroup?.city || selectedCity,
                groupUrl: currentGroup?.groupUrl || '',
                customSubject: `\u26A1 Official ${selectedCity} Creator WhatsApp Group Invitation`,
                customMessage: `You've been invited to join the exclusive Newbi ${selectedCity} Creator WhatsApp community! Connect with verified creators and access priority gig alerts.`,
                availableGroups: activeGroups,
                onProgress: (curr, tot) => setEmailProgress({ current: curr, total: tot })
            });

            if (result?.success || result?.sentCount > 0) {
                if (bulkMarkCreatorInvitesSent) await bulkMarkCreatorInvitesSent(targetCreators.map(c => c.id || c.uid), 'email');
                addToast(`Dispatched emails to ${result.sentCount || targetCreators.length} creators!`, 'success');
            } else throw new Error(result?.error || 'Email dispatch failed.');
        } catch (err) {
            addToast(err.message || 'Failed to send emails.', 'error');
        } finally {
            setIsEmailSending(false);
        }
    };

    const goToNextTab = () => {
        if (activeTab === 'audience') setActiveTab('message');
        else if (activeTab === 'message') setActiveTab('dispatch');
    };

    const goToPrevTab = () => {
        if (activeTab === 'dispatch') setActiveTab('message');
        else if (activeTab === 'message') setActiveTab('audience');
    };

    if (!isOpen) return null;

    return (
        <SharedLayoutModal
            isOpen={isOpen}
            onClose={onClose}
            layoutId="add-city-creators-modal"
            className="w-full max-w-5xl h-[92vh] sm:h-[90vh] bg-white/95 dark:bg-[#0a0c12]/70 backdrop-blur-3xl border border-black/10 dark:border-white/[0.1] rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.6)] overflow-hidden"
            contentClassName="p-0 flex flex-col h-full"
            hideCloseButton={true}
        >
            <div className="flex flex-col h-full text-gray-900 dark:text-white">
                
                {/* ── HEADER & TABS ── */}
                <div className="shrink-0 pt-6 px-6 sm:px-8 border-b border-black/[0.08] dark:border-white/[0.08] relative overflow-hidden backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-gray-900 dark:text-white uppercase italic">
                                    Send Group Invites
                                </h2>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <ShieldCheck size={12} /> Anti-Spam Safe
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
                                Send WhatsApp group links naturally via 1-on-1 chats or email to avoid bans.
                            </p>
                        </div>

                    </div>

                    <div className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "relative pb-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors outline-none",
                                        isActive ? "text-neon-green" : "text-gray-400 dark:text-white/40 hover:text-gray-700 dark:text-white/70"
                                    )}
                                >
                                    <span>{tab.label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="city-creators-active-tab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-green"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── CONTENT AREA ── */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-black/[0.01] dark:bg-white/[0.01]">
                    <AnimatePresence mode="wait">
                        
                        {/* TAB 1: AUDIENCE */}
                        {activeTab === 'audience' && (
                            <motion.div
                                key="audience"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                className="p-6 sm:p-8 space-y-6"
                            >
                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* City Selector */}
                                    <div className="lg:w-1/3 space-y-2 relative z-50">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/50 flex items-center gap-1.5">
                                            <MapPin size={12} className="text-neon-blue" /> Target City Hub
                                        </label>
                                        <CustomDropdown 
                                            value={selectedCity} 
                                            options={availableCities} 
                                            onChange={(c) => { setSelectedCity(c); setSelectedIds(null); setIsQueueActive(false); }} 
                                        />
                                    </div>
                                    
                                    {/* Quick Stats */}
                                    <div className="lg:flex-1 grid grid-cols-3 gap-3">
                                        <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05] flex flex-col justify-center items-center">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-white/40">Total</span>
                                            <div className="text-2xl font-black mt-1 text-gray-900 dark:text-white">{stats.total}</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-center items-center">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/70">Joined</span>
                                            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.joined}</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-center items-center">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/70">Pending</span>
                                            <div className="text-2xl font-black text-amber-400 mt-1">{stats.pending}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.05]">
                                    {/* Filters & Search */}
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.04] p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.05] text-[10px] font-bold">
                                            {['all', 'pending', 'sent', 'joined'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setStatusFilter(t)}
                                                    className={cn("px-4 py-2 rounded-lg transition-all capitalize", statusFilter === t ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-white/50 hover:text-gray-900 dark:text-white")}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative flex-1 max-w-sm">
                                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search by name, phone..."
                                                className="w-full h-11 pl-10 pr-4 bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-neon-green transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Creators List */}
                                    <div className="border border-black/[0.08] dark:border-white/[0.08] rounded-2xl overflow-hidden bg-white dark:bg-[#0c0e14]">
                                        <div className="px-5 py-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
                                            <div className="flex items-center gap-3">
                                                <button onClick={handleToggleSelectAll} className="w-5 h-5 rounded border border-black/20 dark:border-white/20 flex items-center justify-center bg-white dark:bg-black/40 text-neon-green hover:border-black/40 dark:hover:border-white/40 transition-colors">
                                                    {isAllSelected && <Check size={12} strokeWidth={3} />}
                                                </button>
                                                <span className="text-xs font-bold text-gray-700 dark:text-white/70">Select All ({filteredCreators.length})</span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-neon-green">{currentSelectedIds.size} Selected</span>
                                        </div>
                                        
                                        <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                                            {filteredCreators.length === 0 ? (
                                                <div className="py-16 text-center text-gray-400 dark:text-white/40 text-xs font-bold">No creators match your filters.</div>
                                            ) : (
                                                filteredCreators.map(c => {
                                                    const isSel = currentSelectedIds.has(c.id || c.uid);
                                                    const isJ = Boolean(c.hasJoinedCityGroup);
                                                    const isSent = Boolean(c.inviteLinkSent) && !isJ;
                                                    const isPending = !isJ && !isSent;
                                                    
                                                    return (
                                                        <div key={c.id || c.uid} className={cn(
                                                            "flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer group",
                                                            isSel ? "bg-black/[0.06] dark:bg-white/[0.06] border border-black/10 dark:border-white/10" : "hover:bg-black/[0.02] dark:bg-white/[0.02] border border-transparent"
                                                        )} onClick={() => handleToggleCreator(c.id || c.uid)}>
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn("w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors", isSel ? "bg-neon-green border-neon-green text-black" : "border-black/20 dark:border-white/20 bg-white dark:bg-black/40 text-transparent")}>
                                                                    <Check size={12} strokeWidth={3} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{c.name || 'Unknown'}</p>
                                                                    <p className="text-[10px] font-mono text-gray-400 dark:text-white/40 mt-0.5">{formatPhoneForWhatsApp(c.phone) || 'No Phone'}</p>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-3">
                                                                {/* Optional Undo Action */}
                                                                {isSent && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleUndoSent(c); }}
                                                                        className="h-7 px-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-gray-500 dark:text-white/50 hover:text-gray-900 dark:text-white flex items-center gap-1 text-[10px] font-bold transition-all opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <Undo2 size={10} /> Undo
                                                                    </button>
                                                                )}

                                                                {/* Status Badge */}
                                                                {isJ ? (
                                                                    <span className="w-20 py-1 text-center rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Joined</span>
                                                                ) : isSent ? (
                                                                    <span className="w-20 py-1 text-center rounded-full text-[9px] font-black uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">Sent</span>
                                                                ) : (
                                                                    <span className="w-20 py-1 text-center rounded-full text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>
                                                                )}
                                                                
                                                                {/* Send WhatsApp action */}
                                                                {!isJ && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleSendIndividualWhatsApp(c); }}
                                                                        className="h-7 px-3 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all"
                                                                    >
                                                                        <Send size={10} /> {isSent ? 'Resend' : 'Send'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 2: MESSAGE */}
                        {activeTab === 'message' && (
                            <motion.div
                                key="message"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                className="p-6 sm:p-8 space-y-8 max-w-3xl mx-auto"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-white/70 flex items-center gap-2">
                                            <MessageSquare size={14} className="text-neon-pink" /> 
                                            Invite Message Template
                                        </label>
                                        <button onClick={() => setInviteTemplate(DEFAULT_INVITE_TEMPLATE)} className="text-[10px] font-bold text-gray-400 dark:text-white/40 hover:text-gray-900 dark:text-white underline">
                                            Reset to Default
                                        </button>
                                    </div>
                                    <textarea
                                        value={inviteTemplate}
                                        onChange={(e) => setInviteTemplate(e.target.value)}
                                        rows={7}
                                        className="w-full p-5 bg-white dark:bg-black/40 border border-black/10 dark:border-white/[0.1] rounded-2xl text-[13px] text-gray-900 dark:text-white outline-none focus:border-neon-pink transition-colors resize-none leading-relaxed shadow-inner"
                                        placeholder="Type your message here... Emojis work perfectly!"
                                    />
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-white/50 bg-black/[0.02] dark:bg-white/[0.02] inline-block px-3 py-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.05]">
                                        Dynamic Tags: <span className="text-neon-pink ml-1">{"{name}"}</span>, <span className="text-neon-blue mx-1">{"{city}"}</span>, <span className="text-neon-green">{"{groupLink}"}</span>
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-black/20 border border-black/[0.08] dark:border-white/[0.08] space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/50 flex items-center gap-2">
                                        <Users size={12} className="text-neon-green" />
                                        Active Group Link for {selectedCity}
                                    </h4>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-gray-100 dark:bg-black/60 px-4 py-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.05] font-mono text-xs text-neon-green truncate shadow-inner">
                                            {currentGroup?.groupUrl || 'No group link configured yet. Check Group Settings.'}
                                        </div>
                                        {currentGroup?.groupUrl && (
                                            <a href={currentGroup.groupUrl} target="_blank" rel="noopener noreferrer" className="h-11 px-5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-black/[0.06] dark:border-white/[0.05] text-gray-900 dark:text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 transition-colors shrink-0 shadow-sm">
                                                Test Link <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 3: DISPATCH */}
                        {activeTab === 'dispatch' && (
                            <motion.div
                                key="dispatch"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                className="p-6 sm:p-8 space-y-8 max-w-4xl mx-auto"
                            >
                                <div className="text-center space-y-3 pb-4">
                                    <h3 className="text-3xl font-black font-heading text-gray-900 dark:text-white italic tracking-tight">Ready to Dispatch!</h3>
                                    <p className="text-sm text-gray-600 dark:text-white/60">You have carefully selected <strong className="text-neon-green px-1.5 py-0.5 bg-neon-green/10 rounded-md">{currentSelectedIds.size}</strong> creators in <strong className="text-neon-blue">{selectedCity}</strong>.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* WhatsApp Queue Option */}
                                    <div className="p-6 sm:p-8 rounded-[2rem] bg-white dark:bg-black/40 border border-black/[0.06] dark:border-white/[0.05] relative overflow-hidden group hover:border-neon-green/30 transition-colors">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><Play size={96} /></div>
                                        <div className="relative z-10 space-y-5">
                                            <div className="w-14 h-14 rounded-2xl bg-neon-green/10 border border-neon-green/20 text-neon-green flex items-center justify-center shadow-lg shadow-neon-green/10">
                                                <Phone size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">WhatsApp Queue</h4>
                                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-white/50 mt-2 leading-relaxed">Opens WhatsApp Web 1-by-1 for each creator. 100% safe from bans, highly personal and ensures perfect delivery.</p>
                                            </div>
                                            
                                            {isQueueActive ? (
                                                <div className="pt-4 space-y-4">
                                                    <div className="p-4 rounded-xl bg-neon-green/10 border border-neon-green/20 shadow-inner">
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-neon-green mb-1 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" /> Queue Active ({queueIndex + 1}/{queueCandidates.length})
                                                        </p>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{currentQueueCreator?.name}</p>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button onClick={handleQueueNext} className="flex-1 h-12 rounded-xl bg-neon-green text-black font-black text-xs uppercase hover:brightness-110 shadow-[0_0_20px_rgba(57,255,20,0.3)] flex items-center justify-center gap-2 transition-all">
                                                            <Send size={14} /> Send & Next
                                                        </button>
                                                        <button onClick={handleQueueSkip} className="h-12 px-5 rounded-xl border border-black/10 dark:border-white/10 text-gray-700 dark:text-white/70 hover:text-gray-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors" title="Skip Creator">
                                                            <SkipForward size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={handleStartQueue} disabled={queueCandidates.length === 0} className="w-full h-12 mt-4 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green font-black text-xs uppercase tracking-wider hover:bg-neon-green/20 transition-all disabled:opacity-40">
                                                    Start WA Queue ({queueCandidates.length})
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Email Blast Option */}
                                    <div className="p-6 sm:p-8 rounded-[2rem] bg-white dark:bg-black/40 border border-black/[0.06] dark:border-white/[0.05] relative overflow-hidden group hover:border-neon-pink/30 transition-colors">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><Mail size={96} /></div>
                                        <div className="relative z-10 space-y-5">
                                            <div className="w-14 h-14 rounded-2xl bg-neon-pink/10 border border-neon-pink/20 text-neon-pink flex items-center justify-center shadow-lg shadow-neon-pink/10">
                                                <Mail size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Email Blast</h4>
                                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-white/50 mt-2 leading-relaxed">Sends a professional branded HTML email containing the WhatsApp group link. Great for massive bulk dispatches.</p>
                                            </div>
                                            
                                            <button onClick={handleBulkSendEmail} disabled={isEmailSending || currentSelectedIds.size === 0} className="w-full h-12 mt-4 rounded-xl bg-neon-pink/10 border border-neon-pink/30 text-neon-pink font-black text-xs uppercase tracking-wider hover:bg-neon-pink/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                                {isEmailSending ? 'Sending emails...' : `Dispatch Emails (${currentSelectedIds.size})`}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* ── STICKY FOOTER NAVIGATION ── */}
                <div className="shrink-0 p-5 border-t border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#0a0c12]/95 backdrop-blur-3xl flex items-center justify-between z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                    <button 
                        onClick={goToPrevTab} 
                        disabled={activeTab === 'audience'}
                        className="h-11 px-6 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-gray-700 dark:text-white/70 hover:text-gray-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 font-bold text-xs transition-colors disabled:opacity-0"
                    >
                        &larr; Back
                    </button>
                    
                    <button 
                        onClick={goToNextTab}
                        disabled={activeTab === 'dispatch'}
                        className="h-11 px-8 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest hover:bg-black dark:hover:bg-gray-200 transition-colors disabled:opacity-0 shadow-[0_4px_14px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                        Next Step &rarr;
                    </button>
                </div>
            </div>
        </SharedLayoutModal>
    );
};

export default AddCityCreatorsModal;
