import React, { useRef, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Printer, CheckCircle, ArrowLeft, Share2, Mail, MessageCircle, FileText, Check, PenTool, Settings, LogOut, LayoutGrid } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import NotificationBell from '../components/NotificationBell';


const Proposal = () => {
    const { id } = useParams();
    const { proposals, updateProposalStatus, loading, user } = useStore();
    const proposalRef = useRef(null);
    const printFrameRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [signatureName, setSignatureName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 850) {
                const newScale = (window.innerWidth - 32) / 794;
                setScale(newScale);
            } else {
                setScale(1);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const proposal = proposals.find(p => p.id === id);
    const isAdmin = (localStorage.getItem('adminAuth') === 'true') || (user?.role === 'super_admin' || user?.role === 'developer');

    useEffect(() => {
        if (proposal && !isAdmin) {
            // Update last opened timestamp for non-admins
            const updateLastOpened = async () => {
                try {
                    await useStore.getState().updateProposal(id, { 
                        lastOpened: new Date().toISOString() 
                    });
                } catch (err) {
                    console.error("Analytics error:", err);
                }
            };
            updateLastOpened();
        }
    }, [id, isAdmin]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020202] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-green"></div>
            </div>
        );
    }

    // Derived display data
    const displayProposal = proposal || {
        id: "DEMO-PROP-001",
        proposalNumber: "DEMO-001",
        clientName: "Demo Client",
        status: "Demo Mode",
        advancePaid: 0,
        items: [],
        overview: "This is a demonstration proposal representing the high-quality strategic documentation provided by Newbi Entertainment."
    };

    const handleDownloadPDF = async () => {
        if (!proposalRef.current) return;

        const originalScale = scale;
        setScale(1);
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageElements = document.querySelectorAll('.proposal-page-render');
            
            for (let i = 0; i < pageElements.length; i++) {
                const canvas = await html2canvas(pageElements[i], {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#F3F4F6',
                    onclone: (clonedDoc) => clonedDoc.fonts?.ready
                });
                
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, '', 'FAST');
            }
            
            pdf.save(`Proposal-${displayProposal.proposalNumber || displayProposal.id}.pdf`);
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setScale(originalScale);
            setIsExporting(false);
        }
    };

    const handlePrint = async () => {
        const frame = printFrameRef.current;
        if (!frame) return;

        try {
            const originalScale = scale;
            setScale(1);
            setIsExporting(true);
            await new Promise(resolve => setTimeout(resolve, 1500));

            let printUrl;
            try {
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pageElements = document.querySelectorAll('.proposal-page-render');
                
                for (let i = 0; i < pageElements.length; i++) {
                    const canvas = await html2canvas(pageElements[i], {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#F3F4F6',
                        width: 794,
                        height: 1123,
                        windowWidth: 794,
                        windowHeight: 1123,
                        scrollX: 0,
                        scrollY: 0,
                        onclone: (clonedDoc) => {
                            const style = clonedDoc.createElement('style');
                            style.innerHTML = `
                                * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                                .proposal-page-render { 
                                    position: absolute !important; 
                                    top: 0 !important; 
                                    left: 0 !important; 
                                    margin: 0 !important; 
                                    transform: none !important;
                                    box-shadow: none !important;
                                    text-rendering: optimizeLegibility !important;
                                    -webkit-font-smoothing: antialiased !important;
                                }
                            `;
                            clonedDoc.head.appendChild(style);
                            
                            clonedDoc.body.style.margin = '0';
                            clonedDoc.body.style.padding = '0';
                            clonedDoc.body.style.overflow = 'hidden';
                        }
                    });
                    
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    if (i > 0) pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, '', 'FAST');
                }

                const blob = pdf.output('blob');
                printUrl = URL.createObjectURL(blob);
            } finally {
                setScale(originalScale);
                setIsExporting(false);
            }

            // Load into iframe and print
            frame.src = printUrl;
            frame.onload = () => {
                setTimeout(() => {
                    try {
                        frame.contentWindow.focus();
                        frame.contentWindow.print();
                        URL.revokeObjectURL(printUrl);
                    } catch (e) {
                        console.error("Iframe print error:", e);
                        window.open(printUrl, '_blank').print();
                    }
                }, 500);
            };
        } catch (error) {
            console.error("Print failed:", error);
            alert("Failed to prepare for printing.");
        }
    };

    const handleMarkAccepted = async () => {
        try {
            await updateProposalStatus(id, 'Accepted');
            alert('Proposal marked as Accepted!');
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleApproveProposal = async () => {
        if (!signatureName.trim()) {
            alert('Please enter your name to sign the proposal.');
            return;
        }
        
        setIsSubmitting(true);
        try {
            await updateProposalStatus(id, 'Accepted');
            // We can also save the signature metadata
            const profile = proposals.find(p => p.id === id);
            await useStore.getState().updateProposal(id, {
                ...profile,
                status: 'Accepted',
                approvalMetadata: {
                    signedBy: signatureName,
                    signedAt: new Date().toISOString(),
                    ip: 'Client Action'
                }
            });
            alert('Proposal signed and approved successfully!');
        } catch (error) {
            console.error('Error approving proposal:', error);
            alert('Failed to approve proposal.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShareWhatsApp = () => {
        const text = `Here is your proposal from Newbi Entertainment: ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareEmail = () => {
        const subject = `Proposal #${displayProposal.proposalNumber || displayProposal.id} from Newbi Entertainment`;
        const body = `Hi,\n\nPlease find your proposal here: ${window.location.href}\n\nThanks,\nNewbi Entertainment`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };

    const items = displayProposal.items || [];
    const subtotal = items.reduce((sum, item) => sum + ((item.qty || 1) * (item.price || 0)), 0);
    const gstAmount = displayProposal?.showGst ? (subtotal * (displayProposal.gstPercentage || 18)) / 100 : 0;
    const totalAmount = subtotal + gstAmount;
    const advancePaid = Number(displayProposal.advancePaid) || 0;
    const toBePaid = totalAmount - advancePaid;

    // Pagination Logic
    const ROWS_PER_PAGE_P1 = 12;
    const ROWS_PER_PAGE_NEXT = 20;

    const getPaginatedPages = () => {
        const pages = [];
        let itemsRemaining = [...items];
        
        // Page 1
        pages.push(itemsRemaining.splice(0, ROWS_PER_PAGE_P1));
        
        // Subsequent pages
        while (itemsRemaining.length > 0) {
            pages.push(itemsRemaining.splice(0, ROWS_PER_PAGE_NEXT));
        }
        
        // If no items, still need one page
        if (pages.length === 0) pages.push([]);

        // ALWAYS add a dedicated last page for Terms, Totals, and Signature/Agreement
        pages.push(['_AGREEMENT_PAGE_']);
        
        return pages;
    };

    const paginatedPages = getPaginatedPages();

    return (
        <div className="min-h-screen bg-[#050505] scroll-smooth min-w-fit overflow-x-hidden">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .fixed-header-nav, .print-hidden { display: none !important; }
                    body { background: white !important; }
                    .proposal-page-render { 
                        margin: 0 !important; 
                        box-shadow: none !important;
                        page-break-after: always !important;
                    }
                    main { padding: 0 !important; margin: 0 !important; }
                }
            `}} />
            <iframe
                ref={printFrameRef}
                className="fixed -top-[1000px] left-0 pointer-events-none w-0 h-0"
                title="print-frame"
            />

            {/* FIXED HEADER NAVIGATION */}
            {!isExporting && (
                <header data-html2canvas-ignore="true" className="fixed-header-nav fixed top-0 left-0 right-0 z-[100] bg-black/60 backdrop-blur-2xl border-b border-white/10 print:hidden px-4 md:px-8 h-20 md:h-24 flex items-center">
                    <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between gap-4">
                        {/* Left: Back Navigation & Logo */}
                        <div className="flex items-center gap-4">
                            <Link to={isAdmin ? "/admin/proposals" : "/"} className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all">
                                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                                <span className="hidden sm:inline">{isAdmin ? 'ADMIN VAULT' : 'BACK TO HOME'}</span>
                            </Link>
                            <div className="h-8 w-[1px] bg-white/10" />
                            <img src="/logo_document.png" alt="Logo" className="h-8 md:h-10 object-contain hidden xs:block" crossOrigin="anonymous" />
                            <div className="h-8 w-[1px] bg-white/10 hidden md:block" />
                            <div className="hidden md:flex flex-col">
                                <span className="text-[10px] font-black text-neon-blue uppercase tracking-widest leading-none mb-1">
                                    {displayProposal.proposalNumber || 'NEWBI-PRP'}
                                </span>
                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                                    OFFICIAL DOCUMENT
                                </span>
                            </div>
                        </div>

                        {/* Center: Status (Compact) */}
                        <div className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border flex items-center gap-2 transition-all",
                            displayProposal.status === 'Accepted' 
                                ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                        )}>
                            <div className={cn("w-2 h-2 rounded-full animate-pulse", displayProposal.status === 'Accepted' ? "bg-green-500" : "bg-yellow-500")} />
                            {displayProposal.status || 'Active'}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <div className="hidden lg:flex items-center bg-white/[0.03] backdrop-blur-2xl rounded-full border border-white/10 px-4 h-12 gap-3 mr-2 shadow-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    
                                    <Link to="/admin" className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all relative z-10" title="Admin Dashboard">
                                        <LayoutGrid size={14} />
                                    </Link>

                                    <div className="h-4 w-px bg-white/10 relative z-10" />

                                    <Link to="/admin/site-settings" className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all relative z-10" title="Site Settings">
                                        <Settings size={14} />
                                    </Link>
                                    
                                    <div className="relative z-10">
                                        <NotificationBell />
                                    </div>
                                    
                                    <div className="h-4 w-px bg-white/10 relative z-10" />
                                    
                                    <div className="flex items-center gap-2 pr-1 relative z-10">
                                        <div className="w-7 h-7 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center shrink-0">
                                            <span className="text-neon-blue font-black text-[10px] uppercase">
                                                {user?.displayName ? user.displayName.charAt(0) : 'A'}
                                            </span>
                                        </div>
                                        <div className="text-left flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-white leading-none capitalize tracking-tight">
                                                {user?.displayName?.split(' ')[0] || 'Admin'}
                                            </span>
                                            <span className="text-[7px] text-neon-blue uppercase tracking-[0.2em] font-black mt-0.5">
                                                {user?.role === 'developer' ? 'Dev' : 'Admin'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => useStore.getState().logout()}
                                        className="p-1.5 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all relative z-10"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                </div>
                            )}

                            {isAdmin && (
                                <div className="flex items-center gap-1 md:gap-2 mr-1">
                                    <button onClick={handleShareWhatsApp} className="p-2 md:p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all hidden md:flex"><MessageCircle size={18} /></button>
                                    <button onClick={handleShareEmail} className="p-2 md:p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all hidden md:flex"><Mail size={18} /></button>
                                    {displayProposal.status !== 'Accepted' && (
                                        <button 
                                            onClick={handleMarkAccepted} 
                                            className="px-3 md:px-5 py-2 md:py-2.5 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] bg-neon-green text-black hover:bg-white rounded-xl transition-all shadow-[0_10px_20px_rgba(57,255,20,0.3)] border border-neon-green"
                                        >
                                            Mark as Accepted
                                        </button>
                                    )}
                                </div>
                            )}
                            <button onClick={handlePrint} className="p-2 md:p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all" title="Print"><Printer size={18} /></button>
                            <Button 
                                variant="primary" 
                                onClick={handleDownloadPDF} 
                                className="bg-neon-blue text-black hover:bg-neon-blue/90 h-10 md:h-12 px-4 md:px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[0_10px_20_rgba(56,182,255,0.2)] ml-2"
                            >
                                <Download size={16} className="md:mr-2" /><span className="hidden sm:inline">Export PDF</span>
                            </Button>
                        </div>
                    </div>
                </header>
            )}

            {/* MAIN CONTENT AREA */}
            <main className="relative z-10 pt-32 pb-32 px-4 flex flex-col items-center">
                {!proposal && !loading && (
                    <div className="mb-8 px-6 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        Demo Mode / Visual Preview Only
                    </div>
                )}

                <div className="w-full flex flex-col items-center overflow-x-auto custom-scrollbar pb-12">
                    <div className="relative group bg-zinc-900/40 backdrop-blur-3xl p-4 md:p-12 rounded-[3.5rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex flex-col items-center min-w-fit">
                        <div className="absolute top-8 right-12 z-20 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-widest text-neon-green">Digital Archive</div>
                        
                        <div ref={proposalRef} className="flex flex-col gap-12 origin-top" style={{ transform: `scale(${scale})`, marginBottom: `${(scale - 1) * 1123 * paginatedPages.length}px` }}>
                            {paginatedPages.map((pageItems, pageIdx) => {
                                const isAgreementPage = pageItems[0] === '_AGREEMENT_PAGE_';
                                const isFirstPage = pageIdx === 0;
                                const isItemPage = !isAgreementPage;

                                return (
                                    <div
                                        key={pageIdx}
                                        className="proposal-page-render w-[794px] h-[1123px] bg-[#F3F4F6] text-black relative shadow-2xl shrink-0 p-[12mm] flex flex-col justify-between"
                                        style={{ fontFamily: "'Inter', sans-serif" }}
                                    >
                                        <div className="pb-64 relative z-10 h-full flex flex-col">
                                            {/* Header */}
                                            {isFirstPage ? (
                                                <div className="flex justify-between items-start mb-10 relative z-10">
                                                    <div className="flex items-center gap-4">
                                                        <img src="/logo_document.png" alt="Newbi Logo" className="w-[180px] object-contain" crossOrigin="anonymous" />
                                                    </div>
                                                    <div className="text-right">
                                                        <h2 className="text-4xl font-black text-gray-400 tracking-tighter uppercase mb-0">#{displayProposal.proposalNumber}</h2>
                                                        <div className="flex justify-end gap-4 mt-1">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Strategic Proposal</p>
                                                            <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest leading-none">| {new Date(displayProposal.date || displayProposal.createdAt || Date.now()).toLocaleDateString('en-GB')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                                                    <img src="/logo_document.png" alt="Newbi Logo" className="w-[100px] object-contain opacity-50" crossOrigin="anonymous" />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Proposal #{displayProposal.proposalNumber} — {isAgreementPage ? 'Agreement Page' : `Page ${pageIdx + 1}`}</p>
                                                </div>
                                            )}

                                            {/* CONTENT AREA */}
                                            <div className="flex-1">
                                                {isItemPage ? (
                                                    <>
                                                        {/* Info Blocks - Only on Page 1 */}
                                                        {isFirstPage && (
                                                            <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
                                                                <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                                    <div className="bg-[#39FF14]/40 px-6 py-2">
                                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Prepared by</h4>
                                                                    </div>
                                                                    <div className="p-6 space-y-2">
                                                                        <p className="text-xl font-bold">{displayProposal.senderName || 'Newbi Entertainment'}</p>
                                                                        <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                                            <p>Contact: {displayProposal.senderContact || '+91 93043 72773'}</p>
                                                                            <p>Email: {displayProposal.senderEmail || 'partnership@newbi.live'}</p>
                                                                            {displayProposal.senderPan && <p>PAN: {displayProposal.senderPan}</p>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                                    <div className="bg-[#39FF14]/40 px-6 py-2">
                                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Prepared for</h4>
                                                                    </div>
                                                                    <div className="p-6 space-y-2">
                                                                        <p className="text-xl font-bold uppercase">{displayProposal.clientName || 'CLIENT NAME'}</p>
                                                                        <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                                            {displayProposal.clientAddress && <p className="whitespace-pre-line">{displayProposal.clientAddress}</p>}
                                                                            {displayProposal.clientGst && <p className="mt-1 pt-1 border-t border-gray-200 inline-block">GST: {displayProposal.clientGst}</p>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Strategy Section - Only on Page 1 */}
                                                        {isFirstPage && displayProposal.overview && (
                                                            <div className="mb-8 relative z-10">
                                                                <div className="bg-white/30 rounded-2xl border border-gray-200 overflow-hidden">
                                                                    <div className="bg-[#39FF14]/40 px-6 py-2">
                                                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-black">Executive overview</h3>
                                                                    </div>
                                                                    <div className="p-6">
                                                                        <p className="text-xs font-medium leading-relaxed text-gray-700 whitespace-pre-line text-justify">
                                                                            {displayProposal.overview}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Table */}
                                                        <div className="mb-8 relative z-10">
                                                            <div className={cn("overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white/20", !isFirstPage && "mt-4")}>
                                                                <table className="w-full text-left">
                                                                    <thead>
                                                                        <tr className="bg-[#39FF14]/40 text-black">
                                                                            <th className="py-3 px-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-black/5">Deliverable description</th>
                                                                            <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">Qty</th>
                                                                            <th className="py-3 px-6 text-right text-[10px] font-black uppercase tracking-widest">Investment</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-200">
                                                                        {pageItems.map((item, idx) => (
                                                                            <tr key={idx} className="bg-white/10">
                                                                                <td className="py-5 px-6 text-[11px] font-bold uppercase border-r border-dashed border-gray-200 leading-relaxed font-heading italic">
                                                                                    {item.description || "Strategic deliverable"}
                                                                                </td>
                                                                                <td className="py-5 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed">
                                                                                    {item.qty || 1}
                                                                                </td>
                                                                                <td className="py-5 px-6 text-right text-[11px] font-black leading-relaxed">
                                                                                    ₹{((item.qty || 1) * (item.price || 0)).toLocaleString()}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    /* AGREEMENT PAGE CONTENT */
                                                    <div className="space-y-4 flex-1 flex flex-col pt-8">
                                                        <div className="text-center mb-8">
                                                            <h3 className="text-2xl font-black uppercase tracking-tighter italic border-b-4 border-neon-green inline-block pb-1">Final Authorization</h3>
                                                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-4">Terms, Investment Summary & Digital Seal</p>
                                                        </div>

                                                        {/* Layout Elements for Last Page */}
                                                        <div className="space-y-4">
                                                            {(displayProposal.layoutOrder || ['terms_totals', 'payment_qr', 'signatory']).map((item) => {
                                                                const sectionId = typeof item === 'string' ? item : item.id;
                                                                const x = item.x || 0;
                                                                const y = item.y || 0;
                                                                const s = item.scale || 1;
                                                                const style = { transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: 'top left' };

                                                                if (sectionId === 'terms_totals') {
                                                                    return (
                                                                        <div key="terms_totals" className="flex justify-between items-stretch gap-6" style={style}>
                                                                            <div className="flex-1">
                                                                                <div className="space-y-6">
                                                                                    <div className="bg-white/20 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                                                        <div className="bg-[#39FF14]/40 px-4 py-1.5 border-b border-black/10">
                                                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Terms & Conditions</h4>
                                                                                        </div>
                                                                                        <div className="p-4">
                                                                                            <p className="text-[9px] font-bold leading-relaxed text-gray-500 whitespace-pre-line tracking-wide">
                                                                                                {displayProposal.terms || "Standard terms apply."}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="w-[45%] shrink-0 py-4">
                                                                                <div className="w-full space-y-3">
                                                                                    <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                                        <span>Subtotal</span>
                                                                                        <span className="text-black text-xs font-bold font-heading italic">₹{subtotal.toLocaleString()}</span>
                                                                                    </div>
                                                                                    {displayProposal.showGst && (
                                                                                        <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                                            <span>GST ({displayProposal.gstPercentage || 18}%)</span>
                                                                                            <span className="text-black text-xs font-bold font-heading italic">₹{gstAmount.toLocaleString()}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="flex justify-between items-center py-3 bg-[#39FF14]/40 px-4 text-black border border-black/5 mt-2 rounded-xl">
                                                                                        <span className="text-[10px] font-black uppercase italic">Total investment</span>
                                                                                        <span className="text-xl font-black italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                                                                    </div>
                                                                                    {displayProposal.showAdvance !== false && (
                                                                                        <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                                                                            <span>Advance Paid</span>
                                                                                            <span className="text-black text-xs font-bold font-heading italic">₹{advancePaid.toLocaleString()}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="flex justify-between items-center py-4 bg-[#39FF14]/40 px-6 text-black border border-black/10 rounded-2xl shadow-xl mt-4">
                                                                                        <span className="text-[12px] font-black uppercase italic">Balance Due</span>
                                                                                        <span className="text-3xl font-black italic tracking-tighter">₹{toBePaid.toLocaleString()}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                if (sectionId === 'payment_qr') {
                                                                    return (displayProposal.showPaymentDetails || (displayProposal.showUPI && displayProposal.upiId)) && (
                                                                        <div key="payment_qr" className="flex flex-row items-end gap-6 pt-4" style={style}>
                                                                            {displayProposal.showPaymentDetails && displayProposal.paymentDetails && (
                                                                                <div className="inline-block p-6 border-2 border-dashed border-gray-300 rounded-[2rem] text-[10px] font-bold text-left uppercase leading-relaxed text-gray-500 bg-white/40 shadow-sm shrink-0">
                                                                                    <p className="text-xs font-black text-black mb-3 border-b-2 border-[#39FF14] pb-1.5 inline-block">Payment Details</p>
                                                                                    <div className="whitespace-pre-line tracking-wide">
                                                                                        {displayProposal.paymentDetails}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {displayProposal.showUPI && displayProposal.upiId && (
                                                                                <div className="bg-white p-3 rounded-2xl border border-gray-200 inline-block shadow-sm shrink-0 mb-4 ml-auto">
                                                                                    <img 
                                                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${displayProposal.upiId}&pn=NEWBI&am=${toBePaid}&cu=INR`)}`} 
                                                                                        alt="Payment QR" 
                                                                                        className="w-[100px] h-[100px] grayscale contrast-125 mx-auto"
                                                                                        crossOrigin="anonymous"
                                                                                    />
                                                                                    <p className="text-[8px] font-black text-center mt-2 text-gray-400 tracking-widest uppercase italic font-bold">Scan to pay</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }

                                                                if (sectionId === 'signatory') {
                                                                    return displayProposal.showSignatureBlock !== false && (
                                                                        <div key="signatory" className="flex flex-col items-end mt-4 px-2" style={style}>
                                                                            <div className="flex flex-col items-end">
                                                                                {displayProposal.showSignatory === 'image' && displayProposal.signatoryImage ? (
                                                                                    <img src={displayProposal.signatoryImage} alt="Signature" className="h-16 mb-2 object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                                                ) : displayProposal.showSignatory === 'text' ? (
                                                                                    <div className="h-16 flex items-end justify-center">
                                                                                        <p className="font-heading italic text-lg leading-none border-b border-gray-400 pb-1 px-4">{displayProposal.senderName || 'Authorized Signatory'}</p>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="h-16" />
                                                                                )}
                                                                                {displayProposal.showSignatory !== 'none' && (
                                                                                    <div className="w-40 pt-3 border-t-2 border-dashed border-gray-400 text-center">
                                                                                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-700 italic font-bold">Authorized Signature</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                return null;
                                                            })}
                                                        </div>

                                                        {/* Approval/Signature Block */}
                                                        {displayProposal.showSignatureBlock !== false && (
                                                            <div className="mt-4 p-6 md:p-8 rounded-[2.5rem] border-2 border-dashed border-gray-300 bg-white/40 shadow-inner relative overflow-hidden">
                                                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                                                    <PenTool size={120} />
                                                                </div>
                                                                <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10">
                                                                    <div className="flex-1 w-full text-center md:text-left">
                                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center justify-center md:justify-start gap-2">
                                                                            <PenTool size={12} className="text-neon-green" /> Client Acceptance Agreement
                                                                        </h4>
                                                                        
                                                                        {displayProposal.status === 'Accepted' || displayProposal.approvalMetadata ? (
                                                                            <div className="space-y-3">
                                                                                <p className="text-4xl font-signature text-neon-blue italic">
                                                                                    {displayProposal.approvalMetadata?.signedBy || 'Electronically Signed'}
                                                                                </p>
                                                                                <div className="h-0.5 bg-gray-300 w-full max-w-sm mx-auto md:mx-0 opacity-50" />
                                                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">
                                                                                    Validated On {displayProposal.approvalMetadata?.signedAt ? new Date(displayProposal.approvalMetadata.signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString()}
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="space-y-4 print-hidden">
                                                                                <div className="relative group">
                                                                                    <input 
                                                                                        type="text"
                                                                                        value={signatureName}
                                                                                        onChange={(e) => setSignatureName(e.target.value)}
                                                                                        placeholder="TYPE FULL NAME TO SIGN"
                                                                                        className="w-full bg-transparent border-b-2 border-gray-300 pb-3 text-2xl font-signature focus:border-neon-green outline-none transition-all placeholder:text-gray-300 placeholder:font-sans placeholder:text-[10px] placeholder:tracking-[0.4em] text-center md:text-left"
                                                                                    />
                                                                                    <div className="absolute bottom-0 left-0 h-[2px] bg-neon-green w-0 group-focus-within:w-full transition-all duration-700" />
                                                                                </div>
                                                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed max-w-xs mx-auto md:mx-0">
                                                                                    Electronic signature holds legal compliance under the Information Technology Act.
                                                                                </p>
                                                                                {!isAdmin && (
                                                                                    <button 
                                                                                        onClick={handleApproveProposal}
                                                                                        disabled={isSubmitting}
                                                                                        className="mt-4 px-10 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-neon-green hover:text-black transition-all flex items-center justify-center gap-4 shadow-2xl disabled:opacity-50 active:scale-95 mx-auto md:mx-0"
                                                                                    >
                                                                                        {isSubmitting ? 'Securing...' : (
                                                                                            <>
                                                                                                <Check size={14} /> DIGITALLY SIGN
                                                                                            </>
                                                                                        )}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="text-center shrink-0">
                                                                        <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-[2rem] flex items-center justify-center bg-white shadow-xl mb-2 p-3">
                                                                            <img src="/logo_document.png" alt="Seal" className="w-full opacity-10 grayscale" crossOrigin="anonymous" />
                                                                        </div>
                                                                        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-gray-400">Official Seal</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer Pill */}
                                            {displayProposal.showFooter !== false && (
                                                <footer 
                                                    className="absolute bottom-2 left-10 right-10 h-12 flex items-center justify-between px-10 overflow-hidden rounded-full border border-black/5 shadow-xl backdrop-blur-md z-50"
                                                    style={{
                                                        transform: `translate(${(displayProposal.layoutOrder || []).find(i => (typeof i === 'object' ? i.id : i) === 'footer')?.x || 0}px, ${(displayProposal.layoutOrder || []).find(i => (typeof i === 'object' ? i.id : i) === 'footer')?.y || 0}px)`
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-[#39FF14]/40" />
                                                    <div className="relative z-10 flex items-center justify-between w-full text-black">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">CALL</span>
                                                            <p className="text-[10px] font-black tracking-widest uppercase">+91 93043 72773</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 border-x border-black/5 px-10 h-12">
                                                            <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">EMAIL</span>
                                                            <p className="text-[10px] font-black tracking-widest uppercase">partnership@newbi.live</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">WEB</span>
                                                            <p className="text-[10px] font-black tracking-widest uppercase">newbi.live</p>
                                                        </div>
                                                    </div>
                                                </footer>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Proposal;
