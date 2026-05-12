import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, CheckCircle, XCircle, Loader, ShieldAlert, Sparkles, User, Ticket as TicketIcon, Search } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const GateScanner = ({ eventId }) => {
    const { ticketOrders, guestlists, markGuestlistAttendance, updateTicketOrder } = useStore();
    const [scanResult, setScanResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [manualCode, setManualCode] = useState('NB-');
    const scannerRef = useRef(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader", { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        });

        scanner.render(onScanSuccess, onScanError);

        function onScanSuccess(decodedText) {
            handleScan(decodedText);
        }

        function onScanError(err) {
            // Silence common errors
        }

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [eventId]);

    const handleScan = async (code) => {
        if (loading || !code) return;
        setLoading(true);
        setError(null);
        setScanResult(null);

        try {
            // 1. Identify Code Type
            if (code.startsWith('NB-') || code.startsWith('GL-')) {
                // Check Tickets first
                const order = ticketOrders.find(o => o.bookingRef === code && o.eventId === eventId);
                if (order) {
                    if (order.attended) throw new Error("WARNING: TICKET ALREADY REDEEMED.");
                    await updateTicketOrder(order.id, { attended: true, attendedAt: new Date().toISOString() });
                    setScanResult({ type: 'ticket', data: order });
                    setManualCode('NB-');
                    return;
                }

                // If not in tickets, check guestlist
                const { query, collectionGroup, where, getDocs, doc, updateDoc, getDoc } = await import('firebase/firestore');
                const { db } = await import('../../lib/firebase');
                
                const q = query(collectionGroup(db, 'entries'), where('bookingRef', '==', code));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const entryDoc = querySnapshot.docs[0];
                    const entryData = entryDoc.data();
                    const pathParts = entryDoc.ref.path.split('/');
                    const glId = pathParts[1];

                    if (entryData.attended) throw new Error("WARNING: GUEST ALREADY CHECKED IN.");

                    const glSnap = await getDoc(doc(db, 'guestlists', glId));
                    const glData = glSnap.data();
                    
                    if (eventId && glData.eventId && glData.eventId !== eventId) {
                        throw new Error("INVALID ACCESS: THIS CODE IS FOR A DIFFERENT MISSION.");
                    }

                    await updateDoc(entryDoc.ref, {
                        attended: true,
                        attendedAt: new Date().toISOString()
                    });

                    setScanResult({ 
                        type: 'guestlist', 
                        code,
                        data: {
                            customerName: entryData.customerName,
                            customerEmail: entryData.customerEmail,
                            guestsCount: entryData.guestsCount
                        }
                    });
                    setManualCode('NB-');
                    return;
                }

                throw new Error("CODE NOT FOUND IN REGISTRY.");
            }
            else {
                throw new Error("UNRECOGNIZED ENTRANCE PROTOCOL.");
            }
        } catch (err) {
            console.error("Scan Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 overflow-hidden">
            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            {/* Performance Overlays */}
            <AnimatePresence>
                {scanResult && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-neon-green/20 backdrop-blur-sm pointer-events-none border-[20px] border-neon-green/30"
                    />
                )}
                {error && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-red-500/20 backdrop-blur-sm pointer-events-none border-[20px] border-red-500/30"
                    />
                )}
            </AnimatePresence>

            <div className="relative z-10 w-full max-w-2xl space-y-12">
                {/* Header Context */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 uppercase text-[10px] font-black tracking-[0.3em] backdrop-blur-md">
                        <Sparkles size={12} className="text-neon-blue" /> ENTRANCE_TERMINAL_01
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black font-heading tracking-tighter text-white uppercase italic leading-none">
                        GATE<span className="text-neon-blue">SCANNER.</span>
                    </h1>
                </div>

                {/* Primary Scan Zone (Payment-App Style) */}
                <div className="relative mx-auto w-full max-w-sm aspect-square bg-zinc-900/40 rounded-[4rem] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-3xl group">
                    <div id="reader" className="w-full h-full object-cover grayscale contrast-125 opacity-40 group-hover:opacity-60 transition-opacity" />
                    
                    {/* Scanning UI Elements */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Rounded Frame */}
                        <div className="absolute inset-12 border-2 border-white/10 rounded-[3rem] border-dashed" />
                        
                        {/* Laser Line */}
                        <motion.div 
                            animate={{ top: ['20%', '80%', '20%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute left-12 right-12 h-0.5 bg-gradient-to-r from-transparent via-neon-blue to-transparent shadow-[0_0_15px_rgba(46,191,255,0.8)] z-20"
                        />

                        {/* Scanner Corners */}
                        <div className="absolute top-12 left-12 w-8 h-8 border-t-4 border-l-4 border-neon-blue rounded-tl-2xl shadow-[-5px_-5px_15px_rgba(46,191,255,0.3)]" />
                        <div className="absolute top-12 right-12 w-8 h-8 border-t-4 border-r-4 border-neon-blue rounded-tr-2xl shadow-[5px_-5px_15px_rgba(46,191,255,0.3)]" />
                        <div className="absolute bottom-12 left-12 w-8 h-8 border-b-4 border-l-4 border-neon-blue rounded-bl-2xl shadow-[-5px_5px_15px_rgba(46,191,255,0.3)]" />
                        <div className="absolute bottom-12 right-12 w-8 h-8 border-b-4 border-r-4 border-neon-blue rounded-br-2xl shadow-[5px_5px_15px_rgba(46,191,255,0.3)]" />
                    </div>

                    {/* Result Overlays */}
                    <AnimatePresence mode="wait">
                        {loading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-16 h-16 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin mb-6" />
                                <p className="text-[10px] font-black text-neon-blue uppercase tracking-widest animate-pulse">Establishing Handshake...</p>
                            </motion.div>
                        )}

                        {scanResult && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="absolute inset-0 z-40 bg-neon-green/90 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center text-black">
                                <CheckCircle size={80} className="mb-6 drop-shadow-lg" />
                                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-2">ACCESS<br />GRANTED.</h2>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mb-8">Protocol Validated</p>
                                
                                <div className="bg-black/10 backdrop-blur-md rounded-3xl p-6 w-full space-y-3">
                                    <p className="text-[9px] font-black uppercase opacity-60">Verified Identity</p>
                                    <p className="text-xl font-black uppercase tracking-tight truncate w-full italic">{scanResult.data?.customerName || 'VALID_HOLDER'}</p>
                                    <div className="h-px bg-black/5 w-12 mx-auto" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">{scanResult.type === 'ticket' ? 'PREMIUM HOLDER' : 'GUESTLIST'}</p>
                                </div>
                                
                                <Button 
                                    onClick={() => setScanResult(null)}
                                    className="mt-8 bg-black text-neon-green h-14 rounded-2xl px-12 border-none font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all w-full"
                                >
                                    Proceed to Next
                                </Button>
                            </motion.div>
                        )}

                        {error && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="absolute inset-0 z-40 bg-red-600/90 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center text-white">
                                <XCircle size={80} className="mb-6 drop-shadow-lg" />
                                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-2">DENIED.</h2>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80 mb-8">UNAUTHORIZED_SIGNAL</p>
                                
                                <div className="bg-black/10 backdrop-blur-md rounded-3xl p-6 w-full">
                                    <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">{error}</p>
                                </div>
                                
                                <Button 
                                    onClick={() => setError(null)}
                                    className="mt-8 bg-white text-red-600 h-14 rounded-2xl px-12 border-none font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all w-full"
                                >
                                    Retry Optical Link
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Manual Signal Link */}
                <div className="max-w-md mx-auto w-full space-y-6">
                    <div className="flex items-center gap-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] px-4">
                        <div className="h-[2px] flex-1 bg-white/5" />
                        OR_INPUT_MANUAL_SIGNAL
                        <div className="h-[2px] flex-1 bg-white/5" />
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-blue transition-colors" size={20} />
                        <input 
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleScan(manualCode)}
                            placeholder="RECOVERY_CODE_INPUT..."
                            className="w-full h-20 pl-16 pr-32 bg-zinc-900/40 border border-white/5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] focus:border-neon-blue/40 focus:bg-zinc-900/60 outline-none transition-all placeholder:text-gray-800 backdrop-blur-xl"
                        />
                        <button 
                            onClick={() => handleScan(manualCode)}
                            className="absolute right-4 top-4 bottom-4 px-6 bg-neon-blue text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_20px_rgba(46,191,255,0.3)]"
                        >
                            VERIFY
                        </button>
                    </div>

                    <div className="flex justify-center gap-8 pt-4">
                        <div className="flex flex-col items-center gap-2">
                            <ShieldAlert className="text-neon-blue/40" size={20} />
                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Operational_Intel</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <QrCode className="text-gray-700" size={20} />
                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">optical_capture</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GateScanner;
