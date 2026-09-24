import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';
import Upload from 'lucide-react/dist/esm/icons/upload';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Check from 'lucide-react/dist/esm/icons/check';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

const logoOptions = [
    { id: 'entertainment', label: 'Newbi Entertainment', path: '/logo_document.png', color: '#39FF14' },
    { id: 'media', label: 'Newbi Media', path: '/logo_media.png', color: '#00D1FF' },
    { id: 'marketing', label: 'Newbi Marketing', path: '/logo_marketing.png', color: '#FF0055' }
];

const UploadProposalModal = ({ isOpen, onClose, editingProposal = null, onSuccess }) => {
    const { addProposal, updateProposal, uploadToCloudinary } = useStore();
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [clientName, setClientName] = useState('');
    const [proposalNumber, setProposalNumber] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [dealValue, setDealValue] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [selectedLogo, setSelectedLogo] = useState('entertainment');
    const [status, setStatus] = useState('Draft');
    const [showSignatures, setShowSignatures] = useState(true);
    const [showSeal, setShowSeal] = useState(true);
    const [coverDescription, setCoverDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [error, setError] = useState('');

    // Pre-populate or reset form
    useEffect(() => {
        if (!isOpen) return;

        if (editingProposal) {
            setClientName(editingProposal.clientName || '');
            setProposalNumber(editingProposal.proposalNumber || '');
            setCampaignName(editingProposal.campaignName || '');
            setDealValue(editingProposal.dealValue || editingProposal.totalOverride || '');
            setClientEmail(editingProposal.clientEmail || '');
            setSelectedLogo(editingProposal.selectedLogo || 'entertainment');
            setStatus(editingProposal.status || 'Draft');
            setShowSignatures(editingProposal.showSignatures !== false);
            setShowSeal(editingProposal.showSeal !== false);
            setCoverDescription(editingProposal.coverDescription || '');
            setFile(editingProposal.fileUrl ? {
                name: editingProposal.fileName || 'Uploaded Proposal Document',
                size: editingProposal.fileSize || '',
                url: editingProposal.fileUrl,
                isExisting: true
            } : null);
        } else {
            const randomNum = `NBQ-${Math.floor(1000 + Math.random() * 9000)}`;
            setProposalNumber(randomNum);
            setClientName('');
            setCampaignName('');
            setDealValue('');
            setClientEmail('');
            setSelectedLogo('entertainment');
            setStatus('Draft');
            setShowSignatures(true);
            setShowSeal(true);
            setCoverDescription('');
            setFile(null);
        }
        setError('');
        setUploading(false);
        setUploadProgress('');
    }, [isOpen, editingProposal]);

    if (!isOpen) return null;

    const handleFileProcess = (selectedFile) => {
        if (!selectedFile) return;

        const maxMb = 35;
        if (selectedFile.size > maxMb * 1024 * 1024) {
            setError(`File is too large. Please select a document under ${maxMb}MB.`);
            return;
        }

        setError('');
        setFile(selectedFile);

        // Auto-infer client name if currently empty
        if (!clientName.trim()) {
            const cleanName = selectedFile.name
                .replace(/\.[^/.]+$/, '') // remove extension
                .replace(/[_-]+/g, ' ') // replace dashes/underscores with space
                .replace(/\b(proposal|quote|quotation|v\d+|final|draft|deck|presentation)\b/gi, '')
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
            setError('Please enter the client or entity name.');
            return;
        }

        if (!file && !editingProposal?.fileUrl) {
            setError('Please upload a pre-made proposal document (PDF or document file).');
            return;
        }

        setUploading(true);

        try {
            let fileUrl = editingProposal?.fileUrl || '';
            let fileName = editingProposal?.fileName || '';
            let fileSize = editingProposal?.fileSize || '';
            let fileType = editingProposal?.fileType || 'pdf';

            // If a new physical file is provided, upload it to storage
            if (file && !file.isExisting) {
                setUploadProgress('Uploading document to Vault CDN...');
                fileUrl = await uploadToCloudinary(file);
                if (!fileUrl) {
                    throw new Error('Upload failed. Could not obtain secure URL.');
                }
                fileName = file.name;
                fileSize = formatBytes(file.size);
                fileType = file.name.split('.').pop()?.toLowerCase() || 'pdf';
            }

            setUploadProgress('Configuring proposal in Vault...');

            const proposalData = {
                clientName: clientName.trim(),
                proposalNumber: proposalNumber.trim() || `NBQ-${Math.floor(1000 + Math.random() * 9000)}`,
                campaignName: campaignName.trim(),
                dealValue: dealValue ? String(dealValue).trim() : '',
                totalOverride: dealValue ? Number(dealValue) : null,
                clientEmail: clientEmail.trim(),
                selectedLogo,
                status,
                showSignatures,
                showSeal,
                coverDescription: coverDescription.trim(),
                isUploaded: true,
                fileUrl,
                fileName,
                fileSize,
                fileType,
                items: editingProposal?.items || [],
                updatedAt: new Date().toISOString()
            };

            let savedId = editingProposal?.id;
            if (editingProposal?.id) {
                await updateProposal(editingProposal.id, proposalData);
                useStore.getState().addToast('Hosted proposal updated successfully!', 'success');
            } else {
                savedId = await addProposal(proposalData);
                useStore.getState().addToast('Pre-made proposal uploaded & hosted in Vault!', 'success');
            }

            if (onSuccess) onSuccess(savedId);
            onClose();
        } catch (err) {
            console.error('Error saving uploaded proposal:', err);
            setError(err.message || 'Failed to host proposal. Please try again.');
        } finally {
            setUploading(false);
            setUploadProgress('');
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
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-[0_0_15px_rgba(57,255,20,0.2)]">
                            <Upload size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight italic font-heading">
                                    {editingProposal ? 'Edit Hosted Proposal' : 'Upload Pre-Made Proposal'}
                                </h3>
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/20 tracking-wider">
                                    Vault Host
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                Host custom PDF/deck, track views, send emails & collect client e-signatures
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
                            Proposal Document (PDF, Presentation, or File) <span className="text-neon-green">*</span>
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
                                        ? "border-neon-green bg-neon-green/10 scale-[0.99]"
                                        : "border-white/15 hover:border-neon-green/50 bg-white/[0.02] hover:bg-white/[0.04]"
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleFileProcess(e.target.files[0]);
                                        }
                                    }}
                                    className="hidden"
                                />
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-neon-green group-hover:scale-110 transition-all">
                                    <Upload size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                                        Click to browse or drag & drop proposal
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-medium tracking-wide mt-1">
                                        PDF files recommended • Also supports Word docs & presentations (up to 35MB)
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
                                        <FileText size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{file.name}</p>
                                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-0.5">
                                            {formatBytes(file.size) || 'Attached Document'} • Ready for Vault
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

                    {/* Basic Meta: Client Name & Quotation # */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Client / Entity Name <span className="text-neon-green">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="e.g. Red Bull India, Google"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider text-white placeholder:text-gray-600 outline-none focus:border-neon-green/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Proposal Reference # <span className="text-neon-green">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={proposalNumber}
                                onChange={(e) => setProposalNumber(e.target.value)}
                                placeholder="e.g. NBQ-8821"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-mono font-bold uppercase tracking-wider text-white placeholder:text-gray-600 outline-none focus:border-neon-green/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Campaign Title & Commercial Value */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Project / Campaign Mission
                            </label>
                            <input
                                type="text"
                                value={campaignName}
                                onChange={(e) => setCampaignName(e.target.value)}
                                placeholder="e.g. Creator Partnership 2026"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-medium tracking-wide text-white placeholder:text-gray-600 outline-none focus:border-neon-green/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Deal Value / Commercials (INR ₹)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                                <input
                                    type="number"
                                    value={dealValue}
                                    onChange={(e) => setDealValue(e.target.value)}
                                    placeholder="e.g. 250000"
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 text-xs font-mono font-bold text-white placeholder:text-gray-600 outline-none focus:border-neon-green/50 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Client Email & Initial Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Client Recipient Email (For 1-Click Send)
                            </label>
                            <input
                                type="email"
                                value={clientEmail}
                                onChange={(e) => setClientEmail(e.target.value)}
                                placeholder="client@company.com"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-medium text-white placeholder:text-gray-600 outline-none focus:border-neon-green/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Initial Status
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Draft', 'Sent', 'Accepted'].map((s) => (
                                    <button
                                        type="button"
                                        key={s}
                                        onClick={() => setStatus(s)}
                                        className={cn(
                                            "h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                            status === s
                                                ? "bg-neon-green text-black border-neon-green shadow-[0_0_15px_rgba(57,255,20,0.3)] font-black"
                                                : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Brand Entity / Division Selector */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">
                            Issuing Brand Division
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                            {logoOptions.map((opt) => (
                                <button
                                    type="button"
                                    key={opt.id}
                                    onClick={() => setSelectedLogo(opt.id)}
                                    className={cn(
                                        "p-3 rounded-xl border text-left transition-all flex items-center gap-3",
                                        selectedLogo === opt.id
                                            ? "border-neon-green bg-neon-green/10 text-white"
                                            : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-gray-400"
                                    )}
                                >
                                    <img src={opt.path} alt={opt.label} className="h-6 w-auto object-contain" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-wider truncate text-white">{opt.label}</p>
                                    </div>
                                    {selectedLogo === opt.id && (
                                        <Check size={14} className="ml-auto text-neon-green shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Features & Options (E-Signature & Seal) */}
                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neon-green flex items-center gap-1.5">
                            <ShieldCheck size={14} /> Vault Client Features
                        </p>
                        
                        <div className="flex items-center justify-between py-1">
                            <div>
                                <p className="text-xs font-bold text-white">Enable Client E-Signatures & Online Sign-Off</p>
                                <p className="text-[10px] text-gray-500">Allow clients to digitally authorize and accept this proposal online on the hosted page</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={showSignatures}
                                onChange={(e) => setShowSignatures(e.target.checked)}
                                className="w-5 h-5 accent-neon-green rounded cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between py-1 border-t border-white/5 pt-2">
                            <div>
                                <p className="text-xs font-bold text-white">Official Newbi Document Seal</p>
                                <p className="text-[10px] text-gray-500">Stamp official cryptographic authorization seal once accepted</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={showSeal}
                                onChange={(e) => setShowSeal(e.target.checked)}
                                className="w-5 h-5 accent-neon-green rounded cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Optional Executive Note */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                            Executive Cover Note / Context for Client (Optional)
                        </label>
                        <textarea
                            rows={3}
                            value={coverDescription}
                            onChange={(e) => setCoverDescription(e.target.value)}
                            placeholder="Add a personalized memorandum note that the client sees above the hosted proposal document..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-gray-600 outline-none focus:border-neon-green/50 transition-colors"
                        />
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="px-6 sm:px-8 py-4 sm:py-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-white/[0.02]">
                    <div className="text-[10px] font-mono text-gray-400">
                        {uploadProgress || 'Vault URL, analytics & sharing link created automatically'}
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
                            className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-neon-green hover:bg-neon-green/90 text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_4px_16px_rgba(57,255,20,0.4)] hover:shadow-[0_6px_24px_rgba(57,255,20,0.6)] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {uploading ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Hosting...</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={14} />
                                    <span>{editingProposal ? 'Update in Vault' : 'Host in Vault'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default UploadProposalModal;
