import React, { useRef, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Printer, ArrowLeft, Mail, MessageCircle, Share2, FileSpreadsheet, LayoutGrid } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

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
        const element = proposalRef.current;
        if (!element) return;

        const originalScale = scale;
        setScale(1);
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#F3F4F6',
                logging: false,
                useCORS: true,
                allowTaint: true,
                onclone: (clonedDoc) => clonedDoc.fonts?.ready
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
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
            const element = proposalRef.current;
            if (!element) {
                alert("Proposal content not found.");
                return;
            }

            const originalScale = scale;
            setScale(1);
            await new Promise(resolve => setTimeout(resolve, 300));

            let printUrl;
            try {
                const canvas = await html2canvas(element, {
                    scale: 2,
                    backgroundColor: '#F3F4F6',
                    logging: false,
                    useCORS: true,
                    allowTaint: true,
                    onclone: (clonedDoc) => clonedDoc.fonts?.ready
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.9);
                const pdfWidth = 210;
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

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

    return (
        <div className="min-h-screen pt-16 md:pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-black scroll-smooth">
            <iframe
                ref={printFrameRef}
                className="fixed -top-[1000px] left-0 pointer-events-none w-0 h-0"
                title="print-frame"
            />

            <div className="max-w-4xl mx-auto">
                <div className="mb-8 print:hidden flex justify-between items-center">
                    <Link to="/admin/proposals" className="relative z-[60] inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest group">
                        <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO COMMAND CENTRE
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
                    <div className="print-container flex justify-center bg-zinc-900/40 backdrop-blur-3xl p-2 sm:p-4 md:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-6 right-6 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-widest text-[#39FF14]">Digital Archive</div>
                        <div
                            ref={proposalRef}
                            className="bg-[#F3F4F6] text-black shadow-2xl p-[12mm] flex flex-col justify-between"
                            style={{ 
                                width: '210mm', 
                                minHeight: '297mm',
                                fontFamily: "'Inter', sans-serif",
                                transform: `scale(${scale})`,
                                transformOrigin: 'top center',
                                marginBottom: `${(scale - 1) * 1123}px`
                            }}
                        >
                            <div>
                                {/* Header */}
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

                                {/* Info Blocks */}
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

                                {/* Strategy Section */}
                                {displayProposal.overview && (
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
                                    <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white/20">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-[#39FF14]/40 text-black">
                                                    <th className="py-3 px-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-black/5">DELIVERABLE DESCRIPTION</th>
                                                    <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">QTY</th>
                                                    <th className="py-3 px-6 text-right text-[10px] font-black uppercase tracking-widest">INVESTMENT</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {items.map((item, idx) => (
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
                                                <tr className="h-12 bg-white/5">
                                                    <td colSpan={3}></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals Section */}
                                    <div className="mt-8 flex justify-end">
                                        <div className="w-[50%] flex flex-col items-end">
                                            <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <span>Subtotal</span>
                                                <span className="text-black text-sm">₹{subtotal.toLocaleString()}</span>
                                            </div>
                                            {displayProposal.showGst && (
                                                <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <span>GST ({displayProposal.gstPercentage || 18}%)</span>
                                                    <span className="text-black text-sm">₹{gstAmount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="w-full flex justify-between items-center py-3 bg-[#39FF14]/40 px-4 text-black border border-black/5 mt-2 rounded-lg">
                                                <span className="text-[10px] font-black uppercase">TOTAL INVESTMENT</span>
                                                <span className="text-xl font-black italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                            </div>
                                            {displayProposal.showAdvance !== false && (
                                                <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                                    <span>Advance Paid</span>
                                                    <span className="text-black text-sm">₹{advancePaid.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="w-full flex justify-between items-center py-3 bg-[#39FF14]/40 px-4 text-black border border-black/10 rounded-xl shadow-sm mt-4">
                                                <span className="text-[10px] font-black uppercase">BALANCE DUE</span>
                                                <span className="text-xl font-black italic tracking-tighter">₹{toBePaid.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Details */}
                                <div className="space-y-6 relative z-10">
                                    <div className="grid grid-cols-2 gap-8 items-end">
                                        <div className="bg-white/20 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="bg-[#39FF14]/40 px-4 py-1.5 border-b border-black/10">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">TERMS & CONDITIONS</h4>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-[8px] font-bold leading-relaxed text-gray-500 whitespace-pre-line">
                                                    {displayProposal.terms || "Standard terms apply."}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
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
                                                <div className="w-48 pt-3 border-t border-gray-400 text-center">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-700">Authorized Signature</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {displayProposal.showFooter !== false && (
                                        <footer className="relative h-12 flex items-center justify-between px-8 overflow-hidden rounded-full border border-white/20 mt-12 shadow-lg">
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Proposal;
