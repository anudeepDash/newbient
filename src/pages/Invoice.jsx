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

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#E5E7EB',
                logging: false,
                useCORS: true,
                allowTaint: true
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

                const canvas = await html2canvas(element, {
                    scale: 2,
                    backgroundColor: '#E5E7EB',
                    logging: false,
                    useCORS: true,
                    allowTaint: true
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.9);
                const pdfWidth = 210;
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

                const blob = pdf.output('blob');
                printUrl = URL.createObjectURL(blob);
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
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-black scroll-smooth">
            {/* Hidden Iframe for Printing */}
            <iframe
                ref={printFrameRef}
                className="fixed -top-[1000px] left-0 pointer-events-none w-0 h-0"
                title="print-frame"
            />

            <div className="max-w-4xl mx-auto">
                <div className="mb-8 print:hidden flex justify-between items-center">
                    <Link to="/admin/invoices" className="text-gray-400 hover:text-white flex items-center transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Manager
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
                        <div className="print-container flex justify-center bg-gray-900/50 p-2 sm:p-4 md:p-8 rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
                            <div
                                ref={invoiceRef}
                                className="w-[794px] min-h-[1123px] bg-[#E5E7EB] text-black relative shadow-2xl shrink-0 origin-top"
                                style={{
                                    fontFamily: 'Inter, sans-serif',
                                    transform: `scale(${scale})`,
                                    marginBottom: `${(scale - 1) * 1123}px`
                                }}
                            >
                                {/* PDF Header */}
                                <div className="p-8 pb-4 flex justify-between items-start relative">
                                    <div className="z-10">
                                        <img src="/logo_full.png" alt="NewBi Entertainment" className="h-14 object-contain" />
                                    </div>
                                    <div className="absolute top-6 right-8 text-right pointer-events-none">
                                        <h1 className="text-4xl font-black text-gray-800 opacity-70">
                                            #{displayInvoice.invoiceNumber}
                                        </h1>
                                        <p className="text-gray-500 text-[10px] font-bold uppercase mr-1">INVOICE ID</p>
                                    </div>
                                </div>

                                {/* Info Cards Row */}
                                <div className="px-8 py-4 grid grid-cols-2 gap-8">
                                    <div className="bg-[#E5E7EB] rounded-xl overflow-hidden border border-gray-300">
                                        <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-800 tracking-wider text-sm border-b border-gray-400/20">
                                            Invoice By
                                        </div>
                                        <div className="p-4 text-sm text-gray-700 space-y-1">
                                            <p className="font-black text-lg text-black mb-2">{displayInvoice.senderName || 'Newbi Entertainment'}</p>
                                            {displayInvoice.senderContact && <p>Contact: {displayInvoice.senderContact}</p>}
                                            {displayInvoice.senderEmail && <p>Email: {displayInvoice.senderEmail}</p>}
                                            {displayInvoice.senderPan && <p>PAN: {displayInvoice.senderPan}</p>}
                                            {displayInvoice.senderGst && <p>GSTIN: {displayInvoice.senderGst}</p>}
                                        </div>
                                    </div>

                                    <div className="bg-[#E5E7EB] rounded-xl overflow-hidden border border-gray-300">
                                        <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-800 tracking-wider text-sm border-b border-gray-400/20">
                                            Invoice To
                                        </div>
                                        <div className="p-4 text-sm text-gray-700 space-y-1">
                                            <p className="font-black text-lg text-black mb-2">{displayInvoice.clientName || 'Client Name'}</p>
                                            <p className="mb-1">Date: {new Date(displayInvoice.issueDate || displayInvoice.createdAt || Date.now()).toLocaleDateString('en-GB')}</p>
                                            {displayInvoice.dueDate && (
                                                <p className="mb-2 text-red-600 font-bold text-xs">
                                                    Due: {new Date(displayInvoice.dueDate).toLocaleDateString('en-GB')}
                                                </p>
                                            )}
                                            {displayInvoice.clientAddress && <p className="text-gray-600 italic mb-1">{displayInvoice.clientAddress}</p>}
                                            {displayInvoice.clientGst && <p className="font-bold border-t border-gray-300 pt-1 mt-1 inline-block">GSTIN: {displayInvoice.clientGst}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Main Grid Table */}
                                <div className="px-8 mt-4">
                                    <div className="w-full">
                                        <div className="grid bg-[#86EFAC] rounded-t-xl text-center font-bold text-xs uppercase py-3 border-b-2 border-dashed border-gray-400/30"
                                            style={{ gridTemplateColumns: getGridTemplate() }}>
                                            <div className="text-left pl-4">Service Description</div>
                                            {(displayInvoice.customColumns || []).map(col => (
                                                <div key={col.id} className="border-l border-dashed border-gray-400/50">{col.label}</div>
                                            ))}
                                            <div className="border-l border-dashed border-gray-400/50">Qty.</div>
                                            <div className="border-l border-dashed border-gray-400/50">Price</div>
                                            <div className="border-l border-dashed border-gray-400/50">Total</div>
                                        </div>

                                        <div className="bg-[#E5E7EB]">
                                            {(displayInvoice.items || []).map((item, idx) => (
                                                <div key={idx} className="grid text-center text-sm font-bold py-4 border-b border-dashed border-gray-400 items-center"
                                                    style={{ gridTemplateColumns: getGridTemplate() }}>
                                                    <div className="text-left pl-4 break-words font-extrabold pr-2">{item.description || 'Service'}</div>
                                                    {(displayInvoice.customColumns || []).map(col => (
                                                        <div key={col.id} className="border-l border-dashed border-gray-400 h-full flex items-center justify-center px-1 break-all text-[10px]">
                                                            {item.customValues?.[col.id] || '-'}
                                                        </div>
                                                    ))}
                                                    <div className="border-l border-dashed border-gray-400 h-full flex items-center justify-center">{item.qty || 1}</div>
                                                    <div className="border-l border-dashed border-gray-400 h-full flex items-center justify-center">₹{(item.price || 0).toLocaleString()}</div>
                                                    <div className="border-l border-dashed border-gray-400 h-full flex items-center justify-center">₹{(item.qty * item.price).toLocaleString()}</div>
                                                </div>
                                            ))}
                                            <div className="h-24 bg-[#E5E7EB] border-b border-dashed border-gray-400"></div>
                                        </div>

                                        <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                            <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Subtotal</div>
                                            <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{subtotal.toLocaleString()}</div>
                                        </div>
                                        {invoice?.showGst && (
                                            <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                                <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">GST ({invoice.gstPercentage}%)</div>
                                                <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{gstAmount.toLocaleString()}</div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                            <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Total</div>
                                            <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{totalAmount.toLocaleString()}</div>
                                        </div>
                                        {advancePaid > 0 && (
                                            <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                                <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Advance Paid</div>
                                                <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{advancePaid.toLocaleString()}</div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-12 bg-[#86EFAC] rounded-b-xl text-lg font-bold">
                                            <div className="col-span-10 text-right pr-4 py-3 text-[#DC2626] uppercase">To Be Paid</div>
                                            <div className="col-span-2 text-center py-3 border-l border-dashed border-gray-400 text-[#DC2626]">₹{toBePaid.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Notes & Payments */}
                                <div className="px-8 mt-12 grid grid-cols-2 gap-8 mb-4">
                                    {invoice?.showNotes !== false && displayInvoice.note && (
                                        <div className="rounded-xl overflow-hidden">
                                            <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-700 tracking-wide text-sm">Additional Note:</div>
                                            <div className="bg-[#C6CBCE] p-4 text-[10px] whitespace-pre-line leading-relaxed font-bold text-black border-t border-gray-400/20 min-h-[100px]">
                                                {displayInvoice.note}
                                            </div>
                                        </div>
                                    )}

                                    {invoice?.showPaymentDetails !== false && displayInvoice.paymentDetails && (
                                        <div className="rounded-xl overflow-hidden">
                                            <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-700 tracking-wide text-sm">Payment Details:</div>
                                            <div className="bg-[#C6CBCE] p-4 text-[10px] whitespace-pre-line leading-relaxed font-bold text-black border-t border-gray-400/20 min-h-[100px]">
                                                {displayInvoice.paymentDetails}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* UPI QR & Signatory Row */}
                                <div className="px-8 mt-4 mb-32 flex justify-between items-end gap-8">
                                    {/* UPI QR */}
                                    <div className="flex-1">
                                        {invoice?.showUPI && invoice?.upiId && (
                                            <div className="flex items-center gap-4 bg-white/50 p-3 rounded-xl border border-gray-300 w-fit">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${invoice.upiId}&pn=${displayInvoice.senderName || 'Newbi'}&am=${totalAmount}&cu=INR`)}`}
                                                    alt="UPI QR"
                                                    className="w-20 h-20"
                                                />
                                                <div className="text-[10px] font-bold text-gray-600">
                                                    <p className="uppercase mb-1">Scan to Pay</p>
                                                    <p className="font-mono text-[8px]">{invoice.upiId}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* AUTHORIZED SIGNATORY */}
                                    {invoice?.showSignatory !== 'none' && (
                                        <div className="text-center min-w-[200px]">
                                            <div className="h-20 flex flex-col items-center justify-end mb-1">
                                                {invoice?.showSignatory === 'image' && invoice?.signatoryImage ? (
                                                    <img src={invoice.signatoryImage} alt="Signature" className="h-16 object-contain mix-blend-multiply" />
                                                ) : (
                                                    <div className="h-10"></div>
                                                )}
                                                <div className="w-48 border-b-2 border-gray-600"></div>
                                            </div>
                                            <p className="text-[10px] font-bold uppercase text-gray-600">Authorized Signatory</p>
                                            <p className="text-[8px] text-gray-500">{displayInvoice.senderName || 'Newbi Entertainment'}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="absolute bottom-12 left-8 right-8 bg-[#86EFAC] rounded-xl py-3 px-6 flex justify-between items-center text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                    <div>+91 93043 72773</div>
                                    <div className="lowercase tracking-normal">partnership@newbi.live</div>
                                    <div className="lowercase tracking-normal">www.newbi.live</div>
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
