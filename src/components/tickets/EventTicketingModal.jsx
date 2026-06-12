import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Calendar, MapPin, Ticket, Plus, Minus, ArrowRight, 
    ChevronLeft, CheckCircle2, ShieldCheck, Zap,
    Info, CreditCard, Lock, Share2, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useStore } from '../../lib/store';
import { db, auth } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { RecaptchaVerifier, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';
import html2canvas from 'html2canvas';
import LoadingSpinner from '../ui/LoadingSpinner';

const OTPVerificationSuccess = () => {
    return (
        <div className="relative py-4 flex flex-row items-center justify-start text-left gap-6">
            <div className="absolute inset-y-0 left-0 w-64 h-full bg-neon-green/5 blur-[60px] pointer-events-none rounded-full" />
            
            <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
                {/* Shockwave Rings */}
                <motion.div 
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                    className="absolute w-16 h-16 rounded-full border border-neon-green/30"
                />
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 1.2, delay: 0.4, repeat: Infinity, ease: "easeOut" }}
                    className="absolute w-16 h-16 rounded-full border-2 border-neon-green/20"
                />

                {/* Rotating gear/shield behind check */}
                <motion.div 
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute w-14 h-14 border border-dashed border-neon-green/40 rounded-full"
                />

                {/* Solid core with custom spring-loaded check icon */}
                <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 15 }}
                    className="relative w-12 h-12 rounded-full bg-[#020202] border border-neon-green flex items-center justify-center shadow-[0_0_30px_rgba(57,255,20,0.3)] z-10"
                >
                    <svg className="w-6 h-6 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </motion.div>

                {/* Floating particle embers */}
                {[...Array(4)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 0, x: 0, scale: 0.8 }}
                        animate={{ 
                            opacity: [0, 1, 0], 
                            y: -35 - Math.random() * 25, 
                            x: (Math.random() - 0.5) * 50,
                            scale: [0.8, 1.2, 0.4] 
                        }}
                        transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            delay: i * 0.35, 
                            ease: "easeOut" 
                        }}
                        className="absolute w-1 h-1 rounded-full bg-neon-green shadow-[0_0_6px_rgba(57,255,20,0.8)]"
                    />
                ))}
            </div>

            <div className="space-y-1 relative z-10">
                <motion.h4 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl font-extrabold font-heading tracking-tight text-neon-green"
                >
                    Phone Verified
                </motion.h4>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]"
                >
                    Verification successful. Proceeding to next step...
                </motion.p>
            </div>
        </div>
    );
};

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
    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const [otpSent, setOtpSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
    const otpRefs = useRef([]);

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
            setStep(!user ? 'login' : (hasLayout && hasTickets ? 'map' : 'selection'));
            setCart({});
            setSelectedMapCategory(null);
            setTicketCount(1);
            setGuestCount(1);
            
            let phoneVal = '';
            if (user?.phoneNumber) {
                const cleanPhone = user.phoneNumber.replace(/\D/g, '');
                if (cleanPhone.length >= 10) {
                    phoneVal = cleanPhone.slice(-10);
                    const cc = user.phoneNumber.replace(phoneVal, '');
                    if (cc && cc.startsWith('+')) {
                        setCountryCode(cc);
                    }
                } else {
                    phoneVal = cleanPhone;
                }
            }

            setFormData({
                name: user?.displayName || '',
                email: user?.email || '',
                phone: phoneVal
            });
            setConfirmationResult(null);
            setOtpCode('');
            setOtpValues(['', '', '', '', '', '']);
            setOtpSent(false);
            setIsPhoneVerified(!!user?.phoneNumber);
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
            setFormData(prev => {
                let phoneVal = prev.phone;
                if (!phoneVal && user.phoneNumber) {
                    const cleanPhone = user.phoneNumber.replace(/\D/g, '');
                    if (cleanPhone.length >= 10) {
                        phoneVal = cleanPhone.slice(-10);
                        const cc = user.phoneNumber.replace(phoneVal, '');
                        if (cc && cc.startsWith('+')) {
                            setCountryCode(cc);
                        }
                    } else {
                        phoneVal = cleanPhone;
                    }
                }
                return {
                    name: prev.name || user.displayName || '',
                    email: prev.email || user.email || '',
                    phone: phoneVal
                };
            });
        }
    }, [user, isOpen]);

    // Sync isPhoneVerified status based on typed phone number and profile number
    useEffect(() => {
        if (isOpen && user && user.phoneNumber) {
            const cleanUserPhone = user.phoneNumber.replace(/\D/g, '');
            const cleanFormPhone = formData.phone ? formData.phone.replace(/\D/g, '') : '';
            if (cleanUserPhone && cleanFormPhone && cleanUserPhone.endsWith(cleanFormPhone)) {
                setIsPhoneVerified(true);
            } else {
                setIsPhoneVerified(false);
            }
        }
    }, [user, isOpen, formData.phone]);

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
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                setOtpSent(true);
                useStore.getState().addToast("Local mode: use any 6-digit code to verify.", 'success');
                setLoading(false);
                return;
            }

            const verifier = await setupRecaptcha();
            if (!verifier) throw new Error("Verification system failed to initialize.");

            const cleanPhone = formData.phone.trim().replace(/\D/g, '');
            const phoneNumber = `${countryCode}${cleanPhone}`;

            const phoneProvider = new PhoneAuthProvider(auth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                phoneNumber,
                verifier
            );
            setConfirmationResult(verificationId);
            setOtpSent(true);
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

    const handleVerifyOTP = async (codeToVerify) => {
        const fullCode = typeof codeToVerify === 'string' ? codeToVerify : otpValues.join('');
        if (fullCode.length !== 6) {
            return useStore.getState().addToast("Please enter the 6-digit verification code.", 'error');
        }
        
        setVerifying(true);
        const currentAmount = totalAmount;

        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (!isLocal) {
                if (!confirmationResult) throw new Error("No verification session found.");
                const credential = PhoneAuthProvider.credential(confirmationResult, fullCode);
                await linkWithCredential(auth.currentUser, credential);
            }
            
            setIsPhoneVerified(true);
            useStore.getState().addToast("Phone verified successfully!", 'success');
            
            // Save phone to profile if user exists
            if (user?.uid) {
                const verifiedPhone = `${countryCode}${formData.phone}`;
                await useStore.getState().updateUserProfile(user.uid, { phoneNumber: verifiedPhone });
            }

            // Auto-advance after showing success screen briefly
            setTimeout(() => {
                if (activeTab === 'tickets') {
                    if (currentAmount === 0) {
                        submitTickets();
                    } else {
                        setLockedAmount(currentAmount); // Lock the price
                        setStep('payment');
                    }
                } else {
                    submitGuestlist();
                }
            }, 1200);

        } catch (error) {
            console.error("Verification error:", error);
            if (error.code === 'auth/credential-already-in-use') {
                setIsPhoneVerified(true);
                useStore.getState().addToast("Phone verified! (Number linked to another account)", 'success');
                
                if (user?.uid) {
                    const verifiedPhone = `${countryCode}${formData.phone}`;
                    await useStore.getState().updateUserProfile(user.uid, { phoneNumber: verifiedPhone });
                }

                setTimeout(() => {
                    if (activeTab === 'tickets') {
                        if (currentAmount === 0) {
                            submitTickets();
                        } else {
                            setLockedAmount(currentAmount);
                            setStep('payment');
                        }
                    } else {
                        submitGuestlist();
                    }
                }, 1200);
            } else {
                useStore.getState().addToast("Invalid code. Please double-check and try again.", 'error', 'TKT-OTP-02');
            }
        } finally {
            setVerifying(false);
        }
    };

    const handleOtpChange = (val, idx) => {
        if (isNaN(val)) return;
        const newOtp = [...otpValues];
        newOtp[idx] = val;
        setOtpValues(newOtp);
        
        // Autotab forward
        if (val !== '' && idx < 5) {
            otpRefs.current[idx + 1]?.focus();
        }

        // Auto verify when 6 digits are filled
        if (val !== '' && newOtp.every(digit => digit !== '')) {
            handleVerifyOTP(newOtp.join(''));
        }
    };

    const handleOtpKeyDown = (e, idx) => {
        if (e.key === 'Backspace') {
            if (otpValues[idx] === '' && idx > 0) {
                otpRefs.current[idx - 1]?.focus();
                const newOtp = [...otpValues];
                newOtp[idx - 1] = '';
                setOtpValues(newOtp);
            } else {
                const newOtp = [...otpValues];
                newOtp[idx] = '';
                setOtpValues(newOtp);
            }
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').trim();
        if (pasteData.length === 6 && !isNaN(pasteData)) {
            const digits = pasteData.split('');
            setOtpValues(digits);
            otpRefs.current[5]?.focus();
            handleVerifyOTP(pasteData);
        }
    };

    // Auto-transition from login to selection when user logs in
    useEffect(() => {
        if (user && step === 'login') {
            setStep(hasLayout && hasTickets ? 'map' : 'selection');
            // Auto-fill form data from user profile
            setFormData(prev => ({
                ...prev,
                name: prev.name || user.displayName || '',
                email: prev.email || user.email || ''
            }));
        }
    }, [user, step]);

    const progressPercent = useMemo(() => {
        switch (step) {
            case 'login': return 0;
            case 'map': return 10;
            case 'selection': return 25;
            case 'identity-name': return 45;
            case 'identity-email': return 65;
            case 'identity-phone': return 85;
            case 'payment': return 95;
            case 'success': return 100;
            default: return 0;
        }
    }, [step]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                if (step === 'identity-name') {
                    e.preventDefault();
                    if (formData.name.trim()) setStep('identity-email');
                } else if (step === 'identity-email') {
                    e.preventDefault();
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (emailRegex.test(formData.email.trim())) setStep('identity-phone');
                } else if (step === 'identity-phone') {
                    e.preventDefault();
                    if (!isPhoneVerified) {
                        if (otpSent) {
                            handleVerifyOTP();
                        } else {
                            if (formData.phone && formData.phone.length >= 10) {
                                handleSendOTP();
                            }
                        }
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [step, formData, otpSent, otpValues, isPhoneVerified, countryCode]);

    const submitGuestlist = async () => {
        setLoading(true);
        try {
            const ref = `NB-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            const normalizedEmail = (formData.email || '').trim().toLowerCase();
            const entryData = {
                userId: user?.uid || null,
                name: formData.name,
                customerName: formData.name,
                email: normalizedEmail,
                customerEmail: normalizedEmail,
                phone: `${countryCode}${formData.phone}`,
                customerPhone: `${countryCode}${formData.phone}`,
                guestsCount: guestCount,
                bookingRef: ref,
                status: 'confirmed',
                title: event?.title || 'Guestlist',
                attended: false,
                guestlistMode: event?.guestlistMode || 'qr',
                eventId: event?.id || null,
                guestlistId: event?.id || null
            };
            
            await useStore.getState().addGuestlistEntry(event.id, entryData);

            try {
                const { sendGuestlistConfirmation } = await import('../../lib/email');
                await sendGuestlistConfirmation({
                    toName: formData.name,
                    toEmail: normalizedEmail,
                    eventName: event?.title || 'Event',
                    bookingRef: ref,
                    guestCount: guestCount,
                    date: event?.date,
                    location: event?.location,
                    guestlistMode: event?.guestlistMode || 'qr'
                });
            } catch (mailErr) {
                console.error("Failed to send guestlist confirmation email:", mailErr);
            }

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

            if (totalAmount === 0) {
                try {
                    const { sendBookingConfirmation } = await import('../../lib/email');
                    const ticketsHtml = orderData.items.map(item => `
                        <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                            <strong>${item.name}</strong> x ${item.count}
                        </div>
                    `).join('');
                    await sendBookingConfirmation({
                        to_name: orderData.customerName,
                        to_email: orderData.customerEmail,
                        event_name: event?.title || 'Event',
                        booking_ref: ref,
                        tickets_html: ticketsHtml,
                        total_amount: 0,
                        payment_ref: 'FREE',
                        items: orderData.items
                    });
                } catch (mailErr) {
                    console.error("Failed to send booking confirmation email for free ticket:", mailErr);
                }
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
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedSurface = clonedDoc.getElementById('ticket-download-surface');
                    if (clonedSurface) {
                        clonedSurface.style.backdropFilter = 'none';
                        clonedSurface.style.webkitBackdropFilter = 'none';
                        const parent = clonedSurface.parentElement;
                        if (parent) {
                            parent.style.position = 'relative';
                            parent.style.left = '0';
                            parent.style.top = '0';
                        }
                    }
                }
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
        if (step === 'login') {
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
            setStep('identity-name');
        }
    };

    const handleBack = () => {
        if (step === 'selection') {
            if (hasLayout && activeTab === 'tickets') setStep('map');
        }
        else if (step === 'identity-name') setStep('selection');
        else if (step === 'identity-email') setStep('identity-name');
        else if (step === 'identity-phone') {
            setStep('identity-email');
            setOtpSent(false);
            setOtpValues(['','','','','','']);
            setIsPhoneVerified(false);
        }
        else if (step === 'payment') {
            setStep('identity-phone');
            setOtpSent(false);
            setOtpValues(['','','','','','']);
            setIsPhoneVerified(false);
        }
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
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950/50 backdrop-blur-xl h-full">
                {isEmbedded ? (
                    <div className="w-full h-16 shrink-0 border-b border-white/5 bg-zinc-950/40 px-6 md:px-12 flex items-center justify-between z-30 select-none">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black text-gray-300 hover:text-white uppercase tracking-widest transition-all"
                        >
                            <ChevronLeft size={12} className="text-neon-green" />
                            <span>Back to Event</span>
                        </button>
                        
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] hidden sm:inline truncate max-w-[200px] md:max-w-[400px]">
                            {event?.title}
                        </span>

                        <button 
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <button onClick={onClose} className="absolute top-8 right-8 z-50 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all group">
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                )}

                {step !== 'success' && (
                    <div className="w-full px-6 md:px-12 pt-6 shrink-0">
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.3 }}
                                className="h-full bg-gradient-to-r from-neon-green to-white"
                            />
                        </div>
                    </div>
                )}

                <div className="flex-1 min-h-0 flex flex-col p-6 md:p-12 pt-6 md:pt-8 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {/* LOGIN GATE */}
                        {step === 'login' && (
                            <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 overflow-y-auto overflow-x-hidden scrollbar-hide">
                                <div className="relative mb-10">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                        className="w-24 h-24 rounded-2xl bg-gradient-to-br from-neon-green/20 to-white/10 border border-white/10 flex items-center justify-center shadow-[0_15px_30px_rgba(57,255,20,0.1)]"
                                    >
                                        <Lock size={36} className="text-neon-green" />
                                    </motion.div>
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 1 }}
                                        animate={{ scale: 2, opacity: 0 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                                        className="absolute inset-0 w-24 h-24 rounded-2xl border border-neon-green/30"
                                    />
                                </div>

                                <motion.h3
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-3xl font-extrabold font-heading text-white tracking-tight mb-4"
                                >
                                    Sign In Required
                                </motion.h3>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.35 }}
                                    className="text-[11px] text-zinc-500 uppercase tracking-[0.2em] font-bold mb-10 max-w-sm leading-relaxed"
                                >
                                    Create an account or sign in to {activeTab === 'guestlist' ? (event?.guestlistMode === 'rsvp' ? 'RSVP for' : 'join the guestlist for') : 'purchase tickets for'} this event.
                                </motion.p>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.45 }}
                                    className="flex flex-col gap-4 w-full max-w-xs"
                                >
                                    <Button
                                        onClick={() => setAuthModal(true)}
                                        className="h-14 bg-neon-green text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-[0_15px_30px_rgba(57,255,20,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 w-full"
                                    >
                                        <ShieldCheck size={18} />
                                        Sign In to Continue
                                    </Button>
                                    <p className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] font-bold">
                                        Your booking will be linked to your account
                                    </p>
                                </motion.div>

                                {/* Trust badges */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="flex items-center gap-6 mt-12 text-gray-700"
                                >
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={12} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Secure</span>
                                    </div>
                                    <div className="w-px h-3 bg-white/10" />
                                    <div className="flex items-center gap-2">
                                        <Ticket size={12} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Digital Pass</span>
                                    </div>
                                    <div className="w-px h-3 bg-white/10" />
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={12} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Verified</span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}

                        {step === 'map' && (
                            <motion.div key="map" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-4 mb-6 shrink-0">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight">Select Tickets</h3>
                                        <p className="text-[9px] md:text-xs text-gray-500 uppercase tracking-widest leading-relaxed">Choose your preferred ticket categories and quantity below.</p>
                                    </div>
                                    <button 
                                        onClick={() => setStep('selection')}
                                        className="shrink-0 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 text-[9px] md:text-xs font-black text-gray-400 hover:text-white uppercase tracking-widest transition-all"
                                    >
                                        List View
                                    </button>
                                </div>

                                <div className="flex-1 bg-black/40 rounded-3xl border border-white/10 p-0 overflow-auto scrollbar-hide relative shadow-2xl group/map mb-6 flex items-center justify-center min-h-0">
                                    {/* Instruction Badge */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-none w-full px-4 flex justify-center">
                                        <div className="px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2 shadow-2xl">
                                            <Info size={12} className="text-neon-green" />
                                            <span className="text-[8px] md:text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">
                                                Tap zones to select • Toggle List View if needed
                                            </span>
                                        </div>
                                    </div>

                                    {/* Zoom Controls */}
                                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-[60]">
                                        <button onClick={handleZoomIn} className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-md hover:bg-neon-green hover:text-black transition-all shadow-xl">
                                            <ZoomIn size={18} />
                                        </button>
                                        <button onClick={handleZoomOut} className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-md hover:bg-neon-green hover:text-black transition-all shadow-xl">
                                            <ZoomOut size={18} />
                                        </button>
                                        <button onClick={handleReset} className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-md hover:bg-neon-green hover:text-black transition-all shadow-xl">
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
                                    className="shrink-0 h-14 bg-neon-green text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-[0_15px_30px_rgba(57,255,20,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                                >
                                    Proceed to Tickets
                                    <ArrowRight size={18} />
                                </Button>
                            </motion.div>
                        )}

                        {step === 'selection' && (
                            <motion.div key="selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                {hasLayout && activeTab === 'tickets' && (
                                    <button onClick={handleBack} className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all mb-6 shrink-0">
                                        <ChevronLeft size={14} /> Back to Map
                                    </button>
                                )}

                                {hasTickets && hasGuestlist && (
                                    <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 mb-6 w-fit mx-auto shrink-0">
                                        <button onClick={() => setActiveTab('tickets')} className={cn("px-8 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'tickets' ? "bg-neon-green text-black" : "text-zinc-500 hover:text-white")}>TICKETS</button>
                                        <button onClick={() => setActiveTab('guestlist')} className={cn("px-8 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === 'guestlist' ? "bg-white text-black" : "text-zinc-500 hover:text-white")}>GUESTLIST</button>
                                    </div>
                                )}

                                <div className="flex-1 min-h-0 flex flex-col overflow-hidden justify-between">
                                    <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide space-y-6 pr-2 mb-4">
                                        {/* Event Brief & Rules */}
                                        {(event?.ticketingDescription || event?.ticketingRules) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {event?.ticketingDescription && (
                                                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3 group/info hover:bg-white/[0.05] transition-all cursor-default">
                                                        <div className="flex items-center gap-2 text-neon-green opacity-70 group-hover/info:opacity-100 transition-all">
                                                            <Info size={14} />
                                                            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Overview</span>
                                                        </div>
                                                        <div className="relative">
                                                            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium line-clamp-3">
                                                                {event.ticketingDescription}
                                                            </p>
                                                            {event.ticketingDescription.length > 100 && (
                                                                <button 
                                                                    onClick={() => setInfoPopup({ 
                                                                        title: 'Event Overview', 
                                                                        content: event.ticketingDescription, 
                                                                        icon: <Info size={24}/>, 
                                                                        color: 'text-neon-green' 
                                                                    })}
                                                                    className="text-[9px] font-bold text-neon-green uppercase tracking-widest mt-2 hover:underline flex items-center gap-1"
                                                                >
                                                                    Read More <Maximize2 size={10} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {event?.ticketingRules && (
                                                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3 group/rules hover:bg-white/[0.05] transition-all cursor-default">
                                                        <div className="flex items-center gap-2 text-neon-green opacity-70 group-hover/rules:opacity-100 transition-all">
                                                            <ShieldCheck size={14} />
                                                            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Rules & Policy</span>
                                                        </div>
                                                        <div className="relative">
                                                            <div className="text-[11px] text-zinc-400 leading-relaxed font-medium line-clamp-3 whitespace-pre-line">
                                                                {event.ticketingRules}
                                                            </div>
                                                            {event.ticketingRules.length > 100 && (
                                                                <button 
                                                                    onClick={() => setInfoPopup({ 
                                                                        title: 'Rules & Policy', 
                                                                        content: event.ticketingRules, 
                                                                        icon: <ShieldCheck size={24}/>, 
                                                                        color: 'text-neon-green' 
                                                                    })}
                                                                    className="text-[9px] font-bold text-neon-green uppercase tracking-widest mt-2 hover:underline flex items-center gap-1"
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
                                            <div className="p-8 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-8">
                                                <div className="text-center">
                                                    <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-2">Number of Guests</h4>
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Maximum {event?.perUserLimit || 5} per entry</p>
                                                </div>
                                                <span className="text-7xl font-bold tracking-tight tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{guestCount}</span>
                                                <div className="flex gap-8">
                                                    <button onClick={() => setGuestCount(g => Math.max(1, g - 1))} className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-white"><Minus size={24}/></button>
                                                    <button onClick={() => setGuestCount(g => Math.min(event?.perUserLimit || 5, g + 1))} className="w-16 h-16 rounded-full bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green hover:bg-neon-green hover:text-black transition-all"><Plus size={24}/></button>
                                                </div>
                                            </div>
                                        ) : (
                                            hasCategories ? event?.ticketCategories?.filter(cat => 
                                                !hasLayout || cartTotalCount === 0 || cart[cat.id]
                                            ).map(cat => (
                                                <div key={cat.id} className={cn(
                                                    "p-4 md:p-6 bg-white/5 border transition-all rounded-2xl flex items-center justify-between group",
                                                    (selectedMapCategory === cat.id || (cart[cat.id] || 0) > 0) ? "border-neon-green bg-neon-green/5" : "border-white/10 hover:border-white/20"
                                                )}>
                                                    <div className="flex items-center gap-3 md:gap-4">
                                                        <div className="w-3 h-3 md:w-4 md:h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#39FF14' }} />
                                                        <div className="text-left">
                                                            <div className="font-bold text-white uppercase text-xs md:text-sm tracking-wider leading-none mb-1">{cat.name}</div>
                                                            <div className="text-neon-green font-bold text-lg md:text-xl tracking-tight">₹{cat.price}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 md:gap-4 bg-black/40 p-1.5 rounded-xl border border-white/5">
                                                        <button onClick={() => updateCart(cat.id, -1)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white"><Minus size={14}/></button>
                                                        <span className="w-6 text-center font-bold text-sm md:text-base tabular-nums text-white">{cart[cat.id] || 0}</span>
                                                        <button onClick={() => updateCart(cat.id, 1)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-neon-green hover:text-black transition-all text-white"><Plus size={14}/></button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-8">
                                                    <span className="text-6xl font-bold tracking-tight tabular-nums text-neon-green drop-shadow-[0_0_15px_rgba(57,255,20,0.2)]">{ticketCount}</span>
                                                    <div className="flex gap-8">
                                                        <button onClick={() => setTicketCount(g => Math.max(1, g - 1))} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white"><Minus size={20}/></button>
                                                        <button onClick={() => setTicketCount(g => Math.min(10, g + 1))} className="w-14 h-14 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center"><Plus size={20}/></button>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {/* Checkout Bar */}
                                    <div className="shrink-0 pt-4 border-t border-white/5 bg-zinc-950/20 rounded-t-3xl">
                                        <div className="p-6 md:p-8 bg-zinc-900/80 border border-white/10 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl relative">
                                            <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-12 w-full lg:w-auto text-left">
                                                <div className="space-y-1 text-center sm:text-left shrink-0">
                                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Final Total</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="text-3xl md:text-4xl font-bold text-white tracking-tight tabular-nums drop-shadow-lg">
                                                            ₹{activeTab === 'guestlist' ? '0' : Math.floor(totalAmount)}
                                                        </p>
                                                        {appliedCoupon && (
                                                            <span className="text-[10px] font-bold text-neon-green uppercase tracking-widest animate-pulse lg:hidden">Applied</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Inline Coupon Box */}
                                                {activeTab === 'tickets' && totalAmount > 0 && (
                                                    <div className="flex-1 w-full sm:w-64 flex flex-col gap-2">
                                                        <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 group/coupon focus-within:border-white/20 transition-all">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Coupon Code</p>
                                                                <input 
                                                                    type="text" 
                                                                    value={couponInput}
                                                                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                                                    placeholder="ENTER CODE"
                                                                    disabled={appliedCoupon}
                                                                    className="w-full bg-transparent border-0 text-[10px] font-bold uppercase tracking-widest text-white placeholder:text-zinc-700 outline-none p-0 h-4"
                                                                />
                                                            </div>
                                                            {appliedCoupon ? (
                                                                <button 
                                                                    onClick={removeCoupon}
                                                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[8px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shrink-0"
                                                                >
                                                                    Remove
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={handleApplyCoupon}
                                                                    disabled={isValidatingCoupon || !couponInput.trim()}
                                                                    className="px-4 py-1.5 rounded-lg bg-white/10 text-white text-[8px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-30 shrink-0"
                                                                >
                                                                    {isValidatingCoupon ? <LoadingSpinner size="xs" color="#FFFFFF" /> : 'Apply'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {appliedCoupon && (
                                                            <span className="text-[9px] font-bold text-neon-green uppercase tracking-[0.2em] animate-pulse whitespace-nowrap ml-1">
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
                                                    className="w-full sm:w-auto h-14 px-10 md:px-16 rounded-xl bg-neon-green text-black font-bold uppercase tracking-wider text-xs shadow-[0_15px_30px_rgba(57,255,20,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                                                >
                                                    {loading ? <LoadingSpinner size="xs" color="#000000" /> : 'Continue'}
                                                    <ArrowRight size={18} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 'identity-name' && (
                            <motion.div 
                                key="identity-name" 
                                initial={{ opacity: 0, y: 30 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="flex-1 flex flex-col justify-between min-h-0 overflow-y-auto overflow-x-hidden space-y-8 py-4"
                            >
                                <div className="space-y-6">
                                    <div className="space-y-2 text-left">
                                        <span className="text-[10px] font-bold text-neon-green uppercase tracking-[0.3em]">Step 1 of 3</span>
                                        <h3 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight leading-tight">
                                            What is your full name?
                                        </h3>
                                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Stage or Legal Name for the pass</p>
                                    </div>
                                    <div className="relative">
                                        <Input 
                                            name="name" 
                                            value={formData.name} 
                                            onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                            placeholder="Full Name" 
                                            className="h-14 bg-white/[0.02] border-white/10 rounded-xl text-base font-bold px-6 focus:border-neon-green" 
                                            autoFocus
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:inline">press Enter ↵</span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center pt-8 border-t border-white/5 shrink-0 select-none">
                                    <button 
                                        type="button" 
                                        onClick={handleBack} 
                                        className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-[0.3em] transition-colors flex items-center gap-2"
                                    >
                                        <ChevronLeft size={14} /> Back
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!formData.name.trim()) {
                                                return useStore.getState().addToast("Please enter your full name.", 'error');
                                            }
                                            setStep('identity-email');
                                        }}
                                        className="h-12 px-8 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white text-black hover:bg-neon-green hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                                    >
                                        Continue <ArrowRight size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'identity-email' && (
                            <motion.div 
                                key="identity-email" 
                                initial={{ opacity: 0, y: 30 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="flex-1 flex flex-col justify-between min-h-0 overflow-y-auto overflow-x-hidden space-y-8 py-4"
                            >
                                <div className="space-y-6">
                                    <div className="space-y-2 text-left">
                                        <span className="text-[10px] font-bold text-neon-green uppercase tracking-[0.3em]">Step 2 of 3</span>
                                        <h3 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight leading-tight">
                                            What is your email address?
                                        </h3>
                                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">We will send your ticket confirmation here</p>
                                    </div>
                                    <div className="relative">
                                        <Input 
                                            type="email"
                                            name="email" 
                                            value={formData.email} 
                                            onChange={e => setFormData({ ...formData, email: e.target.value })} 
                                            placeholder="email@example.com" 
                                            className="h-14 bg-white/[0.02] border-white/10 rounded-xl text-base font-bold px-6 focus:border-neon-green" 
                                            autoFocus
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:inline">press Enter ↵</span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center pt-8 border-t border-white/5 shrink-0 select-none">
                                    <button 
                                        type="button" 
                                        onClick={handleBack} 
                                        className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-[0.3em] transition-colors flex items-center gap-2"
                                    >
                                        <ChevronLeft size={14} /> Back
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                            if (!emailRegex.test(formData.email.trim())) {
                                                return useStore.getState().addToast("Please enter a valid email address.", 'error');
                                            }
                                            setStep('identity-phone');
                                        }}
                                        className="h-12 px-8 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white text-black hover:bg-neon-green hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                                    >
                                        Continue <ArrowRight size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'identity-phone' && (
                            <motion.div 
                                key="identity-phone" 
                                initial={{ opacity: 0, y: 30 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="flex-1 flex flex-col justify-between min-h-0 overflow-y-auto overflow-x-hidden space-y-8 py-4"
                            >
                                <div className="space-y-6">
                                    <div className="space-y-2 text-left">
                                        <span className="text-[10px] font-bold text-neon-green uppercase tracking-[0.3em]">Step 3 of 3</span>
                                        <h3 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight leading-tight">
                                            {!otpSent ? "What is your contact number?" : "Verify Phone"}
                                        </h3>
                                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                            {!otpSent ? "We will verify this number via SMS OTP" : `Enter the code sent to ${countryCode} ${formData.phone}`}
                                        </p>
                                    </div>

                                    {!otpSent ? (
                                        <div className="space-y-6">
                                            <div className="flex gap-4">
                                                <select 
                                                    value={countryCode} 
                                                    onChange={(e) => setCountryCode(e.target.value)} 
                                                    disabled={isPhoneVerified}
                                                    className="w-24 sm:w-36 h-14 bg-white/[0.02] border border-white/10 rounded-xl text-white text-base font-bold px-3 outline-none focus:border-neon-green transition-all disabled:opacity-50"
                                                >
                                                    <option value="+91" className="bg-zinc-900">🇮🇳 +91</option>
                                                    <option value="+1" className="bg-zinc-900">🇺🇸 +1</option>
                                                    <option value="+44" className="bg-zinc-900">🇬🇧 +44</option>
                                                    <option value="+971" className="bg-zinc-900">🇦🇪 +971</option>
                                                    <option value="+61" className="bg-zinc-900">🇦🇺 +61</option>
                                                </select>
                                                <div className="relative flex-1">
                                                    <Input 
                                                        type="tel"
                                                        name="phone" 
                                                        value={formData.phone} 
                                                        onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} 
                                                        disabled={isPhoneVerified}
                                                        placeholder="99999 99999" 
                                                        className="h-14 bg-white/[0.02] border-white/10 rounded-xl text-base font-bold px-6 focus:border-neon-green disabled:opacity-70" 
                                                        autoFocus
                                                    />
                                                    {isPhoneVerified && (
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-neon-green text-[9px] font-bold tracking-widest bg-neon-green/10 border border-neon-green/20 px-2.5 py-1 rounded-md">
                                                            <ShieldCheck size={10} /> VERIFIED
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {isPhoneVerified && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPhoneVerified(false)}
                                                    className="text-xs text-gray-500 hover:text-white font-bold uppercase tracking-widest underline"
                                                >
                                                    Change Phone Number
                                                </button>
                                            )}
                                            
                                            <div className="flex justify-between items-center pt-8 border-t border-white/5 shrink-0 select-none">
                                                <button 
                                                    type="button" 
                                                    onClick={handleBack} 
                                                    className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-[0.3em] transition-colors flex items-center gap-2"
                                                >
                                                    <ChevronLeft size={14} /> Back
                                                </button>

                                                {isPhoneVerified ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const currentAmount = totalAmount;
                                                            if (activeTab === 'tickets') {
                                                                if (currentAmount === 0) {
                                                                    submitTickets();
                                                                } else {
                                                                    setLockedAmount(currentAmount);
                                                                    setStep('payment');
                                                                }
                                                            } else {
                                                                submitGuestlist();
                                                            }
                                                        }}
                                                        className="h-12 px-8 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-neon-green text-black hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(57,255,20,0.2)]"
                                                    >
                                                        Continue <ArrowRight size={14} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleSendOTP}
                                                        disabled={loading || !formData.phone || formData.phone.length < 10}
                                                        className="h-12 px-8 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white text-black hover:bg-neon-green hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-30"
                                                    >
                                                        {loading ? <LoadingSpinner size="xs" color="black" /> : 'Send OTP'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 text-left">
                                            {isPhoneVerified ? (
                                                <OTPVerificationSuccess />
                                            ) : (
                                                <div className="flex flex-col gap-6">
                                                    <div className="relative flex gap-1.5 sm:gap-3 p-1">
                                                        {verifying && (
                                                            <motion.div 
                                                                initial={{ top: '0%' }}
                                                                animate={{ top: ['0%', '100%', '0%'] }}
                                                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                                                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-neon-green to-transparent shadow-[0_0_12px_rgba(57,255,20,0.8)] z-20 pointer-events-none"
                                                            />
                                                        )}
                                                        {otpValues.map((digit, idx) => (
                                                            <input
                                                                key={idx}
                                                                ref={el => otpRefs.current[idx] = el}
                                                                type="text"
                                                                maxLength={1}
                                                                value={digit}
                                                                disabled={verifying}
                                                                onChange={e => handleOtpChange(e.target.value, idx)}
                                                                onKeyDown={e => handleOtpKeyDown(e, idx)}
                                                                onPaste={handleOtpPaste}
                                                                className={cn(
                                                                    "w-9 h-12 sm:w-14 sm:h-16 bg-white/[0.02] border border-white/10 rounded-xl text-center text-lg font-bold text-white focus:border-neon-green focus:shadow-[0_0_25px_rgba(57,255,20,0.15)] focus:outline-none transition-all",
                                                                    verifying ? "border-neon-green/40 animate-pulse" : "border-white/10"
                                                                )}
                                                                autoFocus={idx === 0}
                                                            />
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-between items-center pt-8 border-t border-white/5 shrink-0 select-none">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setOtpSent(false); setOtpValues(['','','','','','']); }}
                                                            className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-[0.3em]"
                                                        >
                                                            Back / Resend
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleVerifyOTP()}
                                                            disabled={verifying || otpValues.join('').length !== 6}
                                                            className="h-12 px-8 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-neon-green text-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
                                                        >
                                                            {verifying ? <LoadingSpinner size="xs" color="black" /> : 'Confirm Code'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {step === 'payment' && (
                            <motion.div 
                                key="payment" 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="flex-1 flex flex-col min-h-0 overflow-hidden"
                            >
                                <div className="text-center space-y-2 mb-6 shrink-0">
                                    <h3 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight">Payment</h3>
                                    <p className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">Scan the QR or use the UPI app to pay, then enter Transaction ID.</p>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pr-1 space-y-6 pb-4">
                                    {event?.gatewayUrl && (
                                        <div className="w-full shrink-0">
                                            <a 
                                                href={event.gatewayUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-full h-14 rounded-xl bg-gradient-to-r from-neon-green to-white text-black font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_15px_30px_rgba(57,255,20,0.15)]"
                                            >
                                                <CreditCard size={14} />
                                                Proceed to Secure Checkout
                                            </a>
                                            <div className="relative flex py-4 items-center w-full">
                                                <div className="flex-grow border-t border-white/10"></div>
                                                <span className="flex-shrink mx-4 text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Or Pay Manually via UPI</span>
                                                <div className="flex-grow border-t border-white/10"></div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-3 shadow-2xl">
                                            <img 
                                                src={qrCodeUrl || `/api/qr?size=300&text=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=NewBi&am=${totalAmount}`)}`} 
                                                alt="QR" 
                                                className="w-48 h-48 md:w-56 md:h-56 object-contain" 
                                            />
                                            <p className="font-mono font-bold text-gray-900 text-[10px] md:text-xs tracking-tight">{upiId}</p>
                                            
                                            {/* Pay with UPI Button - Mobile Only */}
                                            <a 
                                                href={`upi://pay?pa=${upiId}&pn=NewBi&am=${totalAmount}`}
                                                className="w-full h-12 rounded-xl bg-neon-green text-black font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 md:hidden"
                                            >
                                                <Zap size={14} />
                                                PAY VIA UPI APP
                                            </a>
                                        </div>
                                        <div className="flex flex-col justify-center space-y-6 text-left">
                                            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                                                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Amount to Pay</p>
                                                <p className="text-3xl font-bold text-neon-green tabular-nums">₹{totalAmount}</p>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between px-2">
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Transaction ID / Ref No.</p>
                                                        <button 
                                                            onClick={() => setShowUpiGuide(!showUpiGuide)}
                                                            className="text-[10px] font-bold text-neon-green hover:underline uppercase tracking-widest flex items-center gap-1"
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
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                                                            <p className="text-[9px] text-white/70 font-bold uppercase"><span className="text-neon-green">GPay:</span> History &gt; Tap Payment &gt; UPI Transaction ID</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                                                            <p className="text-[9px] text-white/70 font-bold uppercase"><span className="text-zinc-400">PhonePe:</span> History &gt; Tap Payment &gt; UTR Number</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                                                            <p className="text-[9px] text-white/70 font-bold uppercase"><span className="text-neon-green">Paytm:</span> Balance &amp; History &gt; Tap Payment &gt; UPI Ref No.</p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-[8px] text-zinc-500 italic border-t border-white/5 pt-2">Note: It is always a 12-digit number.</p>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 pt-4 border-t border-white/5 bg-zinc-950/20 w-full select-none">
                                    <div className="max-w-md mx-auto space-y-3">
                                        <Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="h-14 bg-white/5 border-white/10 text-xs tracking-widest rounded-xl focus:border-neon-green" placeholder="ENTER 12-DIGIT ID" />
                                        <Button onClick={submitTickets} disabled={loading || !paymentRef} className="w-full h-14 bg-white text-black font-bold uppercase tracking-wider text-xs rounded-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                                            {loading ? <LoadingSpinner size="xs" color="#000000" /> : 'Confirm Payment'}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 'success' && (() => {
                            const isRSVPOnly = activeTab === 'guestlist' && event?.guestlistMode === 'rsvp';
                            return (
                                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center h-full gap-10">
                                    <div className={cn("w-24 h-24 border rounded-[2.5rem] flex items-center justify-center shadow-lg transition-all", isRSVPOnly ? "bg-neon-pink/20 border-neon-pink/40 text-neon-pink shadow-neon-pink/20 animate-[pulse_2s_infinite]" : "bg-neon-green/20 border-neon-green/40 text-neon-green shadow-[0_0_60px_rgba(43,217,62,0.3)]")}>
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-3xl md:text-5xl font-extrabold font-heading text-white tracking-tight">
                                            {isRSVPOnly ? 'RSVP Confirmed' : 'Booking Successful'}
                                        </h3>
                                        <div className="flex items-center justify-center gap-3">
                                            <span className="text-[10px] font-semibold text-gray-500 tracking-widest">Booking Reference:</span>
                                            <span className="text-white font-mono text-sm font-bold tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/10">{bookingRef}</span>
                                        </div>
                                    </div>
                                    
                                    {isRSVPOnly ? (
                                        <div className="w-full max-w-sm space-y-6">
                                            <div className="p-8 bg-neon-pink/10 border border-neon-pink/20 rounded-[2.5rem] max-w-sm relative overflow-hidden group">
                                                <p className="text-xs font-semibold text-neon-pink tracking-wide leading-relaxed">
                                                    Your RSVP is confirmed. No QR code is required. We have sent a confirmation email to you.
                                                </p>
                                            </div>
                                            <Button onClick={onClose} className="w-full h-16 bg-white text-black font-bold rounded-2xl tracking-wider text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                                CLOSE
                                            </Button>
                                        </div>
                                    ) : totalAmount > 0 ? (
                                        <div className="p-10 bg-neon-blue/10 border border-neon-blue/20 rounded-[3rem] max-w-sm relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_3s_infinite] pointer-events-none" />
                                            <p className="text-xs font-semibold text-neon-blue tracking-wide leading-relaxed">
                                                Passes will be available after payment verification in the profile section.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-sm space-y-6">
                                            <Button onClick={handleDownloadTicket} className="w-full h-16 md:h-20 bg-neon-green text-black font-bold rounded-2xl md:rounded-3xl tracking-wider text-xs shadow-[0_30px_60px_rgba(43,217,62,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4">
                                                DOWNLOAD PASS <ArrowRight size={20} />
                                            </Button>
                                            <p className="text-xs font-semibold text-zinc-500 tracking-wider">Ready for offline use.</p>
                                        </div>
                                    )}

                                    {!isRSVPOnly && (
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
                                    )}
                                </motion.div>
                            );
                        })()}
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
