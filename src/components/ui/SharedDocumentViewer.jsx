import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { embedProposalNumberInPdf } from '../../lib/pdfStampUtils';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Printer from 'lucide-react/dist/esm/icons/printer';
import Download from 'lucide-react/dist/esm/icons/download';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Info from 'lucide-react/dist/esm/icons/info';
import PdfDocumentViewer from './PdfDocumentViewer';
import NewbiLogo from '../brand/NewbiLogo';
import DocumentShareModal from './DocumentShareModal';
import Sheet from '../admin/Sheet';
import { docTheme, StatusChip, fmtDate, fmtMoney, Row, DocButton } from './docviewer/DocKit';
import { invoiceState, invoiceBalance } from '../../lib/invoicing';
import { proposalState } from '../../lib/proposals';
import '../../lib/documentFonts';

// Safely render content that might be HTML (e.g. from rich text editor) or plain text
const decodeEntities = (s) => s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

const renderSafeContent = (rawText) => {
    if (!rawText) return null;
    if (typeof rawText !== 'string') return rawText;

    if (/<[a-z][\s\S]*>/i.test(rawText)) {
        try {
            const doc = new DOMParser().parseFromString(rawText, 'text/html');
            doc.querySelectorAll('script, iframe, object, embed, form, style').forEach(el => el.remove());
            doc.querySelectorAll('*').forEach(el => {
                [...el.attributes].forEach(a => { if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name); });
            });
            return (
                <div
                    className="leading-relaxed [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-4 [&_p:last-child]:mb-0 [&_p]:mb-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4"
                    dangerouslySetInnerHTML={{ __html: doc.body.innerHTML }}
                />
            );
        } catch {
            return <p className="whitespace-pre-line leading-relaxed">{decodeEntities(rawText.replace(/<[^>]+>/g, ' ')).trim()}</p>;
        }
    }
    return <p className="whitespace-pre-line leading-relaxed">{decodeEntities(rawText)}</p>;
};

const isPdfLike = (data) => Boolean(data.fileUrl) && (data.fileType === 'pdf' || data.fileUrl.toLowerCase().includes('.pdf') || data.fileUrl.includes('/raw/upload/'));

/* Where the document stands, in words the reader understands. */
const deriveState = (type, data, isAdmin) => {
    if (type === 'invoice') {
        const s = invoiceState(data);
        return {
            paid: { tone: 'green', label: 'Paid', done: true },
            verifying: { tone: 'amber', label: isAdmin ? 'Claimed paid' : 'Payment being verified', done: !isAdmin },
            overdue: { tone: 'red', label: 'Overdue' },
            partial: { tone: 'blue', label: 'Part paid' },
            unpaid: { tone: 'blue', label: isAdmin ? 'Unpaid' : 'Awaiting payment' },
        }[s];
    }
    if (type === 'agreement') {
        if (data.status === 'Executed') return { tone: 'green', label: 'Signed', done: true };
        if (data.status === 'Draft' && isAdmin) return { tone: 'gray', label: 'Draft' };
        return { tone: 'amber', label: 'Awaiting signature' };
    }
    const s = proposalState(data);
    return {
        accepted: { tone: 'green', label: 'Accepted', done: true },
        declined: { tone: 'red', label: 'Declined', done: true },
        expired: { tone: 'amber', label: 'Expired', done: true },
        viewed: { tone: 'blue', label: isAdmin ? 'Viewed' : 'Awaiting approval' },
        sent: { tone: 'blue', label: isAdmin ? 'Sent' : 'Awaiting approval' },
        draft: { tone: 'gray', label: isAdmin ? 'Draft' : 'Awaiting approval' },
    }[s];
};

const firstValue = (...values) => values.find(v => v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && isNaN(v)));

/*
 * The public page around an invoice, proposal or contract: a slim top bar,
 * the paper on a neutral stage, and a side panel (a sheet on phones) with the
 * summary and whatever the reader needs to do — pay, accept or sign.
 *
 * The page passes the rendered paper as children; this never restyles it.
 * onStageWidth(px) reports the room the paper has, so pages can fit it.
 */
