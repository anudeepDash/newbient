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
        if (isQuickUpload) {
            const printWindow = window.open(invoice.pdfUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => printWindow.print();
            }
            return;
        }

        // For generated invoices, generate the PDF first to ensure consistency
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

            // Open PDF in new tab and print
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            const printWindow = window.open(url, '_blank');
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                    URL.revokeObjectURL(url);
                };
            }
        } catch (error) {
            console.error("Print generation failed:", error);
            alert("Failed to prepare print. Please try again.");
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

    const totalAmount = displayInvoice.amount || 0;
    const advancePaid = Number(displayInvoice.advancePaid) || 0;
    const toBePaid = totalAmount - advancePaid;

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white print:text-black bg-black">
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
                    <Card className="p-4 bg-white/5 border-white/10 flex flex-wrap gap-4 items-center print:hidden backdrop-blur-xl">
                        <h2 className="text-white font-bold flex items-center gap-2 mr-auto">
                            <CheckCircle className={displayInvoice.status === 'Paid' ? "text-neon-green" : "text-yellow-500"} size={20} />
                            #{displayInvoice.invoiceNumber || displayInvoice.id}
                        </h2>

                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${displayInvoice.status === 'Paid'
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}>
                            {displayInvoice.status}
                        </div>

                        {isAdmin && (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleShareWhatsApp} title="Share on WhatsApp">
                                    <MessageCircle size={16} />
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleShareEmail} title="Share via Email">
                                    <Mail size={16} />
                                </Button>
                                {displayInvoice.status !== 'Paid' && (
                                    <Button variant="outline" size="sm" onClick={handleMarkPaid} className="text-green-400 border-green-400/50 hover:bg-green-400/10">
                                        <DollarSign size={16} />
                                        Mark Paid
                                    </Button>
                                )}
                            </div>
                        )}

                        <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
                            <Printer size={16} className="mr-2" /> Print
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleDownloadPDF} className="bg-neon-green text-black hover:bg-neon-green/90">
                            <Download size={16} className="mr-2" /> Download PDF
                        </Button>
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
                        <div className="flex justify-center overflow-x-auto bg-gray-900/50 p-4 md:p-8 rounded-2xl border border-white/5 shadow-2xl">
                            <div
                                ref={invoiceRef}
                                className="w-[794px] min-h-[1123px] bg-[#E5E7EB] text-black relative shadow-2xl overflow-hidden shrink-0"
                                style={{ fontFamily: 'Inter, sans-serif' }}
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
                                            <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Total</div>
                                            <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{totalAmount.toLocaleString()}</div>
                                        </div>
                                        <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                            <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Advance Paid</div>
                                            <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{advancePaid.toLocaleString()}</div>
                                        </div>
                                        <div className="grid grid-cols-12 bg-[#86EFAC] rounded-b-xl text-lg font-bold">
                                            <div className="col-span-10 text-right pr-4 py-3 text-[#DC2626] uppercase">To Be Paid</div>
                                            <div className="col-span-2 text-center py-3 border-l border-dashed border-gray-400 text-[#DC2626]">₹{toBePaid.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Notes */}
                                <div className="px-8 mt-12 grid grid-cols-2 gap-8 mb-4">
                                    {displayInvoice.note && (
                                        <div className="rounded-xl overflow-hidden">
                                            <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-700 tracking-wide text-sm">Additional Note:</div>
                                            <div className="bg-[#C6CBCE] p-4 text-[10px] whitespace-pre-line leading-relaxed font-bold text-black border-t border-gray-400/20 min-h-[100px]">
                                                {displayInvoice.note}
                                            </div>
                                        </div>
                                    )}

                                    {displayInvoice.paymentDetails && (
                                        <div className="rounded-xl overflow-hidden">
                                            <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-700 tracking-wide text-sm">Payment Details:</div>
                                            <div className="bg-[#C6CBCE] p-4 text-[10px] whitespace-pre-line leading-relaxed font-bold text-black border-t border-gray-400/20 min-h-[100px]">
                                                {displayInvoice.paymentDetails}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="px-8 mt-2 mb-20 flex justify-end">
                                    <div className="text-center">
                                        <div className="h-12 w-32 border-b-2 border-gray-600 mb-1"></div>
                                        <p className="text-[10px] font-bold uppercase text-gray-600">Authorized Signatory</p>
                                        <p className="text-[8px] text-gray-500">{displayInvoice.senderName || 'Newbi Entertainment'}</p>
                                    </div>
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
