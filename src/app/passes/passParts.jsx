import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import { Button } from '../../components/app';
import { passesPost } from '../../lib/passesApi';
import { isPresent } from '../../lib/present';
import { cn } from '../../lib/utils';

/* Pieces shared by the pass page, the /t/ ticket link page and "Your ticket". */

/* "Sat 26 Sep · 7:30 PM" from a pass's event, or null. */
export const passWhen = (event = {}) => {
    const raw = event.date;
    if (!isPresent(raw)) return null;
    const day = String(raw).slice(0, 10);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(day) && !/T\d\d:/.test(String(raw)) ? new Date(`${day}T00:00:00`) : new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    const time = isPresent(event.time) ? event.time : (/T\d\d:\d\d/.test(String(raw)) && !/T00:00/.test(String(raw)) ? format(date, 'h:mm a') : null);
    return [format(date, 'EEE d MMM yyyy'), time].filter(Boolean).join(' · ');
};

/* The QR code, drawn on the phone (works offline once the page has loaded). */
export const PassQr = ({ value, size = 232, dimmed = false, className }) => {
    const [src, setSrc] = useState(null);
    useEffect(() => {
        let cancelled = false;
        if (!value) return undefined;
        const cacheKey = `nb_qr_${value}`;
        try {
            const hit = window.sessionStorage.getItem(cacheKey);
            if (hit) { setSrc(hit); return undefined; }
        } catch { /* blocked */ }
        import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }))
            .then((url) => {
                if (cancelled) return;
                setSrc(url);
                try { window.sessionStorage.setItem(cacheKey, url); } catch { /* full */ }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [value, size]);
    return (
        <div className={cn('mx-auto rounded-3xl bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)]', dimmed && 'opacity-30 grayscale', className)} style={{ width: size + 24, height: size + 24 }}>
            {src ? <img src={src} alt={`Pass code ${value}`} width={size} height={size} className="h-full w-full [image-rendering:pixelated]" />
                : <div className="h-full w-full animate-pulse rounded-2xl bg-black/[0.06]" />}
        </div>
    );
};

/*
 * Opens the ticket itself: the partner's link, or the PDF through a
 * short-lived signed URL. The new tab is opened straight from the tap (Safari
 * blocks tabs opened after an await), then pointed at the file.
 */
export const useOpenTicket = ({ ref, token }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const open = async (knownUrl) => {
        setError('');
        if (knownUrl) {
            window.open(knownUrl, '_blank', 'noopener');
            return;
        }
        const tab = window.open('', '_blank');
        setBusy(true);
        const res = await passesPost('file', token ? { token } : { ref });
        setBusy(false);
        if (!res.ok) {
            tab?.close();
            setError(res.error);
            return;
        }
        if (tab) tab.location.href = res.data.url;
        else window.location.href = res.data.url;
    };
    return { open, busy, error };
};

/* The partner's ticket: "Open ticket" for a link, "View / Download PDF" for a file. */
export const ExternalTicketButton = ({ pass, token, className }) => {
    const ext = pass?.externalTicket;
    const { open, busy, error } = useOpenTicket({ ref: pass?.ref, token });
    if (!ext || !pass.isHolder) return null;
    const isPdf = ext.kind === 'pdf';
    return (
        <div className={cn('space-y-2', className)}>
            <Button className="w-full" size="lg" icon={isPdf ? FileText : ExternalLink} loading={busy} onClick={() => open(isPdf ? null : ext.url)}>
                {isPdf ? 'View / Download PDF' : 'Open ticket'}
            </Button>
            {isPresent(ext.provider) && <p className="text-center text-[13px] text-gray-500 dark:text-zinc-400">Issued by {ext.provider}</p>}
            {error && <p role="alert" className="text-center text-[14px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
};

export const STATUS_COPY = {
    issued: null,
    checked_in: { label: 'Checked in', tone: 'accent' },
    revoked: { label: 'Cancelled', tone: 'danger' },
    pending: { label: 'Waiting for approval', tone: 'warn' },
};
