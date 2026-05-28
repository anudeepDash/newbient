import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Maximize2 from 'lucide-react/dist/esm/icons/maximize-2';
import Minimize2 from 'lucide-react/dist/esm/icons/minimize-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Save from 'lucide-react/dist/esm/icons/save';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Download from 'lucide-react/dist/esm/icons/download';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import X from 'lucide-react/dist/esm/icons/x';
import Send from 'lucide-react/dist/esm/icons/send';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Target from 'lucide-react/dist/esm/icons/target';
import Users from 'lucide-react/dist/esm/icons/users';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Layers from 'lucide-react/dist/esm/icons/layers';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import Scale from 'lucide-react/dist/esm/icons/scale';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import Stamp from 'lucide-react/dist/esm/icons/stamp';
import Gavel from 'lucide-react/dist/esm/icons/gavel';
import Lock from 'lucide-react/dist/esm/icons/lock';
import History from 'lucide-react/dist/esm/icons/history';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import SignatureModal from '../../components/ui/SignatureModal';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import DocumentSeal from '../../components/ui/DocumentSeal';
import StudioRichEditor from '../../components/ui/StudioRichEditor';

// Contract Vault Sub-components
import useContractGenerator from '../../components/admin/useContractGenerator';
import ClauseMarketplace from '../../components/admin/ClauseMarketplace';
import ContractPreview from '../../components/admin/ContractPreview';
import { generateFullDocument, reviseDocument, refineFieldContent } from '../../lib/ai';


const renderChatMessage = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    const elements = [];
    let i = 0;
    
    const formatInline = (t) => {
        if (!t) return '';
        return t
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === '') {
            elements.push(<div key={`spacer-${i}`} className="h-1.5" />);
            i++;
            continue;
        }

        const headingMatch = line.match(/^(#{1,6})(?:\s|&nbsp;|\u00a0)+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = headingMatch[2];
            const sizeClass = level === 1 ? "text-[13px] font-bold" : level === 2 ? "text-[12px] font-bold" : "text-[11px] font-semibold text-zinc-400";
            elements.push(<p key={i} className={cn(sizeClass, "mt-2 mb-1 text-white")} dangerouslySetInnerHTML={{ __html: formatInline(headingText) }} />);
        } else if (line.match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
            const items = [];
            while (i < lines.length && lines[i].match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
                items.push(lines[i].replace(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/, '').trim());
                i++;
            }
            elements.push(
                <ul key={`ul-${i}`} className="list-disc ml-4 my-1.5 space-y-1 text-zinc-300">
                    {items.map((item, j) => (
                        <li key={j} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
                    ))}
                </ul>
            );
            continue;
        } else if (line.match(/^\d+\.(?:\s|&nbsp;|\u00a0)+/)) {
            const items = [];
            while (i < lines.length && lines[i].match(/^\d+\.(?:\s|&nbsp;|\u00a0)+/)) {
                items.push(lines[i].replace(/^\d+\.(?:\s|&nbsp;|\u00a0)+/, '').trim());
                i++;
            }
            elements.push(
                <ol key={`ol-${i}`} className="list-decimal ml-4 my-1.5 space-y-1 text-zinc-300">
                    {items.map((item, j) => (
                        <li key={j} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
                    ))}
                </ol>
            );
            continue;
        } else {
            elements.push(<p key={i} className="mb-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />);
        }
        i++;
    }
    return <div className="space-y-0.5">{elements}</div>;
};


const ContractGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addAgreement, updateAgreement, agreements, user, addToast } = useStore();
    
    // UI State
    const [activeTab, setActiveTab] = useState('ai');
    const [previewScale, setPreviewScale] = useState(0.5);
    const [userZoom, setUserZoom] = useState(1);
    const [isExpandedPreview, setIsExpandedPreview] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [promptBoxClear, setPromptBoxClear] = useState(false);
    const [bulkRawText, setBulkRawText] = useState('');
    const [generatingSection, setGeneratingSection] = useState(null);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const previewContainerRef = useRef(null);

    // AI Studio State
    const [messages, setMessages] = useState([
        {
            id: 'init-msg',
            sender: 'ai',
            text: "Welcome to Newbi AI Agreement Studio. Describe the contract requirements or clauses you want in the prompt box below, choose 'Generate New' or 'Chat & Revise', and I will draft a comprehensive agreement. Click the sparkles icon next to any field to refine it directly!"
        }
    ]);
    const [promptText, setPromptText] = useState('');
    const [aiMode, setAiMode] = useState('generate');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionCategory, setSuggestionCategory] = useState(0);
    const [refinementContext, setRefinementContext] = useState(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const htmlToPlainText = (html) => {
        if (!html) return '';
        if (!html.includes('<') || !html.includes('>')) return html;
        let text = html;
        text = text.replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|ul|ol)>/gi, '\n');
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<[^>]+>/g, '');
        text = text.replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
        return text.trim();
    };

    const handleRefineClick = (fieldKey, fieldLabel, currentValue) => {
        setRefinementContext({
            fieldKey,
            fieldLabel,
            currentValue: currentValue || ''
        });
    };

    const handleInlineRefineSubmit = async () => {
        if (!refinementPrompt.trim() || isRefining || !refinementContext) return;
        setIsRefining(true);
        try {
            const refined = await refineFieldContent(
                'contract',
                refinementContext.fieldLabel,
                refinementContext.currentValue,
                refinementPrompt.trim(),
                'Premium'
            );

            const fieldKey = refinementContext.fieldKey;
            if (fieldKey.startsWith('clauses[')) {
                const match = fieldKey.match(/clauses\[([^\]]+)\]/);
                if (match) {
                    const clauseId = match[1];
                    updateClause(clauseId, { content: refined });
                }
            } else {
                updateField(fieldKey, refined);
            }

            addToast(`Field "${refinementContext.fieldLabel}" successfully refined!`, 'success');
            setRefinementContext(null);
            setRefinementPrompt('');
        } catch (err) {
            console.error(err);
            addToast(`Refinement failed: ${err.message}`, 'error');
        } finally {
            setIsRefining(false);
        }
    };

    const chatEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const [generationStage, setGenerationStage] = useState(0);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationTime, setGenerationTime] = useState(0);

    const STAGE_MESSAGES = useMemo(() => [
        { text: "Establishing connection to neural node...", progress: 15 },
        { text: "Analyzing prompt & structural constraints...", progress: 40 },
        { text: "Synthesizing document data fields...", progress: 65 },
        { text: "Formulating line items & pricing dynamics...", progress: 85 },
        { text: "Polishing final layout parameters...", progress: 95 }
    ], []);

    useEffect(() => {
        let timer;
        let stageTimer;
        if (isGenerating) {
            setGenerationStage(0);
            setGenerationProgress(15);
            setGenerationTime(0);
            
            timer = setInterval(() => {
                setGenerationTime(prev => prev + 1);
            }, 1000);

            stageTimer = setInterval(() => {
                setGenerationStage(prev => {
                    const next = Math.min(prev + 1, STAGE_MESSAGES.length - 1);
                    setGenerationProgress(STAGE_MESSAGES[next].progress);
                    return next;
                });
            }, 2500);
        } else {
            setGenerationStage(0);
            setGenerationProgress(0);
            setGenerationTime(0);
        }
        return () => {
            clearInterval(timer);
            clearInterval(stageTimer);
        };
    }, [isGenerating, STAGE_MESSAGES]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const suggestions = React.useMemo(() => {
        const agreementSuggestions = [
            [
                "Master Service Agreement for ongoing digital marketing and talent management services",
                "Non-Disclosure Agreement for sharing event logistics data with vendor",
                "Memorandum of Understanding for co-producing a campus tech fest"
            ],
            [
                "Service agreement for event security services with liability protection",
                "Talent booking agreement for stand-up comedy performance at corporate event",
                "Venue partnership agreement with commission structure and slot allocations"
            ]
        ];
        return agreementSuggestions[suggestionCategory] || agreementSuggestions[0];
    }, [suggestionCategory]);

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
                const containerWidth = previewContainerRef.current.clientWidth - 48; // padding
                const containerHeight = previewContainerRef.current.clientHeight - 48; // padding
                const scaleWidth = containerWidth / 794;
                const scaleHeight = containerHeight / 1123;
                const autoScale = isExpandedPreview ? Math.min(scaleWidth, scaleHeight) : scaleWidth;
                setPreviewScale(Math.max(0.1, Math.min(2.0, autoScale)) * userZoom);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [userZoom, isExpandedPreview]);



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
            useStore.getState().addToast("Save Error: " + error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStudioSubmit = async () => {
        if (!promptText.trim() || isGenerating) return;
        const currentPrompt = promptText.trim();
        setPromptText('');

        setMessages(prev => [...prev, { id: String(Date.now()) + '-user', sender: 'user', text: currentPrompt }]);
        setIsGenerating(true);

        try {
            if (refinementContext) {
                const refined = await refineFieldContent(
                    'contract',
                    refinementContext.fieldLabel,
                    refinementContext.currentValue,
                    currentPrompt,
                    'Premium'
                );

                const fieldKey = refinementContext.fieldKey;
                if (fieldKey.startsWith('clauses[')) {
                    const match = fieldKey.match(/clauses\[([^\]]+)\]/);
                    if (match) {
                        const clauseId = match[1];
                        updateClause(clauseId, { content: refined });
                    }
                } else {
                    updateField(fieldKey, refined);
                }

                setMessages(prev => [...prev, {
                    id: String(Date.now()) + '-ai',
                    sender: 'ai',
                    text: `✓ Refinement applied to "${refinementContext.fieldLabel}"! Output updated in the preview.`
                }]);
                setRefinementContext(null);
                addToast(`Field "${refinementContext.fieldLabel}" successfully refined!`, 'success');
            } else if (aiMode === 'generate') {
                const data = await generateFullDocument('contract', currentPrompt, 'Premium', {});
                setFormData(prev => ({
                    ...prev,
                    parties: {
                        firstParty: {
                            ...prev.parties.firstParty,
                            ...(data.parties?.firstParty || {}),
                            name: data.parties?.firstParty?.name || prev.parties.firstParty.name || 'Newbi Entertainment',
                            role: data.parties?.firstParty?.role || prev.parties.firstParty.role || 'Service Provider',
                        },
                        secondParty: {
                            ...prev.parties.secondParty,
                            ...(data.parties?.secondParty || {}),
                        }
                    },
                    details: {
                        ...prev.details,
                        ...(data.details || {}),
                    },
                    commercials: {
                        ...prev.commercials,
                        ...(data.commercials || {}),
                    },
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
                    template: data.template || prev.template,
                }));

                setMessages(prev => [...prev, {
                    id: String(Date.now()) + '-ai',
                    sender: 'ai',
                    text: `✓ Agreement for "${data.parties?.secondParty?.name || 'Partner'}" generated successfully! I added ${data.clauses?.length || 0} legal clauses. \n\nI have switched your mode to **Chat & Revise** so you can make modifications directly. Or feel free to adjust using the manual tabs.`
                }]);
                setAiMode('refine');
                addToast('Agreement successfully generated!', 'success');
            } else {
                const updatedDoc = await reviseDocument(formData, currentPrompt, 'Premium');
                setFormData(prev => ({
                    ...prev,
                    ...updatedDoc,
                    parties: {
                        firstParty: { ...prev.parties.firstParty, ...(updatedDoc.parties?.firstParty || {}) },
                        secondParty: { ...prev.parties.secondParty, ...(updatedDoc.parties?.secondParty || {}) }
                    },
                    details: { ...prev.details, ...(updatedDoc.details || {}) },
                    commercials: { ...prev.commercials, ...(updatedDoc.commercials || {}) },
                    clauses: updatedDoc.clauses?.length > 0 
                        ? updatedDoc.clauses.map((c, i) => ({
                            id: c.id || `ai-clause-${Date.now()}-${i}`,
                            title: c.title || `Clause ${i + 1}`,
                            content: c.content || '',
                            isActive: c.isActive !== false,
                            isCustom: true,
                            strictness: 'medium',
                            category: 'custom'
                        }))
                        : prev.clauses
                }));

                setMessages(prev => [...prev, {
                    id: String(Date.now()) + '-ai',
                    sender: 'ai',
                    text: `✓ Document refined according to request: "${currentPrompt}". You can inspect the updated preview on the right.`
                }]);
                addToast('Document successfully refined!', 'success');
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                id: String(Date.now()) + '-ai-err',
                sender: 'ai',
                text: `⚠ Failed to process request: ${err.message}`
            }]);
            addToast(`Error: ${err.message}`, 'error');
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
            // Lazy load libraries
            const [jsPDFModule, html2canvasModule] = await Promise.all([
                import('jspdf'),
                import('html2canvas')
            ]);
            const jsPDF = jsPDFModule.default;
            const html2canvas = html2canvasModule.default;

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
        { id: 'ai', label: 'AI Studio', icon: Sparkles, desc: 'AI Document Orchestrator' },
        { id: '1', label: 'Parties', icon: Users, desc: 'Contracting Entities' },
        { id: '2', label: 'Purpose & Scope', icon: Target, desc: 'Mission & Framework', visibilityKey: 'mission' },
        { id: '3', label: 'Financial Terms', icon: CreditCard, desc: 'Commercial Agreements', visibilityKey: 'commercials' },
        { id: '4', label: 'Legal Clauses', icon: Gavel, desc: 'Terms & Conditions', visibilityKey: 'clauses' },
        { id: '7', label: 'Signatures & Seal', icon: Shield, desc: 'Execution & Signatures' }
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        // Map tab IDs to paginated page types for preview sync
        const mapping = { 
            'ai': 'intro',
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
                    <div className="min-w-0 flex flex-col justify-center">
                        <h1 className="text-sm md:text-xl font-black uppercase tracking-tighter italic truncate mb-1">Contract <span className="text-[#A855F7]">Vault.</span></h1>
                        <p className="text-[7px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] leading-none truncate">Contract Operating System</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                    <button 
                        onClick={() => setShowPreviewMobile(!showPreviewMobile)} 
                        className="lg:hidden h-10 px-3 bg-[#A855F7]/10 rounded-xl border border-[#A855F7]/20 text-[#A855F7] flex items-center gap-2 active:scale-95 transition-all"
                    >
                        <Eye size={14} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Preview</span>
                    </button>
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

            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Sidebar - Desktop Only */}
                <aside className={cn(
                    "hidden lg:flex w-64 shrink-0 border-r border-white/5 bg-zinc-900/20 flex-col p-6 gap-6 overflow-y-auto scrollbar-hide",
                    isExpandedPreview && "lg:hidden"
                )}>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-4 mb-4">Navigation</p>
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={cn("w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left group", activeTab === tab.id ? "bg-white text-black shadow-[0_0_20px_rgba(168,85,247,0.2)]" : "hover:bg-white/5 text-gray-500 hover:text-white")}>
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
                <main className={cn(
                    "flex-grow scrollbar-hide bg-[#050505]",
                    activeTab === 'ai' ? "h-full overflow-hidden p-4 md:p-6 pb-4 flex flex-col" : "px-4 md:px-12 py-10 md:py-16 overflow-y-auto pb-32",
                    isExpandedPreview && "hidden"
                )}>
                    <div className={cn("max-w-[1600px] mx-auto w-full", activeTab === 'ai' ? "h-full flex-grow flex flex-col min-h-0" : "space-y-10 md:space-y-12")}>
                        
                        {/* Minimalist Section Header */}
                        {activeTab !== 'ai' && (
                            <div className="flex flex-col md:flex-row items-end justify-between mb-16 pb-8 border-b border-white/5 relative">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-[2px] bg-[#A855F7]/40" />
                                        <p className="text-[10px] font-black text-[#A855F7] uppercase tracking-[0.4em] opacity-80">
                                            Step {tabs.findIndex(t => t.id === activeTab) + 1} of {tabs.length}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter italic text-white leading-none">
                                            {tabs.find(t => t.id === activeTab)?.label}<span className="text-[#A855F7]">.</span>
                                        </h2>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.3em] pl-1">
                                            {tabs.find(t => t.id === activeTab)?.desc}
                                        </p>
                                    </div>
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
                                            <VisibilityToggle field={currentTab.visibilityKey} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className={cn(activeTab === 'ai' ? "flex-grow flex flex-col min-h-0 h-full" : "space-y-16")}>
                                {activeTab === 'ai' && (
                                    <div className="flex flex-col flex-grow flex-1 min-h-0 h-full bg-zinc-950/20 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden">
                                        {/* Orbital Glow in Background */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#A855F7]/5 rounded-full blur-3xl pointer-events-none" />

                                        {/* Brand Header */}
                                        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 shrink-0 relative z-10">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-[#A855F7]/10 flex items-center justify-center border border-[#A855F7]/20">
                                                    <Zap size={14} className="text-[#A855F7] animate-pulse" />
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-[#A855F7] uppercase tracking-[0.3em] block leading-none mb-0.5">Primary Model</span>
                                                    <h3 className="text-xs font-black uppercase text-white tracking-wide leading-none">Gemini 3.5 Flash<span className="text-[#A855F7]">.</span></h3>
                                                </div>
                                            </div>
                                            {/* Mode status indicator */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Mode:</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-[#A855F7] shadow-sm">
                                                    {refinementContext ? 'Field Refinement' : (aiMode === 'generate' ? 'First Draft' : 'Refinement & Chat')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mode Switcher inside AI Studio */}
                                        <div className="flex items-center bg-zinc-950 border border-white/5 rounded-2xl p-1 gap-1 mb-4 z-10 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setAiMode('generate')}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                                                    aiMode === 'generate' ? "bg-[#A855F7] text-black shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                <Sparkles size={12} />
                                                <span>Generate New</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAiMode('refine')}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                                                    aiMode === 'refine' ? "bg-[#A855F7] text-black shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                <Send size={12} />
                                                <span>Chat & Revise</span>
                                            </button>
                                        </div>

                                        {/* Message Stream */}
                                         <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 relative z-10 flex flex-col min-h-0">
                                             {/* Welcome card if only initial message */}
                                             {messages.length === 1 && (
                                                 <div className="my-auto py-2 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-3">
                                                     <div className="relative">
                                                         <div className="absolute -inset-1 bg-gradient-to-r from-[#A855F7] via-purple-500 to-indigo-500 rounded-full blur opacity-30 animate-pulse" />
                                                         <div className="relative w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center">
                                                             <Sparkles size={16} className="text-[#A855F7]" />
                                                         </div>
                                                     </div>
                                                     <div className="space-y-1">
                                                         <h4 className="text-sm font-black uppercase tracking-tight italic text-white">AI Agreement Orchestrator</h4>
                                                         <p className="text-[10px] text-gray-400 leading-normal font-medium">
                                                             Describe your requirements below to draft a complete legally-binding agreement in seconds.
                                                         </p>
                                                     </div>

                                                     {/* Suggestions Grid */}
                                                     <div className="w-full space-y-2 pt-1">
                                                         <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest block">Suggested Templates</span>
                                                         <div className="grid grid-cols-1 gap-1.5">
                                                             {suggestions.map((s, idx) => (
                                                                 <button
                                                                     type="button"
                                                                     key={idx}
                                                                     onClick={() => setPromptText(s)}
                                                                     className="w-full text-left py-2 px-3.5 bg-white/[0.02] border border-white/5 hover:border-[#A855F7]/20 hover:bg-[#A855F7]/5 rounded-2xl text-[10px] font-bold text-gray-400 hover:text-white transition-all duration-300 leading-normal group"
                                                                 >
                                                                     <div className="flex items-start gap-2">
                                                                         <span className="text-[#A855F7] mt-0.5 text-[8px]">✦</span>
                                                                         <span className="flex-1">{s}</span>
                                                                     </div>
                                                                 </button>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 </div>
                                             )}

                                             {messages.length > 1 && messages.map(m => (
                                                 <div
                                                     key={m.id}
                                                     className={cn(
                                                         "max-w-[80%] rounded-[2rem] p-5 text-xs leading-relaxed transition-all shadow-md relative overflow-hidden group",
                                                         m.sender === 'user'
                                                             ? "bg-zinc-900 text-zinc-100 self-end rounded-tr-none border border-white/5"
                                                             : "bg-white/[0.02] border border-white/[0.04] text-zinc-300 self-start rounded-tl-none"
                                                     )}
                                                 >
                                                     <div className="flex items-center gap-2 mb-2">
                                                         <span className={cn(
                                                             "text-[8px] font-black uppercase tracking-wider",
                                                             m.sender === 'user' ? "text-gray-400" : "text-[#A855F7]"
                                                         )}>
                                                             {m.sender === 'user' ? 'You' : 'Gemini 3.5 Flash'}
                                                         </span>
                                                     </div>
                                                     <div className="font-medium leading-relaxed">{renderChatMessage(m.text)}</div>
                                                 </div>
                                             ))}

                                             {/* Generating Bubble */}
                                             {isGenerating && (
                                                 <div className="bg-white/[0.02] border border-white/[0.04] text-zinc-300 self-start rounded-[2rem] rounded-tl-none p-5 text-xs w-[280px] sm:w-[320px] flex flex-col gap-3 shadow-md">
                                                     <div className="flex items-center gap-2">
                                                         <Sparkles size={14} className="text-[#A855F7] animate-spin shrink-0" />
                                                         <span className="font-bold uppercase tracking-wider text-[10px] text-[#A855F7] flex-1 truncate">
                                                             {STAGE_MESSAGES[generationStage]?.text || "Negotiating contract..."}
                                                         </span>
                                                         <span className="text-[9px] font-mono text-zinc-500 font-bold shrink-0">
                                                             {generationTime}s
                                                         </span>
                                                     </div>
                                                     <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                                                         <div 
                                                             className="h-full bg-[#A855F7] transition-all duration-500" 
                                                             style={{ width: `${generationProgress}%` }}
                                                         />
                                                     </div>
                                                 </div>
                                             )}
                                             <div ref={chatEndRef} />
                                         </div>

                                        {/* Prompt container wrapped in .gemini-border-wrap-purple */}
                                        <div className="mt-auto pt-4 bg-transparent shrink-0">
                                            {/* WhatsApp quoted context container */}
                                            {refinementContext && (
                                                <div className="px-4 py-3 bg-zinc-900/80 border-l-4 border-[#A855F7] rounded-r-2xl flex items-center justify-between gap-4 mb-3 border border-white/5 border-l-0 shadow-lg relative overflow-hidden group">
                                                    <div className="absolute inset-0 bg-[#A855F7]/5 opacity-40" />
                                                    <div className="min-w-0 relative z-10">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#A855F7] block mb-0.5">Refining: {refinementContext.fieldLabel}</span>
                                                        <p className="text-xs text-gray-400 line-clamp-1 italic">
                                                            "{refinementContext.currentValue || 'No current content...'}"
                                                        </p>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setRefinementContext(null)}
                                                        className="p-1.5 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-all shrink-0 relative z-10"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* The Input box container */}
                                            <div className="gemini-border-wrap-purple shadow-[0_15px_40px_rgba(168,85,247,0.15)] relative">
                                                <div className="bg-[#050505] rounded-[1.4rem] p-3 flex items-end gap-3">
                                                    <textarea
                                                        value={promptText}
                                                        onChange={e => setPromptText(e.target.value)}
                                                        placeholder={refinementContext ? `Ask AI to refine "${refinementContext.fieldLabel}"...` : "Describe the contract you want to generate or modify..."}
                                                        className="flex-1 bg-transparent border-none text-[13px] font-medium text-white placeholder:text-zinc-600 outline-none min-h-[44px] max-h-[160px] py-2 px-3 resize-none leading-relaxed"
                                                        rows={1}
                                                        disabled={isGenerating}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleStudioSubmit();
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleStudioSubmit}
                                                        disabled={!promptText.trim() || isGenerating}
                                                        className="p-3 bg-[#A855F7] text-black rounded-xl hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-20 disabled:scale-100 flex items-center justify-center shadow-lg"
                                                    >
                                                        {isGenerating ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                                                    </button>
                                                </div>
                                            </div>
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
                                                    <div className="relative group/refine w-full">
                                                        <Input value={formData.parties.firstParty.name} onChange={e => updateField('parties.firstParty.name', e.target.value)} placeholder="Provider Name" className="h-14 bg-black/40 border-white/10 pr-12" />
                                                        <button type="button" onClick={() => handleRefineClick('parties.firstParty.name', 'Provider Name', formData.parties.firstParty.name)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="relative group/refine w-full">
                                                            <Input value={formData.parties.firstParty.role} onChange={e => updateField('parties.firstParty.role', e.target.value)} placeholder="Role (e.g. Provider)" className="h-14 bg-black/40 border-white/10 pr-12" />
                                                            <button type="button" onClick={() => handleRefineClick('parties.firstParty.role', 'Provider Role', formData.parties.firstParty.role)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                        </div>
                                                        <div className="relative group/refine w-full">
                                                            <Input value={formData.parties.firstParty.acronym} onChange={e => updateField('parties.firstParty.acronym', e.target.value)} placeholder="Acronym (e.g. NB)" className="h-14 bg-black/40 border-white/10 pr-12" />
                                                            <button type="button" onClick={() => handleRefineClick('parties.firstParty.acronym', 'Provider Acronym', formData.parties.firstParty.acronym)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                        </div>
                                                    </div>
                                                    <div className="relative group/refine w-full">
                                                        <Input value={formData.parties.firstParty.address} onChange={e => updateField('parties.firstParty.address', e.target.value)} placeholder="Provider Address" className="h-14 bg-black/40 border-white/10 pr-12" />
                                                        <button type="button" onClick={() => handleRefineClick('parties.firstParty.address', 'Provider Address', formData.parties.firstParty.address)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3"><Users size={16} /> Second Party</h3>
                                                <div className="space-y-4">
                                                    <div className="relative group/refine w-full">
                                                        <Input value={formData.parties.secondParty.name} onChange={e => updateField('parties.secondParty.name', e.target.value)} placeholder="Client Name" className="h-14 bg-black/40 border-white/10 pr-12" />
                                                        <button type="button" onClick={() => handleRefineClick('parties.secondParty.name', 'Client Name', formData.parties.secondParty.name)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="relative group/refine w-full">
                                                            <Input value={formData.parties.secondParty.role} onChange={e => updateField('parties.secondParty.role', e.target.value)} placeholder="Role (e.g. Client)" className="h-14 bg-black/40 border-white/10 pr-12" />
                                                            <button type="button" onClick={() => handleRefineClick('parties.secondParty.role', 'Client Role', formData.parties.secondParty.role)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                        </div>
                                                        <div className="relative group/refine w-full">
                                                            <Input value={formData.parties.secondParty.acronym} onChange={e => updateField('parties.secondParty.acronym', e.target.value)} placeholder="Acronym (e.g. TUM)" className="h-14 bg-black/40 border-white/10 pr-12" />
                                                            <button type="button" onClick={() => handleRefineClick('parties.secondParty.acronym', 'Client Acronym', formData.parties.secondParty.acronym)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                        </div>
                                                    </div>
                                                    <div className="relative group/refine w-full">
                                                        <Input value={formData.parties.secondParty.address} onChange={e => updateField('parties.secondParty.address', e.target.value)} placeholder="Client Address" className="h-14 bg-black/40 border-white/10 pr-12" />
                                                        <button type="button" onClick={() => handleRefineClick('parties.secondParty.address', 'Client Address', formData.parties.secondParty.address)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === '2' && (
                                    <div className="space-y-10">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="relative group/refine w-full">
                                                <Input value={formData.details.projectName} onChange={e => updateField('details.projectName', e.target.value)} placeholder="Project Name" className="h-14 bg-black/40 border-white/10 pr-12" />
                                                <button type="button" onClick={() => handleRefineClick('details.projectName', 'Project Name', formData.details.projectName)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                            </div>
                                            <div className="relative group/refine w-full">
                                                <Input value={formData.details.territory} onChange={e => updateField('details.territory', e.target.value)} placeholder="Territory" className="h-14 bg-black/40 border-white/10 pr-12" />
                                                <button type="button" onClick={() => handleRefineClick('details.territory', 'Territory', formData.details.territory)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                            </div>
                                        </div>
                                        <div className="relative group/refine w-full">
                                            <StudioRichEditor 
                                                label="Contract Purpose"
                                                value={formData.details.purpose} 
                                                onChange={val => updateField('details.purpose', val)} 
                                                placeholder="Describe the purpose and scope of engagement..." 
                                                minHeight="200px" 
                                                accentColor="neon-purple"
                                            />
                                            <button type="button" onClick={() => handleRefineClick('details.purpose', 'Contract Purpose', formData.details.purpose)} className="absolute right-4 top-2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-[70]" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === '3' && (
                                    <div className="space-y-10">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="relative group/refine w-full">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-purple font-black text-xs">{formData.commercials.currency}</span>
                                                <Input value={formData.commercials.totalValue} onChange={e => updateField('commercials.totalValue', e.target.value)} className="h-14 bg-black/40 border-white/10 pl-12 pr-12" placeholder="Total Value" />
                                                <button type="button" onClick={() => handleRefineClick('commercials.totalValue', 'Total Value', formData.commercials.totalValue)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                            </div>
                                            <select value={formData.commercials.currency} onChange={e => updateField('commercials.currency', e.target.value)} className="h-14 bg-black/40 border border-white/10 rounded-xl px-6 text-sm font-bold">
                                                <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
                                            </select>
                                        </div>
                                        <div className="relative group/refine w-full">
                                            <StudioRichEditor 
                                                label="Payment Schedule"
                                                value={formData.commercials.paymentSchedule} 
                                                onChange={val => updateField('commercials.paymentSchedule', val)} 
                                                placeholder="Payment milestones and schedule..." 
                                                minHeight="150px" 
                                                accentColor="neon-purple"
                                            />
                                            <button type="button" onClick={() => handleRefineClick('commercials.paymentSchedule', 'Payment Schedule', formData.commercials.paymentSchedule)} className="absolute right-4 top-2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-[#A855F7] hover:text-white rounded-xl hover:scale-105 z-[70]" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === '4' && (
                                    <ClauseMarketplace 
                                        activeClauses={formData.clauses} 
                                        onToggleClause={toggleClause} 
                                        onUpdateClause={updateClause} 
                                        onRemoveClause={removeClause} 
                                        onAddCustom={addCustomClause}
                                        onRefineClick={(clauseKey, title, content) => handleRefineClick(clauseKey, title, content)}
                                    />
                                )}
                                {activeTab === '7' && (
                                    <div className="flex flex-col gap-10">
                                        {/* Row 1: Security & Identity */}
                                        <div className="flex flex-col gap-8">
                                            {/* Security Controls - Full Width */}
                                            <div className="p-8 md:p-10 bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[3rem] relative overflow-hidden">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-[#A855F7]/10 flex items-center justify-center border border-[#A855F7]/20 shrink-0">
                                                            <ShieldCheck size={28} className="text-[#A855F7]" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-[#A855F7] uppercase tracking-[0.4em]">Verification</p>
                                                            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-none">Security Controls.</h3>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-4">
                                                        <button 
                                                            onClick={() => setFormData({...formData, showSeal: !formData.showSeal})} 
                                                            className={cn(
                                                                "h-20 w-full rounded-3xl border transition-all duration-500 group/btn relative overflow-hidden flex items-center px-6 gap-5",
                                                                formData.showSeal 
                                                                    ? "bg-[#A855F7] text-black border-[#A855F7] shadow-[0_20px_40px_rgba(168,85,247,0.25)]" 
                                                                    : "bg-white/[0.02] text-gray-500 border-white/5 hover:border-white/20 hover:bg-white/[0.05]"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0",
                                                                formData.showSeal ? "bg-black/10 scale-110 shadow-inner" : "bg-white/5"
                                                            )}>
                                                                <Stamp size={22} className={cn("transition-transform duration-500 group-hover/btn:rotate-12", formData.showSeal ? "text-black" : "text-gray-500")} />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className={cn("text-[8px] font-black uppercase tracking-[0.2em] mb-0.5", formData.showSeal ? "text-black/60" : "text-gray-600")}>Protocol</p>
                                                                <p className="text-[11px] font-black uppercase tracking-widest">Official Seal</p>
                                                            </div>
                                                        </button>

                                                        <button 
                                                            onClick={() => setFormData({...formData, showSignatures: !formData.showSignatures})} 
                                                            className={cn(
                                                                "h-20 w-full rounded-3xl border transition-all duration-500 group/btn relative overflow-hidden flex items-center px-6 gap-5",
                                                                formData.showSignatures 
                                                                    ? "bg-[#A855F7] text-black border-[#A855F7] shadow-[0_20px_40px_rgba(168,85,247,0.25)]" 
                                                                    : "bg-white/[0.02] text-gray-500 border-white/5 hover:border-white/20 hover:bg-white/[0.05]"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0",
                                                                formData.showSignatures ? "bg-black/10 scale-110 shadow-inner" : "bg-white/5"
                                                            )}>
                                                                <PenTool size={22} className={cn("transition-transform duration-500 group-hover/btn:rotate-12", formData.showSignatures ? "text-black" : "text-gray-500")} />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className={cn("text-[8px] font-black uppercase tracking-[0.2em] mb-0.5", formData.showSignatures ? "text-black/60" : "text-gray-600")}>Protocol</p>
                                                                <p className="text-[11px] font-black uppercase tracking-widest">Digital Sign</p>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Signatory Identity - Full Width */}
                                            <div className="p-10 bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[3rem] relative overflow-hidden">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Authorized Representative</label>
                                                        <input value={formData.senderName} onChange={e => setFormData({...formData, senderName: e.target.value})} placeholder="Full Legal Name" className="h-20 w-full bg-black/60 border border-white/5 focus:border-[#A855F7]/50 rounded-[1.5rem] text-lg font-black px-8 text-white outline-none transition-all placeholder:text-gray-800" />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Corporate Designation</label>
                                                        <input value={formData.senderDesignation} onChange={e => setFormData({...formData, senderDesignation: e.target.value})} placeholder="e.g. Director" className="h-20 w-full bg-black/60 border border-white/5 focus:border-[#A855F7]/50 rounded-[1.5rem] text-lg font-black px-8 text-white outline-none transition-all placeholder:text-gray-800" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Signature Pad - FULL WIDTH */}
                                        <div className="p-8 md:p-10 bg-zinc-900/40 border border-white/5 rounded-[3rem] relative overflow-hidden group">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#A855F7]/10 flex items-center justify-center border border-[#A855F7]/20">
                                                        <PenTool size={22} className="text-[#A855F7]" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-black text-white uppercase tracking-tighter italic">Signature Capture.</h4>
                                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Biometric Authentication Interface</p>
                                                    </div>
                                                </div>
                                                {formData.providerSignature && (
                                                    <button onClick={() => updateField('providerSignature', null)} className="h-10 px-5 rounded-xl bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                                                        Clear Pad
                                                    </button>
                                                )}
                                            </div>

                                            <div 
                                                onClick={() => setIsSignatureModalOpen(true)}
                                                className="w-full h-64 md:h-80 bg-black/80 rounded-[2.5rem] border border-white/5 flex items-center justify-center cursor-pointer hover:border-[#A855F7]/40 transition-all duration-500 relative group/pad"
                                            >
                                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                                                
                                                {formData.providerSignature ? (
                                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full flex items-center justify-center p-10">
                                                        <img src={formData.providerSignature} className="max-w-full max-h-full object-contain invert brightness-200 drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]" alt="Signature" />
                                                        <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-[#A855F7]/20 rounded-full border border-[#A855F7]/30 backdrop-blur-md">
                                                            <CheckCircle2 size={12} className="text-[#A855F7]" />
                                                            <span className="text-[8px] font-black text-[#A855F7] uppercase tracking-widest">Verified</span>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-4 text-white/5 group-hover/pad:text-[#A855F7]/30 transition-all duration-500">
                                                        <PenTool size={48} className="-rotate-12" />
                                                        <p className="text-[10px] font-black uppercase tracking-[0.8em]">Click to Execute</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 3: Integrity Hub - FULL WIDTH */}
                                        <div className="p-8 md:p-12 bg-white/[0.02] border border-white/5 rounded-[3.5rem] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12 group">
                                            <div className="absolute inset-0 bg-[#A855F7]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                            
                                            <div className="flex items-center gap-10 relative z-10 w-full md:w-auto">
                                                <div className="relative shrink-0">
                                                    <DocumentSeal type="contract" date={formData.effectiveDate} className="w-40 h-40 drop-shadow-[0_0_40px_rgba(168,85,247,0.2)]" />
                                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -inset-4 border border-dashed border-[#A855F7]/20 rounded-full pointer-events-none" />
                                                </div>
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em]">Execution Reference</p>
                                                    <div className="bg-black/60 backdrop-blur-2xl px-8 py-5 rounded-[2rem] border border-white/10 group-hover:border-[#A855F7]/40 transition-all">
                                                        <h2 className="text-3xl lg:text-4xl font-black text-white tracking-[0.1em] italic leading-none">
                                                            {formData.agreementNumber.split('-').map((part, i) => (
                                                                <span key={i} className={i === 3 ? "text-[#A855F7]" : ""}>{part}{i < 3 ? '-' : ''}</span>
                                                            ))}
                                                        </h2>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-6 w-full md:w-80 relative z-10">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Lock size={12} className="text-emerald-500" />
                                                            <span className="text-[8px] font-black text-white uppercase tracking-widest">AES-256</span>
                                                        </div>
                                                        <p className="text-[7px] font-bold text-gray-500 uppercase">Secure</p>
                                                    </div>
                                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <History size={12} className="text-[#A855F7]" />
                                                            <span className="text-[8px] font-black text-white uppercase tracking-widest">v{formData.version || '1.0'}</span>
                                                        </div>
                                                        <p className="text-[7px] font-bold text-gray-500 uppercase">Immutable</p>
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-gray-500 leading-relaxed font-bold italic uppercase tracking-wider text-right">
                                                    Cryptographically sealed & timestamped. Handshake status: <span className="text-emerald-500">Active</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>



                        {/* Section Navigation Footer */}
                        {activeTab !== 'ai' && (
                            <div className="mt-16 flex items-center justify-between border-t border-white/5 pt-10">
                                <button 
                                    onClick={() => {
                                        const idx = tabs.findIndex(t => t.id === activeTab);
                                        if (idx > 0) handleTabClick(tabs[idx - 1].id);
                                    }}
                                    disabled={activeTab === tabs[0].id}
                                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-0 disabled:pointer-events-none font-black uppercase tracking-widest text-[11px]"
                                >
                                    <ChevronLeft size={18} /> Previous
                                </button>

                                <button 
                                    onClick={() => {
                                        const idx = tabs.findIndex(t => t.id === activeTab);
                                        if (idx < tabs.length - 1) handleTabClick(tabs[idx + 1].id);
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
                        )}
                    </div>
                </main>

                <aside className={cn(
                    "lg:static lg:flex fixed inset-0 z-[60] lg:z-0 bg-[#050505] lg:bg-zinc-900/10 flex-col overflow-hidden shrink-0 transition-transform duration-500 lg:translate-x-0",
                    isExpandedPreview ? "w-full lg:w-full border-l-0" : "w-full lg:w-[400px] 2xl:w-[600px] border-l border-white/5",
                    showPreviewMobile ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                )}>
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20 shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowPreviewMobile(false)} className="lg:hidden p-3 bg-white/5 rounded-xl border border-white/5 mr-2">
                                <ArrowLeft size={18} />
                            </button>
                            <button 
                                onClick={() => setIsExpandedPreview(!isExpandedPreview)} 
                                className="hidden lg:flex p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all items-center gap-2 text-[9px] font-black uppercase tracking-wider h-10 px-3"
                                title={isExpandedPreview ? "Exit Fullscreen Preview" : "Fullscreen Preview"}
                            >
                                {isExpandedPreview ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                <span>{isExpandedPreview ? "Collapse" : "Expand"}</span>
                            </button>
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

            {/* Field Refinement Modal */}
            <AnimatePresence>
                {refinementContext && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-white"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                                <div className="flex items-center gap-3">
                                    <Sparkles size={18} className="text-[#A855F7] animate-pulse" />
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-white">AI Field Refinement</h3>
                                        <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Refining: {refinementContext.fieldLabel}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setRefinementContext(null)}
                                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Current Content Preview</label>
                                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl max-h-40 overflow-y-auto text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                        {htmlToPlainText(refinementContext.currentValue) || <span className="italic text-gray-600">Field is currently empty</span>}
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Refinement Prompt</label>
                                    <textarea
                                        value={refinementPrompt}
                                        onChange={(e) => setRefinementPrompt(e.target.value)}
                                        placeholder="Tell AI how to refine this text (e.g., 'make it more formal', 'clarify payment deadlines', 'shorten to 1 sentence')..."
                                        className="w-full h-28 bg-black/40 border border-white/5 focus:border-[#A855F7]/50 focus:shadow-[0_0_20px_rgba(168,85,247,0.1)] rounded-2xl p-4 text-[12px] font-medium text-white placeholder-gray-600 focus:outline-none transition-all resize-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                e.preventDefault();
                                                handleInlineRefineSubmit();
                                            }
                                        }}
                                    />
                                    <div className="flex justify-between items-center text-[9px] text-gray-500 font-semibold px-1">
                                        <span>Press Ctrl+Enter to Refine</span>
                                        <span>Refined field will update instantly in the preview</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setRefinementContext(null)}
                                    className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 animate-none"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    disabled={isRefining || !refinementPrompt.trim()}
                                    onClick={handleInlineRefineSubmit}
                                    className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-neon-purple text-black hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.2)] disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {isRefining ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={12} />
                                            <span>Refining...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={12} />
                                            <span>Refine Field</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SignatureModal 
                isOpen={isSignatureModalOpen} 
                onClose={() => setIsSignatureModalOpen(false)} 
                onSave={(sig) => updateField('providerSignature', sig)} 
                initialName="Authorized Signatory"
            />
        </div>
    );
};

export default ContractGenerator;
