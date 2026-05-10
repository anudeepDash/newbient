import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Ticket, Calendar, MapPin, Users, 
    ArrowRight, Loader2, Minus, Plus, ShieldCheck, 
    ChevronLeft, QrCode, Info, Map as MapIcon, Download, ExternalLink,
    User, Mail, Phone
} from 'lucide-react';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { useStore } from '../../lib/store';
import { notifyAdmins } from '../../lib/notificationTriggers';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import LoadingSpinner from '../ui/LoadingSpinner';
import html2canvas from 'html2canvas';

const EventTicketingModal = ({ event, isOpen, onClose, isEmbedded = false }) => {
    const { user, addTicketOrder, addGuestlistEntry, paymentDetails, setAuthModal } = useStore();
    
    // Core state
    const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' or 'guestlist'
    const [step, setStep] = useState('overview'); // overview, selection, details, payment, success
    
    // Setup tabs based on event config
    const hasTickets = event?.isTicketed;
    const hasGuestlist = event?.isGuestlistEnabled;
    const hasLayout = !!event?.venueLayout;
    const baseTicketPrice = event?.ticketPrice || 0;
    const hasCategories = event?.ticketCategories && event.ticketCategories.length > 0;

    // Form states
    const [cart, setCart] = useState({});
    const [ticketCount, setTicketCount] = useState(1);
    const [guestCount, setGuestCount] = useState(1);
    
    const [formData, setFormData] = useState({
        name: user?.displayName || '',
        email: user?.email || '',
        phone: '',
        plusOneNames: [],
    });
    
    const [paymentRef, setPaymentRef] = useState('');
    const [loading, setLoading] = useState(false);
    const [bookingRef, setBookingRef] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (isOpen && event) {
            if (hasTickets) setActiveTab('tickets');
            else if (hasGuestlist) setActiveTab('guestlist');
            
            setStep('overview');
            setCart({});
            setTicketCount(1);
            setGuestCount(1);
            setPaymentRef('');
            setFormData({
                name: user?.displayName || '',
                email: user?.email || '',
                phone: '',
                plusOneNames: [],
            });
        }
    }, [isOpen, event, user, hasTickets, hasGuestlist]);

    if (!isOpen || !event) return null;

    // --- COMPUTATIONS ---
    const totalAmount = hasCategories
        ? event.ticketCategories.reduce((acc, cat) => acc + (cat.price * (cart[cat.id] || 0)), 0)
        : baseTicketPrice * ticketCount;

    const cartTotalCount = hasCategories
        ? Object.values(cart).reduce((a, b) => a + b, 0)
        : ticketCount;

    // --- HANDLERS ---
    const updateCart = (catId, delta) => {
        setCart(prev => ({
            ...prev,
            [catId]: Math.max(0, (prev[catId] || 0) + delta)
        }));
    };

    const handleNext = () => {
        if (!user && step === 'overview') {
            setAuthModal(true);
            return;
        }

        if (step === 'overview') {
            setStep(hasLayout && activeTab === 'tickets' ? 'layout' : 'selection');
        } else if (step === 'layout') {
            setStep('selection');
        } else if (step === 'selection') {
            if (activeTab === 'tickets' && cartTotalCount === 0) return useStore.getState().addToast("Select at least one ticket.", 'error');
            setStep('details');
        } else if (step === 'details') {
            if (!formData.name || !formData.email || !formData.phone) return useStore.getState().addToast("Please fill all details.", 'error');
            if (activeTab === 'tickets') {
                if (totalAmount === 0) submitTickets();
                else setStep('payment');
            }
            else submitGuestlist();
        }
    };

    const submitGuestlist = async () => {
        setLoading(true);
        try {
            const ref = `GL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            setBookingRef(ref);

            await addGuestlistEntry(event.id, {
                guestlistId: event.id,
                title: event.title,
                date: event.date,
                location: event.location || 'Venue',
                image: event.image || '',
                userId: user?.uid || null,
                customerName: formData.name,
                customerEmail: formData.email,
                customerPhone: formData.phone,
                guestsCount: guestCount,
                plusOneNames: formData.plusOneNames.filter(Boolean),
                status: 'approved',
                createdAt: new Date().toISOString(),
                bookingRef: ref
            });
            setStep('success');
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("Registration failed.", 'error');
        }
        setLoading(false);
    };

    const handleDownloadTicket = async () => {
        const ticket = document.getElementById('ticket-download-surface');
        if (!ticket) return;

        setIsDownloading(true);
        try {
            const canvas = await html2canvas(ticket, {
                scale: 2,
                backgroundColor: '#000000',
                useCORS: true,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                windowWidth: 800,
                windowHeight: ticket.offsetHeight || 1200
            });
            
            const image = canvas.toDataURL("image/png", 1.0);
            const link = document.createElement('a');
            link.download = `NEWBI-TICKET-${bookingRef}.png`;
            link.href = image;
            link.click();
        } catch (err) {
            console.error("handleDownloadTicket failed:", err);
            useStore.getState().addToast("Failed to save image. Please try taking a screenshot.", 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const submitTickets = async () => {
        if (totalAmount > 0 && !paymentRef) return useStore.getState().addToast("Please enter UTR/Transaction ID.", 'error');
        setLoading(true);
        try {
            const ref = `TKT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            setBookingRef(ref);

            const items = hasCategories
                ? event.ticketCategories.filter(c => cart[c.id] > 0).map(c => ({
                    categoryId: c.id,
                    name: c.name,
                    price: c.price,
                    count: cart[c.id]
                }))
                : [{ name: 'Standard Ticket', price: baseTicketPrice, count: ticketCount }];

            await addTicketOrder({
                eventId: event.id,
                eventTitle: event.title,
                customerName: formData.name,
                customerEmail: formData.email,
                customerPhone: formData.phone,
                userId: user?.uid || null,
                items: items,
                totalAmount,
                paymentRef: totalAmount > 0 ? paymentRef : 'FREE',
                status: totalAmount > 0 ? 'pending' : 'approved',
                bookingRef: ref,
                ticketMode: event.ticketMode || 'qr'
            });

            if (totalAmount > 0) {
                await notifyAdmins('NEW TICKETING ORDER', `Payment verification pending for ${event.title}`, '/admin/tickets', 'ticket');
            }
            setStep('success');
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("Failed to submit order.", 'error');
        }
        setLoading(false);
    };

    const modalContent = (
        <motion.div
            initial={isEmbedded ? {} : (window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 })}
            animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isEmbedded ? {} : (window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 })}
            className={cn(
                "relative w-full bg-zinc-950 border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row transition-all",
                isEmbedded ? "h-full w-full border-0 shadow-none rounded-0" : "max-w-4xl h-[90vh] md:h-[650px] rounded-t-[3rem] md:rounded-[3.5rem]"
            )}
        >
            {/* Left Column: Poster (Hidden in Embedded) */}
            {!isEmbedded && (
                <div className="hidden md:flex w-[320px] bg-black border-r border-white/5 shrink-0 flex-col relative overflow-hidden">
                    <img src={event.image} className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-1000 scale-105" alt="Event" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="relative z-10 p-8 mt-auto space-y-4">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit">
                            <span className="text-[10px] font-black text-neon-blue uppercase tracking-widest">{event.performanceType || 'Protocol'}</span>
                        </div>
                        <h3 className="text-2xl font-black font-heading text-white italic uppercase tracking-tighter leading-none">{event.title}</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                <Calendar size={12} className="text-neon-blue" /> {event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                <MapPin size={12} className="text-neon-pink" /> {event.location || 'Venue TBA'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Right Column: Content */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950/50 backdrop-blur-xl">
                {!isEmbedded && (
                    <button onClick={onClose} className="absolute top-8 right-8 z-50 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all group">
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                )}

                <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-hide">
                    {/* Progress */}
                    <div className="flex gap-2 mb-12">
                        {['overview', 'selection', 'details', 'payment'].filter(s => s !== 'payment' || totalAmount > 0).map((s, i) => {
                            const isPast = ['overview', 'selection', 'details', 'payment'].indexOf(step) > ['overview', 'selection', 'details', 'payment'].indexOf(s);
                            const isActive = step === s;
                            return (
                                <div key={s} className={cn(
                                    "h-1 rounded-full transition-all duration-1000",
                                    isActive ? "flex-[3] bg-neon-blue shadow-[0_0_10px_rgba(46,191,255,0.4)]" : 
                                    isPast ? "flex-1 bg-neon-blue/20" : "flex-1 bg-white/5"
                                )} />
                            );
                        })}
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-neon-blue">
                                        <div className="w-10 h-[1px] bg-current" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em]">Ticketing Protocol</span>
                                    </div>
                                    <h2 className="text-4xl font-black font-heading text-white italic uppercase tracking-tighter leading-none">
                                        Secure your <span className="text-neon-blue">Access.</span>
                                    </h2>
                                </div>

                                {hasTickets && hasGuestlist && (
                                    <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                                        <button onClick={() => setActiveTab('tickets')} className={cn("flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'tickets' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white")}>Tickets</button>
                                        <button onClick={() => setActiveTab('guestlist')} className={cn("flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'guestlist' ? "bg-neon-pink text-black" : "text-gray-500 hover:text-white")}>Guestlist</button>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-2">
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Entry Time</p>
                                            <p className="text-xs font-black text-white italic">{event.doorsOpen || '20:00 HRS'}</p>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-2">
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Age Limit</p>
                                            <p className="text-xs font-black text-white italic">{event.ageLimit || '21+'}</p>
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Event Guidelines</p>
                                        <p className="text-xs text-gray-400 leading-relaxed italic">{event.ticketingDescription || "Standard venue protocols apply. Valid ID required for entry."}</p>
                                    </div>
                                </div>

                                <Button onClick={handleNext} className="w-full h-20 rounded-[2rem] bg-neon-blue text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                                    Proceed to Selection <ArrowRight size={18} />
                                </Button>
                            </motion.div>
                        )}

                        {step === 'layout' && (
                            <motion.div key="layout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 h-full flex flex-col">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setStep('overview')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white"><ChevronLeft size={18}/></button>
                                    <h3 className="text-xl font-black font-heading italic uppercase text-white">Interactive Map</h3>
                                </div>
                                <div className="flex-1 bg-black/50 rounded-2xl border border-white/5 p-2 overflow-hidden relative">
                                    <img src={event.venueLayout} alt="Venue Map" className="w-full h-full object-contain" />
                                    {event.ticketCategories?.map(cat => cat.coords && (
                                        <button
                                            key={cat.id}
                                            onClick={() => updateCart(cat.id, 1)}
                                            className={cn("absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 flex items-center justify-center transition-all", (cart[cat.id] || 0) > 0 ? "bg-neon-green border-white scale-125 shadow-lg" : "bg-black/60 border-neon-green/40")}
                                            style={{ left: `${cat.coords.x}%`, top: `${cat.coords.y}%` }}
                                        >
                                            <Ticket size={12} className={(cart[cat.id] || 0) > 0 ? "text-black" : "text-neon-green"} />
                                        </button>
                                    ))}
                                </div>
                                <Button onClick={handleNext} disabled={cartTotalCount === 0} className="w-full h-14 bg-neon-green text-black font-black uppercase tracking-widest">
                                    Confirm Selection
                                </Button>
                            </motion.div>
                        )}

                        {step === 'selection' && (
                            <motion.div key="selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 h-full flex flex-col">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setStep('overview')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white"><ChevronLeft size={18}/></button>
                                    <h3 className="text-xl font-black font-heading italic uppercase text-white">Select Spots</h3>
                                </div>
                                <div className="flex-1 space-y-4">
                                    {activeTab === 'guestlist' ? (
                                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center gap-8">
                                            <span className="text-7xl font-black italic tracking-tighter tabular-nums">{guestCount}</span>
                                            <div className="flex gap-8">
                                                <button onClick={() => setGuestCount(g => Math.max(1, g - 1))} className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center"><Minus size={24}/></button>
                                                <button onClick={() => setGuestCount(g => Math.min(5, g + 1))} className="w-16 h-16 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue"><Plus size={24}/></button>
                                            </div>
                                        </div>
                                    ) : (
                                        hasCategories ? event.ticketCategories.map(cat => (
                                            <div key={cat.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                                                <div>
                                                    <div className="font-black text-white uppercase text-sm">{cat.name}</div>
                                                    <div className="text-neon-green font-bold text-lg">₹{cat.price}</div>
                                                </div>
                                                <div className="flex items-center gap-4 bg-black p-1 rounded-xl">
                                                    <button onClick={() => updateCart(cat.id, -1)} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Minus size={16}/></button>
                                                    <span className="w-6 text-center font-bold">{cart[cat.id] || 0}</span>
                                                    <button onClick={() => updateCart(cat.id, 1)} className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center"><Plus size={16}/></button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-8 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-6">
                                                <span className="text-5xl font-black tabular-nums">{ticketCount}</span>
                                                <div className="flex gap-8">
                                                    <button onClick={() => setTicketCount(g => Math.max(1, g - 1))} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center"><Minus size={20}/></button>
                                                    <button onClick={() => setTicketCount(g => Math.min(10, g + 1))} className="w-14 h-14 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center"><Plus size={20}/></button>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                                <Button onClick={handleNext} className="w-full h-14 bg-neon-green text-black font-black uppercase tracking-widest">
                                    Proceed
                                </Button>
                            </motion.div>
                        )}

                        {step === 'details' && (
                            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <h3 className="text-xl font-black font-heading italic uppercase text-white">Enter Details</h3>
                                <div className="space-y-4">
                                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-14 bg-white/5" placeholder="Full Name" />
                                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-14 bg-white/5" placeholder="Email Address" />
                                    <Input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-14 bg-white/5" placeholder="Phone Number" />
                                </div>
                                <Button onClick={handleNext} className="w-full h-14 bg-neon-blue text-black font-black uppercase tracking-widest">
                                    Confirm
                                </Button>
                            </motion.div>
                        )}

                        {step === 'payment' && (
                            <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <h3 className="text-xl font-black font-heading italic uppercase text-white">Payment</h3>
                                <div className="bg-white rounded-3xl p-6 text-center border border-gray-200">
                                    {paymentDetails?.upiId && (
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${paymentDetails.upiId}&pn=NewBi&am=${totalAmount}`)}`} alt="QR" className="w-48 h-48 mx-auto" />
                                    )}
                                    <p className="mt-4 font-mono font-bold text-gray-800">{paymentDetails?.upiId}</p>
                                </div>
                                <Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="h-14 bg-white/5" placeholder="Enter Transaction ID" />
                                <Button onClick={submitTickets} disabled={loading || !paymentRef} className="w-full h-14 bg-white text-black font-black uppercase tracking-widest">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Confirm Payment'}
                                </Button>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center h-full gap-6">
                                <CheckCircle2 size={64} className="text-neon-green" />
                                <h3 className="text-2xl font-black font-heading text-white italic uppercase">Success!</h3>
                                <p className="text-gray-400 text-sm">Your booking reference: <span className="text-white font-mono">{bookingRef}</span></p>
                                <Button onClick={handleDownloadTicket} className="w-full h-12 bg-neon-green text-black uppercase font-black">Download Pass</Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Footer */}
                <div className="pt-8 border-t border-white/5 flex items-center justify-between p-8 md:px-12">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">www.newbi.in</p>
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">#AUTHENTIC_ACCESS</p>
                </div>
            </div>
        </motion.div>
    );

    if (isEmbedded) return modalContent;

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
