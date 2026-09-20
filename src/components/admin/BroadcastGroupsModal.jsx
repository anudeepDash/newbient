import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { DEFAULT_CREATOR_GROUPS } from '../../lib/constants';
import { sendCreatorGroupsBroadcastEmail, generateCreatorGroupsBroadcastHTML } from '../../lib/email';
import { cn } from '../../lib/utils';
import X from 'lucide-react/dist/esm/icons/x';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Send from 'lucide-react/dist/esm/icons/send';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Users from 'lucide-react/dist/esm/icons/users';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';

const normalizeCity = (cityStr = '') => {
    const raw = String(cityStr || '').trim().toLowerCase();
    if (/^bang[al]*o?re$/i.test(raw) || raw.includes('bengaluru') || raw.includes('bangalore')) return 'Bengaluru';
    if (raw.includes('hyderabad')) return 'Hyderabad';
    if (raw.includes('chandigarh')) return 'Chandigarh';
    if (raw.includes('mumbai')) return 'Mumbai';
    if (raw.includes('pune')) return 'Pune';
    if (raw.includes('kolkata') || raw.includes('calcutta')) return 'Kolkata';
    if (raw.includes('kochi') || raw.includes('cochin')) return 'Kochi';
    if (raw.includes('delhi')) return 'Delhi';
    return cityStr || 'Bengaluru';
};

