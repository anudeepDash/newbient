import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
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
import Check from 'lucide-react/dist/esm/icons/check';
import Copy from 'lucide-react/dist/esm/icons/copy';
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Cpu from 'lucide-react/dist/esm/icons/cpu';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';

import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import SignatureModal from '../../components/ui/SignatureModal';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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
            elements.push(<p key={i} className={cn(sizeClass, "mt-2 mb-1 text-gray-900 dark:text-white")} dangerouslySetInnerHTML={{ __html: formatInline(headingText) }} />);
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
    
    // Autosave & Persistence State
    const [autosaveStatus, setAutosaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const [lastSaved, setLastSaved] = useState('');
    const isDirtyRef = useRef(false);
    const initialDataLoadedRef = useRef(false);
    
    // View Mode: 'all' (Single page continuous document editor) vs 'tab' (focused step-by-step)
    const [viewMode, setViewMode] = useState('all');
    const [activeTab, setActiveTab] = useState('1'); // Default to Parties when in tab mode
    
    // Preview & Zoom State
    const [previewScale, setPreviewScale] = useState(0.6);
    const [userZoom, setUserZoom] = useState(1);
    const [isExpandedPreview, setIsExpandedPreview] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const [copiedAgreementId, setCopiedAgreementId] = useState(false);
    const previewContainerRef = useRef(null);

    // AI Studio State
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 'init-msg',
            sender: 'ai',
            text: "Welcome to Newbi Contract Vault Studio. Describe your engagement terms or legal clauses in the prompt console below, or paste complete draft text in Bulk Mode to auto-populate all sections."
        }
    ]);
    const [promptText, setPromptText] = useState('');
    const [suggestionCategory, setSuggestionCategory] = useState(0);
    const [refinementContext, setRefinementContext] = useState(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
    const floatingChatContainerRef = useRef(null);
    const chatContainerRef = useRef(null);
    const chatEndRef = useRef(null);
    const [aiTone, setAiTone] = useState('formal'); // 'creative' | 'balanced' | 'formal'
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

            addToast(`Field "${refinementContext.fieldLabel}" refined!`, 'success');
            setRefinementContext(null);
            setRefinementPrompt('');
        } catch (err) {
            console.error(err);
            addToast(`Refinement failed: ${err.message}`, 'error');
        } finally {
            setIsRefining(false);
        }
    };

    const [generationStage, setGenerationStage] = useState(0);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationTime, setGenerationTime] = useState(0);

    const STAGE_MESSAGES = useMemo(() => [
        { text: "Connecting to neural legal model...", progress: 15 },
        { text: "Structuring recitals & entity identities...", progress: 40 },
        { text: "Formulating scope & financial milestones...", progress: 65 },
        { text: "Generating enforceable legal clauses...", progress: 85 },
        { text: "Finalizing agreement layout & seal...", progress: 95 }
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

    const suggestions = useMemo(() => {
        const agreementSuggestions = [
            [
                { label: "Master Service Agreement", category: "MSA", text: "Master Service Agreement for ongoing talent management, digital marketing, and event production services with standard indemnity and IP clauses." },
                { label: "Non-Disclosure Agreement", category: "NDA", text: "Mutual Non-Disclosure Agreement for confidential event logistics data, proprietary artist rosters, and technical production designs." },
                { label: "Partnership MoU", category: "MOU", text: "Memorandum of Understanding for co-producing an annual campus music and cultural tech festival with revenue sharing and slot allocations." },
                { label: "Talent Booking Contract", category: "Talent", text: "Exclusive talent booking agreement for a headliner live performance at a corporate gala with rider compliance and advance payment." }
            ],
            [
                { label: "Influencer Marketing Retainer", category: "Marketing", text: "Annual creator and influencer retainer agreement covering 12 dedicated campaigns, usage rights for paid ads, and monthly deliverables." },
                { label: "Venue & Production SOW", category: "Production", text: "Venue licensing and technical AV production agreement including staging, lighting rigs, safety certifications, and insurance requirements." },
                { label: "Brand Sponsorship Agreement", category: "Sponsorship", text: "Brand title sponsorship agreement granting digital rights, on-ground activation booths, VIP passes, and stage naming privileges." },
                { label: "Security & Facility SOW", category: "Operations", text: "Comprehensive on-ground event security and bouncer deployment contract with strict liability caps and emergency response protocols." }
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
            type="button"
            onClick={() => toggleFieldVisibility(field)}
            className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[8px] font-black uppercase tracking-[0.1em]",
                isHidden(field) 
                    ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" 
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
            )}
        >
            {isHidden(field) ? <EyeOff size={10} /> : <Eye size={10} />}
            {label || (isHidden(field) ? "Hidden in Export" : "Included in Export")}
        </button>
    );

    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#A855F7' },
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

    // Autosave debounced
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
        }, 4000);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [formData, id]);

    // Responsive Preview Zoom auto-fit
    useEffect(() => {
        const handleResize = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth - 48; // padding
                const containerHeight = previewContainerRef.current.clientHeight - 48;
                const scaleWidth = containerWidth / 794;
                const scaleHeight = containerHeight / 1123;
                const autoScale = isExpandedPreview ? Math.min(scaleWidth, scaleHeight) : scaleWidth;
                setPreviewScale(Math.max(0.2, Math.min(2.0, autoScale)) * userZoom);
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
            const data = JSON.parse(JSON.stringify(rawData));
            if (id) {
                await updateAgreement(id, data);
                isDirtyRef.current = false;
                setAutosaveStatus('saved');
                setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                addToast("Agreement draft saved!", "success");
            } else {
                const newDocId = await addAgreement(data);
                isDirtyRef.current = false;
                setAutosaveStatus('saved');
                setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                addToast("Agreement successfully created!", "success");
                navigate(`/admin/agreements/edit/${newDocId}`, { replace: true });
            }
        } catch (error) {
            addToast("Save Error: " + error.message, 'error');
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
                        text: `✓ Agreement for "${data.parties?.secondParty?.name || 'Client'}" drafted successfully with ${data.clauses?.length || 0} legal clauses!\n\nYou can switch to the document editor to customize every field, or continue chatting to refine.`
                    }]);
                    addToast('Agreement generated! Switch to Document Editor to inspect all fields.', 'success');
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
                        text: `✓ Document refined according to request: "${currentPrompt}". Live preview updated.`
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
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297, '', 'FAST');
            }
            pdf.save(`Newbi-Contract-${formData.parties?.secondParty?.name || 'Draft'}.pdf`);
            addToast("Contract PDF exported successfully!", "success");
        } catch (error) {
            console.error(error);
            addToast("Export failed: " + error.message, "error");
        } finally {
            setPreviewScale(originalScale);
            setIsSaving(false);
        }
    };

    const copyAgreementNumber = () => {
        if (formData.agreementNumber) {
            navigator.clipboard.writeText(formData.agreementNumber);
            setCopiedAgreementId(true);
            setTimeout(() => setCopiedAgreementId(false), 2000);
            addToast("Agreement ID copied to clipboard!", "info");
        }
    };

    const tabs = [
        { id: 'ai', label: 'AI Studio', icon: Sparkles, desc: 'AI Document Orchestrator' },
        { id: '1', label: 'Parties & Branding', icon: Users, desc: 'Contracting Entities' },
        { id: '2', label: 'Purpose & Scope', icon: Target, desc: 'Mission & Framework', visibilityKey: 'mission' },
        { id: '3', label: 'Financial Terms', icon: CreditCard, desc: 'Commercial Agreements', visibilityKey: 'commercials' },
        { id: '4', label: 'Legal Clauses', icon: Gavel, desc: 'Terms & Conditions', visibilityKey: 'clauses' },
        { id: '7', label: 'Execution & Seal', icon: ShieldCheck, desc: 'Signatures & Verification' }
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    const handleTabClick = (tabId) => {
        setViewMode('tab');
        setActiveTab(tabId);
        
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

    // Chatbot Component
    const renderChatbot = (isFloating = false) => {
        return (
            <div className={cn(
                "flex flex-col relative w-full",
                isFloating ? "flex-grow flex-1 min-h-0 h-full overflow-hidden" : "h-auto"
            )}>
                {/* Orbital Glow in Background */}
                <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 bg-[#A855F7]/10 rounded-full blur-3xl pointer-events-none", isFloating ? "w-48 h-48" : "w-80 h-80")} />

                {/* Neural Header Card */}
                <div className={cn(
                    "bg-white/80 dark:bg-zinc-900/60 border border-black/10 dark:border-white/10 backdrop-blur-2xl rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 relative z-10 shadow-lg",
                    isFloating ? "p-3 mb-2" : "p-5 mb-6"
                )}>
                    <div className="flex items-center gap-3.5">
                        <div className={cn(
                            "rounded-2xl flex items-center justify-center border relative shadow-sm shrink-0",
                            isFloating ? "w-9 h-9 bg-[#A855F7]/10 border-[#A855F7]/20 text-[#A855F7]" : "w-12 h-12 bg-[#A855F7]/10 border-[#A855F7]/20 text-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                        )}>
                            <Cpu size={isFloating ? 16 : 20} className="text-[#A855F7] animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.25em] block leading-none">Primary Neural Model</span>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A855F7] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A855F7]"></span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 tracking-wide leading-none">
                                    {activeModel || 'Gemini 3.5 Flash'}
                                </h3>
                                <span className="h-3 w-px bg-black/10 dark:bg-white/10" />
                                <span className="text-[9px] text-[#A855F7] font-mono font-bold tracking-wide">live pulse</span>
                            </div>
                        </div>
                    </div>

                    {/* Mode Status Pill & Switcher */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-black/10 dark:border-white/5 pt-2 sm:pt-0">
                        {/* Mode Switcher */}
                        <div className="flex items-center p-1 bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-2xl shadow-inner">
                            <button
                                type="button"
                                onClick={() => setIsBulkMode(false)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
                                    !isBulkMode 
                                        ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm border border-black/5 dark:border-white/10" 
                                        : "text-zinc-500 hover:text-gray-900 dark:hover:text-white"
                                )}
                            >
                                <Sparkles size={11} className={!isBulkMode ? "text-[#A855F7]" : "text-zinc-500"} />
                                <span>Prompt</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsBulkMode(true)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
                                    isBulkMode 
                                        ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm border border-black/5 dark:border-white/10" 
                                        : "text-zinc-500 hover:text-gray-900 dark:hover:text-white"
                                )}
                            >
                                <Zap size={11} className={isBulkMode ? "text-amber-400" : "text-zinc-500"} />
                                <span>Bulk Text</span>
                            </button>
                        </div>

                        {messages.length > 1 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMessages([
                                        {
                                            id: 'init-msg',
                                            sender: 'ai',
                                            text: "Welcome to Newbi Contract Vault Studio. Describe your engagement terms or legal clauses in the prompt console below, or paste complete draft text in Bulk Mode to auto-populate all sections."
                                        }
                                    ]);
                                    setPromptText('');
                                    setRefinementContext(null);
                                    addToast('Chat reset to initial draft state', 'info');
                                }}
                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                title="Reset conversation"
                            >
                                <RotateCcw size={14} />
                            </button>
                        )}
                        {isFloating && (
                            <button
                                type="button"
                                onClick={() => setIsFloatingChatOpen(false)}
                                className="p-2 text-zinc-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all"
                                title="Close chat"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Message Stream or Welcome Blueprint Cards */}
                <div 
                    ref={isFloating ? floatingChatContainerRef : chatContainerRef} 
                    className={cn(
                        "space-y-4 mb-4 relative z-10 flex flex-col w-full",
                        isFloating ? "flex-grow overflow-y-auto min-h-0 pr-2 scrollbar-hide" : "h-auto"
                    )}
                >
                    {/* Welcome Screen & Blueprint Presets */}
                    {messages.length === 1 && (
                        <div className={cn(
                            "py-4 flex flex-col items-center justify-center text-center mx-auto animate-fade-in w-full",
                            isFloating ? "space-y-4 px-2" : "max-w-4xl space-y-6"
                        )}>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-[#A855F7] via-purple-500 to-indigo-500 rounded-full blur-xl opacity-20 animate-pulse" />
                                <div className="relative w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                                    <Sparkles size={24} className="text-[#A855F7] animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-2 max-w-lg">
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white leading-none">
                                    AI Agreement <span className="bg-gradient-to-r from-[#A855F7] to-purple-400 bg-clip-text text-transparent">Orchestrator</span>
                                </h2>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                                    {isBulkMode 
                                        ? "Paste complete pre-generated contract text, raw drafts, meeting briefs, or unformatted legal terms. AI will automatically extract and map all sections." 
                                        : "Select a suggested blueprint or describe the required commercial parameters. AI will draft a complete legal agreement in seconds."}
                                </p>
                            </div>

                            {/* Suggested Blueprints Grid */}
                            {!isFloating && !isBulkMode && (
                                <div className="w-full space-y-3 pt-2">
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                                            <Sparkles size={12} className="text-[#A855F7]" /> Suggested Blueprints
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={() => setSuggestionCategory(c => (c + 1) % 2)}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95"
                                        >
                                            <RefreshCw size={10} /> Next Presets
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {suggestions.map((item, idx) => (
                                            <button
                                                type="button"
                                                key={idx}
                                                onClick={() => setPromptText(item.text)}
                                                className="text-left p-4 bg-white/60 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900/80 border border-black/10 dark:border-white/5 hover:border-[#A855F7]/40 rounded-2xl transition-all duration-300 flex flex-col justify-between gap-3 min-h-[140px] group shadow-sm relative overflow-hidden"
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="px-2 py-0.5 rounded-md bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20 text-[8px] font-black uppercase tracking-widest">
                                                        {item.category}
                                                    </span>
                                                    <span className="text-xs text-[#A855F7] opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all font-black">
                                                        →
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1 group-hover:text-[#A855F7] transition-colors">
                                                        {item.label}
                                                    </h4>
                                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                                                        {item.text}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Direct Jump CTA if agreement already has content */}
                            {formData.parties?.secondParty?.name && (
                                <div className="w-full p-4 rounded-2xl bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-between gap-4 mt-2">
                                    <div className="text-left">
                                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                            Contract Active for: <span className="text-[#A855F7]">{formData.parties.secondParty.name}</span>
                                        </p>
                                        <p className="text-[10px] text-zinc-400">
                                            {formData.clauses?.length || 0} active legal clauses · Value: {formData.commercials?.currency} {formData.commercials?.totalValue || '0.00'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('all')}
                                        className="px-4 py-2 bg-[#A855F7] text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 flex items-center gap-1.5"
                                    >
                                        <LayoutGrid size={12} />
                                        <span>Open Full Document Editor →</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chat Messages */}
                    {messages.length > 1 && messages.map(m => (
                        <div
                            key={m.id}
                            className={cn(
                                "max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed transition-all shadow-md relative overflow-hidden group",
                                m.sender === 'user'
                                    ? "bg-zinc-800 text-zinc-100 self-end rounded-tr-sm border border-black/10 dark:border-white/10 ml-auto"
                                    : "bg-white/80 dark:bg-zinc-900/60 border border-black/10 dark:border-white/5 text-gray-900 dark:text-zinc-200 self-start rounded-tl-sm mr-auto"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-wider",
                                    m.sender === 'user' ? "text-zinc-400" : "text-[#A855F7]"
                                )}>
                                    {m.sender === 'user' ? 'You' : (activeModel || 'Gemini 3.5 Flash')}
                                </span>
                            </div>
                            <div className="font-medium leading-relaxed">{renderChatMessage(m.text)}</div>
                        </div>
                    ))}

                    {/* Generating Bubble */}
                    {isGenerating && (
                        <div className="bg-white/80 dark:bg-zinc-900/80 border border-[#A855F7]/30 text-zinc-300 self-start rounded-3xl rounded-tl-sm p-4 text-xs w-[280px] sm:w-[320px] flex flex-col gap-2.5 shadow-xl mr-auto">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-[#A855F7] animate-spin shrink-0" />
                                <span className="font-bold uppercase tracking-wider text-[9px] text-[#A855F7] flex-1 truncate">
                                    {STAGE_MESSAGES[generationStage]?.text || "Synthesizing document..."}
                                </span>
                                <span className="text-[8px] font-mono text-zinc-500 font-bold shrink-0">
                                    {generationTime}s
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-black/10 dark:bg-black/50 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-[#A855F7] to-purple-400 transition-all duration-500" 
                                    style={{ width: `${generationProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Prompt Console Redesign */}
                <div className={cn("pt-2 bg-transparent", isFloating ? "mt-auto shrink-0" : "mt-2")}>
                    <div className="bg-white dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 rounded-3xl p-4 flex flex-col gap-3 relative shadow-2xl focus-within:border-[#A855F7]/50 focus-within:ring-1 focus-within:ring-[#A855F7]/30 transition-all">
                        {/* Quoted Refinement Context */}
                        {refinementContext && (
                            <div className="px-3 py-2 bg-[#A855F7]/10 border border-[#A855F7]/30 rounded-2xl flex items-center justify-between gap-3 border-l-4 border-l-[#A855F7] shadow-inner animate-fade-in">
                                <div className="min-w-0">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-[#A855F7] block mb-0.5">Refining: {refinementContext.fieldLabel}</span>
                                    <p className="text-[10px] text-zinc-400 line-clamp-1 italic">
                                        "{refinementContext.currentValue || 'Empty...'}"
                                    </p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setRefinementContext(null)}
                                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all shrink-0"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-start gap-3">
                            <textarea
                                value={promptText}
                                onChange={e => setPromptText(e.target.value)}
                                placeholder={
                                    refinementContext 
                                        ? `Instruct AI to refine "${refinementContext.fieldLabel}"...` 
                                        : isBulkMode 
                                            ? "Paste full contract text, raw brief, scope document, or MoU clauses here to automatically extract and populate all sections..." 
                                            : "Describe the agreement you want to generate or modify (e.g., 'Draft a 6-month marketing retainer agreement for Brand XYZ with INR 5,00,000 fee and strict IP terms')..."
                                }
                                className="flex-grow bg-transparent border-none text-xs md:text-sm font-medium text-gray-900 dark:text-white placeholder:text-zinc-500 outline-none min-h-[70px] max-h-[160px] py-1 px-1 resize-none leading-relaxed"
                                rows={isBulkMode ? 4 : 2}
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
                                className="h-11 px-5 bg-[#A855F7] hover:bg-[#9333EA] text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-25 disabled:scale-100 flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                            >
                                {isGenerating ? <RefreshCw className="animate-spin" size={14} /> : (isBulkMode ? <Zap size={14} /> : <Send size={14} />)}
                                <span className="hidden sm:inline">{isGenerating ? 'Processing...' : (isBulkMode ? 'Ingest' : 'Generate')}</span>
                            </button>
                        </div>

                        {/* Control Bar inside Prompt Console */}
                        <div className="flex items-center justify-between border-t border-black/10 dark:border-white/5 pt-2.5 px-1 text-[9px] text-zinc-500 font-bold">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span>Tone:</span>
                                    <div className="flex bg-black/5 dark:bg-black/40 rounded-xl p-0.5 border border-black/10 dark:border-white/10">
                                        {['formal', 'balanced', 'creative'].map(t => (
                                            <button
                                                type="button"
                                                key={t}
                                                onClick={() => setAiTone(t)}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-lg text-[8px] uppercase tracking-wider transition-all font-bold",
                                                    aiTone === t ? "bg-[#A855F7] text-black shadow-sm" : "text-zinc-400 hover:text-white"
                                                )}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span>Length:</span>
                                    <div className="flex bg-black/5 dark:bg-black/40 rounded-xl p-0.5 border border-black/10 dark:border-white/10">
                                        {['concise', 'balanced', 'detailed'].map(l => (
                                            <button
                                                type="button"
                                                key={l}
                                                onClick={() => setAiLength(l)}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-lg text-[8px] uppercase tracking-wider transition-all font-bold",
                                                    aiLength === l ? "bg-[#A855F7] text-black shadow-sm" : "text-zinc-400 hover:text-white"
                                                )}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="hidden sm:flex items-center gap-2 text-[8px] text-zinc-500 font-mono">
                                <span>~{promptText.length ? Math.round(promptText.length / 4) : 0} tokens</span>
                                <span>·</span>
                                <span>Enter to submit</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full bg-gray-50 dark:bg-[#070A10] text-gray-900 dark:text-white flex flex-col font-['Outfit'] overflow-hidden admin-hub-content-container">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,200..900;1,200..900&display=swap');
                .font-signature { font-family: 'Caveat', cursive; }
                .font-formal { font-family: 'Crimson Pro', serif; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />

            {/* Top Navigation Bar - Clean Dark Glassmorphism */}
            <nav className="h-16 md:h-20 border-b border-black/10 dark:border-white/10 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-[#0B0F17]/90 backdrop-blur-2xl sticky top-0 z-[60] shrink-0">
                <div className="flex items-center gap-3 md:gap-6 min-w-0">
                    <Link to="/admin/agreements" className="p-2.5 md:p-3 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/10 dark:border-white/10 shrink-0">
                        <ArrowLeft size={16} />
                    </Link>
                    <div className="min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <h1 className="text-base md:text-xl font-black tracking-tight text-gray-900 dark:text-white truncate">
                                Vault<span className="text-[#A855F7]">.</span>
                            </h1>
                            <span className="px-2 py-0.5 rounded-full bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20 text-[8px] font-black uppercase tracking-widest hidden sm:inline">
                                Agreement Studio
                            </span>
                        </div>
                        <p className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-[0.25em] leading-none truncate mt-0.5">
                            Contract Operating System
                        </p>
                    </div>

                    {/* Agreement ID Pill */}
                    {formData.agreementNumber && (
                        <button
                            type="button"
                            onClick={copyAgreementNumber}
                            className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px] font-mono font-bold text-zinc-400 hover:text-white transition-all group"
                            title="Click to copy Agreement ID"
                        >
                            <span>{formData.agreementNumber}</span>
                            {copiedAgreementId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="opacity-40 group-hover:opacity-100" />}
                        </button>
                    )}
                </div>

                {/* Center / View Mode Switcher */}
                <div className="hidden md:flex items-center p-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setViewMode('all')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            viewMode === 'all'
                                ? "bg-[#A855F7] text-black shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        )}
                    >
                        <LayoutGrid size={13} />
                        <span>All Sections</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setViewMode('tab'); if (activeTab === 'ai') setActiveTab('1'); }}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            viewMode === 'tab' && activeTab !== 'ai'
                                ? "bg-[#A855F7] text-black shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        )}
                    >
                        <SlidersHorizontal size={13} />
                        <span>Section Tabs</span>
                    </button>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    <button 
                        onClick={() => setShowPreviewMobile(!showPreviewMobile)} 
                        className="lg:hidden h-10 px-3 bg-[#A855F7]/10 rounded-xl border border-[#A855F7]/20 text-[#A855F7] flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                        <Eye size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Preview</span>
                    </button>

                    {autosaveStatus !== 'idle' && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 select-none">
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

                    <button 
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className="h-10 md:h-11 px-4 md:px-6 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-900 dark:text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl border border-black/10 dark:border-white/10 transition-all flex items-center gap-2"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />} 
                        <span className="hidden sm:inline">Save Draft</span>
                    </button>

                    <button 
                        onClick={generatePDF} 
                        className="h-10 md:h-11 px-4 md:px-7 bg-[#A855F7] text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl shadow-[0_10px_25px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />} 
                        <span>Export Contract</span>
                    </button>
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left Navigation Sidebar */}
                <aside className={cn(
                    "hidden lg:flex w-64 shrink-0 border-r border-black/10 dark:border-white/5 bg-white dark:bg-[#080C14] flex-col p-5 gap-6 overflow-y-auto scrollbar-hide",
                    isExpandedPreview && "lg:hidden"
                )}>
                    {/* Primary Switcher */}
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-2">Editor View</p>
                        
                        {/* All Sections Mode Button */}
                        <button
                            onClick={() => { setViewMode('all'); }}
                            className={cn(
                                "w-full p-3.5 rounded-2xl flex items-center gap-3.5 transition-all text-left group border",
                                viewMode === 'all'
                                    ? "bg-[#A855F7]/15 border-[#A855F7]/30 text-white shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                                    : "border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-xl transition-all",
                                viewMode === 'all' ? "bg-[#A855F7] text-black shadow-sm" : "bg-black/5 dark:bg-white/5 group-hover:bg-[#A855F7]/20 group-hover:text-[#A855F7]"
                            )}>
                                <LayoutGrid size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">All Sections</p>
                                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-tight">Full Document Canvas</p>
                            </div>
                        </button>
                    </div>

                    {/* Section Tabs */}
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-2">Sections</p>
                        {tabs.map((tab, idx) => {
                            const isTabActive = viewMode === 'tab' && activeTab === tab.id;
                            return (
                                <button 
                                    key={tab.id} 
                                    onClick={() => handleTabClick(tab.id)} 
                                    className={cn(
                                        "w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left group border",
                                        isTabActive 
                                            ? "bg-[#A855F7]/15 border-[#A855F7]/30 text-white shadow-[0_0_20px_rgba(168,85,247,0.15)]" 
                                            : "border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-xl transition-all shrink-0",
                                        isTabActive ? "bg-[#A855F7] text-black shadow-sm" : "bg-black/5 dark:bg-white/5 group-hover:bg-[#A855F7]/20 group-hover:text-[#A855F7]"
                                    )}>
                                        <tab.icon size={15} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5 truncate">{tab.label}</p>
                                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-tight truncate">{tab.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Document Stats in Sidebar */}
                    <div className="mt-auto p-4 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/5 space-y-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Document Architecture</p>
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                                <span className="text-[8px] text-zinc-500 block">Pages</span>
                                <span className="text-xs font-black text-[#A855F7]">{paginatedPages.length}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                                <span className="text-[8px] text-zinc-500 block">Clauses</span>
                                <span className="text-xs font-black text-emerald-400">{formData.clauses?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Mobile Bottom Navigation */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-black/90 backdrop-blur-3xl border-t border-black/10 dark:border-white/10 z-[100] px-2 flex items-center justify-around overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setViewMode('all')} 
                        className={cn("flex flex-col items-center justify-center min-w-[55px] h-full transition-all gap-1", viewMode === 'all' ? "text-[#A855F7]" : "text-gray-500")}
                    >
                        <LayoutGrid size={16} />
                        <span className="text-[7px] font-black uppercase tracking-widest">All</span>
                    </button>
                    {tabs.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => handleTabClick(tab.id)} 
                            className={cn("flex flex-col items-center justify-center min-w-[55px] h-full transition-all gap-1", (viewMode === 'tab' && activeTab === tab.id) ? "text-[#A855F7]" : "text-gray-500")}
                        >
                            <tab.icon size={16} />
                            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label.split(' ')[0]}</span>
                            {viewMode === 'tab' && activeTab === tab.id && <div className="w-1 h-1 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7]" />}
                        </button>
                    ))}
                </div>

                {/* Main Workspace Editor Canvas */}
                <main className={cn(
                    "flex-grow scrollbar-hide bg-gray-50 dark:bg-[#070A10] px-4 md:px-10 py-6 md:py-8 overflow-y-auto pb-32",
                    isExpandedPreview && "hidden"
                )}>
                    <div className="max-w-[1400px] mx-auto w-full space-y-8">
                        
                        {/* Tab Mode Header (if in tab mode and not AI) */}
                        {viewMode === 'tab' && activeTab !== 'ai' && (
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-black/10 dark:border-white/10 gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-[2px] bg-[#A855F7]" />
                                        <p className="text-[9px] font-black text-[#A855F7] uppercase tracking-[0.3em]">
                                            Section {tabs.findIndex(t => t.id === activeTab)} of {tabs.length - 1}
                                        </p>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                        {currentTab?.label}<span className="text-[#A855F7]">.</span>
                                    </h2>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                                        {currentTab?.desc}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {currentTab?.visibilityKey && (
                                        <VisibilityToggle field={currentTab.visibilityKey} />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('all')}
                                        className="px-3.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all flex items-center gap-1.5"
                                    >
                                        <LayoutGrid size={12} />
                                        <span>Show All Sections</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* RENDER SECTIONS BASED ON MODE */}
                        {viewMode === 'tab' && activeTab === 'ai' ? (
                            /* AI Studio Tab */
                            <div className="w-full bg-white dark:bg-zinc-950/40 border border-black/10 dark:border-white/10 rounded-3xl p-6 md:p-8 relative flex flex-col shadow-xl">
                                {renderChatbot(false)}
                            </div>
                        ) : (
                            /* Document Sections: Either all stacked (viewMode === 'all') or single active tab (viewMode === 'tab') */
                            <div className="space-y-12">
                                
                                {/* SECTION 1: FRAMEWORK & PARTIES */}
                                {(viewMode === 'all' || activeTab === '1') && (
                                    <section id="section-parties" className="p-6 md:p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-black/10 dark:border-white/10 space-y-8 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-[#A855F7]/10 text-[#A855F7]">
                                                    <Users size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Contract Framework & Parties</h3>
                                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Document Template & Legal Entities</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contract Template Selector */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Agreement Framework Type</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {['Service Agreement', 'MOU'].map(t => (
                                                    <button 
                                                        key={t} 
                                                        type="button"
                                                        onClick={() => updateField('template', t)} 
                                                        className={cn(
                                                            "p-4 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest text-center flex items-center justify-center gap-2", 
                                                            (formData.template || 'Service Agreement') === t 
                                                                ? "bg-[#A855F7] border-[#A855F7] text-black shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-[1.01]" 
                                                                : "bg-black/5 dark:bg-zinc-900 border-black/10 dark:border-white/10 text-gray-500 hover:text-white hover:border-[#A855F7]/40"
                                                        )}
                                                    >
                                                        <Scale size={14} />
                                                        <span>{t === 'MOU' ? 'Memorandum of Understanding (MOU)' : 'Master Service Agreement (MSA)'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Identity & Branding Logo Selector */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Division Branding & Letterhead Header</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                {logoOptions.map(logo => (
                                                    <button 
                                                        key={logo.id} 
                                                        type="button"
                                                        onClick={() => updateField('selectedLogo', logo.id)} 
                                                        className={cn(
                                                            "p-3 rounded-2xl border transition-all text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-2.5 overflow-hidden relative group", 
                                                            (formData.selectedLogo || 'entertainment') === logo.id 
                                                                ? "bg-[#A855F7] border-[#A855F7] text-black shadow-md scale-[1.01]" 
                                                                : "bg-black/5 dark:bg-zinc-900 border-black/10 dark:border-white/10 text-gray-500 hover:text-white hover:border-[#A855F7]/40"
                                                        )}
                                                    >
                                                        <div className="w-full aspect-[4/2] rounded-xl bg-white flex items-center justify-center p-2 relative overflow-hidden">
                                                            <img src={logo.path} alt={logo.label} className="w-full h-full object-contain" />
                                                        </div>
                                                        <span>{logo.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Contracting Parties: Provider vs Client */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                                            {/* First Party (Provider) */}
                                            <div className="p-6 rounded-2xl bg-black/5 dark:bg-zinc-900/60 border border-black/10 dark:border-white/10 space-y-4">
                                                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
                                                    <span className="text-[10px] font-black uppercase text-[#A855F7] tracking-widest flex items-center gap-1.5">
                                                        <Building2 size={13} /> First Party (Service Provider)
                                                    </span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Provider Legal Name</label>
                                                        <div className="relative group/refine">
                                                            <Input 
                                                                value={formData.parties.firstParty.name} 
                                                                onChange={e => updateField('parties.firstParty.name', e.target.value)} 
                                                                placeholder="e.g. Newbi Entertainment Pvt Ltd" 
                                                                className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 pr-10 text-xs font-bold" 
                                                            />
                                                            <button type="button" onClick={() => handleRefineClick('parties.firstParty.name', 'Provider Legal Name', formData.parties.firstParty.name)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A855F7] hover:scale-110 transition-all p-1" title="Refine with AI"><Sparkles size={13} /></button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Defined Role</label>
                                                            <Input 
                                                                value={formData.parties.firstParty.role} 
                                                                onChange={e => updateField('parties.firstParty.role', e.target.value)} 
                                                                placeholder="e.g. Service Provider" 
                                                                className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-xs font-bold" 
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Acronym</label>
                                                            <Input 
                                                                value={formData.parties.firstParty.acronym || 'NB'} 
                                                                onChange={e => updateField('parties.firstParty.acronym', e.target.value)} 
                                                                placeholder="e.g. NB" 
                                                                className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-xs font-bold" 
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Registered Address</label>
                                                        <Input 
                                                            value={formData.parties.firstParty.address} 
                                                            onChange={e => updateField('parties.firstParty.address', e.target.value)} 
                                                            placeholder="Provider registered address" 
                                                            className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-xs font-medium" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Second Party (Client) */}
                                            <div className="p-6 rounded-2xl bg-black/5 dark:bg-zinc-900/60 border border-black/10 dark:border-white/10 space-y-4">
                                                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
                                                    <span className="text-[10px] font-black uppercase text-[#A855F7] tracking-widest flex items-center gap-1.5">
                                                        <Users size={13} /> Second Party (Client / Partner)
                                                    </span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Client Entity Name</label>
                                                        <div className="relative group/refine">
                                                            <Input 
                                                                value={formData.parties.secondParty.name} 
                                                                onChange={e => updateField('parties.secondParty.name', e.target.value)} 
                                                                placeholder="e.g. Acme Corp Ltd" 
                                                                className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 pr-10 text-xs font-bold" 
                                                            />
                                                            <button type="button" onClick={() => handleRefineClick('parties.secondParty.name', 'Client Entity Name', formData.parties.secondParty.name)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A855F7] hover:scale-110 transition-all p-1" title="Refine with AI"><Sparkles size={13} /></button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Defined Role</label>
                                                            <Input 
                                                                value={formData.parties.secondParty.role} 
                                                                onChange={e => updateField('parties.secondParty.role', e.target.value)} 
                                                                placeholder="e.g. Client" 
                                                                className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-xs font-bold" 
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Acronym</label>
                                                            <Input 
                                                                value={formData.parties.secondParty.acronym || ''} 
                                                                onChange={e => updateField('parties.secondParty.acronym', e.target.value)} 
                                                                placeholder="e.g. ACM" 
                                                                className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-xs font-bold" 
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Registered Address</label>
                                                        <Input 
                                                            value={formData.parties.secondParty.address} 
                                                            onChange={e => updateField('parties.secondParty.address', e.target.value)} 
                                                            placeholder="Client registered office address" 
                                                            className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-xs font-medium" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* SECTION 2: PURPOSE & SCOPE */}
                                {(viewMode === 'all' || activeTab === '2') && (
                                    <section id="section-purpose" className="p-6 md:p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-black/10 dark:border-white/10 space-y-6 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-[#A855F7]/10 text-[#A855F7]">
                                                    <Target size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Purpose & Scope of Engagement</h3>
                                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Project Framework & Recitals Definition</p>
                                                </div>
                                            </div>
                                            <VisibilityToggle field="mission" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Project / Campaign Title</label>
                                                <div className="relative group/refine">
                                                    <Input 
                                                        value={formData.details.projectName} 
                                                        onChange={e => updateField('details.projectName', e.target.value)} 
                                                        placeholder="e.g. Digital Media & Creator Acceleration" 
                                                        className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-xs font-bold" 
                                                    />
                                                    <button type="button" onClick={() => handleRefineClick('details.projectName', 'Project Title', formData.details.projectName)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A855F7] hover:scale-110 transition-all p-1" title="Refine with AI"><Sparkles size={13} /></button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Governing Jurisdiction / Territory</label>
                                                <Input 
                                                    value={formData.details.territory || 'India'} 
                                                    onChange={e => updateField('details.territory', e.target.value)} 
                                                    placeholder="e.g. Bangalore, India" 
                                                    className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-xs font-bold" 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Scope of Engagement & Objectives</label>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRefineClick('details.purpose', 'Scope of Engagement', formData.details.purpose)} 
                                                    className="text-[9px] font-bold text-[#A855F7] hover:underline flex items-center gap-1"
                                                >
                                                    <Sparkles size={11} /> Refine with AI
                                                </button>
                                            </div>
                                            <StudioRichEditor 
                                                value={formData.details.purpose} 
                                                onChange={val => updateField('details.purpose', val)} 
                                                placeholder="Detail the complete scope of engagement, responsibilities, deliverables, and operational framework..." 
                                                minHeight="180px" 
                                                accentColor="neon-purple"
                                            />
                                        </div>
                                    </section>
                                )}

                                {/* SECTION 3: FINANCIAL & COMMERCIAL TERMS */}
                                {(viewMode === 'all' || activeTab === '3') && (
                                    <section id="section-commercials" className="p-6 md:p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-black/10 dark:border-white/10 space-y-6 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-[#A855F7]/10 text-[#A855F7]">
                                                    <CreditCard size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Commercial & Financial Terms</h3>
                                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Pricing Structure & Milestone Settlement</p>
                                                </div>
                                            </div>
                                            <VisibilityToggle field="commercials" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Total Agreement Consideration</label>
                                                <div className="relative group/refine">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A855F7] font-black text-xs">
                                                        {formData.commercials.currency}
                                                    </span>
                                                    <Input 
                                                        value={formData.commercials.totalValue} 
                                                        onChange={e => updateField('commercials.totalValue', e.target.value)} 
                                                        className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 pl-14 pr-10 text-sm font-black" 
                                                        placeholder="e.g. 5,00,000" 
                                                    />
                                                    <button type="button" onClick={() => handleRefineClick('commercials.totalValue', 'Total Contract Value', formData.commercials.totalValue)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A855F7] hover:scale-110 transition-all p-1" title="Refine with AI"><Sparkles size={13} /></button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Settlement Currency</label>
                                                <select 
                                                    value={formData.commercials.currency} 
                                                    onChange={e => updateField('commercials.currency', e.target.value)} 
                                                    className="w-full h-12 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl px-4 text-xs font-black text-gray-900 dark:text-white focus:outline-none focus:border-[#A855F7]/50"
                                                >
                                                    <option value="INR">INR (₹) - Indian Rupee</option>
                                                    <option value="USD">USD ($) - US Dollar</option>
                                                    <option value="EUR">EUR (€) - Euro</option>
                                                    <option value="GBP">GBP (£) - British Pound</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Payment Milestones & Settlement Schedule</label>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRefineClick('commercials.paymentSchedule', 'Payment Schedule', formData.commercials.paymentSchedule)} 
                                                    className="text-[9px] font-bold text-[#A855F7] hover:underline flex items-center gap-1"
                                                >
                                                    <Sparkles size={11} /> Refine with AI
                                                </button>
                                            </div>
                                            <StudioRichEditor 
                                                value={formData.commercials.paymentSchedule} 
                                                onChange={val => updateField('commercials.paymentSchedule', val)} 
                                                placeholder="Detail installment percentages, invoice submission windows, bank details, and net settlement days..." 
                                                minHeight="140px" 
                                                accentColor="neon-purple"
                                            />
                                        </div>
                                    </section>
                                )}

                                {/* SECTION 4: LEGAL CLAUSES */}
                                {(viewMode === 'all' || activeTab === '4') && (
                                    <section id="section-clauses" className="p-6 md:p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-black/10 dark:border-white/10 space-y-6 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-[#A855F7]/10 text-[#A855F7]">
                                                    <Gavel size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Legal Clauses & Conditions</h3>
                                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Enforceable Clause Library & Strictness Levels</p>
                                                </div>
                                            </div>
                                            <VisibilityToggle field="clauses" />
                                        </div>

                                        <ClauseMarketplace 
                                            activeClauses={formData.clauses} 
                                            onToggleClause={toggleClause} 
                                            onUpdateClause={updateClause} 
                                            onRemoveClause={removeClause} 
                                            onAddCustom={addCustomClause}
                                            onRefineClick={(clauseKey, title, content) => handleRefineClick(clauseKey, title, content)}
                                        />
                                    </section>
                                )}

                                {/* SECTION 5: SIGNATURES, SEAL & EXECUTION */}
                                {(viewMode === 'all' || activeTab === '7') && (
                                    <section id="section-signatures" className="p-6 md:p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-black/10 dark:border-white/10 space-y-8 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-[#A855F7]/10 text-[#A855F7]">
                                                    <ShieldCheck size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Execution, Signatures & Security</h3>
                                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Biometric Signing, Official Seal & Cryptographic Reference</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Security Protocol Toggles */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({...formData, showSeal: !formData.showSeal})} 
                                                className={cn(
                                                    "p-5 rounded-2xl border transition-all flex items-center gap-4 text-left group",
                                                    formData.showSeal 
                                                        ? "bg-[#A855F7] text-black border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.3)]" 
                                                        : "bg-black/5 dark:bg-zinc-900 border-black/10 dark:border-white/10 text-zinc-400 hover:text-white hover:border-[#A855F7]/40"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                    formData.showSeal ? "bg-black/10 text-black" : "bg-black/5 dark:bg-white/5 text-[#A855F7]"
                                                )}>
                                                    <Stamp size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Security Feature</p>
                                                    <p className="text-xs font-black uppercase tracking-wider">Official Document Seal</p>
                                                </div>
                                            </button>

                                            <button 
                                                type="button"
                                                onClick={() => setFormData({...formData, showSignatures: !formData.showSignatures})} 
                                                className={cn(
                                                    "p-5 rounded-2xl border transition-all flex items-center gap-4 text-left group",
                                                    formData.showSignatures 
                                                        ? "bg-[#A855F7] text-black border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.3)]" 
                                                        : "bg-black/5 dark:bg-zinc-900 border-black/10 dark:border-white/10 text-zinc-400 hover:text-white hover:border-[#A855F7]/40"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                    formData.showSignatures ? "bg-black/10 text-black" : "bg-black/5 dark:bg-white/5 text-[#A855F7]"
                                                )}>
                                                    <PenTool size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Execution Block</p>
                                                    <p className="text-xs font-black uppercase tracking-wider">Digital Signatures Protocol</p>
                                                </div>
                                            </button>
                                        </div>

                                        {/* Signatory Identity Inputs */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Authorized Representative Full Name</label>
                                                <Input 
                                                    value={formData.providerName || formData.senderName || ''} 
                                                    onChange={e => {
                                                        updateField('providerName', e.target.value);
                                                        updateField('senderName', e.target.value);
                                                    }} 
                                                    placeholder="e.g. Authorized Signatory" 
                                                    className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-xs font-bold" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Corporate Title / Designation</label>
                                                <Input 
                                                    value={formData.providerDesignation || formData.senderDesignation || ''} 
                                                    onChange={e => {
                                                        updateField('providerDesignation', e.target.value);
                                                        updateField('senderDesignation', e.target.value);
                                                    }} 
                                                    placeholder="e.g. Director of Operations" 
                                                    className="h-12 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 text-xs font-bold" 
                                                />
                                            </div>
                                        </div>

                                        {/* Signature Capture Pad */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Biometric Digital Signature</label>
                                                {formData.providerSignature && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => updateField('providerSignature', null)} 
                                                        className="text-[9px] font-black text-red-400 hover:underline uppercase"
                                                    >
                                                        Clear Signature
                                                    </button>
                                                )}
                                            </div>

                                            <div 
                                                onClick={() => setIsSignatureModalOpen(true)}
                                                className="w-full h-44 bg-white dark:bg-zinc-900/60 rounded-2xl border border-black/10 dark:border-white/10 flex items-center justify-center cursor-pointer hover:border-[#A855F7]/40 transition-all relative overflow-hidden group shadow-inner"
                                            >
                                                {formData.providerSignature ? (
                                                    <div className="w-full h-full flex items-center justify-center p-6">
                                                        <img src={formData.providerSignature} className="max-h-full max-w-full object-contain filter dark:invert" alt="Signature" />
                                                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-[8px] font-black uppercase tracking-wider">
                                                            <CheckCircle2 size={11} /> Signed & Verified
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-zinc-500 group-hover:text-[#A855F7] transition-colors">
                                                        <PenTool size={28} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Click to Draw or Upload Signature</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Reference Seal & Cryptographic Node Footer */}
                                        <div className="p-6 rounded-2xl bg-black/5 dark:bg-zinc-900/60 border border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                                            <div className="flex items-center gap-4">
                                                <DocumentSeal type="contract" date={formData.effectiveDate} className="w-16 h-16 shrink-0" />
                                                <div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-[#A855F7]">Cryptographic Handshake</span>
                                                    <h4 className="text-sm font-black text-gray-900 dark:text-white font-mono mt-0.5">{formData.agreementNumber}</h4>
                                                    <p className="text-[9px] text-zinc-500 mt-0.5">SHA-256 integrity token active</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
                                                    Enforceable
                                                </span>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* Step Navigation Buttons (Tab Mode only) */}
                                {viewMode === 'tab' && activeTab !== 'ai' && (
                                    <div className="flex items-center justify-between pt-6 border-t border-black/10 dark:border-white/10">
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const idx = tabs.findIndex(t => t.id === activeTab);
                                                if (idx > 1) handleTabClick(tabs[idx - 1].id);
                                            }}
                                            disabled={activeTab === tabs[1].id}
                                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-black/5 dark:bg-white/5 text-zinc-400 hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-0"
                                        >
                                            <ChevronLeft size={16} /> Previous Section
                                        </button>

                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const idx = tabs.findIndex(t => t.id === activeTab);
                                                if (idx < tabs.length - 1) handleTabClick(tabs[idx + 1].id);
                                            }}
                                            className={cn(
                                                "flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg",
                                                activeTab === tabs[tabs.length - 1].id 
                                                    ? "bg-[#A855F7] text-black hover:scale-105" 
                                                    : "bg-[#A855F7] text-black hover:scale-105"
                                            )}
                                        >
                                            <span>{activeTab === tabs[tabs.length - 1].id ? 'Complete & Save' : 'Next Section'}</span>
                                            {activeTab !== tabs[tabs.length - 1].id && <ChevronRight size={16} />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>

                {/* Right Document Live Preview Workspace */}
                <aside className={cn(
                    "lg:static lg:flex fixed inset-0 z-[60] lg:z-0 bg-gray-100 dark:bg-[#05070D] flex-col overflow-hidden shrink-0 transition-transform duration-500 lg:translate-x-0 border-l border-black/10 dark:border-white/10",
                    isExpandedPreview ? "w-full lg:w-full border-l-0" : "w-full lg:w-[460px] xl:w-[540px] 2xl:w-[620px]",
                    showPreviewMobile ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                )}>
                    {/* Live Preview Top Controls */}
                    <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#080C14] shrink-0">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowPreviewMobile(false)} className="lg:hidden p-2 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 mr-1">
                                <ArrowLeft size={16} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => setIsExpandedPreview(!isExpandedPreview)} 
                                className="hidden lg:flex p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl text-zinc-400 hover:text-white transition-all items-center gap-1.5 text-[9px] font-black uppercase tracking-wider h-9 px-3"
                                title={isExpandedPreview ? "Exit Fullscreen Preview" : "Fullscreen Preview"}
                            >
                                {isExpandedPreview ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                <span>{isExpandedPreview ? "Collapse" : "Expand"}</span>
                            </button>
                            
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[8px] font-black uppercase tracking-wider">Live Preview</span>
                            </div>
                        </div>

                        {/* Zoom Controls & Page Pager */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-black/5 dark:bg-zinc-900 rounded-xl p-0.5 border border-black/10 dark:border-white/10">
                                <button onClick={() => setUserZoom(Math.max(0.4, userZoom - 0.1))} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-zinc-400 transition-colors" title="Zoom Out"><Minus size={11} /></button>
                                <button onClick={() => setUserZoom(1)} className="text-[9px] font-mono font-bold text-zinc-400 px-2 min-w-[42px] text-center hover:text-white" title="Reset Zoom">{Math.round(userZoom * 100)}%</button>
                                <button onClick={() => setUserZoom(Math.min(2, userZoom + 0.1))} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-zinc-400 transition-colors" title="Zoom In"><Plus size={11} /></button>
                            </div>

                            <div className="flex items-center gap-1.5 bg-black/5 dark:bg-zinc-900 rounded-xl p-1 border border-black/10 dark:border-white/10">
                                <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"><ChevronLeft size={13} /></button>
                                <span className="text-[9px] font-mono font-bold text-zinc-400 px-1">{currentPage + 1}/{paginatedPages.length}</span>
                                <button onClick={() => setCurrentPage(Math.min(paginatedPages.length - 1, currentPage + 1))} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"><ChevronRight size={13} /></button>
                            </div>
                        </div>
                    </div>

                    {/* Preview Page Canvas */}
                    <div ref={previewContainerRef} className="flex-1 bg-gray-200/60 dark:bg-[#05070D] flex flex-col items-center justify-start p-6 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
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
                                <div className="shadow-[0_20px_60px_rgba(0,0,0,0.45)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.8)] rounded-sm">
                                    <ContractPreview formData={formData} paginatedPages={paginatedPages} currentPage={currentPage} />
                                </div>
                            </div>
                        </div>
                        <div className="h-24 shrink-0" />
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
            {createPortal(
                <AnimatePresence>
                    {refinementContext && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md no-print"
                        >
                            <motion.div 
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-gray-900 dark:text-white"
                            >
                                <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-black/5 dark:bg-black/30">
                                    <div className="flex items-center gap-3">
                                        <Sparkles size={18} className="text-[#A855F7] animate-pulse" />
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">AI Field Refinement</h3>
                                            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Target: {refinementContext.fieldLabel}</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setRefinementContext(null)}
                                        className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                
                                <div className="p-6 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Current Content</label>
                                        <div className="p-4 bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-2xl max-h-36 overflow-y-auto text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed">
                                            {htmlToPlainText(refinementContext.currentValue) || <span className="italic text-zinc-600">Field is currently empty</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Refinement Prompt</label>
                                        <textarea
                                            value={refinementPrompt}
                                            onChange={(e) => setRefinementPrompt(e.target.value)}
                                            placeholder="Tell AI how to refine this text (e.g. 'make it legally stricter', 'clarify payment deadline within 7 days', 'condense to 1 paragraph')..."
                                            className="w-full h-28 bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 focus:border-[#A855F7]/50 rounded-2xl p-4 text-xs font-medium text-gray-900 dark:text-white placeholder:text-zinc-600 focus:outline-none transition-all resize-none leading-relaxed"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                    e.preventDefault();
                                                    handleInlineRefineSubmit();
                                                }
                                            }}
                                        />
                                        <div className="flex justify-between items-center text-[9px] text-zinc-500 font-semibold px-1">
                                            <span>Ctrl+Enter to Refine</span>
                                            <span>Instantly updates contract preview</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-5 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/30 flex justify-end gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setRefinementContext(null)}
                                        className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/10 transition-all text-zinc-400"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button"
                                        disabled={isRefining || !refinementPrompt.trim()}
                                        onClick={handleInlineRefineSubmit}
                                        className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#A855F7] text-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-40 disabled:scale-100"
                                    >
                                        {isRefining ? <RefreshCw className="animate-spin" size={12} /> : <Sparkles size={12} />}
                                        <span>{isRefining ? "Refining..." : "Refine Field"}</span>
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Signature Modal */}
            <SignatureModal 
                isOpen={isSignatureModalOpen} 
                onClose={() => setIsSignatureModalOpen(false)} 
                onSave={(sig) => updateField('providerSignature', sig)} 
                initialName={formData.providerName || "Authorized Signatory"}
            />

            {/* Floating Action Button for AI Assistant */}
            {viewMode === 'all' && (
                <div className="fixed bottom-6 right-6 lg:bottom-8 lg:right-[480px] xl:lg:right-[560px] 2xl:lg:right-[640px] z-[50]">
                    <button
                        type="button"
                        onClick={() => setIsFloatingChatOpen(!isFloatingChatOpen)}
                        className="w-13 h-13 p-3.5 bg-[#A855F7] text-black hover:bg-[#9333EA] shadow-[0_0_30px_rgba(168,85,247,0.4)] rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
                        title="Open AI Assistant"
                    >
                        <Sparkles className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Floating AI Chat Pop-up Overlay */}
            {isFloatingChatOpen && (
                <div className="fixed bottom-24 right-6 lg:bottom-24 lg:right-[480px] xl:lg:right-[560px] 2xl:lg:right-[640px] w-[92vw] sm:w-[420px] md:w-[460px] h-[540px] bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col p-4 z-[80] animate-fade-in">
                    {renderChatbot(true)}
                </div>
            )}
        </div>
    );
};

export default ContractGenerator;
