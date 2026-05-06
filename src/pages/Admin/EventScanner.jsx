import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CheckCircle2, XCircle, AlertTriangle, ScanLine, ArrowLeft, Loader2, Users, Search, Maximize, Ticket } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Html5QrcodeScanner } from 'html5-qrcode';

const EventScanner = () => {
    const { upcomingEvents, scanTicket, user } = useStore();
    const navigate = useNavigate();
    const [selectedEventId, setSelectedEventId] = useState('');
    const [scanResult, setScanResult] = useState(null); // { status: 'GREEN'|'RED'|'YELLOW', message: '', data: {} }
    const [isScanning, setIsScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');

    const activeEvent = upcomingEvents?.find(e => e.id === selectedEventId);

    useEffect(() => {
        let scanner = null;
        if (isScanning && selectedEventId) {
            scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 300, height: 300 }, aspectRatio: 1.0 },
                /* verbose= */ false
            );
            scanner.render(handleScanSuccess, handleScanFailure);
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, [isScanning, selectedEventId]);

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
            <div className="h-24 bg-black/40 backdrop-blur-3xl border-b border-white/10 flex items-center justify-between px-6 md:px-10 shrink-0 z-50">
                <button onClick={handleBack} className="flex items-center gap-3 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-gray-300 hover:text-white transition-all group">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Back</span>
                </button>
                <div className="flex items-center gap-4 bg-black/60 px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
                    <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        isScanning ? "bg-neon-green shadow-[0_0_10px_#39FF14]" : "bg-gray-500"
                    )} />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Scanner UI</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
                {/* Configuration Sidebar */}
                <div className="w-full md:w-96 bg-black/60 backdrop-blur-2xl border-r border-white/10 p-6 md:p-8 flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar z-20">
                    
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
                            {upcomingEvents?.map(e => (
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
                                    <h4 className={cn(
                                        "text-sm font-black uppercase italic tracking-widest truncate",
                                        selectedEventId === e.id ? "text-white" : "text-gray-400"
                                    )}>{e.title}</h4>
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
                        <div className="w-full max-w-lg flex flex-col items-center gap-6 relative z-10 h-full justify-center">
                            {/* Visual Scanner Frame */}
                            <div className="w-full aspect-square bg-black/80 backdrop-blur-xl border border-white/10 rounded-[3rem] overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col group">
                                {isScanning ? (
                                    <div className="flex-1 relative bg-black">
                                        <div id="reader" className="w-full h-full object-cover scanner-override flex items-center justify-center overflow-hidden" />
                                        {/* HUD Overlay */}
                                        <div className="absolute inset-0 pointer-events-none border-[2px] border-white/10 rounded-[3rem] z-50">
                                            {/* Corner Reticles */}
                                            <div className="absolute top-6 left-6 w-16 h-16 border-t-[6px] border-l-[6px] border-neon-green rounded-tl-[1.5rem] opacity-80" />
                                            <div className="absolute top-6 right-6 w-16 h-16 border-t-[6px] border-r-[6px] border-neon-green rounded-tr-[1.5rem] opacity-80" />
                                            <div className="absolute bottom-6 left-6 w-16 h-16 border-b-[6px] border-l-[6px] border-neon-green rounded-bl-[1.5rem] opacity-80" />
                                            <div className="absolute bottom-6 right-6 w-16 h-16 border-b-[6px] border-r-[6px] border-neon-green rounded-br-[1.5rem] opacity-80" />
                                            
                                            {/* Scanning Laser */}
                                            <div className="absolute inset-x-8 top-1/2 h-1 bg-neon-green shadow-[0_0_30px_#39FF14] animate-[scan_3s_ease-in-out_infinite]" />
                                            
                                            <div className="absolute bottom-8 left-0 right-0 text-center">
                                                <span className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white/80">Scanning Pass...</span>
                                            </div>
                                        </div>
                                    </div>
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
                                    placeholder="INPUT OVERRIDE CODE..." 
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
                                    "p-8 md:p-10 rounded-[3rem] border backdrop-blur-3xl text-center relative overflow-hidden shadow-2xl",
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
                                    <div className="flex justify-center mb-6 relative z-10">
                                        <div className={cn(
                                            "w-24 h-24 rounded-full flex items-center justify-center border-4",
                                            scanResult.status === 'GREEN' && "bg-neon-green/20 border-neon-green text-neon-green",
                                            scanResult.status === 'RED' && "bg-red-500/20 border-red-500 text-red-500",
                                            scanResult.status === 'YELLOW' && "bg-yellow-500/20 border-yellow-500 text-yellow-500"
                                        )}>
                                            {scanResult.status === 'GREEN' && <CheckCircle2 size={48} />}
                                            {scanResult.status === 'RED' && <XCircle size={48} />}
                                            {scanResult.status === 'YELLOW' && <AlertTriangle size={48} />}
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
                #reader { border: none !important; width: 100% !important; background: #000; text-align: center; display: flex; flex-direction: column; }
                #reader > div { width: 100%; display: flex; flex-direction: column; align-items: center; }
                #reader__scan_region { background: transparent !important; min-height: 300px; display: flex; align-items: center; justify-content: center; width: 100%; }
                #reader__scan_region img { display: none !important; }
                
                #reader__dashboard_section_csr { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; margin-top: 20px; }
                #reader__dashboard_section_csr span { color: white !important; font-family: 'Inter', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900;}
                #reader__dashboard_section_csr select { width: 80%; max-width: 300px; padding: 12px; margin: 10px auto; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: bold; background: #111; color: white; border: 1px solid #333; outline: none; text-align: center; cursor: pointer; }
                
                #reader button { background: white; color: black; border-radius: 12px; font-weight: 900; padding: 14px 28px; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; border: none; font-size: 11px; margin-top: 15px; transition: transform 0.2s; display: inline-block;}
                #reader button:hover { transform: scale(1.05); }
                #reader__dashboard_section_swaplink { color: #888 !important; text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-decoration: none; margin-top: 15px; display: block; text-align: center; width: 100%;}
                #reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; border-radius: 3rem; transform: scale(1.05); margin: 0; }
                
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
