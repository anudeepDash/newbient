import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CheckCircle2, XCircle, AlertTriangle, ScanLine, ArrowLeft, Loader2, Users, Search } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Html5QrcodeScanner } from 'html5-qrcode';

const EventScanner = () => {
    const { upcomingEvents, scanTicket } = useStore();
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
                { fps: 10, qrbox: { width: 250, height: 250 } },
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
        // Stop scanning to process
        setIsScanning(false);
        processTicket(decodedText);
    };

    const handleScanFailure = (error) => {
        // Ignore constant failures unless critical
    };

    const processTicket = async (code) => {
        setScanResult(null);
        try {
            // Mock API / Store call: scanTicket(eventId, ticketCode)
            // In a real implementation, you'd verify against Firebase here
            const result = await scanTicket(selectedEventId, code);
            
            if (result.valid && !result.scanned) {
                setScanResult({ status: 'GREEN', message: 'ENTRY GRANTED', data: result.data });
            } else if (result.valid && result.scanned) {
                setScanResult({ status: 'RED', message: 'ALREADY SCANNED', data: result.data });
            } else {
                setScanResult({ status: 'RED', message: 'INVALID TICKET', data: null });
            }
        } catch (error) {
            // Mock fallback if function doesn't exist yet
            setScanResult({ 
                status: code.startsWith('GL-') || code.startsWith('TKT-') ? 'GREEN' : 'RED', 
                message: code.startsWith('GL-') || code.startsWith('TKT-') ? 'MOCK ENTRY GRANTED' : 'INVALID CODE FORMAT',
                data: { code, name: 'Attendee', guests: 1 }
            });
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualCode) processTicket(manualCode);
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col">
            {/* Header */}
            <div className="h-20 bg-zinc-950 border-b border-white/10 flex items-center justify-between px-6 shrink-0">
                <Link to="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} /> <span className="text-[10px] font-black uppercase tracking-widest">Back to Admin</span>
                </Link>
                <div className="flex items-center gap-3">
                    <QrCode className="text-neon-green" />
                    <span className="text-lg font-black italic uppercase tracking-widest">Scanner UI</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Configuration / Event Selection Sidebar */}
                <div className="w-full md:w-80 bg-zinc-900 border-r border-white/10 p-6 flex flex-col gap-6 shrink-0 z-10">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Select Event to Scan</label>
                        <select 
                            value={selectedEventId} 
                            onChange={(e) => { setSelectedEventId(e.target.value); setIsScanning(false); setScanResult(null); }}
                            className="w-full h-14 bg-black border border-white/10 rounded-xl px-4 text-xs font-bold uppercase text-white outline-none focus:border-neon-green"
                        >
                            <option value="">-- Choose Event --</option>
                            {upcomingEvents?.map(e => (
                                <option key={e.id} value={e.id}>{e.title}</option>
                            ))}
                        </select>
                    </div>

                    {activeEvent && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                            <h4 className="text-[10px] font-black text-neon-green uppercase tracking-widest">Active Event Stats</h4>
                            <div>
                                <p className="text-xl font-black italic">{activeEvent.title}</p>
                                <p className="text-xs text-gray-500 font-bold uppercase mt-1">{new Date(activeEvent.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex justify-between items-end pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Scanned</p>
                                    <p className="text-2xl font-black text-white tabular-nums">0</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Expected</p>
                                    <p className="text-2xl font-black text-gray-400 tabular-nums">0</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Scanner Main Area */}
                <div className="flex-1 bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
                    {/* Background Glows based on Status */}
                    <div className={cn(
                        "absolute inset-0 opacity-20 blur-[150px] transition-all duration-700 pointer-events-none",
                        scanResult?.status === 'GREEN' && "bg-neon-green",
                        scanResult?.status === 'RED' && "bg-red-500",
                        scanResult?.status === 'YELLOW' && "bg-yellow-500",
                        !scanResult && "bg-transparent"
                    )} />

                    {!selectedEventId ? (
                        <div className="text-center text-gray-500 space-y-4">
                            <ScanLine size={64} className="mx-auto opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Please select an event to begin scanning.</p>
                        </div>
                    ) : (
                        <div className="w-full max-w-md w-full flex flex-col gap-6 z-10">
                            {/* The Camera Window */}
                            <div className="bg-zinc-950 border-2 border-white/10 rounded-[3rem] overflow-hidden aspect-square relative shadow-2xl">
                                {isScanning ? (
                                    <div id="reader" className="w-full h-full object-cover scanner-override" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900/50 backdrop-blur">
                                        <ScanLine size={48} className="text-gray-600" />
                                        <Button onClick={() => { setIsScanning(true); setScanResult(null); }} className="bg-white text-black font-black uppercase tracking-widest rounded-xl">
                                            Start Camera
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Manual Entry Fallback */}
                            <form onSubmit={handleManualSubmit} className="flex gap-2">
                                <Input 
                                    value={manualCode} 
                                    onChange={e => setManualCode(e.target.value)} 
                                    placeholder="ENTER CODE MANUALLY" 
                                    className="h-14 bg-white/5 border-white/10 font-mono text-center tracking-widest focus:border-neon-green"
                                />
                                <Button type="submit" className="h-14 px-6 bg-white/10 hover:bg-white/20"><Search size={20}/></Button>
                            </form>
                        </div>
                    )}

                    {/* Result Overlay */}
                    <AnimatePresence>
                        {scanResult && (
                            <motion.div 
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                                className="absolute bottom-6 md:bottom-12 left-6 right-6 md:left-auto md:right-12 md:w-96 z-50"
                            >
                                <div className={cn(
                                    "p-6 rounded-[2rem] border shadow-2xl backdrop-blur-xl text-center space-y-4 relative overflow-hidden",
                                    scanResult.status === 'GREEN' && "bg-neon-green/10 border-neon-green text-neon-green",
                                    scanResult.status === 'RED' && "bg-red-500/10 border-red-500 text-red-500",
                                    scanResult.status === 'YELLOW' && "bg-yellow-500/10 border-yellow-500 text-yellow-500"
                                )}>
                                    {/* Icon */}
                                    <div className="flex justify-center">
                                        {scanResult.status === 'GREEN' && <CheckCircle2 size={48} />}
                                        {scanResult.status === 'RED' && <XCircle size={48} />}
                                        {scanResult.status === 'YELLOW' && <AlertTriangle size={48} />}
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-2">
                                            {scanResult.message}
                                        </h3>
                                        {scanResult.data && (
                                            <p className="text-white text-xs font-bold font-mono bg-black/40 py-2 rounded-xl mt-4">
                                                {scanResult.data.code} • {scanResult.data.name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action */}
                                    <Button onClick={() => { setScanResult(null); setIsScanning(true); setManualCode(''); }} className="w-full mt-4 bg-white text-black hover:bg-gray-200">
                                        SCAN NEXT
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Custom Scanner CSS Override to fix html5-qrcode weird default styling */}
            <style>{`
                #reader { border: none !important; }
                #reader__scan_region { background: transparent !important; }
                #reader__dashboard_section_csr span { color: white !important; font-family: monospace; }
                #reader button { background: white; color: black; border-radius: 8px; font-weight: bold; padding: 8px 16px; margin: 10px; cursor: pointer; border: none; }
                #reader__dashboard_section_swaplink { color: #aaa !important; }
                #reader video { object-fit: cover; border-radius: 3rem; }
            `}</style>
        </div>
    );
};

export default EventScanner;
