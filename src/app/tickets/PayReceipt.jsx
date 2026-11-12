import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Download from 'lucide-react/dist/esm/icons/download';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import { Button } from '../../components/app';
import { useT } from '../../i18n';
import { cn } from '../../lib/utils';

/*
 * The receipt a buyer gets on screen after paying on a payment page: a thermal
 * slip that prints out of a slot, in the same look as the admin's payout
 * receipt (Spends). Save turns it into a PNG; Share sends it where the phone
 * can. It shows only what the buyer already knows: the amount, what it was
 * for, who paid, when, how, and Razorpay's payment ID.
 */

const rupees = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const METHOD = { upi: 'UPI', card: 'Card', netbanking: 'Netbanking', wallet: 'Wallet', emi: 'EMI', paylater: 'Pay later' };
const when = (iso) => {
    const d = iso ? new Date(iso) : new Date();
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
// Zig-zag tear edge: 28 teeth across the receipt width.
const TEETH = Array.from({ length: 28 }, (_, i) => `L ${(i + 0.5) * 10} 8 L ${(i + 1) * 10} 0`).join(' ');

const Slip = React.forwardRef(({ receipt }, ref) => {
    const rows = [
        ['Date', when(receipt.paidAt)],
        receipt.method && ['Method', METHOD[receipt.method] || receipt.method],
        receipt.name && ['Paid by', receipt.name],
        ['Payment ID', receipt.paymentId, true],
    ].filter(r => r && r[1]);
    return (
        <div ref={ref} className="relative flex w-[280px] select-none flex-col text-white" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
            <div className="border-x border-white/[0.06] bg-[#0a0f0c] px-5 pb-5 pt-5" style={{ backgroundImage: 'radial-gradient(120% 55% at 50% 0%, rgba(57,255,20,0.16), rgba(57,255,20,0) 70%)' }}>
                <div className="flex items-center justify-between">
                    <img src="/brand/newbi-logo-800w.png" alt="Newbi" className="h-7 object-contain" />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#39ff14]/10 px-2.5 py-1 text-[11px] font-bold text-[#39ff14] ring-1 ring-[#39ff14]/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#39ff14]" />
                        Paid
                    </span>
                </div>

                <div className="mt-7">
                    <p className="text-[11px] font-semibold text-white/50">Amount paid</p>
                    <p className="mt-1 text-[36px] font-extrabold leading-none tracking-tight tabular-nums">{rupees(receipt.amount)}</p>
                    <p className="mt-3 text-[11px] font-semibold text-white/50">For</p>
                    <p className="mt-0.5 break-words text-[14px] font-bold leading-snug text-white">{receipt.eventName}</p>
                </div>

                <div className="my-5 border-t-2 border-dashed border-white/10" />

                <div className="space-y-2.5 text-[12px]">
                    {rows.map(([label, value, mono]) => (
                        <div key={label} className="flex items-start justify-between gap-4">
                            <span className="shrink-0 text-white/45">{label}</span>
                            <span className={cn('min-w-0 break-all text-right font-semibold text-white', mono && 'font-mono text-[11px]')}>{value}</span>
                        </div>
                    ))}
                </div>

                <div className="my-5 border-t-2 border-dashed border-white/10" />

                <p className="text-center text-[11px] leading-snug text-white/55">Your tickets come from the Newbi team. Keep this receipt and the payment ID.</p>
                <p className="mt-3 text-center text-[10px] text-white/30">Newbi Entertainment & Marketing LLP · Paid via Razorpay</p>
            </div>
            <svg viewBox="0 0 280 8" preserveAspectRatio="none" className="-mt-px block h-2 w-full">
                <path d={`M 0 0 ${TEETH} Z`} fill="#0a0f0c" />
            </svg>
        </div>
    );
});
Slip.displayName = 'Slip';

const toPng = async (el) => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, logging: false, useCORS: true });
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
};

const PayReceipt = ({ receipt }) => {
    const t = useT();
    const slip = useRef(null);
    const [printing, setPrinting] = useState(true);
    const [busy, setBusy] = useState('');
    const [note, setNote] = useState('');
    const fileName = `newbi_receipt_${receipt.paymentId || 'payment'}.png`;

    const save = async () => {
        if (!slip.current || busy) return;
        setBusy('save');
        setNote('');
        try {
            const blob = await toPng(slip.current);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
        } catch (err) {
            console.error(err);
            setNote(t('Couldn’t save the receipt. Take a screenshot instead.'));
        } finally {
            setBusy('');
        }
    };

    const share = async () => {
        if (!slip.current || busy) return;
        setBusy('share');
        setNote('');
        const text = `Newbi payment receipt\n${rupees(receipt.amount)} for ${receipt.eventName}\nRazorpay payment ID: ${receipt.paymentId}`;
        try {
            const blob = await toPng(slip.current);
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'Newbi receipt', text, files: [file] });
            else if (navigator.share) await navigator.share({ title: 'Newbi receipt', text });
            else await save();
        } catch (err) {
            if (err?.name !== 'AbortError') setNote(t('Couldn’t share the receipt. Save it instead.'));
        } finally {
            setBusy('');
        }
    };

    return (
        <div className="flex flex-col items-center gap-5">
            <div className="flex w-full flex-col items-center">
                {/* The slot it prints out of. */}
                <div className="relative z-30 w-[304px] max-w-full select-none">
                    <div className="flex items-center justify-between px-1 pb-2 text-[12px] font-semibold text-gray-500 dark:text-zinc-400">
                        <span>{t('Newbi receipt')}</span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className={cn('h-1.5 w-1.5 rounded-full', printing ? 'animate-pulse bg-amber-500' : 'bg-emerald-500')} />
                            {printing ? t('Printing') : t('Ready')}
                        </span>
                    </div>
                    <div className="h-3 rounded-full bg-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] ring-1 ring-black/10 dark:bg-black dark:ring-white/10" />
                </div>
                <div className="relative z-20 -mt-1.5 flex w-[280px] justify-center overflow-hidden">
                    <motion.div
                        initial={{ y: '-100%' }}
                        animate={{ y: 0 }}
                        transition={{ duration: 2.2, ease: 'linear' }}
                        onAnimationComplete={() => setPrinting(false)}
                        className="flex w-full justify-center"
                    >
                        <Slip ref={slip} receipt={receipt} />
                    </motion.div>
                </div>
            </div>
            {!printing && (
                <div className="grid w-full max-w-[304px] grid-cols-2 gap-2">
                    <Button variant="secondary" icon={Download} loading={busy === 'save'} onClick={save}>{t('Save')}</Button>
                    <Button variant="secondary" icon={Share2} loading={busy === 'share'} onClick={share}>{t('Share')}</Button>
                </div>
            )}
            {note && <p className="text-center text-[13px] text-gray-500 dark:text-zinc-400">{note}</p>}
        </div>
    );
};

export default PayReceipt;