export default function SharedDocumentViewer({
    documentData = {},
    type = 'proposal', // 'proposal', 'invoice', 'agreement'
    isAdmin,
    isExporting,
    onShare,
    onDownloadPDF,
    onPrint,
    onOpenAttachments,
    pdfBlobUrl: externalPdfBlobUrl,
    actionPanel,
    actionLabel,
    banner,
    summary = {},
    onStageWidth,
    children
}) {
    const theme = docTheme(type);
    const [internalPdfBlobUrl, setInternalPdfBlobUrl] = useState(null);
    const pdfBlobUrl = internalPdfBlobUrl || externalPdfBlobUrl || null;
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [pdfPagePreview, setPdfPagePreview] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const needsPdfProcessing = Boolean(documentData.isUploaded && isPdfLike(documentData));
    const [isLoadingPdf, setIsLoadingPdf] = useState(needsPdfProcessing);
    const stageRef = useRef(null);
    const stageCb = useRef(onStageWidth);
    stageCb.current = onStageWidth;
    // Pages set the paper to full size while exporting; don't fight them.
    const exportingRef = useRef(isExporting);
    exportingRef.current = isExporting;

    // Tell the page how wide the paper can be (the stage minus its padding).
    useLayoutEffect(() => {
        const el = stageRef.current;
        if (!el) return undefined;
        const report = () => {
            const cs = getComputedStyle(el);
            const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            if (w > 0 && !exportingRef.current) stageCb.current?.(w);
        };
        report();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null;
        ro?.observe(el);
        window.addEventListener('resize', report);
        return () => { ro?.disconnect(); window.removeEventListener('resize', report); };
    }, [isExporting]);

    // Uploaded PDFs: fetch once, stamp proposal numbers and signatures, serve as a blob.
    useEffect(() => {
        let isMounted = true;
        let createdUrl = null;
        if (!documentData.fileUrl || !isPdfLike(documentData)) {
            setIsLoadingPdf(false);
            return undefined;
        }

        (async () => {
            try {
                setIsLoadingPdf(true);
                const response = await fetch(documentData.fileUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                let finalBytes = arrayBuffer;

                if (type === 'proposal' && documentData.proposalNumber) {
                    try {
                        finalBytes = await embedProposalNumberInPdf(arrayBuffer, documentData.proposalNumber, {
                            clientSignature: documentData.clientSignature || documentData.approvalMetadata?.clientSignature,
                            ourSignature: documentData.ourSignature || documentData.providerSignature,
                            clientName: documentData.clientName,
                            senderName: documentData.senderName || 'Newbi Entertainment & Marketing LLP',
                            signedBy: documentData.approvalMetadata?.signedBy || documentData.clientName,
                            signedAt: documentData.approvalMetadata?.signedAt,
                            ip: documentData.approvalMetadata?.ip,
                            isAccepted: documentData.status === 'Accepted'
                        });
                    } catch (stampErr) {
                        console.warn('Could not embed proposal number into PDF:', stampErr);
                    }
                }

                createdUrl = URL.createObjectURL(new Blob([finalBytes], { type: 'application/pdf' }));
                if (isMounted) {
                    setInternalPdfBlobUrl(createdUrl);
                    setIsLoadingPdf(false);
                } else {
                    URL.revokeObjectURL(createdUrl);
                }
            } catch (err) {
                console.error('Error creating PDF blob:', err);
                if (isMounted) {
                    setIsLoadingPdf(false);
                    setInternalPdfBlobUrl(null);
                }
            }
        })();

        return () => {
            isMounted = false;
            if (createdUrl) URL.revokeObjectURL(createdUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        documentData.fileUrl,
        documentData.clientSignature,
        documentData.ourSignature,
        documentData.status,
        documentData.approvalMetadata?.signedAt,
        documentData.approvalMetadata?.clientSignature,
        documentData.approvalMetadata?.signedBy
    ]);

    const rawTitle = type === 'invoice'
        ? `Invoice for ${documentData.clientName || 'client'}`
        : type === 'agreement'
            ? (documentData.title || documentData.agreementTitle || 'Service agreement')
            : (documentData.campaignName || documentData.proposalName || 'Proposal');
    const title = rawTitle.replace(/pre[- ]?made\s*(?:proposal|contract|agreement|document)?/gi, 'Proposal').trim() || theme.label;
    const docNumber = type === 'invoice' ? documentData.invoiceNumber : type === 'agreement' ? documentData.agreementNumber : (documentData.proposalNumber || documentData.id);
    const backLink = `/admin/${type}s`;
    const state = deriveState(type, documentData, isAdmin) || { tone: 'gray', label: documentData.status || 'Draft' };
    const hasAction = Boolean(actionPanel);
    const awaitingAction = hasAction && !state.done;

    const amount = firstValue(
        summary.amount,
        type === 'invoice' ? invoiceBalance(documentData) : undefined,
        documentData.dealValue, documentData.totalOverride, documentData.amount,
        documentData.commercials?.totalValue, documentData.subtotal
    );
    const amountLabel = summary.amountLabel || (type === 'invoice'
        ? (state.done ? 'Amount' : 'Amount due')
        : type === 'agreement' ? 'Contract value' : 'Quoted total');

    const issued = firstValue(documentData.invoiceDate, documentData.effectiveDate, documentData.date, documentData.createdAt);
    const rows = summary.rows || [
        docNumber && { label: type === 'invoice' ? 'Invoice no.' : type === 'agreement' ? 'Contract no.' : 'Proposal no.', value: docNumber, mono: true },
        issued && { label: type === 'agreement' ? 'Effective' : 'Issued', value: fmtDate(issued) },
        type === 'invoice' && documentData.dueDate && { label: 'Due', value: fmtDate(documentData.dueDate) },
        type === 'proposal' && documentData.validUntil && { label: 'Valid until', value: fmtDate(documentData.validUntil) },
    ].filter(Boolean);

    const fromName = documentData.senderName || documentData.parties?.firstParty?.name || 'Newbi Entertainment & Marketing LLP';
    const fromEmail = documentData.senderEmail || documentData.parties?.firstParty?.email;
    const toName = documentData.clientName || documentData.parties?.secondParty?.name || 'Client';
    const toEmail = documentData.clientEmail || documentData.parties?.secondParty?.email;
    const note = documentData.coverDescription || documentData.note;
    const attachmentCount = Array.isArray(documentData.attachments) ? documentData.attachments.length : 0;

    const effectivePdfUrl = pdfBlobUrl || documentData.fileUrl;

    const downloadFile = (href) => {
        const a = document.createElement('a');
        a.href = href;
        a.download = documentData.fileName || `${documentData.clientName || 'Document'}.pdf`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleDownloadPDF = () => {
        if (onDownloadPDF) onDownloadPDF(pdfBlobUrl);
        else if (documentData.isUploaded) downloadFile(pdfBlobUrl || documentData.fileUrl);
        else window.print();
    };

    const handlePrint = () => {
        if (onPrint) onPrint();
        else if (documentData.isUploaded && effectivePdfUrl) window.open(effectivePdfUrl, '_blank');
        else window.print();
    };

    const openShare = () => {
        setDetailsOpen(false);
        setIsShareModalOpen(true);
        onShare?.();
    };

    const panelBody = (
        <div className="flex flex-col gap-4">
            {/* What it is and where it stands */}
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <StatusChip tone={state.tone} pulse={!state.done}>{state.label}</StatusChip>
                    {isAdmin && <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[11.5px] font-semibold text-gray-600 dark:bg-white/[0.07] dark:text-zinc-300">Admin view</span>}
                </div>
                <h1 className="mt-3 font-heading text-[22px] font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">{title}</h1>
                {amount !== undefined && Number(amount) > 0 && (
                    <div className="mt-3">
                        <p className="text-[12.5px] font-medium text-gray-500 dark:text-zinc-400">{amountLabel}</p>
                        <p className={cn('font-heading text-[34px] font-extrabold leading-none tracking-tight tabular-nums', theme.text)}>{fmtMoney(amount)}</p>
                    </div>
                )}
            </div>

            {actionPanel && <div className="flex flex-col gap-3">{actionPanel}</div>}

            <section className="rounded-2xl border border-black/[0.07] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <dl className="space-y-2 text-[13px]">
                    {rows.map(r => <Row key={r.label} label={r.label} value={r.value} mono={r.mono} strong={r.strong} />)}
                </dl>
                <div className="my-3.5 h-px bg-black/[0.06] dark:bg-white/[0.07]" />
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                    <div className="min-w-0">
                        <p className="text-[12px] text-gray-500 dark:text-zinc-400">From</p>
                        <p className="mt-0.5 truncate font-semibold text-gray-900 dark:text-white">{fromName}</p>
                        {fromEmail && <p className="truncate text-[12px] text-gray-500 dark:text-zinc-400">{fromEmail}</p>}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[12px] text-gray-500 dark:text-zinc-400">To</p>
                        <p className="mt-0.5 truncate font-semibold text-gray-900 dark:text-white">{toName}</p>
                        {toEmail && <p className="truncate text-[12px] text-gray-500 dark:text-zinc-400">{toEmail}</p>}
                    </div>
                </div>
            </section>

            {note && (
                <section className="rounded-2xl border border-black/[0.07] bg-white p-4 text-[13.5px] text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300">
                    <p className={cn('mb-1.5 text-[12px] font-semibold', theme.text)}>{type === 'invoice' ? 'Note' : type === 'agreement' ? 'Purpose' : 'From the team'}</p>
                    {renderSafeContent(note)}
                </section>
            )}

            {attachmentCount > 0 && onOpenAttachments && (
                <button type="button" onClick={() => { setDetailsOpen(false); onOpenAttachments(); }}
                    className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-black/[0.07] bg-white px-4 text-left transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', theme.soft, theme.text)}><Paperclip size={16} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-gray-900 dark:text-white">Attachments</span>
                        <span className="block text-[12px] text-gray-500 dark:text-zinc-400">{attachmentCount} {attachmentCount === 1 ? 'file' : 'files'}</span>
                    </span>
                    <ChevronRight size={16} className="text-gray-400" />
                </button>
            )}

            <div className="grid grid-cols-2 gap-2">
                <DocButton variant="dark" onClick={handleDownloadPDF} busy={isExporting}>
                    {!isExporting && <Download size={16} />} {isExporting ? 'Preparing…' : 'Download PDF'}
                </DocButton>
                <DocButton variant="secondary" onClick={handlePrint}><Printer size={16} /> Print</DocButton>
            </div>

            <p className="flex items-start gap-2 px-1 pb-1 text-[12px] leading-snug text-gray-500 dark:text-zinc-500">
                <ShieldCheck size={14} className="mt-px shrink-0" />
                Shared securely by Newbi. Opening, signing and payment claims are recorded with the time and device.
            </p>
        </div>
    );

    return (
        <div className={cn('min-h-dvh bg-[#eef0f3] font-sans text-gray-900 dark:bg-[#07080b] dark:text-gray-100', theme.selection)}>
            <style dangerouslySetInnerHTML={{ __html: `
                body { font-family: 'Outfit', sans-serif; }
                .font-signature { font-family: 'Caveat', cursive; }
                .font-formal { font-family: 'Crimson Pro', serif; }
                /* Room for the phone action bar, so the PDF pager and page end clear it. */
                .doc-viewer-root { --doc-dock: 0px; }
                @media (max-width: 1023px) { .doc-viewer-root { --doc-dock: calc(4.5rem + env(safe-area-inset-bottom)); } }
                @media print {
                    .fixed-header-nav, .print-hidden { display: none !important; }
                    body, .doc-viewer-root { background: white !important; }
                    .doc-stage { padding: 0 !important; }
                    .proposal-page-render, .invoice-page-render, .agreement-page-render {
                        margin: 0 !important;
                        box-shadow: none !important;
                        page-break-after: always !important;
                    }
                }
            `}} />

            <div className="doc-viewer-root">
                {/* Top bar: same colour as the page so Safari's bars blend into it. */}
                {!isExporting && (
                    <header className="print-hidden sticky top-0 z-40 border-b border-black/[0.06] bg-[#eef0f3]/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.06] dark:bg-[#07080b]/85">
                        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-3 sm:px-5 lg:h-16">
                            {isAdmin ? (
                                <Link to={backLink} className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl pl-2 pr-3 text-[13px] font-semibold text-gray-600 hover:bg-black/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.07]">
                                    <ArrowLeft size={17} /> <span className="hidden sm:inline">Admin</span>
                                </Link>
                            ) : (
                                <Link to="/" className="flex h-10 shrink-0 items-center rounded-xl px-1.5" aria-label="Newbi home">
                                    <NewbiLogo className="h-8 w-auto" />
                                </Link>
                            )}

                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                <span className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex', theme.soft, theme.text)}>
                                    <FileText size={17} />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-[14px] font-bold leading-tight text-gray-900 dark:text-white sm:text-[15px]">{title}</p>
                                    <p className="truncate text-[12px] leading-tight text-gray-500 dark:text-zinc-400">
                                        {theme.label}{docNumber ? ` · ${docNumber}` : ''}
                                    </p>
                                </div>
                                <StatusChip tone={state.tone} className="ml-1 hidden md:inline-flex">{state.label}</StatusChip>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                                <button type="button" onClick={handlePrint} title="Print" aria-label="Print"
                                    className="hidden h-10 w-10 items-center justify-center rounded-xl text-gray-600 hover:bg-black/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.07] md:flex">
                                    <Printer size={18} />
                                </button>
                                <button type="button" onClick={handleDownloadPDF} disabled={isExporting} title="Download PDF" aria-label="Download PDF"
                                    className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 hover:bg-black/[0.05] disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/[0.07]">
                                    <Download size={18} />
                                </button>
                                <button type="button" onClick={openShare}
                                    className="flex h-10 items-center gap-2 rounded-xl px-2.5 text-[13px] font-semibold text-gray-700 hover:bg-black/[0.05] dark:text-zinc-200 dark:hover:bg-white/[0.07] sm:border sm:border-black/10 sm:bg-white sm:px-3.5 sm:dark:border-white/10 sm:dark:bg-white/[0.04]">
                                    <Share2 size={17} /> <span className="hidden sm:inline">Share</span>
                                </button>
                            </div>
                        </div>
                    </header>
                )}

                {!isExporting && banner && <div className="print-hidden">{banner}</div>}

                <div className="mx-auto flex max-w-[1440px] items-start">
                    {/* The paper */}
                    <main
                        ref={stageRef}
                        className={cn('doc-stage min-w-0 flex-1 overflow-x-clip',
                            isExporting ? 'p-0' : 'px-3 pb-[calc(var(--doc-dock)+2rem)] pt-4 sm:px-6 sm:pt-8 lg:px-10 lg:pb-16')}
                    >
                        <div className="flex w-full flex-col items-center">
                            {documentData.isUploaded && (documentData.fileUrl || pdfBlobUrl) ? (
                                isLoadingPdf ? (
                                    <div className="flex min-h-[60dvh] w-full flex-col items-center justify-center gap-3">
                                        <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', theme.soft)}>
                                            <RefreshCw size={22} className={cn('animate-spin', theme.text)} />
                                        </span>
                                        <p className="text-[13px] font-medium text-gray-500 dark:text-zinc-400">Opening the document…</p>
                                    </div>
                                ) : (
                                    (documentData.fileType === 'pdf' ||
                                        documentData.fileName?.toLowerCase().endsWith('.pdf') ||
                                        (effectivePdfUrl && (effectivePdfUrl.startsWith('blob:') || effectivePdfUrl.toLowerCase().includes('.pdf') || effectivePdfUrl.includes('/raw/upload/') || effectivePdfUrl.includes('application/pdf')))
                                    ) ? (
                                        <PdfDocumentViewer
                                            pdfUrl={effectivePdfUrl}
                                            documentData={documentData}
                                            theme={theme}
                                            onFirstPageRendered={setPdfPagePreview}
                                            onDownload={() => (onDownloadPDF ? onDownloadPDF(pdfBlobUrl) : downloadFile(effectivePdfUrl))}
                                            onPrint={() => window.open(effectivePdfUrl, '_blank')}
                                        />
                                    ) : (
                                        <div className="proposal-page-render w-[794px] max-w-full overflow-hidden rounded-[2px] bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
                                            <img src={documentData.fileUrl} alt={documentData.fileName || 'Uploaded document'} className="h-auto w-full object-contain" />
                                        </div>
                                    )
                                )
                            ) : (
                                children
                            )}
                        </div>
                    </main>

                    {/* Desktop side panel */}
                    {!isExporting && (
                        <aside className="print-hidden sticky top-16 hidden h-[calc(100dvh-4rem)] w-[400px] shrink-0 overflow-y-auto overscroll-contain border-l border-black/[0.06] px-6 py-8 dark:border-white/[0.06] lg:block">
                            {panelBody}
                        </aside>
                    )}
                </div>

                {/* Phone action bar */}
                {!isExporting && (
                    <div className="print-hidden fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-[#eef0f3]/90 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.06] dark:bg-[#07080b]/90 lg:hidden">
                        <div className="mx-auto flex max-w-xl items-center gap-2">
                            <DocButton variant="secondary" onClick={() => setDetailsOpen(true)} className={awaitingAction ? 'w-12 shrink-0 px-0' : 'flex-1'} aria-label="Details">
                                <Info size={17} /> {!awaitingAction && 'Details'}
                            </DocButton>
                            {awaitingAction ? (
                                <DocButton theme={theme} onClick={() => setDetailsOpen(true)} className="flex-1">
                                    {actionLabel || 'Review'} <ChevronRight size={16} />
                                </DocButton>
                            ) : (
                                <DocButton variant="dark" onClick={handleDownloadPDF} busy={isExporting} className="flex-1">
                                    <Download size={16} /> Download PDF
                                </DocButton>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Sheet open={detailsOpen} onClose={() => setDetailsOpen(false)} title={theme.label + (docNumber ? ` ${docNumber}` : '')} bodyClassName="bg-[#f6f7f9] dark:bg-[#0b0c10]">
                {panelBody}
            </Sheet>

            <DocumentShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                documentData={documentData}
                type={type}
                pdfPagePreview={pdfPagePreview}
                theme={theme}
            />
        </div>
    );
}
