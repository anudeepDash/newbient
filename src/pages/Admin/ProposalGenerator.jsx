import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, LayoutGrid, Download, RefreshCw, X, FileSpreadsheet, Sparkles, Send, FileText, ArrowLeft } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
// logo import removed to use public path directly

const ProposalGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addProposal, updateProposal, proposals } = useStore();
    const proposalRef = useRef(null);
    const [previewScale, setPreviewScale] = useState(0.65);
    const previewContainerRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth;
                const containerHeight = previewContainerRef.current.clientHeight;
                
                // A4 dimensions at 96dpi are roughly 794x1123
                const scaleWidth = (containerWidth - 80) / 794;
                const scaleHeight = (containerHeight - 80) / 1123;
                
                const newScale = Math.min(1, scaleWidth, scaleHeight);
                setPreviewScale(Math.max(0.4, newScale));
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        
        let observer;
        if (window.ResizeObserver) {
            observer = new ResizeObserver(handleResize);
            if (previewContainerRef.current) {
                observer.observe(previewContainerRef.current);
            }
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (observer) observer.disconnect();
        };
    }, []);

    const [formData, setFormData] = useState({
        senderName: 'Newbi Entertainment & Marketing LLP',
        senderContact: '+91 93043 72773',
        senderEmail: 'partnership@newbi.live',
        clientName: '',
        clientEmail: '',
        proposalNumber: `NBQ-${Math.floor(1000 + Math.random() * 9000).toString().padStart(4, '0')}`,
        date: new Date().toISOString().split('T')[0],
        validUntil: '',
        subject: '',
        overview: '',
        scopeOfWork: '',
        terms: '1. Advance payment of 50% is required to initiate the project.\n2. Balance payment on completion of deliverables.\n3. Taxes as applicable.\n4. Proposal valid for 15 days.',
        status: 'Draft',
        currency: 'INR',
        showGst: true,
        gstRate: 18,
        advanceRequested: 50,
        advancePaid: 0,
        showSignatory: 'none',
        signatoryImage: '',
        showNotes: true,
        showPaymentDetails: true,
        showUPI: false,
        upiId: '6207708566@jupiteraxis',
        qrType: 'auto',
        customQrImage: '',
        showFooter: true,
        showAdvance: true,
        showSignatureBlock: true,
        signatureScale: 1,
        notes: '',
        layoutOrder: [
            { id: 'terms_totals', x: 0, y: 0, scale: 1 },
            { id: 'payment_qr', x: 0, y: 0, scale: 1 },
            { id: 'signatory', x: 0, y: 0, scale: 1 }
        ],
        paymentDetails: `Name: ABHINAV ANAND\nAccount No.: 77780102222341\nIFSC Code: FDRL0007778\nBranch: Neo Banking - Jupiter\nUPI ID: 6207708566@jupiteraxis`
    });

    const [items, setItems] = useState([
        { id: 1, description: 'Influencer Marketing Campaign', qty: 1, unit: 'Campaign', price: 0 }
    ]);

    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (id && proposals.length > 0) {
            const proposal = proposals.find(p => p.id === id);
            if (proposal) {
                setFormData({
                    ...proposal,
                    showNotes: proposal.showNotes !== undefined ? proposal.showNotes : true,
                    showPaymentDetails: proposal.showPaymentDetails !== undefined ? proposal.showPaymentDetails : true,
                    showUPI: proposal.showUPI || false,
                    upiId: proposal.upiId || '6207708566@jupiteraxis',
                    qrType: proposal.qrType || 'auto',
                    customQrImage: proposal.customQrImage || '',
                    showFooter: proposal.showFooter !== undefined ? proposal.showFooter : true,
                    showAdvance: proposal.showAdvance !== undefined ? proposal.showAdvance : true,
                    advancePaid: Number(proposal.advancePaid) || 0,
                    layoutOrder: proposal.layoutOrder?.map(item => {
                        const parsed = typeof item === 'string' ? { id: item, x: 0, y: 0, scale: 1 } : item;
                        if (parsed.id === 'terms_totals') return [{ id: 'terms', x: 0, y: 0, scale: 1 }, { id: 'totals', x: 0, y: 0, scale: 1 }];
                        if (parsed.id === 'payment_qr') return [{ id: 'payment_details', x: 0, y: 0, scale: 1 }, { id: 'payment_qr', x: 0, y: 0, scale: 1 }];
                        return parsed;
                    }).flat() || [
                        { id: 'terms', x: 0, y: 0, scale: 1 },
                        { id: 'totals', x: 0, y: 0, scale: 1 },
                        { id: 'payment_details', x: 0, y: 0, scale: 1 },
                        { id: 'payment_qr', x: 0, y: 0, scale: 1 },
                        { id: 'signatory', x: 0, y: 0, scale: 1 },
                        { id: 'footer', x: 0, y: 0, scale: 1 }
                    ]
                });
                setItems(proposal.items || []);
            }
        }
    }, [id, proposals]);

    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const gstAmount = formData.showGst ? (subtotal * formData.gstRate) / 100 : 0;
    const totalAmount = subtotal + gstAmount;

    // Pagination Logic
    const ROWS_PER_PAGE_P1 = 6; // Less on P1 because of Overview
    const ROWS_PER_PAGE_NEXT = 10;
    
    const getPaginatedPages = () => {
        const pages = [];
        let itemsRemaining = [...items];
        
        // Page 1
        pages.push(itemsRemaining.splice(0, ROWS_PER_PAGE_P1));
        
        // Subsequent pages
        while (itemsRemaining.length > 0) {
            pages.push(itemsRemaining.splice(0, ROWS_PER_PAGE_NEXT));
        }
        
        return pages;
    };

    const paginatedPages = getPaginatedPages();

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), description: '', qty: 1, unit: '', price: 0 }]);
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleSignatoryUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setGenerating(true);
        try {
            const storageRef = ref(storage, `signatories/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setFormData(prev => ({ ...prev, signatoryImage: url }));
        } catch (error) {
            console.error("Signatory Upload Error:", error);
            alert("Failed to upload signature.");
        } finally {
            setGenerating(false);
        }
    };

    const moveLayoutItem = (index, direction) => {
        const newOrder = [...formData.layoutOrder];
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < newOrder.length) {
            [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
            setFormData({ ...formData, layoutOrder: newOrder });
        }
    };

    const updateLayoutPosition = (index, field, value) => {
        const newOrder = [...formData.layoutOrder];
        newOrder[index] = { ...newOrder[index], [field]: parseInt(value) || 0 };
        setFormData({ ...formData, layoutOrder: newOrder });
    };

    const handleSave = async () => {
        setGenerating(true);
        try {
            const data = {
                ...formData,
                items,
                totalAmount,
                subtotal,
                gstAmount,
                createdAt: new Date().toISOString(),
                layoutOrder: formData.layoutOrder
            };

            if (id) {
                await updateProposal(id, data);
            } else {
                await addProposal(data);
            }
            alert("Proposal Saved!");
            navigate('/admin/proposals');
        } catch (error) {
            alert("Save Failed!");
        } finally {
            setGenerating(false);
        }
    };

    const generatePDF = async () => {
        if (!proposalRef.current) return;
        setGenerating(true);

        const originalScale = previewScale;
        setPreviewScale(1);
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageElements = document.querySelectorAll('.proposal-page-render');
            
            for (let i = 0; i < pageElements.length; i++) {
                const canvas = await html2canvas(pageElements[i], {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    backgroundColor: '#F3F4F6'
                });
                
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, '', 'FAST');
            }
            
            pdf.save(`Proposal_${formData.proposalNumber}.pdf`);
        } catch (error) {
            console.error("PDF Gen Error:", error);
            alert("PDF Generation Failed!");
        } finally {
            setPreviewScale(originalScale);
            setGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
             <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                    <div className="space-y-2">
                        <Link to="/admin/proposals" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em] mb-4 group">
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Proposals
                        </Link>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">
                            QUOTATION <span className="text-neon-green px-4">ENGINE.</span>
                        </h1>
                    </div>
                    
                    <div className="flex gap-4">
                        <Button onClick={handleSave} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold uppercase tracking-widest text-xs h-12 px-8 rounded-xl transition-all">
                            <Save className="mr-2 h-4 w-4" /> Save Draft
                        </Button>
                        <Button onClick={generatePDF} className="bg-neon-blue text-black font-black font-heading uppercase tracking-widest text-xs h-12 px-8 rounded-xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                            <Download className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start">
                    {/* Editor Panel */}
                    <div className="space-y-8 h-[calc(100vh-100px)] overflow-y-auto pr-4 scrollbar-hide order-last xl:order-last">
                        <Card className="p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <h3 className="text-xs font-black text-gray-400 tracking-widest uppercase mb-8 flex items-center gap-2 italic">
                                <FileText size={14} className="text-gray-500" /> Proposal Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Proposal ID</label>
                                    <Input value={formData.proposalNumber} onChange={e => setFormData({...formData, proposalNumber: e.target.value})} className="bg-black/60 border-white/10 rounded-xl h-12 font-bold tracking-tight" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Creation Date</label>
                                    <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-black/60 border-white/10 rounded-xl h-12 font-bold" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Client Business Name</label>
                                    <Input value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="bg-black/60 border-white/10 rounded-xl h-12 font-bold" placeholder="e.g. RedBull Global" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Project Subject</label>
                                    <Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="bg-black/60 border-white/10 rounded-xl h-12 font-bold" placeholder="e.g. Campus Activation Q4" />
                                </div>
                                <div className="md:col-span-2 space-y-2 mt-4">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Strategic Notes / Scope</label>
                                    <textarea 
                                        value={formData.notes} 
                                        onChange={e => setFormData({...formData, notes: e.target.value})}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-xs font-medium leading-relaxed min-h-[120px] focus:border-neon-blue/50 outline-none text-white scrollbar-hide"
                                        placeholder="Outline the scope, specific terms, or campaign objectives..."
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <h3 className="text-sm font-black text-neon-blue tracking-widest uppercase mb-8 flex items-center gap-2">
                                <FileSpreadsheet size={16} /> Deliverables & Pricing
                            </h3>
                            <div className="space-y-4">
                                {items.map((item, i) => (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-black/30 p-4 rounded-2xl border border-white/5 items-end">
                                        <div className="md:col-span-5 space-y-2">
                                            <label className="text-[10px] font-black text-gray-600 uppercase">Service Detail</label>
                                            <Input value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="bg-black border-white/10 h-10 text-xs" />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-gray-600 uppercase">Qty</label>
                                            <Input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)} className="bg-black border-white/10 h-10 text-xs" />
                                        </div>
                                        <div className="md:col-span-3 space-y-2">
                                            <label className="text-[10px] font-black text-gray-600 uppercase">Unit Price</label>
                                            <Input type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', parseInt(e.target.value) || 0)} className="bg-black border-white/10 h-10 text-xs" />
                                        </div>
                                        <div className="md:col-span-2 flex justify-end">
                                            <button onClick={() => handleRemoveItem(item.id)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <Button onClick={handleAddItem} variant="outline" className="w-full border-dashed border-white/10 py-6 rounded-2xl text-gray-500 hover:text-white hover:bg-white/5">
                                    <Plus className="mr-2" size={16} /> Add Service Row
                                </Button>
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                <div className="flex justify-between items-center text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em]">
                                    <span>Subtotal</span>
                                    <span className="text-white text-lg">₹{subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em]">GST (18%)</span>
                                        <input type="checkbox" checked={formData.showGst} onChange={e => setFormData({...formData, showGst: e.target.checked})} className="accent-neon-blue" />
                                    </div>
                                    <span className="text-white text-lg">₹{gstAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                    <span className="text-neon-blue font-black uppercase text-xs tracking-[0.3em]">Total Investment</span>
                                    <span className="text-white text-3xl font-black font-heading tracking-tighter italic">₹{totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest pl-1">Advance Paid</label>
                                        <Input type="number" value={formData.advancePaid} onChange={e => setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })} className="bg-black/40 border-white/5 h-8 text-[10px] font-bold" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest pr-1">Balance Due</p>
                                        <p className="text-lg font-black text-neon-green italic leading-none mt-1">₹{(totalAmount - (Number(formData.advancePaid) || 0)).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] space-y-6">
                            <h3 className="text-sm font-black text-neon-blue tracking-widest uppercase mb-4 flex items-center gap-2">
                                <Sparkles size={16} /> Branding & Controls
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase pl-1">Signatory Style</label>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => setFormData({ ...formData, showSignatory: 'none' })}
                                            className={cn("flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all", formData.showSignatory === 'none' ? "bg-white text-black border-white" : "bg-black/50 text-gray-500 border-white/5")}
                                        >
                                            Default
                                        </button>
                                        <button 
                                            onClick={() => setFormData({ ...formData, showSignatory: 'none' })}
                                            className={cn("flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all", formData.showSignatory === 'text' ? "bg-white text-black border-white" : "bg-black/50 text-gray-500 border-white/5")}
                                        >
                                            Plain Text
                                        </button>
                                        <button 
                                            onClick={() => setFormData({ ...formData, showSignatory: 'image' })}
                                            className={cn("flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all", formData.showSignatory === 'image' ? "bg-white text-black border-white" : "bg-black/50 text-gray-500 border-white/5")}
                                        >
                                            Digital Signature
                                        </button>
                                    </div>
                                    {formData.showSignatory === 'image' && (
                                        <div className="space-y-4">
                                            {formData.signatoryImage ? (
                                                <div className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/50 flex items-center justify-center">
                                                    <img src={formData.signatoryImage} alt="Signature" className="max-h-full p-4" />
                                                    <button onClick={() => setFormData({ ...formData, signatoryImage: '' })} className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <input type="file" onChange={handleSignatoryUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                                    <div className="h-24 bg-black/50 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-white hover:border-white/30 transition-all">
                                                        <Plus size={20} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Upload Signature</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 border-t border-white/5 pt-6">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase pl-1">Strategic Config</label>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex-1 min-w-[140px] flex items-center gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                                            <input type="checkbox" checked={formData.showNotes} onChange={e => setFormData({ ...formData, showNotes: e.target.checked })} className="w-4 h-4 accent-neon-blue rounded" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notes</span>
                                        </div>
                                        <div className="flex-1 min-w-[140px] flex items-center gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                                            <input type="checkbox" checked={formData.showPaymentDetails} onChange={e => setFormData({ ...formData, showPaymentDetails: e.target.checked })} className="w-4 h-4 accent-neon-blue rounded" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Banking</span>
                                        </div>
                                        <div className="flex-1 min-w-[140px] flex items-center gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                                            <input type="checkbox" checked={formData.showUPI} onChange={e => setFormData({ ...formData, showUPI: e.target.checked })} className="w-4 h-4 accent-neon-blue rounded" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">UPI QR</span>
                                        </div>
                                        <div className="flex-1 min-w-[140px] flex items-center gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                                            <input type="checkbox" checked={formData.showFooter} onChange={e => setFormData({ ...formData, showFooter: e.target.checked })} className="w-4 h-4 accent-neon-blue rounded" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Footer Pill</span>
                                        </div>
                                        <div className="flex-1 min-w-[140px] flex items-center gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                                            <input type="checkbox" checked={formData.showAdvance} onChange={e => setFormData({ ...formData, showAdvance: e.target.checked })} className="w-4 h-4 accent-neon-blue rounded" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Advance Row</span>
                                        </div>
                                        <div className="flex-1 min-w-[140px] flex items-center gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                                            <input type="checkbox" checked={formData.showSignatureBlock} onChange={e => setFormData({ ...formData, showSignatureBlock: e.target.checked })} className="w-4 h-4 accent-neon-blue rounded" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sign Block</span>
                                        </div>
                                    </div>
                                </div>

                                {formData.showUPI && (
                                    <div className="p-6 bg-black/30 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => setFormData({ ...formData, qrType: 'auto' })}
                                                className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", formData.qrType === 'auto' ? "bg-neon-blue text-black" : "bg-white/5 text-gray-500")}
                                            >
                                                Dynamic UPI
                                            </button>
                                            <button 
                                                onClick={() => setFormData({ ...formData, qrType: 'custom' })}
                                                className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", formData.qrType === 'custom' ? "bg-neon-blue text-black" : "bg-white/5 text-gray-500")}
                                            >
                                                Custom QR
                                            </button>
                                        </div>
                                        {formData.qrType === 'auto' ? (
                                            <Input value={formData.upiId} onChange={e => setFormData({ ...formData, upiId: e.target.value })} placeholder="Enter UPI ID" className="bg-black border-white/10 h-10 text-[10px]" />
                                        ) : (
                                            <div className="relative">
                                                <input type="file" onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (!file) return;
                                                    setGenerating(true);
                                                    try {
                                                        const storageRef = ref(storage, `qr_codes/${Date.now()}_${file.name}`);
                                                        await uploadBytes(storageRef, file);
                                                        const url = await getDownloadURL(storageRef);
                                                        setFormData(prev => ({ ...prev, customQrImage: url }));
                                                    } finally {
                                                        setGenerating(false);
                                                    }
                                                }} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                                <div className="h-14 bg-black/50 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 text-gray-500 overflow-hidden">
                                                    {formData.customQrImage ? <img src={formData.customQrImage} className="h-full object-contain" /> : <><Plus size={14} /><span className="text-[10px] font-black">Upload QR Image</span></>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                 )}

                                <div className="space-y-4 border-t border-white/5 pt-6">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase pl-1">Document Layout Priority & Position</label>
                                    <div className="space-y-4">
                                        {formData.layoutOrder.map((item, idx) => (
                                            <div key={item.id} className="bg-black/30 p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-all space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-white/40 group-hover:text-white/60 transition-colors bg-white/5 w-6 h-6 rounded-lg flex items-center justify-center italic">{idx + 1}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                                                        {item.id === 'terms_totals' ? 'Terms & Totals' : item.id === 'payment_qr' ? 'Payment & QR' : item.id === 'signatory' ? 'Signatory & Seal' : 'Footer Pill'}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button 
                                                            onClick={() => moveLayoutItem(idx, -1)} 
                                                            disabled={idx === 0}
                                                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white disabled:opacity-20 transition-all font-bold"
                                                        >
                                                            <svg className="w-3 h-3 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                                        </button>
                                                        <button 
                                                            onClick={() => moveLayoutItem(idx, 1)} 
                                                            disabled={idx === formData.layoutOrder.length - 1}
                                                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white disabled:opacity-20 transition-all font-bold"
                                                        >
                                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-4 pt-2 border-t border-white/5">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">X Offset</span>
                                                            <span className="text-[10px] font-black text-neon-blue">{item.x}px</span>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <input 
                                                                type="range" 
                                                                min="-200" 
                                                                max="200" 
                                                                value={item.x} 
                                                                onChange={(e) => updateLayoutPosition(idx, 'x', e.target.value)}
                                                                className="flex-1 accent-neon-blue h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                            <input 
                                                                type="number" 
                                                                value={item.x} 
                                                                onChange={(e) => updateLayoutPosition(idx, 'x', e.target.value)}
                                                                className="w-12 bg-black/40 border border-white/5 rounded-lg h-6 text-[10px] font-bold text-center text-neon-blue outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Y Offset</span>
                                                            <span className="text-[10px] font-black text-neon-green">{item.y}px</span>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <input 
                                                                type="range" 
                                                                min="-500" 
                                                                max="500" 
                                                                value={item.y} 
                                                                onChange={(e) => updateLayoutPosition(idx, 'y', e.target.value)}
                                                                className="flex-1 accent-neon-green h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                            <input 
                                                                type="number" 
                                                                value={item.y} 
                                                                onChange={(e) => updateLayoutPosition(idx, 'y', e.target.value)}
                                                                className="w-12 bg-black/40 border border-white/5 rounded-lg h-6 text-[10px] font-bold text-center text-neon-green outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Scale</span>
                                                            <span className="text-[10px] font-black text-neon-pink">{(item.scale || 1).toFixed(2)}x</span>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <input 
                                                                type="range" 
                                                                min="0.5" 
                                                                max="1.5" 
                                                                step="0.05"
                                                                value={item.scale || 1} 
                                                                onChange={(e) => updateLayoutPosition(idx, 'scale', e.target.value)}
                                                                className="flex-1 accent-neon-pink h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                            <input 
                                                                type="number" 
                                                                step="0.1"
                                                                value={item.scale || 1} 
                                                                onChange={(e) => updateLayoutPosition(idx, 'scale', e.target.value)}
                                                                className="w-12 bg-black/40 border border-white/5 rounded-lg h-6 text-[10px] font-bold text-center text-neon-pink outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[8px] font-bold text-gray-600 uppercase italic pl-1 text-center mt-4">Drag limits do not apply; use offsets for pixel-perfect alignment</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <h3 className="text-sm font-black text-neon-blue tracking-widest uppercase mb-8">Strategic Content</h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Executive Overview</label>
                                    <textarea 
                                        value={formData.overview} 
                                        onChange={e => setFormData({...formData, overview: e.target.value})}
                                        className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 text-xs font-medium leading-relaxed min-h-[120px] focus:border-neon-blue/50 outline-none"
                                        placeholder="Summarize the project goals and Newbi's role..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Scope & Deliverables</label>
                                    <textarea 
                                        value={formData.scopeOfWork} 
                                        onChange={e => setFormData({...formData, scopeOfWork: e.target.value})}
                                        className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 text-xs font-medium leading-relaxed min-h-[150px] focus:border-neon-blue/50 outline-none"
                                        placeholder="List specific services, dates, and student outreach targets..."
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Live Preview */}
                    <div ref={previewContainerRef} className="bg-[#050505] rounded-[2.5rem] p-8 overflow-y-auto relative flex flex-col items-center h-[calc(100vh-100px)] sticky top-8 border border-white/5 custom-scrollbar order-first xl:order-first">
                        <div className="absolute top-6 right-6 z-20 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-widest">Strategic Twin</div>
                        
                        <div className="flex flex-col gap-8 py-8 origin-top" style={{ transform: `scale(${previewScale})` }}>
                            {paginatedPages.map((pageItems, pageIdx) => {
                                const isLastPage = pageIdx === paginatedPages.length - 1;
                                const isFirstPage = pageIdx === 0;
                                
                                return (
                                    <div 
                                        key={pageIdx}
                                        className="proposal-page-render w-[794px] h-[1123px] bg-[#E5E7EB] text-black p-[12mm] relative overflow-hidden flex flex-col justify-between shrink-0 shadow-2xl"
                                        style={{ fontFamily: 'Inter, sans-serif' }}
                                    >
                                        <div className="pb-32 relative z-10">
                                            {/* Header - Only on Page 1 */}
                                            {isFirstPage ? (
                                                <div className="flex justify-between items-start mb-10 relative z-10">
                                                    <div className="flex items-center gap-4">
                                                        <img src="/logo_document.png" alt="Newbi Logo" className="w-[180px] object-contain" />
                                                    </div>
                                                    <div className="text-right">
                                                        <h2 className="text-4xl font-black text-gray-500 tracking-tighter uppercase mb-0">#{formData.proposalNumber}</h2>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">PROPOSAL ID</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                                                    <img src="/logo_document.png" alt="Newbi Logo" className="w-[100px] object-contain opacity-50" />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Proposal #{formData.proposalNumber} — Page {pageIdx + 1}</p>
                                                </div>
                                            )}

                                            {/* Info Blocks - Only on Page 1 */}
                                            {isFirstPage && (
                                                <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
                                                    <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                        <div className="bg-[#39FF14]/40 px-6 py-2">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">PREPARED BY</h4>
                                                        </div>
                                                        <div className="p-6 space-y-2">
                                                            <p className="text-xl font-bold">{formData.senderName}</p>
                                                            <div className="text-xs text-gray-600 font-medium space-y-1">
                                                                <p>Cluster: {formData.senderContact}</p>
                                                                <p>Email: {formData.senderEmail}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                        <div className="bg-[#39FF14]/40 px-6 py-2">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">PREPARED FOR</h4>
                                                        </div>
                                                        <div className="p-6 space-y-2">
                                                            <p className="text-xl font-bold uppercase">{formData.clientName || 'CLIENT NAME'}</p>
                                                            <div className="text-xs text-gray-600 font-medium space-y-1">
                                                                <p>Date: {new Date(formData.date).toLocaleDateString('en-GB')}</p>
                                                                <p className="italic">{formData.subject || 'Strategic Marketing Solution'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Strategy Section - Only on Page 1 */}
                                            {isFirstPage && (
                                                <div className="mb-8 relative z-10">
                                                    <div className="bg-white/30 rounded-2xl border border-gray-200 overflow-hidden">
                                                        <div className="bg-[#39FF14]/40 px-6 py-2">
                                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-black">EXECUTIVE OVERVIEW</h3>
                                                        </div>
                                                        <div className="p-6">
                                                            <p className="text-xs font-medium leading-relaxed text-gray-700 whitespace-pre-line text-justify">
                                                                {formData.overview || 'Strategic value proposition and high-impact outreach plan...'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Table */}
                                            <div className={cn("mb-8 relative z-10", !isFirstPage && "mt-4")}>
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-[#39FF14]/40 text-black">
                                                            <th className="py-3 px-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-black/5">DELIVERABLE DESCRIPTION</th>
                                                            <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">QTY</th>
                                                            <th className="py-3 px-6 text-right text-[10px] font-black uppercase tracking-widest">INVESTMENT</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-300 border-b border-gray-300">
                                                        {pageItems.map((item, idx) => (
                                                            <tr key={idx} className="bg-white/20">
                                                                <td className="py-4 px-6 text-xs font-bold uppercase border-r border-dashed border-gray-400">{item.description || "CAMPAIGN ACTIVATION"}</td>
                                                                <td className="py-4 px-4 text-center text-xs font-black border-r border-dashed border-gray-400">{item.qty}</td>
                                                                <td className="py-4 px-6 text-right text-xs font-black">₹{item.price.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                             {/* Totals Section & Left Details - Only on Last Page */}
                                             {isLastPage && (
                                                <div className="mt-8 grid grid-cols-2 gap-y-8 gap-x-12 relative z-10 w-full items-start">
                                                    {formData.layoutOrder.map((item) => {
                                                        const sectionId = typeof item === 'string' ? item : item.id;
                                                        const x = item.x || 0;
                                                        const y = item.y || 0;
                                                        const s = item.scale || 1;
                                                        const style = { transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: 'top left' };

                                                        if (sectionId === 'terms') {
                                                            return formData.showNotes !== false && (
                                                                <div key="terms" style={style} className="col-start-1 row-start-1 w-full relative">
                                                                    <div className="bg-white/20 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                                        <div className="bg-[#39FF14]/40 px-4 py-1.5 border-b border-black/10">
                                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">TERMS & CONDITIONS</h4>
                                                                        </div>
                                                                        <div className="p-4">
                                                                            <p className="text-[9px] font-bold leading-relaxed text-gray-500 whitespace-pre-line tracking-wide">
                                                                                {formData.terms || "Standard terms apply."}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        if (sectionId === 'totals') {
                                                            return (
                                                                <div key="totals" style={style} className="col-start-2 row-start-1 w-full relative">
                                                                    <div className="w-full space-y-3">
                                                                        <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                            <span>SUBTOTAL</span>
                                                                            <span className="text-black text-xs font-bold font-heading italic">₹{subtotal.toLocaleString()}</span>
                                                                        </div>
                                                                        {formData.showGst && (
                                                                            <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">
                                                                                <span>GST ({formData.gstRate}%)</span>
                                                                                <span className="text-black text-xs font-bold font-heading italic">₹{gstAmount.toLocaleString()}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex justify-between items-center py-3 bg-[#39FF14]/40 px-4 text-black border border-black/5 mt-2 rounded-xl">
                                                                            <span className="text-[10px] font-black uppercase italic">TOTAL INVESTMENT</span>
                                                                            <span className="text-xl font-black italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                                                        </div>
                                                                        {formData.showAdvance !== false && (
                                                                            <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                                                                <span>ADVANCE PAID</span>
                                                                                <span className="text-black text-xs font-bold font-heading italic">₹{formData.advancePaid.toLocaleString()}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex justify-between items-center py-4 bg-[#39FF14]/40 px-6 text-black border border-black/10 rounded-2xl shadow-xl mt-4">
                                                                            <span className="text-[12px] font-black uppercase italic">BALANCE DUE</span>
                                                                            <span className="text-3xl font-black italic tracking-tighter">₹{(totalAmount - formData.advancePaid).toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        if (sectionId === 'payment_details') {
                                                            return formData.showPaymentDetails && (
                                                                <div key="payment_details" style={style} className="col-start-1 row-start-2 w-full pt-4 border-t border-gray-300/50 relative">
                                                                    <div className="p-6 border-2 border-dashed border-gray-300 rounded-[2rem] text-[10px] font-bold text-left uppercase leading-relaxed text-gray-500 bg-white/40 shadow-sm w-full">
                                                                        <p className="text-xs font-black text-black mb-3 border-b-2 border-[#39FF14] pb-1.5 inline-block">PAYMENT DETAILS</p>
                                                                        <div className="whitespace-pre-line tracking-wide">
                                                                            {formData.paymentDetails}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        if (sectionId === 'payment_qr') {
                                                            return formData.showUPI && (
                                                                <div key="payment_qr" style={style} className="col-start-2 row-start-2 w-full flex justify-end shrink-0 pt-4 border-t border-gray-300/50 relative">
                                                                    <div className="bg-white p-3 rounded-2xl border border-gray-200 inline-block shadow-sm shrink-0 mb-4">
                                                                        {formData.qrType === 'auto' ? (
                                                                            <img
                                                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${formData.upiId}&pn=NEWBI&am=${totalAmount}&cu=INR`)}`}
                                                                                alt="Payment QR"
                                                                                className="w-[100px] h-[100px] grayscale contrast-125 mx-auto"
                                                                            />
                                                                        ) : formData.customQrImage ? (
                                                                            <img
                                                                                src={formData.customQrImage}
                                                                                alt="Custom QR"
                                                                                className="w-[100px] h-[100px] object-contain grayscale contrast-125 mx-auto"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-[100px] h-[100px] flex items-center justify-center bg-gray-100 rounded-lg text-[6px] font-black text-gray-400 mx-auto uppercase">No QR</div>
                                                                        )}
                                                                        <p className="text-[8px] font-black text-center mt-2 text-gray-400 tracking-widest uppercase italic font-bold">SCAN TO PAY</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        if (sectionId === 'signatory') {
                                                            return formData.showSignatureBlock !== false && (
                                                                <div key="signatory" style={style} className="col-start-2 row-start-3 w-full flex justify-end mt-4 relative">
                                                                    <div className="flex flex-col items-end text-right w-[200px]">
                                                                        {formData.showNotes && formData.notes && (
                                                                            <div className="text-[8px] font-bold text-gray-400 uppercase italic max-w-[250px] leading-relaxed mb-4 text-left mr-auto">
                                                                                * {formData.notes.substring(0, 100)}...
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-col items-end">
                                                                            {formData.showSignatory === 'image' && formData.signatoryImage ? (
                                                                                <img src={formData.signatoryImage} alt="Signature" className="h-16 mb-2 object-contain grayscale mix-blend-multiply" />
                                                                            ) : formData.showSignatory === 'text' ? (
                                                                                <div className="h-16 flex items-end justify-center">
                                                                                    <p className="font-heading italic text-lg leading-none border-b border-gray-400 pb-1 px-4">{formData.senderName || 'Authorized Signatory'}</p>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="h-16" />
                                                                            )}
                                                                            {formData.showSignatory !== 'none' && (
                                                                                <div className="w-48 pt-4 border-t border-gray-400 text-center">
                                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-700">Authorized Signature</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        return null;
                                                      })}
                                                  </div>
                                             )}

                                        </div>
                                        {/* Footer Pill - Move slightly higher for safety */}
                                        {formData.showFooter && (
                                            <footer
                                                className="absolute bottom-6 left-10 right-10 h-10 flex items-center justify-between px-10 overflow-hidden rounded-full border border-black/5 shadow-xl backdrop-blur-md z-50"
                                                style={{
                                                    transform: `translate(${(formData.layoutOrder.find(i => (typeof i === 'object' ? i.id : i) === 'footer') || {}).x || 0}px, ${(formData.layoutOrder.find(i => (typeof i === 'object' ? i.id : i) === 'footer') || {}).y || 0}px)`
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-[#39FF14]/40" />
                                                <div className="relative z-10 flex items-center justify-between w-full text-black">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">CALL</span>
                                                        <p className="text-[10px] font-black tracking-widest uppercase">+91 93043 72773</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 border-x border-black/5 px-10 h-10">
                                                        <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">EMAIL</span>
                                                        <p className="text-[10px] font-black tracking-widest uppercase">partnership@newbi.live</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">WEB</span>
                                                        <p className="text-[10px] font-black tracking-widest uppercase">newbi.live</p>
                                                    </div>
                                                </div>
                                            </footer>
                                        )}
                                    </div>
                                );
                            })
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProposalGenerator;
