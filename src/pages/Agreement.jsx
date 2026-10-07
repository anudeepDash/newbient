import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Download from 'lucide-react/dist/esm/icons/download';
import Printer from 'lucide-react/dist/esm/icons/printer';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Zap from 'lucide-react/dist/esm/icons/zap';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Upload from 'lucide-react/dist/esm/icons/upload';
import X from 'lucide-react/dist/esm/icons/x';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { safeLocalStorage } from '../lib/storage';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DocumentSeal from '../components/ui/DocumentSeal';
import SharedDocumentViewer from '../components/ui/SharedDocumentViewer';
import SignatureModal from '../components/ui/SignatureModal';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { getDocumentShareMeta } from '../lib/documentPreviewUtils';

const inlineFmt = (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

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

const renderFormatted = (text, baseClass = 'text-[12px] font-medium text-black leading-relaxed text-justify') => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    if (line.trim() === '') {
      const lastElement = elements[elements.length - 1];
      const isLastSpacer = lastElement && lastElement.key && String(lastElement.key).startsWith('spacer-');
      if (!isLastSpacer) {
        elements.push(<div key={`spacer-${i}`} className="h-3" />);
      }
      i++;
      continue;
    }

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
    } else if (line.match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/)) { items.push(lines[i].replace(/^[•\-\*](?:\s|&nbsp;|\u00a0)+/, '').trim()); i++; }
      elements.push(
        <div key={`ul-${i}`} className="pl-6 space-y-2 my-3">
          {items.map((item, j) => (
            <div key={j} className="flex items-start gap-3">
              <span className="text-black mt-[8px] text-[6px] select-none shrink-0">■</span>
              <span className={baseClass} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} />
            </div>
          ))}
        </div>
      );
      continue;
    } else {
      elements.push(<p key={i} className={cn(baseClass, "indent-8")} dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />);
    }
    i++;
  }
  return <div>{elements}</div>;
};

