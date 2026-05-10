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

const EventTicketingModal = ({ event, isOpen, onClose }) => {
    const { user, addTicketOrder, addGuestlistEntry, paymentDetails, setAuthModal } = useStore();
    
    // Core state
    const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' or 'guestlist'
    const [step, setStep] = useState('overview'); // overview, selection, details, payment, success
    
    // Setup tabs based on event config
    const hasTickets = event?.isTicketed;
    const hasGuestlist = event?.isGuestlistEnabled;
    const hasLayout = !!event?.venueLayout;
    const isCustomPriceActive = false; // Add negotiation logic later if needed
    const baseTicketPrice = event?.ticketPrice || 0;
    const hasCategories = event?.ticketCategories && event.ticketCategories.length > 0;

    // Form states
    const [cart, setCart] = useState({});
    const [ticketCount, setTicketCount] = useState(1); // fallback
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
            // Determine default tab
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
                if (totalAmount === 0) {
                    submitTickets();
                } else {
                    setStep('payment');
                }
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

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center overflow-hidden">
                {/* Generating Overlay */}
                <AnimatePresence>
                    {isDownloading && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center gap-6"
                        >
                            <LoadingSpinner size="md" color="#2bd93e" className="mb-4" />
                            <div className="text-center space-y-2">
                                <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em]">STABILIZING ASSETS</p>
                                <p className="text-[12px] font-black text-white uppercase italic tracking-tighter">GENERATING YOUR ACCESS PASS...</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-[#020202]/95 backdrop-blur-[40px] transition-all"
                />

                {/* Modal Container */}
                <motion.div
                    initial={window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
                    animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                    exit={window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={cn(
                        "relative w-full overflow-hidden bg-zinc-950 border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] flex flex-col md:flex-row",
                        "md:max-w-3xl md:h-[480px] md:rounded-3xl md:border", 
                        "h-[95%] rounded-t-3xl border-t"
                    )}
                >
                    {/* Left Banner / Sidebar */}
                    <div className="relative w-full md:w-[384px] h-48 md:h-auto bg-black border-b md:border-b-0 md:border-r border-white/10 shrink-0 overflow-hidden">
                        {event.image && (
                            <img 
                                src={event.image} 
                                alt={event.title} 
                                className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" 
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/80 to-transparent" />
                        
                        <button onClick={onClose} className="md:hidden absolute top-4 right-4 p-2 bg-black/50 backdrop-blur rounded-full text-white/50 border border-white/10 z-50">
                            <X size={20} />
                        </button>

                        <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end gap-4 z-10">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-black font-heading text-white italic tracking-tighter uppercase leading-[0.9]">
                                    {event.title}
                                </h2>
                                {event.artists && event.artists.length > 0 && (
                                    <p className="text-neon-blue font-bold uppercase text-xs mt-2 truncate tracking-widest">
                                        {event.artists.join(' • ')}
                                    </p>
                                )}
                            </div>
                            
                            <div className="space-y-2 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
                                    <Calendar size={14} className="text-neon-green" /> 
                                    {event.date ? new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBA'}
                                </div>
                                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
                                    <MapPin size={14} className="text-neon-pink" /> 
                                    {event.location || 'TBA'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Interactive Area */}
                    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 relative">
                        <button onClick={onClose} className="hidden md:flex absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors z-50">
                            <X size={24} />
                        </button>

                        {/* Tabs (Only if both are enabled and we are in early steps) */}
                        {hasTickets && hasGuestlist && step !== 'success' && step === 'overview' && (
                            <div className="flex border-b border-white/10 pt-4 px-6 md:px-10">
                                <button 
                                    onClick={() => setActiveTab('tickets')}
                                    className={cn("pb-4 px-4 text-xs font-black uppercase tracking-widest transition-colors relative", activeTab === 'tickets' ? "text-neon-green" : "text-gray-500 hover:text-white")}
                                >
                                    Tickets
                                    {activeTab === 'tickets' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-green" />}
                                </button>
                                <button 
                                    onClick={() => setActiveTab('guestlist')}
                                    className={cn("pb-4 px-4 text-xs font-black uppercase tracking-widest transition-colors relative", activeTab === 'guestlist' ? "text-neon-blue" : "text-gray-500 hover:text-white")}
                                >
                                    Guestlist
                                    {activeTab === 'guestlist' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-blue" />}
                                </button>
                            </div>
                        )}

                        {/* Dynamic Step Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 flex flex-col justify-center">
                            <AnimatePresence mode="wait">
                                {/* OVERVIEW */}
                                {step === 'overview' && (
                                    <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                        <h3 className="text-2xl font-black font-heading italic uppercase text-white">
                                            {activeTab === 'tickets' ? "Secure Your Access." : "Join The List."}
                                        </h3>
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-400 leading-relaxed">
                                                {event.ticketingDescription || event.description || "Get ready for an unforgettable experience. Secure your spots now before they sell out."}
                                            </p>
                                            
                                            {event.ticketingRules && (
                                                <div className="pt-4 border-t border-white/5">
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Event Information</p>
                                                    <p className="text-[11px] text-gray-500 whitespace-pre-wrap">{event.ticketingRules}</p>
                                                </div>
                                            )}
                                        </div>

                                        <Button onClick={handleNext} className={cn("w-full h-14 rounded-xl font-black uppercase tracking-widest text-black flex items-center justify-center gap-2 mt-4", activeTab === 'tickets' ? 'bg-neon-green hover:bg-neon-green/80' : 'bg-neon-blue hover:bg-neon-blue/80')}>
                                            {activeTab === 'tickets' ? "BUY TICKETS" : "REGISTER NOW"} <ArrowRight size={18} />
                                        </Button>
                                    </motion.div>
                                )}

                                {/* LAYOUT (Tickets Only) */}
                                {step === 'layout' && (
                                    <motion.div key="layout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 h-full flex flex-col">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setStep('overview')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"><ChevronLeft size={18}/></button>
                                            <h3 className="text-xl font-black font-heading italic uppercase text-white">Venue Map</h3>
                                        </div>
                                        <div className="flex-1 bg-black/50 rounded-2xl border border-white/5 p-2 overflow-hidden">
                                            <img src={event.venueLayout} alt="Venue Map" className="w-full h-full object-contain" />
                                        </div>
                                        <Button onClick={handleNext} className="w-full bg-white text-black h-14 rounded-xl font-black uppercase tracking-widest">
                                            SELECT SEATS
                                        </Button>
                                    </motion.div>
                                )}

                                {/* SELECTION */}
                                {step === 'selection' && (
                                    <motion.div key="selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 h-full flex flex-col">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setStep('overview')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"><ChevronLeft size={18}/></button>
                                            <h3 className="text-xl font-black font-heading italic uppercase text-white">
                                                Select Spots
                                            </h3>
                                        </div>

                                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                            {activeTab === 'guestlist' ? (
                                                <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center gap-8">
                                                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Number of Guests</div>
                                                    <div className="flex items-center gap-10">
                                                        <button 
                                                            onClick={() => setGuestCount(g => Math.max(1, g - 1))} 
                                                            className={cn("w-16 h-16 rounded-full flex items-center justify-center border transition-all", guestCount > 1 ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-transparent border-white/5 text-gray-800 cursor-not-allowed")}
                                                        >
                                                            <Minus size={24}/>
                                                        </button>
                                                        <div className="text-center">
                                                            <span className="text-7xl font-black italic tracking-tighter tabular-nums">{guestCount}</span>
                                                            <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest leading-none block -mt-1">GUESTS</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => setGuestCount(g => Math.min(5, g + 1))} 
                                                            className={cn("w-16 h-16 rounded-full flex items-center justify-center border transition-all", guestCount < 5 ? "bg-neon-blue/10 border-neon-blue/20 text-neon-blue hover:bg-neon-blue hover:text-black" : "bg-transparent border-white/5 text-gray-800 cursor-not-allowed")}
                                                        >
                                                            <Plus size={24}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Tickets Selection
                                                hasCategories ? event.ticketCategories.map(cat => (
                                                    <div key={cat.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                                                        <div>
                                                            <div className="font-black text-white uppercase tracking-widest text-sm">{cat.name}</div>
                                                            <div className="text-neon-green font-bold text-lg mt-1">₹{cat.price}</div>
                                                            {cat.description && <div className="text-xs text-gray-500 mt-1">{cat.description}</div>}
                                                        </div>
                                                        <div className="flex items-center gap-4 bg-black p-1 rounded-xl border border-white/5">
                                                            <button onClick={() => updateCart(cat.id, -1)} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"><Minus size={16}/></button>
                                                            <span className="w-6 text-center font-bold">{cart[cat.id] || 0}</span>
                                                            <button onClick={() => updateCart(cat.id, 1)} className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><Plus size={16}/></button>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="p-8 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-6">
                                                        <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Standard Ticket</div>
                                                        <div className="flex items-center gap-8">
                                                            <button onClick={() => setTicketCount(g => Math.max(1, g - 1))} className="w-14 h-14 rounded-full bg-black border border-white/10 flex items-center justify-center hover:bg-white/10 text-white"><Minus size={20}/></button>
                                                            <span className="text-5xl font-black tabular-nums">{ticketCount}</span>
                                                            <button onClick={() => setTicketCount(g => Math.min(10, g + 1))} className="w-14 h-14 rounded-full bg-neon-green/20 text-neon-green border border-neon-green/30 flex items-center justify-center hover:bg-neon-green hover:text-black"><Plus size={20}/></button>
                                                        </div>
                                                        <div className="text-neon-green font-bold text-xl">₹{baseTicketPrice} / each</div>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-white/10">
                                            {activeTab === 'tickets' && (
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-gray-400 uppercase text-xs font-bold tracking-widest">Total ({cartTotalCount} items)</span>
                                                    <span className="text-2xl font-black text-neon-green">₹{totalAmount}</span>
                                                </div>
                                            )}
                                            <Button onClick={handleNext} className={cn("w-full h-14 rounded-xl font-black uppercase tracking-widest text-black flex items-center justify-center", activeTab === 'tickets' ? 'bg-neon-green' : 'bg-neon-pink')}>
                                                PROCEED <ArrowRight size={18} className="ml-2" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* DETAILS */}
                                {step === 'details' && (
                                    <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 h-full flex flex-col">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setStep('selection')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"><ChevronLeft size={18}/></button>
                                            <h3 className="text-xl font-black font-heading italic uppercase text-white">Enter Details</h3>
                                        </div>
                                        
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Full Name</label>
                                                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-14 bg-white/5" placeholder="John Doe" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Email</label>
                                                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-14 bg-white/5" placeholder="john@example.com" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Phone</label>
                                                <Input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-14 bg-white/5" placeholder="+91 98765 43210" />
                                            </div>

                                            {activeTab === 'guestlist' && guestCount > 1 && (
                                                <div className="space-y-4 pt-4">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-neon-blue mb-2 block">Plus-One Identities</label>
                                                    {[...Array(guestCount - 1)].map((_, i) => (
                                                        <div key={i}>
                                                            <Input 
                                                                value={formData.plusOneNames[i] || ''} 
                                                                onChange={e => {
                                                                    const newNames = [...formData.plusOneNames];
                                                                    newNames[i] = e.target.value;
                                                                    setFormData({...formData, plusOneNames: newNames});
                                                                }} 
                                                                className="h-12 bg-white/5" 
                                                                placeholder={`Guest ${i + 2} Name`} 
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <Button onClick={handleNext} className={cn("w-full h-14 rounded-xl font-black uppercase tracking-widest text-black flex items-center justify-center", activeTab === 'tickets' ? 'bg-neon-green' : 'bg-neon-blue')}>
                                            {activeTab === 'tickets' ? `PAY ₹${totalAmount}` : 'CONFIRM GUESTLIST'}
                                        </Button>
                                    </motion.div>
                                )}

                                {/* PAYMENT (Tickets Only) */}
                                {step === 'payment' && (
                                    <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 h-full flex flex-col">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-black font-heading italic uppercase text-white">Secure Payment</h3>
                                            <button onClick={() => setStep('details')} className="text-gray-500 hover:text-white"><ChevronLeft size={20}/></button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto space-y-6">
                                            <div className="bg-white rounded-3xl p-6 text-center border border-gray-200 shadow-2xl relative overflow-hidden">
                                                <div className="absolute top-0 inset-x-0 bg-neon-green text-black text-[10px] font-black uppercase tracking-widest py-1">UPI QR Verification</div>
                                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-6 mb-4">Scan & Pay ₹{totalAmount}</p>
                                                {paymentDetails?.upiId ? (
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${paymentDetails.upiId}&pn=NewBi Entertainment&am=${totalAmount}&cu=INR`)}`}
                                                        alt="Payment QR"
                                                        className="w-48 h-48 object-contain mx-auto mix-blend-multiply"
                                                    />
                                                ) : (
                                                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm bg-gray-100 rounded-xl">UPI Not Configured</div>
                                                )}
                                                <p className="mt-4 font-mono text-sm font-bold text-gray-800 bg-gray-100 py-2 rounded-xl border border-gray-200">{paymentDetails?.upiId}</p>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Enter UTR / Transaction ID</label>
                                                <Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="h-14 bg-white/5 font-mono tracking-widest text-center focus:border-neon-green" placeholder="e.g. 458210339582" />
                                            </div>
                                        </div>

                                        <Button onClick={submitTickets} disabled={loading || !paymentRef} className="w-full h-14 rounded-xl font-black uppercase tracking-widest bg-white text-black flex items-center justify-center hover:bg-gray-200">
                                            {loading ? <Loader2 className="animate-spin" /> : 'CONFIRM PAYMENT'}
                                        </Button>
                                    </motion.div>
                                )}

                                {/* SUCCESS */}
                                {step === 'success' && (
                                    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center h-full gap-6">
                                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-black mb-1 shadow-[0_0_15px_rgba(0,0,0,0.1)]", activeTab === 'tickets' ? "bg-neon-green" : "bg-neon-blue")}>
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black font-heading italic uppercase text-white">
                                                {activeTab === 'tickets' ? 'Payment Verifying' : 'Guestlist Confirmed'}
                                            </h3>
                                            <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
                                                {activeTab === 'tickets' ? 'Your order has been placed. We will verify your payment and email your tickets shortly.' : 'Your spot is secured. Keep an eye on your email.'}
                                            </p>
                                        </div>
                                        
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full mt-2">
                                            <p className="text-[9px] uppercase font-bold text-gray-600 tracking-widest mb-1">Booking Reference</p>
                                            <p className="text-lg font-black font-mono tracking-widest text-white mb-4">{bookingRef}</p>
                                            
                                            <div className="flex flex-col gap-3">
                                                {activeTab === 'tickets' && event.ticketMode === 'pdf' ? (
                                                    <div className="w-full h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        PDF PASS WILL BE EMAILED
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        onClick={handleDownloadTicket} 
                                                        className={cn("w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all", activeTab === 'tickets' ? 'bg-neon-green text-black' : 'bg-neon-pink text-black')}
                                                    >
                                                        <Download size={14} /> DOWNLOAD PASS
                                                    </Button>
                                                )}
                                                
                                                <a href={`/ticket/${bookingRef}?event=${event.id}`} target="_blank" rel="noopener noreferrer" className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-white transition-all">
                                                    <QrCode size={14} /> VIEW DIGITAL PASS
                                                </a>
                                            </div>
                                        </div>

                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                {/* Hidden Ticket Surface for Download */}
                <div className="fixed -left-[2000px] top-0">
                    <div id="ticket-download-surface" className="w-[800px] bg-black p-16 flex flex-col gap-12 font-sans border-2 border-white/10">
                        {/* Logo Header */}
                        <div className="flex items-center justify-between">
                            <div className="text-4xl font-black italic tracking-tighter text-white uppercase">NEWBI <span className={activeTab === 'tickets' ? 'text-neon-green' : 'text-neon-pink'}>ENT.</span></div>
                            <div className="text-xs font-black text-gray-500 uppercase tracking-[0.5em]">{activeTab === 'tickets' ? 'OFFICIAL_TICKET' : 'GUESTLIST_PASS'}</div>
                        </div>

                        {/* Event Header */}
                        <div className="space-y-4">
                            <h1 className="text-7xl font-black text-white italic uppercase tracking-tighter leading-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                                {event.title}
                            </h1>
                            <div className="flex gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">DATE</p>
                                    <p className="text-xl font-bold text-white uppercase italic">
                                        {event.date ? new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'To Be Announced'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">LOCATION</p>
                                    <p className="text-xl font-bold text-white uppercase italic">{event.location || 'Special Venue'}</p>
                                </div>
                            </div>
                        </div>

                        {/* QR and Code */}
                        <div className="flex items-center gap-16 p-12 bg-zinc-900/50 rounded-[4rem] border border-white/5">
                            <div className="bg-white p-8 rounded-[3rem]">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(bookingRef)}`} 
                                    alt="QR" 
                                    crossOrigin="anonymous"
                                    className="w-48 h-48 mix-blend-multiply" 
                                />
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">ACCESS CODE</p>
                                    <p className="text-6xl font-black text-white italic tracking-tighter">{bookingRef}</p>
                                </div>
                                <div className="flex gap-8">
                                    <div>
                                        <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest">{activeTab === 'tickets' ? 'ITEMS' : 'GUESTS'}</p>
                                        <p className={cn("text-2xl font-bold italic", activeTab === 'tickets' ? 'text-neon-green' : 'text-neon-pink')}>
                                            {activeTab === 'tickets' ? cartTotalCount : guestCount}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest">HOLDER</p>
                                        <p className="text-lg font-bold text-white uppercase italic truncate max-w-[200px]">{formData.name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">www.newbi.in</p>
                            <p className={cn("text-[9px] font-black uppercase tracking-[0.3em] opacity-50", activeTab === 'tickets' ? 'text-neon-green' : 'text-neon-pink')}>#AUTHENTIC_ACCESS_ONLY</p>
                        </div>
                    </div>
                </div>
            </div>
        </AnimatePresence>
    );
};

export default EventTicketingModal;
