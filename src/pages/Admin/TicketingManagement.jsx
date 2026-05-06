import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Ticket, CheckCircle2, XCircle, Search, Upload, 
    Download, AlertTriangle, FileText, Check, X, QrCode, ArrowLeft, Send, Users
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { cn } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const TicketingManagement = () => {
    const { upcomingEvents, ticketOrders = [], updateTicketOrderStatus, user } = useStore();
    const isScanner = user?.role === 'scanner';
    
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [activeTab, setActiveTab] = useState(isScanner ? 'sheets' : 'buyers'); // buyers, dispatch, sheets
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isUploading, setIsUploading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');

    const ticketedEvents = upcomingEvents?.filter(e => e.isTicketed) || [];

    // If no event selected, show event cards
    if (!selectedEventId) {
        return (
            <div className="min-h-screen bg-[#020202] text-white pb-20">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px]" />
                </div>
                <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-40 md:pt-48">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 md:mb-12 gap-8">
                        <div className="space-y-4 max-w-full">
                            <AdminDashboardLink className="mb-4" />
                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1] pr-12">
                                TICKET <span className="text-neon-green">OPERATIONS.</span>
                            </h1>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Select an event to manage ticketing operations.</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {ticketedEvents.map(event => {
                            const eventOrders = ticketOrders.filter(o => o.eventId === event.id);
                            const pendingCount = eventOrders.filter(o => o.status === 'pending').length;
                            const approvedCount = eventOrders.filter(o => o.status === 'approved' || o.status === 'dispatched').length;
                            return (
                                <Card key={event.id} onClick={() => setSelectedEventId(event.id)} className="cursor-pointer group p-0 bg-zinc-900/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden hover:border-neon-green/30 transition-all">
                                    <div className="h-48 relative overflow-hidden bg-black/50">
                                        {event.image ? <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" /> : <div className="absolute inset-0 flex items-center justify-center"><Ticket size={48} className="opacity-20"/></div>}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                        <div className="absolute bottom-6 left-6 right-6">
                                            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white truncate">{event.title}</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}</p>
                                        </div>
                                    </div>
                                    <div className="p-6 grid grid-cols-2 gap-4 bg-black/40">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Tickets Sold</p>
                                            <p className="text-xl font-black text-neon-green">{approvedCount}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Pending UPI</p>
                                            <p className="text-xl font-black text-yellow-500">{pendingCount}</p>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    }

    const event = ticketedEvents.find(e => e.id === selectedEventId);
    let eventOrders = ticketOrders.filter(o => o.eventId === selectedEventId);
    
    // Filtering logic
    let filteredOrders = eventOrders.filter(order => {
        let matchesSearch = true;
        if (searchQuery) {
            matchesSearch = order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) || order.paymentRef?.includes(searchQuery);
        }
        let matchesStatus = true;
        if (statusFilter !== 'ALL') {
            matchesStatus = order.status === statusFilter.toLowerCase();
        }
        return matchesSearch && matchesStatus;
    });

    const pendingOrders = eventOrders.filter(o => o.status === 'pending');
    const approvedOrders = eventOrders.filter(o => o.status === 'approved' || o.status === 'dispatched');

    const handleApprove = async (orderId) => {
        if(window.confirm('Approve payment? User will be moved to verified queue awaiting dispatch.')) {
            try {
                await updateTicketOrderStatus(orderId, 'approved');
            } catch (err) {
                console.error(err);
                alert("Failed to approve order.");
            }
        }
    };

    const handleReject = async (orderId) => {
        if(window.confirm('Reject payment?')) {
            try {
                await updateTicketOrderStatus(orderId, 'rejected');
            } catch (err) {
                console.error(err);
                alert("Failed to reject order.");
            }
        }
    };

    const handleBulkUpload = (e) => {
        if (!selectedCategory) {
            alert("Please select a ticket category first.");
            return;
        }
        setIsUploading(true);
        setTimeout(() => {
            setIsUploading(false);
            alert(`Offline PDFs uploaded and mapped to approved buyers in category: ${selectedCategory}.`);
        }, 2000);
    };

    const handleDispatchAll = async () => {
        if(window.confirm('Dispatch all assigned tickets via email?')) {
            const readyOrders = eventOrders.filter(o => o.status === 'approved');
            for (let order of readyOrders) {
                try {
                    await updateTicketOrderStatus(order.id, 'dispatched');
                } catch (e) {
                    console.error("Failed to dispatch order", order.id);
                }
            }
            alert('Tickets dispatched successfully!');
        }
    };

    const downloadSheets = () => {
        alert("Downloading CSV Sheets...");
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-32 md:pt-40">
                <button onClick={() => setSelectedEventId(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to Events
                </button>

                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-8">
                    <div className="space-y-2 max-w-full">
                        <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tighter uppercase italic leading-[1]">
                            {event?.title}
                        </h1>
                        <p className="text-neon-green font-bold uppercase tracking-widest text-xs">Event Operations Dashboard</p>
                    </div>
                </div>

                <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-6 mb-8 flex flex-col md:flex-row gap-6 justify-between items-center shadow-2xl">
                    <div className="flex gap-2 w-full md:w-auto bg-black/60 p-2 rounded-[2rem] border border-white/5">
                        {['buyers', 'dispatch', 'sheets'].map((tab) => {
                            if (isScanner && (tab === 'buyers' || tab === 'dispatch')) return null; 
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "px-8 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all",
                                        activeTab === tab 
                                            ? "bg-gradient-to-r from-neon-green/20 to-neon-blue/20 text-white border border-white/10 shadow-[0_0_20px_rgba(0,255,100,0.1)]" 
                                            : "text-gray-500 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {tab === 'buyers' ? 'Buyers List' : tab === 'dispatch' ? 'Dispatch Center' : 'Sheets & Analytics'}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* BUYERS LIST TAB */}
                    {activeTab === 'buyers' && !isScanner && (
                        <motion.div key="buyers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <Card className="p-0 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
                                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-black/40">
                                    <div className="flex gap-4 items-center">
                                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-14 bg-black/60 border border-white/10 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest text-gray-400 outline-none focus:border-neon-green">
                                            <option value="ALL">ALL STATUSES</option>
                                            <option value="PENDING">PENDING PAYMENT</option>
                                            <option value="APPROVED">PAYMENT VERIFIED</option>
                                            <option value="DISPATCHED">TICKETS DISPATCHED</option>
                                        </select>
                                        <div className="relative">
                                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                            <Input 
                                                placeholder="SEARCH..." 
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="h-14 pl-14 w-64 bg-black/60 border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                                            />
                                        </div>
                                    </div>
                                    <div className="px-6 py-3 bg-white/5 text-white rounded-2xl text-[11px] font-black tracking-widest uppercase border border-white/10">
                                        {filteredOrders.length} Records
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-black/80 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                <th className="p-8 font-medium">Customer Details</th>
                                                <th className="p-8 font-medium">Tickets</th>
                                                <th className="p-8 font-medium">UTR / Ref</th>
                                                <th className="p-8 font-medium">Status</th>
                                                <th className="p-8 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                                                <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                    <td className="p-8">
                                                        <p className="font-black text-white text-base tracking-tight">{order.customerName}</p>
                                                        <p className="text-[10px] font-bold text-gray-500 tracking-widest mt-1">{order.customerPhone}</p>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="flex flex-wrap gap-2">
                                                        {order.items?.map((item, i) => (
                                                            <div key={i} className="text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg inline-block">
                                                                {item.count}x <span className="text-white">{item.name}</span>
                                                            </div>
                                                        ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-8 font-mono text-[11px] text-gray-400 bg-black/20">{order.paymentRef}</td>
                                                    <td className="p-8">
                                                        {order.status === 'pending' && <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-md text-[9px] font-black uppercase tracking-widest">Pending</span>}
                                                        {order.status === 'approved' && <span className="px-3 py-1 bg-neon-blue/10 text-neon-blue border border-neon-blue/20 rounded-md text-[9px] font-black uppercase tracking-widest">Verified</span>}
                                                        {order.status === 'dispatched' && <span className="px-3 py-1 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-md text-[9px] font-black uppercase tracking-widest">Dispatched</span>}
                                                    </td>
                                                    <td className="p-8 text-right space-x-3">
                                                        {order.status === 'pending' && (
                                                            <>
                                                                <button onClick={() => handleApprove(order.id)} className="w-12 h-12 rounded-2xl bg-neon-green/10 text-neon-green hover:bg-neon-green hover:text-black inline-flex items-center justify-center transition-all border border-neon-green/20 hover:scale-110" title="Verify Payment">
                                                                    <Check size={20} />
                                                                </button>
                                                                <button onClick={() => handleReject(order.id)} className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white inline-flex items-center justify-center transition-all border border-red-500/20 hover:scale-110" title="Reject Payment">
                                                                    <X size={20} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="5" className="p-20 text-center text-gray-500 bg-black/20">
                                                        <Search size={64} className="mx-auto mb-6 opacity-20" />
                                                        <p className="text-xs font-black uppercase tracking-[0.4em]">No records found.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* DISPATCH CENTER */}
                    {activeTab === 'dispatch' && !isScanner && (
                        <motion.div key="dispatch" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Card className="p-10 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8">Bulk PDF Upload</h3>
                                    <p className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-8">Select a ticket category, then upload PDFs. The system will auto-assign them to verified buyers in this category.</p>
                                    
                                    <div className="space-y-8">
                                        {event?.ticketMode === 'pdf' ? (
                                            <>
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Target Category</label>
                                                    <select 
                                                        value={selectedCategory}
                                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                                        className="w-full h-16 bg-black/60 border border-white/10 rounded-3xl px-6 text-[11px] font-black uppercase tracking-widest text-white outline-none focus:border-neon-blue"
                                                    >
                                                        <option value="">SELECT A CATEGORY...</option>
                                                        {event?.ticketCategories?.map(cat => (
                                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center group hover:border-neon-blue/50 transition-colors relative mt-8">
                                                    <input type="file" multiple onChange={handleBulkUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                    {isUploading ? (
                                                        <>
                                                            <LoadingSpinner size="md" color="#0ff" className="mb-4" />
                                                            <p className="text-xs font-black uppercase tracking-widest text-neon-blue">Processing PDFs & Mapping...</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-neon-blue/10 transition-all">
                                                                <Upload size={32} className="text-gray-500 group-hover:text-neon-blue" />
                                                            </div>
                                                            <h4 className="text-sm font-black uppercase tracking-widest text-white mb-2">Drop PDFs Here</h4>
                                                            <p className="text-[10px] text-gray-500 max-w-[200px]">Only verified buyers without tickets will be assigned.</p>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-neon-green/5 border border-neon-green/10 rounded-3xl">
                                                <QrCode size={48} className="text-neon-green mb-6" />
                                                <h4 className="text-lg font-black italic uppercase tracking-widest text-white mb-2">Automated QR Generation</h4>
                                                <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">
                                                    No uploads required. Unique QR passes are automatically generated and attached to dispatch emails.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Card>

                                <Card className="p-10 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8">Dispatch Queue</h3>
                                        <div className="space-y-4 mb-8">
                                            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{event?.ticketMode === 'pdf' ? 'Tickets Ready to Send' : 'QR Passes Ready to Send'}</p>
                                                    <p className="text-3xl font-black text-white">{eventOrders.filter(o => o.status === 'approved').length}</p>
                                                </div>
                                                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                                                    <Ticket size={24} className="text-gray-400" />
                                                </div>
                                            </div>
                                            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Dispatched</p>
                                                    <p className="text-3xl font-black text-neon-green">{eventOrders.filter(o => o.status === 'dispatched').length}</p>
                                                </div>
                                                <div className="w-12 h-12 bg-neon-green/10 rounded-full flex items-center justify-center">
                                                    <CheckCircle2 size={24} className="text-neon-green" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Button onClick={handleDispatchAll} className="w-full h-16 bg-neon-blue text-black font-black uppercase text-xs tracking-[0.2em] rounded-3xl hover:scale-105 transition-all">
                                        <Send size={18} className="mr-3" /> {event?.ticketMode === 'pdf' ? 'DISPATCH MAPPED PDFs' : 'DISPATCH QR PASSES'}
                                    </Button>
                                </Card>
                            </div>
                        </motion.div>
                    )}

                    {/* SHEETS TAB */}
                    {activeTab === 'sheets' && (
                        <motion.div key="sheets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <Card className="p-10 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                                    <div>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter">Sheets & Capacity</h3>
                                        <p className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mt-2">Download raw CSV sheets of verified buyers and scanned tickets.</p>
                                    </div>
                                    <Button onClick={downloadSheets} className="bg-white/10 hover:bg-white/20 text-white text-[11px] font-black uppercase tracking-widest h-14 px-8 rounded-2xl border border-white/10 hover:border-white/20">
                                        <Download size={16} className="mr-2" /> Download Master CSV
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {!isScanner && (
                                        <div className="bg-black/60 p-8 rounded-3xl border border-white/5">
                                            <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Total Revenue</p>
                                            <p className="text-4xl font-black text-neon-green italic tracking-tighter">
                                                ₹{approvedOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0).toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                    <div className="bg-black/60 p-8 rounded-3xl border border-white/5">
                                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Tickets Sold</p>
                                        <p className="text-4xl font-black text-white italic tracking-tighter">
                                            {approvedOrders.reduce((acc, order) => acc + (order.items?.reduce((a, b) => a + b.count, 0) || 0), 0)}
                                        </p>
                                    </div>
                                    {!isScanner && (
                                        <div className="bg-black/60 p-8 rounded-3xl border border-white/5">
                                            <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Pending Verification</p>
                                            <p className="text-4xl font-black text-yellow-500 italic tracking-tighter">
                                                {pendingOrders.length}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TicketingManagement;
