import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Check, Loader2, Instagram, Youtube, Linkedin, Twitter,
    Phone, Mail, ExternalLink, ArrowUpRight, MessageCircle,
    Pencil, Star, Copy, Trash2, Send,
    ShieldCheck, Clock, Ban, Bell, Plus, Image as ImageIcon,
    Bold, Italic, List, Link2
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { extractSocialUsername, buildSocialUrl } from '../../lib/socialUtils';
import { resolveCityWhatsAppGroup, generateOfficialHTML } from '../../lib/email';
import EmailPreviewIframe from '../ui/EmailPreviewIframe';
import EditCreatorModal from '../creator/EditCreatorModal';
import { SharedLayoutModal } from '../../design-system/overlays/SharedLayoutModal';

// ─── Constants & Badges ─────────────────────────────────────────────────────
const AVAILABLE_BADGES = [
    { id: 'viral_catalyst', category: 'Performance', label: 'Viral Catalyst', emoji: '🚀', gradient: 'from-fuchsia-500 to-purple-600', text: 'text-fuchsia-600 dark:text-fuchsia-400' },
    { id: 'high_converter', category: 'Performance', label: 'High Converter', emoji: '💸', gradient: 'from-emerald-400 to-emerald-600', text: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'top_1_percent', category: 'Performance', label: 'Top 1% Creator', emoji: '👑', gradient: 'from-amber-400 to-orange-500', text: 'text-amber-600 dark:text-amber-400' },
    
    { id: 'ugc_master', category: 'Niche Expert', label: 'UGC Master', emoji: '📱', gradient: 'from-blue-400 to-indigo-500', text: 'text-blue-600 dark:text-blue-400' },
    { id: 'luxury_specialist', category: 'Niche Expert', label: 'Luxury Specialist', emoji: '✨', gradient: 'from-zinc-500 to-zinc-700', text: 'text-zinc-600 dark:text-zinc-400' },
    { id: 'beauty_guru', category: 'Niche Expert', label: 'Beauty Guru', emoji: '💄', gradient: 'from-pink-400 to-rose-500', text: 'text-pink-600 dark:text-pink-400' },
    
    { id: 'always_on_time', category: 'Reliability', label: 'Always on Time', emoji: '⏱️', gradient: 'from-sky-400 to-cyan-500', text: 'text-sky-600 dark:text-sky-400' },
    { id: 'client_favorite', category: 'Reliability', label: 'Client Favorite', emoji: '❤️', gradient: 'from-rose-400 to-red-500', text: 'text-rose-600 dark:text-rose-400' },
    { id: 'zero_revisions', category: 'Reliability', label: 'Zero Revisions', emoji: '🎯', gradient: 'from-teal-400 to-emerald-500', text: 'text-teal-600 dark:text-teal-400' },
];

const fmt = (n) => {
    if (!n || n <= 0) return null;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
    return String(n);
};

// ─── UI Components ──────────────────────────────────────────────────────────
const FieldRow = ({ label, value, onCopy }) => {
    if (!value) return null;
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 group">
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-0.5">{label}</p>
                <p className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 truncate">{value}</p>
            </div>
            {onCopy && (
                <button type="button" onClick={() => onCopy(value, label)}
                    className="w-7 h-7 rounded-lg text-gray-300 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-300 flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100">
                    <Copy size={12} />
                </button>
            )}
        </div>
    );
};

const Card = ({ title, action, children, className = '' }) => (
    <div className={cn("rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden", className)}>
        {(title || action) && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
                {title && <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">{title}</p>}
                {action}
            </div>
        )}
        <div className="px-5 py-3.5">{children}</div>
    </div>
);

const BadgeCard = ({ badge, onRemove, auto = false }) => (
    <div className="relative group flex items-center gap-3.5 p-3 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#11131a] shadow-sm hover:shadow-md transition-all">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner bg-gradient-to-br", badge.gradient)}>
            {badge.emoji}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-1">
                {auto ? 'Auto Assigned' : badge.category}
            </p>
            <p className={cn("text-sm font-bold truncate", badge.text)}>{badge.label}</p>
        </div>
        {onRemove && (
            <button type="button" onClick={onRemove}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-600 active:scale-90 cursor-pointer z-10">
                <X size={12} strokeWidth={3} />
            </button>
        )}
    </div>
);

