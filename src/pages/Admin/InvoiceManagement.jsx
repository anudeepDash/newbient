import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Copy, ArrowLeft, Plus } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { Input } from '../../components/ui/Input';

const InvoiceManagement = () => {
    const { invoices, updateInvoiceStatus, deleteInvoice, addInvoice } = useStore();
    const [filter, setFilter] = useState('All');

    // Quick Upload State
    const [showQuickUpload, setShowQuickUpload] = useState(false);
    const [quickClientName, setQuickClientName] = useState('');
    const [quickFile, setQuickFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const filteredInvoices = filter === 'All'
        ? invoices
        : invoices.filter(inv => inv.status === filter);

    const handleCopyLink = (id) => {
        const link = `${window.location.origin}/invoice/${id}`;
        navigator.clipboard.writeText(link);
        alert(`Invoice link copied! Share ID: ${id}`);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this invoice?')) {
            deleteInvoice(id);
        }
        if (window.confirm('Are you sure you want to delete this invoice?')) {
            deleteInvoice(id);
        }
    };

    const handleQuickUpload = async (e) => {
        e.preventDefault();
        if (!quickClientName || !quickFile) {
            alert("Please provide both client name and a PDF file.");
            return;
        }

        console.log("Starting upload for file:", quickFile.name, "Size:", quickFile.size);

        setUploading(true);
        try {
            const storageRef = ref(storage, `invoices/${Date.now()}_${quickFile.name}`);

            // Add metadata
            const metadata = {
                contentType: 'application/pdf',
            };

            console.log("Uploading bytes...");

            // 30s Timeout mechanism
            const uploadPromise = uploadBytes(storageRef, quickFile, metadata);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Upload timed out (30s). Check network or firewall.")), 30000);
            });

            const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
            console.log("Upload success!", snapshot);

            console.log("Getting download URL...");
            const pdfUrl = await getDownloadURL(storageRef);
            console.log("Got URL:", pdfUrl);

            const newInvoice = {
                invoiceNumber: `QUICK-${Math.floor(1000 + Math.random() * 9000)}`,
                clientName: quickClientName,
                email: '', // Optional or dummy
                phone: '',
                serviceDescription: 'Quick Invoice Upload',
                issueDate: new Date().toISOString().split('T')[0],
                dueDate: '',
                notes: 'Uploaded PDF Invoice',
                currency: 'USD',
                taxRate: 0,
                items: [],
                amount: 0, // No amount tracking for quick upload unless added later
                status: 'Pending',
                createdAt: new Date().toISOString(),
                pdfUrl: pdfUrl
            };

            await addInvoice(newInvoice);
            alert("Invoice uploaded successfully!");
            setShowQuickUpload(false);
            setQuickClientName('');
            setQuickFile(null);
        } catch (error) {
            console.error("Error creating quick invoice:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            if (error.code === 'storage/unauthorized') {
                alert("Permission denied. Check Firebase Storage rules.");
            } else {
                alert(`Failed to upload: ${error.message}`);
            }
        } finally {
            setUploading(false);
        }
    };

    const getSymbol = (currencyCode) => {
        const symbols = {
            'USD': '$',
            'INR': '₹',
            'EUR': '€',
            'GBP': '£'
        };
        return symbols[currencyCode] || '$';
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <h1 className="text-3xl font-bold text-white">Invoice Management</h1>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setShowQuickUpload(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Quick Upload
                        </Button>
                        <Link to="/admin/create-invoice">
                            <Button variant="primary">
                                <Plus className="mr-2 h-4 w-4" />
                                Create New
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-8">
                    {/* Filters */}
                    <div className="flex gap-4 mb-8">
                        {['All', 'Paid', 'Pending'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    filter === status
                                        ? "bg-neon-blue text-black"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 text-left">
                                    <th className="py-4 px-4 text-gray-500 font-medium">ID</th>
                                    <th className="py-4 px-4 text-gray-500 font-medium">Client</th>
                                    <th className="py-4 px-4 text-gray-500 font-medium">Date</th>
                                    <th className="py-4 px-4 text-gray-500 font-medium">Amount</th>
                                    <th className="py-4 px-4 text-gray-500 font-medium">Status</th>
                                    <th className="py-4 px-4 text-gray-500 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4 text-white font-mono">{invoice.invoiceNumber || invoice.id}</td>
                                        <td className="py-4 px-4 text-white">{invoice.clientName}</td>
                                        <td className="py-4 px-4 text-gray-400">{new Date(invoice.createdAt || Date.now()).toLocaleDateString()}</td>
                                        <td className="py-4 px-4 text-white">{getSymbol(invoice.currency)}{invoice.amount.toLocaleString()}</td>
                                        <td className="py-4 px-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                invoice.status === 'Paid' ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                                            )}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleCopyLink(invoice.id)}
                                                    className="p-2 text-gray-400 hover:text-neon-blue transition-colors"
                                                    title="Copy Link"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    className="p-2 text-gray-400 hover:text-white transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(invoice.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Quick Upload Modal */}
            {showQuickUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <Card className="w-full max-w-md p-6 relative border-neon-blue">
                        <button
                            onClick={() => setShowQuickUpload(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-bold text-white mb-6">Quick Invoice Upload</h2>
                        <form onSubmit={handleQuickUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Client Name</label>
                                <Input
                                    value={quickClientName}
                                    onChange={(e) => setQuickClientName(e.target.value)}
                                    placeholder="Enter client name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Upload PDF Invoice</label>
                                <Input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setQuickFile(e.target.files[0])}
                                    className="bg-transparent border-white/20"
                                    required
                                />
                            </div>
                            <Button type="submit" variant="primary" className="w-full" disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Upload & Create'}
                            </Button>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default InvoiceManagement;
