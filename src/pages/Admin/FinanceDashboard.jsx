import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import ArrowDownLeft from 'lucide-react/dist/esm/icons/arrow-down-left';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Scale from 'lucide-react/dist/esm/icons/scale';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import HandCoins from 'lucide-react/dist/esm/icons/hand-coins';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Activity from 'lucide-react/dist/esm/icons/activity';
import Inbox from 'lucide-react/dist/esm/icons/inbox';

import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Card, Button, Badge, Select, StatTile, EmptyState } from '../../components/admin/ui';
import { accent } from '../../components/admin/theme';
import { inr } from '../../components/admin/ticketing/format';
import { isInvoiceOverdue, invoiceBalance, invoiceState, todayKey } from '../../lib/invoicing';
import {
    FINANCE_TABS, SPEND_TYPES, buildLedger, sumRange, monthRange, shiftMonth, monthLabel, todayIST,
    change, formatDay, isSpendPending, isIncomePending, amountOf, spendDay, spendType, spendPayee,
} from '../../components/admin/finance/money';
import { CashflowBars, BreakdownBars, SplitBar, Legend, IN_TONE, OUT_TONE } from '../../components/admin/finance/Charts';

const legacyMonth = (key) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const INCOME_TONES = ['cyan', 'indigo', 'fuchsia', 'amber', 'green', 'blue', 'pink'];

// "+12% vs Sep" with a colour that says whether it's good news.
const Delta = ({ now, before, goodWhenUp = true, label }) => {
    const pct = change(now, before);
    if (pct === null) return <span className="text-[12px] text-gray-400">No {label} to compare</span>;
    const up = pct > 0;
    const good = pct === 0 ? null : (up === goodWhenUp);
    return (
        <span className={cn('text-[12px] font-semibold', good === null ? 'text-gray-500' : good ? accent('green').text : accent('red').text)}>
            {pct === 0 ? 'Same as' : `${up ? '▲' : '▼'} ${Math.abs(pct)}% vs`} {label}
        </span>
    );
};

const Panel = ({ title, subtitle, action, children, className }) => (
    <section className={cn('rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-5', className)}>
        {(title || action) && (
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">{title}</h3>
                    {subtitle && <p className="mt-0.5 text-[12.5px] text-gray-500 dark:text-zinc-400">{subtitle}</p>}
                </div>
                {action}
            </div>
        )}
        {children}
    </section>
);

const SOURCE_META = {
    invoice: { tone: 'blue', label: 'Invoice' },
    income: { tone: 'cyan', label: 'Other income' },
    spend: { tone: OUT_TONE, label: 'Spend' },
};

const linkFor = (row) => {
    if (row.source === 'invoice') return `/admin/invoices?invoice=${row.record.id}`;
    if (row.source === 'income') return `/admin/other-income?month=all&q=${encodeURIComponent(row.record.sourceName || '')}`;
    return `/admin/spends?month=all&q=${encodeURIComponent(row.record.title || row.who || '')}`;
};

