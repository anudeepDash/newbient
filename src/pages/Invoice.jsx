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

    const getSymbol = (currencyCode) => {
        const symbols = {
            'USD': '$',
            'INR': '₹',
            'EUR': '€',
            'GBP': '£'
        };
        return symbols[currencyCode] || '$';
    };



    const handleDownloadPDF = async () => {
        if (invoice?.pdfUrl) {
            window.open(invoice.pdfUrl, '_blank');
            return;
        }

        const element = invoiceRef.current;
        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#E5E7EB',
            logging: false,
            useCORS: true
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Invoice-${invoice.id}.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleMarkPaid = () => {
        if (window.confirm('Mark this invoice as PAID?')) {
            updateInvoiceStatus(invoice.id, 'Paid');
        }
    };

    const handleShareWhatsApp = () => {
        const text = `Here is your invoice from Newbi Entertainments: ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareEmail = () => {
        const subject = `Invoice #${invoice.invoiceNumber || invoice.id} from Newbi Entertainments`;
        const body = `Hi,\n\nPlease find your invoice attached here: ${window.location.href}\n\nThanks,\nNewbi Entertainments`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };

    // Calculate totals (mock logic if items exist, otherwise use total amount)
    const subtotal = invoice.amount; // Simplified for now as we might not have line items in old mock data
    const tax = subtotal * 0.18; // Mock 18% tax
    const total = subtotal + tax;

    const currencySymbol = getSymbol(invoice?.currency || 'USD'); // Safe access

    // Fallback Demo Data if invoice not found
    const displayInvoice = invoice || {
        id: "DEMO-INV-001",
        clientName: "Demo Client (No Data Found)",
        currency: "USD",
        amount: 0,
        status: "Demo Mode",
        dueDate: new Date().toISOString().split('T')[0],
        items: []
    };

    // Calculate totals based on displayInvoice
    const demoSubtotal = displayInvoice.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || displayInvoice.amount || 0;
    const demoTax = demoSubtotal * 0.18;
    const demoTotal = demoSubtotal + demoTax;
    const getGridTemplate = () => {
        const columns = displayInvoice.customColumns || [];
        const customFr = columns.map(() => '1.5fr').join(' ');
        return `3fr ${customFr} 0.8fr 1.2fr 1.2fr`;
    };

    const toBePaid = displayInvoice.amount - (displayInvoice.advancePaid || 0);

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white print:text-black">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 print:hidden">
                    <Link to="/admin/invoices" className="text-gray-400 hover:text-white flex items-center transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Manager
                    </Link>
                </div>

                {!invoice && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm print:hidden">
                        <strong>Demo Mode:</strong> The requested invoice ID was not found. Showing a sample layout.
                    </div>
                )}

                <div className="flex flex-col gap-8">
                    {/* TOP ACTIONS BAR */}
                    <Card className="p-4 bg-black/40 border-white/10 flex flex-wrap gap-4 items-center print:hidden">
                        <h2 className="text-white font-bold flex items-center gap-2 mr-auto">
                            <CheckCircle className={displayInvoice.status === 'Paid' ? "text-neon-green" : "text-yellow-500"} h-5 w-5 />
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
                                    <MessageCircle className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleShareEmail} title="Share via Email">
                                    <Mail className="h-4 w-4" />
                                </Button>
                                {displayInvoice.status !== 'Paid' && (
                                    <Button variant="outline" size="sm" onClick={handleMarkPaid} className="text-green-400 border-green-400/50 hover:bg-green-400/10">
                                        <DollarSign className="mr-2 h-4 w-4" />
                                        Mark Paid
                                    </Button>
                                )}
                            </div>
                        )}

                        <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
                            <Printer className="mr-2 h-4 w-4" /> Print
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleDownloadPDF}>
                            <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                    </Card>

                    {/* MAIN INVOICE CONTENT */}
                    <div className="flex justify-center overflow-x-auto bg-[#1a1a1a] p-8 rounded-xl border border-white/5">
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
                                {/* INVOICE BY */}
                                <div className="bg-[#E5E7EB] rounded-xl overflow-hidden border border-gray-300">
                                    <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-800 tracking-wider text-sm border-b border-gray-400/20">
                                        Invoice By
                                    </div>
                                    <div className="p-4 text-sm text-gray-700 space-y-1">
                                        <p className="font-black text-lg text-black mb-2">{displayInvoice.senderName || 'Newbi Entertainment'}</p>
                                        <p>Contact: {displayInvoice.senderContact || '+91 93043 72773'}</p>
                                        <p>Email: {displayInvoice.senderEmail || 'partnership@newbi.live'}</p>
                                        {displayInvoice.senderPan && <p>PAN: {displayInvoice.senderPan}</p>}
                                        {displayInvoice.senderGst && <p>GSTIN: {displayInvoice.senderGst}</p>}
                                    </div>
                                </div>

                                {/* INVOICE TO */}
                                <div className="bg-[#E5E7EB] rounded-xl overflow-hidden border border-gray-300">
                                    <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-800 tracking-wider text-sm border-b border-gray-400/20">
                                        Invoice To
                                    </div>
                                    <div className="p-4 text-sm text-gray-700 space-y-1">
                                        <p className="font-black text-lg text-black mb-2">{displayInvoice.clientName || 'Client Name'}</p>
                                        <p className="mb-1">Date: {new Date(displayInvoice.issueDate || displayInvoice.createdAt || Date.now()).toLocaleDateString('en-GB')}</p>
                                        {displayInvoice.dueDate && <p className="mb-2 text-red-600 font-bold text-xs">Due: {new Date(displayInvoice.dueDate).toLocaleDateString('en-GB')}</p>}

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
                                                <div className="border-l border-dashed border-gray-400 h-full flex items-center justify-center">{item.qty || item.quantity || 1}</div>
                                                <div className="border-l border-dashed border-gray-400 h-full flex items-center justify-center">₹{(item.price || 0).toLocaleString()}</div>
                                                <div className="border-l border-dashed border-gray-400 h-full flex items-center justify-center">₹{((item.qty || item.quantity || 1) * (item.price || 0)).toLocaleString()}</div>
                                            </div>
                                        ))}
                                        <div className="h-24 bg-[#E5E7EB] border-b border-dashed border-gray-400"></div>
                                    </div>

                                    <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                        <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Total</div>
                                        <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{(displayInvoice.amount || 0).toLocaleString()}</div>
                                    </div>
                                    <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                        <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Advance Paid</div>
                                        <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{(displayInvoice.advancePaid || 0).toLocaleString()}</div>
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

                            {/* Signatory Box */}
                            <div className="px-8 mt-2 mb-20 flex justify-end">
                                <div className="text-center">
                                    <div className="h-12 w-32 border-b-2 border-gray-600 mb-1"></div>
                                    <p className="text-[10px] font-bold uppercase text-gray-600">Authorized Signatory</p>
                                    <p className="text-[8px] text-gray-500">{displayInvoice.senderName || 'Newbi Entertainment'}</p>
                                </div>
                            </div>

                            {/* Footer Branding */}
                            <div className="absolute bottom-12 left-8 right-8 bg-[#86EFAC] rounded-xl py-3 px-6 flex justify-between items-center text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                <div>+91 93043 72773</div>
                                <div className="lowercase tracking-normal">partnership@newbi.live</div>
                                <div className="lowercase tracking-normal">www.newbi.live</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Invoice;
