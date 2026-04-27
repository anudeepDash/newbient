import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, LayoutGrid, Download, RefreshCw, X, FileText, FileSpreadsheet, Sparkles, Users, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Target, Zap, Briefcase, CreditCard, ShieldCheck, Eye, EyeOff, Settings, Building2, Layers, Image as ImageIcon, ClipboardList, Undo2, DollarSign, CheckCircle, Smartphone, Globe, MoreVertical, MessageCircle, Upload } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { generateInvoiceContent, generateInvoiceFieldRefinement } from '../../services/aiService';

// Markdown-like formatting toolbar for textareas
const FormattedTextArea = ({ value, onChange, className, placeholder, minH = 'min-h-[150px]' }) => {
    const textareaRef = useRef(null);
    const historyRef = useRef([]);
    const pushHistory = () => {
        const h = historyRef.current;
        if (h.length === 0 || h[h.length - 1] !== value) {
            h.push(value);
            if (h.length > 30) h.shift();
        }
    };
    const handleUndo = () => {
        const h = historyRef.current;
        if (h.length > 0) {
            const prev = h.pop();
            onChange({ target: { value: prev } });
        }
    };
    const insertFormat = (before, after = '') => {
        pushHistory();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const scroll = ta.scrollTop;
        const selected = value.substring(start, end);
        const newText = value.substring(0, start) + before + (selected || 'text') + after + value.substring(end);
        onChange({ target: { value: newText } });
        setTimeout(() => { ta.focus(); ta.scrollTop = scroll; ta.selectionStart = start + before.length; ta.selectionEnd = start + before.length + (selected || 'text').length; }, 10);
    };
    const insertLine = (prefix) => {
        pushHistory();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const scroll = ta.scrollTop;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
        onChange({ target: { value: newText } });
        setTimeout(() => { ta.focus(); ta.scrollTop = scroll; ta.selectionStart = start + prefix.length; ta.selectionEnd = start + prefix.length; }, 10);
    };
    const handleKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') { e.preventDefault(); insertFormat('**', '**'); }
            else if (e.key === 'i') { e.preventDefault(); insertFormat('*', '*'); }
            else if (e.key === 'h') { e.preventDefault(); insertLine('## '); }
            else if (e.key === 'l') { e.preventDefault(); insertLine('• '); }
            else if (e.key === 'z') { e.preventDefault(); handleUndo(); }
        }
    };
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1 px-4">
                <button type="button" onClick={handleUndo} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Undo (Ctrl+Z)"><Undo2 size={13} /></button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button type="button" onClick={() => insertFormat('**', '**')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Bold (Ctrl+B)"><span className="text-[11px] font-black">B</span></button>
                <button type="button" onClick={() => insertFormat('*', '*')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Italic (Ctrl+I)"><span className="text-[11px] font-bold italic">I</span></button>
                <button type="button" onClick={() => insertLine('## ')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Heading (Ctrl+H)"><span className="text-[11px] font-black">H</span></button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button type="button" onClick={() => insertLine('• ')} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Bullet List (Ctrl+L)"><span className="text-[11px] font-bold">•</span></button>
            </div>
            <textarea ref={textareaRef} value={value} onChange={onChange} onKeyDown={handleKeyDown} className={cn("w-full bg-zinc-900 border border-white/10 rounded-[2rem] p-6 text-sm font-medium outline-none focus:border-neon-blue/40 transition-all leading-relaxed", minH, className)} placeholder={placeholder} />
        </div>
    );
};

const InvoiceGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addInvoice, updateInvoice, invoices, uploadToCloudinary } = useStore();
    const [previewScale, setPreviewScale] = useState(0.65);
    const previewContainerRef = useRef(null);

    // AI & Workflow State
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiApiKey, setAiApiKey] = useState(localStorage.getItem('geminiApiKey') || import.meta.env.VITE_GEMINI_API_KEY || '');
    
    // Auto-migrate deprecated models to Gemini 1.5/2.0 series
    const migrateModel = (m) => {
        if (!m || !m.startsWith('gemini')) return 'gemini-1.5-flash';
        return m;
    };
    const [aiModel, setAiModel] = useState(migrateModel(localStorage.getItem('geminiModel')));
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [showAiSettings, setShowAiSettings] = useState(false);
    const [activeTab, setActiveTab] = useState('1'); 
    const [currentPreviewPage, setCurrentPreviewPage] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);

    const logoOptions = [
        { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
        { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
    ];

    const [formData, setFormData] = useState(() => {
        const savedSender = JSON.parse(localStorage.getItem('newbi_invoice_sender') || '{}');
        return {
            senderName: savedSender.name || 'Newbi Entertainment & Marketing LLP',
            senderContact: savedSender.contact || '+91 93043 72773',
            senderEmail: savedSender.email || 'partnership@newbi.live',
            senderGst: savedSender.gst || 'ETXPA9107A',
            clientName: '',
            clientAddress: '',
            clientGst: '',
            invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
            invoiceDate: new Date().toISOString().split('T')[0],
            dueDate: '',
            advancePaid: 0,
            note: '',
            paymentDetails: `Name: ABHINAV ANAND\nAccount No.: 77780102222341\nIFSC Code: FDRL0007778\nBranch: Neo Banking - Jupiter\nUPI ID: 6207708566@jupiteraxis\nContact No.: 6207708566`,
            showSignatory: 'none',
            signatoryImage: '',
            showNotes: true,
            showPaymentDetails: true,
            showUPI: false,
            upiId: '6207708566@jupiteraxis',
            qrType: 'auto',
            customQrImage: '',
            showGst: true,
            gstPercentage: 18,
            showFooter: true,
            showAdvance: true,
            showSignatureBlock: true,
            showPaymentButton: false,
            paymentLink: '',
            selectedLogo: 'entertainment',
            status: 'Pending'
        };
    });

    // Save sender details to localStorage whenever they change
    useEffect(() => {
        const senderDetails = {
            name: formData.senderName,
            contact: formData.senderContact,
            email: formData.senderEmail,
            gst: formData.senderGst
        };
        localStorage.setItem('newbi_invoice_sender', JSON.stringify(senderDetails));
    }, [formData.senderName, formData.senderContact, formData.senderEmail, formData.senderGst]);

    const [items, setItems] = useState([
        { id: 1, description: '', qty: 1, price: 0 }
    ]);

    const [customColumns, setCustomColumns] = useState([]);
    const [newColumnName, setNewColumnName] = useState('');

    const handleAddColumn = () => {
        if (!newColumnName.trim()) return;
        const id = `col-${Date.now()}`;
        setCustomColumns([...customColumns, { id, label: newColumnName.trim() }]);
        setNewColumnName('');
    };

    useEffect(() => {
        if (id && invoices.length > 0) {
            const invoice = invoices.find(inv => inv.id === id);
            if (invoice) {
                setFormData({
                    ...invoice,
                    invoiceDate: invoice.issueDate || invoice.invoiceDate,
                    selectedLogo: invoice.selectedLogo || 'entertainment'
                });
                setItems(invoice.items || []);
                setCustomColumns(invoice.customColumns || []);
            }
        }
    }, [id, invoices]);

    useEffect(() => {
        const handleResize = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth;
                const containerHeight = previewContainerRef.current.clientHeight;
                const scaleWidth = (containerWidth - 60) / 794;
                const scaleHeight = (containerHeight - 60) / 1123;
                setPreviewScale(Math.max(0.3, Math.min(1, scaleWidth, scaleHeight)));
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const gstAmount = formData.showGst ? (subtotal * formData.gstPercentage) / 100 : 0;
    const totalAmount = subtotal + gstAmount;
    const balanceDue = totalAmount - formData.advancePaid;

    const handleSave = async () => {
        setIsGenerating(true);
        try {
            const invoiceData = { 
                ...formData, 
                items, 
                customColumns,
                amount: totalAmount,
                total: totalAmount,
                issueDate: formData.invoiceDate,
                updatedAt: new Date().toISOString() 
            };
            if (id) await updateInvoice(id, invoiceData);
            else await addInvoice({ ...invoiceData, createdAt: new Date().toISOString() });
            navigate('/admin/invoices');
        } catch (error) {
            alert("Save Error: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt) return;
        setIsGeneratingAi(true);
        setAiError(null);
        try {
            const result = await generateInvoiceContent(aiApiKey, aiPrompt, formData, aiModel);
            setFormData(prev => ({ ...prev, ...result }));
            if (result.items) setItems(result.items.map((it, idx) => ({ ...it, id: idx + 1 })));
            setActiveTab('2');
        } catch (error) {
            setAiError(error.message);
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleRefineField = async (fieldName, fieldLabel) => {
        const prompt = window.prompt(`How should we refine the ${fieldLabel}?`);
        if (!prompt) return;
        setIsGeneratingAi(true);
        try {
            const refined = await generateInvoiceFieldRefinement(aiApiKey, fieldName, fieldLabel, formData[fieldName], prompt, aiModel);
            setFormData(prev => ({ ...prev, [fieldName]: refined }));
        } catch (error) {
            setAiError(error.message);
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleSignatoryUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsGenerating(true);
        try {
            const url = await uploadToCloudinary(file);
            if (url) setFormData(prev => ({ ...prev, signatoryImage: url, showSignatory: 'image' }));
        } catch (error) {
            alert("Upload Failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePDF = async () => {
        setIsGenerating(true);
        const originalScale = previewScale;
        setPreviewScale(1);
        await new Promise(r => setTimeout(r, 800));
        
        // Create hidden container to render all pages for PDF capture
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.position = 'absolute';
        hiddenContainer.style.left = '-9999px';
        hiddenContainer.style.top = '0';
        hiddenContainer.style.width = '794px';
        document.body.appendChild(hiddenContainer);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const allPages = getPaginatedPages();
            
            for (let i = 0; i < allPages.length; i++) {
                const pageWrapper = document.createElement('div');
                pageWrapper.className = 'temp-pdf-page';
                hiddenContainer.appendChild(pageWrapper);
            }
            
            const pages = document.querySelectorAll('.pdf-capture-only .invoice-page-render');
            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i], { 
                    scale: 2, 
                    useCORS: true, 
                    backgroundColor: '#F3F4F6',
                    width: 794,
                    height: 1123
                });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            }
            pdf.save(`Newbi-Invoice-${formData.invoiceNumber}.pdf`);
        } catch (error) {
            console.error(error);
            alert("PDF Export failed. Check console.");
        } finally {
            document.body.removeChild(hiddenContainer);
            setPreviewScale(originalScale);
            setIsGenerating(false);
        }
    };

    const getPaginatedPages = () => {
        const pages = [];
        let itemsRemaining = [...items];
        
        const functionalBlocksCount = [
            formData.showGst,
            formData.showAdvance && (formData.advancePaid > 0),
            formData.paymentLink,
            formData.upiId && formData.showUPI !== false
        ].filter(Boolean).length;

        const lastPageWithTotalsLimit = functionalBlocksCount >= 3 ? 4 : 7;
        const firstPageLimit = 7; 
        const standardLimit = 15; 

        let isFirstPage = true;
        while (itemsRemaining.length > 0) {
            const limit = isFirstPage ? firstPageLimit : standardLimit;
            const pageItems = itemsRemaining.splice(0, limit);
            pages.push(pageItems);

            const totalsLimit = lastPageWithTotalsLimit;
            if (itemsRemaining.length === 0 && pageItems.length > totalsLimit) {
                pages.push([]);
            }
            isFirstPage = false;
        }
        
        return pages.length > 0 ? pages : [[]];
    };

    const paginatedPages = getPaginatedPages();

    const tabs = [
        { id: '1', label: 'Identity', icon: Building2, desc: 'Branding & Entity Info' },
        { id: '2', label: 'Inventory', icon: FileSpreadsheet, desc: 'Service Line Items' },
        { id: '3', label: 'Settlements', icon: CreditCard, desc: 'Bank, Taxes & Gateway' },
        { id: '4', label: 'Authentication', icon: ShieldCheck, desc: 'Digital Signature' }
    ];

    const currentTab = tabs.find(t => t.id === activeTab);
    const currentLogo = logoOptions.find(l => l.id === formData.selectedLogo) || logoOptions[0];
    const brandColor = currentLogo.color;

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-neon-blue selection:text-black font-['Outfit'] overflow-hidden flex flex-col">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .font-signature { font-family: 'Caveat', cursive; }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}} />

            {/* Header */}
            <header className="h-16 md:h-20 border-b border-white/5 bg-black/50 backdrop-blur-3xl flex items-center justify-between px-4 md:px-8 shrink-0 relative z-50">
                <div className="flex items-center gap-2 md:gap-4 min-w-0">
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        <Link to="/admin/invoices" className="p-2.5 md:p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5"><ArrowLeft size={16} md={18} /></Link>
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <h1 className="text-sm md:text-xl font-black tracking-tighter uppercase italic text-white truncate leading-none">Invoice <span className="text-neon-blue">Engine.</span></h1>
                        <p className="text-[7px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1 truncate">Financial Intelligence</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                    <button 
                        onClick={() => setShowPreviewMobile(!showPreviewMobile)} 
                        className="lg:hidden h-10 px-3 bg-neon-blue/10 rounded-xl border border-neon-blue/20 text-neon-blue flex items-center gap-2 active:scale-95 transition-all"
                    >
                        <Eye size={14} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Preview</span>
                    </button>
                    <button onClick={() => setShowAiSettings(true)} className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-gray-500 hover:text-neon-blue transition-all"><Settings size={16} /></button>
                    <button onClick={handleSave} className="h-10 md:h-12 px-3 md:px-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl transition-all flex items-center gap-2">
                        <Save size={14} className="sm:hidden" />
                        <span className="hidden sm:inline">Save</span>
                    </button>
                    <button onClick={generatePDF} className="h-10 md:h-12 px-4 md:px-8 bg-neon-blue text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(0,209,255,0.2)] flex items-center gap-2">
                        <Download size={14} className="sm:hidden" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="hidden lg:flex w-24 border-r border-white/5 bg-zinc-900/20 flex-col p-4 items-center">
                    <nav className="space-y-4">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all group relative", activeTab === tab.id ? "bg-neon-blue text-black shadow-[0_0_30px_rgba(0,255,255,0.3)] scale-110" : "bg-white/5 text-gray-500 hover:text-white hover:bg-white/10")}>
                                <tab.icon size={24} />
                                <div className="absolute left-20 bg-black border border-white/10 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[100] whitespace-nowrap">{tab.label}</div>
                            </button>
                        ))}
                    </nav>
                </aside>
                
                {/* Mobile Bottom Navigation */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-[100] px-4 flex items-center justify-around no-scrollbar">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex flex-col items-center justify-center min-w-[64px] h-full transition-all gap-1", activeTab === tab.id ? "text-neon-blue" : "text-gray-500")}>
                            <tab.icon size={20} />
                            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label.split(' ')[0]}</span>
                            {activeTab === tab.id && <div className="w-1 h-1 rounded-full bg-neon-blue mt-1 shadow-[0_0_8px_#00D1FF]" />}
                        </button>
                    ))}
                </div>

                {/* Editor */}
                <section className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-hide bg-[#050505] pb-32">
                    <div className="max-w-3xl mx-auto">
                        {/* AI Strategist */}
                        <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] mb-12 group relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Sparkles size={60} className="text-neon-blue" /></div>
                             <div className="flex items-center gap-3 mb-4">
                                <Sparkles size={14} className="text-neon-blue" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Financial AI Orchestrator</p>
                             </div>
                             <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="w-full bg-black/40 border border-white/10 focus:border-neon-blue/40 rounded-2xl p-4 text-xs font-medium min-h-[80px] outline-none text-white mb-4 transition-all" placeholder="Describe billing requirements (Services, counts, pricing, client info)..." />
                             <button onClick={handleGenerateAI} disabled={isGeneratingAi || !aiPrompt} className="w-full h-12 bg-neon-blue text-black font-black uppercase tracking-widest text-[9px] rounded-xl shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isGeneratingAi ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />} Execute Strategic Generation</button>
                             
                             {aiError && (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 animate-in slide-in-from-top-2">
                                    <AlertCircle size={14} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">{aiError}</p>
                                </div>
                             )}
                        </div>

                        <div className="mb-12">
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic mb-1">{currentTab?.label}.</h2>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6">{currentTab?.desc}</p>
                            <div className="w-16 h-1.5 bg-neon-blue" />
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-12">
                                {activeTab === '1' && (
                                    <div className="space-y-12">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                                            {logoOptions.map(logo => (
                                                <button key={logo.id} onClick={() => setFormData({...formData, selectedLogo: logo.id})} className={cn("p-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2 overflow-hidden relative group/btn", formData.selectedLogo === logo.id ? "bg-neon-blue border-neon-blue text-black scale-105 shadow-xl" : "bg-zinc-900 border-white/5 text-gray-500 hover:text-white")}>
                                                    <div className="w-full aspect-[4/3] rounded-xl bg-white flex items-center justify-center p-2 relative overflow-hidden">
                                                        <img src={logo.path} alt={logo.label} className="w-full h-full object-contain" />
                                                        <div className="absolute inset-0 bg-black/5" />
                                                    </div>
                                                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest relative z-10 leading-tight">{logo.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Invoice ID</label>
                                                <input value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40 transition-all" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Issue Date</label>
                                                <StudioDatePicker value={formData.invoiceDate} onChange={val => setFormData({...formData, invoiceDate: val})} className="h-16" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Due Date</label>
                                                <StudioDatePicker value={formData.dueDate} onChange={val => setFormData({...formData, dueDate: val})} className="h-16" />
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center px-4">
                                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Invoiced By (Sender)</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem]">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Entity Name</label>
                                                    <input value={formData.senderName} onChange={e => setFormData({...formData, senderName: e.target.value})} className="w-full bg-black/40 border border-white/10 h-14 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40" />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">GSTIN / TAX ID</label>
                                                    <input value={formData.senderGst} onChange={e => setFormData({...formData, senderGst: e.target.value})} className="w-full bg-black/40 border border-white/10 h-14 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40" />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Contact Details</label>
                                                    <input value={formData.senderContact} onChange={e => setFormData({...formData, senderContact: e.target.value})} className="w-full bg-black/40 border border-white/10 h-14 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40" />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">Corporate Email</label>
                                                    <input value={formData.senderEmail} onChange={e => setFormData({...formData, senderEmail: e.target.value})} className="w-full bg-black/40 border border-white/10 h-14 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <div className="flex justify-between items-center px-4 mb-4">
                                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Invoiced To (Client)</h4>
                                            </div>
                                            <input value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40 transition-all" placeholder="Organization Name" />
                                            <textarea value={formData.clientAddress} onChange={e => setFormData({...formData, clientAddress: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40 transition-all min-h-[100px]" placeholder="Client Address / Billing Location" />
                                            <input value={formData.clientGst} onChange={e => setFormData({...formData, clientGst: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40 transition-all" placeholder="Client GSTIN (Optional)" />
                                        </div>
                                    </div>
                                )}

                                {activeTab === '2' && (
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center px-4">
                                            <div className="flex flex-col">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Billing Table</h4>
                                                <div className="flex flex-wrap items-center gap-3 mt-4">
                                                    {customColumns.map(col => (
                                                        <span key={col.id} className="h-9 px-4 bg-neon-blue/10 border border-neon-blue/20 rounded-full text-[9px] font-black text-neon-blue uppercase flex items-center gap-3 animate-in zoom-in-95 duration-300">
                                                            {col.label}
                                                            <button onClick={() => setCustomColumns(customColumns.filter(c => c.id !== col.id))} className="hover:text-red-500 transition-colors p-1 hover:bg-red-500/10 rounded-full"><X size={10} /></button>
                                                        </span>
                                                    ))}
                                                    <div className="relative group flex items-center gap-2">
                                                        <div className="absolute inset-0 bg-neon-blue/5 rounded-full blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                                        <input 
                                                            value={newColumnName} 
                                                            onChange={e => setNewColumnName(e.target.value)} 
                                                            onKeyPress={e => e.key === 'Enter' && handleAddColumn()} 
                                                            className="w-32 bg-zinc-900 border border-white/10 h-9 px-4 rounded-full text-[9px] font-black uppercase outline-none focus:border-neon-blue/40 text-white placeholder:text-gray-600 transition-all focus:w-48 relative z-10" 
                                                            placeholder="+ Add Column..." 
                                                        />
                                                        <button onClick={handleAddColumn} className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-all"><Plus size={14} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => setItems([...items, { id: Date.now(), description: '', qty: 1, price: 0, customValues: {} }])} className="w-12 h-12 bg-neon-blue text-black rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-[0_10px_25px_rgba(0,255,255,0.2)] flex items-center justify-center"><Plus size={20} /></button>
                                        </div>
                                        <div className="space-y-4">
                                            {items.map((item, idx) => (
                                                <div key={item.id} className="flex flex-col bg-zinc-900/40 p-6 rounded-3xl border border-white/5 group transition-all hover:bg-zinc-900/60 gap-4">
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex-1">
                                                            <textarea value={item.description} onChange={e => { const newItems = [...items]; newItems[idx].description = e.target.value; setItems(newItems); }} rows={1} className="w-full bg-transparent border-none p-0 text-sm font-bold outline-none resize-none scrollbar-hide text-white placeholder:text-gray-600" placeholder="Description of service or product..." />
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="flex flex-col items-center"><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Qty</span><input type="number" value={item.qty} onChange={e => { const newItems = [...items]; newItems[idx].qty = Number(e.target.value); setItems(newItems); }} className="w-16 bg-black/40 border border-white/10 h-10 rounded-lg text-center text-xs font-black outline-none focus:border-neon-blue/50" /></div>
                                                            <div className="flex flex-col items-end"><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 pr-2">Price</span><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neon-blue">₹</span><input type="number" value={item.price} onChange={e => { const newItems = [...items]; newItems[idx].price = Number(e.target.value); setItems(newItems); }} className="w-32 bg-black/40 border border-white/10 h-10 pl-7 pr-4 rounded-lg text-right text-xs font-black text-neon-blue outline-none focus:border-neon-blue/50" /></div></div>
                                                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-2.5 text-gray-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                    {customColumns.length > 0 && (
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                                                            {customColumns.map(col => (
                                                                <div key={col.id} className="space-y-1.5">
                                                                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest px-1">{col.label}</label>
                                                                    <input 
                                                                        value={item.customValues?.[col.id] || ''} 
                                                                        onChange={e => {
                                                                            const newItems = [...items];
                                                                            newItems[idx].customValues = { ...newItems[idx].customValues, [col.id]: e.target.value };
                                                                            setItems(newItems);
                                                                        }}
                                                                        className="w-full bg-black/20 border border-white/5 h-8 px-3 rounded-lg text-[10px] font-bold outline-none focus:border-neon-blue/30 text-white"
                                                                        placeholder={`Value...`}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === '3' && (
                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">GST Rate (%)</label>
                                                    <button onClick={() => setFormData({...formData, showGst: !formData.showGst})} className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all", formData.showGst ? "bg-neon-blue/10 text-neon-blue border-neon-blue/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>{formData.showGst ? 'Enabled' : 'Disabled'}</button>
                                                </div>
                                                <input type="number" value={formData.gstPercentage} onChange={e => setFormData({...formData, gstPercentage: Number(e.target.value)})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40 transition-all" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Advance Received (₹)</label>
                                                <input type="number" value={formData.advancePaid} onChange={e => setFormData({...formData, advancePaid: Number(e.target.value)})} className="w-full bg-zinc-900 border border-white/10 h-16 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40 transition-all text-neon-blue" />
                                            </div>
                                        </div>

                                        {/* Bank Details */}
                                        <div className="space-y-6 pt-8 border-t border-white/5">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Settlement Account Details</label>
                                                <button onClick={() => setFormData({...formData, showPaymentDetails: !formData.showPaymentDetails})} className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all", formData.showPaymentDetails ? "bg-neon-blue/10 text-neon-blue border-neon-blue/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>{formData.showPaymentDetails ? 'Visible' : 'Hidden'}</button>
                                            </div>
                                            <textarea value={formData.paymentDetails} onChange={e => setFormData({...formData, paymentDetails: e.target.value})} className={cn("w-full bg-zinc-900 border border-white/10 p-8 rounded-3xl font-mono text-xs leading-relaxed outline-none focus:border-neon-blue/40 transition-all min-h-[160px]", !formData.showPaymentDetails && "opacity-30")} placeholder="Account Name, Number, IFSC, etc..." />
                                        </div>

                                        {/* UPI QR */}
                                        <div className="space-y-8 pt-8 border-t border-white/5">
                                            <div className="flex items-center justify-between px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Digital Payment QR</label>
                                                <button onClick={() => setFormData({...formData, showUPI: !formData.showUPI})} className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all", formData.showUPI ? "bg-neon-blue text-black border-neon-blue" : "bg-white/5 text-gray-500 border-white/5")}>{formData.showUPI ? 'QR Enabled' : 'QR Disabled'}</button>
                                            </div>
                                            {formData.showUPI && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2">
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-2">QR Source</label>
                                                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                                            {['auto', 'custom'].map(type => (
                                                                <button key={type} onClick={() => setFormData({...formData, qrType: type})} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", formData.qrType === type ? "bg-white text-black" : "text-gray-500")}>{type === 'auto' ? 'Dynamic UPI' : 'Custom Image'}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {formData.qrType === 'auto' ? (
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-2">Merchant UPI ID</label>
                                                            <input value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} className="w-full bg-zinc-900 border border-white/10 h-14 px-6 rounded-2xl font-bold text-sm outline-none focus:border-neon-blue/40 transition-all" />
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-2">Custom QR Asset</label>
                                                            <div className="relative group h-14">
                                                                <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onload = (ex) => setFormData({...formData, customQrImage: ex.target.result}); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                                <div className="h-full border border-dashed border-white/10 rounded-2xl bg-black/30 flex items-center justify-center gap-3 group-hover:border-neon-blue/40 transition-all">
                                                                    <ImageIcon size={16} className="text-gray-500" />
                                                                    <span className="text-[10px] font-black text-gray-500 uppercase">{formData.customQrImage ? 'Replace Image' : 'Select QR Image'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Notes & Terms */}
                                        <div className="space-y-6 pt-8 border-t border-white/5">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Strategic Notes & Terms</label>
                                                <div className="flex items-center gap-4">
                                                    <button onClick={() => handleRefineField('note', 'Invoice Notes')} className="text-[9px] font-black text-neon-blue uppercase tracking-widest underline">AI Refine</button>
                                                    <button onClick={() => setFormData({...formData, showNotes: !formData.showNotes})} className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all", formData.showNotes ? "bg-neon-blue/10 text-neon-blue border-neon-blue/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>{formData.showNotes ? 'Visible' : 'Hidden'}</button>
                                                </div>
                                            </div>
                                            <div className={cn(!formData.showNotes && "opacity-30")}>
                                                <FormattedTextArea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Billing terms, payment instructions, etc..." />
                                            </div>
                                        </div>

                                        {/* PayU Gateway */}
                                        <div className="p-8 bg-zinc-900 border border-white/10 rounded-[2.5rem] space-y-8 mt-8">
                                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                                <div>
                                                    <h4 className="text-[10px] font-black text-neon-blue uppercase tracking-widest mb-1">PayU Checkout Gateway</h4>
                                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Automatic Payment Generation</p>
                                                </div>
                                                <button onClick={() => setFormData({...formData, showPaymentButton: !formData.showPaymentButton})} className={cn("w-14 h-8 rounded-full transition-all relative border", formData.showPaymentButton ? "bg-neon-blue border-neon-blue" : "bg-black/40 border-white/10")}>
                                                    <div className={cn("absolute top-1 w-6 h-6 rounded-full transition-all", formData.showPaymentButton ? "left-7 bg-black" : "left-1 bg-gray-600")} />
                                                </button>
                                            </div>
                                            {formData.showPaymentButton && (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                                    <div className="flex gap-4">
                                                        <button 
                                                            onClick={() => {
                                                                const amount = (items.reduce((sum, item) => sum + (item.qty * item.price), 0) * (formData.showGst ? (1 + formData.gstPercentage/100) : 1)) - formData.advancePaid;
                                                                const link = `https://pmny.in/payu/checkout?invoice=${formData.invoiceNumber}&amount=${amount}&merchant=NEWBI`;
                                                                setFormData({...formData, paymentLink: link});
                                                            }}
                                                            className="flex-1 h-16 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                                                        >
                                                            <Zap size={14} /> Generate PayU Link
                                                        </button>
                                                        <button 
                                                            onClick={() => setFormData({...formData, paymentLink: ''})}
                                                            className="h-16 px-6 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Final Checkout URL</label>
                                                        <div className="relative group">
                                                            <div className="absolute inset-0 bg-neon-blue/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                                            <input value={formData.paymentLink} onChange={e => setFormData({...formData, paymentLink: e.target.value})} className="w-full bg-black/40 border border-white/10 h-16 px-6 rounded-2xl font-mono text-[10px] outline-none focus:border-neon-blue/40 relative z-10 text-white" placeholder="PayU or Custom Gateway URL..." />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === '4' && (
                                    <div className="space-y-12">
                                        <div className="space-y-6">
                                            <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.5em] mb-8 flex items-center gap-4">
                                                <div className="w-12 h-px bg-neon-blue/30" /> SIGNATURE BLOCK
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Signature Display Mode</label>
                                                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                                        {['none', 'text', 'image'].map(mode => (
                                                            <button key={mode} onClick={() => setFormData({...formData, showSignatory: mode})} className={cn("flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", formData.showSignatory === mode ? "bg-white text-black" : "text-gray-500")}>{mode}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {formData.showSignatory === 'image' && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Seal / Signature Upload</label>
                                                        <div className="relative group aspect-video">
                                                            {formData.signatoryImage ? (
                                                                <div className="relative h-full bg-white/5 rounded-2xl border border-white/10 p-6 flex items-center justify-center overflow-hidden">
                                                                    <img src={formData.signatoryImage} alt="Signature" className="max-h-full object-contain" />
                                                                    <button onClick={() => setFormData({...formData, signatoryImage: ''})} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                                                </div>
                                                            ) : (
                                                                <div className="h-full border-2 border-dashed border-white/5 rounded-3xl bg-black/30 flex flex-col items-center justify-center gap-4 group-hover:border-neon-blue/20 transition-all">
                                                                    <input type="file" onChange={handleSignatoryUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-neon-blue group-hover:text-black transition-all">
                                                                        <Upload size={20} />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Click to Upload</p>
                                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">PNG, JPG (Max 2MB)</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
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
                                    if (idx > 0) setActiveTab(tabs[idx - 1].id);
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
                                    if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id);
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                                    activeTab === tabs[tabs.length - 1].id 
                                        ? "bg-white/5 text-gray-500 cursor-not-allowed opacity-50" 
                                        : "bg-neon-blue text-black hover:scale-105 shadow-[0_0_20px_rgba(0,209,255,0.2)]"
                                )}
                            >
                                <span>{activeTab === tabs[tabs.length - 1].id ? 'Final Step' : 'Next Section'}</span>
                                {activeTab !== tabs[tabs.length - 1].id && <ChevronRight size={16} />}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Doc Preview */}
                <section className={cn(
                    "lg:static lg:flex fixed inset-0 z-[60] lg:z-0 bg-[#050505] lg:bg-zinc-900/10 flex-col overflow-hidden shrink-0 transition-transform duration-500 lg:translate-x-0",
                    "w-full lg:w-[500px] 2xl:w-[750px] border-l border-white/5",
                    showPreviewMobile ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                )}>
                    <div className="h-20 lg:h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowPreviewMobile(false)} className="lg:hidden p-3 bg-white/5 rounded-xl border border-white/5"><ArrowLeft size={18} /></button>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Document Live View</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setCurrentPreviewPage(Math.max(0, currentPreviewPage - 1))} disabled={currentPreviewPage === 0} className="p-2.5 bg-white/5 rounded-xl disabled:opacity-20 hover:bg-white/10 transition-all"><ChevronLeft size={16} /></button>
                            <span className="text-[10px] font-black text-neon-blue">{currentPreviewPage + 1} / {paginatedPages.length}</span>
                            <button onClick={() => setCurrentPreviewPage(Math.min(paginatedPages.length - 1, currentPreviewPage + 1))} disabled={currentPreviewPage === paginatedPages.length - 1} className="p-2.5 bg-white/5 rounded-xl disabled:opacity-20 hover:bg-white/10 transition-all"><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    <div ref={previewContainerRef} className="flex-1 bg-zinc-950 flex flex-col items-center justify-start p-8 overflow-y-auto relative">
                        <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center', height: `${1123 * previewScale}px` }} className="transition-transform duration-500 mb-20">
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={currentPreviewPage} 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }} 
                                    className="invoice-page-render w-[794px] h-[1123px] bg-[#F3F4F6] text-black relative flex flex-col p-[12mm] shadow-2xl rounded-xl overflow-hidden"
                                    style={{ fontFamily: "'Inter', sans-serif" }}
                                >
                                    {/* Header - Page 1 or summary */}
                                    {currentPreviewPage === 0 ? (
                                        <div className="flex justify-between items-start mb-12">
                                            <div>
                                                <img src={currentLogo.path} alt="Company Logo" className="h-20 object-contain" crossOrigin="anonymous" />
                                            </div>
                                            <div className="text-right">
                                                <h2 className="text-4xl font-black text-gray-400 tracking-tighter uppercase mb-0">#{formData.invoiceNumber}</h2>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">INVOICE ID</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                                            <img src={currentLogo.path} alt="Logo" className="w-[100px] object-contain opacity-50" crossOrigin="anonymous" />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice #{formData.invoiceNumber} — Page {currentPreviewPage + 1}</p>
                                        </div>
                                    )}

                                    <div className={cn("relative z-10 flex flex-col flex-1", currentPreviewPage === paginatedPages.length - 1 ? "pb-56" : "pb-48")}>
                                        {/* Info Boxes - Page 1 */}
                                        {currentPreviewPage === 0 && (
                                            <div className="grid grid-cols-2 gap-8 mb-8">
                                                <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                    <div className="px-6 py-2" style={{ backgroundColor: `${brandColor}66` }}>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE BY</h4>
                                                    </div>
                                                    <div className="p-6">
                                                        <p className="text-xl font-bold mb-3 leading-none">{formData.senderName || 'Newbi Entertainment'}</p>
                                                        <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                            <p>Contact: {formData.senderContact}</p>
                                                            <p>Email: {formData.senderEmail}</p>
                                                            {formData.senderGst && <p>GSTIN: {formData.senderGst}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                    <div className="px-6 py-2" style={{ backgroundColor: `${brandColor}66` }}>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE TO</h4>
                                                    </div>
                                                    <div className="p-6">
                                                        <p className="text-xl font-bold uppercase mb-3 leading-none">{formData.clientName || 'CLIENT NAME'}</p>
                                                        <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                            <p>Date: {new Date(formData.invoiceDate).toLocaleDateString('en-GB')}</p>
                                                            {formData.dueDate && <p className="font-black italic" style={{ color: brandColor }}>Due Date: {new Date(formData.dueDate).toLocaleDateString('en-GB')}</p>}
                                                            {formData.clientAddress && <p className="whitespace-pre-line">{formData.clientAddress}</p>}
                                                            {formData.clientGst && <p className="mt-1 pt-1 border-t border-gray-200 inline-block text-[10px]">GST: {formData.clientGst}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Items Table */}
                                        {paginatedPages[currentPreviewPage]?.length > 0 && (
                                            <div className={cn("mb-8 overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white/20", currentPreviewPage > 0 && "mt-4")}>
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="text-black" style={{ backgroundColor: `${brandColor}66` }}>
                                                        <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-black/5">SERVICE DESCRIPTION</th>
                                                        {customColumns.map(col => (
                                                            <th key={col.id} className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">{col.label}</th>
                                                        ))}
                                                        <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">QTY.</th>
                                                        <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">PRICE</th>
                                                        <th className="py-4 px-6 text-right text-[10px] font-black uppercase tracking-widest">TOTAL</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {paginatedPages[currentPreviewPage]?.map((item, idx) => (
                                                        <tr key={idx} className="bg-white/10">
                                                            <td className="py-3 px-6 text-[11px] font-bold uppercase border-r border-dashed border-gray-200 leading-relaxed italic">{item.description || "SERVICE"}</td>
                                                            {customColumns.map(col => (
                                                                <td key={col.id} className="py-3 px-4 text-center text-[10px] font-semibold border-r border-dashed border-gray-200 leading-relaxed italic text-gray-500">{item.customValues?.[col.id] || "-"}</td>
                                                            ))}
                                                            <td className="py-3 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed">{item.qty || 1}</td>
                                                            <td className="py-3 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed">₹{(item.price || 0).toLocaleString()}</td>
                                                            <td className="py-3 px-6 text-right text-[11px] font-black leading-relaxed">₹{( (item.qty || 1) * (item.price || 0) ).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                    {/* Items will naturally flow */}
                                                </tbody>
                                            </table>
                                        </div>
                                        )}

                                        {/* Totals Section - Only on Last Page */}
                                        {currentPreviewPage === paginatedPages.length - 1 && (
                                            <div className="mt-4 flex gap-x-8 items-start pt-4 border-t border-gray-200 relative z-10 w-full">
                                                {/* Left Column: Payment Details & Notes */}
                                                <div className="flex-1 space-y-2">
                                                    {/* Payment Details */}
                                                    {formData.showPaymentDetails && formData.paymentDetails && (
                                                        <div className="p-2 border-2 border-dashed border-gray-300 rounded-2xl text-[9px] font-bold text-left uppercase leading-relaxed text-gray-500 bg-white/40 shadow-sm w-full">
                                                            <p className="text-[10px] font-black text-black mb-2 border-b-2 pb-1.5 inline-block" style={{ borderColor: brandColor }}>PAYMENT DETAILS</p>
                                                            <div className="whitespace-pre-line tracking-wide">
                                                                {formData.paymentDetails}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Additional Notes */}
                                                    {formData.showNotes && (
                                                        <div className="bg-white/40 border border-black/5 rounded-2xl overflow-hidden shadow-sm">
                                                            <div className="px-4 py-1.5 border-b border-black/10" style={{ backgroundColor: `${brandColor}66` }}>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">ADDITIONAL NOTE</h4>
                                                            </div>
                                                            <div className="p-2">
                                                                <p className="text-[9px] text-gray-700 font-bold whitespace-pre-line leading-relaxed italic">{formData.note || 'No additional notes.'}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Column: Totals, QR & Signature */}
                                                <div className="flex-1 flex flex-col items-end space-y-1">
                                                    {/* Totals Section */}
                                                    <div className="w-full space-y-1.5">
                                                        <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            <span>SUBTOTAL</span>
                                                            <span className="text-black text-[11px] font-bold italic">₹{subtotal.toLocaleString()}</span>
                                                        </div>
                                                        {formData.showGst && (
                                                            <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">
                                                                <span>GST ({formData.gstPercentage}%)</span>
                                                                <span className="text-black text-[11px] font-bold italic">₹{gstAmount.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-center py-2 px-3 text-black border border-black/5 mt-1 rounded-lg" style={{ backgroundColor: `${brandColor}66` }}>
                                                            <span className="text-[9px] font-black uppercase italic">TOTAL</span>
                                                            <span className="text-lg font-black italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                                        </div>
                                                        {formData.showAdvance && formData.advancePaid > 0 && (
                                                            <>
                                                                <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                                                    <span>ADVANCE PAID</span>
                                                                    <span className="text-black text-[11px] font-bold italic">₹{formData.advancePaid.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center py-2 px-4 text-black border border-black/10 rounded-xl shadow-lg mt-1" style={{ backgroundColor: `${brandColor}66` }}>
                                                                    <span className="text-[10px] font-black uppercase italic">BALANCE DUE</span>
                                                                    <span className="text-2xl font-black italic tracking-tighter">₹{balanceDue.toLocaleString()}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                        {formData.paymentLink && (
                                                            <a href={formData.paymentLink} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-2 w-full h-11 bg-black text-white rounded-xl font-black uppercase tracking-[0.2em] text-[9px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                                                                <Zap size={14} className="text-neon-blue" />
                                                                Pay Now Online
                                                            </a>
                                                        )}
                                                    </div>

                                                    {/* QR Code Section */}
                                                    {formData.showUPI && formData.upiId && (
                                                        <div className="flex flex-col items-end gap-2 w-full pt-3 border-t border-gray-300/50">
                                                            <div className="bg-white p-2 rounded-xl border border-gray-200 inline-block shadow-sm shrink-0">
                                                                <img 
                                                                    src={formData.qrType === 'custom' && formData.customQrImage 
                                                                        ? formData.customQrImage 
                                                                        : `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${formData.upiId}&pn=NEWBI&am=${balanceDue}&cu=INR`)}`} 
                                                                    alt="Payment QR" 
                                                                    className="w-[70px] h-[70px] grayscale contrast-125 mx-auto"
                                                                    crossOrigin="anonymous"
                                                                />
                                                                <p className="text-[6px] font-black text-center mt-1 text-gray-400 tracking-widest uppercase italic font-bold">Scan to pay</p>
                                                            </div>
                                                            <a 
                                                                href={`upi://pay?pa=${formData.upiId}&pn=NEWBI&am=${balanceDue}&cu=INR`} 
                                                                className="flex items-center justify-center gap-2 w-full h-10 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
                                                                data-html2canvas-ignore="true"
                                                            >
                                                                Pay via UPI App
                                                            </a>
                                                        </div>
                                                    )}

                                                    {/* Signature Block */}
                                                    {formData.showSignatory !== 'none' && (
                                                        <div className="w-full flex flex-col items-end mt-4">
                                                            {formData.showSignatory === 'image' && formData.signatoryImage ? (
                                                                <img src={formData.signatoryImage} alt="Signature" className="h-16 mb-2 object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                            ) : formData.showSignatory === 'text' ? (
                                                                <div className="h-16 flex items-end justify-center">
                                                                    <p className="font-heading italic text-lg leading-none border-b border-gray-400 pb-1 px-4">{formData.senderName || 'Authorized Signatory'}</p>
                                                                </div>
                                                            ) : (
                                                                <div className="h-16" />
                                                            )}
                                                            <div className="w-40 pt-3 border-t-2 border-dashed border-gray-400 text-center">
                                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-700 italic font-bold">Authorized Signature</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Fixed Footer at bottom of every page */}
                                    {formData.showFooter && (
                                        <footer className="absolute bottom-[12mm] left-[12mm] right-[12mm] h-10 flex items-center justify-between px-6 rounded-full bg-[#39FF14]/40 text-black">
                                            <div className="flex gap-4 text-[9px] font-black tracking-widest uppercase">
                                                <span>CALL: +91 93043 72773</span>
                                                <span>EMAIL: partnership@newbi.live</span>
                                                <span>WEB: newbi.live</span>
                                            </div>
                                            <p className="text-[9px] font-black uppercase">Page {currentPreviewPage + 1} of {paginatedPages.length}</p>
                                        </footer>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </section>
            </main>

            {/* Hidden PDF Capture Container */}
            <div className="pdf-capture-only fixed -left-[5000px] top-0 pointer-events-none">
                {paginatedPages.map((pageItems, pageIdx) => {
                    const isLastPage = pageIdx === paginatedPages.length - 1;
                    const isFirstPage = pageIdx === 0;
                    return (
                        <div 
                            key={pageIdx} 
                            className="invoice-page-render w-[794px] h-[1123px] bg-[#F3F4F6] text-black relative flex flex-col p-[12mm]"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            {/* Header */}
                            {isFirstPage ? (
                                <div className="flex justify-between items-start mb-12">
                                    <img src={currentLogo.path} alt="Logo" className="h-20 object-contain" crossOrigin="anonymous" />
                                    <div className="text-right">
                                        <h2 className="text-4xl font-black text-gray-400 tracking-tighter uppercase mb-0">#{formData.invoiceNumber}</h2>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">INVOICE ID</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                                    <img src={currentLogo.path} alt="Logo" className="w-[100px] object-contain opacity-50" crossOrigin="anonymous" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice #{formData.invoiceNumber} — Page {pageIdx + 1}</p>
                                </div>
                            )}

                            <div className="flex-1 flex flex-col relative">
                                {isFirstPage && (
                                    <div className="grid grid-cols-2 gap-8 mb-8">
                                        <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="px-6 py-2" style={{ backgroundColor: `${brandColor}66` }}><h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE BY</h4></div>
                                            <div className="p-6">
                                                <p className="text-xl font-bold mb-3 leading-none">{formData.senderName}</p>
                                                <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                    <p>Contact: {formData.senderContact}</p>
                                                    <p>Email: {formData.senderEmail}</p>
                                                    {formData.senderPan && <p>PAN: {formData.senderPan}</p>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="px-6 py-2" style={{ backgroundColor: `${brandColor}66` }}><h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE TO</h4></div>
                                            <div className="p-6">
                                                <p className="text-xl font-bold uppercase mb-3 leading-none">{formData.clientName || 'CLIENT NAME'}</p>
                                                <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                    <p>Date: {new Date(formData.invoiceDate).toLocaleDateString('en-GB')}</p>
                                                    {formData.dueDate && <p className="text-[#39FF14] font-black">Due Date: {new Date(formData.dueDate).toLocaleDateString('en-GB')}</p>}
                                                    {formData.clientAddress && <p className="whitespace-pre-line">{formData.clientAddress}</p>}
                                                    {formData.clientGst && <p className="mt-1 pt-1 border-t border-gray-200 inline-block text-[10px]">GST: {formData.clientGst}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className={cn("mb-8 overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white/20", !isFirstPage && "mt-4")}>
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-black" style={{ backgroundColor: `${brandColor}66` }}>
                                                <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-black/5">SERVICE DESCRIPTION</th>
                                                <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">QTY.</th>
                                                <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">PRICE</th>
                                                <th className="py-4 px-6 text-right text-[10px] font-black uppercase tracking-widest">TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {pageItems.map((item, idx) => (
                                                <tr key={idx} className="bg-white/10">
                                                    <td className="py-5 px-6 text-[11px] font-bold uppercase border-r border-dashed border-gray-200 leading-relaxed italic">{item.description || "SERVICE"}</td>
                                                    <td className="py-5 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed">{item.qty || 1}</td>
                                                    <td className="py-5 px-4 text-center text-[11px] font-black border-r border-dashed border-gray-200 leading-relaxed">₹{(item.price || 0).toLocaleString()}</td>
                                                    <td className="py-5 px-6 text-right text-[11px] font-black leading-relaxed">₹{( (item.qty || 1) * (item.price || 0) ).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                        {isLastPage && (
                                    <div className="mt-4 flex gap-x-8 items-start pt-4 border-t border-gray-200 relative z-10 w-full">
                                        {/* Left Column: Payment Details & Notes */}
                                        <div className="flex-1 space-y-2">
                                            {/* Payment Details */}
                                            {formData.showPaymentDetails && formData.paymentDetails && (
                                                <div className="p-2 border-2 border-dashed border-gray-300 rounded-2xl text-[9px] font-bold text-left uppercase leading-relaxed text-gray-500 bg-white/40 shadow-sm w-full">
                                                    <p className="text-[10px] font-black text-black mb-2 border-b-2 pb-1.5 inline-block" style={{ borderColor: brandColor }}>PAYMENT DETAILS</p>
                                                    <div className="whitespace-pre-line tracking-wide">
                                                        {formData.paymentDetails}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Additional Notes */}
                                            {formData.showNotes && (
                                                <div className="bg-white/40 border border-black/5 rounded-2xl overflow-hidden shadow-sm">
                                                    <div className="px-4 py-1.5 border-b border-black/10" style={{ backgroundColor: `${brandColor}66` }}>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black">ADDITIONAL NOTE</h4>
                                                    </div>
                                                    <div className="p-2">
                                                        <p className="text-[9px] text-gray-700 font-bold whitespace-pre-line leading-relaxed italic">{formData.note || 'No additional notes.'}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Totals, QR & Signature */}
                                        <div className="flex-1 flex flex-col items-end space-y-2">
                                            {/* Totals Section */}
                                            <div className="w-full space-y-1.5">
                                                <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <span>SUBTOTAL</span>
                                                    <span className="text-black text-[11px] font-bold italic">₹{subtotal.toLocaleString()}</span>
                                                </div>
                                                {formData.showGst && (
                                                    <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">
                                                        <span>GST ({formData.gstPercentage}%)</span>
                                                        <span className="text-black text-[11px] font-bold italic">₹{gstAmount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center py-2 px-3 text-black border border-black/5 mt-1 rounded-lg" style={{ backgroundColor: `${brandColor}66` }}>
                                                    <span className="text-[9px] font-black uppercase italic">TOTAL</span>
                                                    <span className="text-lg font-black italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                                </div>
                                                {formData.showAdvance && formData.advancePaid > 0 && (
                                                    <>
                                                        <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                                            <span>ADVANCE PAID</span>
                                                            <span className="text-black text-[11px] font-bold italic">₹{formData.advancePaid.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-2 px-4 text-black border border-black/10 rounded-xl shadow-lg mt-1" style={{ backgroundColor: `${brandColor}66` }}>
                                                            <span className="text-[10px] font-black uppercase italic">BALANCE DUE</span>
                                                            <span className="text-2xl font-black italic tracking-tighter">₹{balanceDue.toLocaleString()}</span>
                                                        </div>
                                                    </>
                                                )}
                                                {formData.paymentLink && (
                                                    <a href={formData.paymentLink} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-2 w-full h-11 bg-black text-white rounded-xl font-black uppercase tracking-[0.2em] text-[9px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                                                        <Zap size={14} className="text-neon-blue" />
                                                        Pay Now Online
                                                    </a>
                                                )}
                                            </div>

                                            {/* QR Code Section */}
                                            {formData.showUPI && formData.upiId && (
                                                <div className="flex flex-col items-end gap-3 w-full pt-4 border-t border-gray-300/50">
                                                    <div className="bg-white p-2 rounded-xl border border-gray-200 inline-block shadow-sm shrink-0">
                                                        <img 
                                                            src={formData.qrType === 'custom' && formData.customQrImage 
                                                                ? formData.customQrImage 
                                                                : `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${formData.upiId}&pn=NEWBI&am=${balanceDue}&cu=INR`)}`} 
                                                            alt="Payment QR" 
                                                            className="w-[70px] h-[70px] grayscale contrast-125 mx-auto"
                                                            crossOrigin="anonymous"
                                                        />
                                                        <p className="text-[6px] font-black text-center mt-1 text-gray-400 tracking-widest uppercase italic font-bold">Scan to pay</p>
                                                    </div>
                                                    <a 
                                                        href={`upi://pay?pa=${formData.upiId}&pn=NEWBI&am=${balanceDue}&cu=INR`} 
                                                        className="flex items-center justify-center gap-2 w-full h-10 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
                                                        data-html2canvas-ignore="true"
                                                    >
                                                        Pay via UPI App
                                                    </a>
                                                </div>
                                            )}

                                            {/* Signature Block */}
                                            {formData.showSignatory !== 'none' && (
                                                <div className="w-full flex flex-col items-end mt-4">
                                                    {formData.showSignatory === 'image' && formData.signatoryImage ? (
                                                        <img src={formData.signatoryImage} alt="Signature" className="h-16 mb-2 object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
                                                    ) : formData.showSignatory === 'text' ? (
                                                        <div className="h-16 flex items-end justify-center">
                                                            <p className="font-heading italic text-lg leading-none border-b border-gray-400 pb-1 px-4">{formData.senderName || 'Authorized Signatory'}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="h-16" />
                                                    )}
                                                    <div className="w-40 pt-3 border-t-2 border-dashed border-gray-400 text-center">
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-700 italic font-bold">Authorized Signature</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
</div>
                                )}
                            </div>

                            {/* Fixed Footer */}
                            {formData.showFooter && (
                                <footer className="absolute bottom-[12mm] left-[12mm] right-[12mm] h-12 flex items-center px-8 rounded-full text-black shadow-sm" style={{ backgroundColor: `${brandColor}66` }}>
                                    <div className="grid grid-cols-5 w-full items-center">
                                        <div className="flex items-center gap-2 col-span-1">
                                            <span className="text-[7px] font-black text-black/50 tracking-[0.2em]">CALL</span>
                                            <p className="text-[9px] font-black tracking-widest uppercase font-bold whitespace-nowrap">+91 93043 72773</p>
                                        </div>
                                        <div className="flex items-center gap-2 justify-center col-span-2 border-x border-black/5 px-4">
                                            <span className="text-[7px] font-black text-black/50 tracking-[0.2em]">EMAIL</span>
                                            <p className="text-[9px] font-black tracking-widest uppercase font-bold whitespace-nowrap">partnership@newbi.live</p>
                                        </div>
                                        <div className="flex items-center gap-2 justify-center col-span-1 border-r border-black/5 pr-4">
                                            <span className="text-[7px] font-black text-black/50 tracking-[0.2em]">WEB</span>
                                            <p className="text-[9px] font-black tracking-widest uppercase font-bold whitespace-nowrap">newbi.live</p>
                                        </div>
                                        <div className="flex justify-end col-span-1 pl-4">
                                            <p className="text-[9px] font-black tracking-[0.1em] uppercase whitespace-nowrap text-black/80 font-bold italic">PAGE {pageIdx + 1} OF {paginatedPages.length}</p>
                                        </div>
                                    </div>
                                </footer>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* PDF Capture Only Section - Hidden Off-screen */}
            <div className="pdf-capture-only fixed top-0 left-[-9999px] z-[-1]">
                {paginatedPages.map((pageItems, pageIdx) => (
                    <div 
                        key={`pdf-page-${pageIdx}`}
                        className="invoice-page-render w-[794px] h-[1123px] bg-[#F3F4F6] text-black relative flex flex-col p-[12mm] overflow-hidden"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        {/* Header */}
                        {pageIdx === 0 ? (
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <img src={currentLogo.path} alt="Company Logo" className="h-20 object-contain" crossOrigin="anonymous" />
                                </div>
                                <div className="text-right">
                                    <h2 className="text-4xl font-black text-gray-400 tracking-tighter uppercase mb-0">#{formData.invoiceNumber}</h2>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">INVOICE ID</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                                <img src={currentLogo.path} alt="Logo" className="w-[100px] object-contain opacity-50" crossOrigin="anonymous" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice #{formData.invoiceNumber} — Page {pageIdx + 1}</p>
                            </div>
                        )}

                        <div className={cn("relative z-10 flex flex-col flex-1", pageIdx === paginatedPages.length - 1 ? "pb-56" : "pb-48")}>
                            {/* Page 1 Details */}
                            {pageIdx === 0 && (
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="px-6 py-2" style={{ backgroundColor: `${brandColor}66` }}>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE BY</h4>
                                        </div>
                                        <div className="p-6">
                                            <p className="text-xl font-bold mb-3 leading-none">{formData.senderName || 'Newbi Entertainment'}</p>
                                            <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                <p>Contact: {formData.senderContact}</p>
                                                <p>Email: {formData.senderEmail}</p>
                                                {formData.senderGst && <p>GSTIN: {formData.senderGst}</p>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="px-6 py-2" style={{ backgroundColor: `${brandColor}66` }}>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE TO</h4>
                                        </div>
                                        <div className="p-6">
                                            <p className="text-xl font-bold uppercase mb-3 leading-none">{formData.clientName || 'CLIENT NAME'}</p>
                                            <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                <p>{formData.clientAddress}</p>
                                                {formData.clientGst && <p>GSTIN: {formData.clientGst}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Service Table */}
                            <div className="flex-1 bg-white/50 border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-black/5" style={{ backgroundColor: `${brandColor}66` }}>
                                            <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest">Service Description</th>
                                            <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest">Qty.</th>
                                            <th className="text-right px-4 py-4 text-[10px] font-black uppercase tracking-widest">Price</th>
                                            <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5">
                                        {pageItems.map((item, idx) => (
                                            <tr key={idx} className="group transition-colors hover:bg-black/[0.02]">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black uppercase italic tracking-tighter leading-none mb-1">{item.name}</span>
                                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-none">{item.description}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center text-[11px] font-black italic">
                                                    {item.qty}
                                                </td>
                                                <td className="px-4 py-4 text-right text-[11px] font-black italic">
                                                    ₹{item.price.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right text-[11px] font-black italic">
                                                    ₹{(item.qty * item.price).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals & Notes - Last Page */}
                            {pageIdx === paginatedPages.length - 1 && (
                                <div className="mt-auto grid grid-cols-2 gap-x-12 items-start pt-8 border-t border-gray-200">
                                    <div className="space-y-6">
                                        {formData.showPaymentDetails && formData.paymentDetails && (
                                            <div className="p-6 border-2 border-dashed border-gray-300 rounded-[2rem] text-[10px] font-bold text-left uppercase leading-relaxed text-gray-500 bg-white/40 shadow-sm w-full">
                                                <p className="text-xs font-black text-black mb-3 border-b-2 pb-1.5 inline-block" style={{ borderColor: brandColor }}>PAYMENT DETAILS</p>
                                                <div className="whitespace-pre-line tracking-wide">{formData.paymentDetails}</div>
                                            </div>
                                        )}
                                        {formData.showNotes && (
                                            <div className="bg-white/40 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                <div className="px-4 py-1.5 border-b border-black/10" style={{ backgroundColor: `${brandColor}66` }}><h4 className="text-[10px] font-black uppercase tracking-widest text-black">ADDITIONAL NOTE</h4></div>
                                                <div className="p-4"><p className="text-[10px] text-gray-700 font-bold whitespace-pre-line leading-relaxed italic">{formData.note || 'No additional notes.'}</p></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest"><span>SUBTOTAL</span><span className="text-black text-xs font-bold italic">₹{subtotal.toLocaleString()}</span></div>
                                        {formData.showGst && (
                                            <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest"><span>GST ({formData.gstPercentage}%)</span><span className="text-black text-xs font-bold italic">₹{gstAmount.toLocaleString()}</span></div>
                                        )}
                                        <div className="flex justify-between items-center py-3 px-4 text-black border border-black/5 mt-2 rounded-xl" style={{ backgroundColor: `${brandColor}66` }}>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">TOTAL AMOUNT</span>
                                            <span className="text-2xl font-black italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                        </div>
                                        {formData.advancePaid > 0 && (
                                            <div className="flex justify-between py-2 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest"><span>ADVANCE PAID</span><span className="text-black text-xs font-bold italic">₹{formData.advancePaid.toLocaleString()}</span></div>
                                        )}
                                        <div className="flex justify-between items-center py-4 px-6 text-black border border-black/5 mt-2 rounded-2xl shadow-xl" style={{ backgroundColor: `${brandColor}66` }}>
                                            <span className="text-xs font-black uppercase tracking-[0.2em]">BALANCE DUE</span>
                                            <span className="text-4xl font-black italic tracking-tighter">₹{balanceDue.toLocaleString()}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-6 pt-6">
                                            <div className="flex flex-col items-center">
                                                <div className="bg-white p-2 rounded-xl shadow-lg border border-black/5">
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=6207708566@jupitera xis%26pn=ABHINAV%20ANAND%26am=${balanceDue}%26cu=INR`}
                                                        alt="Payment QR"
                                                        className="w-[70px] h-[70px] grayscale contrast-125"
                                                        crossOrigin="anonymous"
                                                    />
                                                </div>
                                                <p className="text-[7px] font-black text-gray-400 mt-2 uppercase tracking-widest italic">Scan to pay</p>
                                            </div>
                                            {formData.showSignatory && (
                                                <div className="flex-1 flex flex-col items-center">
                                                    {formData.signatoryImage && (
                                                        <img src={formData.signatoryImage} alt="Signature" className="h-12 object-contain grayscale mix-blend-multiply mb-1" />
                                                    )}
                                                    <div className="w-full border-t-2 border-dashed border-gray-400 text-center pt-2">
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-700 italic">Authorized Signature</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {formData.showFooter && (
                            <footer className="absolute bottom-[12mm] left-[12mm] right-[12mm] h-12 flex items-center px-8 rounded-full text-black shadow-sm" style={{ backgroundColor: `${brandColor}66` }}>
                                <div className="grid grid-cols-5 w-full items-center">
                                    <div className="flex items-center gap-2 col-span-1">
                                        <span className="text-[7px] font-black text-black/50 tracking-[0.2em]">CALL</span>
                                        <p className="text-[9px] font-black tracking-widest uppercase font-bold whitespace-nowrap">+91 93043 72773</p>
                                    </div>
                                    <div className="flex items-center gap-2 justify-center col-span-2 border-x border-black/5 px-4">
                                        <span className="text-[7px] font-black text-black/50 tracking-[0.2em]">EMAIL</span>
                                        <p className="text-[9px] font-black tracking-widest uppercase font-bold whitespace-nowrap">partnership@newbi.live</p>
                                    </div>
                                    <div className="flex items-center gap-2 justify-center col-span-1 border-r border-black/5 pr-4">
                                        <span className="text-[7px] font-black text-black/50 tracking-[0.2em]">WEB</span>
                                        <p className="text-[9px] font-black tracking-widest uppercase font-bold whitespace-nowrap">newbi.live</p>
                                    </div>
                                    <div className="flex justify-end col-span-1 pl-4">
                                        <p className="text-[9px] font-black tracking-[0.1em] uppercase whitespace-nowrap text-black/80 font-bold italic">PAGE {pageIdx + 1} OF {paginatedPages.length}</p>
                                    </div>
                                </div>
                            </footer>
                        )}
                    </div>
                ))}
            </div>
            <AnimatePresence>
                {showAiSettings && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden">
                            <button onClick={() => setShowAiSettings(false)} className="absolute top-6 right-6 p-3 bg-white/5 rounded-xl hover:bg-white/10 border border-white/5 transition-all"><X size={18} /></button>
                            <div className="mb-8">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">AI <span className="text-neon-blue">Protocol.</span></h3>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Configure Generative Intelligence</p>
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Gemini API Key</label>
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-neon-blue/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                        <input type="password" value={aiApiKey} onChange={e => { setAiApiKey(e.target.value); localStorage.setItem('geminiApiKey', e.target.value); }} className="w-full bg-black/40 border border-white/10 focus:border-neon-blue/40 rounded-2xl h-16 px-6 font-mono text-sm outline-none transition-all relative z-10" placeholder="Paste your API key..." />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Intelligence Model</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { id: 'gemini-1.5-flash', label: 'Flash 1.5', desc: 'Speed Optimized' },
                                            { id: 'gemini-2.0-flash-exp', label: 'Flash 2.0', desc: 'Reasoning Focus' }
                                        ].map(m => (
                                            <button key={m.id} onClick={() => { setAiModel(m.id); localStorage.setItem('geminiModel', m.id); }} className={cn("p-4 rounded-2xl border text-left transition-all group", aiModel === m.id ? "bg-neon-blue border-neon-blue text-black" : "bg-black/40 border-white/10 text-gray-400 hover:text-white hover:bg-white/5")}>
                                                <div className="text-[10px] font-black uppercase tracking-widest mb-1">{m.label}</div>
                                                <div className={cn("text-[8px] font-bold uppercase tracking-widest opacity-60", aiModel === m.id ? "text-black" : "text-gray-500 group-hover:text-gray-400")}>{m.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6 bg-neon-blue/5 border border-neon-blue/10 rounded-2xl">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                                        Your API keys are stored locally in your browser. All intelligence processing happens directly via Google Generative AI endpoints.
                                    </p>
                                </div>
                                <button onClick={() => setShowAiSettings(false)} className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-[1.02] transition-all">Confirm Settings</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InvoiceGenerator;
