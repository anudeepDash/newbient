import React, { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Printer, CheckCircle, ArrowLeft, Share2, Mail, MessageCircle, DollarSign, LayoutGrid, Settings, LogOut } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import NotificationBell from '../components/NotificationBell';


const Invoice = () => {
    const { id } = useParams();
    const { invoices, updateInvoiceStatus, loading, user } = useStore();
    const invoiceRef = useRef(null);
    const printFrameRef = useRef(null);
    const [scale, setScale] = React.useState(1);
    const [isExporting, setIsExporting] = React.useState(false);

    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 850) {
                const newScale = (window.innerWidth - 32) / 794;
                setScale(newScale);
            } else {
                setScale(1);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const invoice = invoices.find(inv => inv.id === id);
    const isAdmin = (localStorage.getItem('adminAuth') === 'true') || (user?.role === 'super_admin' || user?.role === 'developer');

    React.useEffect(() => {
        if (invoice && !isAdmin) {
            // Update last opened timestamp for non-admins
            const updateLastOpened = async () => {
                try {
                    await useStore.getState().updateInvoice(id, { 
                        lastOpened: new Date().toISOString() 
                    });
                } catch (err) {
                    console.error("Analytics error:", err);
                }
            };
            updateLastOpened();
        }
    }, [id, isAdmin]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-blue"></div>
            </div>
        );
    }

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

    const handleDownloadPDF = async () => {
        if (isQuickUpload) {
            const link = document.createElement('a');
            link.href = displayInvoice.fileUrl; // Fix the download link
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
                alert("No invoice pages found to download!");
                return;
            }

            for (let i = 0; i < pageElements.length; i++) {
                const canvas = await html2canvas(pageElements[i], {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#F3F4F6',
                    width: 794,
                    height: 1123,
                    windowWidth: 794,
                    windowHeight: 1123,
                    onclone: (clonedDoc) => {
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
            alert("PDF Generation Error: " + error.message);
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
            const isQuickUpload = !!displayInvoice.fileUrl;
            let printUrl = displayInvoice.pdfUrl || displayInvoice.fileUrl;

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
                            backgroundColor: '#F3F4F6',
                            width: 794,
                            height: 1123,
                            windowWidth: 794,
                            windowHeight: 1123,
                            scrollX: 0,
                            scrollY: 0,
                            onclone: (clonedDoc) => {
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
            alert("Failed to prepare for printing.");
        }
    };

    const handleMarkPaid = () => {
        if (window.confirm('Mark this invoice as PAID?')) {
            updateInvoiceStatus(invoice.id, 'Paid');
        }
    };

    const handleShareWhatsApp = () => {
        const text = `Here is your invoice from Newbi Entertainment: ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareEmail = () => {
        const subject = `Invoice #${displayInvoice.invoiceNumber || displayInvoice.id} from Newbi Entertainment`;
        const body = `Hi,\n\nPlease find your invoice here: ${window.location.href}\n\nThanks,\nNewbi Entertainment`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };

    const getGridTemplate = () => {
        const columns = displayInvoice.customColumns || [];
        const customFr = columns.map(() => '1.5fr').join(' ');
        return `3fr ${customFr} 0.8fr 1.2fr 1.2fr`;
    };

    const items = displayInvoice.items || [];
    const subtotal = items.reduce((sum, item) => sum + ((item.qty || 1) * (item.price || 0)), 0);
    const gstAmount = invoice?.showGst ? (subtotal * (invoice.gstPercentage || 0)) / 100 : 0;
    const totalAmount = isQuickUpload ? (displayInvoice.amount || 0) : (subtotal + gstAmount);
    const advancePaid = Number(displayInvoice.advancePaid) || 0;
    const toBePaid = totalAmount - advancePaid;

    // Pagination Logic
    // Reserve space for totals/notes if they are on the last page.
    const ROWS_PER_PAGE_P1 = 12;
    const ROWS_PER_PAGE_NEXT = 20;
    const ROWS_RESERVED_FOR_TOTALS = 6; // Reserve space for totals/notes block

    const getPaginatedPages = () => {
        const pages = [];
        let itemsRemaining = [...items];
        
        // Page 1
        const p1Items = itemsRemaining.splice(0, ROWS_PER_PAGE_P1);
        pages.push(p1Items);
        
        // Subsequent pages
        while (itemsRemaining.length > 0) {
            pages.push(itemsRemaining.splice(0, ROWS_PER_PAGE_NEXT));
        }
        
        // If no items, still need one page
        if (pages.length === 0) pages.push([]);
        
        return pages;
    };

    const paginatedPages = getPaginatedPages();

    return (
        <div className="min-h-screen bg-[#050505] scroll-smooth overflow-x-hidden">
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
            <iframe
                ref={printFrameRef}
                className="fixed -top-[1000px] left-0 pointer-events-none w-0 h-0"
                title="print-frame"
            />

            {/* FIXED HEADER NAVIGATION */}
            {!isExporting && (
                <header data-html2canvas-ignore="true" className="fixed-header-nav fixed top-0 left-0 right-0 z-[100] bg-black/60 backdrop-blur-2xl border-b border-white/10 print:hidden px-4 md:px-8 h-20 md:h-24 flex items-center">
                    <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between gap-4">
                        {/* Left: Back Navigation & Logo */}
                        <div className="flex items-center gap-4">
                            <Link to={isAdmin ? "/admin/invoices" : "/"} className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all">
                                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                                <span className="hidden sm:inline">{isAdmin ? 'ADMIN VAULT' : 'BACK TO HOME'}</span>
                            </Link>
                            <div className="h-8 w-[1px] bg-white/10" />
                            <img src="/logo_document.png" alt="Logo" className="h-8 md:h-10 object-contain hidden xs:block" crossOrigin="anonymous" />
                            <div className="h-8 w-[1px] bg-white/10 hidden md:block" />
                            <div className="hidden md:flex flex-col">
                                <span className="text-[10px] font-black text-neon-blue uppercase tracking-widest leading-none mb-1">
                                    {displayInvoice.invoiceNumber || 'NEWBI-INV'}
                                </span>
                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                                    OFFICIAL DOCUMENT
                                </span>
                            </div>
                        </div>

                        {/* Center: Status (Compact) */}
                        <div className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border flex items-center gap-2 transition-all",
                            displayInvoice.status === 'Paid' 
                                ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                        )}>
                            <div className={cn("w-2 h-2 rounded-full animate-pulse", displayInvoice.status === 'Paid' ? "bg-green-500" : "bg-yellow-500")} />
                            {displayInvoice.status || 'Active'}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <div className="hidden lg:flex items-center bg-white/[0.03] backdrop-blur-2xl rounded-full border border-white/10 px-4 h-12 gap-3 mr-2 shadow-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    
                                    <Link to="/admin" className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all relative z-10" title="Admin Dashboard">
                                        <LayoutGrid size={14} />
                                    </Link>

                                    <div className="h-4 w-px bg-white/10 relative z-10" />

                                    <Link to="/admin/site-settings" className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all relative z-10" title="Site Settings">
                                        <Settings size={14} />
                                    </Link>
                                    
                                    <div className="relative z-10">
                                        <NotificationBell />
                                    </div>
                                    
                                    <div className="h-4 w-px bg-white/10 relative z-10" />
                                    
                                    <div className="flex items-center gap-2 pr-1 relative z-10">
                                        <div className="w-7 h-7 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center shrink-0">
                                            <span className="text-neon-blue font-black text-[10px] uppercase">
                                                {user?.displayName ? user.displayName.charAt(0) : 'A'}
                                            </span>
                                        </div>
                                        <div className="text-left flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-white leading-none capitalize tracking-tight">
                                                {user?.displayName?.split(' ')[0] || 'Admin'}
                                            </span>
                                            <span className="text-[7px] text-neon-blue uppercase tracking-[0.2em] font-black mt-0.5">
                                                {user?.role === 'developer' ? 'DEV' : 'ADMIN'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => useStore.getState().logout()}
                                        className="p-1.5 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all relative z-10"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                </div>
                            )}

                            {isAdmin && (
                                <div className="flex items-center gap-1 md:gap-2 mr-1">
                                    <button onClick={handleShareWhatsApp} className="p-2 md:p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all hidden md:flex"><MessageCircle size={18} /></button>
                                    <button onClick={handleShareEmail} className="p-2 md:p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all hidden md:flex"><Mail size={18} /></button>
                                    {displayInvoice.status !== 'Paid' && (
                                        <button 
                                            onClick={handleMarkPaid} 
                                            className="px-3 md:px-5 py-2 md:py-2.5 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] bg-neon-blue text-white hover:bg-neon-blue/90 rounded-xl transition-all shadow-[0_10px_20px_rgba(56,182,255,0.2)] border border-neon-blue"
                                        >
                                            Mark as Paid
                                        </button>
                                    )}
                                </div>
                            )}
                            <button onClick={handlePrint} className="p-2 md:p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all" title="Print"><Printer size={18} /></button>
                            <Button 
                                variant="primary" 
                                onClick={handleDownloadPDF} 
                                className="bg-neon-blue text-black hover:bg-neon-blue/90 h-10 md:h-12 px-4 md:px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[0_10px_20px_rgba(56,182,255,0.2)] ml-2"
                            >
                                <Download size={16} className="md:mr-2" /><span className="hidden sm:inline">Export PDF</span>
                            </Button>
                        </div>
                    </div>
                </header>
            )}

            {/* MAIN CONTENT AREA */}
            <main className="relative z-10 pt-32 pb-32 px-4 flex flex-col items-center">
                {!invoice && !loading && (
                    <div className="mb-8 px-6 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        Demo Mode / Visual Preview Only
                    </div>
                )}

                {isQuickUpload ? (
                    <div className="w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/40 backdrop-blur-3xl shadow-2xl">
                        <iframe
                            src={invoice.pdfUrl}
                            title="Invoice PDF"
                            className="w-full h-full border-none"
                        />
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center overflow-x-auto custom-scrollbar pb-12">
                        <div className="relative group bg-zinc-900/40 backdrop-blur-3xl p-4 md:p-12 rounded-[3.5rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex flex-col items-center">
                            <div className="absolute top-8 right-12 z-20 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-widest text-[#39FF14]">Digital Archive</div>
                            
                            <div className="flex flex-col items-center" style={{ gap: `${48 * scale}px` }}>
                                 {paginatedPages.map((pageItems, pageIdx) => {
                                    const isLastPage = pageIdx === paginatedPages.length - 1;
                                    const isFirstPage = pageIdx === 0;

                                    return (
                                        <div key={pageIdx} style={{ width: 794 * scale, height: 1123 * scale }} className="relative shrink-0 shadow-2xl rounded-xl overflow-hidden bg-[#F3F4F6]">
                                            <div
                                                className="invoice-page-render absolute top-0 left-0 w-[794px] h-[1123px] bg-[#F3F4F6] text-black overflow-hidden shrink-0 p-[12mm] flex flex-col origin-top-left"
                                                style={{ fontFamily: "'Inter', sans-serif", transform: `scale(${scale})` }}
                                            >
                                                <div className={cn("relative z-10 flex flex-col", isLastPage ? "pb-20" : "h-full pb-48")}>
                                                    {/* Header - Only on Page 1 or Summary Page */}
                                                {isFirstPage ? (
                                                    <div className="flex justify-between items-start mb-12">
                                                        <div>
                                                            <img src="/logo_document.png" alt="Company Logo" className="h-20 object-contain" crossOrigin="anonymous" />
                                                        </div>
                                                        <div className="text-right">
                                                            <h2 className="text-4xl font-black text-gray-400 tracking-tighter uppercase mb-0">#{displayInvoice.invoiceNumber}</h2>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">INVOICE ID</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                                                        <img src="/logo_document.png" alt="Newbi Logo" className="w-[100px] object-contain opacity-50" crossOrigin="anonymous" />
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice #{displayInvoice.invoiceNumber} — Page {pageIdx + 1}</p>
                                                    </div>
                                                )}

                                                {/* Info Boxes - Only on Page 1 */}
                                                {isFirstPage && (
                                                    <div className="grid grid-cols-2 gap-8 mb-8">
                                                        <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                            <div className="bg-[#39FF14]/40 px-6 py-2">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE BY</h4>
                                                            </div>
                                                            <div className="p-6">
                                                                <p className="text-xl font-bold mb-3 leading-none">{displayInvoice.senderName || 'Newbi Entertainment'}</p>
                                                                <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                                    <p>Contact: {displayInvoice.senderContact}</p>
                                                                    <p>Email: {displayInvoice.senderEmail}</p>
                                                                    {displayInvoice.senderPan && <p>PAN: {displayInvoice.senderPan}</p>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                            <div className="bg-[#39FF14]/40 px-6 py-2">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE TO</h4>
                                                            </div>
                                                            <div className="p-6">
                                                                <p className="text-xl font-bold uppercase mb-3 leading-none">{displayInvoice.clientName || 'CLIENT NAME'}</p>
                                                                <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                                    <p>Date: {new Date(displayInvoice.issueDate || displayInvoice.createdAt || Date.now()).toLocaleDateString('en-GB')}</p>
                                                                    {displayInvoice.dueDate && <p className="text-[#39FF14] font-black">Due Date: {new Date(displayInvoice.dueDate).toLocaleDateString('en-GB')}</p>}
                                                                    {displayInvoice.clientAddress && <p className="whitespace-pre-line">{displayInvoice.clientAddress}</p>}
                                                                    {displayInvoice.clientGst && <p className="mt-1 pt-1 border-t border-gray-200 inline-block">GST: {displayInvoice.clientGst}</p>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Items Table */}
                                                {true && (
                                                    <div className={cn("mb-8 overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white/20", !isFirstPage && "mt-4")}>
                                                        <table className="w-full">
                                                            <thead>
                                                                <tr className="bg-[#39FF14]/40 text-black">
                                                                    <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-black/5">SERVICE DESCRIPTION</th>
                                                                    {(displayInvoice.customColumns || []).map(col => (
                                                                        <th key={col.id} className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">{col.label}</th>
                                                                    ))}
                                                                    <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">QTY.</th>
                                                                    <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">PRICE</th>
                                                                    <th className="py-4 px-6 text-right text-[10px] font-black uppercase tracking-widest">TOTAL</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-200">
                                                                {pageItems.map((item, idx) => (
                                                                    <tr key={idx} className="bg-white/10">
                                                                        <td className="py-5 px-6 text-[11px] font-bold uppercase border-r border-dashed border-gray-200 leading-relaxed font-heading italic">{item.description || "SERVICE"}</td>
                                                                        {(displayInvoice.customColumns || []).map(col => (
                                                                            <td key={col.id} className="py-5 px-4 text-center text-[10px] font-semibold border-r border-dashed border-gray-200 leading-relaxed">{item.customValues?.[col.id] || "-"}</td>
                                                                        ))}
                                                                        <td className="py-5 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed">{item.qty || 1}</td>
                                                                        <td className="py-5 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed">₹{(item.price || 0).toLocaleString()}</td>
                                                                        <td className="py-5 px-6 text-right text-[11px] font-black leading-relaxed">₹{( (item.qty || 1) * (item.price || 0) ).toLocaleString()}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {/* Totals Section & Left Details - Only on Last Page */}
                                                {isLastPage && (
                                                    <div className="mt-4 grid grid-cols-2 gap-y-8 gap-x-12 relative z-10 w-full items-start min-h-[400px]">
                                                        {[
                                                            { id: 'notes', col: 'col-start-1 row-start-1' },
                                                            { id: 'totals', col: 'col-start-2 row-start-1' },
                                                            { id: 'payment_details', col: 'col-start-1 row-start-2' },
                                                            { id: 'payment_qr', col: 'col-start-2 row-start-2' },
                                                            { id: 'signatory', col: 'col-start-2 row-start-3' }
                                                        ].map((blockDef) => {
                                                            const sectionId = blockDef.id;
                                                            const savedItem = (displayInvoice.layoutOrder || []).find(i => (typeof i === 'object' ? i.id : i) === sectionId);
                                                            const x = savedItem?.x || 0;
                                                            const y = savedItem?.y || 0;
                                                            const s = savedItem?.scale || 1;
                                                            const style = { 
                                                                transform: `translate(${x}px, ${y}px) scale(${s})`, 
                                                                transformOrigin: 'top left',
                                                                zIndex: 20
                                                            };

                                                            if (sectionId === 'notes') {
                                                                if (invoice?.showNotes === false || !displayInvoice.note) return null;
                                                                return (
                                                                    <div key="notes" style={style} className={cn(blockDef.col, "w-full relative")}>
                                                                        <div className="bg-white/40 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                                            <div className="bg-[#39FF14]/40 px-4 py-1.5 border-b border-black/10">
                                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">ADDITIONAL NOTE</h4>
                                                                            </div>
                                                                            <div className="p-4">
                                                                                <p className="text-[10px] text-gray-700 font-bold whitespace-pre-line leading-relaxed italic">{displayInvoice.note}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            if (sectionId === 'totals') {
                                                                return (
                                                                    <div key="totals" style={style} className={cn(blockDef.col, "w-full relative")}>
                                                                        <div className="w-full space-y-3">
                                                                            <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                                <span>SUBTOTAL</span>
                                                                                <span className="text-black text-xs font-bold italic">₹{subtotal.toLocaleString()}</span>
                                                                            </div>
                                                                            {invoice?.showGst && (
                                                                                <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">
                                                                                    <span>GST ({displayInvoice.gstPercentage}%)</span>
                                                                                    <span className="text-black text-xs font-bold italic">₹{gstAmount.toLocaleString()}</span>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex justify-between items-center py-3 bg-[#39FF14]/40 px-4 text-black border border-black/5 mt-2 rounded-xl">
                                                                                <span className="text-[10px] font-black uppercase italic">TOTAL AMOUNT</span>
                                                                                <span className="text-xl font-black italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                                                            </div>
                                                                            {displayInvoice.showAdvance && advancePaid > 0 && (
                                                                                <>
                                                                                    <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                                                                        <span>ADVANCE PAID</span>
                                                                                        <span className="text-black text-xs font-bold italic">₹{advancePaid.toLocaleString()}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center py-4 bg-[#39FF14]/40 px-6 text-black border border-black/10 rounded-2xl shadow-xl mt-4">
                                                                                        <span className="text-[12px] font-black uppercase italic">BALANCE DUE</span>
                                                                                        <span className="text-3xl font-black italic tracking-tighter">₹{toBePaid.toLocaleString()}</span>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            if (sectionId === 'payment_details') {
                                                                if (invoice?.showPaymentDetails === false || !displayInvoice.paymentDetails) return null;
                                                                return (
                                                                    <div key="payment_details" style={style} className={cn(blockDef.col, "w-full pt-4 border-t border-gray-300/50 relative")}>
                                                                        <div className="p-6 border-2 border-dashed border-gray-300 rounded-[2rem] text-[10px] font-bold text-left uppercase leading-relaxed text-gray-500 bg-white/40 shadow-sm w-full">
                                                                            <p className="text-xs font-black text-black mb-3 border-b-2 border-[#39FF14] pb-1.5 inline-block">PAYMENT DETAILS</p>
                                                                            <div className="whitespace-pre-line tracking-wide">
                                                                                {displayInvoice.paymentDetails}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            if (sectionId === 'payment_qr') {
                                                                if (!displayInvoice.showUPI) return null;
                                                                return (
                                                                    <div key="payment_qr" style={style} className={cn(blockDef.col, "w-full flex justify-end shrink-0 pt-4 border-t border-gray-300/50 relative")}>
                                                                        <div className="bg-white p-3 rounded-2xl border border-gray-200 inline-block shadow-sm shrink-0 mb-4">
                                                                            <img 
                                                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${displayInvoice.upiId}&pn=NEWBI&am=${toBePaid}&cu=INR`)}`} 
                                                                                alt="Payment QR" 
                                                                                className="w-[100px] h-[100px] grayscale contrast-125 mx-auto"
                                                                                crossOrigin="anonymous"
                                                                            />
                                                                            <p className="text-[8px] font-black text-center mt-2 text-gray-400 tracking-widest uppercase italic font-bold">Scan to pay</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            if (sectionId === 'signatory') {
                                                                if (!displayInvoice.showSignatureBlock) return null;
                                                                return (
                                                                    <div key="signatory" style={style} className={cn(blockDef.col, "w-full flex justify-end mt-4 relative")}>
                                                                        <div className="flex flex-col items-end text-right">
                                                                            {displayInvoice.showSignatory === 'image' && displayInvoice.signatoryImage ? (
                                                                                <img src={displayInvoice.signatoryImage} alt="Signature" className="h-16 mb-2 object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                                            ) : displayInvoice.showSignatory === 'text' ? (
                                                                                <div className="h-16 flex items-end justify-center">
                                                                                    <p className="font-heading italic text-lg leading-none border-b border-gray-400 pb-1 px-4">{displayInvoice.senderName || 'Authorized Signatory'}</p>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="h-16" />
                                                                            )}
                                                                            <div className="w-40 pt-3 border-t-2 border-dashed border-gray-400 text-center">
                                                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-700 italic font-bold">Authorized Signature</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            return null;
                                                        })}
                                                    </div>
                                                )}

                                            </div>

                                                {displayInvoice.showFooter !== false && (
                                                    <footer 
                                                        className="absolute bottom-4 left-10 right-10 h-10 flex items-center justify-between px-10 rounded-full border border-black/10 shadow-lg z-50 bg-[#39FF14]/40"
                                                        style={{
                                                            transform: `translate(${(displayInvoice.layoutOrder?.find(i => (typeof i === 'object' ? i.id : i) === 'footer') || {}).x || 0}px, ${(displayInvoice.layoutOrder?.find(i => (typeof i === 'object' ? i.id : i) === 'footer') || {}).y || 0}px) scale(${(displayInvoice.layoutOrder?.find(i => (typeof i === 'object' ? i.id : i) === 'footer') || {}).scale || 0.85})`,
                                                            transformOrigin: 'bottom center'
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between w-full text-black">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">CALL</span>
                                                                <p className="text-[10px] font-black tracking-widest uppercase font-bold">+91 93043 72773</p>
                                                            </div>
                                                            <div className="flex items-center gap-3 border-x border-black/10 px-10 h-10">
                                                                <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">EMAIL</span>
                                                                <p className="text-[10px] font-black tracking-widest uppercase font-bold">partnership@newbi.live</p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">WEB</span>
                                                                <p className="text-[10px] font-black tracking-widest uppercase font-bold">newbi.live</p>
                                                            </div>
                                                        </div>
                                                    </footer>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Invoice;
