import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X, Check, Loader2, Instagram, Youtube, Linkedin, Twitter,
    Phone, Mail, ArrowUpRight, MessageCircle, Pencil, Star, Copy, Trash2, Send,
    ShieldCheck, Clock, Ban, Bell, Plus,
    MapPin, Users, MoreHorizontal, Eye, AlertTriangle, RotateCcw
} from 'lucide-react';
import RichEditor from './RichEditor';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { extractSocialUsername, buildSocialUrl } from '../../lib/socialUtils';
import { resolveCityWhatsAppGroup } from '../../lib/email';
import { sendTemplateEmail } from '../../lib/mailApi';
import { previewEmailHtml } from '../../lib/emailTemplates';
import { copyToClipboard } from '../../lib/clipboard';
import { creatorHasCollegeNiche } from '../../lib/constants';
import EmailPreviewIframe from '../ui/EmailPreviewIframe';
import EditCreatorModal from '../creator/EditCreatorModal';
import Sheet from './Sheet';
import { Button, Badge, SegmentedTabs, Menu, MenuItem } from './ui';

// ─── Badges ─────────────────────────────────────────────────────────────────
const AVAILABLE_BADGES = [
    { id: 'viral_catalyst', category: 'Performance', label: 'Viral Catalyst', emoji: '🚀', gradient: 'from-fuchsia-500 to-purple-600' },
    { id: 'high_converter', category: 'Performance', label: 'High Converter', emoji: '💸', gradient: 'from-emerald-400 to-emerald-600' },
    { id: 'top_1_percent', category: 'Performance', label: 'Top 1% Creator', emoji: '👑', gradient: 'from-amber-400 to-orange-500' },
    { id: 'ugc_master', category: 'Niche Expert', label: 'UGC Master', emoji: '📱', gradient: 'from-blue-400 to-indigo-500' },
    { id: 'luxury_specialist', category: 'Niche Expert', label: 'Luxury Specialist', emoji: '✨', gradient: 'from-zinc-500 to-zinc-700' },
    { id: 'beauty_guru', category: 'Niche Expert', label: 'Beauty Guru', emoji: '💄', gradient: 'from-pink-400 to-rose-500' },
    { id: 'always_on_time', category: 'Reliability', label: 'Always on Time', emoji: '⏱️', gradient: 'from-sky-400 to-cyan-500' },
    { id: 'client_favorite', category: 'Reliability', label: 'Client Favorite', emoji: '❤️', gradient: 'from-rose-400 to-red-500' },
    { id: 'zero_revisions', category: 'Reliability', label: 'Zero Revisions', emoji: '🎯', gradient: 'from-teal-400 to-emerald-500' },
];

const fmt = (n) => {
    const v = Number(n);
    if (!v || v <= 0) return null;
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
    return String(v);
};

const formatDay = (v) => {
    const d = v ? new Date(v?.seconds ? v.seconds * 1000 : v) : null;
    return d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};

// ─── Small pieces ───────────────────────────────────────────────────────────
const Section = ({ title, action, children, className }) => (
    <section className={cn('rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]', className)}>
        {(title || action) && (
            <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5">
                <h3 className="text-[13px] font-bold">{title}</h3>
                {action}
            </div>
        )}
        <div className="px-4 pb-4 pt-2">{children}</div>
    </section>
);

const EditLink = ({ onClick }) => (
    <button type="button" onClick={onClick} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-bold text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white">
        <Pencil size={12} /> Edit
    </button>
);

