import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Printer, 
    Download, 
    Sparkles, 
    FileText, 
    Check, 
    Clock, 
    User, 
    Briefcase, 
    HelpCircle, 
    RefreshCw 
} from 'lucide-react';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';

const templates = [
    {
        id: 'noc',
        name: 'No Objection Certificate',
        title: 'NO OBJECTION CERTIFICATE',
        content: `
            <p><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
            <p>This is to certify that <strong>Newbi Entertainment</strong> has no objection to the deployment of our production crew and technical assets for the upcoming cultural showcase event scheduled between <strong>[Start Date]</strong> and <strong>[End Date]</strong>.</p>
            <p>Furthermore, we confirm that all personnel assigned to this project have been fully cleared under our standard operating guidelines, and we grant full authority to execute the operations as defined in the master schedule.</p>
            <p>This certificate is issued at the request of the organizing committee for compliance and security clearance purposes.</p>
        `
    },
    {
        id: 'memo',
        name: 'Official Memorandum',
        title: 'OFFICIAL MEMORANDUM',
        content: `
            <p><strong>SUBJECT: OPERATIONAL DEPLOYMENT DIRECTIVE</strong></p>
            <p>Please be advised that effective immediately, all division leads are required to synchronize their campaign milestones with the central strategy hub. This initiative is aimed at maximizing brand resonance and ensuring resource optimization across all live platforms.</p>
            <p>Key Deliverables for this cycle:</p>
            <ul>
                <li>Complete assets distribution by Friday.</li>
                <li>Verify client branding integrations.</li>
                <li>Publish bi-weekly analytical logs.</li>
            </ul>
            <p>Your prompt compliance with this directive is highly appreciated. For any tactical blockages, raise a ticket with operations.</p>
        `
    },
    {
        id: 'release',
        name: 'Project Release Letter',
        title: 'PROJECT RELEASE LETTER',
        content: `
            <p><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
            <p>This letter serves to confirm the successful conclusion of the promotional campaign executed for <strong>[Client Name]</strong> by <strong>Newbi Entertainment</strong>.</p>
            <p>All contractual milestones, content deliveries, and analytical reporting obligations have been fulfilled to the highest industry standards. As of this date, all project files are declared closed, and no outstanding deliverables remain active.</p>
            <p>We express our sincere gratitude for a highly productive partnership and look forward to collaborating on future strategic initiatives.</p>
        `
    },
    {
        id: 'blank',
        name: 'Blank Letterhead Page',
        title: 'OFFICIAL COMMUNICATION',
        content: `
            <p>Start typing your official communication here...</p>
        `
    }
];

