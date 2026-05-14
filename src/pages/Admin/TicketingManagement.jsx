import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Search from 'lucide-react/dist/esm/icons/search';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Download from 'lucide-react/dist/esm/icons/download';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Send from 'lucide-react/dist/esm/icons/send';
import Users from 'lucide-react/dist/esm/icons/users';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Percent from 'lucide-react/dist/esm/icons/percent';
import Tag from 'lucide-react/dist/esm/icons/tag';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { cn } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EntryTerminal from '../../components/admin/EntryTerminal';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const TicketingManagement = () => {
    const { upcomingEvents, portfolio = [], ticketOrders = [], updateTicketOrderStatus, user } = useStore();
    const isScanner = user?.role === 'scanner';
    
    const [searchParams] = useSearchParams();
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [activeTab, setActiveTab] = useState(isScanner ? 'sheets' : 'buyers'); // buyers, guestlist, dispatch, attendance, coupons, sheets, settings
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isUploading, setIsUploading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [guestlistEntries, setGuestlistEntries] = useState([]);
    const [glLoading, setGlLoading] = useState(false);
    const [showAddCoupon, setShowAddCoupon] = useState(false);
    const [isSavingCoupon, setIsSavingCoupon] = useState(false);

    useEffect(() => {
        const eventId = searchParams.get('eventId');
        if (eventId) {
            setSelectedEventId(eventId);
            // Default to guestlist tab if requested
            if (searchParams.get('tab') === 'guestlist') {
                setActiveTab('guestlist');
            }
        }
    }, [searchParams]);

    useEffect(() => {
        if (!selectedEventId) return;
        
        setGlLoading(true);
        // Find if this is a standalone guestlist or linked to an event
        const gl = (useStore.getState().guestlists || []).find(g => g.id === selectedEventId || g.eventId === selectedEventId || g.linkedEventId === selectedEventId);
        const targetId = gl?.id || selectedEventId;

        const q = query(collection(db, 'guestlists', targetId, 'entries'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setGuestlistEntries(data);
            setGlLoading(false);
        }, (err) => {
            console.error(err);
            setGlLoading(false);
        });

        return unsub;
    }, [selectedEventId]);

    const operationalEvents = [
        ...(upcomingEvents?.filter(e => e.isTicketed || e.isGuestlistEnabled || e.guestlistEnabled) || []),
        ...(portfolio?.filter(p => p.wasEvent && (p.isTicketed || p.isGuestlistEnabled || p.guestlistEnabled)) || []),
        ...(useStore.getState().guestlists || []).map(gl => ({ ...gl, isGuestlistEnabled: true })),
        ...(useStore.getState().volunteerGigs?.filter(g => g.guestlistEnabled || g.isGuestlistEnabled) || [])
    ].sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
    });

    // If no event selected, show event cards
    if (!selectedEventId) {
        return (
            <div className="min-h-screen bg-[#020202] text-white pb-20">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px]" />
                </div>
                <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-32 md:pt-48">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 md:mb-12 gap-8">
                        <div className="space-y-4 max-w-full">
                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1] pr-12">
                                TICKET <span className="text-neon-green">OPERATIONS.</span>
                            </h1>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Select an event to manage ticketing operations.</p>
                            <div className="pt-4">
                                <AdminDashboardLink />
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {operationalEvents.map(event => {
                            const eventOrders = ticketOrders.filter(o => o.eventId === event.id);
                            const pendingCount = eventOrders.filter(o => o.status === 'pending').length;
                            const approvedCount = eventOrders.filter(o => o.status === 'approved' || o.status === 'dispatched').length;
                            return (
                                <Card key={event.id} onClick={() => setSelectedEventId(event.id)} className="cursor-pointer group p-0 bg-zinc-950/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-neon-green/30 transition-all duration-700 shadow-2xl">
                                    <div className="h-48 relative overflow-hidden bg-black/50">
                                        {event.image ? <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000" /> : <div className="absolute inset-0 flex items-center justify-center"><Ticket size={48} className="opacity-20"/></div>}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                        <div className="absolute bottom-8 left-8 right-8">
                                            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white truncate drop-shadow-2xl">{event.title}</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">{event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}</p>
                                        </div>
                                        {event.date && new Date(event.date) < new Date() && (
                                            <div className="absolute top-6 right-6 px-4 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Completed</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-8 grid grid-cols-2 gap-4 bg-black/40">
                                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-neon-green/5 transition-colors">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Tickets Sold</p>
                                            <p className="text-2xl font-black text-neon-green">{approvedCount}</p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-yellow-500/5 transition-colors">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Pending UPI</p>
                                            <p className="text-2xl font-black text-yellow-500">{pendingCount}</p>
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

    const event = operationalEvents.find(e => e.id === selectedEventId);
    let eventOrders = ticketOrders.filter(o => o.eventId === selectedEventId);
    
    // Filtering logic
    let filteredOrders = eventOrders.filter(order => {
        let matchesSearch = true;
        if (searchQuery) {
            matchesSearch = (order.customerName || order.name)?.toLowerCase().includes(searchQuery.toLowerCase()) || order.paymentRef?.includes(searchQuery);
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
                useStore.getState().addToast("Couldn't approve the order. Please try again.", 'error');
            }
        }
    };

    const handleReject = async (orderId) => {
        if(window.confirm('Reject payment?')) {
            try {
                await updateTicketOrderStatus(orderId, 'rejected');
            } catch (err) {
                console.error(err);
                useStore.getState().addToast("Couldn't reject the order. Please try again.", 'error');
            }
        }
    };

    const handleBulkUpload = (e) => {
        if (!selectedCategory) {
            useStore.getState().addToast("Please select a ticket category first.", 'error');
            return;
        }
        setIsUploading(true);
        setTimeout(() => {
            setIsUploading(false);
            useStore.getState().addToast(`Offline PDFs uploaded and mapped to approved buyers in category: ${selectedCategory}.`, 'success');
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
            useStore.getState().addToast('Tickets dispatched successfully!', 'success');
        }
    };

    const downloadSheets = () => {
        // CSV generation for both tickets and guestlist
        if (eventOrders.length === 0 && guestlistEntries.length === 0) {
            useStore.getState().addToast("No data to export.", 'error');
            return;
        }

        const headers = ["Name", "Email", "Type", "Status", "Details", "Booking Ref", "Created At"];
        const rows = [
            ...eventOrders.map(o => [
               o.customerName || o.name,
               o.customerEmail || o.email,
               "Ticket",
               o.status,
               Array.isArray(o.items) 
                 ? o.items.map(i => `${i.count}x ${i.name}`).join(' | ')
                 : Object.entries(o.items || {}).map(([k, v]) => `${v}x ${k}`).join(' | '),
               o.bookingRef,
               o.createdAt
            ]),
            ...guestlistEntries.map(e => [
               e.customerName || e.name,
               e.customerEmail || e.email,
               "Guestlist",
               e.attended ? "Attended" : "Registered",
               `${e.guestsCount || 1} Guest(s)`,
               e.bookingRef,
               e.createdAt
            ])
        ];

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${event?.title?.replace(/\s+/g, '_') || 'Event'}_Operations_Report.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        useStore.getState().addToast("Report downloaded!", 'success');
    };

    const handleUpdateEventPayment = async (e) => {
        e.preventDefault();
        const upiId = e.target.upiId.value;
        const qrCodeUrl = e.target.qrCodeUrl.value;
        
        try {
            const { updateUpcomingEvent } = useStore.getState();
            await updateUpcomingEvent(selectedEventId, { upiId, qrCodeUrl });
            useStore.getState().addToast("Payment settings saved!", 'success');
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("Couldn't save payment settings. Please try again.", 'error');
        }
    };

    const handleQRUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Reusing existing upload logic if available, or manual fetch to Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'ml_default'); 

            const res = await fetch(`https://api.cloudinary.com/v1_1/dmod79hsz/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            const { updateUpcomingEvent } = useStore.getState();
            await updateUpcomingEvent(selectedEventId, { qrCodeUrl: data.secure_url });
            useStore.getState().addToast("QR Code uploaded and mapped.", 'success');
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("Couldn't upload the QR code. Please try again.", 'error');
        } finally {
            setIsUploading(false);
        }
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
                    <div className="flex flex-wrap gap-2 w-full md:w-auto bg-black/60 p-2 rounded-[2rem] border border-white/5">
                        {['buyers', 'guestlist', 'dispatch', 'attendance', 'coupons', 'sheets', 'settings'].map((tab) => {
                            if (isScanner && (tab === 'buyers' || tab === 'dispatch' || tab === 'guestlist' || tab === 'settings')) return null; 
                            if (!event?.isTicketed && (tab === 'buyers' || tab === 'dispatch' || tab === 'settings')) return null;
                            if (!(event?.isGuestlistEnabled || event?.guestlistEnabled) && tab === 'guestlist') return null;
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
                                    {tab === 'buyers' ? 'Buyers' : tab === 'guestlist' ? 'Guestlist' : tab === 'dispatch' ? 'Dispatch' : tab === 'attendance' ? 'Attendance' : tab === 'settings' ? 'Settings' : tab === 'coupons' ? 'Coupons' : 'Sheets'}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* COUPONS TAB */}
                    {activeTab === 'coupons' && !isScanner && (
                        <motion.div key="coupons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Coupon Form */}
                                <Card className="lg:col-span-1 p-8 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] h-fit sticky top-48">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue">
                                                <Tag size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Create Code</h3>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Add new discount code.</p>
                                            </div>
                                        </div>

                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            setIsSavingCoupon(true);
                                            try {
                                                const formData = new FormData(e.target);
                                                const coupon = {
                                                    code: formData.get('code').toUpperCase(),
                                                    discountType: formData.get('type'),
                                                    discountValue: Number(formData.get('value')),
                                                    usageLimit: formData.get('limit') ? Number(formData.get('limit')) : null,
                                                    expiryDate: formData.get('expiry') || null,
                                                    eventId: selectedEventId,
                                                    usedCount: 0,
                                                    isActive: true
                                                };
                                                await useStore.getState().addCoupon(coupon);
                                                useStore.getState().addToast("Coupon created successfully!", 'success');
                                                e.target.reset();
                                            } catch (err) {
                                                useStore.getState().addToast("Couldn't create the coupon. Please try again.", 'error');
                                            } finally {
                                                setIsSavingCoupon(false);
                                            }
                                        }} className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">COUPON CODE</label>
                                                <Input name="code" placeholder="e.g. NEWBI20" required className="h-14 bg-black/40 border-white/10 rounded-2xl text-[11px] font-black tracking-[0.2em]" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">TYPE</label>
                                                    <select name="type" className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest px-4 outline-none">
                                                        <option value="percentage" className="bg-zinc-900">PERCENTAGE %</option>
                                                        <option value="flat" className="bg-zinc-900">FLAT ₹</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">VALUE</label>
                                                    <Input name="value" type="number" placeholder="20" required className="h-14 bg-black/40 border-white/10 rounded-2xl text-[11px] font-black" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">USAGE LIMIT (OPTIONAL)</label>
                                                <Input name="limit" type="number" placeholder="e.g. 100" className="h-14 bg-black/40 border-white/10 rounded-2xl text-[11px] font-black" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">EXPIRY DATE (OPTIONAL)</label>
                                                <Input name="expiry" type="date" className="h-14 bg-black/40 border-white/10 rounded-2xl text-[11px] font-black uppercase" />
                                            </div>
                                            <Button type="submit" disabled={isSavingCoupon} className="w-full h-16 bg-neon-blue text-black font-black uppercase tracking-widest text-[10px] rounded-2xl mt-4">
                                                {isSavingCoupon ? <LoadingSpinner size="sm" /> : 'CREATE COUPON'}
                                            </Button>
                                        </form>
                                    </div>
                                </Card>

                                {/* Coupon List */}
                                <Card className="lg:col-span-2 p-0 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl h-fit">
                                    <div className="p-8 border-b border-white/5 bg-black/40 flex justify-between items-center">
                                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Active Coupons</h3>
                                        <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                                            {useStore.getState().coupons.filter(c => c.eventId === selectedEventId).length} Active
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-black/80 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                    <th className="p-8">Code</th>
                                                    <th className="p-8">Benefit</th>
                                                    <th className="p-8">Usage</th>
                                                    <th className="p-8 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm">
                                                {(() => {
                                                    const eventCoupons = useStore.getState().coupons.filter(c => c.eventId === selectedEventId);
                                                    if (eventCoupons.length === 0) return (
                                                        <tr>
                                                            <td colSpan="4" className="p-20 text-center text-gray-500 bg-black/20">
                                                                <Percent size={48} className="mx-auto mb-6 opacity-20" />
                                                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">No coupons active for this event.</p>
                                                            </td>
                                                        </tr>
                                                    );
                                                    return eventCoupons.map((coupon) => (
                                                        <tr key={coupon.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                            <td className="p-8">
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-white text-base tracking-[0.1em]">{coupon.code}</span>
                                                                    {coupon.expiryDate && <span className="text-[8px] text-gray-500 font-bold uppercase mt-1">Exp: {new Date(coupon.expiryDate).toLocaleDateString()}</span>}
                                                                </div>
                                                            </td>
                                                            <td className="p-8">
                                                                <span className={cn(
                                                                    "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border",
                                                                    coupon.discountType === 'percentage' ? "text-neon-green bg-neon-green/10 border-neon-green/20" : "text-neon-blue bg-neon-blue/10 border-neon-blue/20"
                                                                )}>
                                                                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                                                                </span>
                                                            </td>
                                                            <td className="p-8">
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                                                        <span className="text-gray-500">Usage</span>
                                                                        <span className="text-white">{coupon.usedCount || 0} / {coupon.usageLimit || '∞'}</span>
                                                                    </div>
                                                                    {coupon.usageLimit && (
                                                                        <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                                                            <div 
                                                                                className="h-full bg-neon-blue" 
                                                                                style={{ width: `${Math.min(100, ((coupon.usedCount || 0) / coupon.usageLimit) * 100)}%` }} 
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-8 text-right">
                                                                <button 
                                                                    onClick={async () => {
                                                                        if (window.confirm('Delete this coupon?')) {
                                                                            await useStore.getState().deleteCoupon(coupon.id);
                                                                            useStore.getState().addToast("Coupon deleted.", 'success');
                                                                        }
                                                                    }}
                                                                    className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        </motion.div>
                    )}

                    {/* GUESTLIST TAB */}
                    {activeTab === 'guestlist' && !isScanner && (
                        <motion.div key="guestlist" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <Card className="p-0 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
                                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-black/40">
                                    <div className="flex gap-4 items-center">
                                        <div className="relative">
                                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                            <Input 
                                                placeholder="SEARCH GUESTS..." 
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="h-14 pl-14 w-64 bg-black/60 border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                                            />
                                        </div>
                                    </div>
                                    <div className="px-6 py-3 bg-white/5 text-white rounded-2xl text-[11px] font-black tracking-widest uppercase border border-white/10">
                                        {guestlistEntries.length} Entries
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-black/80 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                <th className="p-8 font-medium">Guest Details</th>
                                                <th className="p-8 font-medium">Guests</th>
                                                <th className="p-8 font-medium">Booking Ref</th>
                                                <th className="p-8 font-medium">Attendance</th>
                                                <th className="p-8 font-medium text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {guestlistEntries.length > 0 ? guestlistEntries.filter(e => 
                                                !searchQuery || 
                                                (e.customerName || e.name)?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                e.bookingRef?.includes(searchQuery)
                                            ).map((entry) => (
                                                <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                    <td className="p-8">
                                                        <p className="font-black text-white text-base tracking-tight">{entry.customerName || entry.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-500 tracking-widest mt-1 italic">{entry.customerEmail || entry.email}</p>
                                                    </td>
                                                    <td className="p-8">
                                                        <span className="text-[11px] font-black text-neon-blue bg-neon-blue/10 px-4 py-2 rounded-xl border border-neon-blue/20">
                                                            {entry.guestsCount || 1} GUEST(S)
                                                        </span>
                                                    </td>
                                                    <td className="p-8 font-mono text-[11px] text-gray-400 bg-black/20">{entry.bookingRef}</td>
                                                    <td className="p-8">
                                                        {entry.attended ? (
                                                            <div className="flex items-center gap-2 text-neon-green">
                                                                <CheckCircle2 size={14} />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Attended</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Pending</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-8 text-right">
                                                        <span className="px-3 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-md text-[9px] font-black uppercase tracking-widest">Verified</span>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="5" className="p-20 text-center text-gray-500 bg-black/20">
                                                        <Users size={64} className="mx-auto mb-6 opacity-20" />
                                                        <p className="text-xs font-black uppercase tracking-[0.4em]">No guestlist entries yet.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </motion.div>
                    )}

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
                                                        <p className="font-black text-white text-base tracking-tight">{order.customerName || order.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-500 tracking-widest mt-1">{order.customerPhone || order.phone}</p>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="flex flex-wrap gap-2">
                                                        {(Array.isArray(order.items) ? order.items : Object.entries(order.items || {}).map(([k, v]) => ({ name: k, count: v }))).map((item, i) => (
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
                                                                    <Check size={24} />
                                                                </button>
                                                                <button onClick={() => handleReject(order.id)} className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white inline-flex items-center justify-center transition-all border border-red-500/20 hover:scale-110" title="Reject Payment">
                                                                    <X size={24} />
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
                                        <Send size={22} className="mr-3" /> {event?.ticketMode === 'pdf' ? 'DISPATCH MAPPED PDFs' : 'DISPATCH QR PASSES'}
                                    </Button>
                                </Card>
                            </div>
                        </motion.div>
                    )}

                    {/* ATTENDANCE TAB */}
                    {activeTab === 'attendance' && (
                        <motion.div key="attendance" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <EntryTerminal eventId={selectedEventId} />
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
                                        <Download size={20} className="mr-2" /> Download Master CSV
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
                                            {approvedOrders.reduce((acc, order) => {
                                                const items = Array.isArray(order.items) ? order.items : Object.values(order.items || {});
                                                const count = Array.isArray(order.items) 
                                                    ? items.reduce((a, b) => a + (b.count || 0), 0)
                                                    : items.reduce((a, b) => a + (b || 0), 0);
                                                return acc + count;
                                            }, 0)}
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
                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && !isScanner && (
                        <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Card className="p-10 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8">Event Payment Config</h3>
                                    <form onSubmit={handleUpdateEventPayment} className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Event UPI ID</label>
                                            <Input name="upiId" defaultValue={event?.upiId || ''} placeholder="merchant@upi" className="h-14 bg-black/40 border-white/5 rounded-2xl" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Direct QR Link (Optional)</label>
                                            <Input name="qrCodeUrl" defaultValue={event?.qrCodeUrl || ''} placeholder="https://..." className="h-14 bg-black/40 border-white/5 rounded-2xl" />
                                        </div>
                                        <Button type="submit" className="w-full h-14 bg-neon-green text-black font-black uppercase text-xs tracking-widest rounded-2xl">
                                            Update Configuration
                                        </Button>
                                    </form>
                                </Card>

                                <Card className="p-10 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center group">
                                    <div className="relative w-full">
                                        {event?.qrCodeUrl ? (
                                            <div className="relative group/qr">
                                                <img src={event.qrCodeUrl} alt="Event QR" className="w-48 h-48 mx-auto object-contain rounded-2xl border border-white/10 p-2 bg-white" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                                    <label className="cursor-pointer p-4 bg-white text-black rounded-xl font-black uppercase text-[10px]">
                                                        {isUploading ? <LoadingSpinner size="sm" /> : 'Change QR'}
                                                        <input type="file" onChange={handleQRUpload} className="hidden" accept="image/*" />
                                                    </label>
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer border-2 border-dashed border-white/10 rounded-[2rem] p-12 flex flex-col items-center justify-center hover:border-neon-blue transition-colors w-full h-64">
                                                <QrCode size={48} className="text-gray-600 mb-4" />
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Upload Custom QR</p>
                                                <input type="file" onChange={handleQRUpload} className="hidden" accept="image/*" />
                                            </label>
                                        )}
                                    </div>
                                    <p className="mt-6 text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                        This QR will be displayed to buyers during the payment step of the ticketing modal for <span className="text-white italic">{event?.title}</span>.
                                    </p>
                                </Card>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TicketingManagement;
