import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Save from 'lucide-react/dist/esm/icons/save';
import Download from 'lucide-react/dist/esm/icons/download';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import X from 'lucide-react/dist/esm/icons/x';
import Send from 'lucide-react/dist/esm/icons/send';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
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
import Layers from 'lucide-react/dist/esm/icons/layers';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Cpu from 'lucide-react/dist/esm/icons/cpu';
import Stamp from 'lucide-react/dist/esm/icons/stamp';
import Gavel from 'lucide-react/dist/esm/icons/gavel';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Scale from 'lucide-react/dist/esm/icons/scale';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
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
import DocumentSeal from '../../components/ui/DocumentSeal';
import StudioRichEditor from '../../components/ui/StudioRichEditor';

// Legal Sub-components
import useContractGenerator from '../../components/admin/useContractGenerator';
import ClauseMarketplace from '../../components/admin/ClauseMarketplace';
import ContractPreview from '../../components/admin/ContractPreview';

// AI utilities
import { generateFullDocument, reviseDocument } from '../../lib/ai';

const logoOptions = [
    { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
    { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
];

    const inlineFmt = (text) => {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black">$1</strong>')
            .replace(/__(.*?)__/g, '<strong class="font-black">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
            .replace(/_(.*?)_/g, '<em class="italic">$1</em>');
    };

    const htmlToPlainText = (html) => {
        if (!html) return '';
        if (!html.includes('<') || !html.includes('>')) return html;
        let text = html;
        text = text.replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|ul|ol)>/gi, '\n');
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<[^>]+>/g, '');
        text = text.replace(/&nbsp;|\u00a0/g, ' ');
        text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        return text;
    };

    const getHtmlBlocks = (html) => {
        if (!html) return [];
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            let root = doc.body;
            // Unpack single wrapper div if present (like ProseMirror or class-based editors)
            if (root.children.length === 1 && root.firstElementChild.tagName.toLowerCase() === 'div') {
                root = root.firstElementChild;
            }
            const blocks = [];
            Array.from(root.children).forEach(child => {
                const tagName = child.tagName.toLowerCase();
                if (tagName === 'ul' || tagName === 'ol') {
                    const lis = Array.from(child.children);
                    if (lis.length > 0) {
                        lis.forEach(li => {
                            blocks.push(`<${tagName} class="space-y-1">${li.outerHTML}</${tagName}>`);
                        });
                    } else {
                        blocks.push(child.outerHTML);
                    }
                } else {
                    blocks.push(child.outerHTML);
                }
            });
            if (blocks.length === 0) return [html];
            return blocks;
        } catch (e) {
            console.error("DOMParser error, fallback to regex:", e);
            const regex = /<(p|div|ul|ol|h[1-6])\b[^>]*?>([\s\S]*?)<\/\1>/gi;
            const blocks = [];
            let match;
            while ((match = regex.exec(html)) !== null) {
                const tag = match[1].toLowerCase();
                const content = match[2];
                const fullMatch = match[0];
                if (tag === 'ul' || tag === 'ol') {
                    const liRegex = /<li\b[^>]*?>([\s\S]*?)<\/li>/gi;
                    let liMatch;
                    let liCount = 0;
                    while ((liMatch = liRegex.exec(content)) !== null) {
                        blocks.push(`<${tag} class="space-y-1">${liMatch[0]}</${tag}>`);
                        liCount++;
                    }
                    if (liCount === 0) {
                        blocks.push(fullMatch);
                    }
                } else {
                    blocks.push(fullMatch);
                }
            }
            if (blocks.length === 0) return [html];
            return blocks;
        }
    };

    const processHtmlHeadings = (html) => {
        if (!html) return html;
        return html.replace(/<(p|div)\b([^>]*?)>(#{1,6})(?:\s|&nbsp;|\u00a0)+(.*?)<\/\1>/gi, (match, tag, attrs, hashes, content) => {
            const level = hashes.length;
            const headingClass = level <= 2 
                ? "text-[12px] font-bold text-black border-b border-black/10 pb-1 mt-6 mb-2 block"
                : "text-[11px] font-semibold text-gray-800 mt-4 mb-1 block";
            const headingTag = `h${Math.min(level + 1, 6)}`;
            return `<${headingTag} class="${headingClass}" ${attrs}>${content}</${headingTag}>`;
        });
    };

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
            } else if (line.match(/^[•\-\*]\s/)) {
                const items = [];
                while (i < lines.length && lines[i].match(/^[•\-\*]\s/)) {
                    items.push(lines[i].replace(/^[•\-\*]\s/, ''));
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
            } else if (line.match(/^\d+\.\s/)) {
                const items = [];
                while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
                    items.push(lines[i].replace(/^\d+\.\s/, ''));
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
                const lastElement = elements[elements.length - 1];
                const isLastSpacer = lastElement && lastElement.key && String(lastElement.key).startsWith('spacer-');
                if (!isLastSpacer) {
                    elements.push(<div key={`spacer-${i}`} className="h-3" />);
                }
                i++;
                continue;
            }

            if (line.match(/^[-*_]{3,}$/)) {
                elements.push(<div key={`hr-${i}`} className="h-[1.5px] bg-black/10 my-8 w-full" />);
                i++;
                continue;
            }

            const headingMatch = line.match(/^(#{1,6})(?:\s|&nbsp;|\u00a0)+(.*)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const headingText = headingMatch[2];
                const headingClass = level <= 2 
                    ? "text-[12px] font-bold text-black border-b border-black/10 pb-1 mt-6 mb-2"
                    : "text-[11px] font-semibold text-gray-800 mt-4 mb-1";
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
            return <div className={cn("article-content", baseClass)} dangerouslySetInnerHTML={{ __html: processHtmlHeadings(content) }} />;
        }
        return renderFormatted(content, baseClass);
    };


const AIStudio = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { addProposal, updateProposal, proposals, addAgreement, updateAgreement, agreements, user, addToast } = useStore();

    // ────────────────────────────────────────────────────────────────────────
    // ENGINE CONTEXT SELECTION
    // ────────────────────────────────────────────────────────────────────────
    // Auto-detect engine based on URL or defaults.
    const isProposalRoute = location.pathname.includes('proposal');
    const isAgreementRoute = location.pathname.includes('agreement') || location.pathname.includes('contract');
    
    const initialEngine = isProposalRoute ? 'proposal' : (isAgreementRoute ? 'agreement' : 'proposal');
    const [activeEngine, setActiveEngine] = useState(initialEngine);

    // Lock engine choice if editing an existing document
    const isEditing = !!id;

    // React to route changes if not locked by an ID
    useEffect(() => {
        if (!isEditing) {
            if (isProposalRoute) setActiveEngine('proposal');
            if (isAgreementRoute) setActiveEngine('agreement');
        }
    }, [location.pathname, isEditing, isProposalRoute, isAgreementRoute]);

    // Accent maps depending on current engine
    const engineColor = activeEngine === 'proposal' ? 'neon-green' : 'neon-purple';
    
    // UI Visual Zoom/Scale states
    const [previewScale, setPreviewScale] = useState(0.55);
    const [userZoom, setUserZoom] = useState(1);
    const [currentPreviewPage, setCurrentPreviewPage] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const previewContainerRef = useRef(null);

    // ────────────────────────────────────────────────────────────────────────
    // 1. PROPOSAL ENGINE STATE & FUNCTIONS
    // ────────────────────────────────────────────────────────────────────────
    const [proposalActiveTab, setProposalActiveTab] = useState('1');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkRawText, setBulkRawText] = useState('');
    const [bulkProposals, setBulkProposals] = useState([]);
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);
    const [selectedBulkIndex, setSelectedBulkIndex] = useState(0);

    const [proposalFormData, setProposalFormData] = useState({
        clientName: '',
        clientAddress: '',
        campaignName: '',
        campaignDuration: '',
        proposalNumber: `NBQ-${Math.floor(1000 + Math.random() * 9000)}`,
        coverDescription: 'This comprehensive commercial instrument details the strategic execution architecture and deployment framework proposed by Newbi Entertainment.',
        overview: '',
        primaryGoal: '',
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
        signatureType: 'handwritten',
        providerSignature: '',
        clientSignature: '',
        senderName: 'Authorized Signatory',
        senderDesignation: 'Director of Operations',
        status: 'Draft',
        hiddenFields: [],
        selectedLogo: 'entertainment'
    });

    const [proposalItems, setProposalItems] = useState([
        { id: 1, description: 'Project Phase 01: Initial Strategic Planning', qty: 1, unit: 'Phase', price: 0 }
    ]);

    // Active working states for Proposal (taking bulk index if bulk mode active)
    const activeProposalData = (isBulkMode && bulkProposals.length > 0 && bulkProposals[selectedBulkIndex]) ? bulkProposals[selectedBulkIndex] : proposalFormData;
    const activeProposalItems = (isBulkMode && bulkProposals.length > 0 && bulkProposals[selectedBulkIndex]) ? (bulkProposals[selectedBulkIndex]?.items || []) : proposalItems;

    const setProposalDataState = (updater) => {
        if (isBulkMode && bulkProposals.length > 0) {
            setBulkProposals(prevBulk => {
                const updatedBulk = [...prevBulk];
                const current = updatedBulk[selectedBulkIndex];
                const nextState = typeof updater === 'function' ? updater(current) : updater;
                updatedBulk[selectedBulkIndex] = { ...current, ...nextState };
                return updatedBulk;
            });
        } else {
            setProposalFormData(updater);
        }
    };

    const setProposalItemsState = (updater) => {
        if (isBulkMode && bulkProposals.length > 0) {
            setBulkProposals(prevBulk => {
                const updatedBulk = [...prevBulk];
                const current = updatedBulk[selectedBulkIndex];
                const nextItems = typeof updater === 'function' ? updater(current.items || []) : updater;
                updatedBulk[selectedBulkIndex] = { ...current, items: nextItems };
                return updatedBulk;
            });
        } else {
            setProposalItems(updater);
        }
    };

    // Initialize existing proposal when editing
    const hasInitializedProposalRef = useRef(false);
    useEffect(() => {
        if (activeEngine === 'proposal' && id && proposals.length > 0 && !hasInitializedProposalRef.current) {
            const proposal = proposals.find(p => p.id === id);
            if (proposal) {
                setProposalFormData({ 
                    ...proposal, 
                    hiddenFields: proposal.hiddenFields || [], 
                    selectedLogo: proposal.selectedLogo || 'entertainment' 
                });
                setProposalItems(proposal.items || []);
                hasInitializedProposalRef.current = true;
            }
        }
    }, [id, proposals, activeEngine]);

    const proposalSubtotal = activeProposalItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const proposalGstAmount = activeProposalData.showGst ? (proposalSubtotal * activeProposalData.gstRate) / 100 : 0;
    const proposalTotalAmount = proposalSubtotal + proposalGstAmount;

    // Proposal pagination height estimators
    const getProposalPaginatedPages = useCallback(() => {
        const pages = [];
        const isHidden = (f) => (activeProposalData.hiddenFields || []).includes(f);
        
        if (!isHidden('cover')) pages.push({ type: 'cover', items: [] });
        if (!isHidden('strategy') && (!isHidden('overview') || !isHidden('primaryGoal'))) {
            pages.push({ type: 'strategy', items: [] });
        }
        if (!isHidden('scopeOfWork') && activeProposalData.scopeOfWork) {
            const estimateBlockHeight = (rawText) => {
                const isHtml = rawText.includes('<') && rawText.includes('>');
                if (!isHtml) {
                    let h = 0;
                    const text = htmlToPlainText(rawText);
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
                        if (!line) { h += 8; inList = false; continue; }
                        
                        if (line.match(/^[-*_]{3,}$/)) {
                            inList = false;
                            h += 40;
                            continue;
                        }

                        const headingMatch = line.match(/^(#{1,6})(?:\s|&nbsp;|\u00a0)+(.*)$/);
                        if (headingMatch) {
                            inList = false;
                            h += headingMatch[1].length <= 2 ? 48 : 32;
                            if (headingMatch[2].length > 40) h += 20; 
                        } else if (line.match(/^[•\-\*]\s/)) {
                            h += (Math.ceil((line.length - 2) / 100) * 20);
                            if (!inList) { h += 16; inList = true; }
                            else { h += 4; }
                        } else {
                            inList = false;
                            h += (Math.ceil(line.length / 110) * 20) + 8;
                        }
                    }
                    return h;
                }

                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(`<div>${rawText}</div>`, 'text/html');
                    const container = doc.body.firstElementChild;
                    let totalH = 0;
                    
                    Array.from(container.children).forEach(child => {
                        const tag = child.tagName.toLowerCase();
                        const text = child.textContent || '';
                        
                        if (tag.startsWith('h')) {
                            const level = parseInt(tag.substring(1)) || 2;
                            totalH += level <= 2 ? 40 : 28;
                            totalH += (Math.ceil(text.length / 80) * 20);
                        } else if (tag === 'ul' || tag === 'ol') {
                            const lis = child.querySelectorAll('li');
                            if (lis.length > 0) {
                                lis.forEach(li => {
                                    const liText = li.textContent || '';
                                    totalH += (Math.ceil(liText.length / 95) * 20) + 4;
                                });
                            } else {
                                totalH += (Math.ceil(text.length / 95) * 20) + 4;
                            }
                        } else {
                            if (text.trim() === '') {
                                totalH += 8;
                            } else {
                                totalH += (Math.ceil(text.length / 100) * 20) + 12;
                            }
                        }
                    });
                    return totalH;
                } catch (e) {
                    console.error("HTML estimation failed, fallback:", e);
                    return 200;
                }
            };

            const MAX_PAGE_HEIGHT = 820;
            const totalHeight = estimateBlockHeight(activeProposalData.scopeOfWork);
            
            if (totalHeight <= MAX_PAGE_HEIGHT) {
                 pages.push({ type: 'scope', items: [], scopeText: activeProposalData.scopeOfWork });
            } else {
                let currentPageText = '';
                let pageIndex = 1;
                const isHtml = activeProposalData.scopeOfWork.includes('<') && activeProposalData.scopeOfWork.includes('>');

                if (isHtml) {
                    const blocks = getHtmlBlocks(activeProposalData.scopeOfWork);
                    for (let i = 0; i < blocks.length; i++) {
                        const testText = currentPageText ? currentPageText + '\n' + blocks[i] : blocks[i];
                        if (estimateBlockHeight(testText) > MAX_PAGE_HEIGHT) {
                            if (currentPageText) {
                                pages.push({ type: 'scope', items: [], scopeText: currentPageText.trim(), scopePage: pageIndex++ });
                                currentPageText = blocks[i];
                            } else {
                                pages.push({ type: 'scope', items: [], scopeText: testText.trim(), scopePage: pageIndex++ });
                                currentPageText = '';
                            }
                        } else {
                            currentPageText = testText;
                        }
                    }
                } else {
                    const words = activeProposalData.scopeOfWork.split(' ');
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
                }
                
                if (currentPageText.trim()) {
                    pages.push({ type: 'scope', items: [], scopeText: currentPageText.trim(), scopePage: pageIndex++ });
                }
            }
        }
        if (!isHidden('proposal')) pages.push({ type: 'proposal', items: [] });
        if (!isHidden('inventory')) {
            let itemsRemaining = [...activeProposalItems];
            if (itemsRemaining.length === 0) pages.push({ type: 'table', items: [] });
            else while (itemsRemaining.length > 0) pages.push({ type: 'table', items: itemsRemaining.splice(0, 10) });
        }
        if (!isHidden('commercials')) {
            pages.push({ type: 'commercials', items: [] });
        }
        return pages;
    }, [activeProposalData, activeProposalItems]);

    const proposalPaginatedPages = useMemo(() => getProposalPaginatedPages(), [getProposalPaginatedPages]);

    const saveProposalDoc = async () => {
        setIsSaving(true);
        try {
            if (isBulkMode && bulkProposals.length > 0) {
                for (const prop of bulkProposals) {
                    const proposalData = JSON.parse(JSON.stringify({
                        ...prop,
                        createdAt: prop.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }));
                    await addProposal(proposalData);
                }
                addToast(`Successfully saved all bulk proposals!`, 'success');
                navigate('/admin/proposals');
            } else {
                const rawProposalData = { 
                    ...proposalFormData, 
                    items: proposalItems, 
                    totalAmount: proposalTotalAmount, 
                    subtotal: proposalSubtotal, 
                    updatedAt: new Date().toISOString() 
                };
                const proposalData = JSON.parse(JSON.stringify(rawProposalData));
                if (id) await updateProposal(id, proposalData);
                else await addProposal({ ...proposalData, createdAt: new Date().toISOString() });
                addToast(`Proposal saved successfully!`, 'success');
                navigate('/admin/proposals');
            }
        } catch (error) {
            addToast("Couldn't save the proposal: " + error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    // 2. AGREEMENT ENGINE STATE & FUNCTIONS
    // ────────────────────────────────────────────────────────────────────────
    const [agreementActiveTab, setAgreementActiveTab] = useState('1');
    const existingAgreement = (activeEngine === 'agreement' && id) ? agreements.find(a => a.id === id) : null;
    
    // Inject hook logic for Contract Generator
    const {
        formData: agreementFormData, 
        setFormData: setAgreementFormData, 
        updateField: updateAgreementField,
        toggleClause: toggleAgreementClause, 
        updateClause: updateAgreementClause, 
        removeClause: removeAgreementClause, 
        addCustomClause: addAgreementCustomClause,
        paginatedPages: agreementPaginatedPages
    } = useContractGenerator(existingAgreement);

    const saveAgreementDoc = async () => {
        setIsSaving(true);
        try {
            const rawData = { 
                ...agreementFormData, 
                updatedAt: new Date().toISOString(),
                createdBy: agreementFormData.createdBy || user?.uid || null 
            };
            const data = JSON.parse(JSON.stringify(rawData));
            if (id) await updateAgreement(id, data);
            else await addAgreement(data);
            addToast("Agreement saved successfully!", "success");
            navigate('/admin/agreements');
        } catch (error) {
            addToast("Agreement save failed: " + error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    // 3. UNIFIED GENERATOR FLOW & CHAT INTEGRATION
    // ────────────────────────────────────────────────────────────────────────
    const [promptText, setPromptText] = useState('');
    const [chatInput, setChatInput] = useState('');
    
    // Suggestion configurations
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionCategory, setSuggestionCategory] = useState(0);

    const suggestions = useMemo(() => {
        if (activeEngine === 'proposal') {
            return [
                "Event production proposal for a 2-day music festival, including stage, sound, and lighting setup",
                "Artist logistics and hospitality proposal for a multi-city stand-up comedy tour",
                "Proposal for 50 event volunteers and site management for a corporate marathon",
                "Strategic event consultation for a brand's 10th-anniversary gala dinner",
                "Complete digital marketing and social media coverage for a product launch event",
                "Technical production and stage management proposal for a TEDx event"
            ];
        } else {
            return [
                "Draft a service contract for social media management services for 12 months, ₹50,000 total value",
                "Create an NDA and service contract for a brand collaboration with Sunrise Studios",
                "Generate an MOU for a joint venture between Newbi Entertainment and a production house",
                "Write a freelancer contract for video editing services, 6-month engagement",
                "Draft a content licensing contract for YouTube channel management"
            ];
        }
    }, [activeEngine]);

    // Messages array inside chat
    const [messages, setMessages] = useState([
        {
            id: 'init-msg',
            sender: 'ai',
            text: activeEngine === 'proposal'
                ? "Welcome to Newbi AI Proposal Studio. Describe the event or campaign requirements in the prompt box above, and I will generate a fully detailed proposal and cost estimate for you. You can refine it at any time using this chat!"
                : "Welcome to Newbi Legal Suite. Provide details about the contracting parties and commercials above. I will draft a legally-precise agreement. You can ask me to revise terms or clauses right in the chat stream."
        }
    ]);

    const chatEndRef = useRef(null);

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
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Update greeting message when switching engine
    useEffect(() => {
        setMessages([
            {
                id: 'init-msg-' + activeEngine,
                sender: 'ai',
                text: activeEngine === 'proposal'
                    ? "Welcome to Newbi AI Proposal Studio. Describe the event or campaign requirements in the prompt box above, and I will generate a fully detailed proposal and cost estimate for you. You can refine it at any time using this chat!"
                    : "Welcome to Newbi Legal Suite. Provide details about the contracting parties and commercials above. I will draft a legally-precise agreement. You can ask me to revise terms or clauses right in the chat stream."
            }
        ]);
        setCurrentPreviewPage(0);
    }, [activeEngine]);

    // Single trigger to handle full document generation
    const handleMainGenerate = async () => {
        if (!promptText.trim()) return;
        setIsGenerating(true);
        setShowSuggestions(false);
        
        // Add chat representation of user instruction
        const userMsg = { id: Date.now() + '-user', sender: 'user', text: `Generate new ${activeEngine === 'proposal' ? 'proposal' : 'agreement'}: "${promptText}"` };
        setMessages(prev => [...prev, userMsg]);

        try {
            if (activeEngine === 'proposal') {
                if (isBulkMode) {
                    setIsBulkGenerating(true);
                    const data = await generateFullDocument('bulk_proposal', promptText, 'Premium', {});
                    
                    const finalProposal = {
                        clientName: data.clientName || 'Master Client',
                        clientAddress: data.clientAddress || 'Corporate Headquarters',
                        campaignName: data.campaignName || 'Strategic Initiative',
                        campaignDuration: data.campaignDuration || 'TBD',
                        proposalNumber: `NBQ-${Math.floor(1000 + Math.random() * 9000)}`,
                        coverDescription: data.coverDescription || 'This document contains the beautifully formatted and arranged synthesis of your data.',
                        overview: '',
                        primaryGoal: '',
                        deliverables: [],
                        clientRequirements: [],
                        scopeOfWork: data.scopeOfWork && data.scopeOfWork.length > 10 ? data.scopeOfWork : promptText,
                        terms: '1. 50% Advance Fee required.\n2. Balance on delivery.\n3. Taxes as applicable (18% GST).\n4. Quote valid for 14 days.',
                        paymentDetails: 'Account Name: YOUR NAME\nAccount Number: 0000000000\nIFSC: YOUR000000\nUPI: yourname@upi',
                        gstRate: 18,
                        advanceRequested: 50,
                        showGst: true,
                        showSeal: false,
                        showSignatures: true,
                        signatureType: 'handwritten',
                        providerSignature: '',
                        clientSignature: '',
                        senderName: 'Authorized Signatory',
                        senderDesignation: 'Director of Operations',
                        status: 'Draft',
                        hiddenFields: ['strategy', 'proposal', 'inventory'],
                        selectedLogo: 'entertainment',
                        items: [],
                        subtotal: 0,
                        gstAmount: 0,
                        totalAmount: 0,
                        isBulkGenerated: true
                    };
                    setBulkProposals([finalProposal]);
                    setSelectedBulkIndex(0);
                    setMessages(prev => [...prev, {
                        id: Date.now() + '-ai',
                        sender: 'ai',
                        text: "✓ Bulk requirements structured! I have disabled typical estimation forms since it is in bulk scope mode. Check the A4 preview to review."
                    }]);
                } else {
                    const data = await generateFullDocument('proposal', promptText, 'Premium', {});
                    setProposalFormData(prev => ({
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
                                id: Date.now() + i, 
                                description: r.description || r.name || '' 
                            })) 
                            : prev.clientRequirements,
                    }));
                    if (data.items) {
                        setProposalItems(data.items.map((item, i) => ({
                            id: Date.now() + i,
                            description: item.description || item.name || '',
                            qty: Number(item.qty) || 1,
                            unit: item.unit || 'Event',
                            price: Number(item.price) || 0
                        })));
                    }
                    setMessages(prev => [...prev, {
                        id: Date.now() + '-ai',
                        sender: 'ai',
                        text: `✓ Successfully created proposal for "${data.clientName || 'Partner'}". Added ${data.items?.length || 0} line items and deliverables. Let me know if you want to revise any sections!`
                    }]);
                }
            } else {
                // Agreement Engine
                const data = await generateFullDocument('agreement', promptText, 'Premium', {});
                setAgreementFormData(prev => ({
                    ...prev,
                    agreementNumber: prev.agreementNumber || `NB-AGR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                    parties: {
                        firstParty: { 
                            name: data.parties?.firstParty?.name || 'Newbi Entertainment',
                            address: data.parties?.firstParty?.address || 'Bangalore, India',
                            role: data.parties?.firstParty?.role || 'Service Provider',
                            email: data.parties?.firstParty?.email || ''
                        },
                        secondParty: {
                            name: data.parties?.secondParty?.name || '',
                            address: data.parties?.secondParty?.address || '',
                            role: data.parties?.secondParty?.role || 'Client',
                            email: data.parties?.secondParty?.email || ''
                        }
                    },
                    details: {
                        projectName: data.details?.projectName || prev.details.projectName,
                        purpose: data.details?.purpose || prev.details.purpose,
                        duration: data.details?.duration || prev.details.duration,
                        territory: data.details?.territory || prev.details.territory
                    },
                    commercials: {
                        totalValue: data.commercials?.totalValue || prev.commercials.totalValue,
                        paymentSchedule: data.commercials?.paymentSchedule || prev.commercials.paymentSchedule,
                        currency: data.commercials?.currency || 'INR',
                        gstIncluded: data.commercials?.gstIncluded !== false
                    },
                    clauses: data.clauses?.length 
                        ? data.clauses.map((c, i) => ({
                            id: `ai-${Date.now()}-${i}`,
                            title: c.title || 'Clause',
                            content: c.content || '',
                            isActive: true,
                            category: 'general'
                        }))
                        : prev.clauses
                }));
                setMessages(prev => [...prev, {
                    id: Date.now() + '-ai',
                    sender: 'ai',
                    text: `✓ Agreement drafted successfully for "${data.parties?.secondParty?.name || 'Client'}". Total Value is set to ${data.commercials?.currency || 'INR'} ${data.commercials?.totalValue || '0'}. Added ${data.clauses?.length || 0} legal clauses. What would you like to refine?`
                }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now() + '-ai-err',
                sender: 'ai',
                text: `⚠ Error during generation: ${err.message}`
            }]);
            addToast(`AI Generation failed: ${err.message}`, 'error');
        } finally {
            setIsGenerating(false);
            setIsBulkGenerating(false);
        }
    };

    // Chat refinement trigger (calls reviseDocument)
    const handleChatRefinement = async (e) => {
        e?.preventDefault();
        if (!chatInput.trim()) return;

        const command = chatInput.trim();
        setChatInput('');

        // Append user bubble
        const userBubble = { id: Date.now() + '-user-chat', sender: 'user', text: command };
        setMessages(prev => [...prev, userBubble]);
        setIsGenerating(true);

        const activeDocState = activeEngine === 'proposal' 
            ? { ...activeProposalData, items: activeProposalItems } 
            : agreementFormData;

        try {
            const revisedJSON = await reviseDocument(activeDocState, command, 'Premium');
            
            if (activeEngine === 'proposal') {
                setProposalFormData(prev => ({
                    ...prev,
                    ...revisedJSON,
                    deliverables: revisedJSON.deliverables?.length 
                        ? revisedJSON.deliverables.map((d, i) => ({ id: d.id || Date.now() + i, item: d.item || '', qty: d.qty || '1', timeline: d.timeline || 'TBD' }))
                        : prev.deliverables,
                    clientRequirements: revisedJSON.clientRequirements?.length 
                        ? revisedJSON.clientRequirements.map((r, i) => ({ id: r.id || Date.now() + i, description: r.description || '' }))
                        : prev.clientRequirements,
                }));
                if (revisedJSON.items) {
                    setProposalItems(revisedJSON.items.map((item, i) => ({
                        id: item.id || Date.now() + i,
                        description: item.description || '',
                        qty: Number(item.qty) || 1,
                        unit: item.unit || 'Event',
                        price: Number(item.price) || 0
                    })));
                }
            } else {
                setAgreementFormData(prev => ({
                    ...prev,
                    ...revisedJSON,
                    parties: {
                        firstParty: { ...prev.parties.firstParty, ...(revisedJSON.parties?.firstParty || {}) },
                        secondParty: { ...prev.parties.secondParty, ...(revisedJSON.parties?.secondParty || {}) }
                    },
                    details: { ...prev.details, ...(revisedJSON.details || {}) },
                    commercials: { ...prev.commercials, ...(revisedJSON.commercials || {}) },
                    clauses: revisedJSON.clauses?.length
                        ? revisedJSON.clauses.map((c, i) => ({ id: c.id || `clause-${Date.now()}-${i}`, title: c.title || '', content: c.content || '', isActive: c.isActive !== false }))
                        : prev.clauses
                }));
            }

            setMessages(prev => [...prev, {
                id: Date.now() + '-ai-refine',
                sender: 'ai',
                text: `✓ I have refined the document state based on your instruction: "${command}". The live preview and edit fields have been updated.`
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now() + '-ai-refine-err',
                sender: 'ai',
                text: `⚠ Failed to refine document: ${err.message}`
            }]);
            addToast(`Refinement failed: ${err.message}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    // PDF DOWNLOADING FLOW
    // ────────────────────────────────────────────────────────────────────────
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

            if (activeEngine === 'proposal') {
                const pages = document.querySelectorAll('.pdf-export-only .proposal-page-render');
                if (pages.length === 0) {
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
                pdf.save(`Newbi-Quotation-${activeProposalData.clientName || 'Proposal'}.pdf`);
            } else {
                const pages = document.querySelectorAll('.pdf-export-only .agreement-page-render');
                for (let i = 0; i < pages.length; i++) {
                    const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
                    if (i > 0) pdf.addPage();
                    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
                }
                pdf.save(`Newbi-Contract-${agreementFormData.parties.secondParty.name || 'Agreement'}.pdf`);
            }
        } catch (error) {
            console.error("PDF Export failed:", error);
            addToast("Failed to generate PDF.", "error");
        } finally {
            setPreviewScale(originalScale);
            setIsSaving(false);
        }
    };

    // Responsive scaling resize effect
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
    }, [userZoom, activeEngine, activeProposalData, agreementFormData]);

    // ────────────────────────────────────────────────────────────────────────
    // PREVIEW RENDERING UTILITIES
    // ────────────────────────────────────────────────────────────────────────

    // Signature Modal hooks
    const [isSigModalOpen, setIsSigModalOpen] = useState(false);
    const [sigTarget, setSigTarget] = useState('provider'); // 'provider' | 'client'
    const [isSignaturesCollapsed, setIsSignaturesCollapsed] = useState(true);

    const handleSigSave = (dataUrl) => {
        if (activeEngine === 'proposal') {
            setProposalDataState(prev => ({
                ...prev,
                showSignatures: true,
                providerSignature: sigTarget === 'provider' ? dataUrl : prev.providerSignature,
                clientSignature: sigTarget === 'client' ? dataUrl : prev.clientSignature
            }));
        } else {
            setAgreementFormData(prev => ({
                ...prev,
                showSignatures: true,
                providerSignature: sigTarget === 'provider' ? dataUrl : prev.providerSignature,
                clientSignature: sigTarget === 'client' ? dataUrl : prev.clientSignature
            }));
        }
    };

    const currentLogo = logoOptions.find(l => l.id === (activeEngine === 'proposal' ? activeProposalData.selectedLogo : agreementFormData.selectedLogo)) || logoOptions[0];
    const paginatedPages = activeEngine === 'proposal' ? proposalPaginatedPages : agreementPaginatedPages;

    return (
        <div className="min-h-screen bg-[#020202] text-white font-['Outfit'] flex flex-col overflow-x-hidden">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .font-signature { font-family: 'Caveat', cursive; }
            `}} />

            {/* TOP BAR BAR */}
            <header className="h-16 md:h-20 border-b border-white/5 bg-black/50 backdrop-blur-3xl flex items-center justify-between px-4 md:px-8 shrink-0 relative z-50">
                <div className="flex items-center gap-4">
                    <Link 
                        to={activeEngine === 'proposal' ? '/admin/proposals' : '/admin/agreements'} 
                        className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl transition-all border border-white/5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                        <ArrowLeft size={14} />
                        <span className="hidden sm:inline">Vault</span>
                    </Link>
                    <AdminDashboardLink />
                </div>

                {/* UNIFIED ENGINE TOGGLE TABS */}
                <div className="bg-[#0D0D0D] border border-white/[0.04] p-1 rounded-2xl flex items-center gap-1">
                    <button
                        onClick={() => !isEditing && setActiveEngine('proposal')}
                        disabled={isEditing && activeEngine !== 'proposal'}
                        className={cn(
                            "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2",
                            activeEngine === 'proposal'
                                ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 shadow-[0_0_15px_rgba(57,255,20,0.15)]"
                                : "text-zinc-500 hover:text-zinc-300 disabled:opacity-20"
                        )}
                    >
                        <Layers size={12} />
                        Proposal Engine
                    </button>
                    <button
                        onClick={() => !isEditing && setActiveEngine('agreement')}
                        disabled={isEditing && activeEngine !== 'agreement'}
                        className={cn(
                            "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2",
                            activeEngine === 'agreement'
                                ? "bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                                : "text-zinc-500 hover:text-zinc-300 disabled:opacity-20"
                        )}
                    >
                        <Scale size={12} />
                        Agreement Engine
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={generatePDF}
                        disabled={isSaving}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider"
                    >
                        <Download size={14} />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={activeEngine === 'proposal' ? saveProposalDoc : saveAgreementDoc}
                        disabled={isSaving}
                        className={cn(
                            "px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2",
                            activeEngine === 'proposal'
                                ? "bg-[#39FF14] text-black hover:shadow-[0_0_20px_rgba(57,255,20,0.4)]"
                                : "bg-[#A855F7] text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                        )}
                    >
                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>Save {isEditing ? "Changes" : "Draft"}</span>
                    </button>
                </div>
            </header>

            {/* SPLIT LAYOUT CONTAINER */}
            <div className="flex-1 flex min-h-0 relative overflow-hidden">
                
                {/* LEFT CONTROL PANEL (AI, CHAT, FORMS) */}
                <div className="w-full lg:w-[48%] border-r border-white/5 bg-[#050505] flex flex-col min-h-0 overflow-hidden">
                    
                    {/* TOP BRANDING PANEL: GEMINI 3.5 FLASH ACTIVE */}
                    <div className="p-6 border-b border-white/5 relative overflow-hidden shrink-0">
                        
                        {/* Scanning horizontal laser bar */}
                        {isGenerating && (
                            <div className={cn(
                                "absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-ai-scan z-20 pointer-events-none",
                                activeEngine === 'proposal' ? "via-[#39FF14]" : "via-[#A855F7]"
                            )} />
                        )}

                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className={cn("animate-pulse", activeEngine === 'proposal' ? "text-[#39FF14]" : "text-[#A855F7]")} />
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Gemini 3.5 Flash Active</h3>
                                </div>
                                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Cognitive Documents Orchestration Platform</p>
                            </div>
                            
                            {/* Orbital Tuning Visualization */}
                            <div className="relative w-14 h-14 rounded-full flex items-center justify-center border border-white/5 bg-zinc-900/40">
                                <div className={cn(
                                    "absolute w-12 h-12 rounded-full border border-dashed opacity-25 animate-orbit-1",
                                    activeEngine === 'proposal' ? "border-[#39FF14]" : "border-[#A855F7]"
                                )} />
                                <div className={cn(
                                    "absolute w-10 h-10 rounded-full border border-dashed opacity-45 animate-orbit-2",
                                    activeEngine === 'proposal' ? "border-[#39FF14]" : "border-[#A855F7]"
                                )} />
                                <div className={cn(
                                    "absolute w-7 h-7 rounded-full border border-dashed opacity-65 animate-orbit-3",
                                    activeEngine === 'proposal' ? "border-[#39FF14]" : "border-[#A855F7]"
                                )} />
                                <div className={cn(
                                    "w-3.5 h-3.5 rounded-full z-10 animate-ping absolute",
                                    activeEngine === 'proposal' ? "bg-[#39FF14]" : "bg-[#A855F7]"
                                )} />
                                <div className={cn(
                                    "w-2.5 h-2.5 rounded-full z-10 relative",
                                    activeEngine === 'proposal' ? "bg-[#39FF14]" : "bg-[#A855F7]"
                                )} />
                            </div>
                        </div>

                        {/* Dynamic Step Status Bar */}
                        {isGenerating && (
                            <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2 relative z-10 animate-pulse">
                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                                    <span className={activeEngine === 'proposal' ? "text-[#39FF14]" : "text-[#A855F7]"}>
                                        {STAGE_MESSAGES[generationStage]?.text || "Synthesizing parameters..."}
                                    </span>
                                    <span className="text-zinc-500 font-mono font-bold">{generationTime}s elapsed</span>
                                </div>
                                <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                                    <div 
                                        className={cn("h-full transition-all duration-500", activeEngine === 'proposal' ? "bg-[#39FF14]" : "bg-[#A855F7]")} 
                                        style={{ width: `${generationProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CORE SINGLE PROMPT BOX */}
                    <div className="p-6 border-b border-white/5 bg-black/40 relative">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Document Intent</span>
                            
                            {/* Toggle Bulk Mode (Proposal Engine Only) */}
                            {activeEngine === 'proposal' && (
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Bulk mode</span>
                                    <button
                                        onClick={() => setIsBulkMode(!isBulkMode)}
                                        className={cn(
                                            "w-10 h-5 rounded-full p-0.5 transition-all relative",
                                            isBulkMode ? "bg-[#39FF14]" : "bg-zinc-800"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 rounded-full bg-black transition-all",
                                            isBulkMode ? "translate-x-5" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* TextArea & Suggestion controls */}
                        <div className={cn(
                            "border border-white/5 rounded-3xl p-3 bg-zinc-950 flex flex-col relative",
                            isGenerating && `border-${activeEngine === 'proposal' ? '[#39FF14]' : '[#A855F7]'}/30 shadow-[0_0_20px_rgba(57,255,20,0.05)]`
                        )}>
                            <textarea
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                placeholder={
                                    isBulkMode
                                        ? "Paste raw CSV / structured requirements here to process bulk proposals..."
                                        : `Describe the ${activeEngine === 'proposal' ? 'proposal' : 'agreement'} requirements in natural language...`
                                }
                                className="w-full bg-transparent text-sm text-white placeholder-zinc-600 outline-none border-none resize-none py-2 px-1 min-h-[60px]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleMainGenerate();
                                    }
                                }}
                            />

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                <button
                                    onClick={() => setShowSuggestions(!showSuggestions)}
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"
                                >
                                    <Zap size={10} />
                                    Inspiration
                                </button>

                                <button
                                    onClick={handleMainGenerate}
                                    disabled={isGenerating || !promptText.trim()}
                                    className={cn(
                                        "px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center gap-2 transition-all",
                                        activeEngine === 'proposal'
                                            ? "bg-[#39FF14] text-black disabled:bg-zinc-800 disabled:text-zinc-600"
                                            : "bg-[#A855F7] text-white disabled:bg-zinc-800 disabled:text-zinc-600"
                                    )}
                                >
                                    {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    <span>{isBulkMode ? "Process Bulk" : "Generate"}</span>
                                </button>
                            </div>
                        </div>

                        {/* Prompt Suggestions */}
                        <AnimatePresence>
                            {showSuggestions && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 overflow-hidden bg-zinc-950/80 border border-white/5 rounded-2xl p-2"
                                >
                                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 text-[9px] font-black uppercase text-zinc-500 tracking-wider">
                                        <span>Sample Requests</span>
                                        <button onClick={() => setSuggestionCategory(c => (c + 1) % 2)} className="hover:text-white flex items-center gap-1">
                                            <RefreshCw size={8} /> Next
                                        </button>
                                    </div>
                                    <div className="space-y-1 mt-2">
                                        {suggestions.map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { setPromptText(s); setShowSuggestions(false); }}
                                                className="w-full text-left px-3 py-2 rounded-xl text-[11px] text-zinc-400 hover:text-white hover:bg-white/5 transition-all truncate"
                                            >
                                                → {s}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* INTERACTIVE CHAT STREAM */}
                    <div className="p-6 border-b border-white/5 bg-[#080808] flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Interactive refinement stream</span>
                        
                        <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pr-2">
                            {messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={cn(
                                        "max-w-[85%] rounded-3xl p-4 text-[12px] leading-relaxed",
                                        m.sender === 'user'
                                            ? "bg-zinc-800 text-zinc-100 self-end rounded-tr-none"
                                            : "bg-zinc-900/60 border border-white/[0.04] text-zinc-300 self-start rounded-tl-none"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                            {m.sender === 'user' ? 'Client / Admin' : 'Gemini 3.5 Flash'}
                                        </span>
                                    </div>
                                    <div className="leading-relaxed">{renderChatMessage(m.text)}</div>
                                </div>
                            ))}

                            {/* Generating Bubble */}
                            {isGenerating && (
                                <div className="max-w-[85%] rounded-3xl p-4 text-[12px] leading-relaxed self-start rounded-tl-none bg-white/[0.02] border border-white/[0.04] text-zinc-300 flex flex-col gap-2.5 w-[260px] sm:w-[280px]">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={12} className={cn("animate-spin shrink-0", activeEngine === 'proposal' ? "text-[#39FF14]" : "text-[#A855F7]")} />
                                        <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400 flex-1 truncate">
                                            {STAGE_MESSAGES[generationStage]?.text || "Processing..."}
                                        </span>
                                        <span className="text-[9px] font-mono text-zinc-500 font-bold shrink-0">
                                            {generationTime}s
                                        </span>
                                    </div>
                                    <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                                        <div 
                                            className={cn("h-full transition-all duration-500", activeEngine === 'proposal' ? "bg-[#39FF14]" : "bg-[#A855F7]")} 
                                            style={{ width: `${generationProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Interactive Chat Input */}
                        <form onSubmit={handleChatRefinement} className="flex items-center gap-2 mt-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Instruct AI to refine document (e.g. 'Add a confidentiality clause')"
                                className="flex-1 bg-zinc-950 border border-white/5 rounded-2xl px-4 py-2.5 text-[12px] placeholder-zinc-600 outline-none focus:border-white/20 transition-all text-white"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim() || isGenerating}
                                className={cn(
                                    "p-3 rounded-2xl text-black transition-all flex items-center justify-center shrink-0 disabled:opacity-20",
                                    activeEngine === 'proposal' ? "bg-[#39FF14]" : "bg-[#A855F7] text-white"
                                )}
                            >
                                <Send size={12} />
                            </button>
                        </form>
                    </div>

                    {/* Collapsible Forms Section */}
                    <div className="p-6 shrink-0 max-h-[40vh] flex flex-col min-h-0 bg-black/20 overflow-y-auto pb-24">
                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.15em] flex items-center gap-2">
                                <Settings size={12} />
                                Manual Calibration
                            </span>
                        </div>

                        {/* Engine Form switcher */}
                        {activeEngine === 'proposal' ? (
                            // PROPOSAL ENGINE FORMS
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Proposal Local form Tabs */}
                                <div className="flex gap-2 border-b border-white/5 pb-2 mb-4 overflow-x-auto scrollbar-hide shrink-0">
                                    {[
                                        { id: '1', label: 'Identity' },
                                        { id: '2', label: 'Strategy' },
                                        { id: '3', label: 'Scope' },
                                        { id: '4', label: 'Deliverables' },
                                        { id: '5', label: 'Commercials' },
                                        { id: '6', label: 'Settlement' },
                                        { id: '7', label: 'Signatures' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setProposalActiveTab(tab.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                                proposalActiveTab === tab.id
                                                    ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20"
                                                    : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 space-y-6">
                                    {proposalActiveTab === '1' && (
                                        <div className="space-y-4">
                                            <Input label="Client Name" value={activeProposalData.clientName} onChange={(e) => setProposalDataState({ clientName: e.target.value })} placeholder="Client Corporate Name" />
                                            <Input label="Client Address" value={activeProposalData.clientAddress} onChange={(e) => setProposalDataState({ clientAddress: e.target.value })} placeholder="Corporate HQ Location" textarea />
                                            <Input label="Campaign Name" value={activeProposalData.campaignName} onChange={(e) => setProposalDataState({ campaignName: e.target.value })} placeholder="e.g. Neon Horizon Festival" />
                                            <Input label="Campaign Duration" value={activeProposalData.campaignDuration} onChange={(e) => setProposalDataState({ campaignDuration: e.target.value })} placeholder="e.g. 3 Months / Dates" />
                                            <Input label="Proposal Number" value={activeProposalData.proposalNumber} onChange={(e) => setProposalDataState({ proposalNumber: e.target.value })} />
                                            <Input label="Cover Summary" value={activeProposalData.coverDescription} onChange={(e) => setProposalDataState({ coverDescription: e.target.value })} textarea />
                                        </div>
                                    )}

                                    {proposalActiveTab === '2' && (
                                        <div className="space-y-4">
                                            <Input label="Executive Overview" value={activeProposalData.overview} onChange={(e) => setProposalDataState({ overview: e.target.value })} textarea rows={5} />
                                            <Input label="Primary Goal" value={activeProposalData.primaryGoal} onChange={(e) => setProposalDataState({ primaryGoal: e.target.value })} placeholder="Dominant marketing or brand statement..." textarea />
                                        </div>
                                    )}

                                    {proposalActiveTab === '3' && (
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Scope of Work (Markdown)</label>
                                            <StudioRichEditor value={activeProposalData.scopeOfWork} onChange={(val) => setProposalDataState({ scopeOfWork: val })} />
                                        </div>
                                    )}

                                    {proposalActiveTab === '4' && (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-zinc-400">Deliverables List</span><button onClick={() => setProposalDataState(prev => ({ deliverables: [...prev.deliverables, { id: Date.now(), item: '', qty: '1', timeline: '' }] }))} className="p-1 hover:bg-white/10 rounded-lg text-[#39FF14]"><Plus size={14} /></button></div>
                                                {activeProposalData.deliverables.map((d, index) => (
                                                    <div key={d.id} className="flex gap-2 items-center bg-zinc-950 p-3 rounded-2xl border border-white/5">
                                                        <input type="text" value={d.item} onChange={(e) => setProposalDataState(prev => ({ deliverables: prev.deliverables.map((item, idx) => idx === index ? { ...item, item: e.target.value } : item) }))} placeholder="Specification" className="flex-1 bg-transparent border-none text-xs text-white outline-none" />
                                                        <input type="text" value={d.qty} onChange={(e) => setProposalDataState(prev => ({ deliverables: prev.deliverables.map((item, idx) => idx === index ? { ...item, qty: e.target.value } : item) }))} placeholder="Qty" className="w-16 bg-transparent border-none text-xs text-zinc-400 text-center outline-none" />
                                                        <input type="text" value={d.timeline} onChange={(e) => setProposalDataState(prev => ({ deliverables: prev.deliverables.map((item, idx) => idx === index ? { ...item, timeline: e.target.value } : item) }))} placeholder="Timeline" className="w-24 bg-transparent border-none text-xs text-zinc-400 text-right outline-none" />
                                                        <button onClick={() => setProposalDataState(prev => ({ deliverables: prev.deliverables.filter((_, idx) => idx !== index) }))} className="text-red-400 hover:text-red-500"><Trash2 size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-white/5">
                                                <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-zinc-400">Prerequisites</span><button onClick={() => setProposalDataState(prev => ({ clientRequirements: [...prev.clientRequirements, { id: Date.now(), description: '' }] }))} className="p-1 hover:bg-white/10 rounded-lg text-[#39FF14]"><Plus size={14} /></button></div>
                                                {activeProposalData.clientRequirements.map((r, index) => (
                                                    <div key={r.id} className="flex gap-2 items-center bg-zinc-950 p-2 rounded-2xl border border-white/5">
                                                        <input type="text" value={r.description} onChange={(e) => setProposalDataState(prev => ({ clientRequirements: prev.clientRequirements.map((req, idx) => idx === index ? { ...req, description: e.target.value } : req) }))} placeholder="Prerequisite item" className="flex-1 bg-transparent border-none text-xs text-white outline-none" />
                                                        <button onClick={() => setProposalDataState(prev => ({ clientRequirements: prev.clientRequirements.filter((_, idx) => idx !== index) }))} className="text-red-400 hover:text-red-500"><Trash2 size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {proposalActiveTab === '5' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-zinc-400">Line items (Estimated Cost)</span><button onClick={() => setProposalItemsState(prev => [...prev, { id: Date.now(), description: '', qty: 1, unit: 'Phase', price: 0 }])} className="p-1 hover:bg-white/10 rounded-lg text-[#39FF14]"><Plus size={14} /></button></div>
                                            {activeProposalItems.map((item, index) => (
                                                <div key={item.id} className="bg-zinc-950 p-3 border border-white/5 rounded-2xl flex flex-col gap-2">
                                                    <input type="text" value={item.description} onChange={(e) => setProposalItemsState(prev => prev.map((it, idx) => idx === index ? { ...it, description: e.target.value } : it))} placeholder="Description" className="bg-transparent border-none text-xs text-white outline-none w-full" />
                                                    <div className="flex items-center justify-between gap-3 mt-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <input type="number" value={item.qty} onChange={(e) => setProposalItemsState(prev => prev.map((it, idx) => idx === index ? { ...it, qty: Number(e.target.value) } : it))} placeholder="Qty" className="w-16 bg-zinc-900 border border-white/5 text-center text-xs text-zinc-300 rounded-lg py-1 px-2" />
                                                            <input type="text" value={item.unit} onChange={(e) => setProposalItemsState(prev => prev.map((it, idx) => idx === index ? { ...it, unit: e.target.value } : it))} placeholder="Unit" className="w-16 bg-zinc-900 border border-white/5 text-center text-xs text-zinc-300 rounded-lg py-1 px-2" />
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <input type="number" value={item.price} onChange={(e) => setProposalItemsState(prev => prev.map((it, idx) => idx === index ? { ...it, price: Number(e.target.value) } : it))} placeholder="Price" className="w-32 bg-zinc-900 border border-white/5 text-right text-xs text-[#39FF14] font-mono rounded-lg py-1 px-2" />
                                                            <button onClick={() => setProposalItemsState(prev => prev.filter((_, idx) => idx !== index))} className="text-red-400 hover:text-red-500"><Trash2 size={12} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {proposalActiveTab === '6' && (
                                        <div className="space-y-4">
                                            <Input label="Conditions & Terms" value={activeProposalData.terms} onChange={(e) => setProposalDataState({ terms: e.target.value })} textarea rows={4} />
                                            <Input label="Settlement Details" value={activeProposalData.paymentDetails} onChange={(e) => setProposalDataState({ paymentDetails: e.target.value })} textarea rows={4} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="GST Rate (%)" type="number" value={activeProposalData.gstRate} onChange={(e) => setProposalDataState({ gstRate: Number(e.target.value) })} />
                                                <Input label="Advance Requested (%)" type="number" value={activeProposalData.advanceRequested} onChange={(e) => setProposalDataState({ advanceRequested: Number(e.target.value) })} />
                                            </div>
                                            <div className="flex items-center gap-6 mt-4">
                                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-400">
                                                    <input type="checkbox" checked={activeProposalData.showGst} onChange={(e) => setProposalDataState({ showGst: e.target.checked })} className="rounded bg-zinc-900 border-white/5 text-[#39FF14] focus:ring-[#39FF14]" />
                                                    Show GST breakdown
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {proposalActiveTab === '7' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-6">
                                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-400">
                                                    <input type="checkbox" checked={activeProposalData.showSeal} onChange={(e) => setProposalDataState({ showSeal: e.target.checked })} className="rounded bg-zinc-900 border-white/5 text-[#39FF14]" />
                                                    Render Document Seal
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-400">
                                                    <input type="checkbox" checked={activeProposalData.showSignatures} onChange={(e) => setProposalDataState({ showSignatures: e.target.checked })} className="rounded bg-zinc-900 border-white/5 text-[#39FF14]" />
                                                    Show Signatures block
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4">
                                                <button
                                                    onClick={() => { setSigTarget('provider'); setIsSigModalOpen(true); }}
                                                    className="py-3 bg-zinc-900 border border-white/5 hover:border-[#39FF14]/30 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                >
                                                    Sign for Provider
                                                </button>
                                                <button
                                                    onClick={() => { setSigTarget('client'); setIsSigModalOpen(true); }}
                                                    className="py-3 bg-zinc-900 border border-white/5 hover:border-[#39FF14]/30 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                >
                                                    Sign for Client
                                                </button>
                                            </div>
                                            <div className="space-y-3 pt-4 border-t border-white/5">
                                                <Input label="Sender Signatory Name" value={activeProposalData.senderName} onChange={(e) => setProposalDataState({ senderName: e.target.value })} />
                                                <Input label="Sender Designation" value={activeProposalData.senderDesignation} onChange={(e) => setProposalDataState({ senderDesignation: e.target.value })} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // AGREEMENT ENGINE FORMS
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex gap-2 border-b border-white/5 pb-2 mb-4 overflow-x-auto scrollbar-hide shrink-0">
                                    {[
                                        { id: '1', label: 'Entities' },
                                        { id: '2', label: 'Scope' },
                                        { id: '3', label: 'Commercials' },
                                        { id: '4', label: 'Clauses' },
                                        { id: '5', label: 'Execution' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setAgreementActiveTab(tab.id)}
                                            className={cn(
                                                "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                                agreementActiveTab === tab.id
                                                    ? "bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20"
                                                    : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 space-y-6">
                                    {agreementActiveTab === '1' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Agreement No." value={agreementFormData.agreementNumber} onChange={(e) => updateAgreementField('agreementNumber', e.target.value)} />
                                                <Input label="Template Type" value={agreementFormData.template} onChange={(e) => updateAgreementField('template', e.target.value)} />
                                            </div>
                                            <div className="space-y-3 pt-2 border-t border-white/5">
                                                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Party 1 (Provider)</p>
                                                <Input label="Name" value={agreementFormData.parties.firstParty.name} onChange={(e) => updateAgreementField('parties.firstParty.name', e.target.value)} />
                                                <Input label="Address" value={agreementFormData.parties.firstParty.address} onChange={(e) => updateAgreementField('parties.firstParty.address', e.target.value)} textarea />
                                            </div>
                                            <div className="space-y-3 pt-2 border-t border-white/5">
                                                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Party 2 (Client)</p>
                                                <Input label="Name" value={agreementFormData.parties.secondParty.name} onChange={(e) => updateAgreementField('parties.secondParty.name', e.target.value)} />
                                                <Input label="Address" value={agreementFormData.parties.secondParty.address} onChange={(e) => updateAgreementField('parties.secondParty.address', e.target.value)} textarea />
                                            </div>
                                        </div>
                                    )}

                                    {agreementActiveTab === '2' && (
                                        <div className="space-y-4">
                                            <Input label="Project Name" value={agreementFormData.details.projectName} onChange={(e) => updateAgreementField('details.projectName', e.target.value)} />
                                            <Input label="Agreement Purpose" value={agreementFormData.details.purpose} onChange={(e) => updateAgreementField('details.purpose', e.target.value)} textarea rows={6} />
                                        </div>
                                    )}

                                    {agreementActiveTab === '3' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="Contract Value" value={agreementFormData.commercials.totalValue} onChange={(e) => updateAgreementField('commercials.totalValue', e.target.value)} />
                                                <Input label="Currency" value={agreementFormData.commercials.currency} onChange={(e) => updateAgreementField('commercials.currency', e.target.value)} />
                                            </div>
                                            <Input label="Payment Schedule" value={agreementFormData.commercials.paymentSchedule} onChange={(e) => updateAgreementField('commercials.paymentSchedule', e.target.value)} textarea rows={4} />
                                        </div>
                                    )}

                                    {agreementActiveTab === '4' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black uppercase text-zinc-400">Legal Clauses</span>
                                                <button onClick={() => addAgreementCustomClause('New Custom Clause', 'Clause terms details go here.')} className="p-1 hover:bg-white/10 rounded-lg text-[#A855F7]"><Plus size={14} /></button>
                                            </div>

                                            {/* Clause List */}
                                            <div className="space-y-3">
                                                {agreementFormData.clauses.map((clause) => (
                                                    <div key={clause.id} className="bg-zinc-950 p-3 rounded-2xl border border-white/5 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <input
                                                                type="text"
                                                                value={clause.title}
                                                                onChange={(e) => updateAgreementClause(clause.id, { title: e.target.value })}
                                                                className="bg-transparent border-none text-xs font-black text-white outline-none flex-1"
                                                            />
                                                            <button onClick={() => removeAgreementClause(clause.id)} className="text-red-400 hover:text-red-500"><Trash2 size={12} /></button>
                                                        </div>
                                                        <textarea
                                                            value={clause.content}
                                                            onChange={(e) => updateAgreementClause(clause.id, { content: e.target.value })}
                                                            className="w-full bg-zinc-900 border border-white/5 rounded-xl p-2 text-xs text-zinc-400 outline-none h-20 resize-none leading-relaxed"
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Standard clauses marketplace integration */}
                                            <div className="pt-4 border-t border-white/5">
                                                <p className="text-[10px] font-black uppercase text-zinc-500 mb-2">Clause Library Additions</p>
                                                <ClauseMarketplace activeClauses={agreementFormData.clauses} onToggleClause={toggleAgreementClause} />
                                            </div>
                                        </div>
                                    )}

                                    {agreementActiveTab === '5' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-6">
                                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-400">
                                                    <input type="checkbox" checked={agreementFormData.showSeal} onChange={(e) => updateAgreementField('showSeal', e.target.checked)} className="rounded bg-zinc-900 border-white/5 text-[#A855F7]" />
                                                    Render Document Seal
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-400">
                                                    <input type="checkbox" checked={agreementFormData.showSignatures} onChange={(e) => updateAgreementField('showSignatures', e.target.checked)} className="rounded bg-zinc-900 border-white/5 text-[#A855F7]" />
                                                    Show Signatures block
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4">
                                                <button
                                                    onClick={() => { setSigTarget('provider'); setIsSigModalOpen(true); }}
                                                    className="py-3 bg-zinc-900 border border-white/5 hover:border-[#A855F7]/30 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                >
                                                    Sign for Provider
                                                </button>
                                                <button
                                                    onClick={() => { setSigTarget('client'); setIsSigModalOpen(true); }}
                                                    className="py-3 bg-zinc-900 border border-white/5 hover:border-[#A855F7]/30 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                >
                                                    Sign for Client
                                                </button>
                                            </div>
                                            <div className="space-y-3 pt-4 border-t border-white/5">
                                                <Input label="Provider Signatory Name" value={agreementFormData.providerName} onChange={(e) => updateAgreementField('providerName', e.target.value)} />
                                                <Input label="Provider Designation" value={agreementFormData.providerDesignation} onChange={(e) => updateAgreementField('providerDesignation', e.target.value)} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN (INTERACTIVE A4 PREVIEW) */}
                <div className="hidden lg:flex flex-1 bg-zinc-900/30 flex-col overflow-y-auto min-h-0 relative items-center justify-start p-10 scrollbar-hide" ref={previewContainerRef}>
                    
                    {/* Floating Zoom & Page indicators */}
                    <div className="absolute top-4 right-4 z-40 bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/5 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                            <button onClick={() => setUserZoom(z => Math.max(0.5, z - 0.05))} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white"><Minus size={12} /></button>
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300 font-mono">{Math.round(userZoom * 100)}%</span>
                            <button onClick={() => setUserZoom(z => Math.min(1.5, z + 0.05))} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white"><Plus size={12} /></button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPreviewPage(p => Math.max(0, p - 1))} disabled={currentPreviewPage === 0} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white disabled:opacity-20"><ChevronLeft size={14} /></button>
                            <span className={cn("text-[10px] font-black font-mono", activeEngine === 'proposal' ? "text-[#39FF14]" : "text-[#A855F7]")}>{currentPreviewPage + 1} / {paginatedPages.length}</span>
                            <button onClick={() => setCurrentPreviewPage(p => Math.min(paginatedPages.length - 1, p + 1))} disabled={currentPreviewPage === paginatedPages.length - 1} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white disabled:opacity-20"><ChevronRight size={14} /></button>
                        </div>
                    </div>

                    {/* Scale Wrapper to fit A4 container */}
                    <div style={{ width: '794px', height: '1123px', position: 'relative', shrink: 0 }}>
                        <div style={{
                            width: '794px',
                            height: '1123px',
                            transform: `scale(${previewScale})`,
                            transformOrigin: 'top left',
                            position: 'absolute',
                            top: 0,
                            left: 0
                        }}>
                            {activeEngine === 'proposal' ? (
                                // PROPOSAL PREVIEW RENDERER
                                <AnimatePresence mode="wait">
                                    <motion.div key={currentPreviewPage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[15mm] shadow-2xl rounded-[2px] overflow-hidden">
                                        <div className={cn("flex justify-between items-end mb-8 pb-4 border-b-2 border-black", currentPreviewPage > 0 && "mb-4 pb-2 opacity-40 border-gray-200")}>
                                            <img src={currentLogo.path} alt="Logo" className={cn("h-16 w-auto object-contain", currentPreviewPage > 0 && "h-8")} crossOrigin="anonymous" />
                                            <div className="text-right space-y-3">
                                                <div><h4 className={cn("text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0", currentPreviewPage > 0 && "text-[7px]")}>Quotation</h4><p className={cn("text-lg font-black text-black tracking-widest font-mono", currentPreviewPage > 0 && "text-sm")}>{activeProposalData.proposalNumber}</p></div>
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
                                                            <div className="space-y-6 min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug break-words">{activeProposalData.clientName || 'Valued Partner'}</h2><p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{activeProposalData.clientAddress || 'Client Address'}</p></div></div>
                                                            <div className="space-y-6 text-right min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Project Details</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug italic break-words">{activeProposalData.campaignName || 'Project Title'}</h2><p className="text-[12px] font-black text-neon-green bg-black px-3 py-1 inline-block uppercase tracking-widest">Period: {activeProposalData.campaignDuration || 'TBD'}</p></div></div>
                                                        </div>
                                                        <div className="pt-16 space-y-10">
                                                            <div className="flex items-center gap-4"><div className="w-12 h-1 bg-black" /><p className="text-[11px] font-black uppercase tracking-[0.6em]">Project Overview</p></div>
                                                            <div className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl">{renderContent(activeProposalData.coverDescription || 'Cover description pending...')}</div>
                                                        </div>
                                                        <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{activeProposalData.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Business Proposal</p></div></div>
                                                    </div>
                                                )}
                                                {paginatedPages[currentPreviewPage]?.type === 'strategy' && (
                                                    <div className="space-y-12 py-10 px-4">
                                                        <div className="border-l-4 border-black pl-8"><h3 className="text-3xl font-black text-black tracking-tighter leading-none italic">Architecture.</h3></div>
                                                        <div className="text-[14px] leading-[1.8] text-gray-700 font-medium text-justify">{renderContent(activeProposalData.overview || 'Strategic framework pending...', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}</div>
                                                        {activeProposalData.primaryGoal && (
                                                            <div className="pt-16 p-12 bg-zinc-50 border border-gray-100 rounded-3xl space-y-6">
                                                                <div className="flex items-center gap-4"><div className="w-12 h-[2px] bg-black" /><p className="text-[10px] font-black text-black uppercase tracking-[0.4em]">Project Details</p></div>
                                                                <div className="text-2xl font-black text-black leading-tight italic tracking-tight">{renderContent(activeProposalData.primaryGoal)}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {paginatedPages[currentPreviewPage]?.type === 'scope' && (
                                                    <div className="h-full flex flex-col py-10 px-4">
                                                        {!activeProposalData.isBulkGenerated && (
                                                            <div className="mb-16 border-l-4 border-black pl-8">
                                                                <h3 className="text-3xl font-black text-black tracking-tighter leading-none italic">Scope of Work.</h3>
                                                            </div>
                                                        )}
                                                        <div className="flex-1"><div className="pl-0">{renderContent(paginatedPages[currentPreviewPage]?.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}</div></div>
                                                    </div>
                                                )}
                                                {paginatedPages[currentPreviewPage]?.type === 'proposal' && (
                                                    <div className="space-y-12 py-10 px-4">
                                                        <div className="mb-16 border-l-4 border-black pl-8"><h3 className="text-3xl font-black text-black tracking-tighter leading-none italic">Deliverables.</h3></div>
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="border-b-4 border-black text-[10px] font-black uppercase text-black tracking-[0.3em]"><th className="py-6 pr-4">Specification</th><th className="py-6 px-4 text-center w-32">Volume</th><th className="py-6 pl-4 text-right w-40">Timeline</th></tr>
                                                            </thead>
                                                            <tbody className="divide-y-2 divide-gray-100">
                                                                {activeProposalData.deliverables.filter(d => d.item).map((d, i) => (
                                                                    <tr key={d.id}>
                                                                        <td className="py-8 pr-4"><p className="text-[15px] font-black text-black mb-1 uppercase tracking-tight">{d.item}</p><p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Spec ID: {String(i+1).padStart(3, '0')}</p></td>
                                                                        <td className="py-8 px-4 text-center text-[14px] font-black text-gray-500">{d.qty || '—'}</td>
                                                                        <td className="py-8 pl-4 text-right text-[11px] font-black text-black uppercase tracking-widest bg-zinc-50/50">{d.timeline || '—'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        {activeProposalData.clientRequirements?.length > 0 && (
                                                            <div className="pt-8 border-t border-gray-100">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Prerequisites</p>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {activeProposalData.clientRequirements.filter(r => r.description).map((r) => (
                                                                        <div key={r.id} className="flex items-start gap-3 p-4 bg-zinc-50 rounded-lg"><span className="w-1.5 h-1.5 bg-[#39FF14] rounded-full mt-1.5 shrink-0" /><p className="text-[12px] font-bold text-black leading-tight">{r.description}</p></div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {paginatedPages[currentPreviewPage]?.type === 'table' && (
                                                    <div className="space-y-12 py-6">
                                                        <div className="mb-16 border-l-4 border-black pl-8">
                                                            <h3 className="text-3xl font-black text-black tracking-tighter leading-none italic">Commercials.</h3>
                                                        </div>
                                                        <table className="w-full text-left">
                                                            <thead><tr className="border-b-2 border-black text-[10px] font-black uppercase text-black tracking-widest"><th className="py-4 pr-4">Description</th><th className="py-4 px-4 text-center w-24">Qty</th><th className="py-4 pl-4 text-right w-48">Value (INR)</th></tr></thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {paginatedPages[currentPreviewPage].items.map((item, i) => (
                                                                    <tr key={i}><td className="py-6 pr-4 text-[13px] font-bold text-black">{item.description}</td><td className="py-6 px-4 text-center text-[12px] font-bold text-gray-500">{item.qty}</td><td className="py-6 pl-4 text-right text-[13px] font-black tracking-widest text-black font-mono">₹{item.price.toLocaleString()}</td></tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                                {paginatedPages[currentPreviewPage]?.type === 'commercials' && (() => {
                                                    const isFieldHidden = (f) => (activeProposalData.hiddenFields || []).includes(f);
                                                    return (
                                                        <div className="space-y-10 py-8 flex flex-col h-full justify-between">
                                                            {/* Row 1: Terms, Payment details & Totals */}
                                                            <div className="grid grid-cols-2 gap-8 items-start">
                                                                {/* Terms & Payment info */}
                                                                <div className="space-y-4">
                                                                    {!isFieldHidden('terms') && (
                                                                        <div className="space-y-2">
                                                                            <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-1">General Terms</h4>
                                                                            <div className="text-[11px] font-semibold text-gray-600 leading-relaxed">{renderContent(activeProposalData.terms)}</div>
                                                                        </div>
                                                                    )}
                                                                    {!isFieldHidden('paymentDetails') && (
                                                                        <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Payment Information</p>
                                                                            <div className="text-[11px] font-semibold font-mono text-black leading-relaxed">{renderContent(activeProposalData.paymentDetails)}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Totals, GST, Advance Requirement */}
                                                                <div className="space-y-4">
                                                                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-1">Financial Settlement</h4>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col justify-center"><span className="text-[8px] font-black text-gray-400 uppercase">Net Value</span><span className="text-sm font-bold text-black font-mono">₹{proposalSubtotal.toLocaleString()}</span></div>
                                                                        {activeProposalData.showGst ? (
                                                                            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col justify-center"><span className="text-[8px] font-black text-gray-400 uppercase">GST ({activeProposalData.gstRate}%)</span><span className="text-sm font-bold text-black font-mono">₹{proposalGstAmount.toLocaleString()}</span></div>
                                                                        ) : (
                                                                            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col justify-center"><span className="text-[8px] font-black text-gray-400 uppercase">GST</span><span className="text-sm font-bold text-gray-400 font-mono">Exempt</span></div>
                                                                        )}
                                                                    </div>
                                                                    <div className="p-5 bg-black text-right relative overflow-hidden rounded-2xl shadow-lg"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Quotation Value</p><h2 className="text-2xl font-black tracking-tighter text-white font-mono leading-none">₹{proposalTotalAmount.toLocaleString()}</h2><div className="absolute top-0 right-0 w-1.5 h-full bg-neon-green" /></div>
                                                                    {(activeProposalData.advanceRequested > 0) && (
                                                                        <div className="p-4 bg-neon-green/5 border-2 border-dashed border-neon-green/20 rounded-2xl flex items-center justify-between">
                                                                            <div>
                                                                                <span className="text-[8px] font-black text-gray-400 tracking-widest block uppercase">Advance Required ({activeProposalData.advanceRequested}%)</span>
                                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Prior to commencement</span>
                                                                            </div>
                                                                            <span className="text-lg font-black text-black font-mono">₹{(proposalTotalAmount * (activeProposalData.advanceRequested || 50) / 100).toLocaleString()}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Row 2: Collapsible Signatures, Stamp & Footprints */}
                                                            {currentPreviewPage === paginatedPages.length - 1 && !isFieldHidden('signatures') && (
                                                                <div className="border border-gray-200 rounded-2xl overflow-hidden mt-4 bg-white">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => setIsSignaturesCollapsed(!isSignaturesCollapsed)}
                                                                        className="w-full px-5 py-3 bg-gray-50 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-black border-b border-gray-200 no-print"
                                                                    >
                                                                        <span className="flex items-center gap-2"><ShieldCheck size={14} /> Authorization Signatures & Verification</span>
                                                                        <span className="text-neon-green">{isSignaturesCollapsed ? 'Expand +' : 'Collapse -'}</span>
                                                                    </button>
                                                                    
                                                                    <div className={cn(
                                                                        "transition-all duration-300", 
                                                                        (!isSignaturesCollapsed || isSaving) ? "max-h-[1000px] opacity-100 p-5" : "max-h-0 opacity-0 pointer-events-none no-print",
                                                                        "print-visible"
                                                                    )}>
                                                                        <div className="relative">
                                                                            <div className="grid grid-cols-2 gap-8 relative z-20">
                                                                                <div className="space-y-4">
                                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">For Newbi Entertainment</p>
                                                                                    <div className="h-16 flex items-end">
                                                                                        {activeProposalData.providerSignature ? (
                                                                                            <img src={activeProposalData.providerSignature} alt="Provider Signature" className="h-full object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                                                        ) : (
                                                                                            <p className="text-2xl font-signature text-black leading-none italic opacity-60">{activeProposalData.senderName || 'Authorized Signatory'}</p>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="space-y-0.5">
                                                                                        <p className="text-[10px] font-black uppercase text-black">{activeProposalData.senderName || 'Authorized Signatory'}</p>
                                                                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">{activeProposalData.senderDesignation || 'Director of Operations'}</p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="space-y-4 text-right">
                                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">For {activeProposalData.clientName || 'Valued Partner'}</p>
                                                                                    <div className="h-16 flex items-end justify-end">
                                                                                        {activeProposalData.clientSignature ? (
                                                                                            <img src={activeProposalData.clientSignature} alt="Client Signature" className="h-full object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                                                        ) : (
                                                                                            <p className="text-2xl font-signature text-black leading-none italic opacity-30">Type name to sign</p>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-[10px] font-black uppercase text-black">Acknowledged & Accepted</p>
                                                                                </div>
                                                                            </div>

                                                                            {activeProposalData.showSeal && (
                                                                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-80 mix-blend-multiply">
                                                                                    <DocumentSeal className="w-28 h-28" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="mt-auto pt-8 pb-10 border-t border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">
                                            <p>Newbi Entertainment ©</p>
                                            <p className="text-black">Page {currentPreviewPage + 1} of {paginatedPages.length}</p>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            ) : (
                                // AGREEMENT PREVIEW RENDERER
                                <ContractPreview
                                    formData={agreementFormData}
                                    paginatedPages={agreementPaginatedPages}
                                    currentPage={currentPreviewPage}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* HIDDEN RENDER CONTAINER FOR EXPORTING HIGHER QUALITY PDFS */}
            <div className="pdf-export-only fixed -left-[9999px] top-0 pointer-events-none overflow-hidden bg-white">
                {activeEngine === 'proposal' ? (
                    proposalPaginatedPages.map((page, idx) => (
                        <div key={idx} className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[15mm] mb-10">
                            <div className={cn("flex justify-between items-end mb-8 pb-4 border-b-2 border-black", idx > 0 && "mb-4 pb-2 opacity-40 border-gray-200")}>
                                <img src={currentLogo.path} alt="Logo" className={cn("h-16 w-auto object-contain", idx > 0 && "h-8")} crossOrigin="anonymous" />
                                <div className="text-right space-y-3">
                                    <div><h4 className={cn("text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0", idx > 0 && "text-[7px]")}>Quotation</h4><p className={cn("text-lg font-black text-black tracking-widest font-mono", idx > 0 && "text-sm")}>{activeProposalData.proposalNumber}</p></div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <div className="absolute inset-0 flex flex-col px-1">
                                    {page.type === 'cover' && (
                                        <div className="h-full flex flex-col justify-start space-y-20 py-8">
                                            <div className="grid grid-cols-2 gap-10">
                                                <div className="space-y-6 min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug break-words">{activeProposalData.clientName || 'Valued Partner'}</h2><p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{activeProposalData.clientAddress || 'Client Address'}</p></div></div>
                                                <div className="space-y-6 text-right min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Project Details</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug italic break-words">{activeProposalData.campaignName || 'Project Title'}</h2><p className="text-[12px] font-black text-neon-green bg-black px-3 py-1 inline-block uppercase tracking-widest">Period: {activeProposalData.campaignDuration || 'TBD'}</p></div></div>
                                            </div>
                                            <div className="pt-16 space-y-10">
                                                <div className="flex items-center gap-4"><div className="w-12 h-1 bg-black" /><p className="text-[11px] font-black uppercase tracking-[0.6em]">Project Overview</p></div>
                                                <div className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl">{renderContent(activeProposalData.coverDescription || 'Cover description pending...')}</div>
                                            </div>
                                        </div>
                                    )}
                                    {page.type === 'strategy' && (
                                        <div className="space-y-12 py-10 px-4">
                                            <div className="space-y-2 border-l-4 border-black pl-8"><p className="text-[10px] font-black text-neon-green uppercase tracking-[0.5em]">Strategic Context</p><h3 className="text-5xl font-black text-black tracking-tighter uppercase leading-none">Architecture.</h3></div>
                                            <div className="text-[14px] leading-[1.8] text-gray-700 font-medium text-justify">{renderContent(activeProposalData.overview || 'Strategic framework pending...')}</div>
                                        </div>
                                    )}
                                    {page.type === 'scope' && (
                                        <div className="h-full flex flex-col py-10 px-4">
                                            <div className="flex-1"><div className="pl-0">{renderContent(page.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}</div></div>
                                        </div>
                                    )}
                                    {page.type === 'proposal' && (
                                        <div className="space-y-12 py-10 px-4">
                                            <table className="w-full text-left">
                                                <thead><tr className="border-b-4 border-black text-[10px] font-black uppercase text-black tracking-[0.3em]"><th className="py-6 pr-4">Specification</th><th className="py-6 px-4 text-center w-32">Volume</th><th className="py-6 pl-4 text-right w-40">Timeline</th></tr></thead>
                                                <tbody className="divide-y-2 divide-gray-100">
                                                    {activeProposalData.deliverables.filter(d => d.item).map((d, i) => (
                                                        <tr key={d.id}>
                                                            <td className="py-8 pr-4"><p className="text-[15px] font-black text-black mb-1 uppercase tracking-tight">{d.item}</p></td>
                                                            <td className="py-8 px-4 text-center text-[14px] font-black text-gray-500">{d.qty || '—'}</td>
                                                            <td className="py-8 pl-4 text-right text-[11px] font-black text-black uppercase tracking-widest bg-zinc-50/50">{d.timeline || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {page.type === 'table' && (
                                        <div className="space-y-12 py-6">
                                            <table className="w-full text-left">
                                                <thead><tr className="border-b-2 border-black text-[10px] font-black uppercase text-black tracking-widest"><th className="py-4 pr-4">Description</th><th className="py-4 px-4 text-center w-24">Qty</th><th className="py-4 pl-4 text-right w-48">Value (INR)</th></tr></thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {page.items.map((item, i) => (
                                                        <tr key={i}><td className="py-6 pr-4 text-[13px] font-bold text-black">{item.description}</td><td className="py-6 px-4 text-center text-[12px] font-bold text-gray-500">{item.qty}</td><td className="py-6 pl-4 text-right text-[13px] font-black tracking-widest text-black font-mono">₹{item.price.toLocaleString()}</td></tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {page.type === 'commercials' && (() => {
                                        const isFieldHidden = (f) => (activeProposalData.hiddenFields || []).includes(f);
                                        return (
                                            <div className="space-y-10 py-8 flex flex-col h-full justify-between">
                                                {/* Row 1: Terms, Payment details & Totals */}
                                                <div className="grid grid-cols-2 gap-8 items-start">
                                                    {/* Terms & Payment info */}
                                                    <div className="space-y-4">
                                                        {!isFieldHidden('terms') && (
                                                            <div className="space-y-2">
                                                                <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-1">General Terms</h4>
                                                                <div className="text-[11px] font-semibold text-gray-600 leading-relaxed">{renderContent(activeProposalData.terms)}</div>
                                                            </div>
                                                        )}
                                                        {!isFieldHidden('paymentDetails') && (
                                                            <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Payment Information</p>
                                                                <div className="text-[11px] font-semibold font-mono text-black leading-relaxed">{renderContent(activeProposalData.paymentDetails)}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Totals, GST, Advance Requirement */}
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-1">Financial Settlement</h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col justify-center"><span className="text-[8px] font-black text-gray-400 uppercase">Net Value</span><span className="text-sm font-bold text-black font-mono">₹{proposalSubtotal.toLocaleString()}</span></div>
                                                            {activeProposalData.showGst ? (
                                                                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col justify-center"><span className="text-[8px] font-black text-gray-400 uppercase">GST ({activeProposalData.gstRate}%)</span><span className="text-sm font-bold text-black font-mono">₹{proposalGstAmount.toLocaleString()}</span></div>
                                                            ) : (
                                                                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col justify-center"><span className="text-[8px] font-black text-gray-400 uppercase">GST</span><span className="text-sm font-bold text-gray-400 font-mono">Exempt</span></div>
                                                            )}
                                                        </div>
                                                        <div className="p-5 bg-black text-right relative overflow-hidden rounded-2xl shadow-lg"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Quotation Value</p><h2 className="text-2xl font-black tracking-tighter text-white font-mono leading-none">₹{proposalTotalAmount.toLocaleString()}</h2><div className="absolute top-0 right-0 w-1.5 h-full bg-neon-green" /></div>
                                                        {(activeProposalData.advanceRequested > 0) && (
                                                            <div className="p-4 bg-neon-green/5 border-2 border-dashed border-neon-green/20 rounded-2xl flex items-center justify-between">
                                                                <div>
                                                                    <span className="text-[8px] font-black text-gray-400 tracking-widest block uppercase">Advance Required ({activeProposalData.advanceRequested}%)</span>
                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Prior to commencement</span>
                                                                </div>
                                                                <span className="text-lg font-black text-black font-mono">₹{(proposalTotalAmount * (activeProposalData.advanceRequested || 50) / 100).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Row 2: Signatures (always expanded in PDF export) */}
                                                {!isFieldHidden('signatures') && (
                                                    <div className="border border-gray-200 rounded-2xl overflow-hidden mt-4 bg-white p-5">
                                                        <div className="relative">
                                                            <div className="grid grid-cols-2 gap-8 relative z-20">
                                                                <div className="space-y-4">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">For Newbi Entertainment</p>
                                                                    <div className="h-16 flex items-end">
                                                                        {activeProposalData.providerSignature ? (
                                                                            <img src={activeProposalData.providerSignature} alt="Provider Signature" className="h-full object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                                        ) : (
                                                                            <p className="text-2xl font-signature text-black leading-none italic opacity-60">{activeProposalData.senderName || 'Authorized Signatory'}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[10px] font-black uppercase text-black">{activeProposalData.senderName || 'Authorized Signatory'}</p>
                                                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">{activeProposalData.senderDesignation || 'Director of Operations'}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4 text-right">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">For {activeProposalData.clientName || 'Valued Partner'}</p>
                                                                    <div className="h-16 flex items-end justify-end">
                                                                        {activeProposalData.clientSignature ? (
                                                                            <img src={activeProposalData.clientSignature} alt="Client Signature" className="h-full object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                                        ) : (
                                                                            <p className="text-2xl font-signature text-black leading-none italic opacity-30">Type name to sign</p>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] font-black uppercase text-black">Acknowledged & Accepted</p>
                                                                </div>
                                                            </div>

                                                            {activeProposalData.showSeal && (
                                                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-80 mix-blend-multiply">
                                                                    <DocumentSeal className="w-28 h-28" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    agreementPaginatedPages.map((page, idx) => (
                        <div key={idx} className="agreement-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[25mm] rounded-[1px] font-formal border-[0.5px] border-black/10 shrink-0">
                            {/* Renders exact full agreement PDF pages */}
                            <div className="flex justify-between items-end mb-8 pb-3 relative z-10">
                                <img src={agreementFormData.selectedLogo === 'marketing' ? '/logo_marketing.png' : '/logo_document.png'} alt="Logo" className="h-8 w-auto object-contain grayscale opacity-80" crossOrigin="anonymous" />
                                <div className="flex items-center gap-6 text-right">
                                    <div className="space-y-0.5"><span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest block">Agreement ID</span><span className="text-[10px] font-bold text-black tracking-widest block">{agreementFormData.agreementNumber}</span></div>
                                </div>
                            </div>
                            <div className="flex-1 relative z-10 flex flex-col px-2">
                                {page.type === 'intro' && (
                                    <div className="space-y-8">
                                        <div className="text-center py-8"><h1 className="text-3xl font-bold uppercase tracking-widest text-black underline underline-offset-8">{(agreementFormData.template || 'Service Agreement').toUpperCase()}</h1></div>
                                        <div className="space-y-8 text-[12px] leading-relaxed text-justify">
                                            <p className="font-bold border-b border-black/5 pb-2">This {(agreementFormData.template || 'SERVICE AGREEMENT').toUpperCase()} (the "Agreement") is entered into as of {new Date(agreementFormData.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
                                            <div className="space-y-1"><p><span className="font-bold uppercase">{agreementFormData.parties.firstParty.name}</span> (the <span className="font-bold">"{agreementFormData.parties.firstParty.role || 'Provider'}"</span>);</p></div>
                                            <div className="space-y-1"><p><span className="font-bold uppercase">{agreementFormData.parties.secondParty.name || '[Client Name]'}</span> (the <span className="font-bold">"{agreementFormData.parties.secondParty.role || 'Client'}"</span>).</p></div>
                                        </div>
                                    </div>
                                )}
                                {page.type === 'mission' && (
                                    <div className="space-y-8 py-4">
                                        <div className="space-y-2 border-b border-black pb-2"><h3 className="text-base font-bold uppercase tracking-widest text-black">1. Scope of Engagement</h3></div>
                                        <div className="text-[12px] leading-relaxed text-black text-justify px-4">{renderFormatted(agreementFormData.details.purpose)}</div>
                                    </div>
                                )}
                                {page.type === 'commercials' && (
                                    <div className="space-y-12 py-4">
                                        <div className="space-y-2 border-b border-black pb-2"><h3 className="text-base font-bold uppercase tracking-widest text-black">2. Consideration and Payment</h3></div>
                                        <div className="space-y-10 mt-8 px-4">
                                            <div className="border border-black p-8 text-center bg-gray-50/50"><h2 className="text-4xl font-bold tracking-tight text-black">{agreementFormData.commercials.currency} {agreementFormData.commercials.totalValue || '0.00'}</h2></div>
                                            <div className="pl-8">{renderFormatted(agreementFormData.commercials.paymentSchedule)}</div>
                                        </div>
                                    </div>
                                )}
                                {page.type === 'clauses' && (
                                    <div className="space-y-8 py-4">
                                        <div className="space-y-2 border-b border-black pb-2"><h3 className="text-base font-bold uppercase tracking-widest text-black">3. Terms and Conditions</h3></div>
                                        <div className="space-y-8 mt-6 px-4">
                                            {(page.items || []).map((clause, idx) => (
                                                <div key={clause.id} className="space-y-3">
                                                    <p className="text-[11px] font-bold text-black uppercase tracking-widest">3.{(idx + 1 + (page.pageIndex - 1) * 3).toString().padStart(2, '0')} {clause.title}</p>
                                                    <div className="text-[12px] leading-relaxed text-black text-justify pl-8 border-l border-black/5">{renderFormatted(clause.content)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {page.type === 'execution' && (
                                    <div className="h-full flex flex-col py-4">
                                        <div className="grid grid-cols-2 gap-20 mt-12">
                                            <div>
                                                <div className="h-20 flex items-end">
                                                    {agreementFormData.showSignatures && agreementFormData.providerSignature && (
                                                        <img src={agreementFormData.providerSignature} className="h-full object-contain grayscale" alt="Provider Sig" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-bold uppercase mt-4">{agreementFormData.providerName}</p>
                                            </div>
                                            <div>
                                                <div className="h-20 flex items-end">
                                                    {agreementFormData.showSignatures && agreementFormData.clientSignature && (
                                                        <img src={agreementFormData.clientSignature} className="h-full object-contain grayscale" alt="Client Sig" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-bold uppercase mt-4">{agreementFormData.parties.secondParty.name || 'Client'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Signature Pad Modal Overlay */}
            <SignatureModal isOpen={isSigModalOpen} onClose={() => setIsSigModalOpen(false)} onSave={handleSigSave} title={sigTarget === 'provider' ? 'Provider Authentication Seal' : 'Client Execution Seal'} />
        </div>
    );
};

export default AIStudio;
