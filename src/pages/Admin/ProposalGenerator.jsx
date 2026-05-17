import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Save from 'lucide-react/dist/esm/icons/save';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Download from 'lucide-react/dist/esm/icons/download';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import X from 'lucide-react/dist/esm/icons/x';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
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
import Upload from 'lucide-react/dist/esm/icons/upload';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Cpu from 'lucide-react/dist/esm/icons/cpu';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Stamp from 'lucide-react/dist/esm/icons/stamp';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import SignatureModal from '../../components/ui/SignatureModal';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { generateFullDocument, reviseDocument } from '../../lib/ai';
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
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [bulkRawText, setBulkRawText] = useState('');

    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkProposals, setBulkProposals] = useState([]);
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [selectedBulkIndex, setSelectedBulkIndex] = useState(0);

    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
    ];

    const [singleFormData, setSingleFormData] = useState({
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

    const [singleItems, setSingleItems] = useState([
        { id: 1, description: 'Project Phase 01: Initial Strategic Planning', qty: 1, unit: 'Phase', price: 0 }
    ]);

    const formData = (isBulkMode && bulkProposals.length > 0 && bulkProposals[selectedBulkIndex]) ? bulkProposals[selectedBulkIndex] : singleFormData;
    const items = (isBulkMode && bulkProposals.length > 0 && bulkProposals[selectedBulkIndex]) ? (bulkProposals[selectedBulkIndex]?.items || []) : singleItems;

    const setFormData = (updater) => {
        if (isBulkMode && bulkProposals.length > 0) {
            setBulkProposals(prevBulk => {
                const updatedBulk = [...prevBulk];
                const current = updatedBulk[selectedBulkIndex];
                const nextState = typeof updater === 'function' ? updater(current) : updater;
                updatedBulk[selectedBulkIndex] = { ...current, ...nextState };
                return updatedBulk;
            });
        } else {
            setSingleFormData(updater);
        }
    };

    const setItems = (updater) => {
        if (isBulkMode && bulkProposals.length > 0) {
            setBulkProposals(prevBulk => {
                const updatedBulk = [...prevBulk];
                const current = updatedBulk[selectedBulkIndex];
                const nextItems = typeof updater === 'function' ? updater(current.items || []) : updater;
                updatedBulk[selectedBulkIndex] = { ...current, items: nextItems };
                return updatedBulk;
            });
        } else {
            setSingleItems(updater);
        }
    };

    const currentLogo = logoOptions.find(l => l.id === formData.selectedLogo) || logoOptions[0];

    useEffect(() => {
        if (id && proposals.length > 0) {
            const proposal = proposals.find(p => p.id === id);
            if (proposal) {
                setSingleFormData({ ...proposal, hiddenFields: proposal.hiddenFields || [], selectedLogo: proposal.selectedLogo || 'entertainment' });
                setSingleItems(proposal.items || []);
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
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[9px] font-black uppercase tracking-[0.1em]",
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
        if (!isHidden('cover')) {
            pages.push({ type: 'cover', items: [] });
        }
        if (!isHidden('strategy') && (!isHidden('overview') || !isHidden('primaryGoal'))) {
            pages.push({ type: 'strategy', items: [] });
        }
        if (!isHidden('scopeOfWork') && formData.scopeOfWork) {
            const estimateBlockHeight = (text) => {
                let h = 0;
                const rawLines = text.split('\n');
                const lines = [];
                rawLines.forEach(rl => {
                    const parts = rl.split(/\s(?=\d+\.\s)/);
                    if (parts.length > 1) lines.push(...parts);
                    else lines.push(rl);
                });

                let inList = false;
                for (let line of lines) {
                    line = line.trim();
                    if (!line) { h += 12; inList = false; continue; }
                    
                    if (line.match(/^[-*_]{3,}$/)) {
                        inList = false;
                        h += 66; // my-8 (64px) + line (1.5px)
                        continue;
                    }

                    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
                    if (headingMatch) {
                        inList = false;
                        h += headingMatch[1].length <= 2 ? 72 : 48;
                        if (headingMatch[2].length > 40) h += 24; 
                    } else if (line.match(/^[•\-\*]\s/)) {
                        h += (Math.ceil((line.length - 2) / 100) * 24);
                        if (!inList) { h += 24; inList = true; }
                        else { h += 6; }
                    } else {
                        inList = false;
                        h += (Math.ceil(line.length / 110) * 24) + 16;
                    }
                }
                return h;
            };

            const MAX_PAGE_HEIGHT = 780;
            const totalHeight = estimateBlockHeight(formData.scopeOfWork);
            
            if (totalHeight <= MAX_PAGE_HEIGHT) {
                 pages.push({ type: 'scope', items: [], scopeText: formData.scopeOfWork });
            } else {
                let currentPageText = '';
                let pageIndex = 1;
                const words = formData.scopeOfWork.split(' ');
                
                for (let i = 0; i < words.length; i++) {
                    const testText = currentPageText ? currentPageText + ' ' + words[i] : words[i];
                    if (estimateBlockHeight(testText) > MAX_PAGE_HEIGHT) {
                        if (currentPageText) {
                            pages.push({ type: 'scope', items: [], scopeText: currentPageText.trim(), scopePage: pageIndex++ });
                            currentPageText = words[i];
                        } else {
                            pages.push({ type: 'scope', items: [], scopeText: testText.trim(), scopePage: pageIndex++ });
                            currentPageText = '';
                        }
                    } else {
                        currentPageText = testText;
                    }
                }
                
                if (currentPageText.trim()) {
                    pages.push({ type: 'scope', items: [], scopeText: currentPageText.trim(), scopePage: pageIndex++ });
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
            useStore.getState().addToast("Couldn't save the proposal. Please try again.", 'error');
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
            useStore.getState().addToast("AI couldn't generate the content right now. Please try again.", 'error');
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
            // Lazy load libraries
            const [jsPDFModule, html2canvasModule] = await Promise.all([
                import('jspdf'),
                import('html2canvas')
            ]);
            const jsPDF = jsPDFModule.default;
            const html2canvas = html2canvasModule.default;

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

    const handleBulkGenerate = async () => {
        if (!bulkRawText || !bulkRawText.trim()) {
            addToast("Please enter raw requirements or client data for bulk generation.", "error");
            return;
        }
        setIsBulkGenerating(true);
        const prompts = bulkRawText
            .split(/\n[-_]{2,}\n|\n\n/)
            .map(p => p.trim())
            .filter(p => p.length > 10);

        setBulkProgress({ current: 0, total: 1 });
        setBulkProgress({ current: 1, total: 1 });
        
        try {
            const data = await generateFullDocument('bulk_proposal', bulkRawText, 'Premium', {});
            
            const finalProposal = {
                clientName: data.clientName || 'Master Client',
                clientAddress: data.clientAddress || 'Corporate Headquarters',
                campaignName: data.campaignName || 'Strategic Initiative',
                campaignDuration: data.campaignDuration || 'TBD',
                proposalNumber: `NBQ-BLK-${Math.floor(1000 + Math.random() * 9000)}`,
                coverDescription: data.coverDescription || 'This document contains the beautifully formatted and arranged synthesis of your data.',
                overview: '',
                primaryGoal: '',
                numericTargets: '',
                audienceAge: '',
                audienceLocation: '',
                audienceInterests: '',
                selectedChannels: [],
                contentCount: { reels: 0, posts: 0, stories: 0 },
                deliverables: [],
                clientRequirements: [],
                scopeOfWork: data.scopeOfWork && data.scopeOfWork.length > 10 ? data.scopeOfWork : bulkRawText,
                terms: '',
                paymentDetails: '',
                gstRate: 18,
                advanceRequested: 0,
                showGst: false,
                showSeal: false,
                showSignatures: false,
                signatureType: 'handwritten',
                providerSignature: '',
                clientSignature: '',
                senderName: 'Authorized Signatory',
                senderDesignation: 'Director of Operations',
                status: 'Draft',
                hiddenFields: ['strategy', 'proposal', 'inventory', 'commercials', 'terms', 'paymentDetails'],
                selectedLogo: 'entertainment',
                items: [],
                subtotal: 0,
                gstAmount: 0,
                totalAmount: 0,
                isBulkGenerated: true
            };
            
            setBulkProposals(prev => {
                const newVault = [...prev, finalProposal];
                setSelectedBulkIndex(newVault.length - 1);
                return newVault;
            });
            addToast(`Successfully arranged bulk data into a premium document!`, 'success');
        } catch (err) {
            addToast(`Failed to process bulk data: ${err.message}`, 'error');
        }
        setIsBulkGenerating(false);
    };

    const handleSaveAllBulk = async () => {
        if (bulkProposals.length === 0) return;
        setIsSaving(true);
        let savedCount = 0;
        try {
            for (const prop of bulkProposals) {
                const proposalData = JSON.parse(JSON.stringify({
                    ...prop,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));
                await addProposal(proposalData);
                savedCount++;
            }
            addToast(`Successfully saved all ${savedCount} proposals to the Vault!`, 'success');
            navigate('/admin/proposals');
        } catch (error) {
            addToast(`Error saving bulk proposals: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const generateAllBulkPDFs = async () => {
        if (bulkProposals.length === 0) return;
        setIsSaving(true);
        const originalScale = previewScale;
        const originalIndex = selectedBulkIndex;
        setPreviewScale(1);
        
        try {
            const [jsPDFModule, html2canvasModule] = await Promise.all([
                import('jspdf'),
                import('html2canvas')
            ]);
            const jsPDF = jsPDFModule.default;
            const html2canvas = html2canvasModule.default;

            for (let b = 0; b < bulkProposals.length; b++) {
                setSelectedBulkIndex(b);
                await new Promise(r => setTimeout(r, 800));
                
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pages = document.querySelectorAll('.pdf-export-only .proposal-page-render');
                
                if (pages.length > 0) {
                    for (let i = 0; i < pages.length; i++) {
                        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
                        if (i > 0) pdf.addPage();
                        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
                    }
                    pdf.save(`Newbi-Quotation-${bulkProposals[b].clientName || `Bulk-${b+1}`}.pdf`);
                }
            }
            addToast(`Successfully exported all ${bulkProposals.length} proposals as PDFs!`, 'success');
        } catch (error) {
            console.error(error);
            addToast("Failed to export bulk PDFs: " + error.message, 'error');
        } finally {
            setPreviewScale(originalScale);
            setSelectedBulkIndex(originalIndex);
            setIsSaving(false);
        }
    };

    const paginatedPages = getPaginatedPages();

    const handleRefine = async () => {
        if (!refinementPrompt.trim() || isRefining) return;
        setIsRefining(true);
        try {
            const currentDoc = (isBulkMode && bulkProposals.length > 0) ? bulkProposals[selectedBulkIndex] : singleFormData;
            const updatedDoc = await reviseDocument(currentDoc, refinementPrompt, 'Premium');
            
            if (isBulkMode && bulkProposals.length > 0) {
                setBulkProposals(prev => {
                    const newVault = [...prev];
                    newVault[selectedBulkIndex] = { ...currentDoc, ...updatedDoc };
                    return newVault;
                });
                if (singleFormData.id === currentDoc.id) {
                    setSingleFormData(prev => ({ ...prev, ...updatedDoc }));
                }
            } else {
                setSingleFormData(prev => ({ ...prev, ...updatedDoc }));
            }
            addToast('Document successfully refined!', 'success');
            setRefinementPrompt('');
        } catch (err) {
            addToast(`Refinement failed: ${err.message}`, 'error');
        } finally {
            setIsRefining(false);
        }
    };

    const tabs = [
        { id: '1', label: 'Identity', icon: FileText, desc: 'Basic Information', visibilityKey: 'cover' },
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

            const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const headingText = headingMatch[2];
                const headingClass = level <= 2 
                    ? "text-[14px] font-black text-black uppercase tracking-[0.2em] mt-8 mb-3 border-b border-black pb-1.5"
                    : "text-[12px] font-black text-gray-800 uppercase tracking-[0.15em] mt-6 mb-2";
                elements.push(<p key={i} className={headingClass}>{headingText}</p>);
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
        <div className="min-h-screen bg-[#020202] text-white selection:bg-neon-green selection:text-black font-['Outfit'] overflow-x-clip flex flex-col">
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
                        <p className="text-[7px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1 truncate">Business Summary</p>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex items-center bg-zinc-900/80 border border-white/10 rounded-2xl p-1 gap-1 shadow-inner ml-2 md:ml-6 shrink-0">
                        <button 
                            onClick={() => setIsBulkMode(false)}
                            className={cn(
                                "px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                                !isBulkMode ? "bg-neon-green text-black shadow-[0_0_20px_rgba(57,255,20,0.3)]" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <FileText size={14} />
                            <span className="hidden sm:inline">Single Mode</span>
                        </button>
                        <button 
                            onClick={() => setIsBulkMode(true)}
                            className={cn(
                                "px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                                isBulkMode ? "bg-neon-green text-black shadow-[0_0_20px_rgba(57,255,20,0.3)]" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <FileSpreadsheet size={14} />
                            <span className="hidden sm:inline">AI Bulk Mode</span>
                        </button>
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

            <main className="flex-1 flex overflow-x-clip">
                {/* Sidebar - Desktop */}
                {(!isBulkMode || (isBulkMode && bulkProposals.length > 0)) && (
                    <aside className="hidden lg:flex w-64 border-r border-white/5 bg-zinc-900/20 flex-col p-6 gap-6 overflow-y-auto scrollbar-hide">
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
                )}

                {/* Mobile Bottom Navigation */}
                {(!isBulkMode || (isBulkMode && bulkProposals.length > 0)) && (
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-[100] px-4 flex items-center justify-around no-scrollbar">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={cn("flex flex-col items-center justify-center min-w-[64px] h-full transition-all gap-1", activeTab === tab.id ? "text-neon-green" : "text-gray-500")}>
                                <tab.icon size={20} />
                                <span className="text-[7px] font-black uppercase tracking-widest">{tab.label.split(' ')[0]}</span>
                                {activeTab === tab.id && <div className="w-1 h-1 rounded-full bg-[#39FF14] mt-1 shadow-[0_0_8px_#39FF14]" />}
                            </button>
                        ))}
                    </div>
                )}


                {/* Editor Area */}
                <main className="flex-1 overflow-y-auto px-4 md:px-12 py-10 md:py-16 scrollbar-hide bg-[#050505] pb-32">
                    <div className="max-w-[1600px] mx-auto space-y-10 md:space-y-12">
                        {isBulkMode && (
                            <div className="space-y-12">
                                {/* Top Intro Card */}
                                <div className="p-8 md:p-12 bg-zinc-900/40 border border-white/10 rounded-[3rem] relative overflow-hidden shadow-2xl space-y-8 group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 rounded-full blur-3xl group-hover:bg-neon-green/10 transition-all" />
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={16} className="text-neon-green" />
                                                <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em]">Batch Automation</p>
                                            </div>
                                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic text-white">AI Bulk Orchestrator<span className="text-neon-green">.</span></h2>
                                            <p className="text-xs md:text-sm font-medium text-gray-400 max-w-3xl leading-relaxed">
                                                Paste raw unstructured requirements, meeting notes, CSV data, or a list of client requests. Our AI will automatically parse, structure, and generate distinct, client-ready professional proposals in batch.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 relative z-10">
                                        <div className="flex justify-between items-center px-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Raw Input Data / Client Prompts</label>
                                            <span className="text-[10px] font-black text-neon-green bg-neon-green/10 px-3 py-1 rounded-full border border-neon-green/20">
                                                {bulkRawText.trim() ? bulkRawText.split(/\n[-_]{2,}\n|\n\n/).filter(p => p.trim().length > 10).length || 1 : 0} Prompts Detected
                                            </span>
                                        </div>
                                        <textarea 
                                            value={bulkRawText}
                                            onChange={e => setBulkRawText(e.target.value)}
                                            rows={8}
                                            placeholder="Example:&#10;Client: Apex Events | Project: Summer Music Festival | Duration: 2 Days | Requirements: Full stage sound and lighting setup, 40k budget.&#10;---&#10;Client: Nova Tech | Project: Annual Gala | Duration: 1 Evening | Requirements: LED video walls, corporate AV, and livestreaming, 120k budget."
                                            className="w-full bg-black/60 border border-white/10 focus:border-neon-green/50 rounded-3xl p-6 text-sm font-medium text-white outline-none resize-y placeholder:text-gray-700 leading-relaxed shadow-inner transition-all"
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 relative z-10">
                                        <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                            <Cpu size={16} className="text-neon-green" />
                                            <span>Multi-Threaded AI Pulse Engine</span>
                                        </div>

                                        <button 
                                            onClick={handleBulkGenerate}
                                            disabled={isBulkGenerating || !bulkRawText.trim()}
                                            className="w-full sm:w-auto px-8 py-4 bg-neon-green text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_10px_30px_rgba(57,255,20,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none disabled:hover:scale-100 flex items-center justify-center gap-3"
                                        >
                                            {isBulkGenerating ? (
                                                <>
                                                    <RefreshCw className="animate-spin" size={16} />
                                                    <span>Generating {bulkProgress.current} of {bulkProgress.total}...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={16} />
                                                    <span>Execute Batch Generation</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {isBulkGenerating && (
                                        <div className="space-y-2 relative z-10 pt-4">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                <span>AI Pulse Generation Progress</span>
                                                <span className="text-neon-green">{Math.round((bulkProgress.current / bulkProgress.total) * 100) || 0}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                                                <div 
                                                    className="h-full bg-neon-green rounded-full transition-all duration-500 shadow-[0_0_12px_#39FF14]"
                                                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Generated Bulk Proposals Grid */}
                                {bulkProposals.length > 0 && (
                                    <div className="space-y-8 pt-8 border-t border-white/5">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                                                    <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">Generated Batch Vault.</h3>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{bulkProposals.length} Proposals Ready for Review & Persistence</p>
                                            </div>

                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <button 
                                                    onClick={generateAllBulkPDFs}
                                                    disabled={isSaving}
                                                    className="flex-1 sm:flex-none px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
                                                    <span>Export All PDFs</span>
                                                </button>
                                                <button 
                                                    onClick={handleSaveAllBulk}
                                                    disabled={isSaving}
                                                    className="flex-1 sm:flex-none px-6 py-3 bg-neon-green text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                                                    <span>Save All to Vault</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {bulkProposals.map((prop, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={() => setSelectedBulkIndex(idx)}
                                                    className={cn(
                                                        "p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between gap-6 relative group overflow-hidden",
                                                        selectedBulkIndex === idx 
                                                            ? "bg-zinc-900/80 border-neon-green shadow-[0_10px_30px_rgba(57,255,20,0.15)] scale-[1.02]" 
                                                            : "bg-zinc-900/30 border-white/5 hover:border-white/20 hover:bg-zinc-900/50"
                                                    )}
                                                >
                                                    {selectedBulkIndex === idx && (
                                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-neon-green shadow-[0_0_10px_#39FF14]" />
                                                    )}

                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[10px] font-black font-mono px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-neon-green">
                                                                {prop.proposalNumber}
                                                            </span>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setBulkProposals(bulkProposals.filter((_, i) => i !== idx));
                                                                    if (selectedBulkIndex >= bulkProposals.length - 1) {
                                                                        setSelectedBulkIndex(Math.max(0, bulkProposals.length - 2));
                                                                    }
                                                                }}
                                                                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <h4 className="text-base font-black text-white uppercase tracking-tight truncate leading-snug">
                                                                {prop.clientName || `Client 0${idx+1}`}
                                                            </h4>
                                                            <p className="text-xs font-bold text-gray-400 italic truncate">
                                                                {prop.campaignName || `Project 0${idx+1}`}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 pt-2 border-t border-white/5">
                                                            <span>Duration: {prop.campaignDuration || '3 Months'}</span>
                                                            <span>•</span>
                                                            <span>{prop.items?.length || 1} Items</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-end justify-between pt-4 border-t border-white/5">
                                                        <div className="space-y-0.5">
                                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Est. Value</p>
                                                            <p className="text-lg font-black font-mono text-white leading-none">
                                                                ₹{(prop.totalAmount || 0).toLocaleString()}
                                                            </p>
                                                        </div>

                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                                                            selectedBulkIndex === idx ? "text-neon-green" : "text-gray-500 group-hover:text-white"
                                                        )}>
                                                            <span>{selectedBulkIndex === idx ? 'Active Preview' : 'Select'}</span>
                                                            <ArrowRight size={12} />
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {(!isBulkMode || (isBulkMode && bulkProposals.length > 0)) && (
                            <>
                                {!isBulkMode && (
                                    <AIPromptBox 
                                        onGenerate={handleGenerateProposal} 
                                        isGenerating={isGenerating && generatingSection === 'all'} 
                                        type="proposal" 
                                        forceClear={promptBoxClear}
                                    />
                                )}

                        <div className="flex flex-col 2xl:flex-row items-start 2xl:items-end justify-between gap-6 mb-16 pb-8 border-b border-white/5 relative overflow-hidden">
                            <div className="space-y-4 min-w-0 w-full 2xl:w-auto">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-[2px] bg-neon-green/40" />
                                    <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] opacity-80 truncate">
                                        Phase {tabs.findIndex(t => t.id === activeTab) + 1} of {tabs.length}
                                    </p>
                                </div>
                                <div className="space-y-2 min-w-0">
                                    <h2 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter italic text-white leading-none truncate">
                                        {currentTab?.label}<span className="text-neon-green">.</span>
                                    </h2>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.3em] pl-1 truncate">
                                        {currentTab?.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-start 2xl:items-end gap-4 w-full 2xl:w-auto shrink-0 pt-2 2xl:pt-0">
                                {/* Compact Progress Line */}
                                <div className="w-full sm:w-48 h-0.5 bg-white/5 rounded-full overflow-hidden shrink-0">
                                    <div 
                                        className="h-full bg-neon-green transition-all duration-700 shadow-[0_0_10px_rgba(57,255,20,0.8)]" 
                                        style={{ width: `${(tabs.findIndex(t => t.id === activeTab) + 1) / tabs.length * 100}%` }} 
                                    />
                                </div>

                                {currentTab?.visibilityKey && (
                                    <div className="flex flex-wrap items-center gap-2 translate-y-1">
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
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full hover:bg-neon-green/10 hover:text-neon-green transition-all text-[9px] font-black uppercase tracking-[0.1em] border border-white/10 hover:border-neon-green/20"
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
                                            <div className="space-y-4 relative group/editor">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cover Memorandum</label>
                                                </div>
                                                <textarea 
                                                    value={formData.coverDescription} 
                                                    onChange={e => setFormData({...formData, coverDescription: e.target.value})} 
                                                    className={cn("w-full bg-black/40 border border-white/10 focus:border-neon-green/50 rounded-[2rem] p-6 text-[13px] font-medium text-white outline-none resize-y placeholder:text-gray-700 leading-[1.8] shadow-inner transition-all", isHidden('coverDescription') && 'opacity-30')} 
                                                    placeholder="Cover page description for this proposal..." 
                                                    style={{ minHeight: "180px" }}
                                                />
                                            </div>
                                    </div>
                                )}
                                {activeTab === '2' && (
                                    <div className="space-y-12">
                                        <div className="space-y-4 relative group/editor">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Executive Summary</label>
                                            </div>
                                            <textarea 
                                                value={formData.overview} 
                                                onChange={e => setFormData({...formData, overview: e.target.value})} 
                                                className={cn("w-full bg-black/40 border border-white/10 focus:border-neon-green/50 rounded-[2rem] p-6 text-[13px] font-medium text-white outline-none resize-y placeholder:text-gray-700 leading-[1.8] shadow-inner transition-all", isHidden('overview') && 'opacity-30')} 
                                                placeholder="Strategic vision..." 
                                                style={{ minHeight: "200px" }}
                                            />
                                        </div>
                                        <div className="space-y-4 relative group/editor">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Primary Objective</label>
                                            </div>
                                            <textarea 
                                                value={formData.primaryGoal} 
                                                onChange={e => setFormData({...formData, primaryGoal: e.target.value})} 
                                                className={cn("w-full bg-black/40 border border-white/10 focus:border-neon-green/50 rounded-[2rem] p-6 text-[13px] font-medium text-white outline-none resize-y placeholder:text-gray-700 leading-[1.8] shadow-inner transition-all", isHidden('primaryGoal') && 'opacity-30')} 
                                                placeholder="Project Goal" 
                                                style={{ minHeight: "120px" }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {activeTab === '3' && (
                                    <div className="space-y-12">
                                        <div className="space-y-4 relative group/editor">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scope of Work</label>
                                            </div>
                                            <textarea 
                                                value={formData.scopeOfWork} 
                                                onChange={e => setFormData({...formData, scopeOfWork: e.target.value})} 
                                                className={cn("w-full bg-black/40 border border-white/10 focus:border-neon-green/50 rounded-[2rem] p-6 text-[13px] font-medium text-white outline-none resize-y placeholder:text-gray-700 leading-[1.8] shadow-inner transition-all", isHidden('scopeOfWork') && 'opacity-30')} 
                                                placeholder="Use bullet points for each scope item. Group under headings." 
                                                style={{ minHeight: "400px" }}
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
                                                        <div className="flex flex-col items-end"><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 pr-2">Price</span><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neon-green">₹</span><input disabled={isHidden('inventory')} type="number" value={item.price} onChange={e => { const newItems = [...items]; newItems[idx].price = Number(e.target.value); setItems(newItems); }} className="w-32 bg-black/40 border border-white/10 h-10 pl-7 pr-4 rounded-lg text-right text-xs font-black text-neon-green outline-none focus:border-neon-green/50" /></div></div>
                                                        <button disabled={isHidden('inventory')} onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-2.5 text-gray-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg disabled:opacity-30"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            ))}</div>
                                        </div>
                                    </div>
                                )}
                                {activeTab === '6' && (
                                    <div className="flex flex-col gap-8">
                                        <div className="flex flex-col gap-8">
                                            {/* Security Controls - Full Width */}
                                            <div className="p-8 md:p-10 bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[3rem] relative overflow-hidden">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-neon-green/10 flex items-center justify-center border border-neon-green/20 shrink-0">
                                                            <ShieldCheck size={28} className="text-neon-green" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em]">Verification</p>
                                                            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-none">Security Controls.</h3>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-4">
                                                        <button 
                                                            onClick={() => setFormData({...formData, showSeal: !formData.showSeal})} 
                                                            className={cn(
                                                                "h-20 w-full rounded-3xl border transition-all duration-500 group/btn relative overflow-hidden flex items-center px-6 gap-5",
                                                                formData.showSeal 
                                                                    ? "bg-neon-green text-black border-neon-green shadow-[0_20px_40px_rgba(57,255,20,0.25)]" 
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
                                                                    ? "bg-neon-green text-black border-neon-green shadow-[0_20px_40px_rgba(57,255,20,0.25)]" 
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
                                                        <input value={formData.senderName} onChange={e => setFormData({...formData, senderName: e.target.value})} placeholder="Full Legal Name" className="h-20 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-[1.5rem] text-lg font-black px-8 text-white outline-none transition-all placeholder:text-gray-800" />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Designation</label>
                                                        <input value={formData.senderDesignation} onChange={e => setFormData({...formData, senderDesignation: e.target.value})} placeholder="e.g. Director" className="h-20 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-[1.5rem] text-lg font-black px-8 text-white outline-none transition-all placeholder:text-gray-800" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Commercial Matrix & Terms */}
                                        <div className="p-8 md:p-10 bg-zinc-900/40 border border-white/5 rounded-[3rem] space-y-10 relative overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">Commercial Hub.</h3>
                                                    <p className="text-[10px] font-bold text-neon-green uppercase tracking-[0.3em]">Financial Matrix & Settlement</p>
                                                </div>
                                                <div className="p-3 bg-neon-green/10 rounded-2xl border border-neon-green/20">
                                                    <CreditCard size={20} className="text-neon-green" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                <div className="space-y-6">
                                                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Taxation (GST)</p>
                                                        <div className="flex items-center justify-between">
                                                            <button onClick={() => setFormData({...formData, showGst: !formData.showGst})} className={cn("w-12 h-7 rounded-full transition-all flex items-center px-1.5", formData.showGst ? "bg-neon-green" : "bg-white/10")}>
                                                                <div className={cn("w-4 h-4 rounded-full bg-black transition-all", formData.showGst ? "translate-x-5" : "translate-x-0")} />
                                                            </button>
                                                            <span className="text-sm font-black text-white">{formData.gstRate}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Advance Request (%)</p>
                                                        <div className="flex items-center gap-4">
                                                            <input type="range" min="0" max="100" step="5" value={formData.advanceRequested} onChange={e => setFormData({...formData, advanceRequested: parseInt(e.target.value)})} className="flex-1 accent-neon-green" />
                                                            <span className="text-sm font-black text-white w-10 text-right">{formData.advanceRequested}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="lg:col-span-2 space-y-4">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Settlement Terms</label>
                                                    <textarea 
                                                        value={formData.terms} 
                                                        onChange={e => setFormData({...formData, terms: e.target.value})} 
                                                        className={cn("w-full bg-black/40 border border-white/10 focus:border-neon-green/50 rounded-[2rem] p-6 text-[13px] font-medium text-white outline-none resize-y placeholder:text-gray-700 leading-[1.8] shadow-inner transition-all", isHidden('terms') && 'opacity-30')} 
                                                        style={{ minHeight: "200px" }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 3: Signature & Seal HUB */}
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                            {/* Signature Pad */}
                                            <div className="p-10 bg-zinc-900/40 border border-white/5 rounded-[3rem] relative overflow-hidden group">
                                                <div className="flex items-center justify-between mb-8">
                                                    <h4 className="text-xl font-black text-white uppercase tracking-tighter italic">Signature Capture.</h4>
                                                    {formData.providerSignature && (
                                                        <button onClick={() => setFormData({...formData, providerSignature: null})} className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline">Clear Pad</button>
                                                    )}
                                                </div>
                                                <div onClick={() => setIsSignatureModalOpen(true)} className="h-64 bg-black/80 rounded-[2.5rem] border border-white/5 flex items-center justify-center cursor-pointer hover:border-neon-green/40 transition-all relative overflow-hidden group/pad">
                                                    {formData.providerSignature ? (
                                                        <img src={formData.providerSignature} className="max-h-[70%] object-contain invert brightness-200 drop-shadow-[0_0_30px_rgba(57,255,20,0.4)]" alt="Signature" />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-4 text-white/5 group-hover/pad:text-neon-green/30 transition-all">
                                                            <PenTool size={32} />
                                                            <p className="text-[10px] font-black uppercase tracking-[0.6em]">Execute Pad</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Integrity Hub */}
                                            <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[3.5rem] flex flex-col items-center justify-center gap-8 relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-neon-green/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="relative shrink-0 scale-90">
                                                    <DocumentSeal className="w-40 h-40 drop-shadow-[0_0_40px_rgba(57,255,20,0.2)]" />
                                                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -inset-4 border border-dashed border-neon-green/20 rounded-full pointer-events-none" />
                                                </div>
                                                <div className="text-center space-y-4 w-full">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em]">Execution Reference</p>
                                                    <div className="bg-black/60 px-8 py-5 rounded-[2rem] border border-white/10 group-hover:border-neon-green/40 transition-all inline-block">
                                                        <h2 className="text-2xl lg:text-3xl font-black text-white tracking-[0.1em] italic uppercase">
                                                            NB-<span className="text-neon-green">{formData.campaignNumber || 'PROPOSAL-26'}</span>
                                                        </h2>
                                                    </div>
                                                </div>
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

                        {/* AI Refinement Chatbot */}
                        <div className="mt-8 mb-12 p-6 bg-zinc-900/50 border border-white/5 focus-within:border-neon-green/30 rounded-3xl relative overflow-hidden transition-all duration-300">
                            <div className="flex flex-col gap-4 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-neon-green/10 rounded-xl">
                                            <Sparkles size={14} className="text-neon-green" />
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Follow-up Refinement</h4>
                                    </div>
                                    {isRefining && <span className="text-[9px] font-bold text-neon-green animate-pulse uppercase tracking-widest">Revising Document...</span>}
                                </div>
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        value={refinementPrompt} 
                                        onChange={e => setRefinementPrompt(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleRefine()}
                                        placeholder="e.g. 'Add a timeline for Phase 3' or 'Change the client name'" 
                                        className="flex-1 bg-black/60 border border-white/5 rounded-2xl px-5 py-3.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-green/50 transition-all"
                                        disabled={isRefining}
                                    />
                                    <button 
                                        onClick={handleRefine}
                                        disabled={isRefining || !refinementPrompt.trim()}
                                        className="px-6 py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-neon-green hover:text-black hover:border-neon-green transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center min-w-[60px]"
                                    >
                                        {isRefining ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        </>
                        )}
                    </div>
                </main>

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
                                <motion.div key={currentPreviewPage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[15mm] shadow-2xl rounded-[2px] overflow-hidden">
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

                                    <div className="flex-1 overflow-hidden relative">
                                        <div className="absolute inset-0 flex flex-col px-1">
                                        {paginatedPages[currentPreviewPage]?.type === 'cover' && (
                                            <div className="h-full flex flex-col justify-start space-y-20 py-8">
                                                <div className="grid grid-cols-2 gap-10">
                                                    <div className="space-y-6 min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug break-words">{formData.clientName || 'Valued Partner'}</h2>{!isHidden('clientAddress') && <p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{formData.clientAddress || 'Client Address'}</p>}</div></div>
                                                    <div className="space-y-6 text-right min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Project Details</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug italic break-words">{formData.campaignName || 'Project Title'}</h2><p className="text-[12px] font-black text-neon-green bg-black px-3 py-1 inline-block uppercase tracking-widest">Period: {formData.campaignDuration || 'TBD'}</p></div></div>
                                                </div>
                                                <div className="pt-16 space-y-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-1 bg-black" />
                                                        <p className="text-[11px] font-black uppercase tracking-[0.6em]">Project Overview</p>
                                                    </div>
                                                    {!isHidden('coverDescription') && (
                                                        <div className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl">
                                                            {renderContent(formData.coverDescription || 'Cover description pending...')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{formData.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Business Proposal</p></div></div>
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
                                                            <p className="text-[10px] font-black text-black uppercase tracking-[0.4em]">Project Details</p>
                                                        </div>
                                                        <div className="text-2xl font-black text-black leading-tight italic tracking-tight">{renderContent(formData.primaryGoal)}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'scope' && (
                                            <div className="h-full flex flex-col py-10 px-4">
                                                {!formData.isBulkGenerated && (
                                                    <div className="space-y-2 mb-16 border-l-4 border-black pl-8">
                                                        <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.5em]">Project Definition</p>
                                                        <h3 className="text-5xl font-black text-black tracking-tighter uppercase leading-none">Scope of Work.</h3>
                                                    </div>
                                                )}
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
                                                                <td className="py-6 pl-4 text-right text-[13px] font-black tracking-widest text-black font-mono">₹{item.price.toLocaleString()}</td>
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
                                                <div className="grid grid-cols-2 gap-16 items-stretch">
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
                                                        <div className="p-10 bg-black text-right relative overflow-hidden shadow-xl"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Estimated Cost</p><h2 className="text-4xl font-black tracking-tighter text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2><div className="absolute top-0 right-0 w-2 h-full bg-neon-green" /></div>
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
                                    {!formData.isBulkGenerated && (
                                        <div className="space-y-4 mb-12">
                                            <h3 className="text-3xl font-black uppercase tracking-tighter text-black">Scope of Work.</h3>
                                            <div className="w-16 h-1 bg-black" />
                                        </div>
                                    )}
                                    <div className="flex-1 flex flex-col">
                                        <div className="relative">
                                            {!formData.isBulkGenerated && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-neon-green" />}
                                            <div className={formData.isBulkGenerated ? "pl-0" : "pl-10"}>
                                                {!formData.isBulkGenerated && !page.scopePage && <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">Execution Framework</p>}
                                                {!formData.isBulkGenerated && page.scopePage > 1 && <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">Execution Framework (Continued)</p>}
                                                {renderContent(page.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-8")}
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
                                    <div className="grid grid-cols-2 gap-16 items-stretch">
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
