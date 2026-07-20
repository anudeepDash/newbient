import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

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
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import PieChart from 'lucide-react/dist/esm/icons/pie-chart';
import Activity from 'lucide-react/dist/esm/icons/activity';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Target from 'lucide-react/dist/esm/icons/target';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import CircleDot from 'lucide-react/dist/esm/icons/circle-dot';
import Clock from 'lucide-react/dist/esm/icons/clock';

const FinanceDashboard = () => {
    useStoreSubscription(['invoices', 'spends', 'otherIncomes']);
    const { invoices, spends, otherIncomes } = useStore();

    const financeTabs = [
        { name: 'Overview', path: '/admin/finance', icon: LayoutGrid, color: 'text-neon-green' },
        { name: 'Expense Ledger', path: '/admin/spends', icon: IndianRupee, color: 'text-neon-pink' },
        { name: 'Other Revenue', path: '/admin/other-income', icon: FileSpreadsheet, color: 'text-neon-green' },
        { name: 'Payee Database', path: '/admin/payees', icon: User, color: 'text-neon-blue' }
    ];

    const getMonthLabel = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const currentMonthDefault = useMemo(() => {
        return new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }, []);

    const [selectedMonth, setSelectedMonth] = useState(currentMonthDefault);

    const monthOptions = useMemo(() => {
        const months = new Set();
        months.add(currentMonthDefault);

        invoices.forEach(inv => {
            const label = getMonthLabel(inv.createdAt || inv.issueDate);
            if (label) months.add(label);
        });

        spends.forEach(sp => {
            const label = getMonthLabel(sp.createdAt || sp.date);
            if (label) months.add(label);
        });

        otherIncomes.forEach(inc => {
            const label = getMonthLabel(inc.createdAt || inc.date);
            if (label) months.add(label);
        });

        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - i);
            months.add(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        }

        const sorted = Array.from(months).sort((a, b) => {
            return new Date(b) - new Date(a);
        });

        return ['All Time', ...sorted];
    }, [invoices, spends, otherIncomes, currentMonthDefault]);

    const filterBySelectedMonth = (itemDate) => {
        if (selectedMonth === 'All Time') return true;
        return getMonthLabel(itemDate) === selectedMonth;
    };

    const metrics = useMemo(() => {
        const systemPaid = invoices
            .filter(inv => inv.status === 'Paid' && filterBySelectedMonth(inv.createdAt || inv.issueDate))
            .reduce((sum, inv) => sum + Number(inv.total || inv.amount || 0), 0);

        const systemPending = invoices
            .filter(inv => (inv.status === 'Pending' || inv.status === 'Verification Pending') && filterBySelectedMonth(inv.createdAt || inv.issueDate))
            .reduce((sum, inv) => sum + Number(inv.total || inv.amount || 0), 0);

        const otherPaid = otherIncomes
            .filter(inc => inc.status === 'Paid' && filterBySelectedMonth(inc.createdAt || inc.date))
            .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

        const otherPending = otherIncomes
            .filter(inc => inc.status === 'Pending' && filterBySelectedMonth(inc.createdAt || inc.date))
            .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

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

        invoices.forEach(inv => {
            if (inv.status !== 'Paid') return;
            const dateStr = inv.createdAt || inv.issueDate;
            if (!dateStr) return;
            const d = new Date(dateStr);
            const match = last6Months.find(m => m.monthNum === d.getMonth() && m.year === d.getFullYear());
            if (match) match.income += Number(inv.total || inv.amount || 0);
        });

        otherIncomes.forEach(inc => {
            if (inc.status !== 'Paid') return;
            const dateStr = inc.createdAt || inc.date;
            if (!dateStr) return;
            const d = new Date(dateStr);
            const match = last6Months.find(m => m.monthNum === d.getMonth() && m.year === d.getFullYear());
            if (match) match.income += Number(inc.amount || 0);
        });

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

    const categorySpends = useMemo(() => {
        const totals = {};
        let grandTotal = 0;
        spends.forEach(sp => {
            if (sp.status !== 'Paid' && sp.status !== 'Cleared') return;
            if (!filterBySelectedMonth(sp.createdAt || sp.date)) return;
            
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

    const navPills = [
        { name: 'Overview', path: '/admin/finance', icon: LayoutGrid, isActive: true },
        { name: 'Expense Ledger', path: '/admin/spends', icon: IndianRupee, isActive: false },
        { name: 'Other Revenue', path: '/admin/other-income', icon: FileSpreadsheet, isActive: false },
        { name: 'Payee Database', path: '/admin/payees', icon: User, isActive: false }
    ];

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
                        className="bg-zinc-950/40 border border-white/10 h-11 px-4 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white outline-none focus:border-neon-green/40 focus:ring-1 focus:ring-neon-green/10 shadow-xl cursor-pointer hover:border-white/20 transition-all font-mono"
                    >
                        {monthOptions.map(opt => (
                            <option key={opt} value={opt} className="bg-zinc-950 text-white font-semibold">{opt}</option>
                        ))}
                    </select>
                </div>
            }
        >
            <div className="space-y-6 lg:space-y-8 pb-10">

                {/* Section 1: Quick Nav Pills */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="flex flex-wrap gap-3"
                >
                    {navPills.map((pill) => {
                        const Icon = pill.icon;
                        return (
                            <Link 
                                key={pill.name} 
                                to={pill.path}
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

                {/* Section 2: Hero Metrics Row */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-zinc-950/35 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                >
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 relative group">
                        <div className="absolute inset-0 bg-neon-green/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Net Position</span>
                        <div className={cn(
                            "text-3xl md:text-4xl font-mono font-black tracking-tighter flex items-center gap-1",
                            metrics.netCashFlow >= 0 ? "text-neon-green drop-shadow-[0_0_10px_rgba(57,255,20,0.3)]" : "text-neon-pink drop-shadow-[0_0_10px_rgba(255,79,139,0.3)]"
                        )}>
                            <IndianRupee className="size-6 stroke-[3]" />
                            {metrics.netCashFlow.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-2 bg-white/5 px-2 py-0.5 rounded self-start border border-white/5">
                            {selectedMonth}
                        </span>
                    </div>
                    
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 relative group">
                        <div className="absolute inset-0 bg-neon-green/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                            Revenue <TrendingUp size={12} className="text-neon-green" />
                        </span>
                        <div className="text-2xl md:text-3xl font-mono font-black tracking-tighter text-white flex items-center gap-1">
                            <IndianRupee className="size-5 stroke-[3] text-neon-green" />
                            {metrics.totalRevenue.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[9px] font-bold text-zinc-400 mt-2 uppercase tracking-widest">
                            <span className="text-white">₹{metrics.systemPaid.toLocaleString('en-IN')}</span> Inv / <span className="text-white">₹{metrics.otherPaid.toLocaleString('en-IN')}</span> Other
                        </div>
                    </div>

                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 relative group">
                        <div className="absolute inset-0 bg-neon-pink/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                            Expenditure <TrendingDown size={12} className="text-neon-pink" />
                        </span>
                        <div className="text-2xl md:text-3xl font-mono font-black tracking-tighter text-white flex items-center gap-1">
                            <IndianRupee className="size-5 stroke-[3] text-neon-pink" />
                            {metrics.totalExpenses.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[9px] font-bold text-zinc-400 mt-2 uppercase tracking-widest">
                            <span className="text-white">₹{metrics.spendsPaid.toLocaleString('en-IN')}</span> Paid Out
                        </div>
                    </div>

                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center relative group">
                        <div className="absolute inset-0 bg-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                            Receivables <Clock size={12} className="text-neon-blue" />
                        </span>
                        <div className="text-2xl md:text-3xl font-mono font-black tracking-tighter text-white flex items-center gap-1">
                            <IndianRupee className="size-5 stroke-[3] text-neon-blue" />
                            {metrics.outstandingReceivables.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[9px] font-bold text-zinc-400 mt-2 uppercase tracking-widest">
                            Pending Collection
                        </div>
                    </div>
                </motion.div>

                {/* Section 5: Pending Alert Banner */}
                <AnimatePresence>
                    {metrics.pendingSpends > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                            animate={{ opacity: 1, height: 'auto', marginTop: 24 }} 
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="bg-neon-pink/10 border border-neon-pink/20 rounded-2xl p-4 flex items-center justify-between overflow-hidden relative"
                        >
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="size-2 rounded-full bg-neon-pink animate-pulse shadow-[0_0_8px_#FF4F8B]" />
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-neon-pink tracking-widest">Action Required: Pending Outflows</h4>
                                    <p className="text-[9px] font-bold text-zinc-300 tracking-wider">Unsettled spends queue requires clearance.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="text-right hidden sm:block">
                                    <div className="text-sm font-mono font-black text-white">₹{metrics.pendingSpends.toLocaleString('en-IN')}</div>
                                </div>
                                <Link to="/admin/spends" className="size-8 rounded-full bg-neon-pink text-black flex items-center justify-center hover:scale-110 transition-transform">
                                    <ArrowRight size={14} strokeWidth={3} />
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Section 3: Cashflow Visualization */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8"
                >
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Cashflow Dynamics</h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">6-Month Liquidity Trend</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-gradient-to-r from-[#39FF14] to-[#00F0FF]" />
                                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Income</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-gradient-to-r from-[#FF4F8B] to-[#FF6B6B]" />
                                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Spend</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full">
                        <div className="w-full h-64 md:h-72 relative">
                            <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="incomeGrad" x1="0" y1="1" x2="0" y2="0">
                                        <stop offset="0%" stopColor="#39FF14" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#00F0FF" />
                                    </linearGradient>
                                    <linearGradient id="spendGrad" x1="0" y1="1" x2="0" y2="0">
                                        <stop offset="0%" stopColor="#FF4F8B" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#FF6B6B" />
                                    </linearGradient>
                                </defs>

                                {/* Grid Lines */}
                                {[0, 1, 2, 3].map((lineIndex) => (
                                    <g key={lineIndex}>
                                        <line x1="50" y1={300 - (lineIndex * 75) - 20} x2="1000" y2={300 - (lineIndex * 75) - 20} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                                        <text x="40" y={300 - (lineIndex * 75) - 20} className="fill-zinc-600 text-[10px] font-mono font-bold" textAnchor="end" alignmentBaseline="middle">
                                            {lineIndex === 0 ? 0 : `${(chartMax / 3 * lineIndex / 1000).toFixed(0)}k`}
                                        </text>
                                    </g>
                                ))}

                                {chartData.map((data, index) => {
                                    const colWidth = 900 / 6;
                                    const startX = 100 + index * colWidth;
                                    
                                    const displayIncomeHeight = Math.max((data.income / chartMax) * 200, 4);
                                    const displaySpendsHeight = Math.max((data.spends / chartMax) * 200, 4);

                                    const incomeY = 280 - displayIncomeHeight;
                                    const spendsY = 280 - displaySpendsHeight;
                                    const isCurrentSelection = selectedMonth === data.optionLabel;

                                    return (
                                        <g key={data.label} className="group/bar cursor-pointer" onClick={() => setSelectedMonth(data.optionLabel)}>
                                            {isCurrentSelection && (
                                                <rect x={startX - 20} y="0" width="80" height="280" rx="12" fill="rgba(255,255,255,0.02)" />
                                            )}
                                            
                                            {/* Hover info tooltip */}
                                            <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                                <rect x={startX - 30} y={Math.min(incomeY, spendsY) - 40} width="100" height="30" rx="6" fill="#18181b" stroke="rgba(255,255,255,0.1)" />
                                                <text x={startX + 20} y={Math.min(incomeY, spendsY) - 20} className="fill-white text-[9px] font-mono font-bold" textAnchor="middle">
                                                    +{Math.round(data.income/1000)}k / -{Math.round(data.spends/1000)}k
                                                </text>
                                            </g>

                                            {/* Income Bar */}
                                            <rect
                                                x={startX}
                                                y={incomeY}
                                                width="16"
                                                height={displayIncomeHeight}
                                                rx="8"
                                                fill="url(#incomeGrad)"
                                                className={cn("transition-all duration-300", isCurrentSelection ? "opacity-100" : "opacity-70 group-hover/bar:opacity-100")}
                                            />
                                            {/* Spend Bar */}
                                            <rect
                                                x={startX + 24}
                                                y={spendsY}
                                                width="16"
                                                height={displaySpendsHeight}
                                                rx="8"
                                                fill="url(#spendGrad)"
                                                className={cn("transition-all duration-300", isCurrentSelection ? "opacity-100" : "opacity-70 group-hover/bar:opacity-100")}
                                            />
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                        {/* Labels Below */}
                        <div className="flex pl-[50px] pr-0 mt-4 relative z-10 w-full justify-between">
                            {chartData.map((data, index) => {
                                const isCurrentSelection = selectedMonth === data.optionLabel;
                                return (
                                    <div 
                                        key={data.label} 
                                        className="flex-1 flex justify-center cursor-pointer group"
                                        onClick={() => setSelectedMonth(data.optionLabel)}
                                    >
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all",
                                            isCurrentSelection 
                                                ? "bg-white/10 text-white" 
                                                : "text-zinc-500 group-hover:text-white"
                                        )}>
                                            {data.label.split(' ')[0]}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </motion.div>

                {/* Section 4: Two-Column Intelligence Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    
                    {/* Left: Transaction Feed */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                        className="lg:col-span-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col h-[500px]"
                    >
                        <div className="mb-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Chronicle Feed</h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Real-time ledger events</p>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-1 scrollbar-hide">
                            {recentActivity.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No activity logged</span>
                                </div>
                            ) : (
                                recentActivity.map((act, i) => {
                                    const isSpend = act.type === 'spend';
                                    const dotColor = isSpend ? 'bg-neon-pink shadow-[0_0_8px_#FF4F8B]' : 'bg-neon-green shadow-[0_0_8px_#39FF14]';
                                    const amountColor = isSpend ? 'text-neon-pink' : 'text-neon-green';
                                    
                                    return (
                                        <div key={i} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("size-2 rounded-full", dotColor)} />
                                                <div>
                                                    <div className="text-xs font-bold text-white group-hover:text-white transition-colors">{act.title}</div>
                                                    <div className="text-[9px] font-mono text-zinc-500 mt-0.5">{new Date(act.date).toLocaleDateString()} • {act.handler}</div>
                                                </div>
                                            </div>
                                            <div className={cn("text-xs font-mono font-black", amountColor)}>
                                                {isSpend ? '-' : '+'}₹{act.amount.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </motion.div>

                    {/* Right: Spend & Revenue DNA */}
                    <div className="flex flex-col gap-6 lg:gap-8 h-[500px]">
                        {/* Spend DNA */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                            className="flex-1 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col"
                        >
                            <div className="mb-4">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-white">Spend DNA</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                                {categorySpends.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-[9px] font-black uppercase text-zinc-600 tracking-widest">No Data</div>
                                ) : (
                                    categorySpends.map(cat => (
                                        <div key={cat.category}>
                                            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest mb-1.5">
                                                <span className="text-zinc-400">{cat.category}</span>
                                                <span className="text-neon-pink font-mono">{cat.percentage}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-neon-pink to-rose-500 rounded-full" style={{ width: `${cat.percentage}%` }} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>

                        {/* Revenue DNA */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                            className="flex-1 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col"
                        >
                            <div className="mb-4">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-white">Revenue DNA</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                                {categoryIncome.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-[9px] font-black uppercase text-zinc-600 tracking-widest">No Data</div>
                                ) : (
                                    categoryIncome.map(cat => (
                                        <div key={cat.category}>
                                            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest mb-1.5">
                                                <span className="text-zinc-400">{cat.category}</span>
                                                <span className="text-neon-green font-mono">{cat.percentage}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-neon-green to-[#00F0FF] rounded-full" style={{ width: `${cat.percentage}%` }} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>

                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};


export default FinanceDashboard;
