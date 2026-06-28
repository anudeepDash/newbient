import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Download from 'lucide-react/dist/esm/icons/download';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Save from 'lucide-react/dist/esm/icons/save';
import Check from 'lucide-react/dist/esm/icons/check';
import Loader from 'lucide-react/dist/esm/icons/loader';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import CompanyProfileManager from '../../components/admin/CompanyProfileManager';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';

const logoOptions = [
    { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
    { id: 'media', label: 'Newbi Media', path: '/logo_media.png', color: '#00D1FF' },
    { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
];

const DocumentPDFGenerator = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { genDocuments, addGenDocument, updateGenDocument, user, addToast } = useStore();

    const [autosaveStatus, setAutosaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const [isSaving, setIsSaving] = useState(false);
    const isDirtyRef = useRef(false);
    const initialDataLoadedRef = useRef(false);
    const hasInitializedRef = useRef(false);
    
    const [previewScale, setPreviewScale] = useState(0.8);
    const previewContainerRef = useRef(null);

    const [formData, setFormData] = useState({
        documentNumber: `NBD-${Math.floor(1000 + Math.random() * 9000)}`,
        documentDate: new Date().toISOString().split('T')[0],
        documentTitle: 'PROJECT COMPLETION REPORT',
        selectedLogo: 'entertainment',
        content: '',
        senderName: 'Authorized Signatory',
        senderDesignation: 'Director of Operations',
        status: 'Draft',
    });

    const currentLogo = logoOptions.find(l => l.id === formData.selectedLogo) || logoOptions[0];

    useEffect(() => {
        hasInitializedRef.current = false;
        initialDataLoadedRef.current = false;
    }, [id]);

    useEffect(() => {
        if (!id) {
            initialDataLoadedRef.current = true;
        }
    }, [id]);

    useEffect(() => {
        if (id && genDocuments.length > 0 && !hasInitializedRef.current) {
            const doc = genDocuments.find(d => d.id === id);
            if (doc) {
                setFormData({
                    ...doc,
                    documentDate: doc.documentDate || new Date().toISOString().split('T')[0],
                });
                hasInitializedRef.current = true;
                setTimeout(() => {
                    initialDataLoadedRef.current = true;
                    // Check if download was requested via query param
                    if (searchParams.get('download') === 'true') {
                        generatePDF();
                        // Remove download param so we don't trigger it again
                        navigate(`/admin/edit-gen-document/${id}`, { replace: true });
                    }
                }, 200);
            }
        }
    }, [id, genDocuments, searchParams]);

    useEffect(() => {
        if (initialDataLoadedRef.current) {
            isDirtyRef.current = true;
        }
    }, [formData]);

    useEffect(() => {
        if (!initialDataLoadedRef.current || !isDirtyRef.current) return;

        let active = true;
        const timer = setTimeout(async () => {
            if (!active) return;
            setAutosaveStatus('saving');
            try {
                const docData = { ...formData, updatedAt: new Date().toISOString() };
                
                if (id) {
                    await updateGenDocument(id, docData);
                    if (active) {
                        setAutosaveStatus('saved');
                        isDirtyRef.current = false;
                    }
                } else {
                    const newDocId = await addGenDocument(docData);
                    if (active) {
                        setAutosaveStatus('saved');
                        isDirtyRef.current = false;
                        hasInitializedRef.current = true;
                        initialDataLoadedRef.current = true;
                        navigate(`/admin/edit-gen-document/${newDocId}`, { replace: true });
                    }
                }
            } catch (err) {
                console.error("Document autosave failed:", err);
                if (active) {
                    setAutosaveStatus('error');
                }
            }
        }, 3000);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [formData, id]);

    useEffect(() => {
        const handleResize = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth - 48; // padding
                const scaleWidth = containerWidth / 794;
                setPreviewScale(Math.max(0.3, Math.min(1.5, scaleWidth)));
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const regenerateDocNumber = () => {
        handleChange('documentNumber', `NBD-${Math.floor(1000 + Math.random() * 9000)}`);
    };

    const generatePDF = async () => {
        setIsSaving(true);
        const originalScale = previewScale;
        setPreviewScale(1);
        await new Promise(r => setTimeout(r, 800)); // allow render
        try {
            const [jsPDFModule, html2canvasModule] = await Promise.all([
                import('jspdf'),
                import('html2canvas')
            ]);
            const jsPDF = jsPDFModule.default;
            const html2canvas = html2canvasModule.default;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pages = document.querySelectorAll('.doc-pdf-export .doc-page-render');
            
            if (pages.length === 0) {
                 addToast('No pages found to render.', 'error');
                 return;
            }

            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
            }
            pdf.save(`Newbi-Document-${formData.documentTitle || 'Document'}.pdf`);
            addToast('PDF downloaded successfully', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to generate PDF', 'error');
        } finally {
            setPreviewScale(originalScale);
            setIsSaving(false);
        }
    };

    const renderHeader = (isFirstPage) => (
        <div className={`flex justify-between items-end ${isFirstPage ? 'mb-8 pb-4' : 'mb-6 pb-2'} border-b-2 border-black`}>
            <div className="flex flex-col gap-6 items-start">
                <img src={currentLogo.path} alt="Logo" className={`${isFirstPage ? 'h-16' : 'h-10'} w-auto object-contain`} crossOrigin="anonymous" />
            </div>
            <div className="text-right space-y-3">
                {isFirstPage ? (
                    <>
                        <div>
                            <h4 className="text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0">Document</h4>
                            <p className="text-lg font-black text-black tracking-widest font-mono">{formData.documentNumber}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-black text-gray-400 uppercase">Issue Date</p>
                            <p className="text-[10px] font-black text-black">{new Date(formData.documentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                    </>
                ) : (
                    <div>
                        <p className="text-xs font-black text-black tracking-widest font-mono">{formData.documentNumber}</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderFooter = (pageNum, totalPages) => (
        <div className="mt-auto grid grid-cols-2 gap-10 pt-4 border-t border-gray-100">
            <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">CONFIDENTIAL • OFFICIAL DOCUMENT</p></div>
            <div className="text-right"><p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Page {pageNum} of {totalPages}</p></div>
        </div>
    );

    const DocumentPages = () => {
        return paginatedPages.map((pageHtml, index) => {
            const isFirstPage = index === 0;
            const isLastPage = index === paginatedPages.length - 1;

            return (
                <div key={index} className="doc-page-render bg-white relative overflow-hidden shrink-0 mx-auto w-[794px] h-[1123px] flex flex-col p-[40px] md:p-[60px] shadow-2xl">
                    {/* Background Noise */}
                    <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
                    
                    {renderHeader(isFirstPage)}

                    <div className="flex-1 overflow-hidden relative flex flex-col">
                        <div className="flex-1 flex flex-col justify-start space-y-12 py-4">
                            {isFirstPage && formData.documentTitle && (
                                <div className="text-center">
                                    <h2 className="text-xl font-black uppercase tracking-widest border-b border-black pb-2 inline-block leading-none text-black">
                                        {formData.documentTitle}
                                    </h2>
                                </div>
                            )}

                            <div 
                                className="text-[13px] leading-[1.8] text-gray-800 space-y-4 text-justify px-1"
                                dangerouslySetInnerHTML={{ __html: pageHtml }}
                            />

                            {isLastPage && (
                                <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-end pb-8">
                                    <div className="space-y-2">
                                        <div className="h-16 flex items-end">
                                            <p className="text-lg font-signature text-black italic opacity-35">Authorized Signatory</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[11px] font-black uppercase text-black">{formData.senderName}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{formData.senderDesignation}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center text-[7px] font-black uppercase text-gray-300 tracking-wider select-none">
                                            Corporate Seal
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {renderFooter(index + 1, paginatedPages.length)}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="min-h-screen bg-[#0B0F17] text-white selection:bg-neon-green selection:text-black font-['Outfit'] overflow-x-clip flex flex-col">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden; }
                    .doc-pdf-export, .doc-pdf-export * { visibility: visible; }
                    .doc-pdf-export {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        height: 100% !important;
                        transform: none !important;
                    }
                }
            `}} />

            {/* Top Bar Navigation */}
            <header className="h-20 border-b border-white/5 bg-black/60 backdrop-blur-2xl flex items-center justify-between px-8 sticky top-0 z-[100]">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate('/admin/gen-documents')}
                        className="p-3 bg-white/5 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all hover:scale-105"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                            <FileText size={20} className="text-neon-green" /> Document Generator
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-neon-green uppercase tracking-[0.3em]">
                                {id ? 'Edit Document' : 'New Document'}
                            </span>
                            {/* Autosave Indicator */}
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/5 bg-white/5">
                                {autosaveStatus === 'saving' && <><Loader size={10} className="animate-spin text-neon-blue" /><span className="text-[9px] font-bold text-neon-blue uppercase">Saving</span></>}
                                {autosaveStatus === 'saved' && <><Check size={10} className="text-emerald-400" /><span className="text-[9px] font-bold text-emerald-400 uppercase">Saved</span></>}
                                {autosaveStatus === 'error' && <><AlertCircle size={10} className="text-red-400" /><span className="text-[9px] font-bold text-red-400 uppercase">Save Error</span></>}
                                {autosaveStatus === 'idle' && <><Save size={10} className="text-gray-500" /><span className="text-[9px] font-bold text-gray-500 uppercase">Idle</span></>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={regenerateDocNumber}
                        className="p-3 bg-white/5 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all"
                        title="Regenerate Document Number"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button 
                        onClick={generatePDF}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-neon-green text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-[0_0_20px_rgba(57,255,20,0.2)] disabled:opacity-50"
                    >
                        {isSaving ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                        Export PDF
                    </button>
                </div>
            </header>

            {/* Split Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                {/* Left Side: Controls Panel */}
                <aside className="w-full lg:w-[450px] xl:w-[500px] border-r border-white/5 bg-zinc-950/40 p-8 space-y-8 overflow-y-auto shrink-0">
                    
                    {/* Logo Selection */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Document Logo</p>
                        <div className="grid grid-cols-3 gap-3">
                            {logoOptions.map(logo => (
                                <button
                                    key={logo.id}
                                    onClick={() => handleChange('selectedLogo', logo.id)}
                                    className={cn(
                                        "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all group",
                                        formData.selectedLogo === logo.id
                                            ? "bg-white/[0.05] border-white/30"
                                            : "bg-black/60 border-white/5 hover:border-white/20"
                                    )}
                                >
                                    <div className="h-8 flex items-center justify-center p-1 bg-white/5 rounded-lg w-full">
                                        <img src={logo.path} alt={logo.label} className={cn("h-full w-auto object-contain transition-all", formData.selectedLogo === logo.id ? "" : "opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100")} />
                                    </div>
                                    <p className={cn("text-[9px] font-black uppercase tracking-widest text-center line-clamp-1", formData.selectedLogo === logo.id ? "text-white" : "text-gray-600")}>
                                        {logo.label.replace('Newbi ', '')}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Metadata Settings */}
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Document Details</p>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Document Title</label>
                                <input 
                                    value={formData.documentTitle} 
                                    onChange={e => handleChange('documentTitle', e.target.value.toUpperCase())}
                                    placeholder="e.g. PROJECT COMPLETION REPORT" 
                                    className="h-12 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-black px-4 text-white outline-none" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Document Number</label>
                                    <input 
                                        value={formData.documentNumber} 
                                        onChange={e => handleChange('documentNumber', e.target.value.toUpperCase())}
                                        className="h-12 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-mono font-bold px-4 text-white outline-none" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Issue Date</label>
                                    <input 
                                        type="date"
                                        value={formData.documentDate} 
                                        onChange={e => handleChange('documentDate', e.target.value)}
                                        className="h-12 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-black px-4 text-white outline-none" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Editor Box */}
                    <div className="space-y-3 relative group/editor">
                        <StudioRichEditor 
                            label="Document Content"
                            value={formData.content}
                            onChange={(val) => handleChange('content', val)}
                            placeholder="Draft your document content here..."
                            minHeight="320px"
                            accentColor="neon-green"
                        />
                    </div>

                    {/* Signatory Settings */}
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Signatory Information</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Name</label>
                                <input 
                                    value={formData.senderName} 
                                    onChange={e => handleChange('senderName', e.target.value)}
                                    placeholder="Full Legal Name"
                                    className="h-12 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-black px-4 text-white outline-none" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Designation</label>
                                <input 
                                    value={formData.senderDesignation} 
                                    onChange={e => handleChange('senderDesignation', e.target.value)}
                                    placeholder="e.g. Director"
                                    className="h-12 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-black px-4 text-white outline-none" 
                                />
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Right Side: Mock A4 Document Canvas Preview */}
                <main 
                    ref={previewContainerRef}
                    className="flex-1 bg-[#050505] flex flex-col items-center justify-start p-6 md:p-10 overflow-y-auto overflow-x-hidden relative scrollbar-hide"
                >
                    <div className="absolute top-4 right-8 text-[10px] font-black text-gray-600 uppercase tracking-widest select-none">
                        A4 Live View Scale: {Math.round(previewScale * 100)}%
                    </div>

                    {/* Paper Area - Visible Preview */}
                    <div 
                        className="bg-white text-black relative flex flex-col p-[15mm] shadow-2xl rounded-[2px] overflow-hidden transition-transform"
                        style={{
                            width: '794px',
                            height: '1123px',
                            transform: `scale(${previewScale})`,
                            transformOrigin: 'top center',
                            flexShrink: 0,
                            marginBottom: `${(previewScale - 1) * 1123}px`
                        }}
                    >
                        <DocumentPageContent />
                    </div>
                </main>
            </div>

            {/* Hidden container for PDF export — renders pages for html2canvas */}
            <div className="doc-pdf-export fixed -left-[9999px] top-0 pointer-events-none overflow-hidden bg-white">
                <div className="doc-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[15mm]">
                    <DocumentPageContent />
                </div>
            </div>
        </div>
    );
};

export default DocumentPDFGenerator;