const LetterheadGenerator = () => {
    const navigate = useNavigate();
    const { addToast } = useStore();

    const [docTitle, setDocTitle] = useState('OFFICIAL MEMORANDUM');
    const [refId, setRefId] = useState(`NBL-${Math.floor(1000 + Math.random() * 9000)}`);
    const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
    const [senderName, setSenderName] = useState('Authorized Signatory');
    const [senderDesignation, setSenderDesignation] = useState('Director of Operations');
    const [content, setContent] = useState(templates[1].content);
    const [scale, setScale] = useState(0.85);

    const printContainerRef = useRef(null);

    const handleLoadTemplate = (tpl) => {
        setDocTitle(tpl.title);
        setContent(tpl.content);
        addToast(`${tpl.name} template loaded!`, 'success');
    };

    const handlePrint = () => {
        window.print();
    };

    // Auto-adjust scale based on parent width
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setScale(0.6);
            } else if (window.innerWidth < 1400) {
                setScale(0.75);
            } else {
                setScale(0.9);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-[#0B0F17] text-white selection:bg-neon-green selection:text-black font-['Outfit'] overflow-x-clip flex flex-col no-print admin-hub-content-container">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        height: 100% !important;
                        transform: none !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        background: white !important;
                        color: black !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}} />

            {/* Top Bar Nav */}
            <header className="h-20 border-b border-white/5 bg-black/60 backdrop-blur-2xl flex items-center justify-between px-8 sticky top-0 z-[100] no-print">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate('/admin')}
                        className="p-3 bg-white/5 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all hover:scale-105"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-lg font-extrabold tracking-tight text-white">Letterhead Gen.</h1>
                        <p className="text-[10px] font-bold text-neon-green uppercase tracking-[0.3em]">Official Document Generator</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setRefId(`NBL-${Math.floor(1000 + Math.random() * 9000)}`)}
                        className="p-3 bg-white/5 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all"
                        title="Regenerate Reference ID"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-3 bg-neon-green text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-[0_0_20px_rgba(57,255,20,0.2)]"
                    >
                        <Printer size={16} /> Print / Export PDF
                    </button>
                </div>
            </header>

            {/* Split Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                {/* Left Side: Controls Panel */}
                <aside className="w-full lg:w-[450px] border-r border-white/5 bg-zinc-950/40 p-8 space-y-8 overflow-y-auto shrink-0 no-print">
                    
                    {/* Templates Selector */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Document Templates</p>
                        <div className="grid grid-cols-2 gap-3">
                            {templates.map(tpl => (
                                <button
                                    key={tpl.id}
                                    onClick={() => handleLoadTemplate(tpl)}
                                    className="p-4 bg-white/[0.02] border border-white/5 hover:border-neon-green/30 hover:bg-white/[0.04] rounded-2xl text-left transition-all group"
                                >
                                    <FileText size={18} className="text-gray-500 group-hover:text-neon-green mb-2 transition-colors" />
                                    <p className="text-[11px] font-black text-white leading-tight uppercase truncate">{tpl.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Metadata Settings */}
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Document Settings</p>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Document Header Title</label>
                                <input 
                                    value={docTitle} 
                                    onChange={e => setDocTitle(e.target.value.toUpperCase())}
                                    placeholder="e.g. CERTIFICATE OF COMPLIANCE" 
                                    className="h-12 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-black px-4 text-white outline-none" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Reference ID</label>
                                    <input 
                                        value={refId} 
                                        onChange={e => setRefId(e.target.value)}
                                        className="h-12 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-mono font-bold px-4 text-white outline-none" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Document Date</label>
                                    <input 
                                        type="date"
                                        value={docDate} 
                                        onChange={e => setDocDate(e.target.value)}
                                        className="h-12 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-black px-4 text-white outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Signatory Name</label>
                                    <input 
                                        value={senderName} 
                                        onChange={e => setSenderName(e.target.value)}
                                        placeholder="Full Legal Name"
                                        className="h-12 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-black px-4 text-white outline-none" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Signatory Title</label>
                                    <input 
                                        value={senderDesignation} 
                                        onChange={e => setSenderDesignation(e.target.value)}
                                        placeholder="e.g. COO"
                                        className="h-12 w-full bg-black/60 border border-white/5 focus:border-neon-green/50 rounded-xl text-xs font-black px-4 text-white outline-none" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Word-like Editor Box */}
                    <div className="space-y-3 relative group/editor">
                        <StudioRichEditor 
                            label="Document Body Content"
                            value={content}
                            onChange={setContent}
                            placeholder="Draft your communication content here..."
                            minHeight="320px"
                            accentColor="neon-green"
                        />
                    </div>
                </aside>

                {/* Right Side: Mock A4 Document Canvas Preview */}
                <main className="flex-1 bg-[#050505] flex flex-col items-center justify-start p-10 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
                    {/* View Scale indicator */}
                    <div className="absolute top-4 right-8 text-[10px] font-black text-gray-600 uppercase tracking-widest select-none no-print">
                        A4 Live View Scale: {Math.round(scale * 100)}%
                    </div>

                    {/* Paper Area */}
                    <div 
                        ref={printContainerRef}
                        className="print-area bg-white text-black relative flex flex-col p-[20mm] shadow-2xl rounded-[2px] overflow-hidden"
                        style={{
                            width: '794px',
                            height: '1123px',
                            transform: `scale(${scale})`,
                            transformOrigin: 'top center',
                            flexShrink: 0,
                            marginBottom: `${(scale - 1) * 1123}px`
                        }}
                    >
                        {/* Official Letterhead Header */}
                        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-10">
                            <div className="space-y-4">
                                <img src="/logo_document.png" alt="Newbi Entertainment" className="h-14 w-auto object-contain" />
                                <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest leading-relaxed">
                                    <p>Newbi Entertainment Private Limited</p>
                                    <p>Operations HQ • Bangalore, IN</p>
                                    <p>contact@newbi.in • www.newbi.in</p>
                                </div>
                            </div>
                            <div className="text-right space-y-4">
                                <div className="space-y-0.5">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Ref ID</h4>
                                    <p className="text-sm font-black font-mono tracking-wider">{refId}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Date</h4>
                                    <p className="text-[11px] font-black">{new Date(docDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                            </div>
                        </div>

                        {/* Document Content Block */}
                        <div className="flex-1 flex flex-col justify-start">
                            {docTitle && (
                                <div className="text-center mb-10">
                                    <h2 className="text-xl font-black uppercase tracking-widest border-b border-black pb-2 inline-block leading-none">{docTitle}</h2>
                                </div>
                            )}

                            {/* Main Document Body */}
                            <div 
                                className="text-[13px] leading-[1.8] text-gray-800 space-y-4 text-justify px-1"
                                dangerouslySetInnerHTML={{ __html: content }}
                            />

                            {/* Signatory Seal and Sign block */}
                            <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-end">
                                <div className="space-y-2">
                                    <div className="h-16 flex items-end">
                                        <p className="text-lg font-signature text-black italic opacity-35">Authorized Signatory</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-black uppercase text-black">{senderName}</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{senderDesignation}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center text-[7px] font-black uppercase text-gray-300 tracking-wider select-none">
                                        Corporate Seal
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Official Letterhead Footer */}
                        <div className="mt-auto pt-8 border-t border-gray-100 flex justify-between items-center text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                            <p>CONFIDENTIAL • OFFICIAL CORRESPONDENCE</p>
                            <p>Page 1 of 1</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LetterheadGenerator;
