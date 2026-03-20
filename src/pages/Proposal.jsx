import React, { useRef, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Printer, ArrowLeft, Mail, MessageCircle, Share2, FileSpreadsheet, LayoutGrid } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';


const Proposal = () => {
    const { id } = useParams();
    const { proposals, loading } = useStore();
    const proposalRef = useRef(null);
    const printFrameRef = useRef(null);
    const [scale, setScale] = useState(1);

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
    const isAdmin = localStorage.getItem('adminAuth') === 'true';

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
        items: []
    };

    const handleDownloadPDF = async () => {
        if (!proposalRef.current) return;

        const originalScale = scale;
        setScale(1);
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageElements = document.querySelectorAll('.proposal-page-render');
            
            for (let i = 0; i < pageElements.length; i++) {
                const canvas = await html2canvas(pageElements[i], {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
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
        }
    };

    const handlePrint = async () => {
        const frame = printFrameRef.current;
        if (!frame) return;

        try {
            const originalScale = scale;
            setScale(1);
            await new Promise(resolve => setTimeout(resolve, 500));

            let printUrl;
            try {
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pageElements = document.querySelectorAll('.proposal-page-render');
                
                for (let i = 0; i < pageElements.length; i++) {
                    const canvas = await html2canvas(pageElements[i], {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        logging: false,
                        backgroundColor: '#F3F4F6',
                        onclone: (clonedDoc) => clonedDoc.fonts?.ready
                    });
                    
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    if (i > 0) pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, '', 'FAST');
                }

                const blob = pdf.output('blob');
                printUrl = URL.createObjectURL(blob);
            } finally {
                setScale(originalScale);
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
        
        return pages;
    };

    const paginatedPages = getPaginatedPages();

    return (
        <div className="min-h-screen pt-16 md:pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-black scroll-smooth">
            <iframe
                ref={printFrameRef}
                className="fixed -top-[1000px] left-0 pointer-events-none w-0 h-0"
                title="print-frame"
            />

            <div className="max-w-4xl mx-auto">
                <div className="mb-8 print:hidden flex justify-between items-center">
                    <Link to="/admin" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all mb-4">
                        <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO ADMIN DASHBOARD
                    </Link>
                    {!proposal && !loading && (
                        <span className="text-yellow-500 text-sm font-bold">Demo Mode / No Data</span>
                    )}
                </div>

                <div className="flex flex-col gap-8">
                    {/* TOP ACTIONS BAR */}
                    <Card className="p-3 sm:p-4 bg-white/5 border-white/10 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center print:hidden backdrop-blur-xl">
                        <div className="flex items-center justify-between sm:justify-start gap-4">
                            <h2 className="text-white font-bold flex items-center gap-2">
                                <FileSpreadsheet className="text-[#39FF14]" size={20} />
                                <span className="truncate max-w-[150px] sm:max-w-none">#{displayProposal.proposalNumber || displayProposal.id}</span>
                            </h2>
                            <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-blue-500/10 text-blue-500 border-blue-500/20">
                                {displayProposal.status || 'Active'}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:ml-auto">
                            {isAdmin && (
                                <>
                                    <Button variant="outline" size="sm" onClick={handleShareWhatsApp} title="Share on WhatsApp" className="flex-1 sm:flex-none">
                                        <MessageCircle size={16} />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleShareEmail} title="Share via Email" className="flex-1 sm:flex-none">
                                        <Mail size={16} />
                                    </Button>
                                </>
                            )}

                            <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden flex-1 sm:flex-none">
                                <Printer size={16} /> <span className="sm:inline hidden ml-2">Print</span>
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleDownloadPDF} className="bg-neon-green text-black hover:bg-neon-green/90 flex-[2] sm:flex-none font-bold uppercase text-[10px] tracking-widest">
                                <Download size={14} /> <span className="ml-2">Export</span>
                            </Button>
                        </div>
                    </Card>

                    {/* MAIN CONTENT AREA */}
                    <div className="print-container flex flex-col items-center bg-zinc-900/40 backdrop-blur-3xl p-2 sm:p-4 md:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar relative">
                        <div className="absolute top-6 right-6 z-20 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-widest text-[#39FF14]">Digital Archive</div>
                        
                        <div className="flex flex-col gap-8 py-8 origin-top" style={{ transform: `scale(${scale})`, marginBottom: `${(scale - 1) * 1123 * paginatedPages.length}px` }}>
                            {paginatedPages.map((pageItems, pageIdx) => {
                                const isLastPage = pageIdx === paginatedPages.length - 1;
                                const isFirstPage = pageIdx === 0;

                                return (
                                    <div
                                        key={pageIdx}
                                        className="proposal-page-render w-[794px] h-[1123px] bg-[#F3F4F6] text-black relative shadow-2xl shrink-0 p-[12mm] flex flex-col justify-between"
                                        style={{ fontFamily: "'Inter', sans-serif" }}
                                    >
                                        <div>
                                            {/* Header */}
                                            {isFirstPage ? (
                                                <div className="flex justify-between items-start mb-10 relative z-10">
                                                    <div className="flex items-center gap-4">
                                                        <img src="/logo_document.png" alt="Newbi Logo" className="w-[180px] object-contain" />
                                                    </div>
                                                    <div className="text-right">
                                                        <h2 className="text-4xl font-black text-gray-400 tracking-tighter uppercase mb-0">#{displayProposal.proposalNumber}</h2>
                                                        <div className="flex justify-end gap-4 mt-1">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">STRATEGIC PROPOSAL</p>
                                                            <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest leading-none">| {new Date(displayProposal.date || displayProposal.createdAt || Date.now()).toLocaleDateString('en-GB')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                                                    <img src="/logo_document.png" alt="Newbi Logo" className="w-[100px] object-contain opacity-50" />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Proposal #{displayProposal.proposalNumber} — Page {pageIdx + 1}</p>
                                                </div>
                                            )}

                                            {/* Info Blocks - Only on Page 1 */}
                                            {isFirstPage && (
                                                <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
                                                    <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                        <div className="bg-[#39FF14]/40 px-6 py-2">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">PREPARED BY</h4>
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
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">PREPARED FOR</h4>
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
                                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-black">EXECUTIVE OVERVIEW</h3>
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
                                                                <th className="py-3 px-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-black/5">DELIVERABLE DESCRIPTION</th>
                                                                <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">QTY</th>
                                                                <th className="py-3 px-6 text-right text-[10px] font-black uppercase tracking-widest">INVESTMENT</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                            {pageItems.map((item, idx) => (
                                                                <tr key={idx} className="bg-white/10">
                                                                    <td className="py-5 px-6 text-[11px] font-bold uppercase border-r border-dashed border-gray-200 leading-relaxed font-heading italic">
                                                                        {item.description || "STRATEGIC DELIVERABLE"}
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

                                                {/* Totals Section & Left Details - Only on Last Page */}
                                                {isLastPage && (
                                                    <div className="mt-12 flex justify-between items-stretch gap-12 min-h-[400px]">
                                                        <div className="flex-1 flex flex-col justify-end">
                                                            <div className="space-y-6">
                                                                <div className="bg-white/20 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                                    <div className="bg-[#39FF14]/40 px-4 py-1.5 border-b border-black/10">
                                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black">TERMS & CONDITIONS</h4>
                                                                    </div>
                                                                    <div className="p-4">
                                                                        <p className="text-[9px] font-bold leading-relaxed text-gray-500 whitespace-pre-line tracking-wide">
                                                                            {displayProposal.terms || "Standard terms apply."}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-row items-end gap-6 pt-4">
                                                                    {displayProposal.showPaymentDetails && displayProposal.paymentDetails && (
                                                                        <div className="inline-block p-6 border-2 border-dashed border-gray-300 rounded-[2rem] text-[10px] font-bold text-left uppercase leading-relaxed text-gray-500 bg-white/40 shadow-sm shrink-0">
                                                                            <p className="text-xs font-black text-black mb-3 border-b-2 border-[#39FF14] pb-1.5 inline-block">PAYMENT DETAILS</p>
                                                                            <div className="whitespace-pre-line tracking-wide">
                                                                                {displayProposal.paymentDetails}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {displayProposal.showUPI && displayProposal.upiId && (
                                                                        <div className="bg-white p-3 rounded-2xl border border-gray-200 inline-block shadow-sm shrink-0 mb-4">
                                                                            <img 
                                                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${displayProposal.upiId}&pn=NEWBI&am=${toBePaid}&cu=INR`)}`} 
                                                                                alt="Payment QR" 
                                                                                className="w-[100px] h-[100px] grayscale contrast-125 mx-auto"
                                                                            />
                                                                            <p className="text-[8px] font-black text-center mt-2 text-gray-400 tracking-widest uppercase italic font-bold">SCAN TO PAY</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="w-[45%] flex flex-col justify-end items-end shrink-0 py-4">
                                                            <div className="w-full space-y-3">
                                                                <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                    <span>SUBTOTAL</span>
                                                                    <span className="text-black text-xs font-bold font-heading italic">₹{subtotal.toLocaleString()}</span>
                                                                </div>
                                                                {displayProposal.showGst && (
                                                                    <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px) font-black text-gray-400 uppercase tracking-widest">
                                                                        <span>GST ({displayProposal.gstPercentage || 18}%)</span>
                                                                        <span className="text-black text-xs font-bold font-heading italic">₹{gstAmount.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between items-center py-3 bg-[#39FF14]/40 px-4 text-black border border-black/5 mt-2 rounded-xl transition-transform hover:scale-[1.02]">
                                                                    <span className="text-[10px] font-black uppercase italic">TOTAL INVESTMENT</span>
                                                                    <span className="text-xl font-black italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                                                </div>
                                                                {displayProposal.showAdvance !== false && (
                                                                    <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                                                        <span>ADVANCE PAID</span>
                                                                        <span className="text-black text-xs font-bold font-heading italic">₹{advancePaid.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between items-center py-4 bg-[#39FF14]/40 px-6 text-black border border-black/10 rounded-2xl shadow-xl mt-4 transition-transform hover:scale-[1.02]">
                                                                    <span className="text-[12px] font-black uppercase italic">BALANCE DUE</span>
                                                                    <span className="text-3xl font-black italic tracking-tighter">₹{toBePaid.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer and Signatory */}
                                            <div className="space-y-6 mt-auto">
                                                {isLastPage && (
                                                    <div className="flex flex-col items-end mt-4 px-2">
                                                        <div className="flex flex-col items-end bg-white/50 p-4 rounded-2xl border border-gray-200 shadow-sm min-w-[200px]">
                                                            {displayProposal.showSignatory === 'image' && displayProposal.signatoryImage ? (
                                                                <img src={displayProposal.signatoryImage} alt="Signature" className="h-16 mb-2 object-contain grayscale mix-blend-multiply" />
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
                                                )}

                                                {displayProposal.showFooter !== false && (
                                                    <footer className="relative h-12 flex items-center justify-between px-8 overflow-hidden rounded-full border border-white/20 shadow-lg">
                                                        <div className="absolute inset-0 bg-[#39FF14]/40" />
                                                        <div className="relative z-10 flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">WEB</span>
                                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-black">NEWBI.LIVE</p>
                                                            </div>
                                                            <div className="flex items-center gap-8">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">EMAIL</span>
                                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-black">marketing@newbi.live</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 border-l border-black/20 pl-8">
                                                                    <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">CALL</span>
                                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-black">+91 93043 72773</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </footer>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Proposal;
