import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Ticket, 
    ArrowRight, 
    Loader2, 
    AlertTriangle,
    User,
    Mail,
    Phone,
    Minus,
    Plus,
    Users,
    QrCode,
    ChevronLeft,
    ShieldCheck,
    Download,
    ExternalLink
} from 'lucide-react';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import html2canvas from 'html2canvas';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { cn } from '../../lib/utils';

const UnifiedGuestlistModal = ({ isOpen, onClose, guestlist }) => {
    const { user, addGuestlistEntry } = useStore();
    
    // Steps: 'selection', 'details', 'loading', 'success', 'error'
    const [step, setStep] = useState('selection'); 
    const [guestsCount, setGuestsCount] = useState(1);
    const [formData, setFormData] = useState({
        name: user?.displayName || '',
        email: user?.email || '',
        phone: '',
        plusOneNames: [],
        customFields: {}
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [bookingRef, setBookingRef] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    const maxPerUser = guestlist?.perUserLimit || 1;
    const maxSpots = guestlist?.maxSpots || 0;
    const currentSpots = guestlist?.currentSpots || 0;
    const remainingSpots = Math.max(0, maxSpots - currentSpots);

    const canIncrement = guestsCount < maxPerUser && guestsCount < remainingSpots;
    const canDecrement = guestsCount > 1;

    useEffect(() => {
        if (isOpen) {
            setStep('selection');
            setGuestsCount(1);
            setBookingRef('');
            setError(null);
            setFormData({
                name: user?.displayName || '',
                email: user?.email || '',
                phone: '',
                plusOneNames: [],
                customFields: {}
            });
        }
    }, [isOpen, user]);

    if (!isOpen || !guestlist) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('custom:')) {
            const fieldId = name.split(':')[1];
            setFormData(prev => ({
                ...prev,
                customFields: { ...prev.customFields, [fieldId]: value }
            }));
        } else if (name.startsWith('plusOne:')) {
            const idx = parseInt(name.split(':')[1]);
            const newNames = [...formData.plusOneNames];
            newNames[idx] = value;
            setFormData(prev => ({ ...prev, plusOneNames: newNames }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setStep('loading');

        try {
            if (maxSpots && currentSpots + guestsCount > maxSpots) {
                throw new Error("Guestlist capacity exceeded during your session.");
            }

            const ref = `GL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            setBookingRef(ref);

            const entryData = {
                guestlistId: guestlist.id,
                title: guestlist.title,
                date: guestlist.date,
                location: guestlist.location || 'Venue',
                image: guestlist.image || '',
                userId: user?.uid || null,
                customerName: formData.name,
                customerEmail: formData.email,
                customerPhone: formData.phone,
                guestsCount: guestsCount,
                plusOneNames: formData.plusOneNames.filter(Boolean),
                customFields: formData.customFields,
                status: 'approved',
                createdAt: new Date().toISOString(),
                bookingRef: ref
            };

            await addGuestlistEntry(guestlist.id, entryData);
            setStep('success');
        } catch (err) {
            setError(err.message || "Registration failed.");
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTicket = async () => {
        const ticket = document.getElementById('ticket-download-surface');
        if (!ticket) return;

        setIsDownloading(true);
        try {
            const canvas = await html2canvas(ticket, {
                scale: 2, // Optimized from 3 to 2 for performance
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

    const capacityPercentage = maxSpots ? (currentSpots / maxSpots) * 100 : 0;
    const isFull = maxSpots > 0 && currentSpots >= maxSpots;

    return (
        <AnimatePresence>
            {isOpen && (
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

                    {/* Artsy Glass Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#020202]/95 backdrop-blur-[60px] transition-all"
                    />

                    {/* Modal Content: Mobile Drawer / Desktop Compact Card */}
                    <motion.div
                        initial={window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.9, y: 20 }}
                        animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 250, damping: 30 }}
                        className={cn(
                            "relative w-full overflow-hidden bg-black/40 border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.9)] backdrop-blur-3xl flex flex-col sm:flex-row",
                            "md:max-w-3xl md:h-[480px] md:rounded-[2.5rem] md:border", // desktop: Balanced 4:5 card
                            "h-[92%] rounded-t-[3.5rem] border-t" // mobile: High bottom sheet
                        )}
                    >
                        {/* High-Impact Visual Sidebar / Header Image */}
                        <div className="relative w-full sm:w-[384px] h-48 sm:h-auto bg-[#0a0a0a] border-b sm:border-b-0 sm:border-r border-white/10 overflow-hidden shrink-0">
                            {guestlist.image ? (
                                <div className="absolute inset-0">
                                    <img 
                                        src={guestlist.image} 
                                        alt={guestlist.title} 
                                        crossOrigin="anonymous"
                                        className="w-full h-full object-cover opacity-40 blur-[1px]" 
                                        style={{ 
                                            transform: `scale(${guestlist.imageTransform?.scale || 1.25}) translate(${guestlist.imageTransform?.x || 0}%, ${guestlist.imageTransform?.y || 0}%)` 
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black via-black/40 to-transparent" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />
                            )}
                            
                            <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end gap-4 sm:gap-8">
                                <div className="space-y-4">
                                    <div 
                                        className="inline-flex items-center gap-3 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-[0.3em]"
                                        style={{ 
                                            backgroundColor: `${guestlist.highlightColor || '#2ebfff'}10`,
                                            borderColor: `${guestlist.highlightColor || '#2ebfff'}20`,
                                            color: guestlist.highlightColor || '#2ebfff'
                                        }}
                                    >
                                        <Ticket size={14} /> GUESTLIST_ACCESS
                                    </div>
                                    <h2 className="text-4xl sm:text-5xl font-black font-heading text-white italic tracking-tighter uppercase leading-[0.85] pr-4">
                                        JOIN <br /><span style={{ color: guestlist.highlightColor || '#2ebfff' }}>GUESTLIST.</span>
                                    </h2>
                                </div>
                                <div className="space-y-3 pt-4 border-t border-white/10 sm:border-none sm:pt-0">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">Event Details</p>
                                    <p className="text-lg sm:text-xl font-black text-white italic uppercase tracking-tighter leading-none">{guestlist.title}</p>
                                </div>
                            </div>
                            
                            {/* Close Button (Mobile Top Floating) */}
                            <button 
                                onClick={onClose} 
                                className="sm:hidden absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/50 z-[60]"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Interactive Data Terminal */}
                        <div className="flex-1 flex flex-col min-h-0 relative">
                            {/* Close Button (Desktop Only) */}
                            <button 
                                onClick={onClose} 
                                className="hidden sm:flex absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 items-center justify-center text-gray-400 hover:text-white hover:rotate-90 transition-all duration-500 z-[60]"
                            >
                                <X size={22} />
                            </button>

                            {/* Main Content Area - Strictly NO SCROLL on Desktop, Minimal on Mobile */}
                            <div className="flex-1 p-8 sm:p-14 flex flex-col justify-center gap-10 sm:gap-14 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {step === 'selection' && (
                                        <motion.div key="selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 sm:space-y-12">
                                            <div>
                                                <h3 className="text-3xl sm:text-4xl font-black font-heading text-white italic tracking-tighter uppercase leading-[0.9] mb-3">
                                                    SELECT <br /><span className="text-neon-blue">SPOTS.</span>
                                                </h3>
                                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em]">Max limit per user: {maxPerUser}</p>
                                            </div>

                                            {/* Unified Selection Tool */}
                                            <div className="space-y-8">
                                                <div className="p-1.5 bg-black/40 rounded-[3rem] border border-white/5 flex items-center justify-between gap-4">
                                                    <button 
                                                        disabled={!canDecrement} 
                                                        onClick={() => setGuestsCount(g => g - 1)} 
                                                        className={cn(
                                                            "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all text-xl",
                                                            canDecrement ? "bg-white/5 text-white hover:bg-white/10" : "bg-transparent text-zinc-900 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <Minus size={24} />
                                                    </button>
                                                    <div className="flex-1 text-center">
                                                        <div className="text-6xl sm:text-8xl font-black italic tracking-tighter text-white tabular-nums">{guestsCount}</div>
                                                        <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest leading-none block -mt-2">GUESTS</span>
                                                    </div>
                                                    <button 
                                                        disabled={!canIncrement} 
                                                        onClick={() => setGuestsCount(g => g + 1)} 
                                                        className={cn(
                                                            "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all text-xl",
                                                            canIncrement ? "text-black hover:scale-105" : "bg-transparent text-zinc-900 cursor-not-allowed"
                                                        )}
                                                        style={{ 
                                                            backgroundColor: canIncrement ? (guestlist.highlightColor || '#2ebfff') : 'transparent',
                                                            boxShadow: canIncrement ? `0 0 25px ${(guestlist.highlightColor || '#2ebfff')}80` : 'none'
                                                        }}
                                                    >
                                                        <Plus size={24} />
                                                    </button>
                                                </div>

                                                <div className="px-8 py-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">REGISTRY CAPACITY</span>
                                                    <span 
                                                        className="text-[9px] font-black uppercase tracking-widest"
                                                        style={{ color: capacityPercentage > 85 ? '#f97316' : (guestlist.highlightColor || '#39FF14') }}
                                                    >
                                                        {isFull ? "CLOSED" : `${Math.round(capacityPercentage)}% FILL`}
                                                    </span>
                                                </div>
                                            </div>

                                            <Button 
                                                disabled={isFull} 
                                                onClick={() => setStep('details')} 
                                                className="w-full h-20 sm:h-24 rounded-[2.5rem] bg-white text-black font-black uppercase italic tracking-[0.3em] text-[10px] sm:text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                                            >
                                                {isFull ? 'FULL' : 'ENTER DETAILS'} <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                            </Button>
                                        </motion.div>
                                    )}

                                    {step === 'details' && (
                                        <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 sm:space-y-10">
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => setStep('selection')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                                                    <ChevronLeft size={20} />
                                                </button>
                                                <h3 className="text-3xl sm:text-4xl font-black font-heading text-white italic tracking-tighter uppercase leading-[0.9]">
                                                    YOUR <br /><span className="text-neon-blue">DETAILS.</span>
                                                </h3>
                                            </div>

                                            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                                                <div className="grid grid-cols-1 gap-5">
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-3">Full Legal Identity</label>
                                                        <input required name="name" value={formData.name} onChange={handleInputChange} placeholder="ALEX_WAYNE" className="w-full h-16 sm:h-20 bg-white/5 border border-white/5 rounded-[2rem] px-8 text-xs font-black uppercase tracking-widest focus:border-neon-blue/40 focus:bg-white/10 outline-none transition-all placeholder:text-gray-800 italic" />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                        <div className="space-y-2">
                                                            <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-3">Digital Mail</label>
                                                            <input required type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="ADDR@DOMAIN.COM" className="w-full h-14 sm:h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest focus:border-neon-blue/40 outline-none transition-all placeholder:text-gray-800" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-3">Contact Signal</label>
                                                            <input required name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+91 XXX XXX XXXX" className="w-full h-14 sm:h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest focus:border-neon-blue/40 outline-none transition-all placeholder:text-gray-800" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button type="submit" className="w-full h-20 sm:h-24 rounded-[2.5rem] bg-neon-blue text-black font-black uppercase italic tracking-[0.3em] text-[10px] sm:text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,255,255,0.2)] flex items-center justify-center gap-4 group">
                                                    REGISTER NOW <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                                </Button>
                                            </form>
                                        </motion.div>
                                    )}

                                    {step === 'loading' && (
                                        <motion.div key="loading" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center gap-8 py-10">
                                            <LoadingSpinner size="lg" color="#2ebfff" />
                                            <div className="space-y-2">
                                                <h3 className="text-3xl font-black font-heading text-white italic tracking-tighter uppercase">PROCESSING...</h3>
                                                <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.4em]">Securing your entry</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 'success' && (
                                        <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center gap-10">
                                            <div className="w-16 h-16 bg-neon-green rounded-2xl flex items-center justify-center text-black mb-1 shadow-[0_0_15px_rgba(0,230,168,0.2)]">
                                                <CheckCircle2 size={32} />
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black font-heading text-white italic tracking-tighter uppercase leading-none">
                                                    REGISTRATION <span className="text-neon-green">CONFIRMED.</span>
                                                </h3>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest px-4">Your entry is secured. Save your ticket below.</p>
                                            </div>

                                            <div className="relative">
                                                <div className="bg-white p-4 rounded-2xl shadow-xl scale-90">
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(bookingRef)}`} 
                                                        alt="Access QR" 
                                                        crossOrigin="anonymous"
                                                        className="w-24 h-24 mix-blend-multiply" 
                                                    />
                                                </div>
                                            </div>

                                            <div className="w-full flex flex-col gap-2">
                                                <Button 
                                                    onClick={handleDownloadTicket} 
                                                    className="w-full h-12 bg-neon-green text-black font-black uppercase tracking-[0.2em] text-[9px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Download size={14} /> DOWNLOAD TICKET
                                                </Button>
                                                
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button 
                                                        onClick={() => { window.location.href = '/account'; }} 
                                                        variant="outline"
                                                        className="h-12 border-white/10 text-white font-black uppercase tracking-[0.2em] text-[8px] rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <ExternalLink size={14} /> ACCOUNT
                                                    </Button>

                                                    <a 
                                                        href={`/ticket/${bookingRef}?gl=${guestlist.id}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-widest text-white transition-all"
                                                    >
                                                        <QrCode size={14} /> DIGITAL PASS
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Hidden Ticket Surface for Download */}
                                            <div className="fixed -left-[2000px] top-0">
                                                <div id="ticket-download-surface" className="w-[800px] bg-black p-16 flex flex-col gap-12 font-sans border-2 border-neon-green/20">
                                                    {/* Logo Header */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-4xl font-black italic tracking-tighter text-white uppercase">NEWBI <span className="text-neon-blue">ENT.</span></div>
                                                        <div className="text-xs font-black text-gray-500 uppercase tracking-[0.5em]">GUESTLIST_PASS</div>
                                                    </div>

                                                    {/* Event Header */}
                                                    <div className="space-y-4">
                                                        <h1 className="text-7xl font-black text-white italic uppercase tracking-tighter leading-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                                                            {guestlist.title}
                                                        </h1>
                                                        <div className="flex gap-8">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">DATE</p>
                                                                <p className="text-xl font-bold text-white uppercase italic">{guestlist.date || 'To Be Announced'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">LOCATION</p>
                                                                <p className="text-xl font-bold text-white uppercase italic">{guestlist.location || 'Special Venue'}</p>
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
                                                                    <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest">GUESTS</p>
                                                                    <p className="text-2xl font-bold text-neon-green italic">{guestsCount}</p>
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
                                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] italic">NEWBI ENT.</p>
                                                        <p className="text-[9px] font-black text-neon-blue/50 uppercase tracking-[0.3em]">#TRIBE_ACCESS_ONLY</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UnifiedGuestlistModal;
