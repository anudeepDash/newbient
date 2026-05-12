import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Calendar, MapPin, Ticket, Plus, Minus, ArrowRight, 
    ChevronLeft, Loader2, CheckCircle2, ShieldCheck, Zap,
    Info, CreditCard, Lock, Share2, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useStore } from '../../lib/store';
import { db, auth } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import html2canvas from 'html2canvas';
import LoadingSpinner from '../ui/LoadingSpinner';

const EventTicketingModal = ({ isOpen, onClose, event, isEmbedded = false }) => {
    const user = useStore(state => state.user);
    const setAuthModal = useStore(state => state.setAuthModal);

    if (!event && isOpen) {
        return null; // Don't render if open but no event data
    }
    
    // Core state
    const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' or 'guestlist'
    const [step, setStep] = useState('selection'); // map, selection, identity, otp, payment, success
    
    // Setup tabs based on event config
    const hasTickets = event?.isTicketed;
    const hasGuestlist = event?.isGuestlistEnabled;
    const hasLayout = !!event?.venueLayout;
    const hasCategories = event?.ticketCategories?.length > 0;

    // Ticketing state
    const [cart, setCart] = useState({});
    const [guestCount, setGuestCount] = useState(1);
    const [ticketCount, setTicketCount] = useState(1); // For events without categories
    const [selectedMapCategory, setSelectedMapCategory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingRef, setBookingRef] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        name: user?.displayName || '',
        email: user?.email || '',
        phone: user?.phoneNumber || ''
    });

    // OTP states
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [countryCode, setCountryCode] = useState('+91');
    const [otpCode, setOtpCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

    // Payment state
    const [paymentRef, setPaymentRef] = useState('');
    const [lockedAmount, setLockedAmount] = useState(0); // Security: Lock price before payment
    const [showUpiGuide, setShowUpiGuide] = useState(false);
    
    // Coupon state
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    
    // Zoom state for map
    const [zoom, setZoom] = useState(1);
    const handleZoomIn = () => setZoom(prev => Math.min(3, prev + 0.25));
    const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.25));
    const handleReset = () => setZoom(1);
    
    // UI Expand states
    const [infoPopup, setInfoPopup] = useState(null); // { title: string, content: string, icon: any, color: string }
    
    // Robust initialization tracking
    const lastInitId = useRef(null);
    
    const globalPaymentDetails = useStore(state => state.paymentDetails);
    const upiId = event?.upiId || event?.paymentDetails?.upiId || globalPaymentDetails?.upiId || 'newbi@upi';
    const qrCodeUrl = event?.qrCodeUrl || globalPaymentDetails?.qrCodeUrl;

    useEffect(() => {
        if (isOpen && lastInitId.current !== event?.id) {
            if (hasTickets) setActiveTab('tickets');
            else if (hasGuestlist) setActiveTab('guestlist');
            
            // Start with map if layout exists, otherwise selection
            setStep(hasLayout && hasTickets ? 'map' : 'selection');
            setCart({});
            setSelectedMapCategory(null);
            setTicketCount(1);
            setGuestCount(1);
            setFormData({
                name: user?.displayName || '',
                email: user?.email || '',
                phone: user?.phoneNumber?.replace(/^\+\d{2}/, '') || ''
            });
            setConfirmationResult(null);
            setOtpCode('');
            setPaymentRef('');
            setAppliedCoupon(null);
            setCouponInput('');
            setLoading(false);
            setVerifying(false);
            setBookingRef(null);
            
            lastInitId.current = event?.id;
        }

        // Reset if modal is closed
        if (!isOpen) {
            lastInitId.current = null;
        }
    }, [isOpen, event?.id]);

    // Non-destructive update of form data when user logs in or profile updates
    useEffect(() => {
        if (isOpen && user) {
            setFormData(prev => ({
                name: prev.name || user.displayName || '',
                email: prev.email || user.email || '',
                phone: prev.phone || user.phoneNumber?.replace(/^\+\d{2}/, '') || ''
            }));
        }
    }, [user, isOpen]);

    const updateCart = (categoryId, delta) => {
        setCart(prev => {
            const nextCart = { ...prev };
            
            // If selecting a NEW category on a map event, clear others
            // but if it's the SAME category, just update the count
            if (hasLayout && delta > 0 && !prev[categoryId]) {
                Object.keys(nextCart).forEach(key => delete nextCart[key]);
            }
            
            const current = nextCart[categoryId] || 0;
            const next = Math.max(0, current + delta);
            
            if (next === 0) {
                const { [categoryId]: _, ...rest } = nextCart;
                return rest;
            }
            return { ...nextCart, [categoryId]: next };
        });
    };

    const cartTotalCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
    const totalAmount = useMemo(() => {
        if (!event) return 0;
        let amount = 0;
        if (!hasCategories) {
            amount = ticketCount * (event.basePrice || 0);
        } else {
            amount = Object.entries(cart).reduce((total, [id, count]) => {
                const cat = event.ticketCategories?.find(c => c.id === id);
                return total + (cat?.price || 0) * count;
            }, 0);
        }

        if (appliedCoupon && amount > 0) {
            if (appliedCoupon.discountType === 'percentage') {
                const discount = (amount * appliedCoupon.discountValue) / 100;
                amount = Math.max(0, amount - discount);
            } else if (appliedCoupon.discountType === 'flat') {
                amount = Math.max(0, amount - appliedCoupon.discountValue);
            }
        }

        return amount;
    }, [cart, event, hasCategories, ticketCount, appliedCoupon]);

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setIsValidatingCoupon(true);
        try {
            const coupon = await useStore.getState().validateCoupon(couponInput.trim(), event.id);
            setAppliedCoupon(coupon);
            useStore.getState().addToast("Coupon applied successfully!", 'success');
        } catch (error) {
            useStore.getState().addToast(error.message, 'error', 'TKT-CPN-01');
            setAppliedCoupon(null);
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponInput('');
    };

    const setupRecaptcha = async () => {
        if (window.recaptchaVerifier) return window.recaptchaVerifier;
        
        try {
            const { RecaptchaVerifier } = await import('firebase/auth');
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {}
            });
            await verifier.render();
            window.recaptchaVerifier = verifier;
            return verifier;
        } catch (error) {
            console.error("Recaptcha error:", error);
            return null;
        }
    };

    useEffect(() => {
        if (auth && !window.recaptchaVerifier) {
            setupRecaptcha();
        }
        return () => {
            if (window.recaptchaVerifier) {
                try { window.recaptchaVerifier.clear(); } catch(e) {}
                window.recaptchaVerifier = null;
            }
        };
    }, [auth]);

    const handleSendOTP = async () => {
        if (!formData.phone || formData.phone.length < 10) {
            return useStore.getState().addToast("Please enter a valid 10-digit phone number.", 'error', 'TKT-VAL-01');
        }

        setLoading(true);
        try {
            const verifier = await setupRecaptcha();
            if (!verifier) throw new Error("Verification system failed to initialize.");

            const cleanPhone = formData.phone.trim().replace(/\D/g, '');
            const phoneNumber = `${countryCode}${cleanPhone}`;

            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
            setConfirmationResult(confirmation);
            setStep('otp');
            useStore.getState().addToast("Verification code sent!", 'success');
        } catch (error) {
            console.error("OTP Error:", error);
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.render().then(widgetId => {
                    window.grecaptcha.reset(widgetId);
                });
            }
            useStore.getState().addToast(error.message || "We couldn't send your verification code. Please check your connection.", 'error', 'TKT-OTP-01');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otpCode.length !== 6 || !confirmationResult) return;
        setVerifying(true);
        
        // Capture totalAmount before await to ensure we use the correct value 
        // even if a re-render/store-update happens during verification
        const currentAmount = totalAmount;

        try {
            await confirmationResult.confirm(otpCode);
            useStore.getState().addToast("Phone verified!", 'success');
            
            // Save phone to profile if user exists
            if (user?.uid) {
                const verifiedPhone = `${countryCode}${formData.phone}`;
                await useStore.getState().updateUserProfile(user.uid, { phoneNumber: verifiedPhone });
            }
            
            if (activeTab === 'tickets') {
                if (currentAmount === 0) submitTickets();
                else {
                    setLockedAmount(currentAmount); // Lock the price
                    setStep('payment');
                }
            } else {
                submitGuestlist();
            }
        } catch (error) {
            console.error("Verification error:", error);
            useStore.getState().addToast("Invalid code. Please double-check and try again.", 'error', 'TKT-OTP-02');
        } finally {
            setVerifying(false);
        }
    };

    const submitGuestlist = async () => {
        setLoading(true);
        try {
            const ref = `NB-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            await addDoc(collection(db, 'guestlists'), {
                eventId: event?.id,
                userId: user?.uid || null,
                customerName: formData.name,
                customerEmail: formData.email,
                customerPhone: `${countryCode}${formData.phone}`,
                guestCount,
                bookingRef: ref,
                createdAt: serverTimestamp(),
                status: 'confirmed'
            });
            setBookingRef(ref);
            setStep('success');
        } catch (error) {
            console.error("Guestlist error:", error);
            useStore.getState().addToast("We couldn't complete your guestlist request. Please try again later.", 'error', 'TKT-GST-01');
        } finally {
            setLoading(false);
        }
    };

    const submitTickets = async () => {
        if (totalAmount > 0 && !paymentRef.trim()) {
            return useStore.getState().addToast("Please enter the payment reference/UTR number.", 'error', 'TKT-VAL-04');
        }

        setLoading(true);
        try {
            // 1. DEDUPLICATION CHECK: Check if this payment reference was used before
            if (totalAmount > 0) {
                const { query, collection, where, getDocs } = await import('firebase/firestore');
                const q = query(collection(db, 'ticket_orders'), where('paymentRef', '==', paymentRef.trim()));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setLoading(false);
                    return useStore.getState().addToast("This payment reference has already been used. Please provide a valid UTR.", 'error', 'TKT-PAY-02');
                }
            }

            const ref = `NB-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            const orderData = {
                eventId: event?.id,
                userId: user?.uid || null,
                customerName: formData.name,
                customerEmail: formData.email,
                customerPhone: `${countryCode}${formData.phone}`,
                items: hasCategories 
                    ? Object.entries(cart).map(([id, count]) => {
                        const cat = event.ticketCategories?.find(c => c.id === id);
                        return { id, name: cat?.name || 'Category', count, price: cat?.price || 0 };
                    })
                    : [{ id: 'base', name: 'Standard', count: ticketCount, price: event.basePrice || 0 }],
                totalAmount: lockedAmount || totalAmount, // Use locked amount for security
                paymentRef: totalAmount > 0 ? paymentRef.trim() : 'FREE',
                bookingRef: ref,
                appliedCoupon: appliedCoupon ? {
                    id: appliedCoupon.id,
                    code: appliedCoupon.code,
                    discountValue: appliedCoupon.discountValue,
                    discountType: appliedCoupon.discountType
                } : null,
                createdAt: serverTimestamp(),
                status: totalAmount > 0 ? 'pending' : 'confirmed'
            };
            await addDoc(collection(db, 'ticket_orders'), orderData);
            
            // Increment coupon usage
            if (appliedCoupon) {
                const { increment, updateDoc, doc } = await import('firebase/firestore');
                await updateDoc(doc(db, 'coupons', appliedCoupon.id), {
                    usedCount: increment(1)
                });
            }

            setBookingRef(ref);
            setStep('success');
        } catch (error) {
            console.error("Ticketing error:", error);
            useStore.getState().addToast("Your booking couldn't be processed. If payment was made, don't worry—contact support.", 'error', 'TKT-PAY-01');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTicket = async () => {
        const element = document.getElementById('ticket-download-surface');
        if (!element) return;
        
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#000000',
                scale: 2,
                useCORS: true,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `NEWBI_PASS_${bookingRef}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Download error:", error);
            useStore.getState().addToast("We couldn't download your pass. You can always find it in your profile.", 'error', 'TKT-DL-01');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleNext = () => {
        if (!user && (step === 'selection' || step === 'map')) {
            setAuthModal(true);
            return;
        }

        if (step === 'map') {
            if (cartTotalCount === 0) {
                return useStore.getState().addToast("Please select a ticket category on the map first.", 'error', 'TKT-MAP-01');
            }
            setStep('selection');
        } else if (step === 'selection') {
            if (activeTab === 'tickets' && cartTotalCount === 0 && hasCategories) {
                return useStore.getState().addToast("Please select at least one ticket to continue.", 'error', 'TKT-VAL-02');
            }
            setStep('identity');
        } else if (step === 'identity') {
            if (!formData.name || !formData.phone || formData.phone.length < 10) {
                return useStore.getState().addToast("Please provide your name and a valid phone number.", 'error', 'TKT-VAL-03');
            }
            handleSendOTP();
        }
    };

    const handleBack = () => {
        if (step === 'selection') {
            if (hasLayout && activeTab === 'tickets') setStep('map');
        }
        else if (step === 'identity') setStep('selection');
        else if (step === 'otp') setStep('identity');
        else if (step === 'payment') setStep('identity');
    };

    const modalContent = (
        <>
            <motion.div
                initial={isEmbedded ? {} : (window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 })}
                animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={isEmbedded ? {} : (window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 })}
                className={cn(
                    "relative w-full bg-zinc-950 border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row transition-all",
                    isEmbedded ? "h-full w-full border-0 shadow-none rounded-0" : "max-w-5xl h-[95vh] md:h-[800px] rounded-t-[2.5rem] md:rounded-[4rem]"
                )}
            >
            {/* Left Sidebar: Event Brief & Guidelines */}
            {!isEmbedded && (
                <div className="hidden lg:flex w-[320px] bg-black border-r border-white/5 shrink-0 flex-col relative overflow-hidden">
                    <img 
                        src={event?.hubImage || event?.image} 
                        className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale hover:grayscale-0 transition-all duration-1000" 
                        alt="Event" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                    <div className="relative z-10 p-8 flex flex-col h-full">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit mb-6">
                            <Zap size={10} className="text-neon-blue" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">OFFICIAL TICKETS</span>
                        </div>
                        
                        <h3 className="text-3xl font-black font-heading text-white italic uppercase tracking-tighter leading-none mb-8">{event?.title}</h3>
                        
                        <div className="space-y-6 flex-1">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-400">
                                    <Calendar size={14} className="text-neon-blue" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{event?.date ? new Date(event.date).toLocaleDateString() : 'TBA'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <MapPin size={14} className="text-neon-pink" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{event?.location || 'VENUE TBA'}</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck size={12} className="text-neon-green" /> GUIDELINES
                                </p>
                                <p className="text-[10px] text-gray-400 leading-relaxed italic">{event?.ticketingDescription || "Standard venue protocols apply. Carry valid ID."}</p>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5">
                            <div className="flex items-center gap-4 text-white/20">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">NEWBI ENT.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950/50 backdrop-blur-xl">
                {!isEmbedded && (
                    <button onClick={onClose} className="absolute top-8 right-8 z-50 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all group">
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                )}

                <div className={cn(
                    "flex-1 overflow-y-auto p-4 md:p-12 scrollbar-hide",
                    isEmbedded && "pt-12 md:pt-16"
                )}>
                    <AnimatePresence mode="wait">
                        {step === 'map' && (
                            <motion.div key="map" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col">
                                <div className="flex items-center justify-between gap-4 mb-6 md:mb-10">
                                    <div className="space-y-1 md:space-y-4">
                                        <h3 className="text-2xl md:text-4xl font-black font-heading text-white italic uppercase tracking-tighter">Select Tickets</h3>
                                        <p className="text-[9px] md:text-xs text-gray-500 uppercase tracking-widest italic leading-relaxed">Choose your preferred ticket categories and quantity below.</p>
                                    </div>
                                    <button 
                                        onClick={() => setStep('selection')}
                                        className="shrink-0 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 text-[9px] md:text-xs font-black text-gray-400 hover:text-white uppercase tracking-widest transition-all"
                                    >
                                        List View
                                    </button>
                                </div>

                                <div className="flex-1 bg-black/40 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 p-0 overflow-auto scrollbar-hide relative shadow-2xl group/map mb-8 min-h-[400px] md:min-h-[450px] flex items-center justify-center">
                                    {/* Instruction Badge */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-none w-full px-4 flex justify-center">
                                        <div className="px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2 shadow-2xl">
                                            <Info size={12} className="text-neon-blue" />
                                            <span className="text-[8px] md:text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                                                Tap zones to select • Toggle List View if needed
                                            </span>
                                        </div>
                                    </div>

                                    {/* Zoom Controls */}
                                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-[60]">
                                        <button onClick={handleZoomIn} className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-md hover:bg-neon-blue hover:text-black transition-all shadow-xl">
                                            <ZoomIn size={18} />
                                        </button>
                                        <button onClick={handleZoomOut} className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-md hover:bg-neon-blue hover:text-black transition-all shadow-xl">
                                            <ZoomOut size={18} />
                                        </button>
                                        <button onClick={handleReset} className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-md hover:bg-neon-blue hover:text-black transition-all shadow-xl">
                                            <Maximize2 size={18} />
                                        </button>
                                    </div>

                                    <motion.div 
                                        animate={{ scale: zoom }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="relative inline-block origin-center"
                                    >
                                        <img src={event?.venueLayout} alt="Venue Map" className="block max-w-full max-h-full h-auto w-auto md:h-full md:w-auto mx-auto" />
                                        <div className="absolute inset-0">
                                            {event?.ticketCategories?.map(cat => (cat.mapping || cat.coords) && (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setSelectedMapCategory(cat.id);
                                                        updateCart(cat.id, 1);
                                                        setStep('selection');
                                                    }}
                                                    className={cn(
                                                        "absolute flex flex-col items-center justify-center transition-all border-2",
                                                        (selectedMapCategory === cat.id || (cart[cat.id] || 0) > 0) ? "z-50 ring-4 ring-white/30 scale-[1.05]" : "hover:scale-[1.02] opacity-100"
                                                    )}
                                                    style={{
                                                        left: `${cat.mapping?.x || cat.coords?.x || 0}%`,
                                                        top: `${cat.mapping?.y || cat.coords?.y || 0}%`,
                                                        width: cat.mapping ? `${cat.mapping.width}%` : '40px',
                                                        height: cat.mapping ? `${cat.mapping.height}%` : '40px',
                                                        backgroundColor: cat.color || '#2ebfff',
                                                        borderColor: 'rgba(255,255,255,0.4)',
                                                        marginLeft: cat.mapping ? '0' : '-20px',
                                                        marginTop: cat.mapping ? '0' : '-20px',
                                                        borderRadius: cat.mapping ? '6px' : '9999px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                                    }}
                                                >
                                                    <span className="text-[9px] md:text-[11px] font-black text-white uppercase truncate px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{cat.name}</span>
                                                    <span className="text-[11px] md:text-[13px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">₹{cat.price}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>

                                <Button 
                                    onClick={handleNext} 
                                    disabled={cartTotalCount === 0}
                                    className="h-16 md:h-20 bg-neon-blue text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-2xl md:rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"
                                >
                                    PROCEED TO TICKETS
                                    <ArrowRight size={20} />
                                </Button>
                            </motion.div>
                        )}

                        {step === 'selection' && (
                            <motion.div key="selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex, flex-col">
                                {hasLayout && activeTab === 'tickets' && (
                                    <button onClick={handleBack} className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all mb-8">
                                        <ChevronLeft size={14} /> Back to Map
                                    </button>
                                )}

                                {hasTickets && hasGuestlist && (
                                    <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 mb-8 w-fit mx-auto">
                                        <button onClick={() => setActiveTab('tickets')} className={cn("px-8 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'tickets' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white")}>TICKETS</button>
                                        <button onClick={() => setActiveTab('guestlist')} className={cn("px-8 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'guestlist' ? "bg-neon-pink text-black" : "text-gray-500 hover:text-white")}>GUESTLIST</button>
                                    </div>
                                )}

                                <div className="flex flex-col gap-8 flex-1 min-h-0">
                                    <div className="relative z-10 flex flex-col h-full p-4 md:p-12 pt-6 md:pt-12 overflow-y-auto scrollbar-hide space-y-8 pr-2">
                                        {/* Event Brief & Rules */}
                                        {(event?.ticketingDescription || event?.ticketingRules) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {event?.ticketingDescription && (
                                                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl space-y-3 group/info hover:bg-white/[0.05] transition-all cursor-default">
                                                        <div className="flex items-center gap-2 text-neon-blue opacity-50 group-hover/info:opacity-100 transition-all">
                                                            <Info size={14} />
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Overview</span>
                                                        </div>
                                                        <div className="relative">
                                                            <p className="text-[11px] text-gray-400 leading-relaxed italic line-clamp-3">
                                                                {event.ticketingDescription}
                                                            </p>
                                                            {event.ticketingDescription.length > 100 && (
                                                                <button 
                                                                    onClick={() => setInfoPopup({ 
                                                                        title: 'Event Overview', 
                                                                        content: event.ticketingDescription, 
                                                                        icon: <Info size={24}/>, 
                                                                        color: 'text-neon-blue' 
                                                                    })}
                                                                    className="text-[9px] font-black text-neon-blue uppercase tracking-widest mt-2 hover:underline flex items-center gap-1"
                                                                >
                                                                    Read More <Maximize2 size={10} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {event?.ticketingRules && (
                                                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl space-y-3 group/rules hover:bg-white/[0.05] transition-all cursor-default">
                                                        <div className="flex items-center gap-2 text-neon-pink opacity-50 group-hover/rules:opacity-100 transition-all">
                                                            <ShieldCheck size={14} />
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Rules & Policy</span>
                                                        </div>
                                                        <div className="relative">
                                                            <div className="text-[11px] text-gray-400 leading-relaxed italic line-clamp-3 whitespace-pre-line">
                                                                {event.ticketingRules}
                                                            </div>
                                                            {event.ticketingRules.length > 100 && (
                                                                <button 
                                                                    onClick={() => setInfoPopup({ 
                                                                        title: 'Rules & Policy', 
                                                                        content: event.ticketingRules, 
                                                                        icon: <ShieldCheck size={24}/>, 
                                                                        color: 'text-neon-pink' 
                                                                    })}
                                                                    className="text-[9px] font-black text-neon-pink uppercase tracking-widest mt-2 hover:underline flex items-center gap-1"
                                                                >
                                                                    Read More <Maximize2 size={10} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {activeTab === 'guestlist' ? (
                                            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] flex flex-col items-center gap-10">
                                                <div className="text-center">
                                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">Number of Guests</h4>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Maximum 5 per entry</p>
                                                </div>
                                                <span className="text-8xl font-black italic tracking-tighter tabular-nums text-neon-pink drop-shadow-[0_0_20px_rgba(255,46,191,0.3)]">{guestCount}</span>
                                                <div className="flex gap-10">
                                                    <button onClick={() => setGuestCount(g => Math.max(1, g - 1))} className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all"><Minus size={28}/></button>
                                                    <button onClick={() => setGuestCount(g => Math.min(5, g + 1))} className="w-20 h-20 rounded-full bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center text-neon-pink hover:bg-neon-pink hover:text-black transition-all"><Plus size={28}/></button>
                                                </div>
                                            </div>
                                        ) : (
                                            hasCategories ? event?.ticketCategories?.filter(cat => 
                                                !hasLayout || cartTotalCount === 0 || cart[cat.id]
                                            ).map(cat => (
                                                <div key={cat.id} className={cn(
                                                    "p-4 md:p-8 bg-white/5 border transition-all rounded-[1.25rem] md:rounded-[2rem] flex items-center justify-between group",
                                                    (selectedMapCategory === cat.id || (cart[cat.id] || 0) > 0) ? "border-neon-blue bg-neon-blue/5" : "border-white/10 hover:border-white/20"
                                                )}>
                                                    <div className="flex items-center gap-3 md:gap-6">
                                                        <div className="w-3 h-3 md:w-4 md:h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#2ebfff' }} />
                                                        <div>
                                                            <div className="font-black text-white uppercase text-xs md:text-base italic tracking-widest leading-none mb-1">{cat.name}</div>
                                                            <div className="text-neon-green font-black text-xl md:text-2xl tracking-tighter">₹{cat.price}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 md:gap-6 bg-black/40 p-2 rounded-2xl border border-white/5">
                                                        <button onClick={() => updateCart(cat.id, -1)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><Minus size={16}/></button>
                                                        <span className="w-8 md:w-10 text-center font-black text-lg md:text-xl tabular-nums">{cart[cat.id] || 0}</span>
                                                        <button onClick={() => updateCart(cat.id, 1)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-neon-blue hover:text-black transition-all"><Plus size={16}/></button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] flex flex-col items-center gap-10">
                                                    <span className="text-7xl font-black italic tabular-nums text-neon-green drop-shadow-[0_0_20px_rgba(43,217,62,0.3)]">{ticketCount}</span>
                                                    <div className="flex gap-10">
                                                        <button onClick={() => setTicketCount(g => Math.max(1, g - 1))} className="w-18 h-18 rounded-full border border-white/10 flex items-center justify-center"><Minus size={24}/></button>
                                                        <button onClick={() => setTicketCount(g => Math.min(10, g + 1))} className="w-18 h-18 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center"><Plus size={24}/></button>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {/* Checkout Bar */}
                                    <div className="flex flex-col gap-4">
                                        <div className="p-6 md:p-10 bg-zinc-900/80 border border-white/10 rounded-[2rem] md:rounded-[3rem] flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl relative">
                                            <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-12 w-full lg:w-auto">
                                                <div className="space-y-1 text-center sm:text-left shrink-0">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Final Total</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="text-3xl md:text-5xl font-black text-white italic tracking-tighter tabular-nums drop-shadow-lg">
                                                            ₹{activeTab === 'guestlist' ? '0' : Math.floor(totalAmount)}
                                                        </p>
                                                        {appliedCoupon && (
                                                            <span className="text-[10px] font-black text-neon-green uppercase tracking-widest animate-pulse lg:hidden">Applied</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Inline Coupon Box */}
                                                {activeTab === 'tickets' && totalAmount > 0 && (
                                                    <div className="flex-1 w-full sm:w-64 flex flex-col gap-2">
                                                        <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 group/coupon focus-within:border-white/20 transition-all">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Coupon Code</p>
                                                                <input 
                                                                    type="text" 
                                                                    value={couponInput}
                                                                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                                                    placeholder="ENTER CODE"
                                                                    disabled={appliedCoupon}
                                                                    className="w-full bg-transparent border-0 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-gray-700 outline-none p-0 h-4"
                                                                />
                                                            </div>
                                                            {appliedCoupon ? (
                                                                <button 
                                                                    onClick={removeCoupon}
                                                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shrink-0"
                                                                >
                                                                    Remove
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={handleApplyCoupon}
                                                                    disabled={isValidatingCoupon || !couponInput.trim()}
                                                                    className="px-4 py-1.5 rounded-lg bg-white/10 text-white text-[8px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-30 shrink-0"
                                                                >
                                                                    {isValidatingCoupon ? <Loader2 size={10} className="animate-spin" /> : 'Apply'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {appliedCoupon && (
                                                            <span className="text-[9px] font-black text-neon-green uppercase tracking-[0.2em] animate-pulse italic whitespace-nowrap ml-1">
                                                                {appliedCoupon.code} Applied!
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                                                <Button 
                                                    onClick={handleNext} 
                                                    disabled={loading || (activeTab === 'tickets' && totalAmount === 0 && hasCategories && !appliedCoupon)}
                                                    className="w-full sm:w-auto h-16 md:h-20 px-10 md:px-16 rounded-[1.25rem] md:rounded-[1.5rem] bg-neon-blue text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs shadow-[0_20px_60px_rgba(46,191,255,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"
                                                >
                                                    {loading ? <Loader2 className="animate-spin" /> : 'CONTINUE'}
                                                    <ArrowRight size={20} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 'identity' && (
                            <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full">
                                <div className="space-y-2 mb-6">
                                    <button onClick={handleBack} className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all mb-2">
                                        <ChevronLeft size={14} /> Back to Selection
                                    </button>
                                    <h3 className="text-2xl md:text-4xl font-black font-heading text-white italic uppercase tracking-tighter">Your Details</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest italic whitespace-nowrap">Provide your information for identity verification.</p>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">FULL NAME</p>
                                            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-16 bg-white/5 border-white/10 text-sm rounded-2xl" placeholder="NAME" />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">EMAIL ADDRESS</p>
                                            <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-16 bg-white/5 border-white/10 text-sm rounded-2xl" placeholder="EMAIL" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">PHONE NUMBER</p>
                                        <div className="flex gap-4">
                                            <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-28 h-16 bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-3 outline-none focus:border-neon-blue transition-all">
                                                <option value="+91" className="bg-zinc-900">🇮🇳 +91</option>
                                                <option value="+1" className="bg-zinc-900">🇺🇸 +1</option>
                                                <option value="+44" className="bg-zinc-900">🇬🇧 +44</option>
                                            </select>
                                            <Input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-16 bg-white/5 border-white/10 flex-1 text-sm rounded-2xl" placeholder="PHONE" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 mb-4">
                                    <Button 
                                        onClick={handleNext} 
                                        disabled={loading || !formData.name || !formData.phone}
                                        className="w-full h-16 md:h-20 bg-neon-blue text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-2xl md:rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : 'VERIFY & CONTINUE'}
                                        <ArrowRight size={20} />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'otp' && (
                            <motion.div key="otp_verify" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center justify-center h-full max-w-md mx-auto space-y-12">
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 bg-neon-blue/10 border border-neon-blue/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Lock size={32} className="text-neon-blue" />
                                    </div>
                                    <h3 className="text-2xl md:text-4xl font-black font-heading italic uppercase text-white tracking-tighter">Verify Phone</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest italic">Enter the 6-digit code sent to your phone to confirm your identity.</p>
                                </div>
                                <div className="w-full space-y-8">
                                    <Input 
                                        type="text" 
                                        maxLength={6} 
                                        value={otpCode} 
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setOtpCode(val);
                                        }} 
                                        className="h-24 bg-white/5 border-white/10 text-center text-5xl font-black tracking-[0.5em] rounded-[2rem] focus:border-neon-blue focus:shadow-[0_0_30px_rgba(46,191,255,0.2)] transition-all" 
                                        placeholder="000000" 
                                    />
                                    <div className="flex flex-col gap-4">
                                        <Button onClick={handleVerifyOTP} disabled={verifying || otpCode.length !== 6} className="h-16 md:h-20 bg-neon-blue text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-2xl md:rounded-3xl">
                                            {verifying ? <Loader2 className="animate-spin" /> : 'VERIFY CODE'}
                                        </Button>
                                        <button 
                                            onClick={() => { setStep('identity'); setConfirmationResult(null); setOtpCode(''); }} 
                                            className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-[0.2em] transition-all"
                                        >
                                            Change Number
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 'payment' && (
                            <motion.div key="payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full overflow-y-auto scrollbar-hide pb-10">
                                <div className="text-center space-y-4 mb-10 shrink-0">
                                    <h3 className="text-3xl md:text-5xl font-black font-heading italic uppercase text-white tracking-tighter">Payment</h3>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scan the QR or use the UPI app to pay, then enter Transaction ID.</p>
                                </div>
                                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="bg-white rounded-[2rem] p-8 flex flex-col items-center gap-4 shadow-2xl">
                                        <img 
                                            src={qrCodeUrl || `/api/qr?size=300&text=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=NewBi&am=${totalAmount}`)}`} 
                                            alt="QR" 
                                            className="w-48 h-48 md:w-56 md:h-56 object-contain" 
                                        />
                                        <p className="font-mono font-bold text-gray-900 text-[10px] md:text-xs tracking-tight">{upiId}</p>
                                        
                                        {/* Pay with UPI Button - Mobile Only */}
                                        <a 
                                            href={`upi://pay?pa=${upiId}&pn=NewBi&am=${totalAmount}`}
                                            className="w-full h-14 rounded-xl bg-neon-blue text-black font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 md:hidden"
                                        >
                                            <Zap size={14} />
                                            PAY VIA UPI APP
                                        </a>
                                    </div>
                                    <div className="flex flex-col justify-center space-y-6">
                                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Amount to Pay</p>
                                            <p className="text-3xl md:text-4xl font-black text-neon-green italic tabular-nums">₹{totalAmount}</p>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between px-2">
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Transaction ID / Ref No.</p>
                                                    <button 
                                                        onClick={() => setShowUpiGuide(!showUpiGuide)}
                                                        className="text-[9px] font-black text-neon-blue hover:underline uppercase tracking-widest flex items-center gap-1"
                                                    >
                                                        <Info size={10} />
                                                        How to find?
                                                    </button>
                                                </div>

                                                <AnimatePresence>
                                                    {showUpiGuide && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-4 bg-white/5 border border-dashed border-white/20 rounded-xl space-y-3 mb-4">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue" />
                                                                        <p className="text-[9px] text-white/70 font-bold uppercase"><span className="text-neon-blue">GPay:</span> History &gt; Tap Payment &gt; UPI Transaction ID</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-neon-pink" />
                                                                        <p className="text-[9px] text-white/70 font-bold uppercase"><span className="text-neon-pink">PhonePe:</span> History &gt; Tap Payment &gt; UTR Number</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                                                        <p className="text-[9px] text-white/70 font-bold uppercase"><span className="text-neon-green">Paytm:</span> Balance &amp; History &gt; Tap Payment &gt; UPI Ref No.</p>
                                                                    </div>
                                                                </div>
                                                                <p className="text-[8px] text-gray-500 italic border-t border-white/5 pt-2">Note: It is always a 12-digit number.</p>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="h-14 bg-white/5 border-white/10 text-xs tracking-widest rounded-xl" placeholder="ENTER 12-DIGIT ID" />
                                            </div>
                                            <Button onClick={submitTickets} disabled={loading || !paymentRef} className="w-full h-16 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                                {loading ? <Loader2 className="animate-spin" /> : 'CONFIRM PAYMENT'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center h-full gap-10">
                                <div className="w-24 h-24 bg-neon-green/20 border border-neon-green/40 rounded-[2.5rem] flex items-center justify-center text-neon-green shadow-[0_0_60px_rgba(43,217,62,0.3)]">
                                    <CheckCircle2 size={48} />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-3xl md:text-5xl font-black font-heading text-white italic uppercase tracking-tighter">Booking Successful</h3>
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Booking Reference:</span>
                                        <span className="text-white font-mono text-sm font-bold tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/10">{bookingRef}</span>
                                    </div>
                                </div>
                                
                                {totalAmount > 0 ? (
                                    <div className="p-10 bg-neon-blue/10 border border-neon-blue/20 rounded-[3rem] max-w-sm relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_3s_infinite] pointer-events-none" />
                                        <p className="text-[12px] font-black text-neon-blue uppercase tracking-[0.2em] leading-relaxed italic">
                                            Passes will be available after payment verification in the profile section.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="w-full max-w-sm space-y-6">
                                        <Button onClick={handleDownloadTicket} className="w-full h-16 md:h-20 bg-neon-green text-black uppercase font-black rounded-2xl md:rounded-3xl tracking-[0.2em] text-[10px] md:text-xs shadow-[0_30px_60px_rgba(43,217,62,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4">
                                            DOWNLOAD PASS <ArrowRight size={20} />
                                        </Button>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Ready for offline use.</p>
                                    </div>
                                )}

                                <div className="fixed -left-[9999px] top-0 pointer-events-none">
                                    <div id="ticket-download-surface" className="w-[800px] bg-black p-16 flex flex-col gap-12 font-sans border-2 border-neon-blue/20">
                                        <div className="flex items-center justify-between">
                                            <div className="text-4xl font-black italic tracking-tighter text-white uppercase">NEWBI <span className="text-neon-blue">ENT.</span></div>
                                            <div className="text-xs font-black text-gray-500 uppercase tracking-[0.5em]">{activeTab === 'tickets' ? 'OFFICIAL_TICKET' : 'GUESTLIST_PASS'}</div>
                                        </div>
                                        <div className="space-y-4">
                                            <h1 className="text-7xl font-black text-white italic uppercase tracking-tighter leading-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">{event?.title}</h1>
                                            <div className="flex gap-8">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">DATE</p>
                                                    <p className="text-xl font-bold text-white uppercase italic">{event?.date ? new Date(event.date).toLocaleDateString() : 'To Be Announced'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">LOCATION</p>
                                                    <p className="text-xl font-bold text-white uppercase italic">{event?.location || 'Special Venue'}</p>
                                                    {event?.locationUrl && <p className="text-[8px] font-black text-neon-blue uppercase tracking-widest truncate max-w-[200px]">{event.locationUrl.replace('https://', '').replace('www.', '')}</p>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-16 p-12 bg-zinc-900/50 rounded-[4rem] border border-white/5">
                                            <div className="bg-white p-8 rounded-[3rem]">
                                                <img src={`/api/qr?size=400&text=${encodeURIComponent(bookingRef)}`} alt="QR" crossOrigin="anonymous" className="w-48 h-48 mix-blend-multiply" />
                                            </div>
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">ACCESS CODE</p>
                                                    <p className="text-6xl font-black text-white italic tracking-tighter">{bookingRef}</p>
                                                </div>
                                                <div className="flex gap-8">
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest">{activeTab === 'tickets' ? 'ITEMS' : 'GUESTS'}</p>
                                                        <p className="text-2xl font-bold text-neon-blue italic">{activeTab === 'tickets' ? cartTotalCount : guestCount}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest">HOLDER</p>
                                                        <p className="text-lg font-bold text-white uppercase italic truncate max-w-[200px]">{formData.name}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em] italic">NEWBI ENT.</p>
                                            <p className="text-[9px] font-black text-neon-blue/50 uppercase tracking-[0.3em]">NEWBI.LIVE</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Info Detail Popup Overlay */}
                <AnimatePresence>
                    {infoPopup && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[100] flex items-center justify-center p-4 md:p-12"
                        >
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setInfoPopup(null)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
                            >
                                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center", infoPopup.color)}>
                                            {infoPopup.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">{infoPopup.title}</h4>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Full Event Details</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setInfoPopup(null)}
                                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="p-8 overflow-y-auto max-h-[400px] scrollbar-hide">
                                    <p className="text-sm text-gray-300 leading-relaxed italic whitespace-pre-line">
                                        {infoPopup.content}
                                    </p>
                                </div>
                                <div className="p-6 bg-black/20 border-t border-white/5">
                                    <Button 
                                        onClick={() => setInfoPopup(null)}
                                        className="w-full h-14 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white hover:text-black transition-all"
                                    >
                                        CLOSE
                                    </Button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
        <div id="recaptcha-container" className="fixed bottom-0 right-0 z-[200]"></div>
    </>
);

    if (isEmbedded) return isOpen ? modalContent : null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6 overflow-hidden">
                    <AnimatePresence>
                        {isDownloading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center gap-6">
                                <LoadingSpinner size="md" color="#2bd93e" />
                                <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em]">GENERATING PASS...</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-3xl transition-all" />
                    {modalContent}
                </div>
            )}
        </AnimatePresence>
    );
};

export default EventTicketingModal;
