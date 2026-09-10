import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, User, Shield, Briefcase, Ticket, LogOut, ExternalLink, Settings, 
    Calendar, Zap, AlertCircle, ArrowRight, Key, RefreshCw, Mail, Check, 
    Edit2, Loader2, Info, Instagram, ShieldCheck, 
    LayoutDashboard, CreditCard, History, ChevronRight, ChevronLeft, Image as ImageIcon,
    Sparkles, Trash2, MapPin, Phone, CheckCircle2, Upload, Camera, Building, Award, Clock
} from 'lucide-react';
import { useStore } from '../lib/store';
import { cn, normalizePhoneNumber } from '../lib/utils';
import { PREDEFINED_CITIES, CREATOR_NICHES } from '../lib/constants';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { RecaptchaVerifier, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';

const ProfilePanel = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
    const { 
        user, logout, creators, addNotification, addToast,
        resetPassword, updateDisplayName, 
        ticketOrders, notifications, upcomingEvents, portfolio, guestlists,
        revokeSessions, deleteAccount, deleteCreator, updateCreator,
        isProfilePanelOpen, profilePanelTab, closeProfilePanel
    } = useStore();
    const navigate = useNavigate();
    
    const isOpen = Boolean(propIsOpen || isProfilePanelOpen);
    const onClose = () => {
        if (propOnClose) propOnClose();
        closeProfilePanel();
    };

    const tabsContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);

    const updateScrollMetrics = () => {
        const el = tabsContainerRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        const maxScroll = scrollWidth - clientWidth;
        setCanScrollLeft(scrollLeft > 6);
        setCanScrollRight(maxScroll > 6 && scrollLeft < maxScroll - 6);
        if (maxScroll > 0) {
            setScrollProgress(scrollLeft / maxScroll);
        } else {
            setScrollProgress(0);
        }
    };

    const [activeTab, setActiveTab] = useState(profilePanelTab || 'overview'); // 'overview', 'creator', 'tickets', 'settings', 'security'
    const [isUpdating, setIsUpdating] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
    const [newPhone, setNewPhone] = useState(user?.phoneNumber || '');
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [ticketSort, setTicketSort] = useState('booking'); // 'booking' or 'event'
    const [ticketFilter, setTicketFilter] = useState('upcoming'); // 'upcoming' or 'past'
    const [guestlistEntries, setGuestlistEntries] = useState([]);
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeleteCreatorConfirm, setShowDeleteCreatorConfirm] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (profilePanelTab) {
            setActiveTab(profilePanelTab);
        }
    }, [profilePanelTab]);

    useEffect(() => {
        if (!isOpen || !user?.uid) return;
        
        // On-demand subscriptions when profile panel is open
        const store = useStore.getState();
        const unsub1 = store.subscribeToTicketOrders ? store.subscribeToTicketOrders() : null;
        const unsub2 = store.subscribeToUpcomingEvents ? store.subscribeToUpcomingEvents() : null;
        const unsub3 = store.subscribeToPortfolio ? store.subscribeToPortfolio() : null;
        const unsub4 = store.subscribeToGuestlists ? store.subscribeToGuestlists() : null;
        
        setLoadingEntries(true);
        const fetchEntries = async () => {
            try {
                const { collectionGroup, query, where, getDocs } = await import('firebase/firestore');

                const qUser = query(
                    collectionGroup(db, 'entries'),
                    where('userId', '==', user.uid)
                );
                
                const cleanEmail = user.email ? user.email.trim().toLowerCase() : null;

                const qCustEmail = cleanEmail ? query(
                    collectionGroup(db, 'entries'),
                    where('customerEmail', '==', cleanEmail)
                ) : null;

                const qEmail = cleanEmail ? query(
                    collectionGroup(db, 'entries'),
                    where('email', '==', cleanEmail)
                ) : null;

                const [snapUser, snapCustEmail, snapEmail] = await Promise.all([
                    getDocs(qUser),
                    qCustEmail ? getDocs(qCustEmail) : Promise.resolve({ docs: [] }),
                    qEmail ? getDocs(qEmail) : Promise.resolve({ docs: [] })
                ]);

                const docsMap = {};
                
                const addDocs = (snap) => {
                    snap.docs.forEach(docSnap => {
                        const data = docSnap.data();
                        const guestlistId = docSnap.ref.parent.parent?.id || data.guestlistId || data.eventId;
                        if (guestlistId) {
                            docsMap[docSnap.id] = { 
                                id: docSnap.id, 
                                guestlistId, 
                                ...data 
                            };
                        }
                    });
                };

                addDocs(snapUser);
                addDocs(snapCustEmail);
                addDocs(snapEmail);

                const allEntries = Object.values(docsMap);
                setGuestlistEntries(allEntries);
            } catch (err) {
                console.error("Failed to fetch guestlist/RSVP entries for profile:", err);
            } finally {
                setLoadingEntries(false);
            }
        };
        fetchEntries();

        return () => {
            if (unsub1) unsub1();
            if (unsub2) unsub2();
            if (unsub3) unsub3();
            if (unsub4) unsub4();
        };
    }, [isOpen, user?.uid, user?.email]);

    const userPhoneNorm = user?.phoneNumber ? normalizePhoneNumber(user.phoneNumber) : null;
    const userEmailNorm = user?.email ? user.email.toLowerCase() : null;
    const creatorProfile = user ? creators?.find(c => 
        c.uid === user.uid || 
        (userEmailNorm && c.email && c.email.toLowerCase() === userEmailNorm) ||
        (userPhoneNorm && c.phone && normalizePhoneNumber(c.phone) === userPhoneNorm)
    ) : null;
    const isCreator = !!creatorProfile;
    const isApprovedCreator = creatorProfile?.profileStatus === 'approved';

    const allPossibleEvents = [...(upcomingEvents || []), ...(portfolio || [])];

    const mappedGuestlistTickets = guestlistEntries.map(entry => {
        const event = allPossibleEvents.find(e => e.id === entry.guestlistId);
        const guestlistDoc = guestlists?.find(g => g.id === entry.guestlistId);
        return {
            ...entry,
            isGuestlist: true,
            eventId: entry.guestlistId,
            eventTitle: event?.title || guestlistDoc?.title || entry.title || 'Guestlist Pass',
            eventDate: event?.date || guestlistDoc?.date || entry.date || null,
            status: entry.status || 'confirmed'
        };
    });

    const mappedTicketOrders = (ticketOrders?.filter(order => user && order.userId === user.uid) || [])
        .map(order => {
            const event = allPossibleEvents.find(e => e.id === order.eventId);
            return {
                ...order,
                isGuestlist: false,
                eventTitle: order.eventTitle || event?.title || 'Event Pass',
                eventDate: order.eventDate || event?.date || null
            };
        });

    const userTickets = [...mappedTicketOrders, ...mappedGuestlistTickets]
        .filter(ticket => {
            if (ticket.isGuestlist) return true;
            const title = (ticket.eventTitle || '').toLowerCase();
            return title.includes('jazba') || title.includes('terminal');
        })
        .filter(ticket => {
            if (!ticket.eventDate) return ticketFilter === 'upcoming';
            const eventDate = new Date(ticket.eventDate);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            if (ticketFilter === 'upcoming') {
                return eventDate >= now;
            } else {
                return eventDate < now;
            }
        })
        .sort((a, b) => {
            if (ticketSort === 'event') {
                const dateA = a.eventDate ? new Date(a.eventDate) : new Date(0);
                const dateB = b.eventDate ? new Date(b.eventDate) : new Date(0);
                return ticketFilter === 'upcoming' ? dateA - dateB : dateB - dateA;
            } else {
                const parseDate = (d) => {
                    if (!d) return new Date(0);
                    if (d.seconds) return new Date(d.seconds * 1000);
                    return new Date(d);
                };
                const dateA = parseDate(a.createdAt);
                const dateB = parseDate(b.createdAt);
                return dateB - dateA;
            }
        });

    // Universal navigation tabs - Creator Hub is present for all users
    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'creator', label: 'Creator', icon: Zap },
        { id: 'tickets', label: 'Tickets', icon: Ticket },
        { id: 'settings', label: 'Settings', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(updateScrollMetrics, 120);
        const el = tabsContainerRef.current;
        if (el) {
            el.addEventListener('scroll', updateScrollMetrics, { passive: true });
        }
        window.addEventListener('resize', updateScrollMetrics);
        return () => {
            clearTimeout(timer);
            if (el) el.removeEventListener('scroll', updateScrollMetrics);
            window.removeEventListener('resize', updateScrollMetrics);
        };
    }, [isOpen, activeTab]);

    const handleLogout = async () => {
        await logout();
        onClose();
        navigate('/');
    };

    const handleResetPassword = async () => {
        setIsUpdating(true);
        try {
            await resetPassword(user.email);
            addNotification({
                title: "Security Link Dispatched",
                content: "Check your inbox for password reset instructions.",
                type: 'message'
            });
        } catch (err) {
            addNotification({
                title: "Dispatch Failed",
                content: err.message || "Unable to send reset email.",
                type: 'default'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteCreatorProfile = async () => {
        if (!creatorProfile?.uid) return;
        setIsUpdating(true);
        try {
            await deleteCreator(creatorProfile.uid);
            addNotification({
                title: "Creator Profile Deactivated",
                content: "Your creator profile was deactivated. Your tickets and main account remain active.",
                type: 'message'
            });
            setShowDeleteCreatorConfirm(false);
            setActiveTab('overview');
        } catch (err) {
            console.error("Creator profile deletion failed:", err);
            addNotification({
                title: "Deactivation Failed",
                content: err.message || "Failed to deactivate creator profile.",
                type: 'default'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsUpdating(true);
        try {
            await deleteAccount();
            onClose();
            navigate('/');
        } catch (err) {
            console.error("Account deletion failed:", err);
        } finally {
            setIsUpdating(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSignOutAllDevices = async () => {
        if (window.confirm("Are you sure you want to sign out of all devices? This will end your session on all current devices, including this one.")) {
            setIsUpdating(true);
            try {
                await revokeSessions();
                addNotification({
                    title: "Sessions Revoked",
                    content: "Successfully signed out of all devices.",
                    type: 'message'
                });
                onClose();
                navigate('/');
            } catch (err) {
                addNotification({
                    title: "Revocation Failed",
                    content: err.message || "Unable to revoke sessions.",
                    type: 'default'
                });
            } finally {
                setIsUpdating(false);
            }
        }
    };

    const handleUpdateName = async () => {
        if (!newDisplayName.trim()) return;
        setIsUpdating(true);
        try {
            await updateDisplayName(newDisplayName);
            setIsEditingName(false);
            addNotification({
                title: "Identity Updated",
                content: "Your display name has been successfully updated.",
                type: 'message'
            });
        } catch (err) {
            addNotification({
                title: "Update Error",
                content: "Failed to sync identity changes.",
                type: 'default'
            });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleUpdatePhone = async () => {
        if (!newPhone.trim()) return;
        setIsUpdating(true);
        try {
            await useStore.getState().updateUserProfile(user.uid, { phoneNumber: newPhone });
            setIsEditingPhone(false);
            addNotification({
                title: "Security Uplinked",
                content: "Your phone number has been updated.",
                type: 'security'
            });
        } catch (err) {
            addNotification({
                title: "Uplink Error",
                content: "Failed to sync phone changes.",
                type: 'default'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const avatarInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');
    const avatarPic = creatorProfile?.profilePicture || user?.photoURL || null;

    if (!user) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] transition-colors"
                    />

                    {/* Drawer Panel */}
                    <motion.div
                        initial={isMobile ? { y: '100%' } : { x: '100%' }}
                        animate={isMobile ? { y: 0 } : { x: 0 }}
                        exit={isMobile ? { y: '100%' } : { x: '100%' }}
                        transition={{ type: "spring", damping: 28, stiffness: 260 }}
                        drag={isMobile ? "y" : false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, info) => {
                            if (isMobile && info.offset.y > 120) {
                                onClose();
                            }
                        }}
                        className="fixed bottom-0 left-0 w-full h-[94vh] md:h-full md:w-full md:max-w-2xl md:top-0 md:right-0 md:left-auto md:bottom-auto bg-white dark:bg-[#070707] text-gray-900 dark:text-white border-t md:border-t-0 md:border-l border-gray-200 dark:border-white/[0.08] z-[101] overflow-hidden flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.15)] dark:shadow-[-20px_0_60px_rgba(0,0,0,0.8)] rounded-t-[2.5rem] md:rounded-none transition-colors duration-300"
                    >
                        {/* Drag Handle for Mobile */}
                        {isMobile && (
                            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0 relative z-20">
                                <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-white/20" />
                            </div>
                        )}

                        {/* Ambient Glowing Background */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-green/5 dark:bg-neon-green/10 rounded-full blur-[140px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-blue/5 dark:bg-neon-blue/10 rounded-full blur-[140px] pointer-events-none" />

                        {/* Top Bar */}
                        <div className="px-6 py-4 flex items-center justify-between relative z-10 border-b border-gray-100 dark:border-white/5 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-neon-green shadow-[0_0_10px_#39ff14] animate-pulse" />
                                <h2 className="text-[11px] font-black text-gray-700 dark:text-zinc-400 uppercase tracking-[0.3em]">NEWBI PERSONAL HUB</h2>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center justify-center"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Profile Identity Card */}
                        <div className="px-6 md:px-8 py-5 relative z-10 border-b border-gray-100 dark:border-white/5 flex items-center gap-5 shrink-0 bg-gray-50/50 dark:bg-transparent">
                            <div className="relative group shrink-0">
                                <div className="absolute -inset-1 bg-gradient-to-r from-neon-green via-neon-blue to-neon-pink rounded-2xl blur-sm opacity-40 group-hover:opacity-70 transition duration-500" />
                                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/15 flex items-center justify-center overflow-hidden shadow-md">
                                    {avatarPic ? (
                                        <img src={avatarPic} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white italic uppercase select-none">
                                            {avatarInitial}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-[#070707] rounded-full flex items-center justify-center p-0.5 shadow">
                                    <div className="w-full h-full bg-neon-green rounded-full flex items-center justify-center shadow-[0_0_8px_#39FF14]">
                                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl md:text-2xl font-black font-heading text-gray-900 dark:text-white italic tracking-tight truncate capitalize">
                                        {user.displayName || 'Tribe Member'}
                                    </h3>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    {user.role === 'developer' && (
                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                                            DEV
                                        </span>
                                    )}
                                    {user.role === 'founder' && (
                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                            FOUNDER
                                        </span>
                                    )}
                                    {user.role === 'super_admin' && (
                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider bg-neon-blue/10 text-neon-blue border border-neon-blue/20">
                                            ADMIN
                                        </span>
                                    )}
                                    {isApprovedCreator && (
                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider bg-neon-green/10 text-neon-green border border-neon-green/30 flex items-center gap-1">
                                            <Zap size={9} /> CREATOR
                                        </span>
                                    )}
                                    {!isApprovedCreator && (
                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider bg-gray-200/60 dark:bg-white/5 text-gray-600 dark:text-zinc-400 border border-gray-300/60 dark:border-white/10">
                                            TRIBE MEMBER
                                        </span>
                                    )}
                                    <span className="text-[8px] font-bold text-gray-500 dark:text-zinc-500 flex items-center gap-1 pl-1">
                                        <Calendar size={9} /> {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs - Capsule Switcher with Scroll Indicators */}
                        <div className="relative border-b border-gray-100 dark:border-white/5 z-10 bg-white/80 dark:bg-black/20 backdrop-blur-xl shrink-0 px-4 md:px-6 py-2.5">
                            {/* Left Scroll Arrow */}
                            <AnimatePresence>
                                {canScrollLeft && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        onClick={() => {
                                            tabsContainerRef.current?.scrollBy({ left: -140, behavior: 'smooth' });
                                        }}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-black/10 dark:border-white/10 shadow-lg flex items-center justify-center text-gray-700 dark:text-zinc-200 hover:text-neon-green hover:scale-110 active:scale-95 transition-all backdrop-blur-md"
                                        aria-label="Scroll left"
                                    >
                                        <ChevronLeft size={14} />
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            {/* Right Scroll Arrow */}
                            <AnimatePresence>
                                {canScrollRight && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        onClick={() => {
                                            tabsContainerRef.current?.scrollBy({ left: 140, behavior: 'smooth' });
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-black/10 dark:border-white/10 shadow-lg flex items-center justify-center text-gray-700 dark:text-zinc-200 hover:text-neon-green hover:scale-110 active:scale-95 transition-all backdrop-blur-md"
                                        aria-label="Scroll right"
                                    >
                                        <ChevronRight size={14} className="animate-pulse" />
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            {/* Scrollable Track */}
                            <div 
                                ref={tabsContainerRef}
                                onWheel={(e) => {
                                    if (e.currentTarget && e.deltaY !== 0) {
                                        e.currentTarget.scrollLeft += e.deltaY;
                                    }
                                }}
                                className="overflow-x-auto no-scrollbar scroll-smooth w-full"
                            >
                                <div className="inline-flex min-w-full w-max md:w-full p-1 bg-gray-100/90 dark:bg-white/5 rounded-2xl border border-gray-200/80 dark:border-white/10 gap-1">
                                    {tabs.map((tab) => {
                                        const Icon = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={(e) => {
                                                    setActiveTab(tab.id);
                                                    e.currentTarget?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                                }}
                                                className={cn(
                                                    "flex-shrink-0 md:flex-1 relative flex items-center justify-center gap-1.5 px-3.5 md:px-3 py-2 rounded-xl transition-all font-heading text-[10px] md:text-[10.5px] font-black uppercase tracking-wider whitespace-nowrap active:scale-95",
                                                    isActive 
                                                        ? "text-gray-900 dark:text-white shadow-sm" 
                                                        : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                                                )}
                                            >
                                                {isActive && (
                                                    <motion.div 
                                                        layoutId="profileActiveTabIndicator"
                                                        className="absolute inset-0 bg-white dark:bg-white/15 rounded-xl border border-gray-200 dark:border-white/20 shadow-sm"
                                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                                    />
                                                )}
                                                <Icon size={14} className={cn("relative z-10 transition-transform shrink-0", isActive && "text-neon-green scale-110")} />
                                                <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Micro Scroll Indicator Bar (Visible on Mobile when Scrollable) */}
                            {(canScrollLeft || canScrollRight) && (
                                <div className="w-16 h-1 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mt-1.5 overflow-hidden md:hidden">
                                    <div 
                                        className="h-full bg-neon-green/80 rounded-full transition-all duration-150"
                                        style={{ 
                                            width: '40%',
                                            transform: `translateX(${scrollProgress * 150}%)`
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Scrollable Content Container */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-5 md:p-8">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    {/* 1. OVERVIEW TAB */}
                                    {activeTab === 'overview' && (
                                        <div className="space-y-6">
                                            {/* Feature Cards Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Creator Hub Gateway Card */}
                                                <div 
                                                    onClick={() => setActiveTab('creator')}
                                                    className="p-5 rounded-[1.8rem] bg-gradient-to-br from-gray-50 to-gray-100/90 dark:from-zinc-900/90 dark:to-zinc-950 border border-gray-200 dark:border-white/10 hover:border-neon-green/50 transition-all cursor-pointer group shadow-sm dark:shadow-md relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                                                >
                                                    <div className="absolute top-0 right-0 w-28 h-28 bg-neon-green/10 blur-2xl pointer-events-none" />
                                                    <div className="flex items-center justify-between">
                                                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green group-hover:scale-105 transition-transform">
                                                            <Zap size={18} />
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-neon-green">
                                                            <span>{isCreator ? (isApprovedCreator ? 'Verified Partner' : 'Registered') : 'Join Program'}</span>
                                                            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                                        </div>
                                                    </div>
                                                    <div className="pt-4">
                                                        <h4 className="text-lg font-black font-heading uppercase italic text-gray-900 dark:text-white leading-tight">Creator Hub</h4>
                                                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                                                            {isCreator 
                                                                ? `${(creatorProfile?.joinedCampaigns || []).length} Active Campaigns & Studio Rates` 
                                                                : 'Get brand deals, VIP concert passes & payouts'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Ticket Vault Card */}
                                                <div 
                                                    onClick={() => setActiveTab('tickets')}
                                                    className="p-5 rounded-[1.8rem] bg-gradient-to-br from-gray-50 to-gray-100/90 dark:from-zinc-900/90 dark:to-zinc-950 border border-gray-200 dark:border-white/10 hover:border-neon-pink/50 transition-all cursor-pointer group shadow-sm dark:shadow-md relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                                                >
                                                    <div className="absolute top-0 right-0 w-28 h-28 bg-neon-pink/10 blur-2xl pointer-events-none" />
                                                    <div className="flex items-center justify-between">
                                                        <div className="w-10 h-10 rounded-xl bg-neon-pink/10 border border-neon-pink/30 flex items-center justify-center text-neon-pink group-hover:scale-105 transition-transform">
                                                            <Ticket size={18} />
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-neon-pink">
                                                            <span>{userTickets.length} Passes</span>
                                                            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                                        </div>
                                                    </div>
                                                    <div className="pt-4">
                                                        <h4 className="text-lg font-black font-heading uppercase italic text-gray-900 dark:text-white leading-tight">Ticket Vault</h4>
                                                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                                                            {userTickets.length > 0 
                                                                ? `${userTickets.length} Secured passes ready for entry` 
                                                                : 'Explore upcoming live shows & concerts'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Studio Workspace Direct Launcher for Creators */}
                                            {isCreator && (
                                                <button 
                                                    onClick={() => { navigate('/creator-dashboard'); onClose(); }}
                                                    className="w-full p-4 rounded-2xl bg-gray-950 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-100 shadow-md hover:shadow-lg transition-all flex items-center justify-between group active:scale-[0.99] text-left"
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="w-10 h-10 rounded-xl bg-neon-green/20 text-neon-green dark:bg-black/10 dark:text-black flex items-center justify-center shrink-0">
                                                            <LayoutDashboard size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black font-heading uppercase tracking-wider leading-tight">
                                                                Launch Creator Studio Workspace
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-0.5">
                                                                Track submissions, campaign deliverables, and leaderboards
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-xl bg-white/10 dark:bg-black/5 flex items-center justify-center text-white dark:text-black group-hover:translate-x-0.5 transition-transform shrink-0">
                                                        <ArrowRight size={15} />
                                                    </div>
                                                </button>
                                            )}

                                            {/* Recent Activity Section */}
                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <History size={14} className="text-gray-500" />
                                                        <h4 className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">Recent Activity</h4>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {notifications?.length > 0 ? (
                                                        notifications.slice(0, 3).map((notif, i) => (
                                                            <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-100/70 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5">
                                                                <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-zinc-300">
                                                                    {notif.type === 'ticket' ? <Ticket size={14} /> : 
                                                                     notif.type === 'security' ? <Shield size={14} /> : 
                                                                     <Info size={14} />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{notif.title}</p>
                                                                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                                                                        {notif.content || notif.message}
                                                                    </p>
                                                                </div>
                                                                <span className="text-[9px] text-gray-400 shrink-0 font-medium">
                                                                    {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-dashed border-gray-200 dark:border-white/10 text-center">
                                                            <p className="text-xs font-bold text-gray-500 dark:text-zinc-400">No recent notifications</p>
                                                            <p className="text-[10px] text-gray-400 dark:text-zinc-600 mt-1">Your alerts and bookings will appear here.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. CREATOR HUB TAB */}
                                    {activeTab === 'creator' && (
                                        isCreator ? (
                                            <CreatorProfileManager 
                                                creatorProfile={creatorProfile}
                                                user={user}
                                                creators={creators}
                                                isApprovedCreator={isApprovedCreator}
                                                onClose={onClose}
                                                navigate={navigate}
                                                setShowDeleteCreatorConfirm={setShowDeleteCreatorConfirm}
                                                isUpdating={isUpdating}
                                                setIsUpdating={setIsUpdating}
                                                updateCreator={updateCreator}
                                                addToast={addToast}
                                                addNotification={addNotification}
                                            />
                                        ) : (
                                            <CreatorNonMemberView 
                                                onClose={onClose}
                                                navigate={navigate}
                                            />
                                        )
                                    )}

                                    {/* 3. TICKET VAULT TAB */}
                                    {activeTab === 'tickets' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-xl font-black font-heading text-gray-900 dark:text-white uppercase italic tracking-tight">Ticket Vault</h3>
                                                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Your secured concert entries & guestlist passes</p>
                                                </div>
                                                <div className="px-3.5 py-1.5 rounded-xl bg-neon-pink/10 border border-neon-pink/20 text-neon-pink text-xs font-black">
                                                    {userTickets.length} Passes
                                                </div>
                                            </div>

                                            {/* Filters & Sort */}
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/5">
                                                <div className="flex flex-1 gap-1">
                                                    <button 
                                                        onClick={() => setTicketFilter('upcoming')}
                                                        className={cn(
                                                            "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                                            ticketFilter === 'upcoming' 
                                                                ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm" 
                                                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        Upcoming ({userTickets.filter(t => !t.eventDate || new Date(t.eventDate) >= new Date().setHours(0,0,0,0)).length})
                                                    </button>
                                                    <button 
                                                        onClick={() => setTicketFilter('past')}
                                                        className={cn(
                                                            "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                                            ticketFilter === 'past' 
                                                                ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm" 
                                                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        Past Passes
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2">
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase">Sort:</span>
                                                    <button 
                                                        onClick={() => setTicketSort(ticketSort === 'booking' ? 'event' : 'booking')}
                                                        className="text-[9px] font-black text-neon-pink uppercase hover:underline"
                                                    >
                                                        {ticketSort === 'booking' ? 'By Booking' : 'By Date'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Passes Listing */}
                                            {loadingEntries ? (
                                                <div className="flex flex-col items-center justify-center py-16">
                                                    <Loader2 className="w-7 h-7 text-neon-pink animate-spin" />
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-3">Loading Tickets...</p>
                                                </div>
                                            ) : userTickets.length > 0 ? (
                                                <div className="space-y-3.5">
                                                    {userTickets.map((ticket, i) => (
                                                        <div 
                                                            key={i}
                                                            onClick={() => { navigate(`/ticket/${ticket.bookingRef || ticket.id}`); onClose(); }}
                                                            className="p-4 md:p-5 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 hover:border-neon-pink/40 transition-all cursor-pointer group shadow-sm flex items-center gap-4 relative overflow-hidden"
                                                        >
                                                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 text-neon-pink shadow-sm">
                                                                <Ticket size={22} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="text-sm font-black font-heading text-gray-900 dark:text-white uppercase italic truncate">
                                                                        {ticket.eventTitle}
                                                                    </h4>
                                                                    <span className="px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/20 text-[8px] font-black uppercase shrink-0">
                                                                        {ticket.status || 'Active'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
                                                                    <span className="font-bold flex items-center gap-1">
                                                                        <Calendar size={10} />
                                                                        {ticket.eventDate ? new Date(ticket.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Confirmed Pass'}
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span className="font-mono text-neon-pink font-bold">
                                                                        #{ticket.bookingRef?.slice(0, 10) || 'PASS'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ChevronRight size={18} className="text-gray-400 group-hover:text-neon-pink group-hover:translate-x-1 transition-all shrink-0" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-10 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-dashed border-gray-200 dark:border-white/10 text-center space-y-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-neon-pink/10 text-neon-pink flex items-center justify-center mx-auto">
                                                        <Ticket size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black uppercase text-gray-900 dark:text-white">No Tickets Found</p>
                                                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">You do not have any tickets in this category.</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => { navigate('/concertzone'); onClose(); }}
                                                        className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-wider hover:bg-neon-pink hover:text-white transition-all shadow-md"
                                                    >
                                                        Browse Concert Zone
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 4. SETTINGS TAB */}
                                    {activeTab === 'settings' && (
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-xl font-black font-heading text-gray-900 dark:text-white uppercase italic tracking-tight">Account Settings</h3>
                                                <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Manage your personal credentials & preferences</p>
                                            </div>

                                            <div className="space-y-4">
                                                {/* Display Name Input */}
                                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Display Name</label>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text"
                                                            value={isEditingName ? newDisplayName : (user.displayName || '')}
                                                            disabled={!isEditingName || isUpdating}
                                                            onChange={(e) => setNewDisplayName(e.target.value)}
                                                            className="flex-1 h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none disabled:opacity-60 transition-all"
                                                        />
                                                        {isEditingName ? (
                                                            <div className="flex gap-1.5">
                                                                <button 
                                                                    onClick={() => setIsEditingName(false)}
                                                                    className="px-3 h-11 rounded-xl bg-gray-200 dark:bg-white/10 text-xs font-bold text-gray-700 dark:text-white"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button 
                                                                    onClick={handleUpdateName}
                                                                    disabled={isUpdating}
                                                                    className="px-4 h-11 rounded-xl bg-neon-blue text-black text-xs font-black uppercase"
                                                                >
                                                                    {isUpdating ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => setIsEditingName(true)}
                                                                className="px-3.5 h-11 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-white hover:bg-gray-200"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Phone Number Input */}
                                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Primary Phone</label>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text"
                                                            value={isEditingPhone ? newPhone : (user.phoneNumber || '')}
                                                            disabled={!isEditingPhone || isUpdating}
                                                            onChange={(e) => setNewPhone(e.target.value)}
                                                            className="flex-1 h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none disabled:opacity-60 transition-all"
                                                        />
                                                        {isEditingPhone ? (
                                                            <div className="flex gap-1.5">
                                                                <button 
                                                                    onClick={() => setIsEditingPhone(false)}
                                                                    className="px-3 h-11 rounded-xl bg-gray-200 dark:bg-white/10 text-xs font-bold text-gray-700 dark:text-white"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button 
                                                                    onClick={handleUpdatePhone}
                                                                    disabled={isUpdating}
                                                                    className="px-4 h-11 rounded-xl bg-neon-blue text-black text-xs font-black uppercase"
                                                                >
                                                                    {isUpdating ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => setIsEditingPhone(true)}
                                                                className="px-3.5 h-11 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-white hover:bg-gray-200"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Email Address Read-only */}
                                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 space-y-1">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Linked Account Email</label>
                                                    <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-zinc-300 pt-1">
                                                        <span>{user.email || 'No email attached'}</span>
                                                        <Mail size={14} className="text-gray-400" />
                                                    </div>
                                                </div>

                                                {/* Logout Action */}
                                                <div className="pt-4">
                                                    <button 
                                                        onClick={handleLogout}
                                                        className="w-full h-12 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <LogOut size={16} />
                                                        <span>Logout Personal Hub</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 5. SECURITY TAB */}
                                    {activeTab === 'security' && (
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-xl font-black font-heading text-gray-900 dark:text-white uppercase italic tracking-tight">Security & Access</h3>
                                                <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Session management & account deactivation</p>
                                            </div>

                                            <div className="space-y-3">
                                                <button 
                                                    onClick={handleResetPassword}
                                                    disabled={isUpdating}
                                                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 hover:border-neon-blue/40 transition-all flex items-center justify-between group text-left"
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="w-10 h-10 rounded-xl bg-neon-blue/10 text-neon-blue flex items-center justify-center">
                                                            <RefreshCw size={18} className={isUpdating ? "animate-spin" : ""} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black uppercase text-gray-900 dark:text-white">Dispatch Password Reset</p>
                                                            <p className="text-[10px] text-gray-500 dark:text-zinc-400">Sends a secure recovery link to {user.email}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-gray-400 group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
                                                </button>

                                                <button 
                                                    onClick={handleSignOutAllDevices}
                                                    disabled={isUpdating}
                                                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 hover:border-red-500/40 transition-all flex items-center justify-between group text-left"
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                                            <LogOut size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black uppercase text-gray-900 dark:text-white">Sign Out All Other Devices</p>
                                                            <p className="text-[10px] text-gray-500 dark:text-zinc-400">Revokes all active web & mobile sessions</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-gray-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                                                </button>
                                            </div>

                                            {/* UNIFIED DANGER ZONE */}
                                            <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
                                                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-1">Danger Zone</h4>

                                                {isCreator && (
                                                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-2">
                                                        <div className="flex items-center gap-2 text-red-500">
                                                            <Briefcase size={16} />
                                                            <h5 className="text-xs font-black uppercase">Deactivate Creator Listing</h5>
                                                        </div>
                                                        <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                                                            Removes your public creator dossier and campaign applications. Your user account and tickets remain safe.
                                                        </p>
                                                        <button 
                                                            onClick={() => setShowDeleteCreatorConfirm(true)}
                                                            disabled={isUpdating}
                                                            className="w-full h-10 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-[10px] font-black uppercase tracking-wider transition-all"
                                                        >
                                                            Deactivate Creator Profile Only
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-2">
                                                    <div className="flex items-center gap-2 text-red-500">
                                                        <Trash2 size={16} />
                                                        <h5 className="text-xs font-black uppercase">Permanently Delete Account</h5>
                                                    </div>
                                                    <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                                                        Irreversibly destroys your account, all event tickets, guestlist passes, and stored profiles.
                                                    </p>
                                                    <button 
                                                        onClick={() => setShowDeleteConfirm(true)}
                                                        disabled={isUpdating}
                                                        className="w-full h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-md"
                                                    >
                                                        Delete Entire Account
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Modal for Deleting Full Account */}
                    <AnimatePresence>
                        {showDeleteConfirm && (
                            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                    onClick={() => !isUpdating && setShowDeleteConfirm(false)}
                                />
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="relative w-full max-w-sm bg-white dark:bg-[#0f0f0f] border border-red-500/30 rounded-3xl p-6 shadow-2xl text-gray-900 dark:text-white"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-500">
                                        <AlertCircle size={24} />
                                    </div>
                                    <h3 className="text-xl font-black font-heading uppercase italic tracking-tight">Delete Entire Account?</h3>
                                    <p className="text-xs text-gray-600 dark:text-zinc-400 font-medium leading-relaxed my-3">
                                        This action is permanent and cannot be undone. All your tickets, orders, creator profile, and personal history will be erased.
                                    </p>
                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => setShowDeleteConfirm(false)}
                                            disabled={isUpdating}
                                            className="flex-1 h-11 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white font-bold text-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleDeleteAccount}
                                            disabled={isUpdating}
                                            className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black uppercase text-xs shadow-lg flex items-center justify-center"
                                        >
                                            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : "Confirm Delete"}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Modal for Deactivating Creator Profile Only */}
                    <AnimatePresence>
                        {showDeleteCreatorConfirm && (
                            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                    onClick={() => !isUpdating && setShowDeleteCreatorConfirm(false)}
                                />
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="relative w-full max-w-sm bg-white dark:bg-[#0f0f0f] border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-gray-900 dark:text-white"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-500">
                                        <Trash2 size={24} />
                                    </div>
                                    <h3 className="text-xl font-black font-heading uppercase italic tracking-tight">Deactivate Creator Listing?</h3>
                                    <p className="text-xs text-gray-600 dark:text-zinc-400 font-medium leading-relaxed my-3">
                                        This will remove your public creator listing and campaign applications. Your Newbi user account, concert tickets, and passes will remain intact.
                                    </p>
                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => setShowDeleteCreatorConfirm(false)}
                                            disabled={isUpdating}
                                            className="flex-1 h-11 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white font-bold text-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleDeleteCreatorProfile}
                                            disabled={isUpdating}
                                            className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black uppercase text-xs shadow-lg flex items-center justify-center"
                                        >
                                            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : "Deactivate Profile"}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
};

/* --- Non-Member Gateway for Creator Hub --- */
const CreatorNonMemberView = ({ onClose, navigate }) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black font-heading text-gray-900 dark:text-white uppercase italic tracking-tight">Creator Hub</h3>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Join India's premier creator ecosystem</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[9px] font-black uppercase tracking-wider">
                    Open Access
                </div>
            </div>

            {/* Showcase Hero */}
            <div className="p-6 md:p-8 rounded-[2.2rem] bg-gradient-to-br from-gray-50 via-gray-100 to-white dark:from-zinc-900/90 dark:via-zinc-900/50 dark:to-zinc-950 border border-gray-200 dark:border-white/10 relative overflow-hidden shadow-md space-y-5">
                <div className="absolute top-0 right-0 w-48 h-48 bg-neon-green/15 blur-3xl pointer-events-none" />
                
                <div className="w-14 h-14 rounded-2xl bg-neon-green/15 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-md">
                    <Zap size={28} />
                </div>

                <div className="space-y-2">
                    <h4 className="text-2xl font-black font-heading text-gray-900 dark:text-white uppercase italic tracking-tight">
                        Monetize Your Influence With Newbi
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 font-medium leading-relaxed">
                        Connect with top brands, access paid gig opportunities, unlock VIP backstage concert passes, and track deliverables with automated payouts.
                    </p>
                </div>

                {/* Perk List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/5 text-[11px] font-bold text-gray-800 dark:text-zinc-200">
                        <CheckCircle2 size={14} className="text-neon-green shrink-0" />
                        <span>Direct Brand Deliverables</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/5 text-[11px] font-bold text-gray-800 dark:text-zinc-200">
                        <CheckCircle2 size={14} className="text-neon-green shrink-0" />
                        <span>Concert Passes & VIP Access</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/5 text-[11px] font-bold text-gray-800 dark:text-zinc-200">
                        <CheckCircle2 size={14} className="text-neon-green shrink-0" />
                        <span>Instant Verified Payouts</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/5 text-[11px] font-bold text-gray-800 dark:text-zinc-200">
                        <CheckCircle2 size={14} className="text-neon-green shrink-0" />
                        <span>Referral Leaderboards</span>
                    </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                    <button
                        onClick={() => { navigate('/creator/join'); onClose(); }}
                        className="w-full h-14 rounded-2xl bg-gray-950 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-100 font-black font-heading uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98"
                    >
                        <Zap size={16} className="text-neon-green dark:text-black" />
                        <span>Apply to Become a Creator</span>
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* Campaign Explorer Shortcut */}
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 flex items-center justify-between">
                <div>
                    <h5 className="text-xs font-black uppercase text-gray-900 dark:text-white">Live Campaign Explorer</h5>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400">Discover active campaign briefs open across India</p>
                </div>
                <button
                    onClick={() => { navigate('/campaigns'); onClose(); }}
                    className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-[10px] font-bold text-gray-800 dark:text-white hover:bg-gray-300"
                >
                    Browse
                </button>
            </div>
        </div>
    );
};

/* --- Creator Profile & Settings Component Embedded in Profile Panel --- */

const CreatorProfileManager = ({ 
    creatorProfile, 
    user, 
    creators = [],
    isApprovedCreator, 
    onClose, 
    navigate, 
    setShowDeleteCreatorConfirm, 
    isUpdating, 
    setIsUpdating, 
    updateCreator, 
    addToast, 
    addNotification 
}) => {
    const [subTab, setSubTab] = useState('overview'); // 'overview' | 'settings'
    const [isSaving, setIsSaving] = useState(false);

    const rawSpecialization = (creatorProfile?.specializations || [creatorProfile?.categories] || [])[0] || '';
    const initialSpecialization = rawSpecialization === 'Student Creator/ Campus Creator' ? 'Student/ Campus Creator' : rawSpecialization;
    const isPredefinedNiche = CREATOR_NICHES.includes(initialSpecialization);
    const isPredefinedCity = PREDEFINED_CITIES.includes(creatorProfile?.city || '');

    const [form, setForm] = useState({
        name: creatorProfile?.name || creatorProfile?.displayName || user?.displayName || '',
        phone: creatorProfile?.phone || user?.phoneNumber || '',
        email: creatorProfile?.email || user?.email || '',
        city: isPredefinedCity ? (creatorProfile?.city || '') : (creatorProfile?.city ? 'Others' : ''),
        customCity: isPredefinedCity ? '' : (creatorProfile?.city || ''),
        specializations: isPredefinedNiche ? initialSpecialization : (initialSpecialization ? 'Others' : ''),
        customNiche: isPredefinedNiche ? '' : initialSpecialization,
        collegeName: creatorProfile?.collegeName || '',
        instagram: creatorProfile?.instagram || '',
        bio: creatorProfile?.bio || '',
        doBarter: creatorProfile?.doBarter || '',
        commercials: creatorProfile?.commercials || '',
        profilePicture: creatorProfile?.profilePicture || ''
    });

    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(creatorProfile?.isPhoneVerified || false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const recaptchaVerifier = useRef(null);
    const recaptchaId = useRef(`recaptcha-profile-creator-${Math.random().toString(36).slice(2, 9)}`).current;
    const otpRefs = useRef([]);

    const cleanupRecaptcha = () => {
        if (recaptchaVerifier.current) {
            try {
                recaptchaVerifier.current.clear();
            } catch (e) {
                console.error("Error clearing recaptcha:", e);
            }
            recaptchaVerifier.current = null;
        }
        const container = document.getElementById(recaptchaId);
        if (container) container.remove();
    };

    useEffect(() => {
        return () => {
            cleanupRecaptcha();
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            if (addToast) addToast("Image size must be under 5MB", "error");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({ ...prev, profilePicture: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSendOTP = async () => {
        if (!form.phone) {
            if (addToast) addToast("Please enter a phone number", "error");
            return;
        }
        const normPhone = normalizePhoneNumber(form.phone);
        if (normPhone) {
            const existing = creators.find(c => c.uid !== creatorProfile.uid && normalizePhoneNumber(c.phone) === normPhone);
            if (existing) {
                if (addToast) addToast(`This number is already linked to another account (${existing.email || 'existing creator'}).`, "error");
                return;
            }
        }
        setIsSendingOtp(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                setOtpSent(true);
                if (addToast) addToast("Local mode: enter any 6-digit code to verify.", "success");
                setIsSendingOtp(false);
                return;
            }
            cleanupRecaptcha();
            const container = document.createElement('div');
            container.id = recaptchaId;
            container.className = "z-50";
            document.body.appendChild(container);

            recaptchaVerifier.current = new RecaptchaVerifier(auth, container, {
                size: 'invisible',
                callback: () => {},
                'expired-callback': () => {
                    if (addToast) addToast("reCAPTCHA expired. Please try again.", 'error');
                    cleanupRecaptcha();
                }
            });
            await recaptchaVerifier.current.render();

            const cleanPhone = form.phone.replace(/\D/g, '');
            const formattedPhone = `+91${cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone}`;

            const phoneProvider = new PhoneAuthProvider(auth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                formattedPhone,
                recaptchaVerifier.current
            );
            setConfirmationResult(verificationId);
            setOtpSent(true);
            if (addToast) addToast("Verification code sent to your phone!", "success");
        } catch (err) {
            console.error("OTP send error:", err);
            if (addToast) addToast(err.message || "Could not send SMS verification code.", "error");
            cleanupRecaptcha();
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOTP = async (codeToVerify) => {
        const fullCode = typeof codeToVerify === 'string' ? codeToVerify : otpValues.join('');
        if (fullCode.length !== 6) {
            if (addToast) addToast("Please enter the complete 6-digit code.", "error");
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (!isLocal && confirmationResult) {
                const credential = PhoneAuthProvider.credential(confirmationResult, fullCode);
                if (auth.currentUser && !auth.currentUser.phoneNumber) {
                    try {
                        await linkWithCredential(auth.currentUser, credential);
                    } catch (linkErr) {
                        console.log("Phone link note:", linkErr.message);
                    }
                }
            }
            setIsPhoneVerified(true);
            setOtpSent(false);
            if (addToast) addToast("Phone number verified successfully!", "success");
            await updateCreator(creatorProfile.uid, {
                phone: form.phone,
                isPhoneVerified: true
            });
        } catch (err) {
            console.error("Verification error:", err);
            if (addToast) addToast(err.message || "Invalid verification code. Please try again.", "error");
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleOtpChange = (index, value) => {
        const clean = value.replace(/\D/g, '');
        if (!clean && value !== '') return;

        if (clean.length > 1) {
            const digits = clean.slice(0, 6).split('');
            const newOtp = [...otpValues];
            digits.forEach((d, i) => {
                if (index + i < 6) newOtp[index + i] = d;
            });
            setOtpValues(newOtp);
            const nextIdx = Math.min(index + digits.length, 5);
            otpRefs.current[nextIdx]?.focus();
            if (newOtp.every(d => d !== '')) {
                handleVerifyOTP(newOtp.join(''));
            }
            return;
        }

        const newOtp = [...otpValues];
        newOtp[index] = clean;
        setOtpValues(newOtp);

        if (clean && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        if (newOtp.every(d => d !== '')) {
            handleVerifyOTP(newOtp.join(''));
        }
    };

    const handleSaveCreatorSettings = async (e) => {
        if (e) e.preventDefault();
        if (!form.name?.trim()) {
            if (addToast) addToast("Please enter your creator name", "error");
            return;
        }
        setIsSaving(true);
        try {
            const finalCity = form.city === 'Others' ? (form.customCity?.trim() || 'Others') : form.city;
            const finalNiche = form.specializations === 'Others' ? (form.customNiche?.trim() || 'Others') : form.specializations;

            const payload = {
                name: form.name.trim(),
                displayName: form.name.trim(),
                instagram: form.instagram?.trim().replace(/^@/, '') || '',
                phone: form.phone?.trim() || '',
                city: finalCity,
                specializations: [finalNiche],
                categories: finalNiche,
                collegeName: form.collegeName?.trim() || '',
                bio: form.bio?.trim() || '',
                commercials: form.commercials?.trim() || '',
                doBarter: form.doBarter || '',
                profilePicture: form.profilePicture || '',
                isPhoneVerified: isPhoneVerified
            };

            await updateCreator(creatorProfile.uid, payload);
            if (addToast) addToast("Creator profile updated successfully!", "success");
            if (addNotification) {
                addNotification({
                    title: "Creator Profile Updated",
                    content: "Your creator details and settings have been saved.",
                    type: 'message'
                });
            }
            setSubTab('overview');
        } catch (err) {
            console.error("Failed to update creator profile:", err);
            if (addToast) addToast(err.message || "Failed to update creator profile.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const showCollegeField = form.specializations === 'Student/ Campus Creator' || form.specializations === 'Student Creator/ Campus Creator' || form.specializations === 'College Pages';

    if (subTab === 'settings') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 pb-6"
            >
                {/* Settings Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-4">
                    <div>
                        <h3 className="text-xl font-black font-heading text-gray-900 dark:text-white uppercase italic tracking-tight">Edit Creator Profile</h3>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Update rates, contacts, and public dossier</p>
                    </div>
                    <button
                        onClick={() => setSubTab('overview')}
                        className="px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                        ← Back
                    </button>
                </div>

                <form onSubmit={handleSaveCreatorSettings} className="space-y-4">
                    {/* Avatar Upload */}
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10">
                        <div className="relative w-16 h-16 rounded-2xl bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                            {form.profilePicture ? (
                                <img src={form.profilePicture} alt="Avatar Preview" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-black text-gray-900 dark:text-white">{form.name?.charAt(0) || 'C'}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 block mb-1">Profile Photo</label>
                            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-900 dark:text-white cursor-pointer hover:border-neon-green transition-all">
                                <Upload size={12} className="text-neon-green" />
                                <span>Upload New Picture</span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Name & Instagram */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Creator Name *</label>
                            <input 
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Your Name"
                                required
                                className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Instagram Handle</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">@</span>
                                <input 
                                    type="text"
                                    name="instagram"
                                    value={form.instagram.replace(/^@/, '')}
                                    onChange={handleChange}
                                    placeholder="username"
                                    className="w-full h-11 pl-7 pr-3.5 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Phone & OTP Verification */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">WhatsApp / Contact Phone</label>
                            {isPhoneVerified ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-neon-green bg-neon-green/10 px-2 py-0.5 rounded-full border border-neon-green/30">
                                    <CheckCircle2 size={11} /> Verified
                                </span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    Action Required
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="tel"
                                name="phone"
                                value={form.phone}
                                onChange={(e) => {
                                    handleChange(e);
                                    if (isPhoneVerified && e.target.value !== creatorProfile.phone) {
                                        setIsPhoneVerified(false);
                                    }
                                }}
                                placeholder="+91 9876543210"
                                className="flex-1 h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all"
                            />
                            {!isPhoneVerified && (
                                <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    disabled={isSendingOtp || !form.phone}
                                    className="px-4 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 shadow-sm"
                                >
                                    {isSendingOtp ? <Loader2 size={14} className="animate-spin" /> : (otpSent ? "Resend Code" : "Send SMS Code")}
                                </button>
                            )}
                        </div>

                        {/* Inline OTP verification inputs if OTP was sent */}
                        {otpSent && !isPhoneVerified && (
                            <div className="pt-2 space-y-2 border-t border-gray-200 dark:border-white/5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400">Enter 6-digit Code sent via SMS:</p>
                                <div className="flex gap-1.5 sm:gap-2">
                                    {otpValues.map((val, idx) => (
                                        <input
                                            key={idx}
                                            ref={el => otpRefs.current[idx] = el}
                                            type="text"
                                            maxLength={1}
                                            value={val}
                                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Backspace' && !val && idx > 0) {
                                                    otpRefs.current[idx - 1]?.focus();
                                                }
                                            }}
                                            className="w-9 h-11 sm:w-10 sm:h-12 text-center rounded-xl bg-white dark:bg-black/60 border border-gray-200 dark:border-white/10 text-sm font-black text-gray-900 dark:text-white focus:border-neon-green outline-none"
                                        />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleVerifyOTP(otpValues.join(''))}
                                    disabled={isVerifyingOtp || otpValues.some(v => !v)}
                                    className="w-full h-10 rounded-xl bg-neon-green text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-sm"
                                >
                                    {isVerifyingOtp ? <Loader2 size={14} className="animate-spin" /> : "Verify Code"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* City & Niche */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">City / Region</label>
                            <select
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                className="w-full h-11 px-3 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all"
                            >
                                <option value="">Select Operating City</option>
                                {PREDEFINED_CITIES.map(c => (
                                    <option key={c} value={c} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">{c}</option>
                                ))}
                            </select>
                            {form.city === 'Others' && (
                                <input 
                                    type="text"
                                    name="customCity"
                                    value={form.customCity}
                                    onChange={handleChange}
                                    placeholder="Enter your custom city"
                                    className="w-full h-10 px-3.5 mt-2 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all"
                                />
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Primary Niche</label>
                            <select
                                name="specializations"
                                value={form.specializations}
                                onChange={handleChange}
                                className="w-full h-11 px-3 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all"
                            >
                                <option value="">Select Niche Category</option>
                                {CREATOR_NICHES.map(n => (
                                    <option key={n} value={n} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">{n}</option>
                                ))}
                            </select>
                            {form.specializations === 'Others' && (
                                <input 
                                    type="text"
                                    name="customNiche"
                                    value={form.customNiche}
                                    onChange={handleChange}
                                    placeholder="Enter your custom niche"
                                    className="w-full h-10 px-3.5 mt-2 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all"
                                />
                            )}
                        </div>
                    </div>

                    {/* College Name (if Student/Campus Creator) */}
                    {showCollegeField && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">College / University Name</label>
                            <input 
                                type="text"
                                name="collegeName"
                                value={form.collegeName}
                                onChange={handleChange}
                                placeholder="e.g. Delhi University / IIT Bombay / Christ University"
                                className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all"
                            />
                        </div>
                    )}

                    {/* Bio */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Creator Bio & Vibe</label>
                        <textarea
                            name="bio"
                            value={form.bio}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Share your style, vibe, content themes, and key achievements..."
                            className="w-full p-3 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Commercials & Barter */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Starting Rate (Commercials)</label>
                            <input 
                                type="text"
                                name="commercials"
                                value={form.commercials}
                                onChange={handleChange}
                                placeholder="e.g. ₹5,000 / reel"
                                className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Barter Preference</label>
                            <select
                                name="doBarter"
                                value={form.doBarter}
                                onChange={handleChange}
                                className="w-full h-11 px-3 rounded-xl bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all"
                            >
                                <option value="">Select Barter Preference</option>
                                <option value="Yes" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">Open to Barter & Products</option>
                                <option value="No" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">Paid Commercials Only</option>
                                <option value="Negotiable" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">Negotiable based on campaign</option>
                            </select>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setSubTab('overview')}
                            className="flex-1 h-12 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold uppercase tracking-wider text-xs hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 h-12 rounded-xl bg-neon-green hover:bg-white text-black font-black uppercase tracking-widest text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                        </button>
                    </div>
                </form>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Verified badge */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black font-heading text-gray-900 dark:text-white uppercase italic tracking-tight">Creator Hub</h3>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Unified Dossier & Campaign Studio</p>
                </div>
                <div className="px-3.5 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck size={13} />
                    <span>{isApprovedCreator ? 'Verified Partner' : 'Registered Creator'}</span>
                </div>
            </div>

            {/* Creator Identity Hero Card - Crisp Contrast on Light & Dark */}
            <div className="p-6 sm:p-7 rounded-[2.2rem] bg-gradient-to-br from-white via-gray-50 to-gray-100/90 dark:from-zinc-900/90 dark:via-zinc-900/50 dark:to-zinc-950 border border-gray-200 dark:border-white/10 relative overflow-hidden group shadow-lg dark:shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-neon-green/15 blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-white/15 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {creatorProfile.profilePicture ? (
                            <img src={creatorProfile.profilePicture} alt={creatorProfile.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl font-black text-gray-900 dark:text-white italic">{creatorProfile.name?.charAt(0) || 'C'}</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-black font-heading text-gray-900 dark:text-white uppercase italic truncate">
                            {creatorProfile.name || creatorProfile.displayName || user.displayName}
                        </h4>
                        {creatorProfile.instagram && (
                            <a 
                                href={`https://instagram.com/${creatorProfile.instagram.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-neon-green hover:underline flex items-center gap-1 mt-0.5"
                            >
                                <Instagram size={13} />
                                <span>@{creatorProfile.instagram.replace(/^@/, '')}</span>
                            </a>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600 dark:text-zinc-400 mt-1.5">
                            {creatorProfile.city && (
                                <div className="flex items-center gap-1">
                                    <MapPin size={11} className="text-neon-green" />
                                    <span>{creatorProfile.city}</span>
                                </div>
                            )}
                            {creatorProfile.collegeName && (
                                <div className="flex items-center gap-1">
                                    <Building size={11} className="text-neon-blue" />
                                    <span className="truncate max-w-[140px]">{creatorProfile.collegeName}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Niches */}
                {((creatorProfile.specializations || creatorProfile.categories || []).length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-200 dark:border-white/5">
                        {(Array.isArray(creatorProfile.specializations) ? creatorProfile.specializations : [creatorProfile.categories]).filter(Boolean).map((niche, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[9px] font-black uppercase tracking-wider text-gray-800 dark:text-zinc-200 shadow-sm">
                                {niche}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Unverified Phone Warning Banner */}
            {!creatorProfile.isPhoneVerified && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <Phone size={16} className="text-amber-500 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">Phone Verification Needed</p>
                            <p className="text-[10px] text-gray-500 dark:text-zinc-400">Verify WhatsApp number for instant brief dispatches.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSubTab('settings')}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 text-zinc-950 font-bold text-[10px] uppercase shrink-0"
                    >
                        Verify Now
                    </button>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 shadow-sm">
                    <p className="text-[9px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">Follower Reach</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
                        {creatorProfile.instagramFollowers ? Number(creatorProfile.instagramFollowers).toLocaleString() : 'Connected'}
                    </p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 shadow-sm">
                    <p className="text-[9px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">Joined Gigs</p>
                    <p className="text-xl font-black text-neon-green mt-1">
                        {(creatorProfile.joinedCampaigns || []).length} Campaigns
                    </p>
                </div>
            </div>

            {/* Edit Settings Button */}
            <button
                onClick={() => setSubTab('settings')}
                className="w-full py-3.5 px-5 rounded-2xl bg-white dark:bg-zinc-900/60 hover:bg-gray-50 dark:hover:bg-zinc-900 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white transition-all flex items-center justify-between group shadow-sm active:scale-[0.99]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-300 group-hover:text-neon-green transition-colors">
                        <Settings size={15} className="group-hover:rotate-45 transition-transform duration-300" />
                    </div>
                    <span className="font-heading font-black text-xs uppercase tracking-wider">Edit Profile, Rates & Niches</span>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Studio Workspace Actions */}
            <div className="space-y-2.5 pt-1">
                <button
                    onClick={() => { navigate('/creator-dashboard'); onClose(); }}
                    className="w-full p-4 rounded-2xl bg-gray-950 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-100 shadow-md hover:shadow-lg transition-all flex items-center justify-between group active:scale-[0.99]"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-neon-green/20 text-neon-green dark:bg-black/10 dark:text-black flex items-center justify-center shrink-0">
                            <LayoutDashboard size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-black font-heading uppercase tracking-wider leading-tight">Open Studio Workspace</p>
                            <p className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 mt-0.5">Track deliverables, submissions & leaderboards</p>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white/10 dark:bg-black/5 flex items-center justify-center text-white dark:text-black group-hover:translate-x-0.5 transition-transform shrink-0">
                        <ArrowRight size={15} />
                    </div>
                </button>

                <button
                    onClick={() => { navigate('/campaigns'); onClose(); }}
                    className="w-full p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/90 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white transition-all flex items-center justify-between group active:scale-[0.99] shadow-sm"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-neon-blue/10 text-neon-blue dark:bg-neon-blue/20 flex items-center justify-center shrink-0">
                            <Sparkles size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-black font-heading uppercase tracking-wider leading-tight">Explore Live Campaign Briefs</p>
                            <p className="text-[10px] font-medium text-gray-500 dark:text-zinc-400 mt-0.5">Browse active brand deals & requirements</p>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-gray-200/60 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0">
                        <ArrowRight size={15} />
                    </div>
                </button>
            </div>

            {/* Unified Deactivation Section in Creator Tab */}
            <div className="p-5 rounded-[2rem] bg-red-500/5 border border-red-500/20 space-y-3 mt-6">
                <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle size={16} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Deactivate Creator Listing</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                    Need to remove your creator portfolio? You can deactivate your creator profile without losing your Newbi tickets, passes, or account history.
                </p>
                <button
                    type="button"
                    onClick={() => setShowDeleteCreatorConfirm(true)}
                    disabled={isUpdating}
                    className="w-full h-11 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                    <Trash2 size={14} />
                    <span>Deactivate Creator Profile</span>
                </button>
            </div>
        </div>
    );
};

export default ProfilePanel;
