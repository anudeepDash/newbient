import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Share2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

const InvoiceGenerator = () => {
    const navigate = useNavigate();
    const { addInvoice } = useStore();

    const [formData, setFormData] = useState({
        clientName: '',
        email: '',
        phone: '',
        serviceDescription: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
        currency: 'USD',
        taxRate: 18
    });
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const currencies = [
        { code: 'USD', symbol: '$', label: 'US Dollar' },
        { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
        { code: 'EUR', symbol: '€', label: 'Euro' },
        { code: 'GBP', symbol: '£', label: 'British Pound' }
    ];

    const getSymbol = () => {
        const curr = currencies.find(c => c.code === formData.currency);
        return curr ? curr.symbol : '$';
    };

    const [lineItems, setLineItems] = useState([
        { id: 1, description: '', quantity: 1, price: 0 }
    ]);

    const handleAddItem = () => {
        setLineItems([...lineItems, { id: Date.now(), description: '', quantity: 1, price: 0 }]);
    };

    const handleRemoveItem = (id) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id, field, value) => {
        setLineItems(lineItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const calculateSubtotal = () => {
        return lineItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        return subtotal + (subtotal * (formData.taxRate / 100));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        let pdfUrl = null;
        if (file) {
            try {
                const storageRef = ref(storage, `invoices/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                pdfUrl = await getDownloadURL(storageRef);
            } catch (error) {
                console.error("Error uploading file:", error);
                alert("Failed to upload PDF. Continuing without it.");
            }
        }

        const newInvoice = {
            invoiceNumber: `NEWBI-${Math.floor(100000 + Math.random() * 900000)}`,
            ...formData,
            items: lineItems,
            amount: calculateTotal(),
            status: 'Pending',
            createdAt: new Date().toISOString(),
            pdfUrl: pdfUrl
        };

        try {
            const docRef = await addInvoice(newInvoice);

            const invoiceLink = `${window.location.origin}/invoice/${docRef.id}`;

            // Allow time for state update before determining next steps
            // Using confirm instead of alert so user acknowledges before navigation
            if (window.confirm(`Invoice Generated Successfully!\n\nReference: ${newInvoice.invoiceNumber}\nClick OK to return to the invoice list, or Cancel to stay here.`)) {
                // Ensure navigation happens
                setTimeout(() => navigate('/admin/invoices'), 50);
            }
        } catch (error) {
            console.error("Failed to generate invoice:", error);
            alert("An error occurred while generating the invoice. Please try again.");
        }
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <Link to="/admin" className="text-gray-400 hover:text-white flex items-center transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white">New Invoice</h1>
                </div>

                <Card className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Client Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Client Name</label>
                                <Input
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Service Description</label>
                                <Input
                                    value={formData.serviceDescription}
                                    onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                                    placeholder="e.g. Event Production"
                                />
                            </div>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Attach Existing PDF (Optional)</label>
                            <Input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="bg-transparent border-white/20"
                            />
                            <p className="text-xs text-gray-500 mt-1">If uploaded, this PDF will be served to the client instead of the generated one.</p>
                        </div>

                        {/* Currency Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Currency</label>
                            <select
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            >
                                {currencies.map(c => (
                                    <option key={c.code} value={c.code}>{c.label} ({c.symbol})</option>
                                ))}
                            </select>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Issue Date</label>
                                <Input
                                    type="date"
                                    value={formData.issueDate}
                                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Due Date</label>
                                <Input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Line Items */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">Line Items</h3>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Item
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {lineItems.map((item) => (
                                    <div key={item.id} className="flex gap-4 items-start">
                                        <div className="flex-grow">
                                            <Input
                                                placeholder="Description"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="w-20">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <div className="w-32">
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="Price"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="p-3 text-red-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totals & Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/10">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Notes</label>
                                <textarea
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all resize-none h-32"
                                    placeholder="Additional notes or payment instructions..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between text-gray-400">
                                    <span>Subtotal</span>
                                    <span>{getSymbol()}{calculateSubtotal().toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <span>Tax Rate (%)</span>
                                        <Input
                                            type="number"
                                            className="w-16 h-8 text-right p-1"
                                            value={formData.taxRate}
                                            onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <span>{getSymbol()}{(calculateSubtotal() * (formData.taxRate / 100)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-white text-xl font-bold pt-4 border-t border-white/10">
                                    <span>Total</span>
                                    <span className="text-neon-green">{getSymbol()}{calculateTotal().toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-8">
                            <Button type="submit" variant="primary" className="w-full md:w-auto" disabled={uploading}>
                                <Save className="mr-2 h-4 w-4" />
                                {uploading ? 'Generating...' : 'Generate Invoice'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default InvoiceGenerator;
