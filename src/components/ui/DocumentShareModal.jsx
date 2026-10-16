import React, { useState, useEffect } from 'react';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import QRCode from 'qrcode';
import Sheet from '../admin/Sheet';
import { cn } from '../../lib/utils';
import { getDocumentShareMeta, getPdfPreviewImageUrl } from '../../lib/documentPreviewUtils';
import { docTheme } from './docviewer/DocKit';

/*
 * Share a document link: copy, WhatsApp, email, the phone's own share sheet,
 * or a QR code to scan. Shows how the link will look when pasted in a chat.
 */
export default function DocumentShareModal({
    isOpen,
    onClose,
    documentData = {},
    type = 'proposal',
    pdfPagePreview = null,
}) {
    const theme = docTheme(type);
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [qr, setQr] = useState('');
    const [canNativeShare, setCanNativeShare] = useState(false);

    const shareUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://www.newbi.live/';
    const meta = getDocumentShareMeta(documentData, type);
    const preview = pdfPagePreview || getPdfPreviewImageUrl(documentData?.fileUrl, { width: 800, height: 1100 }) || meta.previewImage;
    const hasRealPreview = preview && !preview.endsWith('/og-image.png');

    useEffect(() => { setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }, []);
    useEffect(() => { if (!isOpen) { setShowQr(false); setCopied(false); } }, [isOpen]);

    useEffect(() => {
        if (!showQr || qr) return;
        QRCode.toDataURL(shareUrl, { width: 320, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
            .then(setQr)
            .catch(err => console.error('QR code failed:', err));
    }, [showQr, qr, shareUrl]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            // Older Safari / in-app browsers: fall back to a selection copy.
            const ta = document.createElement('textarea');
            ta.value = shareUrl;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch { /* ignore */ }
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
    };

    const whatsapp = () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${meta.shareMessage}\n${shareUrl}`)}`, '_blank', 'noopener,noreferrer');
    const email = () => {
        const body = `${meta.emailBody}${shareUrl}\n\nBest regards,\nNewbi Entertainment & Marketing LLP`;
        window.location.href = `mailto:?subject=${encodeURIComponent(meta.emailSubject)}&body=${encodeURIComponent(body)}`;
    };
    const nativeShare = async () => {
        try {
            await navigator.share({ title: meta.title, text: meta.description, url: shareUrl });
        } catch (err) {
            if (err?.name !== 'AbortError') copy();
        }
    };

    const actions = [
        { id: 'wa', label: 'WhatsApp', icon: MessageCircle, onClick: whatsapp, cls: 'bg-[#25D366]/10 text-[#128C7E] dark:text-[#25D366]' },
        { id: 'mail', label: 'Email', icon: Mail, onClick: email, cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
        canNativeShare && { id: 'more', label: 'More', icon: Share2, onClick: nativeShare, cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-300' },
        { id: 'qr', label: showQr ? 'Hide QR' : 'QR code', icon: QrCode, onClick: () => setShowQr(v => !v), cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300', active: showQr },
    ].filter(Boolean);

    return (
        <Sheet open={isOpen} onClose={onClose} variant="dialog" size="sm" zIndex={1000} title={`Share ${theme.label.toLowerCase()}`} subtitle="Anyone with this link can open it.">
            <div className="space-y-5">
                {/* How the link unfurls in a chat */}
                <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <div className="flex gap-3 p-3">
                        <div className="flex aspect-[1/1.414] w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-white">
                            {hasRealPreview
                                ? <img src={preview} alt="" className="h-full w-full object-cover object-top" crossOrigin="anonymous" />
                                : <FileText size={22} className={theme.text} />}
                        </div>
                        <div className="min-w-0 flex-1 py-0.5">
                            <p className="text-[11.5px] text-gray-500 dark:text-zinc-400">newbi.live</p>
                            <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-snug text-gray-900 dark:text-white">{meta.title}</p>
                            <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-gray-500 dark:text-zinc-400">{meta.description}</p>
                        </div>
                    </div>
                </div>

                {/* Link + copy */}
                <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-gray-50 p-1.5 pl-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                    <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} aria-label="Document link"
                        className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-700 outline-none dark:text-zinc-300" />
                    <button type="button" onClick={copy}
                        className={cn('flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition-colors',
                            copied ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white dark:bg-white dark:text-black')}>
                        {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>

                <div className={cn('grid gap-2', actions.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
                    {actions.map(a => (
                        <button key={a.id} type="button" onClick={a.onClick}
                            className={cn('flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-[12px] font-semibold transition-colors',
                                a.active ? 'border-black/20 bg-black/[0.03] dark:border-white/25 dark:bg-white/[0.06]' : 'border-black/[0.07] hover:bg-black/[0.03] dark:border-white/[0.08] dark:hover:bg-white/[0.05]',
                                'text-gray-700 dark:text-zinc-200')}>
                            <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', a.cls)}><a.icon size={18} /></span>
                            {a.label}
                        </button>
                    ))}
                </div>

                {showQr && (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.07] bg-white p-4 dark:border-white/[0.08]">
                        {qr ? <img src={qr} alt="QR code for this document" className="h-48 w-48" /> : <div className="h-48 w-48 animate-pulse rounded-xl bg-gray-100" />}
                        <p className="text-[12.5px] text-gray-500">Scan with a phone camera to open</p>
                    </div>
                )}
            </div>
        </Sheet>
    );
}
