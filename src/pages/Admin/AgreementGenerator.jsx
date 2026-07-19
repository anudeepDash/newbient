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
import Music from 'lucide-react/dist/esm/icons/music';
import Smile from 'lucide-react/dist/esm/icons/smile';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Award from 'lucide-react/dist/esm/icons/award';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Cpu from 'lucide-react/dist/esm/icons/cpu';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
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
    useStoreSubscription(['agreements']);
    const { id } = useParams();
    const navigate = useNavigate();
    const { addAgreement, updateAgreement, agreements, user, addToast, activeModel } = useStore();
    const [autosaveStatus, setAutosaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const [lastSaved, setLastSaved] = useState('');
    const isDirtyRef = useRef(false);
    const initialDataLoadedRef = useRef(false);
    
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
            text: "Welcome to Newbi AI Agreement Studio. Describe the contract requirements or clauses you want in the prompt box below, and I will draft a comprehensive agreement. Once generated, continue chatting to refine any details! Click the sparkles icon next to any field to refine it directly!"
        }
    ]);
    const [promptText, setPromptText] = useState('');
    const [aiMode, setAiMode] = useState('generate');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionCategory, setSuggestionCategory] = useState(0);
    const [refinementContext, setRefinementContext] = useState(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
    const floatingChatContainerRef = useRef(null);
    const [aiTone, setAiTone] = useState('balanced'); // 'creative' | 'balanced' | 'formal'
    const [aiLength, setAiLength] = useState('balanced'); // 'concise' | 'balanced' | 'detailed'

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
        if (floatingChatContainerRef.current) {
            floatingChatContainerRef.current.scrollTo({
                top: floatingChatContainerRef.current.scrollHeight,
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
        { id: 'media', label: 'Newbi Media', path: '/logo_media.png', color: '#00D1FF' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
    ];

    // Hook logic
    const existingData = id ? agreements.find(a => a.id === id) : null;
    const {
        formData, setFormData, updateField,
        toggleClause, updateClause, removeClause, addCustomClause,
        paginatedPages
    } = useContractGenerator(existingData);

    const hasInitializedRef = useRef(false);
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
        if (id && agreements.length > 0 && !hasInitializedRef.current) {
            const agreement = agreements.find(a => a.id === id);
            if (agreement) {
                setFormData(agreement);
                hasInitializedRef.current = true;
                setTimeout(() => {
                    initialDataLoadedRef.current = true;
                }, 200);
            }
        }
    }, [id, agreements]);

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
                const rawData = { 
                    ...formData, 
                    updatedAt: new Date().toISOString(),
                    createdBy: formData.createdBy || user?.uid || null 
                };
                const data = JSON.parse(JSON.stringify(rawData));
                
                if (id) {
                    await updateAgreement(id, data);
                    if (active) {
                        setAutosaveStatus('saved');
                        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                        isDirtyRef.current = false;
                    }
                } else {
                    const newDocId = await addAgreement(data);
                    if (active) {
                        setAutosaveStatus('saved');
                        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                        isDirtyRef.current = false;
                        hasInitializedRef.current = true;
                        initialDataLoadedRef.current = true;
                        navigate(`/admin/agreements/edit/${newDocId}`, { replace: true });
                    }
                }
            } catch (err) {
                console.error("Agreement autosave failed:", err);
                if (active) {
                    setAutosaveStatus('error');
                }
            }
        }, 5000);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [formData, id]);

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
            if (id) {
                await updateAgreement(id, data);
                isDirtyRef.current = false;
                setAutosaveStatus('saved');
                setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            } else {
                await addAgreement(data);
                isDirtyRef.current = false;
                setAutosaveStatus('saved');
                setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            }
            
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
            } else {
                const isInitialGeneration = !formData.parties?.secondParty?.name || formData.parties.secondParty.name.trim() === '' || messages.length <= 1;
                if (isInitialGeneration) {
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
                        text: `✓ Agreement for "${data.parties?.secondParty?.name || 'Partner'}" generated successfully! I added ${data.clauses?.length || 0} legal clauses. \n\nYou can continue chatting here to modify the agreement, or edit using the manual tabs.`
                    }]);
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

    const renderChatbot = (isFloating = false) => {
        return (
            <div className={cn(
                "flex flex-col relative w-full",
                isFloating ? "flex-grow flex-1 min-h-0 h-full overflow-hidden" : "h-auto"
            )}>
                {/* Orbital Glow in Background */}
                <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 bg-[#A855F7]/5 rounded-full blur-3xl pointer-events-none", isFloating ? "w-48 h-48" : "w-64 h-64")} />

                {/* Brand Header */}
                <div className={cn(
                    "bg-zinc-950/45 border border-white/[0.06] backdrop-blur-2xl rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 relative z-10 shadow-lg",
                    isFloating ? "p-3 mb-2" : "p-4 mb-6"
                )}>
                    <div className="flex items-center gap-3.5 animate-fade-in">
                        <div className={cn(
                            "rounded-xl flex items-center justify-center border relative shadow-sm shrink-0",
                            isFloating ? "w-9 h-9 bg-[#A855F7]/5 border-[#A855F7]/10 text-[#A855F7]" : "w-11 h-11 bg-[#A855F7]/[0.02] border-[#A855F7]/10 text-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.05)]"
                        )}>
                            <div className="absolute inset-0 rounded-inherit bg-[#A855F7]/5 opacity-40 animate-pulse pointer-events-none" />
                            <Cpu size={isFloating ? 16 : 18} className="text-[#A855F7] animate-pulse" />
                        </div>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em] block leading-none">Primary Model</span>
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A855F7] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#A855F7]"></span>
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-xs font-bold text-zinc-200 tracking-wide leading-none">
                                    {activeModel || 'Gemini 3.5 Flash'}
                                </h3>
                                <span className="h-3 w-px bg-white/10" />
                                <span className="text-[8px] text-zinc-500 font-mono font-medium lowercase tracking-wide">live pulse</span>
                            </div>
                        </div>
                    </div>
                    {/* Mode status indicator */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                        <div className="flex items-center gap-2.5">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] leading-none">Active Mode</span>
                            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 px-3 py-1.5 rounded-full shadow-inner">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#A855F7] animate-pulse" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">
                                    {refinementContext ? 'Field Refinement' : (messages.length <= 1 ? 'First Draft' : 'Refinement & Chat')}
                                </span>
                            </div>
                        </div>
                        {messages.length > 1 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({
                                        parties: {
                                            firstParty: { name: 'Newbi Entertainment', role: 'Service Provider' },
                                            secondParty: { name: '', role: 'Client' }
                                        },
                                        details: {
                                            effectiveDate: '',
                                            jurisdiction: 'Karnataka, India',
                                            terminationNotice: '30 Days'
                                        },
                                        commercials: {
                                            paymentTerms: 'Payment due within 15 days of invoice date.',
                                            compensation: 'Client agrees to pay Service Provider according to project scope.'
                                        },
                                        clauses: [],
                                        template: 'modern',
                                        hiddenFields: []
                                    });
                                    setMessages([
                                        {
                                            id: 'init-msg',
                                            sender: 'ai',
                                            text: "Welcome to Newbi AI Agreement Studio. Describe the contract requirements or clauses you want in the prompt box below, and I will draft a comprehensive agreement. Once generated, continue chatting to refine any details! Click the sparkles icon next to any field to refine it directly!"
                                        }
                                    ]);
                                    setPromptText('');
                                    setRefinementContext(null);
                                    addToast('Reset to fresh draft agreement state', 'info');
                                }}
                                className="px-3 py-1.5 bg-[#A855F7]/5 hover:bg-[#A855F7]/10 border border-[#A855F7]/10 hover:border-[#A855F7]/30 text-[#A855F7] hover:text-[#C084FC] rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                            >
                                <RefreshCw size={10} />
                                <span>Reset</span>
                            </button>
                        )}
                        {isFloating && (
                            <button
                                type="button"
                                onClick={() => setIsFloatingChatOpen(false)}
                                className="p-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Message Stream */}
                <div 
                    ref={isFloating ? floatingChatContainerRef : chatContainerRef} 
                    className={cn(
                        "space-y-4 mb-4 relative z-10 flex flex-col w-full",
                        isFloating ? "flex-grow overflow-y-auto min-h-0 pr-2 scrollbar-hide" : "h-auto"
                    )}
                >
                    {/* Welcome card if only initial message */}
                    {messages.length === 1 && (
                        <div className={cn(
                            "my-auto py-4 flex flex-col items-center justify-center text-center mx-auto animate-fade-in",
                            isFloating ? "max-w-full space-y-4 px-2" : "max-w-2xl space-y-6"
                        )}>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-[#A855F7] via-purple-500 to-indigo-500 rounded-full blur-xl opacity-20 animate-pulse" />
                                <div className="relative w-12 h-12 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                                    <Sparkles size={20} className="text-[#A855F7] animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-2 max-w-md">
                                <h2 className="text-lg font-black uppercase tracking-tight text-white leading-none">
                                    AI Agreement <span className="bg-gradient-to-r from-[#A855F7] to-purple-400 bg-clip-text text-transparent">Orchestrator</span>
                                </h2>
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                                    Input requirements below. The generator constructs a fully formatted agreement with custom terms and legal clauses.
                                </p>
                            </div>

                            {/* Suggestions Grid */}
                            {!isFloating && (
                                <div className="w-full space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                                            <Sparkles size={10} className="text-[#A855F7]" /> Suggested Blueprints
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={() => setSuggestionCategory(c => (c + 1) % 2)}
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all active:scale-95"
                                        >
                                            <RefreshCw size={8} className="animate-spin-slow" /> Next Blueprints
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {suggestions.map((s, idx) => {
                                            let Icon = Sparkles;
                                            let heading = "Custom Clause";
                                            if (s.toLowerCase().includes("marketing") || s.toLowerCase().includes("talent")) {
                                                Icon = Megaphone;
                                                heading = "Talent & Marketing";
                                            } else if (s.toLowerCase().includes("disclosure") || s.toLowerCase().includes("nda")) {
                                                Icon = Shield;
                                                heading = "NDA Agreement";
                                            } else if (s.toLowerCase().includes("co-producing") || s.toLowerCase().includes("partnership")) {
                                                Icon = Users;
                                                heading = "Partnership MOU";
                                            } else if (s.toLowerCase().includes("security") || s.toLowerCase().includes("liability")) {
                                                Icon = Lock;
                                                heading = "Liability/Security";
                                            } else if (s.toLowerCase().includes("comedy") || s.toLowerCase().includes("booking")) {
                                                Icon = Smile;
                                                heading = "Talent Booking";
                                            } else if (s.toLowerCase().includes("venue") || s.toLowerCase().includes("structure")) {
                                                Icon = Building2;
                                                heading = "Venue Contract";
                                            }
                                            return (
                                                <button
                                                    type="button"
                                                    key={idx}
                                                    onClick={() => setPromptText(s)}
                                                    className="text-left p-4 bg-zinc-900/30 hover:bg-zinc-900/60 border border-white/5 hover:border-[#A855F7]/20 rounded-2xl transition-all duration-300 flex flex-col justify-between gap-4 h-auto min-h-[145px] pb-4 group relative overflow-hidden shadow-sm"
                                                >
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#A855F7]/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="flex items-center justify-between w-full relative z-10">
                                                        <div className="p-2 bg-white/5 group-hover:bg-[#A855F7]/10 rounded-xl transition-colors">
                                                            <Icon size={14} className="text-zinc-400 group-hover:text-[#A855F7] transition-colors" />
                                                        </div>
                                                        <span className="text-[9px] font-black text-[#A855F7] opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">→</span>
                                                    </div>
                                                    <div className="space-y-1 relative z-10 w-full">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400">{heading}</span>
                                                        <p className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                                                            {s}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chat Messages */}
                    {messages.length > 1 && messages.map(m => (
                        <div
                            key={m.id}
                            className={cn(
                                "max-w-[85%] rounded-[2rem] p-4 text-xs leading-relaxed transition-all shadow-md relative overflow-hidden group",
                                m.sender === 'user'
                                    ? "bg-zinc-900 text-zinc-100 self-end rounded-tr-none border border-white/5"
                                    : "bg-white/[0.02] border border-white/[0.04] text-zinc-300 self-start rounded-tl-none"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-wider",
                                    m.sender === 'user' ? "text-gray-400" : "text-[#A855F7]"
                                )}>
                                    {m.sender === 'user' ? 'You' : (activeModel || 'Gemini 3.5 Flash')}
                                </span>
                            </div>
                            <div className="font-medium leading-relaxed">{renderChatMessage(m.text)}</div>
                        </div>
                    ))}

                    {/* Generating Bubble */}
                    {isGenerating && (
                        <div className="bg-white/[0.02] border border-white/[0.04] text-zinc-300 self-start rounded-[2rem] rounded-tl-none p-4 text-xs w-[260px] sm:w-[280px] flex flex-col gap-2.5 shadow-md">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-[#A855F7] animate-spin shrink-0" />
                                <span className="font-bold uppercase tracking-wider text-[9px] text-[#A855F7] flex-1 truncate">
                                    {STAGE_MESSAGES[generationStage]?.text || "Synthesizing document..."}
                                </span>
                                <span className="text-[8px] font-mono text-zinc-500 font-bold shrink-0">
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

                {/* Prompt container - Command Console Redesign */}
                <div className={cn("pt-2 bg-transparent", isFloating ? "mt-auto shrink-0" : "mt-6")}>
                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-2.5 flex flex-col gap-2 relative shadow-[0_10px_30px_rgba(0,0,0,0.5)] focus-within:border-[#A855F7]/30 focus-within:shadow-[0_0_20px_rgba(168,85,247,0.05)] transition-all">
                        {/* Quoted Refinement Context */}
                        {refinementContext && (
                            <div className="px-3 py-2 bg-[#A855F7]/5 border border-[#A855F7]/20 rounded-xl flex items-center justify-between gap-3 border-l-4 border-l-[#A855F7] shadow-inner animate-fade-in">
                                <div className="min-w-0">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-[#A855F7] block mb-0.5">Refining: {refinementContext.fieldLabel}</span>
                                    <p className="text-[9px] text-zinc-400 line-clamp-1 italic">
                                        "{refinementContext.currentValue || 'No current content...'}"
                                    </p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setRefinementContext(null)}
                                    className="p-1 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all shrink-0"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2">
                            <textarea
                                value={promptText}
                                onChange={e => setPromptText(e.target.value)}
                                placeholder={refinementContext ? `Instruct AI to refine "${refinementContext.fieldLabel}"...` : "Describe the agreement you want to generate or modify..."}
                                className="flex-grow bg-transparent border-none text-[12px] font-medium text-white placeholder:text-zinc-600 outline-none min-h-[36px] max-h-[120px] py-1 px-1.5 resize-none leading-relaxed"
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
                                className="w-9 h-9 bg-[#A855F7] text-black rounded-xl hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-20 disabled:scale-100 flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                            >
                                {isGenerating ? <RefreshCw className="animate-spin" size={12} /> : <Send size={12} />}
                            </button>
                        </div>

                        {/* Control Bar inside Prompt Console */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-2 px-1 text-[8px] text-zinc-500 font-bold">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <div className="flex items-center gap-1">
                                    <span>Tone:</span>
                                    <div className="flex bg-black/40 rounded p-0.5 border border-white/5">
                                        {['balanced', 'creative', 'formal'].map(t => (
                                            <button
                                                type="button"
                                                key={t}
                                                onClick={() => setAiTone(t)}
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded text-[7px] uppercase tracking-wider transition-all",
                                                    aiTone === t ? "bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20" : "border border-transparent hover:text-zinc-300"
                                                )}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <span>Length:</span>
                                    <div className="flex bg-black/40 rounded p-0.5 border border-white/5">
                                        {['concise', 'balanced', 'detailed'].map(l => (
                                            <button
                                                type="button"
                                                key={l}
                                                onClick={() => setAiLength(l)}
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded text-[7px] uppercase tracking-wider transition-all",
                                                    aiLength === l ? "bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20" : "border border-transparent hover:text-zinc-300"
                                                )}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="hidden sm:flex items-center gap-1 text-[7px] text-zinc-600 font-mono">
                                <span>Approx. {promptText.length ? Math.round(promptText.length / 4) : 0} tokens</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
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
        <div className="h-full w-full bg-[#0B0F17] text-white flex flex-col font-['Outfit'] overflow-hidden admin-hub-content-container">
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
                        <h1 className="text-sm md:text-xl font-extrabold tracking-tight text-white truncate mb-1">Contract <span className="text-[#A855F7]">Vault.</span></h1>
                        <p className="text-[7px] md:text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] leading-none truncate">Contract Operating System</p>
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
                    {autosaveStatus !== 'idle' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 select-none">
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                autosaveStatus === 'saving' && "bg-amber-400 animate-pulse",
                                autosaveStatus === 'saved' && "bg-emerald-400",
                                autosaveStatus === 'error' && "bg-red-500"
                            )} />
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                                {autosaveStatus === 'saving' && "Saving..."}
                                {autosaveStatus === 'saved' && `Autosaved ${lastSaved}`}
                                {autosaveStatus === 'error' && "Autosave error"}
                            </span>
                        </div>
                    )}
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

                {/* Mobile Action Bar (Sticky above bottom nav) */}
                <div className="lg:hidden fixed bottom-20 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/90 to-transparent z-[90] flex items-center justify-end gap-2 pointer-events-none">
                    <div className="flex gap-2 w-full pointer-events-auto">
                        <button 
                            onClick={() => setShowPreviewMobile(!showPreviewMobile)} 
                            className="h-10 px-3 flex-1 bg-[#A855F7]/10 rounded-xl border border-[#A855F7]/20 text-[#A855F7] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg backdrop-blur-md"
                        >
                            <Eye size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Preview</span>
                        </button>
                        <button onClick={handleSave} className="h-10 px-3 flex-1 bg-white/5 text-white border border-white/10 font-black uppercase tracking-widest text-[9px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg backdrop-blur-md">
                            <Save size={14} />
                            <span>Save</span>
                        </button>
                        <button onClick={generatePDF} className="h-10 px-3 flex-1 bg-[#A855F7] text-black font-black uppercase tracking-widest text-[9px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(168,85,247,0.2)]">
                            <Download size={14} />
                            <span>Export</span>
                        </button>
                    </div>
                </div>

                {/* Editor */}
                <main className={cn(
                    "flex-grow scrollbar-hide bg-[#050505] px-4 md:px-8 py-6 md:py-10 overflow-y-auto pb-32",
                    isExpandedPreview && "hidden"
                )}>
                    <div className="max-w-[1600px] mx-auto w-full space-y-10 md:space-y-12">
                        
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
                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-none">
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
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className={cn(activeTab === 'ai' ? "w-full" : "space-y-16")}>
                                {activeTab === 'ai' && (
                                    <div className="w-full bg-zinc-950/20 border border-white/5 rounded-[2.5rem] p-6 relative flex flex-col">
                                        {renderChatbot(false)}
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
                                            <div className="p-4 md:p-8 bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[3rem] relative overflow-hidden">
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
                                            <div className="p-4 md:p-10 bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[3rem] relative overflow-hidden">
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
                                        <div className="p-4 md:p-8 bg-zinc-900/40 border border-white/5 rounded-[3rem] relative overflow-hidden group">
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
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
                                                className="w-full h-64 md:h-80 bg-black/80 rounded-[2.5rem] border border-white/5 flex items-center justify-center cursor-pointer hover:border-[#A855F7]/40 transition-all duration-500 relative group/pad mt-8"
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
                                        <div className="p-4 md:p-8 bg-white/[0.02] border border-white/5 rounded-[3.5rem] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12 group">
                                            {/* Decorative Background for Section */}
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

            {/* Floating Action Button for AI Chat */}
            {activeTab !== 'ai' && (
                <div className="fixed bottom-24 right-6 lg:bottom-8 lg:right-8 z-[120]">
                    <button
                        type="button"
                        onClick={() => setIsFloatingChatOpen(!isFloatingChatOpen)}
                        className="w-14 h-14 bg-[#A855F7]/10 text-[#A855F7] hover:bg-[#A855F7]/20 border border-[#A855F7]/20 hover:border-[#A855F7]/40 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <Sparkles className="w-6 h-6 animate-pulse" />
                    </button>
                </div>
            )}

            {/* Floating AI Chat Pop-up Overlay */}
            {activeTab !== 'ai' && isFloatingChatOpen && (
                <div className="fixed bottom-40 right-6 lg:bottom-24 lg:right-8 w-[92vw] sm:w-[420px] md:w-[460px] h-[550px] md:h-[600px] bg-zinc-950/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col p-4 z-[120] animate-fade-in">
                    {renderChatbot(true)}
                </div>
            )}
        </div>
    );
};

export default ContractGenerator;
