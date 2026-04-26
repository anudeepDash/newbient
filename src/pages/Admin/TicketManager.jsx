import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, CheckCircle, XCircle, Upload, QrCode, Search, FileText, Download, Trash2, Sparkles, Filter, ShieldCheck, Clock, Ticket, Mail, Copy, Plus, X, ArrowRight, Eye, ChevronDown, DollarSign, Info, Users, UserCheck, ClipboardList } from 'lucide-react';
import { useStore } from '../../lib/store';
import { notifySpecificUser, notifyAdmins } from '../../lib/notificationTriggers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { cn } from '../../lib/utils';
import EntryTerminal from '../../components/admin/EntryTerminal';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, where, limit } from 'firebase/firestore';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const GuestlistRegistryTab = ({ eventId, guestlists, markGuestlistAttendance }) => {
    const [entries, setEntries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    
    const gl = guestlists.find(g => g.eventId === eventId || g.linkedEventId === eventId);

    React.useEffect(() => {
        if (!gl?.id) return;
        
        setLoading(true);
        const q = query(collection(db, 'guestlists', gl.id, 'entries'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setEntries(data);
            setLoading(false);
        });
        return unsub;
    }, [gl?.id]);

    const handleExportCSV = () => {
        if (entries.length === 0) return;
        
        // Define headers
        const headers = ['Name', 'Email', 'Phone', 'Guests', 'Status', 'Registered At'];
        const rows = entries.map(e => [
            e.customerName || '',
            e.customerEmail || '',
            e.customerPhone || '',
            (e.guestsCount || 0) + 1,
            e.attended ? 'Attended' : 'Pending',
            new Date(e.createdAt).toLocaleString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `guestlist_export_${gl.title.replace(/\s+/g, '_').toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filtered = entries.filter(e => 
        e.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!gl) return (
        <div className="py-20 text-center bg-zinc-900/10 border border-dashed border-white/5 rounded-[3rem]">
            <Users className="mx-auto text-gray-800 mb-6" size={48} />
            <h3 className="text-lg font-black italic text-gray-600 uppercase">Guestlist Offline</h3>
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mt-1">No guestlist has been promoted for this event yet.</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-32">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-10">
                <div className="relative flex-1 group max-w-xl">
                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-blue transition-colors" size={18} />
                    <input 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filter guestlist by name or email..."
                        className="w-full bg-zinc-900/30 border border-white/10 h-16 pl-16 pr-8 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40 outline-none transition-all placeholder:text-gray-700 bg-black/20"
                    />
                </div>
                <Button 
                    onClick={handleExportCSV}
                    disabled={entries.length === 0}
                    className="h-16 px-10 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                    <Download size={18} />
                    Export CSV
                </Button>
            </div>

            <Card className="overflow-hidden bg-zinc-900/20 border border-white/10 rounded-[2.5rem]">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="p-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Registrant</th>
                                <th className="p-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Access Units</th>
                                <th className="p-6 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Contact Info</th>
                                <th className="p-6 text-center text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Attendance</th>
                                <th className="p-6 text-right text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map((entry) => (
                                <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20 shadow-[0_0_15px_rgba(46,191,255,0.1)]">
                                                <Users size={18} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-white uppercase tracking-tight">{entry.customerName}</div>
                                                <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">{new Date(entry.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-xs font-black text-white italic">
                                        {entry.guestsCount === 0 ? '1X (INDIVIDUAL)' : `${(entry.guestsCount || 0) + 1}X MEMBERS`}
                                    </td>
                                    <td className="p-6">
                                        <div className="text-[10px] font-mono text-gray-400">{entry.customerEmail}</div>
                                        <div className="text-[9px] font-bold text-gray-600 mt-1 uppercase tracking-tighter">{entry.customerPhone}</div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex justify-center">
                                            <span className={cn(
                                                "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
                                                entry.attended 
                                                    ? "bg-neon-green/10 text-neon-green border-neon-green/30 shadow-[0_0_10px_rgba(57,255,20,0.1)]" 
                                                    : "bg-white/5 text-gray-500 border-white/10"
                                            )}>
                                                {entry.attended ? 'CLAIMED' : 'AWAITING'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <button 
                                            onClick={() => markGuestlistAttendance(gl.id, entry.id, !entry.attended)}
                                            className={cn(
                                                "p-2.5 rounded-xl transition-all",
                                                entry.attended 
                                                    ? "text-red-500 bg-red-500/10 hover:bg-red-500/20" 
                                                    : "text-neon-green bg-neon-green/10 hover:bg-neon-green/20 shadow-[0_0_15px_rgba(57,255,20,0.1)]"
                                            )}
                                        >
                                            {entry.attended ? <X size={18} /> : <UserCheck size={18} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">
                                        Empty Access Log
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const AttendanceLogList = ({ eventId, guestlists }) => {
    const [logs, setLogs] = React.useState([]);
    const gl = guestlists.find(g => g.eventId === eventId || g.linkedEventId === eventId);

    React.useEffect(() => {
        if (!gl?.id) return;
        const q = query(
            collection(db, 'guestlists', gl.id, 'entries'), 
            where('attended', '==', true), 
            orderBy('attendedAt', 'desc'), 
            limit(20)
        );
        const unsub = onSnapshot(q, (snap) => {
            setLogs(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return unsub;
    }, [gl?.id]);

    if (logs.length === 0) return (
        <div className="py-12 px-4 text-center">
            <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest leading-relaxed italic">No attendees logged yet. Awaiting first entry verification.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {logs.map(log => (
                <div key={log.id} className="p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/[0.08] transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green border border-neon-green/20 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                        <CheckCircle size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-white uppercase truncate tracking-tight">{log.customerName}</p>
                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                            {log.attendedAt ? new Date(log.attendedAt).toLocaleTimeString() : 'Verified Entrance'}
                        </p>
                    </div>
                    <div className="text-[9px] font-black text-neon-green/50 italic uppercase whitespace-nowrap">
                        {log.guestsCount > 0 ? `+${log.guestsCount}` : 'SOLO'}
                    </div>
                </div>
            ))}
        </div>
    );
};



const TicketVaultTab = ({ ticketVault, upcomingEvents, initialEventId, onAddTicket, onDeleteTicket, handleFileUpload }) => {
    const [selectedEventId, setSelectedEventId] = useState(initialEventId || '');
    const [ticketCategory, setTicketCategory] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const onFilesSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0 || !selectedEventId || !ticketCategory) return;
        
        setIsUploading(true);
        try {
            for (const file of files) {
                const url = await handleFileUpload(file);
                if (url) {
                    await onAddTicket({
                        eventId: selectedEventId,
                        category: ticketCategory,
                        ticketUrl: url,
                        fileName: file.name,
                        status: 'available',
                        createdAt: new Date().toISOString()
                    });
                }
            }
            alert(`Successfully ingested ${files.length} assets.`);
        } catch (error) {
            console.error("Ingestion failed:", error);
            alert("Error during bulk ingestion.");
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
            <Card className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem]">
                <h2 className="text-xl font-black italic uppercase mb-8 flex items-center gap-3">
                    <Upload className="text-neon-blue" /> BULK ASSET INGESTION
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Event</label>
                        <select 
                            className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest outline-none focus:border-neon-blue/30 transition-all text-white"
                            value={selectedEventId}
                            onChange={(e) => {
                                setSelectedEventId(e.target.value);
                                setTicketCategory('');
                            }}
                        >
                            <option value="" className="bg-zinc-900 text-white font-black">Select Event...</option>
                            {upcomingEvents.map(event => (
                                <option key={event.id} value={event.id} className="bg-zinc-900 text-white font-black">{event.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Tier / Category</label>
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
                                const allOptions = [...cats.map(c => c.name.toUpperCase()), ...fallbackCats];
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

const TicketManager = () => {
    const { 
        ticketOrders = [], approveTicketOrder, rejectTicketOrder, deleteTicketOrder, 
        paymentDetails = {}, updatePaymentDetails, updateTicketOrder, upcomingEvents = [], 
        addTicketOrder, ticketVault = [], addTicketToVault, deleteTicketFromVault,
        guestlists = [], markGuestlistAttendance
    } = useStore();

    const [managerMode, setManagerMode] = useState('ticketing'); // 'ticketing' | 'guestlist'
    const [activeTab, setActiveTab] = useState('pending'); 
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const financeTabs = [
        { name: 'Invoices', path: '/admin/invoices', icon: FileText },
        { name: 'Proposals', path: '/admin/proposals', icon: ClipboardList },
        { name: 'Agreements', path: '#', icon: ShieldCheck, comingSoon: true },
        { name: 'Ticketing', path: '/admin/tickets', icon: Ticket },
    ];

    // Missing State Definitions
    const [customPrice, setCustomPrice] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
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
    const [settingsForm, setSettingsForm] = useState(paymentDetails || {});

    // Reset tab when switching mode or selecting event
    React.useEffect(() => {
        if (managerMode === 'guestlist') {
            setActiveTab('gate');
        } else {
            setActiveTab('pending');
        }
    }, [managerMode, selectedEventId]);

    const pendingOrders = ticketOrders.filter(o => o.status === 'pending');
    const approvedOrders = ticketOrders.filter(o => o.status === 'approved');

    const stats = [
        { 
            label: 'Total Revenue', 
            value: `₹${ticketOrders.filter(o => o.status === 'approved' && (!selectedEventId || o.eventId === selectedEventId)).reduce((acc, o) => acc + o.totalAmount, 0).toLocaleString()}`, 
            icon: DollarSign, color: 'text-neon-green', bg: 'bg-neon-green/10' 
        },
        { 
            label: 'Pending Approval', 
            value: pendingOrders.filter(o => !selectedEventId || o.eventId === selectedEventId).length, 
            icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' 
        },
        { 
            label: managerMode === 'ticketing' ? 'Confirmed Guests' : 'Live Check-ins', 
            value: managerMode === 'ticketing'
                ? approvedOrders.filter(o => !selectedEventId || o.eventId === selectedEventId).length
                : 0, // Simplified for now
            icon: ShieldCheck, color: 'text-neon-blue', bg: 'bg-neon-blue/10' 
        },
        { 
            label: 'Asset Storage', 
            value: ticketVault.filter(t => !selectedEventId || t.eventId === selectedEventId).length, 
            icon: Upload, color: 'text-neon-pink', bg: 'bg-neon-pink/10' 
        },
    ];

    const displayEvents = upcomingEvents.filter(e => 
        managerMode === 'ticketing' ? e.isTicketed : e.isGuestlistEnabled
    );

    const ticketingTabs = [
        { id: 'pending', label: `Pending`, icon: Clock },
        { id: 'approved', label: 'Verified', icon: ShieldCheck },
        { id: 'gate', label: 'Entry Terminal', icon: QrCode },
        { id: 'vault', label: 'Vault', icon: Upload },
        { id: 'negotiated', label: 'Offers', icon: DollarSign },
        { id: 'settings', label: 'Config', icon: Info }
    ];

    const guestlistTabs = [
        { id: 'gate', label: 'Entry Terminal', icon: QrCode },
        { id: 'registry', label: 'Registry', icon: Users },
    ];

    const currentTabs = managerMode === 'ticketing' ? ticketingTabs : guestlistTabs;


    const filteredOrders = (activeTab === 'pending' ? pendingOrders : approvedOrders).filter(o => {
        const matchesSearch = 
            o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.paymentRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.bookingRef?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesEvent = !selectedEventId || o.eventId === selectedEventId;
        
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
        const subject = encodeURIComponent(`Your Entrance Code for ${event.title}`);
        
        let ticketsText = '';
        if (order.ticketUrls && order.ticketUrls.length > 0) {
            ticketsText = `\nTicket Links:\n${order.ticketUrls.map((url, i) => `Ticket ${i+1}: ${url}`).join('\n')}\n`;
        } else if (order.ticketUrl) {
            ticketsText = `\nTicket Link:\n${order.ticketUrl}\n`;
        }

        const bodyText = `Hi ${order.customerName},\n\nThank you for your purchase for ${event.title}!\n\nYour unique entrance code for entry is:\nCODE: ${order.bookingRef}\n\nOrder Details:\n- Item: ${order.items?.[0]?.name || 'Standard Entry'}\n- Amount Paid: ₹${order.totalAmount.toLocaleString()}\n- Transaction ID: ${order.paymentRef || 'N/A'}\n${ticketsText}\n(A formal ticket PDF might be attached to this email if available).\n\nSee you at the event!\nNewBi Entertainment`;

        const body = encodeURIComponent(bodyText);
        window.location.href = `mailto:${order.customerEmail}?subject=${subject}&body=${body}`;
        
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
        data.append("resource_type", "raw");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dgtalrz4n/upload", { 
                method: "POST", 
                body: data 
            });
            const uploadedFile = await res.json();
            if (uploadedFile.error) return null;
            return uploadedFile.secure_url;
        } catch (error) {
            return null;
        }
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
            status: 'approved',
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
        const body = option === 'attached' 
            ? `Your ticket has been attached to this email. Please find it below.`
            : `Your ticket will be shared with you via email in some time. Please keep an eye on your inbox.`;

        const emailContent = `Subject: Your Entrance Code for ${event.title}\n\nHi ${order.customerName},\n\nThank you for your purchase for ${event.title}!\n\n${body}\n\nYour unique entrance code is:\nCODE: ${order.bookingRef}\n\nOrder Details:\n- Item: ${order.items?.[0]?.name || 'Standard Entry'}\n- Amount Paid: ₹${order.totalAmount.toLocaleString()}\n\nNewBi Entertainment`;

        navigator.clipboard.writeText(emailContent);
        alert("Email draft copied to clipboard!");
    };



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

    const selectedEvent = upcomingEvents.find(e => e.id === selectedEventId);
    const ticketedEvents = upcomingEvents; // Showing all events for management accessibility

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: managerMode === 'ticketing' ? 'TICKETING' : 'GUESTLIST',
                subtitle: 'HUB',
                accentClass: managerMode === 'ticketing' ? 'text-neon-green' : 'text-neon-blue',
                icon: managerMode === 'ticketing' ? Ticket : Users
            }}
            tabs={financeTabs}
            accentColor={managerMode === 'ticketing' ? 'neon-green' : 'neon-blue'}
            action={selectedEventId && (
                <div className="flex flex-col sm:flex-row items-stretch gap-6 w-full xl:w-auto">
                    {/* Mode Switcher */}
                    <div className="bg-zinc-900/40 border border-white/10 p-1.5 rounded-[2rem] flex items-center gap-1 shadow-2xl">
                        <button
                            onClick={() => setManagerMode('ticketing')}
                            className={cn(
                                "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                                managerMode === 'ticketing' 
                                    ? "bg-neon-green text-black" 
                                    : "text-gray-500 hover:text-white"
                            )}
                        >
                            <Ticket size={16} /> TICKETING
                        </button>
                        <button
                            onClick={() => setManagerMode('guestlist')}
                            className={cn(
                                "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                                managerMode === 'guestlist' 
                                    ? "bg-neon-blue text-black" 
                                    : "text-gray-500 hover:text-white"
                            )}
                        >
                            <Users size={16} /> GUESTLISTS
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch gap-4">
                        {managerMode === 'ticketing' && (
                            <Button
                                onClick={() => setIsManualModalOpen(true)}
                                className="h-16 px-8 rounded-2xl bg-neon-blue text-black font-black uppercase italic tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-4 group"
                            >
                                <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
                                <span>Manual Entrance</span>
                            </Button>
                        )}
                        <div className="bg-white/5 border border-white/10 p-2 rounded-[2rem] backdrop-blur-3xl flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar">
                            {currentTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "px-6 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
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
                    </div>
                </div>
            )}
        >
            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-10">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-16 gap-10">
                    <div className="space-y-4 max-w-full">
                        <div className="flex flex-wrap items-center gap-4">
                            {selectedEventId && (
                                <button onClick={() => setSelectedEventId(null)} className="relative z-[60] inline-flex items-center gap-2 text-neon-blue hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] group">
                                    <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Event Selection
                                </button>
                            )}
                        </div>
                        <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] pl-1 flex items-center gap-3">
                            {selectedEventId ? selectedEvent?.title : `${managerMode === 'ticketing' ? 'Ticket' : 'Registry'} Management System`} 
                            <span className={cn("w-1 h-1 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]", managerMode === 'ticketing' ? "bg-neon-green" : "bg-neon-blue")} /> 
                            v6.0
                        </p>
                    </div>

                    {!selectedEventId && (
                        <div className="bg-zinc-900/40 border border-white/10 p-1.5 rounded-[2rem] flex items-center gap-1 shadow-2xl">
                            <button
                                onClick={() => setManagerMode('ticketing')}
                                className={cn(
                                    "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                                    managerMode === 'ticketing' 
                                        ? "bg-neon-green text-black" 
                                        : "text-gray-500 hover:text-white"
                                )}
                            >
                                <Ticket size={16} /> TICKETING
                            </button>
                            <button
                                onClick={() => setManagerMode('guestlist')}
                                className={cn(
                                    "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                                    managerMode === 'guestlist' 
                                        ? "bg-neon-blue text-black" 
                                        : "text-gray-500 hover:text-white"
                                )}
                            >
                                <Users size={16} /> GUESTLISTS
                            </button>
                        </div>
                    )}
                </div>

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

                <AnimatePresence mode="wait">
                    {!selectedEventId ? (
                        <motion.div
                            key="event-selector"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-12"
                        >
                            <div className="flex flex-col md:flex-row gap-6 items-stretch">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-green transition-colors" size={20} />
                                    <input 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search events by title..."
                                        className="w-full bg-zinc-900/30 border border-white/10 h-20 pl-20 pr-8 rounded-[2rem] text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40 outline-none transition-all placeholder:text-gray-700 bg-black/20"
                                    />
                                </div>
                            </div>

                            <motion.div 
                                layout
                                className="flex overflow-x-auto lg:overflow-x-visible md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide snap-x snap-mandatory pb-8 md:pb-0"
                            >
                                {displayEvents
                                    .filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((event, idx) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="min-w-[85vw] md:min-w-0 snap-center h-full flex flex-col"
                                        onClick={() => setSelectedEventId(event.id)}
                                    >
                                        <div className={cn(
                                            "relative group cursor-pointer border rounded-[3rem] overflow-hidden aspect-[4/5] transition-all duration-500",
                                            managerMode === 'ticketing' ? "border-white/5 hover:border-neon-green/40 shadow-[0_0_40px_rgba(57,255,20,0.02)]" : "border-white/5 hover:border-neon-blue/40 shadow-[0_0_40px_rgba(46,191,255,0.02)]"
                                        )}>
                                            <div className="absolute inset-0">
                                            <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-1000" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                                        </div>
                                        <div className="absolute inset-0 p-10 flex flex-col justify-end">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest",
                                                        managerMode === 'ticketing' ? "bg-neon-green/10 border-neon-green/30 text-neon-green" : "bg-neon-blue/10 border-neon-blue/30 text-neon-blue"
                                                    )}>
                                                        {event.date?.split('T')[0] || 'TBA'}
                                                    </span>
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", managerMode === 'ticketing' ? "bg-neon-green" : "bg-neon-blue")} />
                                                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                                                        {managerMode === 'ticketing' 
                                                            ? `${ticketOrders.filter(o => o.eventId === event.id && o.status === 'approved').length} verified`
                                                            : `${(guestlists || []).find(g => g.eventId === event.id)?.currentSpots || 0} claimed`
                                                        }
                                                    </span>
                                                </div>
                                                <h3 className="text-3xl font-black italic uppercase text-white leading-tight group-hover:translate-x-2 transition-transform duration-500">{event.title}</h3>
                                                <div className="pt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-[0.2em]",
                                                        managerMode === 'ticketing' ? "text-neon-green" : "text-neon-blue"
                                                    )}>Open Hub</span>
                                                    <ArrowRight className={managerMode === 'ticketing' ? "text-neon-green" : "text-neon-blue"} size={20} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                                ))}
                                {displayEvents.length === 0 && (
                                    <div className="col-span-full py-40 bg-zinc-900/10 border border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center gap-6">
                                        <Ticket size={48} className="text-gray-800" />
                                        <div className="text-center">
                                            <h4 className="text-lg font-black italic text-gray-600 uppercase">No Matches Found</h4>
                                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mt-1">
                                                No events have {managerMode === 'ticketing' ? 'ticketing' : 'guestlist'} enabled currently.
                                            </p>
                                        </div>
                                        <Link to="/admin/upcoming-events">
                                            <Button className={cn(
                                                "h-12 px-8 font-black uppercase tracking-widest rounded-xl mt-4",
                                                managerMode === 'ticketing' ? "bg-neon-green text-black" : "bg-neon-blue text-black"
                                            )}>Enable in Manager</Button>
                                        </Link>
                                    </div>
                                )}
                            </motion.div>

                        </motion.div>
                    ) : (
                        <>
                        <div className="flex flex-col lg:flex-row gap-6 mb-12 items-stretch">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-green transition-colors" size={20} />
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by name, email or ref..."
                                    className="w-full bg-zinc-900/30 border border-white/10 h-20 pl-20 pr-8 rounded-[2rem] text-[11px] font-black uppercase tracking-widest focus:border-neon-green/40 outline-none transition-all placeholder:text-gray-700 bg-black/20"
                                />
                            </div>
                        </div>
                        <AnimatePresence mode="wait">
                            {activeTab === 'gate' ? (
                                <motion.div 
                                    key="gate" 
                                    initial={{ opacity: 0, y: 20 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: 20 }}
                                    className="grid grid-cols-1 xl:grid-cols-3 gap-12 pb-32"
                                >
                                    <div className="xl:col-span-2">
                                        <EntryTerminal eventId={selectedEventId} />
                                    </div>
                                    
                                    {/* Real-time Attendance Feed for Guestlists */}
                                    {managerMode === 'guestlist' && (
                                        <div className="space-y-8">
                                            <div className="flex items-center justify-between px-2">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                                                    <Clock size={14} className="text-neon-blue" /> LIVE ENTRANCE LOG
                                                </h3>
                                            </div>
                                            <div className="bg-zinc-900/40 border border-white/10 rounded-[2.5rem] p-6 max-h-[600px] overflow-y-auto no-scrollbar space-y-4">
                                                <AttendanceLogList eventId={selectedEventId} guestlists={guestlists} />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : activeTab === 'settings' ? (

                                <motion.div key="settings" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-4xl mx-auto pb-32">
                                    <Card className="p-12 md:p-16 bg-zinc-900/20 backdrop-blur-3xl border border-white/10 rounded-[4rem]">
                                        <div className="flex items-center gap-6 mb-12">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-neon-blue/10 flex items-center justify-center border border-neon-blue/20">
                                                <QrCode className="text-neon-blue" size={32} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Payment Configuration</h2>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Merchant Interface Settings</p>
                                            </div>
                                        </div>
                                        <form onSubmit={handleSaveSettings} className="space-y-10">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">UPI Merchant ID</label>
                                                    <Input
                                                        value={settingsForm.upiId || ''}
                                                        onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                                                        placeholder="merchant@bank"
                                                        className="h-16 bg-black/40 border-white/10 rounded-[1.5rem] font-mono text-center text-neon-blue text-sm focus:ring-4 ring-neon-blue/5"
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Security Status</label>
                                                    <div className="h-16 flex items-center justify-center bg-black/20 rounded-[1.5rem] border border-white/5 text-[10px] font-black text-neon-green tracking-widest italic">
                                                        <ShieldCheck size={16} className="mr-2" /> Dynamic Encryption Active
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Entrance Instructions</label>
                                                <textarea
                                                    className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-sm font-medium h-48 focus:border-neon-blue/50 outline-none transition-all placeholder:text-gray-800"
                                                    placeholder="Specify payment verification requirements..."
                                                    value={settingsForm.instructions || ''}
                                                    onChange={(e) => setSettingsForm({ ...settingsForm, instructions: e.target.value })}
                                                />
                                            </div>
                                            <Button type="submit" className="w-full bg-white text-black font-black uppercase tracking-[0.2em] text-[11px] h-20 rounded-[2rem] hover:scale-[1.02] transition-all shadow-2xl group">
                                                Update Configuration <ArrowRight size={16} className="ml-3 group-hover:translate-x-2 transition-transform" />
                                            </Button>
                                        </form>
                                    </Card>
                                </motion.div>
                            ) : activeTab === 'vault' ? (
                                <motion.div key="vault" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="pb-32">
                                    <TicketVaultTab 
                                        ticketVault={ticketVault}
                                        upcomingEvents={upcomingEvents}
                                        initialEventId={selectedEventId}
                                        onAddTicket={addTicketToVault}
                                        onDeleteTicket={deleteTicketFromVault}
                                        handleFileUpload={handleFileUpload}
                                    />
                                </motion.div>
                            ) : activeTab === 'registry' ? (
                                <motion.div key="registry" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                                    <GuestlistRegistryTab 
                                        eventId={selectedEventId} 
                                        guestlists={guestlists} 
                                        markGuestlistAttendance={markGuestlistAttendance} 
                                    />
                                </motion.div>
                            ) : activeTab === 'negotiated' ? (
                                <motion.div key="negotiated" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto pb-32">
                                    <Card className="p-12 bg-zinc-900 border border-white/10 rounded-[2.5rem] relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2 flex items-center gap-2">
                                                <DollarSign className="text-neon-blue" size={20} />
                                                Create Special Offer Link
                                            </h3>
                                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-8">{selectedEvent?.title}</p>
                                            <form onSubmit={generateCustomLink} className="space-y-8">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Custom Price (₹)</label>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g. 499"
                                                        value={customPrice}
                                                        onChange={(e) => setCustomPrice(e.target.value)}
                                                        required
                                                        className="h-16 bg-black/50 border-white/10 rounded-2xl uppercase text-lg font-black tracking-widest focus:border-neon-blue/50 px-8 text-neon-blue"
                                                    />
                                                </div>
                                                {!generatedLink ? (
                                                    <Button type="submit" className="w-full h-16 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                                                        Generate Link
                                                    </Button>
                                                ) : (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                                        <div className="p-6 bg-black/60 rounded-2xl border border-white/10 flex items-center gap-4">
                                                            <p className="text-[10px] text-neon-blue font-black truncate flex-1 tracking-wider uppercase">{generatedLink}</p>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(generatedLink);
                                                                    setCopiedLink(true);
                                                                    setTimeout(() => setCopiedLink(false), 2000);
                                                                }}
                                                                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all shrink-0"
                                                            >
                                                                {copiedLink ? <CheckCircle size={18} /> : <Copy size={18} />}
                                                            </button>
                                                        </div>
                                                        <Button type="button" onClick={() => { setGeneratedLink(''); setCustomPrice(''); }} className="w-full h-14 bg-white/5 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 border border-white/5">Reset</Button>
                                                    </div>
                                                )}
                                            </form>
                                        </div>
                                    </Card>
                                </motion.div>
                            ) : (
                                <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-32">
                                    <div className="flex items-center justify-between px-4">
                                        <h3 className="text-xs font-black italic uppercase tracking-[0.3em] text-gray-500">
                                            {activeTab === 'pending' ? 'Verification Stream' : 'Completed Records'} - {filteredOrders.length} Units
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-8">
                                        {filteredOrders.length > 0 ? (
                                            filteredOrders.map((order, idx) => (
                                                <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.05, 0.4) }} key={order.id}>
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
                                                                            <span key={idx} className="px-5 py-2 rounded-full text-[10px] font-black bg-zinc-900 border border-neon-pink/30 text-neon-pink uppercase">{item.count}X {item.name}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                                                                    <div className="space-y-3">
                                                                        <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Destination</div>
                                                                        <p className="text-sm font-bold text-gray-200 uppercase flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-neon-green" />{order.eventTitle}</p>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Total Amount</div>
                                                                        <p className="text-2xl font-black text-white italic leading-none">₹{order.totalAmount.toLocaleString()}</p>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Payment Reference</div>
                                                                        <p className="font-mono text-[11px] text-gray-400 truncate max-w-[150px]">{order.paymentRef}</p>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">Logged Date</div>
                                                                        <p className="text-sm font-bold text-gray-500 uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-4 min-w-[240px] pt-8 xl:pt-0 border-t xl:border-t-0 xl:border-l border-white/5 xl:pl-10">
                                                                {activeTab === 'pending' ? (
                                                                    <div className="grid grid-cols-1 gap-4">
                                                                        <Button onClick={() => handleApprove(order.id)} className="h-16 bg-neon-green text-black font-black uppercase italic text-[11px] rounded-[1.25rem] hover:scale-105 transition-all shadow-[0_15px_30px_rgba(57,255,20,0.15)] group">
                                                                            <CheckCircle size={18} className="mr-3 group-hover:scale-110 transition-transform" /> Approve
                                                                        </Button>
                                                                        <Button onClick={() => handleReject(order.id)} variant="outline" className="h-16 border-white/10 bg-white/5 text-gray-500 font-black uppercase text-[11px] rounded-[1.25rem] hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/40 transition-all">
                                                                            <XCircle size={18} className="mr-3" /> Decline
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col gap-3">
                                                                        <Button onClick={() => handleSendEmail(order)} className="w-full bg-white text-black font-black uppercase text-[10px] h-14 rounded-[1.25rem] hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                                                                            <Mail size={16} /> Entrance Code
                                                                        </Button>
                                                                        <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5">
                                                                            <div className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg", order.ticketSent ? "bg-neon-green/10 text-neon-green" : "bg-yellow-500/10 text-yellow-500")}>
                                                                                {order.ticketSent ? 'Sent' : 'Pending'}
                                                                            </div>
                                                                            <div className="flex justify-end gap-2">
                                                                                <button onClick={() => handleDelete(order.id)} className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3.5rem]">
                                                <Sparkles className="mx-auto text-gray-800 mb-6" size={64} />
                                                <h3 className="text-xl font-black font-heading text-gray-600 uppercase italic">No Records Found</h3>
                                                <p className="text-gray-700 text-xs font-bold uppercase tracking-widest mt-2">The registry is currently clear.</p>
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
        </AdminCommunityHubLayout>
    );
};

export default TicketManager;
