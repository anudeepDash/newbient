import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { PREDEFINED_CITIES, DEFAULT_CREATOR_GROUPS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import X from 'lucide-react/dist/esm/icons/x';
import Users from 'lucide-react/dist/esm/icons/users';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Download from 'lucide-react/dist/esm/icons/download';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Search from 'lucide-react/dist/esm/icons/search';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Filter from 'lucide-react/dist/esm/icons/filter';

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

const AddCityCreatorsModal = ({ isOpen = true, onClose, initialCity = 'Bengaluru', preselectedUids = null }) => {
    const { creators, creatorGroups, bulkAddCreatorsToCityGroup } = useStore();
    const [selectedCity, setSelectedCity] = useState(() => normalizeCity(initialCity));
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'joined'
    const [selectedIds, setSelectedIds] = useState(() => preselectedUids ? new Set(preselectedUids) : null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedPhoneType, setCopiedPhoneType] = useState(null); // 'csv' | 'newline' | creatorId

    // All active city groups (remote + defaults)
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

    // Active WhatsApp group for selected city
    const currentGroup = useMemo(() => {
        const normSelected = normalizeCity(selectedCity).toLowerCase();
        return activeGroups.find(g => normalizeCity(g.city).toLowerCase() === normSelected) || null;
    }, [activeGroups, selectedCity]);

    // All distinct cities that have creators or predefined groups
    const availableCities = useMemo(() => {
        const citySet = new Set(PREDEFINED_CITIES.filter(c => c !== 'Others' && c !== 'Pan-India / Remote'));
        (creators || []).forEach(c => {
            if (c.city) citySet.add(normalizeCity(c.city));
        });
        return Array.from(citySet).sort();
    }, [creators]);

    // Filter creators matching current selected city
    const cityCreators = useMemo(() => {
        const normTarget = normalizeCity(selectedCity).toLowerCase();
        return (creators || []).filter(c => {
            const normC = normalizeCity(c.city).toLowerCase();
            return normC === normTarget || (normTarget === 'bengaluru' && /bang[al]*o?re/i.test(normC));
        });
    }, [creators, selectedCity]);

    // Apply search query and status filter
    const filteredCreators = useMemo(() => {
        return cityCreators.filter(c => {
            // Status filter
            if (statusFilter === 'pending' && c.hasJoinedCityGroup) return false;
            if (statusFilter === 'joined' && !c.hasJoinedCityGroup) return false;

            // Search query (Mobile, Name, Email, Instagram, UID, College)
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const qDigits = q.replace(/\D/g, '');
            const name = (c.name || c.displayName || c.fullName || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            const rawPhones = [c.phone, c.mobile, c.whatsapp, c.contact, c.phoneNumber].filter(Boolean).map(String);
            const phoneDigitsList = rawPhones.map(p => p.replace(/\D/g, ''));
            const phoneMatches = rawPhones.some(p => p.toLowerCase().includes(q)) ||
                (qDigits.length >= 3 && phoneDigitsList.some(pDigits => pDigits.includes(qDigits) || qDigits.includes(pDigits)));
            const insta = (c.instagram || c.handle || c.instagramHandle || '').toLowerCase().replace(/^@/, '');
            const id = (c.uid || c.id || c.creatorId || '').toLowerCase();
            const college = (c.college || c.collegeName || c.university || '').toLowerCase();
            return name.includes(q) || email.includes(q) || phoneMatches || insta.includes(q.replace(/^@/, '')) || id.includes(q) || college.includes(q);
        });
    }, [cityCreators, statusFilter, searchQuery]);

    // Selection management
    const currentSelectedIds = useMemo(() => {
        if (selectedIds === null) {
            // default: select all filtered creators
            return new Set(filteredCreators.map(c => c.id || c.uid));
        }
        return selectedIds;
    }, [selectedIds, filteredCreators]);

    const isAllSelected = useMemo(() => {
        if (filteredCreators.length === 0) return false;
        return filteredCreators.every(c => currentSelectedIds.has(c.id || c.uid));
    }, [filteredCreators, currentSelectedIds]);

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
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    // Stats
    const stats = useMemo(() => {
        const total = cityCreators.length;
        const joined = cityCreators.filter(c => c.hasJoinedCityGroup).length;
        const pending = total - joined;
        const withPhone = cityCreators.filter(c => c.phone && String(c.phone).trim().length >= 10).length;
        return { total, joined, pending, withPhone };
    }, [cityCreators]);

    // Action 1: Bulk mark as added in database
    const handleBulkMarkAdded = async () => {
        const idsToUpdate = Array.from(currentSelectedIds);
        if (idsToUpdate.length === 0) {
            useStore.getState().addToast('Please select at least one creator to mark as added.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await bulkAddCreatorsToCityGroup(selectedCity, idsToUpdate);
            useStore.getState().addToast(
                `Successfully marked ${res.count || idsToUpdate.length} creators in ${selectedCity} as added to the WhatsApp Group!`,
                'success'
            );
        } catch (err) {
            console.error('Error marking creators as added:', err);
            useStore.getState().addToast('Failed to mark creators as added. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Action 2: Copy formatted phone numbers
    const handleCopyPhoneNumbers = (separator = ', ') => {
        const targetCreators = cityCreators.filter(c => currentSelectedIds.has(c.id || c.uid));
        const phones = targetCreators
            .map(c => formatPhoneForWhatsApp(c.phone))
            .filter(Boolean);

        if (phones.length === 0) {
            useStore.getState().addToast('No valid phone numbers found for selected creators.', 'error');
            return;
        }

        const text = phones.join(separator);
        navigator.clipboard.writeText(text);
        setCopiedPhoneType(separator === ', ' ? 'csv' : 'newline');
        useStore.getState().addToast(`Copied ${phones.length} formatted phone numbers to clipboard!`, 'success');
        setTimeout(() => setCopiedPhoneType(null), 2500);
    };

    // Action 3: Download .VCF contacts file
    const handleDownloadVCard = () => {
        const targetCreators = cityCreators.filter(c => currentSelectedIds.has(c.id || c.uid));
        if (targetCreators.length === 0) {
            useStore.getState().addToast('No creators selected for contact export.', 'error');
            return;
        }

        let vcfContent = '';
        targetCreators.forEach(c => {
            const phone = formatPhoneForWhatsApp(c.phone);
            const name = (c.name || c.displayName || c.fullName || 'Creator').trim();
            const cityTag = selectedCity.substring(0, 3).toUpperCase();
            const insta = c.instagram || c.handle || c.instagramHandle || '';

            vcfContent += 'BEGIN:VCARD\r\n';
            vcfContent += 'VERSION:3.0\r\n';
            vcfContent += `FN:[${cityTag}] ${name}\r\n`;
            vcfContent += `N:${name};;;;\r\n`;
            if (phone) {
                vcfContent += `TEL;TYPE=CELL,VOICE:${phone}\r\n`;
            }
            if (c.email) {
                vcfContent += `EMAIL;TYPE=INTERNET:${c.email.trim()}\r\n`;
            }
            vcfContent += `ORG:Newbi Creator Network - ${selectedCity}\r\n`;
            vcfContent += `NOTE:Newbi Creator | City: ${selectedCity}${insta ? ` | IG: @${insta}` : ''}\r\n`;
            vcfContent += 'END:VCARD\r\n';
        });

        const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Newbi_${selectedCity.replace(/\s+/g, '_')}_Creators.vcf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        useStore.getState().addToast(
            `Downloaded ${targetCreators.length} contacts for ${selectedCity}! Import this file to your phone to add them in WhatsApp.`,
            'success'
        );
    };

    // Action 4: Copy Individual Phone
    const handleCopySinglePhone = (creator) => {
        const phone = formatPhoneForWhatsApp(creator.phone);
        if (!phone) return;
        navigator.clipboard.writeText(phone);
        setCopiedPhoneType(creator.id || creator.uid);
        useStore.getState().addToast(`Copied ${phone}`, 'success');
        setTimeout(() => setCopiedPhoneType(null), 2000);
    };

    // Action 5: Compose Direct WhatsApp Link
    const getDirectWhatsAppUrl = (creator) => {
        const phone = formatPhoneForWhatsApp(creator.phone).replace(/\+/g, '');
        if (!phone) return null;
        const name = (creator.name || creator.displayName || 'Creator').split(' ')[0];
        const groupLink = currentGroup?.groupUrl || 'https://chat.whatsapp.com/K6MtDAOlZ7s7AUtOFHxduU';
        const msg = `Hey ${name}! 👋\n\nHere is your official invite to join the Newbi ${selectedCity} Creator WhatsApp Community:\n👉 ${groupLink}\n\nJoin to receive local brand briefs, event guestlists, and connect with other creators in ${selectedCity}!`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-4xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-4 bg-gray-50/70 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(37,211,102,0.2)]">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black font-heading tracking-tight text-gray-900 dark:text-white uppercase italic">
                                    Add City Creators to WhatsApp Group
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black dark:bg-white/10 text-white">
                                    {selectedCity}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                Bulk add creators, copy formatted phone numbers, or download contacts (.vcf) for instant WhatsApp group management.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center transition-colors"
                        title="Close Modal"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Sub-Header & City Switcher Bar */}
                <div className="p-4 sm:p-5 border-b border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900/30 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Target City Selector */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-zinc-400 flex items-center gap-1">
                                <MapPin size={11} className="text-neon-blue" />
                                <span>Select City Hub</span>
                            </label>
                            <select
                                value={selectedCity}
                                onChange={(e) => {
                                    setSelectedCity(e.target.value);
                                    setSelectedIds(null); // Reset selection to all for new city
                                }}
                                className="w-full h-10 px-3 bg-gray-100 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-neon-blue"
                            >
                                {availableCities.map(c => {
                                    const count = (creators || []).filter(cr => normalizeCity(cr.city).toLowerCase() === c.toLowerCase()).length;
                                    return (
                                        <option key={c} value={c} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                                            {c} ({count} creators)
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* WhatsApp Group Info Card */}
                        <div className="sm:col-span-1 lg:col-span-3 p-3 rounded-2xl bg-[#25D366]/5 border border-[#25D366]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#25D366]">
                                        {currentGroup?.title || `${selectedCity} Community Group`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-mono text-gray-700 dark:text-zinc-300 truncate max-w-sm sm:max-w-md">
                                        {currentGroup?.groupUrl || 'No invite link configured for this city yet.'}
                                    </p>
                                </div>
                            </div>

                            {currentGroup?.groupUrl && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <a
                                        href={currentGroup.groupUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-8 px-3 rounded-xl bg-[#25D366] text-black font-black text-[10px] uppercase tracking-wider hover:brightness-110 flex items-center gap-1 transition-all"
                                    >
                                        <ExternalLink size={12} />
                                        <span>Open WhatsApp</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">Total in City</span>
                            <div className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{stats.total}</div>
                        </div>
                        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">Pending Addition</span>
                            <div className="text-lg font-black text-amber-500 mt-0.5">{stats.pending}</div>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500">Already in Group</span>
                            <div className="text-lg font-black text-emerald-500 mt-0.5">{stats.joined}</div>
                        </div>
                        <div className="p-3 rounded-2xl bg-sky-500/5 border border-sky-500/20">
                            <span className="text-[9px] font-black uppercase tracking-wider text-sky-500">With Valid Mobile</span>
                            <div className="text-lg font-black text-sky-500 mt-0.5">{stats.withPhone}</div>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Toolbar */}
                <div className="px-5 py-3 border-b border-black/10 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/20 flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Filter Tabs & Search */}
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
                        <div className="flex items-center bg-gray-200/70 dark:bg-black/50 p-1 rounded-xl border border-black/5 dark:border-white/5 text-[10px] font-bold">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg transition-all",
                                    statusFilter === 'all' ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-600 dark:text-zinc-400 hover:text-white"
                                )}
                            >
                                All ({cityCreators.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('pending')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg transition-all",
                                    statusFilter === 'pending' ? "bg-white dark:bg-zinc-800 text-amber-500 shadow-sm" : "text-gray-600 dark:text-zinc-400 hover:text-white"
                                )}
                            >
                                Pending ({stats.pending})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('joined')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg transition-all",
                                    statusFilter === 'joined' ? "bg-white dark:bg-zinc-800 text-emerald-500 shadow-sm" : "text-gray-600 dark:text-zinc-400 hover:text-white"
                                )}
                            >
                                In Group ({stats.joined})
                            </button>
                        </div>

                        <div className="relative flex-1 min-w-[150px] max-w-xs">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search name, phone, IG..."
                                className="w-full h-8 pl-8 pr-3 bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-neon-blue"
                            />
                        </div>
                    </div>

                    {/* Right: Powerful Bulk Operations */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* 1-Click Copy Phone Numbers */}
                        <button
                            type="button"
                            onClick={() => handleCopyPhoneNumbers(', ')}
                            className="h-9 px-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-800 dark:text-zinc-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-black/5 dark:border-white/5"
                            title="Copy comma-separated phone numbers (+919876543210, +91...) to paste directly into WhatsApp"
                        >
                            {copiedPhoneType === 'csv' ? (
                                <Check size={13} className="text-neon-green" />
                            ) : (
                                <Copy size={13} />
                            )}
                            <span>{copiedPhoneType === 'csv' ? 'Copied CSV!' : 'Copy Phones (CSV)'}</span>
                        </button>

                        {/* Export .vcf Contact Card */}
                        <button
                            type="button"
                            onClick={handleDownloadVCard}
                            className="h-9 px-3 rounded-xl bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                            title="Download .vcf vCard file to add all city creators as contacts on your mobile phone"
                        >
                            <Download size={13} />
                            <span>Export Contacts (.vcf)</span>
                        </button>

                        {/* Mark All / Selected as Added */}
                        <button
                            type="button"
                            onClick={handleBulkMarkAdded}
                            disabled={isSubmitting || currentSelectedIds.size === 0}
                            className="h-9 px-4 rounded-xl bg-[#25D366] text-black font-black text-[10px] uppercase tracking-wider hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_20px_rgba(37,211,102,0.3)] transition-all"
                            title="Mark all selected creators in this city as added to WhatsApp group in the system"
                        >
                            {isSubmitting ? (
                                <RefreshCw size={13} className="animate-spin" />
                            ) : (
                                <CheckCircle2 size={13} />
                            )}
                            <span>Mark {currentSelectedIds.size} as Added</span>
                        </button>
                    </div>
                </div>

                {/* Creators Table / List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={handleToggleSelectAll}
                                className="w-4 h-4 rounded border-gray-300 text-neon-blue focus:ring-neon-blue cursor-pointer"
                            />
                            <span>Creator ({filteredCreators.length})</span>
                        </div>
                        <div className="flex items-center gap-8">
                            <span className="hidden sm:inline">Phone &amp; Direct WhatsApp</span>
                            <span>Community Status</span>
                        </div>
                    </div>

                    {filteredCreators.length === 0 ? (
                        <div className="py-12 text-center rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
                            <Users size={32} className="mx-auto text-gray-400" />
                            <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                                No creators found for {selectedCity}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-500 max-w-sm mx-auto">
                                Try changing your search query or city selection above.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {filteredCreators.map(creator => {
                                const id = creator.id || creator.uid;
                                const isSelected = currentSelectedIds.has(id);
                                const waUrl = getDirectWhatsAppUrl(creator);
                                const phoneFormatted = formatPhoneForWhatsApp(creator.phone);

                                return (
                                    <div
                                        key={id}
                                        className={cn(
                                            "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3",
                                            isSelected
                                                ? "bg-white dark:bg-zinc-900/80 border-neon-blue/30 shadow-sm"
                                                : "bg-gray-50/70 dark:bg-black/30 border-black/5 dark:border-white/5 opacity-80 hover:opacity-100"
                                        )}
                                    >
                                        {/* Checkbox & Creator Info */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleCreator(id)}
                                                className="w-4 h-4 rounded border-gray-300 text-neon-blue focus:ring-neon-blue cursor-pointer shrink-0"
                                            />

                                            <div className="w-8 h-8 rounded-full bg-neon-pink/10 text-neon-pink font-black text-xs flex items-center justify-center shrink-0">
                                                {(creator.name || creator.displayName || 'C').charAt(0).toUpperCase()}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                        {creator.name || creator.displayName || creator.fullName || 'Unnamed Creator'}
                                                    </span>
                                                    {(creator.instagram || creator.handle || creator.instagramHandle) && (
                                                        <span className="text-[10px] font-mono text-neon-pink truncate hidden sm:inline">
                                                            @{creator.instagram || creator.handle || creator.instagramHandle}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-zinc-400">
                                                    <span>{creator.city || selectedCity}</span>
                                                    {creator.email && (
                                                        <>
                                                            <span>&bull;</span>
                                                            <span className="truncate max-w-[160px]">{creator.email}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phone, Direct WA, Status */}
                                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                            {/* Phone Pill */}
                                            {phoneFormatted ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopySinglePhone(creator)}
                                                        className="h-7 px-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-mono text-[10px] text-gray-700 dark:text-zinc-300 flex items-center gap-1 transition-colors"
                                                        title="Click to copy phone number"
                                                    >
                                                        <Phone size={10} className="text-gray-400" />
                                                        <span>{phoneFormatted}</span>
                                                        {copiedPhoneType === id ? (
                                                            <Check size={10} className="text-neon-green ml-0.5" />
                                                        ) : (
                                                            <Copy size={10} className="text-gray-400 ml-0.5" />
                                                        )}
                                                    </button>

                                                    {waUrl && (
                                                        <a
                                                            href={waUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-7 h-7 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] flex items-center justify-center transition-colors"
                                                            title="Send 1:1 WhatsApp invite"
                                                        >
                                                            <MessageSquare size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-mono text-gray-400 italic">
                                                    No Phone
                                                </span>
                                            )}

                                            {/* Status Badge */}
                                            {creator.hasJoinedCityGroup ? (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                                                    <CheckCircle2 size={10} />
                                                    <span className="hidden sm:inline">In Group</span>
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    <span className="hidden sm:inline">Pending</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer instructions */}
                <div className="p-4 sm:p-5 border-t border-black/10 dark:border-white/10 bg-gray-50/80 dark:bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-neon-pink shrink-0" />
                        <span>
                            <strong>Admin Tip:</strong> Exporting .vcf contacts imports all creators with <code className="text-neon-blue font-mono">[{selectedCity.substring(0,3).toUpperCase()}]</code> prefix so you can select all in WhatsApp in seconds!
                        </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9 px-4 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-bold text-[10px] uppercase tracking-wider text-gray-700 dark:text-zinc-300 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default AddCityCreatorsModal;
