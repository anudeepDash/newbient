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

    // Isolated Finance-only navigation tabs - Professional Names
    const financeTabs = [
        { name: 'Overview', path: '/admin/finance', icon: LayoutGrid, color: 'text-neon-green' },
        { name: 'Expense Ledger', path: '/admin/spends', icon: IndianRupee, color: 'text-neon-pink' },
        { name: 'Other Revenue', path: '/admin/other-income', icon: FileSpreadsheet, color: 'text-neon-green' },
        { name: 'Payee Database', path: '/admin/payees', icon: User, color: 'text-neon-blue' }
    ];

    // District Category Tiles - Redesigned with Formal terms
    const categories = [
        {
            name: 'Financial Overview',
            desc: 'Liquidity Dashboard',
            info: 'Real-time metrics, cash flow trends & key indicators',
            path: '/admin/finance',
            icon: LayoutGrid,
            color: 'text-neon-green',
            glow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:border-neon-green/40',
            bgGradient: 'from-neon-green/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-neon-green/15',
            badge: 'OVERVIEW',
            active: true
        },
        {
            name: 'Expense Ledger',
            desc: 'Expenditures & Debits',
            info: 'Track payroll, supplier invoices, and vendor payouts',
            path: '/admin/spends',
            icon: CreditCard,
            color: 'text-neon-pink',
            glow: 'hover:shadow-[0_0_30px_rgba(255,46,144,0.15)] hover:border-neon-pink/40',
            bgGradient: 'from-neon-pink/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-neon-pink/15',
            badge: 'DEBITS',
            active: false
        },
        {
            name: 'Other Revenue',
            desc: 'Inflow & Sponsorships',
            info: 'Manage ticket sales, sponsorships, and grants',
            path: '/admin/other-income',
            icon: FileSpreadsheet,
            color: 'text-neon-green',
            glow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:border-neon-green/40',
            bgGradient: 'from-neon-green/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-neon-green/15',
            badge: 'INFLOW',
            active: false
        },
        {
            name: 'Payee Database',
            desc: 'Beneficiary Directory',
            info: 'Manage volunteer rosters, retainers, and crew members',
            path: '/admin/payees',
            icon: User,
            color: 'text-neon-blue',
            glow: 'hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] hover:border-neon-blue/40',
            bgGradient: 'from-neon-blue/5 via-zinc-950/20 to-transparent',
            borderColor: 'border-neon-blue/15',
            badge: 'DATABASE',
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

    // Metrics calculations for selected month - Formal Terms
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
                account: 'Company Account',
                handler: inv.createdByEmail || 'Admin'
            });
        });

        otherIncomes.forEach(inc => {
            if (!filterBySelectedMonth(inc.createdAt || inc.date)) return;
            list.push({
                id: inc.id,
                type: 'income',
                title: `Revenue: ${inc.sourceName || 'Other Revenue'}`,
                amount: Number(inc.amount || 0),
                date: inc.createdAt || inc.date,
                status: inc.status,
                account: inc.accountType === 'personal' ? `Personal (${inc.receiverName || 'Partner'})` : 'Company Account',
                handler: inc.receiverName || 'Finance Team'
            });
        });

        spends.forEach(sp => {
            if (!filterBySelectedMonth(sp.createdAt || sp.date)) return;
            
            // Format title by payout type
            let displayTitle = `Expense: ${sp.title}`;
            if (sp.payoutType === 'Salary') displayTitle = `Salary: ${sp.receiverName} (${sp.notes || 'Staff Payout'})`;
            else if (sp.payoutType === 'Volunteer Payout') displayTitle = `Volunteer Payout: ${sp.receiverName} (${sp.title})`;
            else if (sp.payoutType === 'Vendor Payout') displayTitle = `Vendor Payout: ${sp.paidTo} (${sp.title})`;

            list.push({
                id: sp.id,
                type: 'spend',
                title: displayTitle,
                amount: Number(sp.amount || 0),
                date: sp.createdAt || sp.date,
                status: sp.status,
                account: sp.accountType === 'personal' ? `Personal (${sp.receiverName || sp.paidBy})` : 'Company Account',
                handler: sp.paidBy || 'Finance Team'
            });
        });

        return list
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
            .slice(0, 10);
    }, [invoices, spends, otherIncomes, selectedMonth]);

    // Circular proportion indicator generator - Styled Clean
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
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider leading-none">{textLabel}</span>
                        <span className="text-[11px] text-white font-extrabold mt-1 leading-none">
                            ₹{numerator.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ₹{denominator.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'Financial',
                subtitle: 'Dashboard',
                accentClass: 'text-neon-green',
                icon: IndianRupee
            }}
            tabs={financeTabs}
            accentColor="neon-green"
            action={
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                        <Calendar size={14} className="text-neon-green" /> Select Month:
                    </span>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-zinc-950/40 border border-white/5 h-11 px-4 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-neon-green/40 focus:ring-1 focus:ring-neon-green/10 shadow-xl cursor-pointer hover:border-white/10 transition-all"
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
                    <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-neon-green/5 blur-[120px] animate-pulse duration-[10000ms]" />
                    <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-neon-pink/5 blur-[150px] animate-pulse duration-[8000ms]" />
                    <div className="absolute top-[50%] left-[40%] w-[300px] h-[300px] rounded-full bg-neon-blue/5 blur-[100px]" />
                </div>

                {/* Categories Tab Navigation Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {categories.map((cat) => {
                        const IconComp = cat.icon;
                        const activeColor = cat.color === 'text-neon-green' ? 'neon-green' : (cat.color === 'text-neon-pink' ? 'neon-pink' : 'neon-blue');
                        const glowClass = activeColor === 'neon-green' ? 'bg-neon-green' : (activeColor === 'neon-pink' ? 'bg-neon-pink' : 'bg-neon-blue');
                        const hoverBorderClass = activeColor === 'neon-green' ? 'group-hover:border-neon-green/30' : (activeColor === 'neon-pink' ? 'group-hover:border-neon-pink/30' : 'group-hover:border-neon-blue/30');
                        
                        return (
                            <Link 
                                key={cat.name} 
                                to={cat.path}
                                className="group relative flex flex-col select-none"
                            >
                                {/* Glow Effect */}
                                <div className={cn(
                                    "absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700 blur-2xl pointer-events-none",
                                    glowClass,
                                    cat.active ? "opacity-10" : "group-hover:opacity-15"
                                )} />
                                
                                <div className={cn(
                                    "relative z-10 p-6 rounded-3xl border bg-zinc-950/35 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex-1 flex flex-col justify-between transition-all duration-500 group-hover:-translate-y-1",
                                    cat.active 
                                        ? (activeColor === 'neon-green' ? "border-neon-green/30 bg-neon-green/[0.04] shadow-[0_0_20px_rgba(57,255,20,0.08)]" : 
                                           activeColor === 'neon-pink' ? "border-neon-pink/30 bg-neon-pink/[0.04] shadow-[0_0_20px_rgba(255,79,139,0.08)]" : 
                                           "border-neon-blue/30 bg-neon-blue/[0.04] shadow-[0_0_20px_rgba(0,240,255,0.08)]")
                                        : cn("border-white/[0.08] hover:bg-zinc-950/50", hoverBorderClass)
                                )}>
                                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.02] transition-opacity duration-300 group-hover:opacity-[0.05]", cat.bgGradient)} />
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className={cn("p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", cat.color)}>
                                            <IconComp size={16} />
                                        </div>
                                        <span className={cn(
                                            "text-[8px] font-black px-2.5 py-0.5 rounded-full tracking-widest border uppercase",
                                            cat.active 
                                                ? (activeColor === 'neon-green' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : 
                                                   activeColor === 'neon-pink' ? "bg-neon-pink/10 text-neon-pink border-neon-pink/20" : 
                                                   "bg-neon-blue/10 text-neon-blue border-neon-blue/20")
                                                : "bg-white/5 text-zinc-500 border-white/5"
                                        )}>
                                            {cat.badge}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-extrabold uppercase text-white tracking-wide mb-1 relative z-10">{cat.name}</h4>
                                    <p className="text-[10px] font-bold text-zinc-400 leading-snug line-clamp-1 relative z-10">{cat.desc}</p>
                                    <p className="text-[9px] font-medium text-zinc-600 leading-normal line-clamp-2 mt-2 group-hover:text-zinc-500 transition-colors relative z-10">{cat.info}</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Upper Deck: Glassmorphic Cards & Metric Tiles */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Glassmorphic Net Cash Flow Widget */}
                    <div className="group relative flex flex-col min-h-[220px]">
                        <div className={cn(
                            "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-15 transition-all duration-700 blur-2xl pointer-events-none",
                            metrics.netCashFlow >= 0 ? "bg-neon-green" : "bg-neon-pink"
                        )} />
                        
                        <div className={cn(
                            "relative z-10 p-6 md:p-8 bg-zinc-950/35 backdrop-blur-3xl border border-white/[0.08] rounded-3xl flex-1 flex flex-col justify-between transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:-translate-y-1",
                            metrics.netCashFlow >= 0 ? "group-hover:border-neon-green/30" : "group-hover:border-neon-pink/30"
                        )}>
                            {/* Top Gradient Highlight Bar */}
                            <div className={cn(
                                "absolute top-0 left-0 w-full h-[3px] rounded-t-3xl", 
                                metrics.netCashFlow >= 0 ? "bg-gradient-to-r from-neon-green to-emerald-400" : "bg-gradient-to-r from-neon-pink to-rose-600"
                            )} />

                            {/* Large Subtle Rupee Watermark */}
                            <div className="absolute -bottom-10 right-4 opacity-[0.03] pointer-events-none text-white select-none">
                                <IndianRupee size={150} />
                            </div>

                            {/* Header Details */}
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em] block">
                                        Net Cash Flow
                                    </span>
                                    <span className={cn(
                                        "text-[8px] font-black font-mono tracking-widest",
                                        metrics.netCashFlow >= 0 ? "text-neon-green" : "text-neon-pink"
                                    )}>
                                        PERIOD: {selectedMonth.replace(/\s+/g, '-').toUpperCase()}
                                    </span>
                                </div>
                                
                                <div className={cn(
                                    "text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-1", 
                                    metrics.netCashFlow >= 0 ? "text-neon-green" : "text-neon-pink"
                                )}>
                                    <IndianRupee className="size-6 md:size-8 stroke-[2.5]" />
                                    {metrics.netCashFlow.toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="w-full border-t border-white/5 my-4 z-10" />

                            {/* Bottom Details */}
                            <div className="relative z-10">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "h-2 w-2 rounded-full",
                                            metrics.netCashFlow >= 0 ? "bg-neon-green animate-pulse" : "bg-neon-pink animate-pulse"
                                        )} />
                                        <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">
                                            {metrics.netCashFlow >= 0 ? 'Surplus Cash Flow' : 'Deficit Cash Flow'}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border bg-white/5",
                                        metrics.netCashFlow >= 0 ? "text-neon-green border-neon-green/20" : "text-neon-pink border-neon-pink/20"
                                    )}>
                                        {metrics.netCashFlow >= 0 ? 'Active Surplus' : 'Deficit Alert'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* METRICS CARDS COLUMN (Total Revenue & Expenses) */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                        
                        {/* 1. Cleared Revenue Booking */}
                        <div className="group relative flex flex-col h-full">
                            <div className="absolute inset-0 rounded-3xl bg-neon-green opacity-0 group-hover:opacity-15 transition-all duration-700 blur-2xl pointer-events-none" />
                            <div className="relative z-10 p-5 md:p-6 bg-zinc-950/35 backdrop-blur-3xl border border-white/[0.08] group-hover:border-neon-green/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl flex-1 flex flex-col justify-between transition-all duration-500 group-hover:-translate-y-1">
                                <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-neon-green to-teal-400 rounded-t-3xl" />
                                <div className="relative z-10">
                                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] block mb-2">Cleared Revenue</span>
                                    <div className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-0.5">
                                        <IndianRupee className="size-4 md:size-5 stroke-[2]" />
                                        {metrics.totalRevenue.toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[9px] font-bold text-zinc-500 uppercase mt-3 space-y-1.5">
                                        <div className="flex justify-between">
                                            <span>Invoices</span>
                                            <span className="text-white">₹{metrics.systemPaid.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Other Rev.</span>
                                            <span className="text-white">₹{metrics.otherPaid.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 border-t border-white/5 pt-3 relative z-10">
                                    {renderProportionRing(metrics.totalRevenue, metrics.totalRevenue + metrics.outstandingReceivables, 'stroke-neon-green', 'COLLECTION RATE')}
                                </div>
                            </div>
                        </div>

                        {/* 2. Cleared Spends (Expenditures) */}
                        <div className="group relative flex flex-col h-full">
                            <div className="absolute inset-0 rounded-3xl bg-neon-pink opacity-0 group-hover:opacity-15 transition-all duration-700 blur-2xl pointer-events-none" />
                            <div className="relative z-10 p-5 md:p-6 bg-zinc-950/35 backdrop-blur-3xl border border-white/[0.08] group-hover:border-neon-pink/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl flex-1 flex flex-col justify-between transition-all duration-500 group-hover:-translate-y-1">
                                <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-neon-pink to-red-500 rounded-t-3xl" />
                                <div className="relative z-10">
                                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] block mb-2">Cleared Spends</span>
                                    <div className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-0.5">
                                        <IndianRupee className="size-4 md:size-5 stroke-[2]" />
                                        {metrics.totalExpenses.toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[9px] font-bold text-zinc-500 uppercase mt-3 space-y-1.5">
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
                                <div className="mt-5 border-t border-white/5 pt-3 relative z-10">
                                    {renderProportionRing(metrics.totalExpenses, metrics.totalExpenses + metrics.pendingSpends, 'stroke-neon-pink', 'OUTFLOW CLEARED')}
                                </div>
                            </div>
                        </div>

                        {/* 3. Outstanding Receivables */}
                        <div className="group relative flex flex-col h-full">
                            <div className="absolute inset-0 rounded-3xl bg-yellow-400 opacity-0 group-hover:opacity-15 transition-all duration-700 blur-2xl pointer-events-none" />
                            <div className="relative z-10 p-5 md:p-6 bg-zinc-950/35 backdrop-blur-3xl border border-white/[0.08] group-hover:border-yellow-400/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl flex-1 flex flex-col justify-between transition-all duration-500 group-hover:-translate-y-1">
                                <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-yellow-400 to-amber-500 rounded-t-3xl" />
                                <div className="relative z-10">
                                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] block mb-2">Pending Receivables</span>
                                    <div className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-0.5">
                                        <IndianRupee className="size-4 md:size-5 stroke-[2]" />
                                        {metrics.outstandingReceivables.toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[9px] font-bold text-zinc-500 uppercase mt-3 space-y-1.5">
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
                                <div className="mt-5 border-t border-white/5 pt-3 relative z-10">
                                    {renderProportionRing(metrics.outstandingReceivables, metrics.totalRevenue + metrics.outstandingReceivables, 'stroke-yellow-500', 'PENDING RECEIVABLES')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pending clearance Warning Alert */}
                {metrics.pendingSpends > 0 && (
                    <div className="p-5 rounded-2xl bg-neon-pink/5 border border-neon-pink/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-2xl hover:bg-neon-pink/10 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-neon-pink/10 flex items-center justify-center text-neon-pink border border-neon-pink/20 shrink-0">
                                <TrendingDown size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">Pending Team Payments</h4>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">A backlog of spends is awaiting verification and fund settlement.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 self-end sm:self-center">
                            <div className="text-right">
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Outstanding backlog</span>
                                <div className="text-sm font-extrabold text-neon-pink flex items-center justify-end">₹{metrics.pendingSpends.toLocaleString('en-IN')}</div>
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
                    <div className="lg:col-span-2 group relative flex flex-col">
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-neon-green/15 to-neon-pink/15 opacity-0 group-hover:opacity-15 transition-all duration-[1000ms] blur-2xl pointer-events-none" />
                        
                        <div className="relative z-10 p-6 md:p-8 bg-zinc-950/35 backdrop-blur-3xl border border-white/[0.08] group-hover:border-white/15 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 flex flex-col justify-between h-full group-hover:-translate-y-1">
                            <div className="flex justify-between items-center mb-8 gap-4">
                                <div>
                                    <h3 className="text-md md:text-lg font-extrabold tracking-tight text-white">Monthly Cash Flow Trend</h3>
                                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-wider mt-1">Cleared Income vs Expenses (Last 6 Months)</p>
                                </div>
                                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 bg-neon-green rounded-full shadow-[0_0_8px_rgba(57,255,20,0.5)]" />
                                        <span className="text-zinc-400">Income</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 bg-neon-pink rounded-full shadow-[0_0_8px_rgba(255,79,139,0.5)]" />
                                        <span className="text-zinc-400">Spends</span>
                                    </div>
                                </div>
                            </div>

                            {/* Custom SVG chart - Redesigned to be Sleek and Premium */}
                            <div className="w-full h-64 md:h-80 relative flex items-end">
                                <svg className="w-full h-full" viewBox="0 0 600 300" preserveAspectRatio="none">
                                    {/* Grid Lines */}
                                    <line x1="65" y1="50" x2="580" y2="50" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
                                    <line x1="65" y1="125" x2="580" y2="125" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
                                    <line x1="65" y1="200" x2="580" y2="200" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
                                    <line x1="65" y1="275" x2="580" y2="275" stroke="rgba(255,255,255,0.08)" />

                                    {/* Y-axis Labels inside SVG */}
                                    <text x="15" y="54" className="fill-zinc-500 text-[8px] font-bold tracking-wider" textAnchor="start">₹{(chartMax/1000).toFixed(0)}k</text>
                                    <text x="15" y="129" className="fill-zinc-500 text-[8px] font-bold tracking-wider" textAnchor="start">₹{(chartMax/2000).toFixed(0)}k</text>
                                    <text x="15" y="204" className="fill-zinc-500 text-[8px] font-bold tracking-wider" textAnchor="start">₹{(chartMax/4000).toFixed(0)}k</text>
                                    <text x="15" y="278" className="fill-zinc-500 text-[8px] font-bold tracking-wider" textAnchor="start">₹0</text>

                                    {chartData.map((data, index) => {
                                        const colWidth = 82;
                                        const startX = 75 + index * colWidth;
                                        
                                        // Use a minimum of 6px height for visual pill consistency
                                        const displayIncomeHeight = Math.max((data.income / chartMax) * 200, 6);
                                        const displaySpendsHeight = Math.max((data.spends / chartMax) * 200, 6);

                                        const incomeY = 275 - displayIncomeHeight;
                                        const spendsY = 275 - displaySpendsHeight;

                                        // Highlight if matches selectedMonth
                                        const isCurrentSelection = selectedMonth === data.optionLabel;

                                        return (
                                            <g key={data.label} className="group/bar">
                                                {isCurrentSelection && (
                                                    <rect
                                                        x={startX - 10}
                                                        y="30"
                                                        width="50"
                                                        height="250"
                                                        rx="16"
                                                        className="fill-white/[0.015] stroke-white/5 backdrop-blur-[1px] cursor-pointer"
                                                        onClick={() => setSelectedMonth(data.optionLabel)}
                                                    />
                                                )}
                                                {/* Income Bar (Neon Green Tube) */}
                                                <rect
                                                    x={startX}
                                                    y={incomeY}
                                                    width="12"
                                                    height={displayIncomeHeight}
                                                    rx="6"
                                                    fill="rgba(57, 255, 20, 0.08)"
                                                    stroke="#39FF14"
                                                    strokeWidth={isCurrentSelection ? 2 : 1.2}
                                                    className={cn(
                                                        "transition-all duration-300 cursor-pointer hover:stroke-[2]",
                                                        isCurrentSelection ? "opacity-100" : "opacity-80 group-hover/bar:opacity-100"
                                                    )}
                                                    style={{ filter: isCurrentSelection ? 'drop-shadow(0 0 6px rgba(57, 255, 20, 0.5))' : 'none' }}
                                                    onClick={() => setSelectedMonth(data.optionLabel)}
                                                />
                                                {/* Spend Bar (Neon Pink Tube) */}
                                                <rect
                                                    x={startX + 18}
                                                    y={spendsY}
                                                    width="12"
                                                    height={displaySpendsHeight}
                                                    rx="6"
                                                    fill="rgba(255, 79, 139, 0.08)"
                                                    stroke="#FF4F8B"
                                                    strokeWidth={isCurrentSelection ? 2 : 1.2}
                                                    className={cn(
                                                        "transition-all duration-300 cursor-pointer hover:stroke-[2]",
                                                        isCurrentSelection ? "opacity-100" : "opacity-80 group-hover/bar:opacity-100"
                                                    )}
                                                    style={{ filter: isCurrentSelection ? 'drop-shadow(0 0 6px rgba(255, 79, 139, 0.5))' : 'none' }}
                                                    onClick={() => setSelectedMonth(data.optionLabel)}
                                                />
                                                
                                                {isCurrentSelection && (
                                                    <rect
                                                        x={startX - 12}
                                                        y="278"
                                                        width="54"
                                                        height="18"
                                                        rx="9"
                                                        className="fill-neon-green/10 stroke-neon-green/20 stroke-[1] cursor-pointer"
                                                        onClick={() => setSelectedMonth(data.optionLabel)}
                                                    />
                                                )}
                                                {/* Axis label inside SVG */}
                                                <text
                                                    x={startX + 15}
                                                    y="290"
                                                    onClick={() => setSelectedMonth(data.optionLabel)}
                                                    className={cn(
                                                        "cursor-pointer text-[9px] font-heading font-extrabold uppercase tracking-widest transition-colors select-none",
                                                        isCurrentSelection ? "fill-neon-green" : "fill-zinc-500 hover:fill-white"
                                                    )}
                                                    textAnchor="middle"
                                                >
                                                    {data.label.split(' ')[0]}
                                                </text>
                                                {/* Text labels on hover */}
                                                <text
                                                    x={startX + 15}
                                                    y={Math.min(incomeY, spendsY) - 10}
                                                    className="fill-white text-[9px] font-heading font-extrabold opacity-0 group-hover/bar:opacity-100 transition-opacity text-center uppercase tracking-wider"
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
                            </div>
                        </div>
                    </div>

                    {/* Expense splits */}
                    <div className="group relative flex flex-col">
                        <div className="absolute inset-0 rounded-3xl bg-neon-pink opacity-0 group-hover:opacity-15 transition-all duration-700 blur-2xl pointer-events-none" />
                        <div className="relative z-10 p-6 md:p-8 bg-zinc-950/35 backdrop-blur-3xl border border-white/[0.08] group-hover:border-neon-pink/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:-translate-y-1 flex flex-col justify-between h-full">
                            <div>
                                <h3 className="text-md md:text-lg font-extrabold tracking-tight text-white">Expense Distribution</h3>
                                <p className="text-[9px] font-black uppercase text-zinc-500 tracking-wider mt-1">Spend breakdown for {selectedMonth}</p>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide max-h-[260px] mt-6">
                                {categorySpends.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                        <Info size={16} className="text-zinc-600 mb-2" />
                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">No spends logged for this period</span>
                                    </div>
                                ) : (
                                    categorySpends.map((cat) => (
                                        <div key={cat.category} className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                                                <span className="text-zinc-300">{cat.category}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-zinc-500">{cat.percentage}%</span>
                                                    <span className="text-neon-pink font-extrabold">₹{cat.amount.toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-neon-pink rounded-full shadow-[0_0_10px_rgba(255,79,139,0.5)] transition-all duration-1000"
                                                    style={{ width: `${cat.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inflow Distribution & Central Ledger activities */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Revenue spread split */}
                    <div className="group relative flex flex-col">
                        <div className="absolute inset-0 rounded-3xl bg-neon-green opacity-0 group-hover:opacity-15 transition-all duration-700 blur-2xl pointer-events-none" />
                        <div className="relative z-10 p-6 md:p-8 bg-zinc-950/35 backdrop-blur-3xl border border-white/[0.08] group-hover:border-neon-green/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:-translate-y-1 flex flex-col justify-between h-full">
                            <div>
                                <h3 className="text-md md:text-lg font-extrabold tracking-tight text-white">Revenue Sources</h3>
                                <p className="text-[9px] font-black uppercase text-zinc-500 tracking-wider mt-1">Income channels for {selectedMonth}</p>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide max-h-[280px] mt-6">
                                {categoryIncome.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                        <Info size={16} className="text-zinc-600 mb-2" />
                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">No income logs for this period</span>
                                    </div>
                                ) : (
                                    categoryIncome.map((cat) => (
                                        <div key={cat.category} className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                                                <span className="text-zinc-300">{cat.category}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-zinc-500">{cat.percentage}%</span>
                                                    <span className="text-neon-green font-extrabold">₹{cat.amount.toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-neon-green rounded-full shadow-[0_0_10px_rgba(57,255,20,0.5)] transition-all duration-1000"
                                                    style={{ width: `${cat.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Central Ledger activity log */}
                    <div className="lg:col-span-2 group relative flex flex-col">
                        <div className="absolute inset-0 rounded-3xl bg-neon-blue opacity-0 group-hover:opacity-15 transition-all duration-700 blur-2xl pointer-events-none" />
                        <div className="relative z-10 p-6 md:p-8 bg-zinc-950/35 backdrop-blur-3xl border border-white/[0.08] group-hover:border-neon-blue/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:-translate-y-1 flex flex-col justify-between h-full">
                            <div>
                                <h3 className="text-md md:text-lg font-extrabold tracking-tight text-white">Administrative Transaction Ledger</h3>
                                <p className="text-[9px] font-black uppercase text-zinc-500 tracking-wider mt-1">Recent transaction activities for {selectedMonth}</p>
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-white/5 pr-2 scrollbar-hide max-h-[300px] mt-6">
                                {recentActivity.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-center py-16">
                                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">No transactions logged during this period</span>
                                    </div>
                                ) : (
                                    recentActivity.map((activity, i) => {
                                        const isSpend = activity.type === 'spend';
                                        const isInvoice = activity.type === 'invoice';

                                        return (
                                            <div key={`${activity.type}-${activity.id}-${i}`} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 group/item hover:bg-white/[0.01] transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover/item:scale-105 duration-300",
                                                        isSpend 
                                                            ? "text-neon-pink bg-neon-pink/10 border-neon-pink/25" 
                                                            : (isInvoice ? "text-neon-blue bg-neon-blue/10 border-neon-blue/25" : "text-neon-green bg-neon-green/10 border-neon-green/25")
                                                    )}>
                                                        {isSpend ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[11px] font-black uppercase tracking-tight text-white leading-none line-clamp-1 group-hover/item:text-neon-green transition-colors">{activity.title}</h4>
                                                        <div className="flex items-center gap-2 mt-1.5 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                                                            <span>{new Date(activity.date).toLocaleDateString()}</span>
                                                            <span>•</span>
                                                            <span>{activity.account}</span>
                                                            <span>•</span>
                                                            <span className="text-zinc-400 font-semibold">{activity.handler}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className={cn(
                                                        "text-xs font-black uppercase tracking-tight tabular-nums flex items-center justify-end",
                                                        isSpend ? "text-neon-pink" : "text-neon-green"
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
                        </div>
                    </div>
                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default FinanceDashboard;
