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
import useSharedDoc from '../hooks/useSharedDoc';
import { safeLocalStorage } from '../lib/storage';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DocumentSeal from '../components/ui/DocumentSeal';
import SharedDocumentViewer from '../components/ui/SharedDocumentViewer';
import Sheet from '../components/admin/Sheet';
import { SignForm, SignedRecord, SignatureBox, TextField, DocButton, Row, docTheme } from '../components/ui/docviewer/DocKit';
import SignatureModal from '../components/ui/SignatureModal';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { getDocumentShareMeta } from '../lib/documentPreviewUtils';
import { paginateContract } from '../components/admin/useContractGenerator';
import { parseContractDate, partyIds, termSentence, deliverablesOf, milestoneRows, gstNote, formatMoney } from '../components/admin/contracts/contractRules';

const LOGOS = { entertainment: '/brand/newbi-logo-entertainment-800w.png', media: '/brand/newbi-logo-media-800w.png', marketing: '/brand/newbi-logo-marketing-800w.png' };

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
    const { id } = useParams();
    const { user } = useStore();
    // Read by id only: rules don't let visitors list contracts.
    const { data: liveAgreement, notFound } = useSharedDoc('agreements', id);
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
    const loggedVisitRef = useRef(null);

    // The viewer reports how wide the paper can be; fit the A4 pages to it.
    const fitToStage = React.useCallback((w) => setScale(Math.min(1, w / 794)), []);

    useEffect(() => {
        if (liveAgreement) setDisplayAgreement(liveAgreement);
    }, [liveAgreement]);
    // Shown on the signing form only; the server records the IP it sees.
    useEffect(() => {
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setIpAddress(data.ip))
            .catch(() => setIpAddress('Hidden/Protected'));
    }, []);
    useEffect(() => {
        if (user?.email && !verificationEmail) setVerificationEmail(user.email);
    }, [user, verificationEmail]);

    const location = useLocation();
    const isAdmin = ['super_admin', 'developer', 'founder'].includes(user?.role);

    useEffect(() => {
        if (isAdmin || !displayAgreement) return;
        // Log once per visit; live snapshot updates must not trigger more writes.
        const visitKey = `${id}${window.location.search}`;
        if (loggedVisitRef.current === visitKey) return;
        loggedVisitRef.current = visitKey;

        const logVisit = async () => {
            const searchParams = new URLSearchParams(location.search);
            const via = searchParams.get('via');
            const email = searchParams.get('email');
            const name = searchParams.get('name');

            const cacheKey = `last_viewed_agreement_${id}`;
            const lastViewed = safeLocalStorage.getItem(cacheKey);
            const tenMins = 10 * 60 * 1000;

            if (!lastViewed || (new Date() - new Date(lastViewed) > tenMins) || via === 'email') {
                // The server records the visit (IP, time) and lastOpened.
                const res = await useStore.getState().logDocumentAccess('agreement', id, { via, shareEmail: email, shareName: name });
                if (res?.ok) safeLocalStorage.setItem(cacheKey, new Date().toISOString());
            }
        };
        logVisit();
    }, [id, isAdmin, displayAgreement, location.search]);

    const agreementShareMeta = getDocumentShareMeta(displayAgreement, 'agreement');
    useDynamicMeta({
        title: agreementShareMeta.title,
        description: agreementShareMeta.description,
        image: agreementShareMeta.previewImage,
        url: typeof window !== 'undefined' ? window.location.href : undefined
    });

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
            const suggested = displayAgreement.parties?.secondParty?.signatoryName || displayAgreement.parties?.secondParty?.name || displayAgreement.clientName;
            if (!signatureName && suggested) setSignatureName(suggested);
        }
    }, [displayAgreement]);

    // Hooks above must all run before any early return (React requires the same order every render).
    if (!displayAgreement) return notFound ? (
        <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-6 text-center dark:bg-black">
            <div className="max-w-sm space-y-3">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Contract not found</h1>
                <p className="text-sm text-gray-500">This link may be wrong, or the contract was withdrawn. Please ask the sender for a new link.</p>
                <Link to="/" className="inline-block rounded-xl bg-gray-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white dark:bg-white dark:text-black">Go to Newbi</Link>
            </div>
        </div>
    ) : (
        <div className="min-h-dvh bg-white dark:bg-black flex items-center justify-center">
            <RefreshCw className="animate-spin text-[#A855F7]" size={40} />
        </div>
    );

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
        if (!signatureName.trim()) { useStore.getState().addToast('Enter your full name to sign.', 'warning'); return; }
        if (displayAgreement.showSignatures && !clientSignature) { setIsVerifying(false); useStore.getState().addToast('Add your signature first.', 'warning'); return; }
        if (!verificationEmail.trim() || !verificationEmail.includes('@')) { useStore.getState().addToast('Enter your full email address to sign.', 'warning'); return; }
        
        setIsSubmitting(true);
        try {
            const metadata = {
                signedBy: signatureName.trim(),
                signedAt: new Date().toISOString(),
                ip: /\d/.test(String(ipAddress)) ? ipAddress : null,
                email: verificationEmail.trim(),
                userAgent: navigator.userAgent,
                clientSignature: clientSignature
            };
            // One transaction: refuses if the contract was already signed.
            const saved = await useStore.getState().signAgreement(id, metadata);
            setDisplayAgreement(prev => ({
                ...prev,
                status: 'Executed',
                approvalMetadata: saved || metadata,
                clientSignature: saved?.clientSignature || clientSignature || null
            }));
            setIsVerifying(false);
            useStore.getState().addToast('Agreement signed. Thank you.', 'success');
        } catch (error) {
            console.error(error);
            useStore.getState().addToast(error?.code ? error.message : 'Please try again. If it keeps happening, contact support.', 'error', { title: 'Agreement not signed', action: { label: 'Try again', onClick: () => handleApprove() } });
        } finally { setIsSubmitting(false); }
    };

    // Same pages as the editor preview: hidden sections and left-out clauses stay out.
    const paginatedPages = paginateContract(displayAgreement);
    // Older or partial records may miss whole sections; never crash the page.
    const fp = displayAgreement.parties?.firstParty || {};
    const sp = displayAgreement.parties?.secondParty || {};
    const details = displayAgreement.details || {};
    const commercials = displayAgreement.commercials || {};
    const effDate = parseContractDate(displayAgreement.effectiveDate) || new Date();
    const isSigned = displayAgreement.status === 'Executed';
    const firstIds = partyIds(fp);
    const secondIds = partyIds(sp);
    const term = termSentence(displayAgreement);
    const deliverables = deliverablesOf(displayAgreement);
    const milestones = milestoneRows(displayAgreement);
    const taxNote = gstNote(displayAgreement);

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

    const theme = docTheme('agreement');
    const signedMeta = displayAgreement.approvalMetadata || {};
    let actionPanel = null;
    if (displayAgreement.showSignatures || displayAgreement.showSeal) {
        actionPanel = isSigned ? (
            <SignedRecord theme={theme} title="Signed" subtitle="Both parties’ copies now carry this signature."
                signedBy={signedMeta.signedBy || sp.name}
                signature={signedMeta.clientSignature || displayAgreement.clientSignature}
                signedAt={signedMeta.signedAt} email={signedMeta.email} ip={signedMeta.ip} />
        ) : (
            <SignForm
                theme={theme}
                title="Sign this contract"
                subtitle={sp.name ? `Signing for ${sp.name}.` : 'Read every page, then sign below.'}
                name={signatureName} onName={setSignatureName}
                signature={clientSignature} onOpenPad={() => setIsSignatureModalOpen(true)} onClearSignature={() => setClientSignature(null)}
                requireSignature={Boolean(displayAgreement.showSignatures)}
                submitLabel="Continue to sign" onSubmit={() => setIsVerifying(true)} submitting={isSubmitting}
                note={isAdmin ? 'You’re signed in as an admin. Signing here records the other party’s signature.' : undefined}
                consent="Next you’ll confirm your email. Your signature is legally binding and is recorded with the time, IP address and device."
            />
        );
    }

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
                actionLabel="Review and sign"
                onStageWidth={fitToStage}
            >
                {!displayAgreement.isUploaded && (
                    <>
                        <div ref={agreementRef} className="flex flex-col gap-8 md:gap-12 origin-top transition-all" style={{ transform: `scale(${scale})`, marginBottom: `${(scale - 1) * 1123 * paginatedPages.length}px` }}>
                    {paginatedPages.map((page, idx) => (
                        <div key={idx} className="agreement-page-render w-[794px] h-[1123px] bg-white text-black relative shadow-2xl flex flex-col p-[25mm] rounded-[2px] overflow-hidden font-formal border-[1px] border-black/10">
                            <div className="absolute inset-[5mm] border border-black/5 pointer-events-none" />
                            
                            {/* Header */}
                            <div className={cn("flex justify-between items-end mb-8 pb-3 relative z-10", idx > 0 && "opacity-40")}>
                                <img src={LOGOS[displayAgreement.selectedLogo] || LOGOS.entertainment} alt="Logo" className="h-12 w-auto object-contain grayscale opacity-80" crossOrigin="anonymous" />
                                <div className="flex items-center gap-6 text-right">
                                    <div className="space-y-0.5">
                                        <span className="text-[7px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest block">Agreement ID</span>
                                        <span className="text-[10px] font-bold text-black tracking-widest block">{displayAgreement.agreementNumber}</span>
                                    </div>
                                    <div className="space-y-0.5 border-l border-black/10 pl-6">
                                        <span className="text-[7px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest block">Effective Date</span>
                                        <span className="text-[10px] font-bold text-black uppercase tracking-wider block">{effDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
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
                                                THIS AGREEMENT is made on this {effDate.getDate()} day of {effDate.toLocaleString('en-GB', { month: 'long' })}, {effDate.getFullYear()} ("Effective Date").{term ? ` ${term}` : ''}
                                            </p>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-1">
                                                    <p className="font-bold uppercase tracking-widest text-[10px]">Between:</p>
                                                    <p><span className="font-bold">{fp.name}</span>, a registered entity with its principal office at {fp.address}{firstIds ? ` (${firstIds})` : ''} (hereinafter referred to as the <span className="font-bold uppercase">"Provider"</span>);</p>
                                                </div>
                                                <div className="flex justify-center py-2 font-bold italic text-gray-600 dark:text-gray-400">AND</div>
                                                <div className="space-y-1">
                                                    <p className="font-bold uppercase tracking-widest text-[10px]">And:</p>
                                                    <p><span className="font-bold">{sp.name}</span>, a registered entity with its principal office at {sp.address}{secondIds ? ` (${secondIds})` : ''} (hereinafter referred to as the <span className="font-bold uppercase">"Client"</span>).</p>
                                                </div>
                                            </div>
                                            <div className="pt-8 space-y-4">
                                                <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-center">RECITALS (WHEREAS):</p>
                                                <div className="space-y-3 italic text-gray-600">
                                                    <p>A. The Provider is engaged in the business of providing professional {details.projectName} services and possesses the requisite expertise;</p>
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
                                            {renderContent(details.purpose)}
                                        </div>
                                        {deliverables.length > 0 && (
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black text-black uppercase tracking-widest border-b border-black pb-1 inline-block">Deliverables</p>
                                                {deliverables.map((d, i) => (
                                                    <p key={i} className="flex gap-3 text-[12px] font-medium leading-relaxed text-black"><span>({String.fromCharCode(97 + i)})</span><span className="flex-1">{d}</span></p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {page.type === 'commercials' && (
                                    <div className="space-y-8 py-4">
                                        <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block">Section 02. Financial Considerations.</h3>
                                        <div className="grid grid-cols-1 gap-8 mt-4">
                                            <div className="space-y-8 text-center py-8 border-y border-black/5 bg-gray-50/50">
                                                <p className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Total Valuation</p>
                                                <h2 className="text-5xl font-black tracking-tighter text-black">{commercials.currency} {commercials.totalValue}</h2>
                                                {taxNote && <p className="text-[11px] font-medium text-gray-600">{taxNote}</p>}
                                            </div>
                                            <div className="space-y-4">
                                                <p className="text-[9px] font-black text-black uppercase tracking-widest border-b border-black pb-1 inline-block">Payment Schedule</p>
                                                {milestones.map((m, i) => (
                                                    <p key={m.id || i} className="flex gap-3 text-[12px] font-medium leading-relaxed text-black">
                                                        <span>({String.fromCharCode(97 + i)})</span>
                                                        <span className="flex-1">{m.label || `Instalment ${i + 1}`}{m.due ? `, ${m.due}` : ''}</span>
                                                        <span className="font-bold whitespace-nowrap">{m.percent ? `${m.percent}% · ` : ''}{formatMoney(m.amount, commercials.currency)}</span>
                                                    </p>
                                                ))}
                                                {renderContent(commercials.paymentSchedule)}
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
                                                    <p className="text-[11px] font-black text-black uppercase tracking-widest">Article {i + 1 + (page.pageIndex - 1) * 3}. {clause.title}</p>
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
                                            {(displayAgreement.showSignatures || isSigned) && (
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
                                                            {isSigned ? (
                                                                (displayAgreement.approvalMetadata?.clientSignature || displayAgreement.clientSignature) ? (
                                                                    <img src={displayAgreement.approvalMetadata?.clientSignature || displayAgreement.clientSignature} className="h-full object-contain grayscale mix-blend-multiply" alt="Client Signature" />
                                                                ) : (
                                                                    <p className="text-5xl font-signature text-black leading-none opacity-90">{displayAgreement.approvalMetadata?.signedBy || 'Authorized Signatory'}</p>
                                                                )
                                                            ) : (
                                                                <div className="w-full h-px bg-white dark:bg-black opacity-20 border-dashed border-t" />
                                                            )}
                                                        </div>
                                                        <div className="pt-2 border-t border-black/5">
                                                            <p className="text-[10px] font-bold uppercase">Name: {isSigned ? (displayAgreement.approvalMetadata?.signedBy || 'Authorized Signatory') : (sp.signatoryName || '________________')}</p>
                                                            <p className="text-[9px] text-gray-500 uppercase">Title: {sp.signatoryDesignation || 'Authorized Signatory'}</p>
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
            </SharedDocumentViewer>

            {/* Outside the viewer so it also works for uploaded PDF contracts. */}
            <SignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSave={(sig, name) => {
                    setClientSignature(sig);
                    setSignatureName(name);
                }}
                initialName={signatureName}
            />

            <Sheet open={isVerifying} onClose={() => !isSubmitting && setIsVerifying(false)} variant="dialog" size="sm" zIndex={1000}
                title="Confirm and sign" subtitle="We send the signed copy to this email and record it with your signature."
                footer={(
                    <div className="flex gap-2">
                        <DocButton variant="secondary" onClick={() => setIsVerifying(false)} disabled={isSubmitting} className="flex-1">Back</DocButton>
                        <DocButton theme={theme} onClick={handleApprove} busy={isSubmitting} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail.trim())} className="flex-[1.4]">{isSubmitting ? 'Signing…' : 'Sign contract'}</DocButton>
                    </div>
                )}>
                <div className="space-y-4">
                    <TextField theme={theme} label="Email" required type="email" inputMode="email" value={verificationEmail} onChange={(e) => setVerificationEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
                    <dl className="space-y-1.5 rounded-xl bg-black/[0.03] p-3 text-[13px] dark:bg-white/[0.04]">
                        <Row label="Signing as" value={signatureName.trim() || '—'} />
                        {sp.name && <Row label="For" value={sp.name} />}
                        <Row label="IP address" value={/\d/.test(String(ipAddress)) ? ipAddress : 'Not available'} mono />
                    </dl>
                    {clientSignature && <SignatureBox src={clientSignature} name={signatureName} />}
                </div>
            </Sheet>
        </>
    );
};

export default Agreement;