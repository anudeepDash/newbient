import React from 'react';
import Zap from 'lucide-react/dist/esm/icons/zap';
import { cn } from '../../../../lib/utils';
import { invoiceLineAmount } from '../../../../lib/invoicing';
import { invoiceTaxLines, placeOfSupply, panOfGstin, amountInWords } from './gst';

/*
 * The invoice paper: the builder's preview, its PDF, and the public invoice
 * page all draw these pages, so what you build is what the client sees and
 * downloads. White A4 in the newbi.live look: Outfit display type, tracked
 * uppercase labels, black rules and one acid-green accent.
 */

// Which Newbi company sends the invoice: its black and green newbi.live logo (with the company
// name under it) heads the paper, and it names the seller when "Sender name" is empty.
export const BRANDS = [
    { id: 'entertainment', label: 'Newbi Entertainment', path: '/brand/newbi-logo-black-entertainment.svg' },
    { id: 'media', label: 'Newbi Media', path: '/brand/newbi-logo-black-media.svg' },
    { id: 'marketing', label: 'Newbi Marketing', path: '/brand/newbi-logo-black-marketing.svg' },
];
export const brandOf = (id) => BRANDS.find(b => b.id === id) || BRANDS[0];

const inlineFmt = (t) => (t ? t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') : '');

const processHtmlHeadings = (html) => {
    if (!html) return html;
    return html.replace(/<(p|div)\b([^>]*?)>(#{1,6})(?:\s|&nbsp;| )+(.*?)<\/\1>/gi, (match, tag, attrs, hashes, content) => {
        const level = hashes.length;
        const headingClass = level === 1
            ? 'text-[18px] font-black text-black border-b border-black/10 pb-1 mt-6 mb-2 block'
            : level === 2
                ? 'text-[15px] font-bold text-black border-b border-black/10 pb-1 mt-5 mb-2 block'
                : 'text-[13.5px] font-bold text-gray-800 mt-4 mb-1 block';
        const headingTag = `h${Math.min(level + 1, 6)}`;
        return `<${headingTag} class="${headingClass}" ${attrs}>${content}</${headingTag}>`;
    });
};

const renderFormatted = (text, baseClass = '') => {
    if (!text) return null;
    const lines = text.split('\n');
    const elements = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === '') {
            const last = elements[elements.length - 1];
            if (!(last && last.key && String(last.key).startsWith('spacer-'))) elements.push(<div key={`spacer-${i}`} className="h-3" />);
            i++;
            continue;
        }
        const headingMatch = line.match(/^(#{1,6})(?:\s|&nbsp;| )+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const headingClass = level === 1
                ? 'text-[18px] font-black text-black border-b border-black/10 pb-1 mt-6 mb-2 block'
                : level === 2
                    ? 'text-[15px] font-bold text-black border-b border-black/10 pb-1 mt-5 mb-2 block'
                    : 'text-[13.5px] font-bold text-gray-800 mt-4 mb-1 block';
            const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
            elements.push(<Tag key={i} className={headingClass} dangerouslySetInnerHTML={{ __html: inlineFmt(headingMatch[2]) }} />);
        } else if (line.match(/^[•\-*](?:\s|&nbsp;| )+/)) {
            const bullets = [];
            while (i < lines.length && lines[i].match(/^[•\-*](?:\s|&nbsp;| )+/)) {
                bullets.push(lines[i].replace(/^[•\-*](?:\s|&nbsp;| )+/, '').trim());
                i++;
            }
            elements.push(
                <div key={`ul-${i}`} className="pl-6 space-y-2 my-3">
                    {bullets.map((item, j) => (
                        <div key={j} className="flex items-start gap-3">
                            <span className="text-black mt-[8px] text-[6px] select-none shrink-0">■</span>
                            <span className={baseClass} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} />
                        </div>
                    ))}
                </div>
            );
            continue;
        } else {
            elements.push(<p key={i} className={cn('whitespace-pre-line leading-relaxed', baseClass)} dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />);
        }
        i++;
    }
    return <div>{elements}</div>;
};

const renderContent = (content, baseClass = '') => {
    if (!content) return null;
    if (content.includes('<') && content.includes('>')) {
        return <div className={cn('article-content', baseClass)} dangerouslySetInnerHTML={{ __html: processHtmlHeadings(content) }} />;
    }
    return renderFormatted(content, baseClass);
};

