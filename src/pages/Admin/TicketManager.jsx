import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Upload, QrCode, Search, FileText, Download, Trash2, Sparkles, Filter, ShieldCheck, Clock, Ticket, Mail, Copy, Plus, X, ArrowRight, Eye } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { sendTicketEmail } from '../../lib/email';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

const TicketManager = () => {
    const { 
        ticketOrders, approveTicketOrder, rejectTicketOrder, deleteTicketOrder, 
        paymentDetails, updatePaymentDetails, updateTicketOrder, upcomingEvents, 
        addTicketOrder, ticketVault, addTicketToVault, deleteTicketFromVault 
    } = useStore();
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'settings', 'vault'
    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState('all');
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

    const [emailOption, setEmailOption] = useState('attached'); // 'attached' or 'later'

    const [settingsForm, setSettingsForm] = useState(paymentDetails);

    const pendingOrders = ticketOrders.filter(o => o.status === 'pending');
    const approvedOrders = ticketOrders.filter(o => o.status === 'approved');

    const filteredOrders = (activeTab === 'pending' ? pendingOrders : approvedOrders).filter(o => {
        const matchesSearch = 
            o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.paymentRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.bookingRef?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesEvent = eventFilter === 'all' || o.eventId === eventFilter;
        
        return matchesSearch && matchesEvent;
    });

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

    const handleSendEmail = (order) => {
        const event = upcomingEvents.find(e => e.id === order.eventId) || { title: order.eventTitle };
        
        const subject = encodeURIComponent(`Your Access Code for ${event.title}`);
        
        let ticketsText = '';
        if (order.ticketUrls && order.ticketUrls.length > 0) {
            ticketsText = `\nTicket Links:\n${order.ticketUrls.map((url, i) => `Ticket ${i+1}: ${url}`).join('\n')}\n`;
        } else if (order.ticketUrl) {
            ticketsText = `\nTicket Link:\n${order.ticketUrl}\n`;
        }

        const bodyText = `Hi ${order.customerName},

Thank you for your purchase for ${event.title}!

Your unique access code for entry is:
CODE: ${order.bookingRef}

Order Details:
- Item: ${order.items?.[0]?.name || 'Standard Entry'}
- Amount Paid: ₹${order.totalAmount.toLocaleString()}
- Transaction ID: ${order.paymentRef || 'N/A'}
${ticketsText}
(A formal ticket PDF might be attached to this email if available).

See you at the event!
NewBi Entertainment`;

        const body = encodeURIComponent(bodyText);
        window.location.href = `mailto:${order.customerEmail}?subject=${subject}&body=${body}`;
        
        // Optionally mark as sent
        if (!order.ticketSent) {
            updateTicketOrder(order.id, { ticketSent: true });
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
            // Using /auto/upload safely accepts both images and pdfs
            const res = await fetch("https://api.cloudinary.com/v1_1/dgtalrz4n/auto/upload", { method: "POST", body: data });
            const uploadedFile = await res.json();
            return uploadedFile.secure_url;
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

    const copyEmailToClipboard = (order, option = 'attached') => {
        const event = upcomingEvents.find(e => e.id === order.eventId) || { title: order.eventTitle };
        const locationStr = event.location ? `\nLocation: ${event.location}` : '';
        const dateStr = event.date ? `\nDate: ${new Date(event.date).toLocaleDateString()}` : '';

        const body = option === 'attached' 
            ? `Your ticket has been attached to this email. Please find it below.`
            : `Your ticket will be shared with you via email in some time. Please keep an eye on your inbox.`;

        const emailContent = `Subject: Your Newbi reference code for the ticket

Hi ${order.customerName},

Thank you for your purchase for ${event.title}! ${locationStr}${dateStr}

${body}

Your unique reference code is:
CODE: ${order.bookingRef}

Order Details:
- Item: ${order.items?.[0]?.name || 'Standard Entry'}
- Amount Paid: ₹${order.totalAmount.toLocaleString()}

NewBi Entertainment`;

        navigator.clipboard.writeText(emailContent);
        alert("Email draft copied to clipboard!");
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
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white">TICKETING</span> PORTAL.
                        </h1>
                    </div>
                    
                    <div className="space-y-4 w-full md:w-auto">
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
                                { id: 'vault', label: 'Ticket Vault', icon: Upload },
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
                        
                        <div className="flex items-center bg-zinc-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="px-6 py-4 bg-white/5 border-r border-white/10 flex items-center gap-3">
                                <Filter className="text-neon-pink" size={18} />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Event Filter</span>
                            </div>
                            <select
                                className="flex-1 bg-transparent text-sm font-black uppercase tracking-widest outline-none px-6 py-4 text-white appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                                value={eventFilter}
                                onChange={(e) => setEventFilter(e.target.value)}
                            >
                                <option value="all" className="bg-zinc-900 text-white font-black">ALL ACTIVE EVENTS AND FESTIVALS</option>
                                {upcomingEvents.map(event => (
                                    <option key={event.id} value={event.id} className="bg-zinc-900 text-white font-black">{event.title}</option>
                                ))}
                            </select>
                        </div>
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
                    ) : activeTab === 'vault' ? (
                        <motion.div
                            key="vault"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <TicketVaultTab 
                                ticketVault={ticketVault}
                                upcomingEvents={upcomingEvents}
                                onAddTicket={addTicketToVault}
                                onDeleteTicket={deleteTicketFromVault}
                                handleFileUpload={handleFileUpload}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="orders"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Search & Intelligence */}
                            <div className="flex flex-col lg:flex-row justify-between gap-6 mb-12">
                                <div className="relative flex-1 group">
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
                                                                {order.fulfillmentStatus === 'fulfilled' || order.ticketUrl ? (
                                                                    <div className="flex flex-col gap-2 w-full">
                                                                        <Button onClick={() => setViewingTicket(order)} className="w-full bg-white/10 border border-white/10 text-white font-black uppercase text-[10px] h-12 rounded-xl hover:bg-white hover:text-black transition-all">
                                                                            <Mail size={14} className="mr-2" /> Get Email Draft
                                                                        </Button>
                                                                        <Button disabled className="w-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue font-black uppercase text-[10px] h-12 rounded-xl opacity-50 cursor-not-allowed transition-all">
                                                                            Dispatch Digital (Soon)
                                                                        </Button>
                                                                    </div>
                                                                ) : order.fulfillmentStatus === 'on_hold' ? (
                                                                    <div className="flex flex-col gap-2 w-full items-center justify-center p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                                                                        <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest"><Clock size={12} className="inline mr-1" /> On Hold</span>
                                                                        <span className="text-gray-400 text-[8px] uppercase font-bold">Waiting for tickets in vault</span>
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
                                                                <div className="flex items-center justify-between px-2 mt-2">
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
                                        <option value="" className="bg-zinc-900 text-white font-black">Select Event...</option>
                                        {upcomingEvents.map(event => (
                                            <option key={event.id} value={event.id} className="bg-zinc-900 text-white font-black">{event.title}</option>
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
                            className="max-w-xl w-full relative"
                        >
                            <button 
                                onClick={() => setViewingTicket(null)}
                                className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 overflow-hidden flex flex-col shadow-2xl">
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                                    <Mail className="text-neon-blue" />
                                    EMAIL DRAFT FOR CLIENT
                                </h3>

                                <div className="space-y-6">
                                    <div className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Standard Draft</span>
                                            <div className="flex bg-black p-1 rounded-xl border border-white/5">
                                                <button 
                                                    onClick={() => setEmailOption('attached')}
                                                    className={cn(
                                                        "px-4 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                        emailOption === 'attached' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white"
                                                    )}
                                                >Option 1: Attached</button>
                                                <button 
                                                    onClick={() => setEmailOption('later')}
                                                    className={cn(
                                                        "px-4 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                        emailOption === 'later' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white"
                                                    )}
                                                >Option 2: Share Later</button>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-black/30 rounded-xl border border-white/5 font-mono text-[10px] text-gray-400 whitespace-pre-wrap leading-relaxed select-all max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {(() => {
                                                const event = upcomingEvents.find(e => e.id === viewingTicket.eventId) || { title: viewingTicket.eventTitle };
                                                const locationStr = event.location ? `\nLocation: ${event.location}` : '';
                                                const dateStr = event.date ? `\nDate: ${new Date(event.date).toLocaleDateString()}` : '';
                                                                                const bodyText = emailOption === 'attached' 
                                                    ? `Your official digital tickets are now ready to be downloaded.\n\nAccess them securely here:\nhttps://newbi-entertainment.vercel.app/ticket/${viewingTicket.bookingRef}`
                                                    : `Your ticket will be shared with you via email shortly. Please keep an eye on your inbox.`;
                                                
                                                return `Hi ${viewingTicket.customerName},\n\nThank you for your purchase for ${event.title}! ${locationStr}${dateStr}\n\n${bodyText}\n\nYour unique reference code is:\nCODE: ${viewingTicket.bookingRef}\n\nOrder Details:\n- Item: ${viewingTicket.items?.[0]?.name || 'Standard Entry'}\n- Amount Paid: ₹${viewingTicket.totalAmount.toLocaleString()}\n\nNewBi Entertainment`;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Button 
                                            onClick={() => {
                                                const event = upcomingEvents.find(e => e.id === viewingTicket.eventId) || { title: viewingTicket.eventTitle };
                                                const locationStr = event.location ? `\nLocation: ${event.location}` : '';
                                                const dateStr = event.date ? `\nDate: ${new Date(event.date).toLocaleDateString()}` : '';
                                                const bodyText = emailOption === 'attached' 
                                                    ? `Your official digital tickets are now ready to be downloaded.\n\nAccess them securely here:\nhttps://newbi.live/ticket/${viewingTicket.bookingRef}`
                                                    : `Your ticket will be shared with you via email shortly. Please keep an eye on your inbox.`;

                                                const content = `Hi ${viewingTicket.customerName},\n\nThank you for your purchase for ${event.title}! ${locationStr}${dateStr}\n\n${bodyText}\n\nYour unique reference code is:\nCODE: ${viewingTicket.bookingRef}\n\nOrder Details:\n- Item: ${viewingTicket.items?.[0]?.name || 'Standard Entry'}\n- Amount Paid: ₹${viewingTicket.totalAmount.toLocaleString()}\n\nNewBi Entertainment`;
                                                navigator.clipboard.writeText(content);
                                                alert("Email draft copied to clipboard!");
                                            }}
                                            className="h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all"
                                        >
                                            <Copy size={16} />
                                            Copy Draft
                                        </Button>
                                        <Button 
                                            onClick={() => {
                                                const event = upcomingEvents.find(e => e.id === viewingTicket.eventId) || { title: viewingTicket.eventTitle };
                                                const locationStr = event.location ? `\nLocation: ${event.location}` : '';
                                                const dateStr = event.date ? `\nDate: ${new Date(event.date).toLocaleDateString()}` : '';
                                                const bodyText = emailOption === 'attached' 
                                                    ? `Your official digital tickets are now ready to be downloaded.\n\nAccess them securely here:\nhttps://newbi.live/ticket/${viewingTicket.bookingRef}`
                                                    : `Your ticket will be shared with you via email shortly. Please keep an eye on your inbox.`;

                                                const subject = encodeURIComponent(`Your Newbi reference code for the ticket`);
                                                const body = encodeURIComponent(`Hi ${viewingTicket.customerName},\n\nThank you for your purchase for ${event.title}! ${locationStr}${dateStr}\n\n${bodyText}\n\nYour unique reference code is:\nCODE: ${viewingTicket.bookingRef}\n\nOrder Details:\n- Item: ${viewingTicket.items?.[0]?.name || 'Standard Entry'}\n- Amount Paid: ₹${viewingTicket.totalAmount.toLocaleString()}\n\nNewBi Entertainment`);
                                                window.location.href = `mailto:${viewingTicket.customerEmail}?subject=${subject}&body=${body}`;
                                            }}
                                            className="h-14 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all"
                                        >
                                            <ArrowRight size={16} />
                                            Compose Mail
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-center text-[10px] text-gray-500 mt-4 uppercase font-bold tracking-widest">
                                    Copy the content above and paste it into your email client or use the compose button.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TicketVaultTab = ({ ticketVault, upcomingEvents, onAddTicket, onDeleteTicket, handleFileUpload }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [ticketCategory, setTicketCategory] = useState('');

    const onFilesSelect = async (e) => {
        if (!selectedEventId || !ticketCategory) {
            alert("Please select event and category first.");
            return;
        }

        const files = Array.from(e.target.files);
        setIsUploading(true);

        try {
            for (const file of files) {
                const url = await handleFileUpload(file);
                if (url) {
                    await onAddTicket({
                        eventId: selectedEventId,
                        category: ticketCategory,
                        url,
                        fileName: file.name
                    });
                }
            }

            // Immediately attempt to fulfill any on_hold orders
            const { attemptAutoFulfill } = useStore.getState();
            if (attemptAutoFulfill) {
                await attemptAutoFulfill();
            }

            alert(`Successfully uploaded ${files.length} tickets. Orders on hold have automatically been assigned tickets.`);
        } catch (error) {
            console.error("Bulk upload failed:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const groupedVault = ticketVault.reduce((acc, ticket) => {
        const key = `${ticket.eventId}-${ticket.category}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(ticket);
        return acc;
    }, {});

    return (
        <div className="space-y-12">
            <Card className="p-8 bg-zinc-900/40 border-white/5 rounded-[2.5rem]">
                <h2 className="text-xl font-black italic uppercase mb-8 flex items-center gap-3">
                    <Upload className="text-neon-blue" /> BULK INGESTION
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Event</label>
                        <select 
                            className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest outline-none focus:border-neon-blue/30 transition-all text-white"
                            value={selectedEventId}
                            onChange={(e) => {
                                setSelectedEventId(e.target.value);
                                setTicketCategory(''); // Reset category when event changes
                            }}
                        >
                            <option value="" className="bg-zinc-900 text-white font-black">Select Event...</option>
                            {upcomingEvents.map(event => (
                                <option key={event.id} value={event.id} className="bg-zinc-900 text-white font-black">{event.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Category / Tier</label>
                        <select 
                            className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest outline-none focus:border-neon-blue/30 transition-all text-white"
                            value={ticketCategory}
                            onChange={(e) => setTicketCategory(e.target.value)}
                            disabled={!selectedEventId}
                        >
                            <option value="" className="bg-zinc-900 text-white font-black">Select Category...</option>
                            {(() => {
                                const selectedEvent = upcomingEvents.find(e => e.id === selectedEventId);
                                const cats = selectedEvent?.ticketCategories || [];
                                const fallbackCats = ['STANDARD TICKET', 'NEGOTIATED TICKET'];
                                
                                // Merge defined categories with fallbacks for simple events
                                const allOptions = [
                                    ...cats.map(c => c.name.toUpperCase()),
                                    ...fallbackCats
                                ];
                                // Keep unique
                                return [...new Set(allOptions)].map((catName, idx) => (
                                    <option key={idx} value={catName} className="bg-zinc-900 text-white font-black">
                                        {catName}
                                    </option>
                                ));
                            })()}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <div className="relative w-full">
                            <Button className={cn(
                                "w-full h-14 uppercase text-[10px] font-black tracking-widest rounded-2xl",
                                isUploading || !selectedEventId || !ticketCategory ? "bg-gray-700 cursor-not-allowed opacity-50" : "bg-neon-blue text-black hover:scale-[1.02]"
                            )}>
                                {isUploading ? "PROCESS INGESTION..." : "SELECT ASSETS (BULK)"}
                            </Button>
                            {!isUploading && selectedEventId && ticketCategory && (
                                <input 
                                    type="file" 
                                    multiple 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={onFilesSelect}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {Object.entries(groupedVault).map(([key, tickets]) => {
                    const [eventId, category] = key.split('-');
                    const event = upcomingEvents.find(e => e.id === eventId);
                    return (
                        <Card key={key} className="p-8 bg-[#111] border border-white/5 rounded-[2.5rem] flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="px-3 py-1 rounded-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-[8px] font-black">
                                        {category}
                                    </span>
                                    <span className="text-[10px] font-black text-white">{tickets.length} ASSETS</span>
                                </div>
                                <h3 className="text-lg font-black italic uppercase text-white truncate mb-4">{event?.title || 'Unknown Event'}</h3>
                            </div>
                            
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar mb-6 px-1">
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                                        <span className="text-[8px] font-medium text-gray-500 truncate mr-2">{ticket.fileName || 'Asset'}</span>
                                        <button onClick={() => onDeleteTicket(ticket.id)} className="text-gray-600 hover:text-red-500">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="pt-4 border-t border-white/5 h-2 bg-gradient-to-r from-neon-blue/20 to-transparent rounded-full" />
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default TicketManager;
