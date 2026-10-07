import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Copy, Check, MessageCircle, Mail, Share2, QrCode, 
    ExternalLink, FileText, ShieldCheck, Sparkles, Eye, Download 
} from 'lucide-react';
import QRCode from 'qrcode';
import { cn } from '../../lib/utils';
import { getDocumentShareMeta, getPdfPreviewImageUrl } from '../../lib/documentPreviewUtils';

export default function DocumentShareModal({
    isOpen,
    onClose,
    documentData = {},
    type = 'proposal',
    pdfPagePreview = null,
    theme = { primary: '#39FF14', text: 'text-neon-green', bg: 'bg-neon-green' }
}) {
    const [copied, setCopied] = useState(false);
    const [showQrCode, setShowQrCode] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [activeTab, setActiveTab] = useState('card'); // 'card' or 'link'

    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://www.newbi.live/';
    const shareMeta = getDocumentShareMeta(documentData, type);

    // Prefer rendered PDF canvas image, then Cloudinary page 1 JPG, then fallback
    const effectivePreviewImage = pdfPagePreview || 
        getPdfPreviewImageUrl(documentData?.fileUrl, { width: 800, height: 1100 }) || 
        shareMeta.previewImage;

    // Generate QR Code on demand
    useEffect(() => {
        if (showQrCode && !qrCodeDataUrl && shareUrl) {
            QRCode.toDataURL(shareUrl, {
                width: 320,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })
            .then(url => setQrCodeDataUrl(url))
            .catch(err => console.error("Error generating QR Code:", err));
        }
    }, [showQrCode, qrCodeDataUrl, shareUrl]);

    // Copy URL handler with toast/state feedback
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error("Clipboard copy failed:", err);
        }
    };

    // WhatsApp Share
    const handleWhatsAppShare = () => {
        const text = `${shareMeta.shareMessage}\n${shareUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    // Email Share
    const handleEmailShare = () => {
        const subject = encodeURIComponent(shareMeta.emailSubject);
        const body = encodeURIComponent(`${shareMeta.emailBody}${shareUrl}\n\nBest regards,\nNewbi Entertainment & Marketing LLP`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    // Native Device Share Sheet
    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareMeta.title,
                    text: shareMeta.description,
                    url: shareUrl
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error("Native share failed:", err);
                }
            }
        } else {
            handleCopy();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
                {/* Backdrop dismiss */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0"
                    onClick={onClose}
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-[#0B0F17] border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[92vh]"
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-neon-green shadow-sm">
                                <Share2 size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                                    <span>Share Document</span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono tracking-widest bg-neon-green/10 text-neon-green border border-neon-green/30">
                                        {shareMeta.badge}
                                    </span>
                                </h3>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                    Send or preview how this document looks when shared
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center justify-center"
                            title="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Scrollable Content Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                        {/* Interactive Preview Container */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <Eye size={12} className="text-neon-green" />
                                    <span>Live Sharing Preview</span>
                                </div>

                                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl text-[10px] font-bold">
                                    <button
                                        onClick={() => setActiveTab('card')}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg transition-all",
                                            activeTab === 'card' 
                                                ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm" 
                                                : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                        )}
                                    >
                                        Document Cover
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('link')}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg transition-all",
                                            activeTab === 'link' 
                                                ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm" 
                                                : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                        )}
                                    >
                                        Social Link Preview
                                    </button>
                                </div>
                            </div>

                            {/* TAB 1: Document Cover Visual Preview */}
                            {activeTab === 'card' && (
                                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900/60 dark:to-zinc-950 p-5 flex flex-col sm:flex-row items-center gap-5 shadow-inner">
                                    {/* Mini Document Paper Canvas Mockup */}
                                    <div className="w-32 sm:w-36 aspect-[1/1.414] bg-white text-black rounded-lg shadow-xl border border-black/15 overflow-hidden flex flex-col relative shrink-0 select-none group">
                                        {effectivePreviewImage && (effectivePreviewImage.startsWith('data:') || effectivePreviewImage.startsWith('http') || effectivePreviewImage.startsWith('/')) && !effectivePreviewImage.endsWith('/og-image.png') ? (
                                            <div className="w-full h-full relative overflow-hidden bg-white">
                                                <img 
                                                    src={effectivePreviewImage} 
                                                    alt="Document Page 1" 
                                                    className="w-full h-full object-cover object-top"
                                                    crossOrigin="anonymous"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                                    <span className="text-[8px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">Page 1</span>
                                                </div>
                                            </div>
                                        ) : (
                                            /* High-fidelity procedural document cover card */
                                            <div className="p-2.5 flex flex-col h-full justify-between font-['Outfit'] text-[7px] leading-tight bg-white">
                                                <div className="flex justify-between items-start border-b border-black/10 pb-1.5">
                                                    <span className="font-black text-[#15803D] tracking-wider text-[8px]">NEWBI</span>
                                                    <span className="font-mono font-bold text-gray-400 text-[6px]">{shareMeta.docNumber}</span>
                                                </div>
                                                <div className="my-auto space-y-1">
                                                    <span className="inline-block px-1 py-0.5 rounded text-[5px] font-black uppercase tracking-wider bg-[#E8FAF0] text-[#15803D]">
                                                        {shareMeta.badge}
                                                    </span>
                                                    <p className="font-black text-black text-[9px] line-clamp-2 leading-tight">
                                                        {shareMeta.clientName}
                                                    </p>
                                                    {shareMeta.campaignName && (
                                                        <p className="text-gray-500 text-[6px] line-clamp-1 italic">
                                                            {shareMeta.campaignName}
                                                        </p>
                                                    )}
                                                    {shareMeta.formattedAmount && (
                                                        <p className="text-[8px] font-black text-[#15803D] pt-0.5">
                                                            {shareMeta.formattedAmount}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="pt-1 border-t border-black/10 flex justify-between items-center text-[5px] text-gray-400">
                                                    <span>CONFIDENTIAL</span>
                                                    <ShieldCheck size={8} className="text-[#15803D]" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Metadata Column */}
                                    <div className="flex-1 min-w-0 space-y-2.5 text-left w-full">
                                        <div>
                                            <span className="text-[9px] font-mono font-bold tracking-widest text-neon-green uppercase">
                                                {shareMeta.docNumber}
                                            </span>
                                            <h4 className="text-base font-black text-gray-900 dark:text-white truncate">
                                                {shareMeta.clientName}
                                            </h4>
                                            {shareMeta.campaignName && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                                                    {shareMeta.campaignName}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                                            {shareMeta.formattedAmount && (
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-black/5 dark:bg-white/5 text-gray-900 dark:text-white">
                                                    {shareMeta.formattedAmount}
                                                </span>
                                            )}
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-neon-green/10 text-neon-green border border-neon-green/30">
                                                {documentData.status || 'Active'}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                Newbi Verified
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: Social Media Link Unfurl Simulation */}
                            {activeTab === 'link' && (
                                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-zinc-900/60 p-4 space-y-2 shadow-inner">
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                        <span>WhatsApp & Social Card Preview</span>
                                    </div>

                                    {/* Preview Card Simulation */}
                                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden bg-white dark:bg-black/60 shadow-md flex flex-col sm:flex-row">
                                        <div className="w-full sm:w-44 aspect-video sm:aspect-square bg-zinc-900 flex items-center justify-center relative overflow-hidden shrink-0">
                                            {effectivePreviewImage ? (
                                                <img 
                                                    src={effectivePreviewImage} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover"
                                                    crossOrigin="anonymous" 
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center p-3 text-center">
                                                    <FileText size={28} className="text-neon-green opacity-60" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3.5 flex flex-col justify-center space-y-1">
                                            <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400">
                                                newbi.live
                                            </span>
                                            <h5 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
                                                {shareMeta.title}
                                            </h5>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                                {shareMeta.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Copy Link Input Bar */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                                Direct Document Link
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-12 bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-2xl px-4 flex items-center overflow-hidden">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={shareUrl}
                                        className="w-full bg-transparent text-xs font-mono font-medium text-gray-800 dark:text-gray-200 outline-none truncate selection:bg-neon-green selection:text-black"
                                        onClick={(e) => e.target.select()}
                                    />
                                </div>

                                <button
                                    onClick={handleCopy}
                                    className={cn(
                                        "h-12 px-5 rounded-2xl font-black uppercase tracking-wider text-[11px] flex items-center gap-2 transition-all shrink-0 shadow-md",
                                        copied 
                                            ? "bg-green-600 text-white" 
                                            : "bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90"
                                    )}
                                >
                                    {copied ? (
                                        <>
                                            <Check size={16} />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={16} />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Quick Share Grid Actions */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                                Quick Share Options
                            </label>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {/* WhatsApp */}
                                <button
                                    onClick={handleWhatsAppShare}
                                    className="p-3 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] flex flex-col items-center justify-center gap-1.5 transition-all group"
                                >
                                    <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">WhatsApp</span>
                                </button>

                                {/* Email */}
                                <button
                                    onClick={handleEmailShare}
                                    className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-200 flex flex-col items-center justify-center gap-1.5 transition-all group"
                                >
                                    <Mail size={20} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Email</span>
                                </button>

                                {/* Device Native Share */}
                                <button
                                    onClick={handleNativeShare}
                                    className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-200 flex flex-col items-center justify-center gap-1.5 transition-all group"
                                >
                                    <Share2 size={20} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Device Share</span>
                                </button>

                                {/* QR Code Toggle */}
                                <button
                                    onClick={() => setShowQrCode(!showQrCode)}
                                    className={cn(
                                        "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all group",
                                        showQrCode 
                                            ? "bg-neon-green/20 text-neon-green border-neon-green/40 shadow-sm" 
                                            : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-200"
                                    )}
                                >
                                    <QrCode size={20} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">
                                        {showQrCode ? 'Hide QR' : 'Show QR'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* QR Code Expansion Panel */}
                        {showQrCode && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-black/10 dark:border-white/10 flex flex-col items-center gap-3"
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Scan with Phone Camera to View On Mobile
                                </p>
                                {qrCodeDataUrl ? (
                                    <div className="p-3 bg-white rounded-2xl shadow-md border border-black/10">
                                        <img src={qrCodeDataUrl} alt="Document QR Code" className="w-40 h-40 object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-40 h-40 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-xs text-gray-400 animate-pulse">
                                        Generating QR...
                                    </div>
                                )}
                            </motion.div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/[0.02] border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck size={13} className="text-neon-green" />
                            <span>Digital Security Verified</span>
                        </span>
                        <span>Newbi Live Documents</span>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
