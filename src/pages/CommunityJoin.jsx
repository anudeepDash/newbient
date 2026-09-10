import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Users from 'lucide-react/dist/esm/icons/users';
import Star from 'lucide-react/dist/esm/icons/star';
import Gift from 'lucide-react/dist/esm/icons/gift';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Zap from 'lucide-react/dist/esm/icons/zap';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Layout from 'lucide-react/dist/esm/icons/layout';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import CommunityCard from '../components/community/CommunityCard';
import EventTicketingModal from '../components/tickets/EventTicketingModal';
import useDynamicMeta from '../hooks/useDynamicMeta';
import html2canvas from 'html2canvas';

const CommunityJoin = () => {
    useStoreSubscription(['volunteerGigs', 'guestlists', 'giveaways', 'campaigns', 'forms']);
    const scrollContainer = (id, direction) => {
        const container = document.getElementById(id);
        if (container) {
            const scrollAmount = direction === 'left' ? -300 : 300;
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };
    const { 
        forms = [], 
        siteDetails, 
        siteSettings = {}, 
        volunteerGigs = [], 
        guestlists = [], 
        giveaways = [], 
        user, 
        authInitialized, 
        markFormAsSubmitted, 
        markWhatsappJoined, 
        setAuthModal,
        campaigns = []
    } = useStore();
    const navigate = useNavigate();
    const activeGiveaway = (giveaways || []).find(g => g.status === 'Open' && (!g.endDate || new Date(g.endDate) >= new Date()));
    const location = useLocation();
    const [confirming, setConfirming] = useState(false);
    const [clickedWhatsApp, setClickedWhatsApp] = useState(false);
    const [verifyingWhatsapp, setVerifyingWhatsapp] = useState(false);
    const [isGLModalOpen, setIsGLModalOpen] = useState(false);
    const [selectedGL, setSelectedGL] = useState(null);
    const [showShareToast, setShowShareToast] = useState(false);
    const [registrationLoaded, setRegistrationLoaded] = useState(false);
    const hasJoined = user && user.hasJoinedTribe;

    // Build tribe registration URL with email pre-fill
    const tribeFormUrl = useMemo(() => {
        const base = 'https://docs.google.com/forms/d/e/1FAIpQLScQv55cT-hPBqTtw7PFqOZND6QfPkmjzT8_4Sf4G53_UYwSQg/viewform?embedded=true';
        try {
            const url = new URL(base);
            if (user?.email) {
                url.searchParams.set('emailAddress', user.email);
            }
            return url.toString();
        } catch {
            return base;
        }
    }, [user?.email]);

    // Resolve Direct Link Item for Meta Tags
    const params = new URLSearchParams(location.search);
    const gigId = params.get('gig');
    const glId = params.get('gl');
    const formId = params.get('form');
    const campaignId = params.get('campaign');
    const eventId = params.get('event');
    
    const directType = gigId ? 'gig' : (glId ? 'gl' : (formId ? 'form' : (campaignId ? 'campaign' : (eventId ? 'event' : null))));
    const directId = gigId || glId || formId || campaignId || eventId;

    const directItem = directId ? (
        directType === 'gig' ? (volunteerGigs || []).find(i => i.id === directId) :
        directType === 'gl' ? (guestlists || []).find(i => i.id === directId) :
        directType === 'form' ? (forms || []).find(i => i.id === directId) :
        directType === 'campaign' ? (campaigns || []).find(i => i.id === directId) :
        ((forms || []).find(i => i.id === directId) || (guestlists || []).find(i => i.id === directId) || (volunteerGigs || []).find(i => i.id === directId) || null)
    ) : null;

    useDynamicMeta({
        title: directItem ? directItem.title : "Community Hub",
        description: directItem ? (directItem.description || "Join this exclusive opportunity at Newbi Entertainment.") : "Access exclusive gigs, campaigns, and forms.",
        image: directItem?.image || "/og-image.png",
        url: window.location.href
    });

    // Extract Featured Items from all categories
    const featuredItems = [
        ...(volunteerGigs || []).filter(i => i.isPinned).map(item => ({ ...item, type: 'gig' })),
        ...(guestlists || []).filter(i => i.isPinned).map(item => ({ ...item, type: 'gl' })),
        ...(forms || []).filter(i => i.isPinned).map(item => ({ ...item, type: 'form' }))
    ];

    useEffect(() => {
        const type = directType;
        const id = directId;

        if (type && id) {
            const targetId = `${type}-${id}`;
            const attemptScroll = () => {
                const element = document.getElementById(targetId);
                if (element) {
                    setTimeout(() => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 200);
                    return true;
                }
                return false;
            };

            if (attemptScroll()) return;
            const interval = setInterval(() => {
                if (attemptScroll()) clearInterval(interval);
            }, 250);
            const timeout = setTimeout(() => clearInterval(interval), 5000);
            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [directType, directId, location.search, volunteerGigs, guestlists, forms, campaigns]);

    const handleShare = async (type, id) => {
        const isFormType = type === 'form';
        const url = isFormType ? `${window.location.origin}/forms/${id}` : `${window.location.origin}/community?${type}=${id}`;
        
        let shareTitle = 'Newbi Tribe Opportunity';
        let shareDesc = 'Exclusive community opportunity at Newbi Entertainment.';

        let targetItem = null;
        if (isFormType) {
            targetItem = (forms || []).find(f => f.id === id);
        } else if (type === 'gig') {
            targetItem = (volunteerGigs || []).find(g => g.id === id);
        } else if (type === 'gl') {
            targetItem = (guestlists || []).find(g => g.id === id);
        } else if (type === 'campaign') {
            targetItem = (campaigns || []).find(c => c.id === id);
        }

        if (targetItem) {
            shareTitle = `${targetItem.title} | Newbi`;
            if (targetItem.description) {
                shareDesc = targetItem.description;
            }
        }

        const shareMessage = `${shareTitle}\n\n${shareDesc}\n\nDirect Link: ${url}`;

        // Always copy link to clipboard first so user can paste it anywhere
        try {
            await navigator.clipboard.writeText(url);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(null), 3000);
        } catch (clipErr) {
            console.warn("Clipboard copy warning:", clipErr);
        }

        // Attempt rich image capture and file share
        try {
            const targetDomId = `${type}-${id}`;
            const cardElement = document.getElementById(targetDomId);
            let imageFile = null;

            if (cardElement) {
                try {
                    const canvas = await html2canvas(cardElement, {
                        useCORS: true,
                        scale: 2,
                        backgroundColor: '#020202',
                        logging: false
                    });
                    const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
                    if (imageBlob) {
                        const cleanFileName = (targetItem?.title || 'newbi_community').replace(/[^a-zA-Z0-9]/g, '_');
                        imageFile = new File([imageBlob], `${cleanFileName}.png`, { type: 'image/png' });
                    }
                } catch (canvasErr) {
                    console.warn("Canvas capture warning:", canvasErr);
                }
            }

            if (navigator.share) {
                if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
                    await navigator.share({
                        title: shareTitle,
                        text: shareMessage,
                        url: url,
                        files: [imageFile]
                    });
                } else {
                    await navigator.share({
                        title: shareTitle,
                        text: shareMessage,
                        url: url
                    });
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.warn("Share error:", err);
            }
        }
    };

    const handleGLJoin = (gl) => {
        if (!user) {
            setAuthModal(true);
            return;
        }
        const mappedEvent = {
            ...gl,
            isGuestlistEnabled: true,
            isTicketed: false
        };
        setSelectedGL(mappedEvent);
        setIsGLModalOpen(true);
    };

    const handleCardAction = (item) => {
        if (!user) {
            setAuthModal(true);
            return;
        }
        const type = item.type || '';
        
        if (type === 'gl' || type === 'gl_embed') {
            handleGLJoin(item);
        } else if (type === 'form') {
            navigate(`/forms/${item.id}`);
        } else if (type === 'campaign') {
            navigate(`/campaign/${item.id}`);
        } else if (type === 'gig') {
            if (item.applyType === 'whatsapp') {
                const phone = item.applyLink?.replace(/[^0-9]/g, '');
                window.open(`https://wa.me/${phone || item.applyLink}`, '_blank');
            } else if (item.applyLink) {
                window.open(item.applyLink, '_blank');
            }
        }
    };

    const handleJoinedConfirm = async () => {
        setConfirming(true);
        try { await markFormAsSubmitted(); } 
        catch (error) { useStore.getState().addToast("Couldn't verify your code. Please try again.", 'error'); } 
        finally { setConfirming(false); }
    };

    const handleWhatsappJoined = async () => {
        setVerifyingWhatsapp(true);
        try {
            await markWhatsappJoined();
        } catch (error) {
            useStore.getState().addToast("Couldn't verify. Please try again.", 'error');
        } finally {
            setVerifyingWhatsapp(false);
        }
    };

    const sections = [
        { id: 'volunteer-gigs', title: 'Volunteer Gigs', icon: Users, accent: 'neon-green', items: (volunteerGigs || []), type: 'gig', label: null, show: siteSettings?.showVolunteerGigs !== false, subtitleText: 'field opportunities' },
        { 
            id: 'guestlists', 
            title: 'Exclusive Guestlists', 
            icon: ShieldCheck, 
            accent: 'neon-blue', 
            items: [
                ...(guestlists || []).map(gl => ({ ...gl, type: 'gl' })),
                ...(volunteerGigs || []).filter(gig => gig.guestlistEnabled).map(gig => ({ ...gig, type: 'gl_embed' }))
            ].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)), 
            type: 'gl', 
            label: null, 
            show: true, 
            subtitleText: 'verified entry' 
        },
        { id: 'community-pulse', title: 'Community Forms', icon: FileText, accent: 'neon-pink', items: (forms || []), type: 'form', label: null, show: true, subtitleText: 'active entry portals' }
    ].filter(s => s.show);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark text-gray-900 dark:text-white pt-32 pb-20 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[150px] opacity-20" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-neon-pink/5 rounded-full blur-[150px] opacity-10" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6 md:px-8">
                {/* Immersive Header */}
                <div className="text-center relative overflow-hidden mb-12 md:mb-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 md:w-64 h-48 md:h-64 bg-neon-pink/8 blur-[80px] md:blur-[100px] pointer-events-none rounded-full" />

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-5xl sm:text-7xl md:text-8xl font-extrabold font-heading text-transparent bg-clip-text bg-gradient-to-r from-gray-950 via-gray-800 to-gray-500 dark:from-white dark:via-white to-gray-400 mb-4 md:mb-6 tracking-tight leading-tight text-center px-10 overflow-visible"
                    >
                        {user ? (
                            <>Hello, {user.displayName?.split(' ')[0]}</>
                        ) : (
                            <>The Tribe.</>
                        )}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto text-sm md:text-lg font-semibold leading-relaxed tracking-wide px-4"
                    >
                        {user ? "Exclusive opportunities await." : "Join India's most disruptive youth community."}
                    </motion.p>
                </div>

                {(user && !hasJoined && siteSettings.enableTribeForm !== false) ? (
                    <section className="space-y-12">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-neon-blue text-black flex items-center justify-center font-extrabold text-2xl shadow-[0_0_30px_rgba(0,255,255,0.3)]">01</div>
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white">Registration.</h2>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Complete the form below to join the tribe</p>
                                </div>
                            </div>

                            {/* Signed-in User Badge */}
                            <div className="mb-6 p-4 bg-gray-100 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-2xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
                                    <ShieldCheck size={14} className="text-neon-green" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Signed in as</p>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user.displayName || user.email}</p>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-2 bg-gradient-to-r from-neon-pink via-neon-blue to-neon-green rounded-[2.5rem] md:rounded-[3.5rem] blur-2xl opacity-5 group-hover:opacity-20 transition duration-1000" />
                                <div className="relative bg-white dark:bg-zinc-950 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-black/10 dark:border-white/5 shadow-2xl">
                                    {/* Loading State */}
                                    {!registrationLoaded && (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 gap-4">
                                            <Loader2 size={28} className="animate-spin text-gray-400" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading Registration Form</p>
                                        </div>
                                    )}
                                    <div className="form-iframe-wrapper">
                                        <iframe
                                            src={tribeFormUrl}
                                            className="w-full border-0 transition-opacity duration-500"
                                            style={{ 
                                                minHeight: '80vh',
                                                height: '900px',
                                                opacity: registrationLoaded ? 1 : 0
                                            }}
                                            title="Newbi Tribe Registration"
                                            onLoad={() => setRegistrationLoaded(true)}
                                            allow="camera; microphone"
                                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 md:mt-16 p-8 md:p-12 bg-gray-100 dark:bg-slate-900/40 border border-black/10 dark:border-white/5 rounded-[2rem] md:rounded-[2.5rem] backdrop-blur-3xl text-center relative overflow-hidden shadow-2xl">
                                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-neon-green blur-[80px] opacity-10" />
                                <CheckCircle2 size={36} className="text-neon-green mx-auto mb-4" />
                                <h3 className="text-2xl md:text-3xl font-extrabold font-heading text-gray-900 dark:text-white mb-3">Submitted the form?</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-8 md:mb-10 max-w-sm mx-auto font-medium tracking-tight text-sm">Click below to finalize your entry and unlock the community hub.</p>
                                <Button
                                    onClick={handleJoinedConfirm}
                                    disabled={confirming}
                                    className="h-16 md:h-20 px-12 md:px-16 rounded-xl font-bold tracking-wider bg-neon-green text-black shadow-[0_10px_30px_rgba(46,255,144,0.2)]"
                                >
                                    {confirming ? <Loader2 className="animate-spin" /> : 'Submit Application'}
                                </Button>
                            </div>
                        </div>
                    </section>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-24 pb-20">
                         {/* 0. Featured Spotlight (Top of the Page) */}
                         {featuredItems.length > 0 && (
                              <section id="featured" className="scroll-mt-32 relative py-20 px-8 rounded-[4rem] bg-white/[0.01] border border-white/[0.03] overflow-hidden group/featured">
                                  {/* Cinematic Spotlight Accents */}
                                  <div 
                                      className="absolute top-0 right-0 w-[50%] h-[50%] blur-[120px] opacity-0 group-hover/featured:opacity-100 transition-all duration-1000" 
                                      style={{ backgroundColor: `${featuredItems[0]?.highlightColor || '#2ebfff'}15` }}
                                  />
                                  <div 
                                      className="absolute bottom-0 left-0 w-[50%] h-[50%] blur-[120px] opacity-0 group-hover/featured:opacity-30 transition-all duration-1000" 
                                      style={{ backgroundColor: `${featuredItems[0]?.highlightColor || '#FF4F8B'}15` }}
                                  />
                                  
                                  <div className="relative z-10">
                                      <div className="flex items-center gap-6 mb-16">
                                          <div 
                                              className="w-16 h-16 rounded-2xl text-black flex items-center justify-center shrink-0 transition-all duration-700"
                                              style={{ 
                                                  backgroundColor: featuredItems[0]?.highlightColor || '#2ebfff',
                                                  boxShadow: `0 0 30px ${(featuredItems[0]?.highlightColor || '#2ebfff')}50`
                                              }}
                                          >
                                              <Star size={32} className="fill-black" />
                                          </div>
                                          <div>
                                              <h2 className="text-4xl md:text-6xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white leading-none">
                                                  Featured
                                              </h2>
                                              <div className="flex items-center gap-3 mt-2">
                                                  <div className="h-[1px] w-8 transition-all duration-700" style={{ backgroundColor: featuredItems[0]?.highlightColor || '#2ebfff' }} />
                                                  <p className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-[0.2em]">
                                                      SPOTLIGHT SELECTIONS
                                                  </p>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="relative group/carousel">
                                          {/* Navigation Arrows */}
                                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 flex opacity-0 group-hover/carousel:opacity-100 transition-opacity pointer-events-none">
                                              <button onClick={(e) => { e.stopPropagation(); scrollContainer('featured-scroll', 'left'); }} className="w-10 h-10 rounded-xl bg-white dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white pointer-events-auto shadow-2xl">
                                                  <ChevronRight className="rotate-180" size={20} />
                                              </button>
                                          </div>
                                          <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 flex opacity-0 group-hover/carousel:opacity-100 transition-opacity pointer-events-none">
                                              <button onClick={(e) => { e.stopPropagation(); scrollContainer('featured-scroll', 'right'); }} className="w-10 h-10 rounded-xl bg-white dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white pointer-events-auto shadow-2xl">
                                                  <ChevronRight size={20} />
                                              </button>
                                          </div>

                                          <div id="featured-scroll" className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 pb-12 md:pb-0 snap-x horizontal-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                                                  {featuredItems.map((item) => (
                                                      <motion.div 
                                                          key={`featured-${item.id}`}
                                                          id={`${item.type}-${item.id}`}
                                                          initial={{ opacity: 0, y: 30 }}
                                                      whileInView={{ opacity: 1, y: 0 }}
                                                      viewport={{ once: true }}
                                                      className="relative w-[80vw] sm:w-[300px] md:w-full flex-shrink-0 snap-center md:snap-none"
                                                  >
                                                      <CommunityCard 
                                                          item={item} 
                                                          type={item.type} 
                                                          handleShare={handleShare} 
                                                          onAction={handleCardAction}
                                                      />
                                                  </motion.div>
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                              </section>
                          )}

                          {/* 1. Status UI & Quick Join */}
                          {!user?.hasJoinedWhatsapp && (
                              <section className="max-w-6xl">
                                  <div className="bg-gray-100 dark:bg-slate-900/30 border border-black/10 dark:border-white/5 rounded-[3rem] p-6 lg:p-10 md:p-16 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group backdrop-blur-3xl shadow-2xl hover:border-black/10 dark:hover:border-white/10 transition-all duration-300">
                                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-neon-green/5 blur-[100px] pointer-events-none" />
                                     <div className="w-24 h-24 bg-neon-green rounded-[2rem] flex items-center justify-center text-black shadow-[0_0_50px_rgba(57,255,20,0.3)] shrink-0">
                                         <CheckCircle2 size={40} />
                                     </div>
                                     <div className="flex-1 text-center md:text-left relative z-10 mx-auto max-w-[95%]">
                                          <h3 className="text-2xl md:text-3xl font-extrabold font-heading text-gray-900 dark:text-white mb-4 leading-tight pr-4">Your Tribe Access is Active.</h3>
                                         <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base font-medium leading-relaxed tracking-tight">Join the primary communication channel below for instant updates.</p>
                                     </div>
                                     {!clickedWhatsApp ? (
                                         <a 
                                             href={siteDetails.whatsappCommunity || "#"} 
                                             target="_blank" 
                                             rel="noreferrer"
                                             onClick={() => setClickedWhatsApp(true)}
                                             className="w-full md:w-auto px-8 sm:px-12 h-16 bg-white text-black rounded-xl flex items-center justify-center font-bold tracking-wider text-sm md:text-base hover:scale-105 transition-all relative z-10 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                                         >
                                             WhatsApp Connection
                                         </a>
                                     ) : (
                                         <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0 relative z-10">
                                             <button 
                                                 onClick={handleWhatsappJoined}
                                                 disabled={verifyingWhatsapp}
                                                 className="w-full md:w-auto px-8 sm:px-12 h-16 bg-neon-blue text-black rounded-xl flex items-center justify-center font-bold tracking-wider text-sm md:text-base hover:scale-[1.02] transition-all shadow-[0_15px_40px_rgba(0,255,255,0.2)] disabled:opacity-50"
                                             >
                                                 {verifyingWhatsapp ? <Loader2 className="animate-spin" size={24} /> : "I've Joined the Hub"}
                                             </button>
                                         </div>
                                     )}
                                  </div>
                              </section>
                          )}

                         {/* 2. Active Giveaway Banner */}
                         <AnimatePresence>
                             {activeGiveaway && (
                                 <section className="w-full">
                                     <motion.div 
                                         initial={{ opacity: 0, scale: 0.95 }}
                                         animate={{ opacity: 1, scale: 1 }}
                                         className="group relative block overflow-hidden rounded-[3rem] border border-purple-500/15 bg-purple-600/[0.04] p-1 md:p-2 backdrop-blur-3xl shadow-2xl shadow-purple-500/5 hover:border-purple-500/25 transition-all duration-300"
                                     >
                                         <Link to={`/giveaway/${activeGiveaway.slug}`} className="flex flex-col md:flex-row items-center gap-10 p-8 md:p-14">
                                             <div className="w-24 h-24 rounded-[2rem] bg-purple-600 flex items-center justify-center text-gray-900 dark:text-white shadow-2xl shadow-purple-500/40 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                                                 <Gift size={48} />
                                             </div>
                                             <div className="flex-1 text-center md:text-left space-y-4">
                                                 <div className="inline-flex px-4 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-[9px] font-bold uppercase tracking-[0.15em] border border-purple-500/20">
                                                     LIMITED OPPORTUNITY
                                                 </div>
                                                  <h3 className="text-3xl md:text-4xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white leading-tight">
                                                      Win <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 dark:from-white to-purple-500">{activeGiveaway.name}</span>
                                                  </h3>
                                                 <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-400 max-w-2xl tracking-tight leading-relaxed">
                                                     Exclusive rewarding for the Tribe. Participate, refer, and win.
                                                 </p>
                                             </div>
                                             <div className="w-full md:w-auto h-16 flex justify-center items-center gap-4 px-6 md:px-10 bg-purple-600 text-gray-900 dark:text-white rounded-xl font-bold tracking-wider text-xs md:text-sm shadow-2xl group-hover:gap-8 transition-all shrink-0">
                                                 Participate Now <ArrowRight size={20} />
                                             </div>
                                         </Link>
                                     </motion.div>
                                 </section>
                             )}
                         </AnimatePresence>

                         {/* 3. Unified Feed Sections */}
                         <div className="space-y-32">
                             {sections.map((section) => (
                                 <section key={section.id} id={section.id} className="scroll-mt-32">
                                     <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-4 md:px-0">
                                         <div className="space-y-4">
                                             <div className="flex items-center gap-3">
                                                 <div className={cn(
                                                     "w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-xl",
                                                     section.accent === 'neon-blue' ? "bg-neon-blue/10 border-neon-blue/20 text-neon-blue" : 
                                                     (section.accent === 'neon-green' ? "bg-neon-green/10 border-neon-green/20 text-neon-green" : 
                                                     "bg-neon-pink/10 border-neon-pink/20 text-neon-pink")
                                                 )}>
                                                     <section.icon size={22} />
                                                 </div>
                                                 {section.label && (
                                                     <span className={cn(
                                                         "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border backdrop-blur-md",
                                                         section.accent === 'neon-blue' ? "bg-neon-blue/10 text-neon-blue border-neon-blue/20" : 
                                                         (section.accent === 'neon-green' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : 
                                                         "bg-neon-pink/10 text-neon-pink border-neon-pink/20")
                                                     )}>
                                                         {section.label}
                                                     </span>
                                                 )}
                                             </div>
                                             <div>
                                                  <h2 className="text-3xl md:text-4xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white leading-none pb-2 pr-4">
                                                      {section.title}
                                                  </h2>
                                                 <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] pl-1">
                                                     {section.items?.length || 0} {section.subtitleText}
                                                 </p>
                                             </div>
                                         </div>
                                     </div>

                                     <div className="relative group/section-carousel">
                                          {/* Navigation Arrows */}
                                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 flex opacity-0 group-hover/section-carousel:opacity-100 transition-opacity pointer-events-none">
                                              <button onClick={(e) => { e.stopPropagation(); scrollContainer(`scroll-${section.id}`, 'left'); }} className="w-10 h-10 rounded-xl bg-white dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white pointer-events-auto shadow-2xl">
                                                  <ChevronRight className="rotate-180" size={20} />
                                              </button>
                                          </div>
                                          <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 flex opacity-0 group-hover/section-carousel:opacity-100 transition-opacity pointer-events-none">
                                              <button onClick={(e) => { e.stopPropagation(); scrollContainer(`scroll-${section.id}`, 'right'); }} className="w-10 h-10 rounded-xl bg-white dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white pointer-events-auto shadow-2xl">
                                                  <ChevronRight size={20} />
                                              </button>
                                          </div>

                                          {section.items?.length > 0 ? (
                                              <div id={`scroll-${section.id}`} className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 pb-12 md:pb-0 snap-x horizontal-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                                                  {section.items.map((item) => (
                                                      <motion.div 
                                                          key={`${section.id}-${item.id}`}
                                                          id={`${item.type || section.type}-${item.id}`}
                                                          initial={{ opacity: 0, y: 30 }}
                                                          whileInView={{ opacity: 1, y: 0 }}
                                                          viewport={{ once: true }}
                                                          className="w-[80vw] sm:w-[300px] md:w-full flex-shrink-0 snap-center md:snap-none"
                                                      >
                                                          <CommunityCard 
                                                              item={item} 
                                                              type={item.type || section.type} 
                                                              handleShare={handleShare} 
                                                              onAction={handleCardAction}
                                                          />
                                                      </motion.div>
                                                  ))}
                                              </div>
                                          ) : (
                                              <div className="py-24 bg-gray-100 dark:bg-slate-900/10 rounded-3xl border border-dashed border-black/10 dark:border-white/5 text-center flex flex-col items-center gap-6">
                                                  <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-gray-700">
                                                      <section.icon size={30} />
                                                  </div>
                                                  <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">No active {section.title.toLowerCase()} at the moment.</p>
                                              </div>
                                          )}
                                     </div>
                                 </section>
                             ))}
                         </div>
                     </motion.div>
                )}
            </div>

            <EventTicketingModal 
                isOpen={isGLModalOpen} 
                onClose={() => {
                    setIsGLModalOpen(false);
                    setSelectedGL(null);
                }} 
                event={selectedGL} 
            />

            {/* Share Success Toast */}
            <AnimatePresence>
                {showShareToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed bottom-12 inset-x-0 mx-auto w-fit z-[100] px-8 py-4 bg-gray-100 dark:bg-slate-950/80 border border-black/10 dark:border-white/5 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-3xl"
                    >
                        <div className="w-2 h-2 rounded-full bg-neon-green" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-900 dark:text-white">Access Link Copied</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CommunityJoin;
