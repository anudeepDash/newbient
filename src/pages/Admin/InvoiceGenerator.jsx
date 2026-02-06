import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Download, RefreshCw, X } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const InvoiceGenerator = () => {
    const navigate = useNavigate();
    const { addInvoice } = useStore();
    const invoiceRef = useRef(null);

    // Dynamic Columns State
    const [customColumns, setCustomColumns] = useState([]); // [{id: 'col_123', label: 'Vehicle Type'}, ...]

    const [formData, setFormData] = useState({
        clientName: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        advancePaid: 0,
        note: '',
        paymentDetails: `Name: ABHINAV ANAND\nAccount No.: 77780102222341\nIFSC Code: FDRL0007778\nBranch: Neo Banking - Jupiter\nUPI ID: 6207708566@jupiteraxis\nContact No.: 6207708566`
    });

    const [items, setItems] = useState([
        { id: 1, description: '', customValues: {}, qty: 1, price: 0 }
    ]);

    const [generating, setGenerating] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');

    // Calculations
    const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const toBePaid = totalAmount - formData.advancePaid;

    const handleAddColumn = () => {
        if (!newColumnName.trim()) return;
        const newColId = `col_${Date.now()}`;
        setCustomColumns([...customColumns, { id: newColId, label: newColumnName }]);
        setNewColumnName('');
    };

    const handleRemoveColumn = (colId) => {
        setCustomColumns(customColumns.filter(col => col.id !== colId));
        // Also cleanup items data for this column
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

    const handleCustomValueChange = (itemId, colId, value) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    customValues: {
                        ...item.customValues,
                        [colId]: value
                    }
                };
            }
            return item;
        }));
    };

    const generatePDF = async () => {
        if (!invoiceRef.current) return;
        setGenerating(true);
        try {
            console.log("Generating PDF with html2canvas...");
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 2, // High resolution
                useCORS: true,
                allowTaint: true, // Allow local images
                logging: true,
                imageTimeout: 15000,
                backgroundColor: '#E5E7EB' // Match bg color
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            return pdf;
        } catch (error) {
            console.error("PDF Gen Error:", error);
            // alert("PDF Generator Error: " + error.message); // Don't block flow yet
            return null;
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async () => {
        const pdf = await generatePDF();
        if (pdf) {
            pdf.save(`Invoice_${formData.clientName.replace(/\s+/g, '_') || 'Draft'}.pdf`);
        } else {
            alert("Could not generate PDF. Please check console.");
        }
    };

    const handleSaveToDB = async () => {
        setGenerating(true);
        console.log("Starting Invoice Save Process...");
        try {
            // 1. Generate PDF Blob
            console.log("Step 1: Generating PDF...");
            let downloadURL = '';

            const pdf = await generatePDF();

            if (pdf) {
                const pdfBlob = pdf.output('blob');
                const pdfFile = new File([pdfBlob], `invoice_${Date.now()}.pdf`, { type: 'application/pdf' });
                console.log("PDF Blob created size:", pdfBlob.size);

                // 2. Upload to Firebase
                console.log("Step 2: Uploading to Firebase Storage...");
                const storageRef = ref(storage, `invoices/${Date.now()}_generated.pdf`);
                const uploadResult = await uploadBytes(storageRef, pdfFile);
                console.log("Undo result:", uploadResult);
                downloadURL = await getDownloadURL(storageRef);
                console.log("Download URL:", downloadURL);
            } else {
                const proceedWithoutPdf = window.confirm("PDF Generation Failed! \n\nDo you want to SAVE the invoice data anyway? (The PDF link will be empty)");
                if (!proceedWithoutPdf) {
                    throw new Error("User cancelled because PDF failed.");
                }
                console.warn("Saving without PDF...");
            }

            // 3. Sanitize Data for Firestore (No undefined allowed)
            console.log("Step 3: Sanitizing Data...");
            const cleanItems = items.map(item => {
                const cleanCustom = {};
                if (item.customValues) {
                    Object.keys(item.customValues).forEach(key => {
                        if (item.customValues[key] !== undefined) {
                            cleanCustom[key] = item.customValues[key];
                        }
                    });
                }
                return {
                    ...item,
                    customValues: cleanCustom,
                    // Ensure numbers
                    qty: Number(item.qty) || 0,
                    price: Number(item.price) || 0
                };
            });

            // 4. Save to Firestore
            console.log("Step 4: Saving to Firestore...");
            const newInvoice = {
                invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
                clientName: formData.clientName || 'Unknown Client',
                issueDate: formData.invoiceDate,
                amount: totalAmount,
                status: toBePaid <= 0 ? 'Paid' : 'Pending',
                pdfUrl: downloadURL,
                items: cleanItems,
                customColumns: customColumns || [],
                note: formData.note || '',
                paymentDetails: formData.paymentDetails || '',
                advancePaid: Number(formData.advancePaid) || 0,
                createdAt: new Date().toISOString()
            };

            await addInvoice(newInvoice);
            console.log("Firestore save complete!");

            if (window.confirm("Invoice Saved Successfully! \n\nClick OK to Create Another Invoice.\nClick Cancel to View All Invoices.")) {
                // Reset Form
                setFormData({
                    clientName: '',
                    invoiceDate: new Date().toISOString().split('T')[0],
                    advancePaid: 0,
                    note: '',
                    paymentDetails: `Name: ABHINAV ANAND\nAccount No.: 77780102222341\nIFSC Code: FDRL0007778\nBranch: Neo Banking - Jupiter\nUPI ID: 6207708566@jupiteraxis\nContact No.: 6207708566`
                });
                setItems([{ id: Date.now(), description: '', customValues: {}, qty: 1, price: 0 }]);
            } else {
                navigate('/admin/invoices');
            }
        } catch (error) {
            console.error("SAVE ERROR:", error);
            alert("Error saving invoice: " + error.message + "\n\nSee console for details.");
        } finally {
            setGenerating(false);
        }
    };

    const getGridTemplate = () => {
        // Base: 40% Desc, 10% Qty, 15% Price, 15% Total = 80%
        // Custom: 1.5fr each
        const customFr = customColumns.map(() => '1.5fr').join(' ');
        return `3fr ${customFr} 0.8fr 1.2fr 1.2fr`;
    };

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-black text-white">
            <div className="max-w-[1920px] mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* LEFT: EDITOR */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <Link to="/admin/invoices" className="text-gray-400 hover:text-white">
                            <ArrowLeft />
                        </Link>
                        <h1 className="text-3xl font-bold">Invoice Generator</h1>
                    </div>

                    <Card className="p-6 space-y-6 border-white/10 bg-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">Client Name</label>
                                <Input value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Date</label>
                                <Input type="date" value={formData.invoiceDate} onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })} />
                            </div>
                        </div>

                        {/* Column Manager */}
                        <div className="bg-black/40 p-4 rounded-lg border border-white/5">
                            <h4 className="text-sm font-bold text-gray-400 mb-3">Custom Columns</h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {customColumns.map(col => (
                                    <div key={col.id} className="bg-neon-blue/20 text-neon-blue px-3 py-1 rounded text-sm flex items-center gap-2 border border-neon-blue/30">
                                        {col.label}
                                        <button onClick={() => handleRemoveColumn(col.id)} className="hover:text-white"><X size={12} /></button>
                                    </div>
                                ))}
                                {customColumns.length === 0 && <span className="text-xs text-gray-600 italic py-1">No custom columns (e.g., Vehicle Type)</span>}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add Column (e.g. Vehicle Type)"
                                    value={newColumnName}
                                    onChange={e => setNewColumnName(e.target.value)}
                                    className="h-9 text-sm"
                                    onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                                />
                                <Button size="sm" variant="outline" onClick={handleAddColumn}>Add</Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold">Line Items</h3>
                                <Button size="sm" variant="outline" onClick={handleAddItem}><Plus size={16} /> Add Item</Button>
                            </div>

                            {/* Editor Headers */}
                            <div className="grid gap-2 items-center px-2 text-xs font-bold text-gray-500 uppercase"
                                style={{ gridTemplateColumns: `3fr ${customColumns.map(() => '2fr').join(' ')} 1fr 1.5fr 0.5fr` }}>
                                <div>Description</div>
                                {customColumns.map(col => <div key={col.id}>{col.label}</div>)}
                                <div>Qty</div>
                                <div>Price</div>
                                <div></div>
                            </div>

                            {items.map((item) => (
                                <div key={item.id} className="grid gap-2 items-center bg-black/20 p-2 rounded"
                                    style={{ gridTemplateColumns: `3fr ${customColumns.map(() => '2fr').join(' ')} 1fr 1.5fr 0.5fr` }}>

                                    <Input
                                        placeholder="Description"
                                        value={item.description}
                                        onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                                        className="text-sm h-9"
                                    />

                                    {customColumns.map(col => (
                                        <Input
                                            key={col.id}
                                            placeholder={col.label}
                                            value={item.customValues[col.id] || ''}
                                            onChange={e => handleCustomValueChange(item.id, col.id, e.target.value)}
                                            className="text-sm h-9"
                                        />
                                    ))}

                                    <Input
                                        type="number"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        min="1"
                                        onChange={e => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)}
                                        className="text-sm h-9 text-center p-1"
                                    />

                                    <Input
                                        type="number"
                                        placeholder="Price"
                                        value={item.price}
                                        min="0"
                                        onChange={e => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                                        className="text-sm h-9 p-2"
                                    />

                                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-400 flex justify-center"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">Additional Notes</label>
                                <textarea
                                    className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-sm text-white h-32"
                                    value={formData.note}
                                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Payment Details</label>
                                <textarea
                                    className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-sm text-white h-32 font-mono"
                                    value={formData.paymentDetails}
                                    onChange={e => setFormData({ ...formData, paymentDetails: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <label className="text-sm text-gray-400">Advance Paid (₹)</label>
                            <Input
                                type="number"
                                value={formData.advancePaid}
                                onChange={e => setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })}
                                className="max-w-[200px]"
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button onClick={handleDownload} variant="outline" className="flex-1" disabled={generating}>
                                <Download className="mr-2 h-4 w-4" /> Download PDF
                            </Button>
                            <Button onClick={handleSaveToDB} variant="primary" className="flex-1 bg-neon-green text-black hover:bg-neon-green/90" disabled={generating}>
                                <Save className="mr-2 h-4 w-4" /> Save & Create
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* RIGHT: LIVE PREVIEW */}
                <div className="bg-gray-900 rounded-xl overflow-hidden relative flex items-center justify-center min-h-[500px]">
                    {/* ZOOM CONTROL */}
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/50 p-2 rounded-lg text-xs text-white">
                        Preview Fit
                    </div>

                    {/* SCALED WRAPPER */}
                    <div className="transform scale-[0.55] lg:scale-[0.65] xl:scale-[0.6] 2xl:scale-[0.75] origin-center transition-transform">
                        <div
                            ref={invoiceRef}
                            className="w-[794px] min-h-[1123px] bg-[#E5E7EB] text-black relative shadow-2xl"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                            {/* Header */}
                            <div className="p-8 pb-4 flex justify-between items-start relative">
                                {/* Logo */}
                                <div className="z-10">
                                    <img src="/logo_full.png" crossOrigin="anonymous" alt="NewBi Entertainment" className="h-24 object-contain" />
                                </div>

                                {/* Engraved Invoice Number */}
                                <div className="absolute top-6 right-8 text-right pointer-events-none">
                                    <h1 className="text-4xl font-black text-gray-300 tracking-tight opacity-60">
                                        #{Math.floor(1000 + Math.random() * 9000)}
                                    </h1>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mr-1">INVOICE ID</p>
                                </div>
                            </div>

                            {/* Info Cards Row */}
                            <div className="px-8 py-4 grid grid-cols-2 gap-8">
                                {/* INVOICE BY */}
                                <div className="bg-[#E5E7EB] rounded-xl overflow-hidden border border-gray-300">
                                    <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-800 tracking-wider text-sm border-b border-gray-400/20">
                                        Invoice By
                                    </div>
                                    <div className="p-4 text-sm text-gray-700 space-y-1">
                                        <p className="font-black text-lg text-black mb-2">NewBi Entertainment</p>
                                        <p>Contact: +91 93043 72773</p>
                                        <p>Email: partnership@newbi.live</p>
                                        <p>PAN: ETXPA9107A</p>
                                    </div>
                                </div>

                                {/* INVOICE TO */}
                                <div className="bg-[#E5E7EB] rounded-xl overflow-hidden border border-gray-300">
                                    <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-800 tracking-wider text-sm border-b border-gray-400/20">
                                        Invoice To
                                    </div>
                                    <div className="p-4 text-sm text-gray-700 space-y-1">
                                        <p className="font-black text-lg text-black mb-2">{formData.clientName || 'Client Name'}</p>
                                        <p>Date: {new Date(formData.invoiceDate).toLocaleDateString('en-GB')}</p>
                                        {/* Placeholder for address if we add it later */}
                                        <p className="text-gray-400 italic">Client Address...</p>
                                    </div>
                                </div>
                            </div>

                            {/* Main Table */}
                            <div className="px-8 mt-4">
                                <div className="w-full">
                                    {/* Header Row */}
                                    <div className="grid bg-[#86EFAC] rounded-t-xl text-center font-bold text-xs uppercase py-3 border-b-2 border-dashed border-gray-400/30"
                                        style={{ gridTemplateColumns: getGridTemplate() }}>
                                        <div className="text-left pl-4">Service Description</div>
                                        {customColumns.map(col => (
                                            <div key={col.id} className="border-l border-dashed border-gray-400/50">{col.label}</div>
                                        ))}
                                        <div className="border-l border-dashed border-gray-400/50">Qty.</div>
                                        <div className="border-l border-dashed border-gray-400/50">Price</div>
                                        <div className="border-l border-dashed border-gray-400/50">Total</div>
                                    </div>

                                    {/* Items */}
                                    <div className="bg-[#E5E7EB]">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="grid text-center text-sm font-bold py-4 border-b border-dashed border-gray-400 items-center"
                                                style={{ gridTemplateColumns: getGridTemplate() }}>
                                                <div className="text-left pl-4 break-words font-extrabold pr-2">{item.description || 'Service'}</div>

                                                {customColumns.map(col => (
                                                    <div key={col.id} className="border-l border-dashed border-gray-400 h-full flex items-center justify-center px-1 break-all">
                                                        {item.customValues[col.id] || '-'}
                                                    </div>
                                                ))}

                                                <div className="border-l border-dashed border-gray-400 h-full flex items-center justify-center">{item.qty}</div>
                                                <div className="border-l border-dashed border-gray-400 h-full flex items-center justify-center">₹{item.price.toLocaleString()}</div>
                                                <div className="border-l border-dashed border-gray-400 h-full flex items-center justify-center">₹{(item.qty * item.price).toLocaleString()}</div>
                                            </div>
                                        ))}

                                        {/* Empty rows filler */}
                                        <div className="h-24 bg-[#E5E7EB] border-b border-dashed border-gray-400"></div>
                                    </div>

                                    {/* Totals Section */}
                                    <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                        <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Total</div>
                                        <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{totalAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                        <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Advance Paid</div>
                                        <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{formData.advancePaid.toLocaleString()}</div>
                                    </div>
                                    <div className="grid grid-cols-12 bg-[#86EFAC] rounded-b-xl text-lg font-bold">
                                        <div className="col-span-10 text-right pr-4 py-3 text-[#DC2626] uppercase">To Be Paid</div>
                                        <div className="col-span-2 text-center py-3 border-l border-dashed border-gray-400 text-[#DC2626]">₹{toBePaid.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Notes & Payment */}
                            <div className="px-8 mt-12 grid grid-cols-2 gap-8 mb-20">
                                {/* Additional Note */}
                                <div className="rounded-xl overflow-hidden">
                                    <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-700 tracking-wide text-sm">Additional Note:</div>
                                    <div className="bg-[#C6CBCE] p-4 text-[10px] whitespace-pre-line leading-relaxed font-bold text-black border-t border-gray-400/20 min-h-[100px]">
                                        {formData.note}
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div className="rounded-xl overflow-hidden">
                                    <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-700 tracking-wide text-sm">Payment Details:</div>
                                    <div className="bg-[#C6CBCE] p-4 text-[10px] whitespace-pre-line leading-relaxed font-bold text-black border-t border-gray-400/20 min-h-[100px]">
                                        {formData.paymentDetails}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Bar */}
                            <div className="absolute bottom-12 left-8 right-8 bg-[#86EFAC] rounded-xl py-3 px-6 flex justify-between items-center text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                <div>+91 93043 72773</div>
                                <div className="lowercase tracking-normal">partnership@newbi.live</div>
                                <div className="lowercase tracking-normal">www.newbi.live</div>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default InvoiceGenerator;
