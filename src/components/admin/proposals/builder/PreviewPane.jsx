import React, { useEffect, useRef, useState } from 'react';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { cn } from '../../../../lib/utils';
import ProposalPaper from './ProposalPaper';

const PAGE_W = 794;
const PAGE_H = 1123;

/**
 * Live preview of the proposal: one A4 page at a time, scaled to fit the
 * pane's width, with page and zoom controls.
 */
const PreviewPane = ({ pages, page, onPage, formData, totals, className, toolbarExtra }) => {
    const boxRef = useRef(null);
    const [fit, setFit] = useState(0.5);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return undefined;
        const measure = () => setFit(Math.max(0.2, Math.min(1.6, (el.clientWidth - 32) / PAGE_W)));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const scale = fit * zoom;
    const total = pages.length;
    const current = Math.min(page, Math.max(0, total - 1));
    const btn = 'flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-25 hover:bg-black/5 dark:hover:bg-white/10';

    return (
        <div className={cn('flex min-h-0 flex-col', className)}>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] bg-white px-2 py-1.5 dark:border-white/[0.06] dark:bg-[#0b0c11]">
                <div className="flex items-center">
                    <button type="button" className={btn} onClick={() => onPage(Math.max(0, current - 1))} disabled={current === 0} aria-label="Previous page"><ChevronLeft size={16} /></button>
                    <span className="min-w-[64px] text-center text-[12px] font-bold tabular-nums">{total ? `${current + 1} of ${total}` : 'No pages'}</span>
                    <button type="button" className={btn} onClick={() => onPage(Math.min(total - 1, current + 1))} disabled={current >= total - 1} aria-label="Next page"><ChevronRight size={16} /></button>
                </div>
                <div className="flex items-center gap-1">
                    <div className="hidden items-center sm:flex">
                        <button type="button" className={btn} onClick={() => setZoom(z => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))} aria-label="Zoom out"><Minus size={14} /></button>
                        <button type="button" onClick={() => setZoom(1)} className="h-10 min-w-[48px] rounded-lg text-[12px] font-bold tabular-nums text-gray-500 hover:bg-black/5 dark:hover:bg-white/10" title="Fit to width">{Math.round(zoom * 100)}%</button>
                        <button type="button" className={btn} onClick={() => setZoom(z => Math.min(2.5, Math.round((z + 0.1) * 10) / 10))} aria-label="Zoom in"><Plus size={14} /></button>
                    </div>
                    {toolbarExtra}
                </div>
            </div>
            <div ref={boxRef} className="min-h-0 flex-1 overflow-auto overscroll-contain bg-gray-200/70 p-4 dark:bg-[#050608]">
                {total === 0 ? (
                    <p className="mt-10 text-center text-[13px] text-gray-500">Every page is turned off. Turn a page on to see the proposal.</p>
                ) : (
                    <div className="mx-auto" style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
                        <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                            <ProposalPaper page={pages[current]} idx={current} totalPages={total} formData={formData} totals={totals} />
                        </div>
                    </div>
                )}
                {total > 1 && (
                    <div className="mx-auto mt-1 flex max-w-full flex-wrap justify-center">
                        {pages.map((p, i) => (
                            <button key={i} type="button" onClick={() => onPage(i)} aria-label={`Page ${i + 1}`} aria-current={i === current ? 'page' : undefined} className="group flex h-10 items-center px-1">
                                <span className={cn('block h-2.5 rounded-full transition-all', i === current ? 'w-6 bg-gray-900 dark:bg-white' : 'w-2.5 bg-black/20 group-hover:bg-black/40 dark:bg-white/20')} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreviewPane;
