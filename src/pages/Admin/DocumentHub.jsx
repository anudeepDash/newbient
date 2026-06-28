import React, { useState, useCallback, useRef, useEffect } from 'react';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Loader from 'lucide-react/dist/esm/icons/loader';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Lock from 'lucide-react/dist/esm/icons/lock';
import File from 'lucide-react/dist/esm/icons/file';
import Sheet from 'lucide-react/dist/esm/icons/sheet';
import HardDrive from 'lucide-react/dist/esm/icons/hard-drive';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Tag from 'lucide-react/dist/esm/icons/tag';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import FileBadge from 'lucide-react/dist/esm/icons/file-badge';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    google_doc: { label: 'GOOGLE DOC', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: FileText, pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    google_sheet: { label: 'GOOGLE SHEET', color: 'text-neon-blue', bg: 'bg-neon-blue/10', border: 'border-neon-blue/20', icon: Sheet, pill: 'bg-neon-blue/15 text-neon-blue border-neon-blue/20' },
    google_drive: { label: 'GOOGLE DRIVE', color: 'text-neon-purple', bg: 'bg-neon-purple/10', border: 'border-neon-purple/20', icon: HardDrive, pill: 'bg-neon-purple/15 text-neon-purple border-neon-purple/20' },
    pdf: { label: 'PDF', color: 'text-neon-pink', bg: 'bg-neon-pink/10', border: 'border-neon-pink/20', icon: FileText, pill: 'bg-neon-pink/15 text-neon-pink border-neon-pink/20' },
    file: { label: 'FILE', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: File, pill: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
};

const FILTER_PILLS = [
    { key: 'all', label: 'ALL', color: 'bg-white/10 text-white border-white/10' },
    { key: 'google_doc', label: 'GOOGLE DOCS', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    { key: 'google_sheet', label: 'SHEETS', color: 'bg-neon-blue/15 text-neon-blue border-neon-blue/20' },
    { key: 'google_drive', label: 'DRIVE', color: 'bg-neon-purple/15 text-neon-purple border-neon-purple/20' },
    { key: 'pdf', label: 'PDFs', color: 'bg-neon-pink/15 text-neon-pink border-neon-pink/20' },
    { key: 'file', label: 'FILES', color: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
];

const detectGoogleDocType = (url) => {
    if (/docs\.google\.com\/document/.test(url)) return 'google_doc';
    if (/docs\.google\.com\/spreadsheets/.test(url)) return 'google_sheet';
    return null;
};

const convertToEmbedUrl = (url, type) => {
    if (type === 'google_doc') {
        return url.replace(/\/(edit|view)(#.*)?(\?.*)?$/, '/preview');
    }
    if (type === 'google_sheet') {
        return url.replace(/\/(edit|view)(#.*)?(\?.*)?$/, '/preview');
    }
    return url;
};

const convertDriveToEmbed = (url) => {
    // File: drive.google.com/file/d/{ID}/... → .../preview
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
        return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    }
    // Folder: drive.google.com/drive/folders/{ID}
    const folderMatch = url.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
        return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#list`;
    }
    // Open?id= pattern
    const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch) {
        return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
    }
    return url;
};

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Modal Tabs ─────────────────────────────────────────────────────────────────

const MODAL_TABS = [
    { key: 'google_doc', label: 'GOOGLE DOC', icon: FileText },
    { key: 'google_drive', label: 'GOOGLE DRIVE', icon: HardDrive },
    { key: 'upload', label: 'UPLOAD FILE', icon: Upload },
];

// ─── Document Card Sub-component (Premium Revamp) ───────────────────────────────

const DocumentCard = ({ doc, onPreview, onCopyLink, onTogglePublic, onDelete }) => {
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePos({ x, y });
    };

    const cfg = TYPE_CONFIG[doc.type] || TYPE_CONFIG.file;
    const Icon = cfg.icon;

    const typeGlows = {
        google_doc: '#39FF14',    // Emerald Green
        google_sheet: '#00F0FF',  // Cyber Blue
        google_drive: '#BF00FF',  // Neon Purple
        pdf: '#FF4F8B',           // Neon Pink
        file: '#9ca3af'           // Gray
    };
    const glowColor = typeGlows[doc.type] || '#ffffff';

    return (
        <div className="relative group">
            {/* Ambient Background Glow (shines outside the card boundaries) */}
            <div 
                className={cn(
                    "absolute -right-4 -top-4 w-32 h-32 rounded-full blur-[60px] opacity-10 group-hover:opacity-25 transition-opacity duration-700 pointer-events-none",
                    doc.type === 'google_doc' && 'bg-[#39FF14]',
                    doc.type === 'google_sheet' && 'bg-[#00F0FF]',
                    doc.type === 'google_drive' && 'bg-[#BF00FF]',
                    doc.type === 'pdf' && 'bg-[#FF4F8B]',
                    doc.type === 'file' && 'bg-gray-500'
                )}
            />
            <div 
                className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full blur-[40px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none bg-white"
            />

            {/* Card Content Container */}
            <div 
                onMouseMove={handleMouseMove}
                className={cn(
                    "p-6 bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:from-white/[0.07] hover:to-white/[0.02] backdrop-blur-xl border border-white/10 border-t-white/20 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_0_8px_32px_rgba(0,0,0,0.4)] hover:border-white/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.65)] transition-all duration-500 flex flex-col justify-between h-[250px] relative overflow-hidden hover:translate-y-[-4px]"
                )}
                style={{ 
                    background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, ${glowColor}0D 0%, rgba(255,255,255,0.01) 60%)`
                }}
            >
                {/* Subtle Inner Glass Radial Overlay */}
                <div className="absolute inset-0 bg-white/[0.01] pointer-events-none group-hover:bg-white/[0.02] transition-colors duration-500" />

                {/* Header: Badge + Visibility */}
                <div className="flex items-center justify-between relative z-10">
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.2em] bg-white/[0.03] border-white/10 backdrop-blur-md shadow-sm", cfg.pill)}>
                        <Icon size={9} className="animate-pulse" />
                        {cfg.label}
                    </div>
                    <div>
                        {doc.isPublic ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/90">PUBLIC</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2 py-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/90">PRIVATE</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Title & Description */}
                <div className="my-auto relative z-10 space-y-1.5 pt-2">
                    <h3 className="text-xl font-black font-heading uppercase italic tracking-tight text-white group-hover:text-neon-blue transition-colors duration-300 leading-tight line-clamp-2 drop-shadow-md">
                        {doc.title}
                    </h3>
                    {doc.description ? (
                        <p className="text-[11px] font-medium text-gray-400 tracking-normal line-clamp-2 leading-relaxed">
                            {doc.description}
                        </p>
                    ) : (
                        <p className="text-[10px] font-medium text-gray-600 tracking-normal italic">
                            No description provided.
                        </p>
                    )}
                </div>

                {/* Footer Row: Metadata (Left) + Actions (Right) */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 mt-1 relative z-10 gap-2">
                    {/* Metadata */}
                    <div className="flex items-center gap-1.5 min-w-0">
                        {doc.fileSize > 0 && (
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] px-2 py-1 bg-white/[0.02] border border-white/5 rounded-lg shrink-0">
                                {formatFileSize(doc.fileSize)}
                            </span>
                        )}
                        {doc.createdAt && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] px-2 py-1 bg-white/[0.02] border border-white/5 rounded-lg shrink-0">
                                <Calendar size={8} className="text-gray-600" />
                                {formatDate(doc.createdAt)}
                            </span>
                        )}
                    </div>

                    {/* Actions (Floating circular glass buttons with individual glow hovers) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => onPreview(doc)}
                            className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-400 hover:text-neon-blue hover:border-neon-blue/30 hover:bg-neon-blue/10 hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] transition-all duration-300"
                            title="View Document"
                        >
                            <Eye size={13} />
                        </button>
                        <button
                            onClick={() => onCopyLink(doc)}
                            className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-400 hover:text-neon-purple hover:border-neon-purple/30 hover:bg-neon-purple/10 hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(168,85,247,0.35)] transition-all duration-300"
                            title="Copy Shareable Link"
                        >
                            <Link2 size={13} />
                        </button>
                        <button
                            onClick={() => onTogglePublic(doc)}
                            className={cn(
                                "w-9 h-9 rounded-full border flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300",
                                doc.isPublic
                                    ? "bg-white/[0.03] border-white/10 text-emerald-400 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                                    : "bg-white/[0.03] border-white/10 text-amber-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.35)]"
                            )}
                            title={doc.isPublic ? "Set to Private" : "Set to Public"}
                        >
                            {doc.isPublic ? <Lock size={13} /> : <Globe size={13} />}
                        </button>
                        <button
                            onClick={() => onDelete(doc)}
                            className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-red-500/70 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(239,68,68,0.35)] transition-all duration-300"
                            title="Delete Document"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Component ──────────────────────────────────────────────────────────────────

const DocumentHub = () => {
    const { documents, addDocument, updateDocument, deleteDocument, uploadDocumentFile, user, addToast } = useStore();

    const vaultTabs = [
        ...(['developer', 'founder'].includes(user?.role) ? [{ name: 'Invoices', path: '/admin/invoices', icon: FileText, color: 'text-neon-blue' }] : []),
        { name: 'Proposals', path: '/admin/proposals', icon: FileSpreadsheet, color: 'text-neon-green' },
        { name: 'Contracts', path: '/admin/agreements', icon: ShieldCheck, color: 'text-neon-purple' },
        { name: 'Gen. Documents', path: '/admin/gen-documents', icon: FileBadge, color: 'text-neon-green' },
        { name: 'Documents', path: '/admin/documents', icon: FolderOpen, color: 'text-neon-blue' },
    ];

    // UI state
    const [showAddModal, setShowAddModal] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [previewDoc, setPreviewDoc] = useState(null);
    const [activeTab, setActiveTab] = useState('google_doc');
    const [saving, setSaving] = useState(false);

    // Google Doc/Sheet form
    const [googleUrl, setGoogleUrl] = useState(() => localStorage.getItem('newbi_doc_draft_google_url') || '');
    const [detectedType, setDetectedType] = useState(null);
    const [docTitle, setDocTitle] = useState(() => localStorage.getItem('newbi_doc_draft_google_title') || '');
    const [docDescription, setDocDescription] = useState(() => localStorage.getItem('newbi_doc_draft_google_desc') || '');
    const [docTags, setDocTags] = useState(() => localStorage.getItem('newbi_doc_draft_google_tags') || '');
    const [docIsPublic, setDocIsPublic] = useState(() => {
        const stored = localStorage.getItem('newbi_doc_draft_google_public');
        return stored === null ? true : stored === 'true';
    });

    // Google Drive form
    const [driveUrl, setDriveUrl] = useState(() => localStorage.getItem('newbi_doc_draft_drive_url') || '');
    const [driveTitle, setDriveTitle] = useState(() => localStorage.getItem('newbi_doc_draft_drive_title') || '');
    const [driveDescription, setDriveDescription] = useState(() => localStorage.getItem('newbi_doc_draft_drive_desc') || '');
    const [driveTags, setDriveTags] = useState(() => localStorage.getItem('newbi_doc_draft_drive_tags') || '');
    const [driveIsPublic, setDriveIsPublic] = useState(() => {
        const stored = localStorage.getItem('newbi_doc_draft_drive_public');
        return stored === null ? true : stored === 'true';
    });

    // Upload form
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadTitle, setUploadTitle] = useState(() => localStorage.getItem('newbi_doc_draft_upload_title') || '');
    const [uploadDescription, setUploadDescription] = useState(() => localStorage.getItem('newbi_doc_draft_upload_desc') || '');
    const [uploadTags, setUploadTags] = useState(() => localStorage.getItem('newbi_doc_draft_upload_tags') || '');
    const [uploadIsPublic, setUploadIsPublic] = useState(() => {
        const stored = localStorage.getItem('newbi_doc_draft_upload_public');
        return stored === null ? true : stored === 'true';
    });
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Sync Google Doc/Sheet form to localStorage
    useEffect(() => {
        localStorage.setItem('newbi_doc_draft_google_url', googleUrl);
        localStorage.setItem('newbi_doc_draft_google_title', docTitle);
        localStorage.setItem('newbi_doc_draft_google_desc', docDescription);
        localStorage.setItem('newbi_doc_draft_google_tags', docTags);
        localStorage.setItem('newbi_doc_draft_google_public', String(docIsPublic));
    }, [googleUrl, docTitle, docDescription, docTags, docIsPublic]);

    // Sync Google Drive form to localStorage
    useEffect(() => {
        localStorage.setItem('newbi_doc_draft_drive_url', driveUrl);
        localStorage.setItem('newbi_doc_draft_drive_title', driveTitle);
        localStorage.setItem('newbi_doc_draft_drive_desc', driveDescription);
        localStorage.setItem('newbi_doc_draft_drive_tags', driveTags);
        localStorage.setItem('newbi_doc_draft_drive_public', String(driveIsPublic));
    }, [driveUrl, driveTitle, driveDescription, driveTags, driveIsPublic]);

    // Sync Upload form to localStorage
    useEffect(() => {
        localStorage.setItem('newbi_doc_draft_upload_title', uploadTitle);
        localStorage.setItem('newbi_doc_draft_upload_desc', uploadDescription);
        localStorage.setItem('newbi_doc_draft_upload_tags', uploadTags);
        localStorage.setItem('newbi_doc_draft_upload_public', String(uploadIsPublic));
    }, [uploadTitle, uploadDescription, uploadTags, uploadIsPublic]);

    const resetForm = () => {
        setGoogleUrl(''); setDetectedType(null); setDocTitle(''); setDocDescription(''); setDocTags(''); setDocIsPublic(true);
        setDriveUrl(''); setDriveTitle(''); setDriveDescription(''); setDriveTags(''); setDriveIsPublic(true);
        setSelectedFile(null); setUploadTitle(''); setUploadDescription(''); setUploadTags(''); setUploadIsPublic(true);
        setActiveTab('google_doc');
    };

    // ─── Google Doc/Sheet Handlers ──────────────────────────────────────────────

    const handleGoogleUrlChange = (url) => {
        setGoogleUrl(url);
        const type = detectGoogleDocType(url);
        setDetectedType(type);
    };

    const handleSaveGoogleDoc = async () => {
        if (!googleUrl || !detectedType || !docTitle.trim()) {
            addToast('Please fill in all required fields', 'error');
            return;
        }
        setSaving(true);
        try {
            const embedUrl = convertToEmbedUrl(googleUrl, detectedType);
            await addDocument({
                title: docTitle.trim(),
                description: docDescription.trim(),
                type: detectedType,
                sourceUrl: embedUrl,
                originalUrl: googleUrl,
                storagePath: '',
                fileSize: 0,
                fileName: '',
                mimeType: detectedType === 'google_doc' ? 'application/vnd.google-apps.document' : 'application/vnd.google-apps.spreadsheet',
                tags: docTags.split(',').map(t => t.trim()).filter(Boolean),
                isPublic: docIsPublic,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: user?.displayName || user?.email || 'admin',
            });
            addToast('Document added successfully', 'success');
            resetForm();
            setShowAddModal(false);
        } catch (err) {
            console.error('Failed to add document:', err);
            addToast('Failed to add document', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ─── Google Drive Handlers ──────────────────────────────────────────────────

    const handleSaveDrive = async () => {
        if (!driveUrl || !driveTitle.trim()) {
            addToast('Please fill in all required fields', 'error');
            return;
        }
        setSaving(true);
        try {
            const embedUrl = convertDriveToEmbed(driveUrl);
            await addDocument({
                title: driveTitle.trim(),
                description: driveDescription.trim(),
                type: 'google_drive',
                sourceUrl: embedUrl,
                originalUrl: driveUrl,
                storagePath: '',
                fileSize: 0,
                fileName: '',
                mimeType: 'application/vnd.google-apps.folder',
                tags: driveTags.split(',').map(t => t.trim()).filter(Boolean),
                isPublic: driveIsPublic,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: user?.displayName || user?.email || 'admin',
            });
            addToast('Drive link added successfully', 'success');
            resetForm();
            setShowAddModal(false);
        } catch (err) {
            console.error('Failed to add drive link:', err);
            addToast('Failed to add drive link', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ─── File Upload Handlers ───────────────────────────────────────────────────

    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
    }, [uploadTitle]);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleSaveUpload = async () => {
        if (!selectedFile || !uploadTitle.trim()) {
            addToast('Please select a file and enter a title', 'error');
            return;
        }
        setSaving(true);
        try {
            const uploadResult = await uploadDocumentFile(selectedFile);
            if (!uploadResult) {
                throw new Error("Upload failed. No response from server.");
            }
            const { url, storagePath } = uploadResult;
            const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name?.toLowerCase().endsWith('.pdf');
            
            await addDocument({
                title: uploadTitle.trim(),
                description: uploadDescription.trim(),
                type: isPdf ? 'pdf' : 'file',
                sourceUrl: url,
                originalUrl: url,
                storagePath: storagePath || '',
                fileSize: selectedFile.size,
                fileName: selectedFile.name,
                mimeType: selectedFile.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
                tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
                isPublic: uploadIsPublic,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: user?.displayName || user?.email || 'admin',
            });
            addToast('File uploaded successfully', 'success');
            resetForm();
            setShowAddModal(false);
        } catch (err) {
            console.error('Failed to upload file:', err);
            addToast(err.message || 'Failed to upload file', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ─── Actions ────────────────────────────────────────────────────────────────

    const handleCopyLink = (doc) => {
        const url = `${window.location.origin}/doc/${doc.id}`;
        navigator.clipboard.writeText(url);
        addToast('Link copied to clipboard', 'success');
    };

    const handleTogglePublic = async (doc) => {
        try {
            await updateDocument(doc.id, { isPublic: !doc.isPublic, updatedAt: new Date().toISOString() });
            addToast(doc.isPublic ? 'Document set to private' : 'Document set to public', 'success');
        } catch (err) {
            addToast('Failed to update visibility', 'error');
        }
    };

    const handleDelete = async (doc) => {
        if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
        try {
            await deleteDocument(doc.id);
            addToast('Document deleted', 'success');
        } catch (err) {
            addToast('Failed to delete document', 'error');
        }
    };

    // ─── Filtered Data ─────────────────────────────────────────────────────────

    const docs = (documents || []);
    const filteredDocs = docs
        .filter(d => filter === 'all' || d.type === filter)
        .filter(d => !search || d.title?.toLowerCase().includes(search.toLowerCase()));

    // ─── Render ─────────────────────────────────────────────────────────────────

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'DOCUMENT',
                subtitle: 'HUB',
                icon: FileText,
                accentClass: 'text-neon-blue'
            }}
            accentColor="neon-blue"
            tabs={vaultTabs}
            hideTabs={false}
            action={
                <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-neon-blue text-black font-black text-[10px] uppercase tracking-[0.2em] px-6 py-3 rounded-xl hover:bg-neon-blue/80"
                >
                    <Plus size={16} className="mr-2" /> ADD DOCUMENT
                </Button>
            }
        >
            {/* ── Filter Bar ─────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="SEARCH DOCUMENTS..."
                        className="pl-11 h-12 bg-black/40 border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {FILTER_PILLS.map(pill => (
                        <button
                            key={pill.key}
                            onClick={() => setFilter(pill.key)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all shrink-0",
                                filter === pill.key
                                    ? cn(pill.color, 'ring-1 ring-white/20')
                                    : 'bg-white/[0.03] text-gray-500 border-white/5 hover:bg-white/[0.06] hover:text-gray-300'
                            )}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Document Grid ──────────────────────────────────────────────── */}
            {filteredDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredDocs.map((doc) => (
                            <motion.div
                                key={doc.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                            >
                                <DocumentCard 
                                    doc={doc}
                                    onPreview={setPreviewDoc}
                                    onCopyLink={handleCopyLink}
                                    onTogglePublic={handleTogglePublic}
                                    onDelete={handleDelete}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                /* ── Empty State ──────────────────────────────────────────────── */
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-32 gap-6"
                >
                    <div className="w-24 h-24 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-center">
                        <FolderOpen size={40} className="text-gray-700" />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-black font-heading uppercase italic tracking-tight text-gray-400">
                            No documents yet
                        </h3>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">
                            Add your first document to get started
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowAddModal(true)}
                        className="bg-neon-blue/10 text-neon-blue border border-neon-blue/20 font-black text-[10px] uppercase tracking-[0.2em] px-6 py-3 rounded-xl hover:bg-neon-blue/20"
                    >
                        <Plus size={14} className="mr-2" /> ADD YOUR FIRST DOCUMENT
                    </Button>
                </motion.div>
            )}

            {/* ── Add Document Modal ─────────────────────────────────────────── */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    >
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { if (!saving) { setShowAddModal(false); resetForm(); } }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-xl px-8 pt-8 pb-4 border-b border-white/5">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-black font-heading uppercase italic tracking-tight text-white">
                                            ADD <span className="text-neon-blue">DOCUMENT.</span>
                                        </h2>
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mt-1">
                                            Select source type below
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { if (!saving) { setShowAddModal(false); resetForm(); } }}
                                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Tabs */}
                                <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/5 rounded-xl">
                                    {MODAL_TABS.map(tab => {
                                        const TabIcon = tab.icon;
                                        return (
                                            <button
                                                key={tab.key}
                                                onClick={() => setActiveTab(tab.key)}
                                                className={cn(
                                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                                                    activeTab === tab.key
                                                        ? "bg-white text-black"
                                                        : "text-gray-500 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <TabIcon size={12} />
                                                <span className="hidden sm:inline">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8 space-y-6">
                                <AnimatePresence mode="wait">
                                    {/* ── Tab 1: Google Document ─────────────────────────────── */}
                                    {activeTab === 'google_doc' && (
                                        <motion.div
                                            key="google_doc"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Google Docs / Sheets URL</label>
                                                <Input
                                                    value={googleUrl}
                                                    onChange={(e) => handleGoogleUrlChange(e.target.value)}
                                                    placeholder="https://docs.google.com/document/d/..."
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-sm focus:border-neon-blue/30"
                                                />
                                                {detectedType && (
                                                    <div className="space-y-3">
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <CheckCircle size={12} className="text-emerald-400" />
                                                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                                                                Detected: {detectedType === 'google_doc' ? 'Google Document' : 'Google Spreadsheet'}
                                                            </span>
                                                        </motion.div>
                                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                                                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <span>⚠️ GOOGLE ACCESS CONTROL TIP</span>
                                                            </p>
                                                            <p className="text-[9px] text-gray-400 uppercase tracking-wider leading-relaxed">
                                                                If your document is restricted, viewers will see a Google Sign-in screen.
                                                                <br />
                                                                To avoid this:
                                                                <br />
                                                                1. Set file share settings to <span className="text-white">"Anyone with the link can view"</span>, OR
                                                                <br />
                                                                2. Download the file as <span className="text-white">PDF/Excel</span> and upload it using the <span className="text-white">"UPLOAD FILE"</span> tab above.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {googleUrl && !detectedType && (
                                                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em]">
                                                        Paste a valid Google Docs or Sheets URL
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Title *</label>
                                                <Input
                                                    value={docTitle}
                                                    onChange={(e) => setDocTitle(e.target.value)}
                                                    placeholder="Document title"
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-sm focus:border-neon-blue/30"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Description</label>
                                                <textarea
                                                    value={docDescription}
                                                    onChange={(e) => setDocDescription(e.target.value)}
                                                    placeholder="Brief description..."
                                                    rows={3}
                                                    className="flex w-full rounded-xl border border-white/5 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-neon-blue/30 focus:outline-none focus:ring-1 focus:ring-neon-blue/30 resize-none"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Tags (comma separated)</label>
                                                <Input
                                                    value={docTags}
                                                    onChange={(e) => setDocTags(e.target.value)}
                                                    placeholder="e.g. contracts, legal, finance"
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-sm focus:border-neon-blue/30"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    {docIsPublic ? <Globe size={16} className="text-emerald-400" /> : <Lock size={16} className="text-amber-400" />}
                                                    <div>
                                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                                                            {docIsPublic ? 'PUBLIC' : 'PRIVATE'}
                                                        </span>
                                                        <p className="text-[8px] text-gray-600 uppercase tracking-wider mt-0.5">
                                                            {docIsPublic ? 'Visible to anyone with the link' : 'Only visible to admins'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setDocIsPublic(!docIsPublic)}
                                                    className={cn(
                                                        "w-12 h-6 rounded-full transition-all duration-300 relative",
                                                        docIsPublic ? "bg-emerald-500" : "bg-gray-700"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-lg",
                                                        docIsPublic ? "left-[26px]" : "left-0.5"
                                                    )} />
                                                </button>
                                            </div>

                                            <Button
                                                onClick={handleSaveGoogleDoc}
                                                disabled={saving || !detectedType || !docTitle.trim()}
                                                className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {saving ? <Loader size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                                                {saving ? 'SAVING...' : 'ADD DOCUMENT'}
                                            </Button>
                                        </motion.div>
                                    )}

                                    {/* ── Tab 2: Google Drive ────────────────────────────────── */}
                                    {activeTab === 'google_drive' && (
                                        <motion.div
                                            key="google_drive"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Google Drive URL</label>
                                                <Input
                                                    value={driveUrl}
                                                    onChange={(e) => setDriveUrl(e.target.value)}
                                                    placeholder="https://drive.google.com/file/d/... or .../folders/..."
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-sm focus:border-neon-blue/30"
                                                />
                                                {driveUrl && /drive\.google\.com/.test(driveUrl) && (
                                                    <div className="space-y-3">
                                                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
                                                            <CheckCircle size={12} className="text-neon-purple" />
                                                            <span className="text-[9px] font-black text-neon-purple uppercase tracking-[0.2em]">Google Drive link detected</span>
                                                        </motion.div>
                                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                                                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <span>⚠️ GOOGLE ACCESS CONTROL TIP</span>
                                                            </p>
                                                            <p className="text-[9px] text-gray-400 uppercase tracking-wider leading-relaxed">
                                                                If your Drive file/folder is restricted, viewers will see a Google Sign-in screen.
                                                                <br />
                                                                To avoid this:
                                                                <br />
                                                                1. Set file/folder share settings to <span className="text-white">"Anyone with the link can view"</span>, OR
                                                                <br />
                                                                2. Download the file locally and upload it using the <span className="text-white">"UPLOAD FILE"</span> tab above.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Title *</label>
                                                <Input
                                                    value={driveTitle}
                                                    onChange={(e) => setDriveTitle(e.target.value)}
                                                    placeholder="Drive file or folder title"
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-sm focus:border-neon-blue/30"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Description</label>
                                                <textarea
                                                    value={driveDescription}
                                                    onChange={(e) => setDriveDescription(e.target.value)}
                                                    placeholder="Brief description..."
                                                    rows={3}
                                                    className="flex w-full rounded-xl border border-white/5 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-neon-blue/30 focus:outline-none focus:ring-1 focus:ring-neon-blue/30 resize-none"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Tags (comma separated)</label>
                                                <Input
                                                    value={driveTags}
                                                    onChange={(e) => setDriveTags(e.target.value)}
                                                    placeholder="e.g. assets, media, shared"
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-sm focus:border-neon-blue/30"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    {driveIsPublic ? <Globe size={16} className="text-emerald-400" /> : <Lock size={16} className="text-amber-400" />}
                                                    <div>
                                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                                                            {driveIsPublic ? 'PUBLIC' : 'PRIVATE'}
                                                        </span>
                                                        <p className="text-[8px] text-gray-600 uppercase tracking-wider mt-0.5">
                                                            {driveIsPublic ? 'Visible to anyone with the link' : 'Only visible to admins'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setDriveIsPublic(!driveIsPublic)}
                                                    className={cn(
                                                        "w-12 h-6 rounded-full transition-all duration-300 relative",
                                                        driveIsPublic ? "bg-emerald-500" : "bg-gray-700"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-lg",
                                                        driveIsPublic ? "left-[26px]" : "left-0.5"
                                                    )} />
                                                </button>
                                            </div>

                                            <Button
                                                onClick={handleSaveDrive}
                                                disabled={saving || !driveUrl.trim() || !driveTitle.trim()}
                                                className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {saving ? <Loader size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                                                {saving ? 'SAVING...' : 'ADD DRIVE LINK'}
                                            </Button>
                                        </motion.div>
                                    )}

                                    {/* ── Tab 3: Upload File ─────────────────────────────────── */}
                                    {activeTab === 'upload' && (
                                        <motion.div
                                            key="upload"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="space-y-6"
                                        >
                                            {/* Drop Zone */}
                                            <div
                                                onDrop={handleFileDrop}
                                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                onDragLeave={() => setIsDragging(false)}
                                                onClick={() => fileInputRef.current?.click()}
                                                className={cn(
                                                    "relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300",
                                                    isDragging
                                                        ? "border-neon-blue/50 bg-neon-blue/5"
                                                        : "border-white/10 bg-black/30 hover:border-neon-blue/30 hover:bg-black/40"
                                                )}
                                            >
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    onChange={handleFileSelect}
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.png,.jpg,.jpeg,.gif,.mp4,.mp3"
                                                    className="hidden"
                                                />
                                                <motion.div
                                                    animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                >
                                                    <Upload size={32} className={cn(
                                                        "transition-colors",
                                                        isDragging ? "text-neon-blue" : "text-gray-600"
                                                    )} />
                                                </motion.div>
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                                    {isDragging ? 'DROP FILE HERE' : 'DRAG & DROP OR CLICK TO SELECT'}
                                                </span>
                                                <span className="text-[8px] text-gray-700 uppercase tracking-wider">
                                                    PDF, DOC, XLS, PPT, ZIP, IMAGES, VIDEOS
                                                </span>
                                            </div>

                                            {/* Selected File Info */}
                                            {selectedFile && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="flex items-center gap-3 p-4 bg-neon-blue/5 border border-neon-blue/20 rounded-xl"
                                                >
                                                    <File size={20} className="text-neon-blue shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                                                        <p className="text-[9px] text-gray-500">{formatFileSize(selectedFile.size)}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                                                    >
                                                        <X size={14} className="text-gray-500" />
                                                    </button>
                                                </motion.div>
                                            )}

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Title *</label>
                                                <Input
                                                    value={uploadTitle}
                                                    onChange={(e) => setUploadTitle(e.target.value)}
                                                    placeholder="Document title"
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-sm focus:border-neon-blue/30"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Description</label>
                                                <textarea
                                                    value={uploadDescription}
                                                    onChange={(e) => setUploadDescription(e.target.value)}
                                                    placeholder="Brief description..."
                                                    rows={3}
                                                    className="flex w-full rounded-xl border border-white/5 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-neon-blue/30 focus:outline-none focus:ring-1 focus:ring-neon-blue/30 resize-none"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Tags (comma separated)</label>
                                                <Input
                                                    value={uploadTags}
                                                    onChange={(e) => setUploadTags(e.target.value)}
                                                    placeholder="e.g. report, analysis, presentation"
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-sm focus:border-neon-blue/30"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    {uploadIsPublic ? <Globe size={16} className="text-emerald-400" /> : <Lock size={16} className="text-amber-400" />}
                                                    <div>
                                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                                                            {uploadIsPublic ? 'PUBLIC' : 'PRIVATE'}
                                                        </span>
                                                        <p className="text-[8px] text-gray-600 uppercase tracking-wider mt-0.5">
                                                            {uploadIsPublic ? 'Visible to anyone with the link' : 'Only visible to admins'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setUploadIsPublic(!uploadIsPublic)}
                                                    className={cn(
                                                        "w-12 h-6 rounded-full transition-all duration-300 relative",
                                                        uploadIsPublic ? "bg-emerald-500" : "bg-gray-700"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-lg",
                                                        uploadIsPublic ? "left-[26px]" : "left-0.5"
                                                    )} />
                                                </button>
                                            </div>

                                            <Button
                                                onClick={handleSaveUpload}
                                                disabled={saving || !selectedFile || !uploadTitle.trim()}
                                                className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {saving ? <Loader size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
                                                {saving ? 'UPLOADING...' : 'UPLOAD & SAVE'}
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Preview Modal ───────────────────────────────────────────────── */}
            <AnimatePresence>
                {previewDoc && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col"
                    >
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPreviewDoc(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        />

                        {/* Preview Header */}
                        <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
                            <div className="flex items-center gap-4 min-w-0">
                                {(() => {
                                    const cfg = TYPE_CONFIG[previewDoc.type] || TYPE_CONFIG.file;
                                    return (
                                        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-[0.2em] shrink-0", cfg.pill)}>
                                            <cfg.icon size={10} />
                                            {cfg.label}
                                        </div>
                                    );
                                })()}
                                <h3 className="text-sm md:text-base font-black font-heading uppercase italic tracking-tight text-white truncate">
                                    {previewDoc.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setPreviewDoc(null)}
                                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all shrink-0 ml-4"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Preview Body */}
                        <div className="relative z-10 flex-1 p-4 md:p-8">
                            {(previewDoc.type === 'google_doc' || previewDoc.type === 'google_sheet' || previewDoc.type === 'google_drive' || previewDoc.type === 'pdf') ? (
                                <iframe
                                    src={previewDoc.sourceUrl}
                                    className="w-full h-full rounded-2xl border border-white/10 bg-white"
                                    title={previewDoc.title}
                                    allow="autoplay"
                                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-6">
                                    <div className="w-24 h-24 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-center">
                                        <File size={40} className="text-gray-600" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-lg font-black font-heading uppercase italic text-white">{previewDoc.fileName || previewDoc.title}</h3>
                                        {previewDoc.fileSize > 0 && (
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                                {formatFileSize(previewDoc.fileSize)}
                                            </p>
                                        )}
                                    </div>
                                    <a
                                        href={previewDoc.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-8 py-4 bg-neon-blue text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-neon-blue/80 transition-all"
                                    >
                                        DOWNLOAD FILE
                                    </a>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AdminCommunityHubLayout>
    );
};

export default DocumentHub;
