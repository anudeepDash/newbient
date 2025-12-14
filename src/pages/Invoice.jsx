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
    const { invoices, updateInvoiceStatus } = useStore();
    const invoiceRef = useRef(null);

    const invoice = invoices.find(inv => inv.id === id);

    if (!invoice) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
                    <Link to="/portal" className="text-neon-blue hover:underline">Return to Portal</Link>
                </div>
            </div>
        );
    }

    const handleDownloadPDF = async () => {
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
        const confirmPayment = window.confirm(`Proceed to pay $${invoice.amount.toLocaleString()}?`);
        if (confirmPayment) {
            updateInvoiceStatus(invoice.id, 'Paid');
            alert('Payment Successful! Thank you.');
        }
    };

    // Calculate totals (mock logic if items exist, otherwise use total amount)
    const subtotal = invoice.amount; // Simplified for now as we might not have line items in old mock data
    const tax = subtotal * 0.18; // Mock 18% tax
    const total = subtotal + tax;

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white print:text-black">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 print:hidden">
                    <Link to="/portal" className="text-gray-400 hover:text-white flex items-center transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Portal
                    </Link>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="p-8 md:p-12 print:shadow-none print:border-none print:text-black bg-dark/50 backdrop-blur-xl" ref={invoiceRef}>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-12 border-b border-white/10 pb-8 print:border-gray-300">
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-2 print:text-black">INVOICE</h1>
                                <p className="text-neon-blue font-mono text-lg print:text-blue-600">ID: {invoice.id}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-white mb-1 print:text-black">Newbi Entertainments</h2>
                                <p className="text-gray-400 text-sm print:text-gray-600">Entertainment. Events. Energy.</p>
                                <p className="text-gray-400 text-sm print:text-gray-600">hello@newbi.com</p>
                            </div>
                        </div>

                        {/* Client & Dates */}
                        <div className="grid grid-cols-2 gap-8 mb-12">
                            <div>
                                <h3 className="text-gray-500 text-sm uppercase tracking-wider mb-2 font-semibold">Bill To</h3>
                                <p className="text-white text-xl font-bold print:text-black">{invoice.clientName}</p>
                                <p className="text-gray-400 print:text-gray-600">client@example.com</p>
                                <p className="text-gray-400 print:text-gray-600">+1 234 567 890</p>
                            </div>
                            <div className="text-right">
                                <div className="mb-4">
                                    <h3 className="text-gray-500 text-sm uppercase tracking-wider mb-1 font-semibold">Issue Date</h3>
                                    <p className="text-white font-mono print:text-black">{new Date().toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <h3 className="text-gray-500 text-sm uppercase tracking-wider mb-1 font-semibold">Due Date</h3>
                                    <p className="text-white font-mono print:text-black">{invoice.dueDate || 'Due on Receipt'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="mb-12">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10 text-left print:border-gray-300">
                                        <th className="py-4 text-gray-500 font-medium w-1/2 print:text-gray-700">Description</th>
                                        <th className="py-4 text-gray-500 font-medium text-center print:text-gray-700">Qty</th>
                                        <th className="py-4 text-gray-500 font-medium text-right print:text-gray-700">Price</th>
                                        <th className="py-4 text-gray-500 font-medium text-right print:text-gray-700">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Mock Line Item since old data structure was simple */}
                                    <tr className="border-b border-white/5 print:border-gray-200">
                                        <td className="py-4 text-white print:text-black">Event Services / Consultation</td>
                                        <td className="py-4 text-gray-400 text-center print:text-black">1</td>
                                        <td className="py-4 text-gray-400 text-right print:text-black">${subtotal.toLocaleString()}</td>
                                        <td className="py-4 text-white text-right font-medium print:text-black">${subtotal.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mb-12">
                            <div className="w-full md:w-1/3 space-y-3">
                                <div className="flex justify-between text-gray-400 print:text-gray-600">
                                    <span>Subtotal</span>
                                    <span>${subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-400 print:text-gray-600">
                                    <span>Tax (18%)</span>
                                    <span>${tax.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-white text-xl font-bold pt-4 border-t border-white/10 print:text-black print:border-gray-300">
                                    <span>Total</span>
                                    <span className="text-neon-green print:text-black">${total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex justify-between items-center pt-8 border-t border-white/10 print:border-gray-300">
                            <div>
                                <span className="text-gray-500 text-sm uppercase tracking-wider mr-4">Status</span>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-sm font-bold border",
                                    invoice.status === 'Paid'
                                        ? "bg-green-500/20 text-green-400 border-green-500/30 print:bg-green-100 print:text-green-800 print:border-green-200"
                                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 print:bg-yellow-100 print:text-yellow-800 print:border-yellow-200"
                                )}>
                                    {invoice.status}
                                </span>
                            </div>
                            {invoice.status === 'Paid' && (
                                <div className="flex items-center text-green-400 print:text-green-700">
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    <span className="font-medium">Payment Received</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Actions */}
                    <div className="mt-8 flex flex-col md:flex-row gap-4 justify-end print:hidden">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print Invoice
                        </Button>
                        <Button variant="secondary" onClick={handleDownloadPDF}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                        {invoice.status !== 'Paid' && (
                            <Button variant="primary" onClick={handlePayment} className="shadow-[0_0_20px_rgba(0,230,168,0.3)] hover:shadow-[0_0_30px_rgba(0,230,168,0.5)]">
                                <CreditCard className="mr-2 h-4 w-4" />
                                PAY NOW
                            </Button>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Invoice;
