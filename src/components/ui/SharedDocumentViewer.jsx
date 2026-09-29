import React from 'react';
import { Link } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Printer from 'lucide-react/dist/esm/icons/printer';
import Download from 'lucide-react/dist/esm/icons/download';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import Upload from 'lucide-react/dist/esm/icons/upload';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export default function SharedDocumentViewer({
    documentData,
    type = 'proposal', // 'proposal', 'invoice', 'agreement'
    isAdmin,
    isExporting,
    onShare,
    onDownloadPDF,
    onOpenAttachments,
    pdfBlobUrl,
    pdfViewerFailed,
    setPdfViewerFailed,
    children
}) {
    const title = type === 'invoice' ? 'Tax Invoice' : type === 'agreement' ? 'Service Agreement' : (documentData.campaignName || 'Strategic Quotation & Proposal');
    const docNumber = type === 'invoice' ? documentData.invoiceNumber : type === 'agreement' ? documentData.agreementNumber : documentData.proposalNumber;
    const backLink = isAdmin ? `/admin/${type}s` : "/";
    const status = documentData.status || 'DRAFT';
    const isAccepted = status === 'Accepted' || status === 'Paid' || status === 'Executed';
    const isRejected = status === 'Rejected' || status === 'Failed';
    
    // Status colors
    const statusColorClass = isAccepted ? "bg-neon-green/10 text-neon-green border-neon-green/30" : 
                            (isRejected ? "bg-red-500/10 text-red-500 border-red-500/30" : 
                            "bg-blue-500/10 text-blue-400 border-blue-500/30");
    const statusDotClass = isAccepted ? "bg-neon-green" : "bg-blue-400 animate-pulse";
    
    // Logo resolution
    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
        { id: 'media', label: 'Newbi Media', path: '/logo_media.png', color: '#00D1FF' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
    ];
    const currentLogo = logoOptions.find(l => l.id === documentData.selectedLogo) || logoOptions[0];

    return (
        <div className="min-h-screen bg-[#050505] text-gray-900 dark:text-white selection:bg-neon-green selection:text-black font-['Outfit']">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300..700;1,300..700&display=swap');
                body { font-family: 'Outfit', sans-serif; }
                .font-signature { font-family: 'Caveat', cursive; }
                .font-formal { font-family: 'Crimson Pro', serif; }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .proposal-page-render { margin: 0 !important; box-shadow: none !important; page-break-after: always !important; }
                }
            `}} />

            {!isExporting && (
                <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black/60 backdrop-blur-3xl border-b border-black/10 dark:border-white/5 h-20 flex items-center px-6 no-print">
                    <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-6">
                            <Link to={backLink} className="p-2.5 sm:p-3 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/10 dark:border-white/5"><ArrowLeft size={16} /></Link>
                            <div className="min-w-0 max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                                <p className="text-[9px] sm:text-[10px] font-black text-neon-green uppercase tracking-widest leading-none mb-1 truncate">
                                    {documentData.clientName ? `${documentData.clientName} (${docNumber || documentData.id})` : title}
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isAccepted ? "bg-neon-green" : "bg-blue-500 animate-pulse")} />
                                    <span className="text-[8px] sm:text-[9px] font-black text-gray-500 uppercase tracking-widest truncate">{status}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            {documentData.attachments && documentData.attachments.length > 0 && onOpenAttachments && (
                                <button 
                                    onClick={onOpenAttachments} 
                                    className="p-2.5 sm:p-3 bg-neon-green/10 rounded-2xl hover:bg-neon-green/20 border border-neon-green/35 text-neon-green transition-all flex items-center gap-1.5"
                                    title="View Attachments"
                                >
                                    <Paperclip size={16} />
                                    <span className="text-[9px] font-black tracking-widest font-mono">{documentData.attachments.length}</span>
                                </button>
                            )}
                            {onShare && <button onClick={onShare} className="p-2.5 sm:p-3 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-neon-blue transition-all"><Share2 size={16} /></button>}
                            <button onClick={() => window.print()} className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/5 hidden sm:block"><Printer size={18} /></button>
                            {onDownloadPDF && (
                                <Button onClick={onDownloadPDF} className="bg-neon-green text-black font-black uppercase tracking-widest text-[9px] sm:text-[10px] h-10 sm:h-12 px-4 sm:px-8 rounded-xl sm:rounded-2xl shadow-[0_10px_30px_rgba(57,255,20,0.3)] hover:scale-105 transition-all">
                                    <Download size={14} className="sm:mr-2" /> <span className="hidden sm:inline">Export PDF</span><span className="sm:hidden">Export</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </nav>
            )}

            <main className="pt-24 sm:pt-32 pb-32 flex flex-col items-center px-4 sm:px-0">
                {documentData.isUploaded && documentData.fileUrl ? (
                    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8 px-2 sm:px-4">
                        {/* Document Header & Metadata Banner */}
                        <div className="bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                            <div className="flex items-start sm:items-center gap-4 sm:gap-6 min-w-0">
                                <img 
                                    src={currentLogo.path} 
                                    alt={currentLogo.label} 
                                    className="h-12 sm:h-14 w-auto object-contain shrink-0" 
                                    crossOrigin="anonymous" 
                                />
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        <span className="text-[9px] font-black font-mono tracking-widest text-neon-green bg-neon-green/10 px-2.5 py-1 rounded-full border border-neon-green/20">
                                            {docNumber}
                                        </span>
                                        <span className="text-[9px] font-black tracking-wider text-neon-blue bg-neon-blue/10 px-2.5 py-1 rounded-full border border-neon-blue/20 flex items-center gap-1">
                                            <Upload size={10} /> PRE-MADE {type.toUpperCase()}
                                        </span>
                                        <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border", statusColorClass)}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDotClass)} />
                                            {status}
                                        </div>
                                    </div>
                                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase italic tracking-tight font-heading text-white truncate">
                                        {title}
                                    </h1>
                                    <p className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        Prepared for <span className="text-white font-black">{documentData.clientName || documentData.parties?.secondParty?.name}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-white/10 shrink-0">
                                {(documentData.dealValue || documentData.totalOverride || documentData.amount || documentData.commercials?.totalValue) && (
                                    <div className="text-left md:text-right">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 block">Commercial Value</span>
                                        <span className="text-lg sm:text-2xl font-black font-mono text-neon-green">
                                            ₹{Number(documentData.dealValue || documentData.totalOverride || documentData.amount || documentData.commercials?.totalValue || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                )}
                                <div className="text-left md:text-right">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 block">Date of Issue</span>
                                    <span className="text-xs font-bold text-gray-300">
                                        {new Date(documentData.createdAt || documentData.invoiceDate || documentData.effectiveDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Executive Memo / Note if present */}
                        {(documentData.coverDescription || documentData.note) && (
                            <div className="p-6 sm:p-7 bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl relative overflow-hidden">
                                <div className="w-1.5 h-full bg-neon-green absolute left-0 top-0" />
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-neon-green mb-2">{type === 'invoice' ? 'Invoice Note' : 'Executive Memorandum'}</p>
                                <div className="text-sm font-medium leading-relaxed text-gray-300 whitespace-pre-line">
                                    {documentData.coverDescription || documentData.note}
                                </div>
                            </div>
                        )}

                        {/* Document Viewer Frame - Now handles the iframe here */}
                        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.6)] flex flex-col">
                            {/* Viewer Top Action Bar */}
                            <div className="px-5 sm:px-6 py-4 border-b border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
                                        <FileText size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">
                                            {documentData.fileName || `Pre-Made ${title}`}
                                        </p>
                                        <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">
                                            {documentData.fileSize || 'Vault Hosted Asset'} • Secure Document
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <a
                                        href={pdfBlobUrl || documentData.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-9 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center border border-white/10"
                                    >
                                        Open Original
                                    </a>
                                </div>
                            </div>

                            {/* Enhanced Iframe Viewer */}
                            <div className="w-full aspect-[1/1.4] sm:aspect-auto sm:h-[800px] bg-[#1a1a1a] relative flex items-center justify-center">
                                {!pdfViewerFailed ? (
                                    <iframe 
                                        src={pdfBlobUrl ? `${pdfBlobUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0` : `https://docs.google.com/gview?url=${encodeURIComponent(documentData.fileUrl)}&embedded=true`} 
                                        className="w-full h-full border-none"
                                        title={`${title} Document`}
                                        onError={(e) => {
                                            console.error("PDF Viewer error:", e);
                                            setPdfViewerFailed(true);
                                        }}
                                        onLoad={(e) => {
                                            console.log("PDF Viewer loaded");
                                        }}
                                    />
                                ) : (
                                    <div className="text-center p-8">
                                        <FileText size={48} className="mx-auto text-gray-600 mb-4" />
                                        <p className="text-sm font-bold text-gray-400 mb-4">The PDF could not be displayed securely inline.</p>
                                        <a 
                                            href={documentData.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-6 py-3 bg-neon-green text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-neon-green/90 transition-all inline-block"
                                        >
                                            View Original PDF
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Additional Content passed via children */}
                        {children}
                    </div>
                ) : (
                    /* Generated Document Viewer */
                    children
                )}
            </main>
        </div>
    );
}
