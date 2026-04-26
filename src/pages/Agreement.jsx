import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    Download, Printer, ArrowLeft, ShieldCheck, 
    Zap, RefreshCw, Globe, CheckCircle2, Eye, EyeOff
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DocumentSeal from '../components/ui/DocumentSeal';

const inlineFmt = (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

const renderFormatted = (text, baseClass = 'text-[12px] font-medium text-black leading-relaxed text-justify') => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(<p key={i} className="text-[13px] font-black text-black uppercase tracking-widest mt-6 mb-2 border-b border-black/10 pb-1">{line.slice(3)}</p>);
    } else if (line.match(/^[•\-\*]\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[•\-\*]\s/)) { items.push(lines[i].replace(/^[•\-\*]\s/, '')); i++; }
      elements.push(<div key={`ul-${i}`} className="pl-6 space-y-2 my-3">{items.map((item, j) => <div key={j} className="flex items-start gap-3"><span className="text-black mt-1.5 text-[6px]">■</span><span className={baseClass} dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} /></div>)}</div>);
      continue;
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-3" />);
    } else {
      elements.push(<p key={i} className={cn(baseClass, "indent-8")} dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />);
    }
    i++;
  }
  return <div>{elements}</div>;
};

const Agreement = () => {
    const { id } = useParams();
    const { agreements, updateAgreement, logDocumentAccess, user } = useStore();
    const [displayAgreement, setDisplayAgreement] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [signatureName, setSignatureName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [ipAddress, setIpAddress] = useState('Detecting...');
    const agreementRef = useRef(null);

    useEffect(() => {
        const agreement = agreements.find(a => a.id === id);
        if (agreement) {
            setDisplayAgreement(agreement);
            if (user && !verificationEmail) setVerificationEmail(user.email);
        }
    }, [id, agreements, user]);

    useEffect(() => {
        const fetchIp = async () => {
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const data = await res.json();
                setIpAddress(data.ip);
                if (id) {
                    logDocumentAccess('agreement', id, {
                        ip: data.ip,
                        userAgent: navigator.userAgent,
                        userEmail: user?.email || 'Guest'
                    });
                }
            } catch (e) { console.error("IP detection failed", e); }
        };
        fetchIp();
    }, [id]);

    if (!displayAgreement) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <RefreshCw className="animate-spin text-neon-blue" size={40} />
        </div>
    );

    const handleDownloadPDF = async () => {
        setIsExporting(true);
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
            setIsExporting(false);
        }
    };

    const handleApprove = async () => {
        if (displayAgreement.status === 'Executed') return;
        if (!signatureName.trim()) { alert('Please enter your full name.'); return; }
        if (!verificationEmail.trim() || !verificationEmail.includes('@')) { alert('Valid email required.'); return; }
        
        setIsSubmitting(true);
        try {
            const metadata = {
                signedBy: signatureName,
                signedAt: new Date().toISOString(),
                ip: ipAddress,
                email: verificationEmail,
                userAgent: navigator.userAgent
            };
            await updateAgreement(id, { status: 'Executed', approvalMetadata: metadata });
            setIsVerifying(false);
        } catch (error) {
            console.error(error);
            alert('Authorization failed.');
        } finally { setIsSubmitting(false); }
    };

    const getPaginatedPages = () => {
        const pages = [];
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

    return (
        <div className="min-h-screen bg-[#050505] text-white font-['Outfit'] selection:bg-white selection:text-black">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,200..900;1,200..900&display=swap');
                .font-signature { font-family: 'Caveat', cursive; }
                .font-formal { font-family: 'Crimson Pro', serif; }
                @media print { .no-print { display: none !important; } .agreement-page-render { margin: 0 !important; box-shadow: none !important; } }
            `}} />

            <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-3xl border-b border-white/5 h-20 flex items-center px-6 no-print">
                <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all"><ArrowLeft size={18} /></Link>
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Legal Instrument</p>
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", displayAgreement.status === 'Executed' ? "bg-emerald-500" : "bg-neon-blue animate-pulse")} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{displayAgreement.status}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => window.print()} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 hidden sm:block"><Printer size={18} /></button>
                        <Button onClick={handleDownloadPDF} disabled={isExporting} className="bg-neon-blue text-black font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-2xl">
                            {isExporting ? <RefreshCw className="animate-spin mr-2" size={14} /> : <Download size={14} className="mr-2" />} Export PDF
                        </Button>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-32 flex flex-col items-center gap-12">
                <div ref={agreementRef} className="flex flex-col gap-12 origin-top transition-all">
                    {paginatedPages.map((page, idx) => (
                        <div key={idx} className="agreement-page-render w-[794px] h-[1123px] bg-white text-black relative shadow-2xl flex flex-col p-[25mm] rounded-[2px] overflow-hidden font-formal border-[1px] border-black/10">
                            <div className="absolute inset-[5mm] border border-black/5 pointer-events-none" />
                            
                            {/* Header */}
                            <div className="flex justify-between items-start mb-8 pb-6 border-b-[2px] border-black relative z-10">
                                <div className="flex flex-col gap-4 items-start">
                                    <img src="/logo_document.png" alt="Logo" className="h-12 w-auto object-contain grayscale" crossOrigin="anonymous" />
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-black">Newbi Entertainment</p>
                                        <p className="text-[7px] font-bold text-gray-500 uppercase">Strategic Legal Division</p>
                                    </div>
                                </div>
                                <div className="text-right space-y-2">
                                    <div className="space-y-0.5">
                                        <h4 className="text-[8px] font-black uppercase text-black tracking-[0.3em]">Instrument No.</h4>
                                        <p className="text-lg font-black text-black tracking-widest">{displayAgreement.agreementNumber}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Effective Date</p>
                                        <p className="text-[10px] font-black text-black uppercase">{new Date(displayAgreement.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 relative z-10 flex flex-col">
                                {idx === 0 && (
                                    <div className="space-y-10 mb-12">
                                        <div className="text-center space-y-4">
                                            <h1 className="text-3xl font-black uppercase tracking-[0.2em] border-y-2 border-black py-4">
                                                {(displayAgreement.type || 'STRATEGIC SERVICE AGREEMENT').toUpperCase()}
                                            </h1>
                                        </div>
                                        <div className="space-y-6 text-[12px] leading-relaxed text-justify">
                                            <p className="font-bold italic">
                                                THIS AGREEMENT is made on this {new Date(displayAgreement.effectiveDate).getDate()} day of {new Date(displayAgreement.effectiveDate).toLocaleString('default', { month: 'long' })}, {new Date(displayAgreement.effectiveDate).getFullYear()} ("Effective Date").
                                            </p>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-1">
                                                    <p className="font-bold uppercase tracking-widest text-[10px]">Between:</p>
                                                    <p><span className="font-bold">{displayAgreement.parties.firstParty.name}</span>, a registered entity with its principal office at {displayAgreement.parties.firstParty.address} (hereinafter referred to as the <span className="font-bold uppercase">"Provider"</span>);</p>
                                                </div>
                                                <div className="flex justify-center py-2 font-bold italic text-gray-400">AND</div>
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
                                            {renderFormatted(displayAgreement.details.purpose)}
                                        </div>
                                    </div>
                                )}

                                {page.type === 'commercials' && (
                                    <div className="space-y-8 py-4">
                                        <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block">Section 02. Financial Considerations.</h3>
                                        <div className="grid grid-cols-1 gap-8 mt-4">
                                            <div className="space-y-8 text-center py-8 border-y border-black/5 bg-gray-50/50">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Valuation</p>
                                                <h2 className="text-5xl font-black tracking-tighter text-black">{displayAgreement.commercials.currency} {displayAgreement.commercials.totalValue}</h2>
                                            </div>
                                            <div className="space-y-4">
                                                <p className="text-[9px] font-black text-black uppercase tracking-widest border-b border-black pb-1 inline-block">Payment Schedule</p>
                                                {renderFormatted(displayAgreement.commercials.paymentSchedule)}
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
                                                    <div className="text-[12px] font-medium text-black leading-relaxed text-justify">{renderFormatted(clause.content)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {page.type === 'execution' && (
                                    <div className="h-full flex flex-col py-4">
                                        <h3 className="text-lg font-black uppercase tracking-widest text-black border-b border-black pb-1 inline-block mb-12">Execution & Authorization.</h3>
                                        <div className="flex-1 flex flex-col justify-start space-y-20">
                                            <p className="text-[12px] italic text-gray-500 mb-8">IN WITNESS WHEREOF, the Parties hereto have executed this Agreement as of the Effective Date first above written.</p>
                                            <div className="grid grid-cols-2 gap-20">
                                                <div className="space-y-6">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-black pb-1">Provider Signature</p>
                                                    <div className="h-20 flex items-end">
                                                        {displayAgreement.showSignature && <p className="text-5xl font-signature text-black leading-none opacity-90">Abhinav Anand</p>}
                                                    </div>
                                                    <div className="pt-2 border-t border-black/5">
                                                        <p className="text-[10px] font-bold uppercase">Name: Abhinav Anand</p>
                                                        <p className="text-[9px] text-gray-500 uppercase">Title: Director of Operations</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-6 text-right">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-black pb-1">Client Signature</p>
                                                    <div className="h-20 flex items-end justify-end">
                                                        {displayAgreement.status === 'Executed' ? (
                                                            <p className="text-5xl font-signature text-black leading-none opacity-90">{displayAgreement.approvalMetadata?.signedBy}</p>
                                                        ) : (
                                                            <div className="w-full h-px bg-black opacity-20 border-dashed border-t" />
                                                        )}
                                                    </div>
                                                    <div className="pt-2 border-t border-black/5">
                                                        <p className="text-[10px] font-bold uppercase">Name: {displayAgreement.status === 'Executed' ? displayAgreement.approvalMetadata?.signedBy : '________________'}</p>
                                                        <p className="text-[9px] text-gray-500 uppercase">Title: Authorized Signatory</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center text-center space-y-8 pt-12">
                                                {(displayAgreement.status === 'Executed' || isExporting) && displayAgreement.showSeal && (
                                                    <DocumentSeal type="agreement" date={displayAgreement.approvalMetadata?.signedAt || displayAgreement.effectiveDate} className="w-40 h-40 opacity-90" />
                                                )}
                                                {displayAgreement.approvalMetadata && (
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest space-y-1">
                                                        <p>IP: {displayAgreement.approvalMetadata.ip}</p>
                                                        <p>Time: {new Date(displayAgreement.approvalMetadata.signedAt).toLocaleString()}</p>
                                                        <p>Hash: {displayAgreement.id.slice(-12).toUpperCase()}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-auto pt-8 flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                <p>© NEWBI ENTERTAINMENT 2024</p>
                                <p className="text-black">Page {idx + 1} of {paginatedPages.length}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {displayAgreement.status !== 'Executed' && !isExporting && (
                    <div className="w-[794px] bg-white rounded-[2.5rem] p-12 text-black space-y-8 no-print shadow-2xl border border-white/5">
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black uppercase tracking-tighter italic">Execute Instrument.</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Enter your full legal name below to electronically authorize and execute this instrument. This action is legally binding.</p>
                        </div>
                        <input 
                            value={signatureName} 
                            onChange={e => setSignatureName(e.target.value)} 
                            placeholder="Enter Full Name..." 
                            className="w-full bg-gray-50 border-2 border-dashed border-gray-200 h-24 px-8 rounded-2xl text-3xl font-signature text-black outline-none focus:border-neon-blue transition-all text-center" 
                        />
                        <Button 
                            onClick={() => setIsVerifying(true)}
                            disabled={!signatureName.trim()}
                            className="w-full h-16 bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-neon-blue hover:text-black transition-all shadow-xl"
                        >
                            <Zap size={16} className="mr-2" /> Authorize & Execute
                        </Button>
                    </div>
                )}
            </main>

            <AnimatePresence>
                {isVerifying && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-md bg-white rounded-[2.5rem] p-10 text-black shadow-2xl relative">
                            <div className="space-y-6 relative z-10">
                                <h3 className="text-3xl font-black uppercase tracking-tighter italic">Identity Verification.</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Authorization Email</label>
                                        <input 
                                            type="email" 
                                            value={verificationEmail}
                                            onChange={e => setVerificationEmail(e.target.value)}
                                            placeholder="legal@company.com"
                                            className="w-full h-14 bg-gray-50 border border-gray-100 rounded-xl px-6 text-sm font-bold outline-none focus:border-neon-blue transition-all"
                                        />
                                    </div>
                                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
                                        <Globe size={18} className="text-neon-blue" />
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black uppercase text-black">{ipAddress}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Network Signature Detected</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button onClick={() => setIsVerifying(false)} className="h-14 rounded-xl border-2 border-gray-100 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
                                    <Button onClick={handleApprove} disabled={isSubmitting || !verificationEmail.includes('@')} className="h-14 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-blue hover:text-black transition-all">
                                        {isSubmitting ? 'Executing...' : 'Verify & Sign'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Agreement;
