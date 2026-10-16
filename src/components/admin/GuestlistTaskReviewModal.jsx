import React, { useCallback, useEffect, useRef, useState } from 'react';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import FileIcon from 'lucide-react/dist/esm/icons/file';
import Film from 'lucide-react/dist/esm/icons/film';
import Music from 'lucide-react/dist/esm/icons/music';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Download from 'lucide-react/dist/esm/icons/download';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Users from 'lucide-react/dist/esm/icons/users';
import Clock from 'lucide-react/dist/esm/icons/clock';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import Sheet from './Sheet';
import { Button, Badge } from './ui';
import { accent } from './theme';
import { formatDateTime } from './ticketing/format';

/*
 * Review one guestlist task submission: what the event asked for, what the
 * guest sent (file preview, link, written answer) and big approve / reject
 * buttons. On a keyboard, A approves and R rejects.
 */

const withProtocol = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const hostOf = (url) => {
    try { return new URL(withProtocol(url)).hostname.replace(/^www\./, ''); } catch { return ''; }
};

const SectionLabel = ({ icon: Icon, children, action }) => (
    <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-[13px] font-bold">
            {Icon && <Icon size={14} className="text-gray-400" />}
            {children}
        </h3>
        {action}
    </div>
);

const box = 'rounded-2xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]';
const smallLink = 'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-[13px] font-semibold text-gray-800 hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-white/20';

