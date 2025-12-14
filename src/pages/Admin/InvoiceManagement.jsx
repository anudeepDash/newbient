import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Copy, ArrowLeft, Plus } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

const InvoiceManagement = () => {
    const { invoices, updateInvoiceStatus, deleteInvoice } = useStore();
    const [filter, setFilter] = useState('All');

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
                    <Link to="/admin/create-invoice">
                        <Button variant="primary">
                            <Plus className="mr-2 h-4 w-4" />
                            Create New
                        </Button>
                    </Link>
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
                                        <td className="py-4 px-4 text-white font-mono">{invoice.id}</td>
                                        <td className="py-4 px-4 text-white">{invoice.clientName}</td>
                                        <td className="py-4 px-4 text-gray-400">{new Date().toLocaleDateString()}</td>
                                        <td className="py-4 px-4 text-white">${invoice.amount.toLocaleString()}</td>
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
        </div>
    );
};

export default InvoiceManagement;
