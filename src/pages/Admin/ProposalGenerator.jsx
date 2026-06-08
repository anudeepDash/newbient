import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
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
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Check from 'lucide-react/dist/esm/icons/check';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Maximize2 from 'lucide-react/dist/esm/icons/maximize-2';
import Minimize2 from 'lucide-react/dist/esm/icons/minimize-2';

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
import StudioRichEditor, { MultiPageRichEditor } from '../../components/ui/StudioRichEditor';
import { generateFullDocument, reviseDocument, refineFieldContent } from '../../lib/ai';
import DocumentSeal from '../../components/ui/DocumentSeal';

// Markdown-like formatting toolbar for textareas — defined outside to prevent remount on parent re-render

    // Render markdown-formatted text into styled JSX for the document preview
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
        const regex = /<(p|div|ul|ol|h[1-6])\b[^>]*?>([\s\S]*?)<\/\1>/gi;
        const blocks = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            blocks.push(match[0]);
        }
        if (blocks.length === 0) return [html];
        return blocks;
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

const estimateBlockHeight = (rawText) => {
    if (!rawText) return 0;
    const isHtml = rawText.includes('<') && rawText.includes('>');
    
    const estimateTextNodeHeight = (text) => {
        if (!text) return 0;
        const paragraphs = text.split('\n');
        let h = 0;
        paragraphs.forEach(p => {
            const trimmed = p.trim();
            if (!trimmed) {
                h += 28; // Empty paragraph height (1.2rem + margin)
            } else if (trimmed.match(/^[-*_]{3,}$/)) {
                h += 40; // Horizontal rule
            } else {
                const headingMatch = trimmed.match(/^(#{1,6})(?:\s|&nbsp;|\u00a0)+(.*)$/);
                if (headingMatch) {
                    const level = headingMatch[1].length;
                    const hText = headingMatch[2];
                    const lineCount = Math.max(1, Math.ceil(hText.length / 85));
                    h += level <= 2 ? (lineCount * 22 + 28) : (lineCount * 18 + 16);
                } else if (trimmed.match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
                    const liText = trimmed.replace(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/, '');
                    const lineCount = Math.max(1, Math.ceil(liText.length / 90));
                    h += (lineCount * 20) + 4;
                } else {
                    const lineCount = Math.max(1, Math.ceil(trimmed.length / 95));
                    h += (lineCount * 21) + 8;
                }
            }
        });
        return h;
    };

    if (!isHtml) {
        return estimateTextNodeHeight(rawText);
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${rawText}</div>`, 'text/html');
        const container = doc.body.firstElementChild || doc.body;
        let totalH = 0;

        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text) {
                    totalH += estimateTextNodeHeight(text);
                }
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) return;

            const tag = node.tagName.toLowerCase();
            if (tag === 'p' || tag === 'div') {
                const html = node.innerHTML.trim();
                if (!html || html === '<br>' || html === '<br/>' || html === '<br />') {
                    totalH += 28;
                } else {
                    const parts = html.split(/<br\s*\/?>/gi);
                    parts.forEach((part, partIdx) => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = part;
                        const text = tempDiv.textContent.trim();
                        if (text) {
                            const lineCount = Math.max(1, Math.ceil(text.length / 95));
                            totalH += (lineCount * 21);
                        } else {
                            if (partIdx > 0 || parts.length > 1) {
                                totalH += 21; // Empty line via br
                            }
                        }
                    });
                    totalH += 8; // Margin bottom
                }
            } else if (tag.startsWith('h') && tag.length === 2) {
                const level = parseInt(tag.substring(1)) || 2;
                const text = node.textContent.trim();
                const lineCount = Math.max(1, Math.ceil(text.length / 85));
                totalH += level <= 2 ? (lineCount * 22 + 28) : (lineCount * 18 + 16);
            } else if (tag === 'ul' || tag === 'ol') {
                totalH += 12; // Wrapper margin
                const lis = node.querySelectorAll('li');
                if (lis.length > 0) {
                    lis.forEach(li => {
                        const liText = li.textContent.trim();
                        const lineCount = Math.max(1, Math.ceil(liText.length / 90));
                        totalH += (lineCount * 20) + 4;
                    });
                } else {
                    const text = node.textContent.trim();
                    const lineCount = Math.max(1, Math.ceil(text.length / 90));
                    totalH += (lineCount * 20) + 4;
                }
            } else if (tag === 'br') {
                totalH += 21;
            } else {
                const hasBlockChildren = Array.from(node.children).some(c => 
                    ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol'].includes(c.tagName.toLowerCase())
                );
                if (hasBlockChildren) {
                    Array.from(node.childNodes).forEach(processNode);
                } else {
                    const text = node.textContent.trim();
                    if (text) {
                        const lineCount = Math.max(1, Math.ceil(text.length / 95));
                        totalH += (lineCount * 21) + 8;
                    }
                }
            }
        };

        Array.from(container.childNodes).forEach(processNode);
        return totalH;
    } catch (e) {
        console.error("HTML estimation failed, fallback:", e);
        return estimateTextNodeHeight(htmlToPlainText(rawText));
    }
};

const splitTextIntoPages = (rawText, maxPageHeight = 800) => {
    if (!rawText) return [''];
    
    // First, split by manual page breaks
    const pageBreakRegex = /<div[^>]*class="[^"]*page-break[^"]*"[^>]*><\/div>/gi;
    const manualPages = rawText.split(pageBreakRegex);
    
    const finalPages = [];
    
    const splitSinglePageByHeight = (pageContent) => {
        if (!pageContent) return [''];
        if (estimateBlockHeight(pageContent) <= maxPageHeight) {
            return [pageContent];
        }
        
        const isHtml = pageContent.includes('<') && pageContent.includes('>');
        
        if (!isHtml) {
            const lines = pageContent.split('\n');
            const pages = [];
            let currentPageText = '';
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const testText = currentPageText ? currentPageText + '\n' + line : line;
                if (estimateBlockHeight(testText) > maxPageHeight) {
                    if (currentPageText) {
                        pages.push(currentPageText);
                        currentPageText = line;
                    } else {
                        pages.push(line);
                        currentPageText = '';
                    }
                } else {
                    currentPageText = testText;
                }
            }
            if (currentPageText) {
                pages.push(currentPageText);
            }
            return pages;
        }
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<div>${pageContent}</div>`, 'text/html');
            const container = doc.body.firstElementChild || doc.body;
            const blocks = Array.from(container.childNodes);
            
            const pages = [];
            let currentPageDiv = document.createElement('div');
            
            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i].cloneNode(true);
                const testDiv = currentPageDiv.cloneNode(true);
                testDiv.appendChild(block.cloneNode(true));
                
                if (estimateBlockHeight(testDiv.innerHTML) > maxPageHeight) {
                    const blockTag = block.nodeType === Node.ELEMENT_NODE ? block.tagName.toLowerCase() : '';
                    if (blockTag === 'p' || blockTag === 'div') {
                        const html = block.innerHTML;
                        const brParts = html.split(/<br\s*\/?>/gi);
                        
                        if (brParts.length > 1) {
                            let partDiv = document.createElement(blockTag);
                            for (let j = 0; j < brParts.length; j++) {
                                const part = brParts[j];
                                const lineTestDiv = currentPageDiv.cloneNode(true);
                                const lineTestBlock = partDiv.cloneNode(true);
                                if (j > 0) lineTestBlock.innerHTML += '<br>' + part;
                                else lineTestBlock.innerHTML = part;
                                lineTestDiv.appendChild(lineTestBlock);
                                
                                if (estimateBlockHeight(lineTestDiv.innerHTML) > maxPageHeight) {
                                    if (currentPageDiv.innerHTML.trim()) {
                                        pages.push(currentPageDiv.innerHTML);
                                    }
                                    currentPageDiv = document.createElement('div');
                                    partDiv = document.createElement(blockTag);
                                    partDiv.innerHTML = part;
                                    currentPageDiv.appendChild(partDiv);
                                } else {
                                    partDiv.innerHTML = lineTestBlock.innerHTML;
                                }
                            }
                            if (partDiv.innerHTML.trim()) {
                                if (currentPageDiv.innerHTML.indexOf(partDiv.outerHTML) === -1) {
                                    currentPageDiv.appendChild(partDiv);
                                }
                            }
                            continue;
                        }
                    }
                    
                    if (currentPageDiv.innerHTML.trim()) {
                        pages.push(currentPageDiv.innerHTML);
                    }
                    currentPageDiv = document.createElement('div');
                    currentPageDiv.appendChild(block);
                } else {
                    currentPageDiv.appendChild(block);
                }
            }
            if (currentPageDiv.innerHTML.trim()) {
                pages.push(currentPageDiv.innerHTML);
            }
            return pages;
        } catch (e) {
            console.error("Error splitting HTML by height:", e);
            return [pageContent];
        }
    };
    
    manualPages.forEach(p => {
        const subPages = splitSinglePageByHeight(p);
        finalPages.push(...subPages);
    });
    
    return finalPages;
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
            } else if (line.match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
                const items = [];
                while (i < lines.length && lines[i].trim().match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
                    items.push(lines[i].trim().replace(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/, ''));
                    i++;
                }
                elements.push(
                    <div key={`ul-${i}`} className="pl-4 space-y-1.5 my-3">
                        {items.map((item, j) => <div key={j} className="flex items-start gap-3"><span className="text-neon-green mt-1.5 text-[8px]">●</span><span className={cn("text-[13px] font-medium text-black leading-[1.9]", baseClass)} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} /></div>)}
                    </div>
                );
                continue;
            } else if (line.match(/^\d+\.(?:\s|&nbsp;|\u00a0)+/)) {
                const items = [];
                while (i < lines.length && lines[i].trim().match(/^\d+\.(?:\s|&nbsp;|\u00a0)+/)) {
                    const l = lines[i].trim();
                    const match = l.match(/^(\d+)\.(?:\s|&nbsp;|\u00a0)+(.*)/);
                    if (match) {
                        items.push({ num: match[1], text: match[2].trim() });
                    } else {
                        items.push({ num: '•', text: l.replace(/^\d+\.(?:\s|&nbsp;|\u00a0)+/, '').trim() });
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
                    dangerouslySetInnerHTML={{ __html: processHtmlHeadings(content) }} 
                />
            );
        }
        
        return renderFormatted(content, baseClass);
    };


const defaultColumns = [
    { key: 'description', label: 'Resource Inventory', type: 'text' },
    { key: 'qty', label: 'Qty', type: 'number' },
    { key: 'price', label: 'Amount (INR)', type: 'amount' }
];

const COLUMN_TYPES = [
    { value: 'text',   label: 'Text',   icon: 'T' },
    { value: 'number', label: 'Number', icon: '#' },
    { value: 'amount', label: 'Amount', icon: '₹' },
];

const ProposalGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addProposal, updateProposal, proposals, user, addToast } = useStore();
    const [previewScale, setPreviewScale] = useState(0.65);
    const previewContainerRef = useRef(null);

    const [activeTab, setActiveTab] = useState('ai'); 
    const [currentPreviewPage, setCurrentPreviewPage] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatingSection, setGeneratingSection] = useState(null); // 'all', 'strategy', 'scope', 'deliverables', etc.
    const [promptBoxClear, setPromptBoxClear] = useState(false);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const [userZoom, setUserZoom] = useState(1);
    const [isExpandedPreview, setIsExpandedPreview] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [isSignaturesCollapsed, setIsSignaturesCollapsed] = useState(true);
    const [bulkRawText, setBulkRawText] = useState('');
    const [bulkCampaignName, setBulkCampaignName] = useState('PROPOSAL PLAN');

    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkProposals, setBulkProposals] = useState([]);
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [selectedBulkIndex, setSelectedBulkIndex] = useState(0);

    const parsedPrompts = useMemo(() => {
        if (!bulkRawText || !bulkRawText.trim()) return [];
        let list = [];
        if (bulkRawText.includes('---') || bulkRawText.includes('___')) {
            list = bulkRawText.split(/\n?[-_]{3,}\n?/).map(p => p.trim()).filter(p => p.length > 5);
        } else {
            list = bulkRawText.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 10);
        }
        return list.length > 0 ? list : [bulkRawText.trim()];
    }, [bulkRawText]);

    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    // AI Studio State
    const [promptText, setPromptText] = useState('');
    const [aiMode, setAiMode] = useState('generate');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionCategory, setSuggestionCategory] = useState(0);
    const [refinementContext, setRefinementContext] = useState(null);

    const handleRefineClick = (fieldKey, fieldLabel, currentValue) => {
        setRefinementContext({
            fieldKey,
            fieldLabel,
            currentValue
        });
        setActiveTab('ai');
    };
    const [messages, setMessages] = useState([
        {
            id: 'init-msg',
            sender: 'ai',
            text: "Welcome to Newbi AI Proposal Studio. Describe the event or campaign requirements in the prompt box below, choose 'Generate New' or 'Bulk Mode', and I will draft a comprehensive proposal. Use 'Chat & Refine' to iteratively customize any details!"
        }
    ]);
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
        if (isGenerating || isBulkGenerating) {
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
    }, [isGenerating, isBulkGenerating, STAGE_MESSAGES]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const suggestions = useMemo(() => {
        const proposalSuggestions = [
            [
                "Event production proposal for a 2-day music festival, including stage, sound, and lighting setup",
                "Artist logistics and hospitality proposal for a multi-city stand-up comedy tour",
                "Proposal for 50 event volunteers and site management for a corporate marathon"
            ],
            [
                "Strategic event consultation for a brand's 10th-anniversary gala dinner",
                "Complete digital marketing and social media coverage for a product launch event",
                "Technical production and stage management proposal for a TEDx event"
            ]
        ];
        return proposalSuggestions[suggestionCategory] || proposalSuggestions[0];
    }, [suggestionCategory]);

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
        showPaymentDetails: true,
        showSeal: false,
        showSignatures: false,
        signatureType: 'handwritten', // 'handwritten' | 'digital' | 'typed'
        providerSignature: '',
        clientSignature: '',
        senderName: 'Authorized Signatory',
        senderDesignation: 'Director of Operations',
        status: 'Draft',
        hiddenFields: [],
        selectedLogo: 'entertainment',
        customPages: [],
        totalOverride: null,
        totalSourceColumn: 'price',
        hideTotalColumn: false,
        strategyTitle: 'EXECUTIVE SUMMARY',
        strategySub: 'STRATEGIC OUTLINE',
        scopeTitle: 'SCOPE OF WORK',
        scopeSub: 'RESOURCE DELIVERABLES',
        proposalTitle: 'DELIVERABLES',
        proposalSub: 'PROJECT INVENTORY',
        inventoryTitle: 'RESOURCE INVENTORY',
        inventorySub: 'COMMERCIALS BREAKDOWN',
        commercialsTitle: 'COMMERCIAL TERMS',
        commercialsSub: 'SETTLEMENT & SIGN-OFF'
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

    const hasInitializedRef = useRef(false);
    useEffect(() => {
        hasInitializedRef.current = false;
    }, [id]);

    useEffect(() => {
        if (id && proposals.length > 0 && !hasInitializedRef.current) {
            const proposal = proposals.find(p => p.id === id);
            if (proposal) {
                setSingleFormData({ 
                    ...proposal, 
                    hiddenFields: proposal.hiddenFields || [], 
                    selectedLogo: proposal.selectedLogo || 'entertainment',
                    hideTotalColumn: proposal.hideTotalColumn || false,
                    strategyTitle: proposal.strategyTitle ?? 'EXECUTIVE SUMMARY',
                    strategySub: proposal.strategySub ?? 'STRATEGIC OUTLINE',
                    scopeTitle: proposal.scopeTitle ?? 'SCOPE OF WORK',
                    scopeSub: proposal.scopeSub ?? 'RESOURCE DELIVERABLES',
                    proposalTitle: proposal.proposalTitle ?? 'DELIVERABLES',
                    proposalSub: proposal.proposalSub ?? 'PROJECT INVENTORY',
                    inventoryTitle: proposal.inventoryTitle ?? 'RESOURCE INVENTORY',
                    inventorySub: proposal.inventorySub ?? 'COMMERCIALS BREAKDOWN',
                    commercialsTitle: proposal.commercialsTitle ?? 'COMMERCIAL TERMS',
                    commercialsSub: proposal.commercialsSub ?? 'SETTLEMENT & SIGN-OFF'
                });
                setSingleItems(proposal.items || []);
                hasInitializedRef.current = true;
            }
        }
    }, [id, proposals]);

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

    const totalSrcCol = formData.totalSourceColumn || 'price';
    const subtotal = items.reduce((sum, item) => {
        return sum + (Number(item[totalSrcCol]) || 0);
    }, 0);
    const hasOverride = formData.totalOverride !== null && formData.totalOverride !== undefined && formData.totalOverride !== '';
    const overrideBase = hasOverride ? Number(formData.totalOverride) : subtotal;
    const gstAmount = formData.showGst ? (overrideBase * formData.gstRate) / 100 : 0;
    const computedTotal = subtotal + (formData.showGst ? (subtotal * formData.gstRate) / 100 : 0);
    const totalAmount = hasOverride ? (overrideBase + gstAmount) : computedTotal;

    const toggleFieldVisibility = (field) => {
        setFormData(prev => {
            const current = prev.hiddenFields || [];
            const updated = current.includes(field) ? current.filter(f => f !== field) : [...current, field];
            return { ...prev, hiddenFields: updated };
        });
    };

    const moveCustomPage = (index, direction) => {
        const pages = [...(formData.customPages || [])];
        if (direction === 'up' && index > 0) {
            const temp = pages[index];
            pages[index] = pages[index - 1];
            pages[index - 1] = temp;
        } else if (direction === 'down' && index < pages.length - 1) {
            const temp = pages[index];
            pages[index] = pages[index + 1];
            pages[index + 1] = temp;
        }
        setFormData(prev => ({ ...prev, customPages: pages }));
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

        const insertCustomPagesFor = (placement) => {
            if (!isHidden('customPages') && formData.customPages && formData.customPages.length > 0) {
                formData.customPages.forEach((cp, cpIdx) => {
                    const target = cp.insertAfter || 'default';
                    if (target === placement) {
                        const cpPages = splitTextIntoPages(cp.content || '', 800);
                        cpPages.forEach((cpText, cpSubIdx) => {
                            pages.push({
                                type: 'custom',
                                items: [],
                                title: cpPages.length > 1 ? `${cp.title} (Part ${cpSubIdx + 1})` : cp.title,
                                content: cpText,
                                pageIndex: cpIdx,
                                customSubIdx: cpSubIdx
                            });
                        });
                    }
                });
            }
        };

        if (!isHidden('cover')) {
            pages.push({ type: 'cover', items: [] });
        }
        insertCustomPagesFor('cover');

        if (!isHidden('strategy') && (!isHidden('overview') || !isHidden('primaryGoal'))) {
            const overviewHtml = !isHidden('overview') ? (formData.overview || '') : '';
            const primaryGoalHtml = !isHidden('primaryGoal') ? (formData.primaryGoal || '') : '';
            
            const overviewPages = splitTextIntoPages(overviewHtml, 800);
            const lastOverviewPage = overviewPages[overviewPages.length - 1] || '';
            const goalContainerHeight = primaryGoalHtml ? estimateBlockHeight(primaryGoalHtml) + 120 : 0;
            
            if (estimateBlockHeight(lastOverviewPage) + goalContainerHeight <= 800) {
                overviewPages.forEach((opText, opIdx) => {
                    if (opIdx === overviewPages.length - 1) {
                        pages.push({
                            type: 'strategy',
                            overviewText: opText,
                            primaryGoalText: primaryGoalHtml,
                            strategyPage: opIdx + 1,
                            isLastStrategy: true
                        });
                    } else {
                        pages.push({
                            type: 'strategy',
                            overviewText: opText,
                            primaryGoalText: '',
                            strategyPage: opIdx + 1,
                            isLastStrategy: false
                        });
                    }
                });
            } else {
                overviewPages.forEach((opText, opIdx) => {
                    pages.push({
                        type: 'strategy',
                        overviewText: opText,
                        primaryGoalText: '',
                        strategyPage: opIdx + 1,
                        isLastStrategy: false
                    });
                });
                pages.push({
                    type: 'strategy',
                    overviewText: '',
                    primaryGoalText: primaryGoalHtml,
                    strategyPage: overviewPages.length + 1,
                    isLastStrategy: true
                });
            }
        }
        insertCustomPagesFor('strategy');

        if (!isHidden('scopeOfWork') && formData.scopeOfWork) {
            const scopePages = splitTextIntoPages(formData.scopeOfWork, 800);
            scopePages.forEach((spText, spIdx) => {
                pages.push({
                    type: 'scope',
                    items: [],
                    scopeText: spText,
                    scopePage: spIdx + 1,
                    isLastScope: spIdx === scopePages.length - 1
                });
            });
        }
        insertCustomPagesFor('scope');

        if (!isHidden('proposal')) {
            const activeDeliverables = (formData.deliverables || []).filter(d => d.item);
            const clientReqs = (formData.clientRequirements || []).filter(r => r.description);
            
            if (activeDeliverables.length === 0) {
                pages.push({
                    type: 'proposal',
                    deliverables: [],
                    clientRequirements: clientReqs,
                    proposalPage: 1,
                    isLastProposal: true
                });
            } else {
                let delsRemaining = [...activeDeliverables];
                let pageIdx = 1;
                while (delsRemaining.length > 0) {
                    const chunk = delsRemaining.splice(0, 10);
                    const isLast = delsRemaining.length === 0;
                    pages.push({
                        type: 'proposal',
                        deliverables: chunk,
                        clientRequirements: isLast ? clientReqs : [],
                        proposalPage: pageIdx++,
                        isLastProposal: isLast,
                        startIndex: (pageIdx - 2) * 10
                    });
                }
            }
        }
        insertCustomPagesFor('proposal');

        if (!isHidden('inventory')) {
            let itemsRemaining = [...items];
            if (itemsRemaining.length === 0) pages.push({ type: 'table', items: [] });
            else {
                let pIdx = 1;
                while (itemsRemaining.length > 0) {
                    pages.push({ 
                        type: 'table', 
                        items: itemsRemaining.splice(0, 10),
                        tablePageIdx: pIdx++ 
                    });
                }
            }
        }
        insertCustomPagesFor('table');

        insertCustomPagesFor('default');

        if (!isHidden('commercials')) {
            const termsHtml = formData.terms || '';
            const paymentDetailsHtml = (formData.showPaymentDetails !== false && !isHidden('paymentDetails')) ? (formData.paymentDetails || '') : '';
            
            if (termsHtml) {
                const termsPages = splitTextIntoPages(termsHtml, 800);
                const lastTermsPageText = termsPages[termsPages.length - 1];
                const finalPageStaticHeight = 550;
                const lastTermsHeight = estimateBlockHeight(lastTermsPageText) + (paymentDetailsHtml ? 100 : 0);
                
                if (lastTermsHeight + finalPageStaticHeight <= 800) {
                    for (let i = 0; i < termsPages.length - 1; i++) {
                        pages.push({
                            type: 'terms_only',
                            termsText: termsPages[i],
                            termsPageIdx: i + 1
                        });
                    }
                    pages.push({
                        type: 'commercials',
                        termsText: lastTermsPageText,
                        paymentDetailsText: paymentDetailsHtml,
                        items: []
                    });
                } else {
                    for (let i = 0; i < termsPages.length; i++) {
                        pages.push({
                            type: 'terms_only',
                            termsText: termsPages[i],
                            termsPageIdx: i + 1
                        });
                    }
                    pages.push({
                        type: 'commercials',
                        termsText: '',
                        paymentDetailsText: paymentDetailsHtml,
                        items: []
                    });
                }
            } else {
                pages.push({
                    type: 'commercials',
                    termsText: '',
                    paymentDetailsText: paymentDetailsHtml,
                    items: []
                });
            }
        }
        insertCustomPagesFor('commercials');
        return pages;
    };
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const rawProposalData = { ...formData, items, totalAmount, subtotal, updatedAt: new Date().toISOString() };
            const proposalData = JSON.parse(JSON.stringify(rawProposalData));
            if (id) {
                await updateProposal(id, proposalData);
                addToast('Strategic Memorandum Updated', 'success');
            } else {
                const newDocId = await addProposal(proposalData);
                addToast('Strategic Memorandum Created', 'success');
                navigate(`/admin/edit-proposal/${newDocId}`);
            }
        } catch (err) {
            addToast(`Storage integrity breach: ${err.message}`, 'error');
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
                // NOTE: Never overwrite paymentDetails — user has their own bank details pre-configured
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
        const mapping = { 
            'ai': 'cover', 
            '1': 'cover', 
            '2': 'strategy', 
            '3': 'scope', 
            '4': 'proposal', 
            '5': 'table', 
            '6': 'commercials',
            '7': 'custom'
        };
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

        let prompts = [];
        if (bulkRawText.includes('---') || bulkRawText.includes('___')) {
            prompts = bulkRawText
                .split(/\n?[-_]{3,}\n?/)
                .map(p => p.trim())
                .filter(p => p.length > 5);
        } else {
            prompts = bulkRawText
                .split(/\n\n+/)
                .map(p => p.trim())
                .filter(p => p.length > 10);
        }
        if (prompts.length === 0) {
            prompts = [bulkRawText.trim()];
        }

        setBulkProgress({ current: 0, total: prompts.length });
        const generatedProposals = [];
        
        try {
            for (let i = 0; i < prompts.length; i++) {
                const prompt = prompts[i];
                const data = await generateFullDocument('proposal', prompt, 'Premium', {});
                
                const finalProposal = {
                    clientName: data.clientName || `Client 0${i + 1}`,
                    clientAddress: data.clientAddress || 'Corporate Headquarters',
                    campaignName: (bulkCampaignName && bulkCampaignName.trim() !== 'PROPOSAL PLAN') ? bulkCampaignName.trim() : (data.campaignName || 'PROPOSAL PLAN'),
                    campaignDuration: data.campaignDuration || 'TBD',
                    proposalNumber: `NBQ-${Math.floor(1000 + Math.random() * 9000)}`,
                    coverDescription: data.coverDescription || 'This document contains the beautifully formatted and arranged synthesis of your data.',
                    overview: data.overview || '',
                    primaryGoal: data.primaryGoal || '',
                    numericTargets: '',
                    audienceAge: '',
                    audienceLocation: '',
                    audienceInterests: '',
                    selectedChannels: [],
                    contentCount: { reels: 0, posts: 0, stories: 0 },
                    deliverables: data.deliverables?.length 
                        ? data.deliverables.map((d, index) => ({ 
                            id: Date.now() + index + Math.random(), 
                            item: d.item || d.name || '', 
                            qty: d.qty || '1', 
                            timeline: d.timeline || 'TBD' 
                        })) 
                        : [],
                    clientRequirements: data.clientRequirements?.length 
                        ? data.clientRequirements.map((r, index) => ({ 
                            id: Date.now() + 100 + index + Math.random(), 
                            description: r.description || r.requirement || '' 
                        })) 
                        : [],
                    scopeOfWork: data.scopeOfWork || prompt,
                    terms: data.terms || '1. 50% Advance Fee required.\n2. Balance on delivery.\n3. Taxes as applicable (18% GST).\n4. Quote valid for 14 days.',
                    paymentDetails: 'Account Name: Newbi Entertainment\nAccount Number: 0000000000\nIFSC: YOUR000000\nUPI: newbi@upi',
                    gstRate: 18,
                    advanceRequested: 50,
                    showGst: true,
                    showPaymentDetails: true,
                    showSeal: false,
                    showSignatures: true,
                    signatureType: 'handwritten',
                    providerSignature: '',
                    clientSignature: '',
                    senderName: 'Authorized Signatory',
                    senderDesignation: 'Director of Operations',
                    status: 'Draft',
                    hiddenFields: [],
                    selectedLogo: 'entertainment',
                    customPages: [],
                    items: data.items?.length 
                        ? data.items.map((item, idx) => ({
                            id: Date.now() + 200 + idx + Math.random(),
                            description: item.description || item.name || '',
                            qty: Number(item.qty) || 1,
                            unit: item.unit || 'Unit',
                            price: Number(item.price) || 0
                        }))
                        : [],
                    subtotal: 0,
                    gstAmount: 0,
                    totalAmount: 0,
                    hideTotalColumn: false,
                    isBulkGenerated: true,
                    strategyTitle: 'EXECUTIVE SUMMARY',
                    strategySub: 'STRATEGIC OUTLINE',
                    scopeTitle: 'SCOPE OF WORK',
                    scopeSub: 'RESOURCE DELIVERABLES',
                    proposalTitle: 'DELIVERABLES',
                    proposalSub: 'PROJECT INVENTORY',
                    inventoryTitle: 'RESOURCE INVENTORY',
                    inventorySub: 'COMMERCIALS BREAKDOWN',
                    commercialsTitle: 'COMMERCIAL TERMS',
                    commercialsSub: 'SETTLEMENT & SIGN-OFF'
                };
                
                generatedProposals.push(finalProposal);
                setBulkProgress({ current: i + 1, total: prompts.length });
            }
            
            setBulkProposals(prev => {
                const newVault = [...prev, ...generatedProposals];
                setSelectedBulkIndex(newVault.length - generatedProposals.length);
                return newVault;
            });
            addToast(`Successfully generated ${generatedProposals.length} premium proposals!`, 'success');
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

    useEffect(() => {
        if (paginatedPages.length > 0 && currentPreviewPage >= paginatedPages.length) {
            setCurrentPreviewPage(paginatedPages.length - 1);
        }
    }, [paginatedPages.length, currentPreviewPage]);

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
            addToast('Refinement applied successfully!', 'success');
        } catch (err) {
            console.error(err);
            addToast(`Refinement failed: ${err.message}`, 'error');
        } finally {
            setIsRefining(false);
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
                // Field refinement
                const refined = await refineFieldContent(
                    'proposal',
                    refinementContext.fieldLabel,
                    refinementContext.currentValue,
                    currentPrompt,
                    'Premium'
                );

                const fieldKey = refinementContext.fieldKey;
                if (fieldKey.startsWith('deliverables[')) {
                    const match = fieldKey.match(/deliverables\[(\d+)\]\.(item|qty|timeline)/);
                    if (match) {
                        const idx = parseInt(match[1]);
                        const field = match[2];
                        const updated = [...formData.deliverables];
                        updated[idx] = { ...updated[idx], [field]: refined };
                        setFormData({ ...formData, deliverables: updated });
                    }
                } else if (fieldKey.startsWith('clientRequirements[')) {
                    const match = fieldKey.match(/clientRequirements\[(\d+)\]\.description/);
                    if (match) {
                        const idx = parseInt(match[1]);
                        const updated = [...formData.clientRequirements];
                        updated[idx] = { ...updated[idx], description: refined };
                        setFormData({ ...formData, clientRequirements: updated });
                    }
                } else if (fieldKey.startsWith('items[')) {
                    const match = fieldKey.match(/items\[(\d+)\]\.(description|qty|price)/);
                    if (match) {
                        const idx = parseInt(match[1]);
                        const field = match[2];
                        const newItems = [...items];
                        let val = refined;
                        if (field === 'qty' || field === 'price') val = Number(refined) || 0;
                        newItems[idx] = { ...newItems[idx], [field]: val };
                        setItems(newItems);
                    }
                } else {
                    setFormData(prev => ({ ...prev, [fieldKey]: refined }));
                }

                setMessages(prev => [...prev, {
                    id: String(Date.now()) + '-ai',
                    sender: 'ai',
                    text: `✓ Refinement applied to "${refinementContext.fieldLabel}"! Output updated in the preview.`
                }]);
                setRefinementContext(null);
                addToast(`Field "${refinementContext.fieldLabel}" successfully refined!`, 'success');
            } else if (aiMode === 'bulk') {
                setIsBulkGenerating(true);
                let prompts = [];
                if (currentPrompt.includes('---') || currentPrompt.includes('___')) {
                    prompts = currentPrompt
                        .split(/\n?[-_]{3,}\n?/)
                        .map(p => p.trim())
                        .filter(p => p.length > 5);
                } else {
                    prompts = currentPrompt
                        .split(/\n\n+/)
                        .map(p => p.trim())
                        .filter(p => p.length > 10);
                }
                if (prompts.length === 0) {
                    prompts = [currentPrompt.trim()];
                }
                
                setBulkProgress({ current: 0, total: prompts.length });
                const generatedProposals = [];
                
                try {
                    for (let i = 0; i < prompts.length; i++) {
                        const prompt = prompts[i];
                        const data = await generateFullDocument('proposal', prompt, 'Premium', {});
                        
                        const finalProposal = {
                            clientName: data.clientName || `Client 0${i + 1}`,
                            clientAddress: data.clientAddress || 'Corporate Headquarters',
                            campaignName: data.campaignName || 'Strategic Initiative',
                            campaignDuration: data.campaignDuration || 'TBD',
                            proposalNumber: `NBQ-${Math.floor(1000 + Math.random() * 9000)}`,
                            coverDescription: data.coverDescription || 'This document contains the beautifully formatted and arranged synthesis of your data.',
                            overview: data.overview || '',
                            primaryGoal: data.primaryGoal || '',
                            numericTargets: '',
                            audienceAge: '',
                            audienceLocation: '',
                            audienceInterests: '',
                            selectedChannels: [],
                            contentCount: { reels: 0, posts: 0, stories: 0 },
                            deliverables: data.deliverables?.length 
                                ? data.deliverables.map((d, index) => ({ 
                                    id: Date.now() + index + Math.random(), 
                                    item: d.item || d.name || '', 
                                    qty: d.qty || '1', 
                                    timeline: d.timeline || 'TBD' 
                                })) 
                                : [],
                            clientRequirements: data.clientRequirements?.length 
                                ? data.clientRequirements.map((r, index) => ({ 
                                    id: Date.now() + 100 + index + Math.random(), 
                                    description: r.description || r.requirement || '' 
                                })) 
                                : [],
                            scopeOfWork: data.scopeOfWork || prompt,
                            terms: data.terms || '1. 50% Advance Fee required.\n2. Balance on delivery.\n3. Taxes as applicable (18% GST).\n4. Quote valid for 14 days.',
                            paymentDetails: 'Account Name: Newbi Entertainment\nAccount Number: 0000000000\nIFSC: YOUR000000\nUPI: newbi@upi',
                            gstRate: 18,
                            advanceRequested: 50,
                            showGst: true,
                            showPaymentDetails: true,
                            showSeal: false,
                            showSignatures: true,
                            signatureType: 'handwritten',
                            providerSignature: '',
                            clientSignature: '',
                            senderName: 'Authorized Signatory',
                            senderDesignation: 'Director of Operations',
                            status: 'Draft',
                            hiddenFields: [],
                            selectedLogo: 'entertainment',
                            customPages: [],
                            items: data.items?.length 
                                ? data.items.map((item, idx) => ({
                                    id: Date.now() + 200 + idx + Math.random(),
                                    description: item.description || item.name || '',
                                    qty: Number(item.qty) || 1,
                                    unit: item.unit || 'Unit',
                                    price: Number(item.price) || 0
                                }))
                                : [],
                            subtotal: 0,
                            gstAmount: 0,
                            totalAmount: 0,
                            isBulkGenerated: true,
                            strategyTitle: 'EXECUTIVE SUMMARY',
                            strategySub: 'STRATEGIC OUTLINE',
                            scopeTitle: 'SCOPE OF WORK',
                            scopeSub: 'RESOURCE DELIVERABLES',
                            proposalTitle: 'DELIVERABLES',
                            proposalSub: 'PROJECT INVENTORY',
                            inventoryTitle: 'RESOURCE INVENTORY',
                            inventorySub: 'COMMERCIALS BREAKDOWN',
                            commercialsTitle: 'COMMERCIAL TERMS',
                            commercialsSub: 'SETTLEMENT & SIGN-OFF'
                        };
                        generatedProposals.push(finalProposal);
                        setBulkProgress({ current: i + 1, total: prompts.length });
                    }
                    
                    setBulkProposals(prev => {
                        const newVault = [...prev, ...generatedProposals];
                        setSelectedBulkIndex(newVault.length - generatedProposals.length);
                        return newVault;
                    });

                    setMessages(prev => [...prev, {
                        id: String(Date.now()) + '-ai',
                        sender: 'ai',
                        text: `✓ Bulk requirements successfully structured! I have generated ${generatedProposals.length} proposals and configured the engine. Preview the compiled A4 sheet on the right, or click save to persist.`
                    }]);
                    addToast(`Successfully generated ${generatedProposals.length} premium proposals!`, 'success');
                } catch (err) {
                    setMessages(prev => [...prev, {
                        id: String(Date.now()) + '-ai-err',
                        sender: 'ai',
                        text: `⚠ Failed to process bulk request: ${err.message}`
                    }]);
                    addToast(`Error: ${err.message}`, 'error');
                }
            } else if (aiMode === 'generate') {
                const data = await generateFullDocument('proposal', currentPrompt, 'Premium', {});
                setSingleFormData(prev => ({
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
                            id: Date.now() + 100 + i, 
                            description: r.description || r.requirement || '' 
                        })) 
                        : prev.clientRequirements,
                }));
                if (data.items && data.items.length > 0) {
                    setSingleItems(data.items.map((item, idx) => ({
                        id: Date.now() + 200 + idx,
                        description: item.description || item.name || '',
                        qty: Number(item.qty) || 1,
                        unit: item.unit || 'Unit',
                        price: Number(item.price) || 0
                    })));
                }

                setMessages(prev => [...prev, {
                    id: String(Date.now()) + '-ai',
                    sender: 'ai',
                    text: `✓ Proposal for "${data.clientName || 'Partner'}" generated successfully! I added ${data.items?.length || 0} financial line items. \n\nI have switched your mode to **Chat & Revise** so you can make modifications directly. Or feel free to adjust using the manual tabs.`
                }]);
                setAiMode('refine');
                addToast('Proposal successfully generated!', 'success');
            } else {
                const currentDoc = (isBulkMode && bulkProposals.length > 0) ? bulkProposals[selectedBulkIndex] : singleFormData;
                const currentDocWithItems = { ...currentDoc, items };
                const updatedDoc = await reviseDocument(currentDocWithItems, currentPrompt, 'Premium');
                
                setFormData(updatedDoc);
                if (updatedDoc.items && updatedDoc.items.length > 0) {
                    setItems(updatedDoc.items.map((item, idx) => ({
                        id: Date.now() + 200 + idx,
                        description: item.description || item.name || item.item || '',
                        qty: Number(item.qty) || 1,
                        unit: item.unit || 'Unit',
                        price: Number(item.price) || 0
                    })));
                }

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
            setIsBulkGenerating(false);
        }
    };

    const tabs = [
        { id: 'ai', label: 'AI Studio', icon: Sparkles, desc: 'AI Generator & Chat' },
        { id: '1', label: 'Cover Page', icon: FileText, desc: 'Identity & Title', visibilityKey: 'cover' },
        { id: '2', label: 'Strategy', icon: Target, desc: 'Strategic Framework', visibilityKey: 'strategy' },
        { id: '3', label: 'Scope of Work', icon: ClipboardList, desc: 'Project Scope', visibilityKey: 'scopeOfWork' },
        { id: '4', label: 'Deliverables', icon: Layers, desc: 'What we deliver', visibilityKey: 'proposal' },
        { id: '5', label: 'Pricing Breakdown', icon: Briefcase, desc: 'Financial Details', visibilityKey: 'inventory' },
        { id: '6', label: 'Payment & Terms', icon: CreditCard, desc: 'Settlement & Terms', visibilityKey: 'paymentDetails' },
        { id: '7', label: 'Custom Pages', icon: FileText, desc: 'Additional Pages', visibilityKey: 'customPages' }
    ];


    // Inline bold/italic formatting

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="h-screen overflow-hidden bg-[#020202] text-white selection:bg-neon-green selection:text-black font-['Outfit'] flex flex-col">
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
                        <Link to="/admin/proposals" className="p-2.5 md:p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 group"><ArrowLeft size={16} /></Link>
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <h1 className="text-sm md:text-xl font-black tracking-tighter uppercase italic text-white truncate leading-none">Quotation <span className="text-neon-green">Engine.</span></h1>
                        <p className="text-[7px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1 truncate">Business Summary</p>
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

            <main className="flex-1 flex overflow-hidden min-h-0">
                {/* Sidebar - Desktop */}
                <aside className={cn(
                    "hidden lg:flex w-64 shrink-0 border-r border-white/5 bg-zinc-900/20 flex-col p-6 gap-6 overflow-y-auto scrollbar-hide",
                    isExpandedPreview && "lg:hidden"
                )}>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-4 mb-4">Navigation</p>
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={cn("w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left group", activeTab === tab.id ? "bg-white text-black shadow-xl" : "hover:bg-white/5 text-gray-500 hover:text-white")}>
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
                <main className={cn(
                    "flex-grow scrollbar-hide bg-[#050505]",
                    activeTab === 'ai' ? "h-full overflow-hidden p-4 md:p-6 pb-4 flex flex-col" : "px-4 md:px-12 py-10 md:py-16 overflow-y-auto pb-32",
                    isExpandedPreview && "hidden"
                )}>
                    <div className={cn("max-w-[1600px] mx-auto w-full", activeTab === 'ai' ? "h-full flex-grow flex flex-col min-h-0" : "space-y-10 md:space-y-12")}>

                        {activeTab !== 'ai' && (
                            <div className="flex flex-col 2xl:flex-row items-start 2xl:items-end justify-between gap-6 mb-16 pb-8 border-b border-white/5 relative overflow-hidden">
                                <div className="space-y-4 min-w-0 w-full 2xl:w-auto">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-[2px] bg-neon-green/40" />
                                        <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] opacity-80 truncate">
                                            Phase {tabs.findIndex(t => t.id === activeTab) + 1} of {tabs.length}
                                        </p>
                                    </div>
                                    <div className="space-y-2 min-w-0">
                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter italic text-white leading-none truncate">
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
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-neon-green/5 rounded-full blur-3xl pointer-events-none" />

                                        {/* Brand Header */}
                                        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 shrink-0 relative z-10">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-neon-green/10 flex items-center justify-center border border-neon-green/20">
                                                    <Cpu size={14} className="text-neon-green animate-pulse" />
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-neon-green uppercase tracking-[0.3em] block leading-none mb-0.5">Primary Model</span>
                                                    <h3 className="text-xs font-black uppercase text-white tracking-wide leading-none">Gemini 3.5 Flash<span className="text-neon-green">.</span></h3>
                                                </div>
                                            </div>
                                            {/* Mode status indicator */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Mode:</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-neon-green shadow-sm">
                                                    {refinementContext ? 'Field Refinement' : (aiMode === 'bulk' ? 'Bulk Generator' : (aiMode === 'generate' ? 'First Draft' : 'Refinement & Chat'))}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mode Switcher inside AI Studio */}
                                        <div className="flex items-center bg-zinc-950 border border-white/5 rounded-2xl p-1 gap-1 mb-4 z-10 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => { setIsBulkMode(false); setAiMode('generate'); }}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                                                    (!isBulkMode && aiMode !== 'refine') ? "bg-neon-green text-black shadow-[0_0_15px_rgba(57,255,20,0.3)]" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                <Sparkles size={12} />
                                                <span>Generate New</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setIsBulkMode(true); setAiMode('bulk'); }}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                                                    isBulkMode ? "bg-neon-green text-black shadow-[0_0_15px_rgba(57,255,20,0.3)]" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                <FileSpreadsheet size={12} />
                                                <span>AI Bulk Mode</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setIsBulkMode(false); setAiMode('refine'); }}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                                                    (!isBulkMode && aiMode === 'refine') ? "bg-neon-green text-black shadow-[0_0_15px_rgba(57,255,20,0.3)]" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                <Send size={12} />
                                                <span>Chat & Revise</span>
                                            </button>
                                        </div>

                                        {aiMode === 'bulk' ? (
                                            <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide relative z-10 pb-4">
                                                {/* Top Intro Card */}
                                                <div className="p-8 bg-zinc-900/30 border border-white/10 rounded-[2.5rem] relative overflow-hidden shadow-2xl space-y-6 group backdrop-blur-md">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 rounded-full blur-3xl group-hover:bg-neon-green/10 transition-all duration-700" />
                                                    <div className="flex flex-col items-start gap-2 relative z-10">
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles size={14} className="text-neon-green" />
                                                            <p className="text-[9px] font-black text-neon-green uppercase tracking-[0.4em]">Batch Automation</p>
                                                        </div>
                                                        <h2 className="text-xl font-black uppercase tracking-tighter italic text-white leading-tight">AI Bulk Orchestrator<span className="text-neon-green">.</span></h2>
                                                        <p className="text-[11px] font-medium text-gray-400 leading-relaxed">
                                                            Paste raw unstructured requirements or client requests. The generator parses each request and creates a fully formatted document complete with financials, timeline, and deliverables.
                                                        </p>
                                                    </div>

                                                    <div className="space-y-4 relative z-10">
                                                        <div className="flex flex-col gap-1.5 px-1">
                                                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">First Page Title (Default: PROPOSAL PLAN)</label>
                                                            <input 
                                                                type="text"
                                                                value={bulkCampaignName}
                                                                onChange={e => setBulkCampaignName(e.target.value)}
                                                                placeholder="PROPOSAL PLAN"
                                                                className="w-full bg-black/60 border border-white/10 focus:border-neon-green/40 focus:shadow-[0_0_15px_rgba(57,255,20,0.1)] rounded-2xl px-4 h-12 text-xs font-bold text-white outline-none placeholder:text-gray-700 transition-all shadow-inner"
                                                            />
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center px-1">
                                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Raw Input Data / Client Prompts</label>
                                                                <span className="text-[8px] font-black text-neon-green bg-neon-green/10 px-2.5 py-0.5 rounded-full border border-neon-green/20">
                                                                    {parsedPrompts.length} Prompts Detected
                                                                </span>
                                                            </div>
                                                            <textarea 
                                                                value={bulkRawText}
                                                                onChange={e => setBulkRawText(e.target.value)}
                                                                rows={5}
                                                                placeholder="Example:&#10;Client: Apex Events | Project: Summer Music Festival | Duration: 2 Days | Requirements: Full stage sound and lighting setup, 40k budget.&#10;---&#10;Client: Nova Tech | Project: Annual Gala | Duration: 1 Evening | Requirements: LED video walls, corporate AV, and livestreaming, 120k budget."
                                                                className="w-full bg-black/60 border border-white/10 focus:border-neon-green/40 focus:shadow-[0_0_15px_rgba(57,255,20,0.1)] rounded-2xl p-4 text-xs font-medium text-white outline-none resize-y placeholder:text-gray-700 leading-relaxed shadow-inner transition-all"
                                                            />
                                                        </div>

                                                        {parsedPrompts.length > 0 && (
                                                            <div className="space-y-2 relative z-10 pt-2 animate-fade-in">
                                                                <div className="flex items-center justify-between px-1">
                                                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Parsed Prompts Queue</label>
                                                                    <span className="text-[7px] font-black text-neon-green/70 uppercase tracking-wider">Separate using '---' line break</span>
                                                                </div>
                                                                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-hide">
                                                                    {parsedPrompts.map((pText, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2.5 p-3 bg-black/60 border border-white/5 rounded-2xl text-[10px] text-zinc-300 hover:border-white/10 transition-all font-mono leading-normal">
                                                                            <span className="text-neon-green font-black select-none">{String(idx + 1).padStart(2, '0')}.</span>
                                                                            <span className="truncate flex-1">{pText}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>


                                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 relative z-10">
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                            <Cpu size={14} className="text-neon-green" />
                                                            <span>Multi-Threaded AI Pulse</span>
                                                        </div>

                                                        <button 
                                                            onClick={handleBulkGenerate}
                                                            disabled={isBulkGenerating || !bulkRawText.trim()}
                                                            className="w-full sm:w-auto px-6 py-3 bg-neon-green text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-[0_5px_15px_rgba(57,255,20,0.2)] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none disabled:hover:scale-100 flex items-center justify-center gap-2"
                                                        >
                                                            {isBulkGenerating ? (
                                                                <>
                                                                    <RefreshCw className="animate-spin" size={12} />
                                                                    <span>Generating {bulkProgress.current}/{bulkProgress.total}...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles size={12} />
                                                                    <span>Execute Batch</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {isBulkGenerating && (
                                                        <div className="space-y-1.5 relative z-10 pt-2">
                                                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-gray-400">
                                                                <span>AI Pulse Progress ({bulkProgress.current} of {bulkProgress.total})</span>
                                                                <span className="text-neon-green">{Math.round((bulkProgress.current / bulkProgress.total) * 100) || 0}%</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                                                                <div 
                                                                    className="h-full bg-neon-green rounded-full transition-all duration-500 shadow-[0_0_8px_#39FF14]"
                                                                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Generated Bulk Proposals Grid */}
                                                {bulkProposals.length > 0 && (
                                                    <div className="space-y-6 pt-4 border-t border-white/5">
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                                                                    <h3 className="text-lg font-black uppercase tracking-tight italic text-white">Generated Vault</h3>
                                                                </div>
                                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{bulkProposals.length} Proposals Ready</p>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={generateAllBulkPDFs}
                                                                    disabled={isSaving}
                                                                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                                >
                                                                    {isSaving ? <RefreshCw className="animate-spin" size={12} /> : <Download size={12} />}
                                                                    <span>Export All</span>
                                                                </button>
                                                                <button 
                                                                    onClick={handleSaveAllBulk}
                                                                    disabled={isSaving}
                                                                    className="px-4 py-2.5 bg-neon-green text-black rounded-xl text-[9px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(57,255,20,0.2)] hover:scale-105 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                                >
                                                                    {isSaving ? <RefreshCw className="animate-spin" size={12} /> : <Save size={12} />}
                                                                    <span>Save All</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-4">
                                                            {bulkProposals.map((prop, idx) => (
                                                                <div 
                                                                    key={idx}
                                                                    onClick={() => setSelectedBulkIndex(idx)}
                                                                    className={cn(
                                                                        "p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col gap-4 relative group overflow-hidden",
                                                                        selectedBulkIndex === idx 
                                                                            ? "bg-zinc-900 border-neon-green shadow-lg scale-[1.01]" 
                                                                            : "bg-zinc-900/30 border-white/5 hover:border-white/10 hover:bg-zinc-900/50"
                                                                    )}
                                                                >
                                                                    {selectedBulkIndex === idx && (
                                                                        <div className="absolute top-0 left-0 w-1 h-full bg-neon-green shadow-[0_0_8px_#39FF14]" />
                                                                    )}

                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <div className="space-y-1 min-w-0">
                                                                            <h4 className="text-sm font-black text-white uppercase tracking-tight truncate leading-tight">
                                                                                {prop.clientName || `Client 0${idx+1}`}
                                                                            </h4>
                                                                            <p className="text-[10px] font-bold text-gray-400 italic truncate">
                                                                                {prop.campaignName || `Project 0${idx+1}`}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neon-green">
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
                                                                                className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                                                            >
                                                                                <X size={12} />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] font-bold text-gray-500">
                                                                        <div className="flex items-center gap-2">
                                                                            <span>Duration: {prop.campaignDuration || '3 Months'}</span>
                                                                        </div>
                                                                        <span className={cn(
                                                                            "text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                                                                            selectedBulkIndex === idx ? "text-neon-green" : "text-gray-500 group-hover:text-white"
                                                                        )}>
                                                                            <span>{selectedBulkIndex === idx ? 'Editing' : 'Select'}</span>
                                                                            <ArrowRight size={10} />
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                {/* Message Stream */}
                                                <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 relative z-10 flex flex-col min-h-0">
                                                    {/* Welcome card if only initial message */}
                                                    {messages.length === 1 && (
                                                        <div className="my-auto py-2 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-3">
                                                            <div className="relative">
                                                                <div className="absolute -inset-1 bg-gradient-to-r from-neon-green via-neon-blue to-purple-500 rounded-full blur opacity-30 animate-pulse" />
                                                                <div className="relative w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center">
                                                                    <Sparkles size={16} className="text-neon-green" />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <h4 className="text-sm font-black uppercase tracking-tight italic text-white">AI Document Orchestrator</h4>
                                                                <p className="text-[10px] text-gray-400 leading-normal font-medium">
                                                                    Describe your requirements below to draft a complete proposal in seconds.
                                                                </p>
                                                            </div>

                                                            {/* Suggestions Grid */}
                                                            <div className="w-full space-y-2 pt-1">
                                                                <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest block">Suggested Blueprints</span>
                                                                <div className="grid grid-cols-1 gap-1.5">
                                                                    {suggestions.map((s, idx) => (
                                                                        <button
                                                                            type="button"
                                                                            key={idx}
                                                                            onClick={() => setPromptText(s)}
                                                                            className="w-full text-left py-2 px-3.5 bg-white/[0.02] border border-white/5 hover:border-neon-green/20 hover:bg-neon-green/5 rounded-2xl text-[10px] font-bold text-gray-400 hover:text-white transition-all duration-300 leading-normal group"
                                                                        >
                                                                            <span className="text-neon-green group-hover:translate-x-1 inline-block transition-transform mr-1.5">→</span>
                                                                            {s}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Chat Messages */}
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
                                                                    m.sender === 'user' ? "text-gray-400" : "text-neon-green"
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
                                                                <Sparkles size={14} className="text-neon-green animate-spin shrink-0" />
                                                                <span className="font-bold uppercase tracking-wider text-[10px] text-neon-green flex-1 truncate">
                                                                    {STAGE_MESSAGES[generationStage]?.text || "Synthesizing document..."}
                                                                </span>
                                                                <span className="text-[9px] font-mono text-zinc-500 font-bold shrink-0">
                                                                    {generationTime}s
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-neon-green transition-all duration-500" 
                                                                    style={{ width: `${generationProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div ref={chatEndRef} />
                                                </div>

                                                {/* Prompt container wrapped in .gemini-border-wrap */}
                                                <div className="mt-auto pt-4 bg-transparent shrink-0">
                                                    {/* WhatsApp quoted context container */}
                                                    {refinementContext && (
                                                        <div className="px-4 py-3 bg-zinc-900/80 border-l-4 border-neon-green rounded-r-2xl flex items-center justify-between gap-4 mb-3 border border-white/5 border-l-0 shadow-lg relative overflow-hidden group">
                                                            <div className="absolute inset-0 bg-neon-green/5 opacity-40" />
                                                            <div className="min-w-0 relative z-10">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-neon-green block mb-0.5">Refining: {refinementContext.fieldLabel}</span>
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
                                                    <div className="gemini-border-wrap shadow-[0_15px_40px_rgba(57,255,20,0.15)] relative">
                                                        <div className="bg-[#050505] rounded-[1.4rem] p-3 flex items-end gap-3">
                                                            <textarea
                                                                value={promptText}
                                                                onChange={e => setPromptText(e.target.value)}
                                                                placeholder={refinementContext ? `Ask AI to refine "${refinementContext.fieldLabel}"...` : "Describe the proposal you want to generate or modify..."}
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
                                                                className="p-3 bg-neon-green text-black rounded-xl hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-20 disabled:scale-100 flex items-center justify-center shadow-lg"
                                                            >
                                                                {isGenerating ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
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
                                                <div className="relative group/refine w-full">
                                                    <input value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 pl-6 pr-12 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" placeholder="Organization Name" />
                                                    <button type="button" onClick={() => handleRefineClick('clientName', 'Client Entity', formData.clientName)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-neon-green hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Project Name</label>
                                                </div>
                                                <div className="relative group/refine w-full">
                                                    <input value={formData.campaignName} onChange={e => setFormData({...formData, campaignName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 pl-6 pr-12 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" placeholder="Project or Event Title" />
                                                    <button type="button" onClick={() => handleRefineClick('campaignName', 'Project Name', formData.campaignName)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-neon-green hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Client Address</label>
                                                    <VisibilityToggle field="clientAddress" />
                                                </div>
                                                <div className="relative group/refine w-full">
                                                    <input value={formData.clientAddress} onChange={e => setFormData({...formData, clientAddress: e.target.value})} className={cn("w-full bg-zinc-900 border border-white/10 h-16 pl-6 pr-12 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all", isHidden('clientAddress') && "opacity-30")} placeholder="Business Location" />
                                                    <button type="button" onClick={() => handleRefineClick('clientAddress', 'Client Address', formData.clientAddress)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-neon-green hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Timeline / Duration</label>
                                                <div className="relative group/refine w-full">
                                                    <input value={formData.campaignDuration} onChange={e => setFormData({...formData, campaignDuration: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 pl-6 pr-12 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all" placeholder="e.g. 15th - 20th Oct or 3 Months" />
                                                    <button type="button" onClick={() => handleRefineClick('campaignDuration', 'Timeline / Duration', formData.campaignDuration)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-neon-green hover:text-white rounded-xl hover:scale-105 z-10" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                </div>
                                            </div>
                                        </div>
                                            <div className="space-y-4 relative group/editor group/refine">
                                                <div className="relative w-full">
                                                    <StudioRichEditor 
                                                        label="Cover Memorandum"
                                                        value={formData.coverDescription} 
                                                        onChange={val => setFormData({...formData, coverDescription: val})} 
                                                        placeholder="Cover page description for this proposal..." 
                                                        minHeight="180px"
                                                        accentColor="neon-green"
                                                        className={cn(isHidden('coverDescription') && 'opacity-30')}
                                                    />
                                                    <button type="button" onClick={() => handleRefineClick('coverDescription', 'Cover Memorandum', formData.coverDescription)} className="absolute right-4 top-12 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-neon-green hover:text-white rounded-xl hover:scale-105 z-[70]" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                </div>
                                            </div>
                                    </div>
                                )}
                                {activeTab === '2' && (
                                     <div className="space-y-12">
                                         <div className="grid grid-cols-2 gap-4">
                                             <Input label="Section Title" value={formData.strategyTitle ?? 'EXECUTIVE SUMMARY'} onChange={(e) => setFormData({ ...formData, strategyTitle: e.target.value })} placeholder="EXECUTIVE SUMMARY" />
                                             <Input label="Section Subtitle" value={formData.strategySub ?? 'STRATEGIC OUTLINE'} onChange={(e) => setFormData({ ...formData, strategySub: e.target.value })} placeholder="STRATEGIC OUTLINE" />
                                         </div>
                                         <div className="space-y-4 relative group/editor group/refine">
                                             <div className="relative w-full">
                                                 <MultiPageRichEditor 
                                                     label="Executive Summary"
                                                     value={formData.overview} 
                                                     onChange={val => setFormData({...formData, overview: val})} 
                                                     placeholder="Strategic vision..." 
                                                     minHeight="200px"
                                                     accentColor="neon-green"
                                                     className={cn(isHidden('overview') && 'opacity-30')}
                                                 />
                                                 <button type="button" onClick={() => handleRefineClick('overview', 'Executive Summary', formData.overview)} className="absolute right-4 top-12 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-neon-green hover:text-white rounded-xl hover:scale-105 z-[70]" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                             </div>
                                         </div>
                                         <div className="space-y-4 relative group/editor group/refine">
                                             <div className="relative w-full">
                                                 <StudioRichEditor 
                                                     label="Primary Objective"
                                                     value={formData.primaryGoal} 
                                                     onChange={val => setFormData({...formData, primaryGoal: val})} 
                                                     placeholder="Project Goal..." 
                                                     minHeight="120px"
                                                     accentColor="neon-green"
                                                     className={cn(isHidden('primaryGoal') && 'opacity-30')}
                                                 />
                                                 <button type="button" onClick={() => handleRefineClick('primaryGoal', 'Primary Objective', formData.primaryGoal)} className="absolute right-4 top-12 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-neon-green hover:text-white rounded-xl hover:scale-105 z-[70]" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                             </div>
                                         </div>
                                     </div>
                                 )}
                                 {activeTab === '3' && (
                                     <div className="space-y-12">
                                         <div className="grid grid-cols-2 gap-4">
                                             <Input label="Section Title" value={formData.scopeTitle ?? 'SCOPE OF WORK'} onChange={(e) => setFormData({ ...formData, scopeTitle: e.target.value })} placeholder="SCOPE OF WORK" />
                                             <Input label="Section Subtitle" value={formData.scopeSub ?? 'RESOURCE DELIVERABLES'} onChange={(e) => setFormData({ ...formData, scopeSub: e.target.value })} placeholder="RESOURCE DELIVERABLES" />
                                         </div>
                                         <div className="space-y-4 relative group/editor group/refine">
                                             <div className="relative w-full">
                                                 <MultiPageRichEditor 
                                                     label="Scope of Work"
                                                     value={formData.scopeOfWork} 
                                                     onChange={val => setFormData({...formData, scopeOfWork: val})} 
                                                     placeholder="Use bullet points for each scope item. Group under headings." 
                                                     minHeight="400px"
                                                     accentColor="neon-green"
                                                     className={cn(isHidden('scopeOfWork') && 'opacity-30')}
                                                 />
                                                 <button type="button" onClick={() => handleRefineClick('scopeOfWork', 'Scope of Work', formData.scopeOfWork)} className="absolute right-4 top-12 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-neon-green hover:text-white rounded-xl hover:scale-105 z-[70]" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                             </div>
                                         </div>
                                     </div>
                                 )}
                                 {activeTab === '4' && (
                                     <div className="space-y-16">
                                         <div className="grid grid-cols-2 gap-4 px-2">
                                             <Input label="Section Title" value={formData.proposalTitle ?? 'DELIVERABLES'} onChange={(e) => setFormData({ ...formData, proposalTitle: e.target.value })} placeholder="DELIVERABLES" />
                                             <Input label="Section Subtitle" value={formData.proposalSub ?? 'PROJECT INVENTORY'} onChange={(e) => setFormData({ ...formData, proposalSub: e.target.value })} placeholder="PROJECT INVENTORY" />
                                         </div>
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
                                                            <div className="relative group/refine w-full">
                                                                <input value={d.item} onChange={e => { const updated = [...formData.deliverables]; updated[idx] = {...d, item: e.target.value}; setFormData({...formData, deliverables: updated}); }} className="w-full bg-transparent border-b border-white/10 pb-2 pr-8 text-sm font-bold outline-none focus:border-neon-green/40 transition-all text-white placeholder:text-gray-600" placeholder="Deliverable description..." />
                                                                <button type="button" onClick={() => handleRefineClick(`deliverables[${idx}].item`, `Deliverable ${idx + 1}`, d.item)} className="absolute right-2 bottom-2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-1 text-neon-green hover:text-white rounded-lg hover:scale-105 z-10" title="Refine with AI"><Sparkles size={11} className="animate-pulse" /></button>
                                                            </div>
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
                                                        <div className="relative group/refine flex-1">
                                                            <input value={r.description} onChange={e => { const updated = [...formData.clientRequirements]; updated[idx] = {...r, description: e.target.value}; setFormData({...formData, clientRequirements: updated}); }} className="w-full bg-transparent border-none pr-8 text-sm font-bold outline-none text-white placeholder:text-gray-600" placeholder="What the client needs to provide..." />
                                                            <button type="button" onClick={() => handleRefineClick(`clientRequirements[${idx}].description`, `Client Requirement ${idx + 1}`, r.description)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-1 text-neon-green hover:text-white rounded-lg hover:scale-105 z-10" title="Refine with AI"><Sparkles size={11} className="animate-pulse" /></button>
                                                        </div>
                                                        <button 
                                                            disabled={isHidden('clientRequirements')}
                                                            onClick={() => {
                                                                const updated = (formData.clientRequirements || []).filter(item => item.id !== r.id);
                                                                setFormData({...formData, clientRequirements: updated});
                                                            }}
                                                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-xl opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeTab === '5' && (
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between px-4">
                                            <div className="flex items-center gap-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resource Inventory</label>
                                                <VisibilityToggle field="inventory" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 px-4">
                                            <Input label="Section Title" value={formData.inventoryTitle ?? 'RESOURCE INVENTORY'} onChange={(e) => setFormData({ ...formData, inventoryTitle: e.target.value })} placeholder="RESOURCE INVENTORY" />
                                            <Input label="Section Subtitle" value={formData.inventorySub ?? 'COMMERCIALS BREAKDOWN'} onChange={(e) => setFormData({ ...formData, inventorySub: e.target.value })} placeholder="COMMERCIALS BREAKDOWN" />
                                        </div>

                                        <div className={cn("space-y-8 transition-opacity", isHidden('inventory') && "opacity-30")}>
                                            {/* Manage Columns Section */}
                                            <div className="bg-[#0b0b0c]/40 border border-white/5 rounded-3xl p-6 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[10px] font-black text-neon-green uppercase tracking-widest">Table Architecture</p>
                                                        <h4 className="text-sm font-black text-white uppercase tracking-wider">Configure Columns</h4>
                                                    </div>
                                                    <button 
                                                        disabled={isHidden('inventory')}
                                                        type="button"
                                                        onClick={() => {
                                                            const cols = formData.tableColumns || [...defaultColumns];
                                                            const newColKey = `custom_${Date.now()}`;
                                                            const updatedCols = [...cols, { key: newColKey, label: 'New Column' }];
                                                            setFormData({ ...formData, tableColumns: updatedCols });
                                                            const updatedItems = items.map(item => ({ ...item, [newColKey]: '' }));
                                                            setItems(updatedItems);
                                                        }}
                                                        className="px-3 py-1.5 bg-neon-green/10 border border-neon-green/20 text-neon-green hover:bg-neon-green hover:text-black transition-all rounded-xl text-[9px] font-black uppercase tracking-wider disabled:opacity-30"
                                                    >
                                                        + Add Column
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {(formData.tableColumns || defaultColumns).map((col, cIdx) => {
                                                        const isProtected = ['description', 'qty', 'price'].includes(col.key);
                                                        const colType = col.type || 'text';
                                                        const typeInfo = COLUMN_TYPES.find(t => t.value === colType) || COLUMN_TYPES[0];
                                                        const nextType = COLUMN_TYPES[(COLUMN_TYPES.findIndex(t => t.value === colType) + 1) % COLUMN_TYPES.length].value;
                                                        return (
                                                            <div 
                                                                key={col.key} 
                                                                draggable={!isHidden('inventory')}
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.setData('text/plain', cIdx);
                                                                }}
                                                                onDragOver={(e) => {
                                                                    e.preventDefault();
                                                                }}
                                                                onDrop={(e) => {
                                                                    e.preventDefault();
                                                                    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                                                    if (sourceIndex === cIdx) return;
                                                                    const cols = [...(formData.tableColumns || defaultColumns)];
                                                                    const [draggedCol] = cols.splice(sourceIndex, 1);
                                                                    cols.splice(cIdx, 0, draggedCol);
                                                                    setFormData({ ...formData, tableColumns: cols });
                                                                }}
                                                                className={cn(
                                                                    "inline-flex items-center gap-1 bg-black/50 border border-white/10 pl-1.5 pr-1 py-1 rounded-full transition-all group/col",
                                                                    !isHidden('inventory') ? "cursor-grab active:cursor-grabbing hover:border-neon-green/30 hover:bg-neon-green/5" : ""
                                                                )}
                                                            >
                                                                {!isHidden('inventory') && (
                                                                    <GripVertical size={10} className="text-gray-600 shrink-0 select-none" />
                                                                )}
                                                                {/* Type badge — click to cycle */}
                                                                <button
                                                                    type="button"
                                                                    disabled={isHidden('inventory') || isProtected}
                                                                    onClick={() => {
                                                                        const cols = [...(formData.tableColumns || defaultColumns)];
                                                                        let newLabel = col.label;
                                                                        if (nextType === 'amount' && (col.label === 'New Column' || !col.label)) {
                                                                            newLabel = 'Amount (INR)';
                                                                        }
                                                                        cols[cIdx] = { ...col, type: nextType, label: newLabel };
                                                                        setFormData({ ...formData, tableColumns: cols });
                                                                    }}
                                                                    title={`Type: ${typeInfo.label} — click to change`}
                                                                    className={cn(
                                                                        "shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-black transition-all",
                                                                        colType === 'amount' ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' :
                                                                        colType === 'number' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                                        'bg-white/5 text-gray-500 border border-white/10',
                                                                        isProtected ? 'opacity-40 cursor-default' : 'hover:scale-110 cursor-pointer'
                                                                    )}
                                                                >
                                                                    {typeInfo.icon}
                                                                </button>
                                                                <input
                                                                    disabled={isHidden('inventory')}
                                                                    type="text"
                                                                    value={col.label}
                                                                    onChange={e => {
                                                                        const cols = [...(formData.tableColumns || defaultColumns)];
                                                                        cols[cIdx] = { ...col, label: e.target.value };
                                                                        setFormData({ ...formData, tableColumns: cols });
                                                                    }}
                                                                    className="bg-transparent border-none text-[10px] font-bold text-white/80 outline-none focus:text-neon-green w-auto min-w-[40px]"
                                                                    style={{ width: `${Math.max(40, col.label.length * 7)}px` }}
                                                                    placeholder="Column"
                                                                    draggable
                                                                    onDragStart={(e) => {
                                                                        e.stopPropagation();
                                                                    }}
                                                                />
                                                                {!isProtected && (
                                                                    <button
                                                                        disabled={isHidden('inventory')}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const cols = (formData.tableColumns || defaultColumns).filter(c => c.key !== col.key);
                                                                            setFormData({ ...formData, tableColumns: cols });
                                                                            const updatedItems = items.map(item => {
                                                                                const copy = { ...item };
                                                                                delete copy[col.key];
                                                                                return copy;
                                                                            });
                                                                            setItems(updatedItems);
                                                                        }}
                                                                        className="shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-all disabled:opacity-30"
                                                                    >
                                                                        <X size={8} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Resource Table Row list */}
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center px-4">
                                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resource Table</h4>
                                                    <button 
                                                        disabled={isHidden('inventory')} 
                                                        onClick={() => {
                                                            const newObj = { id: Date.now(), description: '', qty: 1, price: 0 };
                                                            const cols = formData.tableColumns || defaultColumns;
                                                            cols.forEach(col => {
                                                                if (!['id', 'description', 'qty', 'price'].includes(col.key)) {
                                                                    newObj[col.key] = '';
                                                                }
                                                            });
                                                            setItems([...items, newObj]);
                                                        }} 
                                                        className="p-3 bg-neon-green text-black rounded-xl hover:scale-105 transition-all shadow-xl disabled:opacity-30"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                <div className="space-y-4">
                                                    {items.map((item, idx) => {
                                                        const cols = formData.tableColumns || defaultColumns;
                                                        const descCol = cols.find(c => c.key === 'description') || { key: 'description', label: 'Resource Inventory' };
                                                        const otherCols = cols.filter(c => c.key !== 'description');
                                                        return (
                                                            <div key={item.id} className="flex flex-col gap-4 bg-zinc-900/40 p-5 rounded-3xl border border-white/5 group/refine transition-all hover:bg-zinc-900/60 relative">
                                                                <div className="flex items-start gap-4">
                                                                    <div className="flex-1 relative">
                                                                        <span className="text-[8px] font-black text-neon-green uppercase tracking-widest mb-1.5 block">{descCol.label}</span>
                                                                        <textarea 
                                                                            disabled={isHidden('inventory')} 
                                                                            value={item.description} 
                                                                            onChange={e => { const newItems = [...items]; newItems[idx].description = e.target.value; setItems(newItems); }} 
                                                                            rows={1} 
                                                                            className="w-full bg-transparent border-none p-0 pr-8 text-sm font-bold outline-none resize-none scrollbar-hide text-white placeholder:text-gray-600" 
                                                                            placeholder={`${descCol.label}...`} 
                                                                        />
                                                                        <button type="button" disabled={isHidden('inventory')} onClick={() => handleRefineClick(`items[${idx}].description`, `${descCol.label} ${idx + 1}`, item.description)} className="absolute right-2 top-[22px] opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-1 text-neon-green hover:text-white rounded-lg hover:scale-105 z-10 disabled:opacity-0" title="Refine with AI"><Sparkles size={11} className="animate-pulse" /></button>
                                                                    </div>
                                                                    <button disabled={isHidden('inventory')} onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-2 text-gray-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg disabled:opacity-30 mt-4"><Trash2 size={16} /></button>
                                                                </div>

                                                                {otherCols.length > 0 && (
                                                                    <div className="flex flex-wrap gap-4 items-end pt-2 border-t border-white/[0.03]">
                                                                        {otherCols.map(col => {
                                                                            if (col.key === 'qty') {
                                                                                return (
                                                                                    <div key={col.key} className="flex flex-col items-start w-20">
                                                                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{col.label}</span>
                                                                                        <input disabled={isHidden('inventory')} type="number" value={item.qty} onChange={e => { const newItems = [...items]; newItems[idx].qty = Number(e.target.value); setItems(newItems); }} className="w-full bg-black/40 border border-white/10 h-10 rounded-lg text-center text-xs font-black outline-none focus:border-neon-green/50 text-white" />
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            if (col.key === 'price') {
                                                                                return (
                                                                                    <div key={col.key} className="flex flex-col items-start w-32">
                                                                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{col.label}</span>
                                                                                        <div className="relative w-full">
                                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neon-green">₹</span>
                                                                                            <input disabled={isHidden('inventory')} type="number" value={item.price} onChange={e => { const newItems = [...items]; newItems[idx].price = Number(e.target.value); setItems(newItems); }} className="w-full bg-black/40 border border-white/10 h-10 pl-7 pr-3 rounded-lg text-right text-xs font-black text-neon-green outline-none focus:border-neon-green/50" />
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            // Custom column — render based on type
                                                                            const colType = col.type || 'text';
                                                                            return (
                                                                                <div key={col.key} className={cn("flex flex-col items-start", (colType === 'amount' || colType === 'number') ? 'w-32' : 'min-w-[120px] flex-1')}>
                                                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{col.label}</span>
                                                                                    {colType === 'amount' ? (
                                                                                        <div className="relative w-full">
                                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neon-green">₹</span>
                                                                                            <input
                                                                                                disabled={isHidden('inventory')}
                                                                                                type="number"
                                                                                                value={item[col.key] || ''}
                                                                                                onChange={e => {
                                                                                                    const newItems = [...items];
                                                                                                    newItems[idx][col.key] = e.target.value === '' ? '' : Number(e.target.value);
                                                                                                    setItems(newItems);
                                                                                                }}
                                                                                                className="w-full bg-black/40 border border-white/10 h-10 pl-7 pr-3 rounded-lg text-right text-xs font-black text-neon-green outline-none focus:border-neon-green/50"
                                                                                                placeholder="0"
                                                                                            />
                                                                                        </div>
                                                                                    ) : colType === 'number' ? (
                                                                                        <input
                                                                                            disabled={isHidden('inventory')}
                                                                                            type="number"
                                                                                            value={item[col.key] || ''}
                                                                                            onChange={e => {
                                                                                                const newItems = [...items];
                                                                                                newItems[idx][col.key] = e.target.value === '' ? '' : Number(e.target.value);
                                                                                                setItems(newItems);
                                                                                            }}
                                                                                            className="w-full bg-black/40 border border-white/10 h-10 rounded-lg text-center text-xs font-black outline-none focus:border-neon-green/50 text-white"
                                                                                            placeholder="0"
                                                                                        />
                                                                                    ) : (
                                                                                        <input
                                                                                            disabled={isHidden('inventory')}
                                                                                            type="text"
                                                                                            value={item[col.key] || ''}
                                                                                            onChange={e => {
                                                                                                const newItems = [...items];
                                                                                                newItems[idx][col.key] = e.target.value;
                                                                                                setItems(newItems);
                                                                                            }}
                                                                                            className="w-full bg-black/40 border border-white/10 h-10 px-4 rounded-lg text-xs font-bold outline-none focus:border-neon-green/50 text-white placeholder:text-gray-700"
                                                                                            placeholder={`${col.label}...`}
                                                                                        />
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeTab === '6' && (
                                     <div className="flex flex-col gap-8">
                                         <div className="grid grid-cols-2 gap-4 bg-zinc-900/20 p-6 border border-white/5 rounded-[2rem]">
                                             <Input label="Section Title" value={formData.commercialsTitle ?? 'COMMERCIAL TERMS'} onChange={(e) => setFormData({ ...formData, commercialsTitle: e.target.value })} placeholder="COMMERCIAL TERMS" />
                                             <Input label="Section Subtitle" value={formData.commercialsSub ?? 'SETTLEMENT & SIGN-OFF'} onChange={(e) => setFormData({ ...formData, commercialsSub: e.target.value })} placeholder="SETTLEMENT & SIGN-OFF" />
                                         </div>
                                         <style>{`
                                             .custom-range-slider {
                                                 -webkit-appearance: none;
                                                 appearance: none;
                                                 background: transparent;
                                                 width: 100%;
                                             }
                                             .custom-range-slider::-webkit-slider-runnable-track {
                                                 background: rgba(0, 0, 0, 0.6);
                                                 border: 1px solid rgba(255, 255, 255, 0.05);
                                                 height: 6px;
                                                 border-radius: 9999px;
                                             }
                                             .custom-range-slider::-webkit-slider-thumb {
                                                 -webkit-appearance: none;
                                                 appearance: none;
                                                 background: #39ff14;
                                                 border: 3px solid #09090b;
                                                 width: 16px;
                                                 height: 16px;
                                                 border-radius: 50%;
                                                 margin-top: -6px;
                                                 box-shadow: 0 0 10px #39ff14;
                                                 cursor: pointer;
                                                 transition: all 0.2s ease-in-out;
                                             }
                                             .custom-range-slider::-webkit-slider-thumb:hover {
                                                 transform: scale(1.2);
                                                 box-shadow: 0 0 15px #39ff14;
                                             }
                                         `}</style>
                                         {/* Row 1: Commercial Matrix & Terms (Financial Center) */}
                                         <div className="p-8 md:p-10 bg-zinc-900/40 border border-white/5 rounded-[3rem] space-y-10 relative overflow-hidden">
                                             <div className="flex items-center justify-between">
                                                 <div className="space-y-1">
                                                      <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">Commercial Center.</h3>
                                                      <p className="text-[10px] font-bold text-neon-green uppercase tracking-[0.3em]">Financial Matrix & Settlement</p>
                                                 </div>
                                                 <div className="p-3 bg-neon-green/10 rounded-2xl border border-neon-green/20">
                                                      <CreditCard size={20} className="text-neon-green" />
                                                 </div>
                                             </div>

                                             <div className="flex flex-col gap-6">
                                                  {/* Row 1: Taxation & Advance side by side */}
                                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                                                       {/* Taxation (GST) Card */}
                                                       <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-zinc-900/90 border border-white/10 hover:border-neon-green/20 rounded-3xl p-4 h-56 flex flex-col justify-between transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.5)] group/card">
                                                           {/* Glow effect on hover */}
                                                           <div className="absolute -top-12 -left-12 w-24 h-24 bg-neon-green/5 blur-2xl group-hover/card:bg-neon-green/10 transition-all rounded-full pointer-events-none" />
                                                           
                                                           <div className="flex items-center gap-2 z-10">
                                                               <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover/card:border-neon-green/20 group-hover/card:bg-neon-green/5 transition-all">
                                                                   <span className="text-xs font-black text-gray-400 group-hover/card:text-neon-green transition-colors font-mono">%</span>
                                                               </div>
                                                               <div className="flex-1">
                                                                   <div className="flex items-center gap-1.5">
                                                                       <p className="text-[10px] font-black text-neon-green uppercase tracking-wider leading-none">Taxation</p>
                                                                       <span className={cn(
                                                                           "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                                           formData.showGst ? "bg-neon-green animate-pulse shadow-[0_0_8px_#39ff14]" : "bg-zinc-700"
                                                                       )} />
                                                                   </div>
                                                                   <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">GST Setup</p>
                                                               </div>
                                                           </div>

                                                           <div className="flex flex-col gap-2 z-10 w-full">
                                                               <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                                                                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">GST Active</span>
                                                                   <button 
                                                                       type="button"
                                                                       onClick={() => setFormData({...formData, showGst: !formData.showGst})} 
                                                                       className={cn(
                                                                           "relative w-9 h-5 rounded-full transition-all duration-300 ease-in-out flex items-center px-0.5 border shrink-0 shadow-inner",
                                                                           formData.showGst ? "bg-neon-green/20 border-neon-green/40 shadow-[0_0_8px_rgba(57,255,20,0.2)]" : "bg-zinc-950 border-white/10"
                                                                       )}
                                                                   >
                                                                       <div className={cn(
                                                                           "w-3.5 h-3.5 rounded-full shadow-lg transition-all duration-300 ease-in-out", 
                                                                           formData.showGst ? "translate-x-4 bg-neon-green shadow-[0_0_8px_#39ff14]" : "translate-x-0 bg-gray-600"
                                                                       )} />
                                                                   </button>
                                                               </div>

                                                               {formData.showGst ? (
                                                                   <div className="space-y-1.5">
                                                                       <div className="flex items-center justify-between bg-black/50 border border-white/5 rounded-xl px-3 py-1 focus-within:border-neon-green/30">
                                                                           <span className="text-[8px] font-black text-gray-500 uppercase">Rate (%)</span>
                                                                           <input 
                                                                               type="number" 
                                                                               min="0" 
                                                                               max="100" 
                                                                               value={formData.gstRate} 
                                                                               onChange={e => setFormData({...formData, gstRate: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))})} 
                                                                               className="bg-transparent font-mono text-xs font-black text-neon-green w-10 text-right outline-none" 
                                                                           />
                                                                       </div>
                                                                       {/* Presets */}
                                                                       <div className="flex gap-1">
                                                                           {[5, 12, 18, 28].map((rate) => (
                                                                               <button
                                                                                   key={rate}
                                                                                   type="button"
                                                                                   onClick={() => setFormData({...formData, gstRate: rate})}
                                                                                   className={cn(
                                                                                       "flex-1 py-1 rounded-lg text-[9px] font-mono font-bold transition-all border",
                                                                                       formData.gstRate === rate 
                                                                                           ? "bg-neon-green text-black border-neon-green font-black shadow-[0_0_10px_rgba(57,255,20,0.2)]" 
                                                                                           : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                                                                                   )}
                                                                               >
                                                                                   {rate}%
                                                                               </button>
                                                                           ))}
                                                                       </div>
                                                                   </div>
                                                               ) : (
                                                                   <div className="w-full h-[58px] relative bg-black/40 rounded-xl border border-dashed border-white/5 flex items-center justify-center gap-1.5 overflow-hidden transition-all duration-300 group-hover/card:border-white/10">
                                                                       <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />
                                                                       <Lock size={11} className="text-gray-600" />
                                                                       <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Tax Exempt</span>
                                                                   </div>
                                                               )}
                                                           </div>
                                                       </div>

                                                       {/* Advance Request Card */}
                                                       <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-zinc-900/90 border border-white/10 hover:border-neon-green/20 rounded-3xl p-4 h-56 flex flex-col justify-between transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.5)] group/card">
                                                           {/* Glow effect on hover */}
                                                           <div className="absolute -top-12 -left-12 w-24 h-24 bg-neon-green/5 blur-2xl group-hover/card:bg-neon-green/10 transition-all rounded-full pointer-events-none" />
                                                           
                                                           <div className="flex items-center gap-2 z-10">
                                                               <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover/card:border-neon-green/20 group-hover/card:bg-neon-green/5 transition-all">
                                                                   <Zap size={14} className="text-gray-400 group-hover/card:text-neon-green transition-colors" />
                                                               </div>
                                                               <div className="flex-1">
                                                                   <div className="flex items-center gap-1.5">
                                                                       <p className="text-[10px] font-black text-neon-green uppercase tracking-wider leading-none">Advance</p>
                                                                       <span className={cn(
                                                                           "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                                           formData.advanceRequested > 0 ? "bg-neon-green animate-pulse shadow-[0_0_8px_#39ff14]" : "bg-zinc-700"
                                                                       )} />
                                                                   </div>
                                                                   <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Commencement</p>
                                                               </div>
                                                           </div>

                                                           <div className="flex flex-col gap-2 z-10 w-full">
                                                               <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                                                                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Retainer</span>
                                                                   <span className="text-[9px] font-black text-neon-green bg-neon-green/10 border border-neon-green/20 px-2 py-0.5 rounded-lg select-none font-mono tracking-widest">
                                                                       {formData.advanceRequested}%
                                                                   </span>
                                                               </div>

                                                               <div className="space-y-1.5">
                                                                   <div className="relative flex items-center w-full px-1 py-1">
                                                                       <input 
                                                                           type="range" 
                                                                           min="0" 
                                                                           max="100" 
                                                                           step="5" 
                                                                           value={formData.advanceRequested} 
                                                                           onChange={e => setFormData({...formData, advanceRequested: parseInt(e.target.value)})} 
                                                                           className="w-full custom-range-slider cursor-pointer outline-none" 
                                                                       />
                                                                   </div>
                                                                   {/* Presets */}
                                                                   <div className="flex gap-1">
                                                                       {[0, 30, 50, 100].map((pct) => (
                                                                           <button
                                                                               key={pct}
                                                                               type="button"
                                                                               onClick={() => setFormData({...formData, advanceRequested: pct})}
                                                                               className={cn(
                                                                                   "flex-1 py-1 rounded-lg text-[9px] font-mono font-bold transition-all border",
                                                                                   formData.advanceRequested === pct 
                                                                                       ? "bg-neon-green text-black border-neon-green font-black shadow-[0_0_10px_rgba(57,255,20,0.2)]" 
                                                                                       : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                                                                               )}
                                                                           >
                                                                               {pct}%
                                                                           </button>
                                                                       ))}
                                                                   </div>
                                                               </div>
                                                           </div>
                                                       </div>

                                                        {/* Visibility Card */}
                                                         <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-zinc-900/90 border border-white/10 hover:border-neon-green/20 rounded-3xl p-4 h-72 flex flex-col justify-between transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.5)] group/card">
                                                             {/* Glow effect on hover */}
                                                             <div className="absolute -top-12 -left-12 w-24 h-24 bg-neon-green/5 blur-2xl group-hover/card:bg-neon-green/10 transition-all rounded-full pointer-events-none" />
                                                             
                                                             <div className="flex items-center gap-2 z-10">
                                                                 <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover/card:border-neon-green/20 group-hover/card:bg-neon-green/5 transition-all">
                                                                     <EyeOff size={14} className="text-gray-400 group-hover/card:text-neon-green transition-colors" />
                                                                 </div>
                                                                 <div className="flex-1">
                                                                     <div className="flex items-center gap-1.5">
                                                                         <p className="text-[10px] font-black text-neon-green uppercase tracking-wider leading-none">Visibility</p>
                                                                         <span className={cn(
                                                                             "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                                             (formData.hideTotalColumn || formData.showPaymentDetails === false) ? "bg-neon-green animate-pulse shadow-[0_0_8px_#39ff14]" : "bg-zinc-700"
                                                                         )} />
                                                                     </div>
                                                                     <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Commercial Layouts</p>
                                                                 </div>
                                                             </div>

                                                             <div className="flex flex-col gap-2.5 z-10 w-full">
                                                                 <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                                                                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Hide Totals</span>
                                                                     <button 
                                                                         type="button"
                                                                         onClick={() => setFormData({...formData, hideTotalColumn: !formData.hideTotalColumn})} 
                                                                         className={cn(
                                                                             "relative w-9 h-5 rounded-full transition-all duration-300 ease-in-out flex items-center px-0.5 border shrink-0 shadow-inner",
                                                                             formData.hideTotalColumn ? "bg-neon-green/20 border-neon-green/40 shadow-[0_0_8px_rgba(57,255,20,0.2)]" : "bg-zinc-950 border-white/10"
                                                                         )}
                                                                     >
                                                                         <div className={cn(
                                                                             "w-3.5 h-3.5 rounded-full shadow-lg transition-all duration-300 ease-in-out", 
                                                                             formData.hideTotalColumn ? "translate-x-4 bg-neon-green shadow-[0_0_8px_#39ff14]" : "translate-x-0 bg-gray-600"
                                                                         )} />
                                                                     </button>
                                                                 </div>
                                                                 <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                                                                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Hide Settlement</span>
                                                                     <button 
                                                                         type="button"
                                                                         onClick={() => setFormData({...formData, showPaymentDetails: formData.showPaymentDetails === false ? true : false})} 
                                                                         className={cn(
                                                                             "relative w-9 h-5 rounded-full transition-all duration-300 ease-in-out flex items-center px-0.5 border shrink-0 shadow-inner",
                                                                             formData.showPaymentDetails === false ? "bg-neon-green/20 border-neon-green/40 shadow-[0_0_8px_rgba(57,255,20,0.2)]" : "bg-zinc-950 border-white/10"
                                                                         )}
                                                                     >
                                                                         <div className={cn(
                                                                             "w-3.5 h-3.5 rounded-full shadow-lg transition-all duration-300 ease-in-out", 
                                                                             formData.showPaymentDetails === false ? "translate-x-4 bg-neon-green shadow-[0_0_8px_#39ff14]" : "translate-x-0 bg-gray-600"
                                                                         )} />
                                                                     </button>
                                                                 </div>
                                                                 <div className="text-[7.5px] text-gray-500 uppercase tracking-wide leading-relaxed px-1">
                                                                     Toggle visibility of cost summary columns and bank/UPI settlement details on the commercials page.
                                                                 </div>
                                                             </div>
                                                         </div>
                                                  </div>

                                                  {/* Row 2: Live Valuation Summary */}
                                                  <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-zinc-900/90 border border-white/10 hover:border-neon-green/20 rounded-3xl p-6 md:p-8 flex flex-col gap-6 transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.5)] group/card w-full min-w-0">
                                                            {/* Glow */}
                                                            <div className="absolute -top-12 -left-12 w-24 h-24 bg-neon-green/5 blur-2xl group-hover/card:bg-neon-green/10 transition-all rounded-full pointer-events-none" />

                                                            {/* Header */}
                                                            <div className="flex items-center gap-2.5 z-10 border-b border-white/5 pb-4">
                                                                <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover/card:border-neon-green/20 group-hover/card:bg-neon-green/5 transition-all shrink-0">
                                                                    <CreditCard size={18} className="text-gray-400 group-hover/card:text-neon-green transition-colors" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-black text-neon-green uppercase tracking-widest leading-none">Summary</p>
                                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Valuation Matrix</p>
                                                                </div>
                                                            </div>

                                                            {/* Flat 12-column Layout */}
                                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6 items-start z-10 w-full">
                                                                
                                                                {/* Column 1: Details */}
                                                                <div className="lg:col-span-4 col-span-12 flex flex-col gap-4 min-w-0 h-full justify-between">
                                                                    <div className="space-y-4">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-black text-neon-green/60 uppercase tracking-widest">01 / Ledger Details</span>
                                                                            <span className="text-[8px] text-gray-500 uppercase mt-0.5">Base & GST calculations</span>
                                                                        </div>
                                                                        
                                                                        <div className="space-y-3">
                                                                            {/* Subtotal */}
                                                                            <div className="flex justify-between items-baseline py-2.5 border-b border-white/5">
                                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subtotal</span>
                                                                                <span className="font-mono text-sm font-black text-white">₹{subtotal.toLocaleString()}</span>
                                                                            </div>

                                                                            {/* GST */}
                                                                            {formData.showGst ? (
                                                                                <div className="flex justify-between items-baseline py-2.5 border-b border-white/5">
                                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                                                        GST ({formData.gstRate}%)
                                                                                        {hasOverride && <span className="text-amber-400 text-[8px] font-bold uppercase tracking-wider">› override</span>}
                                                                                    </span>
                                                                                    <span className="font-mono text-sm font-black text-white">₹{gstAmount.toLocaleString()}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex justify-between items-baseline py-2.5 border-b border-white/5 opacity-40">
                                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">GST (Exempt)</span>
                                                                                    <span className="font-mono text-sm font-black text-gray-500">₹0</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-[8px] text-gray-600 font-mono uppercase tracking-widest mt-2">
                                                                        ID: {formData.campaignNumber || 'DRAFT'}
                                                                    </div>
                                                                </div>

                                                                {/* Column 2: Estimate Display */}
                                                                <div className="lg:col-span-5 col-span-12 flex flex-col gap-4 min-w-0">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-black text-neon-green/60 uppercase tracking-widest">02 / Estimate Total</span>
                                                                        <span className="text-[8px] text-gray-500 uppercase mt-0.5">Final payable amount</span>
                                                                    </div>
                                                                    
                                                                    <div className="relative overflow-hidden bg-black/60 border border-white/10 hover:border-neon-green/30 rounded-2xl px-2.5 py-4 sm:px-4 sm:py-5 flex flex-col justify-between min-h-[120px] transition-all duration-300 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] group/estimate">
                                                                        <div className="absolute inset-0 bg-[radial-gradient(rgba(57,255,20,0.015)_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />
                                                                        
                                                                        <div className="flex justify-between items-center z-10">
                                                                            <span className="text-[8px] font-black text-neon-green uppercase tracking-widest">
                                                                                {hasOverride ? 'Override Total' : 'Estimate (Incl. Tax)'}
                                                                            </span>
                                                                            {hasOverride && (
                                                                                <span className="text-[7px] font-black text-amber-400 uppercase bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
                                                                                    Manual
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="mt-2 z-10">
                                                                            {(() => {
                                                                                const totalStr = `₹${totalAmount.toLocaleString()}`;
                                                                                const getFontSize = (str) => {
                                                                                    const len = str.length;
                                                                                    if (len >= 12) return "text-sm sm:text-base lg:text-sm xl:text-lg";
                                                                                    if (len >= 10) return "text-base sm:text-lg lg:text-base xl:text-xl";
                                                                                    if (len >= 8) return "text-lg sm:text-xl lg:text-lg xl:text-2xl";
                                                                                    return "text-xl sm:text-2xl lg:text-xl xl:text-3xl";
                                                                                };
                                                                                return (
                                                                                    <span className={cn(
                                                                                        "font-mono font-black text-neon-green drop-shadow-[0_0_15px_#39ff14] select-all whitespace-nowrap block tracking-tighter",
                                                                                        getFontSize(totalStr)
                                                                                    )}>
                                                                                        {totalStr}
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>

                                                                        {hasOverride && (
                                                                            <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center text-[8px] text-gray-500 z-10 uppercase tracking-wider">
                                                                                <span>Auto-Calc</span>
                                                                                <span className="font-mono line-through">₹{computedTotal.toLocaleString()}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Column 3: Parameters */}
                                                                <div className="lg:col-span-3 col-span-12 flex flex-col gap-5 min-w-0">
                                                                    
                                                                    {/* Subtotal Source */}
                                                                    {(() => {
                                                                        const allCols = formData.tableColumns || defaultColumns;
                                                                        const calcCols = allCols.filter(c => c.key !== 'description' && (c.type === 'amount' || c.type === 'number' || c.key === 'price'));
                                                                        return (
                                                                            <div className="space-y-2">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-[9px] font-black text-neon-green/60 uppercase tracking-widest">03 / Source Column</span>
                                                                                    <span className="text-[8px] text-gray-500 uppercase mt-0.5">Summing source for subtotal</span>
                                                                                </div>
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {calcCols.map(c => (
                                                                                        <button
                                                                                            key={c.key}
                                                                                            type="button"
                                                                                            onClick={() => setFormData({ ...formData, totalSourceColumn: c.key })}
                                                                                            className={cn(
                                                                                                "px-2.5 py-1 rounded-xl text-[8px] font-black transition-all border whitespace-nowrap uppercase tracking-wider",
                                                                                                totalSrcCol === c.key
                                                                                                    ? 'bg-neon-green text-black border-neon-green shadow-[0_0_8px_rgba(57,255,20,0.3)]'
                                                                                                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                                                                                            )}
                                                                                        >
                                                                                            {c.label}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* Override subtotal */}
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[9px] font-black text-neon-green/60 uppercase tracking-widest">Subtotal Override</span>
                                                                                <span className="text-[8px] text-gray-500 uppercase mt-0.5">Manual subtotal control</span>
                                                                            </div>
                                                                            
                                                                            {hasOverride && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setFormData({ ...formData, totalOverride: null })}
                                                                                    className="flex items-center gap-1 text-[8px] font-black text-red-400 hover:text-red-300 uppercase tracking-wider"
                                                                                >
                                                                                    <RotateCcw size={8} />
                                                                                    <span>Reset</span>
                                                                                </button>
                                                                            )}
                                                                        </div>

                                                                        {hasOverride ? (
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex items-center gap-2 bg-amber-400/5 border border-amber-400/20 rounded-xl px-3 py-1.5 focus-within:border-amber-400/40 transition-all">
                                                                                    <span className="text-xs font-black text-amber-400 font-mono">₹</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={formData.totalOverride}
                                                                                        onChange={e => setFormData({ ...formData, totalOverride: e.target.value === '' ? null : e.target.value })}
                                                                                        className="bg-transparent text-xs font-black text-amber-300 font-mono outline-none w-full min-w-0"
                                                                                        placeholder={subtotal.toString()}
                                                                                        min="0"
                                                                                        step="100"
                                                                                    />
                                                                                </div>
                                                                                <p className="text-[7px] font-bold text-amber-400/80 uppercase tracking-wider leading-tight">
                                                                                    ⚠️ GST updates on override base.
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setFormData({ ...formData, totalOverride: subtotal })}
                                                                                className="w-full flex items-center justify-center gap-1.5 py-2 bg-white/5 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-[8px] font-black uppercase rounded-xl transition-all tracking-wider"
                                                                            >
                                                                                <Pencil size={8} className="text-gray-500" />
                                                                                <span>Activate Override</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                  </div>

                                                  {/* Full Width Editor */}
                                                  <div className="space-y-6 w-full">
                                                      <div className="relative group/editor group/refine w-full">
                                                          <div className="relative w-full">
                                                              <StudioRichEditor 
                                                                  label="Settlement Terms"
                                                                  value={formData.terms} 
                                                                  onChange={val => setFormData({...formData, terms: val})} 
                                                                  placeholder="Payment milestones, terms of settlement..." 
                                                                  minHeight="260px"
                                                                  accentColor="neon-green"
                                                                  className={cn(isHidden('terms') && 'opacity-30')}
                                                              />
                                                              <button type="button" disabled={isHidden('terms')} onClick={() => handleRefineClick('terms', 'Settlement Terms', formData.terms)} className="absolute right-4 top-12 opacity-0 group-hover/refine:opacity-100 focus:opacity-100 transition-all p-2 bg-zinc-950 border border-white/10 text-neon-green hover:text-white rounded-xl hover:scale-105 z-[70] disabled:opacity-0" title="Refine with AI"><Sparkles size={14} className="animate-pulse" /></button>
                                                          </div>
                                                      </div>
                                                      
                                                      {/* Settlement Details */}
                                                      <div className="space-y-4 w-full">
                                                          <div className="flex justify-between items-center px-2">
                                                              <span className="text-[10px] font-black text-neon-green uppercase tracking-widest">Settlement Account Details</span>
                                                              <button 
                                                                  type="button" 
                                                                  onClick={() => setFormData({...formData, showPaymentDetails: formData.showPaymentDetails === false ? true : false})} 
                                                                  className={cn(
                                                                      "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all", 
                                                                      formData.showPaymentDetails !== false 
                                                                          ? "bg-neon-green/10 text-neon-green border-neon-green/20" 
                                                                          : "bg-red-500/10 text-red-500 border-red-500/20"
                                                                  )}
                                                              >
                                                                  {formData.showPaymentDetails !== false ? 'Enabled' : 'Disabled'}
                                                              </button>
                                                          </div>
                                                          <div className={cn("relative w-full transition-opacity duration-300", formData.showPaymentDetails === false && "opacity-30")}>
                                                              <textarea 
                                                                  value={formData.paymentDetails || ''} 
                                                                  onChange={e => setFormData({...formData, paymentDetails: e.target.value})} 
                                                                  disabled={formData.showPaymentDetails === false}
                                                                  className="w-full bg-black/60 border border-white/10 p-6 rounded-[2rem] font-mono font-bold text-xs text-white outline-none focus:border-neon-green/40 transition-all min-h-[120px]" 
                                                                  placeholder="Account Name, Number, IFSC, UPI, etc..." 
                                                              />
                                                          </div>
                                                      </div>
                                                  </div>
                                             </div>
                                         </div>
                                         <div className="border border-white/5 rounded-[3rem] overflow-hidden bg-white/[0.01]">
                                             {/* Collapsible Header */}
                                             <div 
                                                 className="flex items-center justify-between p-8 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-all"
                                                 onClick={() => setIsSignaturesCollapsed(!isSignaturesCollapsed)}
                                             >
                                                 <div className="flex items-center gap-6">
                                                     <div className="w-14 h-14 rounded-2xl bg-neon-green/10 flex items-center justify-center border border-neon-green/20 shrink-0">
                                                         <ShieldCheck size={28} className="text-neon-green" />
                                                     </div>
                                                     <div className="space-y-1">
                                                         <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em]">Authorization</p>
                                                         <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-none">Signatures & Seals.</h3>
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                                                     <VisibilityToggle field="signatures" />
                                                     <button 
                                                         onClick={() => setIsSignaturesCollapsed(!isSignaturesCollapsed)}
                                                         className="p-2 text-gray-400 hover:text-white transition-colors"
                                                     >
                                                         <span className="text-[10px] font-black uppercase tracking-widest">{isSignaturesCollapsed ? 'Expand +' : 'Collapse -'}</span>
                                                     </button>
                                                 </div>
                                             </div>

                                             {/* Collapsible Content */}
                                             <div className={cn(
                                                 "transition-all duration-500 overflow-hidden",
                                                 isSignaturesCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100 border-t border-white/5"
                                             )}>
                                                  <div className="p-8 md:p-10 space-y-10">
                                                      {/* Sub-toggles: Official Seal and Digital Sign */}
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                          <button 
                                                              type="button"
                                                              onClick={() => setFormData({...formData, showSeal: !formData.showSeal})} 
                                                              className={cn(
                                                                  "h-20 w-full rounded-[1.8rem] border transition-all duration-500 group/btn relative overflow-hidden flex items-center px-6 gap-5",
                                                                  formData.showSeal 
                                                                      ? "bg-zinc-950/60 text-neon-green border-neon-green/30 shadow-[0_0_20px_rgba(57,255,20,0.1)]" 
                                                                      : "bg-white/[0.02] text-gray-500 border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                                                              )}
                                                          >
                                                              {formData.showSeal && (
                                                                  <span className="absolute top-3.5 right-3.5 flex h-2 w-2">
                                                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                                                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
                                                                  </span>
                                                              )}
                                                              <div className={cn(
                                                                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0",
                                                                  formData.showSeal ? "bg-neon-green/10 border border-neon-green/20" : "bg-white/5 border border-white/5"
                                                              )}>
                                                                  <Stamp size={22} className={cn("transition-transform duration-500 group-hover/btn:rotate-12", formData.showSeal ? "text-neon-green" : "text-gray-500")} />
                                                              </div>
                                                              <div className="text-left">
                                                                  <p className={cn("text-[8px] font-black uppercase tracking-[0.2em] mb-0.5", formData.showSeal ? "text-neon-green/50" : "text-gray-600")}>Protocol</p>
                                                                  <p className={cn("text-[11px] font-black uppercase tracking-widest", formData.showSeal ? "text-white" : "text-gray-400")}>Official Seal</p>
                                                              </div>
                                                          </button>

                                                          <button 
                                                              type="button"
                                                              onClick={() => setFormData({...formData, showSignatures: !formData.showSignatures})} 
                                                              className={cn(
                                                                  "h-20 w-full rounded-[1.8rem] border transition-all duration-500 group/btn relative overflow-hidden flex items-center px-6 gap-5",
                                                                  formData.showSignatures 
                                                                      ? "bg-zinc-950/60 text-neon-green border-neon-green/30 shadow-[0_0_20px_rgba(57,255,20,0.1)]" 
                                                                      : "bg-white/[0.02] text-gray-500 border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                                                              )}
                                                          >
                                                              {formData.showSignatures && (
                                                                  <span className="absolute top-3.5 right-3.5 flex h-2 w-2">
                                                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                                                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
                                                                  </span>
                                                              )}
                                                              <div className={cn(
                                                                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0",
                                                                  formData.showSignatures ? "bg-neon-green/10 border border-neon-green/20" : "bg-white/5 border border-white/5"
                                                              )}>
                                                                  <PenTool size={22} className={cn("transition-transform duration-500 group-hover/btn:rotate-12", formData.showSignatures ? "text-neon-green" : "text-gray-500")} />
                                                              </div>
                                                              <div className="text-left">
                                                                  <p className={cn("text-[8px] font-black uppercase tracking-[0.2em] mb-0.5", formData.showSignatures ? "text-neon-green/50" : "text-gray-600")}>Protocol</p>
                                                                  <p className={cn("text-[11px] font-black uppercase tracking-widest", formData.showSignatures ? "text-white" : "text-gray-400")}>Digital Signatures</p>
                                                              </div>
                                                          </button>
                                                      </div>

                                                      {/* Signatory Identity Form */}
                                                      <div className="p-8 bg-white/[0.01] border border-white/5 rounded-[2rem] hover:border-white/10 transition-colors">
                                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                              <div className="relative bg-black/60 border border-white/5 focus-within:border-neon-green/30 focus-within:shadow-[0_0_15px_rgba(57,255,20,0.03)] rounded-[1.2rem] px-5 pt-6 pb-2.5 transition-all duration-300">
                                                                  <span className="absolute top-2.5 left-5 text-[8px] font-black text-gray-500 uppercase tracking-[0.25em] pointer-events-none">Authorized Representative</span>
                                                                  <input value={formData.senderName} onChange={e => setFormData({...formData, senderName: e.target.value})} placeholder="Full Legal Name" className="w-full bg-transparent border-none text-sm font-black text-white outline-none p-0 pt-0.5 transition-all placeholder:text-zinc-800 caret-neon-green" />
                                                              </div>
                                                              <div className="relative bg-black/60 border border-white/5 focus-within:border-neon-green/30 focus-within:shadow-[0_0_15px_rgba(57,255,20,0.03)] rounded-[1.2rem] px-5 pt-6 pb-2.5 transition-all duration-300">
                                                                  <span className="absolute top-2.5 left-5 text-[8px] font-black text-gray-500 uppercase tracking-[0.25em] pointer-events-none">Designation</span>
                                                                  <input value={formData.senderDesignation} onChange={e => setFormData({...formData, senderDesignation: e.target.value})} placeholder="e.g. Director of Operations" className="w-full bg-transparent border-none text-sm font-black text-white outline-none p-0 pt-0.5 transition-all placeholder:text-zinc-800 caret-neon-green" />
                                                              </div>
                                                          </div>
                                                      </div>

                                                      {/* Pad & Seals */}
                                                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                                          {/* Signature Pad */}
                                                          <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] relative overflow-hidden group">
                                                              <div className="flex items-center justify-between mb-6">
                                                                  <h4 className="text-lg font-black text-white uppercase tracking-tighter italic">Signature Capture.</h4>
                                                                  {formData.providerSignature && (
                                                                      <button onClick={() => setFormData({...formData, providerSignature: null})} className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline">Clear Pad</button>
                                                                  )}
                                                              </div>
                                                              <div onClick={() => setIsSignatureModalOpen(true)} className="h-48 bg-black/80 rounded-[2rem] border border-white/5 flex items-center justify-center cursor-pointer hover:border-neon-green/40 transition-all relative overflow-hidden group/pad">
                                                                  {/* Dotted Grid Background */}
                                                                  <div className="absolute inset-0 bg-[radial-gradient(rgba(57,255,20,0.05)_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
                                                                  {/* Corner Brackets */}
                                                                  <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-neon-green/30 rounded-tl-sm pointer-events-none" />
                                                                  <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-neon-green/30 rounded-tr-sm pointer-events-none" />
                                                                  <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-neon-green/30 rounded-bl-sm pointer-events-none" />
                                                                  <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-neon-green/30 rounded-br-sm pointer-events-none" />
                                                                  
                                                                  {formData.providerSignature ? (
                                                                      <img src={formData.providerSignature} className="max-h-[70%] object-contain invert brightness-200 drop-shadow-[0_0_30px_rgba(57,255,20,0.4)] relative z-10" alt="Signature" />
                                                                  ) : (
                                                                      <div className="flex flex-col items-center gap-3 text-white/5 group-hover/pad:text-neon-green/30 transition-all relative z-10">
                                                                          <PenTool size={24} />
                                                                          <p className="text-[9px] font-black uppercase tracking-[0.5em]">Execute Pad</p>
                                                                      </div>
                                                                  )}
                                                              </div>
                                                          </div>

                                                          {/* Integrity Hub */}
                                                          <div className="p-8 bg-white/[0.01] border border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 relative overflow-hidden group">
                                                              <div className="absolute inset-0 bg-neon-green/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                              <div className="relative shrink-0 flex items-center justify-center w-40 h-40">
                                                                  <div className="relative z-10 scale-90">
                                                                      <DocumentSeal className="w-24 h-24 drop-shadow-[0_0_35px_rgba(57,255,20,0.25)]" />
                                                                  </div>
                                                                  {/* Concentric Rotating Rings */}
                                                                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute w-32 h-32 border border-dashed border-neon-green/30 rounded-full pointer-events-none" />
                                                                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute w-36 h-36 border border-dotted border-neon-green/15 rounded-full pointer-events-none" />
                                                                  {/* Decorative Tech Crosshairs */}
                                                                  <div className="absolute w-full h-[1px] bg-white/[0.03] pointer-events-none" />
                                                                  <div className="absolute h-full w-[1px] bg-white/[0.03] pointer-events-none" />
                                                              </div>
                                                              <div className="text-center space-y-3.5 w-full z-10">
                                                                  <div className="space-y-1">
                                                                      <p className="text-[9px] font-black text-neon-green uppercase tracking-[0.4em] drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">Execution Reference</p>
                                                                      <p className="text-[7px] font-bold text-gray-600 uppercase tracking-widest">AUTHENTICATION DECRYPT HASH</p>
                                                                  </div>
                                                                  <div className="relative group/ref bg-black/60 px-6 py-3.5 rounded-[1.5rem] border border-white/5 group-hover:border-neon-green/30 transition-all duration-300 inline-block w-full max-w-[260px]">
                                                                      {/* Tech Corner Accents */}
                                                                      <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-neon-green/30" />
                                                                      <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-neon-green/30" />
                                                                      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-neon-green/30" />
                                                                      <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-neon-green/30" />
                                                                      
                                                                      <h2 className="text-md lg:text-lg font-black text-white tracking-[0.08em] italic uppercase font-mono">
                                                                          NB-<span className="text-neon-green">{formData.campaignNumber || 'PROPOSAL-26'}</span>
                                                                      </h2>
                                                                      <div className="flex items-center justify-center gap-1 mt-1.5 text-[6.5px] font-black text-gray-500 uppercase tracking-widest">
                                                                          <span className="w-1 h-1 bg-neon-green rounded-full animate-ping" />
                                                                          <span>SECURE SYSTEM SIGNED</span>
                                                                      </div>
                                                                  </div>
                                                              </div>
                                                          </div>
                                                      </div>
                                             </div>
                                         </div>
                                     </div>
                                     </div>
                                 )}
                                {activeTab === '7' && (
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center px-4">
                                            <div className="space-y-1">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custom Proposal Pages</h4>
                                                <p className="text-xs text-gray-600">Add blank pages with custom titles and content to your document.</p>
                                            </div>
                                            <button 
                                                disabled={isHidden('customPages')}
                                                onClick={() => {
                                                    const currentCustom = formData.customPages || [];
                                                    setFormData({
                                                        ...formData,
                                                        customPages: [
                                                            ...currentCustom,
                                                            { id: String(Date.now()), title: 'New Custom Page', content: '' }
                                                        ]
                                                    });
                                                }}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-neon-green text-black rounded-xl font-black uppercase text-[9px] tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-30"
                                            >
                                                <Plus size={14} /> Add Blank Page
                                            </button>
                                        </div>

                                        <div className={cn("space-y-8 transition-opacity", isHidden('customPages') && "opacity-30")}>
                                            {!(formData.customPages && formData.customPages.length > 0) ? (
                                                <div className="p-16 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center text-gray-600 space-y-4">
                                                    <FileText size={36} className="mx-auto text-gray-700" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No custom pages added yet</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-8">
                                                    {(formData.customPages || []).map((cp, idx) => (
                                                        <div key={cp.id} className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] space-y-6 relative group">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-neon-green/60 uppercase tracking-widest bg-neon-green/5 border border-neon-green/10 px-3 py-1 rounded-full">Custom Page {String(idx + 1).padStart(2, '0')}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {/* Move Up */}
                                                                    <button 
                                                                        type="button" 
                                                                        disabled={isHidden('customPages') || idx === 0}
                                                                        onClick={() => moveCustomPage(idx, 'up')}
                                                                        className="p-2 text-gray-500 hover:text-neon-green hover:bg-neon-green/5 transition-all rounded-xl disabled:opacity-20 disabled:hover:bg-transparent"
                                                                        title="Move Up"
                                                                    >
                                                                        <ChevronUp size={16} />
                                                                    </button>
                                                                    
                                                                    {/* Move Down */}
                                                                    <button 
                                                                        type="button" 
                                                                        disabled={isHidden('customPages') || idx === (formData.customPages || []).length - 1}
                                                                        onClick={() => moveCustomPage(idx, 'down')}
                                                                        className="p-2 text-gray-500 hover:text-neon-green hover:bg-neon-green/5 transition-all rounded-xl disabled:opacity-20 disabled:hover:bg-transparent"
                                                                        title="Move Down"
                                                                    >
                                                                        <ChevronDown size={16} />
                                                                    </button>

                                                                    {/* Delete */}
                                                                    <button 
                                                                        disabled={isHidden('customPages')}
                                                                        onClick={() => {
                                                                            const updated = (formData.customPages || []).filter(p => p.id !== cp.id);
                                                                            setFormData({ ...formData, customPages: updated });
                                                                        }}
                                                                        className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-xl"
                                                                        title="Delete Page"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                <div className="space-y-2">
                                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Page Title</label>
                                                                    <input 
                                                                        disabled={isHidden('customPages')}
                                                                        value={cp.title} 
                                                                        onChange={e => {
                                                                            const updated = [...(formData.customPages || [])];
                                                                            updated[idx] = { ...cp, title: e.target.value };
                                                                            setFormData({ ...formData, customPages: updated });
                                                                        }} 
                                                                        placeholder="Page Title (e.g. Terms of Service, Project Timelines)" 
                                                                        className="h-14 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-sm font-black px-5 text-white outline-none transition-all placeholder:text-gray-800" 
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Page Subtitle</label>
                                                                    <input 
                                                                        disabled={isHidden('customPages')}
                                                                        value={cp.subtitle || ''} 
                                                                        onChange={e => {
                                                                            const updated = [...(formData.customPages || [])];
                                                                            updated[idx] = { ...cp, subtitle: e.target.value };
                                                                            setFormData({ ...formData, customPages: updated });
                                                                        }} 
                                                                        placeholder="Page Subtitle (e.g. Additional Specifications)" 
                                                                        className="h-14 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-sm font-black px-5 text-white outline-none transition-all placeholder:text-gray-800" 
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Placement / Order</label>
                                                                    <div className="relative">
                                                                        <select
                                                                            disabled={isHidden('customPages')}
                                                                            value={cp.insertAfter || 'default'}
                                                                            onChange={e => {
                                                                                const updated = [...(formData.customPages || [])];
                                                                                updated[idx] = { ...cp, insertAfter: e.target.value };
                                                                                setFormData({ ...formData, customPages: updated });
                                                                            }}
                                                                            className="h-14 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-black px-5 text-white outline-none transition-all appearance-none cursor-pointer"
                                                                        >
                                                                            <option value="default" className="bg-zinc-950">Before Commercials (Default)</option>
                                                                            <option value="cover" className="bg-zinc-950">After Cover Page</option>
                                                                            <option value="strategy" className="bg-zinc-950">After Strategic Framework</option>
                                                                            <option value="scope" className="bg-zinc-950">After Project Scope</option>
                                                                            <option value="proposal" className="bg-zinc-950">After Deliverables</option>
                                                                            <option value="table" className="bg-zinc-950">After Resource Table</option>
                                                                            <option value="commercials" className="bg-zinc-950">After Commercials (Last Page)</option>
                                                                        </select>
                                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                                            <ChevronDown size={14} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                                <div className="relative group/editor group/refine">
                                                                    <MultiPageRichEditor 
                                                                        label="Page Content"
                                                                        value={cp.content} 
                                                                        onChange={val => {
                                                                            const updated = [...(formData.customPages || [])];
                                                                            updated[idx] = { ...cp, content: val };
                                                                            setFormData({ ...formData, customPages: updated });
                                                                        }} 
                                                                        placeholder="Enter the body of your custom page..." 
                                                                        minHeight="260px"
                                                                        accentColor="neon-green"
                                                                    />
                                                                    <div className="absolute right-4 top-12 flex items-center gap-2 opacity-0 group-hover/refine:opacity-100 focus-within/refine:opacity-100 transition-all z-[70]">
                                                                        <button 
                                                                            type="button" 
                                                                            disabled={isHidden('customPages')} 
                                                                            onClick={() => handleRefineClick(`customPages[${idx}].content`, `Custom Page ${idx + 1} Content`, cp.content)} 
                                                                            className="p-2 bg-zinc-950 border border-white/10 text-neon-green hover:text-white rounded-xl hover:scale-105 shadow-lg disabled:opacity-0" 
                                                                            title="Refine with AI"
                                                                        >
                                                                            <Sparkles size={14} className="animate-pulse" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                             </motion.div>
                         </AnimatePresence>

                        {/* Section Navigation Footer */}
                        {activeTab !== 'ai' && (
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
                        )}


                    </div>
                </main>

                {/* Doc Preview */}
                <section className={cn(
                    "lg:static lg:flex fixed inset-0 z-[60] lg:z-0 bg-[#050505] lg:bg-zinc-900/10 flex-col overflow-hidden shrink-0 transition-transform duration-500 lg:translate-x-0",
                    isExpandedPreview ? "w-full lg:w-full border-l-0" : "w-full lg:w-[400px] 2xl:w-[600px] border-l border-white/5",
                    showPreviewMobile ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                )}>
                    <div className="h-20 lg:h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowPreviewMobile(false)} className="lg:hidden p-3 bg-white/5 rounded-xl border border-white/5"><ArrowLeft size={18} /></button>
                            <button 
                                onClick={() => setIsExpandedPreview(!isExpandedPreview)} 
                                className="hidden lg:flex p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all items-center gap-2 text-[9px] font-black uppercase tracking-wider h-10 px-3"
                                title={isExpandedPreview ? "Exit Fullscreen Preview" : "Fullscreen Preview"}
                            >
                                {isExpandedPreview ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                <span>{isExpandedPreview ? "Collapse" : "Expand"}</span>
                            </button>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Document Live View</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5">
                                <button onClick={() => setUserZoom(Math.max(0.5, userZoom - 0.1))} className="p-1.5 hover:bg-white/5 rounded text-gray-400 transition-colors"><Minus size={12} /></button>
                                <span className="text-[10px] font-black text-gray-500 px-2 min-w-[40px] text-center">{Math.round(userZoom * 100)}%</span>
                                <button onClick={() => setUserZoom(Math.min(2, userZoom + 0.1))} className="p-1.5 hover:bg-white/5 rounded text-gray-400 transition-colors"><Plus size={12} /></button>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setCurrentPreviewPage(Math.max(0, currentPreviewPage - 1))} disabled={currentPreviewPage === 0} className="p-2.5 bg-white/5 rounded-xl disabled:opacity-20 hover:bg-white/10 transition-all"><ChevronLeft size={16} /></button>
                                <span className="text-[10px] font-black text-neon-green">{currentPreviewPage + 1} / {paginatedPages.length}</span>
                                <button onClick={() => setCurrentPreviewPage(Math.min(paginatedPages.length - 1, currentPreviewPage + 1))} disabled={currentPreviewPage === paginatedPages.length - 1} className="p-2.5 bg-white/5 rounded-xl disabled:opacity-20 hover:bg-white/10 transition-all"><ChevronRight size={16} /></button>
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
                                            <div className="space-y-16 py-8">
                                                <div className="mb-10 space-y-3">
                                                    <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                        {formData.strategyTitle ?? 'EXECUTIVE SUMMARY'}
                                                    </h3>
                                                    <div className="w-20 h-1.5 bg-neon-green" />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                        {formData.strategySub ?? 'STRATEGIC OUTLINE'}
                                                    </p>
                                                </div>
                                                {paginatedPages[currentPreviewPage]?.overviewText && (
                                                    <div className="text-lg font-medium leading-[1.7] text-gray-700 text-justify">
                                                        {renderContent(paginatedPages[currentPreviewPage]?.overviewText)}
                                                    </div>
                                                )}
                                                {paginatedPages[currentPreviewPage]?.primaryGoalText && (
                                                    <div className="pt-12">
                                                        <div className="p-12 border-2 border-black rounded-[2.5rem] space-y-6">
                                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Primary Objective</p>
                                                            <div className="text-lg font-black text-black leading-relaxed">{renderContent(paginatedPages[currentPreviewPage]?.primaryGoalText)}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'scope' && (
                                            <div className="h-full flex flex-col py-8">
                                                <div className="mb-10 space-y-3">
                                                    <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                        {formData.scopeTitle ?? 'SCOPE OF WORK'}
                                                    </h3>
                                                    <div className="w-20 h-1.5 bg-neon-green" />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                        {formData.scopeSub ?? 'RESOURCE DELIVERABLES'}
                                                    </p>
                                                </div>
                                                <div className="flex-1 flex flex-col">
                                                    {renderContent(paginatedPages[currentPreviewPage]?.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}
                                                </div>
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'proposal' && (
                                            <div className="space-y-16 py-8">
                                                <div className="mb-10 space-y-3">
                                                    <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                        {formData.proposalTitle ?? 'DELIVERABLES'}
                                                    </h3>
                                                    <div className="w-20 h-1.5 bg-neon-green" />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                        {formData.proposalSub ?? 'PROJECT INVENTORY'}
                                                    </p>
                                                </div>
                                                
                                                {paginatedPages[currentPreviewPage]?.deliverables?.length > 0 && (
                                                    <div className="space-y-6">
                                                        <table className="w-full text-left border-collapse border border-black">
                                                            <thead>
                                                                <tr className="bg-black text-[9px] font-black uppercase text-white tracking-[0.3em]">
                                                                    <th className="p-4 w-12 text-center border-r border-white/20">#</th>
                                                                    <th className="p-4 border-r border-white/20">Deliverable</th>
                                                                    <th className="p-4 text-center w-28 border-r border-white/20">Qty / Unit</th>
                                                                    <th className="p-4 text-right w-40">Timeline</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-black/10">
                                                                {paginatedPages[currentPreviewPage]?.deliverables?.map((d, i) => (
                                                                    <tr key={d.id || i} className="hover:bg-gray-50">
                                                                        <td className="p-4 text-center text-[11px] font-bold text-slate-500 border-r border-black/10">
                                                                            {String((paginatedPages[currentPreviewPage]?.startIndex || 0) + i + 1).padStart(2, '0')}
                                                                        </td>
                                                                        <td className="p-4 text-[12px] font-bold text-black border-r border-black/10">{d.item}</td>
                                                                        <td className="p-4 text-center text-[12px] font-medium text-gray-600 border-r border-black/10">{d.qty || '—'}</td>
                                                                        <td className="p-4 text-right text-[11px] font-black text-black uppercase tracking-wider">{d.timeline || '—'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {paginatedPages[currentPreviewPage]?.clientRequirements?.length > 0 && (
                                                    <div className="pt-8 border-t border-gray-100">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mb-6">Requirements From Client</p>
                                                        <div className="p-8 border-2 border-gray-200 space-y-0">
                                                            {paginatedPages[currentPreviewPage]?.clientRequirements?.map((r, i) => (
                                                                <div key={r.id || i} className={cn("flex items-start gap-4 py-4", i > 0 && "border-t border-gray-100")}>
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
                                                <div className="mb-10 space-y-3">
                                                    <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                        {formData.inventoryTitle ?? 'RESOURCE INVENTORY'}
                                                    </h3>
                                                    <div className="w-20 h-1.5 bg-neon-green" />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                        {paginatedPages[currentPreviewPage]?.tablePageIdx > 1 
                                                            ? `${formData.inventorySub ?? 'COMMERCIALS BREAKDOWN'} — Part ${paginatedPages[currentPreviewPage]?.tablePageIdx}` 
                                                            : (formData.inventorySub ?? 'COMMERCIALS BREAKDOWN')}
                                                    </p>
                                                </div>
                                                <table className="w-full text-left border-collapse border border-black">
                                          <thead>
                                              <tr className="bg-black text-[9px] font-black uppercase text-white tracking-[0.3em]">
                                                  {(formData.tableColumns || defaultColumns).map((col, cIdx, arr) => {
                                                      const colType = col.type || (col.key === 'price' ? 'amount' : (col.key === 'qty' ? 'number' : 'text'));
                                                      return (
                                                          <th 
                                                              key={col.key} 
                                                              className={cn(
                                                                  "p-4",
                                                                  cIdx < arr.length - 1 && "border-r border-white/20",
                                                                  colType === 'number' && "text-center w-24",
                                                                  colType === 'amount' && "text-right w-48"
                                                              )}
                                                          >
                                                              {col.label}
                                                          </th>
                                                      );
                                                  })}
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-black/10">
                                              {paginatedPages[currentPreviewPage]?.items?.map((item, i) => {
                                                  const cols = formData.tableColumns || defaultColumns;
                                                  return (
                                                      <tr key={i} className="hover:bg-gray-50">
                                                          {cols.map((col, cIdx) => {
                                                              const isLast = cIdx === cols.length - 1;
                                                              const tdClass = cn(
                                                                  "p-4",
                                                                  !isLast && "border-r border-black/10"
                                                              );
                                                              const colType = col.type || (col.key === 'price' ? 'amount' : (col.key === 'qty' ? 'number' : 'text'));
                                                              if (col.key === 'description') {
                                                                  return <td key={col.key} className={cn(tdClass, "text-[12px] font-bold text-black")}>{item.description || 'Asset'}</td>;
                                                              }
                                                              if (colType === 'number') {
                                                                  const val = col.key === 'qty' ? item.qty : item[col.key];
                                                                  return <td key={col.key} className={cn(tdClass, "text-center text-[12px] font-medium text-gray-600")}>{val}</td>;
                                                              }
                                                              if (colType === 'amount') {
                                                                  const val = col.key === 'price' ? item.price : Number(item[col.key] || 0);
                                                                  return <td key={col.key} className={cn(tdClass, "text-right text-[12px] font-black tracking-widest text-black font-mono")}>₹{val.toLocaleString()}</td>;
                                                              }
                                                              return <td key={col.key} className={cn(tdClass, "text-[12px] font-medium text-gray-600")}>{item[col.key] || ''}</td>;
                                                          })}
                                                      </tr>
                                                  );
                                              })}
                                          </tbody>
                                      </table>
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'custom' && (
                                            <div className="space-y-8 py-8 h-full flex flex-col justify-start">
                                                <div className="mb-10 space-y-3">
                                                    <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                        {paginatedPages[currentPreviewPage]?.title ? paginatedPages[currentPreviewPage]?.title?.toUpperCase() : "CUSTOM PAGE"}
                                                    </h3>
                                                    <div className="w-20 h-1.5 bg-neon-green" />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                        {(formData.customPages?.[paginatedPages[currentPreviewPage]?.pageIndex || 0]?.subtitle || "Additional Specifications").toUpperCase()}
                                                    </p>
                                                </div>
                                                <div className="flex-1">
                                                    {renderContent(paginatedPages[currentPreviewPage]?.content || '', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}
                                                </div>
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'terms_only' && (
                                            <div className="space-y-12 py-10 px-4">
                                                <div className="mb-10 space-y-3">
                                                    <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                        GENERAL TERMS.
                                                    </h3>
                                                    <div className="w-20 h-1.5 bg-neon-green" />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">Part {paginatedPages[currentPreviewPage]?.termsPageIdx}</p>
                                                </div>
                                                <div className="text-[12px] font-semibold text-gray-600 leading-relaxed space-y-3">
                                                    {renderContent(paginatedPages[currentPreviewPage]?.termsText)}
                                                </div>
                                            </div>
                                        )}
                                        {paginatedPages[currentPreviewPage]?.type === 'commercials' && (
                                            <div className="space-y-10 py-6 h-full flex flex-col justify-between">
                                                
                                                <div>
                                                    <div className="mb-10 space-y-3">
                                                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                            {formData.commercialsTitle ?? 'COMMERCIAL TERMS'}
                                                        </h3>
                                                        <div className="w-20 h-1.5 bg-neon-green" />
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                            {formData.commercialsSub ?? 'SETTLEMENT & SIGN-OFF'}
                                                        </p>
                                                    </div>
                                                    <div className={cn(
                                                        "grid gap-12 items-start",
                                                        formData.hideTotalColumn ? "grid-cols-1" : "grid-cols-2"
                                                    )}>
                                                        <div className="space-y-8">
                                                            {paginatedPages[currentPreviewPage]?.termsText && (
                                                                <div className="space-y-3">
                                                                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">General Terms</h4>
                                                                    <div className="text-[11px] font-semibold text-gray-600 leading-relaxed space-y-2">{renderContent(paginatedPages[currentPreviewPage]?.termsText)}</div>
                                                                </div>
                                                            )}
                                                            {paginatedPages[currentPreviewPage]?.paymentDetailsText && (
                                                                <div className="p-6 bg-gray-50 border border-gray-150 rounded-2xl space-y-2">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Settlement Details</p>
                                                                    <div className="text-[11px] font-mono font-bold text-black whitespace-pre-line leading-relaxed">{paginatedPages[currentPreviewPage]?.paymentDetailsText}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!formData.hideTotalColumn && (
                                                        <div className="space-y-4">
                                                            <div className="bg-gray-50/50 border border-gray-250/60 rounded-[2rem] p-8 space-y-6">
                                                                <div className="flex justify-between items-center pb-4 border-b border-gray-200/60">
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                                                                    <span className="text-base font-bold text-black font-mono">₹{subtotal.toLocaleString()}</span>
                                                                </div>
                                                                {formData.showGst && (
                                                                    <div className="flex justify-between items-center pb-4 border-b border-gray-200/60">
                                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">GST ({formData.gstRate}%)</span>
                                                                        <span className="text-base font-bold text-black font-mono">₹{gstAmount.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                                <div className="p-8 bg-black text-right relative overflow-hidden rounded-[1.5rem] shadow-xl">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Total Estimated Cost</p>
                                                                    <h2 className="text-3xl font-black tracking-widest text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2>
                                                                    <div className="absolute top-0 right-0 w-1.5 h-full bg-neon-green" />
                                                                </div>
                                                                {formData.advanceRequested > 0 && (
                                                                    <div className="p-6 bg-neon-green/5 border border-neon-green/20 rounded-[1.5rem] flex justify-between items-center">
                                                                        <div>
                                                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Advance Fee ({formData.advanceRequested}%)</span>
                                                                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-wider block">Due upon signature</span>
                                                                        </div>
                                                                        <span className="text-xl font-black text-black font-mono">₹{(totalAmount * formData.advanceRequested / 100).toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Authentication Layer */}
                                                {!isHidden('signatures') && (formData.showSignatures || formData.showSeal) && (
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
                                                )}
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
                                    <div className="mb-10 space-y-3">
                                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                            {formData.strategyTitle ?? 'EXECUTIVE SUMMARY'}
                                        </h3>
                                        <div className="w-20 h-1.5 bg-neon-green" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                            {formData.strategySub ?? 'STRATEGIC OUTLINE'}
                                        </p>
                                    </div>
                                    {page.overviewText && (
                                        <div className="text-lg font-medium leading-[1.7] text-gray-700 text-justify">
                                            {renderContent(page.overviewText)}
                                        </div>
                                    )}
                                    {page.primaryGoalText && (
                                        <div className="pt-12">
                                            <div className="p-12 border-2 border-black rounded-[2.5rem] space-y-6">
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Primary Objective</p>
                                                <div className="text-lg font-black text-black leading-relaxed">{renderContent(page.primaryGoalText)}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {page.type === 'scope' && (
                                <div className="h-full flex flex-col py-8">
                                    <div className="mb-10 space-y-3">
                                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                            {formData.scopeTitle ?? 'SCOPE OF WORK'}
                                        </h3>
                                        <div className="w-20 h-1.5 bg-neon-green" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                            {formData.scopeSub ?? 'RESOURCE DELIVERABLES'}
                                        </p>
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        {renderContent(page.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}
                                    </div>
                                </div>
                            )}
                            {page.type === 'proposal' && (
                                <div className="space-y-16 py-8">
                                    <div className="mb-10 space-y-3">
                                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                            {formData.proposalTitle ?? 'DELIVERABLES'}
                                        </h3>
                                        <div className="w-20 h-1.5 bg-neon-green" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                            {formData.proposalSub ?? 'PROJECT INVENTORY'}
                                        </p>
                                    </div>
                                    {page.deliverables?.length > 0 && (
                                        <div className="space-y-6">
                                            <table className="w-full text-left border-collapse border border-black">
                                                <thead>
                                                    <tr className="bg-black text-[9px] font-black uppercase text-white tracking-[0.3em]">
                                                        <th className="p-4 w-12 text-center border-r border-white/20">#</th>
                                                        <th className="p-4 border-r border-white/20">Deliverable</th>
                                                        <th className="p-4 text-center w-28 border-r border-white/20">Qty / Unit</th>
                                                        <th className="p-4 text-right w-40">Timeline</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-black/10">
                                                    {page.deliverables.map((d, i) => (
                                                        <tr key={d.id || i} className="hover:bg-gray-50">
                                                            <td className="p-4 text-center text-[11px] font-bold text-slate-500 border-r border-black/10">
                                                                {String((page.startIndex || 0) + i + 1).padStart(2, '0')}
                                                            </td>
                                                            <td className="p-4 text-[12px] font-bold text-black border-r border-black/10">{d.item}</td>
                                                            <td className="p-4 text-center text-[12px] font-medium text-gray-600 border-r border-black/10">{d.qty || '—'}</td>
                                                            <td className="p-4 text-right text-[11px] font-black text-black uppercase tracking-wider">{d.timeline || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {page.clientRequirements?.length > 0 && (
                                        <div className="pt-8 border-t border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mb-6">Requirements From Client</p>
                                            <div className="p-8 border-2 border-gray-200 space-y-0">
                                                {page.clientRequirements.map((r, i) => (
                                                    <div key={r.id || i} className={cn("flex items-start gap-4 py-4", i > 0 && "border-t border-gray-100")}>
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
                                    <div className="mb-10 space-y-3">
                                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                            {formData.inventoryTitle ?? 'RESOURCE INVENTORY'}
                                        </h3>
                                        <div className="w-20 h-1.5 bg-neon-green" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                            {page.tablePageIdx > 1 
                                                ? `${formData.inventorySub ?? 'COMMERCIALS BREAKDOWN'} — Part ${page.tablePageIdx}` 
                                                : (formData.inventorySub ?? 'COMMERCIALS BREAKDOWN')}
                                        </p>
                                    </div>
                                    <table className="w-full text-left border-collapse border border-black">
                                          <thead>
                                              <tr className="bg-black text-[9px] font-black uppercase text-white tracking-[0.3em]">
                                                  {(formData.tableColumns || defaultColumns).map((col, cIdx, arr) => {
                                                      const colType = col.type || (col.key === 'price' ? 'amount' : (col.key === 'qty' ? 'number' : 'text'));
                                                      return (
                                                          <th 
                                                              key={col.key} 
                                                              className={cn(
                                                                  "p-4",
                                                                  cIdx < arr.length - 1 && "border-r border-white/20",
                                                                  colType === 'number' && "text-center w-24",
                                                                  colType === 'amount' && "text-right w-48"
                                                              )}
                                                          >
                                                              {col.label}
                                                          </th>
                                                      );
                                                  })}
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-black/10">
                                              {page.items.map((item, i) => {
                                                  const cols = formData.tableColumns || defaultColumns;
                                                  return (
                                                      <tr key={i} className="hover:bg-gray-50">
                                                          {cols.map((col, cIdx) => {
                                                              const isLast = cIdx === cols.length - 1;
                                                              const tdClass = cn(
                                                                  "p-4",
                                                                  !isLast && "border-r border-black/10"
                                                              );
                                                              const colType = col.type || (col.key === 'price' ? 'amount' : (col.key === 'qty' ? 'number' : 'text'));
                                                              if (col.key === 'description') {
                                                                  return <td key={col.key} className={cn(tdClass, "text-[12px] font-bold text-black")}>{item.description || 'Asset'}</td>;
                                                              }
                                                              if (colType === 'number') {
                                                                  const val = col.key === 'qty' ? item.qty : item[col.key];
                                                                  return <td key={col.key} className={cn(tdClass, "text-center text-[12px] font-medium text-gray-600")}>{val}</td>;
                                                              }
                                                              if (colType === 'amount') {
                                                                  const val = col.key === 'price' ? item.price : Number(item[col.key] || 0);
                                                                  return <td key={col.key} className={cn(tdClass, "text-right text-[12px] font-black tracking-widest text-black font-mono")}>₹{val.toLocaleString()}</td>;
                                                              }
                                                              return <td key={col.key} className={cn(tdClass, "text-[12px] font-medium text-gray-600")}>{item[col.key] || ''}</td>;
                                                          })}
                                                      </tr>
                                                  );
                                              })}
                                          </tbody>
                                      </table>
                                </div>
                            )}
                            {page.type === 'custom' && (
                                <div className="space-y-8 py-8 h-full flex flex-col justify-start">
                                    <div className="mb-10 space-y-3">
                                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                            {page.title ? page.title.toUpperCase() : "CUSTOM PAGE"}
                                        </h3>
                                        <div className="w-20 h-1.5 bg-neon-green" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                            {(formData.customPages?.[page.pageIndex]?.subtitle || "Additional Specifications").toUpperCase()}
                                        </p>
                                    </div>
                                    <div className="flex-1">
                                        {renderContent(page.content || '', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}
                                    </div>
                                </div>
                            )}
                            {page.type === 'terms_only' && (
                                <div className="space-y-12 py-10 px-4">
                                    <div className="mb-10 space-y-3">
                                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                            GENERAL TERMS.
                                        </h3>
                                        <div className="w-20 h-1.5 bg-neon-green" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">Part {page.termsPageIdx}</p>
                                    </div>
                                    <div className="text-[12px] font-semibold text-gray-600 leading-relaxed space-y-3">
                                        {renderContent(page.termsText)}
                                    </div>
                                </div>
                            )}
                            {page.type === 'commercials' && (
                                 <div className="space-y-10 py-6 h-full flex flex-col justify-between">
                                     <div>
                                         <div className="mb-10 space-y-3">
                                             <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                 {formData.commercialsTitle ?? 'COMMERCIAL TERMS'}
                                             </h3>
                                             <div className="w-20 h-1.5 bg-neon-green" />
                                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                 {formData.commercialsSub ?? 'SETTLEMENT & SIGN-OFF'}
                                             </p>
                                         </div>
                                         <div className={cn(
                                             "grid gap-12 items-start",
                                             formData.hideTotalColumn ? "grid-cols-1" : "grid-cols-2"
                                         )}>
                                             <div className="space-y-8">
                                                 {page.termsText && (
                                                     <div className="space-y-3">
                                                         <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">General Terms</h4>
                                                         <div className="text-[11px] font-semibold text-gray-600 leading-relaxed space-y-2">{renderContent(page.termsText)}</div>
                                                     </div>
                                                 )}
                                                 {page.paymentDetailsText && (
                                                     <div className="p-6 bg-gray-50 border border-gray-150 rounded-2xl space-y-2">
                                                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Settlement Details</p>
                                                         <div className="text-[11px] font-mono font-bold text-black whitespace-pre-line leading-relaxed">{page.paymentDetailsText}</div>
                                                     </div>
                                                 )}
                                             </div>
                                             {!formData.hideTotalColumn && (
                                             <div className="space-y-4">
                                                 <div className="bg-gray-50/50 border border-gray-250/60 rounded-[2rem] p-8 space-y-6">
                                                     <div className="flex justify-between items-center pb-4 border-b border-gray-200/60">
                                                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                                                         <span className="text-base font-bold text-black font-mono">₹{subtotal.toLocaleString()}</span>
                                                     </div>
                                                     {formData.showGst && (
                                                         <div className="flex justify-between items-center pb-4 border-b border-gray-200/60">
                                                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">GST ({formData.gstRate}%)</span>
                                                             <span className="text-base font-bold text-black font-mono">₹{gstAmount.toLocaleString()}</span>
                                                         </div>
                                                     )}
                                                     <div className="p-8 bg-black text-right relative overflow-hidden rounded-[1.5rem] shadow-xl">
                                                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Total Estimated Cost</p>
                                                         <h2 className="text-3xl font-black tracking-widest text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2>
                                                         <div className="absolute top-0 right-0 w-1.5 h-full bg-neon-green" />
                                                     </div>
                                                     {formData.advanceRequested > 0 && (
                                                         <div className="p-6 bg-neon-green/5 border border-neon-green/20 rounded-[1.5rem] flex justify-between items-center">
                                                             <div>
                                                                 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Advance Fee ({formData.advanceRequested}%)</span>
                                                                 <span className="text-[7px] font-bold text-gray-400 uppercase tracking-wider block">Due upon signature</span>
                                                             </div>
                                                             <span className="text-xl font-black text-black font-mono">₹{(totalAmount * formData.advanceRequested / 100).toLocaleString()}</span>
                                                         </div>
                                                     )}
                                                 </div>
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