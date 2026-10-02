import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { embedProposalNumberInPdf } from '../../lib/pdfStampUtils';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Printer from 'lucide-react/dist/esm/icons/printer';
import Download from 'lucide-react/dist/esm/icons/download';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Clock from 'lucide-react/dist/esm/icons/clock';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';

// Safely render content that might be HTML (e.g. from rich text editor) or plain text
const renderSafeContent = (rawText) => {
    if (!rawText) return null;
    if (typeof rawText !== 'string') return rawText;

    const hasHtml = /<[a-z][\s\S]*>/i.test(rawText);

    if (hasHtml) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawText, 'text/html');
            // Remove any dangerous elements
            doc.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove());
            const cleanHtml = doc.body.innerHTML;
            return (
                <div 
                    className="leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-gray-900 dark:[&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: cleanHtml }}
                />
            );
        } catch (e) {
            const text = rawText
                .replace(/<[^>]+>/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ')
                .trim();
            return <p className="leading-relaxed whitespace-pre-line">{text}</p>;
        }
    }

    // Decode HTML entities if present without tags
    const decoded = rawText
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

    return <p className="leading-relaxed whitespace-pre-line">{decoded}</p>;
};

export default function SharedDocumentViewer({
    documentData = {},
    type = 'proposal', // 'proposal', 'invoice', 'agreement'
    isAdmin,
    isExporting,
    onShare,
    onDownloadPDF,
    onOpenAttachments,
    actionPanel,
    children
}) {
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [pdfViewerFailed, setPdfViewerFailed] = useState(false);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 850) {
                setScale((window.innerWidth - 32) / 850);
            } else {
                setScale(1);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        let isMounted = true;
        
        if (!documentData.fileUrl || (documentData.fileType !== 'pdf' && !documentData.fileUrl.toLowerCase().includes('.pdf') && !documentData.fileUrl.includes('/raw/upload/'))) {
            return;
        }

        const modifyAndServePdf = async () => {
            try {
                setIsLoadingPdf(true);
                const response = await fetch(documentData.fileUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                
                let finalBytes = arrayBuffer;

                const clientSig = documentData.clientSignature || documentData.approvalMetadata?.clientSignature;
                const ourSig = documentData.ourSignature || documentData.providerSignature;

                // For proposals, automatically remove old proposal numbers and embed the new proposal number on all pages
                if (type === 'proposal' && documentData.proposalNumber) {
                    try {
                        finalBytes = await embedProposalNumberInPdf(arrayBuffer, documentData.proposalNumber, {
                            clientSignature: clientSig,
                            ourSignature: ourSig,
                            clientName: documentData.clientName,
                            senderName: documentData.senderName || 'Newbi Entertainment & Marketing LLP',
                            signedBy: documentData.approvalMetadata?.signedBy || documentData.clientName,
                            signedAt: documentData.approvalMetadata?.signedAt,
                            ip: documentData.approvalMetadata?.ip,
                            isAccepted: documentData.status === 'Accepted'
                        });
                    } catch (stampErr) {
                        console.warn('Could not embed proposal number into PDF:', stampErr);
                    }
                } else if (clientSig || ourSig) {
                    try {
                        const pdfDoc = await PDFDocument.load(arrayBuffer);
                        const pages = pdfDoc.getPages();
                        
                        let sigImage = null;
                        if (clientSig && clientSig.startsWith('data:image')) {
                            try {
                                const base64Data = clientSig.split(',')[1];
                                const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                                sigImage = await pdfDoc.embedPng(imgBytes);
                            } catch (e) {
                                console.error("Could not embed client signature", e);
                            }
                        }
                        
                        let ourSigImage = null;
                        if (ourSig && ourSig.startsWith('data:image')) {
                            try {
                                const base64Data = ourSig.split(',')[1];
                                const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                                ourSigImage = await pdfDoc.embedPng(imgBytes);
                            } catch (e) {
                                console.error("Could not embed our signature", e);
                            }
                        }
                        
                        const targetPage = pages[pages.length - 1];
                        if (targetPage && (sigImage || ourSigImage)) {
                            const { width } = targetPage.getSize();
                            const helveticaFont = await pdfDoc.embedFont('Helvetica');

                            if (sigImage) {
                                targetPage.drawImage(sigImage, {
                                    x: 50,
                                    y: 50,
                                    width: 120,
                                    height: 60,
                                });
                                targetPage.drawText(documentData.clientName ? `${documentData.clientName} (Signed)` : "Client Signature", {
                                    x: 50,
                                    y: 35,
                                    size: 10,
                                    font: helveticaFont,
                                });
                            }

                            if (ourSigImage) {
                                targetPage.drawImage(ourSigImage, {
                                    x: width - 170,
                                    y: 50,
                                    width: 120,
                                    height: 60,
                                });
                                targetPage.drawText(documentData.senderName || "Newbi Entertainment", {
                                    x: width - 170,
                                    y: 35,
                                    size: 10,
                                    font: helveticaFont,
                                });
                            }
                        }

                        finalBytes = await pdfDoc.save();
                    } catch (stampErr) {
                        console.warn("Could not stamp signatures onto PDF, falling back to original PDF:", stampErr);
                    }
                }
                
                const blob = new Blob([finalBytes], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);
                
                if (isMounted) {
                    setPdfBlobUrl(blobUrl);
                    setIsLoadingPdf(false);
                }
            } catch (err) {
                console.error("Error creating PDF blob:", err);
                if (isMounted) {
                    setIsLoadingPdf(false);
                    // If fetch failed (e.g. offline/CORS), fallback to direct URL
                    setPdfBlobUrl(documentData.fileUrl);
                }
            }
        };

        modifyAndServePdf();

        return () => {
            isMounted = false;
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [
        documentData.fileUrl, 
        documentData.clientSignature, 
        documentData.ourSignature,
        documentData.status,
        documentData.approvalMetadata?.signedAt,
        documentData.approvalMetadata?.clientSignature,
        documentData.approvalMetadata?.signedBy
    ]);

    const rawTitle = type === 'invoice' 
        ? 'Tax Invoice' 
        : type === 'agreement' 
            ? 'Service Agreement' 
            : (documentData.campaignName || documentData.proposalName || 'Strategic Quotation & Proposal');
    const title = rawTitle.replace(/pre[- ]?made\s*(?:proposal|contract|agreement|document)?/gi, 'Strategic Proposal').trim() || 'Strategic Quotation & Proposal';
    const docNumber = type === 'invoice' ? documentData.invoiceNumber : type === 'agreement' ? documentData.agreementNumber : (documentData.proposalNumber || documentData.id);
    const backLink = isAdmin ? `/admin/${type}s` : "/";
    const status = documentData.status || 'DRAFT';
    const isAccepted = status === 'Accepted' || status === 'Paid' || status === 'Executed';
    const isRejected = status === 'Rejected' || status === 'Failed';
    
    // Dynamic color theme based on document type
    const theme = {
        proposal: {
            primary: '#39FF14',
            name: 'neon-green',
            text: 'text-neon-green',
            bg: 'bg-neon-green',
            bgSubtle: 'bg-neon-green/10',
            bgSubtleHover: 'hover:bg-neon-green/20',
            border: 'border-neon-green/30',
            borderSubtle: 'border-neon-green/20',
            selection: 'selection:bg-neon-green selection:text-black',
            dot: 'bg-neon-green',
            shadow: 'shadow-[0_10px_30px_rgba(57,255,20,0.25)]',
            hoverText: 'hover:text-neon-green',
            groupHoverText: 'group-hover:text-neon-green',
            groupHoverBorder: 'group-hover:border-neon-green/40',
            linkText: 'text-neon-green hover:underline',
            accentBar: 'bg-neon-green',
        },
        invoice: {
            primary: '#00D1FF',
            name: 'neon-blue',
            text: 'text-[#00D1FF]',
            bg: 'bg-[#00D1FF]',
            bgSubtle: 'bg-[#00D1FF]/10',
            bgSubtleHover: 'hover:bg-[#00D1FF]/20',
            border: 'border-[#00D1FF]/30',
            borderSubtle: 'border-[#00D1FF]/20',
            selection: 'selection:bg-[#00D1FF] selection:text-black',
            dot: 'bg-[#00D1FF]',
            shadow: 'shadow-[0_10px_30px_rgba(0,209,255,0.25)]',
            hoverText: 'hover:text-[#00D1FF]',
            groupHoverText: 'group-hover:text-[#00D1FF]',
            groupHoverBorder: 'group-hover:border-[#00D1FF]/40',
            linkText: 'text-[#00D1FF] hover:underline',
            accentBar: 'bg-[#00D1FF]',
        },
        agreement: {
            primary: '#A855F7',
            name: 'purple',
            text: 'text-[#A855F7]',
            bg: 'bg-[#A855F7]',
            bgSubtle: 'bg-[#A855F7]/10',
            bgSubtleHover: 'hover:bg-[#A855F7]/20',
            border: 'border-[#A855F7]/30',
            borderSubtle: 'border-[#A855F7]/20',
            selection: 'selection:bg-[#A855F7] selection:text-white',
            dot: 'bg-[#A855F7]',
            shadow: 'shadow-[0_10px_30px_rgba(168,85,247,0.25)]',
            hoverText: 'hover:text-[#A855F7]',
            groupHoverText: 'group-hover:text-[#A855F7]',
            groupHoverBorder: 'group-hover:border-[#A855F7]/40',
            linkText: 'text-[#A855F7] hover:underline',
            accentBar: 'bg-[#A855F7]',
        }
    }[type] || {
        primary: '#39FF14',
        name: 'neon-green',
        text: 'text-neon-green',
        bg: 'bg-neon-green',
        bgSubtle: 'bg-neon-green/10',
        bgSubtleHover: 'hover:bg-neon-green/20',
        border: 'border-neon-green/30',
        borderSubtle: 'border-neon-green/20',
        selection: 'selection:bg-neon-green selection:text-black',
        dot: 'bg-neon-green',
        shadow: 'shadow-[0_10px_30px_rgba(57,255,20,0.25)]',
        hoverText: 'hover:text-neon-green',
        groupHoverText: 'group-hover:text-neon-green',
        groupHoverBorder: 'group-hover:border-neon-green/40',
        linkText: 'text-neon-green hover:underline',
        accentBar: 'bg-neon-green',
    };

    // Status colors dynamically themed
    const statusColorClass = isAccepted 
        ? cn(theme.bgSubtle, theme.text, theme.border)
        : (isRejected 
            ? "bg-red-500/10 text-red-500 border-red-500/30" 
            : cn(theme.bgSubtle, theme.text, theme.borderSubtle));
    const statusDotClass = isAccepted ? theme.dot : cn(theme.dot, "animate-pulse");
    
    // Logo resolution
    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
        { id: 'media', label: 'Newbi Media', path: '/logo_media.png', color: '#00D1FF' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
    ];
    const currentLogo = logoOptions.find(l => l.id === documentData.selectedLogo) || logoOptions[0];

    const effectivePdfUrl = pdfBlobUrl || documentData.fileUrl;

    return (
        <div className={cn("min-h-screen bg-[#FAFAFA] dark:bg-[#050505] font-sans text-gray-900 dark:text-gray-100 flex flex-col lg:flex-row", theme.selection)}>
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300..700;1,300..700&display=swap');
                body { font-family: 'Outfit', sans-serif; }
                .font-signature { font-family: 'Caveat', cursive; }
                .font-formal { font-family: 'Crimson Pro', serif; }
                @media print {
                    .fixed-header-nav, .print-hidden { display: none !important; }
                    body { background: white !important; }
                    .proposal-page-render, .invoice-page-render, .agreement-page-render { 
                        margin: 0 !important; 
                        box-shadow: none !important; 
                        page-break-after: always !important; 
                    }
                }
            `}} />

            {/* Left Sidebar / Action Panel */}
            {!isExporting && (
                <aside className="print-hidden w-full lg:w-[400px] xl:w-[420px] shrink-0 bg-white dark:bg-[#0A0A0A] border-b lg:border-b-0 lg:border-r border-black/5 dark:border-white/5 flex flex-col h-auto lg:h-screen lg:sticky top-0 z-[100] shadow-[10px_0_40px_rgba(0,0,0,0.03)] dark:shadow-none">
                    
                    {/* Top Header inside Sidebar */}
                    <div className="h-20 px-6 lg:px-8 flex items-center justify-between border-b border-black/5 dark:border-white/5 shrink-0">
                        <Link to={backLink} className="flex items-center gap-3 text-[10px] font-black text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all uppercase tracking-widest">
                            <ArrowLeft size={16} /> 
                            <span>Back to {isAdmin ? 'Admin' : 'Dashboard'}</span>
                        </Link>
                        {onShare && (
                            <button onClick={onShare} className={cn("p-2 text-gray-400 transition-colors", theme.hoverText)} title="Share Document">
                                <Share2 size={18} />
                            </button>
                        )}
                    </div>

                    {/* Scrollable Sidebar Content */}
                    <div className="flex-1 overflow-y-auto p-6 lg:p-8 flex flex-col gap-6 custom-scrollbar">
                        
                        {/* Status & Amount */}
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={cn("px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border", statusColorClass)}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDotClass)} />
                                    {status}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock size={12} />
                                    {new Date(documentData.createdAt || documentData.invoiceDate || documentData.effectiveDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            
                            {(documentData.dealValue || documentData.totalOverride || documentData.amount || documentData.commercials?.totalValue || documentData.subtotal) && (
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Commercial Value</p>
                                    <h2 className="text-3xl lg:text-4xl font-black tracking-tighter" style={{ color: theme.primary }}>
                                        ₹{Number(documentData.dealValue || documentData.totalOverride || documentData.amount || documentData.commercials?.totalValue || documentData.subtotal || 0).toLocaleString('en-IN')}
                                    </h2>
                                </div>
                            )}
                        </div>

                        {/* Title & Document Meta */}
                        <div>
                            <h1 className="text-lg lg:text-xl font-black uppercase italic tracking-tight font-heading text-gray-900 dark:text-white leading-tight mb-2">
                                {title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={cn("text-[9px] font-black font-mono tracking-widest px-2.5 py-1 rounded-full border", theme.text, theme.bgSubtle, theme.borderSubtle)}>
                                    {docNumber}
                                </span>
                            </div>
                        </div>

                        {/* Entities Info */}
                        <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-4">
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Prepared For</p>
                                <p className="font-bold text-sm leading-tight text-gray-900 dark:text-white">{documentData.clientName || documentData.parties?.secondParty?.name || 'Client'}</p>
                                {(documentData.clientEmail || documentData.parties?.secondParty?.email) && (
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{documentData.clientEmail || documentData.parties?.secondParty?.email}</p>
                                )}
                            </div>
                            <div className="w-full h-px bg-black/5 dark:bg-white/5" />
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Prepared By</p>
                                <p className="font-bold text-sm leading-tight text-gray-900 dark:text-white">{documentData.senderName || documentData.parties?.firstParty?.name || 'Newbi Entertainment'}</p>
                                {(documentData.senderEmail || documentData.parties?.firstParty?.email) && (
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{documentData.senderEmail || documentData.parties?.firstParty?.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Attachments Note */}
                        {documentData.attachments && documentData.attachments.length > 0 && onOpenAttachments && (
                            <button onClick={onOpenAttachments} className="w-full p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-gray-500 transition-colors", theme.groupHoverText)}>
                                        <Paperclip size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Attachments</p>
                                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">{documentData.attachments.length} Files Included</p>
                                    </div>
                                </div>
                                <ArrowRight size={14} className={cn("text-gray-400 group-hover:translate-x-1 transition-all", theme.groupHoverText)} />
                            </button>
                        )}

                        {/* Executive Memo / Note if present */}
                        {(documentData.coverDescription || documentData.note) && (
                            <div className="p-4 bg-zinc-100 dark:bg-zinc-900/60 rounded-2xl relative overflow-hidden border border-black/5 dark:border-white/5">
                                <div className={cn("w-1 h-full absolute left-0 top-0", theme.accentBar)} />
                                <p className={cn("text-[8px] font-black uppercase tracking-[0.2em] mb-1.5", theme.text)}>{type === 'invoice' ? 'Invoice Note' : type === 'agreement' ? 'Instrument Notice' : 'Memorandum'}</p>
                                <div className="text-xs font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                                    {renderSafeContent(documentData.coverDescription || documentData.note)}
                                </div>
                            </div>
                        )}

                        {/* Action Panel (e.g. Signature, Status, Payment) */}
                        {actionPanel && (
                            <div className="flex flex-col gap-3">
                                {actionPanel}
                            </div>
                        )}

                        {/* Export / Print Actions */}
                        <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-black/5 dark:border-white/5">
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => {
                                    if (onDownloadPDF) {
                                        onDownloadPDF(pdfBlobUrl);
                                    } else if (documentData.isUploaded) {
                                        const a = document.createElement('a');
                                        a.href = pdfBlobUrl || documentData.fileUrl;
                                        a.download = documentData.fileName || `${documentData.clientName || 'Document'}.pdf`;
                                        a.target = '_blank';
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                    } else {
                                        window.print();
                                    }
                                }} disabled={isExporting} className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg">
                                    <Download size={14} /> {isExporting ? 'Exporting...' : 'Save PDF'}
                                </button>
                                <button onClick={() => {
                                    if (documentData.isUploaded && (effectivePdfUrl || documentData.fileUrl)) {
                                        window.open(effectivePdfUrl || documentData.fileUrl, '_blank');
                                    } else {
                                        window.print();
                                    }
                                }} className="w-full py-3.5 bg-black/5 dark:bg-white/5 text-gray-900 dark:text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-black/5 dark:border-white/5">
                                    <Printer size={14} /> Print
                                </button>
                            </div>
                        </div>

                    </div>
                </aside>
            )}

            {/* Document Viewer Area (Right Panel) */}
            <main className="flex-1 relative overflow-y-auto min-h-[500px] lg:h-screen bg-[#F3F4F6] dark:bg-[#0B0F17] flex items-start justify-center p-4 md:p-8 lg:p-12 custom-scrollbar">
                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle at center, black 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                
                <div className="w-full flex flex-col items-center pb-20 relative z-10">
                    {documentData.isUploaded && (documentData.fileUrl || pdfBlobUrl) ? (
                        <div className="proposal-page-render w-[794px] max-w-full h-[calc(100vh-6rem)] bg-white relative shadow-[0_60px_120px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col rounded-[2px]">
                            {isLoadingPdf ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-zinc-900 text-white">
                                    <RefreshCw size={28} className={cn("animate-spin", theme.text)} />
                                    <p className={cn("text-[10px] font-mono uppercase tracking-widest", theme.text)}>
                                        Rendering document preview...
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <iframe 
                                        key={effectivePdfUrl}
                                        src={effectivePdfUrl?.startsWith('blob:') 
                                            ? effectivePdfUrl 
                                            : (effectivePdfUrl?.includes('firebasestorage') || effectivePdfUrl?.endsWith('.pdf') 
                                                ? `${effectivePdfUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0` 
                                                : `https://docs.google.com/viewer?url=${encodeURIComponent(effectivePdfUrl || '')}&embedded=true`)}
                                        className="w-full h-full border-none bg-white"
                                        title=""
                                        onError={() => setPdfViewerFailed(true)}
                                    />
                                    {pdfViewerFailed && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-zinc-100 dark:bg-zinc-900">
                                            <AlertTriangle size={48} className="text-yellow-500 mb-4 opacity-50" />
                                            <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-2">Preview Unavailable</p>
                                            <p className="text-xs text-gray-500 mb-6 max-w-md">The document cannot be previewed natively inline.</p>
                                            <a href={documentData.fileUrl} target="_blank" rel="noopener noreferrer" className={cn("px-6 py-3 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all", theme.bg)}>
                                                Open Document in New Tab
                                            </a>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center">
                            {children}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
