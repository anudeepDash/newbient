import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
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
    const { id } = useParams();
    const navigate = useNavigate();
    const { addInvoice, updateInvoice, invoices } = useStore();
    const invoiceRef = useRef(null);

    // Dynamic Columns State
    const [customColumns, setCustomColumns] = useState([]); // [{id: 'col_123', label: 'Vehicle Type'}, ...]

    const [formData, setFormData] = useState({
        // Sender Details (Defaults)
        senderName: 'NewBi Entertainment',
        senderContact: '+91 93043 72773',
        senderEmail: 'partnership@newbi.live',
        senderPan: 'ETXPA9107A',
        senderGst: '',

        // Client Details
        clientName: '',
        clientAddress: '',
        clientGst: '',

        // Invoice Details
        invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`, // Persistent ID
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '', // New field

        advancePaid: 0,
        note: '',
        paymentDetails: `Name: ABHINAV ANAND\nAccount No.: 77780102222341\nIFSC Code: FDRL0007778\nBranch: Neo Banking - Jupiter\nUPI ID: 6207708566@jupiteraxis\nContact No.: 6207708566`,

        // Configuration Toggles
        showSignatory: 'text', // 'none' | 'text' | 'image'
        signatoryImage: '',
        showNotes: true,
        showPaymentDetails: true,
        showUPI: false,
        upiId: '6207708566@jupiteraxis',
        showGst: false,
        gstPercentage: 18
    });

    const [items, setItems] = useState([
        { id: 1, description: '', customValues: {}, qty: 1, price: 0 }
    ]);

    const [generating, setGenerating] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');

    // Load invoice data if ID exists
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

                    // New Fields
                    showSignatory: invoice.showSignatory || 'text',
                    signatoryImage: invoice.signatoryImage || '',
                    showNotes: invoice.showNotes !== undefined ? invoice.showNotes : true,
                    showPaymentDetails: invoice.showPaymentDetails !== undefined ? invoice.showPaymentDetails : true,
                    showUPI: invoice.showUPI || false,
                    upiId: invoice.upiId || '6207708566@jupiteraxis',
                    showGst: invoice.showGst || false,
                    gstPercentage: invoice.gstPercentage || 18
                });
                setItems(invoice.items || []);
                setCustomColumns(invoice.customColumns || []);
            }
        }
    }, [id, invoices]);

    // Calculations
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
        if (!invoiceRef.current) return null;
        setGenerating(true);
        try {
            console.log("Generating PDF with html2canvas...");
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                imageTimeout: 15000,
                backgroundColor: '#E5E7EB'
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.9);

            // Calculate height for a single page PDF
            // A4 width is 210mm
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
            return pdf;
        } catch (error) {
            console.error("PDF Gen Error:", error);
            // alert("Failed to generate PDF layout. Please try again or check console.");
            return null;
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async () => {
        const pdf = await generatePDF();
        if (pdf) {
            pdf.save(`Newbi_INV-${formData.invoiceNumber}.pdf`);
        }
    };

    const handleSaveToDB = async () => {
        setGenerating(true);
        console.log("Starting Invoice Save Process...");
        try {
            // 1. Sanitize Data
            console.log("Step 1: Sanitizing Data...");
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
                    qty: Number(item.qty) || 0,
                    price: Number(item.price) || 0
                };
            });

            // 2. Save to Firestore
            console.log("Step 2: Saving to Firestore...");
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

                // New configuration fields
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
                console.log("Firestore update complete!");
                alert("Invoice Updated Successfully!");
            } else {
                await addInvoice(newInvoice);
                console.log("Firestore save complete!");
                alert("Invoice Saved Successfully!");
            }
            navigate('/admin/invoices');
        } catch (error) {
            console.error("SAVE ERROR:", error);
            alert("Error saving invoice: " + error.message + "\n\nSee console for details.");
        } finally {
            setGenerating(false);
        }
    };

    const handleReset = () => {
        if (window.confirm("Start a new invoice? Current form data will be cleared.")) {
            // Reset Form (Keep sender defaults)
            setFormData(prev => ({
                ...prev,
                clientName: '',
                clientAddress: '',
                clientGst: '',
                invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`, // Generate NEW ID for next invoice
                invoiceDate: new Date().toISOString().split('T')[0],
                dueDate: '',
                advancePaid: 0,
                note: '',
                paymentDetails: `Name: ABHINAV ANAND\nAccount No.: 77780102222341\nIFSC Code: FDRL0007778\nBranch: Neo Banking - Jupiter\nUPI ID: 6207708566@jupiteraxis\nContact No.: 6207708566`,
                showSignatory: 'text',
                signatoryImage: '',
                showNotes: true,
                showPaymentDetails: true,
                showUPI: false,
                upiId: '6207708566@jupiteraxis',
                showGst: false,
                gstPercentage: 18
            }));
            setItems([{ id: Date.now(), description: '', customValues: {}, qty: 1, price: 0 }]);
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
                <div className="space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <Link to="/admin/invoices" className="text-gray-400 hover:text-white">
                            <ArrowLeft />
                        </Link>
                        <h1 className="text-3xl font-bold">Invoice Generator</h1>
                    </div>

                    {/* SECTION 1: INVOICE BY (SENDER) */}
                    <Card className="p-6 border-white/10 bg-white/5">
                        <h3 className="text-neon-green font-bold text-sm uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                            1. Invoice By (From)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400">Company Name</label>
                                <Input value={formData.senderName} onChange={e => setFormData({ ...formData, senderName: e.target.value })} className="h-9" placeholder="Leave empty to hide" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Contact No.</label>
                                <Input value={formData.senderContact} onChange={e => setFormData({ ...formData, senderContact: e.target.value })} className="h-9" placeholder="Leave empty to hide" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Email</label>
                                <Input value={formData.senderEmail} onChange={e => setFormData({ ...formData, senderEmail: e.target.value })} className="h-9" placeholder="Leave empty to hide" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">PAN / Tax ID</label>
                                <Input value={formData.senderPan} onChange={e => setFormData({ ...formData, senderPan: e.target.value })} className="h-9" placeholder="Leave empty to hide" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">GSTIN</label>
                                <Input value={formData.senderGst} onChange={e => setFormData({ ...formData, senderGst: e.target.value })} className="h-9" placeholder="Leave empty to hide" />
                            </div>
                        </div>
                    </Card>

                    {/* SECTION 2: INVOICE TO (CLIENT) */}
                    <Card className="p-6 border-white/10 bg-white/5">
                        <h3 className="text-neon-blue font-bold text-sm uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                            2. Invoice To (Client)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-xs text-gray-400">Client Name</label>
                                <Input value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} placeholder="Client Name" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-gray-400">Client Address</label>
                                <Input value={formData.clientAddress} onChange={e => setFormData({ ...formData, clientAddress: e.target.value })} placeholder="City, State (Leave empty to hide)" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-gray-400">Client GSTIN</label>
                                <Input value={formData.clientGst} onChange={e => setFormData({ ...formData, clientGst: e.target.value })} placeholder="Leave empty to hide" />
                            </div>
                        </div>
                    </Card>

                    {/* SECTION 3: INVOICE DETAILS */}
                    <Card className="p-6 border-white/10 bg-white/5">
                        <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                            3. Invoice Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400">Invoice Number</label>
                                <Input value={formData.invoiceNumber} onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })} className="h-9" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Invoice Date</label>
                                <Input type="date" value={formData.invoiceDate} onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })} className="h-9" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Due Date (Optional)</label>
                                <Input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="h-9" />
                            </div>
                        </div>
                    </Card>

                    {/* SECTION 4: ITEMS & COLUMNS */}
                    <Card className="p-6 border-white/10 bg-white/5">
                        <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                            4. Items & Pricing
                        </h3>

                        {/* Column Manager */}
                        <div className="bg-black/40 p-4 rounded-lg border border-white/5 mb-6">
                            <h4 className="text-xs font-bold text-gray-500 mb-2">Custom Columns (e.g. Vehicle Type)</h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {customColumns.map(col => (
                                    <div key={col.id} className="bg-neon-blue/20 text-neon-blue px-3 py-1 rounded text-xs flex items-center gap-2 border border-neon-blue/30">
                                        {col.label}
                                        <button onClick={() => handleRemoveColumn(col.id)} className="hover:text-white"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add Column Name"
                                    value={newColumnName}
                                    onChange={e => setNewColumnName(e.target.value)}
                                    className="h-8 text-xs"
                                    onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                                />
                                <Button size="sm" variant="outline" onClick={handleAddColumn} className="h-8">Add</Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-sm">Line Items</h3>
                                <Button size="sm" variant="outline" onClick={handleAddItem}><Plus size={16} /> Add Row</Button>
                            </div>

                            {/* Headers */}
                            <div className="grid gap-2 px-2 text-[10px] font-bold text-gray-500 uppercase"
                                style={{ gridTemplateColumns: `3fr ${customColumns.map(() => '2fr').join(' ')} 1fr 1.5fr 0.5fr` }}>
                                <div>Description</div>
                                {customColumns.map(col => <div key={col.id}>{col.label}</div>)}
                                <div>Qty</div>
                                <div>Price</div>
                                <div></div>
                            </div>

                            {/* Item Rows */}
                            {items.map((item) => (
                                <div key={item.id} className="grid gap-2 items-center bg-black/20 p-2 rounded"
                                    style={{ gridTemplateColumns: `3fr ${customColumns.map(() => '2fr').join(' ')} 1fr 1.5fr 0.5fr` }}>

                                    <Input
                                        placeholder="Description"
                                        value={item.description}
                                        onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                                        className="text-xs h-8"
                                    />
                                    {customColumns.map(col => (
                                        <Input
                                            key={col.id}
                                            placeholder={col.label}
                                            value={item.customValues[col.id] || ''}
                                            onChange={e => handleCustomValueChange(item.id, col.id, e.target.value)}
                                            className="text-xs h-8"
                                        />
                                    ))}
                                    <Input
                                        type="number"
                                        value={item.qty}
                                        min="1"
                                        onChange={e => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 text-center"
                                    />
                                    <Input
                                        type="number"
                                        value={item.price}
                                        min="0"
                                        onChange={e => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                                        className="text-xs h-8"
                                    />
                                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-400 flex justify-center"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* SECTION 5: PAYMENTS & NOTES */}
                    <Card className="p-6 border-white/10 bg-white/5">
                        <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                            5. Payment & Notes
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Additional Notes / Terms</label>
                                <textarea
                                    className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-sm text-white h-24 focus:outline-none focus:border-neon-green/50"
                                    value={formData.note}
                                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                                    placeholder="Thank you for your business..."
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Payment Details / Bank Info</label>
                                <textarea
                                    className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-sm text-white h-32 font-mono focus:outline-none focus:border-neon-green/50"
                                    value={formData.paymentDetails}
                                    onChange={e => setFormData({ ...formData, paymentDetails: e.target.value })}
                                />
                            </div>

                            {/* SIGNATORY OPTIONS */}
                            <div className="bg-black/40 p-4 rounded-lg border border-white/5 space-y-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Authorized Signatory</h4>
                                <div className="flex gap-4">
                                    {['none', 'text', 'image'].map(type => (
                                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="radio"
                                                name="signatoryType"
                                                checked={formData.showSignatory === type}
                                                onChange={() => setFormData({ ...formData, showSignatory: type })}
                                                className="accent-neon-green"
                                            />
                                            <span className={`text-xs capitalize ${formData.showSignatory === type ? 'text-neon-green font-bold' : 'text-gray-400'}`}>
                                                {type}
                                            </span>
                                        </label>
                                    ))}
                                </div>

                                {formData.showSignatory === 'image' && (
                                    <div className="space-y-3 pt-2 border-t border-white/5">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Signature Image</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-12 bg-white/10 rounded border border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                                                {formData.signatoryImage ? (
                                                    <img src={formData.signatoryImage} alt="Signature" className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-[8px] text-gray-500">No Image</span>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            setGenerating(true);
                                                            try {
                                                                const storageRef = ref(storage, `signatures/${Date.now()}_${file.name}`);
                                                                await uploadBytes(storageRef, file);
                                                                const url = await getDownloadURL(storageRef);
                                                                setFormData({ ...formData, signatoryImage: url });
                                                            } catch (err) {
                                                                alert("Failed to upload signature.");
                                                            } finally {
                                                                setGenerating(false);
                                                            }
                                                        }
                                                    }}
                                                    className="block w-full text-[10px] text-gray-400 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-neon-green/10 file:text-neon-green hover:file:bg-neon-green/20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SECTION VISIBILITY TOGGLES */}
                            <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 rounded-lg border border-white/5">
                                <h4 className="col-span-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Display Settings</h4>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.showNotes ? 'bg-neon-green' : 'bg-gray-700'}`}>
                                        <input type="checkbox" checked={formData.showNotes} onChange={e => setFormData({ ...formData, showNotes: e.target.checked })} className="hidden" />
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${formData.showNotes ? 'left-4.5' : 'left-0.5'}`} />
                                    </div>
                                    <span className="text-xs text-gray-300">Show Notes</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.showPaymentDetails ? 'bg-neon-green' : 'bg-gray-700'}`}>
                                        <input type="checkbox" checked={formData.showPaymentDetails} onChange={e => setFormData({ ...formData, showPaymentDetails: e.target.checked })} className="hidden" />
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${formData.showPaymentDetails ? 'left-4.5' : 'left-0.5'}`} />
                                    </div>
                                    <span className="text-xs text-gray-300">Show A/C Info</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.showUPI ? 'bg-neon-green' : 'bg-gray-700'}`}>
                                        <input type="checkbox" checked={formData.showUPI} onChange={e => setFormData({ ...formData, showUPI: e.target.checked })} className="hidden" />
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${formData.showUPI ? 'left-4.5' : 'left-0.5'}`} />
                                    </div>
                                    <span className="text-xs text-gray-300 font-bold">Show UPI QR</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.showGst ? 'bg-neon-green' : 'bg-gray-700'}`}>
                                        <input type="checkbox" checked={formData.showGst} onChange={e => setFormData({ ...formData, showGst: e.target.checked })} className="hidden" />
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${formData.showGst ? 'left-4.5' : 'left-0.5'}`} />
                                    </div>
                                    <span className="text-xs text-gray-300 font-bold">Add GST</span>
                                </label>
                                {formData.showUPI && (
                                    <div className="col-span-1 mt-2">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">UPI ID for QR</label>
                                        <Input
                                            value={formData.upiId}
                                            onChange={e => setFormData({ ...formData, upiId: e.target.value })}
                                            className="h-8 text-xs"
                                            placeholder="yourname@upi"
                                        />
                                    </div>
                                )}
                                {formData.showGst && (
                                    <div className="col-span-1 mt-2">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">GST %</label>
                                        <Input
                                            type="number"
                                            value={formData.gstPercentage}
                                            onChange={e => setFormData({ ...formData, gstPercentage: parseFloat(e.target.value) || 0 })}
                                            className="h-8 text-xs font-bold"
                                            placeholder="18"
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Advance Paid (₹)</label>
                                <Input
                                    type="number"
                                    value={formData.advancePaid}
                                    onChange={e => setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })}
                                    className="max-w-[200px]"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-6">
                            <div className="flex gap-2">
                                <Button onClick={handleDownload} variant="outline" className="flex-1" disabled={generating}>
                                    <Download className="mr-2 h-4 w-4" /> PDF Preview
                                </Button>
                                <Button onClick={handleSaveToDB} variant="primary" className="flex-1 bg-neon-green text-black hover:bg-neon-green/90" disabled={generating}>
                                    <Save className="mr-2 h-4 w-4" /> Save Invoice
                                </Button>
                            </div>
                            <Button onClick={handleReset} variant="ghost" className="w-full text-xs text-gray-500 hover:text-white border border-white/10" disabled={generating}>
                                + Clear Form / New
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* RIGHT: LIVE PREVIEW */}
                <div className="bg-gray-900 rounded-xl overflow-hidden relative flex items-start justify-center min-h-[500px] sticky top-8 max-h-screen">
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/50 p-2 rounded-lg text-xs text-white">
                        Live Preview
                    </div>

                    <div className="transform scale-[0.55] lg:scale-[0.55] xl:scale-[0.55] 2xl:scale-[0.65] mt-8 origin-top transition-transform">
                        <div
                            ref={invoiceRef}
                            className="w-[794px] min-h-[1123px] bg-[#E5E7EB] text-black relative shadow-2xl"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                            {/* PDF Header */}
                            <div className="p-8 pb-4 flex justify-between items-start relative">
                                <div className="z-10">
                                    <img src="/logo_full.png" alt="NewBi Entertainment" className="h-14 object-contain" />
                                </div>
                                <div className="absolute top-6 right-8 text-right pointer-events-none">
                                    <h1 className="text-4xl font-black text-gray-800 opacity-70">
                                        #{formData.invoiceNumber}
                                    </h1>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase mr-1">INVOICE ID</p>
                                </div>
                            </div>

                            {/* Info Cards Row with Conditional Rendering */}
                            <div className="px-8 py-4 grid grid-cols-2 gap-8">
                                {/* INVOICE BY */}
                                <div className="bg-[#E5E7EB] rounded-xl overflow-hidden border border-gray-300">
                                    <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-800 tracking-wider text-sm border-b border-gray-400/20">
                                        Invoice By
                                    </div>
                                    <div className="p-4 text-sm text-gray-700 space-y-1">
                                        {formData.senderName && <p className="font-black text-lg text-black mb-2">{formData.senderName}</p>}
                                        {formData.senderContact && <p>Contact: {formData.senderContact}</p>}
                                        {formData.senderEmail && <p>Email: {formData.senderEmail}</p>}
                                        {formData.senderPan && <p>PAN: {formData.senderPan}</p>}
                                        {formData.senderGst && <p>GSTIN: {formData.senderGst}</p>}
                                    </div>
                                </div>

                                {/* INVOICE TO */}
                                <div className="bg-[#E5E7EB] rounded-xl overflow-hidden border border-gray-300">
                                    <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-800 tracking-wider text-sm border-b border-gray-400/20">
                                        Invoice To
                                    </div>
                                    <div className="p-4 text-sm text-gray-700 space-y-1">
                                        <p className="font-black text-lg text-black mb-2">{formData.clientName || 'Client Name'}</p>
                                        <p className="mb-1">Date: {new Date(formData.invoiceDate).toLocaleDateString('en-GB')}</p>
                                        {formData.dueDate && <p className="mb-2 text-red-600 font-bold text-xs">Due: {new Date(formData.dueDate).toLocaleDateString('en-GB')}</p>}

                                        {formData.clientAddress && <p className="text-gray-600 italic mb-1">{formData.clientAddress}</p>}
                                        {formData.clientGst && <p className="font-bold border-t border-gray-300 pt-1 mt-1 inline-block">GSTIN: {formData.clientGst}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Main Grid Table */}
                            <div className="px-8 mt-4">
                                <div className="w-full">
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
                                        <div className="h-24 bg-[#E5E7EB] border-b border-dashed border-gray-400"></div>
                                    </div>

                                    <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                        <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Subtotal</div>
                                        <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{subtotal.toLocaleString()}</div>
                                    </div>
                                    {formData.showGst && (
                                        <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                            <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">GST ({formData.gstPercentage}%)</div>
                                            <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{gstAmount.toLocaleString()}</div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                        <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Total</div>
                                        <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{totalAmount.toLocaleString()}</div>
                                    </div>
                                    {formData.advancePaid > 0 && (
                                        <div className="grid grid-cols-12 bg-[#E5E7EB] border-b border-dashed border-gray-400 text-sm font-bold">
                                            <div className="col-span-10 text-right pr-4 py-2 text-gray-600 uppercase">Advance Paid</div>
                                            <div className="col-span-2 text-center py-2 border-l border-dashed border-gray-400">₹{formData.advancePaid.toLocaleString()}</div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-12 bg-[#86EFAC] rounded-b-xl text-lg font-bold">
                                        <div className="col-span-10 text-right pr-4 py-3 text-[#DC2626] uppercase">To Be Paid</div>
                                        <div className="col-span-2 text-center py-3 border-l border-dashed border-gray-400 text-[#DC2626]">₹{toBePaid.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Notes */}
                            <div className="px-8 mt-12 grid grid-cols-2 gap-8 mb-4">
                                {formData.showNotes && formData.note && (
                                    <div className="rounded-xl overflow-hidden">
                                        <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-700 tracking-wide text-sm">Additional Note:</div>
                                        <div className="bg-[#C6CBCE] p-4 text-[10px] whitespace-pre-line leading-relaxed font-bold text-black border-t border-gray-400/20 min-h-[100px]">
                                            {formData.note}
                                        </div>
                                    </div>
                                )}

                                {formData.showPaymentDetails && formData.paymentDetails && (
                                    <div className="rounded-xl overflow-hidden">
                                        <div className="bg-[#86EFAC] py-2 px-4 font-bold uppercase text-gray-700 tracking-wide text-sm">Payment Details:</div>
                                        <div className="bg-[#C6CBCE] p-4 text-[10px] whitespace-pre-line leading-relaxed font-bold text-black border-t border-gray-400/20 min-h-[100px]">
                                            {formData.paymentDetails}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* UPI QR & Signatory Row */}
                            <div className="px-8 mt-4 mb-32 flex justify-between items-end gap-8">
                                {/* UPI QR */}
                                <div className="flex-1">
                                    {formData.showUPI && formData.upiId && (
                                        <div className="flex items-center gap-4 bg-white/50 p-3 rounded-xl border border-gray-300 w-fit">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${formData.upiId}&pn=${formData.senderName}&am=${totalAmount}&cu=INR`)}`}
                                                alt="UPI QR"
                                                className="w-20 h-20"
                                            />
                                            <div className="text-[10px] font-bold text-gray-600">
                                                <p className="uppercase mb-1">Scan to Pay</p>
                                                <p className="font-mono text-[8px]">{formData.upiId}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* AUTHORIZED SIGNATORY */}
                                {formData.showSignatory !== 'none' && (
                                    <div className="text-center min-w-[200px]">
                                        <div className="h-20 flex flex-col items-center justify-end mb-1">
                                            {formData.showSignatory === 'image' && formData.signatoryImage ? (
                                                <img src={formData.signatoryImage} alt="Signature" className="h-16 object-contain mix-blend-multiply" />
                                            ) : (
                                                <div className="h-10"></div>
                                            )}
                                            <div className="w-48 border-b-2 border-gray-600"></div>
                                        </div>
                                        <p className="text-[10px] font-bold uppercase text-gray-600">Authorized Signatory</p>
                                        <p className="text-[8px] text-gray-500">{formData.senderName || 'Newbi Entertainment'}</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Branding */}
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