const RichEditor = ({ value, onChange, placeholder }) => {
    const editorRef = useRef(null);
    
    useEffect(() => {
        if (editorRef.current && !editorRef.current.innerHTML && value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const exec = (cmd, val = null) => {
        document.execCommand(cmd, false, val);
        editorRef.current.focus();
        onChange(editorRef.current.innerHTML);
    };

    const handleImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => exec('insertImage', e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleLink = () => {
        const url = prompt('Enter link URL:');
        if (url) exec('createLink', url);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-1 p-2 border-b border-black/[0.06] dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]">
                <button type="button" onClick={() => exec('bold')} className="w-7 h-7 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-400"><Bold size={13}/></button>
                <button type="button" onClick={() => exec('italic')} className="w-7 h-7 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-400"><Italic size={13}/></button>
                <button type="button" onClick={() => exec('insertUnorderedList')} className="w-7 h-7 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-400"><List size={13}/></button>
                <button type="button" onClick={handleLink} className="w-7 h-7 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-400"><Link2 size={13}/></button>
                <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
                <label className="w-7 h-7 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-400 cursor-pointer">
                    <ImageIcon size={13}/>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImage}/>
                </label>
            </div>
            <div 
                ref={editorRef}
                contentEditable 
                onInput={(e) => onChange(e.currentTarget.innerHTML)}
                className="flex-1 p-4 outline-none overflow-y-auto text-[13px] text-gray-800 dark:text-zinc-200"
                style={{ minHeight: '150px' }}
                data-placeholder={placeholder}
            />
        </div>
    );
};

// ─── Main ───────────────────────────────────────────────────────────────────
const CreatorDetailModal = ({
    creator,
    onClose,
    onUpdateStatus,
    onDelete,
    isUpdating,
    isDeleting
}) => {
    const { updateCreator, addNotification } = useStore();

    const [creatorData, setCreatorData] = useState(creator);
    const [activeTab, setActiveTab] = useState('overview');
    const [isFeatured, setIsFeatured] = useState(creator?.isFeatured || false);
    const [adminBadges, setAdminBadges] = useState(creator?.adminBadges || []);

    const [commMode, setCommMode] = useState('email');
    const [emailSubject, setEmailSubject] = useState('Partnership Update - Newbi Entertainment');
    const [emailBody, setEmailBody] = useState('');
    const [messageText, setMessageText] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [showBadgePicker, setShowBadgePicker] = useState(false);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editSection, setEditSection] = useState('identity');

    useEffect(() => {
        setIsFeatured(creator?.isFeatured || false);
        setAdminBadges(creator?.adminBadges || []);
        setCreatorData(creator);
    }, [creator]);

    // Handlers
    const handleToggleFeatured = async () => {
        const next = !isFeatured;
        setIsFeatured(next);
        try { await updateCreator(creatorData.id || creatorData.uid, { isFeatured: next }); useStore.getState().addToast(next ? 'Featured' : 'Unfeatured', 'success'); }
        catch { setIsFeatured(!next); useStore.getState().addToast('Failed', 'error'); }
    };

    const handleAddBadge = async (badgeId) => {
        if (adminBadges.includes(badgeId)) return;
        const u = [...adminBadges, badgeId]; setAdminBadges(u); setShowBadgePicker(false);
        try { await updateCreator(creatorData.id || creatorData.uid, { adminBadges: u }); useStore.getState().addToast(`Added Badge`, 'success'); }
        catch { setAdminBadges(adminBadges); useStore.getState().addToast('Failed', 'error'); }
    };

    const handleRemoveBadge = async (badgeId) => {
        const u = adminBadges.filter(b => b !== badgeId); setAdminBadges(u);
        try { await updateCreator(creatorData.id || creatorData.uid, { adminBadges: u }); useStore.getState().addToast(`Removed Badge`, 'success'); }
        catch { setAdminBadges(adminBadges); useStore.getState().addToast('Failed', 'error'); }
    };

    const handleCopy = (text, label) => { if (!text) return; navigator.clipboard.writeText(text); useStore.getState().addToast(`Copied ${label}`, 'success'); };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        if (!creatorData.email || !emailSubject.trim() || !emailBody.trim()) { useStore.getState().addToast('Fill subject & message', 'error'); return; }
        setSendingEmail(true);
        try {
            const { sendCustomEmail } = await import('../../lib/email');
            const r = await sendCustomEmail({ toEmail: creatorData.email, toName: creatorData.name, subject: emailSubject, message: emailBody, html: livePreviewHtml });
            if (r?.success) { useStore.getState().addToast('Email sent!', 'success'); setEmailBody(''); } else throw new Error();
        } catch { useStore.getState().addToast('Failed', 'error'); } finally { setSendingEmail(false); }
    };

    const handleSendNotification = async (e) => {
        e.preventDefault(); if (!messageText.trim()) return; setSendingMsg(true);
        try { await addNotification({ userId: creatorData.uid || creatorData.id, title: 'Message from Newbi Admin', message: messageText.trim(), type: 'admin_message', createdAt: new Date().toISOString(), read: false }); useStore.getState().addToast('Sent!', 'success'); setMessageText(''); }
        catch { useStore.getState().addToast('Failed', 'error'); } finally { setSendingMsg(false); }
    };

    // Computed
    const maxFollowers = useMemo(() => Math.max(Number(creatorData.instagramFollowers || 0), Number(creatorData.youtubeSubscribers || 0), Number(creatorData.linkedinFollowers || 0)), [creatorData]);
    const creatorIdTag = creatorData.creatorId || String(creatorData.uid || creatorData.id || '').slice(0, 8).toUpperCase();
    const cityWhatsApp = resolveCityWhatsAppGroup(creatorData.city);
    const cleanPhone = (creatorData.phone || '').replace(/\D/g, '');
    const whatsAppUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}` : null;
    const isApproved = creatorData.profileStatus === 'approved';
    const isPending = !creatorData.profileStatus || creatorData.profileStatus === 'pending';
    const avatar = creatorData.profilePicture || creatorData.instagramProfilePic || creatorData.profilePic || creatorData.photoURL;
    const bothVerified = creatorData.isPhoneVerified && creatorData.isInstagramVerified;
    const phoneOnly = creatorData.isPhoneVerified && !creatorData.isInstagramVerified;

    // Badges Auto Logic
    const autoBadges = useMemo(() => {
        const b = [];
        const f = maxFollowers;
        if (f >= 1000000) b.push({ id: 'mega', category: 'Audience', label: 'Mega Creator', emoji: '🌟', gradient: 'from-fuchsia-500 to-purple-600', text: 'text-fuchsia-600 dark:text-fuchsia-400' });
        else if (f >= 100000) b.push({ id: 'macro', category: 'Audience', label: 'Macro Creator', emoji: '👑', gradient: 'from-amber-400 to-orange-500', text: 'text-amber-600 dark:text-amber-400' });
        else if (f >= 10000) b.push({ id: 'micro', category: 'Audience', label: 'Micro Creator', emoji: '⭐', gradient: 'from-blue-400 to-indigo-500', text: 'text-blue-600 dark:text-blue-400' });
        else if (f >= 1000) b.push({ id: 'nano', category: 'Audience', label: 'Nano Creator', emoji: '🌱', gradient: 'from-emerald-400 to-emerald-600', text: 'text-emerald-600 dark:text-emerald-400' });

        if (bothVerified) b.push({ id: 'verified', category: 'Trust', label: 'Fully Verified', emoji: '✅', gradient: 'from-cyan-400 to-blue-500', text: 'text-cyan-600 dark:text-cyan-400' });
        
        const campaigns = (creatorData.joinedCampaigns || []).length;
        if (campaigns >= 10) b.push({ id: 'veteran', category: 'Experience', label: 'Campaign Veteran', emoji: '🔥', gradient: 'from-rose-400 to-red-500', text: 'text-rose-600 dark:text-rose-400' });
        else if (campaigns >= 3) b.push({ id: 'active', category: 'Experience', label: 'Active Collab', emoji: '⚡', gradient: 'from-purple-400 to-pink-500', text: 'text-purple-600 dark:text-purple-400' });
        
        return b;
    }, [maxFollowers, creatorData, bothVerified]);

    const customActiveBadges = useMemo(() => adminBadges.map(id => AVAILABLE_BADGES.find(b => b.id === id)).filter(Boolean), [adminBadges]);
    const unselectedBadges = AVAILABLE_BADGES.filter(b => !adminBadges.includes(b.id));

    const TABS = [
        { id: 'overview', label: 'Profile' },
        { id: 'communication', label: 'Outreach' },
        { id: 'management', label: 'Manage' },
    ];

    // Email live preview construction
    const livePreviewHtml = useMemo(() => {
        // Fallback for empty state
        const bodyContent = emailBody.trim() ? emailBody : '<p style="color: #999; font-style: italic;">Your message will appear here...</p>';
        return generateOfficialHTML({
            headerText: emailSubject || 'No Subject',
            messageBody: bodyContent,
            category: 'OUTREACH',
            theme: 'light',
            isPreview: true
        });
    }, [emailSubject, emailBody]);

    return (
        <>
            <SharedLayoutModal
                isOpen={true}
                onClose={onClose}
                layoutId={`creator-card-${creatorData.id || creatorData.uid}`}
                className="w-full max-w-5xl h-[92vh] sm:h-[90vh] bg-[#0a0c12]/70 backdrop-blur-3xl border border-white/[0.1] rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.6)] overflow-hidden"
                contentClassName="p-0"
                hideCloseButton={true}
            >
                <div className="flex flex-col h-full text-white">

                    {/* ═══ HEADER ═══ */}
                    <div className="shrink-0 border-b border-white/[0.08] relative overflow-hidden backdrop-blur-xl">
                        {/* Blurred avatar background */}
                        {avatar && (
                            <div className="absolute inset-0 overflow-hidden">
                                <img src={avatar} alt="" className="w-full h-full object-cover scale-[2] blur-[80px] opacity-[0.2] saturate-150" />
                                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-[#0a0c12]/50 to-[#0a0c12]/80" />
                            </div>
                        )}

                        <div className="relative px-5 sm:px-7 pt-5 pb-0">
                            {/* Top row: Avatar + Info + Actions */}
                            <div className="flex items-start gap-4 sm:gap-5">
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <div className={cn(
                                        "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-2 ring-offset-2 ring-offset-[#0a0c12]",
                                        bothVerified ? "ring-neon-green/40" : phoneOnly ? "ring-neon-green/30" : "ring-white/[0.08]"
                                    )}>
                                        {avatar ? (
                                            <img src={avatar} alt={creatorData.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center font-heading font-black text-2xl sm:text-3xl text-neon-green">{creatorData.name?.charAt(0) || 'C'}</div>
                                        )}
                                    </div>
                                    {(bothVerified || phoneOnly) && (
                                        <div className={cn(
                                            "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-[2px] border-[#0a0c12] shadow-lg",
                                            bothVerified ? "bg-neon-green shadow-neon-green/30" : "bg-blue-500 shadow-blue-500/30"
                                        )}>
                                            <Check size={11} strokeWidth={3.5} className="text-black" />
                                        </div>
                                    )}
                                </div>

                                {/* Name + Meta */}
                                <div className="flex-1 min-w-0 pt-0.5">
                                    {/* Name row */}
                                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                                        <h1 className="text-lg sm:text-xl font-black font-heading uppercase tracking-tight leading-none text-white">{creatorData.name}</h1>
                                        <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-md bg-white/[0.05] text-zinc-500 font-bold tracking-widest">#{creatorIdTag}</span>
                                        {isApproved ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green text-[9px] font-black uppercase font-mono border border-neon-green/20">
                                                <ShieldCheck size={9} /> Verified
                                            </span>
                                        ) : isPending ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase font-mono border border-amber-500/20">
                                                <Clock size={9} /> Pending
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase font-mono border border-rose-500/20">
                                                <Ban size={9} /> {creatorData.profileStatus}
                                            </span>
                                        )}
                                        {isFeatured && (
                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-neon-pink/10 text-neon-pink border border-neon-pink/20 text-[9px] font-black uppercase font-mono">
                                                <Star size={8} className="fill-neon-pink" /> Featured
                                            </span>
                                        )}
                                    </div>

                                    {/* Subtitle */}
                                    <p className="text-[11px] text-zinc-500 font-medium mb-3">
                                        {[creatorData.city, creatorData.specializations?.[0] || creatorData.niches?.[0]].filter(Boolean).join(' · ') || 'Creator'}
                                        <span className="mx-1.5 text-zinc-700">·</span>
                                        Joined {new Date(creatorData.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </p>

                                    {/* Stats + Quick Links row */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Stat chips */}
                                        {fmt(maxFollowers) && (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12] shadow-sm">
                                                <span className="font-black text-[13px] font-mono text-white leading-none">{fmt(maxFollowers)}</span>
                                                <span className="text-[9px] text-white/60 font-medium uppercase tracking-wider">followers</span>
                                            </div>
                                        )}
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neon-green/[0.08] backdrop-blur-md border border-neon-green/20 shadow-[0_0_15px_-3px_rgba(57,255,20,0.1)]">
                                            <span className="font-black text-[13px] font-mono text-neon-green leading-none">{(creatorData.points || 500).toLocaleString()}</span>
                                            <span className="text-[9px] text-neon-green/60 font-medium uppercase tracking-wider">pts</span>
                                        </div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12] shadow-sm">
                                            <span className="font-black text-[13px] font-mono text-white leading-none">{(creatorData.joinedCampaigns || []).length}</span>
                                            <span className="text-[9px] text-white/60 font-medium uppercase tracking-wider">campaigns</span>
                                        </div>

                                        {/* Divider */}
                                        <div className="w-px h-6 bg-white/[0.1] mx-1" />

                                        {/* Social quick links */}
                                        {creatorData.instagram && (
                                            <a href={buildSocialUrl(creatorData.instagram, 'instagram')} target="_blank" rel="noopener noreferrer" title={`@${extractSocialUsername(creatorData.instagram, 'instagram')}`}
                                                className="w-8 h-8 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12] hover:bg-[#e1306c]/20 hover:border-[#e1306c]/40 flex items-center justify-center transition-all active:scale-90 hover:scale-105 shadow-sm group">
                                                <svg width="14" height="14" viewBox="0 0 24 24" className="fill-white/80 group-hover:fill-[#e1306c] transition-colors"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                                            </a>
                                        )}
                                        {whatsAppUrl && (
                                            <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                                                className="w-8 h-8 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12] hover:bg-[#25D366]/20 hover:border-[#25D366]/40 flex items-center justify-center transition-all active:scale-90 hover:scale-105 shadow-sm group">
                                                <svg width="14" height="14" viewBox="0 0 24 24" className="fill-white/80 group-hover:fill-[#25D366] transition-colors"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                            </a>
                                        )}
                                        {creatorData.youtube && (
                                            <a href={buildSocialUrl(creatorData.youtube, 'youtube')} target="_blank" rel="noopener noreferrer" title="YouTube"
                                                className="w-8 h-8 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12] hover:bg-[#FF0000]/20 hover:border-[#FF0000]/40 flex items-center justify-center transition-all active:scale-90 hover:scale-105 shadow-sm group">
                                                <svg width="14" height="14" viewBox="0 0 24 24" className="fill-white/80 group-hover:fill-[#FF0000] transition-colors"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                            </a>
                                        )}
                                        {creatorData.linkedin && (
                                            <a href={buildSocialUrl(creatorData.linkedin, 'linkedin')} target="_blank" rel="noopener noreferrer" title="LinkedIn"
                                                className="w-8 h-8 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12] hover:bg-[#0A66C2]/20 hover:border-[#0A66C2]/40 flex items-center justify-center transition-all active:scale-90 hover:scale-105 shadow-sm group">
                                                <svg width="13" height="13" viewBox="0 0 24 24" className="fill-white/80 group-hover:fill-[#0A66C2] transition-colors"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                            </a>
                                        )}
                                        {creatorData.twitter && (
                                            <a href={buildSocialUrl(creatorData.twitter, 'twitter')} target="_blank" rel="noopener noreferrer" title="X"
                                                className="w-8 h-8 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12] hover:bg-white/20 hover:border-white/40 flex items-center justify-center transition-all active:scale-90 hover:scale-105 shadow-sm group">
                                                <svg width="12" height="12" viewBox="0 0 24 24" className="fill-white/80 group-hover:fill-white transition-colors"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                            </a>
                                        )}
                                        {cleanPhone && (
                                            <a href={`tel:${creatorData.phone}`} title={creatorData.phone}
                                                className="w-8 h-8 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12] hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-sm">
                                                <Phone size={13} />
                                            </a>
                                        )}
                                        {creatorData.email && (
                                            <a href={`mailto:${creatorData.email}`} title={creatorData.email}
                                                className="w-8 h-8 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12] hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-sm">
                                                <Mail size={13} />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Top-right actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button type="button" onClick={() => { setEditSection('identity'); setIsEditOpen(true); }}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.1] backdrop-blur-md hover:bg-white/[0.2] border border-white/[0.15] text-white font-bold text-[11px] transition-all active:scale-95 cursor-pointer shadow-sm">
                                        <Pencil size={12} /> <span className="hidden sm:inline">Edit</span>
                                    </button>
                                    <button type="button" onClick={() => onUpdateStatus && onUpdateStatus(creatorData.id || creatorData.uid, 'blocked')} disabled={isUpdating} title="Block"
                                        className="w-8 h-8 rounded-xl bg-white/[0.1] backdrop-blur-md hover:bg-rose-500/20 border border-white/[0.15] hover:border-rose-500/30 text-white hover:text-rose-400 flex items-center justify-center transition-all active:scale-90 cursor-pointer disabled:opacity-30 shadow-sm">
                                        <Ban size={13} />
                                    </button>
                                    <button type="button" onClick={() => onDelete && onDelete(creatorData.id || creatorData.uid)} disabled={isDeleting} title="Delete"
                                        className="w-8 h-8 rounded-xl bg-white/[0.1] backdrop-blur-md hover:bg-rose-500/20 border border-white/[0.15] hover:border-rose-500/30 text-white hover:text-rose-400 flex items-center justify-center transition-all active:scale-90 cursor-pointer disabled:opacity-30 shadow-sm">
                                        {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} />}
                                    </button>
                                </div>
                            </div>

                            {/* Approve/reject banner */}
                            {!isApproved && (
                                <div className={cn(
                                    "mt-4 px-4 py-3 rounded-xl flex items-center justify-between gap-3 border",
                                    isPending ? "bg-amber-500/[0.06] border-amber-500/15" : "bg-rose-500/[0.06] border-rose-500/15"
                                )}>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isPending ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400")}>
                                            {isPending ? <Clock size={13} /> : <Ban size={13} />}
                                        </div>
                                        <p className={cn("text-[11px] font-black uppercase tracking-wider", isPending ? "text-amber-300" : "text-rose-300")}>
                                            {isPending ? 'Awaiting Approval' : creatorData.profileStatus === 'blocked' ? 'Blocked' : 'Rejected'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button type="button" onClick={() => onUpdateStatus && onUpdateStatus(creatorData.id || creatorData.uid, 'approved')} disabled={isUpdating}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neon-green hover:bg-neon-green/90 disabled:opacity-40 text-black font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-sm shadow-neon-green/20">
                                            {isUpdating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={3} />} Approve
                                        </button>
                                        {isPending && (
                                            <button type="button" onClick={() => onUpdateStatus && onUpdateStatus(creatorData.id || creatorData.uid, 'rejected')} disabled={isUpdating}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-rose-500/10 border border-white/[0.08] text-zinc-300 hover:text-rose-400 font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer">
                                                <X size={11} strokeWidth={3} /> Reject
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex gap-2 mt-5 mb-2 overflow-x-auto no-scrollbar">
                                {TABS.map(tab => {
                                    const active = activeTab === tab.id;
                                    return (
                                        <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "relative px-4 py-2.5 text-[10.5px] font-black uppercase tracking-[0.15em] transition-all shrink-0 cursor-pointer rounded-full border",
                                                active
                                                    ? "text-white bg-white/[0.12] border-white/[0.15] shadow-sm backdrop-blur-md"
                                                    : "text-zinc-500 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-transparent hover:border-white/[0.1] backdrop-blur-sm"
                                            )}>
                                            {tab.label}
                                            {active && <motion.div layoutId="creator-tab-indicator" className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/[0.05]" transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ═══ TAB CONTENT ═══ */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="px-5 sm:px-7 py-5 space-y-4 max-w-5xl mx-auto h-full">

                            {/* ── PROFILE ── */}
                            {activeTab === 'overview' && (
                                <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} className="space-y-4">
                                    {/* Unverified banner */}
                                    {creatorData.instagramFollowers && !creatorData.isInstagramVerified && (
                                        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 backdrop-blur-xl shadow-inner">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/10">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                                </div>
                                                <p className="text-xs text-white/70">
                                                    <span className="font-black uppercase tracking-wider text-amber-400">Unverified</span>
                                                    <span className="mx-1.5 text-white/20">—</span>
                                                    Self-reported {Number(creatorData.instagramFollowers).toLocaleString()} followers
                                                </p>
                                            </div>
                                            {creatorData.instagram && (
                                                <a href={buildSocialUrl(creatorData.instagram, 'instagram')} target="_blank" rel="noopener noreferrer"
                                                    className="px-4 py-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shrink-0 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)] border border-amber-300/50">
                                                    Verify <ArrowUpRight size={10} />
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* ═══ BENTO GRID ═══ */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">

                                        {/* ── SOCIALS CARD (spans 2 cols on lg) ── */}
                                        <div className="lg:col-span-2 rounded-[1.5rem] border border-white/[0.12] bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden group relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] via-transparent to-pink-500/[0.02] pointer-events-none" />
                                            <div className="relative">
                                                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Connected Platforms</p>
                                                    </div>
                                                    <button type="button" onClick={() => { setEditSection('socials'); setIsEditOpen(true); }}
                                                        className="text-[10px] font-bold text-neon-green/70 hover:text-neon-green uppercase tracking-wider font-mono cursor-pointer transition-colors">Edit</button>
                                                </div>
                                                <div className="p-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {[
                                                            creatorData.instagram && {
                                                                name: 'Instagram', handle: `@${extractSocialUsername(creatorData.instagram, 'instagram')}`, count: creatorData.instagramFollowers, url: buildSocialUrl(creatorData.instagram, 'instagram'),
                                                                gradient: 'bg-white/[0.05]', borderColor: 'border-white/[0.1] hover:border-[#e1306c]/40',
                                                                logoBg: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
                                                                logo: <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
                                                            },
                                                            creatorData.youtube && {
                                                                name: 'YouTube', handle: `@${extractSocialUsername(creatorData.youtube, 'youtube')}`, count: creatorData.youtubeSubscribers, url: buildSocialUrl(creatorData.youtube, 'youtube'),
                                                                gradient: 'bg-white/[0.05]', borderColor: 'border-white/[0.1] hover:border-[#FF0000]/40',
                                                                logoBg: 'bg-[#FF0000]',
                                                                logo: <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
                                                            },
                                                            creatorData.linkedin && {
                                                                name: 'LinkedIn', handle: extractSocialUsername(creatorData.linkedin, 'linkedin'), count: creatorData.linkedinFollowers, url: buildSocialUrl(creatorData.linkedin, 'linkedin'),
                                                                gradient: 'bg-white/[0.05]', borderColor: 'border-white/[0.1] hover:border-[#0A66C2]/40',
                                                                logoBg: 'bg-[#0A66C2]',
                                                                logo: <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
                                                            },
                                                            creatorData.twitter && {
                                                                name: 'X', handle: `@${extractSocialUsername(creatorData.twitter, 'twitter')}`, count: null, url: buildSocialUrl(creatorData.twitter, 'twitter'),
                                                                gradient: 'bg-white/[0.05]', borderColor: 'border-white/[0.1] hover:border-white/30',
                                                                logoBg: 'bg-white',
                                                                logo: <svg width="12" height="12" viewBox="0 0 24 24" className="fill-black"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
                                                            },
                                                        ].filter(Boolean).map((s, i) => (
                                                            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                                                                className={cn("flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all group/social hover:scale-[1.02] shadow-sm backdrop-blur-md", s.gradient, s.borderColor)}>
                                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:shadow-lg transition-shadow", s.logoBg)}>
                                                                    {s.logo}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-0.5">{s.name}</p>
                                                                    <p className="text-[13px] font-bold text-white/90 truncate group-hover:text-white transition-colors">{s.handle}</p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    {s.count ? (
                                                                        <>
                                                                            <p className="text-base font-black font-mono text-white leading-none shadow-black/20 drop-shadow-md">{fmt(Number(s.count))}</p>
                                                                            <p className="text-[9px] text-white/40 font-medium mt-0.5">followers</p>
                                                                        </>
                                                                    ) : (
                                                                        <ArrowUpRight size={14} className="text-white/30 group-hover/social:text-white/70 transition-colors" />
                                                                    )}
                                                                </div>
                                                            </a>
                                                        ))}
                                                        {!creatorData.instagram && !creatorData.youtube && !creatorData.linkedin && !creatorData.twitter && (
                                                            <div className="col-span-2 py-10 text-center rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-sm">
                                                                <p className="text-sm font-bold text-white/50">No platforms connected</p>
                                                                <p className="text-[11px] text-white/30 mt-1">Link social accounts to get started</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── CONTACT CARD ── */}
                                        <div className="rounded-[1.5rem] border border-white/[0.12] bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden relative">
                                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />
                                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-neon-green/10 flex items-center justify-center border border-neon-green/20 shadow-sm">
                                                        <Phone size={11} className="text-neon-green" />
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Contact</p>
                                                </div>
                                                <button type="button" onClick={() => { setEditSection('identity'); setIsEditOpen(true); }}
                                                    className="text-[10px] font-bold text-neon-green/70 hover:text-neon-green uppercase tracking-wider font-mono cursor-pointer transition-colors">Edit</button>
                                            </div>
                                            <div className="p-5 space-y-1">
                                                {creatorData.email && (
                                                    <div className="group flex items-center gap-3 py-2.5 rounded-xl hover:bg-white/[0.06] -mx-2 px-2 transition-all cursor-pointer" onClick={() => handleCopy(creatorData.email, 'Email')}>
                                                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                            <Mail size={13} className="text-blue-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Email</p>
                                                            <p className="text-[12px] font-semibold text-white/90 truncate">{creatorData.email}</p>
                                                        </div>
                                                        <Copy size={11} className="text-white/30 group-hover:text-white/70 transition-all shrink-0" />
                                                    </div>
                                                )}
                                                {creatorData.phone && (
                                                    <div className="group flex items-center gap-3 py-2.5 rounded-xl hover:bg-white/[0.06] -mx-2 px-2 transition-all cursor-pointer" onClick={() => handleCopy(creatorData.phone, 'Phone')}>
                                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                            <Phone size={13} className="text-emerald-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Phone</p>
                                                            <p className="text-[12px] font-semibold text-white/90 truncate">{creatorData.phone}</p>
                                                        </div>
                                                        <Copy size={11} className="text-white/30 group-hover:text-white/70 transition-all shrink-0" />
                                                    </div>
                                                )}
                                                {creatorData.city && (
                                                    <div className="flex items-center gap-3 py-2.5 -mx-2 px-2">
                                                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-sm">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-0.5">City</p>
                                                            <p className="text-[12px] font-semibold text-white/90">{creatorData.city}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {cityWhatsApp?.title && (
                                                    <div className="flex items-center gap-3 py-2.5 -mx-2 px-2 group">
                                                        <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-0.5">WhatsApp Group</p>
                                                            <p className="text-[12px] font-semibold text-white/90 truncate">{cityWhatsApp.title}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── CONTENT & RATES CARD ── */}
                                        <div className="lg:col-span-2 rounded-[1.5rem] border border-white/[0.12] bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden relative">
                                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-blue/40 to-transparent" />
                                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-neon-blue/10 flex items-center justify-center border border-neon-blue/20 shadow-sm">
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neon-blue"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Content & Rates</p>
                                                </div>
                                                <button type="button" onClick={() => { setEditSection('rates'); setIsEditOpen(true); }}
                                                    className="text-[10px] font-bold text-neon-green/70 hover:text-neon-green uppercase tracking-wider font-mono cursor-pointer transition-colors">Edit</button>
                                            </div>
                                            <div className="p-4">
                                                {/* Mini bento tiles */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    {/* Rate tile */}
                                                    <div className="col-span-2 rounded-[1.25rem] bg-gradient-to-br from-neon-green/[0.08] to-neon-green/[0.03] border border-neon-green/20 p-4 shadow-inner backdrop-blur-md flex flex-col justify-center min-h-[80px]">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-neon-green/60 mb-2">Rate</p>
                                                        {creatorData.commercials ? (
                                                            <p className="text-[14px] sm:text-[15px] font-black text-neon-green leading-snug shadow-black/20 drop-shadow-md break-keep">{creatorData.commercials}</p>
                                                        ) : (
                                                            <p className="text-[14px] font-bold text-white/40 italic">Not set</p>
                                                        )}
                                                    </div>

                                                    {/* Niche tile */}
                                                    <div className="col-span-1 rounded-[1.25rem] bg-white/[0.05] border border-white/[0.1] p-3.5 shadow-sm backdrop-blur-md flex flex-col justify-center">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1.5">Niche</p>
                                                        <p className="text-[12px] font-bold text-white/90 leading-snug">
                                                            {creatorData.primaryNiche || creatorData.niche || (creatorData.specializations || creatorData.niches || [])[0] || <span className="text-white/40 italic font-normal">—</span>}
                                                        </p>
                                                    </div>

                                                    {/* Mode tile */}
                                                    <div className="col-span-1 rounded-[1.25rem] bg-white/[0.05] border border-white/[0.1] p-3.5 shadow-sm backdrop-blur-md flex flex-col justify-center">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1.5">Mode</p>
                                                        <div>
                                                            <span className={cn(
                                                                "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold",
                                                                creatorData.doBarter === 'paid' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                                creatorData.doBarter === 'barter' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                                "bg-neon-blue/10 text-neon-blue border border-neon-blue/20"
                                                            )}>
                                                                {creatorData.doBarter === 'paid' ? 'Paid Only' : creatorData.doBarter === 'barter' ? 'Barter Only' : 'Barter'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Languages tile */}
                                                    {(creatorData.languages || []).length > 0 && (
                                                        <div className="col-span-2 sm:col-span-4 rounded-[1.25rem] bg-white/[0.05] border border-white/[0.1] p-3.5 shadow-sm backdrop-blur-md">
                                                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-2">Languages</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {creatorData.languages.map((lang, i) => (
                                                                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white/[0.08] border border-white/[0.12] text-[10.5px] font-semibold text-white/90 shadow-sm">{lang}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Specializations */}
                                                {(creatorData.specializations || creatorData.niches || []).length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-white/[0.08]">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-2">Specializations</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(creatorData.specializations || creatorData.niches || []).map((s, i) => (
                                                                <span key={i} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-neon-purple/[0.08] to-neon-blue/[0.06] border border-neon-purple/20 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── CREATOR IDENTITY CARD ── */}
                                        <div className="rounded-[1.5rem] border border-white/[0.12] bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden relative">
                                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-pink/40 to-transparent" />
                                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-neon-pink/10 flex items-center justify-center border border-neon-pink/20 shadow-sm">
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neon-pink"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2"/></svg>
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Identity</p>
                                                </div>
                                            </div>
                                            <div className="p-5 space-y-5">
                                                {/* Creator ID highlight */}
                                                <div className="flex items-center justify-between p-3.5 rounded-[1.25rem] bg-gradient-to-br from-neon-green/[0.08] to-neon-blue/[0.05] border border-neon-green/20 group cursor-pointer shadow-inner backdrop-blur-md hover:scale-[1.02] transition-transform" onClick={() => handleCopy(creatorIdTag, 'Creator ID')}>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-1">Creator ID</p>
                                                        <p className="text-lg font-black font-mono text-neon-green leading-none shadow-black/20 drop-shadow-md">#{creatorIdTag}</p>
                                                    </div>
                                                    <Copy size={13} className="text-white/40 group-hover:text-neon-green transition-colors" />
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Points</p>
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neon-green/10 border border-neon-green/20">
                                                            <div className="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.8)]" />
                                                            <span className="text-sm font-black font-mono text-neon-green">{(creatorData.points || 500).toLocaleString()}</span>
                                                            <span className="text-[10px] text-neon-green/70 font-medium">pts</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Joined</p>
                                                        <span className="text-[12px] font-semibold text-white/90 bg-white/[0.05] border border-white/[0.1] px-2.5 py-1 rounded-lg">
                                                            {new Date(creatorData.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="group flex items-center justify-between cursor-pointer" onClick={() => handleCopy(creatorData.uid || creatorData.id, 'UID')}>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">UID</p>
                                                        <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.1] px-2.5 py-1 rounded-lg hover:bg-white/[0.1] transition-colors">
                                                            <span className="text-[10px] font-mono font-medium text-white/70 truncate max-w-[120px]">{creatorData.uid || creatorData.id}</span>
                                                            <Copy size={10} className="text-white/40 group-hover:text-white transition-colors shrink-0" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'communication' && (
                                <motion.div key="communication" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} className="space-y-3">

                                    {/* ── Channel Selector (pill tabs) ── */}
                                    <div className="flex items-center gap-2">
                                        {[
                                            { id: 'email', label: 'Email', icon: Mail, desc: 'Send branded email' },
                                            { id: 'notify', label: 'Push Notification', icon: Bell, desc: 'In-app alert' }
                                        ].map(m => {
                                            const Icon = m.icon;
                                            const isActive = commMode === m.id;
                                            return (
                                                <button key={m.id} type="button" onClick={() => setCommMode(m.id)}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-left transition-all cursor-pointer border",
                                                        isActive
                                                            ? "bg-white/[0.08] border-white/[0.12] text-white shadow-sm backdrop-blur-md"
                                                            : "bg-white/[0.03] border-transparent text-white/50 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/[0.08] backdrop-blur-sm"
                                                    )}>
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm",
                                                        isActive ? "bg-neon-green/15 text-neon-green border border-neon-green/20" : "bg-white/[0.05] text-white/50 border border-white/[0.05]"
                                                    )}>
                                                        <Icon size={14} />
                                                    </div>
                                                    <div>
                                                        <p className={cn("text-[11px] font-bold", isActive ? "text-white" : "text-white/60")}>{m.label}</p>
                                                        <p className="text-[9px] text-white/40">{m.desc}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* ── Composer + Preview Bento Grid ── */}
                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: '420px' }}>

                                        {/* Composer Card (spans 3 cols) */}
                                        <div className="lg:col-span-3 rounded-[1.5rem] border border-white/[0.12] bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden flex flex-col relative">
                                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/40 to-transparent" />

                                            {commMode === 'email' && (
                                                <form onSubmit={handleSendEmail} className="flex flex-col h-full relative z-10">
                                                    {/* Email header fields */}
                                                    <div className="px-5 py-4 border-b border-white/[0.08] shrink-0 space-y-3">
                                                        <div className="flex items-center gap-3 text-[13px]">
                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50 w-8">To</span>
                                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-xl font-medium text-white/90 text-[12px] shadow-inner backdrop-blur-sm">
                                                                {creatorData.name}
                                                                <span className="text-white/40 font-normal text-[11px]">&lt;{creatorData.email || 'No email'}&gt;</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[13px]">
                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50 w-8">Sub</span>
                                                            <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                                                                className="flex-1 bg-transparent border-none outline-none font-bold text-white placeholder-white/30 text-[13px]"
                                                                placeholder="Subject line" />
                                                        </div>
                                                    </div>
                                                    {/* Editor */}
                                                    <div className="flex-1 min-h-0 relative">
                                                        <RichEditor
                                                            value={emailBody}
                                                            onChange={setEmailBody}
                                                        />
                                                    </div>
                                                    {/* Send button */}
                                                    <div className="px-5 py-3.5 border-t border-white/[0.08] shrink-0 flex justify-between items-center bg-white/[0.02]">
                                                        <p className="text-[10px] text-white/50">HTML email with branded template</p>
                                                        <button type="submit" disabled={sendingEmail || !creatorData.email}
                                                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neon-green hover:bg-neon-green/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(57,255,20,0.4)] hover:shadow-[0_0_20px_rgba(57,255,20,0.6)]">
                                                            {sendingEmail ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {sendingEmail ? 'Sending…' : 'Send Email'}
                                                        </button>
                                                    </div>
                                                </form>
                                            )}

                                            {commMode === 'notify' && (
                                                <form onSubmit={handleSendNotification} className="flex flex-col h-full relative z-10">
                                                    <div className="px-5 py-4 border-b border-white/[0.08] shrink-0 bg-white/[0.02]">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-sm">
                                                                <Bell size={14} className="text-amber-400" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[13px] font-bold text-white shadow-black/20 drop-shadow-md">Push Notification</p>
                                                                <p className="text-[10px] text-white/50">Instant alert to {creatorData.name}'s app inbox</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-h-0 p-5 relative">
                                                        <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                                                            className="w-full h-full p-4 bg-white/[0.03] border border-white/[0.1] rounded-2xl outline-none resize-none text-[13px] leading-relaxed text-white/90 placeholder-white/30 focus:border-neon-green/50 focus:bg-white/[0.05] transition-all shadow-inner backdrop-blur-sm"
                                                            placeholder="Type the notification body here..." />
                                                    </div>
                                                    <div className="px-5 py-3.5 border-t border-white/[0.08] shrink-0 flex justify-between items-center bg-white/[0.02]">
                                                        <p className="text-[10px] text-white/50">Delivered to in-app notification center</p>
                                                        <button type="submit" disabled={sendingMsg || !messageText.trim()}
                                                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neon-green hover:bg-neon-green/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(57,255,20,0.4)] hover:shadow-[0_0_20px_rgba(57,255,20,0.6)]">
                                                            {sendingMsg ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {sendingMsg ? 'Sending…' : 'Send Push'}
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>

                                        {/* Live Preview Card (spans 2 cols) */}
                                        <div className="lg:col-span-2 rounded-[1.5rem] border border-white/[0.12] bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden flex flex-col relative">
                                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-blue/40 to-transparent" />
                                            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-center gap-2 shrink-0 bg-white/[0.02]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Live Preview</span>
                                            </div>
                                            <div className="flex-1 relative overflow-hidden bg-black/40 shadow-inner">
                                                {commMode === 'email' ? (
                                                    <EmailPreviewIframe html={livePreviewHtml} />
                                                ) : (
                                                    <div className="absolute inset-0 p-5 flex items-start justify-center overflow-y-auto">
                                                        <div className="w-full bg-white/[0.05] border border-white/[0.1] rounded-2xl overflow-hidden mt-4 relative backdrop-blur-md shadow-lg">
                                                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-green via-neon-blue to-neon-pink" />
                                                            <div className="p-4 border-b border-white/[0.06] flex gap-3 items-center bg-white/[0.02]">
                                                                <div className="w-9 h-9 rounded-xl bg-neon-green/10 text-neon-green flex items-center justify-center shrink-0 border border-neon-green/20 shadow-sm">
                                                                    <Bell size={15} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[12px] font-bold text-white truncate shadow-black/20 drop-shadow-md">Newbi Admin</p>
                                                                    <p className="text-[9px] text-white/50 mt-0.5">just now</p>
                                                                </div>
                                                            </div>
                                                            <div className="p-4.5 text-[12.5px] text-white/80 whitespace-pre-wrap break-words leading-relaxed">
                                                                {messageText || <span className="text-white/30 italic">Message preview will appear here...</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── MANAGE ── */}
                            {activeTab === 'management' && (
                                <motion.div key="management" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }} className="space-y-4">
                                    <div className="flex items-center justify-between p-5 rounded-[1.5rem] border border-white/[0.12] bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                        <div>
                                            <p className="text-[14px] font-bold text-white shadow-black/20 drop-shadow-md">Featured Creator</p>
                                            <p className="text-[11px] text-white/50 mt-1">Showcase on the public discovery page</p>
                                        </div>
                                        <button type="button" onClick={handleToggleFeatured}
                                            className={cn("relative w-12 h-6.5 rounded-full transition-all cursor-pointer shrink-0 shadow-inner", isFeatured ? "bg-neon-green shadow-[0_0_15px_rgba(57,255,20,0.3)]" : "bg-white/[0.1] border border-white/[0.05]")}>
                                            <div className={cn("absolute top-0.5 w-5.5 h-5.5 rounded-full bg-white shadow-md transition-all duration-300", isFeatured ? "left-[calc(100%-1.5rem)]" : "left-0.5")} />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Auto Badges */}
                                        <div className="p-5 rounded-[1.5rem] border border-white/[0.12] bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden">
                                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                            <div className="mb-5">
                                                <p className="text-[14px] font-bold text-white shadow-black/20 drop-shadow-md">Performance Badges</p>
                                                <p className="text-[11px] text-white/50 mt-1">Automatically assigned based on creator metrics and platform milestones.</p>
                                            </div>
                                            {autoBadges.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {autoBadges.map(b => (
                                                        <BadgeCard key={b.id} badge={b} auto />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-10 text-center border-2 border-dashed border-white/[0.1] rounded-[1.25rem] bg-white/[0.02] backdrop-blur-sm">
                                                    <p className="text-sm font-bold text-white/40">No milestones reached yet</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Custom Admin Badges */}
                                        <div className="p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                                <div>
                                                    <p className="text-[13px] font-semibold text-gray-800 dark:text-zinc-100">Admin Badges</p>
                                                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Assign rich achievement badges to stand out on the platform.</p>
                                                </div>
                                                <div className="relative shrink-0">
                                                    <button type="button" onClick={() => setShowBadgePicker(!showBadgePicker)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-gray-700 dark:text-zinc-300 font-bold text-[11px] transition-colors cursor-pointer">
                                                        <Plus size={12}/> Assign Badge
                                                    </button>
                                                    
                                                    {/* Badge Picker Dropdown */}
                                                    <AnimatePresence>
                                                        {showBadgePicker && (
                                                            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                                                className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-white dark:bg-[#1a1d24] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-xl z-50 p-2 custom-scrollbar">
                                                                {unselectedBadges.length === 0 ? (
                                                                    <div className="p-4 text-center text-xs text-gray-400">All badges assigned!</div>
                                                                ) : (
                                                                    unselectedBadges.map(b => (
                                                                        <button key={b.id} type="button" onClick={() => handleAddBadge(b.id)}
                                                                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-left transition-colors cursor-pointer group">
                                                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-gradient-to-br shadow-inner", b.gradient)}>{b.emoji}</div>
                                                                            <div>
                                                                                <p className="text-[11px] font-bold text-gray-900 dark:text-white">{b.label}</p>
                                                                                <p className="text-[9px] text-gray-500 uppercase tracking-wider">{b.category}</p>
                                                                            </div>
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            {customActiveBadges.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {customActiveBadges.map(b => (
                                                        <BadgeCard key={b.id} badge={b} onRemove={() => handleRemoveBadge(b.id)} />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-8 text-center border-2 border-dashed border-black/5 dark:border-white/5 rounded-xl">
                                                    <p className="text-sm font-bold text-gray-500 dark:text-zinc-500">No custom badges assigned</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </SharedLayoutModal>

            {isEditOpen && (
                <EditCreatorModal
                    isOpen={true}
                    creator={creatorData}
                    initialSection={editSection}
                    onClose={() => setIsEditOpen(false)}
                    onUpdated={(updated) => {
                        setCreatorData(prev => ({ ...prev, ...updated }));
                        updateCreator(creatorData.id || creatorData.uid, updated);
                    }}
                />
            )}
        </>
    );
};

export default CreatorDetailModal;
