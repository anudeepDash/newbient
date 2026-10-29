import React, { useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Download from 'lucide-react/dist/esm/icons/download';
import Printer from 'lucide-react/dist/esm/icons/printer';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Settings from 'lucide-react/dist/esm/icons/settings';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import SharedDocumentViewer from '../components/ui/SharedDocumentViewer';
import Sheet from '../components/admin/Sheet';
import { PanelCard, DocButton, docTheme, fmtDate, fmtMoney } from '../components/ui/docviewer/DocKit';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../lib/store';
import useSharedDoc from '../hooks/useSharedDoc';
import { sharedDocPost } from '../lib/passesApi';
import { loadRazorpay } from '../lib/razorpayCheckout';
import { safeLocalStorage } from '../lib/storage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import NotificationBell from '../components/NotificationBell';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { getDocumentShareMeta } from '../lib/documentPreviewUtils';
import { invoiceReceived, invoiceAmounts, daysOverdue } from '../lib/invoicing';
import { InvoicePage, paginateInvoice, paperDataFrom } from '../components/admin/invoices/builder/InvoicePaper';


const Invoice = () => {
    const { id } = useParams();
    const { updateInvoiceStatus, user } = useStore();
    // Read by id only: rules don't let visitors list invoices.
    const { data: liveInvoice, loading: docLoading } = useSharedDoc('invoices', id);
    const [localInvoice, setLocalInvoice] = React.useState(null);
    React.useEffect(() => { setLocalInvoice(liveInvoice); }, [liveInvoice]);

    const invoice = localInvoice || liveInvoice;
    const loading = docLoading;
    const isAdmin = ['super_admin', 'developer', 'founder'].includes(user?.role);
    const location = useLocation();
    const invoiceRef = useRef(null);
    const printFrameRef = useRef(null);
    const loggedVisitRef = useRef(null);
    const [scale, setScale] = React.useState(1);
    const [isExporting, setIsExporting] = React.useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = React.useState('');
    const [paying, setPaying] = React.useState(false);
    const [payError, setPayError] = React.useState('');
    const [showAttachments, setShowAttachments] = React.useState(false);
    const [confirmPaid, setConfirmPaid] = React.useState(false);
    const [markingPaid, setMarkingPaid] = React.useState(false);

    React.useEffect(() => {
        if (invoice?.pdfUrl) {
            if (invoice.pdfUrl.startsWith('data:application/pdf;base64,')) {
                try {
                    const base64Parts = invoice.pdfUrl.split(',');
                    const base64Data = base64Parts[1];
                    const binaryStr = atob(base64Data);
                    const len = binaryStr.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: 'application/pdf' });
                    const blobUrl = URL.createObjectURL(blob);
                    setPdfBlobUrl(blobUrl);
                    return () => {
                        URL.revokeObjectURL(blobUrl);
                    };
                } catch (err) {
                    console.error("Error parsing base64 PDF URL:", err);
                    setPdfBlobUrl(invoice.pdfUrl);
                }
            } else {
                setPdfBlobUrl(invoice.pdfUrl);
            }
        } else {
            setPdfBlobUrl('');
        }
    }, [invoice?.pdfUrl]);




    // The viewer reports how wide the paper can be; fit the A4 pages to it.
    const fitToStage = React.useCallback((w) => setScale(Math.min(1, w / 794)), []);


    React.useEffect(() => {
        if (!invoice || isAdmin) return;
        // Log once per visit; live snapshot updates must not trigger more writes.
        const visitKey = `${id}${location.search}`;
        if (loggedVisitRef.current === visitKey) return;
        loggedVisitRef.current = visitKey;

        const logVisit = async () => {
            const searchParams = new URLSearchParams(location.search);
            const via = searchParams.get('via');
            const email = searchParams.get('email');
            const name = searchParams.get('name');

            const cacheKey = `last_viewed_invoice_${id}`;
            const lastViewed = safeLocalStorage.getItem(cacheKey);
            const tenMins = 10 * 60 * 1000;

            if (!lastViewed || (new Date() - new Date(lastViewed) > tenMins) || via === 'email') {
                // The server records the visit (IP, time) and lastOpened.
                const res = await useStore.getState().logDocumentAccess('invoice', id, { via, shareEmail: email, shareName: name });
                if (res?.ok) safeLocalStorage.setItem(cacheKey, new Date().toISOString());
            }
        };

        logVisit();
    }, [id, isAdmin, invoice, location.search]);

    const isQuickUpload = invoice?.pdfUrl && (!invoice.items || invoice.items.length === 0);

    // Derived display data
    const displayInvoice = invoice || {
        id: "DEMO-INV-001",
        invoiceNumber: "DEMO-001",
        clientName: "Demo Client (No Data)",
        amount: 0,
        status: "Demo Mode",
        advancePaid: 0,
        items: [],
        customColumns: []
    };

    const invoiceShareMeta = getDocumentShareMeta(displayInvoice, 'invoice');
    useDynamicMeta({
        title: invoiceShareMeta.title,
        description: invoiceShareMeta.description,
        image: invoiceShareMeta.previewImage,
        url: typeof window !== 'undefined' ? window.location.href : undefined
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-900 dark:text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-blue"></div>
            </div>
        );
    }

    // A deleted or mistyped link used to render a fake "demo" invoice.
    if (!invoice) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-6 text-center dark:bg-black">
                <div className="max-w-sm space-y-3">
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Invoice not found</h1>
                    <p className="text-sm text-gray-500">This link may be wrong, or the invoice was withdrawn. Please ask the sender for a new link.</p>
                    <Link to="/" className="inline-block rounded-xl bg-gray-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white dark:bg-white dark:text-black">Go to Newbi</Link>
                </div>
            </div>
        );
    }

    const handleDownloadPDF = async () => {
        if (isQuickUpload) {
            const link = document.createElement('a');
            link.href = pdfBlobUrl || displayInvoice.pdfUrl || displayInvoice.fileUrl;
            link.download = `Invoice-${displayInvoice.invoiceNumber || displayInvoice.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        const originalScale = scale;
        setScale(1);
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            const pageElements = document.querySelectorAll('.invoice-page-render');
            
            if (!pageElements.length) {
                useStore.getState().addToast('Try downloading again in a moment.', 'warning', { title: 'The invoice is still loading' });
                return;
            }

            for (let i = 0; i < pageElements.length; i++) {
                const canvas = await html2canvas(pageElements[i], {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    width: 794,
                    height: 1123,
                    windowWidth: 794,
                    windowHeight: 1123,
                    scrollX: 0,
                    scrollY: 0,
                    onclone: (clonedDoc) => { clonedDoc.documentElement.classList.remove('dark');
                        const clonedPage = clonedDoc.querySelectorAll('.invoice-page-render')[i];
                        if (clonedPage) {
                            clonedPage.style.transform = 'none';
                            clonedPage.style.boxShadow = 'none';
                        }
                    }
                });
                
                if (!canvas) {
                    throw new Error(`Failed to capture page ${i + 1}`);
                }

                const imgData = canvas.toDataURL('image/png', 1.0);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
            }
            
            pdf.save(`Invoice-${displayInvoice.invoiceNumber || displayInvoice.id}.pdf`);
        } catch (error) {
            console.error("PDF generation failed:", error);
            useStore.getState().addToast('Please try again.', 'error', { title: "Couldn't create the PDF", action: { label: 'Try again', onClick: () => handleDownloadPDF() } });
        } finally {
            setScale(originalScale);
            setIsExporting(false);
        }
    };

    const handlePrint = async () => {
        const frame = printFrameRef.current;
        if (!frame) return;

        try {
            const displayInvoice = invoice || {};
            const isQuickUpload = !!displayInvoice.pdfUrl && (!displayInvoice.items || displayInvoice.items.length === 0);
            let printUrl = pdfBlobUrl || displayInvoice.pdfUrl || displayInvoice.fileUrl;

            // For generated invoices, generate a PDF blob first
            if (!isQuickUpload) {
                const originalScale = scale;
                setScale(1);
                setIsExporting(true);
                await new Promise(resolve => setTimeout(resolve, 1500));

                try {
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pageElements = document.querySelectorAll('.invoice-page-render');
                    
                    for (let i = 0; i < pageElements.length; i++) {
                        const canvas = await html2canvas(pageElements[i], {
                            scale: 2,
                            useCORS: true,
                            logging: false,
                            backgroundColor: '#ffffff',
                            width: 794,
                            height: 1123,
                            windowWidth: 794,
                            windowHeight: 1123,
                            scrollX: 0,
                            scrollY: 0,
                            onclone: (clonedDoc) => { clonedDoc.documentElement.classList.remove('dark');
                                const style = clonedDoc.createElement('style');
                                style.innerHTML = `
                                    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                                    .invoice-page-render { 
                                        position: absolute !important; 
                                        top: 0 !important; 
                                        left: 0 !important; 
                                        margin: 0 !important; 
                                        transform: none !important;
                                        box-shadow: none !important;
                                        text-rendering: optimizeLegibility !important;
                                        -webkit-font-smoothing: antialiased !important;
                                    }
                                `;
                                clonedDoc.head.appendChild(style);
                                
                                clonedDoc.body.style.margin = '0';
                                clonedDoc.body.style.padding = '0';
                                clonedDoc.body.style.overflow = 'hidden';
                            }
                        });
                        
                        const imgData = canvas.toDataURL('image/jpeg', 0.95);
                        if (i > 0) pdf.addPage();
                        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, '', 'FAST');
                    }

                    const blob = pdf.output('blob');
                    printUrl = URL.createObjectURL(blob);
                } finally {
                    setScale(originalScale);
                    setIsExporting(false);
                }
            }

            // Load into iframe and print
            frame.src = printUrl;
            frame.onload = () => {
                setTimeout(() => {
                    try {
                        frame.contentWindow.focus();
                        frame.contentWindow.print();
                        if (!isQuickUpload && printUrl && printUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(printUrl);
                        }
                    } catch (e) {
                        console.error("Iframe print error:", e);
                        window.open(printUrl, '_blank');
                    }
                }, 500);
            };
        } catch (error) {
            console.error("Print failed:", error);
            useStore.getState().addToast('Please try again.', 'error', { title: "Couldn't open the print view", action: { label: 'Try again', onClick: () => handlePrint() } });
        }
    };

    const handleMarkPaid = () => setConfirmPaid(true);
    const confirmMarkPaid = async () => {
        setMarkingPaid(true);
        try {
            await updateInvoiceStatus(invoice.id, 'Paid');
            setLocalInvoice(prev => (prev ? { ...prev, status: 'Paid', paidAt: new Date().toISOString() } : prev));
            useStore.getState().addToast?.('Invoice marked as paid.', 'success');
            setConfirmPaid(false);
        } catch (err) {
            console.error('Mark paid failed:', err);
            useStore.getState().addToast?.('Check your connection and try again.', 'error', { title: 'Invoice not marked as paid', action: { label: 'Try again', onClick: () => confirmMarkPaid() } });
        } finally {
            setMarkingPaid(false);
        }
    };

    // Razorpay is the only way to pay. The server works out the amount, checks Razorpay's
    // signature and marks the invoice paid (Razorpay's webhook is the backstop).
    const handlePayOnline = async () => {
        setPaying(true);
        setPayError('');
        try {
            const [Razorpay, started] = await Promise.all([loadRazorpay().catch(() => null), sharedDocPost('razorpay-start', { id })]);
            if (!started.ok) { setPayError(started.error || 'Online payment isn’t working right now. Please try again in a moment.'); return; }
            if (!Razorpay) { setPayError('The payment window didn’t load. Check your connection and try again.'); return; }
            const s = started.data;
            await new Promise((resolve) => {
                const rzp = new Razorpay({
                    key: s.keyId,
                    order_id: s.gatewayOrderId,
                    amount: s.amount,
                    currency: s.currency,
                    name: s.name,
                    description: s.description,
                    prefill: s.prefill,
                    theme: { color: '#00A3CC' },
                    handler: async (resp) => {
                        const conf = await sharedDocPost('razorpay-confirm', { id, ...resp }, { timeoutMs: 25000 });
                        if (conf.ok) {
                            setLocalInvoice(prev => (prev ? (conf.data.paid ? { ...prev, status: 'Paid', paidAt: new Date().toISOString() } : prev) : prev));
                            if (!conf.data.paid) setPayError('Payment received. A balance is still due on this invoice.');
                        } else {
                            setPayError(conf.error || 'Payment received, but we couldn’t confirm it yet. It will show here shortly; no need to pay again.');
                        }
                        resolve();
                    },
                    modal: { ondismiss: () => resolve() },
                });
                rzp.on('payment.failed', (e) => setPayError(e?.error?.description || 'The payment didn’t go through. Please try again.'));
                rzp.open();
            });
        } finally {
            setPaying(false);
        }
    };

    const handleShareWhatsApp = () => {
        const text = `Here is your invoice from Newbi Entertainment & Marketing LLP: ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareEmail = () => {
        const subject = `Invoice #${displayInvoice.invoiceNumber || displayInvoice.id} from Newbi Entertainment & Marketing LLP`;
        const body = `Hi,\n\nPlease find your invoice here: ${window.location.href}\n\nThanks,\nNewbi Entertainment & Marketing LLP`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };




    const items = displayInvoice.items || [];
    // Same maths as the invoice builder (GST rounded to paise).
    const { subtotal, gstAmount, total: computedTotal } = invoiceAmounts(displayInvoice);
    const totalAmount = isQuickUpload ? (displayInvoice.amount || 0) : computedTotal;
    const advancePaid = Number(displayInvoice.advancePaid) || 0;
    // Part-payments recorded by the team since the invoice was issued.
    const paymentsReceived = displayInvoice.status === 'Paid' ? 0 : invoiceReceived(displayInvoice);
    // Rounded to paise.
    const toBePaid = Math.max(0, Math.round((totalAmount - (displayInvoice.showAdvance ? advancePaid : 0) - paymentsReceived) * 100) / 100);

    // The same pages, split the same way, as the invoice builder and its PDF.
    const paperData = paperDataFrom(displayInvoice);
    const paperPages = paginateInvoice(items, paperData);


    const isPaid = displayInvoice.status === 'Paid';
    const isVerifying = !isPaid && (displayInvoice.status === 'Verification Pending' || displayInvoice.paymentClaim?.status === 'pending');
    const overdueBy = daysOverdue(displayInvoice);
    const dueLine = displayInvoice.dueDate
        ? (overdueBy > 0 ? `Overdue by ${overdueBy} ${overdueBy === 1 ? 'day' : 'days'}` : `Due ${fmtDate(displayInvoice.dueDate)}`)
        : 'Due on receipt';

    let payPanel = null;
    if (isPaid) {
        payPanel = (
            <PanelCard theme={docTheme('invoice')} icon={CheckCircle2} title="Paid — thank you"
                subtitle={displayInvoice.paidAt ? `Settled on ${fmtDate(displayInvoice.paidAt)}.` : 'This invoice is settled.'} />
        );
    } else if (isVerifying && !isAdmin) {
        payPanel = (
            <PanelCard theme={docTheme('invoice')} icon={Clock} title="We’re checking your payment"
                subtitle="We’ll email you once it’s confirmed." />
        );
    } else if (!isAdmin) {
        payPanel = (
            <PanelCard theme={docTheme('invoice')} icon={Wallet} title="Pay this invoice" subtitle={dueLine}>
                <div className="space-y-2.5">
                    <button type="button" onClick={handlePayOnline} disabled={paying || toBePaid <= 0}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00D1FF] text-[15px] font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-60">
                        <CreditCard size={16} /> {paying ? 'Opening payment…' : `Pay ${fmtMoney(toBePaid)}`}
                    </button>
                    {payError && <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">{payError}</p>}
                    <p className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-zinc-400"><ShieldCheck size={13} /> UPI, cards and netbanking through Razorpay. Payment details never reach Newbi.</p>
                </div>
            </PanelCard>
        );
    } else {
        payPanel = (
            <PanelCard theme={docTheme('invoice')} icon={Wallet} title={isVerifying ? 'Client says they’ve paid' : 'Payment'} subtitle={isVerifying ? 'Check the claim in Invoices before confirming.' : `${dueLine}. Clients pay online through Razorpay.`}>
                <div className="grid gap-2">
                    {isVerifying && <Link to="/admin/invoices" className="flex h-11 items-center justify-center rounded-xl border border-black/10 text-[14px] font-semibold text-gray-800 dark:border-white/10 dark:text-zinc-100">Review the claim</Link>}
                    <DocButton theme={docTheme('invoice')} onClick={handleMarkPaid}><CheckCircle2 size={16} /> Mark as paid</DocButton>
                </div>
            </PanelCard>
        );
    }

    // Files and links attached in the invoice builder. One opens directly; several are listed in the side panel.
    const attachments = (Array.isArray(displayInvoice.attachments) ? displayInvoice.attachments : []).filter(att => att?.url);
    const openAttachments = attachments.length === 1
        ? () => window.open(attachments[0].url, '_blank', 'noopener')
        : () => setShowAttachments(v => !v);
    const attachmentsPanel = showAttachments && attachments.length > 1 ? (
        <PanelCard theme={docTheme('invoice')} icon={Paperclip} title="Attachments">
            <div className="-mx-1.5">
                {attachments.map((att, idx) => (
                    <a key={att.id || idx} href={att.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-1.5 text-[14px] font-semibold text-gray-800 hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.05]">
                        <span className="truncate">{att.name || `Attachment ${idx + 1}`}</span>
                        <ExternalLink size={14} className="shrink-0 text-gray-400" />
                    </a>
                ))}
            </div>
        </PanelCard>
    ) : null;

    // Adapt displayInvoice to be compatible with SharedDocumentViewer
    const viewerData = {
        ...displayInvoice,
        isUploaded: isQuickUpload,
        fileUrl: displayInvoice.pdfUrl || displayInvoice.fileUrl
    };

    return (
        <>
            <SharedDocumentViewer
                documentData={viewerData}
                type="invoice"
                isAdmin={isAdmin}
                isExporting={isExporting}
                onDownloadPDF={handleDownloadPDF}
                onPrint={handlePrint}
                pdfBlobUrl={pdfBlobUrl}
                actionPanel={<>{payPanel}{attachmentsPanel}</>}
                actionLabel={isAdmin ? 'Mark as paid' : `Pay ${fmtMoney(toBePaid)}`}
                summary={{ amount: isPaid ? totalAmount : toBePaid }}
                onStageWidth={fitToStage}
                onOpenAttachments={attachments.length ? openAttachments : null}
            >
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        .fixed-header-nav, .print-hidden { display: none !important; }
                        body { background: white !important; }
                        .invoice-page-render { 
                            margin: 0 !important; 
                            box-shadow: none !important;
                            page-break-after: always !important;
                        }
                        main { padding: 0 !important; margin: 0 !important; }
                    }
                `}} />
                
                {/* Hidden Iframe for Printing */}
                <iframe ref={printFrameRef} className="fixed -top-[1000px] left-0 pointer-events-none w-0 h-0" title="print-frame" />

                {!isQuickUpload && (
                    <div className="w-full flex flex-col items-center relative z-10">
                        <div className="w-full flex flex-col items-center gap-4 sm:gap-8 relative z-10">
                    {paperPages.map((pageItems, pageIdx) => (
                        <div key={pageIdx} style={{ width: 794 * scale, height: 1123 * scale }} className="relative shrink-0 overflow-hidden rounded-xl shadow-2xl">
                            <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
                                <InvoicePage forCapture data={paperData} columns={paperData.customColumns || []} pageItems={pageItems} pageIndex={pageIdx} pageCount={paperPages.length}
                                    amounts={{ subtotal, gstAmount, total: totalAmount }} balanceDue={toBePaid} paymentsReceived={paymentsReceived} />
                            </div>
                        </div>
                    ))}
                </div>
                    </div>
                )}
            </SharedDocumentViewer>
            
            <Sheet open={confirmPaid} onClose={() => !markingPaid && setConfirmPaid(false)} variant="dialog" size="sm" zIndex={1000}
                title="Mark this invoice paid?"
                subtitle={`${displayInvoice.invoiceNumber || 'Invoice'} · ${fmtMoney(toBePaid)} still due. The client will see it as paid.`}
                footer={(
                    <div className="flex gap-2">
                        <DocButton variant="secondary" onClick={() => setConfirmPaid(false)} disabled={markingPaid} className="flex-1">Cancel</DocButton>
                        <DocButton theme={docTheme('invoice')} onClick={confirmMarkPaid} busy={markingPaid} className="flex-1">Mark as paid</DocButton>
                    </div>
                )}>
                <p className="text-[14px] leading-relaxed text-gray-600 dark:text-zinc-300">To record a part payment with its date and reference instead, use <Link to="/admin/invoices" className="font-semibold text-sky-600 underline dark:text-[#00D1FF]">Record payment</Link> in Invoices.</p>
            </Sheet>
        </>
    );
};

export default Invoice;
