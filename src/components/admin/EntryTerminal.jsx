import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Loader from 'lucide-react/dist/esm/icons/loader';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import Zap from 'lucide-react/dist/esm/icons/zap';
import User from 'lucide-react/dist/esm/icons/user';
import TicketIcon from 'lucide-react/dist/esm/icons/ticket';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Users from 'lucide-react/dist/esm/icons/users';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import X from 'lucide-react/dist/esm/icons/x';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Info from 'lucide-react/dist/esm/icons/info';
import HardDrive from 'lucide-react/dist/esm/icons/hard-drive';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Download from 'lucide-react/dist/esm/icons/download';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { useStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDocs, getDoc } from 'firebase/firestore';

const EntryTerminal = ({ eventId }) => {
    const navigate = useNavigate();
    const { ticketOrders, guestlists, updateTicketOrder, scanTicket } = useStore();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [scanModalOpen, setScanModalOpen] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [scanLoading, setScanLoading] = useState(false);
    
    // Find linked guestlist
    const gl = guestlists.find(g => g.eventId === eventId || g.linkedEventId === eventId);
    const glId = gl?.id || eventId;

    // Fetch entries in real-time
    useEffect(() => {
        if (!glId) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'guestlists', glId, 'entries'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setEntries(data);
            setLoading(false);
        });
        return unsub;
    }, [glId]);

    // Filter ticket orders for this event from global store
    const tickets = React.useMemo(() => {
        if (!eventId) return [];
        return ticketOrders.filter(t => t.eventId === eventId);
    }, [ticketOrders, eventId]);

    const handleCheckIn = async (type, id, currentStatus) => {
        try {
            if (type === 'guestlist') {
                const entryRef = doc(db, 'guestlists', gl.id, 'entries', id);
                await updateDoc(entryRef, {
                    attended: !currentStatus,
                    attendedAt: !currentStatus ? new Date().toISOString() : null
                });
            } else {
                await updateTicketOrder(id, {
                    attended: !currentStatus,
                    attendedAt: !currentStatus ? new Date().toISOString() : null
                });
            }
        } catch (error) {
            useStore.getState().addToast("Update Failed: " + error.message, 'error');
        }
    };

    const handleScan = async (code) => {
        if (scanLoading || !code) return;
        setScanLoading(true);
        setScanError(null);
        setScanResult(null);

        try {
            const result = await scanTicket(eventId, code);
            if (result.valid) {
                if (result.scanned) {
                    throw new Error("ALREADY REDEEMED / CHECKED IN.");
                }
                setScanResult({ type: result.data.type, data: { customerName: result.data.name } });
            } else {
                throw new Error(result.message || "INVALID CODE.");
            }
        } catch (err) {
            setScanError(err.message);
        } finally {
            setScanLoading(false);
        }
    };

    const handleDownloadAttendeeList = () => {
        const allEntries = [
            ...entries.map(e => ({ name: e.customerName, email: e.customerEmail, type: 'Guestlist', ref: e.bookingRef, status: e.attended ? 'Attended' : 'Registered' })),
            ...tickets.map(t => ({ name: t.customerName, email: t.customerEmail, type: 'Ticket', ref: t.bookingRef, status: t.attended ? 'Attended' : 'Paid' }))
        ];

        if (allEntries.length === 0) {
            useStore.getState().addToast("No data to export.", 'error');
            return;
        }

        const headers = ["Name", "Email", "Type", "Reference", "Status"];
        const rows = allEntries.map(e => [e.name, e.email, e.type, e.ref, e.status]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendee_List_${eventId}.csv`);
        link.click();
        useStore.getState().addToast("Attendee list downloaded.", 'success');
    };

    const filteredEntries = entries.filter(e => 
        e.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.bookingRef?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredTickets = tickets.filter(t => 
        t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.bookingRef?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: entries.length + tickets.length,
        checked: entries.filter(e => e.attended).length + tickets.filter(t => t.attended).length,
    };

    // QR Scanner Component for Modal
    const ScannerModule = () => {
        useEffect(() => {
            const scanner = new Html5QrcodeScanner("reader", { 
                fps: 20, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            });
            scanner.render(handleScan, () => {});
            return () => scanner.clear().catch(e => console.error(e));
        }, []);

        return (
            <div className="relative aspect-square w-full max-w-sm mx-auto bg-black rounded-[3rem] overflow-hidden border border-white/10">
                <div id="reader" className="w-full h-full grayscale opacity-60" />
                <div className="absolute inset-0 pointer-events-none border-[20px] border-black/40" />
                <div className="absolute inset-10 border-2 border-neon-blue/30 border-dashed rounded-[2rem]" />
                <motion.div 
                    animate={{ top: ['20%', '80%', '20%'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-x-10 h-0.5 bg-neon-blue shadow-[0_0_15px_rgba(46,191,255,0.8)] z-20"
                />
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
            <Loader className="animate-spin text-neon-blue" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Initializing Terminal...</p>
        </div>
    );

    return (
        <div className="space-y-10 py-8">
            {/* TERMINAL HEADER & STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                <Card className="lg:col-span-2 p-10 bg-zinc-900/40 border-white/5 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue">
                            <HardDrive size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">ENTRY TERMINAL</h2>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{gl?.title || 'GENERAL ACCESS'}</p>
                        </div>
                    </div>
                    <Button onClick={handleDownloadAttendeeList} variant="outline" className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Download size={16} /> DOWNLOAD LIST
                    </Button>
                </Card>

                <Card className="p-10 bg-black/40 border-white/10 rounded-[3rem] flex justify-between items-center group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 text-white/[0.02] scale-[3] group-hover:scale-[3.5] transition-transform duration-1000 rotate-12">
                        <Zap size={80} />
                    </div>
                    <div className="space-y-1 relative z-10">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">CHECK-IN PROGRESS</p>
                        <div className="text-5xl font-black italic text-white flex items-baseline gap-2">
                            {stats.checked}<span className="text-xl text-gray-700">/{stats.total}</span>
                        </div>
                    </div>
                    <div className="w-20 h-20 rounded-full border-4 border-white/5 flex items-center justify-center relative">
                        <svg className="w-full h-full -rotate-90">
                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                            <circle 
                                cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" 
                                style={{ strokeDasharray: 226, strokeDashoffset: 226 - (226 * (stats.checked / (stats.total || 1))) }}
                                className="text-neon-blue transition-all duration-1000"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-neon-blue">
                            {Math.round((stats.checked / (stats.total || 1)) * 100)}%
                        </span>
                    </div>
                </Card>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-blue transition-colors" size={20} />
                    <input 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search Name / Reference / Code..."
                        className="w-full bg-zinc-900/40 border border-white/10 h-20 pl-20 pr-8 rounded-[2rem] text-xs font-black uppercase tracking-widest focus:border-neon-blue/40 focus:bg-zinc-900/60 transition-all outline-none"
                    />
                </div>
                <Button 
                    onClick={() => navigate(`/admin/scanner?eventId=${eventId}`)}
                    className="h-20 px-12 bg-white text-black font-black uppercase tracking-[0.2em] italic rounded-[2rem] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-4 border-none"
                >
                    <QrCode size={24} className="text-neon-blue" />
                    LAUNCH TICKET SCANNER
                </Button>
                <Button 
                    variant="outline"
                    onClick={() => setScanModalOpen(true)}
                    className="h-20 px-8 bg-zinc-900/40 text-white font-black uppercase tracking-[0.2em] italic rounded-[2rem] hover:bg-white/10 transition-all border-white/10 flex items-center gap-4"
                >
                    <Search size={24} />
                    MANUAL ENTRY
                </Button>
            </div>

            {/* IDENTITY LOG */}
            <div className="grid grid-cols-1 gap-4">
                {[...filteredEntries.map(e => ({...e, type: 'guestlist'})), ...filteredTickets.map(t => ({...t, type: 'ticket'}))].length === 0 ? (
                    <div className="py-40 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-[4rem]">
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">No entries recorded in buffer.</p>
                    </div>
                ) : (
                    [...filteredEntries.map(e => ({...e, type: 'guestlist'})), ...filteredTickets.map(t => ({...t, type: 'ticket'}))]
                        .sort((a, b) => (b.attended ? 1 : 0) - (a.attended ? 1 : 0)) // Just sorting roughly, can customize
                        .map((entry) => (
                            <motion.div 
                                key={entry.id}
                                layout
                                className={cn(
                                    "p-6 px-10 rounded-[2.5rem] border transition-all duration-500 flex flex-col md:flex-row items-center gap-8 group",
                                    entry.attended ? "bg-black/20 border-white/5 opacity-50" : "bg-zinc-900/40 border-white/10 hover:border-neon-blue/40 shadow-2xl"
                                )}
                            >
                                <div className="flex-1 flex items-center gap-6 min-w-0">
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500",
                                        entry.attended ? "bg-neon-green/5 border-neon-green/20 text-neon-green" : "bg-white/5 border-white/10 text-gray-500 group-hover:bg-neon-blue/10 group-hover:text-neon-blue group-hover:border-neon-blue/20"
                                    )}>
                                        {entry.attended ? <CheckCircle2 size={32} /> : (entry.type === 'ticket' ? <TicketIcon size={32} /> : <User size={32} />)}
                                    </div>
                                    <div className="truncate">
                                        <h3 className="text-lg font-black uppercase text-white truncate tracking-tight">{entry.customerName || 'UNKNOWN_ENTITY'}</h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-[11px] font-black text-neon-blue bg-neon-blue/10 px-3 py-1 rounded-lg border border-neon-blue/20 uppercase tracking-widest">{entry.bookingRef || 'REF_MISSING'}</span>
                                            <div className="w-1 h-1 rounded-full bg-gray-800" />
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{entry.type === 'ticket' ? 'TICKET HOLDER' : 'GUESTLIST'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-10">
                                    <div className="hidden xl:block text-right">
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Entry Signal</p>
                                        <p className="text-xs font-black text-white italic lowercase font-mono">{entry.customerEmail}</p>
                                    </div>
                                    <Button 
                                        onClick={() => handleCheckIn(entry.type, entry.id, entry.attended)}
                                        className={cn(
                                            "h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all",
                                            entry.attended 
                                                ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-black" 
                                                : "bg-white/5 text-neon-blue border-white/10 hover:bg-neon-blue hover:text-black hover:scale-105 shadow-[0_10px_20px_rgba(46,191,255,0.1)]"
                                        )}
                                    >
                                        {entry.attended ? 'CANCEL_CHECK_IN' : 'MARK_ATTENDED'}
                                    </Button>
                                </div>
                            </motion.div>
                        ))
                )}
            </div>

            {/* SCAN MODAL */}
            <AnimatePresence>
                {scanModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
                            onClick={() => setScanModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, y: 20 }}
                            className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[4rem] p-12 overflow-hidden"
                        >
                            <div className="absolute top-8 right-8">
                                <button onClick={() => setScanModalOpen(false)} className="p-3 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="text-center space-y-3 mb-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-[8px] font-black uppercase tracking-widest">
                                    <Zap size={10} /> Active Scanner
                                </div>
                                <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter">SCANNER LINK.</h3>
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Align QR Code within the frame below</p>
                            </div>

                            <div className="relative">
                                <ScannerModule />
                                
                                <AnimatePresence mode="wait">
                                    {scanLoading && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center rounded-[3rem]">
                                            <Loader className="animate-spin text-neon-blue mb-4" size={40} />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-neon-blue">Authenticating...</p>
                                        </motion.div>
                                    )}

                                    {scanResult && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-neon-green/90 flex flex-col items-center justify-center p-8 text-black text-center rounded-[3rem]">
                                            <CheckCircle2 size={80} className="mb-6" />
                                            <h4 className="text-4xl font-black italic uppercase leading-none mb-2">ACCESS GRANTED.</h4>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-8">{scanResult.data?.customerName}</p>
                                            <Button 
                                                onClick={() => setScanResult(null)}
                                                className="bg-black text-neon-green h-14 rounded-2xl px-12 border-none font-black uppercase tracking-widest text-[10px] w-full"
                                            >
                                                Proceed to Next
                                            </Button>
                                        </motion.div>
                                    )}

                                    {scanError && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-red-600 flex flex-col items-center justify-center p-8 text-white text-center rounded-[3rem]">
                                            <XCircle size={80} className="mb-6" />
                                            <h4 className="text-4xl font-black italic uppercase leading-none mb-2">ACCESS DENIED.</h4>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-8">{scanError}</p>
                                            <Button 
                                                onClick={() => setScanError(null)}
                                                className="bg-white text-red-600 h-14 rounded-2xl px-12 border-none font-black uppercase tracking-widest text-[10px] w-full"
                                            >
                                                Try Again
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="mt-10 flex flex-col items-center gap-2">
                                <Lock className="text-gray-800" size={16} />
                                <span className="text-[8px] font-black text-gray-800 uppercase tracking-[0.4em]">SECURE ACCESS CONTROL</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EntryTerminal;
