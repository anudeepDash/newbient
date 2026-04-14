import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Download, Ticket, ArrowLeft, Loader, QrCode, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';

const TicketViewer = () => {
    const { bookingRef } = useParams();
    const { upcomingEvents } = useStore();
    const [order, setOrder] = useState(null);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const ticketRef = React.useRef(null);

    const downloadTicket = async () => {
        if (!ticketRef.current) return;
        const canvas = await html2canvas(ticketRef.current, {
            backgroundColor: '#000000',
            scale: 2,
            useCORS: true
        });
        const link = document.createElement('a');
        link.download = `Ticket-${order.bookingRef}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    useEffect(() => {
        const fetchTicket = async () => {
            if (!bookingRef) {
                setError("Invalid Ticket Reference");
                setLoading(false);
                return;
            }

            try {
                const q = query(collection(db, 'ticket_orders'), where('bookingRef', '==', bookingRef));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setError("Ticket not found. It may have been revoked or the reference is incorrect.");
                } else {
                    const ticketData = snapshot.docs[0].data();
                    setOrder(ticketData);
                    
                    // Match with event to get location/time etc
                    if (ticketData.eventId) {
                        const matchedEvent = upcomingEvents.find(e => e.id === ticketData.eventId);
                        setEvent(matchedEvent);
                    }
                }
            } catch (err) {
                console.error("Error fetching ticket:", err);
                setError("Failed to load ticket data.");
            } finally {
                setLoading(false);
            }
        };

        fetchTicket();
    }, [bookingRef, upcomingEvents]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-4">
                <Loader className="w-12 h-12 text-neon-green animate-spin mb-4" />
                <p className="text-white font-black uppercase tracking-widest text-sm">Validating Access Code...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-red-500/10 p-6 rounded-full border border-red-500/20 mb-6">
                    <Lock className="w-16 h-16 text-red-500" />
                </div>
                <h1 className="text-2xl font-black text-white italic uppercase mb-2">Access Denied</h1>
                <p className="text-gray-400 mb-8 max-w-sm">{error || "This access code is invalid or has expired."}</p>
                <Link to="/" className="text-neon-blue font-bold tracking-widest uppercase text-xs hover:underline flex items-center">
                    <ArrowLeft size={14} className="mr-2" /> Return to Homepage
                </Link>
            </div>
        );
    }

    // Handle string (fallback) or array of URLs
    const ticketUrls = order.ticketUrls && order.ticketUrls.length > 0 
        ? order.ticketUrls 
        : (order.ticketUrl ? [order.ticketUrl] : []);

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-20 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto px-4 flex flex-col items-center">
                <div className="flex justify-center mb-8">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-neon-green">
                        Verified Official Entry Pass
                    </span>
                </div>
                <Link to="/" className="inline-flex flex-col items-center justify-center text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest mb-8 mx-auto w-full group">
                    <div className="bg-white/5 p-4 rounded-full border border-white/10 mb-2 group-hover:scale-110 transition-transform">
                        <QrCode size={24} className="text-neon-blue" />
                    </div>
                </Link>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-zinc-900/50 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                >
                    {/* Header Strip */}
                    <div className="bg-gradient-to-r from-neon-green/20 via-black to-neon-blue/20 h-2 w-full" />
                    
                    <div className="p-8 md:p-12">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-2">
                                {event?.title || order.eventTitle}
                            </h1>
                            <p className="text-gray-400 font-bold text-sm tracking-widest uppercase mb-1">
                                Code: {order.bookingRef}
                            </p>
                        </div>

                        {/* Digital QR Graphic (Merged from Guestlist) */}
                        <div ref={ticketRef} className="relative bg-zinc-950 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl mb-10 group">
                            {event?.image && (
                                <div className="absolute inset-0 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000">
                                    <img src={event.image} alt="" crossOrigin="anonymous" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-zinc-950/40" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

                            <div className="relative z-10 p-10 flex flex-col items-center">
                                {/* Brand Header */}
                                <div className="w-full flex items-center justify-between mb-10 pb-6 border-b border-white/10">
                                    <span className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em]">NEWBI_ENT</span>
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                        "bg-neon-green/10 border-neon-green/20 text-neon-green"
                                    )}>VERIFIED TICKET</span>
                                </div>

                                <div className="text-center mb-10">
                                    <h1 className="text-4xl font-black font-heading tracking-tighter italic uppercase mb-2 leading-none">{event?.title || order.eventTitle}</h1>
                                    <p className="text-gray-400 font-black text-[9px] uppercase tracking-[0.3em]">{order.bookingRef}</p>
                                </div>

                                {/* QR Code Container */}
                                <div className="p-4 bg-white rounded-3xl mb-10 shadow-[0_0_50px_rgba(255,255,255,0.1)] inline-block">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${order.bookingRef}`} 
                                        alt="Access QR" 
                                        crossOrigin="anonymous"
                                        className="w-48 h-48 mix-blend-multiply"
                                    />
                                </div>

                                <div className="w-full grid grid-cols-2 gap-8 mb-10">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Issued To</p>
                                        <p className="text-sm font-bold text-white uppercase">{order.customerName}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Deployment</p>
                                        <p className="text-sm font-bold text-white uppercase">{event?.date || 'TBA'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Terminal</p>
                                        <p className="text-sm font-bold text-white uppercase truncate">{event?.location || 'TBA'}</p>
                                    </div>
                                    <div className="space-y-1 text-right flex flex-col">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Authorized Items</p>
                                        {order.items?.map((item, i) => (
                                            <p key={i} className="text-xs font-black text-neon-blue uppercase">{item.count}X {item.name}</p>
                                        ))}
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
                        
                        <div className="flex flex-col gap-4 mb-8">
                            <Button 
                                onClick={downloadTicket}
                                className="h-16 w-full bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-2xl"
                            >
                                <Download size={18} /> Download Digital Pass
                            </Button>
                        </div>

                        <div className="bg-black/50 rounded-3xl p-6 border border-white/5 mb-8">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center">
                                <Ticket size={14} className="mr-2" /> Purchase Summary
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                    <span className="text-sm font-bold text-gray-400 uppercase">ISSUED TO</span>
                                    <span className="text-sm font-black text-white uppercase">{order.customerName}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                    <span className="text-sm font-bold text-gray-400 uppercase">VALID ITEMS</span>
                                    <div className="text-right flex flex-col">
                                        {order.items?.map((item, i) => (
                                            <span key={i} className="text-sm font-black text-white uppercase">{item.count}X {item.name}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-400 uppercase">ASSOCIATED CONTACT</span>
                                    <span className="text-xs font-mono text-gray-300">{order.customerEmail}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {ticketUrls.length > 0 ? (
                                <>
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-2 text-center">Secure Digital Files</h3>
                                    {ticketUrls.map((url, index) => (
                                        <a 
                                            key={index} 
                                            href={url} 
                                            download={`Ticket-${order.bookingRef}-${index + 1}.pdf`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="group flex items-center justify-between bg-white text-black p-4 rounded-2xl hover:scale-[1.02] transition-all duration-300 w-full"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center mr-4">
                                                    <Ticket size={18} />
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className="font-black uppercase text-sm">DOWNLOAD YOUR TICKET {index + 1}</span>
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">View / Save PDF</span>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center group-hover:bg-neon-blue group-hover:text-black transition-colors">
                                                <Download size={16} />
                                            </div>
                                        </a>
                                    ))}
                                    <p className="text-center text-[10px] text-gray-500 mt-6 uppercase font-bold tracking-widest max-w-[80%] mx-auto">
                                        Please download and save these files. You will need to present the QR codes at the venue.
                                    </p>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-red-500 font-bold uppercase tracking-widest text-xs">Error: No files attached to this booking.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-12 pt-8 border-t border-white/5">
                            <Link 
                                to="/" 
                                className="inline-flex items-center gap-2 text-neon-blue font-black uppercase text-[10px] tracking-[0.2em] hover:scale-105 transition-all group mx-auto w-full justify-center"
                            >
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
                                Explore More Events on Newbi
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TicketViewer;
