import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, LayoutGrid, Download, RefreshCw, X, FileText, FileSpreadsheet, Sparkles, Users, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../../lib/utils';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { Loader } from 'lucide-react';

const InvoiceGenerator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addInvoice, updateInvoice, invoices, uploadToCloudinary } = useStore();
    const invoiceRef = useRef(null);
    const [previewScale, setPreviewScale] = useState(0.65);
    const [currentPreviewPage, setCurrentPreviewPage] = useState(0);
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

    const [customColumns, setCustomColumns] = useState([]);
    const [formData, setFormData] = useState({
        senderName: 'Newbi Entertainment & Marketing LLP',
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
        showFooter: true,
        showAdvance: true,
        showSignatureBlock: true,
        layoutOrder: [
            { id: 'notes', x: 0, y: 0, scale: 1, name: 'Notes' },
            { id: 'totals', x: 0, y: 0, scale: 1, name: 'Totals' },
            { id: 'payment_details', x: 0, y: 0, scale: 1, name: 'Payment Details' },
            { id: 'payment_qr', x: 0, y: 0, scale: 1, name: 'Payment QR' },
            { id: 'signatory', x: 0, y: 0, scale: 1, name: 'Signatory' },
            { id: 'footer', x: 0, y: 0, scale: 1, name: 'Footer' }
        ]
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
                    showFooter: invoice.showFooter !== undefined ? invoice.showFooter : true,
                    showAdvance: invoice.showAdvance !== undefined ? invoice.showAdvance : true,
                    showSignatureBlock: invoice.showSignatureBlock !== undefined ? invoice.showSignatureBlock : true,
                    layoutOrder: invoice.layoutOrder?.map(item => {
                        if (typeof item === 'string') return { id: item, x: 0, y: 0, scale: 1 };
                        return { ...item, scale: item.scale || 1 };
                    }) || [
                        { id: 'notes', x: 0, y: 0, scale: 1, name: 'Notes' },
                        { id: 'totals', x: 0, y: 0, scale: 1, name: 'Totals' },
                        { id: 'payment_details', x: 0, y: 0, scale: 1, name: 'Payment Details' },
                        { id: 'payment_qr', x: 0, y: 0, scale: 1, name: 'Payment QR' },
                        { id: 'signatory', x: 0, y: 0, scale: 1, name: 'Signatory' },
                        { id: 'footer', x: 0, y: 0, scale: 1, name: 'Footer' }
                    ]
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

    // Pagination Logic
    const ROWS_PER_PAGE_P1 = 10;
    const ROWS_PER_PAGE_NEXT = 18;
    
    const getPaginatedPages = () => {
        const pages = [];
        let itemsRemaining = [...items];
        
        // Page 1
        pages.push(itemsRemaining.splice(0, ROWS_PER_PAGE_P1));
        
        // Subsequent pages
        while (itemsRemaining.length > 0) {
            pages.push(itemsRemaining.splice(0, ROWS_PER_PAGE_NEXT));
        }

        // Only append agreement page if there are no items in the last page, or if we want forced separation
        // For invoice, we stick to overlaying on the last page to save space unless it overflows (not handled here)
        
        return pages;
    };

    const paginatedPages = getPaginatedPages();

    useEffect(() => {
        // Reset to first page when pages decrease to avoid empty state
        if (currentPreviewPage >= paginatedPages.length) {
            setCurrentPreviewPage(Math.max(0, paginatedPages.length - 1));
        }
    }, [paginatedPages.length, currentPreviewPage]);

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
            const url = await uploadToCloudinary(file);
            if (url) {
                setFormData(prev => ({ ...prev, signatoryImage: url }));
            }
        } catch (error) {
            console.error("Signatory Upload Error:", error);
            alert("FAILED TO UPLOAD SIGNATURE.");
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
        setGenerating(true);

        const originalScale = previewScale;
        setPreviewScale(1);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Increased delay for layout stability

        try {
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            const pageElements = document.querySelectorAll('.invoice-page-render');
            
            if (!pageElements.length) {
                alert("No invoice pages found to download!");
                return null;
            }

            for (let i = 0; i < pageElements.length; i++) {
                const canvas = await html2canvas(pageElements[i], {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#F3F4F6',
                    width: 794,
                    height: 1123,
                    windowWidth: 794,
                    windowHeight: 1123,
                    scrollX: 0,
                    scrollY: 0,
                    onclone: (clonedDoc) => {
                        const style = clonedDoc.createElement('style');
                        style.innerHTML = `
                            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                            .invoice-page-render { 
                                position: absolute !important; 
                                top: 0 !important; 
                                left: 0 !important; 
                                margin: 0 !important; 
                                transform: none !important;
                                box-shadow: none !important;
                                text-rendering: optimizeLegibility !important;
                                -webkit-font-smoothing: antialiased !important;
                            }
                        `;
                        clonedDoc.head.appendChild(style);
                        
                        clonedDoc.body.style.margin = '0';
                        clonedDoc.body.style.padding = '0';
                        clonedDoc.body.style.overflow = 'hidden';
                    }
                });
                
                if (!canvas) {
                    throw new Error(`Failed to capture page ${i + 1}`);
                }

                const imgData = canvas.toDataURL('image/png', 1.0);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
            }
            
            return pdf;
        } catch (error) {
            console.error("PDF Gen Error:", error);
            alert("PDF Generation Error: " + error.message);
            return null;
        } finally {
            setPreviewScale(originalScale);
            setGenerating(false);
        }
    };

    const handleDownload = async () => {
        const pdf = await generatePDF();
        if (pdf) {
            // Sanitize filename to prevent "random file type" issues
            const safeInvoiceNumber = (formData.invoiceNumber || 'INV').toString().replace(/[/\\?%*:|"<>]/g, '-');
            const fileName = `Newbi_INV-${safeInvoiceNumber}.pdf`;
            
            // Force manual download with explicit fileName and MIME type
            try {
                const blob = pdf.output('blob');
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
            } catch (err) {
                console.error("Manual Download Error:", err);
                // Last ditch effort
                pdf.save(fileName);
            }
        }
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
                gstPercentage: formData.gstPercentage,
                showAdvance: formData.showAdvance,
                layoutOrder: formData.layoutOrder
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
        const numValue = field === 'scale' ? parseFloat(value) : parseInt(value);
        newOrder[index] = { ...newOrder[index], [field]: isNaN(numValue) ? 0 : numValue };
        setFormData({ ...formData, layoutOrder: newOrder });
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
                showAdvance: true,
            }));
            setItems([{ id: Date.now(), description: '', customValues: {}, qty: 1, price: 0 }]);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden pb-20">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-4 mb-4">
                            <Link to="/admin/invoices" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em] group">
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Invoices
                            </Link>
                            <AdminDashboardLink />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">
                            INVOICE <span className="text-neon-blue px-4">GENERATOR.</span>
                        </h1>
                    </div>
                    <div className="flex gap-4">
                        <Button onClick={handleSaveToDB} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold uppercase tracking-widest text-xs h-12 px-8 rounded-xl transition-all" disabled={generating}>
                            {generating ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />} Save Invoice
                        </Button>
                        <Button onClick={handleDownload} className="bg-neon-blue text-black font-black font-heading uppercase tracking-widest text-xs h-12 px-8 rounded-xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(0,255,255,0.2)]" disabled={generating}>
                            <Download className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start">
                    <div className="space-y-8 h-[calc(100vh-100px)] overflow-y-auto pr-4 scrollbar-hide custom-scrollbar order-last xl:order-last">
                        <Card className="p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <h3 className="text-sm font-black text-neon-green tracking-widest uppercase mb-8 flex items-center gap-2">
                                <Sparkles size={16} /> Sender Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">COMPANY / ENTITY NAME</label>
                                    <Input value={formData.senderName} onChange={e => setFormData({ ...formData, senderName: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="ORGANIZATION NAME" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">AUTHORIZED CONTACT</label>
                                    <Input value={formData.senderContact} onChange={e => setFormData({ ...formData, senderContact: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="+91 XXX XXX XXXX" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">BUSINESS EMAIL</label>
                                    <Input value={formData.senderEmail} onChange={e => setFormData({ ...formData, senderEmail: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="ADMIN@BUSINESS.COM" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">PAN / TAX IDENTIFIER</label>
                                    <Input value={formData.senderPan} onChange={e => setFormData({ ...formData, senderPan: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="TAX REGISTRATION ID" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">GST REGISTRATION NUMBER</label>
                                    <Input value={formData.senderGst} onChange={e => setFormData({ ...formData, senderGst: e.target.value })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="LEAVE EMPTY IF NOT APPLICABLE" />
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
                                    <Input value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value.toUpperCase() })} className="bg-black/50 border-white/5 rounded-xl h-12" placeholder="Recipient Organization" />
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
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">INVOICE ID</label>
                                    <Input value={formData.invoiceNumber} onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })} className="bg-black/60 border-white/10 rounded-xl h-12 font-bold tracking-tight" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">INVOICE DATE</label>
                                    <StudioDatePicker 
                                        value={formData.invoiceDate} 
                                        onChange={val => setFormData({ ...formData, invoiceDate: val })}
                                        className="h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">DUE DATE</label>
                                    <StudioDatePicker 
                                        value={formData.dueDate} 
                                        onChange={val => setFormData({ ...formData, dueDate: val })}
                                        className="h-12"
                                    />
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
                                            onClick={() => setFormData({ ...formData, showSignatory: 'text' })}
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
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Financial Options</h4>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={formData.showAdvance} onChange={e => setFormData({ ...formData, showAdvance: e.target.checked })} className="w-3 h-3 accent-neon-green" />
                                            <span className="text-[8px] font-bold text-gray-500 uppercase">Show Advance Row</span>
                                        </div>
                                    </div>
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
                                            <input type="checkbox" checked={formData.showSignatureBlock} onChange={e => setFormData({ ...formData, showSignatureBlock: e.target.checked })} className="w-4 h-4 accent-neon-green rounded" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sign Block</span>
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

                                <div className="space-y-4 border-t border-white/5 pt-6">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase pl-1">Document Layout Priority & Position</label>
                                    <div className="space-y-4">
                                        {formData.layoutOrder.map((item, idx) => (
                                            <div key={item.id} className="bg-black/30 p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-all space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-white/40 group-hover:text-white/60 transition-colors bg-white/5 w-6 h-6 rounded-lg flex items-center justify-center italic">{idx + 1}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                                                        {item.name || item.id}
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
                    </div>

                    {/* LIVE PREVIEW SECTION */}
                    <div className="bg-[#050505] rounded-[2.5rem] p-8 overflow-hidden relative h-[calc(100vh-100px)] sticky top-8 border border-white/5 order-first xl:order-first flex flex-col items-center justify-center">
                        <div className="absolute top-6 right-6 z-20 flex gap-4 items-center">
                            <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/80">Digital Twin</div>
                            <div className="flex gap-2 bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/10">
                                <button 
                                    onClick={() => setCurrentPreviewPage(Math.max(0, currentPreviewPage - 1))}
                                    disabled={currentPreviewPage === 0}
                                    className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="px-3 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white/50 min-w-[60px]">
                                    {currentPreviewPage + 1} / {paginatedPages.length}
                                </div>
                                <button 
                                    onClick={() => setCurrentPreviewPage(Math.min(paginatedPages.length - 1, currentPreviewPage + 1))}
                                    disabled={currentPreviewPage === paginatedPages.length - 1}
                                    className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                        
                        <div ref={previewContainerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
                            <div style={{ width: 794 * previewScale, height: 1123 * previewScale }} className="relative shrink-0 shadow-2xl rounded-xl overflow-hidden bg-[#F3F4F6]">
                                <div className="flex transition-transform duration-500 ease-out h-full" style={{ transform: `translateX(-${currentPreviewPage * 794 * previewScale}px)` }}>
                                    {paginatedPages.map((pageItems, pageIdx) => {
                                        const isLastPage = pageIdx === paginatedPages.length - 1;
                                        const isFirstPage = pageIdx === 0;
                                        
                                        return (
                                            <div 
                                                key={pageIdx}
                                                className="invoice-page-render w-[794px] h-[1123px] bg-[#E5E7EB] text-black shrink-0 p-[12mm] relative overflow-hidden flex flex-col justify-between origin-top-left" 
                                                style={{ fontFamily: "'Inter', sans-serif", transform: `scale(${previewScale})` }}
                                            >
                                        <div className="pb-32 relative z-10">
                                            {/* Header - Only on Page 1 */}
                                            {isFirstPage ? (
                                                <div className="flex justify-between items-start mb-12">
                                                    <div className="relative">
                                                        <img src="/logo_document.png" alt="Company Logo" className="h-20 object-contain" crossOrigin="anonymous" />
                                                    </div>
                                                    <div className="text-right">
                                                        <h2 className="text-4xl font-black text-gray-500 tracking-tighter uppercase mb-0">#{formData.invoiceNumber}</h2>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">INVOICE ID</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                                                    <img src="/logo_document.png" alt="Newbi Logo" className="w-[100px] object-contain opacity-50" crossOrigin="anonymous" />
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice #{formData.invoiceNumber} — Page {pageIdx + 1}</p>
                                                </div>
                                            )}

                                            {/* Info Boxes - Only on Page 1 */}
                                            {isFirstPage && (
                                                <div className="grid grid-cols-2 gap-8 mb-8">
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
                                                                {formData.dueDate && <p>Due Date: {new Date(formData.dueDate).toLocaleDateString('en-GB')}</p>}
                                                                {formData.clientAddress && <p className="whitespace-pre-line">{formData.clientAddress}</p>}
                                                                {formData.clientGst && <p className="mt-1 pt-1 border-t border-gray-200 inline-block">GST: {formData.clientGst}</p>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Table */}
                                            <div className={cn("mb-8 relative z-10", !isFirstPage && "mt-4")}>
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
                                                        {pageItems.map((item, idx) => (
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
                                            </div>

                                            {isLastPage && (
                                                <div className="mt-4 grid grid-cols-2 gap-y-8 gap-x-12 relative z-10 w-full items-start">
                                                    {formData.layoutOrder.map((item) => {
                                                        const sectionId = typeof item === 'string' ? item : item.id;
                                                        const x = item.x || 0;
                                                        const y = item.y || 0;
                                                        const s = item.scale || 1;
                                                        const style = { transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: 'top left' };

                                                        if (sectionId === 'notes') {
                                                            return formData.showNotes && (
                                                                <div key="notes" style={style} className="col-start-1 row-start-1 w-full relative">
                                                                    <div className="bg-white/20 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                                        <div className="bg-[#39FF14]/40 px-4 py-1.5 border-b border-black/10">
                                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">ADDITIONAL NOTE</h4>
                                                                        </div>
                                                                        <div className="p-4">
                                                                            <p className="text-[9px] font-bold leading-relaxed text-gray-500 whitespace-pre-line tracking-wide italic">
                                                                                {formData.note || "Thank you for your business."}
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
                                                                                <span>GST ({formData.gstPercentage}%)</span>
                                                                                <span className="text-black text-xs font-bold font-heading italic">₹{gstAmount.toLocaleString()}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex justify-between items-center py-3 bg-[#39FF14]/40 px-4 text-black border border-black/5 mt-2 rounded-xl">
                                                                            <span className="text-[10px] font-black uppercase italic">TOTAL AMOUNT</span>
                                                                            <span className="text-xl font-black italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                                                                        </div>
                                                                        {formData.showAdvance !== false && formData.advancePaid > 0 && (
                                                                            <>
                                                                                <div className="flex justify-between py-2.5 border-b border-dashed border-gray-300 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                                                                    <span>ADVANCE PAID</span>
                                                                                    <span className="text-black text-xs font-bold font-heading italic">₹{formData.advancePaid.toLocaleString()}</span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center py-4 bg-[#39FF14]/40 px-6 text-black border border-black/10 rounded-2xl shadow-xl mt-4">
                                                                                    <span className="text-[12px] font-black uppercase italic">BALANCE DUE</span>
                                                                                    <span className="text-3xl font-black italic tracking-tighter">₹{toBePaid.toLocaleString()}</span>
                                                                                </div>
                                                                            </>
                                                                        )}
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
                                                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${formData.upiId}&pn=NEWBI&am=${toBePaid}&cu=INR`)}`} 
                                                                                alt="Payment QR" 
                                                                                className="w-[100px] h-[100px] grayscale contrast-125 mx-auto"
                                                                                crossOrigin="anonymous"
                                                                            />
                                                                        ) : formData.customQrImage ? (
                                                                            <img 
                                                                                src={formData.customQrImage} 
                                                                                alt="Custom QR" 
                                                                                className="w-[100px] h-[100px] object-contain grayscale contrast-125 mx-auto"
                                                                                crossOrigin="anonymous"
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
                                                            return formData.showSignatureBlock && (
                                                                <div key="signatory" style={style} className="col-start-2 row-start-3 w-full flex justify-end mt-4 relative">
                                                                    <div className="flex flex-col items-end text-right w-[200px]">
                                                                        {formData.showSignatory === 'image' && formData.signatoryImage ? (
                                                                            <img src={formData.signatoryImage} alt="Signature" className="h-16 mb-2 object-contain grayscale mix-blend-multiply" crossOrigin="anonymous" />
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
                                                            );
                                                        }
                                                        
                                                        return null;
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {formData.showFooter && (
                                            <footer 
                                                className="absolute bottom-4 left-10 right-10 h-10 flex items-center justify-between px-10 rounded-full border border-black/10 shadow-lg z-50 bg-[#39FF14]/40"
                                                style={{
                                                    transform: `translate(${(formData.layoutOrder.find(i => (typeof i === 'object' ? i.id : i) === 'footer') || {}).x || 0}px, ${(formData.layoutOrder.find(i => (typeof i === 'object' ? i.id : i) === 'footer') || {}).y || 0}px) scale(${(formData.layoutOrder.find(i => (typeof i === 'object' ? i.id : i) === 'footer') || {}).scale || 0.85})`,
                                                    transformOrigin: 'bottom center'
                                                }}
                                            >
                                                <div className="flex items-center justify-between w-full text-black">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">CALL</span>
                                                        <p className="text-[10px] font-black tracking-widest uppercase font-bold">+91 93043 72773</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 border-x border-black/10 px-10 h-10">
                                                        <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">EMAIL</span>
                                                        <p className="text-[10px] font-black tracking-widest uppercase font-bold">partnership@newbi.live</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[8px] font-black text-black/50 tracking-[0.2em]">WEB</span>
                                                        <p className="text-[10px] font-black tracking-widest uppercase font-bold">newbi.live</p>
                                                    </div>
                                                </div>
                                            </footer>
                                        )}
                                            </div>
                                        );
                                    })}
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
