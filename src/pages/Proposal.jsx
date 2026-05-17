import React, { useRef, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Cpu from 'lucide-react/dist/esm/icons/cpu';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import { motion, AnimatePresence } from 'framer-motion';
import DocumentSeal from '../components/ui/DocumentSeal';
import SignaturePad from '../components/ui/SignaturePad';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useStore } from '../lib/store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import SignatureModal from '../components/ui/SignatureModal';
import NotificationBell from '../components/NotificationBell';

const Proposal = () => {
    const { id } = useParams();
    const { proposals, updateProposalStatus, loading, user } = useStore();
    const proposalRef = useRef(null);
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
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 850) {
                const newScale = (window.innerWidth - 32) / 850;
                setScale(newScale);
            } else {
                setScale(1);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const proposal = proposals.find(p => p.id === id);
    const isAdmin = (localStorage.getItem('adminAuth') === 'true') || (user?.role === 'super_admin' || user?.role === 'developer');

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

    useEffect(() => {
        if (user?.email && !verificationEmail) {
            setVerificationEmail(user.email);
        }
    }, [user, verificationEmail]);

    useEffect(() => {
        if (proposal && !isAdmin) {
            const logAccess = async () => {
                const deviceDetails = {
                    ua: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    timestamp: new Date().toISOString(),
                    screen: `${window.screen.width}x${window.screen.height}`
                };
                
                try {
                    const currentLogs = proposal.accessLogs || [];
                    const lastLog = currentLogs[currentLogs.length - 1];
                    const tenMins = 10 * 60 * 1000;
                    if (!lastLog || (new Date() - new Date(lastLog.timestamp) > tenMins)) {
                        await useStore.getState().updateProposal(id, { 
                            lastOpened: new Date().toISOString(),
                            accessLogs: [...currentLogs, deviceDetails]
                        });
                    }
                } catch (err) {
                    console.error("Analytics error:", err);
                }
            };
            logAccess();
        }
    }, [id, isAdmin, proposal]);

    useEffect(() => {
        const fetchIp = async () => {
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const data = await res.json();
                setIpAddress(data.ip);
                
                if (id && displayProposal) {
                    useStore.getState().logDocumentAccess('proposal', id, {
                        ip: data.ip,
                        userAgent: navigator.userAgent,
                        userEmail: useStore.getState().user?.email || 'Guest'
                    });
                }
            } catch (e) {
                console.error("IP detection failed", e);
            }
        };
        if (displayProposal) fetchIp();
    }, [id, displayProposal]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020202] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-green"></div>
            </div>
        );
    }

    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png' },
        { id: 'media', label: 'Newbi Media', path: '/logo_document.png' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/logo_document.png' }
    ];

    const currentLogo = logoOptions.find(l => l.id === displayProposal.selectedLogo) || logoOptions[0];

    const items = displayProposal.items || [];
    const subtotal = items.reduce((sum, item) => sum + ((item.qty || 1) * (item.price || 0)), 0);
    const gstAmount = displayProposal?.showGst ? (subtotal * (displayProposal.gstRate || 18)) / 100 : 0;
    const totalAmount = subtotal + gstAmount;

    const handleDownloadPDF = async () => {
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
        if (!signatureName.trim()) {
            useStore.getState().addToast('Please enter your full name to authorize this quotation.', 'error');
            return;
        }

        if (!verificationEmail.trim() || !verificationEmail.includes('@')) {
            setIsVerifying(true);
            return;
        }
        
        setIsSubmitting(true);
        try {
            const deviceMetadata = {
                ua: navigator.userAgent,
                platform: navigator.platform,
                screen: `${window.screen.width}x${window.screen.height}`,
                language: navigator.language,
                ip: ipAddress,
                verifiedEmail: verificationEmail,
                timestamp: new Date().toISOString()
            };

            await updateProposalStatus(id, 'Accepted');
            await useStore.getState().updateProposal(id, {
                status: 'Accepted',
                approvalMetadata: {
                    signedBy: signatureName,
                    clientSignature: clientSignature,
                    signedAt: new Date().toISOString(),
                    ip: ipAddress,
                    email: verificationEmail,
                    device: deviceMetadata,
                    footprint: {
                        browser: navigator.userAgent.split(' ').slice(-1)[0],
                        os: navigator.platform,
                        res: `${window.screen.width}x${window.screen.height}`
                    }
                }
            });
            setIsVerifying(false);
            useStore.getState().addToast('Proposal signed and accepted successfully!', 'success');
        } catch (error) {
            console.error('Error approving proposal:', error);
            useStore.getState().addToast('Signing failed. Please contact support for help.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefuseProposal = async () => {
        if (displayProposal.status === 'Accepted' || displayProposal.status === 'Rejected') return;
        const reason = prompt("Please provide a reason for declining this proposal (optional):");
        if (reason === null) return; // User cancelled prompt

        setIsSubmitting(true);
        try {
            await updateProposalStatus(id, 'Rejected');
            await useStore.getState().updateProposal(id, {
                status: 'Rejected',
                rejectionMetadata: {
                    reason: reason || 'No reason provided',
                    rejectedAt: new Date().toISOString(),
                    ip: ipAddress
                }
            });
            useStore.getState().addToast('Proposal declined.', 'success');
        } catch (error) {
            console.error('Error refusing proposal:', error);
            useStore.getState().addToast('Couldn\'t update the status. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Strategic Proposal - ${displayProposal.clientName}`,
                    text: `View our Strategic Memorandum for ${displayProposal.campaignName}.`,
                    url: url
                });
            } catch (err) {
                console.error("Share failed:", err);
            }
        } else {
            navigator.clipboard.writeText(url);
            useStore.getState().addToast("Link copied to clipboard!", 'success');
        }
    };

    const isHidden = (f) => (displayProposal.hiddenFields || []).includes(f);

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
                elements.push(<div key={`spacer-${i}`} className="h-3" />);
                i++;
                continue;
            }

            // Horizontal Line
            if (line.match(/^[-*_]{3,}$/)) {
                elements.push(<div key={`hr-${i}`} className="h-[1.5px] bg-black/10 my-8 w-full" />);
                i++;
                continue;
            }

            // Heading
            if (line.startsWith('## ')) {
                elements.push(<p key={i} className="text-[14px] font-black text-black uppercase tracking-[0.2em] mt-8 mb-3 border-b border-black pb-1.5">{line.slice(3)}</p>);
            // Bullet
            } else if (line.match(/^[•\-\*]\s/)) {
                const items = [];
                while (i < lines.length && lines[i].trim().match(/^[•\-\*]\s/)) {
                    items.push(lines[i].trim().replace(/^[•\-\*]\s/, ''));
                    i++;
                }
                elements.push(
                    <div key={`ul-${i}`} className="pl-4 space-y-1.5 my-3">
                        {items.map((item, j) => <div key={j} className="flex items-start gap-3"><span className="text-neon-green mt-1.5 text-[8px]">●</span><span className={baseClass} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} /></div>)}
                    </div>
                );
                continue;
            // Numbered
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
                    dangerouslySetInnerHTML={{ __html: content }} 
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

    const getPaginatedPages = () => {
        const pages = [];
        if (!isHidden('cover')) {
            pages.push({ type: 'cover', items: [] });
        }
        
        if (!isHidden('strategy') && (!isHidden('overview') || !isHidden('primaryGoal'))) {
            pages.push({ type: 'strategy', items: [] });
        }
        
        if (!isHidden('scopeOfWork') && displayProposal.scopeOfWork) {
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
                        h += 66;
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
            const totalHeight = estimateBlockHeight(displayProposal.scopeOfWork);
            
            if (totalHeight <= MAX_PAGE_HEIGHT) {
                pages.push({ type: 'scope', items: [], scopeText: displayProposal.scopeOfWork });
            } else {
                let currentPageText = '';
                let pageIndex = 1;
                const words = displayProposal.scopeOfWork.split(' ');
                
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

    const paginatedPages = getPaginatedPages();

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-neon-green selection:text-black font-['Outfit']">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
                body { font-family: 'Outfit', sans-serif; }
                .font-signature { font-family: 'Caveat', cursive; }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .proposal-page-render { margin: 0 !important; box-shadow: none !important; page-break-after: always !important; }
                }
            `}} />

            {!isExporting && (
                <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-3xl border-b border-white/5 h-20 flex items-center px-6 no-print">
                    <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-6">
                            <Link to={isAdmin ? "/admin/proposals" : "/"} className="p-2.5 sm:p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5"><ArrowLeft size={16} sm={18} /></Link>
                            <div className="min-w-0">
                                <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1 truncate">Strategic Quote</p>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", displayProposal.status === 'Accepted' ? "bg-neon-green" : "bg-blue-500 animate-pulse")} />
                                    <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest truncate">{displayProposal.status || 'DRAFT'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button onClick={handleShare} className="p-2.5 sm:p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 text-gray-400 hover:text-neon-blue transition-all"><Share2 size={16} sm={18} /></button>
                            <button onClick={() => window.print()} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 hidden sm:block"><Printer size={18} /></button>
                            <Button onClick={handleDownloadPDF} className="bg-neon-green text-black font-black uppercase tracking-widest text-[9px] sm:text-[10px] h-10 sm:h-12 px-4 sm:px-8 rounded-xl sm:rounded-2xl shadow-[0_10px_30px_rgba(57,255,20,0.3)]">
                                <Download size={14} sm={16} className="sm:mr-2" /> <span className="hidden sm:inline">Export PDF</span><span className="sm:hidden">Export</span>
                            </Button>
                        </div>
                    </div>
                </nav>
            )}

            <main className="pt-24 sm:pt-32 pb-32 flex flex-col items-center px-4 sm:px-0">
                <div ref={proposalRef} className="flex flex-col gap-8 sm:gap-16 origin-top transition-transform duration-500" style={{ transform: `scale(${scale})`, marginBottom: `${(scale - 1) * 1123 * paginatedPages.length}px` }}>
                    {paginatedPages.map((page, idx) => (
                        <div key={idx} className="proposal-page-render w-[794px] h-[1123px] bg-white text-black relative shadow-[0_60px_120px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col p-[15mm] rounded-[2px]">
                            {/* Header Logic */}
                            <div className={cn("flex justify-between items-end mb-8 pb-4 border-b-2 border-black", idx > 0 && "mb-4 pb-2 opacity-40 border-gray-200")}>
                                <div className="flex flex-col gap-6 items-start">
                                    <img src={currentLogo.path} alt="Logo" className={cn("h-16 w-auto object-contain", idx > 0 && "h-8")} crossOrigin="anonymous" />
                                </div>
                                <div className="text-right space-y-3">
                                    <div><h4 className={cn("text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0", idx > 0 && "text-[7px]")}>Quotation</h4><p className={cn("text-lg font-black text-black tracking-widest font-mono", idx > 0 && "text-sm")}>{displayProposal.proposalNumber}</p></div>
                                    {idx === 0 && (
                                        <div className="space-y-0.5"><p className="text-[8px] font-black text-gray-400 uppercase">Issue Date</p><p className="text-[10px] font-black text-black">{new Date(displayProposal.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <div className="absolute inset-0 flex flex-col px-1">
                                    {page.type === 'cover' && (
                                    <div className="h-full flex flex-col justify-start space-y-20 py-8">
                                        <div className="grid grid-cols-2 gap-10">
                                            <div className="space-y-6 min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug break-words">{displayProposal.clientName || 'Valued Partner'}</h2>{!isHidden('clientAddress') && <p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{displayProposal.clientAddress || 'Client Address'}</p>}</div></div>
                                            <div className="space-y-6 text-right min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Engagement Mission</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug italic break-words">{displayProposal.campaignName || 'Mission Title'}</h2><p className="text-[12px] font-black text-neon-green bg-black px-3 py-1 inline-block uppercase tracking-widest">Period: {displayProposal.campaignDuration || 'TBD'}</p></div></div>
                                        </div>
                                        <div className="pt-16 space-y-10"><div className="flex items-center gap-4"><div className="w-12 h-1 bg-black" /><p className="text-[11px] font-black uppercase tracking-[0.6em]">Strategic Project Memorandum</p></div>{!isHidden('coverDescription') && <p className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl text-justify">{displayProposal.coverDescription || 'Cover description pending...'}</p>}</div>
                                        <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{displayProposal.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Strategic Commercial</p></div></div>
                                    </div>
                                )}

                                {page.type === 'strategy' && (
                                    <div className="space-y-16 py-8">
                                        <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Execution Roadmap.</h3><div className="w-16 h-1 bg-neon-green" /></div>
                                        {!isHidden('overview') && <div className="text-xl font-medium leading-[1.7] text-gray-700 text-justify max-w-2xl italic">{renderContent(displayProposal.overview || 'Strategic framework pending...', 'text-lg')}</div>}
                                        {!isHidden('primaryGoal') && (
                                            <div className="pt-12">
                                                <div className="p-12 border-2 border-black rounded-[2.5rem] space-y-6">
                                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Primary Objective</p>
                                                    <div className="text-xl font-black text-black leading-relaxed">{renderContent(displayProposal.primaryGoal || 'Objective pending...', 'text-lg font-black')}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {page.type === 'scope' && (
                                    <div className="h-full flex flex-col py-8">
                                        {!displayProposal.isBulkGenerated && (
                                            <div className="space-y-4 mb-12">
                                                <h3 className="text-3xl font-black uppercase tracking-tighter text-black">Scope of Work.</h3>
                                                <div className="w-16 h-1 bg-black" />
                                            </div>
                                        )}
                                        <div className="flex-1 flex flex-col">
                                            <div className="relative">
                                                {!displayProposal.isBulkGenerated && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-neon-green" />}
                                                <div className={displayProposal.isBulkGenerated ? "pl-0" : "pl-10"}>
                                                    {!displayProposal.isBulkGenerated && !page.scopePage && <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">Execution Framework</p>}
                                                    {!displayProposal.isBulkGenerated && page.scopePage > 1 && <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">Execution Framework (Continued)</p>}
                                                    {renderContent(page.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-8")}
                                                </div>
                                            </div>
                                        </div>
                                        {idx === paginatedPages.length - 1 && displayProposal.showSignatures && (
                                            <>
                                                <div className="mt-auto pt-12 flex flex-col gap-8 border-t border-gray-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0"><span className="text-[8px] font-black text-neon-green">NB</span></div>
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Official Authorization</label>
                                                            <div className="relative group">
                                                                {displayProposal.status === 'Accepted' ? (
                                                                    <div className="h-24 sm:h-32 flex items-end justify-center">
                                                                        {displayProposal.approvalMetadata?.clientSignature ? (
                                                                            <img src={displayProposal.approvalMetadata.clientSignature} className="max-h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" />
                                                                        ) : (
                                                                            <p className="text-4xl sm:text-6xl font-signature text-black leading-none">{displayProposal.approvalMetadata?.signedBy}</p>
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
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-center py-6">
                                                            {displayProposal.status === 'Accepted' && (
                                                                <DocumentSeal type="proposal" date={displayProposal.approvalMetadata?.signedAt} />
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center mt-4">By signing, you confirm that you have read and agreed to the terms of engagement.</p>
                                                    </div>
                                                    <Button 
                                                        onClick={handleApproveProposal} 
                                                        disabled={isSubmitting || !signatureName.trim() || displayProposal.status === 'Accepted'} 
                                                        className="w-full h-16 sm:h-20 bg-black text-white font-black uppercase tracking-[0.3em] text-[10px] sm:text-xs rounded-2xl hover:bg-neon-green hover:text-black transition-all group overflow-visible relative shadow-2xl disabled:opacity-50 px-8"
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
                                        <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Proposal Plan.</h3><div className="w-16 h-1 bg-neon-green" /></div>
                                        {(displayProposal.deliverables?.length > 0 && displayProposal.deliverables.some(d => d.item)) && (
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
                                                        {displayProposal.deliverables.filter(d => d.item).map((d, i) => (
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
                                        {(displayProposal.clientRequirements?.length > 0 && displayProposal.clientRequirements.some(r => r.description)) && (
                                            <div className="space-y-6 pt-4">
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Requirements From Client</p>
                                                <div className="p-6 border-2 border-gray-200 space-y-0">
                                                    {displayProposal.clientRequirements.filter(r => r.description).map((r, i) => (
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
                                                {!isHidden('terms') && <div className="space-y-6"><h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">General Terms</h4><div className="text-[11px] font-semibold text-gray-600 leading-relaxed">{renderContent(displayProposal.terms)}</div></div>}
                                                {!isHidden('paymentDetails') && <div className="p-8 bg-gray-50 border border-gray-200 space-y-4"><p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Payment Information</p><div className="text-[11px] font-semibold font-mono text-black leading-relaxed">{renderContent(displayProposal.paymentDetails)}</div></div>}
                                                
                                                {idx === paginatedPages.length - 1 && displayProposal.showSignatures && (
                                                    <div className="p-10 bg-zinc-900/[0.03] border-2 border-gray-100 rounded-[40px] space-y-10 relative overflow-hidden group">
                                                        {displayProposal.status !== 'Accepted' ? (
                                                            <div className="space-y-10">
                                                                <div 
                                                                    onClick={() => setIsSignatureModalOpen(true)}
                                                                    className="relative h-48 bg-black/5 rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-black/10 hover:border-neon-green/40 transition-all group overflow-hidden"
                                                                >
                                                                    {clientSignature ? (
                                                                        <div className="relative group w-full h-full flex items-center justify-center p-8">
                                                                            <img src={clientSignature} alt="Client Signature" className="max-h-full object-contain grayscale mix-blend-multiply" />
                                                                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                                                <RefreshCw size={24} className="text-black" />
                                                                            </div>
                                                                            <div className="absolute top-4 right-4 flex gap-2">
                                                                                <button 
                                                                                    onClick={(e) => { e.stopPropagation(); setClientSignature(null); }}
                                                                                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-neon-green/10 transition-all duration-500">
                                                                                <PenTool size={32} className="text-gray-400 group-hover:text-neon-green" />
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <p className="text-[11px] font-black text-white uppercase tracking-widest">Click to sign document</p>
                                                                                <p className="text-[9px] text-gray-500 mt-2 uppercase tracking-tighter">Type, Draw or Upload Signature</p>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                    {/* Decorative lines */}
                                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-neon-green/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                                                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-neon-green/5 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2" />
                                                                </div>

                                                                {clientSignature && (
                                                                    <Button 
                                                                        onClick={handleApproveProposal} 
                                                                        disabled={isSubmitting || !signatureName.trim()} 
                                                                        className="w-full h-16 bg-neon-green text-black font-black uppercase tracking-widest text-[11px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(57,255,20,0.2)]"
                                                                    >
                                                                        {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                                                                        Authorize Strategic Memorandum
                                                                    </Button>
                                                                )}
                                                                
                                                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest text-center italic">Digital footprints will be attached for verification.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-10 relative">
                                                                {/* Accepted View */}
                                                                <div className="grid grid-cols-2 gap-10">
                                                                    <div className="space-y-8 border-r border-gray-100 pr-10">
                                                                        <div className="space-y-6">
                                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-gray-100 pb-2">Provider Authorization</p>
                                                                            <div className="h-24 flex items-end">
                                                                                {displayProposal.providerSignature ? (
                                                                                    <img src={displayProposal.providerSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Provider Signature" />
                                                                                ) : (
                                                                                    <p className="text-4xl font-signature text-black leading-none italic opacity-90">Authorized Signatory</p>
                                                                                )}
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <p className="text-[11px] font-black uppercase text-black">{displayProposal.senderName || 'Newbi Entertainment'}</p>
                                                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">{displayProposal.senderDesignation || 'Service Provider'}</p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-6">
                                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-gray-100 pb-2">Client Authorization</p>
                                                                            <div className="h-24 flex items-end">
                                                                                {displayProposal.approvalMetadata.clientSignature ? (
                                                                                    <img src={displayProposal.approvalMetadata.clientSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" />
                                                                                ) : (
                                                                                    <p className="text-4xl font-signature text-black leading-none">{displayProposal.approvalMetadata.signedBy}</p>
                                                                                )}
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <p className="text-[11px] font-black uppercase text-black">{displayProposal.approvalMetadata.signedBy}</p>
                                                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">Authorized Signatory</p>
                                                                                <p className="text-[7px] text-gray-400 mt-1 uppercase tracking-tighter font-black">IP: {displayProposal.approvalMetadata.ip} | Signed: {new Date(displayProposal.approvalMetadata.signedAt).toLocaleString()}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-6">
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-gray-100 pb-2 text-right">Digital Footprints</p>
                                                                        <div className="space-y-2 text-[8px] font-black uppercase tracking-widest text-gray-500 text-right">
                                                                            <div className="flex justify-end gap-2"><span>IP Address:</span><span className="text-black">{displayProposal.approvalMetadata.ip}</span></div>
                                                                            <div className="flex justify-end gap-2"><span>Verified Email:</span><span className="text-black">{displayProposal.approvalMetadata.email}</span></div>
                                                                            <div className="flex justify-end gap-2"><span>User Agent:</span><span className="text-black max-w-[120px] truncate">{displayProposal.approvalMetadata.footprint?.browser || 'System'}</span></div>
                                                                            <div className="flex justify-end gap-2"><span>Timestamp:</span><span className="text-black">{new Date(displayProposal.approvalMetadata.signedAt).toISOString()}</span></div>
                                                                            <div className="flex justify-end gap-2"><span>Ref ID:</span><span className="text-black">{displayProposal.id.slice(-8).toUpperCase()}</span></div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Seal Overlay */}
                                                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] pointer-events-none z-10 opacity-80 mix-blend-multiply">
                                                                    <DocumentSeal className="w-48 h-48 grayscale brightness-0" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-6">
                                                <div className="p-8 border-2 border-black flex flex-col items-start gap-1 bg-gray-50"><span className="text-[11px] font-black text-black uppercase tracking-widest">Total Net Project Value</span><span className="text-xl font-black text-black tracking-widest font-mono">₹{subtotal.toLocaleString()}</span></div>
                                                {displayProposal.showGst && (<div className="p-8 border border-gray-200 flex flex-col items-start gap-1 text-gray-500"><span className="text-[10px] font-black uppercase">GST ({displayProposal.gstRate}%)</span><span className="text-xl font-black font-mono">₹{gstAmount.toLocaleString()}</span></div>)}
                                                <div className="p-10 bg-black text-right relative overflow-hidden shadow-xl"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Quotation Value</p><h2 className="text-4xl font-black tracking-tighter text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2><div className="absolute top-0 right-0 w-2 h-full bg-neon-green" /></div>
                                                {(displayProposal.advanceRequested > 0) && (
                                                    <div className="p-8 bg-neon-green/10 border-2 border-neon-green/20 flex flex-col items-start gap-2">
                                                        <span className="text-[11px] font-black text-black uppercase tracking-widest">Advance Payment Required</span>
                                                        <span className="text-3xl font-black text-black font-mono italic">₹{(totalAmount * (displayProposal.advanceRequested || 50) / 100).toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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
                                <div><h4 className={cn("text-[10px] font-black uppercase text-black tracking-[0.4em] mb-0", idx > 0 && "text-[7px]")}>Quotation</h4><p className={cn("text-lg font-black text-black tracking-widest font-mono", idx > 0 && "text-sm")}>{displayProposal.proposalNumber}</p></div>
                                {idx === 0 && (
                                    <div className="space-y-0.5"><p className="text-[8px] font-black text-gray-400 uppercase">Issue Date</p><p className="text-[10px] font-black text-black">{new Date(displayProposal.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            <div className="absolute inset-0 overflow-hidden flex flex-col px-1">
                            {page.type === 'cover' && (
                                <div className="h-full flex flex-col justify-start space-y-20 py-8">
                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="space-y-6 min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Client Entity</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug break-words">{displayProposal.clientName || 'Valued Partner'}</h2>{!isHidden('clientAddress') && <p className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-relaxed">{displayProposal.clientAddress || 'Client Address'}</p>}</div></div>
                                        <div className="space-y-6 text-right min-w-0"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-2">Project Specification</p><div className="space-y-2"><h2 className="text-lg font-black uppercase text-black leading-snug italic break-words">{displayProposal.campaignName || 'Project Title'}</h2><p className="text-[12px] font-black text-neon-green bg-black px-3 py-1 inline-block uppercase tracking-widest">Duration: {displayProposal.campaignDuration || 'TBD'}</p></div></div>
                                    </div>
                                    <div className="pt-16 space-y-10"><div className="flex items-center gap-4"><div className="w-12 h-1 bg-black" /><p className="text-[11px] font-black uppercase tracking-[0.6em]">Official Strategic Quotation</p></div>{!isHidden('coverDescription') && <p className="text-lg font-medium text-gray-700 leading-relaxed max-w-2xl text-justify">{displayProposal.coverDescription || 'Cover description pending...'}</p>}</div>
                                    <div className="mt-auto grid grid-cols-2 gap-10 pt-10 border-t border-gray-100"><div><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Quote Reference</p><p className="text-[11px] font-black text-black">{displayProposal.proposalNumber}</p></div><div className="text-right"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Classification</p><p className="text-[11px] font-black text-black italic">Strategic Commercial</p></div></div>
                                </div>
                            )}

                            {page.type === 'strategy' && (
                                <div className="space-y-16 py-8">
                                    <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Project Timeline.</h3><div className="w-16 h-1 bg-neon-green" /></div>
                                    {!isHidden('overview') && <div className="text-xl font-medium leading-[1.7] text-gray-700 text-justify max-w-2xl italic">{renderContent(displayProposal.overview || 'Strategic framework pending...', 'text-lg')}</div>}
                                    {!isHidden('primaryGoal') && (
                                        <div className="pt-12">
                                            <div className="p-12 border-2 border-black rounded-[2.5rem] space-y-6">
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Primary Objective</p>
                                                <div className="text-xl font-black text-black leading-relaxed">{renderContent(displayProposal.primaryGoal || 'Objective pending...', 'text-lg font-black')}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {page.type === 'scope' && (
                                <div className="h-full flex flex-col py-8">
                                    {!displayProposal.isBulkGenerated && (
                                        <div className="space-y-4 mb-12">
                                            <h3 className="text-3xl font-black uppercase tracking-tighter text-black">Scope of Work.</h3>
                                            <div className="w-16 h-1 bg-black" />
                                        </div>
                                    )}
                                    <div className="flex-1 flex flex-col">
                                        <div className="relative">
                                            {!displayProposal.isBulkGenerated && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-neon-green" />}
                                            <div className={displayProposal.isBulkGenerated ? "pl-0" : "pl-10"}>
                                                {!displayProposal.isBulkGenerated && !page.scopePage && <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">Execution Framework</p>}
                                                {!displayProposal.isBulkGenerated && page.scopePage > 1 && <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6">Execution Framework (Continued)</p>}
                                                {renderContent(page.scopeText || '', "text-[14px] leading-[1.8] text-gray-700 space-y-8")}
                                            </div>
                                        </div>
                                    </div>
                                    {idx === paginatedPages.length - 1 && displayProposal.showSignatures && (
                                        <div className="mt-auto pt-12 flex items-center gap-4 border-t border-gray-100">
                                            <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0"><span className="text-[8px] font-black text-neon-green">NB</span></div>
                                            <div className="flex-1">
                                                <div className="space-y-4">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Official Authorization</p>
                                                    <div className="h-20 border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                                                        {displayProposal.status === 'Accepted' ? (
                                                            displayProposal.approvalMetadata?.clientSignature ? (
                                                                <img src={displayProposal.approvalMetadata.clientSignature} className="max-h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" />
                                                            ) : (
                                                                <span className="text-2xl font-signature text-black">{displayProposal.approvalMetadata?.signedBy}</span>
                                                            )
                                                        ) : (
                                                            <span className="text-2xl font-signature text-gray-300">{signatureName || 'Signature Required'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {page.type === 'proposal' && (
                                <div className="space-y-16 py-8">
                                    <div className="space-y-4"><h3 className="text-3xl font-black uppercase tracking-tighter text-black">Proposal Plan.</h3><div className="w-16 h-1 bg-neon-green" /></div>
                                    {(displayProposal.deliverables?.length > 0 && displayProposal.deliverables.some(d => d.item)) && (
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
                                                    {displayProposal.deliverables.filter(d => d.item).map((d, i) => (
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
                                    {(displayProposal.clientRequirements?.length > 0 && displayProposal.clientRequirements.some(r => r.description)) && (
                                        <div className="space-y-6 pt-4">
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Requirements From Client</p>
                                            <div className="p-8 border-2 border-gray-200 space-y-0">
                                                {displayProposal.clientRequirements.filter(r => r.description).map((r, i) => (
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
                                            {!isHidden('terms') && <div className="space-y-6"><h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">General Terms</h4><div className="text-[11px] font-bold text-gray-500 italic leading-relaxed text-justify">{renderContent(displayProposal.terms)}</div></div>}
                                            {!isHidden('paymentDetails') && <div className="p-8 bg-gray-50 border border-gray-200 space-y-4"><p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Payment Information</p><div className="text-[11px] font-black font-mono text-black leading-relaxed">{renderContent(displayProposal.paymentDetails)}</div></div>}
                                            
                                            <div className="pt-10 space-y-10 border-t border-gray-100">
                                                {displayProposal.approvalMetadata && (
                                                    <div className="p-10 border-2 border-neon-green/30 bg-neon-green/5 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle size={80} className="text-neon-green" /></div>
                                                        <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] mb-8 flex items-center gap-2"><ShieldCheck size={14} /> Digitally Authorized</p>
                                                        <div className="space-y-4">
                                                            <div className="h-24 flex items-end">
                                                                {displayProposal.approvalMetadata.clientSignature ? (
                                                                    <img src={displayProposal.approvalMetadata.clientSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" />
                                                                ) : (
                                                                    <p className="text-6xl font-signature text-black leading-none">{displayProposal.approvalMetadata.signedBy}</p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xl font-black font-mono uppercase tracking-tighter text-black leading-none">{displayProposal.approvalMetadata.signedBy}</p>
                                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Authenticated on {new Date(displayProposal.approvalMetadata.signedAt).toLocaleString('en-GB')}</p>
                                                            </div>
                                                            <p className="text-[8px] font-bold text-gray-300 uppercase mt-4">Verification Ref: {displayProposal.id.slice(-12).toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="p-8 border-2 border-black flex flex-col items-start gap-1 bg-gray-50"><span className="text-[11px] font-black text-black uppercase tracking-widest">Total Net Project Value</span><span className="text-xl font-black text-black tracking-widest font-mono">₹{subtotal.toLocaleString()}</span></div>
                                            {displayProposal.showGst && (<div className="p-8 border border-gray-200 flex flex-col items-start gap-1 text-gray-500"><span className="text-[10px] font-black uppercase">GST ({displayProposal.gstRate}%)</span><span className="text-xl font-black font-mono">₹{gstAmount.toLocaleString()}</span></div>)}
                                            <div className="p-10 bg-black text-right relative overflow-hidden shadow-xl"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Quotation Value</p><h2 className="text-6xl font-black tracking-tighter text-white font-mono leading-none">₹{totalAmount.toLocaleString()}</h2><div className="absolute top-0 right-0 w-2 h-full bg-neon-green" /></div>
                                            {(displayProposal.advanceRequested > 0) && (
                                                <div className="p-8 bg-neon-green/10 border-2 border-neon-green/20 flex flex-col items-start gap-2">
                                                    <span className="text-[11px] font-black text-black uppercase tracking-widest">Advance Payment Required</span>
                                                    <span className="text-3xl font-black text-black font-mono italic">₹{(totalAmount * (displayProposal.advanceRequested || 50) / 100).toLocaleString()}</span>
                                                </div>
                                            )}

                                            {/* Final Action Area - Only if not accepted/rejected AND it's the final page */}
                                            {idx === paginatedPages.length - 1 && (
                                                <>
                                                    {displayProposal.status !== 'Accepted' && displayProposal.status !== 'Rejected' ? (
                                                <div className="pt-8 space-y-6">
                                                    {displayProposal.showSignatures && (
                                                        <div 
                                                            onClick={() => setIsSignatureModalOpen(true)}
                                                            className="group cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-6 hover:bg-gray-100 transition-all"
                                                        >
                                                            {clientSignature ? (
                                                                <div className="w-full space-y-4">
                                                                    <div className="h-24 flex items-center justify-center">
                                                                        <img src={clientSignature} alt="Client Signature" className="max-h-full object-contain grayscale mix-blend-multiply" />
                                                                    </div>
                                                                    <div className="text-center border-t border-gray-200 pt-4 flex items-center justify-center gap-4">
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[10px] font-black text-black uppercase tracking-widest">{signatureName || 'Authorized Signatory'}</p>
                                                                            <p className="text-[7px] text-gray-500 uppercase tracking-widest">Signatory Representative</p>
                                                                        </div>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); setClientSignature(null); setSignatureName(''); }}
                                                                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="w-16 h-16 bg-white border border-gray-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-sm">
                                                                        <PenTool size={24} className="text-gray-400 group-hover:text-black" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-[11px] font-black text-black uppercase tracking-[0.2em]">Click to sign proposal</p>
                                                                        <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-[0.3em]">Type, Draw or Upload</p>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Button 
                                                            onClick={handleRefuseProposal}
                                                            disabled={isSubmitting}
                                                            className="h-16 bg-white border-2 border-red-100 text-red-500 font-black uppercase tracking-widest text-[9px] rounded-2xl hover:bg-red-50 transition-all shadow-lg"
                                                        >
                                                            Refuse Quote
                                                        </Button>
                                                        <Button 
                                                            onClick={() => setIsVerifying(true)} 
                                                            disabled={isSubmitting || (displayProposal.showSignatures && !signatureName.trim())} 
                                                            className="h-16 bg-black text-white font-black uppercase tracking-widest text-[9px] rounded-2xl hover:bg-neon-green hover:text-black transition-all shadow-xl"
                                                        >
                                                            Authorize Strategic Memorandum
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-8">
                                                    <div className={cn(
                                                        "p-8 border-2 rounded-2xl flex flex-col items-center text-center gap-4",
                                                        displayProposal.status === 'Accepted' ? "border-neon-green/20 bg-neon-green/[0.02]" : "border-red-100 bg-red-50/10"
                                                    )}>
                                                        {displayProposal.status === 'Accepted' ? (
                                                            <>
                                                                <ShieldCheck size={32} className="text-neon-green" />
                                                                <div>
                                                                    <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] mb-1">Memorandum Authorized</p>
                                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">This document is legally binding and locked.</p>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FileText size={32} className="text-red-500" />
                                                                <div>
                                                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] mb-1">Quotation Refused</p>
                                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Client has declined this proposal framework.</p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {idx === paginatedPages.length - 1 && (
                                        <div className="mt-auto pt-10 flex items-center gap-4 border-t border-gray-100">
                                            <div className="w-10 h-10 bg-black flex items-center justify-center"><span className="text-[8px] font-black text-neon-green">NB</span></div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prepared By</p>
                                                <p className="text-[11px] font-black text-black">Newbi Entertainment</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            </div>
                        </div>
                        <div className="mt-auto pt-8 pb-10 border-t border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">
                            <div className="flex items-center gap-4">
                                <p>Newbi Entertainment ©</p>
                                {idx !== paginatedPages.length - 1 && (
                                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                                        <div className="w-4 h-4 bg-black flex items-center justify-center"><span className="text-[6px] font-black text-neon-green">NB</span></div>
                                        <p className="text-[8px]">STRATEGIC MEMORANDUM</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-black">Page {idx + 1} of {paginatedPages.length}</p>
                        </div>
                    </div>
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

            {/* Identity Verification Modal */}
            <AnimatePresence>
                {isVerifying && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md no-print">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-md bg-white rounded-[2.5rem] p-10 text-black shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldCheck size={120} /></div>
                            
                            <div className="space-y-6 relative z-10">
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black uppercase tracking-tighter italic">Verify Identity.</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Digital Non-Repudiation Handshake</p>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Professional Authorization Email</label>
                                        <input 
                                            type="email" 
                                            value={verificationEmail}
                                            onChange={e => setVerificationEmail(e.target.value)}
                                            placeholder="you@company.com"
                                            className="w-full h-14 bg-gray-50 border border-gray-100 rounded-xl px-6 text-sm font-bold outline-none focus:border-neon-green transition-all"
                                        />
                                    </div>

                                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-gray-400">
                                            <span>Security Marker</span>
                                            <span>Active</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-neon-green"><Globe size={14} /></div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-black">{ipAddress}</p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Network Signature Captured</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button onClick={() => setIsVerifying(false)} className="h-14 rounded-xl border-2 border-gray-100 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
                                    <Button 
                                        onClick={handleApproveProposal}
                                        disabled={isSubmitting || !verificationEmail.includes('@')}
                                        className="h-14 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-green hover:text-black transition-all"
                                    >
                                        {isSubmitting ? 'Securing...' : 'Verify & Sign'}
                                    </Button>
                                </div>

                                <p className="text-[8px] font-bold text-gray-300 text-center uppercase tracking-widest mt-4">This digital signature is binding and non-repudiable.</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Proposal;
