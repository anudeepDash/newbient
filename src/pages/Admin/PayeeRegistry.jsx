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
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const PayeeRegistry = () => {
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

    // District Category Navigation setup
    const categories = [
        {
            name: 'Overview',
            desc: 'Liquidity Dashboard',
            info: 'Real-time metrics, cash flow graphs & indicators',
            path: '/admin/finance',
            icon: LayoutGrid,
            color: 'text-[#39FF14]',
            glow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:border-[#39FF14]/40',
            bgGradient: 'from-[#39FF14]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#39FF14]/15',
            badge: 'COMMAND',
            active: false
        },
        {
            name: 'Spends Ledger',
            desc: 'Expenditures & Debits',
            info: 'Track payroll, supplier bills, and vendor payouts',
            path: '/admin/spends',
            icon: CreditCard,
            color: 'text-[#FF2E90]',
            glow: 'hover:shadow-[0_0_30px_rgba(255,46,144,0.15)] hover:border-[#FF2E90]/40',
            bgGradient: 'from-[#FF2E90]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#FF2E90]/15',
            badge: 'DEBITS',
            active: false
        },
        {
            name: 'Other Income',
            desc: 'Revenue & Capital Inflow',
            info: 'Manage sponsorships, tickets, and external grants',
            path: '/admin/other-income',
            icon: FileSpreadsheet,
            color: 'text-[#39FF14]',
            glow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:border-[#39FF14]/40',
            bgGradient: 'from-[#39FF14]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#39FF14]/15',
            badge: 'INFLOW',
            active: false
        },
        {
            name: 'Payee Registry',
            desc: 'Beneficiary Directory',
            info: 'Manage rosters of volunteers, retainers, and crews',
            path: '/admin/payees',
            icon: User,
            color: 'text-[#00F0FF]',
            glow: 'hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] hover:border-[#00F0FF]/40',
            bgGradient: 'from-[#00F0FF]/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-[#00F0FF]/15',
            badge: 'REGISTRY',
            active: true
        }
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

    // Circular progress proportion metric drawing
    const renderProportionCircle = (count, total, colorClass) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const radius = 14;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;
        
        return (
            <div className="relative w-10 h-10 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="20" cy="20" r={radius} className="stroke-white/5" strokeWidth="2.5" fill="transparent" />
                    <circle 
                        cx="20" 
                        cy="20" 
                        r={radius} 
                        className={cn("transition-all duration-1000", colorClass)} 
                        strokeWidth="2.5" 
                        fill="transparent" 
                        strokeDasharray={circumference} 
                        strokeDashoffset={strokeDashoffset} 
                        strokeLinecap="round" 
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white/50">
                    {Math.round(percentage)}%
                </span>
            </div>
        );
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
                {/* District Category Booking Tiles Navigation Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {categories.map((cat) => {
                        const IconComp = cat.icon;
                        return (
                            <Link 
                                key={cat.name} 
                                to={cat.path}
                                className={cn(
                                    "relative overflow-hidden group p-5 rounded-3xl border bg-gradient-to-br bg-zinc-900/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/60 select-none",
                                    cat.borderColor,
                                    cat.glow,
                                    cat.active && "border-[#00F0FF]/40 bg-[#00F0FF]/5 shadow-[0_0_20px_rgba(0,240,255,0.06)]"
                                )}
                            >
                                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.03] transition-opacity duration-300 group-hover:opacity-[0.07]", cat.bgGradient)} />
                                <div className="flex justify-between items-start mb-4">
                                    <div className={cn("p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", cat.color)}>
                                        <IconComp size={16} />
                                    </div>
                                    <span className={cn(
                                        "text-[7px] font-black px-2 py-0.5 rounded-full tracking-widest border uppercase",
                                        cat.active 
                                            ? "bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/20" 
                                            : "bg-white/5 text-gray-500 border-white/5"
                                    )}>
                                        {cat.badge}
                                    </span>
                                </div>
                                <h4 className="text-xs font-black uppercase text-white tracking-wider mb-1">{cat.name}</h4>
                                <p className="text-[9px] font-bold text-gray-400 leading-snug line-clamp-1">{cat.desc}</p>
                                <p className="text-[8px] font-medium text-gray-600 leading-normal line-clamp-2 mt-1.5 group-hover:text-gray-500 transition-colors">{cat.info}</p>
                            </Link>
                        );
                    })}
                </div>
                
                {/* Upper Grid: Link Builder Console & Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Registration Link Generator Console */}
                    <Card className="lg:col-span-2 p-6 md:p-8 bg-zinc-900/40 border-white/5 hover:border-white/10 transition-all rounded-[2.5rem] border shadow-[0_15px_30px_rgba(0,0,0,0.5)]">
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
                                                    className="w-full bg-zinc-950 border border-white/10 h-12 rounded-xl text-xs font-bold px-4 text-white outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/30 transition-all appearance-none cursor-pointer"
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
                                            <Input
                                                value={customEvent}
                                                onChange={(e) => {
                                                    setCustomEvent(e.target.value);
                                                    if (e.target.value) setSelectedEvent('');
                                                }}
                                                placeholder="e.g. Summer Festival 2026 Coordinator"
                                                className="h-12 border-white/10 bg-zinc-950 focus:border-neon-blue"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Generated Output View Block */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4 border-t border-white/5">
                                <Button 
                                    type="submit" 
                                    className="h-12 px-8 bg-gradient-to-r from-neon-blue to-blue-600 text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(59,130,246,0.2)] shrink-0"
                                >
                                    <LinkIcon size={12} /> {copiedLink ? 'Copied URL!' : 'Forge Provision Link'}
                                </Button>
                                {generatedLink && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-[8px] text-neon-blue bg-neon-blue/5 border border-neon-blue/20 px-4 rounded-xl truncate font-mono select-all flex-1 h-12 flex items-center justify-between gap-4 group"
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
                    </Card>

                    {/* Stats summary panel */}
                    <Card className="p-6 md:p-8 bg-zinc-900/40 border-white/5 hover:border-white/10 transition-all rounded-[2.5rem] border shadow-[0_15px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-black font-heading tracking-tighter uppercase italic text-white mb-1">
                                registry status
                            </h3>
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-6">
                                Quick metrics across onboarded payee profiles
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <span className="text-[7px] font-black text-gray-600 block uppercase tracking-widest">Total Payees</span>
                                    <span className="text-2xl font-black text-white block mt-1">{financePayees.length}</span>
                                </div>
                                {renderProportionCircle(financePayees.length, financePayees.length, 'stroke-white')}
                            </div>
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <span className="text-[7px] font-black text-gray-600 block uppercase tracking-widest">Volunteers</span>
                                    <span className="text-2xl font-black text-neon-green block mt-1">
                                        {financePayees.filter(p => p.type === 'Volunteer').length}
                                    </span>
                                </div>
                                {renderProportionCircle(financePayees.filter(p => p.type === 'Volunteer').length, financePayees.length, 'stroke-neon-green')}
                            </div>
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <span className="text-[7px] font-black text-gray-600 block uppercase tracking-widest">Vendors</span>
                                    <span className="text-2xl font-black text-neon-pink block mt-1">
                                        {financePayees.filter(p => p.type === 'Vendor').length}
                                    </span>
                                </div>
                                {renderProportionCircle(financePayees.filter(p => p.type === 'Vendor').length, financePayees.length, 'stroke-neon-pink')}
                            </div>
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <span className="text-[7px] font-black text-gray-600 block uppercase tracking-widest">Core & Artists</span>
                                    <span className="text-2xl font-black text-neon-blue block mt-1">
                                        {financePayees.filter(p => p.type === 'Salary' || p.type === 'Artist').length}
                                    </span>
                                </div>
                                {renderProportionCircle(financePayees.filter(p => p.type === 'Salary' || p.type === 'Artist').length, financePayees.length, 'stroke-neon-blue')}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filters & Control Console */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-4 backdrop-blur-3xl space-y-4">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={18} />
                            <input 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search payees by name, contact info, destination, gig reference..."
                                className="w-full bg-zinc-900/40 hover:bg-zinc-900/60 h-14 pl-16 pr-6 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600 border border-white/5 focus:border-neon-blue focus:shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                            />
                        </div>

                        {/* Payee Type Filter */}
                        <div className="w-full md:w-48 space-y-1">
                            <select 
                                value={typeFilter} 
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full bg-zinc-900/80 border border-white/10 h-14 rounded-xl px-4 text-gray-300 outline-none focus:border-neon-blue/40 transition-all text-[9px] font-black uppercase tracking-widest cursor-pointer"
                            >
                                <option value="All" className="bg-zinc-950">All Types</option>
                                <option value="Volunteer" className="bg-zinc-950">Volunteers</option>
                                <option value="Vendor" className="bg-zinc-950">Vendors</option>
                                <option value="Salary" className="bg-zinc-950">Core Team</option>
                                <option value="Artist" className="bg-zinc-950">Artists</option>
                            </select>
                        </div>

                        {/* Payment Mode Filter */}
                        <div className="w-full md:w-48 space-y-1">
                            <select 
                                value={paymentModeFilter} 
                                onChange={(e) => setPaymentModeFilter(e.target.value)}
                                className="w-full bg-zinc-900/80 border border-white/10 h-14 rounded-xl px-4 text-gray-300 outline-none focus:border-neon-blue/40 transition-all text-[9px] font-black uppercase tracking-widest cursor-pointer"
                            >
                                <option value="All" className="bg-zinc-950">All Modes</option>
                                <option value="UPI" className="bg-zinc-950">UPI</option>
                                <option value="Bank Transfer" className="bg-zinc-950">Bank Transfer</option>
                                <option value="Other" className="bg-zinc-950">Other Methods</option>
                            </select>
                        </div>

                        {/* Clear button */}
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setTypeFilter('All');
                                setPaymentModeFilter('All');
                            }}
                            className="w-full md:w-auto h-14 px-6 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2 font-black tracking-widest uppercase text-[9px] shrink-0"
                        >
                            <X size={12} /> Clear
                        </button>
                    </div>
                </div>

                {/* MOBILE DECK VIEW: Hidden on desktop, layout optimized for touch cards */}
                <div className="grid grid-cols-1 gap-4 lg:hidden">
                    {filteredPayees.length > 0 ? (
                        filteredPayees.map((payee) => {
                            const isExpanded = expandedPayeeId === payee.id;
                            return (
                                <Card key={payee.id} className="p-5 bg-zinc-900/40 border-white/5 rounded-2xl flex flex-col gap-4 relative overflow-hidden">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h4 className="text-sm font-black text-white">{payee.name}</h4>
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono select-all block mt-0.5">ID: {payee.id.slice(0, 8)}...</span>
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
                                    
                                    <div className="space-y-1.5 text-[10px] text-gray-400 border-t border-white/5 pt-3">
                                        <div className="flex items-center gap-2 select-all"><Mail size={12} className="text-gray-600 shrink-0" /> {payee.email}</div>
                                        <div className="flex items-center gap-2 select-all"><Phone size={12} className="text-gray-600 shrink-0" /> {payee.phone}</div>
                                        <div className="flex items-center gap-2 select-all"><CreditCard size={12} className="text-gray-600 shrink-0" /> {payee.paymentMode}: {payee.destinationDetails || 'N/A'}</div>
                                    </div>

                                    {payee.notes && (
                                        <div className="text-[9px] text-gray-500 leading-normal font-semibold normal-case italic bg-white/[0.01] p-3 rounded-lg border border-white/5 mt-1">
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
                                                className="p-2 text-gray-500 hover:text-white transition-colors border border-white/5 rounded-lg bg-zinc-900/60"
                                                title="Copy Payment Address"
                                            >
                                                <Copy size={12} />
                                            </button>
                                            {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                <button 
                                                    onClick={() => handleDeletePayee(payee.id)} 
                                                    className="p-2 text-gray-500 hover:text-red-500 transition-colors border border-white/5 rounded-lg bg-zinc-900/60"
                                                    title="Remove Payee"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <Card className="p-8 text-center text-[10px] text-gray-500 uppercase tracking-widest font-black font-mono bg-zinc-900/40 border-white/5 rounded-2xl">
                            No registered payees found matching criteria.
                        </Card>
                    )}
                </div>

                {/* DESKTOP SHEET TABLE VIEW: Hidden on mobile viewports */}
                <div className="hidden lg:block overflow-x-auto scrollbar-hide">
                    <Card className="min-w-[1000px] bg-zinc-900/40 border-white/5 rounded-3xl p-0 border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
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
                                                    "hover:bg-white/[0.01] transition-all group cursor-pointer",
                                                    isExpanded && "bg-white/[0.02]"
                                                )}
                                                    onClick={() => setExpandedPayeeId(isExpanded ? null : payee.id)}
                                                >
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-2">
                                                            {isExpanded ? <ChevronUp size={12} className="text-neon-blue" /> : <ChevronDown size={12} className="text-gray-500 group-hover:text-white" />}
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
                                                    <td className="p-6 text-gray-400 space-y-1 text-[10px]">
                                                        <div className="flex items-center gap-1.5 lowercase select-all"><Mail size={10} className="text-gray-600 shrink-0" /> {payee.email}</div>
                                                        <div className="flex items-center gap-1.5 select-all"><Phone size={10} className="text-gray-600 shrink-0" /> {payee.phone}</div>
                                                    </td>
                                                    <td className="p-6 text-gray-300 text-[10px]">{payee.paymentMode}</td>
                                                    <td className="p-6 text-gray-400">
                                                        {payee.destinationDetails ? (
                                                            <div className="flex items-center gap-2 max-w-[240px]" onClick={e => e.stopPropagation()}>
                                                                <span className="font-mono text-[9px] truncate text-white select-all">{payee.destinationDetails}</span>
                                                                <button 
                                                                    onClick={() => handleCopyDetails(payee.destinationDetails)}
                                                                    className="p-1.5 hover:bg-white/10 text-gray-500 rounded hover:text-white transition-all shrink-0 border border-white/5"
                                                                    title="Copy Payout Address"
                                                                >
                                                                    <Copy size={10} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[8px] text-gray-700 font-black">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="p-6 text-neon-blue text-[9px] font-mono select-all">
                                                        {payee.linkedGig || (payee.type === 'Volunteer' ? 'General gig' : 'N/A')}
                                                    </td>
                                                    <td className="p-6 text-gray-500 font-mono text-[10px]">
                                                        {payee.createdAt ? new Date(payee.createdAt).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="p-6 text-right" onClick={e => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => handleCopyDetails(payee.destinationDetails)} 
                                                                className="p-2 text-gray-500 hover:text-white transition-colors border border-white/5 rounded-lg bg-zinc-900/60"
                                                                title="Copy Payment Address"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            {user?.role !== 'editor' && user?.role !== 'content_admin' && (
                                                                <button 
                                                                    onClick={() => handleDeletePayee(payee.id)} 
                                                                    className="p-2 text-gray-500 hover:text-red-500 transition-colors border border-white/5 rounded-lg bg-zinc-900/60"
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
                                                    <tr className="bg-black/40 border-b border-white/5">
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
                                                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <FileText size={10} className="text-neon-blue" /> Payee Biography & Notes
                                                                        </span>
                                                                        <p className="text-[10px] text-gray-300 normal-case font-semibold leading-relaxed italic bg-black/40 border border-white/5 p-4 rounded-xl min-h-[90px]">
                                                                            {payee.notes || "No notes or specific instructions provided for this payee profile."}
                                                                        </p>
                                                                    </div>
                                                                    
                                                                    {/* Bank details info */}
                                                                    <div className="space-y-2">
                                                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <CreditCard size={10} className="text-neon-green" /> Payout Credentials
                                                                        </span>
                                                                        <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-2 text-[10px] min-h-[90px] flex flex-col justify-center">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-gray-500 font-bold uppercase">Payment Mode</span>
                                                                                <span className="text-white font-black">{payee.paymentMode}</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-start gap-4">
                                                                                <span className="text-gray-500 font-bold uppercase shrink-0">Address</span>
                                                                                <span className="text-white font-mono break-all font-semibold select-all text-right">{payee.destinationDetails || 'N/A'}</span>
                                                                            </div>
                                                                            {payee.bankDetails && (
                                                                                <>
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="text-gray-500 font-bold uppercase">Bank Name</span>
                                                                                        <span className="text-white font-black">{payee.bankDetails.bankName}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="text-gray-500 font-bold uppercase">Bank IFSC</span>
                                                                                        <span className="text-white font-mono font-black">{payee.bankDetails.ifscCode}</span>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Record info */}
                                                                    <div className="space-y-2">
                                                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <Clock size={10} className="text-neon-pink" /> Record Metadata
                                                                        </span>
                                                                        <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-2 text-[10px] min-h-[90px] flex flex-col justify-center">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-gray-500 font-bold uppercase">Registry ID</span>
                                                                                <span className="text-white font-mono text-[9px] select-all">{payee.id}</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-gray-500 font-bold uppercase">Onboarded</span>
                                                                                <span className="text-white font-semibold">{payee.createdAt ? new Date(payee.createdAt).toLocaleString('en-IN') : 'N/A'}</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-gray-500 font-bold uppercase">Gig Scope</span>
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
                                        <td colSpan="8" className="p-12 text-center text-[10px] text-gray-500 uppercase tracking-widest font-black font-mono">
                                            No registered payees found matching criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </Card>
                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default PayeeRegistry;
