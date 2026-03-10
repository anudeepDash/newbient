import React, { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Printer, CheckCircle, ArrowLeft, Share2, Mail, MessageCircle, DollarSign } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

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

        const element = invoiceRef.current;
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
            pdf.save(`Invoice-${displayInvoice.invoiceNumber || displayInvoice.id}.pdf`);
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
            let printUrl = invoice?.pdfUrl;

            // For generated invoices, generate a PDF blob first
            if (!isQuickUpload) {
                const element = invoiceRef.current;
                if (!element) {
                    alert("Invoice content not found.");
                    return;
                }

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

    return (
        <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-black scroll-smooth">
            {/* Hidden Iframe for Printing */}
            <iframe
                ref={printFrameRef}
                className="fixed -top-[1000px] left-0 pointer-events-none w-0 h-0"
                title="print-frame"
            />

            <div className="max-w-4xl mx-auto">
                <div className="mb-8 print:hidden flex justify-between items-center">
                    <Link to="/admin/invoices" className="relative z-[60] inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest">
                        <ArrowLeft size={14} /> Back to Hub
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
                        <div className="print-container flex justify-center bg-zinc-900/40 backdrop-blur-3xl p-2 sm:p-4 md:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-6 right-6 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-widest text-[#39FF14]">Digital Archive</div>
                            <div
                                ref={invoiceRef}
                                className="w-[794px] min-h-[1123px] bg-[#F3F4F6] text-black relative shadow-2xl shrink-0 origin-top p-[12mm] flex flex-col justify-between"
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    transform: `scale(${scale})`,
                                    marginBottom: `${(scale - 1) * 1123}px`
                                }}
                            >
                                <div>
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-10">
                                        <div className="flex items-center gap-4">
                                            <img src="/logo_full.png" alt="Newbi Logo" className="w-[180px] object-contain" />
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-5xl font-black text-gray-400 tracking-tighter uppercase mb-0">#{displayInvoice.invoiceNumber}</h2>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">INVOICE ID</p>
                                        </div>
                                    </div>

                                    {/* Info Boxes */}
                                    <div className="grid grid-cols-2 gap-8 mb-10">
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
                                                    <p>Date: {new Date(displayInvoice.issueDate || displayInvoice.createdAt || Date.now()).toLocaleDateString('en-GB')}</p>
                                                    {displayInvoice.clientAddress && <p className="whitespace-pre-line">{displayInvoice.clientAddress}</p>}
                                                    {displayInvoice.clientGst && <p className="mt-1 pt-1 border-t border-gray-200 inline-block">GST: {displayInvoice.clientGst}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className="mb-10 overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white/20">
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
                                                {items.map((item, idx) => (
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
                                                <tr className="h-12 bg-white/5">
                                                    <td colSpan={5 + (displayInvoice.customColumns?.length || 0)}></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals Section */}
                                    <div className="mt-8 flex justify-end">
                                        <div className="w-[45%] flex flex-col items-end">
                                            <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <span>SUBTOTAL</span>
                                                <span className="text-black text-xs font-bold">₹{subtotal.toLocaleString()}</span>
                                            </div>
                                            {invoice?.showGst && (
                                                <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <span>GST ({invoice.gstPercentage}%)</span>
                                                    <span className="text-black text-xs font-bold">₹{gstAmount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <span>TOTAL AMOUNT</span>
                                                <span className="text-black text-xs font-bold">₹{totalAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <span>ADVANCE PAID</span>
                                                <span className="text-black text-xs font-bold">₹{advancePaid.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full flex justify-between py-4 bg-[#39FF14]/40 px-6 mt-4 rounded-xl shadow-sm border border-black/10">
                                                <span className="text-[11px] font-black uppercase text-black tracking-widest flex items-center">BALANCE DUE</span>
                                                <span className="text-2xl font-black text-black">₹{toBePaid.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer and Notes */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-8 items-end">
                                        <div className="space-y-6">
                                            {invoice?.showNotes !== false && displayInvoice.note && (
                                                <div className="bg-white/40 rounded-2xl overflow-hidden border border-gray-200 shadow-sm transition-all hover:bg-white/50">
                                                    <div className="bg-[#39FF14]/40 px-4 py-1.5 border-b border-black/10">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black">ADDITIONAL NOTE</h4>
                                                    </div>
                                                    <div className="p-4">
                                                        <p className="text-[10px] font-bold text-gray-600 leading-relaxed italic">{displayInvoice.note}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {invoice?.showPaymentDetails !== false && displayInvoice.paymentDetails && (
                                                <div className="inline-block p-5 border-2 border-dashed border-gray-300 rounded-[2rem] text-[9px] font-bold text-left uppercase leading-normal text-gray-500 bg-white/40 shadow-sm">
                                                    <p className="text-[11px] font-black text-black mb-3 border-b-2 border-[#39FF14] pb-1.5 inline-block">PAYMENT DETAILS</p>
                                                    <div className="whitespace-pre-line tracking-wide">
                                                        {displayInvoice.paymentDetails}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            {invoice?.showUPI && invoice?.upiId && (
                                                <div className="mb-6 bg-white p-2 rounded-xl border border-gray-200 inline-block shadow-sm">
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${invoice.upiId}&pn=NEWBI&am=${toBePaid}&cu=INR`)}`} 
                                                        alt="Payment QR" 
                                                        className="w-[80px] h-[80px] grayscale contrast-125"
                                                    />
                                                    <p className="text-[6px] font-black text-center mt-1 text-gray-400 tracking-widest">SCAN TO PAY</p>
                                                </div>
                                            )}
                                            <div className="flex flex-col items-end">
                                                {invoice?.showSignatory === 'image' && invoice?.signatoryImage ? (
                                                    <img src={invoice.signatoryImage} alt="Signature" className="h-16 mb-2 object-contain grayscale mix-blend-multiply" />
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

                                    {/* Footer Pill */}
                                    {invoice?.showFooter !== false && (
                                        <div className="bg-[#39FF14]/40 rounded-full py-3.5 px-10 flex justify-between items-center shadow-lg border border-white/20">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">CALL</span>
                                                <p className="text-[10px] font-black text-black tracking-widest">+91 93043 72773</p>
                                            </div>
                                            <div className="flex items-center gap-2 border-x border-black/10 px-10">
                                                <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">EMAIL</span>
                                                <p className="text-[10px] font-black text-black tracking-widest">partnership@newbi.live</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">WEB</span>
                                                <p className="text-[10px] font-black text-black tracking-widest uppercase">www.newbi.live</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Invoice;
