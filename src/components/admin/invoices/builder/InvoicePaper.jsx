import React from 'react';
import Zap from 'lucide-react/dist/esm/icons/zap';
import DocumentSeal from '../../../ui/DocumentSeal';
import { cn } from '../../../../lib/utils';
import { invoiceLineAmount } from '../../../../lib/invoicing';
import { invoiceTaxLines, placeOfSupply, panOfGstin, amountInWords } from './gst';

/*
 * The invoice paper as the builder previews it and downloads it as a PDF.
 * This is product output: its look is unchanged from the original builder
 * preview. One component now draws both the on-screen preview and the pages
 * captured for the PDF, so the download always matches what you see.
 */

export const BRANDS = [
    { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
    { id: 'media', label: 'Newbi Media', path: '/logo_media.png', color: '#00D1FF' },
    { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' },
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
    if (data.paymentLink) weight += 0.5;
    if (data.upiId && data.showUPI) weight += 1.5;
    if (data.showSeal || data.showSignatures) weight += 2;
    if (data.showPaymentDetails && data.paymentDetails) weight += 1.5;
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

const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;
const day = (key) => (key ? new Date(`${String(key).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB') : '');

/**
 * One A4 page (794 × 1123 px). `amounts` = { subtotal, gstAmount, total },
 * `paymentsReceived` = money recorded after it was issued, `balanceDue` is
 * what's left after the advance and those payments.
 */
export const InvoicePage = ({ data, columns = [], pageItems, pageIndex, pageCount, amounts, balanceDue, paymentsReceived = 0, forCapture = false }) => {
    const brand = brandOf(data.selectedLogo);
    const brandColor = brand.color;
    const isLast = pageIndex === pageCount - 1;
    const upiLink = `upi://pay?pa=${data.upiId}&pn=NEWBI&am=${balanceDue}&cu=INR`;
    const tax = invoiceTaxLines(data, amounts.gstAmount);
    const supply = placeOfSupply(data);
    const sellerPan = panOfGstin(data.senderGst);
    const showBalance = (data.showAdvance && data.advancePaid > 0) || paymentsReceived > 0;

    return (
        <div
            className={cn('invoice-page-render w-[794px] h-[1123px] bg-white text-gray-900 print:bg-white print:text-black relative flex flex-col p-[12mm] overflow-hidden', !forCapture && 'shadow-2xl rounded-[2px]')}
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            {pageIndex === 0 ? (
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <img src={brand.path} alt="Company Logo" className="h-20 object-contain" crossOrigin="anonymous" />
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-0">#{data.invoiceNumber}</h2>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-tight mt-1">INVOICE ID</p>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                    <img src={brand.path} alt="Logo" className="w-[100px] object-contain opacity-50" crossOrigin="anonymous" />
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Invoice #{data.invoiceNumber} — Page {pageIndex + 1}</p>
                </div>
            )}

            <div className="relative z-10 flex flex-col flex-1 pb-20">
                {pageIndex === 0 && (
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="bg-white/80 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-6 py-2" style={{ backgroundColor: `${brandColor}66` }}>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE BY</h4>
                            </div>
                            <div className="p-6">
                                <p className="text-xl font-bold mb-3 leading-none">{data.senderName || 'Newbi Entertainment'}</p>
                                <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                    {data.senderAddress && <p className="whitespace-pre-wrap leading-relaxed max-w-xs">{data.senderAddress}</p>}
                                    <p>Contact: {data.senderContact}</p>
                                    <p>Email: {data.senderEmail}</p>
                                    {data.senderGst && <p>GSTIN: {data.senderGst}</p>}
                                    {sellerPan && <p>PAN: {sellerPan}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/80 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-6 py-2" style={{ backgroundColor: `${brandColor}66` }}>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE TO</h4>
                            </div>
                            <div className="p-6">
                                <p className="text-xl font-bold uppercase mb-3 leading-none">{data.clientName || 'CLIENT NAME'}</p>
                                <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                    <p>Date: {day(data.invoiceDate)}</p>
                                    {data.dueDate && <p className="font-black italic" style={{ color: brandColor }}>Due Date: {day(data.dueDate)}</p>}
                                    {data.clientAddress && <p className="whitespace-pre-line">{data.clientAddress}</p>}
                                    {data.clientGst && <p className="mt-1 pt-1 border-t border-gray-200 inline-block text-[10px]">GST: {data.clientGst}</p>}
                                    {supply && <p className="text-[10px]">Place of Supply: {supply.name} ({supply.code})</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {pageItems.length > 0 && (
                    <div className={cn('mb-8 overflow-hidden rounded-2xl border border-gray-300 shadow-sm bg-white', pageIndex > 0 && 'mt-4')}>
                        <table className="w-full">
                            <thead>
                                <tr className="text-black" style={{ backgroundColor: `${brandColor}66` }}>
                                    <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-black/5">SERVICE DESCRIPTION</th>
                                    {columns.map(col => (
                                        <th key={col.id} className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">{col.label}</th>
                                    ))}
                                    <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">QTY.</th>
                                    <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">PRICE</th>
                                    <th className="py-4 px-6 text-right text-[10px] font-black uppercase tracking-widest">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {pageItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 px-6 text-[11px] font-bold uppercase border-r border-dashed border-gray-200 leading-relaxed italic text-gray-900">{item.name ? (<><span className="block">{item.name}</span>{item.description && <span className="mt-0.5 block text-[10px] font-medium normal-case not-italic text-gray-500 whitespace-pre-wrap">{item.description}</span>}</>) : (item.description || 'SERVICE')}</td>
                                        {columns.map(col => (
                                            <td key={col.id} className="py-3 px-4 text-center text-[10px] font-semibold border-r border-dashed border-gray-200 leading-relaxed italic text-gray-500">{item.customValues?.[col.id] || '-'}</td>
                                        ))}
                                        <td className="py-3 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed text-gray-900">{item.qty || 1}</td>
                                        <td className="py-3 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed text-gray-900">{money(item.price)}</td>
                                        <td className="py-3 px-6 text-right text-[11px] font-black leading-relaxed text-gray-900">{money(invoiceLineAmount(item))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {isLast && (
                    <div className="mt-4 flex gap-x-8 items-start pt-4 border-t border-gray-200 relative z-10 w-full">
                        <div className="flex-1 space-y-2">
                            {data.showPaymentDetails && data.paymentDetails && (
                                <div className="p-4 border-2 border-dashed border-gray-300 rounded-2xl text-[10px] text-left leading-relaxed text-gray-600 bg-white/60 shadow-sm w-full">
                                    <p className="text-[10px] font-black text-black mb-3 border-b-2 pb-1.5 inline-block uppercase tracking-widest" style={{ borderColor: brandColor }}>PAYMENT DETAILS</p>
                                    <div className="font-mono">{renderContent(data.paymentDetails)}</div>
                                </div>
                            )}
                            {data.showNotes && !isBlankText(data.note) && (
                                <div className="bg-white/60 border border-black/5 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-1.5 border-b border-black/10" style={{ backgroundColor: `${brandColor}66` }}>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black">ADDITIONAL NOTE</h4>
                                    </div>
                                    <div className="p-4">
                                        <div className="text-[10px] text-gray-700 leading-relaxed italic">{renderContent(data.note)}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col items-end space-y-1">
                            <div className="w-full space-y-1.5">
                                <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                    <span>SUBTOTAL</span>
                                    <span className="text-black text-[11px] font-bold italic">{money(amounts.subtotal)}</span>
                                </div>
                                {tax.lines.map(line => (
                                    <div key={line.label} className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-600 uppercase tracking-widest text-black">
                                        <span>{line.label}</span>
                                        <span className="text-black text-[11px] font-bold italic">{money(line.amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center py-2 px-3 text-black border border-black/5 mt-1 rounded-lg" style={{ backgroundColor: `${brandColor}66` }}>
                                    <span className="text-[9px] font-black uppercase italic">TOTAL</span>
                                    <span className="text-lg font-black italic tracking-tighter">{money(amounts.total)}</span>
                                </div>
                                {amounts.total > 0 && <p className="text-right text-[9px] font-bold italic leading-snug text-gray-600">{amountInWords(amounts.total)}</p>}
                                {showBalance && (
                                    <>
                                        {data.showAdvance && data.advancePaid > 0 && (
                                            <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-600 uppercase tracking-widest mt-1">
                                                <span>ADVANCE PAID</span>
                                                <span className="text-black text-[11px] font-bold italic">{money(data.advancePaid)}</span>
                                            </div>
                                        )}
                                        {paymentsReceived > 0 && (
                                            <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-600 uppercase tracking-widest mt-1">
                                                <span>PAYMENTS RECEIVED</span>
                                                <span className="text-black text-[11px] font-bold italic">{money(paymentsReceived)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center py-2 px-4 text-black border border-black/10 rounded-xl shadow-lg mt-1" style={{ backgroundColor: `${brandColor}66` }}>
                                            <span className="text-[10px] font-black uppercase italic">BALANCE DUE</span>
                                            <span className="text-2xl font-black italic tracking-tighter">{money(balanceDue)}</span>
                                        </div>
                                    </>
                                )}
                                {data.paymentLink && (
                                    <a href={data.paymentLink} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-2 w-full h-11 bg-black text-white rounded-xl font-black uppercase tracking-[0.2em] text-[9px] transition-all shadow-xl">
                                        <Zap size={14} className="text-neon-blue" />
                                        Pay Now Online
                                    </a>
                                )}
                            </div>

                            <div className="flex w-full items-end justify-between pt-4 mt-2 border-t border-gray-300/50 print:border-gray-200">
                                {data.showUPI && data.upiId && (
                                    <div className="flex flex-col items-center gap-2 shrink-0">
                                        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center w-[85px]">
                                            <img
                                                src={data.qrType === 'custom' && data.customQrImage
                                                    ? data.customQrImage
                                                    : `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(upiLink)}`}
                                                alt="Payment QR"
                                                className="w-[65px] h-[65px] grayscale contrast-125 mx-auto"
                                                crossOrigin="anonymous"
                                            />
                                            <p className="text-[6px] font-black text-center mt-1 text-gray-600 tracking-widest uppercase italic font-bold">Scan to pay</p>
                                        </div>
                                        <a href={upiLink} className="flex items-center justify-center gap-1 w-[85px] h-8 bg-black text-white rounded-xl text-[7px] font-black uppercase tracking-widest transition-all" data-html2canvas-ignore="true">
                                            Pay via UPI
                                        </a>
                                    </div>
                                )}

                                {(data.showSeal || data.showSignatures) && (
                                    <div className="flex items-end relative pb-1 pr-1">
                                        {data.showSeal && (
                                            <div className={data.showSignatures ? 'absolute -left-12 -top-4 pointer-events-none z-10 opacity-80 mix-blend-multiply print:mix-blend-multiply print:drop-shadow-none mb-0.5 rotate-[-4deg]' : 'pointer-events-none z-10 opacity-80 mix-blend-multiply print:mix-blend-multiply print:drop-shadow-none mb-0.5 rotate-[-4deg]'}>
                                                <DocumentSeal className="w-[85px] h-[85px]" />
                                            </div>
                                        )}
                                        {data.showSignatures && (
                                            <div className="z-20 flex flex-col items-center relative space-y-1 w-[150px]">
                                                <p className="text-[7.5px] font-black text-gray-500 uppercase tracking-widest mb-1 text-center whitespace-nowrap">For {data.senderName || 'Newbi Entertainment'}</p>
                                                <div className="h-12 w-full flex items-end justify-center relative border-b border-black/20 print:border-black/20 pb-1">
                                                    {data.providerSignature ? (
                                                        <img src={data.providerSignature} alt="Provider Signature" className="h-full object-contain mix-blend-multiply print:mix-blend-multiply print:invert-0 grayscale-0" crossOrigin="anonymous" />
                                                    ) : (
                                                        <p className="text-[11px] font-formal italic text-gray-900 print:text-black opacity-40">Authorized Signatory</p>
                                                    )}
                                                </div>
                                                <p className="text-[7.5px] font-black text-gray-900 print:text-black uppercase tracking-widest leading-tight mt-1 text-center whitespace-nowrap">Authorized Signatory</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {data.showFooter !== false && (
                <footer className="absolute bottom-[12mm] left-[12mm] right-[12mm] h-11 flex items-center justify-between px-6 rounded-full text-black shadow-sm z-30" style={{ backgroundColor: `${brandColor}66` }}>
                    <div className="flex items-center gap-5 text-[8.5px] font-black tracking-widest uppercase">
                        <div className="flex items-center gap-1.5">
                            <span className="opacity-50 text-[7px] tracking-[0.2em]">CALL</span>
                            <span className="whitespace-nowrap font-bold">+91 93043 72773</span>
                        </div>
                        <div className="h-3 w-[1px] bg-black/15" />
                        <div className="flex items-center gap-1.5">
                            <span className="opacity-50 text-[7px] tracking-[0.2em]">EMAIL</span>
                            <span className="whitespace-nowrap font-bold">partnership@newbi.live</span>
                        </div>
                        <div className="h-3 w-[1px] bg-black/15" />
                        <div className="flex items-center gap-1.5">
                            <span className="opacity-50 text-[7px] tracking-[0.2em]">WEB</span>
                            <span className="whitespace-nowrap font-bold">newbi.live</span>
                        </div>
                    </div>
                    <div className="text-[8.5px] font-black tracking-widest uppercase italic opacity-80 whitespace-nowrap pl-4">
                        PAGE {pageIndex + 1} OF {pageCount}
                    </div>
                </footer>
            )}
        </div>
    );
};
