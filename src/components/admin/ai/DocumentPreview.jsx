import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { cn } from '../../../lib/utils';
import { getV2PaginatedPages, normalizeProposalData } from '../../../lib/proposalTemplateV2';
import ProposalDocumentRenderer from '../../ui/ProposalDocumentRenderer';
import ContractPreview from '../ContractPreview';

/*
 * Live A4 preview of what the studio made: the real proposal / contract paper
 * (the same renderers the client sees), scaled to fit, every page stacked.
 * The paper itself is product output and keeps its own design.
 */

const PAGE_W = 794;
const PAGE_H = 1123;

export const LOGOS = [
    { id: 'entertainment', label: 'Newbi Entertainment', path: '/brand/newbi-logo-entertainment-800w.png' },
    { id: 'media', label: 'Newbi Media', path: '/brand/newbi-logo-media-800w.png' },
    { id: 'marketing', label: 'Newbi Marketing', path: '/brand/newbi-logo-marketing-800w.png' },
];

const logoFor = (id) => LOGOS.find(l => l.id === id) || LOGOS[0];

/** Renders page `idx` of the document at full size (794 × 1123). */
export const PaperPage = ({ module, doc, pages, idx }) => {
    if (module === 'contract') {
        return <ContractPreview formData={doc} paginatedPages={pages} currentPage={idx} />;
    }
    return (
        <ProposalDocumentRenderer
            page={pages[idx]}
            pageIdx={idx}
            totalPages={pages.length}
            formData={doc}
            currentLogo={logoFor(doc.selectedLogo)}
            isExporting={false}
        />
    );
};

export const usePaperPages = (module, doc, contractPages) => useMemo(() => {
    if (!doc) return { pages: [], data: doc };
    if (module === 'contract') return { pages: contractPages || [], data: doc };
    const data = normalizeProposalData(doc);
    return { pages: getV2PaginatedPages(data), data };
}, [module, doc, contractPages]);

const DocumentPreview = ({ module, doc, contractPages, className }) => {
    const { pages, data } = usePaperPages(module, doc, contractPages);
    const wrapRef = useRef(null);
    const [fit, setFit] = useState(0.5);
    const [zoom, setZoom] = useState(1);

    useLayoutEffect(() => {
        const el = wrapRef.current;
        if (!el) return undefined;
        const measure = () => {
            const w = el.clientWidth - 32;
            if (w > 0) setFit(Math.max(0.2, Math.min(1, w / PAGE_W)));
        };
        measure();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        ro?.observe(el);
        window.addEventListener('resize', measure);
        return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
    }, []);

    useEffect(() => { setZoom(1); }, [module]);

    const scale = Math.max(0.2, Math.min(1.5, fit * zoom));

    return (
        <div className={cn('relative flex min-h-0 flex-col', className)}>
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2.5">
                <p className="text-[12px] font-bold text-gray-500">{pages.length} {pages.length === 1 ? 'page' : 'pages'}</p>
                <div className="flex items-center gap-1 rounded-xl border border-black/10 bg-white p-0.5 dark:border-white/10 dark:bg-white/[0.04]">
                    <button type="button" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.15).toFixed(2)))} aria-label="Zoom out" className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"><Minus size={14} /></button>
                    <button type="button" onClick={() => setZoom(1)} className="h-10 min-w-[3.5rem] rounded-lg px-2 text-[12px] font-bold tabular-nums text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10" title="Fit to width">{Math.round(scale * 100)}%</button>
                    <button type="button" onClick={() => setZoom(z => Math.min(2.5, +(z + 0.15).toFixed(2)))} aria-label="Zoom in" className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"><Plus size={14} /></button>
                </div>
            </div>
            <div ref={wrapRef} className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 pb-8">
                <div className="mx-auto flex w-max flex-col items-center gap-5">
                    {pages.map((page, idx) => (
                        <div key={`${page.type}-${idx}`} className="relative">
                            <div
                                className="overflow-hidden rounded-[3px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] ring-1 ring-black/5"
                                style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
                            >
                                <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                    <PaperPage module={module} doc={data} pages={pages} idx={idx} />
                                </div>
                            </div>
                            <p className="mt-1.5 text-center text-[11px] font-semibold text-gray-400">Page {idx + 1}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/** Off-screen full-size pages, captured page by page into an A4 PDF. */
export const exportPaperPdf = async (container, filename) => {
    const nodes = container ? Array.from(container.querySelectorAll('[data-export-page]')) : [];
    if (!nodes.length) throw new Error('Nothing to export');
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
    const pdf = new jsPDF('p', 'mm', 'a4');
    for (let i = 0; i < nodes.length; i++) {
        const canvas = await html2canvas(nodes[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
    }
    pdf.save(filename);
};

export const ExportPages = React.forwardRef(({ module, doc, contractPages }, ref) => {
    const { pages, data } = usePaperPages(module, doc, contractPages);
    return (
        <div ref={ref} aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 flex flex-col bg-white">
            {pages.map((page, idx) => (
                <div key={`${page.type}-${idx}`} data-export-page style={{ width: PAGE_W, height: PAGE_H }}>
                    <PaperPage module={module} doc={data} pages={pages} idx={idx} />
                </div>
            ))}
        </div>
    );
});
ExportPages.displayName = 'ExportPages';

export default DocumentPreview;
