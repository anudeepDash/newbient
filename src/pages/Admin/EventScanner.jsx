import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Users from 'lucide-react/dist/esm/icons/users';
import Search from 'lucide-react/dist/esm/icons/search';
import Maximize from 'lucide-react/dist/esm/icons/maximize';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Html5Qrcode } from 'html5-qrcode';

const EventScanner = () => {
    const { upcomingEvents, portfolio = [], guestlists = [], scanTicket, user } = useStore();
    const [searchParams] = useSearchParams();
    const eventIdFromUrl = searchParams.get('eventId');

    const allOperationalEvents = [
        ...(upcomingEvents?.filter(e => e.isTicketed || e.isGuestlistEnabled) || []),
        ...(portfolio?.filter(p => p.wasEvent && (p.isTicketed || p.isGuestlistEnabled)) || []),
        ...(guestlists || []).map(g => ({ ...g, isGuestlist: true }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const navigate = useNavigate();
    const [selectedEventId, setSelectedEventId] = useState(eventIdFromUrl || '');
    const [scanResult, setScanResult] = useState(null); // { status: 'GREEN'|'RED'|'YELLOW', message: '', data: {} }
    const [isScanning, setIsScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');

    const [facingMode, setFacingMode] = useState("environment");
    const scannerRef = useRef(null);
    const isTransitioning = useRef(false);

    const activeEvent = allOperationalEvents.find(e => e.id === selectedEventId);

    useEffect(() => {
        let mounted = true;

        if (!isScanning || !selectedEventId) {
            if (scannerRef.current && !isTransitioning.current) {
                isTransitioning.current = true;
                scannerRef.current.stop().then(() => {
                    if (scannerRef.current) scannerRef.current.clear();
                    isTransitioning.current = false;
                }).catch(() => {
                    isTransitioning.current = false;
                });
            }
            return;
        }

        const startScanner = async () => {
            if (isTransitioning.current) return;
            
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader");
            }

            try {
                isTransitioning.current = true;
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                
                if (mounted) {
                    await scannerRef.current.start(
                        { facingMode: facingMode },
                        { fps: 10 },
                        handleScanSuccess,
                        handleScanFailure
                    );
                }
            } catch (error) {
                console.error("Scanner init error:", error);
            } finally {
                isTransitioning.current = false;
            }
        };

        startScanner();

        return () => {
            mounted = false;
            if (scannerRef.current && scannerRef.current.isScanning && !isTransitioning.current) {
                isTransitioning.current = true;
                scannerRef.current.stop().then(() => {
                    if (scannerRef.current) scannerRef.current.clear();
                    isTransitioning.current = false;
                }).catch(() => {
                    isTransitioning.current = false;
                });
            }
        };
    }, [isScanning, selectedEventId]);

    const toggleCamera = async () => {
        if (isTransitioning.current || !scannerRef.current) return;

        const newMode = facingMode === "environment" ? "user" : "environment";
        setFacingMode(newMode);

        try {
            isTransitioning.current = true;
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }
            
            await scannerRef.current.start(
                { facingMode: newMode },
                { fps: 10 },
                handleScanSuccess,
                handleScanFailure
            );
        } catch (error) {
            console.error("Swap error:", error);
        } finally {
            isTransitioning.current = false;
        }
    };

    const handleScanSuccess = async (decodedText, decodedResult) => {
        setIsScanning(false);
        processTicket(decodedText);
    };

    const handleScanFailure = (error) => {
        // Ignore
    };

    const processTicket = async (code) => {
        setScanResult(null);
        try {
            const result = await scanTicket(selectedEventId, code);
            
            if (result.valid && !result.scanned) {
                setScanResult({ status: 'GREEN', message: 'ENTRY GRANTED', data: result.data });
            } else if (result.valid && result.scanned) {
                setScanResult({ status: 'YELLOW', message: 'ALREADY SCANNED', data: result.data });
            } else {
                setScanResult({ status: 'RED', message: result.message || 'INVALID PASS', data: null });
            }
        } catch (error) {
            setScanResult({ status: 'RED', message: 'SYSTEM ERROR', data: null });
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualCode) processTicket(manualCode);
    };

    const handleBack = () => {
        if (user?.role === 'scanner') {
            navigate('/');
        } else {
            navigate('/admin');
        }
    };

    return (
        <div className="fixed inset-0 bg-[#020202] text-white font-sans overflow-hidden flex flex-col z-[9999]">
            {/* Ambient Background Glows */}
            <div className={cn(
                "absolute inset-0 opacity-30 blur-[200px] transition-all duration-1000 pointer-events-none",
                scanResult?.status === 'GREEN' ? "bg-neon-green" :
                scanResult?.status === 'RED' ? "bg-red-500" :
                scanResult?.status === 'YELLOW' ? "bg-yellow-500" :
                "bg-neon-blue/20"
            )} />

            {/* Header */}
            <div className="h-16 md:h-24 bg-black/40 backdrop-blur-3xl border-b border-white/10 flex items-center justify-between px-4 md:px-10 shrink-0 z-50">
                <button onClick={handleBack} className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl border border-white/10 text-gray-300 hover:text-white transition-all group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Back</span>
                </button>
                <div className="flex items-center gap-3 md:gap-4">
                    {selectedEventId && (
                        <button 
                            onClick={() => { setSelectedEventId(''); setIsScanning(false); setScanResult(null); }}
                            className="md:hidden px-3 py-1.5 bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-[9px] font-black uppercase tracking-widest rounded-xl"
                        >
                            Change Event
                        </button>
                    )}
                    <div className="flex items-center gap-2 md:gap-4 bg-black/60 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-white/10 shadow-2xl">
                        <div className={cn(
                            "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse",
                            isScanning ? "bg-neon-green shadow-[0_0_10px_#39FF14]" : "bg-gray-500"
                        )} />
                        <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-white">Scanner</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
                {/* Configuration Sidebar */}
                <div className={cn(
                    "w-full md:w-96 bg-black/60 backdrop-blur-2xl border-r border-white/10 p-4 md:p-8 flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar z-20",
                    selectedEventId ? "hidden md:flex" : "flex"
                )}>
                    
                    {/* Active Protocol Details */}
                    {activeEvent && (
                        <div className="bg-gradient-to-b from-neon-blue/10 to-transparent border border-neon-blue/20 rounded-[2rem] p-6 space-y-4 relative overflow-hidden group shadow-[0_0_30px_rgba(0,180,255,0.1)]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/20 rounded-full blur-[50px] group-hover:bg-neon-blue/30 transition-all" />
                            
                            <div className="relative z-10">
                                <h4 className="text-[9px] font-black text-neon-blue uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" /> Active Protocol
                                </h4>
                                <p className="text-2xl font-black italic uppercase tracking-tighter leading-none">{activeEvent.title}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{new Date(activeEvent.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )}

                    {/* Event Selection List */}
                    <div className="flex-1 flex flex-col gap-3 min-h-[300px]">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Event</label>
                        <div className="flex flex-col gap-3">
                            {allOperationalEvents.map(e => (
                                <button 
                                    key={e.id}
                                    onClick={() => { setSelectedEventId(e.id); setIsScanning(false); setScanResult(null); }}
                                    className={cn(
                                        "p-4 rounded-2xl border text-left transition-all relative overflow-hidden",
                                        selectedEventId === e.id 
                                            ? "bg-white/10 border-white/20 shadow-xl" 
                                            : "bg-white/5 border-white/5 hover:bg-white/10"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className={cn(
                                            "text-sm font-black uppercase italic tracking-widest truncate",
                                            selectedEventId === e.id ? "text-white" : "text-gray-400"
                                        )}>{e.title}</h4>
                                        {e.date && new Date(e.date) < new Date() && (
                                            <span className="shrink-0 text-[7px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">Past</span>
                                        )}
                                    </div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1">{new Date(e.date).toLocaleDateString()}</p>
                                    
                                    {selectedEventId === e.id && (
                                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-white" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Scanning Viewport */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
                    {!selectedEventId ? (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 max-w-sm">
                            <div className="w-32 h-32 mx-auto bg-white/5 rounded-full border border-white/10 flex items-center justify-center relative">
                                <div className="absolute inset-0 border-2 border-dashed border-gray-600 rounded-full animate-[spin_20s_linear_infinite]" />
                                <ScanLine size={48} className="text-gray-500" />
                            </div>
                            <h2 className="text-2xl font-black italic uppercase tracking-widest">Awaiting Setup</h2>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-relaxed">Please configure the target event from the console to initialize the optical scanner.</p>
                        </motion.div>
                    ) : (
                        <div className="w-full max-w-sm md:max-w-lg flex flex-col items-center gap-6 relative z-10 h-full justify-center">
                            {/* Visual Scanner Frame */}
                            <div className="w-full aspect-[4/5] md:aspect-square bg-black/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] md:rounded-[3rem] overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.8)] shrink-0">
                                {isScanning ? (
                                    <>
                                        <div className="absolute inset-0 bg-black overflow-hidden">
                                            <div id="reader" className="w-full h-full" />
                                        </div>
                                        {/* HUD Overlay */}
                                        <div className="absolute inset-0 border-[2px] border-white/10 z-50 pointer-events-none rounded-[2.5rem] md:rounded-[3rem]">
                                            {/* Corner Reticles */}
                                            <div className="absolute top-4 left-4 md:top-6 md:left-6 w-12 h-12 md:w-16 md:h-16 border-t-[4px] border-l-[4px] md:border-t-[6px] md:border-l-[6px] border-neon-green rounded-tl-[1.5rem] opacity-80" />
                                            <div className="absolute top-4 right-4 md:top-6 md:right-6 w-12 h-12 md:w-16 md:h-16 border-t-[4px] border-r-[4px] md:border-t-[6px] md:border-r-[6px] border-neon-green rounded-tr-[1.5rem] opacity-80" />
                                            <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 w-12 h-12 md:w-16 md:h-16 border-b-[4px] border-l-[4px] md:border-b-[6px] md:border-l-[6px] border-neon-green rounded-bl-[1.5rem] opacity-80" />
                                            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 w-12 h-12 md:w-16 md:h-16 border-b-[4px] border-r-[4px] md:border-b-[6px] md:border-r-[6px] border-neon-green rounded-br-[1.5rem] opacity-80" />
                                            
                                            {/* Scanning Laser */}
                                            <div className="absolute inset-x-8 top-1/2 h-1 bg-neon-green shadow-[0_0_30px_#39FF14] animate-[scan_3s_ease-in-out_infinite]" />
                                            
                                            <div className="absolute bottom-4 md:bottom-8 left-0 right-0 flex flex-col items-center gap-4 pointer-events-auto">
                                                <button 
                                                    onClick={toggleCamera} 
                                                    className="flex items-center gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/20 px-5 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl"
                                                >
                                                    <RefreshCw size={14} className={facingMode === "user" ? "rotate-180 transition-transform" : "transition-transform"} /> 
                                                    Swap Camera
                                                </button>
                                                <span className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/80">Scanning Pass...</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center bg-zinc-900/40 relative">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-80" />
                                        <div className="relative z-10 w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform">
                                            <ScanLine size={40} className="text-gray-400 group-hover:text-neon-green transition-colors" />
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-xl font-black uppercase tracking-widest mb-2 text-white">Camera Inactive</h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Initialize optical sensor to begin verification</p>
                                        </div>
                                        <Button onClick={() => { setIsScanning(true); setScanResult(null); }} className="relative z-10 h-16 px-10 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 shadow-[0_10px_40px_rgba(255,255,255,0.2)]">
                                            <ScanLine size={20} className="mr-3" /> Initialize Sensor
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Manual Entry Console */}
                            <form onSubmit={handleManualSubmit} className="w-full max-w-md flex gap-3 relative">
                                <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl" />
                                <Input 
                                    value={manualCode} 
                                    onChange={e => setManualCode(e.target.value)} 
                                    placeholder="TICKET CODE" 
                                    className="flex-1 h-16 bg-black/80 backdrop-blur border-white/10 rounded-2xl text-center font-mono font-black tracking-[0.3em] uppercase focus:border-neon-blue relative z-10"
                                />
                                <Button type="submit" className="h-16 px-8 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 relative z-10"><Search size={20}/></Button>
                            </form>
                        </div>
                    )}

                    {/* High-Fidelity Result Overlay */}
                    <AnimatePresence>
                        {scanResult && (
                            <motion.div 
                                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                                className="absolute inset-x-6 md:inset-x-auto md:w-[500px] bottom-10 z-[100]"
                            >
                                <div className={cn(
                                    "p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border backdrop-blur-3xl text-center relative overflow-hidden shadow-2xl",
                                    scanResult.status === 'GREEN' && "bg-black/90 border-neon-green/50 shadow-[0_30px_100px_rgba(57,255,20,0.2)]",
                                    scanResult.status === 'RED' && "bg-black/90 border-red-500/50 shadow-[0_30px_100px_rgba(239,68,68,0.2)]",
                                    scanResult.status === 'YELLOW' && "bg-black/90 border-yellow-500/50 shadow-[0_30px_100px_rgba(234,179,8,0.2)]"
                                )}>
                                    <div className={cn(
                                        "absolute inset-0 opacity-10",
                                        scanResult.status === 'GREEN' && "bg-neon-green",
                                        scanResult.status === 'RED' && "bg-red-500",
                                        scanResult.status === 'YELLOW' && "bg-yellow-500"
                                    )} />

                                    {/* Icon Header */}
                                    <div className="flex justify-center mb-4 md:mb-6 relative z-10">
                                        <div className={cn(
                                            "w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center border-[3px] md:border-4",
                                            scanResult.status === 'GREEN' && "bg-neon-green/20 border-neon-green text-neon-green",
                                            scanResult.status === 'RED' && "bg-red-500/20 border-red-500 text-red-500",
                                            scanResult.status === 'YELLOW' && "bg-yellow-500/20 border-yellow-500 text-yellow-500"
                                        )}>
                                            {scanResult.status === 'GREEN' && <CheckCircle2 className="w-8 h-8 md:w-12 md:h-12" />}
                                            {scanResult.status === 'RED' && <XCircle className="w-8 h-8 md:w-12 md:h-12" />}
                                            {scanResult.status === 'YELLOW' && <AlertTriangle className="w-8 h-8 md:w-12 md:h-12" />}
                                        </div>
                                    </div>

                                    {/* Message */}
                                    <div className="relative z-10 mb-8">
                                        <h3 className={cn(
                                            "text-4xl font-black italic uppercase tracking-tighter leading-none mb-4",
                                            scanResult.status === 'GREEN' && "text-neon-green",
                                            scanResult.status === 'RED' && "text-red-500",
                                            scanResult.status === 'YELLOW' && "text-yellow-500"
                                        )}>
                                            {scanResult.message}
                                        </h3>
                                        
                                        {scanResult.data && (
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-3">
                                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Holder</span>
                                                    <span className="text-xs font-black uppercase tracking-widest text-white">{scanResult.data.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Pass Type</span>
                                                    <span className="text-xs font-black uppercase tracking-widest text-white">{scanResult.data.type}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Access Granted</span>
                                                    <span className="text-xs font-black uppercase tracking-widest text-neon-green text-right flex flex-col items-end">
                                                        {scanResult.data.items ? (
                                                            scanResult.data.items.map((item, idx) => (
                                                                <span key={idx}>{item.count}x {item.name}</span>
                                                            ))
                                                        ) : scanResult.data.guestsCount ? (
                                                            <span>{scanResult.data.guestsCount} Guest{scanResult.data.guestsCount > 1 ? 's' : ''}</span>
                                                        ) : (
                                                            <span>1x General Access</span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center pt-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Identifier</span>
                                                    <span className="text-[10px] font-mono font-bold text-gray-300">{scanResult.data.code}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action */}
                                    <Button onClick={() => { setScanResult(null); setIsScanning(true); setManualCode(''); }} className="w-full h-16 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-gray-200 relative z-10">
                                        PROCEED TO NEXT
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <style>{`
                #reader { border: none !important; width: 100% !important; height: 100% !important; background: #000; position: relative; }
                #reader > div { display: none !important; } /* Hide all library-injected wrappers */
                #reader__dashboard_section_csr { display: none !important; }
                #reader__dashboard_section_swaplink { display: none !important; }
                
                #reader video { 
                    object-fit: cover !important; 
                    width: 100% !important; 
                    height: 100% !important; 
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    margin: 0 !important; 
                    padding: 0 !important;
                    display: block !important;
                }
                
                @keyframes scan {
                    0%, 100% { top: 15%; opacity: 0; }
                    10%, 90% { opacity: 1; }
                    50% { top: 85%; }
                }
            `}</style>
        </div>
    );
};

export default EventScanner;