export const GuestlistTaskReviewModal = ({
    isOpen,
    onClose,
    entry,
    event,
    onStatusChange
}) => {
    const [actionLoading, setActionLoading] = useState(null); // 'approved' | 'rejected' | null
    const [copiedRef, setCopiedRef] = useState(false);
    const [confirmReject, setConfirmReject] = useState(false);
    const [actionError, setActionError] = useState('');
    const busyRef = useRef(false);

    const name = entry?.customerName || entry?.name || 'Guest';
    const currentStatus = entry ? (entry.status || (entry.hasTask ? 'pending' : 'approved')) : 'pending';
    const isApproved = currentStatus === 'approved' || currentStatus === 'confirmed';
    const isRejected = currentStatus === 'rejected';

    const handleApprove = useCallback(async () => {
        if (!entry || busyRef.current) return;
        busyRef.current = true;
        setActionLoading('approved');
        setActionError('');
        try {
            await onStatusChange(entry.id, 'approved');
            useStore.getState().addToast(`Guestlist application from ${entry.customerName || entry.name} approved.`, 'success');
            onClose();
        } catch (error) {
            console.error('Error approving entry:', error);
            setActionError("Couldn't approve the application. Please try again.");
        } finally {
            busyRef.current = false;
            setActionLoading(null);
        }
    }, [entry, onStatusChange, onClose]);

    // First tap asks, second tap declines (no browser pop-up).
    const handleReject = useCallback(async () => {
        if (!entry || busyRef.current) return;
        if (!confirmReject) { setConfirmReject(true); return; }
        busyRef.current = true;
        setActionLoading('rejected');
        setActionError('');
        try {
            await onStatusChange(entry.id, 'rejected');
            useStore.getState().addToast(`Application from ${entry.customerName || entry.name} declined.`, 'info');
            onClose();
        } catch (error) {
            console.error('Error rejecting entry:', error);
            setActionError("Couldn't decline the application. Please try again.");
        } finally {
            busyRef.current = false;
            setActionLoading(null);
        }
    }, [entry, onStatusChange, onClose, confirmReject]);

    useEffect(() => { setConfirmReject(false); setActionError(''); }, [entry?.id, isOpen]);

    // A to approve, R to reject (ignored while typing or with modifier keys).
    useEffect(() => {
        if (!isOpen || !entry) return undefined;
        const onKey = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
            const t = e.target;
            if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
            const key = e.key.toLowerCase();
            if (key === 'a' && !isApproved) { e.preventDefault(); handleApprove(); }
            if (key === 'r' && !isRejected) { e.preventDefault(); handleReject(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, entry, isApproved, isRejected, handleApprove, handleReject]);

    if (!isOpen || !entry) return null;

    const taskSubmission = entry.taskSubmission || {};
    const taskConfig = event?.guestlistTask || {};
    const hasFile = !!taskSubmission.fileUrl;
    const hasLink = !!taskSubmission.link;
    const hasText = !!taskSubmission.text;
    const email = entry.customerEmail || entry.email;
    const phone = entry.customerPhone || entry.phone;
    const guests = Number(entry.guestsCount) || 1;
    const submittedAt = formatDateTime(entry.createdAt);

    const handleCopyRef = async () => {
        if (!entry.bookingRef) return;
        try {
            await navigator.clipboard.writeText(entry.bookingRef);
            setCopiedRef(true);
            setTimeout(() => setCopiedRef(false), 2000);
            useStore.getState().addToast('Booking reference copied.', 'success');
        } catch {
            useStore.getState().addToast("Couldn't copy. Please copy it by hand.", 'error');
        }
    };

    // Detect file type for preview
    const fileUrl = taskSubmission.fileUrl || '';
    const fileName = taskSubmission.fileName || 'Submitted file';
    const fileType = taskSubmission.fileType || '';
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(fileUrl) || fileType.startsWith('image/');
    const isAudio = /\.(mp3|wav|ogg|m4a|aac)($|\?)/i.test(fileUrl) || fileType.startsWith('audio/');
    const isVideo = /\.(mp4|webm|mov)($|\?)/i.test(fileUrl) || fileType.startsWith('video/');
    const isPdf = /\.pdf($|\?)/i.test(fileUrl) || fileType.includes('pdf');
    const fileKind = isImage ? 'Image' : isAudio ? 'Audio' : isVideo ? 'Video' : isPdf ? 'PDF' : 'File';
    const KindIcon = isAudio ? Music : isVideo ? Film : isPdf ? FileText : FileIcon;

    const linkHref = hasLink ? withProtocol(taskSubmission.link) : '';
    const statusBadge = isApproved
        ? <Badge tone="green"><Check size={10} /> Approved</Badge>
        : isRejected
            ? <Badge tone="red"><X size={10} /> Declined</Badge>
            : <Badge tone="amber"><Clock size={10} /> To review</Badge>;

    const header = (
        <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
                {statusBadge}
                {entry.bookingRef && (
                    <button type="button" onClick={handleCopyRef} className="inline-flex items-center gap-1 font-mono text-[12px] text-gray-500 hover:text-gray-900 dark:hover:text-white" aria-label="Copy booking reference">
                        {entry.bookingRef} {copiedRef ? <Check size={12} className="text-emerald-600 dark:text-neon-green" /> : <Copy size={12} />}
                    </button>
                )}
            </div>
            <h2 className="mt-1 truncate text-lg font-extrabold tracking-tight">{name}</h2>
            <p className="mt-0.5 truncate text-[13px] text-gray-500">
                Guestlist task{event?.title ? ` for ${event.title}` : ''}
            </p>
        </div>
    );

    const footer = (
        <div className="space-y-2">
            {actionError && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{actionError}</p>}
            {isApproved ? (
                <div className="flex gap-2">
                    <div className={cn('flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[14px] font-bold', accent('green').chip)}>
                        <Check size={16} /> Approved
                    </div>
                    <Button variant="secondary" className="h-12 text-red-600 dark:text-red-400" onClick={handleReject} disabled={!!actionLoading}>
                        {actionLoading === 'rejected' ? 'Declining…' : confirmReject ? 'Tap again to decline' : 'Decline'}
                    </Button>
                </div>
            ) : (
                <div className="flex gap-2">
                    {!isRejected && (
                        <Button variant="secondary" className="h-12 flex-1 text-red-600 dark:text-red-400" onClick={handleReject} disabled={!!actionLoading}>
                            <X size={16} /> {actionLoading === 'rejected' ? 'Declining…' : confirmReject ? 'Tap again to decline' : 'Decline'}
                        </Button>
                    )}
                    <Button variant="success" className="h-12 flex-[2]" onClick={handleApprove} disabled={!!actionLoading}>
                        <Check size={16} /> {actionLoading === 'approved' ? 'Approving…' : isRejected ? 'Approve instead' : 'Approve'}
                    </Button>
                </div>
            )}
            <p className="hidden text-center text-[11px] text-gray-500 md:block">
                Shortcuts: {!isApproved && <><kbd className="rounded border border-black/15 px-1 font-mono dark:border-white/15">A</kbd> approve</>}
                {!isApproved && !isRejected && ', '}
                {!isRejected && <><kbd className="rounded border border-black/15 px-1 font-mono dark:border-white/15">R</kbd> decline</>}
                , <kbd className="rounded border border-black/15 px-1 font-mono dark:border-white/15">Esc</kbd> close
            </p>
        </div>
    );

    return (
        <Sheet
            open={isOpen}
            onClose={actionLoading ? () => {} : onClose}
            size="lg"
            header={header}
            footer={footer}
            bodyClassName="space-y-6"
        >
            {/* Who applied */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-gray-600 dark:text-zinc-400">
                {email && <a href={`mailto:${email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-gray-900 dark:hover:text-white"><Mail size={13} /><span className="truncate">{email}</span></a>}
                {phone && <a href={`tel:${String(phone).replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white"><Phone size={13} />{phone}</a>}
                <span className="inline-flex items-center gap-1.5"><Users size={13} />{guests} {guests > 1 ? 'people' : 'person'}</span>
                {submittedAt && <span className="inline-flex items-center gap-1.5"><Clock size={13} />{submittedAt}</span>}
            </div>

            {/* What the event asked for */}
            {(taskConfig.title || taskConfig.description) && (
                <div className={cn(box, 'p-4')}>
                    <p className="text-[12px] font-bold text-gray-500">The task</p>
                    <p className="mt-0.5 text-[14px] font-bold">{taskConfig.title || 'Application task'}</p>
                    {taskConfig.description && (
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-600 dark:text-zinc-400">{taskConfig.description}</p>
                    )}
                </div>
            )}

            {/* Uploaded file */}
            {hasFile && (
                <section>
                    <SectionLabel icon={KindIcon} action={(
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={smallLink}>
                            <ExternalLink size={14} /> Open
                        </a>
                    )}>
                        {fileKind} attached
                    </SectionLabel>

                    {isImage ? (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={cn(box, 'flex max-h-[55dvh] items-center justify-center overflow-hidden bg-black/5 dark:bg-black/40')}>
                            <img src={fileUrl} alt={fileName} className="max-h-[55dvh] w-auto object-contain" />
                        </a>
                    ) : isVideo ? (
                        <video controls playsInline preload="metadata" src={fileUrl} className="max-h-[55dvh] w-full rounded-2xl bg-black" />
                    ) : isAudio ? (
                        <div className={cn(box, 'space-y-3 p-4')}>
                            <p className="truncate text-[14px] font-semibold">{fileName}</p>
                            <audio controls src={fileUrl} className="w-full" />
                        </div>
                    ) : (
                        <div className={cn(box, 'overflow-hidden')}>
                            {isPdf && (
                                <iframe title={fileName} src={fileUrl} className="hidden h-[55dvh] w-full border-0 bg-white md:block" />
                            )}
                            <div className={cn('flex items-center gap-3 p-4', isPdf && 'md:border-t md:border-black/10 md:dark:border-white/10')}>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 text-gray-600 dark:bg-white/10 dark:text-zinc-300">
                                    <KindIcon size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-semibold">{fileName}</p>
                                    <p className="text-[12px] text-gray-500">{fileKind}</p>
                                </div>
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" download className={smallLink}>
                                    <Download size={14} /> Download
                                </a>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* Link */}
            {hasLink && (
                <section>
                    <SectionLabel icon={LinkIcon}>Link</SectionLabel>
                    <a href={linkHref} target="_blank" rel="noopener noreferrer" className={cn(box, 'flex items-center gap-3 p-4 transition-colors hover:border-black/20 dark:hover:border-white/20')}>
                        <div className="min-w-0 flex-1">
                            {hostOf(taskSubmission.link) && <p className="text-[12px] font-bold text-gray-500">{hostOf(taskSubmission.link)}</p>}
                            <p className={cn('break-all text-[14px] font-semibold', accent('blue').text)}>{taskSubmission.link}</p>
                        </div>
                        <ExternalLink size={16} className="shrink-0 text-gray-400" />
                    </a>
                </section>
            )}

            {/* Written answer */}
            {hasText && (
                <section>
                    <SectionLabel icon={FileText}>Written answer</SectionLabel>
                    <div className={cn(box, 'p-4')}>
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-800 dark:text-zinc-200">{taskSubmission.text}</p>
                    </div>
                </section>
            )}

            {!hasFile && !hasLink && !hasText && (
                <div className={cn('flex items-start gap-3 rounded-2xl border p-4', accent('amber').border, accent('amber').soft)}>
                    <AlertTriangle size={18} className={cn('mt-0.5 shrink-0', accent('amber').text)} />
                    <div>
                        <p className={cn('text-[14px] font-bold', accent('amber').text)}>Nothing was submitted</p>
                        <p className="text-[13px] text-gray-600 dark:text-zinc-300">This guest signed up without adding a file, link or answer.</p>
                    </div>
                </div>
            )}
        </Sheet>
    );
};

export default GuestlistTaskReviewModal;
