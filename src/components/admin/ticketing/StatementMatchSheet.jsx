import React, { useMemo, useState } from 'react';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Check from 'lucide-react/dist/esm/icons/check';
import Send from 'lucide-react/dist/esm/icons/send';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import SearchX from 'lucide-react/dist/esm/icons/search-x';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Sheet from '../Sheet';
import { Button, Badge } from '../ui';
import { areaCls } from '../uploads/UploadKit';
import { cn } from '../../../lib/utils';
import { matchStatement } from '../../../lib/paymentMatch';
import { inr, personName } from './format';

/*
 * Verify many UPI payments at once: upload (or paste) a bank or UPI-app
 * statement and every pending order whose UTR, or booking reference in the
 * payment note, is on it with the right amount is ticked, ready to verify
 * and send in one go. Read in the browser only; the statement isn't stored.
 *
 *   onVerify(orders)  verifies and sends tickets for the ticked orders
 */

const Group = ({ title, tone, icon: Icon, children, count }) => (count ? (
    <section className="space-y-2">
        <p className="flex items-center gap-2 text-[13px] font-bold"><Icon size={14} className={tone} /> {title} <Badge tone="gray">{count}</Badge></p>
        {children}
    </section>
) : null);

const Row = ({ r, checked, onToggle }) => (
    <label className={cn('flex items-start gap-3 rounded-2xl border px-3 py-2.5 text-[13px]', onToggle ? 'cursor-pointer' : '', checked ? 'border-emerald-500/40 bg-emerald-500/[0.05]' : 'border-black/[0.06] dark:border-white/[0.08]')}>
        {onToggle && <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" />}
        <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2">
                <b className="truncate">{personName(r.order, 'Buyer')}</b>
                <span className="tabular-nums">{inr(r.order.totalAmount)}</span>
                {r.by === 'ref' && <Badge tone="blue">Found by booking ref</Badge>}
                {r.outcome === 'wrongAmount' && r.amount !== null && <Badge tone="amber">Statement shows {inr(r.amount)}</Badge>}
            </span>
            <span className="block truncate font-mono text-[11.5px] text-gray-500">UTR {r.order.paymentRef || '—'} · {r.order.bookingRef}</span>
            {r.line && <span className="mt-0.5 block truncate text-[11.5px] text-gray-400">{r.line}</span>}
        </span>
    </label>
);

const StatementMatchSheet = ({ open, onClose, orders, onVerify }) => {
    const [text, setText] = useState('');
    const [fileName, setFileName] = useState('');
    const [picked, setPicked] = useState(null); // Set of order ids, null = all matched
    const [busy, setBusy] = useState(false);

    const result = useMemo(() => (text.trim() ? matchStatement(text, orders) : null), [text, orders]);
    const matchedIds = result ? result.matched.map(r => r.order.id) : [];
    const chosen = picked || new Set(matchedIds);
    const toVerify = result ? [...result.matched, ...result.wrongAmount].filter(r => chosen.has(r.order.id)).map(r => r.order) : [];

    const readFile = async (file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setText(''); setFileName('That file is over 5 MB. Export a shorter date range.'); return; }
        setFileName(file.name);
        setPicked(null);
        setText(await file.text());
    };

    const toggle = (id, on) => setPicked(() => {
        const next = new Set(chosen);
        if (on) next.add(id); else next.delete(id);
        return next;
    });

    const verify = async () => {
        if (!toVerify.length) return;
        setBusy(true);
        try { await onVerify(toVerify); onClose(); setText(''); setFileName(''); setPicked(null); }
        finally { setBusy(false); }
    };

    const pending = orders.filter(o => o.status === 'pending' && Number(o.totalAmount) > 0).length;

    return (
        <Sheet
            open={open}
            onClose={busy ? () => {} : onClose}
            size="lg"
            title="Match a bank statement"
            subtitle={`${pending} UPI ${pending === 1 ? 'payment is' : 'payments are'} waiting for a check`}
            bodyClassName="space-y-5"
            footer={result && (
                <div className="flex items-center gap-3">
                    <p className="min-w-0 flex-1 text-[13px] text-gray-500">{toVerify.length ? `${toVerify.length} ticked · ${inr(toVerify.reduce((a, o) => a + (Number(o.totalAmount) || 0), 0))}` : 'Nothing ticked'}</p>
                    <Button variant="success" className="h-12 px-5" onClick={verify} disabled={busy || !toVerify.length}>
                        <Send size={15} /> {busy ? 'Verifying…' : `Verify & send ${toVerify.length || ''}`.trim()}
                    </Button>
                </div>
            )}
        >
            <div className="space-y-2">
                <p className="text-[13px] text-gray-600 dark:text-zinc-400">
                    Download the statement for the sale days from your bank, PhonePe Business, Paytm for Business or Google Pay Business (CSV or text), and drop it here.
                    Each payment's UTR, or the booking reference buyers put in the note, is matched to its order. The file is read on this device and not uploaded.
                </p>
                <Button as="label" variant="secondary" className="h-12 cursor-pointer">
                    <Upload size={15} /> {fileName ? 'Choose another file' : 'Choose a statement file'}
                    <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; readFile(f); }} />
                </Button>
                {fileName && <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500"><FileText size={13} /> {fileName}</p>}
                <details>
                    <summary className="cursor-pointer py-2 text-[13px] font-semibold text-gray-600 dark:text-zinc-400">Or paste the statement text</summary>
                    <textarea className={cn(areaCls, 'mt-1 min-h-[120px] font-mono text-[12px]')} value={text} onChange={(e) => { setText(e.target.value); setPicked(null); setFileName(''); }} placeholder="Paste rows copied from netbanking…" />
                </details>
            </div>

            {result && (
                <>
                    {result.linesRead === 0 && <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">No UPI references found in that file. Check it's the statement for the right dates.</p>}
                    <Group title="Found, amount matches" tone="text-emerald-600" icon={Check} count={result.matched.length}>
                        {result.matched.map(r => <Row key={r.order.id} r={r} checked={chosen.has(r.order.id)} onToggle={(on) => toggle(r.order.id, on)} />)}
                    </Group>
                    <Group title="Found, but the amount is different" tone="text-amber-600" icon={AlertTriangle} count={result.wrongAmount.length}>
                        <p className="text-[12px] text-gray-500">Tick one only if you're sure (a part payment, or a coupon applied by hand).</p>
                        {result.wrongAmount.map(r => <Row key={r.order.id} r={r} checked={chosen.has(r.order.id)} onToggle={(on) => toggle(r.order.id, on)} />)}
                    </Group>
                    <Group title="Not in this statement" tone="text-gray-400" icon={SearchX} count={result.notFound.length}>
                        <p className="text-[12px] text-gray-500">Either not paid yet, paid to another account, or the UTR was typed wrong. Look these up by hand.</p>
                        {result.notFound.slice(0, 30).map(r => <Row key={r.order.id} r={r} />)}
                    </Group>
                    {result.unmatched.length > 0 && (
                        <p className="text-[12px] text-gray-500">{result.unmatched.length} other {result.unmatched.length === 1 ? 'payment' : 'payments'} in the statement had no booking.</p>
                    )}
                </>
            )}
        </Sheet>
    );
};

export default StatementMatchSheet;
