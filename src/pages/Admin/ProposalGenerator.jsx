import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, LayoutGrid, Download, RefreshCw, X, FileSpreadsheet, Send, FileText, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Target, Users, Zap, Briefcase, CreditCard, ShieldCheck, Eye, EyeOff, Settings, Building2, Layers, Image as ImageIcon, ClipboardList, Undo2, Upload, Sparkles, Cpu } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import SignatureModal from '../../components/ui/SignatureModal';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { generateFullDocument } from '../../lib/ai';
import AIPromptBox from '../../components/admin/AIPromptBox';
import DocumentSeal from '../../components/ui/DocumentSeal';

// Markdown-like formatting toolbar for textareas â€” defined outside to prevent remount on parent re-render

const ProposalGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addProposal, updateProposal, proposals, user, addToast } = useStore();
    const [previewScale, setPreviewScale] = useState(0.65);
    const previewContainerRef = useRef(null);

    const [activeTab, setActiveTab] = useState('1'); 
    const [currentPreviewPage, setCurrentPreviewPage] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatingSection, setGeneratingSection] = useState(null); // 'all', 'strategy', 'scope', 'deliverables', etc.
    const [promptBoxClear, setPromptBoxClear] = useState(false);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [bulkRawText, setBulkRawText] = useState('');

    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
    ];

    const [formData, setFormData] = useState({
        clientName: '',
        clientAddress: '',
        campaignName: '',
        campaignDuration: '',
        proposalNumber: `NBQ-${Math.floor(1000 + Math.random() * 9000)}`,
        coverDescription: 'This comprehensive commercial instrument details the strategic execution architecture and deployment framework proposed by Newbi Entertainment for the success of your upcoming mission.',
        overview: '',
        primaryGoal: '',
        numericTargets: '',
        audienceAge: '',
        audienceLocation: '',
        audienceInterests: '',
        selectedChannels: [],
        contentCount: { reels: 0, posts: 0, stories: 0 },
        deliverables: [{ id: 1, item: '', qty: '', timeline: '' }],
        clientRequirements: [{ id: 1, description: '' }],
        scopeOfWork: '',
        terms: '1. 50% Advance Fee required.\n2. Balance on delivery.\n3. Taxes as applicable (18% GST).\n4. Quote valid for 14 days.',
        paymentDetails: 'Account Name: YOUR NAME\nAccount Number: 0000000000\nIFSC: YOUR000000\nUPI: yourname@upi',
        gstRate: 18,
        advanceRequested: 50,
        showGst: true,
        showSeal: false,
        showSignatures: false,
        signatureType: 'handwritten', // 'handwritten' | 'digital' | 'typed'
        providerSignature: '',
        clientSignature: '',
        senderName: 'Authorized Signatory',
        senderDesignation: 'Director of Operations',
        status: 'Draft',
        hiddenFields: [],
        selectedLogo: 'entertainment' 
    });

    const currentLogo = logoOptions.find(l => l.id === formData.selectedLogo) || logoOptions[0];

    const [items, setItems] = useState([
        { id: 1, description: 'Project Phase 01: Initial Strategic Planning', qty: 1, unit: 'Phase', price: 0 }
    ]);

    useEffect(() => {
        if (id && proposals.length > 0) {
            const proposal = proposals.find(p => p.id === id);
            if (proposal) {
                setFormData({ ...proposal, hiddenFields: proposal.hiddenFields || [], selectedLogo: proposal.selectedLogo || 'entertainment' });
                setItems(proposal.items || []);
            }
        }
    }, [id, proposals]);

    useEffect(() => {
        const handleResize = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth;
                // Aggressive Width-Fit
                const scaleWidth = containerWidth / 794;
                setPreviewScale(Math.max(0.1, Math.min(2.0, scaleWidth)));
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const gstAmount = formData.showGst ? (subtotal * formData.gstRate) / 100 : 0;
    const totalAmount = subtotal + gstAmount;

    const toggleFieldVisibility = (field) => {
        setFormData(prev => {
            const current = prev.hiddenFields || [];
            const updated = current.includes(field) ? current.filter(f => f !== field) : [...current, field];
            return { ...prev, hiddenFields: updated };
        });
    };

    const isHidden = (f) => (formData.hiddenFields || []).includes(f);

    const VisibilityToggle = ({ field, label }) => (
        <button 
            onClick={() => toggleFieldVisibility(field)}
            className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all text-[8px] font-black uppercase tracking-[0.1em]",
                isHidden(field) 
                    ? "bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10" 
                    : "bg-[#39FF14]/5 border-[#39FF14]/20 text-[#39FF14]/70 hover:bg-[#39FF14]/10 hover:text-[#39FF14]"
            )}
        >
            {isHidden(field) ? <EyeOff size={10} /> : <Eye size={10} />}
            {label || (isHidden(field) ? "Hidden" : "Live")}
        </button>
    );

    const getPaginatedPages = () => {
        const pages = [];
        pages.push({ type: 'cover', items: [] });
        if (!isHidden('roadmap') && (!isHidden('overview') || !isHidden('primaryGoal'))) {
            pages.push({ type: 'strategy', items: [] });
        }
        if (!isHidden('scopeOfWork') && formData.scopeOfWork) {
            const scopeLines = formData.scopeOfWork.split('\n');
            const linesPerPage = 28;
            if (scopeLines.length <= linesPerPage) {
                pages.push({ type: 'scope', items: [], scopeText: formData.scopeOfWork });
            } else {
                for (let s = 0; s < scopeLines.length; s += linesPerPage) {
                    pages.push({ type: 'scope', items: [], scopeText: scopeLines.slice(s, s + linesPerPage).join('\n'), scopePage: Math.floor(s / linesPerPage) + 1 });
                }
            }
        }
        if (!isHidden('proposal')) {
            pages.push({ type: 'proposal', items: [] });
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
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const rawProposalData = { ...formData, items, totalAmount, subtotal, updatedAt: new Date().toISOString() };
            const proposalData = JSON.parse(JSON.stringify(rawProposalData));
            if (id) await updateProposal(id, proposalData);
            else await addProposal({ ...proposalData, createdAt: new Date().toISOString() });
            
            setPromptBoxClear(true);
            setTimeout(() => setPromptBoxClear(false), 100);
            
            navigate('/admin/proposals');
        } catch (error) {
            alert("Save Error: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };
    const handleGenerateProposal = async (prompt) => {
        setIsGenerating(true);
        setGeneratingSection('all');
        try {
            const data = await generateFullDocument('proposal', prompt, 'Premium', {});
            setFormData(prev => ({
                ...prev,
                clientName: data.clientName || prev.clientName,
                clientAddress: data.clientAddress || prev.clientAddress,
                campaignName: data.campaignName || prev.campaignName,
                campaignDuration: data.campaignDuration || prev.campaignDuration,
                coverDescription: data.coverDescription || prev.coverDescription,
                overview: data.overview || prev.overview,
                primaryGoal: data.primaryGoal || prev.primaryGoal,
                scopeOfWork: data.scopeOfWork || prev.scopeOfWork,
                terms: data.terms || prev.terms,
                // NOTE: Never overwrite paymentDetails â€” user has their own bank details pre-configured
                deliverables: data.deliverables?.length 
                    ? data.deliverables.map((d, i) => ({ 
                        id: Date.now() + i, 
                        item: d.item || d.name || '', 
                        qty: d.qty || '1', 
                        timeline: d.timeline || 'TBD' 
                    })) 
                    : prev.deliverables,
                clientRequirements: data.clientRequirements?.length 
                    ? data.clientRequirements.map((r, i) => ({ 
                        id: Date.now() + 100 + i, 
                        description: r.description || r.requirement || '' 
                    })) 
                    : prev.clientRequirements,
            }));
            if (data.items && data.items.length > 0) {
                setItems(data.items.map((item, idx) => ({
                    id: Date.now() + 200 + idx,
                    description: item.description || item.name || '',
                    qty: Number(item.qty) || 1,
                    unit: item.unit || 'Unit',
                    price: Number(item.price) || 0
                })));
            }
        } catch (error) {
            alert("AI Generation failed: " + error.message);
        } finally {
            setIsGenerating(false);
            setGeneratingSection(null);
        }
    };


    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        const pages = getPaginatedPages();
        const mapping = { '1': 'cover', '2': 'strategy', '3': 'scope', '4': 'proposal', '5': 'table', '6': 'commercials' };
        const targetType = mapping[tabId];
        const pageIndex = pages.findIndex(p => p.type === targetType);
        if (pageIndex !== -1) setCurrentPreviewPage(pageIndex);
    };

    const generatePDF = async () => {
        setIsSaving(true);
        const originalScale = previewScale;
        setPreviewScale(1);
        await new Promise(r => setTimeout(r, 800));
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            // Use a separate container that has all pages rendered
            const pages = document.querySelectorAll('.pdf-export-only .proposal-page-render');
            if (pages.length === 0) {
                // Fallback to preview if export-only not found (shouldn't happen)
                const singlePage = document.querySelector('.proposal-page-render');
                if (singlePage) {
                    const canvas = await html2canvas(singlePage, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
                    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
                }
            } else {
                for (let i = 0; i < pages.length; i++) {
                    const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
                    if (i > 0) pdf.addPage();
                    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
                }
            }
            pdf.save(`Newbi-Quotation-${formData.clientName || 'Proposal'}.pdf`);
        } catch (error) {
            console.error(error);
        } finally {
            setPreviewScale(originalScale);
            setIsSaving(false);
        }
    };

    const paginatedPages = getPaginatedPages();

    const tabs = [
        { id: '0', label: 'Briefing', icon: Zap, desc: 'Project Source Data', visibilityKey: null },
        { id: '1', label: 'Identity', icon: FileText, desc: 'Basic Information', visibilityKey: null },
        { id: '2', label: 'Architecture', icon: Target, desc: 'Strategic Framework', visibilityKey: 'strategy' },
        { id: '3', label: 'Scope', icon: ClipboardList, desc: 'Project Scope', visibilityKey: 'scopeOfWork' },
        { id: '4', label: 'Deliverables', icon: Layers, desc: 'What we deliver', visibilityKey: 'proposal' },
        { id: '5', label: 'Commercials', icon: Briefcase, desc: 'Financial Details', visibilityKey: 'inventory' },
        { id: '6', label: 'Settlement', icon: CreditCard, desc: 'Payment Terms', visibilityKey: 'commercials' }
    ];

    // Render markdown-formatted text into styled JSX for the document preview
    const inlineFmt = (text) => {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black">$1</strong>')
            .replace(/__(.*?)__/g, '<strong class="font-black">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
            .replace(/_(.*?)_/g, '<em class="italic">$1</em>');
    };

    const renderFormatted = (text, baseClass = '') => {
        if (!text) return null;
        const rawLines = text.split('\n');
        const lines = [];
        rawLines.forEach(rl => {
            const parts = rl.split(/\s(?=\d+\.\s)/);
            if (parts.length > 1) lines.push(...parts);
            else lines.push(rl);
        });

        const elements = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
            if (!line && i < lines.length - 1) {
                elements.push(<div key={`spacer-${i}`} className="h-3" />);
                i++;
                continue;
            }

            if (line.match(/^[-*_]{3,}$/)) {
                elements.push(<div key={`hr-${i}`} className="h-[1.5px] bg-black/10 my-8 w-full" />);
                i++;
                continue;
            }

            if (line.startsWith('## ')) {
                elements.push(<p key={i} className="text-[14px] font-black text-black uppercase tracking-[0.2em] mt-8 mb-3 border-b border-black pb-1.5">{line.slice(3)}</p>);
            } else if (line.match(/^[•\-\*]\s/)) {
                const items = [];
                while (i < lines.length && lines[i].trim().match(/^[•\-\*]\s/)) {
                    items.push(lines[i].trim().replace(/^[•\-\*]\s/, ''));
                    i++;
                }
                elements.push(
                    <div key={`ul-${i}`} className="pl-4 space-y-1.5 my-3">
                        {items.map((item, j) => <div key={j} className="flex items-start gap-3"><span className="text-neon-green mt-1.5 text-[8px]">●</span><span className={cn("text-[13px] font-medium text-black leading-[1.9]", baseClass)} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} /></div>)}
                    </div>
                );
                continue;
            } else if (line.match(/^\d+\.\s/)) {
                const items = [];
                while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
                    const l = lines[i].trim();
                    const match = l.match(/^(\d+)\.\s(.*)/);
                    if (match) {
                        items.push({ num: match[1], text: match[2] });
                    } else {
                        items.push({ num: '•', text: l.replace(/^\d+\.\s/, '') });
                    }
                    i++;
                }
                elements.push(
                    <div key={`ol-${i}`} className="pl-4 space-y-2 my-4">
                        {items.map((item, j) => (
                            <div key={j} className="flex items-start gap-3">
                                <span className="text-[11px] font-black text-gray-400 mt-0.5 w-6 shrink-0">{item.num}.</span>
                                <span className={cn("text-[13px] font-medium text-black leading-[1.9]", baseClass)} dangerouslySetInnerHTML={{ __html: inlineFmt(item.text) }} />
                            </div>
                        ))}
                    </div>
                );
                continue;
            } else if (line) {
                elements.push(<p key={i} className={cn("text-[13px] font-medium text-black leading-[1.9] text-justify", baseClass)} dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />);
            }
            i++;
        }
        return <div>{elements}</div>;
    };

    const renderContent = (content, baseClass = '') => {
        if (!content) return null;
        const isHtml = content.includes('<') && content.includes('>');
        
        if (isHtml) {
            return (
                <div 
                    className={cn("article-content", baseClass)} 
                    dangerouslySetInnerHTML={{ __html: content }} 
                />
            );
        }
        
        return renderFormatted(content, baseClass);
    };

    // Inline bold/italic formatting

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-neon-green selection:text-black font-['Outfit'] overflow-hidden flex flex-col">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                .font-signature { font-family: 'Caveat', cursive; }
            `}} />

            {/* Top Bar */}
            <header className="h-16 md:h-20 border-b border-white/5 bg-black/50 backdrop-blur-3xl flex items-center justify-between px-4 md:px-8 shrink-0 relative z-50">
                <div className="flex items-center gap-2 md:gap-4 min-w-0">
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        <Link to="/admin/proposals" className="p-2.5 md:p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 group"><ArrowLeft size={16} md={18} /></Link>
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <h1 className="text-sm md:text-xl font-black tracking-tighter uppercase italic text-white truncate leading-none">Quotation <span className="text-neon-green">Engine.</span></h1>
                        <p className="text-[7px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1 truncate">Strategic Command</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                    <button 
                        onClick={() => setShowPreviewMobile(!showPreviewMobile)} 
                        className="lg:hidden h-10 px-3 bg-neon-green/10 rounded-xl border border-neon-green/20 text-neon-green flex items-center gap-2 active:scale-95 transition-all"
                    >
                        <Eye size={14} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Preview</span>
                    </button>
                    <button onClick={handleSave} className="h-10 md:h-12 px-3 md:px-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl transition-all flex items-center gap-2">
                        <Save size={14} className="sm:hidden" />
                        <span className="hidden sm:inline">Save</span>
                    </button>
                    <button onClick={generatePDF} className="h-10 md:h-12 px-4 md:px-8 bg-neon-green text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl shadow-[0_10px_30px_rgba(57,255,20,0.3)] hover:scale-105 transition-all flex items-center gap-2">
                        {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />} 
                        <span className="hidden sm:inline">Export Proposal</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                <aside className="hidden lg:flex w-72 border-r border-white/5 bg-zinc-900/20 flex-col p-6 gap-6 overflow-y-auto scrollbar-hide">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-4 mb-4">Navigation</p>
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left group", activeTab === tab.id ? "bg-white text-black shadow-xl" : "hover:bg-white/5 text-gray-500 hover:text-white")}>
                                <div className={cn("p-2.5 rounded-xl transition-all", activeTab === tab.id ? "bg-black/20" : "bg-white/5 group-hover:bg-white/10")}><tab.icon size={18} /></div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{tab.label}</p>
                                    <p className={cn("text-[9px] font-bold opacity-60 uppercase tracking-tighter", activeTab === tab.id ? "text-black" : "text-gray-600")}>{tab.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Mobile Bottom Navigation */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-[100] px-4 flex items-center justify-around no-scrollbar">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={cn("flex flex-col items-center justify-center min-w-[64px] h-full transition-all gap-1", activeTab === tab.id ? "text-neon-green" : "text-gray-500")}>
                            <tab.icon size={20} />
                            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label.split(' ')[0]}</span>
                            {activeTab === tab.id && <div className="w-1 h-1 rounded-full bg-[#39FF14] mt-1 shadow-[0_0_8px_#39FF14]" />}
                        </button>
                    ))}
                </div>


                {/* Editor Area */}
                <section className="flex-1 overflow-y-auto px-8 py-16 scrollbar-hide bg-[#050505] pb-32">
                    <div className="max-w-7xl mx-auto space-y-12">
                        
                        <AIPromptBox 
                            onGenerate={handleGenerateProposal} 
                            isGenerating={isGenerating && generatingSection === 'all' && !showBulkImport} 
                            type="proposal" 
                            forceClear={promptBoxClear}
                        />

                        <div className="flex flex-col md:flex-row items-end justify-between mb-8 pb-6 border-b border-white/5 group/header">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] opacity-80 mb-1">
                                    Phase {tabs.findIndex(t => t.id === activeTab) + 1} of {tabs.length}
                                </p>
                                <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">
                                    {currentTab?.label}<span className="text-neon-green">.</span>
                                </h2>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pt-1">
                                    {currentTab?.desc}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                                {/* Compact Progress Line */}
                                <div className="w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-neon-green transition-all duration-700 shadow-[0_0_10px_rgba(57,255,20,0.8)]" 
                                        style={{ width: `${(tabs.findIndex(t => t.id === activeTab) + 1) / tabs.length * 100}%` }} 
                                    />
                                </div>

                                {currentTab?.visibilityKey && (
                                    <div className="flex items-center gap-2 translate-y-1">
                                        <button 
                                            onClick={async () => {
                                                setGeneratingSection(currentTab.id);
                                                setIsGenerating(true);
                                                try {
                                                    const refined = await generateFullDocument('proposal', `Refine the ${currentTab.label} section for: ${formData.campaignName}. Current state for context: ${JSON.stringify(formData)}`, 'Premium');
                                                    setFormData(prev => ({...prev, ...refined}));
                                                    addToast(`AI Refinement successful for ${currentTab.label}`, 'success');
                                                } catch (e) {
                                                    addToast(e.message, 'error', e.code);
                                                } finally {
                                                    setIsGenerating(false);
                                                    setGeneratingSection(null);
                                                }
                                            }}
                                            disabled={isGenerating}
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 text-gray-400 rounded-full hover:bg-neon-green/10 hover:text-neon-green transition-all text-[8px] font-black uppercase tracking-[0.1em] border border-white/10 hover:border-neon-green/20"
                                        >
                                            {isGenerating && generatingSection === currentTab.id ? <RefreshCw className="animate-spin" size={10} /> : <Sparkles size={10} />}
                                            Refine
                                        </button>
                                        <VisibilityToggle field={currentTab.visibilityKey} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {activeTab === '1' && (
                            <div className="mb-12 flex justify-end">
                                <Button 
                                    onClick={() => setShowBulkImport(true)} 
                                    variant="outline" 
                                    className="border-white/10 hover:bg-white/5 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-zinc-900/50 text-white"
                                >
                                    <Upload size={14} />
                                    Smart Bulk Import
                                </Button>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-16">
                                {activeTab === '0' && (
                                    <div className="space-y-12">
                                        <div className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-10 space-y-10">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Paste Project Brief / Raw Data</label>
                                                    <span className="text-[10px] font-black text-neon-green bg-neon-green/10 px-3 py-1 rounded-full uppercase">AI Enabled</span>
                                                </div>
                                                <textarea 
                                                    value={bulkRawText} 
                                                    onChange={e => setBulkRawText(e.target.value)} 
                                                    className="w-full bg-black/40 border border-white/5 p-8 rounded-[32px] font-bold text-sm outline-none focus:border-neon-green/40 transition-all min-h-[300px] leading-relaxed scrollbar-hide text-white placeholder:text-gray-700" 
                                                    placeholder="Paste meeting notes, emails, or raw requirements here... The AI will extract everything automatically." 
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Upload Reference Files</label>
                                                    <div className="group relative h-48 rounded-[32px] border-2 border-dashed border-white/10 hover:border-neon-green/50 hover:bg-neon-green/[0.02] transition-all flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden">
                                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" multiple onChange={(e) => {
                                                            // For now, just a visual feedback
                                                            const files = Array.from(e.target.files);
                                                            if (files.length) alert(`${files.length} files attached. In this version, please paste the text content for AI processing.`);
                                                        }} />
                                                        <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-neon-green group-hover:text-black transition-all">
                                                            <Upload size={24} />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-xs font-black text-white uppercase tracking-widest">Drop Briefs / PDFs</p>
                                                            <p className="text-[9px] font-bold text-gray-500 uppercase mt-1">Up to 10MB per file</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-end space-y-4">
                                                    <div className="p-4 bg-neon-green/5 rounded-2xl border border-neon-green/10 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-neon-green">
                                                            <Sparkles size={12} />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">Smart Extraction</span>
                                                        </div>
                                                        <p className="text-[8px] font-bold text-gray-600 leading-relaxed uppercase">Our AI will automatically map names, objectives, deliverables, and line items from your source.</p>
                                                    </div>
                                                    <Button 
                                                        onClick={async () => {
                                                            if (!bulkRawText.trim()) return;
                                                            setIsGenerating(true);
                                                            setGeneratingSection('all');
                                                            try {
                                                                await handleGenerateProposal(bulkRawText);
                                                                addToast("Proposal generated successfully", "success");
                                                                setActiveTab('1'); // Move to Identity after success
                                                            } catch (e) {
                                                                addToast(e.message, 'error', e.code);
                                                            } finally {
                                                                setIsGenerating(false);
                                                                setGeneratingSection(null);
                                                            }
                                                        }} 
                                                        disabled={isGenerating || !bulkRawText.trim()}
                                                        className="h-14 rounded-xl bg-neon-green text-black text-[10px] font-black uppercase tracking-[0.2em] gap-2 shadow-[0_0_30px_rgba(57,255,20,0.2)] hover:scale-[1.02] transition-all w-full"
                                                    >
                                                        {isGenerating && generatingSection === 'all' ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                                                        Initialize AI Build
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeTab === '1' && (
                                    <div className="space-y-12">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Division Branding</label>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                                                {logoOptions.map(logo => (
                                                    <button key={logo.id} onClick={() => setFormData({...formData, selectedLogo: logo.id})} className={cn("p-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2 overflow-hidden relative group/btn", formData.selectedLogo === logo.id ? "bg-neon-green border-neon-green text-black scale-105 shadow-xl" : "bg-zinc-900 border-white/5 text-gray-500 hover:text-white")}>
                                                        <div className="w-full aspect-[4/3] rounded-xl bg-white flex items-center justify-center p-2 relative overflow-hidden">
                                                            <img src={logo.path} alt={logo.label} className="w-full h-full object-contain" />
                                                            <div className="absolute inset-0 bg-black/5" />
                                                        </div>
                                                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest relative z-10 leading-tight">{logo.label}</span>
                                                        {formData.selectedLogo === logo.id && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-black animate-pulse" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Client Entity</label>
                                                    
                                                </div>
                                                <input value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" placeholder="Organization Name" />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Project Name</label>
                                                    
                                                </div>
                                                <input value={formData.campaignName} onChange={e => setFormData({...formData, campaignName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" placeholder="Project or Event Title" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Client Address</label>
                                                    <VisibilityToggle field="clientAddress" />
                                                </div>
                                                <input value={formData.clientAddress} onChange={e => setFormData({...formData, clientAddress: e.target.value})} className={cn("w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all", isHidden('clientAddress') && "opacity-30")} placeholder="Business Location" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Timeline / Duration</label>
                                                <input value={formData.campaignDuration} onChange={e => setFormData({...formData, campaignDuration: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" placeholder="e.g. 15th - 20th Oct or 3 Months" />
                                            </div>
                                        </div>
                                            <div className="relative group/editor">
                                                <div className="absolute right-0 -top-10 opacity-0 group-hover/editor:opacity-100 transition-opacity z-10">
                                                    
                                                </div>
                                                <StudioRichEditor 
                                                    label="Cover Memorandum"
                                                    value={formData.coverDescription} 
                                                    onChange={val => setFormData({...formData, coverDescription: val})} 
                                                    className={isHidden('coverDescription') ? 'opacity-30' : ''} 
                                                    placeholder="Cover page description for this proposal..." 
                                                    minHeight="180px" 
                                                    accentColor="neon-green"
                                                />
                                            </div>
                                    </div>
                                )}
                                {activeTab === '2' && (
                                    <div className="space-y-12">
                                        <div className="relative group/editor">
                                            <div className="absolute right-0 -top-10 opacity-0 group-hover/editor:opacity-100 transition-opacity z-10">
                                                
                                            </div>
                                            <StudioRichEditor 
                                                label="Executive Summary"
                                                value={formData.overview} 
                                                onChange={val => setFormData({...formData, overview: val})} 
                                                className={isHidden('overview') ? 'opacity-30' : ''} 
                                                placeholder="Strategic vision..." 
                                                minHeight="200px" 
                                                accentColor="neon-green"
                                            />
                                        </div>
                                        <div className="relative group/editor">
                                            <div className="absolute right-0 -top-10 opacity-0 group-hover/editor:opacity-100 transition-opacity z-10">
                                                
                                            </div>
                                            <StudioRichEditor 
                                                label="Primary Objective"
                                                value={formData.primaryGoal} 
                                                onChange={val => setFormData({...formData, primaryGoal: val})} 
                                                className={isHidden('primaryGoal') ? 'opacity-30' : ''} 
                                                placeholder="Strategic / Tactical Goal" 
                                                minHeight="120px" 
                                                accentColor="neon-green"
                                            />
                                        </div>
                                    </div>
                                )}
                                {activeTab === '3' && (
                                    <div className="space-y-12">
                                        <div className="relative group/editor">
                                            <div className="absolute right-0 -top-10 opacity-0 group-hover/editor:opacity-100 transition-opacity z-10">
                                                
                                            </div>
                                            <StudioRichEditor 
                                                label="Scope of Work"
                                                value={formData.scopeOfWork} 
                                                onChange={val => setFormData({...formData, scopeOfWork: val})} 
                                                className={isHidden('scopeOfWork') ? 'opacity-30' : ''} 
                                                placeholder="Use bullet points for each scope item. Group under headings." 
                                                minHeight="400px" 
                                                accentColor="neon-green"
                                            />
                                        </div>
                                    </div>
                                )}
                                {activeTab === '4' && (
                                    <div className="space-y-16">
                                        {/* Deliverables Section */}
                                        <div className="space-y-8">
                                            <div className="flex justify-between items-center px-2">
                                                 <div className="flex items-center gap-4">
                                                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">What we deliver</label>
                                                     <VisibilityToggle field="deliverables" />
                                                 </div>
                                                 <button onClick={() => setFormData({...formData, deliverables: [...(formData.deliverables || []), { id: Date.now(), item: '', qty: '', timeline: '' }]})} className="p-3 bg-neon-green text-black rounded-xl hover:scale-105 transition-all shadow-xl"><Plus size={16} /></button>
                                             </div>
                                            <div className={cn("space-y-4 transition-opacity", isHidden('deliverables') && "opacity-30")}>
                                                {(formData.deliverables || []).map((d, idx) => (
                                                    <div key={d.id} className="flex items-start gap-4 bg-zinc-900/40 p-5 rounded-3xl border border-white/5 group transition-all hover:bg-zinc-900/60">
                                                        <span className="text-[10px] font-black text-gray-600 mt-4 w-6 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                                                        <div className="flex-1 space-y-3">
                                                            <input value={d.item} onChange={e => { const updated = [...formData.deliverables]; updated[idx] = {...d, item: e.target.value}; setFormData({...formData, deliverables: updated}); }} className="w-full bg-transparent border-b border-white/10 pb-2 text-sm font-bold outline-none focus:border-neon-green/40 transition-all text-white placeholder:text-gray-600" placeholder="Deliverable description..." />
                                                            <div className="flex gap-4">
                                                                <input value={d.qty} onChange={e => { const updated = [...formData.deliverables]; updated[idx] = {...d, qty: e.target.value}; setFormData({...formData, deliverables: updated}); }} className="w-32 bg-black/40 border border-white/10 h-10 px-4 rounded-lg text-[10px] font-bold outline-none focus:border-neon-green/40 text-gray-300 placeholder:text-gray-600" placeholder="Qty / Unit" />
                                                                <input value={d.timeline} onChange={e => { const updated = [...formData.deliverables]; updated[idx] = {...d, timeline: e.target.value}; setFormData({...formData, deliverables: updated}); }} className="flex-1 bg-black/40 border border-white/10 h-10 px-4 rounded-lg text-[10px] font-bold outline-none focus:border-neon-green/40 text-gray-300 placeholder:text-gray-600" placeholder="Timeline (e.g. Week 1-2)" />
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setFormData({...formData, deliverables: formData.deliverables.filter(x => x.id !== d.id)})} className="p-2 text-gray-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg mt-3"><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Client Requirements Section */}
                                        <div className="space-y-8 pt-10 border-t border-white/5">
                                            <div className="flex justify-between items-center px-2">
                                                 <div className="flex items-center gap-4">
                                                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Requirements from Client</label>
                                                     <VisibilityToggle field="clientRequirements" />
                                                 </div>
                                                 <button onClick={() => setFormData({...formData, clientRequirements: [...(formData.clientRequirements || []), { id: Date.now(), description: '' }]})} className="p-3 bg-neon-green text-black rounded-xl hover:scale-105 transition-all shadow-xl"><Plus size={16} /></button>
                                             </div>
                                            <div className={cn("space-y-4 transition-opacity", isHidden('clientRequirements') && "opacity-30")}>
                                                {(formData.clientRequirements || []).map((r, idx) => (
                                                    <div key={r.id} className="flex items-center gap-4 bg-zinc-900/40 p-4 pl-6 rounded-3xl border border-white/5 group transition-all hover:bg-zinc-900/60">
                                                        <span className="text-[10px] font-black text-gray-600 w-6 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                                                        <input value={r.description} onChange={e => { const updated = [...formData.clientRequirements]; updated[idx] = {...r, description: e.target.value}; setFormData({...formData, clientRequirements: updated}); }} className="flex-1 bg-transparent border-none text-sm font-bold outline-none text-white placeholder:text-gray-600" placeholder="What the client needs to provide..." />
                                                        <button onClick={() => setFormData({...formData, clientRequirements: formData.clientRequirements.filter(x => x.id !== r.id)})} className="p-2 text-gray-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeTab === '5' && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4 px-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resource Inventory</label>
                                            <VisibilityToggle field="inventory" />
                                        </div>
                                        <div className={cn("space-y-12 transition-opacity", isHidden('inventory') && "opacity-30")}>
                                            <div className="flex justify-between items-center px-4"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resource Table</h4><button disabled={isHidden('inventory')} onClick={() => setItems([...items, { id: Date.now(), description: '', qty: 1, price: 0 }])} className="p-3 bg-neon-green text-black rounded-xl hover:scale-105 transition-all shadow-xl disabled:opacity-30"><Plus size={16} /></button></div>
                                            <div className="space-y-4">{items.map((item, idx) => (
                                                <div key={item.id} className="flex items-center gap-6 bg-zinc-900/40 p-4 pl-6 rounded-3xl border border-white/5 group transition-all hover:bg-zinc-900/60">
                                                    <div className="flex-1"><textarea disabled={isHidden('inventory')} value={item.description} onChange={e => { const newItems = [...items]; newItems[idx].description = e.target.value; setItems(newItems); }} rows={1} className="w-full bg-transparent border-none p-0 text-sm font-bold outline-none resize-none scrollbar-hide text-white placeholder:text-gray-600" placeholder="Resource Description..." /></div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex flex-col items-center"><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Qty</span><input disabled={isHidden('inventory')} type="number" value={item.qty} onChange={e => { const newItems = [...items]; newItems[idx].qty = Number(e.target.value); setItems(newItems); }} className="w-16 bg-black/40 border border-white/10 h-10 rounded-lg text-center text-xs font-black outline-none focus:border-neon-green/50" /></div>
                                                        <div className="flex flex-col items-end"><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 pr-2">Price</span><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neon-green">â‚¹</span><input disabled={isHidden('inventory')} type="number" value={item.price} onChange={e => { const newItems = [...items]; newItems[idx].price = Number(e.target.value); setItems(newItems); }} className="w-32 bg-black/40 border border-white/10 h-10 pl-7 pr-4 rounded-lg text-right text-xs font-black text-neon-green outline-none focus:border-neon-green/50" /></div></div>
                                                        <button disabled={isHidden('inventory')} onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-2.5 text-gray-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg disabled:opacity-30"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            ))}</div>
                                        </div>
                                    </div>
                                )}
                                {activeTab === '6' && (
                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                            <div className="space-y-4"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">GST Percentage</label><input type="number" value={formData.gstRate} onChange={e => setFormData({...formData, gstRate: Number(e.target.value)})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" /></div>
                                            <div className="space-y-4"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Advance Fee (%)</label><input type="number" value={formData.advanceRequested} onChange={e => setFormData({...formData, advanceRequested: Number(e.target.value)})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" /></div>
                                        </div>
                                        <div className="relative group/editor">
                                            <div className="absolute right-0 -top-10 opacity-0 group-hover/editor:opacity-100 transition-opacity z-10">
                                                
                                            </div>
                                            <div className="flex justify-between items-center px-2 mb-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Terms & Conditions</label>
                                                <VisibilityToggle field="terms" />
                                            </div>
                                            <StudioRichEditor 
                                                value={formData.terms} 
                                                onChange={val => setFormData({...formData, terms: val})} 
                                                className={isHidden('terms') ? 'opacity-30' : ''} 
                                                minHeight="200px" 
                                                accentColor="neon-green"
                                            />
                                        </div>
                                        {/* Document Settings Section */}
                                        <div className="p-10 bg-zinc-900/40 border border-white/5 rounded-[40px] space-y-8">
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black uppercase tracking-tighter italic">Document Settings</h3>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global authentication preferences</p>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <button 
                                                    onClick={() => setFormData({...formData, showSeal: !formData.showSeal})} 
                                                    className={cn(
                                                        "p-6 rounded-[32px] border transition-all flex flex-col items-center justify-center gap-4 text-center group",
                                                        formData.showSeal ? "bg-white text-black border-white shadow-[0_0_40px_rgba(255,255,255,0.1)]" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Eye size={14} className={cn(formData.showSeal ? "text-black" : "text-white/20")} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Official Seal</span>
                                                    </div>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => setFormData({...formData, showSignatures: !formData.showSignatures})} 
                                                    className={cn(
                                                        "p-6 rounded-[32px] border transition-all flex flex-col items-center justify-center gap-4 text-center group",
                                                        formData.showSignatures ? "bg-white text-black border-white shadow-[0_0_40px_rgba(255,255,255,0.1)]" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Eye size={14} className={cn(formData.showSignatures ? "text-black" : "text-white/20")} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-center">Digital Signatures</span>
                                                    </div>
                                                </button>
                                            </div>

                                            {formData.showSeal && (
                                                <div className="flex justify-center p-12 bg-black/40 rounded-[32px] border border-white/5 overflow-hidden">
                                                    <DocumentSeal className="scale-75 origin-center" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Authorization Sections */}
                                        {formData.showSignatures && (
                                            <div className="space-y-6">
                                                {/* Provider Authorization (Newbi) */}
                                                <div className="p-10 bg-zinc-900/40 border border-white/5 rounded-[40px] space-y-8">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Provider Authorization</h3>
                                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sign on behalf of Newbi Entertainment</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input 
                                                                value={formData.senderName} 
                                                                onChange={e => setFormData({...formData, senderName: e.target.value})} 
                                                                placeholder="Signatory Name" 
                                                                className="h-10 w-48 bg-black/40 border border-white/10 rounded-xl px-4 text-[10px] font-bold text-white outline-none focus:border-neon-green/40" 
                                                            />
                                                            <input 
                                                                value={formData.senderDesignation} 
                                                                onChange={e => setFormData({...formData, senderDesignation: e.target.value})} 
                                                                placeholder="Designation" 
                                                                className="h-10 w-48 bg-black/40 border border-white/10 rounded-xl px-4 text-[10px] font-bold text-white outline-none focus:border-neon-green/40" 
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => setIsSignatureModalOpen(true)}
                                                                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 text-white"
                                                            >
                                                                <PenTool size={14} /> Capture Signature
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div 
                                                        onClick={() => setIsSignatureModalOpen(true)}
                                                        className="relative h-40 bg-black/40 rounded-[32px] border border-white/5 flex items-center justify-center group overflow-hidden cursor-pointer hover:bg-black/60 transition-all"
                                                    >
                                                        {formData.providerSignature ? (
                                                            <div className="relative group w-full h-full flex items-center justify-center p-8">
                                                                <img src={formData.providerSignature} alt="Provider Signature" className="max-h-full object-contain invert brightness-200" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                                    <RefreshCw size={24} className="text-white" />
                                                                </div>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setFormData({...formData, providerSignature: null}); }}
                                                                    className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-3 text-white/10">
                                                                <PenTool size={32} />
                                                                <span className="text-xs font-black uppercase tracking-[0.5em]">Click to Sign</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                            </div>
                                        )}

                                        <div className={cn("space-y-4 relative group/editor", isHidden('paymentDetails') && "opacity-30")}>
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bank Details</label>
                                                <VisibilityToggle field="paymentDetails" />
                                            </div>
                                            <textarea 
                                                value={formData.paymentDetails} 
                                                onChange={e => setFormData({...formData, paymentDetails: e.target.value})} 
                                                className="w-full bg-zinc-900 border border-white/10 p-6 rounded-2xl font-mono font-bold text-sm outline-none focus:border-neon-green/40 transition-all min-h-[150px]" 
                                                placeholder="Account Name, Number, IFSC, etc..." 
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Section Navigation Footer */}
                        <div className="mt-20 pt-8 border-t border-white/5 flex items-center justify-between pb-12">
                            <button 
                                onClick={() => {
                                    const idx = tabs.findIndex(t => t.id === activeTab);
                                    if (idx > 0) handleTabClick(tabs[idx - 1].id);
                                }}
                                disabled={activeTab === tabs[0].id}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-0 disabled:pointer-events-none"
                            >
                                <ChevronLeft size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Previous</span>
                            </button>

                            <button 
                                onClick={() => {
                                    const idx = tabs.findIndex(t => t.id === activeTab);
                                    if (idx < tabs.length - 1) handleTabClick(tabs[idx + 1].id);
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                                    activeTab === tabs[tabs.length - 1].id 
                                        ? "bg-white/5 text-gray-500 cursor-not-allowed opacity-50" 
                                        : "bg-neon-green text-black hover:scale-105 shadow-[0_0_20px_rgba(57,255,20,0.2)]"
                                )}
                            >
                                <span>{activeTab === tabs[tabs.length - 1].id ? 'Final Step' : 'Next Section'}</span>
                                {activeTab !== tabs[tabs.length - 1].id && <ChevronRight size={16} />}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Doc Preview */}
                <section className={cn(
                    "lg:static lg:flex fixed inset-0 z-[60] lg:z-0 bg-[#050505] lg:bg-zinc-900/10 flex-col overflow-hidden shrink-0 transition-transform duration-500 lg:translate-x-0",
                    "w-full lg:w-[400px] 2xl:w-[600px] border-l border-white/5",
                    showPreviewMobile ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                )}>
                    <div className="h-20 lg:h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowPreviewMobile(false)} className="lg:hidden p-3 bg-white/5 rounded-xl border border-white/5"><ArrowLeft size={18} /></button>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Document Live View</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setCurrentPreviewPage(Math.max(0, currentPreviewPage - 1))} disabled={currentPreviewPage === 0} className="p-2.5 bg-white/5 rounded-xl disabled:opacity-20 hover:bg-white/10 transition-all"><ChevronLeft size={16} /></button>
                            <span className="text-[10px] font-black text-neon-green">{currentPreviewPage + 1} / {paginatedPages.length}</span>
                            <button onClick={() => setCurrentPreviewPage(Math.min(paginatedPages.length - 1, currentPreviewPage + 1))} disabled={currentPreviewPage === paginatedPages.length - 1} className="p-2.5 bg-white/5 rounded-xl disabled:opacity-20 hover:bg-white/10 transition-all"><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    <div ref={previewContainerRef} className="flex-1 bg-[#050505] flex flex-col items-center justify-start p-0 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
                        <div style={{ 
                            width: `${794 * previewScale}px`,
                            height: `${1123 * previewScale}px`,
                            flexShrink: 0,
                            position: 'relative'
                        }}>
                            <div style={{ 
                                width: '794px', 
                                height: '1123px', 
                                transform: `scale(${previewScale})`, 
                                transformOrigin: 'top left',
                                position: 'absolute',
                                top: 0,
                                left: 0
                            }}>
                                <AnimatePresence mode="wait">
                                <motion.div key={currentPreviewPage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[15mm] shadow-2xl rounded-[2px]">
                                    <div className={cn("flex justify-between items-end mb-8 pb-4 border-b-2 border-black", currentPreviewPage > 0 && "mb-4 pb-2 opacity-40 border-gray-200")}>
                                        <div className="flex flex-col gap-6 items-start">
                                            <img src={currentLogo.path} alt="Logo" className={cn("h-16 w-auto object-contain", currentPreviewPage > 0 && "h-8")} crossOrigin="anonymous" />
                                        </div>
                                        <div className="text-right space-y-3">
                                            <div><h4 className={cn("text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0", currentPreviewPage > 0 && "text-[7px]")}>Quotation</h4><p className={cn("text-lg font-black text-black tracking-widest font-mono", currentPreviewPage > 0 && "text-sm")}>{formData.proposalNumber}</p></div>
                                            {currentPreviewPage === 0 && (
                                                <div className="space-y-0.5"><p className="text-[8px] font-black text-gray-400 uppercase">Issue Date</p><p className="text-[10px] font-black text-black">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto scrollbar-hide relative">
                                        <div className="absolute inset-0 flex flex-col px-1">
                                        {paginatedPages[currentPreviewPage]?.type === 'cover' && (
                                            <div className="h-full flex flex-col justify-start space-y-20 py-8">
                                                <div className="grid grid-cols-2 gap-10">
                                                    <div className="space-y-6 min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug break-words">{formData.clientName || 'Valued Partner'}</h2>{!isHidden('clientAddress') && <p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{formData.clientAddress || 'Client Address'}</p>}</div></div>
                                                    <div className="space-y-6 text-right min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Engagement Mission</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug italic break-words">{formData.campaignName || 'Mission Title'}</h2><p className="text-[12px] font-black text-neon-green bg-black px-3 py-1 inline-block uppercase tracking-widest">Period: {formData.campaignDuration || 'TBD'}</p></div></div>
                                                </div>
                                                <div className="pt-16 space-y-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-1 bg-black" />
                                                        <p className="text-[11px] font-black uppercase tracking-[0.6em]">Strategic Project Memorandum</p>
                                                    </div>
                                                    {!isHidden('coverDescription') && (
                                                        <div className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl">
                                                            {renderContent(formData.coverDescription || 'Cover description pending...')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{formData.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Strategic Commercial</p></div></div>
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'strategy' && (
                                            <div className="space-y-12 py-10 px-4">
                                                <div className="space-y-2 border-l-4 border-black pl-8">
                                                    <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.5em]">Strategic Context</p>
                                                    <h3 className="text-5xl font-black text-black tracking-tighter uppercase leading-none">Architecture.</h3>
                                                </div>
                                                {!isHidden('overview') && (
                                                    <div className="text-[14px] leading-[1.8] text-gray-700 font-medium text-justify">
                                                        {renderContent(formData.overview || 'Strategic framework pending...')}
                                                    </div>
                                                )}
                                                {!isHidden('primaryGoal') && (
                                                    <div className="pt-16 p-12 bg-zinc-50 border border-gray-100 rounded-3xl space-y-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-[2px] bg-black" />
                                                            <p className="text-[10px] font-black text-black uppercase tracking-[0.4em]">Engagement Mission</p>
                                                        </div>
                                                        <div className="text-2xl font-black text-black leading-tight italic tracking-tight">{renderContent(formData.primaryGoal)}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'scope' && (
                                            <div className="h-full flex flex-col py-10 px-4">
                                                <div className="space-y-2 mb-16 border-l-4 border-black pl-8">
                                                    <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.5em]">Project Definition</p>
                                                    <h3 className="text-5xl font-black text-black tracking-tighter uppercase leading-none">Scope of Work.</h3>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="pl-0">
                                                        {renderContent(paginatedPages[currentPreviewPage]?.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-8")}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'proposal' && (
                                            <div className="space-y-12 py-10 px-4">
                                                <div className="space-y-2 mb-16 border-l-4 border-black pl-8">
                                                    <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.5em]">Service Matrix</p>
                                                    <h3 className="text-5xl font-black text-black tracking-tighter uppercase leading-none">Deliverables.</h3>
                                                </div>
                                                
                                                {!isHidden('deliverables') && (
                                                    <div className="space-y-6">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="border-b-4 border-black text-[10px] font-black uppercase text-black tracking-[0.3em]">
                                                                    <th className="py-6 pr-4">Specification</th>
                                                                    <th className="py-6 px-4 text-center w-32">Volume</th>
                                                                    <th className="py-6 pl-4 text-right w-40">Timeline</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y-2 divide-gray-100">
                                                                {formData.deliverables.filter(d => d.item).map((d, i) => (
                                                                    <tr key={d.id}>
                                                                        <td className="py-8 pr-4">
                                                                            <p className="text-[15px] font-black text-black mb-1 uppercase tracking-tight">{d.item}</p>
                                                                            <p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Spec ID: {String(i+1).padStart(3, '0')}</p>
                                                                        </td>
                                                                        <td className="py-8 px-4 text-center text-[14px] font-black text-gray-500">{d.qty || '—'}</td>
                                                                        <td className="py-8 pl-4 text-right text-[11px] font-black text-black uppercase tracking-widest bg-zinc-50/50">{d.timeline || '—'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {!isHidden('clientRequirements') && (
                                                    <div className="pt-8 border-t border-gray-100">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Prerequisites</p>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {formData.clientRequirements.filter(r => r.description).map((r, i) => (
                                                                <div key={r.id} className="flex items-start gap-3 p-4 bg-zinc-50 rounded-lg">
                                                                    <span className="w-1.5 h-1.5 bg-neon-green rounded-full mt-1.5 shrink-0" />
                                                                    <p className="text-[12px] font-bold text-black leading-tight">{r.description}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'table' && (
                                            <div className="space-y-12 py-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-black text-neon-green uppercase tracking-widest">Section 04</span>
                                                        <div className="h-[1px] flex-1 bg-gray-100" />
                                                    </div>
                                                    <h3 className="text-4xl font-black text-black tracking-tight leading-none">Commercials.</h3>
                                                </div>
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b-2 border-black text-[10px] font-black uppercase text-black tracking-widest">
                                                            <th className="py-4 pr-4">Description</th>
                                                            <th className="py-4 px-4 text-center w-24">Qty</th>
                                                            <th className="py-4 pl-4 text-right w-48">Value (INR)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {paginatedPages[currentPreviewPage].items.map((item, i) => (
                                                            <tr key={i}>
                                                                <td className="py-6 pr-4 text-[13px] font-bold text-black">{item.description}</td>
                                                                <td className="py-6 px-4 text-center text-[12px] font-bold text-gray-500">{item.qty}</td>
                                                                <td className="py-6 pl-4 text-right text-[13px] font-black tracking-widest text-black font-mono">â‚¹{item.price.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'commercials' && (
                                            <div className="space-y-12 py-6">
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-black text-neon-green uppercase tracking-widest">Finalization</span>
                                                        <div className="h-[1px] flex-1 bg-gray-100" />
                                                    </div>
                                                    <h3 className="text-4xl font-black text-black tracking-tight leading-none">Summary & Terms.</h3>
                                                </div>
                                                <div className="grid grid-cols-2 gap-16 items-start">
                                                    <div className="space-y-8">
                                                        {!isHidden('terms') && (
                                                            <div className="space-y-4">
                                                                <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b border-gray-100 pb-2">Conditions</h4>
                                                                <div className="text-[11px] font-medium text-gray-500 leading-relaxed space-y-2">{renderContent(formData.terms)}</div>
                                                            </div>
                                                        )}
                                                        {!isHidden('paymentDetails') && (
                                                            <div className="pt-8 border-t border-gray-100">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Settlement Details</p>
                                                                <div className="text-[11px] font-mono font-bold text-black whitespace-pre-line bg-zinc-50 p-6 rounded-lg">{formData.paymentDetails}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center py-4 border-b border-gray-100"><span className="text-[11px] font-bold text-gray-400 uppercase">Subtotal</span><span className="text-lg font-black text-black font-mono">₹{subtotal.toLocaleString()}</span></div>
                                                        {formData.showGst && (<div className="flex justify-between items-center py-4 border-b border-gray-100"><span className="text-[11px] font-bold text-gray-400 uppercase">GST ({formData.gstRate}%)</span><span className="text-lg font-black text-black font-mono">₹{gstAmount.toLocaleString()}</span></div>)}
                                                        <div className="p-10 bg-black text-right relative overflow-hidden shadow-xl"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Estimated Cost</p><h2 className="text-6xl font-black tracking-tighter text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2><div className="absolute top-0 right-0 w-2 h-full bg-neon-green" /></div>
                                                        {formData.advanceRequested > 0 && (
                                                            <div className="mt-8 p-6 bg-black text-white rounded-lg flex justify-between items-center">
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Advance Fee ({formData.advanceRequested}%)</span>
                                                                <span className="text-xl font-black font-mono">₹{(totalAmount * formData.advanceRequested / 100).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Authentication Layer */}
                                                <div className="mt-12 pt-12 border-t border-gray-100 grid grid-cols-2 gap-16 relative">
                                                    {/* Provider Signature */}
                                                    <div className="space-y-6">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">For Newbi Entertainment</p>
                                                        <div className="h-32 flex items-center justify-start relative">
                                                            {formData.showSignatures && formData.providerSignature ? (
                                                                <img src={formData.providerSignature} alt="Provider Signature" className="h-full object-contain grayscale" />
                                                            ) : (
                                                                <p className="text-[18px] font-formal italic text-black opacity-40">{formData.senderName || 'Authorized Signatory'}</p>
                                                            )}
                                                            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-black/10" />
                                                        </div>
                                                        <p className="text-[9px] font-black text-black uppercase tracking-widest">{formData.senderName || 'Authorized Signatory'}</p>
                                                        <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">{formData.senderDesignation || 'Director of Operations'}</p>
                                                    </div>

                                                    {/* Client Signature */}
                                                    <div className="space-y-6 text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">For {formData.clientName || 'Valued Partner'}</p>
                                                        <div className="h-32 flex items-center justify-end relative">
                                                            {formData.showSignatures && formData.clientSignature ? (
                                                                <img src={formData.clientSignature} alt="Client Signature" className="h-full object-contain grayscale" />
                                                            ) : (
                                                                <p className="text-[18px] font-formal italic text-black opacity-20">Type name to sign</p>
                                                            )}
                                                            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-black/10" />
                                                        </div>
                                                        <p className="text-[9px] font-black text-black uppercase tracking-widest">Acknowledged & Accepted</p>
                                                    </div>

                                                    {/* Official Seal Overlay */}
                                                    {formData.showSeal && (
                                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-80 mix-blend-multiply">
                                                            <DocumentSeal className="w-44 h-44" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-8 pb-10 border-t border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">
                                        <p>Newbi Entertainment ©</p>
                                        <p className="text-black">Page {currentPreviewPage + 1} of {paginatedPages.length}</p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </section>
            </main>



            {/* Hidden container for PDF export — renders all pages for html2canvas */}
            <div className="pdf-export-only fixed -left-[9999px] top-0 pointer-events-none overflow-hidden bg-white">
                {paginatedPages.map((page, idx) => (
                    <div key={idx} className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[15mm] mb-10">
                        <div className={cn("flex justify-between items-end mb-8 pb-4 border-b-2 border-black", idx > 0 && "mb-4 pb-2 opacity-40 border-gray-200")}>
                            <div className="flex flex-col gap-6 items-start">
                                <img src={currentLogo.path} alt="Logo" className={cn("h-16 w-auto object-contain", idx > 0 && "h-8")} crossOrigin="anonymous" />
                            </div>
                            <div className="text-right space-y-3">
                                <div><h4 className={cn("text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0", idx > 0 && "text-[7px]")}>Quotation</h4><p className={cn("text-lg font-black text-black tracking-widest font-mono", idx > 0 && "text-sm")}>{formData.proposalNumber}</p></div>
                                {idx === 0 && (
                                    <div className="space-y-0.5"><p className="text-[8px] font-black text-gray-400 uppercase">Issue Date</p><p className="text-[10px] font-black text-black">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            <div className="absolute inset-0 overflow-hidden flex flex-col px-1">
                            {page.type === 'cover' && (
                                <div className="h-full flex flex-col justify-start space-y-20 py-8">
                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="space-y-6 min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug break-words">{formData.clientName || 'Valued Partner'}</h2>{!isHidden('clientAddress') && <p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{formData.clientAddress || 'Client Address'}</p>}</div></div>
                                        <div className="space-y-6 text-right min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Project Specification</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug italic break-words">{formData.campaignName || 'Project Title'}</h2><p className="text-[12px] font-black text-neon-green bg-black px-3 py-1 inline-block uppercase tracking-widest">Duration: {formData.campaignDuration || 'TBD'}</p></div></div>
                                    </div>
                                    <div className="pt-16 space-y-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-1 bg-black" />
                                            <p className="text-[11px] font-black uppercase tracking-[0.6em]">Official Strategic Quotation</p>
                                        </div>
                                        {!isHidden('coverDescription') && (
                                            <div className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl">
                                                {renderContent(formData.coverDescription || 'Cover description pending...')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{formData.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Strategic Commercial</p></div></div>
                                </div>
                            )}
                            {page.type === 'strategy' && (
                                <div className="space-y-16 py-8">
                                    <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Project Timeline.</h3><div className="w-16 h-1 bg-neon-green" /></div>
                                    {!isHidden('overview') && <div className="text-lg font-medium leading-[1.7] text-gray-700">{renderContent(formData.overview || 'Strategic framework pending...')}</div>}
                                    {!isHidden('primaryGoal') && (
                                        <div className="pt-12">
                                            <div className="p-12 border-2 border-black rounded-[2.5rem] space-y-6">
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Primary Objective</p>
                                                <div className="text-lg font-black text-black leading-relaxed">{renderContent(formData.primaryGoal || 'Objective pending...')}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {page.type === 'scope' && (
                                <div className="h-full flex flex-col py-8">
                                    <div className="space-y-4 mb-12">
                                        <h3 className="text-3xl font-black uppercase tracking-tighter text-black">Scope of Work.</h3>
                                        <div className="w-16 h-1 bg-black" />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <div className="relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-neon-green" />
                                            <div className="pl-10">
                                                {!page.scopePage && <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">Execution Framework</p>}
                                                {page.scopePage > 1 && <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">Execution Framework (Continued)</p>}
                                                {renderContent(page.scopeText || '')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-12 flex items-center gap-4 border-t border-gray-100">
                                        <div className="w-10 h-10 bg-black flex items-center justify-center"><span className="text-[8px] font-black text-neon-green">NB</span></div>
                                        <div>
                                            <p className="text-[11px] font-black text-black">Newbi Entertainment</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {page.type === 'proposal' && (
                                <div className="space-y-16 py-8">
                                    <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Deliverables & Specs.</h3><div className="w-16 h-1 bg-neon-green" /></div>
                                    {(formData.deliverables?.length > 0 && formData.deliverables.some(d => d.item)) && !isHidden('deliverables') && (
                                        <div className="space-y-6">
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Deliverables</p>
                                            <table className="w-full text-left border-collapse border-2 border-black">
                                                <thead>
                                                    <tr className="bg-black text-[9px] font-black uppercase text-white tracking-[0.3em]">
                                                        <th className="p-5 w-10">#</th>
                                                        <th className="p-5">Deliverable</th>
                                                        <th className="p-5 text-center w-28 border-x border-white/20">Qty / Unit</th>
                                                        <th className="p-5 text-right w-40">Timeline</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {formData.deliverables.filter(d => d.item).map((d, i) => (
                                                        <tr key={d.id} className="hover:bg-gray-50">
                                                            <td className="p-5 text-[11px] font-black text-gray-400">{String(i + 1).padStart(2, '0')}</td>
                                                            <td className="p-5 text-[12px] font-bold text-black">{d.item}</td>
                                                            <td className="p-5 text-center text-[12px] font-bold text-gray-600 border-x border-gray-100">{d.qty || '—'}</td>
                                                            <td className="p-5 text-right text-[11px] font-black text-black uppercase tracking-wider">{d.timeline || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {(formData.clientRequirements?.length > 0 && formData.clientRequirements.some(r => r.description)) && (
                                        <div className="space-y-6 pt-4">
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Requirements From Client</p>
                                            <div className="p-8 border-2 border-gray-200 space-y-0">
                                                {formData.clientRequirements.filter(r => r.description).map((r, i) => (
                                                    <div key={r.id} className={cn("flex items-start gap-4 py-4", i > 0 && "border-t border-gray-100")}>
                                                        <div className="w-8 h-8 bg-black flex items-center justify-center shrink-0 mt-0.5"><span className="text-[9px] font-black text-white">{String(i + 1).padStart(2, '0')}</span></div>
                                                        <p className="text-[12px] font-bold text-black leading-relaxed">{r.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {page.type === 'table' && (
                                <div className="space-y-12 py-8">
                                    <div className="space-y-4"><h3 className="text-3xl font-black uppercase text-black">Financial Summary.</h3><div className="w-16 h-1 bg-black" /></div>
                                    <table className="w-full text-left border-collapse border-2 border-black"><thead><tr className="bg-black text-[10px] font-black uppercase text-white tracking-[0.4em] border-b-2 border-black"><th className="p-6">Resource Inventory</th><th className="p-6 text-center w-24 border-x border-white/20">Qty</th><th className="p-6 text-right w-48">Amount (INR)</th></tr></thead><tbody className="divide-y divide-gray-200">{page.items.map((item, i) => (<tr key={i} className="hover:bg-gray-50"><td className="p-6 text-[13px] font-black uppercase text-black text-justify">{item.description || 'Asset'}</td><td className="p-6 text-center text-[13px] font-bold text-gray-600 border-x border-gray-100">{item.qty}</td><td className="p-6 text-right text-[13px] font-black tracking-widest text-black">₹{item.price.toLocaleString()}</td></tr>))}</tbody></table>
                                </div>
                            )}
                            {page.type === 'commercials' && (
                                <div className="space-y-16 py-8">
                                    <div className="grid grid-cols-2 gap-16 items-start">
                                        <div className="space-y-12">
                                            {!isHidden('terms') && <div className="space-y-6"><h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">General Terms</h4><div className="text-[11px] font-semibold text-gray-600 leading-relaxed">{renderContent(formData.terms)}</div></div>}
                                            {!isHidden('paymentDetails') && <div className="p-8 bg-gray-50 border border-gray-200 space-y-4"><p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Payment Information</p><div className="text-[11px] font-semibold font-mono text-black leading-relaxed">{renderContent(formData.paymentDetails)}</div></div>}
                                        </div>
                                        <div className="space-y-6">
                                            <div className="p-8 border-2 border-black flex flex-col items-start gap-1 bg-gray-50"><span className="text-[11px] font-black text-black uppercase tracking-widest">Total Net Project Value</span><span className="text-xl font-black text-black tracking-widest font-mono">₹{subtotal.toLocaleString()}</span></div>
                                            {formData.showGst && (
                                                <div className="p-8 border border-gray-200 flex flex-col items-start gap-1 text-gray-500">
                                                    <span className="text-[10px] font-black uppercase">GST ({formData.gstRate}%)</span>
                                                    <span className="text-xl font-black font-mono">₹{gstAmount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="p-10 bg-black text-right relative overflow-hidden shadow-xl">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Quotation Value</p>
                                                <h2 className="text-6xl font-black tracking-tighter text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2>
                                                <div className="absolute top-0 right-0 w-2 h-full bg-neon-green" />
                                            </div>
                                            {(formData.advanceRequested > 0) && (
                                                <div className="p-8 bg-neon-green/10 border-2 border-neon-green/20 flex flex-col items-start gap-2">
                                                    <span className="text-[11px] font-black text-black uppercase tracking-widest">Advance Fee Required</span>
                                                    <span className="text-3xl font-black text-black font-mono italic">₹{(totalAmount * (formData.advanceRequested || 50) / 100).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Authentication Layer (Export) */}
                                    {(formData.showSeal || formData.showSignatures) && (
                                        <div className="mt-20 pt-12 border-t-2 border-black/5 grid grid-cols-2 gap-20 relative">
                                            {/* Provider Signature */}
                                            <div className="space-y-6">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">For Newbi Entertainment</p>
                                                <div className="h-40 flex items-center justify-start relative">
                                                    {formData.showSignatures && formData.providerSignature ? (
                                                        <img src={formData.providerSignature} alt="Provider Signature" className="h-full object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                    ) : (
                                                        <p className="text-[24px] font-formal italic text-black opacity-40">{formData.senderName || 'Authorized Signatory'}</p>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
                                                </div>
                                                <p className="text-[11px] font-black text-black uppercase tracking-widest">{formData.senderName || 'Authorized Signatory'}</p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{formData.senderDesignation || 'Director of Operations'}</p>
                                            </div>

                                            {/* Client Signature */}
                                            <div className="space-y-6 text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">For {formData.clientName || 'Valued Partner'}</p>
                                                <div className="h-40 flex items-center justify-end relative">
                                                    {formData.showSignatures && formData.clientSignature ? (
                                                        <img src={formData.clientSignature} alt="Client Signature" className="h-full object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                    ) : (
                                                        <p className="text-[24px] font-formal italic text-black opacity-10">Type name to sign</p>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
                                                </div>
                                                <p className="text-[11px] font-black text-black uppercase tracking-widest">Acknowledged & Accepted</p>
                                            </div>

                                            {/* Official Seal Overlay */}
                                            {formData.showSeal && (
                                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-90 mix-blend-multiply">
                                                    <DocumentSeal className="w-56 h-56" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            </div>
                        </div>
                        <div className="mt-auto pt-8 pb-10 border-t border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">
                            <p>Newbi Entertainment ©</p>
                            <p className="text-black">Page {idx + 1} of {paginatedPages.length}</p>
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {showBulkImport && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkImport(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
                            <div className="p-10 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 text-neon-green">
                                            <Cpu size={24} />
                                            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Smart Bulk Import.</h2>
                                        </div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Paste raw details, emails, or notes</p>
                                    </div>
                                    <button onClick={() => setShowBulkImport(false)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white"><X size={20} /></button>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Raw Project Data</label>
                                    <textarea 
                                        value={bulkRawText} 
                                        onChange={e => setBulkRawText(e.target.value)} 
                                        className="w-full bg-black border border-white/5 p-8 rounded-[32px] font-bold text-sm outline-none focus:border-neon-green/40 transition-all min-h-[400px] leading-relaxed scrollbar-hide text-white placeholder:text-gray-600" 
                                        placeholder="Paste your client requirements, event details, or service lists here... Example: 'Client needs artist logistics for 3 cities, 20 volunteers for 5 days, production for main stage...'" 
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <Button onClick={() => setShowBulkImport(false)} variant="outline" className="flex-1 h-16 rounded-2xl border-white/5 hover:bg-white/5 text-[11px] font-black uppercase tracking-widest text-white">Cancel</Button>
                                    <Button 
                                        onClick={async () => {
                                            if (!bulkRawText.trim()) return;
                                            setIsGenerating(true);
                                            setGeneratingSection('all');
                                            try {
                                                await handleGenerateProposal(bulkRawText);
                                                addToast("Import successful", "success");
                                                setBulkRawText('');
                                                setShowBulkImport(false);
                                            } catch (e) {
                                                addToast(e.message, 'error', e.code);
                                            } finally {
                                                setIsGenerating(false);
                                                setGeneratingSection(null);
                                            }
                                        }} 
                                        disabled={isGenerating || !bulkRawText.trim()}
                                        className="flex-[2] h-16 rounded-2xl bg-neon-green text-black text-[11px] font-black uppercase tracking-widest gap-3 shadow-[0_0_30px_rgba(57,255,20,0.3)] hover:scale-[1.02] transition-all"
                                    >
                                        {isGenerating && generatingSection === 'all' ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                                        Transform Into Proposal
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <SignatureModal 
                isOpen={isSignatureModalOpen} 
                onClose={() => setIsSignatureModalOpen(false)} 
                onSave={(sig) => {
                    setFormData(prev => ({...prev, providerSignature: sig}));
                }}
                initialName="Authorized Signatory"
            />
        </div>
    );
};

export default ProposalGenerator;
