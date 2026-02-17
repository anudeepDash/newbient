import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Upload, QrCode, Search, FileText, Download, Trash2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { sendTicketEmail } from '../../lib/email';
import { motion, AnimatePresence } from 'framer-motion';

const TicketManager = () => {
    const { ticketOrders, approveTicketOrder, rejectTicketOrder, deleteTicketOrder, paymentDetails, updatePaymentDetails, updateTicketOrder } = useStore();
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'settings'
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadCategory, setUploadCategory] = useState('all'); // 'all' or specific category name

    // Settings State
    const [settingsForm, setSettingsForm] = useState(paymentDetails);

    const pendingOrders = ticketOrders.filter(o => o.status === 'pending');
    const approvedOrders = ticketOrders.filter(o => o.status === 'approved');

    const filteredOrders = (activeTab === 'pending' ? pendingOrders : approvedOrders).filter(o =>
        o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.paymentRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.bookingRef?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleApprove = async (id) => {
        if (window.confirm("Confirm payment received? This will generate a Booking ID.")) {
            await approveTicketOrder(id);
        }
    };

    const handleReject = async (id) => {
        if (window.confirm("Reject this order?")) {
            await rejectTicketOrder(id);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("ARE YOU SURE? This will permanently delete this order history.")) {
            await deleteTicketOrder(id);
        }
    };

    const handleSendEmail = async (order) => {
        if (!order.ticketUrl) {
            alert("No ticket generated yet. Upload a ticket first.");
            return;
        }

        const confirmSend = window.confirm(`Send ticket email to ${order.customerEmail}?`);
        if (!confirmSend) return;

        try {
            const result = await sendTicketEmail(
                order.customerName,
                order.customerEmail,
                order.ticketUrl,
                order.eventTitle,
                order.bookingRef
            );

            if (result.success) {
                alert("Email sent successfully!");
                // Optionally update order status to indicate email sent
            } else {
                alert("Failed to send email. Check API keys.");
            }
        } catch (error) {
            console.error("Email send error:", error);
            alert("Error sending email.");
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        await updatePaymentDetails(settingsForm);
        alert("Payment settings updated!");
    };

    // Bulk Upload Handlers
    const handleBulkUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        let matchCount = 0;
        let autoCount = 0;

        // 1. Get orders that need tickets (Approved & No URL)
        let ordersNeedingTickets = approvedOrders.filter(o => !o.ticketUrl);

        // Filter by category if selected
        if (uploadCategory !== 'all') {
            ordersNeedingTickets = ordersNeedingTickets.filter(o =>
                o.items && o.items.some(item => item.name === uploadCategory)
            );
        }

        if (ordersNeedingTickets.length === 0) {
            alert(`No orders found needing tickets${uploadCategory !== 'all' ? ` for category '${uploadCategory}'` : ''}.`);
            setIsUploading(false);
            return;
        }

        // arrays to track what we've handled
        const filesToProcess = [...files];
        const assignedUpdates = [];

        // 2. First Pass: Smart Match by Booking ID
        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i];
            const filename = file.name;

            // Find order where Booking Ref is in filename
            const matchIndex = ordersNeedingTickets.findIndex(order =>
                order.bookingRef && filename.includes(order.bookingRef)
            );

            if (matchIndex !== -1) {
                const order = ordersNeedingTickets[matchIndex];

                // Mock Upload (Replace with handleFileUpload(file) in real usage)
                // const url = await handleFileUpload(file);
                // For demo/mvp without cloud credentials active:
                const url = URL.createObjectURL(file); // Temporary blob URL for demo

                assignedUpdates.push({ id: order.id, updates: { ticketUrl: url, ticketSent: true } });

                // Remove from pool
                ordersNeedingTickets.splice(matchIndex, 1);
                filesToProcess.splice(i, 1);
                i--; // adjust index since we removed file
                matchCount++;
            }
        }

        // 3. Second Pass: Sequential Assignment (Greedy)
        // Only if there are files left and orders left
        if (filesToProcess.length > 0 && ordersNeedingTickets.length > 0) {
            const confirmAuto = window.confirm(
                `Matched ${matchCount} files by ID.\n` +
                `${filesToProcess.length} files remain and ${ordersNeedingTickets.length} orders need tickets.\n\n` +
                `Auto-assign remaining files sequentially?`
            );

            if (confirmAuto) {
                while (filesToProcess.length > 0 && ordersNeedingTickets.length > 0) {
                    const file = filesToProcess.shift();
                    const order = ordersNeedingTickets.shift();

                    const url = URL.createObjectURL(file);
                    assignedUpdates.push({ id: order.id, updates: { ticketUrl: url, ticketSent: true } });
                    autoCount++;
                }
            }
        }

        // 4. Apply Updates
        for (const update of assignedUpdates) {
            await updateTicketOrder(update.id, update.updates);
        }

        alert(`Process Complete!\nID Matches: ${matchCount}\nAuto-Assigned: ${autoCount}`);
        setIsUploading(false);
    };

    // Helper to upload single file (placeholder logic for now)
    const handleFileUpload = async (file) => {
        // ... (reuse Cloudinary logic from GalleryManager if needed)
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "maw1e4ud");
        data.append("cloud_name", "dgtalrz4n");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dgtalrz4n/image/upload", { method: "POST", body: data });
            const uploadedImage = await res.json();
            return uploadedImage.secure_url;
        } catch (error) {
            console.error("Error uploading:", error);
            alert("Upload failed");
            return null;
        }
    };

    const handleTicketUpload = async (orderId, file) => {
        if (!file) return;
        setIsUploading(true);
        const url = await handleFileUpload(file);
        if (url) {
            await updateTicketOrder(orderId, { ticketUrl: url, ticketSent: true });
            alert("Ticket uploaded and marked as sent!");
        }
        setIsUploading(false);
    };

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/admin" className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Ticket Manager</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-sm transition-colors ${activeTab === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        Pending ({pendingOrders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('approved')}
                        className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-sm transition-colors ${activeTab === 'approved' ? 'bg-neon-green/20 text-neon-green' : 'text-gray-400 hover:text-white'}`}
                    >
                        Approved ({approvedOrders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-sm transition-colors ${activeTab === 'settings' ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-400 hover:text-white'}`}
                    >
                        Payment Settings
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'settings' ? (
                    <Card className="max-w-xl p-8 border-neon-blue/30">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><QrCode /> Payment Configuration</h2>
                        <form onSubmit={handleSaveSettings} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">UPI ID</label>
                                <Input
                                    value={settingsForm.upiId || ''}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                                    placeholder="merchant@bank"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Detailed Instructions</label>
                                <textarea
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-white resize-none h-32"
                                    placeholder="Enter payment instructions for the user..."
                                    value={settingsForm.instructions || ''}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, instructions: e.target.value })}
                                />
                            </div>


                            {/* Live UPI QR Preview */}
                            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                <h3 className="text-sm font-bold text-white mb-2">Live UPI QR Preview</h3>
                                <p className="text-xs text-gray-400 mb-4">This is how the dynamic QR will look for a ₹1 test amount.</p>
                                {settingsForm.upiId ? (
                                    <div className="flex items-center gap-4 p-3 rounded-xl border border-white/10 w-fit">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${settingsForm.upiId}&pn=NewBi Entertainment&am=1&cu=INR`)}`}
                                            alt="Live QR Preview"
                                            className="w-32 h-32"
                                        />
                                        <div className="text-xs text-gray-300">
                                            <p className="font-bold mb-1 uppercase text-white">Scan to Test</p>
                                            <p className="font-mono text-[10px] text-gray-400">{settingsForm.upiId}</p>
                                            <p className="text-neon-green font-bold mt-2">₹1.00</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 italic">Enter a UPI ID above to see preview.</div>
                                )}
                            </div>
                            <Button type="submit" variant="primary" className="w-full">Save Settings</Button>
                        </form>
                    </Card>
                ) : (
                    <>
                        {/* Search & Bulk Actions */}
                        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <Input
                                    placeholder="Search by name, reference, or booking ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            {activeTab === 'approved' && (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={uploadCategory}
                                        onChange={(e) => setUploadCategory(e.target.value)}
                                        className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-green/50"
                                    >
                                        <option value="all">All Categories</option>
                                        {[...new Set(approvedOrders.flatMap(o => o.items?.map(i => i.name) || []))].map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>

                                    <div className="relative overflow-hidden">
                                        <Button variant="outline" className="border-neon-green/50 text-neon-green hover:bg-neon-green/10">
                                            <Upload className="mr-2 h-4 w-4" /> Bulk Upload {uploadCategory !== 'all' ? `(${uploadCategory})` : ''}
                                        </Button>
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.jpg,.png"
                                            onChange={handleBulkUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Orders List */}
                        <div className="space-y-4">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <Card key={order.id} className="p-6 border-white/10 hover:border-white/20 transition-all">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            {/* Order Details */}
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h3 className="text-xl font-bold text-white">{order.customerName}</h3>
                                                    {order.items && order.items.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {order.items.map((item, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 rounded text-xs font-bold bg-neon-pink/20 text-neon-pink uppercase border border-neon-pink/30 flex items-center gap-1">
                                                                    <span className="bg-neon-pink text-black px-1 rounded-[2px]">{item.count}</span> {item.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-gray-400 uppercase">{order.ticketCount} Tickets</span>
                                                    )}
                                                    {order.bookingRef && (
                                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-neon-blue/20 text-neon-blue font-mono">{order.bookingRef}</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
                                                    <div>
                                                        <span className="block text-gray-500 text-xs uppercase">Event</span>
                                                        {order.eventTitle}
                                                    </div>
                                                    <div>
                                                        <span className="block text-gray-500 text-xs uppercase">Amount</span>
                                                        ₹{order.totalAmount}
                                                    </div>
                                                    <div>
                                                        <span className="block text-gray-500 text-xs uppercase">Payment Ref</span>
                                                        <span className="text-white font-mono select-all">{order.paymentRef}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-gray-500 text-xs uppercase">Date</span>
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2 min-w-[150px]">
                                                {activeTab === 'pending' ? (
                                                    <>
                                                        <Button onClick={() => handleApprove(order.id)} className="w-full bg-neon-green/20 text-neon-green hover:bg-neon-green hover:text-black">
                                                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                                        </Button>
                                                        <Button onClick={() => handleReject(order.id)} variant="outline" className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10">
                                                            <XCircle className="mr-2 h-4 w-4" /> Reject
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {order.ticketUrl ? (
                                                            <>
                                                                <a href={order.ticketUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-2 rounded bg-white/10 text-white hover:bg-white/20 text-sm font-bold">
                                                                    View Ticket
                                                                </a>
                                                                <Button onClick={() => handleSendEmail(order)} variant="outline" className="w-full border-neon-blue/50 text-neon-blue hover:bg-neon-blue/10 text-xs">
                                                                    Send Email
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <div className="relative">
                                                                <Button variant="outline" className="w-full border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-white">
                                                                    <Upload className="mr-2 h-4 w-4" /> Upload Ticket
                                                                </Button>
                                                                <input
                                                                    type="file"
                                                                    onChange={(e) => handleTicketUpload(order.id, e.target.files[0])}
                                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className={`text-xs text-center font-bold uppercase ${order.ticketSent ? 'text-neon-green' : 'text-yellow-500'}`}>
                                                            {order.ticketSent ? 'Ticket Sent' : 'Processing'}
                                                        </div>
                                                        <Button onClick={() => handleDelete(order.id)} variant="ghost" className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-400 text-xs h-8">
                                                            <Trash2 className="mr-2 h-3 w-3" /> Delete Order
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    No {activeTab} orders found.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TicketManager;
