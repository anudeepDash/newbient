import React, { useEffect, useState } from 'react';
import Download from 'lucide-react/dist/esm/icons/download';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import { Button } from '../ui';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { copyToClipboard } from '../../../lib/clipboard';
import { upiPayUri, upiAmount, cleanUpiId } from '../../../lib/upi';

/*
 * A scan-to-pay QR for a payee's UPI ID. Scan it with any UPI app on your
 * phone and the payee, amount and note are filled in; you still confirm with
 * your PIN there. Drawn in the browser (the qrcode package), never sent anywhere.
 */

const QR_OPTS = { margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } };
const inrText = (am) => `₹${Number(am).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fileSafe = (s) => String(s || 'payee').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'payee';

/* QR plus the name, UPI ID and amount underneath, as a PNG to save or forward. */
const downloadCard = async ({ uri, name, upiId, amount }) => {
    const { default: QRCode } = await import('qrcode');
    const qr = document.createElement('canvas');
    await QRCode.toCanvas(qr, uri, { ...QR_OPTS, width: 560 });
    const pad = 40;
    const lines = [name, upiId, amount ? inrText(amount) : 'Enter the amount in your app'].filter(Boolean);
    const out = document.createElement('canvas');
    out.width = qr.width + pad * 2;
    out.height = qr.height + pad * 2 + 46 * lines.length + 10;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(qr, pad, pad);
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
        ctx.font = i === 0 ? 'bold 30px system-ui, sans-serif' : i === 1 ? '26px ui-monospace, Menlo, monospace' : 'bold 28px system-ui, sans-serif';
        ctx.fillText(line, out.width / 2, qr.height + pad + 40 + i * 46, out.width - pad * 2);
    });
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `upi-${fileSafe(name)}${amount ? `-${Math.round(Number(amount))}` : ''}.png`;
    a.click();
};

/**
 * upiId, name: the payee. amount: rupees (optional; blank lets the payer type it).
 * note: shown in both bank statements (keep it short). className: outer box.
 */
const UpiPayQr = ({ upiId, name, amount, note, size = 196, className }) => {
    const addToast = useStore(s => s.addToast);
    const am = upiAmount(amount);
    const uri = upiPayUri({ upiId, name, amount: am, note });
    const [src, setSrc] = useState(null);

    useEffect(() => {
        let live = true;
        setSrc(null);
        if (!uri) return undefined;
        import('qrcode')
            .then(({ default: QRCode }) => QRCode.toDataURL(uri, { ...QR_OPTS, width: size * 2 }))
            .then(url => { if (live) setSrc(url); })
            .catch(() => {});
        return () => { live = false; };
    }, [uri, size]);

    if (!cleanUpiId(upiId)) {
        return (
            <div className={cn('flex items-center gap-2 rounded-2xl bg-black/[0.03] p-4 text-[13px] text-gray-500 dark:bg-white/[0.03]', className)}>
                <QrCode size={16} className="shrink-0" /> “{upiId}” doesn’t look like a UPI ID, so there’s no QR. Check it with them.
            </div>
        );
    }

    const copyLink = async () => {
        const ok = await copyToClipboard(uri);
        addToast(ok ? 'Paste it in a chat; tapping it on a phone opens their UPI app.' : 'Your browser blocked copying.', ok ? 'success' : 'warning', ok ? { title: 'UPI pay link copied' } : undefined);
    };
    const save = () => downloadCard({ uri, name, upiId: cleanUpiId(upiId), amount: am })
        .catch(() => addToast('Please try again.', 'error', { title: 'Couldn’t make the image' }));

    return (
        <div className={cn('rounded-2xl border border-black/[0.08] p-4 dark:border-white/[0.08]', className)}>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="shrink-0 rounded-2xl bg-white p-2.5 shadow-[0_6px_24px_rgba(0,0,0,0.10)]" style={{ width: size + 20, height: size + 20 }}>
                    {src
                        ? <img src={src} alt={`UPI QR to pay ${name || cleanUpiId(upiId)}${am ? ` ${inrText(am)}` : ''}`} width={size} height={size} className="h-full w-full [image-rendering:pixelated]" />
                        : <div className="h-full w-full animate-pulse rounded-xl bg-black/[0.06]" />}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-[13px] font-bold text-gray-500">Scan with any UPI app</p>
                    <p className="mt-1 truncate text-[15px] font-extrabold">{name || 'Payee'}</p>
                    <p className="truncate font-mono text-[12.5px] text-gray-500">{cleanUpiId(upiId)}</p>
                    <p className="mt-2 text-[22px] font-extrabold tabular-nums">{am ? inrText(am) : <span className="text-[13px] font-semibold text-gray-500">No amount set: type it in your app</span>}</p>
                    {note && <p className="mt-0.5 truncate text-[12px] text-gray-500">Note: {note}</p>}
                    <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                        <Button variant="secondary" size="sm" className="h-10" onClick={save}><Download size={14} /> Save QR</Button>
                        <Button variant="secondary" size="sm" className="h-10" onClick={copyLink}><Copy size={14} /> Copy pay link</Button>
                        <Button as="a" href={uri} variant="secondary" size="sm" className="h-10 sm:hidden"><Smartphone size={14} /> Open UPI app</Button>
                    </div>
                </div>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-gray-500">You confirm the payment with your PIN in your UPI app. Nothing is paid from here. Check the name your app shows before you pay.</p>
        </div>
    );
};

export default UpiPayQr;
