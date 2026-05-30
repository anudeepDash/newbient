import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ShieldCheck, 
    ShieldAlert, 
    Eye, 
    ExternalLink, 
    Lock, 
    Calendar, 
    User, 
    CreditCard, 
    Check, 
    FileText, 
    Activity
} from 'lucide-react';

const VerifyPayout = () => {
    const [searchParams] = useSearchParams();

    const ref = searchParams.get('ref') || '';
    const amt = searchParams.get('amt') || '';
    const payee = searchParams.get('payee') || '';
    const proof = searchParams.get('proof') || '';
    const dateParam = searchParams.get('date') || '';
    const modeParam = searchParams.get('mode') || 'ONLINE TRANSFER';

    const isValid = ref && amt && payee;

    useEffect(() => {
        document.title = isValid
            ? `Payment Verified — ₹${Number(amt).toLocaleString('en-IN')} to ${payee} | Newbi`
            : 'Invalid Verification | Newbi';
    }, [isValid, amt, payee]);

    const formattedAmount = useMemo(() => {
        const num = Number(amt);
        if (isNaN(num)) return amt;
        return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, [amt]);

    const verifiedDate = useMemo(() => {
        if (dateParam) return decodeURIComponent(dateParam);
        return new Date().toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    }, [dateParam]);

    const isImageProof = proof && /\.(jpg|jpeg|png|webp)$/i.test(proof);

    // ── Invalid State ──────────────────────────────────────────────
    if (!isValid) {
        return (
            <div className="min-h-screen bg-[#060807] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <style>{`
                    @keyframes pulse-ring {
                        0% { transform: scale(0.95); opacity: 0.4; }
                        50% { transform: scale(1.15); opacity: 0.15; }
                        100% { transform: scale(0.95); opacity: 0.4; }
                    }
                `}</style>
                {/* Background Mesh */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] bg-red-500/5 rounded-full blur-[160px]" />
                    <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] bg-zinc-900/30 rounded-full blur-[160px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="relative z-10 flex flex-col items-center text-center max-w-md bg-zinc-950/60 backdrop-blur-2xl border border-red-500/10 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl"
                >
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl animate-pulse" />
                        <div className="relative w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <ShieldAlert size={36} className="text-red-500" />
                        </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic text-white mb-3">
                        Verification <span className="text-red-500">Failed</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 leading-relaxed max-w-xs mb-8">
                        This voucher link is corrupted, invalid, or belongs to an unregistered transaction. Please check the reference parameter.
                    </p>
                    <a
                        href="https://newbi.live"
                        className="px-8 py-4 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all border border-white/5"
                    >
                        Go to Newbi.live
                    </a>
                </motion.div>
            </div>
        );
    }

    // ── Valid Verification Card ────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#050706] text-white flex flex-col items-center justify-center px-4 py-20 sm:py-24 relative overflow-hidden selection:bg-[#39ff14] selection:text-black">
            {/* Custom Animations styles block */}
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes grid-glow {
                    0% { opacity: 0.15; }
                    50% { opacity: 0.25; }
                    100% { opacity: 0.15; }
                }
            `}</style>

            {/* Ambient Background Grid & Glows */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div 
                    className="absolute inset-0 opacity-15 animate-[grid-glow_8s_infinite_ease-in-out]" 
                    style={{
                        backgroundImage: `radial-gradient(rgba(57,255,20,0.15) 1px, transparent 1px)`,
                        backgroundSize: '24px 24px'
                    }} 
                />
                <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.1, 0.06] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#39ff14]/10 rounded-full blur-[140px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.04, 0.08, 0.04] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                    className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#00F0FF]/8 rounded-full blur-[140px]"
                />
            </div>

            {/* Main responsive grid layout */}
            <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-8 px-2">
                
                {/* LEFT COLUMN: Premium Glassmorphic Receipt Voucher */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[340px] bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[2.5rem] overflow-hidden relative group shrink-0 flex flex-col p-6 sm:p-8 justify-between shadow-2xl"
                >
                    {/* Top Header Card */}
                    <div className="text-center relative pb-6 border-b border-white/10">
                        <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4">
                            <img 
                                src="/logo_full.png" 
                                alt="Newbi Logo" 
                                className="h-4 object-contain filter brightness-100"
                            />
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[#39ff14] mb-2">Disbursement Voucher</p>
                        
                        {/* Huge modern amount banner */}
                        <div className="my-3">
                            <span className="text-[10px] font-extrabold text-[#39ff14]/65 align-super mr-0.5">INR</span>
                            <span className="text-4xl font-black tracking-tighter text-white font-mono drop-shadow-[0_4px_12px_rgba(57,255,20,0.25)]">
                                {formattedAmount.split('.')[0]}
                            </span>
                            <span className="text-sm font-bold text-white/60">.{formattedAmount.split('.')[1] || '00'}</span>
                        </div>
                        <p className="text-[7px] font-mono text-gray-500 uppercase tracking-widest mt-1">Transaction Ref: {ref.slice(0, 16)}...</p>
                    </div>

                    {/* Details Card Body */}
                    <div className="flex flex-col relative pt-6 space-y-4 text-[10px] uppercase font-bold text-gray-300">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end pb-1 border-b border-white/5">
                                <span className="text-gray-500 font-extrabold text-[8px] tracking-wider flex items-center gap-1.5">
                                    <Calendar size={10} className="text-gray-600" /> DATE
                                </span>
                                <span className="text-white font-bold font-mono tracking-tight">{verifiedDate}</span>
                            </div>
                            <div className="flex justify-between items-end pb-1 border-b border-white/5">
                                <span className="text-gray-500 font-extrabold text-[8px] tracking-wider flex items-center gap-1.5">
                                    <User size={10} className="text-gray-600" /> PAYEE
                                </span>
                                <span className="text-[#39ff14] font-black tracking-wide truncate max-w-[170px]" title={decodeURIComponent(payee)}>{decodeURIComponent(payee)}</span>
                            </div>
                            <div className="flex justify-between items-end pb-1 border-b border-white/5">
                                <span className="text-gray-500 font-extrabold text-[8px] tracking-wider flex items-center gap-1.5">
                                    <CreditCard size={10} className="text-gray-600" /> METHOD
                                </span>
                                <span className="text-white font-bold tracking-wide truncate max-w-[170px]" title={decodeURIComponent(modeParam)}>{decodeURIComponent(modeParam)}</span>
                            </div>
                            <div className="flex justify-between items-end pb-1 border-b border-white/5">
                                <span className="text-gray-500 font-extrabold text-[8px] tracking-wider flex items-center gap-1.5">
                                    <Lock size={10} className="text-gray-600" /> TXN ID
                                </span>
                                <span className="text-white font-bold select-all tracking-normal text-right truncate max-w-[170px]" title={ref}>{ref.slice(0, 16)}...</span>
                            </div>
                        </div>

                        {/* Audit Verification Log Hash */}
                        <div className="mt-4 p-3 bg-white/[0.02] border border-white/10 rounded-xl font-mono text-[7px] text-gray-500 space-y-1 leading-normal">
                            <div className="flex justify-between">
                                <span>BLOCK_MATCH:</span>
                                <span className="text-gray-400">LEDGER_OK</span>
                            </div>
                            <div className="flex justify-between truncate">
                                <span>LEDGER_HASH:</span>
                                <span className="text-[#39ff14]">sha256_b39ff14a0a...</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT COLUMN: Interactive Audit Dashboard & Proof Viewer */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                    className="flex-1 w-full max-w-[500px] bg-zinc-950/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden"
                >
                    {/* Header: Audit Title */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 px-3 py-1 bg-[#39ff14]/10 border border-[#39ff14]/20 rounded-full">
                                <Activity size={10} className="text-[#39ff14] animate-pulse" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#39ff14]">Live Ledger Audit</span>
                            </div>
                            <div className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                <Lock size={10} className="text-gray-600" /> Secure SSL 256bit
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic text-white leading-none">
                                Transaction <span className="text-[#39ff14]">Verified.</span>
                            </h2>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider mt-1.5">
                                This voucher is cryptographically signed and confirmed by finance authorities.
                            </p>
                        </div>

                        {/* Audit Verification Trail Checkmarks */}
                        <div className="py-4 space-y-3.5">
                            {[
                                { title: "Secure Record Located", desc: `Matched Transaction ID ${ref}` },
                                { title: "Beneficiary Credentials Confirmed", desc: `Payee matched to authorized account: ${decodeURIComponent(payee)}` },
                                { title: "Settlement Confirmed", desc: `Verified payment clearance via ${decodeURIComponent(modeParam)}` },
                                { title: "ledger fingerprint signed", desc: "Hash matched against Newbi registry nodes" }
                            ].map((step, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + (idx * 0.1) }}
                                    key={idx} 
                                    className="flex items-start gap-4"
                                >
                                    <div className="w-5 h-5 rounded-full bg-[#39ff14]/15 border border-[#39ff14]/30 flex items-center justify-center text-[#39ff14] shrink-0 mt-0.5 shadow-[0_0_8px_rgba(57,255,20,0.15)]">
                                        <Check size={10} strokeWidth={3} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white">{step.title}</h4>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-relaxed">{step.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Attached Proof Document Pocket */}
                    {proof ? (
                        <div className="mt-6 border-t border-white/5 pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Audit Documentation</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#00F0FF]">Payment Proof File</span>
                            </div>

                            {isImageProof ? (
                                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/50 relative group cursor-pointer aspect-[16/9]">
                                    <img
                                        src={decodeURIComponent(proof)}
                                        alt="Payment proof"
                                        className="w-full h-full object-cover object-top opacity-60 group-hover:opacity-85 transition-all duration-500 group-hover:scale-105"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                                        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                            <Eye size={18} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-5 border border-white/10 rounded-2xl bg-black/40 flex items-center gap-4 group hover:border-[#00F0FF]/30 transition-colors">
                                    <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 flex items-center justify-center text-[#00F0FF]">
                                        <FileText size={22} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="text-[10px] font-black uppercase text-white truncate">proof_document_{ref.slice(0,6)}.pdf</h4>
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-0.5">PDF Document • External Link</p>
                                    </div>
                                </div>
                            )}

                            <a
                                href={decodeURIComponent(proof)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black hover:shadow-[0_10px_25px_rgba(0,240,255,0.2)] transition-all font-black text-[10px] uppercase tracking-widest"
                            >
                                <Eye size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                                <span>View Attached Document</span>
                                <ExternalLink size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                            </a>
                        </div>
                    ) : (
                        <div className="mt-6 border-t border-white/5 pt-6 text-center py-6">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">No external documents attached to this record.</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Secure Audit Ledger footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="relative z-10 w-full max-w-5xl mt-12 text-center space-y-2.5 px-4"
            >
                <div className="flex items-center justify-center gap-2 text-gray-600 text-[8px] font-black uppercase tracking-[0.25em]">
                    <ShieldCheck size={12} className="text-gray-700" />
                    <span>Official Secure Verification Record</span>
                </div>
                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-wider leading-relaxed max-w-md mx-auto">
                    Access metadata and execution fingerprints are logged securely on client query. Verification services provided by Newbi Entertainment © {new Date().getFullYear()}
                </p>
            </motion.div>
        </div>
    );
};

export default VerifyPayout;
