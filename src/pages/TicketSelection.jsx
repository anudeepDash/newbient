import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, QrCode, CheckCircle, ArrowRight, Loader, Minus, Plus, 
    ChevronDown, ChevronUp, Info, Map as MapIcon, ArrowLeft,
    Ticket, ShoppingCart, ShieldCheck, Zap
} from 'lucide-react';
import { useStore } from '../lib/store';
import { notifyAdmins } from '../lib/notificationTriggers';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const TicketSelection = () => {
    const [searchParams] = useSearchParams();
    const eventId = searchParams.get('event');
    const customPriceParam = searchParams.get('customPrice');
    const { upcomingEvents, addTicketOrder, paymentDetails, user } = useStore();
    
    const [event, setEvent] = useState(null);
    const [step, setStep] = useState(1); // 0: Layout, 1: Selection, 1.5: Briefing, 2: Details, 3: Payment
    const [loading, setLoading] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        count: 1
    });

    const [cart, setCart] = useState({});
    const [paymentRef, setPaymentRef] = useState('');

    useEffect(() => {
        if (eventId && upcomingEvents.length > 0) {
            const found = upcomingEvents.find(e => e.id === eventId);
            if (found) {
                setEvent(found);
                // If event has layout, start at step 0 (Layout)
                if (found.venueLayout) setStep(0);
            }
        }
    }, [eventId, upcomingEvents]);

    if (!event) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-8">
                <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                        <Ticket className="text-gray-600" size={32} />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-widest text-white">Loading Event...</h1>
                    <Link to="/" className="text-neon-blue text-xs font-black uppercase tracking-widest hover:underline block pt-4">Back to Home</Link>
                </div>
            </div>
        );
    }

    const isCustomPriceActive = !!customPriceParam;
    const urlCustomPrice = isCustomPriceActive ? Number(customPriceParam) : null;
    const hasCategories = !isCustomPriceActive && event.ticketCategories && event.ticketCategories.length > 0;
    const hasLayout = !!event.venueLayout;

    const baseTicketPrice = isCustomPriceActive ? urlCustomPrice : (event.ticketPrice || 0);

    const totalAmount = hasCategories
        ? event.ticketCategories.reduce((acc, cat) => acc + (cat.price * (cart[cat.id] || 0)), 0)
        : baseTicketPrice * formData.count;

    const cartTotalCount = hasCategories
        ? Object.values(cart).reduce((a, b) => a + b, 0)
        : formData.count;

    const updateCart = (catId, delta) => {
        const cat = event.ticketCategories.find(c => c.id === catId);
        const currentCount = cart[catId] || 0;
        const newCount = currentCount + delta;

        if (newCount < 0) return;
        
        // Fix: Use cat.perUserLimit or fallback to event-level perUserLimit
        const effectiveLimit = cat.perUserLimit || event.perUserLimit;
        if (effectiveLimit && newCount > effectiveLimit) return;
        
        setCart(prev => ({
            ...prev,
            [catId]: newCount
        }));
    };

    // Helper to format values (e.g., adding commas for numbers)
    const formatResponseValue = (val) => {
        if (!val) return '';
        // If it looks like a number, format it with commas
        if (/^\d+$/.test(val)) {
            return Number(val).toLocaleString();
        }
        return val;
    };

    const handleNext = (e) => {
        if (e) e.preventDefault();
        if (step === 0) setStep(1);
        else if (step === 1) {
            if (cartTotalCount === 0) return alert("Please select at least one ticket.");
            setStep(1.5);
        } else if (step === 1.5) {
            setStep(2);
        } else if (step === 2) {
            if (!formData.name || !formData.email || !formData.phone) return alert("Please fill all details.");
            if (totalAmount === 0) {
                // Skip payment for free tickets
                handleSubmit();
            } else {
                setStep(3);
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (totalAmount > 0 && !paymentRef) return alert("Please enter the UTR/Reference No.");

        setLoading(true);
        try {
            const items = hasCategories
                ? event.ticketCategories.filter(c => cart[c.id] > 0).map(c => ({
                    categoryId: c.id,
                    name: c.name,
                    price: c.price,
                    count: cart[c.id]
                }))
                : [{ name: isCustomPriceActive ? 'Negotiated Ticket' : 'Standard Ticket', price: baseTicketPrice, count: Number(formData.count) }];

            await addTicketOrder({
                eventId: event.id,
                eventTitle: event.title,
                customerName: formData.name,
                customerEmail: formData.email,
                customerPhone: formData.phone,
                userId: user?.uid || null,
                items: items,
                totalAmount,
                paymentRef: totalAmount === 0 ? 'FREE_ENTRY' : paymentRef,
                status: totalAmount === 0 ? 'approved' : 'pending'
            });

            await notifyAdmins(
                'NEW TICKETING OPERATION',
                `INBOUND TRANSACTION FROM ${formData.name.toUpperCase()} FOR "${event.title.toUpperCase()}". VERIFICATION REQUIRED.`,
                '/admin/tickets',
                'ticket'
            );
            setIsSuccess(true);
        } catch (error) {
            console.error("Order failed:", error);
            alert("Failed to submit order. Please try again.");
        }
        setLoading(false);
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl"
                >
                    <div className="w-24 h-24 bg-neon-green/10 text-neon-green rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle size={48} />
                    </div>
                    <h1 className="text-4xl font-black font-heading tracking-tighter italic mb-4">You're In.</h1>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Your ticketing request for <span className="text-white font-bold">{event.title}</span> has been received. 
                        Once verified, your digital twin will be dispatched to your email.
                    </p>
                    <div className="bg-black/40 rounded-2xl p-6 mb-10 border border-white/5">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Contribution</p>
                        <p className="text-3xl font-black text-neon-green italic">₹{totalAmount.toLocaleString()}</p>
                    </div>
                    <Link to="/" className="inline-flex items-center justify-center h-14 px-10 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all w-full">
                        Return to Hub
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-neon-blue selection:text-black">
            {/* Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-blue/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-neon-green/5 rounded-full blur-[120px]" />
            </div>

            {/* Header */}
            <header className="fixed top-0 inset-x-0 h-20 bg-black/40 backdrop-blur-3xl border-b border-white/5 z-50 px-6">
                <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group text-gray-500 hover:text-white transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Exit to Hub</span>
                    </Link>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-neon-blue/10 flex items-center justify-center border border-neon-blue/20">
                            <Zap size={14} className="text-neon-blue" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Ticketing <span className="text-gray-500">Portal.</span></span>
                    </div>

                    <div className="hidden sm:flex items-center gap-4">
                        <div className="h-10 w-[1px] bg-white/10" />
                        <div className="text-right">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Secured Transaction</p>
                            <p className="text-[9px] font-bold text-neon-green uppercase tracking-tight">Encryption Active</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 pt-32 pb-20 px-4">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    
                    {/* Event Preview Side */}
                    <div className="space-y-8 lg:sticky lg:top-32">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Event</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black font-heading tracking-tighter italic leading-none">
                                {event.title}<span className="text-neon-blue">.</span>
                            </h1>
                            <p className="text-gray-400 text-lg md:text-xl font-medium max-w-lg leading-relaxed">
                                {event.description || "Secure your position for an unparalleled experience. Join the vanguard."}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 rounded-3xl bg-zinc-900 border border-white/5 space-y-1">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Terminal</p>
                                <p className="text-lg font-bold text-white">{event.location}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-zinc-900 border border-white/5 space-y-1">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scheduled</p>
                                <p className="text-lg font-bold text-white">{event.date}</p>
                            </div>
                        </div>

                        {/* Order Summary Summary (Fixed on Desktop) */}
                        <div className="p-8 rounded-[2.5rem] bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-2xl">
                            <div className="flex items-center gap-3 mb-8">
                                <ShoppingCart size={20} className="text-neon-blue" />
                                <h3 className="text-sm font-black uppercase tracking-widest">Investment Summary</h3>
                            </div>
                            
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-gray-500 text-xs font-bold uppercase tracking-widest">
                                    <span>Positions selected</span>
                                    <span className="text-white">{cartTotalCount}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-500 text-xs font-bold uppercase tracking-widest">
                                    <span>Network Fee</span>
                                    <span className="text-neon-green">₹0</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Contribution</p>
                                    <p className="text-4xl font-black font-heading tracking-tighter italic">₹{totalAmount.toLocaleString()}</p>
                                </div>
                                <ShieldCheck size={40} className="text-white/5" />
                            </div>
                        </div>
                    </div>

                    {/* Interaction Side */}
                    <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        {/* Progress Bar */}
                        <div className="h-1 bg-white/5 w-full flex">
                            <div className="h-full bg-neon-blue transition-all duration-500" style={{ width: `${(step === 1.5 ? 45 : (step / 3) * 100)}%` }}></div>
                        </div>

                        <div className="p-8 md:p-12">
                            {/* Step Headers */}
                            {step < 4 && (
                                <div className="mb-10">
                                    <p className="text-[11px] font-black text-neon-blue uppercase tracking-[0.3em] mb-2 drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">
                                        Step 0{step + 1}
                                    </p>
                                    <h2 className="text-3xl font-black font-heading tracking-tighter italic">
                                        {step === 0 && 'Environmental Scan.'}
                                        {step === 1 && 'Tier Selection.'}
                                        {step === 1.5 && 'Mission Briefing.'}
                                        {step === 2 && 'Identity Verification.'}
                                        {step === 3 && 'Financial Protocol.'}
                                    </h2>
                                </div>
                            )}

                            {/* Step 0: Venue Layout */}
                            {step === 0 && hasLayout && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/5 relative group cursor-crosshair">
                                        <img src={event.venueLayout} alt="Location Map" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-neon-blue/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none backdrop-blur-sm">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-black bg-neon-blue px-4 py-2 rounded-full shadow-2xl">Reference Map Only</p>
                                        </div>
                                    </div>
                                    <Button onClick={handleNext} className="h-16 w-full bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-2xl">
                                        Proceed to Entry Points <ArrowRight size={16} className="ml-2" />
                                    </Button>
                                </div>
                            )}

                            {/* Step 1: Selection */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {hasCategories ? (
                                        <div className="space-y-4">
                                            {event.ticketCategories.map(cat => {
                                                const isSoldOut = cat.limit !== null && cat.sold >= cat.limit;
                                                return (
                                                <div key={cat.id} className={cn(
                                                    "p-6 rounded-[2rem] bg-black/40 border transition-all group",
                                                    isSoldOut ? "opacity-50 border-white/5 grayscale" : "border-white/5 hover:border-neon-blue/30"
                                                )}>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <h3 className="text-lg font-black italic tracking-tight mb-1">{cat.name}</h3>
                                                            {cat.description && <p className="text-xs text-gray-500 font-medium leading-relaxed">{cat.description}</p>}
                                                        </div>
                                                        <p className="text-xl font-black text-neon-green italic">
                                                            {isSoldOut ? 'Sold Out' : `₹${cat.price.toLocaleString()}`}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                                            {isSoldOut ? 'Archive' : 'Select Position'}
                                                        </p>
                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                disabled={isSoldOut}
                                                                onClick={() => updateCart(cat.id, -1)}
                                                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-0"
                                                            >
                                                                <Minus size={16} />
                                                            </button>
                                                            <span className="w-6 text-center text-lg font-black">{cart[cat.id] || 0}</span>
                                                            <button
                                                                disabled={isSoldOut || (cat.perUserLimit !== null && (cart[cat.id] || 0) >= cat.perUserLimit)}
                                                                onClick={() => updateCart(cat.id, 1)}
                                                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-neon-blue text-black hover:scale-110 shadow-lg shadow-neon-blue/20 transition-all disabled:opacity-0"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                    ) : (
                                        <div className="p-10 rounded-[2.5rem] bg-black/40 border border-white/5 text-center relative overflow-hidden group">
                                            {isCustomPriceActive && (
                                                <div className="absolute top-0 inset-x-0 bg-neon-blue text-black text-[10px] font-black uppercase tracking-widest py-1.5 italic">
                                                    Special Access Protocol Active
                                                </div>
                                            )}
                                            <div className="flex justify-center mb-8">
                                                <div className="w-16 h-16 rounded-[2rem] bg-neon-blue/10 flex items-center justify-center border border-neon-blue/20 group-hover:scale-110 transition-transform duration-500">
                                                    <Zap size={24} className="text-neon-blue" />
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-black italic tracking-tighter mb-4">
                                                {isCustomPriceActive ? "Negotiated Access." : "Standard Terminal."}
                                            </h3>
                                            <div className="flex items-center justify-center gap-8 mb-8">
                                                <button
                                                    onClick={() => setFormData(p => ({ ...p, count: Math.max(1, p.count - 1) }))}
                                                    className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 transition-all"
                                                >
                                                    <Minus size={20} />
                                                </button>
                                                <span className="text-5xl font-black font-heading tracking-tighter italic w-16">{formData.count}</span>
                                                <button
                                                    onClick={() => {
                                                        const limit = event.perUserLimit || 10;
                                                        if (formData.count < limit) {
                                                            setFormData(p => ({ ...p, count: p.count + 1 }));
                                                        }
                                                    }}
                                                    className="w-14 h-14 rounded-2xl bg-neon-blue text-black flex items-center justify-center hover:scale-110 transition-all shadow-xl shadow-neon-blue/20"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Entry Price</p>
                                                <p className="text-2xl font-black text-neon-green italic">₹{baseTicketPrice.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-4">
                                        <Button
                                            onClick={handleNext}
                                            disabled={cartTotalCount === 0}
                                            className="h-16 w-full bg-neon-blue text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-2xl disabled:opacity-30"
                                        >
                                            Continue to Identification <ArrowRight size={16} className="ml-2" />
                                        </Button>
                                        {hasLayout && (
                                            <button onClick={() => setStep(0)} className="w-full text-center text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all">
                                                Review Venue Blueprint
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                             {/* Step 1.5: Briefing */}
                            {step === 1.5 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-6">
                                        <div className="p-8 rounded-[2rem] bg-black/40 border border-white/5 space-y-4">
                                            <p className="text-[10px] font-black text-neon-blue uppercase tracking-widest flex items-center gap-2">
                                                <Info size={14} /> Operational Directive
                                            </p>
                                            <p className="text-sm text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                                                {event.description}
                                            </p>
                                        </div>

                                        <div className="p-8 rounded-[2rem] bg-neon-blue/5 border border-neon-blue/10 space-y-4">
                                            <p className="text-[10px] font-black text-neon-blue uppercase tracking-widest flex items-center gap-2">
                                                <ShieldCheck size={14} /> Critical Instructions
                                            </p>
                                            <p className="text-sm text-white leading-relaxed font-bold whitespace-pre-wrap">
                                                {event.instructions || "No special instructions provided. Proceed with standard protocol."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <Button 
                                            onClick={handleNext}
                                            className="h-16 w-full bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-2xl"
                                        >
                                            I Understand & Accept <ArrowRight size={16} className="ml-2" />
                                        </Button>
                                        <button onClick={() => setStep(1)} className="w-full text-center text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all">
                                            Return to Selection
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Details */}
                            {step === 2 && (
                                <form onSubmit={handleNext} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Legal Name</label>
                                            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-14 bg-black/40 border-white/5 rounded-2xl font-bold" placeholder="Identity as per official documents" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Communication Terminal</label>
                                            <Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-14 bg-black/40 border-white/5 rounded-2xl font-bold" placeholder="E-ticket will be dispatched here" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Secure Contact</label>
                                            <Input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="h-14 bg-black/40 border-white/5 rounded-2xl font-bold" placeholder="+91 XXX XXX XXXX" />
                                        </div>
                                    </div>

                                    <div className="pt-6 space-y-4">
                                        <Button type="submit" className="h-16 w-full bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-2xl">
                                            Confirm Identity & {totalAmount === 0 ? 'Claim Free Entry' : `Pay ₹${totalAmount.toLocaleString()}`}
                                        </Button>
                                        <button type="button" onClick={() => setStep(1.5)} className="w-full text-center text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all">
                                            Review Mission Briefing
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Step 3: Payment */}
                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="p-8 rounded-[2rem] bg-white text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/10 group">
                                        <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] mb-4">Official Receipt Portal</p>
                                        {paymentDetails?.upiId ? (
                                            <div className="inline-block p-6 bg-white rounded-3xl border border-gray-100 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${paymentDetails.upiId}&pn=NewBi Entertainment&am=${totalAmount}&cu=INR`)}`}
                                                    alt="Secure Payment QR"
                                                    className="w-56 h-56 object-contain mx-auto mix-blend-multiply"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-48 flex items-center justify-center text-gray-400 text-xs bg-gray-50 rounded-2xl border-dashed border-2 border-gray-200 uppercase tracking-widest font-black italic">UPI Payload Missing</div>
                                        )}
                                        <div className="mt-8">
                                            <p className="text-[8px] uppercase font-black text-gray-400 tracking-widest mb-1">Direct Payload ID</p>
                                            <p className="font-mono text-xs font-black text-gray-800 select-all bg-gray-100 py-3 rounded-xl border border-gray-200 tracking-wide">{paymentDetails?.upiId}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Transaction Proof (UTR / REF ID)</label>
                                            <Input
                                                required
                                                value={paymentRef}
                                                onChange={e => setPaymentRef(e.target.value)}
                                                className="h-16 bg-black/40 border-neon-blue/30 focus:border-neon-blue rounded-2xl text-center font-mono text-xl tracking-[0.3em] font-black"
                                                placeholder="XXXXXXXXXXXX"
                                            />
                                        </div>

                                        <div className="rounded-2xl border border-white/5 overflow-hidden">
                                            <button
                                                onClick={() => setShowHelp(!showHelp)}
                                                className="w-full flex justify-between items-center p-4 bg-white/5 hover:bg-white/10 transition-colors"
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Info size={14} className="text-neon-blue" /> Recovery Protocol</span>
                                                {showHelp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                            {showHelp && (
                                                <div className="p-6 bg-black/40 text-[11px] text-gray-400 space-y-3 leading-relaxed border-t border-white/5">
                                                    <p><strong className="text-white uppercase text-[9px] tracking-widest mr-2">GPay :</strong> Terminal History → Position ID → Copy "UPI Transaction ID".</p>
                                                    <p><strong className="text-white uppercase text-[9px] tracking-widest mr-2">PhnPe :</strong> Transactions → Position details → Copy "UTR".</p>
                                                    <p><strong className="text-white uppercase text-[9px] tracking-widest mr-2">Pytm :</strong> Gateway logs → Copy "UPI Ref No".</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 space-y-4">
                                        <Button onClick={handleSubmit} disabled={loading || !paymentRef} className="h-16 w-full bg-neon-blue text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-[0_10px_40px_rgba(0,255,255,0.2)]">
                                            {loading ? <Loader className="animate-spin" /> : 'Complete Transaction'}
                                        </Button>
                                        <button onClick={() => setStep(2)} className="w-full text-center text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all">Back to Identification</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Security Badge (Mobile) */}
                    <div className="lg:hidden text-center space-y-4 pt-8">
                        <div className="inline-flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            <ShieldCheck size={14} /> Encrypted Gateway
                        </div>
                    </div>
                </div>
            </main>

            {/* Floating Contact Support (Optional) */}
            <div className="fixed bottom-8 right-8 z-[100]">
                 <a 
                    href="https://wa.me/919304372773" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-3xl hover:bg-zinc-800 transition-all group shadow-2xl"
                >
                    <div className="w-10 h-10 rounded-2xl bg-neon-green/10 flex items-center justify-center text-neon-green group-hover:scale-110 transition-transform">
                        < Zap size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Support Terminal</p>
                        <p className="text-xs font-bold text-white tracking-tight">Active Connection</p>
                    </div>
                 </a>
            </div>
        </div>
    );
};

export default TicketSelection;
