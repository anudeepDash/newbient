import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Search from 'lucide-react/dist/esm/icons/search';
import User from 'lucide-react/dist/esm/icons/user';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import Building from 'lucide-react/dist/esm/icons/building';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Activity from 'lucide-react/dist/esm/icons/activity';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Clock from 'lucide-react/dist/esm/icons/clock';

import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const PayeeRegistry = () => {
    useStoreSubscription(['financePayees', 'upcomingEvents']);
    const { financePayees, deleteFinancePayee, upcomingEvents, addUpcomingEvent, user } = useStore();
    
    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [paymentModeFilter, setPaymentModeFilter] = useState('All');

    // Link Builder states
    const [builderType, setBuilderType] = useState('Volunteer');
    const [selectedEvent, setSelectedEvent] = useState('');
    const [customEvent, setCustomEvent] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);

    // Expandable detail rows state
    const [expandedPayeeId, setExpandedPayeeId] = useState(null);

    const financeTabs = [
        { name: 'Overview', path: '/admin/finance', icon: LayoutGrid, color: 'text-[#39FF14]' },
        { name: 'Spends Ledger', path: '/admin/spends', icon: IndianRupee, color: 'text-neon-pink' },
        { name: 'Other Income', path: '/admin/other-income', icon: FileSpreadsheet, color: 'text-[#39FF14]' },
        { name: 'Payee Registry', path: '/admin/payees', icon: User, color: 'text-neon-blue' }
    ];

    const navPills = [
        { name: 'Overview', path: '/admin/finance', icon: LayoutGrid, isActive: false },
        { name: 'Expense Ledger', path: '/admin/spends', icon: IndianRupee, isActive: false },
        { name: 'Other Revenue', path: '/admin/other-income', icon: FileSpreadsheet, isActive: false },
        { name: 'Payee Database', path: '/admin/payees', icon: User, isActive: true }
    ];

    const roles = [
        { id: 'Volunteer', label: 'Volunteer Payout', desc: 'Event gigs & temp helpers', icon: Activity, color: 'text-neon-green', border: 'border-neon-green/30', bg: 'bg-neon-green/5', activeBg: 'bg-neon-green/10 border-neon-green shadow-[0_0_15px_rgba(57,255,20,0.15)]' },
        { id: 'Vendor', label: 'Vendor / Partner', desc: 'Suppliers & business partners', icon: Building, color: 'text-neon-pink', border: 'border-neon-pink/30', bg: 'bg-neon-pink/5', activeBg: 'bg-neon-pink/10 border-neon-pink shadow-[0_0_15px_rgba(255,46,144,0.15)]' },
        { id: 'Salary', label: 'Core Retainer', desc: 'Monthly salary & staff payouts', icon: Shield, color: 'text-neon-blue', border: 'border-neon-blue/30', bg: 'bg-neon-blue/5', activeBg: 'bg-neon-blue/10 border-neon-blue shadow-[0_0_15px_rgba(56,189,248,0.15)]' },
        { id: 'Artist', label: 'Artist / Creator', desc: 'Performer fees & creator payouts', icon: Sparkles, color: 'text-neon-purple', border: 'border-neon-purple/30', bg: 'bg-neon-purple/5', activeBg: 'bg-neon-purple/10 border-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.15)]' }
    ];

    // Filter payees
    const filteredPayees = useMemo(() => {
        return financePayees.filter(payee => {
            const matchesSearch = 
                payee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payee.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payee.destinationDetails?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payee.linkedGig?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = typeFilter === 'All' ? true : payee.type === typeFilter;
            const matchesMode = paymentModeFilter === 'All' ? true : payee.paymentMode === paymentModeFilter;

            return matchesSearch && matchesType && matchesMode;
        });
    }, [financePayees, searchTerm, typeFilter, paymentModeFilter]);

    // Handle delete payee
    const handleDeletePayee = (id) => {
        if (user?.role === 'editor' || user?.role === 'content_admin') {
            useStore.getState().addToast("Only administrators can delete registry records.", 'error');
            return;
        }

        if (window.confirm('Are you sure you want to remove this payee from the registry?')) {
            deleteFinancePayee(id);
            useStore.getState().addToast('Payee registration purged.', 'success');
        }
    };

    // Copy destination payout address
    const handleCopyDetails = (details) => {
        if (!details) return;
        navigator.clipboard.writeText(details);
        useStore.getState().addToast('Payee payout info copied!', 'success');
    };

    // Generate targeted payee registration link
    const handleGenerateLink = async (e) => {
        e.preventDefault();
        const base = `${window.location.origin}/register-payment`;
        const eventName = builderType === 'Volunteer' ? (customEvent.trim() || selectedEvent) : '';
        
        let url = `${base}?type=${builderType}`;
        if (eventName) {
            url += `&event=${encodeURIComponent(eventName)}`;
            
            // Check if the event exists in upcomingEvents
            const exists = upcomingEvents.some(evt => evt.title.toLowerCase() === eventName.toLowerCase());
            if (!exists && builderType === 'Volunteer') {
                try {
                    await addUpcomingEvent({
                        title: eventName,
                        date: new Date().toISOString().split('T')[0],
                        location: 'TBD',
                        description: `Automatically created for volunteer registration: ${eventName}`,
                        status: 'Upcoming',
                        category: 'Volunteer Event',
                        image: '',
                        hubImage: '',
                        venueLayout: '',
                        videoUrl: '',
                        buttonText: 'LEARN MORE',
                        updatedAt: new Date().toISOString()
                    });
                    useStore.getState().addToast(`Created new event entry: ${eventName}`, 'success');
                } catch (err) {
                    console.error("Failed to auto-create event:", err);
                }
            }
        }

        setGeneratedLink(url);
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        useStore.getState().addToast('Registration link generated and copied!', 'success');
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'PAYEE',
                subtitle: 'REGISTRY',
                accentClass: 'text-neon-blue',
                icon: User
            }}
            tabs={financeTabs}
            accentColor="neon-blue"
        >
            <div className="space-y-8 relative">
                {/* Nav Pills */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-3">
                    {navPills.map((pill) => {
                        const Icon = pill.icon;
                        return (
                            <Link key={pill.name} to={pill.path}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 group",
                                    pill.isActive 
                                        ? "bg-neon-green text-black border-neon-green shadow-[0_0_15px_rgba(57,255,20,0.3)]" 
                                        : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/30 hover:text-white hover:bg-white/[0.05]"
                                )}
                            >
                                <Icon size={14} className={cn("transition-transform group-hover:scale-110", pill.isActive ? "text-black" : "text-neon-green")} />
                                {pill.name}
                            </Link>
                        )
                    })}
                </motion.div>

                {/* Upper Grid: Link Builder Console & Quick Stats */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Registration Link Generator Console */}
                    <div className="lg:col-span-2 p-6 md:p-8 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-black font-heading tracking-tighter uppercase italic text-white mb-1 flex items-center gap-2">
                                    <LinkIcon className="text-neon-blue" size={16} /> targeted link builder
                                </h3>
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                    Generate secure custom URLs for core retainers, partners, or volunteer event gigs
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleGenerateLink} className="space-y-6">
                            {/* Role Cards Selector */}
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Payout Role *</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {roles.map((role) => {
                                        const IconComp = role.icon;
                                        const isActive = builderType === role.id;
                                        return (
                                            <button
                                                key={role.id}
                                                type="button"
                                                onClick={() => {
                                                    setBuilderType(role.id);
                                                    setSelectedEvent('');
                                                    setCustomEvent('');
                                                }}
                                                className={cn(
                                                    "flex flex-col text-left p-4 rounded-2xl border transition-all hover:scale-[1.01] active:scale-[0.99] select-none",
                                                    isActive ? role.activeBg : `bg-black/40 ${role.border} text-gray-400 hover:text-white`
                                                )}
                                            >
                                                <div className={cn("w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center mb-3 shrink-0", role.color)}>
                                                    <IconComp size={16} />
                                                </div>
                                                <div className="text-[10px] font-black uppercase tracking-wider text-white leading-tight mb-1">{role.label}</div>
                                                <div className="text-[8px] font-medium text-gray-500 leading-normal line-clamp-2">{role.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Conditional Event Selection Form Fields */}
                            <AnimatePresence mode="wait">
                                {builderType === 'Volunteer' && (
                                    <motion.div
                                        key="gig-fields"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden"
                                    >
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest pl-1">Select Event Gig (Optional)</label>
                                            <div className="relative">
                                                <select
                                                    value={selectedEvent}
                                                    onChange={(e) => {
                                                        setSelectedEvent(e.target.value);
                                                        if (e.target.value) setCustomEvent('');
                                                    }}
                                                    className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 px-3 outline-none focus:border-neon-blue transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" className="bg-zinc-950">-- Select Active Event --</option>
                                                    {upcomingEvents.map(ev => (
                                                        <option key={ev.id} value={ev.title} className="bg-zinc-950">{ev.title}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest pl-1">Or Specify Custom Gig Title</label>
                                            <input
                                                value={customEvent}
                                                onChange={(e) => {
                                                    setCustomEvent(e.target.value);
                                                    if (e.target.value) setSelectedEvent('');
                                                }}
                                                placeholder="e.g. Summer Festival 2026 Coordinator"
                                                className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 px-3 outline-none focus:border-neon-blue transition-all placeholder:text-gray-600"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Generated Output View Block */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4 border-t border-white/5">
                                <button 
                                    type="submit" 
                                    className="h-10 px-8 bg-gradient-to-r from-neon-blue to-blue-600 text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(59,130,246,0.2)] shrink-0"
                                >
                                    <LinkIcon size={12} /> {copiedLink ? 'Copied URL!' : 'Forge Provision Link'}
                                </button>
                                {generatedLink && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-[8px] text-neon-blue bg-neon-blue/5 border border-neon-blue/20 px-4 rounded-xl truncate font-mono select-all flex-1 h-10 flex items-center justify-between gap-4 group"
                                    >
                                        <span className="truncate">{generatedLink}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(generatedLink);
                                                setCopiedLink(true);
                                                useStore.getState().addToast('Registration link copied!', 'success');
                                                setTimeout(() => setCopiedLink(false), 2000);
                                            }}
                                            className="p-1.5 hover:bg-white/10 rounded transition-colors shrink-0"
                                        >
                                            <Copy size={12} className="text-neon-blue" />
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Stats summary panel */}
                    <div className="p-6 md:p-8 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl hover:border-white/20 transition-all flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-black font-heading tracking-tighter uppercase italic text-white mb-1">
                                registry status
                            </h3>
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-6">
                                Quick metrics across onboarded payee profiles
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-1">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total Payees</span>
                                <span className="text-2xl font-mono font-black text-white">{financePayees.length}</span>
                            </div>
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-1">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Volunteers</span>
                                <span className="text-2xl font-mono font-black text-neon-green">
                                    {financePayees.filter(p => p.type === 'Volunteer').length}
                                </span>
                            </div>
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-1">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Vendors</span>
                                <span className="text-2xl font-mono font-black text-neon-pink">
                                    {financePayees.filter(p => p.type === 'Vendor').length}
                                </span>
                            </div>
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-1">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Core & Artists</span>
                                <span className="text-2xl font-mono font-black text-neon-blue">
                                    {financePayees.filter(p => p.type === 'Salary' || p.type === 'Artist').length}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Filters & Control Console */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={14} />
                            <input 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search payees by name, contact info..."
                                className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 pl-9 pr-3 outline-none focus:border-white/30 transition-all placeholder:text-gray-600"
                            />
                        </div>

                        {/* Payee Type Filter */}
                        <div className="w-full md:w-48 relative">
                            <select 
                                value={typeFilter} 
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 px-3 outline-none focus:border-white/30 transition-all appearance-none cursor-pointer"
                            >
                                <option value="All" className="bg-zinc-950">All Types</option>
                                <option value="Volunteer" className="bg-zinc-950">Volunteers</option>
                                <option value="Vendor" className="bg-zinc-950">Vendors</option>
                                <option value="Salary" className="bg-zinc-950">Core Team</option>
                                <option value="Artist" className="bg-zinc-950">Artists</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Payment Mode Filter */}
                        <div className="w-full md:w-48 relative">
                            <select 
                                value={paymentModeFilter} 
                                onChange={(e) => setPaymentModeFilter(e.target.value)}
                                className="w-full bg-zinc-950/40 border border-white/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white h-10 px-3 outline-none focus:border-white/30 transition-all appearance-none cursor-pointer"
                            >
                                <option value="All" className="bg-zinc-950">All Modes</option>
                                <option value="UPI" className="bg-zinc-950">UPI</option>
                                <option value="Bank Transfer" className="bg-zinc-950">Bank Transfer</option>
                                <option value="Other" className="bg-zinc-950">Other Methods</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Clear button */}
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setTypeFilter('All');
                                setPaymentModeFilter('All');
                            }}
                            className="w-full md:w-auto h-10 px-5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 font-black tracking-widest uppercase text-[10px] shrink-0"
                        >
                            <X size={12} /> Clear
                        </button>
                    </div>
                </motion.div>

                {/* MOBILE DECK VIEW */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-1 gap-4 lg:hidden">
                    {filteredPayees.length > 0 ? (
                        filteredPayees.map((payee) => {
                            const isExpanded = expandedPayeeId === payee.id;
                            return (
                                <div key={payee.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.04] hover:border-white/20 transition-all flex flex-col gap-4 relative overflow-hidden">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h4 className="text-sm font-black text-white">{payee.name}</h4>
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-mono select-all block mt-0.5">ID: {payee.id.slice(0, 8)}...</span>
                                        </div>
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full border font-black uppercase tracking-widest text-[8px]",
                                            payee.type === 'Volunteer' ? 'bg-neon-green/10 border-neon-green/20 text-neon-green' :
                                            payee.type === 'Vendor' ? 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink' :
                                            payee.type === 'Salary' ? 'bg-neon-blue/10 border-neon-blue/20 text-neon-blue' :
                                            'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                                        )}>
                                            {payee.type}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-1.5 text-[10px] text-zinc-400 border-t border-white/5 pt-3">
                                        <div className="flex items-center gap-2 select-all"><Mail size={12} className="text-zinc-500 shrink-0" /> {payee.email}</div>
                                        <div className="flex items-center gap-2 select-all"><Phone size={12} className="text-zinc-500 shrink-0" /> {payee.phone}</div>
                                        <div className="flex items-center gap-2 select-all"><CreditCard size={12} className="text-zinc-500 shrink-0" /> {payee.paymentMode}: {payee.destinationDetails || 'N/A'}</div>
                                    </div>

                                    {payee.notes && (
                                        <div className="text-[9px] text-zinc-400 leading-normal font-semibold normal-case italic bg-white/[0.01] p-3 rounded-lg border border-white/5 mt-1">
                                            {payee.notes}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1 gap-4">
                                        <span className="text-[8px] font-black text-neon-blue uppercase tracking-widest">
                                            {payee.linkedGig || 'Global Retainer'}
                                        </span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleCopyDetails(payee.destinationDetails)} 
                                                className="p-2 text-zinc-400 hover:text-white transition-colors border border-white/10 rounded-lg bg-zinc-950/40 hover:bg-zinc-800"
                                                title="Copy Payment Address"
                                            >
                                                <Copy size={12} />
                                            </button>
                                            {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                <button 
                                                    onClick={() => handleDeletePayee(payee.id)} 
                                                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors border border-white/10 rounded-lg bg-zinc-950/40 hover:bg-red-500/10 hover:border-red-500/30"
                                                    title="Remove Payee"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex items-center justify-center py-20 bg-white/[0.03] border border-white/10 rounded-2xl">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No records found</span>
                        </div>
                    )}
                </motion.div>

                {/* DESKTOP TABLE VIEW */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="hidden lg:block overflow-x-auto scrollbar-hide">
                    <div className="min-w-[1000px] bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-0 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 bg-white/[0.02]">
                                    <th className="p-6">payee name</th>
                                    <th className="p-6">classification</th>
                                    <th className="p-6">contact details</th>
                                    <th className="p-6">payment mode</th>
                                    <th className="p-6">destination address</th>
                                    <th className="p-6">linked gig / event</th>
                                    <th className="p-6">registered date</th>
                                    <th className="p-6 text-right">actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-[11px] font-bold uppercase tracking-wider">
                                {filteredPayees.length > 0 ? (
                                    filteredPayees.map((payee) => {
                                        const isExpanded = expandedPayeeId === payee.id;
                                        return (
                                            <React.Fragment key={payee.id}>
                                                <tr className={cn(
                                                    "border-b border-white/5 hover:bg-white/[0.03] transition-all group cursor-pointer",
                                                    isExpanded && "bg-white/[0.04]"
                                                )}
                                                    onClick={() => setExpandedPayeeId(isExpanded ? null : payee.id)}
                                                >
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-2">
                                                            {isExpanded ? <ChevronUp size={12} className="text-neon-blue" /> : <ChevronDown size={12} className="text-zinc-500 group-hover:text-white" />}
                                                            <div className="text-xs font-black text-white">{payee.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-[9px]">
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-full border font-black uppercase tracking-widest text-[8px]",
                                                            payee.type === 'Volunteer' ? 'bg-neon-green/10 border-neon-green/20 text-neon-green' :
                                                            payee.type === 'Vendor' ? 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink' :
                                                            payee.type === 'Salary' ? 'bg-neon-blue/10 border-neon-blue/20 text-neon-blue' :
                                                            'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                                                        )}>
                                                            {payee.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-6 text-zinc-400 space-y-1 text-[10px]">
                                                        <div className="flex items-center gap-1.5 lowercase select-all"><Mail size={10} className="text-zinc-500 shrink-0" /> {payee.email}</div>
                                                        <div className="flex items-center gap-1.5 select-all"><Phone size={10} className="text-zinc-500 shrink-0" /> {payee.phone}</div>
                                                    </td>
                                                    <td className="p-6 text-zinc-300 text-[10px]">{payee.paymentMode}</td>
                                                    <td className="p-6 text-zinc-400">
                                                        {payee.destinationDetails ? (
                                                            <div className="flex items-center gap-2 max-w-[240px]" onClick={e => e.stopPropagation()}>
                                                                <span className="font-mono text-[9px] truncate text-white select-all">{payee.destinationDetails}</span>
                                                                <button 
                                                                    onClick={() => handleCopyDetails(payee.destinationDetails)}
                                                                    className="p-1.5 hover:bg-white/10 text-zinc-500 rounded hover:text-white transition-all shrink-0 border border-white/5"
                                                                    title="Copy Payout Address"
                                                                >
                                                                    <Copy size={10} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[8px] text-zinc-700 font-black">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="p-6 text-neon-blue text-[9px] font-mono select-all">
                                                        {payee.linkedGig || (payee.type === 'Volunteer' ? 'General gig' : 'N/A')}
                                                    </td>
                                                    <td className="p-6 text-zinc-500 font-mono text-[10px]">
                                                        {payee.createdAt ? new Date(payee.createdAt).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="p-6 text-right" onClick={e => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => handleCopyDetails(payee.destinationDetails)} 
                                                                className="p-2 text-zinc-400 hover:text-white transition-colors border border-white/10 rounded-lg bg-zinc-950/40 hover:bg-zinc-800"
                                                                title="Copy Payment Address"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                                <button 
                                                                    onClick={() => handleDeletePayee(payee.id)} 
                                                                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors border border-white/10 rounded-lg bg-zinc-950/40 hover:bg-red-500/10 hover:border-red-500/30"
                                                                    title="Remove Payee"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                
                                                {/* Expanded Details Drawer */}
                                                {isExpanded && (
                                                    <tr className="bg-zinc-950/40 border-b border-white/5">
                                                        <td colSpan="8" className="p-0">
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.25 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-6 grid grid-cols-3 gap-6 text-left border-l-2 border-neon-blue bg-white/[0.01]">
                                                                    {/* Notes / Bio */}
                                                                    <div className="space-y-2">
                                                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <FileText size={10} className="text-neon-blue" /> Payee Biography & Notes
                                                                        </span>
                                                                        <p className="text-[10px] text-zinc-300 normal-case font-semibold leading-relaxed italic bg-zinc-950/40 border border-white/5 p-4 rounded-xl min-h-[90px]">
                                                                            {payee.notes || "No notes or specific instructions provided for this payee profile."}
                                                                        </p>
                                                                    </div>
                                                                    
                                                                    {/* Bank details info */}
                                                                    <div className="space-y-2">
                                                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <CreditCard size={10} className="text-neon-green" /> Payout Credentials
                                                                        </span>
                                                                        <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-xl space-y-2 text-[10px] min-h-[90px] flex flex-col justify-center">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-zinc-500 font-bold uppercase">Payment Mode</span>
                                                                                <span className="text-white font-black">{payee.paymentMode}</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-start gap-4">
                                                                                <span className="text-zinc-500 font-bold uppercase shrink-0">Address</span>
                                                                                <span className="text-white font-mono break-all font-semibold select-all text-right">{payee.destinationDetails || 'N/A'}</span>
                                                                            </div>
                                                                            {payee.bankDetails && (
                                                                                <>
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="text-zinc-500 font-bold uppercase">Bank Name</span>
                                                                                        <span className="text-white font-black">{payee.bankDetails.bankName}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="text-zinc-500 font-bold uppercase">Bank IFSC</span>
                                                                                        <span className="text-white font-mono font-black">{payee.bankDetails.ifscCode}</span>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Record info */}
                                                                    <div className="space-y-2">
                                                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <Clock size={10} className="text-neon-pink" /> Record Metadata
                                                                        </span>
                                                                        <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-xl space-y-2 text-[10px] min-h-[90px] flex flex-col justify-center">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-zinc-500 font-bold uppercase">Registry ID</span>
                                                                                <span className="text-white font-mono text-[9px] select-all">{payee.id}</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-zinc-500 font-bold uppercase">Onboarded</span>
                                                                                <span className="text-white font-semibold">{payee.createdAt ? new Date(payee.createdAt).toLocaleString('en-IN') : 'N/A'}</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-zinc-500 font-bold uppercase">Gig Scope</span>
                                                                                <span className="text-neon-blue font-black uppercase tracking-wider text-[9px]">{payee.linkedGig || 'Global Retainer'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="p-12">
                                            <div className="flex items-center justify-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No records found</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default PayeeRegistry;