/** Text with no visible words (an empty rich-text note is often "<br>"). */
export const isBlankText = (value) => !String(value || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

/** Splits the lines into pages, leaving room for the totals block on the last one. */
export const paginateInvoice = (items, data) => {
    const pages = [];
    const remaining = [...items];
    let weight = 0;
    if (data.showGst) weight += 1; // tax rows and the amount in words
    if (data.showAdvance && data.advancePaid > 0) weight += 0.5;
    weight += 0.5; // the "Pay online" button
    if (data.showSeal || data.showSignatures) weight += 2;
    if (data.showNotes && !isBlankText(data.note)) weight += 1;

    const firstWithTotals = weight >= 4 ? 3 : (weight >= 2 ? 4 : 6);
    const laterWithTotals = weight >= 4 ? 6 : (weight >= 2 ? 8 : 10);
    let first = true;
    while (remaining.length > 0) {
        const pageItems = remaining.splice(0, first ? 7 : 14);
        pages.push(pageItems);
        if (remaining.length === 0 && pageItems.length > (first ? firstWithTotals : laterWithTotals)) pages.push([]);
        first = false;
    }
    return pages.length > 0 ? pages : [[]];
};

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
const day = (key) => (key ? new Date(`${String(key).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

/**
 * A saved invoice as the paper reads it, with the same defaults the builder
 * applies when it opens one. The public invoice page draws its pages from this.
 */
export const paperDataFrom = (invoice = {}) => ({
    ...invoice,
    invoiceDate: invoice.invoiceDate || invoice.issueDate || invoice.createdAt || '',
    showNotes: invoice.showNotes !== false,
    showFooter: invoice.showFooter !== false,
    advancePaid: Number(invoice.advancePaid) || 0,
    gstPercentage: Number(invoice.gstPercentage) || 0,
});

// The site's acid green. Used only as a fill (dots, bars, the amount on black), never as text on white.
const GREEN = '#39FF14';
const display = { fontFamily: "'Outfit', 'Inter', sans-serif" };

/** Small tracked uppercase label with a green dot, like the chips on newbi.live. */
const Label = ({ children, className }) => (
    <p className={cn('flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-[0.22em] text-gray-500', className)}>
        <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ backgroundColor: GREEN }} />
        {children}
    </p>
);

const Row = ({ label, value, strong = false }) => (
    <div className="flex items-baseline justify-between border-b border-gray-200 py-[7px]">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</span>
        <span className={cn('tabular-nums text-gray-950', strong ? 'text-[13px] font-bold' : 'text-[11px] font-semibold')}>{value}</span>
    </div>
);

/** The black block with the amount in green: the one loud thing on the page. */
const AmountBlock = ({ label, value }) => (
    <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#0a0a0a] px-5 py-3.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/70">{label}</span>
        <span className="text-[26px] font-extrabold leading-none tracking-[-0.03em] tabular-nums" style={{ ...display, color: GREEN }}>{value}</span>
    </div>
);

/**
 * One A4 page (794 × 1123 px). `amounts` = { subtotal, gstAmount, total },
 * `paymentsReceived` = money recorded after it was issued, `balanceDue` is
 * what's left after the advance and those payments.
 */
export const InvoicePage = ({ data, columns = [], pageItems, pageIndex, pageCount, amounts, balanceDue, paymentsReceived = 0, forCapture = false }) => {
    const brand = brandOf(data.selectedLogo);
    const sender = data.senderName || brand.label;
    const isFirst = pageIndex === 0;
    const isLast = pageIndex === pageCount - 1;
    // Razorpay is the only way to pay: the button opens the invoice page, which takes the payment.
    const payUrl = data.id && typeof window !== 'undefined' ? `${window.location.origin}/invoice/${data.id}` : '';
    const tax = invoiceTaxLines(data, amounts.gstAmount);
    const supply = placeOfSupply(data);
    const sellerPan = panOfGstin(data.senderGst);
    const advance = data.showAdvance && data.advancePaid > 0 ? data.advancePaid : 0;
    const showBalance = advance > 0 || paymentsReceived > 0;
    const firstRow = isFirst ? 0 : 7 + (pageIndex - 1) * 14; // row numbers carry on across pages
    const numCell = 'py-3 px-3 text-right text-[11px] font-semibold tabular-nums text-gray-950 align-top';
    const headCell = 'pb-2.5 pt-1 px-3 text-[8.5px] font-bold uppercase tracking-[0.2em] text-gray-950';

    return (
        <div
            className={cn('invoice-page-render relative flex h-[1123px] w-[794px] flex-col overflow-hidden bg-white p-[12mm] text-gray-950 print:bg-white print:text-black', !forCapture && 'rounded-[2px] shadow-2xl')}
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            {isFirst ? (
                <header>
                    <div className="flex items-start justify-between">
                        <img src={brand.path} alt={`newbi.live · ${brand.label}`} className="h-[84px] w-auto object-contain" crossOrigin="anonymous" />
                        <div className="text-right">
                            <p className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-[0.22em] text-gray-700">
                                <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: GREEN }} />
                                {data.showGst ? 'Tax invoice' : 'Invoice'}
                            </p>
                            <h1 className="mt-2 text-[34px] font-extrabold uppercase leading-none tracking-[-0.04em] text-gray-950" style={display}>{data.invoiceNumber || 'Draft'}</h1>
                        </div>
                    </div>

                    <div className="mt-7 grid grid-cols-4 border-y-2 border-gray-950">
                        {[
                            ['Issued', day(data.invoiceDate) || '—'],
                            ['Due', day(data.dueDate) || 'On receipt'],
                            ['Place of supply', supply ? `${supply.name} (${supply.code})` : '—'],
                            [showBalance ? 'Balance due' : 'Amount due', money(showBalance ? balanceDue : amounts.total)],
                        ].map(([label, value], i) => (
                            <div key={label} className={cn('py-3', i > 0 && 'border-l border-gray-200 pl-4')}>
                                <p className="text-[8.5px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</p>
                                <p className={cn('mt-1 truncate text-gray-950 tabular-nums', i === 3 ? 'text-[15px] font-extrabold tracking-[-0.02em]' : 'text-[12px] font-semibold')} style={i === 3 ? display : undefined}>{value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-7 grid grid-cols-2 gap-10">
                        <div>
                            <Label>Billed by</Label>
                            <p className="mt-2.5 text-[17px] font-bold leading-tight tracking-[-0.02em]" style={display}>{sender}</p>
                            <div className="mt-2 space-y-1 text-[10.5px] leading-relaxed text-gray-600">
                                {data.senderAddress && <p className="max-w-xs whitespace-pre-wrap">{data.senderAddress}</p>}
                                {data.senderContact && <p>{data.senderContact}</p>}
                                {data.senderEmail && <p>{data.senderEmail}</p>}
                                {(data.senderGst || sellerPan) && (
                                    <p className="pt-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-gray-700">
                                        {data.senderGst && <>GSTIN {data.senderGst}</>}
                                        {data.senderGst && sellerPan && <span className="px-1.5 text-gray-300">·</span>}
                                        {sellerPan && <>PAN {sellerPan}</>}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                            <Label>Billed to</Label>
                            <p className="mt-2.5 text-[17px] font-bold leading-tight tracking-[-0.02em]" style={display}>{data.clientName || 'Client name'}</p>
                            <div className="mt-2 space-y-1 text-[10.5px] leading-relaxed text-gray-600">
                                {data.clientAddress && <p className="whitespace-pre-line">{data.clientAddress}</p>}
                                {data.clientGst && <p className="pt-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-gray-700">GSTIN {data.clientGst}</p>}
                            </div>
                        </div>
                    </div>
                </header>
            ) : (
                <header className="flex items-center justify-between border-b-2 border-gray-950 pb-3">
                    <img src={brand.path} alt={`newbi.live · ${brand.label}`} className="h-[34px] w-auto object-contain" crossOrigin="anonymous" />
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-600">{data.invoiceNumber} <span className="px-1 text-gray-300">·</span> continued</p>
                </header>
            )}

            <div className="relative z-10 flex flex-1 flex-col pb-16">
                {pageItems.length > 0 && (
                    <table className={cn('w-full border-collapse', isFirst ? 'mt-8' : 'mt-6')}>
                        <thead>
                            <tr className="border-b-2 border-gray-950">
                                <th className={cn(headCell, 'w-8 pl-0 text-left')}>#</th>
                                <th className={cn(headCell, 'text-left')}>Item</th>
                                {columns.map(col => <th key={col.id} className={cn(headCell, 'text-left')}>{col.label}</th>)}
                                <th className={cn(headCell, 'text-right')}>Qty</th>
                                <th className={cn(headCell, 'text-right')}>Rate</th>
                                <th className={cn(headCell, 'pr-0 text-right')}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageItems.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-200">
                                    <td className="py-3 pr-3 align-top text-[10px] font-semibold tabular-nums text-gray-400">{String(firstRow + idx + 1).padStart(2, '0')}</td>
                                    <td className="py-3 px-3 align-top">
                                        <span className="block text-[11.5px] font-semibold leading-snug text-gray-950">{item.name || item.description || 'Service'}</span>
                                        {item.name && item.description && <span className="mt-0.5 block whitespace-pre-wrap text-[10px] leading-snug text-gray-500">{item.description}</span>}
                                    </td>
                                    {columns.map(col => (
                                        <td key={col.id} className="py-3 px-3 align-top text-[10.5px] text-gray-600">{item.customValues?.[col.id] || '—'}</td>
                                    ))}
                                    <td className={numCell}>{item.qty || 1}</td>
                                    <td className={numCell}>{money(item.price)}</td>
                                    <td className={cn(numCell, 'pr-0 font-bold')}>{money(invoiceLineAmount(item))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {isLast && (
                    <div className="mt-7 flex w-full items-start gap-10">
                        <div className="flex-1 space-y-5">
                            {data.showNotes && !isBlankText(data.note) && (
                                <div>
                                    <Label>Note</Label>
                                    <div className="mt-2.5 text-[10px] leading-relaxed text-gray-600">{renderContent(data.note)}</div>
                                </div>
                            )}
                        </div>

                        <div className="flex w-[300px] shrink-0 flex-col">
                            <Row label="Subtotal" value={money(amounts.subtotal)} />
                            {tax.lines.map(line => <Row key={line.label} label={line.label} value={money(line.amount)} />)}
                            {showBalance ? (
                                <>
                                    <Row label="Total" value={money(amounts.total)} strong />
                                    {advance > 0 && <Row label="Advance paid" value={`− ${money(advance)}`} />}
                                    {paymentsReceived > 0 && <Row label="Payments received" value={`− ${money(paymentsReceived)}`} />}
                                    <AmountBlock label="Balance due" value={money(balanceDue)} />
                                </>
                            ) : (
                                <AmountBlock label="Total" value={money(amounts.total)} />
                            )}
                            {amounts.total > 0 && <p className="mt-2 text-right text-[9px] leading-snug text-gray-500">{amountInWords(amounts.total)}</p>}
                            {balanceDue > 0 && (payUrl ? (
                                <a href={payUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border-2 border-gray-950 text-[9px] font-bold uppercase tracking-[0.22em] text-gray-950">
                                    <Zap size={12} className="fill-current" /> Pay online
                                </a>
                            ) : (
                                <p className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border-2 border-gray-950 text-[9px] font-bold uppercase tracking-[0.22em] text-gray-950">
                                    <Zap size={12} className="fill-current" /> Pay online
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {isLast && (data.showSeal || data.showSignatures) && (
                    <div className="mt-auto flex w-full items-end justify-end border-t border-gray-200 pt-5">
                        {(data.showSeal || data.showSignatures) && (
                            <div className="relative flex items-end pb-1">
                                {data.showSeal && ( // a plain image, not the animated DocumentSeal: the PDF capture must never catch it mid-fade
                                    <div className={cn('pointer-events-none z-10 rotate-[-4deg] opacity-90', data.showSignatures && 'absolute -left-[92px] bottom-1')}>
                                        <img src="/official_seal.png" alt="Official seal" className="h-[85px] w-[85px] object-contain" crossOrigin="anonymous" />
                                    </div>
                                )}
                                {data.showSignatures && (
                                    <div className="relative z-20 flex w-[170px] flex-col items-center">
                                        <p className="mb-1 whitespace-nowrap text-center text-[8px] font-bold uppercase tracking-[0.2em] text-gray-500">For {sender}</p>
                                        <div className="flex h-12 w-full items-end justify-center border-b-2 border-gray-950 pb-1">
                                            {data.providerSignature
                                                ? <img src={data.providerSignature} alt="Signature" className="h-full object-contain mix-blend-multiply" crossOrigin="anonymous" />
                                                : <p className="font-formal text-[11px] italic text-gray-900 opacity-40">Authorised signatory</p>}
                                        </div>
                                        <p className="mt-1.5 whitespace-nowrap text-center text-[8px] font-bold uppercase tracking-[0.2em] text-gray-950">Authorised signatory</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {data.showFooter !== false && (
                <footer className="absolute bottom-[10mm] left-[12mm] right-[12mm] z-30 flex items-center justify-between border-t border-gray-950 pt-3 text-[8px] font-bold uppercase tracking-[0.2em] text-gray-600">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-gray-950">
                            <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: GREEN }} />newbi.live
                        </span>
                        <span>+91 93043 72773</span>
                        <span>partnership@newbi.live</span>
                    </div>
                    <span className="tabular-nums">Page {pageIndex + 1} / {pageCount}</span>
                </footer>
            )}
        </div>
    );
};