const FinanceDashboard = () => {
    useStoreSubscription(['invoices', 'spends', 'otherIncomes']);
    const invoices = useStore(s => s.invoices) || [];
    const spends = useStore(s => s.spends) || [];
    const otherIncomes = useStore(s => s.otherIncomes) || [];

    const [params, setParams] = useSearchParams();
    const thisMonth = todayIST().slice(0, 7);
    const rawMonth = params.get('month');
    const period = rawMonth === 'all' ? 'all' : (/^\d{4}-\d{2}$/.test(rawMonth || '') ? rawMonth : thisMonth);
    const setPeriod = (value) => {
        const next = new URLSearchParams(params);
        if (!value || value === thisMonth) next.delete('month'); else next.set('month', value);
        setParams(next, { replace: true });
    };

    const ledger = useMemo(() => buildLedger({ invoices, spends, otherIncomes }), [invoices, spends, otherIncomes]);

    // Months that have anything in them, newest first, always including the last 6.
    const monthOptions = useMemo(() => {
        const set = new Set();
        for (let i = 0; i < 6; i++) set.add(shiftMonth(thisMonth, -i));
        ledger.forEach(r => { if (r.day && r.day.slice(0, 7) <= thisMonth) set.add(r.day.slice(0, 7)); });
        return [...set].sort().reverse();
    }, [ledger, thisMonth]);

    const [from, to] = period === 'all' ? [null, null] : monthRange(period);
    const prevMonth = period === 'all' ? null : shiftMonth(period, -1);
    const totals = useMemo(() => sumRange(ledger, from, to), [ledger, from, to]);
    const prevTotals = useMemo(() => (prevMonth ? sumRange(ledger, ...monthRange(prevMonth)) : null), [ledger, prevMonth]);
    const inPeriod = (day) => Boolean(day) && (!from || day >= from) && (!to || day <= to);

    // Where things stand today, whatever period is picked.
    const now = useMemo(() => {
        const today = todayKey();
        const openInvoices = invoices.filter(inv => invoiceBalance(inv) > 0);
        const overdue = openInvoices.filter(inv => isInvoiceOverdue(inv, today));
        const verifying = invoices.filter(inv => invoiceState(inv, today) === 'verifying');
        const pendingIncome = otherIncomes.filter(isIncomePending);
        const pendingSpends = spends.filter(isSpendPending);
        const sum = (list, fn) => list.reduce((a, x) => a + fn(x), 0);
        return {
            invoiceDue: sum(openInvoices, invoiceBalance),
            invoiceCount: openInvoices.length,
            overdue: sum(overdue, invoiceBalance),
            overdueCount: overdue.length,
            verifyingCount: verifying.length,
            incomeDue: sum(pendingIncome, i => amountOf(i.amount)),
            incomeCount: pendingIncome.length,
            toPay: sum(pendingSpends, s => amountOf(s.amount)),
            toPayCount: pendingSpends.length,
            pendingSpends: [...pendingSpends].sort((a, b) => (spendDay(a) || '').localeCompare(spendDay(b) || '')),
            overdueList: overdue.sort((a, b) => invoiceBalance(b) - invoiceBalance(a)),
        };
    }, [invoices, otherIncomes, spends]);

    // Six months ending at the picked month (or this month for all time).
    const chart = useMemo(() => {
        const end = period === 'all' ? thisMonth : period;
        return Array.from({ length: 6 }, (_, i) => {
            const key = shiftMonth(end, i - 5);
            const t = sumRange(ledger, ...monthRange(key));
            return { key, label: monthLabel(key), short: monthLabel(key, { month: 'short' }), income: t.income, out: t.out, net: t.net };
        });
    }, [ledger, period, thisMonth]);

    const periodRows = useMemo(() => ledger.filter(r => r.settled && inPeriod(r.day)), [ledger, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

    const spendBreakdown = useMemo(() => {
        const byType = {};
        periodRows.filter(r => r.direction === 'out').forEach(r => { byType[r.type] = (byType[r.type] || 0) + r.amount; });
        return Object.entries(byType)
            .map(([type, amount]) => ({ label: SPEND_TYPES[type].label, tone: SPEND_TYPES[type].tone, amount, type }))
            .sort((a, b) => b.amount - a.amount);
    }, [periodRows]);

    const incomeBreakdown = useMemo(() => {
        const byCat = {};
        periodRows.filter(r => r.direction === 'in').forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + r.amount; });
        return Object.entries(byCat)
            .sort((a, b) => b[1] - a[1])
            .map(([label, amount], i) => ({ label, amount, tone: label === 'Client invoices' ? 'blue' : INCOME_TONES[i % INCOME_TONES.length] }));
    }, [periodRows]);

    const topPayees = useMemo(() => {
        const by = {};
        periodRows.filter(r => r.direction === 'out' && r.who).forEach(r => {
            const key = r.who.trim();
            by[key] = by[key] || { name: key, amount: 0, count: 0 };
            by[key].amount += r.amount;
            by[key].count += 1;
        });
        return Object.values(by).sort((a, b) => b.amount - a.amount).slice(0, 5);
    }, [periodRows]);

    // Paid from someone's own account (to reimburse) and income that landed in a personal account.
    const personal = useMemo(() => {
        const out = { spent: 0, spentCount: 0, held: 0, heldCount: 0, people: {} };
        spends.forEach(sp => {
            if (sp.accountType !== 'personal' || !inPeriod(spendDay(sp))) return;
            const amt = amountOf(sp.amount);
            out.spent += amt; out.spentCount += 1;
            const who = (sp.paidBy || '').trim() || 'Team member';
            out.people[who] = (out.people[who] || 0) + amt;
        });
        ledger.forEach(r => {
            if (r.source === 'income' && r.account === 'personal' && r.settled && inPeriod(r.day)) { out.held += r.amount; out.heldCount += 1; }
        });
        out.peopleList = Object.entries(out.people).sort((a, b) => b[1] - a[1]).slice(0, 4);
        return out;
    }, [spends, ledger, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

    const recent = useMemo(() => [...ledger]
        .filter(r => inPeriod(r.day) && (r.settled || r.source === 'spend'))
        .sort((a, b) => (b.day || '').localeCompare(a.day || '') || (b.direction === 'out') - (a.direction === 'out'))
        .slice(0, 12), [ledger, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

    const periodName = period === 'all' ? 'All time' : monthLabel(period, { month: 'long', year: 'numeric' });
    const prevName = prevMonth ? monthLabel(prevMonth, { month: 'short' }) : '';
    const empty = invoices.length + spends.length + otherIncomes.length === 0;
    const owedIn = now.invoiceDue + now.incomeDue;
    // Spends and Other income take the month as "Oct 2026" (en-US short month).
    const periodQuery = period === 'all' ? 'month=all' : (period === thisMonth ? '' : `month=${encodeURIComponent(legacyMonth(period))}`);

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Finance board', icon: TrendingUp, description: 'Money in, money out and what is still owed' }}
            tabs={FINANCE_TABS}
            action={(
                <div className="flex w-full gap-2 sm:w-auto">
                    <Select
                        value={period}
                        onChange={setPeriod}
                        label="Period"
                        className="min-w-0 flex-1 sm:w-48 sm:flex-none"
                        options={[
                            ...monthOptions.map(m => ({ value: m, label: m === thisMonth ? `This month (${monthLabel(m, { month: 'short' })})` : monthLabel(m, { month: 'long', year: 'numeric' }) })),
                            { value: 'all', label: 'All time' },
                        ]}
                    />
                </div>
            )}
        >
            {empty ? (
                <Card className="rounded-2xl">
                    <EmptyState
                        icon={Wallet}
                        title="No money recorded yet"
                        description="Log a spend, add income, or create an invoice and it will show up here."
                        action={(
                            <div className="flex flex-wrap justify-center gap-2">
                                <Button as={Link} to="/admin/spends" variant="accent"><Plus size={14} /> Log spend</Button>
                                <Button as={Link} to="/admin/other-income" variant="secondary">Add income</Button>
                            </div>
                        )}
                    />
                </Card>
            ) : (
                <div className="space-y-5">
                    {/* Period KPIs */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatTile icon={ArrowDownLeft} tone={IN_TONE} label="Money in" value={inr(totals.income)} hint={`${inr(totals.invoiceIn)} invoices · ${inr(totals.otherIn)} other`} />
                        <StatTile icon={ArrowUpRight} tone={OUT_TONE} label="Money out" value={inr(totals.out)} hint={`${periodRows.filter(r => r.direction === 'out').length} payouts made`} to={`/admin/spends${periodQuery ? `?${periodQuery}&status=Paid` : '?status=Paid'}`} />
                        <StatTile icon={Scale} tone={totals.net >= 0 ? 'green' : 'red'} label="Net" value={`${totals.net < 0 ? '−' : ''}${inr(Math.abs(totals.net))}`} hint={totals.net >= 0 ? 'More came in than went out' : 'More went out than came in'} />
                        <StatTile icon={Hourglass} tone="amber" label="Still to collect" value={inr(owedIn)} hint={`${now.invoiceCount} invoices · ${now.incomeCount} other`} to="/admin/invoices?filter=unpaid" />
                    </div>

                    {/* Compared with last month */}
                    {prevTotals && (
                        <Panel title={`${periodName} vs ${monthLabel(prevMonth, { month: 'long' })}`} subtitle="Money that actually moved, by the day it was paid or received">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {[
                                    { label: 'Money in', now: totals.income, before: prevTotals.income, tone: IN_TONE, good: true },
                                    { label: 'Money out', now: totals.out, before: prevTotals.out, tone: OUT_TONE, good: false },
                                    { label: 'Net', now: totals.net, before: prevTotals.net, tone: totals.net >= 0 ? 'green' : 'red', good: true },
                                ].map(k => (
                                    <div key={k.label} className={cn('rounded-xl p-3.5', accent(k.tone).soft)}>
                                        <p className="text-[12px] font-bold text-gray-500 dark:text-zinc-400">{k.label}</p>
                                        <p className={cn('mt-0.5 text-[20px] font-extrabold tabular-nums', accent(k.tone).text)}>{k.now < 0 ? '−' : ''}{inr(Math.abs(k.now))}</p>
                                        <p className="mt-0.5 text-[12px] text-gray-500 dark:text-zinc-400">{prevName}: {k.before < 0 ? '−' : ''}{inr(Math.abs(k.before))}</p>
                                        <Delta now={k.now} before={k.before} goodWhenUp={k.good} label={prevName} />
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    )}

                    {/* Right now */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatTile icon={Wallet} tone={now.toPayCount ? 'orange' : 'gray'} label="To pay out" value={inr(now.toPay)} hint={now.toPayCount ? `${now.toPayCount} pending` : 'Nothing pending'} to="/admin/spends?month=all&status=Pending" />
                        <StatTile icon={AlertCircle} tone={now.overdueCount ? 'red' : 'gray'} label="Overdue" value={inr(now.overdue)} hint={now.overdueCount ? `${now.overdueCount} past due` : 'Nothing overdue'} to="/admin/invoices?filter=overdue" />
                        <StatTile icon={Clock} tone={now.verifyingCount ? 'amber' : 'gray'} label="Claims to check" value={now.verifyingCount} hint={now.verifyingCount ? 'Clients say they paid' : 'No claims waiting'} to="/admin/invoices?filter=verifying" />
                        <StatTile icon={HandCoins} tone={personal.spent ? 'violet' : 'gray'} label="Team paid" value={inr(personal.spent)} hint={personal.spentCount ? `${personal.spentCount} to reimburse` : 'Nothing this period'} to={`/admin/spends?account=personal${periodQuery ? `&${periodQuery}` : ''}`} />
                    </div>

                    {/* Cashflow */}
                    <Panel
                        title="Cashflow"
                        subtitle="Six months of money in and out. Tap a month to see it."
                        action={<Legend items={[{ label: 'In', tone: IN_TONE }, { label: 'Out', tone: OUT_TONE }]} className="hidden sm:flex" />}
                    >
                        <CashflowBars months={chart} selected={period} onSelect={setPeriod} />
                        <Legend items={[{ label: 'Money in', tone: IN_TONE }, { label: 'Money out', tone: OUT_TONE }]} className="mt-3 sm:hidden" />
                    </Panel>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Panel title="Where money came from" subtitle={periodName}>
                            {incomeBreakdown.length > 0 && (
                                <div className="mb-4">
                                    <SplitBar parts={incomeBreakdown} />
                                </div>
                            )}
                            <BreakdownBars items={incomeBreakdown} empty="Nothing received in this period." />
                        </Panel>
                        <Panel title="Where money went" subtitle={periodName}>
                            {spendBreakdown.length > 0 && (
                                <div className="mb-4">
                                    <SplitBar parts={spendBreakdown} />
                                </div>
                            )}
                            <BreakdownBars items={spendBreakdown} empty="Nothing paid out in this period." />
                        </Panel>
                    </div>

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                        {/* Needs attention */}
                        <Panel title="Needs attention" subtitle="Open right now">
                            {now.pendingSpends.length === 0 && now.overdueList.length === 0 && personal.held === 0 ? (
                                <p className="py-6 text-center text-[13px] text-gray-500">All clear. Nothing waiting on you.</p>
                            ) : (
                                <ul className="-mx-2 space-y-0.5">
                                    {now.overdueList.slice(0, 4).map(inv => (
                                        <li key={`o-${inv.id}`}>
                                            <Link to={`/admin/invoices?invoice=${inv.id}`} className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                                                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accent('red').chip)}><AlertCircle size={15} /></span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13.5px] font-semibold">{inv.clientName || 'Client'}</span>
                                                    <span className="block truncate text-[12px] text-gray-500">Overdue · {inv.invoiceNumber || 'invoice'}</span>
                                                </span>
                                                <span className="shrink-0 text-[13.5px] font-bold tabular-nums">{inr(invoiceBalance(inv))}</span>
                                            </Link>
                                        </li>
                                    ))}
                                    {now.pendingSpends.slice(0, 5).map(sp => (
                                        <li key={`s-${sp.id}`}>
                                            <Link to={`/admin/spends?month=all&status=Pending&q=${encodeURIComponent(sp.title || spendPayee(sp))}`} className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                                                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accent('orange').chip)}><Wallet size={15} /></span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13.5px] font-semibold">{spendPayee(sp) || sp.title || 'Payout'}</span>
                                                    <span className="block truncate text-[12px] text-gray-500">To pay · {SPEND_TYPES[spendType(sp)].label}{spendDay(sp) ? ` · ${formatDay(spendDay(sp))}` : ''}</span>
                                                </span>
                                                <span className="shrink-0 text-[13.5px] font-bold tabular-nums">{inr(amountOf(sp.amount))}</span>
                                            </Link>
                                        </li>
                                    ))}
                                    {personal.held > 0 && (
                                        <li>
                                            <Link to={`/admin/other-income?account=personal${periodQuery ? `&${periodQuery}` : ''}`} className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                                                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accent('violet').chip)}><HandCoins size={15} /></span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13.5px] font-semibold">Income in personal accounts</span>
                                                    <span className="block truncate text-[12px] text-gray-500">{personal.heldCount} {personal.heldCount === 1 ? 'entry' : 'entries'} to move to Newbi</span>
                                                </span>
                                                <span className="shrink-0 text-[13.5px] font-bold tabular-nums">{inr(personal.held)}</span>
                                            </Link>
                                        </li>
                                    )}
                                </ul>
                            )}
                            {(now.pendingSpends.length > 5 || now.overdueList.length > 4) && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {now.pendingSpends.length > 5 && <Button as={Link} to="/admin/spends?month=all&status=Pending" size="sm" variant="secondary">All {now.pendingSpends.length} payouts <ChevronRight size={13} /></Button>}
                                    {now.overdueList.length > 4 && <Button as={Link} to="/admin/invoices?filter=overdue" size="sm" variant="secondary">All overdue <ChevronRight size={13} /></Button>}
                                </div>
                            )}
                        </Panel>

                        {/* Recent */}
                        <Panel title="Recent money movements" subtitle={periodName} className="xl:col-span-2">
                            {recent.length === 0 ? (
                                <EmptyState icon={Inbox} title="Nothing moved" description="No payments in or out in this period." />
                            ) : (
                                <ul className="-mx-2 divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                                    {recent.map(r => {
                                        const meta = SOURCE_META[r.source];
                                        const isOut = r.direction === 'out';
                                        return (
                                            <li key={r.id}>
                                                <Link to={linkFor(r)} className="flex min-h-[52px] items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                                                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accent(isOut ? OUT_TONE : IN_TONE).chip)}>
                                                        {isOut ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex min-w-0 items-center gap-2">
                                                            <span className="truncate text-[13.5px] font-semibold">{r.source === 'invoice' ? r.who : (isOut ? (r.who || r.title) : r.title)}</span>
                                                            {!r.settled && <Badge tone="amber">To pay</Badge>}
                                                            {r.account === 'personal' && <Badge tone="violet">Personal</Badge>}
                                                        </span>
                                                        <span className="block truncate text-[12px] text-gray-500">
                                                            {meta.label}{r.source === 'spend' ? ` · ${r.category}` : r.source === 'invoice' ? ` · ${r.title}` : r.category !== r.title ? ` · ${r.category}` : ''}{r.day ? ` · ${formatDay(r.day)}` : ''}
                                                        </span>
                                                    </span>
                                                    <span className={cn('shrink-0 text-[13.5px] font-bold tabular-nums', isOut ? accent(OUT_TONE).text : accent(IN_TONE).text)}>
                                                        {isOut ? '−' : '+'}{inr(r.amount)}
                                                    </span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Panel>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Panel title="Biggest payees" subtitle={periodName} action={<Button as={Link} to="/admin/payees" size="sm" variant="ghost">Payees <ChevronRight size={13} /></Button>}>
                            {topPayees.length === 0 ? (
                                <p className="py-6 text-center text-[13px] text-gray-500">No payouts in this period.</p>
                            ) : (
                                <BreakdownBars items={topPayees.map((p, i) => ({ label: p.name, amount: p.amount, tone: ['rose', 'orange', 'amber', 'violet', 'pink'][i], hint: `${p.count} ${p.count === 1 ? 'payout' : 'payouts'}` }))} total={totals.out} />
                            )}
                        </Panel>
                        <Panel title="Personal accounts" subtitle={`${periodName} · money that went through a team member's own account`}>
                            <div className="grid grid-cols-2 gap-3">
                                <Link to={`/admin/spends?account=personal${periodQuery ? `&${periodQuery}` : ''}`} className={cn('rounded-xl p-3.5 transition-colors hover:opacity-90', accent('violet').soft)}>
                                    <p className="text-[12px] font-bold text-gray-500 dark:text-zinc-400">Paid by the team</p>
                                    <p className={cn('mt-0.5 text-[20px] font-extrabold tabular-nums', accent('violet').text)}>{inr(personal.spent)}</p>
                                    <p className="text-[12px] text-gray-500">{personal.spentCount} {personal.spentCount === 1 ? 'spend' : 'spends'} to reimburse</p>
                                </Link>
                                <Link to={`/admin/other-income?account=personal${periodQuery ? `&${periodQuery}` : ''}`} className={cn('rounded-xl p-3.5 transition-colors hover:opacity-90', accent('fuchsia').soft)}>
                                    <p className="text-[12px] font-bold text-gray-500 dark:text-zinc-400">Received by the team</p>
                                    <p className={cn('mt-0.5 text-[20px] font-extrabold tabular-nums', accent('fuchsia').text)}>{inr(personal.held)}</p>
                                    <p className="text-[12px] text-gray-500">{personal.heldCount} {personal.heldCount === 1 ? 'entry' : 'entries'} to move to Newbi</p>
                                </Link>
                            </div>
                            {personal.peopleList.length > 0 && (
                                <ul className="mt-4 space-y-2">
                                    {personal.peopleList.map(([name, amount]) => (
                                        <li key={name} className="flex items-center justify-between gap-3 text-[13px]">
                                            <span className="flex min-w-0 items-center gap-2"><Activity size={13} className="shrink-0 text-gray-400" /><span className="truncate font-semibold">{name}</span> <span className="shrink-0 text-gray-500">paid</span></span>
                                            <span className="shrink-0 font-bold tabular-nums">{inr(amount)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    </div>

                    <p className="px-1 text-[12px] text-gray-500 dark:text-zinc-400">
                        Invoices count when money is received (advance on the issue date, each payment on its date). Spends and income count on the date entered, in India time. Pending entries are not in the totals.
                    </p>
                </div>
            )}
        </AdminCommunityHubLayout>
    );
};

export default FinanceDashboard;
