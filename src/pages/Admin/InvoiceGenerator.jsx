import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Download, RefreshCw, X, FileText, FileSpreadsheet, Sparkles, Users } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../../lib/utils';
import logo from '../../assets/logo.png';

const InvoiceGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addInvoice, updateInvoice, invoices } = useStore();
    const invoiceRef = useRef(null);
    const [previewScale, setPreviewScale] = useState(0.65);
    const previewContainerRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth;
                // 794 is approx 210mm. Subtract padding (e.g. 64px) to ensure no overflow
                const newScale = Math.min(1, (containerWidth - 64) / 794);
                setPreviewScale(Math.max(0.3, newScale));
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

    const [customColumns, setCustomColumns] = useState([]);
    const [formData, setFormData] = useState({
        senderName: 'NewBi Entertainment',
        senderContact: '+91 93043 72773',
        senderEmail: 'partnership@newbi.live',
        senderPan: 'ETXPA9107A',
        senderGst: '',
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
        showGst: false,
        gstPercentage: 18,
        showFooter: true
    });

    const [items, setItems] = useState([
        { id: 1, description: '', customValues: {}, qty: 1, price: 0 }
    ]);

    const [generating, setGenerating] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');

    useEffect(() => {
        if (id && invoices.length > 0) {
            const invoice = invoices.find(inv => inv.id === id);
            if (invoice) {
                setFormData({
                    senderName: invoice.senderName || '',
                    senderContact: invoice.senderContact || '',
                    senderEmail: invoice.senderEmail || '',
                    senderPan: invoice.senderPan || '',
                    senderGst: invoice.senderGst || '',
                    clientName: invoice.clientName || '',
                    clientAddress: invoice.clientAddress || '',
                    clientGst: invoice.clientGst || '',
                    invoiceNumber: invoice.invoiceNumber || '',
                    invoiceDate: invoice.issueDate || '',
                    dueDate: invoice.dueDate || '',
                    advancePaid: Number(invoice.advancePaid) || 0,
                    note: invoice.note || '',
                    paymentDetails: invoice.paymentDetails || '',
                    showSignatory: invoice.showSignatory || 'text',
                    signatoryImage: invoice.signatoryImage || '',
                    showNotes: invoice.showNotes !== undefined ? invoice.showNotes : true,
                    showPaymentDetails: invoice.showPaymentDetails !== undefined ? invoice.showPaymentDetails : true,
                    showUPI: invoice.showUPI || false,
                    upiId: invoice.upiId || '6207708566@jupiteraxis',
                    qrType: invoice.qrType || 'auto',
                    customQrImage: invoice.customQrImage || '',
                    showGst: invoice.showGst || false,
                    gstPercentage: invoice.gstPercentage || 18,
                    showFooter: invoice.showFooter !== undefined ? invoice.showFooter : true
                });
                setItems(invoice.items || []);
                setCustomColumns(invoice.customColumns || []);
            }
        }
    }, [id, invoices]);

    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const gstAmount = formData.showGst ? (subtotal * formData.gstPercentage) / 100 : 0;
    const totalAmount = subtotal + gstAmount;
    const toBePaid = totalAmount - formData.advancePaid;

    const handleAddColumn = () => {
        if (!newColumnName.trim()) return;
        const newColId = `col_${Date.now()}`;
        setCustomColumns([...customColumns, { id: newColId, label: newColumnName }]);
        setNewColumnName('');
    };

    const handleRemoveColumn = (colId) => {
        setCustomColumns(customColumns.filter(col => col.id !== colId));
        setItems(items.map(item => {
            const newCustomValues = { ...item.customValues };
            delete newCustomValues[colId];
            return { ...item, customValues: newCustomValues };
        }));
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), description: '', customValues: {}, qty: 1, price: 0 }]);
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

    const handleCustomValueChange = (itemId, colId, value) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                return { ...item, customValues: { ...item.customValues, [colId]: value } };
            }
            return item;
        }));
    };

    const generatePDF = async () => {
        if (!invoiceRef.current) return null;
        setGenerating(true);

        const originalScale = previewScale;
        setPreviewScale(1);
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for scale reset to apply

        try {
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#F3F4F6',
                onclone: (clonedDoc) => clonedDoc.fonts?.ready
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
            return pdf;
        } catch (error) {
            console.error("PDF Gen Error:", error);
            return null;
        } finally {
            setPreviewScale(originalScale);
            setGenerating(false);
        }
    };

    const handleDownload = async () => {
        const pdf = await generatePDF();
        if (pdf) pdf.save(`Newbi_INV-${formData.invoiceNumber}.pdf`);
    };

    const handleSaveToDB = async () => {
        setGenerating(true);
        try {
            const cleanItems = items.map(item => ({
                ...item,
                qty: Number(item.qty) || 0,
                price: Number(item.price) || 0
            }));

            const newInvoice = {
                invoiceNumber: formData.invoiceNumber,
                clientName: formData.clientName || 'Unknown Client',
                clientAddress: formData.clientAddress || '',
                clientGst: formData.clientGst || '',
                issueDate: formData.invoiceDate,
                amount: totalAmount,
                status: (totalAmount > 0 && toBePaid <= 0) ? 'Paid' : 'Pending',
                pdfUrl: '',
                items: cleanItems,
                customColumns: customColumns || [],
                note: formData.note || '',
                paymentDetails: formData.paymentDetails || '',
                advancePaid: Number(formData.advancePaid) || 0,
                dueDate: formData.dueDate || '',
                senderName: formData.senderName,
                senderContact: formData.senderContact,
                senderEmail: formData.senderEmail,
                senderPan: formData.senderPan,
                senderGst: formData.senderGst,
                createdAt: new Date().toISOString(),
                showSignatory: formData.showSignatory,
                signatoryImage: formData.signatoryImage,
                showNotes: formData.showNotes,
                showPaymentDetails: formData.showPaymentDetails,
                showUPI: formData.showUPI,
                upiId: formData.upiId,
                showGst: formData.showGst,
                gstPercentage: formData.gstPercentage
            };

            if (id) {
                await updateInvoice(id, newInvoice);
            } else {
                await addInvoice(newInvoice);
            }
            navigate('/admin/invoices');
        } catch (error) {
            console.error("SAVE ERROR:", error);
            alert("Error saving invoice.");
        } finally {
            setGenerating(false);
        }
    };

    const handleQrUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, customQrImage: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleReset = () => {
        if (window.confirm("Start a new invoice?")) {
            setFormData(prev => ({
                ...prev,
                clientName: '',
                clientAddress: '',
                clientGst: '',
                invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
                invoiceDate: new Date().toISOString().split('T')[0],
                dueDate: '',
                advancePaid: 0,
                note: '',
                showSignatory: 'none',
                signatoryImage: '',
                showNotes: true,
                showPaymentDetails: true,
                showUPI: false,
                showGst: false,
            }));
            setItems([{ id: Date.now(), description: '', customValues: {}, qty: 1, price: 0 }]);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden pb-20">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-[1800px] mx-auto px-6 pt-32">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
                    <div className="space-y-2">
                        <Link to="/admin/invoices" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest mb-4">
                            <ArrowLeft size={14} /> Back to Hub
                        </Link>
                        <h1 className="text-4xl lg:text-5xl font-black font-heading tracking-tighter uppercase italic">
                            INVOICE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white">ENGINE.</span>
                        </h1>
                    </div>
                    <div className="flex gap-4">
                        <Button onClick={handleSaveToDB} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold uppercase tracking-widest text-xs h-12 px-8 rounded-xl transition-all" disabled={generating}>
                            {generating ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />} Save Invoice
                        </Button>
                        <Button onClick={handleDownload} className="bg-neon-green text-black font-black font-heading uppercase tracking-widest text-xs h-12 px-8 rounded-xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(57,255,20,0.2)]" disabled={generating}>
                            <Download className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                    <div className="space-y-8 h-[calc(100vh-250px)] overflow-y-auto pr-4 scrollbar-hide custom-scrollbar">
                        <Card className="p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <h3 className="text-sm font-black text-neon-green tracking-widest uppercase mb-8 flex items-center gap-2">
                                <Sparkles size={16} /> Sender Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Company / Entity Name</label>
                                    <Input value={formData.senderName} onChange={e => setFormData({ ...formData, senderName: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="Organization Name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Authorized Contact</label>
                                    <Input value={formData.senderContact} onChange={e => setFormData({ ...formData, senderContact: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="+91 XXX XXX XXXX" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Business Email</label>
                                    <Input value={formData.senderEmail} onChange={e => setFormData({ ...formData, senderEmail: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="admin@business.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">PAN / Tax Identifier</label>
                                    <Input value={formData.senderPan} onChange={e => setFormData({ ...formData, senderPan: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="Tax Registration ID" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">GST Registration Number</label>
                                    <Input value={formData.senderGst} onChange={e => setFormData({ ...formData, senderGst: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="Leave empty if not applicable" />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <h3 className="text-sm font-black text-neon-blue tracking-widest uppercase mb-8 flex items-center gap-2">
                                <Users size={16} /> Client Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Client Business Name</label>
                                    <Input value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="e.g. Acme Corp" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Billing Address</label>
                                    <Input value={formData.clientAddress} onChange={e => setFormData({ ...formData, clientAddress: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="City, State, ZIP" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Client Tax ID / GSTIN</label>
                                    <Input value={formData.clientGst} onChange={e => setFormData({ ...formData, clientGst: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="Tax Authorization ID" />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <h3 className="text-xs font-black text-gray-400 tracking-widest uppercase mb-8 flex items-center gap-2 italic">
                                <FileText size={14} className="text-gray-500" /> Invoice Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Invoice ID</label>
                                    <Input value={formData.invoiceNumber} onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })} className="bg-black/60 border-white/10 rounded-xl h-12 font-bold tracking-tight" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Issuance Date</label>
                                    <Input type="date" value={formData.invoiceDate} onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })} className="bg-black/60 border-white/10 rounded-xl h-12 font-bold" />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-sm font-black text-gray-400 tracking-widest uppercase flex items-center gap-2">
                                    <FileSpreadsheet size={16} /> Line Items
                                </h3>
                                <Button size="sm" variant="outline" onClick={handleAddItem} className="border-white/10 text-[10px] font-black tracking-widest uppercase h-9 rounded-xl hover:bg-white/5 px-4"><Plus size={14} className="mr-2" /> Add Row</Button>
                            </div>
                            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 mb-8">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {customColumns.map(col => (
                                        <div key={col.id} className="bg-white/5 text-gray-400 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 border border-white/10">
                                            {col.label} <button onClick={() => handleRemoveColumn(col.id)}><X size={10} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input placeholder="Custom Column" value={newColumnName} onChange={e => setNewColumnName(e.target.value)} className="h-10 bg-black/50 text-xs rounded-xl" />
                                    <Button size="sm" onClick={handleAddColumn} className="bg-white/5 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest">Add</Button>
                                </div>
                            </div>
                            <div className="space-y-6">
                                {items.map((item) => (
                                    <div key={item.id} className="bg-black/30 p-6 rounded-[2rem] border border-white/5">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                            <div className="md:col-span-5 space-y-2">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Description</label>
                                                <Input value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="bg-black/50 h-12 text-xs rounded-xl" />
                                            </div>
                                            {customColumns.map(col => (
                                                <div key={col.id} className="md:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{col.label}</label>
                                                    <Input value={item.customValues[col.id] || ''} onChange={e => handleCustomValueChange(item.id, col.id, e.target.value)} className="bg-black/50 h-12 text-xs rounded-xl" />
                                                </div>
                                            ))}
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Qty</label>
                                                <Input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)} className="bg-black/50 h-12 text-xs rounded-xl text-center" />
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Price</label>
                                                <Input type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)} className="bg-black/50 h-12 text-xs rounded-xl" />
                                            </div>
                                            <div className="md:col-span-1 flex justify-end">
                                                <button onClick={() => handleRemoveItem(item.id)} className="p-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="p-8 bg-zinc-900/40 border-white/5 rounded-[2.5rem] space-y-6">
                            <h3 className="text-sm font-black text-gray-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                                <Sparkles size={16} className="text-neon-green" /> Branding & Controls
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

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Financial Options</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-1">Advance Paid</label>
                                            <Input type="number" value={formData.advancePaid} onChange={e => setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })} className="bg-black/50 border-white/5 h-12 rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-1">GST Percentage (%)</label>
                                            <Input type="number" value={formData.gstPercentage} onChange={e => setFormData({ ...formData, gstPercentage: parseFloat(e.target.value) || 0 })} className="h-12 bg-black/50 border-white/5 rounded-xl" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 border-t border-white/5 pt-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase pl-1">Additional Notes</label>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={formData.showNotes} onChange={e => setFormData({ ...formData, showNotes: e.target.checked })} className="w-3 h-3 accent-neon-green" />
                                            <span className="text-[8px] font-bold text-gray-500 uppercase">Visible</span>
                                        </div>
                                    </div>
                                    <textarea 
                                        value={formData.note} 
                                        onChange={e => setFormData({ ...formData, note: e.target.value })} 
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm min-h-[100px] text-white focus:outline-none focus:border-neon-green transition-all"
                                        placeholder="Add terms, conditions or special notes..."
                                    />
                                </div>

                                <div className="space-y-4 border-t border-white/5 pt-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase pl-1">Payment Details</label>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={formData.showPaymentDetails} onChange={e => setFormData({ ...formData, showPaymentDetails: e.target.checked })} className="w-3 h-3 accent-neon-green" />
                                            <span className="text-[8px] font-bold text-gray-500 uppercase">Visible</span>
                                        </div>
                                    </div>
                                    <textarea 
                                        value={formData.paymentDetails} 
                                        onChange={e => setFormData({ ...formData, paymentDetails: e.target.value })} 
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-xs font-mono min-h-[100px] text-white focus:outline-none focus:border-neon-green transition-all"
                                        placeholder="Enter bank account / UPI details..."
                                    />
                                </div>

                                <div className="space-y-4 border-t border-white/5 pt-6">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase pl-1">Digital QR Config</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1 flex items-center gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                                            <input type="checkbox" checked={formData.showUPI} onChange={e => setFormData({ ...formData, showUPI: e.target.checked })} className="w-4 h-4 accent-neon-green rounded" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">UPI QR CODE</span>
                                        </div>
                                        <div className="flex-1 flex items-center gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                                            <input type="checkbox" checked={formData.showGst} onChange={e => setFormData({ ...formData, showGst: e.target.checked })} className="w-4 h-4 accent-neon-green rounded" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">TAX (GST)</span>
                                        </div>
                                        <div className="flex-1 flex items-center gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                                            <input type="checkbox" checked={formData.showFooter} onChange={e => setFormData({ ...formData, showFooter: e.target.checked })} className="w-4 h-4 accent-neon-green rounded" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">FOOTER PILL</span>
                                        </div>
                                    </div>
                                    {formData.showUPI && (
                                        <div className="space-y-4 pt-2">
                                            <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
                                                {['auto', 'custom'].map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setFormData({ ...formData, qrType: type })}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                            formData.qrType === type ? "bg-white text-black" : "text-gray-500 hover:text-white"
                                                        )}
                                                    >
                                                        {type === 'auto' ? 'Dynamic UPI' : 'Custom Upload'}
                                                    </button>
                                                ))}
                                            </div>

                                            {formData.qrType === 'auto' ? (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target UPI ID</label>
                                                    <Input value={formData.upiId} onChange={e => setFormData({ ...formData, upiId: e.target.value })} className="h-12 bg-black/50 border-white/5 rounded-xl" />
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Upload QR Image</label>
                                                    <div className="relative group">
                                                        <input type="file" accept="image/*" onChange={handleQrUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                        <div className="h-20 border border-dashed border-white/10 rounded-xl bg-black/30 flex flex-col items-center justify-center gap-2 group-hover:border-neon-blue/30 transition-all">
                                                            {formData.customQrImage ? (
                                                                <img src={formData.customQrImage} alt="QR Preview" className="h-12 w-12 object-contain" />
                                                            ) : (
                                                                <>
                                                                    <Plus size={16} className="text-gray-500" />
                                                                    <span className="text-[8px] font-black text-gray-600 uppercase">Select Image</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* LIVE PREVIEW SECTION */}
                    <div ref={previewContainerRef} className="bg-[#111] rounded-[2.5rem] overflow-hidden relative flex items-start justify-center min-h-[500px] sticky top-8 max-h-[calc(100vh-100px)] border border-white/5">
                        <div className="absolute top-6 right-6 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-widest">Digital Twin</div>
                        <div className="p-8 transition-all duration-300" style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center' }}>
                            <div ref={invoiceRef} className="bg-[#E5E7EB] text-black shadow-2xl p-[12mm] flex flex-col justify-between" style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Inter', sans-serif" }}>
                                <div>
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-10">
                                        <div className="flex items-center gap-4">
                                            <img src="/logo_full.png" alt="Newbi Logo" className="w-[180px] object-contain" />
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-5xl font-black text-gray-500 tracking-tighter uppercase mb-0">#{formData.invoiceNumber}</h2>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">INVOICE ID</p>
                                        </div>
                                    </div>

                                    {/* Info Boxes */}
                                    <div className="grid grid-cols-2 gap-8 mb-10">
                                        <div className="bg-white/50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="bg-[#39FF14]/40 px-6 py-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE BY</h4>
                                            </div>
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
                                            <div className="bg-[#39FF14]/40 px-6 py-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black">INVOICE TO</h4>
                                            </div>
                                            <div className="p-6">
                                                <p className="text-xl font-bold uppercase mb-3 leading-none">{formData.clientName || 'CLIENT NAME'}</p>
                                                <div className="text-[11px] text-gray-600 font-semibold space-y-1.5 leading-normal">
                                                    <p>Date: {new Date(formData.invoiceDate).toLocaleDateString('en-GB')}</p>
                                                    {formData.clientAddress && <p className="whitespace-pre-line">{formData.clientAddress}</p>}
                                                    {formData.clientGst && <p className="mt-1 pt-1 border-t border-gray-200 inline-block">GST: {formData.clientGst}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className="mb-10">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-[#39FF14]/40 text-black">
                                                    <th className="py-3 px-6 text-left text-[10px] font-black uppercase tracking-widest border-r border-black/5">SERVICE DESCRIPTION</th>
                                                    {customColumns.map(col => (
                                                        <th key={col.id} className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">{col.label}</th>
                                                    ))}
                                                    <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">QTY.</th>
                                                    <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-black/5">PRICE</th>
                                                    <th className="py-3 px-6 text-right text-[10px] font-black uppercase tracking-widest">TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-300 border-b border-gray-300">
                                                {items.map((item, idx) => (
                                                    <tr key={idx} className="bg-white/20">
                                                        <td className="py-4 px-6 text-xs font-bold uppercase border-r border-dashed border-gray-400">{item.description || "SERVICE"}</td>
                                                        {customColumns.map(col => (
                                                            <td key={col.id} className="py-4 px-4 text-center text-xs font-medium border-r border-dashed border-gray-400">{item.customValues[col.id] || "-"}</td>
                                                        ))}
                                                        <td className="py-4 px-4 text-center text-xs font-black border-r border-dashed border-gray-400">{item.qty}</td>
                                                        <td className="py-4 px-4 text-center text-xs font-black border-r border-dashed border-gray-400">₹{item.price.toLocaleString()}</td>
                                                        <td className="py-4 px-6 text-right text-xs font-black">₹{(item.qty * item.price).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Totals Section */}
                                        <div className="mt-8 flex justify-end">
                                            <div className="w-[45%] flex flex-col items-end">
                                                <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <span>SUBTOTAL</span>
                                                    <span className="text-black text-xs font-bold">₹{subtotal.toLocaleString()}</span>
                                                </div>
                                                {formData.showGst && (
                                                    <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        <span>GST ({formData.gstPercentage}%)</span>
                                                        <span className="text-black text-xs font-bold">₹{gstAmount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <span>TOTAL AMOUNT</span>
                                                    <span className="text-black text-xs font-bold">₹{totalAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="w-full flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <span>ADVANCE PAID</span>
                                                    <span className="text-black text-xs font-bold">₹{formData.advancePaid.toLocaleString()}</span>
                                                </div>
                                                <div className="w-full flex justify-between py-4 bg-[#39FF14]/40 px-6 mt-4 rounded-xl shadow-sm border border-black/10">
                                                    <span className="text-[11px] font-black uppercase text-black tracking-widest flex items-center">BALANCE DUE</span>
                                                    <span className="text-2xl font-black text-black">₹{toBePaid.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer and Notes */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-8 items-end">
                                        <div>
                                            {formData.showNotes && (
                                                <div className="bg-white/40 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                                                    <div className="bg-[#39FF14]/40 px-4 py-1.5 border-b border-black/10">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black">ADDITIONAL NOTE:</h4>
                                                    </div>
                                                    <div className="p-4">
                                                        <p className="text-[10px] font-bold text-gray-600 leading-relaxed italic">{formData.note || "Thankyou for your business."}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            {formData.showUPI && (
                                                <div className="mb-6 bg-white p-2 rounded-xl border border-gray-200 inline-block shadow-sm">
                                                    {formData.qrType === 'auto' ? (
                                                        <img 
                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${formData.upiId}&pn=NEWBI&am=${toBePaid}&cu=INR`)}`} 
                                                            alt="Payment QR" 
                                                            className="w-[80px] h-[80px] grayscale contrast-125"
                                                        />
                                                    ) : formData.customQrImage ? (
                                                        <img 
                                                            src={formData.customQrImage} 
                                                            alt="Custom QR" 
                                                            className="w-[80px] h-[80px] object-contain grayscale contrast-125"
                                                        />
                                                    ) : (
                                                        <div className="w-[80px] h-[80px] flex items-center justify-center bg-gray-100 rounded-lg text-[6px] font-black text-gray-400">NO QR</div>
                                                    )}
                                                    <p className="text-[6px] font-black text-center mt-1 text-gray-400">SCAN TO PAY</p>
                                                </div>
                                            )}
                                            {formData.showPaymentDetails && (
                                                <div className="inline-block p-5 border-2 border-dashed border-gray-300 rounded-3xl text-[9px] font-bold text-left uppercase leading-normal text-gray-500 mb-8 bg-white/40 shadow-sm">
                                                    <p className="text-[11px] font-black text-black mb-3 border-b-2 border-[#39FF14] pb-1.5 inline-block">PAYMENT DETAILS</p>
                                                    <div className="whitespace-pre-line tracking-wide">
                                                        {formData.paymentDetails}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex flex-col items-end">
                                                {formData.showSignatory === 'image' && formData.signatoryImage ? (
                                                    <img src={formData.signatoryImage} alt="Signature" className="h-16 mb-2 object-contain grayscale mix-blend-multiply" />
                                                ) : formData.showSignatory === 'text' ? (
                                                    <div className="h-16 flex items-end justify-center">
                                                        <p className="font-heading italic text-lg leading-none border-b border-gray-400 pb-1 px-4">{formData.senderName}</p>
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

                                    {formData.showFooter && (
                                        <div className="bg-[#39FF14]/40 rounded-full py-3 px-10 flex justify-between items-center shadow-lg border border-white/20">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">CALL</span>
                                                <p className="text-[10px] font-black text-black tracking-widest">+91 93043 72773</p>
                                            </div>
                                            <div className="flex items-center gap-2 border-x border-black/10 px-10">
                                                <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">EMAIL</span>
                                                <p className="text-[10px] font-black text-black tracking-widest">partnership@newbi.live</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">WEB</span>
                                                <p className="text-[10px] font-black text-black tracking-widest uppercase">www.newbi.live</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceGenerator;