const InfoRow = ({ icon: Icon, label, value, onCopy, href, children }) => (
    <div className="flex min-h-[48px] items-center gap-3 border-b border-black/[0.05] py-2 last:border-0 dark:border-white/[0.05]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-gray-500 dark:bg-white/[0.05] dark:text-zinc-400"><Icon size={15} /></span>
        <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-gray-500">{label}</p>
            {children || (href
                ? <a href={href} className="block truncate text-[14px] font-semibold hover:underline">{value}</a>
                : <p className="truncate text-[14px] font-semibold">{value}</p>)}
        </div>
        {onCopy && (
            <button type="button" onClick={onCopy} aria-label={`Copy ${label}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white">
                <Copy size={14} />
            </button>
        )}
    </div>
);

const BadgeTile = ({ badge, caption, onRemove }) => (
    <div className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-2.5 dark:border-white/[0.08]">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-lg', badge.gradient)}>{badge.emoji}</span>
        <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold">{badge.label}</p>
            <p className="text-[11px] text-gray-500">{caption}</p>
        </div>
        {onRemove && (
            <button type="button" onClick={onRemove} aria-label={`Remove ${badge.label}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-500">
                <X size={14} />
            </button>
        )}
    </div>
);

// ─── Main ───────────────────────────────────────────────────────────────────
const CreatorDetailModal = ({ creator, onClose, onUpdateStatus, onDelete, isUpdating, isDeleting }) => {
    const { updateCreator, addNotification } = useStore();
    const addToast = useStore(s => s.addToast);

    const [creatorData, setCreatorData] = useState(creator);
    const [activeTab, setActiveTab] = useState('profile');
    const [isFeatured, setIsFeatured] = useState(creator?.isFeatured || false);
    const [adminBadges, setAdminBadges] = useState(creator?.adminBadges || []);

    const [commMode, setCommMode] = useState('email');
    const [emailSubject, setEmailSubject] = useState('Partnership update from Newbi Entertainment');
    const [emailBody, setEmailBody] = useState('');
    const [messageText, setMessageText] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editSection, setEditSection] = useState('identity');
    const [avatarError, setAvatarError] = useState(false);

    // Instagram follower check: idle → awaiting (profile opened) → prompt → editing
    const [verifyState, setVerifyState] = useState('idle');
    const [followersInput, setFollowersInput] = useState('');
    const [savingFollowers, setSavingFollowers] = useState(false);
    const openedInstagramRef = useRef(false);

    const creatorId = creatorData?.id || creatorData?.uid;

    useEffect(() => {
        setIsFeatured(creator?.isFeatured || false);
        setAdminBadges(creator?.adminBadges || []);
        setCreatorData(creator);
    }, [creator]);

    useEffect(() => { setVerifyState('idle'); setAvatarError(false); setActiveTab('profile'); }, [creator?.id, creator?.uid]);

    // When the admin comes back from the Instagram tab, ask whether the count was right.
    useEffect(() => {
        const onReturn = () => {
            if (openedInstagramRef.current && document.visibilityState === 'visible') {
                openedInstagramRef.current = false;
                setVerifyState('prompt');
            }
        };
        window.addEventListener('focus', onReturn);
        document.addEventListener('visibilitychange', onReturn);
        return () => {
            window.removeEventListener('focus', onReturn);
            document.removeEventListener('visibilitychange', onReturn);
        };
    }, []);

    const openEdit = (section) => { setEditSection(section); setIsEditOpen(true); };
    const copy = async (text, label) => {
        if (!text) return;
        const ok = await copyToClipboard(String(text));
        addToast(ok ? `${label} copied.` : "Couldn't copy that. Try again.", ok ? 'success' : 'error');
    };

    const saveCreator = async (updates, message, rollback) => {
        try {
            await updateCreator(creatorId, updates);
            setCreatorData(prev => ({ ...prev, ...updates }));
            if (message) addToast(message, 'success');
            return true;
        } catch (err) {
            console.error(err);
            rollback?.();
            addToast('Check your connection and try again.', 'error', {
                title: 'Change not saved',
                action: { label: 'Try again', onClick: () => saveCreator(updates, message, rollback) },
            });
            return false;
        }
    };

    const openInstagram = () => {
        const url = buildSocialUrl(creatorData.instagram, 'instagram');
        if (!url) { addToast("This creator hasn't added an Instagram handle.", 'warning'); return; }
        window.open(url, '_blank', 'noopener,noreferrer');
        openedInstagramRef.current = true;
        setVerifyState('awaiting');
    };

    const confirmFollowers = async (count) => {
        setSavingFollowers(true);
        const updates = {
            ...(count !== undefined ? { instagramFollowers: String(count) } : {}),
            isInstagramVerified: true,
            requiresManualVerification: false,
            manualFollowerEntry: false,
            instagramFollowersVerifiedAt: new Date().toISOString(),
        };
        const ok = await saveCreator(updates, `Followers verified (${Number(count ?? creatorData.instagramFollowers).toLocaleString('en-IN')}).`);
        if (ok) setVerifyState('idle');
        setSavingFollowers(false);
    };

    const toggleFeatured = () => {
        const next = !isFeatured;
        setIsFeatured(next);
        saveCreator({ isFeatured: next }, next ? 'Creator is now featured.' : 'Creator is no longer featured.', () => setIsFeatured(!next));
    };
    const addBadge = (id) => {
        if (adminBadges.includes(id)) return;
        const next = [...adminBadges, id];
        const prev = adminBadges;
        setAdminBadges(next);
        saveCreator({ adminBadges: next }, 'Badge added.', () => setAdminBadges(prev));
    };
    const removeBadge = (id) => {
        const next = adminBadges.filter(b => b !== id);
        const prev = adminBadges;
        setAdminBadges(next);
        saveCreator({ adminBadges: next }, 'Badge removed.', () => setAdminBadges(prev));
    };

    const setStatus = (status) => {
        if (status === 'blocked' && !window.confirm(`Block ${creatorData.name}? They won't be able to join campaigns until unblocked.`)) return;
        if (status === 'rejected' && !window.confirm(`Reject ${creatorData.name}'s application?`)) return;
        onUpdateStatus?.(creatorId, status);
    };

    const livePreviewHtml = useMemo(() => previewEmailHtml('creator-message', {
        name: creatorData?.name || 'Creator',
        subject: emailSubject || 'No subject',
        messageHtml: emailBody.trim() ? emailBody : '<p style="color:#999">Your message will appear here…</p>',
    }), [emailSubject, emailBody, creatorData?.name]);

    const sendEmail = async (e) => {
        e.preventDefault();
        if (!creatorData.email) { addToast('Add an email address to their profile first.', 'warning', { title: 'No email address' }); return; }
        if (!emailSubject.trim() || !emailBody.replace(/<[^>]*>/g, '').trim()) { addToast('Add a subject and a message first.', 'warning'); return; }
        setSendingEmail(true);
        try {
            await sendTemplateEmail({ template: 'creator-message', to: creatorData.email, data: { name: creatorData.name || 'Creator', subject: emailSubject.trim(), messageHtml: emailBody } });
            addToast(`Email sent to ${creatorData.name}.`, 'success');
            setEmailBody('');
        } catch {
            addToast('Check your connection and try again.', 'error', {
                title: "Couldn't send the email",
                action: { label: 'Try again', onClick: () => sendEmail({ preventDefault: () => {} }) },
            });
        } finally {
            setSendingEmail(false);
        }
    };

    const sendNotification = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;
        setSendingMsg(true);
        try {
            await addNotification({ userId: creatorData.uid || creatorData.id, title: 'Message from the Newbi team', message: messageText.trim(), type: 'admin_message', createdAt: new Date().toISOString(), read: false });
            addToast('Message sent to their app inbox.', 'success');
            setMessageText('');
        } catch {
            addToast('Check your connection and try again.', 'error', {
                title: "Couldn't send the message",
                action: { label: 'Try again', onClick: () => sendNotification({ preventDefault: () => {} }) },
            });
        } finally {
            setSendingMsg(false);
        }
    };

    if (!creatorData) return null;

    // ── derived ──
    const maxFollowers = Math.max(Number(creatorData.instagramFollowers || 0), Number(creatorData.youtubeSubscribers || 0), Number(creatorData.linkedinFollowers || 0));
    const idTag = creatorData.creatorId || String(creatorId || '').slice(0, 8).toUpperCase();
    const cityGroup = resolveCityWhatsAppGroup(creatorData.city);
    const cleanPhone = (creatorData.phone || '').replace(/\D/g, '');
    const whatsAppUrl = cleanPhone ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}` : null;
    const status = creatorData.profileStatus || 'pending';
    const isApproved = status === 'approved';
    const isPending = status === 'pending';
    const avatar = creatorData.profilePicture || creatorData.instagramProfilePic || creatorData.profilePic || creatorData.photoURL;
    const fullyVerified = creatorData.isPhoneVerified && creatorData.isInstagramVerified;
    const niches = creatorData.specializations || creatorData.niches || [];
    const campaigns = (creatorData.joinedCampaigns || []).length;
    // College is only relevant for student creators and college pages.
    const isCollegeCreator = creatorHasCollegeNiche(creatorData);

    const autoBadges = [];
    if (maxFollowers >= 1000000) autoBadges.push({ id: 'mega', label: 'Mega creator', emoji: '🌟', gradient: 'from-fuchsia-500 to-purple-600' });
    else if (maxFollowers >= 100000) autoBadges.push({ id: 'macro', label: 'Macro creator', emoji: '👑', gradient: 'from-amber-400 to-orange-500' });
    else if (maxFollowers >= 10000) autoBadges.push({ id: 'micro', label: 'Micro creator', emoji: '⭐', gradient: 'from-blue-400 to-indigo-500' });
    else if (maxFollowers >= 1000) autoBadges.push({ id: 'nano', label: 'Nano creator', emoji: '🌱', gradient: 'from-emerald-400 to-emerald-600' });
    if (fullyVerified) autoBadges.push({ id: 'verified', label: 'Fully verified', emoji: '✅', gradient: 'from-cyan-400 to-blue-500' });
    if (campaigns >= 10) autoBadges.push({ id: 'veteran', label: 'Campaign veteran', emoji: '🔥', gradient: 'from-rose-400 to-red-500' });
    else if (campaigns >= 3) autoBadges.push({ id: 'active', label: 'Active collaborator', emoji: '⚡', gradient: 'from-purple-400 to-pink-500' });
    const assignedBadges = adminBadges.map(id => AVAILABLE_BADGES.find(b => b.id === id)).filter(Boolean);
    const unassignedBadges = AVAILABLE_BADGES.filter(b => !adminBadges.includes(b.id));

    const platforms = [
        creatorData.instagram && { key: 'ig', icon: Instagram, name: 'Instagram', handle: `@${extractSocialUsername(creatorData.instagram, 'instagram')}`, count: creatorData.instagramFollowers, url: buildSocialUrl(creatorData.instagram, 'instagram'), tint: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white' },
        creatorData.youtube && { key: 'yt', icon: Youtube, name: 'YouTube', handle: `@${extractSocialUsername(creatorData.youtube, 'youtube')}`, count: creatorData.youtubeSubscribers, url: buildSocialUrl(creatorData.youtube, 'youtube'), tint: 'bg-[#FF0000] text-white' },
        creatorData.linkedin && { key: 'li', icon: Linkedin, name: 'LinkedIn', handle: extractSocialUsername(creatorData.linkedin, 'linkedin'), count: creatorData.linkedinFollowers, url: buildSocialUrl(creatorData.linkedin, 'linkedin'), tint: 'bg-[#0A66C2] text-white' },
        creatorData.twitter && { key: 'x', icon: Twitter, name: 'X', handle: `@${extractSocialUsername(creatorData.twitter, 'twitter')}`, count: null, url: buildSocialUrl(creatorData.twitter, 'twitter'), tint: 'bg-black text-white dark:bg-white dark:text-black' },
    ].filter(Boolean);

    const statusBadge = isApproved
        ? <Badge tone="green"><ShieldCheck size={10} /> Verified</Badge>
        : isPending ? <Badge tone="amber"><Clock size={10} /> Pending</Badge>
            : <Badge tone="red"><Ban size={10} /> {status === 'blocked' ? 'Blocked' : 'Rejected'}</Badge>;

    const quickLink = 'flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 text-gray-600 transition-colors hover:border-black/20 hover:text-gray-900 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white';

    // ── header ──
    const header = (
        <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
                <div className="h-16 w-16 overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5">
                    {avatar && !avatarError
                        ? <img src={avatar} alt="" referrerPolicy="no-referrer" onError={() => setAvatarError(true)} className="h-full w-full object-cover" />
                        : <span className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-emerald-700 dark:text-neon-green">{(creatorData.name || 'C').charAt(0)}</span>}
                </div>
                {fullyVerified && <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-neon-green text-black dark:border-[#0d0f15]"><Check size={12} strokeWidth={3} /></span>}
            </div>
            <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-extrabold leading-tight tracking-tight">{creatorData.name || 'Unnamed creator'}</h2>
                <p className="truncate text-[13px] text-gray-500">{[isCollegeCreator ? creatorData.collegeName : null, creatorData.city, creatorData.primaryNiche || niches[0]].filter(Boolean).join(' · ') || 'Creator'} · #{idTag}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {statusBadge}
                    {isFeatured && <Badge tone="violet"><Star size={10} className="fill-current" /> Featured</Badge>}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Sheet open onClose={onClose} header={header} size="xl">
                <div className="space-y-5">
                    {/* Stats + quick contact */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-1 gap-2">
                            <div className="min-w-0 flex-1 rounded-xl bg-black/[0.03] px-3 py-2 dark:bg-white/[0.04]">
                                <p className="text-[17px] font-extrabold tabular-nums leading-tight">{fmt(maxFollowers) || '—'}</p>
                                <p className="text-[11px] text-gray-500">followers</p>
                            </div>
                            <div className="min-w-0 flex-1 rounded-xl bg-black/[0.03] px-3 py-2 dark:bg-white/[0.04]">
                                <p className="text-[17px] font-extrabold tabular-nums leading-tight">{campaigns}</p>
                                <p className="text-[11px] text-gray-500">campaigns</p>
                            </div>
                            <div className="min-w-0 flex-1 rounded-xl bg-black/[0.03] px-3 py-2 dark:bg-white/[0.04]">
                                <p className="text-[17px] font-extrabold tabular-nums leading-tight text-emerald-700 dark:text-neon-green">{Number(creatorData.points ?? 0).toLocaleString('en-IN')}</p>
                                <p className="text-[11px] text-gray-500">points</p>
                            </div>
                        </div>
                        <div className="flex gap-1.5">
                            {whatsAppUrl && <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp" className={quickLink}><MessageCircle size={17} /></a>}
                            {cleanPhone && <a href={`tel:${creatorData.phone}`} aria-label="Call" title={creatorData.phone} className={quickLink}><Phone size={16} /></a>}
                            {creatorData.email && <a href={`mailto:${creatorData.email}`} aria-label="Email" title={creatorData.email} className={quickLink}><Mail size={16} /></a>}
                            <Menu trigger={({ toggle }) => (
                                <button type="button" onClick={toggle} aria-label="More actions" className={quickLink}><MoreHorizontal size={17} /></button>
                            )}>
                                <MenuItem icon={Pencil} onClick={() => openEdit('identity')}>Edit profile</MenuItem>
                                {creatorData.instagram && <MenuItem as="a" href={buildSocialUrl(creatorData.instagram, 'instagram')} target="_blank" rel="noopener noreferrer" icon={Instagram}>Open Instagram</MenuItem>}
                                <MenuItem icon={Copy} onClick={() => copy(idTag, 'Creator ID')}>Copy creator ID</MenuItem>
                                {status !== 'blocked'
                                    ? <MenuItem icon={Ban} danger onClick={() => setStatus('blocked')}>Block creator</MenuItem>
                                    : <MenuItem icon={RotateCcw} onClick={() => setStatus('approved')}>Unblock and verify</MenuItem>}
                                <MenuItem icon={Trash2} danger onClick={() => onDelete?.(creatorId)} hint="Permanently removes the profile">Delete creator</MenuItem>
                            </Menu>
                        </div>
                    </div>

                    {/* Review banner */}
                    {!isApproved && (
                        <div className={cn('flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center',
                            isPending ? 'border-amber-500/25 bg-amber-500/[0.06]' : 'border-red-500/25 bg-red-500/[0.05]')}>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold">{isPending ? 'Waiting for your review' : status === 'blocked' ? 'This creator is blocked' : 'Application rejected'}</p>
                                <p className="text-[12px] text-gray-600 dark:text-zinc-400">
                                    {isPending ? 'Check their profile and followers, then verify them so they can join campaigns.' : 'They cannot join campaigns.'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="success" onClick={() => setStatus('approved')} disabled={isUpdating} className="flex-1 sm:flex-none">
                                    {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Verify
                                </Button>
                                {isPending && <Button variant="secondary" onClick={() => setStatus('rejected')} disabled={isUpdating} className="flex-1 sm:flex-none"><X size={14} /> Reject</Button>}
                            </div>
                        </div>
                    )}

                    <SegmentedTabs value={activeTab} onChange={setActiveTab} items={[
                        { value: 'profile', label: 'Profile' },
                        { value: 'message', label: 'Message' },
                        { value: 'manage', label: 'Manage' },
                    ]} />

                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            {creatorData.instagramFollowers && !creatorData.isInstagramVerified && (
                                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
                                    {verifyState === 'idle' && (
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                            <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                                <p className="text-[13px]"><span className="font-bold">Followers not checked.</span> They say {Number(creatorData.instagramFollowers).toLocaleString('en-IN')} on Instagram.</p>
                                            </div>
                                            {creatorData.instagram && <Button variant="secondary" onClick={openInstagram}>Check on Instagram <ArrowUpRight size={13} /></Button>}
                                        </div>
                                    )}
                                    {verifyState === 'awaiting' && (
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                            <p className="min-w-0 flex-1 text-[13px]">Instagram opened in a new tab. Check the follower count on @{extractSocialUsername(creatorData.instagram, 'instagram')}, then come back.</p>
                                            <div className="flex gap-2">
                                                <Button variant="primary" onClick={() => setVerifyState('prompt')}><Check size={14} /> I've checked</Button>
                                                <Button variant="ghost" onClick={() => setVerifyState('idle')}>Cancel</Button>
                                            </div>
                                        </div>
                                    )}
                                    {verifyState === 'prompt' && (
                                        <div className="space-y-3">
                                            <p className="text-[13px]">Is <span className="font-bold">{Number(creatorData.instagramFollowers).toLocaleString('en-IN')}</span> followers correct for @{extractSocialUsername(creatorData.instagram, 'instagram')}?</p>
                                            <div className="flex flex-wrap gap-2">
                                                <Button variant="success" onClick={() => confirmFollowers()} disabled={savingFollowers}>{savingFollowers ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Yes, mark verified</Button>
                                                <Button variant="secondary" onClick={() => { setFollowersInput(String(creatorData.instagramFollowers || '')); setVerifyState('editing'); }}><Pencil size={13} /> No, enter real count</Button>
                                                <Button variant="ghost" onClick={openInstagram}><ArrowUpRight size={13} /> Reopen</Button>
                                            </div>
                                        </div>
                                    )}
                                    {verifyState === 'editing' && (
                                        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); if (followersInput) confirmFollowers(Number(followersInput)); }}>
                                            <label className="block min-w-0 flex-1">
                                                <span className="mb-1 block text-[12px] font-bold text-gray-500">Actual followers</span>
                                                <input value={followersInput} onChange={(e) => setFollowersInput(e.target.value.replace(/\D/g, ''))} inputMode="numeric" autoFocus placeholder="e.g. 27300"
                                                    className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-[15px] font-semibold outline-none focus:border-amber-500 dark:border-white/10 dark:bg-white/[0.04]" />
                                                {followersInput && <span className="mt-1 block text-[12px] text-gray-500">{Number(followersInput).toLocaleString('en-IN')}</span>}
                                            </label>
                                            <div className="flex gap-2">
                                                <Button type="submit" variant="success" disabled={savingFollowers || !followersInput}>{savingFollowers ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save & verify</Button>
                                                <Button variant="ghost" onClick={() => setVerifyState('prompt')}>Back</Button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                            <Section title="Platforms" action={<EditLink onClick={() => openEdit('socials')} />}>
                                {platforms.length ? (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {platforms.map(p => {
                                            const Icon = p.icon;
                                            return (
                                                <a key={p.key} href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-3 transition-colors hover:border-black/15 dark:border-white/[0.08] dark:hover:border-white/20">
                                                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', p.tint)}><Icon size={17} /></span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-[11px] font-bold text-gray-500">{p.name}</span>
                                                        <span className="block truncate text-[14px] font-semibold">{p.handle}</span>
                                                    </span>
                                                    {fmt(p.count)
                                                        ? <span className="shrink-0 text-right"><span className="block text-[15px] font-extrabold tabular-nums">{fmt(p.count)}</span><span className="block text-[11px] text-gray-500">{p.key === 'ig' && creatorData.isInstagramVerified ? 'verified' : 'followers'}</span></span>
                                                        : <ArrowUpRight size={15} className="shrink-0 text-gray-400" />}
                                                </a>
                                            );
                                        })}
                                    </div>
                                ) : <p className="text-[13px] text-gray-500">No social accounts added yet.</p>}
                            </Section>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Section title="Contact" action={<EditLink onClick={() => openEdit('identity')} />}>
                                    {creatorData.email && <InfoRow icon={Mail} label="Email" value={creatorData.email} href={`mailto:${creatorData.email}`} onCopy={() => copy(creatorData.email, 'Email')} />}
                                    {creatorData.phone && <InfoRow icon={Phone} label={creatorData.isPhoneVerified ? 'Phone · verified' : 'Phone'} value={creatorData.phone} href={`tel:${creatorData.phone}`} onCopy={() => copy(creatorData.phone, 'Phone')} />}
                                    {creatorData.city && <InfoRow icon={MapPin} label="City" value={creatorData.city} />}
                                    {isCollegeCreator && (
                                        <InfoRow icon={GraduationCap} label="College">
                                            {creatorData.collegeName
                                                ? <p className="truncate text-[14px] font-semibold">{creatorData.collegeName}</p>
                                                : <button type="button" onClick={() => openEdit('niche')} className="text-[14px] font-semibold text-amber-600 hover:underline dark:text-amber-400">Not added — add college</button>}
                                        </InfoRow>
                                    )}
                                    {cityGroup?.title && <InfoRow icon={Users} label="City WhatsApp group" value={cityGroup.title} />}
                                </Section>

                                <Section title="Content & rates" action={<EditLink onClick={() => openEdit('rates')} />}>
                                    <dl className="grid grid-cols-2 gap-3 text-[13px]">
                                        <div className="col-span-2 rounded-xl bg-neon-green/[0.07] p-3">
                                            <dt className="text-[11px] font-bold text-gray-500">Rate</dt>
                                            <dd className="font-bold text-emerald-700 dark:text-neon-green">{creatorData.commercials || 'Not set'}</dd>
                                        </div>
                                        <div><dt className="text-[11px] font-bold text-gray-500">Niche</dt><dd className="font-semibold">{creatorData.primaryNiche || creatorData.niche || niches[0] || '—'}</dd></div>
                                        <div><dt className="text-[11px] font-bold text-gray-500">Works for</dt><dd className="font-semibold">{creatorData.doBarter === 'paid' ? 'Paid only' : creatorData.doBarter === 'barter' ? 'Barter only' : 'Paid or barter'}</dd></div>
                                    </dl>
                                    {niches.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {niches.map((n, i) => <span key={i} className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-[12px] font-semibold dark:bg-white/[0.06]">{n}</span>)}
                                        </div>
                                    )}
                                    {(creatorData.languages || []).length > 0 && (
                                        <p className="mt-3 text-[12px] text-gray-500">Speaks {creatorData.languages.join(', ')}</p>
                                    )}
                                </Section>
                            </div>

                            <Section title="Record">
                                <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                                    <div><dt className="text-[11px] font-bold text-gray-500">Creator ID</dt><dd><button type="button" onClick={() => copy(idTag, 'Creator ID')} className="inline-flex items-center gap-1 font-mono font-bold">#{idTag} <Copy size={11} className="text-gray-400" /></button></dd></div>
                                    <div><dt className="text-[11px] font-bold text-gray-500">Joined</dt><dd className="font-semibold">{formatDay(creatorData.createdAt)}</dd></div>
                                    <div><dt className="text-[11px] font-bold text-gray-500">Phone</dt><dd className="font-semibold">{creatorData.isPhoneVerified ? 'Verified' : 'Not verified'}</dd></div>
                                    <div><dt className="text-[11px] font-bold text-gray-500">Instagram</dt><dd className="font-semibold">{creatorData.isInstagramVerified ? 'Verified' : 'Not verified'}</dd></div>
                                </dl>
                            </Section>
                        </div>
                    )}

                    {activeTab === 'message' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <SegmentedTabs value={commMode} onChange={setCommMode} items={[
                                    { value: 'email', label: 'Email' },
                                    { value: 'notify', label: 'App notification' },
                                ]} />
                                {commMode === 'email' && (
                                    <Button variant="ghost" size="sm" onClick={() => setShowPreview(v => !v)}><Eye size={13} /> {showPreview ? 'Hide preview' : 'Preview'}</Button>
                                )}
                            </div>

                            {commMode === 'email' ? (
                                <form onSubmit={sendEmail} className="space-y-3">
                                    <div className="flex items-center gap-2 rounded-xl bg-black/[0.03] px-3 py-2.5 text-[13px] dark:bg-white/[0.04]">
                                        <span className="font-bold text-gray-500">To</span>
                                        <span className="truncate font-semibold">{creatorData.name}</span>
                                        <span className="truncate text-gray-500">{creatorData.email || 'no email address'}</span>
                                    </div>
                                    <label className="block">
                                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Subject</span>
                                        <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                                            className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-[15px] font-semibold outline-none focus:border-neon-green/60 dark:border-white/10 dark:bg-white/[0.04]" />
                                    </label>
                                    <RichEditor value={emailBody} onChange={setEmailBody} placeholder="Write your message…" />
                                    {showPreview && (
                                        <div className="h-[420px] overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                                            <EmailPreviewIframe html={livePreviewHtml} />
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[12px] text-gray-500">Sent in the Newbi email template.</p>
                                        <Button type="submit" variant="primary" disabled={sendingEmail || !creatorData.email}>
                                            {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {sendingEmail ? 'Sending…' : 'Send email'}
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={sendNotification} className="space-y-3">
                                    <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={5} maxLength={500}
                                        placeholder={`Message for ${creatorData.name}'s app inbox`}
                                        className="w-full resize-none rounded-xl border border-black/10 bg-white p-3 text-[15px] outline-none focus:border-neon-green/60 dark:border-white/10 dark:bg-white/[0.04]" />
                                    <div className="rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                                        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-gray-500"><Bell size={11} /> How it appears</p>
                                        <p className="text-[13px] font-bold">Message from the Newbi team</p>
                                        <p className="whitespace-pre-wrap text-[13px] text-gray-600 dark:text-zinc-400">{messageText || 'Your message…'}</p>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[12px] text-gray-500">{messageText.length}/500</p>
                                        <Button type="submit" variant="primary" disabled={sendingMsg || !messageText.trim()}>
                                            {sendingMsg ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {sendingMsg ? 'Sending…' : 'Send'}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {activeTab === 'manage' && (
                        <div className="space-y-4">
                            <Section>
                                <button type="button" role="switch" aria-checked={isFeatured} onClick={toggleFeatured} className="flex w-full items-center justify-between gap-4 text-left">
                                    <span>
                                        <span className="block text-[14px] font-bold">Featured creator</span>
                                        <span className="block text-[12px] text-gray-500">Shown on the public creators page</span>
                                    </span>
                                    <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', isFeatured ? 'bg-neon-green' : 'bg-black/15 dark:bg-white/15')}>
                                        <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left]', isFeatured ? 'left-[22px]' : 'left-0.5')} />
                                    </span>
                                </button>
                            </Section>

                            <Section title="Badges you've given" action={unassignedBadges.length > 0 && (
                                <Menu trigger={({ toggle }) => <Button size="sm" variant="secondary" onClick={toggle}><Plus size={13} /> Add badge</Button>}>
                                    {unassignedBadges.map(b => (
                                        <MenuItem key={b.id} onClick={() => addBadge(b.id)} hint={b.category}>{b.emoji} {b.label}</MenuItem>
                                    ))}
                                </Menu>
                            )}>
                                {assignedBadges.length
                                    ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{assignedBadges.map(b => <BadgeTile key={b.id} badge={b} caption={b.category} onRemove={() => removeBadge(b.id)} />)}</div>
                                    : <p className="text-[13px] text-gray-500">None yet. Badges appear on the creator's profile.</p>}
                            </Section>

                            <Section title="Earned automatically">
                                {autoBadges.length
                                    ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{autoBadges.map(b => <BadgeTile key={b.id} badge={b} caption="From followers, verification and campaigns" />)}</div>
                                    : <p className="text-[13px] text-gray-500">No milestones reached yet.</p>}
                            </Section>

                            <Section title="Account">
                                <div className="flex flex-wrap gap-2">
                                    {!isApproved && <Button variant="success" onClick={() => setStatus('approved')} disabled={isUpdating}><Check size={14} /> Verify</Button>}
                                    {isApproved && <Button variant="secondary" onClick={() => setStatus('pending')} disabled={isUpdating}><Clock size={14} /> Move back to pending</Button>}
                                    {status !== 'blocked' && <Button variant="secondary" onClick={() => setStatus('blocked')} disabled={isUpdating}><Ban size={14} /> Block</Button>}
                                    <Button variant="ghost" onClick={() => onDelete?.(creatorId)} disabled={isDeleting} className="text-red-500 hover:text-red-600">
                                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete profile
                                    </Button>
                                </div>
                            </Section>
                        </div>
                    )}
                </div>
            </Sheet>

            {isEditOpen && (
                <EditCreatorModal
                    isOpen
                    creator={creatorData}
                    initialSection={editSection}
                    onClose={() => setIsEditOpen(false)}
                    onUpdated={(updated) => {
                        setCreatorData(prev => ({ ...prev, ...updated }));
                        updateCreator(creatorId, updated);
                    }}
                />
            )}
        </>
    );
};

export default CreatorDetailModal;
