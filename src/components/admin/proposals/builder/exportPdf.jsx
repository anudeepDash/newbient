import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import ProposalPaper from './ProposalPaper';
import { computeTotals, getProposalPages } from './model';

/*
 * Renders every page of a proposal off screen and saves it as an A4 PDF.
 * Works for any proposal object, so the builder and bulk drafts share it.
 */
const waitForImages = (root) => Promise.all(Array.from(root.querySelectorAll('img')).map(img => (
    img.complete ? null : new Promise(res => { img.onload = res; img.onerror = res; setTimeout(res, 6000); })
)));

export const pdfFileName = (formData) => {
    const base = [formData.proposalNumber, formData.clientName].filter(Boolean).join(' ').replace(/[^\w\- ]+/g, '').trim();
    return `Newbi-Proposal-${(base || 'draft').replace(/\s+/g, '-')}.pdf`;
};

export const exportProposalPdf = async (formData, items = []) => {
    const pages = getProposalPages(formData, items);
    if (!pages.length) throw new Error('This proposal has no pages to export.');
    const totals = computeTotals(formData, items);
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-12000px;top:0;width:794px;pointer-events:none;background:#fff;';
    document.body.appendChild(host);
    const root = createRoot(host);
    try {
        flushSync(() => {
            root.render(
                <div>
                    {pages.map((page, idx) => (
                        <div key={idx} style={{ marginBottom: 16 }}>
                            <ProposalPaper page={page} idx={idx} totalPages={pages.length} formData={formData} totals={totals} exporting />
                        </div>
                    ))}
                </div>
            );
        });
        await waitForImages(host);
        if (document.fonts?.ready) await document.fonts.ready;
        const [{ default: JsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
        const pdf = new JsPDF('p', 'mm', 'a4');
        const nodes = host.querySelectorAll('.proposal-page-render');
        for (let i = 0; i < nodes.length; i++) {
            const canvas = await html2canvas(nodes[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
            if (i > 0) pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }
        pdf.save(pdfFileName(formData));
    } finally {
        root.unmount();
        host.remove();
    }
};
