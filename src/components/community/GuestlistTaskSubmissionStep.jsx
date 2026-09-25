import React, { useState, useRef } from 'react';
import { 
    FileUp, 
    Link as LinkIcon, 
    FileText, 
    Sparkles, 
    UploadCloud, 
    CheckCircle2, 
    X, 
    AlertCircle, 
    ChevronLeft, 
    ArrowRight,
    Music,
    Film,
    FileIcon,
    Loader2
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { cn } from '../../lib/utils';

export const GuestlistTaskSubmissionStep = ({
    taskConfig,
    onBack,
    onSubmit,
    loading = false,
    accentColor = '#2ebfff'
}) => {
    const uploadToCloudinary = useStore.getState().uploadToCloudinary;
    const addToast = useStore.getState().addToast;

    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [fileUrl, setFileUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [fileType, setFileType] = useState('');
    const [fileSize, setFileSize] = useState(0);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const [link, setLink] = useState('');
    const [text, setText] = useState('');
    const [error, setError] = useState(null);

    const config = {
        title: taskConfig?.title || 'Guestlist Application Task',
        description: taskConfig?.description || 'Please complete the requested task below to apply for the guestlist.',
        allowFileUpload: taskConfig?.allowFileUpload !== false,
        requireFileUpload: !!taskConfig?.requireFileUpload,
        fileTypeHint: taskConfig?.fileTypeHint || 'Images, Audio, PDF, or ZIP',
        allowLink: taskConfig?.allowLink !== false,
        requireLink: !!taskConfig?.requireLink,
        linkPlaceholder: taskConfig?.linkPlaceholder || 'https://instagram.com/..., Behance, Drive, SoundCloud',
        allowText: taskConfig?.allowText !== false,
        requireText: !!taskConfig?.requireText,
        textPrompt: taskConfig?.textPrompt || 'Provide details about your work or why you should be on the guestlist',
        reviewRequired: taskConfig?.reviewRequired !== false
    };

    const handleFileSelected = async (selectedFile) => {
        if (!selectedFile) return;

        // Size check (max 50MB)
        if (selectedFile.size > 50 * 1024 * 1024) {
            addToast('File exceeds 50MB limit. Please upload a smaller file or share a link.', 'error');
            return;
        }

        setFile(selectedFile);
        setFileName(selectedFile.name);
        setFileType(selectedFile.type);
        setFileSize(selectedFile.size);
        setError(null);
        setIsUploadingFile(true);

        try {
            const uploadedUrl = await uploadToCloudinary(selectedFile);
            if (!uploadedUrl) throw new Error("Upload did not return a valid file URL.");
            setFileUrl(uploadedUrl);
            addToast('Attachment uploaded successfully!', 'success');
        } catch (err) {
            console.error('File upload failed:', err);
            addToast('File upload failed. Please try again or paste a link.', 'error');
            setFile(null);
            setFileUrl('');
        } finally {
            setIsUploadingFile(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelected(e.dataTransfer.files[0]);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setFileUrl('');
        setFileName('');
        setFileType('');
        setFileSize(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setError(null);

        if (isUploadingFile) {
            return addToast('Please wait for your file upload to complete.', 'info');
        }

        // Validations
        if (config.allowFileUpload && config.requireFileUpload && !fileUrl) {
            setError('Please upload the required file to proceed.');
            return addToast('Please upload the required file.', 'error');
        }

        if (config.allowLink && config.requireLink && !link.trim()) {
            setError('Please enter the required link to proceed.');
            return addToast('Please provide the required link.', 'error');
        }

        if (config.allowText && config.requireText && !text.trim()) {
            setError('Please provide the requested statement/response.');
            return addToast('Please fill out the response text.', 'error');
        }

        // At least one submission item if none are strictly marked required
        const hasAnyContent = !!fileUrl || !!link.trim() || !!text.trim();
        if (!hasAnyContent) {
            setError('Please provide at least one submission item (file, link, or response).');
            return addToast('Please complete the task submission.', 'error');
        }

        onSubmit({
            fileUrl,
            fileName,
            fileType,
            fileSize,
            link: link.trim(),
            text: text.trim(),
            submittedAt: new Date().toISOString()
        });
    };

    const isImage = fileType?.startsWith('image/') || fileUrl?.match(/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i);
    const isAudio = fileType?.startsWith('audio/') || fileUrl?.match(/\.(mp3|wav|ogg|aac)($|\?)/i);
    const isVideo = fileType?.startsWith('video/') || fileUrl?.match(/\.(mp4|webm|mov)($|\?)/i);

    return (
        <form onSubmit={handleFormSubmit} className="space-y-6 sm:space-y-8 text-left">
            {/* Header & Prompt */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button 
                            type="button" 
                            onClick={onBack}
                            className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
                        >
                            <ChevronLeft size={18} />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <span 
                                className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border"
                                style={{
                                    backgroundColor: `${accentColor}15`,
                                    borderColor: `${accentColor}30`,
                                    color: accentColor
                                }}
                            >
                                REQUIRED TASK
                            </span>
                            {config.reviewRequired ? (
                                <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">
                                    • Curation Review
                                </span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider text-neon-green">
                                    • Auto Confirm
                                </span>
                            )}
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black font-heading text-gray-900 dark:text-white uppercase tracking-tight italic mt-1 leading-none">
                            {config.title}
                        </h3>
                    </div>
                </div>

                {config.description && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-medium leading-relaxed">
                        {config.description}
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Input Sections */}
            <div className="space-y-6">

                {/* 1. File Upload Field */}
                {config.allowFileUpload && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between pl-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <FileUp size={14} style={{ color: accentColor }} />
                                Upload File / Media {config.requireFileUpload && <span className="text-red-500">*</span>}
                            </label>
                            {config.fileTypeHint && (
                                <span className="text-[8px] font-mono text-gray-400">
                                    {config.fileTypeHint}
                                </span>
                            )}
                        </div>

                        <input 
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                        />

                        {fileUrl ? (
                            /* Uploaded File Preview */
                            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    {isImage ? (
                                        <img 
                                            src={fileUrl} 
                                            alt={fileName} 
                                            className="w-12 h-12 rounded-xl object-cover border border-black/10 dark:border-white/10 shrink-0" 
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0" style={{ color: accentColor }}>
                                            {isAudio ? <Music size={22} /> : isVideo ? <Film size={22} /> : <FileIcon size={22} />}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                                                {fileName}
                                            </p>
                                            <CheckCircle2 size={14} className="text-neon-green shrink-0" />
                                        </div>
                                        <p className="text-[9px] font-mono text-gray-500">
                                            {formatBytes(fileSize)} • Ready for submission
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleRemoveFile}
                                    className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shrink-0"
                                    title="Remove file"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            /* Dropzone / Upload Area */
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => !isUploadingFile && fileInputRef.current?.click()}
                                className={cn(
                                    "p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3",
                                    isDragging 
                                        ? "border-neon-blue bg-neon-blue/5 scale-[1.01]" 
                                        : "border-black/15 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/30 dark:hover:border-white/20"
                                )}
                            >
                                {isUploadingFile ? (
                                    <div className="flex flex-col items-center gap-3 py-2">
                                        <LoadingSpinner size="md" color={accentColor} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white animate-pulse">
                                            Uploading media to cloud...
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div 
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                                            style={{
                                                backgroundColor: `${accentColor}15`,
                                                color: accentColor
                                            }}
                                        >
                                            <UploadCloud size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                                                Click to upload or drag & drop
                                            </p>
                                            <p className="text-[9px] font-medium text-gray-500 mt-1">
                                                {config.fileTypeHint || 'PNG, JPG, PDF, MP3 up to 50MB'}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Link Input Field */}
                {config.allowLink && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                            <LinkIcon size={14} style={{ color: accentColor }} />
                            Web Link / Portfolio {config.requireLink && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                            <input
                                type="url"
                                value={link}
                                onChange={e => { setLink(e.target.value); setError(null); }}
                                placeholder={config.linkPlaceholder}
                                className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-6 text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none transition-all focus:border-neon-blue"
                            />
                        </div>
                    </div>
                )}

                {/* 3. Written Response Field */}
                {config.allowText && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                            <FileText size={14} style={{ color: accentColor }} />
                            {config.textPrompt || 'Statement / Response'} {config.requireText && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            value={text}
                            onChange={e => { setText(e.target.value); setError(null); }}
                            rows={3}
                            placeholder="Share your answer, statement, or context..."
                            className="w-full bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none transition-all focus:border-neon-blue resize-none leading-relaxed"
                        />
                    </div>
                )}

            </div>

            {/* Submit Action */}
            <div className="pt-4">
                <Button
                    type="submit"
                    disabled={loading || isUploadingFile}
                    className="w-full h-16 sm:h-20 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-black uppercase italic tracking-[0.25em] text-[11px] sm:text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 group"
                    style={{
                        boxShadow: `0 10px 30px ${accentColor}30`
                    }}
                >
                    {loading ? (
                        <LoadingSpinner size="sm" color="currentColor" />
                    ) : (
                        <>
                            SUBMIT TASK & APPLY <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
                        </>
                    )}
                </Button>
                {config.reviewRequired && (
                    <p className="text-[9px] text-center font-bold text-gray-400 uppercase tracking-widest mt-3">
                        Submissions will be reviewed by the curation team prior to pass issuance
                    </p>
                )}
            </div>
        </form>
    );
};

export default GuestlistTaskSubmissionStep;
