import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Upload, QrCode, Search, FileText, Download, Trash2, Sparkles, Filter, ShieldCheck, Clock, Ticket } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { sendTicketEmail } from '../../lib/email';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import html2canvas from 'html2canvas';

const TicketManager = () => {
    const { ticketOrders, approveTicketOrder, rejectTicketOrder, deleteTicketOrder, paymentDetails, updatePaymentDetails, updateTicketOrder } = useStore();
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'settings'
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadCategory, setUploadCategory] = useState('all');

    // Manual Ticket State
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [viewingTicket, setViewingTicket] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [manualTicket, setManualTicket] = useState({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        eventId: '',
        eventTitle: '',
        totalAmount: '',
        paymentRef: 'MANUAL_OFFLINE',
        items: []
    });

    const { upcomingEvents, addTicketOrder } = useStore();

    const [settingsForm, setSettingsForm] = useState(paymentDetails);

    const pendingOrders = ticketOrders.filter(o => o.status === 'pending');
    const approvedOrders = ticketOrders.filter(o => o.status === 'approved');

    const filteredOrders = (activeTab === 'pending' ? pendingOrders : approvedOrders).filter(o =>
        o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.paymentRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.bookingRef?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleApprove = async (id) => {
        if (window.confirm("Confirm payment verification? This will authorize ticket issuance.")) {
            await approveTicketOrder(id);
        }
    };

    const handleReject = async (id) => {
        if (window.confirm("Decline this transaction?")) {
            await rejectTicketOrder(id);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("PERMANENT REMOVAL: This will erase the transaction record. Proceed?")) {
            await deleteTicketOrder(id);
        }
    };

    const handleSendEmail = async (order) => {
        if (!order.ticketUrl) {
            alert("Authorization pending: Upload manifest first.");
            return;
        }

        const confirmSend = window.confirm(`Dispatch digital credentials to ${order.customerEmail}?`);
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
                alert("Transmission successful.");
            } else {
                alert("Protocol failure: Verify API configuration.");
            }
        } catch (error) {
            console.error("Transmission error:", error);
            alert("System error during dispatch.");
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        await updatePaymentDetails(settingsForm);
        alert("Configuration updated.");
    };

    const handleFileUpload = async (file) => {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "maw1e4ud");
        data.append("cloud_name", "dgtalrz4n");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dgtalrz4n/image/upload", { method: "POST", body: data });
            const uploadedImage = await res.json();
            return uploadedImage.secure_url;
        } catch (error) {
            console.error("Storage error:", error);
            return null;
        }
    };

    const handleTicketUpload = async (orderId, file) => {
        if (!file) return;
        setIsUploading(true);
        const url = await handleFileUpload(file);
        if (url) {
            await updateTicketOrder(orderId, { ticketUrl: url, ticketSent: true });
        }
        setIsUploading(false);
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        const event = upcomingEvents.find(ev => ev.id === manualTicket.eventId);
        if (!event) return alert("Please select an event.");

        const bookingRef = `NB-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        await addTicketOrder({
            ...manualTicket,
            eventTitle: event.title,
            bookingRef,
            status: 'approved', // Manually issued tickets are pre-approved
            createdAt: new Date().toISOString(),
            items: [{ name: 'Manual Entry', price: Number(manualTicket.totalAmount), count: 1 }]
        });

        setIsManualModalOpen(false);
        setManualTicket({
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            eventId: '',
            eventTitle: '',
            totalAmount: '',
            paymentRef: 'MANUAL_OFFLINE',
            items: []
        });
        alert(`Ticket Issued! Ref: ${bookingRef}`);
    };

    const downloadTicket = async (orderId) => {
        const ticketElement = document.getElementById(`ticket-preview-${orderId}`);
        if (!ticketElement) return;

        setIsDownloading(true);
        try {
            const canvas = await html2canvas(ticketElement, {
                backgroundColor: '#0a0a0a',
                scale: 2,
                logging: false,
                useCORS: true
            });
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `Ticket_${orderId}.png`;
            link.click();
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to generate ticket image.");
        }
        setIsDownloading(false);
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden pb-20">
            {/* Immersive Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32">
                {/* Modern Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
                    <div className="space-y-2">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest mb-4 group">
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                        </Link>
                        <h1 className="text-4xl lg:text-5xl font-black font-heading tracking-tighter uppercase italic">
                            ORDER <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white">LOGS.</span>
                        </h1>
                    </div>

                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
                        <button
                            onClick={() => setIsManualModalOpen(true)}
                            className="flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-neon-blue text-black mr-2 hover:scale-105"
                        >
                            <Plus size={14} /> Issue Manual Ticket
                        </button>
                        {[
                            { id: 'pending', label: 'Verification', count: pendingOrders.length, icon: Clock },
                            { id: 'approved', label: 'Archived', count: approvedOrders.length, icon: ShieldCheck },
                            { id: 'settings', label: 'Payment Config', icon: QrCode }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab.id 
                                        ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)]" 
                                        : "text-gray-500 hover:text-white"
                                )}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-md text-[8px]",
                                        activeTab === tab.id ? "bg-black/10 text-black" : "bg-white/5 text-gray-500"
                                    )}>{tab.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'settings' ? (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="max-w-3xl mx-auto p-12 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem]">
                                <h2 className="text-xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                                    <QrCode className="text-neon-blue" /> TRANSACTION SETTINGS
                                </h2>
                                <form onSubmit={handleSaveSettings} className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">UPI Identifier</label>
                                        <Input
                                            value={settingsForm.upiId || ''}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                                            placeholder="merchant@bank"
                                            className="h-14 bg-black/50 border-white/5 rounded-2xl font-mono"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Operational Instructions</label>
                                        <textarea
                                            className="w-full bg-black/50 border border-white/5 rounded-2xl p-6 text-sm font-medium h-40 focus:border-neon-blue/50 outline-none transition-all placeholder:text-gray-700"
                                            placeholder="Enter structured payment requirements..."
                                            value={settingsForm.instructions || ''}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, instructions: e.target.value })}
                                        />
                                    </div>

                                    {/* Visionary QR Preview */}
                                    <div className="bg-black/30 p-8 rounded-[2.5rem] border border-white/5">
                                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Execution Preview (₹1.00 Verification)</h3>
                                        <div className="flex flex-col md:flex-row items-center gap-12">
                                            <div className="p-6 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                                                {settingsForm.upiId ? (
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${settingsForm.upiId}&pn=NewBi Entertainment&am=1&cu=INR`)}`}
                                                        alt="Verified QR"
                                                        className="w-40 h-40"
                                                    />
                                                ) : (
                                                    <div className="w-40 h-40 flex items-center justify-center text-gray-200">
                                                        <QrCode size={40} className="animate-pulse" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Status</p>
                                                    <p className="text-sm font-bold text-neon-green flex items-center gap-2">
                                                        <ShieldCheck size={16} /> SECURE PROTOCOL ACTIVE
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Target Endpoint</p>
                                                    <p className="font-mono text-sm text-gray-400">{settingsForm.upiId || 'PENDING_CONFIG'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full bg-white text-black font-black uppercase text-xs h-16 rounded-2xl hover:scale-[1.02] transition-all">
                                        Commit Configuration
                                    </Button>
                                </form>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="orders"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Search & Intelligence */}
                            <div className="flex flex-col md:flex-row justify-between gap-6 mb-12">
                                <div className="relative flex-1 max-w-2xl group">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={20} />
                                    <input
                                        placeholder="Search by client identifier, reference, or booking hash..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-16 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] pl-16 pr-8 text-sm font-medium focus:border-neon-blue/50 outline-none transition-all placeholder:text-gray-700"
                                    />
                                </div>
                            </div>

                            {/* Stream of Orders */}
                            <div className="grid grid-cols-1 gap-6">
                                {filteredOrders.length > 0 ? (
                                    filteredOrders.map((order) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            key={order.id}
                                        >
                                            <Card className="p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] group hover:border-white/10 transition-all">
                                                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-12">
                                                    {/* Visual Identity */}
                                                    <div className="flex-1 space-y-6">
                                                        <div className="flex items-start justify-between">
                                                            <div className="space-y-1">
                                                                <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase">{order.customerName}</h3>
                                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{order.customerEmail}</p>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {order.items?.map((item, idx) => (
                                                                    <span key={idx} className="px-3 py-1.5 rounded-full text-[10px] font-black bg-white/5 border border-white/10 text-neon-pink uppercase">
                                                                        {item.count}X {item.name}
                                                                    </span>
                                                                ))}
                                                                {order.bookingRef && (
                                                                    <span className="px-3 py-1.5 rounded-full text-[10px] font-black bg-neon-blue/10 border border-neon-blue/20 text-neon-blue font-mono">
                                                                        ID: {order.bookingRef}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                                            <div className="space-y-1">
                                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Project/Event</span>
                                                                <p className="text-xs font-bold text-gray-300 uppercase underline decoration-neon-green/30 decoration-2 underline-offset-4">{order.eventTitle}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Financial Value</span>
                                                                <p className="text-sm font-black text-white italic">₹{order.totalAmount.toLocaleString()}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Transaction Ref</span>
                                                                <p className="font-mono text-[10px] text-gray-400 select-all group-hover:text-neon-blue transition-colors">{order.paymentRef}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Logged On</span>
                                                                <p className="text-xs font-bold text-gray-500 uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Strategic Actions */}
                                                    <div className="flex flex-row xl:flex-col gap-3 min-w-[200px]">
                                                        {activeTab === 'pending' ? (
                                                            <>
                                                                <Button onClick={() => handleApprove(order.id)} className="flex-1 bg-neon-green text-black font-black uppercase text-[10px] h-14 rounded-2xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(57,255,20,0.1)]">
                                                                    <CheckCircle size={16} className="mr-2" /> Verify
                                                                </Button>
                                                                <Button onClick={() => handleReject(order.id)} variant="outline" className="flex-1 border-white/5 bg-white/5 text-gray-400 font-bold uppercase text-[10px] h-14 rounded-2xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all">
                                                                    <XCircle size={16} className="mr-2" /> Decline
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {order.ticketUrl ? (
                                                                    <div className="flex flex-col gap-2 w-full">
                                                                        <Button onClick={() => setViewingTicket(order)} className="w-full bg-white/10 border border-white/10 text-white font-black uppercase text-[10px] h-12 rounded-xl hover:bg-white hover:text-black transition-all">
                                                                            <Eye size={14} className="mr-2" /> View Ticket
                                                                        </Button>
                                                                        <Button onClick={() => handleSendEmail(order)} className="w-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue font-black uppercase text-[10px] h-12 rounded-xl hover:bg-neon-blue hover:text-black transition-all">
                                                                            Dispatch Digital
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="relative group/upload">
                                                                        <Button className="w-full bg-white/5 border border-white/10 text-gray-400 font-black uppercase text-[10px] h-14 rounded-2xl hover:bg-white hover:text-black transition-all">
                                                                            <Upload size={16} className="mr-2" /> Attach Manifest
                                                                        </Button>
                                                                        <input
                                                                            type="file"
                                                                            onChange={(e) => handleTicketUpload(order.id, e.target.files[0])}
                                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center justify-between px-2">
                                                                    <div className={cn(
                                                                        "text-[8px] font-black uppercase tracking-widest",
                                                                        order.ticketSent ? "text-neon-green" : "text-yellow-500"
                                                                    )}>
                                                                        {order.ticketSent ? 'TRANSFERRED' : 'IN_QUEUE'}
                                                                    </div>
                                                                    <button onClick={() => handleDelete(order.id)} className="p-2 text-gray-700 hover:text-red-500 transition-colors">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="text-center py-32 space-y-4">
                                        <div className="inline-flex p-8 rounded-full bg-white/5 border border-white/5 mb-4">
                                            <Search size={40} className="text-gray-800" />
                                        </div>
                                        <p className="text-sm font-black text-gray-500 uppercase tracking-widest italic">Inventory clear for current query.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Manual Ticket Modal */}
            <AnimatePresence>
                {isManualModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full relative"
                        >
                            <button onClick={() => setIsManualModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8 flex items-center gap-3">
                                <Plus size={24} className="text-neon-blue" />
                                MANUAL TICKET ISSUANCE
                            </h2>

                            <form onSubmit={handleManualSubmit} className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Event</label>
                                    <select 
                                        required
                                        className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest outline-none focus:border-neon-blue/30 transition-all text-white"
                                        value={manualTicket.eventId}
                                        onChange={(e) => setManualTicket({...manualTicket, eventId: e.target.value})}
                                    >
                                        <option value="">Select Event...</option>
                                        {upcomingEvents.map(event => (
                                            <option key={event.id} value={event.id}>{event.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Customer Name</label>
                                    <Input 
                                        required
                                        placeholder="RAHUL VERMA"
                                        value={manualTicket.customerName}
                                        onChange={(e) => setManualTicket({...manualTicket, customerName: e.target.value})}
                                        className="h-14 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Phone Number</label>
                                    <Input 
                                        required
                                        placeholder="+91 00000 00000"
                                        value={manualTicket.customerPhone}
                                        onChange={(e) => setManualTicket({...manualTicket, customerPhone: e.target.value})}
                                        className="h-14 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                                    <Input 
                                        required
                                        type="email"
                                        placeholder="ENTRY@NEWBIENT.COM"
                                        value={manualTicket.customerEmail}
                                        onChange={(e) => setManualTicket({...manualTicket, customerEmail: e.target.value})}
                                        className="h-14 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Amount Paid (₹)</label>
                                    <Input 
                                        required
                                        type="number"
                                        placeholder="0.00"
                                        value={manualTicket.totalAmount}
                                        onChange={(e) => setManualTicket({...manualTicket, totalAmount: e.target.value})}
                                        className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-lg font-black tracking-widest px-6 text-neon-green"
                                    />
                                </div>

                                <Button type="submit" className="col-span-2 h-16 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all mt-4">
                                    Generate & Issue Ticket
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Ticket Preview Modal */}
            <AnimatePresence>
                {viewingTicket && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="max-w-md w-full relative"
                        >
                            <button 
                                onClick={() => setViewingTicket(null)}
                                className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>

                            {/* Actual Ticket Element to Capture */}
                            <div 
                                id={`ticket-preview-${viewingTicket.id}`}
                                className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl"
                                style={{ width: '400px', margin: '0 auto' }}
                            >
                                {/* Ticket Header */}
                                <div className="h-48 bg-zinc-900 relative flex flex-col items-center justify-center p-8 border-b border-dashed border-white/20 text-center">
                                    <div className="absolute top-4 left-4">
                                        <img src="/logo_full.png" alt="Logo" className="h-6 opacity-80" />
                                    </div>
                                    <h2 className="text-3xl font-black font-heading text-white italic tracking-tighter uppercase leading-none mb-2 mt-4">
                                        {viewingTicket.eventTitle}
                                    </h2>
                                    <div className="flex items-center gap-2 text-neon-blue font-black text-[10px] uppercase tracking-widest bg-neon-blue/10 px-3 py-1 rounded-full border border-neon-blue/20">
                                        Confirmed Access
                                    </div>

                                    {/* Perforation holes logic style visually */}
                                    <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-black border border-white/10 rounded-full" />
                                    <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-black border border-white/10 rounded-full" />
                                </div>

                                {/* Ticket Details */}
                                <div className="p-10 space-y-8 flex-1">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Guest Name</p>
                                            <h3 className="text-xl font-black uppercase italic tracking-tight text-white">{viewingTicket.customerName}</h3>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Booking ID</p>
                                            <p className="font-mono text-xs font-bold text-neon-green">{viewingTicket.bookingRef}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Entry Tier</p>
                                            <p className="text-xs font-bold text-gray-200 uppercase">{viewingTicket.items?.[0]?.name || 'Standard'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Value Paid</p>
                                            <p className="text-xs font-bold text-gray-200">₹{viewingTicket.totalAmount.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* QR Section */}
                                    <div className="flex flex-col items-center justify-center pt-8 border-t border-white/5 gap-4">
                                        <div className="p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(viewingTicket.bookingRef)}`} 
                                                alt="QR Code" 
                                                className="w-24 h-24"
                                            />
                                        </div>
                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.4em]">Scan for entry validation</p>
                                    </div>
                                </div>

                                {/* Ticket Footer */}
                                <div className="p-6 bg-black/60 border-t border-white/5 text-center">
                                    <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">
                                        Produced by NewBi Entertainment &copy; {new Date().getFullYear()}
                                    </p>
                                </div>
                            </div>

                            {/* Download Action */}
                            <Button 
                                onClick={() => downloadTicket(viewingTicket.id)}
                                disabled={isDownloading}
                                className="w-full mt-10 h-16 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all"
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Generating Manifest...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        Download Digital Ticket
                                    </>
                                )}
                            </Button>
                            <p className="text-center text-[10px] text-gray-500 mt-4 uppercase font-bold tracking-widest">
                                Attach this image to your manual email dispatch
                            </p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TicketManager;
