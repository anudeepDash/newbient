import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { cn } from '../../lib/utils';
import ZoomIn from 'lucide-react/dist/esm/icons/zoom-in';
import ZoomOut from 'lucide-react/dist/esm/icons/zoom-out';
import Maximize2 from 'lucide-react/dist/esm/icons/maximize-2';
import Minimize2 from 'lucide-react/dist/esm/icons/minimize-2';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Download from 'lucide-react/dist/esm/icons/download';
import Printer from 'lucide-react/dist/esm/icons/printer';
import Expand from 'lucide-react/dist/esm/icons/expand';
import X from 'lucide-react/dist/esm/icons/x';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    } catch (e) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }
}

// Subcomponent: Individual PDF Page Canvas
const SinglePdfPage = React.memo(function SinglePdfPage({
    pdfDoc,
    pageNumber,
    zoom,
    containerWidth,
    onVisible,
    totalPages,
    theme
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const renderTaskRef = useRef(null);
    const [pageDimensions, setPageDimensions] = useState({ width: 794, height: 1123, aspectRatio: 1123 / 794 });
    const [isRendered, setIsRendered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Track visibility to only render pages near viewport
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (onVisible) onVisible(pageNumber);
                } else {
                    // Keep rendered once loaded, but don't re-render off-screen
                }
            },
            { rootMargin: '400px 0px 400px 0px', threshold: 0.1 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [pageNumber, onVisible]);

    // Initial page dimension probe
    useEffect(() => {
        let isMounted = true;
        if (!pdfDoc) return;

        pdfDoc.getPage(pageNumber).then((page) => {
            if (!isMounted) return;
            const viewport = page.getViewport({ scale: 1 });
            setPageDimensions({
                width: viewport.width,
                height: viewport.height,
                aspectRatio: viewport.height / viewport.width
            });
        }).catch(err => {
            console.warn(`Error probing page ${pageNumber}:`, err);
        });

        return () => {
            isMounted = false;
        };
    }, [pdfDoc, pageNumber]);

    // Render page canvas when visible or zoom changes
    useEffect(() => {
        if (!pdfDoc || !isVisible || !canvasRef.current) return;

        let isCancelled = false;

        const renderPage = async () => {
            try {
                if (renderTaskRef.current) {
                    try {
                        renderTaskRef.current.cancel();
                    } catch (e) {
                        // ignore cancel error
                    }
                }

                const page = await pdfDoc.getPage(pageNumber);
                if (isCancelled) return;

                const baseViewport = page.getViewport({ scale: 1 });
                // Target width: default A4 is 794px, scaled by zoom
                const targetWidth = Math.min(containerWidth || 794, 794) * zoom;
                const scale = targetWidth / baseViewport.width;
                const dpr = Math.min(window.devicePixelRatio || 1.5, 2.5); // crisp retina cap

                const viewport = page.getViewport({ scale: scale * dpr });
                const canvas = canvasRef.current;
                if (!canvas || isCancelled) return;

                const context = canvas.getContext('2d', { alpha: false });
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                canvas.style.width = `${Math.floor(targetWidth)}px`;
                canvas.style.height = `${Math.floor(targetWidth * (baseViewport.height / baseViewport.width))}px`;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                    intent: 'display'
                };

                const task = page.render(renderContext);
                renderTaskRef.current = task;
                await task.promise;

                if (!isCancelled) {
                    setIsRendered(true);
                }
            } catch (err) {
                if (err?.name !== 'RenderingCancelledException') {
                    console.error(`Page ${pageNumber} render error:`, err);
                }
            }
        };

        renderPage();

        return () => {
            isCancelled = true;
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch (e) {
                    // ignore
                }
            }
        };
    }, [pdfDoc, pageNumber, isVisible, zoom, containerWidth]);

    const targetWidth = Math.min(containerWidth || 794, 794) * zoom;
    const targetHeight = targetWidth * pageDimensions.aspectRatio;

    return (
        <div
            id={`pdf-page-${pageNumber}`}
            ref={containerRef}
            className="group relative flex flex-col items-center transition-all duration-300"
            style={{ width: `${targetWidth}px` }}
        >
            {/* White Paper Canvas Card */}
            <div 
                className="relative bg-white text-black rounded-[2px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.55)] border border-black/5 dark:border-white/10 overflow-hidden transition-all duration-300"
                style={{ width: `${targetWidth}px`, minHeight: `${targetHeight}px` }}
            >
                {/* Canvas element */}
                <canvas 
                    ref={canvasRef} 
                    className={cn(
                        "block w-full h-auto transition-opacity duration-300",
                        isRendered ? "opacity-100" : "opacity-0"
                    )}
                />

                {/* Skeleton shimmer while loading */}
                {!isRendered && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 dark:border-zinc-700 animate-spin flex items-center justify-center">
                            <span className="text-[10px] font-mono font-bold text-gray-400">{pageNumber}</span>
                        </div>
                        <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-gray-400">Loading page {pageNumber}...</p>
                    </div>
                )}
            </div>

            {/* Subtle page indicator badge below page */}
            <div className="mt-3 mb-8 flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-gray-500 dark:text-gray-400">
                    Page {pageNumber} of {totalPages}
                </span>
            </div>
        </div>
    );
});