const renderContent = (content, baseClass = 'text-[12px] font-medium text-black leading-relaxed text-justify') => {
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

const Agreement = () => {
    useStoreSubscription(['agreements']);
    const { id } = useParams();
    const { agreements, updateAgreement, logDocumentAccess, user, loading: storeLoading } = useStore();
    const [displayAgreement, setDisplayAgreement] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [signatureName, setSignatureName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [ipAddress, setIpAddress] = useState('Detecting...');
    const [clientSignature, setClientSignature] = useState(null);
    const [scale, setScale] = useState(1);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const agreementRef = useRef(null);

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

    useEffect(() => {
        const agreement = agreements.find(a => a.id === id);
        if (agreement) {
            setDisplayAgreement(agreement);
            if (user && !verificationEmail) setVerificationEmail(user.email);
        } else if (!storeLoading) {
            const fetchAgreement = async () => {
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const { db } = await import('../lib/firebase');
                    const docSnap = await getDoc(doc(db, 'agreements', id));
                    if (docSnap.exists()) {
                        setDisplayAgreement({ ...docSnap.data(), id: docSnap.id });
                    }
                } catch (err) {
                    console.error("Error fetching agreement directly:", err);
                }
            };
            fetchAgreement();
        }
    }, [id, agreements, user, storeLoading]);

    const location = useLocation();
    const isAdmin = (safeLocalStorage.getItem('adminAuth') === 'true') || (user?.role === 'super_admin' || user?.role === 'developer');

    useEffect(() => {
        if (isAdmin || !displayAgreement) return;

        const fetchIpAndLog = async () => {
            let detectedIp = 'Hidden/Protected';
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const data = await res.json();
                detectedIp = data.ip;
                setIpAddress(data.ip);
            } catch (e) { console.error("IP detection failed", e); }

            const searchParams = new URLSearchParams(location.search);
            const via = searchParams.get('via');
            const email = searchParams.get('email');
            const name = searchParams.get('name');

            const cacheKey = `last_viewed_agreement_${id}`;
            const lastViewed = safeLocalStorage.getItem(cacheKey);
            const tenMins = 10 * 60 * 1000;

            if (!lastViewed || (new Date() - new Date(lastViewed) > tenMins) || via === 'email') {
                try {
                    await logDocumentAccess('agreement', id, {
                        ip: detectedIp,
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        screen: `${window.screen.width}x${window.screen.height}`,
                        language: navigator.language,
                        userEmail: user?.email || 'Guest',
                        userName: user?.displayName || '',
                        via: via || null,
                        shareEmail: email || null,
                        shareName: name || null
                    });
                    safeLocalStorage.setItem(cacheKey, new Date().toISOString());
                } catch (err) { console.error("Log access failed:", err); }
            }
        };
        fetchIpAndLog();
    }, [id, isAdmin, displayAgreement, user, location.search]);

    const agreementShareMeta = getDocumentShareMeta(displayAgreement, 'agreement');
    useDynamicMeta({
        title: agreementShareMeta.title,
        description: agreementShareMeta.description,
        image: agreementShareMeta.previewImage,
        url: typeof window !== 'undefined' ? window.location.href : undefined
    });

    if (!displayAgreement) return (
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
            <RefreshCw className="animate-spin text-[#A855F7]" size={40} />
        </div>
    );

    const [pdfBlobUrl, setPdfBlobUrl] = useState('');

    useEffect(() => {
        if (displayAgreement?.fileUrl) {
            if (displayAgreement.fileUrl.startsWith('data:application/pdf;base64,')) {
                try {
                    const base64Parts = displayAgreement.fileUrl.split(',');
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
                    setPdfBlobUrl(displayAgreement.fileUrl);
                }
            } else {
                setPdfBlobUrl(displayAgreement.fileUrl);
            }
        } else {
            setPdfBlobUrl('');
        }
    }, [displayAgreement?.fileUrl]);

    useEffect(() => {
        if (displayAgreement) {
            if (!signatureName && (displayAgreement.parties?.secondParty?.name || displayAgreement.clientName)) {
                setSignatureName(displayAgreement.parties?.secondParty?.name || displayAgreement.clientName);
            }
        }
    }, [displayAgreement]);

    const handleDownloadPDF = async (blobUrl) => {
        if (displayAgreement.isUploaded && displayAgreement.fileUrl) {
            const a = document.createElement('a');
            a.href = (typeof blobUrl === 'string' && blobUrl) ? blobUrl : (pdfBlobUrl || displayAgreement.fileUrl);
            a.download = displayAgreement.fileName || `Newbi-Agreement-${displayAgreement.agreementNumber || 'Contract'}.pdf`;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }

        setIsExporting(true);
        const originalScale = scale;
        setScale(1);
        await new Promise(resolve => setTimeout(resolve, 800));
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pages = document.querySelectorAll('.agreement-page-render');
            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, '', 'FAST');
            }
            pdf.save(`Newbi-Agreement-${displayAgreement.agreementNumber}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
        } finally {
            setScale(originalScale);
            setIsExporting(false);
        }
    };

    const handleApprove = async () => {
        if (displayAgreement.status === 'Executed') return;
        if (!signatureName.trim()) { useStore.getState().addToast('Please enter your full name.', 'error'); return; }
        if (!verificationEmail.trim() || !verificationEmail.includes('@')) { useStore.getState().addToast('Please enter a valid email address.', 'error'); return; }
        
        setIsSubmitting(true);
        try {
            const metadata = {
                signedBy: signatureName.trim(),
                signedAt: new Date().toISOString(),
                ip: ipAddress,
                email: verificationEmail.trim(),
                userAgent: navigator.userAgent,
                clientSignature: clientSignature
            };
            await updateAgreement(id, { 
                status: 'Executed', 
                approvalMetadata: metadata,
                clientSignature: clientSignature || null
            });
            setDisplayAgreement(prev => ({
                ...prev,
                status: 'Executed',
                approvalMetadata: metadata,
                clientSignature: clientSignature || null
            }));
            setIsVerifying(false);
            useStore.getState().addToast('Instrument officially signed & executed!', 'success');
        } catch (error) {
            console.error(error);
            useStore.getState().addToast('Signing failed. Please try again or contact support.', 'error');
        } finally { setIsSubmitting(false); }
    };

    const getPaginatedPages = () => {
        const pages = [];
        pages.push({ type: 'intro' });
        if (displayAgreement.details?.purpose) pages.push({ type: 'mission' });
        if (displayAgreement.commercials?.totalValue) pages.push({ type: 'commercials' });
        if (displayAgreement.clauses?.length > 0) {
            const clausesPerPage = 3;
            for (let i = 0; i < displayAgreement.clauses.length; i += clausesPerPage) {
                pages.push({ 
                    type: 'clauses', 
                    items: displayAgreement.clauses.slice(i, i + clausesPerPage),
                    pageIndex: Math.floor(i / clausesPerPage) + 1
                });
            }
        }
        pages.push({ type: 'execution' });
        return pages;
    };

    const paginatedPages = getPaginatedPages();

    const viewerData = {
        ...displayAgreement,
        isUploaded: Boolean(displayAgreement.isUploaded && displayAgreement.fileUrl),
        fileUrl: displayAgreement.fileUrl,
        clientName: displayAgreement.parties?.secondParty?.name || displayAgreement.clientName,
        clientEmail: displayAgreement.parties?.secondParty?.email || displayAgreement.clientEmail,
        senderName: displayAgreement.parties?.firstParty?.name || 'Newbi Entertainment',
        senderEmail: displayAgreement.parties?.firstParty?.email || 'legal@newbi.live',
        amount: displayAgreement.commercials?.totalValue,
        clientSignature: displayAgreement.approvalMetadata?.clientSignature || displayAgreement.clientSignature,
        ourSignature: displayAgreement.providerSignature || displayAgreement.ourSignature,
        coverDescription: displayAgreement.coverDescription || displayAgreement.details?.purpose || '',
    };

    const actionPanel = (displayAgreement.showSignatures || displayAgreement.showSeal) ? (
        <div className="space-y-4">
            {displayAgreement.status === 'Executed' ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-[#A855F7]/10 border border-[#A855F7]/30 rounded-xl">
                        <div className="w-10 h-10 rounded-xl bg-[#A855F7]/20 flex items-center justify-center text-[#A855F7] shrink-0">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase italic tracking-tight text-white">
                                Executed & Sealed
                            </h4>
                            <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                                Legal Handshake Recorded
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
                        <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">
                                Signatory
                            </span>
                            <p className="text-sm font-black text-white">
                                {displayAgreement.approvalMetadata?.signedBy || displayAgreement.parties?.secondParty?.name || 'Authorized Signatory'}
                            </p>
                        </div>

                        <div className="h-20 border border-dashed border-white/10 rounded-lg bg-white/[0.02] flex items-center justify-center p-2">
                            {displayAgreement.approvalMetadata?.clientSignature || displayAgreement.clientSignature ? (
                                <img
                                    src={displayAgreement.approvalMetadata?.clientSignature || displayAgreement.clientSignature}
                                    alt="Client Signature"
                                    className="max-h-full object-contain filter invert"
                                />
                            ) : (
                                <p className="text-2xl font-signature text-[#A855F7]">
                                    {displayAgreement.approvalMetadata?.signedBy || displayAgreement.parties?.secondParty?.name || 'Authorized Signatory'}
                                </p>
                            )}
                        </div>

                        {displayAgreement.approvalMetadata?.signedAt && (
                            <div className="text-[9px] font-mono text-gray-400 pt-2 border-t border-white/5 flex justify-between">
                                <span className="text-gray-500">EXECUTED</span>
                                <span>{new Date(displayAgreement.approvalMetadata.signedAt).toLocaleDateString()}</span>
                            </div>
                        )}

                        {displayAgreement.approvalMetadata?.ip && (
                            <div className="text-[8px] font-mono text-gray-500 flex justify-between">
                                <span>AUDIT IP</span>
                                <span className="text-gray-400">{displayAgreement.approvalMetadata.ip}</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="border-b border-white/10 pb-3">
                        <h3 className="text-sm font-black uppercase italic tracking-tight font-heading text-white">
                            Execution & Sign-Off
                        </h3>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            Digital Legal Acceptance
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                Full Name <span className="text-[#A855F7]">*</span>
                            </label>
                            <input
                                type="text"
                                value={signatureName}
                                onChange={(e) => setSignatureName(e.target.value)}
                                placeholder="Authorized signatory name..."
                                className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs font-bold text-white placeholder:text-gray-600 outline-none focus:border-[#A855F7]/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                Signature <span className="text-[#A855F7]">*</span>
                            </label>
                            
                            {clientSignature ? (
                                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-2">
                                    <div className="h-16 flex items-center justify-center bg-black/40 rounded-lg p-2 border border-white/5">
                                        <img src={clientSignature} alt="Signature" className="max-h-full object-contain filter invert" />
                                    </div>
                                    <div className="flex justify-between items-center pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsSignatureModalOpen(true)}
                                            className="text-[9px] font-bold uppercase tracking-wider text-[#A855F7] hover:underline"
                                        >
                                            Change Signature
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setClientSignature(null)}
                                            className="text-[9px] font-bold uppercase tracking-wider text-red-400 hover:underline"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsSignatureModalOpen(true)}
                                    className="w-full h-16 border-2 border-dashed border-white/15 hover:border-[#A855F7]/50 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white transition-all group"
                                >
                                    <PenTool size={16} className="group-hover:text-[#A855F7] transition-colors" />
                                    <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-[#A855F7] transition-colors">
                                        Adopt / Draw Signature
                                    </span>
                                </button>
                            )}
                        </div>

                        <Button
                            type="button"
                            onClick={() => setIsVerifying(true)}
                            disabled={isSubmitting || !signatureName.trim()}
                            className="w-full h-11 bg-[#A855F7] hover:bg-[#A855F7]/90 text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Executing...</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={14} />
                                    <span>Authorize & Execute Instrument</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    ) : null;

    return (
        <>
            <SharedDocumentViewer
                documentData={viewerData}
                type="agreement"
                isAdmin={isAdmin}
                isExporting={isExporting}
                onDownloadPDF={handleDownloadPDF}
                pdfBlobUrl={pdfBlobUrl}
                actionPanel={actionPanel}
            >
                {!displayAgreement.isUploaded && (
                    <>
                        <div ref={agreementRef} className="flex flex-col gap-8 md:gap-12 origin-top transition-all" style={{ transform: `scale(${scale})`, marginBottom: `${(scale - 1) * 1123 * paginatedPages.length}px` }}>
                    {paginatedPages.map((page, idx) => (
                        <div key={idx} className="agreement-page-render w-[794px] h-[1123px] bg-white text-black relative shadow-2xl flex flex-col p-[25mm] rounded-[2px] overflow-hidden font-formal border-[1px] border-black/10">
                            <div className="absolute inset-[5mm] border border-black/5 pointer-events-none" />
                            
                            {/* Header */}
                            <div className={cn("flex justify-between items-end mb-8 pb-3 relative z-10", idx > 0 && "opacity-40")}>
                                <img src="/logo_document.png" alt="Logo" className="h-8 w-auto object-contain grayscale opacity-80" crossOrigin="anonymous" />
                                <div className="flex items-center gap-6 text-right">
                                    <div className="space-y-0.5">
                                        <span className="text-[7px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest block">Agreement ID</span>
                                        <span className="text-[10px] font-bold text-black tracking-widest block">{displayAgreement.agreementNumber}</span>
                                    </div>
                                    <div className="space-y-0.5 border-l border-black/10 pl-6">
                                        <span className="text-[7px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest block">Effective Date</span>
                                        <span className="text-[10px] font-bold text-black uppercase tracking-wider block">{new Date(displayAgreement.effectiveDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 relative z-10 flex flex-col">
                                {page.type === 'intro' && (
                                    <div className="space-y-10 mb-12">
                                        <div className="text-center space-y-4">
                                            <h1 className="text-3xl font-black uppercase tracking-[0.2em] border-y-2 border-black py-4">
                                                {(displayAgreement.type || 'STRATEGIC SERVICE AGREEMENT').toUpperCase()}
                                            </h1>
                                        </div>
                                        <div className="space-y-6 text-[12px] leading-relaxed text-justify">
                                            <p className="font-bold italic">
                                                THIS AGREEMENT is made on this {new Date(displayAgreement.effectiveDate || Date.now()).getDate()} day of {new Date(displayAgreement.effectiveDate || Date.now()).toLocaleString('default', { month: 'long' })}, {new Date(displayAgreement.effectiveDate || Date.now()).getFullYear()} ("Effective Date").
                                            </p>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-1">
                                                    <p className="font-bold uppercase tracking-widest text-[10px]">Between:</p>
                                                    <p><span className="font-bold">{displayAgreement.parties.firstParty.name}</span>, a registered entity with its principal office at {displayAgreement.parties.firstParty.address} (hereinafter referred to as the <span className="font-bold uppercase">"Provider"</span>);</p>
                                                </div>
                                                <div className="flex justify-center py-2 font-bold italic text-gray-600 dark:text-gray-400">AND</div>
                                                <div className="space-y-1">
                                                    <p className="font-bold uppercase tracking-widest text-[10px]">And:</p>
                                                    <p><span className="font-bold">{displayAgreement.parties.secondParty.name}</span>, a registered entity with its principal office at {displayAgreement.parties.secondParty.address} (hereinafter referred to as the <span className="font-bold uppercase">"Client"</span>).</p>
                                                </div>
                                            </div>
                                            <div className="pt-8 space-y-4">
                                                <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-center">RECITALS (WHEREAS):</p>
                                                <div className="space-y-3 italic text-gray-600">
                                                    <p>A. The Provider is engaged in the business of providing professional {displayAgreement.details.projectName} services and possesses the requisite expertise;</p>
                                                    <p>B. The Client desires to engage the Provider for the execution of certain strategic objectives;</p>
                                                    <p>C. The Parties have agreed to enter into this Agreement to define their respective rights and obligations.</p>
                                                </div>
                                                <p className="pt-4 font-bold italic">NOW, THEREFORE, in consideration of the mutual covenants contained herein, the Parties agree as follows:</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {page.type === 'mission' && (
                                    <div className="space-y-8 py-4">
                                        <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block">Section 01. Purpose of Engagement.</h3>
                                        <div className="text-[12px] font-medium leading-relaxed text-black text-justify mt-4">
                                            {renderContent(displayAgreement.details.purpose)}
                                        </div>
                                    </div>
                                )}

                                {page.type === 'commercials' && (
                                    <div className="space-y-8 py-4">
                                        <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block">Section 02. Financial Considerations.</h3>
                                        <div className="grid grid-cols-1 gap-8 mt-4">
                                            <div className="space-y-8 text-center py-8 border-y border-black/5 bg-gray-50/50">
                                                <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Total Valuation</p>
                                                <h2 className="text-5xl font-black tracking-tighter text-black">{displayAgreement.commercials.currency} {displayAgreement.commercials.totalValue}</h2>
                                            </div>
                                            <div className="space-y-4">
                                                <p className="text-[9px] font-black text-black uppercase tracking-widest border-b border-black pb-1 inline-block">Payment Schedule</p>
                                                {renderContent(displayAgreement.commercials.paymentSchedule)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {page.type === 'clauses' && (
                                    <div className="space-y-8 py-4">
                                        <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block">Section 03. Terms & Covenants.</h3>
                                        <div className="space-y-6 mt-4">
                                            {page.items.map((clause, i) => (
                                                <div key={i} className="space-y-2">
                                                    <p className="text-[11px] font-black text-black uppercase tracking-widest">Article {idx + 1 + (page.pageIndex - 1) * 3}. {clause.title}</p>
                                                    <div className="text-[12px] font-medium text-black leading-relaxed text-justify">{renderContent(clause.content)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {page.type === 'execution' && (
                                    <div className="h-full flex flex-col py-4">
                                        <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block mb-12">Execution & Authorization.</h3>
                                        <div className="flex-1 flex flex-col justify-start space-y-20">
                                            {displayAgreement.showSignatures && (
                                                <>
                                                    <p className="text-[12px] italic text-gray-500 mb-8">IN WITNESS WHEREOF, the Parties hereto have executed this Agreement as of the Effective Date first above written.</p>
                                                    <div className="grid grid-cols-2 gap-20">
                                                    <div className="space-y-6">
                                                        <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest border-b border-black pb-1">Provider Signature</p>
                                                        <div className="h-20 flex items-end">
                                                            {displayAgreement.providerSignature ? (
                                                                <img src={displayAgreement.providerSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Provider Signature" />
                                                            ) : (
                                                                <p className="text-5xl font-signature text-black leading-none opacity-90">Authorized Signatory</p>
                                                            )}
                                                        </div>
                                                        <div className="pt-2 border-t border-black/5">
                                                            <p className="text-[10px] font-bold uppercase">Name: {displayAgreement.providerName || 'Authorized Signatory'}</p>
                                                            <p className="text-[9px] text-gray-500 uppercase">Title: {displayAgreement.providerDesignation || 'Director of Operations'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-6 text-right">
                                                        <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest border-b border-black pb-1">Client Signature</p>
                                                        <div className="h-20 flex items-end justify-end">
                                                            {displayAgreement.status === 'Executed' ? (
                                                                displayAgreement.approvalMetadata?.clientSignature ? (
                                                                    <img src={displayAgreement.approvalMetadata.clientSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" />
                                                                ) : (
                                                                    <p className="text-5xl font-signature text-black leading-none opacity-90">{displayAgreement.approvalMetadata?.signedBy || 'Authorized Signatory'}</p>
                                                                )
                                                            ) : (
                                                                <div className="w-full h-px bg-white dark:bg-black opacity-20 border-dashed border-t" />
                                                            )}
                                                        </div>
                                                        <div className="pt-2 border-t border-black/5">
                                                            <p className="text-[10px] font-bold uppercase">Name: {displayAgreement.status === 'Executed' ? (displayAgreement.approvalMetadata?.signedBy || 'Authorized Signatory') : '________________'}</p>
                                                            <p className="text-[9px] text-gray-500 uppercase">Title: Authorized Signatory</p>
                                                            {displayAgreement.status === 'Executed' && displayAgreement.approvalMetadata && (
                                                                <p className="text-[7px] text-gray-600 dark:text-gray-400 mt-1">IP: {displayAgreement.approvalMetadata?.ip || 'N/A'} | Signed: {displayAgreement.approvalMetadata?.signedAt ? new Date(displayAgreement.approvalMetadata.signedAt).toLocaleString() : 'N/A'}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                            <div className="flex flex-col items-center justify-center text-center space-y-8 pt-12">
                                                {(displayAgreement.status === 'Executed' || isExporting) && displayAgreement.showSeal && (
                                                    <DocumentSeal type="agreement" date={displayAgreement.approvalMetadata?.signedAt || displayAgreement.effectiveDate} className="w-40 h-40 opacity-90" />
                                                )}
                                                {displayAgreement.approvalMetadata && (
                                                    <div className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest space-y-1">
                                                        <p>IP: {displayAgreement.approvalMetadata?.ip || 'N/A'}</p>
                                                        <p>Time: {displayAgreement.approvalMetadata?.signedAt ? new Date(displayAgreement.approvalMetadata.signedAt).toLocaleString() : 'N/A'}</p>
                                                        <p>Hash: {displayAgreement.id ? displayAgreement.id.slice(-12).toUpperCase() : 'N/A'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-auto pt-8 flex justify-between items-center text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                                <p className="w-1/3 text-left">© NEWBI ENTERTAINMENT & MARKETING LLP</p>
                                <p className="w-1/3 text-center text-gray-500 truncate px-2"></p>
                                <p className="w-1/3 text-right text-black">Page {idx + 1} of {paginatedPages.length}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {(displayAgreement.showSignatures || displayAgreement.showSeal) && displayAgreement.status !== 'Executed' && !isExporting && (
                    <div className="w-full max-w-[794px] space-y-10 no-print">
                        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/5 pb-8">
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black uppercase tracking-tighter italic text-gray-900 dark:text-white">Execute Instrument.</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Authorize this strategic agreement</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-[#A855F7]/10 rounded-full border border-[#A855F7]/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#A855F7] animate-pulse" />
                                <span className="text-[9px] font-black text-[#A855F7] uppercase tracking-widest">Secure Handshake Active</span>
                            </div>
                        </div>

                        {displayAgreement.showSignatures && (
                            <div 
                                onClick={() => setIsSignatureModalOpen(true)}
                                className="group cursor-pointer bg-[#0a0a0a] border-2 border-dashed border-black/10 dark:border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-8 hover:bg-white/[0.02] hover:border-[#A855F7]/20 transition-all shadow-2xl relative overflow-hidden"
                            >
                                {clientSignature ? (
                                    <div className="w-full space-y-8">
                                        <div className="h-40 flex items-center justify-center">
                                            <img src={clientSignature} alt="Client Signature" className="max-h-full object-contain invert" />
                                        </div>
                                        <div className="text-center border-t border-black/10 dark:border-white/5 pt-8 flex items-center justify-center gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-widest">{signatureName || 'Authorized Signatory'}</p>
                                                <p className="text-[8px] text-gray-500 uppercase tracking-widest">Signatory Representative</p>
                                            </div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setClientSignature(null);
                                                }}
                                                className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-24 h-24 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-[#A855F7]/10 transition-all duration-500">
                                            <PenTool size={36} className="text-gray-600 dark:text-gray-400 group-hover:text-[#A855F7]" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Click to sign agreement</p>
                                            <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-[0.3em]">Type, Draw or Upload</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="pt-6 space-y-6">
                            {(!displayAgreement.showSignatures || clientSignature) && (
                                <Button 
                                    onClick={() => setIsVerifying(true)}
                                    disabled={displayAgreement.showSignatures && !signatureName.trim()}
                                    className="w-full h-20 bg-[#A855F7] text-black font-black uppercase tracking-[0.3em] text-xs rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_rgba(168,85,247,0.3)]"
                                >
                                    <Zap size={18} className="mr-3" /> Authorize & Execute Instrument
                                </Button>
                            )}
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center italic">Digital footprints (IP, UA, Timestamp) will be attached for verification.</p>
                        </div>
                    </div>
                )}
            </>
        )}
                
                <SignatureModal 
                    isOpen={isSignatureModalOpen}
                    onClose={() => setIsSignatureModalOpen(false)}
                    onSave={(sig, name) => {
                        setClientSignature(sig);
                        setSignatureName(name);
                    }}
                    initialName={signatureName}
                />
            </SharedDocumentViewer>

            <AnimatePresence>
                {isVerifying && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white dark:bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-md bg-white rounded-[2.5rem] p-10 text-black shadow-2xl relative">
                            <div className="space-y-6 relative z-10">
                                <h3 className="text-3xl font-black uppercase tracking-tighter italic">Identity Verification.</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 px-1">Authorization Email</label>
                                        <input 
                                            type="email" 
                                            value={verificationEmail}
                                            onChange={e => setVerificationEmail(e.target.value)}
                                            placeholder="email@newbi.live"
                                            className="w-full h-14 bg-gray-50 border border-gray-100 rounded-xl px-6 text-sm font-bold outline-none focus:border-[#A855F7] transition-all"
                                        />
                                    </div>
                                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
                                        <Globe size={18} className="text-[#A855F7]" />
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black uppercase text-black">{ipAddress}</p>
                                            <p className="text-[8px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">Network Signature Detected</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button onClick={() => setIsVerifying(false)} className="h-14 rounded-xl border-2 border-gray-100 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
                                    <Button onClick={handleApprove} disabled={isSubmitting || !verificationEmail.includes('@')} className="h-14 bg-white dark:bg-black text-gray-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#A855F7] hover:text-black transition-all">
                                        {isSubmitting ? 'Executing...' : 'Verify & Sign'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Agreement;