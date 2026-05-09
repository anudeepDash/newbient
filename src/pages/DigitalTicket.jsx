import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import User from 'lucide-react/dist/esm/icons/user';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Download from 'lucide-react/dist/esm/icons/download';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, collectionGroup, doc, getDoc } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const DigitalTicket = () => {
    const { id } = useParams();
    const [ticketData, setTicketData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTicket = async () => {
            if (!id) return;
            try {
                // First search in ticket_orders
                let q = query(collection(db, 'ticket_orders'), where('bookingRef', '==', id));
                let snapshot = await getDocs(q);
                
                let fetchedData = null;
                const urlParams = new URLSearchParams(window.location.search);
                const eventIdParam = urlParams.get('event') || urlParams.get('gl');

                if (!snapshot.empty) {
                    fetchedData = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id, type: 'ticket' };
                } else if (eventIdParam) {
                    // Optimized direct lookup if event context is provided
                    const directRef = query(collection(db, 'guestlists', eventIdParam, 'entries'), where('bookingRef', '==', id));
                    const directSnap = await getDocs(directRef);
                    if (!directSnap.empty) {
                        fetchedData = { ...directSnap.docs[0].data(), id: directSnap.docs[0].id, type: 'guestlist' };
                    }
                }

                if (!fetchedData) {
                    // Fallback to collection group search
                    const entriesQuery = query(collectionGroup(db, 'entries'), where('bookingRef', '==', id));
                    const entriesSnapshot = await getDocs(entriesQuery);
                    
                    if (!entriesSnapshot.empty) {
                        fetchedData = { ...entriesSnapshot.docs[0].data(), id: entriesSnapshot.docs[0].id, type: 'guestlist' };
                    } else {
                        setError("Ticket could not be found. Please check your reference code or contact support.");
                        setLoading(false);
                        return;
                    }
                }

                // Fetch event details
                if (fetchedData.eventId) {
                    const eventDoc = await getDoc(doc(db, 'upcoming_events', fetchedData.eventId));
                    if (eventDoc.exists()) {
                        const eventData = eventDoc.data();
                        fetchedData.eventDate = eventData.date;
                        fetchedData.eventLocation = eventData.location;
                        fetchedData.eventTime = eventData.time;
                    }
                }

                setTicketData(fetchedData);
            } catch (err) {
                console.error("Error fetching ticket:", err);
                setError("Could not verify ticket details.");
            }
            setLoading(false);
        };

        fetchTicket();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020202] flex items-center justify-center">
                <LoadingSpinner size="lg" color="#2bd93e" />
            </div>
        );
    }

    if (error || !ticketData) {
        return (
            <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle size={64} className="text-red-500 mb-6 opacity-80" />
                <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Invalid Pass</h1>
                <p className="text-gray-400 font-bold tracking-widest text-xs uppercase">{error}</p>
                <Link to="/" className="mt-8 px-8 py-4 bg-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Return Home</Link>
            </div>
        );
    }

    const { type, status, customerName, eventTitle, eventDate, eventLocation, eventTime, items, guestsCount } = ticketData;
    
    // For paid tickets, check if verified
    const isVerified = type === 'guestlist' ? true : status === 'approved' || status === 'dispatched';
    
    // Compute QR Data
    const qrData = encodeURIComponent(JSON.stringify({ ref: id, type }));

    const handleDownloadPass = async () => {
        const ticketElement = document.getElementById('digital-pass-card');
        if (!ticketElement) return;

        try {
            const canvas = await html2canvas(ticketElement, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#020202',
                logging: false
            });
            
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `Pass-${id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error generating pass image:", error);
            useStore.getState().addToast("Could not save the pass. Please try again.", 'error');
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white py-20 px-4 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Atmos */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-neon-green/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/10 rounded-full blur-[150px]" />
            </div>

            <motion.div 
                id="digital-pass-card"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md bg-zinc-900/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,255,100,0.1)]"
            >
                {/* Header Strip */}
                <div className={`p-8 border-b border-white/10 text-center ${isVerified ? 'bg-black/40' : 'bg-yellow-500/10'}`}>
                    {isVerified ? (
                        <>
                            <div className="w-16 h-16 bg-neon-green/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-neon-green/20">
                                <CheckCircle2 size={32} className="text-neon-green" />
                            </div>
                            <h2 className="text-xl font-black italic uppercase tracking-widest text-white">Valid Pass</h2>
                            <p className="text-[10px] text-neon-green font-bold tracking-[0.2em] uppercase mt-1">Ready for Scan</p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                                <ShieldCheck size={32} className="text-yellow-500" />
                            </div>
                            <h2 className="text-xl font-black italic uppercase tracking-widest text-white">Pending Verification</h2>
                            <p className="text-[10px] text-yellow-500 font-bold tracking-[0.2em] uppercase mt-1">Payment under review</p>
                        </>
                    )}
                </div>

                <div className="p-8 space-y-8">
                    {/* Event Info */}
                    <div className="text-center">
                        <h1 className="text-3xl font-black font-heading italic uppercase tracking-tighter leading-none mb-4">{eventTitle || 'Event'}</h1>
                        <div className="flex flex-col gap-2 items-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4">
                            {eventDate && (
                                <span className="flex items-center gap-2">
                                    <Calendar size={14} className="text-neon-pink" /> 
                                    {new Date(eventDate).toLocaleDateString()} {eventTime ? `| ${eventTime}` : ''}
                                </span>
                            )}
                            {eventLocation && (
                                <span className="flex items-center gap-2 text-center">
                                    <MapPin size={14} className="text-neon-blue shrink-0" /> 
                                    {eventLocation}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative h-px bg-white/10 w-full">
                        <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#020202] rounded-full border border-white/10" />
                        <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#020202] rounded-full border border-white/10" />
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl relative overflow-hidden group">
                        {ticketData.ticketMode === 'pdf' ? (
                            <div className="w-48 h-48 flex flex-col items-center justify-center text-gray-400 gap-4 text-center">
                                <Ticket size={48} className="opacity-20" />
                                <span className="text-[10px] font-black uppercase tracking-widest px-4">PDF Ticket Issued</span>
                                <span className="text-[9px] font-bold text-gray-500">Check your email for the attached PDF pass.</span>
                            </div>
                        ) : isVerified ? (
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`} 
                                alt="Ticket QR" 
                                className="w-48 h-48 object-contain mix-blend-multiply transition-transform group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-48 h-48 flex flex-col items-center justify-center text-gray-400 gap-4">
                                <ShieldCheck size={48} className="opacity-20" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">QR generates after payment verification</span>
                            </div>
                        )}
                        <div className="mt-6 px-6 py-3 bg-black/5 rounded-xl border border-black/10 w-full text-center">
                            <span className="text-sm font-black font-mono tracking-[0.3em] text-black/80 uppercase">{id}</span>
                        </div>
                    </div>

                    {/* Guest Details */}
                    <div className="bg-black/50 p-6 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Holder</span>
                            <span className="text-xs font-black uppercase tracking-widest text-white">{customerName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Access Type</span>
                            <span className="text-xs font-black uppercase tracking-widest text-neon-green">{type === 'guestlist' ? 'Guestlist' : 'General'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Capacity</span>
                            <span className="text-xs font-black uppercase tracking-widest text-white">
                                {type === 'guestlist' 
                                    ? `${guestsCount || 1} Guests` 
                                    : items?.map(i => `${i.count}x ${i.name}`).join(', ')
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Floating Action Button for Download (kept outside the canvas capture) */}
            <motion.button 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={handleDownloadPass} 
                className="relative z-20 mt-8 h-14 px-8 bg-white/5 rounded-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all border border-white/10 shadow-2xl"
            >
                <Download size={16} className="text-neon-green" /> DOWNLOAD DIGITAL PASS
            </motion.button>
        </div>
    );
};

export default DigitalTicket;
