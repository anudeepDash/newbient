import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { 
    Plus, Minus, Trash2, Save, LayoutGrid, Download, RefreshCw, X, 
    Send, FileText, ArrowLeft, ArrowRight, 
    ChevronLeft, ChevronRight, Target, Users, Zap, Briefcase, 
    CreditCard, ShieldCheck, Eye, EyeOff, Settings, Building2, 
    Layers, Image as ImageIcon, ClipboardList, Undo2, Scale,
    ChevronDown, ChevronUp, CheckCircle2, 
    Stamp, Gavel, Lock, History, MessageCircle, Share2,
    Shield, Upload, Sparkles
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import SignaturePad from '../../components/ui/SignaturePad';
import { Button } from '../../components/ui/Button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import DocumentSeal from '../../components/ui/DocumentSeal';
import StudioRichEditor from '../../components/ui/StudioRichEditor';

// Contract Vault Sub-components
import useContractGenerator from '../../components/admin/useContractGenerator';
import ClauseMarketplace from '../../components/admin/ClauseMarketplace';
import ContractPreview from '../../components/admin/ContractPreview';
import { generateFullDocument } from '../../lib/ai';
import AIPromptBox from '../../components/admin/AIPromptBox';


const ContractGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addAgreement, updateAgreement, agreements, user, addToast } = useStore();
    
    // UI State
    const [activeTab, setActiveTab] = useState('1');
    const [previewScale, setPreviewScale] = useState(0.5);
    const [userZoom, setUserZoom] = useState(1);
    const [currentPage, setCurrentPage] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [promptBoxClear, setPromptBoxClear] = useState(false);
    const [bulkRawText, setBulkRawText] = useState('');
    const [generatingSection, setGeneratingSection] = useState(null);
    const previewContainerRef = useRef(null);

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
                    : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
            )}
        >
            {isHidden(field) ? <EyeOff size={10} /> : <Eye size={10} />}
            {label || (isHidden(field) ? "Hidden" : "Live")}
        </button>
    );


    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
    ];

    // Hook logic
    const existingData = id ? agreements.find(a => a.id === id) : null;
    const {
        formData, setFormData, updateField,
        toggleClause, updateClause, removeClause, addCustomClause,
        paginatedPages
    } = useContractGenerator(existingData);

    useEffect(() => {
        const handleResize = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth;
                const scaleWidth = containerWidth / 794;
                setPreviewScale(Math.max(0.1, Math.min(2.0, scaleWidth)) * userZoom);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [userZoom]);



    const handleSave = async () => {
        setIsSaving(true);
        try {
            const rawData = { 
                ...formData, 
                updatedAt: new Date().toISOString(),
                createdBy: formData.createdBy || user?.uid || null 
            };
            const data = JSON.parse(JSON.stringify(rawData)); // Sanitize for Firestore
            if (id) await updateAgreement(id, data);
            else await addAgreement(data);
            
            setPromptBoxClear(true);
            setTimeout(() => setPromptBoxClear(false), 100);
            
            navigate('/admin/agreements');
        } catch (error) {
            alert("Save Error: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImproveClause = async (clauseId) => {
        const clause = formData.clauses.find(c => c.id === clauseId);
        if (!clause) return;
        setIsGenerating(true);
        try {
            const improved = await improveContent('contract', clause.title, clause.content);
            updateClause(clauseId, { content: improved });
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerateClause = async (clauseId) => {
        const clause = formData.clauses.find(c => c.id === clauseId);
        if (!clause) return;
        setIsGenerating(true);
        try {
            const regenerated = await regenerateField('contract', clause.title, formData.details.purpose, clause.content);
            updateClause(clauseId, { content: regenerated });
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateContract = async (prompt) => {
        setIsGenerating(true);
        try {
            const data = await generateFullDocument('contract', prompt, 'Premium', {});
            
            setFormData(prev => ({
                ...prev,
                // Deep-merge parties: preserve firstParty defaults, merge secondParty from AI
                parties: {
                    firstParty: {
                        ...prev.parties.firstParty,
                        ...(data.parties?.firstParty || {}),
                        // Always keep Newbi Entertainment as provider
                        name: data.parties?.firstParty?.name || prev.parties.firstParty.name || 'Newbi Entertainment',
                        role: data.parties?.firstParty?.role || prev.parties.firstParty.role || 'Service Provider',
                    },
                    secondParty: {
                        ...prev.parties.secondParty,
                        ...(data.parties?.secondParty || {}),
                    }
                },
                // Merge details
                details: {
                    ...prev.details,
                    ...(data.details || {}),
                },
                // Merge commercials
                commercials: {
                    ...prev.commercials,
                    ...(data.commercials || {}),
                },
                // Replace clauses only if AI generated valid ones
                clauses: (data.clauses?.length > 0) 
                    ? data.clauses.map((c, i) => ({
                        id: c.id || `ai-clause-${Date.now()}-${i}`,
                        title: c.title || `Clause ${i + 1}`,
                        content: c.content || '',
                        isActive: c.isActive !== false,
                        isCustom: true,
                        strictness: 'medium',
                        category: 'custom'
                    }))
                    : prev.clauses,
                // Update template if AI suggests contract type
                template: data.template || prev.template,
            }));
            addToast("Contract updated successfully", "success");
        } catch (error) {
            addToast("AI Generation failed: " + error.message, 'error', error.code);
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePDF = async () => {
        setIsSaving(true);
        const originalScale = previewScale;
        setPreviewScale(1);
        await new Promise(r => setTimeout(r, 800));
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pages = document.querySelectorAll('.pdf-export-only .agreement-page-render');
            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
            }
            pdf.save(`Newbi-Contract-${formData.parties.secondParty.name || 'Draft'}.pdf`);
        } catch (error) {
            console.error(error);
        } finally {
            setPreviewScale(originalScale);
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: '0', label: 'Briefing', icon: Layers, desc: 'Project Source Data' },
        { id: '1', label: 'Entities', icon: Users, desc: 'Legal Parties' },
        { id: '2', label: 'Scope', icon: Target, desc: 'Project Framework', visibilityKey: 'mission' },
        { id: '3', label: 'Commercials', icon: CreditCard, desc: 'Financial Terms', visibilityKey: 'commercials' },
        { id: '4', label: 'Clauses', icon: Gavel, desc: 'Legal Framework', visibilityKey: 'clauses' },
        { id: '7', label: 'Execution', icon: Shield, desc: 'Finalization' }
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        // Map tab IDs to paginated page types for preview sync
        const mapping = { 
            '0': 'intro',
            '1': 'intro', 
            '2': 'mission', 
            '3': 'commercials', 
            '4': 'clauses', 
            '7': 'execution'
        };
        const targetType = mapping[tabId];
        const pageIndex = paginatedPages.findIndex(p => p.type === targetType);
        if (pageIndex !== -1) setCurrentPage(pageIndex);
    };

    return (
        <div className="h-screen bg-[#020202] text-white flex flex-col font-['Outfit'] overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,200..900;1,200..900&display=swap');
                .font-signature { font-family: 'Caveat', cursive; }
                .font-formal { font-family: 'Crimson Pro', serif; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />

            {/* Top Navigation */}
            <nav className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-black/40 backdrop-blur-3xl sticky top-0 z-[60]">
                <div className="flex items-center gap-2 md:gap-6 min-w-0">
                    <Link to="/admin/agreements" className="p-2.5 md:p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5 shrink-0"><ArrowLeft size={16} /></Link>
                    <div className="min-w-0">
                        <p className="text-[7px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] leading-none mb-1 truncate">Contract Operating System</p>
                        <h1 className="text-sm md:text-xl font-black uppercase tracking-tighter italic truncate">Contract <span className="text-[#A855F7]">Vault.</span></h1>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                    <button onClick={handleSave} disabled={isSaving} className="h-10 md:h-12 px-3 md:px-8 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl border border-white/10 transition-all flex items-center gap-2">
                        {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />} 
                        <span className="hidden sm:inline">Save Draft</span>
                    </button>
                    <button onClick={generatePDF} className="h-10 md:h-12 px-4 md:px-8 bg-neon-purple text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl shadow-[0_10px_30px_rgba(168,85,247,0.3)] hover:scale-105 transition-all flex items-center gap-2">
                        {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />} 
                        <span className="hidden sm:inline">Export Contract</span>
                    </button>
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Desktop Only */}
                <aside className="hidden lg:flex w-72 border-r border-white/5 bg-zinc-900/20 flex-col p-6 gap-6 overflow-y-auto scrollbar-hide">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-4 mb-4">Navigation</p>
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left group", activeTab === tab.id ? "bg-white text-black shadow-[0_0_20px_rgba(168,85,247,0.2)]" : "hover:bg-white/5 text-gray-500 hover:text-white")}>
                                <div className={cn("p-2.5 rounded-xl transition-all", activeTab === tab.id ? "bg-[#A855F7]/20" : "bg-white/5 group-hover:bg-white/10")}><tab.icon size={18} /></div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{tab.label}</p>
                                    <p className={cn("text-[9px] font-bold opacity-60 uppercase tracking-tighter", activeTab === tab.id ? "text-black" : "text-gray-600")}>{tab.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Mobile Tab Navigation */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-[100] px-4 flex items-center justify-between overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={cn("flex flex-col items-center justify-center min-w-[70px] h-full transition-all gap-1", activeTab === tab.id ? "text-neon-purple" : "text-gray-500")}>
                            <tab.icon size={18} />
                            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label.split(' ')[0]}</span>
                            {activeTab === tab.id && <div className="w-1 h-1 rounded-full bg-[#A855F7] mt-1 shadow-[0_0_8px_#A855F7]" />}
                        </button>
                    ))}
                </div>

                {/* Editor */}
                <main className="flex-1 overflow-y-auto px-8 py-16 scrollbar-hide bg-[#050505] pb-32">
                    <div className="max-w-7xl mx-auto space-y-12">
                        
                        <AIPromptBox onGenerate={handleGenerateContract} isGenerating={isGenerating} type="contract" forceClear={promptBoxClear} />

                        {/* Minimalist Section Header */}
                        <div className="flex flex-col md:flex-row items-end justify-between mb-8 pb-6 border-b border-white/5 group/header">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-[#A855F7] uppercase tracking-[0.4em] opacity-80 mb-1">
                                    Step {tabs.findIndex(t => t.id === activeTab) + 1} of {tabs.length}
                                </p>
                                <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">
                                    {tabs.find(t => t.id === activeTab)?.label}<span className="text-[#A855F7]">.</span>
                                </h2>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pt-1">
                                    {tabs.find(t => t.id === activeTab)?.desc}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                                {/* Compact Progress Line */}
                                <div className="w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-[#A855F7] transition-all duration-700 shadow-[0_0_10px_rgba(168,85,247,0.8)]" 
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
                                                    const refined = await generateFullDocument('contract', `Refine the ${currentTab.label} section for: ${formData.parties.secondParty.name}. Current state: ${JSON.stringify(formData)}`, 'Premium');
                                                    setFormData(prev => ({...prev, ...refined}));
                                                    addToast(`Refined ${currentTab.label} successfully`, "success");
                                                } catch (e) {
                                                    addToast(e.message, 'error', e.code);
                                                } finally {
                                                    setIsGenerating(false);
                                                    setGeneratingSection(null);
                                                }
                                            }}
                                            disabled={isGenerating}
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 text-gray-400 rounded-full hover:bg-[#A855F7]/10 hover:text-[#A855F7] transition-all text-[8px] font-black uppercase tracking-[0.1em] border border-white/10 hover:border-[#A855F7]/20"
                                        >
                                            {isGenerating && generatingSection === currentTab.id ? <RefreshCw className="animate-spin" size={10} /> : <Sparkles size={10} />}
                                            Refine
                                        </button>
                                        <VisibilityToggle field={currentTab.visibilityKey} />
                                    </div>
                                )}
                            </div>
                        </div>



                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                {activeTab === '0' && (
                                    <div className="space-y-12">
                                        <div className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-10 space-y-10">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Paste Contract Brief / Raw Data</label>
                                                    <span className="text-[10px] font-black text-[#A855F7] bg-[#A855F7]/10 px-3 py-1 rounded-full uppercase">Newbi Agent Active</span>
                                                </div>
                                                <textarea 
                                                    value={bulkRawText} 
                                                    onChange={e => setBulkRawText(e.target.value)} 
                                                    className="w-full bg-black/40 border border-white/5 p-8 rounded-[32px] font-bold text-sm outline-none focus:border-[#A855F7]/40 transition-all min-h-[300px] leading-relaxed scrollbar-hide text-white placeholder:text-gray-700" 
                                                    placeholder="Paste meeting notes, emails, or raw requirements here... The AI will extract parties, scope, and commercial terms automatically." 
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Reference Assets</label>
                                                    <div className="group relative h-48 rounded-[32px] border-2 border-dashed border-white/10 hover:border-neon-purple/50 hover:bg-neon-purple/[0.02] transition-all flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden">
                                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" multiple />
                                                        <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-[#A855F7] group-hover:text-black transition-all">
                                                            <Upload size={24} />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-xs font-black text-white uppercase tracking-widest">Drop Supporting Docs</p>
                                                            <p className="text-[9px] font-bold text-gray-500 uppercase mt-1">AI will parse for context</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-end space-y-4">
                                                    <div className="p-4 bg-[#A855F7]/5 rounded-2xl border border-[#A855F7]/10 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-[#A855F7]">
                                                            <Zap size={12} />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">Intelligent Extraction</span>
                                                        </div>
                                                        <p className="text-[8px] font-bold text-gray-600 leading-relaxed uppercase">The Newbi Agent maps legal entities, financial terms, and specialized clauses directly into your contract.</p>
                                                    </div>
                                                    <Button 
                                                        onClick={async () => {
                                                            if (!bulkRawText.trim()) return;
                                                            await handleGenerateContract(bulkRawText);
                                                            setActiveTab('1'); 
                                                        }} 
                                                        disabled={isGenerating || !bulkRawText.trim()}
                                                        className="h-14 rounded-xl bg-[#A855F7] text-black text-[10px] font-black uppercase tracking-[0.2em] gap-2 shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:scale-[1.02] transition-all w-full"
                                                    >
                                                        {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                                                        Initialize Contract Build
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] space-y-6 opacity-30 hover:opacity-100 transition-opacity">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-black uppercase tracking-tighter italic text-gray-400">Developer Console (JSON)</h3>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => navigator.clipboard.writeText(JSON.stringify(formData, null, 2))} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all text-gray-500">Copy State</button>
                                                </div>
                                            </div>
                                            <textarea 
                                                id="bulk-data-input"
                                                value={JSON.stringify(formData, null, 2)}
                                                readOnly
                                                className="w-full h-32 bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-[10px] text-zinc-500 outline-none scrollbar-hide"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === '1' && (
                                    <div className="space-y-10">
                                        
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3"><Scale size={16} /> Contract Framework</h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                {['Service Agreement', 'MOU'].map(t => (
                                                    <button 
                                                        key={t} 
                                                        onClick={() => updateField('template', t)} 
                                                        className={cn(
                                                            "p-6 rounded-3xl border transition-all text-[10px] font-black uppercase tracking-widest text-center", 
                                                            (formData.template || 'Service Agreement') === t 
                                                                ? "bg-[#A855F7] border-[#A855F7] text-black shadow-[0_0_25px_rgba(168,85,247,0.4)] scale-105" 
                                                                : "bg-zinc-900 border-white/5 text-gray-500 hover:text-white hover:border-[#A855F7]/30"
                                                        )}
                                                    >
                                                        {t === 'MOU' ? 'Memorandum of Understanding' : t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3"><Building2 size={16} /> Identity & Branding</h3>
                                            <div className="grid grid-cols-3 gap-6">
                                                {logoOptions.map(logo => (
                                                    <button 
                                                        key={logo.id} 
                                                        onClick={() => updateField('selectedLogo', logo.id)} 
                                                        className={cn(
                                                            "p-4 rounded-3xl border transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-3 overflow-hidden relative group/btn", 
                                                            (formData.selectedLogo || 'entertainment') === logo.id 
                                                                ? "bg-[#A855F7] border-[#A855F7] text-black scale-105 shadow-[0_0_25px_rgba(168,85,247,0.4)]" 
                                                                : "bg-zinc-900 border-white/5 text-gray-500 hover:text-white hover:border-[#A855F7]/30"
                                                        )}
                                                    >
                                                        <div className="w-full aspect-[4/3] rounded-2xl bg-white flex items-center justify-center p-2 relative overflow-hidden">
                                                            <img src={logo.path} alt={logo.label} className="w-full h-full object-contain" />
                                                            <div className="absolute inset-0 bg-black/5" />
                                                        </div>
                                                        <span className="relative z-10">{logo.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3"><Building2 size={16} /> First Party</h3>
                                                <div className="space-y-4">
                                                    <Input value={formData.parties.firstParty.name} onChange={e => updateField('parties.firstParty.name', e.target.value)} placeholder="Provider Name" className="h-14 bg-black/40 border-white/10" />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input value={formData.parties.firstParty.role} onChange={e => updateField('parties.firstParty.role', e.target.value)} placeholder="Role (e.g. Provider)" className="h-14 bg-black/40 border-white/10" />
                                                        <Input value={formData.parties.firstParty.acronym} onChange={e => updateField('parties.firstParty.acronym', e.target.value)} placeholder="Acronym (e.g. NB)" className="h-14 bg-black/40 border-white/10" />
                                                    </div>
                                                    <Input value={formData.parties.firstParty.address} onChange={e => updateField('parties.firstParty.address', e.target.value)} placeholder="Provider Address" className="h-14 bg-black/40 border-white/10" />
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3"><Users size={16} /> Second Party</h3>
                                                <div className="space-y-4">
                                                    <Input value={formData.parties.secondParty.name} onChange={e => updateField('parties.secondParty.name', e.target.value)} placeholder="Client Name" className="h-14 bg-black/40 border-white/10" />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input value={formData.parties.secondParty.role} onChange={e => updateField('parties.secondParty.role', e.target.value)} placeholder="Role (e.g. Client)" className="h-14 bg-black/40 border-white/10" />
                                                        <Input value={formData.parties.secondParty.acronym} onChange={e => updateField('parties.secondParty.acronym', e.target.value)} placeholder="Acronym (e.g. TUM)" className="h-14 bg-black/40 border-white/10" />
                                                    </div>
                                                    <Input value={formData.parties.secondParty.address} onChange={e => updateField('parties.secondParty.address', e.target.value)} placeholder="Client Address" className="h-14 bg-black/40 border-white/10" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === '2' && (
                                    <div className="space-y-10">
                                        <div className="grid grid-cols-2 gap-8">
                                            <Input value={formData.details.projectName} onChange={e => updateField('details.projectName', e.target.value)} placeholder="Project Name" className="h-14 bg-black/40 border-white/10" />
                                            <Input value={formData.details.territory} onChange={e => updateField('details.territory', e.target.value)} placeholder="Territory" className="h-14 bg-black/40 border-white/10" />
                                        </div>
                                        <StudioRichEditor 
                                            label="Contract Purpose"
                                            value={formData.details.purpose} 
                                            onChange={val => updateField('details.purpose', val)} 
                                            placeholder="Describe the purpose and scope of engagement..." 
                                            minHeight="200px" 
                                            accentColor="neon-purple"
                                        />
                                    </div>
                                )}

                                {activeTab === '3' && (
                                    <div className="space-y-10">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-purple font-black text-xs">{formData.commercials.currency}</span>
                                                <Input value={formData.commercials.totalValue} onChange={e => updateField('commercials.totalValue', e.target.value)} className="h-14 bg-black/40 border-white/10 pl-12" placeholder="Total Value" />
                                            </div>
                                            <select value={formData.commercials.currency} onChange={e => updateField('commercials.currency', e.target.value)} className="h-14 bg-black/40 border border-white/10 rounded-xl px-6 text-sm font-bold">
                                                <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
                                            </select>
                                        </div>
                                        <StudioRichEditor 
                                            label="Payment Schedule"
                                            value={formData.commercials.paymentSchedule} 
                                            onChange={val => updateField('commercials.paymentSchedule', val)} 
                                            placeholder="Payment milestones and schedule..." 
                                            minHeight="150px" 
                                            accentColor="neon-purple"
                                        />
                                    </div>
                                )}

                                {activeTab === '4' && (
                                    <ClauseMarketplace 
                                        activeClauses={formData.clauses} 
                                        onToggleClause={toggleClause} 
                                        onUpdateClause={updateClause} 
                                        onRemoveClause={removeClause} 
                                        onAddCustom={addCustomClause}
                                        onImproveClause={handleImproveClause}
                                        onRegenerateClause={handleRegenerateClause}
                                        isAILoading={isGenerating}
                                    />
                                )}


                                {activeTab === '7' && (
                                    <div className="space-y-10">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="space-y-8">
                                                <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] space-y-6">
                                                    <h3 className="text-lg font-black uppercase tracking-tighter italic">Document Settings</h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <button 
                                                            onClick={() => updateField('showSeal', !formData.showSeal)} 
                                                            className={cn(
                                                                "h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2", 
                                                                formData.showSeal ? "bg-white text-black border-white" : "bg-transparent text-gray-500 border-white/10"
                                                            )}
                                                        >
                                                            {formData.showSeal ? <Eye size={14} /> : <EyeOff size={14} />} Official Seal
                                                        </button>
                                                        <button 
                                                            onClick={() => updateField('showSignatures', !formData.showSignatures)} 
                                                            className={cn(
                                                                "h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2", 
                                                                formData.showSignatures ? "bg-white text-black border-white" : "bg-transparent text-gray-500 border-white/10"
                                                            )}
                                                        >
                                                            {formData.showSignatures ? <Eye size={14} /> : <EyeOff size={14} />} Digital Signatures
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Provider Authorization (Newbi) */}
                                                {formData.showSignatures && (
                                                    <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] space-y-6">
                                                        <div className="flex items-center justify-between">
                                                            <div className="space-y-1">
                                                                <h3 className="text-lg font-black uppercase tracking-tighter italic">Provider Authorization</h3>
                                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none">Sign for Newbi Entertainment</p>
                                                            </div>
                                                            <label className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-[9px] font-black uppercase tracking-widest transition-all">
                                                                <input 
                                                                    type="file" 
                                                                    className="hidden" 
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files[0];
                                                                        if (file) {
                                                                            const reader = new FileReader();
                                                                            reader.onloadend = () => updateField('providerSignature', reader.result);
                                                                            reader.readAsDataURL(file);
                                                                        }
                                                                    }}
                                                                />
                                                                <Upload size={12} className="inline mr-2" /> Upload Sign
                                                            </label>
                                                        </div>
                                                        
                                                        <div className="relative h-32 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center group overflow-hidden">
                                                            {formData.providerSignature ? (
                                                                <div className="relative group w-full h-full flex items-center justify-center p-4">
                                                                    <img src={formData.providerSignature} alt="Provider Signature" className="max-h-full object-contain invert brightness-200" />
                                                                    <button 
                                                                        onClick={() => updateField('providerSignature', null)}
                                                                        className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em]">No Signature</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}


                                            </div>

                                            <div className="flex flex-col gap-8">
                                                <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] flex-1">
                                                    <DocumentSeal type="contract" date={formData.effectiveDate} className="w-48 h-48 opacity-100" />
                                                    <div className="mt-8 text-center space-y-2">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Execution Reference</p>
                                                        <p className="text-xl font-black text-[#A855F7] tracking-widest">{formData.agreementNumber}</p>
                                                    </div>
                                                </div>
                                                <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem]">
                                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Security Protocol</p>
                                                    <p className="text-[11px] text-gray-400 leading-relaxed italic">Documents are electronically sealed and timestamped upon export. Digital signatures are embedded as unalterable raster assets.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>



                        {/* Section Navigation Footer */}
                        <div className="mt-16 flex items-center justify-between border-t border-white/5 pt-10">
                            <button 
                                onClick={() => {
                                    const idx = tabs.findIndex(t => t.id === activeTab);
                                    if (idx > 0) setActiveTab(tabs[idx - 1].id);
                                }}
                                disabled={activeTab === tabs[0].id}
                                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-0 disabled:pointer-events-none font-black uppercase tracking-widest text-[11px]"
                            >
                                <ChevronLeft size={18} /> Previous
                            </button>

                            <button 
                                onClick={() => {
                                    const idx = tabs.findIndex(t => t.id === activeTab);
                                    if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id);
                                }}
                                className={cn(
                                    "flex items-center gap-3 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl",
                                    activeTab === tabs[tabs.length - 1].id 
                                        ? "bg-white/5 text-gray-500 cursor-not-allowed opacity-50" 
                                        : "bg-[#A855F7] text-black hover:scale-105 hover:shadow-[#A855F7]/20"
                                )}
                            >
                                <span>{activeTab === tabs[tabs.length - 1].id ? 'Final Step' : 'Next Section'}</span>
                                {activeTab !== tabs[tabs.length - 1].id && <ChevronRight size={18} />}
                            </button>
                        </div>
                    </div>
                </main>

                {/* Preview Panel - Optimized width for better doc visibility */}
                <aside className="w-[400px] 2xl:w-[600px] border-l border-white/5 bg-zinc-900/40 flex flex-col overflow-hidden shrink-0">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <div className="flex items-center gap-3">
                            <Eye size={16} className="text-neon-purple" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Preview</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5">
                                <button onClick={() => setUserZoom(Math.max(0.5, userZoom - 0.1))} className="p-1.5 hover:bg-white/5 rounded text-gray-400 transition-colors"><Minus size={12} /></button>
                                <span className="text-[10px] font-black text-gray-500 px-2 min-w-[40px] text-center">{Math.round(userZoom * 100)}%</span>
                                <button onClick={() => setUserZoom(Math.min(2, userZoom + 0.1))} className="p-1.5 hover:bg-white/5 rounded text-gray-400 transition-colors"><Plus size={12} /></button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} className="p-2 bg-white/5 rounded-lg text-gray-500 hover:bg-white/10 transition-colors"><ChevronLeft size={14} /></button>
                                <span className="text-[10px] font-black text-gray-500">{currentPage + 1} / {paginatedPages.length}</span>
                                <button onClick={() => setCurrentPage(Math.min(paginatedPages.length - 1, currentPage + 1))} className="p-2 bg-white/5 rounded-lg text-gray-500 hover:bg-white/10 transition-colors"><ChevronRight size={14} /></button>
                            </div>
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
                                <div className="shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-sm">
                                    <ContractPreview formData={formData} paginatedPages={paginatedPages} currentPage={currentPage} />
                                </div>
                            </div>
                        </div>
                        <div className="h-48 shrink-0" />
                    </div>
                </aside>
            </div>

            {/* Hidden container for PDF export - renders all pages */}
            <div className="pdf-export-only fixed -left-[9999px] top-0 pointer-events-none overflow-hidden bg-white flex flex-col gap-10">
                {paginatedPages.map((page, idx) => (
                    <ContractPreview key={`export-${idx}`} formData={formData} paginatedPages={paginatedPages} currentPage={idx} />
                ))}
            </div>
        </div>
    );
};

export default ContractGenerator;
