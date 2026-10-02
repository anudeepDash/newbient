import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';
import Upload from 'lucide-react/dist/esm/icons/upload';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Scale from 'lucide-react/dist/esm/icons/scale';
import Check from 'lucide-react/dist/esm/icons/check';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import SignatureModal from '../ui/SignatureModal';

const contractTemplates = [
    'Service Agreement',
    'Influencer Agreement',
    'Non-Disclosure Agreement (NDA)',
    'Memorandum of Understanding (MOU)',
    'Talent Management Agreement',
    'Brand Partnership Contract',
    'Consultancy Agreement',
    'Custom Contract'
];

const UploadAgreementModal = ({ isOpen, onClose, editingAgreement = null, onSuccess }) => {
    const { addAgreement, updateAgreement, uploadAgreementFile } = useStore();
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Contract Meta
    const [agreementNumber, setAgreementNumber] = useState('');
    const [template, setTemplate] = useState('Service Agreement');
    const [projectName, setProjectName] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('Draft');

    // Second Party (Client / Counterparty)
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientAddress, setClientAddress] = useState('');

    // First Party (Provider)
    const [providerName, setProviderName] = useState('Newbi Entertainment & Marketing LLP');
    const [providerEmail, setProviderEmail] = useState('legal@newbi.live');
    const [providerSignatoryName, setProviderSignatoryName] = useState('Authorized Signatory');
    const [providerDesignation, setProviderDesignation] = useState('Director of Operations');

    // Commercials
    const [currency, setCurrency] = useState('INR');
    const [totalValue, setTotalValue] = useState('');

    // Legal & Signatures
    const [showSignatures, setShowSignatures] = useState(true);
    const [showSeal, setShowSeal] = useState(true);
    const [providerSignature, setProviderSignature] = useState(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    // Optional Notice / Memo
    const [coverDescription, setCoverDescription] = useState('');

    // Upload & Progress State
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [uploadPercent, setUploadPercent] = useState(0);
    const [error, setError] = useState('');

    // Pre-populate or reset form
    useEffect(() => {
        if (!isOpen) return;

        if (editingAgreement) {
            setAgreementNumber(editingAgreement.agreementNumber || '');
            setTemplate(editingAgreement.template || editingAgreement.type || 'Service Agreement');
            setProjectName(editingAgreement.details?.projectName || '');
            setEffectiveDate(editingAgreement.effectiveDate ? editingAgreement.effectiveDate.split('T')[0] : new Date().toISOString().split('T')[0]);
            setStatus(editingAgreement.status || 'Draft');

            setClientName(editingAgreement.parties?.secondParty?.name || editingAgreement.clientName || '');
            setClientEmail(editingAgreement.parties?.secondParty?.email || editingAgreement.clientEmail || '');
            setClientAddress(editingAgreement.parties?.secondParty?.address || '');

            setProviderName(editingAgreement.parties?.firstParty?.name || 'Newbi Entertainment & Marketing LLP');
            setProviderEmail(editingAgreement.parties?.firstParty?.email || 'legal@newbi.live');
            setProviderSignatoryName(editingAgreement.providerName || 'Authorized Signatory');
            setProviderDesignation(editingAgreement.providerDesignation || 'Director of Operations');

            setCurrency(editingAgreement.commercials?.currency || 'INR');
            setTotalValue(editingAgreement.commercials?.totalValue || editingAgreement.amount || '');

            setShowSignatures(editingAgreement.showSignatures !== false);
            setShowSeal(editingAgreement.showSeal !== false);
            setProviderSignature(editingAgreement.providerSignature || editingAgreement.ourSignature || null);
            setCoverDescription(editingAgreement.coverDescription || editingAgreement.details?.purpose || '');

            setFile(editingAgreement.fileUrl ? {
                name: editingAgreement.fileName || 'Uploaded Contract Document',
                size: editingAgreement.fileSize || '',
                url: editingAgreement.fileUrl,
                isExisting: true
            } : null);
        } else {
            const year = new Date().getFullYear();
            const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            setAgreementNumber(`NB-AGR-${year}-${randomCode}`);
            setTemplate('Service Agreement');
            setProjectName('');
            setEffectiveDate(new Date().toISOString().split('T')[0]);
            setStatus('Draft');

            setClientName('');
            setClientEmail('');
            setClientAddress('');

            setProviderName('Newbi Entertainment & Marketing LLP');
            setProviderEmail('legal@newbi.live');
            setProviderSignatoryName('Authorized Signatory');
            setProviderDesignation('Director of Operations');

            setCurrency('INR');
            setTotalValue('');

            setShowSignatures(true);
            setShowSeal(true);
            setProviderSignature(null);
            setCoverDescription('');
            setFile(null);
        }

        setError('');
        setUploading(false);
        setUploadProgress('');
        setUploadPercent(0);
    }, [isOpen, editingAgreement]);

    if (!isOpen) return null;

    const handleFileProcess = (selectedFile) => {
        if (!selectedFile) return;

        const maxMb = 35;
        if (selectedFile.size > maxMb * 1024 * 1024) {
            setError(`File is too large. Please select a contract document under ${maxMb}MB.`);
            return;
        }

        setError('');
        setFile(selectedFile);

        // Auto-infer client name if empty
        if (!clientName.trim()) {
            const cleanName = selectedFile.name
                .replace(/\.[^/.]+$/, '')
                .replace(/[_-]+/g, ' ')
                .replace(/\b(contract|agreement|nda|mou|signed|final|draft|v\d+|execution)\b/gi, '')
                .trim();
            if (cleanName.length > 2) {
                setClientName(cleanName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1)));
            }
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileProcess(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '';
        if (typeof bytes === 'string') return bytes;
        const k = 1024;
        const dm = 1;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!clientName.trim()) {
            setError('Please enter the Counterparty / Client name.');
            return;
        }

        if (!file && !editingAgreement?.fileUrl) {
            setError('Please select or upload a contract document (PDF or document file).');
            return;
        }

        setUploading(true);
        setUploadPercent(0);

        try {
            let fileUrl = editingAgreement?.fileUrl || '';
            let fileName = editingAgreement?.fileName || '';
            let fileSize = editingAgreement?.fileSize || '';
            let fileType = editingAgreement?.fileType || 'pdf';

            // Fast Cloudinary streaming if physical file is newly selected
            if (file && !file.isExisting) {
                setUploadProgress('Initiating fast upload to Contract Vault CDN...');
                setUploadPercent(5);

                const result = await uploadAgreementFile(file, (percent) => {
                    setUploadPercent(percent);
                    if (percent < 100) {
                        setUploadProgress(`Uploading contract document: ${percent}%`);
                    } else {
                        setUploadProgress('Securing instrument in Vault CDN...');
                    }
                });

                if (!result || !result.url) {
                    throw new Error('Upload failed. Could not obtain secure contract URL.');
                }
                fileUrl = result.url;
                fileName = result.fileName || file.name;
                fileSize = formatBytes(result.fileSize || file.size);
                fileType = result.fileType || 'pdf';
            }

            setUploadPercent(100);
            setUploadProgress('Finalizing contract in Vault...');

            const agreementData = {
                agreementNumber: agreementNumber.trim() || `NB-AGR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                type: template,
                template: template,
                status: status,
                effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
                parties: {
                    firstParty: {
                        name: providerName.trim() || 'Newbi Entertainment & Marketing LLP',
                        email: providerEmail.trim() || 'legal@newbi.live',
                        role: 'Service Provider',
                        address: 'Bangalore, India'
                    },
                    secondParty: {
                        name: clientName.trim(),
                        email: clientEmail.trim(),
                        address: clientAddress.trim(),
                        role: 'Client'
                    }
                },
                details: {
                    projectName: projectName.trim() || `${template} - ${clientName.trim()}`,
                    purpose: coverDescription.trim(),
                    territory: 'India'
                },
                commercials: {
                    totalValue: totalValue ? String(totalValue).trim() : '',
                    currency: currency || 'INR',
                    paymentSchedule: 'As per mutually executed instrument schedule.',
                    gstIncluded: true
                },
                clauses: editingAgreement?.clauses || [],
                showSignatures,
                showSeal,
                providerSignature,
                providerName: providerSignatoryName.trim() || 'Authorized Signatory',
                providerDesignation: providerDesignation.trim() || 'Director of Operations',
                ourSignature: providerSignature,
                coverDescription: coverDescription.trim(),
                isUploaded: true,
                fileUrl,
                fileName,
                fileSize,
                fileType,
                updatedAt: new Date().toISOString()
            };

            let savedId = editingAgreement?.id;
            if (editingAgreement?.id) {
                await updateAgreement(editingAgreement.id, agreementData);
                useStore.getState().addToast('Hosted contract updated successfully!', 'success');
            } else {
                savedId = await addAgreement(agreementData);
                useStore.getState().addToast('Pre-made contract hosted in Vault!', 'success');
            }

            if (onSuccess) onSuccess(savedId);
            onClose();
        } catch (err) {
            console.error('Error saving uploaded contract:', err);
            setError(err.message || 'Failed to host contract. Please try again.');
        } finally {
            setUploading(false);
            setUploadProgress('');
            setUploadPercent(0);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={uploading ? undefined : onClose}
                className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden my-auto max-h-[92vh] flex flex-col text-white"
            >
                {/* Header */}
                <div className="px-6 sm:px-8 py-5 sm:py-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                            <Scale size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight italic font-heading">
                                    {editingAgreement ? 'Edit Hosted Contract' : 'Upload Pre-Made Contract'}
                                </h3>
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20 tracking-wider">
                                    Vault Legal Host
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                Host legal agreements, track counterparty signatures & manage digital execution
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="p-2 sm:p-2.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto scrollbar-hide flex-1">
                    {error && (
                        <div className="p-3.5 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-semibold">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* File Dropzone */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">
                            Contract / Agreement Document (PDF or Document File) <span className="text-[#A855F7]">*</span>
                        </label>
                        
                        {!file ? (
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 group",
                                    isDragging
                                        ? "border-[#A855F7] bg-[#A855F7]/10 scale-[0.99]"
                                        : "border-white/15 hover:border-[#A855F7]/50 bg-white/[0.02] hover:bg-white/[0.04]"
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleFileProcess(e.target.files[0]);
                                        }
                                    }}
                                    className="hidden"
                                />
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-[#A855F7] group-hover:scale-110 transition-all">
                                    <Upload size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                                        Click to browse or drag & drop contract
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-medium tracking-wide mt-1">
                                        PDF files recommended • Also supports Word documents (up to 35MB)
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7] shrink-0">
                                        <FileText size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{file.name}</p>
                                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-0.5">
                                            {formatBytes(file.size) || 'Attached Document'} • Ready for Contract Vault
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {file.url && (
                                        <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                            title="Preview existing file"
                                        >
                                            <Eye size={16} />
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                        title="Remove / change file"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contract Template & Reference Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Agreement / Contract Ref # <span className="text-[#A855F7]">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={agreementNumber}
                                onChange={(e) => setAgreementNumber(e.target.value)}
                                placeholder="e.g. NB-AGR-2026-X8B2"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-mono font-bold uppercase tracking-wider text-white placeholder:text-gray-600 outline-none focus:border-[#A855F7]/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Instrument Type / Template <span className="text-[#A855F7]">*</span>
                            </label>
                            <select
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                className="w-full h-12 bg-zinc-800 border border-white/10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-[#A855F7]/50 transition-colors cursor-pointer"
                            >
                                {contractTemplates.map((t) => (
                                    <option key={t} value={t} className="bg-zinc-900 text-white">
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Counterparty / Client Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Second Party / Client Name <span className="text-[#A855F7]">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="e.g. Red Bull India, Google, Creator Name"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-white placeholder:text-gray-600 outline-none focus:border-[#A855F7]/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Client Email (For Sharing & Verification)
                            </label>
                            <input
                                type="email"
                                value={clientEmail}
                                onChange={(e) => setClientEmail(e.target.value)}
                                placeholder="client@company.com"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-medium text-white placeholder:text-gray-600 outline-none focus:border-[#A855F7]/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Project Name & Valuation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Project / Engagement Title
                            </label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="e.g. Talent Representation & Brand Deals"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-medium tracking-wide text-white placeholder:text-gray-600 outline-none focus:border-[#A855F7]/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Total Valuation / Commercials
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-24 h-12 bg-zinc-800 border border-white/10 rounded-xl px-2 text-xs font-mono font-bold text-white outline-none focus:border-[#A855F7]/50 transition-colors"
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="AED">AED</option>
                                </select>
                                <input
                                    type="text"
                                    value={totalValue}
                                    onChange={(e) => setTotalValue(e.target.value)}
                                    placeholder="e.g. 5,00,000"
                                    className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-mono font-bold text-white placeholder:text-gray-600 outline-none focus:border-[#A855F7]/50 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Effective Date & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Effective Date
                            </label>
                            <input
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-mono font-bold text-white outline-none focus:border-[#A855F7]/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Contract Status
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Draft', 'Final', 'Executed'].map((s) => (
                                    <button
                                        type="button"
                                        key={s}
                                        onClick={() => setStatus(s)}
                                        className={cn(
                                            "h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                            status === s
                                                ? "bg-[#A855F7] text-black border-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.3)] font-black"
                                                : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Legal & Execution Features (Signatures, Seal, Provider Signature) */}
                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#A855F7] flex items-center gap-1.5">
                            <ShieldCheck size={14} /> Execution & Legal Controls
                        </p>
                        
                        <div className="flex items-center justify-between py-1">
                            <div>
                                <p className="text-xs font-bold text-white">Enable Counterparty E-Signature & Online Execution</p>
                                <p className="text-[10px] text-gray-500">Allow client/counterparty to draw, adopt & verify signature online</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={showSignatures}
                                onChange={(e) => setShowSignatures(e.target.checked)}
                                className="w-5 h-5 accent-[#A855F7] rounded cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between py-1 border-t border-white/5 pt-2">
                            <div>
                                <p className="text-xs font-bold text-white">Official Newbi Cryptographic Seal</p>
                                <p className="text-[10px] text-gray-500">Render official corporate verification seal once executed</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={showSeal}
                                onChange={(e) => setShowSeal(e.target.checked)}
                                className="w-5 h-5 accent-[#A855F7] rounded cursor-pointer"
                            />
                        </div>

                        {/* Pre-signed Provider Signature */}
                        <div className="flex flex-col gap-3 py-1 border-t border-white/5 pt-3">
                            <div>
                                <p className="text-xs font-bold text-white">Provider Pre-Signature (Our Signature)</p>
                                <p className="text-[10px] text-gray-500">Apply Newbi authorized signature to the contract before sending for execution.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                        Provider Signatory Name
                                    </label>
                                    <input
                                        type="text"
                                        value={providerSignatoryName}
                                        onChange={(e) => setProviderSignatoryName(e.target.value)}
                                        placeholder="e.g. Authorized Signatory"
                                        className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs font-medium text-white outline-none focus:border-[#A855F7]/50 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                        Title / Designation
                                    </label>
                                    <input
                                        type="text"
                                        value={providerDesignation}
                                        onChange={(e) => setProviderDesignation(e.target.value)}
                                        placeholder="e.g. Director of Operations"
                                        className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs font-medium text-white outline-none focus:border-[#A855F7]/50 transition-colors"
                                    />
                                </div>
                            </div>
                            
                            <div 
                                onClick={() => setIsSignatureModalOpen(true)}
                                className="h-16 border-2 border-dashed border-white/15 hover:border-[#A855F7]/40 bg-white/[0.02] rounded-xl flex items-center justify-center cursor-pointer transition-all p-2 w-full max-w-[240px]"
                            >
                                {providerSignature ? (
                                    <img src={providerSignature} alt="Provider Signature" className="max-h-full object-contain filter invert" />
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-gray-500 hover:text-[#A855F7] transition-colors">
                                        <PenTool size={16} />
                                        <p className="text-[9px] font-bold uppercase tracking-widest">
                                            Click to Draw Provider Signature
                                        </p>
                                    </div>
                                )}
                            </div>
                            {providerSignature && (
                                <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setProviderSignature(null); }}
                                    className="text-[9px] text-red-500 uppercase tracking-widest font-bold self-start hover:underline"
                                >
                                    Remove Signature
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Optional Context Memo */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                            Instrument Notice / Recital Context (Optional)
                        </label>
                        <textarea
                            rows={3}
                            value={coverDescription}
                            onChange={(e) => setCoverDescription(e.target.value)}
                            placeholder="Add legal notice or context that counterparty sees alongside the document..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-gray-600 outline-none focus:border-[#A855F7]/50 transition-colors"
                        />
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="px-6 sm:px-8 py-4 sm:py-5 border-t border-white/10 flex flex-col gap-3 shrink-0 bg-white/[0.02]">
                    {uploading && (
                        <div className="w-full space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-[#A855F7] font-bold flex items-center gap-1.5">
                                    <RefreshCw size={11} className="animate-spin text-[#A855F7]" />
                                    {uploadProgress || 'Uploading...'}
                                </span>
                                <span className="text-[#A855F7] font-black">{uploadPercent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[#A855F7] shadow-[0_0_10px_rgba(168,85,247,0.8)] transition-all duration-150 ease-out rounded-full"
                                    style={{ width: `${uploadPercent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                        <div className="text-[10px] font-mono text-gray-400">
                            {uploading ? (
                                <span className="text-gray-300">Fast-streaming contract to Vault CDN • Please wait</span>
                            ) : (
                                'Contract Vault link, analytics & e-signing ready upon save'
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={uploading}
                                className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={uploading}
                                className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-[#A855F7] hover:bg-[#A855F7]/90 text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_4px_16px_rgba(168,85,247,0.4)] hover:shadow-[0_6px_24px_rgba(168,85,247,0.6)] flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {uploading ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span>Hosting ({uploadPercent}%)...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={14} />
                                        <span>{editingAgreement ? 'Update in Vault' : 'Host Contract'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            <SignatureModal 
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSave={(data) => {
                    setProviderSignature(data);
                    setIsSignatureModalOpen(false);
                }}
            />
        </div>,
        document.body
    );
};

export default UploadAgreementModal;
