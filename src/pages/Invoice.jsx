import React, { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Printer, CheckCircle, ArrowLeft, Share2, Mail, MessageCircle, DollarSign, LayoutGrid } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';


const Invoice = () => {
    const { id } = useParams();
    const { invoices, updateInvoiceStatus, loading } = useStore();
    const invoiceRef = useRef(null);
    const printFrameRef = useRef(null);
    const [scale, setScale] = React.useState(1);

    React.useEffect(() => {
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

    const invoice = invoices.find(inv => inv.id === id);
    const isAdmin = localStorage.getItem('adminAuth') === 'true';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-blue"></div>
            </div>
        );
    }

    const isQuickUpload = invoice?.pdfUrl && (!invoice.items || invoice.items.length === 0);

    // Derived display data
    const displayInvoice = invoice || {
        id: "DEMO-INV-001",
        invoiceNumber: "DEMO-001",
        clientName: "Demo Client (No Data)",
        amount: 0,
        status: "Demo Mode",
        advancePaid: 0,
        items: [],
        customColumns: []
    };

    const handleDownloadPDF = async () => {
        if (isQuickUpload) {
            const link = document.createElement('a');
            link.href = invoice.pdfUrl;
            link.download = `Invoice-${displayInvoice.invoiceNumber || displayInvoice.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        const originalScale = scale;
        setScale(1);
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            const pageElements = document.querySelectorAll('.invoice-page-render');
            
            if (!pageElements.length) {
                alert("No invoice pages found to download!");
                return;
            }

            for (let i = 0; i < pageElements.length; i++) {
                const canvas = await html2canvas(pageElements[i], {
                    scale: 2,
                    useCORS: true,
                    logging: true,
                    backgroundColor: '#F3F4F6',
                    width: 794,
                    height: 1123,
                    windowWidth: 794,
                    windowHeight: 1123,
                    onclone: (clonedDoc) => {
                        const clonedPage = clonedDoc.querySelectorAll('.invoice-page-render')[i];
                        if (clonedPage) {
                            clonedPage.style.transform = 'none';
                            clonedPage.style.boxShadow = 'none';
                        }
                    }
                });
                
                if (!canvas) {
                    throw new Error(`Failed to capture page ${i + 1}`);
                }

                const imgData = canvas.toDataURL('image/png', 1.0);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
            }
            
            pdf.save(`Invoice-${displayInvoice.invoiceNumber || displayInvoice.id}.pdf`);
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("PDF Generation Error: " + error.message);
        } finally {
            setScale(originalScale);
        }
    };

    const handlePrint = async () => {
        const frame = printFrameRef.current;
        if (!frame) return;

        try {
            let printUrl = invoice?.pdfUrl;

            // For generated invoices, generate a PDF blob first
            if (!isQuickUpload) {
                const originalScale = scale;
                setScale(1);
                await new Promise(resolve => setTimeout(resolve, 500));

                try {
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pageElements = document.querySelectorAll('.invoice-page-render');
                    
                    for (let i = 0; i < pageElements.length; i++) {
                        const canvas = await html2canvas(pageElements[i], {
                            scale: 2,
                            useCORS: true,
                            allowTaint: true,
                            logging: false,
                            backgroundColor: '#F3F4F6'
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
            }

            // Load into iframe and print
            frame.src = printUrl;
            frame.onload = () => {
                setTimeout(() => {
                    try {
                        frame.contentWindow.focus();
                        frame.contentWindow.print();
                        if (!isQuickUpload) URL.revokeObjectURL(printUrl);
                    } catch (e) {
                        console.error("Iframe print error:", e);
                        // Fallback: Open in new window if iframe print fails (e.g. cross-origin)
                        window.open(printUrl, '_blank').print();
                    }
                }, 500);
            };
        } catch (error) {
            console.error("Print failed:", error);
            alert("Failed to prepare for printing.");
        }
    };

    const handleMarkPaid = () => {
        if (window.confirm('Mark this invoice as PAID?')) {
            updateInvoiceStatus(invoice.id, 'Paid');
        }
    };

    const handleShareWhatsApp = () => {
        const text = `Here is your invoice from Newbi Entertainment: ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareEmail = () => {
        const subject = `Invoice #${displayInvoice.invoiceNumber || displayInvoice.id} from Newbi Entertainment`;
        const body = `Hi,\n\nPlease find your invoice here: ${window.location.href}\n\nThanks,\nNewbi Entertainment`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };

    const getGridTemplate = () => {
        const columns = displayInvoice.customColumns || [];
        const customFr = columns.map(() => '1.5fr').join(' ');
        return `3fr ${customFr} 0.8fr 1.2fr 1.2fr`;
    };

    const items = displayInvoice.items || [];
    const subtotal = items.reduce((sum, item) => sum + ((item.qty || 1) * (item.price || 0)), 0);
    const gstAmount = invoice?.showGst ? (subtotal * (invoice.gstPercentage || 0)) / 100 : 0;
    const totalAmount = isQuickUpload ? (displayInvoice.amount || 0) : (subtotal + gstAmount);
    const advancePaid = Number(displayInvoice.advancePaid) || 0;
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
            {/* Hidden Iframe for Printing */}
            <iframe
                ref={printFrameRef}
                className="fixed -top-[1000px] left-0 pointer-events-none w-0 h-0"
                title="print-frame"
            />

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-32 md:pt-40">
                <div className="mb-8 print:hidden flex justify-between items-center">
                        <Link to="/admin" className="relative z-[70] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] mb-4 group">
                             <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO ADMIN DASHBOARD
                         </Link>
                    {!invoice && !loading && (
                        <span className="text-yellow-500 text-sm font-bold">Demo Mode / No Data</span>
                    )}
                </div>

                <div className="flex flex-col gap-8">
                    {/* TOP ACTIONS BAR */}
                    <Card className="p-3 sm:p-4 bg-white/5 border-white/10 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center print:hidden backdrop-blur-xl">
                        <div className="flex items-center justify-between sm:justify-start gap-4">
                            <h2 className="text-white font-bold flex items-center gap-2">
                                <CheckCircle className={displayInvoice.status === 'Paid' ? "text-neon-green" : "text-yellow-500"} size={20} />
                                <span className="truncate max-w-[150px] sm:max-w-none">#{displayInvoice.invoiceNumber || displayInvoice.id}</span>
                            </h2>

                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${displayInvoice.status === 'Paid'
                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                }`}>
                                {displayInvoice.status}
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
                                    {displayInvoice.status !== 'Paid' && (
                                        <Button variant="outline" size="sm" onClick={handleMarkPaid} className="flex-[2] sm:flex-none text-green-400 border-green-400/50 hover:bg-green-400/10">
                                            <DollarSign size={16} />
                                            <span className="sm:inline hidden">Mark Paid</span>
                                            <span className="inline sm:hidden">Paid</span>
                                        </Button>
                                    )}
                                </>
                            )}

                            <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden flex-1 sm:flex-none">
                                <Printer size={16} /> <span className="sm:inline hidden ml-2">Print</span>
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleDownloadPDF} className="bg-neon-green text-black hover:bg-neon-green/90 flex-[2] sm:flex-none">
                                <Download size={16} /> <span className="ml-2 font-bold uppercase text-[10px]">Download</span>
                            </Button>
                        </div>
                    </Card>

                    {/* MAIN CONTENT AREA */}
                    {isQuickUpload ? (
                        <div className="w-full h-[80vh] rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl">
                            <iframe
                                src={invoice.pdfUrl}
                                title="Invoice PDF"
                                className="w-full h-full border-none"
                            />
                        </div>
                    ) : (
                        <div className="print-container flex flex-col items-center bg-zinc-900/40 backdrop-blur-3xl p-2 sm:p-4 md:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar relative">
                            <div className="absolute top-6 right-6 z-20 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-widest text-[#39FF14]">Digital Archive</div>
                            
                            <div className="flex flex-col gap-8 py-8 origin-top" style={{ transform: `scale(${scale})`, marginBottom: `${(scale - 1) * 1123 * paginatedPages.length}px` }}>
                                {paginatedPages.map((pageItems, pageIdx) => {
                                    const isLastPage = pageIdx === paginatedPages.length - 1;
                                    const isFirstPage = pageIdx === 0;

                                    return (
                                        <div
                                            key={pageIdx}
                                            className="invoice-page-render w-[794px] h-[1123px] bg-[#F3F4F6] text-black relative shadow-2xl shrink-0 p-[12mm] flex flex-col justify-between"
                                            style={{ fontFamily: "'Inter', sans-serif" }}
                                        >
                                            <div>
                                                {/* Header - Only on Page 1 */}
                                                {isFirstPage ? (
                                                    <div className="flex justify-between items-start mb-12">
                                                        <div>
                                                            <img src="/logo_document.png" alt="Company Logo" className="h-20 object-contain" crossOrigin="anonymous" />
                                                        </div>
                                                        <div className="text-right">
                                                            <h2 className="text-4xl font-black text-gray-400 tracking-tighter uppercase mb-0">#{displayInvoice.invoiceNumber}</h2>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">INVOICE ID</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                                                        <img src="/logo_document.png" alt="Newbi Logo" className="w-[100px] object-contain opacity-50" />
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice #{displayInvoice.invoiceNumber} — Page {pageIdx + 1}</p>
                                                    </div>
                                                )}

                                                {/* Info Boxes - Only on Page 1 */}
                                                {isFirstPage && (
                                                    <div className="grid grid-cols-2 gap-8 mb-8">
                                                        <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                            <div className="bg-[#39FF14]/40 px-6 py-2">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE BY</h4>
                                                            </div>
                                                            <div className="p-6">
                                                                <p className="text-xl font-bold mb-3 leading-none">{displayInvoice.senderName || 'Newbi Entertainment'}</p>
                                                                <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                                    <p>Contact: {displayInvoice.senderContact}</p>
                                                                    <p>Email: {displayInvoice.senderEmail}</p>
                                                                    {displayInvoice.senderPan && <p>PAN: {displayInvoice.senderPan}</p>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                            <div className="bg-[#39FF14]/40 px-6 py-2">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE TO</h4>
                                                            </div>
                                                            <div className="p-6">
                                                                <p className="text-xl font-bold uppercase mb-3 leading-none">{displayInvoice.clientName || 'CLIENT NAME'}</p>
                                                                <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                                    <p>Invoice Date: {new Date(displayInvoice.issueDate || displayInvoice.createdAt || Date.now()).toLocaleDateString('en-GB')}</p>
                                                                    {displayInvoice.dueDate && <p className="text-[#39FF14] font-black">Due Date: {new Date(displayInvoice.dueDate).toLocaleDateString('en-GB')}</p>}
                                                                    {displayInvoice.clientAddress && <p className="whitespace-pre-line">{displayInvoice.clientAddress}</p>}
                                                                    {displayInvoice.clientGst && <p className="mt-1 pt-1 border-t border-gray-200 inline-block">GST: {displayInvoice.clientGst}</p>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Table */}
                                                <div className={cn("mb-8 overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white/20", !isFirstPage && "mt-4")}>
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="bg-[#39FF14]/40 text-black">
                                                                <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-black/5">SERVICE DESCRIPTION</th>
                                                                {(displayInvoice.customColumns || []).map(col => (
                                                                    <th key={col.id} className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">{col.label}</th>
                                                                ))}
                                                                <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">QTY.</th>
                                                                <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">PRICE</th>
                                                                <th className="py-4 px-6 text-right text-[10px] font-black uppercase tracking-widest">TOTAL</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                            {pageItems.map((item, idx) => (
                                                                <tr key={idx} className="bg-white/10">
                                                                    <td className="py-5 px-6 text-[11px] font-bold uppercase border-r border-dashed border-gray-200 leading-relaxed font-heading italic">{item.description || "SERVICE"}</td>
                                                                    {(displayInvoice.customColumns || []).map(col => (
                                                                        <td key={col.id} className="py-5 px-4 text-center text-[10px] font-semibold border-r border-dashed border-gray-200 leading-relaxed">{item.customValues?.[col.id] || "-"}</td>
                                                                    ))}
                                                                    <td className="py-5 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed">{item.qty || 1}</td>
                                                                    <td className="py-5 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed">₹{(item.price || 0).toLocaleString()}</td>
                                                                    <td className="py-5 px-6 text-right text-[11px] font-black leading-relaxed">₹{( (item.qty || 1) * (item.price || 0) ).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Totals Section & Left Details - Only on Last Page */}
                                                {isLastPage && (
                                                    <div className="mt-4 space-y-6">
                                                        <div className="flex justify-between items-start gap-12">
                                                            <div className="flex-1">
                                                                {invoice?.showNotes !== false && displayInvoice.note && (
                                                                    <div className="bg-white/40 rounded-2xl overflow-hidden border border-gray-200 shadow-sm transition-all hover:bg-white/50">
                                                                        <div className="bg-[#39FF14]/40 px-4 py-1.5 border-b border-black/10">
                                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">ADDITIONAL NOTE</h4>
                                                                        </div>
                                                                        <div className="p-4">
                                                                            <p className="text-[10px] font-bold text-gray-600 leading-relaxed italic whitespace-pre-line">{displayInvoice.note}</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="w-[45%] shrink-0 py-4">
                                                                <div className="w-full space-y-3">
                                                                    <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                        <span>SUBTOTAL</span>
                                                                        <span className="text-black text-xs font-bold font-heading italic">₹{subtotal.toLocaleString()}</span>
                                                                    </div>
                                                                    {invoice?.showGst && (
                                                                        <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                            <span>GST ({invoice.gstPercentage}%)</span>
                                                                            <span className="text-black text-xs font-bold font-heading italic">₹{gstAmount.toLocaleString()}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between items-center py-3 bg-[#39FF14]/40 px-4 text-black border border-black/5 mt-2 rounded-xl transition-transform hover:scale-[1.02]">
                                                                        <span className="text-[10px] font-black uppercase italic">TOTAL AMOUNT</span>
                                                                        <span className="text-xl font-black italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                                                    </div>
                                                                    {displayInvoice.showAdvance !== false && (
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

                                                        {(invoice?.showPaymentDetails !== false && displayInvoice.paymentDetails || invoice?.showUPI) && (
                                                            <div className="flex flex-row items-end justify-between gap-6 pt-4 border-t border-gray-300/50">
                                                                {invoice?.showPaymentDetails !== false && displayInvoice.paymentDetails && (
                                                                    <div className="inline-block p-6 border-2 border-dashed border-gray-300 rounded-[2rem] text-[10px] font-bold text-left uppercase leading-relaxed text-gray-500 bg-white/40 shadow-sm shrink-0">
                                                                        <p className="text-xs font-black text-black mb-3 border-b-2 border-[#39FF14] pb-1.5 inline-block">PAYMENT DETAILS</p>
                                                                        <div className="whitespace-pre-line tracking-wide">
                                                                            {displayInvoice.paymentDetails}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {invoice?.showUPI && invoice?.upiId && (
                                                                    <div className="bg-white p-3 rounded-2xl border border-gray-200 inline-block shadow-sm shrink-0 mb-4 ml-auto">
                                                                        <img 
                                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${invoice.upiId}&pn=NEWBI&am=${toBePaid}&cu=INR`)}`} 
                                                                            alt="Payment QR" 
                                                                            className="w-[100px] h-[100px] grayscale contrast-125 mx-auto"
                                                                            crossOrigin="anonymous"
                                                                        />
                                                                        <p className="text-[8px] font-black text-center mt-2 text-gray-400 tracking-widest uppercase italic font-bold">SCAN TO PAY</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer and Signatory */}
                                            <div className="space-y-6 mt-auto relative">
                                                {isLastPage && (
                                                    <div className="grid grid-cols-2 gap-8 items-end px-2">
                                                        <div>
                                                            {/* Empty block to push signatory to the right */}
                                                        </div>
                                                        <div className="text-right flex flex-col items-end">
                                                            <div className="flex flex-col items-end">
                                                                {invoice?.showSignatory === 'image' && invoice?.signatoryImage ? (
                                                                    <img src={invoice.signatoryImage} alt="Signature" className="h-16 mb-2 object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                                ) : invoice?.showSignatory === 'text' ? (
                                                                    <div className="h-16 flex items-end justify-center">
                                                                        <p className="font-heading italic text-lg leading-none border-b border-gray-400 pb-1 px-4">{displayInvoice.senderName || 'Authorized Signatory'}</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-16" />
                                                                )}
                                                                {invoice?.showSignatory !== 'none' && (
                                                                    <div className="w-48 pt-4 border-t border-gray-400 text-center">
                                                                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-700">Authorized Signature</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Footer Pill */}
                                                {invoice?.showFooter !== false && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-[#39FF14]/50 rounded-full py-3 px-10 flex justify-between items-center shadow-lg border border-black/10 min-h-[45px]">
                                                        <div className="flex items-center gap-2 text-black">
                                                            <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">CALL</span>
                                                            <p className="text-[10px] font-black text-black tracking-widest">+91 93043 72773</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 border-x border-black/10 px-10">
                                                            <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">EMAIL</span>
                                                            <p className="text-[10px] font-black text-black tracking-widest">partnership@newbi.live</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">WEB</span>
                                                            <a href="https://newbi.live" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-black tracking-widest hover:underline">newbi.live</a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Invoice;