// Main PdfDocumentViewer
export default function PdfDocumentViewer({
    pdfUrl,
    documentData = {},
    theme = { primary: '#39FF14', text: 'text-neon-green', bg: 'bg-neon-green' },
    onDownload,
    onPrint
}) {
    const [pdfDoc, setPdfDoc] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showThumbnails, setShowThumbnails] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [containerWidth, setContainerWidth] = useState(794);
    const containerRef = useRef(null);

    // Responsive container measurement
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                const available = containerRef.current.clientWidth - 48; // padding
                setContainerWidth(Math.min(available, 794));
            } else if (typeof window !== 'undefined') {
                const available = window.innerWidth - (window.innerWidth >= 1024 ? 460 : 48);
                setContainerWidth(Math.min(available, 794));
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Load PDF Document
    useEffect(() => {
        let isMounted = true;
        if (!pdfUrl) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/',
            cMapPacked: true,
            enableXfa: true,
        });

        loadingTask.promise
            .then((doc) => {
                if (!isMounted) return;
                setPdfDoc(doc);
                setNumPages(doc.numPages);
                setIsLoading(false);
            })
            .catch((err) => {
                if (!isMounted) return;
                console.error("PDF.js loading error:", err);
                setError(err.message || "Failed to parse document");
                setIsLoading(false);
            });

        return () => {
            isMounted = false;
            try {
                loadingTask.destroy();
            } catch (e) {
                // ignore
            }
        };
    }, [pdfUrl]);

    // Handle Zoom Controls
    const handleZoomIn = () => setZoom(prev => Math.min(2.0, +(prev + 0.15).toFixed(2)));
    const handleZoomOut = () => setZoom(prev => Math.max(0.6, +(prev - 0.15).toFixed(2)));
    const handleResetZoom = () => setZoom(1);

    // Jump to page
    const scrollToPage = useCallback((pageNum) => {
        setCurrentPage(pageNum);
        const el = document.getElementById(`pdf-page-${pageNum}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    const handlePrevPage = () => {
        if (currentPage > 1) scrollToPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < numPages) scrollToPage(currentPage + 1);
    };

    // Fullscreen toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Error State Fallback
    if (error) {
        return (
            <div className="w-full max-w-2xl mx-auto p-12 bg-white dark:bg-zinc-900 rounded-3xl border border-red-500/20 shadow-2xl flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-6">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white mb-2">
                    Direct PDF Rendering Issue
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                    We could not render the pages directly inline with the high-resolution engine. You can open the document directly or download it.
                </p>
                <div className="flex items-center gap-3">
                    <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border border-black/10 dark:border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all flex items-center gap-2"
                    >
                        Open in New Tab
                    </a>
                    {onDownload && (
                        <button
                            onClick={onDownload}
                            className="px-6 py-3 bg-neon-green text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-neon-green/20"
                        >
                            <Download size={14} /> Download File
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full relative flex flex-col items-center">
            {/* Loading State */}
            {isLoading && (
                <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-4 py-24">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center backdrop-blur-md">
                            <RefreshCw size={24} className={cn("animate-spin", theme.text || "text-neon-green")} />
                        </div>
                    </div>
                    <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 animate-pulse">
                        Preparing High-Resolution Document Pages...
                    </p>
                </div>
            )}

            {/* Document Pages Stack */}
            {!isLoading && pdfDoc && (
                <div className="w-full flex flex-col items-center gap-4 relative z-10 transition-all duration-300">
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                        <SinglePdfPage
                            key={pageNum}
                            pdfDoc={pdfDoc}
                            pageNumber={pageNum}
                            zoom={zoom}
                            containerWidth={containerWidth}
                            totalPages={numPages}
                            onVisible={setCurrentPage}
                            theme={theme}
                        />
                    ))}
                </div>
            )}

            {/* Floating Glassmorphic Viewer Controls HUD */}
            {!isLoading && pdfDoc && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
                    <div className="bg-zinc-950/80 dark:bg-black/85 backdrop-blur-2xl border border-white/15 text-white shadow-[0_20px_50px_rgba(0,0,0,0.55)] rounded-full px-4 py-2 flex items-center gap-2 select-none">
                        
                        {/* Page Navigation */}
                        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage <= 1}
                                className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                title="Previous Page"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-[10px] font-mono font-bold tracking-wider px-2">
                                {currentPage} <span className="opacity-40">/</span> {numPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage >= numPages}
                                className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                title="Next Page"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                            <button
                                onClick={handleZoomOut}
                                disabled={zoom <= 0.6}
                                className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <button
                                onClick={handleResetZoom}
                                className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors"
                                title="Reset Zoom (100%)"
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <button
                                onClick={handleZoomIn}
                                disabled={zoom >= 2.0}
                                className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn size={16} />
                            </button>
                        </div>

                        {/* Thumbnail Drawer Toggle */}
                        <button
                            onClick={() => setShowThumbnails(!showThumbnails)}
                            className={cn(
                                "p-1.5 rounded-full transition-colors flex items-center gap-1.5 px-2.5 text-[10px] font-bold uppercase tracking-wider",
                                showThumbnails 
                                    ? "bg-neon-green/20 text-neon-green border border-neon-green/30" 
                                    : "hover:bg-white/10 text-gray-300"
                            )}
                            title="Thumbnails"
                        >
                            <LayoutGrid size={14} />
                            <span className="hidden sm:inline">Pages</span>
                        </button>

                        {/* Fullscreen Toggle */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 transition-colors"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>

                        {/* Download Shortcut */}
                        {onDownload && (
                            <button
                                onClick={onDownload}
                                className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 transition-colors ml-1"
                                title="Download Document"
                            >
                                <Download size={15} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Slide-out Thumbnails Drawer */}
            {showThumbnails && (
                <div className="fixed inset-y-0 right-0 z-50 w-72 bg-zinc-950/90 backdrop-blur-2xl border-l border-white/10 shadow-2xl p-6 flex flex-col transition-all duration-300 animate-in slide-in-from-right">
                    <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                        <div className="flex items-center gap-2">
                            <LayoutGrid size={16} className="text-neon-green" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-white">All Pages ({numPages})</h4>
                        </div>
                        <button
                            onClick={() => setShowThumbnails(false)}
                            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                                key={pageNum}
                                onClick={() => {
                                    scrollToPage(pageNum);
                                    setShowThumbnails(false);
                                }}
                                className={cn(
                                    "w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all group",
                                    currentPage === pageNum
                                        ? "bg-neon-green/10 border-neon-green/40 text-white shadow-lg shadow-neon-green/10"
                                        : "bg-white/[0.03] border-white/5 text-gray-400 hover:bg-white/[0.06] hover:text-white"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold",
                                        currentPage === pageNum ? "bg-neon-green text-black" : "bg-white/10 text-gray-400"
                                    )}>
                                        {pageNum}
                                    </span>
                                    <span className="text-[11px] font-medium tracking-wide">
                                        Page {pageNum}
                                    </span>
                                </div>
                                {currentPage === pageNum && (
                                    <span className="text-[9px] font-black uppercase tracking-widest text-neon-green">
                                        Active
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
