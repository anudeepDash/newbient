import React, { useEffect, useRef, useState } from 'react';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { cn } from '../../../lib/utils';
import ContractPreview from '../ContractPreview';

const PAGE_W = 794;
const PAGE_H = 1123;

const PAGE_LABEL = { intro: 'Parties', mission: 'Scope', commercials: 'Payment', clauses: 'Clauses', execution: 'Signatures' };

/**
 * The contract paper, scaled to fit its container, with page and zoom
 * controls. The paper itself (ContractPreview) is the product output.
 */
const PaperViewer = ({ formData, pages, page, onPage, className }) => {
    const boxRef = useRef(null);
    const [width, setWidth] = useState(0);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return undefined;
        const measure = () => setWidth(el.clientWidth);
        measure();
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const fit = width ? Math.max(0.2, (width - 32) / PAGE_W) : 0.5;
    const scale = fit * zoom;
    const total = pages.length;
    const current = Math.min(page, total - 1);
    const square = 'flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-black/5 disabled:opacity-25 dark:text-zinc-300 dark:hover:bg-white/10';

    return (
        <div className={cn('flex min-h-0 flex-col', className)}>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] bg-white px-3 py-1.5 dark:border-white/[0.06] dark:bg-[#0b0c11]">
                <div className="flex items-center">
                    <button type="button" className={square} onClick={() => onPage(Math.max(0, current - 1))} disabled={current === 0} aria-label="Previous page"><ChevronLeft size={16} /></button>
                    <span className="min-w-[88px] text-center text-[12px] font-semibold tabular-nums text-gray-600 dark:text-zinc-300">
                        Page {current + 1} of {total}
                        <span className="block text-[11px] font-medium text-gray-400">{PAGE_LABEL[pages[current]?.type] || ''}</span>
                    </span>
                    <button type="button" className={square} onClick={() => onPage(Math.min(total - 1, current + 1))} disabled={current >= total - 1} aria-label="Next page"><ChevronRight size={16} /></button>
                </div>
                <div className="flex items-center">
                    <button type="button" className={square} onClick={() => setZoom(z => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))} aria-label="Zoom out"><Minus size={14} /></button>
                    <button type="button" onClick={() => setZoom(1)} className="h-10 min-w-[48px] rounded-lg text-[12px] font-semibold tabular-nums text-gray-500 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Reset zoom">{Math.round(zoom * 100)}%</button>
                    <button type="button" className={square} onClick={() => setZoom(z => Math.min(2, Math.round((z + 0.1) * 10) / 10))} aria-label="Zoom in"><Plus size={14} /></button>
                </div>
            </div>
            <div ref={boxRef} className="min-h-0 flex-1 overflow-auto overscroll-contain bg-gray-200/70 p-4 dark:bg-[#050608]">
                <div className="mx-auto" style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
                    <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                        <ContractPreview formData={formData} paginatedPages={pages} currentPage={current} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaperViewer;
