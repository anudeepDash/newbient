import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, CheckCircle, XCircle, Upload, QrCode, Search, FileText, Download, Trash2, Sparkles, Filter, ShieldCheck, Clock, Ticket, Mail, Copy, Plus, X, ArrowRight, Eye, ChevronDown, DollarSign } from 'lucide-react';
import { useStore } from '../../lib/store';
import { notifySpecificUser, notifyAdmins } from '../../lib/notificationTriggers';
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
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'settings', 'vault', 'negotiated'
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState('all');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadCategory, setUploadCategory] = useState('all');

    // Negotiated Price Link State
    const [customPrice, setCustomPrice] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);

    // Manual Ticket State
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [viewingTicketId, setViewingTicketId] = useState(null);
    const order = ticketOrders.find(o => o.id === viewingTicketId);
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
            const order = ticketOrders.find(o => o.id === id);
            if (order && order.userId) {
                await notifySpecificUser(
                    order.userId,
                    'TICKET VERIFIED!',
                    `YOUR ACCESS FOR "${order.eventTitle.toUpperCase()}" HAS BEEN GRANTED. DOWNLOAD YOUR ASSET NOW.`,
                    '/profile',
                    'ticket'
                );
            }
        }
    };

    const handleReject = async (id) => {
        if (window.confirm("Decline this transaction?")) {
            await rejectTicketOrder(id);
            const order = ticketOrders.find(o => o.id === id);
            if (order && order.userId) {
                await notifySpecificUser(
                    order.userId,
                    'VERIFICATION FAILED',
                    `YOUR TRANSACTION FOR "${order.eventTitle.toUpperCase()}" WAS DECLINED. CONTACT SUPPORT IF THIS IS AN ERROR.`,
                    '/contact',
                    'ticket'
                );
            }
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
        data.append("resource_type", "raw"); // Force raw for PDFs to ensure reliable byte storage

        try {
            // Unsigned upload endpoint
            const res = await fetch("https://api.cloudinary.com/v1_1/dgtalrz4n/upload", { 
                method: "POST", 
                body: data 
            });
            const uploadedFile = await res.json();
            
            if (uploadedFile.error) {
                console.error("Cloudinary Error:", uploadedFile.error);
                return null;
            }
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

    // Redesigned Stats for the "Control Desk"
    const stats = [
        { 
            label: 'Total Revenue', 
            value: `₹${ticketOrders.filter(o => o.status === 'approved' && (!selectedEventId || o.eventId === selectedEventId)).reduce((acc, o) => acc + o.totalAmount, 0).toLocaleString()}`, 
            icon: DollarSign, color: 'text-neon-green', bg: 'bg-neon-green/10' 
        },
        { 
            label: 'Pending Verification', 
            value: pendingOrders.filter(o => !selectedEventId || o.eventId === selectedEventId).length, 
            icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' 
        },
        { 
            label: 'Verified Orders', 
            value: approvedOrders.filter(o => !selectedEventId || o.eventId === selectedEventId).length, 
            icon: ShieldCheck, color: 'text-neon-blue', bg: 'bg-neon-blue/10' 
        },
        { 
            label: 'Vault Inventory', 
            value: ticketVault.filter(t => !selectedEventId || t.eventId === selectedEventId).length, 
            icon: Upload, color: 'text-neon-pink', bg: 'bg-neon-pink/10' 
        },
    ];

    const generateCustomLink = (e) => {
        e.preventDefault();
        if (!selectedEventId || !customPrice) return;
        const url = new URL(window.location.origin + '/ticket-selection');
        url.searchParams.set('event', selectedEventId);
        url.searchParams.set('customPrice', customPrice);
        url.searchParams.set('discountEventId', selectedEventId);
        url.searchParams.set('buy', 'true');
        
        setGeneratedLink(url.toString());
        setCopiedLink(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const selectedEvent = upcomingEvents.find(e => e.id === selectedEventId);
    const ticketedEvents = upcomingEvents.filter(e => e.isTicketed);

    return (
        <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden pb-32">
            {/* Immersive Cinematic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-green/5 rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[180px] animate-pulse delay-1000" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">
                {/* Standardized Premium Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-16 gap-10">
                    <div className="space-y-4 max-w-full">
                        <div className="flex flex-wrap items-center gap-4">
                            <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-neon-green transition-colors uppercase text-[10px] font-black tracking-[0.3em] group">
                                <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> Back to Admin Dashboard
                            </Link>
                            {selectedEventId && (
                                <button onClick={() => setSelectedEventId(null)} className="relative z-[60] inline-flex items-center gap-2 text-neon-blue hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] group">
                                    <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Event Selection
                                </button>
                            )}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">
                            TICKETING <span className="text-neon-green px-4">PORTAL.</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] pl-1 flex items-center gap-3">
                            {selectedEventId ? selectedEvent?.title : 'Strategic Access Control'} <span className="w-1 h-1 rounded-full bg-neon-green" /> Verifier Node v4.0
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch gap-4 w-full xl:w-auto">
                        {selectedEventId && (
                            <Button
                                onClick={() => setIsManualModalOpen(true)}
                                className="h-20 px-10 rounded-[2rem] bg-neon-blue text-black font-black uppercase italic tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgba(0,255,255,0.25)] flex items-center gap-4 group"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
                                <span>Issue Manual Ticket</span>
                            </Button>
                        )}
                        {selectedEventId && (
                            <div className="bg-white/5 border border-white/10 p-2 rounded-[2rem] backdrop-blur-3xl flex items-center gap-2">
                                {[
                                    { id: 'pending', label: `Verification`, icon: ShieldCheck },
                                    { id: 'approved', label: 'Verified', icon: CheckCircle },
                                    { id: 'vault', label: 'Vault', icon: Upload },
                                    { id: 'negotiated', label: 'Negotiated', icon: DollarSign },
                                    { id: 'settings', label: 'Config', icon: QrCode }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "px-6 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                            activeTab === tab.id 
                                                ? "bg-white text-black shadow-xl scale-105" 
                                                : "text-gray-500 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <tab.icon size={14} />
                                        <span className="hidden sm:inline">
                                            {tab.id === 'pending' ? `${tab.label} (${pendingOrders.filter(o => o.eventId === selectedEventId).length})` : tab.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Control Desk Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    {stats.map((stat, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={stat.label}
                            className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-2xl group hover:border-white/20 transition-all hover:bg-zinc-900/60"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className={cn("p-3 rounded-2xl shrink-0", stat.bg)}>
                                    <stat.icon size={20} className={stat.color} />
                                </div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">{stat.label}</span>
                            </div>
                            <div className="text-3xl font-black italic tracking-tighter text-white uppercase">{stat.value}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Filter & Search Dashboard */}
                {(activeTab === 'pending' || activeTab === 'approved') && (
                    <div className="flex flex-col lg:flex-row gap-6 mb-12 items-stretch">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-green transition-colors" size={20} />
                            <input 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Identify by ref code, email or name..."
                                className="w-full bg-zinc-900/30 border border-white/10 h-20 pl-20 pr-8 rounded-[2rem] text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40 outline-none transition-all placeholder:text-gray-700 bg-black/20"
                            />
                        </div>
                        <div className="relative w-full lg:w-96 group">
                            <Filter className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-pink transition-colors" size={20} />
                            <select
                                className="w-full bg-zinc-900/30 border border-white/10 h-20 pl-20 pr-10 rounded-[2rem] text-[11px] font-black uppercase tracking-widest focus:border-neon-pink/40 outline-none appearance-none cursor-pointer transition-all text-white bg-black/20"
                                value={eventFilter}
                                onChange={(e) => setEventFilter(e.target.value)}
                            >
                                <option value="all" className="bg-[#020202]">Global Sector - All Events</option>
                                {upcomingEvents.map(event => (
                                    <option key={event.id} value={event.id} className="bg-[#020202]">{event.title}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" size={16} />
                        </div>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {!selectedEventId ? (
                        <motion.div
                            key="event-selector"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32"
                        >
                            {ticketedEvents.map((event, idx) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => setSelectedEventId(event.id)}
                                    className="relative group cursor-pointer bg-zinc-900/40 border border-white/5 rounded-[3rem] overflow-hidden aspect-[4/5] hover:border-neon-blue/40 transition-all duration-500"
                                >
                                    <div className="absolute inset-0">
                                        <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-1000" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                    </div>
                                    <div className="absolute inset-0 p-10 flex flex-col justify-end">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 rounded-full bg-neon-blue/20 border border-neon-blue/30 text-neon-blue text-[8px] font-black uppercase tracking-widest">
                                                    {event.date?.split('T')[0] || 'Upcoming'}
                                                </span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                                                    {ticketOrders.filter(o => o.eventId === event.id && o.status === 'approved').length} Sold
                                                </span>
                                            </div>
                                            <h3 className="text-3xl font-black italic uppercase text-white group-hover:text-neon-blue transition-colors leading-tight">{event.title}</h3>
                                            <div className="pt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                                <span className="text-[10px] font-black text-neon-blue uppercase tracking-[0.2em]">Open Command Center</span>
                                                <ArrowRight className="text-neon-blue" size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {ticketedEvents.length === 0 && (
                                <div className="col-span-full py-40 bg-zinc-900/10 border border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center gap-6">
                                    <Ticket size={48} className="text-gray-800" />
                                    <div className="text-center">
                                        <h4 className="text-lg font-black italic text-gray-600 uppercase">Registry Clear</h4>
                                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mt-1">No ticketed events are currently live in the system.</p>
                                    </div>
                                    <Link to="/admin/upcoming-events">
                                        <Button className="h-12 px-8 bg-neon-blue text-black font-black uppercase tracking-widest rounded-xl mt-4">Initialize Event</Button>
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <>
                        {/* Filter & Search Dashboard */}
                        {(activeTab === 'pending' || activeTab === 'approved') && (
                            <div className="flex flex-col lg:flex-row gap-6 mb-12 items-stretch animate-in fade-in slide-in-from-top-4">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-green transition-colors" size={20} />
                                    <input 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Identify by ref code, email or name..."
                                        className="w-full bg-zinc-900/30 border border-white/10 h-20 pl-20 pr-8 rounded-[2rem] text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40 outline-none transition-all placeholder:text-gray-700 bg-black/20"
                                    />
                                </div>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {activeTab === 'settings' ? (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="max-w-4xl mx-auto pb-32"
                                >
                                    <Card className="p-12 md:p-16 bg-zinc-900/20 backdrop-blur-3xl border border-white/10 rounded-[4rem]">
                                        <div className="flex items-center gap-6 mb-12">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-neon-blue/10 flex items-center justify-center border border-neon-blue/20">
                                                <QrCode className="text-neon-blue" size={32} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Gateway Protocol</h2>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Financial Interface Configuration</p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSaveSettings} className="space-y-10">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">UPI Merchant Identifier</label>
                                                    <Input
                                                        value={settingsForm.upiId || ''}
                                                        onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                                                        placeholder="merchant@bank"
                                                        className="h-16 bg-black/40 border-white/10 rounded-[1.5rem] font-mono text-center text-neon-blue text-sm focus:ring-4 ring-neon-blue/5"
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">QR Generation Buffer</label>
                                                    <div className="h-16 flex items-center justify-center bg-black/20 rounded-[1.5rem] border border-white/5 text-[10px] font-black text-neon-green tracking-widest italic">
                                                        <ShieldCheck size={16} className="mr-2" /> Dynamic Generation Enabled
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Operational Instructions</label>
                                                <textarea
                                                    className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-sm font-medium h-48 focus:border-neon-blue/50 outline-none transition-all placeholder:text-gray-800"
                                                    placeholder="Specify step-by-step payment verification requirements..."
                                                    value={settingsForm.instructions || ''}
                                                    onChange={(e) => setSettingsForm({ ...settingsForm, instructions: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-black/20 p-10 rounded-[3rem] border border-white/5">
                                                <div className="relative group">
                                                    <div className="absolute -inset-4 bg-neon-blue/5 rounded-full blur-3xl group-hover:bg-neon-blue/10 transition-all opacity-0 group-hover:opacity-100" />
                                                    <div className="relative p-10 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center">
                                                        {settingsForm.upiId ? (
                                                            <img
                                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${settingsForm.upiId}&pn=NewBi Entertainment&cu=INR`)}`}
                                                                alt="Merchant QR"
                                                                className="w-48 h-48"
                                                            />
                                                        ) : (
                                                            <div className="w-48 h-48 flex items-center justify-center text-gray-200">
                                                                <QrCode size={64} className="animate-pulse" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-6">
                                                    <div className="space-y-2">
                                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Endpoint Reliability</div>
                                                        <div className="text-lg font-black italic text-neon-green flex items-center gap-2">99.9% Uptime Ensured</div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Active Resolution</div>
                                                        <div className="font-mono text-sm text-gray-400 break-all">{settingsForm.upiId || 'NO_IDENTIFIER'}</div>
                                                    </div>
                                                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[9px] font-bold text-orange-500 uppercase tracking-widest text-center leading-relaxed">
                                                        * QR updates automatically based on UPI ID above.
                                                    </div>
                                                </div>
                                            </div>

                                            <Button type="submit" className="w-full bg-white text-black font-black uppercase tracking-[0.2em] text-[11px] h-20 rounded-[2rem] hover:scale-[1.02] transition-all shadow-2xl group">
                                                Commit Interface Configuration <ArrowRight size={16} className="ml-3 group-hover:translate-x-2 transition-transform" />
                                            </Button>
                                        </form>
                                    </Card>
                                </motion.div>
                            ) : activeTab === 'vault' ? (
                                <motion.div
                                    key="vault"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="pb-32"
                                >
                                    <TicketVaultTab 
                                        ticketVault={ticketVault}
                                        upcomingEvents={upcomingEvents}
                                        initialEventId={selectedEventId}
                                        onAddTicket={addTicketToVault}
                                        onDeleteTicket={deleteTicketFromVault}
                                        handleFileUpload={handleFileUpload}
                                    />
                                </motion.div>
                            ) : activeTab === 'negotiated' ? (
                                <motion.div
                                    key="negotiated"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="max-w-2xl mx-auto pb-32"
                                >
                                    <Card className="p-12 bg-zinc-900 border border-white/10 rounded-[2.5rem] relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2 flex items-center gap-2">
                                                <DollarSign className="text-neon-blue" size={20} />
                                                Generate Negotiated Price Link
                                            </h3>
                                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-8">
                                                {selectedEvent?.title}
                                            </p>

                                            <form onSubmit={generateCustomLink} className="space-y-8">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Negotiated Price (₹)</label>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g. 499"
                                                        value={customPrice}
                                                        onChange={(e) => setCustomPrice(e.target.value)}
                                                        required
                                                        className="h-16 bg-black/50 border-white/10 rounded-2xl uppercase text-lg font-black tracking-widest focus:border-neon-blue/50 px-8 text-neon-blue"
                                                    />
                                                    <p className="text-[9px] text-gray-500 pl-1 uppercase font-bold tracking-widest">
                                                        Base Ticket Price: ₹{selectedEvent?.ticketPrice}
                                                    </p>
                                                </div>
                                                
                                                {!generatedLink ? (
                                                    <Button type="submit" className="w-full h-16 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                                                        Generate Access Signal
                                                    </Button>
                                                ) : (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                                        <div className="p-6 bg-black/60 rounded-2xl border border-white/10 flex items-center gap-4">
                                                            <p className="text-[10px] text-neon-blue font-black truncate flex-1 tracking-wider uppercase">
                                                                {generatedLink}
                                                            </p>
                                                            <button 
                                                                type="button" 
                                                                onClick={copyToClipboard}
                                                                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all shrink-0"
                                                            >
                                                                {copiedLink ? <CheckCircle size={18} /> : <Copy size={18} />}
                                                            </button>
                                                        </div>
                                                        <Button type="button" onClick={() => { setGeneratedLink(''); setCustomPrice(''); }} className="w-full h-14 bg-white/5 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 border border-white/5">
                                                            Create Another Link
                                                        </Button>
                                                    </div>
                                                )}
                                            </form>
                                            
                                            <div className="mt-10 p-6 rounded-2xl bg-neon-blue/5 border border-neon-blue/10">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                                                    * This link will bypass the main event selection and open the ticket category selection directly with the negotiated price applied.
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="orders"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-8 pb-32"
                                >
                                    <div className="flex items-center justify-between px-4">
                                        <h3 className="text-xs font-black italic uppercase tracking-[0.3em] text-gray-500">
                                            {activeTab === 'pending' ? 'Verification Stream' : 'Archive Registry'} - {filteredOrders.filter(o => o.eventId === selectedEventId).length} Records
                                        </h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-8">
                                        {filteredOrders.filter(o => o.eventId === selectedEventId).length > 0 ? (
                                            filteredOrders.filter(o => o.eventId === selectedEventId).map((order, idx) => (
                                                <motion.div
                                                    layout
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                                                    key={order.id}
                                                >
                                                    <Card className="relative overflow-hidden p-1 bg-zinc-900/30 border border-white/5 rounded-[3rem] group hover:border-white/20 transition-all hover:bg-zinc-900/50">
                                                        <div className="p-8 md:p-10 flex flex-col xl:flex-row xl:items-center justify-between gap-12">
                                                            <div className="flex-1 space-y-10">
                                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                                                    <div className="space-y-2">
                                                                        <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter text-white uppercase leading-none">{order.customerName}</h3>
                                                                        <div className="flex flex-wrap items-center gap-3">
                                                                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 tracking-widest uppercase">{order.customerEmail}</div>
                                                                            <div className="px-3 py-1 rounded-full bg-neon-blue/5 border border-neon-blue/10 text-[9px] font-black text-neon-blue font-mono">#{order.bookingRef}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {order.items?.map((item, idx) => (
                                                                            <div key={idx} className="relative group/tag">
                                                                                <div className="absolute -inset-1 bg-neon-pink/20 rounded-full blur opacity-0 group-hover/tag:opacity-100 transition-opacity" />
                                                                                <span className="relative px-5 py-2 rounded-full text-[10px] font-black bg-zinc-900 border border-neon-pink/30 text-neon-pink uppercase">
                                                                                    {item.count}X {item.name}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                                                                    <div className="space-y-3">
                                                                        <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Project Destination</div>
                                                                        <p className="text-sm font-bold text-gray-200 uppercase flex items-center gap-2">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                                                            {order.eventTitle}
                                                                        </p>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Authorized Entry</div>
                                                                        <p className="text-2xl font-black text-white italic leading-none">₹{order.totalAmount.toLocaleString()}</p>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Security Token</div>
                                                                        <div className="flex items-center gap-3">
                                                                            <p className="font-mono text-[11px] text-gray-400 select-all group-hover:text-neon-blue transition-colors truncate max-w-[150px]">{order.paymentRef}</p>
                                                                            <button onClick={() => { navigator.clipboard.writeText(order.paymentRef); alert("Ref Copied!"); }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-600 hover:text-white transition-all">
                                                                                <Copy size={12} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Logged Sequence</div>
                                                                        <p className="text-sm font-bold text-gray-500 uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-4 min-w-[240px] pt-8 xl:pt-0 border-t xl:border-t-0 xl:border-l border-white/5 xl:pl-10">
                                                                {activeTab === 'pending' ? (
                                                                    <div className="grid grid-cols-1 gap-4">
                                                                        <Button 
                                                                            onClick={() => handleApprove(order.id)} 
                                                                            className="h-16 bg-neon-green text-black font-black uppercase italic text-[11px] rounded-[1.25rem] hover:scale-105 transition-all shadow-[0_15px_30px_rgba(57,255,20,0.15)] group"
                                                                        >
                                                                            <CheckCircle size={18} className="mr-3 group-hover:scale-110 transition-transform" /> Confirm Verification
                                                                        </Button>
                                                                        <Button 
                                                                            onClick={() => handleReject(order.id)} 
                                                                            variant="outline" 
                                                                            className="h-16 border-white/10 bg-white/5 text-gray-500 font-black uppercase text-[11px] rounded-[1.25rem] hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/40 transition-all"
                                                                        >
                                                                            <XCircle size={18} className="mr-3" /> Terminate Order
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col gap-3">
                                                                        {order.fulfillmentStatus === 'fulfilled' || order.ticketUrl ? (
                                                                            <div className="space-y-3">
                                                                                <Button onClick={() => setViewingTicketId(order.id)} className="w-full bg-white text-black font-black uppercase text-[10px] h-14 rounded-[1.25rem] hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                                                                                    <Mail size={16} /> Get Email Script
                                                                                </Button>
                                                                                {order.ticketUrl && (
                                                                                    <Link to={order.ticketUrl} target="_blank" className="block">
                                                                                        <Button variant="outline" className="w-full border-white/10 bg-zinc-900 text-gray-400 font-black uppercase text-[10px] h-12 rounded-xl hover:text-white hover:border-white/20">
                                                                                            <Eye size={14} className="mr-2" /> View Asset
                                                                                        </Button>
                                                                                    </Link>
                                                                                )}
                                                                            </div>
                                                                        ) : order.fulfillmentStatus === 'on_hold' ? (
                                                                            <div className="p-6 rounded-[1.5rem] bg-orange-500/5 border border-orange-500/20 text-center space-y-3">
                                                                                <div className="text-orange-500 text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                                                                                    <Clock size={16} className="animate-pulse" /> Queued in Vault
                                                                                </div>
                                                                                <p className="text-gray-500 text-[9px] uppercase font-bold leading-relaxed">Waiting for ticket inventory matching "{order.items?.[0]?.name}"</p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="relative group/upload">
                                                                                <div className="absolute inset-0 bg-neon-blue/10 blur-xl opacity-0 group-hover/upload:opacity-100 transition-opacity" />
                                                                                <Button className="relative w-full bg-black/40 border border-white/10 text-gray-400 font-black uppercase text-[10px] h-16 rounded-[1.25rem] group-hover/upload:text-white transition-all flex items-center justify-center gap-3">
                                                                                    {isUploading ? <Clock size={20} className="animate-spin" /> : <Upload size={20} />} 
                                                                                    {isUploading ? 'Ingest...' : 'Attach Manifest'}
                                                                                </Button>
                                                                                <input
                                                                                    type="file"
                                                                                    onChange={(e) => handleTicketUpload(order.id, e.target.files[0])}
                                                                                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                                                    disabled={isUploading}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        
                                                                        <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5">
                                                                            <div className={cn(
                                                                                "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg",
                                                                                order.ticketSent ? "bg-neon-green/10 text-neon-green" : "bg-yellow-500/10 text-yellow-500"
                                                                            )}>
                                                                                {order.ticketSent ? 'Transferred' : 'In Pipeline'}
                                                                            </div>
                                                                            <button onClick={() => handleDelete(order.id)} className="p-2 text-gray-700 hover:text-red-500 transition-all hover:scale-110">
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="text-center py-40 bg-zinc-900/10 border border-dashed border-white/5 rounded-[4rem]">
                                                <div className="inline-flex p-10 rounded-full bg-white/5 border border-white/5 mb-6 text-gray-800">
                                                    <Sparkles size={48} className="opacity-20" />
                                                </div>
                                                <h4 className="text-lg font-black italic text-gray-600 uppercase tracking-tighter">Sector Clear</h4>
                                                <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em] max-w-[200px] mx-auto leading-relaxed mt-2">No active records match the current operational filter.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Manual Ticket Modal */}
            <AnimatePresence>
                {isManualModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 bg-black/90 backdrop-blur-md pt-20 pb-20 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full relative shrink-0 max-h-[85vh] md:max-h-[95vh] overflow-y-auto custom-scrollbar"
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
                {viewingTicketId && order && (
                    <div className="fixed inset-0 z-[120] flex items-start md:items-center justify-center p-4 bg-black/95 backdrop-blur-xl pt-20 pb-20 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="max-w-xl w-full relative shrink-0 max-h-[85vh] md:max-h-[95vh] overflow-y-auto custom-scrollbar"
                        >
                            <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 overflow-hidden flex flex-col shadow-2xl relative">
                                <button 
                                    onClick={() => setViewingTicketId(null)}
                                    className="absolute top-8 right-8 p-2 text-white/50 hover:text-white transition-colors z-[130]"
                                >
                                    <X size={24} />
                                </button>

                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                                    <Mail className="text-neon-blue" />
                                    EMAIL DRAFT FOR CLIENT
                                </h3>

                                <div className="space-y-6 text-left">
                                    <div className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Standard Draft</span>
                                            <div className="flex bg-black p-1 rounded-xl border border-white/5 text-[8px] font-black">
                                                <button 
                                                    onClick={() => setEmailOption('attached')}
                                                    className={cn(
                                                        "px-4 py-1.5 uppercase tracking-widest rounded-lg transition-all",
                                                        emailOption === 'attached' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white"
                                                    )}
                                                >Option 1: Attached</button>
                                                <button 
                                                    onClick={() => setEmailOption('later')}
                                                    className={cn(
                                                        "px-4 py-1.5 uppercase tracking-widest rounded-lg transition-all",
                                                        emailOption === 'later' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white"
                                                    )}
                                                >Option 2: Share Later</button>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-black/30 rounded-xl border border-white/5 font-mono text-[10px] text-gray-400 whitespace-pre-wrap leading-relaxed select-all max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {(() => {
                                                const event = upcomingEvents.find(e => e.id === order.eventId) || { title: order.eventTitle };
                                                const locationStr = event.location ? `\nLocation: ${event.location}` : '';
                                                const dateStr = event.date ? `\nDate: ${new Date(event.date).toLocaleDateString()}` : '';
                                                
                                                const ticketsList = (order.ticketUrls || [order.ticketUrl])
                                                    .filter(Boolean)
                                                    .map((url, i) => `Ticket ${i+1}: ${url}`)
                                                    .join('\n');
                                                    
                                                const bodyText = emailOption === 'attached' 
                                                    ? `Your official digital tickets are now ready to be downloaded.\n\nAccess them securely here:\nhttps://newbi.live/ticket/${order.bookingRef}${ticketsList ? `\n\nDirect Download Links:\n${ticketsList}` : ''}`
                                                    : `Your ticket will be shared with you via email shortly. Please keep an eye on your inbox.`;
                                                
                                                return `Hi ${order.customerName},\n\nThank you for your purchase for ${event.title}! ${locationStr}${dateStr}\n\n${bodyText}\n\nYour unique reference code is:\nCODE: ${order.bookingRef}\n\nOrder Details:\n- Item: ${order.items?.[0]?.name || 'Standard Entry'}\n- Amount Paid: ₹${order.totalAmount.toLocaleString()}\n\nNewBi Entertainment`;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Button 
                                            onClick={() => {
                                                const event = upcomingEvents.find(e => e.id === order.eventId) || { title: order.eventTitle };
                                                const locationStr = event.location ? `\nLocation: ${event.location}` : '';
                                                const dateStr = event.date ? `\nDate: ${new Date(event.date).toLocaleDateString()}` : '';
                                                const ticketsList = (order.ticketUrls || [order.ticketUrl])
                                                    .filter(Boolean)
                                                    .map((url, i) => `Ticket ${i+1}: ${url}`)
                                                    .join('\n');
                                                const bodyText = emailOption === 'attached' 
                                                    ? `Your official digital tickets are now ready to be downloaded.\n\nAccess them securely here:\nhttps://newbi.live/ticket/${order.bookingRef}${ticketsList ? `\n\nDirect Download Links:\n${ticketsList}` : ''}`
                                                    : `Your ticket will be shared with you via email shortly. Please keep an eye on your inbox.`;

                                                const content = `Hi ${order.customerName},\n\nThank you for your purchase for ${event.title}! ${locationStr}${dateStr}\n\n${bodyText}\n\nYour unique reference code is:\nCODE: ${order.bookingRef}\n\nOrder Details:\n- Item: ${order.items?.[0]?.name || 'Standard Entry'}\n- Amount Paid: ₹${order.totalAmount.toLocaleString()}\n\nNewBi Entertainment`;
                                                navigator.clipboard.writeText(content);
                                                alert("Email draft copied to clipboard!");
                                            }}
                                            className="h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all text-[10px]"
                                        >
                                            <Copy size={16} />
                                            Copy Draft
                                        </Button>
                                        <Button 
                                            onClick={() => {
                                                const event = upcomingEvents.find(e => e.id === order.eventId) || { title: order.eventTitle };
                                                const locationStr = event.location ? `\nLocation: ${event.location}` : '';
                                                const dateStr = event.date ? `\nDate: ${new Date(event.date).toLocaleDateString()}` : '';
                                                const ticketsList = (order.ticketUrls || [order.ticketUrl])
                                                    .filter(Boolean)
                                                    .map((url, i) => `Ticket ${i+1}: ${url}`)
                                                    .join('\n');
                                                const bodyText = emailOption === 'attached' 
                                                    ? `Your official digital tickets are now ready to be downloaded.\n\nAccess them securely here:\nhttps://newbi.live/ticket/${order.bookingRef}${ticketsList ? `\n\nDirect Download Links:\n${ticketsList}` : ''}`
                                                    : `Your ticket will be shared with you via email shortly. Please keep an eye on your inbox.`;

                                                const subject = encodeURIComponent(`Your Newbi reference code for the ticket`);
                                                const body = encodeURIComponent(`Hi ${order.customerName},\n\nThank you for your purchase for ${event.title}! ${locationStr}${dateStr}\n\n${bodyText}\n\nYour unique reference code is:\nCODE: ${order.bookingRef}\n\nOrder Details:\n- Item: ${order.items?.[0]?.name || 'Standard Entry'}\n- Amount Paid: ₹${order.totalAmount.toLocaleString()}\n\nNewBi Entertainment`);
                                                window.location.href = `mailto:${order.customerEmail}?subject=${subject}&body=${body}`;
                                            }}
                                            className="h-14 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all text-[10px]"
                                        >
                                            <ArrowRight size={16} />
                                            Compose Mail
                                        </Button>
                                    </div>
                                    
                                    <button 
                                        onClick={() => setViewingTicketId(null)}
                                        className="w-full py-4 text-center items-center justify-center text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white transition-colors flex gap-2"
                                    >
                                        <X size={14} /> Close Portal
                                    </button>
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
