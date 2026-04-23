import React, { useRef, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Printer, CheckCircle, ArrowLeft, Share2, Mail, MessageCircle, FileText, Check, PenTool, Settings, LogOut, LayoutGrid, Zap, ShieldCheck, Layers } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import NotificationBell from '../components/NotificationBell';

const Proposal = () => {
    const { id } = useParams();
    const { proposals, updateProposalStatus, loading, user } = useStore();
    const proposalRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [signatureName, setSignatureName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 850) {
                const newScale = (window.innerWidth - 32) / 850;
                setScale(newScale);
            } else {
                setScale(1);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const proposal = proposals.find(p => p.id === id);
    const isAdmin = (localStorage.getItem('adminAuth') === 'true') || (user?.role === 'super_admin' || user?.role === 'developer');

    useEffect(() => {
        if (proposal && !isAdmin) {
            const updateLastOpened = async () => {
                try {
                    await useStore.getState().updateProposal(id, { lastOpened: new Date().toISOString() });
                } catch (err) {
                    console.error("Analytics error:", err);
                }
            };
            updateLastOpened();
        }
    }, [id, isAdmin, proposal]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020202] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-green"></div>
            </div>
        );
    }

    const displayProposal = proposal || {
        id: "DEMO-PROP-001",
        proposalNumber: "DEMO-001",
        clientName: "Demo Client",
        status: "Demo Mode",
        items: [],
        overview: "Strategic project vision document.",
        hiddenFields: [],
        selectedLogo: 'entertainment'
    };

    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png' },
        { id: 'media', label: 'Newbi Media', path: '/logo_document.png' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/logo_document.png' }
    ];

    const currentLogo = logoOptions.find(l => l.id === displayProposal.selectedLogo) || logoOptions[0];

    const items = displayProposal.items || [];
    const subtotal = items.reduce((sum, item) => sum + ((item.qty || 1) * (item.price || 0)), 0);
    const gstAmount = displayProposal?.showGst ? (subtotal * (displayProposal.gstRate || 18)) / 100 : 0;
    const totalAmount = subtotal + gstAmount;

    const handleDownloadPDF = async () => {
        if (!proposalRef.current) return;
        setIsExporting(true);
        const originalScale = scale;
        setScale(1);
        await new Promise(resolve => setTimeout(resolve, 800));
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageElements = document.querySelectorAll('.proposal-page-render');
            for (let i = 0; i < pageElements.length; i++) {
                const canvas = await html2canvas(pageElements[i], {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#FFFFFF',
                    onclone: (clonedDoc) => {
                        const style = clonedDoc.createElement('style');
                        style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap'); * { font-family: 'Outfit', sans-serif !important; }`;
                        clonedDoc.head.appendChild(style);
                    }
                });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
            }
            pdf.save(`Newbi-Strategic-Memorandum-${displayProposal.clientName}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF.");
        } finally {
            setScale(originalScale);
            setIsExporting(false);
        }
    };

    const handleApproveProposal = async () => {
        if (!signatureName.trim()) {
            alert('Please enter your full name to authorize this quotation.');
            return;
        }
        
        setIsSubmitting(true);
        try {
            await updateProposalStatus(id, 'Accepted');
            await useStore.getState().updateProposal(id, {
                status: 'Accepted',
                approvalMetadata: {
                    signedBy: signatureName,
                    signedAt: new Date().toISOString(),
                    ip: 'Authorized Digital Signature'
                }
            });
            alert('Strategic proposal authorized successfully!');
        } catch (error) {
            console.error('Error approving proposal:', error);
            alert('Authorization failed. Please contact your account manager.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isHidden = (f) => (displayProposal.hiddenFields || []).includes(f);

    const getPaginatedPages = () => {
        const pages = [];
        pages.push({ type: 'cover', items: [] });
        
        if (!isHidden('roadmap') && (!isHidden('overview') || !isHidden('primaryGoal') || !isHidden('scopeOfWork'))) {
            pages.push({ type: 'strategy', items: [] });
        }
        
        if (!isHidden('ecosystem') && (!isHidden('audience') || !isHidden('channels'))) {
            pages.push({ type: 'ecosystem', items: [] });
        }
        
        if (!isHidden('inventory')) {
            let itemsRemaining = [...items];
            if (itemsRemaining.length === 0) pages.push({ type: 'table', items: [] });
            else while (itemsRemaining.length > 0) pages.push({ type: 'table', items: itemsRemaining.splice(0, 10) });
        }
        
        if (!isHidden('commercials') && (!isHidden('terms') || !isHidden('paymentDetails'))) {
            pages.push({ type: 'commercials', items: [] });
        }
        
        return pages;
    };

    const paginatedPages = getPaginatedPages();

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-neon-green selection:text-black font-['Outfit']">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');
                body { font-family: 'Outfit', sans-serif; }
                .font-signature { font-family: 'Alex Brush', cursive; }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .proposal-page-render { margin: 0 !important; box-shadow: none !important; page-break-after: always !important; }
                }
            `}} />

            {!isExporting && (
                <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-3xl border-b border-white/5 h-20 flex items-center px-6 no-print">
                    <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link to={isAdmin ? "/admin/proposals" : "/"} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5"><ArrowLeft size={18} /></Link>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Strategic Quotation</p>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", displayProposal.status === 'Accepted' ? "bg-neon-green" : "bg-blue-500 animate-pulse")} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">{displayProposal.status || 'DRAFT'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => window.print()} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 hidden sm:block"><Printer size={18} /></button>
                            <Button onClick={handleDownloadPDF} className="bg-neon-green text-black font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl shadow-[0_10px_30px_rgba(57,255,20,0.3)]"><Download size={16} className="mr-2" /> Export PDF</Button>
                        </div>
                    </div>
                </nav>
            )}

            <main className="pt-32 pb-32 flex flex-col items-center">
                <div ref={proposalRef} className="flex flex-col gap-16 origin-top transition-transform duration-500" style={{ transform: `scale(${scale})`, marginBottom: `${(scale - 1) * 1123 * paginatedPages.length}px` }}>
                    {paginatedPages.map((page, idx) => (
                        <div key={idx} className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative shadow-[0_60px_120px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col p-[15mm] rounded-[2px]">
                            {/* Header Logic */}
                            <div className={cn("flex justify-between items-end mb-8 pb-4 border-b-2 border-black", idx > 0 && "mb-4 pb-2 opacity-40 border-gray-200")}>
                                <div className="flex flex-col gap-6 items-start">
                                    <img src={currentLogo.path} alt="Logo" className={cn("h-16 w-auto object-contain", idx > 0 && "h-8")} crossOrigin="anonymous" />
                                </div>
                                <div className="text-right space-y-3">
                                    <div><h4 className={cn("text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0", idx > 0 && "text-[7px]")}>Quotation</h4><p className={cn("text-lg font-black text-black tracking-widest font-mono", idx > 0 && "text-sm")}>{displayProposal.proposalNumber}</p></div>
                                    {idx === 0 && (
                                        <div className="space-y-0.5"><p className="text-[8px] font-black text-gray-400 uppercase">Issue Date</p><p className="text-[10px] font-black text-black">{new Date(displayProposal.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1">
                                {page.type === 'cover' && (
                                    <div className="h-full flex flex-col justify-start space-y-20 py-8">
                                        <div className="grid grid-cols-2 gap-20">
                                            <div className="space-y-6"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-4xl font-black uppercase text-black leading-tight">{displayProposal.clientName || 'Valued Partner'}</h2>{!isHidden('clientAddress') && <p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{displayProposal.clientAddress || 'Client Address'}</p>}</div></div>
                                            <div className="space-y-6 text-right"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Engagement Mission</p><div className="space-y-2"><h2 className="text-4xl font-black uppercase text-black leading-tight italic">{displayProposal.campaignName || 'Mission Title'}</h2><p className="text-[12px] font-black text-neon-green bg-black px-3 py-1 inline-block uppercase tracking-widest">Period: {displayProposal.campaignDuration || 'TBD'}</p></div></div>
                                        </div>
                                        <div className="pt-16 space-y-10"><div className="flex items-center gap-4"><div className="w-12 h-1 bg-black" /><p className="text-[11px] font-black uppercase tracking-[0.6em]">Strategic Project Memorandum</p></div><p className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl text-justify">This comprehensive commercial instrument details the strategic execution architecture and deployment framework proposed by Newbi Entertainment for the success of your upcoming mission.</p></div>
                                        <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{displayProposal.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Strategic Commercial</p></div></div>
                                    </div>
                                )}

                                {page.type === 'strategy' && (
                                    <div className="space-y-16 py-8">
                                        <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Execution Roadmap.</h3><div className="w-16 h-1 bg-neon-green" /></div>
                                        {!isHidden('overview') && <p className="text-xl font-medium leading-[1.7] text-gray-700 text-justify max-w-2xl whitespace-pre-line italic">"{displayProposal.overview || "Strategic framework pending..."}"</p>}
                                        <div className="grid grid-cols-2 gap-12 pt-12">
                                            {!isHidden('primaryGoal') && <div className="p-10 border-2 border-black space-y-6"><p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Primary Objective</p><p className="text-2xl font-black uppercase text-black">{displayProposal.primaryGoal || 'Mission Supremacy'}</p></div>}
                                            {!isHidden('scopeOfWork') && displayProposal.scopeOfWork && (<div className="p-10 bg-gray-50 border border-gray-200 space-y-6"><p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Execution Scope</p><p className="text-[13px] font-medium leading-relaxed text-gray-600 whitespace-pre-line text-justify">{displayProposal.scopeOfWork}</p></div>)}
                                        </div>
                                    </div>
                                )}

                                {page.type === 'ecosystem' && (
                                    <div className="space-y-16 py-8">
                                        <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Deployment Architecture.</h3><div className="w-16 h-1 bg-black" /></div>
                                        <div className="grid grid-cols-2 gap-12">
                                            {!isHidden('audience') && (
                                                <div className="space-y-10"><div className="space-y-6"><p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Target Demographics</p><div className="grid grid-cols-2 gap-6"><div><p className="text-[9px] font-black text-gray-400 uppercase mb-1">Targets</p><p className="text-xl font-black text-black">{displayProposal.audienceAge || 'TBD'}</p></div><div><p className="text-[9px] font-black text-gray-400 uppercase mb-1">Zones</p><p className="text-xl font-black text-black">{displayProposal.audienceLocation || 'Metro'}</p></div></div><div className="pt-6 border-t border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Psychographic Profile</p><p className="text-[13px] font-medium text-gray-600 italic leading-relaxed text-justify">{displayProposal.audienceInterests || 'Profiling in progress...'}</p></div></div></div>
                                            )}
                                            {!isHidden('channels') && (
                                                <div className="p-10 border border-gray-200 space-y-8"><p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Resource Ecosystem</p>
                                                    <div className="grid grid-cols-2 gap-3">{(displayProposal.selectedChannels?.length > 0 ? displayProposal.selectedChannels : ['Strategic', 'Digital']).map(ch => (<div key={ch} className="p-3 bg-gray-50 text-[9px] font-black uppercase text-black flex items-center gap-2"><Layers size={10} className="text-neon-green" /> {ch}</div>))}</div>
                                                    {displayProposal.contentCount && (<div className="pt-6 border-t border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase mb-3">Resource Projections</p><div className="flex gap-6">{Object.entries(displayProposal.contentCount).map(([k, v]) => (<div key={k} className="text-center"><p className="text-base font-black text-black">{v}</p><p className="text-[8px] font-bold text-gray-400 uppercase">{k}</p></div>))}</div></div>)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {page.type === 'table' && (
                                    <div className="space-y-12 py-8">
                                        <div className="space-y-4"><h3 className="text-3xl font-black uppercase text-black">Financial Summary.</h3><div className="w-16 h-1 bg-black" /></div>
                                        <table className="w-full text-left border-collapse border-2 border-black"><thead><tr className="bg-black text-[10px] font-black uppercase text-white tracking-[0.4em] border-b-2 border-black"><th className="p-6">Resource Inventory</th><th className="p-6 text-center w-24 border-x border-white/20">Qty</th><th className="p-6 text-right w-48">Amount (INR)</th></tr></thead><tbody className="divide-y divide-gray-200">{page.items.map((item, i) => (<tr key={i} className="hover:bg-gray-50"><td className="p-6 text-[13px] font-black uppercase text-black text-justify">{item.description}</td><td className="p-6 text-center text-[13px] font-bold text-gray-600 border-x border-gray-100">{item.qty}</td><td className="p-6 text-right text-[13px] font-black tracking-widest text-black">₹{item.price.toLocaleString()}</td></tr>))}</tbody></table>
                                    </div>
                                )}

                                {page.type === 'commercials' && (
                                    <div className="space-y-16 py-8">
                                        <div className="grid grid-cols-2 gap-16 items-start">
                                            <div className="space-y-12">
                                                {!isHidden('terms') && <div className="space-y-6"><h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">Strategic Terms</h4><p className="text-[11px] font-bold text-gray-500 whitespace-pre-line italic leading-relaxed text-justify">{displayProposal.terms}</p></div>}
                                                {!isHidden('paymentDetails') && <div className="p-8 bg-gray-50 border border-gray-200 space-y-4"><p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Settlement Repository</p><p className="text-[11px] font-black font-mono whitespace-pre-line text-black leading-relaxed">{displayProposal.paymentDetails}</p></div>}
                                                
                                                {/* Digital Signature Acceptance Area */}
                                                <div className="pt-10 space-y-10 border-t border-gray-100">
                                                    {!displayProposal.approvalMetadata ? (
                                                        <div className="space-y-6 no-print">
                                                            <div className="space-y-2">
                                                                <p className="text-[10px] font-black text-black uppercase tracking-widest">Digital Authorization</p>
                                                                <p className="text-[9px] font-medium text-gray-400">By typing your name, you agree to authorize this strategic project memorandum and its investment terms.</p>
                                                            </div>
                                                            <input 
                                                                value={signatureName} 
                                                                onChange={e => setSignatureName(e.target.value)} 
                                                                placeholder="Type full name to accept" 
                                                                className="w-full bg-gray-50 border-b-2 border-black p-4 text-3xl font-signature italic text-black outline-none focus:bg-white transition-all" 
                                                            />
                                                            <button 
                                                                onClick={handleApproveProposal} 
                                                                disabled={isSubmitting || !signatureName.trim()} 
                                                                className="w-full h-16 bg-black text-white font-black uppercase tracking-widest text-[11px] hover:bg-neon-green hover:text-black transition-all disabled:opacity-30"
                                                            >
                                                                Authorize & Accept Proposal
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="p-10 border-2 border-neon-green/30 bg-neon-green/5 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle size={80} className="text-neon-green" /></div>
                                                            <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] mb-8 flex items-center gap-2"><ShieldCheck size={14} /> Digitally Authorized</p>
                                                            <div className="space-y-2">
                                                                <p className="text-6xl font-signature italic text-black leading-none">{displayProposal.approvalMetadata.signedBy}</p>
                                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Authenticated on {new Date(displayProposal.approvalMetadata.signedAt).toLocaleString('en-GB')}</p>
                                                                <p className="text-[8px] font-bold text-gray-300 uppercase mt-4">Ref: {displayProposal.id}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="p-8 border-2 border-black flex justify-between items-center bg-gray-50"><span className="text-[11px] font-black text-black uppercase tracking-widest">Net Mission Value</span><span className="text-xl font-black text-black tracking-widest font-mono">₹{subtotal.toLocaleString()}</span></div>
                                                {displayProposal.showGst && (<div className="p-8 border border-gray-200 flex justify-between items-center text-gray-500"><span className="text-[10px] font-black uppercase">Tax Applied ({displayProposal.gstRate}%)</span><span className="text-xl font-black font-mono">₹{gstAmount.toLocaleString()}</span></div>)}
                                                <div className="p-10 bg-black text-right relative overflow-hidden shadow-xl"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Strategic Investment</p><h2 className="text-6xl font-black tracking-tighter text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2><div className="absolute top-0 right-0 w-2 h-full bg-neon-green" /></div>
                                                <div className="p-8 bg-neon-green/10 border-2 border-neon-green/20 flex justify-between items-center"><span className="text-[11px] font-black text-black uppercase tracking-widest">Security Deposit Required</span><span className="text-3xl font-black text-black font-mono italic">₹{(totalAmount * (displayProposal.advanceRequested || 50) / 100).toLocaleString()}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-auto pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]"><p>Newbi Entertainment © 2026</p><p className="text-black">Page {idx + 1} of {paginatedPages.length}</p></div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Proposal;
