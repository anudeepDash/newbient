import React, { useRef, useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Download from 'lucide-react/dist/esm/icons/download';
import Printer from 'lucide-react/dist/esm/icons/printer';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Check from 'lucide-react/dist/esm/icons/check';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Settings from 'lucide-react/dist/esm/icons/settings';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Zap from 'lucide-react/dist/esm/icons/zap';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Globe from 'lucide-react/dist/esm/icons/globe';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Upload from 'lucide-react/dist/esm/icons/upload';
import X from 'lucide-react/dist/esm/icons/x';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Cpu from 'lucide-react/dist/esm/icons/cpu';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import { motion, AnimatePresence } from 'framer-motion';
import DocumentSeal from '../components/ui/DocumentSeal';
import SharedDocumentViewer from '../components/ui/SharedDocumentViewer';
import Sheet from '../components/admin/Sheet';
import { PanelCard, SignForm, SignedRecord, TextField, DocButton, docTheme, fmtDate } from '../components/ui/docviewer/DocKit';
import SignaturePad from '../components/ui/SignaturePad';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../lib/store';
import { isProposalExpired, proposalExpiry } from '../lib/proposals';
import useSharedDoc from '../hooks/useSharedDoc';
import { safeLocalStorage } from '../lib/storage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import SignatureModal from '../components/ui/SignatureModal';
import NotificationBell from '../components/NotificationBell';
import { getV2PaginatedPages, normalizeProposalData } from '../lib/proposalTemplateV2';
import ProposalDocumentRenderer from '../components/ui/ProposalDocumentRenderer';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { getDocumentShareMeta } from '../lib/documentPreviewUtils';

const isHtmlEmpty = (html) => {
    if (!html) return true;
    const clean = String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return clean.length === 0;
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
                                        if (partDiv.innerHTML.trim()) {
                                            currentPageDiv.appendChild(partDiv);
                                        }
                                        pages.push(currentPageDiv.innerHTML);
                                        currentPageDiv = document.createElement('div');
                                    }
                                    partDiv = document.createElement(blockTag);
                                    partDiv.innerHTML = part;
                                } else {
                                    if (j > 0) partDiv.innerHTML += '<br>' + part;
                                    else partDiv.innerHTML = part;
                                }
                            }
                            if (partDiv.innerHTML.trim()) {
                                currentPageDiv.appendChild(partDiv);
                            }
                            continue;
                        }
                    }
                    
                    if (currentPageDiv.innerHTML.trim()) {
                        pages.push(currentPageDiv.innerHTML);
                        currentPageDiv = document.createElement('div');
                        currentPageDiv.appendChild(block);
                    } else {
                        currentPageDiv.appendChild(block);
                        pages.push(currentPageDiv.innerHTML);
                        currentPageDiv = document.createElement('div');
                    }
                } else {
                    currentPageDiv.appendChild(block);
                }
            }
            
            if (currentPageDiv.innerHTML.trim()) {
                pages.push(currentPageDiv.innerHTML);
            }
            
            return pages.length > 0 ? pages : [pageContent];
        } catch (e) {
            console.error("HTML split failed, fallback:", e);
            return [pageContent];
        }
    };

    manualPages.forEach(part => {
        const subPages = splitSinglePageByHeight(part);
        finalPages.push(...subPages);
    });

    return finalPages.length > 0 ? finalPages : [''];
};
const defaultColumns = [
    { key: 'description', label: 'Resource Inventory' },
    { key: 'qty', label: 'Qty' },
    { key: 'price', label: 'Amount (INR)' }
];

