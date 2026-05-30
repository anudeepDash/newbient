import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import ArrowDownRight from 'lucide-react/dist/esm/icons/arrow-down-right';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import User from 'lucide-react/dist/esm/icons/user';
import Info from 'lucide-react/dist/esm/icons/info';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';

import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { cn } from '../../lib/utils';

const FinanceDashboard = () => {
    const { invoices, spends, otherIncomes } = useStore();

    // Isolated Finance-only navigation tabs
    const financeTabs = [
        { name: 'Overview', path: '/admin/finance', icon: LayoutGrid, color: 'text-neon-green' },
        { name: 'Spends Ledger', path: '/admin/spends', icon: IndianRupee, color: 'text-neon-pink' },
        { name: 'Other Income', path: '/admin/other-income', icon: FileSpreadsheet, color: 'text-neon-green' },
        { name: 'Payee Registry', path: '/admin/payees', icon: User, color: 'text-neon-blue' }
    ];

    // District Category Tiles
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
            active: true
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
            active: false
        }
    ];

    // Helper to get month label "MMM YYYY" (e.g., "May 2026")
    const getMonthLabel = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Calculate current month default
    const currentMonthDefault = useMemo(() => {
        return new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }, []);

    const [selectedMonth, setSelectedMonth] = useState(currentMonthDefault);

    // Generate Month Options dynamically based on data + standard past 12 months list
    const monthOptions = useMemo(() => {
        const months = new Set();
        months.add(currentMonthDefault);

        // Add from invoices
        invoices.forEach(inv => {
            const label = getMonthLabel(inv.createdAt || inv.issueDate);
            if (label) months.add(label);
        });

        // Add from spends
        spends.forEach(sp => {
            const label = getMonthLabel(sp.createdAt || sp.date);
            if (label) months.add(label);
        });

        // Add from other incomes
        otherIncomes.forEach(inc => {
            const label = getMonthLabel(inc.createdAt || inc.date);
            if (label) months.add(label);
        });

        // Generate past 6 months to ensure list is rich
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - i);
            months.add(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        }

        // Sort options chronologically
        const sorted = Array.from(months).sort((a, b) => {
            return new Date(b) - new Date(a);
        });

        return ['All Time', ...sorted];
    }, [invoices, spends, otherIncomes, currentMonthDefault]);

    // Filter elements helper based on selected month
    const filterBySelectedMonth = (itemDate) => {
        if (selectedMonth === 'All Time') return true;
        return getMonthLabel(itemDate) === selectedMonth;
    };

    // Metrics calculations for selected month
    const metrics = useMemo(() => {
        // System Invoices (paid)
        const systemPaid = invoices
            .filter(inv => inv.status === 'Paid' && filterBySelectedMonth(inv.createdAt || inv.issueDate))
            .reduce((sum, inv) => sum + Number(inv.total || inv.amount || 0), 0);

        const systemPending = invoices
            .filter(inv => (inv.status === 'Pending' || inv.status === 'Verification Pending') && filterBySelectedMonth(inv.createdAt || inv.issueDate))
            .reduce((sum, inv) => sum + Number(inv.total || inv.amount || 0), 0);

        // Other Incomes (paid)
        const otherPaid = otherIncomes
            .filter(inc => inc.status === 'Paid' && filterBySelectedMonth(inc.createdAt || inc.date))
            .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

        const otherPending = otherIncomes
            .filter(inc => inc.status === 'Pending' && filterBySelectedMonth(inc.createdAt || inc.date))
            .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

        // Spends (paid/cleared)
        const spendsPaid = spends
            .filter(sp => (sp.status === 'Paid' || sp.status === 'Cleared') && filterBySelectedMonth(sp.createdAt || sp.date))
            .reduce((sum, sp) => sum + Number(sp.amount || 0), 0);

        const spendsPending = spends
            .filter(sp => (sp.status === 'Pending' || sp.status === 'Unpaid') && filterBySelectedMonth(sp.createdAt || sp.date))
            .reduce((sum, sp) => sum + Number(sp.amount || 0), 0);

        const totalRevenue = systemPaid + otherPaid;
        const totalExpenses = spendsPaid;
        const netCashFlow = totalRevenue - totalExpenses;
        const outstandingReceivables = systemPending + otherPending;
        const pendingSpends = spendsPending;

        return {
            totalRevenue,
            totalExpenses,
            netCashFlow,
            outstandingReceivables,
            pendingSpends,
            systemPaid,
            systemPending,
            otherPaid,
            otherPending,
            spendsPaid,
            spendsPending
        };
    }, [invoices, spends, otherIncomes, selectedMonth]);

    // 6-Month cashflow chart generation
    const chartData = useMemo(() => {
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - i);
            const label = d.toLocaleDateString('en-US', { month: 'short' });
            const year = d.getFullYear();
            const optionLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            last6Months.push({
                label: `${label} ${year}`,
                optionLabel,
                monthNum: d.getMonth(),
                year,
                income: 0,
                spends: 0
            });
        }

        // Map system invoices
        invoices.forEach(inv => {
            if (inv.status !== 'Paid') return;
            const dateStr = inv.createdAt || inv.issueDate;
            if (!dateStr) return;
            const d = new Date(dateStr);
            const match = last6Months.find(m => m.monthNum === d.getMonth() && m.year === d.getFullYear());
            if (match) match.income += Number(inv.total || inv.amount || 0);
        });

        // Map other incomes
        otherIncomes.forEach(inc => {
            if (inc.status !== 'Paid') return;
            const dateStr = inc.createdAt || inc.date;
            if (!dateStr) return;
            const d = new Date(dateStr);
            const match = last6Months.find(m => m.monthNum === d.getMonth() && m.year === d.getFullYear());
            if (match) match.income += Number(inc.amount || 0);
        });

        // Map spends
        spends.forEach(sp => {
            if (sp.status !== 'Paid' && sp.status !== 'Cleared') return;
            const dateStr = sp.createdAt || sp.date;
            if (!dateStr) return;
            const d = new Date(dateStr);
            const match = last6Months.find(m => m.monthNum === d.getMonth() && m.year === d.getFullYear());
            if (match) match.spends += Number(sp.amount || 0);
        });

        return last6Months;
    }, [invoices, spends, otherIncomes]);

    const chartMax = useMemo(() => {
        const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.spends)), 10000);
        return Math.ceil(maxVal / 10000) * 10000;
    }, [chartData]);

    // Spends breakdown by category for selected month
    const categorySpends = useMemo(() => {
        const totals = {};
        let grandTotal = 0;
        spends.forEach(sp => {
            if (sp.status !== 'Paid' && sp.status !== 'Cleared') return;
            if (!filterBySelectedMonth(sp.createdAt || sp.date)) return;
            
            // Format spend type/category
            const type = sp.payoutType || sp.category || 'Misc';
            const amt = Number(sp.amount || 0);
            totals[type] = (totals[type] || 0) + amt;
            grandTotal += amt;
        });

        return Object.entries(totals)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [spends, selectedMonth]);

    // Revenue breakdown by category for selected month
    const categoryIncome = useMemo(() => {
        const totals = {};
        let grandTotal = 0;

        invoices.forEach(inv => {
            if (inv.status !== 'Paid') return;
            if (!filterBySelectedMonth(inv.createdAt || inv.issueDate)) return;
            const cat = inv.category || 'Client Invoices';
            const amt = Number(inv.total || inv.amount || 0);
            totals[cat] = (totals[cat] || 0) + amt;
            grandTotal += amt;
        });

        otherIncomes.forEach(inc => {
            if (inc.status !== 'Paid') return;
            if (!filterBySelectedMonth(inc.createdAt || inc.date)) return;
            const cat = inc.category || 'Other Revenue';
            const amt = Number(inc.amount || 0);
            totals[cat] = (totals[cat] || 0) + amt;
            grandTotal += amt;
        });

        return Object.entries(totals)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [invoices, otherIncomes, selectedMonth]);

    // Unified Chronological Activity Ledger filtered by month
    const recentActivity = useMemo(() => {
        const list = [];

        invoices.forEach(inv => {
            if (!filterBySelectedMonth(inv.createdAt || inv.issueDate)) return;
            list.push({
                id: inv.id,
                type: 'invoice',
                title: `Invoice #${inv.invoiceNumber || 'NEWBI'} — ${inv.clientName}`,
                amount: Number(inv.total || inv.amount || 0),
                date: inv.createdAt || inv.issueDate,
                status: inv.status,
                account: 'Newbi Account',
                handler: inv.createdByEmail || 'System Creator'
            });
        });

        otherIncomes.forEach(inc => {
            if (!filterBySelectedMonth(inc.createdAt || inc.date)) return;
            list.push({
                id: inc.id,
                type: 'income',
                title: `External Income: ${inc.sourceName || 'Other'}`,
                amount: Number(inc.amount || 0),
                date: inc.createdAt || inc.date,
                status: inc.status,
                account: inc.accountType === 'personal' ? `Personal (${inc.receiverName || 'Core'})` : 'Newbi Account',
                handler: inc.receiverName || 'Core Team'
            });
        });

        spends.forEach(sp => {
            if (!filterBySelectedMonth(sp.createdAt || sp.date)) return;
            
            // Format title by payout type
            let displayTitle = `Expense: ${sp.title}`;
            if (sp.payoutType === 'Salary') displayTitle = `Salary Payout: ${sp.receiverName} (${sp.notes || 'Core Team'})`;
            else if (sp.payoutType === 'Volunteer Payout') displayTitle = `Volunteer payout: ${sp.receiverName} (${sp.title})`;
            else if (sp.payoutType === 'Vendor Payout') displayTitle = `Vendor payout: ${sp.paidTo} (${sp.title})`;

            list.push({
                id: sp.id,
                type: 'spend',
                title: displayTitle,
                amount: Number(sp.amount || 0),
                date: sp.createdAt || sp.date,
                status: sp.status,
                account: sp.accountType === 'personal' ? `Personal (${sp.receiverName || sp.paidBy})` : 'Newbi Account',
                handler: sp.paidBy || 'Core Team'
            });
        });

        return list
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
            .slice(0, 10);
    }, [invoices, spends, otherIncomes, selectedMonth]);

    // Circular proportion indicator generator
    const renderProportionRing = (numerator, denominator, colorClass, textLabel) => {
        const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0;
        const radius = 22;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        return (
            <div className="flex items-center gap-3 shrink-0">
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="28" cy="28" r={radius} className="stroke-white/5" strokeWidth="3.5" fill="transparent" />
                        <circle 
                            cx="28" 
                            cy="28" 
                            r={radius} 
                            className={cn("transition-all duration-1000", colorClass)} 
                            strokeWidth="3.5" 
                            fill="transparent" 
                            strokeDasharray={circumference} 
                            strokeDashoffset={strokeDashoffset} 
                            strokeLinecap="round" 
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white/80">
                        {Math.round(percentage)}%
                    </span>
                </div>
                {textLabel && (
                    <div className="flex flex-col">
                        <span className="text-[7px] text-gray-500 font-bold uppercase tracking-wider leading-none">{textLabel}</span>
                        <span className="text-[10px] text-white font-black mt-1 leading-none">
                            {numerator.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / {denominator.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'FINANCE',
                subtitle: 'COMMAND',
                accentClass: 'text-[#39FF14]',
                icon: IndianRupee
            }}
            tabs={financeTabs}
            accentColor="neon-green"
            action={
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                        <Calendar size={14} className="text-[#39FF14]" /> Period:
                    </span>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-zinc-900 border border-white/10 h-11 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-white outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14]/30 shadow-xl cursor-pointer hover:border-white/20 transition-all"
                    >
                        {monthOptions.map(opt => (
                            <option key={opt} value={opt} className="bg-zinc-950 text-white font-semibold">{opt}</option>
                        ))}
                    </select>
                </div>
            }
        >
            <div className="space-y-10 relative">

                {/* Ambient Background Glow Blobs for Glassmorphism */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-[#39FF14]/5 blur-[120px] animate-pulse duration-[10000ms]" />
                    <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#FF2E90]/5 blur-[150px] animate-pulse duration-[8000ms]" />
                    <div className="absolute top-[50%] left-[40%] w-[300px] h-[300px] rounded-full bg-[#00F0FF]/5 blur-[100px]" />
                </div>

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
                                    cat.active && "border-[#39FF14]/40 bg-[#39FF14]/5 shadow-[0_0_20px_rgba(57,255,20,0.06)]"
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
                                            ? "bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20" 
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

                {/* Upper Deck: Glassmorphic Cards & Metric Tiles */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Glassmorphic Net Cash Flow Widget */}
                    <div className="relative bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] group hover:border-white/20 transition-all duration-300 min-h-[220px]">
                        {/* Top Gradient Highlight Bar */}
                        <div className={cn(
                            "absolute top-0 left-0 w-full h-[3px]", 
                            metrics.netCashFlow >= 0 ? "bg-gradient-to-r from-[#39FF14] to-emerald-400" : "bg-gradient-to-r from-[#FF2E90] to-rose-600"
                        )} />

                        {/* Large Subtle Rupee Watermark */}
                        <div className="absolute -bottom-10 right-4 opacity-[0.03] pointer-events-none text-white select-none">
                            <IndianRupee size={150} />
                        </div>

                        {/* 1. Header Details */}
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[7.5px] font-black text-gray-400 uppercase tracking-[0.25em] block">
                                    NET LIQUIDITY OPERATIONS
                                </span>
                                <span className={cn(
                                    "text-[7px] font-black font-mono tracking-widest",
                                    metrics.netCashFlow >= 0 ? "text-[#39FF14]" : "text-[#FF2E90]"
                                )}>
                                    REF# {selectedMonth.replace(/\s+/g, '-').toUpperCase()}
                                </span>
                            </div>
                            
                            <div className={cn(
                                "text-3xl md:text-4xl font-black font-heading tracking-tight italic uppercase flex items-center gap-1", 
                                metrics.netCashFlow >= 0 ? "text-[#39FF14]" : "text-[#FF2E90]"
                            )}>
                                <IndianRupee className="size-6 md:size-8 stroke-[2.5]" />
                                {metrics.netCashFlow.toLocaleString('en-IN')}
                            </div>
                        </div>

                        <div className="w-full border-t border-white/5 my-4 z-10" />

                        {/* 2. Bottom Details */}
                        <div className="relative z-10">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "h-2 w-2 rounded-full",
                                        metrics.netCashFlow >= 0 ? "bg-[#39FF14] animate-pulse" : "bg-[#FF2E90] animate-pulse"
                                    )} />
                                    <span className="text-[7.5px] font-black uppercase text-gray-400 tracking-wider">
                                        {metrics.netCashFlow >= 0 ? 'Surplus Operational Cap' : 'Negative Deficit Threshold'}
                                    </span>
                                </div>
                                <span className={cn(
                                    "text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-white/5",
                                    metrics.netCashFlow >= 0 ? "text-[#39FF14] border-[#39FF14]/20" : "text-[#FF2E90] border-[#FF2E90]/20"
                                )}>
                                    {metrics.netCashFlow >= 0 ? 'Active Surplus' : 'Deficit Alert'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* METRICS CARDS COLUMN (Total Revenue & Expenses) */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                        
                        {/* 1. Cleared Revenue Booking */}
                        <Card className="p-5 md:p-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] hover:border-white/20 transition-all duration-300 rounded-[2rem] relative overflow-hidden flex flex-col justify-between hover:shadow-[0_15px_30px_rgba(57,255,20,0.06)]">
                            <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-[#39FF14] to-teal-400" />
                            <div>
                                <span className="text-[7.5px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-2">Cleared Revenue</span>
                                <div className="text-xl md:text-2xl font-black font-heading tracking-tight text-white italic uppercase flex items-center gap-0.5">
                                    <IndianRupee className="size-4 md:size-5 stroke-[2]" />
                                    {metrics.totalRevenue.toLocaleString('en-IN')}
                                </div>
                                 <div className="text-[7.5px] font-bold text-gray-500 uppercase mt-2.5 space-y-1">
                                     <div className="flex justify-between">
                                         <span>Invoices</span>
                                         <span className="text-white">₹{metrics.systemPaid.toLocaleString('en-IN')}</span>
                                     </div>
                                     <div className="flex justify-between">
                                         <span>Other Inc.</span>
                                         <span className="text-white">₹{metrics.otherPaid.toLocaleString('en-IN')}</span>
                                     </div>
                                 </div>
                            </div>
                            <div className="mt-5 border-t border-white/5 pt-3">
                                {renderProportionRing(metrics.totalRevenue, metrics.totalRevenue + metrics.outstandingReceivables, 'stroke-[#39FF14]', 'CLEARANCE RATE')}
                            </div>
                        </Card>

                        {/* 2. Cleared Spends (Expenditures) */}
                        <Card className="p-5 md:p-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] hover:border-white/20 transition-all duration-300 rounded-[2rem] relative overflow-hidden flex flex-col justify-between hover:shadow-[0_15px_30px_rgba(255,46,144,0.06)]">
                            <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-[#FF2E90] to-red-500" />
                            <div>
                                <span className="text-[7.5px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-2">Cleared Spends</span>
                                <div className="text-xl md:text-2xl font-black font-heading tracking-tight text-white italic uppercase flex items-center gap-0.5">
                                    <IndianRupee className="size-4 md:size-5 stroke-[2]" />
                                    {metrics.totalExpenses.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[7.5px] font-bold text-gray-500 uppercase mt-2.5 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Paid Ledger</span>
                                        <span className="text-white">₹{metrics.spendsPaid.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Unpaid Queue</span>
                                        <span className="text-white">₹{metrics.spendsPending.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 border-t border-white/5 pt-3">
                                {renderProportionRing(metrics.totalExpenses, metrics.totalExpenses + metrics.pendingSpends, 'stroke-[#FF2E90]', 'OUTFLOW CLEARED')}
                            </div>
                        </Card>

                        {/* 3. Outstanding Receivables */}
                        <Card className="p-5 md:p-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] hover:border-white/20 transition-all duration-300 rounded-[2rem] relative overflow-hidden flex flex-col justify-between hover:shadow-[0_15px_30px_rgba(234,179,8,0.06)]">
                            <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-yellow-400 to-amber-500" />
                            <div>
                                <span className="text-[7.5px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-2">Receivables (Pending)</span>
                                <div className="text-xl md:text-2xl font-black font-heading tracking-tight text-white italic uppercase flex items-center gap-0.5">
                                    <IndianRupee className="size-4 md:size-5 stroke-[2]" />
                                    {metrics.outstandingReceivables.toLocaleString('en-IN')}
                                </div>
                                 <div className="text-[7.5px] font-bold text-gray-500 uppercase mt-2.5 space-y-1">
                                     <div className="flex justify-between">
                                         <span>Inv Pending</span>
                                         <span className="text-white">₹{metrics.systemPending.toLocaleString('en-IN')}</span>
                                     </div>
                                     <div className="flex justify-between">
                                         <span>Inc Pending</span>
                                         <span className="text-white">₹{metrics.otherPending.toLocaleString('en-IN')}</span>
                                     </div>
                                 </div>
                            </div>
                            <div className="mt-5 border-t border-white/5 pt-3">
                                {renderProportionRing(metrics.outstandingReceivables, metrics.totalRevenue + metrics.outstandingReceivables, 'stroke-yellow-500', 'UNREALIZED GBV')}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Pending clearance Warning Alert */}
                {metrics.pendingSpends > 0 && (
                    <div className="p-4 md:p-5 rounded-2xl bg-[#FF2E90]/5 border border-[#FF2E90]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-2xl hover:bg-[#FF2E90]/10 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-[#FF2E90]/10 flex items-center justify-center text-[#FF2E90] border border-[#FF2E90]/20 shrink-0">
                                <TrendingDown size={18} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-white">Pending Team Spends Clearance</h4>
                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">A backlog of spends is awaiting verification and fund settlement.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 self-end sm:self-center">
                            <div className="text-right">
                                <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-widest block">Outstanding backlog</span>
                                <div className="text-sm font-black text-[#FF2E90] flex items-center justify-end">₹{metrics.pendingSpends.toLocaleString('en-IN')}</div>
                            </div>
                            <Link to="/admin/spends" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors shrink-0">
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Analytical Dashboard Section (Bar Charts and Expense Splits) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Monthly Operation comparison */}
                    <Card className="lg:col-span-2 p-6 md:p-8 bg-zinc-900/40 border-white/5 hover:border-white/10 transition-all rounded-3xl flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-8 gap-4">
                            <div>
                                <h3 className="text-md md:text-lg font-black font-heading uppercase italic tracking-tight text-white text-transparent bg-clip-text bg-gradient-to-r from-[#39FF14] to-white">Monthly Stream</h3>
                                <p className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Cleared Income vs Expenses (Last 6 Months)</p>
                            </div>
                            <div className="flex items-center gap-4 text-[7.5px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 bg-[#39FF14] rounded-full shadow-[0_0_8px_rgba(57,255,20,0.5)]" />
                                    <span className="text-gray-400">Income</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 bg-[#FF2E90] rounded-full shadow-[0_0_8px_rgba(255,46,144,0.5)]" />
                                    <span className="text-gray-400">Spends</span>
                                </div>
                            </div>
                        </div>

                        {/* Custom SVG chart */}
                        <div className="w-full h-64 md:h-80 relative flex items-end">
                            <svg className="w-full h-full" viewBox="0 0 600 300" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#39FF14" stopOpacity="0.75" />
                                        <stop offset="100%" stopColor="#39FF14" stopOpacity="0.05" />
                                    </linearGradient>
                                    <linearGradient id="spendsGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#FF2E90" stopOpacity="0.75" />
                                        <stop offset="100%" stopColor="#FF2E90" stopOpacity="0.05" />
                                    </linearGradient>
                                </defs>
                                
                                {/* Grid Lines */}
                                <line x1="40" y1="50" x2="580" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                                <line x1="40" y1="125" x2="580" y2="125" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                                <line x1="40" y1="200" x2="580" y2="200" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                                <line x1="40" y1="275" x2="580" y2="275" stroke="rgba(255,255,255,0.1)" />

                                {chartData.map((data, index) => {
                                    const colWidth = 90;
                                    const startX = 50 + index * colWidth;
                                    
                                    const incomeHeight = (data.income / chartMax) * 200;
                                    const spendsHeight = (data.spends / chartMax) * 200;

                                    const incomeY = 275 - incomeHeight;
                                    const spendsY = 275 - spendsHeight;

                                    // Highlight if matches selectedMonth
                                    const isCurrentSelection = selectedMonth === data.optionLabel;

                                    return (
                                        <g key={data.label} className="group/bar">
                                            {isCurrentSelection && (
                                                <rect
                                                    x={startX - 10}
                                                    y="30"
                                                    width="75"
                                                    height="250"
                                                    rx="12"
                                                    className="fill-white/[0.02] stroke-white/10 stroke-1"
                                                />
                                            )}
                                            {/* Income Bar (Neon Green) */}
                                            <rect
                                                x={startX}
                                                y={incomeY}
                                                width="22"
                                                height={Math.max(incomeHeight, 2)}
                                                rx="6"
                                                fill="url(#incomeGrad)"
                                                className={cn(
                                                    "stroke-[#39FF14] stroke-[1.5] group-hover/bar:brightness-125 transition-all duration-300",
                                                    isCurrentSelection ? "stroke-[2]" : ""
                                                )}
                                            />
                                            {/* Spend Bar (Neon Pink) */}
                                            <rect
                                                x={startX + 26}
                                                y={spendsY}
                                                width="22"
                                                height={Math.max(spendsHeight, 2)}
                                                rx="6"
                                                fill="url(#spendsGrad)"
                                                className={cn(
                                                    "stroke-[#FF2E90] stroke-[1.5] group-hover/bar:brightness-125 transition-all duration-300",
                                                    isCurrentSelection ? "stroke-[2]" : ""
                                                )}
                                            />
                                            {/* Axis label inside SVG */}
                                            <text
                                                x={startX + 24}
                                                y="292"
                                                onClick={() => setSelectedMonth(data.optionLabel)}
                                                className={cn(
                                                    "cursor-pointer text-[10px] font-black uppercase tracking-wider transition-colors select-none",
                                                    isCurrentSelection ? "fill-[#39FF14]" : "fill-gray-500 hover:fill-white"
                                                )}
                                                style={{ fontFamily: 'sans-serif' }}
                                                textAnchor="middle"
                                            >
                                                {data.label}
                                            </text>
                                            {/* Text labels on hover */}
                                            <text
                                                x={startX + 24}
                                                y={Math.min(incomeY, spendsY) - 10}
                                                className="fill-white text-[9px] font-black opacity-0 group-hover/bar:opacity-100 transition-opacity text-center uppercase tracking-tighter"
                                                textAnchor="middle"
                                            >
                                                {data.income > 0 || data.spends > 0 
                                                    ? `I: ₹${Math.round(data.income/1000)}k | S: ₹${Math.round(data.spends/1000)}k` 
                                                    : 'No operations'}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Max Labels */}
                            <div className="absolute top-10 left-0 text-[8px] font-bold text-gray-600 uppercase">
                                ₹{(chartMax/1000).toFixed(0)}k
                            </div>
                            <div className="absolute top-28 left-0 text-[8px] font-bold text-gray-600 uppercase">
                                ₹{(chartMax/2000).toFixed(0)}k
                            </div>
                        </div>
                    </Card>

                    {/* Expense splits */}
                    <Card className="p-6 md:p-8 bg-zinc-900/40 border-white/5 hover:border-white/10 transition-all rounded-3xl flex flex-col justify-between">
                        <div>
                            <h3 className="text-md md:text-lg font-black font-heading uppercase italic tracking-tight text-white">Expense Share</h3>
                            <p className="text-[8px] font-black uppercase text-gray-500 tracking-wider mb-6">Spend breakdown for {selectedMonth}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide max-h-[260px]">
                            {categorySpends.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                    <Info size={16} className="text-gray-600 mb-2" />
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">No spends logged for this period</span>
                                </div>
                            ) : (
                                categorySpends.map((cat) => (
                                    <div key={cat.category} className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                                            <span className="text-gray-300">{cat.category}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500">{cat.percentage}%</span>
                                                <span className="text-[#FF2E90]">₹{cat.amount.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#FF2E90] rounded-full shadow-[0_0_10px_rgba(255,46,144,0.5)] transition-all duration-1000"
                                                style={{ width: `${cat.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* Inflow Distribution & Central Ledger activities */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Revenue spread split */}
                    <Card className="p-6 md:p-8 bg-zinc-900/40 border-white/5 hover:border-white/10 transition-all rounded-3xl flex flex-col justify-between">
                        <div>
                            <h3 className="text-md md:text-lg font-black font-heading uppercase italic tracking-tight text-white">Revenue Spread</h3>
                            <p className="text-[8px] font-black uppercase text-gray-500 tracking-wider mb-6">Income channels for {selectedMonth}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide max-h-[280px]">
                            {categoryIncome.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                    <Info size={16} className="text-gray-600 mb-2" />
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">No income logs for this period</span>
                                </div>
                            ) : (
                                categoryIncome.map((cat) => (
                                    <div key={cat.category} className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                                            <span className="text-gray-300">{cat.category}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500">{cat.percentage}%</span>
                                                <span className="text-[#39FF14]">₹{cat.amount.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#39FF14] rounded-full shadow-[0_0_10px_rgba(57,255,20,0.5)] transition-all duration-1000"
                                                style={{ width: `${cat.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Central Ledger activity log */}
                    <Card className="lg:col-span-2 p-6 md:p-8 bg-zinc-900/40 border-white/5 hover:border-white/10 transition-all rounded-3xl flex flex-col justify-between">
                        <div>
                            <h3 className="text-md md:text-lg font-black font-heading uppercase italic tracking-tight text-white">Central Operations Ledger</h3>
                            <p className="text-[8px] font-black uppercase text-gray-500 tracking-wider mb-6">Recent transactions mapped to {selectedMonth}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-white/5 pr-2 scrollbar-hide max-h-[300px]">
                            {recentActivity.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center py-16">
                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">No transactions logged during this period</span>
                                </div>
                            ) : (
                                recentActivity.map((activity, i) => {
                                    const isSpend = activity.type === 'spend';
                                    const isInvoice = activity.type === 'invoice';

                                    return (
                                        <div key={`${activity.type}-${activity.id}-${i}`} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 group hover:bg-white/[0.01] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 duration-300",
                                                    isSpend 
                                                        ? "text-[#FF2E90] bg-[#FF2E90]/10 border-[#FF2E90]/25" 
                                                        : (isInvoice ? "text-[#00F0FF] bg-[#00F0FF]/10 border-[#00F0FF]/25" : "text-[#39FF14] bg-[#39FF14]/10 border-[#39FF14]/25")
                                                )}>
                                                    {isSpend ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                                                </div>
                                                <div>
                                                    <h4 className="text-[11px] font-black uppercase tracking-tight text-white leading-none line-clamp-1 group-hover:text-[#39FF14] transition-colors">{activity.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1.5 text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                                                        <span>{new Date(activity.date).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span>{activity.account}</span>
                                                        <span>•</span>
                                                        <span className="text-gray-400 font-semibold">{activity.handler}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className={cn(
                                                    "text-xs font-black uppercase tracking-tight tabular-nums flex items-center justify-end",
                                                    isSpend ? "text-[#FF2E90]" : "text-[#39FF14]"
                                                )}>
                                                    {isSpend ? '-' : '+'}₹{activity.amount.toLocaleString('en-IN')}
                                                </div>
                                                <span className={cn(
                                                    "text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full mt-1.5 inline-block border",
                                                    activity.status === 'Paid' || activity.status === 'Cleared'
                                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                        : (activity.status === 'Verification Pending' ? "bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20")
                                                )}>
                                                    {activity.status}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default FinanceDashboard;
