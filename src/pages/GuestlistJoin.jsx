import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Sparkles, 
    CheckCircle2, 
    Loader2, 
    ArrowLeft, 
    Download, 
    QrCode, 
    ShieldCheck, 
    Calendar, 
    MapPin,
    Zap,
    Image as ImageIcon,
    Smartphone,
    Info,
    ArrowRight
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';

const GuestlistJoin = () => {
    const { id } = useParams();
    const { guestlists, addGuestlistEntry, user, authInitialized, setAuthModal } = useStore();
    const [guestlist, setGuestlist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [entryData, setEntryData] = useState(null);
    const [entryCount, setEntryCount] = useState(0);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        spots: 1
    });
    const ticketRef = useRef(null);

    useEffect(() => {
        const loadGuestlist = async () => {
            // Priority 1: Check dedicated guestlists collection in global state
            if (guestlists.length > 0) {
                const found = guestlists.find(g => g.id === id);
                if (found) {
                    setGuestlist(found);
                    initForm(found);
                    setLoading(false);
                    fetchEntryCount(id, 'guestlists');
                    return;
                }
            }

            // Priority 2: Direct Fetch from guestlists collection
            try {
                const { db } = await import('../lib/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const docSnap = await getDoc(doc(db, 'guestlists', id));
                
                if (docSnap.exists()) {
                    const data = { ...docSnap.data(), id: docSnap.id };
                    setGuestlist(data);
                    initForm(data);
                    fetchEntryCount(id, 'guestlists');
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.error("Guestlist direct fetch failed:", err);
            }

            // Priority 3: Fallback - Look in upcoming_events for "Smart Registry"
            try {
                const { db } = await import('../lib/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const eventSnap = await getDoc(doc(db, 'upcoming_events', id));

                if (eventSnap.exists()) {
                    const eventData = eventSnap.data();
                    if (eventData.isGuestlistEnabled) {
                        const virtualGuestlist = {
                            id,
                            title: eventData.title,
                            date: eventData.date,
                            description: eventData.description,
                            image: eventData.image,
                            maxSpots: eventData.maxSpots || 100,
                            perUserLimit: eventData.perUserLimit || 1,
                            customFields: eventData.customFields || [],
                            isVirtual: true // Flag to handle submission correctly
                        };
                        setGuestlist(virtualGuestlist);
                        initForm(virtualGuestlist);
                        fetchEntryCount(id, 'upcoming_events');
                    }
                }
            } catch (err) {
                console.error("Smart Registry fallback failed:", err);
            } finally {
                setLoading(false);
            }
        };

        const initForm = (found) => {
            const initialCustom = {};
            (found.customFields || []).forEach(field => {
                initialCustom[field.label] = '';
            });
            setFormData(prev => ({ ...prev, ...initialCustom }));
        };

        const fetchEntryCount = async (guestlistId, collectionName) => {
            try {
                const { db } = await import('../lib/firebase');
                const { collection, getDocs } = await import('firebase/firestore');
                const q = collection(db, collectionName, guestlistId, 'entries');
                const snap = await getDocs(q);
                setEntryCount(snap.size);
            } catch (err) {
                console.error("Count fetch failed:", err);
            }
        };

        loadGuestlist();
    }, [id, guestlists]);

    useEffect(() => {
        if (authInitialized && !user) {
            setAuthModal(true);
        } else if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.displayName || '',
                email: user.email || '',
                phone: user.phoneNumber || ''
            }));
        }
    }, [authInitialized, user, setAuthModal]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return setAuthModal(true);

        const currentMax = guestlist.maxLimit;
        if (currentMax && entryCount >= currentMax) {
            return alert("CAPACITY_REACHED: This sector is fully occupied.");
        }

        setSubmitting(true);

        try {
            const entry = {
                guestlistId: id,
                guestlistTitle: guestlist.title,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                userId: user.uid,
                status: 'approved',
                attended: false,
                bookingRef: `GL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                customDetails: { ...formData },
                createdAt: new Date().toISOString()
            };
            
            // Remove standard fields from customDetails to avoid redundancy
            delete entry.customDetails.name;
            delete entry.customDetails.email;
            delete entry.customDetails.phone;

            await addGuestlistEntry(id, entry);
            setEntryData(entry);
            setIsSuccess(true);
        } catch (error) {
            console.error("Join failed:", error);
            alert("Failed to join guestlist. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const downloadTicket = async () => {
        if (!ticketRef.current) return;
        const canvas = await html2canvas(ticketRef.current, {
            backgroundColor: '#000000',
            scale: 2,
            useCORS: true
        });
        const link = document.createElement('a');
        link.download = `Ticket-${entryData.bookingRef}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-neon-blue animate-spin" />
            </div>
        );
    }

    if (!guestlist) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
                <h1 className="text-2xl font-black text-white uppercase italic mb-4">Uplink Severed.</h1>
                <p className="text-gray-500 mb-8 max-w-xs uppercase font-bold tracking-tight">This guestlist gateway is no longer active or could not be located.</p>
                <Link to="/community" className="text-neon-blue font-black tracking-widest uppercase text-xs hover:underline flex items-center gap-2">
                    <ArrowLeft size={14} /> Back to Hub
                </Link>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-[#020202] text-white pt-24 pb-20 relative overflow-hidden">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-neon-blue/10 to-transparent blur-3xl opacity-20" />
                </div>

                <div className="max-w-xl mx-auto px-4 relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="w-20 h-20 bg-neon-green/10 text-neon-green rounded-full flex items-center justify-center mx-auto mb-6 border border-neon-green/20 shadow-[0_0_40px_rgba(57,255,20,0.2)]">
                            <CheckCircle2 size={40} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tighter italic uppercase mb-2">Access Granted.</h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Identity verified. Your entry pass is ready below.</p>
                    </motion.div>

                    {/* High-Fidelity Digital Ticket */}
                    <div ref={ticketRef} className="relative bg-zinc-900 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl mb-10 group">
                        {/* Artwork Backdrop */}
                        {guestlist.image && (
                            <div className="absolute inset-0 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000">
                                <img src={guestlist.image} alt="" crossOrigin="anonymous" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-zinc-950/40" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

                        <div className="relative z-10 p-10 flex flex-col items-center">
                            {/* Brand Header */}
                            <div className="w-full flex items-center justify-between mb-10 pb-6 border-b border-white/10">
                                <span className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em]">NEWBI_ENT</span>
                                <span 
                                    className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border"
                                    style={{ 
                                        backgroundColor: `${guestlist.highlightColor || '#2ebfff'}10`,
                                        borderColor: `${guestlist.highlightColor || '#2ebfff'}20`,
                                        color: guestlist.highlightColor || '#2ebfff'
                                    }}
                                >OFFICIAL ENTRY</span>
                            </div>

                            <div className="text-center mb-10">
                                <h1 className="text-4xl font-black font-heading tracking-tighter italic uppercase mb-2 leading-none">{guestlist.title}</h1>
                                <p className="text-gray-400 font-black text-[9px] uppercase tracking-[0.3em]">{entryData.bookingRef}</p>
                            </div>

                            {/* QR Code Container */}
                            <div className="p-4 bg-white rounded-3xl mb-10 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${entryData.bookingRef}`} 
                                    alt="Access QR" 
                                    crossOrigin="anonymous"
                                    className="w-48 h-48 mix-blend-multiply"
                                />
                            </div>

                            <div className="w-full grid grid-cols-2 gap-8 mb-10">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Entry Detail</p>
                                    <p className="text-sm font-bold text-white uppercase">{entryData.name} {entryData.spots > 1 ? `(+${entryData.spots - 1})` : ''}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Deployment</p>
                                    <p className="text-sm font-bold text-white uppercase">{guestlist.date}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Terminal</p>
                                    <p className="text-sm font-bold text-white uppercase truncate">{guestlist.location}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Access Protocol</p>
                                    <p className="text-sm font-black uppercase" style={{ color: guestlist.highlightColor || '#2ebfff' }}>VIP GUESTLIST</p>
                                </div>
                            </div>
                            
                            <div className="w-full p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2 text-center">
                                <p className="text-[9px] font-bold text-gray-500 uppercase leading-relaxed max-w-[240px] mx-auto italic">
                                    TAKE A SCREENSHOT FOR EASY ACCESS AT THE ENTRY. THIS PASS IS NON-TRANSFERABLE.
                                </p>
                            </div>
                        </div>

                        {/* Aesthetic Footer Strip */}
                        <div className="h-2 w-full bg-gradient-to-r from-neon-blue via-neon-pink to-neon-green opacity-50" />
                    </div>

                    <div className="flex flex-col gap-4">
                        <Button 
                            onClick={downloadTicket}
                            className="h-16 w-full bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-2xl"
                        >
                            <Download size={18} /> Download Ticket
                        </Button>
                        <Link to="/community" className="text-center py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
                            Complete Mission and Return
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-32 relative overflow-x-hidden">
            {/* Cinematic Parallax Header */}
            <div className="relative h-[45vh] md:h-[55vh] w-full overflow-hidden">
                {guestlist.image ? (
                    <motion.div 
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.6 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute inset-0"
                    >
                        <img 
                            src={guestlist.image} 
                            alt="" 
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                            style={{ 
                                transform: `scale(${guestlist.imageTransform?.scale || 1.1}) translate(${guestlist.imageTransform?.x || 0}%, ${guestlist.imageTransform?.y || 0}%)`,
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/40 to-transparent" />
                    </motion.div>
                ) : (
                    <div className="absolute inset-0 bg-zinc-900/40" />
                )}
                
                {/* Floating Navigation */}
                <div className="absolute top-8 left-8 z-50">
                    <Link to="/community" className="flex items-center gap-3 px-6 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-white/60 hover:text-white hover:bg-black/60 transition-all group">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
                        <span className="hidden md:inline">Return to Hub</span>
                    </Link>
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-6 text-center">
                    <motion.div 
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-6 max-w-4xl"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md" style={{ backgroundColor: `${guestlist.highlightColor || '#2ebfff'}10`, border: `1px solid ${guestlist.highlightColor || '#2ebfff'}20` }}>
                            <QrCode size={12} style={{ color: guestlist.highlightColor || '#2ebfff' }} />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: guestlist.highlightColor || '#2ebfff' }}>REGISTRY_ACTIVE</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black font-heading tracking-tighter italic leading-none uppercase drop-shadow-2xl">{guestlist.title}</h1>
                        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
                            <div className="flex items-center gap-3 text-white/50 uppercase text-[10px] font-black tracking-widest bg-white/5 px-5 py-2 rounded-full border border-white/5">
                                <Calendar size={14} className="text-neon-blue" /> {guestlist.date}
                            </div>
                            <div className="flex items-center gap-3 text-white/50 uppercase text-[10px] font-black tracking-widest bg-white/5 px-5 py-2 rounded-full border border-white/5">
                                <MapPin size={14} className="text-neon-pink" /> {guestlist.location}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-6 relative z-10 -mt-10">
                {guestlist.status === 'Closed' ? (
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-zinc-900/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 text-center space-y-8 shadow-2xl"
                    >
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                            <Smartphone size={40} className="rotate-12" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black italic uppercase italic tracking-tighter mb-4">Registry Offline.</h2>
                            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest leading-relaxed">This guestlist gateway has been deactivated by the administrator or has reached its temporal limit.</p>
                        </div>
                        <Button 
                            asChild
                            className="bg-white/5 border border-white/10 hover:bg-white hover:text-black w-full h-16 rounded-2xl"
                        >
                            <Link to="/community" className="font-black uppercase tracking-widest text-[10px]">Return to Community Hub</Link>
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="bg-zinc-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
                    >
                        <div className="p-10 md:p-14 space-y-10">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em]">Identity Protocol</p>
                                <h2 className="text-4xl font-black italic uppercase italic tracking-tighter">Secure Entry.</h2>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                                    {guestlist.description || "Register your details to obtain a digital entry pass for this occurrence."}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-2">Full Identity Name</label>
                                        <Input 
                                            required 
                                            value={formData.name} 
                                            onChange={e => handleInputChange('name', e.target.value)} 
                                            className="h-16 bg-black/40 border-white/5 rounded-2xl font-black uppercase tracking-widest text-sm px-8 focus:border-neon-blue transition-all" 
                                            placeholder="John Doe" 
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-2">Terminal Email</label>
                                            <Input 
                                                required 
                                                type="email" 
                                                value={formData.email} 
                                                onChange={e => handleInputChange('email', e.target.value)} 
                                                className="h-16 bg-black/40 border-white/5 rounded-2xl font-black uppercase tracking-widest text-sm px-8 focus:border-neon-blue transition-all" 
                                                placeholder="alias@domain.com" 
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-2">Communication</label>
                                            <Input 
                                                required 
                                                type="tel" 
                                                value={formData.phone} 
                                                onChange={e => handleInputChange('phone', e.target.value)} 
                                                className="h-16 bg-black/40 border-white/5 rounded-2xl font-black uppercase tracking-widest text-sm px-8 focus:border-neon-blue transition-all" 
                                                placeholder="+91_MOBILE" 
                                            />
                                        </div>
                                    </div>

                                    {guestlist.perUserLimit > 1 && (
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-2">Plus-One Access</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.spots}
                                                    onChange={e => handleInputChange('spots', parseInt(e.target.value))}
                                                    className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl px-8 text-white font-black uppercase tracking-widest text-sm focus:outline-none focus:border-neon-blue transition-all appearance-none cursor-pointer"
                                                >
                                                    {[...Array(guestlist.perUserLimit)].map((_, i) => (
                                                        <option key={i + 1} value={i + 1} className="bg-zinc-900">
                                                            {i === 0 ? 'Individual Entry' : `Group of ${i + 1}`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                    <Users size={20} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Dynamic Custom Fields */}
                                    {guestlist.customFields?.length > 0 && (
                                        <div className="pt-6 space-y-8 border-t border-white/5 mt-4">
                                            {guestlist.customFields.map((field, idx) => (
                                                <div key={idx} className="space-y-3">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-2">{field.label}</label>
                                                    {field.type === 'textarea' ? (
                                                        <textarea
                                                            required={field.required}
                                                            value={formData[field.label] || ''}
                                                            onChange={e => handleInputChange(field.label, e.target.value)}
                                                            className="w-full h-32 bg-black/40 border border-white/5 rounded-2xl p-6 font-bold text-white focus:outline-none focus:border-neon-blue transition-all uppercase text-sm tracking-widest resize-none"
                                                            placeholder={`ENTER_${field.label.toUpperCase()}`}
                                                        />
                                                    ) : (
                                                        <Input 
                                                            required={field.required}
                                                            type={field.type}
                                                            value={formData[field.label] || ''}
                                                            onChange={e => handleInputChange(field.label, e.target.value)}
                                                            className="h-16 bg-black/40 border-white/5 rounded-2xl font-black uppercase tracking-widest text-sm px-8 focus:border-neon-blue transition-all"
                                                            placeholder={`ENTER_${field.label.toUpperCase()}`}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4">
                                     <Button 
                                        type="submit" 
                                        disabled={submitting} 
                                        className="h-24 w-full text-black font-black uppercase tracking-[0.4em] italic text-sm rounded-[2rem] hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group"
                                        style={{ 
                                            backgroundColor: guestlist.highlightColor || '#2ebfff',
                                            boxShadow: `0 30px 60px ${(guestlist.highlightColor || '#2ebfff')}33` 
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10" />
                                        <span className="relative z-10 flex items-center justify-center gap-4">
                                            {submitting ? <Loader2 className="animate-spin" size={24} /> : (
                                                <>
                                                    <CheckCircle2 size={24} />
                                                    INITIATE ENTRY
                                                </>
                                            )}
                                        </span>
                                    </Button>
                                    
                                    <div className="mt-10 flex items-center justify-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em]">Uplink_Secured_System_V5</p>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="h-2 w-full flex opacity-60">
                            <div className="h-full bg-neon-blue flex-1" />
                            <div className="h-full bg-neon-pink flex-1" />
                            <div className="h-full bg-neon-green flex-1" />
                        </div>
                    </motion.div>
                )}
            </div>
            
            {/* Cinematic Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] bg-neon-blue/5 rounded-full blur-[180px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[150px]" />
            </div>
        </div>
    );
};

export default GuestlistJoin;