const Proposal = () => {
    const { id } = useParams();
    const { updateProposalStatus, user } = useStore();
    // Read by id only: rules don't let visitors list proposals.
    const { data: liveProposal, loading: docLoading } = useSharedDoc('proposals', id);
    const [localProposal, setLocalProposal] = useState(null);
    useEffect(() => { setLocalProposal(liveProposal); }, [liveProposal]);

    const proposal = localProposal || liveProposal;

    const loading = docLoading;
    const proposalRef = useRef(null);
    const loggedVisitRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState(user?.email || '');
    const [ipAddress, setIpAddress] = useState('Detecting...');

    useEffect(() => {
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setIpAddress(data.ip))
            .catch(() => setIpAddress('Hidden/Protected'));
    }, []);
    const [signatureName, setSignatureName] = useState('');
    const [clientSignature, setClientSignature] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // In-page decline dialog (window.prompt returns null inside WhatsApp/Instagram browsers).
    const [declineOpen, setDeclineOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [isSignaturesCollapsed, setIsSignaturesCollapsed] = useState(true);
    const [isAttachmentDrawerOpen, setIsAttachmentDrawerOpen] = useState(false);
    const [previewingAttachment, setPreviewingAttachment] = useState(null);

    // The viewer reports how wide the paper can be; fit the A4 pages to it.
    const fitToStage = React.useCallback((w) => setScale(Math.min(1, w / 794)), []);

    const isAdmin = ['super_admin', 'developer', 'founder'].includes(user?.role);

    const displayProposal = proposal || {
        id: "DEMO-PROP-001",
        proposalNumber: 'QUOTATION',
        clientName: "Demo Client",
        status: "Demo Mode",
        items: [],
        overview: "Strategic project vision document.",
        hiddenFields: [],
        selectedLogo: 'entertainment'
    };

    const [pdfBlobUrl, setPdfBlobUrl] = useState('');

    useEffect(() => {
        if (displayProposal?.fileUrl) {
            if (displayProposal.fileUrl.startsWith('data:application/pdf;base64,')) {
                try {
                    const base64Parts = displayProposal.fileUrl.split(',');
                    const base64Data = base64Parts[1];
                    const binaryStr = atob(base64Data);
                    const len = binaryStr.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: 'application/pdf' });
                    const blobUrl = URL.createObjectURL(blob);
                    setPdfBlobUrl(blobUrl);
                    return () => {
                        URL.revokeObjectURL(blobUrl);
                    };
                } catch (err) {
                    console.error("Error parsing base64 PDF URL:", err);
                    setPdfBlobUrl(displayProposal.fileUrl);
                }
            } else {
                setPdfBlobUrl(displayProposal.fileUrl);
            }
        } else {
            setPdfBlobUrl('');
        }
    }, [displayProposal?.fileUrl]);

    useEffect(() => {
        if (user?.email && !verificationEmail) {
            setVerificationEmail(user.email);
        }
    }, [user, verificationEmail]);

    const location = useLocation();

    useEffect(() => {
        if (isAdmin || !proposal) return;
        // Log once per visit; live snapshot updates must not trigger more writes.
        const visitKey = `${id}${location.search}`;
        if (loggedVisitRef.current === visitKey) return;
        loggedVisitRef.current = visitKey;

        const logVisit = async () => {
            const searchParams = new URLSearchParams(location.search);
            const via = searchParams.get('via');
            const email = searchParams.get('email');
            const name = searchParams.get('name');

            const cacheKey = `last_viewed_proposal_${id}`;
            const lastViewed = safeLocalStorage.getItem(cacheKey);
            const tenMins = 10 * 60 * 1000;

            if (!lastViewed || (new Date() - new Date(lastViewed) > tenMins) || via === 'email') {
                // The server records the visit (IP, time) and lastOpened.
                const res = await useStore.getState().logDocumentAccess('proposal', id, { via, shareEmail: email, shareName: name });
                if (res?.ok) safeLocalStorage.setItem(cacheKey, new Date().toISOString());
            }
        };
        logVisit();
    }, [id, isAdmin, proposal, location.search]);

    const proposalShareMeta = getDocumentShareMeta(displayProposal, 'proposal');
    useDynamicMeta({
        title: proposalShareMeta.title,
        description: proposalShareMeta.description,
        image: proposalShareMeta.previewImage,
        url: typeof window !== 'undefined' ? window.location.href : undefined
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020202] text-gray-900 dark:text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-green"></div>
            </div>
        );
    }

    // A deleted or mistyped link used to render a fake "demo" proposal with sign buttons.
    if (!proposal) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-6 text-center dark:bg-black">
                <div className="max-w-sm space-y-3">
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Proposal not found</h1>
                    <p className="text-sm text-gray-500">This link may be wrong, or the proposal was withdrawn. Please ask the sender for a new link.</p>
                    <Link to="/" className="inline-block rounded-xl bg-gray-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white dark:bg-white dark:text-black">Go to Newbi</Link>
                </div>
            </div>
        );
    }

    const proposalExpired = isProposalExpired(displayProposal);

    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/brand/newbi-logo-entertainment-800w.png', color: '#39FF14' },
        { id: 'media', label: 'Newbi Media', path: '/brand/newbi-logo-media-800w.png', color: '#00D1FF' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/brand/newbi-logo-marketing-800w.png', color: '#FF0055' }
    ];

    const currentLogo = logoOptions.find(l => l.id === displayProposal.selectedLogo) || logoOptions[0];

    const items = displayProposal.items || [];
    const totalSrcCol = displayProposal.totalSourceColumn || 'price';
    const subtotal = items.reduce((sum, item) => {
        return sum + (Number(item[totalSrcCol]) || 0);
    }, 0);
    const hasOverride = displayProposal.totalOverride !== null && displayProposal.totalOverride !== undefined && displayProposal.totalOverride !== '';
    const overrideBase = hasOverride ? Number(displayProposal.totalOverride) : subtotal;
    const gstAmount = displayProposal.showGst ? (overrideBase * (displayProposal.gstRate ?? 18)) / 100 : 0;
    const computedTotal = subtotal + (displayProposal.showGst ? (subtotal * (displayProposal.gstRate ?? 18)) / 100 : 0);
    const totalAmount = hasOverride ? (overrideBase + gstAmount) : computedTotal;

    const handleDownloadPDF = async (blobUrl) => {
        if (displayProposal.isUploaded && displayProposal.fileUrl) {
            const a = document.createElement('a');
            a.href = (typeof blobUrl === 'string' && blobUrl) ? blobUrl : (pdfBlobUrl || displayProposal.fileUrl);
            a.download = displayProposal.fileName || `${displayProposal.clientName || 'Proposal'}-${displayProposal.proposalNumber || 'Quote'}.pdf`;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }

        if (!proposalRef.current) return;
        setIsExporting(true);
        const originalScale = scale;
        setScale(1);
        await new Promise(resolve => setTimeout(resolve, 800));
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            // Use the dedicated export container for reliable multi-page capture
            const pages = document.querySelectorAll('.pdf-export-only .proposal-page-render');
            
            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i], {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#FFFFFF',
                    onclone: (clonedDoc) => {
                        const style = clonedDoc.createElement('style');
                        style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap'); * { font-family: 'Outfit', sans-serif !important; }`;
                        clonedDoc.head.appendChild(style);
                    }
                });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
            }
            pdf.save(`Newbi-Strategic-Memorandum-${displayProposal.clientName}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            useStore.getState().addToast("Couldn't create the PDF. Please try again.", 'error');
        } finally {
            setScale(originalScale);
            setIsExporting(false);
        }
    };


    const handleApproveProposal = async () => {
        if (displayProposal.status === 'Accepted' || displayProposal.status === 'Rejected') return;
        if (proposalExpired) {
            useStore.getState().addToast('This proposal has expired. Please ask us for an updated one.', 'error');
            return;
        }
        if (!signatureName.trim()) {
            useStore.getState().addToast('Enter your full name to sign this quotation.', 'error');
            return;
        }

        if (!verificationEmail.trim() || !verificationEmail.includes('@')) {
            setIsVerifying(true);
            return;
        }
        
        setIsSubmitting(true);
        try {
            // If user hasn't hand-drawn a signature, generate a clean cursive signature canvas image
            let effectiveSignature = clientSignature;
            if (!effectiveSignature && signatureName.trim()) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 600;
                    canvas.height = 180;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#000000';
                    ctx.font = 'italic 52px "Caveat", "Dancing Script", cursive, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(signatureName.trim(), canvas.width / 2, canvas.height / 2);
                    effectiveSignature = canvas.toDataURL('image/png');
                    setClientSignature(effectiveSignature);
                } catch (canvasErr) {
                    console.warn("Could not generate cursive signature canvas:", canvasErr);
                }
            }

            const deviceMetadata = {
                ua: navigator.userAgent,
                platform: navigator.platform,
                screen: `${window.screen.width}x${window.screen.height}`,
                language: navigator.language,
                ip: ipAddress,
                verifiedEmail: verificationEmail,
                timestamp: new Date().toISOString()
            };

            const approvalMetadata = {
                signedBy: signatureName.trim(),
                clientSignature: effectiveSignature || null,
                signedAt: new Date().toISOString(),
                ip: ipAddress,
                email: verificationEmail.trim(),
                device: deviceMetadata,
                footprint: {
                    browser: navigator.userAgent.split(' ').slice(-1)[0],
                    os: navigator.platform,
                    res: `${window.screen.width}x${window.screen.height}`
                }
            };

            const updates = {
                status: 'Accepted',
                clientSignature: effectiveSignature || null,
                approvalMetadata
            };

            // Saved in one transaction that re-checks the proposal is still open,
            // then shown — so the page never claims a signature that didn't save.
            await useStore.getState().respondToProposal(id, 'Accepted', {
                clientSignature: updates.clientSignature,
                approvalMetadata: updates.approvalMetadata
            });
            setLocalProposal(prev => ({
                ...(prev || displayProposal),
                ...updates
            }));

            setIsVerifying(false);
            useStore.getState().addToast('Proposal signed and accepted.', 'success');
        } catch (error) {
            console.error('Error approving proposal:', error);
            useStore.getState().addToast(error?.code ? error.message : "Couldn't sign the proposal. Please try again or contact support.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefuseProposal = () => {
        if (displayProposal.status === 'Accepted' || displayProposal.status === 'Rejected') return;
        setDeclineReason('');
        setDeclineOpen(true);
    };

    const confirmDecline = async () => {
        setIsSubmitting(true);
        try {
            const rejectionMetadata = {
                reason: declineReason.trim() || 'No reason provided',
                rejectedAt: new Date().toISOString(),
                ip: ipAddress
            };
            await useStore.getState().respondToProposal(id, 'Rejected', { rejectionMetadata });
            setLocalProposal(prev => ({ ...(prev || displayProposal), status: 'Rejected', rejectionMetadata }));
            setDeclineOpen(false);
            useStore.getState().addToast('Thanks for letting us know. The proposal has been declined.', 'success');
        } catch (error) {
            console.error('Error refusing proposal:', error);
            useStore.getState().addToast(error?.code ? error.message : "Couldn't update the status. Please try again.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };


    const isHidden = (f) => (displayProposal.hiddenFields || []).includes(f);

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
            const headingClass = level === 1
                ? "text-[18px] font-black text-black border-b border-black/10 pb-1 mt-6 mb-2 block"
                : level === 2
                ? "text-[15px] font-bold text-black border-b border-black/10 pb-1 mt-5 mb-2 block"
                : "text-[13.5px] font-bold text-gray-800 mt-4 mb-1 block";
            const headingTag = `h${Math.min(level + 1, 6)}`;
            return `<${headingTag} class="${headingClass}" ${attrs}>${content}</${headingTag}>`;
        });
    };

    // Markdown-like formatting logic
    const renderFormatted = (text, baseClass = 'text-[13px] font-medium text-black leading-[1.9]') => {
        if (!text) return null;
        
        // Split text into logical lines, handling cases where multiple numbers are on one line
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

            // Horizontal Line
            if (line.match(/^[-*_]{3,}$/)) {
                elements.push(<div key={`hr-${i}`} className="h-[1.5px] bg-white dark:bg-black/10 my-8 w-full" />);
                i++;
                continue;
            }

            // Heading
            const headingMatch = line.match(/^(#{1,6})(?:\s|&nbsp;|\u00a0)+(.*)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const headingText = headingMatch[2];
                const headingClass = level === 1
                    ? "text-[18px] font-black text-black border-b border-black/10 pb-1 mt-6 mb-2 block"
                    : level === 2
                    ? "text-[15px] font-bold text-black border-b border-black/10 pb-1 mt-5 mb-2 block"
                    : "text-[13.5px] font-bold text-gray-800 mt-4 mb-1 block";
                const headingTag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
                const Tag = headingTag;
                elements.push(<Tag key={i} className={headingClass} dangerouslySetInnerHTML={{ __html: inlineFmt(headingText) }} />);
            // Bullet
            } else if (line.match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
                const items = [];
                while (i < lines.length && lines[i].trim().match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
                    items.push(lines[i].trim().replace(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/, ''));
                    i++;
                }
                elements.push(
                    <div key={`ul-${i}`} className="pl-4 space-y-1.5 my-3">
                        {items.map((item, j) => (
                            <div key={j} className="flex items-start gap-3">
                                <span className="text-neon-green mt-[7px] text-[8px] select-none shrink-0">●</span>
                                <span className={baseClass} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} />
                            </div>
                        ))}
                    </div>
                );
                continue;
            // Numbered
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
                                <span className="text-[11px] font-black text-gray-600 dark:text-gray-400 mt-0.5 w-6 shrink-0">{item.num}.</span>
                                <span className={baseClass} dangerouslySetInnerHTML={{ __html: inlineFmt(item.text) }} />
                            </div>
                        ))}
                    </div>
                );
                continue;
            // Regular paragraph
            } else if (line) {
                elements.push(<p key={i} className={cn(baseClass, 'text-justify')} dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />);
            }
            i++;
        }
        return <div>{elements}</div>;
    };

    // Helper to render content that might be HTML or legacy text
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

    const inlineFmt = (text) => {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black">$1</strong>')
            .replace(/__(.*?)__/g, '<strong class="font-black">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
            .replace(/_(.*?)_/g, '<em class="italic">$1</em>');
    };

    const isV2Proposal = displayProposal.templateVersion === 'v2' || Boolean(displayProposal.whatsInside || displayProposal.blueprintSteps || displayProposal.deliverablesTable);

    const getPaginatedPages = () => {
        if (isV2Proposal) {
            return getV2PaginatedPages(displayProposal);
        }
        const pages = [];

        const insertCustomPagesFor = (placement) => {
            if (!isHidden('customPages') && displayProposal.customPages && displayProposal.customPages.length > 0) {
                displayProposal.customPages.forEach((cp, cpIdx) => {
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
            const overviewHtml = !isHidden('overview') ? (displayProposal.overview || '') : '';
            const primaryGoalHtml = (!isHidden('primaryGoal') && !isHtmlEmpty(displayProposal.primaryGoal)) ? (displayProposal.primaryGoal || '') : '';
            
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

        if (!isHidden('scopeOfWork') && displayProposal.scopeOfWork) {
            const scopePages = splitTextIntoPages(displayProposal.scopeOfWork, 800);
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
            const activeDeliverables = (displayProposal.deliverables || []).filter(d => d.item);
            const clientReqs = (displayProposal.clientRequirements || []).filter(r => r.description);
            
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
            const termsHtml = displayProposal.terms || '';
            const paymentDetailsHtml = (displayProposal.showPaymentDetails !== false && !isHidden('paymentDetails')) ? (displayProposal.paymentDetails || '') : '';
            
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
        if (!isHidden('attachments') && displayProposal.attachments && displayProposal.attachments.length > 0) {
            pages.push({
                type: 'attachments',
                attachments: displayProposal.attachments
            });
        }
        return pages;
    };

    const paginatedPages = getPaginatedPages();

    const viewerData = {
        ...displayProposal,
        isUploaded: Boolean(displayProposal.isUploaded && displayProposal.fileUrl),
        fileUrl: displayProposal.fileUrl
    };

    const theme = docTheme('proposal');
    const meta = displayProposal.approvalMetadata || {};
    const expiryLabel = proposalExpiry(displayProposal)?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    let actionPanel = null;
    if (displayProposal.status === 'Accepted') {
        actionPanel = (
            <SignedRecord theme={theme} title="Accepted" subtitle="This proposal was signed and accepted."
                signedBy={meta.signedBy || displayProposal.clientName}
                signature={meta.clientSignature || displayProposal.clientSignature}
                signedAt={meta.signedAt} email={meta.email} ip={isAdmin ? meta.ip : undefined} />
        );
    } else if (displayProposal.status === 'Rejected') {
        const rej = displayProposal.rejectionMetadata || {};
        actionPanel = (
            <PanelCard theme={theme} icon={X} title="Declined"
                subtitle={`${rej.rejectedAt ? `Declined on ${fmtDate(rej.rejectedAt)}. ` : ''}Want changes? Reply to the email it came with and we’ll send a new one.`}>
                {rej.reason && rej.reason !== 'No reason provided' && (
                    <p className="rounded-xl bg-black/[0.03] px-3 py-2.5 text-[13px] leading-relaxed text-gray-700 dark:bg-white/[0.05] dark:text-zinc-300">“{rej.reason}”</p>
                )}
            </PanelCard>
        );
    } else if (proposalExpired) {
        actionPanel = (
            <PanelCard theme={theme} icon={Calendar} title="This proposal has expired"
                subtitle={`It was valid until ${expiryLabel}. Contact us and we’ll send an updated one.`}>
                <a href={`mailto:partnership@newbi.live?subject=${encodeURIComponent(`Updated proposal ${displayProposal.proposalNumber || ''}`.trim())}`}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-[14px] font-semibold text-white dark:bg-white dark:text-black">
                    <Mail size={16} /> Ask for an update
                </a>
            </PanelCard>
        );
    } else if (displayProposal.showSignatures) {
        actionPanel = (
            <SignForm
                theme={theme}
                title="Accept this proposal"
                subtitle={displayProposal.validUntil ? `Open until ${expiryLabel}.` : 'Sign below to go ahead.'}
                name={signatureName} onName={setSignatureName}
                email={verificationEmail} onEmail={setVerificationEmail} emailLabel="Work email"
                signature={clientSignature} onOpenPad={() => setIsSignatureModalOpen(true)} onClearSignature={() => setClientSignature(null)}
                submitLabel="Accept and sign" onSubmit={handleApproveProposal} submitting={isSubmitting}
                onDecline={handleRefuseProposal} declineLabel="Decline proposal"
                note={isAdmin ? 'You’re signed in as an admin. Signing here records acceptance on the client’s behalf.' : undefined}
                consent="By accepting you agree to the scope and commercials in this proposal. We record your name, email, time and device with the signature."
            />
        );
    }

    return (
        <>
            <Sheet open={declineOpen} onClose={() => !isSubmitting && setDeclineOpen(false)} variant="dialog" size="sm" zIndex={1000}
                title="Decline this proposal?" subtitle="Telling us why helps us send a better one. This is optional."
                footer={(
                    <div className="flex gap-2">
                        <DocButton variant="secondary" onClick={() => setDeclineOpen(false)} disabled={isSubmitting} className="flex-1">Keep it open</DocButton>
                        <DocButton onClick={confirmDecline} busy={isSubmitting} className="flex-1 !bg-red-600 !text-white hover:!bg-red-700">{isSubmitting ? 'Declining…' : 'Decline'}</DocButton>
                    </div>
                )}>
                <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="e.g. Budget is lower this quarter"
                    className="w-full resize-none rounded-xl border border-black/10 bg-white p-3 text-[16px] text-gray-900 outline-none focus:border-red-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white sm:text-[14px]"
                />
            </Sheet>
            <SharedDocumentViewer
                documentData={viewerData}
                type="proposal"
                isAdmin={isAdmin}
                isExporting={isExporting}
                onDownloadPDF={handleDownloadPDF}
                pdfBlobUrl={pdfBlobUrl}
                onOpenAttachments={displayProposal.attachments?.length > 0 ? () => setIsAttachmentDrawerOpen(true) : null}
                actionPanel={actionPanel}
                actionLabel="Review and accept"
                onStageWidth={fitToStage}
                banner={proposalExpired && !isAdmin ? (
                    <div role="status" className="border-b border-amber-500/20 bg-amber-400/90 px-4 py-2.5 text-center text-[13px] font-semibold text-black">
                        This proposal expired on {expiryLabel}. Contact us for an updated one.
                    </div>
                ) : null}
            >
                {!displayProposal.isUploaded && (
                <div ref={proposalRef} className="flex flex-col gap-8 sm:gap-16 origin-top transition-transform duration-500" style={{ transform: `scale(${scale})`, marginBottom: `${(scale - 1) * 1123 * paginatedPages.length}px` }}>
                    {paginatedPages.map((page, idx) => (
                        isV2Proposal ? (
                            <ProposalDocumentRenderer
                                key={idx}
                                page={page}
                                pageIdx={idx}
                                totalPages={paginatedPages.length}
                                formData={normalizeProposalData(displayProposal)}
                                currentLogo={currentLogo}
                                isHidden={isHidden}
                                renderContent={renderContent}
                                isExporting={isExporting}
                                signatureArea={null}
                            />
                        ) : (
                        <div key={idx} className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative shadow-[0_60px_120px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col p-[15mm] rounded-[2px]">
                            {/* Header Logic */}
                            <div className={cn("flex justify-between items-end mb-8 pb-4 border-b-2 border-black", idx > 0 && "mb-4 pb-2 opacity-40 border-gray-200")}>
                                <div className="flex flex-col gap-6 items-start">
                                    <img src={currentLogo.path} alt="Logo" className={cn("h-20 w-auto object-contain", idx > 0 && "h-10")} crossOrigin="anonymous" />
                                </div>
                                <div className="text-right space-y-3">
                                    <div><h4 className={cn("text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0", idx > 0 && "text-[7px]")}>Quotation</h4><p className={cn("text-lg font-black text-black tracking-widest font-mono", idx > 0 && "text-sm")}>{displayProposal.proposalNumber}</p></div>
                                    {idx === 0 && (
                                        <div className="space-y-0.5"><p className="text-[8px] font-black text-gray-600 dark:text-gray-400 uppercase">Issue Date</p><p className="text-[10px] font-black text-black">{new Date(displayProposal.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <div className="absolute inset-0 flex flex-col px-1">
                                    {page.type === 'cover' && (
                                    <div className="h-full flex flex-col justify-start space-y-20 py-8">
                                        <div className="grid grid-cols-2 gap-10">
                                            <div className="space-y-6 min-w-0"><p className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug break-words">{displayProposal.clientName || 'Valued Partner'}</h2>{!isHidden('clientAddress') && <p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{displayProposal.clientAddress || 'Client Address'}</p>}</div></div>
                                            <div className="space-y-6 text-right min-w-0"><p className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest border-b border-gray-100 pb-2">Engagement Mission</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug italic break-words">{displayProposal.campaignName || 'Mission Title'}</h2><p className="text-[12px] font-black text-neon-green bg-white dark:bg-black px-3 py-1 inline-block uppercase tracking-widest">Period: {displayProposal.campaignDuration || 'TBD'}</p></div></div>
                                        </div>
                                        <div className="pt-16 space-y-10"><div className="flex items-center gap-4"><div className="w-12 h-1 bg-white dark:bg-black" /><p className="text-[11px] font-black uppercase tracking-[0.6em]">Strategic Project Memorandum</p></div>{!isHidden('coverDescription') && <div className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl text-justify">{renderContent(displayProposal.coverDescription || 'Cover description pending...')}</div>}</div>
                                        <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{displayProposal.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Strategic Commercial</p></div></div>
                                    </div>
                                    )}
                                    {page.type === 'strategy' && (
                                    <div className="space-y-16 py-8">
                                        <div className="mb-10 space-y-3">
                                            <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                {displayProposal.strategyTitle ?? 'EXECUTIVE SUMMARY'}
                                            </h3>
                                            <div className="w-20 h-1.5 bg-neon-green" />
                                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                {displayProposal.strategySub ?? 'STRATEGIC OUTLINE'}
                                            </p>
                                        </div>
                                        {page.overviewText && <div className="text-lg font-medium leading-[1.7] text-gray-700">{renderContent(page.overviewText)}</div>}
                                        {page.primaryGoalText && !isHtmlEmpty(page.primaryGoalText) && (
                                            <div className="pt-12">
                                                <div className="p-12 border-2 border-black rounded-[2.5rem] space-y-6">
                                                    <p className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Primary Objective</p>
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
                                                {displayProposal.scopeTitle ?? 'SCOPE OF WORK'}
                                            </h3>
                                            <div className="w-20 h-1.5 bg-neon-green" />
                                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                {displayProposal.scopeSub ?? 'RESOURCE DELIVERABLES'}
                                            </p>
                                        </div>
                                        <div className="flex-1 flex flex-col">
    {renderContent(page.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}
</div>
                                        {idx === paginatedPages.length - 1 && !isHidden('signatures') && (displayProposal.showSignatures || displayProposal.showSeal) && (
                                         <>
                                             <div className="mt-auto pt-12 flex flex-col gap-8 border-t border-gray-100">
                                                 <div className="flex items-center gap-4">
                                                     <div className="w-10 h-10 bg-white dark:bg-black flex items-center justify-center shrink-0"><span className="text-[8px] font-black text-neon-green">NB</span></div>
                                                     <div className="flex-1">
                                                         <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest block mb-4">Official Authorization</label>
                                                         <div className="relative group">
                                                             {displayProposal.showSignatures ? (
                                                                 displayProposal.status === 'Accepted' ? (
                                                                     <div className="h-24 sm:h-32 flex items-end justify-center">
                                                                         {displayProposal.approvalMetadata?.clientSignature ? (
                                                                             <img src={displayProposal.approvalMetadata?.clientSignature} className="max-h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" crossOrigin="anonymous" />
                                                                         ) : (
                                                                             <p className="text-4xl sm:text-6xl font-signature text-black leading-none">{displayProposal.approvalMetadata?.signedBy || 'Authorized Signatory'}</p>
                                                                         )}
                                                                     </div>
                                                                 ) : (
                                                                     <input 
                                                                         value={signatureName} 
                                                                         onChange={e => setSignatureName(e.target.value)} 
                                                                         disabled={displayProposal.status === 'Accepted'}
                                                                         className={cn(
                                                                             "w-full bg-gray-50 border-2 border-dashed border-gray-200 h-24 sm:h-32 px-8 sm:px-12 rounded-2xl text-2xl sm:text-4xl font-signature text-black outline-none focus:border-neon-green/40 transition-all text-center placeholder:text-gray-200 placeholder:italic",
                                                                             displayProposal.status === 'Accepted' && "border-neon-green/20 bg-neon-green/[0.02]"
                                                                         )} 
                                                                         placeholder="Enter Full Name..." 
                                                                     />
                                                                 )
                                                             ) : (
                                                                 <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 h-24 sm:h-32 flex items-center justify-center rounded-2xl">
                                                                     <p className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Seal Only Authorization Mode</p>
                                                                 </div>
                                                             )}
                                                         </div>
                                                     </div>
                                                     <div className="flex justify-center py-6 relative">
                                                         {displayProposal.status === 'Accepted' && displayProposal.showSignatures && (
                                                             <DocumentSeal type="proposal" date={displayProposal.approvalMetadata?.signedAt} />
                                                         )}
                                                         {displayProposal.showSeal && (
                                                             <div className="absolute inset-0 pointer-events-none z-10 opacity-70 mix-blend-multiply flex items-center justify-center">
                                                                 <DocumentSeal className="w-24 h-24 grayscale brightness-0" />
                                                             </div>
                                                         )}
                                                     </div>
                                                     <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest text-center mt-4">By signing, you confirm that you have read and agreed to the terms of engagement.</p>
                                                 </div>
                                                 <Button 
                                                     onClick={handleApproveProposal} 
                                                     disabled={isSubmitting || (displayProposal.showSignatures && !signatureName.trim()) || displayProposal.status === 'Accepted'} 
                                                     className="w-full h-16 sm:h-20 bg-white dark:bg-black text-gray-900 dark:text-white font-black uppercase tracking-[0.3em] text-[10px] sm:text-xs rounded-2xl hover:bg-neon-green hover:text-black transition-all group overflow-visible relative shadow-2xl disabled:opacity-50 px-8"
                                                 >
                                                     {displayProposal.status === 'Accepted' ? (
                                                         <span className="flex items-center gap-3"><ShieldCheck className="text-neon-green" /> Document Locked & Authorized</span>
                                                     ) : (
                                                         <>
                                                             <span className="relative z-10 flex items-center justify-center gap-2">{isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} className="text-neon-green" />} Authorize Strategic Memorandum</span>
                                                             <div className="absolute inset-0 bg-gradient-to-r from-neon-green/20 via-transparent to-neon-green/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 rounded-2xl" />
                                                         </>
                                                     )}
                                                 </Button>
                                             </div>
                                         </>
                                     )}
                                    </div>
                                )}

                                {page.type === 'proposal' && (
                                    <div className="space-y-16 py-8">
                                        <div className="mb-10 space-y-3">
                                            <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                {displayProposal.proposalTitle ?? 'DELIVERABLES'}
                                            </h3>
                                            <div className="w-20 h-1.5 bg-neon-green" />
                                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                {displayProposal.proposalSub ?? 'PROJECT INVENTORY'}
                                            </p>
                                        </div>
                                        {page.deliverables?.length > 0 && (
                                            <div className="space-y-6">
                                                <table className="w-full text-left border-collapse border border-black">
                                                    <thead>
                                                        <tr className="bg-white dark:bg-black text-[9px] font-black uppercase text-gray-900 dark:text-white tracking-[0.3em]">
                                                            <th className="p-4 w-12 text-center border-r border-black/20 dark:border-white/20">#</th>
                                                            <th className="p-4 border-r border-black/20 dark:border-white/20">Deliverable</th>
                                                            <th className="p-4 text-center w-28 border-r border-black/20 dark:border-white/20">Qty / Unit</th>
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
                                            <div className="space-y-6 pt-4">
                                                <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mb-6">Requirements From Client</p>
                                                <div className="p-8 border-2 border-gray-200 space-y-0">
                                                    {page.clientRequirements.map((r, i) => (
                                                        <div key={r.id || i} className={cn("flex items-start gap-4 py-4", i > 0 && "border-t border-gray-100")}>
                                                            <div className="w-8 h-8 bg-white dark:bg-black flex items-center justify-center shrink-0 mt-0.5"><span className="text-[9px] font-black text-gray-900 dark:text-white">{String(i + 1).padStart(2, '0')}</span></div>
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
                                                 {displayProposal.inventoryTitle ?? 'RESOURCE INVENTORY'}
                                             </h3>
                                             <div className="w-20 h-1.5 bg-neon-green" />
                                             <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                 {page.tablePageIdx > 1 
                                                     ? `${displayProposal.inventorySub ?? 'COMMERCIALS BREAKDOWN'} — Part ${page.tablePageIdx}` 
                                                     : (displayProposal.inventorySub ?? 'COMMERCIALS BREAKDOWN')}
                                             </p>
                                         </div>
                                         <table className="w-full text-left border-collapse border border-black">
                                          <thead>
                                              <tr className="bg-white dark:bg-black text-[9px] font-black uppercase text-gray-900 dark:text-white tracking-[0.3em]">
                                                  {(displayProposal?.tableColumns || defaultColumns).map((col, cIdx, arr) => {
                                                      const colType = col.type || (col.key === 'price' ? 'amount' : (col.key === 'qty' ? 'number' : 'text'));
                                                      return (
                                                          <th 
                                                              key={col.key} 
                                                              className={cn(
                                                                  "p-4",
                                                                  cIdx < arr.length - 1 && "border-r border-black/20 dark:border-white/20",
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
                                                  const cols = displayProposal?.tableColumns || defaultColumns;
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
                                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                {(displayProposal.customPages?.[page.pageIndex]?.subtitle || "Additional Specifications").toUpperCase()}
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
                                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">Part {page.termsPageIdx}</p>
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
                                                    {displayProposal.commercialsTitle ?? 'COMMERCIAL TERMS'}
                                                </h3>
                                                <div className="w-20 h-1.5 bg-neon-green" />
                                                <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                    {displayProposal.commercialsSub ?? 'SETTLEMENT & SIGN-OFF'}
                                                </p>
                                            </div>                  
                                            <div className={cn("grid gap-12 items-start", displayProposal.hideTotalColumn ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
                                                <div className="space-y-8">
                                                    {page.termsText && (
                                                        <div className="space-y-3">
                                                            <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">General Terms</h4>
                                                            <div className="text-[11px] font-semibold text-gray-600 leading-relaxed space-y-2">{renderContent(page.termsText)}</div>
                                                        </div>
                                                    )}
                                                    {page.paymentDetailsText && (

                                                        <div className="p-6 bg-gray-50 border border-gray-150 rounded-2xl space-y-2">

                                                            <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Settlement Details</p>

                                                            <div className="text-[11px] font-mono font-bold text-black whitespace-pre-line leading-relaxed">{page.paymentDetailsText}</div>

                                                        </div>

                                                    )}
                                                </div>
                                                {!displayProposal.hideTotalColumn && (<div className="space-y-4">
                                                    <div className="bg-gray-50/50 border border-gray-250/60 rounded-[2rem] p-8 space-y-6">
                                                        <div className="flex justify-between items-center pb-4 border-b border-gray-200/60">
                                                            <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Subtotal</span>
                                                            <span className="text-base font-bold text-black font-mono">₹{subtotal.toLocaleString()}</span>
                                                        </div>
                                                        {displayProposal.showGst && (
                                                            <div className="flex justify-between items-center pb-4 border-b border-gray-200/60">
                                                                <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">GST ({displayProposal.gstRate}%)</span>
                                                                <span className="text-base font-bold text-black font-mono">₹{gstAmount.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        <div className="p-8 bg-white dark:bg-black text-right relative overflow-hidden rounded-[1.5rem] shadow-xl">
                                                            <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-3">Total Estimated Cost</p>
                                                            <h2 className="text-3xl font-black tracking-widest text-gray-900 dark:text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2>
                                                            <div className="absolute top-0 right-0 w-1.5 h-full bg-neon-green" />
                                                        </div>
                                                        {displayProposal.advanceRequested > 0 && (
                                                            <div className="p-6 bg-neon-green/5 border border-neon-green/20 rounded-[1.5rem] flex justify-between items-center">
                                                                <div>
                                                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Advance Fee ({displayProposal.advanceRequested}%)</span>
                                                                    <span className="text-[7px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Due upon signature</span>
                                                                </div>
                                                                <span className="text-xl font-black text-black font-mono">₹{(totalAmount * displayProposal.advanceRequested / 100).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>)}
                                            </div>
                                        </div>                          
                                        
                                        {/* Row 2: Collapsible Authorization Protocols below (only if !isHidden('signatures') and enabled) */}
                                        {idx === paginatedPages.length - 1 && !isHidden('signatures') && (displayProposal.showSignatures || displayProposal.showSeal) && (
                                            <div className="border border-gray-200 rounded-[2.5rem] overflow-hidden bg-white mt-8">
                                                {/* Header to toggle collapse (only visible on screen, not on print/export) */}
                                                <button 
                                                    onClick={() => setIsSignaturesCollapsed(!isSignaturesCollapsed)}
                                                    className="w-full px-8 py-5 bg-gray-50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-black border-b border-gray-200 no-print hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <ShieldCheck size={16} className="text-black" />
                                                        <span>Authorization Signatures & Verification</span>
                                                    </div>
                                                    <span className="text-black font-black">{isSignaturesCollapsed ? 'Expand +' : 'Collapse -'}</span>
                                                </button>
                                                
                                                {/* Expanded content */}
                                                <div className={cn(
                                                    "transition-all duration-300", 
                                                    (!isSignaturesCollapsed || isExporting) ? "max-h-[1000px] opacity-100 p-8" : "max-h-0 opacity-0 pointer-events-none no-print",
                                                    "print-visible" // always renders on print
                                                )}>
                                                    {displayProposal.status !== 'Accepted' ? (
                                                        <div className="space-y-8 relative">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-20">
                                                                {/* Provider Side */}
                                                                <div className="space-y-4">
                                                                    <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">For {currentLogo.label}</p>
                                                                    <div className="h-24 flex items-end">
                                                                        {displayProposal.providerSignature ? (
                                                                            <img src={displayProposal.providerSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Provider Signature" crossOrigin="anonymous" />
                                                                        ) : (
                                                                            <p className="text-2xl font-signature text-black leading-none italic opacity-90">Authorized Signatory</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-[11px] font-black uppercase text-black">{displayProposal.senderName || currentLogo.label}</p>
                                                                        <p className="text-[8px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest italic">{displayProposal.senderDesignation || 'Service Provider'}</p>
                                                                    </div>
                                                                </div>
 
                                                                {/* Client Signature Area */}
                                                                <div className="space-y-6">
                                                                    <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Client Signature Block</p>
                                                                    <div 
                                                                        onClick={() => setIsSignatureModalOpen(true)}
                                                                        className="relative h-24 bg-white dark:bg-black/5 rounded-[20px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-black/10 hover:border-neon-green/40 transition-all group overflow-hidden"
                                                                    >
                                                                        {clientSignature ? (
                                                                            <div className="relative group w-full h-full flex items-center justify-center p-4">
                                                                                <img src={clientSignature} alt="Client Signature" className="max-h-full object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                                                <div className="absolute inset-0 bg-white dark:bg-black/5 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                                                    <RefreshCw size={16} className="text-black" />
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <PenTool size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-neon-green" />
                                                                                <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Click to sign</p>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
 
                                                            {/* Authorize button */}
                                                            {clientSignature && (
                                                                <Button 
                                                                    onClick={handleApproveProposal} 
                                                                    disabled={isSubmitting || !signatureName.trim()} 
                                                                    className="w-full h-14 bg-neon-green text-black font-black uppercase tracking-widest text-[11px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(57,255,20,0.2)] mt-6"
                                                                >
                                                                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                                                                    Authorize Strategic Memorandum
                                                                </Button>
                                                            )}
                                                            
                                                            {/* Official Seal Overlay */}
                                                            {displayProposal.showSeal && (
                                                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] pointer-events-none z-10 opacity-80 mix-blend-multiply">
                                                                    <DocumentSeal className="w-36 h-36 grayscale brightness-0" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-8 relative">
                                                            {/* Accepted View */}
                                                            <div className="grid grid-cols-2 gap-10">
                                                                <div className="space-y-8 border-r border-gray-100 pr-10">
                                                                    <div className="space-y-4">
                                                                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.3em] border-b border-gray-100 pb-2">Provider Authorization</p>
                                                                        <div className="h-20 flex items-end">
                                                                            {displayProposal.providerSignature ? (
                                                                                <img src={displayProposal.providerSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Provider Signature" crossOrigin="anonymous" />
                                                                            ) : (
                                                                                <p className="text-3xl font-signature text-black leading-none italic opacity-90">Authorized Signatory</p>
                                                                            )}
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[11px] font-black uppercase text-black">{displayProposal.senderName || currentLogo.label}</p>
                                                                            <p className="text-[8px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest italic">{displayProposal.senderDesignation || 'Service Provider'}</p>
                                                                        </div>
                                                                    </div>
 
                                                                    <div className="space-y-4">
                                                                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.3em] border-b border-gray-100 pb-2">Client Authorization</p>
                                                                        <div className="h-20 flex items-end">
                                                                            {displayProposal.approvalMetadata?.clientSignature ? (
                                                                                <img src={displayProposal.approvalMetadata?.clientSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" crossOrigin="anonymous" />
                                                                            ) : (
                                                                                <p className="text-3xl font-signature text-black leading-none">{displayProposal.approvalMetadata?.signedBy || 'Authorized Signatory'}</p>
                                                                            )}
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[11px] font-black uppercase text-black">{displayProposal.approvalMetadata?.signedBy || 'Authorized Signatory'}</p>
                                                                            <p className="text-[8px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest italic">Authorized Signatory</p>
                                                                            <p className="text-[7px] text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-tighter font-black">IP: {displayProposal.approvalMetadata?.ip || 'N/A'} | Signed: {displayProposal.approvalMetadata?.signedAt ? new Date(displayProposal.approvalMetadata.signedAt).toLocaleString() : 'N/A'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="space-y-6">
                                                                    <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.3em] border-b border-gray-100 pb-2 text-right">Digital Footprints</p>
                                                                    <div className="space-y-2 text-[8px] font-black uppercase tracking-widest text-gray-500 text-right">
                                                                        <div className="flex justify-end gap-2"><span>IP Address:</span><span className="text-black">{displayProposal.approvalMetadata?.ip || 'N/A'}</span></div>
                                                                        <div className="flex justify-end gap-2"><span>Verified Email:</span><span className="text-black">{displayProposal.approvalMetadata?.email || 'N/A'}</span></div>
                                                                        <div className="flex justify-end gap-2"><span>User Agent:</span><span className="text-black max-w-[120px] truncate">{displayProposal.approvalMetadata?.footprint?.browser || 'System'}</span></div>
                                                                        <div className="flex justify-end gap-2"><span>Timestamp:</span><span className="text-black">{displayProposal.approvalMetadata?.signedAt ? new Date(displayProposal.approvalMetadata.signedAt).toISOString() : 'N/A'}</span></div>
                                                                        <div className="flex justify-end gap-2"><span>Ref ID:</span><span className="text-black">{displayProposal.id ? displayProposal.id.slice(-8).toUpperCase() : 'N/A'}</span></div>
                                                                    </div>
                                                                </div>
                                                            </div>
 
                                                            {/* Seal Overlay */}
                                                            {displayProposal.showSeal && (
                                                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] pointer-events-none z-10 opacity-80 mix-blend-multiply">
                                                                    <DocumentSeal className="w-36 h-36 grayscale brightness-0" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {page.type === 'attachments' && (
                                    <div className="space-y-12 py-10 px-4 h-full flex flex-col justify-between">
                                        <div>
                                            <div className="mb-10 space-y-3">
                                                <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                    APPENDIX / ATTACHMENTS.
                                                </h3>
                                                <div className="w-20 h-1.5 bg-neon-green" />
                                                <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                    SUPPORTING INSTRUMENTS & DOCUMENTATION
                                                </p>
                                            </div>
                                            
                                            <div className="flex flex-col gap-10 mt-12 pb-10">
                                                {(page.attachments || []).map((attachment, idx) => {
                                                    const isSpreadsheet = attachment.fileType === 'spreadsheet';
                                                    const isPdf = attachment.fileType === 'pdf';
                                                    const isImage = attachment.fileType === 'image';
                                                    const qrCodeUrl = `/api/qr?size=300&margin=1&text=${encodeURIComponent(attachment.url)}`;
                                                    
                                                    if (isImage) {
                                                        return (
                                                            <div key={idx} className="w-full relative rounded-2xl overflow-hidden border border-gray-200">
                                                                <img src={attachment.url} alt={attachment.name} className="w-full h-auto object-contain" />
                                                                <div className="absolute top-4 left-4 bg-white dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-wider">
                                                                    {attachment.name}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    if (isPdf) {
                                                        return (
                                                            <div key={idx} className="w-full h-[600px] relative rounded-2xl overflow-hidden border border-gray-200">
                                                                <iframe src={attachment.url} title={attachment.name} className="w-full h-full border-none bg-gray-50" />
                                                                <div className="absolute top-4 left-4 bg-white dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-wider pointer-events-none">
                                                                    {attachment.name}
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={idx} className="p-6 border border-gray-200 rounded-[2rem] flex flex-col justify-between h-44 relative bg-gray-50/50">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="min-w-0">
                                                                    <h4 className="text-xs font-black text-black uppercase tracking-wider truncate" title={attachment.name}>
                                                                        {attachment.name}
                                                                    </h4>
                                                                    <p className="text-[8px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mt-1">
                                                                        {attachment.type === 'file' ? 'Uploaded Storage File' : 'Linked URL'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-end justify-between mt-4">
                                                                <a 
                                                                    href={attachment.url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    className="text-[9px] font-black uppercase tracking-widest text-neon-green bg-white dark:bg-black hover:bg-zinc-800 transition-colors px-3 py-1.5 rounded-xl inline-block"
                                                                >
                                                                    View Document &rarr;
                                                                </a>
                                                                
                                                                <div className="w-14 h-14 bg-white p-0.5 rounded-lg border border-gray-200 shadow-sm shrink-0">
                                                                    <img src={qrCodeUrl} alt="QR Access" className="w-full h-full object-contain" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                </div>
                            </div>
                            <div className="mt-auto pt-8 pb-10 border-t border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.4em]">
                                <p className="w-1/3 text-left">© NEWBI ENTERTAINMENT & MARKETING LLP</p>
                                <p className="w-1/3 text-center text-gray-600 truncate px-2"></p>
                                <p className="w-1/3 text-right text-black">Page {idx + 1} of {paginatedPages.length}</p>
                            </div>
                        </div>
                        )
                    ))}
                </div>
                )}
            </SharedDocumentViewer>

            {/* Hidden container for PDF export — renders all pages for html2canvas */}
            <div className="pdf-export-only fixed -left-[9999px] top-0 pointer-events-none overflow-hidden bg-white">
                {paginatedPages.map((page, idx) => (
                    isV2Proposal ? (
                        <ProposalDocumentRenderer
                            key={idx}
                            page={page}
                            pageIdx={idx}
                            totalPages={paginatedPages.length}
                            formData={normalizeProposalData(displayProposal)}
                            currentLogo={currentLogo}
                            isHidden={isHidden}
                            renderContent={renderContent}
                            isExporting={true}
                        />
                    ) : (
                    <div key={idx} className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative flex flex-col p-[15mm] mb-10">
                        <div className={cn("flex justify-between items-end mb-8 pb-4 border-b-2 border-black", idx > 0 && "mb-4 pb-2 opacity-40 border-gray-200")}>
                            <div className="flex flex-col gap-6 items-start">
                                <img src={currentLogo.path} alt="Logo" className={cn("h-20 w-auto object-contain", idx > 0 && "h-10")} crossOrigin="anonymous" />
                            </div>
                            <div className="text-right space-y-3">
                                <div><h4 className={cn("text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0", idx > 0 && "text-[7px]")}>Quotation</h4><p className={cn("text-lg font-black text-black tracking-widest font-mono", idx > 0 && "text-sm")}>{displayProposal.proposalNumber}</p></div>
                                {idx === 0 && (
                                    <div className="space-y-0.5"><p className="text-[8px] font-black text-gray-600 dark:text-gray-400 uppercase">Issue Date</p><p className="text-[10px] font-black text-black">{new Date(displayProposal.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            <div className="absolute inset-0 overflow-hidden flex flex-col px-1">
                            {page.type === 'cover' && (
                                <div className="h-full flex flex-col justify-start space-y-20 py-8">
                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="space-y-6 min-w-0"><p className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug break-words">{displayProposal.clientName || 'Valued Partner'}</h2>{!isHidden('clientAddress') && <p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{displayProposal.clientAddress || 'Client Address'}</p>}</div></div>
                                        <div className="space-y-6 text-right min-w-0"><p className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest border-b border-gray-100 pb-2">Project Specification</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug italic break-words">{displayProposal.campaignName || 'Project Title'}</h2><p className="text-[12px] font-black text-neon-green bg-white dark:bg-black px-3 py-1 inline-block uppercase tracking-widest">Duration: {displayProposal.campaignDuration || 'TBD'}</p></div></div>
                                    </div>
                                    <div className="pt-16 space-y-10"><div className="flex items-center gap-4"><div className="w-12 h-1 bg-white dark:bg-black" /><p className="text-[11px] font-black uppercase tracking-[0.6em]">Official Strategic Quotation</p></div>{!isHidden('coverDescription') && <div className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl text-justify">{renderContent(displayProposal.coverDescription || 'Cover description pending...')}</div>}</div>
                                    <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{displayProposal.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Strategic Commercial</p></div></div>
                                </div>
                            )}

                            {page.type === 'strategy' && (
                                <div className="space-y-16 py-8">
                                    <div className="mb-10 space-y-3">
                                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                             {displayProposal.strategyTitle ?? 'EXECUTIVE SUMMARY'}
                                        </h3>
                                        <div className="w-20 h-1.5 bg-neon-green" />
                                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                            {displayProposal.strategySub ?? 'STRATEGIC OUTLINE'}
                                        </p>
                                    </div>
                                    {page.overviewText && <div className="text-lg font-medium leading-[1.7] text-gray-700">{renderContent(page.overviewText)}</div>}
                                    {page.primaryGoalText && !isHtmlEmpty(page.primaryGoalText) && (
                                        <div className="pt-12">
                                            <div className="p-12 border-2 border-black rounded-[2.5rem] space-y-6">
                                                <p className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Primary Objective</p>
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
                                            {displayProposal.scopeTitle ?? 'SCOPE OF WORK'}
                                        </h3>
                                        <div className="w-20 h-1.5 bg-neon-green" />
                                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                            {displayProposal.scopeSub ?? 'RESOURCE DELIVERABLES'}
                                        </p>
                                    </div>
                                    <div className="flex-1 flex flex-col">
    {renderContent(page.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-3")}
</div>
                                    {idx === paginatedPages.length - 1 && !isHidden('signatures') && (displayProposal.showSignatures || displayProposal.showSeal) && (
                                        <div className="mt-auto pt-12 flex items-center gap-4 border-t border-gray-100">
                                            <div className="w-10 h-10 bg-white dark:bg-black flex items-center justify-center shrink-0"><span className="text-[8px] font-black text-neon-green">NB</span></div>
                                            <div className="flex-1 relative">
                                                {displayProposal.showSignatures && (
                                                    <div className="space-y-4">
                                                        <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Official Authorization</p>
                                                        <div className="h-20 border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50">
                                                            {displayProposal.status === 'Accepted' ? (
                                                                displayProposal.approvalMetadata?.clientSignature ? (
                                                                    <img src={displayProposal.approvalMetadata?.clientSignature} className="max-h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" crossOrigin="anonymous" />
                                                                ) : (
                                                                    <span className="text-2xl font-signature text-black">{displayProposal.approvalMetadata?.signedBy || 'Authorized Signatory'}</span>
                                                                )
                                                            ) : (
                                                                displayProposal.approvalMetadata?.clientSignature || clientSignature ? (
                                                                    <img src={displayProposal.approvalMetadata?.clientSignature || clientSignature} className="max-h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" crossOrigin="anonymous" />
                                                                ) : (
                                                                    <span className="text-2xl font-signature text-gray-700 dark:text-gray-300">{signatureName || 'Signature Required'}</span>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {displayProposal.showSeal && (
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-70 mix-blend-multiply">
                                                        <DocumentSeal className="w-16 h-16 grayscale brightness-0" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {page.type === 'proposal' && (
                                <div className="space-y-16 py-8">
                                    <div className="mb-10 space-y-3">
                                        <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                            {displayProposal.proposalTitle ?? 'DELIVERABLES'}
                                        </h3>
                                        <div className="w-20 h-1.5 bg-neon-green" />
                                        <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                            {displayProposal.proposalSub ?? 'PROJECT INVENTORY'}
                                        </p>
                                    </div>
                                    {page.deliverables?.length > 0 && (
                                        <div className="space-y-6">
                                            <table className="w-full text-left border-collapse border border-black">
                                                <thead>
                                                    <tr className="bg-white dark:bg-black text-[9px] font-black uppercase text-gray-900 dark:text-white tracking-[0.3em]">
                                                        <th className="p-4 w-12 text-center border-r border-black/20 dark:border-white/20">#</th>
                                                        <th className="p-4 border-r border-black/20 dark:border-white/20">Deliverable</th>
                                                        <th className="p-4 text-center w-28 border-r border-black/20 dark:border-white/20">Qty / Unit</th>
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
                                        <div className="space-y-6 pt-4">
                                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mb-6">Requirements From Client</p>
                                            <div className="p-8 border-2 border-gray-200 space-y-0">
                                                {page.clientRequirements.map((r, i) => (
                                                    <div key={r.id || i} className={cn("flex items-start gap-4 py-4", i > 0 && "border-t border-gray-100")}>
                                                        <div className="w-8 h-8 bg-white dark:bg-black flex items-center justify-center shrink-0 mt-0.5"><span className="text-[9px] font-black text-gray-900 dark:text-white">{String(i + 1).padStart(2, '0')}</span></div>
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
                                             {displayProposal.inventoryTitle ?? 'RESOURCE INVENTORY'}
                                         </h3>
                                         <div className="w-20 h-1.5 bg-neon-green" />
                                         <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                             {page.tablePageIdx > 1 
                                                 ? `${displayProposal.inventorySub ?? 'COMMERCIALS BREAKDOWN'} — Part ${page.tablePageIdx}` 
                                                 : (displayProposal.inventorySub ?? 'COMMERCIALS BREAKDOWN')}
                                         </p>
                                     </div>
                                     <table className="w-full text-left border-collapse border border-black">
                                          <thead>
                                              <tr className="bg-white dark:bg-black text-[9px] font-black uppercase text-gray-900 dark:text-white tracking-[0.3em]">
                                                  {(displayProposal?.tableColumns || defaultColumns).map((col, cIdx, arr) => {
                                                      const colType = col.type || (col.key === 'price' ? 'amount' : (col.key === 'qty' ? 'number' : 'text'));
                                                      return (
                                                          <th 
                                                              key={col.key} 
                                                              className={cn(
                                                                  "p-4",
                                                                  cIdx < arr.length - 1 && "border-r border-black/20 dark:border-white/20",
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
                                                  const cols = displayProposal?.tableColumns || defaultColumns;
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
                                         <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                             {(displayProposal.customPages?.[page.pageIndex]?.subtitle || "Additional Specifications").toUpperCase()}
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
                                         <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">Part {page.termsPageIdx}</p>
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
                                                  {displayProposal.commercialsTitle ?? 'COMMERCIAL TERMS'}
                                              </h3>
                                              <div className="w-20 h-1.5 bg-neon-green" />
                                              <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                  {displayProposal.commercialsSub ?? 'SETTLEMENT & SIGN-OFF'}
                                              </p>
                                          </div>                                   
                                         <div className={cn("grid gap-12 items-start", displayProposal.hideTotalColumn ? "grid-cols-1" : "grid-cols-2")}>
                                             <div className="space-y-8">
                                                 {page.termsText && (
                                                     <div className="space-y-3">
                                                         <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">General Terms</h4>
                                                         <div className="text-[11px] font-semibold text-gray-600 leading-relaxed space-y-2">{renderContent(page.termsText)}</div>
                                                     </div>
                                                 )}
                                                 {page.paymentDetailsText && (

                                                     <div className="p-6 bg-gray-50 border border-gray-150 rounded-2xl space-y-2">

                                                         <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Settlement Details</p>

                                                         <div className="text-[11px] font-mono font-bold text-black whitespace-pre-line leading-relaxed">{page.paymentDetailsText}</div>

                                                     </div>

                                                 )}
                                             </div>
                                             {!displayProposal.hideTotalColumn && (<div className="space-y-4">
                                                 <div className="bg-gray-50/50 border border-gray-250/60 rounded-[2rem] p-8 space-y-6">
                                                     <div className="flex justify-between items-center pb-4 border-b border-gray-200/60">
                                                         <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Subtotal</span>
                                                         <span className="text-base font-bold text-black font-mono">₹{subtotal.toLocaleString()}</span>
                                                     </div>
                                                     {displayProposal.showGst && (
                                                         <div className="flex justify-between items-center pb-4 border-b border-gray-200/60">
                                                             <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">GST ({displayProposal.gstRate}%)</span>
                                                             <span className="text-base font-bold text-black font-mono">₹{gstAmount.toLocaleString()}</span>
                                                         </div>
                                                     )}
                                                     <div className="p-8 bg-white dark:bg-black text-right relative overflow-hidden rounded-[1.5rem] shadow-xl">
                                                         <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-3">Total Estimated Cost</p>
                                                         <h2 className="text-3xl font-black tracking-widest text-gray-900 dark:text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2>
                                                         <div className="absolute top-0 right-0 w-1.5 h-full bg-neon-green" />
                                                     </div>
                                                     {displayProposal.advanceRequested > 0 && (
                                                         <div className="p-6 bg-neon-green/5 border border-neon-green/20 rounded-[1.5rem] flex justify-between items-center">
                                                             <div>
                                                                 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Advance Fee ({displayProposal.advanceRequested}%)</span>
                                                                 <span className="text-[7px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Due upon signature</span>
                                                             </div>
                                                             <span className="text-xl font-black text-black font-mono">₹{(totalAmount * displayProposal.advanceRequested / 100).toLocaleString()}</span>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>)}
                                         </div>
                                     </div>                                           
                                     
                                    {/* Row 2: Collapsible Signatures/Seals Block (always expanded in PDF export, if !isHidden('signatures')) */}
                                    {idx === paginatedPages.length - 1 && !isHidden('signatures') && (displayProposal.showSignatures || displayProposal.showSeal) && (
                                        <div className="border border-gray-200 rounded-2xl overflow-hidden mt-4 bg-white p-5">
                                            <div className="relative">
                                                <div className="grid grid-cols-2 gap-8 relative z-20">
                                                    {/* Provider Side */}
                                                    {displayProposal.showSignatures ? (
                                                        <div className="space-y-4 text-left">
                                                            <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">For {currentLogo.label}</p>
                                                            <div className="h-16 flex items-end">
                                                                {displayProposal.providerSignature ? (
                                                                    <img src={displayProposal.providerSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Provider Signature" crossOrigin="anonymous" />
                                                                ) : (
                                                                    <p className="text-2xl font-signature text-black leading-none italic opacity-60">{displayProposal.senderName || 'Authorized Signatory'}</p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <p className="text-[10px] font-black uppercase text-black">{displayProposal.senderName || 'Authorized Signatory'}</p>
                                                                <p className="text-[8px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest italic">{displayProposal.senderDesignation || 'Director of Operations'}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1 text-left flex flex-col justify-end">
                                                            <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">For {currentLogo.label}</p>
                                                            <p className="text-[10px] font-black text-black">{displayProposal.senderName || currentLogo.label}</p>
                                                        </div>
                                                    )}

                                                    {/* Client/Receiver Side */}
                                                    {displayProposal.showSignatures ? (
                                                        <div className="space-y-4 text-right">
                                                            <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">For {displayProposal.clientName || 'Valued Partner'}</p>
                                                            <div className="h-16 flex items-end justify-end">
                                                                {displayProposal.approvalMetadata?.clientSignature ? (
                                                                    <img src={displayProposal.approvalMetadata?.clientSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" crossOrigin="anonymous" />
                                                                ) : (
                                                                    <p className="text-2xl font-signature text-black leading-none">{displayProposal.approvalMetadata?.signedBy || (clientSignature ? 'Authorized Signatory' : 'Type name to sign')}</p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <p className="text-[10px] font-black uppercase text-black">{displayProposal.approvalMetadata?.signedBy || signatureName || 'Authorized Signatory'}</p>
                                                                <p className="text-[8px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest italic">Authorized Signatory</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1 text-right flex flex-col justify-end">
                                                            <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">For {displayProposal.clientName || 'Valued Partner'}</p>
                                                            <p className="text-[10px] font-black text-black">{displayProposal.approvalMetadata?.signedBy || signatureName || 'Authorized Signatory'}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Seal Overlay */}
                                                {displayProposal.showSeal && (
                                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-70 mix-blend-multiply">
                                                        <DocumentSeal className="w-32 h-32 grayscale brightness-0" />
                                                    </div>
                                                )}

                                                {/* Non-Repudiation Footprints */}
                                                {(displayProposal.status === 'Accepted' || clientSignature) && (
                                                    <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-[8px] font-black uppercase tracking-widest text-gray-500">
                                                        <div className="space-y-1">
                                                            <div className="flex gap-2"><span>Network IP:</span><span className="text-black">{displayProposal.approvalMetadata?.ip || ipAddress}</span></div>
                                                            <div className="flex gap-2"><span>Verification:</span><span className="text-neon-green">Secured Handshake</span></div>
                                                        </div>
                                                        <div className="space-y-1 text-right">
                                                            <div className="flex justify-end gap-2"><span>Timestamp:</span><span className="text-black">{displayProposal.approvalMetadata?.signedAt ? new Date(displayProposal.approvalMetadata.signedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</span></div>
                                                            <div className="flex justify-end gap-2"><span>Ref ID:</span><span className="text-black">{(displayProposal.id || 'Draft').slice(-8).toUpperCase()}</span></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {page.type === 'attachments' && (
                                <div className="space-y-12 py-10 px-4 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="mb-10 space-y-3">
                                            <h3 className="text-3xl font-black text-black tracking-tight uppercase leading-none">
                                                APPENDIX / ATTACHMENTS.
                                            </h3>
                                            <div className="w-20 h-1.5 bg-neon-green" />
                                            <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.35em] mt-3">
                                                SUPPORTING INSTRUMENTS & DOCUMENTATION
                                            </p>
                                        </div>
                                        
                                        <div className="flex flex-col gap-10 mt-12 pb-10">
                                            {(page.attachments || []).map((attachment, idx) => {
                                                const isSpreadsheet = attachment.fileType === 'spreadsheet';
                                                const isPdf = attachment.fileType === 'pdf';
                                                const isImage = attachment.fileType === 'image';
                                                const qrCodeUrl = `/api/qr?size=300&margin=1&text=${encodeURIComponent(attachment.url)}`;
                                                
                                                if (isImage) {
                                                    return (
                                                        <div key={idx} className="w-full relative rounded-2xl overflow-hidden border border-gray-200">
                                                            <img src={attachment.url} alt={attachment.name} className="w-full h-auto object-contain" />
                                                            <div className="absolute top-4 left-4 bg-white dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-wider">
                                                                {attachment.name}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                
                                                if (isPdf) {
                                                    return (
                                                        <div key={idx} className="w-full h-[600px] relative rounded-2xl overflow-hidden border border-gray-200">
                                                            <iframe src={attachment.url} title={attachment.name} className="w-full h-full border-none bg-gray-50" />
                                                            <div className="absolute top-4 left-4 bg-white dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-wider pointer-events-none">
                                                                {attachment.name}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={idx} className="p-6 border border-gray-200 rounded-[2rem] flex flex-col justify-between h-44 relative bg-gray-50/50">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="min-w-0">
                                                                <h4 className="text-xs font-black text-black uppercase tracking-wider truncate" title={attachment.name}>
                                                                    {attachment.name}
                                                                </h4>
                                                                <p className="text-[8px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mt-1">
                                                                    {attachment.type === 'file' ? 'Uploaded Storage File' : 'Linked URL'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-end justify-between mt-4">
                                                            <a 
                                                                href={attachment.url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="text-[9px] font-black uppercase tracking-widest text-neon-green bg-white dark:bg-black hover:bg-zinc-800 transition-colors px-3 py-1.5 rounded-xl inline-block"
                                                            >
                                                                View Document &rarr;
                                                            </a>
                                                            
                                                            <div className="w-14 h-14 bg-white p-0.5 rounded-lg border border-gray-200 shadow-sm shrink-0">
                                                                <img src={qrCodeUrl} alt="QR Access" className="w-full h-full object-contain" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-auto pt-8 pb-10 border-t border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.4em]">
                            <p className="w-1/3 text-left">© NEWBI ENTERTAINMENT & MARKETING LLP</p>
                            <p className="w-1/3 text-center text-gray-600 truncate px-2"></p>
                            <p className="w-1/3 text-right text-black">Page {idx + 1} of {paginatedPages.length}</p>
                        </div>
                    </div>
                    )
                ))}
            </div>


            <SignatureModal 
                isOpen={isSignatureModalOpen} 
                onClose={() => setIsSignatureModalOpen(false)} 
                onSave={(sig, name) => {
                    setClientSignature(sig);
                    setSignatureName(name);
                }}
                initialName={signatureName}
            />

            {/* Email needed before the signature is recorded */}
            <Sheet open={isVerifying} onClose={() => !isSubmitting && setIsVerifying(false)} variant="dialog" size="sm" zIndex={1000}
                title="Confirm your email" subtitle="We send the signed copy here and record it with your signature."
                footer={(
                    <div className="flex gap-2">
                        <DocButton variant="secondary" onClick={() => setIsVerifying(false)} disabled={isSubmitting} className="flex-1">Cancel</DocButton>
                        <DocButton theme={theme} onClick={handleApproveProposal} busy={isSubmitting} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail.trim())} className="flex-1">Accept and sign</DocButton>
                    </div>
                )}>
                <div className="space-y-3">
                    <TextField theme={theme} label="Work email" required type="email" inputMode="email" value={verificationEmail} onChange={(e) => setVerificationEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
                    <p className="flex items-center gap-2 text-[12.5px] text-gray-500 dark:text-zinc-400"><Globe size={14} /> Signing from {/\d/.test(String(ipAddress)) ? ipAddress : 'this device'}</p>
                </div>
            </Sheet>

            {/* Attachments */}
            <Sheet open={isAttachmentDrawerOpen} onClose={() => setIsAttachmentDrawerOpen(false)} title="Attachments" subtitle="Supporting files shared with this proposal.">
                <div className="space-y-2">
                    {(displayProposal.attachments || []).map((attachment, idx) => {
                        const isSpreadsheet = attachment.fileType === 'spreadsheet';
                        const isPdf = attachment.fileType === 'pdf';
                        const Icon = isSpreadsheet ? FileSpreadsheet : isPdf ? FileText : LinkIcon;
                        return (
                            <button key={attachment.id || idx} type="button"
                                onClick={() => { setPreviewingAttachment(attachment); setIsAttachmentDrawerOpen(false); }}
                                className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-black/[0.07] bg-white px-3.5 text-left transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                    isSpreadsheet ? 'bg-emerald-500/10 text-emerald-600' : isPdf ? 'bg-red-500/10 text-red-500' : 'bg-sky-500/10 text-sky-600')}>
                                    <Icon size={17} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[14px] font-semibold text-gray-900 dark:text-white">{attachment.name || `Attachment ${idx + 1}`}</span>
                                    <span className="block text-[12px] text-gray-500 dark:text-zinc-400">{isSpreadsheet ? 'Spreadsheet' : isPdf ? 'PDF' : attachment.type === 'file' ? 'File' : 'Link'}</span>
                                </span>
                                <span className="shrink-0 text-[13px] font-semibold text-emerald-600 dark:text-neon-green">Open</span>
                            </button>
                        );
                    })}
                </div>
            </Sheet>

            {/* Inline Preview Modal */}
            <AnimatePresence>
                {previewingAttachment && (
                    <div className="fixed inset-0 z-[1000] flex flex-col bg-[#eef0f3] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] dark:bg-[#07080b] sm:p-6 no-print">
                        {/* Header */}
                        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 sm:mb-5">
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border",
                                    previewingAttachment.fileType === 'spreadsheet' && "bg-[#107C41]/10 border-[#107C41]/20 text-[#107C41]",
                                    previewingAttachment.fileType === 'pdf' && "bg-red-500/10 border-red-500/20 text-red-500",
                                    (previewingAttachment.fileType !== 'spreadsheet' && previewingAttachment.fileType !== 'pdf') && "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                )}>
                                    {previewingAttachment.fileType?.toUpperCase() || 'Attachment'}
                                </span>
                                <h3 className="min-w-0 truncate text-[15px] font-bold text-gray-900 dark:text-white">{previewingAttachment.name}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <a 
                                    href={previewingAttachment.url} 
                                    download 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex h-10 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 text-[13px] font-semibold text-gray-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-100"
                                >
                                    <ExternalLink size={15} /> <span className="hidden sm:inline">Open in new tab</span>
                                </a>
                                <button 
                                    onClick={() => setPreviewingAttachment(null)}
                                    aria-label="Close preview"
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-gray-600 dark:bg-white/10 dark:text-zinc-200"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-h-0 bg-black/5 dark:bg-white/5 rounded-3xl overflow-hidden relative border border-black/10 dark:border-white/5">
                            {previewingAttachment.fileType === 'spreadsheet' || previewingAttachment.fileType === 'pdf' ? (
                                <iframe 
                                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewingAttachment.url)}&embedded=true`} 
                                    className="w-full h-full border-0 bg-white" 
                                    title="Document Preview"
                                />
                            ) : previewingAttachment.url.includes('google.com/spreadsheets') ? (
                                <iframe 
                                    src={previewingAttachment.url.replace('/edit', '/preview')} 
                                    className="w-full h-full border-0 bg-white" 
                                    title="Google Sheet Preview"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8 text-center bg-gray-100 dark:bg-zinc-950">
                                    <div className="w-16 h-16 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-neon-green">
                                        <LinkIcon size={28} />
                                    </div>
                                    <div className="space-y-2 max-w-md">
                                        <h4 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white">External Document Hub.</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed font-sans">
                                            This attachment is hosted on an external platform. Click below to view the interactive dashboard in a new tab.
                                        </p>
                                    </div>
                                    <a 
                                        href={previewingAttachment.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="h-12 px-8 bg-neon-green text-black font-black uppercase tracking-widest text-[9px] rounded-xl flex items-center gap-2 hover:scale-105 transition-all shadow-[0_10px_30px_rgba(57,255,20,0.3)]"
                                    >
                                        Open Dashboard &rarr;
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Proposal;