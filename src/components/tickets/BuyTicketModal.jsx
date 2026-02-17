import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, CheckCircle, ArrowRight, Loader, Minus, Plus, ChevronDown, ChevronUp, Info, Map as MapIcon } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const BuyTicketModal = ({ event, isOpen, onClose }) => {
    const { addTicketOrder, paymentDetails } = useStore();
    const [step, setStep] = useState(1); // 0: Layout, 1: Selection, 2: Details, 3: Payment, 4: Success
    const [loading, setLoading] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        count: 1 // Legacy/Fallback
    });

    // Multi-category state
    const [cart, setCart] = useState({});
    const [paymentRef, setPaymentRef] = useState('');

    const hasCategories = event.ticketCategories && event.ticketCategories.length > 0;
    const hasLayout = !!event.venueLayout;

    // Initialize/Reset State
    useEffect(() => {
        if (isOpen) {
            setStep(hasLayout ? 0 : 1);
            setCart({});
            setFormData(prev => ({ ...prev, count: 1 }));
            setPaymentRef('');
        }
    }, [isOpen, event]);

    // Calculate Total
    const totalAmount = hasCategories
        ? event.ticketCategories.reduce((acc, cat) => acc + (cat.price * (cart[cat.id] || 0)), 0)
        : (event.ticketPrice || 0) * formData.count;

    const cartTotalCount = hasCategories
        ? Object.values(cart).reduce((a, b) => a + b, 0)
        : formData.count;

    // Handlers
    const updateCart = (catId, delta) => {
        setCart(prev => ({
            ...prev,
            [catId]: Math.max(0, (prev[catId] || 0) + delta)
        }));
    };

    const handleNext = (e) => {
        if (e) e.preventDefault();

        if (step === 0) {
            setStep(1);
        } else if (step === 1) {
            if (cartTotalCount === 0) return alert("Please select at least one ticket.");
            setStep(2);
        } else if (step === 2) {
            if (!formData.name || !formData.email || !formData.phone) return alert("Please fill all details.");
            setStep(3);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!paymentRef) return alert("Please enter the UTR/Reference No.");

        setLoading(true);
        try {
            // Construct Order Items
            const items = hasCategories
                ? event.ticketCategories.filter(c => cart[c.id] > 0).map(c => ({
                    categoryId: c.id,
                    name: c.name,
                    price: c.price,
                    count: cart[c.id]
                }))
                : [{ name: 'Standard Ticket', price: event.ticketPrice || 0, count: Number(formData.count) }];

            await addTicketOrder({
                eventId: event.id,
                eventTitle: event.title,
                customerName: formData.name,
                customerEmail: formData.email,
                customerPhone: formData.phone,
                items: items,
                totalAmount,
                paymentRef,
                status: 'pending' // pending approval
            });
            setStep(4);
        } catch (error) {
            console.error("Order failed:", error);
            alert("Failed to submit order. Please try again.");
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative my-auto"
                >
                    {/* Progress Bar */}
                    <div className="h-1 bg-white/5 w-full flex">
                        <div className={`h-full bg-neon-green transition-all duration-500`} style={{ width: `${(step / 4) * 100}%` }}></div>
                    </div>

                    {/* Header */}
                    <div className="flex justify-between items-start p-6 pb-2">
                        <div>
                            <h2 className="text-xl font-bold font-heading text-white leading-tight">
                                {step === 4 ? 'Order Place Successfully!' : event.title}
                            </h2>
                            {step < 4 && <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                                {step === 0 && 'Venue Layout'}
                                {step === 1 && 'Select Tickets'}
                                {step === 2 && 'Your Details'}
                                {step === 3 && 'Payment'}
                            </p>}
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 pt-4 min-h-[400px] flex flex-col">

                        {/* Step 0: Venue Layout */}
                        {step === 0 && hasLayout && (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 bg-black rounded-xl overflow-hidden border border-white/10 relative group">
                                    <img src={event.venueLayout} alt="Venue Map" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <p className="text-white font-bold"><MapIcon className="inline mr-2" />Venue Map</p>
                                    </div>
                                </div>
                                <Button onClick={handleNext} className="w-full mt-6 bg-white text-black hover:bg-gray-200">
                                    Proceed to Select Tickets <ArrowRight size={16} className="ml-2" />
                                </Button>
                            </div>
                        )}

                        {/* Step 1: Selection */}
                        {step === 1 && (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 space-y-4 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
                                    {hasCategories ? (
                                        event.ticketCategories.map(cat => (
                                            <div key={cat.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-white capitalize">{cat.name}</h3>
                                                    {cat.description && <p className="text-xs text-gray-400 max-w-[150px]">{cat.description}</p>}
                                                    <p className="text-neon-green font-bold mt-1">₹{cat.price}</p>
                                                </div>
                                                <div className="flex items-center gap-3 bg-black rounded-lg p-1 border border-white/10">
                                                    <button
                                                        onClick={() => updateCart(cat.id, -1)}
                                                        className="w-8 h-8 flex items-center justify-center rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-6 text-center font-bold">{cart[cat.id] || 0}</span>
                                                    <button
                                                        onClick={() => updateCart(cat.id, 1)}
                                                        className="w-8 h-8 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="bg-white/5 p-6 rounded-xl border border-white/10 text-center">
                                            <h3 className="font-bold text-lg mb-4">Standard Entry</h3>
                                            <div className="flex items-center justify-center gap-6">
                                                <button
                                                    onClick={() => setFormData(p => ({ ...p, count: Math.max(1, p.count - 1) }))}
                                                    className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 border border-white/10"
                                                >
                                                    <Minus />
                                                </button>
                                                <span className="text-3xl font-bold font-heading w-12">{formData.count}</span>
                                                <button
                                                    onClick={() => setFormData(p => ({ ...p, count: Math.min(10, p.count + 1) }))}
                                                    className="w-12 h-12 rounded-xl bg-neon-green/20 text-neon-green flex items-center justify-center hover:bg-neon-green/30 border border-neon-green/30"
                                                >
                                                    <Plus />
                                                </button>
                                            </div>
                                            <p className="text-gray-400 mt-4 text-sm">Price per ticket: <span className="text-white">₹{event.ticketPrice || 0}</span></p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-400">Total ({cartTotalCount} tickets)</span>
                                        <span className="text-2xl font-bold text-neon-green">₹{totalAmount}</span>
                                    </div>
                                    <Button
                                        onClick={handleNext}
                                        disabled={cartTotalCount === 0}
                                        className="w-full bg-neon-green text-black hover:bg-neon-green/90"
                                    >
                                        Enter Details <ArrowRight size={16} className="ml-2" />
                                    </Button>
                                    {hasLayout && (
                                        <button onClick={() => setStep(0)} className="w-full text-center text-xs text-gray-500 mt-3 hover:text-white">
                                            View Venue Layout
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Details */}
                        {step === 2 && (
                            <form onSubmit={handleNext} className="flex flex-col h-full space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Full Name</label>
                                    <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Rahul Verma" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Email Address</label>
                                    <Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="rahul@example.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Phone Number</label>
                                    <Input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 98765 43210" />
                                </div>

                                <div className="mt-auto pt-6">
                                    <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200">
                                        Proceed to Pay ₹{totalAmount}
                                    </Button>
                                    <button type="button" onClick={() => setStep(1)} className="w-full text-center text-xs text-gray-500 mt-3 hover:text-white">
                                        Back curb selection
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 3: Payment */}
                        {step === 3 && (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                    <div className="bg-white rounded-2xl p-6 text-center mb-6 border border-gray-200 shadow-xl">
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">Scan & Pay ₹{totalAmount}</p>
                                        {paymentDetails?.upiId ? (
                                            <div className="inline-block p-4 bg-white rounded-xl border border-gray-200">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${paymentDetails.upiId}&pn=NewBi Entertainment&am=${totalAmount}&cu=INR`)}`}
                                                    alt="Payment QR"
                                                    className="w-48 h-48 object-contain mx-auto mix-blend-multiply"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-48 flex items-center justify-center text-gray-400 text-sm bg-gray-100 rounded-lg">UPI ID Config Missing</div>
                                        )}
                                        <div className="mt-4">
                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">UPI ID</p>
                                            <p className="font-mono text-sm font-bold text-gray-800 select-all bg-gray-100 py-2 rounded-lg border border-gray-200">{paymentDetails?.upiId}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Enter Transaction ID / UTR</label>
                                            <Input
                                                required
                                                value={paymentRef}
                                                onChange={e => setPaymentRef(e.target.value)}
                                                placeholder="e.g. 458210339582"
                                                className="text-center font-mono tracking-widest bg-white/5 border-neon-blue/30 focus:border-neon-blue"
                                            />
                                        </div>

                                        <div className="border border-white/10 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setShowHelp(!showHelp)}
                                                className="w-full flex justify-between items-center p-4 bg-white/5 hover:bg-white/10 transition-colors"
                                            >
                                                <span className="text-xs font-bold flex items-center gap-2"><Info size={14} /> How to find Transaction ID?</span>
                                                {showHelp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                            {showHelp && (
                                                <div className="p-4 bg-black/50 text-xs text-gray-400 space-y-2">
                                                    <p><strong className="text-white">GPay:</strong> Open transaction → Look for "UPI Transaction ID".</p>
                                                    <p><strong className="text-white">PhonePe:</strong> Open history → Tap transaction → Copy "UTR" or "Transaction ID".</p>
                                                    <p><strong className="text-white">Paytm:</strong> Check "UPI Ref No" under payment details.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <Button onClick={handleSubmit} disabled={loading || !paymentRef} className="w-full bg-neon-blue text-black hover:bg-white">
                                        {loading ? <Loader className="animate-spin" /> : 'Confirm Payment'}
                                    </Button>
                                    <button onClick={() => setStep(2)} className="w-full text-center text-xs text-gray-500 mt-3 hover:text-white">Back</button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Success */}
                        {step === 4 && (
                            <div className="flex flex-col h-full items-center justify-center text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-24 h-24 bg-neon-green/20 text-neon-green rounded-full flex items-center justify-center mb-6"
                                >
                                    <CheckCircle size={48} />
                                </motion.div>
                                <h3 className="text-3xl font-bold text-white mb-2 font-heading">You're In!</h3>
                                <p className="text-gray-400 mb-8 max-w-xs">
                                    Your order has been placed. We will verify your payment and email your tickets shortly.
                                </p>
                                <div className="bg-white/5 rounded-xl p-4 w-full mb-8">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Paid</p>
                                    <p className="text-2xl font-bold text-neon-green">₹{totalAmount}</p>
                                </div>
                                <Button onClick={onClose} variant="outline" className="w-full">
                                    Return to Community
                                </Button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BuyTicketModal;
