import React, { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Printer, CreditCard, CheckCircle, ArrowLeft } from 'lucide-react';
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
            backgroundColor: '#0B0F17', // Match dark theme
            logging: false
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Invoice-${invoice.id}.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    const handlePayment = () => {
        // Simulate payment processing
        const currencySymbol = getSymbol(invoice.currency || 'USD');
        const confirmPayment = window.confirm(`Proceed to pay ${currencySymbol}${invoice.amount.toLocaleString()}?`);
        if (confirmPayment) {
            updateInvoiceStatus(invoice.id, 'Paid');
            alert('Payment Successful! Thank you.');
        }
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
    const activeCurrency = getSymbol(displayInvoice.currency || 'USD');

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white print:text-black">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 print:hidden">
                    <Link to="/portal" className="text-gray-400 hover:text-white flex items-center transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Portal
                    </Link>
                </div>

                {!invoice && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm print:hidden">
                        <strong>Demo Mode:</strong> The requested invoice ID was not found on this device. Showing a sample layout.
                    </div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="p-8 md:p-12 print:shadow-none print:border-none print:text-black bg-dark/50 backdrop-blur-xl" ref={invoiceRef}>
                        {/* Header: Logo Top Left, Title Top Right */}
                        <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b border-white/10 pb-8 print:border-gray-300 gap-8">

                            {/* Logo Section (Top Left) */}
                            <div className="flex flex-col">
                                <div className="mb-4">
                                    <img src="/favicon.png" alt="Newbi Logo" className="h-16 w-auto" onError={(e) => e.target.style.display = 'none'} />
                                </div>
                                <div className="text-white font-bold text-xl print:text-black">Newbi Entertainments</div>
                                <div className="text-gray-400 text-sm print:text-gray-600 space-y-1 mt-2">
                                    <p>Entertainment. Events. Energy.</p>
                                    <p>hello@newbi.live</p>
                                    <p>+91 93043 72773</p>
                                </div>
                            </div>

                            {/* Invoice Details (Top Right) */}
                            <div className="text-left md:text-right">
                                <h1 className="text-5xl font-bold text-white mb-2 print:text-black tracking-wide">INVOICE</h1>
                                <p className="text-neon-blue font-mono text-xl print:text-blue-600 mb-6 font-bold">#{displayInvoice.invoiceNumber || displayInvoice.id}</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between md:justify-end gap-6">
                                        <span className="text-gray-500 font-bold uppercase text-xs tracking-wider">Date Issued:</span>
                                        <span className="text-white font-mono print:text-black">{displayInvoice.createdAt ? new Date(displayInvoice.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between md:justify-end gap-6">
                                        <span className="text-gray-500 font-bold uppercase text-xs tracking-wider">Due Date:</span>
                                        <span className="text-white font-mono print:text-black">{displayInvoice.dueDate || 'Due on Receipt'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bill To */}
                        <div className="mb-12">
                            <h3 className="text-gray-500 text-xs uppercase tracking-wider mb-3 font-bold">Bill To:</h3>
                            <div className="text-white print:text-black space-y-1">
                                <p className="text-xl font-bold">{displayInvoice.clientName}</p>
                                <p className="text-gray-400 print:text-gray-600">client@example.com</p>
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <div className="mb-10 overflow-x-auto">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr className="border-b-2 border-white/20 text-left print:border-gray-800">
                                        <th className="py-3 text-gray-400 font-bold uppercase text-xs tracking-wider print:text-gray-700 w-1/2">Description</th>
                                        <th className="py-3 text-gray-400 font-bold uppercase text-xs tracking-wider text-center print:text-gray-700">Qty</th>
                                        <th className="py-3 text-gray-400 font-bold uppercase text-xs tracking-wider text-right print:text-gray-700">Price</th>
                                        <th className="py-3 text-gray-400 font-bold uppercase text-xs tracking-wider text-right print:text-gray-700">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayInvoice.items && displayInvoice.items.length > 0 ? (
                                        displayInvoice.items.map((item, idx) => (
                                            <tr key={idx} className="border-b border-white/5 print:border-gray-200">
                                                <td className="py-4 text-white print:text-black font-medium">{item.description}</td>
                                                <td className="py-4 text-gray-400 text-center print:text-black">{item.quantity}</td>
                                                <td className="py-4 text-gray-400 text-right print:text-black">{activeCurrency}{item.price.toLocaleString()}</td>
                                                <td className="py-4 text-white text-right font-medium print:text-black">{activeCurrency}{(item.quantity * item.price).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr className="border-b border-white/5 print:border-gray-200">
                                            <td className="py-4 text-gray-500 italic text-center" colSpan="4">No items listed</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals Section */}
                        <div className="flex flex-col md:flex-row justify-end border-t border-white/10 pt-8 print:border-gray-300">
                            <div className="w-full md:w-1/2 lg:w-1/3">
                                <div className="flex justify-between mb-3 text-gray-400 print:text-gray-600">
                                    <span>Subtotal</span>
                                    <span>{activeCurrency}{demoSubtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between mb-3 text-gray-400 print:text-gray-600">
                                    <span>Tax (18%)</span>
                                    <span>{activeCurrency}{demoTax.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-2xl font-bold text-white mt-4 pt-4 border-t-2 border-white/20 print:text-black print:border-black">
                                    <span>Total</span>
                                    <span className="text-neon-green print:text-black">{activeCurrency}{demoTotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer / Status */}
                        <div className="mt-12 pt-8 border-t border-white/10 text-center print:border-gray-300">
                            <p className="text-gray-500 text-sm mb-2">Thank you for your business!</p>
                            <div className="inline-flex items-center px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-white/5 text-gray-400 border-white/10 print:border-gray-400 print:text-black">
                                Status: {displayInvoice.status}
                            </div>
                        </div>

                    </Card>

                    {/* Actions */}
                    <div className="mt-8 flex flex-col md:flex-row gap-4 justify-end print:hidden">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                        <Button variant="secondary" onClick={handleDownloadPDF}>
                            <Download className="mr-2 h-4 w-4" />
                            {displayInvoice.pdfUrl ? 'View PDF' : 'Download PDF'}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Invoice;
