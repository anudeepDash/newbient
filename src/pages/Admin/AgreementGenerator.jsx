import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { 
    Plus, Trash2, Save, LayoutGrid, Download, RefreshCw, X, 
    Sparkles, Send, FileText, ArrowLeft, ArrowRight, 
    ChevronLeft, ChevronRight, Target, Users, Zap, Briefcase, 
    CreditCard, ShieldCheck, Eye, EyeOff, Settings, Building2, 
    Layers, Image as ImageIcon, ClipboardList, Undo2, Scale,
    ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Wand2,
    Stamp, Gavel, ShieldAlert, Lock, History, MessageCircle, Share2,
    Shield, TrendingUp, Upload
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import DocumentSeal from '../../components/ui/DocumentSeal';

// Contract Vault Sub-components
import useContractGenerator from '../../components/admin/useContractGenerator';
import ContractAIBox from '../../components/admin/ContractAIBox';
import ClauseMarketplace from '../../components/admin/ClauseMarketplace';
import ContractPreview from '../../components/admin/ContractPreview';

const FormattedTextArea = ({ value, onChange, className, placeholder, minH = 'min-h-[200px]' }) => {
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
        setTimeout(() => {
            ta.focus();
            ta.scrollTop = scroll;
            ta.selectionStart = start + before.length;
            ta.selectionEnd = start + before.length + (selected || 'text').length;
        }, 10);
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
        setTimeout(() => {
            ta.focus();
            ta.scrollTop = scroll;
            ta.selectionStart = start + prefix.length;
            ta.selectionEnd = start + prefix.length;
        }, 10);
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
                <button type="button" onClick={handleUndo} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all"><Undo2 size={13} /></button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button type="button" onClick={() => insertFormat('**', '**')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all"><span className="text-[11px] font-black">B</span></button>
                <button type="button" onClick={() => insertFormat('*', '*')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all"><span className="text-[11px] font-bold italic">I</span></button>
                <button type="button" onClick={() => insertLine('## ')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all"><span className="text-[11px] font-black">H</span></button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button type="button" onClick={() => insertLine('• ')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all"><span className="text-[11px] font-bold">•</span></button>
            </div>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                onKeyDown={handleKeyDown}
                className={cn(
                    "w-full bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 text-base font-medium outline-none focus:border-neon-blue/40 transition-all leading-relaxed scrollbar-hide",
                    minH,
                    className
                )}
                placeholder={placeholder}
            />
        </div>
    );
};

const AgreementGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addAgreement, updateAgreement, agreements } = useStore();
    
    // UI State
    const [activeTab, setActiveTab] = useState('1');
    const [previewScale, setPreviewScale] = useState(0.65);
    const [currentPage, setCurrentPage] = useState(0);
    const [showAiSettings, setShowAiSettings] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const previewContainerRef = useRef(null);

    // AI Config from localStorage
    const aiApiKey = localStorage.getItem('geminiApiKey') || import.meta.env.VITE_GEMINI_API_KEY || '';
    const aiModel = localStorage.getItem('geminiModel') || 'gemini-1.5-flash';

    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
    ];

    // Hook logic
    const existingData = id ? agreements.find(a => a.id === id) : null;
    const {
        formData, updateField,
        aiLoading, aiError, handleAIGenerate,
        toggleClause, updateClause, removeClause, addCustomClause,
        clauseActionLoading, handleClauseAction,
        riskData, riskLoading, runRiskAnalysis,
        revenueLoading, runRevenueGenerate,
        paginatedPages
    } = useContractGenerator(existingData);

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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const data = { ...formData, updatedAt: new Date().toISOString() };
            if (id) await updateAgreement(id, data);
            else await addAgreement(data);
            navigate('/admin/agreements');
        } catch (error) {
            alert("Save Error: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const generatePDF = async () => {
        setIsSaving(true);
        const originalScale = previewScale;
        setPreviewScale(1);
        await new Promise(r => setTimeout(r, 800));
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pages = document.querySelectorAll('.agreement-page-render');
            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
            }
            pdf.save(`Newbi-Agreement-${formData.parties.secondParty.name || 'Draft'}.pdf`);
        } catch (error) {
            console.error(error);
        } finally {
            setPreviewScale(originalScale);
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: '1', label: 'Parties', icon: Users, desc: 'Legal Entities' },
        { id: '2', label: 'Scope', icon: Target, desc: 'Mission & Context' },
        { id: '3', label: 'Commercials', icon: CreditCard, desc: 'Financial Terms' },
        { id: '4', label: 'Clauses', icon: Gavel, desc: 'Legal Framework' },
        { id: '5', label: 'Revenue', icon: TrendingUp, desc: 'Smart Sharing' },
        { id: '6', label: 'Risk', icon: ShieldAlert, desc: 'Analysis' },
        { id: '7', label: 'Security', icon: Shield, desc: 'Execution' }
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

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
                        <h1 className="text-sm md:text-xl font-black uppercase tracking-tighter italic truncate">Contract <span className="text-neon-blue">Vault.</span></h1>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                    <button onClick={() => setShowAiSettings(!showAiSettings)} className={cn("p-2.5 md:p-3 rounded-2xl border transition-all", showAiSettings ? "bg-neon-blue/10 border-neon-blue/20 text-neon-blue" : "bg-white/5 border-white/5 text-gray-400")}><Settings size={16} /></button>
                    <button onClick={handleSave} disabled={isSaving} className="h-10 md:h-12 px-3 md:px-8 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl border border-white/10 transition-all flex items-center gap-2">
                        {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />} 
                        <span className="hidden sm:inline">Save Draft</span>
                    </button>
                    <button onClick={generatePDF} className="h-10 md:h-12 px-4 md:px-8 bg-neon-blue text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl shadow-[0_10px_30px_rgba(0,209,255,0.3)] hover:scale-105 transition-all flex items-center gap-2">
                        {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />} 
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Desktop Only */}
                <aside className="hidden lg:flex w-80 border-r border-white/5 bg-zinc-900/20 flex-col p-6 gap-6 overflow-y-auto scrollbar-hide">
                    <div className="space-y-4">
                        <ContractAIBox onGenerate={(p) => handleAIGenerate(p, aiApiKey, aiModel)} isLoading={aiLoading} />
                    </div>
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

                {/* Mobile Tab Navigation */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-[100] px-4 flex items-center justify-between overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex flex-col items-center justify-center min-w-[70px] h-full transition-all gap-1", activeTab === tab.id ? "text-neon-blue" : "text-gray-500")}>
                            <tab.icon size={18} />
                            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label.split(' ')[0]}</span>
                            {activeTab === tab.id && <div className="w-1 h-1 rounded-full bg-neon-blue mt-1 shadow-[0_0_8px_#00D1FF]" />}
                        </button>
                    ))}
                </div>

                {/* Editor */}
                <main className="flex-1 overflow-y-auto p-12 scrollbar-hide bg-[#050505]">
                    <div className="max-w-4xl mx-auto space-y-12">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                {activeTab === '1' && (
                                    <div className="space-y-10">
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
                                                                ? "bg-neon-blue border-neon-blue text-black scale-105 shadow-xl" 
                                                                : "bg-zinc-900 border-white/5 text-gray-500 hover:text-white"
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
                                                    <Input value={formData.parties.firstParty.address} onChange={e => updateField('parties.firstParty.address', e.target.value)} placeholder="Provider Address" className="h-14 bg-black/40 border-white/10" />
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3"><Users size={16} /> Second Party</h3>
                                                <div className="space-y-4">
                                                    <Input value={formData.parties.secondParty.name} onChange={e => updateField('parties.secondParty.name', e.target.value)} placeholder="Client Name" className="h-14 bg-black/40 border-white/10" />
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
                                        <FormattedTextArea value={formData.details.purpose} onChange={e => updateField('details.purpose', e.target.value)} placeholder="Describe the purpose and scope of engagement..." />
                                    </div>
                                )}

                                {activeTab === '3' && (
                                    <div className="space-y-10">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-blue font-black text-xs">{formData.commercials.currency}</span>
                                                <Input value={formData.commercials.totalValue} onChange={e => updateField('commercials.totalValue', e.target.value)} className="h-14 bg-black/40 border-white/10 pl-12" placeholder="Total Value" />
                                            </div>
                                            <select value={formData.commercials.currency} onChange={e => updateField('commercials.currency', e.target.value)} className="h-14 bg-black/40 border border-white/10 rounded-xl px-6 text-sm font-bold">
                                                <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
                                            </select>
                                        </div>
                                        <FormattedTextArea value={formData.commercials.paymentSchedule} onChange={e => updateField('commercials.paymentSchedule', e.target.value)} placeholder="Payment milestones and schedule..." minH="min-h-[150px]" />
                                    </div>
                                )}

                                {activeTab === '4' && (
                                    <ClauseMarketplace 
                                        activeClauses={formData.clauses} 
                                        onToggleClause={toggleClause} 
                                        onUpdateClause={updateClause} 
                                        onRemoveClause={removeClause} 
                                        onAddCustom={addCustomClause}
                                        onClauseAction={(id, act, content) => handleClauseAction(id, act, content, aiApiKey, aiModel)}
                                        actionLoading={clauseActionLoading}
                                    />
                                )}

                                {activeTab === '5' && (
                                    <div className="space-y-10">
                                        <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2rem] space-y-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-2xl bg-neon-blue/10 flex items-center justify-center text-neon-blue"><TrendingUp size={20} /></div>
                                                <h3 className="text-xl font-black uppercase tracking-tighter italic">Revenue Builder</h3>
                                            </div>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Generate smart revenue sharing clauses based on your deal parameters.</p>
                                            <div className="grid grid-cols-2 gap-6">
                                                <Input placeholder="Revenue % (e.g. 70/30)" className="h-14 bg-black/40" />
                                                <Input placeholder="Source (e.g. Ticket Sales)" className="h-14 bg-black/40" />
                                            </div>
                                            <button onClick={() => runRevenueGenerate({}, aiApiKey, aiModel)} disabled={revenueLoading} className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2">
                                                {revenueLoading ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />} Generate Revenue Clauses
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === '6' && (
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center px-4">
                                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Risk Assessment</h3>
                                            <button onClick={() => runRiskAnalysis(aiApiKey, aiModel)} disabled={riskLoading} className="px-6 py-3 bg-neon-blue/10 text-neon-blue border border-neon-blue/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                {riskLoading ? <RefreshCw className="animate-spin" size={14} /> : <ShieldAlert size={14} />} Analyze Risk
                                            </button>
                                        </div>
                                        {riskData ? (
                                            <div className="grid grid-cols-1 gap-6">
                                                <div className={cn("p-8 rounded-[2.5rem] border flex items-center justify-between", riskData.riskLevel === 'High' ? "bg-red-500/5 border-red-500/20" : "bg-emerald-500/5 border-emerald-500/20")}>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Contract Risk Profile</p>
                                                        <h2 className={cn("text-5xl font-black tracking-tighter mt-1", riskData.riskLevel === 'High' ? "text-red-500" : "text-emerald-500")}>{riskData.riskLevel?.toUpperCase()}</h2>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Protection Strength</p>
                                                        <p className="text-lg font-black italic">{riskData.protectionStrength}</p>
                                                    </div>
                                                </div>
                                                {riskData.keyRisks?.map((risk, i) => (
                                                    <div key={i} className="p-6 bg-zinc-900/40 border border-white/5 rounded-3xl flex gap-4 items-start">
                                                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0"><AlertCircle size={16} /></div>
                                                        <div>
                                                            <p className="text-[11px] font-black uppercase tracking-widest">{risk.title}</p>
                                                            <p className="text-[10px] text-gray-500 mt-1">{risk.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-60 flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed border-white/5 rounded-[3rem]">
                                                <ShieldAlert size={40} className="mb-4" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Run Risk Engine to analyze contract robustness</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === '7' && (
                                    <div className="space-y-10">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] space-y-6">
                                                <h3 className="text-lg font-black uppercase tracking-tighter italic">Document Settings</h3>
                                                <div className="space-y-4">
                                                    <button onClick={() => updateField('showSeal', !formData.showSeal)} className={cn("w-full h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2", formData.showSeal ? "bg-white text-black" : "bg-transparent text-gray-500 border-white/10")}>
                                                        {formData.showSeal ? <Eye size={14} /> : <EyeOff size={14} />} Official Seal
                                                    </button>
                                                    <button onClick={() => updateField('showSignature', !formData.showSignature)} className={cn("w-full h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2", formData.showSignature ? "bg-white text-black" : "bg-transparent text-gray-500 border-white/10")}>
                                                        {formData.showSignature ? <Eye size={14} /> : <EyeOff size={14} />} Digital Signatures
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem]">
                                                <DocumentSeal type="agreement" className="w-32 h-32 opacity-80" />
                                                <p className="text-[10px] font-black uppercase tracking-widest mt-6">Execution Ref: {formData.agreementNumber}</p>
                                            </div>
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
                                    if (idx > 0) setActiveTab(tabs[idx - 1].id);
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
                                    if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id);
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                                    activeTab === tabs[tabs.length - 1].id 
                                        ? "bg-white/5 text-gray-500 cursor-not-allowed opacity-50" 
                                        : "bg-neon-blue text-black hover:scale-105 shadow-[0_0_20px_rgba(0,209,255,0.2)]"
                                )}
                            >
                                <span>{activeTab === tabs[tabs.length - 1].id ? 'Final Step' : 'Next Section'}</span>
                                {activeTab !== tabs[tabs.length - 1].id && <ChevronRight size={16} />}
                            </button>
                        </div>
                    </div>
                </main>

                {/* Preview Panel */}
                <aside className="w-[500px] border-l border-white/5 bg-zinc-900/40 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <div className="flex items-center gap-3">
                            <Eye size={16} className="text-neon-blue" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Preview</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} className="p-2 bg-white/5 rounded-lg text-gray-500"><ChevronLeft size={14} /></button>
                            <span className="text-[10px] font-black text-gray-500">P. {currentPage + 1} / {paginatedPages.length}</span>
                            <button onClick={() => setCurrentPage(Math.min(paginatedPages.length - 1, currentPage + 1))} className="p-2 bg-white/5 rounded-lg text-gray-500"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                    <div ref={previewContainerRef} className="flex-1 bg-zinc-950 flex flex-col items-center justify-start p-8 overflow-y-auto relative">
                        <ContractPreview formData={formData} paginatedPages={paginatedPages} currentPage={currentPage} previewScale={previewScale} />
                        <div className="h-20 shrink-0" />
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default AgreementGenerator;