const BroadcastGroupsModal = ({ onClose, preselectedCity = 'All' }) => {
    const { creators, creatorGroups } = useStore();

    const activeGroups = useMemo(() => {
        const remote = (creatorGroups || []).filter(g => g.isActive !== false);
        const map = new Map();
        remote.forEach(g => {
            if (g.city) map.set(g.city.toLowerCase().trim(), g);
        });
        const list = [...remote];
        DEFAULT_CREATOR_GROUPS.forEach(dg => {
            const key = dg.city.toLowerCase().trim();
            if (!map.has(key)) {
                list.push(dg);
                map.set(key, dg);
            }
        });
        return list.sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [creatorGroups]);

    const [selectedCityFilter, setSelectedCityFilter] = useState(preselectedCity);
    const [emailSubject, setEmailSubject] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [sendStats, setSendStats] = useState(null);

    // Filter creators with valid email
    const eligibleCreators = useMemo(() => {
        return (creators || []).filter(c => c.email && c.email.includes('@'));
    }, [creators]);

    // Filter by city
    const targetRecipients = useMemo(() => {
        if (selectedCityFilter === 'All') return eligibleCreators;
        const normFilter = selectedCityFilter.toLowerCase();
        return eligibleCreators.filter(c => {
            const normC = normalizeCity(c.city).toLowerCase();
            return normC.includes(normFilter) || (normFilter === 'delhi' && normC.includes('delhi'));
        });
    }, [eligibleCreators, selectedCityFilter]);

    // Active group for the selected city
    const activeCityGroup = useMemo(() => {
        if (selectedCityFilter === 'All') return activeGroups[0] || DEFAULT_CREATOR_GROUPS[0];
        const found = activeGroups.find(g => normalizeCity(g.city).toLowerCase() === selectedCityFilter.toLowerCase());
        return found || activeGroups[0] || DEFAULT_CREATOR_GROUPS[0];
    }, [activeGroups, selectedCityFilter]);

    // Auto-update subject when city changes if not manually typed
    useEffect(() => {
        const cityName = selectedCityFilter === 'All' ? 'Official' : selectedCityFilter;
        setEmailSubject(`🔥 ${cityName} Creator WhatsApp Community is Live • Exclusive Invitation`);
    }, [selectedCityFilter]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (targetRecipients.length === 0) {
            useStore.getState().addToast('No eligible creators found for this city selection.', 'error');
            return;
        }

        setIsSending(true);
        setProgress({ current: 0, total: targetRecipients.length });

        try {
            const recipientsPayload = targetRecipients.map(c => ({
                email: c.email.trim().toLowerCase(),
                name: c.name || c.displayName || 'Creator',
                city: c.city || selectedCityFilter
            }));

            const result = await sendCreatorGroupsBroadcastEmail(recipientsPayload, {
                city: selectedCityFilter === 'All' ? activeCityGroup.city : selectedCityFilter,
                groupUrl: activeCityGroup.groupUrl,
                customSubject: emailSubject,
                customMessage,
                availableGroups: activeGroups,
                onProgress: (curr, tot) => setProgress({ current: curr, total: tot })
            });

            if (result && (result.success || result.sentCount > 0)) {
                setSendStats({
                    sent: result.sentCount || targetRecipients.length,
                    failed: result.failedCount || 0
                });
                useStore.getState().addToast(`Broadcast complete! Dispatched to ${result.sentCount || targetRecipients.length} creators.`, 'success');
            } else {
                throw new Error(result?.error || 'Email dispatch failed.');
            }
        } catch (err) {
            console.error('Broadcast error:', err);
            useStore.getState().addToast(err.message || 'Failed to send broadcast.', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const previewHtml = useMemo(() => {
        return generateCreatorGroupsBroadcastHTML({
            creatorName: 'Creator Name',
            city: selectedCityFilter === 'All' ? activeCityGroup.city : selectedCityFilter,
            groupUrl: activeCityGroup.groupUrl,
            customMessage,
            availableGroups: activeGroups
        });
    }, [selectedCityFilter, activeCityGroup, customMessage, activeGroups]);

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md overflow-y-auto custom-scrollbar">
            <div className="fixed inset-0" onClick={onClose} />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative z-10 w-full max-w-3xl max-h-[94vh] rounded-[2.5rem] bg-[#0c0e14] border border-[#25D366]/30 text-white shadow-2xl flex flex-col overflow-hidden"
            >
                {/* ── HEADER ── */}
                <div className="p-6 sm:p-7 border-b border-white/[0.08] flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.3)]">
                            <Mail size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-[#25D366]">Creator Operations</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                                <span className="text-[10px] font-mono text-zinc-400">Email Notification</span>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black font-heading tracking-tight uppercase text-white">
                                Broadcast Creator Groups
                            </h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── BODY ── */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6 custom-scrollbar">
                    {/* Success State */}
                    {sendStats ? (
                        <div className="py-12 text-center space-y-5">
                            <div className="w-16 h-16 rounded-full bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(37,211,102,0.3)]">
                                <CheckCircle2 size={36} />
                            </div>
                            <div className="space-y-1 max-w-md mx-auto">
                                <h4 className="text-2xl font-black uppercase text-white">Broadcast Dispatched!</h4>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Successfully delivered WhatsApp community announcement to <strong>{sendStats.sent}</strong> creators.
                                    {sendStats.failed > 0 && ` (${sendStats.failed} failed)`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-8 h-12 rounded-xl bg-[#25D366] text-black font-black text-xs uppercase tracking-widest hover:brightness-110"
                            >
                                Done
                            </button>
                        </div>
                    ) : isSending ? (
                        /* Sending Progress */
                        <div className="py-12 text-center space-y-6">
                            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-[#25D366] animate-spin" />
                                <Send size={24} className="text-[#25D366]" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-lg font-black uppercase tracking-wider text-white">
                                    Transmitting {progress.current} of {progress.total}
                                </h4>
                                <p className="text-xs text-zinc-400">
                                    Delivering branded WhatsApp community invites to creator inboxes...
                                </p>
                            </div>
                            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden max-w-md mx-auto">
                                <div
                                    className="bg-[#25D366] h-full transition-all duration-300 shadow-[0_0_15px_rgba(37,211,102,0.6)]"
                                    style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="space-y-6">
                            {/* City Target Filter */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                                    <span>Target City Audience</span>
                                    <span className="text-[#25D366] font-mono">{targetRecipients.length} Creators Selected</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCityFilter('All')}
                                        className={cn(
                                            "h-10 px-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all truncate",
                                            selectedCityFilter === 'All'
                                                ? "bg-[#25D366] text-black border-[#25D366] font-black"
                                                : "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white"
                                        )}
                                    >
                                        All Cities ({eligibleCreators.length})
                                    </button>
                                    {activeGroups.map(g => {
                                        const count = eligibleCreators.filter(c => normalizeCity(c.city).toLowerCase() === g.city.toLowerCase()).length;
                                        const isSelected = selectedCityFilter.toLowerCase() === g.city.toLowerCase();
                                        return (
                                            <button
                                                key={g.city}
                                                type="button"
                                                onClick={() => setSelectedCityFilter(g.city)}
                                                className={cn(
                                                    "h-10 px-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all truncate flex items-center justify-between gap-1",
                                                    isSelected
                                                        ? "bg-[#25D366] text-black border-[#25D366] font-black"
                                                        : "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white"
                                                )}
                                            >
                                                <span className="truncate">{g.city}</span>
                                                <span className="text-[9px] opacity-70 font-mono">({count})</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Active Link Preview Pill */}
                            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <MessageCircle size={18} className="text-[#25D366] shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-white truncate">{activeCityGroup.title || `${activeCityGroup.city} Creators Hub`}</p>
                                        <p className="text-[10px] text-zinc-400 font-mono truncate">{activeCityGroup.groupUrl}</p>
                                    </div>
                                </div>
                                <a
                                    href={activeCityGroup.groupUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white shrink-0"
                                >
                                    Test Link &rarr;
                                </a>
                            </div>

                            {/* Subject Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    Email Subject Line
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    placeholder="Official Creator Community is Live!"
                                    className="w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold text-white outline-none focus:border-[#25D366]"
                                />
                            </div>

                            {/* Custom Message Body Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                                    <span>Personalized Note (Optional)</span>
                                    <span className="text-[9px] text-zinc-500">Leave blank to use official default invitation</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    placeholder="We have exciting brand campaigns and concert passes dropping this weekend for our verified creators. Tap below to join our city hub..."
                                    className="w-full p-4 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-medium text-white outline-none focus:border-[#25D366] resize-none"
                                />
                            </div>

                            {/* Toggle Preview View */}
                            <div className="pt-1 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                                    className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5"
                                >
                                    <Eye size={14} />
                                    <span>{isPreviewMode ? 'Hide Email Preview' : 'Show Live HTML Preview'}</span>
                                </button>
                            </div>

                            {/* Live HTML Preview Iframe */}
                            {isPreviewMode && (
                                <div className="rounded-2xl border border-white/10 overflow-hidden bg-black max-h-[380px]">
                                    <iframe
                                        title="Email Preview"
                                        srcDoc={previewHtml}
                                        className="w-full h-[360px] border-none"
                                    />
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
                                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                                    <Users size={14} className="text-[#25D366]" />
                                    <span>Ready to notify <strong>{targetRecipients.length}</strong> creators</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="h-12 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={targetRecipients.length === 0}
                                        className="h-12 px-7 rounded-xl bg-[#25D366] hover:brightness-110 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(37,211,102,0.4)] disabled:opacity-40"
                                    >
                                        <Send size={15} />
                                        <span>Send Broadcast</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default BroadcastGroupsModal;
