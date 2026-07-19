import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Search from 'lucide-react/dist/esm/icons/search';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Download from 'lucide-react/dist/esm/icons/download';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import FileBadge from 'lucide-react/dist/esm/icons/file-badge';
import Loader from 'lucide-react/dist/esm/icons/loader';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const STATUS_COLORS = {
    Draft: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-500' },
    Final: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const DocumentPDFCard = ({ doc, onEdit, onDelete, onDownload, isDownloading }) => {
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        });
    };

    const status = STATUS_COLORS[doc.status] || STATUS_COLORS.Draft;

    return (
        <div className="relative group">
            {/* Ambient Glow */}
            <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full blur-[60px] opacity-10 group-hover:opacity-25 transition-opacity duration-700 pointer-events-none bg-[#39FF14]" />

            <div
                onMouseMove={handleMouseMove}
                className="p-6 bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:from-white/[0.07] hover:to-white/[0.02] backdrop-blur-xl border border-white/10 border-t-white/20 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_0_8px_32px_rgba(0,0,0,0.4)] hover:border-white/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.65)] transition-all duration-500 flex flex-col justify-between h-[250px] relative overflow-hidden hover:translate-y-[-4px]"
                style={{
                    background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(57,255,20,0.05) 0%, rgba(255,255,255,0.01) 60%)`
                }}
            >
                {/* Header: Badge + Status */}
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.2em] bg-neon-green/10 text-neon-green border-neon-green/20">
                        <FileBadge size={9} />
                        DOCUMENT
                    </div>
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-[0.2em]", status.bg, status.text, status.border)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                        {doc.status || 'Draft'}
                    </div>
                </div>

                {/* Title & Document Number */}
                <div className="my-auto relative z-10 space-y-1.5 pt-2">
                    <h3 className="text-xl font-black font-heading uppercase italic tracking-tight text-white group-hover:text-neon-green transition-colors duration-300 leading-tight line-clamp-2 drop-shadow-md">
                        {doc.documentTitle || 'Untitled Document'}
                    </h3>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] font-mono">
                        {doc.documentNumber || 'NBD-0000'}
                    </p>
                </div>

                {/* Footer: Date + Actions */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 mt-1 relative z-10 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {doc.createdAt && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] px-2 py-1 bg-white/[0.02] border border-white/5 rounded-lg shrink-0">
                                <Calendar size={8} className="text-gray-600" />
                                {formatDate(doc.createdAt)}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => onDownload(doc)}
                            disabled={isDownloading}
                            className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-400 hover:text-neon-green hover:border-neon-green/30 hover:bg-neon-green/10 hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(57,255,20,0.35)] transition-all duration-300 disabled:opacity-40"
                            title="Download PDF"
                        >
                            {isDownloading ? <Loader size={13} className="animate-spin" /> : <Download size={13} />}
                        </button>
                        <button
                            onClick={() => onEdit(doc)}
                            className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-400 hover:text-neon-blue hover:border-neon-blue/30 hover:bg-neon-blue/10 hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] transition-all duration-300"
                            title="Edit Document"
                        >
                            <Pencil size={13} />
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

const DocumentPDFManagement = () => {
    useStoreSubscription(['genDocuments']);
    const navigate = useNavigate();
    const { genDocuments, deleteGenDocument, addToast, user } = useStore();
    const [search, setSearch] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);

    const vaultTabs = [
        ...(['developer', 'founder'].includes(user?.role) ? [{ name: 'Invoices', path: '/admin/invoices', icon: FileText, color: 'text-neon-blue' }] : []),
        { name: 'Proposals', path: '/admin/proposals', icon: FileSpreadsheet, color: 'text-neon-green' },
        { name: 'Contracts', path: '/admin/agreements', icon: ShieldCheck, color: 'text-neon-purple' },
        { name: 'Gen. Documents', path: '/admin/gen-documents', icon: FileBadge, color: 'text-neon-green' },
        { name: 'Documents', path: '/admin/documents', icon: FolderOpen, color: 'text-neon-blue' },
    ];

    const filteredDocs = useMemo(() => {
        const docs = genDocuments || [];
        if (!search) return docs;
        const q = search.toLowerCase();
        return docs.filter(d =>
            d.documentTitle?.toLowerCase().includes(q) ||
            d.documentNumber?.toLowerCase().includes(q)
        );
    }, [genDocuments, search]);

    const handleEdit = (doc) => {
        navigate(`/admin/edit-gen-document/${doc.id}`);
    };

    const handleDelete = async (doc) => {
        if (!window.confirm(`Delete "${doc.documentTitle || 'this document'}"? This cannot be undone.`)) return;
        try {
            await deleteGenDocument(doc.id);
            addToast('Document deleted', 'success');
        } catch (err) {
            addToast('Failed to delete document', 'error');
        }
    };

    const handleDownload = async (doc) => {
        setDownloadingId(doc.id);
        try {
            // Navigate to the editor with a download trigger
            navigate(`/admin/edit-gen-document/${doc.id}?download=true`);
        } catch (err) {
            addToast('Failed to download PDF', 'error');
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'GENERATED',
                subtitle: 'DOCUMENTS',
                icon: FileBadge,
                accentClass: 'text-neon-green'
            }}
            accentColor="neon-green"
            tabs={vaultTabs}
            hideTabs={false}
            action={
                <Button
                    onClick={() => navigate('/admin/create-gen-document')}
                    className="bg-neon-green text-black font-black text-[10px] uppercase tracking-[0.2em] px-6 py-3 rounded-xl hover:bg-neon-green/80"
                >
                    <Plus size={16} className="mr-2" /> CREATE DOCUMENT
                </Button>
            }
        >
            {/* Search Bar */}
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
            </div>

            {/* Document Grid */}
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
                                <DocumentPDFCard
                                    doc={doc}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onDownload={handleDownload}
                                    isDownloading={downloadingId === doc.id}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                /* Empty State */
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-32 gap-6"
                >
                    <div className="w-24 h-24 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-center">
                        <FileBadge size={40} className="text-gray-700" />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-black font-heading uppercase italic tracking-tight text-gray-400">
                            No documents yet
                        </h3>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">
                            Create your first document PDF to get started
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate('/admin/create-gen-document')}
                        className="bg-neon-green/10 text-neon-green border border-neon-green/20 font-black text-[10px] uppercase tracking-[0.2em] px-6 py-3 rounded-xl hover:bg-neon-green/20"
                    >
                        <Plus size={14} className="mr-2" /> CREATE YOUR FIRST DOCUMENT
                    </Button>
                </motion.div>
            )}
        </AdminCommunityHubLayout>
    );
};

export default DocumentPDFManagement;
