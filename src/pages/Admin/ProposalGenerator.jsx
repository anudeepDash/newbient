import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, LayoutGrid, Download, RefreshCw, X, FileSpreadsheet, Sparkles, Send, FileText, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Target, Users, Zap, Briefcase, CreditCard, ShieldCheck, Eye, EyeOff, Settings, Building2, Layers, Image as ImageIcon, ClipboardList, Undo2, Upload } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { generateProposalContent, generateFieldRefinement } from '../../services/aiService';
// Markdown-like formatting toolbar for textareas — defined outside to prevent remount on parent re-render
const FormattedTextArea = ({ value, onChange, className, placeholder, minH = 'min-h-[250px]' }) => {
    const textareaRef = useRef(null);
    const historyRef = useRef([]);
    const pushHistory = () => {
        const h = historyRef.current;
        if (h.length === 0 || h[h.length - 1] !== value) {
            h.push(value);
            if (h.length > 30) h.shift();
        }
    };
    const handleUndo = () => {
        const h = historyRef.current;
        if (h.length > 0) {
            const prev = h.pop();
            onChange({ target: { value: prev } });
        }
    };
    const insertFormat = (before, after = '') => {
        pushHistory();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const scroll = ta.scrollTop;
        const selected = value.substring(start, end);
        const newText = value.substring(0, start) + before + (selected || 'text') + after + value.substring(end);
        onChange({ target: { value: newText } });
        setTimeout(() => { ta.focus(); ta.scrollTop = scroll; ta.selectionStart = start + before.length; ta.selectionEnd = start + before.length + (selected || 'text').length; }, 10);
    };
    const insertLine = (prefix) => {
        pushHistory();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const scroll = ta.scrollTop;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
        onChange({ target: { value: newText } });
        setTimeout(() => { ta.focus(); ta.scrollTop = scroll; ta.selectionStart = start + prefix.length; ta.selectionEnd = start + prefix.length; }, 10);
    };
    const handleKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') { e.preventDefault(); insertFormat('**', '**'); }
            else if (e.key === 'i') { e.preventDefault(); insertFormat('*', '*'); }
            else if (e.key === 'h') { e.preventDefault(); insertLine('## '); }
            else if (e.key === 'l') { e.preventDefault(); insertLine('• '); }
            else if (e.key === 'z') { e.preventDefault(); handleUndo(); }
        }
    };
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1 px-4">
                <button type="button" onClick={handleUndo} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Undo (Ctrl+Z)"><Undo2 size={13} /></button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button type="button" onClick={() => insertFormat('**', '**')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Bold (Ctrl+B)"><span className="text-[11px] font-black">B</span></button>
                <button type="button" onClick={() => insertFormat('*', '*')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Italic (Ctrl+I)"><span className="text-[11px] font-bold italic">I</span></button>
                <button type="button" onClick={() => insertLine('## ')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Heading (Ctrl+H)"><span className="text-[11px] font-black">H</span></button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button type="button" onClick={() => insertLine('• ')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Bullet List (Ctrl+L)"><span className="text-[11px] font-bold">•</span></button>
                <button type="button" onClick={() => insertLine('1. ')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Numbered List"><span className="text-[11px] font-bold">1.</span></button>
            </div>
            <textarea ref={textareaRef} value={value} onChange={onChange} onKeyDown={handleKeyDown} className={cn("w-full bg-zinc-900 border border-white/10 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 text-base font-medium outline-none focus:border-neon-green/40 transition-all leading-relaxed", minH, className)} placeholder={placeholder} />
        </div>
    );
};

const ProposalGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addProposal, updateProposal, proposals } = useStore();
    const [previewScale, setPreviewScale] = useState(0.65);
    const previewContainerRef = useRef(null);

    // AI & Workflow State
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiApiKey, setAiApiKey] = useState(localStorage.getItem('geminiApiKey') || import.meta.env.VITE_GEMINI_API_KEY || '');
    
    // Auto-migrate deprecated model names to current generation
    const migrateModel = (m) => {
        if (!m || !m.startsWith('gemini')) return 'gemini-1.5-flash';
        return m;
    };
    const [aiModel, setAiModel] = useState(migrateModel(localStorage.getItem('geminiModel')));
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [showAiSettings, setShowAiSettings] = useState(false);
    const [activeTab, setActiveTab] = useState('1'); 
    const [currentPreviewPage, setCurrentPreviewPage] = useState(0);
    const [refiningField, setRefiningField] = useState(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);

    // Parse structured error from aiService
    const parsedError = (() => {
        if (!aiError) return null;
        try { return JSON.parse(aiError); } catch { return { code: 'NB-999', title: 'Error', message: aiError }; }
    })();

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
        terms: '1. 50% Advance activation fee required.\n2. Balance on delivery.\n3. Taxes as applicable (18% GST).\n4. Quote valid for 14 days.',
        paymentDetails: 'Account Name: ABHINAV ANAND\nAccount Number: 77780102222341\nIFSC: FDRL0007778\nUPI: 6207708566@jupiteraxis',
        gstRate: 18,
        advanceRequested: 50,
        showGst: true,
        senderName: 'Abhinav Anand',
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
                const containerHeight = previewContainerRef.current.clientHeight;
                const scaleWidth = (containerWidth - 60) / 794;
                const scaleHeight = (containerHeight - 60) / 1123;
                setPreviewScale(Math.max(0.3, Math.min(1, scaleWidth, scaleHeight)));
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
        setIsGenerating(true);
        try {
            const proposalData = { ...formData, items, totalAmount, subtotal, updatedAt: new Date().toISOString() };
            if (id) await updateProposal(id, proposalData);
            else await addProposal({ ...proposalData, createdAt: new Date().toISOString() });
            navigate('/admin/proposals');
        } catch (error) {
            alert("Save Error: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt) return;
        setIsGeneratingAi(true);
        setAiError(null);
        try {
            const detailedPrompt = `Generate a high-fidelity strategic quotation for: ${aiPrompt}. 
            IMPORTANT FORMATTING RULES:
            - For scopeOfWork: Use bullet points (• ) with single-line explanations. Group under ## headings. Keep each point concise (one line max).
            - For overview: Write 2-3 concise sentences. No bullet points.
            - For primaryGoal: One powerful sentence.
            - Avoid long paragraphs everywhere. Prefer structured, scannable content.
            Use terminology like 'Execution Roadmap' and 'Strategic Summary'. Avoid words like 'Formal'.`;
            const result = await generateProposalContent(aiApiKey, detailedPrompt, formData, aiModel);
            setFormData(prev => ({ ...prev, ...result }));
            if (result.items) setItems(result.items.map((it, idx) => ({ ...it, id: idx + 1 })));
            setActiveTab('1');
        } catch (error) {
            setAiError(error.message);
        } finally {
            setIsGeneratingAi(false);
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

    const handleRefineField = async (fieldName, fieldLabel) => {
        setRefiningField({ name: fieldName, label: fieldLabel });
    };

    const executeRefinement = async () => {
        if (!refinementPrompt || !refiningField) return;
        setIsGeneratingAi(true);
        setAiError(null);
        try {
            const refinedText = await generateFieldRefinement(aiApiKey, refiningField.name, refiningField.label, formData[refiningField.name], refinementPrompt, aiModel);
            setFormData(prev => ({ ...prev, [refiningField.name]: refinedText }));
            setRefiningField(null);
            setRefinementPrompt('');
        } catch (error) {
            setAiError(error.message);
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const generatePDF = async () => {
        setIsGenerating(true);
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
            setIsGenerating(false);
        }
    };

    const paginatedPages = getPaginatedPages();

    const tabs = [
        { id: '1', label: 'Identity', icon: FileText, desc: 'Project Configuration', visibilityKey: null },
        { id: '2', label: 'Roadmap', icon: Target, desc: 'Execution Strategy', visibilityKey: 'roadmap' },
        { id: '3', label: 'Scope', icon: ClipboardList, desc: 'Scope of Work', visibilityKey: 'scopeOfWork' },
        { id: '4', label: 'Proposal', icon: Layers, desc: 'Deliverables & Requirements', visibilityKey: 'proposal' },
        { id: '5', label: 'Inventory', icon: Briefcase, desc: 'Service & Resource Inventory', visibilityKey: 'inventory' },
        { id: '6', label: 'Commercials', icon: CreditCard, desc: 'Financial Projections', visibilityKey: 'commercials' }
    ];

    const VisibilityToggle = ({ field, label }) => (
        <button 
            onClick={() => toggleFieldVisibility(field)} 
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[9px] font-black uppercase tracking-widest",
                isHidden(field) ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-neon-green/10 border-neon-green/20 text-neon-green"
            )}
        >
            {isHidden(field) ? <EyeOff size={10} /> : <Eye size={10} />}
            {label || (isHidden(field) ? 'Hidden' : 'Visible')}
        </button>
    );

    // Render markdown-formatted text into styled JSX for the document preview
    const renderFormatted = (text, baseClass = 'text-[13px] font-medium text-black leading-[1.9]') => {
        if (!text) return null;
        const lines = text.split('\n');
        const elements = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            // Heading
            if (line.startsWith('## ')) {
                elements.push(<p key={i} className="text-[13px] font-black text-black uppercase tracking-wider mt-4 mb-1">{line.slice(3)}</p>);
            // Bullet
            } else if (line.match(/^[•\-\*]\s/)) {
                const items = [];
                while (i < lines.length && lines[i].match(/^[•\-\*]\s/)) {
                    items.push(lines[i].replace(/^[•\-\*]\s/, ''));
                    i++;
                }
                elements.push(
                    <div key={`ul-${i}`} className="pl-4 space-y-1 my-2">
                        {items.map((item, j) => <div key={j} className="flex items-start gap-2"><span className="text-neon-green mt-1.5 text-[8px]">●</span><span className={baseClass} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} /></div>)}
                    </div>
                );
                continue;
            // Numbered
            } else if (line.match(/^\d+\.\s/)) {
                const items = [];
                while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
                    items.push(lines[i].replace(/^\d+\.\s/, ''));
                    i++;
                }
                elements.push(
                    <div key={`ol-${i}`} className="pl-4 space-y-1 my-2">
                        {items.map((item, j) => <div key={j} className="flex items-start gap-2"><span className="text-[10px] font-black text-gray-400 mt-0.5 w-5 shrink-0">{j + 1}.</span><span className={baseClass} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} /></div>)}
                    </div>
                );
                continue;
            // Empty line
            } else if (line.trim() === '') {
                elements.push(<div key={i} className="h-2" />);
            // Regular paragraph
            } else {
                elements.push(<p key={i} className={cn(baseClass, 'text-justify')} dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />);
            }
            i++;
        }
        return <div>{elements}</div>;
    };

    // Inline bold/italic formatting
    const inlineFmt = (text) => {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');
    };

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
                        <AdminDashboardLink className="hidden sm:inline-flex ml-2" />
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
                    <button onClick={() => setShowAiSettings(true)} className="p-2.5 bg-white/5 rounded-xl border border-white/5 hover:text-neon-green transition-all"><Settings size={16} /></button>
                    <button onClick={handleSave} className="h-10 md:h-12 px-3 md:px-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl transition-all flex items-center gap-2">
                        <Save size={14} className="sm:hidden" />
                        <span className="hidden sm:inline">Save</span>
                    </button>
                    <button onClick={generatePDF} className="h-10 md:h-12 px-4 md:px-8 bg-neon-green text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl hover:scale-105 transition-all shadow-[0_10px_30_rgba(57,255,20,0.3)] flex items-center gap-2">
                        <Download size={14} className="sm:hidden" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                <aside className="hidden lg:flex w-24 border-r border-white/5 bg-zinc-900/20 flex-col p-4 overflow-y-auto scrollbar-hide items-center">
                    <nav className="space-y-4">
                        {tabs.map(tab => (
                            <div key={tab.id} className="relative group">
                                <button onClick={() => handleTabClick(tab.id)} className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all group relative", activeTab === tab.id ? "bg-neon-green text-black shadow-[0_0_30_rgba(57,255,20,0.3)] scale-110" : "bg-white/5 text-gray-500 hover:text-white hover:bg-white/10")}>
                                    <tab.icon size={24} />
                                    <div className="absolute left-20 bg-black border border-white/10 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 z-[100] whitespace-nowrap">{tab.label}</div>
                                </button>
                                {tab.visibilityKey && (
                                    <button onClick={(e) => { e.stopPropagation(); toggleFieldVisibility(tab.visibilityKey); }} className={cn("absolute -top-1 -right-1 p-1 rounded-full border-2 border-[#020202] transition-all", isHidden(tab.visibilityKey) ? "bg-red-500 text-white" : "bg-neon-green/20 text-neon-green hover:bg-neon-green hover:text-black")}>{isHidden(tab.visibilityKey) ? <EyeOff size={10} /> : <Eye size={10} />}</button>
                                )}
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Mobile Bottom Navigation */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-[100] px-4 flex items-center justify-around no-scrollbar">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={cn("flex flex-col items-center justify-center min-w-[64px] h-full transition-all gap-1", activeTab === tab.id ? "text-neon-green" : "text-gray-500")}>
                            <tab.icon size={20} />
                            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label.split(' ')[0]}</span>
                            {activeTab === tab.id && <div className="w-1 h-1 rounded-full bg-neon-green mt-1 shadow-[0_0_8px_#39FF14]" />}
                        </button>
                    ))}
                </div>


                {/* Editor Area */}
                <section className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-hide bg-[#050505] pb-32">
                    <div className="max-w-3xl mx-auto">
                        {/* Compact AI strategist block */}
                        <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-[2rem] relative overflow-hidden mb-12 group">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Sparkles size={60} className="text-neon-green" /></div>
                             <div className="flex items-center gap-3 mb-4">
                                <Sparkles size={14} className="text-neon-green" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">AI Strategic Orchestrator</p>
                             </div>
                             <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="w-full bg-black/40 border border-white/10 focus:border-neon-green/40 rounded-2xl p-4 text-xs font-medium min-h-[80px] outline-none text-white scrollbar-hide mb-4 transition-all" placeholder="Describe project brief (Events, Production, Activations, Volunteers, etc)..." />
                             <button onClick={handleGenerateAI} disabled={isGeneratingAi || !aiPrompt} className="w-full h-12 bg-neon-green text-black font-black uppercase tracking-widest text-[9px] rounded-xl shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isGeneratingAi ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />} Execute Strategic Generation</button>
                        </div>

                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic mb-1">{currentTab?.label}.</h2>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6">{currentTab?.desc}</p>
                                <div className="w-16 h-1.5 bg-neon-green" />
                            </div>
                            {currentTab?.visibilityKey && (
                                <VisibilityToggle field={currentTab.visibilityKey} label={`Page ${isHidden(currentTab.visibilityKey) ? 'Disabled' : 'Enabled'}`} />
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-16">
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
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Client Entity</label>
                                                <input value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" placeholder="Organization Name" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Project Title</label>
                                                <input value={formData.campaignName} onChange={e => setFormData({...formData, campaignName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" placeholder="Engagement Name" />
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
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Deployment Period</label>
                                                <input value={formData.campaignDuration} onChange={e => setFormData({...formData, campaignDuration: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" placeholder="Duration or Dates" />
                                            </div>
                                        </div>
                                        <div className="space-y-6 pt-4">
                                            <div className="flex justify-between items-center px-2">
                                                <div className="flex items-center gap-4">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cover Memorandum</label>
                                                    <VisibilityToggle field="coverDescription" />
                                                </div>
                                                <button onClick={() => handleRefineField('coverDescription', 'Cover Description')} className="text-[9px] font-black text-neon-green uppercase tracking-widest underline">AI Refine</button>
                                            </div>
                                            <FormattedTextArea value={formData.coverDescription} onChange={e => setFormData({...formData, coverDescription: e.target.value})} className={isHidden('coverDescription') ? 'opacity-30' : ''} placeholder="Cover page description for this proposal..." minH="min-h-[180px]" />
                                        </div>
                                    </div>
                                )}
                                {activeTab === '2' && (
                                    <div className="space-y-12">
                                        <div className="space-y-6 pt-4">
                                            <div className="flex justify-between items-center px-2">
                                                <div className="flex items-center gap-4">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Executive Summary</label>
                                                    <VisibilityToggle field="overview" />
                                                </div>
                                                <button onClick={() => handleRefineField('overview', 'Overview')} className="text-[9px] font-black text-neon-green uppercase tracking-widest underline">AI Refine</button>
                                            </div>
                                            <FormattedTextArea value={formData.overview} onChange={e => setFormData({...formData, overview: e.target.value})} className={isHidden('overview') ? 'opacity-30' : ''} placeholder="Strategic vision..." minH="min-h-[200px]" />
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center px-2">
                                                <div className="flex items-center gap-4">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Primary Objective</label>
                                                    <VisibilityToggle field="primaryGoal" />
                                                </div>
                                                <button onClick={() => handleRefineField('primaryGoal', 'Primary Goal')} className="text-[9px] font-black text-neon-green uppercase tracking-widest underline">AI Refine</button>
                                            </div>
                                            <FormattedTextArea value={formData.primaryGoal} onChange={e => setFormData({...formData, primaryGoal: e.target.value})} className={isHidden('primaryGoal') ? 'opacity-30' : ''} placeholder="Strategic / Tactical Goal" minH="min-h-[120px]" />
                                        </div>
                                    </div>
                                )}
                                {activeTab === '3' && (
                                    <div className="space-y-12">
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scope of Work</label>
                                                <button onClick={() => handleRefineField('scopeOfWork', 'Scope of Work')} className="text-[9px] font-black text-neon-green uppercase tracking-widest underline">AI Refine</button>
                                            </div>
                                            <FormattedTextArea value={formData.scopeOfWork} onChange={e => setFormData({...formData, scopeOfWork: e.target.value})} className={isHidden('scopeOfWork') ? 'opacity-30' : ''} placeholder="Use bullet points (• ) for each scope item. Group under ## headings." minH="min-h-[400px]" />
                                        </div>
                                    </div>
                                )}
                                {activeTab === '4' && (
                                    <div className="space-y-16">
                                        {/* Deliverables Section */}
                                        <div className="space-y-8">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">What We Deliver</label>
                                                <button onClick={() => setFormData({...formData, deliverables: [...(formData.deliverables || []), { id: Date.now(), item: '', qty: '', timeline: '' }]})} className="p-3 bg-neon-green text-black rounded-xl hover:scale-105 transition-all shadow-xl"><Plus size={16} /></button>
                                            </div>
                                            <div className="space-y-4">
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
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Requirements From Client</label>
                                                <button onClick={() => setFormData({...formData, clientRequirements: [...(formData.clientRequirements || []), { id: Date.now(), description: '' }]})} className="p-3 bg-neon-green text-black rounded-xl hover:scale-105 transition-all shadow-xl"><Plus size={16} /></button>
                                            </div>
                                            <div className="space-y-4">
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
                                                        <div className="flex flex-col items-end"><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 pr-2">Price</span><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neon-green">₹</span><input disabled={isHidden('inventory')} type="number" value={item.price} onChange={e => { const newItems = [...items]; newItems[idx].price = Number(e.target.value); setItems(newItems); }} className="w-32 bg-black/40 border border-white/10 h-10 pl-7 pr-4 rounded-lg text-right text-xs font-black text-neon-green outline-none focus:border-neon-green/50" /></div></div>
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
                                            <div className="space-y-4"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Security Deposit (%)</label><input type="number" value={formData.advanceRequested} onChange={e => setFormData({...formData, advanceRequested: Number(e.target.value)})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" /></div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4 px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Strategic Terms</label>
                                                <VisibilityToggle field="terms" />
                                            </div>
                                            <textarea value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} className={cn("w-full bg-zinc-900 border border-white/10 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 text-[13px] font-medium min-h-[200px] outline-none focus:border-neon-green/40 transition-all leading-relaxed", isHidden('terms') && "opacity-30")} />
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4 px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bank Settlement Details</label>
                                                <VisibilityToggle field="paymentDetails" />
                                            </div>
                                            <textarea value={formData.paymentDetails} onChange={e => setFormData({...formData, paymentDetails: e.target.value})} className={cn("w-full bg-zinc-900 border border-white/10 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 text-[13px] font-black font-mono min-h-[150px] outline-none focus:border-neon-green/40 transition-all leading-relaxed", isHidden('paymentDetails') && "opacity-30")} />
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
                    "w-full lg:w-[500px] 2xl:w-[750px] border-l border-white/5",
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

                    <div ref={previewContainerRef} className="flex-1 bg-zinc-950 flex flex-col items-center justify-start p-8 overflow-y-auto relative">
                        <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center', height: `${1123 * previewScale}px` }} className="transition-transform duration-500 mb-20">
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
                                                <div className="pt-16 space-y-10"><div className="flex items-center gap-4"><div className="w-12 h-1 bg-black" /><p className="text-[11px] font-black uppercase tracking-[0.6em]">Strategic Project Memorandum</p></div>{!isHidden('coverDescription') && <p className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl text-justify">{formData.coverDescription || 'Cover description pending...'}</p>}</div>
                                                <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{formData.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Strategic Commercial</p></div></div>
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'strategy' && (
                                            <div className="space-y-16 py-8">
                                                <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Execution Roadmap.</h3><div className="w-16 h-1 bg-neon-green" /></div>
                                                {!isHidden('overview') && <div className="text-xl font-medium leading-[1.7] text-gray-700 text-justify max-w-2xl italic">{renderFormatted(formData.overview || 'Strategic framework pending...', 'text-lg font-medium text-gray-700 leading-[1.7]')}</div>}
                                                {!isHidden('primaryGoal') && (
                                                    <div className="pt-12">
                                                        <div className="p-12 border-2 border-black space-y-6">
                                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Primary Objective</p>
                                                            <div className="text-xl font-black uppercase text-black leading-relaxed">{renderFormatted(formData.primaryGoal || 'Objective pending...', 'text-lg font-black text-black leading-relaxed')}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'scope' && (
                                            <div className="h-full flex flex-col py-8">
                                                <div className="space-y-4 mb-12">
                                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-black">Scope of Work.</h3>
                                                    <div className="w-16 h-1 bg-black" />
                                                </div>
                                                <div className="flex-1 relative overflow-hidden">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-neon-green" />
                                                    <div className="pl-10">
                                                        {!paginatedPages[currentPreviewPage]?.scopePage && <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">Execution Framework</p>}
                                                        {paginatedPages[currentPreviewPage]?.scopePage > 1 && <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">Execution Framework (Continued)</p>}
                                                        {renderFormatted(paginatedPages[currentPreviewPage]?.scopeText || '', 'text-[12px] font-medium text-black leading-[1.8]')}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'proposal' && (
                                            <div className="space-y-16 py-8">
                                                <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Proposal Plan.</h3><div className="w-16 h-1 bg-neon-green" /></div>

                                                {/* Deliverables Table */}
                                                {(formData.deliverables?.length > 0 && formData.deliverables.some(d => d.item)) && (
                                                    <div className="space-y-6">
                                                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Deliverables</p>
                                                        <table className="w-full text-left border-collapse border-2 border-black">
                                                            <thead>
                                                                <tr className="bg-black text-[9px] font-black uppercase text-white tracking-[0.3em]">
                                                                    <th className="p-4 w-10">#</th>
                                                                    <th className="p-4">Deliverable</th>
                                                                    <th className="p-4 text-center w-28 border-x border-white/20">Qty / Unit</th>
                                                                    <th className="p-4 text-right w-40">Timeline</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-200">
                                                                {formData.deliverables.filter(d => d.item).map((d, i) => (
                                                                    <tr key={d.id} className="hover:bg-gray-50">
                                                                        <td className="p-4 text-[11px] font-black text-gray-400">{String(i + 1).padStart(2, '0')}</td>
                                                                        <td className="p-4 text-[12px] font-bold text-black">{d.item}</td>
                                                                        <td className="p-4 text-center text-[12px] font-bold text-gray-600 border-x border-gray-100">{d.qty || '—'}</td>
                                                                        <td className="p-4 text-right text-[11px] font-black text-black uppercase tracking-wider">{d.timeline || '—'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {/* Client Requirements */}
                                                {(formData.clientRequirements?.length > 0 && formData.clientRequirements.some(r => r.description)) && (
                                                    <div className="space-y-6 pt-4">
                                                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Requirements From Client</p>
                                                        <div className="p-6 border-2 border-gray-200 space-y-0">
                                                            {formData.clientRequirements.filter(r => r.description).map((r, i) => (
                                                                <div key={r.id} className={cn("flex items-start gap-4 py-3", i > 0 && "border-t border-gray-100")}>
                                                                    <div className="w-8 h-8 bg-black flex items-center justify-center shrink-0 mt-0.5"><span className="text-[9px] font-black text-white">{String(i + 1).padStart(2, '0')}</span></div>
                                                                    <p className="text-[12px] font-bold text-black leading-relaxed">{r.description}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'table' && (
                                            <div className="space-y-12 py-8">
                                                <div className="space-y-4"><h3 className="text-3xl font-black uppercase text-black">Financial Summary.</h3><div className="w-16 h-1 bg-black" /></div>
                                                <table className="w-full text-left border-collapse border-2 border-black"><thead><tr className="bg-black text-[10px] font-black uppercase text-white tracking-[0.4em] border-b-2 border-black"><th className="p-6">Resource Inventory</th><th className="p-6 text-center w-24 border-x border-white/20">Qty</th><th className="p-6 text-right w-48">Amount (INR)</th></tr></thead><tbody className="divide-y divide-gray-200">{paginatedPages[currentPreviewPage].items.map((item, i) => (<tr key={i} className="hover:bg-gray-50"><td className="p-6 text-[13px] font-black uppercase text-black text-justify">{item.description || 'Asset'}</td><td className="p-6 text-center text-[13px] font-bold text-gray-600 border-x border-gray-100">{item.qty}</td><td className="p-6 text-right text-[13px] font-black tracking-widest text-black">₹{item.price.toLocaleString()}</td></tr>))}</tbody></table>
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'commercials' && (
                                            <div className="space-y-16 py-8">
                                                <div className="grid grid-cols-2 gap-16 items-start">
                                                    <div className="space-y-12">
                                                        {!isHidden('terms') && <div className="space-y-6"><h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">General Terms</h4><p className="text-[11px] font-bold text-gray-500 whitespace-pre-line italic leading-relaxed text-justify">{formData.terms}</p></div>}
                                                        {!isHidden('paymentDetails') && <div className="p-8 bg-gray-50 border border-gray-200 space-y-4"><p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Payment Information</p><p className="text-[11px] font-black font-mono whitespace-pre-line text-black leading-relaxed">{formData.paymentDetails}</p></div>}
                                                    </div>
                                                    <div className="space-y-6">
                                                        <div className="p-8 border-2 border-black flex flex-col items-start gap-1 bg-gray-50"><span className="text-[11px] font-black text-black uppercase tracking-widest">Total Net Project Value</span><span className="text-xl font-black text-black tracking-widest font-mono">₹{subtotal.toLocaleString()}</span></div>
                                                        {formData.showGst && (<div className="p-8 border border-gray-200 flex flex-col items-start gap-1 text-gray-500"><span className="text-[10px] font-black uppercase">GST ({formData.gstRate}%)</span><span className="text-xl font-black font-mono">₹{gstAmount.toLocaleString()}</span></div>)}
                                                        <div className="p-10 bg-black text-right relative overflow-hidden shadow-xl"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Quotation Value</p><h2 className="text-6xl font-black tracking-tighter text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2><div className="absolute top-0 right-0 w-2 h-full bg-neon-green" /></div>
                                                        {(formData.advanceRequested > 0) && (
                                                            <div className="p-8 bg-neon-green/10 border-2 border-neon-green/20 flex flex-col items-start gap-2">
                                                                <span className="text-[11px] font-black text-black uppercase tracking-widest">Advance Payment Required</span>
                                                                <span className="text-3xl font-black text-black font-mono italic">₹{(totalAmount * (formData.advanceRequested || 50) / 100).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                            </div>
                                        </div>
                                    <div className="mt-auto pt-8 pb-10 border-t border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">
                                        <p>Newbi Entertainment © 2024</p>
                                        <p className="text-black">Page {currentPreviewPage + 1} of {paginatedPages.length}</p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </section>
            </main>

            {/* AI Settings Modal */}
            <AnimatePresence>
                {showAiSettings && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAiSettings(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Settings size={80} className="text-neon-green" /></div>
                            <h3 className="text-2xl font-black uppercase italic text-white mb-2">AI <span className="text-neon-green">Settings.</span></h3>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8">Orchestrator Configuration</p>
                            
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Gemini API Key</label>
                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            value={aiApiKey} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                setAiApiKey(val);
                                                if (val) localStorage.setItem('geminiApiKey', val);
                                                else localStorage.removeItem('geminiApiKey');
                                            }} 
                                            className="w-full bg-black border border-white/10 h-14 px-6 rounded-xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all text-neon-green" 
                                            placeholder="Paste your API key here..." 
                                        />
                                        <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-neon-green/20" size={18} />
                                    </div>
                                    <div className="flex justify-between px-2">
                                        <p className="text-[9px] font-medium text-gray-500 leading-relaxed">
                                            Using {localStorage.getItem('geminiApiKey') ? 'Custom Browser Key' : 'System Default Key'}
                                        </p>
                                        <button onClick={() => { setAiApiKey(''); localStorage.removeItem('geminiApiKey'); }} className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline">Reset to Default</button>
                                    </div>
                                </div>

                                <div className="p-4 bg-neon-green/5 border border-neon-green/10 rounded-2xl">
                                    <div className="flex items-start gap-3">
                                        <Zap size={14} className="text-neon-green mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-black text-neon-green uppercase tracking-widest mb-1">Model Info</p>
                                            <p className="text-[9px] font-medium text-gray-400 leading-relaxed">Gemini 3.0 Flash is the production standard. Use 3.0 Pro for complex strategic logic.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Deployment Model</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'gemini-1.5-flash', label: 'Flash 1.5', desc: 'Speed' },
                                            { id: 'gemini-2.0-flash-exp', label: 'Flash 2.0', desc: 'Reasoning' },
                                            { id: 'gemini-2.0-flash', label: '2.0 Flash', desc: 'Legacy' }
                                        ].map(m => (
                                            <button 
                                                key={m.id} 
                                                onClick={() => {
                                                    setAiModel(m.id);
                                                    localStorage.setItem('geminiModel', m.id);
                                                }}
                                                className={cn(
                                                    "p-4 rounded-xl border text-left transition-all",
                                                    aiModel === m.id ? "bg-neon-green border-neon-green text-black" : "bg-black border-white/10 text-gray-500 hover:text-white"
                                                )}
                                            >
                                                <p className="text-[10px] font-black uppercase tracking-widest mb-1">{m.label}</p>
                                                <p className={cn("text-[8px] font-bold uppercase opacity-60", aiModel === m.id ? "text-black" : "text-gray-600")}>{m.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="relative mt-2">
                                        <input 
                                            type="text" 
                                            value={aiModel} 
                                            onChange={e => {
                                                setAiModel(e.target.value);
                                                localStorage.setItem('geminiModel', e.target.value);
                                            }} 
                                            className="w-full bg-black/50 border border-white/5 h-10 px-4 rounded-lg font-bold text-[9px] outline-none focus:border-neon-green/20 transition-all text-gray-400" 
                                            placeholder="Manual Model ID (e.g. gemini-pro)" 
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/5">
                                    <button 
                                        onClick={() => { 
                                            localStorage.removeItem('geminiApiKey'); 
                                            localStorage.removeItem('geminiModel');
                                            window.location.reload(); 
                                        }} 
                                        className="text-[9px] font-black text-red-500/50 uppercase tracking-widest hover:text-red-500 transition-colors text-center"
                                    >
                                        Hard Reset AI Cache
                                    </button>
                                </div>

                                <button onClick={() => setShowAiSettings(false)} className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-[1.02] transition-all mt-2">Save & Close</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Field Refinement Modal */}
            <AnimatePresence>
                {refiningField && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRefiningField(null)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Sparkles size={80} className="text-neon-green" /></div>
                            <h3 className="text-2xl font-black uppercase italic text-white mb-2">Refine <span className="text-neon-green">{refiningField.label}.</span></h3>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8">AI Content Optimization</p>
                            
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Refinement Instruction</label>
                                    <textarea 
                                        autoFocus
                                        value={refinementPrompt} 
                                        onChange={e => setRefinementPrompt(e.target.value)} 
                                        className="w-full bg-black border border-white/10 min-h-[120px] p-6 rounded-2xl font-medium text-sm outline-none focus:border-neon-green/40 transition-all text-white scrollbar-hide" 
                                        placeholder="Make it more aggressive / focus on luxury / add technical details about the production team..." 
                                    />
                                </div>

                                {parsedError && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                                        <div className="px-2 py-1 bg-red-500/20 rounded-md shrink-0 mt-0.5"><span className="text-[9px] font-black text-red-400 font-mono">{parsedError.code}</span></div>
                                        <div>
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-tight">{parsedError.title}</p>
                                            <p className="text-[10px] font-medium text-red-400/70 leading-relaxed mt-0.5">{parsedError.message}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button onClick={() => setRefiningField(null)} className="flex-1 h-14 bg-white/5 text-white border border-white/10 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white/10 transition-all">Cancel</button>
                                    <button 
                                        onClick={executeRefinement} 
                                        disabled={isGeneratingAi || !refinementPrompt}
                                        className="flex-[2] h-14 bg-neon-green text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingAi ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />} 
                                        Optimize Section
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Global AI Status Notification */}
            <AnimatePresence>
                {parsedError && !refiningField && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md">
                        <div className="bg-zinc-900 border border-white/10 p-1.5 rounded-3xl shadow-2xl">
                            <div className="bg-red-500/5 border border-red-500/10 p-5 rounded-2xl">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl shrink-0">
                                        <X size={16} className="text-red-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="px-2 py-0.5 bg-red-500/15 rounded text-[9px] font-black text-red-400 font-mono tracking-wider">{parsedError.code}</span>
                                            <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">{parsedError.title}</span>
                                        </div>
                                        <p className="text-[11px] font-medium text-gray-400 leading-relaxed">{parsedError.message}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button 
                                            onClick={() => {
                                                if (aiPrompt) handleGenerateAI();
                                                else setAiError(null);
                                            }} 
                                            className="h-9 px-4 bg-white text-black font-black uppercase tracking-widest text-[8px] rounded-lg hover:scale-105 transition-all"
                                        >
                                            Retry
                                        </button>
                                        <button onClick={() => setAiError(null)} className="p-2 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/5"><X size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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
                                    <div className="pt-16 space-y-10"><div className="flex items-center gap-4"><div className="w-12 h-1 bg-black" /><p className="text-[11px] font-black uppercase tracking-[0.6em]">Official Strategic Quotation</p></div>{!isHidden('coverDescription') && <p className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl text-justify">{formData.coverDescription || 'Cover description pending...'}</p>}</div>
                                    <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{formData.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Strategic Commercial</p></div></div>
                                </div>
                            )}
                            {page.type === 'strategy' && (
                                <div className="space-y-16 py-8">
                                    <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Project Timeline.</h3><div className="w-16 h-1 bg-neon-green" /></div>
                                    {!isHidden('overview') && <div className="text-xl font-medium leading-[1.7] text-gray-700 text-justify max-w-2xl italic">{renderFormatted(formData.overview || 'Strategic framework pending...', 'text-lg font-medium text-gray-700 leading-[1.7]')}</div>}
                                    {!isHidden('primaryGoal') && (
                                        <div className="pt-12">
                                            <div className="p-12 border-2 border-black space-y-6">
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Primary Objective</p>
                                                <div className="text-xl font-black uppercase text-black leading-relaxed">{renderFormatted(formData.primaryGoal || 'Objective pending...', 'text-lg font-black text-black leading-relaxed')}</div>
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
                                                {renderFormatted(page.scopeText || '', 'text-[12px] font-medium text-black leading-[1.8]')}
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
                                    <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Proposal Plan.</h3><div className="w-16 h-1 bg-neon-green" /></div>
                                    {(formData.deliverables?.length > 0 && formData.deliverables.some(d => d.item)) && (
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
                                            {!isHidden('terms') && <div className="space-y-6"><h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">General Terms</h4><p className="text-[11px] font-bold text-gray-500 whitespace-pre-line italic leading-relaxed text-justify">{formData.terms}</p></div>}
                                            {!isHidden('paymentDetails') && <div className="p-8 bg-gray-50 border border-gray-200 space-y-4"><p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Payment Information</p><p className="text-[11px] font-black font-mono whitespace-pre-line text-black leading-relaxed">{formData.paymentDetails}</p></div>}
                                        </div>
                                        <div className="space-y-6">
                                            <div className="p-8 border-2 border-black flex flex-col items-start gap-1 bg-gray-50"><span className="text-[11px] font-black text-black uppercase tracking-widest">Total Net Project Value</span><span className="text-xl font-black text-black tracking-widest font-mono">₹{subtotal.toLocaleString()}</span></div>
                                            {formData.showGst && (<div className="p-8 border border-gray-200 flex flex-col items-start gap-1 text-gray-500"><span className="text-[10px] font-black uppercase">GST ({formData.gstRate}%)</span><span className="text-xl font-black font-mono">₹{gstAmount.toLocaleString()}</span></div>)}
                                            <div className="p-10 bg-black text-right relative overflow-hidden shadow-xl"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Quotation Value</p><h2 className="text-6xl font-black tracking-tighter text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2><div className="absolute top-0 right-0 w-2 h-full bg-neon-green" /></div>
                                            {(formData.advanceRequested > 0) && (
                                                <div className="p-8 bg-neon-green/10 border-2 border-neon-green/20 flex flex-col items-start gap-2">
                                                    <span className="text-[11px] font-black text-black uppercase tracking-widest">Advance Payment Required</span>
                                                    <span className="text-3xl font-black text-black font-mono italic">₹{(totalAmount * (formData.advanceRequested || 50) / 100).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                                </div>
                            </div>
                        <div className="mt-auto pt-8 pb-10 border-t border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">
                            <p>Newbi Entertainment © 2024</p>
                            <p className="text-black">Page {idx + 1} of {paginatedPages.length}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProposalGenerator;
